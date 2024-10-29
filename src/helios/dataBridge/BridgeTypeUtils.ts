import type { UplcData } from "@helios-lang/uplc";
import type { Capo } from "../../Capo.js";
import CapoDataBridge, { CapoActivityHelper } from "../../CapoHeliosBundle.bridge.js";
import type { ContractBasedDelegate } from "../../delegation/ContractBasedDelegate.js";
import { BasicMintDelegate } from "../../minting/BasicMintDelegate.js";
import type { CapoMinter } from "../../minting/CapoMinter.js";
import { StellarContract } from "../../StellarContract.js";

import type { MintDelegateWithGenericUuts } from "../../testing/specialMintDelegate/MintDelegateWithGenericUuts.js";
import MDWGU_Bridge, * as MDWGU from "../../testing/specialMintDelegate/uutMintingMintDelegate.bridge.js";
//     DelegateActivityHelper as MDWGU_DelegateActivityHelper,        
// } from "../../testing/specialMintDelegate/uutMintingMintDelegate.bridge.js"

import type {
    DelegateDatum as MDWGU_DelegateDatum,
    DelegateActivity as MDWGU_DelegateActivity,
} from "../../testing/specialMintDelegate/uutMintingMintDelegate.typeInfo.js";
import { DataMaker } from "./dataMakers.js";
import type { CapoDatum } from "../../CapoHeliosBundle.typeInfo.js";
import CapoMinterDataBridge, { MinterActivityHelper } from "../../minting/CapoMinter.bridge.js";

type canHaveDataBridge = { dataBridgeClass: Option<typeof DataMaker> };
export type dataBridgeType<
    T extends canHaveDataBridge,
    bridgeClassMaybe = T["dataBridgeClass"]
> = bridgeClassMaybe extends typeof DataMaker
    ? InstanceType<bridgeClassMaybe>
    : never;

// hasBridge extends DataMaker = bridgeClassMaybe extends typeof DataMaker ? InstanceType<bridgeClassMaybe> : never,
// hasDatumMaybe = hasBridge extends {datum: infer DATUM} ?
//     hasBridge & {datum: DATUM } :
//     hasBridge & {datum: `datum accessor not detected`}
// // HasDatum extends (ReturnType<T["dataBridgeClass]"]> extends typeof DataMaker
// > = hasDatumMaybe;

export type findDatumType<
    T extends { dataBridgeClass: any },
    BC extends dataBridgeType<T> = dataBridgeType<T>,
    DT = BC extends { datum: infer D }
        ? D
        : BC extends DataMaker
        ? BC
        : "NO DATUM DETECTED"
> = DT;
// T extends DataMaker ?
//     T extends { datum : infer D } ? D : "can't infer required datum!?!"
//     : never;

export type findReadDatumType<
    T extends canHaveDataBridge,
    BI extends bridgeInspector<T> = bridgeInspector<T>,
> = IF<BI["isAbstractBridgeType"], readsUplcTo<any>,
    readsUplcTo<BI["readsDatumUplcAs"]>
>

export type findActivityType<
    T extends canHaveDataBridge,
    BI extends bridgeInspector<T> = bridgeInspector<T>,
> =
    IF<BI["isAbstractBridgeType"], DataMaker, BI["activityHelper"]>;

type definesBridgeClass<T> = T extends { dataBridgeClass: infer DBC }
    ? DBC extends abstract new (...args: any) => any
        ? DBC
        : never
    : never;
type baseDelegateDataBridge = definesBridgeClass<ContractBasedDelegate>;
type capoDataBridge = definesBridgeClass<Capo<any>>;
type AnySC = StellarContract<any>;
type abstractDataBridge = definesBridgeClass<AnySC>;



type bridgeInspector<
    // SC: the StellarContract or delegate class being inspected
    SC extends canHaveDataBridge,
    // the definition of type for that contract's dataBridgeClass (a class, not type of instances in that class)
    thatDefinedBridgeType extends abstract new (
        ...args: any
    ) => any = definesBridgeClass<SC>, // extends definesBridge<infer DBC> ? DBC : never;
    // true if the contract is a Capo contract (it always uses the same bridge)
    extendsCapoBridge = thatDefinedBridgeType extends capoDataBridge
        ? thatDefinedBridgeType
        : never,
    // true for any subclass of BasicMintDelegate
    isAnyMintDgt extends boolean = SC extends BasicMintDelegate ? true : false,
    // - true if inspecting the BasicMintDelegate class exactly
    // - false, for subclasses of the basic mint delegate
    isTheBasicMintDgt extends boolean = BasicMintDelegate extends SC
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
    usesMintDgtBridge extends abstractNew | dataBridgeError<any> = IF<
        isAnyMintDgt,
        IF<
            isTheBasicMintDgt,
            thatDefinedBridgeType,
            definesBridgeClass<BasicMintDelegate> extends thatDefinedBridgeType
                ? dataBridgeError<"BasicMintDelegate">
                : thatDefinedBridgeType // not 'never'!
        >
    >,
    // - true if the contract inherits from ContractBasedDelegate
    isAnyContractDgt extends boolean = SC extends ContractBasedDelegate
        ? true
        : false,
    // - true if the contract is exactly ContractBasedDelegate
    // - false for subclasses of ContractBasedDelegate
    isTheBaseContractDgt extends boolean = IF<
        isAnyContractDgt,
        ContractBasedDelegate extends SC ? true : false,
        false
    >,
    // returns the data-bridge class for generic subclasses of ContractBasedDelegate
    // for mint-delegate, it returns 'never' to indicate that those subclasses are in
    //  ... a separate subtree of types.
    // for the ContractBasedDelegate itself, it returns the abstract bridge type
    // if the the contract isn't a contract-based delegate, it returns 'never'
    // if the contract-based delegate subclass fails to provide a bridge class, it
    // returns a type-error message.
    usesContractDgtBridge extends abstractNew | dataBridgeError<any> = NEVERIF<
        isAnyMintDgt,
        IF<
            isTheBaseContractDgt,
            thatDefinedBridgeType,
            IF<
                isAnyContractDgt,
                definesBridgeClass<ContractBasedDelegate> extends thatDefinedBridgeType
                    ? dataBridgeError<"ContractBasedDelegate">
                    : thatDefinedBridgeType
            >
        >
    >,
    isSCBaseClass extends boolean = AnySC extends SC ? true : false,

    // returns the data-bridge class for subclasses of StellarContract
    // for the StellarContract itself, it returns the abstract bridge type
    // if the contract subclasses one of the more specific varieties of contract, it returns 'never'
    // otherwise, a class not providing a bridge class returns a type-error message.
    usesOtherBridge extends abstractNew | dataBridgeError<any> = NEVERIF<
        isAnyMintDgt,
        NEVERIF<
            isAnyContractDgt, // only true if it's outside the normal type tree
            // uses the generic bridge defined in the base StellarContract class?
            definesBridgeClass<AnySC> extends thatDefinedBridgeType
                ? NEVERIF<isSCBaseClass, dataBridgeError<"StellarContract">>
                : never
        >
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
    isAbstractBridgeType extends boolean = 
        definesBridgeClass<AnySC> extends thatDefinedBridgeType ?
        true : false
    ,
        
    // returns the specific bridge type for the contract, if it isn't abstract.
    // returns 'never' if the has only an abstract bridge class.
    bridgeType = IF<
        isAbstractBridgeType,
        never,
        InstanceType<thatDefinedBridgeType>
    >,
    abstractBridgeType = IF<
        isAbstractBridgeType,
        InstanceType<thatDefinedBridgeType>,
        never
    >,
    // isDataMaker = bridgeType extends DataMaker ? true : false,
    readsDatumUplcAs = bridgeType extends { readDatum: readsUplcTo<infer RD> } ? RD : never,
    hasMkDatum = bridgeType extends { mkDatum: infer MkD } ? MkD : never,
    activityHelper = IF<isSCBaseClass, DataMaker, bridgeType extends { activity: infer A } ? A :  never>
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
    isAbstractMDB: isAbstractMDB,
    isAbstractCDB: isAbstractCDB,
    isAbstractOB: isAbstractOB,
    isAbstractBridgeType: isAbstractBridgeType;
    abstractBridgeType: abstractBridgeType;
    bridgeType: bridgeType;
    readsDatumUplcAs: readsDatumUplcAs; // isDataMaker: isDataMaker;
    hasMkDatum: hasMkDatum;
    activityHelper: activityHelper;
};
const t: DataMaker extends never ? true : false = false;
const t2: never extends DataMaker ? true : false = true;

const testing = false;
if (testing) {
    type GenericDataMaker = typeof DataMaker;
    const GenericDataMaker: GenericDataMaker = DataMaker;
    // for testing NeverEntries
    const IS_A_NEVER = {IS_A_NEVER: true as const};

    // testing zone
    {
        type BISC = bridgeInspector<StellarContract<any>>;
        type BridgeBools = BridgeBooleanEntries<BISC>;
        const bools: BridgeBools = {
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
            isAbstractBridgeType: true,
            isTheBasicMintDgt: false,
            isAnyContractDgt: false,
            isAnyMintDgt: false,            
            isTheBaseContractDgt: false,
        };
        type NeverEntries = BridgeNeverEntries<BISC>;
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
            bridgeClass: DataMaker,
            abstractBridgeType: {} as DataMaker,
            activityHelper: {} as DataMaker,
            inspected: {} as StellarContract<any>,
            thatDefinedBridgeType: DataMaker,
            //x@ts-expect-error DataMaker should go away here, replaced with never (above)
            // usesOtherBridge: DataMaker,
        }
    }

    {
        type BItestDelegate = bridgeInspector<MintDelegateWithGenericUuts>;        
        type BridgeBools = BridgeBooleanEntries<BItestDelegate>;
        const bools : BridgeBools = {
            isTheBasicMintDgt: false,
            isAbstractBridgeType: false,
            isTheBaseContractDgt: false,
            isAnyContractDgt: true,
            isAnyMintDgt: true,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
        };
        type NeverEntries = BridgeNeverEntries<BItestDelegate>;
        const neverEntries: NeverEntries = {
            extendsCapoBridge: IS_A_NEVER,
            usesContractDgtBridge: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            abstractBridgeType: IS_A_NEVER,
        }
        type NonNeverEntries = BridgeNonNeverEntries<BItestDelegate>;
        const nonNeverEntries: NonNeverEntries = {
            activityHelper: "" as unknown as MDWGU.DelegateActivityHelper,
            thatDefinedBridgeType: MDWGU_Bridge,
            bridgeClass: MDWGU_Bridge,
            bridgeType: "" as unknown as MDWGU_Bridge,
            inspected: {} as MintDelegateWithGenericUuts,
            readsDatumUplcAs: {} as MDWGU_DelegateDatum,
            usesMintDgtBridge: MDWGU_Bridge,
        }
    }

    {
        type BICapo = bridgeInspector<Capo<any>>;
        type BridgeBools = BridgeBooleanEntries<BICapo>;
        const bools : BridgeBools = {
            isTheBasicMintDgt: false,
            isAbstractBridgeType: false,
            isAnyContractDgt: false,
            isAnyMintDgt: false,            
            isTheBaseContractDgt: false,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
        };
        type NeverEntries = BridgeNeverEntries<BICapo>;
        const neverEntries: NeverEntries = {
            hasMkDatum: IS_A_NEVER,
            usesContractDgtBridge: IS_A_NEVER,
            usesMintDgtBridge: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            abstractBridgeType: IS_A_NEVER,
        };
        type NonNeverEntries = BridgeNonNeverEntries<BICapo>;
        const nonNeverEntries: NonNeverEntries = {
            thatDefinedBridgeType: CapoDataBridge,
            bridgeClass: CapoDataBridge,
            bridgeType: {} as CapoDataBridge,
            inspected: {} as Capo<any>,
            activityHelper: {} as CapoActivityHelper,
            extendsCapoBridge: CapoDataBridge,
            readsDatumUplcAs: {} as CapoDatum
        };        
    }

    {
        type BI_CapoMinter = bridgeInspector<CapoMinter>;
        type BridgeBools = BridgeBooleanEntries<BI_CapoMinter>;
        const bools : BridgeBools = {
            isTheBasicMintDgt: false,
            isAbstractBridgeType: false,
            isAnyContractDgt: false,
            isAnyMintDgt: false,            
            isTheBaseContractDgt: false,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
        };
        type NeverEntries = BridgeNeverEntries<BI_CapoMinter>;
        const neverEntries: NeverEntries = {
            extendsCapoBridge: IS_A_NEVER,
            readsDatumUplcAs: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
            usesContractDgtBridge: IS_A_NEVER,
            usesMintDgtBridge: IS_A_NEVER,
            abstractBridgeType: IS_A_NEVER,
        }
        type NonNeverEntries = BridgeNonNeverEntries<BI_CapoMinter>;
        const nonNeverEntries: NonNeverEntries = {
            thatDefinedBridgeType: CapoMinterDataBridge,
            bridgeClass: CapoMinterDataBridge,
            bridgeType: {} as CapoMinterDataBridge,
            inspected: {} as CapoMinter,
            activityHelper: {} as MinterActivityHelper,
        };        
    }

    {
        type BI_BMD = bridgeInspector<BasicMintDelegate>;
        type BridgeBools = BridgeBooleanEntries<BI_BMD>;
        const bools: BridgeBools = {
            isAnyMintDgt: true,
            isTheBasicMintDgt: true,
            isAnyContractDgt: true, // even a mint delegate is SOME sort of contract-having delegate
            isAbstractBridgeType: true, // maybe should be true
            isTheBaseContractDgt: false,
            isAbstractCDB: false,
            isAbstractMDB: false,
            isAbstractOB: false,
        };
        type NeverEntries = BridgeNeverEntries<BI_BMD>;
        const neverEntries: NeverEntries = {
            activityHelper: IS_A_NEVER,
            extendsCapoBridge: IS_A_NEVER,
            readsDatumUplcAs: IS_A_NEVER,
            usesOtherBridge: IS_A_NEVER,
            hasMkDatum: IS_A_NEVER,
            usesContractDgtBridge: IS_A_NEVER,            
            bridgeType: IS_A_NEVER,
            
        };

        type NonNeverEntries = BridgeNonNeverEntries<BI_BMD>;
        const nonNeverEntries: NonNeverEntries = {
            inspected: {} as BasicMintDelegate,
            thatDefinedBridgeType: GenericDataMaker,
            bridgeClass: DataMaker, // dataBridgeError("BasicMintDelegate"),
            usesMintDgtBridge: DataMaker, // dataBridgeError("BasicMintDelegate"),
            abstractBridgeType: "" as unknown as DataMaker,
        };
    }



    {
        class incompleteMintDgt extends BasicMintDelegate {
            something = "hi";
        }
        //@ts-expect-error
        const incompleteBridge: BI_IMD["bridgeClass"] = DataMaker;
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
            thatDefinedBridgeType: GenericDataMaker,
            bridgeClass: dataBridgeError("BasicMintDelegate"),
            usesMintDgtBridge: dataBridgeError("BasicMintDelegate"),
            abstractBridgeType: "" as unknown as DataMaker,
        };
    }

    // const t6 : never extends never ? true : false = true;
    // any -> never = true | false (INDETERMINATE! )
    // const t2 : any extends never ? true : false = false;
    // const t3 : any extends never ? true : false = true;
}

// lower-level utility stuff

type anyBridgeInspector = bridgeInspector<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
>;

function dataBridgeError<T extends string>(s: T): dataBridgeError<T> {
    return `Type error: must override ${s}'s dataBridgeClass`;
}

type dataBridgeError<T extends string> =
    `Type error: must override ${T}'s dataBridgeClass`;

type IF<T1 extends boolean | never, T2, ELSE = never> = true extends T1
    ? T2
    : ELSE;
type ISNEVER<T, ELSE = never> = [T] extends [never] ? true : ELSE;
type IFISNEVER<T, IFNEVER, ELSE = never> = [T] extends [never] ? IFNEVER : ELSE;
type ISSOME<T, ELSE = never> = [T] extends [never] ? ELSE : true;
type NEVERIF<T extends boolean | never, ELSE> = IF<T, never, ELSE>;
type OR<T1, T2> = [T1] extends [never] ? T2 : T1;

const ISNEVER_TEST: IF<ISNEVER<never>, true> = true;
const ALSO_IF_TEST: IF<ISNEVER<never>, true> = true;
const IF_TEST2: IF<ISNEVER<true>, true, false> = false;
const IF_TEST3: IF<never, true, false> = false;
// const neverExtendsTrueYuck : never extends true ? true : false = true;
// const trueDOESNTExtendNever : true extends never ? true : false = false;
// const iF_TEST4 : IF<42, true, false> = true; // not yet with numeric
const NEVER_ALWAYS_EXTENDS_ANYTHING: never extends any ? true : false = true;
// const t2 : unknown extends any ? true : false = true;
// const t3 : any extends unknown ? true : false = true;
// const t4 : unknown extends never ? true : false = false
// const t5 : never extends unknown ? true : false = true
// const t6: never extends true ? true : false = true;

// includes ALL and ONLY the entries that are never
// objects of this type are invalid without all the items (they're always = true)
type BridgeNeverEntries<T extends anyBridgeInspector> = {
    [k in keyof T as IFISNEVER<T[k], k, never>]: IF<ISNEVER<T[k]>, {IS_A_NEVER: true}>;
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

type abstractNew = abstract new (...args: any) => any;

type isAbstractInSubtree<
    D extends abstractNew | dataBridgeError<any> | never,
    BC extends abstractNew = definesBridgeClass<D>
> = 
    IFISNEVER<BC, false, D extends dataBridgeError<any> /*error message*/ ? true : never>


type BridgeBooleanEntries_int<T extends anyBridgeInspector> = {
    [k in keyof T as T[k] extends boolean
        ? IFISNEVER<T[k], never, k>
        : never]: T[k];
};
type BridgeBooleanEntries<T extends anyBridgeInspector> = {
    [k in keyof BridgeBooleanEntries_int<T>]: BridgeBooleanEntries_int<T>[k];
};

type readsUplcTo<T> = (d: UplcData) => T

