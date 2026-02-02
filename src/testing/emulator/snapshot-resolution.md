# Snapshot Resolution: Recursive Walk-Through

This document illustrates the recursive resolution of nested snapshot caches, showing how symbolic snapshot names resolve to concrete cache-keyed directory paths.

## Scenario

- **Levels 1-3** (actors, capoInit, delegates): Already cached (cache HIT)
- **Levels 4-5** (app snapshots): Not cached (cache MISS, will be created)

## Snapshot Declarations

Each snapshot explicitly declares its parent via `parentSnap`:

```typescript
// Built-in snapshots (in CapoTestHelper)
// bootstrapWithActors      → parentSnap: "genesis"
// capoInitialized          → parentSnap: "bootstrapWithActors"
// enabledDelegatesDeployed → parentSnap: "capoInitialized"

// App-level snapshots (in test helper)
@hasNamedSnapshot("4-snap", {
    actor: "alice",
    parentSnap: "enabledDelegatesDeployed",
    resolveScriptDependencies: resolve4SnapDeps
})
async snapTo4Snap() { /* ... */ }

@hasNamedSnapshot("5-snap5", {
    actor: "alice",
    parentSnap: "4-snap",
    resolveScriptDependencies: resolve5SnapDeps
})
async snapTo5Snap5() { /* ... */ }
```

## Directory Structure (Final State)

```
.stellar/emu/
└── bootstrapWithActors-AAAAAA/
    ├── snapshot.json
    └── capoInitialized-CICICICI/
        ├── snapshot.json
        └── enabledDelegatesDeployed-CDCDCD/
            ├── snapshot.json
            └── 4-snap-444444/          ← created during this run
                ├── snapshot.json
                └── 5-snap5-55555/      ← created during this run
                    └── snapshot.json
```

## Resolution Sequence

### Entry Point

```typescript
// Test calls:
await helper.snapTo5Snap5();
```

### Phase 1: Recursive Descent (Reading parentSnap declarations)

The resolution starts by recursively following `parentSnap` declarations:

```
ensureSnapshot("5-snap5")
│   decorator says: parentSnap = "4-snap"
│
├─► ensureSnapshot("4-snap")
│   │   decorator says: parentSnap = "enabledDelegatesDeployed"
│   │
│   ├─► ensureSnapshot("enabledDelegatesDeployed")
│   │   │   built-in: parentSnap = "capoInitialized"
│   │   │
│   │   ├─► ensureSnapshot("capoInitialized")
│   │   │   │   built-in: parentSnap = "bootstrapWithActors"
│   │   │   │
│   │   │   ├─► ensureSnapshot("bootstrapWithActors")
│   │   │   │   │   built-in: parentSnap = "genesis"
│   │   │   │   │
│   │   │   │   └─► BASE CASE: "genesis" means reset network to empty
│   │   │   │
│   │   │   └─ (waiting for bootstrapWithActors)
│   │   │
│   │   └─ (waiting for capoInitialized)
│   │
│   └─ (waiting for enabledDelegatesDeployed)
│
└─ (waiting for 4-snap)
```

### Phase 2: Recursive Ascent (Load/Create from Root)

Now we unwind the stack, loading or creating each level:

---

#### Level 1: "1-actors"

```typescript
ensureSnapshot("1-actors") {
    // Parent is genesis
    requiredParentHash = "genesis"

    // Check network state
    assert(network.lastBlockHash === "genesis")  // ✓ Fresh network

    // Compute cache key
    inputs = resolveActorsDependencies()
    // → { bundles: [], extra: { actors: [...], randomSeed: 42, heliosVersion: "0.17.0" } }

    cacheKey = computeKey(null, inputs)
    // → "AAAAAA"

    cachePath = "emu/1-actors-AAAAAA/"

    // Check cache
    if (exists(cachePath)) {                     // ✓ EXISTS (cache HIT)
        meta = readJson(cachePath + "snapshot.json")

        // Verify parent hash
        assert(meta.parentHash === null)         // ✓ Root snapshot

        // Apply blocks
        applyIncrementalBlocks(meta.blocks)

        // Verify result
        assert(network.lastBlockHash === meta.snapshotHash)
        // network.lastBlockHash is now "aaa111..."

        return { path: cachePath, hash: "aaa111..." }
    }
}
```

**Result**: Network at "aaa111...", path = `emu/1-actors-AAAAAA/`

---

#### Level 2: "2-capoInit"

```typescript
ensureSnapshot("2-capoInit") {
    // Parent is "1-actors"
    parent = ensureSnapshot("1-actors")          // ← Already done above
    requiredParentHash = parent.hash             // "aaa111..."

    // Check network state
    assert(network.lastBlockHash === "aaa111...") // ✓ At actors state

    // Compute cache key
    inputs = await resolveCoreCapoDependencies()
    // → { bundles: [capo, mintDelegate, spendDelegate], extra: { heliosVersion } }

    cacheKey = computeKey("aaa111...", inputs)
    // → "CICICICI"

    cachePath = parent.path + "2-capoInit-CICICICI/"
    // → "emu/1-actors-AAAAAA/2-capoInit-CICICICI/"

    // Check cache
    if (exists(cachePath)) {                     // ✓ EXISTS (cache HIT)
        meta = readJson(cachePath + "snapshot.json")

        // Verify parent hash matches
        assert(meta.parentHash === "aaa111...")  // ✓ Correct parent

        // Apply incremental blocks
        applyIncrementalBlocks(meta.blocks)

        // Verify result
        assert(network.lastBlockHash === meta.snapshotHash)
        // network.lastBlockHash is now "bbb222..."

        return { path: cachePath, hash: "bbb222..." }
    }
}
```

**Result**: Network at "bbb222...", path = `emu/1-actors-AAAAAA/2-capoInit-CICICICI/`

---

#### Level 3: "3-capo-dgts"

```typescript
ensureSnapshot("3-capo-dgts") {
    // Parent is "2-capoInit"
    parent = ensureSnapshot("2-capoInit")        // ← Already done above
    requiredParentHash = parent.hash             // "bbb222..."

    // Check network state
    assert(network.lastBlockHash === "bbb222...") // ✓ At capoInit state

    // Compute cache key
    inputs = await resolveEnabledDelegatesDependencies()
    // → { bundles: [core + namedDelegates + dgDataControllers], extra: { heliosVersion } }

    cacheKey = computeKey("bbb222...", inputs)
    // → "CDCDCD"

    cachePath = parent.path + "3-capo-dgts-CDCDCD/"
    // → "emu/1-actors-AAAAAA/2-capoInit-CICICICI/3-capo-dgts-CDCDCD/"

    // Check cache
    if (exists(cachePath)) {                     // ✓ EXISTS (cache HIT)
        meta = readJson(cachePath + "snapshot.json")

        // Verify parent hash
        assert(meta.parentHash === "bbb222...")  // ✓ Correct parent

        // Apply incremental blocks
        applyIncrementalBlocks(meta.blocks)

        // Verify result
        assert(network.lastBlockHash === meta.snapshotHash)
        // network.lastBlockHash is now "ccc333..."

        return { path: cachePath, hash: "ccc333..." }
    }
}
```

**Result**: Network at "ccc333...", path = `.../3-capo-dgts-CDCDCD/`

---

#### Level 4: "4-snap" (CACHE MISS)

```typescript
ensureSnapshot("4-snap") {
    // Parent is "3-capo-dgts"
    parent = ensureSnapshot("3-capo-dgts")       // ← Already done above
    requiredParentHash = parent.hash             // "ccc333..."

    // Check network state
    assert(network.lastBlockHash === "ccc333...") // ✓ At delegates state

    // Compute cache key
    inputs = await resolveLevel4Dependencies()
    // → { bundles: [...], extra: { ... } }

    cacheKey = computeKey("ccc333...", inputs)
    // → "444444"

    cachePath = parent.path + "4-snap-444444/"
    // → "emu/1-actors-AAAAAA/2-capoInit-CICICICI/3-capo-dgts-CDCDCD/4-snap-444444/"

    // Check cache
    if (exists(cachePath)) {                     // ✗ NOT EXISTS (cache MISS)
        // ...
    } else {
        // === CREATE SNAPSHOT ===

        // Run the snapshot builder
        await level4Builder()
        // This executes transactions, advances network state
        // network.lastBlockHash is now "ddd444..."

        // Create directory
        mkdir(cachePath)

        // Compute incremental blocks (since parent)
        incrementalBlocks = getBlocksSince(parent.hash)

        // Save snapshot
        writeJson(cachePath + "snapshot.json", {
            name: "4-snap",
            parentSnapName: "3-capo-dgts",
            parentHash: "ccc333...",           // parent's snapshotHash
            blocks: incrementalBlocks,          // only new blocks
            namedRecords: { ...capturedRecords },
            snapshotHash: "ddd444..."          // this snapshot's resulting hash
        })

        return { path: cachePath, hash: "ddd444..." }
    }
}
```

**Result**: Network at "ddd444...", path = `.../4-snap-444444/`, **snapshot.json created**

---

#### Level 5: "5-snap5" (CACHE MISS)

```typescript
ensureSnapshot("5-snap5") {
    // Parent is "4-snap"
    parent = ensureSnapshot("4-snap")            // ← Already done above
    requiredParentHash = parent.hash             // "ddd444..."

    // Check network state
    assert(network.lastBlockHash === "ddd444...") // ✓ At level-4 state

    // Compute cache key
    inputs = await resolveLevel5Dependencies()
    // → { bundles: [...], extra: { ... } }

    cacheKey = computeKey("ddd444...", inputs)
    // → "55555"

    cachePath = parent.path + "5-snap5-55555/"
    // → "emu/.../4-snap-444444/5-snap5-55555/"

    // Check cache
    if (exists(cachePath)) {                     // ✗ NOT EXISTS (cache MISS)
        // ...
    } else {
        // === CREATE SNAPSHOT ===

        // Run the snapshot builder
        await level5Builder()
        // network.lastBlockHash is now "eee555..."

        // Create directory
        mkdir(cachePath)

        // Compute incremental blocks
        incrementalBlocks = getBlocksSince(parent.hash)

        // Save snapshot
        writeJson(cachePath + "snapshot.json", {
            name: "5-snap5",
            parentSnapName: "4-snap",
            parentHash: "ddd444...",
            blocks: incrementalBlocks,
            namedRecords: { ...capturedRecords },
            snapshotHash: "eee555..."
        })

        return { path: cachePath, hash: "eee555..." }
    }
}
```

**Result**: Network at "eee555...", path = `.../5-snap5-55555/`, **snapshot.json created**

---

## Summary: Call Stack Trace

```
snapTo("5-snap5")
│
└─► ensureSnapshot("5-snap5")
    │   needs parent "4-snap"
    │
    └─► ensureSnapshot("4-snap")
        │   needs parent "3-capo-dgts"
        │
        └─► ensureSnapshot("3-capo-dgts")
            │   needs parent "2-capoInit"
            │
            └─► ensureSnapshot("2-capoInit")
                │   needs parent "1-actors"
                │
                └─► ensureSnapshot("1-actors")
                    │   needs parent: genesis ✓
                    │   cache: HIT ✓
                    │   load blocks, verify hash
                    └─► return { path: "emu/1-actors-AAAAAA/", hash: "aaa111..." }
                │
                │   cache: HIT ✓
                │   load blocks, verify hash
                └─► return { path: ".../2-capoInit-CICICICI/", hash: "bbb222..." }
            │
            │   cache: HIT ✓
            │   load blocks, verify hash
            └─► return { path: ".../3-capo-dgts-CDCDCD/", hash: "ccc333..." }
        │
        │   cache: MISS ✗
        │   run builder, save snapshot
        └─► return { path: ".../4-snap-444444/", hash: "ddd444..." }
    │
    │   cache: MISS ✗
    │   run builder, save snapshot
    └─► return { path: ".../5-snap5-55555/", hash: "eee555..." }

DONE: Network at "eee555...", ready for test
```

## Key Invariants

1. **Parent hash verification**: Before applying incremental blocks, `network.lastBlockHash` MUST equal `meta.parentHash`

2. **Path construction**: Each level's path = `parent.path + "{name}-{cacheKey}/"`

3. **Cache key computation**: `cacheKey = hash(parentSnapshotHash + inputs)` — requires parent to be loaded first

4. **Incremental storage**: Each `snapshot.json` contains only blocks created at that level, not ancestors

5. **Self-enforcing correctness**: You cannot compute a child's cache key without the parent's snapshotHash, which requires the parent to be loaded

## snapshot.json Structure

```typescript
{
    name: string;              // Human-readable snapshot name
    parentSnapName: string | null; // Parent's name (null for root)
    parentHash: string | null; // Parent's snapshotHash (for verification)
    blocks: SerializedBlock[]; // Only blocks created at THIS level
    namedRecords: Record<string, string>;
    snapshotHash: string;      // Resulting blockchain state hash
}
```

## Second Run (All Cache Hits)

On subsequent test runs with unchanged code:

```
snapTo("5-snap5")
└─► ensureSnapshot("5-snap5") → ensureSnapshot("4-snap") → ... → ensureSnapshot("1-actors")
    │
    └─► Level 1: HIT, load, verify ✓
        └─► Level 2: HIT, load, verify ✓
            └─► Level 3: HIT, load, verify ✓
                └─► Level 4: HIT, load, verify ✓
                    └─► Level 5: HIT, load, verify ✓

All levels loaded from cache. Network at "eee555...".
```
