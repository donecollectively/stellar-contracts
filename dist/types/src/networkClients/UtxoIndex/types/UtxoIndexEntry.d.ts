/**
 * Storage-agnostic UTXO representation.
 *
 * This type decouples the storage layer from Helios and Blockfrost types.
 * Neither the interface nor implementations should import from @helios-lang/*
 * or know about Blockfrost response schemas.
 *
 * REQT/gbzxxv71m8 (UTXO Entity)
 */
export interface UtxoIndexEntry {
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
//# sourceMappingURL=UtxoIndexEntry.d.ts.map