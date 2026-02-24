# Stellar testing essentials

For dApp teams who already write basic Typescript, this guide shows how to test both off-chain classes and on-chain policy scripts in their own stellar-based dApps. It assumes you have pnpm, Node 20+, and can run Vitest.

## MUST READ: Quick setup
- Install deps: `pnpm add -D vitest`
- Run all tests: `pnpm test` (or `pnpm testing` for watch). Smoke subset: `SMOKE=1 pnpm test`
- You MUST read at least 50 lines of output from running a test, or you're likely to miss important details.  
   - Suggested: Capture all the output, then progressively read 50 or more lines from the bottom.
- Node flags: Vitest already configured; no extra ts-node flags needed.

## Core test harness pieces
- `vitest` with typed contexts: `describe`/`it` are parameterized with your test context type (`StellarTestContext<T extends TestHelper>`).
- **`YourHelper.createTestContext()`**: exports pre-wired `describe`/`it` that auto-inject the helper - no `beforeEach` boilerplate needed. Tests access the helper instance as `{ h }` in the context. See `reference/essential-stellar-testing-snapshots.md` § "How `createTestContext()` Works" for details on the injection mechanism.
- Helpers expose wallets (`context.h.actors`), a Capo instance, `network`, `mkTcx()` for transaction contexts, and scenario helpers (e.g., `initialize`, `bootstrap`, `setActor`, `submitTx`, `network.tick`).
- Common helpers:
  - `DefaultCapoTestHelper` (stellar-contracts): fast local net with tina/tom/tracy wallets, Capo bootstrap, UUT utilities.
  - `YourCapoTestHelper` (app-specific on-chain flows): add scenario shortcuts like "propose first record", "adopt first record", "find first adopted record."
- Use `vi.spyOn` to intercept delegate/controller methods for negative-path tests (see examples in boilerplate/).

## Helper conventions you should mirror (from production helpers)
- **Snapshot decorator pattern:** annotate snapshot entrypoints with `@CapoTestHelper.hasNamedSnapshot({ actor, parentSnapName, ... })`. The snapshot name is derived from the method name (`snapToFoo` → `"foo"`). The decorated method should be a thin wrapper that throws and references the builder; snapshot reuse is handled via helper state. **Required reading**: see `reference/essential-stellar-testing-snapshots.md` for decorator options (especially required `parentSnapName`) and cache key behavior.
- **Snapshot naming:** The snapshot name IS the builder function name: `~~snapTo~~<snapshotName>`. For `snapToFirstOrder`, the snapshot name is `"firstOrder"` and the builder is `firstOrder()`.
- **Snapshot builder method naming**: the builder method name IS the snapshot name. `snapToFirstOrderPending` requires builder `firstOrderPending()`, and the snapshot name is `"firstOrderPending"`. Chain via `parentSnapName` using the builder name (e.g., `parentSnapName: "firstRegisteredCustomer"`).
 - **Snapshot method body**: The body of the `snapToX` method is never executed (the decorator replaces it). Include a throw + unreachable return for documentation:
    ```typescript
    @CapoTestHelper.hasNamedSnapshot({ actor: "tina", parentSnapName: "bootstrapped", builderVersion: undefined })
    async snapToFooIsReady() {
        throw new Error("never called; see fooIsReady()");
        return this.fooIsReady();
    }
    async fooIsReady() {
        // ... transaction building & submission
    }
    ```

- **Helper state:** use `helperState.namedRecords` to store captured record IDs from `captureRecordId()`. Use predictable record keys like `"firstRegisteredCustomer"`, `"firstPendingOrder"`, etc.
- **Capture ids:** centralize record-id capture when needed for a snapshot, as `captureRecordId({recordName, submit?, expectError?, uutName?}, tcxPromise)` which reads `tcx.state.uuts[uutName]`, stores it in `helperState.namedRecords[recordName]`, and optionally submits via `submitTxnWithBlock()`.
    - DO NOT use captureRecordId() unless you need to reference the id's as part of a snapshot;
    - Don't use captureRecordId() when you don't need to record the id's.  Instead, call `submitTxnWithBlock()` directly.
    - Use `h.helperState!.namedRecords[recordName]` to get the captured record-id string.
- **Controller calls:** use controller methods that build transactions (`mkTxnPropose...`, `mkTxnAdopting...`, `mkTxnUpdate...`) and feed them through `captureRecordId` to bind names to record ids. Use controller sample data helpers (e.g., `sampleProposed...`) to populate txns.
- **Submit helpers:** prefer a single submitter (e.g., `submitTxnWithBlock(tcx, { expectError })`) instead of ad-hoc `submitTx`. Pass `expectError` for negative tests.
    - To execute a txn created with a `mkTxn*` method, it MUST be submitted with `submitTxnWithBlock()`; otherwise, you haven't run the transaction, just built it.
    - `captureRecordId()` with { submit: true } will submit the txn
- **Actor handoff:** snapshots ALWAYS set the actor explicitly (`setActor("marissa")`) because snapshots are bound to the actors that initiate their transaction sequences.  The sequence MAY then swap to a different actor as part of the snapshot setup. This ensures test scenarios are deterministic even when when skipping to the result of a snapshot.
- **Naming for chained flows:** use sequence names that mirror the workflow / state-machine names (e.g. "initialize" → "activate" → "retire" or "ordered", "out for delivery", "delivered", "paymentConfirmed") sequences with consistent recordName keys and snapshot names, so tests can hop into any stage deterministically.


## Testing off-chain classes
Create your own test-helper derived from DefaultCapoTestHelper and build transactions with the same code paths your UI would call.

```typescript
// In YourCapoTestHelper.ts:
// Import pre-wired test functions - NOT from vitest!
import { describe, it, fit, xit } from "./YourCapoTestHelper.js";

describe("Your Feature", () => {
    it("works", async ({ h }) => {
        await h.reusableBootstrap();
        // h.capo is ready, actors available
    });

    // fit("focused test", ...) - runs only this test
    // xit("skipped test", ...) - skips this test
});
```

1) Initialize: `await h.reusableBootstrap()` (or `h.initialize()` for off-chain-only tests).
2) Interact: switch actors (`await h.setActor("tom")`), build tx with `h.mkTcx()`, mint/use helpers (`capo.utxoHelper.mustFindActorUtxo(...)`, `capo.tokenAsValue(...)`), and submit with `h.submitTxnWithBlock(tcx)`.
3) Assert: check balances/utxos (`await wallet.utxos`), mph/token names, or rejected promises (`await expect(fn).rejects.toThrow(/pattern/)`).

## Create your own test helper

```typescript
// YourCapoTestHelper.ts
import { DefaultCapoTestHelper, CapoTestHelper, StellarTestContext } from "@donecollectively/stellar-contracts/testing";
import { YourCapo } from "./YourCapo.js";

export type YourCapo_TC = StellarTestContext<YourCapoTestHelper>;

export class YourCapoTestHelper extends DefaultCapoTestHelper.forCapoClass(YourCapo) {
    get stellarClass() { return YourCapo; }

    // Add scenario shortcuts, e.g.:
    async proposeFirstRecord() { /* ... */ }

    // Snapshot entry point - decorator replaces method body entirely
    // Snapshot name "firstRecordProposed" derived from method name
    @CapoTestHelper.hasNamedSnapshot({
        actor: "tina",
        parentSnapName: "bootstrapped",  // or "enabledDelegatesDeployed", or a custom parent
        builderVersion: undefined,
    })
    async snapToFirstRecordProposed() {
        throw new Error("never called; see firstRecordProposed()");
        return this.firstRecordProposed();
    }

    // Snapshot builder - called by decorator (name = snapTo* minus "snapTo" prefix)
    async firstRecordProposed() {
        this.setActor("tina");
        return this.proposeFirstRecord();
    }
}

// Export pre-wired describe/it - tests import these instead of from vitest
export const { describe, it, fit, xit } = YourCapoTestHelper.createTestContext();
```

**Key points:**
- Derive from `DefaultCapoTestHelper.forCapoClass(YourCapo)` to embed your Capo subclass.
- **Export pre-wired test functions** at the bottom of your helper file:
  ```typescript
  export const { describe, it, fit, xit } = YourCapoTestHelper.createTestContext();
  ```
  Tests import these instead of from vitest. This auto-injects the helper as `{ h }` in the context.
- Provide scenario shortcuts that leave the chain in a ready state.
- Create snapshots for reusable test states.
- Reuse fixtures such as `exampleData()` from your controllers.

**For helpers needing custom state fields** (beyond the built-in `namedRecords`):
```typescript
export class YourCapoTestHelper extends DefaultCapoTestHelper.forCapoClass(
    YourCapo,
    { customField: [], anotherField: {} }  // merged into defaultHelperState
) { /* ... */ }
```


## Testing on-chain policy scripts
These are integration-style tests that drive the same off-chain controllers but assert on policy outcomes and delegated data. Use your app-specific helper (e.g., `YourCapoTestHelper`).

```typescript
// YourPolicy.test.ts
import { describe, it, fit, xit } from "./YourCapoTestHelper.js";  // NOT from vitest!
import { vi, expect } from "vitest";

describe("Your Policy", () => {
    it("adopts a record with consent", async ({ h }) => {
        await h.snapToFirstRecordProposed();
        await h.adoptFirstRecord();
        const record = await h.findFirstAdoptedRecord();
        expect(record).toBeDefined();
    });

    it("rejects adoption without consent", async ({ h }) => {
        await h.snapToFirstRecordProposed();
        vi.spyOn(h.capo, "txnAddGovAuthority").mockImplementation((tcx) => tcx as any);
        await expect(h.adoptFirstRecord({ expectError: true }))
            .rejects.toThrow(/missing required.*capoGov-/);
    });
});
```

1) Scenario helpers to trigger more detailed api calls with lighter
interface and automatic {expectError} and tx submission handling: “proposeFirstRecord,“adoptFirstRecord,” “mockMemberToken,” or “participantSelfRegisters”
2) Build & submit via helper methods (e.g., `h.adoptFirstRecord()`, `h.proposeFirstDomain({...})`).
3) Assert: locate records via helpers, inspect datums, expect failures when missing authority.
4) Negative-paths: spy on controller/delegate methods to simulate problem cases by bypassing the normal setup (`vi.spyOn(controller, "mkTxnUpdateRecord")`) and assert thrown errors - usually, in the on-chain transactions that don't comply with the policy's rules.
   beware: don't use snapshots for cases needing spies and negative tests!

Key example patterns to mirror in your app:
- Use state machines (in an on-chain enum) to control workflow and lifecycle of a policy-controlled record (e.g. Pending → Active → Retired).
- Update flow that requires consent/authority plus data integrity checks.
- Full-lifecycle testing: exercise each state and constraint with negative tests.
- Negative tests should be present to verify each constraint, demonstrating the transaction failure with clear error messages.
- NEVER have multiple happy-path tests that run the same setup and test different results unless there's an important reaon.  Instead, make a single test with the happy setup, and check all the desired results, with failure messages indicating any unexpected results.
- Make tests for your data-controller/policy right next to its code, making them easily found and portable when refactoring.

## Testing DelegatedDataContract lifecycle hooks

`DelegatedDataContract` provides lifecycle hooks that fire during transaction building. These are extension points your data controllers can override, and they should be tested.

### Available hooks

| Hook | When it fires | What it receives | Returns |
|------|--------------|-----------------|---------|
| `beforeCreate(record, context)` | After merging defaults + id + type + caller data, before datum construction | Merged record (`TLike`), `{ activity }` | Patched record (`TLike`) |
| `beforeUpdate(record, context)` | After merging existing record + updated fields, before datum construction | Merged record (`TLike`), `{ original, activity }` | Patched record (`TLike`) |

Both are synchronous transforms. The base class implementations are passthroughs. Override them in your data controller subclass to normalize records for on-chain policy compliance (e.g., computing derived fields, setting timestamps, adjusting status values the policy enforces).

### Testing your hook implementations

Test that your override produces the correct output by spying on it:

```typescript
it("beforeCreate sets computed fields", async ({ h }) => {
    await h.reusableBootstrap();
    const controller = await h.capo.getDgDataController("myRecordType");
    const spy = vi.spyOn(controller, "beforeCreate");

    await h.createFirstRecord();

    expect(spy).toHaveBeenCalled();
    const returnedRecord = spy.results[0].value;
    expect(returnedRecord.computedField).toBe(expectedValue);
});
```

### Testing that before-hooks satisfy policy constraints

If your on-chain policy enforces a field that `beforeCreate` or `beforeUpdate` is responsible for setting, write a negative test that bypasses the hook:

```typescript
it("policy rejects record without computed field", async ({ h }) => {
    await h.reusableBootstrap();
    const controller = await h.capo.getDgDataController("myRecordType");
    // bypass the hook so the required field is missing
    vi.spyOn(controller, "beforeCreate").mockImplementation((r) => r);

    await expect(
        h.createFirstRecord({ expectError: true })
    ).rejects.toThrow(/missing required field/);
});
```

This confirms the hook isn't just cosmetic — the policy actually needs what it provides.

**Reminder**: Don't use snapshots for cases needing spies — load an earlier snapshot before setting the spy, then use non-snapshot helper methods.

## Boilerplate you can copy
- `boilerplate/testing/basic-offchain.test.ts`: starter Vitest file wired to `DefaultCapoTestHelper` with one passing check; remove `describe.skip` when ready.
- `boilerplate/testing/policy-flow.test.ts`: skeleton for a delegated-data/policy-flow test showing how to stub controller validation and assert failures before enabling the happy path.

## Critical practices
- Use `await h.reusableBootstrap()` to bootstrap the chain and leave it in a ready state for the test.  This is much faster than `await h.bootstrap()` and can be used in every test that includes any onchain functionality.
    ```typescript
    const { h } = context;
    await h.reusableBootstrap();
    ```
    If you need a different snapshot, you can then call its `snapToFoo()` method on the helper. For example, if you need to test the "activate" state, you can call `await h.snapToActivate()` after the bootstrap.
- Define and use snapshot methods in the test helper to prepare a predefined state that directly connects the bootstrap state to specific test scenarios.  The test helpers will re-use the snapshots via the `snapTo‹SnapshotName›()` method.  See `reference/boilerplate/testing/basic-offchain.test.ts` and `reference/boilerplate/testing/policy-flow.test.ts`  and `reference/boilerplate/testHelper.ts` for examples.
  - ALWAYS read and understand the test helper code before writing tests or when troubleshooting.
  - When there is a test failure, be sure to look at the whole error message and not only the first line of the error; often Helios reports the script name and the actual site of the error in later lines of the error message.

## Tips and pitfalls
- **Comparing byte values in assertions**: Raw `number[]` from `.hash()` or datum fields cannot be compared with `===`, `==`, or `expect().toBe()` — these check reference identity, not contents, and will silently fail. Use `equalsBytes(a, b)` from `@helios-lang/codec-utils`: `expect(equalsBytes(script1.hash(), script2.hash())).toBe(true)`. For typed Helios hash objects (`MintingPolicyHash`, `ValidatorHash`, etc.), use `.isEqual()`: `expect(mph1.isEqual(mph2)).toBe(true)`. Avoid `.toHex()` roundtrips just for comparison — they work but obscure intent.
- **Testing time-sensitive transactions**: When a policy uses `getTimeRange(granularity)` or `now()`, tests must set the validity window correctly. `tcx.txnTime` is the `validity.start` seen on-chain as `now()`. For how `validFor()`, `txnTime`, and `txnEndTime` synchronize with on-chain time checks, see `essential-stellar-offchain.md` § "Validity windows".
  - **Normal case**: `txnTime` auto-sets to ~3 minutes ago (slot-aligned). Set datum timestamp fields from `tcx.txnTime.getTime()` so they match what the policy sees as `now()`. Call `validFor(durationMs)` matching the policy's granularity. This handles the vast majority of time-sensitive tests.
  - **Testing time-based rejections**: Manipulate datum timestamp fields relative to the transaction time so the policy's time comparison fails. For example, set a datum's timestamp to a future date then transact at the current time, or set it to the past so a deadline check fails. Use `h.network.tick(n)` to advance the emulator by `n` slots when you need the network clock itself to move.
  - **Time-traveling the emulator — specialized use only**: `submitTxnWithBlock(tcx, { travelToFuture: new Date(...) })` fast-forwards the emulator to a future time before submission. Reserve for cases where the transaction itself must not be valid until a future moment (e.g., testing time-locked release logic). Distinct from `tcx.futureDate(date)`, which pins the transaction's validity window start without advancing the emulator — use that during transaction building when a controller needs `tcx.txnTime` to produce correct datum values for a future-valid transaction.
- Prefer using a snapshot (`h.snapTo...`) or `await h.reusableBootstrap()` when you need to test onchain functionality.  `initialize()` is faster and good for testing off-chain-only code, but it can't check any onchain policies.
- For one-off transaction execution, use submitTxnWithBlock() directly for one-off cases of submitting a txn built directly from a controller mkTxn* method.  Can use mocking.
- To DRY up tests, create helper methods that have options?: { submit?: boolean; expectError?: true; } and call through to submitTxnWithBlock().  mock-compatible if it doesn't use snapshots.
- **Asserting on-chain errors:** On-chain policy errors only occur at **submit time**, not when building with `mkTxn*`. Use helper methods that combine build+submit:
    ```typescript
    // BEST: helper method handles build+submit internally
    await expect(
        h.adoptFirstRecord({ expectError: true })
    ).rejects.toThrow(/missing required.*capoGov-/);

    // If no helper exists, build then submit separately:
    const tcx = await controller.mkTxnAdoptRecord(...);
    await expect(
        h.submitTxnWithBlock(tcx, { expectError: true })
    ).rejects.toThrow(/policy error pattern/);
    ```
    The `expectError: true` hints to the tx executor that failure is expected (suppresses confusing logs); the `rejects.toThrow()` asserts on the specific policy error message. Prefer creating helper methods with `{ submit?, expectError? }` options to avoid the verbose build+submit pattern.
- For mocking, you MUST NOT call to a snapshot or a helper method that calls a snapshot after the mock has been set.  Instead, load an earlier snapshot before setting the mock, then non-snapshot method(s) to build (with mocking) and submit the txn.
- Prefer to use an appropriate existing helper method that has {submit,expectError} options, instead of calling a controller's mkTxn* method directly
- Use `h.setActor("<name>")` to impersonate wallets; `findSufficientActorUtxos` and `mustFindActorUtxo` handle tcx exclusions for you.
- For rejection cases, assert on the specific regex the policy emits; many helpers throw descriptive errors (e.g., “missing required…capoGov-”).
- When debugging, `dumpAny` is available; `h.network.tick(n)` advances slots when the timing of transactions is important for your smart-contract policies.


## Where to look next
- **Snapshot system deep-dive**: `reference/essential-stellar-testing-snapshots.md` - decorator options, cache keys, hierarchical caching
- Off-chain design: `reference/essential-stellar-offchain.md`
- On-chain helpers and policy layout: `reference/essential-stellar-onchain.md` and `reference/essential-stellar-internals.md`
- Architecture overview + kickstart: `reference/essential-stellar-dapp-architecture.md`, `reference/essential-stellar-dapp-kickstart.md`
