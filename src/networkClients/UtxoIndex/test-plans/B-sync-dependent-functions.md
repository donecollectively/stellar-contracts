# Test Plan B: Functions Used During Sync, Testable Post-Sync

These functions are called during `syncNow()` but can be verified or exercised further using the shared synced index without needing to mock the sync process itself.

## Workflow Loop: REQUIRED

The agent MUST use the workflow described in ./TestingWorkflow.md.

## Test Helpers: REQUIRED

Import and use helpers from `./CachedUtxoIndex.testHelpers.ts`. The file contains detailed usage patterns in its header documentation.

## Required Imports

Add to the existing imports at the top of the test file:

```typescript
import { vi, afterEach } from "vitest";
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

// Usage in tests:
const isolatedIndex = new CachedUtxoIndex({
    ...baseConfig,
    dbName: createIsolatedDbName("test-name"),
});
```

## Overview

These tests verify:
- Cache behavior (hit vs miss)
- Data conversion correctness (indirectly via stored data)
- Block/transaction management
- Re-invocable functions that were already called during sync

## Functions to Test

### 1. `findOrFetchTxDetails(txId)` ✅ IMPLEMENTED

**Location:** `CachedUtxoIndex.ts:1034`

**Purpose:** Retrieves transaction with cache-first strategy.

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| Cache hit | Returns from store without network call | Use txId already fetched during sync |
| Cache miss | Fetches from network, caches, returns | Use isolated index without tx cached |
| Verify caching | Second call uses cache | Call twice on isolated index |

**Implementation:**

```typescript
describe("findOrFetchTxDetails (uses shared index)", () => {
    it("should return tx from cache without network call", async () => {
        const { getStore, getAllTxs } = await import("./CachedUtxoIndex.testHelpers.js");
        const store = getStore(sharedIndex);

        // Get a txId that was cached during sync
        const cachedTxs = await getAllTxs(sharedIndex);
        expect(cachedTxs.length).toBeGreaterThan(0);
        const txId = cachedTxs[0].txid;

        // Spy on fetchFromBlockfrost to verify no network call
        const fetchSpy = vi.spyOn(sharedIndex, "fetchFromBlockfrost");

        const tx = await sharedIndex.findOrFetchTxDetails(txId);

        expect(tx).toBeTruthy();
        expect(tx.id().toHex()).toBe(txId);
        expect(fetchSpy).not.toHaveBeenCalled();

        fetchSpy.mockRestore();
    });

    it("should fetch from network on cache miss and cache result", async () => {
        const { getStore, createDbCleanupRegistry } = await import("./CachedUtxoIndex.testHelpers.js");
        const cleanupRegistry = createDbCleanupRegistry();

        // Create isolated index WITHOUT copying tx data
        const dbName = createIsolatedDbName("tx-cache-miss");
        cleanupRegistry.register(dbName);

        const isolatedIndex = new CachedUtxoIndex({
            ...baseConfig,
            dbName,
        });

        // Get a txId from shared index that is NOT in isolated index
        const utxos = await sharedIndex.getAllUtxos();
        const txId = utxos[0].utxoId.split("#")[0];

        // Verify not in isolated cache
        const isolatedStore = getStore(isolatedIndex);
        const beforeFetch = await isolatedStore.findTxId(txId);
        expect(beforeFetch).toBeUndefined();

        // Fetch - should hit network
        const tx = await isolatedIndex.findOrFetchTxDetails(txId);
        expect(tx).toBeTruthy();
        expect(tx.id().toHex()).toBe(txId);

        // Verify now cached
        const afterFetch = await isolatedStore.findTxId(txId);
        expect(afterFetch).toBeTruthy();
        expect(afterFetch!.txid).toBe(txId);

        await cleanupRegistry.cleanup();
    });

    it("should use cache on second call", async () => {
        const { getStore, createDbCleanupRegistry } = await import("./CachedUtxoIndex.testHelpers.js");
        const cleanupRegistry = createDbCleanupRegistry();

        const dbName = createIsolatedDbName("tx-second-call");
        cleanupRegistry.register(dbName);

        const isolatedIndex = new CachedUtxoIndex({
            ...baseConfig,
            dbName,
        });

        const utxos = await sharedIndex.getAllUtxos();
        const txId = utxos[0].utxoId.split("#")[0];

        // First call - fetches from network
        await isolatedIndex.findOrFetchTxDetails(txId);

        // Spy for second call
        const fetchSpy = vi.spyOn(isolatedIndex, "fetchFromBlockfrost");

        // Second call - should use cache
        const tx2 = await isolatedIndex.findOrFetchTxDetails(txId);
        expect(tx2.id().toHex()).toBe(txId);
        expect(fetchSpy).not.toHaveBeenCalled();

        fetchSpy.mockRestore();
        await cleanupRegistry.cleanup();
    });
});
```

---

### 2. `findOrFetchBlockHeight(blockId)` ✅ IMPLEMENTED

**Location:** `CachedUtxoIndex.ts:932`

**Purpose:** Resolves block height from hash, with caching.

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| Cached block | Returns height from store | Use `lastBlockId` (stored during sync) |
| Uncached block | Fetches, caches, returns height | Use isolated index or older block hash |

**Implementation:**

```typescript
describe("findOrFetchBlockHeight (uses shared index)", () => {
    it("should return height from cache for lastBlockId", async () => {
        const blockId = sharedIndex.lastBlockId;
        const expectedHeight = sharedIndex.lastBlockHeight;

        // Spy to verify no network call
        const fetchSpy = vi.spyOn(sharedIndex, "fetchFromBlockfrost");

        const height = await sharedIndex.findOrFetchBlockHeight(blockId);

        expect(height).toBe(expectedHeight);
        expect(fetchSpy).not.toHaveBeenCalled();

        fetchSpy.mockRestore();
    });

    it("should fetch and cache uncached block", async () => {
        const { getStore, getAllBlocks, createDbCleanupRegistry } = await import("./CachedUtxoIndex.testHelpers.js");
        const cleanupRegistry = createDbCleanupRegistry();

        const dbName = createIsolatedDbName("block-cache-miss");
        cleanupRegistry.register(dbName);

        const isolatedIndex = new CachedUtxoIndex({
            ...baseConfig,
            dbName,
        });

        // Use a block from shared index that isn't in isolated
        const blocks = await getAllBlocks(sharedIndex);
        expect(blocks.length).toBeGreaterThan(0);
        const testBlock = blocks[0];

        // Verify not in isolated cache
        const isolatedStore = getStore(isolatedIndex);
        const beforeFetch = await isolatedStore.findBlockId(testBlock.hash);
        expect(beforeFetch).toBeUndefined();

        // Fetch - should hit network and cache
        const height = await isolatedIndex.findOrFetchBlockHeight(testBlock.hash);
        expect(height).toBe(testBlock.height);

        // Verify now cached
        const afterFetch = await isolatedStore.findBlockId(testBlock.hash);
        expect(afterFetch).toBeTruthy();
        expect(afterFetch!.height).toBe(testBlock.height);

        await cleanupRegistry.cleanup();
    });
});
```

---

### 3. `fetchAndStoreLatestBlock()`

**Location:** `CachedUtxoIndex.ts:958`

**Purpose:** Fetches latest block from Blockfrost and stores it.

**Test Cases:**

| Test | Description | Setup |
|------|-------------|-------|
| Updates state | Updates lastBlockHeight, lastBlockId, lastSlot | Call and verify state change |
| Stores block | Block is saved to store | Check store after call |
| From zero state | Works on fresh isolated index | Create isolated index, call method |

**Implementation:**

```typescript
describe("fetchAndStoreLatestBlock (isolated)", () => {
    it("should update state fields after fetching", async () => {
        const { createDbCleanupRegistry } = await import("./CachedUtxoIndex.testHelpers.js");
        const cleanupRegistry = createDbCleanupRegistry();

        const dbName = createIsolatedDbName("latest-block-state");
        cleanupRegistry.register(dbName);

        const isolatedIndex = new CachedUtxoIndex({
            ...baseConfig,
            dbName,
        });

        // Initially zero (fresh index, no sync)
        expect(isolatedIndex.lastBlockHeight).toBe(0);
        expect(isolatedIndex.lastBlockId).toBe("");
        expect(isolatedIndex.lastSlot).toBe(0);

        const result = await isolatedIndex.fetchAndStoreLatestBlock();

        // State should be updated
        expect(isolatedIndex.lastBlockHeight).toBeGreaterThan(0);
        expect(isolatedIndex.lastBlockId.length).toBe(64);
        expect(isolatedIndex.lastSlot).toBeGreaterThan(0);

        // Return value should match state
        expect(result.height).toBe(isolatedIndex.lastBlockHeight);
        expect(result.hash).toBe(isolatedIndex.lastBlockId);
        expect(result.slot).toBe(isolatedIndex.lastSlot);

        await cleanupRegistry.cleanup();
    });

    it("should store block in database", async () => {
        const { getStore, createDbCleanupRegistry } = await import("./CachedUtxoIndex.testHelpers.js");
        const cleanupRegistry = createDbCleanupRegistry();

        const dbName = createIsolatedDbName("latest-block-store");
        cleanupRegistry.register(dbName);

        const isolatedIndex = new CachedUtxoIndex({
            ...baseConfig,
            dbName,
        });

        const result = await isolatedIndex.fetchAndStoreLatestBlock();

        // Verify block was stored
        const store = getStore(isolatedIndex);
        const storedBlock = await store.findBlockId(result.hash);

        expect(storedBlock).toBeTruthy();
        expect(storedBlock!.height).toBe(result.height);
        expect(storedBlock!.slot).toBe(result.slot);
        expect(storedBlock!.epoch).toBe(result.epoch);

        await cleanupRegistry.cleanup();
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
| Tx indexing | All UTXO-creating txs indexed | Compare UTXO txHashes to indexed txs |

**Implementation:**

```typescript
describe("Data Conversion Verification (uses shared index)", () => {
    it("should have correct UTXO structure in indexed data", async () => {
        const utxos = await sharedIndex.getAllUtxos();
        expect(utxos.length).toBeGreaterThan(0);

        for (const utxo of utxos) {
            // Required fields
            expect(utxo.utxoId).toBeTruthy();
            expect(utxo.utxoId).toMatch(/^[0-9a-f]{64}#\d+$/);
            expect(utxo.address).toBeTruthy();
            expect(typeof utxo.lovelace).toBe("bigint");
            expect(Array.isArray(utxo.tokens)).toBe(true);
            expect(Array.isArray(utxo.uutIds)).toBe(true);

            // Optional fields have correct types if present
            if (utxo.datumHash) {
                expect(typeof utxo.datumHash).toBe("string");
                expect(utxo.datumHash.length).toBe(64);
            }
            if (utxo.inlineDatum) {
                expect(typeof utxo.inlineDatum).toBe("string");
            }
        }
    });

    it("should have correct token structure", async () => {
        const utxos = await sharedIndex.findUtxosByAsset(TEST_CAPO_MPH);
        expect(utxos.length).toBeGreaterThan(0);

        for (const utxo of utxos) {
            for (const token of utxo.tokens) {
                expect(typeof token.policyId).toBe("string");
                expect(token.policyId.length).toBe(56); // MPH is 28 bytes = 56 hex
                expect(typeof token.tokenName).toBe("string");
                expect(typeof token.quantity).toBe("bigint");
                expect(token.quantity).toBeGreaterThan(0n);
            }
        }
    });

    it("should preserve UUT IDs with correct format", async () => {
        const utxos = await sharedIndex.getAllUtxos();
        const utxosWithUuts = utxos.filter(u => u.uutIds.length > 0);

        // Should have at least delegate UUTs
        expect(utxosWithUuts.length).toBeGreaterThan(0);

        const uutPattern = /^[a-z]+-[0-9a-f]{12}$/;
        for (const utxo of utxosWithUuts) {
            for (const uutId of utxo.uutIds) {
                expect(uutId).toMatch(uutPattern);
            }
        }
    });

    it("should have correct block structure in indexed data", async () => {
        const { getAllBlocks } = await import("./CachedUtxoIndex.testHelpers.js");
        const blocks = await getAllBlocks(sharedIndex);

        expect(blocks.length).toBeGreaterThan(0);

        for (const block of blocks) {
            expect(block.hash).toBeTruthy();
            expect(block.hash.length).toBe(64);
            expect(typeof block.height).toBe("number");
            expect(block.height).toBeGreaterThan(0);
            expect(typeof block.slot).toBe("number");
            expect(block.slot).toBeGreaterThan(0);
            expect(typeof block.time).toBe("number");
            expect(typeof block.epoch).toBe("number");
        }
    });

    it("should have txs indexed for UTXOs", async () => {
        const { getAllTxs } = await import("./CachedUtxoIndex.testHelpers.js");
        const txs = await getAllTxs(sharedIndex);

        expect(txs.length).toBeGreaterThan(0);

        // Each tx should have cbor
        for (const tx of txs) {
            expect(tx.txid).toBeTruthy();
            expect(tx.txid.length).toBe(64);
            expect(tx.cbor).toBeTruthy();
        }

        // Verify there's at least one tx that created a UTXO
        const utxos = await sharedIndex.getAllUtxos();
        const txIdsFromUtxos = new Set(utxos.map(u => u.utxoId.split("#")[0]));
        const indexedTxIds = new Set(txs.map(t => t.txid));

        // At least some UTXO-creating txs should be indexed
        const overlap = [...txIdsFromUtxos].filter(id => indexedTxIds.has(id));
        expect(overlap.length).toBeGreaterThan(0);
    });
});
```

---

### 5. Store Query Edge Cases

Additional coverage for query methods:

| Test | Description |
|------|-------------|
| findUtxosByAsset with tokenName | Filter by policyId vs policyId+tokenName |
| findUtxoByUUT non-existent | Returns undefined for fake UUT |
| getAllUtxos large offset | Returns empty array gracefully |
| findUtxosByAddress pagination | Pages don't overlap, correct sizes |

**Implementation:**

```typescript
describe("Store Query Edge Cases (uses shared index)", () => {
    it("should filter by tokenName in findUtxosByAsset", async () => {
        // Find UTXOs with capo MPH and "charter" tokenName
        const charterUtxos = await sharedIndex.findUtxosByAsset(
            TEST_CAPO_MPH,
            "63686172746572" // "charter" in hex
        );

        // Should find exactly one charter UTXO
        expect(charterUtxos.length).toBe(1);

        // All UTXOs with capo MPH (any token name)
        const allCapoUtxos = await sharedIndex.findUtxosByAsset(TEST_CAPO_MPH);

        // Should have at least the charter plus delegate tokens
        expect(allCapoUtxos.length).toBeGreaterThanOrEqual(charterUtxos.length);
    });

    it("should return undefined for non-existent UUT", async () => {
        const fakeUut = "fake-000000000000";
        const result = await sharedIndex.findUtxoByUUT(fakeUut);
        expect(result).toBeUndefined();
    });

    it("should return empty array for large offset in getAllUtxos", async () => {
        const result = await sharedIndex.getAllUtxos({ offset: 999999 });
        expect(result).toEqual([]);
    });

    it("should paginate findUtxosByAddress correctly", async () => {
        const page1 = await sharedIndex.findUtxosByAddress(TEST_CAPO_ADDRESS, { limit: 2, offset: 0 });
        const page2 = await sharedIndex.findUtxosByAddress(TEST_CAPO_ADDRESS, { limit: 2, offset: 2 });

        // Pages shouldn't overlap
        const page1Ids = new Set(page1.map(u => u.utxoId));
        for (const utxo of page2) {
            expect(page1Ids.has(utxo.utxoId)).toBe(false);
        }

        // Combined should equal fetching more
        const combined = await sharedIndex.findUtxosByAddress(TEST_CAPO_ADDRESS, { limit: 4, offset: 0 });
        expect(combined.length).toBe(page1.length + page2.length);
    });
});
```

---

### 6. Cache Miss Scenarios (Isolated)

Use isolated indexes to test cache miss → fetch → cache hit flow:

| Test | Description |
|------|-------------|
| Tx cache miss then hit | First call fetches, second call uses cache |
| Block cache miss then hit | Same pattern for blocks |
| Partial data copy | Use `copyIndexDataUpToBlock()` to set up partial sync state |

**Implementation:**

```typescript
describe("Cache Miss Scenarios (isolated)", () => {
    it("should demonstrate tx cache miss then hit pattern", async () => {
        const { getStore, createDbCleanupRegistry } = await import("./CachedUtxoIndex.testHelpers.js");
        const cleanupRegistry = createDbCleanupRegistry();

        const dbName = createIsolatedDbName("tx-cache-pattern");
        cleanupRegistry.register(dbName);

        const isolatedIndex = new CachedUtxoIndex({
            ...baseConfig,
            dbName,
        });

        const utxos = await sharedIndex.getAllUtxos();
        const txId = utxos[0].utxoId.split("#")[0];
        const store = getStore(isolatedIndex);

        // Miss
        expect(await store.findTxId(txId)).toBeUndefined();

        // Fetch (cache miss)
        const fetchSpy = vi.spyOn(isolatedIndex, "fetchFromBlockfrost");
        await isolatedIndex.findOrFetchTxDetails(txId);
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        // Hit
        expect(await store.findTxId(txId)).toBeTruthy();

        // Second fetch (cache hit - no network call)
        fetchSpy.mockClear();
        await isolatedIndex.findOrFetchTxDetails(txId);
        expect(fetchSpy).not.toHaveBeenCalled();

        fetchSpy.mockRestore();
        await cleanupRegistry.cleanup();
    });

    it("should demonstrate block cache miss then hit pattern", async () => {
        const { getStore, getAllBlocks, createDbCleanupRegistry } = await import("./CachedUtxoIndex.testHelpers.js");
        const cleanupRegistry = createDbCleanupRegistry();

        const dbName = createIsolatedDbName("block-cache-pattern");
        cleanupRegistry.register(dbName);

        const isolatedIndex = new CachedUtxoIndex({
            ...baseConfig,
            dbName,
        });

        const blocks = await getAllBlocks(sharedIndex);
        const blockId = blocks[0].hash;
        const store = getStore(isolatedIndex);

        // Miss
        expect(await store.findBlockId(blockId)).toBeUndefined();

        // Fetch (cache miss)
        const fetchSpy = vi.spyOn(isolatedIndex, "fetchFromBlockfrost");
        await isolatedIndex.findOrFetchBlockHeight(blockId);
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        // Hit
        expect(await store.findBlockId(blockId)).toBeTruthy();

        // Second fetch (cache hit - no network call)
        fetchSpy.mockClear();
        await isolatedIndex.findOrFetchBlockHeight(blockId);
        expect(fetchSpy).not.toHaveBeenCalled();

        fetchSpy.mockRestore();
        await cleanupRegistry.cleanup();
    });

    it("should work with partial data via copyIndexDataUpToBlock", async () => {
        const {
            getAllBlocks,
            copyIndexDataUpToBlock,
            createDbCleanupRegistry
        } = await import("./CachedUtxoIndex.testHelpers.js");
        const cleanupRegistry = createDbCleanupRegistry();

        const blocks = await getAllBlocks(sharedIndex);
        if (blocks.length < 2) {
            // Skip if not enough blocks
            return;
        }

        // Sort by height to find an older block
        const sortedBlocks = [...blocks].sort((a, b) => a.height - b.height);
        const oldestBlock = sortedBlocks[0];

        const dbName = createIsolatedDbName("partial-data");
        cleanupRegistry.register(dbName);

        const isolatedIndex = new CachedUtxoIndex({
            ...baseConfig,
            dbName,
        });

        // Copy data up to oldest block only
        await copyIndexDataUpToBlock(sharedIndex, isolatedIndex, oldestBlock.height);

        // Isolated index should have the partial state
        expect(isolatedIndex.lastBlockHeight).toBe(oldestBlock.height);
        expect(isolatedIndex.lastBlockId).toBe(oldestBlock.hash);

        await cleanupRegistry.cleanup();
    });
});
```

---

## Dependencies

- Shared synced index (initialized in beforeAll)
- Test helpers from `./CachedUtxoIndex.testHelpers.ts`
- `createIsolatedDbName()` helper for unique database names
- No mocking required for most tests
