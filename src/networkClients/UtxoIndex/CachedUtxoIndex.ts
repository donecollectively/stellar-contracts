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
    type UplcProgram,
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
import type { BlockIndexEntry, BlockState } from "./types/BlockIndexEntry.js";
import type { BlockAddressEntry } from "./blockfrostTypes/BlockAddresses.js";

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
import type { PendingTxEntry, SubmissionLogEntry } from "./types/PendingTxEntry.js";

// REQT/zzsg63b2fb: Lightweight block-tip poll interval — sole trigger for checkForNewTxns
const blockPollInterval = 5 * 1000; // 5 seconds

// REQT/fh56sce22g: Default threshold for dual-mode sync selection
// Gap ≤ threshold → incremental block-walk; gap > threshold → catchup mode
const DEFAULT_CATCHUP_THRESHOLD = 20;

// Default sync configuration
const DEFAULT_SYNC_PAGE_SIZE = 100;
const DEFAULT_MAX_SYNC_PAGES = Infinity;

/**
 * REQT/yn45tvmp6k: Configurable thresholds for confirmation depth tracking.
 * provisionalDepth and confidentDepth are measured in BLOCKS.
 * certaintyDepth is measured in SLOTS (~1 slot/sec, progresses without blocks).
 * - provisional: blockDepth < provisionalDepth
 * - likely: provisionalDepth ≤ blockDepth < confidentDepth
 * - confident: confidentDepth ≤ blockDepth (and slotDepth < certaintyDepth)
 * - certain: slotDepth ≥ certaintyDepth
 */
export interface ConfirmationThresholds {
    provisionalDepth: number;
    confidentDepth: number;
    certaintyDepth: number;
}

// REQT/yn45tvmp6k: Default depth thresholds
const DEFAULT_CONFIRMATION_THRESHOLDS: ConfirmationThresholds = {
    provisionalDepth: 4,
    confidentDepth: 10,
    certaintyDepth: 3600,
};

// REQT/92m7kpkny7: Wallet address staleness threshold (default 30 seconds)
const DEFAULT_WALLET_STALENESS_MS = 30 * 1000;

// REQT/fz6z7rr702: Pending Transaction Event Payloads
export interface TxConfirmedEvent {
    txHash: string;
    description: string;
    // REQT/58b9nzgcbj: Initial confirmState on first confirmation
    confirmState: string;
    txd?: TxDescription<any, "submitted">;
}

// REQT/fz6z7rr702: Emitted when confirmState advances (Phase 2 depth tracking)
export interface ConfirmStateChangedEvent {
    txHash: string;
    confirmState: string;
    depth: number;
}

export interface TxRolledBackEvent {
    txHash: string;
    description: string;
    cbor: string;
    txd?: TxDescription<any, "submitted">;
}

// REQT/dnr06r6ch5 (Rollback Event) — emitted when a chain rollback is detected
export interface ChainRollbackEvent {
    /** Number of blocks rolled back */
    depth: number;
    /** Block hashes that were rolled back */
    rolledBackBlockHashes: string[];
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
    /** Emitted when a confirmed tx's confirmState advances (provisional → likely → confident → certain) */
    confirmStateChanged: [ConfirmStateChangedEvent];
    /** Emitted when a pending tx is rolled back due to deadline expiry */
    txRolledBack: [TxRolledBackEvent];
    /** Emitted after first sync cycle resolves pending state (stale → fresh) */
    pendingSynced: [];
    // REQT/dnr06r6ch5 (Rollback Event) — emitted when rolled-back blocks are detected
    chainRollback: [ChainRollbackEvent];
}

export class CachedUtxoIndex {
    blockfrostKey: string;
    blockfrostBaseUrl: string = "https://cardano-mainnet.blockfrost.io";
    // remembers the last block-id, height, and slot seen in any capo utxo
    lastBlockId: string;
    lastBlockHeight: number;
    lastBlockSlot: number;
    lastBlockTime: number;
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

    // REQT/a9y19g0pmr: Timer for pending deadline checks (40s interval)
    private deadlineTimerId: ReturnType<typeof setInterval> | null = null;

    // REQT/zzsg63b2fb: Block-tip poll timer — sole trigger for checkForNewTxns
    private blockPollTimerId: ReturnType<typeof setInterval> | null = null;

    // REQT/zzsg63b2fb: Concurrency guard — prevents overlapping checkForNewTxns calls
    private _syncInProgress: boolean = false;

    // REQT/jdkjh536mm: Observable sync state for downstream consumers (UI status display)
    private _syncState: string = "idle";

    // REQT/fh56sce22g: Threshold for dual-mode sync selection
    private catchupThreshold: number = DEFAULT_CATCHUP_THRESHOLD;

    // REQT/yn45tvmp6k: Configurable confirmation depth thresholds
    confirmationThresholds: ConfirmationThresholds = { ...DEFAULT_CONFIRMATION_THRESHOLDS };

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

    // Current top-level operation's logId — sub-step logs inherit this as parentLogId.
    // Set by logOp() at the start of a top-level operation, cleared when it completes.
    private _currentOpLogId: string | undefined;

    // Event emitter for sync status and rate limit metrics
    public readonly events = new EventEmitter<CachedUtxoIndexEvents>();

    /**
     * Returns pending sync state — "stale" until first sync resolves pending state, then "fresh".
     * REQT/9r9rc1hrfv (pendingSyncState Property)
     */
    get pendingSyncState(): "stale" | "fresh" {
        return this._pendingSyncState;
    }

    /**
     * Returns the current sync activity state.
     * REQT/jdkjh536mm (Sync State Metadata)
     */
    get syncState(): string {
        return this._syncState;
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
     * Returns current wall-clock time in milliseconds since epoch,
     * matching the CardanoClient interface contract (as implemented
     * by BlockfrostV0Client and Emulator).
     *
     * REQT/gz9a5b8qv (now Property)
     */
    get now(): number {
        return Math.floor(Date.now() / 1000) * 1000;
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

    /**
     * Captures the call-site location for log entries.
     * Called in each helper so the stored location points to the actual
     * log statement in CachedUtxoIndex, not DexieUtxoStore internals.
     */
    private _captureLocation(): string {
        return new Error().stack!.split("\n")[3]!.trim();
    }

    /**
     * Logs a top-level operation entry at "info" level and sets it as the
     * current parent for subsequent sub-step logs. Returns the logId.
     */
    private async logOp(id: string, message: string): Promise<string> {
        const loc = this._captureLocation();
        const logId = await this.store.log(id, message, "info", undefined, loc);
        this._currentOpLogId = logId;
        return logId;
    }

    /**
     * Logs a sub-step at "debug" level, parented to the current operation.
     */
    private async logDetail(id: string, message: string): Promise<string> {
        const loc = this._captureLocation();
        return this.store.log(id, message, "debug", this._currentOpLogId, loc);
    }

    /**
     * Logs a warning, parented to the current operation.
     */
    private async logWarn(id: string, message: string): Promise<string> {
        const loc = this._captureLocation();
        return this.store.log(id, message, "warn", this._currentOpLogId, loc);
    }

    /**
     * Logs an error, parented to the current operation.
     */
    private async logError(id: string, message: string): Promise<string> {
        const loc = this._captureLocation();
        return this.store.log(id, message, "error", this._currentOpLogId, loc);
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
        catchupThreshold,
        confirmationThresholds,
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
        /** Block gap threshold for dual-mode sync: ≤ threshold → incremental, > threshold → catchup (default: 20) */
        catchupThreshold?: number;
        /** REQT/yn45tvmp6k: Custom confirmation depth thresholds (default: provisional<4, confident≥10, certain≥180) */
        confirmationThresholds?: Partial<ConfirmationThresholds>;
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
        this.lastBlockSlot = 0;
        this.lastBlockTime = 0;

        // Apply sync configuration
        if (syncPageSize !== undefined) {
            this.syncPageSize = syncPageSize;
        }
        if (maxSyncPages !== undefined) {
            this.maxSyncPages = maxSyncPages;
        }

        // REQT/c3ytg4rttd: Default grace buffer of 60 slots (~60 seconds on Cardano)
        this.graceBufferSlots = graceBufferSlots ?? 60;

        // REQT/fh56sce22g: Dual-mode sync threshold
        if (catchupThreshold !== undefined) {
            this.catchupThreshold = catchupThreshold;
        }

        // REQT/yn45tvmp6k: Apply custom confirmation depth thresholds
        if (confirmationThresholds) {
            this.confirmationThresholds = {
                ...DEFAULT_CONFIRMATION_THRESHOLDS,
                ...confirmationThresholds,
            };
        }

        if (strategy === "dexie") {
            this.store = new DexieUtxoStore(dbName);
        } else if (strategy === "memory") {
            throw new Error("Memory strategy not implemented");
        } else if (strategy === "dred") {
            throw new Error("Dred strategy not implemented");
        } else {
            throw new Error(`Invalid strategy: ${strategy}`);
        }
        this.logOp(
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
            this.lastBlockSlot = cachedBlock.slot;
            this.lastBlockTime = cachedBlock.time;
            await this.logOp(
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

        await this.logDetail("yz58q", `Found ${capoUtxos.length} capo UTXOs`);

        // REQT/vk2bywdycn: Store all capo UTXOs in the index
        for (const utxo of capoUtxos) {
            await this.indexUtxoFromTxInput(utxo);
        }

        // Extract unique transaction IDs from the UTXOs and fetch/store transaction details
        const uniqueTxIds = new Set(
            capoUtxos.map((utxo) => {
                const id = utxo.id.toString();
                return id.split("#")[0];
            }),
        );

        await this.logDetail(
            "yuyqy",
            `Found ${uniqueTxIds.size} unique transaction IDs`,
        );
        for (const txId of uniqueTxIds) {
            await this.logDetail(
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
        // REQT/5d4f73c9bf: Full sync fetched all UTxOs — mark tip as "processed"
        const tipEntry = await this.fetchAndStoreLatestBlock();
        await this.store.saveBlock({ ...tipEntry, state: "processed" });

        // REQT/fn70x96nxm: After first sync, resolve pending state
        await this.resolvePendingState();

        this.syncReadyResolve();
        this.events.emit("syncComplete");
    }

    /**
     * Checks for new transactions at the capo address and indexes new UTXOs.
     * Selects sync mode based on gap between processing cursor and chain tip:
     * - Gap ≤ threshold (default 20): incremental block-walk via blocks/{hash}/next
     * - Gap > threshold: catchup mode via address-level transaction query + UTxO reconciliation
     *
     * REQT/fh56sce22g (Transaction Monitoring) — dual-mode sync, no gaps
     * REQT/zzsg63b2fb (Automated Periodic Refresh) — concurrency guard
     * REQT/jdkjh536mm (Sync State Metadata) — syncState transitions
     * REQT/5d4f73c9bf (Last Processed Block) — processing cursor independent of chain tip
     */
    async checkForNewTxns(): Promise<void> {
        // REQT/zzsg63b2fb: Concurrency guard — skip if another sync is already running
        if (this._syncInProgress) {
            return;
        }
        this._syncInProgress = true;

        try {
            // REQT/9gq8rwg9ng: Discover and store ALL blocks since last-seen.
            // This also advances the in-memory tip state as new blocks are found.
            // fetchAndStoreLatestBlock is only needed as a bootstrap when there
            // are no blocks in the store yet (before initial syncNow completes).
            try {
                const newBlockCount = await this.fetchAndStoreNewBlocks();
                if (newBlockCount === 0) {
                    // No blocks discovered via walk — ensure tip is current
                    // (handles case where blocks/{hash}/next hasn't caught up yet)
                    await this.fetchAndStoreLatestBlock();
                }
            } catch (e: any) {
                await this.logError(
                    "fnber",
                    `Failed to fetch new blocks: ${e.message || e}`,
                );
                // Fallback: at least get the latest block for tip state
                try {
                    await this.fetchAndStoreLatestBlock();
                } catch (e2: any) {
                    await this.logError(
                        "bk5er",
                        `Failed to fetch latest block: ${e2.message || e2}`,
                    );
                }
            }

            // REQT/yasww6cqa4 (Chain Intersection Discovery) — detect rolled-back blocks
            // before processing new blocks, so we clean up before indexing replacements.
            try {
                const { rolledBackHashes, canonicalBlocks, forkHeight } = await this.detectRolledBackBlocks();
                if (rolledBackHashes.length > 0) {
                    await this.executeBlockRollback(rolledBackHashes, canonicalBlocks, forkHeight);
                    // temporary: block browser after rollback so logs can be reviewed
                    if ("undefined" !== typeof window) {
                        setTimeout(() => {
                            alert(`Chain rollback detected: ${rolledBackHashes.length} block(s) rolled back at fork height ${forkHeight}. Check console for details.`);
                        }, 5000);
                    }
                }
            } catch (e: any) {
                await this.logError(
                    "rbder",
                    `Failed to detect/execute rollbacks: ${e.message || e}`,
                );
            }

            // REQT/5d4f73c9bf: Determine processing cursor from store
            const lastProcessed = await this.store.getLastProcessedBlock();
            if (!lastProcessed) {
                // No processed blocks — nothing to walk from. This happens on
                // a fresh start before initial sync has completed.
                await this.logDetail(
                    "npc01",
                    "No processed blocks found — skipping checkForNewTxns",
                );
                return;
            }

            // REQT/9gq8rwg9ng: Get unprocessed blocks from store
            const unprocessedBlocks = await this.store.getUnprocessedBlocks();
            if (unprocessedBlocks.length > 0) {
                // REQT/fh56sce22g: Select sync mode based on unprocessed count
                if (unprocessedBlocks.length <= this.catchupThreshold) {
                    await this.syncIncremental(unprocessedBlocks);
                } else {
                    await this.syncCatchup(lastProcessed, unprocessedBlocks);
                }
            }

            // REQT/z9d167q2mw (Resubmission Loop) — resubmit pending/provisional txs
            // after block processing, before depth advancement. This ensures txs
            // that were reverted by rollback detection (Phase 3/4, above) are
            // immediately eligible for resubmission in this same cycle.
            await this.resubmitStalePendingTxs();

            // REQT/ddzcp753jr: Recalculate confirmation depths after sync
            // Runs even when no new blocks were processed — tip may have
            // advanced in a prior cycle and depths need rechecking
            await this.updateConfirmationDepths();

            // REQT/bqy3xpp8rs: Run Gate 2 rollback executor each sync cycle
            await this.executeSettledRollbacks();
        } finally {
            this._syncInProgress = false;
            // REQT/jdkjh536mm: Return to idle
            this._syncState = "idle";
        }
    }

    /**
     * Incremental block-walk mode: processes unprocessed blocks already stored
     * in the blocks table, checking each for transactions touching capoAddress.
     * Blocks were previously discovered and stored by fetchAndStoreNewBlocks().
     *
     * REQT/gfsjgaac1y (Incremental Mode) — block-by-block for small gaps
     * REQT/9gq8rwg9ng (Block Tip & Address Recording) — per-block address data
     */
    private async syncIncremental(unprocessedBlocks: BlockIndexEntry[]): Promise<void> {
        // REQT/jdkjh536mm: Set sync state
        this._syncState = "syncing";
        this.events.emit("syncing");

        await this.logDetail(
            "si001",
            `Incremental sync: ${unprocessedBlocks.length} unprocessed blocks`,
        );

        // REQT/gfsjgaac1y: Process blocks in height order
        for (const block of unprocessedBlocks) {
            // REQT/9gq8rwg9ng: Check which addresses (and tx IDs) are in this block
            const blockAddresses = await this.fetchFromBlockfrost<BlockAddressEntry[]>(
                `blocks/${block.height}/addresses`,
            );

            // REQT/gfsjgaac1y: Filter for capoAddress and process matching txns
            if (Array.isArray(blockAddresses)) {
                for (const entry of blockAddresses) {
                    if (entry.address === this.capoAddress) {
                        for (const tx of entry.transactions) {
                            // Construct a summary-like object for processTransactionForNewUtxos
                            const summary: AddressTransactionSummariesType = {
                                tx_hash: tx.tx_hash,
                                tx_index: 0, // not available from block addresses endpoint
                                block_height: block.height,
                                block_time: block.time,
                            };
                            await this.processTransactionForNewUtxos(tx.tx_hash, summary);
                        }
                    }
                }
            }

            // REQT/5d4f73c9bf: Mark block as processed after its txns are handled
            await this.store.saveBlock({ ...block, state: "processed" });
        }

        await this.logDetail(
            "si003",
            `Incremental sync complete: processed ${unprocessedBlocks.length} blocks`,
        );
        this.events.emit("synced");
    }

    /**
     * Catchup mode: uses address-level transaction queries for large gaps,
     * then reconciles the UTxO set against current on-chain state.
     * Marks all unprocessed blocks as processed on completion.
     *
     * REQT/2he55bafxd (Catchup Mode) — address-level bulk sync
     */
    private async syncCatchup(lastProcessed: BlockIndexEntry, unprocessedBlocks: BlockIndexEntry[]): Promise<void> {
        // REQT/jdkjh536mm: Set sync state with block count
        this._syncState = `catchup sync (${unprocessedBlocks.length} blocks)`;
        this.events.emit("syncing");

        await this.logOp(
            "sc001",
            `Catchup sync: ${unprocessedBlocks.length} blocks behind (last processed #${lastProcessed.height}, tip #${this.lastBlockHeight})`,
        );

        // REQT/2he55bafxd: Address-level query to discover relevant transactions
        const startHeight = lastProcessed.height + 1;
        let currentPage = 1;
        let hasMorePages = true;
        let lastTxIndex: number | undefined;

        while (hasMorePages && currentPage <= this.maxSyncPages) {
            let url = `addresses/${this.capoAddress}/transactions?order=asc&count=${this.syncPageSize}&from=${startHeight}`;
            if (lastTxIndex !== undefined) {
                url += `&after=${lastTxIndex}`;
            }

            const untyped = await this.fetchFromBlockfrost<unknown[]>(url);

            if (!Array.isArray(untyped) || untyped.length === 0) {
                hasMorePages = false;
                break;
            }

            const transactionSummaries = untyped as AddressTransactionSummariesType[];

            for (const summary of transactionSummaries) {
                await this.processTransactionForNewUtxos(
                    summary.tx_hash,
                    summary,
                );
            }

            if (untyped.length < this.syncPageSize) {
                hasMorePages = false;
            } else {
                const lastSummary = transactionSummaries[transactionSummaries.length - 1];
                lastTxIndex = lastSummary.tx_index;
                currentPage++;
            }
        }

        // REQT/2he55bafxd: Reconcile UTxOs against current on-chain state
        await this.reconcileUtxos();

        // REQT/2he55bafxd: Mark all unprocessed blocks as processed
        for (const block of unprocessedBlocks) {
            await this.store.saveBlock({ ...block, state: "processed" });
        }

        await this.logOp(
            "sc002",
            `Catchup sync complete: advanced cursor to tip #${this.lastBlockHeight}`,
        );
        this.events.emit("synced");
    }

    /**
     * Reconciles cached UTxOs against the current on-chain set for the capo address.
     * Marks any cached UTxOs not present on-chain as spent.
     *
     * REQT/2he55bafxd (Catchup Mode) — ensure cache correctness after offline period
     */
    private async reconcileUtxos(): Promise<void> {
        // Fetch current on-chain UTxOs for the capo address
        const onChainUtxos = await this.fetchFromBlockfrost<UtxoDetailsType[]>(
            `addresses/${this.capoAddress}/utxos`,
        );

        if (!Array.isArray(onChainUtxos)) return;

        // Build set of on-chain utxoIds for O(1) lookup
        const onChainIds = new Set<string>();
        for (const u of onChainUtxos) {
            onChainIds.add(this.formatUtxoId(u.tx_hash, u.output_index));
        }

        // Find cached unspent UTxOs at capo address that are no longer on-chain
        // REQT/2he55bafxd (Catchup Mode) — skip speculative outputs from pending txs
        const cachedUtxos = await this.store.findUtxosByAddress(this.capoAddress);
        for (const cached of cachedUtxos) {
            if (!onChainIds.has(cached.utxoId)) {
                const txHash = cached.utxoId.split("#")[0];
                if (this.pendingTxHashes.has(txHash)) {
                    continue;
                }
                // REQT/2he55bafxd: Mark stale UTxO as spent during reconciliation
                await this.store.markUtxoSpent(cached.utxoId, "reconciled");
                await this.logDetail(
                    "rc001",
                    `Reconciliation: marked stale UTxO ${cached.utxoId} as spent`,
                );
            }
        }
    }

    /**
     * Starts block-tip polling (5s) to detect new blocks and trigger sync,
     * and the 40s deadline-check timer for pending tx management.
     *
     * The block-tip poll is the sole trigger for checkForNewTxns(). When a
     * new block is detected, it triggers checkForNewTxns() which walks
     * forward from the last processed block. The concurrency guard on
     * checkForNewTxns prevents overlapping syncs.
     *
     * REQT/zzsg63b2fb (Automated Periodic Refresh) — 5s poll only, no 60s fallback
     * REQT/a9y19g0pmr (Rollback Expired Pending Transaction — 40s timer)
     */
    startPeriodicRefresh(): void {
        if (this.blockPollTimerId) {
            return; // Already running
        }
        this.logOp(
            "pr5t1",
            `Starting block-tip poll every ${blockPollInterval / 1000}s`,
        );

        // REQT/zzsg63b2fb: Sole trigger — lightweight block-tip poll at 5s intervals
        this.blockPollTimerId = setInterval(async () => {
            try {
                const newBlock = await this.checkBlockTip();
                if (newBlock) {
                    console.debug(`🔵 new block detected — triggering sync`);
                    await this.checkForNewTxns();
                }
            } catch (e) {
                console.warn("Block-tip poll failed:", e);
            }
        }, blockPollInterval);
        this.blockPollTimerId.unref?.();

        // REQT/vhn7zvn8nc: Start 10s deadline-check timer (separate from 60s Blockfrost poll)
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
     * Stops the block-tip poll and deadline-check timers.
     *
     * REQT/zzsg63b2fb (Automated Periodic Refresh)
     * REQT/a9y19g0pmr (Rollback timer lifecycle)
     */
    stopPeriodicRefresh(): void {
        if (this.blockPollTimerId) {
            this.logOp("pr5t0", "Stopping block-tip poll");
            clearInterval(this.blockPollTimerId);
            this.blockPollTimerId = null;
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
        return this.blockPollTimerId !== null;
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
            await this.logDetail(
                "wa1sk",
                `Wallet address ${address} already registered, skipping`,
            );
            return;
        }

        await this.logDetail("wa1rg", `Registering wallet address: ${address}`);

        // Fetch current UTXOs from network
        const heliosAddress = makeAddress(address);
        const utxos = await this.network.getUtxos(heliosAddress);

        // Store each UTXO in the cache
        for (const utxo of utxos) {
            await this.indexUtxoFromTxInput(utxo);
        }

        // Save wallet address with sync state
        await this.store.saveWalletAddress({
            address,
            lastBlockHeight: this.lastBlockHeight,
            lastSyncTime: Date.now(),
        });

        await this.logDetail(
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

        await this.logDetail(
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
        // REQT/06b01nyf51 (Wallet Snapshot Sync) — skip speculative outputs from pending txs
        const cachedUtxos = await this.store.findUtxosByAddress(address);
        let removedCount = 0;
        for (const cached of cachedUtxos) {
            if (!freshUtxoIds.has(cached.utxoId)) {
                const txHash = cached.utxoId.split("#")[0];
                if (this.pendingTxHashes.has(txHash)) {
                    continue;
                }
                await this.store.deleteUtxo(cached.utxoId);
                removedCount++;
            }
        }

        // Store fresh UTXOs, preserving any speculative-spend markers from pending txs
        for (const utxo of utxos) {
            const utxoId = utxo.id.toString();
            const existing = await this.store.findUtxoId(utxoId);
            await this.indexUtxoFromTxInput(utxo);
            if (existing?.spentInTx) {
                await this.store.markUtxoSpent(utxoId, existing.spentInTx);
            }
        }

        // Update sync state
        await this.store.saveWalletAddress({
            address,
            lastBlockHeight: this.lastBlockHeight,
            lastSyncTime: now,
        });

        await this.logDetail(
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
        await this.logDetail(
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

        await this.logDetail(
            "cu1st",
            `Starting record catchup from lastParsedBlockHeight=${lastParsed}`,
        );

        // REQT/3aew7g7wdw: Query cached UTXOs needing parsing
        const unparsedUtxos = await this.store.findUtxosByBlockHeightRange(
            lastParsed,
            { withInlineDatum: true, unspentOnly: true },
        );

        await this.logDetail(
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

        await this.logOp(
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
            await this.logError(
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
     * Appends a submission log entry to a pending transaction's log.
     * Delegates to the store for atomic persistence.
     *
     * REQT/j5pwm8btay (Append Submission Log)
     */
    async appendSubmissionLog(txHash: string, entry: SubmissionLogEntry): Promise<void> {
        await this.store.appendSubmissionLog(txHash, entry);
    }

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
            // REQT/vdkanffv9e (Diagnostic Fields) — captured at signing for post-reload inspection
            buildTranscript?: string[];
            txStructure?: string;
        },
    ): Promise<void> {
        // REQT/p2ts24jbkg: Decode signed CBOR via existing decodeTx() pipeline
        const tx = decodeTx(signedCborHex);
        const txHash = tx.id().toHex();

        console.debug(`🟡 REGISTER PENDING TX: ${txHash.slice(0, 8)}… — ${opts.description} — capo=${!!this._capo}`);
        await this.logOp(
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
        const deadlineSlot = lastValidSlot + this.graceBufferSlots; // REQT/c3ytg4rttd

        // === REGISTER DIAGNOSTICS ===
        console.log([
            `🟡 REGISTER PENDING TX deadline diagnostics:`,
            `  tx.lastValidSlot  = ${lastValidSlot}`,
            `  graceBufferSlots  = ${this.graceBufferSlots}`,
            `  deadlineSlot      = ${deadlineSlot}`,
            `  this.lastBlockSlot     = ${this.lastBlockSlot}`,
            `  Date.now()        = ${Date.now()}`,
            `  typeof lastValidSlot = ${typeof lastValidSlot}`,
        ].join("\n"));

        // REQT/p2ts24jbkg: Persist PendingTxEntry to store
        const pendingEntry: PendingTxEntry = {
            txHash,
            description: opts.description,
            id: opts.id,
            parentId: opts.parentId,
            batchDepth: opts.depth,
            confirmationBlockDepth: 0,
            moreInfo: opts.moreInfo,
            txName: opts.txName,
            txCborHex: opts.txCborHex,
            signedTxCborHex: signedCborHex,
            deadlineSlot,
            status: "pending",
            submittedAt: Date.now(),
            // REQT/vdkanffv9e (Diagnostic Fields) — persist when provided
            buildTranscript: opts.buildTranscript,
            txStructure: opts.txStructure,
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
                await this.logDetail(
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
            await this.logDetail(
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
                        await this.logDetail(
                            "pt2rc",
                            `Parsed pending record from ${utxoId}`,
                        );
                    } else {
                        skippedCount++;
                        await this.logDetail(
                            "pt2rs",
                            `Datum at ${utxoId} did not parse to a record (parseAndSaveRecord returned false)`,
                        );
                    }
                }
            }
            console.debug(`🟡 PENDING RECORDS: ${parsedCount} parsed, ${skippedCount} skipped, ${tx.body.outputs.length} total outputs`);
            await this.logDetail(
                "pt2rd",
                `Pending record parsing complete: ${parsedCount} parsed, ${skippedCount} skipped, ${tx.body.outputs.length} total outputs`,
            );
        } else {
            console.warn(`🔴 NO CAPO — skipping record parsing for pending tx ${txHash.slice(0, 8)}…`);
            await this.logDetail(
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

        await this.logOp(
            "pt3ok",
            `Registered pending tx ${txHash}: ${tx.body.inputs.length} inputs spent, ${tx.body.outputs.length} outputs indexed, deadlineSlot ${deadlineSlot}`,
        );
    }

    /**
     * Confirms a pending transaction that has been discovered in a block.
     * Skips normal indexing since outputs are already indexed and inputs already marked spent.
     * Records the confirming block height and sets initial confirmState.
     *
     * REQT/58b9nzgcbj (Confirm Pending Transaction) — confirmedAtBlockHeight + confirmState
     * REQT/fz6z7rr702 (Pending Transaction Events)
     */
    private async confirmPendingTx(txHash: string, blockHeight: number): Promise<void> {
        const pendingEntry = await this.store.findPendingTx(txHash);
        if (!pendingEntry || pendingEntry.status !== "pending") return;

        // Look up the confirming block's slot and hash from the store
        const confirmingBlock = await this.store.findBlockByHeight(blockHeight);
        const confirmedAtSlot = confirmingBlock?.slot;
        // REQT/xsvqyh5gwb (confirmedInBlockHash Field) — store block hash for precise rollback matching
        const confirmedInBlockHash = confirmingBlock?.hash;

        console.debug(`🟢 CONFIRM PENDING TX: ${txHash.slice(0, 8)}… — ${pendingEntry.description} at block #${blockHeight} slot ${confirmedAtSlot}`);
        await this.logOp(
            "pt4cf",
            `Confirming pending tx ${txHash}: ${pendingEntry.description} at block #${blockHeight} slot ${confirmedAtSlot} hash ${confirmedInBlockHash?.slice(0, 12)}…`,
        );

        // REQT/58b9nzgcbj: Set status, confirmedAtBlockHeight, and initial confirmState
        pendingEntry.status = "confirmed";
        pendingEntry.confirmedAtBlockHeight = blockHeight; // REQT/58b9nzgcbj
        pendingEntry.confirmedAtSlot = confirmedAtSlot;
        pendingEntry.confirmedInBlockHash = confirmedInBlockHash; // REQT/xsvqyh5gwb
        pendingEntry.confirmState = "provisional";         // REQT/ddzcp753jr
        await this.store.savePendingTx(pendingEntry);
        // REQT/pgyqdvwn17 (pendingTxHashes Lifecycle) — do NOT remove from pendingTxHashes here.
        // Entry remains in pendingTxHashes until confirmState reaches "likely" (in updateConfirmationDepths).
        // This keeps provisionally-confirmed txs eligible for quiet resubmission during the
        // micro-fork vulnerability window.

        // REQT/fz6z7rr702: Emit txConfirmed event with confirmState
        const txd = this.pendingTxMap.get(txHash);
        this.events.emit("txConfirmed", {
            txHash,
            description: pendingEntry.description,
            confirmState: "provisional", // REQT/58b9nzgcbj
            txd,
        });

        // Clean up in-memory maps — pendingTxMap and pendingSpentUtxoIds are session-scoped
        // and not needed for resubmission (which uses pendingTxHashes + Dexie store)
        this.pendingTxMap.delete(txHash);
        this.cleanupPendingSpentUtxoIds(txHash);

        await this.logOp(
            "pt4ok",
            `Confirmed pending tx ${txHash} at block #${blockHeight} (retained in pendingTxHashes until "likely")`,
        );
    }

    /**
     * Recalculates confirmation depth for all confirmed-but-not-certain pending
     * transactions and advances confirmState when depth crosses a threshold.
     * Called at the end of each sync cycle after blocks are processed.
     *
     * REQT/ddzcp753jr (Confirmation Depth Tracking)
     * REQT/thy7tkrxh7 (Depth Advancement) — recalculate on each sync cycle
     * REQT/yn45tvmp6k (Confirmation States) — threshold-based transitions
     * REQT/fz6z7rr702 (Pending Transaction Events) — emit confirmStateChanged
     */
    private async updateConfirmationDepths(): Promise<void> {
        const confirmedEntries = await this.store.getPendingByStatus("confirmed");
        if (confirmedEntries.length === 0) return;

        const currentHeight = this.lastBlockHeight;
        const currentSlot = this.lastBlockSlot;
        const { provisionalDepth, confidentDepth, certaintyDepth } =
            this.confirmationThresholds;

        for (const entry of confirmedEntries) {
            // REQT/thy7tkrxh7: Skip entries already at "certain" — no further advancement
            if (entry.confirmState === "certain") continue;

            // REQT/thy7tkrxh7: Skip entries without confirmation data
            if (entry.confirmedAtBlockHeight === undefined) continue;
            if (entry.confirmedAtSlot === undefined) continue;

            // Block depth for provisional/likely/confident thresholds
            const blockDepth = currentHeight - entry.confirmedAtBlockHeight;
            // Slot depth for certainty threshold (~1 slot/sec, progresses without blocks)
            const slotDepth = currentSlot - entry.confirmedAtSlot;

            // REQT/yn45tvmp6k: Determine new confirmState based on depth thresholds
            // provisional/likely/confident use block depth; certain uses slot depth
            let newState: "provisional" | "likely" | "confident" | "certain";
            if (slotDepth >= certaintyDepth) {
                newState = "certain";
            } else if (blockDepth >= confidentDepth) {
                newState = "confident";
            } else if (blockDepth >= provisionalDepth) {
                newState = "likely";
            } else {
                newState = "provisional";
            }

            // Use block depth for the stored value (primary user-facing metric)
            const depth = blockDepth;

            // Only save when depth or state actually changed
            const depthChanged = depth !== entry.confirmationBlockDepth;
            const stateChanged = newState !== entry.confirmState;

            if (!depthChanged && !stateChanged) continue;

            entry.confirmationBlockDepth = depth;

            if (stateChanged) {
                const previousState = entry.confirmState;
                entry.confirmState = newState;
                await this.store.savePendingTx(entry);

                // REQT/pgyqdvwn17 (pendingTxHashes Lifecycle) — remove from pendingTxHashes
                // when confirmState reaches "likely". At this point the tx has sufficient
                // depth to be considered reliably confirmed, so it exits resubmission scope.
                if (previousState === "provisional" && newState !== "provisional") {
                    this.pendingTxHashes.delete(entry.txHash);
                }

                // REQT/fz6z7rr702: Emit confirmStateChanged event
                this.events.emit("confirmStateChanged", {
                    txHash: entry.txHash,
                    confirmState: newState,
                    depth,
                });

                await this.logDetail(
                    "cd001",
                    `Confirmation depth advanced: ${entry.txHash.slice(0, 8)}… ${previousState} → ${newState} (depth ${depth})`,
                );
            } else {
                // Depth changed but state didn't — save silently
                await this.store.savePendingTx(entry);
            }
        }
    }

    /**
     * Checks for pending transactions whose deadlines have expired
     * and rolls them back. Also runs 72h purge.
     *
     * REQT/a9y19g0pmr (Pending Transaction Rollback Lifecycle)
     * REQT/vhn7zvn8nc (Expire to Rollback-Pending) — Gate 1 depth-based expiry
     * REQT/c3ytg4rttd (Deadline Calculation) — depth-based comparison
     * REQT/agg98btez8 (Purge Old Pending Entries)
     */
    async checkPendingDeadlines(): Promise<void> {
        const pendingEntries = await this.store.getPendingByStatus("pending");
        const { provisionalDepth } = this.confirmationThresholds;

        if (pendingEntries.length > 0) {
            console.log(
                `⏱️ checkPendingDeadlines: ${pendingEntries.length} pending`,
                `\n  lastBlockHeight: ${this.lastBlockHeight} slot: ${this.lastBlockSlot}`,
                `\n  provisionalDepth: ${provisionalDepth}`,
                `\n  Date.now()=${Date.now()}`,
            );
        }

        // REQT/vhn7zvn8nc (Expire to Rollback-Pending) — Gate 1 depth-based expiry
        // REQT/c3ytg4rttd (Deadline Calculation) — find "the last possible block it could
        // have been in, if it was gonna": the first processed block at or after the deadline slot.
        // Then check that lastBlockHeight - thatBlock.height >= provisionalDepth.
        for (const entry of pendingEntries) {
            const deadlineBlock = await this.store.findFirstProcessedBlockAtOrAfterSlot(entry.deadlineSlot);
            if (!deadlineBlock) {
                // No processed block has reached the deadline slot yet — not expired
                console.log(
                    `  📌 ${entry.txHash.slice(0, 8)}…: deadline=${entry.deadlineSlot} — no processed block at or after deadline yet`,
                );
                continue;
            }

            const depthPastDeadline = this.lastBlockHeight - deadlineBlock.height;
            console.log(
                `  📌 ${entry.txHash.slice(0, 8)}…: deadline=${entry.deadlineSlot} deadlineBlock=#${deadlineBlock.height} depth=${depthPastDeadline}/${provisionalDepth}`,
            );

            if (depthPastDeadline >= provisionalDepth) {
                // REQT/vhn7zvn8nc: Set status to rollback-pending — do NOT execute rollback here
                entry.status = "rollback-pending";
                await this.store.savePendingTx(entry);
                await this.logOp(
                    "pt5g1",
                    `Gate 1 passed: pending tx ${entry.txHash.slice(0, 8)}… → rollback-pending (deadline block #${deadlineBlock.height}, depth ${depthPastDeadline} >= ${provisionalDepth})`,
                );
                console.log(
                    `  ⏳ ${entry.txHash.slice(0, 8)}…: → rollback-pending (Gate 1 passed)`,
                );
            }
        }

        // REQT/bqy3xpp8rs (Contention Settlement Check) — Gate 2 rollback executor
        await this.executeSettledRollbacks();

        // REQT/agg98btez8: Purge old entries that have reached terminal confidence
        // Only purge rolled-back entries and confirmed entries at "certain" confidence.
        // Entries still progressing through confirmation states are retained regardless of age.
        // Rolled-back entries retained for 2 weeks (recovery window); certain entries for 72h.
        const certainPurgeThreshold = Date.now() - 72 * 60 * 60 * 1000;
        const rolledBackPurgeThreshold = Date.now() - 14 * 24 * 60 * 60 * 1000;
        await this.store.purgeOldPendingTxs(certainPurgeThreshold, rolledBackPurgeThreshold);
    }

    /**
     * Gate 2: Rollback settlement executor.
     * Processes all entries with status "rollback-pending". For each entry,
     * checks that all competing confirmed txs (from contestedByTxs) have
     * reached sufficient depth before executing the actual rollback.
     *
     * REQT/bqy3xpp8rs (Contention Settlement Check) — Gate 2 competing tx depth check
     * REQT/a9y19g0pmr (Pending Transaction Rollback Lifecycle)
     */
    private async executeSettledRollbacks(): Promise<void> {
        const rollbackPendingEntries = await this.store.getPendingByStatus("rollback-pending");
        if (rollbackPendingEntries.length === 0) return;

        const { provisionalDepth } = this.confirmationThresholds;

        for (const entry of rollbackPendingEntries) {
            // REQT/bqy3xpp8rs: Check contention settlement
            const contestedByTxs = entry.contestedByTxs ?? [];
            if (contestedByTxs.length > 0) {
                const allSettled = contestedByTxs.every(
                    ct => this.lastBlockHeight - ct.blockHeight >= provisionalDepth
                );
                if (!allSettled) {
                    // Some competing txs are too shallow — skip, re-check next cycle
                    await this.logDetail(
                        "pt5g2",
                        `Gate 2 held for ${entry.txHash.slice(0, 8)}…: ${contestedByTxs.length} contested txs, not all at depth >= ${provisionalDepth}`,
                    );
                    console.log(
                        `  ⏳ ${entry.txHash.slice(0, 8)}…: Gate 2 held — contested txs not yet at depth`,
                    );
                    continue;
                }
            }

            // All contention settled (or none exists) — execute rollback
            await this.rollbackPendingTx(entry);
        }
    }

    /**
     * Executes the actual rollback of a pending transaction that has passed
     * both Gate 1 (expiry depth) and Gate 2 (contention settlement).
     *
     * Steps:
     *   1. Clear spentInTx on uncontested inputs (REQT/348pmgpdzr)
     *   2. Delete pending-origin UTXOs (REQT/c919hzrr2y)
     *   3. Delete pending-origin records (REQT/c919hzrr2y)
     *   4. Selective datum re-parse on restored inputs (REQT/1afcyedaks)
     *   5. Set status to rolled-back (REQT/szmt1wm6ef)
     *   6. Emit txRolledBack event (REQT/szmt1wm6ef)
     *   7. In-memory cleanup (REQT/szmt1wm6ef)
     *
     * REQT/a9y19g0pmr (Pending Transaction Rollback Lifecycle)
     * REQT/fz6z7rr702 (Pending Transaction Events)
     */
    private async rollbackPendingTx(entry: PendingTxEntry): Promise<void> {
        const { txHash } = entry;
        const tx = decodeTx(entry.signedTxCborHex);

        console.log(`🔴 ROLLBACK PENDING TX: ${txHash.slice(0, 8)}… — ${entry.description}`);
        await this.logOp(
            "pt5rb",
            `Executing rollback for pending tx ${txHash}: ${entry.description}`,
        );

        // REQT/348pmgpdzr (Safe spentInTx Clearing) — Step 1
        // Only clears UTXOs where spentInTx === txHash (uncontested inputs).
        // Contested inputs already have spentInTx overwritten to the confirmed tx hash
        // at detection time per REQT/hhbcnvd9aj — findUtxosSpentByTx won't find them.
        const restoredUtxos = await this.store.findUtxosSpentByTx(txHash);
        await this.store.clearSpentByTx(txHash); // REQT/348pmgpdzr
        await this.logDetail(
            "pt5s1",
            `Step 1: Cleared spentInTx on ${restoredUtxos.length} uncontested inputs`,
        );

        // REQT/c919hzrr2y (Pending Output and Record Cleanup) — Steps 2-3
        await this.store.deleteUtxosByTxHash(txHash); // REQT/c919hzrr2y
        await this.store.deleteRecordsByTxHash(txHash); // REQT/c919hzrr2y
        await this.logDetail(
            "pt5s2",
            `Steps 2-3: Deleted pending-origin UTXOs and records for ${txHash.slice(0, 8)}…`,
        );

        // REQT/1afcyedaks (Selective Datum Re-parse) — Step 4
        // Only re-parse datums from input UTXOs whose spentInTx was cleared (uncontested).
        // Do NOT re-parse inputs whose spentInTx points to a confirmed tx.
        if (this._capo && restoredUtxos.length > 0) {
            let parsedCount = 0;
            for (const utxo of restoredUtxos) {
                if (utxo.inlineDatum) {
                    // Re-fetch the entry (spentInTx now cleared)
                    const freshEntry = await this.store.findUtxoId(utxo.utxoId);
                    if (freshEntry) {
                        const saved = await this.parseAndSaveRecord(freshEntry);
                        if (saved) parsedCount++;
                    }
                }
            }
            await this.logDetail(
                "pt5s4",
                `Step 4: Re-parsed ${parsedCount} datums from ${restoredUtxos.length} restored inputs`,
            );
        } else if (!this._capo) {
            // REQT/1afcyedaks: No-op without Capo (consistent with registration behavior)
            await this.logDetail(
                "pt5s4",
                `Step 4: Skipped datum re-parse (no Capo attached)`,
            );
        }

        // REQT/szmt1wm6ef (Rollback Finalization) — Steps 5-7
        entry.status = "rolled-back"; // REQT/szmt1wm6ef
        await this.store.savePendingTx(entry);
        this.pendingTxHashes.delete(txHash);

        // REQT/szmt1wm6ef: Emit txRolledBack event with CBOR for recovery path
        const txd = this.pendingTxMap.get(txHash);
        this.events.emit("txRolledBack", {
            txHash,
            description: entry.description,
            cbor: entry.signedTxCborHex,
            txd,
        });

        // REQT/szmt1wm6ef: Clean up in-memory state
        this.pendingTxMap.delete(txHash);
        this.cleanupPendingSpentUtxoIds(txHash);

        await this.logOp(
            "pt5ok",
            `Rollback complete for ${txHash}: ${restoredUtxos.length} inputs restored, status → rolled-back`,
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
        // REQT/fn70x96nxm (Startup Recovery) — load pending entries
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
                await this.logError(
                    "pt6er",
                    `Error decoding CBOR for pending tx ${entry.txHash} during recovery: ${e.message || e}`,
                );
            }
        }

        // REQT/pgyqdvwn17 (pendingTxHashes Lifecycle) — also load provisionally-confirmed
        // entries back into pendingTxHashes. These haven't reached "likely" depth yet and
        // must remain in resubmission scope across page reloads.
        const confirmedEntries = await this.store.getPendingByStatus("confirmed");
        const provisionalEntries = confirmedEntries.filter(
            e => e.confirmState === "provisional"
        );
        for (const entry of provisionalEntries) {
            this.pendingTxHashes.add(entry.txHash);
        }

        const totalLoaded = pendingEntries.length + provisionalEntries.length;
        if (totalLoaded > 0) {
            await this.logDetail(
                "pt6ld",
                `Loaded ${pendingEntries.length} pending + ${provisionalEntries.length} provisional entries from store for recovery`,
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

        // REQT/qdrr0es7bm (Resubmission on Startup) — trigger resubmission for all
        // surviving pending entries after page reload, before flipping to "fresh"
        await this.resubmitStalePendingTxs();

        // REQT/9r9rc1hrfv: Flip to fresh
        this._pendingSyncState = "fresh";

        // REQT/fz6z7rr702: Emit pendingSynced
        this.events.emit("pendingSynced");

        await this.logOp(
            "pt7rs",
            `Pending state resolved: pendingSyncState is now "fresh"`,
        );
    }

    // =========================================================================
    // REQT/cbpw1a6j8q: Quiet Transaction Resubmission
    // =========================================================================

    /**
     * Resubmits a signed transaction to the network. Decodes the CBOR and
     * calls this.network.submitTx(). Designed for future extensibility:
     * when Ogmios or Dred submitters are added, this method grows to route
     * through multiple submission paths.
     *
     * REQT/zyw6grz9t1 (Submission Path Abstraction)
     * REQT/zhgbnajdjg (Harmless Error Handling) — swallow expected errors
     */
    private async resubmitTx(txHash: string, signedCborHex: string): Promise<void> {
        // Log the resubmission attempt to the tx's submission log
        await this.store.appendSubmissionLog(txHash, {
            at: Date.now(),
            event: "silent-resubmit",
            detail: "quiet resubmission by CachedUtxoIndex",
        });

        // REQT/zhgbnajdjg (Harmless Error Handling) — all errors caught to protect
        // the resubmission loop. decodeTx is inside try/catch because corrupted
        // CBOR in a stored entry must not crash the entire loop.
        try {
            const tx = decodeTx(signedCborHex); // REQT/zyw6grz9t1
            await this.network.submitTx(tx); // REQT/zyw6grz9t1

            // Submission succeeded — log it
            await this.store.appendSubmissionLog(txHash, {
                at: Date.now(),
                event: "silent-resubmit-succeeded",
            });
        } catch (e: any) {
            // REQT/zhgbnajdjg (Harmless Error Handling) — swallow expected errors
            const msg = e.message || String(e);
            if (e.kind === "SubmissionUtxoError" || /All inputs are spent/i.test(msg) || /UtxoFailure/i.test(msg)) {
                // UTxO already consumed — tx already landed or was outcompeted. Harmless.
                await this.store.appendSubmissionLog(txHash, {
                    at: Date.now(),
                    event: "silent-resubmit",
                    detail: "swallowed UTxO error — tx inputs already consumed (harmless)",
                });
                return;
            }
            if (e.kind === "SubmissionExpiryError" || /OutsideValidityInterval/i.test(msg)) {
                // Validity window expired — deadline rollback will handle cleanup. Harmless.
                await this.store.appendSubmissionLog(txHash, {
                    at: Date.now(),
                    event: "silent-resubmit",
                    detail: "swallowed expiry error — validity window expired (harmless)",
                });
                return;
            }
            // Unexpected error — log warning but do NOT interrupt the resubmission loop
            await this.store.appendSubmissionLog(txHash, {
                at: Date.now(),
                event: "silent-resubmit",
                detail: `unexpected error: ${e.message || e}`,
            });
            await this.logWarn(
                "rs1er",
                `Unexpected error resubmitting tx: ${e.message || e}`,
            );
        }
    }

    /**
     * Iterates all txHashes in pendingTxHashes, loads each PendingTxEntry,
     * checks eligibility, and calls resubmitTx for eligible entries.
     * Called from checkForNewTxns() each sync cycle and from resolvePendingState()
     * on startup.
     *
     * REQT/z9d167q2mw (Resubmission Loop)
     * REQT/bq1nmd4c8x (Resubmission Scope)
     * REQT/sg0pqr0dx7 (Resubmission Throttle)
     */
    private async resubmitStalePendingTxs(): Promise<void> {
        if (this.pendingTxHashes.size === 0) return;

        let resubmitCount = 0;
        const now = Date.now();

        for (const txHash of this.pendingTxHashes) {
            const entry = await this.store.findPendingTx(txHash);
            if (!entry) continue;

            // REQT/bq1nmd4c8x (Resubmission Scope) — eligibility criteria:
            // (1) status === "pending" OR (status === "confirmed" AND confirmState === "provisional")
            const isEligibleStatus =
                entry.status === "pending" ||
                (entry.status === "confirmed" && entry.confirmState === "provisional"); // REQT/bq1nmd4c8x
            if (!isEligibleStatus) continue;

            // (2) validity window still open: raw validity end >= lastBlockSlot
            const lastValidSlot = entry.deadlineSlot - this.graceBufferSlots; // REQT/bq1nmd4c8x
            if (lastValidSlot < this.lastBlockSlot) continue; // REQT/bq1nmd4c8x — expired

            // (3) deadline block has NOT reached "likely" depth
            // If the deadline block itself has sufficient depth, the tx is either
            // confirmed deep enough or will be rolled back — no need to resubmit
            const deadlineBlock = await this.store.findFirstProcessedBlockAtOrAfterSlot(entry.deadlineSlot);
            if (deadlineBlock) {
                const depthPastDeadline = this.lastBlockHeight - deadlineBlock.height;
                if (depthPastDeadline >= this.confirmationThresholds.provisionalDepth) continue;
            }

            // (4) throttle: at most once per 10 seconds per tx
            // REQT/sg0pqr0dx7 (Resubmission Throttle)
            if (entry.lastResubmitAt && (now - entry.lastResubmitAt) < 10_000) continue;

            // All checks passed — resubmit
            await this.resubmitTx(entry.txHash, entry.signedTxCborHex); // REQT/z9d167q2mw

            // REQT/sg0pqr0dx7: Update lastResubmitAt via targeted modify — NOT savePendingTx,
            // which would overwrite the submissionLog entries that resubmitTx just appended.
            await this.store.updatePendingTxField(entry.txHash, "lastResubmitAt", now);
            resubmitCount++;
        }

        if (resubmitCount > 0) {
            await this.logDetail(
                "rs1ok",
                `Resubmitted ${resubmitCount} pending/provisional txs`,
            );
        }
    }

    // =========================================================================
    // REQT/jrhh4jg6se: Chain Rollback Detection & Recovery
    // =========================================================================

    /**
     * Detects rolled-back blocks by comparing stored block hashes against the
     * canonical chain from Blockfrost. Returns the hashes of stored blocks that
     * are no longer on the canonical chain, along with the canonical blocks
     * (to avoid a redundant API call in executeBlockRollback).
     *
     * Uses `blocks/{tipHash}/previous?count=100` — a single API call that
     * covers any realistic micro-fork rollback depth.
     *
     * REQT/yasww6cqa4 (Chain Intersection Discovery)
     */
    private async detectRolledBackBlocks(): Promise<{
        rolledBackHashes: string[];
        canonicalBlocks: BlockDetailsType[];
        forkHeight: number;
    }> {
        // Fetch canonical chain's recent blocks from Blockfrost
        const canonicalBlocks = await this.fetchFromBlockfrost<BlockDetailsType[]>(
            `blocks/${this.lastBlockId}/previous?count=100`, // REQT/yasww6cqa4
            {
                formatForLog: (blocks) =>
                    [...blocks].sort((a, b) => b.height - a.height),
                logLabel: "Fetched & sorted from BF",
            },
        );

        if (!Array.isArray(canonicalBlocks) || canonicalBlocks.length === 0) {
            return { rolledBackHashes: [], canonicalBlocks: [], forkHeight: 0 };
        }

        // REQT/yasww6cqa4: Sort by height ascending for ordered comparison
        canonicalBlocks.sort((a, b) => a.height - b.height);

        const rolledBackHashes: string[] = [];

        // Walk canonical blocks ascending, comparing hashes against stored blocks.
        // Track the last height where hashes agree (the chain intersection).
        // The fork point is lastSharedHeight + 1 — where the chains first diverge.
        let lastSharedHeight = -1;
        let divergenceFound = false;

        for (const canonical of canonicalBlocks) {
            // REQT/yasww6cqa4: Compare canonical hash against stored block at same height
            const stored = await this.store.findBlockByHeight(canonical.height);
            if (stored && stored.hash !== canonical.hash) {
                // Stored block exists but hash differs — it was rolled back
                rolledBackHashes.push(stored.hash); // REQT/yasww6cqa4
                divergenceFound = true;
            } else if (stored && stored.hash === canonical.hash && !divergenceFound) {
                // Hashes match and we haven't diverged yet — update intersection
                lastSharedHeight = canonical.height;
            }
            // No stored block at this height — can't confirm agreement
        }

        const forkHeight = lastSharedHeight + 1;

        return { rolledBackHashes, canonicalBlocks, forkHeight };
    }

    /**
     * Executes rollback recovery for blocks that are no longer on the canonical chain.
     *
     * For each rolled-back block:
     * 1. Discovers which txs were in the rolled-back block
     * 2. Checks if those txs appear in canonical replacement blocks (re-anchor)
     *    or are genuinely lost (revert to pending)
     * 3. Marks rolled-back blocks as "rolled back"
     * 4. Saves canonical replacement blocks as "unprocessed" for normal sync
     * 5. Emits chainRollback event
     *
     * REQT/4j3rs4pyjt (Rollback Recovery)
     * REQT/2grpnzb2q0 (Resolve Pending Tx Confirmations)
     * REQT/epwp74mn8x (Roll Back Processing Cursor)
     * REQT/dnr06r6ch5 (Rollback Event)
     */
    private async executeBlockRollback(
        rolledBackBlockHashes: string[],
        canonicalBlocks: BlockDetailsType[],
        forkHeight: number,
    ): Promise<void> {
        await this.logWarn(
            "rb001",
            `⚠ Chain rollback detected: ${rolledBackBlockHashes.length} block(s) rolled back, fork at height ${forkHeight}`,
        );

        // Log each rolled-back block with its height for diagnostics
        for (const rbHash of rolledBackBlockHashes) {
            const rbBlock = await this.store.findBlockId(rbHash);
            await this.logWarn(
                "rb0rb",
                `  rolled-back block #${rbBlock?.height ?? "?"}: ${rbHash.slice(0, 16)}…`,
            );
        }

        // REQT/jdkjh536mm: Set sync state to recovering
        this._syncState = `recovering from rollback (${rolledBackBlockHashes.length} blocks)`;

        // Build a map of canonical block hash → BlockDetailsType for height lookup
        const canonicalByHeight = new Map<number, BlockDetailsType>();
        for (const cb of canonicalBlocks) {
            canonicalByHeight.set(cb.height, cb);
        }

        // REQT/2grpnzb2q0: Build a set of txHashes present in canonical replacement blocks.
        // A tx from a rolled-back block can land at a DIFFERENT height on the winning fork,
        // so we scan ALL canonical blocks from the fork point upward. The fork point
        // (forkHeight) was determined by detectRolledBackBlocks during the same chain walk
        // that identified rolled-back blocks — no duplicate store queries needed.
        const canonicalTxSet = new Set<string>();
        const canonicalTxBlockMap = new Map<string, BlockDetailsType>(); // txHash → canonical block

        // Scan all canonical blocks from the fork point upward
        for (const cb of canonicalBlocks) {
            if (cb.height < forkHeight) continue; // below fork — identical on both chains

            const canonicalTxs = await this.fetchFromBlockfrost<Array<{ tx_hash: string }>>(
                `blocks/${cb.hash}/txs`, // REQT/2grpnzb2q0
            );

            if (Array.isArray(canonicalTxs)) {
                for (const tx of canonicalTxs) {
                    canonicalTxSet.add(tx.tx_hash); // REQT/2grpnzb2q0
                    canonicalTxBlockMap.set(tx.tx_hash, cb);
                }
            }
        }

        // REQT/2grpnzb2q0: Resolve each tx confirmed in a rolled-back block
        // Fetch txs from each rolled-back block to know which txs are affected
        for (const rbHash of rolledBackBlockHashes) {
            const rbBlock = await this.store.findBlockId(rbHash);
            const rbBlockTxs = await this.fetchFromBlockfrost<Array<{ tx_hash: string }>>(
                `blocks/${rbHash}/txs`, // REQT/2grpnzb2q0
            );

            if (!Array.isArray(rbBlockTxs)) continue;

            for (const tx of rbBlockTxs) {
                const entry = await this.store.findPendingTx(tx.tx_hash);
                if (!entry) {
                    await this.logWarn(
                        "rb2na",
                        `  tx ${tx.tx_hash.slice(0, 12)}… in rolled-back block #${rbBlock?.height ?? "?"}: no PendingTxEntry — skipped`,
                    );
                    continue;
                }

                if (canonicalTxSet.has(tx.tx_hash)) {
                    // REQT/2grpnzb2q0: Re-anchor path — tx found on canonical fork
                    const canonicalBlock = canonicalTxBlockMap.get(tx.tx_hash)!;
                    entry.confirmedInBlockHash = canonicalBlock.hash; // REQT/2grpnzb2q0
                    entry.confirmedAtBlockHeight = canonicalBlock.height; // REQT/2grpnzb2q0
                    entry.confirmedAtSlot = canonicalBlock.slot; // REQT/2grpnzb2q0
                    // Recalculate depth and confirmState from new height
                    const blockDepth = this.lastBlockHeight - canonicalBlock.height;
                    entry.confirmationBlockDepth = blockDepth;
                    const { provisionalDepth, confidentDepth } = this.confirmationThresholds;
                    if (blockDepth >= confidentDepth) {
                        entry.confirmState = "confident";
                    } else if (blockDepth >= provisionalDepth) {
                        entry.confirmState = "likely";
                    } else {
                        entry.confirmState = "provisional";
                    }
                    await this.store.savePendingTx(entry);

                    // Log re-anchor to submission log and warn log
                    await this.store.appendSubmissionLog(tx.tx_hash, {
                        at: Date.now(),
                        event: "re-anchored",
                        detail: `re-anchored from rolled-back block #${rbBlock?.height ?? "?"} to canonical block #${canonicalBlock.height} (${canonicalBlock.hash.slice(0, 16)}…)`,
                    });
                    await this.logWarn(
                        "rb2ra",
                        `  tx ${tx.tx_hash.slice(0, 12)}…: found on canonical fork → re-anchored to block #${canonicalBlock.height} (${canonicalBlock.hash.slice(0, 16)}…)`,
                    );
                } else {
                    // REQT/2grpnzb2q0: Revert path — tx NOT found on canonical fork
                    await this.logWarn(
                        "rb2rv",
                        `  tx ${tx.tx_hash.slice(0, 12)}…: NOT found on canonical fork → reverting to pending`,
                    );
                    await this.revertConfirmedPendingTx(entry, rbBlock?.height); // REQT/2grpnzb2q0
                }
            }
        }

        // REQT/epwp74mn8x (Roll Back Processing Cursor):
        // Mark rolled-back blocks as "rolled back" and save canonical replacements as "unprocessed"
        for (const rbHash of rolledBackBlockHashes) {
            const rbBlock = await this.store.findBlockId(rbHash);
            if (rbBlock) {
                await this.store.saveBlock({ ...rbBlock, state: "rolled back" }); // REQT/epwp74mn8x
            }

            // Save canonical replacement at same height as "unprocessed"
            if (rbBlock) {
                const canonicalReplacement = canonicalByHeight.get(rbBlock.height);
                if (canonicalReplacement) {
                    const entry = this.blockfrostBlockToIndexEntry(canonicalReplacement, "unprocessed");
                    await this.store.saveBlock(entry); // REQT/epwp74mn8x
                }
            }
        }

        // REQT/dnr06r6ch5 (Rollback Event) — emit chainRollback event
        this.events.emit("chainRollback", {
            depth: rolledBackBlockHashes.length, // REQT/dnr06r6ch5
            rolledBackBlockHashes, // REQT/dnr06r6ch5
        });

        await this.logOp(
            "rb099",
            `Block rollback complete: ${rolledBackBlockHashes.length} blocks rolled back`,
        );
    }

    /**
     * Reverts a confirmed PendingTxEntry back to "pending" status.
     * Called when a tx's confirming block was rolled back and the tx
     * is NOT found on the canonical fork.
     *
     * Does NOT touch UTxOs or records — speculative state from
     * registration is still correct. Depth tracking and quiet
     * resubmission resume automatically.
     *
     * REQT/b6h7km6h44 (Rollback Interaction)
     * REQT/2grpnzb2q0 (Resolve Pending Tx Confirmations — revert path)
     */
    private async revertConfirmedPendingTx(entry: PendingTxEntry, rolledBackBlockHeight?: number): Promise<void> {
        const { txHash } = entry;

        // REQT/b6h7km6h44: Revert to pending
        entry.status = "pending"; // REQT/b6h7km6h44
        entry.confirmedAtBlockHeight = undefined; // REQT/2grpnzb2q0
        entry.confirmedAtSlot = undefined; // REQT/2grpnzb2q0
        entry.confirmedInBlockHash = undefined; // REQT/2grpnzb2q0
        entry.confirmState = undefined; // REQT/b6h7km6h44
        entry.confirmationBlockDepth = 0; // REQT/2grpnzb2q0

        // REQT/k55zssabq2 (forkRecoveryCount Field) — increment diagnostic counter
        entry.forkRecoveryCount = (entry.forkRecoveryCount ?? 0) + 1; // REQT/k55zssabq2

        await this.store.savePendingTx(entry);

        // Log to submission log — note the rolled-back block for diagnostics
        const blockNote = rolledBackBlockHeight !== undefined
            ? `Note: was confirmed at rolled-back block #${rolledBackBlockHeight}`
            : "Note: was confirmed at a rolled-back block (height unknown)";
        await this.store.appendSubmissionLog(txHash, {
            at: Date.now(),
            event: "rollback-revert",
            detail: `${blockNote}. Reverted to pending (forkRecoveryCount: ${entry.forkRecoveryCount})`,
        });

        // REQT/b6h7km6h44: Re-add to pendingTxHashes for resubmission eligibility
        this.pendingTxHashes.add(txHash); // REQT/b6h7km6h44

        await this.logDetail(
            "rb2rv",
            `Reverted tx ${txHash.slice(0, 8)}… to pending (forkRecoveryCount: ${entry.forkRecoveryCount})`,
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
     * REQT/r0y7s2vggr: Supports optional filtering by confirmState
     */
    async getPendingTxs(filter?: {
        confirmState?: "provisional" | "likely" | "confident" | "certain";
    }): Promise<PendingTxEntry[]> {
        if (filter?.confirmState) {
            // REQT/r0y7s2vggr: Filter confirmed entries by confirmState
            const confirmed = await this.store.getPendingByStatus("confirmed");
            return confirmed.filter(
                (entry) => entry.confirmState === filter.confirmState,
            );
        }
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
            console.debug(`🟢 SYNC found pending tx ${txHash.slice(0, 8)}… — fast-path confirm (skip re-index)`);
            await this.confirmPendingTx(txHash, summary.block_height);
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

        // REQT/hhbcnvd9aj: Process inputs to mark spent UTXOs, with contention detection
        for (const input of tx.body.inputs) {
            const utxoId = input.id.toString();
            const existingUtxo = await this.store.findUtxoId(utxoId);
            if (!existingUtxo) continue;

            if (!existingUtxo.spentInTx) {
                // REQT/hhbcnvd9aj (Input Detection) — unspent → mark spent by confirmed tx
                await this.store.markUtxoSpent(utxoId, txHash);
                await this.logDetail(
                    "sp3nt",
                    `Marked UTXO ${utxoId} as spent in tx ${txHash}`,
                );
            } else if (existingUtxo.spentInTx === txHash) {
                // Same tx already claimed it — no-op
            } else {
                // REQT/hhbcnvd9aj (Input Detection) — different tx already claimed this UTxO
                // On-chain reality wins: overwrite spentInTx with confirmed tx hash
                const previousTxHash = existingUtxo.spentInTx;
                await this.store.markUtxoSpent(utxoId, txHash);
                await this.logDetail(
                    "ct3nt",
                    `Contention: UTXO ${utxoId} was claimed by ${previousTxHash.slice(0, 8)}… but confirmed tx ${txHash.slice(0, 8)}… wins — overwriting spentInTx`,
                );

                // Record contention on the losing pending tx's entry
                const losingPendingEntry = await this.store.findPendingTx(previousTxHash);
                if (losingPendingEntry && losingPendingEntry.status === "pending") {
                    const contestedByTxs = losingPendingEntry.contestedByTxs ?? [];
                    contestedByTxs.push({ txHash, blockHeight: summary.block_height });
                    losingPendingEntry.contestedByTxs = contestedByTxs;
                    await this.store.savePendingTx(losingPendingEntry);
                    await this.logDetail(
                        "ct3pd",
                        `Recorded contention on pending tx ${previousTxHash.slice(0, 8)}…: confirmed tx ${txHash.slice(0, 8)}… at block #${summary.block_height}`,
                    );
                }
            }
        }

        // REQT/xrdj6qpgnj: Re-catalog delegates if charter changed
        if (charterChanged) {
            await this.logDetail(
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

        // REQT/kfemj6eteg (Block-Discovered PendingTxEntry Creation) — create a
        // PendingTxEntry for every tx processed from a confirmed block, unless one
        // already exists (self-submitted txs have entries from registerPendingTx).
        // This ensures all txs in the index have uniform tracking for rollback resolution.
        const existingPendingEntry = await this.store.findPendingTx(txHash);
        if (!existingPendingEntry) {
            // REQT/kfemj6eteg: Extract validity interval from the already-decoded tx
            // for deadlineSlot calculation. The tx was decoded above by findOrFetchTxDetails.
            // Uses same pattern as registerPendingTx (tx.body.lastValidSlot).
            const lastValidSlot = tx.body.lastValidSlot;
            const deadlineSlot = lastValidSlot !== undefined
                ? lastValidSlot + this.graceBufferSlots
                : summary.block_height + this.graceBufferSlots; // fallback for txs without validity end

            // REQT/kfemj6eteg: Fetch CBOR for this tx (for resubmission if needed).
            // The CBOR is already in the store from findOrFetchTxDetails — retrieve it.
            const txEntry = await this.store.findTxId(txHash);
            const cborHex = txEntry?.cbor ?? ""; // REQT/kfemj6eteg — sensible default if missing

            // Look up confirming block details
            const confirmingBlock = await this.store.findBlockByHeight(summary.block_height);

            const blockDepth = this.lastBlockHeight - summary.block_height;
            const { provisionalDepth, confidentDepth } = this.confirmationThresholds;
            let confirmState: "provisional" | "likely" | "confident" | "certain";
            if (blockDepth >= confidentDepth) {
                confirmState = "confident";
            } else if (blockDepth >= provisionalDepth) {
                confirmState = "likely";
            } else {
                confirmState = "provisional";
            }

            // REQT/kfemj6eteg: Sensible defaults for block-discovered entries
            const blockDiscoveredEntry: PendingTxEntry = {
                txHash,
                description: "tx discovered from on-chain data", // REQT/kfemj6eteg
                id: txHash, // REQT/kfemj6eteg — no TxDescription available
                batchDepth: 86, // REQT/kfemj6eteg — sentinel identifying block-discovered origin
                confirmationBlockDepth: blockDepth,
                txCborHex: cborHex, // REQT/kfemj6eteg — same as signed for block-discovered
                signedTxCborHex: cborHex, // REQT/kfemj6eteg
                deadlineSlot, // REQT/kfemj6eteg
                status: "confirmed", // REQT/kfemj6eteg
                submittedAt: Date.now(),
                confirmedAtBlockHeight: summary.block_height, // REQT/kfemj6eteg
                confirmedAtSlot: confirmingBlock?.slot, // REQT/kfemj6eteg
                confirmedInBlockHash: confirmingBlock?.hash, // REQT/kfemj6eteg
                confirmState, // REQT/kfemj6eteg
            };
            await this.store.savePendingTx(blockDiscoveredEntry); // REQT/kfemj6eteg
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
     * REQT/9gq8rwg9ng: State defaults to "unprocessed" — callers override when appropriate.
     */
    private blockfrostBlockToIndexEntry(
        bfBlock: BlockDetailsType,
        state: BlockState = "unprocessed",
    ): BlockIndexEntry {
        return {
            hash: bfBlock.hash,
            height: bfBlock.height,
            time: bfBlock.time,
            slot: bfBlock.slot,
            state,
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
        await this.cacheRefScriptIfPresent(output.refScript);
    }

    /**
     * Pre-caches a reference script's CBOR in the script store, so that
     * indexEntryToTxInput can reconstruct the TxOutput without a Blockfrost
     * round-trip.  Essential for pending-tx outputs whose scripts aren't
     * yet queryable on-chain, and a useful optimisation for confirmed outputs.
     *
     * No-op when refScript is undefined.  Idempotent — scripts are
     * content-addressed, so re-saving the same hash is harmless.
     */
    private async cacheRefScriptIfPresent(
        refScript: UplcProgram | undefined,
    ): Promise<void> {
        if (!refScript) return;
        const scriptHash = bytesToHex(refScript.hash());
        const cbor = bytesToHex(refScript.toCbor());
        await this.store.saveScript({ scriptHash, cbor });
    }

    /**
     * Catalogs delegate UUTs mentioned in the charter.
     * Uses delegate links directly with Blockfrost queries (decoupled from Capo).
     *
     * REQT/k0mnv27tz4 (catalogDelegateUuts)
     */
    private async catalogDelegateUuts(charterData: CharterData): Promise<void> {
        await this.logDetail("z5h89", `Cataloging delegate UUTs`);

        // Get mint delegate UUT
        try {
            const mintDelegateLink = charterData.mintDelegateLink;
            if (mintDelegateLink?.uutName) {
                await this.logDetail(
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
                await this.logDetail(
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
                await this.logDetail(
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
                        await this.logDetail(
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
                this.logDetail(
                    "pm5rq",
                    `${entryName} is a ${actualType}, not a DgDataPolicy; skipping`,
                );
                continue;
            }
            try {
                const { policyLink } = DgDataPolicy;
                if (policyLink?.uutName) {
                    await this.logDetail(
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

        await this.logDetail(
            "dx8pq",
            `Fetching UUT for ${label} at address ${address.toString()}`,
        );

        const policyId = assetClass.mph.toHex();
        const assetName = bytesToHex(assetClass.tokenName);
        const asset = `${policyId}${assetName}`;

        const url = `addresses/${address.toString()}/utxos/${asset}?count=1&order=desc`;
        const untyped = await this.fetchFromBlockfrost<unknown[]>(url);

        if (!Array.isArray(untyped) || untyped.length === 0) {
            await this.logDetail(
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
        await this.cacheRefScriptIfPresent(txInput.output?.refScript);
    }

    async fetchFromBlockfrost<T>(url: string, opts?: {
        /** Optional post-processing for debug log rendering — does NOT affect the returned data */
        formatForLog?: (result: T) => unknown;
        /** Custom label for the debug log line (default: "Successfully fetched from blockfrost") */
        logLabel?: string;
    }): Promise<T> {
        // Use global rate limiter to avoid exceeding Blockfrost's rate limits
        console.log(`⚡ fetchFromBlockfrost: ${url}`);
        const callerLoc = this._captureLocation();
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
                        "warn", this._currentOpLogId, callerLoc,
                    );
                    throw new Error(result.message);
                }
                const logResult = opts?.formatForLog ? opts.formatForLog(result) : result;
                await this.store.log(
                    "rm7g8",
                    `${opts?.logLabel ?? "Successfully fetched from blockfrost"}: ${url} ${JSON.stringify(logResult)}`,
                    "debug", this._currentOpLogId, callerLoc,
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
        await this.logDetail(
            "78q9n",
            `Fetching block details for ${blockId} from blockfrost`,
        );
        const untyped = await this.fetchFromBlockfrost(`blocks/${blockId}`);
        // Type cast instead of runtime validation - trusting Blockfrost API
        return untyped as BlockDetailsType;
    }

    /**
     * Fetches the latest block from Blockfrost and updates in-memory tip state.
     * Saves the block to store only if it doesn't already exist (to preserve
     * state set by the block walk or catchup sync).
     *
     * REQT/9a0nx1gr4b (Core State) — tip tracking independent of processing
     */
    async fetchAndStoreLatestBlock(): Promise<BlockIndexEntry> {
        await this.logDetail("x2xzt", `Fetching latest block from blockfrost`);
        const untyped = await this.fetchFromBlockfrost(`blocks/latest`);
        // Type cast instead of runtime validation - trusting Blockfrost API
        const typed = untyped as BlockDetailsType;
        await this.logDetail(
            "8y2yn",
            `latest block from blockfrost: #${typed.height} ${typed.hash}`,
        );

        // REQT/9a0nx1gr4b: Update in-memory tip state (independent of processing)
        if (typed.height > this.lastBlockHeight) {
            await this.logDetail(
                "2k3uq",
                `new latest block: #${typed.height} ${typed.hash}`,
            );
            this.lastBlockHeight = typed.height;
            this.lastBlockId = typed.hash;
            this.lastBlockSlot = typed.slot;
            this.lastBlockTime = typed.time;
        }

        // Save block only if not already in store — preserve existing state
        // set by block walk (incremental) or catchup sync
        const existing = await this.store.findBlockId(typed.hash);
        if (existing) {
            return existing;
        }

        const entry = this.blockfrostBlockToIndexEntry(typed, "unprocessed");
        await this.store.saveBlock(entry);
        return entry;
    }

    /**
     * Discovers and stores ALL blocks since the last-seen block (highest block
     * in our store, regardless of state). Uses `blocks/{hash}/next` to walk
     * forward from the last-seen block, saving each discovered block as
     * "unprocessed". This builds a complete chain segment in the blocks table.
     *
     * REQT/9gq8rwg9ng (Block Tip & Address Recording) — complete chain segment recording
     */
    private async fetchAndStoreNewBlocks(): Promise<number> {
        const lastSeen = await this.store.getLatestBlock();
        if (!lastSeen) {
            // No blocks in store — fetchAndStoreLatestBlock handles bootstrap
            return 0;
        }

        let totalStored = 0;
        let currentHash = lastSeen.hash;

        // Walk forward from last-seen block, paginating via blocks/{hash}/next
        // (endpoint returns up to ~100 blocks per call)
        while (true) {
            const nextBlocks = await this.fetchFromBlockfrost<BlockDetailsType[]>(
                `blocks/${currentHash}/next`,
            );

            if (!Array.isArray(nextBlocks) || nextBlocks.length === 0) {
                break;
            }

            for (const blockDetails of nextBlocks) {
                // Save as "unprocessed" — only if not already in store
                const existing = await this.store.findBlockId(blockDetails.hash);
                if (!existing) {
                    const entry = this.blockfrostBlockToIndexEntry(blockDetails, "unprocessed");
                    await this.store.saveBlock(entry);
                    totalStored++;
                }

                // Update in-memory tip if this block is higher
                if (blockDetails.height > this.lastBlockHeight) {
                    this.lastBlockHeight = blockDetails.height;
                    this.lastBlockId = blockDetails.hash;
                    this.lastBlockSlot = blockDetails.slot;
                    this.lastBlockTime = blockDetails.time;
                }
            }

            // Continue walking from the last block in this batch
            currentHash = nextBlocks[nextBlocks.length - 1].hash;

            // If we got fewer than a full page, we've reached the tip
            if (nextBlocks.length < 100) {
                break;
            }
        }

        if (totalStored > 0) {
            await this.logDetail(
                "fnb01",
                `Discovered and stored ${totalStored} new blocks since #${lastSeen.height}`,
            );
        }

        return totalStored;
    }

    /**
     * Lightweight block-tip check. Fetches only blocks/latest and compares
     * the height to our last-known block. Returns true if a new block was
     * detected, false otherwise.
     *
     * Bypasses fetchFromBlockfrost() to avoid per-call logging noise at 5s
     * polling frequency. Uses the same rate limiter.
     *
     * Does NOT store anything or trigger syncing — the caller decides
     * what to do when a new block is found.
     */
    private async checkBlockTip(): Promise<boolean> {
        const res = await getBlockfrostRateLimiter().fetch(
            `${this.blockfrostBaseUrl}/api/v0/blocks/latest`,
            { headers: { project_id: this.blockfrostKey } }
        );
        if (!res.ok) {
            console.warn(`checkBlockTip: ${res.statusText}`);
            return false;
        }
        const typed = (await res.json()) as BlockDetailsType;
        return typed.height > this.lastBlockHeight;
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
                await this.logDetail(
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
        await this.logDetail(
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
        await this.logDetail("64qjp", `Fetching tx details for ${txId}`);
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
