import { CapoHeliosBundle } from "../src/CapoHeliosBundle";
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
import { uplcDataMaker, EnumType, makesUplcActivityEnumData, readsUplcData, singleEnumVariant } from "../src/helios/HeliosScriptBundle";


/** ------------ BEGIN hlbundle types ------------ */
export type CapoActivity = EnumType<{module: "CapoHelpers", enumName: "CapoActivity"}, {
    usingAuthority: singleEnumVariant<CapoActivity, "usingAuthority",
        "Constr#0", "tagOnly", never, "noSpecialFlags"
    >,
    updatingCharter: singleEnumVariant<CapoActivity, "updatingCharter",
        "Constr#1", "tagOnly", never, "noSpecialFlags"
    >,
    retiringRefScript: singleEnumVariant<CapoActivity, "retiringRefScript",
        "Constr#2", "tagOnly", never, "noSpecialFlags"
    >,
    addingSpendInvariant: singleEnumVariant<CapoActivity, "addingSpendInvariant",
        "Constr#3", "tagOnly", never, "noSpecialFlags"
    >,
    spendingDelegatedDatum: singleEnumVariant<CapoActivity, "spendingDelegatedDatum",
        "Constr#4", "tagOnly", never, "noSpecialFlags"
    >,
    updatingTypeMap: singleEnumVariant<CapoActivity, "updatingTypeMap",
        "Constr#5", "tagOnly", never, "noSpecialFlags"
    >
}
>;

export type CapoActivityLike = EnumType<{module: "CapoHelpers", enumName: "CapoActivity"}, {
    usingAuthority: singleEnumVariant<CapoActivity, "usingAuthority",
        "Constr#0", "tagOnly", never, "noSpecialFlags"
    >,
    updatingCharter: singleEnumVariant<CapoActivity, "updatingCharter",
        "Constr#1", "tagOnly", never, "noSpecialFlags"
    >,
    retiringRefScript: singleEnumVariant<CapoActivity, "retiringRefScript",
        "Constr#2", "tagOnly", never, "noSpecialFlags"
    >,
    addingSpendInvariant: singleEnumVariant<CapoActivity, "addingSpendInvariant",
        "Constr#3", "tagOnly", never, "noSpecialFlags"
    >,
    spendingDelegatedDatum: singleEnumVariant<CapoActivity, "spendingDelegatedDatum",
        "Constr#4", "tagOnly", never, "noSpecialFlags"
    >,
    updatingTypeMap: singleEnumVariant<CapoActivity, "updatingTypeMap",
        "Constr#5", "tagOnly", never, "noSpecialFlags"
    >
}
>;
/** ------------- hlbundle types END ------------- */


export default class CapoBundleWithGenericUuts extends CapoHeliosBundle {
    // get modules() {  // optional
    //     return [
    //         ...super.modules(),
    //         // additional custom .hl module imports here
    //     ];
    // }
    declare mkDatum: uplcDataMaker<any>;
    declare readDatum: readsUplcData<any>;
    declare Activity: makesUplcActivityEnumData<CapoActivityLike>;
}
