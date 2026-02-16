/**
 * Storage-agnostic parsed delegated-data record representation.
 *
 * Stores pre-parsed datum data so consumers can query by record-id or
 * record-type without re-parsing CBOR or querying the network.
 *
 * Byte arrays in the parsed data are converted to `{bytes: number[], string?: string}`
 * for Helios `makeByteArrayData` round-trip compatibility and human readability.
 *
 * CONSTRAINT: No imports from @helios-lang/* — Helios-free.
 *
 * REQT/xpvvqfwf5m (RecordIndexEntry Type)
 */
export interface RecordIndexEntry {
    /** Record ID — same namespace as uutIds (e.g. "rcd-a1b2c3d4e5f6") */
    id: string;
    /** FK to UtxoIndexEntry.utxoId — the UTXO containing this record */
    utxoId: string;
    /** Delegated data type name (e.g. "settings", "memberRecord") */
    type: string;
    /** Structured parsed datum data, stored directly in IndexedDB */
    parsedData: Record<string, any>;
    /** txHash that spent the containing UTXO, or null if unspent. Mirrors UtxoIndexEntry.spentInTx */
    spentInTx: string | null;
}

/**
 * Representation of a byte array in parsed record data.
 * Compatible with Helios `makeByteArrayData()` via `BytesLike` — the `{bytes: number[]}` shape
 * is accepted directly by `toBytes()`.
 *
 * The optional `string` field provides the UTF-8 decoding when the bytes are valid UTF-8.
 */
export interface StoredByteArray {
    bytes: number[];
    string?: string;
}
