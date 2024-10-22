
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
import type { IntLike, ByteArrayLike } from "@helios-lang/codec-utils";
import uutMintingMintDelegate from "./uutMintingMintDelegate.hl";
import { CapoDelegateBundle } from "../../delegation/CapoDelegateBundle.js";
import type {
    EnumType,
    expanded,
    makesUplcActivityEnumData,
    EnumVariantCreator,
    readsUplcEnumData,
    singleEnumVariant,
    anySeededActivity,
    makesUplcEnumData,
    ActivityEnumVariantCreator,
} from "../../helios/HeliosScriptBundle.js";
import type { SeedAttrs } from "../../delegation/UutName.js";

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
            DelegationDetail, "noSpecialFlags"
        >,
        ScriptReference: singleEnumVariant<DelegateDatum, "ScriptReference",
            "Constr#1", "tagOnly", never, "noSpecialFlags"
        >
    }
>;

export type DelegateDatumLike = EnumType<{module: "uutMintingDelegate", enumName: "DelegateDatum"}, {
        IsDelegation: singleEnumVariant<DelegateDatum, "IsDelegation",
            "Constr#0", "singletonField", 
            DelegationDetailLike, "noSpecialFlags"
        >,
        ScriptReference: singleEnumVariant<DelegateDatum, "ScriptReference",
            "Constr#1", "tagOnly", never, "noSpecialFlags"
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


export type SpendingActivity = EnumType<{module: "uutMintingDelegate", enumName: "SpendingActivity"}, {
        _placeholder2SA: singleEnumVariant<SpendingActivity, "_placeholder2SA",
            "Constr#0", "singletonField", 
            number[], "noSpecialFlags"
        >,
        mockWorkingSpendActivity: singleEnumVariant<SpendingActivity, "mockWorkingSpendActivity",
            "Constr#1", "singletonField", 
            number[], "noSpecialFlags"
        >
    }
>;

export type SpendingActivityLike = EnumType<{module: "uutMintingDelegate", enumName: "SpendingActivity"}, {
        _placeholder2SA: singleEnumVariant<SpendingActivity, "_placeholder2SA",
            "Constr#0", "singletonField", 
            number[], "noSpecialFlags"
        >,
        mockWorkingSpendActivity: singleEnumVariant<SpendingActivity, "mockWorkingSpendActivity",
            "Constr#1", "singletonField", 
            number[], "noSpecialFlags"
        >
    }
>;


export type MintingActivity = EnumType<{module: "uutMintingDelegate", enumName: "MintingActivity"}, {
        mintingUuts: singleEnumVariant<MintingActivity, "mintingUuts",
            "Constr#0", 
            "fields", {
                seed: TxOutputId,
                purposes: Array<string>
            }, "isSeededActivity"
        >,
        mockOtherActivity: singleEnumVariant<MintingActivity, "mockOtherActivity",
            "Constr#1", "tagOnly", never, "noSpecialFlags"
        >
    }
>;

export type MintingActivityLike = EnumType<{module: "uutMintingDelegate", enumName: "MintingActivity"}, {
        mintingUuts: singleEnumVariant<MintingActivity, "mintingUuts",
            "Constr#0", 
            "fields", {
                seed: TxOutputId | string,
                purposes: Array<string>
            }, "isSeededActivity"
        >,
        mockOtherActivity: singleEnumVariant<MintingActivity, "mockOtherActivity",
            "Constr#1", "tagOnly", never, "noSpecialFlags"
        >
    }
>;


export type BurningActivity = EnumType<{module: "uutMintingDelegate", enumName: "BurningActivity"}, {
        _placeholder2BA: singleEnumVariant<BurningActivity, "_placeholder2BA",
            "Constr#0", "singletonField", 
            number[], "noSpecialFlags"
        >
    }
>;

export type BurningActivityLike = EnumType<{module: "uutMintingDelegate", enumName: "BurningActivity"}, {
        _placeholder2BA: singleEnumVariant<BurningActivity, "_placeholder2BA",
            "Constr#0", "singletonField", 
            number[], "noSpecialFlags"
        >
    }
>;


export type DelegateActivity = EnumType<{module: "uutMintingDelegate", enumName: "DelegateActivity"}, {
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

export type DelegateActivityLike = EnumType<{module: "uutMintingDelegate", enumName: "DelegateActivity"}, {
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


type makesDelegateDatum = makesUplcEnumData<DelegateDatumLike>

/**
 * A specialized minting delegate for testing purposes
 */
export default class BundleMintDelegateWithGenericUuts extends CapoDelegateBundle {
    get specializedDelegateModule() {
        return uutMintingMintDelegate;
    }

    declare mkDatum: makesDelegateDatum;
    declare readDatum: readsUplcEnumData<DelegateDatum>;

    declare Activity: makesUplcActivityEnumData<DelegateActivityLike>;
}



if (false) {
    // ... type tests

    {
        // seeded activity
        type seededVariant = singleEnumVariant<
            DelegateActivityLike,
            "CreatingDelegatedData",
            "Constr#5",
            "fields",
            {
                seed: TxOutputId | string;
                dataType: string;
            },
            "isSeededActivity"
        >;
        const seededActivityWorks: seededVariant extends anySeededActivity
            ? true
            : false = true;

        type seededVariantMaker = ActivityEnumVariantCreator<seededVariant, "redeemerWrapper">;
        const callVariantMaker: seededVariantMaker = (() => {}) as any;
        // sample calls for checking different type-signatures
        callVariantMaker(
            {
                txId: "" as unknown as TxId,
                idx: "" as unknown as bigint,
            },
            {
                dataType: "awesome",
            }
        );
        callVariantMaker({
            dataType: "awesome",
            seed: "" as unknown as TxOutputId,
        });
    }
    {
        // unseeded activity
        type unseededVariant = singleEnumVariant<
            DelegateActivityLike,
            "UpdatingDelegatedData",
            "Constr#6",
            "fields",
            {
                dataType: string;
                recId: number[];
            },
            "noSpecialFlags"
        >;

        const unseededActivityWorks: unseededVariant extends anySeededActivity
            ? true
            : false = false;

        type unseededVariantMaker = EnumVariantCreator<unseededVariant>; 
        const callVariantMaker: unseededVariantMaker = (() => {}) as any;
        // sample calls for checking different type-signatures
        callVariantMaker({
            dataType: "awesome",
            recId: [],
        });
    }

    {
        type nestedEnumVariant = singleEnumVariant<
            DelegateActivityLike,
            "CapoLifecycleActivities",
            "Constr#0",
            "singletonField",
            CapoLifecycleActivityLike,
            "noSpecialFlags"
        >;

        type nestedEnum = nestedEnumVariant["data"];
        const nestedThingIsEnum : nestedEnum extends EnumType<any, any> ? true : false = true;
        const nestedEnumVariantIsSeeded: nestedEnumVariant["data"]["variants"]["CreatingDelegate"] extends anySeededActivity
            ? true
            : false = true;
        type nestedEnumMaker = makesUplcActivityEnumData<nestedEnum>
        const t : nestedEnumMaker = "fake" as any;
    }


    const integratedTest = "fake" as unknown as BundleMintDelegateWithGenericUuts; {
        // if these don't show type errors, then they're good expressions / type tests
        integratedTest.Activity.CreatingDelegatedData({} as unknown as SeedAttrs, {
            dataType: "awesome",
        });

        integratedTest.mkDatum.IsDelegation({
            capoAddr: "" as unknown as Address,
            mph: "",
            tn: [],
        });

        // todo: support an inline proxy for generating a nested enum:
        integratedTest.Activity.CapoLifecycleActivities.CreatingDelegate({ 
            seed: "" as unknown as TxOutputId, 
            purpose: "awesome" 
        });
        integratedTest.Activity.CapoLifecycleActivities.CreatingDelegate({ 
            txId: "" as unknown as TxId,
            idx: 0n,
        }, {
            purpose: "awesome"
        });
    }

}
