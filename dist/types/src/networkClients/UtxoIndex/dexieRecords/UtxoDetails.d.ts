import { Entity } from "dexie";
import type { DexieUtxoStore } from "../DexieUtxoStore.js";
import type { UtxoIndexEntry } from "../types/UtxoIndexEntry.js";
/**
 * Dexie entity class for UTXO storage.
 * Implements the storage-agnostic UtxoIndexEntry interface.
 *
 * REQT/gbzxxv71m8 (UTXO Entity)
 */
export declare class dexieUtxoDetails extends Entity<DexieUtxoStore> implements UtxoIndexEntry {
    utxoId: string;
    address: string;
    lovelace: bigint;
    tokens: Array<{
        policyId: string;
        tokenName: string;
        quantity: bigint;
    }>;
    datumHash: string | null;
    inlineDatum: string | null;
    referenceScriptHash: string | null;
    uutIds: string[];
}
//# sourceMappingURL=UtxoDetails.d.ts.map