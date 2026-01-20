/**
 * Storage-agnostic wallet address entry for tracking registered wallet addresses.
 *
 * Tracks per-address sync state for on-demand refresh logic.
 * REQT/620ypcc34d (Multi-Address Storage)
 */
export interface WalletAddressEntry {
    /** Bech32 wallet address (primary key) */
    address: string;
    /** Last block height synced for this address */
    lastBlockHeight: number;
    /** Timestamp of last sync (ms since epoch) */
    lastSyncTime: number;
}
//# sourceMappingURL=WalletAddressEntry.d.ts.map