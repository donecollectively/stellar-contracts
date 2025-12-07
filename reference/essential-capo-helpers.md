# Capo helpers essentials

Sources: `src/CapoHelpers.hl`, `src/delegation/CapoDelegateHelpers.hl`.

## Capo Helpers (CapoHelpers.hl)

You need to understand essential architecture (essential-stellar-dapp-architecture.md) and on-chain essentials (essential-stellar-onchain.md) before reading making use of these helpers.

### What it is
- On-chain helper module used by Capo/delegates to interpret CapoDatum, manifest, and delegate links.
- Provides shared enums/structs for manifest entries, pending changes, delegate roles, and utility functions.

### Helper data types and functions

CapoHelpers.hl defines the CapoDatum enum supporting various types of data stored at the Capo address, along with the structs and enum definitions supporting those data.  See essential-stellar-onchain.md for more details about these.

CapoDelegateHelpers.hl defines the structs and enum definitions supporting the delegate links and activities.  Find more information below about these.

StellarHeliosHelpers.hl defines functions and struct definitions for various purposes: `mustFindInputRedeemer` locates input redeemers for specific inputs in the transaction, `mkTv`, `tvCharter` constructing Values with Capo mph + token names, `REQT()` expressing invariant requirements (with REQTgroup(...callback), bREQTgroup(...callback), REQTgroupUnit(...callback), providing boolean/unit return values, nested function execution and implicit logging groups), and diagnostic logging (logGroupStart/End, TODO, TRACE), and other helper functions and generic data types.


### UTXO & value helpers
- `UtxoSource`, `dgd_DataSrc` classify input/ref/output provenance for delegated data.
- `outputAndDatum`, `fromCip68Wrapper`, `mustFindInputRedeemer` parse common structures.
- `mkTv`, `tvCharter` construct Values with Capo mph + token names.
- `DgTknDisposition` marks delegate token returned vs created.

### Logging & REQT utilities
- REQT/REQTgroup/bREQT annotate invariant requirements; `logGroup*` helpers for structured tracing.


-------------------------------------------------------

information below must be refined and/or deduplicated with details found in essential-stellar-dapp-architecture.md and essential-stellar-onchain.md

### CharterData & manifest
- CharterData is the root datum at the Capo address, holding delegate links + manifest.
- Manifest entries point to delegate/data-policy tokens; delegates locate and include UUTs via their authority-token helpers.
- `CapoManifestEntry{ entryType, tokenName, mph? }` — mph optional (default Capo mph).
- `ManifestEntryType`:
  - `NamedTokenRef` — semantically named UUT reference.
  - `DgDataPolicy{policyLink,idPrefix,refCount}` — delegated data policy controller tokens; idPrefix drives record-id UUT naming.  Entry name drives policy-selection for the on-chain script controlling each type of data (via its ‹Datum›.type)
  - `DelegateThreads{role,refCount}` — thread tokens per delegate role.
  - `MerkleMembership` / `MerkleStateRoot` — placeholders (no on-chain implementation yet).

### Pending changes & roles
- `PendingCharterChange` queues delegate installs/replacements; drained when committing pending changes (see `PendingDelegateAction` in CapoDelegateHelpers.hl)
- `DelegateRole` enumerates gov/mint/spend/invariants, data-policy (named), other named delegates.
- `CapoLifecycleActivity` connects Capo lifecycle redeemers (delegate creation, pending-change queue/commit, forced replacements, manifest updates).


## Capo Delegate Helpers (CapoDelegateHelpers.hl)

MOVE TO essential-stellar-onchain.md!

### Activity enums
- `DelegateLifecycleActivity`: `ReplacingMe{seed,purpose}`, `Retiring`, `ValidatingSettings`.
- `CapoLifecycleActivity`: `CreatingDelegate`, `queuePendingChange`, `removePendingChange`, `commitPendingChanges`, `forcingNewSpendDelegate`, `forcingNewMintDelegate`, `updatingManifest{ManifestActivity}`.
- `ManifestActivity`: `addingEntry`, `updatingEntry`, `retiringEntry`, `forkingThreadToken`, `burningThreadToken`.
- `PendingDelegateAction`: `Add{seed,purpose,idPrefix}`, `Remove`, `Replace{seed,purpose,idPrefix,replacesDgt}`.
- `AbstractDelegateActivitiesEnum`: abstract type for all DelegatedDatum activities, allowing the mint/spend delegate to generically support any registered data-type, enforcing that right delegate is used but not needing to deal with specifics of their activities.   See dApp architecture for more details.  

### Roles & links
- `DelegateRole` enum: MintDgt, SpendDgt, invariants, `DgDataPolicy{name}`, `OtherNamedDgt{name}`, BothMintAndSpendDgt, HandledByCapoOnly.
- struct `RelativeDelegateLink{uutName, delegateValidatorHash?, config}`:
  - `getRedeemer`, `hasDelegateInput(required?)`, `hasValidOutput(createdOrReturned)`, `validatesUpdatedSettings(required?)`.
  - Authority helpers: `tvAuthorityToken`, `acAuthorityToken` (AssetClass).
- `DelegationDetail`: capoAddr, mph, tn; authority token helpers.
- BASE delegate datum: `IsDelegation{dd}`, CIP-68 ref token variant, delegated data storage variant.

### Safety helpers
- `mustReturnValueToScript` ensures authority token returns to script.
- `unmodifiedDelegation` checks delegation datum unchanged in continuation outputs.
- `requiresNoDelegateInput` asserts absence of a delegate token input.

## Where it’s used
- Capo validator, CapoMinter, mint/spend delegates, data-policy delegates, named delegates use these helpers to:
  - Parse CharterData/manifest.
  - Enforce presence/return of delegate UUTs.
  - Coordinate lifecycle/pending-change activities.
  - Validate settings updates and delegated-data flows.

## Cross-links
- On-chain overview: `reference/essential-stellar-onchain.md`
- Off-chain flows: `reference/essential-stellar-offchain.md`
- Architecture view: `reference/essential-stellar-dapp-architecture.md`
