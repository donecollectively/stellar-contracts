import type { UplcData } from "@helios-lang/uplc";
import type { Capo } from "../../Capo.js";
import CapoDataBridge, {
    CapoActivityHelper,
    type types as CapoTypes,
    CapoDatumHelper,
} from "../../CapoHeliosBundle.bridge.js";
import { ContractBasedDelegate } from "../../delegation/ContractBasedDelegate.js";
import { BasicMintDelegate } from "../../minting/BasicMintDelegate.js";
import type { CapoMinter } from "../../minting/CapoMinter.js";
import {
    StellarContract,
    type stellarSubclass,
} from "../../StellarContract.js";

import type { MintDelegateWithGenericUuts } from "../../testing/specialMintDelegate/MintDelegateWithGenericUuts.js";
import MDWGU_Bridge, * as MDWGU from "../../testing/specialMintDelegate/uutMintingMintDelegate.bridge.js";
//     DelegateActivityHelper as MDWGU_DelegateActivityHelper,
// } from "../../testing/specialMintDelegate/uutMintingMintDelegate.bridge.js"

import type {
    DelegateDatum as MDWGU_DelegateDatum,
    DelegateActivity as MDWGU_DelegateActivity,
} from "../../testing/specialMintDelegate/uutMintingMintDelegate.typeInfo.js";
import {
    DataBridge,
    ContractDataBridge,
    ContractDataBridgeWithOtherDatum,
    ContractDataBridgeWithEnumDatum,
} from "./DataBridge.js";
import type { CapoDatum } from "../../CapoHeliosBundle.typeInfo.js";
import CapoMinterDataBridge, {
    MinterActivityHelper,
    type types as MinterTypes,
} from "../../minting/CapoMinter.bridge.js";
import type { EnumBridge } from "./EnumBridge.js";
import type { IntersectedEnum } from "../typeUtils.js";
import type { StellarDelegate } from "../../delegation/StellarDelegate.js";

type canHaveDataBridge = { dataBridgeClass: Option<typeof ContractDataBridge> };
type someContractBridgeClass = typeof ContractDataBridge &
    (abstract new (...args: any) => ContractDataBridge);
type abstractContractBridgeClass = typeof ContractDataBridge & {
    isAbstract: true;
};
type concreteContractBridgeClass = typeof ContractDataBridge & {
    isAbstract: false;
};
type abstractContractBridgeType = ContractDataBridge & { isAbstract: true };
type concreteContractBridgeType = ContractDataBridge & { isAbstract: false };
type someContractBridgeType = ContractDataBridge;

type someDataBridgeClass = typeof DataBridge &
    (abstract new (...args: any) => DataBridge);

export type mustFindConcreteContractBridgeType<
    T extends canHaveDataBridge,
    bridgeClassMaybe extends someContractBridgeClass = T["dataBridgeClass"] extends someContractBridgeClass
        ? T["dataBridgeClass"]
        : never,
    instanceMaybe extends InstanceType<bridgeClassMaybe> = InstanceType<bridgeClassMaybe> extends ContractDataBridge
        ? InstanceType<bridgeClassMaybe>
        : StellarContract<any> extends T
        ? any
        : never
> = instanceMaybe;
// > = InstanceType<bridgeClassMaybe> extends Option<ContractDataBridge>
//          ? InstanceType<bridgeClassMaybe>
//          : never

const h1: null extends null ? true : false = true;
const h2: never extends null ? true : false = true;
const h3: null extends never ? true : false = false;

export type possiblyAbstractContractBridgeType<
    T extends canHaveDataBridge,
    bridgeClassMaybe extends someContractBridgeClass = T["dataBridgeClass"] extends someContractBridgeClass
        ? T["dataBridgeClass"]
        : T["dataBridgeClass"] extends null
        ? never
        : abstractContractBridgeClass,
    instanceMaybe extends InstanceType<bridgeClassMaybe> = InstanceType<bridgeClassMaybe> extends ContractDataBridge
        ? InstanceType<bridgeClassMaybe>
        : //???                                  vvvvvvvvv
          ContractDataBridge & InstanceType<bridgeClassMaybe>
> = instanceMaybe;

type debugContractBridgeType<
    T extends canHaveDataBridge,
    DETAILS = any extends mustFindConcreteContractBridgeType<
        T,
        infer BRIDGE,
        infer INSTANCE
    >
        ? { inspected: T; bridgeType: BRIDGE; instanceType: INSTANCE }
        : never
> = DETAILS;

// hasBridge extends DataMaker = bridgeClassMaybe extends typeof DataMaker ? InstanceType<bridgeClassMaybe> : never,
// hasDatumMaybe = hasBridge extends {datum: infer DATUM} ?
//     hasBridge & {datum: DATUM } :
//     hasBridge & {datum: `datum accessor not detected`}
// // HasDatum extends (ReturnType<T["dataBridgeClass]"]> extends typeof DataMaker
// > = hasDatumMaybe;

const TYPE_ERROR = Symbol("TYPE_ERROR");
type TYPE_ERROR = typeof TYPE_ERROR;
export type TypeError<T extends string, moreInfo extends Object = {}> = {
    [TYPE_ERROR]: T;
    moreInfo: moreInfo;
};
function typeError<T extends string, moreInfo extends Object = {}>(
    msg: T,
    moreInfo?: moreInfo
): TypeError<T, moreInfo> {
    return {
        [TYPE_ERROR]: msg,
        moreInfo: (moreInfo || {}) as moreInfo,
    };
}

export type findDatumType<
    T extends { dataBridgeClass: Option<typeof ContractDataBridge> },
    CBT extends possiblyAbstractContractBridgeType<T> = possiblyAbstractContractBridgeType<T>,
    DT = CBT extends { datum: infer D }
        ? D
        : IF<
              CBT["isAbstract"],
              DataBridge,
              TypeError<
                  "NO 'datum' in bridgeType for contractClass",
                  { bridgeType: CBT; contractClass: T }
              >,
              CANNOT_ERROR
          >
> = DT;
// T extends DataMaker ?
//     T extends { datum : infer D } ? D : "can't infer required datum!?!"
//     : never;

const x: never extends any ? true : false = true;
const x2: any extends never ? true : false = true; // or false!!

export type debugDatumType<
    T extends canHaveDataBridge,
    DETAILS = any extends findDatumType<T, infer CBT, infer DT>
        ? { inspected: T; bridgeType: CBT; datumType: DT }
        : never
    // DETAILS = DT extends findDatumType<T, infer CBT, infer DT> ? { inspected: T, bridgeType: CBT, datumType: DT } : never
> = DETAILS;
// T extends canHaveDataBridge ? (
//     DT extends findDatumType<T> ? DETAILS :
//     TypeError<"NO 'datum' in bridgeType for contractClass", {contractClass:T}>
// )
// : TypeError<"NO 'dataBridgeClass' in contractClass", {contractClass: T}>;

export type findReadDatumType<
    T extends canHaveDataBridge,
    CBT extends someContractBridgeType = possiblyAbstractContractBridgeType<T>
    // BI extends bridgeInspector<T> = bridgeInspector<T>
> = IF<
    CBT["isAbstract"],
    readsUplcTo<any>,
    null extends CBT["datum"]
        ? /**??? */ never
        : null extends CBT["readDatum"]
        ? never
        : CBT["readDatum"]
    // : CBT["reader"] extends DataBridge
    // ? CBT["reader"]["datum"]
    // : never
    // CBT["datum"]["readData"]
>;

export type findActivityTypeOld<
    T extends canHaveDataBridge,
    BI extends bridgeInspector<T> = bridgeInspector<T>
> = IF<BI["isAbstractBridgeType"], DataBridge, BI["activityHelper"]>;

const fATo_test1: DataBridge extends findActivityTypeOld<BasicMintDelegate>
    ? true
    : false = true;
const fATo_test2: DataBridge extends findActivityTypeOld<StellarContract<any>>
    ? true
    : false = true;
const fATo_test3: DataBridge extends findActivityTypeOld<StellarDelegate>
    ? true
    : false = true;
const fATo_test4: DataBridge extends findActivityTypeOld<ContractBasedDelegate>
    ? true
    : false = true;
const fATo_test5: CapoActivityHelper extends findActivityTypeOld<Capo<any>>
    ? true
    : false = true;
const fATo_test6: MDWGU.DelegateActivityHelper extends findActivityTypeOld<MintDelegateWithGenericUuts>
    ? true
    : false = true;

export type findActivityType<
    T extends canHaveDataBridge,
    isSCBaseClass extends AnySC extends T ? true : false = AnySC extends T
        ? true
        : false,
    CBT extends someContractBridgeType = possiblyAbstractContractBridgeType<T>,
    activityHelper = CBT extends { activity: infer A } ? A : never
> = IF<
    IF<
        CBT["isAbstract"],
        true,
        IF<isSCBaseClass, true, false, CANNOT_ERROR>,
        CANNOT_ERROR
    >,
    DataBridge,
    activityHelper, // CBT extends { activity: infer A } ? CBT["activity"] : never, //    activityHelper,
    CANNOT_ERROR /* suppresses unreachable error alternative, given good Bool input to IF */
>;

{
    // high-level checks
    const fAT_test1: DataBridge extends findActivityType<BasicMintDelegate>
        ? true
        : false = true;
    const fAT_test2: DataBridge extends findActivityType<StellarContract<any>>
        ? true
        : false = true;
    const fAT_test3: DataBridge extends findActivityType<StellarDelegate>
        ? true
        : false = true;
    const fAT_test4: DataBridge extends findActivityType<ContractBasedDelegate>
        ? true
        : false = true;
    const fAT_test5: CapoActivityHelper extends findActivityType<Capo<any>>
        ? true
        : false = true;
    const fAT_test6: MDWGU.DelegateActivityHelper extends findActivityType<MintDelegateWithGenericUuts>
        ? true
        : false = true;

    // detailed checks / debugging
    type target = MintDelegateWithGenericUuts;
    // ^^^ change this to test different classes ^^^ 

    const db1: target extends canHaveDataBridge ? true : false = true;
    const db2: StellarContract<any> extends target ? true : false = false;
    type CBT = possiblyAbstractContractBridgeType<target>;
    const db3a: CBT extends abstractContractBridgeType ? true : false = false;
    const db3b: CBT extends someContractBridgeType ? true : false = true;

    type aht = CBT["activity"];
    type debugging = debugFAT<target>;
    // const db4: aht = {} as MDWGU_DelegateActivity;

    type debugFAT<
        T extends canHaveDataBridge,
        details = findActivityType<T> extends findActivityType<
            T,
            infer B,
            infer C,
            infer D
        >
            ? {
                  inspected: T;
                  isBaseClass: B;
                  bridgeType: C;
                  activityHelper: D;
              }
            : never
    > = details;
}

type definesContractBridge<T> = T extends { dataBridgeClass: infer DBC }
    ? DBC extends someContractBridgeClass
        ? DBC
        : never
    : never;
type baseDelegateDataBridge = definesContractBridge<ContractBasedDelegate>;
type capoDataBridge = definesContractBridge<Capo<any>>;
type AnySC = StellarContract<any>;
type abstractDataBridge = definesContractBridge<AnySC>;

type CANNOT_ERROR = never;

type bridgeInspector<
    // SC: the StellarContract or delegate class being inspected
    SC extends canHaveDataBridge,
    // the definition of type for that contract's dataBridgeClass (a class, not type of instances in that class)
    thatDefinedBridgeType extends someContractBridgeClass = definesContractBridge<SC>, // extends definesBridge<infer DBC> ? DBC : never;
    // true if the contract is a Capo contract (it always uses the same bridge)
    extendsCapoBridge = thatDefinedBridgeType extends capoDataBridge
        ? thatDefinedBridgeType
        : never,
    // true for any subclass of BasicMintDelegate
    isAnyMintDgt extends SC extends BasicMintDelegate
        ? true
        : false = SC extends BasicMintDelegate ? true : false,
    // - true if inspecting the BasicMintDelegate class exactly
    // - false, for subclasses of the basic mint delegate
    isTheBasicMintDgt extends BasicMintDelegate extends SC
        ? SC extends BasicMintDelegate
            ? true
            : false
        : false = BasicMintDelegate extends SC
        ? SC extends BasicMintDelegate
            ? true
            : false
        : false,
    // - true if the contract uses exactly the BasicMintDelegate's bridge class
    // - typed as an error message when extending the basic mint delegate
    //   ... without providing a bridge class matched to the custom mint delegate.
    // - 'never', when the contract is not a mint delegate
    // - returns the basic mint delegate's bridge class for the BasicMintDelegate.
    // - returns the bridge class for subclasses of BasicMintDelegate.
    usesMintDgtBridge extends
        | someContractBridgeClass
        | dataBridgeError<any> = IF<
        isAnyMintDgt,
        IF<
            isTheBasicMintDgt,
            thatDefinedBridgeType,
            definesContractBridge<BasicMintDelegate> extends thatDefinedBridgeType
                ? dataBridgeError<"BasicMintDelegate">
                : thatDefinedBridgeType, // not 'never'!
            CANNOT_ERROR /* suppresses unreachable error alternative, given good Bool input to IF */
        >,
        never,
        CANNOT_ERROR /* suppresses unreachable error alternative, given good Bool input to IF */
    >,
    // - true if the contract inherits from ContractBasedDelegate
    isAnyContractDgt extends SC extends ContractBasedDelegate
        ? true
        : false = SC extends ContractBasedDelegate ? true : false,
    // - true if the contract is exactly ContractBasedDelegate
    // - false for subclasses of ContractBasedDelegate
    isTheBaseContractDgt extends IF<
        isAnyContractDgt,
        ContractBasedDelegate extends SC ? true : false,
        false,
        boolean /* suppresses unreachable error alternative, given good Bool input to IF */
    > = IF<
        isAnyContractDgt,
        ContractBasedDelegate extends SC ? true : false,
        false,
        CANNOT_ERROR /* suppresses unreachable error alternative, given good Bool input to IF */
    >,
    // returns the data-bridge class for generic subclasses of ContractBasedDelegate
    // for mint-delegate, it returns 'never' to indicate that those subclasses are in
    //  ... a separate subtree of types.
    // for the ContractBasedDelegate itself, it returns the abstract bridge type
    // if the the contract isn't a contract-based delegate, it returns 'never'
    // if the contract-based delegate subclass fails to provide a bridge class, it
    // returns a type-error message.
    usesContractDgtBridge extends
        | someContractBridgeClass
        | dataBridgeError<any> = NEVERIF<
        isAnyMintDgt,
        IF<
            isTheBaseContractDgt,
            thatDefinedBridgeType,
            IF<
                isAnyContractDgt,
                definesContractBridge<ContractBasedDelegate> extends thatDefinedBridgeType
                    ? dataBridgeError<"ContractBasedDelegate">
                    : thatDefinedBridgeType,
                never,
                CANNOT_ERROR /* suppresses unreachable error alternative, given good Bool input to IF */
            >,
            CANNOT_ERROR /* suppresses unreachable error alternative, given good Bool input to IF */
        >,
        CANNOT_ERROR /* suppresses unreachable error alternative, given good Bool input to NEVERIF */
    >,
    isSCBaseClass extends AnySC extends SC ? true : false = AnySC extends SC
        ? true
        : false,
    // returns the data-bridge class for subclasses of StellarContract
    // for the StellarContract itself, it returns the abstract bridge type
    // if the contract subclasses one of the more specific varieties of contract, it returns 'never'
    // otherwise, a class not providing a bridge class returns a type-error message.
    usesOtherBridge extends
        | someContractBridgeClass
        | dataBridgeError<any> = NEVERIF<
        isAnyMintDgt,
        NEVERIF<
            isAnyContractDgt, // only true if it's outside the normal type tree
            // uses the generic bridge defined in the base StellarContract class?
            definesContractBridge<AnySC> extends thatDefinedBridgeType
                ? NEVERIF<
                      isSCBaseClass,
                      dataBridgeError<"StellarContract">,
                      CANNOT_ERROR /* suppresses unreachable error alternative, given good Bool input to NEVERIF */
                  >
                : never,
            CANNOT_ERROR /* suppresses unreachable error alternative, given good Bool input to NEVERIF */
        >,
        CANNOT_ERROR /* suppresses unreachable error given good Bool input to NEVERIF */
    >,
    // returns a specific bridge class for the contract
    // returns a type-error message if one of the above checks has a type-error
    // returns 'never' if the class doesn't define a specific bridge class.
    bridgeClass = OR<
        // IF<isMintDgt, usesMintDgtBridge>,
        usesMintDgtBridge,
        OR<usesOtherBridge, OR<usesContractDgtBridge, thatDefinedBridgeType>>
    >,
    // returns the abstract bridge type for the contract, if it is abstract.
    // returns 'never' when the contract defines a concrete bridge class  ???????
    isAbstractMDB extends boolean = isAbstractInSubtree<usesMintDgtBridge>,
    isAbstractCDB extends boolean = isAbstractInSubtree<usesContractDgtBridge>,
    isAbstractOB extends boolean = OR<
        isAbstractInSubtree<usesOtherBridge>,
        isSCBaseClass
    >,
    isAbstractBridgeType extends boolean = typeof ContractDataBridge extends thatDefinedBridgeType
        ? true
        : typeof ContractDataBridgeWithEnumDatum extends thatDefinedBridgeType
        ? true
        : typeof ContractDataBridgeWithOtherDatum extends thatDefinedBridgeType
        ? true
        : false,
    // returns the specific bridge type for the contract, if it isn't abstract.
    // returns 'never' if the has only an abstract bridge class.
    bridgeType = NEVERIF<
        isAbstractBridgeType,
        InstanceType<thatDefinedBridgeType>
    >,
    abstractBridgeType = IF<
        isAbstractBridgeType,
        InstanceType<thatDefinedBridgeType>,
        never
    >,
    // isDataMaker = bridgeType extends DataMaker ? true : false,
    readsDatumUplcAs = bridgeType extends { readDatum: readsUplcTo<infer RD> }
        ? RD
        : never,
    hasMkDatum = bridgeType extends { mkDatum: infer MkD } ? MkD : never,
    foundMkDatumType = findDatumType<SC>,
    activityHelper = IF<
        isSCBaseClass,
        DataBridge,
        IF_ISANY<
            SC,
            DataBridge,
            bridgeType extends { activity: infer A } ? A : never
        >
    >
> = {
    inspected: SC;
    thatDefinedBridgeType: thatDefinedBridgeType;
    extendsCapoBridge: extendsCapoBridge;
    isAnyMintDgt: isAnyMintDgt;
    isTheBasicMintDgt: isTheBasicMintDgt;
    usesMintDgtBridge: usesMintDgtBridge;
    isAnyContractDgt: isAnyContractDgt;
    isTheBaseContractDgt: isTheBaseContractDgt; //isAbstractContractDgt: isTheBaseContractDgt;
    usesContractDgtBridge: usesContractDgtBridge;
    usesOtherBridge: usesOtherBridge;
    bridgeClass: bridgeClass;
    isAbstractMDB: isAbstractMDB;
    isAbstractCDB: isAbstractCDB;
    isAbstractOB: isAbstractOB;
    isAbstractBridgeType: isAbstractBridgeType;
    abstractBridgeType: abstractBridgeType;
    bridgeType: bridgeType;
    readsDatumUplcAs: readsDatumUplcAs; // isDataMaker: isDataMaker;
    hasMkDatum: hasMkDatum;
    foundMkDatumType: foundMkDatumType;
    activityHelper: activityHelper;
};
const t: DataBridge extends never ? true : false = false;
const t2: never extends DataBridge ? true : false = true;

const testing = false;
if (testing) {
    // for testing NeverEntries
    const IS_A_NEVER = { IS_A_NEVER: true as const };
    const IS_AN_ANY = { IS_AN_ANY: true as const };
    // testing zone
    {
        type BISC = bridgeInspector<StellarContract<any>>;
        const NoAnysAllowed: BridgeAnyEntries<BISC> = {};
        const canHaveDataBridge: StellarContract<any> extends canHaveDataBridge
            ? true
            : false = true;
        type fDT = findDatumType<StellarContract<any>>;
        type debugCBridge = debugContractBridgeType<StellarContract<any>>;
        type debugDatum = debugDatumType<StellarContract<any>>;

        type BridgeBools = BridgeBooleanEntries<BISC>;
        const bools: BridgeBools = {
            isAnyMintDgt: false,
            isTheBasicMintDgt: false,
            isAnyContractDgt: false,
            isTheBaseContractDgt: false,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
            isAbstractBridgeType: true,
        };
        type NeverEntries = BridgeNeverEntries<BISC>;
        // const q : StellarContract<any>["dataBridgeClass"] extends null  ? true : false = false;
        const t1: StellarContract<any> extends { dataBridgeClass: infer DBC }
            ? DBC
            : never = ContractDataBridge;
        const t2: possiblyAbstractContractBridgeType<StellarContract<any>> =
            {} as ContractDataBridge;
        const t3: findActivityType<StellarContract<any>> = {} as DataBridge;

        // T extends { dataBridgeClass: Option<typeof ContractDataBridge> },
        // CBT extends possiblyAbstractContractBridgeType<T> = possiblyAbstractContractBridgeType<T>,
        // DT = CBT extends { datum: infer D }
        //     ? D
        //     : IF<CBT["isAbstract"], DataBridge, TypeError<"NO 'datum' in bridgeType for contractClass", { bridgeType: CBT; contractClass: T }>>

        const neverEntries: NeverEntries = {
            extendsCapoBridge: IS_A_NEVER,
            readsDatumUplcAs: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
            usesContractDgtBridge: IS_A_NEVER,
            usesMintDgtBridge: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            bridgeType: IS_A_NEVER,
        };
        type NonNeverEntries = BridgeNonNeverEntries<BISC>;
        const nonNeverEntries: NonNeverEntries = {
            bridgeClass: ContractDataBridgeWithEnumDatum,
            abstractBridgeType: {} as ContractDataBridgeWithOtherDatum,
            activityHelper: {} as DataBridge,
            inspected: {} as StellarContract<any>,
            foundMkDatumType: {} as DataBridge,
            thatDefinedBridgeType: ContractDataBridgeWithEnumDatum,
            //x@ts-expect-error DataMaker should go away here, replaced with never (above)
            // usesOtherBridge: DataMaker,
        };
    }

    {
        type BI_STD = bridgeInspector<StellarDelegate>;
        type BridgeBools = BridgeBooleanEntries<BI_STD>;
        const NoAnysAllowed: BridgeAnyEntries<BI_STD> = {};
        type dCB = definesContractBridge<StellarDelegate>;

        type delegateActivityType = StellarDelegate["activity"];
        type delegateSubclass = stellarSubclass<StellarDelegate>;
        type activity = StellarDelegate["activity"];
        type foundActivity = findActivityType<StellarDelegate>;

        const bools: BridgeBools = {
            isAnyMintDgt: false,
            isTheBasicMintDgt: false,
            isAnyContractDgt: false, // even a mint delegate is SOME sort of contract-having delegate
            isTheBaseContractDgt: false,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
            isAbstractBridgeType: true, // maybe should be true
        };
        type NeverEntries = BridgeNeverEntries<BI_STD>;
        const neverEntries: NeverEntries = {
            extendsCapoBridge: IS_A_NEVER,
            usesContractDgtBridge: IS_A_NEVER,
            usesMintDgtBridge: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            bridgeType: IS_A_NEVER,
            readsDatumUplcAs: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
            activityHelper: IS_A_NEVER,
        };

        type NonNeverEntries = BridgeNonNeverEntries<BI_STD>;
        const nonNeverEntries: NonNeverEntries = {
            inspected: {} as BasicMintDelegate,
            thatDefinedBridgeType: ContractDataBridgeWithEnumDatum,
            bridgeClass: ContractDataBridgeWithEnumDatum, // dataBridgeError("BasicMintDelegate"),
            foundMkDatumType: {} as EnumBridge<any, any>,
            abstractBridgeType:
                "" as unknown as ContractDataBridgeWithEnumDatum,
        };
    }

    {
        type BI_CBD = bridgeInspector<ContractBasedDelegate>;
        type BridgeBools = BridgeBooleanEntries<BI_CBD>;
        const NoAnysAllowed: BridgeAnyEntries<BI_CBD> = {};
        type dCB = definesContractBridge<ContractBasedDelegate>;

        type delegateActivityType = StellarDelegate["activity"];
        type CBDactivityType = ContractBasedDelegate["activity"];
        type delegateSubclass = stellarSubclass<StellarDelegate>;
        type CBDgtSubclass = stellarSubclass<ContractBasedDelegate>;
        const t: stellarSubclass<StellarDelegate> = ContractBasedDelegate;
        const t2: StellarDelegate = {} as ContractBasedDelegate;

        const bools: BridgeBools = {
            isAnyMintDgt: false,
            isTheBasicMintDgt: false,
            isAnyContractDgt: true, // even a mint delegate is SOME sort of contract-having delegate
            isTheBaseContractDgt: true,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
            isAbstractBridgeType: true, // maybe should be true
        };
        type NeverEntries = BridgeNeverEntries<BI_CBD>;
        const neverEntries: NeverEntries = {
            extendsCapoBridge: IS_A_NEVER,
            usesMintDgtBridge: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            bridgeType: IS_A_NEVER,
            readsDatumUplcAs: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
            activityHelper: IS_A_NEVER,
        };

        type NonNeverEntries = BridgeNonNeverEntries<BI_CBD>;
        const nonNeverEntries: NonNeverEntries = {
            inspected: {} as BasicMintDelegate,
            thatDefinedBridgeType: ContractDataBridgeWithEnumDatum,
            usesContractDgtBridge: ContractDataBridgeWithEnumDatum, // dataBridgeError("BasicMintDelegate"),
            bridgeClass: ContractDataBridgeWithEnumDatum, // dataBridgeError("BasicMintDelegate"),
            foundMkDatumType: {} as EnumBridge<any, any>,
            abstractBridgeType:
                "" as unknown as ContractDataBridgeWithEnumDatum,
        };
    }

    {
        type BI_BMD = bridgeInspector<BasicMintDelegate>;
        type BridgeBools = BridgeBooleanEntries<BI_BMD>;
        const NoAnysAllowed: BridgeAnyEntries<BI_BMD> = {};
        type dCB = definesContractBridge<BasicMintDelegate>;

        const bools: BridgeBools = {
            isAnyMintDgt: true,
            isTheBasicMintDgt: true,
            isAnyContractDgt: true, // even a mint delegate is SOME sort of contract-having delegate
            isTheBaseContractDgt: false,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
            isAbstractBridgeType: true, // maybe should be true
        };
        type NeverEntries = BridgeNeverEntries<BI_BMD>;
        const neverEntries: NeverEntries = {
            extendsCapoBridge: IS_A_NEVER,
            usesContractDgtBridge: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            bridgeType: IS_A_NEVER,
            readsDatumUplcAs: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
            activityHelper: IS_A_NEVER,
        };

        type NonNeverEntries = BridgeNonNeverEntries<BI_BMD>;
        const nonNeverEntries: NonNeverEntries = {
            inspected: {} as BasicMintDelegate,
            thatDefinedBridgeType: ContractDataBridgeWithEnumDatum,
            usesMintDgtBridge: ContractDataBridgeWithEnumDatum, // dataBridgeError("BasicMintDelegate"),
            bridgeClass: ContractDataBridgeWithEnumDatum, // dataBridgeError("BasicMintDelegate"),
            foundMkDatumType: {} as EnumBridge<any, any>,
            abstractBridgeType:
                "" as unknown as ContractDataBridgeWithEnumDatum,
        };
    }

    {
        type BItestDelegate = bridgeInspector<MintDelegateWithGenericUuts>;
        const BMDisAbstractBridgeTypes: bridgeInspector<BasicMintDelegate>["isAbstractBridgeType"] =
            true;

        const isBasicMintDelegate: MintDelegateWithGenericUuts extends BasicMintDelegate
            ? true
            : false = true;
        const testDgt: BasicMintDelegate = {} as MintDelegateWithGenericUuts;
        const isntAbstract: MDWGU_Bridge["isAbstract"] = false;
        //@ts-expect-error - should be false
        const isntWrongAbstract: MDWGU_Bridge["isAbstract"] = true;

        type MD_BT =
            possiblyAbstractContractBridgeType<MintDelegateWithGenericUuts>;
        const shouldntBeAbstract: IF<MD_BT["isAbstract"], true, false, never> =
            false;
        type datumExtracted = MD_BT["datum"];
        const datumIsNull: null extends datumExtracted ? true : false = false;
        type readDatum = MD_BT["readDatum"];
        type foundReadDatumType =
            findReadDatumType<MintDelegateWithGenericUuts>;

        type activity = MintDelegateWithGenericUuts["activity"];

        type AnyEntries = BridgeAnyEntries<BItestDelegate>;
        const NoAnysAllowed: AnyEntries = {
            usesMintDgtBridge: IS_AN_ANY, // should go away!
        };
        type BridgeBools = BridgeBooleanEntries<BItestDelegate>;
        const bools: BridgeBools = {
            isAnyMintDgt: true,
            isTheBasicMintDgt: false,
            isAnyContractDgt: true,
            isTheBaseContractDgt: false,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
            isAbstractBridgeType: false,
        };

        type NeverEntries = BridgeNeverEntries<BItestDelegate>;
        const neverEntries: NeverEntries = {
            extendsCapoBridge: IS_A_NEVER,
            usesContractDgtBridge: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            abstractBridgeType: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
        };
        type NonNeverEntries = BridgeNonNeverEntries<BItestDelegate>;
        const nonNeverEntries: NonNeverEntries = {
            inspected: {} as MintDelegateWithGenericUuts,
            thatDefinedBridgeType: MDWGU_Bridge,
            usesMintDgtBridge: MDWGU_Bridge,
            bridgeClass: MDWGU_Bridge,
            bridgeType: "" as unknown as MDWGU_Bridge,
            readsDatumUplcAs: {} as IntersectedEnum<MDWGU_DelegateDatum>,
            foundMkDatumType: {} as MDWGU.DelegateDatumHelper,
            activityHelper: "" as unknown as MDWGU.DelegateActivityHelper,
        };
    }

    {
        type BICapo = bridgeInspector<Capo<any>>;
        type BridgeBools = BridgeBooleanEntries<BICapo>;
        const bools: BridgeBools = {
            isAnyMintDgt: false,
            isTheBasicMintDgt: false,
            isAnyContractDgt: false,
            isTheBaseContractDgt: false,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
            isAbstractBridgeType: false,
        };
        type NeverEntries = BridgeNeverEntries<BICapo>;
        const neverEntries: NeverEntries = {
            usesMintDgtBridge: IS_A_NEVER,
            usesContractDgtBridge: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            abstractBridgeType: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
        };
        type NonNeverEntries = BridgeNonNeverEntries<BICapo>;
        const nonNeverEntries: NonNeverEntries = {
            inspected: {} as Capo<any>,
            thatDefinedBridgeType: CapoDataBridge,
            extendsCapoBridge: CapoDataBridge,
            bridgeClass: CapoDataBridge,
            bridgeType: {} as CapoDataBridge,
            readsDatumUplcAs: {} as IntersectedEnum<CapoDatum>,
            foundMkDatumType: {} as CapoDatumHelper,
            activityHelper: {} as CapoActivityHelper,
        };
    }

    {
        type BI_CapoMinter = bridgeInspector<CapoMinter>;
        type BridgeBools = BridgeBooleanEntries<BI_CapoMinter>;
        const NoAnysAllowed: BridgeAnyEntries<BI_CapoMinter> = {};
        type debugCBridge = debugContractBridgeType<CapoMinter>;
        type debugDatum = debugDatumType<CapoMinter>;

        const bools: BridgeBools = {
            isAnyMintDgt: false,
            isTheBasicMintDgt: false,
            isAnyContractDgt: false,
            isTheBaseContractDgt: false,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
            isAbstractBridgeType: false,
        };
        type NeverEntries = BridgeNeverEntries<BI_CapoMinter>;
        const neverEntries: NeverEntries = {
            extendsCapoBridge: IS_A_NEVER,
            usesMintDgtBridge: IS_A_NEVER,
            usesContractDgtBridge: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            abstractBridgeType: IS_A_NEVER,
            readsDatumUplcAs: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
        };
        type NonNeverEntries = BridgeNonNeverEntries<BI_CapoMinter>;
        const nonNeverEntries: NonNeverEntries = {
            inspected: {} as CapoMinter,
            thatDefinedBridgeType: CapoMinterDataBridge,
            bridgeClass: CapoMinterDataBridge,
            bridgeType: {} as CapoMinterDataBridge,
            foundMkDatumType: null, // no datum here
            activityHelper: {} as MinterActivityHelper,
        };
    }

    {
        class incompleteMintDgt extends BasicMintDelegate {
            something = "hi";
        }
        //@ts-expect-error
        const incompleteBridge: BI_IMD["bridgeClass"] = ContractDataBridge;
        const bridgeClassError: BI_IMD["bridgeClass"] =
            dataBridgeError("BasicMintDelegate");

        type BI_IMD = bridgeInspector<incompleteMintDgt>;
        type BridgeBools = BridgeBooleanEntries<BI_IMD>;
        const bools: BridgeBools = {
            isAnyMintDgt: true,
            isTheBasicMintDgt: false,
            isAbstractBridgeType: true, // maybe should be true
            isTheBaseContractDgt: false,
            isAnyContractDgt: true, // even a mint delegate is SOME sort of contract-having delegate
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
        };
        const NoAnysAllowed: BridgeAnyEntries<BI_IMD> = {};
        type NeverEntries = BridgeNeverEntries<BI_IMD>;
        const neverEntries: NeverEntries = {
            activityHelper: IS_A_NEVER,
            extendsCapoBridge: IS_A_NEVER,
            readsDatumUplcAs: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
            bridgeType: IS_A_NEVER,
            usesContractDgtBridge: IS_A_NEVER,
        };

        type NonNeverEntries = BridgeNonNeverEntries<BI_IMD>;
        const nonNeverEntries: NonNeverEntries = {
            inspected: {} as incompleteMintDgt,
            thatDefinedBridgeType: ContractDataBridgeWithEnumDatum,
            bridgeClass: dataBridgeError("BasicMintDelegate"),
            usesMintDgtBridge: dataBridgeError("BasicMintDelegate"),
            foundMkDatumType: {} as EnumBridge<any, any>,
            abstractBridgeType:
                "" as unknown as ContractDataBridgeWithEnumDatum,
        };
    }

    // const t6 : never extends never ? true : false = true;
    // any -> never = true | false (INDETERMINATE! )
    // const t2 : any extends never ? true : false = false;
    // const t3 : any extends never ? true : false = true;
}

// lower-level utility stuff

type anyBridgeInspector = bridgeInspector<
    any, //SC
    any, // thatDefinedBridgeType
    any, // extendsCapoBridge
    any, // isAnyMintDgt
    any, // isTheBasicMintDgt
    any, // usesMintDgtBridge
    any, // isAnyContractDgt
    any, // isTheBaseContractDgt
    any, // usesContractDgtBridge
    any, // isSCBaseClass
    any, // usesOtherBridge
    any, // bridgeClass
    any, // isAbstractMDB
    any, // isAbstractCDB
    any, // isAbstractOB
    any, // isAbstractBridgeType
    any, // bridgeType
    any, // readsDatumUplcAs
    any, // hasMkDatum
    any // activityHelper
>;

function dataBridgeError<T extends string>(s: T): dataBridgeError<T> {
    return `Type error: must override ${s}'s dataBridgeClass`;
}

type dataBridgeError<T extends string> =
    `Type error: must override ${T}'s dataBridgeClass`;

const b1: true extends boolean ? true : false = true;
const b2: false extends boolean ? true : false = true;
const b3: boolean extends true ? true : false = false;
const b4: boolean extends false ? true : false = false;
const b5: [true] extends [true] ? true : false = true;
const b6: [true] extends [false] ? true : false = false;
const b7: [false] extends [true] ? true : false = false;
const b8: [false] extends [false] ? true : false = true;

const IfNeedsConstBool =
    'the IF<...> type only detects constant-typed boolean inputs (such as "true}" as const';
type needsConstBool = TypeError<typeof IfNeedsConstBool>;
const lacksConstBool: needsConstBool = typeError(IfNeedsConstBool);
type IF<T1 extends boolean | never, T2, ELSE = never, ERR_TYPE = unknown> = [
    true | false
] extends [T1]
    ? ERR_TYPE
    : true extends T1
    ? T2
    : ELSE;

class FooTestIf {
    static something = true as const;
    somethingElse = true as const;

    static justBoolStatic = true;
    justBool = true;
}

const IF_TEST1: IF<ISNEVER<true>, true, false, needsConstBool> = false;
const IF_TEST2: IF<never, true, false, needsConstBool> = false;
const IF_TEST3a: IF<
    (typeof FooTestIf)["something"],
    true,
    false,
    needsConstBool
> = true;
const IF_TEST3b: IF<FooTestIf["somethingElse"], true, false, needsConstBool> =
    true;
//@ts-expect-error false is not assignable to true
const IF_TEST4aNeg: IF<
    (typeof FooTestIf)["something"],
    true,
    false,
    needsConstBool
> = false;
//@ts-expect-error false is not assignable to true
const IF_TEST4bNeg: IF<
    FooTestIf["somethingElse"],
    true,
    false,
    needsConstBool
> = false;
const IF_TEST4c: IF<FooTestIf["justBool"], true, false, needsConstBool> =
    lacksConstBool;
const IF_TEST4cStatic: IF<
    (typeof FooTestIf)["justBoolStatic"],
    true,
    false,
    needsConstBool
> = lacksConstBool;

type ISNEVER<T, ELSE = never> = [T] extends [never] ? true : ELSE;
type IFISNEVER<T, IFNEVER, ELSE = never> = [T] extends [never] ? IFNEVER : ELSE;
type IF_ISANY<T, IFANY, ELSE = never> = [0] extends [1 & T] ? IFANY : ELSE;
type ISSOME<T, ELSE = never> = [T] extends [never] ? ELSE : true;
type NEVERIF<T extends boolean | never, ELSE, ifError = unknown> = IF<
    T,
    never,
    ELSE,
    ifError
>;
type OR<T1, T2> = [T1] extends [never] ? T2 : T1;

const ISNEVER_TEST: IF<ISNEVER<never>, true> = true;
const ALSO_IF_TEST: IF<ISNEVER<never>, true> = true;
const IF_ISANY_TEST: IF_ISANY<never, true, false> = false;
const IF_ISANY_TEST2: IF_ISANY<any, true, false> = true;
const IF_ISANY_TEST3: IF_ISANY<unknown, true, false> = false;
const IF_ISANY_TEST4: IF_ISANY<"hi", true, false> = false;

// const neverExtendsTrueYuck : never extends true ? true : false = true;
// const trueDOESNTExtendNever : true extends never ? true : false = false;
// const iF_TEST4 : IF<42, true, false> = true; // not yet with numeric
const NEVER_ALWAYS_EXTENDS_ANYTHING: never extends any ? true : false = true;
// const t2 : unknown extends any ? true : false = true;
// const t3 : any extends unknown ? true : false = true;
// const t4 : unknown extends never ? true : false = false
// const t5 : never extends unknown ? true : false = true
// const t6: never extends true ? true : false = true;

type BridgeAnyEntries<T extends anyBridgeInspector> = {
    [k in keyof T as IF_ISANY<T[k], k>]: IF_ISANY<T[k], { IS_AN_ANY: true }>;
};

// includes ALL and ONLY the entries that are never
// objects of this type are invalid without all the items (they're always = true)
type BridgeNeverEntries<T extends anyBridgeInspector> = {
    [k in keyof T as IFISNEVER<T[k], k, never>]: IF<
        ISNEVER<T[k]>,
        { IS_A_NEVER: true }
    >;
};

// includes ONLY entries not never
// omits boolean-typed entries
type BridgeNonNeverEntries<T extends anyBridgeInspector> = {
    [k in keyof T as IFISNEVER<
        T[k],
        never,
        T[k] extends boolean ? never : k
    >]: T[k];
};

type isAbstractInSubtree<
    D extends someContractBridgeClass | dataBridgeError<any> | never,
    BC extends someContractBridgeClass = definesContractBridge<D>
> = IFISNEVER<
    BC,
    false,
    D extends dataBridgeError<any> /*error message*/ ? true : never
>;

type BridgeBooleanEntries_int<T extends anyBridgeInspector> = {
    [k in keyof T as T[k] extends boolean
        ? IFISNEVER<T[k], never, k>
        : never]: T[k];
};
type BridgeBooleanEntries<T extends anyBridgeInspector> = {
    [k in keyof BridgeBooleanEntries_int<T>]: BridgeBooleanEntries_int<T>[k];
};

export type readsUplcTo<T> = (d: UplcData) => T;
