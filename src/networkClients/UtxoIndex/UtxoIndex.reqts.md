# UtxoIndex

## MAINTAINERS MUST READ

> **🛑 COMPLIANCE TRIGGER: READ THIS FIRST**
>
> This document is strictly managed. Before interpreting or implementing these requirements, you **MUST** read and apply the **Requirements Consumer Skill** at:
>
> `skillz/reqm/reqt-consumer.SKILL.md`
>
> **CRITICAL**: You are **FORBIDDEN** from modifying this file or proceeding with implementation until you have ingested and studied the "Read-Only" constraints and "Escalation Protocol" defined in that skill.

> **hash.notice.reqt-consumer**: ef6a1fc351265553

> **NOTE**: See [reqm.SKILL.md](../../../skillz/reqm/reqm.SKILL.md). When managing requirements, you MUST follow the guidelines and conventions in that document, including expression of purpose/intended function as well as the detailed, formal requirements.

## About the UtxoIndex

The UtxoIndex provides a persistent, efficient cache of UTXOs (Unspent Transaction Outputs) needed for interacting with a specific Capo instance. This includes the charter token, delegate UUTs (Unique Utility Tokens) referenced in the charter, and all delegated-data records stored at the Capo address. The indexer monitors the blockchain for new transactions and maintains an up-to-date view of relevant UTXOs, reducing the need for repeated network queries and enabling fast lookups for application logic.

The indexer operates as a **dedicated Capo monitor** with a simplified architecture:

 - **Single-Address Monitoring**: Because the charter token resides at the Capo address and every transaction affecting delegate-UUTs or delegated-data records must touch the Capo address (for charter reference or the records themselves), only the Capo address needs monitoring
 - **UUT Cataloging**: Delegate UUTs at external script addresses are discovered from the charter and cataloged via Blockfrost queries for fast lookups
 - **Delegate UUT Detection**: When delegate UUTs are moved to new UTXOs due to transaction activity, the catalog is updated to reflect the current UTXO location
 - **Charter Change Detection**: When the charter UTXO (mph.charter token) appears in a transaction, the indexer re-catalogs delegate UUTs

**Essential technologies**: Dexie (IndexedDB wrapper), Blockfrost REST API, Helios (transaction decoding), ArkType (runtime validation).

**Related technologies**: Capo (provides charter data and delegate discovery), browser IndexedDB (underlying storage).

### Helios ReadonlyCardanoClient Conformance

The CachedUtxoIndex MUST implement the Helios `ReadonlyCardanoClient` interface to enable seamless integration with Helios transaction building and validation:

```typescript
interface ReadonlyCardanoClient {
  getTx?: (id: TxId) => Promise<Tx>
  getUtxo(id: TxOutputId): Promise<TxInput>
  getUtxos(address: Address): Promise<TxInput[]>
  getUtxosWithAssetClass?: (
    address: Address,
    assetClass: AssetClass
  ) => Promise<TxInput[]>
  hasUtxo(utxoId: TxOutputId): Promise<boolean>
  isMainnet(): boolean
  now: number
  parameters: Promise<NetworkParams>
}
```

This conformance enables the indexer to be used directly as a network client for transaction building, replacing or augmenting the underlying Blockfrost/network client with cached data for faster operations.

### Must Read: Special Skills and Know-how

This section provides directives for proactive-research triggers. People and agents should use these to recognize the triggers for specialized material to be considered highly relevant.

1. **Blockfrost API**: When implementing or debugging API interactions, you SHOULD review the [Blockfrost API documentation](https://docs.blockfrost.io/) to understand endpoint schemas, rate limits, and pagination.
2. **Dexie/IndexedDB**: When modifying storage schema or queries, you SHOULD review [Dexie documentation](https://dexie.org/docs/) for entity mapping, indexing, and transaction patterns.
3. **Charter Structure**: When modifying address discovery logic, you MUST understand Capo charter structure via the Capo requirements document.

### Collaborators

 - **USED BY UtxoIndex**: `Capo` instance (for `findCharterData()`, delegate resolution, address extraction), Blockfrost API (blockchain queries), Helios `decodeTx()` (transaction parsing), Dexie (IndexedDB persistence).
 - **Expected to USE UtxoIndex**: Browser-based Stellar Contracts dApps, UI components requiring fast UTXO lookups, transaction builders needing current UTXO state.

### Background

Interacting with Cardano smart contracts requires frequent queries to locate UTXOs containing specific tokens or data. Without caching, applications must repeatedly query the blockchain network (via Blockfrost or other APIs) for the same information, leading to:

1. **Performance Issues**: Network latency and API rate limits slow down application responsiveness
2. **Redundant Queries**: Multiple components may request the same UTXO data independently
3. **Inconsistent State**: Without a centralized cache, different parts of an application may see different views of the blockchain state
4. **Complexity**: Each component must handle network errors, retries, and state synchronization independently

### UtxoIndex's Design Goals

The UtxoIndex addresses these challenges by providing a centralized, persistent cache.

#### General Approach

 - **Persistent Storage**: Uses Dexie (IndexedDB) for browser-based persistence, allowing the cache to survive page reloads
 - **Incremental Updates**: Monitors monitored addresses for new transactions and incrementally updates the index
 - **Type-Safe Validation**: Uses ArkType factories to validate all data from external APIs before storage
 - **Address-Based Monitoring**: Tracks a configurable set of addresses with optional MPH filters for token selection
 - **Block Tracking**: Maintains block height and hash information for efficient querying and monitoring

#### Specific Goals

1. **Efficient UTXO Lookups**: Provide fast, local lookups for UTXOs by ID or asset class without network calls
2. **Automatic Synchronization**: Monitor the Capo address for new transactions and update the index automatically
3. **Delegate UUT Tracking**: Index all delegate authority tokens referenced in the charter via UUT cataloging
4. **Transaction History**: Store full transaction CBOR data for indexed UTXOs to enable offline analysis
5. **Block Information**: Cache block details (height, hash, time) for efficient blockchain state queries
6. **Structured Logging**: Provide detailed logging with process IDs and timestamps for debugging and monitoring
7. **Storage Strategy Abstraction**: Support multiple storage backends (Dexie, memory, future: Dred) via a generic interface
8. **Testability**: Support efficient testing patterns that minimize external API calls while enabling database isolation when needed

### The Development Plan

We will start simple with essential requirements and develop incrementally to achieve key results, a bit at a time. Implementer should focus exclusively on achieving one incremental result at a time.

BACKLOGGED items SHOULD be considered in the structural design, but implementation MUST focus entirely on IN-PROGRESS requirements. COMPLETED requirements that are working MUST be retained in working order. NEXT requirements are those that can be implemented and work, based on having their dependencies already working or sufficiently stubbed.

## Functional Areas and Key Requirements

### 1. CachedUtxoIndex Class (Core Indexing Logic)

#### Functional Requirements:

1. **Initialization & Configuration**:
   - MUST accept a `Capo` instance, Blockfrost API key, and storage strategy in constructor
   - MUST automatically determine Blockfrost base URL based on API key prefix (mainnet/preprod/preview)
   - MUST initialize the storage backend (Dexie, memory, or Dred) based on strategy parameter
   - MUST trigger initial synchronization (`syncNow()`) on construction

2. **Initial Synchronization**:
   - MUST fetch all UTXOs from the capo address using `capo.findCapoUtxos()`
   - MUST extract and fetch transaction details for all unique transaction IDs found in capo UTXOs
   - MUST locate the charter UTXO using `capo.mustFindCharterUtxo()`
   - MUST fetch charter data using `capo.findCharterData()`
   - MUST resolve and index all delegate UUTs mentioned in the charter
   - MUST fetch and store the latest block details from Blockfrost

3. **Transaction Monitoring**:
   - MUST monitor the capo address for new transactions using Blockfrost API
   - MUST use `addresses/{address}/transactions` endpoint with `order=desc`, `count=100`, and `from` parameter
   - MUST track `lastBlockHeight` to determine the starting point for monitoring
   - MUST fetch full transaction details for each new transaction
   - MUST identify and index new UTXOs containing UUTs from the capo's minting policy
   - MUST ensure only the most recent UTXO for each UUT is recognized as current

4. **Delegate UUT Cataloging**:
   - MUST discover delegate UUTs from charter data (mint delegate, spend delegate, gov authority, other named delegates, dgData controllers)
   - MUST query Blockfrost for each UUT using `capoMph + uutName` to find current UTXO location
   - MUST store UUT identifiers in the UTXO's `uutIds` array field
   - MUST handle missing delegates gracefully (log warnings, continue processing)

5. **Block Management**:
   - MUST fetch and store latest block details using `blocks/latest` endpoint
   - MUST update `lastBlockId` and `lastBlockHeight` when new blocks are discovered
   - MUST support fetching block details by hash or height using `blocks/{hash_or_number}`
   - MUST cache block details locally to avoid redundant API calls

6. **Transaction Storage**:
   - MUST fetch transaction CBOR using `txs/{txId}/cbor` endpoint
   - MUST store transaction CBOR in the store for future reference
   - MUST decode transactions using Helios `decodeTx()` for processing
   - MUST check store cache before fetching from network (`findOrFetchTxDetails()`)

### 2. Storage Abstraction (UtxoStoreGeneric Interface)

#### Functional Requirements:

1. **Interface Definition**:
   - MUST define `UtxoStoreGeneric` interface specifying all storage operations
   - MUST support operations: `log()`, `findBlockId()`, `saveBlock()`, `findUtxoId()`, `saveUtxo()`, `findTxId()`, `saveTx()`, `findUtxoByUUT()`

2. **Dexie Implementation**:
   - MUST implement `DexieUtxoStore` extending Dexie and implementing `UtxoStoreGeneric`
   - MUST define database schema with tables: `blocks`, `utxos`, `txs`, `logs`
   - MUST support indexed queries: blocks by hash/height, utxos by utxoId and by uutIds (multiEntry)
   - MUST generate unique process IDs (pid) for logging sessions

3. **Logging System**:
   - MUST provide structured logging with unique log IDs, process IDs, timestamps, and call stack locations
   - MUST support querying logs by process ID and time range using Dexie compound index `[pid,time]`
   - MUST log all significant operations (initialization, fetches, errors, state changes, delegate resolution)
   - MUST generate unique process IDs (pid) for each indexer session, incrementing from the maximum existing pid
   - MUST be queryable from UI for debugging and monitoring purposes

### 3. Blockfrost API Integration

#### Functional Requirements:

1. **API Client**:
   - MUST use Blockfrost REST API for all blockchain queries via `/api/v0/` endpoint
   - MUST include Blockfrost project ID in request headers as `project_id`
   - MUST handle API errors gracefully with descriptive error messages
   - MUST log all API requests, successful responses (with full JSON), and errors for debugging
   - MUST determine base URL from API key prefix: "mainnet" → mainnet.blockfrost.io, "preprod" → preprod.blockfrost.io, "preview" → preview.blockfrost.io

2. **Data Validation**:
   - MUST validate all API responses using ArkType factories before storage
   - MUST use `BlockDetailsFactory` for block data validation
   - MUST use `UtxoDetailsFactory` for UTXO data validation
   - MUST use `AddressTransactionSummariesFactory` for transaction summary validation
   - MUST throw descriptive errors when validation fails

3. **Endpoint Usage**:
   - MUST use `blocks/latest` to get current blockchain state
   - MUST use `blocks/{hash_or_number}` to fetch specific block details
   - MUST use `addresses/{address}/transactions` to monitor for new transactions
   - MUST use `txs/{txId}/cbor` to fetch transaction CBOR data
   - MUST use `txs/{txHash}/utxos` to fetch UTXO details for a transaction
   - MUST use `addresses/{address}/utxos/{asset}` to fetch UTXOs containing specific assets

### 4. Type Definitions & Validation

#### Functional Requirements:

1. **BlockDetails Type**:
   - MUST define `BlockDetailsType` matching Blockfrost block response schema
   - MUST include: time, height, hash, slot, epoch, epoch_slot, slot_leader, size, tx_count, output, fees, block_vrf, op_cert, op_cert_counter, previous_block, next_block, confirmations
   - MUST provide `BlockDetailsFactory` for runtime validation

2. **UtxoDetails Type**:
   - MUST define `UtxoDetailsType` matching Blockfrost UTXO response schema, for type-safe access to BF data
   - MUST include: address, tx_hash, tx_index, output_index, amount (array of {unit, quantity}), block, data_hash, inline_datum, reference_script_hash
   - MUST parse quantity strings as numbers in the factory
   - MUST provide `UtxoDetailsFactory` for runtime validation

3. **AddressTransactionSummaries Type**:
   - MUST define `AddressTransactionSummariesType` for transaction summary responses
   - MUST include: tx_hash, tx_index, block_height, block_time
   - MUST provide `AddressTransactionSummariesFactory` for runtime validation

4. **Dexie Record Types**:
   - MUST define `dexieBlockDetails` extending Dexie Entity to store basic block info needed for other functionality
   - MUST define `dexieUtxoDetails` extending Dexie Entity to store utxo details needed for other functionality
   - MUST define `indexerLogs` extending Dexie Entity with logId, pid, time, location, message fields
   - MUST provide computed properties (e.g., `blockId`, `blockHeight`) where needed

### 5. Parsed Record Index

Provides pre-parsed delegated-data records from cached UTXOs, so consumers get typed JavaScript structs by record-id or record-type without re-parsing CBOR or querying the network. When a Capo is attached to the indexer, inline datums are decoded using the appropriate delegate controllers and stored in a `records` table keyed by record-id.

#### Functional Requirements:

1. **Optional Capo Attachment**:
   - MUST support operation without a Capo (raw UTXO indexing only, as today)
   - MUST provide a method to attach a Capo instance at any point in the index lifecycle
   - When a Capo is attached, MUST automatically process any cached UTXOs that have not yet been parsed

2. **Record Parsing on New UTXOs**:
   - When a Capo is attached and new UTXOs are discovered during monitoring, MUST decode inline datums using the Capo's delegate controllers and store the parsed result
   - MUST gracefully skip datums whose type has no registered controller

3. **Catchup Processing**:
   - MUST track the last block height at which record parsing was performed
   - When the Capo is attached after raw-only indexing, MUST catch up by parsing all unparsed UTXOs since the last parsed block height

4. **Record Queries**:
   - MUST provide lookup by record-id returning the parsed datum
   - MUST provide lookup by record type returning all matching records
   - MUST filter out spent records

## Detailed Requirements

This section organizes key software objects, expressing the detailed requirements connected to actually implementing the functional needs.

### Component: CachedUtxoIndex Class

#### Overview
The core class that orchestrates UTXO indexing, transaction monitoring, and block tracking for a single Capo address. It coordinates between the Capo instance (for charter data), Blockfrost API, and the storage backend.

#### Requirements

### REQT-1.1/vxdc27201y: COMPLETED: **Core Architecture & Initialization**

#### Purpose
Establishes the foundational data structures and initialization sequence for the indexer. Applied when implementing or modifying constructor logic, core data types, or initial setup procedures.

 - **REQT-1.1.1**/xxkzfx9gf4: COMPLETED: **Constructor & Initialization** - Must accept `capo`, `blockfrostKey`, and optional `storeIn` strategy. Must determine Blockfrost base URL from API key prefix (mainnet/preprod/preview). Must initialize storage backend based on strategy. `static async createAndSync()` must trigger `async syncNow()` after construction and initialization.
 - **REQT-1.1.2**/9a0nx1gr4b: IMPLEMENTED/NEEDS VERIFICATION: **Core State** - Must maintain: `capoAddress` (bech32 string), `capoMph` (hex-encoded minting policy hash for filtering), `lastBlockHeight` (chain tip height for time/slot calculations), `lastBlockId` (chain tip hash), `lastSlot` (chain tip slot). Tip-tracking state is independent of transaction processing progress.
 - **REQT-1.1.3**/j8vn3rm90z: COMPLETED: **Sync-Ready Promise** - Must expose a `syncReady` promise that resolves when initial sync completes. All query methods (`getUtxo`, `getUtxos`, `getUtxosWithAssetClass`, `getTx`, `hasUtxo`, `findUtxoByUUT`, `findUtxosByAsset`, `findUtxosByAddress`, `getAllUtxos`) must await `syncReady` before accessing cached data. This ensures queries block until the cache is populated, preventing premature network fallbacks.
 - **REQT-1.1.4**/n5kffw8tf2: COMPLETED: **Cache-First Startup** - On construction, `syncNow()` must check for existing cached block data via `store.getLatestBlock()`. If cached data exists, must initialize `lastBlockHeight`, `lastBlockId`, and `lastSlot` from cache, then perform incremental sync via `checkForNewTxns()` instead of full sync. This enables fast startup from persisted IndexedDB data.

### REQT-1.2/y034z487y5: COMPLETED: **UUT Cataloging & Charter Tracking**

#### Purpose
Governs delegate UUT discovery, cataloging, and updates based on charter changes. Applied when implementing charter traversal logic, UUT cataloging, or charter change detection mechanisms.

 - **REQT-1.2.1**/k0mnv27tz4: COMPLETED: **UUT Catalog from Charter** - Must implement `catalogDelegateUuts(charterData)` to discover and catalog all delegate UUTs. Must iterate through delegate types in charter (mint delegate, spend delegate, gov authority, other named delegates, dgData controllers). For each delegate, must query Blockfrost for the UUT using `capoMph + uutName` to find its current UTXO. Must store UUT identifiers in the UTXO's `uutIds` array.
 - **REQT-1.2.2**/xrdj6qpgnj: COMPLETED: **Charter Change Detection** - Must detect charter UTXO state changes during routine transaction monitoring. When processing transaction outputs, must check for presence of `mph.charter` token. Upon detecting charter token, must call `capo.findCharterData()` to fetch updated charter and invoke `catalogDelegateUuts()` to refresh UUT catalog.
 - **REQT-1.2.3**/m29vd4vr3q: COMPLETED: **UUT Movement Detection** - During transaction processing, must detect when delegate UUTs are moved to new UTXOs. Must store the new UTXO with the UUT identifier in its `uutIds` array.

### REQT-1.3/3zx9pcggch: COMPLETED: **Synchronization & Monitoring**

#### Purpose
Defines how the indexer performs initial synchronization and ongoing transaction monitoring of the Capo address. Applied when implementing sync logic, periodic monitoring, or transaction processing.

 - **REQT-1.3.1**/vk2bywdycn: COMPLETED: **Initial Sync** - Must implement `syncNow()` method to perform full index initialization. Must fetch charter data via `capo.findCharterData()`. Must fetch all UTXOs at `capoAddress` via underlying provider. Must store UTXOs via `store.saveUtxo()`. Must call `catalogDelegateUuts(charterData)` to catalog delegate UUTs. Must fetch and store latest block details.
 - **REQT-1.3.2**/fh56sce22g: IMPLEMENTED/NEEDS VERIFICATION: **Transaction Monitoring** - MUST reliably discover all transactions touching `capoAddress`, with no gaps from timing, indexing lag, or cursor advancement. MUST process each discovered transaction via `processTransactionForNewUtxos()`. MUST process blocks in order. A transaction that lands on-chain MUST eventually be discovered regardless of when the chain tip advances. MUST select sync mode based on how far behind the processing cursor is (configurable threshold, default 20 blocks).
    - **REQT-1.3.2.1**/gfsjgaac1y: IMPLEMENTED/NEEDS VERIFICATION: **Incremental Mode** — When the gap between the processing cursor and the chain tip is within the threshold, MUST walk forward block-by-block from the last processed block, checking each block for transactions touching monitored addresses. MUST process blocks in order and mark each as processed. Optimized for small gaps (1-2 blocks per poll cycle).
    - **REQT-1.3.2.2**/2he55bafxd: IMPLEMENTED/NEEDS VERIFICATION: **Catchup Mode** — When the gap exceeds the threshold, MUST use address-level transaction queries (`from=lastProcessedBlock`) to sparsely discover which blocks contain relevant transactions, then populate block records for only those blocks. MUST reconcile cached UTxOs against current on-chain state via address UTxO query to ensure cache correctness. MUST advance the processing cursor to the chain tip on completion.
 - **REQT-1.3.3**/0vrkpk6a6h: COMPLETED: **Transaction Processing** - Must implement `processTransactionForNewUtxos()` to extract and index relevant UTXOs from transactions. Must fetch full transaction CBOR and decode using Helios `decodeTx()`. Must examine each transaction output. Must check if UTXO already exists in store via `store.findUtxoId()`. Must index new UTXOs via `indexUtxoFromOutput()`. Must update UUT catalog if delegate UUTs moved.
    - **REQT-1.3.4**/mvjrak021s: COMPLETED: **UTXO Indexing** - Must implement `indexUtxoFromOutput()` to store UTXO id and any mph-matching token values for later search. Must extract inline datum as binary data or datum hash. Must save to store via `store.saveUtxo()`.

### REQT-1.3.5/2jk4j31mgr: COMPLETED: **Spent UTXO Eviction**

#### Purpose
Ensures the index only returns active (unspent) UTXOs when queried. Without this, spent UTXOs accumulate in the cache and are incorrectly returned by query methods, causing transaction building failures. Applied when processing transactions or implementing query methods.

 - **REQT-1.3.5.1**/hhbcnvd9aj: COMPLETED: **Input Detection** - When processing a transaction via `processTransactionForNewUtxos()`, MUST examine `tx.body.inputs` to identify spent UTXOs. For each input whose utxoId exists in the cache, MUST mark that UTXO as spent.
 - **REQT-1.3.5.2**/11msfc4wv8: COMPLETED: **Soft Delete Strategy** - MUST use soft delete by adding a `spentInTx: string | null` field to `UtxoIndexEntry`. When a UTXO is spent, MUST set this field to the spending transaction's hash. This preserves historical data for debugging and allows potential restoration during chain reorganization handling.
 - **REQT-1.3.5.3**/g3jen1rcvd: COMPLETED: **Query Filtering** - All query methods (`getUtxos`, `getUtxosWithAssetClass`, `findUtxosByAddress`, `findUtxosByAsset`, `getAllUtxos`, `findUtxoByUUT`) MUST filter out UTXOs where `spentInTx` is not null. The storage layer MUST provide filtered query methods or the CachedUtxoIndex MUST filter results before returning.

### REQT-1.3.6/4da1wyv35e: NEXT: **Block Tip Tracking & Per-Block Address Recording**

#### Purpose
Ensures the indexer maintains a fresh view of the chain tip for time/slot calculations, and records which addresses (and their transaction IDs) are associated with each block. The tip is tracked independently of transaction processing progress. Applied when modifying tip polling, block storage, or per-block metadata.

 - **REQT-1.3.6.1**/9gq8rwg9ng: IMPLEMENTED/NEEDS VERIFICATION: **Block Tip & Address Recording** — MUST track the latest block on-chain, maintaining fresh `lastSlot`, `lastBlockHeight`, and `lastBlockId` for tip-time calculations independently of transaction processing progress. MUST record the relevant addresses and their associated transaction IDs for each block. This per-block address data serves as the basis for transaction discovery in REQT/fh56sce22g.

### REQT-1.3.7/21ec41e31a: NEXT: **Block Processing Cursor**

#### Purpose
Maintains a reliable record of which blocks have been fully processed for transactions, independent of the chain tip. Ensures the indexer can resume processing from the correct point after restart, and that no block's transactions are skipped. Applied when modifying sync resumption, block processing order, or transaction discovery.

 - **REQT-1.3.7.1**/5d4f73c9bf: IMPLEMENTED/NEEDS VERIFICATION: **Last Processed Block** — MUST track which blocks have been fully processed for transactions. MUST be able to determine the last processed block reliably after restart. The processing cursor MUST be independent of the chain tip (`lastBlockHeight`). Blocks MUST be processed in order — no block may be skipped.

### REQT-1.4/k3xfpg6jkb: COMPLETED: **External Data Services & Utilities**

#### Purpose
Governs interactions with Blockfrost API, block/transaction management, and data format conversions. Applied when implementing or modifying API client logic, caching strategies, or data transformation utilities.

 - **REQT-1.4.1**/nw8d0yew8j: COMPLETED: **Block Management** - Must implement `fetchAndStoreLatestBlock()` to query Blockfrost `blocks/latest` endpoint, store in database via `store.saveBlock()`, and update indexer's `lastBlockHeight`. Must implement `findOrFetchBlockHeight()` to resolve block height from hash, checking store cache via `store.findBlockId()` before querying Blockfrost `blocks/{hash}` endpoint.
 - **REQT-1.4.2**/sy05qvrfd0: COMPLETED: **Transaction Fetching with Caching** - Must implement `findOrFetchTxDetails()` to retrieve transaction CBOR with cache-first strategy. Must check store via `store.findTxId()`. On cache miss, must query Blockfrost `txs/{txId}/cbor` endpoint, save CBOR to store via `store.saveTx()`, and decode using Helios `decodeTx()`. Must return decoded `Tx` object.
 - **REQT-1.4.3**/cdhjy5k8at: COMPLETED: **Blockfrost HTTP Client** - Must implement `fetchFromBlockfrost()` generic HTTP client for Blockfrost API. Must construct full URL from `blockfrostBaseUrl` and relative path parameter. Must include `project_id` header with `blockfrostKey` value. Must parse JSON responses. On HTTP errors, must log error and throw descriptive error.

### REQT-1.5/8x3f5pv2kd: BACKLOG: **Future Enhancements & Optimizations**

#### Purpose
Documents planned features and performance improvements not yet implemented. Applied when planning future development cycles, evaluating architectural extensions, or prioritizing feature roadmap.

 - **REQT-1.5.1**/jz6zf4py6n: BACKLOG: **Invariant Support** - Must extend UUT cataloging logic to index spend invariants and mint invariants from charter data.
 - **REQT-1.5.2**/zzsg63b2fb: IMPLEMENTED/NEEDS VERIFICATION: **Automated Periodic Refresh** - Must implement block-tip polling at a short interval (e.g. 5 seconds) to detect new blocks. When a new block is detected, MUST trigger `checkForNewTxns()`. MUST guard against concurrent sync — if `checkForNewTxns` is already running, the poll skips.
 - **REQT-1.5.3**/0aewmbbfct: BACKLOG: **Pagination for High-Volume Activity** - Must handle cases where `addresses/{address}/transactions` endpoint returns 100+ results in single monitoring cycle. Must implement pagination strategy to fetch additional pages when response count equals limit.
 - **REQT-1.5.4**/50zkk5xgrx: COMPLETED: **Query API Methods** - Must provide public query interface for indexed UTXOs. Must implement `findUtxoId(id)`, `findUtxoByUUT(uutId)`, and queries by asset (mph, tokenName). Must support filtering and pagination options.
 - **REQT-1.5.5**/70sncha8f2: BACKLOG: **Ogmios Backend for Multi-Address Monitoring** - Must support Ogmios as alternative backend for scanning transactions in new blocks via the Ogmios mini-protocol (`@cardano-ogmios` TypeScript module). Same essential low-level queries as Blockfrost, but connecting to any Cardano node via JSON-RPC. Enables efficient monitoring of both Capo and wallet addresses by processing block-level transaction data rather than per-address polling.
 - **REQT-1.5.6**/q83ztd3kkv: BACKLOG: **Server-Side Storage Backends (CouchDB/PostgreSQL)** - Must support CouchDB or PostgreSQL as alternative storage backends for server-layer deployment. Enables an API service layer providing low-latency access to subsets of UTxOs from a Capo that may hold millions of UTxOs, where client applications query only the subset they need.
 - **REQT-1.5.7**/v9h5pez7bh: BACKLOG: **Server-Mediated Client Sync** - Must support a sync mode where the client connects to a filtering server rather than directly to Blockfrost/Ogmios. The server provides: (a) client-specific filtering so the client doesn't need to process all historical Capo transactions, and (b) filtered incremental blocks/UTxOs for a lightweight operational profile. Critical for mobile applications where processing all Capo history is prohibitive.

### REQT-1.6/rc7km2x8hp: COMPLETED: **ReadonlyCardanoClient Interface Conformance**

#### Purpose
Ensures the CachedUtxoIndex can be used as a drop-in replacement for Helios network clients, enabling cached UTXO lookups during transaction building. Applied when implementing or modifying the public API to match Helios interface contracts.

 - **REQT-1.6.1**/gt3ux9v2kp: COMPLETED: **getUtxo Method** - Must implement `getUtxo(id: TxOutputId): Promise<TxInput>` to retrieve a single UTXO by its output ID. Must return Helios `TxInput` type. Must check local cache first, then fall back to network if not found.
 - **REQT-1.6.2**/gu4vy0w3lq: COMPLETED: **getUtxos Method** - Must implement `getUtxos(address: Address): Promise<TxInput[]>` to retrieve all UTXOs at an address. Must return array of Helios `TxInput` types. Must use cached data when available.
 - **REQT-1.6.3**/gv5wz1x4mr: COMPLETED: **getUtxosWithAssetClass Method** - Must implement `getUtxosWithAssetClass(address: Address, assetClass: AssetClass): Promise<TxInput[]>` to retrieve UTXOs containing a specific asset. Must filter by both address and asset class. Uses cache for any indexed UTXOs matching criteria; falls through to network on cache miss.
 - **REQT-1.6.4**/gw6x2y5ns: COMPLETED: **hasUtxo Method** - Must implement `hasUtxo(utxoId: TxOutputId): Promise<boolean>` to check if a UTXO exists. Must return true if found in cache or on network.
 - **REQT-1.6.5**/gx7y3z6ot: COMPLETED: **getTx Method** - Must implement `getTx(id: TxId): Promise<Tx>` to retrieve a transaction by ID. Must use cached transaction CBOR when available, falling back to network fetch.
 - **REQT-1.6.6**/gy8z4a7pu: COMPLETED: **isMainnet Method** - Must implement `isMainnet(): boolean` to indicate network type. Must return value based on Capo's network configuration.
 - **REQT-1.6.7**/gz9a5b8qv: NEXT: **now Property** - MUST implement `now: number` property returning wall-clock milliseconds since epoch (i.e. `Date.now()`), matching the `CardanoClient` interface contract as implemented by `BlockfrostV0Client`.
 - **REQT-1.6.8**/ha0b6c9rw: COMPLETED: **parameters Property** - Must implement `parameters: Promise<NetworkParams>` to provide network parameters. Must fetch from underlying network client or cache.

### REQT-1.7/rl8m2x9abc: COMPLETED: **Rate Limiting & Event System**

#### Purpose
Ensures Blockfrost API calls stay within rate limits and provides observable events for sync status and metrics. Applied when monitoring indexer behavior or integrating with UI components.

 - **REQT-1.7.1**/tb4n3q7def: COMPLETED: **Token Bucket Rate Limiter** - Must implement global rate limiter with token bucket algorithm. Must allow bursts up to 300 requests. Must refill at 7 tokens/second. Must wait 1 second when bucket is exhausted.
 - **REQT-1.7.2**/uc5o4r8ghi: COMPLETED: **HTTP 429 Handling** - Must detect HTTP 429 responses from Blockfrost. Must exhaust bucket, pause all requests for 10 seconds, then retry. Must reduce refill rate by dividing current rate by 1.61 (golden ratio) after each 429, compounding on repeated errors. Must enforce minimum refill rate of 0.5 req/s. Must gradually restore refill rate by +1/s every 10 seconds until back to base rate.
 - **REQT-1.7.3**/vd6p5s9jkl: COMPLETED: **Rate Limiter Metrics** - Must expose metrics via EventEmitter: requestsPerSecond, currentRefillRate, availableBurst, isRateLimited, isOnHold, isRecovering. Must emit metrics once per second when changed.
 - **REQT-1.7.4**/we7q6t0mno: COMPLETED: **Sync Events** - Must emit `syncStart` when initial sync begins. Must emit `syncComplete` when initial sync finishes. Must emit `syncing` when incremental sync begins. Must emit `synced` when incremental sync completes. Must forward rate limiter metrics as `rateLimitMetrics` event.

### REQT-1.8/ss7w87ecmj: COMPLETED: **Full TxInput Restoration**

#### Purpose
Ensures that Tx objects returned from cache have fully-restored TxInputs with complete output data, matching what BlockfrostV0Client provides. Raw Tx CBOR only contains TxOutputId references for inputs; full TxInput restoration requires fetching output details (address, value, datum) and reference scripts.

 - **REQT-1.7.1**/nqemw2gvm2: COMPLETED: **restoreTxInput Method** - Must implement `restoreTxInput(txOutputId: TxOutputId): Promise<TxInput>` to reconstruct a full TxInput from a TxOutputId reference. Must fetch the original output's address, value, inline datum (or hashed datum), and reference script. Must cache fetched data in the UTXO store for future lookups. *(Implemented as `indexEntryToTxInput()` which converts UtxoIndexEntry to TxInput with full restoration including reference scripts.)*
 - **REQT-1.7.2**/tqrhbphgyx: COMPLETED: **Reference Script Fetching** - When a UTXO has a `reference_script_hash`, must fetch script CBOR from Blockfrost `/scripts/{hash}/cbor` endpoint. Must decode using `decodeUplcProgramV2FromCbor()`. Must include decoded script in restored TxOutput. *(Implemented in `fetchAndCacheScript()`.)*
 - **REQT-1.7.3**/qc7qgsqphv: COMPLETED: **getTxInfo with Restored Inputs** - Must provide method to retrieve Tx with fully-restored TxInputs. Following Helios convention, `getTx()` returns raw decoded Tx while `getTxInfo()` uses `tx.recover(this)` to restore input data. *(Implemented as `getTxInfo()` which leverages CachedUtxoIndex's `getUtxo()` implementation.)*
 - **REQT-1.7.4**/k2wvnd3f1e: COMPLETED: **Script Storage** - Must extend storage schema to cache reference script CBOR by script hash. Must implement `store.saveScript(hash, cbor)` and `store.findScript(hash)`. Prevents redundant Blockfrost queries for commonly-used reference scripts. *(Implemented in DexieUtxoStore with scripts table.)*

### REQT-1.9/ngn9agx52a: IN PROGRESS: **Wallet Address Indexing**

#### Purpose
Enables the indexer to cache UTXOs from connected wallet addresses, not just the Capo address. This allows the CapoDappProvider to serve actor UTXO queries from cache, reducing network calls and improving responsiveness when finding user-specific UTXOs for transaction building. Applied when implementing wallet integration or modifying address registration logic.

 - **REQT-1.9.1**/mp4dx7ngvf: NEXT: **Address Registration** - Must implement `addWalletAddress(address: string): Promise<void>` to register additional addresses for indexing. Must store registered addresses persistently. Must trigger an initial sync for newly registered addresses. When called for an already-registered address, MUST reconcile cached UTxOs against fresh network state (idempotent). *(Being modified: addWalletAddress becomes idempotent per wallet-utxo-stale-spent work unit)*
 - **REQT-1.9.2**/ctc4z2k5pq: NEXT: **CapoDappProvider Integration** - When a wallet is connected via CapoDappProvider, must automatically call `addWalletAddress()` with the wallet's base address. Must handle wallet disconnection gracefully (addresses may remain indexed for faster reconnection).
 - **REQT-1.9.3**/92m7kpkny7: NEXT: **On-Demand Sync** - When `getUtxos(address)` is called for a registered wallet address, must first check if sync is needed (based on `lastSyncTime` for that address). If stale (configurable threshold, default 30 seconds), must perform snapshot sync: fetch fresh UTxOs, remove stale cached entries absent from the fresh set, store fresh entries. Must not block indefinitely - use existing rate limiter. *(Being modified: snapshot sync now removes stale entries per wallet-utxo-stale-spent work unit)*
 - **REQT-1.9.4**/620ypcc34d: COMPLETED: **Multi-Address Storage** - Must extend storage schema to track per-address sync state (lastBlockHeight, lastSyncTime). Must support querying UTXOs filtered by source address. Must distinguish between Capo-address UTXOs (which have UUT tracking) and wallet-address UTXOs (which do not). *(Implemented WalletAddressEntry type and walletAddresses table in DexieUtxoStore)*
 - **REQT-1.9.5**/ygvc43wg0x: NEXT: **Wallet Transaction Monitoring** — During each periodic sync cycle (`checkForNewTxns`), MUST also poll Blockfrost `addresses/{walletAddr}/transactions` for each registered wallet address (from `getAllWalletAddresses()`). MUST process discovered transactions through the existing `processTransactionForNewUtxos()` path, so wallet UTxOs receive proper `spentInTx` with real txHashes — the same correctness guarantees as Capo address UTxOs. MUST track per-address `lastBlockHeight` for incremental polling.
 - **REQT-1.9.6**/06b01nyf51: NEXT: **Wallet Snapshot Sync as Secondary Defense** — `syncWalletAddressIfStale()` remains as the on-demand freshness path when `getUtxos(walletAddress)` is called. After fetching fresh UTxOs from the network, MUST remove cached entries for that address whose `utxoId` is absent from the fresh set, then store the fresh entries. This serves as a secondary defense complementing the transaction-based monitoring in REQT/ygvc43wg0x.
 - **REQT-1.9.7**/2tgp4rg4sg: NEXT: **Wallet Sync State Advancement** — After processing wallet address transactions during `checkForNewTxns`, MUST update each wallet address's `lastBlockHeight` in the store to reflect the highest block processed. This ensures the next sync cycle only polls for new transactions.

### REQT-1.10/5bmbf54qhy: IMPLEMENTED/NEEDS VERIFICATION: **Parsed Record Index**

#### Purpose
Enables the indexer to store and serve pre-parsed delegated-data records, eliminating repeated CBOR decoding and network queries for typed data access. Applied when implementing or modifying record parsing, Capo integration, or record query methods.

 - **REQT-1.10.1**/yx0yze9swf: IMPLEMENTED/NEEDS VERIFICATION: **Optional Capo Attachment** — MUST provide `attachCapo(capo)` to register a Capo instance for datum parsing. The Capo is NOT required at construction. Without a Capo, the index MUST operate as before (raw `inlineDatum` CBOR only, no records). When a Capo is attached, MUST trigger catchup processing per REQT/3aew7g7wdw (Catchup on Capo Attachment).

 - **REQT-1.10.2**/pshpah30em: IMPLEMENTED/NEEDS VERIFICATION: **Parse Datum for New UTXOs** — When a Capo is attached and a new UTXO with an inline datum is discovered during monitoring, MUST identify the delegated-data type, decode the datum using the appropriate delegate controller, and store the parsed result (including `id`, `type`, and the typed data fields) in the records table. MUST gracefully skip UTXOs whose datum type has no registered controller.

 - **REQT-1.10.3**/3aew7g7wdw: IMPLEMENTED/NEEDS VERIFICATION: **Catchup on Capo Attachment** — MUST persist `lastParsedBlockHeight` in the store. When a Capo is attached and `lastParsedBlockHeight < lastBlockHeight`, MUST query cached UTXOs with `blockHeight > lastParsedBlockHeight` having unparsed inline datums, decode each via the Capo, and store results in the records table. MUST advance `lastParsedBlockHeight` upon completion. NEEDS REQT/6h4f158gvs (Database Definition) for `blockHeight` on UTXO entries.

 - **REQT-1.10.4**/gdmdg66paw: IMPLEMENTED/NEEDS VERIFICATION: **Record Query Methods** — MUST implement `findRecord(id): Promise<RecordIndexEntry | undefined>` for single-record lookup by record-id. MUST implement `findRecordsByType(type, options?): Promise<RecordIndexEntry[]>` for type-filtered queries.

 - **REQT-1.10.5**/gtgje3zy0g: IMPLEMENTED/NEEDS VERIFICATION: **Capo parseDelegatedDatum Dependency** — EXPECTS Capo to expose `parseDelegatedDatum(uplcData, charterData?): Promise<{ id: string; type: string; data: Record<string, any> } | undefined>` encapsulating datum type extraction, controller lookup, and parsing. CachedUtxoIndex calls this method via the attached Capo instance (REQT/yx0yze9swf). The Capo type is referenced via `import type` only — no runtime dependency.

 - **REQT-1.10.6**/md6x3wbnct: IMPLEMENTED/NEEDS VERIFICATION: **CapoDappProvider Attachment Integration** — EXPECTS `CapoDappProvider.connectCapo()` to call `utxoIndex.attachCapo(capo)` after the Capo is created and the utxoIndex is available. MUST be called in both early-index (index created before Capo) and late-index (index created after Capo) paths.

### REQT-1.11/3dhhjsav15: IMPLEMENTED/NEEDS VERIFICATION: **In-Flight Transaction Integration**

#### Purpose
Enables the indexer to reflect locally-submitted transactions in query results immediately, before they are confirmed on-chain. Prevents stale reads after writes, avoids double-spend attempts from the same session, and provides pending-state visibility to downstream consumers. Applied when implementing or modifying transaction registration, confirmation, rollback, or pending-state query logic.

 - **REQT-1.11.1**/p2ts24jbkg: IMPLEMENTED/NEEDS VERIFICATION: **Register Pending Transaction** — MUST implement `registerPendingTx(signedCborHex: string, opts: { description, id, parentId?, depth, moreInfo?, txName?, txCborHex, txd? })`. MUST decode signed CBOR via existing `decodeTx()` pipeline. MUST persist a `PendingTxEntry` to the store with `status: "pending"` and deadline computed as `txValidityEnd + graceBuffer` anchored to chain time. MUST mark each `tx.body.input` as spent by setting `spentInTx` to the pending txHash. MUST index each `tx.body.output` via existing `indexUtxoFromOutput()`. MUST parse inline datums into records if a Capo is attached per REQT/yx0yze9swf (Optional Capo Attachment). MUST store the live `txd` (TxDescription) in the in-memory `pendingTxMap` for same-session consumers. MUST be called once per transaction, in submission order, after successful network submission.

 - **REQT-1.11.2**/58b9nzgcbj: IMPLEMENTED/NEEDS VERIFICATION: **Confirm Pending Transaction** — When `checkForNewTxns()` discovers a txHash that matches a PendingTxEntry with `status: "pending"`, MUST skip normal indexing (outputs already indexed, inputs already marked spent). MUST set the entry's `confirmState` to `"provisional"` and record the confirming block height. MUST emit `txConfirmed` event with `{ txHash, description, confirmState, txd? }` — `txd` available from in-memory map if same session. Subsequent depth progression is governed by REQT/ddzcp753jr (Confirmation Depth Tracking).

 - **REQT-1.11.3**/a9y19g0pmr: IMPLEMENTED/NEEDS VERIFICATION: **Rollback Expired Pending Transaction** — MUST implement `checkPendingDeadlines()` on a 10-second timer, separate from the 60s Blockfrost poll. MUST query pending entries where `deadline < lastSyncedBlockSlotTime`. For each expired entry: MUST clear `spentInTx` on UTXOs where `spentInTx === txHash` (restore speculatively-spent inputs). MUST delete UTXO entries where `utxoId` starts with `txHash#` (remove pending outputs). MUST delete record entries where `utxoId` starts with `txHash#` (remove pending-origin records). MUST re-parse inline datums from restored input UTXOs to recreate records that were overwritten during registration (records use `id` as PK — `saveRecord()` overwrites originals when a pending tx updates an existing record; deleting the pending-origin record alone would lose the original data). Re-parsing requires Capo attached; MUST be a no-op without Capo (consistent with registration). MUST set PendingTxEntry status to `"rolled-back"`. MUST emit `txRolledBack` event with `{ txHash, description, cbor, txd? }` — `cbor` included for recovery path.

 - **REQT-1.11.4**/c3ytg4rttd: IMPLEMENTED/NEEDS VERIFICATION: **Deadline Calculation** — Deadline MUST be computed as `txValidityEnd + graceBuffer` where `txValidityEnd` is extracted from the decoded tx's validity interval and `graceBuffer` accounts for block propagation delay (e.g. 40-60 seconds). Deadline MUST be compared against chain time (last synced block's slot time), NOT wallclock time. This prevents premature rollback from clock drift or stale sync state.

 - **REQT-1.11.5**/mjhf1yezr9: IMPLEMENTED/NEEDS VERIFICATION: **isPending Query** — MUST implement `isPending(item: TxOutputId | string | FoundDatumUtxo<any, any>): string | undefined`. MUST be synchronous, checking the in-memory `pendingTxMap`. MUST return the pending txHash if the item's UTXO originates from or is spent by a pending transaction, `undefined` otherwise. MUST accept three input forms: Helios `TxOutputId`, string utxoId, or `FoundDatumUtxo` object.

 - **REQT-1.11.6**/r0y7s2vggr: IMPLEMENTED/NEEDS VERIFICATION: **getPendingTxs Query** — MUST implement `getPendingTxs(): PendingTxEntry[]` returning all entries with `status === "pending"`. SHOULD support filtering by `confirmState` so consumers can query for entries not yet at a desired confidence level. Used by CapoDappProvider on startup to show pending count/list before sync completes.

 - **REQT-1.11.7**/9r9rc1hrfv: IMPLEMENTED/NEEDS VERIFICATION: **pendingSyncState Property** — MUST expose `get pendingSyncState(): "stale" | "fresh"`. MUST start as `"stale"` on construction/reload. MUST flip to `"fresh"` after the first sync cycle resolves pending state (confirms landed txs, rolls back expired ones). CapoDappProvider maps this to React state so UI can distinguish stale pending list from verified status.

 - **REQT-1.11.8**/fz6z7rr702: IMPLEMENTED/NEEDS VERIFICATION: **Pending Transaction Events** — MUST extend CachedUtxoIndex's existing EventEmitter with events: `txConfirmed`: `{ txHash, description, confirmState, txd? }` — emitted when a pending tx is first confirmed on-chain (initial `confirmState`). `confirmStateChanged`: `{ txHash, confirmState, depth }` — emitted when a confirmed tx's `confirmState` advances (provisional → likely → confident → certain). `txRolledBack`: `{ txHash, description, cbor, txd? }` — CapoDappProvider offers recovery UI; includes CBOR so recovery path can decode the failed tx. `pendingSynced`: emitted after first sync cycle resolves pending state — CapoDappProvider flips from stale to fresh display.

 - **REQT-1.11.9**/fn70x96nxm: IMPLEMENTED/NEEDS VERIFICATION: **Startup Recovery** — On page reload, MUST load PendingTxEntry rows with `status === "pending"` from Dexie and expose them immediately with `pendingSyncState: "stale"`. After first sync cycle: `checkForNewTxns()` MUST confirm any that landed in blocks; `checkPendingDeadlines()` MUST roll back any that expired. MUST emit events for transitions. MUST flip `pendingSyncState` to `"fresh"` and emit `pendingSynced`. In-memory `pendingTxMap` is empty after reload — events fire without live `txd`; consumers get txHash, description, and cbor from Dexie fields.

 - **REQT-1.11.10**/agg98btez8: IMPLEMENTED/NEEDS VERIFICATION: **Purge Old Pending Entries** — MUST purge PendingTxEntry rows with `status !== "pending"` and `submittedAt` older than 72 hours. Purge SHOULD run on the 10s deadline-check timer (cheap — single Dexie delete query).

 - **REQT-1.11.11**/2w2yyc2m1k: IMPLEMENTED/NEEDS VERIFICATION: **In-Memory Pending Map** — MUST maintain `pendingTxMap: Map<string, TxDescription>` in memory, keyed by txHash. MUST store the live `txd` when `registerPendingTx` is called with one. MUST NOT persist this map — it is session-scoped. MUST be used by `isPending()` for synchronous lookups and by event emission to include `txd` when available.

 - **REQT-1.11.12**/ddzcp753jr: IMPLEMENTED/NEEDS VERIFICATION: **Confirmation Depth Tracking** — MUST track confirmation depth for confirmed pending transactions as the chain advances. `confirmState` progresses through graduated confidence levels based on how many blocks have been built on top of the confirming block.
    - **REQT-1.11.12.1**/yn45tvmp6k: IMPLEMENTED/NEEDS VERIFICATION: **Confirmation States** — `confirmState` values: `"provisional"` (depth < provisionalDepth, default 4), `"likely"` (depth < confidentDepth, default 10), `"confident"` (depth ≥ confidentDepth), `"certain"` (depth ≥ certaintyDepth, default 180). Depth thresholds MUST be configurable. App layer MAY translate these labels to other strings.
    - **REQT-1.11.12.2**/thy7tkrxh7: IMPLEMENTED/NEEDS VERIFICATION: **Depth Advancement** — On each sync cycle, MUST recalculate depth for all confirmed-but-not-certain entries as `currentBlockHeight - confirmingBlockHeight`. When depth crosses a threshold, MUST advance `confirmState` and emit `confirmStateChanged` event per REQT/fz6z7rr702 (Pending Transaction Events).
    - **REQT-1.11.12.3**/b6h7km6h44: NEXT: **Rollback Interaction** — If a chain rollback (REQT/yasww6cqa4) invalidates a confirmed tx's block, MUST revert `confirmState` to `undefined` and status back to `"pending"`. Depth tracking resumes if the tx is re-confirmed in a subsequent block.

### REQT-1.12/jrhh4jg6se: NEXT: **Chain Rollback Detection & Recovery**

#### Purpose
Detects when previously-confirmed blocks are no longer on the canonical chain (orphaned/rolled back) and recovers the index to a consistent state. Cardano rollbacks are rare but can theoretically occur up to ~1 hour after apparent confirmation. Without detection, the index would contain UTxOs and records from blocks that no longer exist on-chain. Applied when modifying block verification, sync startup, or index consistency logic.

 - **REQT-1.12.1**/yasww6cqa4: NEXT: **Chain Intersection Discovery** — MUST verify chain continuity by walking backward from the current chain tip and comparing against stored blocks. MUST identify the last block that matches the canonical chain (the intersection point). Any stored blocks beyond the intersection that are not on the canonical chain MUST be detected.

 - **REQT-1.12.2**/4j3rs4pyjt: NEXT: **Rollback Recovery** — When rolled-back blocks are detected, MUST recover the index to a consistent state aligned with the canonical chain. Recovery MUST handle all index artifacts affected by transactions in the rolled-back blocks.
    - **REQT-1.12.2.1**/mb8smvc9gx: NEXT: **Invalidate Created UTxOs** — MUST invalidate all UTxOs created by transactions in rolled-back blocks (mark `state=rolled-back`).
    - **REQT-1.12.2.2**/kzc2n4c8z0: NEXT: **Restore Spent UTxOs** — MUST clear `spentInTx` markers set by transactions in rolled-back blocks, restoring previously-spent UTxOs to unspent state.
    - **REQT-1.12.2.3**/svtgmv5h30: NEXT: **Invalidate Affected Records** — MUST mark records parsed from UTxOs in rolled-back blocks with `state="affected by pending rollback"`.
    - **REQT-1.12.2.4**/2grpnzb2q0: NEXT: **Revert Pending Tx Confirmations** — MUST revert any pending transaction confirmations that occurred in rolled-back blocks (status back to `pending`).
    - **REQT-1.12.2.5**/epwp74mn8x: NEXT: **Roll Back Processing Cursor** — MUST roll the processing cursor back to the intersection point.
    - **REQT-1.12.2.6**/j4198pv9ea: NEXT: **Re-initiate Sync** — MUST re-initiate sync from the intersection point after rollback recovery completes.

 - **REQT-1.12.3**/dnr06r6ch5: NEXT: **Rollback Event** — MUST emit a `chainRollback` event with rollback depth when a rollback is detected, so downstream consumers (CapoDappProvider, UI) can respond.

### REQT-1.13/8md6dpzxe9: NEXT: **Sync State Tracking**

#### Purpose
Provides observable sync state so downstream consumers can display appropriate status to users. Different sync activities have different user-facing implications — a rollback recovery is more concerning than a routine incremental sync. Applied when modifying sync lifecycle or integrating with UI status displays.

 - **REQT-1.13.1**/jdkjh536mm: IMPLEMENTED/NEEDS VERIFICATION: **Sync State Metadata** — MUST maintain an observable `syncState` reflecting the current sync activity. Values: `"idle"` (no sync in progress), `"syncing"` (incremental block-walk), `"catchup sync (N blocks)"` (catchup mode with block count), `"recovering from rollback (N blocks)"` (rollback recovery with depth). MUST be updated at the start and end of each sync activity. Downstream consumers observe this to display sync status.

### Component: UtxoStoreGeneric Interface

#### Overview
Defines the contract for storage backends, allowing the indexer to work with different storage strategies (Dexie, memory, future: Dred).

### REQT-2.1/pg6g84g7kg: COMPLETED: **Storage Interface Contract**

#### Purpose
Establishes the abstraction layer for storage backends. Applied when implementing new storage strategies, modifying storage operations, or understanding the data persistence contract.

 - **REQT-2.1.1**/nhbqmacrwn: COMPLETED: **Interface Methods** - Must define `UtxoStoreGeneric` interface with methods: `log()`, `findBlockId()`, `saveBlock()`, `findUtxoId()`, `saveUtxo()`, `findTxId()`, `saveTx()`, `findUtxoByUUT()`
 - **REQT-2.1.2**/bq0ammh636: COMPLETED: **Type Definitions** - Must define `TxIndexEntry` type with `txid` and `cbor` fields.

### REQT-2.2/4wc5crjd3y: IMPLEMENTED/NEEDS VERIFICATION: **Pending Transaction Store Operations**

#### Purpose
Extends the storage interface with operations for persisting and managing in-flight transaction state. Applied when implementing pending-tx support in new storage backends or modifying the pending-tx persistence contract.

 - **REQT-2.2.1**/kd9xwtg4df: IMPLEMENTED/NEEDS VERIFICATION: **Pending Tx CRUD** — MUST add to `UtxoStoreGeneric`: `savePendingTx(entry: PendingTxEntry): Promise<void>`, `findPendingTx(txHash: string): Promise<PendingTxEntry | undefined>`, `getPendingByStatus(status: string): Promise<PendingTxEntry[]>`, `setPendingTxStatus(txHash: string, status: string): Promise<void>`.

 - **REQT-2.2.2**/p0nt8nwtxj: IMPLEMENTED/NEEDS VERIFICATION: **Rollback Store Operations** — MUST add to `UtxoStoreGeneric`: `clearSpentByTx(txHash: string): Promise<void>` to nullify `spentInTx` on UTXOs where `spentInTx === txHash`; `deleteUtxosByTxHash(txHash: string): Promise<void>` to remove UTXOs where `utxoId` starts with `txHash#`; `deleteRecordsByTxHash(txHash: string): Promise<void>` to remove records where `utxoId` starts with `txHash#`.

 - **REQT-2.2.3**/h4m8p3x16c: IMPLEMENTED/NEEDS VERIFICATION: **Purge Operation** — MUST add to `UtxoStoreGeneric`: `purgeOldPendingTxs(olderThan: number): Promise<void>` to delete PendingTxEntry rows where `status !== "pending"` and `submittedAt < olderThan`.

### Component: DexieUtxoStore Class

#### Overview
Dexie-based implementation of `UtxoStoreGeneric` providing persistent browser storage using IndexedDB.

### REQT-3.1/dbwnqvqwa1: IN PROGRESS: **Dexie Database Schema & Initialization**

#### Purpose
Defines the IndexedDB schema and entity mappings for the Dexie storage backend. Applied when modifying database structure, adding tables, or changing indexes.

 - **REQT-3.1.1**/6h4f158gvs: IMPLEMENTED/NEEDS VERIFICATION: **Database Definition** - Must extend Dexie with configurable database name (default: "StellarDappIndex-v0.1"). Must define schema with tables and indexed fields: `blocks` (hash, height), `utxos` (utxoId, *uutIds, blockHeight), `txs` (txid), `logs` (logId, [pid+time]).
 - **REQT-3.1.2**/exv4s020a0: COMPLETED: **Entity Mapping** - Must map tables to appropriate Dexie Entity classes for type-safe storage.
 - **REQT-3.1.3**/t7dbk8n4mx: COMPLETED: **Database Name Configuration** - DexieUtxoStore constructor must accept optional `dbName` parameter for test isolation. CachedUtxoIndex must pass through `dbName` option to allow tests to create isolated database instances.

### REQT-3.2/754gq4cbqk: COMPLETED: **Logging & Process Management**

#### Purpose
Governs the structured logging system for debugging and UI inspection. Applied when implementing or debugging indexer operations, or building monitoring dashboards.

 - **REQT-3.2.1**/cm9ez5thxz: COMPLETED: **Process ID Management** - Must implement `init()` to find maximum pid in logs table and assign next pid. Must handle concurrent initialization attempts.
 - **REQT-3.2.2**/p7ryk4ztes: COMPLETED: **Logging Implementation** - Must implement `log()` to create log entries with pid, timestamp, and message. Must use logId as primary key.

### REQT-3.3/pdctymd7yj: COMPLETED: **Data Storage Operations**

#### Purpose
Implements CRUD operations for blocks, UTXOs, transactions, and UUT catalog. Applied when reading or modifying storage access patterns or adding new query methods.

 - **REQT-3.3.1**/76e18y06kp: COMPLETED: **Block Storage** - Must implement `findBlockId()` and `saveBlock()` using Dexie operations.
 - **REQT-3.3.2**/1gw45sp198: COMPLETED: **UTXO Storage** - Must implement `findUtxoId()` and `saveUtxo()` using Dexie operations.
 - **REQT-3.3.3**/nm2ed7m80y: COMPLETED: **Transaction Storage** - Must implement `findTxId()` and `saveTx()` using Dexie operations.
 - **REQT-3.3.4**/cchf3wgnk3: COMPLETED: **UUT Catalog Storage** - Must implement `findUtxoByUUT(uutId)` to query utxos table by uutIds multiEntry index. Must store the `uutIds` array provided in the `UtxoIndexEntry` passed to `saveUtxo()`.

### REQT-3.4/z7ykwww22z: BACKLOG: **Alternative Storage Backends**

#### Purpose
Documents planned alternative storage implementations. Applied when evaluating storage strategies or implementing non-Dexie backends.

 - **REQT-3.4.1**/pd0vdphpmp: BACKLOG: **Memory Store Implementation** - Must implement `MemoryUtxoStore` class for in-memory storage (currently throws "Memory strategy not implemented").
 - **REQT-3.4.2**/7h35vgvw4a: BACKLOG: **Dred Store Implementation** - Must implement `DredUtxoStore` class for Dred-based storage (currently throws "Dred strategy not implemented").

### REQT-3.5/5q7mqc45w1: IMPLEMENTED/NEEDS VERIFICATION: **Pending Transaction Dexie Implementation**

#### Purpose
Implements the pending-tx store operations in the Dexie backend. Applied when modifying the pendingTxs table schema, implementing rollback queries, or debugging pending-tx persistence.

 - **REQT-3.5.1**/yz1ymcenzx: IMPLEMENTED/NEEDS VERIFICATION: **PendingTxs Table Schema** — MUST add `pendingTxs` table to DexieUtxoStore Dexie schema with `txHash` as primary key and `status` as indexed field. MUST require a schema version bump.

 - **REQT-3.5.2**/9d83h3a7df: IMPLEMENTED/NEEDS VERIFICATION: **Pending Tx CRUD Implementation** — MUST implement `savePendingTx()`, `findPendingTx()`, `getPendingByStatus()`, and `setPendingTxStatus()` using Dexie operations on the `pendingTxs` table.

 - **REQT-3.5.3**/5skb90kx7n: IMPLEMENTED/NEEDS VERIFICATION: **Rollback Operations Implementation** — MUST implement `clearSpentByTx(txHash)` to query utxos table for entries where `spentInTx === txHash` and set `spentInTx` to null. MUST implement `deleteUtxosByTxHash(txHash)` to delete utxos where `utxoId` starts with `txHash#`. MUST implement `deleteRecordsByTxHash(txHash)` to delete records where `utxoId` starts with `txHash#`.

 - **REQT-3.5.4**/5799nq1d0x: IMPLEMENTED/NEEDS VERIFICATION: **Purge Implementation** — MUST implement `purgeOldPendingTxs(olderThan)` to delete pendingTxs rows where `status !== "pending"` and `submittedAt < olderThan`.

### Component: Blockfrost Type Definitions

#### Overview
Type definitions and validation factories for Blockfrost API responses, ensuring type safety and runtime validation.

### REQT-4.1/dee8dgbdxg: COMPLETED: **API Response Type Validation**

#### Purpose
Ensures type safety for Blockfrost API responses. Applied when adding new API endpoints or modifying response handling.

 - **REQT-4.1.1**/7t6c1zwp0p: COMPLETED: **BlockDetails Type** - Must define type for Blockfrost block response schema (time, height, hash, slot, etc.).
 - **REQT-4.1.2**/74vphrcgps: COMPLETED: **AddressTransactionSummaries Type** - Must define type for Blockfrost transaction summary schema (tx_hash, block_height, block_time).

### Component: Dexie Record Types

#### Overview
Dexie Entity classes for type-safe storage of indexed data.

### REQT-5.1/nra8tvh4zt: COMPLETED: **Dexie Entity Classes**

#### Purpose
Defines Dexie Entity classes for type-safe storage. Applied when modifying database entity structure.

 - **REQT-5.1.1**/dzx5harnk4: COMPLETED: **Block Entity** - Must store block details with hash as primary key and height indexed.
 - **REQT-5.1.2**/gbzxxv71m8: COMPLETED: **UTXO Entity** - Must store UTXO details with utxoId as primary key. Must include mph-matching token values and inline datum/datumHash. Must include `uutIds` field as an array (possibly empty) with secondary index for UUT lookups.
 - **REQT-5.1.3**/cj6nm0mpm1: COMPLETED: **Log Entity** - Must store log entries with logId, pid, time, and message.
 - **REQT-5.1.4**/nt1pqd3m3z: COMPLETED: **UUT Catalog Entity** - Must store UUT catalog entries by augmenting the UTXO entity with the uutIds array as a multiEntry secondary index

### REQT-5.2/9d3wch4hsc: IMPLEMENTED/NEEDS VERIFICATION: **Record Index Entity**

#### Purpose
Defines the storage type and Dexie table for parsed delegated-data records. Applied when modifying the records storage schema or adding record query methods.

 - **REQT-5.2.1**/xpvvqfwf5m: IMPLEMENTED/NEEDS VERIFICATION: **RecordIndexEntry Type** — MUST define `RecordIndexEntry` with fields: `id` (string, record-id — same namespace as uutIds), `utxoId` (string, FK to UtxoIndexEntry), `type` (string, delegated data type name), `parsedData` (structured object stored directly in IndexedDB — byte arrays converted to `{bytes: number[], string?: string}` for Helios `makeByteArrayData` compatibility and human readability). MUST be Helios-free. Record spent-state is governed by the UTXO layer — records do NOT have their own `spentInTx` field.

 - **REQT-5.2.2**/8a4jkznm6a: IMPLEMENTED/NEEDS VERIFICATION: **Records Dexie Table** — MUST add `records` table to DexieUtxoStore with indexes: `id` (PK), `utxoId`, `type`. MUST implement `saveRecord()`, `findRecord(id)`, `findRecordsByType(type)` on `UtxoStoreGeneric`.

 - **REQT-5.2.3**/38d4zc2qrx: IMPLEMENTED/NEEDS VERIFICATION: **Parsed Block Height Tracking** — MUST persist `lastParsedBlockHeight` in the store. MUST provide `getLastParsedBlockHeight()` and `setLastParsedBlockHeight(height)` on `UtxoStoreGeneric`.

### REQT-5.3/xa1224nbsc: IMPLEMENTED/NEEDS VERIFICATION: **Pending Transaction Entry Type**

#### Purpose
Defines the storage type for in-flight transaction records. Applied when modifying the pending-tx persistence schema or adding fields to the serializable projection of TxDescription.

 - **REQT-5.3.1**/jqz2m497vx: IMPLEMENTED/NEEDS VERIFICATION: **PendingTxEntry Type** — MUST define `PendingTxEntry` in `types/PendingTxEntry.ts` with fields: `txHash` (string, PK), `description` (string), `id` (string, TxDescription.id), `parentId` (string, optional), `depth` (number), `moreInfo` (string, optional), `txName` (string, optional), `txCborHex` (string, unsigned CBOR), `signedTxCborHex` (string, signed CBOR), `deadline` (number, epoch ms — txValidityEnd + graceBuffer based on chain time), `status` (`"pending" | "confirmed" | "rolled-back"`), `submittedAt` (number, epoch ms). MUST be Helios-free and IndexedDB-serializable. MUST NOT include `BuiltTcxStats` (contains non-serializable `Wallet`, `WalletHelper`, `PubKeyHash` objects). The live `TxDescription` object is held in-memory only per REQT/2w2yyc2m1k (In-Memory Pending Map).

## Files

1. `src/networkClients/UtxoIndex/CachedUtxoIndex.ts`
2. `src/networkClients/UtxoIndex/DexieUtxoStore.ts`
3. `src/networkClients/UtxoIndex/UtxoStoreGeneric.ts`
4. `src/networkClients/UtxoIndex/RateLimitedFetch.ts`
5. `src/networkClients/UtxoIndex/types/UtxoIndexEntry.ts`
6. `src/networkClients/UtxoIndex/blockfrostTypes/BlockDetails.ts`
7. `src/networkClients/UtxoIndex/blockfrostTypes/UtxoDetails.ts`
8. `src/networkClients/UtxoIndex/blockfrostTypes/AddressTransactionSummaries.ts`
9. `src/networkClients/UtxoIndex/dexieRecords/BlockDetails.ts`
10. `src/networkClients/UtxoIndex/dexieRecords/UtxoDetails.ts`
11. `src/networkClients/UtxoIndex/dexieRecords/Logs.ts`
12. `src/networkClients/UtxoIndex/types/RecordIndexEntry.ts`
13. `src/networkClients/UtxoIndex/types/MetadataEntry.ts`
14. `src/networkClients/UtxoIndex/types/PendingTxEntry.ts`

## Implementation Notes

### UTXO ID Format
UTXO IDs are constructed as `${txHash}#${outputIndex}` to uniquely identify each UTXO. This format matches the Helios `TxInput.id` format.

### UUT Cataloging Strategy
Delegate UUTs at external script addresses are cataloged by querying Blockfrost for specific `capoMph + uutName` tokens after discovering them from the charter. Each UTXO containing UUTs stores them in its `uutIds` array field, indexed via Dexie multiEntry for fast lookups.

### Block Height Tracking
The indexer maintains `lastBlockHeight` to track the most recent block processed. This determines the starting point for transaction monitoring.

## Implementation Log

Meta-requirements: maintainers MUST NOT modify past details in the implementation log. Future changes should be appended to show progression.

### Phase 1: Requirements & Architecture
* Defined single-address monitoring architecture
* Established UUT cataloging approach for delegate tokens at external addresses
* Defined storage interface with simplified operations
* Documented Blockfrost API integration requirements

### Phase 2: Core Implementation (Current)
* Implemented `CachedUtxoIndex` constructor with Blockfrost URL detection and storage initialization
* Implemented `syncNow()` with capo UTxO fetching, charter data resolution, and delegate UUT indexing
* Implemented `checkForNewTxns()` and `processTransactionForNewUtxos()`
* Implemented all Blockfrost API integration (`fetchFromBlockfrost`, `fetchAndStoreLatestBlock`, `findOrFetchTxDetails`, `findOrFetchBlockHeight`)
* Implemented `DexieUtxoStore` with block, UTXO, transaction, and log storage
* Implemented structured logging with process ID management
* Implemented all ArkType validation factories (BlockDetails, UtxoDetails, AddressTransactionSummaries)
* Implemented Dexie entity classes for blocks and logs

#### COMPLETED: UUT Storage Foundation
All UUT storage infrastructure is now in place:
1. Added `uutIds: string[]` field to `dexieUtxoDetails` entity (REQT-5.1.2)
2. Updated Dexie schema with `*uutIds` multiEntry index (REQT-3.1.1)
3. Added `findUtxoByUUT(uutId)` to `UtxoStoreGeneric` interface (REQT-2.1.1)
4. Implemented `findUtxoByUUT()` in DexieUtxoStore (REQT-3.3.4)

#### COMPLETED: Complete Sync Flow
* Updated `syncNow()` to store capo UTXOs with extracted uutIds (REQT-1.3.1)
* Updated `indexUtxoFromOutput()` to extract and store uutIds (REQT-1.3.4)
* Added charter change detection in transaction processing (REQT-1.2.2)
* UUT movement detection during monitoring (REQT-1.2.3)
* Renamed `indexDelegateUuts()` to `catalogDelegateUuts()` per requirements (REQT-1.2.1)
* Renamed `monitorForNewTransactions()` to `checkForNewTxns()` per requirements (REQT-1.3.2)
* Updated `processTransactionForNewUtxos()` to index ALL outputs, not just UUT-containing ones (REQT-1.3.3)

#### COMPLETED: v2 Features
* Implemented automated periodic refresh with timer-based `checkForNewTxns()` (REQT/zzsg63b2fb)
* Implemented public query API methods: `findUtxoByUUT()`, `findUtxosByAsset()`, `findUtxosByAddress()`, `getAllUtxos()` (REQT/50zkk5xgrx)

#### COMPLETED: ReadonlyCardanoClient Conformance (REQT/rc7km2x8hp)
* DONE: `isMainnet()` (REQT/gy8z4a7pu)
* DONE: `hasUtxo(utxoId)` (REQT/gw6x2y5ns)
* DONE: `getUtxo(id)` returning Helios `TxInput` (REQT/gt3ux9v2kp)
* DONE: `getUtxos(address)` returning `TxInput[]` (REQT/gu4vy0w3lq)
* DONE: `getUtxosWithAssetClass(address, assetClass)` with cache-first lookup (REQT/gv5wz1x4mr)
* DONE: `getTx(id)` (REQT/gx7y3z6ot)
* DONE: `now` property returning current slot from lastSlot field, initialized from cache at startup (REQT/gz9a5b8qv)
* DONE: `parameters` property delegating to underlying network client (REQT/ha0b6c9rw)
* DONE: `getLatestBlock()` method added to UtxoStoreGeneric for cache initialization

#### Decoupled Architecture
CachedUtxoIndex accepts discrete components instead of requiring a full Capo instance:
* Address and minting policy hash for monitoring
* Network client for underlying blockchain queries
* Bridge component for decoding charter datum
This enables CachedUtxoIndex to be used as the network client for a Capo, avoiding circular dependencies.

#### COMPLETED: Rate Limiting & Event System (REQT/rl8m2x9abc)
* Implemented `RateLimitedFetch` class with token bucket algorithm (300 burst, 7/s refill)
* HTTP 429 handling with 10s backoff, refill rate reduction, and gradual recovery
* Global `blockfrostRateLimiter` instance shared across all CachedUtxoIndex instances
* Rate limiter metrics exposed via EventEmitter (requestsPerSecond, isRateLimited, etc.)
* CachedUtxoIndex events: `syncStart`, `syncComplete`, `syncing`, `synced`, `rateLimitMetrics`
* Single event emitter on CachedUtxoIndex for all client subscriptions
* Updated: 429 rate reduction now compounds using golden ratio (÷1.61) instead of fixed half; minimum 0.5 req/s floor

#### COMPLETED: Sync-Ready & Cache-First Startup (REQT/j8vn3rm90z, REQT/n5kffw8tf2)
* Added `syncReady` promise that resolves when initial sync completes
* All query methods now await `syncReady` before accessing cache, preventing premature network fallbacks
* Modified `syncNow()` to check for existing cached block data via `store.getLatestBlock()`
* If cached data exists, initializes state from cache and performs incremental sync via `checkForNewTxns()` instead of full sync
* Enables fast startup from persisted IndexedDB - subsequent page loads skip full Blockfrost sync

#### COMPLETED: Full TxInput Restoration (REQT/ss7w87ecmj)
Tx CBOR from Blockfrost only contains TxOutputId references for inputs, not full output data.
To match BlockfrostV0Client behavior, we restore full TxInputs with:
* DONE: `indexEntryToTxInput()` method restores TxInput from cached UtxoIndexEntry (REQT/nqemw2gvm2)
* DONE: `fetchAndCacheScript()` fetches reference script CBOR from `/scripts/{hash}/cbor` endpoint (REQT/tqrhbphgyx)
* DONE: Script storage in DexieUtxoStore with `saveScript()`/`findScript()` (REQT/k2wvnd3f1e)
* DONE: `getTxInfo()` uses `tx.recover(this)` for input restoration, following Helios convention where `getTx()` returns raw Tx (REQT/qc7qgsqphv)

#### COMPLETED: Spent UTXO Eviction (REQT/2jk4j31mgr)
Critical bug fix: spent UTXOs were retained in cache and returned by query methods.
* DONE: Added `spentInTx: string | null` field to UtxoIndexEntry and dexieUtxoDetails (REQT/11msfc4wv8)
* DONE: Added `markUtxoSpent()` method to UtxoStoreGeneric interface and DexieUtxoStore
* DONE: Process `tx.body.inputs` in `processTransactionForNewUtxos()` to mark spent UTXOs (REQT/hhbcnvd9aj)
* DONE: All query methods filter out spent UTXOs: `findUtxoByUUT`, `findUtxosByAsset`, `findUtxosByAddress`, `getAllUtxos` (REQT/g3jen1rcvd)

#### IN PROGRESS: Wallet Address Indexing (REQT/ngn9agx52a)
Extends indexer to cache UTXOs from connected wallet addresses:
* DONE: `WalletAddressEntry` type for per-address sync state (REQT/620ypcc34d)
* DONE: `walletAddresses` table in DexieUtxoStore schema (REQT/620ypcc34d)
* DONE: `addWalletAddress()` method for registering addresses (REQT/mp4dx7ngvf)
* DONE: `syncWalletAddressIfStale()` for on-demand refresh (REQT/92m7kpkny7)
* DONE: `getUtxos()` checks staleness for registered wallet addresses (REQT/92m7kpkny7)
* TODO: CapoDappProvider integration to auto-register on wallet connect (REQT/ctc4z2k5pq)

#### IMPLEMENTED/NEEDS VERIFICATION: Parsed Record Index (REQT/5bmbf54qhy)
Pre-parsed delegated-data records stored in `records` Dexie table:
* Prerequisite fix: REQT/6h4f158gvs needs `blockHeight` restored to UtxoIndexEntry and Dexie utxos schema (was specified but never implemented; status corrected COMPLETED → NEXT)
* `RecordIndexEntry` type and `records` Dexie table (REQT/9d3wch4hsc)
* `lastParsedBlockHeight` persistent tracking (REQT/38d4zc2qrx)
* `attachCapo(capo)` enables datum parsing after construction (REQT/yx0yze9swf)
* New UTXOs parsed inline during monitoring when Capo attached (REQT/pshpah30em)
* Catchup processing on Capo attachment using `lastParsedBlockHeight` watermark (REQT/3aew7g7wdw)
* `findRecord(id)` and `findRecordsByType(type)` query methods (REQT/gdmdg66paw)
* EXPECTS Capo to expose `parseDelegatedDatum()` for datum parsing pipeline (REQT/gtgje3zy0g)
* EXPECTS CapoDappProvider to call `attachCapo()` in `connectCapo()` (REQT/md6x3wbnct)
* Work unit: `src/networkClients/UtxoIndex/20260216.parsed-record-index.workUnit.md`

#### IMPLEMENTED/NEEDS VERIFICATION: In-Flight Transaction Integration (REQT/3dhhjsav15)
Architecture discovery completed for connecting transaction submission path to UTXO index:
* PendingTxEntry type for Dexie-serializable pending tx state (REQT/xa1224nbsc)
* `registerPendingTx()` accepts signed CBOR, decodes through existing pipeline (REQT/p2ts24jbkg)
* Speculative spends reuse existing `spentInTx` field — no new UTXO fields needed
* Pending-origin outputs identified by txHash prefix matching pending-tx table
* Confirmation on block arrival skips re-indexing, promotes status (REQT/58b9nzgcbj)
* Rollback on chain-time deadline expiry restores UTXOs/records (REQT/a9y19g0pmr)
* `isPending()` synchronous query on CachedUtxoIndex, not on FoundDatumUtxo (REQT/mjhf1yezr9)
* Events: `txConfirmed`, `txRolledBack`, `pendingSynced` for CapoDappProvider (REQT/fz6z7rr702)
* Startup recovery: load pending from Dexie as stale, verify after first sync (REQT/fn70x96nxm)
* 72h purge retention for non-pending entries (REQT/agg98btez8)
* Store interface extended with pending-tx CRUD and rollback operations (REQT/4wc5crjd3y)
* Dexie implementation with `pendingTxs` table, schema version bump (REQT/5q7mqc45w1)
* Architecture doc: `utxoIndex.ARCHITECTURE.md` v2.0, `utxoIndex.arch.jsonl` created

## Release Management Plan

### v1 (Current)
 - **Goal**: Functional Single-Address UTXO Indexer with UUT Catalog
 - **Criteria**:
    - Core indexer architecture (REQT/vxdc27201y)
    - UUT cataloging and charter tracking (REQT/y034z487y5)
    - Synchronization and monitoring (REQT/3zx9pcggch)
    - Blockfrost API integration (REQT/k3xfpg6jkb)
    - Dexie storage backend (REQT/dbwnqvqwa1, REQT/pdctymd7yj)

### v2 (Planned)
 - **Goal**: Production-Ready with Query API, Periodic Refresh, Wallet Integration, and In-Flight Transaction Support
 - **Criteria**:
    - Automated periodic refresh (REQT/zzsg63b2fb)
    - Public query API methods (REQT/50zkk5xgrx)
    - Pagination for high-volume activity (REQT/0aewmbbfct)
    - Invariant support (REQT/jz6zf4py6n)
    - Full TxInput restoration (REQT/ss7w87ecmj)
    - Wallet address indexing (REQT/ngn9agx52a)
    - Parsed record index (REQT/5bmbf54qhy)
    - In-flight transaction integration (REQT/3dhhjsav15)

### v3 (Future)
 - **Goal**: Multi-Backend Storage & Provider Support
 - **Criteria**:
    - Memory store implementation (REQT/pd0vdphpmp)
    - Dred store implementation (REQT/7h35vgvw4a)
    - Ogmios backend (REQT/70sncha8f2)
    - Server-side storage backends — CouchDB/PostgreSQL (REQT/q83ztd3kkv)
    - Server-mediated client sync for mobile-friendly lightweight operation (REQT/v9h5pez7bh)
