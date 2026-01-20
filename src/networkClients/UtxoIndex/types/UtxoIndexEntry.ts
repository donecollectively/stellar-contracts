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
    utxoId: string;              // "txHash#outputIndex"
    address: string;             // bech32
    lovelace: bigint;
    tokens: Array<{
        policyId: string;        // hex
        tokenName: string;       // hex-encoded
        quantity: bigint;
    }>;
    datumHash: string | null;
    inlineDatum: string | null;  // CBOR hex
    referenceScriptHash: string | null;  // script hash hex (REQT/tqrhbphgyx)
    uutIds: string[];            // extracted UUT identifiers
}
