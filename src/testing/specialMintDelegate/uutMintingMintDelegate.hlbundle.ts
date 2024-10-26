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
    EnumTypeMeta as EnumTypeMeta,
    expanded,
    makesUplcActivityEnumData,
    EnumVariantCreator,
    readsUplcEnumData,
    singleEnumVariantMeta as singleEnumVariantMeta,
    anySeededActivity,
    makesUplcEnumData,
    ActivityEnumVariantCreator,
    tagOnly,
} from "../../helios/HeliosScriptBundle.js";
import type { SeedAttrs } from "../../delegation/UutName.js";
import { textToBytes } from "@hyperionbt/helios";

/** ------------ BEGIN hlbundle types ------------ */
export type DelegationDetail = {
    capoAddr: /*minStructField*/ Address
    mph: /*minStructField*/ MintingPolicyHash
    tn: /*minStructField*/ number[]
}

export type DelegationDetailLike = {
    capoAddr: /*minStructField*/ Address | string
    mph: /*minStructField*/ MintingPolicyHash | string | number[]
    tn: /*minStructField*/ number[]
}


export type SampleStruct = {
    a: /*minStructField*/ bigint
    b: /*minStructField*/ Map<string, number[]>
    c: /*minStructField*/ Array<boolean>
    d: /*minStructField*/ Option<UplcData>
}

export type SampleStructLike = {
    a: /*minStructField*/ IntLike
    b: /*minStructField*/ Map<string, number[]>
    c: /*minStructField*/ Array<boolean>
    d: /*minStructField*/ Option<UplcData>
}


export type SomeEnum$hasNestedFields = {
    m: SampleStruct  /*minVariantField*/ ,
    n: bigint  /*minVariantField*/ 
}

export type SomeEnum$hasNestedFieldsLike = {
    m: SampleStructLike  /*minVariantField*/ ,
    n: IntLike  /*minVariantField*/ 
}


export type SomeEnum$hasRecursiveFields = {
    placeholder: bigint  /*minVariantField*/ ,
    ph2: string  /*minVariantField*/ 
}

export type SomeEnum$hasRecursiveFieldsLike = {
    placeholder: IntLike  /*minVariantField*/ ,
    ph2: string  /*minVariantField*/ 
}


export type SomeEnumMeta = EnumTypeMeta<
    {module: "uutMintingDelegate", enumName: "SomeEnum"}, {
        justATag: singleEnumVariantMeta<SomeEnumMeta, "justATag",
            "Constr#0", "tagOnly", tagOnly, "noSpecialFlags"
        >,
        justAnInt: singleEnumVariantMeta<SomeEnumMeta, "justAnInt",
            "Constr#1", "singletonField", { m: bigint /*singleVariantField*/ } , "noSpecialFlags"
        >,
        oneNestedStruct: singleEnumVariantMeta<SomeEnumMeta, "oneNestedStruct",
            "Constr#2", "singletonField", { m: SampleStruct /*singleVariantField*/ } , "noSpecialFlags"
        >,
        hasNestedFields: singleEnumVariantMeta<SomeEnumMeta, "hasNestedFields",
            "Constr#3", 
            "fields", SomeEnum$hasNestedFields, "noSpecialFlags"
        >,
        hasRecursiveFields: singleEnumVariantMeta<SomeEnumMeta, "hasRecursiveFields",
            "Constr#4", 
            "fields", SomeEnum$hasRecursiveFields, "noSpecialFlags"
        >
    }
>;


/**
 * SomeEnum enum variants
 * 
 * @remarks - expresses the essential raw data structures
 * supporting the **5 variant(s)** of the SomeEnum enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `SomeEnumHelper` class
 *     for generating UPLC data for this enum type
 */
export type SomeEnum = 
        | { justATag: /*minEnumVariant*/ tagOnly }
        | { justAnInt: /*minEnumVariant*/ { m: bigint /*singleVariantField*/ }  }
        | { oneNestedStruct: /*minEnumVariant*/ { m: SampleStruct /*singleVariantField*/ }  }
        | { hasNestedFields: /*minEnumVariant*/ SomeEnum$hasNestedFields }
        | { hasRecursiveFields: /*minEnumVariant*/ SomeEnum$hasRecursiveFields }

/**
 * SomeEnum enum variants (permissive)
 * 
 * @remarks - expresses the allowable data structures
 * for creating any of the **5 variant(s)** of the SomeEnum enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `SomeEnumHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are 
 * converted by convention to the canonical types used in the on-chain context.
 */
export type SomeEnumLike = 
        | { justATag: /*minEnumVariant*/ tagOnly }
        | { justAnInt: /*minEnumVariant*/ { m: IntLike /*singleVariantField*/ }  }
        | { oneNestedStruct: /*minEnumVariant*/ { m: SampleStructLike /*singleVariantField*/ }  }
        | { hasNestedFields: /*minEnumVariant*/ SomeEnum$hasNestedFieldsLike }
        | { hasRecursiveFields: /*minEnumVariant*/ SomeEnum$hasRecursiveFieldsLike }

export type DelegateDatum$MultiFieldVariant = {
    field1: bigint  /*minVariantField*/ ,
    field2: string  /*minVariantField*/ 
}

export type DelegateDatum$MultiFieldVariantLike = {
    field1: IntLike  /*minVariantField*/ ,
    field2: string  /*minVariantField*/ 
}


export type DelegateDatum$MultiFieldNestedThings = {
    nestedStruct: SampleStruct  /*minVariantField*/ ,
    nestedEnumMaybe: Option<SomeEnum>  /*minVariantField*/ 
}

export type DelegateDatum$MultiFieldNestedThingsLike = {
    nestedStruct: SampleStructLike  /*minVariantField*/ ,
    nestedEnumMaybe: Option<SomeEnumLike>  /*minVariantField*/ 
}


export type DelegateDatumMeta = EnumTypeMeta<
    {module: "uutMintingDelegate", enumName: "DelegateDatum"}, {
        IsDelegation: singleEnumVariantMeta<DelegateDatumMeta, "IsDelegation",
            "Constr#0", "singletonField", { dd: DelegationDetail /*singleVariantField*/ } , "noSpecialFlags"
        >,
        ScriptReference: singleEnumVariantMeta<DelegateDatumMeta, "ScriptReference",
            "Constr#1", "tagOnly", tagOnly, "noSpecialFlags"
        >,
        SingleDataElement: singleEnumVariantMeta<DelegateDatumMeta, "SingleDataElement",
            "Constr#2", "singletonField", { aString: string /*singleVariantField*/ } , "noSpecialFlags"
        >,
        SingleNestedStruct: singleEnumVariantMeta<DelegateDatumMeta, "SingleNestedStruct",
            "Constr#3", "singletonField", { aStruct: SampleStruct /*singleVariantField*/ } , "noSpecialFlags"
        >,
        HasNestedEnum: singleEnumVariantMeta<DelegateDatumMeta, "HasNestedEnum",
            "Constr#4", "singletonField", { nested: SomeEnum /*singleVariantField*/ } , "noSpecialFlags"
        >,
        MultiFieldVariant: singleEnumVariantMeta<DelegateDatumMeta, "MultiFieldVariant",
            "Constr#5", 
            "fields", DelegateDatum$MultiFieldVariant, "noSpecialFlags"
        >,
        MultiFieldNestedThings: singleEnumVariantMeta<DelegateDatumMeta, "MultiFieldNestedThings",
            "Constr#6", 
            "fields", DelegateDatum$MultiFieldNestedThings, "noSpecialFlags"
        >
    }
>;


/**
 * DelegateDatum enum variants
 * 
 * @remarks - expresses the essential raw data structures
 * supporting the **7 variant(s)** of the DelegateDatum enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `DelegateDatumHelper` class
 *     for generating UPLC data for this enum type
 */
export type DelegateDatum = 
        | { IsDelegation: /*minEnumVariant*/ { dd: DelegationDetail /*singleVariantField*/ }  }
        | { ScriptReference: /*minEnumVariant*/ tagOnly }
        | { SingleDataElement: /*minEnumVariant*/ { aString: string /*singleVariantField*/ }  }
        | { SingleNestedStruct: /*minEnumVariant*/ { aStruct: SampleStruct /*singleVariantField*/ }  }
        | { HasNestedEnum: /*minEnumVariant*/ { nested: SomeEnum /*singleVariantField*/ }  }
        | { MultiFieldVariant: /*minEnumVariant*/ DelegateDatum$MultiFieldVariant }
        | { MultiFieldNestedThings: /*minEnumVariant*/ DelegateDatum$MultiFieldNestedThings }

/**
 * DelegateDatum enum variants (permissive)
 * 
 * @remarks - expresses the allowable data structures
 * for creating any of the **7 variant(s)** of the DelegateDatum enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `DelegateDatumHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are 
 * converted by convention to the canonical types used in the on-chain context.
 */
export type DelegateDatumLike = 
        | { IsDelegation: /*minEnumVariant*/ { dd: DelegationDetailLike /*singleVariantField*/ }  }
        | { ScriptReference: /*minEnumVariant*/ tagOnly }
        | { SingleDataElement: /*minEnumVariant*/ { aString: string /*singleVariantField*/ }  }
        | { SingleNestedStruct: /*minEnumVariant*/ { aStruct: SampleStructLike /*singleVariantField*/ }  }
        | { HasNestedEnum: /*minEnumVariant*/ { nested: SomeEnumLike /*singleVariantField*/ }  }
        | { MultiFieldVariant: /*minEnumVariant*/ DelegateDatum$MultiFieldVariantLike }
        | { MultiFieldNestedThings: /*minEnumVariant*/ DelegateDatum$MultiFieldNestedThingsLike }

export type CapoLifecycleActivity$CreatingDelegate = {
    seed: TxOutputId  /*minVariantField*/ ,
    purpose: string  /*minVariantField*/ 
}

export type CapoLifecycleActivity$CreatingDelegateLike = {
    seed: TxOutputId | string  /*minVariantField*/ ,
    purpose: string  /*minVariantField*/ 
}


export type CapoLifecycleActivityMeta = EnumTypeMeta<
    {module: "CapoDelegateHelpers", enumName: "CapoLifecycleActivity"}, {
        CreatingDelegate: singleEnumVariantMeta<CapoLifecycleActivityMeta, "CreatingDelegate",
            "Constr#0", 
            "fields", CapoLifecycleActivity$CreatingDelegate, "isSeededActivity"
        >
    }
>;


/**
 * CapoLifecycleActivity enum variants
 * 
 * @remarks - expresses the essential raw data structures
 * supporting the **1 variant(s)** of the CapoLifecycleActivity enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `CapoLifecycleActivityHelper` class
 *     for generating UPLC data for this enum type
 */
export type CapoLifecycleActivity = 
        | { CreatingDelegate: /*minEnumVariant*/ CapoLifecycleActivity$CreatingDelegate }

/**
 * CapoLifecycleActivity enum variants (permissive)
 * 
 * @remarks - expresses the allowable data structures
 * for creating any of the **1 variant(s)** of the CapoLifecycleActivity enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `CapoLifecycleActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are 
 * converted by convention to the canonical types used in the on-chain context.
 */
export type CapoLifecycleActivityLike = 
        | { CreatingDelegate: /*minEnumVariant*/ CapoLifecycleActivity$CreatingDelegateLike }

export type DelegateLifecycleActivity$ReplacingMe = {
    seed: TxOutputId  /*minVariantField*/ ,
    purpose: string  /*minVariantField*/ 
}

export type DelegateLifecycleActivity$ReplacingMeLike = {
    seed: TxOutputId | string  /*minVariantField*/ ,
    purpose: string  /*minVariantField*/ 
}


export type DelegateLifecycleActivityMeta = EnumTypeMeta<
    {module: "CapoDelegateHelpers", enumName: "DelegateLifecycleActivity"}, {
        ReplacingMe: singleEnumVariantMeta<DelegateLifecycleActivityMeta, "ReplacingMe",
            "Constr#0", 
            "fields", DelegateLifecycleActivity$ReplacingMe, "isSeededActivity"
        >,
        Retiring: singleEnumVariantMeta<DelegateLifecycleActivityMeta, "Retiring",
            "Constr#1", "tagOnly", tagOnly, "noSpecialFlags"
        >,
        ValidatingSettings: singleEnumVariantMeta<DelegateLifecycleActivityMeta, "ValidatingSettings",
            "Constr#2", "tagOnly", tagOnly, "noSpecialFlags"
        >
    }
>;


/**
 * DelegateLifecycleActivity enum variants
 * 
 * @remarks - expresses the essential raw data structures
 * supporting the **3 variant(s)** of the DelegateLifecycleActivity enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `DelegateLifecycleActivityHelper` class
 *     for generating UPLC data for this enum type
 */
export type DelegateLifecycleActivity = 
        | { ReplacingMe: /*minEnumVariant*/ DelegateLifecycleActivity$ReplacingMe }
        | { Retiring: /*minEnumVariant*/ tagOnly }
        | { ValidatingSettings: /*minEnumVariant*/ tagOnly }

/**
 * DelegateLifecycleActivity enum variants (permissive)
 * 
 * @remarks - expresses the allowable data structures
 * for creating any of the **3 variant(s)** of the DelegateLifecycleActivity enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `DelegateLifecycleActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are 
 * converted by convention to the canonical types used in the on-chain context.
 */
export type DelegateLifecycleActivityLike = 
        | { ReplacingMe: /*minEnumVariant*/ DelegateLifecycleActivity$ReplacingMeLike }
        | { Retiring: /*minEnumVariant*/ tagOnly }
        | { ValidatingSettings: /*minEnumVariant*/ tagOnly }

export type SpendingActivityMeta = EnumTypeMeta<
    {module: "uutMintingDelegate", enumName: "SpendingActivity"}, {
        _placeholder2SA: singleEnumVariantMeta<SpendingActivityMeta, "_placeholder2SA",
            "Constr#0", "singletonField", { id: number[] /*singleVariantField*/ } , "noSpecialFlags"
        >,
        mockWorkingSpendActivity: singleEnumVariantMeta<SpendingActivityMeta, "mockWorkingSpendActivity",
            "Constr#1", "singletonField", { id: number[] /*singleVariantField*/ } , "noSpecialFlags"
        >
    }
>;


/**
 * SpendingActivity enum variants
 * 
 * @remarks - expresses the essential raw data structures
 * supporting the **2 variant(s)** of the SpendingActivity enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `SpendingActivityHelper` class
 *     for generating UPLC data for this enum type
 */
export type SpendingActivity = 
        | { _placeholder2SA: /*minEnumVariant*/ { id: number[] /*singleVariantField*/ }  }
        | { mockWorkingSpendActivity: /*minEnumVariant*/ { id: number[] /*singleVariantField*/ }  }

/**
 * SpendingActivity enum variants (permissive)
 * 
 * @remarks - expresses the allowable data structures
 * for creating any of the **2 variant(s)** of the SpendingActivity enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `SpendingActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are 
 * converted by convention to the canonical types used in the on-chain context.
 */
export type SpendingActivityLike = 
        | { _placeholder2SA: /*minEnumVariant*/ { id: number[] /*singleVariantField*/ }  }
        | { mockWorkingSpendActivity: /*minEnumVariant*/ { id: number[] /*singleVariantField*/ }  }

export type MintingActivity$mintingUuts = {
    seed: TxOutputId  /*minVariantField*/ ,
    purposes: Array<string>  /*minVariantField*/ 
}

export type MintingActivity$mintingUutsLike = {
    seed: TxOutputId | string  /*minVariantField*/ ,
    purposes: Array<string>  /*minVariantField*/ 
}


export type MintingActivityMeta = EnumTypeMeta<
    {module: "uutMintingDelegate", enumName: "MintingActivity"}, {
        mintingUuts: singleEnumVariantMeta<MintingActivityMeta, "mintingUuts",
            "Constr#0", 
            "fields", MintingActivity$mintingUuts, "isSeededActivity"
        >,
        mockOtherActivity: singleEnumVariantMeta<MintingActivityMeta, "mockOtherActivity",
            "Constr#1", "tagOnly", tagOnly, "noSpecialFlags"
        >
    }
>;


/**
 * MintingActivity enum variants
 * 
 * @remarks - expresses the essential raw data structures
 * supporting the **2 variant(s)** of the MintingActivity enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `MintingActivityHelper` class
 *     for generating UPLC data for this enum type
 */
export type MintingActivity = 
        | { mintingUuts: /*minEnumVariant*/ MintingActivity$mintingUuts }
        | { mockOtherActivity: /*minEnumVariant*/ tagOnly }

/**
 * MintingActivity enum variants (permissive)
 * 
 * @remarks - expresses the allowable data structures
 * for creating any of the **2 variant(s)** of the MintingActivity enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `MintingActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are 
 * converted by convention to the canonical types used in the on-chain context.
 */
export type MintingActivityLike = 
        | { mintingUuts: /*minEnumVariant*/ MintingActivity$mintingUutsLike }
        | { mockOtherActivity: /*minEnumVariant*/ tagOnly }

export type BurningActivityMeta = EnumTypeMeta<
    {module: "uutMintingDelegate", enumName: "BurningActivity"}, {
        _placeholder2BA: singleEnumVariantMeta<BurningActivityMeta, "_placeholder2BA",
            "Constr#0", "singletonField", { recId: number[] /*singleVariantField*/ } , "noSpecialFlags"
        >
    }
>;


/**
 * BurningActivity enum variants
 * 
 * @remarks - expresses the essential raw data structures
 * supporting the **1 variant(s)** of the BurningActivity enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `BurningActivityHelper` class
 *     for generating UPLC data for this enum type
 */
export type BurningActivity = 
        | { _placeholder2BA: /*minEnumVariant*/ { recId: number[] /*singleVariantField*/ }  }

/**
 * BurningActivity enum variants (permissive)
 * 
 * @remarks - expresses the allowable data structures
 * for creating any of the **1 variant(s)** of the BurningActivity enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `BurningActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are 
 * converted by convention to the canonical types used in the on-chain context.
 */
export type BurningActivityLike = 
        | { _placeholder2BA: /*minEnumVariant*/ { recId: number[] /*singleVariantField*/ }  }

export type DelegateActivity$CreatingDelegatedData = {
    seed: TxOutputId  /*minVariantField*/ ,
    dataType: string  /*minVariantField*/ 
}

export type DelegateActivity$CreatingDelegatedDataLike = {
    seed: TxOutputId | string  /*minVariantField*/ ,
    dataType: string  /*minVariantField*/ 
}


export type DelegateActivity$UpdatingDelegatedData = {
    dataType: string  /*minVariantField*/ ,
    recId: number[]  /*minVariantField*/ 
}

export type DelegateActivity$UpdatingDelegatedDataLike = {
    dataType: string  /*minVariantField*/ ,
    recId: number[]  /*minVariantField*/ 
}


export type DelegateActivity$DeletingDelegatedData = {
    dataType: string  /*minVariantField*/ ,
    recId: number[]  /*minVariantField*/ 
}

export type DelegateActivity$DeletingDelegatedDataLike = {
    dataType: string  /*minVariantField*/ ,
    recId: number[]  /*minVariantField*/ 
}


export type DelegateActivityMeta = EnumTypeMeta<
    {module: "uutMintingDelegate", enumName: "DelegateActivity"}, {
        CapoLifecycleActivities: singleEnumVariantMeta<DelegateActivityMeta, "CapoLifecycleActivities",
            "Constr#0", "singletonField", { activity: CapoLifecycleActivity /*singleVariantField*/ } , "noSpecialFlags"
        >,
        DelegateLifecycleActivities: singleEnumVariantMeta<DelegateActivityMeta, "DelegateLifecycleActivities",
            "Constr#1", "singletonField", { activity: DelegateLifecycleActivity /*singleVariantField*/ } , "noSpecialFlags"
        >,
        SpendingActivities: singleEnumVariantMeta<DelegateActivityMeta, "SpendingActivities",
            "Constr#2", "singletonField", { activity: SpendingActivity /*singleVariantField*/ } , "noSpecialFlags"
        >,
        MintingActivities: singleEnumVariantMeta<DelegateActivityMeta, "MintingActivities",
            "Constr#3", "singletonField", { activity: MintingActivity /*singleVariantField*/ } , "noSpecialFlags"
        >,
        BurningActivities: singleEnumVariantMeta<DelegateActivityMeta, "BurningActivities",
            "Constr#4", "singletonField", { activity: BurningActivity /*singleVariantField*/ } , "noSpecialFlags"
        >,
        CreatingDelegatedData: singleEnumVariantMeta<DelegateActivityMeta, "CreatingDelegatedData",
            "Constr#5", 
            "fields", DelegateActivity$CreatingDelegatedData, "isSeededActivity"
        >,
        UpdatingDelegatedData: singleEnumVariantMeta<DelegateActivityMeta, "UpdatingDelegatedData",
            "Constr#6", 
            "fields", DelegateActivity$UpdatingDelegatedData, "noSpecialFlags"
        >,
        DeletingDelegatedData: singleEnumVariantMeta<DelegateActivityMeta, "DeletingDelegatedData",
            "Constr#7", 
            "fields", DelegateActivity$DeletingDelegatedData, "noSpecialFlags"
        >,
        MultipleDelegateActivities: singleEnumVariantMeta<DelegateActivityMeta, "MultipleDelegateActivities",
            "Constr#8", "singletonField", { activities: Array<UplcData> /*singleVariantField*/ } , "noSpecialFlags"
        >
    }
>;


/**
 * DelegateActivity enum variants
 * 
 * @remarks - expresses the essential raw data structures
 * supporting the **9 variant(s)** of the DelegateActivity enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `DelegateActivityHelper` class
 *     for generating UPLC data for this enum type
 */
export type DelegateActivity = 
        | { CapoLifecycleActivities: /*minEnumVariant*/ { activity: CapoLifecycleActivity /*singleVariantField*/ }  }
        | { DelegateLifecycleActivities: /*minEnumVariant*/ { activity: DelegateLifecycleActivity /*singleVariantField*/ }  }
        | { SpendingActivities: /*minEnumVariant*/ { activity: SpendingActivity /*singleVariantField*/ }  }
        | { MintingActivities: /*minEnumVariant*/ { activity: MintingActivity /*singleVariantField*/ }  }
        | { BurningActivities: /*minEnumVariant*/ { activity: BurningActivity /*singleVariantField*/ }  }
        | { CreatingDelegatedData: /*minEnumVariant*/ DelegateActivity$CreatingDelegatedData }
        | { UpdatingDelegatedData: /*minEnumVariant*/ DelegateActivity$UpdatingDelegatedData }
        | { DeletingDelegatedData: /*minEnumVariant*/ DelegateActivity$DeletingDelegatedData }
        | { MultipleDelegateActivities: /*minEnumVariant*/ { activities: Array<UplcData> /*singleVariantField*/ }  }

/**
 * DelegateActivity enum variants (permissive)
 * 
 * @remarks - expresses the allowable data structures
 * for creating any of the **9 variant(s)** of the DelegateActivity enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level `DelegateActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are 
 * converted by convention to the canonical types used in the on-chain context.
 */
export type DelegateActivityLike = 
        | { CapoLifecycleActivities: /*minEnumVariant*/ { activity: CapoLifecycleActivityLike /*singleVariantField*/ }  }
        | { DelegateLifecycleActivities: /*minEnumVariant*/ { activity: DelegateLifecycleActivityLike /*singleVariantField*/ }  }
        | { SpendingActivities: /*minEnumVariant*/ { activity: SpendingActivityLike /*singleVariantField*/ }  }
        | { MintingActivities: /*minEnumVariant*/ { activity: MintingActivityLike /*singleVariantField*/ }  }
        | { BurningActivities: /*minEnumVariant*/ { activity: BurningActivityLike /*singleVariantField*/ }  }
        | { CreatingDelegatedData: /*minEnumVariant*/ DelegateActivity$CreatingDelegatedDataLike }
        | { UpdatingDelegatedData: /*minEnumVariant*/ DelegateActivity$UpdatingDelegatedDataLike }
        | { DeletingDelegatedData: /*minEnumVariant*/ DelegateActivity$DeletingDelegatedDataLike }
        | { MultipleDelegateActivities: /*minEnumVariant*/ { activities: Array<UplcData> /*singleVariantField*/ }  }

/** ------------- hlbundle types END ------------- */

type makesDelegateDatum = makesUplcEnumData<DelegateDatumMeta>;

/**
 * A specialized minting delegate for testing purposes
 */
export default class BundleMintDelegateWithGenericUuts extends CapoDelegateBundle {
    get specializedDelegateModule() {
        return uutMintingMintDelegate;
    }

    // declare mkDatum: makesDelegateDatum;
    // declare readDatum: readsUplcEnumData<DelegateDatumMeta>;

    // declare Activity: makesUplcActivityEnumData<DelegateActivityMeta>;
}

if (false) {
    // ... type tests for Datum and Datum variants
    {
        type delegateDatumVariant = singleEnumVariantMeta<
        DelegateDatumMeta,
            "IsDelegation",
            "Constr#0",
            "singletonField",
            DelegationDetailLike,
            "noSpecialFlags"
        >;
        const delegateDatumNOTSeeded: delegateDatumVariant extends anySeededActivity
            ? false // seeded
            : true = true; // not seeded

        type delegateDatumVariantMaker =
            EnumVariantCreator<delegateDatumVariant>;
        const callVariantMaker: delegateDatumVariantMaker = (() => {}) as any;
        // sample calls for checking different type-signatures
        callVariantMaker({
            capoAddr: { fake: true } as unknown as Address,
            mph: { fake: true } as unknown as MintingPolicyHash,
            tn: textToBytes("tokenName1234"),
        });
        callVariantMaker({
            capoAddr: "fakeAddressAsString",
            mph: "fakeMphAsString",
            tn: textToBytes("tokenName1234"),
        });

        // negative case:
        callVariantMaker({
            capoAddr: "fakeAddress",
            mph: "fakeMph",
            //@ts-expect-error - string not OK here (NOTE: OK to make this more permissive later)
            tn: "badTokenName",
        });
    }

    {
        type nestedEnumVariant = singleEnumVariantMeta<
            DelegateDatumMeta, 
            "HasNestedEnum",
            "Constr#4", 
            "singletonField", { 
                nested: SomeEnum /*singleVariantField*/ 
            } , "noSpecialFlags"
        >

        type hasTestNestedEnum = nestedEnumVariant["data"];
        const nestedThingIsEnum: hasTestNestedEnum extends EnumTypeMeta<any, any>
            ? true
            : false = true;
        const nestedEnumVariantNOTSeeded: nestedEnumVariant["data"]["variants"]["hasNestedFields"] extends anySeededActivity
            ? false
            : true = true;

        type nestedEnumMaker = makesUplcActivityEnumData<hasTestNestedEnum>;
        const t: nestedEnumMaker = "fake" as any;
        const minimal = { n: 1n, m: {
            a: 1, 
            b: new Map(), 
            c: [], 
            d: null
        } };
        t.hasNestedFields({...minimal});

        t.hasNestedFields({
            m: {a: 1, b: new Map([ 
                // ["hey look ma", "no hands" ],
                ["hello", textToBytes("world") ] 
            ]), c: [true, false],  d: undefined },
            n: 42n,
        }) // should work

        t.hasNestedFields({
            m: {
                a: 1, 
                //@ts-expect-error - wrong type in map entry
                b: new Map([ 
                    ["hey look ma", "no hands" ],
            ]), 
            c: [] 
        },
            n: 42n,
        }) // should work

        const withoutOption = {
            m: {
                a: minimal.m.a,
                b: minimal.m.b,
                c: minimal.m.c,
            },
            n: 42n,
        }
        //@ts-expect-error - property d is missing - is an optional value, but has to be there - with null | undefined!
        t.hasNestedFields({...withoutOption})
    }
}

if (false) {
    // ... type tests for Activities and Activity variants

    {
        // seeded activity
        type seededVariant = singleEnumVariantMeta<
            DelegateActivityMeta,
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

        type seededVariantMaker = ActivityEnumVariantCreator<
            seededVariant,
            "redeemerWrapper"
        >;
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
        type unseededVariant = singleEnumVariantMeta<
            DelegateActivityMeta,
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
        type nestedEnumVariant = singleEnumVariantMeta<
            DelegateActivityMeta,
            "CapoLifecycleActivities",
            "Constr#0",
            "singletonField",
            CapoLifecycleActivity,
            "noSpecialFlags"
        >;

        type nestedEnum = nestedEnumVariant["data"];
        const nestedThingIsEnum: nestedEnum extends EnumTypeMeta<any, any>
            ? true
            : false = true;
        const nestedEnumVariantIsSeeded: nestedEnumVariant["data"]["variants"]["CreatingDelegate"] extends anySeededActivity
            ? true
            : false = true;
        type nestedEnumMaker = makesUplcActivityEnumData<nestedEnum>;
        const t: nestedEnumMaker = "fake" as any;
    }

    const integratedTest =
        "fake" as unknown as BundleMintDelegateWithGenericUuts;
    {
        // if these don't show type errors, then they're good expressions / type tests
        integratedTest.Activity.CreatingDelegatedData(
            {} as unknown as SeedAttrs,
            {
                dataType: "awesome",
            }
        );

        integratedTest.mkDatum.IsDelegation({
            capoAddr: "" as unknown as Address,
            mph: "",
            tn: [],
        });

        // todo: support an inline proxy for generating a nested enum:
        integratedTest.Activity.CapoLifecycleActivities.CreatingDelegate({
            seed: "" as unknown as TxOutputId,
            purpose: "awesome",
        });
        integratedTest.Activity.CapoLifecycleActivities.CreatingDelegate(
            {
                txId: "" as unknown as TxId,
                idx: 0n,
            },
            {
                purpose: "awesome",
            }
        );
    }
}
