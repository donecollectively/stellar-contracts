import Dexie, { type EntityTable } from "dexie";
import type { UtxoStoreGeneric } from "./types/UtxoStoreGeneric.js";
import type { UtxoIndexEntry } from "./types/UtxoIndexEntry.js";
import type { BlockIndexEntry } from "./types/BlockIndexEntry.js";
import type { TxIndexEntry } from "./types/TxIndexEntry.js";
import type { ScriptIndexEntry } from "./types/ScriptIndexEntry.js";
import type { WalletAddressEntry } from "./types/WalletAddressEntry.js";
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
export declare class DexieUtxoStore extends Dexie implements UtxoStoreGeneric {
    blocks: EntityTable<dexieBlockDetails, "hash">;
    utxos: EntityTable<dexieUtxoDetails, "utxoId">;
    txs: EntityTable<TxIndexEntry, "txid">;
    scripts: EntityTable<ScriptIndexEntry, "scriptHash">;
    walletAddresses: EntityTable<WalletAddressEntry, "address">;
    logs: EntityTable<indexerLogs, "logId">;
    pid: number;
    constructor(dbName?: string);
    initializing: Promise<number> | undefined;
    init(): Promise<number>;
    log(id: string, message: string): Promise<void>;
    findBlockId(blockId: string): Promise<BlockIndexEntry | undefined>;
    saveBlock(block: BlockIndexEntry): Promise<void>;
    getLatestBlock(): Promise<BlockIndexEntry | undefined>;
    findUtxoId(utxoId: string): Promise<UtxoIndexEntry | undefined>;
    saveUtxo(entry: UtxoIndexEntry): Promise<void>;
    findUtxoByUUT(uutId: string): Promise<UtxoIndexEntry | undefined>;
    findTxId(txId: string): Promise<TxIndexEntry | undefined>;
    saveTx(tx: TxIndexEntry): Promise<void>;
    findScript(scriptHash: string): Promise<ScriptIndexEntry | undefined>;
    saveScript(script: ScriptIndexEntry): Promise<void>;
    findUtxosByAsset(policyId: string, tokenName?: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<UtxoIndexEntry[]>;
    findUtxosByAddress(address: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<UtxoIndexEntry[]>;
    getAllUtxos(options?: {
        limit?: number;
        offset?: number;
    }): Promise<UtxoIndexEntry[]>;
    findWalletAddress(address: string): Promise<WalletAddressEntry | undefined>;
    saveWalletAddress(entry: WalletAddressEntry): Promise<void>;
    getAllWalletAddresses(): Promise<WalletAddressEntry[]>;
}
//# sourceMappingURL=DexieUtxoStore.d.ts.map