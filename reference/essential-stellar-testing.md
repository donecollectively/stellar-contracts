# Stellar testing essentials

For dApp teams who already write basic Typescript, this guide shows how to test both off-chain classes and on-chain policy scripts in stellar-contracts (and sibling dApps like s3gov). It assumes you have pnpm, Node 20+, and can run Vitest.

## Quick setup
- Install deps: `pnpm install`
- Run all tests: `pnpm test` (or `pnpm testing` for watch). Smoke subset: `SMOKE=1 pnpm test`
- Node flags: Vitest already configured; no extra ts-node flags needed.

## Core test harness pieces
- `vitest` with typed contexts: `describe`/`it` are parameterized with your test context type (`StellarTestContext<T extends TestHelper>`).
- `addTestContext(context, HelperClass, options?, helperState?)`: boots a helper + mock network and attaches it to each test’s `context.h`.
- Helpers expose wallets (`context.h.actors`), a Capo instance, `network`, `mkTcx()` for transaction contexts, and scenario helpers (e.g., `initialize`, `bootstrap`, `setActor`, `submitTx`, `network.tick`).
- Common helpers:
  - `DefaultCapoTestHelper` (stellar-contracts): fast local net with tina/tom/tracy wallets, Capo bootstrap, UUT utilities.
  - `S3CapoTestHelper` (s3gov onchain): adds flows like `snapToProposeFirstDriver`, `adoptFirstDriver`, `findFirstAdoptedDomain`.
- Use `vi.spyOn` to intercept delegate/controller methods for negative-path tests (see s3gov examples).

## Testing off-chain classes
Use DefaultCapoTestHelper and build transactions with the same code paths your UI would call.
1) Arrange: set up context in `beforeEach` with `addTestContext(context, DefaultCapoTestHelper)`.
2) Initialize: `const capo = await h.initialize()` (or `await h.bootstrap()` to mint charter + UUTs).
3) Interact: switch actors (`await h.setActor("tom")`), build tx with `h.mkTcx()`, mint/use helpers (`capo.utxoHelper.mustFindActorUtxo(...)`, `capo.tokenAsValue(...)`), and submit with `h.submitTx(tx, "force")`.
4) Assert: check balances/utxos (`await wallet.utxos`), mph/token names, or rejected promises (`await expect(fn).rejects.toThrow(/pattern/)`).


## Testing on-chain policy scripts (s3gov)
These are integration-style tests that drive the same off-chain controllers but assert on policy outcomes and delegated data. Use S3CapoTestHelper.
1) Context: `beforeEach` uses `addTestContext(context, S3CapoTestHelper, undefined, helperState)`.
2) Scenario helpers set chain state fast: `snapToProposeFirstDriver`, `snapToAdoptFirstDomainAgreement`, `mockMemberToken`, `participantSelfRegisters`.
3) Build & submit via helper methods: `h.adoptFirstDriver()`, `h.adoptDriverUpdate(...)`, `h.proposeFirstDomainAgreement({...})`.
4) Assert: locate records via helpers (`findFirstAdoptedDriver`, `findFirstProposedAgreement`), inspect datums (`details.ChangePendingV1`), and expect failures when missing authority tokens or approvals.
5) Negative-paths: spy on controller/delegate methods to simulate tampering (`vi.spyOn(controller, "mkTxnUpdateRecord")`) and assert thrown errors.

Key examples:
- Driver lifecycle: `onchain/src/Driver/Driver.test.ts` (approval required, member-only, data matching).
- Agreement/domain lifecycle: `onchain/src/Agreement/Agreement.test.ts` (consent checks, data integrity, authority requirements).
- OtherData end-to-end: `onchain/src/S3OtherData/OtherData.test.ts` (propose/adopt driver, update driver, propose domain, authority enforcement).

## Create your own test helper
- Derive from `DefaultCapoTestHelper` to embed your Capo subclass and any app-specific controllers.
- Provide scenario shortcuts that leave the chain in a ready state (e.g., “bootstrap + propose first record”), so tests stay short and expressive.  See `reference/boilerplate/testing/basic-offchain.test.ts` and `reference/boilerplate/testing/policy-flow.test.ts` for examples.
- Expose fixtures such as `exampleData()` from your controllers to compare against adopted datums.

## Boilerplate you can copy
- `boilerplate/testing/basic-offchain.test.ts`: starter Vitest file wired to `DefaultCapoTestHelper` with one passing check; remove `describe.skip` when ready.
- `boilerplate/testing/policy-flow.test.ts`: skeleton for a delegated-data/policy-flow test showing how to stub controller validation and assert failures before enabling the happy path.

## Tips and pitfalls
- Prefer `await h.bootstrap()` when you need to test onchain functionality.  `initialize()` is faster and good for testing off-chain-only code, but it can't check any onchain policies
- Use `h.setActor("<name>")` to impersonate wallets; `findSufficientActorUtxos` and `mustFindActorUtxo` handle tcx exclusions for you.
- For rejection cases, assert on the specific regex the policy emits; many helpers throw descriptive errors (e.g., “missing required…capoGov-”).
- When debugging, `dumpAny` is available; `h.network.tick(n)` advances slots when the timing of transactions is important for your smart-contract policies.

## Where to look next
- Off-chain design: `reference/essential-stellar-offchain.md`
- On-chain helpers and policy layout: `reference/essential-stellar-onchain.md` and `reference/essential-stellar-internals.md`
- Architecture overview + kickstart: `reference/essential-stellar-dapp-architecture.md`, `reference/essential-stellar-dapp-kickstart.md`
