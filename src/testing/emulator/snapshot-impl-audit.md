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

### Open

| ID | Location | Finding | Severity |
|----|----------|---------|----------|
| D1 | ARCHITECTURE.md:476-496 | Fresh Bootstrap workflow doesn't show layered hierarchy (actors→capoInit→delegates) | Doc |
| D3 | ARCHITECTURE.md:512 | Wallet transfer attributed to StellarTestHelper but implemented in CapoTestHelper.restoreFrom() | Minor/Doc |
| D4 | ARCHITECTURE.md:519-520 | Cleanup step ("age out > 1 week") not implemented; REQT-1.2.7.2 is FUTURE | Doc |
| Q1 | Emulator.reqts.md:203 | REQT-1.2.5.1 marked BROKEN but SnapshotCache.store() appears to correctly slice incremental blocks | Investigation |

## Work Units (from Requirements)

| ID | Reqt | Target State | Status |
|----|------|--------------|--------|
| WU1 | REQT-3.3.4 | `capoInitialized` uses `@hasNamedSnapshot` decorator with `snapToCapoInitialized()` method | pending |
| WU2 | REQT-3.3.5 | `enabledDelegatesDeployed` uses `@hasNamedSnapshot` decorator with `snapToEnabledDelegatesDeployed()` method | pending |

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

## Next Steps

1. **Process D1**: Update architecture workflow to show layered hierarchy with decorator pattern
2. **Process D3**: Clarify wallet transfer ownership in architecture
3. **Process D4**: Update architecture to note cleanup is FUTURE
4. **Process Q1**: Investigate why REQT-1.2.5.1 is marked BROKEN
5. **WU1**: Implement `snapToCapoInitialized()` with `@hasNamedSnapshot` decorator
6. **WU2**: Implement `snapToEnabledDelegatesDeployed()` with `@hasNamedSnapshot` decorator
7. Resume I3: @hasNamedSnapshot decorator audit
