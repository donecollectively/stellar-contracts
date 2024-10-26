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
import type { EnumTypeMeta, HeliosScriptBundle, makesUplcActivityEnumData, singleEnumVariantMeta, tagOnly } from "../helios/HeliosScriptBundle.js";
import type { 
    IntLike,
    ByteArrayLike,
 } from "@helios-lang/codec-utils";

/** ------------ BEGIN hlbundle types ------------ */
export type AnyData = {
    id: /*minStructField*/ number[]
    type: /*minStructField*/ string
}

export type AnyDataLike = {
    id: /*minStructField*/ number[]
    type: /*minStructField*/ string
}


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


export type DelegateDatum$Cip68RefToken = {
    cip68meta: AnyData  /*minVariantField*/ ,
    cip68version: bigint  /*minVariantField*/ ,
    dd: Option<DelegationDetail>  /*minVariantField*/ 
     }

export type DelegateDatum$Cip68RefTokenLike = {
    cip68meta: AnyDataLike  /*minVariantField*/ ,
    cip68version: IntLike  /*minVariantField*/ ,
    dd: Option<DelegationDetailLike>  /*minVariantField*/ 
     }


export type DelegateDatumMeta = EnumTypeMeta<
    {module: "unspecializedDelegate", enumName: "DelegateDatum"}, {
        Cip68RefToken: singleEnumVariantMeta<DelegateDatumMeta, "Cip68RefToken",
            "Constr#0", 
            "fields", DelegateDatum$Cip68RefToken, "noSpecialFlags"
        >,
        IsDelegation: singleEnumVariantMeta<DelegateDatumMeta, "IsDelegation",
            "Constr#1", "singletonField", DelegationDetail /*singleVariantField*/ , "noSpecialFlags"
        >,
        ScriptReference: singleEnumVariantMeta<DelegateDatumMeta, "ScriptReference",
            "Constr#2", "tagOnly", tagOnly, "noSpecialFlags"
        >
    }
>;

export type DelegateDatum = 
        | { Cip68RefToken: /*minEnumVariant*/ DelegateDatum$Cip68RefToken }
        | { IsDelegation: /*minEnumVariant*/ DelegationDetail /*singleVariantField*/  }
        | { ScriptReference: /*minEnumVariant*/ tagOnly }
export type DelegateDatumLike = 
        | { Cip68RefToken: /*minEnumVariant*/ DelegateDatum$Cip68RefTokenLike }
        | { IsDelegation: /*minEnumVariant*/ DelegationDetailLike /*singleVariantField*/  }
        | { ScriptReference: /*minEnumVariant*/ tagOnly }

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

export type CapoLifecycleActivity = 
        | { CreatingDelegate: /*minEnumVariant*/ CapoLifecycleActivity$CreatingDelegate }
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

export type DelegateLifecycleActivity = 
        | { ReplacingMe: /*minEnumVariant*/ DelegateLifecycleActivity$ReplacingMe }
        | { Retiring: /*minEnumVariant*/ tagOnly }
        | { ValidatingSettings: /*minEnumVariant*/ tagOnly }
export type DelegateLifecycleActivityLike = 
        | { ReplacingMe: /*minEnumVariant*/ DelegateLifecycleActivity$ReplacingMeLike }
        | { Retiring: /*minEnumVariant*/ tagOnly }
        | { ValidatingSettings: /*minEnumVariant*/ tagOnly }

export type SpendingActivityMeta = EnumTypeMeta<
    {module: "unspecializedDelegate", enumName: "SpendingActivity"}, {
        _placeholder1SA: singleEnumVariantMeta<SpendingActivityMeta, "_placeholder1SA",
            "Constr#0", "singletonField", number[] /*singleVariantField*/ , "noSpecialFlags"
        >
    }
>;

export type SpendingActivity = 
        | { _placeholder1SA: /*minEnumVariant*/ number[] /*singleVariantField*/  }
export type SpendingActivityLike = 
        | { _placeholder1SA: /*minEnumVariant*/ number[] /*singleVariantField*/  }

export type MintingActivityMeta = EnumTypeMeta<
    {module: "unspecializedDelegate", enumName: "MintingActivity"}, {
        _placeholder1MA: singleEnumVariantMeta<MintingActivityMeta, "_placeholder1MA",
            "Constr#0", "singletonField", TxOutputId /*singleVariantField*/ , "isSeededActivity"
        >
    }
>;

export type MintingActivity = 
        | { _placeholder1MA: /*minEnumVariant*/ TxOutputId /*singleVariantField*/  }
export type MintingActivityLike = 
        | { _placeholder1MA: /*minEnumVariant*/ TxOutputId | string /*singleVariantField*/  }

export type BurningActivityMeta = EnumTypeMeta<
    {module: "unspecializedDelegate", enumName: "BurningActivity"}, {
        _placeholder1BA: singleEnumVariantMeta<BurningActivityMeta, "_placeholder1BA",
            "Constr#0", "singletonField", number[] /*singleVariantField*/ , "noSpecialFlags"
        >
    }
>;

export type BurningActivity = 
        | { _placeholder1BA: /*minEnumVariant*/ number[] /*singleVariantField*/  }
export type BurningActivityLike = 
        | { _placeholder1BA: /*minEnumVariant*/ number[] /*singleVariantField*/  }

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
    {module: "unspecializedDelegate", enumName: "DelegateActivity"}, {
        CapoLifecycleActivities: singleEnumVariantMeta<DelegateActivityMeta, "CapoLifecycleActivities",
            "Constr#0", "singletonField", CapoLifecycleActivity /*singleVariantField*/ , "noSpecialFlags"
        >,
        DelegateLifecycleActivities: singleEnumVariantMeta<DelegateActivityMeta, "DelegateLifecycleActivities",
            "Constr#1", "singletonField", DelegateLifecycleActivity /*singleVariantField*/ , "noSpecialFlags"
        >,
        SpendingActivities: singleEnumVariantMeta<DelegateActivityMeta, "SpendingActivities",
            "Constr#2", "singletonField", SpendingActivity /*singleVariantField*/ , "noSpecialFlags"
        >,
        MintingActivities: singleEnumVariantMeta<DelegateActivityMeta, "MintingActivities",
            "Constr#3", "singletonField", MintingActivity /*singleVariantField*/ , "noSpecialFlags"
        >,
        BurningActivities: singleEnumVariantMeta<DelegateActivityMeta, "BurningActivities",
            "Constr#4", "singletonField", BurningActivity /*singleVariantField*/ , "noSpecialFlags"
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
            "Constr#8", "singletonField", Array<UplcData> /*singleVariantField*/ , "noSpecialFlags"
        >
    }
>;

export type DelegateActivity = 
        | { CapoLifecycleActivities: /*minEnumVariant*/ CapoLifecycleActivity /*singleVariantField*/  }
        | { DelegateLifecycleActivities: /*minEnumVariant*/ DelegateLifecycleActivity /*singleVariantField*/  }
        | { SpendingActivities: /*minEnumVariant*/ SpendingActivity /*singleVariantField*/  }
        | { MintingActivities: /*minEnumVariant*/ MintingActivity /*singleVariantField*/  }
        | { BurningActivities: /*minEnumVariant*/ BurningActivity /*singleVariantField*/  }
        | { CreatingDelegatedData: /*minEnumVariant*/ DelegateActivity$CreatingDelegatedData }
        | { UpdatingDelegatedData: /*minEnumVariant*/ DelegateActivity$UpdatingDelegatedData }
        | { DeletingDelegatedData: /*minEnumVariant*/ DelegateActivity$DeletingDelegatedData }
        | { MultipleDelegateActivities: /*minEnumVariant*/ Array<UplcData> /*singleVariantField*/  }
export type DelegateActivityLike = 
        | { CapoLifecycleActivities: /*minEnumVariant*/ CapoLifecycleActivityLike /*singleVariantField*/  }
        | { DelegateLifecycleActivities: /*minEnumVariant*/ DelegateLifecycleActivityLike /*singleVariantField*/  }
        | { SpendingActivities: /*minEnumVariant*/ SpendingActivityLike /*singleVariantField*/  }
        | { MintingActivities: /*minEnumVariant*/ MintingActivityLike /*singleVariantField*/  }
        | { BurningActivities: /*minEnumVariant*/ BurningActivityLike /*singleVariantField*/  }
        | { CreatingDelegatedData: /*minEnumVariant*/ DelegateActivity$CreatingDelegatedDataLike }
        | { UpdatingDelegatedData: /*minEnumVariant*/ DelegateActivity$UpdatingDelegatedDataLike }
        | { DeletingDelegatedData: /*minEnumVariant*/ DelegateActivity$DeletingDelegatedDataLike }
        | { MultipleDelegateActivities: /*minEnumVariant*/ Array<UplcData> /*singleVariantField*/  }

/** ------------- hlbundle types END ------------- */


export default class UnspecializedDgtBundle extends CapoDelegateBundle {
    get specializedDelegateModule() {
        return UnspecializedMintDelegate
    }
}

