import type { UplcData } from "@helios-lang/uplc";
import type { StellarContract } from "../../StellarContract.js";
import type { AbstractNew, IF } from "../typeUtils.js";
import type { ContractDataBridge, DataBridge } from "./DataBridge.js";
export type { ErgoCapoManifestEntry, ErgoPendingCharterChange, RelativeDelegateLink } from "../scriptBundling/CapoHeliosBundle.typeInfo.js";
/**
 * @public
 */
export type mustFindDatumType<T extends canHaveDataBridge, CBT extends someContractBridgeType = mustFindConcreteContractBridgeType<T>> = CBT["datum"];
/**
 * @public
 */
export type mustFindReadDatumType<T extends canHaveDataBridge, CBT extends someContractBridgeType = mustFindConcreteContractBridgeType<T>> = undefined extends CBT["datum"] ? never : undefined extends CBT["readDatum"] ? never : CBT["readDatum"];
/**
 * @public
 */
export type mustFindConcreteContractBridgeType<T extends canHaveDataBridge, bridgeClassMaybe extends someContractBridgeClass = T["dataBridgeClass"] extends someContractBridgeClass ? T["dataBridgeClass"] : never, instanceMaybe extends InstanceType<bridgeClassMaybe> = InstanceType<bridgeClassMaybe> extends ContractDataBridge ? InstanceType<bridgeClassMaybe> : StellarContract<any> extends T ? any : never> = instanceMaybe;
/**
 * @public
 */
export type mustFindActivityType<T extends canHaveDataBridge, CBT extends someContractBridgeType = mustFindConcreteContractBridgeType<T>> = CBT["activity"];
/**
 * @public
 */
export type findReadDatumType<T extends canHaveDataBridge, CBT extends someContractBridgeType = possiblyAbstractContractBridgeType<T>> = IF<CBT["isAbstract"], readsUplcTo<any>, undefined extends CBT["datum"] ? never : undefined extends CBT["readDatum"] ? never : CBT["readDatum"]>;
/**
 * @public
 */
export type possiblyAbstractContractBridgeType<T extends canHaveDataBridge, bridgeClassMaybe extends someContractBridgeClass = T["dataBridgeClass"] extends someContractBridgeClass ? T["dataBridgeClass"] : T["dataBridgeClass"] extends undefined ? never : abstractContractBridgeClass, instanceMaybe extends InstanceType<bridgeClassMaybe> = InstanceType<bridgeClassMaybe> extends ContractDataBridge ? InstanceType<bridgeClassMaybe> : ContractDataBridge & InstanceType<bridgeClassMaybe>> = instanceMaybe;
/**
 * @public
 */
export type canHaveDataBridge = {
    dataBridgeClass?: AbstractNew<ContractDataBridge>;
};
/**
 * @public
 */
export type someContractBridgeClass = AbstractNew<ContractDataBridge>;
/**
 * @public
 */
export type someContractBridgeType = ContractDataBridge;
/**
 * @public
 */
export type readsUplcTo<T> = (d: UplcData) => T;
/**
 * @public
 */
export type abstractContractBridgeClass = typeof ContractDataBridge & {
    isAbstract: true;
};
/**
 * extracts the activity type from the declarations in its dataBridgeClass
 * @public
 */
export type findActivityType<T extends canHaveDataBridge, isSCBaseClass extends AnySC extends T ? true : false = AnySC extends T ? true : false, CBT extends someContractBridgeType = possiblyAbstractContractBridgeType<T>, activityHelper = CBT extends {
    activity: infer A;
} ? A : never> = IF<IF<CBT["isAbstract"], true, IF<isSCBaseClass, true, false, CANNOT_ERROR>, CANNOT_ERROR>, DataBridge, activityHelper, // CBT extends { activity: infer A } ? CBT["activity"] : never, //    activityHelper,
CANNOT_ERROR>;
/**
 * @public
 */
export type AnySC = StellarContract<any>;
/**
 * @public
 */
export type CANNOT_ERROR = never;
//# sourceMappingURL=BridgeTypes.d.ts.map