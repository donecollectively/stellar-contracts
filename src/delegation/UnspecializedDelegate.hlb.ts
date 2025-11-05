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
import type { Source } from "@helios-lang/compiler-utils";

import UnspecializedDelegateScript from "../delegation/UnspecializedDelegate.hl";
import { CapoDelegateBundle } from "../helios/scriptBundling/CapoDelegateBundle.js";
import { CapoHeliosBundle } from "../helios/scriptBundling/CapoHeliosBundle.js";

/**
 * @public
 */
/* prettier-ignore */
export class UnspecializedDgtBundle 
extends CapoDelegateBundle.usingCapoBundleClass( CapoHeliosBundle ) {
    specializedDelegateModule = UnspecializedDelegateScript;
    requiresGovAuthority = true;

    get params() {
        return {
            rev: this.rev,
            delegateName: this.moduleName,
            isMintDelegate: true,
            isSpendDelegate: true,
            isDgDataPolicy: false,
            requiresGovAuthority: this.requiresGovAuthority,
        }
    }

    get moduleName() {
        return "UnspecializedDelegate";
    }

    get bridgeClassName(): string {
        return "UnspecializedDelegateBridge";
    }

}

export default UnspecializedDgtBundle;
