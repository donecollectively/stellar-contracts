# About PendingTxTracker

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

A compact React component that uses live Dexie queries to reactively display pending transaction entries with graduated confidence visualization. Shows transaction lifecycle from submission through on-chain confirmation using colored Unicode symbols.

The essential technologies are **React, Dexie (liveQuery), PendingTxEntry (UtxoIndex types)**. Related technologies include Tailwind CSS, CachedUtxoIndex.


# Background

Cardano transactions have a multi-stage lifecycle: submitted → on-chain provisional → likely → confident → certain. Users need real-time visibility into where each pending transaction sits in this progression. The CachedUtxoIndex tracks this state in a Dexie pendingTxs table with confirmState and confirmationBlockDepth fields. This component provides a compact UI surface for that data using Dexie's liveQuery for reactive updates without polling.



# Design Goals

#### General Approach
- Reactive: subscribe to Dexie liveQuery so the display updates automatically as confirmation state changes
- Compact: horizontal dot display suitable for embedding in headers, status bars, or dashboards
- Accessible: Unicode symbols with CSS color (not emoji) for consistent rendering and screen-reader compatibility

#### Specific Goals
1. **Live Data Binding**: Subscribe to the pendingTxs table via Dexie liveQuery; no manual refresh needed.
2. **Graduated Confidence Visualization**: Distinct visual states for each confirmation stage using color progression.
3. **Compact Form Factor**: Each transaction is a single symbol; the full set reads left-to-right in time order.
4. **Detail on Demand**: Hover tooltip with tx hash, description, state, depth, and age; expandable detail planned for later.


# Must Read: Special Skills and Know-how


# Collaborators



**Expected users:** CapoDappProvider and downstream dApp dashboards that need transaction status visibility

# Functional Areas and Key Requirements

### 1. Data Binding
Reactive subscription to the Dexie pendingTxs table and state management for the component.

#### Key Requirements:
1. **Live Query Subscription**: The component MUST subscribe to the Dexie pendingTxs table via liveQuery and re-render when entries are added, updated, or removed.

### 2. Visual Representation
Mapping confirmation states to Unicode symbols and colors, layout ordering, and hover details.

#### Key Requirements:
1. **Confidence State Symbols**: Each pending transaction MUST be rendered as a single Unicode symbol whose color reflects its confirmation stage. Symbols MUST NOT be emoji — they MUST be geometric Unicode characters styled with CSS color.
2. **Time-Ordered Layout**: Transactions MUST be displayed in strict submission-time order with oldest on the left and most recent on the right.
3. **Hover Detail**: Each symbol MUST show a tooltip on hover containing the transaction hash prefix, description, confirmation state label, block depth (if confirmed), and submission age.
4. **Empty State**: The component MUST render nothing (return null) when there are no pending transaction entries.

### 3. Detail Panel
onClick interaction to display transaction detail (transcript, structure, diagnostics) using a shared TxDetailPanel component. Supports hybrid data sourcing: live TxSubmissionTracker when available (same session), Dexie PendingTxEntry when not (after reload).

#### Key Requirements:
1. **Click to Open Detail**: Clicking a pending transaction dot MUST open a detail panel showing transcript, structure, and diagnostics for that transaction.

### 4. Entry Lifecycle
Display lifecycle management for pending transaction entries, including age-based filtering to remove stale rolled-back entries.

#### Key Requirements:
1. **Rolled-Back Entry Age-Out**: Rolled-back transaction entries MUST be omitted from the display after 18 hours from submission time.


# Detailed Requirements

## Area 1: Data Binding

### **REQT-1.1.0/9e7bcgjwj9**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Live Query Subscription**
#### Purpose: Ensures the component reflects current pendingTxs state without manual refresh. Applied when reviewing data flow or diagnosing stale UI state.

 - 1.1.1: REQT-a893ynve57: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Subscription Lifecycle** - The liveQuery subscription MUST be created on mount and unsubscribed on unmount to prevent memory leaks and stale updates.
 - 1.1.2: REQT-h4q4phjfb6: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Database Name Prop** - The component MUST accept a dbName string prop and open its own DexieUtxoStore connection to the same IndexedDB database used by CachedUtxoIndex. It MUST NOT accept or depend on an externally-provided store instance.

## Area 2: Visual Representation

### **REQT-2.1.0/s9xta87hkb**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Confidence State Symbols**
#### Purpose: Governs the visual mapping from confirmation state to display. Applied when reviewing accessibility, color contrast, or adding new confirmation states.

 - 2.1.1: REQT-4p1fvt8tbr: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Symbol Mapping** - MUST use the following symbol and color mapping: pending → ◑ grey (#9ca3af), provisional → ● grey (#9ca3af), likely → ● white (#e5e7eb), confident → ● green (#22c55e), certain → ● dark green (#15803d), rollback-pending → ✗ grey (#9ca3af), rolled-back → ✗ red (#ef4444).

### **REQT-2.2.0/9fhnzz9648**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Time-Ordered Layout**
#### Purpose: Ensures consistent spatial mapping from time to position. Applied when reviewing layout or adding grouping features.

 - 2.2.1: REQT-49zze9kjys: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Sort by submittedAt** - The component MUST sort entries by submittedAt ascending so the leftmost dot is the oldest transaction and the rightmost is the most recent.

### **REQT-2.3.0/8346qtp4vt**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Hover Detail**
#### Purpose: Provides detail-on-demand without expanding the compact form. Applied when reviewing information density or accessibility.


### **REQT-2.4.0/k8kvnc6czs**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Empty State**
#### Purpose: Prevents rendering noise when there are no pending transactions.


## Area 3: Detail Panel

### **REQT-3.1.0/3r5g35smyn**: **NEXT**/draft: **Click to Open Detail**
#### Purpose: Enables drill-down from the compact dot display into full transaction detail. Applied when implementing the onClick handler, the detail panel mounting, or reviewing the interaction model.

 - 3.1.1: REQT-1vv5gwk3wd: **NEXT**/draft: **Hybrid Data Sourcing** - The detail panel MUST use live TxSubmissionTracker data when a tracker is available for the transaction's txHash (same session, pre-terminal). MUST fall back to Dexie PendingTxEntry data (buildTranscript, txStructure, signedTxStructure, submissionLog) when no live tracker exists (after page reload or tracker destruction). The lookup MUST use txBatcher.findTracker(txHash) to locate live trackers.
 - 3.1.2: REQT-y8rnvqmgza: **NEXT**/draft: **TxDetailPanel Component** - The detail panel MUST be implemented as a shared TxDetailPanel component (refactored from ShowTxDescription in TxBatchViewer) that accepts a normalized props interface. Both TxBatchViewer and PendingTxTracker MUST use this component. The component MUST support transcript, structure, and diagnostics tabs.
 - 3.1.3: REQT-68k790rq7g: **NEXT**/draft: **Persisted Transcript Tab** - The detail panel MUST show the build transcript and submission event log for the transaction, whether sourced from a live tracker or from persisted Dexie data.
 - 3.1.4: REQT-favjamnnwj: **NEXT**/draft: **Persisted Structure and Diagnostics Tabs** - The detail panel MUST show transaction structure and signed transaction diagnostics, whether sourced from a live tracker or from persisted Dexie data.

## Area 4: Entry Lifecycle

### **REQT-4.1.0/7e7thbzywv**: **NEXT**/draft: **Rolled-Back Entry Age-Out**
#### Purpose: Prevents stale rolled-back entries from persisting in the display indefinitely. Applied when reviewing entry lifecycle, display filtering, or diagnosing entries that should have disappeared.



# Files

- `src/ui/PendingTxTracker.tsx` - PendingTxTracker component implementation
- `src/ui/TxDetailPanel.tsx` - Shared transaction detail panel component, refactored from ShowTxDescription in TxBatchViewer. Supports dual-source data model (live tracker or persisted Dexie entry).

# Implementation Log

> Maintainers MUST NOT modify past entries. Append new entries only.


# Release Management Plan

See `release-management-scope.md` for version criteria and lifecycle management.
