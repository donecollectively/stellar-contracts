/** The CachedUtxoIndex indexes all the utxos that are
 * needed for interacting with a specific Capo.  This includes
 * the charter token, the delegate UUTs seen in the charter,
 * and all the delegated-data records stored in the capo address.
 *
 * The delegate UUTs are stored at other addresses, but their
 * asset-ids always use the capo minter's policy-id; their asset
 * names and related script addresses are found in the charter data.
 *
 * TYPE BOUNDARY: This class is the ONLY component with Helios coupling.
 * It converts Helios types to storage-agnostic types (UtxoIndexEntry, etc.)
 * before passing to the store.
 */
import EventEmitter from "eventemitter3";
import { type Address, type AssetClass, type Tx, type TxId, type TxInput, type TxOutputId, type MintingPolicyHash, type NetworkParams } from "@helios-lang/ledger";
import { type UplcProgramV2 } from "@helios-lang/uplc";
import type { CardanoClient } from "@helios-lang/tx-utils";
import type { CapoDataBridge } from "../../helios/scriptBundling/CapoHeliosBundle.bridge.js";
import { type RateLimiterMetrics } from "./RateLimitedFetch.js";
import type { UtxoStoreGeneric } from "./types/UtxoStoreGeneric.js";
import type { UtxoIndexEntry } from "./types/UtxoIndexEntry.js";
import type { BlockIndexEntry } from "./types/BlockIndexEntry.js";
import { type BlockDetailsType } from "./blockfrostTypes/BlockDetails.js";
export interface CachedUtxoIndexEvents {
    /** Emitted when initial sync from scratch begins */
    syncStart: [];
    /** Emitted when initial sync from scratch completes */
    syncComplete: [];
    /** Emitted when incremental sync begins */
    syncing: [];
    /** Emitted when incremental sync completes */
    synced: [];
    /** Forwarded rate limiter metrics */
    rateLimitMetrics: [RateLimiterMetrics];
}
export declare class CachedUtxoIndex {
    blockfrostKey: string;
    blockfrostBaseUrl: string;
    lastBlockId: string;
    lastBlockHeight: number;
    lastSlot: number;
    store: UtxoStoreGeneric;
    network: CardanoClient;
    syncPageSize: number;
    maxSyncPages: number;
    walletStalenessMs: number;
    private _address;
    private _mph;
    private _isMainnet;
    private bridge;
    private refreshTimerId;
    private syncReady;
    private syncReadyResolve;
    readonly events: EventEmitter<CachedUtxoIndexEvents, any>;
    get capoAddress(): string;
    get capoMph(): string;
    /**
     * Converts an Address to bech32 string, throwing for Byron addresses.
     * Byron addresses use base58 encoding and are not supported by this indexer.
     */
    private addressToBech32;
    /**
     * Returns whether the network is mainnet.
     *
     * REQT/gy8z4a7pu (isMainnet Method)
     */
    isMainnet(): boolean;
    /**
     * Returns current slot number from the latest synced block.
     *
     * REQT/gz9a5b8qv (now Property)
     */
    get now(): number;
    /**
     * Returns network parameters from the underlying network client.
     *
     * REQT/ha0b6c9rw (parameters Property)
     */
    get parameters(): Promise<NetworkParams>;
    /**
     * Checks if a UTXO exists in the cache.
     *
     * REQT/gw6x2y5ns (hasUtxo Method)
     */
    hasUtxo(utxoId: TxOutputId): Promise<boolean>;
    /**
     * Submits a transaction to the network.
     * Delegates to the underlying network client.
     *
     * This allows CachedUtxoIndex to be used as a full CardanoClient replacement,
     * not just a ReadonlyCardanoClient.
     */
    submitTx(tx: Tx): Promise<TxId>;
    constructor({ address, mph, isMainnet, network, bridge, blockfrostKey, storeIn: strategy, dbName, syncPageSize, maxSyncPages, }: {
        address: Address | string;
        mph: MintingPolicyHash | string;
        isMainnet: boolean;
        network: CardanoClient;
        bridge: CapoDataBridge;
        blockfrostKey: string;
        storeIn?: "dexie" | "memory" | "dred";
        dbName?: string;
        /** Number of transactions to fetch per page during sync (default: 100) */
        syncPageSize?: number;
        /** Maximum number of pages to fetch during sync (default: unlimited) */
        maxSyncPages?: number;
    });
    syncNow(): Promise<void>;
    /**
     * Checks for new transactions at the capo address and indexes new UTXOs.
     * Supports pagination with configurable page size and max pages.
     *
     * REQT/fh56sce22g (checkForNewTxns)
     */
    checkForNewTxns(fromBlockHeight?: number): Promise<void>;
    /**
     * Starts periodic refresh timer to automatically check for new transactions.
     *
     * REQT/zzsg63b2fb (Automated Periodic Refresh)
     */
    startPeriodicRefresh(): void;
    /**
     * Stops the periodic refresh timer.
     *
     * REQT/zzsg63b2fb (Automated Periodic Refresh)
     */
    stopPeriodicRefresh(): void;
    /**
     * Returns whether periodic refresh is currently active.
     *
     * REQT/zzsg63b2fb (Automated Periodic Refresh)
     */
    get isPeriodicRefreshActive(): boolean;
    /**
     * Registers a wallet address for UTXO indexing.
     * Fetches current UTXOs and stores them in the cache.
     *
     * REQT/mp4dx7ngvf (Address Registration)
     */
    addWalletAddress(address: string): Promise<void>;
    /**
     * Syncs UTXOs for a registered wallet address if stale.
     * Returns true if sync was performed, false if cache was fresh.
     *
     * REQT/92m7kpkny7 (On-Demand Sync)
     */
    private syncWalletAddressIfStale;
    /**
     * Processes a transaction to identify and index new UTXOs.
     *
     * REQT/0vrkpk6a6h (processTransactionForNewUtxos)
     */
    private processTransactionForNewUtxos;
    /**
     * Extracts UUT identifiers from a TxOutput's value.
     * UUT names match pattern: {purpose}-{hash} where purpose is [a-z]+ and hash is 12 hex chars.
     *
     * REQT/cchf3wgnk3 (UUT Catalog Storage)
     */
    private extractUutIds;
    /**
     * Extracts UUT identifiers from a TxInput's value.
     */
    private extractUutIdsFromTxInput;
    /**
     * Converts a TxOutput to a storage-agnostic UtxoIndexEntry.
     *
     * TYPE BOUNDARY: This method converts Helios types to storage types.
     */
    private txOutputToIndexEntry;
    /**
     * Converts a TxInput to a storage-agnostic UtxoIndexEntry.
     *
     * TYPE BOUNDARY: This method converts Helios types to storage types.
     */
    private txInputToIndexEntry;
    /**
     * Converts Blockfrost UtxoDetailsType to storage-agnostic UtxoIndexEntry.
     *
     * TYPE BOUNDARY: This method converts Blockfrost types to storage types.
     */
    private blockfrostUtxoToIndexEntry;
    /**
     * Converts Blockfrost BlockDetailsType to storage-agnostic BlockIndexEntry.
     *
     * TYPE BOUNDARY: This method converts Blockfrost types to storage types.
     */
    private blockfrostBlockToIndexEntry;
    /**
     * Finds the charter UTXO from a list of UTXOs.
     * The charter UTXO contains the "charter" token from the capo's minting policy.
     */
    private findCharterUtxo;
    /**
     * Decodes charter data from a charter UTXO using the bridge.
     */
    private decodeCharterData;
    /**
     * Indexes a UTXO from a transaction output.
     *
     * REQT/mvjrak021s (UTXO Indexing)
     */
    private indexUtxoFromOutput;
    /**
     * Catalogs delegate UUTs mentioned in the charter.
     * Uses delegate links directly with Blockfrost queries (decoupled from Capo).
     *
     * REQT/k0mnv27tz4 (catalogDelegateUuts)
     */
    private catalogDelegateUuts;
    /**
     * Fetches and indexes a delegate's authority token UTXO from a delegate link.
     */
    private fetchAndIndexDelegateLinkUut;
    /**
     * Indexes a UTXO from a TxInput object.
     */
    private indexUtxoFromTxInput;
    fetchFromBlockfrost<T>(url: string): Promise<T>;
    findOrFetchBlockHeight(blockId: string): Promise<number>;
    fetchBlockDetails(blockId: string): Promise<BlockDetailsType>;
    fetchAndStoreLatestBlock(): Promise<BlockIndexEntry>;
    /**
     * Fetches and caches a reference script by its hash.
     * Returns the decoded UplcProgramV2 or undefined if not found.
     *
     * REQT/tqrhbphgyx (Reference Script Fetching)
     * REQT/k2wvnd3f1e (Script Storage)
     */
    fetchAndCacheScript(scriptHash: string): Promise<UplcProgramV2 | undefined>;
    /**
     * Retrieves a transaction by ID.
     * Implements ReadonlyCardanoClient.getTx
     *
     * REQT/gx7y3z6ot (getTx Method)
     */
    getTx(id: TxId): Promise<Tx>;
    /**
     * Retrieves a transaction by ID with fully-restored input data.
     * Uses Helios tx.recover() to populate input output data from cache.
     *
     * Unlike getTx() which returns raw decoded Tx, this method ensures
     * inputs have their output data (address, value, datum, refScript).
     *
     * REQT/qc7qgsqphv (getTx with Restored Inputs)
     */
    getTxInfo(id: TxId): Promise<Tx>;
    findOrFetchTxDetails(txId: string): Promise<Tx>;
    fetchTxDetails(txId: string): Promise<Tx>;
    /**
     * Constructs a UTXO ID from tx_hash and output_index
     */
    private formatUtxoId;
    /**
     * Restores full TxInput data for all inputs in a transaction.
     *
     * When a Tx is decoded from CBOR, its inputs only contain TxOutputId references.
     * This method looks up each input's corresponding UTXO from the cache and
     * returns fully restored TxInputs with complete output data (address, value,
     * datum, reference script).
     *
     * REQT/qc7qgsqphv (getTx with restored inputs)
     *
     * @param tx - The decoded transaction
     * @returns Array of fully restored TxInputs with output data
     */
    restoreTxInputs(tx: Tx): Promise<TxInput[]>;
    /**
     * Converts a UtxoIndexEntry back to a Helios TxInput.
     * This is the inverse of txOutputToIndexEntry.
     *
     * REQT/nqemw2gvm2 (restoreTxInput Method) - async to support script fetching
     */
    private indexEntryToTxInput;
    /**
     * Retrieves a UTXO by its output ID.
     * Implements ReadonlyCardanoClient.getUtxo
     *
     * REQT/gt3ux9v2kp (getUtxo Method)
     */
    getUtxo(id: TxOutputId): Promise<TxInput>;
    /**
     * Retrieves all UTXOs at an address.
     * Implements ReadonlyCardanoClient.getUtxos
     *
     * REQT/gu4vy0w3lq (getUtxos Method)
     */
    getUtxos(address: Address): Promise<TxInput[]>;
    /**
     * Retrieves UTXOs at an address containing a specific asset class.
     * Implements ReadonlyCardanoClient.getUtxosWithAssetClass
     *
     * REQT/gv5wz1x4mr (getUtxosWithAssetClass Method)
     *
     * @throws Error if address is not the Capo address or a delegate-policy address
     */
    getUtxosWithAssetClass(address: Address, assetClass: AssetClass): Promise<TxInput[]>;
    /**
     * Finds a UTXO containing a specific UUT by its name.
     *
     * REQT/50zkk5xgrx (Query API Methods)
     */
    findUtxoByUUT(uutId: string): Promise<UtxoIndexEntry | undefined>;
    /**
     * Finds all UTXOs containing a specific asset (by policy ID and optional token name).
     *
     * REQT/50zkk5xgrx (Query API Methods)
     */
    findUtxosByAsset(policyId: string, tokenName?: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<UtxoIndexEntry[]>;
    /**
     * Finds all UTXOs at a specific address.
     *
     * REQT/50zkk5xgrx (Query API Methods)
     */
    findUtxosByAddress(address: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<UtxoIndexEntry[]>;
    /**
     * Returns all indexed UTXOs with optional pagination.
     *
     * REQT/50zkk5xgrx (Query API Methods)
     */
    getAllUtxos(options?: {
        limit?: number;
        offset?: number;
    }): Promise<UtxoIndexEntry[]>;
}
//# sourceMappingURL=CachedUtxoIndex.d.ts.map