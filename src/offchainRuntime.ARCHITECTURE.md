# Offchain Runtime Architecture

> **Git Reference**: This document was written based on commit `1d55f10` (with uncommitted changes adding `readOnly` optimization).
> If the code has changed since then, compare key functions against this commit to understand evolution.

## Overview

The offchain runtime handles TypeScript interactions with Cardano smart contracts, including:
- Reading data from UTxOs (delegated data, charter data)
- Building transactions
- Managing delegates and their lifecycle

## Critical Performance Insight: Read vs Write Paths

### The Core Problem

When reading delegated data (e.g., `findDelegatedDataUtxos`), the system was unnecessarily compiling Helios scripts. Script compilation is expensive (100-500ms per script) but is **only needed for transaction building**, not for reading data.

### Why Script Compilation Was Happening

The call chain for reading data was:

```
findDelegatedDataUtxos()
  └─> getDgDataController()
        └─> connectDelegateWithOnchainRDLink()
              └─> mustGetDelegate()   // Creates delegate instance
              └─> asyncCompiledScript()  // ❌ EXPENSIVE - compiles Helios
              └─> upgrade detection (needs validatorHash)
```

### The Solution: `readOnly` Option

Added `readOnly?: boolean` option to `connectDelegateWithOnchainRDLink` and `getDgDataController`:

```typescript
// src/Capo.ts:1730-1740
async connectDelegateWithOnchainRDLink<...>(
    role: RN,
    delegateLink: RelativeDelegateLinkLike,
    options?: { readOnly?: boolean }  // NEW
): Promise<DT>
```

When `readOnly: true`:
1. Skip `asyncCompiledScript()` call
2. Skip upgrade detection (which requires `delegateValidatorHash`)

### Why This Works

The data bridge's `newReadDatum()` function uses **pre-generated cast functions** that don't require the compiled program:

```
newReadDatum(uplcData)
  └─> bridge.readDatum(d)
        └─> Pre-generated type casts (no compilation needed)
```

The pre-generated `.bridge.ts` files contain all the type conversion logic at build time.

## Key Code Paths

### 1. Reading Delegated Data (Optimized Path)

**File**: `src/Capo.ts` - `findDelegatedDataUtxos()` (line ~3304)

```
findDelegatedDataUtxos({ type: "settings" })
  ├─> findCapoUtxos()           // Get UTxOs from network/cache
  ├─> findCharterData()         // Parse charter datum
  └─> For each UTxO:
        ├─> Extract datum type from on-chain data
        ├─> getDgDataController(type, { readOnly: true })  // ✅ No compilation
        └─> controller.newReadDatum(datum)                  // Pre-generated casts
```

### 2. Building Transactions (Full Compilation Path)

When building transactions, compilation IS needed:

```
mkTxnCreateRecord()
  └─> getDgDataController(type)  // readOnly: false (default)
        └─> connectDelegateWithOnchainRDLink()
              └─> asyncCompiledScript()  // ✅ Needed for txn building
              └─> upgrade detection      // ✅ Needed to detect stale scripts
```

### 3. Delegate Connection and Caching

**File**: `src/Capo.ts` - `connectDelegateWithOnchainRDLink()` (line ~1730)

```
connectDelegateWithOnchainRDLink(role, delegateLink, options?)
  ├─> Check _delegateCache[role][cacheKey]  // Return cached if available
  │     └─> ✅ Cache hit returns immediately
  │
  └─> Cache miss:
        ├─> mustGetDelegate()               // Create delegate instance
        ├─> if (!options?.readOnly):
        │     ├─> asyncCompiledScript()     // Compile Helios
        │     └─> upgrade detection         // Compare validator hashes
        └─> Cache delegate for future use
```

## Key Files and Their Roles

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/Capo.ts` | Main Capo contract class | `findDelegatedDataUtxos`, `getDgDataController`, `connectDelegateWithOnchainRDLink` |
| `src/StellarContract.ts` | Base contract class | `asyncCompiledScript`, `validatorHash`, `getBundle`, `mkScriptBundle` |
| `src/helios/scriptBundling/HeliosScriptBundle.ts` | Script bundle management | `loadProgram`, `compiledScript`, `scriptHash` getter |
| `src/delegation/ContractBasedDelegate.ts` | Base for contract-backed delegates | `delegateValidatorHash`, `mkScriptBundle` |
| `src/CapoTypes.ts` | Type definitions | `FindableViaCharterData` (includes `readOnly` option) |

## Script Hash Availability Without Compilation

For precompiled bundles, `scriptHash` is available via:

```typescript
// src/helios/scriptBundling/HeliosScriptBundle.ts:327-341
get scriptHash() {
    const hash =
        this.previousOnchainScript?.uplcProgram.hash() ||
        this.configuredScriptDetails?.scriptHash ||  // ✅ Available for precompiled
        this.alreadyCompiledScript?.hash();
    if (!hash) {
        // Falls back to compilation if nothing else available
        const script = this.compiledScript();
        return script.hash();
    }
    return hash;
}
```

**Note**: Delegate bundles (e.g., `DelegatedDataBundle`) are typically NOT precompiled, so they require JIT compilation for `scriptHash`. This is why we skip the entire `delegateValidatorHash` access for read-only operations.

## Performance Instrumentation

The codebase includes Performance API marks for profiling:

```typescript
// In findDelegatedDataUtxos():
performance.mark(`${perfLabel}:start`);
performance.mark(`${perfLabel}:findCapoUtxos:start`);
// ... operations ...
performance.mark(`${perfLabel}:findCapoUtxos:end`);
performance.measure(`${perfLabel}:findCapoUtxos`, ...);
```

View in Chrome DevTools Performance panel or via `performance.getEntriesByType('measure')`.

## Delegate Cache Structure

```typescript
// src/Capo.ts:1720-1727
_delegateCache: {
    [roleName: string]: {
        [delegateLink: string]: {
            delegate: StellarDelegate;
        };
    };
} = {};
```

Cache key is `JSON.stringify(onchainDgtLink, delegateLinkSerializer)`.

## Future Optimization Opportunities

1. **Lazy Compilation**: Delegates could defer compilation until `validatorHash` is actually accessed
2. **Bundle Precompilation**: More delegate bundles could be precompiled at build time
3. **Parallel Loading**: Multiple delegate controllers could be loaded in parallel when reading multiple types

## Related Requirements

- **REQT-1.7.3/qc7qgsqphv**: getTxInfo with Restored Inputs (in CachedUtxoIndex)

## Code Change Detection

To detect if the code has changed since this doc was written:

```bash
# Check if key functions have changed
git diff 1d55f10..HEAD -- src/Capo.ts | grep -A5 -B5 "connectDelegateWithOnchainRDLink\|getDgDataController\|findDelegatedDataUtxos"

# Check if the readOnly option is still in place
grep -n "readOnly" src/Capo.ts src/CapoTypes.ts
```
