# Test Plan A: Functions Not Used During Sync

These functions operate independently of the initial sync process and can be tested using the shared synced index or isolated databases without needing to mock sync behavior.

## Implementation Status

| Function | Test Case | Status |
|----------|-----------|--------|
| `checkForNewTxns` | No new transactions | ✅ Done |
| `checkForNewTxns` | Zero block height error | ✅ Done |
| `checkForNewTxns` | Incrementally loads txs | ✅ Done |
| `checkForNewTxns` | Honors page size limits | ✅ Done |
| `checkForNewTxns` | Fetches multiple pages | ✅ Done |
| `getTx` | Cached transaction | ✅ Done |
| `getTx` | Cache miss | ✅ Done |
| `getUtxo` | Cached UTXO | ✅ Done |
| `getUtxos` | Capo address | ✅ Done |
| `getUtxosWithAssetClass` | Charter token | ✅ Done |
| `restoreTxInputs` | Cached inputs | ✅ Done |
| `fetchAndCacheScript` | Valid script | ⏳ Not started |
| `fetchAndCacheScript` | Cached script | ⏳ Not started |
| `fetchAndCacheScript` | Invalid hash | ⏳ Not started |
| `fetchBlockDetails` | By hash | ✅ Done |
| `fetchTxDetails` | Valid txId | ✅ Done |

## Workflow Loop: REQUIRED

The agent MUST use the workflow described in ./TestingWorkflow.md.

## Test Helpers: REQUIRED

Import and use helpers from `./CachedUtxoIndex.testHelpers.ts`. The file contains detailed usage patterns in its header documentation.

## Required Imports

Add to the existing imports at the top of the test file:

```typescript
import { vi } from "vitest";
```

## Existing Helpers (from testHelpers.ts)

| Helper | Purpose |
|--------|---------|
| `getStore(index)` | Access internal DexieUtxoStore for verification |
| `getAllBlocks(index)` | Get all cached blocks |
| `getAllTxs(index)` | Get all cached transactions |
| `getUtxosFromTx(index, txHash)` | Get UTXOs created by a specific tx |
| `setLastSyncedBlock(index, height, id, slot)` | Simulate partially synced state |
| `copyIndexData(source, target)` | Copy all data between indexes |
| `copyIndexDataUpToBlock(source, target, maxHeight)` | Copy partial data |
| `deleteUtxo(index, utxoId)` | Remove specific UTXO from cache |
| `deleteTx(index, txId)` | Remove specific tx from cache |
| `createDbCleanupRegistry()` | Track isolated DBs for cleanup |

## New Helpers Needed

```typescript
// Find the most recent block and a transaction within it
findMostRecentTxAndBlock(index: CachedUtxoIndex): Promise<{
    txId: string;
    blockHeight: number;
    blockHash: string;
}>

// Find a UTXO that has a reference script (if any exist)
findUtxoWithReferenceScript(index: CachedUtxoIndex): Promise<UtxoIndexEntry | undefined>

// Find the block where the charter token was minted (via Blockfrost asset history)
// Uses: GET /assets/{policy_id}{asset_name}/history
// Example asset: 6b413535...63686172746572 (mph + hex "charter")
findCharterMintBlock(index: CachedUtxoIndex): Promise<{
    blockHeight: number;
    txHash: string;
}>

// Create an isolated index synced only to the first block (charter mint block)
// Encapsulates: find charter mint block, create index, sync only that block's txns
createFirstBlockOnlyIndex(
    baseConfig: BaseConfig,
    sharedIndex: CachedUtxoIndex,
    options?: { syncPageSize?: number; maxSyncPages?: number }
): Promise<{
    index: CachedUtxoIndex;
    charterMintBlock: { blockHeight: number; txHash: string };
    dbName: string;  // for cleanup registration
}>
```

## Shared Config Pattern

Create a reusable config object to reduce repetition when creating isolated indexes:

```typescript
// Inside the main describe block, after sharedIndex declaration:
const baseConfig = {
    address: TEST_CAPO_ADDRESS,
    mph: TEST_CAPO_MPH,
    isMainnet: false,
    network,
    bridge,
    blockfrostKey: BLOCKFROST_API_KEY,
    storeIn: "dexie" as const,
};
```

## Overview

These tests exercise functionality that runs **after** initial sync completes, primarily:
- Transaction monitoring (`checkForNewTxns`)
- ReadonlyCardanoClient interface methods
- TxInput restoration
- Direct fetch operations (bypassing cache)

## Functions to Test

### 1. `checkForNewTxns(fromBlockHeight?)` ✅ Done

**Location:** `CachedUtxoIndex.ts:270`

**Purpose:** Monitors for new transactions at the capo address after initial sync.

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| No new transactions | Returns cleanly when no new txns exist | Call with current `lastBlockHeight + 1` |
| With new transactions | Processes and indexes new UTXOs | Would need actual new tx (hard to control) |
| Zero block height error | Throws when `lastBlockHeight` is 0 and no param | Create fresh index, don't sync, call method |
| Empty response handling | Handles empty array from Blockfrost | Use very high block height |

**Implementation Notes:**
- Use shared index for "no new transactions" test
- Zero block height test needs isolated DB without sync

```typescript
describe("checkForNewTxns (uses shared index)", () => {
    it("should return cleanly when no new transactions exist", async () => {
        // Call with block height beyond current - should find nothing
        const futureHeight = sharedIndex.lastBlockHeight + 1000;
        await expect(sharedIndex.checkForNewTxns(futureHeight)).resolves.toBeUndefined();
    });

    it("should throw when lastBlockHeight is 0 and no param provided", async () => {
        const dbName = createIsolatedDbName("check-no-sync");
        const index = new CachedUtxoIndex({...baseConfig, dbName});
        // Don't call syncNow - lastBlockHeight remains 0
        //! calling checkForNewTxns() should throw "block height 0"
    });

    it("incrementally loads txs in most recent block", async () => {
        // Find the most recent tx and its block
        const { txId, blockHeight, blockHash } = await findMostRecentTxAndBlock(sharedIndex);

        // Create isolated index with all data except the most recent tx
        const dbName = createIsolatedDbName("incremental-sync");
        const isolatedIndex = new CachedUtxoIndex({...baseConfig, dbName});
        await copyIndexData(sharedIndex, isolatedIndex);
        await deleteTx(isolatedIndex, txId);
        setLastSyncedBlock(isolatedIndex, previousBlockHeight, previousBlockHash, previousSlot);

        //! verify tx is NOT in isolated index before sync

        await isolatedIndex.checkForNewTxns();

        //! verify tx IS now in isolated index after sync
    });

    it("honors the page size limits during syncing", async () => {
        // Create index synced only to first block (charter mint), with limited page size
        const { index: isolatedIndex, dbName } = await createFirstBlockOnlyIndex(
            baseConfig,
            sharedIndex,
            { syncPageSize: 4, maxSyncPages: 1 }
        );
        const txCountBefore = await getAllTxs(isolatedIndex);

        await isolatedIndex.checkForNewTxns();

        //! verify at most 4 new transactions were processed (one page limit)
    });

    it("fetches multiple pages during syncing", async () => {
        // Create index synced only to first block, with pageSize=4, maxPages=1
        const { index: isolatedIndex, dbName } = await createFirstBlockOnlyIndex(
            baseConfig,
            sharedIndex,
            { syncPageSize: 4, maxSyncPages: 1 }
        );

        await isolatedIndex.checkForNewTxns();
        const txCountAfterOnePage = await getAllTxs(isolatedIndex);

        // Now allow 3 pages and sync again
        isolatedIndex.maxSyncPages = 3;
        await isolatedIndex.checkForNewTxns();
        const txCountAfterThreePages = await getAllTxs(isolatedIndex);

        //! verify more transactions were fetched with increased page limit
        //! (txCountAfterThreePages > txCountAfterOnePage)
    });
});
```

---

### 2. `getTx(id: TxId)` ✅ Done

**Location:** `CachedUtxoIndex.ts:975`

**Purpose:** Retrieves transaction by ID (ReadonlyCardanoClient interface).

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| Cached transaction | Returns tx from cache | Use txId from synced UTXOs |
| Cache miss | Fetches from network | Use txId not in cache |

**Implementation Notes:**
- Extract txId from a known UTXO's `utxoId.split("#")[0]`
- For cache miss, need a valid preprod txId not associated with the capo

```typescript
describe("getTx (uses shared index)", () => {
    it("should return cached transaction", async () => {
        const utxos = await sharedIndex.getAllUtxos();
        const txHash = utxos[0].utxoId.split("#")[0];
        const { makeTxId } = await import("@helios-lang/ledger");

        //! spy on fetchFromBlockfrost
        const tx = await sharedIndex.getTx(makeTxId(txHash));
        expect(tx).toBeTruthy();
        expect(tx.id().toHex()).toBe(txHash);
        //! the spy should NOT have been called (cache hit)
    });

    it("should fetch from network on cache miss", async () => {
        const utxos = await sharedIndex.getAllUtxos();
        const txHash = utxos[0].utxoId.split("#")[0];
        const { makeTxId } = await import("@helios-lang/ledger");

        //! create an isolated index with baseConfig (no data copied)
        //! use deleteTx to ensure tx is not in isolated cache

        //! spy on fetchFromBlockfrost on the isolated index
        const tx = await isolatedIndex.getTx(makeTxId(txHash));
        expect(tx).toBeTruthy();
        expect(tx.id().toHex()).toBe(txHash);
        //! the spy SHOULD have been called (cache miss -> network fetch)
    });
});
```

---

### 3. `getUtxo(id: TxOutputId)` ✅ Done

**Location:** `CachedUtxoIndex.ts:1108`

**Purpose:** Retrieves single UTXO by output ID (ReadonlyCardanoClient interface).

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| Cached UTXO | Returns TxInput from cache | Use known utxoId |
| Cache miss fallback | Falls back to network | Use valid but non-indexed utxoId |

```typescript
describe("getUtxo (uses shared index)", () => {
    it("should return TxInput for cached UTXO", async () => {
        const entries = await sharedIndex.getAllUtxos();
        const [txHash, idx] = entries[0].utxoId.split("#");
        const { makeTxOutputId, makeTxId } = await import("@helios-lang/ledger");

        const utxoId = makeTxOutputId(makeTxId(txHash), parseInt(idx));
        const txInput = await sharedIndex.getUtxo(utxoId);

        expect(txInput).toBeTruthy();
        expect(txInput.id.toString()).toBe(entries[0].utxoId);
        
        //! test it has some value in it
    });
});
```

---

### 4. `getUtxos(address: Address)` ✅ Done

**Location:** `CachedUtxoIndex.ts:1126`

**Purpose:** Retrieves all UTXOs at address as `TxInput[]` (ReadonlyCardanoClient interface).

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| Capo address | Returns TxInput array for capo | Use `TEST_CAPO_ADDRESS` |
| Non-indexed address | Falls back to network | Use different preprod address |

```typescript
describe("getUtxos (uses shared index)", () => {
    it("should return TxInput array for capo address", async () => {
        const { makeAddress } = await import("@helios-lang/ledger");
        const addr = makeAddress(TEST_CAPO_ADDRESS);

        const txInputs = await sharedIndex.getUtxos(addr);
        expect(txInputs.length).toBeGreaterThan(0);
        expect(txInputs[0].address.toBech32()).toBe(TEST_CAPO_ADDRESS);
    });
});
```

---

### 5. `getUtxosWithAssetClass(address, assetClass)` ✅ Done

**Location:** `CachedUtxoIndex.ts:1146`

**Purpose:** Retrieves UTXOs containing specific asset (ReadonlyCardanoClient interface).

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| Charter token | Finds UTXO with charter asset | Use capo mph + "charter" |
| No matches | Returns empty or falls back | Use non-existent asset |

```typescript
describe("getUtxosWithAssetClass (uses shared index)", () => {
    it("should find UTXOs with charter token", async () => {
        const { makeAddress, makeAssetClass } = await import("@helios-lang/ledger");
        const addr = makeAddress(TEST_CAPO_ADDRESS);
        const charterAsset = makeAssetClass(TEST_CAPO_MPH, "charter");

        const txInputs = await sharedIndex.getUtxosWithAssetClass(addr, charterAsset);
        expect(txInputs.length).toBeGreaterThan(0);
        
        //! sets up a first-block-only isolated index
        //! fetches the charter utxo from that index
        //! it should be different from the one in the shared index
        //! both should have the same value
    });
});
```

---

### 6. `restoreTxInputs(tx: Tx)` ✅ Done

**Location:** `CachedUtxoIndex.ts:1026`

**Purpose:** Restores full TxInput data for all inputs in a transaction.

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| Cached inputs | Restores from cache | Use tx whose inputs are indexed |
| Mixed cached/uncached | Falls back for uncached | May need specific tx |

```typescript
describe("restoreTxInputs (uses shared index)", () => {
    it("should restore TxInputs from cached UTXOs", async () => {
        // Get a transaction that was indexed
        const utxos = await sharedIndex.getAllUtxos();
        const txHash = utxos[0].utxoId.split("#")[0];
        const { makeTxId } = await import("@helios-lang/ledger");

        //! mock implicit restoral
        
        const tx = await sharedIndex.getTx(makeTxId(txHash));
        
        //! check it's not restored
        const restoredInputs = await sharedIndex.restoreTxInputs(tx);
        
        // Each restored input should have address and value
        for (const input of restoredInputs) {
            expect(input.address).toBeTruthy();
            expect(input.value).toBeTruthy();
        }

        //! clear mock

        const tx2 = await sharedIndex.getTx(makeTxId(txHash));
        
        //! check the inputs are implicitly restored
    });
});
```

---

### 7. `fetchAndCacheScript(scriptHash)`

**Location:** `CachedUtxoIndex.ts:938`

**Purpose:** Fetches and caches reference scripts by hash.

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| Valid script | Fetches and caches | Need UTXO with reference script |
| Cached script | Returns from cache | Call twice with same hash |
| Invalid hash | Returns undefined | Use non-existent hash |

**Implementation Notes:**
- Find a UTXO with `referenceScriptHash` in the indexed data
- If none exist, test with a known preprod script hash

---

### 8. `fetchBlockDetails(blockId)` ✅ Done

**Location:** `CachedUtxoIndex.ts:890`

**Purpose:** Direct Blockfrost call for block details (no cache check).

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| By hash | Fetches block by hash | Use `lastBlockId` |
| By height | Fetches block by height | Use `lastBlockHeight` |

```typescript
describe("fetchBlockDetails (uses shared index)", () => {
    it("should fetch block by hash", async () => {
        const blockHash = sharedIndex.lastBlockId;
        const details = await sharedIndex.fetchBlockDetails(blockHash);

        expect(details.hash).toBe(blockHash);
        expect(details.height).toBe(sharedIndex.lastBlockHeight);
    });
});
```

---

### 9. `fetchTxDetails(txId)` ✅ Done

**Location:** `CachedUtxoIndex.ts:997`

**Purpose:** Direct Blockfrost call for tx CBOR (no cache check).

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| Valid txId | Fetches and decodes | Use known txId from UTXOs |

---

## Test File Structure

```typescript
// In CachedUtxoIndex.test.ts, add new describe blocks:

describe("Post-Sync Operations (uses shared index)", () => {
    describe("checkForNewTxns", () => { ... });
    describe("getTx", () => { ... });
    describe("getUtxo", () => { ... });
    describe("getUtxos", () => { ... });
    describe("getUtxosWithAssetClass", () => { ... });
    describe("restoreTxInputs", () => { ... });
    describe("fetchBlockDetails", () => { ... });
    describe("fetchTxDetails", () => { ... });
});

describe("Script Caching (uses shared index)", () => {
    describe("fetchAndCacheScript", () => { ... });
});
```

## Dependencies

- Shared synced index (from existing test setup)
- `@helios-lang/ledger` imports for type construction
- Test helpers from `./CachedUtxoIndex.testHelpers.ts`
- `vi` from vitest for spying on methods
- `createIsolatedDbName()` from main test file
