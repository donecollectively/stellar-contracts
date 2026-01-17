/**
 * Storage abstraction interface for UtxoIndex.
 *
 * CONSTRAINT: This interface uses ONLY types from ./types/.
 * NO imports from @helios-lang/* or blockfrostTypes/*.
 *
 * REQT/nhbqmacrwn (Interface Methods)
 */

import type { UtxoIndexEntry } from "./UtxoIndexEntry.js";
import type { BlockIndexEntry } from "./BlockIndexEntry.js";
import type { TxIndexEntry } from "./TxIndexEntry.js";

export interface UtxoStoreGeneric {
    // Logging
    log(id: string, message: string): Promise<void>;

    // Block operations
    findBlockId(blockId: string): Promise<BlockIndexEntry | undefined>;
    saveBlock(block: BlockIndexEntry): Promise<void>;
    getLatestBlock(): Promise<BlockIndexEntry | undefined>;

    // UTXO operations - uses storage-agnostic UtxoIndexEntry
    findUtxoId(utxoId: string): Promise<UtxoIndexEntry | undefined>;
    saveUtxo(entry: UtxoIndexEntry): Promise<void>;

    // Transaction operations
    findTxId(txId: string): Promise<TxIndexEntry | undefined>;
    saveTx(tx: TxIndexEntry): Promise<void>;

    // UUT lookup via multiEntry index on uutIds
    // REQT/cchf3wgnk3 (UUT Catalog Storage)
    findUtxoByUUT(uutId: string): Promise<UtxoIndexEntry | undefined>;

    // REQT/50zkk5xgrx: Query API Methods with pagination support
    findUtxosByAsset(
        policyId: string,
        tokenName?: string,
        options?: { limit?: number; offset?: number }
    ): Promise<UtxoIndexEntry[]>;

    findUtxosByAddress(
        address: string,
        options?: { limit?: number; offset?: number }
    ): Promise<UtxoIndexEntry[]>;

    getAllUtxos(options?: {
        limit?: number;
        offset?: number;
    }): Promise<UtxoIndexEntry[]>;
}
