import Dexie, { type EntityTable } from "dexie";

import { nanoid } from "../../util/nanoid.js";
import type { UtxoStoreGeneric } from "./types/UtxoStoreGeneric.js";
import type { UtxoIndexEntry } from "./types/UtxoIndexEntry.js";
import type { BlockIndexEntry } from "./types/BlockIndexEntry.js";
import type { TxIndexEntry } from "./types/TxIndexEntry.js";
import { dexieBlockDetails } from "./dexieRecords/BlockDetails.js";
import { indexerLogs } from "./dexieRecords/Logs.js";
import { dexieUtxoDetails } from "./dexieRecords/UtxoDetails.js";

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
    logs!: EntityTable<indexerLogs, "logId">;

    pid: number = 0;

    constructor() {
        super("StellarDappIndex-v0.1");

        // Schema v1: initial schema
        this.version(1).stores({
            blocks: "hash, height",
            utxos: "utxoId, blockHeight",
            txs: "txid",
            logs: "logId,[pid,time]",
        });

        // Schema v2: adds *uutIds multiEntry index for fast UUT lookups
        // REQT/nt1pqd3m3z (UUT Catalog Entity)
        this.version(2).stores({
            blocks: "hash, height",
            utxos: "utxoId, *uutIds",
            txs: "txid",
            logs: "logId,[pid,time]",
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
        await this.logs.add(
            {
                logId: id,
                pid,
                time: Date.now(),
                location,
                message,
            },
        );
    }

    // REQT/76e18y06kp (Block Storage)
    async findBlockByBlockId(blockId: string): Promise<BlockIndexEntry | undefined> {
        return await this.blocks.where("hash").equals(blockId).first();
    }

    async saveBlock(block: BlockIndexEntry): Promise<void> {
        await this.blocks.put(block as dexieBlockDetails);
    }

    // REQT/1gw45sp198 (UTXO Storage)
    async findUtxoByUtxoId(utxoId: string): Promise<UtxoIndexEntry | undefined> {
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
    async findTxById(txId: string): Promise<TxIndexEntry | undefined> {
        return await this.txs.where("txid").equals(txId).first();
    }

    async saveTx(tx: TxIndexEntry): Promise<void> {
        await this.txs.put(tx);
    }
}
