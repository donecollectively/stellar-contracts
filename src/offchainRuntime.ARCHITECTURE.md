# Offchain Runtime — Architecture

*The TypeScript runtime layer that reads on-chain data, builds and submits transactions, and manages the delegate lifecycle for Stellar Contracts dApps.*

## Interview Status

- **Phase**: Partial (originated from read/write optimization analysis; expanded for template compliance)
- **Checkpoint**: not yet reached
- **Structured data**: `src/offchainRuntime-architecture.jsonl`

---

## Concerns Summary

| Concern | Type | Owner | Dependents |
|---------|------|-------|------------|
| Delegate cache | resource | Capo | Delegate System, UI Layer |
| Read/write path optimization | resource | Capo + Script Bundle System | all consumers of on-chain data |
| Compilation cost | resource | Script Bundle System | Capo, Delegate System |
| Precompiled script details | artifact | Build Tooling (external) | Script Bundle System, Capo |
| Lifecycle hooks | artifact | Delegate System (DelegatedDataContract) | Application controllers |
| Transaction state typing | resource | StellarTxnContext | Capo, Delegate System, Network Clients |

---

## Interfaces

Internal interactions between offchain runtime components. See `src/offchainRuntime-architecture.jsonl` for structured records.

| ARCH-UUT | Interface | Mechanism | Direction |
|----------|-----------|-----------|-----------|
| ARCH-4ffrc448e3 | Capo → Delegate System | internal async function | Capo initiates |
| ARCH-22mrr7hfbv | Delegate System → Data Bridge | internal function | Delegate initiates |
| ARCH-k5n2gn679z | StellarContract → Script Bundle | internal async function | StellarContract initiates |
| ARCH-n914egxrrf | Capo → StellarTxnContext | internal function | Capo initiates |
| ARCH-yngkfn783b | StellarTxnContext → Network Clients | internal function | StellarTxnContext initiates |

Cross-subsystem interfaces are documented in `stellar-contracts-architecture.jsonl`.

---

## Data Flow

Key workflows are documented inline (Read Path, Write Path below) and in structured form in `src/offchainRuntime-architecture.jsonl`:

| ARCH-UUT | Workflow | Summary |
|----------|----------|---------|
| ARCH-yym47r9csh | Read Path (Data Query) | readOnly: true, no compilation, bridge casts only |
| ARCH-1h501psrnt | Write Path (Transaction Building) | full compilation, delegate authority, submission |
| ARCH-c90jkf1z4j | Transaction Chaining (forward) | addlTxns with TxChainBuilder virtual UTxOs |
| ARCH-w0n4p5naav | Conditional Facade | evaluative — transactions conditionally added |
| ARCH-dp0606pj9t | Delegate Authority Inclusion | spend delegate UUT as input/output for authority proof |
| ARCH-ddtxts6bx0 | Preparatory Facade | inverse chaining — prep txns before target |

---

## Collaboration Summary

**Uses**: Build Tooling (precompiled script details, generated bridges), On-chain Policy Layer (UPLC scripts, activity/redeemer types), Blockfrost API (UTxO queries via UtxoIndex)

**Used by**: UI Layer (data queries, transaction building), Testing Infrastructure (via emulator network swap), Application-specific controllers (extend DelegatedDataContract)

---

> **Git Reference**: Based on commit `51e52f05` (perf: avoid expensive load of onchain scripts during app start)
> Use `git diff 51e52f05..HEAD -- ...files` to see changes since this doc was written.

## Files Involved in Read/Write Path Optimization

| File | Role in Optimization |
|------|---------------------|
| `src/Capo.ts` | `connectDelegateWithOnchainRDLink()` - `readOnly` option skips compilation; `connectMintingScript()` - skips compilation when precompiled |
| `src/CapoTypes.ts` | `FindableViaCharterData` type includes `readOnly?: boolean` |
| `src/StellarContract.ts` | `asyncCompiledScript()`, `mintingPolicyHash` getter uses `bundle.scriptHash` |
| `src/helios/scriptBundling/HeliosScriptBundle.ts` | `scriptHash` getter resolves from `configuredScriptDetails` before falling back to compilation |
| `src/minting/CapoMinter.hlb.ts` | Sets `configuredScriptDetails` from `precompiledScriptDetails.minter` |
| `src/helios/scriptBundling/CapoHeliosBundle.ts` | Sets `configuredScriptDetails` from `precompiledScriptDetails.capo` |
| `src/delegation/ContractBasedDelegate.ts` | `mkScriptBundle()` creates delegate bundles |
| `src/delegation/DelegatedDataContract.ts` | Data controller base class |

## Overview

The offchain runtime is the TypeScript layer that interacts with Cardano smart contracts. It handles:
- Reading on-chain data (delegated data, charter data, UTxOs)
- Building and submitting transactions
- Managing contract delegates and their lifecycle
- Bridging between TypeScript types and on-chain UPLC data

## Core Components

### Capo (src/Capo.ts)

The "leader" contract that orchestrates the entire contract suite. Key responsibilities:
- Maintains the charter (configuration) for all delegates
- Provides methods for reading delegated data
- Coordinates transaction building across delegates
- Caches delegate instances for reuse

### StellarContract (src/StellarContract.ts)

Base class for all contracts. Provides:
- Script bundle management (`getBundle`, `mkScriptBundle`)
- Compiled script access (`asyncCompiledScript`, `compiledScript`)
- Validator hash computation (`validatorHash`)
- Data bridge access (`onchain`, `offchain`, `reader`)

### HeliosScriptBundle (src/helios/scriptBundling/HeliosScriptBundle.ts)

Manages Helios script compilation and caching:
- `loadProgram()` - Parses and loads the Helios program (expensive)
- `compiledScript()` - Compiles to UPLC (expensive)
- `scriptHash` - Returns hash, using precompiled value when available

### Data Bridges (*.bridge.ts files)

Pre-generated TypeScript classes that convert between:
- On-chain UPLC data structures
- Off-chain TypeScript types

Key insight: **Data bridges don't require compiled scripts** - they use pre-generated cast functions.

## Delegate System

### Delegate Roles

Delegates are modular contracts that handle specific responsibilities:
- **mintDelegate**: Controls token minting
- **spendDelegate**: Controls UTxO spending
- **govAuthority**: Controls governance actions
- **Named delegates**: Application-specific (e.g., "settings", custom data types)

### Delegate Connection

```typescript
// src/Capo.ts:1730
async connectDelegateWithOnchainRDLink<RN, DT>(
    role: RN,
    delegateLink: RelativeDelegateLinkLike,
    options?: { readOnly?: boolean }
): Promise<DT>
```

This method:
1. Checks the delegate cache - returns immediately if cached
2. Creates delegate instance via `mustGetDelegate()`
3. Optionally compiles script and checks for upgrades (when `readOnly: false`)
4. Caches the delegate for future use

### Delegate Cache

```typescript
// src/Capo.ts:1720-1727
_delegateCache: {
    [roleName: string]: {
        [delegateLinkKey: string]: {
            delegate: StellarDelegate;
        };
    };
}
```

Cache key is derived from the on-chain delegate link configuration.

## Delegate Initialization: Cheap vs Expensive Operations

### What init() Does (Cheap)

When a delegate is created via `mustGetDelegate()` → `createWith()` → `init()`:

```
init(args)
  ├─> mkScriptBundle()                    // Creates bundle instance
  │     └─> bundleClass.create()
  │           └─> bundle.init()           // Sets up configuredScriptDetails
  ├─> Sets configuredParams from config
  └─> Logs "bundle loaded"                // No compilation yet
```

The `init()` method is cheap because it:
- Creates the bundle instance
- Sets up `configuredScriptDetails` from precompiled data (if available)
- Does NOT compile the Helios script

Note: There's a disabled eager-compile path at `src/StellarContract.ts:1007` (`if (false && ...)`) that would compile during init, but it's turned off.

### What Happens After init() (Expensive)

The expensive operations occur in `connectDelegateWithOnchainRDLink()` AFTER `mustGetDelegate()` returns:

```typescript
// src/Capo.ts - connectDelegateWithOnchainRDLink()
const delegate = await this.mustGetDelegate(...);  // init() called here (cheap)

// AFTER init() returns - this is where expensive work happens:
if (!options?.readOnly) {
    if (delegate.usesContractScript) {
        await delegate.asyncCompiledScript();      // EXPENSIVE: compiles Helios
    }
    // Upgrade detection accesses delegateValidatorHash
    // which may trigger scriptHash getter → compilation fallback
}
```

### Why readOnly Works

The `readOnly` option skips the post-init expensive operations:
- `asyncCompiledScript()` - Helios compilation (100-500ms per script)
- Upgrade detection - requires `delegateValidatorHash` which needs `scriptHash`

The delegate instance from `init()` is still fully usable for reading data because:
- The data bridge (`newReadDatum`) uses pre-generated cast functions
- Cast functions are generated at build time, not runtime
- No compiled script needed to convert UPLC data to TypeScript types

### Minter Connection (connectMintingScript)

The minter is connected during Capo init. Compilation is deferred when precompiled config is available:

```typescript
// src/Capo.ts - connectMintingScript()
const { mph: expectedMph } = bundle.configuredParams;  // From precompiled bundle

if (!expectedMph) {
    // New deployment: must compile to get MPH
    await minter.asyncCompiledScript();
}
// Existing deployment: trust precompiled config, skip compilation
// mintingPolicyHash getter uses configuredScriptDetails.scriptHash
```

The `mintingPolicyHash` getter (src/StellarContract.ts:1165) uses `bundle.scriptHash`, which resolves from `configuredScriptDetails.scriptHash` for precompiled bundles.

## Read Path vs Write Path

### Read Path (readOnly: true)

**ARCH-UUT**: ARCH-yym47r9csh

Querying on-chain data without building transactions. Uses `readOnly: true` to skip compilation.

1. **Application/UI** calls `capo.findDelegatedDataUtxos({ type, readOnly: true })`
2. **Capo** calls `findCapoUtxos()` — fetches UTxOs via one of:
   - Prefetched `capoUtxos` parameter (if caller passes known-current set — avoids deserialization cost)
   - Network interface (hot-swap envelope → emulator, CachedUtxoIndex, or Blockfrost)
3. **Capo** calls `findCharterData()` — parses charter datum from charter UTxO
4. **Capo** iterates matching UTxOs, calling `getDgDataController(type, { readOnly: true })`
5. **Capo** → **Delegate System**: `connectDelegateWithOnchainRDLink(..., { readOnly: true })`
   - `mustGetDelegate()` → `init()` — creates bundle, sets `configuredScriptDetails` (cheap)
   - Skips `asyncCompiledScript()` — no compilation
   - Skips upgrade detection — no `delegateValidatorHash` needed
6. **Delegate System** → **Data Bridge**: `controller.newReadDatum(datum.data)`
   - Uses pre-generated cast functions (no compilation needed)
   - Returns typed TypeScript object

```
[App/UI] ---(query)---> [Capo] ---(findUtxos)---> [Network/Cache]
                           |
                           +---(readOnly connect)---> [Delegate]
                           |                              |
                           +---(cast datum)----------> [DataBridge]
                           |                              |
                           <------(typed TS object)-------+
```

**Performance**: Fast — no script compilation. Data bridges use build-time-generated casts.

### Write Path (readOnly: false, default)

**ARCH-UUT**: ARCH-1h501psrnt

Building and submitting a transaction to create, update, or delete data.

**Transaction method naming convention**:
- `mkTxn*` methods — primary entry points; construct a tcx if none provided (`initialTcx` parameter)
- `txn*` methods — partial helpers; require a tcx, MUST NOT create a new one

1. **Application** calls a `mkTxn*` method (e.g., `mkTxnCreateRecord()`)
2. **Capo/DelegatedDataContract** creates `StellarTxnContext` via `mkTcx()` (unless `initialTcx` provided)
3. **Capo** → **Delegate System**: `getDgDataController(type)` — `readOnly: false` (default)
4. **Delegate System**: `connectDelegateWithOnchainRDLink()` — full connection:
   - `mustGetDelegate()` → `init()` — creates bundle (cheap)
   - `asyncCompiledScript()` — **compiles Helios to UPLC** (expensive, 100-500ms)
   - Upgrade detection — compares `delegateValidatorHash` against on-chain
5. **Delegate** builds transaction via `StellarTxnContext` — adds inputs, outputs, redeemers
   - `txn*` partial helpers may be called to compose sub-operations
6. **StellarTxnContext** → **Network Clients**: `TxBatcher` coordinates signing and submission
7. **BatchSubmitController** manages per-batch state machine → wallet signs → network submission

```
[App] ---(mkTxn* method)---> [Capo/DataController] ---(connect)---> [Delegate]
                                    |                                     |
                                    +----(compile)---------------------> [ScriptBundle]
                                    |                                     |
                                    +----(build tx via txn* helpers)---> [StellarTxnContext]
                                    |                                          |
                                    +----(submit)----------------------------> [NetworkClients]
                                                                                |
                                                                          [Cardano Network]
```

**Performance**: Compilation required for validator hashes and upgrade detection.

### Multi-Transaction Groups

Three patterns for coordinating multiple transactions that must be submitted together. All three share a critical mechanism: **later transactions use an `mkTcx` callback** executed in a context where the network has been swapped with a TxChainBuilder facade exposing virtual UTxOs — outputs from prior transactions that don't exist on-chain yet but will exist once those earlier transactions are submitted. The callback must be deferred so the facade has the generated UTxOs available before downstream queries begin.

#### ARCH-c90jkf1z4j: Transaction Chaining (forward)

The primary transaction generates a chain of follow-on transactions.

```
[mkTxn main] ---(addlTxns)---> [mkTcx callback → txn A] ---> [mkTcx callback → txn B]
                                       ↑                              ↑
                                TxChainBuilder facade:         sees virtual UTxOs
                                sees main tx outputs           from main + A
```

**Use case**: Bootstrap — charter minting followed by delegate installation and ref-script creation.

#### ARCH-w0n4p5naav: Conditional Facade (evaluative)

Don't know upfront if transactions are needed. Create a transaction facade, evaluate, conditionally add transactions.

```
[create facade] ---(evaluate situation)---> [conditionally add txns to facade]
                                                      ↑
                                               mkTcx callbacks with
                                               TxChainBuilder facade
```

**Use case**: Operations that may or may not require on-chain action depending on current state.

#### ARCH-ddtxts6bx0: Preparatory Facade (inverse chaining)

Know the main transaction needs prep work. Start with a facade, add preparatory transactions, then add the target.

```
[create facade] ---(evaluate for preps)---> [add prep tx A] ---> [add prep tx B] ---> [add target tx]
                                                                                             ↑
                                                                                    sees virtual UTxOs
                                                                                    from preps A + B
```

**Use case**: A transaction that requires UTxOs to be created or reorganized before it can execute.

### Delegate Authority Inclusion

**ARCH-UUT**: ARCH-dp0606pj9t

Internal workflow within a transaction being built. When a specific delegate's enforcement is needed, the transaction must prove authority by spending and returning the delegate's UUT.

1. **Transaction builder** determines a delegate's authority is needed
2. **Capo/Delegate System** locates the delegate's UUT at its script address
3. **StellarTxnContext** adds the UUT as a transaction input (spending it)
4. **StellarTxnContext** adds an output returning the UUT to its home script address
5. **StellarTxnContext type `S`** is refined to indicate the delegate's authority is present — downstream `txn*` methods can require this in their type signatures

```
[locate UUT at delegate addr] ---(spend UUT)---> [add as tx input]
                                                       |
                                                  [add output: UUT back to home addr]
                                                       |
                                                  [S type refined: authority present]
```

**Why this matters**: This is how the chain of custody manifests at the individual transaction level. Authority is proven by spending + returning the UUT. The TypeScript type system tracks its presence, so partial transaction methods can enforce that required authorities are included before they execute.

## DelegatedDataContract Lifecycle Hooks

`DelegatedDataContract` provides lifecycle hooks that fire during transaction building for create and update operations. These hooks allow subclasses to transform or augment record data at well-defined points in the transaction-building pipeline.

### Hook Inventory

| Hook | Fires During | Receives | Returns | Purpose |
|------|-------------|----------|---------|---------|
| `beforeCreate(record, context)` | `txnCreatingRecord()` | Merged record (defaults + id + type + caller data), `{ activity }` | Patched `TLike` | Normalize/augment record before on-chain datum is built |
| `beforeUpdate(record, context)` | `txnUpdatingRecord()` | Merged record (existing + updated fields), `{ original, activity }` | Patched `TLike` | Normalize/augment record before on-chain datum is built |
| `afterCreate` | — | — | — | **Not yet implemented** — planned for post-submission side effects |
| `afterUpdate` | — | — | — | **Not yet implemented** — planned for post-submission side effects |

### Before-Hooks: Data Transform Pattern

Both `beforeCreate` and `beforeUpdate` are **synchronous data transforms** — they receive a record and must return a (possibly modified) record. The base class implementations are passthroughs (`return record`).

**When they fire in the pipeline**:

```
mkTxnCreateRecord()
  ├─> merge defaults + id + type + caller data
  ├─> beforeCreate(mergedRecord, { activity })     ◄── hook fires here
  └─> txnCreatingRecord() builds datum from returned record

mkTxnUpdateRecord()
  └─> txnUpdatingRecord()
        ├─> merge existing record + updated fields
        ├─> beforeUpdate(mergedRecord, { original, activity })  ◄── hook fires here
        └─> builds updated datum from returned record
```

**Typical use cases**:
- Conforming submitted data to on-chain schema requirements (e.g., computing derived fields the policy enforces)
- Setting timestamps or status fields that the policy expects
- Normalizing data representations (e.g., converting string formats)

**Context types** (`src/delegation/DelegatedDataContract.ts`):
- `createContext<TLike>`: `{ activity: isActivity }`
- `updateContext<T>`: `{ original: T, activity: isActivity }`

The `original` field in `updateContext` provides access to the pre-update on-chain record (typed as `T`, the on-chain type), enabling delta-aware transforms.

### After-Hooks: Planned

`afterCreate` and `afterUpdate` hooks are planned but not yet implemented. Unlike the before-hooks (which are synchronous data transforms), after-hooks would fire after successful transaction submission and serve as side-effect points (e.g., cache invalidation, notifications, logging). Architecture and requirements for these hooks are being developed.

## Accessing Precompiled Bundle Config

### Static scriptBundleClass()

Each contract class has a static `scriptBundleClass()` method that returns the bundle class with precompiled details:

```typescript
// Access bundle class without instantiating contract
const BundleClass = await MyCapo.scriptBundleClass();

// Precompiled details are available on the class
const { capo, minter } = BundleClass.prototype.precompiledScriptDetails || {};
// capo.config - { mph, rev, ... }
// capo.scriptHash - validator hash (hex string)
// minter.scriptHash - minting policy hash
```

This enables:
- Getting `mph` and `scriptHash` before contract instantiation
- Configuring CachedUtxoIndex with contract addresses early
- Avoiding compilation just to read config values

### precompiledScriptDetails Structure

```typescript
precompiledScriptDetails: {
    capo?: {
        config: { mph, rev, ... },
        scriptHash: string,        // hex-encoded
        programBundle?: {...}      // serialized UPLC (optional)
    },
    minter?: {
        config: { seedTxn, seedIndex },
        scriptHash: string
    },
    // ... other precompiled scripts
}
```

Built at compile time by the Stellar Rollup bundler. Available without any runtime compilation.

## Script Hash Resolution

The `scriptHash` getter in HeliosScriptBundle resolves in order:

```typescript
// src/helios/scriptBundling/HeliosScriptBundle.ts:327
get scriptHash() {
    return (
        this.previousOnchainScript?.uplcProgram.hash() ||  // 1. From on-chain ref
        this.configuredScriptDetails?.scriptHash ||        // 2. From precompiled bundle
        this.alreadyCompiledScript?.hash() ||              // 3. From JIT compilation cache
        this.compiledScript().hash()                       // 4. Fallback: compile now
    );
}
```

For precompiled bundles (like CapoHeliosBundle), `configuredScriptDetails.scriptHash` is available at initialization, avoiding compilation.

For delegate bundles (like DelegatedDataBundle), compilation is typically required to get the hash.

## Key Type Definitions

### FindableViaCharterData (src/CapoTypes.ts:436)

```typescript
type FindableViaCharterData = {
    charterData?: CharterData;
    optional?: true;
    readOnly?: boolean;  // Skip compilation for read-only operations
};
```

### ConfiguredScriptDetails

Contains precompiled script information:
- `scriptHash`: The validator hash
- `config`: Script parameters
- `programBundle`: Serialized program (when precompiled)

## Performance Instrumentation

The runtime includes Performance API marks for profiling:

```typescript
performance.mark(`${label}:start`);
// ... operation ...
performance.mark(`${label}:end`);
performance.measure(label, `${label}:start`, `${label}:end`);
```

Key instrumented operations in `findDelegatedDataUtxos`:
- `findCapoUtxos` - UTxO fetching
- `findCharterData` - Charter parsing
- `getDgDataController` - Delegate loading
- `loadController:${type}` - Per-type controller loading
- `processUtxos` - Overall UTxO processing

View via Chrome DevTools Performance panel or `performance.getEntriesByType('measure')`.

## File Reference

| File | Role |
|------|------|
| `src/Capo.ts` | Main Capo class, delegate management, data queries |
| `src/StellarContract.ts` | Base contract class, script management |
| `src/CapoTypes.ts` | Type definitions including `FindableViaCharterData` |
| `src/helios/scriptBundling/HeliosScriptBundle.ts` | Script bundle base class |
| `src/helios/scriptBundling/CapoHeliosBundle.ts` | Capo-specific bundle (precompiled) |
| `src/helios/scriptBundling/CapoDelegateBundle.ts` | Delegate bundle base |
| `src/helios/scriptBundling/DelegatedDataBundle.ts` | Data controller bundle |
| `src/delegation/ContractBasedDelegate.ts` | Base for contract-backed delegates |
| `src/delegation/DelegatedDataContract.ts` | Base for data controller delegates |

## Verification

```bash
# Check readOnly option usage
grep -n "readOnly" src/Capo.ts src/CapoTypes.ts

# Check delegate caching
grep -n "_delegateCache" src/Capo.ts

# Check script compilation paths
grep -n "asyncCompiledScript" src/Capo.ts src/StellarContract.ts
```

---

## Open Questions

- [ ] Delegate cache invalidation on upgrade — currently no mechanism to invalidate cached delegate instances when a delegate is upgraded during a session. UtxoIndex detects charter changes but no treatment propagates to the cache. (Backlog item also in `dapp-ui.architecture.md`)
- [ ] afterCreate / afterUpdate hook placement — where in the submission pipeline should after-hooks fire? Inside `submitTxnWithBlock`? Via callback from `TxSubmitMgr`? Needs design before implementation.
- [ ] Full DelegatedDataContract requirements backfill — the reqts doc currently only covers lifecycle hooks. The full CRUD surface, data bridge integration, and typed transaction building need formal requirements.
- [ ] Transaction chaining patterns lack detailed interface documentation — the three facade patterns (forward, conditional, preparatory) are described at workflow level but their TypeScript API surface (TxChainBuilder, addlTxns, mkTcx callbacks) isn't architecturally specified.

---

## Discovery Notes

### Initial Documentation (commit 51e52f05)

Original doc focused on read/write path optimization — the performance-critical split between readOnly (skip compilation) and write (full compilation) paths. Captured delegate initialization cost analysis, script hash resolution chain, and precompiled bundle config access.

### Lifecycle Hooks Addition (2026-02-06)

Added DelegatedDataContract lifecycle hooks section documenting beforeCreate, beforeUpdate (existing), and afterCreate/afterUpdate (planned). Created companion requirements doc at `src/delegation/DelegatedDataContract.reqts.md`. Added structured JSONL records for hook software objects.

### Template Compliance Pass (2026-02-06)

Added Interview Status, Concerns Summary, Interfaces table, Data Flow table, Collaboration Summary, Open Questions, and Discovery Notes to align with `architect.SKILL.md` template requirements. Moved 11 JSONL records (5 interactions, 6 workflows) from system-level `stellar-contracts-architecture.jsonl` to `src/offchainRuntime-architecture.jsonl` for proper subsystem scoping.
