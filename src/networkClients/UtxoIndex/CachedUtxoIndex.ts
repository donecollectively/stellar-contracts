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

import { ArkErrors } from "arktype";
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

import {
    BlockDetailsFactory,
    type BlockDetailsType,
} from "./blockfrostTypes/BlockDetails.js";
import {
    validateUtxoDetails,
    type UtxoDetailsType,
} from "./blockfrostTypes/UtxoDetails.js";
import {
    AddressTransactionSummariesFactory,
    type AddressTransactionSummariesType,
} from "./blockfrostTypes/AddressTransactionSummaries.js";
import type { CharterData } from "../../CapoTypes.js";
import type { RelativeDelegateLink } from "../../delegation/UnspecializedDelegate.typeInfo.js";

// periodically queries for new utxos at the capo address
const refreshInterval = 60 * 1000; // 1 minute
const delegateRefreshInterval = 60 * 60 * 1000; // 1 hour

// Default sync configuration
const DEFAULT_SYNC_PAGE_SIZE = 100;
const DEFAULT_MAX_SYNC_PAGES = Infinity;

// REQT/92m7kpkny7: Wallet address staleness threshold (default 30 seconds)
const DEFAULT_WALLET_STALENESS_MS = 30 * 1000;

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

    // REQT/zzsg63b2fb: Timer for periodic refresh
    private refreshTimerId: ReturnType<typeof setInterval> | null = null;

    // Promise that resolves when initial sync completes.
    // Query methods await this before accessing the cache.
    private syncReady: Promise<void>;
    private syncReadyResolve!: () => void;

    // Event emitter for sync status and rate limit metrics
    public readonly events = new EventEmitter<CachedUtxoIndexEvents>();

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
        blockfrostRateLimiter.events.on("metrics", (metrics) => {
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
            this.syncReadyResolve();
            this.events.emit("syncComplete");
            return;
        }

        // No cached data - do full initial sync
        // Fetch all UTXOs from the capo address using the network
        const capoUtxos = await this.network.getUtxos(this._address);

        await this.store.log("yz58q", `Found ${capoUtxos.length} capo UTXOs`);

        // REQT-1.3.1: Store all capo UTXOs in the index
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

        // Resolve and catalog delegate UUTs
        await this.catalogDelegateUuts(charterData);

        // Fetch and store the latest block details
        await this.fetchAndStoreLatestBlock();

        this.syncReadyResolve();
        this.events.emit("syncComplete");
    }

    /**
     * Checks for new transactions at the capo address and indexes new UTXOs.
     * Supports pagination with configurable page size and max pages.
     *
     * REQT-1.3.2 (checkForNewTxns)
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

            const transactionSummaries: AddressTransactionSummariesType[] = [];
            for (const item of untyped) {
                const validationResult =
                    AddressTransactionSummariesFactory(item);
                if (validationResult instanceof ArkErrors) {
                    console.error(
                        `Error validating transaction summary:`,
                        item,
                    );
                    validationResult.throw();
                }
                transactionSummaries.push(
                    validationResult as AddressTransactionSummariesType,
                );
            }

            // Process transactions from this page
            for (const summary of transactionSummaries) {
                await this.processTransactionForNewUtxos(
                    summary.tx_hash,
                    summary,
                );
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

        this.events.emit("synced");
    }

    /**
     * Starts periodic refresh timer to automatically check for new transactions.
     *
     * REQT/zzsg63b2fb (Automated Periodic Refresh)
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
    }

    /**
     * Stops the periodic refresh timer.
     *
     * REQT/zzsg63b2fb (Automated Periodic Refresh)
     */
    stopPeriodicRefresh(): void {
        if (this.refreshTimerId) {
            this.store.log("pr5t0", "Stopping periodic refresh");
            clearInterval(this.refreshTimerId);
            this.refreshTimerId = null;
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

        // Update cached UTXOs for this address
        // First, we store the new UTXOs (put will overwrite existing)
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
            `Synced wallet ${address}: ${utxos.length} UTXOs`,
        );

        return true;
    }

    /**
     * Processes a transaction to identify and index new UTXOs.
     *
     * REQT-1.3.3 (processTransactionForNewUtxos)
     */
    private async processTransactionForNewUtxos(
        txHash: string,
        summary: AddressTransactionSummariesType,
    ): Promise<void> {
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

            // REQT-1.3.3: Index ALL outputs, not just UUT-containing ones
            await this.indexUtxoFromOutput(txHash, outputIndex, output);

            // REQT-1.2.2: Check if charter token is present (indicates charter change)
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

        // REQT-1.2.2: Re-catalog delegates if charter changed
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
     */
    private txOutputToIndexEntry(
        txHash: string,
        outputIndex: number,
        output: TxOutput,
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
        };
    }

    /**
     * Converts a TxInput to a storage-agnostic UtxoIndexEntry.
     *
     * TYPE BOUNDARY: This method converts Helios types to storage types.
     */
    private txInputToIndexEntry(txInput: TxInput): UtxoIndexEntry {
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
        };
    }

    /**
     * Converts Blockfrost UtxoDetailsType to storage-agnostic UtxoIndexEntry.
     *
     * TYPE BOUNDARY: This method converts Blockfrost types to storage types.
     */
    private blockfrostUtxoToIndexEntry(
        bfUtxo: UtxoDetailsType,
        utxoId: string,
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
     */
    private async indexUtxoFromOutput(
        txHash: string,
        outputIndex: number,
        output: TxOutput,
    ): Promise<void> {
        const entry = this.txOutputToIndexEntry(txHash, outputIndex, output);
        await this.store.saveUtxo(entry);
    }

    /**
     * Catalogs delegate UUTs mentioned in the charter.
     * Uses delegate links directly with Blockfrost queries (decoupled from Capo).
     *
     * REQT-1.2.1 (catalogDelegateUuts)
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

        const typed = validateUtxoDetails(untyped[0]);
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
        const typed = BlockDetailsFactory(untyped);
        if (typed instanceof ArkErrors) {
            return typed.throw();
        }
        return typed;
    }

    async fetchAndStoreLatestBlock(): Promise<BlockIndexEntry> {
        await this.store.log("x2xzt", `Fetching latest block from blockfrost`);
        const untyped = await this.fetchFromBlockfrost(`blocks/latest`);
        const typed = BlockDetailsFactory(untyped);
        if (typed instanceof ArkErrors) {
            return typed.throw();
        }
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
        if (this.network.getUtxosWithAssetClass) {
            return this.network.getUtxosWithAssetClass(address, assetClass);
        }

        // If network doesn't support this method, filter from getUtxos
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
