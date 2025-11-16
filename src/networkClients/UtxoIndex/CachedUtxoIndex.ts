/** The DexieCachedUtxoIndex indexes all the utxos that are
 * needed for interacting with a specific Capo.  This includes
 * the charter token, the delegate UUTs seen in the charter,
 * and all the delegated-data records stored in the capo address.
 *
 * The delegate UUTs are stored at other addresses, but their
 * asset-ids always use the capo minter's policy-id; their asset 
 * names and related script addresses are found in the charter data.
 * */

import {type, scope, } from "arktype";
import {jsonSchemaToType} from "@ark/json-schema";
import { decodeTx, type Tx } from "@helios-lang/ledger";
import { DexieUtxoStore } from "./DexieUtxoStore";
import type { UtxoStoreGeneric } from "./UtxoStoreGeneric";
import type { dexieBlockDetails } from "./dexieRecords/BlockDetails";
import type { BlockDetailsType } from "./blockfrostTypes/BlockDetails";

// uses a specific base page size for fetching capo utxos
const capoUpdaterPageSize = 20;



class CachedUtxoIndex {
    blockfrostKey: string;
    blockfrostBaseUrl: string = "https://cardano-mainnet.blockfrost.io";
    // remembers the last block-id and height seen in any capo utxo
    lastBlockId: string;
    lastBlockHeight: number;
    store: UtxoStoreGeneric;
    
    constructor({
        blockfrostKey,
        storeIn: strategy = "dexie"
    }: {
        blockfrostKey: string, 
        storeIn?: "dexie" | "memory" | "dred"
    }) {
        this.blockfrostKey = blockfrostKey
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
    }

    async fetchFromBlockfrost<T>(url: string): Promise<T> {
        return fetch(`${this.blockfrostBaseUrl}/api/v0/${url}`, {
            headers: {
              project_id: this.blockfrostKey
            }
          })
          .then(async res => {
            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.message)
            }
            return result as T;
        })
    }

    // can locate the height of a block by its block-id, either from the local index, or by fetching it from blockfrost
    async findOrFetchBlockHeight(blockId: string): Promise<number> {
        const block = await this.store.findBlockByBlockId(blockId);
        if (block) {
            return block.height;
        }

        const details = await this.fetchBlockDetails(blockId);
        return details?.height ?? 0;
    }

    /** Fetches the details of a block from blockfrost 
     * 
    * uses https://docs.blockfrost.io/#tag/cardano--blocks/get/blocks/{hash_or_number}
    * to resolve and store the details of each block (see response schema below)
    */
    async fetchBlockDetails(blockId: string): Promise<BlockDetailsType> {
        return this.fetchFromBlockfrost<BlockDetailsType>(`blocks/${blockId}`);
    }

    async fetchTxDetails(txId: string): Promise<Tx> {
        const {cbor: cborHex} = await this.fetchFromBlockfrost<{cbor: string}>(`txs/${txId}/cbor`);

        return decodeTx(cborHex)
    }
}

// fetches additional pages with a ~1.6 growth factor (max=100) until it finds a page with no new utxos
// or runs out of utxos at the address.

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
// provides a way to find utxos by invariant    
// provides a way to find utxos by delegate




