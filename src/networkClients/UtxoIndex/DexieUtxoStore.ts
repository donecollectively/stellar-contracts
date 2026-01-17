import Dexie, { type EntityTable, type Table } from "dexie";
import type { MintingPolicyHash, TxInput } from "@helios-lang/ledger";

import { nanoid } from "../../util/nanoid.js";
import type { txCBOR, UtxoStoreGeneric } from "./UtxoStoreGeneric";
import type { UtxoDetailsType } from "./blockfrostTypes/UtxoDetails";
import {dexieBlockDetails} from "./dexieRecords/BlockDetails.js";
import { indexerLogs } from "./dexieRecords/Logs";
import {dexieUtxoDetails} from "./dexieRecords/UtxoDetails.js";
import { txInputToUtxoDetails } from "./txInputUtils.js";

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

    // REQT/cchf3wgnk3 (UUT Catalog Storage) - saveUtxo takes Helios TxInput
    async saveUtxo(utxo: TxInput, capoMph: MintingPolicyHash): Promise<void> {
        // Convert TxInput to storage format
        const [txHash, outputIndexStr] = utxo.id.toString().split('#');
        const outputIndex = parseInt(outputIndexStr, 10);

        // Convert Value to amount array format
        const amount: Array<{unit: string; quantity: number}> = [
            { unit: "lovelace", quantity: Number(utxo.value.lovelace) }
        ];

        // Add all tokens
        for (const [mph, tokens] of utxo.value.assets.mintingPolicies) {
            const mphHex = mph.toHex();
            for (const [tokenName, qty] of tokens) {
                const tokenNameHex = bytesToHex(tokenName);
                amount.push({
                    unit: mphHex + tokenNameHex,
                    quantity: Number(qty)
                });
            }
        }

        // Extract datum info
        let data_hash: string | null = null;
        let inline_datum: string | null = null;
        if (utxo.datum) {
            if (utxo.datum.kind === "HashedTxOutputDatum") {
                data_hash = utxo.datum.hash.toHex();
            } else if (utxo.datum.kind === "InlineTxOutputDatum") {
                inline_datum = bytesToHex(utxo.datum.toCbor());
            }
        }

        // Extract UUT IDs
        const uutIds = extractUutIds(utxo, capoMph);

        const record: UtxoDetailsType = {
            utxoId: utxo.id.toString(),
            address: utxo.address.toBech32(),
            tx_hash: txHash,
            tx_index: outputIndex,
            output_index: outputIndex,
            amount,
            block: "", // Block hash not available from TxInput directly
            data_hash,
            inline_datum,
            reference_script_hash: null, // Not typically needed for indexing
            uutIds,
        };

        await this.utxos.put(record);
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
