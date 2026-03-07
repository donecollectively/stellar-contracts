/**
 * Test logger utilities for vitest
 *
 * Spawns a separate process per test to bypass vitest's console capture.
 * Each test gets its own destination piped to a child process.
 */

import pino from "pino";
import { spawn, ChildProcess } from "child_process";
import { mkdirSync } from "fs";
import type { StellarLogger } from "./stellog";
import type { Writable } from "stream";

export interface TestLoggerOptions {
    /**
     * Output mode:
     * - 'pretty': pipes to pino-pretty child process (may not work in all vitest configs)
     * - 'stderr': writes JSON directly to stderr (always visible, but not pretty)
     * - 'file': writes to test-logs/
     * - 'both': file + stderr
     */
    mode?: "pretty" | "stderr" | "file" | "both";
    /** Directory for log files (default: ./test-logs) */
    logDir?: string;
    /** Additional args for the pretty-printer process */
    prettyArgs?: string[];
}

interface TestLoggerContext {
    logger: StellarLogger;
    process: ChildProcess | null;
    stream: Writable | null;
    testName: string;
}

let current: TestLoggerContext | null = null;

/**
 * Create a pino destination from a writable stream.
 * pino.destination() only accepts fds/files, so we wrap the stream.
 */
function streamDestination(stream: Writable): pino.DestinationStream {
    return {
        write(data: string): boolean {
            return stream.write(data);
        },
    } as pino.DestinationStream;
}

/**
 * Create a destination that writes to stderr directly.
 * This bypasses vitest's stdout capture.
 */
function stderrDestination(): pino.DestinationStream {
    return {
        write(data: string): boolean {
            process.stderr.write(data);
            return true;
        },
    } as pino.DestinationStream;
}

/**
 * Set up a test logger that bypasses vitest's console capture.
 *
 * Call in beforeEach:
 * ```typescript
 * beforeEach((ctx) => {
 *     setupTestLogger(ctx.task.name);
 * });
 * ```
 */
export function setupTestLogger(
    testName: string,
    options: TestLoggerOptions = {}
): StellarLogger {
    const { mode = "pretty", logDir = "./test-logs", prettyArgs = [] } = options;

    let childProc: ChildProcess | null = null;
    let stream: Writable | null = null;
    let dest: pino.DestinationStream;

    if (mode === "pretty") {
        // Spawn pino-pretty as child process
        // Route stdout to stderr (fd 2) to bypass vitest's stdout capture
        childProc = spawn("pnpm", ["exec", "pino-pretty", ...prettyArgs], {
            stdio: ["pipe", 2, 2],  // stdin=pipe, stdout=stderr, stderr=stderr
            shell: true,
        });

        if (!childProc.stdin) {
            throw new Error("Failed to spawn pino-pretty process");
        }

        stream = childProc.stdin;
        dest = streamDestination(stream);

        childProc.on("error", (err) => {
            process.stderr.write(`[testLogger] Process error: ${err.message}\n`);
        });

        // Debug: confirm process spawned
        if (process.env.DEBUG_TEST_LOGGER) {
            process.stderr.write(`[testLogger] Spawned pino-pretty for "${testName}"\n`);
        }
    } else if (mode === "stderr" || mode === "both") {
        // Write JSON directly to stderr - always visible
        dest = stderrDestination();

        // Also write to file in 'both' mode
        if (mode === "both") {
            mkdirSync(logDir, { recursive: true });
            const safeName = testName.replace(/[^a-zA-Z0-9-_]/g, "_");
            const filePath = `${logDir}/${safeName}.ndjson`;
            const fileDest = pino.destination(filePath);

            // Multistream to both
            dest = {
                write(data: string): boolean {
                    process.stderr.write(data);
                    fileDest.write(data);
                    return true;
                },
            } as pino.DestinationStream;
        }
    } else {
        // File-only mode
        mkdirSync(logDir, { recursive: true });
        const safeName = testName.replace(/[^a-zA-Z0-9-_]/g, "_");
        const filePath = `${logDir}/${safeName}.ndjson`;
        dest = pino.destination(filePath);
    }

    const customLogger = pino(
        {
            name: testName,
            level: "trace",
            customLevels: {
                ops: 28,
                userError: 32,
                progress: 25,
            },
        },
        dest
    ) as StellarLogger;

    current = {
        logger: customLogger,
        process: childProc,
        stream,
        testName,
    };

    return customLogger;
}

/**
 * Get the current test logger.
 * Throws if called outside of a test context.
 */
export function getTestLogger(): StellarLogger {
    if (!current) {
        throw new Error(
            "No test logger available. Did you call setupTestLogger in beforeEach?"
        );
    }
    return current.logger;
}

/**
 * Tear down the test logger.
 *
 * Call in afterEach:
 * ```typescript
 * afterEach(() => {
 *     teardownTestLogger();
 * });
 * ```
 */
export function teardownTestLogger(): void {
    if (!current) return;

    const ctx = current;
    current = null;

    // End the stream to the child process
    if (ctx.stream) {
        ctx.stream.end();
    }

    // Kill child process if any
    if (ctx.process) {
        // Give it a moment to flush, then kill
        setTimeout(() => {
            ctx.process?.kill("SIGTERM");
        }, 100);
    }
}

/**
 * Vitest helper that sets up test logging automatically.
 *
 * Usage:
 * ```typescript
 * import { withTestLogger } from '@donecollectively/stellar-contracts/logger';
 * import { beforeEach, afterEach } from 'vitest';
 *
 * withTestLogger(beforeEach, afterEach);
 *
 * it('my test', () => {
 *     const log = getTestLogger();
 *     log.info('This bypasses vitest capture!');
 * });
 * ```
 */
export function withTestLogger(
    beforeEachFn: (fn: (ctx: { task: { name: string } }) => void) => void,
    afterEachFn: (fn: () => void) => void,
    options?: TestLoggerOptions
): void {
    beforeEachFn((ctx) => {
        setupTestLogger(ctx.task.name, options);
    });

    afterEachFn(() => {
        teardownTestLogger();
    });
}
