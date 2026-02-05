# WU: Refactor Snapshot Resolution to Single Chokepoint

**ARCH-UUT**: ARCH-7jcyqx1mg8
**Status**: draft
**Relates to**: ARCH-rmegyaj58k (Build App Snapshot with Cached Parent), ARCH-1d82vckcae (SnapshotCache)

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
│   ├─ RECURSIVE: ensure parent is cached
│   │   ├─ get parentSnapName from registry
│   │   ├─ get parent's snapMethod from _snapshotRegistrations
│   │   ├─ await parentReg.snapMethod.call(this)  ← RECURSIVE!
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
    ├─ handle offchainData
    ├─ handle Capo reconstruction (if needed)
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
    let cached = await this.snapshotCache.find(snapshotName, this);
    if (cached) {
        return cached;
    }

    // 2. Cache miss - ensure parent is ready first (recursive)
    const entry = this.snapshotCache["registry"].get(snapshotName);
    const parentSnapName = entry?.parentSnapName;

    if (parentSnapName && parentSnapName !== "genesis") {
        // Get parent's snapMethod from static registrations
        const parentReg = (this.constructor as any)._snapshotRegistrations?.get(parentSnapName);

        if (parentReg?.snapMethod) {
            console.log(`  📦 ensuring parent '${parentSnapName}' is ready...`);
            // RECURSIVE: This calls the parent's SnapWrap, which calls findOrCreateSnapshot,
            // which calls ensureSnapshotCached for the parent, and so on up the chain
            await parentReg.snapMethod.call(this);
        } else {
            throw new Error(
                `Parent snapshot '${parentSnapName}' has no snapMethod registered. ` +
                `Ensure snapTo${parentSnapName[0].toUpperCase()}${parentSnapName.slice(1)}() ` +
                `exists with @hasNamedSnapshot decorator.`
            );
        }

        // Load parent state into emulator for building child
        const parentCached = await this.snapshotCache.find(parentSnapName, this);
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
            }
        }

        // Restore pre-selected seed UTxO
        if (!this.preSelectedSeedUtxo && cached.offchainData?.targetSeedUtxo) {
            this.preSelectedSeedUtxo = cached.offchainData.targetSeedUtxo as PreSelectedSeedUtxo;
        }
    } else {
        // Non-genesis snapshot: handle Capo reconstruction if needed
        await this.handleCapoReconstruction(cached, snapshotName);
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
        await this.restoreFrom(snapshotName);
    } else {
        // Fallback
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
 * @internal
 */
private buildOffchainData(
    snapshotName: string,
    entry: SnapshotRegistryEntry | undefined,
): Record<string, unknown> | undefined {
    const parentSnapName = entry?.parentSnapName || "genesis";

    if (parentSnapName === "genesis" && Object.keys(this.actors).length > 0) {
        // Genesis snapshot: store actor wallet keys and seed UTxO
        return {
            ...this.getActorWalletKeys(),
            targetSeedUtxo: this.preSelectedSeedUtxo,
        };
    }

    // Non-genesis: store capoConfig if available
    if (this.state.config) {
        return {
            capoConfig: this.state.config,
            _diag: {
                capoAddr: this.strella?.address?.toString(),
                validatorHash: this.strella?.validatorHash?.toHex(),
            },
        };
    }

    return undefined;
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

| File | Changes |
|------|---------|
| `src/testing/CapoTestHelper.ts` | Refactor `findOrCreateSnapshot()`, extract helper methods |

## Testing

1. **Fresh build test**: Delete `.stellar/emu/`, run a test that needs `proposeFirstAgreement` with parent `firstMember`. Verify entire chain builds correctly.

2. **Partial cache test**: Have `firstMember` cached but not `proposeFirstAgreement`. Verify parent is loaded and child builds on top.

3. **Full cache test**: Have both cached. Verify fast load without rebuilding.

4. **Deep chain test**: Test with 3+ levels of custom snapshots (e.g., `a` → `b` → `c`). Verify recursive resolution works.

## Rollback Plan

The refactoring is internal to `findOrCreateSnapshot()`. If issues arise:
1. Revert to current implementation
2. Keep the `snapMethod` registration (it's still useful)
3. Apply targeted fixes instead of full restructuring

## Success Criteria

- [ ] `proposeFirstAgreement` with uncached parent `firstMember` builds correctly
- [ ] Recursive parent resolution works for arbitrary depth
- [ ] Cache hits still work (no regression)
- [ ] Logging clearly shows the resolution path
- [ ] No scattered branching - single path through `ensureSnapshotCached()` → `loadCachedSnapshot()`
- [ ] All concerns from old code paths are preserved in new code paths (see mapping below)

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
| Diagnostics logging | HIT: lines 934-967 | `loadCachedSnapshot()` or `handleCapoReconstruction()` |
| Build via contentBuilder | MISS: line 1058 | `ensureSnapshotCached()` |
| Capture snapshot | MISS: lines 1070-1071 | `ensureSnapshotCached()` |
| Compute parentHash | MISS: lines 1075-1078 | `ensureSnapshotCached()` |
| Build offchainData for storage | MISS: lines 1080-1105 | `buildOffchainData()` called from `ensureSnapshotCached()` |
| Store to cache | MISS: line 1127 | `ensureSnapshotCached()` |
| Tick network after build | contentBuilder wrapper in SnapWrap | Unchanged (stays in SnapWrap) |

**Key fixes in new structure:**
1. "Load snapshot into network" - old MISS path didn't do this after build!
2. "Set actor" - old MISS path didn't do this after build!
3. "Merge namedRecords" - old MISS path did this for parent, but not uniformly after build
4. Parent resolution - old code only loaded parent if already cached; new code builds parent recursively
