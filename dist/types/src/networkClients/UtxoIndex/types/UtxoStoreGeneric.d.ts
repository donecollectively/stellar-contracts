/**
 * Storage abstraction interface for UtxoIndex.
 *
 * CONSTRAINT: This interface uses ONLY types from ./types/.
 * NO imports from @helios-lang/* or blockfrostTypes/*.
 *
 * REQT/nhbqmacrwn (Interface Methods)
 */
import type { UtxoIndexEntry } from "./UtxoIndexEntry.js";
import type { BlockIndexEntry } from "./BlockIndexEntry.js";
import type { TxIndexEntry } from "./TxIndexEntry.js";
import type { ScriptIndexEntry } from "./ScriptIndexEntry.js";
import type { WalletAddressEntry } from "./WalletAddressEntry.js";
export interface UtxoStoreGeneric {
    log(id: string, message: string): Promise<void>;
    findBlockId(blockId: string): Promise<BlockIndexEntry | undefined>;
    saveBlock(block: BlockIndexEntry): Promise<void>;
    getLatestBlock(): Promise<BlockIndexEntry | undefined>;
    findUtxoId(utxoId: string): Promise<UtxoIndexEntry | undefined>;
    saveUtxo(entry: UtxoIndexEntry): Promise<void>;
    markUtxoSpent(utxoId: string, spentInTx: string): Promise<void>;
    findTxId(txId: string): Promise<TxIndexEntry | undefined>;
    saveTx(tx: TxIndexEntry): Promise<void>;
    findScript(scriptHash: string): Promise<ScriptIndexEntry | undefined>;
    saveScript(script: ScriptIndexEntry): Promise<void>;
    findUtxoByUUT(uutId: string): Promise<UtxoIndexEntry | undefined>;
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
//# sourceMappingURL=UtxoStoreGeneric.d.ts.map