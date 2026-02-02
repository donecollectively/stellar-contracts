# Snapshot Implementation Audit - State File

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

### Open

| ID | Location | Finding | Severity |
|----|----------|---------|----------|
| D5 | ARCHITECTURE.md:616, SnapshotCache.ts:480 | `loadedSnapshots` is instance-scoped but arch says "process lifetime" | Design |

## Work Units (from Requirements)

| ID | Reqt | Target State | Status |
|----|------|--------------|--------|
| WU1 | REQT-3.3.4 | `capoInitialized` uses `@hasNamedSnapshot` decorator | pending |
| WU2 | REQT-3.3.5 | `enabledDelegatesDeployed` uses `@hasNamedSnapshot` decorator | pending |

### WU1: capoInitialized decorator (REQT-3.3.4)

**Pattern to follow**: `snapToBootstrapWithActors()` + `bootstrapWithActors()` at lines 547-578

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

## Next Steps

1. ~~**Process D1**: Update architecture workflow~~ ✅ Done
2. ~~**Process D3**: Clarify wallet transfer ownership~~ ✅ Done
3. ~~**Process D4**: Update architecture to note cleanup is FUTURE~~ ✅ Done
4. ~~**Process Q1**: Investigate REQT-1.2.5.1 BROKEN status~~ ✅ Fixed (was correct, updated to COMPLETED)
5. **Resolve D5**: Decide if `loadedSnapshots` should be process-scoped (static) or instance-scoped
6. **WU1**: Implement `snapToCapoInitialized()` with `@hasNamedSnapshot` decorator
7. **WU2**: Implement `snapToEnabledDelegatesDeployed()` with `@hasNamedSnapshot` decorator
8. Resume I3: @hasNamedSnapshot decorator audit
