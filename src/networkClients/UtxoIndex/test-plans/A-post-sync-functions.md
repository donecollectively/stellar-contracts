# Test Plan A: Functions Not Used During Sync

These functions operate independently of the initial sync process and can be tested using the shared synced index or isolated databases without needing to mock sync behavior.

## Workflow Loop: REQUIRED

The agent MUST use the workflow described in ./TestingWorkflow.md.

## Overview

These tests exercise functionality that runs **after** initial sync completes, primarily:
- Transaction monitoring (`checkForNewTxns`)
- ReadonlyCardanoClient interface methods
- TxInput restoration
- Direct fetch operations (bypassing cache)

## Functions to Test

### 1. `checkForNewTxns(fromBlockHeight?)`

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
        const index = new CachedUtxoIndex({...config, dbName});
        // Don't call syncNow - lastBlockHeight remains 0
        await expect(index.checkForNewTxns()).rejects.toThrow("block height 0");
    });
    
    it("incrementally loads txs in most recent block", async () => {
        const { makeTxId } = await import("@helios-lang/ledger");
        
        // ! finds the most recent transaction and the block in which that tx exists

        // ! makes an isolated index
        // ! inserts all the data from the shared index, except for those
        // in the most recent block
        // ! fixes up the details in the isolated index so it looks like the most recent block was not processed

        // ! verifies that the skipped transaction is not found in the isolated index
        // ! syncs the isolated index

        // ! verifies that the skipped transaction is found in the isolated index after sync
    });
    
    it("honors the page size limits during syncing", async () => {
        const { makeTxId } = await import("@helios-lang/ledger");        

        // ! sets up an isolated sync in which only the first block is processed`: {..    
        //    // ! finds the tx in which the charter was minted (via blockfrost GET `/assets/{asset}/history`) recent transaction and the block in which that tx exists
        //    // asset: string  // Concatenation of the policy_id and hex-encoded asset_name
        //    //     example: b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e
            
        //    // ! makes an isolated index
        //    // ! syncs only the txns in that initial block        
        // }

        // ! overloads the pageSize to 4

        // ! mocks something so only one page of transactions will be processed
    })
    it("fetches multiple pages during syncing", () => {

        // ! sets up an isolated sync in which only the first block is processed`

        // ! checks that only 4 transactions were added.

        // ! changes to allow 3 pages of transactions to be processed

        // ! syncs the isolated index

        // ! checks that 12 transactions were added.

    })
});
```

---

### 2. `getTx(id: TxId)`

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

        // mock getTx in underlying network
        const tx = await sharedIndex.getTx(makeTxId(txHash));
        expect(tx).toBeTruthy();
        expect(tx.id().toHex()).toBe(txHash);
        // !ensure the mock wasn't called
    });
    
    it("should pass through to underlying network", async () => {
        const txId = "txId";
        const { makeTxId } = await import("@helios-lang/ledger");

        // !fetch a tx from the shared index
        // ! make an isolated index

        // ! spy on getTx in underlying network and call through
        // 
        const tx = await sharedIndex.getTx(makeTxId(txId));
        expect(tx).toBeTruthy();
        expect(tx.id().toHex()).toBe(txId);
        // !ensure the mock was called
    });
});
```

---

### 3. `getUtxo(id: TxOutputId)`

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

### 4. `getUtxos(address: Address)`

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

### 5. `getUtxosWithAssetClass(address, assetClass)`

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

### 6. `restoreTxInputs(tx: Tx)`

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

### 8. `fetchBlockDetails(blockId)`

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

### 9. `fetchTxDetails(txId)`

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

- Shared synced index (already set up)
- `@helios-lang/ledger` imports for type construction
- No mocking required
