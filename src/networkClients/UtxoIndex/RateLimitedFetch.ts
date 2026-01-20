/**
 * Rate-limited fetch utility for Blockfrost API calls.
 *
 * Implements a token bucket algorithm that allows bursts up to maxBurst
 * requests, then refills at refillRate tokens per second.
 *
 * Also handles HTTP 429 responses by backing off and reducing refill rate.
 */

import EventEmitter from "eventemitter3";

export interface RateLimiterMetrics {
    /** Requests completed in the last second */
    requestsPerSecond: number;
    /** Current refill rate (may be reduced during recovery) */
    currentRefillRate: number;
    /** Base refill rate */
    baseRefillRate: number;
    /** Available burst tokens */
    availableBurst: number;
    /** Whether currently rate limited (burst exhausted) */
    isRateLimited: boolean;
    /** Whether currently on hold due to HTTP 429 */
    isOnHold: boolean;
    /** Whether in recovery mode (refill rate reduced) */
    isRecovering: boolean;
}

export interface RateLimiterEvents {
    // ee3 wants the type of listener-args: in this case, a tuple of one item with these props
    metrics: [RateLimiterMetrics];
}

class RateLimitedFetch {
    private availableBurst: number;
    private lastUpdateTime: number;
    private readonly maxBurst: number;
    private readonly baseRefillRate: number;
    private currentRefillRate: number;
    private readonly name: string;
    private readonly logOnRateLimited: boolean;

    // Hold state for external rate limiting (HTTP 429)
    private onHold: Promise<void> | null = null;
    private resolveHold: (() => void) | null = null;
    private recoveryInterval: ReturnType<typeof setInterval> | null = null;

    // Metrics tracking
    private requestTimestamps: number[] = [];
    private metricsInterval: ReturnType<typeof setInterval> | null = null;
    private lastEmittedMetrics: RateLimiterMetrics | null = null;
    public readonly events: EventEmitter<RateLimiterEvents>;

    /**
     * @param options.name - Name for logging (default: "RateLimitedFetch")
     * @param options.maxBurst - Maximum burst capacity (default: 300)
     * @param options.refillRate - Tokens refilled per second (default: 7)
     * @param options.logOnRateLimited - Log when rate limiting kicks in (default: true)
     */
    constructor(
        options: {
            name?: string;
            maxBurst?: number;
            refillRate?: number;
            logOnRateLimited?: boolean;
        } = {},
    ) {
        this.name = options.name ?? "RateLimitedFetch";
        this.maxBurst = options.maxBurst ?? 300;
        this.baseRefillRate = options.refillRate ?? 7;
        this.currentRefillRate = this.baseRefillRate;
        this.logOnRateLimited = options.logOnRateLimited ?? true;
        this.availableBurst = this.maxBurst;
        this.lastUpdateTime = Date.now();
        this.events = new EventEmitter<RateLimiterEvents>();

        // Start metrics emission interval
        this.startMetricsInterval();
    }

    /**
     * Starts the interval that emits metrics once per second if changed.
     */
    private startMetricsInterval(): void {
        this.metricsInterval = setInterval(() => {
            this.emitMetricsIfChanged();
        }, 1000);

        this.metricsInterval.unref?.();
    }

    /**
     * Emits metrics event if they have changed since last emission.
     */
    private emitMetricsIfChanged(): void {
        const metrics = this.getMetrics();

        if (
            !this.lastEmittedMetrics ||
            !this.metricsEqual(metrics, this.lastEmittedMetrics)
        ) {
            this.lastEmittedMetrics = metrics;
            this.events.emit("metrics", metrics);
        }
    }

    /**
     * Compares two metrics objects for equality.
     */
    private metricsEqual(
        a: RateLimiterMetrics,
        b: RateLimiterMetrics,
    ): boolean {
        return (
            a.requestsPerSecond === b.requestsPerSecond &&
            a.currentRefillRate === b.currentRefillRate &&
            a.baseRefillRate === b.baseRefillRate &&
            a.availableBurst === b.availableBurst &&
            a.isRateLimited === b.isRateLimited &&
            a.isOnHold === b.isOnHold &&
            a.isRecovering === b.isRecovering
        );
    }

    /**
     * Gets current metrics snapshot.
     */
    getMetrics(): RateLimiterMetrics {
        this.refillTokens();
        this.pruneOldRequestTimestamps();

        return {
            requestsPerSecond: this.requestTimestamps.length,
            currentRefillRate: this.currentRefillRate,
            baseRefillRate: this.baseRefillRate,
            availableBurst: Math.floor(this.availableBurst),
            isRateLimited: this.availableBurst < 1,
            isOnHold: this.onHold !== null,
            isRecovering: this.recoveryInterval !== null,
        };
    }

    /**
     * Records a request timestamp for metrics tracking.
     */
    private recordRequest(): void {
        this.requestTimestamps.push(Date.now());
    }

    /**
     * Removes request timestamps older than 1 second.
     */
    private pruneOldRequestTimestamps(): void {
        const cutoff = Date.now() - 1000;
        while (
            this.requestTimestamps.length > 0 &&
            this.requestTimestamps[0] < cutoff
        ) {
            this.requestTimestamps.shift();
        }
    }

    /**
     * Waits if necessary to stay within rate limits, then executes the fetch.
     * Handles HTTP 429 by backing off and retrying.
     */
    async fetch(url: string, options?: RequestInit): Promise<Response> {
        // Wait if we're on hold due to external rate limiting
        if (this.onHold) {
            await this.onHold;
        }

        await this.acquireToken();
        this.recordRequest();
        const response = await fetch(url, options);

        // Handle HTTP 429 Too Many Requests
        if (response.status === 429) {
            await this.handleExternalRateLimit();
            // Retry the request
            return this.fetch(url, options);
        }

        return response;
    }

    /**
     * Handles external rate limiting (HTTP 429).
     * Exhausts bucket, waits 10s, then reduces refill rate and starts recovery.
     */
    private async handleExternalRateLimit(): Promise<void> {
        if (this.logOnRateLimited) {
            console.log(
                `[${this.name}] HTTP 429 - External rate limit hit, backing off 10s`,
            );
        }

        // Exhaust the bucket
        this.availableBurst = 0;

        // Create hold promise if not already holding
        if (!this.onHold) {
            this.onHold = new Promise<void>((resolve) => {
                this.resolveHold = resolve;
            });
        }

        // Wait 10 seconds
        await this.sleep(10000);

        // Reduce refill rate by golden ratio (compounds on repeated 429s)
        // Minimum of 0.5 req/s to prevent complete stall
        const PHI = 1.61;
        const MIN_REFILL_RATE = 0.5;
        this.currentRefillRate = Math.max(
            MIN_REFILL_RATE,
            this.currentRefillRate / PHI,
        );

        if (this.logOnRateLimited) {
            console.log(
                `[${this.name}] Resuming with reduced refill rate: ${this.currentRefillRate.toFixed(2)}/s`,
            );
        }

        // Release the hold
        if (this.resolveHold) {
            this.resolveHold();
            this.onHold = null;
            this.resolveHold = null;
        }

        // Start recovery interval to ramp back up
        this.startRecovery();
    }

    /**
     * Starts the recovery process to gradually restore refill rate.
     * Increases by 1 qps every 10 seconds until back to base rate.
     */
    private startRecovery(): void {
        // Clear any existing recovery interval
        if (this.recoveryInterval) {
            clearInterval(this.recoveryInterval);
        }

        this.recoveryInterval = setInterval(() => {
            if (this.currentRefillRate < this.baseRefillRate) {
                this.currentRefillRate = Math.min(
                    this.baseRefillRate,
                    this.currentRefillRate + 1,
                );

                if (this.logOnRateLimited) {
                    console.log(
                        `[${this.name}] Recovery: refill rate now ${this.currentRefillRate}/s`,
                    );
                }
            }

            // Stop recovery when we're back to normal
            if (this.currentRefillRate >= this.baseRefillRate) {
                if (this.recoveryInterval) {
                    clearInterval(this.recoveryInterval);
                    this.recoveryInterval = null;
                }
                if (this.logOnRateLimited) {
                    console.log(
                        `[${this.name}] Recovery complete, refill rate restored to ${this.baseRefillRate}/s`,
                    );
                }
            }
        }, 10000);

        this.recoveryInterval.unref?.();
    }

    /**
     * Acquires a token, waiting if the bucket is empty.
     */
    private async acquireToken(): Promise<void> {
        this.refillTokens();

        // If bucket is empty, wait 1 second and refill
        if (this.availableBurst < 1) {
            if (this.logOnRateLimited) {
                console.log(
                    `[${this.name}] Rate limited - waiting 1s (burst exhausted)`,
                );
            }
            while (this.availableBurst < 1) {
                await this.sleep(1000);
                this.refillTokens();
            }
        }

        // Consume one token
        this.availableBurst -= 1;
    }

    /**
     * Refills tokens based on time elapsed since last update.
     */
    private refillTokens(): void {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastUpdateTime) / 1000;
        const tokensToAdd = elapsedSeconds * this.currentRefillRate;

        this.availableBurst = Math.min(
            this.maxBurst,
            this.availableBurst + tokensToAdd,
        );
        this.lastUpdateTime = now;
    }

    /**
     * Sleep for the specified number of milliseconds.
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Returns the current number of available burst tokens.
     * Useful for debugging/monitoring.
     */
    get currentBurstAvailable(): number {
        this.refillTokens();
        return Math.floor(this.availableBurst);
    }

    /**
     * Returns the current refill rate (may be reduced during recovery).
     */
    get refillRate(): number {
        return this.currentRefillRate;
    }

    /**
     * Stops the metrics interval. Call when shutting down.
     */
    destroy(): void {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }
        if (this.recoveryInterval) {
            clearInterval(this.recoveryInterval);
            this.recoveryInterval = null;
        }
        this.events.removeAllListeners();
    }
}

/**
 * Global rate limiter for Blockfrost API calls.
 * Shared across all CachedUtxoIndex instances.
 */
export let blockfrostRateLimiter : RateLimitedFetch | null = null;

export function getBlockfrostRateLimiter(): RateLimitedFetch {
    if (blockfrostRateLimiter) {
        return blockfrostRateLimiter;
    }
    blockfrostRateLimiter = new RateLimitedFetch({
        name: "Blockfrost",
    });
    return blockfrostRateLimiter;
}