# Stellar data-policy essentials

## MUST READ: Context and Dependencies

Use this as a focused guide for authoring data-policy delegates (Helios scripts) that validate creation/update/delete of CIP-68 records stored at the Capo.

See also ./essential-stellar-onchain.md.

Every data-policy delegate is wrapped by a Typescript subclass of DelegatedDataController (see `reference/essential-stellar-offchain.md` for more on that).

## What a data-policy delegate is
- A Helios policy script (DelegatedDataContract specialization) that owns a UUT (idPrefix-based) and enforces business rules for one record type.
- On-chain datum: stores an on-chain data record together with some value.  

- Redeemer/activity: your policy-specific Spending/Minting/BurningActivities; the mint/spend delegates call you via additionalDelegateValidation, using abstract activities `CreatingDelegatedData` / `UpdatingDelegatedData` / `DeletingDelegatedData`, with your nested activities being more specific cases of those.

## Expectations for specialized delegates
- Keep the DelegateActivity top-level variants exactly as in the base: CapoLifecycle, DelegateLifecycle, SpendingActivities, MintingActivities, BurningActivities, Creating/Updating/DeletingDelegatedData, MultipleDelegateActivities, OtherActivities.
- Add only your own nested activity enums under Spending/Minting/Burning/Other.
- Implement `additionalDelegateValidation(priorIsDelegationDatum, capoCtx)`:
  - Called once per activity (and per nested item inside MultipleDelegateActivities).
  - Not called for Creating/Updating/DeletingDelegatedData (handled by mint/spend delegates).
  - The basic delegate already rejects changes to the CIP-68 `@id` and `tpe` fields (see `mustOutputDelegatedData` in `CapoCtx`), so you should not re-validate or attempt to mutate them; tests should focus on your domain fields and value/authority checks instead.
  - Use capoCtx + DgDataDetails to read input/output data, enforce token/value shapes, and apply your business rules.

## Step-by-step: creating a data-policy script
1) Define your data type: CIP-68 map fields with `@id` (record-id/uut-name) and `tpe` (record type string). Add your domain fields.
2) Define DelegateDatum:
   - `IsDelegation{dd: DelegationDetail}` (unchanged).
   - `capoStoredData{data: <YourData>, version: Int, otherDetails: Data}` (tag matches CapoDatum::DelegatedData).
3) Define activity enums:
   - `SpendingActivity` / `MintingActivity` / `BurningActivity` with your domain variants.
   - Keep top-level DelegateActivity variants as required.
4) Implement `additionalDelegateValidation`:
   - Switch on DelegateActivity; handle your Spending/Minting/Burning/Other variants.
   - Use `capoCtx.updatingDgData(recId)` / `creatingDgData(recId)` / `referencingDgData(recId)` to get DgDataDetails.
   - Read datums via `inputData()/outputData()` and cast with `<YourData>::from_data`.
   - Enforce invariants (auth, state transitions, value checks); return Bool.
5) Multi-activity: if you support batching, allow `MultipleDelegateActivities` and iterate nested activities; otherwise reject it.
6) Ref scripts/UUT: ensure your manifest entry names the policy token (idPrefix) and ref script is stored; mint path validates UUT name (seed+idPrefix).

## How the basic delegates orchestrate (summary)
- Mint delegate: validates `CreatingDelegatedData`/`DeletingDelegatedData`, enforces idPrefix/UUT mint/burn, then defers to your MintingActivities/BurningActivities nested in `MultipleDelegateActivities` (if present).
- Spend delegate: validates `UpdatingDelegatedData`, ensures record-id token returned, then defers to your SpendingActivities nested in `MultipleDelegateActivities` (if present).
- You only implement your policy-specific nested activities in `additionalDelegateValidation`; lifecycle and idPrefix/UUT guardrails are handled by mint/spend delegates.

## Cross-links
- Helper patterns and multi-activity details: `reference/essential-stellar-internals.md`
- On-chain architecture and manifest/idPrefix rules: `reference/essential-stellar-dapp-architecture.md`
- Delegate lifecycle responsibilities: `reference/essential-capo-lifecycle.md`
- On-chain helper APIs (CapoCtx, DgDataDetails, DelegateInput): `reference/essential-stellar-onchain.md`
