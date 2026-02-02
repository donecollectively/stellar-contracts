# StellarNetworkEmulator & Testing Infrastructure - Architecture

*Architecture for performant off-chain testing infrastructure with snapshot caching and automatic invalidation.*

## Interview Status

- **Phase**: Complete
- **Checkpoint**: architect.interview: checkpoint ok
- **Deep Interview**: deep-architect.interview: complete

---

## The Tension

**Performant off-chain testing**: The testing infrastructure must support productive development cycles by minimizing test setup time. Key concerns:
- Contract compilation speed
- Test parallelization
- **Snapshot caching** (primary lever)

---

## Components and Concerns

| ARCH-UUT | Name | Location | Summary |
|----------|------|----------|---------|
| ARCH-66aqs3r84y | StellarNetworkEmulator | local | Blockchain simulation, UTxO tracking, snapshot capture/restore |
| ARCH-55szp2ppsa | SimpleWallet_stellar | local | Deterministic test wallets |
| ARCH-1d82vckcae | SnapshotCache | local | On-disk snapshot persistence with hash-based invalidation |
| ARCH-9zwezje927 | CachedHeliosProgram | local | Compilation cache with cross-process locking |
| ARCH-8cz4vp59xv | HeliosScriptBundle | local | Contract bundling, dependency tracking, source hashes |
| ARCH-rw8jqbj00a | CapoTestHelper | local | Snapshot orchestration, namedRecords, owns Capo instance |
| ARCH-41p1r2qpsq | StellarTestHelper | local | Actor management, wallet transfer |

### Concerns Summary

| Concern | Type | Owner | Dependents |
|---------|------|-------|------------|
| Emulator state | artifact | StellarNetworkEmulator | CapoTestHelper, SnapshotCache |
| Snapshot chain | artifact | SnapshotCache | CapoTestHelper |
| Cache files | artifact | SnapshotCache | - |
| Bundle hashes | artifact | HeliosScriptBundle | SnapshotCache |
| Compile cache | artifact | CachedHeliosProgram | HeliosScriptBundle |
| namedRecords | artifact | CapoTestHelper | Persisted with snapshot, restored on load |
| Actor wallets | resource | StellarTestHelper | CapoTestHelper |
| PRNG seed | resource | StellarNetworkEmulator | SnapshotCache |
| Snapshot provenance | artifact | StellarNetworkEmulator | Debugging/logging (cleared on pushBlock) |

---

## Components

### ARCH-66aqs3r84y: StellarNetworkEmulator

**Location**: local/internal

**Activities**:
- Simulate blockchain state
- Track UTxOs (create, consume, query)
- Produce blocks from mempool
- Validate transactions
- Capture/restore in-memory snapshots
- Track snapshot provenance (`fromSnapshot`, cleared on `pushBlock()`)

**Concerns**:
- Owns **Emulator state** (blocks, UTxOs, slot, consumed set)
- Owns **PRNG seed** for deterministic continuation
- Owns **Snapshot provenance** (`fromSnapshot` field for debugging/logging)

---

### ARCH-55szp2ppsa: SimpleWallet_stellar

**Location**: local/internal

**Activities**:
- Generate deterministic wallets from PRNG
- Sign transactions
- Query UTxOs from network

**Concerns**:
- Contributes to **Actor wallets**

---

### ARCH-1d82vckcae: SnapshotCache

**Location**: local/internal (new component)

**Activities**:
- Persist snapshots to `.stellar/emulator/`
- Load snapshots from disk
- Compute cache keys from bundle hashes + params
- Manage freshness (touch files > 1 day old)
- Invalidate stale entries automatically via hash mismatch

**Concerns**:
- Owns **Cache files** (`.stellar/emulator/`)
- Owns **Snapshot chain** hierarchy (base → capoInitialized → enabledDelegatesDeployed → app)
- Depends on **Bundle hashes** for cache key computation
- Depends on **namedRecords** (persists with snapshot)

---

### ARCH-9zwezje927: CachedHeliosProgram

**Location**: local/internal

**Activities**:
- Compile Helios to UPLC
- Cache compiled programs
- Coordinate cross-process locking

**Concerns**:
- Owns **Compile cache**
- Provides `sourceHashIndex()` pattern for bundle hashing

---

### ARCH-8cz4vp59xv: HeliosScriptBundle

**Location**: local/internal

**Activities**:
- Bundle contract scripts with dependencies
- Track script dependencies
- Expose source hashes via `getEffectiveModuleList()`

**Concerns**:
- Owns **Bundle hashes** computation
- Depends on **Compile cache** (pattern reuse)

---

### ARCH-rw8jqbj00a: CapoTestHelper

**Location**: local/internal

**Activities**:
- Orchestrate snapshot chains via `@hasNamedSnapshot` decorator
- Manage namedRecords (capture and lookup)
- Define `resolveScriptDependencies()` for cache key computation
- Recompute cache keys on demand via `getSnapshotCacheKey()`
- Own Capo instance

**Concerns**:
- Owns **namedRecords**
- Depends on **Snapshot chain** via SnapshotCache
- Depends on **Capo** for bundle hash resolution
- Depends on **helperState.snapshots** for parent block hashes (used in cache key recomputation)

---

### ARCH-41p1r2qpsq: StellarTestHelper

**Location**: local/internal

**Activities**:
- Manage test actors
- Transfer wallets across snapshot restores

**Concerns**:
- Owns **Actor wallets**
- Depends on **Emulator state**

---

## Interfaces

| ARCH-UUT | Interface | Mechanism | Direction | Payload |
|----------|-----------|-----------|-----------|---------|
| ARCH-aydwtq95c3 | CapoTestHelper → SnapshotCache | function call | Helper initiates | cache key, snapshot name, namedRecords |
| ARCH-ae9pa14a5a | CapoTestHelper → StellarNetworkEmulator | function call | Helper initiates | snapshot operations |
| ARCH-te1et77ze7 | CapoTestHelper → Capo | property access | Helper initiates | bundle hash resolution |
| ARCH-0qtqvk6a41 | Capo → HeliosScriptBundle | function call | Capo initiates | getEffectiveModuleList() |
| ARCH-ncvrj0ps07 | StellarTestHelper → StellarNetworkEmulator | function call | Helper initiates | wallet transfer, snapshot restore |

### ARCH-aydwtq95c3: CapoTestHelper → SnapshotCache

**Mechanism**: function call
**Direction**: CapoTestHelper initiates
**Payload**: cache key (from resolveScriptDependencies), snapshot name, namedRecords
**Errors**: Cache miss triggers snapshot creation; hash mismatch triggers rebuild

### ARCH-ae9pa14a5a: CapoTestHelper → StellarNetworkEmulator

**Mechanism**: function call
**Direction**: CapoTestHelper initiates
**Payload**: NetworkSnapshot for capture/restore
**Errors**: Mempool non-empty on snapshot attempt

### ARCH-te1et77ze7: CapoTestHelper → Capo

**Mechanism**: property access / function call
**Direction**: CapoTestHelper initiates
**Payload**: Bundle references, enabled delegates list, featureFlags
**Errors**: None expected

---

## Interface Contracts (Deep Interview)

### SnapshotDecoratorOptions

**Ownership**: Per-snapshot, declared in `@hasNamedSnapshot` decorator options

**Signature**:
```typescript
@hasNamedSnapshot("snapshotName", {
  actor: "actorName",
  parentSnapName: "parentSnapshotName",
  resolveScriptDependencies: (helper) => CacheKeyInputs
})

type ParentSnapName =
    | "genesis"                         // root level (no parent)
    | "bootstrapWithActors"             // actors initialized
    | "capoInitialized"                 // capo charter minted
    | "enabledDelegatesDeployed"        // delegates deployed
    | "bootstrapped"                    // symbolic alias → "enabledDelegatesDeployed"
    | (string & {});                    // custom snapshot name

type SnapshotDecoratorOptions = {
  actor: string;                        // actor to set after loading
  parentSnapName: ParentSnapName;       // explicit parent snapshot name
  resolveScriptDependencies?: ScriptDependencyResolver;
}

type ScriptDependencyResolver = (helper: CapoTestHelper) => Promise<CacheKeyInputs>;

type CacheKeyInputs = {
  bundles: Array<{
    name: string;
    sourceHash: string;
    params: Record<string, unknown>;
  }>;
  extra?: Record<string, unknown>;  // closure-captured details
}
```

**Built-in Parent Relationships**:
- `bootstrapWithActors` → parent: `"genesis"`
- `capoInitialized` → parent: `"bootstrapWithActors"`
- `enabledDelegatesDeployed` → parent: `"capoInitialized"`
- App snapshots → typically parent: `"enabledDelegatesDeployed"`

**Resolution Flow**:
1. `snapToX()` called
2. Read `parentSnap` from decorator options
3. Recursively ensure parent loaded: `ensureSnapshot(parentSnap)`
4. Call `resolveScriptDependencies(helper)` → cache key inputs
5. Compute cache key: `hash(parent.snapshotHash + inputs)`
6. Build cache path: `parent.path + "{name}-{cacheKey}/"`
7. Check cache → hit: load incremental; miss: run builder, store

See `snapshot-resolution.md` for detailed recursive walk-through.

**Default Resolver**: Iterates Capo's enabled delegates via `delegateRoles`, calls each bundle's `getEffectiveModuleList()`, hashes `source.content` for each.

### Built-in Resolvers (CapoTestHelper)

```typescript
// For capoInitialized snapshot
resolveCoreCapoDependencies(): CacheKeyInputs {
  return {
    bundles: [
      this.capo.minterBundle.getCacheKeyInputs(),
      this.capo.mintDelegateBundle.getCacheKeyInputs(),
      this.capo.spendDelegateBundle.getCacheKeyInputs(),
    ],
    extra: { heliosVersion: VERSION }
  };
}

// For enabledDelegatesDeployed snapshot
resolveEnabledDelegatesDependencies(): CacheKeyInputs {
  const coreBundles = this.resolveCoreCapoDependencies().bundles;
  const delegateBundles = Object.values(this.capo.delegateRoles)
    .filter(d => this.capo.featureEnabled(d.typeName))
    .map(d => d.bundle.getCacheKeyInputs());

  return {
    bundles: [...coreBundles, ...delegateBundles],
    extra: { heliosVersion: VERSION }
  };
}
```

App snapshots inherit from `enabledDelegatesDeployed` and typically don't add new scripts.

### SnapshotCache API

**Location**: `.stellar/emulator/{snapshotName}-{cacheKey}.json`

```typescript
class SnapshotCache {
  // Look up cached snapshot by key and name
  find(cacheKey: string, snapshotName: string): Promise<CachedSnapshot | null>

  // Store snapshot with key (name extracted from snapshot.name)
  store(cacheKey: string, snapshot: CachedSnapshot): Promise<void>

  // Check if cached snapshot exists
  has(cacheKey: string, snapshotName: string): boolean

  // Delete cached snapshot
  delete(cacheKey: string, snapshotName: string): boolean

  // Compute cache key from inputs
  computeKey(parentHash: string | null, inputs: CacheKeyInputs): string
}

type CachedSnapshot = {
  snapshot: NetworkSnapshot;       // the network snapshot data
  namedRecords: Record<string, string>;
  parentSnapName: ParentSnapName;  // parent snapshot name ("genesis" for root)
  parentHash: string | null;       // parent's snapshotHash (for verification)
  parentCacheKey: string | null;   // parent's cache key for O(1) chain loading
  snapshotHash: string;            // this snapshot's resulting block hash
}
```

**File Naming**:
- Pattern: `{snapshotName}-{cacheKey}.json` (e.g., `bootstrapWithActors-a1b2c3d4.json`)
- Snapshot names sanitized: alphanumeric, underscore, hyphen only; max 50 chars
- Multiple files with same name but different hashes is expected (code changes produce new hashes)

**Behavior**:
- `find()`: Returns null on miss; touches file if mtime > 1 day
- `store()`: Extracts name from `snapshot.snapshot.name`; writes JSON
- `computeKey()`: `hash(parentHash + JSON.stringify(inputs))`

### Snapshot State Management

#### Network Provenance Tracking

The emulator tracks **where its current state came from** via `fromSnapshot` for debugging/logging. This is provenance metadata, not caching state.

```typescript
class StellarNetworkEmulator {
  /** Name of snapshot this state was loaded from, or "" if fresh/diverged */
  fromSnapshot: string = "";
}
```

**Lifecycle Rules**:

| Event | Action | Rationale |
|-------|--------|-----------|
| Constructor | `fromSnapshot = ""` | Fresh network, no snapshot provenance |
| `loadSnapshot(snap)` | `fromSnapshot = snap.name` | State now matches a known snapshot |
| `pushBlock(txs)` | `fromSnapshot = ""` | State has diverged—new blocks committed |
| `tick()` with empty mempool | No change | Slot advanced but state unchanged |
| `snapshot(name)` | No change | Captures state, doesn't modify it |

#### Cache Key Recomputation

**Design Decision**: Cache keys are **recomputed on demand**, not stored in a Map.

**Rationale**:
- Cache key computation is deterministic: `computeKey(parentHash, resolverInputs)`
- All inputs are always available: `helperState.snapshots[parent].blockHashes[-1]` + resolver methods
- Computation cost is negligible (JSON stringify + blake2b)
- Eliminates state synchronization between Map and actual snapshots

**Helper Function Pattern** (CapoTestHelper):

```typescript
async getSnapshotCacheKey(snapName: ParentSnapName): Promise<string | null> {
  switch (snapName) {
    case "genesis":
      return null;
    case SNAP_ACTORS:
      return this.snapshotCache.computeKey(null, this.resolveActorsDependencies());
    case SNAP_CAPO_INIT: {
      const parentHash = this.getSnapshotBlockHash(SNAP_ACTORS);
      return this.snapshotCache.computeKey(parentHash, await this.resolveCoreCapoDependencies());
    }
    case SNAP_DELEGATES:
    case "bootstrapped": {
      const parentHash = this.getSnapshotBlockHash(SNAP_CAPO_INIT);
      return this.snapshotCache.computeKey(parentHash, await this.resolveEnabledDelegatesDependencies());
    }
    default:
      // App snapshots build on SNAP_DELEGATES
      return this.getSnapshotCacheKey(SNAP_DELEGATES);
  }
}

private getSnapshotBlockHash(snapName: string): string {
  return this.helperState?.snapshots[snapName]?.blockHashes?.slice(-1)[0] ?? "genesis";
}
```

**When Saving Child Snapshots**:

```typescript
// Get parent's cache key via recomputation
const parentCacheKey = await this.getSnapshotCacheKey(parentSnapName);

const cachedSnapshot: CachedSnapshot = {
  snapshot,
  parentSnapName,
  parentHash: this.getSnapshotBlockHash(parentSnapName),
  parentCacheKey,  // For O(1) lookup during chain loading
  snapshotHash: this.network.lastBlockHash,
  namedRecords: {},
};
```

### Block Hash Computation

Block hashes computed at commit time in `StellarNetworkEmulator.tick()`. Uses parallel tracking to maintain Helios `Emulator` interface compatibility:

```typescript
class StellarNetworkEmulator implements Emulator {
  blocks: EmulatorTx[][];     // required by Helios interface
  blockHashes: string[] = []; // parallel tracking for cache keys

  tick(slots: number = 1): void {
    if (this.mempool.length > 0) {
      const prevHash = this.blockHashes.length > 0
        ? this.blockHashes[this.blockHashes.length - 1]
        : "genesis";

      const txHashes = this.mempool.map(tx => tx.id().toString());
      const blockHash = blake2b([prevHash, ...txHashes].join("\n"));

      this.blockHashes.push(blockHash);
      this.blocks.push([...this.mempool]);
      this.mempool = [];
    }
  }

  get lastBlockHash(): string {
    return this.blockHashes.length > 0
      ? this.blockHashes[this.blockHashes.length - 1]
      : "genesis";
  }
}
```

- `blockHashes` tracked parallel to `blocks` for interface compatibility
- Snapshot's `snapshotHash` = `lastBlockHash`
- Snapshot/restore includes `blockHashes` alongside `blocks`

---

## Data Flow

### Workflow: Fresh Bootstrap (cache miss)

**ARCH-UUT**: ARCH-aydwtq95c3

1. **Test Suite** calls `reusableBootstrap()` on **CapoTestHelper**
2. **CapoTestHelper** calls `resolveScriptDependencies()` → cache key
3. **CapoTestHelper** checks **SnapshotCache** for cache hit
4. Cache miss → **CapoTestHelper** runs bootstrap via **Capo**
5. **Capo** compiles contracts via **CachedHeliosProgram**
6. **CapoTestHelper** captures snapshot from **StellarNetworkEmulator**
7. **CapoTestHelper** stores snapshot + namedRecords in **SnapshotCache**

```
[Test] → [CapoTestHelper] → [SnapshotCache] → miss
                ↓
         [Capo] → [CachedHeliosProgram]
                ↓
    [StellarNetworkEmulator] → snapshot
                ↓
         [SnapshotCache] ← store
```

### Workflow: Cached Bootstrap (cache hit)

1. **Test Suite** calls `reusableBootstrap()` on **CapoTestHelper**
2. **CapoTestHelper** calls `resolveScriptDependencies()` → cache key
3. **CapoTestHelper** checks **SnapshotCache** → cache hit
4. **SnapshotCache** loads snapshot + namedRecords from disk
5. **CapoTestHelper** restores to **StellarNetworkEmulator**
6. **StellarTestHelper** transfers actor wallets

```
[Test] → [CapoTestHelper] → [SnapshotCache] → hit → load
                ↓
    [StellarNetworkEmulator] ← restore
                ↓
      [StellarTestHelper] ← wallet transfer
```

### Workflow: Cache Invalidation

1. Source file changes → bundle hash changes
2. Next test run computes new cache key
3. Old cache key not found → treated as cache miss
4. Old cache files age out (> 1 week) and get cleaned up

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Snapshot hierarchy** (base → capoInitialized → enabledDelegatesDeployed → app) | Natural layering matches test setup stages |
| **Source hash, not UPLC** | Compilation is slow; source hashes achieve same invalidation |
| **CapoTestHelper owns SnapshotCache interaction** | Helper knows the Capo; keeps emulator focused on simulation |
| **`resolveScriptDependencies()` pattern** | Enables cache-key pre-computation for dynamic scripts/params |
| **namedRecords persisted with snapshot** | Tests need record IDs after restore |
| **Touch files > 1 day old** | Keeps recently-used caches fresh for cleanup detection |
| **`.stellar/emulator/` location** | Project-local, gitignore-able |
| **Helios VERSION in cache key** | Compiler changes could affect output |
| **autoSetup + featureFlags** | autoSetup triggers iteration; featureFlags filters which deploy |
| **Human-readable filenames** `{name}-{key}.json` | Enables `ls bootstrapWithActors-*`, debugging, targeted cleanup |
| **`parentCacheKey` in CachedSnapshot** | O(1) parent file lookup for incremental storage (vs scanning all files) |
| **Cache key recomputation** | No Map needed—resolvers are deterministic, parent hashes stored in helperState |
| **`fromSnapshot` cleared on pushBlock** | Provenance tracking; diverged state shouldn't claim snapshot identity |

---

## Collaboration Summary

**Uses**:
- `@helios-lang/compiler` (VERSION, compilation)
- `@helios-lang/tx-utils` (Emulator interface)
- `@helios-lang/crypto` (blake2b hashing)
- Node fs (cache file I/O)

**Used by**:
- All Stellar Contracts test suites
- Custom Capo test helpers

---

## Open Questions

- [x] ~~Where does `resolveScriptDependencies` live?~~ → Per-snapshot, in decorator options; built-in resolvers on CapoTestHelper
- [x] ~~namedRecords serialization format~~ → Inline JSON with blocks in CachedSnapshot
- [x] ~~Block hash computation~~ → Parallel `blockHashes[]` computed at tick(), maintains Helios interface compatibility
- [x] ~~Project root detection~~ → Walk up to find package.json
- [x] ~~Cleanup command~~ → `find .stellar/emulator -mtime +7 | xargs rm`
- [x] ~~Parent cache key tracking~~ → Recompute via `getSnapshotCacheKey()`; no Map needed. See "Cache Key Recomputation" section.

---

## Discovery Notes

### Phase 1 Findings
- Primary tension: performant off-chain testing
- Key levers: compilation caching (exists), snapshot caching (proposed)
- All components local TypeScript; no remote services

### Phase 2 Findings
- CachedHeliosProgram already has `sourceHashIndex()` pattern
- namedRecords must persist with snapshots for test helper functionality

### Phase 3 Findings
- Snapshot chain: base → capoInitialized → enabledDelegatesDeployed → app
- autoSetup and featureFlags work together without conflict

### Phase 4 Findings
- resolveScriptDependencies() pattern solves dynamic script/params case
- CapoTestHelper should own SnapshotCache interaction (not emulator)

---

## Related Documents

- `./Emulator.reqts.md` - Detailed requirements
- `../../reference/essential-stellar-testing.md` - Testing conventions
- `../CapoTestHelper.ts` - Snapshot orchestration implementation
- `../../helios/CachedHeliosProgram.ts` - Compilation cache pattern
