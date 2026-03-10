# UtxoIndex Architecture

## System Overview

The UtxoIndex is a **dedicated UTXO monitor and cache** for Cardano smart contracts built with Stellar Contracts. It provides persistent, browser-based storage of UTXOs needed for interacting with Capo contract instances, enabling fast local lookups and reducing redundant network queries. The charter token resides at the Capo address and every transaction affecting any delegate-UUT or delegated-data record must also touch the Capo address (for charter reference), the indexer monitors transactions affecting the single Capo address, and incidentally also tracks UUTs at other addresses referenced by the Capo Charter.

---

## Components

### Component Inventory

| Component | Location | Type | Owner | Helios Coupling |
|-----------|----------|------|-------|-----------------|
| `CachedUtxoIndex` | Local (browser) | Class | UtxoIndex | **YES** - converts Helios → storage types |
| `UtxoIndexEntry` | Local (browser) | Type | UtxoIndex | **NO** - storage-agnostic |
| `RecordIndexEntry` | Local (browser) | Type | UtxoIndex | **NO** - storage-agnostic |
| `UtxoStoreGeneric` | Local (browser) | Interface | UtxoIndex | **NO** - uses UtxoIndexEntry |
| `DexieUtxoStore` | Local (browser) | Class | UtxoIndex | **NO** - uses UtxoIndexEntry |
| Blockfrost Type Validators | Local (browser) | Type definitions + ArkType factories | UtxoIndex | **NO** - Blockfrost schemas only |
| Dexie Record Classes | Local (browser) | Entity classes | UtxoIndex | **NO** - storage entities |
| Blockfrost API | Remote | REST API | External (Blockfrost) | N/A |
| IndexedDB | Local (browser) | Database | External (Browser) | N/A |

### Component Descriptions

#### CachedUtxoIndex
**Purpose**: Main orchestrator for UTXO indexing, transaction monitoring, and block tracking

**Responsibilities**:
- Monitor the Capo address for new transactions (all delegate activity touches this address)
- Fetch and cache all UTXOs at the Capo address
- Catalog delegated-data policy UUTs at their delegate script addresses
- Detect charter UTXO changes during routine monitoring
- Manage communication with Blockfrost API
- **Convert Helios types to storage-agnostic types** via `indexUtxoFromOutput()`
- Coordinate storage operations via `UtxoStoreGeneric` interface

**Key State**:
- `capoAddress: string` - The primary address to monitor (getter)
- `capoMph: string` - Minting policy hash for filtering relevant tokens (getter)
- `lastBlockId: string` - Most recent block hash seen
- `lastBlockHeight: number` - Most recent block height seen
- `store: UtxoStoreGeneric` - Storage backend instance

**Type Boundary**: CachedUtxoIndex is the **only component** that works with Helios types (`TxOutput`, `Tx`, `MintingPolicyHash`, etc.). It converts these to `UtxoIndexEntry` before passing to the store.

**ReadonlyCardanoClient Conformance**: CachedUtxoIndex implements the Helios `ReadonlyCardanoClient` interface (REQT/rc7km2x8hp) to enable seamless integration with Helios transaction building. This allows the indexer to be used as a drop-in replacement for network clients, providing cached UTXO lookups during transaction construction.

**Key Method - `indexUtxoFromOutput()`**:
- Takes: `txHash: string`, `outputIndex: number`, `output: TxOutput` (Helios type)
- Extracts UUT IDs using `capo.mph`
- Converts to `UtxoIndexEntry` (storage-agnostic)
- Calls `store.saveUtxo(entry)`

#### UtxoIndexEntry (Type)
**Purpose**: Storage-agnostic UTXO representation

**Location**: `types/UtxoIndexEntry.ts`

**Why it exists**: Decouples storage layer from Helios and Blockfrost types. Neither the interface nor implementations should import from `@helios-lang/*` or know about Blockfrost response schemas.

**Fields**:
```typescript
type UtxoIndexEntry = {
    utxoId: string;              // "txHash#outputIndex"
    address: string;             // bech32
    lovelace: bigint;
    tokens: Array<{
        policyId: string;        // hex
        tokenName: string;       // hex-encoded
        quantity: bigint;
    }>;
    datumHash: string | null;
    inlineDatum: string | null;  // CBOR hex
    uutIds: string[];            // extracted UUT identifiers
}
```

#### UtxoStoreGeneric
**Purpose**: Storage abstraction interface

**Why abstraction exists**: Enables alternative storage backends (in-memory for testing, future: Dred for high-performance state sharing) without changing indexer logic

**Type Boundary**: Interface uses **only** `UtxoIndexEntry` and simple types. **No Helios imports.**

**Operations**:
- `log(id, message)` - Structured logging
- `findBlockId(id)` / `saveBlock(block)`
- `findUtxoId(id)` / `saveUtxo(entry: UtxoIndexEntry)`
- `findTxId(id)` / `saveTx(tx)`
- `findUtxoByUUT(uutId)` - Query via multiEntry index on `uutIds`

#### DexieUtxoStore
**Purpose**: Dexie/IndexedDB implementation of storage backend

**Responsibilities**:
- Persist blocks, UTXOs, transactions, and logs to IndexedDB
- Provide indexed queries for efficient retrieval
- Generate unique process IDs for logging sessions
- Track structured logs with stack traces for debugging

**Type Boundary**: Works **only** with `UtxoIndexEntry` and Dexie types. **No Helios imports, no Blockfrost types.**

**Schema** (v2):
```
blocks: hash (PK), height
utxos: utxoId (PK), *uutIds (multiEntry), address, blockHeight
txs: txid (PK)
scripts: scriptHash (PK)
walletAddresses: address (PK)
records: id (PK), utxoId, type
metadata: key (PK)
logs: logId (PK), [pid+time] (compound index)
```

#### Blockfrost Integration
**Purpose**: External blockchain data provider

**Mechanism**: REST API accessed via `fetchFromBlockfrost()` method in CachedUtxoIndex

**Endpoints Used**:
- `blocks/latest` - Current blockchain tip
- `blocks/{hash_or_number}` - Block details
- `addresses/{address}/transactions` - Transaction history for address
- `txs/{txId}/cbor` - Full transaction CBOR
- `txs/{txHash}/utxos` - UTXO details for transaction

**Authentication**: Project ID in request headers

**Validation**: All responses validated with ArkType factories in `blockfrostTypes/*.ts`

#### blockfrostTypes (Validation Only)
**Purpose**: ArkType schemas for validating Blockfrost API responses

**Location**: `blockfrostTypes/*.ts`

**IMPORTANT**: These types are **ONLY** for validating data received from Blockfrost. They must **NOT** be used for storage. After validation, data is converted to storage-agnostic types (`UtxoIndexEntry`, `BlockIndexEntry`, etc.) before being passed to the store.

**Files**:
- `BlockDetails.ts` - Block response validation
- `AddressTransactionSummaries.ts` - Transaction list validation
- `UtxoDetails.ts` - UTXO response validation (for API responses only)

---

## Responsibility Allocation

This section defines where each specific area of functionality belongs.

### External API Communication
**Owner**: `CachedUtxoIndex`

| Responsibility | Method/Location |
|----------------|-----------------|
| Fetch transaction CBOR from Blockfrost | `fetchFromBlockfrost()`, `findOrFetchTxDetails()` |
| Fetch block details from Blockfrost | `fetchFromBlockfrost()`, `fetchAndStoreLatestBlock()` |
| Fetch address transactions from Blockfrost | `fetchFromBlockfrost()`, `runSyncCycle()` |
| Fetch UTXOs by asset from Blockfrost | `fetchFromBlockfrost()` |
| Determine Blockfrost URL from API key | Constructor |

### Blockfrost Response Validation
**Owner**: `blockfrostTypes/*.ts` (used by `CachedUtxoIndex`)

| Responsibility | Location |
|----------------|----------|
| Validate block responses | `BlockDetailsFactory` |
| Validate transaction summaries | `AddressTransactionSummariesFactory` |
| Validate UTXO responses | `UtxoDetailsFactory` |

**CONSTRAINT**: These validators produce transient objects. Data must be converted to storage types before persisting.

### Helios Type Processing (Coupling Boundary)
**Owner**: `CachedUtxoIndex`

| Responsibility | Method |
|----------------|--------|
| Decode CBOR to Helios Tx | Uses `decodeTx()` from `@helios-lang/ledger` |
| Extract UUT IDs from TxOutput.value | `extractUutIds()` (private helper) |
| Convert TxOutput → UtxoIndexEntry | `indexUtxoFromOutput()` |
| Access capo.mph for UUT pattern matching | Via `this.capo.mph` |

**CONSTRAINT**: No other component may import from `@helios-lang/*`.

### Storage Type Definitions
**Owner**: `types/UtxoIndexEntry.ts`

| Type | Purpose |
|------|---------|
| `UtxoIndexEntry` | Storage-agnostic UTXO with uutIds |
| `BlockIndexEntry` | Block metadata for sync tracking |
| `TxIndexEntry` | Transaction CBOR storage |

**CONSTRAINT**: No imports from `@helios-lang/*` or `blockfrostTypes/*`.

### Storage Interface Contract
**Owner**: `UtxoStoreGeneric.ts`

| Responsibility | Method |
|----------------|--------|
| Save UTXO entry | `saveUtxo(entry: UtxoIndexEntry)` |
| Find UTXO by ID | `findUtxoId(id: string)` |
| Find UTXO by UUT | `findUtxoByUUT(uutId: string)` |
| Save block entry | `saveBlock(block: BlockIndexEntry)` |
| Find block by ID | `findBlockId(id: string)` |
| Save transaction | `saveTx(tx: TxIndexEntry)` |
| Find transaction | `findTxId(id: string)` |
| Structured logging | `log(id, message)` |

**CONSTRAINT**: Interface uses only types from `types/UtxoIndexEntry.ts`. No Helios, no Blockfrost types.

### Sync Orchestration
**Owner**: `CachedUtxoIndex`

| Responsibility | Method |
|----------------|--------|
| Initial full sync | `syncNow()` |
| Periodic transaction monitoring | `runSyncCycle()` |
| Process transaction outputs | `processTransactionForNewUtxos()` |
| Index individual UTXO | `indexUtxoFromOutput()` |
| Catalog delegate UUTs from charter | `catalogDelegateUuts()` |
| Detect charter changes | Within `processTransactionForNewUtxos()` |

### State Management
**Owner**: `CachedUtxoIndex`

| State | Access |
|-------|--------|
| Capo address (bech32) | `get capoAddress()` |
| Capo minting policy hash | `get capoMph()` |
| Last synced block ID | `lastBlockId` property |
| Last synced block height | `lastBlockHeight` property |

---

## Artifact Ownership

| Directory/File | Owner | Purpose |
|----------------|-------|---------|
| `src/networkClients/UtxoIndex/` | UtxoIndex | Root directory |
| `CachedUtxoIndex.ts` | UtxoIndex | Main orchestrator (Helios coupling boundary) |
| `types/UtxoIndexEntry.ts` | UtxoIndex | Storage-agnostic UTXO type |
| `types/RecordIndexEntry.ts` | UtxoIndex | Storage-agnostic parsed record type |
| `types/MetadataEntry.ts` | UtxoIndex | Key-value metadata storage type |
| `types/PendingTxEntry.ts` | UtxoIndex | Serializable pending transaction entry type |
| `UtxoStoreGeneric.ts` | UtxoIndex | Storage interface (no Helios) |
| `DexieUtxoStore.ts` | UtxoIndex | Dexie implementation (no Helios) |
| `blockfrostTypes/*.ts` | UtxoIndex | Blockfrost API response schemas |
| `dexieRecords/*.ts` | UtxoIndex | Database entity classes |
| `UtxoIndex.reqts.md` | UtxoIndex | Requirements document |
| `utxoIndex.ARCHITECTURE.md` | UtxoIndex | This document |

**External Dependencies**:
- Capo address, minting policy hash, and charter data bridge (for decoding charter datum)
- Network client implementing CardanoClient (for blockchain queries)
- Blockfrost API key (for direct Blockfrost queries during sync)
- Browser IndexedDB (provides persistence)

---

## Tool/Interface Surface

### Public API (CachedUtxoIndex)

**Constructor**:
```typescript
new CachedUtxoIndex({
    address: Address | string,           // Capo address to monitor
    mph: MintingPolicyHash | string,     // Capo minting policy hash
    isMainnet: boolean,
    network: CardanoClient,              // Underlying network client
    bridge: CapoHeliosBundleBridge,      // For decoding charter datum
    blockfrostKey: string,
    storeIn?: "dexie" | "memory" | "dred",
    dbName?: string                      // Optional database name for test isolation
})
```

This decoupled design allows CachedUtxoIndex to be used as the network client for a Capo, avoiding circular dependencies:
```typescript
// Create index first with bridge for charter decoding
const index = new CachedUtxoIndex({
    address: capoAddress,
    mph: capoMph,
    isMainnet: false,
    network: blockfrostClient,
    bridge: CapoHeliosBundle.bridge,
    blockfrostKey: apiKey,
});

// Then create Capo using the index as its network
const capo = new MyCapo({
    setup: { network: index, ... },
    config: ...
});
```

**Core Methods**:
- `syncNow(): Promise<void>` - Full synchronization of Capo address and UUT catalog
- `runSyncCycle(): Promise<void>` - Orchestrate chain state synchronization (tip discovery, rollback detection, incremental/catchup sync, pending tx verification, resubmission, depth tracking, rollback execution)
- `catalogDelegateUuts(charterData: CharterData): Promise<void>` - Catalog delegate UUTs from charter
- `startPeriodicRefresh(): void` - Start automatic 5-second block-tip polling
- `stopPeriodicRefresh(): void` - Stop automatic monitoring

**ReadonlyCardanoClient Interface** (REQT/rc7km2x8hp):
The indexer implements the Helios `ReadonlyCardanoClient` interface for transaction building integration:

```typescript
interface ReadonlyCardanoClient {
  getTx?: (id: TxId) => Promise<Tx>
  getUtxo(id: TxOutputId): Promise<TxInput>
  getUtxos(address: Address): Promise<TxInput[]>
  getUtxosWithAssetClass?: (address: Address, assetClass: AssetClass) => Promise<TxInput[]>
  hasUtxo(utxoId: TxOutputId): Promise<boolean>
  isMainnet(): boolean
  now: number
  parameters: Promise<NetworkParams>
}
```

| Method | Status | REQT |
|--------|--------|------|
| `isMainnet()` | COMPLETED | REQT/gy8z4a7pu |
| `hasUtxo(id)` | COMPLETED | REQT/gw6x2y5ns |
| `getTx(id)` | COMPLETED | REQT/gx7y3z6ot |
| `getUtxo(id)` | COMPLETED | REQT/gt3ux9v2kp |
| `getUtxos(address)` | COMPLETED | REQT/gu4vy0w3lq |
| `getUtxosWithAssetClass(address, asset)` | COMPLETED | REQT/gv5wz1x4mr |
| `now` | COMPLETED | REQT/gz9a5b8qv |
| `parameters` | COMPLETED | REQT/ha0b6c9rw |

**Cache Strategy**: All `getUtxo*` methods check the cache first for matching indexed UTXOs. On cache miss, they fall through to the underlying network client. This allows the indexer to act as a transparent cache layer.

**Initialization**: On startup, `syncNow()` initializes `lastSlot`, `lastBlockId`, and `lastBlockHeight` from the cached latest block (via `store.getLatestBlock()`). This ensures the `now` property reflects previously discovered block data.

**Transaction Restoration Methods**:

| Method | Returns | Use Case |
|--------|---------|----------|
| `getTx(id)` | Raw decoded Tx | When you just need the Tx structure |
| `getTxInfo(id)` | Tx with restored inputs | When you need input values/addresses |

**Helios Transaction Recovery Pattern** (REQT/qc7qgsqphv):

Tx CBOR from Blockfrost only contains TxOutputId references for inputs, not full output data. The `getTxInfo()` method uses Helios's `tx.recover(network)` to restore full input data:

```
tx.recover(network)
  └─► TxBody.recover(network)
        └─► TxInput.recover(network)  [for each input, refInput, collateral]
              └─► network.getUtxo(id)
              └─► mutates this._output in place
  └─► TxWitnesses.recover(refScripts)
```

Since CachedUtxoIndex implements `getUtxo()`, it can serve as the network parameter for `tx.recover()`, providing efficient cached lookups for input restoration.

**Why This Pattern**:
- Follows Helios convention: BlockfrostV0Client, IrisClient, and Emulator all return raw Tx from `getTx()`
- `recover()` calls `getUtxo()` for each input - expensive for network clients (N calls)
- For CachedUtxoIndex, `getUtxo()` hits local cache - no performance concern
- Separating concerns: callers choose whether they need restored data

| Requirement | Status | Description |
|-------------|--------|-------------|
| REQT/nqemw2gvm2 | COMPLETED | `restoreTxInput()` method (via tx.recover) |
| REQT/tqrhbphgyx | COMPLETED | Reference script fetching |
| REQT/qc7qgsqphv | COMPLETED | `getTxInfo()` with restored inputs |
| REQT/k2wvnd3f1e | COMPLETED | Script storage caching |

**Query API Methods** (REQT/50zkk5xgrx):
- `findUtxoByUUT(uutId: string): Promise<UtxoIndexEntry | undefined>`
- `findUtxosByAsset(policyId, tokenName?, options?): Promise<UtxoIndexEntry[]>`
- `findUtxosByAddress(address, options?): Promise<UtxoIndexEntry[]>`
- `getAllUtxos(options?): Promise<UtxoIndexEntry[]>`

### Storage Interface (UtxoStoreGeneric)

**NOTE**: This interface has **no Helios imports**. It uses only `UtxoIndexEntry` and simple types.

```typescript
interface UtxoStoreGeneric {
    log(id: string, message: string): Promise<void>

    // Block operations
    findBlockId(id: string): Promise<BlockIndexEntry | undefined>
    saveBlock(block: BlockIndexEntry): Promise<void>

    // UTXO operations
    findUtxoId(id: string): Promise<UtxoIndexEntry | undefined>
    saveUtxo(entry: UtxoIndexEntry): Promise<void>

    // Transaction operations
    findTxId(id: string): Promise<TxIndexEntry | undefined>
    saveTx(tx: TxIndexEntry): Promise<void>

    // UUT lookup via multiEntry index on uutIds
    findUtxoByUUT(uutId: string): Promise<UtxoIndexEntry | undefined>
}
```

### Data Types

**UtxoIndexEntry**: Storage-agnostic UTXO representation (see Component Description above). Includes `uutIds: string[]` for UUT catalog lookups.

**BlockIndexEntry**: Block metadata for tracking sync state (hash, height, time, slot).

**TxIndexEntry**: Transaction CBOR storage `{ txid: string; cbor: string }`.

---

## Data Flow

### Workflow 1: Initial Synchronization

```
┌─────────────────┐
│ Constructor     │
│ new             │
│ CachedUtxoIndex │
└────────┬────────┘
         │
         ▼
┌────────────────────────────────┐
│ syncNow()                      │
│ 1. Initialize from cache       │──────► store.getLatestBlock()
│ 2. Fetch charter UTXO          │──────► network.getUtxos(capoAddress)
│ 3. Decode charter datum        │──────► bridge.charterDatumReader()
│ 4. Fetch all Capo UTXOs        │──────► GET addresses/{capo}/utxos
│ 5. Store UTXOs in DB           │──────► store.saveUtxo()
│ 6. Catalog delegate UUTs       │
└────────┬───────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ catalogDelegateUuts()            │
│ For each delegate in charter:    │
│ - Find authority token UTXO      │──────► blockfrost query(capoMph+UUTname)
│ - Store UTXO with uutIds array   │──────► store.saveUtxo(utxo)
└──────────────────────────────────┘
```

### Workflow 2: Sync Cycle (5s block-tip poll trigger)

```
┌─────────────────────────┐
│ blockPollTimer (5s)     │
│ → runSyncCycle()        │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Step 1: discoverChainTip()                   │
│ Fetch blocks/latest from Blockfrost.         │──────► GET blocks/latest
│ Update IN-MEMORY tip state only.             │
│ ⚠ MUST NOT store to blocks table.            │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Step 2: detectAndHandleRollbacks()           │
│ Fetch blocks/{tipHash}/previous?count=100    │──────► GET blocks/{hash}/previous
│ Compare against stored blocks.               │
│ Runs in BOTH modes (1 API call).             │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Step 3: syncChainState (mode selection)      │
│ gap = tipHeight - lastProcessedHeight        │
│                                              │
│ [incremental: gap ≤ catchupThreshold]        │
│   fetchAndStoreNewBlocks()                   │──────► GET blocks/{hash}/next
│   Per-block walk: blocks/{height}/addresses  │──────► GET blocks/{h}/addresses
│   processTransactionForNewUtxos() per tx     │
│   Mark each block processed                  │
│                                              │
│ [catchup: gap > catchupThreshold]            │
│   addresses/{capoAddr}/transactions?from=N   │──────► GET addresses/{addr}/txs
│   processTransactionForNewUtxos() per tx     │
│   addresses/{capoAddr}/utxos (reconcile)     │──────► GET addresses/{addr}/utxos
│   Save tip block as "processed" (cursor)     │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Step 4: tryConfirmPendingTxs()               │
│ For each entry still at status==="pending":  │
│   Query Blockfrost txs/{txHash}              │──────► GET txs/{txHash}
│   If on-chain: confirmPendingTx(hash, h)     │
│   If 404: skip (resubmission handles it)     │
│ Safety net for post-reload confirmation.     │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Step 5: resubmitStalePendingTxs()            │
│ Step 6: updateConfirmationDepths()           │
│ Step 7: executeSettledRollbacks()             │
└──────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ processTransactionForNewUtxos (per tx)       │
│ 1. Fetch full tx CBOR                        │──────► GET txs/{txHash}/cbor
│ 2. Decode transaction                        │──────► Helios.decodeTx()
│ 3. For each output: indexUtxoFromOutput()    │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│ indexUtxoFromOutput(txHash, index, output: TxOutput) │
│ ════════════════ TYPE BOUNDARY ═══════════════════   │
│ 1. Extract UUT IDs from output.value                 │
│ 2. Convert TxOutput → UtxoIndexEntry                 │
│ 3. Call store.saveUtxo(entry)                        │
└──────────────────────────────────────────────────────┘
```

### Workflow 3: Charter Change Detection

```
┌──────────────────────────────┐
│ During monitoring loop:      │
│ processTransactionForNewUtxos│
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Check if tx contains         │
│ charter UTXO (mph.charter)   │
└────────┬─────────────────────┘
         │ YES
         ▼
┌──────────────────────────────┐
│ Charter change detected:     │
│ 1. Fetch charter UTXO        │──────► network.getUtxos(capoAddress)
│ 2. Decode charter datum      │──────► bridge.charterDatumReader()
│ 3. Re-catalog delegate UUTs  │──────► catalogDelegateUuts()
└──────────────────────────────┘
```

---

## Collaboration Summary

### Dependencies (UtxoIndex USES)

**Capo Components** (passed at construction, decoupled):
- `address` - The Capo address to monitor (bech32 string or Address)
- `mph` - Minting policy hash for filtering tokens and identifying UUTs
- `bridge` - CapoHeliosBundleBridge for decoding charter datum to discover delegates

**Network Client** (External):
- CardanoClient interface for underlying blockchain queries
- Used as fallback when cache misses occur

**Blockfrost API** (External):
- REST endpoints for blockchain queries
- Response schemas validated with ArkType

**Helios** (External):
- `decodeTx()` - Parse transaction CBOR
- Ledger types: `TxInput`, `TxOutput`, `Value`, etc.

**Dexie** (External):
- IndexedDB wrapper for persistence
- Entity classes and table mapping

### Clients (External components that USE UtxoIndex)

**Expected users**:
- Browser-based Stellar Contracts dApps
- UI components requiring fast UTXO lookups
- Transaction builders needing current UTXO state
- Capo instances (using CachedUtxoIndex as their network client)

**Usage pattern**:
```typescript
// Create index with discrete components (decoupled from Capo)
const index = new CachedUtxoIndex({
    address: capoAddress,
    mph: capoMph,
    isMainnet: false,
    network: blockfrostClient,
    bridge: CapoHeliosBundle.bridge,
    blockfrostKey: "preprod_...",
});

// Index can then be used as the network client for a Capo
const capo = new MyCapo({
    setup: { network: index, ... },
    config: ...
});

// Query UTXOs via ReadonlyCardanoClient interface
const utxos = await index.getUtxos(address);
```

The indexer implements `ReadonlyCardanoClient`, enabling drop-in replacement of network clients with cached lookups.

---

## Testability

### Design Goals

The UtxoIndex supports efficient testing that minimizes external API calls (Blockfrost) while enabling database isolation when needed.

### Test Patterns

| Pattern | Use Case | API Efficiency |
|---------|----------|----------------|
| **Shared Index** | Read-only tests (UTXO queries, UUT lookups, pagination) | ~1 sync per suite |
| **Isolated Database** | Tests needing fresh state (initialization, periodic refresh) | ~1 sync per test |

The `dbName` constructor parameter enables database isolation: tests requiring fresh state create uniquely-named databases, while read-only tests share a single synced instance.

Isolated databases are cleaned up after each test; the shared database is cleaned up after the suite completes.

---

## Design Decisions

### Single-Address Monitoring

**Decision**: Monitor only the Capo address, not individual delegate addresses

**Rationale**:
- **Architectural insight**: Every transaction affecting delegate-UUTs or delegated-data records must touch the Capo address (for charter reference), so all relevant activity is visible at a single address
- **Simplicity**: No address discovery, tracking, or per-address sync state needed
- **Efficiency**: One address to poll instead of many; no complex address lifecycle management

**UUT Cataloging**: Delegate UUTs at external script addresses are cataloged by discovering them in the Capo charter, finding them via Blockfrost using `capoMph + uutName`, then storing the UTXO with its `uutIds` array for fast lookups via multiEntry index.

### Storage Abstraction

**Decision**: Define `UtxoStoreGeneric` interface with multiple implementations

**Rationale**:
- **Testing**: In-memory store for unit tests
- **Isolation**: Indexer logic independent of storage mechanism
- **Establish evolutionary path** to other storage mechanisms

**Current implementations**:
- `DexieUtxoStore` (production, browser-based)
- Memory store (BACKLOG)
- Dred store (BACKLOG)

### Charter Change Detection via UUT

**Decision**: Monitor for transactions containing `‹capoMph›.charter` token

**Rationale**:
- **Efficient**: Detected during normal monitoring loop
- **Accurate**: Charter UTXO being spent signals potential delegate changes
- **No polling**: Avoids redundant `findCharterData()` calls

**Implementation**: When processing transaction outputs, check for charter UUT. If found, re-catalog delegate UUTs to capture any new or changed delegates.

### Optional Datum Parsing via Capo Attachment

**Decision**: Support optional Capo attachment for datum parsing after construction

**Rationale**:
- **Lifecycle mismatch**: In CapoDappProvider, CachedUtxoIndex is often created before the Capo exists (using precompiled bundle config). Datum parsing requires the Capo's delegate controllers.
- **Decoupled design preserved**: `attachCapo()` accepts a Capo instance via `import type` — type-only, no runtime coupling. No new runtime dependency on Capo is introduced.
- **Catchup mechanism**: When a Capo is attached, cached UTXOs that haven't been parsed are caught up using `lastParsedBlockHeight` watermark.

**Implementation**:
- `attachCapo(capo)` stores the reference and triggers catchup
- During monitoring, new UTXOs with inline datums are parsed inline after indexing
- `parseDelegatedDatum()` on Capo encapsulates the parsing pipeline — CachedUtxoIndex calls it via the attached instance
- Processing-order invariant: outputs are indexed and records are saved before inputs mark spent state

**Data Flow**:
```
Capo attached → catchupRecordParsing()
                   ├─ query UTXOs where blockHeight > lastParsedBlockHeight
                   ├─ for each: decode CBOR → capo.parseDelegatedDatum()
                   ├─ store RecordIndexEntry
                   └─ advance lastParsedBlockHeight

New TX monitored → processTransactionForNewUtxos()
                   ├─ index outputs (with blockHeight)
                   ├─ parse datums → store records (if Capo attached)
                   └─ mark spent inputs (cascades to records)
```

### ReadonlyCardanoClient Conformance

**Decision**: Implement Helios `ReadonlyCardanoClient` interface (REQT/rc7km2x8hp)

**Rationale**:
- **Integration**: Enables direct use with Helios transaction building APIs
- **Drop-in replacement**: Can substitute for network clients during transaction construction
- **Performance**: Provides cached UTXO lookups instead of network calls
- **Consistency**: Standard interface familiar to Helios ecosystem users

**Implementation**: CachedUtxoIndex exposes the full ReadonlyCardanoClient interface:
- `getUtxo()`, `getUtxos()`, `getUtxosWithAssetClass()` for UTXO queries
- `hasUtxo()` for existence checks
- `getTx()` for transaction retrieval
- `isMainnet()`, `now`, `parameters` for network state

### In-Flight Transaction Integration

**Decision**: Connect the transaction submission path to the UTXO index, allowing submitted transactions to be reflected in query results while tracking their pending/confirmed/rolled-back lifecycle.

**Rationale**:
- **Stale reads after writes**: Without this, the index is blind to locally-submitted transactions until the next sync cycle (5s block-tip poll). Queries return stale data — spent UTXOs appear unspent, new outputs don't exist.
- **Double-spend prevention**: Transaction builders query the index for available UTXOs. If a just-submitted tx consumed a UTXO but the index doesn't know, a second transaction could try to spend the same input.
- **Pending-state visibility**: Downstream consumers (UI, transaction builders) need to know a change is in-flight — for pending indicators, deferring conflicting operations, and user feedback.
- **Timeout and rollback**: Each Cardano transaction has a validity window. If the tx isn't confirmed by the deadline, in-flight state must be rolled back with failure notification.

#### The Tension

The index serves as the Capo's network client (`ReadonlyCardanoClient`), but has no awareness of locally-submitted transactions — creating a blind spot that causes correctness and UX problems. The submission side (`TxSubmissionTracker` → `BatchSubmitController` → `TxBatcher`) knows every input consumed, every output created, and the validity window, but never tells the index.

#### Integration Format: CBOR

The submission side passes signed CBOR hex to the index via `registerPendingTx()`. CBOR is just a string — no Helios coupling leaks. The index decodes it through its existing `decodeTx()` pipeline, preserving the established type boundary.

#### Pending State Model

Pending state is a property of the **transaction**, not the UTXO. No new fields are added to `UtxoIndexEntry` or `RecordIndexEntry`.

- **Speculatively spent inputs**: `spentInTx` is set eagerly to the pending txHash. Queries filter these out (same as confirmed spent). If the pending tx rolls back, `spentInTx` is cleared — the UTXO is restored.
- **Pending-origin outputs**: Indexed normally via `indexUtxoFromOutput()`. Identified as pending because their `utxoId` prefix (`txHash#idx`) matches a txHash in the PendingTxEntry table. On rollback, these entries are deleted.
- **Pending records**: If a Capo is attached, inline datums from pending outputs are parsed into `RecordIndexEntry` as usual. **Record ID collision**: Records use `id` as PK in Dexie. When a pending tx updates an existing record, `saveRecord()` overwrites the original (same `id`, new `utxoId`). This means rollback cannot simply delete pending-origin records — the original data would be lost. On rollback, after deleting pending-origin records and restoring speculatively-spent input UTXOs, the rollback procedure **re-parses inline datums from the restored input UTXOs** (if Capo is attached) to recreate the overwritten records.

A `PendingTxEntry` Dexie table is the persistent source of truth for in-flight state:

```
PendingTxEntry (Dexie) {
    txHash: string           // PK
    description: string
    id: string               // TxDescription.id
    parentId?: string
    depth: number
    moreInfo?: string
    txName?: string
    txCborHex: string        // unsigned CBOR
    signedTxCborHex: string  // signed CBOR
    deadline: number         // txValidityEnd + graceBuffer, based on chain time
    status: "pending" | "confirmed" | "rollback-pending" | "rolled-back"
    submittedAt: number
    contestedByTxs?: Array<{ txHash: string; blockHeight: number }>
    confirmedAtBlockHeight?: number
    confirmedAtSlot?: number
    confirmState?: "provisional" | "likely" | "confident" | "certain"

    // Diagnostic fields — captured at registration/signing for post-reload inspection
    buildTranscript?: string[]       // tcx.logger.formattedHistory snapshot
    txStructure?: string             // dumpAny(tx, networkParams) output
    signedTxStructure?: string       // dumpAny(signedTx, networkParams) output
    submissionLog?: SubmissionLogEntry[]  // incremental submission event log
}

SubmissionLogEntry {
    at: number              // epoch ms
    event: string           // e.g. "submit-attempt", "submit-success", "submit-failed",
                            //      "confirm-attempt", "confirmed", "not-confirmed",
                            //      "backoff", "tx-expired", "rollback-pending", "rolled-back"
    submitter?: string      // submitter name (when event is per-submitter)
    detail?: string         // error message, state info, etc.
}
```

An in-memory `Map<txHash, txd>` holds the live `TxDescription` for current-session consumers. This is session-scoped — not persisted, not restored on reload. Events carry the live `txd` when available.

#### UTXO State Table

| Origin | Spending | Query behavior | On confirm | On rollback |
|--------|----------|---------------|------------|-------------|
| Confirmed | Unspent | ✅ Return | n/a | n/a |
| Confirmed | Speculatively spent | ❌ Filter out | → Confirmed spent | Restore (clear spentInTx) |
| Confirmed | Confirmed spent | ❌ Filter out (permanent) | n/a | n/a |
| Pending | Unspent | ✅ Return (identifiable as pending) | → Confirmed/Unspent | Remove entry |
| Pending | Speculatively spent | ❌ Filter out | → Confirmed/Confirmed spent | Remove entry |
| Pending | Confirmed spent | ❌ Filter out | n/a | n/a |

#### Deadline Calculation

The deadline is anchored to **chain time** (last known block slot time), not wallclock time:

```
deadline = txValidityEnd + graceBuffer
```

Where `txValidityEnd` is extracted from the decoded tx's validity interval, and `graceBuffer` (e.g. 40-60 seconds) accounts for block propagation delay. The 10s deadline checker compares against the last synced block's slot time. Rollback triggers when a synced block's time exceeds the deadline and the tx still isn't confirmed. This prevents premature rollback from wallclock drift or stale sync state.

#### Public Pending-State API

**`isPending` query**:
```typescript
isPending(item: TxOutputId | string | FoundDatumUtxo<any, any>): string | undefined
```

Synchronous check against the in-memory `pendingTxMap`. Returns the pending txHash or `undefined`. Lives on `CachedUtxoIndex` — `FoundDatumUtxo` stays a plain type. Consumers with a reference to the index can check pending state for any UTXO without additional queries.

**`getPendingTxs` query**:
```typescript
getPendingTxs(): PendingTxEntry[]
```

Returns all PendingTxEntry rows with `status === "pending"`. Used by CapoDappProvider on startup to show pending count/list before sync completes.

**`pendingSyncState` property**:
```typescript
get pendingSyncState(): "stale" | "fresh"
```

Starts as `"stale"` on construction/reload. Flips to `"fresh"` after the first sync cycle resolves pending state (confirms landed txs, rolls back expired ones). CapoDappProvider maps this to React state so UI can distinguish "showing stale pending list" from "showing verified status."

#### Events

Extends CachedUtxoIndex's existing EventEmitter:

- **`txConfirmed`**: `{ txHash, description, txd? }` — `txd` available if same session. CapoDappProvider shows ✓ toast.
- **`txRolledBack`**: `{ txHash, description, cbor, txd? }` — includes CBOR for recovery path. CapoDappProvider offers recovery UI.
- **`pendingSynced`**: Emitted after first sync cycle resolves pending state. CapoDappProvider flips from stale to fresh display.

#### Startup Recovery

On page reload, pending state survives in Dexie but the in-memory `pendingTxMap` is empty:

1. **Immediate**: Load PendingTxEntry rows with `status === "pending"` from Dexie. Expose to consumers with `pendingSyncState: "stale"`. UI can show count/list immediately.
2. **After first sync**: `runSyncCycle()` confirms any that landed in blocks — block processing provides fast-path confirmation, and `tryConfirmPendingTxs()` catches any remaining unconfirmed entries (e.g. when the confirming block was already processed in a prior session). `checkPendingDeadlines()` rolls back any that expired. Emit events for transitions. Flip `pendingSyncState` to `"fresh"`, emit `pendingSynced`.

#### Dataflow: Register Pending Transaction

```
[Submission Side]                    [CachedUtxoIndex]                         [DexieUtxoStore]
      |                                     |                                         |
      |-- registerPendingTx(cbor, opts) --> |                                         |
      |                                     |-- decodeTx(cbor)                        |
      |                                     |                                         |
      |                                     |-- persist PendingTxEntry {              |
      |                                     |     txHash, status:"pending",           |
      |                                     |     deadline, ...                       |
      |                                     |   } ---------------------------------> |-- savePendingTx()
      |                                     |                                         |
      |                                     |-- for each tx.body.input:               |
      |                                     |   set spentInTx = txHash  ------------> |-- saveUtxo({spentInTx})
      |                                     |   (txHash is in pendingTx table,        |
      |                                     |    so queries know it's speculative)    |
      |                                     |                                         |
      |                                     |-- for each tx.body.output:              |
      |                                     |   indexUtxoFromOutput()                  |
      |                                     |   utxoId = "txHash#idx"  -------------> |-- saveUtxo(entry)
      |                                     |   (txHash prefix matches pendingTx      |
      |                                     |    table, so queries know it's pending)  |
      |                                     |                                         |
      |                                     |-- if capo attached:                     |
      |                                     |   parse datums → records                |
      |                                     |   record.utxoId = "txHash#idx" -------> |-- saveRecord(entry)
      |                                     |   (same txHash prefix → pending)        |
      |                                     |                                         |
      |                                     |-- store txd in memory map               |
```

#### Dataflow: Confirm Pending Transaction

When `runSyncCycle()` discovers a txHash that exists in the pending-tx table (via block processing in `processTransactionForNewUtxos`):

1. Skip normal indexing (outputs already indexed, inputs already marked spent)
2. `setPendingTxStatus(txHash, "confirmed")`
3. Emit `txConfirmed { txHash, description, txd? }`

#### Dataflow: Rollback Expired Pending Transaction

When `checkPendingDeadlines()` (10s timer) finds a pending entry whose deadline is past the last synced block's slot time:

1. `clearSpentByTx(txHash)` — nullify `spentInTx` on UTXOs where `spentInTx === txHash` (restore speculatively-spent inputs)
2. `deleteUtxosByTxHash(txHash)` — remove UTXOs where `utxoId` starts with `txHash#` (remove pending outputs)
3. `deleteRecordsByTxHash(txHash)` — remove records where `utxoId` starts with `txHash#` (remove pending-origin records)
4. **Re-parse datums from restored input UTXOs** — decode the rolled-back tx's CBOR to find its inputs, look up the now-restored UTXOs, and re-parse their inline datums via `parseAndSaveRecord()` to recreate records that were overwritten during registration. Requires Capo attached; no-op without Capo (consistent with registration, which also skips parsing without Capo).
5. `setPendingTxStatus(txHash, "rolled-back")`
6. Emit `txRolledBack { txHash, description, cbor, txd? }`

#### Store Interface Extensions

New methods on `UtxoStoreGeneric` / `DexieUtxoStore`:

```typescript
// Pending transaction operations
savePendingTx(entry: PendingTxEntry): Promise<void>
findPendingTx(txHash: string): Promise<PendingTxEntry | undefined>
getPendingByStatus(status: string): Promise<PendingTxEntry[]>
setPendingTxStatus(txHash: string, status: string): Promise<void>

// Rollback operations
clearSpentByTx(txHash: string): Promise<void>        // nullify spentInTx where === txHash
deleteUtxosByTxHash(txHash: string): Promise<void>    // remove utxos where utxoId starts with txHash#
deleteRecordsByTxHash(txHash: string): Promise<void>  // remove records where utxoId starts with txHash#

// Cleanup
purgeOldPendingTxs(olderThan: number): Promise<void>  // delete non-pending entries older than 72h
```

Dexie schema addition: `pendingTxs` table with `txHash` as PK, `status` indexed.

#### Caller Integration

`registerPendingTx()` is called by the submission side after successful network submission, once per transaction, in submission order. The method signature:

```typescript
registerPendingTx(signedCborHex: string, opts: {
    description: string;
    id: string;
    parentId?: string;
    depth: number;
    moreInfo?: string;
    txName?: string;
    txCborHex: string;
    txd?: TxDescription<any, "submitted">;  // live object, not persisted
    // Diagnostic capture — persisted for post-reload inspection
    buildTranscript?: string[];   // tcx.logger.formattedHistory snapshot
    txStructure?: string;         // dumpAny(tx, networkParams) output
    signedTxStructure?: string;   // dumpAny(signedTx, networkParams) output
}): Promise<void>
```

#### Submission Log Persistence

The `submissionLog` array on `PendingTxEntry` is written incrementally by `TxSubmitMgr` as state transitions occur. Each transition (submit attempt, success, failure, confirmation check, backoff, expiry) appends a `SubmissionLogEntry` to the array and persists the updated entry to Dexie. This provides a full transcript of submission activity that survives page reload.

The log is written via `CachedUtxoIndex.appendSubmissionLog(txHash, entry)` which updates the Dexie record in place. `TxSubmitMgr` receives a callback at construction (or via its parent `TxSubmissionTracker`) to append log entries without coupling to the storage layer.

#### Tracker Lifecycle and TxBatcher Registry

`TxSubmissionTracker` objects are created by `BatchSubmitController` during transaction building and signing. Once a tracker's transaction is signed and submission begins, the tracker is **registered** with `TxBatcher` by txHash. From that point:

- **`TxBatcher` owns the tracker's lifecycle** — the tracker remains alive and accessible via `txBatcher.findTracker(txHash)` regardless of batch rotation or destruction.
- **`BatchSubmitController.destroy()` does not touch registered trackers** — they have already been handed off. The batch is purely about building, signing, and handing off.
- **Terminal cleanup**: `TxBatcher` destroys a tracker when its transaction reaches a terminal state (confirmed-certain or rolled-back). At that point the submission machinery is idle and the Dexie `PendingTxEntry` holds the complete record.
- **Session scope**: The registry is in-memory only. On page reload, the registry is empty and the `PendingTxTracker` detail panel falls back to Dexie data exclusively.

This separation means:
- Batches can be rotated freely without affecting in-flight submissions
- The `PendingTxTracker` can access live submitter state for any in-flight tx via `txBatcher.findTracker(txHash)`, providing richer detail (live submitter status, `tcx.logger`) when available
- The batch UI is decoupled from submission progress — it's about building and signing, not monitoring

#### TxDetailPanel — Shared Detail Component

`ShowTxDescription` in `TxBatchViewer.tsx` is refactored into an exported `TxDetailPanel` component that accepts a normalized props interface. Both `TxBatchViewer` and `PendingTxTracker` use this component:

- **Live mode** (same session, tracker available): Populates from `TxSubmissionTracker` — live submitter statuses, `tcx.logger.formattedHistory`, decoded tx objects.
- **Persisted mode** (after reload or tracker destroyed): Populates from Dexie `PendingTxEntry` — `buildTranscript`, `txStructure`, `signedTxStructure`, `submissionLog`.

The transcript tab shows:
- Live: per-submitter `$$statusSummary` + `tcx.logger.formattedHistory`
- Persisted: `submissionLog` entries (timestamped event log) + `buildTranscript` (build-time logger output)

Structure and diagnostics tabs work from CBOR (always in Dexie) or pre-captured `txStructure`/`signedTxStructure` strings.

#### Design Decisions Within In-Flight Integration

**Reuse `spentInTx` for speculative spends (no `pendingSpentByTx` field)**:
Pending-ness is a property of the transaction, not the UTXO. Rather than adding a separate `pendingSpentByTx` field to UtxoIndexEntry, `spentInTx` is set eagerly to the pending txHash. The pending-tx table determines whether a given `spentInTx` value represents a speculative or confirmed spend. This avoids schema changes to the heavily-used utxos and records tables, and avoids query methods needing to check two fields.

**`isPending()` on CachedUtxoIndex, not on FoundDatumUtxo**:
Considered adding a `pendingInTx` dynamic getter to `FoundDatumUtxo` (closing over the pending-tx map). Rejected because: (a) `FoundDatumUtxo` is currently a plain type used widely across the codebase, and making it require construction with a closure changes its nature; (b) centralizing pending logic on the index is cleaner — one method, one location. The `isPending()` method accepts `TxOutputId | string | FoundDatumUtxo<any, any>` for ergonomic call sites.

**`BuiltTcxStats` excluded from PendingTxEntry**:
`BuiltTcxStats` contains `Wallet`, `WalletHelper` (live objects with methods), and `PubKeyHash[]` (Helios types) — none of which are IndexedDB-serializable. Since stats are not needed for pending-state tracking, confirmation, rollback, or UI display, they are excluded entirely from the persisted entry.

**Register before submission, after signing**:
Registration happens after signing but before `wallet.submitTx()`. `registerPendingTx()` may trigger async lookups through the index (e.g. `parseDelegatedDatum` → `getDgDataController`) that must not race with submission. Pre-submission registration also closes the stale-read window entirely — speculative outputs and spent inputs are reflected in queries before the tx hits the network.

Submission failures fall into two categories that the system must distinguish:

- **Transient failures** — validity window not yet open, dependency UTXOs not yet visible to the receiving node, temporary node unavailability. These are expected in normal operation (especially for chained transactions where a parent tx hasn't propagated yet). `TxSubmitMgr` retries these automatically; the pending registration is correct because the tx is valid and will eventually succeed or expire.
- **Permanent failures** — structurally invalid tx, consumed inputs (slot battle). These will never succeed. The validity-timeout rollback path handles cleanup: the tx expires, `checkPendingDeadlines()` transitions to `rollback-pending`, and speculative state is restored.

Pre-submission registration is safe for both categories: transient failures resolve through retry, permanent failures resolve through expiry. No separate submission-failure rollback path is needed.

**CapoDappProvider mediates UI access**:
UI components do not observe CachedUtxoIndex directly. CapoDappProvider holds the `utxoIndex` reference, subscribes to its events, and manages React state. Pending-tx state flows through CapoDappProvider: it calls `getPendingTxs()` on startup, observes `pendingSyncState`, and subscribes to `txConfirmed`/`txRolledBack`/`pendingSynced` events to update UI state.

**72-hour purge retention for non-pending entries**:
Confirmed and rolled-back PendingTxEntries are purged after 72 hours. The purge runs on the 10s deadline-check timer (cheap — a single Dexie delete query). Long enough for any session to observe final status; short enough to prevent unbounded accumulation.

**One `registerPendingTx` call per transaction, in submission order**:
For chained batches (txA → txB where txB spends txA's output), each tx is registered separately with its own txHash. This means rollback of txB doesn't affect txA's entries, since rollback operates by txHash. Registration order matches submission order.

**Non-registered transactions in `runSyncCycle` use existing path**:
When `runSyncCycle` discovers a txHash with no matching PendingTxEntry (the common case — transactions submitted by other users, or before the index existed), the existing indexing path runs unmodified. The pending-tx check is additive, not a gate.

#### Open Questions

- **Test strategy**: Current CachedUtxoIndex tests are all Blockfrost/preprod-based. Pending-tx features need either emulator-based test infrastructure or integration tests with real submissions.
- **Chained transactions**: Per-tx registration with distinct txHashes handles chains naturally (txB's rollback doesn't affect txA). Edge cases with rapid sequential submissions may need further analysis.

---

## Key Expectations

### Periodic Refresh:
- Automatic 5s block-tip poll triggers `runSyncCycle()` when a new block is detected
- Incremental sync optimization (get deltas since lastSyncedBlock)

## Future work

### Alternative Network Provider (Ogmios)
- Decouple from Blockfrost; support Ogmios mini-protocol via `@cardano-ogmios` TypeScript module
- Same essential queries, connecting to any Cardano node via JSON-RPC (REQT/70sncha8f2)

### Alternative Storage Backends
- Memory store implementation for testing (REQT/pd0vdphpmp)
- Dred store for realtime state-sharing and multi-user coordination (REQT/7h35vgvw4a)
- CouchDB or PostgreSQL for server-layer deployment — enables API service providing low-latency access to subsets of UTxOs from Capos holding millions of records (REQT/q83ztd3kkv)

### Server-Mediated Client Sync
- Client syncs to a filtering server rather than directly to chain
- Server provides client-specific filtering (no need to process all historical Capo transactions)
- Filtered incremental blocks/UTxOs for lightweight operational profile
- Critical for mobile applications (REQT/v9h5pez7bh)

### Expose details for Health Monitoring UI
- Support Dashboard showing address sync status
- Error history and retry logic
- Performance metrics (API calls, sync latency, etc.)

### Realtime Updates via DRED

---

**Document Version**: 2.1
**Last Updated**: 2026-03-07 - Added diagnostic fields to PendingTxEntry (buildTranscript, txStructure, signedTxStructure, submissionLog), tracker lifecycle transfer to TxBatcher, TxDetailPanel shared component design, submission log persistence via appendSubmissionLog
