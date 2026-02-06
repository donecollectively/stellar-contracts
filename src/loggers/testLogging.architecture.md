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

## Collaborators

### Software modules USED BY Test Logging:
- `stellog` — Logger factory with custom levels and facility-based configuration
- `pino` — Underlying logging engine
- `vitest` — Test framework hooks (beforeEach, afterEach, test context)

### Software modules expected to USE Test Logging:

**Test Infrastructure** (first-class clients):
- `StellarTestHelper` — NEEDS ARCH-28b90zs38k (TestLoggerContext) for hot-swap wrapper injection
- `CapoTestHelper` — NEEDS ARCH-gy5126n88c (DecoratedIt) for slug-based test logging
- `DefaultCapoTestHelper` — Inherits from CapoTestHelper

**Contract Infrastructure** (first-class clients):
- `Capo` — NEEDS ARCH-28b90zs38k (TestLoggerContext) via setup for threading
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
| ARCH-28b90zs38k | TestLoggerContext | local | Hot-swap wrapper providing scoped logger access |
| ARCH-e81gt3ks9t | TestFileLogger | local | Automatic per-file log aggregation |
| ARCH-4f3zh8z32k | FocusedTestLogger | local | On-demand per-test detailed logging |
| ARCH-gy5126n88c | DecoratedIt | local | Extended `it()` with slug and logger injection |
| ARCH-1b6370g29p | LoggerThreading | internal | Pattern for threading logger through object creation |
| ARCH-ex4h6pc08v | UILoggerContext | local | React context-based logger threading for UI |
| ARCH-8w01jpfvsw | BrowserLogPipeline | local | Browser console output with styling |
| ARCH-dy3569b0bd | DREDLogTransport | local/future | Remote log streaming via DRED channel |

### Concerns Summary

| Concern | Type | Owner | Dependents |
|---------|------|-------|------------|
| hot-swap-wrapper | pattern | TestLoggerContext | all test consumers |
| test-file-logs | artifact | TestFileLogger | test suites |
| focused-logs | artifact | FocusedTestLogger | LOG_TEST users |
| logger-injection | pattern | DecoratedIt | test functions |
| context-threading | pattern | LoggerThreading | Capo, delegates, txn-context |
| ui-logger-context | pattern | UILoggerContext | CapoDappProvider, React components |
| browser-output | artifact | BrowserLogPipeline | browser applications |
| remote-log-stream | resource | DREDLogTransport | future: remote debugging |

---

## Components

### ARCH-28b90zs38k: TestLoggerContext

**Location**: local (`src/loggers/testLoggerContext.ts`)

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
interface TestLoggerContext {
    /** Get current logger - MUST NOT cache result */
    get logger(): StellarLogger;
    /** Swap underlying logger (used at test boundaries) */
    setLogger(logger: StellarLogger): void;
}

// Implementation
class TestLoggerContext {
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

**Critical Constraints** (per REQM conventions):
- Consumers MUST NOT cache `loggerContext.logger` or `logger.child()` results
- Consumers MAY close over the `TestLoggerContext` wrapper itself
- Consumers MUST access `loggerContext.logger` at point of use
- Consumers MUST call `logger.child("facility")` at very-short-term scope

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
- **Depends on**: stellog, TestLoggerContext

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
- **Depends on**: stellog, TestLoggerContext

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
- **Depends on**: TestLoggerContext, TestFileLogger, FocusedTestLogger, vitest

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
- Thread TestLoggerContext through object creation hierarchy
- Ensure Capo.setup receives logger context
- Ensure delegates, UtxoHelper, StellarTxnContext receive context

**Concerns**:
- **Owns**: context-threading pattern
- **Depends on**: TestLoggerContext

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

### ARCH-ex4h6pc08v: UILoggerContext

**Location**: local (`src/ui/UILoggerContext.ts`)

**Activities**:
- Provide React context for logger threading in UI applications
- Integrate with CapoDappProvider
- Support browser-appropriate output (styled console)
- Future: Support DRED channel transport

**Concerns**:
- **Owns**: ui-logger-context pattern
- **Depends on**: stellog, React, BrowserLogPipeline

**API Shape**:
```typescript
// React context
const LoggerContext = React.createContext<TestLoggerContext | null>(null);

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
| ARCH-313qkxkwn0 | setup threading | constructor arg | helper → Capo | TestLoggerContext |
| ARCH-b58dar6knq | React context | context provider | LoggerProvider → components | TestLoggerContext |
| ARCH-cky1s5gwrg | Capo threading | setup property | Capo → delegates/txn | TestLoggerContext |

### ARCH-ccnwphczf1: beforeEach Injection

**Mechanism**: vitest beforeEach hook
**Direction**: Framework → test function
**Payload**: `{logger: StellarLogger}` added to test context and helper
**Errors**: None (logger always available, may be no-op in non-logged tests)

### ARCH-4atcrs8g5v: LOG_TEST Activation

**Mechanism**: Environment variable
**Direction**: Shell → test suite
**Payload**: `LOG_TEST="slug1,slug2,..."` - comma-separated test slugs
**Errors**: Unknown slugs silently ignored (warning logged to file logger)

### ARCH-313qkxkwn0: Setup Threading

**Mechanism**: Constructor/setup argument
**Direction**: Test helper → Capo → delegates → txn-context
**Payload**: `TestLoggerContext` wrapper instance
**Errors**: Missing context defaults to console-based fallback (with warning)

### ARCH-b58dar6knq: React Context Threading

**Mechanism**: React context provider
**Direction**: LoggerProvider → child components → Capo
**Payload**: `TestLoggerContext` via `useLogger()` hook
**Errors**: Hook outside provider throws; missing context in Capo uses fallback

### ARCH-cky1s5gwrg: Capo Threading

**Mechanism**: `setup.loggerContext` property
**Direction**: Capo → delegates, UtxoHelper, StellarTxnContext
**Payload**: `TestLoggerContext` wrapper
**Errors**: Missing context uses console fallback; logged once per Capo instance

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
    └─→ [Create TestLoggerContext with chosen logger]
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
    └─→ [Create TestLoggerContext wrapper]
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

## Collaboration Stubs

### ARCH-hp3vt9x81q: Emulator/Test Helper Integration (Stub)

**Target Architecture**: `../testing/emulator/Emulator.ARCHITECTURE.md`

**Collaboration Pattern**: This architecture provides `TestLoggerContext` that emulator/test-helper components NEED for structured logging.

**Emulator/Test Helper Architecture NEEDS from This Architecture**:

| Component | NEEDS |
|-----------|-------|
| `StellarTestHelper` | ARCH-28b90zs38k (TestLoggerContext) |
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

**Target Architecture**: `../ui/` (no formal architecture yet)

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

### Phase 1: Foundation
1. Implement TestLoggerContext hot-swap wrapper
2. Implement TestFileLogger for automatic file logging
3. Implement FocusedTestLogger for LOG_TEST support
4. Wire beforeEach injection in test helpers

### Phase 2: Console.log Replacement
1. Identify all console.log calls in StellarTestHelper (~30+)
2. Replace with `this.loggerContext.logger.info(...)` or appropriate level
3. Add structured context (actor name, txn details, network state)
4. Migrate CapoTestHelper console.log calls

### Phase 3: Capo Threading
1. Add `loggerContext` to `SetupInfo` type
2. Modify `Capo.createWith()` to accept and store loggerContext
3. Thread through delegate creation in `initDelegateRoles()`
4. Thread through UtxoHelper in `initSetup()`
5. Thread through StellarTxnContext creation

### Phase 4: DecoratedIt and Focused Logging
1. Implement DecoratedIt with slug support
2. Implement LOG_TEST env var parsing
3. Update `createTestContext()` to use DecoratedIt
4. Add per-test LOGGING config support

### Phase 5: UI Integration
1. Implement UILoggerContext and LoggerProvider
2. Integrate LoggerProvider into CapoDappProvider
3. Implement useLogger() hook
4. Document React component logging patterns

### Phase 6 (FUTURE): DRED Transport
1. Design DRED channel protocol for logs
2. Implement DREDLogTransport
3. Add transport configuration to LoggerProvider

---

## Open Questions

- [ ] Should focused logs include full traces or just the test-specific logs?
- [ ] How to handle async operations that outlive the test (e.g., background processes)?
- [ ] Should failed tests automatically get focused logging on retry?
- [ ] What structured context should be standard for txn logging? (tcx.txnName, actor, inputs/outputs?)
- [ ] Should UILoggerContext support dynamic LOGGING config changes (e.g., from devtools)?

---

## Discovery Notes

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
