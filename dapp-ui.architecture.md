# Dapp UI Layer - Architecture

*React-based UI components for Cardano dApp interaction: wallet integration, transaction batch review/submission, charter status monitoring, and delegated data form management.*

## Interview Status

- **Phase**: Initial draft (pre-interview)
- **Checkpoint**: not yet reached

> **Parent architecture**: `stellar-contracts.architecture.md` (ARCH-095eskacgk: UI Layer)
> This document elaborates the UI Layer subsystem. Network-side batch submission components (BatchSubmitController, TxSubmitMgr) are documented here because their lifecycle is tightly coupled to the UI workflow, though they reside under `src/networkClients/`.

---

## The Tension

**Bridging blockchain latency with continuous user workflow**: Cardano transactions take 20+ seconds to confirm. Multi-transaction operations (bootstrap, upgrades, batch data creation) involve linked transactions that must be submitted in order. The UI must let users review, sign, and monitor these batches without blocking further work — and ideally allow queuing a next batch while the current one is still confirming.

**Key sub-tensions**:
- **Batch review**: Users need to see all transactions in a group before committing, not face one-at-a-time wallet prompts
- **Workflow continuity**: After submitting a batch, the user should be able to continue working — not wait for confirmations
- **State visibility**: In-flight batches need lightweight status indicators; detailed views available on demand
- **Error recovery**: Failed transactions in a batch need clear diagnosis and retry paths

---

## Components and Concerns

| ARCH-UUT | Name | Location | Summary |
|----------|------|----------|---------|
| ARCH-he5h8a4jr7 | CapoDappProvider | local (browser) | Main React provider: wallet, Capo instance, network setup, batch context |
| ARCH-vwk9zvhk7t | CapoDappProviderContext | local (browser) | React context + hook for accessing provider/Capo from child components |
| ARCH-n0j0s4pe2y | Batch Submission UI | local (browser) | Master/detail transaction viewer with review, sign, and status controls |
| ARCH-m3vaz21bvw | CharterStatus Dashboard | local (browser) | Capo deployment status, delegate health, upgrade detection |
| ARCH-g2yhvcexpg | FormManager | local (browser) | HTML form state management bound to delegated data record types |
| ARCH-bsyqcx5a2c | TxBatcher | local (browser) | Batch lifecycle manager: rotation, cancellation, event emission |
| ARCH-wseeqb33f7 | RateMeterGauge | local (browser) | SVG gauge visualizing rate-limiter metrics (Blockfrost API usage) |

**Also referenced** (detailed in parent doc or Network Clients):

| ARCH-UUT | Name | Location | Summary |
|----------|------|----------|---------|
| ARCH-ave88ttd4j | BatchSubmitController | local | Per-batch state machine: pending → building → signing → submitting → confirming → confirmed |
| ARCH-7afjap9jp5 | TxSubmitMgr | local | Per-submitter transaction submission with retry/backoff |
| ARCH-77zaaxqrtk | TxSubmissionTracker | local | Per-transaction state tracking across multiple submitters |

### Concerns Summary

| Concern | Type | Owner | Dependents |
|---------|------|-------|------------|
| Batch lifecycle (rotation, active/previous slots) | resource | TxBatcher | Batch Submission UI, CapoDappProvider |
| Per-batch state machine | resource | BatchSubmitController | Batch Submission UI, TxBatcher |
| Transaction review panel state | artifact | Batch Submission UI | (UI-internal) |
| Charter deployment status | artifact | CharterStatus Dashboard | (UI-internal) |
| Form field state (delegated data) | resource | FormManager | (UI-internal) |
| React provider context | resource | CapoDappProviderContext | all UI components |

---

### Components

#### ARCH-he5h8a4jr7: CapoDappProvider

**Location**: local (browser)
**Primary source**: `src/ui/CapoDappProvider.tsx` (93KB)

**Activities**:
- Provides React context wrapping Capo instance, wallet connection, and network client
- Initializes TxBatcher and batch submission infrastructure
- Manages wallet connect/disconnect lifecycle
- Polls for Capo instance changes (2-second interval)
- Exposes typed access to Capo and provider via `useCapoDappProvider<C>()` hook

**Concerns**:
- Owns **provider lifecycle** — initializes Capo, wallet, network, batcher
- Depends on **Capo** (ARCH-81tfqtwvza) — uses Capo instance for all on-chain operations
- Depends on **network context envelope** (ARCH-rda51wm28b) — hot-swappable network client
- Depends on **actor context envelope** (ARCH-38nq3q5bx8) — wallet/actor identity
- Depends on **UILoggerProvider** (ARCH-ex4h6pc08v) — wraps children in `LoggerProvider`, threading `LoggerContext` to Capo instances and exposing `useLogger()` hook to all child components
- Depends on **BrowserLogPipeline** (ARCH-8w01jpfvsw) — routes stellog output to styled browser console

**Logging integration** (detailed in `src/loggers/testLogging.architecture.md`):
CapoDappProvider wraps its children in `UILoggerProvider`, which creates a `LoggerContext` (ARCH-28b90zs38k) with browser-appropriate output via `BrowserLogPipeline`. This LoggerContext is threaded to Capo instances via `setup.loggerContext` (required on SetupInfo). React components access logging via `useLogger(facility?)` hook. The same LoggerContext hot-swap wrapper pattern is used in both test and UI contexts.

---

#### ARCH-vwk9zvhk7t: CapoDappProviderContext

**Location**: local (browser)
**Primary source**: `src/ui/CapoDappProviderContext.ts` (2.5KB)

**Activities**:
- Defines `CapoDappProviderContext` (React Context)
- Provides `useCapoDappProvider<C>()` hook with typed Capo access
- Tracks mount state and generates unique component IDs

**Concerns**:
- Owns **React provider context** — the context object consumed by all child components
- Depends on **CapoDappProvider** — wraps and re-exposes its state

---

#### ARCH-n0j0s4pe2y: Batch Submission UI

**Location**: local (browser)
**Primary sources**: `src/ui/TxBatchUI.tsx` (9.6KB), `src/ui/TxBatchViewer.tsx` (28KB)

**Activities**:
- Displays transaction count and aggregate status for current batch
- Provides master/detail view: list of transactions + selected transaction details
- Shows review panel for inspecting transaction contents before signing
- Manages detail panel visibility (expanded during review → collapsed after submission)
- Provides cancel and close controls with confirmation guards
- Subscribes to BatchSubmitController events for live status updates

**Concerns**:
- Owns **transaction review panel state** — which tx is selected, detail view expanded/collapsed
- Depends on **batch lifecycle** — subscribes to `TxBatcher.$notifier` for rotation events
- Depends on **per-batch state machine** — subscribes to `BatchSubmitController.$txChanges` for status updates

**UI State Transitions** (per batch):
```
[reviewing]  →  [signing]  →  [submitted/pending]  →  [confirmed ✓]
   ↑ detail panel expanded        ↑ collapse to indicator    ↑ checkmark
```

---

#### ARCH-m3vaz21bvw: CharterStatus Dashboard

**Location**: local (browser)
**Primary source**: `src/ui/CharterStatus.tsx` (18KB)

**Activities**:
- Loads and displays charter data via `capo.findCharterData()`
- Detects needed upgrades via `capo.mkTxnUpgradeIfNeeded()`
- Renders manifest entries with delegate health status
- Shows core delegate info (mint, spend) and data-policy delegates
- Flags delegates needing on-chain script updates

**Sub-components**:
- `CharterHighlights` — loads delegates and renders manifest entries
- `DelegatedDataPolicyItem` — per-data-policy delegate status
- `CoreDelegateHighlightItem` — mint/spend delegate status with UUT and address info

**Concerns**:
- Depends on **Capo** — queries charter data and delegate state
- Depends on **indexed UTxOs** (ARCH-pt3qaa3zm4) — reads cached on-chain state

---

#### ARCH-g2yhvcexpg: FormManager

**Location**: local (browser)
**Primary source**: `src/ui/FormManager.ts` (4.7KB)

**Activities**:
- Binds to HTML form elements via callback ref
- Tracks field changes for delegated data record editing
- Provides `getFieldError()` for validation feedback
- Typed to work with specific `DelegatedDataContract<Data, DataLike>` types

**Concerns**:
- Owns **form field state** — tracks current form values and errors
- Depends on **CapoDappProvider** — accesses provider for record operations
- **Incomplete**: record lookup via `findRecords()` is stubbed (TODO in code)

---

#### ARCH-bsyqcx5a2c: TxBatcher

**Location**: local (browser)
**Primary source**: `src/networkClients/TxBatcher.ts` (4.5KB)

**Activities**:
- Manages batch lifecycle: lazy-creates current batch, holds previous batch reference
- Implements **batch rotation**: moves current → previous, creates fresh batch
- Guards rotation: only rotates when current batch is `confirmed` or `failed`
- Implements cancellation: destroys both batches, resets with fresh one
- Emits `rotated` event for UI subscription

**Concerns**:
- Owns **batch lifecycle** (active batch + previous batch slots) — the rotation mechanism
- Depends on **BatchSubmitController** — creates and manages per-batch state machines
- Depends on **TxChainBuilder** (external, `@helios-lang/tx-utils`) — virtual UTxO sets for chained txs

---

#### ARCH-wseeqb33f7: RateMeterGauge

**Location**: local (browser)
**Primary source**: `src/ui/RateMeterGauge.tsx` (12KB)

**Activities**:
- Renders circular SVG gauge showing Blockfrost API rate-limiter usage
- Subscribes to CachedUtxoIndex event emitter for rate metrics

**Concerns**:
- Depends on **UtxoIndex** (ARCH-pt3qaa3zm4) — reads rate-limiter metrics

---

## Interfaces

| ARCH-UUT | Interface | Mechanism | Direction | Payload |
|----------|-----------|-----------|-----------|---------|
| ARCH-0vdvzcxen6 | TxBatcher → Batch Submission UI | event emitter | TxBatcher initiates | `rotated` event with new BatchSubmitController |
| ARCH-kjhp5tzd27 | BatchSubmitController → Batch Submission UI | event emitter | Controller initiates | `txAdded`, `statusUpdate`, `txListUpdated` events |

### ARCH-0vdvzcxen6: TxBatcher → Batch Submission UI

**Mechanism**: EventEmitter (`$notifier`)
**Direction**: TxBatcher initiates on rotation
**Payload**: `rotated` event carrying the new `BatchSubmitController` instance
**Errors**: None — event-driven, fire-and-forget

### ARCH-kjhp5tzd27: BatchSubmitController → Batch Submission UI

**Mechanism**: EventEmitter (`$txChanges`)
**Direction**: Controller initiates on state changes
**Payload**:
- `txAdded`: new `TxSubmissionTracker` added to batch
- `statusUpdate`: aggregated state strings (e.g., `"3 submitting"`, `"2 confirmed"`)
- `txListUpdated`: full controller reference for re-render
- `destroyed`: controller being torn down
**Errors**: None — event-driven

---

## Data Flow

### Data Transformations: On-chain Data ↔ UI Presentation

#### ARCH-taw0vq89mb: Data Forms Transform

**Direction**: Bidirectional
**Purpose**: Transform between on-chain strict types and HTML form values

**Inbound (on-chain → form)**:
1. Bridge `readData()` produces strict type `T` (from UPLC cast)
2. Form transform converts strict type fields to HTML-compatible primitives (strings, numbers)
3. Form inputs display these values for user editing

**Outbound (form → on-chain)**:
1. User edits produce HTML form values (strings, numbers)
2. Form transform converts these to the **permissive type** (`TLike`) — the shape that the Helios cast accepts
3. Bridge `mkData()` converts permissive type to UPLC for on-chain storage

```
[UPLC datum] → [bridge.readData() → strict T] → [form transform → strings/numbers]
                                                         ↕ user edits
[UPLC datum] ← [bridge.mkData() ← permissive TLike] ← [form transform ← strings/numbers]
```

**Key concept**: The strict type (`T`) is what the bridge reads; the permissive type (`TLike`) is what the bridge accepts for writing. The form layer converts between these and HTML primitives. Each field type has its own conversion rules.

**Implementation status**: `FormManager` (`src/ui/FormManager.ts`) provides the skeleton — form binding, change tracking, React hook integration. The field-level strict↔primitive↔permissive transformations are to be completed.

#### ARCH-hk6t78td5b: Data Lists Transform

**Direction**: Inbound only (on-chain → display)
**Purpose**: Transform on-chain data for tabular/list display

1. Bridge `readData()` produces strict type `T` (from UPLC cast)
2. List transform converts to display-friendly representation for HTML tables or list components
3. UI renders the formatted data

```
[UPLC datum] → [bridge.readData() → strict T] → [list transform → display values]
```

**Implementation status**: Pattern exists in downstream dApps; framework-level support to be formalized.

---

### Workflow: Batch Review & Sign

**ARCH-UUT**: ARCH-n0j0s4pe2y

User reviews and signs a multi-transaction batch in the dApp UI.

1. **Application** builds transactions via `mkTxn*` methods → queued in `BatchSubmitController`
2. **Batch Submission UI** detects `txAdded` event → shows transaction count badge
3. **User** expands detail panel → `TxBatchViewer` renders master/detail list
4. **User** reviews each transaction's inputs, outputs, and metadata
5. **User** initiates signing → `BatchSubmitController` enters `signing` state
6. **Wallet** prompts for signature (batch-level, not per-transaction)
7. **BatchSubmitController** → `submitting` → `confirming` states
8. **Batch Submission UI** collapses detail panel → shows lightweight pending indicator
9. **BatchSubmitController** reaches `confirmed` → UI shows checkmark

```
[mkTxn* builds tx] → [BSC: pending → building → built]
                              ↓
                    [UI: badge shows "N Txns"]
                              ↓
                    [User: expand detail panel]
                              ↓
                    [User: review → sign]
                              ↓
                    [BSC: signing → submitting → confirming]
                              ↓
                    [UI: collapse panel → pending indicator]
                              ↓
                    [BSC: confirmed → UI: ✓ checkmark]
```

### Workflow: Batch Rotation

**ARCH-UUT**: ARCH-0vdvzcxen6

After a batch is submitted, the user can continue working and queue transactions in a next batch.

1. **BatchSubmitController** reaches `confirmed` (or `failed`) state
2. **User** (or application) triggers new transaction building
3. **TxBatcher** checks `canRotate()` — previous batch must be terminal
4. **TxBatcher** calls `rotate()`:
   - Moves `current` → `previous`
   - Creates new `BatchSubmitController` as `current`
   - Emits `rotated` event
5. **Batch Submission UI** receives `rotated` → updates to show new batch
6. **Previous batch** remains visible as lightweight status indicator (pending/confirmed)
7. **New batch** accepts queued transactions from continued user activity

```
[Batch A: confirmed ✓]     [User continues working]
         ↓                           ↓
[TxBatcher.rotate()]        [New transactions queued]
         ↓                           ↓
[Batch B: current]  ←←←←←  [Transactions enter Batch B]
[Batch A: previous, indicator only]
```

**Key principle**: Batch rotation decouples transaction confirmation latency from user workflow continuity. The user never waits for confirmations before starting new work.

---

## Collaboration Summary

**Uses** (from parent system):
- **Capo** (ARCH-81tfqtwvza) — data queries, transaction building, delegate access
- **StellarTxnContext** (ARCH-6rqaybkr3r) — transaction state accumulated by UI-triggered operations
- **Data Bridge System** (ARCH-0z6spstb0j) — typed data for display and form binding
- **UtxoIndex** (ARCH-pt3qaa3zm4) — cached UTxO data, rate-limiter metrics
- **Network Clients** (ARCH-bhdkyrr6wb) — TxSubmitMgr, TxSubmissionTracker for submission
- **Logging & Diagnostics** (ARCH-h9wp8jctkr) — UILoggerProvider (ARCH-ex4h6pc08v), BrowserLogPipeline (ARCH-8w01jpfvsw), LoggerContext (ARCH-28b90zs38k)

**Used by** (downstream):
- Application dApps import `stellar-contracts/ui` for React components
- Application-specific UI components extend FormManager and CharterStatus patterns

**Package export**: `stellar-contracts/ui` → `dist/ui.mjs`

---

## Open Questions

- [ ] FormManager record lookup (`findRecords`) is stubbed — what's the intended interaction pattern? Direct Capo query or cached via UtxoIndex?
- [ ] Should the detail panel auto-collapse on submission, or should the user explicitly dismiss it?
- [ ] How should batch rotation handle the case where a user queues transactions while a batch is still in `signing` state (not yet terminal)?
- [ ] The `ShowFailedActivity.tsx` component is marked deprecated — what replaces it for error display?
- [ ] `inPortal.tsx` — is portal rendering used for batch UI overlays or for other purposes?
- [ ] Should the batch review UI support editing/removing individual transactions before signing?
- [ ] **Delegate upgrade detection UI** (backlog): UtxoIndex already monitors the charter UTxO for changes, so the signal that a delegate has been upgraded is available. The UI needs a treatment for this — e.g., a notification dialog: "The policy for [data type] has been updated. Refresh to use the latest version." Open design questions: should it auto-refresh, prompt the user, or silently invalidate cached delegate instances? What happens to in-progress form data or queued transactions when the underlying policy changes?

---

## Discovery Notes

### Initial Draft Findings (pre-interview)

**Source files identified**:
- `src/ui/CapoDappProvider.tsx` (93KB) — largest UI component, main provider
- `src/ui/TxBatchViewer.tsx` (28KB) — master/detail tx viewer
- `src/ui/CharterStatus.tsx` (18KB) — charter status dashboard
- `src/ui/RateMeterGauge.tsx` (12KB) — rate meter gauge
- `src/ui/TxBatchUI.tsx` (9.6KB) — batch UI container
- `src/ui/FormManager.ts` (4.7KB) — form state management
- `src/ui/CapoDappProviderContext.ts` (2.5KB) — React context
- Additional: Button, Progress, PendingTxn, ClientSideOnly, inPortal, ThemedBackgroundDecorations, DashboardTemplate

**Batch submission state machine** (BatchSubmitController):
States: `pending → building → built → signing → submitting → confirming → confirmed`
Alternative paths: `failed` (with retry), `mostly confirmed`, `not needed`, `nested batch`
Aggregate summaries: `$stateShortSummary`, `$stateInfoCombined` (e.g., `"3 submitting"`, `"2 confirmed"`)

**Per-submitter state machine** (TxSubmitMgr):
States: `submitting → confirming → softConfirmed → confirmed` (or `failed`)
Backoff strategies: gradual (1.27x, cap 60s), firm (1.61x)
Error detection: expiry, unknown UTxO, battle (fork) detection

**Batch rotation** (TxBatcher):
- Two slots: `current` (active) + `previous` (terminal/display-only)
- `canRotate()` checks terminal state (`confirmed` or `failed`)
- `rotate()` emits `rotated` event for UI subscription
- `cancel()` destroys both, resets fresh

**Stakeholder-identified architectural goals** (from conversation):
- Batch review: see all transactions before committing
- Post-submission: collapse to lightweight indicator, checkmark on confirmation
- Workflow continuity: queue next batch while previous is in-flight
- Batch rotation as key application-layer concept
