# Test Plan B: Functions Used During Sync, Testable Post-Sync

These functions are called during `syncNow()` but can be verified or exercised further using the shared synced index without needing to mock the sync process itself.

## Workflow Loop: REQUIRED

The agent MUST use the workflow described in ./TestingWorkflow.md.

## Test Helpers Available

Import from `./CachedUtxoIndex.testHelpers.ts`:

```typescript
import {
    setLastSyncedBlock,
    getStore,
    getAllBlocks,
    getAllTxs,
    copyIndexData,
    copyIndexDataUpToBlock,
    deleteUtxo,
    deleteTx,
    deleteUtxos,
    getUtxosFromTx,
    createDbCleanupRegistry,
} from "./CachedUtxoIndex.testHelpers.js";
```

**Key patterns:**
- Use `getStore(index)` instead of `index.store` for accessing the DexieUtxoStore
- Use `setLastSyncedBlock()` to simulate different sync states
- Use `copyIndexData()` to duplicate shared index data to isolated tests
- Use `createDbCleanupRegistry()` for managing test database cleanup

## Overview

These tests verify:
- Cache behavior (hit vs miss)
- Data conversion correctness (indirectly via stored data)
- Block/transaction management
- Re-invocable functions that were already called during sync

## Functions to Test

### 1. `findOrFetchTxDetails(txId)`

**Location:** `CachedUtxoIndex.ts:979`

**Purpose:** Retrieves transaction with cache-first strategy.

**Used During Sync:** Yes - fetches tx CBOR for each unique txId in capo UTXOs.

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| Cache hit | Returns from store without network call | Use txId already fetched during sync |
| Cache miss | Fetches from network, caches, returns | Use isolated index without tx cached |
| Verify caching | Second call uses cache | Call twice on isolated index |

**Implementation Notes:**
- For cache hit: any txId from synced UTXOs will be cached
- For cache miss: create isolated index, copy partial data, call with uncached txId
- Use `getStore(index).findTxId()` to verify cache state

```typescript
describe("findOrFetchTxDetails (uses shared index)", () => {
    it("should return cached transaction without network call", async () => {
        const utxos = await sharedIndex.getAllUtxos();
        const txHash = utxos[0].utxoId.split("#")[0];

        // This should be instant (cached)
        const start = Date.now();
        const tx = await sharedIndex.findOrFetchTxDetails(txHash);
        const elapsed = Date.now() - start;

        expect(tx).toBeTruthy();
        // Cached lookup should be very fast (< 50ms typically)
        expect(elapsed).toBeLessThan(50);
    });

    it("should verify tx is stored in cache", async () => {
        const utxos = await sharedIndex.getAllUtxos();
        const txHash = utxos[0].utxoId.split("#")[0];

        // Use test helper to access store
        const store = getStore(sharedIndex);
        const cached = await store.findTxId(txHash);
        expect(cached).toBeTruthy();
        expect(cached!.txid).toBe(txHash);
        expect(cached!.cbor).toBeTruthy();
    });

    it("should fetch and cache on miss (isolated)", async () => {
        // Create isolated index
        const dbName = createIsolatedDbName("tx-cache-miss");
        const isolatedIndex = new CachedUtxoIndex({...config, dbName});

        // Get a txId we know exists
        const utxos = await sharedIndex.getAllUtxos();
        const txHash = utxos[0].utxoId.split("#")[0];

        // Verify it's not cached in isolated index
        const store = getStore(isolatedIndex);
        const before = await store.findTxId(txHash);
        expect(before).toBeUndefined();

        // Fetch - should hit network
        const tx = await isolatedIndex.findOrFetchTxDetails(txHash);
        expect(tx).toBeTruthy();

        // Verify now cached
        const after = await store.findTxId(txHash);
        expect(after).toBeTruthy();
        expect(after!.cbor).toBeTruthy();

        // Cleanup
        await Dexie.delete(dbName);
    });
});
```

---

### 2. `findOrFetchBlockHeight(blockId)`

**Location:** `CachedUtxoIndex.ts:877`

**Purpose:** Resolves block height from hash, with caching.

**Used During Sync:** Not directly, but `fetchAndStoreLatestBlock()` stores block data.

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| Cached block | Returns height from store | Use `lastBlockId` (stored during sync) |
| Uncached block | Fetches, caches, returns height | Use isolated index or older block hash |

```typescript
describe("findOrFetchBlockHeight (uses shared index)", () => {
    it("should return height for cached block", async () => {
        const blockId = sharedIndex.lastBlockId;
        const height = await sharedIndex.findOrFetchBlockHeight(blockId);

        expect(height).toBe(sharedIndex.lastBlockHeight);
    });

    it("should fetch and cache uncached block", async () => {
        // Get the previous block hash from latest block details
        const latestBlock = await sharedIndex.fetchBlockDetails(sharedIndex.lastBlockId);
        if (latestBlock.previous_block) {
            const height = await sharedIndex.findOrFetchBlockHeight(latestBlock.previous_block);
            expect(height).toBe(sharedIndex.lastBlockHeight - 1);

            // Verify it's now cached using test helper
            const store = getStore(sharedIndex);
            const cached = await store.findBlockId(latestBlock.previous_block);
            expect(cached).toBeTruthy();
        }
    });

    it("should fetch on miss in isolated index", async () => {
        const dbName = createIsolatedDbName("block-cache-miss");
        const isolatedIndex = new CachedUtxoIndex({...config, dbName});

        // Use a block we know exists
        const blockId = sharedIndex.lastBlockId;

        // Verify not cached
        const store = getStore(isolatedIndex);
        const before = await store.findBlockId(blockId);
        expect(before).toBeUndefined();

        // Fetch
        const height = await isolatedIndex.findOrFetchBlockHeight(blockId);
        expect(typeof height).toBe("number");

        // Verify cached
        const after = await store.findBlockId(blockId);
        expect(after).toBeTruthy();

        await Dexie.delete(dbName);
    });
});
```

---

### 3. `fetchAndStoreLatestBlock()`

**Location:** `CachedUtxoIndex.ts:903`

**Purpose:** Fetches latest block from Blockfrost and stores it.

**Used During Sync:** Yes - called at end of `syncNow()`.

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| Updates state | Updates lastBlockHeight, lastBlockId, lastSlot | Call and verify state change |
| Stores block | Block is saved to store | Check store after call |
| Idempotent | Multiple calls don't cause issues | Call twice |

```typescript
describe("fetchAndStoreLatestBlock (uses shared index)", () => {
    it("should update block tracking state", async () => {
        const prevHeight = sharedIndex.lastBlockHeight;

        const block = await sharedIndex.fetchAndStoreLatestBlock();

        // Height should be >= previous (blockchain moves forward)
        expect(sharedIndex.lastBlockHeight).toBeGreaterThanOrEqual(prevHeight);
        expect(sharedIndex.lastBlockId).toBe(block.hash);
        expect(sharedIndex.lastSlot).toBe(block.slot);
    });

    it("should store block in database", async () => {
        const block = await sharedIndex.fetchAndStoreLatestBlock();
        const store = getStore(sharedIndex);
        const stored = await store.findBlockId(block.hash);

        expect(stored).toBeTruthy();
        expect(stored!.height).toBe(block.height);
    });

    it("should update isolated index from zero state", async () => {
        const dbName = createIsolatedDbName("fetch-latest-block");
        const isolatedIndex = new CachedUtxoIndex({...config, dbName});

        // Initial state is 0
        expect(isolatedIndex.lastBlockHeight).toBe(0);

        const block = await isolatedIndex.fetchAndStoreLatestBlock();

        expect(isolatedIndex.lastBlockHeight).toBe(block.height);
        expect(isolatedIndex.lastBlockId).toBe(block.hash);
        expect(isolatedIndex.lastSlot).toBe(block.slot);

        await Dexie.delete(dbName);
    });
});
```

---

### 4. Data Conversion Verification (Private Methods)

These private methods are tested indirectly by verifying the stored data structure:

- `txInputToIndexEntry()` - converts TxInput to UtxoIndexEntry
- `txOutputToIndexEntry()` - converts TxOutput to UtxoIndexEntry
- `blockfrostBlockToIndexEntry()` - converts BlockDetails to BlockIndexEntry
- `extractUutIds()` / `extractUutIdsFromTxInput()` - extracts UUT identifiers

**Test Cases:**

| Test | Description | Verification |
|------|-------------|--------------|
| UTXO structure | Indexed UTXOs have correct fields | Check getAllUtxos() results |
| Token extraction | Tokens are properly extracted | Verify token structure |
| Datum handling | Inline datums/hashes preserved | Check datumHash/inlineDatum fields |
| UUT extraction | UUT IDs correctly identified | Verify uutIds array format |
| Block structure | Block entries have required fields | Check stored block data |

```typescript
describe("Data Conversion Verification (uses shared index)", () => {
    it("should produce valid UtxoIndexEntry structure", async () => {
        const utxos = await sharedIndex.getAllUtxos();

        for (const utxo of utxos) {
            // Required fields
            expect(utxo.utxoId).toMatch(/^[a-f0-9]{64}#\d+$/);
            expect(utxo.address).toMatch(/^addr_test1/);
            expect(typeof utxo.lovelace).toBe("bigint");
            expect(Array.isArray(utxo.tokens)).toBe(true);
            expect(Array.isArray(utxo.uutIds)).toBe(true);

            // Token structure
            for (const token of utxo.tokens) {
                expect(token.policyId).toMatch(/^[a-f0-9]{56}$/);
                expect(typeof token.tokenName).toBe("string");
                expect(typeof token.quantity).toBe("bigint");
            }

            // UUT ID format
            for (const uutId of utxo.uutIds) {
                expect(uutId).toMatch(/^[a-z]+-[0-9a-f]{12}$/);
            }
        }
    });

    it("should preserve datum information", async () => {
        const utxos = await sharedIndex.getAllUtxos();
        const withDatum = utxos.filter(u => u.inlineDatum || u.datumHash);

        // Capo UTXOs should have datums
        expect(withDatum.length).toBeGreaterThan(0);

        for (const utxo of withDatum) {
            // Either inline datum or hash, not both
            if (utxo.inlineDatum) {
                expect(utxo.inlineDatum).toMatch(/^[a-f0-9]+$/);
            }
            if (utxo.datumHash) {
                expect(utxo.datumHash).toMatch(/^[a-f0-9]{64}$/);
            }
        }
    });

    it("should store valid BlockIndexEntry", async () => {
        const store = getStore(sharedIndex);
        const block = await store.findBlockId(sharedIndex.lastBlockId);

        expect(block).toBeTruthy();
        expect(block!.hash).toMatch(/^[a-f0-9]{64}$/);
        expect(typeof block!.height).toBe("number");
        expect(typeof block!.slot).toBe("number");
        expect(typeof block!.time).toBe("number");
    });

    it("should have indexed all transactions from UTXOs", async () => {
        const utxos = await sharedIndex.getAllUtxos();
        const txHashes = new Set(utxos.map(u => u.utxoId.split("#")[0]));

        const allTxs = await getAllTxs(sharedIndex);
        const indexedTxIds = new Set(allTxs.map(t => t.txid));

        // Every tx that created a UTXO should be indexed
        for (const txHash of txHashes) {
            expect(indexedTxIds.has(txHash)).toBe(true);
        }
    });
});
```

---

### 5. Store Query Methods (Already Partially Tested)

These are tested but could use additional coverage:

- `findUtxosByAddress()` - pagination edge cases
- `findUtxosByAsset()` - with/without tokenName filter
- `getAllUtxos()` - large offset behavior
- `findUtxoByUUT()` - non-existent UUT

```typescript
describe("Store Query Edge Cases (uses shared index)", () => {
    it("findUtxosByAsset should filter by tokenName when provided", async () => {
        // Find with just policyId
        const byPolicy = await sharedIndex.findUtxosByAsset(TEST_CAPO_MPH);

        // Find with specific token name (charter)
        const charterHex = Buffer.from("charter").toString("hex");
        const byToken = await sharedIndex.findUtxosByAsset(TEST_CAPO_MPH, charterHex);

        // byToken should be subset of byPolicy
        expect(byToken.length).toBeLessThanOrEqual(byPolicy.length);
        expect(byToken.length).toBeGreaterThan(0); // Charter should exist
    });

    it("findUtxoByUUT should return undefined for non-existent UUT", async () => {
        const result = await sharedIndex.findUtxoByUUT("fake-000000000000");
        expect(result).toBeUndefined();
    });

    it("getAllUtxos should handle large offset gracefully", async () => {
        const result = await sharedIndex.getAllUtxos({ offset: 10000 });
        expect(result).toEqual([]);
    });

    it("findUtxosByAddress should paginate correctly", async () => {
        const all = await sharedIndex.findUtxosByAddress(TEST_CAPO_ADDRESS);

        if (all.length > 2) {
            const page1 = await sharedIndex.findUtxosByAddress(TEST_CAPO_ADDRESS, { limit: 2 });
            const page2 = await sharedIndex.findUtxosByAddress(TEST_CAPO_ADDRESS, { limit: 2, offset: 2 });

            expect(page1.length).toBe(2);
            expect(page2.length).toBeLessThanOrEqual(2);

            // Pages should not overlap
            const page1Ids = page1.map(u => u.utxoId);
            const page2Ids = page2.map(u => u.utxoId);
            for (const id of page2Ids) {
                expect(page1Ids).not.toContain(id);
            }
        }
    });
});
```

---

### 6. Testing Cache Miss Scenarios with Isolated Indexes

For thorough cache testing, use isolated indexes with partial data:

```typescript
describe("Cache Miss Scenarios (isolated)", () => {
    const cleanupRegistry = createDbCleanupRegistry();

    afterAll(async () => {
        await cleanupRegistry.cleanup();
    });

    it("should fetch tx on cache miss and then hit cache", async () => {
        const dbName = createIsolatedDbName("cache-miss-then-hit");
        cleanupRegistry.register(dbName);

        const isolatedIndex = new CachedUtxoIndex({...config, dbName});

        // Get a known tx from shared index
        const utxos = await sharedIndex.getAllUtxos();
        const txHash = utxos[0].utxoId.split("#")[0];

        // First call - cache miss, should fetch
        const start1 = Date.now();
        const tx1 = await isolatedIndex.findOrFetchTxDetails(txHash);
        const elapsed1 = Date.now() - start1;

        // Second call - cache hit, should be fast
        const start2 = Date.now();
        const tx2 = await isolatedIndex.findOrFetchTxDetails(txHash);
        const elapsed2 = Date.now() - start2;

        expect(tx1.id().toHex()).toBe(txHash);
        expect(tx2.id().toHex()).toBe(txHash);

        // Cache hit should be significantly faster
        expect(elapsed2).toBeLessThan(elapsed1);
        expect(elapsed2).toBeLessThan(50); // Cache lookup < 50ms
    });

    it("should work with copied partial data", async () => {
        const dbName = createIsolatedDbName("partial-copy");
        cleanupRegistry.register(dbName);

        const isolatedIndex = new CachedUtxoIndex({...config, dbName});

        // Copy data up to a certain block
        const blocks = await getAllBlocks(sharedIndex);
        if (blocks.length > 1) {
            const midBlock = blocks[Math.floor(blocks.length / 2)];
            await copyIndexDataUpToBlock(sharedIndex, isolatedIndex, midBlock.height);

            // Verify partial sync state
            expect(isolatedIndex.lastBlockHeight).toBe(midBlock.height);
        }
    });
});
```

---

## Test File Structure

```typescript
import {
    getStore,
    getAllBlocks,
    getAllTxs,
    copyIndexData,
    copyIndexDataUpToBlock,
    createDbCleanupRegistry,
} from "./CachedUtxoIndex.testHelpers.js";

describe("Sync-Dependent Functions (uses shared index)", () => {
    describe("findOrFetchTxDetails", () => { ... });
    describe("findOrFetchBlockHeight", () => { ... });
    describe("fetchAndStoreLatestBlock", () => { ... });
});

describe("Data Conversion Verification (uses shared index)", () => {
    it("should produce valid UtxoIndexEntry structure", ...);
    it("should preserve datum information", ...);
    it("should store valid BlockIndexEntry", ...);
    it("should have indexed all transactions from UTXOs", ...);
});

describe("Store Query Edge Cases (uses shared index)", () => {
    it("findUtxosByAsset should filter by tokenName", ...);
    it("findUtxoByUUT returns undefined for non-existent", ...);
    it("getAllUtxos handles large offset", ...);
    it("findUtxosByAddress should paginate correctly", ...);
});

describe("Cache Miss Scenarios (isolated)", () => {
    // Uses cleanup registry for proper teardown
    it("should fetch tx on cache miss and then hit cache", ...);
    it("should work with copied partial data", ...);
});
```

## Dependencies

- Shared synced index (initialized in beforeAll)
- Test helpers from `./CachedUtxoIndex.testHelpers.ts`
- `createIsolatedDbName()` helper for unique database names
- `createDbCleanupRegistry()` for managing test database cleanup
- No mocking required for most tests
