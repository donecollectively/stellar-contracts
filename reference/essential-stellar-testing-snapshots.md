# Snapshot System Guide

The snapshot system provides disk-cached blockchain states that dramatically speed up test execution. Instead of re-running bootstrap and setup transactions for every test, snapshots restore pre-built states in milliseconds.

## How It Works

1. **Hierarchical caching**: Snapshots form a chain: `genesis` → `bootstrapWithActors` → `capoInitialized` → `enabledDelegatesDeployed` → your app snapshots
2. **Automatic invalidation**: Cache keys include source hashes of your Helios scripts. Change a contract → cache automatically rebuilds
3. **Disk persistence**: Cached in `.stellar/emu/` (add to `.gitignore`)
4. **In-memory reuse**: Within a test file, loaded snapshots stay in memory for instant access

---

## The `@hasNamedSnapshot` Decorator

Declare snapshots using the decorator. The snapshot name is **derived from the method name** (`snapToX` → `"x"`):

```typescript
import { CapoTestHelper } from "@donecollectively/stellar-contracts/testing";

@CapoTestHelper.hasNamedSnapshot({
    actor: "tina",                        // Required: actor after snapshot loads
    parentSnapName: "bootstrapped",       // Required: parent snapshot name
    resolveScriptDependencies?: async (helper) => {...}  // Optional: custom cache key
})
async snapToFirstRecordProposed() {  // → snapshot name "firstRecordProposed"
    throw new Error("never called; see firstRecordProposed()");
    return this.firstRecordProposed();
}
```

### Decorator Options

| Option | Required | Description |
|--------|----------|-------------|
| `actor` | Yes | Actor name to set after loading. Use `"default"` for the helper's default actor. |
| `parentSnapName` | Yes | Parent snapshot. Common values: `"genesis"`, `"bootstrapWithActors"`, `"bootstrapped"` (alias for `"enabledDelegatesDeployed"`), or a custom snapshot name. |
| `resolveScriptDependencies` | No | Async function returning `CacheKeyInputs` for custom cache key computation. Built-in snapshots have default resolvers. |

---

## Snapshot Method Naming Convention

The decorator **requires** a specific naming pattern:

1. **Entry point**: `snapTo<SnapshotName>()` - decorated method that tests call
2. **Builder**: `<snapshotName>()` - the snapshot name IS the builder function name
3. **Snapshot name**: `~~snapTo~~<snapshotName>` (entry point with `snapTo` prefix removed, first letter lowercased)

**Example**: For snapshot `"firstOrder"`:
- Entry point: `snapToFirstOrder()`
- Builder: `firstOrder()`
- Snapshot name: `"firstOrder"`

**There is no way to specify a different snapshot name.** The builder function name IS the snapshot name.

```typescript
// Entry point - the decorator replaces this method body entirely
// Snapshot name "firstOrder" derived from method name
@CapoTestHelper.hasNamedSnapshot({
    actor: "tina",
    parentSnapName: "bootstrapped",
})
async snapToFirstOrder() {
    throw new Error("never called; see firstOrder()");
    return this.firstOrder();
}

// Builder - called by the decorator to create the snapshot
async firstOrder() {
    this.setActor("tina");
    const controller = await this.capo.getDgDataController("Order");
    const tcx = await controller.mkTxnCreateOrder(this.mkTcx(), controller.exampleData());
    return this.captureRecordId({ recordName: "firstOrder", submit: true }, tcx);
}
```

**Why the throw?** The decorator completely replaces `snapToFirstOrder()`. The throw documents this and prevents confusion if someone calls the original.

---

## Built-in Snapshot Hierarchy

The framework provides these built-in snapshots:

| Snapshot Name | Parent | What It Contains |
|---------------|--------|------------------|
| `"bootstrapWithActors"` | `"genesis"` | Funded actor wallets (tina, tom, tracy) |
| `"capoInitialized"` | `"bootstrapWithActors"` | Charter minted, Capo identity established |
| `"enabledDelegatesDeployed"` | `"capoInitialized"` | All enabled delegates deployed |
| `"bootstrapped"` | (alias) | Same as `"enabledDelegatesDeployed"` |

**Your app snapshots** typically use `parentSnapName: "bootstrapped"`.

### Note on `autoSetup` and Parent Snapshots

Capo's `autoSetup` property (default: `true`) controls whether delegates are automatically deployed during bootstrap:

- **`autoSetup = true` (default)**: Use `parentSnapName: "bootstrapped"` for app snapshots. The `"enabledDelegatesDeployed"` snapshot (aliased as `"bootstrapped"`) will contain your deployed delegates.

- **`autoSetup = false`**: Use `parentSnapName: "capoInitialized"` instead. Since delegates aren't auto-deployed, the `"enabledDelegatesDeployed"` snapshot won't exist. Your app snapshot builder must handle delegate deployment if needed.

---

## Cache Key Resolution

Cache keys determine when snapshots need rebuilding. They're computed from:

1. **Parent's snapshot hash** - ensures parent chain integrity
2. **Script dependencies** - source hashes of Helios contracts + params

For app snapshots inheriting from `"bootstrapped"`, the default resolver includes all enabled delegate bundles. Override with `resolveScriptDependencies` for custom logic:

```typescript
@CapoTestHelper.hasNamedSnapshot({
    actor: "tina",
    parentSnapName: "bootstrapped",
    resolveScriptDependencies: async (helper) => {
        const h = helper as YourCapoTestHelper;
        return {
            bundles: [
                // Include specific bundles for cache key
                h.capo.someBundle.getCacheKeyInputs(),
            ],
            extra: {
                // Custom params affecting the snapshot
                featureFlag: h.capo.someFeatureEnabled,
            }
        };
    }
})
```

---

## Using the Special `describe`/`it`

**Critical**: Import `describe`/`it` from your test helper, NOT from vitest directly.

```typescript
// YourFeature.test.ts
import { describe, it, fit, xit, type YourCapo_TC } from "./YourCapoTestHelper.js";  // NOT from vitest!
import { vi, expect } from "vitest";  // Other vitest exports are fine

describe("Your Feature", () => {
    it("creates a record", async (context: YourCapo_TC) => {
        // Destructure what you need from the context and helper:
        const { h, strella } = context;
        const { network, actors, delay, helperState } = h;
        const { namedRecords } = helperState!;

        await h.reusableBootstrap();
        // h.capo / strella - the Capo instance
        // network.tick(n) - advance slots
        // actors.tina, actors.tom - actor wallets
        // namedRecords["firstOrder"] - captured record IDs
    });
});
```

**Why?** `createTestContext()` returns wrapped versions that:
- Auto-create a fresh helper instance per test
- Share `helperState` across tests in the same file (enables snapshot caching)
- Inject the helper as `{ h }` in the test context

### How `createTestContext()` Works

```typescript
// In your test helper
export const { describe, it, fit, xit } = YourCapoTestHelper.createTestContext();
```

This creates test functions that:
1. Create a fresh helper instance before each test
2. Share `helperState` across all tests in the file (enables snapshot caching)
3. Inject the test context with:
   - `h` - the helper instance
   - `strella` - shorthand for `h.strella` (the contract under test)
   - `initHelper(config)` - re-initialize with different config (e.g., different `randomSeed`)

---

## Complete Example: Custom Test Helper with Snapshots

```typescript
// YourCapoTestHelper.ts
import {
    DefaultCapoTestHelper,
    CapoTestHelper,
    StellarTestContext
} from "@donecollectively/stellar-contracts/testing";
import { YourCapo } from "./YourCapo.js";

export type YourCapo_TC = StellarTestContext<YourCapoTestHelper>;

export class YourCapoTestHelper extends DefaultCapoTestHelper.forCapoClass(YourCapo) {
    get stellarClass() { return YourCapo; }

    // Scenario shortcut (reusable logic)
    async createFirstRecord() {
        const controller = await this.capo.getDgDataController("Record");
        const tcx = await controller.mkTxnCreate(this.mkTcx(), controller.exampleData());
        return this.captureRecordId({ recordName: "firstRecord", submit: true }, tcx);
    }

    // Snapshot entry point - name "firstRecordCreated" derived from method
    @CapoTestHelper.hasNamedSnapshot({
        actor: "tina",
        parentSnapName: "bootstrapped",
    })
    async snapToFirstRecordCreated() {
        throw new Error("never called; see firstRecordCreated()");
        return this.firstRecordCreated();
    }

    // Snapshot builder (called by decorator)
    async firstRecordCreated() {
        this.setActor("tina");
        return this.createFirstRecord();
    }

    // Finder for use in tests
    async findFirstRecord() {
        const recordId = this.helperState!.namedRecords["firstRecord"];
        return this.capo.findRecord(recordId);
    }
}

// Export pre-wired describe/it AND the context type for tests to import
export const { describe, it, fit, xit } = YourCapoTestHelper.createTestContext();
```

---

## Chaining Snapshots

Snapshots can depend on other custom snapshots via `parentSnapName`:

```typescript
@CapoTestHelper.hasNamedSnapshot({
    actor: "tracy",
    parentSnapName: "firstOrderCreated",  // Your custom snapshot as parent
})
async snapToFirstOrderShipped() {  // → snapshot name "firstOrderShipped"
    throw new Error("never called; see firstOrderShipped()");
    return this.firstOrderShipped();
}

// Builder only contains INCREMENTAL work - parent is loaded automatically
async firstOrderShipped() {
    this.setActor("tracy");
    // ... ship the order (parent state already loaded)
}
```

**Important**: Do NOT call `snapTo<parent>()` in the builder. The decorator loads the parent automatically based on `parentSnapName`. The builder should only contain the incremental work for this snapshot.

### Migrating from old pattern

If your builders currently call `snapTo<parent>()`:

```typescript
// OLD PATTERN (remove this)
async firstOrderShipped() {
    await this.snapToFirstOrderCreated();  // ❌ Remove - redundant
    this.setActor("tracy");
    // ...
}

// NEW PATTERN
async firstOrderShipped() {
    this.setActor("tracy");  // ✓ Just the incremental work
    // ...
}
```

Move the parent dependency into the decorator's `parentSnapName` option instead.

---

## Mocking and Snapshots Don't Mix

When mocking, load an **earlier** snapshot before setting up mocks:

```typescript
// WRONG - mock after snapshot that uses mocked code
await h.snapToFirstRecordProposed();  // This might use the code you want to mock!
vi.spyOn(h.capo, "someMethod")...

// RIGHT - load parent snapshot, then mock, then build manually
await h.reusableBootstrap();
vi.spyOn(h.capo, "someMethod")...
await h.proposeFirstRecord();  // Non-snapshot method, uses mock
```

---

## Troubleshooting

### Snapshots not caching as expected

1. Check `.stellar/emu/` for the directory structure
2. Cache key inputs are stored in `key-inputs.json` next to each `snapshot.json`
3. Delete `.stellar/emu/` to force complete rebuild
4. Check that `parentSnapName` chains correctly (typos cause rebuilds)

### "Parent not found" errors

If you see `SnapshotCache: parent 'X' not found for 'Y'`, verify that:

1. **`parentSnapName` is correct**: Check for typos in the parent snapshot name
2. **Parent method name matches**: The parent's snapshot name is derived from its method name. If `parentSnapName: "firstMember"`, the parent must have method `snapToFirstMember()` (not `snapToFirstMemberRegistered()` or similar)
3. **Parent snapshot exists**: The parent must be defined with its own `@hasNamedSnapshot` decorator (or be a built-in like `"bootstrapped"`)
4. **Correct parent for `autoSetup = false`**: If your Capo has `autoSetup = false`, use `"capoInitialized"` instead of `"bootstrapped"` as the parent

### Method name doesn't match expected snapshot name

**Common mistake**: Naming the entry point `snapToSomethingLongAndDescriptive()` but expecting snapshot name `"something"`.

Remember: **snapshot name = builder function name = ~~snapTo~~entryPointName**

```typescript
// WRONG - builder is "proposeFirstDomainAgreement", not "proposeFirstAgreement"
@CapoTestHelper.hasNamedSnapshot({ actor: "tina", parentSnapName: "bootstrapped" })
async snapToProposeFirstDomainAgreement() { ... }
async proposeFirstDomainAgreement() { ... }  // ← snapshot name is "proposeFirstDomainAgreement"

// If parent references "proposeFirstAgreement", it won't be found!
@CapoTestHelper.hasNamedSnapshot({
    actor: "tracy",
    parentSnapName: "proposeFirstAgreement"  // ❌ No such snapshot - builder is "proposeFirstDomainAgreement"
})
```

**Fix**: The builder function name IS the snapshot name. Either:
- Rename to `snapToProposeFirstAgreement()` + `proposeFirstAgreement()` if you want snapshot `"proposeFirstAgreement"`
- Or use `parentSnapName: "proposeFirstDomainAgreement"` to reference the actual name
