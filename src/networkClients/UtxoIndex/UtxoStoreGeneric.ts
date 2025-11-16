import type { BlockDetailsType } from "./blockfrostTypes/BlockDetails.js";
import type { UtxoDetailsType } from "./blockfrostTypes/UtxoDetails.js";

export interface UtxoStoreGeneric {
    findBlockByBlockId(blockId: string): Promise<BlockDetailsType | undefined>;
    saveBlock(block: BlockDetailsType): Promise<void>;
    findUtxoByUtxoId(utxoId: string): Promise<UtxoDetailsType | undefined>;
    saveUtxo(utxo: UtxoDetailsType): Promise<void>;
}

