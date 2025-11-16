import type {dexieBlockDetails} from "./dexieRecords/BlockDetails.js";
import type {UtxoDetails} from "./dexieRecords/UtxoDetails.js";

export interface UtxoStoreGeneric {
    findBlockByBlockId(blockId: string): Promise<dexieBlockDetails | undefined>;
    saveBlock(block: dexieBlockDetails): Promise<void>;
    findUtxoByUtxoId(utxoId: string): Promise<UtxoDetails | undefined>;
    saveUtxo(utxo: UtxoDetails): Promise<void>;
}

