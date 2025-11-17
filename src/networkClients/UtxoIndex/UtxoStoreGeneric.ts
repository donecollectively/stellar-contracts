import type { BlockDetailsType } from "./blockfrostTypes/BlockDetails.js";
import type { UtxoDetailsType } from "./blockfrostTypes/UtxoDetails.js";

export type txCBOR = {
    txid: string;
    cbor: string;
};

export interface UtxoStoreGeneric {
    log(id: string, message: string): Promise<any>;
    findBlockByBlockId(blockId: string): Promise<BlockDetailsType | undefined>;
    saveBlock(block: BlockDetailsType): Promise<void>;
    findUtxoByUtxoId(utxoId: string): Promise<UtxoDetailsType | undefined>;
    saveUtxo(utxo: UtxoDetailsType): Promise<void>;
    findTxById(txId: string): Promise<txCBOR | undefined>;
    saveTx(tx: txCBOR): Promise<void>;
}

