# Emulator Workflow Implementation Audit

**Created**: 2026-02-03
**Status**: In Progress
**Theme**: Goal State Alignment

## Audit Purpose

Verify implementation aligns with `Emulator.ARCHITECTURE.md` workflows:
1. All workflow steps are implemented
2. No orphaned/experimental code remains
3. Design patterns match implementation

## Files in Scope

| File | Role |
|------|------|
| `src/testing/emulator/StellarNetworkEmulator.ts` | Blockchain simulation, UTxO tracking, snapshot capture/restore |
| `src/testing/emulator/SnapshotCache.ts` | On-disk snapshot persistence, hierarchical loading |
| `src/testing/CapoTestHelper.ts` | Snapshot orchestration, namedRecords, Capo instance |
| `src/testing/StellarTestHelper.ts` | Actor management, wallet transfer |
| `src/testing/types.ts` | Type definitions |

## Audit Structure (by Workflow)

### WF-1: Bootstrap Chartered Capo (ARCH-w3xvf0hm5w)
- [x] Layer 1: snapToBootstrapWithActors
- [x] Layer 2: snapToCapoInitialized
- [x] Layer 3: snapToEnabledDelegatesDeployed
- [x] Pre-selected seedUtxo pattern (ARCH-4adwbk7ajp)
- [x] capoConfig storage (ARCH-psqv6y39h5)
- [x] Architecture updated to show initialize() in flow

### WF-2: Load Chartered Capo from Memory (ARCH-x7v4h6xyx8)
- [x] In-memory snapshot detection
- [x] Setup Envelope pattern (network hot-swap)
- [x] Actor transfer via previousHelper

### WF-3: Load Chartered Capo from Disk (ARCH-c1kttx6sp2)
- [x] Egg/chicken pattern
- [x] capoConfig extraction from offchainData
- [x] Capo reconstruction

### WF-4: Disk Chain Load (ARCH-kqc3jng98y)
- [x] loadedSnapshots Map
- [x] Recursive parent resolution
- [x] Incremental UTxO application (applyIncrementalBlocks)

### WF-5: Memory-Assisted Load (ARCH-tz34av7n63)
- [x] loadedSnapshots hit path
- [x] Composite key format ({name}:{cacheKey})

### WF-6: Cache Invalidation
- [x] Bundle hash computation - **ISSUE: see q7nk2wjm8p**
- [x] Cache key mismatch triggers rebuild
- [x] Touch mechanism for freshness

### WF-7: Genesis Handling in Snapshot Load (ARCH QUESTION)
- [x] Clarify semantic: children inherit genesis from parent at load time (Option B)
- [x] Store `genesis: []` on disk for children, `find()` inherits from parent
- [x] Update architecture doc with decision
- [x] Implement chosen approach

## Findings

| UUT | Status | Location | Summary |
|-----|--------|----------|---------|
| v7mq2xk9jp | Backlog | CapoTestHelper.ts:1034-1065 | Debug logging in restoreFrom() - defer to diagnostic logging work |
| q7nk2wjm8p | Open | CapoTestHelper resolvers + Emulator.ARCHITECTURE.md:871 | Cache key computation uses computeSourceHash() directly instead of getCacheKeyInputs(). Works for Capo egg pattern but: (1) Non-Capo contract types need getCacheKeyInputs() with configuredParams; (2) Even for egg, different seedUtxo must produce different cache keys - need to verify this is handled correctly. Architecture doc says "via getCacheKeyInputs()" but impl bypasses it. |
| g8nw3kjm2p | Fixed | SnapshotCache.find() + Emulator.ARCHITECTURE.md | Genesis handling: children now inherit genesis from parent in find(). Store [] on disk, inherit at load time. Architecture doc updated. |

## Resolved

| UUT | Resolution |
|-----|------------|
| r8kj3mxq2p | Fixed | Deleted ~140 lines of commented-out GenesisTx/RegularTx classes from StellarNetworkEmulator.ts:61-198 |
| k4np7rj2qw | Fixed | Deleted unused legacy constant SNAP_INIT from CapoTestHelper.ts:46 |
| p2jm8knr4w | Fixed | Updated architecture doc to show initialize() in bootstrap workflow |
| x9km3wp4jq | Reverted | Deleted deprecated createWallet() - RESTORED: needed for Helios Emulator interface compliance |
| m4jq8wkn3p | Fixed | Deleted commented-out initNetworkParams() from StellarNetworkEmulator.ts |
| n2km8wjp4q | Fixed | Removed unused import SnapshotRegistryEntry from CapoTestHelper.ts |

