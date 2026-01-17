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
import {
    decodeTx,
    makeAddress,
    makeAssetClass,
    makeValidatorHash,
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
    type MintingPolicyHash,
    type NetworkParams,
} from "@helios-lang/ledger";
import { bytesToHex } from "@helios-lang/codec-utils";
import type { CardanoClient } from "@helios-lang/tx-utils";
import type { Capo } from "../../Capo.js";

import { DexieUtxoStore } from "./DexieUtxoStore.js";
import type { UtxoStoreGeneric } from "./types/UtxoStoreGeneric.js";
import type { UtxoIndexEntry } from "./types/UtxoIndexEntry.js";
import type { BlockIndexEntry } from "./types/BlockIndexEntry.js";

import {
    BlockDetailsFactory,
    type BlockDetailsType,
} from "./blockfrostTypes/BlockDetails.js";
import {
    UtxoDetailsFactory,
    type UtxoDetailsType,
} from "./blockfrostTypes/UtxoDetails.js";
import {
    AddressTransactionSummariesFactory,
    type AddressTransactionSummariesType,
} from "./blockfrostTypes/AddressTransactionSummaries.js";
import type { CharterData } from "../../CapoTypes.js";
import type { RelativeDelegateLink } from "../../delegation/UnspecializedDelegate.typeInfo.js";
import type { StellarDelegate } from "../../delegation/StellarDelegate.js";

// periodically queries for new utxos at the capo address
const refreshInterval = 60 * 1000; // 1 minute
const delegateRefreshInterval = 60 * 60 * 1000; // 1 hour

export class CachedUtxoIndex {
    blockfrostKey: string;
    blockfrostBaseUrl: string = "https://cardano-mainnet.blockfrost.io";
    // remembers the last block-id, height, and slot seen in any capo utxo
    lastBlockId: string;
    lastBlockHeight: number;
    lastSlot: number;
    store: UtxoStoreGeneric;
    capo: Capo<any, any>;
    network: CardanoClient;

    // REQT/zzsg63b2fb: Timer for periodic refresh
    private refreshTimerId: ReturnType<typeof setInterval> | null = null;

    // REQT/9a0nx1gr4b (Core State) - expose capoAddress for external access
    get capoAddress(): string {
        return this.capo.address.toBech32();
    }

    // REQT/9a0nx1gr4b (Core State) - expose capoMph for external access
    get capoMph(): string {
        return this.capo.mph.toHex();
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
        return this.capo.setup.isMainnet;
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
        const id = utxoId.toString();
        const entry = await this.store.findUtxoId(id);
        return entry !== undefined;
    }

    constructor({
        capo,
        blockfrostKey,
        storeIn: strategy = "dexie",
    }: {
        capo: Capo<any, any>;
        blockfrostKey: string;
        storeIn?: "dexie" | "memory" | "dred";
    }) {
        this.capo = capo;
        this.blockfrostKey = blockfrostKey;
        this.network = capo.setup.network;
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
        if (strategy === "dexie") {
            this.store = new DexieUtxoStore();
        } else if (strategy === "memory") {
            throw new Error("Memory strategy not implemented");
        } else if (strategy === "dred") {
            throw new Error("Dred strategy not implemented");
        } else {
            throw new Error(`Invalid strategy: ${strategy}`);
        }
        this.store.log(
            "agsbb",
            `CachedUtxoIndex created for capo: ${this.capo.address.toString()}`,
        );
        this.syncNow();
    }

    async syncNow() {
        // Fetch all UTXOs from the capo address using the Capo's findCapoUtxos() method
        const capoUtxos = await this.capo.findCapoUtxos();

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

        // Find the charter UTXO
        const charterUtxo = await this.capo.mustFindCharterUtxo(capoUtxos);

        // Get charter data to resolve delegates
        const charterData = await this.capo.findCharterData(charterUtxo, {
            optional: false,
            capoUtxos: capoUtxos,
        });

        // Resolve and catalog delegate UUTs
        await this.catalogDelegateUuts(charterData);

        // Fetch and store the latest block details
        await this.fetchAndStoreLatestBlock();
    }

    /**
     * Checks for new transactions at the capo address and indexes new UTXOs.
     *
     * REQT-1.3.2 (checkForNewTxns)
     */
    async checkForNewTxns(fromBlockHeight?: number): Promise<void> {
        const startHeight =
            fromBlockHeight ??
            (this.lastBlockHeight > 0 ? this.lastBlockHeight + 1 : 0);

        if (startHeight == 0) {
            throw new Error(
                "Cannot start checking for new transactions at block height 0",
            );
        }
        const capoAddress = this.capo.address.toString();

        const url = `addresses/${capoAddress}/transactions?order=desc&count=100&from=${startHeight}`;
        const untyped = await this.fetchFromBlockfrost<unknown[]>(url);

        if (!Array.isArray(untyped) || untyped.length === 0) {
            return;
        }
        if (untyped.length > 100) {
            throw new Error("Needed: support for fast transaction discovery");
        }

        const transactionSummaries: AddressTransactionSummariesType[] = [];
        for (const item of untyped) {
            const validationResult = AddressTransactionSummariesFactory(item);
            if (validationResult instanceof ArkErrors) {
                console.error(`Error validating transaction summary:`, item);
                validationResult.throw();
            }
            transactionSummaries.push(
                validationResult as AddressTransactionSummariesType,
            );
        }

        for (const summary of transactionSummaries) {
            await this.processTransactionForNewUtxos(summary.tx_hash, summary);
        }
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
                this.store.log("pr5er", `Periodic refresh error: ${e}`);
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
        const mph = this.capo.mph;
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
                } catch {
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
            const charterData = await this.capo.findCharterData();
            await this.catalogDelegateUuts(charterData);
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
        const tokenNames = output.value.assets.getPolicyTokenNames(
            this.capo.mph,
        );

        return tokenNames
            .map((bytes) => {
                try {
                    return new TextDecoder().decode(new Uint8Array(bytes));
                } catch {
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
        const tokenNames = txInput.value.assets.getPolicyTokenNames(
            this.capo.mph,
        );

        return tokenNames
            .map((bytes) => {
                try {
                    return new TextDecoder().decode(new Uint8Array(bytes));
                } catch {
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

        // Extract tokens
        const tokens: UtxoIndexEntry["tokens"] = [];
        for (const [mph, policyTokens] of output.value.assets.mintingPolicies) {
            for (const [tokenName, qty] of policyTokens) {
                tokens.push({
                    policyId: mph.toHex(),
                    tokenName: bytesToHex(tokenName),
                    quantity: qty,
                });
            }
        }

        // Extract datum
        let datumHash: string | null = null;
        let inlineDatum: string | null = null;
        if (output.datum) {
            if (output.datum.kind === "HashedTxOutputDatum") {
                datumHash = output.datum.hash.toHex();
            } else if (output.datum.kind === "InlineTxOutputDatum") {
                inlineDatum = bytesToHex(output.datum.toCbor());
            }
        }

        return {
            utxoId,
            address: output.address.toBech32(),
            lovelace: output.value.lovelace,
            tokens,
            datumHash,
            inlineDatum,
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

        // Extract tokens
        const tokens: UtxoIndexEntry["tokens"] = [];
        for (const [mph, policyTokens] of txInput.value.assets
            .mintingPolicies) {
            for (const [tokenName, qty] of policyTokens) {
                tokens.push({
                    policyId: mph.toHex(),
                    tokenName: bytesToHex(tokenName),
                    quantity: qty,
                });
            }
        }

        // Extract datum
        let datumHash: string | null = null;
        let inlineDatum: string | null = null;
        if (txInput.datum) {
            if (txInput.datum.kind === "HashedTxOutputDatum") {
                datumHash = txInput.datum.hash.toHex();
            } else if (txInput.datum.kind === "InlineTxOutputDatum") {
                inlineDatum = bytesToHex(txInput.datum.toCbor());
            }
        }

        return {
            utxoId,
            address: txInput.address.toBech32(),
            lovelace: txInput.value.lovelace,
            tokens,
            datumHash,
            inlineDatum,
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
                try {
                    // Convert hex token name to string
                    const bytes = new Uint8Array(
                        token.tokenName
                            .match(/.{2}/g)
                            ?.map((b) => parseInt(b, 16)) || [],
                    );
                    const name = new TextDecoder().decode(bytes);
                    if (uutPattern.test(name)) {
                        uutIds.push(name);
                    }
                } catch {
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
                const delegate = await this.capo.getMintDelegate(charterData);
                await this.fetchAndIndexDelegateUut(delegate, "mintDelegate");
            }
        } catch (e) {
            console.warn("Could not resolve mint delegate UUT:", e);
        }

        // Get spend delegate UUT
        try {
            const spendDelegateLink = charterData.spendDelegateLink;
            if (spendDelegateLink?.uutName) {
                await this.store.log(
                    "fgmtv",
                    `Fetching spend delegate UUT: ${spendDelegateLink.uutName}`,
                );
                const delegate = await this.capo.getSpendDelegate(charterData);
                await this.fetchAndIndexDelegateUut(delegate, "spendDelegate");
            }
        } catch (e) {
            console.warn("Could not resolve spend delegate UUT:", e);
        }

        // Get gov authority UUT
        try {
            const govAuthorityLink = charterData.govAuthorityLink;
            if (govAuthorityLink?.uutName) {
                await this.store.log(
                    "g8xpk",
                    `Fetching gov authority UUT: ${govAuthorityLink.uutName}`,
                );
                const delegate = await this.capo.findGovDelegate(charterData);
                await this.fetchAndIndexDelegateUut(delegate, "govAuthority");
            }
        } catch (e) {
            console.warn("Could not resolve gov authority UUT:", e);
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
                        const delegate = await this.capo.getOtherNamedDelegate(
                            delegateName,
                            charterData,
                        );
                        await this.store.log(
                            "nd8uu",
                            `Fetching named delegate '${delegateName}' UUT`,
                        );
                        await this.fetchAndIndexDelegateUut(
                            delegate,
                            `namedDelegate:${delegateName}`,
                        );
                    }
                } catch (e) {
                    console.warn(
                        `Could not resolve named delegate '${delegateName}' UUT:`,
                        e,
                    );
                }
            }
        }

        // Get dgData controller UUTs
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
                const controller = await this.capo.getDgDataController(
                    entryName,
                    {
                        charterData,
                        optional: true,
                    },
                );
                const { policyLink } = DgDataPolicy;
                const uutName = policyLink.uutName;

                await this.store.log(
                    "c6awj",
                    `Fetching dgData controller UUT: ${uutName}`,
                );
                if (controller) {
                    await this.fetchAndIndexDelegateUut(
                        controller,
                        `dgDataController:${entryName}`,
                    );
                }
            } catch (e) {
                console.warn(
                    `Could not resolve dgData controller ${entryName}:`,
                    e,
                );
            }
        }
    }

    /**
     * Fetches and indexes a delegate's authority token UTXO.
     */
    private async fetchAndIndexDelegateUut(
        delegate: StellarDelegate,
        label: string,
    ): Promise<void> {
        try {
            const utxo = await delegate.DelegateMustFindAuthorityToken(
                this.capo.mkTcx(),
                label,
                { findCached: false },
            );

            const entry = this.txInputToIndexEntry(utxo);
            await this.store.saveUtxo(entry);
        } catch (e) {
            console.warn(`Failed to fetch delegate UUT for ${label}:`, e);
            throw e;
        }
    }

    /**
     * Fetches and indexes a delegate's authority token UTXO from a delegate link.
     */
    private async fetchAndIndexDelegateLinkUut(
        delegateLink: RelativeDelegateLink,
        label: string,
    ): Promise<void> {
        const mph = this.capo.mph;
        const assetClass = makeAssetClass(mph, delegateLink.uutName);

        const address = delegateLink.delegateValidatorHash
            ? makeAddress(
                  this.capo.setup.isMainnet,
                  makeValidatorHash(delegateLink.delegateValidatorHash),
              )
            : this.capo.address;

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

        const validationResult = UtxoDetailsFactory(untyped[0]);
        if (validationResult instanceof ArkErrors) {
            console.error(
                `Error validating UTXO for ${label}:`,
                validationResult,
            );
            throw new Error("Validation error fetching delegate UTXO");
        }

        const typed = validationResult as UtxoDetailsType;
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
        return fetch(`${this.blockfrostBaseUrl}/api/v0/${url}`, {
            headers: {
                project_id: this.blockfrostKey,
            },
        }).then(async (res) => {
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
     * Retrieves a transaction by ID.
     * Implements ReadonlyCardanoClient.getTx
     *
     * REQT/gx7y3z6ot (getTx Method)
     */
    async getTx(id: TxId): Promise<Tx> {
        return this.findOrFetchTxDetails(id.toHex());
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

    // =========================================================================
    // REQT/50zkk5xgrx: Public Query API Methods
    // =========================================================================

    /**
     * Converts a UtxoIndexEntry back to a Helios TxInput.
     * This is the inverse of txOutputToIndexEntry.
     */
    private indexEntryToTxInput(entry: UtxoIndexEntry): TxInput {
        // Parse utxoId to get txHash and outputIndex
        const [txHash, indexStr] = entry.utxoId.split("#");
        const outputIndex = parseInt(indexStr, 10);

        // Create TxOutputId
        const txOutputId = makeTxOutputId(txHash, outputIndex);

        // Create Value from lovelace and tokens
        const assets: [AssetClass, bigint][] = entry.tokens.map((t) => [
            makeAssetClass(`${t.policyId}.${t.tokenName}`),
            t.quantity,
        ]);
        const value = makeValue(entry.lovelace, assets);

        // Create TxOutput
        const address = makeAddress(entry.address);
        const datum = entry.inlineDatum
            ? { inline: entry.inlineDatum }
            : entry.datumHash
              ? { hash: entry.datumHash }
              : undefined;

        const txOutput = makeTxOutput(address, value, datum);

        return makeTxInput(txOutputId, txOutput);
    }

    /**
     * Retrieves a UTXO by its output ID.
     * Implements ReadonlyCardanoClient.getUtxo
     *
     * REQT/gt3ux9v2kp (getUtxo Method)
     */
    async getUtxo(id: TxOutputId): Promise<TxInput> {
        const utxoId = id.toString();
        const entry = await this.store.findUtxoId(utxoId);

        if (entry) {
            return this.indexEntryToTxInput(entry);
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
        const addrStr = address.toBech32();
        const entries = await this.store.findUtxosByAddress(addrStr);

        if (entries.length > 0) {
            return entries.map((e) => this.indexEntryToTxInput(e));
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
        const addrStr = address.toBech32();
        const policyId = assetClass.mph.toHex();
        const tokenName = assetClass.tokenName.toString();

        // Try cache first - find UTXOs matching both address and asset
        const entries = await this.store.findUtxosByAsset(policyId, tokenName);
        const filtered = entries.filter((e) => e.address === addrStr);

        if (filtered.length > 0) {
            return filtered.map((e) => this.indexEntryToTxInput(e));
        }

        // Fall through to network on cache miss
        if (this.network.getUtxosWithAssetClass) {
            return this.network.getUtxosWithAssetClass(address, assetClass);
        }

        // If network doesn't support this method, filter from getUtxos
        const allUtxos = await this.network.getUtxos(address);
        return allUtxos.filter((u) =>
            u.value.assets.has(assetClass.mph, assetClass.tokenName),
        );
    }

    /**
     * Finds a UTXO containing a specific UUT by its name.
     *
     * REQT/50zkk5xgrx (Query API Methods)
     */
    async findUtxoByUUT(uutId: string): Promise<UtxoIndexEntry | undefined> {
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
        return this.store.getAllUtxos(options);
    }
}
