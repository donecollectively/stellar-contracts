# Stellar off-chain essentials

## MUST READ: Context and Dependencies

Before studying this document, you should understand cardano essentials in `essential-cardano.md`, and the overall architecture and transaction patterns in `reference/essential-stellar-dapp-architecture.md`, and the lifecycle duties in `reference/essential-capo-lifecycle.md`.

Use this as a map; you should also understand lifecycle duties in `reference/essential-capo-lifecycle.md`.  You may sometimes need `reference/essential-helios-api.md` for lower-level details on the Helios off-chain SDK (transaction building primitives, ledger types, value/address construction), but you're more likely to need context from kickstart guide `reference/essential-stellar-dapp-kickstart.md`, or stellar-contracts `docs/` contents, or to reference the source code in StellarTxnContext.ts, DelegatedDataContract.ts, or its parent classes.

If you need to do test automation, you should also read `reference/essential-stellar-testing.md`.

## On-chain vs. Off-chain Roles

**On-chain validates, off-chain constructs** — see `essential-cardano.md` for the fundamental model. Your role here is off-chain: use the classes and methods in this document to build transactions that satisfy the on-chain policy.

## Core classes
The on-chain versions of these have similar naming and contain the on-chain enforcement of policies, but they're distinct — see `reference/essential-stellar-onchain.md`. For architectural context, see `reference/essential-stellar-dapp-architecture.md` § "Components".

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
 - onchain ByteArray is `number[]` for read, and `number[] | string` for write (but note that a string value has to be hex-encoded binary data, so its utility is constrained). **Comparing on-chain byte arrays, encoded as `number[]`**: JavaScript `===`/`==` checks reference identity, not contents — it will silently return `false` for identical byte values. Use `equalsBytes(a, b)` from `@helios-lang/codec-utils` for element-by-element comparison. For typed Helios hash objects (`MintingPolicyHash`, `ValidatorHash`, etc.), use their `.isEqual(other)` method instead.
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

## Lifecycle operations
Charter creation/update, delegate installation/replacement, and ref script management are uncommon operations detailed in `reference/essential-offchain-bootstrapping.md`.

## Helpers & patterns
- `txcWithSeedUtxo` / `txnMustGetSeedUtxo`: select seed input for UUT minting.
- `uutsValue`, `mkUutValuesEntries`: construct Value for delegate tokens.
- `findCharterData`, `findSettingsInfo`, `findDelegatedDataUtxos`: fetch current datum/records.
- `txnAddGovAuthority`, `txnMustUseSpendDelegate`: add delegate authority tokens/redeemers.
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

## Validity windows

On-chain policies access time through `tx.time_range`. The on-chain `now(granularity)` returns `validity.start`, and `getTimeRange(granularity)` enforces the window width (see `essential-stellar-onchain.md` § "Time helpers"). Off-chain must set the window to match.

- `tcx.validFor(durationMs)`: Sets the validity window from `tcx.txnTime` to `txnTime + durationMs`. **The duration must not exceed the on-chain policy's granularity** — if the policy calls `getTimeRange(5*Duration::MINUTE)`, use `validFor(5 * 60 * 1000)` or less.
- `tcx.txnTime`: The validity window start (`Date`). Auto-set on first access (~3 min ago, slot-aligned). Use this for datum fields the policy compares against `now()` (which returns `validity.start`).
- `tcx.txnEndTime`: The validity window end (`Date`). Only available after `validFor()`. Use for datum fields the policy compares against `validity.end`.
- `tcx.futureDate(date)`: Pins `txnTime` to a specific future time. Must be called **before** `validFor()`. In tests, the emulator auto-advances to this time before submission.

When a policy enforces `datum.timestamp == now()`, set that field from `tcx.txnTime`:
```typescript
const tcx = this.mkTcx("activate sale");
const activationTime = tcx.txnTime;       // = validity.start on-chain
tcx.validFor(5 * 60 * 1000);              // matches policy's 5*Duration::MINUTE
await this.mkTxnUpdateRecord(sale, {
    updatedFields: { activatedAt: activationTime },
}, tcx);
```

## dApp creation & bootstrap
For initial setup — chartering, installing policies, ref scripts, and first deployment — see `reference/essential-offchain-bootstrapping.md` and the step-by-step kickstart guide at `reference/essential-stellar-dapp-kickstart.md`.

## Cross-links
- On-chain basics: `reference/essential-stellar-onchain.md`
- Helios off-chain SDK: `reference/essential-helios-api.md`
- UI support: `reference/essential-stellar-ui.md`
- Architecture view: `reference/essential-stellar-dapp-architecture.md`
- Kickstart guide: `reference/essential-stellar-dapp-kickstart.md`
- Bootstrapping & lifecycle: `reference/essential-offchain-bootstrapping.md`
