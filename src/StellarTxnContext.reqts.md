# StellarTxnContext

## MAINTAINERS MUST READ:

> **🛑 COMPLIANCE TRIGGER: READ THIS FIRST**
>
> This document is strictly managed. Before interpreting or implementing these requirements, you **MUST** read and apply the **Requirements Consumer Skill** at:
>
> `skillz/reqm/reqt-consumer.SKILL.md`
>
> **CRITICAL**: You are **FORBIDDEN** from modifying this file or proceeding with implementation until you have ingested and studied the "Read-Only" constraints and "Escalation Protocol" defined in that skill.
> NOTE: if you've already studied the full REQM skill, you don't need the consumer skill.
>
> **hash.notice.reqt-consumer**: ef6a1fc351265553

> NOTE: See [reqm.SKILL.md](../skillz/reqm/reqm.SKILL.md); When managing requirements, you MUST follow the guidelines and conventions in that document, including expression of purpose/intended function as well as the detailed, formal requirements.

## About StellarTxnContext

StellarTxnContext is the transaction-building context class for all Stellar Contract transactions. It provides a typed state container that accumulates context during transaction construction, enabling type-safe composition of transaction-building operations.

The class wraps Helios' `TxBuilder` while adding strongly-typed state management, reflection capabilities for UTxO tracking, multi-transaction workflow support, and integration with the TxBatcher for coordinated submission. It serves as the central abstraction through which all on-chain operations flow.

**Essential technologies**: TypeScript generics, Helios TxBuilder, type-branded state patterns.
**Related technologies**: TxBatcher, TxChainBuilder, UplcConsoleLogger.

## Must Read: Special Skills and Know-how

This section provides directives for proactive-research triggers.

1. **Type Constraints**: When implementing transaction builders that require specific state, you MUST understand the branded type pattern (e.g., `hasSeedUtxo`, `hasCharterRef`) defined in `StellarTxnContext.ts` and `CapoTypes.ts`.
2. **Multi-Transaction Workflows**: When working with `addlTxns` or `facade()` patterns, you MUST review the transaction chaining implementation in `submitTxnChain()` and `queueAddlTxns()`.
3. **Decorator Usage**: When creating `@txn` or `@partialTxn` methods, you SHOULD review existing patterns in `Capo.ts` and `StellarDelegate.ts`.

## Collaborators

- **USED BY StellarTxnContext**: `TxBuilder` from `@helios-lang/tx-utils`, `NetworkParams` from `@helios-lang/ledger`, `SetupInfo` from `StellarContract.ts`, `TxBatcher` for submission coordination.
- **Expected to USE StellarTxnContext**: All transaction-building code in Stellar Contracts including `Capo`, `StellarDelegate`, `ContractBasedDelegate`, `DelegatedDataContract`, and application-specific contract classes.
- **First-class instances that USE StellarTxnContext**:
    - `Capo` (`EXPECTS REQT/wkmvcsc16r` for typed state, `EXPECTS REQT/rc6v4wy1ge` for tx chaining)
    - `StellarDelegate` (`EXPECTS REQT/zs5zp73ak1` for signature collection)
    - `DelegatedDataContract` (`EXPECTS REQT/e5c2yckc4w` for input/output tracking)

## Background

Transaction building in Cardano smart contracts involves complex coordination of inputs, outputs, reference inputs, minting, signatures, and validity periods. Specific challenges include:

1. **Type Safety**: Transaction builders need to enforce that required context (seed UTxO, charter reference, UUT mappings) is present before operations that depend on them.
2. **UTxO Tracking**: Contracts must avoid double-spending by tracking which UTxOs are already reserved in the current or parent transactions.
3. **Multi-Transaction Workflows**: Complex operations like bootstrapping require multiple dependent transactions that must be built and submitted in sequence.
4. **Signature Coordination**: Transactions may require signatures from multiple parties (wallet, other signers) that must be collected before submission.
5. **Diagnostics**: Script execution costs, validation errors, and transaction structure need clear logging for debugging.

## StellarTxnContext's Design Goals

### General Approach

- Generic class with type parameter `S extends anyState` for typed state accumulation
- Methods return refined types (e.g., `TCX & hasSeedUtxo`) enabling type-safe chaining
- Facade pattern for multi-transaction containers vs concrete transaction holders
- Integration with TxBatcher for coordinated signing and submission

### Specific Goals

1. **Type-Safe State Accumulation**: Enable transaction builders to progressively add typed state and require specific state shapes via type constraints.
2. **UTxO Reflection**: Maintain local tracking of inputs, outputs, and reference inputs for UTxO-finding utilities.
3. **Multi-Transaction Support**: Support queuing additional transactions for chained execution via `includeAddlTxn()` and `queueAddlTxns()`.
4. **Signature Management**: Track required witnesses and coordinate wallet vs external signatures.
5. **Validity Control**: Provide `validFor()` and `futureDate()` for transaction timing control.
6. **Build & Submit Pipeline**: Integrate with TxBatcher for coordinated transaction finalization and submission.
7. **Diagnostic Output**: Provide detailed cost breakdowns and validation error reporting.

## The Development Plan

We will start simple with essential requirements and develop incrementally to achieve key results, a bit at a time. Implementer should focus exclusively on achieving one incremental result at a time.

BACKLOGGED items SHOULD be considered in the structural design, but implementation MUST focus entirely on IN-PROGRESS requirements. COMPLETED requirements that are working MUST be retained in working order. NEXT requirements are those that can be implemented and work, based on having their dependencies already working or sufficiently stubbed.

## Functional Areas and Key Requirements

### 1. Typed State Management

#### Functional Requirements:
1. **State Container**:
    - MUST maintain a `state: S` property typed by the generic parameter
    - MUST include `uuts: uutMap` in all state types via `anyState` base
    - MUST provide `addState()` to augment state with new typed entries
    - MUST provide `addUut()` to register UUT names in state

2. **Type Constraints**:
    - MUST export type aliases for common state shapes (`hasSeedUtxo`, `hasAddlTxns`)
    - MUST enable method signatures to require specific state via `TCX extends StellarTxnContext & hasX`

### 2. Input/Output Tracking

#### Functional Requirements:
1. **Input Management**:
    - MUST track all inputs in local `inputs` array
    - MUST track collateral separately
    - MUST record witness needs for pubkey-addressed inputs
    - MUST integrate with parent context for UTxO reservation

2. **Output Management**:
    - MUST track all outputs in local `outputs` array
    - MUST provide clear error messages when output addition fails

3. **Reference Inputs**:
    - MUST track reference inputs in `txRefInputs` array
    - MUST be idempotent (prevent duplicate additions)
    - MUST prevent adding as refInput something already added as input

### 3. Transaction Validity

#### Functional Requirements:
1. **Validity Period**:
    - MUST provide `validFor(durationMs)` to set validity window
    - MUST default to 12 minutes if not explicitly set
    - SHOULD provide `futureDate()` for scheduling future transactions

2. **Time Handling**:
    - MUST provide `txnTime` property for effective transaction time
    - MUST provide `slotToTime()` and `timeToSlot()` conversions

### 4. Multi-Transaction Support

#### Functional Requirements:
1. **Additional Transactions**:
    - MUST provide `includeAddlTxn()` to queue deferred transactions
    - MUST provide `queueAddlTxns()` to process queued transactions
    - MUST support depth-first execution via `submitTxnChain()`

2. **Facade Pattern**:
    - MUST provide `facade()` to mark tcx as container-only
    - MUST provide `noFacade()` guard for operations requiring tx content
    - MUST track `isFacade` state (undefined | true | false)

### 5. Build and Submit

#### Functional Requirements:
1. **Transaction Building**:
    - MUST provide `build()` to finalize transaction with fees and balancing
    - MUST capture per-script execution costs
    - MUST handle validation errors with detailed logging

2. **Submission Pipeline**:
    - MUST provide `buildAndQueue()` to add built tx to current batch
    - MUST provide `submitAll()` to trigger batch signing and submission
    - MUST integrate with TxChainBuilder for UTxO chaining

---

# Requirements

## Component: StellarTxnContext

### REQT-1.0/sresp3jav8: COMPLETED: **Typed State Management**

#### Purpose: Governs state accumulation patterns. Applied when implementing transaction builders that require or provide specific context.

 - **REQT-1.0.1**/wkmvcsc16r: COMPLETED: **State Container** - MUST maintain generic `state: S` property where `S extends anyState`, with `anyState` requiring `uuts: uutMap`.
 - **REQT-1.0.2**/e5c2yckc4w: COMPLETED: **addState Method** - MUST provide `addState<K, V>(key, value)` returning `StellarTxnContext<{[K]: V} & anyState> & TCX`.
 - **REQT-1.0.3**/4mf8etyr75: COMPLETED: **addUut Method** - MUST provide `addUut<T>(uutName, ...names)` returning `hasUutContext<T> & TCX`.
 - **REQT-1.0.4**/rc6v4wy1ge: COMPLETED: **Type Aliases** - MUST export `hasSeedUtxo`, `hasAddlTxns`, and other branded types for common state shapes.

### REQT-1.1/zs5zp73ak1: COMPLETED: **Input/Output Tracking**

#### Purpose: Ensures accurate reflection of transaction contents. Applied when adding inputs/outputs or when UTxO-finding utilities need to exclude reserved UTxOs.

 - **REQT-1.1.1**/rchyr7skd2: COMPLETED: **Input Tracking** - MUST track inputs in local array and record witness needs for pubkey addresses.
     - **REQT-1.1.1.1**/8j3c498xwy: COMPLETED: **Input Stack Trace** - MUST gather a stack trace for the function that added the input.
     - **REQT-1.1.1.2**/acczfb1bd6: COMPLETED: **Reference Input Stack Trace** - MUST gather a stack trace for the function that added the reference input.
     - **REQT-1.1.1.3**/et8ttdrs77: COMPLETED: **Error On Duplicate Input** - MUST throw an error if the same input is added twice. The error MUST show the original input's stack summary and the stack trace where the duplicate is added.
     - **REQT-1.1.1.4**/p0eze6w4kk: COMPLETED: **Error Spending Reference Input** - MUST throw an error if the added input is already a reference input.
 - **REQT-1.1.2**/w9na1tska1: COMPLETED: **Output Tracking** - MUST track outputs in local array with clear error messages on failure.
 - **REQT-1.1.3**/68y4byt3bt: COMPLETED: **Reference Input Idempotency** - `addRefInput()` MUST be idempotent and MUST NOT add inputs already in the inputs array, without causing an error.
 - **REQT-1.1.4**/ft97ch6fsr: COMPLETED: **Reservation Tracking** - `reservedUtxos()` MUST return all inputs reserved by this and parent contexts.

### REQT-1.2/kw8dyfhnm1: COMPLETED: **Transaction Validity**

#### Purpose: Controls when transactions are valid on-chain. Applied when setting validity periods or scheduling future transactions.

 - **REQT-1.2.1**/bq7p6b3vd7: COMPLETED: **validFor Method** - MUST set validity window from `txnTime` to `txnTime + durationMs`.
 - **REQT-1.2.2**/ydmm332qye: COMPLETED: **Default Validity** - MUST default to 12 minutes if `validFor()` not called before build.
 - **REQT-1.2.3**/g5tya41gba: COMPLETED: **futureDate Method** - MUST allow setting `_txnTime` for deferred execution scenarios.
 - **REQT-1.2.4**/hekyyjd4rr: COMPLETED: **Time Conversions** - MUST provide `slotToTime()` and `timeToSlot()` using network parameters.

### REQT-1.3/n6yg7pebsa: COMPLETED: **Multi-Transaction Support**

#### Purpose: Enables complex workflows requiring multiple dependent transactions. Applied when building bootstrap sequences or chained operations.

 - **REQT-1.3.1**/rhb3kyc6g1: COMPLETED: **includeAddlTxn** - MUST queue `TxDescription` with `buildLater!` status, setting `parentId` and `depth`.
 - **REQT-1.3.2**/tcd5pmw7xt: COMPLETED: **queueAddlTxns** - MUST process queued transactions through `submitTxnChain()`.
 - **REQT-1.3.3**/54r377rg1z: COMPLETED: **Facade Pattern** - `facade()` MUST mark tcx as container-only; `noFacade()` MUST throw if called on facade.
 - **REQT-1.3.4**/3vb63y0ax0: COMPLETED: **Depth-First Execution** - `submitTxnChain()` MUST execute nested transactions before sibling transactions.

### REQT-2.0/FUTURE: **Enhanced Diagnostics**

#### Purpose: Improves debugging and monitoring capabilities. Applied when troubleshooting transaction failures or analyzing costs.

 - **REQT-2.0.1**/FUTURE: FUTURE: **Cost Attribution** - SHOULD provide per-script cost attribution in diagnostic output.
 - **REQT-2.0.2**/FUTURE: FUTURE: **Validation Context** - SHOULD expose script context CBOR on validation failure for external analysis.

## Files

1. `./StellarTxnContext.ts`
2. `./CapoTypes.ts` (type aliases)
3. `./StellarContract.ts` (SetupInfo, mkTcx)
4. `./networkClients/TxBatcher.ts` (batch coordination)

## Implementation Log

Meta-requirements: maintainers MUST NOT modify past details in the implementation log. Future changes should be appended.

### Phase 1: Core Implementation (Completed)

 - Implemented generic `StellarTxnContext<S extends anyState>` class
 - Established typed state accumulation with `addState()` and `addUut()`
 - Implemented input/output/refInput tracking with reservation awareness
 - Added validity period control via `validFor()` and `futureDate()`
 - Implemented multi-transaction support with `includeAddlTxn()` and facade pattern
 - Integrated with TxBatcher for coordinated submission
 - Added comprehensive cost breakdown in `emitCostDetails()`

#### Next Recommendations

1. **Enhanced Diagnostics**: Add structured logging for transaction building steps
2. **Validation Tooling**: Expose script context for external debugging tools
3. **Documentation**: Add inline examples for common usage patterns

---

# Release Management Plan

## v1 (Current)
- **Goal**: Document existing StellarTxnContext capabilities
- **Criteria**:
    - Core state management requirements documented (REQT-1.0)
    - Input/output tracking requirements documented (REQT-1.1)
    - Multi-transaction support documented (REQT-1.3)

## v2 (Planned)
- **Goal**: Enhanced diagnostics and tooling integration
- **Criteria**:
    - Diagnostic requirements implemented (REQT-2.0)
    - Integration with external debugging tools
