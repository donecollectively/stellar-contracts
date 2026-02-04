# Work Unit: Fix Redundant Genesis Transaction Storage

**ID**: `9gnevpjmpt`
**Audit**: `redundant-genesis-txs.audit.md`
**Finding**: `n4p8x7c2qm`

## Problem

Child snapshots are storing duplicate `genesis` arrays. Each snapshot in the chain currently stores the full genesis (24 txs), wasting disk space and violating incremental storage principles.

**Observed**:
```
bootstrapWithActors: genesis=24, blocks=7
capoInitialized: genesis=24, blocks=5
enabledDelegatesDeployed: genesis=24, blocks=0
```

**Expected** (on disk):
```
bootstrapWithActors: genesis=24, blocks=[], blockHashes=[genesisBlockHash]
capoInitialized: genesis=[], blocks=[incremental], blockHashes=[incremental]
enabledDelegatesDeployed: genesis=[], blocks=[incremental], blockHashes=[incremental]
```

**After load**:
- Root: genesis processed → 1 block → UTxO state (verify block hash matches stored)
- Children: parent UTxOs + incremental blocks (no genesis involved)

## Perspective Violated

**REQT-1.2.5.1**: "Each snapshot file MUST contain only the new blocks created since the parent snapshot"

The spirit of incremental storage applies to genesis as well — genesis belongs only in the root snapshot.

## Remediation Guidance

### 1. Root snapshot (bootstrapWithActors) — store genesis only

- Store `genesis: [N]`, `blocks: []`, `blockHashes: [genesisBlockHash]`
- Pre-compute the genesis block hash from genesis tx hashes (same formula as `pushBlock()`)
- Store `snapshotHash: genesisBlockHash` to match `blockHashes[-1]`
- Snapshot should be captured BEFORE any `tick()` — genesis txs stay in mempool
- On load: process genesis → mempool → tick() → creates block → verify hash matches stored

### 2. Child snapshots — store incremental blocks only

When storing (parentSnapName !== "genesis"):
- Set `snapshot.genesis = []`
- Store only incremental blocks (already working)

### 3. SnapshotCache.find() changes

**Root load**:
- Load genesis from disk
- Process genesis → mempool → tick() → creates 1 block → UTxOs
- Verify resulting blockHash matches stored `snapshotHash`
- Return UTxO state with `blocks: [genesisBlock]`, `blockHashes: [genesisBlockHash]`

**Child load**:
- Get parent UTxO state (recursively)
- Apply incremental blocks to parent state
- No genesis handling needed — parent already has genesis converted to block

### 4. Fix the 7 blocks in root snapshot

Currently root has 7 blocks — this means `tick()` was called during actor setup:
- Check `setupActorsWithCache()` or wherever snapshot is captured
- Ensure snapshot captured BEFORE tick(), with genesis in mempool
- OR: process genesis immediately but don't store the resulting blocks

### 5. Verification

After fix, disk cache should show:
```
bootstrapWithActors: genesis=24, blocks=[]
capoInitialized: genesis=[], blocks=[M]
enabledDelegatesDeployed: genesis=[], blocks=[K]
```

## Focus Files

Files the implementer needs loaded:

1. `src/testing/emulator/SnapshotCache.ts` — main implementation
2. `src/testing/emulator/Emulator.ARCHITECTURE.md` — updated with genesis/blocks separation (line ~433)
3. `src/testing/emulator/Emulator.reqts.md` — REQT-1.2.5.1 context
4. `src/testing/CapoTestHelper.ts` — `setupActorsWithCache()`, snapshot capture points
5. `src/testing/emulator/StellarNetworkEmulator.ts` — `snapshot()`, `loadSnapshot()`, genesis handling

## Acceptance Criteria

- [ ] Root snapshot stores `genesis: [N], blocks: [], blockHashes: [hash]`
- [ ] Root snapshot's `snapshotHash` equals pre-computed genesis block hash
- [ ] Child snapshots store `genesis: [], blocks: [incremental]`
- [ ] On root load, processed genesis block hash matches stored `snapshotHash`
- [ ] Children receive parent UTxOs (genesis already converted to block)
- [ ] Tests updated to match new architecture
- [ ] Cache can be cleared and regenerated correctly
