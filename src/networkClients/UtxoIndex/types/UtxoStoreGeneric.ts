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
import type { ScriptIndexEntry } from "./ScriptIndexEntry.js";
import type { WalletAddressEntry } from "./WalletAddressEntry.js";
import type { RecordIndexEntry } from "./RecordIndexEntry.js";
import type { PendingTxEntry } from "./PendingTxEntry.js";

export interface UtxoStoreGeneric {
    // Logging
    log(id: string, message: string): Promise<void>;

    // Block operations
    findBlockId(blockId: string): Promise<BlockIndexEntry | undefined>;
    saveBlock(block: BlockIndexEntry): Promise<void>;
    getLatestBlock(): Promise<BlockIndexEntry | undefined>;
    // REQT/5d4f73c9bf (Last Processed Block) — processing cursor independent of chain tip
    getLastProcessedBlock(): Promise<BlockIndexEntry | undefined>;
    // REQT/9gq8rwg9ng (Block Recording) — retrieve unprocessed blocks in height order for processing
    getUnprocessedBlocks(): Promise<BlockIndexEntry[]>;

    // UTXO operations - uses storage-agnostic UtxoIndexEntry
    findUtxoId(utxoId: string): Promise<UtxoIndexEntry | undefined>;
    saveUtxo(entry: UtxoIndexEntry): Promise<void>;
    // REQT/hhbcnvd9aj: Mark a UTXO as spent by recording the spending tx hash
    markUtxoSpent(utxoId: string, spentInTx: string): Promise<void>;
    deleteUtxo(utxoId: string): Promise<void>;

    // Transaction operations
    findTxId(txId: string): Promise<TxIndexEntry | undefined>;
    saveTx(tx: TxIndexEntry): Promise<void>;

    // Script operations - REQT/k2wvnd3f1e (Script Storage)
    findScript(scriptHash: string): Promise<ScriptIndexEntry | undefined>;
    saveScript(script: ScriptIndexEntry): Promise<void>;

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

    // REQT/620ypcc34d: Wallet Address Storage
    findWalletAddress(address: string): Promise<WalletAddressEntry | undefined>;
    saveWalletAddress(entry: WalletAddressEntry): Promise<void>;
    getAllWalletAddresses(): Promise<WalletAddressEntry[]>;

    // REQT/8a4jkznm6a: Record Storage for parsed delegated-data
    saveRecord(record: RecordIndexEntry): Promise<void>;
    findRecord(id: string): Promise<RecordIndexEntry | undefined>;
    findRecordsByType(
        type: string,
        options?: { limit?: number; offset?: number }
    ): Promise<RecordIndexEntry[]>;
    // REQT/8a4jkznm6a: Query UTXOs by blockHeight for catchup processing
    findUtxosByBlockHeightRange(
        minBlockHeight: number,
        options?: { withInlineDatum?: boolean; unspentOnly?: boolean }
    ): Promise<UtxoIndexEntry[]>;

    // REQT/38d4zc2qrx: Metadata for parsed block height tracking
    getLastParsedBlockHeight(): Promise<number>;
    setLastParsedBlockHeight(height: number): Promise<void>;

    // =========================================================================
    // REQT/kd9xwtg4df: Pending Transaction CRUD
    // =========================================================================
    savePendingTx(entry: PendingTxEntry): Promise<void>;
    findPendingTx(txHash: string): Promise<PendingTxEntry | undefined>;
    getPendingByStatus(status: string): Promise<PendingTxEntry[]>;
    setPendingTxStatus(txHash: string, status: string): Promise<void>;

    // REQT/p0nt8nwtxj: Rollback Store Operations
    /** Nullify spentInTx on UTXOs where spentInTx === txHash */
    clearSpentByTx(txHash: string): Promise<void>;
    /** Remove UTXOs where utxoId starts with txHash# */
    deleteUtxosByTxHash(txHash: string): Promise<void>;
    /** Remove records where utxoId starts with txHash# */
    deleteRecordsByTxHash(txHash: string): Promise<void>;

    // REQT/h4m8p3x16c: Purge Operation
    /** Delete PendingTxEntry rows where status !== "pending" and submittedAt < olderThan */
    purgeOldPendingTxs(olderThan: number): Promise<void>;
}
