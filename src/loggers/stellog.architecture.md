# stellog - Architecture

*Structured JSON logging component for stellar-contracts*

## Interview Status

- **Phase**: Complete
- **Checkpoint**: architect.interview: checkpoint ok

---

## Components and Concerns

| ARCH-UUT | Name | Location | Summary |
|----------|------|----------|---------|
| ARCH-byjkn7x9qa | stellog | local | Structured JSON logging with custom levels and facility routing |

### Concerns Summary

| Concern | Type | Owner | Dependents |
|---------|------|-------|------------|
| custom-log-levels | artifact | stellog | all consumers |
| LOGGING-config | resource | stellog | all consumers |
| browser-server-compat | artifact | stellog | — |
| child-logger-facade | artifact | stellog | all consumers |

### Components

#### ARCH-byjkn7x9qa: stellog

**Location**: local (`stellar-contracts/logger`)

**Activities**:
- Create loggers with custom levels (`progress`, `userError`, `ops`)
- Read LOGGING config from `process.env` (Node) or `localStorage` (browser) at module load
- Parse facility:level configuration with warn-minimum enforcement
- Route child logger levels by facility name lookup
- Output JSON to stdout (Node) or styled console (browser)

**Concerns**:
- **Owns**: custom-log-levels, LOGGING-config, child-logger-facade, browser-server-compat
- **Depends on**: Pino (logging engine), pino-pretty (Node CLI formatting)

---

## Interfaces

| ARCH-UUT | Interface | Mechanism | Direction | Payload |
|----------|-----------|-----------|-----------|---------|
| ARCH-d4e2e9c77n | stellog factory | function call | consumer → stellog | `(name, options?) → StellarLogger` |
| ARCH-g0j4jhd5qc | child() facade | method call | consumer → logger | `(name, props?) or (props) → StellarLogger` |
| ARCH-g5hc3yajkp | stellog CLI | stdin pipe | shell → CLI | JSON lines → pretty output |

### ARCH-d4e2e9c77n: stellog Factory

**Mechanism**: Exported function
**Direction**: Consumer initiates
**Payload**:
- Input: `name: string`, `options?: PinoOptions`
- Output: `StellarLogger` with custom levels and decorated `.child()`
**Errors**: Throws if LOGGING config attempts to suppress below `warn`

### ARCH-g0j4jhd5qc: child() Facade

**Mechanism**: Method on StellarLogger
**Direction**: Consumer initiates
**Payload**:
- `child('name')` → LOGGING lookup for 'name', returns StellarLogger
- `child('name', { ...props })` → LOGGING lookup + bindings
- `child({ name: 'x', ...props })` → LOGGING lookup for 'x' + bindings
- `child({ ...props })` → inherits parent level, adds bindings
**Errors**: None

### ARCH-g5hc3yajkp: stellog CLI

**Mechanism**: CLI binary (`stellog`)
**Direction**: Shell pipes JSON stdin
**Payload**: NDJSON lines → human-readable colored output
**Errors**: Passes through malformed lines

---

## Data Flow

### Workflow: Logger Creation

```
[Consumer] --stellog('name')--> [stellog module]
                                      |
                                      v
                              [Read LOGGING config]
                              (cached at module load)
                                      |
                                      v
                              [Lookup level for 'name']
                              (fallback to 'default', then 'warn')
                                      |
                                      v
                              [Create Pino logger]
                              (custom levels, browser.write if browser)
                                      |
                                      v
                              [Decorate .child() method]
                                      |
                                      v
                              [Return StellarLogger]
```

### Workflow: Child Logger Creation

```
[logger.child('facility')] --> [Check first arg type]
                                      |
              +-----------------------+-----------------------+
              |                       |                       |
        [string]              [object w/ name]         [object w/o name]
              |                       |                       |
              v                       v                       v
       [LOGGING lookup]        [LOGGING lookup]        [Inherit parent level]
              |                       |                       |
              +-----------------------+-----------------------+
                                      |
                                      v
                              [Pino .child(bindings)]
                                      |
                                      v
                              [Return decorated child]
```

---

## Collaboration Summary

**Uses**:
- `pino` — Core logging engine
- `pino-pretty` — CLI pretty-printing (dev dependency)

**Used by**:
- All stellar-contracts modules requiring structured logging
- Consumer applications importing `stellar-contracts/logger`

---

## Custom Log Levels

Three custom levels beyond Pino defaults. Numeric values control visibility at different log level thresholds.

**Key insight**: When you set a log level (e.g., `warn`=40), you see everything with a value **≥ that level**.

| Level | Prod | Dev | Test | Purpose |
|-------|------|-----|------|---------|
| `ops` | 45 | 28 | 28 | Operational metrics |
| `userError` | 32 | 42 | 32 | API client mistakes |
| `progress` | 25 | 25 | 25 | Execution flow visibility |

**Production at `warn` (40)**:
```
Visible: fatal(60), error(50), ops(45), warn(40)
Hidden:  userError(32), info(30), progress(25), debug(20)
```
→ `ops` metrics visible for monitoring; user errors require `info` level

**Development at `warn` (40)**:
```
Visible: fatal(60), error(50), userError(42), warn(40)
Hidden:  info(30), ops(28), progress(25), debug(20)
```
→ `userError` floats up to catch API mistakes early; `ops` sinks to reduce noise

---

## LOGGING Configuration

Read from `process.env.LOGGING` (Node) or `localStorage.getItem('LOGGING')` (browser) at module load.

**Format**: `facility:level,facility:level,...`

```
LOGGING=default:info,myFacility:debug,log:service:progress
```

- `default` key sets fallback level
- Colons allowed in facility names (last token is level if valid)
- Cannot suppress below `warn` (throws error)
- Parsed once at module load (eager)

---

## Type Exports

```typescript
// Factory function
export function stellog(name: string, options?: PinoOptions): StellarLogger;

// Types
export type { PinoOptions };  // re-exported from pino
export type StellarLogger;    // Pino logger + progress/userError/ops + decorated child()
```

---

## Open Questions

*All resolved*

---

## Files

- `stellog.ts` — Main module
- `stellog.architecture.md` — This file
- `stellog-architecture.jsonl` — Structured records
- `stellog.reqts.md` — Requirements
- `pino-background.md` — Pino research reference
