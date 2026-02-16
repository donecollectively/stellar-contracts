import { Entity } from "dexie";
import type { DexieUtxoStore } from "../DexieUtxoStore.js";
import type { UtxoIndexEntry } from "../types/UtxoIndexEntry.js";

/**
 * Dexie entity class for UTXO storage.
 * Implements the storage-agnostic UtxoIndexEntry interface.
 *
 * REQT/gbzxxv71m8 (UTXO Entity)
 */
export class dexieUtxoDetails
    extends Entity<DexieUtxoStore>
    implements UtxoIndexEntry
{
    utxoId!: string;
    address!: string;
    lovelace!: bigint;
    tokens!: Array<{
        policyId: string;
        tokenName: string;
        quantity: bigint;
    }>;
    datumHash!: string | null;
    inlineDatum!: string | null;
    referenceScriptHash!: string | null;  // REQT/tqrhbphgyx
    uutIds!: string[];
    spentInTx!: string | null;  // REQT/11msfc4wv8
    blockHeight!: number;        // REQT/6h4f158gvs
}
