

// schema for response from https://docs.blockfrost.io/#tag/cardano--addresses/get/addresses/{address}/utxos/{asset}
// also used for responses from https://docs.blockfrost.io/#tag/cardano--addresses/get/addresses/{address}/utxos

// ArkType removed from critical path - using manual interface only

// Manually defined type for Blockfrost UTXO response
export interface UtxoDetailsType {
    address: string;
    tx_hash: string;
    tx_index: number;
    output_index: number;
    amount: Array<{ unit: string; quantity: number }>;
    block: string;
    data_hash: string | null;
    inline_datum: string | null;
    reference_script_hash: string | null;
}

/* COMMENTED OUT - ArkType validators removed from critical path
import { type } from "arktype";

const ValueType = type({
    unit: "string",
    quantity: "string.numeric.parse",
});

const UtxoDetailsValidator = type({
    address: "string",
    tx_hash: "string",
    tx_index: "number",
    output_index: "number",
    amount: ValueType.array(),
    block: "string",
    data_hash: "string | null",
    inline_datum: "string | null",
    reference_script_hash: "string | null",
});

export function validateUtxoDetails(data: unknown): UtxoDetailsType {
    const result = UtxoDetailsValidator(data);
    if (result instanceof type.errors) {
        throw new Error(`Invalid UtxoDetails: ${result.summary}`);
    }
    return result as UtxoDetailsType;
}
*/

 // ^ manually defined above; can convert to json-schema if/when it gives us TYPES,
 // and not only validation functions:
/* COMMENTED OUT - unused, executes at module load time
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
*/
//   type AssetUtxosAtAddress = typeof assetUtxosAtAddressSchema.infer
