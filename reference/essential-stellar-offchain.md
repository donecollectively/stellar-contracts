# Stellar off-chain essentials

## MUST READ: Context and Dependencies

Before studying this document, you should understand cardano essentials in `essential-cardano.md`, and the overall architecture and transaction patterns in `reference/essential-stellar-dapp-architecture.md`, and the lifecycle duties in `reference/essential-capo-lifecycle.md`.

Use this as a map; you should also understand lifecycle duties in `reference/essential-capo-lifecycle.md`.  You may sometimes need `reference/essential-helios-api.md` for more details on the Helios API, but you're more likely to need context from kickstart guide `reference/essential-stellar-dapp-kickstart.md`, or stellar-contracts `docs/` contents, or to reference the source code in StellarTxnContext.ts, DelegatedDataContract.ts, or its parent classes.

If you need to do test automation, you should also read `reference/essential-stellar-testing.md`.

## On-chain vs. Off-chain Roles

-   **On-chain (Validator):** On-chain policies only **validate** submitted transactions against a set of rules. They are the source of truth and security. They cannot construct or modify transactions.
-   **Off-chain (Constructor):** The off-chain code detailed here **constructs** transactions. It is responsible for building a transaction that satisfies the on-chain policy.

**Summary for Agent:** Your role is off-chain. You will use the classes and methods in this document to build transactions. The on-chain code will then validate your work. Success depends on building a valid transaction.

## Core classes
- `Capo` (extends StellarContract): orchestrates charter mint/update, delegates, manifest, delegated data, ref scripts.  `src/Capo.ts`.
- `CapoMinter`: fixed minting policy script; mints charter token + UUTs; defers policy to mint delegate except forced admin paths.  `src/minting/CapoMinter.ts`.
- `ContractBasedDelegate`: base for script-backed delegate controllers (mint/spend/data/named). Provides bundle wiring, activity/datum accessors, authority token helpers.  `src/delegation/ContractBasedDelegate.ts`.
- `DelegatedDataContract<T>`: base for data-policy controllers; wraps create/update flows for records stored at Capo; exposes `recordTypeName`, `idPrefix`, `exampleData`, activities for create/update.  `src/delegation/DelegatedDataContract.ts`.
- `StellarTxnContext`: tx builder + typed state (seedUtxo, uuts, charterRef, settingsRef, addlTxns). Provides a facade for the underlying Helios TxBuilder, and a typed state container for the transaction context.  `src/StellarTxnContext.ts`.


## Token + authority model
- Policy: Capo mph (from minter). Charter token (`charter`) proves contract identity; various UUTs prove authority per role (gov/mint/spend/named/data-policy).
- UUT naming: `<purpose>-<12-char-hex>` derived from seed UTxO; managed via `txnWillMintUuts`/`txnMintingUuts`.
- Manifest entries (in CharterData) point to delegate/data-policy tokens.  Each delegate class (DelegatedDataContract/ ContractBasedDelegate/StellarDelegate subclass or even AnyAddressAuthorityPolicy) can locate and include these UUTs in its txn as needed via txnGrantAuthority().  
    - Internally, DelegateMustFindAuthorityToken and DelegateAddsAuthorityToken and txnReceiveAuthorityToken handle the UTxO discovery and inclusion,  forming the protocol for authority token handling.
    - The authority token is always returned to its policy address.

## Key transaction flows (day-to-day operations)
### Capo:
  - `get mph`: Returns the minting policy hash for the Capo.  This is used by the CapoProvider to display the minting policy hash in the UI.
  - `delegateRoles`: Defines the delegate roles for the dApp.  Every dApp should define its own delegate roles, and typically will use the basicDelegateRoles() helper to access the default mint/spend/gov delegates.
  - `findDelegatedDataUtxos`: Capo's helper method for finding delegated data UTxOs via manifest/id.  It can be used by the controller classes to locate the UTxOs for their records.
  - `findScriptReferences`: Capo's helper method for finding ref scripts via validator hash.  It is used by the controller classes to locate the ref scripts for their records.
  - `findCapoUtxos`: Capo's helper method for finding all UTxOs at the Capo address, including the charter and other utxos.
   - `getDgDataController`: Capo's helper method for finding the delegated data controller for a given typeName.  It is used by the controller classes, other infrastructure components, and application code to locate the controller for their records.
   - `getMintDelegate`: Capo's helper method for finding the mint delegate.  Uncommonly needed by application code.
   - `txnAddGovAuthority`: Adds the gov authority token to a transaction, using the gov delegate activity to authorize the addition.  SHOULD be used when performing any admin/super-user activities.
   - `findSettingsInfo`: Finds the current settings info for the Capo, including the current settings record and the underlying `data` and possible application-layer `dataWrapped` object.  Not every dApp has to have settings, but an dApp can, with its own data structure for the settings.


### MUST READ: Delegated data controllers:
  - `mkTxnCreateRecord`: Creates a new record at the Capo, using the spend delegate activity to authorize the creation.  Implemented by the base class DelegatedDataContract.  
     - Specific subclasses may define more specific mkTxn* methods for creating their records for specific use-cases.
     - The basic mkTxnCreateRecord() and mkTxnUpdateRecord() methods can also be fed with specific activity objects when their basic `DgDataCreationOptions<TLike>` are good for the use-case at hand.
  - `mkTxnUpdateRecord`: Updates an existing record at the Capo, using the spend delegate activity to authorize the update.  Implemented by the base class DelegatedDataContract.  
     - Specific subclasses may define more specific mkTxn* methods for updating their records for specific use-cases.
     - The basic mkTxnUpdateRecord() method can also be fed with specific activity objects when its basic `DgDataUpdateOptions<TLike>` are good for the use-case at hand.

  - Controllers provide basic mkTxnCreateRecord() and mkTxnUpdateRecord() methods that SHOULD be used by application-specific transaction-building functions that provide developer-friendly interfaces closely fit to application use-cases.
  - Controllers MAY additionally provide use-case-specific mkTxn* methods that are more efficient or interface-optimized for the specific use-case.
  - All `mkTxn*` methods return a `StellarTxnContext` object, and it MUST be submitted, otherwise it's just a possible transaction, not an executed transaction.  

#### MUST READ: Data/Activity type Bridge

Each delegated data controller comes with a .typeInfo.d.ts and a .bridge.ts, which are generated by the Stellar Contracts rollup plugin.  They are used implicitly (and sometimes explicitly) for transforming on-chain data into well-typed data for off-chain use, and for encoding off-chain data (permissive or strict variants) into a canonical on-chain form for submission in transaction data.

Of special interest to dApps are:
 - Activity bridge for accessing the ‹controller›.activities.`MintingActivities`.* type and similarly, its `SpendingActivities` and `BurningActivities` for each different policy.
 - The functionality of the data bridge (see below)
 - Conventions for representing certain onchain types as typescript types.

##### MUST READ: Conventions for off-chain representation of onchain types

The readable data-types always use their "Ergo" forms for enums and structs (with primitive data using strict representation), and their "TLike" or permissive forms for write.

 - onchain Option[T] is `undefined | ‹Ergo-T›` for read, or `undefined | ‹TLike›` for write.  the key is required and `undefined` is required (null not allowed) for None.
 - onchain Int is `bigint` for read or `number | bigint` for write.
 - onchain String is `string` off-chain (read/write).
 - onchain ByteArray is `number[]` for read, and `number[] | string` for write (but note that a string value has to be hex-encoded binary data, so its utility is constrained)
 - onchain List[T] is `List<T>` for primitives and List<‹ErgoT›> for enums/structs for reading, and List<TLike> for primitives, enums and structs for writing.
 - onchain Map[K,V] is unknown. If you need to know about this, please STOP processing and instigate a separate research thread to fix this TODO:ce2esg3cmf
 - onchain Boolean is `boolean`.
 - onchain Real is `number`.
 - onchain Timestamp is `Date` for read, and unknown for write.  If you need to know about this, please STOP processing so we can fix TODO:k5t0x9an76.
 - onchain Value uses the offchain Value class (create with the helios off-chain  `makeValue()` function)
 - onchain enum (e.g. SomeEnum) are mapped to ErgoSomeEnum for read and SomeEnumLike for writing.  The Ergo types for these are a single flat type allowing any of the enum variants and not requiring any of them.  However, in practice there will ALWAYS be exactly one of the variant keys in the ErgoSomeEnum.  `keyof ErgoSomeEnum` gives the allowable variants, and `knownVariant = Object.keys(someEnumValue)[0]; someEnumValue[knownVariant]!` will always be defined.
   - nested fields, when present in an enum variant, are always encoded in one of two ways.  When there is a single nested field of type T, `someEnumValue[knownVariant]` will be type T (TLike, for write).  When there are multiple nested fields of various types, `someEnumValue[knownVariant]` will have type `{[k:string]: ... nested type}` including each field (T and TLike, respectively).
 - onchain struct (e.g. SomeStruct) types are mapped to object types with `[k:string]: ...nested type` including each field's type, with type names `ErgoSomeStruct` and `SomeStructLike` for reading and writing respectively.

##### Low-level bridge details
 
For instance, a DriverPolicy will generate a DriverPolicyDataBridge, which comes with this snippet of documentation:
 ``` 
 * This class doesn't need to be used directly.  Its methods are available through the ***controllers's methods***:
 *  - `get mkDatum` - returns the datum-building bridge for the contract's datum type
 *  - `get activity` - returns an activity-building bridge for the contract's activity type
 *  - `get reader` - (advanced) returns a data-reader bridge for parsing CBOR/UPLC-encoded data of specific types
 *  - `get onchain` - (advanced) returns a data-encoding bridge for types defined in the contract's script
 * The advanced methods are not typically needed - mkDatum and activity should normally provide all the
 * type-safe data-encoding needed for the contract.  For reading on-chain data, the Capo's `findDelegatedDataUtxos()` 
 * method is the normal way to locate and decode on-chain data without needing to explicitly use the data-bridge helper classes.
```

Note that the `mkDatum()` method is not typically needed when the mkTxn() helpers accept DataLike objects directly for writing on-chain data into transactions.

## Key flows (uncommon lifecycle activities)
- Charter bootstrap: `mkTxnMintCharterToken` builds seed→charter mint tx + ref scripts (Capo, minter, mint delegate); sets CharterData with delegate links/manifest (one-time per Capo).  The CapoProvider provides UI with a button to trigger this flow.  dApps need to capture the deployment details, store them in their code repository, and build their dAPI package to get pre-compiled minter, Capo and mint/spend delegates.  This package is then used by their UI to create and validate transaction before submitting them onchain.
    - `mkAdditionalTxnsForCharter`: Capo's hook for adding dApp-specific additional transactions to the charter creation process.  It is called during the creation of the charter transaction.  The provided transaction context has state.charterData in case it's needed.  This method should use {@link StellarTxnContext.includeAddlTxn} to add transactions to the context.  No-op by default.
- Charter update: `txnUpdateCharterUtxo`/`mkTxnUpdateCharter` spends charter with `updatingCharter`, returns charter token to Capo address, updates links/manifest/pendingChanges (used by admin flows like delegate install/settings/policy changes).  `mkTxnUpgradeIfNeeded` is used by the CharterStatus component to check for needed upgrades and trigger the upgrade transactions.

### Capo: Installing/Replacing a Delegate policy
  - Mint/spend delegate: `mkTxnUpdatingMintDelegate` / `mkTxnUpdatingSpendDelegate` (normal or forced), burns old UUT unless forced, updates CharterData link.
  - `mkTxnAddingMintInvariant` and `mkTxnAddingSpendInvariant` are not yet well supported, but are planned for future releases.
  - Data policy/named delegate: `mkTxnAddingNamedDelegate`, `mkTxnQueuingDelegateChange` + `mkTxnCommittingPendingChanges` (queue/commit pattern for manifest DgDataPolicy entries).  DEPRECATED; use DelegatedDataContract subclasses instead. 
  - DelegatedDataContract: 
      - `setupCapoPolicy` - triggered automatically by the upgrade sequence, it 
     -Capo's `mkTxnInstallingPolicyDelegate`, `mkTxnAddManifestEntry`, `mkTxnQueuingDelegateChange`, `mkTxnCommittingPendingChanges` are used to install/update/queue/commit data-policy delegates.  

  - commitPendingChangesIfNeeded
- Delegated data:
  - Settings: delegated-data type referenced by manifest `currentSettings`.
- Ref scripts: `mkTxnMkAddlRefScriptTxn` stores ref scripts at Capo; `txnAttachScriptOrRefScript` prefers ref, falls back to using inline (but this will usually fail due to transaction size limits).

## Helpers & patterns
- `txcWithSeedUtxo` / `txnMustGetSeedUtxo`: select seed input for UUT minting.
- `uutsValue`, `mkUutValuesEntries`: construct Value for delegate tokens.
- `findCharterData`, `findSettingsInfo`, `findDelegatedDataUtxos`: fetch current datum/records.
- `txnAddGovAuthority`, `txnMustUseSpendDelegate`: add delegate authority tokens/redeemers.
- `mkOnchainRelativeDelegateLink` / `extractDelegateLinkDetails`: encode delegate link from configured delegate.
- Pending changes: queue delegate installs in CharterData `pendingChanges`, then `commitPendingChangesIfNeeded` to activate.
- Addl txns: `includeAddlTxn` lets flows emit companion txns (e.g., ref-script creation, charter state transitions, or anything else) executed after the main tx is submitted.  Transactions are submitted in batch, with in-app UI supporting people to view and submit the batch.

## Activities (off-chain handles)
- Capo exposes `activity` (via bridge) for `usingAuthority`, `updatingCharter`, delegate lifecycle helpers.  Use of these activities are typically taken care of by other methods in the Capo calss.
- Minter exposes `activityMintingCharter`, `mintWithDelegateAuthorizing`, `addingMintInvariant`, `addingSpendInvariant`, force replacements.
- DelegatedDataContract exposes `activityCreatingRecord`/`UpdatingRecord` per controller (e.g., ReqtsController), and each controller class may have other activities for creating or updating its records for specific use-cases.  `mkTxn*` methods in the controller class commonly are used for triggering these activities, while providing purpose-specific interface ("dAPI") that applications can trigger in the equivalent user-facing scenarios.  The basic mkTxnCreateRecord() and mkTxnUpdateRecord() methods can also be fed with specific activity objects when their basic `DgDataCreationOptions<TLike>` are good for the use-case at hand.

## Data Management Lifecycle

## Basic tx building patterns
### Typical tx build (general pattern)
1) Start `StellarTxnContext`. ‹capo›.`mkTcx()` or ‹delegate›.`mkTcx()` or ‹data-controller›.`mkTcx()`
2) `tcxWithSeedUtxo` if minting UUTs.
3) Ensure refs: `tcxWithCharterRef`, `tcxWithSettingsRef` (when needed).
4) Add authority tokens: 
  4a. `txnAddGovAuthority` (only for admin/super-user activities)
  4b. internal calls typically take care of `mintDelegate.txnGrantAuthority`, `spendDelegate.txnGrantAuthority`, data-controller `txnGrantAuthority`.
5) Add inputs/outputs (charter, data UTxOs) with appropriate redeemers.
6) Add mints/burns via minter (`txnMintingUuts` or `txnMintWithDelegateAuthorizing`).
7) Attach scripts via ref or inline.
8) Include addl txns (ref scripts, policy install) as needed.

### Transaction-Building for delegated data records
1) Start `StellarTxnContext`. ‹data-controller›.`mkTcx()`
2. ‹data-controller›.`mkTxnCreateRecord()` or ‹data-controller›.`mkTxnUpdateRecord()`
3. Submit the txn:
```typescript
            // optional: pre-register the transaction with the batcher to ensure it appears in the UI
            // immediately, even while it's being built.
            const txBatcher = this.capo.setup.txBatcher;
            await txBatcher.current.$addTxns([
                {
                    description: txnDescription,
                    tcx: tcx,
                    id: tcx.id,
                    depth: 0,
                    moreInfo: "Saving record...",
                },
            ]);

            // essential: build and queue the transaction with the batcher.  This ensures that any chained transactions triggered by the main tx are also queued for submission.
            await tcx.buildAndQueueAll({
                onSubmitted: (txd) => {
                    this.provider?.updateStatus?.(
                        `The update will take a few moments before it's confirmed`,
                        {
                            developerGuidance: "display the message so user can have patience",
                            clearAfter: 3000,
                        },
                        "// user: be patient"
                    );
                    
                },
            });
```
Note that the UI-provided form manager does this sequence itself, so application developers may often be able to meet their needs without needing to implement this pattern directly.

## UI Support
- The `CapoDAppProvider` component provides a React context for the Capo instance, and a portal for the tx batch UI.
- The `TxBatchUI` component provides a UI for interacting with a batch of transactions, with support for viewing the status of each transaction, submitting transactions, and observing the resuting transaction confirmations.  Its advanced view shows more details about each transaction, including the detailed logs of each script policy, its executed requirements and diagnostic outputs.
- The `CapoDappProvider` component also provides portals for the Capo status UI, which shows the current status of the Capo, including the current network, the current address, and the current balance. 
    - dApp developers should provide divs in their layout for these portals (txBatchUI, capoStatus, capoUserDetails), or use the `uiPortals=` prop to map those names to the ids of the portals in their layout. 
    - dApp developers may also take full control of the presentation, with multiple options.  With uiPortals="headless", they can take full control of the UI elements for status, and SHOULD respond to state updates observed in the provider to display relevant information to the user.   They may instead override the default renderers in their subclass, while using ui portals to let the provider manage the placement of the resulting UI elements in their layout.
    - Each application should create their  own subclass of CapoDappProvider, and render <TheirCapoProvider>...</TheirCapoProvider> in their layout, passing their own Capo as the `capoClass` prop (along with other key details).  There is a React signals pattern for subscribing to updates from the provider, easily wired up with the other props.  TODO: add that pattern into the library to make it reusable.
- The provider's default renderers are styled with tailwind classes that reference the application's branding colors.  Application developers should customize their theme colors with css variables and they will need to add tailwind to their project.  They should ensure their tailwind processes the library's css variables and styles.
- The `useCapoDappProvider()` hook gives access to the Capo instance and the provider from anywhere in the application.  
- The `CharterStatus` component provides a dashboard-style screen showing the current status of the Capo, including the current network, the current address, and the current balance.  It also shows the current charter data, including the current charter token, the current charter links, and the current charter manifest.  When loaded, it checks for any on-chain policies needing upgrades, and displays a button to trigger the upgrade transactions.
- There is also a headless `FormManager` component, with related helper classes and UI components for displaying and managing forms for creating and updating delegated data records.  

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

## Cross-links
- On-chain basics: `reference/essential-stellar-onchain.md`
- Architecture view: `reference/essential-stellar-dapp-architecture.md`
- Kickstart guide: `reference/essential-stellar-dapp-kickstart.md`
