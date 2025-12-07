# Stellar on-chain essentials

## Capo validator (leader)
- Sources: `src/Capo.ts`, `src/CapoHelpers.hl`, `src/delegation/CapoDelegateHelpers.hl`, `src/minting/CapoMinter.ts`.
- Purpose: treasury/data hub locked by Capo script; owns charter token; coordinates delegates.
- Parameters: `mph` (minting policy hash), seed txn/id, feature flags (off-chain), optional precompiled bundle.
- Core datum `CapoDatum`:
  - `CharterData` with links: `govAuthorityLink`, `mintDelegateLink`, `spendDelegateLink`, optional invariants, `otherNamedDelegates` (string→delegate link), `manifest` (see below), `pendingChanges`.
  - `ScriptReference` marker for ref-script UTxOs stored at Capo address.
- Authority token: charter token (policy = Capo mph, tn "charter"); always returned to Capo. Used as reference or spent depending on activity.
- Activities (redeemers, via bridge): `updatingCharter`, `usingAuthority`, `spendingDelegatedDatum`, plus lifecycle helpers for mint/spend/named delegates.
- Ref scripts: Capo stores ref scripts for itself/minter/delegates; `txnAttachScriptOrRefScript` prefers ref, falls back to inline script.

## Delegation pattern (UUTs)
- Unique Utility Tokens (UUTs) minted by Capo minter from a seed UTxO; names are `<purpose>-<seedHash6>`.
- Roles:
  - `govAuthority` (authority policy)
  - `mintDelegate`, `spendDelegate`
  - optional invariants (mint/spend)
  - named delegates and data policies (manifest entries)
- Minting charter seeds the `capoGov`, `mintDgt`, `spendDgt` UUTs (and others as needed) and installs links in CharterData.
- Delegate links: `RelativeDelegateLink{ uutName, delegateValidatorHash?, config bytes }`; on-chain matches UUT + optional ref script; see `src/delegation/CapoDelegateHelpers.hl`.
- Manifest entries (in CharterData) point to delegate/data-policy tokens. Those UUTs live at each delegate-script address with its `IsDelegation` datum variant (`CapoDelegateHelpers`).

## Manifest (CapoHelpers)
- `CapoManifestEntry{ entryType, tokenName, mph? }` (`src/CapoHelpers.hl`)
- `ManifestEntryType`:
  - `NamedTokenRef` (generic)
  - `DgDataPolicy{policyLink,idPrefix,refCount}` for delegated data controllers
  - `DelegateThreads{role,refCount}` thread tokens
  - `MerkleMembership` / `MerkleStateRoot` (placeholders)
- Used to locate settings/data refs and delegate thread tokens; defaults mph=Capo mph.

## Charter lifecycle
- Charter mint (with minter): consumes seed UTxO, mints charter token + delegate UUTs, writes `CharterData`, stores ref scripts.
- Charter update: spend charter UTxO with `updatingCharter` + redeemers from delegates as required; keeps charter token; can queue `pendingChanges` (delegate installs) then commit them.
- Charter ref: many flows use charter UTxO as reference input instead of spending when only reading.

## Delegate enforcement (on-chain contracts)
- Governance delegate (authority policy) validates admin actions (updates, delegate installs).
- Mint delegate validates mint/burn (except force paths for invariants/forced replacement).
- Spend delegate validates spending of delegated data and manifest changes; may chain to data-policy delegates.
- Data policy delegates (DelegatedDataContract on-chain) validate creation/update of specific record types; identified by manifest entry and UUT idPrefix.

## Common on-chain checks (CapoHelpers / delegates)
- Charter token presence/return.
- Delegate UUT presence per role.
- Validation of pending changes before activation.
- Ref script detection via `ScriptReference` datum.
- Manifest-driven lookup for settings/current records (e.g., `currentSettings` entry → settings controller).

## Cross-links
- Capo helpers and delegate helpers: `reference/essential-capo-helpers.md`
- Off-chain building: `reference/essential-stellar-offchain.md`
- Architecture overview: `reference/essential-stellar-dapp-architecture.md`
- Kickstart steps: `reference/essential-stellar-dapp-kickstart.md`

