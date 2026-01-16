# Capo Lifecycle

Responsibility for enforcing the policies around the lifecycle of the Capo's charter data is shared between the mint and spend delegates, the Capo itself, and the capo's low-level minter.  Because the mint/spend delegates can be upgraded, but the minter and the Capo itself cannot, this division of responsibility is used to maximize evolutionary capacity while providing low-level escape hatches for correcting possible problems introduced by upgrades.

See essential-stellar-dapp-architecture.md for more details about the overall architecture and transaction patterns.

## Key concepts

- Minter: just a minter, with static/non-upgradeable policy code.
- Capo: simple harness for delegating most responsility through indirection instructions encoded in the singleton CharterData datum.
- Mint delegate: validates minting and data-creation creation use-cases.  Re-delegates to data policies for different types of onchain data when they are created.  Typically provided by the same policy script as the spend delegate.
- Spend delegate: validates spending of Capo UTxOs, and is upgradable.  Usually delegates its enforcement to data policies.
- Data policy delegates per record type

### Responsibility snapshot:
- Mint delegate: CreatingDelegate; queuePendingChange checks; its share of commitPendingChanges (burns).
- Spend delegate: commitPendingChanges (manifest application); future manifest updates; other lifecycle actions when dgtRolesForLifecycleActivity says spend.
- Capo only: forced mint/spend delegate swaps (abnormal/emergency escape hatches), ref-script retire, base delegated-data id/token consistency; governance gating for lifecycle/admin.

### Bootstrap / lifecycle flow pointers
- Charter bootstrap: Capo + minter mint charter token and delegate UUTs; writes CharterData; stores ref scripts (mint delegate involved).
- Delegate install/replace: queue pending change (mint delegate validates add/replace), commit pending change (spend delegate applies manifest change; mint delegate checks burns), force replacements handled by Capo only.
- Settings/data records: spend delegate validates delegated-data spends; mint delegate validates delegated-data creates/deletes; data-policy delegates enforce record-specific rules.
- Ref scripts: Capo gov-gated retiring/replacing; add via companion txns when policies are installed/upgraded.

### Activity enums (per delegate type)
- BasicDelegate (mint/spend): DelegateLifecycleActivity (create/replace/retire/validate settings); CapoLifecycleActivity passthrough (must match Capo redeemer; role-gated by dgtRolesForLifecycleActivity); CreatingDelegatedData / UpdatingDelegatedData / DeletingDelegatedData hook delegated-data create/update/delete; MultipleDelegateActivities (one-level nesting) and OtherActivities (extension hook).
- DelegatedDataContract (data-policy): shares DelegateLifecycleActivity, plus policy-specific SpendingActivities / MintingActivities / BurningActivities; uses MultipleDelegateActivities / OtherActivities for nesting/extension; create/update/delete activities are handled by mint/spend delegates, not the data-policy itself.
- AbstractDelegateActivitiesEnum lets mint/spend delegates enforce “right delegate” generically without knowing each policy’s nested activity enum.

### CapoLifecycleActivities in Capo (DefaultCapo.hl):
- spendingDelegatedDatum: only for delegated-data spends; ensures the datum’s id matches the token in the input. Gov authority not required; relies on spend delegate for business rules.
- capoLifecycleActivity (preferred for charter updates): always requires gov authority.
- forcingNewMintDelegate / forcingNewSpendDelegate: Capo handles directly; only the targeted delegate link may change; new UUT name must match seed/purpose; token minted and present at the delegate address. No delegate involvement.
- All other lifecycle actions: Capo requires the appropriate delegate(s) per dgtRolesForLifecycleActivity and requires their CapoLifecycleActivities redeemers to match Capo’s. This is how normal lifecycle work is delegated to mint/spend.
- updatingCharter: legacy/temporary path; tries to keep most charter fields unchanged; delegate creation here is marked to be moved to capoLifecycleActivity.
- retiringRefScript: gov-gated; lets ref scripts be spent/removed/replaced.
- usingAuthority: CharterData-only admin gate; enforces governance authorization helper.

### CapoLifecycleActivities in the mint/spend delegates (BasicDelegate.hl); not used by data-policy delegates:
- Guard rails: charter context + gov authority; the delegate’s redeemer must match the Capo’s lifecycle redeemer. Role is decided by dgtRolesForLifecycleActivity (mint, spend, or both).
- CreatingDelegate: mint delegate validates minting a new delegate UUT and that the next charter data installs it; other delegates are rejected.
- queuePendingChange: mint delegate-centric. Validates queued Add/Replace for a data-policy delegate (UUT mint, ownership, idPrefix, no duplicates). Spend path is effectively disabled.
- commitPendingChanges: split duties. Spend delegate (when acting) checks the pending changes were applied to the next manifest; mint delegate (when acting) checks required burns for removed/replaced delegate tokens.
- updatingManifest: currently only “add entry” is supported; role-gated (typically spend). Ensures the new manifest entry matches the token and the remainder is unchanged. Other manifest mutations are TODO.
- removePendingChange: stub/TODO (intended for spend).
- forcingNewMintDelegate / forcingNewSpendDelegate: rejected in delegates (Capo handles these directly).

### CapoLifecycleActivity responsibility detail
- Any CapoLifecycleActivity requires charter context + gov authority; delegate redeemer must match Capo’s redeemer; role gate determined by dgtRolesForLifecycleActivity.
- CreatingDelegate: mint delegate validates UUT mint and that the next CharterData installs it; other delegates rejected.
- queuePendingChange: mint delegate path; validates add/replace for data-policy delegates (UUT mint, ownership, idPrefix match, no duplicates/replacements out of order). Spend path effectively disabled.
- commitPendingChanges: spend delegate checks pending→manifest applied; mint delegate checks required burns for removed/replaced delegate tokens.
- updatingManifest: role-gated (usually spend); currently only “add entry” supported; verifies new entry matches provided token and the rest is unchanged; other mutations TODO.
- Forcing delegates: rejected in delegates (Capo handles directly).



### Pending changes & roles
- `PendingCharterChange` queues delegate installs/replacements; drained when committing pending changes (see `PendingDelegateAction` in CapoDelegateHelpers.hl)
- `DelegateRole` enumerates gov/mint/spend/invariants, data-policy (named), other named delegates.
- `CapoLifecycleActivity` connects Capo lifecycle redeemers (delegate creation, pending-change queue/commit, forced replacements, manifest updates).
