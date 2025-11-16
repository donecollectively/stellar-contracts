/** The DexieCachedUtxoIndex indexes all the utxos that are
 * needed for interacting with a specific Capo.  This includes
 * the charter token, the delegate UUTs seen in the charter,
 * and all the delegated-data records stored in the capo address.
 *
 * The delegate UUTs are stored at other addresses, but their
 * asset-ids always use the capo minter's policy-id; their asset 
 * names and related script addresses are found in the charter data.
 * */

import Dexie, { type EntityTable } from "dexie";

import {type, scope, } from "arktype";
import {jsonSchemaToType} from "@ark/json-schema";
import { decodeTx, type Tx } from "@helios-lang/ledger";

// uses a specific base page size for fetching capo utxos
const capoUpdaterPageSize = 20;

// defines dexie schema for the index
const db = new Dexie("StellarDappIndex-v0.1")
db.version(1).stores({
    blocks: "blockId, blockHeight",
    utxos: "utxoId, blockId, blockHeight",
});

class CachedUtxoIndex {
    blockfrostKey: string;
    blockfrostBaseUrl: string = "https://cardano-mainnet.blockfrost.io";
    // remembers the last block-id and height seen in any capo utxo
    lastBlockId: string;
    lastBlockHeight: number;

    constructor(blockfrostKey: string) {
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

    }

    async fetchFromBlockfrost<T>(url: string): Promise<T> {
        return fetch(`${this.blockfrostBaseUrl}/api/v0/${url}`, {
            headers: {
              project_id: this.blockfrostKey
            }
          })
          .then(res => {
            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.message)
            }
            return result as T;
        })
    }

    // can locate the height of a block by its block-id, either from the local index, or by fetching it from blockfrost
    async findOrFetchBlockHeight(blockId: string): Promise<number> {
        const block = await db.blocks.where("blockId").equals(blockId).first();
        if (block) {
            return block.height;
        }

        const details = await this.fetchBlockDetails(blockId);
        return block?.height ?? 0;
    }

    /** Fetches the details of a block from blockfrost 
     * 
    * uses https://docs.blockfrost.io/#tag/cardano--blocks/get/blocks/{hash_or_number}
    * to resolve and store the details of each block (see response schema below)
    */
    async fetchBlockDetails(blockId: string): Promise<BlockDetails> {
        return this.fetchFromBlockfrost<BlockDetails>(`blocks/${blockId}`);
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



// schema for response from https://docs.blockfrost.io/#tag/cardano--addresses/get/addresses/{address}/utxos/{asset}
// also used for responses from https://docs.blockfrost.io/#tag/cardano--addresses/get/addresses/{address}/utxos
const utxoDetailSchema = jsonSchemaToType({
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "address": {
          "type": "string",
          "description": "Bech32 encoded addresses - useful when querying by payment_cred",
          "examples": [
            "addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz"
          ]
        },
        "tx_hash": {
          "type": "string",
          "description": "Transaction hash of the UTXO"
        },
        "tx_index": {
          "type": "integer",
          "deprecated": true,
          "description": "UTXO index in the transaction"
        },
        "output_index": {
          "type": "integer",
          "description": "UTXO index in the transaction"
        },
        "amount": {
          "type": "array",
          "items": {
            "type": "object",
            "description": "The sum of all the UTXO per asset",
            "properties": {
              "unit": {
                "type": "string",
                "format": "Lovelace or concatenation of asset policy_id and hex-encoded asset_name",
                "description": "The unit of the value"
              },
              "quantity": {
                "type": "string",
                "description": "The quantity of the unit"
              }
            },
            "required": [
              "unit",
              "quantity"
            ]
          }
        },
        "block": {
          "type": "string",
          "description": "Block hash of the UTXO"
        },
        "data_hash": {
          "type": [
            "string",
            "null"
          ],
          "description": "The hash of the transaction output datum"
        },
        "inline_datum": {
          "type": [
            "string",
            "null"
          ],
          "description": "CBOR encoded inline datum",
          "examples": [
            "19a6aa"
          ]
        },
        "reference_script_hash": {
          "type": [
            "string",
            "null"
          ],
          "description": "The hash of the reference script of the output",
          "examples": [
            "13a3efd825703a352a8f71f4e2758d08c28c564e8dfcce9f77776ad1"
          ]
        }
      },
      "required": [
        "address",
        "tx_hash",
        "tx_index",
        "output_index",
        "amount",
        "block",
        "data_hash",
        "inline_datum",
        "reference_script_hash"
      ]
    },
    "examples": [
      [
        {
          "address": "addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz",
          "tx_hash": "39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58",
          "output_index": 0,
          "amount": [
            {
              "unit": "lovelace",
              "quantity": "42000000"
            }
          ],
          "block": "7eb8e27d18686c7db9a18f8bbcfe34e3fed6e047afaa2d969904d15e934847e6",
          "data_hash": "9e478573ab81ea7a8e31891ce0648b81229f408d596a3483e6f4f9b92d3cf710",
          "inline_datum": null,
          "reference_script_hash": null
        },
        {
          "address": "addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz",
          "tx_hash": "4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49",
          "output_index": 0,
          "amount": [
            {
              "unit": "lovelace",
              "quantity": "729235000"
            }
          ],
          "block": "953f1b80eb7c11a7ffcd67cbd4fde66e824a451aca5a4065725e5174b81685b7",
          "data_hash": null,
          "inline_datum": null,
          "reference_script_hash": null
        },
        {
          "address": "addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz",
          "tx_hash": "768c63e27a1c816a83dc7b07e78af673b2400de8849ea7e7b734ae1333d100d2",
          "output_index": 1,
          "amount": [
            {
              "unit": "lovelace",
              "quantity": "42000000"
            },
            {
              "unit": "b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e",
              "quantity": "12"
            }
          ],
          "block": "5c571f83fe6c784d3fbc223792627ccf0eea96773100f9aedecf8b1eda4544d7",
          "data_hash": null,
          "inline_datum": null,
          "reference_script_hash": null
        }
      ]
    ]
  });
//   type AssetUtxosAtAddress = typeof assetUtxosAtAddressSchema.infer
 const UtxoDetails = scope({ 
    Value: {
        unit: "string",
        quantity: "string.integer",
    },
    Utxo: {
    address: "string",
    tx_hash: "string",
    tx_index: "number",
    output_index: "number",
    amount: "Value[]",
    block: "string",
    data_hash: "string",
 }}).export();

 type UtxoDetail = typeof UtxoDetails.Utxo.infer

  // schema for response from https://docs.blockfrost.io/#tag/cardano--blocks/get/blocks/{hash_or_number}
  const blockSchema = jsonSchemaToType({
    "type": "object",
    "properties": {
      "time": {
        "type": "integer",
        "description": "Block creation time in UNIX time",
        // "examples": [
        //   1641338934
        // ]
      },
      "height": {
        "type": [
          "integer",
          "null"
        ],
        "description": "Block number",
        // "examples": [
        //   15243593
        // ]
      },
      "hash": {
        "type": "string",
        "description": "Hash of the block",
        //  "examples": [
        //   "4ea1ba291e8eef538635a53e59fddba7810d1679631cc3aed7c8e6c4091a516a"
        // ]
      },
      "slot": {
        "type": [
          "integer",
          "null"
        ],
        "description": "Slot number",
        // "examples": [
        //   412162133
        // ]
      },
      "epoch": {
        "type": [
          "integer",
          "null"
        ],
        "description": "Epoch number",
        // "examples": [
        //   425
        // ]
      },
      "epoch_slot": {
        "type": [
          "integer",
          "null"
        ],
        "description": "Slot within the epoch",
        // "examples": [
        //   12
        // ]
      },
      "slot_leader": {
        "type": "string",
        "description": "Bech32 ID of the slot leader or specific block description in case there is no slot leader",
        // "examples": [
        //   "pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2qnikdy"
        // ]
      },
      "size": {
        "type": "integer",
        "description": "Block size in Bytes",
        // "examples": [
        //   3
        // ]
      },
      "tx_count": {
        "type": "integer",
        "description": "Number of transactions in the block",
        // "examples": [
        //   1
        // ]
      },
      "output": {
        "type": [
          "string",
          "null"
        ],
        "description": "Total output within the block in Lovelaces",
        // "examples": [
        //   "128314491794"
        // ]
      },
      "fees": {
        "type": [
          "string",
          "null"
        ],
        "description": "Total fees within the block in Lovelaces",
        // "examples": [
        //   "592661"
        // ]
      },
      "block_vrf": {
        "type": [
          "string",
          "null"
        ],        
        "description": "VRF key of the block",
        // "minLength": 65,
        // "maxLength": 65,
        // "examples": [
        //   "vrf_vk1wf2k6lhujezqcfe00l6zetxpnmh9n6mwhpmhm0dvfh3fxgmdnrfqkms8ty"
        // ]
      },
      "op_cert": {
        "type": [
          "string",
          "null"
        ],
        "description": "The hash of the operational certificate of the block producer",
        // "examples": [
        //   "da905277534faf75dae41732650568af545134ee08a3c0392dbefc8096ae177c"
        // ]
      },
      "op_cert_counter": {
        "type": [
          "string",
          "null"
        ],
        "description": "The value of the counter used to produce the operational certificate",
        // "examples": [
        //   "18"
        // ]
      },
      "previous_block": {
        "type": [
          "string",
          "null"
        ],
        "description": "Hash of the previous block",
        // "examples": [
        //   "43ebccb3ac72c7cebd0d9b755a4b08412c9f5dcb81b8a0ad1e3c197d29d47b05"
        // ]
      },
      "next_block": {
        "type": [
          "string",
          "null"
        ],
        "description": "Hash of the next block",
        // "examples": [
        //   "8367f026cf4b03e116ff8ee5daf149b55ba5a6ec6dec04803b8dc317721d15fa"
        // ]
      },
      "confirmations": {
        "type": "integer",
        "description": "Number of block confirmations",
        // "examples": [
        //   4698
        // ]
      }
    },
    "required": [
      "time",
      "height",
      "hash",
      "slot",
      "epoch",
      "epoch_slot",
      "slot_leader",
      "size",
      "tx_count",
      "output",
      "fees",
      "block_vrf",
      "op_cert",
      "op_cert_counter",
      "previous_block",
      "next_block",
      "confirmations"
    ]
  } as const);
//   type BlockDetails = typeof blockSchema.infer

const BlockDetailsTypeDef = type({
    time: "number",
    height: "number",
    hash: "string",
    slot: "number",
    epoch: "number",
    epoch_slot: "number",
    slot_leader: "string",
    size: "number",
    tx_count: "number",
    output: "string",
    fees: "string",
    block_vrf: "string",
    op_cert: "string",
    op_cert_counter: "string",
    previous_block: "string",
    next_block: "string",
    confirmations: "number",
})
type BlockDetails = typeof BlockDetailsTypeDef.infer
