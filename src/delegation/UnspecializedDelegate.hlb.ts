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

import UnspecializedDelegateScript from "../delegation/UnspecializedDelegate.hl";
import { CapoDelegateBundle } from "./CapoDelegateBundle.js";
import { CapoHeliosBundle } from "../CapoHeliosBundle.js";

/**
 * @public
 */
/* prettier-ignore */
export class UnspecializedDgtBundle 
extends CapoDelegateBundle.usingCapoBundleClass( CapoHeliosBundle ) {
    specializedDelegateModule = UnspecializedDelegateScript;
    get rev() {
        return 1n
    }

    get moduleName() {
        return "UnspecializedDelegate";
    }

    get bridgeClassName(): string {
        return "UnspecializedDelegateBridge";
    }

}

export default UnspecializedDgtBundle;
