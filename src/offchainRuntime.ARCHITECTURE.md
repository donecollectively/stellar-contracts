# Offchain Runtime Architecture

> **Git Reference**: Based on commit `b4cafd0` (perf: avoid expensive load of onchain scripts during app start)
> Use `git diff b4cafd0..HEAD -- src/Capo.ts src/StellarContract.ts src/CapoTypes.ts` to see changes since this doc was written.

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

Used for querying on-chain data without building transactions.

```
findDelegatedDataUtxos({ type, readOnly: true })
  ├─> findCapoUtxos()                    // Fetch UTxOs from network/cache
  ├─> findCharterData()                  // Parse charter datum
  └─> For each UTxO with matching type:
        ├─> getDgDataController(type, { readOnly: true })
        │     └─> connectDelegateWithOnchainRDLink(..., { readOnly: true })
        │           ├─> mustGetDelegate() → init()    // Cheap
        │           └─> Skips asyncCompiledScript()   // No compilation
        └─> controller.newReadDatum(datum.data)
              └─> Uses pre-generated bridge casts (no compilation needed)
```

The `readOnly` option skips:
- Script compilation (`asyncCompiledScript()`)
- Upgrade detection (which requires `delegateValidatorHash`)

This is valid because reading data only needs the data bridge, not the compiled script.

### Write Path (readOnly: false, default)

Used when building transactions.

```
mkTxnCreateRecord()
  └─> getDgDataController(type)          // readOnly: false (default)
        └─> connectDelegateWithOnchainRDLink()
              ├─> mustGetDelegate() → init()   // Cheap
              ├─> asyncCompiledScript()        // EXPENSIVE: Compile Helios to UPLC
              └─> Upgrade detection            // Compare validator hashes
```

Script compilation is required for:
- Getting the validator hash for transaction outputs
- Validating that bundled scripts match on-chain scripts
- Detecting when delegates need upgrades

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
