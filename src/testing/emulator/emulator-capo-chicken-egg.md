# Egg/Chicken Pattern for Snapshot Cache Key Resolution

*Architectural solution to the chicken-and-egg problem when loading chartered Capo from disk cache.*

---

## The Problem

### ARCH-8wby9gxrav: Chicken-and-Egg in Cache Key Computation

When disk cache exists but no chartered Capo is in memory, computing the cache key for `capoInitialized` creates a circular dependency:

```
To find cached capoInitialized:
  → need cache key
  → resolver calls this.capo.getBundle().getCacheKeyInputs()
  → getCacheKeyInputs() includes configuredParams
  → configuredParams may include seedUtxo, mph
  → seedUtxo/mph come from minting charter
  → minting charter IS what capoInitialized captures!
```

**Why actors snapshot works**: Its resolver needs no Capo—just `randomSeed`, `heliosVersion`, `actorSetupInfo`. No chicken-and-egg.

**Why Capo-dependent snapshots fail**: The resolver needs `this.capo` in a configured state that only exists *after* the snapshot was created.

---

## The Solution

### Egg and Chicken Definitions

| Concept | Definition | How to Create |
|---------|------------|---------------|
| **Egg** | Raw unconfigured Capo. Has bundle, can compute `sourceHash`, but no `configuredParams`. | `TargetClass.createWith({ setup, partialConfig: {} })` |
| **Chartered Capo** | Fully initialized Capo with charter minted, `mph` known, config established. | Result of `bootstrap()` flow or reconstruction from stored config |

### ARCH-sq123b1884: Key Insight

`computeSourceHash()` (in `HeliosScriptBundle.ts:764-769`) only uses source content:

```typescript
computeSourceHash(): string {
    const allSources = [this.main, ...this.getEffectiveModuleList()];
    const allContent = allSources
        .map((s) => `${s.moduleName || s.name}:\n${s.content}`)
        .join("\n---\n");
    return bytesToHex(blake2b(encodeUtf8(allContent)));
}
```

**No `configuredParams` needed.** An egg can provide source hashes for cache key computation.

### ARCH-4adwbk7ajp: Pre-Selected Seed UTxO

Move seed UTxO selection from `capoInitialized` to `bootstrapWithActors`:

**Before** (chicken-and-egg):
```
actors snapshot → (no seedUtxo)
capoInitialized → selects seedUtxo, mints charter
```

**After** (solved):
```
actors snapshot → pre-selects seedUtxo, stores in offchainData
capoInitialized → uses pre-selected seedUtxo
```

**Storage** (in actors snapshot's `offchainData`):
```typescript
{
  actorWallets: { ... },
  targetSeedUtxo: {
    txId: string,
    utxoIdx: number,
    // ... TxInput serialization
  }
}
```

---

## Workflows

### Workflow 1: Bootstrap Chartered Capo (no cache)

When no cache exists anywhere, build everything from scratch:

```
[Test] → reusableBootstrap()
              │
              ▼
         bootstrap()
              │
              ├── snapToBootstrapWithActors()
              │     └── cache miss → build actors, pre-select seedUtxo, store
              │
              ├── snapToCapoInitialized()
              │     └── cache miss → mint charter using pre-selected seedUtxo, store
              │
              └── snapToEnabledDelegatesDeployed()
                    └── cache miss → deploy delegates, store
```

**Result**: Chartered Capo emerges naturally. Config stored in `offchainData.capoConfig`.

---

### Workflow 2: Load Chartered Capo from Memory

When a chartered Capo already exists in `helperState.bootstrappedStrella`:

```
[Test] → snapToEnabledDelegatesDeployed()
              │
              ▼
         findOrCreateSnapshot()
              │
              ▼
         loadedSnapshots Map hit
              │
              ▼
         restoreFrom()
              │
              ├── helperState.bootstrappedStrella exists
              │
              ├── Compare: same mph/seedUtxo?
              │     └── YES → hot-swap network only
              │
              └── [StellarNetworkEmulator] ← restore snapshot state
```

**Hot-swap** uses Setup Envelope pattern:
```typescript
(existingCapo as any).setup.network = newEmulator;
```

---

### Workflow 3: Load Chartered Capo from Disk

When disk cache exists but no chartered Capo is in memory:

```
[Test] → snapToCapoInitialized()
              │
              ▼
         findOrCreateSnapshot()
              │
              ├── loadedSnapshots Map miss
              │
              ▼
         Need cache key for disk lookup
              │
              ├── Create egg: createWith({ setup, partialConfig: {} })
              │
              ├── Compute cache key:
              │     • egg.bundle.computeSourceHash()  ← works without config!
              │     • seedUtxo from actors snapshot's offchainData
              │     • parentHash + heliosVersion
              │
              ▼
         Disk lookup with computed cache key
              │
              ├── Load snapshot.json + offchain.json
              │
              ├── Extract capoConfig from offchainData
              │
              ▼
         Reconstruct chartered Capo
              │
              ├── Create new Capo with loaded config
              │     OR hot-swap if same config (rare in this path)
              │
              ├── Set helperState.bootstrappedStrella
              │
              └── [StellarNetworkEmulator] ← restore snapshot state
```

---

## ARCH-a060fvy86w: Capo Reconstruction Decision Tree

When loading from disk, decide how to handle current Capo state:

```
Load snapshot with stored capoConfig
         │
         ▼
┌─────────────────────────────────────────┐
│  What is current Capo state?            │
└─────────────────────────────────────────┘
         │
         ├── a) No Capo or Egg (unconfigured)
         │       → Create new Capo with loaded config
         │
         ├── b) Different chartered Capo (different mph/seedUtxo)
         │       → Create new Capo with loaded config
         │
         └── c) Same chartered Capo (same mph, seedUtxo)
                 → Hot-swap network only
```

### Comparison Logic

```typescript
function shouldCreateNewCapo(
  currentCapo: Capo | undefined,
  loadedConfig: CapoConfig
): boolean {
  // No capo at all
  if (!currentCapo) return true;

  // Unconfigured egg
  if (!currentCapo.configIn?.mph) return true;

  // Compare identity
  const currentMph = currentCapo.mintingPolicyHash?.toHex();
  const loadedMph = loadedConfig.mph?.toHex();

  return currentMph !== loadedMph;  // Different = create new
}
```

---

## ARCH-psqv6y39h5: Capo Config Storage

The `capoInitialized` snapshot MUST store complete config in `offchainData`:

```typescript
// In capoInitialized snapshot's offchainData:
{
  capoConfig: {
    mph: string,              // Minting policy hash (hex)
    seedUtxo: {               // The consumed seed UTxO
      txId: string,
      utxoIdx: number
    },
    rev: string,              // Config revision (bigint as string)
    charterAddress: string,   // Bech32 address
    // ... other CapoConfig fields
  }
}
```

This enables loading chartered Capo from disk without re-minting.

---

## Resolver Changes

### Current (problematic)

```typescript
async resolveCoreCapoDependencies(): Promise<CacheKeyInputs> {
    // BROKEN: tries to use getMintDelegate()/getSpendDelegate() which need charter
    const mintDelegate = await this.capo.getMintDelegate();  // FAILS with egg!
    const spendDelegate = await this.capo.getSpendDelegate();  // FAILS with egg!
    // Results in inconsistent cache keys between find() and store()
}
```

### Fixed (egg-compatible)

**Key insight**: Delegate source code does NOT depend on mph or charter data. Access delegate bundles via `delegateRoles.delegateClass.scriptBundleClass()` instead of `getMintDelegate()`/`getSpendDelegate()`.

```typescript
async resolveCoreCapoDependencies(): Promise<CacheKeyInputs> {
    await this.ensureEggForCacheKey();  // Ensure we have at least an egg
    const seedUtxo = this.getPreSelectedSeedUtxo();  // From actors snapshot

    const capoBundle = await this.capo.getBundle();
    const bundles: BundleCacheKeyInputs[] = [{
        name: capoBundle.moduleName,
        sourceHash: capoBundle.computeSourceHash(),  // No config needed!
        params: { seedUtxo },
    }];

    // Access delegate bundles via delegateRoles, NOT getMintDelegate()
    const { delegateRoles } = this.capo;
    const capoBundleClass = capoBundle.constructor;

    for (const roleName of ['mintDelegate', 'spendDelegate']) {
        const role = delegateRoles[roleName];
        if (role?.delegateClass) {
            const BundleClass = await role.delegateClass.scriptBundleClass();
            const boundBundleClass = BundleClass.usingCapoBundleClass(capoBundleClass);
            const bundle = new boundBundleClass();
            bundles.push({
                name: bundle.moduleName || roleName,
                sourceHash: bundle.computeSourceHash(),
                params: {},
            });
        }
    }

    return { bundles, extra: { heliosVersion: VERSION } };
}
```

**Why this works**: `delegateRoles` entries have `delegateClass` property which is the delegate class itself. That class has `static scriptBundleClass()` returning the bundle class. Instantiate with capoBundle reference, call `computeSourceHash()`. No charter data needed anywhere in this flow.

---

## Implementation Summary

### Changes Required

| Component | Change | Requirement |
|-----------|--------|-------------|
| `bootstrapWithActors` | Pre-select and store `targetSeedUtxo` in offchainData | REQT-3.6.1 |
| `resolveCoreCapoDependencies()` | Access delegates via `delegateRoles.delegateClass.scriptBundleClass()`, use `computeSourceHash()` | REQT-3.6.2 |
| `capoInitialized` snapshot | Store full `capoConfig` in offchainData | REQT-3.6.4 |
| `findOrCreateSnapshot()` | Implement Capo reconstruction decision tree | REQT-3.6.5 |

### Key Insight

Access delegate source hashes via the **egg Capo's `delegateRoles`**. The `delegateRoles` property exists on any Capo (egg or chartered) and provides `delegateClass` references. These classes have `static scriptBundleClass()` that returns bundle classes—no charter data needed.

The previous implementation used `getMintDelegate()`/`getSpendDelegate()` which require charter data, causing try/catch fallbacks and inconsistent cache keys.

### Verification

After implementation:
1. Cache key should be IDENTICAL between `find()` and `store()` calls
2. Fresh process with disk cache should find `capoInitialized`
3. Loaded Capo should have correct `mph` matching stored config
4. Same-config tests should hot-swap, different-config should create new Capo

---

## Related Architecture

- **Emulator.ARCHITECTURE.md**: Main architecture document
- **ARCH-edky0aybv7**: PRNG Seed and Determinism
- **Setup Envelope Pattern**: Capo.setup mutable envelope for network hot-swap

## Related Requirements

- **REQT-3.5**: Capo Reconstruction (existing, to be extended)
- **REQT-3.6**: Egg/Chicken Pattern (new, see Emulator.reqts.md)

---

## Open Questions

- [x] ~~Can `computeSourceHash()` work without config?~~ → Yes, only uses source content
- [x] ~~Where to store pre-selected seedUtxo?~~ → actors snapshot's offchainData
- [ ] Should `getCacheKeyInputs()` be split into `getSourceHash()` + `getIdentityParams()`?
- [ ] What serialization format for `capoConfig` in offchainData?
