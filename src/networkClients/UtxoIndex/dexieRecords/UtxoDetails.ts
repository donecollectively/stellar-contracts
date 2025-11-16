import { Entity } from "dexie";
import type { DexieUtxoStore } from "../DexieUtxoStore.js";
import { scope } from "arktype";
import { jsonSchemaToType } from "@ark/json-schema";

export class dexieUtxoDetails extends Entity<DexieUtxoStore> implements UtxoDetailType {
    address!: UtxoDetails['address'];
    tx_hash!: UtxoDetailType['tx_hash'];
    tx_index!: UtxoDetailType['tx_index'];
    output_index!: UtxoDetailType['output_index'];
    amount!: UtxoDetailType['amount'];
    block!: UtxoDetailType['block'];
    data_hash!: UtxoDetailType['data_hash'];
    inline_datum!: UtxoDetailType['inline_datum'];
    reference_script_hash!: UtxoDetailType['reference_script_hash'];
    
}

