# Test Plan B: Functions Used During Sync, Testable Post-Sync

These functions are called during `syncNow()` but can be verified or exercised further using the shared synced index without needing to mock the sync process itself.

## Workflow Loop: REQUIRED

The agent MUST use the workflow described in ./TestingWorkflow.md.


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
| Cache miss | Fetches from network, caches, returns | Use valid txId not in cache |
| Verify caching | Second call uses cache | Call twice, verify no duplicate fetch |

**Implementation Notes:**
- For cache hit: any txId from synced UTXOs will be cached
- For cache miss: need a valid preprod txId not associated with the capo
- To verify caching behavior, could spy on `fetchFromBlockfrost` or check store

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
        // Cached lookup should be very fast (< 10ms typically)
        expect(elapsed).toBeLessThan(10);
    });

    it("should verify tx is stored in cache", async () => {
        const utxos = await sharedIndex.getAllUtxos();
        const txHash = utxos[0].utxoId.split("#")[0];

        // Directly check store
        const cached = await sharedIndex.store.findTxId(txHash);
        expect(cached).toBeTruthy();
        expect(cached!.txid).toBe(txHash);
        expect(cached!.cbor).toBeTruthy();
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
| Uncached block | Fetches, caches, returns height | Use older block hash |

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

            // Verify it's now cached
            const cached = await sharedIndex.store.findBlockId(latestBlock.previous_block);
            expect(cached).toBeTruthy();
        }
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
        const stored = await sharedIndex.store.findBlockId(block.hash);

        expect(stored).toBeTruthy();
        expect(stored!.height).toBe(block.height);
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
        const block = await sharedIndex.store.findBlockId(sharedIndex.lastBlockId);

        expect(block).toBeTruthy();
        expect(block!.hash).toMatch(/^[a-f0-9]{64}$/);
        expect(typeof block!.height).toBe("number");
        expect(typeof block!.slot).toBe("number");
        expect(typeof block!.time).toBe("number");
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
});
```

---

## Test File Structure

```typescript
describe("Sync-Dependent Functions (uses shared index)", () => {
    describe("findOrFetchTxDetails", () => { ... });
    describe("findOrFetchBlockHeight", () => { ... });
    describe("fetchAndStoreLatestBlock", () => { ... });
});

describe("Data Conversion Verification (uses shared index)", () => {
    it("should produce valid UtxoIndexEntry structure", ...);
    it("should preserve datum information", ...);
    it("should store valid BlockIndexEntry", ...);
});

describe("Store Query Edge Cases (uses shared index)", () => {
    it("findUtxosByAsset should filter by tokenName", ...);
    it("findUtxoByUUT returns undefined for non-existent", ...);
    it("getAllUtxos handles large offset", ...);
});
```

## Dependencies

- Shared synced index
- Direct access to `sharedIndex.store` for verification
- No mocking required
