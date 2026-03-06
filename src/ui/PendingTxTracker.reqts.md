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



# Files

- `src/ui/PendingTxTracker.tsx` - PendingTxTracker component implementation

# Implementation Log

> Maintainers MUST NOT modify past entries. Append new entries only.


# Release Management Plan

See `release-management-scope.md` for version criteria and lifecycle management.
