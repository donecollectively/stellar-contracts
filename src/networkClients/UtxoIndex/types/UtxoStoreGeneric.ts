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
import type { PendingTxEntry, SubmissionLogEntry } from "./PendingTxEntry.js";
import type { LogLevel, LogEntry } from "./LogEntry.js";

export interface UtxoStoreGeneric {
    // Logging
    log(id: string, message: string, level?: LogLevel, parentLogId?: string, callerLocation?: string): Promise<string>;
    /** Query log entries ordered by time. Pass pid:"all" for cross-pid queries. */
    getLogs(options?: { since?: number; level?: LogLevel; pid?: number | "all" }): Promise<LogEntry[]>;

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

    /** Targeted single-field update on a PendingTxEntry — avoids full-record overwrite
     *  that would clobber concurrently-appended submissionLog entries. */
    updatePendingTxField<K extends keyof PendingTxEntry>(
        txHash: string, field: K, value: PendingTxEntry[K]
    ): Promise<void>;

    // REQT/j5pwm8btay (Append Submission Log) — atomic append to PendingTxEntry.submissionLog
    appendSubmissionLog(txHash: string, entry: SubmissionLogEntry): Promise<void>;

    // REQT/p0nt8nwtxj: Rollback Store Operations
    /** Nullify spentInTx on UTXOs where spentInTx === txHash */
    clearSpentByTx(txHash: string): Promise<void>;
    /** Remove UTXOs where utxoId starts with txHash# */
    deleteUtxosByTxHash(txHash: string): Promise<void>;
    /** Remove records where utxoId starts with txHash# */
    deleteRecordsByTxHash(txHash: string): Promise<void>;

    // Block lookup
    findBlockByHeight(height: number): Promise<BlockIndexEntry | undefined>;

    // Diagnostic queries (rollback investigation)
    findUtxosSpentByTx(txHash: string): Promise<UtxoIndexEntry[]>;
    findUtxosByTxHash(txHash: string): Promise<UtxoIndexEntry[]>;
    findRecordsByTxHash(txHash: string): Promise<{ id: string; type: string; utxoId: string }[]>;

    // REQT/c3ytg4rttd: Depth-based deadline check — find the first processed block at or after a slot
    /** Find the lowest-height processed block whose slot >= the given slot.
     * Returns undefined if no such block exists (deadline not yet reached in processed blocks).
     * Used to map a deadline slot to a block height for depth comparison.
     */
    findFirstProcessedBlockAtOrAfterSlot(slot: number): Promise<BlockIndexEntry | undefined>;

    // REQT/h4m8p3x16c: Purge Operation
    /** Delete PendingTxEntry rows at terminal confidence: confirmed+certain older than certainOlderThan, rolled-back older than rolledBackOlderThan */
    purgeOldPendingTxs(certainOlderThan: number, rolledBackOlderThan: number): Promise<void>;

    // =========================================================================
    // Generic metadata access (key-value store for coordination signals)
    // =========================================================================

    /** Read a metadata value by key. Returns undefined if the key doesn't exist. */
    getMetadata(key: string): Promise<string | undefined>;

    /** Write a metadata value by key. Creates the key if it doesn't exist, overwrites if it does. */
    setMetadata(key: string, value: string): Promise<void>;

    // =========================================================================
    // REQT/3c2s5nryvn: Sync Mutex (Multi-Tab Coordination)
    // =========================================================================

    /**
     * Attempt to acquire the sync mutex via compare-and-swap.
     * Succeeds if the mutex is absent, stale (older than stalenessMs), or already owned by this pid.
     * When already owned by this pid, freshens the timestamp (acts as freshen).
     * MUST be atomic (e.g., inside a Dexie transaction) to prevent TOCTOU races.
     *
     * REQT/f3w3hkjt4t (Mutex Acquisition)
     */
    tryAcquireSyncMutex(pid: number, stalenessMs: number): Promise<boolean>;

    /**
     * Update the mutex timestamp if this pid currently owns it.
     * Returns false if the mutex is not owned by this pid.
     *
     * REQT/ekyatca2kq (Mutex Freshening)
     */
    freshenSyncMutex(pid: number): Promise<boolean>;

    /**
     * Release the sync mutex if this pid currently owns it.
     * Returns false if the mutex is not owned by this pid.
     *
     * REQT/e0rzdrc7ts (Graceful Release)
     */
    releaseSyncMutex(pid: number): Promise<boolean>;

    // =========================================================================
    // REQT/4tsvn6259v: Write Lock (Multi-Step Write Atomicity)
    // =========================================================================

    /**
     * Acquires a cross-tab write lock, executes the callback, and releases the lock.
     * For transactional stores (e.g., Dexie), the callback additionally runs inside
     * a native transaction for atomicity and rollback on error.
     * The `tables` parameter declares which store tables the callback will write to.
     * Implementations SHOULD automatically include infrastructure tables (metadata, logs).
     * Stale locks (>1s) are automatically broken.
     *
     * REQT/4tsvn6259v (withWriteLock API)
     * REQT/jb5dhgsyfq (Lock Protocol)
     * REQT/r7t394zt2x (Dexie Transaction Shim)
     * REQT/n11m1k9wvg (Non-Transactional Store Compatibility)
     */
    withWriteLock<T>(pid: number, activityName: string, tables: string[], callback: () => Promise<T>): Promise<T>;
}
