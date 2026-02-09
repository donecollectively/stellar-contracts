# StellarNetworkEmulator & Testing Infrastructure

## MAINTAINERS MUST READ:

> **🛑 COMPLIANCE TRIGGER: READ THIS FIRST**
>
> This document is strictly managed. Before interpreting or implementing these requirements, you **MUST** read and apply the **Requirements Consumer Skill** at:
>
> `skillz/reqm/reqt-consumer.SKILL.md`
>
> **CRITICAL**: You are **FORBIDDEN** from modifying this file or proceeding with implementation until you have ingested and studied the "Read-Only" constraints and "Escalation Protocol" defined in that skill.
> NOTE: if you've already studied the full REQM skill, you don't need the consumer skill.
>
> **hash.notice.reqt-consumer**: 5dddc026e9370dc8

> NOTE: See [reqm.SKILL.md](../../../skillz/reqm.SKILL.md); When managing requirements, you MUST follow the guidelines and conventions in that document, including expression of purpose/intended function as well as the detailed, formal requirements.

## About StellarNetworkEmulator

The StellarNetworkEmulator provides an in-memory simulation of the Cardano blockchain for testing Stellar Contracts applications. It enables comprehensive integration testing of smart contract interactions without requiring access to a real blockchain network.

**Essential technologies**: TypeScript, Helios SDK (`@helios-lang/tx-utils`, `@helios-lang/ledger`)

**Related technologies**: Vitest (test runner), React (for UI testing scenarios)

The emulator works in conjunction with `CapoTestHelper` to provide a complete testing infrastructure that supports:
- Transaction building and validation
- UTxO management and tracking
- Time/slot progression for time-dependent logic
- Snapshot/restore for efficient test isolation
- Actor-based wallet management for multi-party scenarios

## Must Read: Special Skills and Know-how

This section provides directives for proactive-research triggers.

1. **Essential Testing Guide**: When writing tests or modifying test infrastructure, you MUST first read `reference/essential-stellar-testing.md` for conventions on snapshot decorators, helper state, actor management, and submit patterns.
2. **Essential Off-chain Guide**: When building transactions or working with controllers, you SHOULD read `reference/essential-stellar-offchain.md` for transaction patterns, data bridges, and UI integration.
3. **Helios SDK Integration**: When modifying transaction handling or UTxO management, you MUST first review the `@helios-lang/tx-utils` Emulator interface to ensure compatibility with upstream types.
4. **Snapshot Mechanics**: When working with snapshot functionality, you SHOULD understand both the low-level `NetworkSnapshot` type and the high-level `@hasNamedSnapshot` decorator pattern.
5. **Time Management**: Before modifying slot/time logic, you MUST understand the relationship between `currentSlot`, `now`, and `NetworkParamsHelper.slotToTime()`.
6. **Project Commands**: See `CLAUDE.md` for build (`pnpm build`), test (`pnpm test`, `pnpm testing`), and debug commands.

## Collaborators

- **USED BY StellarNetworkEmulator**: `@helios-lang/tx-utils` (Emulator interface, EmulatorTx types), `@helios-lang/ledger` (TxInput, TxOutput, Address types)
- **USED BY CapoTestHelper**: `StellarNetworkEmulator`, `StellarTestHelper`, `StellarTxnContext`
- **Expected to USE this infrastructure**: All Stellar Contracts test suites, custom Capo test helpers
- **First-class instances**: `DefaultCapoTestHelper` (EXPECTS REQT-1.1 for snapshot support), all `*TestHelper.ts` files in `tests/`

## Background

Testing blockchain applications presents unique challenges:

1. **Determinism**: Tests must produce repeatable results despite the inherently stateful nature of blockchain interactions
2. **Isolation**: Each test needs a clean blockchain state to avoid interference from other tests
3. **Performance**: Setting up blockchain state (bootstrapping contracts, creating actors) is expensive and should be cached when possible
4. **Multi-party Scenarios**: Smart contract tests often involve multiple actors with different roles and permissions
5. **Time-dependent Logic**: Many contracts have time-based constraints that need to be testable

The emulator addresses these challenges by providing a controlled, in-memory blockchain simulation with snapshot capabilities for efficient test isolation.

## Design Goals

### General Approach

- Implement the Helios `Emulator` interface for compatibility with upstream tooling
- Provide deterministic randomness via seeded Mulberry32 PRNG
- Support efficient caching via snapshot/restore mechanism
- Enable multi-actor testing with wallet management
- Maintain accurate slot/time progression

### Specific Goals

1. **Full Transaction Lifecycle**: Support complete transaction building, validation, and submission flow matching real network behavior
2. **UTxO Tracking**: Maintain accurate UTxO state including creation, consumption, and address-based queries
3. **Snapshot Efficiency**: Enable test suites to share expensive setup via snapshot caching across test runs
4. **Actor Management**: Provide simple APIs for creating and switching between test actors with funded wallets
5. **Time Control**: Allow tests to advance network time to test time-dependent contract logic
6. **Validation Fidelity**: Reject invalid transactions with meaningful error messages matching real network behavior
7. **Helios Dependencies Registration**: Enable contract components to register their Helios script dependencies for proper compilation ordering

## The Development Plan

We will start simple with essential requirements and develop incrementally to achieve key results, a bit at a time. Implementer should focus exclusively on achieving one incremental result at a time.

BACKLOGGED items SHOULD be considered in the structural design, but implementation MUST focus entirely on IN-PROGRESS requirements. COMPLETED requirements that are working MUST be retained in working order. NEXT requirements are those that can be implemented and work, based on having their dependencies already working or sufficiently stubbed.

## Functional Areas and Key Requirements

### 1. Network Emulation Core

#### Functional Requirements:
1. **Transaction Submission**:
   - MUST validate transaction slot ranges against current network slot
   - MUST verify all inputs exist and are unconsumed
   - MUST verify all reference inputs exist
   - MUST add valid transactions to mempool
2. **Block Production**:
   - MUST mint blocks from mempool when `tick()` is called
   - MUST advance slot counter by specified amount
   - MUST update UTxO state (create new, mark consumed)
3. **UTxO Management**:
   - MUST track all UTxOs by ID for fast lookup
   - MUST track UTxOs by address for wallet queries
   - MUST track consumed UTxOs to prevent double-spending

### 2. Wallet Management

#### Functional Requirements:
1. **Wallet Creation**:
   - MUST generate deterministic wallets from network's PRNG
   - MUST support both spending and staking keys
   - SHOULD create wallets via TestHelper, not directly on emulator
2. **Genesis UTxOs**:
   - MUST support creating UTxOs without balanced transactions
   - MUST track genesis transactions separately from regular transactions

### 3. Snapshot System

#### Functional Requirements:
1. **Snapshot Capture**:
   - MUST capture complete network state (blocks, UTxOs, slot, seed)
   - MUST reject snapshots when mempool is non-empty
   - MUST include PRNG seed for deterministic continuation
2. **Snapshot Restore**:
   - MUST fully restore network state from snapshot
   - MUST restore PRNG state for deterministic behavior post-restore
3. **Snapshot Orchestration Integration**:
   - MUST support lazy snapshot creation via `findOrCreateSnapshot()`
   - MUST support actor state transfer across snapshot restores
4. **Snapshot Cache Hierarchy** (for on-disk caching):
   - **base** (actors setup) → cache key: actor names/order/amounts + randomSeed + heliosVersion → captures block hash
   - **capoInitialized** → cache key: parent block hash + core bundle hashes (minter, mintDelegate, spendDelegate)
   - **enabledDelegatesDeployed** → cache key: parent block hash + namedDelegate bundles (always included) + dgData controller bundles (filtered by `featureEnabled(typeName)`)
   - Each snapshot MUST link to parent by name (logical) and block hash (computational)

### 4. Time Management

#### Functional Requirements:
1. **Slot Progression**:
   - MUST track current slot number
   - MUST convert between slots and timestamps via NetworkParamsHelper
2. **Test Time Control**:
   - MUST support `waitUntil(date)` for jumping to specific times
   - MUST support transaction time validation

---

# Requirements

## Component: StellarNetworkEmulator

### REQT-1.0/7n8ws6gabc: COMPLETED: **Network State Management**

#### Purpose: Governs the core state tracking of the emulated network. Applied when reading or modifying UTxO tracking, block storage, or transaction handling.

 - **REQT-1.0.1/49h2ekt53d**: COMPLETED: MUST maintain `_allUtxos` map for O(1) UTxO lookup by ID
 - **REQT-1.0.2/8cp2p83gdn**: COMPLETED: MUST maintain `_addressUtxos` map for efficient address-based queries
 - **REQT-1.0.3/f9va8cpejn**: COMPLETED: MUST maintain `_consumedUtxos` set to track spent UTxOs
 - **REQT-1.0.4/9ted2tk8a3**: COMPLETED: MUST store blocks as array of transaction arrays
 - **REQT-1.0.5/p19q6ak0xj**: COMPLETED: MUST track current slot number

### REQT-1.1/egfb0jds34: COMPLETED: **Snapshot Support**

#### Purpose: Enables efficient test isolation through state capture and restore. Applied when implementing or modifying snapshot-related functionality.

 - **REQT-1.1.1/x5mdtcjm26**: COMPLETED: `snapshot()` MUST capture: seed, slot, genesis txs, blocks, allUtxos, consumedUtxos, addressUtxos
 - **REQT-1.1.2/h3g5k4grkv**: COMPLETED: `snapshot()` MUST throw if mempool is non-empty
 - **REQT-1.1.3/473wtxxe8d**: COMPLETED: `loadSnapshot()` MUST fully restore all captured state
 - **REQT-1.1.4/xyc2vfhz76**: COMPLETED: Snapshot MUST include PRNG seed for deterministic continuation

### REQT-1.2/d1cyq7q1ax: COMPLETED: **Snapshot Cache Invalidation**

#### Purpose: Enables on-disk snapshot caching with automatic invalidation when test setup or contract code changes. Applied when implementing persistent snapshot storage.

 - **REQT-1.2.1/1wdfec5p4c**: COMPLETED: **Base Snapshot Cache Key** - The base (actors) snapshot cache key MUST include: actor names, actor order, initial UTxO amounts, and additional UTxO amounts. The resulting block hash MUST be captured as part of the snapshot.
    - **REQT-1.2.1.1/xh612fhw3c**: COMPLETED: The base snapshot cache key MUST include `randomSeed` (default 42). Since wallet addresses are derived from the seeded PRNG, different seeds produce different wallets and thus different UTxO addresses. Including randomSeed ensures cache correctness when non-default seeds are used; the parent hash chain propagates this to all child snapshots.

 - **REQT-1.2.2/rqbrjda21d**: COMPLETED: **capoInitialized Snapshot Cache Key** - The capoInitialized snapshot cache key MUST include:
    - **REQT-1.2.2.1/q0qfn40b5f**: COMPLETED: Parent (base) snapshot's block hash
    - **REQT-1.2.2.2/xwdem1hvk9**: COMPLETED: Capo's minter bundle hash (including all dependencies)
    - **REQT-1.2.2.3/vnvmn0c5mf**: COMPLETED: Mint delegate bundle hash (including all dependencies)
    - **REQT-1.2.2.4/bck1nj7r3h**: COMPLETED: Spend delegate bundle hash (including all dependencies)
    - **REQT-1.2.2.5/zjkckrz6np**: COMPLETED: DefaultCapo.hl bundle hash (including all dependencies)
    - **REQT-1.2.2.6/hdwf9fdcg2**: COMPLETED: All hashes MUST be combined into a list and hashed together to form the cache key

 - **REQT-1.2.3/ek3ksgysxv**: COMPLETED: **enabledDelegatesDeployed Snapshot** - This snapshot SHOULD be the basis for all other application-level snapshots. Created when `autoSetup = true`. Its cache key MUST include:
    - **REQT-1.2.3.1/th2fsv10x7**: COMPLETED: Parent (capoInitialized) snapshot's block hash
    - **REQT-1.2.3.2/venhawwjrz**: COMPLETED: All namedDelegate bundles' dependency hashes (namedDelegates are always included, not feature-gated)
    - **REQT-1.2.3.3/8wqpt8zq60**: COMPLETED: Dependencies whose resolution is provided via the Capo's bundle
    - **REQT-1.2.3.4/3r1d1ntx6e**: COMPLETED: dgData controller bundles filtered by `featureEnabled(typeName)` - featureFlags names match dgData controller typeNames exactly, so different featureFlags produce different bundle lists and thus different cache keys
    - **REQT-1.2.3.5/6az9kb2t87**: COMPLETED: `autoSetup = true` SHOULD be the signal for creating this snapshot

> **RESOLVED (id:6az9kb2t87)**: `autoSetup` and `featureFlags` work together without conflict. `autoSetup=true` triggers iteration over all delegates; namedDelegates are always included, while dgData controllers are filtered by `featureEnabled(typeName)`. Different feature sets produce different bundle lists via REQT-1.2.3.4, naturally creating different cache keys.

 - **REQT-1.2.4/qt184d0cfz**: COMPLETED: **Snapshot Parent Linkage** - Every snapshot MUST be strongly linked to its parent snapshot:
    - **REQT-1.2.4.1/jfj78v9wq2**: COMPLETED: By name (logical view) - snapshot names form a chain (via `parentSnapName` in CachedSnapshot)
    - **REQT-1.2.4.2/13f3zam1fm**: COMPLETED: By hash (computational layer) - each snapshot's cache key includes parent's block hash

 - **REQT-1.2.5/mabm4y6q4j**: COMPLETED: **Snapshot File Storage** - On-disk snapshot cache MUST serialize incremental state:
    - **REQT-1.2.5.1/6xjggf5hsd**: COMPLETED: Each snapshot file MUST contain only the new blocks created since the parent snapshot
    - **REQT-1.2.5.2/prvp9f4m21**: COMPLETED: Transaction order within blocks MUST be preserved
    - **REQT-1.2.5.3/wfynk8yq9v**: COMPLETED: File content format: `{parentHash, parentSnapName, blocks, namedRecords, snapshotHash}`
    - **REQT-1.2.5.4/cq5p5jk6wj**: COMPLETED: Hash of the snapshot (block hash) becomes the basis for child snapshot cache keys
    - **REQT-1.2.5.5/t8n3k6w2qp**: COMPLETED: Each snapshot file MUST include `namedRecords` captured during snapshot creation, so tests can reference records by name after restore

> **RESOLVED (id:cq5p5jk6wj)**: The emulator now computes block hashes natively via `blockHashes[]` parallel tracking. Block hashes are computed at `tick()` time using `blake2b([prevHash, ...txHashes].join("\n"))`.

 - **REQT-1.2.6/7k3mfpw2nx**: COMPLETED: **Cache File Location** - Snapshot cache files MUST be stored in `.stellar/emu/` within the project root

 - **REQT-1.2.7/q8h2vr4c5y**: COMPLETED: **Cache Freshness Management**:
    - **REQT-1.2.7.1/m1d6jk9w3p**: COMPLETED: Cache directories MUST have their mtime touched when used if older than 1 day
    - **REQT-1.2.7.2/r5f8n2b4ht**: FUTURE: A cleanup command SHOULD delete cache files older than 1 week (intended for use after full test runs)

 - **REQT-1.2.8/v4c7x9m1kz**: COMPLETED: **Helios Version in Cache Key** - The base snapshot cache key MUST include the Helios compiler version (available via `import { VERSION } from "@helios-lang/compiler"`)

 - **REQT-1.2.9/d34w6546fx**: COMPLETED: **Hierarchical Cache Directories** - Cache MUST use hierarchical directory structure for consumability:
    - **REQT-1.2.9.1/d230hkb6vm**: COMPLETED: Cache MUST use hierarchical directories: `{parentPath}/{snapshotName}-{cacheKey}/snapshot.json` (e.g., `.stellar/emu/bootstrapWithActors-AAAAAA/capoInitialized-CICICICI/snapshot.json`)
    - **REQT-1.2.9.2/asb3wybpc7**: COMPLETED: Snapshot names are invalid if they have any non-alphanumeric characters no spaces no underscores no hyphens maximum length 35 characters
    - **REQT-1.2.9.3/xqnwt4ajgq**: COMPLETED: Snapshot files MUST use hierarchical directory storage with parent path implicit in filesystem structure
        - **REQT-1.2.9.3.1/nnhm7a33kg**: REMOVED: `parentCacheKey` field—removed from `CachedSnapshot` type; hierarchical directories make parent path implicit
        - **REQT-1.2.9.3.2/rgxhbqp84g**: COMPLETED: `parentHash` field MUST be verified on load—if loaded parent's `snapshotHash` doesn't match, `find()` MUST return null to trigger cache rebuild
        - **REQT-1.2.9.3.3/q6f457kp86**: COMPLETED: Post-load integrity check—`find()` MUST verify that the final `blockHashes[-1]` equals recorded `snapshotHash`; return null on mismatch to detect corruption or implementation bugs
    - **REQT-1.2.9.4/dwaf8qb8s1**: COMPLETED: Hierarchical structure MUST enable subtree deletion via `rm -rf {snapshotDir}` when a parent snapshot is invalidated

> **RATIONALE (id:d34w6546fx)**: Hierarchical directories enable developers to see the snapshot chain structure via `ls -R`, identify parent-child relationships at a glance, and perform targeted cleanup via `rm -rf` on any subtree. Parent path is implicit in directory structure—no `parentCacheKey` needed. The `parentHash` field enables verification that loaded parent state matches expected state.

### REQT-1.2.10/d28gyvqegv: NEXT: **Loading Cache with Transaction Reuse**

#### Purpose: Ensures efficient cache loading by reusing already-reconstructed transactions from parent snapshots. Applied when implementing or modifying snapshot loading.

 - **REQT-1.2.10.1/yp9925t014**: NEXT: When loading the cache, it MUST reuse already-reconstructed transactions from dependency snapshots
 - **REQT-1.2.10.2/bkmgarnrsw**: NEXT: Only incremental new transactions from a leaf snapshot MUST be reconstructed
 - **REQT-1.2.10.3/j9adgp9rwv**: NEXT: Incrementally reconstructed transactions MUST be remembered for use when loading later dependency snapshots

### REQT-1.2.11/whp4cvpk9e: COMPLETED: **Key Inputs Storage**

#### Purpose: Enables debugging cache misses and provides access to cache key data on snapshot load. Applied when storing or loading snapshots.

 - **REQT-1.2.11.1/vn0drr8d8s**: COMPLETED: `store()` MUST write `key-inputs.json` alongside `snapshot.json` containing the original `CacheKeyInputs`
 - **REQT-1.2.11.2/e79g49xyyj**: COMPLETED: `find()` MUST load `key-inputs.json` and include it in `CachedSnapshot.cacheKeyInputs`
 - **REQT-1.2.11.3/hn8f6z92k0**: COMPLETED: Missing `key-inputs.json` MUST be handled gracefully (return undefined, for older snapshots)

### REQT-1.2.12/mkap3784hw: COMPLETED: **Offchain Data Storage**

#### Purpose: Enables storage and restoration of test helper data (e.g., actor wallet keys) that doesn't affect cache validity. Applied when storing or loading snapshots.

 - **REQT-1.2.12.1/020mbw1gqw**: COMPLETED: `store()` MUST write `offchain.json` alongside `snapshot.json` when `offchainData` is provided
 - **REQT-1.2.12.2/khqyf56m0g**: COMPLETED: `find()` MUST merge offchain data from parent chain (root → leaf, child keys override parent)
 - **REQT-1.2.12.3/yd750dddgy**: COMPLETED: Empty offchain data MUST NOT create an empty file
 - **REQT-1.2.12.4/0k6bnbbg95**: COMPLETED: `CachedSnapshot.offchainData` MUST contain the merged result from all ancestors

### REQT-1.3/qr6r27cg3q: COMPLETED: **Transaction Validation**

#### Purpose: Ensures submitted transactions meet network requirements. Applied when modifying transaction submission logic.

 - **REQT-1.3.1/brdgk1ddfj**: COMPLETED: MUST reject transactions outside valid slot range
 - **REQT-1.3.2/6rdjgebzyx**: COMPLETED: MUST reject transactions with non-existent inputs
 - **REQT-1.3.3/pejg3twvpv**: COMPLETED: MUST reject transactions with non-existent reference inputs
 - **REQT-1.3.4/qq84z25jk7**: COMPLETED: MUST reject transactions attempting to spend consumed UTxOs

### REQT-1.4/3286vdzwyk: COMPLETED: **Block Production**

#### Purpose: Governs how transactions are confirmed into blocks. Applied when modifying tick() or block handling.

 - **REQT-1.4.1/s5zq3ezdng**: COMPLETED: `tick(n)` MUST advance slot by n
 - **REQT-1.4.2/c9dyh7hkz6**: COMPLETED: `tick()` MUST move all mempool transactions into a new block
 - **REQT-1.4.3/5cwn151ybf**: COMPLETED: Block production MUST update UTxO indices (create new, mark consumed)

### REQT-1.5/951d050efy: BACKLOG: **UTxO Reconstitution**

#### Purpose: Ensures queried UTxOs have fully reconstituted inputs, matching Blockfrost and CachedUtxoIndex behavior. Applied when implementing or modifying UTxO query methods.

 - **REQT-1.5.1/0d7wn2as4g**: BACKLOG: When UTxOs are queried from the emulator, it MUST verify that tx inputs are reconstituted (matching Blockfrost network and CachedUtxoIndex behavior)
 - **REQT-1.5.2/4crgxjzgyr**: BACKLOG: If tx inputs are already reconstituted, it SHOULD skip reconstitution step
 - **REQT-1.5.3/kf7r2w4m9p**: NEXT: Reconstituted txs MUST be stored with the in-memory version of each snapshot's OWNED blocks, whether those blocks are generated from transaction activity or by loading from snapshot's disk cache
 - **REQT-1.5.4/n3z2b9ry3g**: BACKLOG: All other reconstitution activities MUST also be performed (details TBD - requires research into Blockfrost/CachedUtxoIndex reconstitution steps)

## Component: SimpleWallet_stellar

### REQT-2.0/2tgwpmrkxh: COMPLETED: **Wallet Implementation**

#### Purpose: Provides wallet functionality for test actors. Applied when modifying wallet creation or signing.

 - **REQT-2.0.1/mrpwemtk0w**: COMPLETED: MUST implement Helios `Wallet` interface
 - **REQT-2.0.2/fppjhaq32f**: COMPLETED: MUST derive spending key from root private key
 - **REQT-2.0.3/zhas8edv7d**: COMPLETED: MUST support optional staking key derivation
 - **REQT-2.0.4/9cvn4evfpn**: COMPLETED: MUST sign transactions with spending private key
 - **REQT-2.0.5/2a0ffb3cd3**: COMPLETED: MUST query UTxOs from associated network context

## Component: CapoTestHelper

### REQT-3.0/trjb6qtjt6: COMPLETED: **Snapshot Orchestration**

#### Purpose: Provides high-level snapshot management for test suites. Applied when implementing or modifying snapshot restore behavior.

 - **REQT-3.0.1/sjer71jjmb**: COMPLETED: `findOrCreateSnapshot()` MUST reuse existing snapshot or create new one
 - **REQT-3.0.2/7n8ws6gabc**: COMPLETED: `restoreFrom()` MUST transfer actor wallets to new network instance
 - **REQT-3.0.3/49h2ekt53d**: COMPLETED: Snapshot restoration MUST preserve Capo instance references 

### REQT-3.1/p19q6ak0xj: COMPLETED: **Bundle Dependency Hashing**

#### Purpose: Enables contract bundles to expose their dependency hashes for snapshot cache key computation. Applied when implementing cache invalidation (REQT-1.2).

 - **REQT-3.1.1/egfb0jds34**: COMPLETED: Contract bundles MUST expose a method to compute hash of all Helios script dependencies (via `getCacheKeyInputs()` and `computeSourceHash()`)
 - **REQT-3.1.2/x5mdtcjm26**: COMPLETED: Bundle dependency hash MUST be computed from source `.hl` file hashes (NOT compiled UPLC). Uses `getEffectiveModuleList()` to get all `Source` objects, then hashes concatenated `source.content`.
 - **REQT-3.1.3/h3g5k4grkv**: COMPLETED: Bundle MUST include scripts referenced by name, including those resolved via Capo's bundle (via `getEffectiveModuleList()`)
 - **REQT-3.1.4/k7w2m5p9qr**: COMPLETED: Bundle hash includes `configuredParams` in `getCacheKeyInputs().params`

### REQT-3.2/twd653pdm2: COMPLETED: **Script Dependency Resolution**

#### Purpose: Enables cache-key computation for snapshots with dynamic scripts or params, without requiring pre-compilation. Applied when computing cache keys for snapshots beyond the basic enabledDelegatesDeployed level.

 - **REQT-3.2.1/7e7npc64xe**: COMPLETED: Each snapshot MAY define a `resolveScriptDependencies` function via `@hasNamedSnapshot` decorator options
 - **REQT-3.2.2/04k32hh8km**: COMPLETED: **Basic case**: Built-in resolvers return bundle source hashes + params:
    - `resolveCoreCapoDependencies()` returns core bundles (capo minter, mintDelegate, spendDelegate)
    - `resolveEnabledDelegatesDependencies()` returns core bundles + namedDelegate bundles (always) + dgData controller bundles (filtered by `featureEnabled(typeName)`)
 - **REQT-3.2.3/97qa2f7m25**: COMPLETED: **Dynamic case**: Resolver signature supports reading parent state via `ScriptDependencyResolver` type
 - **REQT-3.2.4/5cj9et1a6j**: COMPLETED: **Custom case**: `CacheKeyInputs.extra` field supports closure-captured details including `heliosVersion`

```typescript
type CacheKeyInputs = {
  bundles: Array<{
    name: string;
    sourceHash: string;
    params: Record<string, unknown>;
  }>;
  extra?: Record<string, unknown>;  // closure-captured details
}
```

### REQT-3.3/7hcqed9mvn: COMPLETED: **Built-in Snapshot Registration**

#### Purpose: Ensures consistent registration model for all snapshots, including built-ins. Applied when implementing hierarchical directory support or modifying snapshot orchestration.

 - **REQT-3.3.1/fz89t5wkrw**: COMPLETED: Built-in snapshots (`bootstrapWithActors`, `capoInitialized`, `enabledDelegatesDeployed`) MUST be registered with SnapshotCache before use. All built-in snapshots MUST use the `@hasNamedSnapshot` decorator pattern for consistency and unified cache orchestration.
 - **REQT-3.3.2/1vtn22as3f**: COMPLETED: Each built-in snapshot MUST register its metadata (parentSnapName, resolveScriptDependencies) with SnapshotCache before use
 - **REQT-3.3.3/p4mrpyyady**: COMPLETED: `bootstrapWithActors` MUST use `@hasNamedSnapshot` decorator with `parentSnapName: "genesis"` and `resolveActorsDependencies()` resolver
 - **REQT-3.3.4/pj9agtaypq**: COMPLETED: `capoInitialized` MUST use `@hasNamedSnapshot` decorator with `parentSnapName: "bootstrapWithActors"`, `internal: true`, and `resolveCoreCapoDependencies()` resolver
 - **REQT-3.3.5/5qyt5xzvv1**: COMPLETED: `enabledDelegatesDeployed` MUST use `@hasNamedSnapshot` decorator with `parentSnapName: "capoInitialized"`, `internal: true`, and `resolveEnabledDelegatesDependencies()` resolver
 - **REQT-3.3.6/h4kp7wm2nx**: COMPLETED: `@hasNamedSnapshot` decorator MUST support `internal: true` option that skips `reusableBootstrap()` call in SnapWrap, for snapshots that are part of the bootstrap flow itself

> **RATIONALE (id:7hcqed9mvn)**: All snapshots—including built-ins—must register with SnapshotCache via `@hasNamedSnapshot` decorator. This enables unified cache orchestration, consistent parent chain resolution, and hierarchical directory path construction. The decorator pattern handles cache check, build-if-miss, and store automatically.

### REQT-3.4/n93h9y5s85: COMPLETED: **Actor Wallet Key Storage**

#### Purpose: Enables fast actor wallet restoration by storing private keys in offchain data instead of regenerating from PRNG. Applied when saving or restoring actor snapshots.

 - **REQT-3.4.1/1p346cabct**: COMPLETED: Actor snapshot (`bootstrapWithActors`) MUST store wallet private keys (spending + staking) in `offchainData.actorWallets`
 - **REQT-3.4.2/avwkcrnwqp**: COMPLETED: Actor restoration MUST use `makeBip32PrivateKey(hexToBytes(key))` fast path instead of PRNG regeneration
 - **REQT-3.4.3/ncbfwtyr8h**: COMPLETED: `regenerateActorsFromSetupInfo()` MUST be replaced with `restoreActorsFromStoredKeys()`
 - **REQT-3.4.4/3rexpys2q3**: COMPLETED: `__actorSetupInfo__` namedRecord hack MUST be removed after migration

> **RATIONALE (id:n93h9y5s85)**: PRNG-based wallet regeneration is slow (requires `makeRootPrivateKey()` derivation) and fragile (depends on exact PRNG sequence). Storing the derived keys directly enables instant restoration via `makeBip32PrivateKey()`.

### REQT-3.5/vmq8qmv218: COMPLETED: **Cross-Process Capo Reconstruction**

#### Purpose: Ensures Capo instance is properly instantiated when restoring non-genesis snapshots from disk cache in a new process (where no `bootstrappedStrella` exists).

 - **REQT-3.5.1/vmq8qmv218**: COMPLETED: Disk cache hit for non-genesis snapshots MUST instantiate Capo via `initStellarClass()` when `this.strella` is undefined
 - **REQT-3.5.2/vmq8qmv218**: COMPLETED: After cross-process Capo instantiation, `helperState.bootstrappedStrella`, `previousHelper`, and `bootstrapped` MUST be set for subsequent operations
 - **REQT-3.5.3/vmq8qmv218**: COMPLETED: Same-process restoration (in-memory hit with existing `bootstrappedStrella`) MUST continue using `restoreFrom()` path

> **RATIONALE (id:vmq8qmv218)**: When loading chartered Capo from disk (no in-memory state), there's no `previousHelper` to transfer state from, and no `bootstrappedStrella` to reference. The Capo must be instantiated fresh from the restored network state.

### REQT-3.6/8cbwn9mwxx: COMPLETED: **Egg/Chicken Pattern for Disk Cache Lookup**

#### Purpose: Enables cache key computation when loading chartered Capo from disk without requiring a fully configured Capo instance. Solves the chicken-and-egg problem where cache key needs `configuredParams` but those only exist after minting (which is what the snapshot captures).

See `emulator-capo-chicken-egg.md` for full architectural details.

 - **REQT-3.6.1/84f4k7nb6p**: COMPLETED: **Pre-selected Seed UTxO** - The `bootstrapWithActors` snapshot MUST pre-select and store the seed UTxO in `offchainData.targetSeedUtxo`. This moves seed UTxO selection earlier in the chain, breaking the chicken-and-egg dependency.

 - **REQT-3.6.2/mvf88mnsez**: COMPLETED: **Egg-Compatible Resolvers** - `resolveCoreCapoDependencies()` MUST use `computeSourceHash()` (which needs no config) and retrieve `seedUtxo` from the actors snapshot's `offchainData`, NOT from `configuredParams`.

 - **REQT-3.6.3/mexwd3p8mr**: COMPLETED: **Source Hash Separation** - Cache key computation MUST use only source hashes and identity params (seedUtxo), NOT derived values like `mph`. The `getCacheKeyInputs().params` SHOULD contain identity params only.

 - **REQT-3.6.4/9rrhspdd3m**: COMPLETED: **Capo Config Storage** - The `capoInitialized` snapshot MUST store complete `capoConfig` in `offchainData` including: `mph`, `seedUtxo`, `rev`, `charterAddress`, and other fields needed for Capo reconstruction.

 - **REQT-3.6.5/vz0fc3s057**: COMPLETED: **Capo Reconstruction Decision Tree** - When loading from disk, `findOrCreateSnapshot()` MUST implement the decision tree: a) no Capo or egg → create new with loaded config; b) different chartered Capo → create new; c) same chartered Capo → hot-swap network only.

 - **REQT-3.6.6/dynnc9bq1v**: COMPLETED: **Egg Creation** - When no chartered Capo exists and disk lookup is needed, the system MUST create an egg via `createWith({ setup, partialConfig: {} })` to provide source hashes for cache key computation.

> **RATIONALE (id:8cbwn9mwxx)**: The chicken-and-egg problem occurs when loading chartered Capo from disk: cache key needs `configuredParams` (including `mph`), but `mph` only exists after minting charter (which is what `capoInitialized` captures). Solution: use an "egg" (unconfigured Capo) for source hashes, pre-select `seedUtxo` in actors snapshot, and store `capoConfig` for reconstruction. See ARCH-8wby9gxrav, ARCH-sq123b1884, ARCH-4adwbk7ajp.

### REQT-3.7/yx06ya2paq: NEXT: **Snapshot Decorator Actor Lifecycle**

#### Purpose: Ensures the `actor` field in `@hasNamedSnapshot` is honored consistently across all snapshot paths — build, verify, and load. Applied when implementing or modifying actor management in snapshot operations, or when reviewing snapshot decorator behavior.

 - **REQT-3.7.1/j9b8pr7yck**: IMPLEMENTED/NEEDS VERIFICATION: **Pre-build actor setup** - When building a snapshot (cache miss), the SnapWrap contentBuilder lambda MUST set the declared actor before invoking the content builder (`generateSnapshotFunc`). For `"default"`, MUST call `setDefaultActor()`; for named actors, MUST call `setActor(actorName)`.
    - **REQT-3.7.1.1/bjeez2n09p**: IMPLEMENTED/NEEDS VERIFICATION: **Genesis exception** - Pre-build actor setup MUST be skipped when `parentSnapName === "genesis"`, because actors do not exist yet — the builder creates them.

 - **REQT-3.7.2/pt47cnb818**: COMPLETED: **Post-build actor assertion** - After the content builder returns, the infrastructure MUST verify the current actor matches the declared actor and MUST fail with a descriptive error if it does not. EXPECTS the downstream content builder to keep the declared actor current by the end of its execution; builders that switch actors mid-build MUST restore the declared actor before returning.

 - **REQT-3.7.3/x4mzf51p6g**: COMPLETED: **Post-load actor setup** - When loading a snapshot from cache (`loadCachedSnapshot`), the infrastructure MUST set the declared actor after restoring network state. For `"default"`, MUST call `setDefaultActor()`; for named actors, MUST call `setActor(actorName)`.

 - **REQT-3.7.4/vwk0je2vef**: IMPLEMENTED/NEEDS VERIFICATION: **Single location per path** - Actor lifecycle for the build path (pre-build setup + post-build assertion) MUST be co-located in the SnapWrap contentBuilder lambda. Actor lifecycle for the load path (post-load setup) MUST remain in `loadCachedSnapshot`. These are the only two locations that manage actor state for snapshots.

> **RATIONALE (id:yx06ya2paq)**: The `actor` field in `@hasNamedSnapshot` is declarative — "this snapshot's world is this actor." Without pre-build setup, builders that don't defensively call `setActor()` work on clean builds (parent builder left the right actor) but fail on partial-cache scenarios (parent loaded from cache, actor is stale). The three-part contract (set before build, verify after build, set after load) eliminates this path-dependent fragility.

## Component: StellarTestHelper

### REQT-4.0/473wtxxe8d: COMPLETED: **Actor Snapshot Transfer**

#### Purpose: Ensures actor state transfers correctly during snapshot operations. Applied when modifying snapshot restore behavior.

 - **REQT-4.0.1/brdgk1ddfj**: COMPLETED: Actor wallets MUST be transferable across snapshot restores, since their utxo ids are naturally deterministic in the emulator.

### REQT-4.1/6rdjgebzyx: COMPLETED: **Network Parameter Fixups**

Allows loading unoptimized contracts with large scripts having lots of diagnostic code that's normally optimized out in production.

#### Purpose: Adjusts network parameters for test environment flexibility. Applied when tests need larger transactions or more resources.

 - **REQT-4.1.1/pejg3twvpv**: COMPLETED: `fixupParams()` MUST have increased maxTxSize
 - **REQT-4.1.2/qq84z25jk7**: COMPLETED: `fixupParams()` MUST have increased maxTxExMem
 - **REQT-4.1.3/3286vdzwyk**: COMPLETED: `fixupParams()` MUST have increased maxTxExCpu
 - **REQT-4.1.4/8ahvzanppd**: COMPLETED: `fixupParams()` MUST have decreased refScriptsFeePerByte (divided by 4) to support txns with large refScripts

### REQT-4.2/ch01gxgm4g: COMPLETED: **Stable Envelope Pattern for Shared State**

#### Purpose: Ensures that `actorContext` and `networkCtx` are stable "envelope" objects shared across all test helpers and the Capo, so that updates to their contents are visible everywhere without needing to update references.

 - **REQT-4.2.1/ch01gxgm4g**: COMPLETED: `actorContext` MUST be a singleton stored on `helperState`, shared by all helper instances via getter. The setter MUST throw to prevent accidental replacement.
 - **REQT-4.2.2/ch01gxgm4g**: COMPLETED: When switching actors via `setActor()`, code MUST update `actorContext.wallet` (the contents), NOT replace the `actorContext` object itself.
 - **REQT-4.2.3/ch01gxgm4g**: COMPLETED: All code that previously assigned `this.actorContext = {...}` MUST be changed to update the envelope's contents (`actorContext.wallet = ...`, `actorContext.others = ...`).
 - **REQT-4.2.4/ch01gxgm4g**: COMPLETED: `networkCtx` follows a similar envelope pattern but is swapped during `restoreFrom()` - the test helper adopts the previous helper's networkCtx envelope and updates its `.network` property.

> **RATIONALE (id:ch01gxgm4g)**: Each test creates a new helper instance, but they share a Capo via `helperState.bootstrappedStrella`. The Capo's `setup.actorContext` must be the same object that `setActor()` updates, otherwise the Capo won't see actor changes. The singleton pattern on `helperState` ensures all helpers and the Capo reference the same envelope.

## Component: Migration Tooling

### REQT-5.0/n37jr3sgcw: FUTURE: **Test Helper Migration Agent**

#### Purpose: Assists in migrating existing test helpers from in-memory-only snapshots to the new on-disk caching approach. Applied when upgrading test suites to use persistent snapshot caching.

 - **REQT-5.0.1/p8w2k5m9qr**: FUTURE: An agent SHOULD be created to analyze existing test helpers and identify migration steps
 - **REQT-5.0.2/v3n6j8c2wy**: FUTURE: The agent SHOULD modify test helper code to use the new SnapshotCache mechanism
 - **REQT-5.0.3/h7t4r1f6xz**: FUTURE: The agent SHOULD preserve existing snapshot names and namedRecords patterns

---

## Files

1. `./StellarNetworkEmulator.ts` - Core emulator implementation
2. `../StellarTestHelper.ts` - Base test helper class
3. `../CapoTestHelper.ts` - Capo-specific test helper with snapshot orchestration
4. `../DefaultCapoTestHelper.ts` - Default implementation for Capo testing
5. `../types.ts` - Type definitions including NetworkSnapshot, TestHelperState
6. `../index.ts` - Public exports
7. `../../../reference/essential-stellar-testing.md` - Testing conventions guide
8. `../../../reference/essential-stellar-offchain.md` - Off-chain patterns guide

## Implementation Log

Meta-requirements: maintainers MUST NOT modify past details in the implementation log (e.g. in response to architectural changes). Instead, future changes should be appended to the implementation log to show the progression of the implementation and architecture.

### Phase 1: Core Implementation (Completed)

- Implemented `StellarNetworkEmulator` with full Emulator interface compliance
- Implemented `SimpleWallet_stellar` for actor wallet management
- Implemented snapshot capture/restore with PRNG state preservation
- Implemented `CapoTestHelper` with `@hasNamedSnapshot` decorator
- Implemented actor management with wallet transfer across snapshots
- Added network parameter fixups for test flexibility

### Phase 2: On-Disk Snapshot Caching (Completed)

- Added `blockHashes[]` tracking to `StellarNetworkEmulator` for content-addressable block chain
- Implemented `SnapshotCache` class for disk persistence in `.stellar/emu/`
- Added `getCacheKeyInputs()` and `computeSourceHash()` to `HeliosScriptBundle`
- Implemented three-tier snapshot hierarchy: `SNAP_ACTORS` ("bootstrapWithActors") → `SNAP_CAPO_INIT` → `SNAP_DELEGATES`
- Added `resolveActorsDependencies()`, `resolveCoreCapoDependencies()`, `resolveEnabledDelegatesDependencies()` resolvers
- Added `ActorSetupInfo` tracking for deterministic actor cache keys
- Integrated disk caching into `setupActorsWithCache()` and `bootstrap()` flow
- Added parent linkage via `parentName` and `parentHash` in `CachedSnapshot`
- Included Helios VERSION in cache key computation
- Added explicit logging for cache hits/misses and file writes

### Phase 3: Parent Chain Verification (Completed)

- Evolved REQT-1.2.9.3 from nested directories to flat files with explicit parent linkage
- Implemented `parentCacheKey` for O(1) parent file lookup during chain loading
- Implemented `parentHash` verification in `find()` to detect stale cache and trigger rebuild
- Implemented post-load integrity check: verify `blockHashes[-1]` equals recorded `snapshotHash`
- Updated architecture documentation to clarify verification mechanism

### Phase 4: Hierarchical Directory Architecture (Completed)

Architecture evolution from flat files to hierarchical directories:
- Evolved REQT-1.2.9 from flat `{name}-{key}.json` to hierarchical `{parentPath}/{name}-{key}/snapshot.json`
- Deprecated `parentCacheKey` field (REQT-1.2.9.3.1)—with hierarchical directories, parent path is implicit
- Implemented `parentHash` verification (REQT-1.2.9.3.2) for stale cache detection
- Implemented post-load integrity check (REQT-1.2.9.3.3) verifying `blockHashes[-1]` matches `snapshotHash`
- Added subtree deletion (REQT-1.2.9.4) for `rm -rf` cleanup
- Implemented cache freshness touch for directories (REQT-1.2.7.1)
- Implemented incremental block storage (REQT-1.2.5.1) - only new blocks stored since parent
- Completed dgData controller filtering by featureFlags (REQT-1.2.3.4)
- Built-in snapshots now properly registered with SnapshotCache (REQT-3.3)
- Updated tests to use registry-based API

### Phase 5: Seed and Time Sync Fixes

- Fixed PRNG seed initialization: `StellarTestHelper.randomSeed` now passed to emulator on construction (was passing `undefined`, defaulting to 0 instead of 42)
- Fixed snapshot time drift: `loadSnapshot()` now syncs emulator to wall-clock time via `netPHelper.timeToSlot(Date.now())` to prevent transaction validity failures
- Added architecture documentation for PRNG seed lifecycle (ARCH-edky0aybv7)

#### Next Recommendations

1. **Cleanup Command**: Implement cache cleanup for directories older than 1 week (REQT-1.2.7.2)
2. **Migration Agent**: Create agent to help migrate existing test helpers (REQT-5.0)

---

## Release Management Plan

### v1 (Completed)
- **Goal**: Document emulator and snapshot infrastructure
- **Criteria**:
   - Core emulator requirements documented (REQT-1.0, 1.1, 1.3, 1.4)
   - Wallet requirements documented (REQT-2.0)
   - Snapshot orchestration documented (REQT-3.0)
   - Actor snapshot transfer documented (REQT-4.0)
   - Network parameter fixups documented (REQT-4.1)

### v2 (Completed)
- **Goal**: On-disk snapshot caching with automatic invalidation
- **Criteria**:
   - ✅ Snapshot cache hierarchy implemented (REQT-1.2.1 base, REQT-1.2.2 capoInitialized, REQT-1.2.3 enabledDelegatesDeployed)
   - ✅ Parent linkage by name and hash (REQT-1.2.4)
   - ✅ Snapshot file storage with incremental blocks (REQT-1.2.5)
   - ✅ Cache location in `.stellar/emu/` (REQT-1.2.6)
   - ✅ Cache freshness management for directories (REQT-1.2.7.1)
   - ✅ Helios version in cache key (REQT-1.2.8)
   - ✅ Hierarchical cache directories (REQT-1.2.9)
   - ✅ Bundle dependency hashing (REQT-3.1)
   - ✅ Script dependency resolution (REQT-3.2)
   - ✅ Built-in snapshot registration (REQT-3.3)

### v3 (Current)
- **Goal**: Cache maintenance utilities and migration tooling
- **Criteria**:
   - ⏳ Cleanup command for old cache directories (REQT-1.2.7.2)
   - ⏳ Migration agent for test helpers (REQT-5.0)
