/** hlbundle imports */
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

import { HeliosScriptBundle, type EnumType, type mkEnum, type singleEnumVariant } from "../helios/HeliosScriptBundle.js";
import CapoMinter from "./CapoMinter.hl";
import { CapoHeliosBundle } from "../CapoHeliosBundle.js";
import { CapoDelegateBundle } from "../delegation/CapoDelegateBundle.js";

/** ------------ BEGIN hlbundle types ------------ */
export type MinterActivity = EnumType<{module: "CapoMintHelpers", enumName: "MinterActivity"}, {
    mintingCharter: singleEnumVariant<MinterActivity, "mintingCharter",
        "Constr#0", "singletonField", 
        Address
    >,
    mintWithDelegateAuthorizing: singleEnumVariant<MinterActivity, "mintWithDelegateAuthorizing",
        "Constr#1", "tagOnly", never
    >,
    addingMintInvariant: singleEnumVariant<MinterActivity, "addingMintInvariant",
        "Constr#2", "singletonField", 
        TxOutputId
    >,
    addingSpendInvariant: singleEnumVariant<MinterActivity, "addingSpendInvariant",
        "Constr#3", "singletonField", 
        TxOutputId
    >,
    ForcingNewMintDelegate: singleEnumVariant<MinterActivity, "ForcingNewMintDelegate",
        "Constr#4", "singletonField", 
        TxOutputId
    >,
    CreatingNewSpendDelegate: singleEnumVariant<MinterActivity, "CreatingNewSpendDelegate",
        "Constr#5", 
        "fields", {
            seed: TxOutputId,
            replacingUut: Option<number[]>
        }
    >
}
>;

export type MinterActivityLike = EnumType<{module: "CapoMintHelpers", enumName: "MinterActivity"}, {
    mintingCharter: singleEnumVariant<MinterActivity, "mintingCharter",
        "Constr#0", "singletonField", 
        Address | string
    >,
    mintWithDelegateAuthorizing: singleEnumVariant<MinterActivity, "mintWithDelegateAuthorizing",
        "Constr#1", "tagOnly", never
    >,
    addingMintInvariant: singleEnumVariant<MinterActivity, "addingMintInvariant",
        "Constr#2", "singletonField", 
        TxOutputId | string
    >,
    addingSpendInvariant: singleEnumVariant<MinterActivity, "addingSpendInvariant",
        "Constr#3", "singletonField", 
        TxOutputId | string
    >,
    ForcingNewMintDelegate: singleEnumVariant<MinterActivity, "ForcingNewMintDelegate",
        "Constr#4", "singletonField", 
        TxOutputId | string
    >,
    CreatingNewSpendDelegate: singleEnumVariant<MinterActivity, "CreatingNewSpendDelegate",
        "Constr#5", 
        "fields", {
            seed: TxOutputId | string,
            replacingUut: Option<number[]>
        }
    >
}
>;
/** ------------- hlbundle types END ------------- */

/**
 * for the special Capo minter; makes the Capo's modules available
 *  to the minter for imports
 **/
export default class CapoMinterBundle extends HeliosScriptBundle {
    capoBundle: CapoHeliosBundle;
    // no datum types in this script
    declare Activity: mkEnum<MinterActivityLike>;

    constructor(capoBundle : CapoHeliosBundle) {
        super();
        this.capoBundle = capoBundle;
    }

    get main() {
        return CapoMinter
    }

    get modules() {
        return [...this.capoBundle.modules];
    }

}
