import Dexie, { type EntityTable } from "dexie";

import { nanoid } from "../../util/nanoid.js";
import type { UtxoStoreGeneric } from "./types/UtxoStoreGeneric.js";
import type { UtxoIndexEntry } from "./types/UtxoIndexEntry.js";
import type { BlockIndexEntry } from "./types/BlockIndexEntry.js";
import type { TxIndexEntry } from "./types/TxIndexEntry.js";
import type { ScriptIndexEntry } from "./types/ScriptIndexEntry.js";
import type { WalletAddressEntry } from "./types/WalletAddressEntry.js";
import type { RecordIndexEntry } from "./types/RecordIndexEntry.js";
import type { PendingTxEntry } from "./types/PendingTxEntry.js";
import type { MetadataEntry } from "./types/MetadataEntry.js";
import { dexieBlockDetails } from "./dexieRecords/BlockDetails.js";
import { indexerLogs } from "./dexieRecords/Logs.js";
import { dexieUtxoDetails } from "./dexieRecords/UtxoDetails.js";

const DEFAULT_DB_NAME = "StellarDappIndex-v0.1";

/**
 * Dexie/IndexedDB implementation of UtxoStoreGeneric.
 *
 * CONSTRAINT: This class has NO imports from @helios-lang/* or blockfrostTypes/*.
 * It works only with storage-agnostic types from ./types/.
 *
 * REQT/6h4f158gvs (Database Definition)
 */
export class DexieUtxoStore extends Dexie implements UtxoStoreGeneric {
    blocks!: EntityTable<dexieBlockDetails, "hash">;
    utxos!: EntityTable<dexieUtxoDetails, "utxoId">;
    txs!: EntityTable<TxIndexEntry, "txid">;
    scripts!: EntityTable<ScriptIndexEntry, "scriptHash">;
    walletAddresses!: EntityTable<WalletAddressEntry, "address">;
    records!: EntityTable<RecordIndexEntry, "id">;  // REQT/8a4jkznm6a
    pendingTxs!: EntityTable<PendingTxEntry, "txHash">;  // REQT/yz1ymcenzx
    metadata!: EntityTable<MetadataEntry, "key">;   // REQT/38d4zc2qrx
    logs!: EntityTable<indexerLogs, "logId">;

    pid: number = 0;

    constructor(dbName: string = DEFAULT_DB_NAME) {
        super(dbName);

        // Schema v1: Initial schema
        this.version(1).stores({
            blocks: "hash, height",
            utxos: "utxoId, *uutIds, address",
            txs: "txid",
            scripts: "scriptHash",
            walletAddresses: "address",
            logs: "logId, [pid+time]",
        });

        // Schema v2: REQT/6h4f158gvs — add blockHeight index to utxos
        // REQT/8a4jkznm6a — add records table for parsed delegated-data
        // REQT/38d4zc2qrx — add metadata table for lastParsedBlockHeight tracking
        this.version(2).stores({
            blocks: "hash, height",
            utxos: "utxoId, *uutIds, address, blockHeight",
            txs: "txid",
            scripts: "scriptHash",
            walletAddresses: "address",
            records: "id, utxoId, type",
            metadata: "key",
            logs: "logId, [pid+time]",
        }).upgrade(tx => {
            // Backfill blockHeight=0 for existing UTXOs that don't have it
            return tx.table("utxos").toCollection().modify(utxo => {
                if (utxo.blockHeight === undefined || utxo.blockHeight === null) {
                    utxo.blockHeight = 0;
                }
            });
        });

        // Schema v3: REQT/yz1ymcenzx — add pendingTxs table for in-flight transaction tracking
        // REQT/5skb90kx7n — add spentInTx index to utxos for efficient rollback queries
        // (IndexedDB excludes null values from indexes, so cost is minimal — only spent entries indexed)
        this.version(3).stores({
            blocks: "hash, height",
            utxos: "utxoId, *uutIds, address, blockHeight, spentInTx",
            txs: "txid",
            scripts: "scriptHash",
            walletAddresses: "address",
            records: "id, utxoId, type",
            pendingTxs: "txHash, status",
            metadata: "key",
            logs: "logId, [pid+time]",
        });

        // Schema v4: REQT/9gq8rwg9ng — add [state+height] compound index to blocks
        // for efficient getLastProcessedBlock() queries (processing cursor).
        // REQT/58b9nzgcbj — confirmedAtBlockHeight and confirmState on pendingTxs
        // (optional fields, no index needed — queried by txHash PK).
        this.version(4).stores({
            blocks: "hash, [state+height]",
            utxos: "utxoId, *uutIds, address, blockHeight, spentInTx",
            txs: "txid",
            scripts: "scriptHash",
            walletAddresses: "address",
            records: "id, utxoId, type",
            pendingTxs: "txHash, status",
            metadata: "key",
            logs: "logId, [pid+time]",
        });

        this.blocks.mapToClass(dexieBlockDetails);
        this.utxos.mapToClass(dexieUtxoDetails);
        this.logs.mapToClass(indexerLogs);

        this.initializing = this.init();
        this.initializing.then((pid) => {
            console.log(`DexieUtxoStore initialized with pid: ${pid}`);
        });
    }

    initializing: Promise<number> | undefined;

    // REQT/cm9ez5thxz (Process ID Management)
    async init(): Promise<number> {
        if (this.initializing) {
            return this.initializing;
        }
        const maxPid = await this.logs
            .orderBy("pid")
            .reverse()
            .limit(1)
            .first();
        if (!maxPid) {
            this.pid = 1;
            return 1;
        }
        this.pid = 1 + maxPid.pid;
        this.initializing = undefined;
        return this.pid;
    }

    // REQT/p7ryk4ztes (Logging Implementation)
    async log(id: string, message: string): Promise<void> {
        const location = new Error().stack!.split("\n")[2]!.trim();
        const pid = this.initializing ? await this.initializing : this.pid;

        console.log(`${id}: ${message}`);
        // Use nanoid to generate unique logId, concatenated with the short id for readability
        const logId = `${id}-${nanoid()}`;
        await this.logs.add(
            {
                logId,
                pid,
                time: Date.now(),
                location,
                message,
            },
        );
    }

    // REQT/76e18y06kp (Block Storage)
    async findBlockId(blockId: string): Promise<BlockIndexEntry | undefined> {
        return await this.blocks.where("hash").equals(blockId).first();
    }

    async findBlockByHeight(height: number): Promise<BlockIndexEntry | undefined> {
        // Check processed first, then unprocessed
        const processed = await this.blocks.where("[state+height]")
            .equals(["processed", height]).first();
        if (processed) return processed;
        return this.blocks.where("[state+height]")
            .equals(["unprocessed", height]).first();
    }

    async saveBlock(block: BlockIndexEntry): Promise<void> {
        await this.blocks.put(block as dexieBlockDetails);
    }

    async getLatestBlock(): Promise<BlockIndexEntry | undefined> {
        // Find the highest block that's still valid (not rolled back).
        // Uses compound index [state+height] — check unprocessed and processed states.
        const [unprocessed, processed] = await Promise.all([
            this.blocks.where("[state+height]")
                .between(["unprocessed", -Infinity], ["unprocessed", Infinity])
                .reverse().first(),
            this.blocks.where("[state+height]")
                .between(["processed", -Infinity], ["processed", Infinity])
                .reverse().first(),
        ]);
        if (!unprocessed) return processed;
        if (!processed) return unprocessed;
        return unprocessed.height > processed.height ? unprocessed : processed;
    }

    // REQT/5d4f73c9bf (Last Processed Block) — processing cursor independent of chain tip
    // Uses compound index [state, height] for efficient query: find highest-height "processed" block
    async getLastProcessedBlock(): Promise<BlockIndexEntry | undefined> {
        return await this.blocks
            .where("[state+height]")
            .between(["processed", -Infinity], ["processed", Infinity])
            .reverse()
            .first();
    }

    // REQT/9gq8rwg9ng (Block Recording) — unprocessed blocks sorted by height ascending
    async getUnprocessedBlocks(): Promise<BlockIndexEntry[]> {
        return await this.blocks
            .where("[state+height]")
            .between(["unprocessed", -Infinity], ["unprocessed", Infinity])
            .toArray();
    }

    // REQT/1gw45sp198 (UTXO Storage)
    async findUtxoId(utxoId: string): Promise<UtxoIndexEntry | undefined> {
        return await this.utxos.where("utxoId").equals(utxoId).first();
    }

    async saveUtxo(entry: UtxoIndexEntry): Promise<void> {
        await this.utxos.put(entry as dexieUtxoDetails);
    }

    // REQT/hhbcnvd9aj: Mark a UTXO as spent
    async deleteUtxo(utxoId: string): Promise<void> {
        await this.utxos.where("utxoId").equals(utxoId).delete();
    }

    async markUtxoSpent(utxoId: string, spentInTx: string): Promise<void> {
        await this.utxos.where("utxoId").equals(utxoId).modify({ spentInTx });

        // NOTE: It may seem intuitive to cascade spent state to records here
        // (markRecordSpent), but this is a no-op in the common case and wrong
        // in edge cases:
        //
        // - UPDATE case: The processing-order invariant ensures outputs are
        //   indexed (and records saved) BEFORE inputs are marked spent. By the
        //   time we get here, the old record has already been overwritten by
        //   saveRecord() (records use `id` as PK). The old utxoId no longer
        //   matches any record — markRecordSpent finds nothing.
        //
        // - DELETE case: The record is not overwritten, so markRecordSpent
        //   WOULD find it. But the record should remain queryable until the
        //   tx is confirmed — marking it spent here would hide it prematurely
        //   for pending txs. The record's visibility is already governed by
        //   the UTXO layer: query methods that return FoundDatumUtxo filter
        //   on the UTXO's spentInTx, so the record becomes unreachable
        //   through normal query paths without needing its own spentInTx set.
        //
        // Previously: await this.markRecordSpent(utxoId, spentInTx);
    }

    // REQT/cchf3wgnk3 (UUT Catalog Storage) - query UTXOs by UUT identifier
    // REQT/g3jen1rcvd: Filter out spent UTXOs
    async findUtxoByUUT(uutId: string): Promise<UtxoIndexEntry | undefined> {
        const results = await this.utxos.where("uutIds").equals(uutId).toArray();
        // Return first unspent UTXO with this UUT
        return results.find(u => u.spentInTx === null || u.spentInTx === undefined);
    }

    // REQT/nm2ed7m80y (Transaction Storage)
    async findTxId(txId: string): Promise<TxIndexEntry | undefined> {
        return await this.txs.where("txid").equals(txId).first();
    }

    async saveTx(tx: TxIndexEntry): Promise<void> {
        await this.txs.put(tx);
    }

    // REQT/k2wvnd3f1e (Script Storage)
    async findScript(scriptHash: string): Promise<ScriptIndexEntry | undefined> {
        return await this.scripts.where("scriptHash").equals(scriptHash).first();
    }

    async saveScript(script: ScriptIndexEntry): Promise<void> {
        await this.scripts.put(script);
    }

    // REQT/50zkk5xgrx: Query API Methods
    // REQT/g3jen1rcvd: All query methods filter out spent UTXOs

    async findUtxosByAsset(
        policyId: string,
        tokenName?: string,
        options?: { limit?: number; offset?: number }
    ): Promise<UtxoIndexEntry[]> {
        const { limit = 100, offset = 0 } = options ?? {};

        // Get all UTXOs and filter by asset - Dexie doesn't have a native
        // way to query nested array fields, so we filter in memory
        const allUtxos = await this.utxos.toArray();

        const filtered = allUtxos.filter((utxo) => {
            // Filter out spent UTXOs
            if (utxo.spentInTx !== null && utxo.spentInTx !== undefined) return false;
            return utxo.tokens.some((token) => {
                if (token.policyId !== policyId) return false;
                if (tokenName !== undefined && token.tokenName !== tokenName)
                    return false;
                return true;
            });
        });

        return filtered.slice(offset, offset + limit);
    }

    async findUtxosByAddress(
        address: string,
        options?: { limit?: number; offset?: number }
    ): Promise<UtxoIndexEntry[]> {
        const { limit = 100, offset = 0 } = options ?? {};

        const results = await this.utxos
            .where("address")
            .equals(address)
            .toArray();

        // Filter out spent UTXOs, then apply pagination
        const unspent = results.filter(u => u.spentInTx === null || u.spentInTx === undefined);
        return unspent.slice(offset, offset + limit);
    }

    async getAllUtxos(options?: {
        limit?: number;
        offset?: number;
    }): Promise<UtxoIndexEntry[]> {
        const { limit = 100, offset = 0 } = options ?? {};

        const allUtxos = await this.utxos.toArray();
        // Filter out spent UTXOs, then apply pagination
        const unspent = allUtxos.filter(u => u.spentInTx === null || u.spentInTx === undefined);
        return unspent.slice(offset, offset + limit);
    }

    // REQT/620ypcc34d: Wallet Address Storage
    async findWalletAddress(
        address: string
    ): Promise<WalletAddressEntry | undefined> {
        return await this.walletAddresses
            .where("address")
            .equals(address)
            .first();
    }

    async saveWalletAddress(entry: WalletAddressEntry): Promise<void> {
        await this.walletAddresses.put(entry);
    }

    async getAllWalletAddresses(): Promise<WalletAddressEntry[]> {
        return await this.walletAddresses.toArray();
    }

    // =========================================================================
    // REQT/8a4jkznm6a: Record Storage for parsed delegated-data
    // =========================================================================

    async saveRecord(record: RecordIndexEntry): Promise<void> {
        await this.records.put(record);
    }

    // REQT/gdmdg66paw: Record query methods
    async findRecord(id: string): Promise<RecordIndexEntry | undefined> {
        return await this.records.where("id").equals(id).first();
    }

    // REQT/gdmdg66paw: Record query methods
    async findRecordsByType(
        type: string,
        options?: { limit?: number; offset?: number }
    ): Promise<RecordIndexEntry[]> {
        const { limit = 100, offset = 0 } = options ?? {};
        const results = await this.records
            .where("type")
            .equals(type)
            .toArray();
        return results.slice(offset, offset + limit);
    }

    // REQT/3aew7g7wdw: Query UTXOs by blockHeight for catchup processing
    async findUtxosByBlockHeightRange(
        minBlockHeight: number,
        options?: { withInlineDatum?: boolean; unspentOnly?: boolean }
    ): Promise<UtxoIndexEntry[]> {
        const { withInlineDatum = false, unspentOnly = false } = options ?? {};
        let results: UtxoIndexEntry[];

        if (minBlockHeight === 0) {
            // When minBlockHeight is 0 (first catchup), get ALL UTXOs
            results = await this.utxos.toArray();
        } else {
            // Use the blockHeight index for efficient range query
            results = await this.utxos
                .where("blockHeight")
                .above(minBlockHeight)
                .toArray();
        }

        // Apply filters
        if (withInlineDatum) {
            results = results.filter(u => u.inlineDatum !== null && u.inlineDatum !== undefined);
        }
        if (unspentOnly) {
            results = results.filter(u => u.spentInTx === null || u.spentInTx === undefined);
        }
        return results;
    }

    // =========================================================================
    // REQT/38d4zc2qrx: Metadata for parsed block height tracking
    // =========================================================================

    async getLastParsedBlockHeight(): Promise<number> {
        const entry = await this.metadata
            .where("key")
            .equals("lastParsedBlockHeight")
            .first();
        return entry ? parseInt(entry.value, 10) : 0;
    }

    async setLastParsedBlockHeight(height: number): Promise<void> {
        await this.metadata.put({
            key: "lastParsedBlockHeight",
            value: String(height),
        });
    }

    // =========================================================================
    // REQT/9d83h3a7df: Pending Tx CRUD Implementation
    // =========================================================================

    async savePendingTx(entry: PendingTxEntry): Promise<void> {
        await this.pendingTxs.put(entry);
    }

    async findPendingTx(txHash: string): Promise<PendingTxEntry | undefined> {
        return await this.pendingTxs.where("txHash").equals(txHash).first();
    }

    async getPendingByStatus(status: string): Promise<PendingTxEntry[]> {
        return await this.pendingTxs.where("status").equals(status).toArray();
    }

    async setPendingTxStatus(txHash: string, status: string): Promise<void> {
        await this.pendingTxs.where("txHash").equals(txHash).modify({
            status: status as PendingTxEntry["status"],
        });
    }

    // =========================================================================
    // REQT/5skb90kx7n: Rollback Operations Implementation
    // =========================================================================

    /**
     * Nullify spentInTx on UTXOs where spentInTx === txHash.
     * Uses the spentInTx index for efficient rollback query.
     */
    async clearSpentByTx(txHash: string): Promise<void> {
        // REQT/5skb90kx7n: Use spentInTx index for efficient rollback query
        await this.utxos
            .where("spentInTx")
            .equals(txHash)
            .modify({ spentInTx: null });
    }

    /** Diagnostic: find UTXOs that would be affected by clearSpentByTx */
    async findUtxosSpentByTx(txHash: string): Promise<UtxoIndexEntry[]> {
        return this.utxos
            .where("spentInTx")
            .equals(txHash)
            .toArray();
    }

    /**
     * Remove UTXOs where utxoId starts with txHash#.
     * These are pending-origin outputs that should be deleted on rollback.
     * Uses PK range query: '#' (0x23) < '$' (0x24) in ASCII, so
     * between("txHash#", "txHash$") captures all "txHash#N" entries.
     */
    async deleteUtxosByTxHash(txHash: string): Promise<void> {
        // REQT/5skb90kx7n: Delete pending-origin UTXOs by txHash prefix
        await this.utxos
            .where("utxoId")
            .between(`${txHash}#`, `${txHash}$`, true, false)
            .delete();
    }

    /** Diagnostic: find UTXOs that would be deleted by deleteUtxosByTxHash */
    async findUtxosByTxHash(txHash: string): Promise<UtxoIndexEntry[]> {
        return this.utxos
            .where("utxoId")
            .between(`${txHash}#`, `${txHash}$`, true, false)
            .toArray();
    }

    /**
     * Remove records where utxoId starts with txHash#.
     * These are pending-origin records that should be deleted on rollback.
     * Uses utxoId index range query for efficiency.
     */
    async deleteRecordsByTxHash(txHash: string): Promise<void> {
        // REQT/5skb90kx7n: Delete pending-origin records by txHash prefix
        await this.records
            .where("utxoId")
            .between(`${txHash}#`, `${txHash}$`, true, false)
            .delete();
    }

    /** Diagnostic: find records that would be deleted by deleteRecordsByTxHash */
    async findRecordsByTxHash(txHash: string): Promise<{ id: string; type: string; utxoId: string }[]> {
        return this.records
            .where("utxoId")
            .between(`${txHash}#`, `${txHash}$`, true, false)
            .toArray();
    }

    // =========================================================================
    // REQT/5799nq1d0x: Purge Implementation
    // =========================================================================

    /**
     * Delete PendingTxEntry rows that have reached terminal confidence and are old enough.
     * Only purges: rolled-back entries (after 2 weeks), and confirmed entries at "certain"
     * confidence (after 72h). Entries still progressing through confirmation states are
     * retained regardless of age.
     */
    async purgeOldPendingTxs(certainOlderThan: number, rolledBackOlderThan: number): Promise<void> {
        // REQT/5799nq1d0x: Purge old entries at terminal confidence only
        const candidates = await this.pendingTxs.toArray();
        const toDelete = candidates
            .filter(e => {
                // Rolled-back entries purgeable after 2 weeks (recovery window)
                if (e.status === "rolled-back" && e.submittedAt < rolledBackOlderThan) return true;
                // Confirmed entries only purgeable at "certain" confidence after 72h
                if (e.status === "confirmed" && e.confirmState === "certain" && e.submittedAt < certainOlderThan) return true;
                return false;
            })
            .map(e => e.txHash);
        if (toDelete.length > 0) {
            await this.pendingTxs.bulkDelete(toDelete);
        }
    }
}
