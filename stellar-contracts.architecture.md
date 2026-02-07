# Stellar Contracts - Architecture

*A TypeScript framework for building upgradeable, multi-contract Cardano smart contract applications with type-safe on-chain/off-chain data bridging, modular delegation, and comprehensive development tooling.*

## Interview Status

- **Phase**: 4 (Component Identification) — complete
- **Checkpoint**: not yet reached
- **Next**: Phase 5 (Synthesis). **Priority**: Deep interview on multi-purpose script pattern (withdraw-zero) before synthesis — flagged as #1 in recommendations.

> **Git Reference**: Based on commit `bbe3fea` (emulator: explicated and fixed stable actorContext envelope expectation)
> Use `git diff bbe3fea..HEAD -- ...files` to see changes since this doc was written.

---

## The Tension

**Framework cohesion across a multi-layered system**: Stellar Contracts spans on-chain policy enforcement (Helios), off-chain transaction orchestration (TypeScript), build-time code generation, testing infrastructure, network clients, and UI components. The architectural challenge is maintaining clear component boundaries and ownership while enabling the tight integration required for type-safe blockchain development. Each layer has distinct constraints (on-chain size limits, off-chain performance, build-time generation) yet must interoperate seamlessly.

**Key sub-tensions**:
- **Read vs Write path performance**: Reading on-chain data should not require expensive script compilation; writing transactions does
- **Upgrade safety**: Delegates must be swappable without data migration or address changes
- **Developer experience**: On-chain type definitions must automatically flow into off-chain TypeScript types and data bridges
- **Test performance**: Full integration tests with emulated blockchain must execute quickly via snapshot caching

---

## Components and Concerns

| ARCH-UUT | Name | Location | Summary |
|----------|------|----------|---------|
| ARCH-81tfqtwvza | Capo | local | Leader contract orchestrating delegates, charter data, manifests, and data queries |
| ARCH-wn7spd6z56 | StellarContract | local | Base contract framework providing script management, compilation, and data bridge access |
| ARCH-6rqaybkr3r | StellarTxnContext | local | Transaction building context with typed state accumulation and multi-tx queuing |
| ARCH-tk43zgem2r | Delegate System | local | Modular contract delegation framework with roles, lifecycle, and upgrade support |
| ARCH-0z6spstb0j | Data Bridge System | local | Build-time-generated UPLC-to-TypeScript translation layer |
| ARCH-b75126b13n | Script Bundle System | local | Helios script compilation, caching, and precompiled bundle management |
| ARCH-8k1yyw2p19 | CapoMinter | local | Minting policy management for charter tokens, UUTs, and delegate tokens |
| ARCH-kv7d1dp56c | Testing Infrastructure | local | Emulated blockchain testing with snapshot caching and deterministic wallets |
| ARCH-pt3qaa3zm4 | UtxoIndex | local (browser) | Persistent UTxO caching with Blockfrost/IndexedDB backend |
| ARCH-bhdkyrr6wb | Network Clients | local | Transaction submission, batching, and confirmation tracking |
| ARCH-095eskacgk | UI Layer | local (browser) | React components for displaying/editing on-chain data and wallet integration |
| ARCH-cza3q9qn8z | Build Tooling | local (build-time) | Rollup plugins for Helios compilation, data bridge generation, and bundle creation |
| ARCH-6zc7jksakn | On-chain Policy Layer | on-chain | Helios smart contracts enforcing validation, authorization, and business logic |
| ARCH-h9wp8jctkr | Logging & Diagnostics | local | Structured logging with pino, performance instrumentation, and requirements tracing |

### Concerns Summary

System-level concerns (cross-cutting or bearing on external goals).

**On-chain ownership model**: Two dimensions of ownership apply to on-chain artifacts:
- **Runtime ownership** — where the artifact is stored on-chain and who directly enforces spending. Delegate UUTs are stored at each delegate's script address (runtime-owned by the delegate). Delegated data records are stored at the Capo address (runtime-owned by Capo).
- **Policy ownership** — who approves creation/modification through the delegation chain. CapoMinter's policy approves UUT creation. Data-record enforcement starts at Capo, then the delegation chain transfers responsibility to the current version of that record type's data-policy delegate.

**Why records live at the Capo address**: Storing all delegated data records at the Capo address (not at delegate script addresses) is a key enabler for delegate upgrades. After a delegate is upgraded, existing data UTxOs don't need to be touched — the next spending activity is enforced by the existing Capo and spend delegate, which bring in the *new* data-policy delegate for enforcement. This decouples data storage from policy versioning.

| Concern | Type | Owner | Dependents |
|---------|------|-------|------------|
| Charter data (including manifest) | artifact | Capo | Delegate System, CapoMinter, UtxoIndex |
| Delegate UUTs | artifact | Delegate System (runtime) / CapoMinter (policy) | Capo, On-chain Policy Layer |
| Delegated data records | artifact | Capo (runtime) / data-policy delegates (enforcement) | Data Bridge System, UtxoIndex, UI Layer |
| Precompiled script details | artifact | Build Tooling | Script Bundle System, Capo |
| Generated type info & bridges | artifact | Build Tooling | Data Bridge System, StellarContract |
| Transaction state (`S extends anyState`) | resource | StellarTxnContext | Capo, Delegate System, Network Clients |
| Snapshot chain | artifact | Testing Infrastructure | (testing only) |
| Indexed UTxOs | artifact | UtxoIndex | Capo, UI Layer |
| Compilation cache | resource | Script Bundle System | Testing Infrastructure, Build Tooling |
| Diagnostic log output | artifact | Logging & Diagnostics | all components |
| On-chain validation logic | artifact | On-chain Policy Layer | Build Tooling, Script Bundle System |
| Network context envelope | resource | StellarContract (setup) | Capo, all delegates, UtxoHelper, Testing Infrastructure |
| Actor context envelope | resource | StellarContract (setup) | Capo, all delegates, UtxoHelper, Testing Infrastructure |
| Logger context envelope | resource | Logging & Diagnostics (definition); created by: CapoDappProvider/UILoggerProvider (UI), createTestContext/beforeEach (test) | all components (consumers) |

### ARCH-e6xmrs6wmm: Hot-Swap Envelope Pattern

A foundational cross-cutting pattern used for shared runtime contexts. A **hot-swap envelope** is a stable outer reference object shared by many components; the contents inside can be replaced without updating any of the holders.

**Envelopes in use**:

| Envelope | Contents | Swapped when |
|----------|----------|-------------|
| **Network context** (ARCH-rda51wm28b) | The `ReadonlyCardanoClient` implementation (emulator, CachedUtxoIndex, Blockfrost) | Test: swap to emulator. Production: swap to real network or cached index. |
| **Actor context** (ARCH-38nq3q5bx8) | Current wallet/actor reference | Test: swap between actors (tina, tom, tracy). Production: wallet connect/disconnect. |
| **Logger context** (ARCH-28b90zs38k) | The `StellarLogger` instance inside a `LoggerContext` wrapper | Test: swapped at each `beforeEach` (new logger per test, pointing to file/focused destination). UI: created once at `UILoggerProvider` mount; swapped if user enters support mode (e.g., redirect to server-side logging). |

**How it works**: The envelope is a shared object reference (not cloned) held by Capo, every `DelegatedDataContract`, every delegate, and `UtxoHelper` — all via the `setup` object on `StellarContract`. When the envelope's contents are replaced, all holders see the new contents immediately without needing to be updated individually.

**Why it matters**:
- **Testing**: Swap the network to an emulator and rotate wallet references between test actors, all without reconstructing the contract instances
- **Runtime flexibility**: Provide the appropriate logger (browser, node, test) through the same mechanism — all downstream code uses the logger abstractly regardless of environment
- **No cloning**: Components hold references to the envelope, not copies. A single swap propagates to all consumers.

**Detailed treatment**: The actor context envelope is documented in depth in `src/testing/emulator/Emulator.ARCHITECTURE.md` (ARCH-y70gqh4nwn, REQT/ch01gxgm4g). The logger context envelope is documented in `src/loggers/testLogging.architecture.md` (LoggerContext hot-swap wrapper, ARCH-28b90zs38k).

---

### Components

#### ARCH-81tfqtwvza: Capo

**Location**: local
**Primary source**: `src/Capo.ts` (229KB)
**On-chain counterpart**: `src/DefaultCapo.hl`

**Activities**:
- Orchestrates delegate lifecycle (install, upgrade, retire)
- Manages charter data and manifest entries
- Queries delegated data UTxOs (read path with `readOnly` optimization)
- Coordinates transaction building across delegates
- Caches delegate instances for reuse (`_delegateCache`)
- Connects delegates with on-chain role-delegation links
- Manages settings via manifest-referenced `currentSettings`

**Concerns**:
- Owns **charter data including manifest** (`CharterData` datum at Capo address) — root configuration for entire contract suite; manifest maps token references to roles/data policies/settings
- Owns **delegated data records** (runtime — stored at Capo address) — on-chain enforcement starts here, then delegates to data-policy via chain of custody
- Owns **delegate cache** (`_delegateCache`) — runtime cache of connected delegate instances
- Depends on **delegate UUTs** — uses minted tokens to identify and connect delegates
- Depends on **precompiled script details** — uses build-time hashes to skip compilation on read path
- Contributes to **diagnostic log output** — performance marks for `findCapoUtxos`, `findCharterData`, `getDgDataController`

**Sub-component architecture**: `src/offchainRuntime.ARCHITECTURE.md` (covers read/write path optimization in detail)

---

#### ARCH-wn7spd6z56: StellarContract

**Location**: local
**Primary source**: `src/StellarContract.ts` (64KB)

**Unifying principle**: StellarContract is the base class for anything that **has an on-chain policy script** — Capo (validator), CapoMinter (minting policy), and all contract-backed delegates. One degenerate case exists: the wallet-based authority delegate extends StellarContract but does not use a contract script; authority is enforced by **spending** (not merely holding) a UUT from the authority wallet, with the token returned to the same wallet.

**Activities**:
- Provides base class for all contract instances (Capo, delegates, data controllers)
- Manages script bundle lifecycle (`getBundle`, `mkScriptBundle`)
- Provides compiled script access (`asyncCompiledScript`, `compiledScript`)
- Computes validator hashes (`validatorHash`, `mintingPolicyHash`)
- Exposes data bridge access (`onchain`, `offchain`, `reader`)
- Creates transaction contexts (`mkTcx`)
- Exposes `UtxoHelper` to all subclasses via setup object — predicate-based UTxO search and filtering

**Concerns**:
- Owns **script bundle instance** (per-contract `HeliosScriptBundle`) — lifecycle from creation through compilation
- Owns **UtxoHelper** (`src/UtxoHelper.ts`) — in-memory UTxO search/filter available to all subclasses; operates on whatever UTxO set is provided by the network interface
- Depends on **generated type info & bridges** — uses build-time generated `.bridge.ts` and `.typeInfo.d.ts` files
- Depends on **compilation cache** — defers to `CachedHeliosProgram` for cross-process compile caching
- Depends on **network interface** — any `ReadonlyCardanoClient` implementation (CachedUtxoIndex, Blockfrost, emulator) provides on-chain state access

---

#### ARCH-6rqaybkr3r: StellarTxnContext

**Location**: local
**Primary source**: `src/StellarTxnContext.ts` (82KB)

**Activities**:
- Accumulates typed transaction state (`S extends anyState`)
- Tracks inputs, outputs, and reference inputs with local reflection
- Queues additional transactions for multi-tx workflows (`addlTxns`)
- Manages validity periods and time constraints
- Coordinates with TxChainBuilder for virtual UTxO sets across chained transactions

**Creation pattern**: Typically created by Capo or a `DelegatedDataContract` via `mkTcx()`. The context then carries typed state through the `@txn` or `@partialTxn` method's well-typed data flow — each method call refines the type `S` to encode accumulated preconditions.

**Concerns**:
- Owns **transaction state** (`state: S`) — typed state accumulator encoding preconditions
- Owns **I/O tracking** (`inputs[]`, `outputs[]`, `txRefInputs[]`) — local reflection of transaction contents
- Owns **additional transactions queue** (`addlTxns` in state) — queued transaction descriptions
- Depends on **TxBuilder** (external, `@helios-lang/tx-utils`) — low-level transaction construction
- Depends on **TxChainBuilder** (external, `@helios-lang/tx-utils`) — virtual UTxO set for chained txs

**Sub-component architecture**: `StellarTxnContext.architecture.md` (covers typed state, multi-tx patterns, pizza-order example)

---

#### ARCH-tk43zgem2r: Delegate System

**Location**: local
**Primary sources**: `src/delegation/StellarDelegate.ts`, `src/delegation/ContractBasedDelegate.ts`, `src/delegation/DelegatedDataContract.ts`
**On-chain counterpart**: `src/delegation/BasicDelegate.hl`, `src/delegation/CapoDelegateHelpers.hl`

**Activities**:
- Defines delegate roles (mint, spend, govAuthority, named, data-policy)
- Creates and manages contract-backed delegate instances
- Implements CRUD operations on delegated data records (via `DelegatedDataContract`)
- Validates delegate authority via UUT spending (script-locked or wallet-held)
- Supports delegate upgrade lifecycle (queue pending change → commit)
- Manages `IsDelegation` datum linking UUTs back to Capo
- Enforces chain-of-custody delegation: minter → mint delegate → data-policy delegates

**Chain of custody**: Policy enforcement is not flat dispatch — it flows through two parallel delegation chains, each a chain of custody:

1. **Minting chain** (token creation at Capo's MPH): CapoMinter → mint delegate → data-policy delegate
2. **Spending chain** (UTxO spending at Capo address): Capo main script → spend delegate → data-policy delegate

The mint delegate and spend delegate are **often the same script** but are triggered in different chains by different on-chain events. The mint delegate never re-delegates to the spend delegate — they are parallel, not sequential. Each link validates its own concerns then delegates deeper to the data-policy delegate for record-specific enforcement. This is architecturally central to how business logic is modularized and upgraded independently.

**Concerns**:
- Owns **delegate UUTs** (runtime — each UUT stored at its delegate's script address; policy-approved by CapoMinter)
- Owns **delegated data records** (enforcement — data-policy delegates enforce record operations; records runtime-stored at Capo address)
- Owns **delegate role definitions** (`RolesAndDelegates`) — role-to-class mappings
- Owns **UUT naming** (`UutName`) — `dgPol-` prefix for delegates, `{idPrefix}-` for data records
- Depends on **charter data** — reads manifest to discover role assignments

**Delegate role hierarchy**:
- `StellarDelegate` — base class (no on-chain script)
  - Wallet-based authority delegate — UUT spent from wallet (wallet signs), token returned to wallet
- `ContractBasedDelegate` — has on-chain script (`usesContractScript: true`)
  - Mint delegate — `CreatingDelegatedData`, token lifecycle
  - Spend delegate — `UpdatingDelegatedData`, `DeletingDelegatedData`, policy enforcement
  - `DelegatedDataContract<T, TL>` — per-record-type controller with typed datum access

---

#### ARCH-0z6spstb0j: Data Bridge System

**Location**: local (generated at build time)
**Primary source**: `src/helios/dataBridge/DataBridge.ts`
**Generated files**: `*.bridge.ts`, `*.typeInfo.d.ts`

**Activities**:
- Converts on-chain UPLC data structures to TypeScript types (reading)
- Converts TypeScript types to on-chain UPLC data (writing)
- Provides pre-generated cast functions that work without compiled scripts
- Generates enum bridges for activity/redeemer types
- Supports CIP-68 Map-based datum parsing

**Concerns**:
- Owns **bridge cast functions** (per-type UPLC ↔ TS converters) — generated at build time, no runtime compilation needed
- Depends on **generated type info & bridges** — produced by Build Tooling's rollup plugin
- Depends on **on-chain type definitions** — Helios `.hl` struct/enum definitions drive bridge generation

**Key insight**: Data bridges are the reason the read path can skip compilation. Cast functions are generated at build time from Helios type definitions and embedded in `.bridge.ts` files. Reading data only needs these casts, not the compiled validator script.

---

#### ARCH-b75126b13n: Script Bundle System

**Location**: local
**Primary sources**: `src/helios/scriptBundling/HeliosScriptBundle.ts`, `src/helios/CachedHeliosProgram.ts`

**Language-abstraction boundary**: The script bundle base class (`HeliosScriptBundle`) mediates all access to compiled scripts, hash resolution, and program management. Architecturally, this is an intentional abstraction point that could support alternative scripting languages (Aiken, Plutarch, etc.) via alternative bundle implementations. The coupling to Helios is less deep than it appears: the framework depends heavily on the Helios *platform libraries* (`@helios-lang/ledger` types, `tx-utils`, UPLC executor) but is not strictly reliant on the Helios *scripting language* at the same level of pervasiveness. An alternative language can compile to UPLC and use the Helios UPLC executor for transaction validation before chain submission. The data bridge generator and rollup plugins are the areas of deepest Helios-language coupling.

**Activities**:
- Manages script compilation and UPLC caching (currently Helios-specific)
- Resolves script hashes via priority chain: on-chain ref → precompiled → JIT cache → compile
- Provides `configuredScriptDetails` from precompiled bundles (zero-compile startup)
- Implements cross-process compilation locking (`proper-lockfile`)
- Tracks source hashes for cache invalidation

**Concerns**:
- Owns **compilation cache** (`CachedHeliosProgram` with FS/IndexedDB backends) — cross-process safe
- Owns **precompiled script details** (`configuredScriptDetails` on bundle instances) — build-time computed hashes and configs
- Depends on **Helios compiler** (external, `@helios-lang/compiler`) — Helios → UPLC compilation

**Script hash resolution chain** (`HeliosScriptBundle.scriptHash`):
1. `previousOnchainScript?.uplcProgram.hash()` — from on-chain reference
2. `configuredScriptDetails?.scriptHash` — from precompiled bundle
3. `alreadyCompiledScript?.hash()` — from JIT compilation cache
4. `compiledScript().hash()` — fallback: compile now (expensive)

**Bundle class hierarchy**:
- `HeliosScriptBundle` — base class
  - `CapoHeliosBundle` — Capo-specific (sets `configuredScriptDetails` from `precompiledScriptDetails.capo`)
  - `CapoDelegateBundle` — delegate base
    - `DelegatedDataBundle` — data controller bundle
    - `MintSpendDelegateBundle` — mint/spend delegate bundle

---

#### ARCH-8k1yyw2p19: CapoMinter

**Location**: local
**Primary source**: `src/minting/CapoMinter.ts`
**On-chain counterpart**: `src/minting/CapoMinter.hl`

**Activities**:
- Mints charter token and initial delegate UUTs during bootstrap
- Creates data-record UUTs for delegated data operations
- Burns tokens during delegate retirement and record deletion
- Defers day-to-day policy enforcement to mint/spend delegates

**Concerns**:
- Owns **delegate UUTs** (policy — approves creation/burning via minting policy; runtime ownership transfers to delegates at their script addresses)
- Depends on **charter data** — reads manifest for role verification
- Depends on **precompiled script details** — uses `precompiledScriptDetails.minter` for zero-compile `mintingPolicyHash`

---

#### ARCH-kv7d1dp56c: Testing Infrastructure

**Location**: local (development only)
**Primary sources**: `src/testing/CapoTestHelper.ts`, `src/testing/StellarTestHelper.ts`, `src/testing/emulator/`

**Activities**:
- Simulates Cardano blockchain with UTxO tracking (StellarNetworkEmulator)
- Manages hierarchical snapshot caching for fast test setup
- Provides deterministic wallet generation from PRNG seeds
- Orchestrates multi-layer test snapshots (bootstrap → Capo init → delegates → app)
- Manages namedRecords persistence across snapshots
- Supports hot-swap of network context via stable actorContext envelope

**Concerns**:
- Owns **snapshot chain** (hierarchical on-disk snapshots with hash invalidation) — `SnapshotCache`
- Owns **emulator state** (UTxO set, block chain, slot progression) — `StellarNetworkEmulator`
- Owns **actor wallets** (deterministic from PRNG seed) — `SimpleWallet_stellar`
- Depends on **compilation cache** — reuses compiled scripts across test runs
- Depends on **Capo** — instantiates test Capo instances within emulated network

**Sub-component architecture**: `src/testing/emulator/Emulator.ARCHITECTURE.md` (Phase Complete, deep interview complete; covers snapshot hierarchy, stable envelope pattern, instance lifetimes)

---

#### ARCH-pt3qaa3zm4: UtxoIndex

**Location**: local (browser)
**Primary source**: `src/networkClients/UtxoIndex/CachedUtxoIndex.ts`

**Activities**:
- Monitors Capo address for new transactions
- Fetches and caches UTxOs with Blockfrost API integration
- Catalogs delegate UUTs at their script addresses
- Detects charter UTxO changes during routine monitoring
- Converts Helios types to storage-agnostic `UtxoIndexEntry` at type boundary
- Implements `ReadonlyCardanoClient` for seamless Helios integration

**Concerns**:
- Owns **indexed UTxOs** (`DexieUtxoStore` / IndexedDB) — persistent browser-side cache
- Depends on **charter data** — monitors charter UTxO for changes
- Depends on **Blockfrost API** (external, remote) — REST queries for blockchain data (currently only provider)

**Backlog — architectural evolution**:
- **Alternative network provider (Ogmios)**: Decouple from Blockfrost; support Ogmios mini-protocol via the `@cardano-ogmios` TypeScript module. Same essential low-level queries, but connecting to any Cardano node via JSON-RPC rather than a hosted API.
- **Alternative storage backends (CouchDB/PostgreSQL)**: Server-side UTxO storage enabling an API service layer with low-latency access to subsets of UTxOs. A Capo may hold millions of UTxOs; clients should query only the subset they need.
- **Server-mediated sync**: Future feature where the client syncs not directly to Blockfrost/Ogmios but to a server providing: (a) client-specific filtering so the client doesn't process all historical Capo transactions, and (b) filtered incremental blocks/UTxOs for lightweight operational profile — critical for mobile applications.

**Sub-component architecture**: `src/networkClients/UtxoIndex/utxoIndex.ARCHITECTURE.md` (covers type boundary, ReadonlyCardanoClient conformance, single-address monitoring)

---

#### ARCH-bhdkyrr6wb: Network Clients

**Location**: local
**Primary sources**: `src/networkClients/TxSubmitMgr.ts` (34KB), `src/networkClients/BatchSubmitController.ts` (26KB), `src/networkClients/TxBatcher.ts` (4.5KB), `src/networkClients/TxSubmissionTracker.ts`

**Activities**:
- Manages per-submitter transaction lifecycle with retry/backoff (`TxSubmitMgr`)
- Coordinates per-batch state machine: pending → building → signing → submitting → confirming → confirmed (`BatchSubmitController`)
- Tracks per-transaction state across multiple submitters (`TxSubmissionTracker`)
- Manages **batch lifecycle and rotation** (`TxBatcher`) — active + previous batch slots; rotation when terminal
- Emits events for UI subscription (`$txChanges`, `$notifier`)

**Concerns**:
- Owns **transaction submission state** (per-batch state machine) — `BatchSubmitController`
- Owns **submission tracking** (confirmation polling, retry/backoff) — `TxSubmissionTracker` + `TxSubmitMgr`
- Owns **batch lifecycle** (rotation, cancellation) — `TxBatcher`
- Depends on **transaction state** — receives finalized `StellarTxnContext` for submission
- Depends on **Cardano network** (external, remote) — submits to blockchain nodes

**Detailed treatment**: Batch submission UI integration documented in `dapp-ui.architecture.md`

---

#### ARCH-095eskacgk: UI Layer

**Location**: local (browser)
**Primary sources**: `src/ui/CapoDappProvider.tsx` (93KB), `src/ui/TxBatchViewer.tsx` (28KB), `src/ui/CharterStatus.tsx` (18KB), `src/ui/FormManager.ts`
**Sub-component architecture**: `dapp-ui.architecture.md` (covers batch submission lifecycle, batch rotation, charter status, form management)

**Activities**:
- Provides React context wrapping Capo instance, wallet, network, and batch infrastructure (`CapoDappProvider`)
- Manages transaction batch review, signing, and status display (`TxBatchUI`, `TxBatchViewer`)
- Implements **batch rotation** — after submitting a batch, user continues working while previous batch confirms; new transactions queue into a fresh batch (`TxBatcher`)
- Monitors charter deployment status and delegate health (`CharterStatus`)
- Manages forms for creating/editing on-chain records (`FormManager`)
- Displays rate-limiter metrics for Blockfrost API (`RateMeterGauge`)

**Concerns**:
- Owns **batch lifecycle** (via `TxBatcher`) — active batch + previous batch slots, rotation on terminal state
- Owns **transaction review panel state** — expanded during review, collapsed to indicator after submission
- Depends on **Capo** — uses Capo instance for data queries and transaction building
- Depends on **indexed UTxOs** — uses cached data for display
- Depends on **delegated data records** — renders record data via data bridges
- Depends on **BatchSubmitController** (Network Clients) — per-batch state machine driving UI state

---

#### ARCH-cza3q9qn8z: Build Tooling

**Location**: local (build-time only)
**Primary sources**: `src/helios/rollupPlugins/heliosRollupBundler.ts` (130KB), `src/helios/rollupPlugins/heliosRollupLoader.ts`
**Sub-component architecture**: *Needs own subsystem architecture doc* (flagged for future split — the 130KB bundler alone warrants dedicated treatment)

**Activities**:
- Compiles Helios `.hl` files during rollup build
- Generates data bridge classes (`*.bridge.ts`) from Helios type definitions
- Generates type info files (`*.typeInfo.d.ts`) for TypeScript integration
- Creates bundle class definitions (`*.hlb.ts`) with precompiled script details
- Manages Helios module dependency resolution
- Produces multiple platform-specific output bundles (node, browser)

**Concerns**:
- Owns **generated type info & bridges** (`*.bridge.ts`, `*.typeInfo.d.ts`, `*.hlb.ts`) — build-time artifacts
- Owns **precompiled script details** (embedded in bundle classes) — script hashes computed at build time
- Depends on **on-chain type definitions** — reads Helios `.hl` files as input
- Depends on **Helios compiler** (external) — `@helios-lang/compiler`

**Build entry points** (from `rollup.config.ts`):
- `stellar-contracts.mjs` — core library (platform-independent)
- `testing-node.mjs` / `testing-browser.mjs` — test infrastructure (platform-specific)
- `ui.mjs` — React UI components
- `rollup-plugins.mjs` — build plugins for downstream dApps
- `logger.mjs` — structured logging

---

#### ARCH-6zc7jksakn: On-chain Policy Layer

**Location**: on-chain (Cardano blockchain)
**Primary sources**: `src/DefaultCapo.hl`, `src/delegation/BasicDelegate.hl`, `src/minting/CapoMinter.hl`
**Sub-component architecture**: `onchain-policy.architecture.md` (covers script roles, delegation chains, datum structures, UUT authority pattern, escape hatches, dual UPLC)

**Activities**:
- Enforces charter data integrity and lifecycle governance (`DefaultCapo.hl`)
- Validates delegate authority via UUT + `IsDelegation` datum (`CapoDelegateHelpers.hl`)
- Enforces minting policy for all token operations (`CapoMinter.hl`)
- Validates delegated data operations (create/update/delete) via delegate scripts
- Supports `MultipleDelegateActivities` for batched operations
- Provides `capoCtx` helpers for datum reading and token/value enforcement
- Produces dual UPLC per script: optimized (on-chain, determines addresses) + debug (off-chain validation with diagnostics)

**Concerns**:
- Owns **on-chain validation logic** (Helios scripts compiled to UPLC) — all policy enforcement
- Owns **activity/redeemer type definitions** — `AbstractDelegateActivitiesEnum` and per-delegate variants
- Depends on **charter data** — reads inline datum for manifest, delegate links
- Depends on **delegate UUTs** — verifies token presence for authorization

**On-chain delegation interfaces** (detailed in `onchain-policy.architecture.md`):
- **Minting chain** (ARCH-d4vrgvmrjy): CapoMinter → Mint Delegate → Data-Policy Delegate
- **Spending chain** (ARCH-69gf8315vk): DefaultCapo → Spend Delegate → Data-Policy Delegate
- **Data-policy re-delegation** (ARCH-tsy2zp9451): Manifest lookup + UUT spending for type-specific enforcement

**Helios files**:

| File | Role |
|------|------|
| `src/DefaultCapo.hl` | Main Capo validator — charter integrity, governance gating |
| `src/CapoHelpers.hl` | Manifest parsing, UUT resolution, delegate link helpers |
| `src/StellarHeliosHelpers.hl` | General utility functions |
| `src/minting/CapoMinter.hl` | Minting policy — defers to mint delegate for day-to-day |
| `src/minting/CapoMintHelpers.hl` | Minting utility functions |
| `src/delegation/BasicDelegate.hl` | Base delegate template |
| `src/delegation/CapoDelegateHelpers.hl` | `IsDelegation` datum, authority verification |
| `src/delegation/UnspecializedDelegate.hl` | Generic delegate scaffold |
| `src/TypeMapMetadata.hl` | Type metadata for data bridges |
| `src/PriceValidator.hl` | Price validation logic |

---

#### ARCH-h9wp8jctkr: Logging & Diagnostics

**Location**: local
**Primary sources**: `src/loggers/stellog.ts`, `src/diagnostics.ts`

**Activities**:
- Provides structured logging via pino (`stellog` factory)
- Supports custom log levels: `ops`, `userError`, `progress`
- Enables facility-based level routing via `LOGGING` env/localStorage config
- Provides Performance API marks for profiling critical paths
- Supports requirements tracing for debugging complex flows
- Provides test-specific logging with per-file and per-test output
- Defines `LoggerContext` (ARCH-28b90zs38k) hot-swap wrapper — required on `SetupInfo`, threaded through all contract instances

**Concerns**:
- Owns **diagnostic log output** (structured JSON logs, performance measures) — cross-cutting
- Owns **LoggerContext wrapper** (ARCH-28b90zs38k) — the hot-swap envelope definition; `loggerContext` is required on `SetupInfo` (breaking change for downstream)
- Depends on **pino** (external) — structured logging library

**Layered internal architecture** (detailed in `testLogging.architecture.md`): Six layers — L0 pino, L1 stellog (factory + LOGGING config), L2 Destinations (file/browser/DRED), L3 LoggerContext (hot-swap wrapper), L4 Context Threading (propagation through Capo/delegates/tcx), L5 Test Orchestration (DecoratedIt, createTestContext, LOG_TEST), L6 Specialized Bridges (UplcStellogAdapter). LoggerContext is created by test infrastructure (L5) or UILoggerProvider (ARCH-ex4h6pc08v); all downstream code consumes it identically.

**Sub-component architecture**: `src/loggers/stellog.architecture.md`, `src/loggers/testLogging.architecture.md`

---

## Interfaces

| ARCH-UUT | Interface | Mechanism | Direction | Payload |
|----------|-----------|-----------|-----------|---------|
| ARCH-4ffrc448e3 | Capo → Delegate System | internal function | Capo initiates | delegate role, `RelativeDelegateLinkLike`, `readOnly` option |
| ARCH-22mrr7hfbv | Delegate System → Data Bridge | internal function | Delegate initiates | UPLC datum data; returns typed TS object |
| ARCH-k5n2gn679z | StellarContract → Script Bundle | internal function | StellarContract initiates | bundle class, config params; returns compiled/precompiled script |
| ARCH-yngkfn783b | StellarTxnContext → Network Clients | internal function | StellarTxnContext (via TxBatcher) initiates | finalized Tx, signing strategy |
| ARCH-v25kc94c8c | Build Tooling → On-chain Policy Layer | build-time transformation | Build Tooling initiates | `.hl` source files; produces `.bridge.ts`, `.hlb.ts`, `.typeInfo.d.ts` |
| ARCH-ws5caxwbv3 | UtxoIndex → Network Data Provider | remote API | UtxoIndex initiates | address queries, tx details; returns UTxO/block data |
| ARCH-n914egxrrf | Capo → StellarTxnContext | internal function | Capo initiates | creates `mkTcx()` for transaction building |
| ARCH-n0g885vf79 | UI Layer → Capo | async function | UI initiates | data queries, transaction requests |
| ARCH-8nekn5819c | UI Layer → DelegatedDataContract | async function | UI initiates | find UTxOs of a particular record type |
| ARCH-0bx5189h0n | Testing → Emulator | internal function | CapoTestHelper initiates | snapshot load/save, block submission, wallet funding |

### ARCH-4ffrc448e3: Capo → Delegate System

**Mechanism**: internal async function call
**Direction**: Capo initiates via `connectDelegateWithOnchainRDLink()`
**Payload**:
- Input: role name, `RelativeDelegateLinkLike` (from charter manifest), `{ readOnly?: boolean }`
- Output: connected delegate instance (typed as role-specific `DelegatedDataContract` or `ContractBasedDelegate`)
**Errors**:
- Delegate not found in manifest → throws with role name
- Script compilation failure (write path) → propagates Helios compiler errors
- Upgrade detection mismatch → warns about delegate needing upgrade

### ARCH-22mrr7hfbv: Delegate System → Data Bridge

**Mechanism**: internal function call via `newReadDatum()`
**Direction**: Delegate initiates (via `DelegatedDataContract`)
**Payload**:
- Input: raw UPLC `UplcData` from on-chain datum
- Output: typed TypeScript object matching the delegate's datum definition
**Errors**:
- Malformed datum → bridge cast function throws with type mismatch details

### ARCH-k5n2gn679z: StellarContract → Script Bundle System

**Mechanism**: internal async function call
**Direction**: StellarContract initiates via `asyncCompiledScript()` or `scriptHash` getter
**Payload**:
- Input: bundle class with configured parameters
- Output: compiled `UplcProgram` or precompiled `scriptHash` (hex string)
**Errors**:
- Compilation failure → Helios compiler errors propagated
- Cache lock contention → retries with `proper-lockfile` backoff

### ARCH-yngkfn783b: StellarTxnContext → Network Clients

**Mechanism**: internal function call via `TxBatcher` → `BatchSubmitController`
**Direction**: StellarTxnContext (through batch coordination) initiates
**Payload**:
- Input: finalized `Tx` objects, `WalletSigningStrategy`
- Output: submission confirmation, tx hash
**Errors**:
- Wallet rejection → `BatchSubmitController` state machine handles
- Network rejection → `TxSubmissionTracker` reports failure
- Collateral insufficiency → error with diagnostic details

### ARCH-v25kc94c8c: Build Tooling → On-chain Policy Layer

**Mechanism**: build-time file transformation (rollup plugin)
**Direction**: Build Tooling reads `.hl` source files, produces TypeScript artifacts
**Payload**:
- Input: Helios `.hl` files with struct/enum/function definitions
- Output: `*.bridge.ts` (cast functions), `*.typeInfo.d.ts` (type declarations), `*.hlb.ts` (bundle classes with `precompiledScriptDetails`)
**Errors**:
- Helios syntax errors → build fails with compiler diagnostics
- Type generation failures → build fails with bridge generator errors

### ARCH-ws5caxwbv3: UtxoIndex → Network Data Provider

**Mechanism**: remote API calls (provider-specific protocol)
**Direction**: UtxoIndex initiates
**Payload**:
- Input: address queries (UTxOs at address), transaction details (by hash), block details
- Output: Provider-specific responses → validated and converted to `UtxoIndexEntry`
**Errors**:
- Rate limiting → exponential backoff (via `RateLimitedFetch` for REST providers)
- Network errors → retried with configurable limits
- Invalid response → validation failure (ArkType for Blockfrost)

**Implementations**:
- **Blockfrost** (current): REST API. Address queries (`/addresses/{addr}/utxos`), tx details (`/txs/{hash}`), block details. JSON responses validated via ArkType schemas.
- **Ogmios** (planned): JSON-RPC via `@cardano-ogmios` TypeScript module. Connects to any Cardano node. Same essential queries, different protocol.

**Abstraction boundary**: The `UtxoIndexEntry` type is provider-agnostic — each provider implements its own conversion from its response format to `UtxoIndexEntry`. The `UtxoStoreGeneric` interface on the storage side follows the same pattern.

### ARCH-n914egxrrf: Capo → StellarTxnContext

**Mechanism**: internal function call via `mkTcx()`
**Direction**: Capo initiates
**Payload**:
- Input: `SetupInfo` (network params, wallet, actor context, loggerContext — required)
- Output: new `StellarTxnContext<anyState>` ready for state accumulation, with loggerContext threaded from setup
**Errors**:
- Missing setup info → throws if network context not initialized

### ARCH-n0g885vf79: UI Layer → Capo

**Mechanism**: async function calls via React context
**Direction**: UI initiates (user actions trigger data queries and transaction requests)
**Payload**:
- Input: data type queries (`findDelegatedDataUtxos`), transaction method calls (`@txn`-decorated)
- Output: typed data arrays, transaction submission results
**Errors**:
- Wallet not connected → UI-level error handling
- Transaction rejection → propagated from Network Clients
- Data query failures → network/cache errors propagated

### ARCH-0bx5189h0n: Testing → Emulator

**Mechanism**: internal function calls via `CapoTestHelper` → `StellarNetworkEmulator`
**Direction**: CapoTestHelper initiates
**Payload**:
- Input: snapshot names, actor configurations, transaction blocks
- Output: emulator state (UTxO set, wallets), snapshot data for caching
**Errors**:
- Snapshot cache miss → triggers full rebuild from parent snapshot
- Compilation cache miss → triggers Helios compilation (cross-process locked)
- Transaction validation failure → emulator rejects with diagnostic info

### ARCH-8nekn5819c: UI Layer → DelegatedDataContract

**Mechanism**: async function call via Capo → data controller resolution
**Direction**: UI initiates (user action or data display triggers record query)
**Payload**:
- Input: record type name, optional filter/id
- Output: `FoundDatumUtxo<T, TLike>[]` — typed records with datum data deserialized via concrete bridge
**Errors**:
- Data controller not found → throws if type not in manifest
- Network/cache errors → propagated from underlying UTxO source
- Bridge cast failure → datum deserialization error

**Flow**: UI calls `capo.findDelegatedDataUtxos({ type })` or the data controller's `findRecords()` directly. Capo resolves the `DelegatedDataContract` for that type via the manifest, which uses its concrete bridge to deserialize the records.

---

## Data Flow

### Workflow: Read Path (Data Query)

**ARCH-UUT**: ARCH-yym47r9csh

Querying on-chain data without building transactions. Capo fetches UTxOs, resolves the data controller for the requested type with `readOnly: true` (skipping compilation), and uses pre-generated data bridge casts to return typed TypeScript objects. Fast — no script compilation needed.

**Detailed walkthrough**: See `src/offchainRuntime.ARCHITECTURE.md` § "Read Path"

### Workflow: Write Path (Transaction Building)

**ARCH-UUT**: ARCH-1h501psrnt

Building and submitting a transaction to create, update, or delete data. Application calls a `mkTxn*` method → Capo/DelegatedDataContract creates a `StellarTxnContext` → delegate connected with full compilation → transaction built via `txn*` helpers → submitted via `TxBatcher` → `BatchSubmitController` state machine.

**Transaction method naming convention**: `mkTxn*` creates a tcx (primary entry point); `txn*` requires a tcx (partial helper, MUST NOT create one).

**Detailed walkthrough**: See `src/offchainRuntime.ARCHITECTURE.md` § "Write Path"

### Workflow: Multi-Transaction Groups

Three patterns for coordinating multiple transactions submitted together. All share a critical mechanism: **later transactions use an `mkTcx` callback** with a TxChainBuilder facade exposing virtual UTxOs from prior transactions.

- **ARCH-c90jkf1z4j: Transaction Chaining (forward)** — primary tx generates follow-on transactions via `addlTxns`. Use case: bootstrap.
- **ARCH-w0n4p5naav: Conditional Facade (evaluative)** — facade created, situation evaluated, transactions conditionally added. Use case: operations that may or may not need on-chain action.
- **ARCH-ddtxts6bx0: Preparatory Facade (inverse chaining)** — prep transactions added first, then target tx sees their virtual UTxOs. Use case: UTxO reorganization before main operation.

**Detailed walkthrough with diagrams**: See `src/offchainRuntime.ARCHITECTURE.md` § "Multi-Transaction Groups"

### Workflow: Delegate Authority Inclusion

**ARCH-UUT**: ARCH-dp0606pj9t

Internal transaction-building workflow: when a delegate's enforcement is needed, the transaction spends the delegate's UUT as input and returns it as output. StellarTxnContext's type `S` is refined to prove authority presence, enabling downstream `txn*` methods to enforce required authorities at compile time.

**Detailed walkthrough**: See `src/offchainRuntime.ARCHITECTURE.md` § "Delegate Authority Inclusion"

### Workflow: Semantic Data Query

**ARCH-UUT**: ARCH-px2w2v7a44

UI/application workflow for fetching delegated data of a particular type, typically with a filter.

1. **UI/Application** requests records of a specific type, optionally with a semantic filter
2. **Capo** resolves the data-policy delegate for that type
3. **Query layer** pushes filter predicates to the data source for selective resolution:
   - Remote UtxoIndex server → server-side filtering (highest selectivity)
   - Local CachedUtxoIndex (IndexedDB) → indexed lookup via Dexie
   - Direct network (Blockfrost) → fetch all, filter in-memory (lowest selectivity)
4. **Data Bridge** converts matching UPLC datums to typed TypeScript objects
5. **UI** renders the filtered result set

**Key architectural goal**: Push filter semantics through the query layer so that selectivity is maximized at the data source. Avoids fetching/deserializing all records when only a small subset is needed. This is especially relevant for Capos with large UTxO sets and for mobile clients with limited resources.

### Workflow: Bootstrap (Charter Minting)

**ARCH-UUT**: ARCH-1ve8xff00g

First-time deployment of a Capo contract suite.

1. **Application** selects seed UTxO (determines Capo identity: mph, address)
2. **CapoMinter** → `mintingCharter()`: mints charter token + initial delegate UUTs
3. **Capo** writes `CharterData` to Capo address with delegate links and manifest
4. **Capo** installs mint/spend delegates — stores ref scripts at Capo address
5. **Capo** installs data-policy delegates (if any) — creates policy UUTs, ref scripts
6. Additional transactions queued via `addlTxns` for ref-script creation

```
[SeedUTxO] ---> [CapoMinter.mintingCharter()] ---> [CharterData + UUTs]
                        |
                        +---> [Install mint/spend delegates]
                        |
                        +---> [Install data-policy delegates]
                        |
                        +---> [Create ref scripts (addl txns)]
```

### Workflow: Delegate Upgrade

**ARCH-UUT**: ARCH-d93dbr7e1t

Upgrading a delegate contract without changing the Capo address or migrating data.

1. **Application** queues pending change in charter (`queuePendingChange`)
2. **CapoMinter** mints new delegate UUT
3. **Application** commits pending change (`commitPendingChanges`)
   - Burns old delegate UUT (via mint delegate)
   - Updates manifest entries (via spend delegate)
   - Activates new delegate link in charter
4. **Optionally**: creates ref script for new policy, retires old ref script

```
[Queue Change] ---> [Mint new UUT] ---> [Commit Change]
                                              |
                                         [Burn old UUT]
                                         [Update manifest]
                                         [Create ref script]
```

### Workflow: Build Pipeline

**ARCH-UUT**: ARCH-6cq1bg86x9

Compile-time generation of bridges, types, and bundles.

1. **Rollup** invokes `heliosRollupBundler` plugin
2. **Plugin** discovers `.hl` files and resolves module dependencies
3. **Plugin** compiles Helios to UPLC, extracts type definitions
4. **Plugin** generates `*.bridge.ts` (cast functions), `*.typeInfo.d.ts` (TS types), `*.hlb.ts` (bundle classes)
5. **Plugin** embeds `precompiledScriptDetails` (script hashes, configs) in bundle classes
6. **Rollup** produces platform-specific output bundles (`.mjs` files)

```
[.hl files] ---(heliosRollupBundler)---> [.bridge.ts + .typeInfo.d.ts + .hlb.ts]
                                              |
                                         [precompiledScriptDetails embedded]
                                              |
                                         [rollup bundling]
                                              |
                                         [dist/*.mjs outputs]
```

---

## Collaboration Summary

**Uses** (external dependencies):
- `@helios-lang/*` — Helios compiler, ledger types, tx-utils, UPLC, crypto
- `arktype` — schema validation (Blockfrost responses, runtime type checking)
- `dexie` — IndexedDB wrapper (UtxoIndex storage)
- `pino` — structured logging
- `rollup` — module bundling (build-time)
- `vitest` — testing framework
- `esbuild` — fast TypeScript transpilation (build-time)
- `proper-lockfile` — cross-process compilation locking

**Used by** (downstream consumers):
- Application dApps — import `stellar-contracts` for contract framework
- Application tests — import `stellar-contracts/testing` for emulated testing
- Application builds — import `stellar-contracts/rollup-plugins` for Helios compilation
- Application UIs — import `stellar-contracts/ui` for React components

**Package exports**:
| Export path | Contents | Platform |
|-------------|----------|----------|
| `.` | Core library (Capo, StellarContract, delegates, bridges) | universal |
| `./testing` | Test helpers, emulator, snapshot caching | node / browser |
| `./rollup-plugins` | Helios rollup bundler and loader | node (build-time) |
| `./HeliosProgramWithCacheAPI` | Compilation caching | node (FS) / browser (mock) |
| `./ui` | React dApp components | browser |
| `./logger` | Structured logging (stellog) | universal |

---

## Open Questions

- [x] ~~Should the offchain runtime architecture (`src/offchainRuntime.ARCHITECTURE.md`) be migrated into this document or remain as a detailed sub-component reference?~~ → Resolved: Remains as a sub-component reference with its own JSONL file (`src/offchainRuntime-architecture.jsonl`). Expanded for architect template compliance. System-level doc retains workflow summaries; offchain runtime doc owns implementation detail.
- [x] ~~What is the intended boundary between `UtxoHelper` and `CachedUtxoIndex`?~~ → Resolved: UtxoHelper is a predicate-based search/filter utility owned by StellarContract, exposed to all subclasses via setup. CachedUtxoIndex is a separate persistent cache component. They don't overlap — UtxoHelper consumes UTxOs that CachedUtxoIndex (or emulator, or network) provides.
- [ ] The `StateMachine.ts` component (19KB) — is this used across multiple components, or is it specific to transaction/batch submission?
- [ ] Authority policy hierarchy (`AuthorityPolicy`, `AnyAddressAuthorityPolicy`) — should this be documented as a separate component or remain internal to the Delegate System?
- [ ] The `FundedPurpose/` directory — is this an active application-specific extension or a deprecated example?
- [ ] `src/reqts/` directory with `ReqtsData.hl` and `ReqtsPolicy.hl` — is this part of the core framework or an application-specific extension?
- [ ] **Withdraw-zero delegation mechanism** (backlog): Shift from spending the delegate UUT for policy enforcement to a withdraw-zero (staking validator) pattern. Requires: (1) register delegate script presence (already done), (2) register policy script as staking validator to constrain withdraw-zero invocation, (3) modify delegate base script structure — currently scripts declare a single purpose on line 1 (`spending BasicDelegate`, `minting CapoMinter`); the multi-activity pattern changes line 1 to declare multiple script purposes and adds a main-function switch to dispatch based on invocation type (spending vs staking/withdraw). Enables policy enforcement without spending the delegate token. Related opportunity for custom minters (TBD). See `reference/essential-stellar-onchain.md` for current script structure.
- [ ] Detail the two parallel delegation chains (minting chain vs spending chain) — consider whether this warrants its own subsystem architecture doc for the delegation mechanism
- [ ] **UtxoIndex: Ogmios provider** (backlog): Abstract network provider behind an interface; add Ogmios support via `@cardano-ogmios` TypeScript module connecting to any Cardano node
- [ ] **UtxoIndex: Server-side storage** (backlog): CouchDB or PostgreSQL backend for server-layer UTxO storage; enables API service providing subset access to large Capo UTxO sets
- [ ] **UtxoIndex: Server-mediated client sync** (backlog): Client syncs to a filtering server rather than directly to chain, receiving client-specific filtered incremental blocks — critical for mobile

---

## Discovery Notes

### Phase 1 Findings: Current State

**Existing architecture documents discovered**:
- `src/offchainRuntime.ARCHITECTURE.md` — read/write path optimization (needs freshening to comply with template)
- `StellarTxnContext.architecture.md` — transaction building context (partially compliant)
- `src/testing/emulator/Emulator.ARCHITECTURE.md` — testing infrastructure (fully compliant, Phase Complete)
- `src/networkClients/UtxoIndex/utxoIndex.ARCHITECTURE.md` — UTxO indexing (partially compliant)
- `src/loggers/stellog.architecture.md` — structured logging
- `src/loggers/testLogging.architecture.md` — test logging
- `dapp-ui.architecture.md` — UI layer: batch submission lifecycle, batch rotation, charter status, form management (initial draft)
- `onchain-policy.architecture.md` — On-chain policy layer: script roles, delegation chains, datum structures, UUT authority, escape hatches (initial draft)

**Existing requirements documents**:
- `src/StellarTxnContext.reqts.md`
- `src/testing/emulator/Emulator.reqts.md`
- `src/networkClients/UtxoIndex/UtxoIndex.reqts.md`
- `src/loggers/stellog.reqts.md`

**Reference documents** (in `reference/`):
- `essential-stellar-dapp-architecture.md` — design goals, data model, lifecycle
- `essential-capo-lifecycle.md` — charter minting, delegate management
- `essential-stellar-onchain.md` — on-chain validation details
- `essential-stellar-testing.md` — test conventions

### Phase 1 Interview Findings (validated by stakeholder)

- **StellarContract's unifying principle**: base class for anything with an on-chain policy script. Degenerate case: wallet-based authority delegate enforces via UUT spending (not holding), token returned to wallet.
- **Script Bundle System**: intentional language-abstraction boundary. Helios coupling is to platform libraries (ledger types, tx-utils, UPLC executor) more than the scripting language itself. Alternative languages can compile to UPLC and use Helios executor.
- **Two parallel delegation chains**: (1) Minting: CapoMinter → mint delegate → data-policy. (2) Spending: Capo main script → spend delegate → data-policy. Mint and spend delegates often same script, triggered in different chains. Never sequential between chains.
- **Withdraw-zero mechanism** (backlog): shift from spending delegate UUT to staking validator pattern; requires multi-purpose script declarations and main-function dispatch.
- **Build Tooling**: flagged for separate subsystem architecture doc.
- **UI Layer**: stub held, needs own subsystem architecture doc.

### Phase 2 Interview Findings (validated by stakeholder)

- **Dual ownership model**: runtime ownership (where data lives on-chain) vs policy ownership (who approves changes through delegation chain). Delegate UUTs: runtime at delegate script address, policy via CapoMinter. Data records: runtime at Capo address, enforcement delegated to data-policy delegates.
- **Why records live at Capo address**: key upgrade enabler — delegates swap without touching existing UTxOs. Next spending activity uses the new delegate for enforcement.
- **UtxoHelper**: utility owned by StellarContract, exposed to all subclasses via setup. Not a separate component; consumes UTxOs from whatever network interface provides them.
- **Prefetched capoUtxos**: interface for passing known-current UTxO set to avoid deserialization cost even with local cache.
- **Hot-swap envelope pattern**: cross-cutting pattern for network context, actor context, logger context. Stable outer reference shared by all components; contents swapped without updating holders.
- **UtxoIndex evolution backlog**: Ogmios provider, server-side storage (CouchDB/PostgreSQL), server-mediated client sync for mobile.
- **Transaction method naming**: `mkTxn*` = primary entry (creates tcx if needed, `initialTcx` param); `txn*` = partial helper (requires tcx, MUST NOT create).
- **Helios coupling nuance**: framework depends on Helios platform libraries pervasively but not strictly on the scripting language at the same depth.

### Phase 3 Interview Findings (complete)

- **10 workflows identified**: Read Path, Write Path, Transaction Chaining, Conditional Facade, Preparatory Facade, Delegate Authority Inclusion, Semantic Data Query, Bootstrap, Delegate Upgrade, Build Pipeline.
- **Multi-transaction patterns**: all three use mkTcx callback with TxChainBuilder facade providing virtual UTxOs from prior transactions.
- **Delegate Authority Inclusion**: internal workflow spending+returning UUT to prove authority; StellarTxnContext type `S` refined to track authority presence.
- **Semantic Data Query**: filter predicates pushed to data source for selectivity — remote server, local IndexedDB, or fallback in-memory.
- **Phase 3 complete** — all four topics validated (key workflows, data transformations, handoff points, state management).
- **Data Bridge dual-path transform** (confirmed): `DataBridge.mkData()` (TS→UPLC) and `readData()` (UPLC→TS) both delegate to `Cast<any,any>` from `@helios-lang/contract-utils`. Two creation paths: (1) build-time — rollup plugin generates `*.bridge.ts` with embedded type schemas, powers read path without compilation; (2) runtime — `Cast` created from compiled program, used on write path. Dual-path is intentional: build-time = performance optimization (no compile to read), runtime = correctness guarantee (write needs compiled scripts for hash verification anyway).
- **capoStoredData two-level envelope** (confirmed): Two definitions of `capoStoredData` exist. (1) **Abstract** (Capo/spend delegate, on-chain): does not specify the inner data type; probes the `type` field to look up which data-policy delegate governs this record (via charter manifest), then delegates enforcement. (2) **Concrete** (`DelegatedDataContract`, on-chain + off-chain): knows the specific `T` type, enforces type-specific business rules. The abstract envelope is the mechanism enabling delegation dispatch for data records — without it, Capo would need to know every concrete type. **Off-chain**: the abstract bridge is never used in application code. After type detection (from the `type` field, which corresponds to the token-name prefix), the code resolves the specific `DelegatedDataContract` and uses its concrete bridge for UPLC↔TS transformation. The abstract type only matters on-chain for routing.
- **Deployment compilation pipeline** (confirmed): Downstream projects store a per-environment JSON config (MPH, seed UTxO, etc.) representing a specific Capo deployment — one for pre-prod, one for mainnet. At build time, the rollup plugin combines this config with the Capo bundle, producing two categories of compiled scripts: (1) **deployment-agnostic** — data policies, mint/spend delegate policies, compiled into `dist/contracts/{environment}/` (identical scripts across environments, separate subdirectories); (2) **deployment-specific** — Capo and minter, parameterized by the deployment JSON, producing unique UPLC per deployment. Each script produces **dual UPLC**: optimized (no logging, used on-chain, determines script addresses/hashes) and debug (includes logging diagnostics, used off-chain for pre-submission transaction validation). The debug UPLC provides high-granularity transparency into validator execution via UplcStellogAdapter (ARCH-tqb909cyzr), which bridges UPLC traces to stellog (`uplc:receipt` + `uplc:detail` facilities).
- **Build-time code generation chain** (confirmed): Transformations compound across build and runtime. On-chain type definitions (Helios `.hl` structs/enums) → build-time generates `*.typeInfo.d.ts` (TS type declarations) + `*.bridge.ts` (cast functions) + `*.hlb.ts` (bundle classes with `precompiledScriptDetails`). These build-time artifacts then power runtime data transformations in both directions: app→on-chain (TS objects → UPLC via bridge `mkData()`) and on-chain→app (UPLC → typed TS via bridge `readData()`). The chain: on-chain types define the bridge, the bridge facilitates bidirectional data transformation at runtime. Cross-ref: Build Pipeline workflow (ARCH-6cq1bg86x9).
- **StellarTxnContext typed state accumulation** (confirmed as data transformation, compile-time): `StellarTxnContext<S>` accumulates state via `addState<K, V>(key, value)` — each call mutates the runtime object AND narrows the TypeScript type `S`. Transaction methods (`txn*`, `@partialTxn`) require specific state shapes in their type signatures (e.g., `hasSeedUtxo`, `hasCharterRef`). This is a compile-time state protocol: the type system enforces that preconditions are met before downstream methods can be called. Data itself is plain TS objects in a bag; the transformation is at the type level, not the data format level.
- **UI data transforms — forms and lists** (confirmed): Two UI-layer transformations sit between the bridge and HTML presentation. (1) **Data Forms** (ARCH-taw0vq89mb): bidirectional — inbound reads strict type `T` via bridge, converts to HTML primitives (strings/numbers); outbound converts form values to permissive type `TLike` for bridge `mkData()`. (2) **Data Lists** (ARCH-hk6t78td5b): inbound-only — reads strict type via bridge, converts to display-friendly representation for tables/lists. Detailed in `dapp-ui.architecture.md`.
- **UtxoIndexEntry as store-agnostic representation** (confirmed): `UtxoIndexEntry` is the representation that serializes to any store (Dexie/IndexedDB, future PostgreSQL/CouchDB/SQLite) and comes back as the same type. `UtxoStoreGeneric` interface is entirely expressed in `UtxoIndexEntry` — no store-specific types leak through. `dexieUtxoDetails` Entity class directly implements `UtxoIndexEntry`; Dexie handles bigint serialization transparently via `mapToClass()`. Conversion methods: in via `blockfrostUtxoToIndexEntry()` (API JSON) and `txInputToIndexEntry()` (Helios TxInput); out via `indexEntryToTxInput()` (reconstructs Helios TxInput). Round-trip verified by test.
- **Handoff points** (3.3): Abstracted `UtxoIndex → Blockfrost API` to `UtxoIndex → Network Data Provider` (ARCH-ws5caxwbv3) — Blockfrost as current implementation, Ogmios as planned, both producing `UtxoIndexEntry`. Added `UI Layer → DelegatedDataContract` (ARCH-8nekn5819c) — finding UTxOs of a particular record type via manifest-resolved data controller. On-chain delegation interfaces captured in `onchain-policy.architecture.md`: minting chain (ARCH-d4vrgvmrjy), spending chain (ARCH-69gf8315vk), data-policy re-delegation (ARCH-tsy2zp9451). Confirmed: CapoMinter ↔ Delegate System is a hands-off relationship, not a formal interface.
- **Off-chain caches** (3.4): Three distinct caching layers: (1) **Compilation cache** (`CachedHeliosProgram`) — FS (node) or IndexedDB (browser), keyed by source hash, cross-process safe via `proper-lockfile`, shared across test runs and builds. (2) **UtxoIndex** (`CachedUtxoIndex` + Dexie/IndexedDB) — persistent browser-side UTxO cache, incrementally invalidated as new blocks reveal spent/created UTxOs, detects charter UTxO changes during routine monitoring. (3) **Delegate cache** (`_delegateCache` on Capo) — in-memory, per-Capo-instance lifetime, no persistence.
- **Test snapshot hierarchy**: Hierarchical on-disk snapshots capturing full emulator state at named checkpoints. Invalidation keyed by hash of inputs (compiled scripts, setup code) — if any input changes, snapshot and all descendants rebuild. Typically: base → bootstrapped → app-specific layers. Detailed in `Emulator.ARCHITECTURE.md`.
- **State management patterns summary** (3.4): On-chain state as UTxOs (immutable, spend-and-recreate), three off-chain caches (compilation, UtxoIndex, delegate), test snapshots, hot-swap envelopes (ARCH-e6xmrs6wmm), and StellarTxnContext compile-time typed state protocol (captured in 3.2).
- **Delegate cache** (`_delegateCache` on Capo): In-memory, per-Capo-instance lifetime. No explicit invalidation on delegate upgrade — if a delegate is upgraded during a session, the cached instance becomes stale. The UtxoIndex detects charter UTxO changes (which signal delegate upgrades), but there's no current UI treatment to notify the user or invalidate the cache. Backlog item added to `dapp-ui.architecture.md` for upgrade detection UI.
- **On-chain state: UTxOs as state** (confirmed): All persistent on-chain state is expressed as UTxOs — immutable datums consumed and recreated on every "update". Charter data, delegated data records, and reference scripts live as separate UTxOs at the Capo address; delegate authority tokens at their script addresses. No mutable on-chain state. This shapes everything downstream: transaction builders must explicitly manage inputs/outputs, the type system tracks accumulated transaction state, and multi-tx groups need virtual UTxO facades. **The Stellar Contracts framework exists specifically to make this complexity manageable for dApp developers** — abstracting UTxO management, delegation chains, typed state accumulation, and data bridging behind higher-level APIs so developers can focus on business logic.

### Recommendations for Deep Interview

The following areas would benefit from deep-interview elaboration (priority order):
1. **Multi-purpose script pattern** (PRIORITY) — withdraw-zero mechanism and its implications for delegate base script structure; shift from spending delegate UUT to staking validator pattern
2. **Delegate lifecycle state machine** — the queue/commit/burn flow for upgrades has intricate state management
3. **TxChainBuilder integration** — virtual UTxO set management across chained transactions
4. **Build plugin internals** — the 130KB `heliosRollupBundler.ts` has complex dependency resolution
5. **CIP-68 datum structure** — the abstract `DelegatedData` datum format and how per-type controllers specialize it
6. **Semantic query layer** — how filter predicates flow through the query stack for selectivity optimization
7. **Deployment compilation pipeline** — JSON config → parameterized UPLC chain, downstream dApp configuration
8. **BatchSubmitController state machine** — full state machine with retry, `mostly confirmed`, `nested batch` edge cases
