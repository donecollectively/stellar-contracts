import { jsonSchemaToType } from "@ark/json-schema";
import { type } from "arktype";

// schema for response from https://docs.blockfrost.io/#tag/cardano--blocks/get/blocks/{hash_or_number}
// Note: Several fields can be null for genesis block or latest block
export const BlockDetailsFactory = type({
    time: "number",
    height: "number | null",
    hash: "string",
    slot: "number | null",
    epoch: "number | null",
    epoch_slot: "number | null",
    slot_leader: "string",
    size: "number",
    tx_count: "number",
    output: "string | null",
    fees: "string | null",
    block_vrf: "string | null",
    op_cert: "string | null",
    op_cert_counter: "string | null",
    previous_block: "string | null",
    next_block: "string | null",
    confirmations: "number",
})
export type BlockDetailsType = typeof BlockDetailsFactory.infer

// manually defined above; can convert to json-schema if/when it gives us TYPES,
// and not only validation functions:
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

