# About Capo — Auto-Setup and Delegate Lifecycle

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
> **hash.notice.reqt-consumer**: 5dddc026e9370dc8

> NOTE: See [reqm.SKILL.md](../skillz/reqm/reqm.SKILL.md); When managing requirements, you MUST follow the guidelines and conventions in that document, including expression of purpose/intended function as well as the detailed, formal requirements.

The Capo is the "leader" contract in the Stellar Contracts framework — the permanent address and minting policy for an entire contract suite. This requirements document covers a **focused scope**: the auto-setup flow that bootstraps and upgrades delegate policies during `mkTxnUpgradeIfNeeded()`.

When a Capo starts up, it checks whether each registered delegate needs installation or upgrade. This process involves a multi-transaction chain per delegate (queue change → create ref script → commit pending changes). When any transaction in this chain fails to submit (wallet funds, network error, user cancellation), the system must recover gracefully on next startup rather than getting stuck.

**Essential technologies**: TypeScript, Cardano UPLC, Helios.
**Related technologies**: `StellarTxnContext` (addlTxn pattern, `TxNotNeededError`), `DelegatedDataContract` (setupCapoPolicy), `mkTxnInstallPolicyDelegate`.

**Scope limitation**: This document does NOT cover the full Capo surface — chartering, minting, spending, settings, or the general delegation chain. It covers only the auto-setup orchestration in `mkTxnUpgradeIfNeeded()` and the resilience behaviors needed when partial failures leave orphaned state.

# Background

The auto-setup flow in `mkTxnUpgradeIfNeeded()` iterates over all registered delegate roles and calls `setupCapoPolicy()` on each data controller. Each controller's setup may produce up to three chained transactions via `includeAddlTxn`:

1. **Queue delegate change** — mints a UUT and updates the charter manifest with a pending change
2. **Create ref script** — stores the delegate's compiled script on-chain at the Capo address
3. **Commit pending changes** — activates the queued change, making it visible in the manifest

A post-loop `commitPendingChangesIfNeeded()` call handles freshly-queued changes from the current run. However, two failure scenarios produce orphaned state that the current flow does not recover from:

1. **Orphaned pending changes**: If the commit transaction (#3) fails but the queue transaction (#1) succeeded, the charter has a pending change that was never activated. On next run, `AlreadyPendingError` (extends `TxNotNeededError`) silently skips the delegate, leaving the orphaned change permanently uncommitted.

2. **Missing ref scripts**: Covered by `DelegatedDataContract` requirements (see REQT/c1c692bq30 Ref Script Backfill).

# Design Goals

#### General Approach
- Resilient recovery from partial transaction chain failures during auto-setup
- Minimal change to the existing orchestration — add recovery checks, don't restructure the loop
- Clear separation: Capo owns the orchestration and commit recovery; DelegatedDataContract owns ref script backfill

#### Specific Goals
1. **Orphaned Commit Recovery**: Clear orphaned pending changes before new delegate setup runs, preventing `AlreadyPendingError` from blocking the upgrade path.
2. **Idempotent Recovery**: Recovery operations produce `TxNotNeededError` when there is nothing to recover, ensuring no unnecessary transactions.
3. **Ordering Safety**: Recovery runs before the auto-setup loop so that delegates whose setup depends on previously-orphaned changes being committed can proceed.

# Must Read: Special Skills and Know-how

This section provides directives for proactive-research triggers. People and agents should use these to recognize the triggers for specialized material to be considered highly relevant, and to ensure they are properly primed before proceeding.

1. **Transaction chain failure modes**: When modifying the auto-setup flow or reviewing recovery logic, you MUST read `src/StellarTxnContext.ts` to understand `includeAddlTxn()` name uniqueness constraints and `TxNotNeededError` handling in `resolveMultipleTxns()`.
2. **Delegate installation internals**: When working on `mkTxnUpgradeIfNeeded` or `commitPendingChangesIfNeeded`, you MUST read the `mkTxnInstallPolicyDelegate` and `mkTxnQueuingDelegateChange` methods in `Capo.ts` to understand the three-transaction chain.

# Collaborators

- **USED BY Capo (auto-setup)**: `StellarTxnContext` (addlTxn orchestration, TxNotNeededError), `DelegatedDataContract` (setupCapoPolicy per-delegate setup).
- **Expected to USE Capo (auto-setup)**: Downstream dApps that register delegate roles and rely on auto-setup for deployment and upgrades.
- **First-class instances that USE Capo (auto-setup)**:
    - `DelegatedDataContract.setupCapoPolicy()` `EXPECTS REQT/nw1q658egr` (Pre-Loop Orphaned Commit) — depends on orphaned pending changes being cleared before per-delegate setup runs

# The Development Plan

We will start simple with essential requirements and develop incrementally to achieve key results, a bit at a time. Implementer should focus exclusively on achieving one incremental result at a time.

BACKLOGGED items SHOULD be considered in the structural design, but implementation MUST focus entirely on IN-PROGRESS requirements. COMPLETED requirements that are working MUST be retained in working order. NEXT requirements are those that can be implemented and work, based on having their dependencies already working or sufficiently stubbed.

# Functional Areas and Key Requirements

### 1. Auto-Setup Resilience
When the auto-setup flow encounters orphaned state from a previous partial failure, it recovers automatically before proceeding with new delegate setup. You experience a clean startup even after a previously-interrupted upgrade.

#### Key Requirements:
1. **Orphaned Commit Recovery**: Before any delegate setup runs, orphaned pending changes from a prior failed run are committed. If no orphaned changes exist, the recovery is silently skipped.
2. **AddlTxn Name Uniqueness**: The recovery commit and the post-loop commit use distinct addlTxn names to satisfy `includeAddlTxn()`'s uniqueness constraint.

# Detailed Requirements

## Component: Auto-Setup Orchestration

### REQT-1.0/nw1q658egr: IMPLEMENTED/NEEDS VERIFICATION: **Pre-Loop Orphaned Commit Recovery**
#### Purpose: Governs recovery from orphaned pending manifest changes before the auto-setup loop runs. Applied when reviewing the startup resilience path, or when debugging delegates that fail to install because a prior pending change blocks them.

 - **REQT-1.0.1**/2zg7em3xd1: IMPLEMENTED/NEEDS VERIFICATION: **Pre-Loop Commit Call** — `mkTxnUpgradeIfNeeded()` MUST call `commitPendingChangesIfNeeded()` (or equivalent) BEFORE entering the auto-setup delegate loop. This clears any orphaned pending changes from a previous failed run before new delegate setup begins.
 - **REQT-1.0.2**/5z56hybrdw: IMPLEMENTED/NEEDS VERIFICATION: **Clean Skip** — When no orphaned pending changes exist, the pre-loop commit MUST produce a `TxNotNeededError` and be cleanly skipped by the addlTxn resolution pipeline.
 - **REQT-1.0.3**/0crhes9x8a: IMPLEMENTED/NEEDS VERIFICATION: **Distinct AddlTxn Name** — The pre-loop commit MUST use a different addlTxn name than the post-loop `commitPendingChangesIfNeeded()` call (which uses `"commit pending charter changes"`). This satisfies `includeAddlTxn()`'s name uniqueness constraint and allows both commits to coexist in the same transaction context.

# Files

1. `./Capo.ts` — `mkTxnUpgradeIfNeeded()`, `commitPendingChangesIfNeeded()`

# Implementation Log

> Maintainers MUST NOT modify past entries. Append new entries only.

### Version 1.0

 - **created**: Initial focused requirements document covering auto-setup resilience. Scope limited to `mkTxnUpgradeIfNeeded()` orchestration and recovery from partial transaction chain failures. 3 requirements for pre-loop orphaned commit recovery. Origin: work unit 20260301.delegate-setup-backfill.

# Release Management Plan

## v1 (Current)
- **Goal**: Auto-setup resilience — recovery from partial failures
- **Criteria**:
    - Pre-loop orphaned commit recovery (REQT-1.0)
    - Clean skip when no recovery needed (REQT-1.0.2)

## v2 (Future)
- **Goal**: Broader Capo requirements coverage (if warranted)
- **Criteria**: TBD — depends on whether a full Capo reqts document is needed
