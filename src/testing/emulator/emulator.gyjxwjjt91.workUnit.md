# Work Unit: Store Cache Key Inputs in Snapshot Directory

**UUT**: `gyjxwjjt91`
**Finding**: F9
**Audit**: `snapshot-impl-audit.4xb49a4jyw`
**Created**: 2026-02-02

## References

| Type | ID | Description |
|------|-----|-------------|
| Architecture | ARCH-ja63e3bh8p | Key inputs concern |
| Architecture | ARCH-1d82vckcae | SnapshotCache component |
| Requirement | REQT-1.2.11/whp4cvpk9e | Key Inputs Storage |
| Requirement | REQT-1.2.11.1/vn0drr8d8s | store() writes key-inputs.json |
| Requirement | REQT-1.2.11.2/e79g49xyyj | find() loads key-inputs.json |
| Requirement | REQT-1.2.11.3/hn8f6z92k0 | Graceful fallback for missing file |

## Problem

Cache key inputs are hashed but never persisted. Only the hash appears in directory names.

**Current implementation** (SnapshotCache.ts:536-545):
```typescript
computeKey(parentHash: string | null, inputs: CacheKeyInputs): string {
    const replacer = (_key: string, value: unknown) =>
        typeof value === "bigint" ? value.toString() : value;
    const data = JSON.stringify({
        parent: parentHash,
        ...inputs,
    }, replacer);
    return bytesToHex(blake2b(encodeUtf8(data))).slice(0, 32);  // Only hash kept
}
```

**Result**: Directory structure has no record of what produced the hash:
```
.stellar/emu/
  actors-abc123def456.../
    snapshot.json
    # Missing: key-inputs.json
```

## Perspective Violated

1. **Debuggability**: Can't determine why cache key differs on miss
2. **Data access**: Actor list is in cache key inputs but inaccessible after store
3. **Requirement (j)**: "loading a snapshot should also make the cache-key data available"

## Target State

1. Store `key-inputs.json` alongside `snapshot.json` in each snapshot directory
2. Load and expose inputs via `CachedSnapshot.cacheKeyInputs` on `find()`
3. Actor list accessible from cache key inputs (replaces part of `__actorSetupInfo__` hack)

## Remediation Guidance

### Type Update

```typescript
// Add to CachedSnapshot type
export type CachedSnapshot = {
    snapshot: NetworkSnapshot;
    namedRecords: Record<string, string>;
    parentSnapName: ParentSnapName;
    parentHash: string | null;
    parentCacheKey: string | null;
    snapshotHash: string;
    path?: string;
    cacheKeyInputs?: CacheKeyInputs;  // NEW
};
```

### On Store

```typescript
// In SnapshotCache.store(), after computing cacheKey:
const inputsPath = join(snapshotDir, "key-inputs.json");
writeFileSync(inputsPath, JSON.stringify(inputs, replacer, 2));
```

### On Find

```typescript
// In SnapshotCache.find(), when loading snapshot:
let cacheKeyInputs: CacheKeyInputs | undefined;
const inputsPath = join(snapshotDir, "key-inputs.json");
if (existsSync(inputsPath)) {
    cacheKeyInputs = JSON.parse(readFileSync(inputsPath, "utf-8"));
}

// Include in returned CachedSnapshot
const result: CachedSnapshot = {
    // ...existing fields
    cacheKeyInputs,
};
```

### File Format

```json
// key-inputs.json
{
  "bundles": [
    {
      "bundleName": "DefaultCapoBundle",
      "sourceHash": "abc123...",
      "params": { "mph": "..." }
    }
  ],
  "extra": {
    "actors": [
      { "name": "tina", "initialBalance": "11000000000" },
      { "name": "tracy", "initialBalance": "13000000" }
    ]
  }
}
```

## Dependencies

**None** - Independent work unit.

## Focus Files

| File | Purpose |
|------|---------|
| `src/testing/emulator/SnapshotCache.ts` | `store()` - write inputs; `find()` - load inputs |

## Verification

- [ ] `key-inputs.json` written on `store()`
- [ ] `cacheKeyInputs` available in `CachedSnapshot` after `find()`
- [ ] Actor list accessible via `cached.cacheKeyInputs?.extra?.actors`
- [ ] Existing snapshots without inputs file still load (graceful fallback)
