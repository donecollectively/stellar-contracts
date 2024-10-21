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
import type { EnumType, HeliosScriptBundle, makesUplcActivityEnumData, singleEnumVariant } from "../helios/HeliosScriptBundle.js";
import type { 
    IntLike,
    ByteArrayLike,
 } from "@helios-lang/codec-utils";

/** ------------ BEGIN hlbundle types ------------ */
export type AnyData = {
    id: number[]
    type: string
};

export type AnyDataLike = {
    id: number[]
    type: string
};


export type DelegationDetail = {
    capoAddr: Address
    mph: MintingPolicyHash
    tn: number[]
};

export type DelegationDetailLike = {
    capoAddr: Address | string
    mph: MintingPolicyHash | string | number[]
    tn: number[]
};


export type DelegateDatum = EnumType<{module: "unspecializedDelegate", enumName: "DelegateDatum"}, {
        Cip68RefToken: singleEnumVariant<DelegateDatum, "Cip68RefToken",
            "Constr#0", 
            "fields", {
                cip68meta: AnyData,
                cip68version: bigint,
                dd: Option<DelegationDetail>
            }, "noSpecialFlags"
        >,
        IsDelegation: singleEnumVariant<DelegateDatum, "IsDelegation",
            "Constr#1", "singletonField", 
            DelegationDetail, "noSpecialFlags"
        >,
        ScriptReference: singleEnumVariant<DelegateDatum, "ScriptReference",
            "Constr#2", "tagOnly", never, "noSpecialFlags"
        >
    }
>;

export type DelegateDatumLike = EnumType<{module: "unspecializedDelegate", enumName: "DelegateDatum"}, {
        Cip68RefToken: singleEnumVariant<DelegateDatum, "Cip68RefToken",
            "Constr#0", 
            "fields", {
                cip68meta: AnyDataLike,
                cip68version: IntLike,
                dd: Option<DelegationDetailLike>
            }, "noSpecialFlags"
        >,
        IsDelegation: singleEnumVariant<DelegateDatum, "IsDelegation",
            "Constr#1", "singletonField", 
            DelegationDetailLike, "noSpecialFlags"
        >,
        ScriptReference: singleEnumVariant<DelegateDatum, "ScriptReference",
            "Constr#2", "tagOnly", never, "noSpecialFlags"
        >
    }
>;


export type CapoLifecycleActivity = EnumType<{module: "CapoDelegateHelpers", enumName: "CapoLifecycleActivity"}, {
        CreatingDelegate: singleEnumVariant<CapoLifecycleActivity, "CreatingDelegate",
            "Constr#0", 
            "fields", {
                seed: TxOutputId,
                purpose: string
            }, "isSeededActivity"
        >
    }
>;

export type CapoLifecycleActivityLike = EnumType<{module: "CapoDelegateHelpers", enumName: "CapoLifecycleActivity"}, {
        CreatingDelegate: singleEnumVariant<CapoLifecycleActivity, "CreatingDelegate",
            "Constr#0", 
            "fields", {
                seed: TxOutputId | string,
                purpose: string
            }, "isSeededActivity"
        >
    }
>;


export type DelegateLifecycleActivity = EnumType<{module: "CapoDelegateHelpers", enumName: "DelegateLifecycleActivity"}, {
        ReplacingMe: singleEnumVariant<DelegateLifecycleActivity, "ReplacingMe",
            "Constr#0", 
            "fields", {
                seed: TxOutputId,
                purpose: string
            }, "isSeededActivity"
        >,
        Retiring: singleEnumVariant<DelegateLifecycleActivity, "Retiring",
            "Constr#1", "tagOnly", never, "noSpecialFlags"
        >,
        ValidatingSettings: singleEnumVariant<DelegateLifecycleActivity, "ValidatingSettings",
            "Constr#2", "tagOnly", never, "noSpecialFlags"
        >
    }
>;

export type DelegateLifecycleActivityLike = EnumType<{module: "CapoDelegateHelpers", enumName: "DelegateLifecycleActivity"}, {
        ReplacingMe: singleEnumVariant<DelegateLifecycleActivity, "ReplacingMe",
            "Constr#0", 
            "fields", {
                seed: TxOutputId | string,
                purpose: string
            }, "isSeededActivity"
        >,
        Retiring: singleEnumVariant<DelegateLifecycleActivity, "Retiring",
            "Constr#1", "tagOnly", never, "noSpecialFlags"
        >,
        ValidatingSettings: singleEnumVariant<DelegateLifecycleActivity, "ValidatingSettings",
            "Constr#2", "tagOnly", never, "noSpecialFlags"
        >
    }
>;


export type SpendingActivity = EnumType<{module: "unspecializedDelegate", enumName: "SpendingActivity"}, {
        _placeholder1SA: singleEnumVariant<SpendingActivity, "_placeholder1SA",
            "Constr#0", "singletonField", 
            number[], "noSpecialFlags"
        >
    }
>;

export type SpendingActivityLike = EnumType<{module: "unspecializedDelegate", enumName: "SpendingActivity"}, {
        _placeholder1SA: singleEnumVariant<SpendingActivity, "_placeholder1SA",
            "Constr#0", "singletonField", 
            number[], "noSpecialFlags"
        >
    }
>;


export type MintingActivity = EnumType<{module: "unspecializedDelegate", enumName: "MintingActivity"}, {
        _placeholder1MA: singleEnumVariant<MintingActivity, "_placeholder1MA",
            "Constr#0", "singletonField", 
            TxOutputId, "isSeededActivity"
        >
    }
>;

export type MintingActivityLike = EnumType<{module: "unspecializedDelegate", enumName: "MintingActivity"}, {
        _placeholder1MA: singleEnumVariant<MintingActivity, "_placeholder1MA",
            "Constr#0", "singletonField", 
            TxOutputId | string, "isSeededActivity"
        >
    }
>;


export type BurningActivity = EnumType<{module: "unspecializedDelegate", enumName: "BurningActivity"}, {
        _placeholder1BA: singleEnumVariant<BurningActivity, "_placeholder1BA",
            "Constr#0", "singletonField", 
            number[], "noSpecialFlags"
        >
    }
>;

export type BurningActivityLike = EnumType<{module: "unspecializedDelegate", enumName: "BurningActivity"}, {
        _placeholder1BA: singleEnumVariant<BurningActivity, "_placeholder1BA",
            "Constr#0", "singletonField", 
            number[], "noSpecialFlags"
        >
    }
>;


export type DelegateActivity = EnumType<{module: "unspecializedDelegate", enumName: "DelegateActivity"}, {
        CapoLifecycleActivities: singleEnumVariant<DelegateActivity, "CapoLifecycleActivities",
            "Constr#0", "singletonField", 
            CapoLifecycleActivity, "noSpecialFlags"
        >,
        DelegateLifecycleActivities: singleEnumVariant<DelegateActivity, "DelegateLifecycleActivities",
            "Constr#1", "singletonField", 
            DelegateLifecycleActivity, "noSpecialFlags"
        >,
        SpendingActivities: singleEnumVariant<DelegateActivity, "SpendingActivities",
            "Constr#2", "singletonField", 
            SpendingActivity, "noSpecialFlags"
        >,
        MintingActivities: singleEnumVariant<DelegateActivity, "MintingActivities",
            "Constr#3", "singletonField", 
            MintingActivity, "noSpecialFlags"
        >,
        BurningActivities: singleEnumVariant<DelegateActivity, "BurningActivities",
            "Constr#4", "singletonField", 
            BurningActivity, "noSpecialFlags"
        >,
        CreatingDelegatedData: singleEnumVariant<DelegateActivity, "CreatingDelegatedData",
            "Constr#5", 
            "fields", {
                seed: TxOutputId,
                dataType: string
            }, "isSeededActivity"
        >,
        UpdatingDelegatedData: singleEnumVariant<DelegateActivity, "UpdatingDelegatedData",
            "Constr#6", 
            "fields", {
                dataType: string,
                recId: number[]
            }, "noSpecialFlags"
        >,
        DeletingDelegatedData: singleEnumVariant<DelegateActivity, "DeletingDelegatedData",
            "Constr#7", 
            "fields", {
                dataType: string,
                recId: number[]
            }, "noSpecialFlags"
        >,
        MultipleDelegateActivities: singleEnumVariant<DelegateActivity, "MultipleDelegateActivities",
            "Constr#8", "singletonField", 
            Array<UplcData>, "noSpecialFlags"
        >
    }
>;

export type DelegateActivityLike = EnumType<{module: "unspecializedDelegate", enumName: "DelegateActivity"}, {
        CapoLifecycleActivities: singleEnumVariant<DelegateActivity, "CapoLifecycleActivities",
            "Constr#0", "singletonField", 
            CapoLifecycleActivityLike, "noSpecialFlags"
        >,
        DelegateLifecycleActivities: singleEnumVariant<DelegateActivity, "DelegateLifecycleActivities",
            "Constr#1", "singletonField", 
            DelegateLifecycleActivityLike, "noSpecialFlags"
        >,
        SpendingActivities: singleEnumVariant<DelegateActivity, "SpendingActivities",
            "Constr#2", "singletonField", 
            SpendingActivityLike, "noSpecialFlags"
        >,
        MintingActivities: singleEnumVariant<DelegateActivity, "MintingActivities",
            "Constr#3", "singletonField", 
            MintingActivityLike, "noSpecialFlags"
        >,
        BurningActivities: singleEnumVariant<DelegateActivity, "BurningActivities",
            "Constr#4", "singletonField", 
            BurningActivityLike, "noSpecialFlags"
        >,
        CreatingDelegatedData: singleEnumVariant<DelegateActivity, "CreatingDelegatedData",
            "Constr#5", 
            "fields", {
                seed: TxOutputId | string,
                dataType: string
            }, "isSeededActivity"
        >,
        UpdatingDelegatedData: singleEnumVariant<DelegateActivity, "UpdatingDelegatedData",
            "Constr#6", 
            "fields", {
                dataType: string,
                recId: number[]
            }, "noSpecialFlags"
        >,
        DeletingDelegatedData: singleEnumVariant<DelegateActivity, "DeletingDelegatedData",
            "Constr#7", 
            "fields", {
                dataType: string,
                recId: number[]
            }, "noSpecialFlags"
        >,
        MultipleDelegateActivities: singleEnumVariant<DelegateActivity, "MultipleDelegateActivities",
            "Constr#8", "singletonField", 
            Array<UplcData>, "noSpecialFlags"
        >
    }
>;


/** ------------- hlbundle types END ------------- */


export default class UnspecializedDgtBundle extends CapoDelegateBundle {
    get specializedDelegateModule() {
        return UnspecializedMintDelegate
    }
}

