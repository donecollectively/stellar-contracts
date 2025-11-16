/** The DexieCachedUtxoIndex indexes all the utxos that are
 * needed for interacting with a specific Capo.  This includes
 * the charter token, the delegate UUTs seen in the charter,
 * and all the delegated-data records stored in the capo address.
 *
 * The delegate UUTs are stored at other addresses, but their
 * asset-ids always use the capo minter's policy-id; their asset
 * names and related script addresses are found in the charter data.
 * */

import {ArkErrors } from "arktype";
import { decodeTx, makeAssetClass, type Tx } from "@helios-lang/ledger";
import { DexieUtxoStore } from "./DexieUtxoStore";
import type { UtxoStoreGeneric } from "./UtxoStoreGeneric";

import {
    BlockDetailsFactory,
    type BlockDetailsType,
} from "./blockfrostTypes/BlockDetails";
import {
    UtxoDetailsFactory,
    type UtxoDetailsType,
} from "./blockfrostTypes/UtxoDetails";
import type { Capo } from "../../Capo";
import { makeBlockfrostV0Client, type CardanoClient } from "@helios-lang/tx-utils";
// uses a specific base page size for fetching capo utxos
const capoUpdaterPageSize = 20;

export class CachedUtxoIndex {
    blockfrostKey: string;
    blockfrostBaseUrl: string = "https://cardano-mainnet.blockfrost.io";
    // remembers the last block-id and height seen in any capo utxo
    lastBlockId: string;
    lastBlockHeight: number;
    store: UtxoStoreGeneric;
    capo: Capo<any,any>;

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
        capo: Capo<any,any>;
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
        this.syncNow()
    }

    async syncNow() {
        // Fetch all UTXOs from the capo address using the Capo's findCapoUtxos() method
        const capoUtxos = await this.capo.findCapoUtxos();

        // Extract unique transaction IDs from the UTXOs and fetch/store transaction details
        // TxInput.id is in format "txHash#index", so we extract the tx hash part
        const uniqueTxIds = new Set(
            capoUtxos.map(utxo => {
                const id = utxo.id.toString();
                return id.split('#')[0]; // Extract tx hash from "txHash#index" format
            })
        );
        for (const txId of uniqueTxIds) {
            const t = await this.findOrFetchTxDetails(txId);

        }

        // Find the charter UTXO
        const charterUtxo = await this.capo.mustFindCharterUtxo(capoUtxos);

        // Get charter data to resolve delegates
        const charterData = await this.capo.findCharterData(charterUtxo, {
            optional: false,
            capoUtxos: capoUtxos
        });

        // Resolve and index delegate UUTs
        await this.indexDelegateUuts(charterData);
    }

    /** 
     * Indexes delegate UUTs (Unique Unit Tokens) mentioned in the charter.
     * Fetches the most recent UTXO for each delegate UUT asset class.
     */
    private async indexDelegateUuts(charterData: any): Promise<void> {
        const mph = this.capo.mph;

        // Get mint delegate UUT from charter link
        try {
            const mintDelegateLink = charterData.mintDelegateLink;
            if (mintDelegateLink?.uutName) {
                const uutAssetClass = makeAssetClass(mph, mintDelegateLink.uutName);
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
                const uutAssetClass = makeAssetClass(mph, spendDelegateLink.uutName);
                await this.fetchAndIndexUut(uutAssetClass, spendDelegateLink);
            }
        } catch (e) {
            // Delegate may not exist yet
            console.warn("Could not resolve spend delegate UUT:", e);
        }

        // Get dgData controller UUTs from manifest
        for (const [entryName, entryInfo] of charterData.manifest.entries()) {
            if (entryInfo.entryType.DgDataPolicy) {
                try {
                    const controller = await this.capo.getDgDataController(entryName, {
                        charterData,
                        optional: true
                    });
                    // The controller's UUT name would be in the manifest entry
                    // For now, we'll skip this as it requires more investigation
                    // TODO: Extract UUT name from manifest entry for dgData controllers
                } catch (e) {
                    // Controller may not exist yet
                    console.warn(`Could not resolve dgData controller ${entryName}:`, e);
                }
            }
        }
    }

    /**
     * Fetches the most recent UTXO for a given UUT asset class and stores it.
     * Uses Blockfrost API: GET /addresses/{address}/utxos/{asset} with count=1 and order=desc
     */
    private async fetchAndIndexUut(assetClass: any, delegateLink?: any): Promise<void> {
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
        
        console.log(`TODO: Fetch UUT for asset ${asset} - need delegate address from charter`);
    }

    async fetchFromBlockfrost<T>(url: string): Promise<T> {
        return fetch(`${this.blockfrostBaseUrl}/api/v0/${url}`, {
            headers: {
                project_id: this.blockfrostKey,
            },
        }).then(async (res) => {
            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.message);
            }
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
        const untyped = await this.fetchFromBlockfrost(`blocks/${blockId}`);
        const typed = BlockDetailsFactory(untyped);
        if (typed instanceof ArkErrors) {
            return typed.throw();
        }
        return typed;
    }

    async findOrFetchTxDetails(txId: string): Promise<Tx> {
        const txCbor = await this.store.findTxById(txId);

        if (txCbor) {
            return decodeTx(txCbor.cbor);
        }
        const { cbor: cborHex } = await this.fetchFromBlockfrost<{
            cbor: string;
        }>(`txs/${txId}/cbor`);
        await this.store.saveTx({ txid: txId, cbor: cborHex });

        const decodedTx = decodeTx(cborHex);
        return decodedTx;
    }

    async fetchTxDetails(txId: string): Promise<Tx> {
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
                    console.error(`Error while fetching utxos from address ${address}:`);
                    validationResult.throw();
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
                    }
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
