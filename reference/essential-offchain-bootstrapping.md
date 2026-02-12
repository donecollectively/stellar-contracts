# Off-chain Bootstrapping & Lifecycle Reference

For the overall dApp creation workflow, see the kickstart guide at `reference/essential-stellar-dapp-kickstart.md`. For day-to-day off-chain development patterns, see `reference/essential-stellar-offchain.md`.

## Kickstart/Overview (actionable steps)
- Prereqs: read on-chain/off-chain/architecture/internals; have Node/PNPM + Helios; wallet + seed UTxO recorded; build bundles/bridges.
- Instantiate: implement Capo subclass with `delegateRoles()`/feature flags; create Capo instance with seed config; keep `StellarTxnContext`.
- Mint charter: `mkTxnMintCharterToken` (seed → charter + delegate UUTs + CharterData); include ref-script txns for minter/capo/mint delegate; submit batch.
- Install policies: `mkTxnInstallingPolicyDelegate` (or queue+commit) and attach ref scripts; commit pending changes.
- Settings (optional): create settings record; register manifest key `currentSettings`; commit pending if needed.
- Create records: if idPrefix UUT needed, select seed; controller `txnCreatingRecord` with charter ref, delegate authorities, ref scripts; submit.
- Update records: fetch via controller; build tx with spend delegate activity + controller update; preserve record-id token; return to Capo.
- Upgrade delegates: `mkTxnUpdatingMintDelegate`/`mkTxnUpdatingSpendDelegate`; data-policy via queue/commit; refresh ref scripts.
- Ref scripts: add via `txnMkAddlRefScriptTxn`; later attach with `txnAttachScriptOrRefScript`.
- Validate & submit: charter token returned; delegate UUTs present/returned; manifest keys resolve; ref scripts attached; redeemers match activities; submit primary + addl txns.

## Charter bootstrap & update
- Charter bootstrap: `mkTxnMintCharterToken` builds seed→charter mint tx + ref scripts (Capo, minter, mint delegate); sets CharterData with delegate links/manifest (one-time per Capo).  The CapoProvider provides UI with a button to trigger this flow.  dApps need to capture the deployment details, store them in their code repository, and build their dAPI package to get pre-compiled minter, Capo and mint/spend delegates.  This package is then used by their UI to create and validate transaction before submitting them onchain.
    - `mkAdditionalTxnsForCharter`: Capo's hook for adding dApp-specific additional transactions to the charter creation process.  It is called during the creation of the charter transaction.  The provided transaction context has state.charterData in case it's needed.  This method should use {@link StellarTxnContext.includeAddlTxn} to add transactions to the context.  No-op by default.
- Charter update: `txnUpdateCharterUtxo`/`mkTxnUpdateCharter` spends charter with `updatingCharter`, returns charter token to Capo address, updates links/manifest/pendingChanges (used by admin flows like delegate install/settings/policy changes).  `mkTxnUpgradeIfNeeded` is used by the CharterStatus component to check for needed upgrades and trigger the upgrade transactions.

## Installing/Replacing a Delegate policy
  - Mint/spend delegate: `mkTxnUpdatingMintDelegate` / `mkTxnUpdatingSpendDelegate` (normal or forced), burns old UUT unless forced, updates CharterData link.
  - `mkTxnAddingMintInvariant` and `mkTxnAddingSpendInvariant` are not yet well supported, but are planned for future releases.
  - Data policy/named delegate: `mkTxnAddingNamedDelegate`, `mkTxnQueuingDelegateChange` + `mkTxnCommittingPendingChanges` (queue/commit pattern for manifest DgDataPolicy entries).  DEPRECATED; use DelegatedDataContract subclasses instead.
  - DelegatedDataContract:
      - `setupCapoPolicy` - triggered automatically by the upgrade sequence, it
     -Capo's `mkTxnInstallingPolicyDelegate`, `mkTxnAddManifestEntry`, `mkTxnQueuingDelegateChange`, `mkTxnCommittingPendingChanges` are used to install/update/queue/commit data-policy delegates.
  - commitPendingChangesIfNeeded

## Delegated data & ref scripts (lifecycle)
- Settings: delegated-data type referenced by manifest `currentSettings`.
- Ref scripts: `mkTxnMkAddlRefScriptTxn` stores ref scripts at Capo; `txnAttachScriptOrRefScript` prefers ref, falls back to using inline (but this will usually fail due to transaction size limits).

## Bootstrapping helpers
- `mkOnchainRelativeDelegateLink` / `extractDelegateLinkDetails`: encode delegate link from configured delegate.
- Pending changes: queue delegate installs in CharterData `pendingChanges`, then `commitPendingChangesIfNeeded` to activate.

## Cross-links
- Off-chain flows: `reference/essential-stellar-offchain.md`
- UI support: `reference/essential-stellar-ui.md`
- Kickstart guide: `reference/essential-stellar-dapp-kickstart.md`
- Lifecycle duties: `reference/essential-capo-lifecycle.md`
