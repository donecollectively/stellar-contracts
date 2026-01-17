import Dexie, { type EntityTable, type Table } from "dexie";

import { nanoid } from "../../util/nanoid.js";
import type { txCBOR, UtxoStoreGeneric } from "./UtxoStoreGeneric";
import type { UtxoDetailsType } from "./blockfrostTypes/UtxoDetails";
import {dexieBlockDetails} from "./dexieRecords/BlockDetails.js";
import { indexerLogs } from "./dexieRecords/Logs";
import {dexieUtxoDetails} from "./dexieRecords/UtxoDetails.js";

const pid = nanoid()

/**
 * Extracts UUT identifiers from UTXO token values.
 * UUT names match pattern: {purpose}-{hash} where purpose is [a-z]+ and hash is 12 hex chars.
 * REQT/cchf3wgnk3 (UUT Catalog Storage)
 */
export function extractUutIds(
    amounts: Array<{unit: string; quantity: number}>,
    capoMph: string
): string[] {
    // UUT pattern: lowercase purpose + hyphen + 12 hex characters
    const uutPattern = /^[a-z]+-[0-9a-f]{12}$/;
    return amounts
        .filter(a => a.unit !== "lovelace" && a.unit.startsWith(capoMph))
        .map(a => a.unit.slice(capoMph.length)) // extract token name (hex-encoded)
        .map(hexName => {
            try {
                return Buffer.from(hexName, 'hex').toString('utf8');
            } catch {
                return '';
            }
        })
        .filter(name => uutPattern.test(name));
}

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
        // REQT/6h4f158gvs (Database Definition), REQT/nt1pqd3m3z (UUT Catalog Entity)
        // Schema v2: adds *uutIds multiEntry index for fast UUT lookups
        this.version(2).stores({
            blocks: "hash, height",
            utxos: "utxoId, blockId, blockHeight, *uutIds",
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

    // REQT/cchf3wgnk3 (UUT Catalog Storage) - saveUtxo with optional UUT extraction
    async saveUtxo(utxo: UtxoDetailsType, capoMph?: string): Promise<void> {
        if (capoMph && !utxo.uutIds) {
            utxo.uutIds = extractUutIds(utxo.amount, capoMph);
        }
        await this.utxos.put(utxo);
    }

    // REQT/cchf3wgnk3 (UUT Catalog Storage) - query UTXOs by UUT identifier
    async findUtxoByUUT(uutId: string): Promise<UtxoDetailsType | undefined> {
        return await this.utxos.where('uutIds').equals(uutId).first();
    }

    async findTxById(txId: string): Promise<txCBOR | undefined> {
        return await this.txs.where("txid").equals(txId).first();
    }

    async saveTx(tx: txCBOR): Promise<void> {
        await this.txs.put(tx);
    }
}
