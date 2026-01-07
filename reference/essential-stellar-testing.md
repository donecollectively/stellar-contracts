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
1) Arrange: set up context in `beforeEach` with `addTestContext(context, DefaultCapoTestHelper)`.
2) Initialize: `const capo = await h.initialize()` (or `await h.bootstrap()` to mint charter + UUTs).
    - alternatively, access h.capo after the helper is initialized via `initalize()` or` reusableBootstrap()` or `snapTo...`.
3) Interact: switch actors (`await h.setActor("tom")`), build tx with `h.mkTcx()`, mint/use helpers (`capo.utxoHelper.mustFindActorUtxo(...)`, `capo.tokenAsValue(...)`), and submit with `h.submitTx(tx, "force")`.
4) Assert: check balances/utxos (`await wallet.utxos`), mph/token names, or rejected promises (`await expect(fn).rejects.toThrow(/pattern/)`).

## Create your own test helper
- Derive from `DefaultCapoTestHelper` to embed your Capo subclass and any app-specific controllers.
- Provide scenario shortcuts that leave the chain in a ready state (e.g., “bootstrap + propose first record”), so tests stay short and expressive. 
- Create snapshots, named actor rosters, and named records fitting needed scenarios.
- Consult local content-map.md files for lightweight access to details in the test helper.
- Reuse fixtures such as `exampleData()` from your controllers to compare against adopted datums.  If you need to check other scenarios, you can use YourPolicyDataLike type (same type as exampleData() returns) to define other policy-specific fixtures, or you can patch exampleData() to return the desired data for the test.


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
 - WHENEVER you are changing on-chain code in `*.hl` files, the code may take up to 30s to be compiled and start to give you definitive feedback (syntax problems will show up more quickly).  The terminal should show you when scripts are being compiled and when the compilation is done.  You should be patient, and DO NOT pause for chat interaction while waiting for the feedback to appear. You need to notice when the tests are still running, and you need to watch for the onscreen indication of the test being complete or failing.
  - When there is a test failure, be sure to look at the whole error message and not only the first line of the error; often Helios reports the script name and the actual site of the error in later lines of the error message.

## Tips and pitfalls
- Prefer using a snapshot (`h.snapTo...`) or `await h.reusableBootstrap()` when you need to test onchain functionality.  `initialize()` is faster and good for testing off-chain-only code, but it can't check any onchain policies.
- Use `h.setActor("<name>")` to impersonate wallets; `findSufficientActorUtxos` and `mustFindActorUtxo` handle tcx exclusions for you.
- For rejection cases, assert on the specific regex the policy emits; many helpers throw descriptive errors (e.g., “missing required…capoGov-”).
- When debugging, `dumpAny` is available; `h.network.tick(n)` advances slots when the timing of transactions is important for your smart-contract policies.

## Driving changes through testing

When you are a person or an agent making changes to the codebase, you should follow a workflow that allows you to incrementally verify your code changes with tests while remaining deeply connected to the intention and requirements of the existing codebase.  The Workflow and Practices Guidance below will help you do this.  It's important to understand the intent of the requirements, and to be able to explain them to someone else, and to receive and integrate feedback.

While working on code and test changes, you should understand clearly which requirements are new, and what the intent is for those new requirements.  You should be able to explain the intent of the requirements to someone else, and receive and integrate feedback.  

You should be able to adapt when existing requirements change, with special attention to the reason for the change in those requirements and the needed changes to the codebase to support the new requirements.  

You should generally use a long-term goal to make the suite green (fully passing) by taking tests one at a time. For each proposed on-chain/off-chain/test change, you should apply the minimal fix, run with `it.only(...)`, verify locally, then pause for review before moving on or broadening scope.


## Where to look next
- Off-chain design: `reference/essential-stellar-offchain.md`
- On-chain helpers and policy layout: `reference/essential-stellar-onchain.md` and `reference/essential-stellar-internals.md`
- Architecture overview + kickstart: `reference/essential-stellar-dapp-architecture.md`, `reference/essential-stellar-dapp-kickstart.md`
