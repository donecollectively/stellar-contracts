# WU: Refactor Snapshot Resolution to Single Chokepoint

**ARCH-UUT**: ARCH-7jcyqx1mg8
**Status**: completed
**Relates to**: ARCH-rmegyaj58k (Build App Snapshot with Cached Parent), ARCH-1d82vckcae (SnapshotCache)

**Required Skills**:
- TypeScript off-chain development
- Testing framework (Vitest, emulator snapshot system)
- Familiarity with CapoTestHelper and SnapshotCache classes

**In Scope (ARCH)**:
- ARCH-rw8jqbj00a (CapoTestHelper) — primary modification target
- ARCH-1d82vckcae (SnapshotCache) — interface consumer, no changes needed
- ARCH-rmegyaj58k (Build App Snapshot with Cached Parent) — workflow being fixed

**In Scope (REQT)**:
- REQT-3.4 (Offchain Data Storage) — helperState.offchainData population
- REQT-3.6.5 (Capo Reconstruction Decision Tree) — handleCapoReconstruction()
- REQT-1.2.10.3 (In-Memory Cache) — loadedSnapshots Map usage

## Problem Statement

The current snapshot resolution code has scattered logic across multiple methods with divergent paths for cache hits vs misses. This leads to:

1. **Brittle parent resolution**: When a child snapshot needs parent "firstMember" that isn't cached, the system proceeds to build without properly loading the parent first
2. **Divergent code paths**: Cache HIT path (lines 839-971) and cache MISS path (lines 1026+) have different logic that should be unified
3. **Scattered branching**: "Is it in memory?", "Is it on disk?", "Is parent ready?", "Need to build?" decisions spread across `snapshotCache.find()`, `findOrCreateSnapshot()`, and `SnapWrap`

## Goal

Restructure `findOrCreateSnapshot()` to be a **single chokepoint** with:
1. One recursive path for ensuring snapshots are ready (including parents)
2. Uniform treatment whether cache hit or freshly built
3. Clear separation: `ensureSnapshotCached()` (get it ready) vs `loadCachedSnapshot()` (use it)

## Current Architecture

### Current `findOrCreateSnapshot()` Structure (Problematic)

```
findOrCreateSnapshot(snapshotName, actorName, contentBuilder)
│
├─ snapshotCache.find(snapshotName)
│   └─ returns CachedSnapshot or null
│
├─ IF cached (HIT PATH - lines 839-971):
│   ├─ network.loadSnapshot()
│   ├─ merge namedRecords
│   ├─ handle offchainData
│   ├─ handle genesis snapshot specially
│   ├─ Capo reconstruction decision tree
│   ├─ set actor
│   ├─ diagnostics
│   └─ return
│
└─ IF not cached (MISS PATH - lines 1026+):
    ├─ log "cache miss"
    ├─ TRY to load parent (BUT only if already cached!)  ← BUG
    ├─ build via contentBuilder()
    ├─ store to cache
    └─ return (WITHOUT going through HIT PATH loading!)  ← BUG
```

**Problems:**
1. Parent resolution only works if parent is already cached
2. After building, code returns directly without the HIT PATH's loading/setup logic
3. Two completely different code paths that should be unified

### Current `_snapshotRegistrations` (Already Implemented)

The decorator now stores `snapMethod` at class definition time:

```typescript
static _snapshotRegistrations: Map<string, {
    parentSnapName: ParentSnapName;
    resolveScriptDependencies?: ScriptDependencyResolver;
    computeDirLabel?: DirLabelResolver;
    actor: string;
    internal?: boolean;
    snapMethod?: (...args: any[]) => Promise<any>;  // The decorated snap* method
}>
```

This enables direct parent method invocation without string construction.

## Proposed Architecture

### New `findOrCreateSnapshot()` Structure

```
findOrCreateSnapshot(snapshotName, actorName, contentBuilder)
│
├─ ensureSnapshotCached(snapshotName, contentBuilder)
│   │
│   ├─ snapshotCache.find(snapshotName) → cached?
│   │   └─ IF cached: return cached (EARLY EXIT)
│   │
│   ├─ ENSURE PARENT (if not genesis):
│   │   ├─ snapshotCache.find(parentSnapName) → parentCached?
│   │   │   └─ IF parentCached: skip snapMethod call (efficiency)
│   │   │
│   │   ├─ IF NOT parentCached:
│   │   │   ├─ get parent's snapMethod from _snapshotRegistrations
│   │   │   ├─ await parentReg.snapMethod.call(this)  ← RECURSIVE!
│   │   │   └─ re-fetch: snapshotCache.find(parentSnapName)
│   │   │
│   │   └─ load parent state into emulator for building
│   │
│   ├─ BUILD: await contentBuilder()
│   │
│   ├─ STORE: capture snapshot, store to cache
│   │
│   └─ return freshly-cached snapshot
│
└─ loadCachedSnapshot(cached, snapshotName, actorName)
    │
    ├─ network.loadSnapshot(cached.snapshot)
    ├─ merge namedRecords
    ├─ handle offchainData (store in helperState)
    ├─ handle Capo reconstruction (if needed)
    ├─ log diagnostics (if non-genesis)
    ├─ set actor
    └─ return this.strella
```

**Key improvements:**
1. `ensureSnapshotCached()` is the single recursive chokepoint
2. Parent resolution via `snapMethod.call(this)` - recursive, guaranteed to work
3. `loadCachedSnapshot()` is ALWAYS called - same path for hit or freshly-built
4. Clear separation of concerns

## Implementation Steps

### Step 1: Extract `ensureSnapshotCached()` Method

Create a new private method that handles the recursive "ensure it's in cache" logic:

```typescript
/**
 * Ensures a snapshot is in cache (memory or disk), building recursively if needed.
 * This is the single chokepoint for snapshot resolution.
 * @internal
 */
private async ensureSnapshotCached(
    snapshotName: string,
    contentBuilder: () => Promise<any>,
): Promise<CachedSnapshot> {
    // 1. Check cache first (memory, then disk via snapshotCache.find)
    const cacheStart = performance.now();
    let cached = await this.snapshotCache.find(snapshotName, this);
    if (cached) {
        const entry = this.snapshotCache["registry"].get(snapshotName);
        const isGenesis = entry?.parentSnapName === "genesis";
        const cacheElapsed = (performance.now() - cacheStart).toFixed(1);
        console.log(`  ⚡ cache hit${isGenesis ? ' (genesis)' : ''} '${snapshotName}': ${cacheElapsed}ms`);
        return cached;
    }
    console.log(`  📦 cache miss '${snapshotName}' - building...`);

    // 2. Cache miss - ensure parent is ready first (recursive)
    const entry = this.snapshotCache["registry"].get(snapshotName);
    const parentSnapName = entry?.parentSnapName;

    if (parentSnapName && parentSnapName !== "genesis") {
        // Check if parent is already cached BEFORE calling snapMethod (efficiency)
        // This avoids running the full SnapWrap chain (reusableBootstrap, loadCachedSnapshot)
        // when parent is already available
        let parentCached = await this.snapshotCache.find(parentSnapName, this);

        if (!parentCached) {
            // Parent not cached - call its snap* method to build it
            const parentReg = (this.constructor as any)._snapshotRegistrations?.get(parentSnapName);

            if (parentReg?.snapMethod) {
                console.log(`  📦 building parent '${parentSnapName}' first...`);
                // RECURSIVE: This calls the parent's SnapWrap, which calls findOrCreateSnapshot,
                // which calls ensureSnapshotCached for the parent, and so on up the chain
                await parentReg.snapMethod.call(this);
                // Re-fetch after build
                parentCached = await this.snapshotCache.find(parentSnapName, this);
            } else {
                throw new Error(
                    `Parent snapshot '${parentSnapName}' has no snapMethod registered. ` +
                    `Ensure snapTo${parentSnapName[0].toUpperCase()}${parentSnapName.slice(1)}() ` +
                    `exists with @hasNamedSnapshot decorator.`
                );
            }
        }

        if (!parentCached) {
            throw new Error(
                `Parent '${parentSnapName}' should be cached after snapMethod call, but wasn't found.`
            );
        }

        console.log(`  📦 loading parent '${parentSnapName}' state for building '${snapshotName}'...`);
        this.network.loadSnapshot(parentCached.snapshot);
        Object.assign(this.helperState!.namedRecords, parentCached.namedRecords);
    }

    // 3. Build the snapshot
    console.log(`  🔨 building '${snapshotName}'...`);
    const buildStart = performance.now();
    await contentBuilder();
    const buildElapsed = (performance.now() - buildStart).toFixed(1);
    console.log(`  🐢 built '${snapshotName}': ${buildElapsed}ms`);

    // 4. Capture and store
    const storeStart = performance.now();
    const snapshot = this.network.snapshot(snapshotName);

    // Get parent hash for cache key
    const parentCached = parentSnapName && parentSnapName !== "genesis"
        ? await this.snapshotCache.find(parentSnapName, this)
        : null;
    const parentHash = parentCached?.snapshotHash || null;

    // Defensive check: namedRecords should be guaranteed by ensureHelperState()
    if (!this.helperState!.namedRecords) {
        throw new Error(
            `ensureSnapshotCached('${snapshotName}'): helperState.namedRecords is undefined. ` +
            `This should not happen - ensureHelperState() should have initialized it.`
        );
    }

    // Build offchainData (same logic as current code)
    const offchainData = this.buildOffchainData(snapshotName, entry);

    const cachedSnapshot: CachedSnapshot = {
        snapshot,
        namedRecords: { ...this.helperState!.namedRecords },
        parentSnapName: parentSnapName || "genesis",
        parentHash,
        snapshotHash: this.network.lastBlockHash,
        offchainData,
    };

    await this.snapshotCache.store(snapshotName, cachedSnapshot, this);
    const storeElapsed = (performance.now() - storeStart).toFixed(1);
    console.log(`  💾 stored '${snapshotName}': ${storeElapsed}ms`);

    return cachedSnapshot;
}
```

### Step 2: Extract `loadCachedSnapshot()` Method

Create a method that handles the uniform loading/setup from cache:

```typescript
/**
 * Loads a cached snapshot into the emulator and sets up helper state.
 * This is called for BOTH cache hits AND freshly-built snapshots.
 * @internal
 */
private async loadCachedSnapshot(
    cached: CachedSnapshot,
    snapshotName: string,
    actorName: string,
): Promise<void> {
    // 1. Load snapshot into network
    this.network.loadSnapshot(cached.snapshot);

    // 2. Merge namedRecords
    Object.assign(this.helperState!.namedRecords, cached.namedRecords);

    // 3. Handle offchainData
    if (cached.offchainData) {
        if (!this.helperState!.offchainData) {
            this.helperState!.offchainData = {};
        }
        this.helperState!.offchainData[snapshotName] = cached.offchainData;
    }

    // 4. Check if this is a genesis (actors) snapshot
    const entry = this.snapshotCache["registry"].get(snapshotName);
    const isGenesisSnapshot = entry?.parentSnapName === "genesis";

    if (isGenesisSnapshot) {
        // Restore actors from stored keys if needed
        if (Object.keys(this.actors).length === 0) {
            const actorWallets = cached.offchainData?.actorWallets as
                Record<string, { spendingKey: string; stakingKey?: string }> | undefined;
            if (actorWallets) {
                this.restoreActorsFromStoredKeys({ actorWallets });
            } else {
                console.warn(`  ⚠️ No stored actor keys in disk cache for '${snapshotName}' - cache may need rebuild`);
            }
        }

        // Restore pre-selected seed UTxO
        if (!this.preSelectedSeedUtxo && cached.offchainData?.targetSeedUtxo) {
            this.preSelectedSeedUtxo = cached.offchainData.targetSeedUtxo as PreSelectedSeedUtxo;
            console.log(`  -- Restored pre-selected seed UTxO from cache: ${this.preSelectedSeedUtxo.txId.slice(0, 12)}...#${this.preSelectedSeedUtxo.utxoIdx}`);
        }
    } else {
        // Non-genesis snapshot: handle Capo reconstruction if needed
        await this.handleCapoReconstruction(cached, snapshotName);

        // Diagnostic: compare stored snapshot state with current Capo state
        this.logSnapshotRestoreDiagnostics(cached, snapshotName);
    }

    // 5. Set actor
    if (actorName === "default") {
        await this.setDefaultActor();
    } else {
        await this.setActor(actorName);
    }
}
```

### Step 3: Extract `handleCapoReconstruction()` Method

Move the Capo reconstruction decision tree to its own method:

```typescript
/**
 * Handles Capo reconstruction when loading a non-genesis snapshot.
 * Implements the decision tree from REQT-3.6.5.
 * @internal
 */
private async handleCapoReconstruction(
    cached: CachedSnapshot,
    snapshotName: string,
): Promise<void> {
    const { bootstrappedStrella } = this.helperState!;
    const loadedRawConfig = cached.offchainData?.capoConfig as Record<string, any> | undefined;
    const loadedConfig = loadedRawConfig ? parseCapoJSONConfig(loadedRawConfig as any) : undefined;

    const shouldCreateNew = this.shouldCreateNewCapo(loadedConfig);

    if (shouldCreateNew) {
        // Cases a) and b): Create new Capo with loaded config
        console.log(`  -- Creating new Capo from loaded config (shouldCreateNew=${shouldCreateNew})`);
        const config = loadedConfig || this.helperState!.parsedConfig;
        if (config) {
            this.helperState!.parsedConfig = config;
            this.state.parsedConfig = config;
            this.state.config = loadedRawConfig;
            await this.initStellarClass(config);
        } else {
            await this.initStellarClass();
        }
        this.helperState!.bootstrappedStrella = this.strella;
        this.helperState!.previousHelper = this as any;
    } else if (bootstrappedStrella && this.helperState!.previousHelper) {
        // Case c): Same chartered Capo - hot-swap network
        console.log(`  -- Hot-swapping network for existing Capo`);
        await this.restoreFrom(snapshotName);
    } else {
        // Fallback: we have a matching Capo but no previousHelper
        console.log(`  -- Using existing Capo (no previousHelper)`);
        this.helperState!.bootstrappedStrella = this.strella;
        this.helperState!.previousHelper = this as any;
    }

    // Ensure state.config is set
    if (loadedRawConfig && !this.state.config) {
        this.state.config = loadedRawConfig;
    }

    // Mark charter as already minted
    if (loadedRawConfig && !this.state.mintedCharterToken) {
        this.state.mintedCharterToken = { restored: true } as any;
    }
}
```

### Step 4: Extract `buildOffchainData()` Method

Move offchainData construction to its own method:

```typescript
/**
 * Builds offchainData for a snapshot being stored.
 * Also populates helperState.offchainData for in-memory cache access.
 * @internal
 */
private buildOffchainData(
    snapshotName: string,
    entry: SnapshotRegistryEntry | undefined,
): Record<string, unknown> | undefined {
    const parentSnapName = entry?.parentSnapName || "genesis";
    let offchainData: Record<string, unknown> | undefined;

    if (parentSnapName === "genesis" && Object.keys(this.actors).length > 0) {
        // Genesis snapshot: store actor wallet keys and seed UTxO
        offchainData = {
            ...this.getActorWalletKeys(),
            targetSeedUtxo: this.preSelectedSeedUtxo,
        };
    } else if (this.state.config) {
        // Non-genesis: store capoConfig with diagnostics
        const capoAddr = this.strella?.address?.toString();
        offchainData = {
            capoConfig: this.state.config,
            _diag: {
                capoAddr,
                validatorHash: this.strella?.validatorHash?.toHex(),
                utxoCountAtCapoAddr: capoAddr
                    ? (this.network as any)._addressUtxos[capoAddr]?.length || 0
                    : 0,
                addressUtxoKeys: Object.keys((this.network as any)._addressUtxos),
            },
        };
    }

    // Populate helperState.offchainData for in-memory cache access (REQT-3.4/n93h9y5s85)
    if (offchainData) {
        if (!this.helperState!.offchainData) {
            this.helperState!.offchainData = {};
        }
        this.helperState!.offchainData[snapshotName] = offchainData;
    }

    return offchainData;
}
```

### Step 4b: Extract `logSnapshotRestoreDiagnostics()` Method

Diagnostic comparison for debugging snapshot restore issues:

```typescript
/**
 * Logs diagnostic comparison between stored and current Capo state.
 * Essential for debugging address mismatches and UTxO loading issues.
 * @internal
 */
private logSnapshotRestoreDiagnostics(
    cached: CachedSnapshot,
    snapshotName: string,
): void {
    const storedDiag = cached.offchainData?._diag as {
        capoAddr?: string;
        validatorHash?: string;
        utxoCountAtCapoAddr?: number;
        addressUtxoKeys?: string[];
    } | undefined;

    if (!storedDiag) return;

    const currentCapoAddr = this.strella?.address?.toString();
    const currentValidatorHash = this.strella?.validatorHash!.toHex();
    const currentUtxoCount = currentCapoAddr
        ? (this.network as any)._addressUtxos[currentCapoAddr]?.length || 0
        : 0;
    const currentAddressKeys = Object.keys((this.network as any)._addressUtxos);

    console.log(`  [DIAG] Snapshot restore comparison for '${snapshotName}':`);
    console.log(`    storedCapoAddr:   ${storedDiag.capoAddr}`);
    console.log(`    currentCapoAddr:  ${currentCapoAddr}`);
    console.log(`    addrMatch: ${storedDiag.capoAddr === currentCapoAddr}`);
    console.log(`    storedValidatorHash:  ${storedDiag.validatorHash}`);
    console.log(`    currentValidatorHash: ${currentValidatorHash}`);
    console.log(`    vhMatch: ${storedDiag.validatorHash === currentValidatorHash}`);
    console.log(`    storedUtxoCount:  ${storedDiag.utxoCountAtCapoAddr}`);
    console.log(`    currentUtxoCount: ${currentUtxoCount}`);
    console.log(`    storedAddressKeys (${storedDiag.addressUtxoKeys?.length}): ${storedDiag.addressUtxoKeys?.slice(0, 5).join(', ')}${(storedDiag.addressUtxoKeys?.length || 0) > 5 ? '...' : ''}`);
    console.log(`    currentAddressKeys (${currentAddressKeys.length}): ${currentAddressKeys.slice(0, 5).join(', ')}${currentAddressKeys.length > 5 ? '...' : ''}`);

    if (storedDiag.capoAddr !== currentCapoAddr) {
        console.warn(`    ⚠️ ADDRESS MISMATCH - this is likely the bug!`);
    }
    if (currentUtxoCount === 0 && (storedDiag.utxoCountAtCapoAddr || 0) > 0) {
        console.warn(`    ⚠️ UTxO COUNT DROPPED TO ZERO - snapshot may not have loaded correctly`);
    }
}
```

### Step 5: Rewrite `findOrCreateSnapshot()` to Use New Methods

The main method becomes simple orchestration:

```typescript
async findOrCreateSnapshot(
    snapshotName: string,
    actorName: string,
    contentBuilder: () => Promise<StellarTxnContext<any>>,
): Promise<SC> {
    const startTime = performance.now();

    // 1. Ensure snapshot is in cache (recursive, handles parents)
    const cached = await this.ensureSnapshotCached(snapshotName, contentBuilder);

    // 2. Load from cache (uniform path for hit or freshly-built)
    await this.loadCachedSnapshot(cached, snapshotName, actorName);

    const elapsed = (performance.now() - startTime).toFixed(1);
    console.log(`  ✅ '${snapshotName}' ready: ${elapsed}ms`);

    return this.strella;
}
```

### Step 6: Update Logging

Ensure logging clearly shows the recursive resolution:

```
  📦 ensuring parent 'firstMember' is ready...
    📦 ensuring parent 'bootstrapped' is ready...
      ⚡ cache hit 'enabledDelegatesDeployed'
    🔨 building 'firstMember'...
    🐢 built 'firstMember': 234ms
    💾 stored 'firstMember': 12ms
  📦 loading parent 'firstMember' state for building 'proposeFirstAgreement'...
  🔨 building 'proposeFirstAgreement'...
  🐢 built 'proposeFirstAgreement': 156ms
  💾 stored 'proposeFirstAgreement': 8ms
  ✅ 'proposeFirstAgreement' ready: 523ms
```

## Files to Modify

`src/testing/CapoTestHelper.ts`:
- Refactor `findOrCreateSnapshot()` to use new methods
- Extract `ensureSnapshotCached()` — recursive cache resolution
- Extract `loadCachedSnapshot()` — uniform loading for hits and freshly-built
- Extract `handleCapoReconstruction()` — Capo decision tree
- Extract `buildOffchainData()` — offchain data construction + helperState population
- Extract `logSnapshotRestoreDiagnostics()` — diagnostic comparison logging

## Testing

### Manual Verification

1. **Fresh build test**: Delete `.stellar/emu/`, run a test that needs `proposeFirstAgreement` with parent `firstMember`. Verify entire chain builds correctly.

2. **Partial cache test**: Have `firstMember` cached but not `proposeFirstAgreement`. Verify parent is loaded and child builds on top.

3. **Full cache test**: Have both cached. Verify fast load without rebuilding.

4. **Deep chain test**: Test with 3+ levels of custom snapshots (e.g., `a` → `b` → `c`). Verify recursive resolution works.

### New Test Cases for 01a-SnapshotCache.test.ts

Add these tests to verify the refactored code handles the uniform load path correctly:

```typescript
describe("Uniform Load Path (Single Chokepoint)", () => {
    beforeEach<CapoTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(context, DefaultCapoTestHelper);
    });

    describe("helperState.offchainData population on build", () => {
        it("populates helperState.offchainData when building actors snapshot", async ({ h }: CapoTC) => {
            // Clear any existing offchainData
            if (h.helperState) {
                h.helperState.offchainData = undefined;
            }

            // Build actors snapshot (not from cache)
            await h.snapToBootstrapWithActors();

            // Verify offchainData is populated in helperState (not just on disk)
            expect(h.helperState?.offchainData).toBeDefined();
            expect(h.helperState?.offchainData?.[SNAP_ACTORS]).toBeDefined();
            expect(h.helperState?.offchainData?.[SNAP_ACTORS]?.actorWallets).toBeDefined();
            expect(h.helperState?.offchainData?.[SNAP_ACTORS]?.targetSeedUtxo).toBeDefined();
        });

        it("populates helperState.offchainData when building non-genesis snapshot", async ({ h }: CapoTC) => {
            // Full bootstrap
            await h.reusableBootstrap();

            // Verify offchainData is populated for capoInit
            expect(h.helperState?.offchainData).toBeDefined();
            expect(h.helperState?.offchainData?.[SNAP_CAPO_INIT]).toBeDefined();
            expect(h.helperState?.offchainData?.[SNAP_CAPO_INIT]?.capoConfig).toBeDefined();
        });
    });

    describe("Actor setting after build", () => {
        it("sets actor correctly after building actors snapshot", async ({ h }: CapoTC) => {
            await h.snapToBootstrapWithActors();

            // Actor should be set after build (not undefined)
            expect(h.actorName).toBeDefined();
            expect(h.currentActor()).toBeDefined();
        });

        it("sets actor correctly after building non-genesis snapshot", async ({ h }: CapoTC) => {
            await h.reusableBootstrap();

            // Actor should be set to default actor after bootstrap
            expect(h.actorName).toBeDefined();
            expect(h.currentActor()).toBeDefined();
        });

        it("sets specified actor when decorator specifies non-default actor", async ({ h }: CapoTC) => {
            // This test requires a custom snapshot with a specific actor
            // For now, verify that after bootstrap, we can set a specific actor
            await h.reusableBootstrap();

            await h.setActor("tracy");
            expect(h.actorName).toBe("tracy");
        });
    });

    describe("Uniform load path for freshly-built vs cached", () => {
        it("freshly-built snapshot has same helperState setup as cache hit", async ({ h }: CapoTC) => {
            // First run - builds from scratch
            await h.reusableBootstrap();

            // Capture state after fresh build
            const freshOffchainData = { ...h.helperState?.offchainData };
            const freshActorName = h.actorName;
            const freshCapo = h.strella;

            // Verify we have the expected state
            expect(freshOffchainData[SNAP_CAPO_INIT]?.capoConfig).toBeDefined();
            expect(freshActorName).toBeDefined();
            expect(freshCapo).toBeDefined();
            expect(freshCapo.mintingPolicyHash).toBeDefined();

            // Clear in-memory cache to force disk load on next access
            (h.snapshotCache as any).loadedSnapshots.clear();
            h.helperState!.offchainData = undefined;

            // Create new helper to simulate cache hit scenario
            // (In practice, this would be a new test in the same file)
            // For this test, we just verify the state was set correctly on build
        });
    });
});
```

**Note**: The "uniform load path" test is hard to fully verify in a single test because it requires comparing build vs cache-hit behavior. The key verification is that:
1. `helperState.offchainData[snapshotName]` is populated after build (not just on cache hit)
2. Actor is set after build (not just on cache hit)
3. Capo reconstruction runs after build (implicitly verified by having a working Capo)

## Rollback Plan

The refactoring is internal to `findOrCreateSnapshot()`. If issues arise:
1. Revert to current implementation
2. Keep the `snapMethod` registration (it's still useful)
3. Apply targeted fixes instead of full restructuring

## Success Criteria

### Functional
- [ ] Uncached child with uncached parent builds entire chain (recursive resolution)
- [ ] Uncached child with cached parent loads parent state before building child
- [ ] Cache hits load without rebuilding (no regression)
- [ ] Freshly-built snapshots go through same `loadCachedSnapshot()` path as cache hits

### Data Integrity
- [ ] `helperState.offchainData[snapshotName]` is populated for both freshly-built and cached snapshots
- [ ] `helperState.namedRecords` defensive check throws if missing
- [ ] Actor wallets restored from genesis snapshot's offchainData
- [ ] Pre-selected seedUtxo restored from genesis snapshot's offchainData
- [ ] Capo reconstruction decision tree produces same results as before

### Diagnostics
- [ ] `logSnapshotRestoreDiagnostics()` compares stored vs current Capo state on every non-genesis load
- [ ] Address mismatch warnings appear when storedCapoAddr !== currentCapoAddr
- [ ] UTxO count drop warnings appear when current count is 0 but stored was > 0
- [ ] `_diag` in offchainData includes `utxoCountAtCapoAddr` and `addressUtxoKeys`

### Structure
- [ ] Single recursive chokepoint in `ensureSnapshotCached()`
- [ ] Uniform loading in `loadCachedSnapshot()` for all paths
- [ ] `handleCapoReconstruction()` encapsulates the decision tree
- [ ] `buildOffchainData()` encapsulates offchain data construction

## Concern Mapping: Old → New

Every detail handled in the old scattered code must map to the new unified structure:

| Concern | Old Location | New Location |
|---------|--------------|--------------|
| Memory cache lookup | `snapshotCache.find()` | `ensureSnapshotCached()` via `snapshotCache.find()` |
| Disk cache lookup | `snapshotCache.find()` | `ensureSnapshotCached()` via `snapshotCache.find()` |
| Parent chain resolution | `findOrCreateSnapshot` lines 1031-1051 (partial) | `ensureSnapshotCached()` recursive `snapMethod.call()` |
| Load snapshot into network | HIT: line 841, MISS: not done! | `loadCachedSnapshot()` - uniform |
| Merge namedRecords | HIT: line 842, MISS: line 1050 | `loadCachedSnapshot()` - uniform |
| Store offchainData in helperState | HIT: lines 845-850 | `loadCachedSnapshot()` - uniform |
| Genesis snapshot: restore actors | HIT: lines 852-861 | `loadCachedSnapshot()` `isGenesisSnapshot` branch |
| Genesis snapshot: restore seedUtxo | HIT: lines 863-867 | `loadCachedSnapshot()` `isGenesisSnapshot` branch |
| Non-genesis: Capo reconstruction | HIT: lines 881-926 | `handleCapoReconstruction()` called from `loadCachedSnapshot()` |
| Set actor | HIT: lines 928-932, MISS: not done! | `loadCachedSnapshot()` - uniform |
| Mark charter as minted | HIT: lines 922-926 | `handleCapoReconstruction()` |
| Diagnostics logging | HIT: lines 934-967 | `logSnapshotRestoreDiagnostics()` called from `loadCachedSnapshot()` |
| Build via contentBuilder | MISS: line 1058 | `ensureSnapshotCached()` |
| Capture snapshot | MISS: lines 1070-1071 | `ensureSnapshotCached()` |
| Compute parentHash | MISS: lines 1075-1078 | `ensureSnapshotCached()` |
| Build offchainData for storage | MISS: lines 1080-1130 | `buildOffchainData()` (also populates `helperState.offchainData`) |
| Store to cache | MISS: line 1127 | `ensureSnapshotCached()` |
| Tick network after build | contentBuilder wrapper in SnapWrap | Unchanged (stays in SnapWrap) |

**Key fixes in new structure:**
1. "Load snapshot into network" - old MISS path didn't do this after build!
2. "Set actor" - old MISS path didn't do this after build!
3. "Merge namedRecords" - old MISS path did this for parent, but not uniformly after build
4. Parent resolution - old code only loaded parent if already cached; new code builds parent recursively

---

## Audit Findings (2026-02-05)

Comparison of proposed code against current implementation (`CapoTestHelper.ts` lines 878-1147) to ensure all concerns are preserved.

### Critical Issues (Fixed Above)

**helperState.offchainData not populated during build**: The current code (lines 1100-1104, 1125-1129) sets `helperState.offchainData[snapshotName] = offchainData` after building. This is essential for in-memory cache access within the same test run. The original proposed `buildOffchainData()` returned the data but didn't populate helperState. Fixed in Step 4 above.

**Defensive namedRecords check missing**: Current code (lines 1082-1087) throws an explicit error if `helperState.namedRecords` is undefined before building the CachedSnapshot. This catches silent failures from `ensureHelperState()`. Added to `ensureSnapshotCached()` above.

**Diagnostic logging completely absent**: Current code has 33 lines (987-1020) comparing stored vs current Capo state after every non-genesis cache restore. This is essential for debugging address mismatches, validator hash differences, and UTxO loading failures. Added as `logSnapshotRestoreDiagnostics()` in Step 4b above.

**Incomplete _diag fields**: Current code stores `utxoCountAtCapoAddr` and `addressUtxoKeys` in the `_diag` object. These are critical for diagnosing snapshot restore issues. Added to `buildOffchainData()` above.

### Important Issues (Fixed Above)

**Warning log for missing actorWallets**: Current code (line 912) warns when no actor wallet keys are found in cache, indicating the cache may need rebuild. Added to `loadCachedSnapshot()` genesis branch.

**Seed UTxO restoration log**: Current code (line 919) logs when the pre-selected seed UTxO is restored, confirming the restoration worked. Added to `loadCachedSnapshot()` genesis branch.

**Console logs for reconstruction branches**: Current code (lines 944, 960, 965) logs which Capo reconstruction path was taken. Added to `handleCapoReconstruction()` above.

### Structural Note: try/finally Pattern

Current code uses a `try/finally` pattern with a `succeeded` flag to ensure the snapshot is stored even if code after `contentBuilder()` throws. The proposed code doesn't use this pattern—if something throws between build and store, the built snapshot is lost.

This is acceptable for now because:
1. Nothing currently throws between build and store
2. The failure mode (having to rebuild) is annoying but not catastrophic
3. Adding try/finally complicates the cleaner flow

If this becomes a problem in practice, wrap the build+store section in try/finally.

### Verified: Parent Re-find After Build

The proposed code already handles this correctly at lines 156-161: after calling `parentReg.snapMethod.call(this)`, it re-fetches the parent from cache and throws if not found. This matches the current code's behavior at line 1039.

---

## Coder Report

- **Completed**: 2026-02-05
- **Commit**: (pending)

### Summary
Refactored `findOrCreateSnapshot()` into a single chokepoint pattern with extracted helper methods: `ensureSnapshotCached()`, `loadCachedSnapshot()`, `handleCapoReconstruction()`, `buildOffchainData()`, and `logSnapshotRestoreDiagnostics()`. All 39 snapshot cache tests pass, plus broader test 02 suite (57 tests).

### Clarifications
| Question | Resolution |
|----------|------------|
| `SnapshotRegistryEntry` type location | Imported from `SnapshotCache.ts` where it's already defined |
| `parentCacheKey` field requirement | Added to `CachedSnapshot` object with `null` value (deprecated but still required by type) |

#### Tasks Added
- None

### Requirements Addressed
| REQT ID | Label | Status |
|---------|-------|--------|
| REQT-3.4 | Offchain Data Storage | Implemented via `buildOffchainData()` + `loadCachedSnapshot()` |
| REQT-3.6.5 | Capo Reconstruction Decision Tree | Implemented via `handleCapoReconstruction()` |
| REQT-1.2.10.3 | In-Memory Cache | Maintained via `loadedSnapshots` Map usage |

### Files Changed
- `src/testing/CapoTestHelper.ts` — Refactored `findOrCreateSnapshot()` and added 5 helper methods (+292/-230 lines)

### Architectural Alignment
- ARCH-7jcyqx1mg8: Single chokepoint pattern implemented as specified
- ARCH-rmegyaj58k: Parent chain resolution now recursive and guaranteed
- ARCH-1d82vckcae: SnapshotCache interface unchanged, consumer refactored

### Blockers & Stubs
| Issue | Location | Suggested Resolution |
|-------|----------|---------------------|
| None | - | - |

### Out-of-Scope Observations
- The `try/finally` pattern was intentionally omitted per audit findings (acceptable tradeoff for cleaner code)

### Questions Raised
- None
