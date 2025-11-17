/** The DexieCachedUtxoIndex indexes all the utxos that are
 * needed for interacting with a specific Capo.  This includes
 * the charter token, the delegate UUTs seen in the charter,
 * and all the delegated-data records stored in the capo address.
 *
 * The delegate UUTs are stored at other addresses, but their
 * asset-ids always use the capo minter's policy-id; their asset
 * names and related script addresses are found in the charter data.
 * */

import { ArkErrors } from "arktype";
import {
    decodeTx,
    makeAssetClass,
    type Tx,
    type TxOutput,
} from "@helios-lang/ledger";
import { bytesToHex } from "@helios-lang/codec-utils";
import {
    makeBlockfrostV0Client,
    type CardanoClient,
} from "@helios-lang/tx-utils";
import type { Capo } from "../../Capo";

import { DexieUtxoStore } from "./DexieUtxoStore.js";
import type { UtxoStoreGeneric } from "./UtxoStoreGeneric.js";

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
import type { CharterData } from "../../CapoTypes";
import type { RelativeDelegateLink } from "../../delegation/UnspecializedDelegate.typeInfo";
// uses a specific base page size for fetching capo utxos
const capoUpdaterPageSize = 20;

export class CachedUtxoIndex {
    blockfrostKey: string;
    blockfrostBaseUrl: string = "https://cardano-mainnet.blockfrost.io";
    // remembers the last block-id and height seen in any capo utxo
    lastBlockId: string;
    lastBlockHeight: number;
    store: UtxoStoreGeneric;
    capo: Capo<any, any>;

    // Uses the Capo to locate the UTXO's, via its setup.network.
    // Also uses that network's getTx(TxId) for transaction-fetching,
    // getUtxo(TxOutputId) for UTXO-fetching, and getUtxosWithAssetClass(...) for fetching UUTs.
    // use the Capo's mustFindCharterUtxo(...) to locate the charter UTXO and
    // to access its datum.

    // Given the full list of capo UTXO's, use the capo's methods for resolving the delegates:
    // - getDgDataController(...) to resolve the dgData controllers
    // - getMintDelegate(...) to resolve the mint delegate
    // - getSpendDelegate(...) to resolve the spend delegate

    // ensure that when new utxos are found, the underlying transaction is fetched and if the
    // delegate UUTs are updated, that the current entry for each UUT is updated.

    // the store should have a table for singleton pointers to the charter UTXO, the mint delegate UTXO, the spend delegate UTXO, and the dgData controllers.

    // Once the capo utxo's are found,the indexer should use
    //  https://docs.blockfrost.io/#tag/cardano--blocks/get/blocks/latest
    // to get the the lastest block details, and store it in the index.

    // Once the full set of capo UTXO's and delegate-UUT utxos are indexed,
    // it should monitor the capo address for new UTXOs, using
    // https://docs.blockfrost.io/#tag/cardano--addresses/get/addresses/{address}/transactions
    // with order=desc and count=100, and with the `from` parameter:
    //   // from : string
    //  // The block number from which (inclusive) to start search for results
    // Use the AddressTransactionSummariesType and AddressTransactionSummariesFactory
    // to validate the response from blockfrost.
    // Given these details, it should fetch each transaction via the CardanoClient's getTx(TxId) method.
    // for each utxo emitted by that transaction, it should identify all the UUTs,
    // including for mint and spend delegates, govAuthority, and dgDataControllers and delegated-data record-ids.
    // given this set of UUTs, it should ensure that the corresponding utxo is not already indexed,
    // before it is indexed; this ensures that only the most recent utxo for each UUT is recongized
    // as the most current utxo for that UUT.

    // the data store should additionally have a UutChanges table for tx-outputs, indexed by the UUT id.
    // this table should store the tx-output id, the input utxo id, and the output datum.  It is
    // used to track data change-history for each UUT.

    // if needed, it can use the latest block details to fetch later blocks using
    // https://docs.blockfrost.io/#tag/cardano--blocks/get/blocks/{hash_or_number}/next
    //

    network: CardanoClient;

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
        if (strategy === "dexie") {
            this.store = new DexieUtxoStore();
        } else if (strategy === "memory") {
            throw new Error("Memory strategy not implemented");
            // this.store = new MemoryUtxoStore();
        } else if (strategy === "dred") {
            throw new Error("Dred strategy not implemented");
            // this.store = new DredUtxoStore();
        } else {
            throw new Error(`Invalid strategy: ${strategy}`);
        }
        this.store.log(
            "agsbb",
            `CachedUtxoIndex created for capo: ${this.capo.address.toString()}`
        );
        this.syncNow();
    }

    async syncNow() {
        // Fetch all UTXOs from the capo address using the Capo's findCapoUtxos() method
        const capoUtxos = await this.capo.findCapoUtxos();

        await this.store.log("yz58q", `Found ${capoUtxos.length} capo UTXOs`);
        // Extract unique transaction IDs from the UTXOs and fetch/store transaction details
        // TxInput.id is in format "txHash#index", so we extract the tx hash part
        const uniqueTxIds = new Set(
            capoUtxos.map((utxo) => {
                const id = utxo.id.toString();
                return id.split("#")[0]; // Extract tx hash from "txHash#index" format
            })
        );

        await this.store.log(
            "yuyqy",
            `Found ${uniqueTxIds.size} unique transaction IDs`
        );
        for (const txId of uniqueTxIds) {
            await this.store.log(
                "48nyb",
                `Fetching transaction details for ${txId}`
            );
            const t = await this.findOrFetchTxDetails(txId);
        }

        // Find the charter UTXO
        const charterUtxo = await this.capo.mustFindCharterUtxo(capoUtxos);

        // Get charter data to resolve delegates
        const charterData = await this.capo.findCharterData(charterUtxo, {
            optional: false,
            capoUtxos: capoUtxos,
        });

        // Resolve and index delegate UUTs
        await this.indexDelegateUuts(charterData);

        // Fetch and store the latest block details
        await this.fetchAndStoreLatestBlock();
    }

    /**
     * Monitors the capo address for new transactions and indexes new UTXOs.
     *
     * Uses https://docs.blockfrost.io/#tag/cardano--addresses/get/addresses/{address}/transactions
     * with order=desc, count=100, and the `from` parameter to fetch transactions
     * from a specific block height onwards.
     *
     * For each transaction, it:
     * 1. Fetches the full transaction via network.getTx()
     * 2. Extracts UTXOs from transaction outputs
     * 3. Identifies UUTs in those outputs
     * 4. Indexes new UTXOs, ensuring only the most recent UTXO for each UUT is kept
     *
     * @param fromBlockHeight - The block height from which (inclusive) to start searching.
     *                          If not provided, uses lastBlockHeight + 1
     */
    async monitorForNewTransactions(fromBlockHeight?: number): Promise<void> {
        const startHeight =
            fromBlockHeight ??
            (this.lastBlockHeight > 0 ? this.lastBlockHeight + 1 : 0);

        if (startHeight == 0) {
            throw new Error(
                "Cannot start monitoring for new transactions at block height 0"
            );
        }
        const capoAddress = this.capo.address.toString();

        // Fetch transaction summaries from Blockfrost
        const url = `addresses/${capoAddress}/transactions?order=desc&count=100&from=${startHeight}`;
        const untyped = await this.fetchFromBlockfrost<unknown[]>(url);

        if (!Array.isArray(untyped) || untyped.length === 0) {
            // No new transactions
            return;
        }
        if (untyped.length > 100) {
            throw new Error("Needed: support for fast transaction discovery");
        }

        // Validate and process each transaction summary
        const transactionSummaries: AddressTransactionSummariesType[] = [];
        for (const item of untyped) {
            const validationResult = AddressTransactionSummariesFactory(item);
            if (validationResult instanceof ArkErrors) {
                console.error(`Error validating transaction summary:`, item);
                validationResult.throw();
            }
            transactionSummaries.push(
                validationResult as AddressTransactionSummariesType
            );
        }

        // Process each transaction
        for (const summary of transactionSummaries) {
            await this.processTransactionForNewUtxos(summary.tx_hash, summary);
        }
    }

    /**
     * Processes a transaction to identify and index new UTXOs, particularly UUTs.
     *
     * @param txHash - The transaction hash to process
     * @param summary - The transaction summary containing block information
     */
    private async processTransactionForNewUtxos(
        txHash: string,
        summary: AddressTransactionSummariesType
    ): Promise<void> {
        // Fetch the full transaction
        const tx = await this.findOrFetchTxDetails(txHash);

        // Process each output to identify UUTs
        for (
            let outputIndex = 0;
            outputIndex < tx.body.outputs.length;
            outputIndex++
        ) {
            const output = tx.body.outputs[outputIndex];
            const utxoId = this.utxoId(txHash, outputIndex);

            // Check if this UTXO is already indexed
            const existingUtxo = await this.store.findUtxoByUtxoId(utxoId);
            if (existingUtxo) {
                continue; // Already indexed
            }

            // Check if this output contains any UUTs from the capo's minting policy
            const mph = this.capo.mph;
            const tokenNames = output.value.assets.getPolicyTokenNames(mph);
            const hasUut = tokenNames.length > 0;

            if (hasUut) {
                // This output contains tokens from the capo's policy - likely a UUT
                // For now, we'll index all outputs with tokens from the capo policy
                // A more sophisticated check would verify against known UUT names
                await this.indexUtxoFromOutput(
                    txHash,
                    outputIndex,
                    output,
                    summary
                );
            }
        }
    }

    /**
     * Indexes a UTXO from a transaction output.
     *
     * @param txHash - Transaction hash
     * @param outputIndex - Output index in the transaction
     * @param output - The transaction output
     * @param summary - Transaction summary containing block information
     */
    private async indexUtxoFromOutput(
        txHash: string,
        outputIndex: number,
        output: TxOutput,
        summary: AddressTransactionSummariesType
    ): Promise<void> {
        // Get block hash from block height
        // First try to find block by height, or fetch block details
        const blockHash = await this.getBlockHashFromHeight(
            summary.block_height
        );

        // Convert Value to Blockfrost amount format
        const amount = this.convertValueToBlockfrostAmount(output.value);

        // Extract datum information
        let dataHash: string | null = null;
        let inlineDatum: string | null = null;
        if (output.datum?.kind === "InlineTxOutputDatum") {
            const cborBytes = output.datum.data.toCbor();
            inlineDatum = bytesToHex(cborBytes);
            // Calculate data hash if needed (Blockfrost format)
            dataHash = null; // Blockfrost may calculate this differently
        } else if (output.datum?.kind === "HashedTxOutputDatum") {
            dataHash = output.datum.hash.toHex();
        }

        // Extract reference script hash
        let referenceScriptHash: string | null = null;
        if (output.refScript) {
            // Calculate script hash - this would need the actual script hash calculation
            // For now, we'll leave it as null and can enhance later
            referenceScriptHash = null;
        }

        // Construct UtxoDetailsType
        // Note: amount.quantity is typed as number by the factory (parsed from string),
        // but we provide strings which get validated and parsed by the factory
        const utxoDetails = {
            address: output.address.toString(),
            tx_hash: txHash,
            tx_index: summary.tx_index,
            output_index: outputIndex,
            amount: amount as any, // Factory validates and parses string quantities to numbers
            block: blockHash,
            data_hash: dataHash,
            inline_datum: inlineDatum,
            reference_script_hash: referenceScriptHash,
        } as UtxoDetailsType;

        // Add utxoId for Dexie
        const utxoWithId = {
            ...utxoDetails,
            utxoId: this.utxoId(txHash, outputIndex),
        };

        // Store the UTXO
        await this.store.saveUtxo(utxoWithId);
    }

    /**
     * Gets block hash from block height by fetching block details.
     *
     * @param blockHeight - The block height
     * @returns The block hash
     */
    private async getBlockHashFromHeight(blockHeight: number): Promise<string> {
        // Fetch block details by height
        const blockDetails = await this.fetchFromBlockfrost<BlockDetailsType>(
            `blocks/${blockHeight}`
        );
        const typed = BlockDetailsFactory(blockDetails);
        if (typed instanceof ArkErrors) {
            return typed.throw();
        }

        // Store the block for future reference
        await this.store.saveBlock(typed);

        return typed.hash;
    }

    /**
     * Converts a Value to Blockfrost amount format.
     *
     * @param value - The Value to convert
     * @returns Array of {unit: string, quantity: string} objects
     */
    private convertValueToBlockfrostAmount(
        value: any
    ): Array<{ unit: string; quantity: string | number }> {
        const amount: Array<{ unit: string; quantity: string | number }> = [];

        // Add lovelace
        if (value.lovelace > 0n) {
            amount.push({
                unit: "lovelace",
                quantity: value.lovelace.toString(),
            });
        }

        // Add assets
        if (value.assets && value.assets.assets) {
            for (const [policyId, tokenEntries] of value.assets.assets) {
                const policyIdHex = policyId.toHex();

                for (const [tokenNameBytes, quantity] of tokenEntries) {
                    const tokenNameHex = Array.isArray(tokenNameBytes)
                        ? bytesToHex(tokenNameBytes)
                        : bytesToHex([tokenNameBytes]);

                    amount.push({
                        unit: `${policyIdHex}${tokenNameHex}`,
                        quantity: quantity.toString(),
                    });
                }
            }
        }

        return amount;
    }

    /**
     * Indexes delegate UUTs (Unique Unit Tokens) mentioned in the charter.
     * Fetches the most recent UTXO for each delegate UUT asset class.
     */
    private async indexDelegateUuts(charterData: CharterData): Promise<void> {
        await this.store.log("z5h89", `Indexing delegate UUTs`);
        const mph = this.capo.mph;

        // Get mint delegate UUT from charter link
        try {
            const mintDelegateLink = charterData.mintDelegateLink;
            if (mintDelegateLink?.uutName) {
                const uutAssetClass = makeAssetClass(
                    mph,
                    mintDelegateLink.uutName
                );
                await this.store.log(
                    "ht8mg",
                    `Fetching mint delegate UUT: ${mintDelegateLink.uutName}`
                );
                await this.fetchAndIndexUut(uutAssetClass, mintDelegateLink);
            }
        } catch (e) {
            // Delegate may not exist yet
            console.warn("Could not resolve mint delegate UUT:", e);
        }

        // Get spend delegate UUT from charter link
        try {
            const spendDelegateLink = charterData.spendDelegateLink;
            if (spendDelegateLink?.uutName) {
                const uutAssetClass = makeAssetClass(
                    mph,
                    spendDelegateLink.uutName
                );
                await this.store.log(
                    "fgmtv",
                    `Fetching spend delegate UUT: ${spendDelegateLink.uutName}`
                );
                await this.fetchAndIndexUut(uutAssetClass, spendDelegateLink);
            }
        } catch (e) {
            // Delegate may not exist yet
            console.warn("Could not resolve spend delegate UUT:", e);
        }

        // Get gov authority UUT from charter link
        try {
            const govAuthorityLink = charterData.govAuthorityLink;
            if (govAuthorityLink?.uutName) {
                const uutAssetClass = makeAssetClass(
                    mph,
                    govAuthorityLink.uutName
                );
                await this.store.log(
                    "g8xpk",
                    `Fetching gov authority UUT: ${govAuthorityLink.uutName}`
                );
                await this.fetchAndIndexUut(uutAssetClass, govAuthorityLink);
            }
        } catch (e) {
            // Delegate may not exist yet
            console.warn("Could not resolve gov authority UUT:", e);
        }

        // Get spend invariant UUTs from charter
        if (charterData.spendInvariants) {
            for (let i = 0; i < charterData.spendInvariants.length; i++) {
                try {
                    const invariantLink = charterData.spendInvariants[i];
                    if (invariantLink?.uutName) {
                        const uutAssetClass = makeAssetClass(
                            mph,
                            invariantLink.uutName
                        );
                        await this.store.log(
                            "sp9iv",
                            `Fetching spend invariant[${i}] UUT: ${invariantLink.uutName}`
                        );
                        await this.fetchAndIndexUut(uutAssetClass, invariantLink);
                    }
                } catch (e) {
                    console.warn(`Could not resolve spend invariant[${i}] UUT:`, e);
                }
            }
        }

        // Get mint invariant UUTs from charter
        if (charterData.mintInvariants) {
            for (let i = 0; i < charterData.mintInvariants.length; i++) {
                try {
                    const invariantLink = charterData.mintInvariants[i];
                    if (invariantLink?.uutName) {
                        const uutAssetClass = makeAssetClass(
                            mph,
                            invariantLink.uutName
                        );
                        await this.store.log(
                            "mt7iv",
                            `Fetching mint invariant[${i}] UUT: ${invariantLink.uutName}`
                        );
                        await this.fetchAndIndexUut(uutAssetClass, invariantLink);
                    }
                } catch (e) {
                    console.warn(`Could not resolve mint invariant[${i}] UUT:`, e);
                }
            }
        }

        // Get other named delegate UUTs from charter
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
                        const link = delegateLink as RelativeDelegateLink;
                        const uutAssetClass = makeAssetClass(mph, link.uutName);
                        await this.store.log(
                            "nd8uu",
                            `Fetching named delegate '${delegateName}' UUT: ${link.uutName}`
                        );
                        await this.fetchAndIndexUut(uutAssetClass, link);
                    }
                } catch (e) {
                    console.warn(
                        `Could not resolve named delegate '${delegateName}' UUT:`,
                        e
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
                    `${entryName} is a ${actualType}, not a DgDataPolicy; skipping`
                );
                continue;
            }
            try {
                const controller = await this.capo.getDgDataController(
                    entryName,
                    {
                        charterData,
                        optional: true,
                    }
                );
                const { policyLink } = DgDataPolicy;
                const uutName = policyLink.uutName;
                const uutAssetClass = makeAssetClass(mph, uutName);
                await this.store.log(
                    "c6awj",
                    `Fetching dgData controller UUT: ${uutName}`
                );
                await this.fetchAndIndexUut(uutAssetClass, policyLink);
            } catch (e) {
                // Controller may not exist yet
                console.warn(
                    `Could not resolve dgData controller ${entryName}:`,
                    e
                );
            }
        }
    }

    /**
     * Fetches the most recent UTXO for a given UUT asset class and stores it.
     * Uses Blockfrost API: GET /addresses/{address}/utxos/{asset} with count=1 and order=desc
     */
    private async fetchAndIndexUut(
        assetClass: any,
        delegateLink: RelativeDelegateLink
    ): Promise<void> {
        // Convert asset class to Blockfrost format (policyId + assetName)
        const policyId = assetClass.mph.hex;
        const assetName = assetClass.tokenName.hex;
        const asset = `${policyId}${assetName}`;

        // For now, we need the delegate address to fetch the UUT
        // The delegate address can be derived from delegateValidatorHash if available
        // This is a placeholder - full implementation would:
        // 1. Get delegate address from delegateLink.delegateValidatorHash
        // 2. Use Blockfrost API: addresses/{address}/utxos/{asset}?count=1&order=desc
        // 3. Store the resulting UTXO in the index

        console.log(
            `TODO: Fetch UUT for asset ${asset} - need delegate address from charter`
        );
    }

    async fetchFromBlockfrost<T>(url: string): Promise<T> {
        return fetch(`${this.blockfrostBaseUrl}/api/v0/${url}`, {
            headers: {
                project_id: this.blockfrostKey,
            },
        }).then(async (res) => {
            const result = await res.json();
            if (!res.ok) {
                await this.store.log("3ecxh", `Error fetching from blockfrost: ${url} ${result.message}`);
                throw new Error(result.message);
            }
            await this.store.log("rm7g8", `Successfully fetched from blockfrost: ${url} ${JSON.stringify(result)}`);
            return result as T;
        });
    }

    // can locate the height of a block by its block-id, either from the local index,
    // or by fetching it from blockfrost
    async findOrFetchBlockHeight(blockId: string): Promise<number> {
        const block = await this.store.findBlockByBlockId(blockId);
        if (block) {
            return block.height;
        }

        const details = await this.fetchBlockDetails(blockId);
        await this.store.saveBlock(details);

        return details?.height ?? 0;
    }

    /** Fetches the details of a block from blockfrost
     *
     * uses https://docs.blockfrost.io/#tag/cardano--blocks/get/blocks/{hash_or_number}
     * to resolve and store the details of each block (see response schema below)
     */
    async fetchBlockDetails(blockId: string): Promise<BlockDetailsType> {
        await this.store.log("78q9n", `Fetching block details for ${blockId} from blockfrost`);
        const untyped = await this.fetchFromBlockfrost(`blocks/${blockId}`);
        const typed = BlockDetailsFactory(untyped);
        if (typed instanceof ArkErrors) {
            return typed.throw();
        }
        return typed;
    }

    /**
     * Fetches and stores the latest block details from Blockfrost.
     *
     * Uses https://docs.blockfrost.io/#tag/cardano--blocks/get/blocks/latest
     * to get the latest block and store it in the index.
     * Updates lastBlockId and lastBlockHeight with the latest block information.
     */
    async fetchAndStoreLatestBlock(): Promise<BlockDetailsType> {
        await this.store.log("x2xzt", `Fetching latest block from blockfrost`);
        const untyped = await this.fetchFromBlockfrost(`blocks/latest`);
        const typed = BlockDetailsFactory(untyped);
        if (typed instanceof ArkErrors) {
            return typed.throw();
        }
        await this.store.log("8y2yn", `latest block from blockfrost: #${typed.height} ${typed.hash}`);
        // Store the latest block in the index
        await this.store.saveBlock(typed);

        // Update lastBlockId and lastBlockHeight
        if (typed.height > this.lastBlockHeight) {
            await this.store.log("2k3uq", `new latest block: #${typed.height} ${typed.hash}`);
            this.lastBlockHeight = typed.height;
            this.lastBlockId = typed.hash;
        }

        return typed;
    }

    async findOrFetchTxDetails(txId: string): Promise<Tx> {
        const txCbor = await this.store.findTxById(txId);

        if (txCbor) {
            return decodeTx(txCbor.cbor);
        }
        await this.store.log("qwmrh", `Fetching tx details for ${txId} from blockfrost`);
        const { cbor: cborHex } = await this.fetchFromBlockfrost<{
            cbor: string;
        }>(`txs/${txId}/cbor`);
        await this.store.saveTx({ txid: txId, cbor: cborHex });

        const decodedTx = decodeTx(cborHex);
        return decodedTx;
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
    private utxoId(txHash: string, outputIndex: number): string {
        return `${txHash}#${outputIndex}`;
    }

    /** Fetches UTXOs from an address with pagination support.
     *
     * Uses a growth factor of ~1.6 for page sizes (20, 32, 51, 81, 100, ...)
     * Stops when a page returns no new UTXOs or runs out of UTXOs.
     * Updates lastBlockId and lastBlockHeight based on fetched UTXOs.
     *
     * @param address - The Cardano address to fetch UTXOs from
     * @returns Array of fetched UTXO details
     */
    async fetchUtxosFromAddress(address: string): Promise<UtxoDetailsType[]> {
        const fetchedUtxos: UtxoDetailsType[] = [];
        const seenUtxoIds = new Set<string>();
        const seenBlockIds = new Set<string>();
        let page = 1;
        let pageSize = capoUpdaterPageSize;
        const maxPageSize = 100;
        const growthFactor = 1.6;

        throw new Error("unused?");
        while (true) {
            const url = `addresses/${address}/utxos?page=${page}&count=${pageSize}&order=desc`;
            const untyped = await this.fetchFromBlockfrost<unknown[]>(url);

            if (!Array.isArray(untyped) || untyped.length === 0) {
                // No more UTXOs to fetch
                break;
            }

            // Validate and process each UTXO
            let newUtxosInPage = 0;
            for (const item of untyped) {
                const validationResult = UtxoDetailsFactory(item);
                if (validationResult instanceof ArkErrors) {
                    console.error(
                        `Error while fetching utxos from address ${address}:`,
                        validationResult.toString()
                    );
                    throw new Error("Validation error fetching UTXOs");
                }
                const typed = validationResult as UtxoDetailsType;

                const utxoId = this.utxoId(typed.tx_hash, typed.output_index);
                if (!seenUtxoIds.has(utxoId)) {
                    seenUtxoIds.add(utxoId);
                    fetchedUtxos.push(typed);
                    newUtxosInPage++;

                    // Store the UTXO (with utxoId added for Dexie)
                    const utxoWithId = {
                        ...typed,
                        utxoId,
                    };
                    await this.store.saveUtxo(utxoWithId);

                    // Update lastBlockId and lastBlockHeight (only fetch height once per block)
                    if (typed.block && !seenBlockIds.has(typed.block)) {
                        seenBlockIds.add(typed.block);
                        const blockHeight = await this.findOrFetchBlockHeight(
                            typed.block
                        );
                        if (blockHeight > this.lastBlockHeight) {
                            this.lastBlockHeight = blockHeight;
                            this.lastBlockId = typed.block;
                        }
                    }
                }
            }

            // If no new UTXOs were found in this page, we're done
            if (newUtxosInPage === 0) {
                break;
            }

            // Prepare for next page with growth factor
            page++;
            pageSize = Math.min(
                Math.floor(pageSize * growthFactor),
                maxPageSize
            );
        }

        return fetchedUtxos;
    }
}

// When a new utxo of any specific data-type is found at the capo address,
// the index is updated to include the new utxo.
//
// Additionally, the related transaction is fetched, with fetchTxDetails(),
// and any of the delegate UUTs are freshened so they point to the
// most recent utxo having that asset-id.
//

// indexes utxos in the capo address, by type
// indexes utxos in the capo address, by id

// periodically queries for new utxos at the capo address
const refreshInterval = 60 * 1000; // 1 minute
const delegateRefreshInterval = 60 * 60 * 1000; // 1 hour

// remembers the last block-id seen in any capo utxo

// indexes, by UUT asset-id, the utxos and block-ids for each delegate mentioned in the charter:
//  - mint delegate
//  - spend delegate
//  - gov authority
//  - other named delegates
//  - spend invariants
//  - mint invariants
//  - gov invariants
//  - other named invariants
//  - delegated-data types

// uses https://docs.blockfrost.io/#tag/cardano--addresses/get/addresses/{address}/utxos/{asset}
// with count=1 and order=desc to get utxo-ids and block-ids for each UUT asset-id (see response  schema below)

// periodically traverses the most-current charter data and updates
// the index

// provides a way to find utxos by type or id
// provides a way to find utxos by delegate
