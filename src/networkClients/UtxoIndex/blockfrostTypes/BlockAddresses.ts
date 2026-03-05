/**
 * Type for Blockfrost `blocks/{height_or_hash}/addresses` endpoint response.
 * Each entry lists an address and its associated transaction hashes in that block.
 *
 * Docs: https://docs.blockfrost.io/#tag/cardano--blocks/get/blocks/{hash_or_number}/addresses
 *
 * REQT/gfsjgaac1y (Incremental Mode) — used during block-by-block walk
 */
export interface BlockAddressEntry {
    address: string;
    transactions: Array<{ tx_hash: string }>;
}
