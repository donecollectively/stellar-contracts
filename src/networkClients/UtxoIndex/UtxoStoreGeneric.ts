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
    // REQT/nhbqmacrwn (Interface Methods) - saveUtxo accepts optional capoMph for UUT extraction
    saveUtxo(utxo: UtxoDetailsType, capoMph?: string): Promise<void>;
    findTxById(txId: string): Promise<txCBOR | undefined>;
    saveTx(tx: txCBOR): Promise<void>;
    // REQT/nhbqmacrwn (Interface Methods) - query UTXOs by UUT identifier
    findUtxoByUUT(uutId: string): Promise<UtxoDetailsType | undefined>;
}

