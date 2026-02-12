# Work Unit: Cross-Process Capo Reconstruction

**UUT**: `vmq8qmv218`
**Finding**: F11
**Audit**: `snapshot-impl-audit.4xb49a4jyw`
**Created**: 2026-02-02

> **Required context**: Load [work-planner.SKILL.md](../../../skillz/work-planner/work-planner.SKILL.md) for lifecycle protocol, team composition, and sign-off procedures before operating on this work unit.

## References

| Type | ID | Description |
|------|-----|-------------|
| Architecture | ARCH-rw8jqbj00a | CapoTestHelper component |
| Architecture | ARCH-1d82vckcae | SnapshotCache component |
| Requirement | REQT-3.0.3/49h2ekt53d | Snapshot restoration MUST preserve Capo instance references |
| Requirement | REQT-3.5/vmq8qmv218 | NEW: Cross-process Capo reconstruction |

## Problem

When restoring from disk cache (cross-process), `restoreFrom()` fails because it requires `bootstrappedStrella` and `previousHelper` which only exist for same-process restoration.

**Failing code path** (CapoTestHelper.ts):

1. `findOrCreateSnapshot()` called for non-genesis snapshot (e.g., `enabledDelegatesDeployed`)
2. In-memory check: MISS
3. Disk cache check: HIT (lines 753-798)
4. Disk cache hit loads network state, stores in `helperState.snapshots`
5. Returns `this.strella` (undefined - no Capo instantiated)

Later, for in-memory hit on same snapshot:
1. In-memory check: HIT (line 709)
2. Calls `restoreFrom(snapshotName)` (line 739)
3. `restoreFrom()` throws at line 879: "can't restore without bootstrappedStrella"

**Root cause**: Disk cache hit path for non-genesis snapshots doesn't instantiate the Capo or set up `helperState` for subsequent operations.

## Perspective Violated

**Architecture (ARCH-rw8jqbj00a)**: CapoTestHelper owns Capo instance lifecycle, but cross-process restoration path doesn't instantiate the Capo.

**Requirement (REQT-3.0.3)**: "Snapshot restoration MUST preserve Capo instance references" - incomplete for cross-process case where no prior instance exists.

## Target State

1. Disk cache hit for non-genesis snapshots MUST instantiate the Capo
2. `helperState` MUST be populated for subsequent `restoreFrom()` calls
3. Architecture MUST distinguish same-process vs cross-process restoration paths

## Remediation Guidance

Fix the disk cache hit path to instantiate Capo for non-genesis snapshots.

### In `findOrCreateSnapshot()` (CapoTestHelper.ts:789-797)

```typescript
// Disk cache hit for non-genesis snapshot
// Cross-process restoration - must instantiate Capo (no bootstrappedStrella available)
if (!this.strella) {
    await this.initStellarClass();
    // Set up helperState for subsequent restoreFrom() calls
    this.helperState!.bootstrappedStrella = this.strella;
    this.helperState!.previousHelper = this;
    this.helperState!.bootstrapped = true;
}

if (actorName === "default") {
    await this.setDefaultActor();
} else {
    await this.setActor(actorName);
}
const elapsed = (performance.now() - diskStart).toFixed(1);
console.log(`  💾 disk cache hit '${snapshotName}': ${elapsed}ms`);
return this.strella;
```

## Focus Files

| File | Purpose |
|------|---------|
| `src/testing/CapoTestHelper.ts:789-797` | Disk cache hit for non-genesis - add Capo instantiation |

## Verification

- [x] Tests pass when restoring non-genesis snapshots from disk cache (cross-process)
- [x] `this.strella` is valid after disk cache hit for non-genesis snapshots (REQT-3.5.1/vmq8qmv218)
- [x] Same-process restoration still works (regression check) (REQT-3.5.3/vmq8qmv218)
- [x] Architecture updated to distinguish same-process vs cross-process paths
