# StellarNetworkEmulator & Testing Infrastructure

## MAINTAINERS MUST READ:

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
   - **base** (actors setup) → cache key: actor names/order/amounts → captures block hash
   - **capoInitialized** → cache key: parent block hash + minter/delegate bundle hashes
   - **enabledDelegatesDeployed** → cache key: parent block hash + all enabled delegate bundle hashes
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

### REQT-1.2/d1cyq7q1ax: BACKLOG: **Snapshot Cache Invalidation**

#### Purpose: Enables on-disk snapshot caching with automatic invalidation when test setup or contract code changes. Applied when implementing persistent snapshot storage.

 - **REQT-1.2.1/1wdfec5p4c**: BACKLOG: **Base Snapshot Cache Key** - The base (actors) snapshot cache key MUST include: actor names, actor order, initial UTxO amounts, and additional UTxO amounts. The resulting block hash MUST be captured as part of the snapshot.

 - **REQT-1.2.2/rqbrjda21d**: BACKLOG: **capoInitialized Snapshot Cache Key** - The capoInitialized snapshot cache key MUST include:
    - **REQT-1.2.2.1/q0qfn40b5f**: Parent (base) snapshot's block hash
    - **REQT-1.2.2.2/xwdem1hvk9**: Capo's minter bundle hash (including all dependencies)
    - **REQT-1.2.2.3/vnvmn0c5mf**: Mint delegate bundle hash (including all dependencies)
    - **REQT-1.2.2.4/bck1nj7r3h**: Spend delegate bundle hash (including all dependencies)
    - **REQT-1.2.2.5/zjkckrz6np**: DefaultCapo.hl bundle hash (including all dependencies)
    - **REQT-1.2.2.6/hdwf9fdcg2**: All hashes MUST be combined into a list and hashed together to form the cache key

 - **REQT-1.2.3/ek3ksgysxv**: BACKLOG: **enabledDelegatesDeployed Snapshot** - This snapshot SHOULD be the basis for all other application-level snapshots. Created when `autoSetup = true`. Its cache key MUST include:
    - **REQT-1.2.3.1/th2fsv10x7**: Parent (capoInitialized) snapshot's block hash
    - **REQT-1.2.3.2/venhawwjrz**: All enabled delegate bundles' dependency hashes (from `.hl` source content)
    - **REQT-1.2.3.3/8wqpt8zq60**: Dependencies whose resolution is provided via the Capo's bundle
    - **REQT-1.2.3.4/3r1d1ntx6e**: The **list of enabled delegates** (featureFlags) - supports tests running with isolated feature-sets
    - **REQT-1.2.3.5/6az9kb2t87**: `autoSetup = true` SHOULD be the signal for creating this snapshot

> **RESOLVED (id:6az9kb2t87)**: `autoSetup` and `featureFlags` work together without conflict. `autoSetup=true` triggers iteration over all delegates; each delegate checks `featureEnabled()` before setup. Different feature sets get different cache keys via REQT-1.2.3.4.

 - **REQT-1.2.4/qt184d0cfz**: BACKLOG: **Snapshot Parent Linkage** - Every snapshot MUST be strongly linked to its parent snapshot:
    - **REQT-1.2.4.1/jfj78v9wq2**: By name (logical view) - snapshot names form a chain
    - **REQT-1.2.4.2/13f3zam1fm**: By hash (computational layer) - each snapshot's cache key includes parent's block hash

 - **REQT-1.2.5/mabm4y6q4j**: BACKLOG: **Snapshot File Storage** - On-disk snapshot cache MUST serialize incremental state:
    - **REQT-1.2.5.1/6xjggf5hsd**: Each snapshot file MUST contain only the new blocks created since the parent snapshot
    - **REQT-1.2.5.2/prvp9f4m21**: Transaction order within blocks MUST be preserved
    - **REQT-1.2.5.3/wfynk8yq9v**: File content format: `{parentHash: hash(parent-snapshot-file), blocks: [...txns], namedRecords: {...}}`
    - **REQT-1.2.5.4/cq5p5jk6wj**: Hash of the snapshot file becomes the basis for child snapshot cache keys
    - **REQT-1.2.5.5/t8n3k6w2qp**: Each snapshot file MUST include `namedRecords` captured during snapshot creation, so tests can reference records by name after restore

> **RESEARCH TASK (id:cq5p5jk6wj)**: Does the emulator compute block hashes natively? If yes, use native block hash. If no, use `hash(previous-snapshot-file)` as the chain anchor.
>
> **Preliminary finding**: `StellarNetworkEmulator.blocks` is typed as `EmulatorTx[][]` - a simple array of transaction arrays with no native block hash. Likely need the file-hash approach. Verify by checking if `EmulatorTx` or Helios upstream provides block hashing.

 - **REQT-1.2.6/7k3mfpw2nx**: BACKLOG: **Cache File Location** - Snapshot cache files MUST be stored in `.stellar/emulator/` within the project root

 - **REQT-1.2.7/q8h2vr4c5y**: BACKLOG: **Cache Freshness Management**:
    - **REQT-1.2.7.1/m1d6jk9w3p**: Cache files MUST have their mtime touched when used if older than 1 day
    - **REQT-1.2.7.2/r5f8n2b4ht**: FUTURE: A cleanup command SHOULD delete cache files older than 1 week (intended for use after full test runs)

 - **REQT-1.2.8/v4c7x9m1kz**: BACKLOG: **Helios Version in Cache Key** - The base snapshot cache key MUST include the Helios compiler version (available via `import { VERSION } from "@helios-lang/compiler"`)

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
 - **REQT-1.5.3/n3z2b9ry3g**: BACKLOG: All other reconstitution activities MUST also be performed (details TBD - requires research into Blockfrost/CachedUtxoIndex reconstitution steps)

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

### REQT-3.1/p19q6ak0xj: BACKLOG: **Bundle Dependency Hashing**

#### Purpose: Enables contract bundles to expose their dependency hashes for snapshot cache key computation. Applied when implementing cache invalidation (REQT-1.2).

 - **REQT-3.1.1/egfb0jds34**: BACKLOG: Contract bundles MUST expose a method to compute hash of all Helios script dependencies
 - **REQT-3.1.2/x5mdtcjm26**: BACKLOG: Bundle dependency hash MUST be computed from source `.hl` file hashes (NOT compiled UPLC - compilation is slow). Use `bundle.getEffectiveModuleList()` to get all `Source` objects, then hash each `source.content`. Consider reusing `CachedHeliosProgram.sourceHashIndex()` pattern.
 - **REQT-3.1.3/h3g5k4grkv**: BACKLOG: Bundle MUST include scripts referenced by name, including those resolved via Capo's bundle
 - **REQT-3.1.4/k7w2m5p9qr**: BACKLOG: Bundle hash SHOULD include entry point params (e.g., `isTestnet`) if not too complicated - these affect script hashes

### REQT-3.2/twd653pdm2: BACKLOG: **Script Dependency Resolution**

#### Purpose: Enables cache-key computation for snapshots with dynamic scripts or params, without requiring pre-compilation. Applied when computing cache keys for snapshots beyond the basic enabledDelegatesDeployed level.

 - **REQT-3.2.1/7e7npc64xe**: BACKLOG: Each snapshot MAY define a `resolveScriptDependencies(parentSnapshot?)` function that returns cache key inputs
 - **REQT-3.2.2/04k32hh8km**: BACKLOG: **Basic case**: Default resolver iterates Capo's enabled delegates → returns bundle source hashes + params
 - **REQT-3.2.3/97qa2f7m25**: BACKLOG: **Dynamic case**: Resolver MAY read parent snapshot state (e.g., specific UTxOs) to derive params needed for cache key computation
 - **REQT-3.2.4/5cj9et1a6j**: BACKLOG: **Custom case**: Resolver MAY capture environment details via closure and include them as `extra` in the cache key inputs

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

#### Next Recommendations

1. **Snapshot Cache Hierarchy**: Implement the three-tier snapshot hierarchy (base → capoInitialized → enabledDelegatesDeployed) with parent linkage
2. **Bundle Dependency Hashing**: Add methods to HeliosBundle to compute dependency hashes for cache keys
3. **On-disk Snapshot Storage**: Implement filesystem-backed snapshot cache with hash-based invalidation

---

## Release Management Plan

### v1 (Current)
- **Goal**: Document emulator and snapshot infrastructure
- **Criteria**:
   - Core emulator requirements documented (REQT-1.0, 1.1, 1.3, 1.4)
   - Wallet requirements documented (REQT-2.0)
   - Snapshot orchestration documented (REQT-3.0)
   - Actor snapshot transfer documented (REQT-4.0)
   - Network parameter fixups documented (REQT-4.1)

### v2 (Planned)
- **Goal**: On-disk snapshot caching with automatic invalidation
- **Criteria**:
   - Snapshot cache hierarchy implemented (REQT-1.2.1 base, REQT-1.2.2 capoInitialized, REQT-1.2.3 enabledDelegatesDeployed)
   - Parent linkage by name and hash (REQT-1.2.4)
   - Snapshot file storage with incremental blocks (REQT-1.2.5)
   - Cache location in `.stellar/emulator/` (REQT-1.2.6)
   - Cache freshness management with touch-on-use (REQT-1.2.7.1)
   - Helios version in cache key (REQT-1.2.8)
   - Bundle dependency hashing (REQT-3.1)

### v3 (Future)
- **Goal**: Cache maintenance utilities and migration tooling
- **Criteria**:
   - Cleanup command for old cache files (REQT-1.2.7.2)
   - Migration agent for test helpers (REQT-5.0)
