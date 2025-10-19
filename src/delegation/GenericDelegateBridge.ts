import type { InlineTxOutputDatum } from "@helios-lang/ledger";
import type { IntLike } from "@helios-lang/codec-utils";
import type { UplcData } from "@helios-lang/uplc";

import type { isActivity } from "../ActivityTypes.js";
import type {
    ContractDataBridgeWithEnumDatum,
    DataBridgeReaderClass,
} from "../helios/dataBridge/DataBridge.js";
import type {
    EnumBridge,
    JustAnEnum,
} from "../helios/dataBridge/EnumBridge.js";

import type { AbstractNew } from "../helios/typeUtils.js";

import UnspecializedDelegateBridge, {
    DelegateActivityHelper,
    DelegateDatumHelper,
    SpendingActivityHelperNested,
    UnspecializedDelegateBridgeReader,
} from "./UnspecializedDelegate.bridge.js";
import type {
    AnyDataLike,
    DelegateDatum$capoStoredDataLike,
    DelegateDatum$Ergo$capoStoredData,
    ErgoDelegateDatum,
    minimalAnyData,
} from "./UnspecializedDelegate.typeInfo.js";
import type { AnyDataTemplate, minimalData } from "./DelegatedData.js";

/**
 * @public
 */
export type GenericDelegateBridgeClass = AbstractNew<GenericDelegateBridge>;

/**
 * @public
 */
export type GenericDelegateBridge = ContractDataBridgeWithEnumDatum &
    Pick<
        UnspecializedDelegateBridge,
        | "isAbstract"
        | "readData"
    > & {
        reader: SomeDgtBridgeReader;
        activity: EnumBridge<isActivity> & SomeDgtActivityHelper;
        DelegateActivity: EnumBridge<isActivity> & SomeDgtActivityHelper;
        datum: EnumBridge<JustAnEnum> & SomeDgtDatumHelper<any>;
        DelegateDatum: SomeDgtDatumHelper<any>;
        readDatum: (d: UplcData) => GenericDelegateDatum;
        types: Pick<
            UnspecializedDelegateBridge["types"],
            //  "PendingDelegateAction" |
            | "DelegateRole"
            | "ManifestActivity"
            | "CapoLifecycleActivity"
            | "DelegateLifecycleActivity"
            | "DelegationDetail"
        > & {
            SpendingActivity: EnumBridge<JustAnEnum>;
            MintingActivity: EnumBridge<JustAnEnum>;
            BurningActivity: EnumBridge<JustAnEnum>;
            DelegateDatum: SomeDgtDatumHelper<any>;
            DelegateActivity: EnumBridge<isActivity>;
        };
        // types: Omit<
        //     UnspecializedDelegateBridge["types"],
        //     | "SpendingActivity"
        //     | "MintingActivity"
        //     | "BurningActivity"
        //     | "AnyData"
        // > & {
        //     SpendingActivity: EnumBridge<JustAnEnum>;
        //     MintingActivity: EnumBridge<JustAnEnum>;
        //     BurningActivity: EnumBridge<JustAnEnum>;
        //     readDatum: (d: UplcData) => GenericDelegateDatum;
        // };
    };

type AbstractStoredData = DelegateDatum$Ergo$capoStoredData;
type AbstractStoredDataLike = DelegateDatum$capoStoredDataLike;
// , "data"> & {
//     data: unknown;
// };

    // export type GenericDelegateDatum = Omit<ErgoDelegateDatum, "capoStoredData"> & {
    //     capoStoredData?: unknown;
    // };
    
/**
 * @public
 */
export type GenericDelegateDatum = Partial<
    Pick<
        ErgoDelegateDatum,
        "Cip68RefToken" | "IsDelegation"
>> & {
    capoStoredData?: { 
        data: AnyDataTemplate<any,any>;
        version: bigint;
        otherDetails: unknown;
    };
    // capoStoredData?: AbstractStoredData;
};
// const t : "oo" extends unknown ? "yes" : "no" = "yes";

export type hasConcreteCapoStoredData = Required<GenericDelegateDatum>
export type SomeDgtDatumReader = SomeDgtBridgeReader & {
    readDatum: (d: UplcData) => hasConcreteCapoStoredData
}

type x = DelegateDatumHelper
type t = Pick<DelegateDatumHelper, "Cip68RefToken" | "IsDelegation">

/**
 * @public
 */
export type SomeDgtDatumHelper<T extends AnyDataTemplate<any,any>> = 
    EnumBridge<JustAnEnum> &
    Pick<DelegateDatumHelper, "Cip68RefToken" | "IsDelegation"> & {
        // capoStoredData(x: AbstractStoredDataLike): TxOutputDatum<"Inline">;
        capoStoredData(fields: {
            data: T;
            version: IntLike;
            otherDetails: UplcData;
        }): InlineTxOutputDatum;
    };
// DelegateDatumHelper;

// Omit<..., "SpendingActivity" | "MintingActivity" | "BurningActivity" | "ᱺᱺcast">
/**
 * @public
 */
type PartialReader = Pick<
    UnspecializedDelegateBridgeReader,
    // "PendingDelegateAction" |
    | "DelegateRole"
    | "ManifestActivity"
    | "CapoLifecycleActivity"
    | "DelegateLifecycleActivity"
    | "DelegationDetail"
>;

/**
 * @public
 */
export type SomeDgtBridgeReader = DataBridgeReaderClass &
    PartialReader & {
        bridge: GenericDelegateBridge;
        DelegateDatum(d: UplcData): unknown;

        SpendingActivity(d: UplcData): unknown;
        MintingActivity(d: UplcData): unknown;
        BurningActivity(d: UplcData): unknown;
        DelegateActivity(d: UplcData): unknown;
        // ᱺᱺcast: Cast<unknown, unknown>;
    };

/**
 * abstract interface for activity-helpers
 * @public
 */
export type SomeDgtActivityHelper = EnumBridge<isActivity> &
    // Omit<
    //     DelegateActivityHelper,
    //     "SpendingActivities" | "MintingActivities" | "BurningActivities"
    // >
    Pick<
        DelegateActivityHelper,
        | "CapoLifecycleActivities"
        | "DelegateLifecycleActivities"
        | "CreatingDelegatedData"
        | "UpdatingDelegatedData"
        | "DeletingDelegatedData"
        | "MultipleDelegateActivities"
    > & {
        SpendingActivities: EnumBridge<isActivity> & {
            isAbstract?: "NOTE: use a specific delegate to get concrete delegate activities";
        };
        MintingActivities: EnumBridge<isActivity> & {
            // $seeded$CreatingRecord: isActivity,
            isAbstract?: "NOTE: use a specific delegate to get concrete delegate activities";
        };
        BurningActivities: EnumBridge<isActivity> & {
            isAbstract?: "NOTE: use a specific delegate to get concrete delegate activities";
        };
    }
    //  & {
    //     [key in keyof DelegateActivityHelper as key extends
    //         | "SpendingActiivties"
    //         | "MintingActivities"
    //         | "BurningActivities"
    //         ? never
    //         : key]: DelegateActivityHelper[key];
    // };
