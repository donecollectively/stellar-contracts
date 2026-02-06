# DelegatedDataContract Lifecycle Hooks

## MAINTAINERS MUST READ:

> **🛑 COMPLIANCE TRIGGER: READ THIS FIRST**
>
> This document is strictly managed. Before interpreting or implementing these requirements, you **MUST** read and apply the **Requirements Consumer Skill** at:
>
> `skillz/reqm/reqt-consumer.SKILL.md`
>
> **CRITICAL**: You are **FORBIDDEN** from modifying this file or proceeding with implementation until you have ingested and studied the "Read-Only" constraints and "Escalation Protocol" defined in that skill.
> NOTE: if you've already studied the full REQM skill, you don't need the consumer skill.

> **hash.notice.reqt-consumer**: 5dddc026e9370dc8

> NOTE: See [reqm.SKILL.md](../../skillz/reqm/reqm.SKILL.md); When managing requirements, you MUST follow the guidelines and conventions in that document, including expression of purpose/intended function as well as the detailed, formal requirements.

## About DelegatedDataContract Lifecycle Hooks

`DelegatedDataContract` is the base class for all data controller delegates in the Stellar Contracts framework. It provides CRUD operations for on-chain records whose storage lives at the Capo address and whose policy enforcement is handled through the delegation chain.

Lifecycle hooks are extension points that fire at well-defined moments during transaction building and submission. They allow subclass controllers to transform data (before-hooks) or respond to completed operations (after-hooks) without overriding the core transaction-building methods.

Two before-hooks (`beforeCreate`, `beforeUpdate`) already exist. This requirements document covers both the existing hooks and the planned `afterCreate` and `afterUpdate` hooks.

## Must Read: Special Skills and Know-how

This section provides directives for proactive-research triggers.

1. **On-chain Policy Constraints**: When implementing or modifying before-hooks, you MUST read the relevant data-policy delegate's on-chain script to understand which fields the policy enforces — the before-hook typically exists to satisfy those constraints.
2. **Transaction Building Pipeline**: When working on hook timing or placement, you SHOULD read `src/offchainRuntime.ARCHITECTURE.md` § "DelegatedDataContract Lifecycle Hooks" for the pipeline diagrams showing where hooks fire.
3. **Testing Hooks**: When writing tests involving hooks, you MUST read `reference/essential-stellar-testing.md` for spy/mock patterns and the constraint that on-chain errors only surface at submit time.

## Collaborators

 - **USED BY DelegatedDataContract**: `StellarTxnContext` for transaction building, `DataBridge` for datum serialization, `Capo` for delegation chain coordination.
 - **Expected to USE DelegatedDataContract hooks**: Application-specific data controller subclasses (e.g., domain-specific record controllers in downstream dApps).
 - **First-class instances that USE hooks**: Any `DelegatedDataContract` subclass that overrides `beforeCreate()` or `beforeUpdate()` to normalize records for on-chain policy compliance.

## Background

The `DelegatedDataContract` base class handles the mechanics of building create/update/delete transactions for on-chain records. However, the base class cannot know what domain-specific data transformations each application requires. Specific challenges:

1. **Policy Compliance Gap**: On-chain policies enforce field constraints (e.g., computed fields, timestamps, status values) that the off-chain caller may not set correctly. Without a hook, each subclass must override the entire `txnCreatingRecord` or `txnUpdatingRecord` method.
2. **No Post-Submission Extension Point**: After a transaction is successfully submitted, there is no mechanism for controllers to perform side effects (cache invalidation, event emission, logging) without overriding submission infrastructure.
3. **Consistency**: Before-hooks already exist but lack formal requirements. After-hooks are absent entirely.

## Design Goals

#### General Approach

 - Synchronous transform hooks (before-*) for data normalization prior to datum construction
 - Asynchronous side-effect hooks (after-*) for post-submission responses
 - Minimal API surface — each hook has a single clear responsibility
 - Base class provides passthrough defaults so subclasses only override what they need

#### Specific Goals

1. **Data Normalization**: Before-hooks MUST allow subclasses to patch records to satisfy on-chain policy constraints without overriding core transaction methods.
2. **Post-Submission Extensibility**: After-hooks MUST provide a point for side effects after successful transaction submission.
3. **Context Awareness**: All hooks MUST receive sufficient context (activity, original record where applicable) to make informed decisions.
4. **Safe Defaults**: Base class hook implementations MUST be safe no-ops (passthroughs for before-hooks, empty for after-hooks).
5. **Testability**: Hooks MUST be individually spy-able and mockable for testing.

## The Development Plan

We will start simple with essential requirements and develop incrementally to achieve key results, a bit at a time. Implementer should focus exclusively on achieving one incremental result at a time.

BACKLOGGED items SHOULD be considered in the structural design, but implementation MUST focus entirely on IN-PROGRESS requirements. COMPLETED requirements that are working MUST be retained in working order. NEXT requirements are those that can be implemented and work, based on having their dependencies already working or sufficiently stubbed.

Any "TBD" items MUST be changed to "FUTURE" instead.

## Functional Areas and Key Requirements

### 1. Before-Hooks (Data Transform)

#### Functional Requirements:

1. **beforeCreate**: MUST allow subclasses to transform a record after defaults/id/type are merged but before the on-chain datum is constructed
2. **beforeUpdate**: MUST allow subclasses to transform a record after existing data is merged with updates but before the on-chain datum is constructed
3. Both hooks MUST be synchronous and return the (possibly modified) record
4. Both hooks MUST receive a context object containing the triggering activity

### 2. After-Hooks (Post-Submission Side Effects)

#### Functional Requirements:

1. **afterCreate**: MUST fire after a create transaction is successfully submitted
2. **afterUpdate**: MUST fire after an update transaction is successfully submitted
3. After-hooks MAY be asynchronous
4. After-hooks MUST NOT affect the transaction result — they are side-effect-only
5. After-hook failures SHOULD be logged but MUST NOT cause the overall operation to throw

### 3. Context Objects

#### Functional Requirements:

1. `createContext` MUST include the activity being triggered
2. `updateContext` MUST include both the original record (on-chain type) and the activity
3. After-hook contexts MUST include the submitted transaction context and the record as submitted

---

# Requirements

## Component: Before-Hooks

### REQT-1.0/5xcxm119jz: COMPLETED: **beforeCreate Hook**

#### Purpose: Governs the beforeCreate hook's behavior and contract. Applied when implementing or modifying data creation in a DelegatedDataContract subclass, or when reviewing how records are prepared before on-chain datum construction.

 - **REQT-1.0.1**/80gk8ja8bw: COMPLETED: MUST call `beforeCreate(record, context)` after merging `creationDefaultDetails()`, `id`, `type`, and caller-supplied data, but before constructing the on-chain datum via the data bridge.
 - **REQT-1.0.2**/a30n3rbmkp: COMPLETED: MUST pass a `createContext<TLike>` containing `{ activity: isActivity }` as the context parameter.
 - **REQT-1.0.3**/zx1w72nxen: COMPLETED: The base class implementation MUST be a passthrough that returns the record unmodified.
 - **REQT-1.0.4**/pj4jv8zq0v: COMPLETED: MUST be synchronous (returns `TLike`, not `Promise<TLike>`).

### REQT-1.1/5rsshp821f: COMPLETED: **beforeUpdate Hook**

#### Purpose: Governs the beforeUpdate hook's behavior and contract. Applied when implementing or modifying data updates in a DelegatedDataContract subclass, or when reviewing how updated records are prepared before on-chain datum construction.

 - **REQT-1.1.1**/hx6knbqcve: COMPLETED: MUST call `beforeUpdate(record, context)` after merging the existing on-chain record with the updated fields, but before constructing the updated on-chain datum.
 - **REQT-1.1.2**/76xh3h4fsk: COMPLETED: MUST pass an `updateContext<T>` containing `{ original: T, activity: isActivity }` where `original` is the pre-update on-chain record typed as the on-chain type `T`.
 - **REQT-1.1.3**/t9qqwr26db: COMPLETED: The base class implementation MUST be a passthrough that returns the record unmodified.
 - **REQT-1.1.4**/4sfsjy0t0p: COMPLETED: MUST be synchronous (returns `TLike`, not `Promise<TLike>`).

## Component: After-Hooks

### REQT-2.0/1q0vd26stf: BACKLOG: **afterCreate Hook**

#### Purpose: Governs the afterCreate hook's behavior and contract. Applied when planning or implementing post-submission side effects for record creation, or when reviewing the data controller's extensibility surface.

 - **REQT-2.0.1**/m0mh9yd6z3: BACKLOG: MUST fire after the create transaction has been successfully submitted to the network (not merely built).

## Files

1. `./DelegatedDataContract.ts`

## Implementation Log

Meta-requirements: maintainers MUST NOT modify past details in the implementation log (e.g. in response to architectural changes). Instead, future changes should be appended to the implementation log to show the progression of the implementation and architecture.

### Phase 1: Before-Hooks (Completed)

 - `beforeCreate` and `beforeUpdate` hooks implemented as synchronous data transforms on `DelegatedDataContract`
 - `createContext<TLike>` and `updateContext<T>` types exported as public API
 - Both hooks integrated into `txnCreatingRecord()` and `txnUpdatingRecord()` pipelines respectively
 - Base class implementations are identity passthroughs

#### Next Recommendations

1. **afterCreate / afterUpdate**: Implement post-submission hooks (REQT-2.0). Requires deciding where in the submission pipeline they fire — likely in `submitTxnWithBlock()` or a callback from it.
2. **Expand REQT-2.0**: Add detailed sub-requirements for afterCreate once the submission-callback pattern is designed. Add parallel REQT-2.1 for afterUpdate.
3. **Testing guide**: Document hook testing patterns in `reference/essential-stellar-testing.md`.

---

# Release Management Plan

## v1 (Current)

 - **Goal**: Formal requirements for existing before-hooks
 - **Criteria**:
     - Before-hook requirements documented (REQT-1.0, REQT-1.1)
     - Existing implementation verified against requirements

## v2 (Planned)

 - **Goal**: After-hook requirements and implementation
 - **Criteria**:
     - afterCreate and afterUpdate requirements fully specified (REQT-2.0 expanded, REQT-2.1 added)
     - After-hooks implemented and tested
