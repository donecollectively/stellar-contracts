# About DelegatedDataContract

## MAINTAINERS MUST READ:
> **AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY**
>
> This file is generated from the `.reqts.jsonl` source. To make changes:
> 1. Edit the JSONL source file
> 2. Run `node generate-reqts.mjs` to regenerate
>
> **COMPLIANCE TRIGGER**: Before interpreting these requirements, you **MUST** read:
> `reqt-consumer.SKILL.md`
>
> **hash.notice.reqt-consumer**: 5dddc026e9370dc8

`DelegatedDataContract` is the base class for all data controller delegates in the Stellar Contracts framework. It provides the off-chain CRUD surface for on-chain records whose storage lives at the Capo address and whose policy enforcement flows through the delegation chain. Application developers subclass it to define domain-specific record types, validation, and lifecycle hooks.

The essential technologies are **TypeScript, Cardano UPLC**. Related technologies include Helios, Data Bridge (generated casts).


# Background

The Stellar Contracts framework uses a delegation pattern where the Capo orchestrates multiple delegate contracts. Data controllers are a specific delegate role: they manage typed records stored as UTxOs at the Capo's address. Each record type needs its own controller subclass to define creation defaults, validation rules, policy-compliant data transforms, and transaction-building logic.

Specific challenges:
1. **CRUD Surface**: Creating, reading, updating, and (future) deleting on-chain records requires coordinating multiple delegation chain participants — the mint delegate, spend delegate, and the data controller itself.
2. **Policy Compliance**: On-chain policies enforce field constraints that off-chain callers may not satisfy. Hooks and defaults must bridge this gap without requiring subclasses to override core transaction methods.
3. **Type Safety**: The dual type system (on-chain `T` vs off-chain `TLike`) must be threaded correctly through all operations.
4. **Transaction Composition**: Record operations participate in multi-transaction groups and must compose with the `mkTxn*`/`txn*` naming convention.



# Design Goals

#### General Approach
- Subclass-friendly base with sensible defaults and hook points
- Clear separation between primary entry points (`mkTxn*`) and composable helpers (`txn*`)
- Type-safe threading of on-chain (`T`) and off-chain (`TLike`) representations
- Integration with the delegation chain for authority and policy enforcement

#### Specific Goals
1. **Minimal Subclass Burden**: Subclasses define identity (`recordTypeName`, `idPrefix`), example data, and optionally hooks/validation — the base handles transaction mechanics.
2. **Read/Write Path Optimization**: Read operations skip script compilation; write operations compile only when needed.
3. **Hook Extensibility**: Before-hooks for data normalization, planned after-hooks for post-submission side effects.
4. **Policy Setup Automation**: Controllers can self-install into the Capo manifest via `setupCapoPolicy()`.
5. **Validation Integration**: `validate()` supports both on-chain policy compliance and UI-layer interactive feedback via FormManager.


# Must Read: Special Skills and Know-how

1. **On-chain policy constraints — which fields the policy enforces**: When implementing or modifying before-hooks → load `the relevant data-policy delegate's on-chain script`
2. **Transaction building pipeline diagrams showing where hooks fire**: When working on hook timing or placement → load `src/offchainRuntime.ARCHITECTURE.md § DelegatedDataContract Lifecycle Hooks`
3. **Spy/mock patterns and the constraint that on-chain errors only surface at submit time**: When writing tests involving hooks or CRUD operations → load `reference/essential-stellar-testing.md`

# Collaborators



**Expected users:** Application-specific data controller subclasses in downstream dApps, Capo (for delegate lifecycle management), UI layer (for queries and transaction triggers), test infrastructure (for integration testing)

# Functional Areas and Key Requirements

### 1. Record Type Identity
Defines the contract between a subclass and the framework: what record type name, ID prefix, delegate name, and example data a controller provides.

#### Key Requirements:
1. **Record Type Identity**: EXPECTS subclasses to declare the record type they manage — its type name, ID prefix, example data shape, and on-chain requirements map. The base class uses these declarations to register, locate, and label the controller.

### 2. Record Reading
Querying on-chain records by type or by ID, returning typed results without requiring script compilation.

#### Key Requirements:
1. **Record Reading**: The controller provides a typed query interface for retrieving on-chain records of its type, delegating to the Capo's UTxO query infrastructure without requiring script compilation.

### 3. Record Creation
Building and submitting transactions that create new on-chain records, including UUT minting, default merging, before-hooks, and authority inclusion.

#### Key Requirements:
1. **Record Creation Pipeline**: When you create a new record, the controller mints a unique token for its ID, merges your data with defaults, runs any before-create hook, and builds the transaction with appropriate delegation chain authority.
2. **beforeCreate Hook**: Before a new record is written to the chain, the controller calls a hook allowing subclasses to normalize or augment the record data to satisfy on-chain policy constraints.
3. **Creation Transaction Output**: The creation transaction outputs the new record as a UTxO at the Capo address, carrying the minted UUT and wrapped in the capoStoredData datum envelope.
4. **afterCreate Hook**: After a create transaction is successfully submitted, a hook fires for side effects such as cache invalidation, event emission, or logging.

### 4. Record Update
Building and submitting transactions that update existing on-chain records, including spend-delegate coordination, field merging, before-hooks, and authority inclusion.

#### Key Requirements:
1. **Record Update Pipeline**: When you update an existing record, the controller spends the existing UTxO, coordinates authority through the spend delegate, merges your updated fields with existing data, runs any before-update hook, and builds the transaction outputting the modified record.
2. **beforeUpdate Hook**: Before an updated record is written to the chain, the controller calls a hook allowing subclasses to normalize or augment the merged record data to satisfy on-chain policy constraints.
3. **Update Transaction Output**: The update transaction outputs the modified record as a UTxO at the return address, carrying the original value (plus any added value) and wrapped in the capoStoredData datum envelope.
4. **afterUpdate Hook**: After an update transaction is successfully submitted, a hook fires for side effects such as cache invalidation, event emission, or logging.

### 5. Record Deletion
Planned capability for building transactions that delete on-chain records by burning their UUT.

#### Key Requirements:
1. **Record Deletion**: When you delete a record, the controller burns the record's UUT, spends the UTxO, and coordinates authority through the delegation chain — removing the record from the on-chain data store.

### 6. Validation
Record validation for both on-chain policy compliance and interactive UI feedback via FormManager.

#### Key Requirements:
1. **Record Validation**: The controller provides a validation method that checks record data against business rules, returning either success or a map of field paths to error messages for interactive UI feedback.

### 7. Data Serialization
Converting between off-chain TypeScript records and on-chain UPLC datum representations via the capoStoredData envelope.

#### Key Requirements:
1. **Datum Construction**: Records are wrapped in the `capoStoredData` datum envelope with version and metadata fields before being stored on-chain, using the data bridge's generated cast functions.

### 8. Policy Setup
Self-installing the controller's policy delegate into the Capo manifest, gated by feature flags.

#### Key Requirements:
1. **Policy Setup**: The controller can register itself in the Capo's delegate manifest, creating an additional transaction for policy installation — gated by the Capo's feature flags so only enabled controllers are deployed.

### 9. Gov Authority Integration
Conditional inclusion of the Capo's governance authority token in transactions when the controller's script bundle requires it.

#### Key Requirements:
1. **Gov Authority Integration**: When the controller's script bundle declares `requiresGovAuthority`, the creation and update pipelines automatically include the Capo's governance authority token in the transaction.


# Detailed Requirements

## Area 1: Record Type Identity

### **REQT-1.1.0/z5cpwfc4j8**: **COMPLETED**/draft: **Record Type Identity**
#### Purpose: Establishes the subclass contract and the base class guarantees for record type identification. Applied when creating a new data controller subclass, or when reviewing how the framework registers, queries, and labels controllers within the Capo's delegate system.

 - 1.1.1: REQT-vmd1dyfwh9: **COMPLETED**/draft: **Record Type Name** - EXPECTS subclasses to implement `get recordTypeName(): string` returning a unique string identifying the record type. The base class MUST use this value when querying the Capo for records of this type, when registering in the Capo manifest, and when logging record operations.
 - 1.1.2: REQT-mses8934w4: **COMPLETED**/draft: **ID Prefix** - EXPECTS subclasses to implement `get idPrefix(): string` returning the prefix used for UUT-based record identifiers. The base class MUST use this value as the UUT purpose when minting record IDs and as the key in the transaction context's `uuts` state.
 - 1.1.3: REQT-f9yqmfce13: **COMPLETED**/draft: **Delegate Name** - The base class MUST provide a default `delegateName` getter returning `${recordTypeName}Pol`. This value affects the on-chain script's logging label and the compiled script cache key. Subclasses MAY override this getter.
 - 1.1.4: REQT-mrf30mdk48: **COMPLETED**/draft: **Example Data** - EXPECTS subclasses to implement `exampleData(): minimalData<TLike>` returning a representative example of the off-chain record shape. This is used by framework tooling and testing infrastructure.
 - 1.1.5: REQT-3sbza2sqhj: **COMPLETED**/draft: **Requirements Map** - EXPECTS subclasses to implement `requirements()` returning a `ReqtsMap` defining the on-chain requirements for this controller's policy enforcement.
 - 1.1.6: REQT-pc2p118sh0: **COMPLETED**/draft: **Data Policy Flag** - The base class MUST set `static isDgDataPolicy = true` to distinguish data controllers from other delegate types in the Capo's delegate resolution logic.
 - 1.1.7: REQT-dtrkmaykkr: **COMPLETED**/draft: **Script Bundle Class** - EXPECTS subclasses to implement `static scriptBundleClass()` returning the `DelegatedDataBundle` subclass for this controller. The base class MUST provide a helpful error message guiding developers through the setup when this method is missing or misconfigured. Subclasses using the pluggable `abstractBundleClass` pattern MUST receive a distinct error explaining the two-step setup.

## Area 2: Record Reading

### **REQT-2.1.0/5va4gd7hvr**: **COMPLETED**/draft: **Record Reading**
#### Purpose: Governs the controller's query interface for retrieving on-chain records. Applied when implementing record lookup in a subclass, reviewing how the UI layer fetches data, or understanding the read-only optimization path.

 - 2.1.1: REQT-anwgf1xcpt: **COMPLETED**/draft: **Query All Records** - MUST support querying all records of this controller's type via `findRecords()` with no arguments, returning `FoundDatumUtxo<T, TLike>[]`.
 - 2.1.2: REQT-de690d55hn: **COMPLETED**/draft: **Query by ID** - MUST support querying a single record by ID via `findRecords({ id })`, returning a single `FoundDatumUtxo<T, TLike>`. MUST call `capo.singleItem()` to unwrap the result when an ID is provided.
 - 2.1.3: REQT-s7a2jsvx5d: **COMPLETED**/draft: **Capo Delegation** - MUST delegate to `capo.findDelegatedDataUtxos()` passing the controller's `recordTypeName` as the `type` parameter and the optional `id`. The Capo handles network queries, data bridge casting, and the `readOnly` optimization.
 - 2.1.4: REQT-46z9as6rge: **COMPLETED**/draft: **Type-Safe Results** - MUST return results typed as `FoundDatumUtxo<T, TLike>` where `T` is the on-chain type and `TLike` is the off-chain type, preserving type safety through the query pipeline.

## Area 3: Record Creation

### **REQT-3.1.0/9sh35cfvyj**: **COMPLETED**/draft: **Record Creation Pipeline**
#### Purpose: Governs the full creation pipeline from caller invocation through UUT minting, data merging, hook execution, and datum output. Applied when implementing creation logic in a subclass, reviewing how new records reach the chain, or debugging creation failures.

 - 3.1.1: REQT-9h5q003np1: **COMPLETED**/draft: **Primary Entry Point** - MUST provide `mkTxnCreateRecord(options, tcx?)` as the primary entry point for record creation. When no `tcx` is provided, MUST create one via `mkTcx()`. MUST set up charter reference, seed UTxO, and mint the record's UUT via the mint delegate before delegating to `txnCreatingRecord()`.
 - 3.1.2: REQT-2h9ams86c4: **COMPLETED**/draft: **Default Transaction Name** - When no `tcx` and no `options.txnName` are provided, MUST default the transaction name to `create ${recordId}` where recordId is the minted UUT.
 - 3.1.3: REQT-dazxmht4r2: **COMPLETED**/draft: **UUT Minting** - MUST mint a UUT for the new record using `capo.txnMintingUuts()` with the controller's `idPrefix` as the purpose. The mint delegate's `CreatingDelegatedData` activity MUST be used, passing the controller's `recordTypeName` as `dataType`.
 - 3.1.4: REQT-qxxs1znhet: **COMPLETED**/draft: **Default Activity Resolution** - When `options.activity` is not provided, MUST default to `this.activity.MintingActivities.$seeded$CreatingRecord`. MUST throw a clear error if neither the caller-supplied nor the default activity is available. MUST support `SeedActivity` objects by calling `mkRedeemer(tcx)` to produce the concrete activity.
 - 3.1.5: REQT-a22z936f9v: **COMPLETED**/draft: **Creation Defaults** - MUST call `creationDefaultDetails()` and merge the result with caller-supplied data. The merge order MUST be: `{ id, type, ...defaults, ...callerData }`, so caller data overrides defaults but `id` and `type` are always set by the framework.

### **REQT-3.2.0/5xcxm119jz**: **COMPLETED**/draft: **beforeCreate Hook**
#### Purpose: Governs the beforeCreate hook's behavior and contract. Applied when implementing or modifying data creation in a DelegatedDataContract subclass, or when reviewing how records are prepared before on-chain datum construction.

 - 3.2.1: REQT-80gk8ja8bw: **COMPLETED**/draft: **Hook Invocation Point** - MUST call `beforeCreate(record, context)` after merging `creationDefaultDetails()`, `id`, `type`, and caller-supplied data, but before constructing the on-chain datum via the data bridge.
 - 3.2.2: REQT-a30n3rbmkp: **NEXT**/draft: **Hook Context** - MUST pass a `createContext<TLike>` containing `{ activity: isActivity, tcx: StellarTxnContext }` as the context parameter. The `tcx` is passed by direct reference — hooks MAY mutate it (e.g., calling `tcx.validFor()` to fix the validity window before reading `tcx.txnEndTime`).
 - 3.2.3: REQT-zx1w72nxen: **COMPLETED**/draft: **Base Class Passthrough** - The base class implementation MUST be a passthrough that returns the record unmodified.
 - 3.2.4: REQT-pj4jv8zq0v: **COMPLETED**/draft: **Synchronous Contract** - MUST be synchronous (returns `TLike`, not `Promise<TLike>`).
 - 3.2.5: REQT-51vkbcm2vf: **NEXT**/draft: **Record Input Protection** - The record passed to `beforeCreate()` MUST be a deep clone of the merged record, frozen recursively before the hook receives it. The clone MUST be Helios-aware: calling `.copy()` on mutable Helios types (Address, Value, Assets), sharing immutable Helios types by reference (PubKeyHash, UplcData variants), and recursing into plain objects and arrays. The freeze MUST be recursive but MUST NOT freeze Helios type instances — only plain objects and arrays. This protects caller data from accidental mutation and enforces the return-value contract.

### **REQT-3.3.0/6t6hk8zk1w**: **COMPLETED**/draft: **Creation Transaction Output**
#### Purpose: Governs how the creation transaction outputs the new record to the chain. Applied when reviewing datum construction, value composition, or the authority flow during record creation.

 - 3.3.1: REQT-49vrswcc16: **COMPLETED**/draft: **Authority Grant** - MUST call `txnGrantAuthority(tcx, activity)` to include the controller's authority token in the transaction, proving delegation chain authorization for the creation.
 - 3.3.2: REQT-zcn62x8zjg: **COMPLETED**/draft: **Output Composition** - MUST output the new record as a UTxO at `capo.address` carrying the minted UUT value (plus any `addedUtxoValue` from options) and an inline datum produced by `mkDatum.capoStoredData()` with `version: 2n`.

### **REQT-3.4.0/1q0vd26stf**: **BACKLOG**/draft: **afterCreate Hook**
#### Purpose: Governs the afterCreate hook's behavior and contract. Applied when planning or implementing post-submission side effects for record creation, or when reviewing the data controller's extensibility surface.

 - 3.4.1: REQT-m0mh9yd6z3: **BACKLOG**/draft: **Post-Submission Timing** - MUST fire after the create transaction has been successfully submitted to the network (not merely built).

## Area 4: Record Update

### **REQT-4.1.0/km4n1a77sz**: **COMPLETED**/draft: **Record Update Pipeline**
#### Purpose: Governs the full update pipeline from caller invocation through existing record spending, field merging, hook execution, and datum output. Applied when implementing update logic in a subclass, reviewing how record modifications reach the chain, or debugging update failures.

 - 4.1.1: REQT-251rac8fgp: **COMPLETED**/draft: **Primary Entry Point** - MUST provide `mkTxnUpdateRecord(item, options, tcx?)` as the primary entry point for record updates. When no `tcx` is provided, MUST create one via `mkTcx()` with a default name of `update ${item.id}`. MUST set up charter reference before delegating to `txnUpdatingRecord()`.
 - 4.1.2: REQT-ptck989q09: **COMPLETED**/draft: **Existing Record Spending** - MUST spend the existing record's UTxO as a transaction input using `capo.activitySpendingDelegatedDatum()` as the redeemer. MUST attach the Capo's compiled script (or ref script) to the transaction for the spend to validate.
 - 4.1.3: REQT-d8vbpkrmw8: **COMPLETED**/draft: **Spend Delegate Coordination** - MUST obtain the Capo's spend delegate and call `spendDelegate.txnGrantAuthority()` with the `UpdatingDelegatedData` activity, passing the controller's `recordTypeName` and the record's ID. This proves the spend is authorized through the delegation chain.
 - 4.1.4: REQT-fyzsshpwdx: **COMPLETED**/draft: **Activity Materialization** - MUST support both plain `isActivity` objects and legacy `UpdateActivity` objects as the `options.activity`. When an `UpdateActivity` is provided, MUST call `mkRedeemer(recId)` to produce the concrete activity.
 - 4.1.5: REQT-afpa9xc22k: **COMPLETED**/draft: **Field Merging** - MUST merge the existing on-chain record with the caller's `updatedFields`. The merge order MUST be `{ ...existingData, ...updatedFields }` so caller updates override existing values. Only the fields being changed need to be provided by the caller.

### **REQT-4.2.0/5rsshp821f**: **COMPLETED**/draft: **beforeUpdate Hook**
#### Purpose: Governs the beforeUpdate hook's behavior and contract. Applied when implementing or modifying data updates in a DelegatedDataContract subclass, or when reviewing how updated records are prepared before on-chain datum construction.

 - 4.2.1: REQT-hx6knbqcve: **COMPLETED**/draft: **Hook Invocation Point** - MUST call `beforeUpdate(record, context)` after merging the existing on-chain record with the updated fields, but before constructing the updated on-chain datum.
 - 4.2.2: REQT-76xh3h4fsk: **NEXT**/draft: **Hook Context** - MUST pass an `updateContext<T>` containing `{ original: T, activity: isActivity, tcx: StellarTxnContext }` where `original` is the pre-update on-chain record typed as the on-chain type `T`, provided as a deep-cloned, frozen copy. The `tcx` is passed by direct reference — hooks MAY mutate it (e.g., calling `tcx.validFor()` to fix the validity window before reading `tcx.txnEndTime`).
 - 4.2.3: REQT-t9qqwr26db: **COMPLETED**/draft: **Base Class Passthrough** - The base class implementation MUST be a passthrough that returns the record unmodified.
 - 4.2.4: REQT-4sfsjy0t0p: **COMPLETED**/draft: **Synchronous Contract** - MUST be synchronous (returns `TLike`, not `Promise<TLike>`).
 - 4.2.5: REQT-v538zt7mkh: **NEXT**/draft: **Record Input Protection** - The merged record passed to `beforeUpdate()` MUST be a deep clone of the merged record, frozen recursively before the hook receives it. The clone MUST be Helios-aware: calling `.copy()` on mutable Helios types (Address, Value, Assets), sharing immutable Helios types by reference (PubKeyHash, UplcData variants), and recursing into plain objects and arrays. The freeze MUST be recursive but MUST NOT freeze Helios type instances — only plain objects and arrays.
 - 4.2.6: REQT-fyc6n4e6rt: **NEXT**/draft: **Original Record Protection** - The `original` record in the `updateContext` MUST be a deep clone of the pre-update on-chain record, frozen recursively before the hook receives it. This follows the same Helios-aware cloning strategy as the record input. The hook can safely read `original` for comparison without risk of mutating the source UTxO data.
 - 4.2.7: REQT-tsg5f4mz07: **NEXT**/draft: **Return Value Contract** - The framework MUST use only the return value of `beforeUpdate()` as the record data for datum construction. The frozen input enforces that hooks return a new object with modifications rather than mutating the input in place.

### **REQT-4.3.0/03vrnvz9kw**: **COMPLETED**/draft: **Update Transaction Output**
#### Purpose: Governs how the update transaction outputs the modified record back to the chain. Applied when reviewing datum reconstruction, value composition, or the return address for updated records.

 - 4.3.1: REQT-wwxx74fk87: **COMPLETED**/draft: **Controller Authority Grant** - MUST call `txnGrantAuthority(tcx, activity)` to include the controller's authority token in the transaction, proving delegation chain authorization for the update.
 - 4.3.2: REQT-3v7rmkmqr0: **COMPLETED**/draft: **Output Composition** - MUST output the updated record via `returnUpdatedRecord()` at `getReturnAddress()` (default: `capo.address`) carrying the original UTxO value plus any `addedUtxoValue` from options, with an inline datum produced by `mkDatum.capoStoredData()` with `version: 2n`.

### **REQT-4.4.0/w57vnj8eb3**: **BACKLOG**/draft: **afterUpdate Hook**
#### Purpose: Governs the afterUpdate hook's behavior and contract. Applied when planning or implementing post-submission side effects for record updates, or when reviewing the data controller's extensibility surface.

 - 4.4.1: REQT-0gftw0s2nm: **BACKLOG**/draft: **Post-Submission Timing** - MUST fire after the update transaction has been successfully submitted to the network (not merely built).

## Area 5: Record Deletion

### **REQT-5.1.0/6tgb02nsbj**: **BACKLOG**/draft: **Record Deletion**
#### Purpose: Governs the planned capability for deleting on-chain records by burning their UUT. Applied when planning deletion support or reviewing the full CRUD surface.

 - 5.1.1: REQT-7ncmgtqv6n: **BACKLOG**/draft: **Delete Entry Point** - SHOULD provide `mkTxnDeleteRecord(item, options, tcx?)` as the primary entry point for record deletion, following the same pattern as `mkTxnCreateRecord` and `mkTxnUpdateRecord`.
 - 5.1.2: REQT-q8y0axbj0m: **BACKLOG**/draft: **UUT Burning** - MUST burn the record's UUT token as part of the deletion transaction, coordinating with the mint delegate's `DeletingDelegatedData` activity.

## Area 6: Validation

### **REQT-6.1.0/gzy5ddjbfb**: **COMPLETED**/draft: **Record Validation**
#### Purpose: Governs the validation interface for checking record data against business rules. Applied when implementing validation in a subclass, integrating with FormManager for interactive feedback, or reviewing how invalid data is surfaced to users.

 - 6.1.1: REQT-t5eyzhm1qx: **COMPLETED**/draft: **Validation Signature** - MUST provide `validate(record: TLike, context?: 'create' | 'update')` returning `true` for valid records or `Record<string, string>` mapping field paths to error messages for invalid records.
 - 6.1.2: REQT-akv9zc4knr: **COMPLETED**/draft: **Default Passthrough** - The base class implementation MUST return `true` (valid) by default. EXPECTS subclasses to override with domain-specific validation logic.
 - 6.1.3: REQT-8r645t2rmc: **COMPLETED**/draft: **FormManager Integration** - The validation method MUST be compatible with FormManager's field-level validation: error paths MUST correspond to data field paths so FormManager can display errors alongside the relevant form fields.

## Area 7: Data Serialization

### **REQT-7.1.0/rd9qeskg73**: **COMPLETED**/draft: **Datum Construction**
#### Purpose: Governs how off-chain records are serialized into on-chain datum representations. Applied when reviewing datum structure, debugging serialization issues, or understanding the capoStoredData envelope.

 - 7.1.1: REQT-9q7z3t6be5: **COMPLETED**/draft: **capoStoredData Envelope** - MUST wrap records in the `capoStoredData` datum envelope via `mkDatum.capoStoredData()`, with `version: 2n` and `otherDetails: makeIntData(0)`. The `data` field carries the off-chain `TLike` record.
 - 7.1.2: REQT-4582gxc9md: **COMPLETED**/draft: **mkDgDatum Helper** - MUST provide `mkDgDatum(record: TLike)` as a convenience method that wraps a record in the `capoStoredData` envelope, returning an `InlineDatum` suitable for transaction output.

## Area 8: Policy Setup

### **REQT-8.1.0/d3zy87w1n5**: **COMPLETED**/draft: **Policy Setup**
#### Purpose: Governs how the controller self-installs its policy delegate into the Capo manifest. Applied when reviewing deployment automation, feature flag gating, or the bootstrap transaction chain.

 - 8.1.1: REQT-wydc3exnz7: **COMPLETED**/draft: **Feature Flag Gate** - MUST check `capo.featureEnabled(typeName)` before proceeding with policy setup. If the feature is not enabled, MUST log a warning and return without creating a transaction.
 - 8.1.2: REQT-rarnhwyxs8: **COMPLETED**/draft: **Existence Detection** - MUST check whether the controller's policy already exists in the Capo manifest via `capo.getDgDataController()` with `optional: true`. The action label (create vs update) MUST reflect whether this is a new installation or an update.
 - 8.1.3: REQT-91s9d9pm83: **COMPLETED**/draft: **Additional Transaction Pattern** - MUST use `tcx.includeAddlTxn()` to queue the policy installation as an additional transaction with a deferred `mkTcx` callback. The callback MUST fetch fresh charter data before calling `capo.mkTxnInstallPolicyDelegate()` with the controller's `recordTypeName` and `idPrefix`.
 - 8.1.4: REQT-gb7s82j7nt: **COMPLETED**/draft: **moreInfo Description** - MUST provide a `moreInfo()` method returning a human-readable description of the controller's purpose, used in the Capo's on-screen policy management interface. The base class MUST provide a default implementation referencing the `idPrefix` and `recordTypeName`.

## Area 9: Gov Authority Integration

### **REQT-9.1.0/0h457z25k5**: **COMPLETED**/draft: **Gov Authority Integration**
#### Purpose: Governs the conditional inclusion of governance authority in transactions. Applied when reviewing how the Capo's governance token participates in creation and update transactions, or when configuring a controller's script bundle.

 - 9.1.1: REQT-9a9mkkda7v: **COMPLETED**/draft: **Bundle-Driven Flag** - MUST provide a `needsGovAuthority` getter that delegates to `this._bundle.requiresGovAuthority`. The flag is set by the script bundle class, not by the controller directly.
 - 9.1.2: REQT-cdx7fgx81a: **COMPLETED**/draft: **Conditional Inclusion in Creation** - When `needsGovAuthority` is true, `txnCreatingRecord()` MUST call `capo.txnAddGovAuthority(tcx)` before outputting the new record.
 - 9.1.3: REQT-41t3rxxndv: **COMPLETED**/draft: **Conditional Inclusion in Update** - When `needsGovAuthority` is true, `mkTxnUpdateRecord()` MUST call `capo.txnAddGovAuthority(tcx)` before delegating to `txnUpdatingRecord()`.


# Files

- `./DelegatedDataContract.ts` - Base class implementation
- `./ContractBasedDelegate.ts` - Parent class — authority, script bundle, data bridge access
- `./StellarDelegate.ts` - Grandparent class — txnGrantAuthority, authority token lifecycle

# Implementation Log

> Maintainers MUST NOT modify past entries. Append new entries only.

### Version 1.0

 - **added**: Initial v3 requirements document covering full CRUD surface, migrated from v2 lifecycle-hooks-only scope — 9 functional areas, 44 requirements. Migrated beforeCreate (REQT-5xcxm119jz), beforeUpdate (REQT-5rsshp821f), afterCreate (REQT-1q0vd26stf) with original UUTs preserved. Added Record Type Identity, Reading, Creation pipeline, Update pipeline, Deletion (BACKLOG), Validation, Data Serialization, Policy Setup, and Gov Authority Integration.
 - **updated**: Hook context enrichment and input protection — per Code Whisperer pre-coding advisory (work unit k7m2x9p4w6). Updated REQT-a30n3rbmkp and REQT-76xh3h4fsk to add tcx to hook contexts (status COMPLETED→NEXT). Added 4 new requirements: REQT-51vkbcm2vf (beforeCreate record input protection), REQT-v538zt7mkh (beforeUpdate record input protection), REQT-fyc6n4e6rt (original record protection), REQT-tsg5f4mz07 (return value contract). All new reqts status NEXT. Total requirements now 48.


# Release Management Plan

See `release-management-scope.md` for version criteria and lifecycle management.
