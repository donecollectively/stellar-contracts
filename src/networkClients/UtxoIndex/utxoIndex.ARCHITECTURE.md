# UtxoIndex Architecture

## System Overview

The UtxoIndex is a **dedicated UTXO monitor and cache** for Cardano smart contracts built with Stellar Contracts. It provides persistent, browser-based storage of UTXOs needed for interacting with Capo contract instances, enabling fast local lookups and reducing redundant network queries. The charter token resides at the Capo address and every transaction affecting any delegate-UUT or delegated-data record must also touch the Capo address (for charter reference), the indexer monitors transactions affecting the single Capo address, and incidentally also tracks UUTs at other addresses referenced by the Capo Charter.

---

## Components

### Component Inventory

| Component | Location | Type | Owner |
|-----------|----------|------|-------|
| `CachedUtxoIndex` | Local (browser) | Class | UtxoIndex |
| `DexieUtxoStore` | Local (browser) | Class | UtxoIndex |
| `UtxoStoreGeneric` | Local (browser) | Interface | UtxoIndex |
| Blockfrost Type Validators | Local (browser) | Type definitions + ArkType factories | UtxoIndex |
| Dexie Record Classes | Local (browser) | Entity classes | UtxoIndex |
| Blockfrost API | Remote | REST API | External (Blockfrost) |
| IndexedDB | Local (browser) | Database | External (Browser) |

### Component Descriptions

#### CachedUtxoIndex
**Purpose**: Main orchestrator for UTXO indexing, transaction monitoring, and block tracking

**Responsibilities**:
- Monitor the Capo address for new transactions (all delegate activity touches this address)
- Fetch and cache all UTXOs at the Capo address
- Catalog delegated-data policy UUTs at their delegate script addresses (these trigger correct policy enforcement for different record types)
- Detect charter UTXO changes during routine monitoring
- Manage communication with Blockfrost API
- Coordinate storage operations via `UtxoStoreGeneric` interface

**Key State**:
- `capoAddress: string` - The primary address to monitor
- `capoMph: string` - Minting policy hash for filtering relevant tokens
- `lastBlockId: string` - Most recent block hash seen
- `lastBlockHeight: number` - Most recent block height seen
- `store: UtxoStoreGeneric` - Storage backend instance

#### DexieUtxoStore
**Purpose**: Dexie/IndexedDB implementation of storage backend

**Responsibilities**:
- Persist blocks, UTXOs, transactions, and logs to IndexedDB
- Provide indexed queries for efficient retrieval
- Generate unique process IDs for logging sessions
- Track structured logs with stack traces for debugging

**Schema** (v2):
```
blocks: hash (PK), height
utxos: utxoId (PK), blockId, blockHeight
txs: txid (PK)
logs: logId (PK), [pid+time] (compound index)
delegateUuts: uutId (PK), delegateRole, address
```

#### UtxoStoreGeneric
**Purpose**: Storage abstraction interface

**Why abstraction exists**: Enables alternative storage backends (in-memory for testing, future: Dred for high-performance state sharing, low latency and multi-user coordination) without changing essential indexer logic

**Operations**:
- `log(id, message)` - Structured logging
- `findBlockId(id)` / `saveBlock(block)`
- `findUtxoId(id)` / `saveUtxo(utxo)`
- `findTxId(id)` / `saveTx(tx)`
- `saveUUT(id, utxoId)` / `findUtxoByUUT(id)`

#### Blockfrost Integration
**Purpose**: External blockchain data provider

**Mechanism**: REST API accessed via `fetchFromBlockfrost()` method

**Endpoints Used**:
- `blocks/latest` - Current blockchain tip
- `blocks/{hash_or_number}` - Block details
- `addresses/{address}/transactions` - Transaction history for address
- `txs/{txId}/cbor` - Full transaction CBOR
- `txs/{txHash}/utxos` - UTXO details for transaction

**Authentication**: Project ID in request headers

**Validation**: All responses validated with ArkType before storage

---

## Artifact Ownership

| Directory/File | Owner | Purpose |
|----------------|-------|---------|
| `src/networkClients/UtxoIndex/` | UtxoIndex | Root directory |
| `CachedUtxoIndex.ts` | UtxoIndex | Main orchestrator |
| `DexieUtxoStore.ts` | UtxoIndex | Dexie implementation |
| `UtxoStoreGeneric.ts` | UtxoIndex | Storage interface |
| `blockfrostTypes/*.ts` | UtxoIndex | API type definitions |
| `dexieRecords/*.ts` | UtxoIndex | Database entity classes |
| `UtxoIndex.reqts.md` | UtxoIndex | Requirements document |
| `utxoIndex.ARCHITECTURE.md` | UtxoIndex | This document |

**External Dependencies**:
- Capo instance (provides address list, charter data)
- Blockfrost API (provides blockchain data)
- Browser IndexedDB (provides persistence)

---

## Tool/Interface Surface

### Public API (CachedUtxoIndex)

**Constructor**:
```typescript
new CachedUtxoIndex({
    capo: Capo<any, any>,
    blockfrostKey: string,
    storeIn?: "dexie" | "memory" | "dred"
})
```

**Core Methods** (currently internal, may be exposed):
- `syncNow(): Promise<void>` - Full synchronization of Capo address and UUT catalog
- `checkForNewTxns(): Promise<void>` - Check for new transactions at Capo address
- `catalogDelegateUuts(charterData: CharterData): Promise<void>` - Catalog delegate UUTs from charter

**Future Query API** (BACKLOG):
- `queryUtxosByAddress(address: string): Promise<UtxoDetailsType[]>`
- `queryUtxosByAsset(mph: string, tokenName?: string): Promise<UtxoDetailsType[]>`
- `queryUtxosByDelegate(delegateRole: string): Promise<UtxoDetailsType[]>`

### Storage Interface (UtxoStoreGeneric)

```typescript
interface UtxoStoreGeneric {
    log(id: string, message: string): Promise<void>

    // Block operations
    findBlockId(id: string): Promise<BlockDetailsType | undefined>
    saveBlock(block: BlockDetailsType): Promise<void>

    // UTXO operations
    findUtxoId(id: string): Promise<UtxoDetailsType | undefined>
    saveUtxo(utxo: UtxoDetailsType): Promise<void>

    // Transaction operations
    findTxId(id: string): Promise<txCBOR | undefined>
    saveTx(tx: txCBOR): Promise<void>

    // UUT catalog operations
    saveUUT(id: string, utxoId: string): Promise<void>
    findUtxoByUUT(id: string): Promise<UtxoDetailsType | undefined>
}
```

### Data Types

**CatalogEntry** (for delegate UUTs):
```typescript
type CatalogEntry = {
    uutId: string      // UUT token name (unique identifier)
    utxoId: string     // Current UTXO ID where this UUT resides
    delegateRole: string  // Role name (e.g., "mintDelegate", "spendDelegate", dgDataPolicy name)
    address: string    // Script address where the UUT is held
}
```

**BlockDetailsType**: Blockfrost block response schema (hash, height, time, slot, epoch, tx_count, etc.)

**UtxoDetailsType**: Blockfrost UTXO response schema (address, tx_hash, output_index, amount[], block, inline_datum, etc.)

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
│ 1. Fetch charter data          │──────► capo.findCharterData()
│ 2. Fetch all Capo UTXOs        │──────► GET addresses/{capo}/utxos
│ 3. Store UTXOs in DB           │──────► store.saveUtxo()
│ 4. Catalog delegate UUTs       │
└────────┬───────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ catalogDelegateUuts()            │
│ For each delegate in charter:    │
│ - Find authority token UTXO      │──────► blockfrost query(capoMph+UUTname)
│ - Store UUT → UTXO mapping       │──────► store.saveUUT(uutId, utxoId)
└──────────────────────────────────┘
```

### Workflow 2: Transaction Monitoring (Every 60 seconds)

```
┌────────────────────────┐
│ setInterval(60s)       │
│ checkForNewTxns()      │
└────────┬───────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Monitor Capo address:        │
│ 1. Get lastSyncedBlock       │
│ 2. Fetch new transactions    │──────► GET addresses/{capo}/txs?from={block}
│ 3. Validate summaries        │──────► AddressTxSummariesFactory.validate()
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ processTransactionForNewUtxos│
│ 1. Fetch full tx CBOR        │──────► GET txs/{txHash}/cbor
│ 2. Decode transaction        │──────► Helios.decodeTx()
│ 3. Index new UTXOs           │──────► store.saveUtxo()
│ 4. Update UUT catalog        │──────► store.saveUUT() (if delegate UUT moved to new UTXO)
│ 5. Update lastSyncedBlock    │
└──────────────────────────────┘
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
│ 1. Fetch new charter data    │──────► capo.findCharterData()
│ 2. Re-catalog delegate UUTs  │──────► catalogDelegateUuts()
└──────────────────────────────┘
```

---

## Collaboration Summary

### Dependencies (UtxoIndex USES)

**Capo** (External):
- `capo.findCharterData()` - Get current charter to discover delegates
- `capo.address` - The address to monitor
- `capo.mph` - Minting policy hash for filtering tokens and identifying UUTs

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

**Usage pattern** (proposed):
```typescript
const indexer = new CachedUtxoIndex({
    capo: myCapo,
    blockfrostKey: "preprod_..."
});

// Indexer automatically syncs and monitors in background

// Query UTXOs (future API)
const utxos = await indexer.queryUtxosByAddress(address);
```

This usage SHOULD match with other helios network-clients and be used via the same interface.

---

## Design Decisions

### Single-Address Monitoring

**Decision**: Monitor only the Capo address, not individual delegate addresses

**Rationale**:
- **Architectural insight**: Every transaction affecting delegate-UUTs or delegated-data records must touch the Capo address (for charter reference), so all relevant activity is visible at a single address
- **Simplicity**: No address discovery, tracking, or per-address sync state needed
- **Efficiency**: One address to poll instead of many; no complex address lifecycle management

**UUT Cataloging**: Delegate UUTs at external script addresses are cataloged by discovering them in the Capo charter, finding them in blockfrost via `capoMph + uutName`, then storing the UUT→UTXO mapping for fast lookups.

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

---

## Key Expectations

### Periodic Refresh:
- Implement automatic monitoring intervals (currently 60s defined, plus manual trigger)
- Incremental sync optimization (get deltas since lastSyncedBlock)

## Future work

### Alternative Storage Backends
- Memory store implementation for testing
- Dred store for realtime state-sharing and multi-user coordination

### Expose details for Health Monitoring UI
- Support Dashboard showing address sync status
- Error history and retry logic
- Performance metrics (API calls, sync latency, etc.)

### Realtime Updates via DRED

---

## Architectural Evolution

---

**Document Version**: 1.0
**Last Updated**: 2026-01-16
**Architectural Session**: Architect skill facilitation of UtxoIndex discovery
