## About the UtxoIndex

The UtxoIndex provides a persistent, efficient cache of UTXOs (Unspent Transaction Outputs) needed for interacting with a specific Capo instance. This includes the charter token, delegate UUTs (Unique Utility Tokens) referenced in the charter, and all delegated-data records stored at the capo address. The indexer monitors the blockchain for new transactions and maintains an up-to-date view of relevant UTXOs, reducing the need for repeated network queries and enabling fast lookups for application logic.

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
- **Incremental Updates**: Monitors the capo address for new transactions and incrementally updates the index
- **Type-Safe Validation**: Uses ArkType factories to validate all data from external APIs before storage
- **Delegate Resolution**: Automatically resolves and indexes delegate UUTs mentioned in the charter
- **Block Tracking**: Maintains block height and hash information for efficient querying and monitoring

#### Specific Goals

1. **Efficient UTXO Lookups**: Provide fast, local lookups for UTXOs by ID, address, or asset class without network calls
2. **Automatic Synchronization**: Monitor the capo address for new transactions and update the index automatically
3. **Delegate UUT Tracking**: Index all delegate authority tokens (mint delegate, spend delegate, gov authority, dgData controllers, etc.) referenced in the charter
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
   - MUST index mint delegate UUT using `capo.getMintDelegate()` and `DelegateMustFindAuthorityToken()`
   - MUST index spend delegate UUT using `capo.getSpendDelegate()` and `DelegateMustFindAuthorityToken()`
   - MUST index gov authority UUT using `capo.findGovDelegate()` and `DelegateMustFindAuthorityToken()`
   - MUST index other named delegates using `capo.getOtherNamedDelegate()` for each entry in `charterData.otherNamedDelegates`
   - MUST index dgData controller UUTs for each DgDataPolicy entry in the charter manifest
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
   - MUST support querying logs by process ID and time range
   - MUST log all significant operations (initialization, fetches, errors, state changes)

### 3. Blockfrost API Integration

#### Functional Requirements:

1. **API Client**:
   - MUST use Blockfrost REST API for all blockchain queries
   - MUST include Blockfrost project ID in request headers
   - MUST handle API errors gracefully with descriptive error messages
   - MUST log all API requests and responses for debugging

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
The core class that orchestrates UTXO indexing, delegate resolution, transaction monitoring, and block tracking. It coordinates between the Capo instance, Blockfrost API, and the storage backend.

#### Requirements

REQT-1.01: COMPLETED: **Constructor & Initialization** - Must accept `capo`, `blockfrostKey`, and optional `storeIn` strategy. Must determine Blockfrost base URL from API key prefix. Must initialize storage backend and trigger `syncNow()`.

REQT-1.02: COMPLETED: **Initial Sync** - Must implement `syncNow()` to fetch all capo UTXOs, extract transaction IDs, fetch transaction details, locate charter UTXO, fetch charter data, index delegate UUTs, and fetch latest block.

REQT-1.03: COMPLETED: **Transaction Monitoring** - Must implement `monitorForNewTransactions()` using Blockfrost `addresses/{address}/transactions` endpoint with `from` parameter based on `lastBlockHeight`. Must validate responses using `AddressTransactionSummariesFactory`.

REQT-1.04: COMPLETED: **UTXO Processing** - Must implement `processTransactionForNewUtxos()` to fetch full transaction, identify outputs containing capo policy tokens, check for existing UTXOs, and index new UTXOs.

REQT-1.05: COMPLETED: **UTXO Indexing** - Must implement `indexUtxoFromOutput()` to convert Helios `TxOutput` to `UtxoDetailsType`, extract datum information, fetch block hash from height, and store in database.

REQT-1.06: COMPLETED: **Delegate UUT Indexing** - Must implement `indexDelegateUuts()` to resolve and index all delegate UUTs from charter data, including mint delegate, spend delegate, gov authority, other named delegates, and dgData controllers.

REQT-1.07: COMPLETED: **Delegate UUT Fetching** - Must implement `fetchAndIndexDelegateUut()` using delegate's `DelegateMustFindAuthorityToken()` method with `findCached: false` to ensure network fetch.

REQT-1.08: COMPLETED: **UTXO from TxInput** - Must implement `indexUtxoFromTxInput()` to fetch full UTXO details from Blockfrost when given a `TxInput` from delegate resolution.

REQT-1.09: COMPLETED: **Block Management** - Must implement `fetchAndStoreLatestBlock()` to get latest block from Blockfrost and update `lastBlockId` and `lastBlockHeight`. Must implement `findOrFetchBlockHeight()` to resolve block height from block hash using cache or API.

REQT-1.10: COMPLETED: **Transaction Fetching** - Must implement `findOrFetchTxDetails()` to check store cache before fetching from Blockfrost. Must decode CBOR using Helios `decodeTx()`.

REQT-1.11: COMPLETED: **Blockfrost Client** - Must implement `fetchFromBlockfrost()` to make HTTP requests with proper headers, handle errors, and log requests/responses.

REQT-1.12: COMPLETED: **Value Conversion** - Must implement `convertValueToBlockfrostAmount()` to convert Helios `Value` objects to Blockfrost amount format (array of {unit, quantity}).

REQT-1.13: BACKLOG: **Invariant Support** - Must support indexing spend invariants and mint invariants from charter data (currently throws "TODO: support for invariants").

REQT-1.14: BACKLOG: **UUT Change History** - Must implement a `UutChanges` table to track change history for each UUT, storing tx-output id, input utxo id, and output datum.

REQT-1.15: BACKLOG: **Periodic Refresh** - Must implement periodic refresh intervals (currently constants defined but not used: `refreshInterval` 1 minute, `delegateRefreshInterval` 1 hour).

REQT-1.16: BACKLOG: **Fast Transaction Discovery** - Must handle cases where more than 100 transactions are found in a monitoring cycle (currently throws error).

REQT-1.17: BACKLOG: **UTXO Query Methods** - Must provide public methods to query UTXOs by type, by ID, by delegate, or by asset class.

### Component: UtxoStoreGeneric Interface

#### Overview
Defines the contract for storage backends, allowing the indexer to work with different storage strategies (Dexie, memory, future: Dred).

#### Requirements

REQT-2.01: COMPLETED: **Interface Definition** - Must define `UtxoStoreGeneric` interface with methods: `log()`, `findBlockByBlockId()`, `saveBlock()`, `findUtxoByUtxoId()`, `saveUtxo()`, `findTxById()`, `saveTx()`.

REQT-2.02: COMPLETED: **Type Definitions** - Must define `txCBOR` type with `txid` and `cbor` fields. Must use `BlockDetailsType` and `UtxoDetailsType` from blockfrostTypes.

### Component: DexieUtxoStore Class

#### Overview
Dexie-based implementation of `UtxoStoreGeneric` providing persistent browser storage using IndexedDB.

#### Requirements

REQT-3.01: COMPLETED: **Dexie Database** - Must extend Dexie with database name "StellarDappIndex-v0.1". Must define version 1 schema with tables: `blocks` (hash, height), `utxos` (utxoId, blockId, blockHeight), `txs` (txid), `logs` (logId, [pid,time]).

REQT-3.02: COMPLETED: **Entity Mapping** - Must map `blocks` table to `dexieBlockDetails` class, `utxos` table to `dexieUtxoDetails` class, `logs` table to `indexerLogs` class.

REQT-3.03: COMPLETED: **Process ID Management** - Must implement `init()` to find maximum pid in logs table and assign next pid. Must handle concurrent initialization attempts.

REQT-3.04: COMPLETED: **Logging Implementation** - Must implement `log()` to create log entries with pid, timestamp, call stack location, and message. Must use logId as primary key.

REQT-3.05: COMPLETED: **Block Storage** - Must implement `findBlockByBlockId()` using Dexie query on hash index. Must implement `saveBlock()` using Dexie put operation.

REQT-3.06: COMPLETED: **UTXO Storage** - Must implement `findUtxoByUtxoId()` using Dexie query on utxoId index. Must implement `saveUtxo()` using Dexie put operation.

REQT-3.07: COMPLETED: **Transaction Storage** - Must implement `findTxById()` using Dexie query on txid index. Must implement `saveTx()` using Dexie put operation.

REQT-3.08: BACKLOG: **Memory Store Implementation** - Must implement `MemoryUtxoStore` class for in-memory storage (currently throws "Memory strategy not implemented").

REQT-3.09: BACKLOG: **Dred Store Implementation** - Must implement `DredUtxoStore` class for Dred-based storage (currently throws "Dred strategy not implemented").

### Component: Blockfrost Type Definitions

#### Overview
Type definitions and validation factories for Blockfrost API responses, ensuring type safety and runtime validation.

#### Requirements

REQT-4.01: COMPLETED: **BlockDetails Type** - Must define `BlockDetailsType` and `BlockDetailsFactory` using ArkType. Must match Blockfrost block response schema with all required fields.

REQT-4.02: COMPLETED: **UtxoDetails Type** - Must define `UtxoDetailsType` and `UtxoDetailsFactory` using ArkType scope. Must parse quantity strings as numbers. Must match Blockfrost UTXO response schema.

REQT-4.03: COMPLETED: **AddressTransactionSummaries Type** - Must define `AddressTransactionSummariesType` and `AddressTransactionSummariesFactory` using ArkType. Must match Blockfrost transaction summary schema.

### Component: Dexie Record Types

#### Overview
Dexie Entity classes that implement the Blockfrost types with additional Dexie-specific fields and computed properties.

#### Requirements

REQT-5.01: COMPLETED: **dexieBlockDetails Class** - Must extend Dexie Entity and implement `BlockDetailsType`. Must provide computed properties `blockId` (returns hash) and `blockHeight` (returns height).

REQT-5.02: COMPLETED: **dexieUtxoDetails Class** - Must extend Dexie Entity and implement `UtxoDetailsType`. Must include `utxoId` field as primary key.

REQT-5.03: COMPLETED: **indexerLogs Class** - Must extend Dexie Entity and implement `LogType` with fields: logId, pid, time, location, message.

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
The indexer uses the Capo's delegate resolution methods (`getMintDelegate()`, `getSpendDelegate()`, etc.) to obtain delegate instances, then calls `DelegateMustFindAuthorityToken()` with `findCached: false` to ensure fresh network fetches. This ensures the index always reflects the current on-chain state.

### Block Height Tracking
The indexer maintains `lastBlockHeight` and `lastBlockId` to track the most recent block seen. This is used to determine the starting point for transaction monitoring. When fetching block details, the indexer first checks the local cache before making API calls.

### Error Handling
The indexer handles missing delegates gracefully by catching errors and logging warnings, allowing processing to continue. API errors are logged with context and re-thrown with descriptive messages. Validation errors from ArkType factories are caught and logged before re-throwing.

### Pagination Strategy
The `fetchUtxosFromAddress()` method (currently unused) implements a pagination strategy with a growth factor of 1.6 for page sizes (20, 32, 51, 81, 100). This is designed to efficiently fetch large numbers of UTXOs while respecting API rate limits.

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

#### Next Recommendations

The UtxoIndex is now functional for initial synchronization and basic monitoring. Immediate next steps to enhance functionality:

1. **Periodic Refresh**: Implement automatic periodic refresh using the defined intervals (`refreshInterval`, `delegateRefreshInterval`)
2. **Invariant Support**: Complete implementation for indexing spend and mint invariants
3. **UUT Change History**: Implement `UutChanges` table to track change history for each UUT
4. **Fast Transaction Discovery**: Handle cases where more than 100 transactions are found in a monitoring cycle
5. **Query Methods**: Add public methods to query UTXOs by various criteria (type, delegate, asset class)
6. **Alternative Storage**: Implement memory and Dred storage strategies
7. **Error Recovery**: Add retry logic and better error recovery for network failures

