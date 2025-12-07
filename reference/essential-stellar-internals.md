# Stellar internals 

Use this for low-level helper behavior details that are too verbose for the public on-chain overview. The on-chain essentials doc should point here for specifics.

Also includes descriptions of how the mint/spend delegates perform their duties, and how how data-policy delegates collaborate at arms length with the mint/spend delegates.

## Helper modules (CapoHelpers / CapoDelegateHelpers / StellarHeliosHelpers)
- CapoHelpers: CapoDatum/manifest helpers, CapoCtx, DgDataDetails, DelegateInput.
- CapoDelegateHelpers: delegate-link utilities, authority/value helpers, lifecycle helpers.
- StellarHeliosHelpers: redeemer lookup, CIP-68 unwrap, Value/time/logging/REQT helpers.
- CapoMintHelpers (used by mint/spend delegates): `validateUutMinting(mph, seed, purposes, mkTokenName, needsMintDelegateApproval?)` enforces UUT mint shapes; `mkUutTnFactory(seed)` builds token-name factory for seed-derived UUTs.

## DelegateInput (fields: link, role, idPrefix, input, mph)
- `genericDelegateActivityAsData()` / `genericDelegateActivity()` read the delegate redeemer via `mustFindInputRedeemer` for cross-script validation.
- Mint path: `withMintingActivity()` plus `withUniqueSeededMintingActivity(seed)` accepts `MultipleDelegateActivities`, filters to exactly one `MintingActivities` for the given seed, errors on zero/multiple or wrong variants, then asserts delegate unchanged.
- Spend/data-policy path: `withSpendingActivity()` plus `withUniqueDDSpendingActivity(recId)` accepts `MultipleDelegateActivities`, rejects non-spend variants, filters to exactly one `SpendingActivities` for that recId, errors on zero/multiple, then asserts delegate unchanged.
- Admin helpers: `updatingManifest()`, `requiresValidOutput()`, `delegateUnchanged()` to enforce delegate token return/continuation invariants.

### MultipleDelegateActivities collaboration

The basic delegate processes MultipleDelegateActivities when requested for a data-policy delegate.  As a result, data-policy delegates can simply look for specific (non-multiple) spending/minting activities and enforce the correct logic; the additionalDelegateValidation() function in the data-policy delegate is called once for each nested activity.

- Any delegate type may emit `MultipleDelegateActivities`; mint/spend delegates and data-policy delegates interpret the nested list with one-level depth.
- Mint delegate: `withUniqueSeededMintingActivity(seed)` scans the nested activities for exactly one `MintingActivities` tagged to that seed; rejects non-mint items, duplicates, or missing entries.
- Spend delegate + data-policy: `withUniqueDDSpendingActivity(recId)` scans for exactly one `SpendingActivities` whose recId matches; rejects `Creating/Updating/DeletingDelegatedData` in this context, errors on zero/multiple matches, ensures delegate datum unchanged.
- Net effect: a single transaction can bundle multiple delegate actions; each delegate enforces its slice (mint keyed by seed, spend keyed by recId) while preventing ambiguous or mixed activity lists.

## DgDataDetails
- `uutValue()` for the record-id token Value.
- `abstractInput()/abstractOutput()`, `inputData()/outputData()` to read CIP-68 payloads; use `::from_data()` on the target type.
- `spendingActivity()` / `burningActivity()` to assert and return abstract activity redeemers from inputs.

## CapoCtx highlights
- Value/AC constructors (`mkTv`, `mkAc`), governance gate (`requiresGovAuthority`), redeemer fetch (`getCharterRedeemer`), delegated-data helpers (`creatingDgData`, `updatingDgData`, `referencingDgData`), manifest lookup (`getManifestedData`, `findManifestTokenName`, `getSettingsId`), delegate input fetchers (`requiresDgDataPolicyInput`, `requiresMintDelegateInput`, `requiresSpendDelegateInput`).

## RelativeDelegateLink
- `getRedeemer(input)` → `AbstractDelegateActivitiesEnum` via `mustFindInputRedeemer`.
- Authority helpers: `tvAuthorityToken`, `acAuthorityToken`.

## Logging / REQT helpers (StellarHeliosHelpers)
- Group markers: `logGroupStart/logGroupEnd`, wrappers: `logGroup/logGroupUnit`.
- Requirements: `REQT`, `bREQT`, `REQTgroupStart`, `assertREQTgroup`, `bREQTgroup`, generic `REQTgroup[T]`, `REQTgroupUnit`.
- Diagnostics: `TRACE`, `TODO`.


### 
