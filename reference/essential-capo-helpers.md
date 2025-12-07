# Capo helpers essentials

## Capo Helpers
### What it is
- On-chain helper module (`CapoHelpers.hl`) used by Capo/delegates to interpret CapoDatum, manifest, and delegate links.
- Provides shared enums/structs for manifest entries, pending changes, delegate roles, and activity helpers.

### CharterData
- The "root datum" stored at the Capo address, containing the delegate links and manifest, and other details required for managing the current state of a single family of contract scripts.
### Manifest data
- Manifest entries (in CharterData) point to delegate/data-policy tokens.  Each delegate class (DelegatedDataContract/ ContractBasedDelegate/StellarDelegate subclass or even AnyAddressAuthorityPolicy) can locate and include these UUTs in its txn as needed via txnGrantAuthority().  
- `CapoManifestEntry{ entryType, tokenName, mph? }` — mph optional (default=Capo mph). Validates tokenName present, mph currently default-only.
- `ManifestEntryType`:
  - `NamedTokenRef` — generic token ref, indicating a semantically named UUT whose identity used to dereference the corresponding token and its data.
  - `DgDataPolicy{policyLink,idPrefix,refCount}` — delegated data policy controller tokens; idPrefix governs record-id UUT naming.
  - `DelegateThreads{role,refCount}` — thread tokens per delegate role.
  - `MerkleMembership` / `MerkleStateRoot` — placeholder tree roots (no implementation yet).

### Pending changes & delegate roles
- `PendingCharterChange` encapsulates queued delegate installs/replacements; processed and emptied when committing pending changes.  This is the mechanism for queueing and committing pending changes to the CharterData.
- `DelegateRole` covers core roles (gov, mint, spend) plus named/data-policy roles referenced by manifest.  See DelegateHelpers below.
- `CapoLifecycleActivity` / `AbstractDelegateActivitiesEnum` glue Capo to delegate activities for mint/spend/update flows.

### UTXO helpers
- `UtxoSource` enum (Input vs RefInput) for provenance when resolving manifest-linked UTxOs.
- `dgd_DataSrc` discriminates datum location for delegated-data (input/output/both).
- `outputAndDatum`, `fromCip68Wrapper`, `mustFindInputRedeemer` surface common parsing patterns.

### Tokens & dispositions
- `DgTknDisposition` marks how delegated-data tokens are used (held, burned, returned).
- `mkTv`, `tvCharter` helpers for constructing Value with Capo mph + token names.

### Logging & REQT utilities
- REQT/REQTgroup/bREQT helpers annotate invariants inside on-chain code.
- `logGroup*` helpers for structured tracing during validation.

### Where it’s used
- Any DelegatedData policy can use these helpers for policy enforcement, convenience and consistency.  In particular:
   - ‹Sample the Reqts*.hl for specific cases› 

- Capo validator, mint delegate, spend delegate, and data-policy delegates import these helpers to:
  - Parse CapoDatum manifest entries.
  - Check delegate presence via UUTs and manifest.
  - Manage pending charter changes.
  - Enforce consistent token/value handling.

### Capo Delegate Helpers



## Cross-links
- Capo on-chain overview: `reference/essential-stellar-onchain.md`
- Off-chain flows and txn building: `reference/essential-stellar-offchain.md`
- Architecture view: `reference/essential-stellar-dapp-architecture.md`

