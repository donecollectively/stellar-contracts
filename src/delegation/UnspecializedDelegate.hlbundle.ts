import type { UplcData } from "@helios-lang/uplc";
import type {
    Address,
    AssetClass,
    DatumHash,
    MintingPolicyHash,
    PubKey,
    PubKeyHash,
    ScriptHash,
    SpendingCredential,
    StakingCredential,
    StakingHash,
    StakingValidatorHash,
    TimeRange,
    TxId,
    TxInput,
    TxOutput,
    TxOutputId,
    TxOutputDatum,
    ValidatorHash,
    Value,
} from "@helios-lang/ledger";
import type { Cast } from "@helios-lang/contract-utils";

import UnspecializedMintDelegate from "../delegation/UnspecializedDelegate.hl"
import { CapoDelegateBundle } from "./CapoDelegateBundle.js"
import type { EnumTypeMeta, HeliosScriptBundle, makesUplcActivityEnumData, singleEnumVariantMeta, tagOnly } from "../helios/HeliosScriptBundle.js";
import type { 
    IntLike,
    ByteArrayLike,
 } from "@helios-lang/codec-utils";


export default class UnspecializedDgtBundle extends CapoDelegateBundle {
    scriptName : string = "UnspecializedDelegate";
    get bridgeClassName(): string {
        return "UnspecializedDelegateBridge";
    }
    
    get specializedDelegateModule() {
        return UnspecializedMintDelegate
    }
}

