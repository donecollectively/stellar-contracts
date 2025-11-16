import { Entity } from "dexie";
import type { DexieUtxoStore } from "../DexieUtxoStore.js";
import { type } from "arktype";
import { jsonSchemaToType } from "@ark/json-schema";
import type { BlockDetailsType } from "../blockfrostTypes/BlockDetails.js";

export class dexieBlockDetails
    extends Entity<DexieUtxoStore>
    implements BlockDetailsType
{
    time!: BlockDetailsType["time"];
    height!: BlockDetailsType["height"];
    hash!: BlockDetailsType["hash"];
    slot!: BlockDetailsType["slot"];
    epoch!: BlockDetailsType["epoch"];
    epoch_slot!: BlockDetailsType["epoch_slot"];
    slot_leader!: BlockDetailsType["slot_leader"];
    size!: BlockDetailsType["size"];
    tx_count!: BlockDetailsType["tx_count"];
    output!: BlockDetailsType["output"];
    fees!: BlockDetailsType["fees"];
    block_vrf!: BlockDetailsType["block_vrf"];
    op_cert!: BlockDetailsType["op_cert"];
    op_cert_counter!: BlockDetailsType["op_cert_counter"];
    previous_block!: BlockDetailsType["previous_block"];
    next_block!: BlockDetailsType["next_block"];
    confirmations!: BlockDetailsType["confirmations"];

    get blockId() {
        return this.hash;
    }
    get blockHeight() {
        return this.height;
    }
}
