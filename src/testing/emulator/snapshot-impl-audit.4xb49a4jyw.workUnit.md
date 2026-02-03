# Snapshot Implementation Audit - State File

**UUT**: `4xb49a4jyw`
*Created: 2026-02-02*
*Expertise: Architect (system prompt) + Discrepancy Audit skill*
*Theme: Goal state alignment - implementation should match architecture*

## Audit Configuration

**Target**: `Emulator.ARCHITECTURE.md` workflows/interfaces vs implementation
**Focus Facets**: Collaborations, Workflows, Interfaces
**Content Scope**:
- `src/testing/emulator/SnapshotCache.ts`
- `src/testing/CapoTestHelper.ts`
- `src/testing/emulator/Emulator.ARCHITECTURE.md`
- `src/testing/emulator/Emulator.reqts.md` *(added for grounding)*

**Guidance**: Requirements are mostly correct and should steer discrepancy analysis. Process issues one at a time.

## Progress

| ID | Facet | Status | Notes |
|----|-------|--------|-------|
| I2 | SnapshotCache API | **completed** | `has()` and `delete()` return types fixed in arch doc |
| I1 | CapoTestHelper → SnapshotCache | **completed** | Private registry access noted but deferred (not workflow-focused) |
| I3 | @hasNamedSnapshot decorator | pending | |
| W1 | Fresh Bootstrap workflow | **completed** | Layered hierarchy not shown in arch diagram |
| W2 | Cached Bootstrap workflow | **completed** | Wallet transfer attribution unclear |
| W3 | Cache Invalidation workflow | **completed** | Cleanup step describes FUTURE behavior |

## Findings

### Resolved

| ID | Location | Finding | Resolution |
|----|----------|---------|------------|
| F1 | ARCHITECTURE.md:320,323 | `has()` and `delete()` return types sync but impl is async | Updated arch doc to `Promise<boolean>` |
| F2 | CapoTestHelper.ts:579-618 | `setupActorsWithCache()` uses old key-based API (broken) | Removed deprecated method |
| F3 | CapoTestHelper.ts:679 | Stale `cacheKey` variable reference, wrong "miss" message in hit block | Removed broken line, added proper timing logs |
| F4 | CapoTestHelper.ts | Missing diagnostic logs with timing on several branches | Added timing to all `findOrCreateSnapshot` branches |
| D1 | ARCHITECTURE.md:492-523 | Fresh Bootstrap workflow didn't show layered hierarchy | Updated to show 3-layer decorator pattern |
| D3 | ARCHITECTURE.md:525-540 | Wallet transfer attributed to StellarTestHelper | Fixed to CapoTestHelper.restoreFrom() |
| Q1 | Emulator.reqts.md:203 | REQT-1.2.5.1 marked BROKEN but impl is correct | Updated status to COMPLETED |
| D4 | ARCHITECTURE.md:618-627 | Cleanup step described as implemented | Added FUTURE note for REQT-1.2.7.2 |
| D5 | ARCHITECTURE.md:616, SnapshotCache.ts:480 | `loadedSnapshots` is instance-scoped but arch says "process lifetime" | Accepted as-is (safe enough) |
| F6 | StellarNetworkEmulator.ts:571-612 | Snapshot restore sets `currentSlot` to snapshot time (past), but txn validity uses `Date.now()` causing `isValidSlot()` failures when drift > 180s | Fixed: `loadSnapshot()` now syncs to wall-clock via `netPHelper.timeToSlot(Date.now())` |
| F7 | StellarTestHelper.ts:231,240,872 | Emulator created with `undefined` seed before `randomSeed` was set; PRNG started at 0 instead of 42 | Fixed: moved `randomSeed` init before `mkNetwork()`, pass `this.randomSeed` to emulator |
| F8 | StellarTestHelper.ts:684-708 | Actor wallet regeneration uses PRNG replay instead of stored keys | Implemented `getActorWalletKeys()` and `restoreActorsFromStoredKeys()` using `makeBip32PrivateKey(hexToBytes())` fast path; removed `regenerateActorsFromSetupInfo()`, `createWalletWithoutUtxo()`, `parseActorSetupInfo()`, and `__actorSetupInfo__` hack |
| F10 | SnapshotCache.ts | No mechanism for offchain data outside cache key | Implemented `offchainData` field in `CachedSnapshot`, `offchain.json` file storage, parent chain merging in `find()` |
| F9 | SnapshotCache.ts | Cache key inputs not stored in snapshot directory | Implemented `cacheKeyInputs` field, `key-inputs.json` written on store, loaded on find with graceful fallback |

### Open

| ID | UUT | Location | Finding | Work Unit |
|----|-----|----------|---------|-----------|

### Related Commits

| Commit | Description | Actual Fix |
|--------|-------------|------------|
| 1d5bd4bd | "fix timestamp / tx validity problem" | Actor lookup: `setDefaultActor()` vs `setActor("default")` (misleading message) |

## Work Units (from Requirements)

| ID | Reqt | Target State | Status |
|----|------|--------------|--------|
| WU0 | REQT-3.3.6 | `@hasNamedSnapshot` supports `internal: true` option | **completed** |
| WU1 | REQT-3.3.4 | `capoInitialized` uses `@hasNamedSnapshot` with `internal: true` | **completed** |
| WU2 | REQT-3.3.5 | `enabledDelegatesDeployed` uses `@hasNamedSnapshot` with `internal: true` | **completed** |
| WU3 | REQT-3.4, F8 | Store actor wallet keys in offchain data; restore via `makeBip32PrivateKey` | **completed** |
| WU4 | REQT-1.2.11, F9 | Store `key-inputs.json` in snapshot directory | **completed** |
| WU5 | REQT-1.2.12, F10 | Add offchain data storage mechanism | **completed** |

**Dependency chain**: WU5 ← WU3 (actor keys requires offchain data mechanism)

### WU0: Add `internal` option to @hasNamedSnapshot (REQT-3.3.6)

**Prerequisite for WU1 and WU2**

**Update `SnapshotDecoratorOptions` type** (CapoTestHelper.ts ~line 57):
```typescript
export type SnapshotDecoratorOptions = {
    actor: string;
    parentSnapName: ParentSnapName;
    internal?: boolean;  // NEW: skip reusableBootstrap() for bootstrap-internal snapshots
    resolveScriptDependencies?: ScriptDependencyResolver;
};
```

**Update `SnapWrap`** (CapoTestHelper.ts ~line 494):
```typescript
async function SnapWrap(this: AnyCapoTestHelper, ...args: any[]) {
    if (parentSnapName === "genesis") {
        this.ensureHelperState();
    } else if (internal) {
        // Internal snapshots are part of bootstrap flow - don't call reusableBootstrap()
        this.ensureHelperState();
    } else {
        await this.reusableBootstrap();
    }
    // ... rest unchanged
}
```

---

### WU1: capoInitialized decorator (REQT-3.3.4)

**Depends on:** WU0

**Create:**
```typescript
// Builder method - does the actual work
async capoInitialized(args?, options?): Promise<void> {
    await this.mintCharterToken(args, options);
    // tick happens in decorator wrapper
}

// Decorated wrapper
@CapoTestHelper.hasNamedSnapshot(SNAP_CAPO_INIT, {
    actor: "default",
    parentSnapName: SNAP_ACTORS,
    internal: true,  // Part of bootstrap flow
    async resolveScriptDependencies() {
        return this.resolveCoreCapoDependencies();
    },
})
async snapToCapoInitialized(): Promise<void> {
    // Decorator calls capoInitialized() and handles caching
}
```

**Remove:** `tryRestoreCapoInitialized()` (lines 899-918), `saveCapoInitializedSnapshot()` (lines 924-941)

**Update `bootstrap()`:** Replace lines 867-879 with call to `await this.snapToCapoInitialized()`

---

### WU2: enabledDelegatesDeployed decorator (REQT-3.3.5)

**Depends on:** WU0

**Create:**
```typescript
// Builder method
async enabledDelegatesDeployed(args?, options?): Promise<void> {
    await this.extraBootstrapping(args, options);
    // tick happens in decorator wrapper
}

// Decorated wrapper
@CapoTestHelper.hasNamedSnapshot(SNAP_DELEGATES, {
    actor: "default",
    parentSnapName: SNAP_CAPO_INIT,
    internal: true,  // Part of bootstrap flow
    async resolveScriptDependencies() {
        return this.resolveEnabledDelegatesDependencies();
    },
})
async snapToEnabledDelegatesDeployed(): Promise<void> {
    // Decorator calls enabledDelegatesDeployed() and handles caching
}
```

**Remove:** `tryRestoreDelegatesDeployed()` (lines 948-967), `saveDelegatesDeployedSnapshot()` (lines 973-990)

**Update `bootstrap()`:** Replace lines 881-889 with call to `await this.snapToEnabledDelegatesDeployed()`

---

**Note**: User is updating architecture with guidance for storing reconstructed txns in memory for parent layers and reusing them (REQT-1.2.10).

## Changes Applied

1. **Emulator.ARCHITECTURE.md**: Updated `has()` and `delete()` signatures to async
2. **CapoTestHelper.ts**:
   - Removed deprecated `setupActorsWithCache()` method
   - Fixed `findOrCreateSnapshot()`:
     - Removed broken line 679 (undefined `cacheKey`, wrong message)
     - Added `performance.now()` timing to all branches
     - Added diagnostic emojis: ⚡ (in-memory), 💾 (disk), 📦 (miss), 🐢 (build)
3. **Emulator.reqts.md**: Updated REQT-3.3.1, 3.3.4, 3.3.5 to require `@hasNamedSnapshot` decorator for all built-in snapshots
4. **Emulator.ARCHITECTURE.md**: Updated Fresh Bootstrap workflow to show 3-layer decorator pattern (D1)
5. **Emulator.ARCHITECTURE.md**: Fixed Cached Bootstrap workflow - wallet transfer by CapoTestHelper not StellarTestHelper (D3)
6. **Emulator.ARCHITECTURE.md**: Added FUTURE note to Cache Invalidation cleanup step (D4)
7. **Emulator.reqts.md**: Updated REQT-1.2.5.1 from BROKEN to COMPLETED (Q1)
8. **Emulator.ARCHITECTURE.md**: Clarified `loadedSnapshots` is instance-scoped not process-scoped (D5)
9. **CapoTestHelper.ts**: Added `internal` option to decorator, implemented `snapToCapoInitialized()` (WU0, WU1)
10. **Emulator.ARCHITECTURE.md**: Added `internal` option to SnapshotDecoratorOptions type and built-in relationships
11. **StellarNetworkEmulator.ts**: `loadSnapshot()` syncs emulator to wall-clock time after restore (F6)
12. **Emulator.ARCHITECTURE.md**: Clarified `actor: "default"` semantic in SnapshotDecoratorOptions (calls `setDefaultActor()` not `setActor("default")`)
13. **StellarTestHelper.ts**: Fixed seed sync - `randomSeed` now set before `mkNetwork()`, passed to emulator (F7)
14. **Emulator.ARCHITECTURE.md**: Added "PRNG Seed and Determinism" section (ARCH-edky0aybv7) documenting seed lifecycle and snapshot storage
15. **Emulator-architecture.jsonl**: Added ARCH-edky0aybv7 concern record for PRNG seed determinism
16. **Emulator.reqts.md**: Added Phase 5 to implementation log for seed and time sync fixes

## Next Steps

1. ~~**Process D1**: Update architecture workflow~~ ✅ Done
2. ~~**Process D3**: Clarify wallet transfer ownership~~ ✅ Done
3. ~~**Process D4**: Update architecture to note cleanup is FUTURE~~ ✅ Done
4. ~~**Process Q1**: Investigate REQT-1.2.5.1 BROKEN status~~ ✅ Fixed (was correct, updated to COMPLETED)
5. ~~**Resolve D5**: `loadedSnapshots` scope~~ ✅ Accepted instance-scoped as safe enough
6. ~~**WU0**: Add `internal: true` option to decorator~~ ✅ Done
7. ~~**WU1**: Implement `snapToCapoInitialized()`~~ ✅ Done
8. ~~**WU2**: Implement `snapToEnabledDelegatesDeployed()` with `@hasNamedSnapshot` decorator~~ ✅ Done
9. ~~**WU5**: Implement offchain data storage mechanism (REQT-1.2.12)~~ ✅ Done
10. **WU4**: Implement key-inputs storage (REQT-1.2.11) - see `emulator.gyjxwjjt91.workUnit.md`
11. ~~**WU3**: Store actor wallet keys in offchain data (REQT-3.4)~~ ✅ Done - `getActorWalletKeys()` + `restoreActorsFromStoredKeys()` replaces PRNG regeneration
12. Resume I3: @hasNamedSnapshot decorator audit
