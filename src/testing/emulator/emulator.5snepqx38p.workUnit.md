# Work Unit: Egg/Chicken Pattern for Disk Cache Lookup

**ID**: ARCH-5snepqx38p
**Status**: IN_PROGRESS
**Priority**: High
**Estimated Complexity**: Medium-High
**Test File**: `tests/01a-SnapshotCache.test.ts`

## Summary

Implement the egg/chicken pattern to enable cache key computation when loading chartered Capo from disk, solving the chicken-and-egg problem where cache key needs `configuredParams` but those only exist after minting.

## Background

See `emulator-capo-chicken-egg.md` for full architectural details.

**The Problem**: When disk cache exists but no chartered Capo is in memory, computing the cache key for `capoInitialized` requires `configuredParams` (including `mph`, `seedUtxo`), but those values only exist *after* minting the charter—which is what `capoInitialized` captures.

**The Solution**:
1. Use an "egg" (unconfigured Capo via `partialConfig: {}`) to compute source hashes
2. Pre-select `seedUtxo` in the actors snapshot
3. Store `capoConfig` in `offchainData` for reconstruction

## Requirements

| Requirement | Description |
|-------------|-------------|
| REQT-3.6.1/84f4k7nb6p | Pre-selected Seed UTxO in actors snapshot |
| REQT-3.6.2/mvf88mnsez | Egg-compatible resolvers |
| REQT-3.6.3/mexwd3p8mr | Source hash separation from derived params |
| REQT-3.6.4/9rrhspdd3m | Capo config storage in offchainData |
| REQT-3.6.5/vz0fc3s057 | Capo reconstruction decision tree |
| REQT-3.6.6/dynnc9bq1v | Egg creation for disk lookup |

## Architecture References

| ARCH-ID | Name | Relevance |
|---------|------|-----------|
| ARCH-8wby9gxrav | Chicken-and-egg problem | Problem definition |
| ARCH-sq123b1884 | Egg Capo pattern | Key insight: `computeSourceHash()` needs no config |
| ARCH-4adwbk7ajp | Pre-selected seed UTxO | Breaks the dependency |
| ARCH-a060fvy86w | Capo reconstruction decision tree | Loading decision logic |
| ARCH-psqv6y39h5 | Capo config storage | Enables disk reconstruction |
| ARCH-c1kttx6sp2 | Load Chartered Capo from Disk workflow | End-to-end flow |

## Clarifications

Questions raised during implementation planning and their resolutions:

### Q1: How should the pre-selected seed UTxO be used during charter minting?

**Question**: The work unit says to pre-select a seed UTxO from the default actor's wallet in the actors snapshot. Currently, the seed UTxO selection happens during `mkTxnMintCharterToken()`. Should I modify `mkTxnMintCharterToken()` to accept a pre-selected seed UTxO, or should the pre-selection just ensure the *same* UTxO is deterministically selected later?

**Resolution**: The `partialConfig` should accept a seed UTxO without needing anything else. When creating an egg or reconstructing a Capo from disk, pass just the `seedUtxo` in the partialConfig. This allows Capo creation with minimal config that can later be used to derive the full identity (mph, etc.).

### Q2: Where should egg creation happen?

**Question**: The architecture mentions creating an egg when disk lookup is needed but no Capo exists. Currently `this.strella` is set in `initialize()`. Should egg creation happen in the resolver functions when `this.strella` is undefined, or in a new method called before resolvers are invoked?

**Resolution**: Create the egg **in the resolver functions** when `this.strella` is undefined or unconfigured. This ensures the egg exists only when needed for cache key computation.

### Q3: What should be stored in capoConfig?

**Question**: The work unit mentions storing `capoConfig` including `mph`, `seedUtxo`, `rev`, `charterAddress`. Looking at the current code, `rawConfig` is already being stored. Should I store the already-existing `rawConfig` (which should have these fields), or construct a separate `capoConfig` object with explicitly listed fields?

**Resolution**: Verify that the existing `rawConfig` has the needed details (`mph`, `seedUtxo`, `rev`, `charterAddress`) and ensure Load Chartered Capo from Disk uses those details in an appropriate form. Use the existing `rawConfig` if it contains the required fields; otherwise augment it.

### Q4: Should tests be included in this work unit?

**Question**: The work unit includes test scenarios. Should I implement the tests as part of this work unit, or focus on implementation only?

**Resolution**: Add test scenarios in `tests/01a-SnapshotCache.test.ts` as part of this work unit.

---

## Implementation Tasks

### Task 1: Pre-select Seed UTxO in Actors Snapshot

**File**: `src/testing/CapoTestHelper.ts`

**Changes**:
1. In `bootstrapWithActors()` (or its builder), after actors are set up, pre-select a seed UTxO from the default actor's wallet
2. Store in offchainData:
   ```typescript
   offchainData: {
     actorWallets: { ... },
     targetSeedUtxo: {
       txId: string,
       utxoIdx: number,
       // Full TxInput serialization for reconstruction
     }
   }
   ```

**Verification**: After saving actors snapshot, `offchainData.targetSeedUtxo` should be populated.

---

### Task 2: Update Resolvers to Use Source Hash Only

**File**: `src/testing/CapoTestHelper.ts`

**Changes**:
1. Modify `resolveCoreCapoDependencies()`:
   ```typescript
   async resolveCoreCapoDependencies(): Promise<CacheKeyInputs> {
       const capoBundle = await this.capo.getBundle();
       const seedUtxo = this.getPreSelectedSeedUtxo();  // NEW: from actors snapshot

       return {
           bundles: [{
               name: capoBundle.moduleName || capoBundle.constructor.name,
               sourceHash: capoBundle.computeSourceHash(),  // Works without config!
               params: { seedUtxo }  // Identity params only
           }],
           extra: { heliosVersion: VERSION }
       };
   }
   ```

2. Add `getPreSelectedSeedUtxo()` method:
   ```typescript
   private getPreSelectedSeedUtxo(): { txId: string, utxoIdx: number } {
       // Load from actors snapshot's offchainData
       const actorsSnap = this.helperState?.snapCache?.loadedSnapshots.get(...);
       return actorsSnap?.offchainData?.targetSeedUtxo;
   }
   ```

3. Similarly update `resolveEnabledDelegatesDependencies()` to not use `configuredParams`.

**Verification**: Resolvers should work with an egg Capo (no `configuredParams`).

---

### Task 3: Store Capo Config in capoInitialized Snapshot

**File**: `src/testing/CapoTestHelper.ts`

**Changes**:
1. In `snapToCapoInitialized()` builder (after charter is minted), capture and store config:
   ```typescript
   const capoConfig = {
       mph: this.capo.mintingPolicyHash?.toHex(),
       seedUtxo: {
           txId: seedTxn.id.toString(),
           utxoIdx: seedTxn.utxoIdx
       },
       rev: this.capo.configIn?.rev?.toString(),
       charterAddress: this.capo.address?.toBech32(),
       // ... other CapoConfig fields
   };

   // Include in offchainData when storing snapshot
   offchainData: {
       ...parentOffchainData,
       capoConfig
   }
   ```

**Verification**: After saving `capoInitialized` snapshot, `offchainData.capoConfig` should contain full config.

---

### Task 4: Implement Capo Reconstruction Decision Tree

**File**: `src/testing/CapoTestHelper.ts`

**Changes**:
1. Add comparison logic:
   ```typescript
   private shouldCreateNewCapo(loadedConfig: CapoConfig): boolean {
       // No capo at all
       if (!this.strella) return true;

       // Unconfigured egg
       if (!this.strella.configIn?.mph) return true;

       // Compare identity
       const currentMph = this.strella.mintingPolicyHash?.toHex();
       const loadedMph = loadedConfig.mph;

       return currentMph !== loadedMph;
   }
   ```

2. In `findOrCreateSnapshot()` or `restoreFrom()`, when loading from disk:
   ```typescript
   const loadedConfig = cachedSnapshot.offchainData?.capoConfig;

   if (this.shouldCreateNewCapo(loadedConfig)) {
       // Create new Capo with loaded config
       this.strella = await this.initStrella(this.stellarClass, loadedConfig);
   } else {
       // Hot-swap network only (Setup Envelope pattern)
       (this.strella as any).setup.network = this.network;
   }
   ```

**Verification**:
- With egg → creates new Capo
- With different chartered Capo → creates new Capo
- With same chartered Capo → hot-swaps network

---

### Task 5: Create Egg for Disk Lookup

**File**: `src/testing/CapoTestHelper.ts`

**Changes**:
1. Before computing cache key when no chartered Capo exists:
   ```typescript
   // In findOrCreateSnapshot() or resolver call path
   if (!this.strella || !this.strella.configIn?.mph) {
       // Create egg for cache key computation
       this.strella = await this.initStrella(this.stellarClass);  // partialConfig: {}
   }
   ```

**Note**: `initStrella()` without config already creates a partial-config Capo (egg). Verify this is sufficient.

**Verification**: Cache key computation should work without a chartered Capo.

---

## Testing Strategy

### Test 1: Fresh Bootstrap Still Works
```typescript
it("fresh bootstrap creates chartered Capo", async ({ h }) => {
    // Clear all caches
    await h.reusableBootstrap();
    expect(h.capo.mintingPolicyHash).toBeDefined();
});
```

### Test 2: Load from Memory Works
```typescript
it("second test loads from memory", async ({ h }) => {
    await h.reusableBootstrap();  // Should hit memory cache
    // Verify hot-swap happened (same Capo instance)
});
```

### Test 3: Load from Disk Works (Key Test)
```typescript
// Run in separate process or clear helperState
it("loads chartered Capo from disk cache", async ({ h }) => {
    // helperState.bootstrappedStrella is undefined
    // Disk cache exists from prior run
    await h.reusableBootstrap();

    // Verify Capo reconstructed correctly
    expect(h.capo.mintingPolicyHash?.toHex()).toBe(expectedMph);
});
```

### Test 4: Pre-selected Seed UTxO Stored
```typescript
it("actors snapshot stores targetSeedUtxo", async ({ h }) => {
    await h.snapToBootstrapWithActors();
    const snap = await h.snapshotCache.find("bootstrapWithActors", h);
    expect(snap?.offchainData?.targetSeedUtxo).toBeDefined();
});
```

### Test 5: Capo Config Stored
```typescript
it("capoInitialized snapshot stores capoConfig", async ({ h }) => {
    await h.reusableBootstrap();
    const snap = await h.snapshotCache.find("capoInitialized", h);
    expect(snap?.offchainData?.capoConfig?.mph).toBeDefined();
});
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/testing/CapoTestHelper.ts` | Main implementation: egg creation, resolvers, config storage, decision tree |
| `src/testing/DefaultCapoTestHelper.ts` | May need updates for built-in snapshot builders |
| `src/testing/types.ts` | Add `CapoConfigOffchain` type if needed |
| `src/testing/emulator/SnapshotCache.ts` | Possibly update `find()` to support egg-based lookup |
| `tests/01a-SnapshotCache.test.ts` | Add test scenarios for egg/chicken pattern |

## Acceptance Criteria

1. [ ] `bootstrapWithActors` snapshot stores `offchainData.targetSeedUtxo`
2. [ ] `capoInitialized` snapshot stores `offchainData.capoConfig`
3. [ ] Resolvers use `computeSourceHash()` instead of `getCacheKeyInputs().params`
4. [ ] Disk cache lookup works without chartered Capo (uses egg)
5. [ ] Capo reconstruction decision tree implemented
6. [ ] All existing tests pass
7. [ ] New tests verify egg/chicken pattern

## Notes

- The egg pattern relies on `computeSourceHash()` NOT needing `configuredParams`. Verify this assumption holds for all bundle types.
- Hot-swap path uses Setup Envelope pattern (ARCH-4rmkegmspj) — `capo.setup.network = newEmulator`
- Pre-selected seedUtxo must be deterministic (same PRNG state → same UTxO selected)
