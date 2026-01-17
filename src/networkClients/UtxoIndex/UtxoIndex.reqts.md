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

 - **Single-Address Monitoring**: Because the charter token resides at the Capo address and every transaction affecting delegate-UUTs or delegated-data records must touch the Capo address (for charter reference), only the Capo address needs monitoring
 - **UUT Cataloging**: Delegate UUTs at external script addresses are discovered from the charter and cataloged via Blockfrost queries for fast lookups
 - **Delegate UUT Detection**: When delegate UUTs are moved to new UTXOs due to transaction activity, the catalog is updated to reflect the current UTXO location
 - **Charter Change Detection**: When the charter UTXO (mph.charter token) appears in a transaction, the indexer re-catalogs delegate UUTs

**Essential technologies**: Dexie (IndexedDB wrapper), Blockfrost REST API, Helios (transaction decoding), ArkType (runtime validation).

**Related technologies**: Capo (provides charter data and delegate discovery), browser IndexedDB (underlying storage).

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
   - MUST store UUT→UTXO mapping via `store.saveUUT()`
   - MUST handle missing delegates gracefully (log warnings, continue processing)
   - MUST use UNCACHED hint (`findCached: false`) to ensure fresh network fetches rather than cached values

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
   - MUST support operations: `log()`, `findBlockId()`, `saveBlock()`, `findUtxoId()`, `saveUtxo()`, `findTxId()`, `saveTx()`, `saveUUT()`, `findUtxoByUUT()`

2. **Dexie Implementation**:
   - MUST implement `DexieUtxoStore` extending Dexie and implementing `UtxoStoreGeneric`
   - MUST define database schema with tables: `blocks`, `utxos`, `txs`, `logs`, `delegateUuts`
   - MUST support indexed queries: blocks by hash/height, utxos by utxoId, delegateUuts by uutId
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

## Detailed Requirements

This section organizes key software objects, expressing the detailed requirements connected to actually implementing the functional needs.

### Component: CachedUtxoIndex Class

#### Overview
The core class that orchestrates UTXO indexing, transaction monitoring, and block tracking for a single Capo address. It coordinates between the Capo instance (for charter data), Blockfrost API, and the storage backend.

#### Requirements

### REQT-1.1/vxdc27201y: COMPLETED: **Core Architecture & Initialization**

#### Purpose
Establishes the foundational data structures and initialization sequence for the indexer. Applied when implementing or modifying constructor logic, core data types, or initial setup procedures.

 - **REQT-1.1.1**/xxkzfx9gf4: COMPLETED: **Constructor & Initialization** - Must accept `capo`, `blockfrostKey`, and optional `storeIn` strategy. Must determine Blockfrost base URL from API key prefix (mainnet/preprod/preview). Must initialize storage backend based on strategy. Must trigger `syncNow()` after initialization.
 - **REQT-1.1.2**/9a0nx1gr4b: NEXT: **Core State** - Must maintain: `capoAddress` (bech32 string), `capoMph` (hex-encoded minting policy hash for filtering), `lastSyncedBlock` (last block height processed).

### REQT-1.2/y034z487y5: NEXT: **UUT Cataloging & Charter Tracking**

#### Purpose
Governs delegate UUT discovery, cataloging, and updates based on charter changes. Applied when implementing charter traversal logic, UUT cataloging, or charter change detection mechanisms.

 - **REQT-1.2.1**/k0mnv27tz4: NEXT: **UUT Catalog from Charter** - Must implement `catalogDelegateUuts(charterData)` to discover and catalog all delegate UUTs. Must iterate through delegate types in charter (mint delegate, spend delegate, gov authority, other named delegates, dgData controllers). For each delegate, must query Blockfrost for the UUT using `capoMph + uutName`. Must store UUT→UTXO mapping via `store.saveUUT(uutId, utxoId)`.
 - **REQT-1.2.2**/xrdj6qpgnj: NEXT: **Charter Change Detection** - Must detect charter UTXO state changes during routine transaction monitoring. When processing transaction outputs, must check for presence of `mph.charter` token. Upon detecting charter token, must call `capo.findCharterData()` to fetch updated charter and invoke `catalogDelegateUuts()` to refresh UUT catalog.
 - **REQT-1.2.3**/m29vd4vr3q: NEXT: **UUT Movement Detection** - During transaction processing, must detect when delegate UUTs are moved to new UTXOs. Must update the UUT catalog via `store.saveUUT()` to reflect the new UTXO location.

### REQT-1.3/3zx9pcggch: NEXT: **Synchronization & Monitoring**

#### Purpose
Defines how the indexer performs initial synchronization and ongoing transaction monitoring of the Capo address. Applied when implementing sync logic, periodic monitoring, or transaction processing.

 - **REQT-1.3.1**/vk2bywdycn: NEXT: **Initial Sync** - Must implement `syncNow()` method to perform full index initialization. Must fetch charter data via `capo.findCharterData()`. Must fetch all UTXOs at `capoAddress` via Blockfrost. Must store UTXOs via `store.saveUtxo()`. Must call `catalogDelegateUuts(charterData)` to catalog delegate UUTs. Must fetch and store latest block details.
 - **REQT-1.3.2**/fh56sce22g: NEXT: **Transaction Monitoring** - Must implement `checkForNewTxns()` to check for new transactions at `capoAddress`. Must query Blockfrost `addresses/{capoAddress}/transactions` endpoint with `order=desc`, `count=100`, and `from` parameter set to `lastSyncedBlock`. Must process each new transaction via `processTransactionForNewUtxos()`. Must update `lastSyncedBlock` on success.
 - **REQT-1.3.3**/0vrkpk6a6h: NEXT: **Transaction Processing** - Must implement `processTransactionForNewUtxos()` to extract and index relevant UTXOs from transactions. Must fetch full transaction CBOR and decode using Helios `decodeTx()`. Must examine each transaction output. Must check if UTXO already exists in store via `store.findUtxoId()`. Must index new UTXOs via `indexUtxoFromOutput()`. Must update UUT catalog if delegate UUTs moved.
    - **REQT-1.3.4**/mvjrak021s: NEXT: **UTXO Indexing** - Must implement `indexUtxoFromOutput()` to store UTXO id and any mph-matching token values for later search. Must extract inline datum as binary data or datum hash. Must save to store via `store.saveUtxo()`.

### REQT-1.4/k3xfpg6jkb: COMPLETED: **External Data Services & Utilities**

#### Purpose
Governs interactions with Blockfrost API, block/transaction management, and data format conversions. Applied when implementing or modifying API client logic, caching strategies, or data transformation utilities.

 - **REQT-1.4.1**/nw8d0yew8j: NEXT: **Block Management** - Must implement `fetchAndStoreLatestBlock()` to query Blockfrost `blocks/latest` endpoint, store in database via `store.saveBlock()`, and update indexer's `lastBlockHeight`. Must implement `findOrFetchBlockHeight()` to resolve block height from hash, checking store cache via `store.findBlockId()` before querying Blockfrost `blocks/{hash}` endpoint.
 - **REQT-1.4.2**/sy05qvrfd0: NEXT: **Transaction Fetching with Caching** - Must implement `findOrFetchTxDetails()` to retrieve transaction CBOR with cache-first strategy. Must check store via `store.findTxId()`. On cache miss, must query Blockfrost `txs/{txId}/cbor` endpoint, save CBOR to store via `store.saveTx()`, and decode using Helios `decodeTx()`. Must return decoded `Tx` object.
 - **REQT-1.4.3**/cdhjy5k8at: NEXT: **Blockfrost HTTP Client** - Must implement `fetchFromBlockfrost()` generic HTTP client for Blockfrost API. Must construct full URL from `blockfrostBaseUrl` and relative path parameter. Must include `project_id` header with `blockfrostKey` value. Must parse JSON responses. On HTTP errors, must log error and throw descriptive error.

### REQT-1.5/8x3f5pv2kd: BACKLOG: **Future Enhancements & Optimizations**

#### Purpose
Documents planned features and performance improvements not yet implemented. Applied when planning future development cycles, evaluating architectural extensions, or prioritizing feature roadmap.

 - **REQT-1.5.1**/jz6zf4py6n: BACKLOG: **Invariant Support** - Must extend UUT cataloging logic to index spend invariants and mint invariants from charter data.
 - **REQT-1.5.2**/zzsg63b2fb: BACKLOG: **Automated Periodic Refresh** - Must implement timer-based refresh using defined intervals (`refreshInterval` 60 seconds for transaction monitoring). Must trigger `checkForNewTxns()` on refresh interval.
 - **REQT-1.5.3**/0aewmbbfct: BACKLOG: **Pagination for High-Volume Activity** - Must handle cases where `addresses/{address}/transactions` endpoint returns 100+ results in single monitoring cycle. Must implement pagination strategy to fetch additional pages when response count equals limit.
 - **REQT-1.5.4**/50zkk5xgrx: BACKLOG: **Query API Methods** - Must provide public query interface for indexed UTXOs. Must implement `findUtxoId(id)`, `findUtxoByUUT(uutId)`, and queries by asset (mph, tokenName). Must support filtering and pagination options.

### Component: UtxoStoreGeneric Interface

#### Overview
Defines the contract for storage backends, allowing the indexer to work with different storage strategies (Dexie, memory, future: Dred).

### REQT-2.1/pg6g84g7kg: NEXT: **Storage Interface Contract**

#### Purpose
Establishes the abstraction layer for storage backends. Applied when implementing new storage strategies, modifying storage operations, or understanding the data persistence contract.

 - **REQT-2.1.1**/nhbqmacrwn: NEXT: **Interface Methods** - Must define `UtxoStoreGeneric` interface with methods: `log()`, `findBlockId()`, `saveBlock()`, `findUtxoId()`, `saveUtxo()`, `findTxId()`, `saveTx()`, `saveUUT()`, `findUtxoByUUT()`
 - **REQT-2.1.2**/bq0ammh636: NEXT: **Type Definitions** - Must define `txCBOR` type with `txid` and `cbor` fields.

### Component: DexieUtxoStore Class

#### Overview
Dexie-based implementation of `UtxoStoreGeneric` providing persistent browser storage using IndexedDB.

### REQT-3.1/dbwnqvqwa1: NEXT: **Dexie Database Schema & Initialization**

#### Purpose
Defines the IndexedDB schema and entity mappings for the Dexie storage backend. Applied when modifying database structure, adding tables, or changing indexes.

 - **REQT-3.1.1**/6h4f158gvs: NEXT: **Database Definition** - Must extend Dexie with database name "StellarDappIndex-v0.1". Must define schema with tables: `blocks` (hash, height), `utxos` (utxoId, blockId, blockHeight), `txs` (txid), `logs` (logId, [pid,time]), `delegateUuts` (uutId, delegateRole, address).
 - **REQT-3.1.2**/exv4s020a0: NEXT: **Entity Mapping** - Must map tables to appropriate Dexie Entity classes for type-safe storage.

### REQT-3.2/754gq4cbqk: NEXT: **Logging & Process Management**

#### Purpose
Governs the structured logging system for debugging and UI inspection. Applied when implementing or debugging indexer operations, or building monitoring dashboards.

 - **REQT-3.2.1**/cm9ez5thxz: NEXT: **Process ID Management** - Must implement `init()` to find maximum pid in logs table and assign next pid. Must handle concurrent initialization attempts.
 - **REQT-3.2.2**/p7ryk4ztes: NEXT: **Logging Implementation** - Must implement `log()` to create log entries with pid, timestamp, and message. Must use logId as primary key.

### REQT-3.3/pdctymd7yj: NEXT: **Data Storage Operations**

#### Purpose
Implements CRUD operations for blocks, UTXOs, transactions, and UUT catalog. Applied when reading or modifying storage access patterns or adding new query methods.

 - **REQT-3.3.1**/76e18y06kp: NEXT: **Block Storage** - Must implement `findBlockId()` and `saveBlock()` using Dexie operations.
 - **REQT-3.3.2**/1gw45sp198: NEXT: **UTXO Storage** - Must implement `findUtxoId()` and `saveUtxo()` using Dexie operations.
 - **REQT-3.3.3**/nm2ed7m80y: NEXT: **Transaction Storage** - Must implement `findTxId()` and `saveTx()` using Dexie operations.
 - **REQT-3.3.4**/cchf3wgnk3: NEXT: **UUT Catalog Storage** - Must implement `saveUUT(uutId, utxoId)` and `findUtxoByUUT(uutId)` using Dexie operations on delegateUuts table.

### REQT-3.4/z7ykwww22z: BACKLOG: **Alternative Storage Backends**

#### Purpose
Documents planned alternative storage implementations. Applied when evaluating storage strategies or implementing non-Dexie backends.

 - **REQT-3.4.1**/pd0vdphpmp: BACKLOG: **Memory Store Implementation** - Must implement `MemoryUtxoStore` class for in-memory storage (currently throws "Memory strategy not implemented").
 - **REQT-3.4.2**/7h35vgvw4a: BACKLOG: **Dred Store Implementation** - Must implement `DredUtxoStore` class for Dred-based storage (currently throws "Dred strategy not implemented").

### Component: Blockfrost Type Definitions

#### Overview
Type definitions and validation factories for Blockfrost API responses, ensuring type safety and runtime validation.

### REQT-4.1/dee8dgbdxg: NEXT: **API Response Type Validation**

#### Purpose
Ensures type safety for Blockfrost API responses. Applied when adding new API endpoints or modifying response handling.

 - **REQT-4.1.1**/7t6c1zwp0p: NEXT: **BlockDetails Type** - Must define type for Blockfrost block response schema (time, height, hash, slot, etc.).
 - **REQT-4.1.2**/74vphrcgps: NEXT: **AddressTransactionSummaries Type** - Must define type for Blockfrost transaction summary schema (tx_hash, block_height, block_time).

### Component: Dexie Record Types

#### Overview
Dexie Entity classes for type-safe storage of indexed data.

### REQT-5.1/nra8tvh4zt: NEXT: **Dexie Entity Classes**

#### Purpose
Defines Dexie Entity classes for type-safe storage. Applied when modifying database entity structure.

 - **REQT-5.1.1**/dzx5harnk4: NEXT: **Block Entity** - Must store block details with hash as primary key and height indexed.
 - **REQT-5.1.2**/gbzxxv71m8: NEXT: **UTXO Entity** - Must store UTXO details with utxoId as primary key. Must include mph-matching token values and inline datum/datumHash.
 - **REQT-5.1.3**/cj6nm0mpm1: NEXT: **Log Entity** - Must store log entries with logId, pid, time, and message.
 - **REQT-5.1.4**/nt1pqd3m3z: NEXT: **UUT Catalog Entity** - Must store UUT catalog entries with uutId as primary key, mapping to utxoId, delegateRole, and address.

## Files

1. `src/networkClients/UtxoIndex/CachedUtxoIndex.ts`
2. `src/networkClients/UtxoIndex/DexieUtxoStore.ts`
3. `src/networkClients/UtxoIndex/UtxoStoreGeneric.ts`
4. `src/networkClients/UtxoIndex/blockfrostTypes/BlockDetails.ts`
5. `src/networkClients/UtxoIndex/blockfrostTypes/UtxoDetails.ts`
6. `src/networkClients/UtxoIndex/blockfrostTypes/AddressTransactionSummaries.ts`
7. `src/networkClients/UtxoIndex/dexieRecords/BlockDetails.ts`
8. `src/networkClients/UtxoIndex/dexieRecords/UtxoDetails.ts`
9. `src/networkClients/UtxoIndex/dexieRecords/Logs.ts`

## Implementation Notes

### UTXO ID Format
UTXO IDs are constructed as `${txHash}#${outputIndex}` to uniquely identify each UTXO. This format matches the Helios `TxInput.id` format.

### UUT Cataloging Strategy
Delegate UUTs at external script addresses are cataloged by querying Blockfrost for specific `capoMph + uutName` tokens after discovering them from the charter. The UUT→UTXO mapping enables fast lookups without monitoring multiple addresses.

### Block Height Tracking
The indexer maintains `lastBlockHeight` to track the most recent block processed. This determines the starting point for transaction monitoring.

## Implementation Log

Meta-requirements: maintainers MUST NOT modify past details in the implementation log. Future changes should be appended to show progression.

### Phase 1: Requirements & Architecture (Current)
* Defined single-address monitoring architecture
* Established UUT cataloging approach for delegate tokens at external addresses
* Defined storage interface with simplified operations
* Documented Blockfrost API integration requirements

#### Next Recommendations
1. Implement core `CachedUtxoIndex` class with `syncNow()` and `checkForNewTxns()`
2. Implement `DexieUtxoStore` with all storage operations
3. Implement UUT catalog functionality
4. Add charter change detection

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
 - **Goal**: Production-Ready with Query API and Periodic Refresh
 - **Criteria**:
    - Automated periodic refresh (REQT/zzsg63b2fb)
    - Public query API methods (REQT/50zkk5xgrx)
    - Pagination for high-volume activity (REQT/0aewmbbfct)
    - Invariant support (REQT/jz6zf4py6n)

### v3 (Future)
 - **Goal**: Multi-Backend Storage Support
 - **Criteria**:
    - Memory store implementation (REQT/pd0vdphpmp)
    - Dred store implementation (REQT/7h35vgvw4a)
