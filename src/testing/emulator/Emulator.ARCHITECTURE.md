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
| Loaded snapshots | resource | SnapshotCache | helperState-scope cache keyed by `{name}:{cacheKey}` (REQT/d28gyvqegv); shared via `helperState.snapCache` |
| Bundle hashes | artifact | HeliosScriptBundle | SnapshotCache |
| Compile cache | artifact | CachedHeliosProgram | HeliosScriptBundle |
| namedRecords | artifact | CapoTestHelper | Persisted with snapshot, restored on load |
| Actor wallets | resource | StellarTestHelper | CapoTestHelper |
| PRNG seed | resource | StellarNetworkEmulator | SnapshotCache |
| Snapshot provenance | artifact | StellarNetworkEmulator | Debugging/logging (cleared on pushBlock) |
| Key inputs | artifact | SnapshotCache | Debugging, actor list access (ARCH-ja63e3bh8p) |
| Offchain data | artifact | SnapshotCache | Actor wallet keys, merged from parent chain (ARCH-75rh0ewd7a) |
| Single chokepoint resolution | resource | CapoTestHelper | Recursive parent resolution via `snapMethod`; uniform `loadCachedSnapshot()` path (ARCH-d52nrfd96z) |
| Stable actorContext envelope | resource | helperState | Singleton shared by all helpers and Capo; update contents not reference (ARCH-y70gqh4nwn, REQT/ch01gxgm4g) |

### Instance Lifetimes

| Object | Lifetime | Scope | Notes |
|--------|----------|-------|-------|
| CapoTestHelper | 1 per `it()` | Single test | Created in `beforeEach` via `addTestContext()` or `createTestContext()` wrapper |
| helperState | 1 per test file | Describe block | Shared via static `defaultHelperState` or `createTestContext()` options |
| SnapshotCache | 1 per helperState | Same as helperState | Stored on `helperState.snapCache`; contains `loadedSnapshots` Map |
| StellarNetworkEmulator | 1 per helper | Single test | Fresh emulator per test; snapshot state restored from cache |

**Sharing mechanism**: `createTestContext()` returns wrapped `describe`/`it` that pass the same `helperState` reference to each test's `beforeEach`. The SnapshotCache on `helperState.snapCache` persists across tests in that scope, enabling in-memory cache hits via `loadedSnapshots` Map.

### Key Patterns

#### Capo Identity Chain

Capo is off-chain state with expensive bundle references. Its identity derives from a deterministic chain:

```
PRNG seed (e.g., 42)
  → deterministic actor wallets (tina, tom, tracy)
  → actor addresses
  → seed-utxo selection from actor wallet
  → Capo identity (mph, address)
```

**Same seed + same actors = same Capo identity**. Different seeds produce different Capos.

#### Setup Envelope Pattern

Capo's `setup` object is a mutable envelope that allows network hot-swapping:

```typescript
// StellarContract.ts (base class)
get network() { return this.setup.chainBuilder || this.setup.network; }
```

During `restoreFrom()`, the network is hot-swapped:
```typescript
// CapoTestHelper.ts:906
(bootstrappedStrella as any).setup.network = newNet;
```

This allows the shared Capo to work with each test's fresh emulator.

#### helperState Lifecycle

`helperState.bootstrappedStrella` tracks the current Capo:

| Event | Action |
|-------|--------|
| First `reusableBootstrap()` | `bootstrappedStrella = Capo` after fresh bootstrap |
| Subsequent tests | Reused (network hot-swapped) |
| `initialize({randomSeed: X})` | Cleared (`= undefined`) to force fresh bootstrap |
| Disk cache hit (no prior Capo) | Set after `initStellarClass()` |

**Different seeds are sequential**, not coexisting. `initialize()` with new seed clears helperState, discarding the old Capo.

#### Single Chokepoint Snapshot Resolution (ARCH-d52nrfd96z)

All snapshot resolution flows through a single recursive chokepoint to eliminate scattered branching:

```
findOrCreateSnapshot(snapshotName, actorName, contentBuilder)
    │
    ├─ ensureSnapshotCached(snapshotName, contentBuilder)
    │   ├─ Check cache (memory → disk) → return if hit
    │   ├─ RECURSIVE: parentReg.snapMethod.call(this) for parent
    │   ├─ Load parent state into emulator
    │   ├─ Build via contentBuilder()
    │   └─ Store to cache, return
    │
    └─ loadCachedSnapshot(cached, snapshotName, actorName)
        ├─ network.loadSnapshot()
        ├─ Merge namedRecords
        ├─ Handle offchainData
        ├─ Capo reconstruction (if needed)
        └─ Set actor
```

**Key properties:**
- `ensureSnapshotCached()` is the single recursive path for "make sure it's cached"
- `loadCachedSnapshot()` is the uniform loading path (same for cache hit or freshly built)
- Parent resolution via `snapMethod.call(this)` stored in `_snapshotRegistrations` at class definition time
- No scattered "if cached / if parent / if build" branches

See `emulator.7jcyqx1mg8.workUnit.md` for implementation details and concern mapping.

#### Stable Envelope Pattern (ARCH-y70gqh4nwn)

`actorContext` and `networkCtx` are "envelope" objects shared across all test helpers and the Capo. Update their **contents**, never replace the envelope itself:

```typescript
// CORRECT: Update envelope contents
this.actorContext.wallet = newWallet;
this.networkCtx.network = newNetwork;

// WRONG: Replacing envelope breaks shared references
this.actorContext = { wallet: newWallet, others: {} };  // Throws!
```

**Implementation**:
- `actorContext` is a singleton on `helperState`, accessed via getter
- Setter throws to prevent accidental replacement
- All helpers in a test file share the same `actorContext` via shared `helperState`
- Capo's `setup.actorContext` points to the same object
- When `setActor()` updates `actorContext.wallet`, Capo sees it immediately

**Why this matters**: Each test creates a new helper instance, but they share a Capo via `helperState.bootstrappedStrella`. Without the stable envelope, the Capo's `setup.actorContext` would point to the first helper's actorContext, and subsequent helpers' `setActor()` calls would update a different object.

See REQT/ch01gxgm4g for requirements.

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
- Track registered snapshot metadata (name → parentSnapName, resolver) via just-in-time registration
- Persist snapshots to `.stellar/emu/` in hierarchical directory structure
- Load snapshots from disk, recursively resolving parent chain
- Cache loaded snapshots in memory for helperState scope (REQT/j9adgp9rwv); shared via `helperState.snapCache`
- Apply incremental blocks to parent UTxO state (REQT/yp9925t014, REQT/bkmgarnrsw)
- Compute cache keys from bundle hashes + params
- Manage freshness (touch directories > 1 day old on access)
- Invalidate stale entries automatically via hash mismatch

**Concerns**:
- Owns **Cache files** (`.stellar/emu/`)
- Owns **Snapshot chain** hierarchy (base → capoInitialized → enabledDelegatesDeployed → app)
- Owns **Loaded snapshots** (`loadedSnapshots` Map keyed by `{name}:{cacheKey}`, helperState-scope cache)
- Owns **Key inputs** (`key-inputs.json` per snapshot directory)
- Owns **Offchain data** (`offchain.json` per snapshot directory, merged from parent chain)
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
- **Single chokepoint snapshot resolution** via `ensureSnapshotCached()` + `loadCachedSnapshot()` (ARCH-d52nrfd96z)

**Concerns**:
- Owns **namedRecords**
- Owns **Single chokepoint snapshot resolution** (ARCH-d52nrfd96z) - recursive parent resolution via stored `snapMethod` references
- Depends on **Snapshot chain** via SnapshotCache
- Depends on **Capo** for bundle hash resolution
- Depends on **helperState.snapCache** for parent block hashes (retrieved via `snapshotCache.find(parent)`)

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
| ARCH-aydwtq95c3 | CapoTestHelper → SnapshotCache | function call | Helper initiates | snapshot name, namedRecords |
| ARCH-ae9pa14a5a | CapoTestHelper → StellarNetworkEmulator | function call | Helper initiates | snapshot operations |
| ARCH-te1et77ze7 | CapoTestHelper → Capo | property access | Helper initiates | bundle hash resolution |
| ARCH-0qtqvk6a41 | Capo → HeliosScriptBundle | function call | Capo initiates | getEffectiveModuleList() |
| ARCH-ncvrj0ps07 | StellarTestHelper → StellarNetworkEmulator | function call | Helper initiates | wallet transfer, snapshot restore |

### ARCH-aydwtq95c3: CapoTestHelper → SnapshotCache

**Mechanism**: function call
**Direction**: CapoTestHelper initiates
**Payload**: snapshot name, namedRecords (cache key computed internally via registry)
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
@hasNamedSnapshot({  // snapshot name derived from method: snapToX → "x"
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
  actor: string;                        // declarative: "this snapshot's world is this actor"
                                        //   "default" → setDefaultActor() (abstract)
                                        //   other → setActor(name)
                                        // honored in all paths (REQT/yx06ya2paq):
                                        //   (a) set before builder runs (skip for genesis)
                                        //   (b) asserted after builder returns
                                        //   (c) set after loading from cache
  parentSnapName: ParentSnapName;       // explicit parent snapshot name
  internal?: boolean;                   // skip reusableBootstrap() for bootstrap-internal snapshots
  resolveScriptDependencies?: ScriptDependencyResolver;
  computeDirLabel?: DirLabelResolver;   // optional label for directory name (default: empty string)
}

// Pure function of cache key inputs, returns short human-readable label for directory name
// Example: for actors snapshot, returns `seed${randomSeed}` → directory `bootstrapWithActors-seed42-7f3a2b1c9d8e`
type DirLabelResolver = (inputs: CacheKeyInputs) => string;

// Resolver takes helper as explicit argument (not bound) for correct lifetime handling
// This ensures the resolver uses the CURRENT helper, not one from registration time
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
- `bootstrapWithActors` → parent: `"genesis"` (root snapshot)
- `capoInitialized` → parent: `"bootstrapWithActors"`, `internal: true`
- `enabledDelegatesDeployed` → parent: `"capoInitialized"`, `internal: true`

**Note**: `internal: true` is required for snapshots created during the `bootstrap()` flow to avoid infinite recursion (bootstrap → snapTo* → reusableBootstrap → bootstrap).
- App snapshots → typically parent: `"enabledDelegatesDeployed"`

**Resolution Flow**:
1. `snapToX()` called
2. Read `parentSnap` from decorator options
3. Recursively ensure parent loaded: `ensureSnapshot(parentSnap)`
4. Call `resolveScriptDependencies(helper)` → cache key inputs
5. Compute cache key: `hash(parent.snapshotHash + inputs)`
6. Build cache path: `parent.path + "{name}-{cacheKey}/"`
7. Check cache:
   - **hit**: load snapshot, apply incremental blocks to parent state
   - **miss**: load parent snapshot into emulator (see ARCH-rmegyaj58k), run builder, store

See `snapshot-resolution.md` for detailed recursive walk-through.

**Default Resolver**: Iterates Capo's enabled delegates via `delegateRoles`, calls each bundle's `getEffectiveModuleList()`, hashes `source.content` for each.

### Built-in Resolvers (CapoTestHelper)

**Key design**: Resolvers use `computeSourceHash()` (not `getCacheKeyInputs()`) and access delegate bundles via `delegateRoles` class references (not `getMintDelegate()`/`getSpendDelegate()` which require charter data). This enables consistent cache keys whether using an egg or chartered Capo.

```typescript
// For capoInitialized snapshot
async resolveCoreCapoDependencies(): Promise<CacheKeyInputs> {
  await this.ensureEggForCacheKey();  // Ensure we have at least an egg
  const seedUtxo = this.getPreSelectedSeedUtxo();  // From actors snapshot

  const capoBundle = await this.capo.getBundle();
  const bundles: BundleCacheKeyInputs[] = [{
    name: capoBundle.moduleName,
    sourceHash: capoBundle.computeSourceHash(),  // Works without config!
    params: { seedUtxo },
  }];

  // Access delegate bundles via delegateRoles, NOT getMintDelegate()
  // delegateRoles entries have delegateClass with static scriptBundleClass()
  const { delegateRoles } = this.capo;
  const capoBundleClass = capoBundle.constructor;

  for (const roleName of ['mintDelegate', 'spendDelegate']) {
    const role = delegateRoles[roleName];
    if (role?.delegateClass) {
      const BundleClass = await role.delegateClass.scriptBundleClass();
      const boundBundleClass = BundleClass.usingCapoBundleClass(capoBundleClass);
      const bundle = new boundBundleClass();
      bundles.push({
        name: bundle.moduleName || roleName,
        sourceHash: bundle.computeSourceHash(),
        params: {},
      });
    }
  }

  return { bundles, extra: { heliosVersion: VERSION } };
}

// For enabledDelegatesDeployed snapshot
async resolveEnabledDelegatesDependencies(): Promise<CacheKeyInputs> {
  const coreInputs = await this.resolveCoreCapoDependencies();
  const bundles = [...coreInputs.bundles];

  const capoBundle = await this.capo.getBundle();
  const capoBundleClass = capoBundle.constructor;

  // Iterate delegateRoles for dgData controllers (filtered by featureFlags)
  for (const [roleName, role] of Object.entries(this.capo.delegateRoles)) {
    const { delegateType, delegateClass } = role;
    if (['mintDgt', 'spendDgt', 'authority'].includes(delegateType)) continue;

    if (delegateType === 'dgDataPolicy') {
      if (!this.featureFlags?.[roleName]) continue;

      const BundleClass = await delegateClass.scriptBundleClass();
      const boundBundleClass = BundleClass.usingCapoBundleClass(capoBundleClass);
      const bundle = new boundBundleClass();
      bundles.push({
        name: bundle.moduleName || roleName,
        sourceHash: bundle.computeSourceHash(),
        params: {},
      });
    }
  }

  return { bundles, extra: { featureFlags: this.featureFlags || {} } };
}
```

**Why this works**: Delegate source code does NOT depend on mph or charter data. The `delegateClass.scriptBundleClass()` returns the bundle class, which can be instantiated with just the capoBundle reference. `computeSourceHash()` only reads source content—no configuration needed.

App snapshots inherit from `enabledDelegatesDeployed` and typically don't add new scripts.

### SnapshotCache API

**Location**: Hierarchical under `.stellar/emu/` — `{parentPath}/{name}-{cacheKey}/snapshot.json`

```typescript
class SnapshotCache {
  // Internal registry of snapshot metadata (populated via register())
  private registry: Map<string, {
    parentSnapName: ParentSnapName;
    resolveScriptDependencies: () => Promise<CacheKeyInputs>;  // bound to helper
  }>;

  // helperState-scope cache of loaded snapshots (REQT/j9adgp9rwv)
  // Key: `{snapshotName}:{cacheKey}`, Value: fully-loaded CachedSnapshot with accumulated UTxO state
  // Composite key ensures different seeds/configs produce different cache entries
  // SnapshotCache shared via helperState.snapCache, so this Map persists across tests
  private loadedSnapshots: Map<string, CachedSnapshot> = new Map();

  // Register snapshot metadata (called from @hasNamedSnapshot decorator)
  // NOTE: resolveScriptDependencies takes helper as argument, NOT bound to any instance
  // This ensures the resolver uses the CURRENT helper when called, not a stale one
  register(snapshotName: string, metadata: {
    parentSnapName: ParentSnapName;
    resolveScriptDependencies?: ScriptDependencyResolver;  // (helper) => CacheKeyInputs
    computeDirLabel?: DirLabelResolver;  // (inputs) => string, default returns ""
  }): void

  // Find snapshot by name - resolves parent chain via registry
  // Returns from loadedSnapshots if present; otherwise loads from disk
  // Uses incremental UTxO application (REQT/yp9925t014, REQT/bkmgarnrsw)
  // NOTE: helper is passed to resolvers for cache key computation
  find(snapshotName: string, helper: CapoTestHelper): Promise<CachedSnapshot | null>

  // Store snapshot by name - computes path via registry
  store(snapshotName: string, snapshot: CachedSnapshot): Promise<void>

  // Check if cached snapshot exists (async: must resolve parent chain)
  has(snapshotName: string): Promise<boolean>

  // Delete cached snapshot and all children (async: resolves path via registry)
  delete(snapshotName: string): Promise<boolean>

  // Compute cache key from inputs
  computeKey(parentHash: string | null, inputs: CacheKeyInputs): string
}

// Internal helper for incremental UTxO state building (REQT/yp9925t014)
function applyIncrementalBlocks(
  parentState: { allUtxos, consumedUtxos, addressUtxos },
  incrementalBlocks: EmulatorTx[][]
): { allUtxos, consumedUtxos, addressUtxos }

type CachedSnapshot = {
  snapshot: NetworkSnapshot;       // the network snapshot data
  namedRecords: Record<string, string>;
  parentSnapName: ParentSnapName;  // parent snapshot name ("genesis" for root)
  parentHash: string | null;       // parent's snapshotHash - verified on load to detect stale cache
  snapshotHash: string;            // this snapshot's resulting block hash (becomes child's parentHash)
  cacheKeyInputs?: CacheKeyInputs; // original inputs used to compute cache key (loaded from key-inputs.json)
  offchainData?: Record<string, unknown>;  // offchain detail merged from parent chain (loaded from offchain.json)
}
```

**File Naming** (Hierarchical Directories):
- Path pattern: `{parentPath}/{snapshotName}-{dirLabel}-{hash6}/snapshot.json`
- `dirLabel` = optional human-readable clue from `computeDirLabel(inputs)`, default empty string
- `hash6` = last 6 chars of bech32-encoded blake2b hash (~1B combinations, sufficient for uniqueness)
- Root snapshots: `.stellar/emu/{name}-{label}-{hash6}/snapshot.json`
- Nested example: `.stellar/emu/bootstrapWithActors-seed42-q3m7k2/capoInitialized--a5n9p4/snapshot.json`
- Note: empty `dirLabel` produces double-dash (`--`) which is visually distinct and valid
- Snapshot names and labels sanitized: alphanumeric, underscore, hyphen only; max 50 chars each
- Parent relationship implicit in directory structure; enables `rm -rf` for subtree deletion

**Genesis vs Blocks Separation**:

| Snapshot | On Disk | After Load |
|----------|---------|------------|
| Root (`bootstrapWithActors`) | `genesis: [N], blocks: [], blockHashes: [hash]` | genesis processed → 1 block → UTxOs |
| Child snapshots | `genesis: [], blocks: [incremental], blockHashes: [incremental]` | parent UTxOs + incremental blocks |

- **Genesis transactions** = "free money" UTxO creation (no balanced tx required); used only for initial actor funding
- **Genesis is a one-time bootstrap mechanism**: root snapshot stores genesis; on load, genesis is processed into block(s) which build UTxO state
- **Root blockHashes**: Even though `blocks: []` on disk, `blockHashes` contains the pre-computed hash of the genesis block. This enables:
  - Children to reference `parentHash` for cache key computation
  - Integrity verification (`blockHashes[-1] === snapshotHash`)
  - On load, verify the processed genesis block matches the stored hash
- **Children inherit genesis from parent**: `find()` copies `parent.snapshot.genesis` to child snapshot so `loadSnapshot()` receives complete data
- **On disk**: children store `genesis: []` (empty); inheritance happens at load time in `find()`
- Charter minting (in `capoInitialized`) is the first incremental block after genesis

**Behavior**:
- `find()`: Resolves parent chain and computes cache key first; then checks `loadedSnapshots` Map with composite key `{name}:{cacheKey}` (returns cached if present); on disk load: touches directory if mtime > 1 day; applies incremental blocks to parent's UTxO state (not full rebuild); verifies `parentHash` matches loaded parent's `snapshotHash`; verifies final `blockHashes[-1]` equals `snapshotHash` (returns null on any mismatch to trigger rebuild); caches result in `loadedSnapshots` with composite key before returning
- `store()`: Extracts name from `snapshot.snapshot.name`; writes JSON with incremental blocks only
- `computeKey()`: `bech32(blake2b(parentHash + JSON.stringify(inputs))).slice(-6)` — returns last 6 bech32 chars

**Parent Chain Verification**:
- `parentHash`: Verifies loaded parent state matches expected state; if mismatch, cache is stale and `find()` returns null to trigger rebuild
- Parent path is implicit in directory structure—we find() parent first, then construct child path from `parent.path + "{name}-{cacheKey}/"`

**Integrity Verification**:
- After chain loading, `find()` verifies `blockHashes[-1] === snapshotHash` to detect file corruption or implementation bugs

### Snapshot State Management

#### ARCH-edky0aybv7: PRNG Seed and Determinism

The emulator uses a single seed for deterministic wallet generation:

```typescript
type NetworkSnapshot = {
  seed: number;        // Evolved PRNG state at snapshot time
  slot: number;
  // ... other fields
}
```

**Seed lifecycle**:
1. `StellarTestHelper.randomSeed` (default 42) passed to emulator on construction
2. Emulator's `#seed` evolves with each PRNG call (wallet creation)
3. Snapshot captures the **evolved** `#seed` value
4. On restore, PRNG continues from where it left off

**Why store evolved seed**: Enables PRNG continuity across snapshot restore. Child snapshots can generate new wallets without colliding with parent's wallet addresses.

**Cache key uses starting seed**: `resolveActorsDependencies()` includes `randomSeed` (the stable starting value, not evolved) for cache key computation.

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
- All inputs are always available: parent hash via `snapshotCache.find(parent).snapshotHash` + resolver methods
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
const cachedSnapshot: CachedSnapshot = {
  snapshot,
  parentSnapName,
  parentHash: this.getSnapshotBlockHash(parentSnapName),
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

#### ARCH-ja63e3bh8p: Key Inputs Storage

Each snapshot directory stores the original `CacheKeyInputs` used to compute its cache key:

**File**: `key-inputs.json` (alongside `snapshot.json`)

```json
{
  "bundles": [
    { "name": "DefaultCapoBundle", "sourceHash": "abc123...", "params": {...} }
  ],
  "extra": {
    "actors": [{ "name": "tina", "initialBalance": "11000000000" }, ...],
    "heliosVersion": "0.17.0"
  }
}
```

**Purpose**:
- Debugging cache misses (see what differs)
- Accessing actor list without parsing namedRecords
- Fulfilling requirement: "loading a snapshot should make cache-key data available"

**Behavior**:
- Written by `store()` alongside `snapshot.json`
- Loaded by `find()` and included in `CachedSnapshot.cacheKeyInputs`
- Graceful fallback if file doesn't exist (for older snapshots)

#### ARCH-75rh0ewd7a: Offchain Data Storage

Offchain data stores test helper restoration detail that doesn't affect cache validity:

**File**: `offchain.json` (alongside `snapshot.json`)

```json
{
  "actorWallets": {
    "tina": { "spendingKey": "abc123...", "stakingKey": "def456..." },
    "tracy": { "spendingKey": "789...", "stakingKey": "012..." }
  }
}
```

**Distinction from cache key inputs**:
| Data | Affects Cache? | Example |
|------|----------------|---------|
| Cache key inputs | Yes | Actor list (names, balances), bundle hashes |
| Offchain data | No | Actor wallet private keys |

**Merge semantics**: On `find()`, offchain data merges from parent chain (root → leaf). Child keys override parent keys:

```
genesis (no offchain)
  └── actors (offchain: { actorWallets: {...} })
        └── capoInit (no offchain)
              └── delegates (no offchain)

Loading "delegates" returns merged: { actorWallets: {...} }
```

**Purpose**:
- Store actor wallet private keys for fast restoration (avoid PRNG replay)
- Clean separation from namedRecords (application data) vs offchain (test helper data)
- Enables `makeBip32PrivateKey(hexToBytes(key))` fast path

---

## Data Flow

### Workflow: Bootstrap Chartered Capo (ARCH-w3xvf0hm5w)

When no cache exists anywhere, build everything from scratch. Each layer uses `@hasNamedSnapshot` decorator which handles cache check, build-if-miss, and store automatically (per REQT/7hcqed9mvn):

1. **Test Suite** calls `reusableBootstrap()` on **CapoTestHelper**
2. **CapoTestHelper** calls `bootstrap()` which proceeds through layers:
   - `bootstrap()` calls `initialize()` for actor setup (Layer 1)
   - `initialize()` calls `snapToBootstrapWithActors()`
   - `bootstrap()` then continues with Capo-specific layers (Layers 2-3)

**Layer 1: `snapToBootstrapWithActors()`** (via `initialize()`) → `@hasNamedSnapshot({parentSnapName: "genesis"})`
- `findOrCreateSnapshot()` checks cache, runs `bootstrapWithActors()` builder on miss
- **Pre-selects seedUtxo** and stores in `offchainData.targetSeedUtxo` (ARCH-4adwbk7ajp)

**Layer 2: `snapToCapoInitialized()`** → `@hasNamedSnapshot({parentSnapName: "bootstrapWithActors"})`
- `findOrCreateSnapshot()` checks cache, runs `capoInitialized()` builder on miss
- Mints charter using **pre-selected seedUtxo**
- Stores `capoConfig` in `offchainData` for later reconstruction (ARCH-psqv6y39h5)

**Layer 3: `snapToEnabledDelegatesDeployed()`** → `@hasNamedSnapshot({parentSnapName: "capoInitialized"})`
- `findOrCreateSnapshot()` checks cache, runs `enabledDelegatesDeployed()` builder on miss (deploys delegates)

```
[Test] → reusableBootstrap() → bootstrap()
              │
              ▼
         initialize()  [if no strella - handles actor setup]
              │
              ▼
   snapToBootstrapWithActors() ──@hasNamedSnapshot──▶ findOrCreateSnapshot()
              │                                              │
              ▼                                        miss? → build + pre-select seedUtxo → store
   snapToCapoInitialized() ──────@hasNamedSnapshot──▶ findOrCreateSnapshot()
              │                                              │
              ▼                                        miss? → mint charter + store capoConfig → store
   snapToEnabledDelegatesDeployed() ─@hasNamedSnapshot─▶ findOrCreateSnapshot()
                                                             │
                                                       miss? → deploy delegates → store
```

**Result**: Chartered Capo emerges naturally. Config stored in `offchainData.capoConfig` enables later reconstruction from disk.

### Workflow: Load Chartered Capo from Memory (ARCH-x7v4h6xyx8)

When a chartered Capo already exists in `helperState.bootstrappedStrella`:

1. **Test Suite** calls decorated method (e.g., `snapToEnabledDelegatesDeployed()`)
2. **CapoTestHelper** `findOrCreateSnapshot()` finds in-memory snapshot
3. **CapoTestHelper** calls `restoreFrom(snapshotName)`
4. **restoreFrom()** uses `helperState.bootstrappedStrella` to restore Capo reference
5. Compare mph/seedUtxo → same → hot-swap network only (Setup Envelope pattern)
6. **StellarNetworkEmulator** loads snapshot state
7. Actor wallets transferred via `previousHelper`

```
[Test] → findOrCreateSnapshot() → in-memory hit → restoreFrom()
                                                       ↓
                                           helperState.bootstrappedStrella
                                                       ↓
                                           hot-swap network (same Capo)
                                                       ↓
                                           [StellarNetworkEmulator] ← restore
```

### Workflow: Load Chartered Capo from Disk (ARCH-c1kttx6sp2)

When disk cache exists but no chartered Capo is in memory. Uses **egg/chicken pattern** — see `emulator-capo-chicken-egg.md` for full details.

1. **Test Suite** calls decorated method
2. **CapoTestHelper** `findOrCreateSnapshot()` misses in-memory
3. **Create egg**: `createWith({ setup, partialConfig: {} })` — unconfigured Capo
4. **Compute cache key**: `egg.bundle.computeSourceHash()` + `seedUtxo` from actors snapshot + `parentHash`
5. **SnapshotCache** loads snapshot from disk (with parent chain)
6. **Extract** `capoConfig` from `offchainData`
7. **Reconstruct**: Create new Capo with loaded config (or hot-swap if same mph)
8. **Set** `helperState.bootstrappedStrella`
9. **StellarNetworkEmulator** loads snapshot state
10. Actors restored from `offchainData.actorWallets`

```
[Test] → findOrCreateSnapshot() → in-memory miss
                                         ↓
                              Create egg (partialConfig: {})
                                         ↓
                              Compute cache key (sourceHash + seedUtxo)
                                         ↓
                              [SnapshotCache] loads from disk
                                         ↓
                              Extract capoConfig from offchainData
                                         ↓
                              Create new Capo with loaded config
                                         ↓
                              [StellarNetworkEmulator] ← restore
```

**Key insight**: The egg provides source hashes for cache key computation without needing a chartered Capo. The `seedUtxo` comes from the actors snapshot's `offchainData.targetSeedUtxo`.

#### Actor Transfer Semantics

When `restoreFrom()` is called, actor transfer depends on helper identity:

| Condition | Behavior |
|-----------|----------|
| `this === previousHelper` | Same helper restoring again. Actors already on this helper—just load snapshot. |
| `this !== previousHelper` | Different helper instance. Always transfer actors from `previousHelper` to `this`. |

**Key concepts:**

1. **`ACTORS_ALREADY_MOVED` marker**: Per-helper flag set after actors are transferred. Prevents the SAME helper from re-transferring, but doesn't affect different helpers.

2. **`helperState` is shared**: Multiple helper instances share `helperState` for snapshot caching. But actors belong to specific helper instances, not to helperState.

3. **Transfer always happens for different helpers**: When `this !== previousHelper`, actors must be transferred regardless of network IDs. The marker on `previousHelper` is irrelevant—it only guards against duplicate transfers within that helper.

```
helperState (shared via static defaultHelperState or createTestContext)
├── namedRecords: {...}        # Application data from snapshots
├── previousHelper: Helper A   # Points to a helper instance
├── bootstrappedStrella: Capo  # Shared Capo reference
├── parsedConfig: {...}        # For cross-process Capo reconstruction
└── snapCache: SnapshotCache   # Shared SnapshotCache instance
      ├── registry: Map<>      # Snapshot metadata (rebuilt per-helper via just-in-time registration)
      └── loadedSnapshots: Map<>  # In-memory cache (persists within helperState scope)

Helper A (instance)            Helper B (instance)
├── actors: {moved marker}     ├── actors: {}  ← needs transfer
├── network: #7                ├── network: #17
└── snapshotCache → helperState.snapCache (shared reference)
```

### Workflow: Disk Chain Load (cold cache, REQT/d28gyvqegv)

**ARCH-UUT**: ARCH-kqc3jng98y

Efficient loading when all snapshots are on disk but not yet in memory. Uses incremental UTxO state application instead of full rebuild.

1. **Test Suite** calls `snapToX("enabledDelegatesDeployed")`
2. **SnapshotCache** checks `loadedSnapshots` Map → miss
3. **SnapshotCache** looks up registry → `parentSnapName: "capoInitialized"`
4. **Recursive**: `find("capoInitialized")` → `find("bootstrapWithActors")` → `find("genesis")`
5. **At each level** (bottom-up):
   - Check `loadedSnapshots` Map → miss (first load)
   - Read JSON from disk (incremental blocks only)
   - Deserialize blocks → `EmulatorTx[]`
   - **Apply incremental blocks** to parent's UTxO state (NOT full rebuild)
   - Cache result in `loadedSnapshots` Map
   - Return `CachedSnapshot` with full accumulated state
6. **CapoTestHelper** restores to **StellarNetworkEmulator**

```
[Test] → snapToX("enabledDelegatesDeployed")
    ↓
[SnapshotCache.find()] → loadedSnapshots miss
    ↓
[Recursive parent resolution]
    genesis (empty state)
        ↓ apply incremental blocks
    bootstrapWithActors (actors UTxOs)
        ↓ apply incremental blocks
    capoInitialized (+ charter UTxO)
        ↓ apply incremental blocks
    enabledDelegatesDeployed (+ delegate UTxOs)
    ↓
[Cache each level in loadedSnapshots Map]
    ↓
[Emulator.loadSnapshot()] ← full accumulated state
```

**Key optimization**: `applyIncrementalBlocks(parentState, newBlocks)` instead of `rebuildUtxoIndexes(genesis, allBlocks)`. Reduces O(n²) to O(n) for chain depth n.

### Workflow: Memory-Assisted Load (warm cache, REQT/j9adgp9rwv)

**ARCH-UUT**: ARCH-tz34av7n63

Efficient loading when parent snapshots are already in process memory from prior `snapToX()` calls.

1. **Test Suite** calls `snapToX("appSnapshot")` (second test in file)
2. **SnapshotCache** checks `loadedSnapshots` Map for `"enabledDelegatesDeployed"` → **hit**
3. **SnapshotCache** reuses cached parent's full UTxO state
4. **SnapshotCache** reads only `appSnapshot.json` from disk
5. **SnapshotCache** deserializes incremental blocks
6. **SnapshotCache** applies incremental blocks to cached parent state
7. **CapoTestHelper** restores to **StellarNetworkEmulator**

```
[Test 2] → snapToX("appSnapshot")
    ↓
[SnapshotCache.find("appSnapshot")]
    ↓
[Registry] → parent: "enabledDelegatesDeployed"
    ↓
[loadedSnapshots.get("enabledDelegatesDeployed")] → HIT (from Test 1)
    ↓
[Read appSnapshot.json] → incremental blocks only
    ↓
[applyIncrementalBlocks(cachedParent.state, newBlocks)]
    ↓
[Emulator.loadSnapshot()]
```

**Instance lifetime**: The `loadedSnapshots` Map persists for the SnapshotCache instance lifetime. Keyed by `{name}:{cacheKey}`, so different seeds/configs produce different entries. Within tests sharing the same helper instance, parent snapshots loaded by earlier operations are reused only if their cache key matches.

### Workflow: Build App Snapshot with Cached Parent (ARCH-rmegyaj58k)

> **Note**: This workflow is superseded by the Single Chokepoint pattern (ARCH-d52nrfd96z). The original workflow only handled the case where parent was already cached. The new pattern uses recursive `snapMethod.call()` to build uncached parents automatically. See `emulator.7jcyqx1mg8.workUnit.md`.

When building a NEW app snapshot where the parent exists in cache but the child does not. This differs from bootstrap flow (where layers build sequentially) and from disk chain load (where child already exists).

**Scenario**: Test defines custom snapshots `firstMember` → `proposeFirstAgreement`. On first run of `snapToProposeFirstAgreement()`:
- `reusableBootstrap()` loads Capo at `enabledDelegatesDeployed` level
- Parent `firstMember` may exist in cache (from prior test)
- Child `proposeFirstAgreement` does not exist yet

**Flow**:

1. **Test Suite** calls decorated method `snapToProposeFirstAgreement()`
2. **CapoTestHelper** `findOrCreateSnapshot()` checks cache for `"proposeFirstAgreement"` → **miss**
3. **Read parent from decorator options**: `parentSnapName: "firstMember"`
4. **Load parent snapshot** into emulator (if cached):
   - `snapshotCache.find("firstMember")` → returns cached parent
   - `network.loadSnapshot(parentCached.snapshot)` → emulator now has parent state
   - Merge `parentCached.namedRecords` into `helperState.namedRecords`
   - Restore `offchainData` from parent (for Capo config if needed)
   - Set actor per decorator options
5. **Run builder**: `contentBuilder()` executes with parent state loaded
6. **Capture snapshot**: `network.snapshot("proposeFirstAgreement")`
7. **Store**: `snapshotCache.store()` with incremental blocks since parent

```
[Test] → snapToProposeFirstAgreement()
    ↓
[findOrCreateSnapshot("proposeFirstAgreement")] → cache miss
    ↓
[Read decorator] → parent: "firstMember"
    ↓
[snapshotCache.find("firstMember")] → cache hit
    ↓
[network.loadSnapshot(parent)] → emulator has parent state
    ↓
[Merge namedRecords, restore offchainData, set actor]
    ↓
[contentBuilder()] → builds on parent state
    ↓
[network.snapshot()] → capture new state
    ↓
[snapshotCache.store()] → persist with incremental blocks
```

**Key distinction from other workflows**:
- **Bootstrap flow** (ARCH-w3xvf0hm5w): Layers build in sequence during `bootstrap()`, so parent state is naturally present
- **Disk chain load** (ARCH-kqc3jng98y): Child EXISTS on disk, loads incrementally from parent
- **This workflow**: Child does NOT exist, parent state must be explicitly loaded before builder runs

**Parent not cached case**: If parent is also missing, recursive resolution triggers parent's builder first (ensureSnapshot pattern from Resolution Flow step 3).

**Implementation Note**: This is minimal compared to cache HIT path because `reusableBootstrap()` has already configured the Capo. We only need network state + namedRecords to build upon:

```typescript
// In findOrCreateSnapshot(), on cache miss before contentBuilder():
const parentSnapName = entry?.parentSnapName;
if (parentSnapName && parentSnapName !== "genesis") {
    const resolvedParentName = resolveSnapshotAlias(parentSnapName);
    const parentCached = await this.snapshotCache.find(resolvedParentName, this);
    if (parentCached) {
        this.network.loadSnapshot(parentCached.snapshot);
        Object.assign(this.helperState!.namedRecords, parentCached.namedRecords);
    }
}
```

Full offchainData/capoConfig restoration is unnecessary—that's handled by the bootstrap flow.

### Workflow: Cache Invalidation

1. Source file changes → bundle hash changes (via `getCacheKeyInputs()`)
2. Next test run computes new cache key (via `resolveScriptDependencies()`)
3. New cache key not found → cache miss → rebuild and store under new key
4. *(FUTURE: REQT/r5f8n2b4ht)* Old cache directories age out (> 1 week) and get cleaned up

**Note**: Touch mechanism (REQT/m1d6jk9w3p) keeps active directories fresh; cleanup command not yet implemented.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Snapshot hierarchy** (base → capoInitialized → enabledDelegatesDeployed → app) | Natural layering matches test setup stages |
| **Source hash, not UPLC** | Compilation is slow; source hashes achieve same invalidation |
| **CapoTestHelper owns SnapshotCache interaction** | Helper knows the Capo; keeps emulator focused on simulation |
| **`resolveScriptDependencies()` pattern** | Enables cache-key pre-computation for dynamic scripts/params |
| **namedRecords persisted with snapshot** | Tests need record IDs after restore |
| **Touch directories > 1 day old** | Keeps recently-used caches fresh for cleanup detection |
| **`.stellar/emu/` location** | Project-local, gitignore-able |
| **Helios VERSION in cache key** | Compiler changes could affect output |
| **autoSetup + featureFlags** | autoSetup triggers iteration; featureFlags filters which deploy |
| **Hierarchical directories** `{parent}/{name}-{key}/snapshot.json` | Parent relationship implicit in path; easy subtree deletion via `rm -rf`; enables `ls` to see chain structure |
| **Just-in-time registration** | Snapshots register metadata (parentSnapName, resolver) before use; SnapshotCache resolves parent chain recursively |
| **`parentHash` verification** | Detects stale cache when parent was rebuilt with same inputs but different resulting state; returns null to trigger rebuild |
| **Cache key recomputation** | No Map needed—resolvers are deterministic, parent hashes retrieved via `snapshotCache.find(parent)` |
| **`fromSnapshot` cleared on pushBlock** | Provenance tracking; diverged state shouldn't claim snapshot identity |
| **`loadedSnapshots` Map** (REQT/j9adgp9rwv) | helperState-scope cache keyed by `{name}:{cacheKey}` avoids redundant disk reads and tx reconstruction; composite key ensures different seeds don't collide; shared via `helperState.snapCache` |
| **Incremental UTxO application** (REQT/yp9925t014) | `applyIncrementalBlocks()` instead of full `rebuildUtxoIndexes()` reduces O(n²) to O(n) for chain depth |

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
- [x] ~~Cleanup command~~ → `find .stellar/emu -mtime +7 -type d | xargs rm -rf` (directories, not files)
- [x] ~~Parent cache key tracking~~ → Recompute via `getSnapshotCacheKey()`; no Map needed. See "Cache Key Recomputation" section.
- [x] ~~Migrate built-in snapshots (actors, capoInit, delegates) to use `@hasNamedSnapshot` decorator for consistent registration model~~ → Reqts added: REQT/7hcqed9mvn (Built-in Snapshot Registration)
- [x] ~~Add reqts for built-in snapshot decorator migration~~ → Done: REQT/fz89t5wkrw, REQT/1vtn22as3f, REQT/p4mrpyyady, REQT/pj9agtaypq, REQT/5qyt5xzvv1
- [x] ~~Finalize SnapshotCache.find() and store() interface signatures~~ → Name-based: `find(snapshotName)`, `store(snapshotName, snapshot)`. Path computed via registry.
- [x] ~~Update Emulator.reqts.md to reflect hierarchical directories, just-in-time registration, and touch directories (not files)~~ → Done: REQT/m1d6jk9w3p, REQT/d34w6546fx updated; parentCacheKey deprecated
- [x] ~~**Cleanup after impl**: Remove deprecated `parentCacheKey` references from this doc (CachedSnapshot type, code examples) once hierarchical dirs are working~~ → Done: removed from CachedSnapshot type and code examples

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

## Collaboration Stubs

### ARCH-zeqd0vqvyg: Test Logging Integration (Stub)

**Target Architecture**: `../../loggers/testLogging.architecture.md`

**Collaboration Pattern**: Test Logging provides a `TestLoggerContext` hot-swap wrapper that threads through the test helper hierarchy.

**This Architecture (Emulator/Test Helper) NEEDS from Test Logging**:

| Component | NEEDS | From Test Logging |
|-----------|-------|-------------------|
| `StellarTestHelper` | ARCH-28b90zs38k | TestLoggerContext hot-swap wrapper |
| `CapoTestHelper` | ARCH-gy5126n88c | DecoratedIt for wrapped `it()` with logger injection |
| `createTestContext()` | ARCH-e81gt3ks9t | TestFileLogger for automatic per-file logs |

**Test Logging Architecture EXPECTS from This Architecture** (behavioral):

| This Architecture Component | Test Logging EXPECTS |
|-----------------------------|----------------------|
| `StellarTestHelper` | MUST accept `loggerContext` in constructor, thread to setup |
| `StellarTestHelper` | MUST replace console.log with structured logging |
| `CapoTestHelper` | MUST thread `loggerContext` through snapshot operations |
| `Capo` | MUST accept `loggerContext` in setup, thread to delegates/txn |
| All consumers | MUST NOT cache `loggerContext.logger` or `logger.child()` |

**Integration Points**:
- `StellarTestHelper.loggerContext` — hot-swap wrapper injected via beforeEach
- `Capo.setup.loggerContext` — threaded from test helper
- `StellarTxnContext.loggerContext` — threaded from Capo
- `CapoTestHelper.createTestContext()` — returns DecoratedIt for slug-based logging

**Migration Requirements** (on this architecture's components):
- `StellarTestHelper` MUST accept `loggerContext` in constructor or via setter
- `StellarTestHelper` MUST replace ~30+ `console.log` calls with `this.loggerContext.logger.*`
- `CapoTestHelper` MUST thread `loggerContext` through snapshot operations
- `CapoTestHelper.createTestContext()` MUST use DecoratedIt for wrapped `it()`

**Status**: Pending implementation — see Test Logging architecture for component details.

---

## Related Documents

- `./Emulator.reqts.md` - Detailed requirements
- `./emulator-capo-chicken-egg.md` - Egg/chicken pattern for loading chartered Capo from disk (ARCH-8wby9gxrav)
- `./snapshot-impl-audit.4xb49a4jyw.workUnit.md` - Implementation audit (goal state alignment)
- `./emulator.7jcyqx1mg8.workUnit.md` - Single chokepoint refactoring (ARCH-d52nrfd96z)
- `../../reference/essential-stellar-testing.md` - Testing conventions
- `../CapoTestHelper.ts` - Snapshot orchestration implementation
- `../../helios/CachedHeliosProgram.ts` - Compilation cache pattern
- `../../loggers/testLogging.architecture.md` - Per-test structured logging architecture
