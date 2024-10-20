
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
import type { 
    IntLike,
    ByteArrayLike,
 } from "@helios-lang/codec-utils";
 import uutMintingMintDelegate from "./uutMintingMintDelegate.hl";
 import { CapoDelegateBundle } from "../../src/delegation/CapoDelegateBundle.js";
 import type { EnumType, mkEnum, readEnum, singleEnumVariant } from "../../src/helios/HeliosScriptBundle.js";
 
/** ------------ BEGIN hlbundle types ------------ */
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


export type DelegateDatum = EnumType<{module: "uutMintingDelegate", enumName: "DelegateDatum"}, {
        IsDelegation: singleEnumVariant<DelegateDatum, "IsDelegation",
            "Constr#0", "singletonField", 
            DelegationDetail
        >,
        ScriptReference: singleEnumVariant<DelegateDatum, "ScriptReference",
            "Constr#1", "tagOnly", never
        >
    }
>;

export type DelegateDatumLike = EnumType<{module: "uutMintingDelegate", enumName: "DelegateDatum"}, {
        IsDelegation: singleEnumVariant<DelegateDatum, "IsDelegation",
            "Constr#0", "singletonField", 
            DelegationDetailLike
        >,
        ScriptReference: singleEnumVariant<DelegateDatum, "ScriptReference",
            "Constr#1", "tagOnly", never
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


export type SpendingActivity = EnumType<{module: "uutMintingDelegate", enumName: "SpendingActivity"}, {
        _placeholder2SA: singleEnumVariant<SpendingActivity, "_placeholder2SA",
            "Constr#0", "singletonField", 
            number[]
        >,
        mockWorkingSpendActivity: singleEnumVariant<SpendingActivity, "mockWorkingSpendActivity",
            "Constr#1", "singletonField", 
            number[]
        >
    }
>;

export type SpendingActivityLike = EnumType<{module: "uutMintingDelegate", enumName: "SpendingActivity"}, {
        _placeholder2SA: singleEnumVariant<SpendingActivity, "_placeholder2SA",
            "Constr#0", "singletonField", 
            number[]
        >,
        mockWorkingSpendActivity: singleEnumVariant<SpendingActivity, "mockWorkingSpendActivity",
            "Constr#1", "singletonField", 
            number[]
        >
    }
>;


export type MintingActivity = EnumType<{module: "uutMintingDelegate", enumName: "MintingActivity"}, {
        mintingUuts: singleEnumVariant<MintingActivity, "mintingUuts",
            "Constr#0", 
            "fields", {
                seed: TxOutputId,
                purposes: Array<string>
            }
        >,
        mockOtherActivity: singleEnumVariant<MintingActivity, "mockOtherActivity",
            "Constr#1", "tagOnly", never
        >
    }
>;

export type MintingActivityLike = EnumType<{module: "uutMintingDelegate", enumName: "MintingActivity"}, {
        mintingUuts: singleEnumVariant<MintingActivity, "mintingUuts",
            "Constr#0", 
            "fields", {
                seed: TxOutputId | string,
                purposes: Array<string>
            }
        >,
        mockOtherActivity: singleEnumVariant<MintingActivity, "mockOtherActivity",
            "Constr#1", "tagOnly", never
        >
    }
>;


export type BurningActivity = EnumType<{module: "uutMintingDelegate", enumName: "BurningActivity"}, {
        _placeholder2BA: singleEnumVariant<BurningActivity, "_placeholder2BA",
            "Constr#0", "singletonField", 
            number[]
        >
    }
>;

export type BurningActivityLike = EnumType<{module: "uutMintingDelegate", enumName: "BurningActivity"}, {
        _placeholder2BA: singleEnumVariant<BurningActivity, "_placeholder2BA",
            "Constr#0", "singletonField", 
            number[]
        >
    }
>;


export type DelegateActivity = EnumType<{module: "uutMintingDelegate", enumName: "DelegateActivity"}, {
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

export type DelegateActivityLike = EnumType<{module: "uutMintingDelegate", enumName: "DelegateActivity"}, {
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


export default class BundleMintDelegateWithGenericUuts extends CapoDelegateBundle {
    get specializedDelegateModule() {
        return uutMintingMintDelegate;
    }

    declare mkDatum: mkEnum<DelegateDatumLike>;
    declare readDatum: readEnum<DelegateDatum>;

    declare Activity: mkEnum<DelegateActivityLike>;

}
