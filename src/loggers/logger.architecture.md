# Test Logging - Architecture

*Per-test structured logging for stellar-contracts test suites and UI applications*

## Interview Status

- **Phase**: 1 (Initial Discovery)
- **Checkpoint**: not yet reached

---

## The Tension

Vitest captures `console.*` output, making it hard to see logs in real-time or separate logs per test. The existing test helpers use unstructured `console.log` calls throughout. Browser applications need structured logging with appropriate console styling. We need:

1. **Structured logging** replacing ad-hoc console.log
2. **Per-test log isolation** for debugging specific test failures
3. **Hot-swappable logger context** that threads through the entire hierarchy:
   - Test: test helper → Capo → delegate → txn-context
   - UI: CapoProvider → Capo → delegate → txn-context
4. **Vitest bypass** to see logs in real-time during test execution
5. **Browser pipeline** with styled console output (and FUTURE: DRED channel support)

---

## Layered Architecture

The test logging system decomposes into six layers, each with a single concern. Understanding this layering resolves the relationship between existing code (`testLogger.ts`, `stellog.ts`) and the architectural target.

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 5: Test Orchestration (ARCH-2asyp52jx0)              │
│  DecoratedIt, createTestContext, LOG_TEST, process-UUT      │
│  Manages logger lifecycle within vitest                     │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Context Threading (ARCH-bsh6w7xvhm)              │
│  LoggerThreading pattern                                    │
│  Propagates LoggerContext through object creation graphs     │
│  Test: helperState → setup → Capo → delegates → tcx        │
│  UI:   React context → setup → Capo → delegates → tcx      │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: LoggerContext (ARCH-hnrkc3852t)                   │
│  Hot-swap wrapper: { get logger(), setLogger() }            │
│  Context-agnostic — same class in test and UI               │
│  Critical invariant: MUST NOT cache .logger or .child()     │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Destinations (ARCH-chh7ksg126)                    │
│  TestFileLogger, FocusedTestLogger, BrowserLogPipeline      │
│  Where log output goes: file, styled console, DRED          │
│  Produce pino.DestinationStream objects                     │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: stellog (ARCH-byjkn7x9qa — exists, stable)       │
│  Factory: stellog(name, options?) → StellarLogger           │
│  LOGGING config, child() facade, custom levels              │
│  Pure library function, no state                            │
├─────────────────────────────────────────────────────────────┤
│  Layer 0: pino (external)                                   │
│  JSON structured logging engine                             │
└─────────────────────────────────────────────────────────────┘

  Layer 6: Specialized Bridges (ARCH-matev1qm3f)
  UplcStellogAdapter — sits alongside Layer 2,
  bridges UplcLogger interface to stellog facilities
```

### Layer Boundaries

Each layer depends only on layers below it. Key boundaries:

| Boundary | Contract |
|----------|----------|
| L1→L0 | stellog wraps pino, adds LOGGING config + custom levels |
| L2→L1 | Destinations call `stellog(name, { dest })` to bind a logger to their stream |
| L3→L1 | LoggerContext holds a `StellarLogger` from stellog; no destination knowledge |
| L4→L3 | Threading passes the LoggerContext wrapper, never the logger itself |
| L5→L2,L3 | Orchestration creates destinations (L2), builds loggers (L1), wraps in LoggerContext (L3) |
| L6→L1,L3 | UplcStellogAdapter uses LoggerContext to get child loggers for its two facilities |

### What Happens to `testLogger.ts`

The existing `testLogger.ts` (229 lines) was a **proof-of-concept** that validated vitest bypass via pino destinations. It mixes concerns from multiple layers:

| `testLogger.ts` function | Mixed concern | Target layer |
|--------------------------|---------------|--------------|
| `setupTestLogger()` — creates pino logger | Log creation | L1 (stellog) |
| `setupTestLogger()` — file/stderr/pretty routing | Destination management | L2 (TestFileLogger) |
| `getTestLogger()` — global singleton | Logger access | L3 (LoggerContext) |
| `withTestLogger()` — beforeEach/afterEach | Test lifecycle | L5 (createTestContext) |
| `teardownTestLogger()` — process cleanup | Lifecycle teardown | L5 (afterEach/afterAll) |

**Disposition**: `testLogger.ts` is **superseded** by the layered architecture. It is not refactored — it is replaced. Its validated insights carry forward:

- **Validated**: pino destination to file bypasses vitest capture (informs L2)
- **Validated**: child-process pino-pretty works for real-time viewing (future L2 option)
- **Validated**: beforeEach/afterEach lifecycle pattern (informs L5)
- **Superseded**: global singleton pattern (replaced by hot-swap wrapper at L3)
- **Superseded**: mode-switching destination logic (decomposed into L2 destination classes)

### Layer Interaction: Test Path

A concrete walk-through showing how layers interact during a test:

```
describe("my test suite")
  │
  │  L5: createTestContext() registers beforeEach hook
  │
  beforeEach(context)
  │
  ├─ L5: Generate processUut (once per suite)
  │
  ├─ L2: Create/reuse TestFileLogger destination
  │       → .test-logs/<processUut>/<file>.logs.jsonl
  │
  ├─ L5: Check LOG_TEST for slug match
  │    └─ if match → L2: Create FocusedTestLogger destination
  │                  L2: Write stub entry in TestFileLogger
  │
  ├─ L1: stellog(testName, { dest: chosenDestination }) → StellarLogger
  │
  ├─ L3: new LoggerContext(logger)
  │       → stored in helperState.loggerContext
  │
  ├─ L5: Inject logger into vitest context
  │
  └─ L4: new TestHelper(config, helperState)
         └─ helperState.loggerContext threaded to:
              ├─ Capo.setup.loggerContext
              │    ├─ delegate.loggerContext
              │    ├─ utxoHelper.loggerContext
              │    └─ StellarTxnContext.loggerContext
              │         └─ L6: UplcStellogAdapter(loggerContext)
              └─ (all access via loggerContext.logger at call-site)

  it("slug", "description", async ({ logger }) => {
      // logger is loggerContext.logger, already scoped to this test
      logger.child("capo:snapshot").info("cache hit", { name });
  })

  afterEach
  │
  └─ L5: flush logger
```

### Layer Interaction: UI Path

```
<CapoDappProvider loggingConfig="info,capo:debug">
  │
  ├─ L2: BrowserLogPipeline (styled console output)
  │
  ├─ L1: stellog("app", { browser config })
  │
  ├─ L3: new LoggerContext(logger)
  │
  └─ L4: React context provides LoggerContext
         └─ useLogger("facility") → loggerContext.logger.child("facility")
         └─ Capo.setup.loggerContext
              └─ (same threading as test path from here)
```

### Naming: LoggerContext (not LoggerContext)

The hot-swap wrapper at Layer 3 is **context-agnostic** — it's the same 5-line class whether used in tests or UI. The name `LoggerContext` creates confusion when the same class appears in `CapoDappProvider`.

**Proposal**: Rename to `LoggerContext`. The "test" or "UI" distinction belongs to the *provider* (Layer 5 for tests, React context for UI), not to the wrapper itself.

```typescript
// Layer 3: src/loggers/LoggerContext.ts
class LoggerContext {
    #logger: StellarLogger;
    get logger(): StellarLogger { return this.#logger; }
    setLogger(logger: StellarLogger): void { this.#logger = logger; }
}

// Layer 5 creates it for tests
// React context wraps it for UI
// Layer 4 threads it identically in both cases
```

This rename affects ARCH-28b90zs38k (currently "LoggerContext") and ARCH-ex4h6pc08v (currently "UILoggerContext" — becomes the React context provider around `LoggerContext`, not a separate wrapper class).

---

## Collaborators

### Software modules USED BY Test Logging:
- `stellog` — Logger factory with custom levels and facility-based configuration
- `pino` — Underlying logging engine
- `vitest` — Test framework hooks (beforeEach, afterEach, test context)

### Software modules expected to USE Test Logging:

**Test Infrastructure** (first-class clients):
- `StellarTestHelper` — NEEDS ARCH-28b90zs38k (LoggerContext) for hot-swap wrapper injection
- `CapoTestHelper` — NEEDS ARCH-gy5126n88c (DecoratedIt) for slug-based test logging
- `DefaultCapoTestHelper` — Inherits from CapoTestHelper

**Contract Infrastructure** (first-class clients):
- `Capo` — NEEDS ARCH-28b90zs38k (LoggerContext) via setup for threading
- `StellarDelegate` — NEEDS loggerContext from Capo
- `UtxoHelper` — NEEDS loggerContext from setup
- `StellarTxnContext` — NEEDS loggerContext from creating Capo/helper

**UI Infrastructure** (first-class clients):
- `CapoDappProvider` — NEEDS ARCH-ex4h6pc08v (UILoggerContext) for React context-based logger threading
- Browser applications — NEEDS ARCH-8w01jpfvsw (BrowserLogPipeline) for styled console output

### First-class instances that USE Test Logging:

| Client | NEEDS | Purpose |
|--------|-------|---------|
| `StellarTestHelper` | ARCH-28b90zs38k | Receives loggerContext in beforeEach, threads to setup |
| `CapoTestHelper` | ARCH-gy5126n88c | Wrapped `it()` with slug and logger injection |
| `Capo` | ARCH-28b90zs38k | Receives loggerContext via setup, threads to children |
| `StellarTxnContext` | ARCH-28b90zs38k | Uses loggerContext.logger for txn lifecycle logging |
| `CapoDappProvider` | ARCH-ex4h6pc08v | Provides React context for UI logger threading |

### Test Logging EXPECTS from its clients:

| Client | EXPECTS (behavioral) |
|--------|----------------------|
| All consumers | MUST NOT cache `loggerContext.logger` or `logger.child()` results |
| All consumers | MUST access logger at point-of-use via the wrapper |
| `Capo` | MUST thread loggerContext to constructed delegates |
| `Capo` | MUST thread loggerContext to UtxoHelper |
| `Capo` | MUST thread loggerContext to created StellarTxnContext objects |
| `StellarTestHelper` | MUST replace console.log calls with structured logging |

---

## Components and Concerns

| ARCH-UUT | Name | Location | Summary |
|----------|------|----------|---------|
| ARCH-28b90zs38k | LoggerContext | local | Hot-swap wrapper providing scoped logger access |
| ARCH-e81gt3ks9t | TestFileLogger | local | Automatic per-file log aggregation |
| ARCH-4f3zh8z32k | FocusedTestLogger | local | On-demand per-test detailed logging |
| ARCH-gy5126n88c | DecoratedIt | local | Extended `it()` with slug and logger injection |
| ARCH-1b6370g29p | LoggerThreading | internal | Pattern for threading logger through object creation |
| ARCH-tqb909cyzr | UplcStellogAdapter | local | Bridges UPLC traces to stellog (receipt + detail facilities) |
| ARCH-ex4h6pc08v | UILoggerContext | local | React context-based logger threading for UI |
| ARCH-8w01jpfvsw | BrowserLogPipeline | local | Browser console output with styling |
| ARCH-dy3569b0bd | DREDLogTransport | local/future | Remote log streaming via DRED channel |

### Concerns Summary

| Concern | Type | Owner | Dependents |
|---------|------|-------|------------|
| hot-swap-wrapper | pattern | LoggerContext | all test consumers |
| test-file-logs | artifact | TestFileLogger | test suites |
| focused-logs | artifact | FocusedTestLogger | LOG_TEST users |
| logger-injection | pattern | DecoratedIt | test functions |
| context-threading | pattern | LoggerThreading | Capo, delegates, txn-context |
| uplc:receipt | artifact | UplcStellogAdapter | human viewing, audit trail |
| uplc:detail | artifact | UplcStellogAdapter | programmatic analysis |
| ui-logger-context | pattern | UILoggerContext | CapoDappProvider, React components |
| browser-output | artifact | BrowserLogPipeline | browser applications |
| remote-log-stream | resource | DREDLogTransport | future: remote debugging |

---

## Components

### ARCH-28b90zs38k: LoggerContext

**Location**: local (`src/loggers/LoggerContext.ts`)

**Activities**:
- Provide hot-swap wrapper for logger access
- Allow logger replacement without invalidating closures
- Support `logger.child("facility")` at call-site (no caching)
- Thread through test helper → setup → Capo hierarchy

**Concerns**:
- **Owns**: hot-swap-wrapper pattern
- **Depends on**: stellog (logger factory)

**API Shape**:
```typescript
interface LoggerContext {
    /** Get current logger - MUST NOT cache result */
    get logger(): StellarLogger;
    /** Swap underlying logger (used at test boundaries) */
    setLogger(logger: StellarLogger): void;
}

// Implementation
class LoggerContext {
    #logger: StellarLogger;

    constructor(initialLogger: StellarLogger) {
        this.#logger = initialLogger;
    }

    get logger(): StellarLogger {
        return this.#logger;
    }

    setLogger(logger: StellarLogger): void {
        this.#logger = logger;
    }
}
```

**Critical Invariant** (per REQM conventions):
- Consumers MUST NOT cache `loggerContext.logger` — access at point of use
- Consumers MUST NOT cache `logger.child()` results — call at very-short-term scope
- Consumers MAY close over the `LoggerContext` wrapper itself
- Both rules exist because the underlying logger can be swapped at test boundaries

---

### ARCH-e81gt3ks9t: TestFileLogger

**Location**: local (`src/loggers/testFileLogger.ts`)

**Activities**:
- Create `.test-logs/<process-uut>/testFile.logs.jsonl` automatically
- Aggregate all logs from a test file into single stream
- Generate process-uut on test suite startup
- Insert stub log lines pointing to focused test outputs

**Concerns**:
- **Owns**: test-file-logs artifact
- **Depends on**: stellog, LoggerContext

**Output Path**: `.test-logs/<process-uut>/<testFileName>.logs.jsonl`

**Behavior**:
- Without `LOG_TEST`: 5 test files → 5 log files
- With `LOG_TEST=slug1,slug2`: 5 test files + 2 focused → 7 log files
- File logger includes stub entries: `{"focused": "slug1", "path": ".test-logs/<uut>/test-slug1.jsonl"}`

**API Shape**:
```typescript
interface TestFileLoggerOptions {
    processUut: string;      // Generated once per test run
    testFileName: string;    // From vitest context
    logDir?: string;         // Default: ./test-logs
}

class TestFileLogger {
    constructor(options: TestFileLoggerOptions);

    /** Get pino destination for this file */
    get destination(): pino.DestinationStream;

    /** Write stub entry pointing to focused test log */
    writeFocusedStub(slug: string, focusedPath: string): void;

    /** Flush and close */
    close(): Promise<void>;
}
```

---

### ARCH-4f3zh8z32k: FocusedTestLogger

**Location**: local (`src/loggers/focusedTestLogger.ts`)

**Activities**:
- Create `.test-logs/<uut>/test-<slug-with-shortUut>.jsonl` on demand
- Activated by `LOG_TEST` env var matching test slug
- Capture detailed logs for specific test debugging
- Support per-test LOGGING config override

**Concerns**:
- **Owns**: focused-logs artifact
- **Depends on**: stellog, LoggerContext

**Output Path**: `.test-logs/<uut>/test-<slug>.jsonl`

**Activation**: `LOG_TEST="slug-one,slug-two" pnpm test ...`

**API Shape**:
```typescript
interface FocusedTestLoggerOptions {
    slug: string;
    uut: string;              // Unique per focused test
    logDir?: string;
    loggingConfig?: string;   // Per-test LOGGING override, e.g., "capo:trace"
}

class FocusedTestLogger {
    constructor(options: FocusedTestLoggerOptions);

    /** Check if this slug is in LOG_TEST */
    static isSlugFocused(slug: string): boolean;

    /** Parse LOG_TEST env var */
    static getFocusedSlugs(): string[];

    get destination(): pino.DestinationStream;
    get filePath(): string;

    close(): Promise<void>;
}
```

---

### ARCH-gy5126n88c: DecoratedIt

**Location**: local (`src/testing/decoratedIt.ts`)

**Activities**:
- Extend vitest's `it()` with slug-based test identification
- Inject `{logger}` into test context
- Support optional config object with `{LOGGING: "facility:trace"}`
- Wire up beforeEach/afterEach for logger lifecycle

**Concerns**:
- **Owns**: logger-injection pattern
- **Depends on**: LoggerContext, TestFileLogger, FocusedTestLogger, vitest

**API Shape**:
```typescript
// Extended it() signature - 3-arg form
function it(
    slug: string,           // e.g., "creates-charter-abc123"
    description: string,    // e.g., "creates charter with valid config"
    fn: (ctx: TestContext & { logger: StellarLogger }) => Promise<void>
): void;

// Extended it() signature - 4-arg form with options
function it(
    slug: string,
    description: string,
    options: TestOptions,
    fn: (ctx: TestContext & { logger: StellarLogger }) => Promise<void>
): void;

interface TestOptions {
    /** Per-test LOGGING config, wrapped as {meta: {LOGGING}} in output */
    LOGGING?: string;
    /** Other vitest options pass through */
    [key: string]: unknown;
}
```

**Vitest Integration**:
```typescript
// Creates wrapped describe/it that inject logger
function createLoggedTestContext<TC>(
    helperFactory: () => TestHelper,
    options?: { logDir?: string }
): {
    describe: WrappedDescribe<TC>;
    it: WrappedIt<TC>;
    fit: WrappedIt<TC>;
    xit: typeof vitestIt.skip;
}
```

---

### ARCH-1b6370g29p: LoggerThreading

**Location**: internal (pattern, not a file)

**Activities**:
- Thread LoggerContext through object creation hierarchy
- Ensure Capo.setup receives logger context
- Ensure delegates, UtxoHelper, StellarTxnContext receive context

**Concerns**:
- **Owns**: context-threading pattern
- **Depends on**: LoggerContext

**Threading Path (Test)**:
```
beforeEach
    └─→ TestHelper.loggerContext
            └─→ Capo.setup.loggerContext
                    ├─→ Delegate.loggerContext
                    ├─→ UtxoHelper.loggerContext
                    └─→ StellarTxnContext.loggerContext
```

**Threading Path (UI)**:
```
CapoDappProvider
    └─→ UILoggerContext (React context)
            └─→ Capo.setup.loggerContext
                    ├─→ Delegate.loggerContext
                    ├─→ UtxoHelper.loggerContext
                    └─→ StellarTxnContext.loggerContext
```

**Implementation Pattern**: Each layer receives the context wrapper (not the logger itself). Objects access `loggerContext.logger` at call-site, and MAY call `logger.child("facility")` for short-lived scoped logging.

**This pattern EXPECTS** (behavioral requirements on collaborators):
- `Capo` MUST accept `loggerContext` in setup and thread to constructed delegate objects
- `Capo` MUST thread `loggerContext` to its UtxoHelper
- `Capo` MUST thread `loggerContext` to any StellarTxnContext objects created
- All txn-context creation MUST be done through helpers that thread the loggerContext
- `StellarDelegate` MUST accept `loggerContext` in constructor/setup
- `UtxoHelper` MUST accept `loggerContext` in constructor
- `StellarTxnContext` MUST accept `loggerContext` in constructor

---

### ARCH-ex4h6pc08v: UILoggerProvider

**Location**: local (`src/ui/UILoggerProvider.ts`)

**Activities**:
- Provide React context wrapping `LoggerContext` for UI applications
- Integrate with CapoDappProvider
- Expose `useLogger()` hook for component access
- Future: Support DRED channel transport

**Relationship to LoggerContext**: This is the React *provider* for the generic `LoggerContext` (ARCH-28b90zs38k). Not a separate wrapper class — uses the same `LoggerContext` that tests use. The "UI" distinction is in how the context is *provided* (React context), not in the wrapper itself.

**Concerns**:
- **Owns**: ui-logger-context pattern
- **Depends on**: stellog, React, LoggerContext, BrowserLogPipeline

**API Shape**:
```typescript
// React context (internal — consumers use useLogger() hook)
const LoggerReactContext = React.createContext<LoggerContext | null>(null);

// Hook for components
function useLogger(facility?: string): StellarLogger {
    const ctx = React.useContext(LoggerContext);
    if (!ctx) throw new Error("useLogger must be used within LoggerProvider");
    const logger = ctx.logger;
    return facility ? logger.child(facility) : logger;
}

// Provider component
interface LoggerProviderProps {
    children: React.ReactNode;
    loggingConfig?: string;  // LOGGING config string
    transports?: LogTransport[];  // Future: include DREDLogTransport
}

function LoggerProvider({ children, loggingConfig, transports }: LoggerProviderProps): JSX.Element;
```

**Integration with CapoDappProvider**:
```typescript
// CapoDappProvider internally uses LoggerProvider
function CapoDappProvider({ children, ...props }) {
    return (
        <LoggerProvider loggingConfig={props.loggingConfig}>
            <CapoContextProvider {...props}>
                {children}
            </CapoContextProvider>
        </LoggerProvider>
    );
}
```

---

### ARCH-8w01jpfvsw: BrowserLogPipeline

**Location**: local (`src/loggers/browserPipeline.ts`)

**Activities**:
- Route stellog output to browser console with CSS styling
- Respect stellog's custom levels (progress, userError, ops)
- Format structured data for console inspection

**Concerns**:
- **Owns**: browser-output artifact
- **Depends on**: stellog browser.write configuration

**Implementation**: Already exists in stellog.ts via `browserWriteFunctions`. This component formalizes and extends it.

**Styling Map**:
```typescript
const browserStyles: Record<string, { background: string; color: string }> = {
    fatal:     { background: "red",    color: "white" },
    error:     { background: "red",    color: "white" },
    warn:      { background: "yellow", color: "black" },
    info:      { background: "blue",   color: "white" },
    debug:     { background: "gray",   color: "white" },
    trace:     { background: "gray",   color: "white" },
    ops:       { background: "purple", color: "white" },
    userError: { background: "orange", color: "black" },
    progress:  { background: "cyan",   color: "black" },
};
```

---

### ARCH-tqb909cyzr: UplcStellogAdapter

**Location**: local (`src/loggers/uplcLogAdapter.ts`)

**Activities**:
- Bridge UplcConsoleLogger output to stellog facilities
- Emit complete visual receipt as single log entry (`name: "uplc:receipt"`)
- Emit granular trace entries individually (`name: "uplc:detail"`)
- Preserve nested group context in granular entries

**Concerns**:
- **Owns**: uplc-stellog-bridge pattern
- **Depends on**: UplcConsoleLogger, stellog, LoggerContext

**Dual-Facility Output**:

The adapter produces two parallel views of the same UPLC execution:

**1. Visual Receipt** (`uplc:receipt`):
```json
{"name":"uplc:receipt","msg":"╭┈┈┈┬┈┈┈...\n│ ● ┊ validateMinting\n...╰┈┈┈┴┈┈┈"}
```
- Complete formatted block as single entry
- Preserves dot-matrix aesthetic for human viewing
- Emitted on `flush()` / `finish()`

**2. Granular Detail** (`uplc:detail`):
```json
{"name":"uplc:detail","msg":"checking policy...","group":"validateMinting","depth":1}
{"name":"uplc:detail","msg":"token name: \"charter\"","group":"validateMinting","depth":1}
{"name":"uplc:detail","msg":"✅","group":"validateMinting","depth":1,"result":true}
```
- Individual entries for programmatic analysis
- Includes group context and nesting depth
- Emitted on each `logPrint()` call

**LOGGING Config**:
```bash
# Just receipts (human view)
LOGGING=uplc:receipt:info

# Receipts + granular detail
LOGGING=uplc:receipt:info,uplc:detail:trace

# Only granular (programmatic processing)
LOGGING=uplc:detail:debug
```

**API Shape**:
```typescript
class UplcStellogAdapter implements UplcLogger {
    constructor(loggerContext: LoggerContext);

    // UplcLogger interface (delegated from UplcConsoleLogger)
    logPrint(message: string, site?: Site): this;
    logError(message: string, site?: Site): void;
    reset(reason: "build" | "validate"): void;
    flush(): this;
    finish(): this;
    flushError(message?: string): this;

    // Internal: get child loggers from context
    private get receiptLogger(): StellarLogger;  // loggerContext.logger.child("uplc:receipt")
    private get detailLogger(): StellarLogger;   // loggerContext.logger.child("uplc:detail")
}
```

**Integration with StellarTxnContext**:
```typescript
class StellarTxnContext {
    // OLD: logger = new UplcConsoleLogger();
    // NEW:
    get logger(): UplcLogger {
        return new UplcStellogAdapter(this.loggerContext);
    }
}
```

---

### ARCH-dy3569b0bd: DREDLogTransport (FUTURE)

**Location**: local (`src/loggers/dredTransport.ts`)

**Activities**:
- Stream logs to remote DRED channel for debugging
- Support browser-to-server log forwarding
- Enable remote debugging of production issues

**Concerns**:
- **Owns**: remote-log-stream resource
- **Depends on**: DRED channel infrastructure (external)

**Status**: FUTURE — architecture placeholder for remote debugging capability.

**API Shape (Planned)**:
```typescript
interface DREDLogTransportOptions {
    channelId: string;
    endpoint: string;
    batchSize?: number;
    flushInterval?: number;
}

class DREDLogTransport implements pino.DestinationStream {
    constructor(options: DREDLogTransportOptions);
    write(chunk: string): boolean;
    flush(): Promise<void>;
    close(): Promise<void>;
}
```

---

## Interfaces

| ARCH-UUT | Interface | Mechanism | Direction | Payload |
|----------|-----------|-----------|-----------|---------|
| ARCH-ccnwphczf1 | beforeEach injection | vitest hook | vitest → test | `{logger}` in context |
| ARCH-4atcrs8g5v | LOG_TEST activation | env var | shell → test suite | comma-separated slugs |
| ARCH-313qkxkwn0 | setup threading | constructor arg | helper → Capo | LoggerContext |
| ARCH-b58dar6knq | React context | context provider | LoggerProvider → components | LoggerContext |
| ARCH-cky1s5gwrg | Capo threading | setup property | Capo → delegates/txn | LoggerContext |

### ARCH-ccnwphczf1: beforeEach Injection

**Mechanism**: vitest beforeEach hook
**Direction**: Framework → test function
**Payload**: `{logger: StellarLogger}` added to test context and helper
**Errors**: None (logger always available)

### ARCH-4atcrs8g5v: LOG_TEST Activation

**Mechanism**: Environment variable
**Direction**: Shell → test suite
**Payload**: `LOG_TEST="slug1,slug2,..."` - comma-separated test slugs
**Errors**: Unknown slugs silently ignored (warning logged to file logger)

### ARCH-313qkxkwn0: Setup Threading

**Mechanism**: Constructor/setup argument
**Direction**: Test helper → Capo → delegates → txn-context
**Payload**: `LoggerContext` wrapper instance
**Errors**: None — loggerContext is required on SetupInfo

### ARCH-b58dar6knq: React Context Threading

**Mechanism**: React context provider
**Direction**: LoggerProvider → child components → Capo
**Payload**: `LoggerContext` via `useLogger()` hook
**Errors**: Hook outside provider throws

### ARCH-cky1s5gwrg: Capo Threading

**Mechanism**: `setup.loggerContext` property (required)
**Direction**: Capo → delegates, UtxoHelper, StellarTxnContext
**Payload**: `LoggerContext` wrapper
**Errors**: None — loggerContext is required on SetupInfo, always present

---

## Type Changes Required

### ARCH-9jjv7e0nb7: SetupInfo Extension

The `SetupInfo` type (in `StellarContract.ts`) MUST be extended:

```typescript
export type SetupInfo = {
    // ... existing fields ...
    network: CardanoClient | Emulator;
    networkParams: NetworkParams;
    txBatcher: TxBatcher;
    isMainnet: boolean;
    actorContext: ActorContext;
    isTest?: boolean;
    uh?: UtxoHelper;
    optimize?: boolean | HeliosOptimizeOptions;
    uxtoDisplayCache?: UtxoDisplayCache;

    // Logger context for structured logging — REQUIRED, not optional
    loggerContext: LoggerContext;
};
```

**Threading from SetupInfo** (loggerContext is required, always present):
- `Capo.init()` stores `setup.loggerContext`
- `Capo` threads to delegates via their setup/constructor
- `UtxoHelper` receives via constructor
- `StellarTxnContext` receives via constructor

**Breaking Change**: This makes `loggerContext` required on `SetupInfo`. All code constructing SetupInfo must provide a LoggerContext. No fallback — if you create a SetupInfo, you supply the logger.

### ARCH-t8jtpvzmgx: TestHelperState Extension

The `TestHelperState` type (in `testing/types.ts`) MUST be extended:

```typescript
export type TestHelperState<SC, SpecialState> = {
    // ... existing fields ...
    namedRecords: Record<string, string>;
    actorContext: ActorContext;
    bootstrappedStrella?: SC;
    parsedConfig?: any;
    snapCache?: SnapshotCache;

    // Logger infrastructure — loggerContext is REQUIRED
    loggerContext: LoggerContext;
    testFileLogger?: TestFileLogger;
    processUut?: string;
};
```

---

## Process Lifecycle

### ARCH-2s22kcyw95: Process-UUT Generation

The process-uut uniquely identifies a test run for log organization.

**Generation** (once per test suite load):
```typescript
// In test setup (e.g., vitest globalSetup or first describe)
const processUut = nanoid(10);  // e.g., "V1StGXR8_Z"
```

**Scope**: Shared across all test files in the same vitest process.

**Storage**:
- Stored in `helperState.processUut` (persists across tests in file)
- Or in a module-level variable if helperState not yet available

**Output Path**: `.test-logs/${processUut}/${testFileName}.logs.jsonl`

### ARCH-fx32w83yew: createTestContext Logger Integration

The existing `createTestContext()` flow:
```
createTestContext()
  └─→ wrapDescribe()
        └─→ beforeEach (registered once per describe)
              └─→ addTestContext(context, HelperClass, config, helperState)
                    └─→ new HelperClass(config, helperState)
```

**Modified flow with logging**:
```
createTestContext(options)  // options gains: { logDir?, loggingConfig? }
  └─→ wrapDescribe()
        └─→ beforeEach
              │
              ├─→ [Ensure processUut exists]
              │     helperState.processUut ??= nanoid(10)
              │
              ├─→ [Ensure TestFileLogger exists]
              │     helperState.testFileLogger ??= new TestFileLogger({
              │         processUut: helperState.processUut,
              │         testFileName: context.task.file.name
              │     })
              │
              ├─→ [Check LOG_TEST for focused logging]
              │     const slug = context.task.name;  // or extracted from decorated it()
              │     if (FocusedTestLogger.isSlugFocused(slug)) {
              │         logger = new FocusedTestLogger({ slug, ... });
              │         helperState.testFileLogger.writeFocusedStub(slug, logger.filePath);
              │     } else {
              │         logger = stellog(testFileName, { dest: testFileLogger.destination });
              │     }
              │
              ├─→ [Create LoggerContext]
              │     helperState.loggerContext = new LoggerContext(logger);
              │
              ├─→ [Inject into vitest context]
              │     context.logger = helperState.loggerContext.logger;
              │
              └─→ addTestContext(context, HelperClass, config, helperState)
                    └─→ new HelperClass(config, helperState)
                          └─→ this.loggerContext = helperState.loggerContext
```

**afterEach** (cleanup):
```
afterEach
  └─→ [Flush logger]
        helperState.loggerContext?.logger.flush?.()
```

**afterAll** (per-file cleanup):
```
afterAll
  └─→ [Close file logger]
        helperState.testFileLogger?.close()
```

---

## Data Flow

### Workflow: Test Suite Startup

**ARCH-UUT**: ARCH-2ms4f9rtme

```
[Test Suite Loads]
        |
        v
[Generate process-uut]
        |
        v
[Create TestFileLogger]
(path: .test-logs/<process-uut>/<file>.logs.jsonl)
        |
        v
[Parse LOG_TEST env var]
        |
        v
[Register focused slugs if any]
```

### Workflow: Test Execution

**ARCH-UUT**: ARCH-pk8hd84k36

```
[it("slug", "desc", async ({logger}) => {...})]
        |
        v
[beforeEach]
    |
    ├─→ [Check if slug in LOG_TEST]
    |       |
    |       ├─→ YES: Create FocusedTestLogger
    |       |         Write stub to TestFileLogger
    |       |
    |       └─→ NO: Use TestFileLogger
    |
    └─→ [Create LoggerContext with chosen logger]
            |
            v
        [Inject into test context]
            |
            v
        [Thread into TestHelper.loggerContext]
            |
            v
        [TestHelper threads to Capo.setup]
            |
            v
        [Capo threads to delegates, UtxoHelper, TxnContexts]
            |
            v
        [Test runs, all components use loggerContext.logger]
            |
            v
        [afterEach: flush logs]
```

### Workflow: UI Application Startup

**ARCH-UUT**: ARCH-hp3vt9x81q

```
[App renders CapoDappProvider]
        |
        v
[LoggerProvider initializes]
    |
    ├─→ [Create stellog with browser config]
    |
    └─→ [Create LoggerContext wrapper]
            |
            v
        [Provide via React context]
            |
            v
        [CapoContextProvider receives loggerContext]
            |
            v
        [Capo instances receive via setup.loggerContext]
            |
            v
        [Components use useLogger() hook]
```

### Workflow: Snapshot Operations Logging

**ARCH-UUT**: ARCH-6xvr7v1qc7

Snapshot operations in CapoTestHelper need structured logging for debugging cache behavior.

**Cache Hit**:
```
logger.info("snapshot cache hit", {
    name: "enabledDelegatesDeployed",
    cacheKey: "abc123",
    elapsed: 42
});
// Output: {"name":"capo:snapshot","msg":"snapshot cache hit","snapshot":"enabledDelegatesDeployed","cacheKey":"abc123","elapsed":42}
```

**Cache Miss → Build**:
```
logger.info("snapshot cache miss - building", { name, parentSnapName });
logger.progress("building snapshot", { name });
// ... build operations ...
logger.info("snapshot built", { name, elapsed: 1234 });
logger.info("snapshot stored", { name, path, elapsed: 56 });
```

**Parent Resolution**:
```
logger.debug("resolving parent snapshot", { name, parentSnapName });
logger.debug("loading parent state", { parentSnapName, utxoCount: 42 });
```

**Recommended Facility**: `capo:snapshot` for all snapshot operations.

### Workflow: Browser Log Output

**ARCH-UUT**: ARCH-ejhtbj70ng

```
[Component calls logger.info("message", {data})]
        |
        v
[stellog routes to browser.write]
        |
        v
[BrowserLogPipeline formats]
    |
    ├─→ [Apply CSS styling per level]
    |
    └─→ [Format structured data]
            |
            v
        [console.info("%c INFO ", style, msg, data)]
```

---

## Facility Naming & Log Level Conventions

### Facility Hierarchy

Facilities use colon-separated hierarchical names for targeted configuration:

| Facility | Purpose | Typical Level |
|----------|---------|---------------|
| `test` | Test lifecycle (beforeEach, afterEach) | info |
| `test:actor` | Actor setup, switching | info |
| `test:network` | Network time, slot advancement | debug |
| `capo` | Capo lifecycle, charter ops | info |
| `capo:snapshot` | Snapshot cache operations | info |
| `capo:delegate` | Delegate connection, caching | debug |
| `capo:minting` | Minting policy operations | info |
| `txn` | Transaction building, submission | info |
| `txn:build` | Detailed txn construction | debug |
| `txn:costs` | Cost/budget reporting | info |
| `uplc:receipt` | Visual UPLC receipts | info |
| `uplc:detail` | Granular UPLC trace entries | trace |
| `bundle` | Script bundle operations | debug |
| `bundle:compile` | Compilation timing | info |

### Log Level Guidelines

| Level | When to Use | Example |
|-------|-------------|---------|
| `error` | Failures requiring attention | `txn validation failed` |
| `warn` | Unexpected but handled | `deprecated method called` |
| `info` | Key lifecycle events | `snapshot cache hit`, `actor changed` |
| `progress` | Execution flow visibility | `building snapshot...`, `compiling...` |
| `debug` | Detailed internal state | `delegate cache key: abc123` |
| `trace` | Very granular | `UPLC step: checking policy` |

### Console.log Migration Mapping

| Current Pattern | Target Facility | Level |
|-----------------|-----------------|-------|
| `console.log("🎭 -> 🎭 changing actor...")` | `test:actor` | info |
| `console.log("  ⚡ cache hit...")` | `capo:snapshot` | info |
| `console.log("  📦 cache miss - building...")` | `capo:snapshot` | progress |
| `console.log("[DEBUG ...]")` | varies | debug |
| `console.warn("deprecated...")` | varies | warn |
| `console.error("expected single item...")` | varies | error |
| `console.log("tcx build() @top")` | `txn:build` | debug |
| `console.log("costs: ...")` | `txn:costs` | info |

### LOGGING Config Examples

```bash
# Production-like: only warnings and above
LOGGING=warn

# Development: info for main flows
LOGGING=info

# Debugging snapshots
LOGGING=info,capo:snapshot:debug

# Debugging transactions
LOGGING=info,txn:debug,uplc:detail:trace

# Full trace for specific facility
LOGGING=warn,capo:delegate:trace

# Multiple focused areas
LOGGING=info,test:actor:debug,capo:snapshot:debug,txn:costs:debug
```

### LOG_TEST vs LOGGING Interaction

These two mechanisms serve different purposes:

| Mechanism | Purpose | Scope |
|-----------|---------|-------|
| `LOGGING` | Which facilities/levels to capture | All tests |
| `LOG_TEST` | Which tests get focused output files | Specific tests by slug |

**Combined usage**:
```bash
# Focus on specific test with detailed logging
LOG_TEST="charter-creation-xyz" LOGGING=info,capo:trace pnpm test
```

**Behavior**:
1. **File logger** (automatic): Gets all logs at configured LOGGING levels
2. **Focused logger** (LOG_TEST): Gets same logs, but to separate file

**Per-test LOGGING override** (via decorated `it()`):
```typescript
it("slug-abc", "description", { LOGGING: "uplc:detail:trace" }, async ({ logger }) => {
    // This test captures uplc:detail at trace level
    // Other tests use default LOGGING config
});
```

The per-test override is **additive** — it doesn't replace the global config, it adjusts facility levels for that test only. The override is recorded in log metadata:
```json
{"name":"test","msg":"test started","meta":{"LOGGING":"uplc:detail:trace"}}
```

---

## Collaboration Stubs

### ARCH-hp3vt9x81q: Emulator/Test Helper Integration (Stub)

**Target Architecture**: `../testing/emulator/Emulator.ARCHITECTURE.md`

**Collaboration Pattern**: This architecture provides `LoggerContext` that emulator/test-helper components NEED for structured logging.

**Emulator/Test Helper Architecture NEEDS from This Architecture**:

| Component | NEEDS |
|-----------|-------|
| `StellarTestHelper` | ARCH-28b90zs38k (LoggerContext) |
| `CapoTestHelper` | ARCH-gy5126n88c (DecoratedIt) |
| `createTestContext()` | ARCH-e81gt3ks9t (TestFileLogger) |

**This Architecture EXPECTS from Emulator/Test Helper** (behavioral):

| Component | This Architecture EXPECTS |
|-----------|---------------------------|
| `StellarTestHelper` | MUST accept `loggerContext`, thread to setup |
| `StellarTestHelper` | MUST replace console.log with structured logging |
| `CapoTestHelper` | MUST thread `loggerContext` through snapshot operations |
| `Capo` | MUST thread `loggerContext` to delegates, UtxoHelper, txn-contexts |
| All consumers | MUST NOT cache logger or logger.child() results |

**Status**: Pending implementation.

### ARCH-ejhtbj70ng: UI/CapoDappProvider Integration (Stub)

**Target Architecture**: `../../dapp-ui.architecture.md` (ARCH-he5h8a4jr7: CapoDappProvider)

**Collaboration Pattern**: This architecture provides `UILoggerContext` and `BrowserLogPipeline` that UI components NEED for browser logging.

**UI Architecture NEEDS from This Architecture**:

| Component | NEEDS |
|-----------|-------|
| `CapoDappProvider` | ARCH-ex4h6pc08v (UILoggerContext) |
| Browser applications | ARCH-8w01jpfvsw (BrowserLogPipeline) |
| Future: remote debugging | ARCH-dy3569b0bd (DREDLogTransport) |

**This Architecture EXPECTS from UI** (behavioral):

| Component | This Architecture EXPECTS |
|-----------|---------------------------|
| `CapoDappProvider` | MUST wrap children in `LoggerProvider` |
| `CapoDappProvider` | MUST thread `loggerContext` to Capo instances |
| React components | MUST NOT cache logger from `useLogger()` |
| React components | MAY use `useLogger(facility?)` for scoped logging |

**Status**: Pending implementation.

---

## Migration Strategy

### Phase 1: Foundation (~2-3 days)
**Goal**: Core infrastructure, loggerContext required everywhere

1. Implement `LoggerContext` hot-swap wrapper
2. Implement `TestFileLogger` for automatic file logging
3. Implement `FocusedTestLogger` for LOG_TEST support
4. Add `loggerContext` to `SetupInfo` type (**required** field)
5. Add logger fields to `TestHelperState` (`loggerContext` required)
6. Update all SetupInfo construction sites to provide a LoggerContext

**Verification**: Can create loggers, write to files, LOG_TEST works standalone. All SetupInfo sites compile with required loggerContext.

### Phase 2: Test Helper Integration (~3-4 days)
**Goal**: Logger flows through test helpers

1. Modify `createTestContext()` to set up logger in beforeEach
2. Modify `StellarTestHelper` constructor to accept loggerContext
3. Migrate ~25 console.log calls in `StellarTestHelper.ts`
4. Migrate ~55 console.log calls in `CapoTestHelper.ts`
5. Use facilities: `test`, `test:actor`, `test:network`, `capo:snapshot`

**Verification**: Test output goes to log files, LOGGING config respected.

### Phase 3: Capo/Offchain Threading (~4-5 days)
**Goal**: Logger flows through Capo → delegates → txn-context

1. Modify `Capo.createWith()` and `init()` to accept loggerContext
2. Thread through `connectDelegateWithOnchainRDLink()` → delegate creation
3. Thread through `UtxoHelper` constructor
4. Thread through `StellarTxnContext` constructor
5. Migrate ~50 console.log calls in `Capo.ts`
6. Migrate ~30 console.log calls in `StellarContract.ts`
7. Use facilities: `capo`, `capo:delegate`, `capo:minting`, `bundle`

**Verification**: Delegate connection, charter ops logged structurally.

### Phase 4: UplcStellogAdapter (~2-3 days)
**Goal**: UPLC traces integrated with stellog

1. Implement `UplcStellogAdapter` implementing `UplcLogger` interface
2. Produce `uplc:receipt` (visual) and `uplc:detail` (granular) outputs
3. Modify `StellarTxnContext.logger` getter to return adapter
4. Migrate ~35 console.log calls in `StellarTxnContext.ts`
5. Use facilities: `txn`, `txn:build`, `txn:costs`, `uplc:receipt`, `uplc:detail`

**Verification**: UPLC validation produces both visual receipts and granular logs.

### Phase 5: DecoratedIt (~2 days)
**Goal**: Slug-based test identification and per-test config

1. Implement `DecoratedIt` with slug + description signature
2. Add per-test LOGGING config support
3. Update `createTestContext()` to use DecoratedIt
4. Document migration path for existing tests

**Verification**: `it("slug", "desc", async ({logger}) => ...)` works, LOG_TEST targets slugs.

### Phase 6: UI Integration (~2-3 days)
**Goal**: Browser applications get structured logging

1. Implement `UILoggerContext` and `LoggerProvider`
2. Integrate `LoggerProvider` into `CapoDappProvider`
3. Implement `useLogger()` hook
4. Verify `BrowserLogPipeline` (already in stellog) works with custom levels

**Verification**: React apps get styled console output, LOGGING config works in browser.

### Phase 7 (FUTURE): DRED Transport
**Goal**: Remote debugging for production

1. Design DRED channel protocol for logs
2. Implement `DREDLogTransport`
3. Add transport configuration to `LoggerProvider`

**Verification**: Logs stream to remote DRED channel.

---

## Open Questions

- [ ] Should focused logs include full traces or just the test-specific logs?
- [ ] How to handle async operations that outlive the test (e.g., background processes)?
- [ ] Should failed tests automatically get focused logging on retry?
- [ ] What structured context should be standard for txn logging? (tcx.txnName, actor, inputs/outputs?)
- [ ] Should UILoggerContext support dynamic LOGGING config changes (e.g., from devtools)?

---

## Discovery Notes

### Deep Interview: Console.log Migration Audit

**Migration Scope** (counts are approximate):

| File | console.* calls | Categories |
|------|-----------------|------------|
| `StellarTestHelper.ts` | ~25 | Actor setup, network time, init lifecycle, txn submission |
| `CapoTestHelper.ts` | ~55 | Snapshot cache ops, Capo lifecycle, actor restore, debug diagnostics |
| `Capo.ts` | ~50 | Delegate connection, charter ops, minting, txn building |
| `StellarContract.ts` | ~30 | Bundle init, script compilation, identity verification |
| `StellarTxnContext.ts` | ~35 | Txn building, submission, cost reporting |
| **Total** | **~195** | |

**Key Finding: UPLC-Stellog Integration via Adapter (ARCH-tqb909cyzr)**

`StellarTxnContext` has an existing `logger` property of type `UplcConsoleLogger`. This is a **specialized logger** for UPLC execution traces with:
- Nested group support (🐣 start, 🥚 end)
- Terminal box-drawing output formatting (dot-matrix receipt aesthetic)
- History tracking for contract validation debugging

**Solution**: `UplcStellogAdapter` bridges UPLC traces to stellog, producing two facilities:

| Facility | Content | Use Case |
|----------|---------|----------|
| `uplc:receipt` | Complete visual receipt as single entry | Human viewing, audit trail |
| `uplc:detail` | Granular per-step entries with group context | Programmatic analysis, debugging |

**Integration**: `StellarTxnContext.logger` returns `UplcStellogAdapter` instead of raw `UplcConsoleLogger`:
```typescript
get logger(): UplcLogger {
    return new UplcStellogAdapter(this.loggerContext);
}
```

This preserves the `UplcLogger` interface while routing output through stellog facilities.

### Deep Interview: Offchain Runtime Integration (ARCH-t9gkyrtbqf)

From `offchainRuntime.ARCHITECTURE.md`, key threading points:

**Read Path** (readOnly: true):
```
findDelegatedDataUtxos({ readOnly: true })
  → getDgDataController(type, { readOnly: true })
    → connectDelegateWithOnchainRDLink(..., { readOnly: true })
      → mustGetDelegate() → init()  // loggerContext needed here
    → controller.newReadDatum()
```

**Write Path** (default):
```
mkTxnCreateRecord()
  → getDgDataController(type)
    → connectDelegateWithOnchainRDLink()
      → mustGetDelegate() → init()        // loggerContext needed
      → asyncCompiledScript()             // log compilation timing
    → txn building                        // log txn lifecycle
```

**Delegate Cache** (`Capo._delegateCache`): Delegates are cached by role+link. Logger context must be available when cache miss triggers `mustGetDelegate()`.

**Threading Points in Capo**:
1. `Capo.init()` — receives loggerContext via setup
2. `connectDelegateWithOnchainRDLink()` — threads to delegate creation
3. `mustGetDelegate()` — creates delegate with loggerContext
4. `mkScriptBundle()` — bundle init can log compilation status

### Phase 1 Findings

**From user requirements (2026-02-05)**:
- Replace console.log with structured logging (not gradual migration)
- Hot-swap wrapper pattern is critical for correct threading
- Consumers MUST NOT cache logger or logger.child() results
- LOG_TEST env var controls focused logging activation
- Default: one log file per test file; LOG_TEST adds per-test files
- UI needs similar threading via CapoDappProvider
- FUTURE: DRED channel support for remote debugging

**From existing code review**:
- `StellarTestHelper` has ~30+ console.log calls to migrate
- `StellarTxnContext` already has `.logger` property (needs alignment)
- `CapoTestHelper.createTestContext` already wraps vitest's describe/it
- `stellog.ts` already has browser.write configuration for styled output
- `CapoDappProvider` exists in `src/ui/` and manages Capo lifecycle

---

## Verbatim Stakeholder Notes

> .test-logs/<process-uut>/testFile.logs.jsonl automatic; .test-logs/<uut>/test-<slug-with-shortUut>.jsonl on request.
>
> decorate it() with extra arg: it("slug-with-shortUut", "does good things", [optional obj], async ({logger}) => {...})
>
> LOG_TEST="slug-with...,slug-with..." pnpm test ...
> without LOG_TEST, a suite with 5 files will generate 5 logs
> with LOG_TEST mentioning 2 slugs, it will generate 7 logs
>
> the testFile.logs.jsonl will have a stub log line pointing to any focused LOG_TEST output.
>
> the optional obj can have {LOGGING="facility:trace"} which is wrapped in {meta:{LOGGING}}.
>
> beforeEach should add {logger} into the test context & test helper.
>
> test helper should thread the logger into the capo.setup using hot-swap wrapper pattern. Capo should provide that hot-swap wrapper context to constructed delegate objects and its utxo helper and any StellarTxnContext objects created.
>
> it EXPECTS all creation of txn-context objects to be done through helpers that thread the loggerContext.
>
> Consumers of the logger MUST NOT cache or close over the logger itself or logger.child() - they MUST access them through the hot-swap wrapper (ok to closure the wrapper) and use e.g. logger.child("facility") at very-short-term scope.

---

## Related Documents

- `./stellog.ts` — Logger factory implementation
- `./stellog.reqts.md` — stellog requirements
- `./stellog.architecture.md` — stellog architecture
- `../testing/emulator/Emulator.ARCHITECTURE.md` — Emulator and test helper architecture
- `../testing/StellarTestHelper.ts` — Base test helper (migration target)
- `../testing/CapoTestHelper.ts` — Capo test helper (migration target)
- `../ui/CapoDappProvider.tsx` — React provider (UI integration target)
