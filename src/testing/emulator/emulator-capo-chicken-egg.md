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
    const capoBundle = await this.capo.getBundle();  // NEEDS chartered Capo!
    return {
        bundles: [capoBundle.getCacheKeyInputs()],  // includes configuredParams
        // ...
    };
}
```

### New (egg-compatible)

```typescript
async resolveCoreCapoDependencies(): Promise<CacheKeyInputs> {
    // Egg or chartered - either works for source hashes
    const capoBundle = await this.capo.getBundle();
    const seedUtxo = this.getPreSelectedSeedUtxo();  // From actors snapshot

    return {
        bundles: [{
            name: capoBundle.moduleName,
            sourceHash: capoBundle.computeSourceHash(),  // No config needed!
            params: { seedUtxo }  // Identity params only, NOT derived values
        }],
        extra: { heliosVersion: VERSION }
    };
}
```

---

## Implementation Summary

### Changes Required

| Component | Change | Requirement |
|-----------|--------|-------------|
| `bootstrapWithActors` | Pre-select and store `targetSeedUtxo` in offchainData | REQT-3.6.1 |
| `resolveCoreCapoDependencies()` | Use `computeSourceHash()` only; get seedUtxo from actors snapshot | REQT-3.6.2 |
| `getCacheKeyInputs()` | Separate source hash from derived params | REQT-3.6.3 |
| `capoInitialized` snapshot | Store full `capoConfig` in offchainData | REQT-3.6.4 |
| `findOrCreateSnapshot()` | Implement Capo reconstruction decision tree | REQT-3.6.5 |

### Verification

After implementation:
1. Fresh process with disk cache should find `capoInitialized` using egg
2. Loaded Capo should have correct `mph` matching stored config
3. Same-config tests should hot-swap, different-config should create new Capo

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
