/**
 * stellog - Structured JSON logging for stellar-contracts
 *
 * Wraps Pino with custom log levels, facility-based configuration via
 * LOGGING env/localStorage, and platform-appropriate output formatting.
 *
 * @module
 */

import pino from "pino";
import type { Logger, LoggerOptions as PinoLoggerOptions } from "pino";

// =============================================================================
// Environment Detection
// =============================================================================

const NODE_ENV = process.env.NODE_ENV || "development";
const isDev = NODE_ENV === "development";
const isTest = NODE_ENV === "test";
const isBrowser = typeof window !== "undefined";

// =============================================================================
// Custom Log Levels (REQT/b93t3qkg5t)
// =============================================================================

/**
 * Custom level values shift by environment:
 * - ops: 45 (prod) or 28 (dev/test) - operational metrics
 * - userError: 32 (prod/test) or 42 (dev) - API client mistakes
 * - progress: 25 (fixed) - execution flow visibility
 *
 * Key insight: When you set a log level (e.g., warn=40), you see everything
 * with a value >= that level.
 */
const OPS_LEVEL = isDev || isTest ? 28 : 45;
const USER_ERROR_LEVEL = isDev ? 42 : 32;
const PROGRESS_LEVEL = 25;

const customLevels = {
    ops: OPS_LEVEL,
    userError: USER_ERROR_LEVEL,
    progress: PROGRESS_LEVEL,
} as const;

type CustomLevelName = keyof typeof customLevels;

// Standard Pino levels for reference
const standardLevels = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
} as const;

type StandardLevelName = keyof typeof standardLevels;
type LevelName = StandardLevelName | CustomLevelName;

const allLevels: Record<string, number> = { ...standardLevels, ...customLevels };

// =============================================================================
// LOGGING Configuration Parsing (REQT/gw20nphceh)
// =============================================================================

interface ParsedConfig {
    facilities: Map<string, string>;
    defaultLevel: string;
}

let cachedConfig: ParsedConfig | null = null;

function getLoggingConfig(): string {
    if (isBrowser) {
        try {
            return localStorage.getItem("LOGGING") || "";
        } catch {
            return "";
        }
    }
    return process.env.LOGGING || "";
}

function isValidLevel(token: string): boolean {
    return token in allLevels;
}

/**
 * Parse LOGGING configuration string.
 *
 * Format: `facility:level,facility:level,...`
 *
 * - Colons are allowed in facility names
 * - Last colon-separated token is interpreted as level if it's a valid level name
 * - Otherwise the whole thing is a facility name and level defaults to info
 * - `default` key sets the fallback level
 *
 * @throws Error if any level is more restrictive than warn (REQT/xn5wtc42pe)
 */
function parseLoggingConfig(configString: string): ParsedConfig {
    const facilities = new Map<string, string>();
    let defaultLevel = "warn"; // fallback if no default specified

    if (!configString.trim()) {
        return { facilities, defaultLevel };
    }

    const entries = configString.split(",").map((s) => s.trim()).filter(Boolean);

    for (const entry of entries) {
        const parts = entry.split(":");
        let facilityName: string;
        let level: string;

        if (parts.length === 1) {
            // Just a token - if valid level, it's the default; otherwise facility with info
            if (isValidLevel(parts[0])) {
                level = parts[0];
                facilityName = "default";
            } else {
                facilityName = parts[0];
                level = "info";
            }
        } else {
            // Last token might be level
            const lastToken = parts[parts.length - 1];
            if (isValidLevel(lastToken)) {
                level = lastToken;
                facilityName = parts.slice(0, -1).join(":");
            } else {
                // Whole thing is facility name, default to info
                facilityName = entry;
                level = "info";
            }
        }

        // Validate level is not more restrictive than warn (REQT/xn5wtc42pe)
        const levelValue = allLevels[level];
        if (levelValue > allLevels.warn) {
            throw new Error(
                `stellog: Cannot suppress below warn level. ` +
                `Facility "${facilityName}" configured with level "${level}" (${levelValue}) ` +
                `which is more restrictive than warn (${allLevels.warn}).`
            );
        }

        if (facilityName === "default") {
            defaultLevel = level;
        } else {
            facilities.set(facilityName, level);
        }
    }

    return { facilities, defaultLevel };
}

function getConfig(): ParsedConfig {
    if (!cachedConfig) {
        const configString = getLoggingConfig();
        cachedConfig = parseLoggingConfig(configString);
    }
    return cachedConfig;
}

/**
 * Look up the log level for a facility name.
 * Falls back to default level, then to warn.
 */
function lookupLevel(name: string): string {
    const config = getConfig();
    return config.facilities.get(name) ?? config.defaultLevel;
}

// =============================================================================
// Browser Output Configuration (REQT/swyee13sxe)
// =============================================================================

type WriteFunction = (o: { msg?: string; [key: string]: unknown }) => void;

const browserWriteFunctions: Record<string, WriteFunction> = {
    fatal: (o) => console.error("%c FATAL ", "background:red;color:white", o.msg, o),
    error: (o) => console.error("%c ERROR ", "background:red;color:white", o.msg, o),
    warn: (o) => console.warn("%c WARN ", "background:yellow;color:black", o.msg, o),
    info: (o) => console.info("%c INFO ", "background:blue;color:white", o.msg, o),
    debug: (o) => console.debug("%c DEBUG ", "background:gray;color:white", o.msg, o),
    trace: (o) => console.trace("%c TRACE ", "background:gray;color:white", o.msg, o),
    // Custom levels
    ops: (o) => console.info("%c OPS ", "background:purple;color:white", o.msg, o),
    userError: (o) => console.warn("%c USER_ERR ", "background:orange;color:black", o.msg, o),
    progress: (o) => console.info("%c PROGRESS ", "background:cyan;color:black", o.msg, o),
};

const browserConfig = {
    browser: {
        asObject: true,
        write: browserWriteFunctions,
    },
};

// =============================================================================
// StellarLogger Type (REQT/8xw3djzw2q)
// =============================================================================

/**
 * Child logger creation with facility-based level routing.
 */
export interface StellarChildFn {
    /** Create child with name-based level lookup */
    (name: string, props?: object): StellarLogger;
    /** Create child with name in props for level lookup */
    (props: { name: string } & object): StellarLogger;
    /** Create child inheriting parent level */
    (props: object): StellarLogger;
}

/**
 * Extended Pino logger with custom level methods and decorated child().
 */
export type StellarLogger = Omit<Logger, "child"> & {
    /** Log operational metrics (level varies by environment) */
    ops: pino.LogFn;
    /** Log user/API client errors (level varies by environment) */
    userError: pino.LogFn;
    /** Log execution progress (level 25) */
    progress: pino.LogFn;
    /**
     * Create a child logger.
     *
     * If a name is provided (as string or in props), the child's level
     * is looked up from LOGGING configuration.
     */
    child: StellarChildFn;
};

// =============================================================================
// Logger Decoration (REQT/6svp7fx0az)
// =============================================================================

/**
 * Decorate a Pino logger with facility-based child() routing.
 */
function decorateLogger(logger: Logger, name: string): StellarLogger {
    const decorated = logger as unknown as StellarLogger;
    const originalChild = logger.child.bind(logger);

    (decorated as { child: StellarChildFn }).child = function (
        nameOrProps: string | object,
        props?: object
    ): StellarLogger {
        if (typeof nameOrProps === "string") {
            // child('name') or child('name', {props})
            const childName = nameOrProps;
            const level = lookupLevel(childName);
            const bindings = { name: childName, ...props };
            const child = originalChild(bindings);
            child.level = level;
            return decorateLogger(child, childName);
        } else {
            // child({props}) - check for name property
            const bindings = nameOrProps as Record<string, unknown>;
            if (bindings.name && typeof bindings.name === "string") {
                const childName = bindings.name;
                const level = lookupLevel(childName);
                const child = originalChild(bindings);
                child.level = level;
                return decorateLogger(child, childName);
            } else {
                // No name - inherit parent level
                const child = originalChild(bindings);
                return decorateLogger(child, name);
            }
        }
    };

    return decorated;
}

// =============================================================================
// Factory Function (REQT/7jg247f7k4)
// =============================================================================

/**
 * Re-export Pino's LoggerOptions for consumers (REQT/jtag50wfxe)
 */
export type { PinoLoggerOptions as PinoOptions };

/**
 * Create a structured JSON logger with custom levels and facility-based configuration.
 *
 * @param name - Logger name (used for LOGGING config lookup)
 * @param options - Pino options (pass-through)
 * @returns StellarLogger with custom levels and decorated child()
 *
 * @example
 * ```typescript
 * const log = stellog('myModule');
 * log.info('Starting up');
 * log.progress('Processing items');
 * log.userError('Invalid input from client');
 * log.ops('metrics', { latency: 42 });
 *
 * const child = log.child('myModule:subcomponent');
 * child.debug('Detailed info'); // level from LOGGING config
 * ```
 */
export function stellog(name: string, options?: PinoLoggerOptions): StellarLogger {
    const level = lookupLevel(name);

    const baseOptions: PinoLoggerOptions = {
        name,
        level,
        customLevels,
        ...options,
    };

    // Add browser config if in browser environment
    if (isBrowser) {
        Object.assign(baseOptions, browserConfig);
    }

    const logger = pino(baseOptions);
    return decorateLogger(logger, name);
}

// =============================================================================
// Testing Utilities (internal)
// =============================================================================

/**
 * Reset cached config (for testing purposes).
 * @internal
 */
export function _resetConfigCache(): void {
    cachedConfig = null;
}

/**
 * Parse a LOGGING config string (exposed for testing).
 * @internal
 */
export function _parseLoggingConfig(configString: string): ParsedConfig {
    return parseLoggingConfig(configString);
}
