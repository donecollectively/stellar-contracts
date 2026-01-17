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

The UtxoIndex provides a persistent, efficient cache of UTXOs (Unspent Transaction Outputs) needed for interacting with a specific Capo instance. This includes the charter token, delegate UUTs (Unique Utility Tokens) referenced in the charter, and all delegated-data records stored at the capo address. The indexer monitors the blockchain for new transactions and maintains an up-to-date view of relevant UTXOs, reducing the need for repeated network queries and enabling fast lookups for application logic.

The indexer operates as a **generic address-based monitor** with clear separation of concerns:

 - **Address Discovery**: Capo interprets the charter and provides a list of addresses to monitor
 - **MPH Filtering**: Each address can specify an optional minting policy hash filter for token selection
 - **Charter Change Detection**: When the charter UTXO (mph.charter token) appears in a transaction, the indexer triggers address list refresh
 - **Separation of Concerns**: The indexer is a general-purpose UTXO monitor; Capo owns charter interpretation logic

**Essential technologies**: Dexie (IndexedDB wrapper), Blockfrost REST API, Helios (transaction decoding), ArkType (runtime validation).

**Related technologies**: Capo (provides address list and charter interpretation), browser IndexedDB (underlying storage).

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

1. **Efficient UTXO Lookups**: Provide fast, local lookups for UTXOs by ID, address, or asset class without network calls
2. **Automatic Synchronization**: Monitor all active addresses for new transactions and update the index automatically
3. **Delegate UUT Tracking**: Index all delegate authority tokens referenced in the charter via address-based discovery
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

4. **Delegate UUT Indexing**:
   - MUST index mint delegate UUT using `capo.getMintDelegate()` and `DelegateMustFindAuthorityToken()` with `findCached: false`
   - MUST index spend delegate UUT using `capo.getSpendDelegate()` and `DelegateMustFindAuthorityToken()` with `findCached: false`
   - MUST index gov authority UUT using `capo.findGovDelegate()` and `DelegateMustFindAuthorityToken()` with `findCached: false`
   - MUST index other named delegates using `capo.getOtherNamedDelegate()` for each entry in `charterData.otherNamedDelegates`, then calling `DelegateMustFindAuthorityToken()` with `findCached: false`
   - MUST index dgData controller UUTs for each DgDataPolicy entry in the charter manifest using `capo.getDgDataController()` and `DelegateMustFindAuthorityToken()` with `findCached: false`
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
   - MUST support operations: `log()`, `findBlockByBlockId()`, `saveBlock()`, `findUtxoByUtxoId()`, `saveUtxo()`, `findTxById()`, `saveTx()`
   - MUST use type-safe interfaces (`BlockDetailsType`, `UtxoDetailsType`, `txCBOR`)

2. **Dexie Implementation**:
   - MUST implement `DexieUtxoStore` extending Dexie and implementing `UtxoStoreGeneric`
   - MUST define database schema with tables: `blocks`, `utxos`, `txs`, `logs`
   - MUST use Dexie Entity classes (`dexieBlockDetails`, `dexieUtxoDetails`, `indexerLogs`) for type safety
   - MUST support indexed queries: blocks by hash/height, utxos by utxoId/blockId/blockHeight, logs by pid/time
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
   - MUST define `UtxoDetailsType` matching Blockfrost UTXO response schema
   - MUST include: address, tx_hash, tx_index, output_index, amount (array of {unit, quantity}), block, data_hash, inline_datum, reference_script_hash
   - MUST parse quantity strings as numbers in the factory
   - MUST provide `UtxoDetailsFactory` for runtime validation

3. **AddressTransactionSummaries Type**:
   - MUST define `AddressTransactionSummariesType` for transaction summary responses
   - MUST include: tx_hash, tx_index, block_height, block_time
   - MUST provide `AddressTransactionSummariesFactory` for runtime validation

4. **Dexie Record Types**:
   - MUST define `dexieBlockDetails` extending Dexie Entity and implementing `BlockDetailsType`
   - MUST define `dexieUtxoDetails` extending Dexie Entity and implementing `UtxoDetailsType` with `utxoId` field
   - MUST define `indexerLogs` extending Dexie Entity with logId, pid, time, location, message fields
   - MUST provide computed properties (e.g., `blockId`, `blockHeight`) where needed

## Detailed Requirements

This section organizes key software objects, expressing the detailed requirements connected to actually implementing the functional needs.

### Component: CachedUtxoIndex Class

#### Overview
The core class that orchestrates UTXO indexing via address-based monitoring, transaction monitoring, and block tracking. It coordinates between the Capo instance (for address discovery), Blockfrost API, and the storage backend.

#### Requirements

### REQT-1.1/vxdc27201y: COMPLETED: **Core Architecture & Initialization**

#### Purpose
Establishes the foundational data structures and initialization sequence for the indexer. Applied when implementing or modifying constructor logic, core data types, or initial setup procedures.

 - **REQT-1.1.1**/xxkzfx9gf4: COMPLETED: **Constructor & Initialization** - Must accept `capo`, `blockfrostKey`, and optional `storeIn` strategy. Must determine Blockfrost base URL from API key prefix (mainnet/preprod/preview). Must initialize storage backend based on strategy. Must trigger `syncNow()` after initialization.
 - **REQT-1.1.2**/9a0nx1gr4b: COMPLETED: **MonitoredAddress Data Structure** - Must define `MonitoredAddress` type with fields: `address` (bech32 string, primary key), `capoMph` (hex-encoded minting policy hash), `addedAt` (timestamp when address was first added), `lastSyncedBlock` (last block height processed for this address, missing in case of initial sync), `lastError` (object for sync health tracking, with timestamp, message, and optional txHash), `lastSuccessfulSync` (timestamp of most recent successful sync), `active` (boolean allowing an address to be disabled).

### REQT-1.2/y034z487y5: COMPLETED: **Address Management & Charter Tracking**

#### Purpose
Governs address discovery, tracking, and dynamic updates based on charter changes. Applied when implementing charter traversal logic, address lifecycle management, or charter change detection mechanisms.

 - **REQT-1.2.1**/k0mnv27tz4: COMPLETED: **Address Collection from Charter** - Must implement `updateMonitoredAddresses(charterData)` to extract all relevant addresses from charter. Must add capo.address with no mph filter. Must iterate through delegate types (mint delegate via `capo.getMintDelegate()`, spend delegate via `capo.getSpendDelegate()`, gov authority via `capo.findGovDelegate()`, other named delegates via `capo.getOtherNamedDelegate()`, dgData controllers via `capo.getDgDataController()`). For each delegate, must extract address property and add to monitored set with mph filter set to capo.mph. Must mark addresses no longer in charter as inactive (active=false). Must persist all address records to store.
 - **REQT-1.2.2**/xrdj6qpgnj: COMPLETED: **Charter Change Detection** - Must detect charter UTXO state changes during routine transaction monitoring. When processing transaction outputs in `processTransactionForNewUtxos()`, must check each output for presence of `mph.charter` token. Upon detecting charter token, must call `capo.findCharterData()` to fetch updated charter and invoke `updateMonitoredAddresses()` to refresh the address list based on new charter state.

### REQT-1.3/3zx9pcggch: COMPLETED: **Synchronization & Monitoring Loops**

#### Purpose
Defines how the indexer performs initial synchronization and ongoing transaction monitoring across all addresses. Applied when implementing sync logic, periodic monitoring, transaction processing, or error handling for monitoring operations.

 - **REQT-1.3.1**/vk2bywdycn: COMPLETED: **Initial Sync** - Must implement `syncNow()` method to perform full index initialization. Must fetch charter data via `capo.findCharterData()`. Must call `updateMonitoredAddresses(charterData)` to populate address list. Must iterate over all active monitored addresses and fetch complete UTXO set from each via Blockfrost. Must extract unique transaction IDs from fetched UTXOs. Must fetch and cache transaction details for all unique transaction IDs. Must fetch and store latest block details via `fetchAndStoreLatestBlock()`.
 - **REQT-1.3.2**/fh56sce22g: COMPLETED: **Multi-Address Transaction Monitoring** - Must implement `monitorForNewTransactions()` to check all active addresses for new transactions. Must iterate over active addresses retrieved via `store.getActiveAddresses()`. For each address, must query Blockfrost `addresses/{address}/transactions` endpoint with `order=desc`, `count=100`, and `from` parameter set to address-specific `lastSyncedBlock`. Must validate API responses using `AddressTransactionSummariesFactory`. Must process each new transaction via `processTransactionForNewUtxos()`. Must update address `lastSyncedBlock` and `lastSuccessfulSync` on success. Must catch errors, log them, and record in address `lastError` object for health monitoring.
 - **REQT-1.3.3**/0vrkpk6a6h: COMPLETED: **UTXO Processing with MPH Filtering** - Must implement `processTransactionForNewUtxos()` to extract and index relevant UTXOs from transactions. Must fetch full transaction CBOR and decode using Helios `decodeTx()`. Must examine each transaction output. For outputs at monitored addresses, must apply mph filter if specified in address record (filter by checking if output contains tokens from specified mph). Must check if UTXO already exists in store via `store.findUtxoByUtxoId()`. Must index new UTXOs via `indexUtxoFromOutput()`.
 - **REQT-1.3.4**/mvjrak021s: COMPLETED: **UTXO Indexing** - Must implement `indexUtxoFromOutput()` to convert Helios `TxOutput` objects to `UtxoDetailsType` format for storage. Must convert output `Value` to Blockfrost amount array via `convertValueToBlockfrostAmount()`. Must extract inline datum (CBOR hex) or datum hash from output. Must fetch block hash from block height via `getBlockHashFromHeight()`. Must construct `UtxoDetailsType` object with all required fields. Must save to store via `store.saveUtxo()`.

### REQT-1.4/k3xfpg6jkb: COMPLETED: **External Data Services & Utilities**

#### Purpose
Governs interactions with Blockfrost API, block/transaction management, and data format conversions. Applied when implementing or modifying API client logic, caching strategies, or data transformation utilities.

 - **REQT-1.4.1**/nw8d0yew8j: COMPLETED: **Block Management** - Must implement `fetchAndStoreLatestBlock()` to query Blockfrost `blocks/latest` endpoint, validate response with `BlockDetailsFactory`, store in database via `store.saveBlock()`, and update indexer's `lastBlockId` and `lastBlockHeight` properties. Must implement `findOrFetchBlockHeight()` to resolve block height from hash, checking store cache via `store.findBlockByBlockId()` before querying Blockfrost `blocks/{hash}` endpoint.
 - **REQT-1.4.2**/sy05qvrfd0: COMPLETED: **Transaction Fetching with Caching** - Must implement `findOrFetchTxDetails()` to retrieve transaction CBOR with cache-first strategy. Must check store via `store.findTxById()`. On cache miss, must query Blockfrost `txs/{txId}/cbor` endpoint, save CBOR to store via `store.saveTx()`, and decode using Helios `decodeTx()`. Must return decoded `Tx` object.
 - **REQT-1.4.3**/cdhjy5k8at: COMPLETED: **Blockfrost HTTP Client** - Must implement `fetchFromBlockfrost()` generic HTTP client for Blockfrost API. Must construct full URL from `blockfrostBaseUrl` and relative path parameter. Must include `project_id` header with `blockfrostKey` value. Must parse JSON responses. On HTTP errors, must log error with URL context and throw descriptive error. On success, must log full JSON response for debugging and return typed data.
 - **REQT-1.4.4**/dgzjy7cw3k: COMPLETED: **Value to Blockfrost Amount Conversion** - Must implement `convertValueToBlockfrostAmount()` to transform Helios `Value` objects to Blockfrost amount array format. Must create array of `{unit: string, quantity: string}` objects. Must include lovelace entry with unit="lovelace". Must iterate through Value.assets map and create entries with unit=`${policyIdHex}${tokenNameHex}` and quantity as string. Must handle both single bytes and byte arrays for token names.

### REQT-1.5/8x3f5pv2kd: BACKLOG: **Future Enhancements & Optimizations**

#### Purpose
Documents planned features and performance improvements not yet implemented. Applied when planning future development cycles, evaluating architectural extensions, or prioritizing feature roadmap.

 - **REQT-1.5.1**/jz6zf4py6n: BACKLOG: **Invariant Support** - Must extend address collection logic to index spend invariants and mint invariants from charter data. Currently throws error "TODO: support for invariants" when invariants are present in charter.
 - **REQT-1.5.2**/znrywk1gdf: BACKLOG: **UUT Change History Tracking** - Must implement `UutChanges` table in storage schema to track full change history for each UUT. Must store transaction output ID, input UTXO ID reference, and output datum for each UUT state change. Enables historical analysis and audit trails.
 - **REQT-1.5.3**/zzsg63b2fb: BACKLOG: **Automated Periodic Refresh** - Must implement timer-based refresh using defined intervals (`refreshInterval` 60 seconds for transaction monitoring, `delegateRefreshInterval` 3600 seconds for charter refresh). Must trigger `monitorForNewTransactions()` on refresh interval. Must trigger charter refresh and `updateMonitoredAddresses()` on delegate refresh interval.
 - **REQT-1.5.4**/0aewmbbfct: BACKLOG: **Pagination for High-Volume Addresses** - Must handle cases where `addresses/{address}/transactions` endpoint returns 100+ results in single monitoring cycle. Must implement pagination strategy to fetch additional pages when response count equals limit. Currently throws error when exceeding 100 transactions.
 - **REQT-1.5.5**/50zkk5xgrx: BACKLOG: **Query API Methods** - Must provide public query interface for indexed UTXOs. Must implement `queryUtxosByAddress(address)`, `queryUtxosByAsset(mph, tokenName?)`, `queryUtxosByDelegateRole(role)`, and `queryUtxoById(utxoId)`. Must support filtering, pagination, and sorting options.

### REQT-1.6/x36f9fvmk3: DEPRECATED: **Legacy Delegate-Aware Architecture**

#### Purpose
Documents the original delegate-specific indexing approach that has been superseded by address-based monitoring. Applied when understanding migration history or investigating why certain code was removed.

 - **REQT-1.6.1**/tb96sarase: DEPRECATED: **Direct Delegate UUT Indexing** - DEPRECATED: Previously implemented `indexDelegateUuts()` that directly traversed charter and fetched each delegate's authority token. Replaced by generic address collection in REQT/k0mnv27tz4 (Address Collection from Charter).
 - **REQT-1.6.2**/0kh5h3yspc: DEPRECATED: **DelegateMustFindAuthorityToken Integration** - DEPRECATED: Previously used `fetchAndIndexDelegateUut()` calling delegate's `DelegateMustFindAuthorityToken(findCached: false)`. Replaced by address-based UTXO fetching in REQT/k0mnv27tz4.
 - **REQT-1.6.3**/z6b09nvxcm: DEPRECATED: **TxInput-Based UTXO Indexing** - DEPRECATED: Previously implemented `indexUtxoFromTxInput()` to fetch UTXO details given a TxInput from delegate resolution. No longer needed with address-based approach where all UTXOs are fetched via address queries.

### Component: UtxoStoreGeneric Interface

#### Overview
Defines the contract for storage backends, allowing the indexer to work with different storage strategies (Dexie, memory, future: Dred).

### REQT-2.1/pg6g84g7kg: COMPLETED: **Storage Interface Contract**

#### Purpose
Establishes the abstraction layer for storage backends. Applied when implementing new storage strategies, modifying storage operations, or understanding the data persistence contract.

 - **REQT-2.1.1**/nhbqmacrwn: COMPLETED: **Interface Methods** - Must define `UtxoStoreGeneric` interface with methods: `log()`, `findBlockByBlockId()`, `saveBlock()`, `findUtxoByUtxoId()`, `saveUtxo()`, `findTxById()`, `saveTx()`
 - **REQT-2.1.2**/bq0ammh636: COMPLETED: **Type Definitions** - Must define `txCBOR` type with `txid` and `cbor` fields. Must use `BlockDetailsType` and `UtxoDetailsType` from blockfrostTypes.

### Component: DexieUtxoStore Class

#### Overview
Dexie-based implementation of `UtxoStoreGeneric` providing persistent browser storage using IndexedDB.

### REQT-3.1/dbwnqvqwa1: COMPLETED: **Dexie Database Schema & Initialization**

#### Purpose
Defines the IndexedDB schema and entity mappings for the Dexie storage backend. Applied when modifying database structure, adding tables, or changing indexes.

 - **REQT-3.1.1**/6h4f158gvs: COMPLETED: **Database Definition** - Must extend Dexie with database name "StellarDappIndex-v0.1". Must define version 2 schema with tables: `blocks` (hash, height), `utxos` (utxoId, blockId, blockHeight), `txs` (txid), `logs` (logId, [pid,time]), `monitoredAddresses` (address, active, lastSyncedBlock).
 - **REQT-3.1.2**/exv4s020a0: COMPLETED: **Entity Mapping** - Must map `blocks` table to `dexieBlockDetails` class, `utxos` table to `dexieUtxoDetails` class, `logs` table to `indexerLogs` class.

### REQT-3.2/754gq4cbqk: COMPLETED: **Logging & Process Management**

#### Purpose
Governs the structured logging system for debugging and UI inspection. Applied when implementing or debugging indexer operations, or building monitoring dashboards.

 - **REQT-3.2.1**/cm9ez5thxz: COMPLETED: **Process ID Management** - Must implement `init()` to find maximum pid in logs table and assign next pid. Must handle concurrent initialization attempts.
 - **REQT-3.2.2**/p7ryk4ztes: COMPLETED: **Logging Implementation** - Must implement `log()` to create log entries with pid, timestamp, call stack location (extracted from Error stack), and message. Must use logId as primary key. Must support UI inspection of logs via Dexie queries.

### REQT-3.3/pdctymd7yj: COMPLETED: **Data Storage Operations**

#### Purpose
Implements CRUD operations for blocks, UTXOs, and transactions. Applied when reading or modifying storage access patterns or adding new query methods.

 - **REQT-3.3.1**/76e18y06kp: COMPLETED: **Block Storage** - Must implement `findBlockByBlockId()` using Dexie query on hash index. Must implement `saveBlock()` using Dexie put operation.
 - **REQT-3.3.2**/1gw45sp198: COMPLETED: **UTXO Storage** - Must implement `findUtxoByUtxoId()` using Dexie query on utxoId index. Must implement `saveUtxo()` using Dexie put operation.
 - **REQT-3.3.3**/nm2ed7m80y: COMPLETED: **Transaction Storage** - Must implement `findTxById()` using Dexie query on txid index. Must implement `saveTx()` using Dexie put operation.
 - **REQT-3.3.4**/cchf3wgnk3: COMPLETED: **Address Storage** - Must implement `findAddressByAddress()`, `saveAddress()`, and `getActiveAddresses()` using Dexie queries on address and active indexes.

### REQT-3.4/z7ykwww22z: BACKLOG: **Alternative Storage Backends**

#### Purpose
Documents planned alternative storage implementations. Applied when evaluating storage strategies or implementing non-Dexie backends.

 - **REQT-3.4.1**/pd0vdphpmp: BACKLOG: **Memory Store Implementation** - Must implement `MemoryUtxoStore` class for in-memory storage (currently throws "Memory strategy not implemented").
 - **REQT-3.4.2**/7h35vgvw4a: BACKLOG: **Dred Store Implementation** - Must implement `DredUtxoStore` class for Dred-based storage (currently throws "Dred strategy not implemented").

### Component: Blockfrost Type Definitions

#### Overview
Type definitions and validation factories for Blockfrost API responses, ensuring type safety and runtime validation.

### REQT-4.1/dee8dgbdxg: COMPLETED: **API Response Type Validation**

#### Purpose
Ensures type safety for all Blockfrost API responses through ArkType validation factories. Applied when adding new API endpoints, debugging validation errors, or modifying response handling.

 - **REQT-4.1.1**/7t6c1zwp0p: COMPLETED: **BlockDetails Type** - Must define `BlockDetailsType` and `BlockDetailsFactory` using ArkType. Must match Blockfrost block response schema with all required fields (time, height, hash, slot, epoch, epoch_slot, slot_leader, size, tx_count, output, fees, block_vrf, op_cert, op_cert_counter, previous_block, next_block, confirmations).
 - **REQT-4.1.2**/74vphrcgps: COMPLETED: **UtxoDetails Type** - Must define `UtxoDetailsType` and `UtxoDetailsFactory` using ArkType scope. Must parse quantity strings as numbers. Must match Blockfrost UTXO response schema (address, tx_hash, tx_index, output_index, amount[], block, data_hash, inline_datum, reference_script_hash).
 - **REQT-4.1.3**/733a8vgnxd: COMPLETED: **AddressTransactionSummaries Type** - Must define `AddressTransactionSummariesType` and `AddressTransactionSummariesFactory` using ArkType. Must match Blockfrost transaction summary schema (tx_hash, tx_index, block_height, block_time).

### Component: Dexie Record Types

#### Overview
Dexie Entity classes that implement the Blockfrost types with additional Dexie-specific fields and computed properties.

### REQT-5.1/nra8tvh4zt: COMPLETED: **Dexie Entity Classes**

#### Purpose
Defines Dexie Entity classes for type-safe storage with computed properties. Applied when modifying database entity structure or adding new computed fields.

 - **REQT-5.1.1**/dzx5harnk4: COMPLETED: **dexieBlockDetails Class** - Must extend Dexie Entity and implement `BlockDetailsType`. Must provide computed properties `blockId` (returns hash) and `blockHeight` (returns height).
 - **REQT-5.1.2**/gbzxxv71m8: COMPLETED: **dexieUtxoDetails Class** - Must extend Dexie Entity and implement `UtxoDetailsType`. Must include `utxoId` field as primary key.
 - **REQT-5.1.3**/cj6nm0mpm1: COMPLETED: **indexerLogs Class** - Must extend Dexie Entity and implement `LogType` with fields: logId, pid, time, location, message.

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
UTXO IDs are constructed as `${txHash}#${outputIndex}` to uniquely identify each UTXO. This format matches the Helios `TxInput.id` format and is used consistently throughout the indexer.

### Delegate Resolution Strategy
The indexer uses the Capo's delegate resolution methods (`getMintDelegate()`, `getSpendDelegate()`, `findGovDelegate()`, `getOtherNamedDelegate()`, `getDgDataController()`) to obtain delegate instances, then calls `DelegateMustFindAuthorityToken()` with `findCached: false` to ensure fresh network fetches. The `findCached: false` option (also known as UNCACHED hint) bypasses any existing cache and forces a network fetch, ensuring the index always reflects the current on-chain state. This sets the stage for future optimization where the indexer can use cached values for fast lookups while still supporting explicit network fetches when needed.

### Block Height Tracking
The indexer maintains `lastBlockHeight` and `lastBlockId` to track the most recent block seen. This is used to determine the starting point for transaction monitoring. When fetching block details, the indexer first checks the local cache before making API calls.

### Error Handling
The indexer handles missing delegates gracefully by catching errors and logging warnings, allowing processing to continue. API errors are logged with context and re-thrown with descriptive messages. Validation errors from ArkType factories are caught and logged before re-throwing.

### Pagination Strategy
The `fetchUtxosFromAddress()` method (currently unused, throws "unused?" error) implements a pagination strategy with a growth factor of 1.6 for page sizes (20, 32, 51, 81, 100). This is designed to efficiently fetch large numbers of UTXOs while respecting API rate limits. The method is not currently called by the indexer, which instead uses `capo.findCapoUtxos()` for initial sync and `monitorForNewTransactions()` for incremental updates.

## Implementation Log

### Phase 1: Foundation (Completed)
* Implemented `CachedUtxoIndex` class with constructor, initialization, and basic sync logic
* Established `UtxoStoreGeneric` interface and `DexieUtxoStore` implementation
* Created Blockfrost type definitions with ArkType validation factories
* Implemented Dexie record classes for type-safe storage
* Added structured logging system with process ID tracking

### Phase 2: Core Indexing (Completed)
* Implemented `syncNow()` to fetch capo UTXOs and resolve charter
* Implemented `indexDelegateUuts()` to resolve and index all delegate UUTs
* Implemented `fetchAndIndexDelegateUut()` using delegate resolution methods
* Implemented `indexUtxoFromTxInput()` to fetch and store UTXO details from Blockfrost
* Implemented block management methods (`fetchAndStoreLatestBlock()`, `findOrFetchBlockHeight()`)
* Implemented transaction fetching with caching (`findOrFetchTxDetails()`)

### Phase 3: Transaction Monitoring (Completed)
* Implemented `monitorForNewTransactions()` to watch for new transactions at capo address
* Implemented `processTransactionForNewUtxos()` to identify and index new UTXOs
* Implemented `indexUtxoFromOutput()` to convert Helios outputs to Blockfrost format
* Added validation for transaction summaries using `AddressTransactionSummariesFactory`

### Phase 4: Blockfrost Integration (Completed)
* Implemented `fetchFromBlockfrost()` with proper error handling and logging
* Implemented `convertValueToBlockfrostAmount()` to convert Helios Value to Blockfrost format
* Implemented `getBlockHashFromHeight()` to resolve block hashes
* Added comprehensive logging for all API operations

### Phase 5: Delegate Resolution & Charter Traversal (Completed)
* Refactored to use delegates' normal `DelegateMustFindAuthorityToken()` methods instead of custom resolution
* Added support for UNCACHED hint (`findCached: false`) in utxo-finding code paths, allowing explicit network fetches while using standard helper functions
* Enhanced `indexDelegateUuts()` to traverse all charter-discovered delegate links including gov authority, other named delegates, and dgData controllers
* Improved error handling with graceful degradation when delegates are missing

### Phase 6: Logging Enhancements (Completed)
* Enhanced logging system to support UI inspection of indexer logs
* Added structured logging with unique log IDs, process IDs, timestamps, and call stack locations
* Implemented process ID management to track separate indexer sessions
* Added logging throughout all major operations (initialization, fetches, delegate resolution, errors)

#### Next Recommendations

The UtxoIndex is now functional for initial synchronization and basic monitoring. Immediate next steps to enhance functionality:

1. **Periodic Refresh**: Implement automatic periodic refresh using the defined intervals (`refreshInterval`, `delegateRefreshInterval`)
2. **Invariant Support**: Complete implementation for indexing spend and mint invariants
3. **UUT Change History**: Implement `UutChanges` table to track change history for each UUT
4. **Fast Transaction Discovery**: Handle cases where more than 100 transactions are found in a monitoring cycle
5. **Query Methods**: Add public methods to query UTXOs by various criteria (type, delegate, asset class)
6. **Alternative Storage**: Implement memory and Dred storage strategies
7. **Error Recovery**: Add retry logic and better error recovery for network failures

### Phase 7: Address-Based Architecture (Completed)
* Refactored from delegate-aware indexer to generic address-based monitoring
* Implemented `MonitoredAddress` data structure with health tracking
* Added `updateMonitoredAddresses()` to extract addresses from charter
* Implemented charter change detection via `mph.charter` token monitoring
* Added per-address sync state tracking (`lastSyncedBlock`, `lastSuccessfulSync`, `lastError`)
* Updated Dexie schema to v2 with `monitoredAddresses` table

## Release Management Plan

### v1 (Current)
 - **Goal**: Functional Address-Based UTXO Indexer
 - **Criteria**:
    - Core indexer architecture with address-based monitoring (REQT/vxdc27201y)
    - Address management and charter tracking (REQT/y034z487y5)
    - Synchronization and monitoring loops (REQT/3zx9pcggch)
    - Blockfrost API integration (REQT/k3xfpg6jkb)
    - Dexie storage backend (REQT/dbwnqvqwa1, REQT/pdctymd7yj)
    - Type validation for API responses (REQT/dee8dgbdxg)

### v2 (Planned)
 - **Goal**: Production-Ready with Query API
 - **Criteria**:
    - Automated periodic refresh (REQT/zzsg63b2fb)
    - Public query API methods (REQT/50zkk5xgrx)
    - Pagination for high-volume addresses (REQT/0aewmbbfct)
    - Invariant support (REQT/jz6zf4py6n)

### v3 (Future)
 - **Goal**: Multi-Backend Storage Support
 - **Criteria**:
    - Memory store implementation (REQT/pd0vdphpmp)
    - Dred store implementation (REQT/7h35vgvw4a)
    - UUT change history tracking (REQT/znrywk1gdf)
