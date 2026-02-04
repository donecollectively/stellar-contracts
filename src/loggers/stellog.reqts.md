# stellog

## MAINTAINERS MUST READ:

> **🛑 COMPLIANCE TRIGGER: READ THIS FIRST**
>
> This document is strictly managed. Before interpreting or implementing these requirements, you **MUST** read and apply the **Requirements Consumer Skill** at:
>
> `skillz/reqm/reqt-consumer.SKILL.md`
>
> **CRITICAL**: You are **FORBIDDEN** from modifying this file or proceeding with implementation until you have ingested and studied the "Read-Only" constraints and "Escalation Protocol" defined in that skill.
> NOTE: if you've already studied the full REQM skill, you don't need the consumer skill.
>
> **hash.notice.reqt-consumer**: 5dddc026e9370dc8

> NOTE: See [reqm.SKILL.md](../../skillz/reqm/reqm.SKILL.md); When managing requirements, you MUST follow the guidelines and conventions in that document.

## About stellog

stellog is a structured JSON logging module for stellar-contracts. It wraps Pino with custom log levels, environment-based configuration, and browser/server compatibility.

The module provides:
- Three custom log levels (`progress`, `userError`, `ops`) with environment-aware severity values
- Configuration via `LOGGING` env var (Node) or `localStorage` (browser)
- Colored output in both environments (`stellog` CLI for Node, `browser.write()` for browser)

**Essential technologies**: Pino, TypeScript
**Related technologies**: pino-pretty

## Must Read: Special Skills and Know-how

1. **Pino API**: When implementing logger creation or configuration, you MUST read `pino-background.md` for Pino's API patterns.

## Collaborators

- **USED BY stellog**: `pino` (logging engine), `pino-pretty` (Node dev formatting)
- **Expected to USE stellog**: All stellar-contracts modules needing structured logging

## Background

The existing `UplcConsoleLogger` is specialized for UPLC contract execution output. General-purpose logging in stellar-contracts uses scattered `console.log` calls without structure.

stellog provides structured JSON logging with custom levels tuned for development vs production visibility, plus environment-based configuration for per-facility log levels.

## Design Goals

### General Approach

- Thin wrapper around Pino with custom levels baked in
- Factory function for creating loggers (no zones)
- Child loggers via Pino's native `.child()` method
- Platform detection for appropriate output formatting

### Specific Goals

1. **Custom Levels**: Provide `progress`, `userError`, `ops` with environment-based severity values
2. **Environment Config**: Support `LOGGING=facility:level,...` via env var or localStorage
3. **Warn Minimum**: Prevent suppression of warnings (minimum allowable level)
4. **Browser Colorizing**: Use Pino's `browser.write()` for styled console output
5. **Node Colorizing**: Use pino-pretty transport in development
6. **TypeScript**: Full type safety with proper exports

## The Development Plan

Implementation proceeds in four phases, each building on the previous. Complete each phase before starting the next.

### Phase 1: Foundation (REQT-1.0, REQT-2.0, REQT-5.0)

Build the core logger with custom levels and configuration parsing.

**Deliverables**:
1. `stellog(name, options?)` factory function returning Pino logger
2. Custom levels (`progress`, `userError`, `ops`) with env-based values
3. LOGGING config parsing from env/localStorage
4. Level lookup by facility name
5. Warn-minimum enforcement

**Verification**: `stellog('test').progress('hello')` outputs JSON with correct level value.

### Phase 2: Child Loggers (REQT-7.0)

Add facility-based routing for child loggers.

**Deliverables**:
1. Decorated `.child()` method on StellarLogger
2. String-name form: `child('name')` does LOGGING lookup
3. Object-with-name form: `child({name})` does LOGGING lookup
4. Object-without-name form: `child({})` inherits parent level

**Verification**: `logger.child('debug:facility').info('test')` respects `LOGGING=debug:facility:debug`.

### Phase 3: Platform Output (REQT-3.0, REQT-4.0)

Add styled output for both platforms.

**Deliverables**:
1. Browser: `browser.write` config with CSS styling per level
2. Node: `stellog` CLI binary that pipes through pino-pretty
3. Custom level colors in pino-pretty config

**Verification**: Browser console shows colored output; `node app.js | stellog` shows pretty output.

### Phase 4: Integration (REQT-6.0)

Configure build and exports.

**Deliverables**:
1. Add `stellar-contracts/logger` export to package.json
2. Rollup config for logger entry point
3. Type declarations

**Verification**: `import { stellog } from 'stellar-contracts/logger'` works.

---

# Requirements

## 1. Custom Log Levels

### REQT-1.0/b93t3qkg5t: NEXT: Custom Log Levels [Phase 1]
#### Purpose: Establishes the custom log level system. Applied when creating loggers or understanding level hierarchy.

 - **REQT-1.0.1**/zv8yz6n2yg: NEXT: MUST define `progress` level at value 25 (fixed across environments)
 - **REQT-1.0.2**/9cyvmdarrk: NEXT: MUST define `userError` level at value 32 (production/test) or 42 (development)
 - **REQT-1.0.3**/gzgq10szt6: NEXT: MUST define `ops` level at value 45 (production) or 28 (development/test)
 - **REQT-1.0.4**/a1frv7pye2: NEXT: Environment detection MUST use `NODE_ENV` to determine level values

## 2. Configuration

### REQT-2.0/gw20nphceh: NEXT: LOGGING Configuration [Phase 1]
#### Purpose: Governs how log levels are configured per-facility. Applied when setting up logging or debugging level issues.

 - **REQT-2.0.1**/f743wmrjft: NEXT: MUST read configuration from `process.env.LOGGING` (Node) or `localStorage.getItem('LOGGING')` (browser)
 - **REQT-2.0.2**/60er7efmvt: NEXT: MUST parse format `facility:level,facility:level,...` with colons allowed in facility names
 - **REQT-2.0.3**/x2v7kys2z8: NEXT: MUST support `default` key for fallback level
 - **REQT-2.0.4**/xn5wtc42pe: NEXT: MUST NOT allow suppression below `warn` level (throw error if attempted)

## 3. Node Pretty-Print

### REQT-3.0/w70e2gdm3g: NEXT: stellog CLI Command [Phase 3]
#### Purpose: Provides human-readable Node output during development. Applied when piping log output for dev visibility.

 - **REQT-3.0.1**/knte8w7f4k: NEXT: MUST provide a `stellog` CLI command that pipes stdin through pino-pretty
 - **REQT-3.0.2**/ysq61zx5h8: NEXT: MUST include packaged pino-pretty recipe with custom level colors for `progress`, `userError`, `ops`

## 4. Browser Support

### REQT-4.0/swyee13sxe: NEXT: Browser Colorizing [Phase 3]
#### Purpose: Ensures readable, styled output in browser console. Applied when implementing browser write functions.

 - **REQT-4.0.1**/az79z9phf4: NEXT: MUST use Pino's `browser.write` configuration for custom formatting
 - **REQT-4.0.2**/1f16cw74nn: NEXT: MUST provide distinct styling per log level using CSS `%c` formatting

## 5. Factory Function

### REQT-5.0/7jg247f7k4: NEXT: stellog Factory [Phase 1]
#### Purpose: Defines the main entry point for creating loggers. Applied when initializing logging in a module.

 - **REQT-5.0.1**/w2zasbggrx: NEXT: MUST export `stellog(name: string, options?: PinoOptions): Logger` as factory function
 - **REQT-5.0.2**/pnsym9rhzt: NEXT: Options MUST be Pino options pass-through (no custom options wrapper)
 - **REQT-5.0.3**/jtag50wfxe: NEXT: MUST re-export Pino's options type as `PinoOptions`
 - **REQT-5.0.4**/8xw3djzw2q: NEXT: MUST export `StellarLogger` type for the decorated logger with custom levels

## 6. Package Structure

### REQT-6.0/vr2cpzr41z: NEXT: Entry Point [Phase 4]
#### Purpose: Defines how consumers import the logger. Applied when configuring build/exports.

 - **REQT-6.0.1**/ym9mc8s54y: NEXT: MUST be importable as `stellar-contracts/logger`

## 7. Child Loggers

### REQT-7.0/6svp7fx0az: NEXT: Child Logger Facade [Phase 2]
#### Purpose: Defines how child loggers are created with facility-based level routing. Applied when creating scoped loggers.

 - **REQT-7.0.1**/jh8v254e1e: NEXT: MUST support `child(name: string, props?: object)` form — creates child with LOGGING level lookup for `name`
 - **REQT-7.0.2**/xj4g9treze: NEXT: MUST support `child(props: object)` form — if `props.name` exists, does LOGGING level lookup for that name
 - **REQT-7.0.3**/bmjpcth17t: NEXT: When `child({...})` has no `name`, MUST inherit parent's level (no LOGGING lookup)

---

## Files

1. `./stellog.ts` (to be created)
2. `./stellog.architecture.md`
3. `./stellog-architecture.jsonl`
4. `./pino-background.md`

---

## Implementation Log

*No implementation yet*

---

## Release Management Plan

### v1 (Planned)
- **Goal**: Core logger with full feature set
- **Work Unit**: `stellog.ppxks5emx5.workUnit.md`
- **Phases**:
  - Phase 1: Foundation (REQT-1.0, REQT-2.0, REQT-5.0)
  - Phase 2: Child Loggers (REQT-7.0)
  - Phase 3: Platform Output (REQT-3.0, REQT-4.0)
  - Phase 4: Integration (REQT-6.0)
