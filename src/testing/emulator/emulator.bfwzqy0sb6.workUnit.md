# Work Unit: Add Offchain Data Storage for Snapshots

**UUT**: `bfwzqy0sb6`
**Finding**: F10
**Audit**: `snapshot-impl-audit.4xb49a4jyw`
**Created**: 2026-02-02

## References

| Type | ID | Description |
|------|-----|-------------|
| Architecture | ARCH-75rh0ewd7a | Offchain data concern |
| Architecture | ARCH-1d82vckcae | SnapshotCache component |
| Requirement | REQT-1.2.12/mkap3784hw | Offchain Data Storage |
| Requirement | REQT-1.2.12.1/020mbw1gqw | store() writes offchain.json |
| Requirement | REQT-1.2.12.2/khqyf56m0g | find() merges from parent chain |
| Requirement | REQT-1.2.12.3/yd750dddgy | No empty file for empty data |
| Requirement | REQT-1.2.12.4/0k6bnbbg95 | offchainData contains merged result |

## Problem

No mechanism to store offchain detail—data needed by test helpers but not part of cache validity or on-chain state.

**Current workaround**: Abuse `namedRecords` with magic keys like `__actorSetupInfo__`.

**Distinction**:
| Data Type | Affects Cache Key | Example |
|-----------|-------------------|---------|
| Cache key inputs | Yes | Actor list, bundle hashes, params |
| Offchain detail | No | Actor wallet private keys |
| Named records | No | Application-specific datum strings |

## Perspective Violated

Offchain restoration data (private keys) shouldn't pollute namedRecords or require PRNG replay hacks. Need a clean separation between:
- What determines cache validity (key inputs)
- What's needed to restore test helper state (offchain detail)

## Target State

1. Add `offchainData?: Record<string, unknown>` to `CachedSnapshot`
2. Store as `offchain.json` in snapshot directory
3. On `find()`, merge from parent chain (child keys override parent)
4. Clean API for storing/accessing offchain detail

## Remediation Guidance

### Type Updates

```typescript
// CachedSnapshot type
export type CachedSnapshot = {
    snapshot: NetworkSnapshot;
    namedRecords: Record<string, string>;
    parentSnapName: ParentSnapName;
    parentHash: string | null;
    parentCacheKey: string | null;
    snapshotHash: string;
    path?: string;
    cacheKeyInputs?: CacheKeyInputs;
    offchainData?: Record<string, unknown>;  // NEW
};

// SerializedCachedSnapshot
type SerializedCachedSnapshot = {
    // ...existing fields
    offchainData?: Record<string, unknown>;  // NEW
};
```

### On Store

```typescript
// In SnapshotCache.store()
if (cachedSnapshot.offchainData && Object.keys(cachedSnapshot.offchainData).length > 0) {
    const offchainPath = join(snapshotDir, "offchain.json");
    writeFileSync(offchainPath, JSON.stringify(cachedSnapshot.offchainData, null, 2));
}
```

### On Find - Merge from Parent Chain

```typescript
// In SnapshotCache.find(), after loading parent chain
let mergedOffchainData: Record<string, unknown> = {};

// Walk parent chain from root to leaf, merging offchain data
for (const ancestor of parentChainFromRoot) {
    if (ancestor.offchainData) {
        mergedOffchainData = { ...mergedOffchainData, ...ancestor.offchainData };
    }
}

// Load this snapshot's offchain data
const offchainPath = join(snapshotDir, "offchain.json");
if (existsSync(offchainPath)) {
    const thisOffchain = JSON.parse(readFileSync(offchainPath, "utf-8"));
    mergedOffchainData = { ...mergedOffchainData, ...thisOffchain };
}

// Include in result
const result: CachedSnapshot = {
    // ...existing fields
    offchainData: Object.keys(mergedOffchainData).length > 0 ? mergedOffchainData : undefined,
};
```

### Merge Semantics

```
Snapshot Stack:
  genesis
    └── actors (offchain: { actorWallets: {...} })
          └── capoInit (no offchain)
                └── delegates (no offchain)

Loading "delegates" returns merged offchain:
  { actorWallets: {...} }  // Inherited from actors
```

### Usage Pattern

```typescript
// Storing (in decorator, after creating actors)
const offchainData = {
    actorWallets: {
        tina: { spendingKey: "abc...", stakingKey: "def..." },
        tracy: { spendingKey: "123...", stakingKey: "456..." },
    }
};
await this.snapshotCache.store(snapshotName, { ...snapshot, offchainData });

// Loading
const cached = await this.snapshotCache.find(snapshotName);
const wallets = cached?.offchainData?.actorWallets;
```

## Focus Files

| File | Purpose |
|------|---------|
| `src/testing/emulator/SnapshotCache.ts` | Types, store(), find() with merge logic |

## Dependencies

**None** - Foundation work unit.

## Dependents

- **WU3** (`9h9cf9g8n8`): Store actor wallet keys - depends on this mechanism

**Dependency Chain**:
```
WU5 (this) ← WU3 (actor keys)
WU4 (key-inputs) - independent
```

## Verification

- [x] `offchainData` field added to `CachedSnapshot` type
- [x] `offchain.json` written when offchainData provided to `store()`
- [x] `find()` merges offchainData from parent chain
- [x] Child keys override parent keys in merge
- [x] Missing `offchain.json` handled gracefully (returns undefined)
- [x] Empty offchainData not written (no empty file)

**Audited**: 2026-02-02 - All requirements satisfied.
