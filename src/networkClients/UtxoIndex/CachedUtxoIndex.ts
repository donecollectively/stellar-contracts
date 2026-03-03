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

// ArkErrors import removed - using type casting instead of runtime validation
import EventEmitter from "eventemitter3";
import {
    decodeTx,
    makeAddress,
    makeAssetClass,
    makeDatumHash,
    makeHashedTxOutputDatum,
    makeInlineTxOutputDatum,
    makeMintingPolicyHash,
    makeValidatorHash,
    makeTxId,
    makeTxInput,
    makeTxOutput,
    makeTxOutputId,
    makeValue,
    type Address,
    type AssetClass,
    type Tx,
    type TxId,
    type TxInput,
    type TxOutput,
    type TxOutputId,
    type TxOutputDatum,
    type MintingPolicyHash,
    type NetworkParams,
} from "@helios-lang/ledger";
import { bytesToHex, encodeUtf8, hexToBytes } from "@helios-lang/codec-utils";
import {
    decodeUplcData,
    decodeUplcProgramV2FromCbor,
    type UplcProgramV2,
} from "@helios-lang/uplc";
import type { CardanoClient } from "@helios-lang/tx-utils";
import type { CapoDataBridge } from "../../helios/scriptBundling/CapoHeliosBundle.bridge.js";

import { DexieUtxoStore } from "./DexieUtxoStore.js";
import {
    getBlockfrostRateLimiter,
    type RateLimiterMetrics,
} from "./RateLimitedFetch.js";
import type { UtxoStoreGeneric } from "./types/UtxoStoreGeneric.js";
import type { UtxoIndexEntry } from "./types/UtxoIndexEntry.js";
import type { BlockIndexEntry } from "./types/BlockIndexEntry.js";

// Runtime validators removed - using type casting instead
// Type definitions still used for compile-time safety
import {
    type BlockDetailsType,
} from "./blockfrostTypes/BlockDetails.js";
import {
    type UtxoDetailsType,
} from "./blockfrostTypes/UtxoDetails.js";
import {
    type AddressTransactionSummariesType,
} from "./blockfrostTypes/AddressTransactionSummaries.js";
import type { CharterData } from "../../CapoTypes.js";
import type { RelativeDelegateLink } from "../../delegation/UnspecializedDelegate.typeInfo.js";
// REQT/yx0yze9swf: Type-only import — no runtime dependency on Capo
import type { Capo } from "../../Capo.js";
import type { FoundDatumUtxo } from "../../CapoTypes.js";
// REQT/2w2yyc2m1k: Type-only import for in-memory pending map
import type { TxDescription } from "../../StellarTxnContext.js";
import type { RecordIndexEntry } from "./types/RecordIndexEntry.js";
import type { PendingTxEntry } from "./types/PendingTxEntry.js";

// periodically queries for new utxos at the capo address
const refreshInterval = 60 * 1000; // 1 minute
const delegateRefreshInterval = 60 * 60 * 1000; // 1 hour

// Default sync configuration
const DEFAULT_SYNC_PAGE_SIZE = 100;
const DEFAULT_MAX_SYNC_PAGES = Infinity;

// REQT/92m7kpkny7: Wallet address staleness threshold (default 30 seconds)
const DEFAULT_WALLET_STALENESS_MS = 30 * 1000;

// REQT/fz6z7rr702: Pending Transaction Event Payloads
export interface TxConfirmedEvent {
    txHash: string;
    description: string;
    txd?: TxDescription<any, "submitted">;
}

export interface TxRolledBackEvent {
    txHash: string;
    description: string;
    cbor: string;
    txd?: TxDescription<any, "submitted">;
}

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
    // REQT/fz6z7rr702: Pending Transaction Events
    /** Emitted when a pending tx is confirmed in a block */
    txConfirmed: [TxConfirmedEvent];
    /** Emitted when a pending tx is rolled back due to deadline expiry */
    txRolledBack: [TxRolledBackEvent];
    /** Emitted after first sync cycle resolves pending state (stale → fresh) */
    pendingSynced: [];
}

export class CachedUtxoIndex {
    blockfrostKey: string;
    blockfrostBaseUrl: string = "https://cardano-mainnet.blockfrost.io";
    // remembers the last block-id, height, and slot seen in any capo utxo
    lastBlockId: string;
    lastBlockHeight: number;
    lastSlot: number;
    store: UtxoStoreGeneric;
    network: CardanoClient;

    // Configurable sync parameters (for testing)
    syncPageSize: number = DEFAULT_SYNC_PAGE_SIZE;
    maxSyncPages: number = DEFAULT_MAX_SYNC_PAGES;

    // REQT/92m7kpkny7: Wallet staleness threshold (configurable)
    walletStalenessMs: number = DEFAULT_WALLET_STALENESS_MS;

    // Decoupled components (instead of full Capo instance)
    private _address: Address;
    private _mph: MintingPolicyHash;
    private _isMainnet: boolean;
    private bridge: CapoDataBridge;

    // REQT/yx0yze9swf: Optional Capo attachment for datum parsing
    private _capo: Capo<any> | undefined;
    // Cached charter data — set during sync/charter change, passed to parseDelegatedDatum
    // to avoid redundant charter fetches during record parsing
    private _charterData: CharterData | undefined;

    // REQT/zzsg63b2fb: Timer for periodic refresh
    private refreshTimerId: ReturnType<typeof setInterval> | null = null;

    // REQT/a9y19g0pmr: Timer for pending deadline checks (10s interval)
    private deadlineTimerId: ReturnType<typeof setInterval> | null = null;

    // REQT/2w2yyc2m1k: In-Memory Pending Map — session-scoped, not persisted
    private pendingTxMap: Map<string, TxDescription<any, "submitted">> = new Map();

    // REQT/p2ts24jbkg: Set of txHashes with pending status, for fast lookup during checkForNewTxns
    private pendingTxHashes: Set<string> = new Set();

    // REQT/mjhf1yezr9: Map of utxoId → txHash for UTXOs consumed by pending txs (spent-by-pending lookup)
    private pendingSpentUtxoIds: Map<string, string> = new Map();

    // REQT/9r9rc1hrfv: Pending sync state — starts stale, flips to fresh after first sync resolves pending state
    private _pendingSyncState: "stale" | "fresh" = "stale";

    // REQT/c3ytg4rttd: Grace buffer for deadline calculation (in slots, ~1 slot/sec on Cardano)
    private graceBufferSlots: number;

    // Promise that resolves when initial sync completes.
    // Query methods await this before accessing the cache.
    private syncReady: Promise<void>;
    private syncReadyResolve!: () => void;

    // Event emitter for sync status and rate limit metrics
    public readonly events = new EventEmitter<CachedUtxoIndexEvents>();

    /**
     * Returns pending sync state — "stale" until first sync resolves pending state, then "fresh".
     * REQT/9r9rc1hrfv (pendingSyncState Property)
     */
    get pendingSyncState(): "stale" | "fresh" {
        return this._pendingSyncState;
    }

    // REQT/9a0nx1gr4b (Core State) - expose capoAddress for external access
    get capoAddress(): string {
        return this.addressToBech32(this._address);
    }

    // REQT/9a0nx1gr4b (Core State) - expose capoMph for external access
    get capoMph(): string {
        return this._mph.toHex();
    }

    /**
     * Converts an Address to bech32 string, throwing for Byron addresses.
     * Byron addresses use base58 encoding and are not supported by this indexer.
     */
    private addressToBech32(address: Address): string {
        if (address.era === "Byron") {
            throw new Error(
                "Byron addresses are not supported by CachedUtxoIndex",
            );
        }
        return address.toBech32();
    }

    // =========================================================================
    // REQT/rc7km2x8hp: ReadonlyCardanoClient Interface Conformance
    // =========================================================================

    /**
     * Returns whether the network is mainnet.
     *
     * REQT/gy8z4a7pu (isMainnet Method)
     */
    isMainnet(): boolean {
        return this._isMainnet;
    }

    /**
     * Returns current slot number from the latest synced block.
     *
     * REQT/gz9a5b8qv (now Property)
     */
    get now(): number {
        return this.lastSlot;
    }

    /**
     * Returns network parameters from the underlying network client.
     *
     * REQT/ha0b6c9rw (parameters Property)
     */
    get parameters(): Promise<NetworkParams> {
        return this.network.parameters;
    }

    /**
     * Checks if a UTXO exists in the cache.
     *
     * REQT/gw6x2y5ns (hasUtxo Method)
     */
    async hasUtxo(utxoId: TxOutputId): Promise<boolean> {
        await this.syncReady;
        const id = utxoId.toString();
        const entry = await this.store.findUtxoId(id);
        return entry !== undefined;
    }

    /**
     * Submits a transaction to the network.
     * Delegates to the underlying network client.
     *
     * This allows CachedUtxoIndex to be used as a full CardanoClient replacement,
     * not just a ReadonlyCardanoClient.
     */
    async submitTx(tx: Tx): Promise<TxId> {
        return this.network.submitTx(tx);
    }

    constructor({
        address,
        mph,
        isMainnet,
        network,
        bridge,
        blockfrostKey,
        storeIn: strategy = "dexie",
        dbName,
        syncPageSize,
        maxSyncPages,
        graceBufferSlots,
    }: {
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
        /** Grace buffer for pending tx deadlines in slots (default: 60, ~1 slot/sec on Cardano) */
        graceBufferSlots?: number;
    }) {
        // Convert string inputs to proper types if needed
        this._address =
            typeof address === "string" ? makeAddress(address) : address;
        this._mph = typeof mph === "string" ? makeMintingPolicyHash(mph) : mph;
        this._isMainnet = isMainnet;
        this.network = network;
        this.bridge = bridge;
        this.blockfrostKey = blockfrostKey;

        if (blockfrostKey.startsWith("mainnet")) {
            this.blockfrostBaseUrl = "https://cardano-mainnet.blockfrost.io";
        } else if (blockfrostKey.startsWith("preprod")) {
            this.blockfrostBaseUrl = "https://cardano-preprod.blockfrost.io";
        } else if (blockfrostKey.startsWith("preview")) {
            this.blockfrostBaseUrl = "https://cardano-preview.blockfrost.io";
        }
        this.lastBlockId = "";
        this.lastBlockHeight = 0;
        this.lastSlot = 0;

        // Apply sync configuration
        if (syncPageSize !== undefined) {
            this.syncPageSize = syncPageSize;
        }
        if (maxSyncPages !== undefined) {
            this.maxSyncPages = maxSyncPages;
        }

        // REQT/c3ytg4rttd: Default grace buffer of 60 slots (~60 seconds on Cardano)
        this.graceBufferSlots = graceBufferSlots ?? 60;

        if (strategy === "dexie") {
            this.store = new DexieUtxoStore(dbName);
        } else if (strategy === "memory") {
            throw new Error("Memory strategy not implemented");
        } else if (strategy === "dred") {
            throw new Error("Dred strategy not implemented");
        } else {
            throw new Error(`Invalid strategy: ${strategy}`);
        }
        this.store.log(
            "agsbb",
            `CachedUtxoIndex created for address: ${this._address.toString()}`,
        );

        // Forward rate limiter metrics to our event emitter
        getBlockfrostRateLimiter().events.on("metrics", (metrics) => {
            this.events.emit("rateLimitMetrics", metrics);
        });

        // Initialize sync-ready promise - query methods await this before accessing cache
        this.syncReady = new Promise<void>((resolve) => {
            this.syncReadyResolve = resolve;
        });

        this.syncNow();
    }

    async syncNow() {
        this.events.emit("syncStart");

        // REQT/fn70x96nxm: Startup Recovery — load pending entries from Dexie
        await this.loadPendingFromStore();

        // REQT/gz9a5b8qv: Initialize from cached block data if available
        const cachedBlock = await this.store.getLatestBlock();
        if (cachedBlock) {
            this.lastBlockId = cachedBlock.hash;
            this.lastBlockHeight = cachedBlock.height;
            this.lastSlot = cachedBlock.slot;
            await this.store.log(
                "c8init",
                `Initialized from cache: block #${cachedBlock.height}, slot ${cachedBlock.slot}`,
            );

            // Have cached data - just do incremental sync for new transactions
            await this.checkForNewTxns();

            // REQT/fn70x96nxm: After first sync, resolve pending state
            await this.resolvePendingState();

            this.syncReadyResolve();
            this.events.emit("syncComplete");
            return;
        }

        // No cached data - do full initial sync
        // Fetch all UTXOs from the capo address using the network
        const capoUtxos = await this.network.getUtxos(this._address);

        await this.store.log("yz58q", `Found ${capoUtxos.length} capo UTXOs`);

        // REQT/vk2bywdycn: Store all capo UTXOs in the index
        for (const utxo of capoUtxos) {
            const entry = this.txInputToIndexEntry(utxo);
            await this.store.saveUtxo(entry);
        }

        // Extract unique transaction IDs from the UTXOs and fetch/store transaction details
        const uniqueTxIds = new Set(
            capoUtxos.map((utxo) => {
                const id = utxo.id.toString();
                return id.split("#")[0];
            }),
        );

        await this.store.log(
            "yuyqy",
            `Found ${uniqueTxIds.size} unique transaction IDs`,
        );
        for (const txId of uniqueTxIds) {
            await this.store.log(
                "48nyb",
                `Fetching transaction details for ${txId}`,
            );
            await this.findOrFetchTxDetails(txId);
        }

        // Find the charter UTXO (contains the "charter" token from capo mph)
        const charterUtxo = this.findCharterUtxo(capoUtxos);
        if (!charterUtxo) {
            throw new Error("Charter UTXO not found at capo address");
        }

        // Decode charter data using the bridge
        const charterData = this.decodeCharterData(charterUtxo);
        this._charterData = charterData;

        // Resolve and catalog delegate UUTs
        await this.catalogDelegateUuts(charterData);

        // Fetch and store the latest block details
        await this.fetchAndStoreLatestBlock();

        // REQT/fn70x96nxm: After first sync, resolve pending state
        await this.resolvePendingState();

        this.syncReadyResolve();
        this.events.emit("syncComplete");
    }

    /**
     * Checks for new transactions at the capo address and indexes new UTXOs.
     * Supports pagination with configurable page size and max pages.
     *
     * REQT/fh56sce22g (checkForNewTxns)
     */
    async checkForNewTxns(fromBlockHeight?: number): Promise<void> {
        this.events.emit("syncing");

        const startHeight =
            fromBlockHeight ??
            (this.lastBlockHeight > 0 ? this.lastBlockHeight + 1 : 0);

        if (startHeight == 0) {
            this.events.emit("synced");
            throw new Error(
                "Cannot start checking for new transactions at block height 0",
            );
        }

        let currentPage = 1;
        let hasMorePages = true;
        let lastTxIndex: number | undefined;
        let highestBlockHeight = 0;

        while (hasMorePages && currentPage <= this.maxSyncPages) {
            // Build URL with pagination parameters
            let url = `addresses/${this.capoAddress}/transactions?order=asc&count=${this.syncPageSize}&from=${startHeight}`;
            if (lastTxIndex !== undefined) {
                // For subsequent pages, use the last tx_index as offset
                url += `&after=${lastTxIndex}`;
            }

            const untyped = await this.fetchFromBlockfrost<unknown[]>(url);

            if (!Array.isArray(untyped) || untyped.length === 0) {
                hasMorePages = false;
                break;
            }

            // Type cast instead of runtime validation - trusting Blockfrost API
            const transactionSummaries = untyped as AddressTransactionSummariesType[];

            // Process transactions from this page
            for (const summary of transactionSummaries) {
                await this.processTransactionForNewUtxos(
                    summary.tx_hash,
                    summary,
                );
                // Track highest block height seen for slot advancement
                if (summary.block_height > highestBlockHeight) {
                    highestBlockHeight = summary.block_height;
                }
            }

            // Check if there might be more pages
            if (untyped.length < this.syncPageSize) {
                hasMorePages = false;
            } else {
                // Use the last transaction's tx_index for pagination
                const lastSummary =
                    transactionSummaries[transactionSummaries.length - 1];
                lastTxIndex = lastSummary.tx_index;
                currentPage++;
            }
        }

        if (currentPage > this.maxSyncPages && hasMorePages) {
            await this.store.log(
                "pglim",
                `Stopped after ${this.maxSyncPages} pages (maxSyncPages limit reached)`,
            );
        }

        // REQT/9gq8rwg9ng: Fetch latest block unconditionally to advance lastSlot.
        // Pending-tx deadline rollback (checkPendingDeadlines) compares against lastSlot,
        // so it must reflect the current chain tip even when no new transactions are found.
        try {
            await this.fetchAndStoreLatestBlock();
        } catch (e: any) {
            await this.store.log(
                "bk5er",
                `Failed to fetch latest block for slot advancement: ${e.message || e}`,
            );
        }

        this.events.emit("synced");
    }

    /**
     * Starts periodic refresh timer to automatically check for new transactions,
     * and the 10s deadline-check timer for pending tx management.
     *
     * REQT/zzsg63b2fb (Automated Periodic Refresh)
     * REQT/a9y19g0pmr (Rollback Expired Pending Transaction — 10s timer)
     */
    startPeriodicRefresh(): void {
        if (this.refreshTimerId) {
            return; // Already running
        }
        this.store.log(
            "pr5t1",
            `Starting periodic refresh every ${refreshInterval / 1000} seconds`,
        );
        this.refreshTimerId = setInterval(async () => {
            try {
                await this.checkForNewTxns();
            } catch (e) {
                console.warn("Periodic refresh failed:", e);
                this.store.log(
                    "pr5er",
                    `Periodic refresh error: ${e instanceof Error ? e.message : String(e)}`,
                );
            }
        }, refreshInterval);
        
        this.refreshTimerId.unref?.();

        // REQT/a9y19g0pmr: Start 10s deadline-check timer
        // REQT/agg98btez8: Also runs 72h purge
        this.deadlineTimerId = setInterval(async () => {
            try {
                await this.checkPendingDeadlines();
            } catch (e) {
                console.warn("Pending deadline check failed:", e);
            }
        }, 10_000);
        this.deadlineTimerId.unref?.();
    }

    /**
     * Stops the periodic refresh timer and the deadline-check timer.
     *
     * REQT/zzsg63b2fb (Automated Periodic Refresh)
     * REQT/a9y19g0pmr (Rollback timer lifecycle)
     */
    stopPeriodicRefresh(): void {
        if (this.refreshTimerId) {
            this.store.log("pr5t0", "Stopping periodic refresh");
            clearInterval(this.refreshTimerId);
            this.refreshTimerId = null;
        }
        if (this.deadlineTimerId) {
            clearInterval(this.deadlineTimerId);
            this.deadlineTimerId = null;
        }
    }

    /**
     * Returns whether periodic refresh is currently active.
     *
     * REQT/zzsg63b2fb (Automated Periodic Refresh)
     */
    get isPeriodicRefreshActive(): boolean {
        return this.refreshTimerId !== null;
    }

    // =========================================================================
    // REQT/ngn9agx52a: Wallet Address Indexing
    // =========================================================================

    /**
     * Registers a wallet address for UTXO indexing.
     * Fetches current UTXOs and stores them in the cache.
     *
     * REQT/mp4dx7ngvf (Address Registration)
     */
    async addWalletAddress(address: string): Promise<void> {
        await this.syncReady;

        // Check if already registered
        const existing = await this.store.findWalletAddress(address);
        if (existing) {
            await this.store.log(
                "wa1sk",
                `Wallet address ${address} already registered, skipping`,
            );
            return;
        }

        await this.store.log("wa1rg", `Registering wallet address: ${address}`);

        // Fetch current UTXOs from network
        const heliosAddress = makeAddress(address);
        const utxos = await this.network.getUtxos(heliosAddress);

        // Store each UTXO in the cache
        for (const utxo of utxos) {
            const entry = this.txInputToIndexEntry(utxo);
            await this.store.saveUtxo(entry);
        }

        // Save wallet address with sync state
        await this.store.saveWalletAddress({
            address,
            lastBlockHeight: this.lastBlockHeight,
            lastSyncTime: Date.now(),
        });

        await this.store.log(
            "wa1ok",
            `Registered wallet address ${address} with ${utxos.length} UTXOs`,
        );
    }

    /**
     * Syncs UTXOs for a registered wallet address if stale.
     * Returns true if sync was performed, false if cache was fresh.
     *
     * REQT/92m7kpkny7 (On-Demand Sync)
     */
    private async syncWalletAddressIfStale(address: string): Promise<boolean> {
        const walletEntry = await this.store.findWalletAddress(address);
        if (!walletEntry) {
            return false; // Not a registered wallet
        }

        const now = Date.now();
        const age = now - walletEntry.lastSyncTime;

        if (age < this.walletStalenessMs) {
            return false; // Cache is fresh
        }

        await this.store.log(
            "wa2sy",
            `Wallet ${address} is stale (${Math.round(age / 1000)}s old), syncing`,
        );

        // Fetch fresh UTXOs from network
        const heliosAddress = makeAddress(address);
        const utxos = await this.network.getUtxos(heliosAddress);

        // REQT/06b01nyf51: Reconcile cached UTxOs against fresh network snapshot
        // Build set of fresh utxoIds for O(1) lookup
        const freshUtxoIds = new Set(utxos.map((u) => u.id.toString()));

        // Find cached unspent UTxOs for this address that are no longer on-chain
        const cachedUtxos = await this.store.findUtxosByAddress(address);
        let removedCount = 0;
        for (const cached of cachedUtxos) {
            if (!freshUtxoIds.has(cached.utxoId)) {
                await this.store.deleteUtxo(cached.utxoId);
                removedCount++;
            }
        }

        // Store fresh UTXOs (put will overwrite existing by utxoId)
        for (const utxo of utxos) {
            const entry = this.txInputToIndexEntry(utxo);
            await this.store.saveUtxo(entry);
        }

        // Update sync state
        await this.store.saveWalletAddress({
            address,
            lastBlockHeight: this.lastBlockHeight,
            lastSyncTime: now,
        });

        await this.store.log(
            "wa2ok",
            `Synced wallet ${address}: ${utxos.length} UTXOs (${removedCount} stale removed)`,
        );

        return true;
    }

    // =========================================================================
    // REQT/5bmbf54qhy: Parsed Record Index
    // =========================================================================

    /**
     * Attaches a Capo instance for datum parsing.
     * When attached, new UTXOs with inline datums will be parsed during monitoring,
     * and any cached UTXOs not yet parsed will be caught up.
     *
     * REQT/yx0yze9swf (Optional Capo Attachment)
     */
    async attachCapo(capo: Capo<any>): Promise<void> {
        this._capo = capo;
        await this.store.log(
            "ac1at",
            "Capo attached for datum parsing",
        );

        // REQT/3aew7g7wdw: Trigger catchup of unparsed cached UTXOs
        await this.catchupRecordParsing();
    }

    /**
     * Catches up record parsing for cached UTXOs that haven't been parsed yet.
     * Called when a Capo is attached after raw-only indexing.
     *
     * REQT/3aew7g7wdw (Catchup on Capo Attachment)
     */
    private async catchupRecordParsing(): Promise<void> {
        if (!this._capo) return;

        // Ensure charterData is available — in cache-first startup, _charterData
        // is not set because syncNow() skips the full sync path.
        // Fetch once here to avoid per-datum charter lookups.
        if (!this._charterData) {
            const charterData = await this._capo.findCharterData();
            this._charterData = charterData;
        }

        const lastParsed = await this.store.getLastParsedBlockHeight();

        await this.store.log(
            "cu1st",
            `Starting record catchup from lastParsedBlockHeight=${lastParsed}`,
        );

        // REQT/3aew7g7wdw: Query cached UTXOs needing parsing
        const unparsedUtxos = await this.store.findUtxosByBlockHeightRange(
            lastParsed,
            { withInlineDatum: true, unspentOnly: true },
        );

        await this.store.log(
            "cu2ct",
            `Found ${unparsedUtxos.length} UTXOs to parse for records`,
        );

        let parsedCount = 0;
        for (const entry of unparsedUtxos) {
            const saved = await this.parseAndSaveRecord(entry);
            if (saved) parsedCount++;
        }

        // REQT/38d4zc2qrx: Advance lastParsedBlockHeight
        const newHeight = this.lastBlockHeight > 0 ? this.lastBlockHeight : lastParsed;
        await this.store.setLastParsedBlockHeight(newHeight);

        await this.store.log(
            "cu3ok",
            `Catchup complete: parsed ${parsedCount} records, advanced lastParsedBlockHeight to ${newHeight}`,
        );
    }

    /**
     * Parses an inline datum from a UtxoIndexEntry and saves the parsed record.
     * Returns true if a record was saved, false if the datum was not parseable.
     *
     * @param entry - The UTXO entry containing an inline datum to parse
     * @param charterData - Optional pre-fetched charter data to avoid redundant lookups
     *
     * REQT/pshpah30em (Parse Datum for New UTXOs)
     */
    private async parseAndSaveRecord(entry: UtxoIndexEntry, charterData?: CharterData): Promise<boolean> {
        if (!this._capo || !entry.inlineDatum) return false;

        try {
            // Decode CBOR hex to UplcData
            const uplcData = decodeUplcData(hexToBytes(entry.inlineDatum));

            // REQT/gtgje3zy0g: Use Capo's parseDelegatedDatum method
            // Pass charterData to avoid redundant charter fetches per datum
            const parsed = await this._capo.parseDelegatedDatum(uplcData, charterData ?? this._charterData);
            if (!parsed) return false; // REQT/pshpah30em: Gracefully skip unparseable datums

            // REQT/xpvvqfwf5m: Store as RecordIndexEntry with structured data
            const record: RecordIndexEntry = {
                id: parsed.id,
                utxoId: entry.utxoId,
                type: parsed.type,
                parsedData: transformByteArrays(parsed.data),
            };

            await this.store.saveRecord(record);
            return true;
        } catch (e: any) {
            // Log but don't fail — parsing errors for individual datums shouldn't block indexing
            await this.store.log(
                "pr1er",
                `Error parsing datum for ${entry.utxoId}: ${e.message || e}`,
            );
            return false;
        }
    }

    // =========================================================================
    // REQT/gdmdg66paw: Record Query Methods
    // =========================================================================

    /**
     * Finds a parsed record by its record ID.
     * Returns undefined if not found or if the record's UTXO has been spent.
     *
     * REQT/gdmdg66paw (Record Query Methods)
     */
    async findRecord(id: string): Promise<RecordIndexEntry | undefined> {
        await this.syncReady;
        return this.store.findRecord(id);
    }

    /**
     * Finds all parsed records of a given type.
     * Filters out records whose UTXOs have been spent.
     *
     * REQT/gdmdg66paw (Record Query Methods)
     */
    async findRecordsByType(
        type: string,
        options?: { limit?: number; offset?: number },
    ): Promise<RecordIndexEntry[]> {
        await this.syncReady;
        return this.store.findRecordsByType(type, options);
    }

    // =========================================================================
    // REQT/3dhhjsav15: In-Flight Transaction Integration
    // =========================================================================

    /**
     * Registers a pending transaction in the index.
     * Called once per transaction, in submission order, after successful network submission.
     *
     * Decodes the signed CBOR, marks inputs as speculatively spent, indexes outputs,
     * parses records if Capo attached, and persists PendingTxEntry.
     *
     * REQT/p2ts24jbkg (Register Pending Transaction)
     * REQT/c3ytg4rttd (Deadline Calculation)
     * REQT/2w2yyc2m1k (In-Memory Pending Map)
     */
    async registerPendingTx(
        signedCborHex: string,
        opts: {
            description: string;
            id: string;
            parentId?: string;
            depth: number;
            moreInfo?: string;
            txName?: string;
            txCborHex: string;
            txd?: TxDescription<any, "submitted">;
        },
    ): Promise<void> {
        // REQT/p2ts24jbkg: Decode signed CBOR via existing decodeTx() pipeline
        const tx = decodeTx(signedCborHex);
        const txHash = tx.id().toHex();

        alert(`🟡 REGISTER PENDING TX: ${txHash.slice(0, 8)}… — ${opts.description} — capo=${!!this._capo}`);
        await this.store.log(
            "pt1rg",
            `Registering pending tx ${txHash}: ${opts.description}, capo=${!!this._capo}`,
        );

        // REQT/c3ytg4rttd: Compute deadline from tx validity interval
        const lastValidSlot = tx.body.lastValidSlot;
        if (lastValidSlot === undefined) {
            throw new Error(
                `Cannot register pending tx ${txHash}: transaction has no validity end (lastValidSlot)`,
            );
        }
        const deadline = lastValidSlot + this.graceBufferSlots; // REQT/c3ytg4rttd

        // REQT/p2ts24jbkg: Persist PendingTxEntry to store
        const pendingEntry: PendingTxEntry = {
            txHash,
            description: opts.description,
            id: opts.id,
            parentId: opts.parentId,
            depth: opts.depth,
            moreInfo: opts.moreInfo,
            txName: opts.txName,
            txCborHex: opts.txCborHex,
            signedTxCborHex: signedCborHex,
            deadline,
            status: "pending",
            submittedAt: Date.now(),
        };
        await this.store.savePendingTx(pendingEntry);
        this.pendingTxHashes.add(txHash);

        // REQT/p2ts24jbkg: Mark each input as speculatively spent
        // REQT/mjhf1yezr9: Track consumed utxoIds for isPending() spent-by-pending lookup
        for (const input of tx.body.inputs) {
            const utxoId = input.id.toString();
            this.pendingSpentUtxoIds.set(utxoId, txHash);
            const existingUtxo = await this.store.findUtxoId(utxoId);
            if (existingUtxo && !existingUtxo.spentInTx) {
                await this.store.markUtxoSpent(utxoId, txHash);
                await this.store.log(
                    "pt2sp",
                    `Marked UTXO ${utxoId} as speculatively spent by pending tx ${txHash}`,
                );
            }
        }

        // REQT/p2ts24jbkg: Index each output via existing indexUtxoFromOutput()
        for (
            let outputIndex = 0;
            outputIndex < tx.body.outputs.length;
            outputIndex++
        ) {
            const output = tx.body.outputs[outputIndex];
            await this.indexUtxoFromOutput(txHash, outputIndex, output, 0);
            const utxoId = this.formatUtxoId(txHash, outputIndex);
            const indexed = await this.store.findUtxoId(utxoId);
            await this.store.log(
                "pt2ix",
                `Indexed pending output ${utxoId} at address ${indexed?.address ?? "UNKNOWN"}, hasDatum=${!!indexed?.inlineDatum}`,
            );
        }

        // REQT/p2ts24jbkg: Parse inline datums into records if Capo is attached
        if (this._capo) {
            let parsedCount = 0;
            let skippedCount = 0;
            for (
                let outputIndex = 0;
                outputIndex < tx.body.outputs.length;
                outputIndex++
            ) {
                const utxoId = this.formatUtxoId(txHash, outputIndex);
                const entry = await this.store.findUtxoId(utxoId);
                if (entry && entry.inlineDatum) {
                    const saved = await this.parseAndSaveRecord(entry);
                    if (saved) {
                        parsedCount++;
                        await this.store.log(
                            "pt2rc",
                            `Parsed pending record from ${utxoId}`,
                        );
                    } else {
                        skippedCount++;
                        await this.store.log(
                            "pt2rs",
                            `Datum at ${utxoId} did not parse to a record (parseAndSaveRecord returned false)`,
                        );
                    }
                }
            }
            alert(`🟡 PENDING RECORDS: ${parsedCount} parsed, ${skippedCount} skipped, ${tx.body.outputs.length} total outputs`);
            await this.store.log(
                "pt2rd",
                `Pending record parsing complete: ${parsedCount} parsed, ${skippedCount} skipped, ${tx.body.outputs.length} total outputs`,
            );
        } else {
            alert(`🔴 NO CAPO — skipping record parsing for pending tx ${txHash.slice(0, 8)}…`);
            await this.store.log(
                "pt2nc",
                `⚠️ No Capo attached — skipping record parsing for pending tx ${txHash}. Records will NOT be queryable until confirmation sync.`,
            );
        }

        // REQT/2w2yyc2m1k: Store live txd in memory map for same-session consumers
        if (opts.txd) {
            this.pendingTxMap.set(txHash, opts.txd);
        }

        // Also store the tx CBOR for future reference
        await this.store.saveTx({ txid: txHash, cbor: signedCborHex });

        await this.store.log(
            "pt3ok",
            `Registered pending tx ${txHash}: ${tx.body.inputs.length} inputs spent, ${tx.body.outputs.length} outputs indexed, deadline slot ${deadline}`,
        );
    }

    /**
     * Confirms a pending transaction that has been discovered in a block.
     * Skips normal indexing since outputs are already indexed and inputs already marked spent.
     *
     * REQT/58b9nzgcbj (Confirm Pending Transaction)
     * REQT/fz6z7rr702 (Pending Transaction Events)
     */
    private async confirmPendingTx(txHash: string): Promise<void> {
        const pendingEntry = await this.store.findPendingTx(txHash);
        if (!pendingEntry || pendingEntry.status !== "pending") return;

        alert(`🟢 CONFIRM PENDING TX: ${txHash.slice(0, 8)}… — ${pendingEntry.description}`);
        await this.store.log(
            "pt4cf",
            `Confirming pending tx ${txHash}: ${pendingEntry.description}`,
        );

        // REQT/58b9nzgcbj: Set status to confirmed
        await this.store.setPendingTxStatus(txHash, "confirmed");
        this.pendingTxHashes.delete(txHash);

        // REQT/fz6z7rr702: Emit txConfirmed event
        const txd = this.pendingTxMap.get(txHash);
        this.events.emit("txConfirmed", {
            txHash,
            description: pendingEntry.description,
            txd,
        });

        // Clean up in-memory maps
        this.pendingTxMap.delete(txHash);
        this.cleanupPendingSpentUtxoIds(txHash);

        await this.store.log(
            "pt4ok",
            `Confirmed pending tx ${txHash}`,
        );
    }

    /**
     * Checks for pending transactions whose deadlines have expired
     * and rolls them back. Also runs 72h purge.
     *
     * REQT/a9y19g0pmr (Rollback Expired Pending Transaction)
     * REQT/agg98btez8 (Purge Old Pending Entries)
     */
    async checkPendingDeadlines(): Promise<void> {
        const pendingEntries = await this.store.getPendingByStatus("pending");
        const lastSyncedSlot = this.lastSlot;

        if (pendingEntries.length > 0) {
            console.log(
                `⏱️ checkPendingDeadlines: ${pendingEntries.length} pending, lastSlot ${lastSyncedSlot}`,
            );
            for (const entry of pendingEntries) {
                const remaining = entry.deadline - lastSyncedSlot;
                console.log(
                    `  📌 ${entry.txHash.slice(0, 8)}…: deadline ${entry.deadline}, ${remaining > 0 ? `~${remaining}s remaining` : `EXPIRED by ${-remaining}s`}`,
                );
            }
        }

        for (const entry of pendingEntries) {
            // REQT/c3ytg4rttd: Compare deadline against chain time (last synced block's slot)
            if (entry.deadline < lastSyncedSlot) {
                await this.rollbackPendingTx(entry);
            }
        }

        // REQT/agg98btez8: Purge non-pending entries older than 72 hours
        const purgeThreshold = Date.now() - 72 * 60 * 60 * 1000;
        await this.store.purgeOldPendingTxs(purgeThreshold);
    }

    /**
     * Rolls back a single expired pending transaction.
     * Restores speculatively-spent inputs, removes pending-origin outputs/records,
     * re-parses restored input UTXOs' datums, and emits rollback event.
     *
     * REQT/a9y19g0pmr (Rollback Expired Pending Transaction)
     * REQT/fz6z7rr702 (Pending Transaction Events)
     * See IN-1 (Implementer's Note): record restoration for overwritten records
     */
    private async rollbackPendingTx(entry: PendingTxEntry): Promise<void> {
        const { txHash } = entry;

        alert(`🔴 ROLLBACK PENDING TX: ${txHash.slice(0, 8)}… — ${entry.description} — deadline ${entry.deadline} < lastSlot ${this.lastSlot}`);
        await this.store.log(
            "pt5rb",
            `Rolling back expired pending tx ${txHash}: ${entry.description} (deadline slot ${entry.deadline} < last synced slot ${this.lastSlot})`,
        );

        // Step 1: Restore speculatively-spent UTXOs
        await this.store.clearSpentByTx(txHash);

        // Step 2: Remove pending-origin UTXOs
        await this.store.deleteUtxosByTxHash(txHash);

        // Step 3: Remove pending-origin records
        await this.store.deleteRecordsByTxHash(txHash);

        // Step 4 (IN-1): Re-parse datums from restored input UTXOs
        // The pending tx may have overwritten records (same id, put() on PK).
        // Now that inputs are restored, re-parse their datums to recreate original records.
        if (this._capo) {
            try {
                const tx = decodeTx(entry.signedTxCborHex);
                for (const input of tx.body.inputs) {
                    const utxoId = input.id.toString();
                    const restoredUtxo = await this.store.findUtxoId(utxoId);
                    if (restoredUtxo && restoredUtxo.inlineDatum && !restoredUtxo.spentInTx) {
                        await this.parseAndSaveRecord(restoredUtxo);
                    }
                }
            } catch (e: any) {
                await this.store.log(
                    "pt5re",
                    `Error re-parsing records during rollback of ${txHash}: ${e.message || e}`,
                );
            }
        }

        // Step 5: Update status
        await this.store.setPendingTxStatus(txHash, "rolled-back");
        this.pendingTxHashes.delete(txHash);

        // Step 6: Emit rollback event
        // REQT/fz6z7rr702: Include CBOR for recovery path
        const txd = this.pendingTxMap.get(txHash);
        this.events.emit("txRolledBack", {
            txHash,
            description: entry.description,
            cbor: entry.signedTxCborHex,
            txd,
        });

        // Clean up in-memory maps
        this.pendingTxMap.delete(txHash);
        this.cleanupPendingSpentUtxoIds(txHash);

        await this.store.log(
            "pt5ok",
            `Rolled back pending tx ${txHash}`,
        );
    }

    /**
     * Loads pending entries from Dexie on startup (page reload recovery).
     * Populates pendingTxHashes for fast lookup during checkForNewTxns.
     * Does NOT populate pendingTxMap — that's session-scoped.
     *
     * REQT/fn70x96nxm (Startup Recovery)
     */
    private async loadPendingFromStore(): Promise<void> {
        const pendingEntries = await this.store.getPendingByStatus("pending");
        for (const entry of pendingEntries) {
            this.pendingTxHashes.add(entry.txHash);

            // Restore pendingSpentUtxoIds by decoding the stored CBOR
            try {
                const tx = decodeTx(entry.signedTxCborHex);
                for (const input of tx.body.inputs) {
                    this.pendingSpentUtxoIds.set(input.id.toString(), entry.txHash);
                }
            } catch (e: any) {
                await this.store.log(
                    "pt6er",
                    `Error decoding CBOR for pending tx ${entry.txHash} during recovery: ${e.message || e}`,
                );
            }
        }
        if (pendingEntries.length > 0) {
            await this.store.log(
                "pt6ld",
                `Loaded ${pendingEntries.length} pending entries from store for recovery`,
            );
        }
    }

    /**
     * Resolves pending state after first sync cycle.
     * Checks deadlines for any remaining pending entries (checkForNewTxns already
     * handled confirmations). Flips pendingSyncState to "fresh" and emits pendingSynced.
     *
     * REQT/fn70x96nxm (Startup Recovery)
     * REQT/9r9rc1hrfv (pendingSyncState Property)
     * REQT/fz6z7rr702 (Pending Transaction Events — pendingSynced)
     */
    private async resolvePendingState(): Promise<void> {
        // Roll back any expired pending entries
        await this.checkPendingDeadlines();

        // REQT/9r9rc1hrfv: Flip to fresh
        this._pendingSyncState = "fresh";

        // REQT/fz6z7rr702: Emit pendingSynced
        this.events.emit("pendingSynced");

        await this.store.log(
            "pt7rs",
            `Pending state resolved: pendingSyncState is now "fresh"`,
        );
    }

    // =========================================================================
    // REQT/mjhf1yezr9: isPending Query
    // REQT/r0y7s2vggr: getPendingTxs Query
    // =========================================================================

    /**
     * Synchronous check whether a UTXO is associated with a pending transaction.
     * Returns the pending txHash if the item originates from or is spent by a pending tx,
     * undefined otherwise.
     *
     * REQT/mjhf1yezr9 (isPending Query)
     */
    isPending(item: TxOutputId | string | FoundDatumUtxo<any, any>): string | undefined {
        // Normalize to utxoId string
        let utxoId: string;
        if (typeof item === "string") {
            utxoId = item;
        } else if ("utxo" in item) {
            // FoundDatumUtxo — extract utxoId from the TxInput
            utxoId = item.utxo.id.toString();
        } else {
            // TxOutputId
            utxoId = item.toString();
        }

        // REQT/mjhf1yezr9: Check if this utxoId originates from a pending tx (txHash prefix match)
        const txHashFromId = utxoId.split("#")[0];
        if (this.pendingTxHashes.has(txHashFromId)) {
            return txHashFromId;
        }

        // REQT/mjhf1yezr9: Check if this utxoId is spent by a pending tx
        const spentByTxHash = this.pendingSpentUtxoIds.get(utxoId);
        if (spentByTxHash !== undefined) {
            return spentByTxHash;
        }

        return undefined;
    }

    /**
     * Removes all entries from pendingSpentUtxoIds belonging to a given txHash.
     * Called during confirmation and rollback cleanup.
     */
    private cleanupPendingSpentUtxoIds(txHash: string): void {
        for (const [utxoId, hash] of this.pendingSpentUtxoIds) {
            if (hash === txHash) {
                this.pendingSpentUtxoIds.delete(utxoId);
            }
        }
    }

    /**
     * Returns all pending transaction entries.
     *
     * REQT/r0y7s2vggr (getPendingTxs Query)
     */
    async getPendingTxs(): Promise<PendingTxEntry[]> {
        return this.store.getPendingByStatus("pending");
    }

    /**
     * Processes a transaction to identify and index new UTXOs.
     * REQT/58b9nzgcbj: If the txHash matches a pending entry, skip normal indexing
     * and confirm the pending transaction instead.
     *
     * REQT/0vrkpk6a6h (processTransactionForNewUtxos)
     */
    private async processTransactionForNewUtxos(
        txHash: string,
        summary: AddressTransactionSummariesType,
    ): Promise<void> {
        // REQT/58b9nzgcbj: Check if this tx is a pending entry being confirmed
        if (this.pendingTxHashes.has(txHash)) {
            alert(`🟢 SYNC found pending tx ${txHash.slice(0, 8)}… — fast-path confirm (skip re-index)`);
            await this.confirmPendingTx(txHash);
            return; // Skip normal indexing — outputs already indexed, inputs already marked spent
        }

        const tx = await this.findOrFetchTxDetails(txHash);
        const mph = this._mph;
        let charterChanged = false;

        for (
            let outputIndex = 0;
            outputIndex < tx.body.outputs.length;
            outputIndex++
        ) {
            const output = tx.body.outputs[outputIndex];
            const utxoId = this.formatUtxoId(txHash, outputIndex);

            const existingUtxo = await this.store.findUtxoId(utxoId);
            if (existingUtxo) {
                continue;
            }

            // REQT/0vrkpk6a6h: Index ALL outputs, not just UUT-containing ones
            // REQT/6h4f158gvs: Pass block_height from transaction summary
            await this.indexUtxoFromOutput(txHash, outputIndex, output, summary.block_height);

            // REQT/xrdj6qpgnj: Check if charter token is present (indicates charter change)
            const tokenNames = output.value.assets.getPolicyTokenNames(mph);
            for (const tokenNameBytes of tokenNames) {
                try {
                    const tokenName = new TextDecoder().decode(
                        new Uint8Array(tokenNameBytes),
                    );
                    if (tokenName === "charter") {
                        charterChanged = true;
                    }
                } catch (e: any) {
                    console.error(
                        `ignoring non-UTF8 token name:`,
                        tokenNameBytes,
                        e.message || e,
                    );
                    // Skip invalid token names
                }
            }
        }

        // REQT/pshpah30em: Parse inline datums for new outputs when Capo is attached
        // Processing-order invariant: outputs are processed (above) before inputs (below)
        // to ensure record save-by-id precedes any spent-state cascade.
        if (this._capo) {
            for (
                let outputIndex = 0;
                outputIndex < tx.body.outputs.length;
                outputIndex++
            ) {
                const utxoId = this.formatUtxoId(txHash, outputIndex);
                const entry = await this.store.findUtxoId(utxoId);
                if (entry && entry.inlineDatum) {
                    await this.parseAndSaveRecord(entry);
                }
            }
        }

        // REQT/hhbcnvd9aj: Process inputs to mark spent UTXOs
        for (const input of tx.body.inputs) {
            const utxoId = input.id.toString();
            const existingUtxo = await this.store.findUtxoId(utxoId);
            if (existingUtxo && !existingUtxo.spentInTx) {
                await this.store.markUtxoSpent(utxoId, txHash);
                await this.store.log(
                    "sp3nt",
                    `Marked UTXO ${utxoId} as spent in tx ${txHash}`,
                );
            }
        }

        // REQT/xrdj6qpgnj: Re-catalog delegates if charter changed
        if (charterChanged) {
            await this.store.log(
                "ch4rt",
                `Charter token detected in tx ${txHash}, re-cataloging delegates`,
            );
            // Fetch fresh UTXOs and decode charter
            const capoUtxos = await this.network.getUtxos(this._address);
            const charterUtxo = this.findCharterUtxo(capoUtxos);
            if (charterUtxo) {
                const charterData = this.decodeCharterData(charterUtxo);
                this._charterData = charterData;
                await this.catalogDelegateUuts(charterData);
            }
        }
    }

    /**
     * Extracts UUT identifiers from a TxOutput's value.
     * UUT names match pattern: {purpose}-{hash} where purpose is [a-z]+ and hash is 12 hex chars.
     *
     * REQT/cchf3wgnk3 (UUT Catalog Storage)
     */
    private extractUutIds(output: TxOutput): string[] {
        const uutPattern = /^[a-z]+-[0-9a-f]{12}$/;
        const tokenNames = output.value.assets.getPolicyTokenNames(this._mph);

        return tokenNames
            .map((bytes) => {
                try {
                    return new TextDecoder().decode(new Uint8Array(bytes));
                } catch (e: any) {
                    console.error(
                        `ignoring non-UTF8 token name:`,
                        bytes,
                        e.message || e,
                    );
                    return "";
                }
            })
            .filter((name) => uutPattern.test(name));
    }

    /**
     * Extracts UUT identifiers from a TxInput's value.
     */
    private extractUutIdsFromTxInput(txInput: TxInput): string[] {
        const uutPattern = /^[a-z]+-[0-9a-f]{12}$/;
        const tokenNames = txInput.value.assets.getPolicyTokenNames(this._mph);

        return tokenNames
            .map((bytes) => {
                try {
                    return new TextDecoder().decode(new Uint8Array(bytes));
                } catch (e: any) {
                    console.error(
                        `ignoring non-UTF8 token name:`,
                        bytes,
                        e.message || e,
                    );
                    return "";
                }
            })
            .filter((name) => uutPattern.test(name));
    }

    /**
     * Converts a TxOutput to a storage-agnostic UtxoIndexEntry.
     *
     * TYPE BOUNDARY: This method converts Helios types to storage types.
     * REQT/6h4f158gvs: blockHeight populated from transaction summary when available.
     */
    private txOutputToIndexEntry(
        txHash: string,
        outputIndex: number,
        output: TxOutput,
        blockHeight: number = 0,
    ): UtxoIndexEntry {
        const utxoId = this.formatUtxoId(txHash, outputIndex);

        // Extract tokens using getPolicies() and getPolicyTokens()
        const tokens: UtxoIndexEntry["tokens"] = [];
        for (const mph of output.value.assets.getPolicies()) {
            for (const [tokenName, qty] of output.value.assets.getPolicyTokens(
                mph,
            )) {
                tokens.push({
                    policyId: mph.toHex(),
                    tokenName: bytesToHex(tokenName),
                    quantity: qty,
                });
            }
        }

        // Extract datum
        // Store raw UPLC data CBOR for inline datums (consistent with Blockfrost format)
        let datumHash: string | null = null;
        let inlineDatum: string | null = null;
        if (output.datum) {
            if (output.datum.kind === "HashedTxOutputDatum") {
                datumHash = output.datum.hash.toHex();
            } else if (output.datum.kind === "InlineTxOutputDatum") {
                inlineDatum = bytesToHex(output.datum.data.toCbor());
            }
        }

        // Extract reference script hash if present
        const referenceScriptHash = output.refScript
            ? bytesToHex(output.refScript.hash())
            : null;

        return {
            utxoId,
            address: this.addressToBech32(output.address),
            lovelace: output.value.lovelace,
            tokens,
            datumHash,
            inlineDatum,
            referenceScriptHash,
            uutIds: this.extractUutIds(output),
            spentInTx: null,  // REQT/11msfc4wv8: New UTXOs are unspent
            blockHeight,       // REQT/6h4f158gvs
        };
    }

    /**
     * Converts a TxInput to a storage-agnostic UtxoIndexEntry.
     *
     * TYPE BOUNDARY: This method converts Helios types to storage types.
     * REQT/6h4f158gvs: blockHeight defaults to 0 when not available from call context.
     */
    private txInputToIndexEntry(txInput: TxInput, blockHeight: number = 0): UtxoIndexEntry {
        const utxoId = txInput.id.toString();

        // Extract tokens using getPolicies() and getPolicyTokens()
        const tokens: UtxoIndexEntry["tokens"] = [];
        for (const mph of txInput.value.assets.getPolicies()) {
            for (const [tokenName, qty] of txInput.value.assets.getPolicyTokens(
                mph,
            )) {
                tokens.push({
                    policyId: mph.toHex(),
                    tokenName: bytesToHex(tokenName),
                    quantity: qty,
                });
            }
        }

        // Extract datum
        // Store raw UPLC data CBOR for inline datums (consistent with Blockfrost format)
        let datumHash: string | null = null;
        let inlineDatum: string | null = null;
        if (txInput.datum) {
            if (txInput.datum.kind === "HashedTxOutputDatum") {
                datumHash = txInput.datum.hash.toHex();
            } else if (txInput.datum.kind === "InlineTxOutputDatum") {
                inlineDatum = bytesToHex(txInput.datum.data.toCbor());
            }
        }

        // Extract reference script hash if present
        const referenceScriptHash = txInput.output?.refScript
            ? bytesToHex(txInput.output.refScript.hash())
            : null;

        return {
            utxoId,
            address: this.addressToBech32(txInput.address),
            lovelace: txInput.value.lovelace,
            tokens,
            datumHash,
            inlineDatum,
            referenceScriptHash,
            uutIds: this.extractUutIdsFromTxInput(txInput),
            spentInTx: null,  // REQT/11msfc4wv8: New UTXOs are unspent
            blockHeight,       // REQT/6h4f158gvs
        };
    }

    /**
     * Converts Blockfrost UtxoDetailsType to storage-agnostic UtxoIndexEntry.
     *
     * TYPE BOUNDARY: This method converts Blockfrost types to storage types.
     * REQT/6h4f158gvs: blockHeight defaults to 0 for Blockfrost UTXO responses
     * (block hash is available but height requires additional lookup).
     */
    private blockfrostUtxoToIndexEntry(
        bfUtxo: UtxoDetailsType,
        utxoId: string,
        blockHeight: number = 0,
    ): UtxoIndexEntry {
        // Find lovelace amount
        const lovelaceAmount = bfUtxo.amount.find((a) => a.unit === "lovelace");
        const lovelace = lovelaceAmount ? BigInt(lovelaceAmount.quantity) : 0n;

        // Extract tokens (non-lovelace amounts)
        const tokens: UtxoIndexEntry["tokens"] = [];
        for (const amt of bfUtxo.amount) {
            if (amt.unit !== "lovelace") {
                // Unit format is policyId (56 hex) + tokenName (hex)
                const policyId = amt.unit.slice(0, 56);
                const tokenName = amt.unit.slice(56);
                tokens.push({
                    policyId,
                    tokenName,
                    quantity: BigInt(amt.quantity),
                });
            }
        }

        // Extract UUT IDs from tokens that match the capo's mph
        const capoMphHex = this.capoMph;
        const uutPattern = /^[a-z]+-[0-9a-f]{12}$/;
        const uutIds: string[] = [];
        for (const token of tokens) {
            if (token.policyId === capoMphHex) {
                // Convert hex token name to string
                const bytes = new Uint8Array(
                    token.tokenName
                        .match(/.{2}/g)
                        ?.map((b) => parseInt(b, 16)) || [],
                );
                try {
                    const name = new TextDecoder().decode(bytes);
                    if (uutPattern.test(name)) {
                        uutIds.push(name);
                    }
                } catch (e: any) {
                    console.error(
                        `ignoring non-UTF8 token name:`,
                        bytes,
                        e.message || e,
                    );
                    // Skip invalid token names
                }
            }
        }

        return {
            utxoId,
            address: bfUtxo.address,
            lovelace,
            tokens,
            datumHash: bfUtxo.data_hash,
            inlineDatum: bfUtxo.inline_datum,
            referenceScriptHash: bfUtxo.reference_script_hash,
            uutIds,
            spentInTx: null,  // REQT/11msfc4wv8: New UTXOs are unspent
            blockHeight,       // REQT/6h4f158gvs
        };
    }

    /**
     * Converts Blockfrost BlockDetailsType to storage-agnostic BlockIndexEntry.
     *
     * TYPE BOUNDARY: This method converts Blockfrost types to storage types.
     */
    private blockfrostBlockToIndexEntry(
        bfBlock: BlockDetailsType,
    ): BlockIndexEntry {
        return {
            hash: bfBlock.hash,
            height: bfBlock.height,
            time: bfBlock.time,
            slot: bfBlock.slot,
        };
    }

    /**
     * Finds the charter UTXO from a list of UTXOs.
     * The charter UTXO contains the "charter" token from the capo's minting policy.
     */
    private findCharterUtxo(utxos: TxInput[]): TxInput | undefined {
        const charterTokenName = bytesToHex([
            ...new TextEncoder().encode("charter"),
        ]);
        for (const utxo of utxos) {
            const tokens = utxo.value.assets.getPolicyTokens(this._mph);
            for (const [tokenName, _qty] of tokens) {
                if (bytesToHex(tokenName) === charterTokenName) {
                    return utxo;
                }
            }
        }
        return undefined;
    }

    /**
     * Decodes charter data from a charter UTXO using the bridge.
     */
    private decodeCharterData(charterUtxo: TxInput): CharterData {
        const datum = charterUtxo.datum;
        if (!datum || !datum.data) {
            throw new Error("Charter UTXO has no datum");
        }
        const decoded = this.bridge.reader.CapoDatum(datum.data);
        if (!decoded.CharterData) {
            throw new Error("Charter UTXO datum is not CharterData");
        }
        return decoded.CharterData;
    }

    /**
     * Indexes a UTXO from a transaction output.
     *
     * REQT/mvjrak021s (UTXO Indexing)
     * REQT/6h4f158gvs: blockHeight passed through from transaction summary.
     */
    private async indexUtxoFromOutput(
        txHash: string,
        outputIndex: number,
        output: TxOutput,
        blockHeight: number = 0,
    ): Promise<void> {
        const entry = this.txOutputToIndexEntry(txHash, outputIndex, output, blockHeight);
        await this.store.saveUtxo(entry);
    }

    /**
     * Catalogs delegate UUTs mentioned in the charter.
     * Uses delegate links directly with Blockfrost queries (decoupled from Capo).
     *
     * REQT/k0mnv27tz4 (catalogDelegateUuts)
     */
    private async catalogDelegateUuts(charterData: CharterData): Promise<void> {
        await this.store.log("z5h89", `Cataloging delegate UUTs`);

        // Get mint delegate UUT
        try {
            const mintDelegateLink = charterData.mintDelegateLink;
            if (mintDelegateLink?.uutName) {
                await this.store.log(
                    "ht8mg",
                    `Fetching mint delegate UUT: ${mintDelegateLink.uutName}`,
                );
                await this.fetchAndIndexDelegateLinkUut(
                    mintDelegateLink,
                    "mintDelegate",
                );
            }
        } catch (e: any) {
            throw new Error(
                `Could not resolve mint delegate UUT: ${e.message || e}`,
            );
        }

        // Get spend delegate UUT
        try {
            const spendDelegateLink = charterData.spendDelegateLink;
            if (spendDelegateLink?.uutName) {
                await this.store.log(
                    "fgmtv",
                    `Fetching spend delegate UUT: ${spendDelegateLink.uutName}`,
                );
                await this.fetchAndIndexDelegateLinkUut(
                    spendDelegateLink,
                    "spendDelegate",
                );
            }
        } catch (e: any) {
            throw new Error(
                `Could not resolve spend delegate UUT: ${e.message || e}`,
            );
        }

        // Get gov authority UUT
        try {
            const govAuthorityLink = charterData.govAuthorityLink;
            if (govAuthorityLink?.uutName) {
                await this.store.log(
                    "g8xpk",
                    `Fetching gov authority UUT: ${govAuthorityLink.uutName}`,
                );
                await this.fetchAndIndexDelegateLinkUut(
                    govAuthorityLink,
                    "govAuthority",
                );
            }
        } catch (e: any) {
            throw new Error(
                `Could not resolve gov authority UUT: ${e.message || e}`,
            );
        }

        // Get spend invariant UUTs
        if (charterData.spendInvariants) {
            for (let i = 0; i < charterData.spendInvariants.length; i++) {
                throw new Error(`TODO: support for invariants`);
            }
        }

        // Get mint invariant UUTs
        if (charterData.mintInvariants) {
            for (let i = 0; i < charterData.mintInvariants.length; i++) {
                throw new Error(`TODO: support for invariants`);
            }
        }

        // Get other named delegate UUTs
        if (charterData.otherNamedDelegates) {
            const namedDelegates =
                charterData.otherNamedDelegates instanceof Map
                    ? [...charterData.otherNamedDelegates.entries()]
                    : Object.entries(charterData.otherNamedDelegates);

            for (const [delegateName, delegateLink] of namedDelegates) {
                try {
                    if (
                        delegateLink &&
                        typeof delegateLink === "object" &&
                        "uutName" in delegateLink &&
                        delegateLink.uutName
                    ) {
                        await this.store.log(
                            "nd8uu",
                            `Fetching named delegate '${delegateName}' UUT`,
                        );
                        await this.fetchAndIndexDelegateLinkUut(
                            delegateLink as RelativeDelegateLink,
                            `namedDelegate:${delegateName}`,
                        );
                    }
                } catch (e: any) {
                    throw new Error(
                        `Could not resolve named delegate '${delegateName}' UUT: ${e.message || e}`,
                    );
                }
            }
        }

        // Get dgData controller UUTs from manifest
        for (const [entryName, entryInfo] of charterData.manifest.entries()) {
            const { DgDataPolicy } = entryInfo.entryType;
            if (!DgDataPolicy) {
                const actualType = Object.keys(entryInfo.entryType)[0];
                this.store.log(
                    "pm5rq",
                    `${entryName} is a ${actualType}, not a DgDataPolicy; skipping`,
                );
                continue;
            }
            try {
                const { policyLink } = DgDataPolicy;
                if (policyLink?.uutName) {
                    await this.store.log(
                        "c6awj",
                        `Fetching dgData controller UUT: ${policyLink.uutName}`,
                    );
                    await this.fetchAndIndexDelegateLinkUut(
                        policyLink,
                        `dgDataController:${entryName}`,
                    );
                }
            } catch (e: any) {
                throw new Error(
                    `Could not resolve dgData controller ${entryName}: ${e.message || e}`,
                );
            }
        }
    }

    /**
     * Fetches and indexes a delegate's authority token UTXO from a delegate link.
     */
    private async fetchAndIndexDelegateLinkUut(
        delegateLink: RelativeDelegateLink,
        label: string,
    ): Promise<void> {
        // Convert UTF-8 UUT name to bytes for makeAssetClass
        const tokenNameBytes = encodeUtf8(delegateLink.uutName);
        const assetClass = makeAssetClass(this._mph, tokenNameBytes);

        const address = delegateLink.delegateValidatorHash
            ? makeAddress(
                  this._isMainnet,
                  makeValidatorHash(delegateLink.delegateValidatorHash),
              )
            : this._address;

        await this.store.log(
            "dx8pq",
            `Fetching UUT for ${label} at address ${address.toString()}`,
        );

        const policyId = assetClass.mph.toHex();
        const assetName = bytesToHex(assetClass.tokenName);
        const asset = `${policyId}${assetName}`;

        const url = `addresses/${address.toString()}/utxos/${asset}?count=1&order=desc`;
        const untyped = await this.fetchFromBlockfrost<unknown[]>(url);

        if (!Array.isArray(untyped) || untyped.length === 0) {
            await this.store.log(
                "no8uu",
                `No UTXO found for ${label} with asset ${asset}`,
            );
            return;
        }

        // Type cast instead of runtime validation - trusting Blockfrost API
        const typed = untyped[0] as UtxoDetailsType;
        const utxoId = this.formatUtxoId(typed.tx_hash, typed.output_index);
        const entry = this.blockfrostUtxoToIndexEntry(typed, utxoId);
        await this.store.saveUtxo(entry);
    }

    /**
     * Indexes a UTXO from a TxInput object.
     */
    private async indexUtxoFromTxInput(txInput: TxInput): Promise<void> {
        const entry = this.txInputToIndexEntry(txInput);
        await this.store.saveUtxo(entry);
    }

    async fetchFromBlockfrost<T>(url: string): Promise<T> {
        // Use global rate limiter to avoid exceeding Blockfrost's rate limits
        console.log(`⚡ fetchFromBlockfrost: ${url}`);
        return getBlockfrostRateLimiter().fetch(`${this.blockfrostBaseUrl}/api/v0/${url}`, {
                headers: {
                    project_id: this.blockfrostKey,
                },
            })
            .then(async (res) => {
                const result = await res.json();
                if (!res.ok) {
                    await this.store.log(
                        "3ecxh",
                        `Error fetching from blockfrost: ${url} ${result.message}`,
                    );
                    throw new Error(result.message);
                }
                await this.store.log(
                    "rm7g8",
                    `Successfully fetched from blockfrost: ${url} ${JSON.stringify(result)}`,
                );
                return result as T;
            });
    }

    async findOrFetchBlockHeight(blockId: string): Promise<number> {
        const block = await this.store.findBlockId(blockId);
        if (block) {
            return block.height;
        }

        const details = await this.fetchBlockDetails(blockId);
        const entry = this.blockfrostBlockToIndexEntry(details);
        await this.store.saveBlock(entry);

        return entry.height;
    }

    async fetchBlockDetails(blockId: string): Promise<BlockDetailsType> {
        await this.store.log(
            "78q9n",
            `Fetching block details for ${blockId} from blockfrost`,
        );
        const untyped = await this.fetchFromBlockfrost(`blocks/${blockId}`);
        // Type cast instead of runtime validation - trusting Blockfrost API
        return untyped as BlockDetailsType;
    }

    async fetchAndStoreLatestBlock(): Promise<BlockIndexEntry> {
        await this.store.log("x2xzt", `Fetching latest block from blockfrost`);
        const untyped = await this.fetchFromBlockfrost(`blocks/latest`);
        // Type cast instead of runtime validation - trusting Blockfrost API
        const typed = untyped as BlockDetailsType;
        await this.store.log(
            "8y2yn",
            `latest block from blockfrost: #${typed.height} ${typed.hash}`,
        );

        const entry = this.blockfrostBlockToIndexEntry(typed);
        await this.store.saveBlock(entry);

        if (typed.height > this.lastBlockHeight) {
            await this.store.log(
                "2k3uq",
                `new latest block: #${typed.height} ${typed.hash}`,
            );
            this.lastBlockHeight = typed.height;
            this.lastBlockId = typed.hash;
            this.lastSlot = entry.slot;
        }

        return entry;
    }

    /**
     * Fetches and caches a reference script by its hash.
     * Returns the decoded UplcProgramV2 or undefined if not found.
     *
     * REQT/tqrhbphgyx (Reference Script Fetching)
     * REQT/k2wvnd3f1e (Script Storage)
     */
    async fetchAndCacheScript(
        scriptHash: string,
    ): Promise<UplcProgramV2 | undefined> {
        // Check cache first
        const cached = await this.store.findScript(scriptHash);
        if (cached) {
            return decodeUplcProgramV2FromCbor(cached.cbor);
        }

        // Fetch from Blockfrost
        try {
            const response = await this.fetchFromBlockfrost<{
                cbor: string | null;
            }>(`scripts/${scriptHash}/cbor`);

            if (!response.cbor) {
                await this.store.log(
                    "scr0",
                    `Script ${scriptHash} has no CBOR (may be native script)`,
                );
                return undefined;
            }

            // Cache the script CBOR
            await this.store.saveScript({ scriptHash, cbor: response.cbor });

            return decodeUplcProgramV2FromCbor(response.cbor);
        } catch (e: any) {
            throw new Error(
                `Failed to fetch script ${scriptHash}: ${e.message || e}`,
            );
        }
    }

    /**
     * Retrieves a transaction by ID.
     * Implements ReadonlyCardanoClient.getTx
     *
     * REQT/gx7y3z6ot (getTx Method)
     */
    async getTx(id: TxId): Promise<Tx> {
        await this.syncReady;
        return this.findOrFetchTxDetails(id.toHex());
    }

    /**
     * Retrieves a transaction by ID with fully-restored input data.
     * Uses Helios tx.recover() to populate input output data from cache.
     *
     * Unlike getTx() which returns raw decoded Tx, this method ensures
     * inputs have their output data (address, value, datum, refScript).
     *
     * REQT/qc7qgsqphv (getTx with Restored Inputs)
     */
    async getTxInfo(id: TxId): Promise<Tx> {
        await this.syncReady;
        const tx = await this.findOrFetchTxDetails(id.toHex());
        await tx.recover(this); // CachedUtxoIndex implements getUtxo()
        return tx;
    }

    async findOrFetchTxDetails(txId: string): Promise<Tx> {
        const txCbor = await this.store.findTxId(txId);

        if (txCbor) {
            return decodeTx(txCbor.cbor);
        }
        await this.store.log(
            "qwmrh",
            `Fetching tx details for ${txId} from blockfrost`,
        );
        const { cbor: cborHex } = await this.fetchFromBlockfrost<{
            cbor: string;
        }>(`txs/${txId}/cbor`);
        await this.store.saveTx({ txid: txId, cbor: cborHex });

        return decodeTx(cborHex);
    }

    async fetchTxDetails(txId: string): Promise<Tx> {
        await this.store.log("64qjp", `Fetching tx details for ${txId}`);
        const { cbor: cborHex } = await this.fetchFromBlockfrost<{
            cbor: string;
        }>(`txs/${txId}/cbor`);

        return decodeTx(cborHex);
    }

    /**
     * Constructs a UTXO ID from tx_hash and output_index
     */
    private formatUtxoId(txHash: string, outputIndex: number): string {
        return `${txHash}#${outputIndex}`;
    }

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
    async restoreTxInputs(tx: Tx): Promise<TxInput[]> {
        const restoredInputs: TxInput[] = [];

        for (const input of tx.body.inputs) {
            const utxoId = input.id.toString();
            const entry = await this.store.findUtxoId(utxoId);

            if (entry) {
                // Found in cache - restore from indexed entry
                restoredInputs.push(await this.indexEntryToTxInput(entry));
            } else {
                // Not in cache - fetch from network via getUtxo
                // Note: This may fail if the UTXO has been spent
                try {
                    const restored = await this.network.getUtxo(input.id);
                    restoredInputs.push(restored);
                } catch (e: any) {
                    // If we can't restore, keep the original (incomplete) input
                    throw new Error(
                        `Could not restore input ${utxoId}: ${e.message || e}`,
                    );
                }
            }
        }

        return restoredInputs;
    }

    // =========================================================================
    // REQT/50zkk5xgrx: Public Query API Methods
    // =========================================================================

    /**
     * Converts a UtxoIndexEntry back to a Helios TxInput.
     * This is the inverse of txOutputToIndexEntry.
     *
     * REQT/nqemw2gvm2 (restoreTxInput Method) - async to support script fetching
     */
    private async indexEntryToTxInput(entry: UtxoIndexEntry): Promise<TxInput> {
        // Parse utxoId to get txHash and outputIndex
        const [txHash, indexStr] = entry.utxoId.split("#");
        const outputIndex = parseInt(indexStr, 10);

        // Create TxOutputId - makeTxOutputId expects TxId, not string
        const txId = makeTxId(txHash);
        const txOutputId = makeTxOutputId(txId, outputIndex);

        // Create Value from lovelace and tokens
        // Use explicit 2-arg form: makeAssetClass(mph, tokenNameBytes)
        const assets: [AssetClass, bigint][] = entry.tokens.map((t) => [
            makeAssetClass(
                makeMintingPolicyHash(t.policyId),
                hexToBytes(t.tokenName),
            ),
            t.quantity,
        ]);
        const value = makeValue(entry.lovelace, assets);

        // Reconstruct datum from stored CBOR hex or hash
        let datum: TxOutputDatum | undefined = undefined;
        if (entry.inlineDatum) {
            const uplcData = decodeUplcData(hexToBytes(entry.inlineDatum));
            datum = makeInlineTxOutputDatum(uplcData);
        } else if (entry.datumHash) {
            const datumHash = makeDatumHash(entry.datumHash);
            datum = makeHashedTxOutputDatum(datumHash);
        }

        // Fetch reference script if present (REQT/tqrhbphgyx)
        let refScript: UplcProgramV2 | undefined = undefined;
        if (entry.referenceScriptHash) {
            refScript = await this.fetchAndCacheScript(
                entry.referenceScriptHash,
            );
        }

        // Create TxOutput with optional reference script
        const address = makeAddress(entry.address);
        const txOutput = makeTxOutput(address, value, datum, refScript);

        return makeTxInput(txOutputId, txOutput);
    }

    /**
     * Retrieves a UTXO by its output ID.
     * Implements ReadonlyCardanoClient.getUtxo
     *
     * REQT/gt3ux9v2kp (getUtxo Method)
     */
    async getUtxo(id: TxOutputId): Promise<TxInput> {
        await this.syncReady;
        const utxoId = id.toString();
        const entry = await this.store.findUtxoId(utxoId);

        if (entry) {
            return await this.indexEntryToTxInput(entry);
        }

        // Fall back to network if not in cache
        console.warn(`⚡ getUtxo CACHE MISS — falling through to network for ${utxoId}`);
        return this.network.getUtxo(id);
    }

    /**
     * Retrieves all UTXOs at an address.
     * Implements ReadonlyCardanoClient.getUtxos
     *
     * REQT/gu4vy0w3lq (getUtxos Method)
     */
    async getUtxos(address: Address): Promise<TxInput[]> {
        await this.syncReady;
        const addrStr = this.addressToBech32(address);

        // REQT/92m7kpkny7: Sync wallet address if stale before returning cached data
        await this.syncWalletAddressIfStale(addrStr);

        const entries = await this.store.findUtxosByAddress(addrStr);

        if (entries.length > 0) {
            return Promise.all(entries.map((e) => this.indexEntryToTxInput(e)));
        }

        // Fall back to network if no cached data
        console.warn(`⚡ getUtxos CACHE MISS — falling through to network for ${addrStr}`);
        return this.network.getUtxos(address);
    }

    /**
     * Retrieves UTXOs at an address containing a specific asset class.
     * Implements ReadonlyCardanoClient.getUtxosWithAssetClass
     *
     * REQT/gv5wz1x4mr (getUtxosWithAssetClass Method)
     *
     * @throws Error if address is not the Capo address or a delegate-policy address
     */
    async getUtxosWithAssetClass(
        address: Address,
        assetClass: AssetClass,
    ): Promise<TxInput[]> {
        await this.syncReady;
        const addrStr = this.addressToBech32(address);
        const policyId = assetClass.mph.toHex();
        const tokenName = assetClass.tokenName.toString();

        // Try cache first - find UTXOs matching both address and asset
        const entries = await this.store.findUtxosByAsset(policyId, tokenName);
        const filtered = entries.filter((e) => e.address === addrStr);

        if (filtered.length > 0) {
            return Promise.all(
                filtered.map((e) => this.indexEntryToTxInput(e)),
            );
        }

        // Fall through to network on cache miss
        console.warn(`⚡ getUtxosWithAssetClass CACHE MISS — falling through to network for ${addrStr} asset ${policyId.slice(0,8)}…/${tokenName}`);
        if (this.network.getUtxosWithAssetClass) {
            return this.network.getUtxosWithAssetClass(address, assetClass);
        }

        // If network doesn't support this method, filter from getUtxos
        console.warn(`⚡ getUtxosWithAssetClass — network doesn't support method, falling back to getUtxos`);
        const allUtxos = await this.network.getUtxos(address);
        const minAssetValue = makeValue(
            assetClass.mph,
            assetClass.tokenName,
            1n,
        );
        return allUtxos.filter((u) => u.value.isGreaterOrEqual(minAssetValue));
    }

    /**
     * Finds a UTXO containing a specific UUT by its name.
     *
     * REQT/50zkk5xgrx (Query API Methods)
     */
    async findUtxoByUUT(uutId: string): Promise<UtxoIndexEntry | undefined> {
        await this.syncReady;
        return this.store.findUtxoByUUT(uutId);
    }

    /**
     * Finds all UTXOs containing a specific asset (by policy ID and optional token name).
     *
     * REQT/50zkk5xgrx (Query API Methods)
     */
    async findUtxosByAsset(
        policyId: string,
        tokenName?: string,
        options?: { limit?: number; offset?: number },
    ): Promise<UtxoIndexEntry[]> {
        await this.syncReady;
        return this.store.findUtxosByAsset(policyId, tokenName, options);
    }

    /**
     * Finds all UTXOs at a specific address.
     *
     * REQT/50zkk5xgrx (Query API Methods)
     */
    async findUtxosByAddress(
        address: string,
        options?: { limit?: number; offset?: number },
    ): Promise<UtxoIndexEntry[]> {
        await this.syncReady;
        return this.store.findUtxosByAddress(address, options);
    }

    /**
     * Returns all indexed UTXOs with optional pagination.
     *
     * REQT/50zkk5xgrx (Query API Methods)
     */
    async getAllUtxos(options?: {
        limit?: number;
        offset?: number;
    }): Promise<UtxoIndexEntry[]> {
        await this.syncReady;
        return this.store.getAllUtxos(options);
    }
}

// =========================================================================
// REQT/xpvvqfwf5m: Byte array transformation for parsed record data
// =========================================================================

/**
 * Detects whether a value is a byte array (number[] where all elements are 0-255).
 */
function isByteArray(value: unknown): value is number[] {
    if (!Array.isArray(value) || value.length === 0) return false;
    // Check first and last elements as a fast heuristic, then validate all
    if (typeof value[0] !== "number") return false;
    return value.every(
        (v) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 255,
    );
}

/**
 * Attempts UTF-8 decoding of a byte array.
 * Returns the string if valid UTF-8, undefined otherwise.
 */
function tryUtf8Decode(bytes: number[]): string | undefined {
    try {
        const decoded = new TextDecoder("utf-8", { fatal: true }).decode(
            new Uint8Array(bytes),
        );
        return decoded;
    } catch {
        return undefined;
    }
}

/**
 * Recursively walks a parsed datum object and converts number[] byte arrays
 * to `{bytes: number[], string?: string}`.
 *
 * The resulting shape is compatible with Helios `makeByteArrayData()` which
 * accepts `{bytes: number[]}` via the `BytesLike` / `toBytes()` interface.
 *
 * REQT/xpvvqfwf5m (RecordIndexEntry Type)
 */
function transformByteArrays(value: unknown): any {
    if (isByteArray(value)) {
        const result: { bytes: number[]; string?: string } = { bytes: value };
        const str = tryUtf8Decode(value);
        if (str !== undefined) {
            result.string = str;
        }
        return result;
    }

    if (Array.isArray(value)) {
        return value.map(transformByteArrays);
    }

    if (value !== null && typeof value === "object") {
        const result: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
            result[k] = transformByteArrays(v);
        }
        return result;
    }

    // Primitives pass through
    return value;
}
