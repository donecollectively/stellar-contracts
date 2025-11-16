import type { UtxoStoreGeneric } from "./UtxoStoreGeneric";
import type { UtxoDetailsType } from "./blockfrostTypes/UtxoDetails";

import {dexieBlockDetails} from "./dexieRecords/BlockDetails.js";
import {dexieUtxoDetails} from "./dexieRecords/UtxoDetails.js";
import Dexie, { type EntityTable } from "dexie";

export class DexieUtxoStore extends Dexie implements UtxoStoreGeneric {
    blocks!: EntityTable<dexieBlockDetails, "hash">;
    utxos!: EntityTable<dexieUtxoDetails, "utxoId">;

    constructor() {
        super("StellarDappIndex-v0.1");
        this.version(1).stores({
            blocks: "hash, height",
            utxos: "utxoId, blockId, blockHeight",
        });
        this.blocks.mapToClass(dexieBlockDetails);
        this.utxos.mapToClass(dexieUtxoDetails);
    }

    async findBlockByBlockId(blockId: string): Promise<dexieBlockDetails | undefined> {
        return await this.blocks.where("blockId").equals(blockId).first();
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
}
