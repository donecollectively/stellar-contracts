/**
 * Generic key-value metadata storage for the UtxoIndex.
 *
 * Used for persistent tracking values like lastParsedBlockHeight.
 *
 * REQT/38d4zc2qrx (Parsed Block Height Tracking)
 */
export interface MetadataEntry {
    key: string;
    value: string;
}
