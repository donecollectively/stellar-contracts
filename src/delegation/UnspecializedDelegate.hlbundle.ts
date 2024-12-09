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

import UnspecializedDelegateScript from "../delegation/UnspecializedDelegate.hl"
import { CapoDelegateBundle } from "./CapoDelegateBundle.js"
import { CapoHeliosBundle } from "../CapoHeliosBundle.js";


export default class UnspecializedDgtBundle extends CapoDelegateBundle.using(CapoHeliosBundle) {
    get moduleName() { return "UnspecializedDelegate" };
    get bridgeClassName(): string {
        return "UnspecializedDelegateBridge";
    }
    
    get specializedDelegateModule() {
        return UnspecializedDelegateScript
    }
}

