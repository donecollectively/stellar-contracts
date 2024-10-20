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
import type { EnumType, HeliosScriptBundle, mkEnum, singleEnumVariant } from "../helios/HeliosScriptBundle.js";
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
            }
        >,
        IsDelegation: singleEnumVariant<DelegateDatum, "IsDelegation",
            "Constr#1", "singletonField", 
            DelegationDetail
        >,
        ScriptReference: singleEnumVariant<DelegateDatum, "ScriptReference",
            "Constr#2", "tagOnly", never
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
            }
        >,
        IsDelegation: singleEnumVariant<DelegateDatum, "IsDelegation",
            "Constr#1", "singletonField", 
            DelegationDetailLike
        >,
        ScriptReference: singleEnumVariant<DelegateDatum, "ScriptReference",
            "Constr#2", "tagOnly", never
        >
    }
>;


export type CapoLifecycleActivity = EnumType<{module: "CapoDelegateHelpers", enumName: "CapoLifecycleActivity"}, {
        CreatingDelegate: singleEnumVariant<CapoLifecycleActivity, "CreatingDelegate",
            "Constr#0", 
            "fields", {
                seed: TxOutputId,
                purpose: string
            }
        >
    }
>;

export type CapoLifecycleActivityLike = EnumType<{module: "CapoDelegateHelpers", enumName: "CapoLifecycleActivity"}, {
        CreatingDelegate: singleEnumVariant<CapoLifecycleActivity, "CreatingDelegate",
            "Constr#0", 
            "fields", {
                seed: TxOutputId | string,
                purpose: string
            }
        >
    }
>;


export type DelegateLifecycleActivity = EnumType<{module: "CapoDelegateHelpers", enumName: "DelegateLifecycleActivity"}, {
        ReplacingMe: singleEnumVariant<DelegateLifecycleActivity, "ReplacingMe",
            "Constr#0", 
            "fields", {
                seed: TxOutputId,
                purpose: string
            }
        >,
        Retiring: singleEnumVariant<DelegateLifecycleActivity, "Retiring",
            "Constr#1", "tagOnly", never
        >,
        ValidatingSettings: singleEnumVariant<DelegateLifecycleActivity, "ValidatingSettings",
            "Constr#2", "tagOnly", never
        >
    }
>;

export type DelegateLifecycleActivityLike = EnumType<{module: "CapoDelegateHelpers", enumName: "DelegateLifecycleActivity"}, {
        ReplacingMe: singleEnumVariant<DelegateLifecycleActivity, "ReplacingMe",
            "Constr#0", 
            "fields", {
                seed: TxOutputId | string,
                purpose: string
            }
        >,
        Retiring: singleEnumVariant<DelegateLifecycleActivity, "Retiring",
            "Constr#1", "tagOnly", never
        >,
        ValidatingSettings: singleEnumVariant<DelegateLifecycleActivity, "ValidatingSettings",
            "Constr#2", "tagOnly", never
        >
    }
>;


export type SpendingActivity = EnumType<{module: "unspecializedDelegate", enumName: "SpendingActivity"}, {
        _placeholder1SA: singleEnumVariant<SpendingActivity, "_placeholder1SA",
            "Constr#0", "singletonField", 
            number[]
        >
    }
>;

export type SpendingActivityLike = EnumType<{module: "unspecializedDelegate", enumName: "SpendingActivity"}, {
        _placeholder1SA: singleEnumVariant<SpendingActivity, "_placeholder1SA",
            "Constr#0", "singletonField", 
            number[]
        >
    }
>;


export type MintingActivity = EnumType<{module: "unspecializedDelegate", enumName: "MintingActivity"}, {
        _placeholder1MA: singleEnumVariant<MintingActivity, "_placeholder1MA",
            "Constr#0", "singletonField", 
            TxOutputId
        >
    }
>;

export type MintingActivityLike = EnumType<{module: "unspecializedDelegate", enumName: "MintingActivity"}, {
        _placeholder1MA: singleEnumVariant<MintingActivity, "_placeholder1MA",
            "Constr#0", "singletonField", 
            TxOutputId | string
        >
    }
>;


export type BurningActivity = EnumType<{module: "unspecializedDelegate", enumName: "BurningActivity"}, {
        _placeholder1BA: singleEnumVariant<BurningActivity, "_placeholder1BA",
            "Constr#0", "singletonField", 
            number[]
        >
    }
>;

export type BurningActivityLike = EnumType<{module: "unspecializedDelegate", enumName: "BurningActivity"}, {
        _placeholder1BA: singleEnumVariant<BurningActivity, "_placeholder1BA",
            "Constr#0", "singletonField", 
            number[]
        >
    }
>;


export type DelegateActivity = EnumType<{module: "unspecializedDelegate", enumName: "DelegateActivity"}, {
        CapoLifecycleActivities: singleEnumVariant<DelegateActivity, "CapoLifecycleActivities",
            "Constr#0", "singletonField", 
            CapoLifecycleActivity
        >,
        DelegateLifecycleActivities: singleEnumVariant<DelegateActivity, "DelegateLifecycleActivities",
            "Constr#1", "singletonField", 
            DelegateLifecycleActivity
        >,
        SpendingActivities: singleEnumVariant<DelegateActivity, "SpendingActivities",
            "Constr#2", "singletonField", 
            SpendingActivity
        >,
        MintingActivities: singleEnumVariant<DelegateActivity, "MintingActivities",
            "Constr#3", "singletonField", 
            MintingActivity
        >,
        BurningActivities: singleEnumVariant<DelegateActivity, "BurningActivities",
            "Constr#4", "singletonField", 
            BurningActivity
        >,
        CreatingDelegatedData: singleEnumVariant<DelegateActivity, "CreatingDelegatedData",
            "Constr#5", 
            "fields", {
                seed: TxOutputId,
                dataType: string
            }
        >,
        UpdatingDelegatedData: singleEnumVariant<DelegateActivity, "UpdatingDelegatedData",
            "Constr#6", 
            "fields", {
                dataType: string,
                recId: number[]
            }
        >,
        DeletingDelegatedData: singleEnumVariant<DelegateActivity, "DeletingDelegatedData",
            "Constr#7", 
            "fields", {
                dataType: string,
                recId: number[]
            }
        >,
        MultipleDelegateActivities: singleEnumVariant<DelegateActivity, "MultipleDelegateActivities",
            "Constr#8", "singletonField", 
            Array<UplcData>
        >
    }
>;

export type DelegateActivityLike = EnumType<{module: "unspecializedDelegate", enumName: "DelegateActivity"}, {
        CapoLifecycleActivities: singleEnumVariant<DelegateActivity, "CapoLifecycleActivities",
            "Constr#0", "singletonField", 
            CapoLifecycleActivityLike
        >,
        DelegateLifecycleActivities: singleEnumVariant<DelegateActivity, "DelegateLifecycleActivities",
            "Constr#1", "singletonField", 
            DelegateLifecycleActivityLike
        >,
        SpendingActivities: singleEnumVariant<DelegateActivity, "SpendingActivities",
            "Constr#2", "singletonField", 
            SpendingActivityLike
        >,
        MintingActivities: singleEnumVariant<DelegateActivity, "MintingActivities",
            "Constr#3", "singletonField", 
            MintingActivityLike
        >,
        BurningActivities: singleEnumVariant<DelegateActivity, "BurningActivities",
            "Constr#4", "singletonField", 
            BurningActivityLike
        >,
        CreatingDelegatedData: singleEnumVariant<DelegateActivity, "CreatingDelegatedData",
            "Constr#5", 
            "fields", {
                seed: TxOutputId | string,
                dataType: string
            }
        >,
        UpdatingDelegatedData: singleEnumVariant<DelegateActivity, "UpdatingDelegatedData",
            "Constr#6", 
            "fields", {
                dataType: string,
                recId: number[]
            }
        >,
        DeletingDelegatedData: singleEnumVariant<DelegateActivity, "DeletingDelegatedData",
            "Constr#7", 
            "fields", {
                dataType: string,
                recId: number[]
            }
        >,
        MultipleDelegateActivities: singleEnumVariant<DelegateActivity, "MultipleDelegateActivities",
            "Constr#8", "singletonField", 
            Array<UplcData>
        >
    }
>;


/** ------------- hlbundle types END ------------- */


export default class UnspecializedDgtBundle extends CapoDelegateBundle {
    get specializedDelegateModule() {
        return UnspecializedMintDelegate
    }
}

