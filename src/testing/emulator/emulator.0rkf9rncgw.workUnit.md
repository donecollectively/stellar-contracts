# Work Unit: Snapshot Directory Naming with Labels and Short Hash

**UUT**: `0rkf9rncgw`
**Created**: 2026-02-04

## References

| Type | ID | Description |
|------|-----|-------------|
| Architecture | ARCH-1d82vckcae | SnapshotCache component |
| Architecture | ARCH-14zt4f9rtg | SnapshotCache.computeKey interface |
| Architecture | ARCH-q9bfh8sjj4 | SnapshotCache.register interface |
| Architecture | ARCH-8g5xedvnq3 | SnapshotDecoratorOptions type |
| Architecture | ARCH-jj5swg0hfk | DirLabelResolver type (NEW) |
| Architecture | ARCH-a2fd0t1df4 | CachedSnapshot type |

## Goal

Improve snapshot directory naming for easier debugging and investigation:

1. **Add optional human-readable label** — each snapshot can provide a `computeDirLabel` function that returns a short string derived from the cache key inputs (e.g., `seed42` for the actors snapshot)

2. **Shorten hash to 6 bech32 characters** — more compact than 32 hex chars, still provides ~1 billion combinations

## Current vs Target

**Current pattern**: `{snapshotName}-{hash32hex}`
```
.stellar/emu/
  bootstrapWithActors-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6/
    capoInitialized-q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2/
```

**Target pattern**: `{snapshotName}-{dirLabel}-{hash6bech32}`
```
.stellar/emu/
  bootstrapWithActors-seed42-q3m7k2/
    capoInitialized--a5n9p4/
```

Note: Empty label produces double-dash (`--`) which is valid and visually distinct.

---

## Remediation Guidance

### Step 1: Add DirLabelResolver Type

**File**: `src/testing/emulator/SnapshotCache.ts`

Add the new type near other type definitions:

```typescript
/**
 * Pure function of cache key inputs returning a short human-readable label
 * for the snapshot directory name. Default returns empty string.
 *
 * Example: for actors snapshot with randomSeed in extra:
 *   (inputs) => `seed${inputs.extra?.randomSeed ?? ''}`
 */
export type DirLabelResolver = (inputs: CacheKeyInputs) => string;
```

### Step 2: Update Registry Entry Type

**File**: `src/testing/emulator/SnapshotCache.ts`

Find the registry entry type (used internally) and add the new field:

```typescript
// In the registry Map type or interface
{
  parentSnapName: ParentSnapName;
  resolveScriptDependencies?: ScriptDependencyResolver;
  computeDirLabel?: DirLabelResolver;  // NEW
}
```

### Step 3: Update register() Method

**File**: `src/testing/emulator/SnapshotCache.ts`

Update the `register()` method signature to accept the new parameter:

```typescript
register(snapshotName: string, metadata: {
    parentSnapName: ParentSnapName;
    resolveScriptDependencies?: ScriptDependencyResolver;
    computeDirLabel?: DirLabelResolver;  // NEW - default: () => ""
}): void {
    // Store computeDirLabel in registry entry
    this.registry.set(snapshotName, {
        parentSnapName: metadata.parentSnapName,
        resolveScriptDependencies: metadata.resolveScriptDependencies,
        computeDirLabel: metadata.computeDirLabel ?? (() => ""),  // default empty
    });
}
```

### Step 4: Update computeKey() Method

**File**: `src/testing/emulator/SnapshotCache.ts`

Change from 32 hex chars to 6 bech32 chars:

**Before** (around line 592):
```typescript
return bytesToHex(blake2b(encodeUtf8(data))).slice(0, 32);
```

**After**:
```typescript
import { encodeBech32 } from "@helios-lang/crypto";  // or appropriate import

// ...

computeKey(parentHash: string | null, inputs: CacheKeyInputs): string {
    const replacer = (_key: string, value: unknown) =>
        typeof value === "bigint" ? value.toString() : value;
    const data = JSON.stringify({
        parent: parentHash,
        bundles: inputs.bundles,
        extra: inputs.extra,
    }, replacer);

    const hashBytes = blake2b(encodeUtf8(data));
    // Use bech32 encoding with a dummy HRP, then take last 6 chars
    // bech32 alphabet: a-z, 2-7 (32 chars) → 6 chars = 32^6 ≈ 1 billion
    const bech32Str = encodeBech32("snap", hashBytes);
    return bech32Str.slice(-6);
}
```

**Note on bech32**: The `encodeBech32` function requires a human-readable prefix (HRP). We use a dummy prefix like `"snap"` and then slice off just the data portion. Alternatively, you can use a raw base32 encoding if available. The key requirement is:
- 32-character alphabet (lowercase alphanumeric minus confusable chars)
- Last 6 characters of the encoded hash

If `encodeBech32` isn't suitable, consider using a simple base32 function:

```typescript
const BASE32_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"; // Crockford Base32

function toBase32(bytes: Uint8Array): string {
    // Simple implementation: convert bytes to base32
    let result = "";
    let bits = 0;
    let value = 0;
    for (const byte of bytes) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            bits -= 5;
            result += BASE32_ALPHABET[(value >> bits) & 0x1f];
        }
    }
    if (bits > 0) {
        result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
    }
    return result;
}

// In computeKey():
const hashBytes = blake2b(encodeUtf8(data));
return toBase32(hashBytes).slice(-6);
```

### Step 5: Update getSnapshotDir() Method

**File**: `src/testing/emulator/SnapshotCache.ts`

Update directory naming to include the label:

**Before** (around line 603-610):
```typescript
private getSnapshotDir(cacheKey: string, snapshotName: string, parentPath: string | null): string {
    const sanitizedName = sanitizeSnapshotName(snapshotName);
    const dirName = `${sanitizedName}-${cacheKey}`;
    // ...
}
```

**After**:
```typescript
private getSnapshotDir(
    cacheKey: string,
    snapshotName: string,
    parentPath: string | null,
    dirLabel: string = ""  // NEW parameter
): string {
    const sanitizedName = sanitizeSnapshotName(snapshotName);
    const sanitizedLabel = sanitizeSnapshotName(dirLabel);  // reuse sanitizer
    const dirName = `${sanitizedName}-${sanitizedLabel}-${cacheKey}`;
    if (parentPath) {
        return join(parentPath, dirName);
    }
    return join(this.cacheDir, dirName);
}
```

### Step 6: Update find() to Pass Label

**File**: `src/testing/emulator/SnapshotCache.ts`

In `find()`, compute the label and pass it to `getSnapshotDir()`:

```typescript
async find(snapshotName: string, helper: unknown): Promise<CachedSnapshot | null> {
    const entry = this.getRegistryEntry(snapshotName);
    // ... existing parent resolution ...

    // Compute cache key inputs
    let inputs: CacheKeyInputs;
    if (entry.resolveScriptDependencies) {
        inputs = await entry.resolveScriptDependencies(helper);
    } else {
        inputs = { bundles: [] };
    }

    const cacheKey = this.computeKey(parentHash, inputs);

    // Compute directory label (NEW)
    const dirLabel = entry.computeDirLabel ? entry.computeDirLabel(inputs) : "";

    // ... existing in-memory cache check ...

    // When constructing path, pass the label
    const snapshotDir = this.getSnapshotDir(cacheKey, snapshotName, parentPath, dirLabel);

    // ... rest unchanged ...
}
```

### Step 7: Update store() to Pass Label

**File**: `src/testing/emulator/SnapshotCache.ts`

Same pattern in `store()`:

```typescript
async store(snapshotName: string, snapshot: CachedSnapshot): Promise<void> {
    // ... existing parent resolution and cache key computation ...

    // Compute directory label (NEW)
    const dirLabel = entry.computeDirLabel
        ? entry.computeDirLabel(inputs)
        : "";

    const snapshotDir = this.getSnapshotDir(cacheKey, snapshotName, parentPath, dirLabel);

    // ... rest unchanged ...
}
```

### Step 8: Update @hasNamedSnapshot Decorator

**File**: `src/testing/emulator/CapoTestHelper.ts` (or wherever the decorator is defined)

Add `computeDirLabel` to the decorator options type and pass it through to `register()`:

```typescript
type SnapshotDecoratorOptions = {
    actor: string;
    parentSnapName: ParentSnapName;
    internal?: boolean;
    resolveScriptDependencies?: ScriptDependencyResolver;
    computeDirLabel?: DirLabelResolver;  // NEW
};

function hasNamedSnapshot(snapshotName: string, options: SnapshotDecoratorOptions) {
    // In the wrapper that calls register():
    snapshotCache.register(snapshotName, {
        parentSnapName: options.parentSnapName,
        resolveScriptDependencies: options.resolveScriptDependencies,
        computeDirLabel: options.computeDirLabel,  // NEW
    });
    // ...
}
```

### Step 9: Add Label to bootstrapWithActors Snapshot

**File**: `src/testing/CapoTestHelper.ts` (find the `@hasNamedSnapshot("bootstrapWithActors", ...)` decorator)

Add the `computeDirLabel` option:

```typescript
@hasNamedSnapshot("bootstrapWithActors", {
    actor: "default",
    parentSnapName: "genesis",
    resolveScriptDependencies: (helper) => helper.resolveActorsDependencies(),
    computeDirLabel: (inputs) => `seed${inputs.extra?.randomSeed ?? ''}`,  // NEW
})
async snapToBootstrapWithActors(): Promise<void> {
    // ...
}
```

**Important**: The `resolveActorsDependencies()` method must include `randomSeed` in the `extra` field for this to work. Verify it does:

```typescript
resolveActorsDependencies(): CacheKeyInputs {
    return {
        bundles: [],
        extra: {
            randomSeed: this.randomSeed,  // Must be present!
            actors: this.actorNames.map(name => ({
                name,
                initialBalance: this.getActorBalance(name).toString(),
            })),
        },
    };
}
```

---

## Focus Files

| File | Lines (approx) | Changes |
|------|----------------|---------|
| `src/testing/emulator/SnapshotCache.ts` | 583-593 | `computeKey()` — bech32, 6 chars |
| `src/testing/emulator/SnapshotCache.ts` | 603-610 | `getSnapshotDir()` — add label param |
| `src/testing/emulator/SnapshotCache.ts` | 427-430 | `register()` — add `computeDirLabel` param |
| `src/testing/emulator/SnapshotCache.ts` | 629-700 | `find()` — compute and pass label |
| `src/testing/emulator/SnapshotCache.ts` | 845-900 | `store()` — compute and pass label |
| `src/testing/CapoTestHelper.ts` | (decorator) | Add `computeDirLabel` to actors snapshot |

---

## Migration Consideration

**Existing caches will be invalidated** because:
1. Directory names change format
2. Hash encoding changes (hex → bech32)
3. Hash length changes (32 → 6)

This is acceptable — old directories will be orphaned and can be cleaned up. New directories will be created on first run.

If you want to support gradual migration, you could have `find()` check both old and new path formats, but this adds complexity. Recommend: just let caches rebuild.

---

## Verification

- [x] `computeKey()` returns 6-character bech32 string
- [x] Directory names follow pattern `{name}-{label}-{hash6}`
- [x] Empty label produces `{name}--{hash6}` (double dash)
- [x] `bootstrapWithActors` directory shows seed: `bootstrapWithActors-seed42-xxxxxx`
- [x] Other snapshots work with empty label: `capoInitialized--xxxxxx`
- [x] All existing tests pass (cache rebuild expected on first run)
- [x] `rm -rf .stellar/emu` + rerun tests → directories created with new format

---

## Coder Report

- **Completed**: 2026-02-04
- **Commit**: (pending user commit)

### Files Changed

| File | Changes |
|------|---------|
| `src/testing/emulator/SnapshotCache.ts` | Added `DirLabelResolver` type, updated `SnapshotRegistryEntry` to include `computeDirLabel`, changed `computeKey()` to return 6 bech32 chars via `encodeBech32()`, updated `getSnapshotDir()` to include dirLabel parameter, updated `find()` and `store()` to compute and pass dirLabel |
| `src/testing/CapoTestHelper.ts` | Imported `DirLabelResolver`, updated `SnapshotDecoratorOptions` to include `computeDirLabel`, updated `@hasNamedSnapshot` decorator to extract and pass `computeDirLabel`, added `computeDirLabel` to constructor registration and `snapToBootstrapWithActors` decorator |
| `tests/01a-SnapshotCache.test.ts` | Updated test expectation from 32 hex chars to 6 bech32 chars |

### Architectural Alignment

- ARCH-14zt4f9rtg: ✅ computeKey returns 6 bech32 chars (using `encodeBech32("snap", hashBytes).slice(-6)`)
- ARCH-jj5swg0hfk: ✅ DirLabelResolver type implemented and exported
- ARCH-8g5xedvnq3: ✅ SnapshotDecoratorOptions includes `computeDirLabel?: DirLabelResolver`

### Blockers & Stubs

| Issue | Location | Resolution |
|-------|----------|------------|
| None | | |

### Out-of-Scope Observations

- Pre-existing type error in `DefaultCapoTestHelper.ts:265` (mintCharterToken return type mismatch) — unrelated to this work unit

### Questions Raised

- None
