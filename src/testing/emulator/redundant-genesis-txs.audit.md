# Emulator Architecture Audit

**Expertise**: Architect (snapshot caching architecture)
**Theme**: Goal state alignment — duplicate genesis blocks in snap cache
**Scope**: `Emulator.ARCHITECTURE.md`, `Emulator.reqts.md`, SnapshotCache implementation
**Created**: 2026-02-03

## Full Context for Resume

**Audit Purpose**: Determine whether storing duplicate genesis blocks in child snapshots is expected behavior or an oversight in the architectural guidance.

**Key Files**:
- `src/testing/emulator/Emulator.ARCHITECTURE.md` - Architecture documentation
- `src/testing/emulator/Emulator.reqts.md` - Requirements specification
- `src/testing/emulator/SnapshotCache.ts` - Implementation

## Audit Structure

Based on Architect interview phases applied to this specific issue:

1. [x] Phase 1: Establish facts from disk cache observation
2. [ ] Phase 2: Review architecture guidance for genesis handling
3. [ ] Phase 3: Review requirements for genesis handling
4. [ ] Phase 4: Synthesize finding (gap, oversight, or intentional)

---

## Findings

### Finding 1: `n4p8x7c2qm` — Genesis transactions duplicated in all child snapshots

**Location**: In "Snapshot File Storage" section (describes incremental storage) of `Emulator.ARCHITECTURE.md:365-431`

**Evidence**:
```
Observed disk state:
- bootstrapWithActors: 24 genesis txs, 7 blocks
- capoInitialized: 24 genesis txs, 5 blocks (incremental)
- enabledDelegatesDeployed: 24 genesis txs, 0 blocks (incremental)

Blocks are correctly incremental. Genesis array is fully duplicated.
```

**Architecture/Reqts Analysis**:

1. **REQT-1.2.5.1** states: "Each snapshot file MUST contain only the new blocks created since the parent snapshot" — but says nothing about `genesis` array.

2. **REQT-1.2.5.3** specifies file format: `{parentHash, parentSnapName, blocks, namedRecords, snapshotHash}` — `genesis` not listed, suggesting it shouldn't be stored incrementally.

3. **Architecture section "Snapshot File Storage"** (line 427-431) mentions "incremental blocks only" but doesn't address genesis.

4. **NetworkSnapshot type** (line 452-457) includes `seed, slot` but architecture doesn't specify whether `genesis` should be in this type for child snapshots.

**Gap Identified**: The architecture and requirements explicitly address incremental `blocks` storage but are **silent on genesis transaction handling**. The implementation appears to store full `genesis` in every snapshot, which contradicts the spirit of incremental storage.

**Status**: `resolved` → workUnit `9gnevpjmpt`

**Resolution**: Option B selected — implementation change + architecture update.

**Proposed Resolution Options** (historical):

A. **Architecture clarification (guidance-only)**: Add explicit statement that `genesis` should only be stored in the root snapshot (`bootstrapWithActors`), and child snapshots should inherit genesis from parent chain.

B. **Implementation change + architecture**: Update SnapshotCache to not store `genesis` in child snapshots, reconstruct from parent during `find()`. Update reqts/arch to document this.

C. **Accept as-is**: Determine genesis duplication is acceptable (small overhead vs. complexity of incremental genesis handling). Document as intentional design choice.

---

## Current Position

**Complete**

## Completed Items

1. Finding `n4p8x7c2qm`: Genesis duplication → resolved via workUnit `9gnevpjmpt`

## Artifacts Updated

- `Emulator.ARCHITECTURE.md` — Added "Genesis vs Blocks Separation" section
- `Emulator-architecture.jsonl` — Added ARCH-h3x1exgvrf (concern) and ARCH-9gnevpjmpt (workUnit doc)
- `redundant-genesis-txs.9gnevpjmpt.workUnit.md` — Created for implementer
