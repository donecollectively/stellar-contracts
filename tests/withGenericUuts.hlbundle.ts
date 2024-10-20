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
import { dataMaker, EnumType, mkEnum, readData, singleEnumVariant } from "../src/helios/HeliosScriptBundle";


export type CapoActivity = EnumType<{module: "CapoHelpers", enumName: "CapoActivity"}, {
    usingAuthority: singleEnumVariant<CapoActivity, "usingAuthority",
        "Constr#0", "tagOnly", never
    >,
    updatingCharter: singleEnumVariant<CapoActivity, "updatingCharter",
        "Constr#1", "tagOnly", never
    >,
    retiringRefScript: singleEnumVariant<CapoActivity, "retiringRefScript",
        "Constr#2", "tagOnly", never
    >,
    addingSpendInvariant: singleEnumVariant<CapoActivity, "addingSpendInvariant",
        "Constr#3", "tagOnly", never
    >,
    spendingDelegatedDatum: singleEnumVariant<CapoActivity, "spendingDelegatedDatum",
        "Constr#4", "tagOnly", never
    >,
    updatingTypeMap: singleEnumVariant<CapoActivity, "updatingTypeMap",
        "Constr#5", "tagOnly", never
    >
}
>;

export type CapoActivityLike = EnumType<{module: "CapoHelpers", enumName: "CapoActivity"}, {
    usingAuthority: singleEnumVariant<CapoActivity, "usingAuthority",
        "Constr#0", "tagOnly", never
    >,
    updatingCharter: singleEnumVariant<CapoActivity, "updatingCharter",
        "Constr#1", "tagOnly", never
    >,
    retiringRefScript: singleEnumVariant<CapoActivity, "retiringRefScript",
        "Constr#2", "tagOnly", never
    >,
    addingSpendInvariant: singleEnumVariant<CapoActivity, "addingSpendInvariant",
        "Constr#3", "tagOnly", never
    >,
    spendingDelegatedDatum: singleEnumVariant<CapoActivity, "spendingDelegatedDatum",
        "Constr#4", "tagOnly", never
    >,
    updatingTypeMap: singleEnumVariant<CapoActivity, "updatingTypeMap",
        "Constr#5", "tagOnly", never
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
    declare mkDatum: dataMaker<any>;
    declare readDatum: readData<any>;
    declare Activity: mkEnum<CapoActivityLike>;
}
