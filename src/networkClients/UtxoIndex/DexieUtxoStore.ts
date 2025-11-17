import Dexie, { type EntityTable, type Table } from "dexie";

import { nanoid } from "../../util/nanoid.js";
import type { txCBOR, UtxoStoreGeneric } from "./UtxoStoreGeneric";
import type { UtxoDetailsType } from "./blockfrostTypes/UtxoDetails";
import {dexieBlockDetails} from "./dexieRecords/BlockDetails.js";
import { indexerLogs } from "./dexieRecords/Logs";
import {dexieUtxoDetails} from "./dexieRecords/UtxoDetails.js";

const pid = nanoid()

export class DexieUtxoStore extends Dexie implements UtxoStoreGeneric {
    blocks!: EntityTable<dexieBlockDetails, "hash">;
    utxos!: EntityTable<dexieUtxoDetails, "utxoId">;
    txs!: EntityTable<txCBOR, "txid">;
    logs!: EntityTable<indexerLogs, "logId">;
    
    pid: number = 0;
    constructor() {
        super("StellarDappIndex-v0.1");
        this.version(1).stores({
            blocks: "hash, height",
            utxos: "utxoId, blockId, blockHeight",
            txs: "txid",
            logs: "logId,[pid,time]",
        });
        this.blocks.mapToClass(dexieBlockDetails);
        this.utxos.mapToClass(dexieUtxoDetails);
        this.logs.mapToClass(indexerLogs);
        // finds max pid in logs:
        // this.txs.mapToClass(txCBOR);
        this.initializing = this.init()
        this.initializing.then((pid) => {
            console.log(`DexieUtxoStore initialized with pid: ${pid}`);
        });
    }
    initializing : Promise<number> | undefined;
    async init() {
        if (this.initializing) {
            return this.initializing;
        }
        const maxPid = await this.logs.orderBy("pid").reverse().limit(1).first();
        if (!maxPid) {
            this.pid = 1;
            return 1;
        }
        this.pid = 1+maxPid.pid;
        this.initializing = undefined;
        return this.pid
    }

    async log(id, message: string): Promise<any> {
        const location = new Error().stack!.split("\n")[2]!.trim();
        const pid = this.initializing ? await this.initializing : this.pid;

        console.log(`${id}: ${message}`);
        return this.logs.add({
            pid, 
            time: Date.now(), 
            location,
            message 
        }, id);
    }

    async findBlockByBlockId(blockId: string): Promise<dexieBlockDetails | undefined> {
        return await this.blocks.where("hash").equals(blockId).first();
    }

    async saveBlock(block: dexieBlockDetails): Promise<void> {
        await this.blocks.put(block);
    }

    async findUtxoByUtxoId(utxoId: string): Promise<UtxoDetailsType | undefined> {
        return await this.utxos.where("utxoId").equals(utxoId).first();
    }

    async saveUtxo(utxo: UtxoDetailsType): Promise<void> {
        await this.utxos.put(utxo);
    }

    async findTxById(txId: string): Promise<txCBOR | undefined> {
        return await this.txs.where("txid").equals(txId).first();
    }

    async saveTx(tx: txCBOR): Promise<void> {
        await this.txs.put(tx);
    }
}
