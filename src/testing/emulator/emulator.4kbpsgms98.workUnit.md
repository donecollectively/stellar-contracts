# Work Unit: Composite Cache Key for loadedSnapshots

**UUT**: `4kbpsgms98`
**Finding**: F13
**Audit**: `snapshot-impl-audit.4xb49a4jyw`
**Created**: 2026-02-02

> **Required context**: Load [work-planner.SKILL.md](../../../skillz/work-planner/work-planner.SKILL.md) for lifecycle protocol, team composition, and sign-off procedures before operating on this work unit.

## References

| Type | ID | Description |
|------|-----|-------------|
| Architecture | ARCH-1d82vckcae | SnapshotCache component |
| Architecture | ARCH-1xrn9a4jax | Loaded snapshots concern |
| Architecture | ARCH-kqc3jng98y | Disk Chain Load workflow |
| Architecture | ARCH-tz34av7n63 | Memory-Assisted Load workflow |
| Requirement | REQT-1.2.10.3 | Process-lifetime cache |

## Problem

When `initialize()` is called with a new seed, the second Capo gets the same address as the first Capo because `SnapshotCache.loadedSnapshots` is keyed by snapshot name only, not by cache key.

**Failing test**: "makes a different address depending on (txId, outputIndex) parameters of the Minting script"

**Flow causing failure**:
1. Test 1: Bootstrap Capo A with seed 42 → stored in `loadedSnapshots.get("capoInitialized")`
2. Test 2: `initialize({ randomSeed: 43 })` → seed changes
3. Test 2: `bootstrap()` → `snapshotCache.find("capoInitialized")`
4. `find()` checks `loadedSnapshots.get("capoInitialized")` → HIT (stale!)
5. Returns Capo A's snapshot with wrong `rootCapoScriptHash`
6. Capo B gets same address as Capo A

## Perspective Violated

**Architecture (ARCH-1d82vckcae)**: SnapshotCache owns cache identity. Different seeds should produce different cache entries, but name-only key doesn't distinguish them.

## Target State

1. `loadedSnapshots` keyed by `{snapshotName}:{cacheKey}` (composite key)
2. `find()` computes cache key BEFORE checking in-memory cache
3. Different seeds → different cache keys → no stale hits

## Remediation Guidance

### In `SnapshotCache.find()` (SnapshotCache.ts)

Move cache key computation before the in-memory lookup:

```typescript
async find(snapshotName: string): Promise<CachedSnapshot | null> {
    const entry = this.getRegistryEntry(snapshotName);
    if (!entry) {
        console.warn(`SnapshotCache: no registry entry for '${snapshotName}'`);
        return null;
    }

    // Resolve parent chain first (needed for cache key computation)
    let parentPath: string | null = null;
    let parentHash: string | null = null;
    let parent: CachedSnapshot | null = null;

    if (entry.parentSnapName !== "genesis") {
        parent = await this.find(entry.parentSnapName);
        if (!parent) {
            return null;
        }
        parentPath = parent.path || null;
        parentHash = parent.snapshotHash;
    }

    // Compute cache key BEFORE checking in-memory cache
    let cacheKey: string;
    if (entry.resolveScriptDependencies) {
        const inputs = await entry.resolveScriptDependencies();
        cacheKey = this.computeKey(parentHash, inputs);
    } else {
        cacheKey = this.computeKey(parentHash, { bundles: [] });
    }

    // Check in-memory cache with composite key
    const mapKey = `${snapshotName}:${cacheKey}`;
    const cached = this.loadedSnapshots.get(mapKey);
    if (cached) {
        return cached;
    }

    // Continue with disk lookup...
    const snapshotDir = this.getSnapshotDir(cacheKey, snapshotName, parentPath);
    // ... rest unchanged

    // When storing result:
    this.loadedSnapshots.set(mapKey, result);
    return result;
}
```

### In `SnapshotCache.store()` (if caching on store)

Use same composite key format when storing.

### Related fixes (already in progress)

1. **CapoTestHelper.initialize()**: Clear `helperState` (snapshots, offchainData, bootstrappedStrella)
2. **Capo.init()**: Set `bundle.configuredScriptDetails.scriptHash` from `rootCapoScriptHash`

## Focus Files

| File | Purpose |
|------|---------|
| `src/testing/emulator/SnapshotCache.ts:584-591` | Move cache key computation before in-memory lookup |
| `src/testing/emulator/SnapshotCache.ts` | Update `loadedSnapshots.set()` calls to use composite key |

## Verification

- [x] Test "makes a different address" passes
- [x] `initialize()` with new seed produces different Capo address
- [x] Same seed still hits in-memory cache (no regression)
- [x] Cross-process restoration still works (disk cache)
- [x] Architecture updated to reflect composite key (DONE)

---

## Coder Report

- **Completed**: 2026-02-02
- **Commit**: (pending)

### Summary

Fixed `loadedSnapshots` cache key collision by using composite key `{snapshotName}:{cacheKey}` instead of name-only key. Cache key is now computed before checking in-memory cache, ensuring different seeds/configs produce different cache entries.

### Requirements Addressed

| REQT ID | Label | Status |
|---------|-------|--------|
| REQT-1.2.10.3 | Process-lifetime cache | Fixed - now uses composite key |

### Files Changed

- `src/testing/emulator/SnapshotCache.ts:584-744` — Restructured `find()` to compute cache key before in-memory lookup; use composite key for `loadedSnapshots.get()` and `loadedSnapshots.set()`
- `src/testing/emulator/SnapshotCache.ts:822-828` — Added in-memory caching in `store()` using composite key

### Architectural Alignment

- ARCH-1d82vckcae: SnapshotCache now correctly owns cache identity via composite key
- ARCH-tz34av7n63: Memory-Assisted Load workflow now correctly distinguishes different configs

### Blockers & Stubs

| Issue | Location | Suggested Resolution |
|-------|----------|---------------------|
| (none) | | |

### Out-of-Scope Observations

- Pre-existing type errors in `Capo.ts:1311` and `CapoTestHelper.ts:766,841` (unrelated to this fix)

### Questions Raised

- (none)
