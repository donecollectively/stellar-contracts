# Stellar on-chain essentials

Readers should understand essential architecture and transaction patterns (essential-stellar-dapp-architecture.md) before reading this section.  They should also understand cardano essentials in `essential-cardano.md`, and the lifecycle duties in `reference/essential-capo-lifecycle.md`.

You might also need to look at internals in `reference/essential-stellar-internals.md` for context on what the onchain Capo and related libraries do to be good collaborators with your onchain data-policy delegates.  

You will also need `reference/essential-helios-lang.md` and `reference/essential-helios-builtins.md` to become competent with the Helios language and builtins.  IT IS ESSENTIAL THAT YOU UNDERSTAND THESE BEFORE WRITING ONCHAIN HELIOS CODE or answering questions about it.

You may sometimes need to inspect the onchain library code in stellar-contracts `src/**/*.hl` files to understand the implementation details of the onchain Capo and related libraries.

All activities and datums are defined in Helios code, either in a library file or in an application-specific file.  Those are `.hl` files, not Typescript/javascript.

## Capo validator (leader)
- Sources: `src/Capo.ts`, `src/CapoHelpers.hl`, `src/delegation/CapoDelegateHelpers.hl`, `src/minting/CapoMinter.ts`.
- Purpose: treasury/data hub locked by Capo script; owns charter token; coordinates delegates.
- Parameters: `mph` (minting policy hash), seed txn/id, feature flags (off-chain), optional precompiled bundle.
- Core datum `CapoDatum`:
  - `CharterData` with links: `govAuthorityLink`, `mintDelegateLink`, `spendDelegateLink`, optional invariants, `otherNamedDelegates` (string→delegate link), `manifest` (see Manifest section), `pendingChanges`.
  - `ScriptReference` marker for ref-script UTxOs stored at Capo address.
- Authority token: charter token (policy = Capo mph, tn "charter"); always returned to Capo. Used as reference or spent depending on activity.
- Activities (redeemers): `updatingCharter`, `usingAuthority`, `spendingDelegatedDatum`, plus lifecycle helpers for mint/spend/named delegates.
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

## Helper modules (CapoHelpers / CapoDelegateHelpers / StellarHeliosHelpers)
- CapoHelpers: on-chain helpers to interpret CapoDatum, manifest, delegate links; shared enums/structs for manifest entries, pending changes, delegate roles.
- CapoDelegateHelpers: delegate-link utilities and lifecycle/authority helpers used by Capo, minter, mint/spend delegates, data-policy delegates, and named delegates.
- StellarHeliosHelpers: generic utilities for redeemers, Values, CIP-68 map unwrapping, logging/requirements, and time helpers.

### UTxO & value helpers
- `UtxoSource`, `dgd_DataSrc` classify delegated-data input/ref/output provenance.
- `mustFindInputRedeemer`, `getOutputWithValue` parse common tx structures.
- `mkTv`, `tvCharter` construct Values with Capo mph + token names; `DgTknDisposition` marks delegate token returned vs created.

### Logging & REQT utilities
- `logGroupStart` / `logGroupEnd` mark logging groups; `logGroup` / `logGroupUnit` wrap callbacks with grouped output; `TRACE`, `TODO` emit diagnostics.
- `REQT` asserts requirements; `bREQT` returns Bool after asserting.
- `REQTgroupStart` opens a requirement-labelled group; `assertREQTgroup` / `bREQTgroup` execute callbacks with grouped assertions; generic `REQTgroup[T]` wraps any callback and returns its result; `REQTgroupUnit` is the unit-return variant.

### Roles, links, and safety helpers
- `RelativeDelegateLink` authority helpers: `hasDelegateInput`, `hasValidOutput`, `validatesUpdatedSettings`, `tvAuthorityToken`, `acAuthorityToken`.
- Safety helpers: `unmodifiedDelegation`, `requiresNoDelegateInput`.
- Delegate roles/enums (DelegateRole, CapoLifecycleActivity, DelegateLifecycleActivity, ManifestActivity, PendingDelegateAction, AbstractDelegateActivitiesEnum) are defined here; lifecycle intent/details are expanded in `reference/essential-capo-lifecycle.md`.

## Core on-chain types (highlights)
- Enum `CapoDatum` (`CapoHelpers.hl`):
  - `CharterData{spendDelegateLink, spendInvariants, otherNamedDelegates, mintDelegateLink, mintInvariants, govAuthorityLink, manifest:Map[String]CapoManifestEntry, pendingChanges:[]PendingCharterChange}`
  - `ScriptReference`
  - `DelegatedData{data:Map[String]Data, version:Int, otherDetails:Data}` — abstract CIP-68 style; expects `@id` and `tpe` entries.
  - Method `countUpdatedThings(oldDatum)` → Int change count (delegates/manifest deltas).
- Struct `CapoManifestEntry{entryType:ManifestEntryType, tokenName:ByteArray, mph:Option[MintingPolicyHash]}` — manifest rows.
- Enum `PendingCharterChange` (`CapoDelegateHelpers.hl`): `delegateChange{PendingDelegateChange}` | `otherManifestChange{ManifestActivity, remainingDelegateValidations}` — queued updates.
- Struct `RelativeDelegateLink{uutName, delegateValidatorHash?, config:ByteArray}`:
  - `hasDelegateInput(inputs,mph,required?)` → Option[TxInput]; `hasValidOutput(mph,required?,createdOrReturned?)` → Bool; `validatesUpdatedSettings(inputs,mph,required?)` → Option[Bool]; authority helpers `tvAuthorityToken`/`acAuthorityToken`.
- Enum `DelegateRole` (gov/mint/spend/invariants/data/named) and lifecycle enums `CapoLifecycleActivity`, `DelegateLifecycleActivity`, `ManifestActivity`, `PendingDelegateAction`, `AbstractDelegateActivitiesEnum` (generic delegated-data activities).

## Datum enums defined by various scripts   

- Delegate Policies share their Datum type, using it both for the Capo-stored data (in capoStoredData variant) and for the policy-script IsDelegation datum (stored at the delegate's own script address).  This creates general alignment between the data structures that can be handled by that delegate.  The Capo datum also aligns with that structure, to the extent that capoStoredData is defined at the same variant-index as the delegate's capoStoredData variant.
    - See essential-stellar-dapp-architecture.md for more details about the data/UTxO model.
- Capo Datum defines only three Datum variants: CharterData, ScriptReference, and DelegatedData (#2; same as delegate's capoStoredData variant: abstract Map[String]Data ).  All the richness that can be expressed in data stored in the Capo address is found in data-policy delegates' datums, where their capoStoredData(#2) has an application-specific data type

All activities and datums are defined in Helios code, either in a library file or in an application-specific file.

## Activity enums defined by Delegate scripts

- BasicDelegate (used as base for mint/spend and delegated-data delegates):
    - CapoLifecycleActivities: ??? need to review and clarify how/whether this is used in basic delegate
    - DelegateLifecycleActivity (for all delegate-creation/replacement/retirement activities) - BasicDelegate.hl responds to lifecycle activites for ALL types of delegates; specializations can't override the behavior.
- BasicDelegate (in minting/spend delegates): 
    - DelegateLifecycleActivity (see above)
    - SpendingActivities: not used (only in dgData policies)
    - MintingActivities: not used (only in dgData policies)
    - BurningActivities: not used (only in dgData policies)
    - CreatingDelegatedData(seed, dataType): indicates the mint-delegate is validating creation of a dgData record (delegates authority to the dgDataPolicy to validate one of its MintingActivities)
    - UpdatingDelegatedData (dataType, recId): indicates the spend-delegate is validating update of a dgData record (delegates authority to the dgDataPolicy to validate one of its SpendingActivities)
    - DeletingDelegatedData (dataType, recId): indicates the mint-delegate is validating deletion of a dgData record (delegates authority to the dgDataPolicy to validate one of its BurningActivities)
    - MultipleDelegateActivities (activities: []Data): the list of nested activities indicates multiple DelegateActivity (self-referencing enum); all the nested activities are enforced recursively (to one level only).
    - OtherActivities (activity: Data): not used
- DelegatedDataContract (): AbstractDelegateActivitiesEnum (for all delegated-data activities)
    - DelegateLifecycleActivity (see above)
    - SpendingActivities (nested enum): policy-specific activity types
    - MintingActivities (nested enum): policy-specific activity types
    - BurningActivities (nested enum): policy-specific activity types
    - CreatingDelegatedData: not used (only by mint-delegates)
    - UpdatingDelegatedData: not used (only by spend-delegates)
    - DeletingDelegatedData: not used (only by mint-delegates)
    - MultipleDelegateActivities (activities: []Data): ??? need to review and clarify how/whether dgData policies use this.
    - OtherActivities (activity: Data): policy-specific activity types

### CapoLifecycleActivity summary (responsibility + intent)

Executes upgradeable policies governing the Capo's charter.  Enforced by the CURRENT spend delegate.

Common gate: Any CapoLifecycleActivity requires charter context + gov authority; the delegate’s redeemer must match the Capo’s charter redeemer. Role is determined by dgtRolesForLifecycleActivity, so the script enforces you’re acting as the right delegate before handling specifics.

 - CreatingDelegate: Mint delegate validates minting a new delegate UUT and that the next charter data contains the matching delegate link/output. Spend/other delegates are rejected here.
 - queuePendingChange: Mint delegate owns the path (spend path effectively disabled). It checks the queued Add/Replace for a data-policy delegate: validates UUT mint, ownership, idPrefix match, duplicate prevention, and replacement token matching. Only DelegateRole::DgDataPolicy is supported here.
 - commitPendingChanges: Split duties. Spend delegate (when acting) walks pending changes vs next manifest to ensure queued adds/replaces/removes are reflected. Mint delegate (when acting) ensures required burns for removed/replaced delegate tokens are present and nothing extra is burned.
 - updatingManifest: Role-gated (typically spend). Ensures only manifest updates happen; currently only supports addingEntry, verifying the new entry matches the provided token and the remainder is unchanged (other cases are TODO). Mint requirement appears only for forkingThreadToken (TODO).
 - removePendingChange: Stub/TODO; intended for spend delegate to undo queued changes, but currently errors.
 - forcingNewMintDelegate / forcingNewSpendDelegate: Rejected in this delegate; marked as Capo-only escape hatches.  Any CapoLifecycleActivity tagged HandledByCapoOnly (per dgtRolesForLifecycleActivity) is rejected up front, so non-applicable delegates can’t execute those paths.


## On-chain utility functions (StellarHeliosHelpers.hl)
- Value helpers: `mkTv(mph, tn|tnBytes, count)`; `tvCharter(mph)`.
- Redeemers: `mustFindInputRedeemer(txInput)` to fetch redeemer for a specific input.
- Datum helpers: `fromCip68Wrapper(data)` unwraps CIP-68 map; `outputAndDatum{output, datum, rawData}` struct; `getOutputWithValue`, `getOutputForInput`.
- Logging/requirements: `REQT`, `bREQT`, `REQTgroup*`, `logGroup*`, `TRACE`, `TODO`.
- Time: `getTimeRange`, `startsAfter/Before`, `now`, `startsExactlyAt`, `endsExactlyAt`.
- Token return checks: `returnsValueToScript(value)` ensures value returned to same script.


## Helper data types and functions

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

### Delegate enforcement and other helpers 
- Use `CapoDatum::DelegatedData` shape (`@id`, `tpe` keys) and manifest entries (`CapoManifestEntry`) to bind record type → data-policy.
- Enforce authority: require delegate UUT via `RelativeDelegateLink.hasDelegateInput/hasValidOutput`, `mustReturnValueToScript` (CapoDelegateHelpers.hl), or prefer the higher-level `requiresMintDelegateInput()`/`requiresSpendDelegateInput()` helpers in CapoCtx.
  - struct `CapoCtx` helpers: 
      - `mkTv()`, `mkAc()` to create Values and AssetClasses using the capo's mph and String or ByteArray inputs
      - `getCharterRedeemer()` fetches the CapoActivity redeemer for the charter input (uses `mustFindInputRedeemer`)
      - `requiresGovAuthority()` to enforce governance approval, 
      - In data-policy delegates, use `updatingDgData(recId/recIdBytes)` ,` creatingDgData(recId/recIdBytes)`, and `referencingDgDatum(recId/recIdBytes)` to get `DgDataDetails` for specific record activities.
      - `requiresDgDataPolicyInput()`, `requiresMintDelegateInput()`,`requiresSpendDelegateInput()` return `DelegateInput` structs 
      - `getManifestedData(manifestKey)` to dereference data (as found in refInput or which: (another UtxoSource)) from a semantic name with manifest lookup; returns `DgDataDetails` struct
      - `findManifestTokenName(key, required?)` and `getSettingsId(required?)` resolve named tokens from the manifest without dereferencing them.
 - struct `DgDataDetails` helpers:
    - `uutValue()` for the Value of the record-id token.  
    - `abstractInput()` and `abstractOutput()` to get the data from the input and output, respectively. 
    - `inputData()` and `outputData()` to get cast-read Data from the input and output, respectively (use ‹TargetType›`::from_data()` to extract & validate).  
    - `spendingActivity()` and `burningActivity()` to assert and return the abstract activity (Data) redeemer from the input.
    - Used by data-policy delegates: on update, read `input()` (TxInput)/`output()` (TxOutput) or their datums via `abstractInput/abstractOutput` (for AnyData; mainly for infrastructure) or `inputData/outputData` (use ‹appDataType›::from_data() to extract) for policy enforcement; on record mint, use `creatingDgData` -> `outputData` -> `‹appDataType›::from_data(...)` to inspect the newly created datum.
- struct `DelegateInput` (link, role, idPrefix, input, mph) wraps a possible delegate UUT input; helpers:
    - `genericDelegateActivityAsData()` and `genericDelegateActivity()` to read the delegate redeemer (via mustFindInputRedeemer), letting callers trigger/inspect the delegate’s activity when its token is included.  Good for cross-script validation of the activities being performed by another delegate.
    - `withSpendingActivity()` and `withMintingActivity()` - chained methods asserting that the delegate is performing a spending or minting activity, respectively
    -  `updatingManifest()`, `withUniqueSeededMintingActivity()`, `withUniqueDDSpendingActivity()`, `requiresValidOutput()`, `delegateUnchanged()` - chained methods used in mint/spend and data-policy delegates to validate nested activities (details in `reference/essential-stellar-internals.md`).

- Locate current settings: manifest named entry (e.g., `currentSettings`) via Capo off-chain helpers; on-chain, inspect `CapoDatum::CharterData.manifest`.
- Reference charter: include charter token (input or ref) and read `CharterData` to discover links/manifest; use `ScriptReference` UTxOs for ref scripts.
- Validate delegated data IO: `fromCip68Wrapper` to get abstract data, `mustFindInputRedeemer` to pair inputs/outputs with datums and redeemers.

Most helpers implicitly throw an error, making the transaction invalid, if they can't do as requested. Some have a required:Bool parameter defaulting to true, if they support optional operations, they usually return an Option[] type or a struct with an Option[] field, whose helper methods throw when it's None.


## Charter lifecycle
- Charter mint (with minter): consumes seed UTxO, mints charter token + delegate UUTs, writes `CharterData`, stores ref scripts.
- Charter update: spend charter UTxO with `updatingCharter` + redeemers from delegates as required; keeps charter token; can queue `pendingChanges` (delegate installs) then commit them.
- Charter ref: many flows use charter UTxO as reference input instead of spending when only reading.

See essential-capo-lifecycle.md for more details about the charter lifecycle and responsibilities.


## Delegate enforcement (on-chain contracts)
- Governance delegate (authority policy) validates admin actions (updates, delegate installs).
- Mint delegate validates mint/burn (except force paths for invariants/forced replacement).
- Spend delegate validates spending of delegated data and manifest changes; may chain to data-policy delegates.
- Data-policy delegates (DelegatedDataContract on-chain) validate creation/update of specific record types; identified by manifest entry and UUT idPrefix. Implement policy-specific activity handling in `additionalDelegateValidation`; see `reference/essential-stellar-internals.md` for the full helper patterns and `reference/essential-stellar-dapp-architecture.md` for high-level guidance. The basic delegate already enforces CIP-68 invariants for `@id` and `tpe` (e.g., `CapoCtx.mustOutputDelegatedData`), so policies and tests should not waste effort re-checking or mutating those fields—focus on your domain fields and value/authority rules instead.

## Common on-chain checks (CapoHelpers / delegates)
- Charter token presence/return.
- Delegate UUT presence per role.
- Validation of pending changes before activation.
- Ref script detection via `ScriptReference` datum.
- Manifest-driven lookup for settings/current records (e.g., `currentSettings` entry → settings controller).

## Cross-links
- Off-chain building: `reference/essential-stellar-offchain.md`
- Architecture overview: `reference/essential-stellar-dapp-architecture.md`
- Kickstart steps: `reference/essential-stellar-dapp-kickstart.md`

