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

import DgDtest_Bridge, * as DgDtest from "../../testing/DelegatedDatumTester.bridge.js";

import type {
    ErgoDelegateDatum as MDWGU_ErgoDelegateDatum,
    DelegateActivity as MDWGU_DelegateActivity,
} from "../../testing/specialMintDelegate/uutMintingMintDelegate.typeInfo.js";
import {
    DataBridge,
    ContractDataBridge,
    ContractDataBridgeWithOtherDatum,
    ContractDataBridgeWithEnumDatum,
    DataBridgeReaderClass,
} from "./DataBridge.js";
import type { CapoDatum } from "../../CapoHeliosBundle.typeInfo.js";
import CapoMinterDataBridge, {
    MinterActivityHelper,
    type types as MinterTypes,
} from "../../minting/CapoMinter.bridge.js";
import type { EnumBridge } from "./EnumBridge.js";
import type {
    IF,
    IF_ISANY,
    IFISNEVER,
    IntersectedEnum,
    ISNEVER,
    NEVERIF,
    OR,
    TypeError,
} from "../typeUtils.js";
import type { StellarDelegate } from "../../delegation/StellarDelegate.js";
import type {
    GenericDelegateBridge,
    GenericDelegateBridgeClass,
    GenericDelegateDatum,
    SomeDgtActivityHelper,
    SomeDgtDatumHelper,
    SomeDgtDatumReader,
} from "../../delegation/GenericDelegateBridge.js";
import type { ErgoDelegateDatum } from "../../delegation/UnspecializedDelegate.typeInfo.js";
import DelegateDatumTesterDataBridge from "../../testing/DelegatedDatumTester.bridge.js";
import type { DelegatedDatumTester } from "../../testing/DelegatedDatumTester.js";
import {
    DelegatedDataContract,
    type DgDataType,
    type DgDataTypeLike,
    type minimalDgDataTypeLike,
} from "../../delegation/DelegatedDataContract.js";
import type { DgDatumTestData } from "../../testing/DelegatedDatumTester.typeInfo.js";
import type { Expand } from "../../testing/types.js";
import type { AnyDataTemplate } from "../../delegation/DelegatedData.js";
type canHaveDataBridge = { dataBridgeClass?: AbstractNew<ContractDataBridge> };
type someContractBridgeClass = //typeof ContractDataBridge &
    AbstractNew<ContractDataBridge>;
type abstractContractBridgeClass = typeof ContractDataBridge & {
    isAbstract: true;
};
type concreteContractBridgeClass = typeof ContractDataBridge & {
    isAbstract: false;
};
type abstractContractBridgeType = ContractDataBridge & { isAbstract: true };
type concreteContractBridgeType = ContractDataBridge & { isAbstract: false };
type someContractBridgeType = ContractDataBridge;

export type AbstractNew<T = any> = abstract new (...args: any) => T;

type someDataBridgeClass = typeof DataBridge & AbstractNew<DataBridge>;

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
        : T["dataBridgeClass"] extends undefined
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

export type findDatumType<
    T extends { dataBridgeClass?: AbstractNew<ContractDataBridge> },
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

export type mustFindDatumType<
    T extends canHaveDataBridge,
    CBT extends someContractBridgeType = mustFindConcreteContractBridgeType<T>
> = CBT["datum"];

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

export type mustFindReadDatumType<
    T extends canHaveDataBridge,
    CBT extends someContractBridgeType = mustFindConcreteContractBridgeType<T>
    // BI extends bridgeInspector<T> = bridgeInspector<T>
> = undefined extends CBT["datum"]
    ? /**??? */ never
    : undefined extends CBT["readDatum"]
    ? never
    : CBT["readDatum"];

export type findReadDatumType<
    T extends canHaveDataBridge,
    CBT extends someContractBridgeType = possiblyAbstractContractBridgeType<T>
    // BI extends bridgeInspector<T> = bridgeInspector<T>
> = IF<
    CBT["isAbstract"],
    readsUplcTo<any>,
    undefined extends CBT["datum"]
        ? /**??? */ never
        : undefined extends CBT["readDatum"]
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

const fATo_test1: SomeDgtActivityHelper extends findActivityTypeOld<BasicMintDelegate>
    ? true
    : false = true;
const fATo_test2: DataBridge extends findActivityTypeOld<StellarContract<any>>
    ? true
    : false = true;
const fATo_test3: DataBridge extends findActivityTypeOld<StellarDelegate>
    ? true
    : false = true;
const fATo_test4: SomeDgtActivityHelper extends findActivityTypeOld<ContractBasedDelegate>
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

const fAT_test1: SomeDgtActivityHelper extends findActivityType<BasicMintDelegate>
    ? true
    : false = true;
const fAT_test2: DataBridge extends findActivityType<StellarContract<any>>
    ? true
    : false = true;
const fAT_test3: DataBridge extends findActivityType<StellarDelegate>
    ? true
    : false = true;
const fAT_test4: SomeDgtActivityHelper extends findActivityType<ContractBasedDelegate>
    ? true
    : false = true;
const fAT_test5: CapoActivityHelper extends findActivityType<Capo<any>>
    ? true
    : false = true;
const fAT_test6: MDWGU.DelegateActivityHelper extends findActivityType<MintDelegateWithGenericUuts>
    ? true
    : false = true;

export type mustFindActivityType<
    T extends canHaveDataBridge,
    CBT extends someContractBridgeType = mustFindConcreteContractBridgeType<T>
> = CBT["activity"];

{
    // high-level checks
    const fAT_test1: SomeDgtActivityHelper extends findActivityType<BasicMintDelegate>
        ? true
        : false = true;
    const fAT_test2: DataBridge extends findActivityType<StellarContract<any>>
        ? true
        : false = true;
    const fAT_test3: DataBridge extends findActivityType<StellarDelegate>
        ? true
        : false = true;
    const fAT_test4: SomeDgtActivityHelper extends findActivityType<ContractBasedDelegate>
        ? true
        : false = true;
    const fAT_test5: CapoActivityHelper extends findActivityType<Capo<any>>
        ? true
        : false = true;
    const fAT_test6: MDWGU.DelegateActivityHelper extends findActivityType<MintDelegateWithGenericUuts>
        ? true
        : false = true;
    const fAT_test6b: SomeDgtActivityHelper extends findActivityType<MintDelegateWithGenericUuts>
        ? true
        : false = false;

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
            someContractBridgeClass extends thatDefinedBridgeType
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
    isTheBaseDgDataContract extends IF<
        isAnyContractDgt,
        DelegatedDataContract<any, any> extends SC ? true : false,
        false,
        boolean /* suppresses unreachable error alternative, given good Bool input to IF */
    > = IF<
        isAnyContractDgt,
        DelegatedDataContract<any, any> extends SC ? true : false,
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
                isTheBaseDgDataContract,
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
    isAbstractBridgeType extends boolean = IFISNEVER<
        thatDefinedBridgeType,
        true,
        typeof ContractDataBridge extends thatDefinedBridgeType
            ? true
            : // : GenericDelegateBridge extends thatDefinedBridgeType ? true
            typeof ContractDataBridgeWithEnumDatum extends thatDefinedBridgeType
            ? true
            : typeof ContractDataBridgeWithOtherDatum extends thatDefinedBridgeType
            ? true
            : false
    >,
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
        type SCBT = definesContractBridge<StellarContract<any>>;
        const um: typeof ContractDataBridge extends SCBT ? true : false = true;

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

        // T extends { dataBridgeClass?: typeof ContractDataBridge },
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

        // type delegateActivityType = StellarDelegate["activity"];
        type delegateSubclass = stellarSubclass<StellarDelegate>;
        // type activity = StellarDelegate["activity"];
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
        const MinimalAnysAllowed: BridgeAnyEntries<BI_CBD> = {
            readsDatumUplcAs: IS_AN_ANY,
        };
        type dCB = definesContractBridge<ContractBasedDelegate>;

        // type delegateActivityType = StellarDelegate["activity"];
        type CBDactivityType = ContractBasedDelegate["activity"];
        type delegateSubclass = stellarSubclass<StellarDelegate>;
        type CBDgtSubclass = stellarSubclass<ContractBasedDelegate>;
        const t: stellarSubclass<StellarDelegate> = ContractBasedDelegate;
        const t2: StellarDelegate = {} as ContractBasedDelegate;

        const hasReadDatum: BI_CBD["bridgeType"]["readDatum"] extends readsUplcTo<
            infer RD
        >
            ? true
            : false = true;

        type CDB_iType = InstanceType<
            definesContractBridge<ContractBasedDelegate>
        >;

        const readsDatumToGenericDatum: GenericDelegateDatum extends BI_CBD["readsDatumUplcAs"]
            ? IF_ISANY<BI_CBD["readsDatumUplcAs"], false, true>
            : false = true;


        type datumType = Expand<mustFindDatumType<ContractBasedDelegate>>

        const bools: BridgeBools = {
            isAnyMintDgt: false,
            isTheBasicMintDgt: false,
            isAnyContractDgt: true, // even a mint delegate is SOME sort of contract-having delegate
            isTheBaseContractDgt: true,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
            isAbstractBridgeType: false, // it's "partially" abstract, in that much of it is well defined
        };
        type NeverEntries = BridgeNeverEntries<BI_CBD>;
        const neverEntries: NeverEntries = {
            // bridgeType: IS_A_NEVER,
            // readsDatumUplcAs: IS_A_NEVER,
            // activityHelper: IS_A_NEVER,
            extendsCapoBridge: IS_A_NEVER,
            usesMintDgtBridge: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
            abstractBridgeType: IS_A_NEVER,
        };

        type NonNeverEntries = BridgeNonNeverEntries<BI_CBD>;
        const nonNeverEntries: NonNeverEntries = {
            inspected: {} as ContractBasedDelegate,
            thatDefinedBridgeType: {} as GenericDelegateBridgeClass, // ContractDataBridgeWithEnumDatum,
            usesContractDgtBridge: {} as GenericDelegateBridgeClass, // ContractDataBridgeWithEnumDatum,
            bridgeClass: {} as GenericDelegateBridgeClass, // ContractDataBridgeWithEnumDatum, // dataBridgeError("BasicMintDelegate"),
            foundMkDatumType: {} as SomeDgtDatumHelper<any>,
            // abstractBridgeType:
            //     "" as unknown as ContractDataBridgeWithEnumDatum,

            activityHelper: {} as SomeDgtActivityHelper,
            bridgeType: {} as GenericDelegateBridge,
            readsDatumUplcAs: {} as GenericDelegateDatum,
        };
    }

    {
        type BI_BMD = bridgeInspector<BasicMintDelegate>;
        type BridgeBools = BridgeBooleanEntries<BI_BMD>;
        const MinimalAnysAllowed: BridgeAnyEntries<BI_BMD> = {
            readsDatumUplcAs: IS_AN_ANY,
        };
        type dCB = definesContractBridge<BasicMintDelegate>;

        const bools: BridgeBools = {
            isAnyMintDgt: true,
            isTheBasicMintDgt: true,
            isAnyContractDgt: true, // even a mint delegate is SOME sort of contract-having delegate
            isTheBaseContractDgt: false,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
            isAbstractBridgeType: false, // it's "partially" abstract, in that much of it is well defined
        };
        type NeverEntries = BridgeNeverEntries<BI_BMD>;
        const neverEntries: NeverEntries = {
            // bridgeType: IS_A_NEVER,
            // readsDatumUplcAs: IS_A_NEVER,
            // activityHelper: IS_A_NEVER,
            extendsCapoBridge: IS_A_NEVER,
            usesContractDgtBridge: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
            abstractBridgeType: IS_A_NEVER,
        };

        type NonNeverEntries = BridgeNonNeverEntries<BI_BMD>;
        const nonNeverEntries: NonNeverEntries = {
            // usesContractDgtBridge: {} as GenericDelegateBridgeClass, // ContractDataBridgeWithEnumDatum,
            // abstractBridgeType:
            //     "" as unknown as ContractDataBridgeWithEnumDatum,
            inspected: {} as BasicMintDelegate,
            thatDefinedBridgeType: {} as GenericDelegateBridgeClass, // ContractDataBridgeWithEnumDatum,
            usesMintDgtBridge: {} as GenericDelegateBridgeClass, // ContractDataBridgeWithEnumDatum,
            bridgeClass: {} as GenericDelegateBridgeClass, // ContractDataBridgeWithEnumDatum,
            foundMkDatumType: {} as SomeDgtDatumHelper<any>,

            activityHelper: {} as SomeDgtActivityHelper,
            bridgeType: {} as GenericDelegateBridge,

            readsDatumUplcAs: {} as GenericDelegateDatum,
        };
    }

    {
        type BItestDelegate = bridgeInspector<MintDelegateWithGenericUuts>;
        const BMDisAbstractBridgeTypes: bridgeInspector<BasicMintDelegate>["isAbstractBridgeType"] =
            false;

        const isBasicMintDelegate: BasicMintDelegate extends MintDelegateWithGenericUuts
            ? true
            : false = false;
        const isMintDelegateSubclass: MintDelegateWithGenericUuts extends BasicMintDelegate
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
        const datumIsMissing: undefined extends datumExtracted ? true : false =
            false;
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
            readsDatumUplcAs: {} as MDWGU_ErgoDelegateDatum,
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
            foundMkDatumType: undefined, // no datum here
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
            {} as GenericDelegateBridgeClass;

        type BI_IMD = bridgeInspector<incompleteMintDgt>;
        type BridgeBools = BridgeBooleanEntries<BI_IMD>;
        const bools: BridgeBools = {
            isAnyMintDgt: true,
            isTheBasicMintDgt: false,
            isAbstractBridgeType: false, // it's "partially" abstract, in that much of it is well defined
            isTheBaseContractDgt: false,
            isAnyContractDgt: true, // even a mint delegate is SOME sort of contract-having delegate
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
        };
        const MinimalAnysAllowed: BridgeAnyEntries<BI_IMD> = {
            readsDatumUplcAs: IS_AN_ANY,
        };

        type NeverEntries = BridgeNeverEntries<BI_IMD>;
        const neverEntries: NeverEntries = {
            extendsCapoBridge: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
            usesContractDgtBridge: IS_A_NEVER,
            // activityHelper: IS_A_NEVER,
            // readsDatumUplcAs: IS_A_NEVER,
            // bridgeType: IS_A_NEVER,
            abstractBridgeType: IS_A_NEVER,
        };

        type NonNeverEntries = BridgeNonNeverEntries<BI_IMD>;
        const nonNeverEntries: NonNeverEntries = {
            inspected: {} as incompleteMintDgt,
            activityHelper: {} as SomeDgtActivityHelper,
            thatDefinedBridgeType: {} as GenericDelegateBridgeClass, // ContractDataBridgeWithEnumDatum,
            usesMintDgtBridge: {} as GenericDelegateBridgeClass, // dataBridgeError("BasicMintDelegate"),
            bridgeClass: {} as GenericDelegateBridgeClass, // dataBridgeError("BasicMintDelegate"),
            foundMkDatumType: {} as SomeDgtDatumHelper<any>,
            bridgeType: {} as GenericDelegateBridge,
            readsDatumUplcAs: {} as GenericDelegateDatum,
            // abstractBridgeType:
            // "" as unknown as ContractDataBridgeWithEnumDatum,
        };
    }

    {
        type abstractClass = DelegatedDataContract<any, any>;
        type BI_DgDc = bridgeInspector<abstractClass>;

        type BridgeBools = BridgeBooleanEntries<BI_DgDc>;
        const MinimalAnysAllowed: BridgeAnyEntries<BI_DgDc> = {
            readsDatumUplcAs: IS_AN_ANY,
        };
        type dCB = definesContractBridge<DelegatedDataContract<any, any>>;

        // type delegateActivityType = StellarDelegate["activity"];
        type CBDactivityType = DelegatedDataContract<any, any>["activity"];
        type delegateSubclass = stellarSubclass<StellarDelegate>;
        type DgDataSubclass = stellarSubclass<DelegatedDataContract<any, any>>;
        //@ts-expect-error referencing abstract class
        const t: stellarSubclass<DelegatedDataContract<any, any>> =
            DelegatedDataContract;
        const t2: StellarDelegate = {} as DelegatedDataContract<any, any>;

        const hasReadDatum: BI_DgDc["bridgeType"]["readDatum"] extends readsUplcTo<
            infer RD
        >
            ? true
            : false = true;

        type CDB_iType = InstanceType<
            definesContractBridge<DelegatedDataContract<any, any>>
        >;
        type DGDT = Expand<DgDataType<DelegatedDataContract<any, any>>>;

        const readsDatumToGenericDatum: GenericDelegateDatum extends BI_DgDc["readsDatumUplcAs"]
            ? IF_ISANY<BI_DgDc["readsDatumUplcAs"], false, true>
            : false = true;

        const bools: BridgeBools = {
            isAnyMintDgt: false,
            isTheBasicMintDgt: false,
            isAnyContractDgt: true,
            isTheBaseContractDgt: false,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
            isAbstractBridgeType: false, // it's "partially" abstract, in that much of it is well defined
        };
        type NeverEntries = BridgeNeverEntries<BI_DgDc>;
        const neverEntries: NeverEntries = {
            // bridgeType: IS_A_NEVER,
            // readsDatumUplcAs: IS_A_NEVER,
            // activityHelper: IS_A_NEVER,
            extendsCapoBridge: IS_A_NEVER,
            usesMintDgtBridge: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
            abstractBridgeType: IS_A_NEVER,
        };

        type NonNeverEntries = BridgeNonNeverEntries<BI_DgDc>;
        const nonNeverEntries: NonNeverEntries = {
            inspected: {} as DelegatedDataContract<any, any>,
            thatDefinedBridgeType: {} as GenericDelegateBridgeClass, // ContractDataBridgeWithEnumDatum,
            usesContractDgtBridge: {} as GenericDelegateBridgeClass, // ContractDataBridgeWithEnumDatum,
            bridgeClass: {} as GenericDelegateBridgeClass, // ContractDataBridgeWithEnumDatum, // dataBridgeError("BasicMintDelegate"),
            foundMkDatumType: {} as SomeDgtDatumHelper<any>,
            // abstractBridgeType:
            //     "" as unknown as ContractDataBridgeWithEnumDatum,

            activityHelper: {} as SomeDgtActivityHelper,
            bridgeType: {} as GenericDelegateBridge,
            readsDatumUplcAs: {} as GenericDelegateDatum,
        };
    }

    {
        const dgDataBridge: BI_DgDB["bridgeClass"] = DgDtest_Bridge;
        type BI_DgDB = bridgeInspector<DelegatedDatumTester>;

        type BridgeBools = BridgeBooleanEntries<BI_DgDB>;
        const bools: BridgeBools = {
            isAnyMintDgt: false,
            isTheBasicMintDgt: false,
            isAnyContractDgt: true,
            isTheBaseContractDgt: false,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
            isAbstractBridgeType: false,
        };

        const MinimalAnysAllowed: BridgeAnyEntries<BI_DgDB> = {};
        type NeverEntries = BridgeNeverEntries<BI_DgDB>;
        const neverEntries: NeverEntries = {
            extendsCapoBridge: IS_A_NEVER,
            usesMintDgtBridge: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
            abstractBridgeType: IS_A_NEVER,
            // readsDatumUplcAs: IS_A_NEVER,
        };

        type NonNeverEntries = BridgeNonNeverEntries<BI_DgDB>;
        const nonNeverEntries: NonNeverEntries = {
            inspected: {} as DelegatedDatumTester,
            thatDefinedBridgeType: DgDtest_Bridge,
            usesContractDgtBridge: {} as typeof DgDtest_Bridge,
            bridgeClass: {} as typeof DgDtest_Bridge, // ContractDataBridgeWithEnumDatum,
            foundMkDatumType: {} as DgDtest.DelegateDatumHelper,
            bridgeType: {} as DgDtest_Bridge,
            readsDatumUplcAs: {} as DgDtest.types.ErgoDelegateDatum,
            activityHelper: {} as DgDtest.DelegateActivityHelper,
        };

        type ExampleData = Expand<DgDataTypeLike<DelegatedDatumTester>>;

        // const exampleDataAsExpected : ReturnType<
        //     DelegatedDatumTester["exampleData"]
        // > extends ExampleData ? true : false = true;

        type datumType = InstanceType<
            DelegatedDatumTester["dataBridgeClass"]
        >["readDatum"];
        // && SomeDgtDatumReader
        type CSD_struct = Exclude<
            ReturnType<datumType>["capoStoredData"],
            undefined
        >;
        type DTYP = CSD_struct extends { data: AnyDataTemplate<any, any> }
            ? CSD_struct["data"]
            : never;

        type ddt = DgDataType<DelegatedDatumTester>;
        const dataCanonicalType: ddt = {} as DgDatumTestData;

        type ddtl = DgDataTypeLike<DelegatedDatumTester>;
        type mddtl = Expand<minimalDgDataTypeLike<DelegatedDatumTester>>;
        const dataLike: mddtl = {
            name: "kevin",
            number: 14,
        };
        const badDataLike: mddtl = {
            name: "kevin",
            number: 14,

            //@ts-expect-error
            badAttr: "no way",
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
    any, // isTheBaseDgDataContract
    any, // usesContractDgtBridge
    any, // isSCBaseClass
    any, // isDgDataBaseClass
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
