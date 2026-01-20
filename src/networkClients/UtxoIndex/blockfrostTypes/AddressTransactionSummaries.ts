// ArkType removed from critical path - using manual interface only

// Manually defined type for Blockfrost address transaction summary response
export interface AddressTransactionSummariesType {
    tx_hash: string;
    tx_index: number;
    block_height: number;
    block_time: number;
}

/* COMMENTED OUT - ArkType validators removed from critical path
import { type } from "arktype";

export const AddressTransactionSummariesFactory = type({
    tx_hash: "string",
    tx_index: "number",
    block_height: "number",
    block_time: "number",
});

export type AddressTransactionSummariesType =
    typeof AddressTransactionSummariesFactory.infer;
*/

/* COMMENTED OUT - unused, executes at module load time
const addressTransactionSummariesJsonSchema = jsonSchemaToType({
    type: "array",
    items: {
        type: "object",
        properties: {
            tx_hash: {
                type: "string",
                description: "Hash of the transaction",
            },
            tx_index: {
                type: "integer",
                description: "Transaction index within the block",
            },
            block_height: {
                type: "integer",
                description: "Block height",
            },
            block_time: {
                type: "integer",
                description: "Block creation time in UNIX time",
            },
        },
        required: ["tx_hash", "tx_index", "block_height", "block_time"],
    },
    examples: [
        [
            {
                tx_hash:
                    "8788591983aa73981fc92d6cddbbe643959f5a784e84b8bee0db15823f575a5b",
                tx_index: 6,
                block_height: 69,
                block_time: 1635505891,
            },
            {
                tx_hash:
                    "52e748c4dec58b687b90b0b40d383b9fe1f24c1a833b7395cdf07dd67859f46f",
                tx_index: 9,
                block_height: 4547,
                block_time: 1635505987,
            },
            {
                tx_hash:
                    "e8073fd5318ff43eca18a852527166aa8008bee9ee9e891f585612b7e4ba700b",
                tx_index: 0,
                block_height: 564654,
                block_time: 1834505492,
            },
        ],
    ],
});
*/
