import Dexie, { type EntityTable } from "dexie";

import { nanoid } from "../../util/nanoid.js";
import type { UtxoStoreGeneric } from "./types/UtxoStoreGeneric.js";
import type { UtxoIndexEntry } from "./types/UtxoIndexEntry.js";
import type { BlockIndexEntry } from "./types/BlockIndexEntry.js";
import type { TxIndexEntry } from "./types/TxIndexEntry.js";
import type { ScriptIndexEntry } from "./types/ScriptIndexEntry.js";
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
    logs!: EntityTable<indexerLogs, "logId">;

    pid: number = 0;

    constructor(dbName: string = DEFAULT_DB_NAME) {
        super(dbName);

        // Schema v1: Complete schema with all tables and indexes
        // - blocks: block metadata indexed by hash and height
        // - utxos: UTXO data with *uutIds multiEntry index (REQT/nt1pqd3m3z) and address index (REQT/50zkk5xgrx)
        // - txs: transaction CBOR indexed by txid
        // - scripts: reference script CBOR indexed by scriptHash (REQT/k2wvnd3f1e)
        // - logs: operational logs indexed by logId and [pid,time]
        this.version(1).stores({
            blocks: "hash, height",
            utxos: "utxoId, *uutIds, address",
            txs: "txid",
            scripts: "scriptHash",
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

    async saveBlock(block: BlockIndexEntry): Promise<void> {
        await this.blocks.put(block as dexieBlockDetails);
    }

    async getLatestBlock(): Promise<BlockIndexEntry | undefined> {
        return await this.blocks
            .orderBy("height")
            .reverse()
            .limit(1)
            .first();
    }

    // REQT/1gw45sp198 (UTXO Storage)
    async findUtxoId(utxoId: string): Promise<UtxoIndexEntry | undefined> {
        return await this.utxos.where("utxoId").equals(utxoId).first();
    }

    async saveUtxo(entry: UtxoIndexEntry): Promise<void> {
        await this.utxos.put(entry as dexieUtxoDetails);
    }

    // REQT/cchf3wgnk3 (UUT Catalog Storage) - query UTXOs by UUT identifier
    async findUtxoByUUT(uutId: string): Promise<UtxoIndexEntry | undefined> {
        return await this.utxos.where("uutIds").equals(uutId).first();
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

        return await this.utxos
            .where("address")
            .equals(address)
            .offset(offset)
            .limit(limit)
            .toArray();
    }

    async getAllUtxos(options?: {
        limit?: number;
        offset?: number;
    }): Promise<UtxoIndexEntry[]> {
        const { limit = 100, offset = 0 } = options ?? {};

        return await this.utxos.offset(offset).limit(limit).toArray();
    }
}
