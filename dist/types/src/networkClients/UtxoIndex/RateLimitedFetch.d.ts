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
    metrics: [RateLimiterMetrics];
}
declare class RateLimitedFetch {
    private availableBurst;
    private lastUpdateTime;
    private readonly maxBurst;
    private readonly baseRefillRate;
    private currentRefillRate;
    private readonly name;
    private readonly logOnRateLimited;
    private onHold;
    private resolveHold;
    private recoveryInterval;
    private requestTimestamps;
    private metricsInterval;
    private lastEmittedMetrics;
    readonly events: EventEmitter<RateLimiterEvents>;
    /**
     * @param options.name - Name for logging (default: "RateLimitedFetch")
     * @param options.maxBurst - Maximum burst capacity (default: 300)
     * @param options.refillRate - Tokens refilled per second (default: 7)
     * @param options.logOnRateLimited - Log when rate limiting kicks in (default: true)
     */
    constructor(options?: {
        name?: string;
        maxBurst?: number;
        refillRate?: number;
        logOnRateLimited?: boolean;
    });
    /**
     * Starts the interval that emits metrics once per second if changed.
     */
    private startMetricsInterval;
    /**
     * Emits metrics event if they have changed since last emission.
     */
    private emitMetricsIfChanged;
    /**
     * Compares two metrics objects for equality.
     */
    private metricsEqual;
    /**
     * Gets current metrics snapshot.
     */
    getMetrics(): RateLimiterMetrics;
    /**
     * Records a request timestamp for metrics tracking.
     */
    private recordRequest;
    /**
     * Removes request timestamps older than 1 second.
     */
    private pruneOldRequestTimestamps;
    /**
     * Waits if necessary to stay within rate limits, then executes the fetch.
     * Handles HTTP 429 by backing off and retrying.
     */
    fetch(url: string, options?: RequestInit): Promise<Response>;
    /**
     * Handles external rate limiting (HTTP 429).
     * Exhausts bucket, waits 10s, then reduces refill rate and starts recovery.
     */
    private handleExternalRateLimit;
    /**
     * Starts the recovery process to gradually restore refill rate.
     * Increases by 1 qps every 10 seconds until back to base rate.
     */
    private startRecovery;
    /**
     * Acquires a token, waiting if the bucket is empty.
     */
    private acquireToken;
    /**
     * Refills tokens based on time elapsed since last update.
     */
    private refillTokens;
    /**
     * Sleep for the specified number of milliseconds.
     */
    private sleep;
    /**
     * Returns the current number of available burst tokens.
     * Useful for debugging/monitoring.
     */
    get currentBurstAvailable(): number;
    /**
     * Returns the current refill rate (may be reduced during recovery).
     */
    get refillRate(): number;
    /**
     * Stops the metrics interval. Call when shutting down.
     */
    destroy(): void;
}
/**
 * Global rate limiter for Blockfrost API calls.
 * Shared across all CachedUtxoIndex instances.
 */
export declare let blockfrostRateLimiter: RateLimitedFetch | null;
export declare function getBlockfrostRateLimiter(): RateLimitedFetch;
export {};
//# sourceMappingURL=RateLimitedFetch.d.ts.map