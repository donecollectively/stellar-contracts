# UtxoIndex Architecture

## System Overview

The UtxoIndex is a **multi-address blockchain UTXO monitor and cache** for Cardano smart contracts built with Stellar Contracts. It provides persistent, browser-based storage of UTXOs needed for interacting with Capo contract instances, enabling fast local lookups and reducing redundant network queries.

**Architectural Trigger**: Charter change detection in the Capo system. When delegate references in the charter are updated, the UtxoIndex automatically discovers new addresses to monitor.

**Key Architectural Decision (2026-01)**: Refactored from delegate-aware indexer to generic address-based monitor. The indexer no longer understands delegate types or charter structure—it simply monitors a configured set of addresses. Charter interpretation and address discovery is delegated to the Capo layer.

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
- Maintain set of monitored addresses with metadata (address, mph filter, health status)
- Fetch all UTXOs from monitored addresses
- Monitor addresses for new transactions on periodic interval
- Detect charter UTXO changes and trigger address list refresh
- Manage communication with Blockfrost API
- Coordinate storage operations via `UtxoStoreGeneric` interface

**Key State**:
- `addresses: Set<MonitoredAddress>` - Active addresses being monitored
- `lastBlockId: string` - Most recent block hash seen
- `lastBlockHeight: number` - Most recent block height seen
- `store: UtxoStoreGeneric` - Storage backend instance

**Does NOT**:
- Understand delegate types or roles (that's Capo's job)
- Interpret charter structure
- Make decisions about which addresses to monitor (receives address list from external source)

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
monitoredAddresses: address (PK), active, lastSyncedBlock
```

#### UtxoStoreGeneric
**Purpose**: Storage abstraction interface

**Why abstraction exists**: Enables alternative storage backends (in-memory for testing, future: Dred for MCP-based persistence) without changing indexer logic

**Operations**:
- `log(id, message)` - Structured logging
- `findBlockByBlockId(blockId)` / `saveBlock(block)`
- `findUtxoByUtxoId(utxoId)` / `saveUtxo(utxo)`
- `findTxById(txId)` / `saveTx(tx)`
- `findAddressByAddress(address)` / `saveAddress(address)` / `getActiveAddresses()`

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
- `syncNow(): Promise<void>` - Full synchronization of all monitored addresses
- `monitorForNewTransactions(): Promise<void>` - Check for new transactions at all addresses
- `updateMonitoredAddresses(charterData: CharterData): Promise<void>` - Refresh address list from charter

**Future Query API** (BACKLOG):
- `queryUtxosByAddress(address: string): Promise<UtxoDetailsType[]>`
- `queryUtxosByAsset(mph: string, tokenName?: string): Promise<UtxoDetailsType[]>`
- `queryUtxosByDelegate(delegateRole: string): Promise<UtxoDetailsType[]>`

### Storage Interface (UtxoStoreGeneric)

```typescript
interface UtxoStoreGeneric {
    log(id: string, message: string): Promise<void>

    // Block operations
    findBlockByBlockId(blockId: string): Promise<BlockDetailsType | undefined>
    saveBlock(block: BlockDetailsType): Promise<void>

    // UTXO operations
    findUtxoByUtxoId(utxoId: string): Promise<UtxoDetailsType | undefined>
    saveUtxo(utxo: UtxoDetailsType): Promise<void>

    // Transaction operations
    findTxById(txId: string): Promise<txCBOR | undefined>
    saveTx(tx: txCBOR): Promise<void>

    // Address operations (v2)
    findAddressByAddress(address: string): Promise<MonitoredAddress | undefined>
    saveAddress(address: MonitoredAddress): Promise<void>
    getActiveAddresses(): Promise<MonitoredAddress[]>
}
```

### Data Types

**MonitoredAddress**:
```typescript
type MonitoredAddress = {
    address: string           // bech32-encoded Cardano address (PK)
    mph?: string             // hex-encoded minting policy hash filter
    policyId?: string        // same as mph (for blockfrost compatibility)
    addedAt: number          // timestamp when address was added
    lastSyncedBlock?: number // last block height processed for this address
    lastError?: {            // most recent error for health tracking
        timestamp: number
        message: string
        txHash?: string
    }
    lastSuccessfulSync?: number  // timestamp of last successful sync
    active: boolean          // false when delegate removed from charter
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
┌────────────────────┐
│ syncNow()          │
│ 1. Fetch charter   │──────► capo.findCharterData()
│ 2. Update addresses│
│ 3. Fetch all UTXOs │
│ 4. Store in DB     │
└────────┬───────────┘
         │
         ▼
┌──────────────────────────┐
│ updateMonitoredAddresses()│
│ Traverse charter:         │
│ - Add capo.address        │──────► DexieUtxoStore.saveAddress()
│ - For each delegate:      │
│   - Resolve delegate      │──────► capo.getMintDelegate()
│   - Extract address       │        capo.getSpendDelegate()
│   - Add with mph filter   │        capo.getDgDataController()
└──────────┬────────────────┘        etc.
           │
           ▼
┌──────────────────────────┐
│ For each address:         │
│ fetchUtxosFromAddress()   │
│ 1. Call Blockfrost API    │──────► GET addresses/{addr}/utxos
│ 2. Validate responses     │──────► UtxoDetailsFactory.validate()
│ 3. Filter by mph          │
│ 4. Store UTXOs            │──────► DexieUtxoStore.saveUtxo()
│ 5. Fetch transactions     │──────► GET txs/{txId}/cbor
│ 6. Update block info      │──────► GET blocks/{height}
└───────────────────────────┘
```

### Workflow 2: Transaction Monitoring (Every 60 seconds)

```
┌────────────────────────┐
│ setInterval(60s)       │
│ monitorForNewTxns()    │
└────────┬───────────────┘
         │
         ▼
┌──────────────────────────────┐
│ For each active address:     │
│ monitorAddressForNewTxns()   │
│ 1. Get lastSyncedBlock       │──────► DexieUtxoStore.findAddress()
│ 2. Fetch new transactions    │──────► GET addresses/{addr}/txs?from={block}
│ 3. Validate summaries        │──────► AddressTxSummariesFactory.validate()
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ processTransactionForNewUtxos│
│ 1. Fetch full tx CBOR        │──────► GET txs/{txHash}/cbor
│ 2. Decode transaction        │──────► Helios.decodeTx()
│ 3. Check each output         │
│ 4. Filter by mph (if set)    │
│ 5. Index new UTXOs           │──────► DexieUtxoStore.saveUtxo()
│ 6. Update lastSyncedBlock    │──────► DexieUtxoStore.saveAddress()
└────────┬─────────────────────┘
         │
         ▼ (on error)
┌──────────────────────────────┐
│ recordAddressError()         │
│ Update address.lastError     │──────► DexieUtxoStore.saveAddress()
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
│ Charter changed detected     │
│ 1. Fetch new charter data    │──────► capo.findCharterData()
│ 2. Update address list       │──────► updateMonitoredAddresses()
│ 3. Mark removed addrs        │        (sets active=false)
│    inactive                  │
│ 4. Add new addresses         │
│ 5. Continue monitoring       │
└──────────────────────────────┘
```

---

## Collaboration Summary

### Dependencies (UtxoIndex USES)

**Capo** (External):
- `capo.findCharterData()` - Get current charter to discover delegates
- `capo.getMintDelegate()`, `getSpendDelegate()`, etc. - Resolve delegate instances
- `capo.address` - Primary address to monitor
- `capo.mph` - Minting policy hash for filtering tokens
- `delegate.address` - Extract addresses from delegate instances

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

---

## Design Decisions

### Address-Based vs Delegate-Aware Architecture

**Decision**: Use generic address monitoring rather than delegate-specific indexing

**Rationale**:
- **Separation of concerns**: UtxoIndex doesn't need to understand charter structure or delegate types
- **Reusability**: Can monitor any Cardano address, not just Capo delegates
- **Simplicity**: ~150 lines of delegate traversal logic simplified to address collection
- **Maintainability**: Charter schema changes don't require indexer updates

**Trade-offs**:
- Slightly more work during address discovery (Capo must traverse charter)
- Indexer stores more metadata about addresses (role, name, etc.)

### Storage Abstraction

**Decision**: Define `UtxoStoreGeneric` interface with multiple implementations

**Rationale**:
- **Testing**: In-memory store for unit tests
- **Future-proofing**: Potential Dred/MCP-based remote storage
- **Isolation**: Indexer logic independent of storage mechanism

**Current implementations**:
- `DexieUtxoStore` (production, browser-based)
- Memory store (BACKLOG)
- Dred store (BACKLOG)

### Charter Change Detection via UUT

**Decision**: Monitor for transactions containing `mph.charter` token

**Rationale**:
- **Efficient**: Detected during normal monitoring loop
- **Accurate**: Charter UTXO spending is definitive signal
- **No polling**: Avoids redundant `findCharterData()` calls

**Implementation**: When processing transaction outputs, check for charter UUT. If found, trigger `updateMonitoredAddresses()`.

### MPH Filtering Strategy

**Decision**: Fetch all UTXOs, filter in-memory by mph

**Alternative considered**: Use Blockfrost `/utxos/{asset}` endpoint per token

**Rationale**:
- **Fewer API calls**: Single request per address vs N requests per asset
- **Simpler logic**: No need to enumerate all tokens in mph
- **Performance**: In-memory filtering is fast enough for typical UTXO counts

### Per-Address Block Height Tracking

**Decision**: Track `lastSyncedBlock` per address (v2)

**Rationale**:
- **Efficiency**: New addresses don't need to scan entire history
- **Accuracy**: Each address has independent sync state
- **Recovery**: Address-specific error handling and retry

---

## Open Questions and Future Work

### Periodic Refresh (BACKLOG)
- Implement automatic monitoring intervals (currently 60s defined but manual trigger)
- Separate charter refresh interval (currently 1 hour defined)

### Query API (BACKLOG)
- Expose public methods for UTXO queries by address, asset, delegate role
- Support complex predicates (e.g., "all UTXOs at dgData controller addresses with mph filter")

### Performance Optimization
- Parallel address monitoring with rate limiting
- Batch Blockfrost requests where possible
- Incremental sync optimization (resume from lastSyncedBlock)

### Alternative Storage Backends
- Memory store implementation for testing
- Dred/MCP store for remote persistence

### Charter Subscription Pattern
- Event-based address updates instead of periodic polling
- Capo publishes address changes, UtxoIndex subscribes

### Health Monitoring UI
- Dashboard showing address sync status
- Error history and retry logic
- Performance metrics (API calls, sync latency, etc.)

---

## Architectural Evolution

### Pre-2026 (Initial Design)
- UtxoIndex directly traversed charter structure
- Resolved each delegate type explicitly
- Fetched specific UUTs via `DelegateMustFindAuthorityToken()`
- Tightly coupled to Capo charter schema

### 2026-01 (Current Architecture)
- Address-based monitoring with metadata
- Charter interpretation delegated to Capo layer
- Generic UTXO indexing by address + mph filter
- Dexie schema v2 with `monitoredAddresses` table

### Future Considerations
- MCP server integration for cross-session persistence
- Real-time updates via WebSocket or SSE (eliminating polling)
- Multi-network support (preview, preprod, mainnet simultaneously)
- Shared indexer instance across multiple Capo contracts

---

**Document Version**: 1.0
**Last Updated**: 2026-01-16
**Architectural Session**: Architect skill facilitation of UtxoIndex discovery
