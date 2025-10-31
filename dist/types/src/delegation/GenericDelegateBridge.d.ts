import type { InlineTxOutputDatum } from "@helios-lang/ledger";
import type { IntLike } from "@helios-lang/codec-utils";
import type { UplcData } from "@helios-lang/uplc";
import type { isActivity } from "../ActivityTypes.js";
import type { ContractDataBridgeWithEnumDatum, DataBridgeReaderClass } from "../helios/dataBridge/DataBridge.js";
import type { EnumBridge, JustAnEnum } from "../helios/dataBridge/EnumBridge.js";
import type { AbstractNew } from "../helios/typeUtils.js";
import UnspecializedDelegateBridge, { DelegateActivityHelper, DelegateDatumHelper, UnspecializedDelegateBridgeReader } from "./UnspecializedDelegate.bridge.js";
import type { ErgoDelegateDatum } from "./UnspecializedDelegate.typeInfo.js";
import type { AnyDataTemplate } from "./DelegatedData.js";
/**
 * @public
 */
export type GenericDelegateBridgeClass = AbstractNew<GenericDelegateBridge>;
/**
 * @public
 */
export type GenericDelegateBridge = ContractDataBridgeWithEnumDatum & Pick<UnspecializedDelegateBridge, "isAbstract" | "readData"> & {
    reader: SomeDgtBridgeReader;
    activity: EnumBridge<isActivity> & SomeDgtActivityHelper;
    DelegateActivity: EnumBridge<isActivity> & SomeDgtActivityHelper;
    datum: EnumBridge<JustAnEnum> & SomeDgtDatumHelper<any>;
    DelegateDatum: SomeDgtDatumHelper<any>;
    readDatum: (d: UplcData) => GenericDelegateDatum;
    types: Pick<UnspecializedDelegateBridge["types"], "DelegateRole" | "ManifestActivity" | "CapoLifecycleActivity" | "DelegateLifecycleActivity" | "DelegationDetail"> & {
        SpendingActivity: EnumBridge<JustAnEnum>;
        MintingActivity: EnumBridge<JustAnEnum>;
        BurningActivity: EnumBridge<JustAnEnum>;
        DelegateDatum: SomeDgtDatumHelper<any>;
        DelegateActivity: EnumBridge<isActivity>;
    };
};
/**
 * @public
 */
export type GenericDelegateDatum = Partial<Pick<ErgoDelegateDatum, "Cip68RefToken" | "IsDelegation">> & {
    capoStoredData?: {
        data: AnyDataTemplate<any, any>;
        version: bigint;
        otherDetails: unknown;
    };
};
export type hasConcreteCapoStoredData = Required<GenericDelegateDatum>;
export type SomeDgtDatumReader = SomeDgtBridgeReader & {
    readDatum: (d: UplcData) => hasConcreteCapoStoredData;
};
/**
 * @public
 */
export type SomeDgtDatumHelper<T extends AnyDataTemplate<any, any>> = EnumBridge<JustAnEnum> & Pick<DelegateDatumHelper, "Cip68RefToken" | "IsDelegation"> & {
    capoStoredData(fields: {
        data: T;
        version: IntLike;
        otherDetails: UplcData;
    }): InlineTxOutputDatum;
};
/**
 * @public
 */
type PartialReader = Pick<UnspecializedDelegateBridgeReader, "DelegateRole" | "ManifestActivity" | "CapoLifecycleActivity" | "DelegateLifecycleActivity" | "DelegationDetail">;
/**
 * @public
 */
export type SomeDgtBridgeReader = DataBridgeReaderClass & PartialReader & {
    bridge: GenericDelegateBridge;
    DelegateDatum(d: UplcData): unknown;
    SpendingActivity(d: UplcData): unknown;
    MintingActivity(d: UplcData): unknown;
    BurningActivity(d: UplcData): unknown;
    DelegateActivity(d: UplcData): unknown;
};
/**
 * abstract interface for activity-helpers
 * @public
 */
export type SomeDgtActivityHelper = EnumBridge<isActivity> & Pick<DelegateActivityHelper, "CapoLifecycleActivities" | "DelegateLifecycleActivities" | "CreatingDelegatedData" | "UpdatingDelegatedData" | "DeletingDelegatedData" | "MultipleDelegateActivities"> & {
    SpendingActivities: EnumBridge<isActivity> & {
        isAbstract?: "NOTE: use a specific delegate to get concrete delegate activities";
    };
    MintingActivities: EnumBridge<isActivity> & {
        isAbstract?: "NOTE: use a specific delegate to get concrete delegate activities";
    };
    BurningActivities: EnumBridge<isActivity> & {
        isAbstract?: "NOTE: use a specific delegate to get concrete delegate activities";
    };
};
export {};
//# sourceMappingURL=GenericDelegateBridge.d.ts.map