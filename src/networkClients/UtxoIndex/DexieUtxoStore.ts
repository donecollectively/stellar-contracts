import type { UtxoStoreGeneric } from "./UtxoStoreGeneric";

import {dexieBlockDetails} from "./dexieRecords/BlockDetails.js";
import {UtxoDetails} from "./dexieRecords/UtxoDetails.js";
import Dexie, { type EntityTable } from "dexie";

export class DexieUtxoStore extends Dexie implements UtxoStoreGeneric {
    blocks!: EntityTable<dexieBlockDetails, "blockId">;
    utxos!: EntityTable<dexieUtxoDetails, "utxoId">;

    constructor() {
        super("StellarDappIndex-v0.1");
        this.version(1).stores({
            blocks: "blockId, blockHeight",
            utxos: "utxoId, blockId, blockHeight",
        });
        this.blocks.mapToClass(dexieBlockDetails);
        this.utxos.mapToClass(UtxoDetails);
    }

    async findBlockByBlockId(blockId: string): Promise<dexieBlockDetails | undefined> {
        return await this.blocks.where("blockId").equals(blockId).first();
    }

    async saveBlock(block: dexieBlockDetails): Promise<void> {
        await this.blocks.put(block);
    }

    async findUtxoByUtxoId(utxoId: string): Promise<UtxoRecord | undefined> {
        return await this.utxos.where("utxoId").equals(utxoId).first();
    }

    async saveUtxo(utxo: UtxoRecord): Promise<void> {
        await this.utxos.put(utxo);
    }
}
