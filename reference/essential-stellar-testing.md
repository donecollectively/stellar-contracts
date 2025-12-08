# Stellar testing essentials

For dApp teams who already write basic Typescript, this guide shows how to test both off-chain classes and on-chain policy scripts in their own stellar-based dApps. It assumes you have pnpm, Node 20+, and can run Vitest.

## Quick setup
- Install deps: `pnpm add -D vitest`
- Run all tests: `pnpm test` (or `pnpm testing` for watch). Smoke subset: `SMOKE=1 pnpm test`
- Node flags: Vitest already configured; no extra ts-node flags needed.

## Core test harness pieces
- `vitest` with typed contexts: `describe`/`it` are parameterized with your test context type (`StellarTestContext<T extends TestHelper>`).
- `addTestContext(context, HelperClass, options?, helperState?)`: boots a helper + mock network and attaches it to each test’s `context.h`.
- Helpers expose wallets (`context.h.actors`), a Capo instance, `network`, `mkTcx()` for transaction contexts, and scenario helpers (e.g., `initialize`, `bootstrap`, `setActor`, `submitTx`, `network.tick`).
- Common helpers:
  - `DefaultCapoTestHelper` (stellar-contracts): fast local net with tina/tom/tracy wallets, Capo bootstrap, UUT utilities.
  - `YourCapoTestHelper` (app-specific on-chain flows): add scenario shortcuts like “propose first record”, “adopt first record”, “find first adopted record.”
- Use `vi.spyOn` to intercept delegate/controller methods for negative-path tests (see examples in boilerplate/).

## Helper conventions you should mirror (from production helpers)
- **Snapshot decorator pattern:** annotate snapshot entrypoints with `@CapoTestHelper.hasNamedSnapshot("snapName", "actorName")`. The decorated method should be a thin wrapper that immediately delegates to the underlying builder (and often throws if called directly); snapshot reuse is handled via helper state.
- **Snapshot naming:** `snapToX` for entrypoints that may be reused; corresponding builders are imperative verbs like `proposeX`, `adoptX`, `changingX`, etc. Chain snapshots in order of dependency (e.g., `snapToFirstOrderPending` calls `snapToFirstRegisteredCustomer`).
- **Snapshot builder method naming**: the builder method MUST ALWAYS be based on the snapToFoo method name, without `snapTo` prefix.  For example, the builder method for `snapToFirstOrderPending` MUST be `proposeFirstOrder()` or it WILL NOT WORK.  
 - **Snapshot method body**: The body of the snapToFoo method will never be called.  Always implement it with a helpful error message and an unreachable call to the method that actually gets called automatically by the decorator.      
    ```typescript
    async snapToFoo() {
        throw new Error("never called; see foo()");
        return this.firstMember();
    }
    ```

- **Helper state:** keep `helperState.snapshots` and `helperState.namedRecords` (string ids captured from tx contexts). Use predictable record keys like `"firstRegisteredCustomer"`, `"firstPendingOrder"`, etc.
- **Capture ids:** centralize id capture in a helper such as `captureRecordId({recordName, submit?, expectError?, uutName?}, tcxPromise)` which reads `tcx.state.uuts[uutName]`, stores it in `helperState.namedRecords[recordName]`, and optionally submits via `submitTxnWithBlock`.
- **Controller calls:** use controller methods that build transactions (`mkTxnPropose...`, `mkTxnAdopting...`, `mkTxnUpdate...`) and feed them through `captureRecordId` to bind names to record ids. Use controller sample data helpers (e.g., `sampleProposed...`) to populate txns.
- **Submit helpers:** prefer a single submitter (e.g., `submitTxnWithBlock(tcx, { expectError })`) instead of ad-hoc `submitTx`. Pass `expectError` for negative paths.
- **Actor handoff:** snapshots ALWAYS set the actor explicitly (`setActor("marissa")`) because snapshots are bound to the actors that initiate their transaction sequences.  The sequence MAY then swap to a different actor as part of the snapshot setup. This ensures test scenarios are deterministic even when when skipping to the result of a snapshot.
- **Naming for chained flows:** use sequence names that mirror the workflow / state-machine names (e.g. "initialize" → "activate" → "retire" or "ordered", "out for delivery", "delivered", "paymentConfirmed") sequences with consistent recordName keys and snapshot names, so tests can hop into any stage deterministically.

## Testing off-chain classes
Use DefaultCapoTestHelper and build transactions with the same code paths your UI would call.
1) Arrange: set up context in `beforeEach` with `addTestContext(context, DefaultCapoTestHelper)`.
2) Initialize: `const capo = await h.initialize()` (or `await h.bootstrap()` to mint charter + UUTs).
3) Interact: switch actors (`await h.setActor("tom")`), build tx with `h.mkTcx()`, mint/use helpers (`capo.utxoHelper.mustFindActorUtxo(...)`, `capo.tokenAsValue(...)`), and submit with `h.submitTx(tx, "force")`.
4) Assert: check balances/utxos (`await wallet.utxos`), mph/token names, or rejected promises (`await expect(fn).rejects.toThrow(/pattern/)`).


## Testing on-chain policy scripts
These are integration-style tests that drive the same off-chain controllers but assert on policy outcomes and delegated data. Use your app-specific helper (e.g., `YourCapoTestHelper`).
1) Context: `beforeEach` uses `addTestContext(context, YourCapoTestHelper, undefined, helperState)`.
2) Scenario helpers set chain state fast: include flows like “propose first record,” “adopt first record,” “mock member token,” or “participant self-registers.”
3) Build & submit via helper methods (e.g., `h.adoptFirstRecord()`, `h.adoptRecordUpdate(...)`, `h.proposeFirstDomain({...})`).
4) Assert: locate records via helpers, inspect datums (e.g., `details.ChangePendingV1`), and expect failures when missing authority tokens or approvals.
5) Negative-paths: spy on controller/delegate methods to simulate problem cases by bypassing the normal setup (`vi.spyOn(controller, "mkTxnUpdateRecord")`) and assert thrown errors - usually, in the on-chain transactions that don't comply with the policy's rules.

Key example patterns to mirror in your app:
- Use state machines (in an on-chain enum) to control workflow and lifecycle of a policy-controlled record (e.g. Pending → Active → Retired).
- Update flow that requires consent/authority plus data integrity checks.
- Full-lifecycle testing: exercise each state and constraint with negative tests.
- Negative tests should be present to verify each constraint, demonstrating the transaction failure with clear error messages.
- Not typically necessary to do granular testing of separate field changes in a positive test; a single test that changes all fields at once is usually sufficient.
- Make tests for your data-controller/policy right next to its code, making them easily found and portable when refactoring.

## Create your own test helper
- Derive from `DefaultCapoTestHelper` to embed your Capo subclass and any app-specific controllers.
- Provide scenario shortcuts that leave the chain in a ready state (e.g., “bootstrap + propose first record”), so tests stay short and expressive. 
- Reuse fixtures such as `exampleData()` from your controllers to compare against adopted datums.  If you need to check other scenarios, you can use YourPolicyDataLike type (same type as exampleData() returns) to define other policy-specific fixtures, or you can patch exampleData() to return the desired data for the test.

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

## Tips and pitfalls
- Prefer `await h.bootstrap()` when you need to test onchain functionality.  `initialize()` is faster and good for testing off-chain-only code, but it can't check any onchain policies.
- Use `h.setActor("<name>")` to impersonate wallets; `findSufficientActorUtxos` and `mustFindActorUtxo` handle tcx exclusions for you.
- For rejection cases, assert on the specific regex the policy emits; many helpers throw descriptive errors (e.g., “missing required…capoGov-”).
- When debugging, `dumpAny` is available; `h.network.tick(n)` advances slots when the timing of transactions is important for your smart-contract policies.

## Where to look next
- Off-chain design: `reference/essential-stellar-offchain.md`
- On-chain helpers and policy layout: `reference/essential-stellar-onchain.md` and `reference/essential-stellar-internals.md`
- Architecture overview + kickstart: `reference/essential-stellar-dapp-architecture.md`, `reference/essential-stellar-dapp-kickstart.md`
