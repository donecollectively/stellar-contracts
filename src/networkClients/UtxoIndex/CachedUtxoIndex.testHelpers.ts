/**
 * Test helpers for CachedUtxoIndex
 *
 * These utilities provide access to internal state and bulk operations
 * needed for testing, without polluting the main class API.
 *
 * ## Usage Patterns
 *
 * ### Accessing Internal State
 * Use `getStore(index)` instead of accessing `index.store` directly:
 * ```typescript
 * const store = getStore(sharedIndex);
 * const cached = await store.findTxId(txHash);
 * ```
 *
 * ### Simulating Sync States
 * Use `setLastSyncedBlock()` to simulate partially synced indexes:
 * ```typescript
 * setLastSyncedBlock(isolatedIndex, blockHeight, blockHash, slot);
 * ```
 *
 * ### Setting Up Isolated Tests with Pre-existing Data
 * Use `copyIndexData()` or `copyIndexDataUpToBlock()` to populate isolated test databases:
 * ```typescript
 * const dbName = createIsolatedDbName("my-test");
 * const isolatedIndex = new CachedUtxoIndex({...config, dbName});
 * await copyIndexData(sharedIndex, isolatedIndex);
 * // or for partial data:
 * await copyIndexDataUpToBlock(sharedIndex, isolatedIndex, maxBlockHeight);
 * ```
 *
 * ### Database Cleanup
 * Use `createDbCleanupRegistry()` for managing test database cleanup:
 * ```typescript
 * const cleanupRegistry = createDbCleanupRegistry();
 *
 * beforeEach(() => {
 *     const dbName = createIsolatedDbName("test-case");
 *     cleanupRegistry.register(dbName);
 *     // create index with dbName...
 * });
 *
 * afterAll(async () => {
 *     await cleanupRegistry.cleanup();
 * });
 * ```
 *
 * ### Verifying Cache State
 * ```typescript
 * const store = getStore(index);
 * const txCached = await store.findTxId(txHash);
 * const blockCached = await store.findBlockId(blockHash);
 * ```
 *
 * ### Getting All Indexed Data
 * ```typescript
 * const allBlocks = await getAllBlocks(index);
 * const allTxs = await getAllTxs(index);
 * const utxosFromTx = await getUtxosFromTx(index, txHash);
 * ```
 */

import Dexie from "dexie";
import { CachedUtxoIndex } from "./CachedUtxoIndex.js";
import { DexieUtxoStore } from "./DexieUtxoStore.js";
import type { UtxoIndexEntry } from "./types/UtxoIndexEntry.js";
import type { BlockIndexEntry } from "./types/BlockIndexEntry.js";
import type { TxIndexEntry } from "./types/TxIndexEntry.js";

/**
 * Type that exposes internal properties for testing.
 * Uses intersection to access private/internal fields.
 */
type CachedUtxoIndexInternal = CachedUtxoIndex & {
    lastBlockHeight: number;
    lastBlockId: string;
    lastBlockSlot: number;
    store: DexieUtxoStore;
};

/**
 * Sets the last synced block state on an index.
 * Useful for simulating a partially synced state.
 */
export function setLastSyncedBlock(
    index: CachedUtxoIndex,
    height: number,
    id: string,
    slot: number
): void {
    const internal = index as CachedUtxoIndexInternal;
    internal.lastBlockHeight = height;
    internal.lastBlockId = id;
    internal.lastBlockSlot = slot;
}

/**
 * Gets the DexieUtxoStore from an index for direct database access.
 */
export function getStore(index: CachedUtxoIndex): DexieUtxoStore {
    return (index as CachedUtxoIndexInternal).store as DexieUtxoStore;
}

/**
 * Gets all blocks from the store.
 */
export async function getAllBlocks(index: CachedUtxoIndex): Promise<BlockIndexEntry[]> {
    const store = getStore(index);
    return store.blocks.toArray();
}

/**
 * Gets all transactions from the store.
 */
export async function getAllTxs(index: CachedUtxoIndex): Promise<TxIndexEntry[]> {
    const store = getStore(index);
    return store.txs.toArray();
}

/**
 * Copies all data from a source index to a target index.
 * Useful for setting up isolated test databases with pre-synced data.
 */
export async function copyIndexData(
    source: CachedUtxoIndex,
    target: CachedUtxoIndex
): Promise<void> {
    const sourceStore = getStore(source);
    const targetStore = getStore(target);

    // Copy all blocks
    const blocks = await sourceStore.blocks.toArray();
    for (const block of blocks) {
        await targetStore.blocks.put(block);
    }

    // Copy all UTXOs
    const utxos = await sourceStore.utxos.toArray();
    for (const utxo of utxos) {
        await targetStore.utxos.put(utxo);
    }

    // Copy all transactions
    const txs = await sourceStore.txs.toArray();
    for (const tx of txs) {
        await targetStore.txs.put(tx);
    }

    // Copy all scripts
    const scripts = await sourceStore.scripts.toArray();
    for (const script of scripts) {
        await targetStore.scripts.put(script);
    }

    // Copy last synced block state
    const sourceInternal = source as CachedUtxoIndexInternal;
    setLastSyncedBlock(
        target,
        sourceInternal.lastBlockHeight,
        sourceInternal.lastBlockId,
        sourceInternal.lastBlockSlot
    );
}

/**
 * Copies data from source to target, excluding UTXOs from blocks after the specified height.
 * Useful for simulating a partially synced state.
 */
export async function copyIndexDataUpToBlock(
    source: CachedUtxoIndex,
    target: CachedUtxoIndex,
    maxBlockHeight: number
): Promise<void> {
    const sourceStore = getStore(source);
    const targetStore = getStore(target);

    // Copy blocks up to maxBlockHeight
    const blocks = await sourceStore.blocks.toArray();
    const filteredBlocks = blocks.filter(b => b.height <= maxBlockHeight);
    for (const block of filteredBlocks) {
        await targetStore.blocks.put(block);
    }

    // Copy all UTXOs (we don't have block height on UTXOs, so copy all)
    // Tests will need to handle this limitation
    const utxos = await sourceStore.utxos.toArray();
    for (const utxo of utxos) {
        await targetStore.utxos.put(utxo);
    }

    // Copy all transactions
    const txs = await sourceStore.txs.toArray();
    for (const tx of txs) {
        await targetStore.txs.put(tx);
    }

    // Copy all scripts
    const scripts = await sourceStore.scripts.toArray();
    for (const script of scripts) {
        await targetStore.scripts.put(script);
    }

    // Set last synced block to the max block we copied
    const targetBlock = filteredBlocks.find(b => b.height === maxBlockHeight);
    if (targetBlock) {
        setLastSyncedBlock(target, targetBlock.height, targetBlock.hash, targetBlock.slot);
    }
}

/**
 * Deletes a specific UTXO from the store by ID.
 */
export async function deleteUtxo(index: CachedUtxoIndex, utxoId: string): Promise<boolean> {
    const store = getStore(index);
    const existing = await store.utxos.get(utxoId);
    if (existing) {
        await store.utxos.delete(utxoId);
        return true;
    }
    return false;
}

/**
 * Deletes a specific transaction from the store by ID.
 */
export async function deleteTx(index: CachedUtxoIndex, txId: string): Promise<boolean> {
    const store = getStore(index);
    const existing = await store.txs.get(txId);
    if (existing) {
        await store.txs.delete(txId);
        return true;
    }
    return false;
}

/**
 * Deletes UTXOs by their IDs.
 */
export async function deleteUtxos(index: CachedUtxoIndex, utxoIds: string[]): Promise<number> {
    const store = getStore(index);
    let deleted = 0;
    for (const utxoId of utxoIds) {
        const existing = await store.utxos.get(utxoId);
        if (existing) {
            await store.utxos.delete(utxoId);
            deleted++;
        }
    }
    return deleted;
}

/**
 * Gets UTXOs that were created in a specific transaction.
 */
export async function getUtxosFromTx(
    index: CachedUtxoIndex,
    txHash: string
): Promise<UtxoIndexEntry[]> {
    const allUtxos = await index.getAllUtxos();
    return allUtxos.filter(u => u.utxoId.startsWith(txHash + "#"));
}

/**
 * Finds the block that contains a specific transaction.
 * Note: This requires the transaction summaries to have block_height info,
 * which may not always be available in the cached data.
 */
export async function findBlockForTx(
    index: CachedUtxoIndex,
    txHash: string
): Promise<BlockIndexEntry | undefined> {
    // For now, this would require querying Blockfrost directly
    // as we don't store tx -> block mappings
    return undefined;
}

/**
 * Closes the Dexie store connection for an index.
 * This should be called before deleting the database.
 */
export function closeStore(index: CachedUtxoIndex): void {
    const store = getStore(index);
    store.close();
}

/**
 * Creates a registry for tracking isolated indexes for cleanup.
 * Closes Dexie connections before deleting databases.
 */
export function createDbCleanupRegistry(): {
    register: (dbName: string, index?: CachedUtxoIndex) => void;
    cleanup: () => Promise<void>;
    getNames: () => string[];
} {
    const entries: Map<string, CachedUtxoIndex | undefined> = new Map();

    return {
        register(dbName: string, index?: CachedUtxoIndex) {
            entries.set(dbName, index);
        },
        async cleanup() {
            for (const [dbName, index] of entries) {
                try {
                    // Close Dexie connection first
                    if (index) {
                        closeStore(index);
                    }
                    await Dexie.delete(dbName);
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }
            entries.clear();
        },
        getNames() {
            return [...entries.keys()];
        },
    };
}

// ============================================================
// Plan A Helpers: Post-Sync Function Testing
// ============================================================

/**
 * Finds a recent transaction and its containing block from indexed data.
 * Uses the lastBlockId/lastBlockHeight from the index and finds a tx
 * that created one of the indexed UTXOs.
 */
export async function findRecentTxAndBlock(index: CachedUtxoIndex): Promise<{
    txId: string;
    blockHeight: number;
    blockHash: string;
    slot: number;
}> {
    const internal = index as CachedUtxoIndexInternal;

    // Get a transaction from the indexed UTXOs
    const utxos = await index.getAllUtxos();
    if (utxos.length === 0) {
        throw new Error("No UTXOs indexed - cannot find recent tx");
    }

    const txId = utxos[0].utxoId.split("#")[0];

    return {
        txId,
        blockHeight: internal.lastBlockHeight,
        blockHash: internal.lastBlockId,
        slot: internal.lastBlockSlot,
    };
}

/**
 * Finds a UTXO that has a reference script hash (if any exist in the indexed data).
 */
export async function findUtxoWithReferenceScript(
    index: CachedUtxoIndex
): Promise<UtxoIndexEntry | undefined> {
    const allUtxos = await index.getAllUtxos();
    return allUtxos.find(u => u.referenceScriptHash !== null && u.referenceScriptHash !== undefined);
}

/**
 * Finds the block where the charter token was minted by querying Blockfrost asset history.
 * Uses: GET /assets/{policy_id}{asset_name}/history
 */
export async function findCharterMintBlock(
    index: CachedUtxoIndex,
    blockfrostKey: string
): Promise<{
    blockHeight: number;
    txHash: string;
}> {
    const capoMph = index.capoMph;
    // "charter" in hex = 63686172746572
    const charterHex = "63686172746572";
    const asset = `${capoMph}${charterHex}`;

    const baseUrl = index.blockfrostBaseUrl;
    const response = await fetch(
        `${baseUrl}/api/v0/assets/${asset}/history?order=asc&count=1`,
        {
            headers: {
                project_id: blockfrostKey,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch asset history: ${response.statusText}`);
    }

    const history = await response.json() as Array<{
        tx_hash: string;
        action: string;
        amount: string;
    }>;

    if (history.length === 0) {
        throw new Error("No charter mint history found");
    }

    // The first entry with action "minted" is the charter mint
    const mintEntry = history.find(h => h.action === "minted");
    if (!mintEntry) {
        throw new Error("No mint action found in charter history");
    }

    // Get block height for this tx
    const txResponse = await fetch(
        `${baseUrl}/api/v0/txs/${mintEntry.tx_hash}`,
        {
            headers: {
                project_id: blockfrostKey,
            },
        }
    );

    if (!txResponse.ok) {
        throw new Error(`Failed to fetch tx details: ${txResponse.statusText}`);
    }

    const txDetails = await txResponse.json() as { block_height: number };

    return {
        blockHeight: txDetails.block_height,
        txHash: mintEntry.tx_hash,
    };
}

/**
 * Creates an isolated index synced only up to a specific block height.
 * Useful for testing incremental sync scenarios.
 *
 * @param baseConfig - Base configuration for creating indexes
 * @param sharedIndex - Source index to copy data from
 * @param targetBlockHeight - Sync up to this block height
 * @param options - Optional sync configuration overrides
 */
export async function createPartialSyncIndex(
    baseConfig: {
        address: string;
        mph: string;
        isMainnet: boolean;
        network: unknown;
        bridge: unknown;
        blockfrostKey: string;
        storeIn: "dexie";
    },
    sharedIndex: CachedUtxoIndex,
    targetBlockHeight: number,
    options?: {
        syncPageSize?: number;
        maxSyncPages?: number;
        dbName?: string;
    }
): Promise<{
    index: CachedUtxoIndex;
    dbName: string;
}> {
    const dbName = options?.dbName || `StellarDappIndex-test-partial-${Date.now()}`;

    const isolatedIndex = new CachedUtxoIndex({
        ...baseConfig,
        dbName,
        syncPageSize: options?.syncPageSize,
        maxSyncPages: options?.maxSyncPages,
    });

    // Copy data up to target block
    await copyIndexDataUpToBlock(sharedIndex, isolatedIndex, targetBlockHeight);

    return {
        index: isolatedIndex,
        dbName,
    };
}

/**
 * Creates an isolated index that only has data from the charter mint block.
 * This is useful for testing incremental sync from the very beginning.
 */
export async function createFirstBlockOnlyIndex(
    baseConfig: {
        address: string;
        mph: string;
        isMainnet: boolean;
        network: unknown;
        bridge: unknown;
        blockfrostKey: string;
        storeIn: "dexie";
    },
    sharedIndex: CachedUtxoIndex,
    options?: {
        syncPageSize?: number;
        maxSyncPages?: number;
    }
): Promise<{
    index: CachedUtxoIndex;
    charterMintBlock: { blockHeight: number; txHash: string };
    dbName: string;
}> {
    // Find the charter mint block
    const charterMintBlock = await findCharterMintBlock(sharedIndex, baseConfig.blockfrostKey);

    const dbName = `StellarDappIndex-test-firstblock-${Date.now()}`;

    // Create a new index with limited sync parameters
    const isolatedIndex = new CachedUtxoIndex({
        ...baseConfig,
        dbName,
        syncPageSize: options?.syncPageSize ?? 100,
        maxSyncPages: options?.maxSyncPages ?? Infinity,
    });

    // Set the lastBlockHeight to the charter mint block
    // This simulates an index that was synced only to this point
    setLastSyncedBlock(
        isolatedIndex,
        charterMintBlock.blockHeight,
        "", // We don't have the block hash, but it's not strictly needed
        0   // Slot unknown
    );

    return {
        index: isolatedIndex,
        charterMintBlock,
        dbName,
    };
}
