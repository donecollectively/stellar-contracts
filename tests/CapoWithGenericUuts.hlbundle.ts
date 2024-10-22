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
export type RelativeDelegateLink = {
    uutName: string
    strategyName: string
    delegateValidatorHash: Option<ValidatorHash>
    config: number[]
};

export type RelativeDelegateLinkLike = {
    uutName: string
    strategyName: string
    delegateValidatorHash: Option<ValidatorHash | string | number[]>
    config: number[]
};


export type AnyData = {
    id: number[]
    type: string
};

export type AnyDataLike = {
    id: number[]
    type: string
};


export type TypeRefImportDetails = TypeRefImportDetails
export type TypeRefImportDetailsLike = TypeRefImportDetailsLike

export type TypeMapRef = {
    importDetails: TypeRefImportDetails
    utxoRef: Option<TxOutputId>
    variety: string
    ref: string
};

export type TypeMapRefLike = {
    importDetails: TypeRefImportDetailsLike
    utxoRef: Option<TxOutputId | string>
    variety: string
    ref: string
};


export type TypeMap = {
    localTypes: Map<string, TypeInfo>
    inheritFlag: string
    inherit: Array<TypeMapRef>
};

export type TypeMapLike = {
    localTypes: Map<string, TypeInfoLike>
    inheritFlag: string
    inherit: Array<TypeMapRefLike>
};


export type CapoDatum = EnumType<{module: "CapoHelpers", enumName: "CapoDatum"}, {
        CharterToken: singleEnumVariant<CapoDatum, "CharterToken",
            "Constr#0", 
            "fields", {
                spendDelegateLink: RelativeDelegateLink,
                spendInvariants: Array<RelativeDelegateLink>,
                namedDelegates: Map<string, RelativeDelegateLink>,
                mintDelegateLink: RelativeDelegateLink,
                mintInvariants: Array<RelativeDelegateLink>,
                govAuthorityLink: RelativeDelegateLink
            }, "noSpecialFlags"
        >,
        ScriptReference: singleEnumVariant<CapoDatum, "ScriptReference",
            "Constr#1", "tagOnly", never, "noSpecialFlags"
        >,
        DelegatedData: singleEnumVariant<CapoDatum, "DelegatedData",
            "Constr#2", 
            "fields", {
                data: AnyData,
                version: bigint,
                otherDetails: UplcData
            }, "noSpecialFlags"
        >,
        TypeMapInfo: singleEnumVariant<CapoDatum, "TypeMapInfo",
            "Constr#3", 
            "fields", {
                typeMapInfoFlag: string,
                data: TypeMap
            }, "noSpecialFlags"
        >
    }
>;

export type CapoDatumLike = EnumType<{module: "CapoHelpers", enumName: "CapoDatum"}, {
        CharterToken: singleEnumVariant<CapoDatum, "CharterToken",
            "Constr#0", 
            "fields", {
                spendDelegateLink: RelativeDelegateLinkLike,
                spendInvariants: Array<RelativeDelegateLinkLike>,
                namedDelegates: Map<string, RelativeDelegateLinkLike>,
                mintDelegateLink: RelativeDelegateLinkLike,
                mintInvariants: Array<RelativeDelegateLinkLike>,
                govAuthorityLink: RelativeDelegateLinkLike
            }, "noSpecialFlags"
        >,
        ScriptReference: singleEnumVariant<CapoDatum, "ScriptReference",
            "Constr#1", "tagOnly", never, "noSpecialFlags"
        >,
        DelegatedData: singleEnumVariant<CapoDatum, "DelegatedData",
            "Constr#2", 
            "fields", {
                data: AnyDataLike,
                version: IntLike,
                otherDetails: UplcData
            }, "noSpecialFlags"
        >,
        TypeMapInfo: singleEnumVariant<CapoDatum, "TypeMapInfo",
            "Constr#3", 
            "fields", {
                typeMapInfoFlag: string,
                data: TypeMapLike
            }, "noSpecialFlags"
        >
    }
>;


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


/**
 * A CapoHeliosBundle subclass that can be used with generic UUTs.
 */
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
