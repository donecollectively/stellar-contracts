# Egg Protocol Audit

*Auditing the egg/chicken pattern implementation against the documented protocol.*

## Audit Context

- **Expertise**: Emulator architecture (Emulator.ARCHITECTURE.md, emulator-capo-chicken-egg.md)
- **Theme**: Goal state alignment - evolving the egg protocol to resolve cold-start cache key inconsistency
- **Scope**: CapoTestHelper snapshot resolution, SnapshotCache, egg protocol docs

## The Bug

During cold start, cache keys differ between `find()` and `store()`:

```
During find():
  cacheKey=6355e679... (bundles=[Capo:4239f74f], extra=[heliosVersion])

During store():
  cacheKey=999979e0... (bundles=[Capo:4239f74f, uutMintingDelegate:cb3aa49c, uutMintingDelegate:cb3aa49c])
```

**Root cause**: `resolveCoreCapoDependencies()` tries to include mint/spend delegate bundles via `getMintDelegate()`/`getSpendDelegate()`, which require charter data. With an egg (no charter), these fail and are skipped. After charter is minted, they succeed. Different bundles → different cache keys.

---

## Exploration #1: Egg/Chick Separation

**Problem with current design**: The `capoInitialized` snapshot tries to do too much:
- Resolve core Capo identity (mph)
- Include delegate bundle hashes
- Create charter minting transaction

But delegates can't be accessed without charter (via `getMintDelegate()`), creating circular dependency.

**Proposed evolution**: Split into two snapshots:

### a) Egg Snapshot (`coreCapoMph`)

- **Parent**: `bootstrapWithActors`
- **Cache key**: minter source hash + capo source hash + seedUtxo
- **Produces**: `offchainData.mph` (minting policy hash)
- **Blocks**: NONE (pure computation, no transactions)

This is the TRUE egg - minimal inputs to resolve Capo identity.

### b) Chick Snapshot (`capoInitialized`)

- **Parent**: `coreCapoMph` (egg)
- **Cache key**: mint delegate SOURCE hash + spend delegate SOURCE hash + parent egg hash
- **Produces**: Charter minting transaction

**Key insight**: Mint/spend delegate source code does NOT depend on mph. The source hashes can be computed from delegate bundle classes in `delegateRoles`, bypassing `getMintDelegate()`/`getSpendDelegate()` which require charter data.

### Proposed Snapshot Chain

```
genesis
  └── bootstrapWithActors (actors, seedUtxo in offchainData)
        └── coreCapoMph (egg - NO BLOCKS)
              │   Key: minter source + capo source + seedUtxo
              │   Stores: offchainData.mph
              │
              └── capoInitialized (chick)
                    │   Key: mintDgt source + spendDgt source + parent hash
                    │   Produces: charter minting tx
                    │
                    └── enabledDelegatesDeployed
```

### Why This Works

| Phase | What it needs | Available from |
|-------|---------------|----------------|
| Egg | minter source, capo source, seedUtxo | Unconfigured Capo + actors snapshot ✓ |
| Chick | delegate source hashes | `delegateRoles` classes (no charter needed) ✓ |

**Circular dependency broken**: Egg produces mph without needing delegates. Chick accesses delegate *sources* (not instances) via `delegateRoles`, not via `getMintDelegate()`.

### Open Questions

- [ ] How to access delegate bundle classes from `delegateRoles` for source hash computation?
- [ ] Does the egg need any blocks, or is it purely offchain computation?
- [ ] What minimal Capo configuration is needed to compile minter and get mph?

---

## Exploration #2: Do We Need Egg/Chick Split At All?

**Observation**: Mint/spend delegate source code does NOT depend on mph. The sources are defined by the delegate classes in `delegateRoles`, which exist on the Capo class independent of charter state.

**Question**: If delegate sources are accessible without charter, why can't we include everything in one resolver?

### The Simpler Alternative

Instead of egg/chick split, fix `resolveCoreCapoDependencies()` to access delegate sources via `delegateRoles`:

```typescript
async resolveCoreCapoDependencies(): Promise<CacheKeyInputs> {
    await this.ensureEggForCacheKey();
    const seedUtxo = this.getPreSelectedSeedUtxo();

    const capoBundle = await this.capo.getBundle();
    const bundles: BundleCacheKeyInputs[] = [{
        name: capoBundle.moduleName,
        sourceHash: capoBundle.computeSourceHash(),
        params: { seedUtxo },
    }];

    // Access delegate bundles via delegateRoles, NOT getMintDelegate()
    const { delegateRoles } = this.capo;

    // mintDgt
    const mintDgtRole = delegateRoles.mintDgt;
    if (mintDgtRole) {
        const mintDgtBundle = await this.getDelegateBundleFromRole(mintDgtRole);
        bundles.push({
            name: mintDgtBundle.moduleName,
            sourceHash: mintDgtBundle.computeSourceHash(),
            params: {},
        });
    }

    // spendDgt (similar)
    // ...

    return { bundles, extra: { heliosVersion: HELIOS_VERSION } };
}
```

### What `getDelegateBundleFromRole()` Would Do

1. Get delegate class from role definition
2. Instantiate bundle class (not full delegate)
3. Call `computeSourceHash()` on bundle

This bypasses `getMintDelegate()` which requires charter data.

### Comparison

| Approach | New Snapshots | Complexity | Cache Layers |
|----------|---------------|------------|--------------|
| Egg/Chick split | 1 (egg, 0 blocks) | Moderate | More granular invalidation |
| Fixed resolver | 0 | Lower | Single cache key |

### When Egg/Chick WOULD Be Needed

The split is only necessary if:
1. Something requires mph *before* delegate sources can be accessed
2. We want separate cache invalidation (e.g., mph changes but delegates don't)

**Current evidence suggests**: Delegate sources are independent of mph, so the split may be unnecessary complexity.

### Open Questions

- [ ] Can we instantiate delegate bundles from `delegateRoles` without full delegate construction?
- [ ] What's the actual structure of `delegateRoles` entries? Do they expose bundle classes directly?
- [ ] Is there any hidden dependency on mph when accessing delegate bundles?

### Resolution

**Exploration #2 is the fix.** Delegate source hashes are accessible via `delegateRoles.delegateClass.scriptBundleClass()` on any Capo (egg or chartered). No egg/chick split needed.

Architecture docs updated:
- `Emulator.ARCHITECTURE.md` - Built-in Resolvers section
- `emulator-capo-chicken-egg.md` - Resolver Changes section

---

## Files in Scope

- `src/testing/CapoTestHelper.ts` - `resolveCoreCapoDependencies()`, `findOrCreateSnapshot()`
- `src/testing/emulator/SnapshotCache.ts` - `find()`, `store()`
- `src/testing/emulator/emulator-capo-chicken-egg.md` - Current protocol doc
- `src/testing/emulator/Emulator.ARCHITECTURE.md` - Architecture doc

## Related Requirements

- REQT-3.6: Egg/Chicken Pattern
- REQT-3.6.1: Pre-selected Seed UTxO
- REQT-3.6.2: Source hash computation
