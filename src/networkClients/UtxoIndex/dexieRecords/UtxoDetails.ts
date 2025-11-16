import { Entity } from "dexie";
import type { DexieUtxoStore } from "../DexieUtxoStore.js";
import { scope } from "arktype";
import { jsonSchemaToType } from "@ark/json-schema";
import type { UtxoDetailsType } from "../blockfrostTypes/UtxoDetails.js";

export class dexieUtxoDetails
    extends Entity<DexieUtxoStore>
    implements UtxoDetailsType
{
    utxoId!: string;
    
    address!: UtxoDetailsType["address"];
    tx_hash!: UtxoDetailsType["tx_hash"];
    tx_index!: UtxoDetailsType["tx_index"];
    output_index!: UtxoDetailsType["output_index"];
    amount!: UtxoDetailsType["amount"];
    block!: UtxoDetailsType["block"];
    data_hash!: UtxoDetailsType["data_hash"];
    inline_datum!: UtxoDetailsType["inline_datum"];
    reference_script_hash!: UtxoDetailsType["reference_script_hash"];
}
