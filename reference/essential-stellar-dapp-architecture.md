# Stellar dapp architecture essentials

## Components
- Capo contract (treasury/data hub) with charter token + manifest.
- CapoMinter (fixed policy) minting charter + UUTs; defers policy to mint delegate.
- Delegates:
  - Gov authority policy (token-gated admin)
  - Mint delegate (validates mint/burn)
  - Spend delegate (validates spending of Capo UTxOs, delegated data)
  - Data-policy delegates (DelegatedDataContract) per record type; optional named delegates.
- Manifest: map of token references → roles/data policies/settings pointers.
- Ref scripts: Capo stores reference scripts for itself, minter, delegates to shrink txn size.
- Off-chain SDK: Capo class + delegates + txn context to assemble flows.

## Data/UTxO model
- Capo address holds: charter UTxO (inline `CharterData`), delegated-data UTxOs, ref-script UTxOs, settings UTxO, manifest-driven UTxOs.
- Authority tokens (UUTs) prove delegate control; manifest entries map type/role to tokenName (and optional mph).
- Delegated data: records stored at Capo with per-type controller; IDs derive from idPrefix + UUT naming.

## Lifecycles
- Bootstrap: choose seed UTxO → minter mints charter + delegate UUTs → writes CharterData → stores ref scripts.
- Delegate upgrade: mint new UUT, burn/retire old (unless forced), update CharterData links; may queue/commit pending changes.
- Data policy install: queue DgDataPolicy manifest entry (pending change) → commit → manifest points to controller token/ref.
- Settings: delegated-data record referenced via manifest `currentSettings`; controllers validate updates.

## Transaction patterns
- Reference vs spend: charter often referenced; spend when mutating CharterData or committing changes.
- Authority aggregation: include charter token + relevant delegate UUTs + ref scripts; use delegate activities for redeemers.
- Addl txns: ref-script creation, delegate install, pending-change commit can be separate txns queued in context.

## Flows (high level)
- Mint charter: CapoMinter `mintingCharter` + delegate UUTs; Capo keeps charter, sets links, stores refs.
- Mint/burn tokens: go through mint delegate (`mintWithDelegateAuthorizing`); invariants/force paths bypass mint delegate with Capo authority.
- Create delegated record: data controller mint activity, spend delegate allows creation, manifest ties idPrefix/tokenName.
- Update delegated record: spend delegate activity + controller update activity; ensures correct id/token and policies.
- Install/replace data policy: queue pending change (new controller link, idPrefix); commit to manifest; optional burn old token.

## Cross-links
- On-chain details: `reference/essential-stellar-onchain.md`
- Off-chain flows: `reference/essential-stellar-offchain.md`
- Capo helper structs: `reference/essential-capo-helpers.md`
- Kickstart steps: `reference/essential-stellar-dapp-kickstart.md`

