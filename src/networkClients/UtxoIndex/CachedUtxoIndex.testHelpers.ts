/**
 * Test helpers for CachedUtxoIndex
 *
 * These utilities provide access to internal state and bulk operations
 * needed for testing, without polluting the main class API.
 */

import Dexie from "dexie";
import type { CachedUtxoIndex } from "./CachedUtxoIndex.js";
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
    lastSlot: number;
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
    internal.lastSlot = slot;
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
        sourceInternal.lastSlot
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
 * Creates a registry for tracking isolated database names for cleanup.
 */
export function createDbCleanupRegistry(): {
    register: (dbName: string) => void;
    cleanup: () => Promise<void>;
    getNames: () => string[];
} {
    const dbNames: Set<string> = new Set();

    return {
        register(dbName: string) {
            dbNames.add(dbName);
        },
        async cleanup() {
            for (const dbName of dbNames) {
                try {
                    await Dexie.delete(dbName);
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }
            dbNames.clear();
        },
        getNames() {
            return [...dbNames];
        },
    };
}
