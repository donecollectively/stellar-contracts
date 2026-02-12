# Work Unit: Implement stellog Logger Module

**UUT**: `ppxks5emx5`
**Created**: 2026-02-03
**Status**: Complete

> **Required context**: Load [work-planner.SKILL.md](../../skillz/work-planner/work-planner.SKILL.md) for lifecycle protocol, team composition, and sign-off procedures before operating on this work unit.

## Required Skills

- TypeScript
- Pino logger API (see `pino-background.md`)

## References

| Type | ID | Description |
|------|-----|-------------|
| Architecture | ARCH-byjkn7x9qa | stellog component |
| Architecture | ARCH-a9434aar8a | custom-log-levels concern |
| Architecture | ARCH-p5sh93xgdw | LOGGING-config concern |
| Architecture | ARCH-n4r30rzqb7 | browser-server-compat concern |
| Architecture | ARCH-6w5qcvc5fs | child-logger-facade concern |
| Architecture | ARCH-d4e2e9c77n | stellog factory interface |
| Architecture | ARCH-g0j4jhd5qc | child() facade interface |
| Architecture | ARCH-g5hc3yajkp | stellog CLI interface |
| Requirement | REQT/b93t3qkg5t | Custom Log Levels |
| Requirement | REQT/gw20nphceh | LOGGING Configuration |
| Requirement | REQT/w70e2gdm3g | stellog CLI Command |
| Requirement | REQT/swyee13sxe | Browser Colorizing |
| Requirement | REQT/7jg247f7k4 | stellog Factory |
| Requirement | REQT/vr2cpzr41z | Entry Point |
| Requirement | REQT/6svp7fx0az | Child Logger Facade |

## Objective

Implement the stellog structured JSON logging module for stellar-contracts. This module wraps Pino with custom log levels, facility-based configuration via LOGGING env/localStorage, and platform-appropriate output formatting.

## Implementation Phases

Work through phases sequentially. Each phase builds on the previous.

---

### Phase 1: Foundation

**Goal**: Core logger with custom levels and config parsing.

**Files to create**:
- `src/loggers/stellog.ts`

**Tasks**:

1. **Define custom levels with env-based values**
   ```typescript
   const NODE_ENV = process.env.NODE_ENV || 'development';
   const isDev = NODE_ENV === 'development';
   const isTest = NODE_ENV === 'test';

   const OPS_LEVEL = isDev || isTest ? 28 : 45;
   const USER_ERROR_LEVEL = isDev ? 42 : 32;
   const PROGRESS_LEVEL = 25;

   const customLevels = {
     ops: OPS_LEVEL,
     userError: USER_ERROR_LEVEL,
     progress: PROGRESS_LEVEL,
   };
   ```

2. **Implement platform detection**
   ```typescript
   const isBrowser = typeof window !== 'undefined';

   function getLoggingConfig(): string {
     if (isBrowser) {
       return localStorage.getItem('LOGGING') || '';
     }
     return process.env.LOGGING || '';
   }
   ```

3. **Implement config parser**
   - Parse `facility:level,facility:level,...`
   - Last token is level if valid level name, else assume `info`
   - Support `default` key
   - Throw if level > warn (can't suppress warnings)

4. **Implement `stellog()` factory**
   ```typescript
   export function stellog(name: string, options?: LoggerOptions): StellarLogger {
     const level = lookupLevel(name);  // from parsed LOGGING config
     const logger = pino({
       name,
       level,
       customLevels,
       ...options,
     });
     return decorateLogger(logger, name);
   }
   ```

5. **Export types**
   - `StellarLogger` (Pino logger + custom level methods + decorated child)
   - Re-export `LoggerOptions` from pino

**Verification**:
```typescript
const log = stellog('test');
log.progress('hello');  // outputs JSON with level: 25
log.userError('oops');  // outputs JSON with level: 32 or 42
log.ops('metric');      // outputs JSON with level: 45 or 28
```

---

### Phase 2: Child Loggers

**Goal**: Facility-based routing for child loggers.

**Tasks**:

1. **Implement `decorateLogger()`** that wraps Pino's `.child()`:
   ```typescript
   function decorateLogger(logger: pino.Logger, name: string): StellarLogger {
     const decorated = logger as StellarLogger;
     const originalChild = logger.child.bind(logger);

     decorated.child = function(nameOrProps: string | object, props?: object): StellarLogger {
       if (typeof nameOrProps === 'string') {
         // child('name') or child('name', {props})
         const childName = nameOrProps;
         const level = lookupLevel(childName);
         const bindings = { name: childName, ...props };
         const child = originalChild(bindings);
         child.level = level;
         return decorateLogger(child, childName);
       } else {
         // child({props}) - check for name property
         const bindings = nameOrProps;
         if (bindings.name && typeof bindings.name === 'string') {
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
   ```

**Verification**:
```typescript
// With LOGGING=myFacility:debug
const log = stellog('root');
const child = log.child('myFacility');
child.debug('should appear');  // appears because myFacility:debug

const child2 = log.child({ name: 'myFacility', reqId: 123 });
child2.debug('also appears');  // same lookup

const child3 = log.child({ reqId: 456 });
child3.debug('inherits root level');  // uses root's level
```

---

### Phase 3: Platform Output

**Goal**: Styled output for browser and Node.

**Tasks**:

1. **Browser: Add `browser.write` config**
   ```typescript
   const browserConfig = {
     browser: {
       asObject: true,
       write: {
         fatal: (o) => console.error('%c FATAL ', 'background:red;color:white', o.msg, o),
         error: (o) => console.error('%c ERROR ', 'background:red;color:white', o.msg, o),
         warn: (o) => console.warn('%c WARN ', 'background:yellow;color:black', o.msg, o),
         info: (o) => console.info('%c INFO ', 'background:blue;color:white', o.msg, o),
         debug: (o) => console.debug('%c DEBUG ', 'background:gray;color:white', o.msg, o),
         trace: (o) => console.trace('%c TRACE ', 'background:gray;color:white', o.msg, o),
         // Custom levels
         ops: (o) => console.info('%c OPS ', 'background:purple;color:white', o.msg, o),
         userError: (o) => console.warn('%c USER_ERR ', 'background:orange;color:black', o.msg, o),
         progress: (o) => console.info('%c PROGRESS ', 'background:cyan;color:black', o.msg, o),
       },
     },
   };
   ```

2. **Node: Create `stellog` CLI**
   - Create `src/loggers/cli.ts` (or `bin/stellog.ts`)
   - Pipe stdin through pino-pretty with custom config
   - Add to package.json `bin` field

   ```typescript
   #!/usr/bin/env node
   import pretty from 'pino-pretty';

   const stream = pretty({
     colorize: true,
     customLevels: 'ops:45,userError:32,progress:25',
     customColors: 'ops:magenta,userError:yellow,progress:cyan',
   });

   process.stdin.pipe(stream).pipe(process.stdout);
   ```

**Verification**:
- Browser: Open console, see colored output with level badges
- Node: `node test.js | npx stellog` shows pretty colored output

---

### Phase 4: Integration

**Goal**: Package exports and build config.

**Tasks**:

1. **Update `package.json`**:
   ```json
   {
     "exports": {
       "./logger": {
         "import": "./dist/logger.mjs",
         "types": "./dist/types/src/loggers/stellog.d.ts"
       }
     },
     "bin": {
       "stellog": "./dist/stellog-cli.mjs"
     }
   }
   ```

2. **Update rollup config** to build logger entry point

3. **Verify type declarations** are generated

**Verification**:
```typescript
import { stellog, StellarLogger } from 'stellar-contracts/logger';
const log: StellarLogger = stellog('app');
```

---

## Focus Files

| File | Purpose |
|------|---------|
| `src/loggers/stellog.ts` | Main module - factory, config parsing, child decorator |
| `src/loggers/cli.ts` | CLI binary for pino-pretty |
| `package.json` | exports, bin fields |
| `rollup.config.ts` | Logger entry point build |

## Verification Checklist

- [ ] Phase 1: `stellog('x').progress('test')` outputs correct JSON
- [ ] Phase 1: LOGGING config parsed correctly
- [ ] Phase 1: Throws on level > warn
- [ ] Phase 2: `child('name')` does LOGGING lookup
- [ ] Phase 2: `child({name})` does LOGGING lookup
- [ ] Phase 2: `child({})` inherits parent level
- [ ] Phase 3: Browser shows colored console output
- [ ] Phase 3: `stellog` CLI pretty-prints JSON
- [ ] Phase 4: `import from 'stellar-contracts/logger'` works
- [ ] Phase 4: Types exported correctly

---

## Notes

- Read `pino-background.md` for Pino API reference
- Read `stellog.architecture.md` for full design context
- Custom level values shift by environment (see REQT/b93t3qkg5t)
- Config is parsed at module load (eager, not lazy)

---

## Coder Report

- **Completed**: 2026-02-03
- **Commit**: (pending)

### Summary

Implemented the stellog structured JSON logging module with all four phases complete. The module provides a Pino-based logger with custom levels (progress, userError, ops), facility-based configuration via LOGGING env/localStorage, browser colorized output, and a CLI for pretty-printing JSON logs.

### Clarifications

| Question | Resolution |
|----------|------------|
| Should pino/pino-pretty be added as dependencies? | Yes, added as regular dependencies |
| CLI location? | `src/loggers/stellog-cli.ts` as requested |
| Create tests? | Yes, created 20 tests in `src/loggers/stellog.test.ts` |

#### Tasks Added

- None

### Requirements Addressed

| REQT ID | Label | Status |
|---------|-------|--------|
| REQT/b93t3qkg5t | Custom Log Levels | Implemented |
| REQT/gw20nphceh | LOGGING Configuration | Implemented |
| REQT/w70e2gdm3g | stellog CLI Command | Implemented |
| REQT/swyee13sxe | Browser Colorizing | Implemented |
| REQT/7jg247f7k4 | stellog Factory | Implemented |
| REQT/vr2cpzr41z | Entry Point | Implemented |
| REQT/6svp7fx0az | Child Logger Facade | Implemented |

### Files Changed

- `src/loggers/stellog.ts` — Main module with factory, config parsing, child decorator, browser write config
- `src/loggers/stellog-cli.ts` — CLI binary for pino-pretty
- `src/loggers/stellog.test.ts` — 20 tests covering all functionality
- `package.json` — Added pino/pino-pretty dependencies, exports for ./logger, bin for stellog CLI
- `rollup.config.ts` — Added logger and stellog-cli entry points
- `tsconfig.all.dts.json` — Added logger to type generation

### Architectural Alignment

- ARCH-byjkn7x9qa: stellog component implemented as specified
- ARCH-d4e2e9c77n: Factory interface `stellog(name, options?) → StellarLogger` implemented
- ARCH-g0j4jhd5qc: Child facade with all three forms implemented
- ARCH-g5hc3yajkp: CLI binary for stdin→pretty output implemented

### Blockers & Stubs

| Issue | Location | Suggested Resolution |
|-------|----------|---------------------|
| None | — | — |

### Out-of-Scope Observations

- Pre-existing type errors in `src/helios/dataBridge/BridgeTypeUtils.ts` (unrelated to this work unit)

### Questions Raised

- None
