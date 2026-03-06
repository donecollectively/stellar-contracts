/**
 * Log severity level.
 *
 * - `info`  — top-level lifecycle events (sync started, tx registered, rollback complete)
 * - `debug` — sub-step details (individual UTXOs processed, datum parsed, etc.)
 * - `warn`  — recoverable issues (fetch retry, shallow deadline skipped)
 * - `error` — failures (fetch failed, rollback error)
 */
export type LogLevel = "info" | "debug" | "warn" | "error";

/**
 * Storage-agnostic log entry representation.
 *
 * REQT/cj6nm0mpm1 (Log Entity)
 */
export interface LogEntry {
    logId: string;
    pid: number;
    time: number;
    location: string;
    message: string;
    /** Severity level. Defaults to "debug" for backward compatibility. */
    level: LogLevel;
    /** Parent log entry's logId, for call-tree grouping. */
    parentLogId?: string;
}
