import type { Capo } from "../../Capo.js";
import CapoDataBridge from "../../CapoHeliosBundle.bridge.js";
import type { ContractBasedDelegate } from "../../delegation/ContractBasedDelegate.js";
import { BasicMintDelegate } from "../../minting/BasicMintDelegate.js";
import type { CapoMinter } from "../../minting/CapoMinter.js";
import type { StellarContract } from "../../StellarContract.js";
import type { MintDelegateWithGenericUuts } from "../../testing/specialMintDelegate/MintDelegateWithGenericUuts.js";
import { DataMaker } from "./dataMakers.js";

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

export type findReadDatumType<T extends canHaveDataBridge> =
    bridgeInspector<T>["hasReadDatum"];
export type findActivityType<T extends canHaveDataBridge> =
    bridgeInspector<T>["activityHelper"];

type definesBridgeClass<T> = T extends { dataBridgeClass: infer DBC }
    ? DBC extends abstract new (...args: any) => any
        ? DBC
        : never
    : never;
type baseDelegateDataBridge = definesBridgeClass<ContractBasedDelegate>;
type capoDataBridge = definesBridgeClass<Capo<any>>;

type AnySC = StellarContract<any>;

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
    usesMintDgtBridge = IF<
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
        ContractBasedDelegate extends SC ? true : false
    >,
    // returns the data-bridge class for generic subclasses of ContractBasedDelegate
    // for mint-delegate, it returns 'never' to indicate that those subclasses are in
    //  ... a separate subtree of types.
    // for the ContractBasedDelegate itself, it returns the abstract bridge type
    // if the the contract isn't a contract-based delegate, it returns 'never'
    // if the contract-based delegate subclass fails to provide a bridge class, it
    // returns a type-error message.
    usesContractDgtBridge = NEVERIF<
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
    // returns the data-bridge class for subclasses of StellarContract
    // for the StellarContract itself, it returns the abstract bridge type
    // if the contract subclasses one of the more specific varieties of contract, it returns 'never'
    // otherwise, a class not providing a bridge class returns a type-error message.
    usesOtherBridge = NEVERIF<
        isAnyMintDgt,
        NEVERIF<
            isAnyContractDgt, // only true if it's outside the normal type tree
            // uses the generic bridge defined in the base StellarContract class?
            definesBridgeClass<AnySC> extends thatDefinedBridgeType
                ? AnySC extends SC // if it is the StellarContract itself
                    ? thatDefinedBridgeType // return the abstract bridge type
                    : dataBridgeError<"StellarContract">
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
    isAbstractBridgeType extends boolean = IFISNEVER<
        usesMintDgtBridge,
        IFISNEVER<
            usesOtherBridge,
            typeof DataMaker extends thatDefinedBridgeType ? true : false,
            // if it is a string, it is an error message indicating an unmet abstract need
            usesOtherBridge extends string ? true : false
        >,
        // if it is a string, it is an error message indicating an unmet abstract need
        usesMintDgtBridge extends string ? true : false
    >,
    // returns the specific bridge type for the contract, if it isn't abstract.
    // returns 'never' if the has only an abstract bridge class.
    bridgeType = IF<
        isAbstractBridgeType,
        never,
        InstanceType<thatDefinedBridgeType>
    >,
    // isDataMaker = bridgeType extends DataMaker ? true : false,
    hasReadDatum = bridgeType extends { readDatum: infer RD } ? RD : never,
    hasMkDatum = bridgeType extends { mkDatum: infer MkD } ? MkD : never,
    activityHelper = bridgeType extends { activity: infer A } ? A : never
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
    isAbstractBridgeType: isAbstractBridgeType;
    bridgeType: bridgeType;
    hasReadDatum: hasReadDatum; // isDataMaker: isDataMaker;
    hasMkDatum: hasMkDatum;
    activityHelper: activityHelper;
};
const t: DataMaker extends never ? true : false = false;
const t2: never extends DataMaker ? true : false = true;

const testing = false;
if (testing) {
    type GenericDataMaker = typeof DataMaker;
    const GenericDataMaker: GenericDataMaker = DataMaker;

    // testing zone
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
            isAbstractContractDgt: false,
            isAnyContractDgt: true, // even a mint delegate is SOME sort of contract-having delegate
            isTheBaseContractDelegate: false,
            isAbstractBridgeType: true,
        };
        type NeverEntries = BridgeNeverEntries<BI_IMD>;
        const neverEntries: NeverEntries = {
            activityHelper: true,
            extendsCapoBridge: true,
            hasReadDatum: true,
            usesOtherBridge: true,
            isTheBaseContractDgt: true,
            hasMkDatum: true,
            bridgeType: true,
            usesContractDgtBridge: true,
        };
        type SomeEntries = BridgeSomethingEntries<BI_IMD>;

        type NonNeverEntries = BridgeNonNeverEntries<BI_IMD>;
        const nonNeverEntries: NonNeverEntries = {
            inspected: {} as incompleteMintDgt,
            thatDefinedBridgeType: GenericDataMaker,
            bridgeClass: dataBridgeError("BasicMintDelegate"),
            abstractBridgeType: "" as unknown as DataMaker,
            usesMintDgtBridge: dataBridgeError("BasicMintDelegate"),
            //x@ts-expect-errorIFISNEVER<
            bridgeType: "" as unknown,
        };

        const fooHasNoBridgeType: BI_IMD["bridgeType"] =
            "" as unknown as DataMaker;

        const checkBridgeBools: BridgeBools = {
            isTheBasicMintDgt: false,
            isAbstractContractDgt: false,
            isDataMaker: false,
        };
        const checkBridge: BI_IMD = {
            inspected: {} as any,
            thatDefinedBridgeType: undefined as any,
            extendsCapoBridge: undefined as never,
            isTheBasicMintDgt: false, //ok
            usesMintDgtBridge: undefined as any,
            isAbstractContractDgt: false, //ok
            usesContractDgtBridge: undefined as any,
            usesOtherBridge: undefined as any,
            bridgeClass: undefined as any,
            bridgeType: "" as unknown,
            isAbstractBridgeType: "" as unknown as DataMaker,
            isDataMaker: undefined as any,
            hasReadDatum: undefined as any,
            activityHelper: undefined as any,
        };
        const checkBridgeNegative: BI_IMD = {
            inspected: {} as ContractBasedDelegate,
            thatDefinedBridgeType: undefined as any,
            extendsCapoBridge: undefined as never,
            isTheBasicMintDgt: false, //ok
            usesMintDgtBridge: undefined as any,
            isAbstractContractDgt: false, //ok
            usesContractDgtBridge: undefined as any,
            usesOtherBridge: undefined as any,
            bridgeClass: undefined as any,
            bridgeType: "" as unknown,
            isAbstractBridgeType: "" as unknown as DataMaker,
            isDataMaker: undefined as any,
            hasReadDatum: undefined as any,
            activityHelper: undefined as any,
        };
        const rightMintDgtError: BI_IMD["usesMintDgtBridge"] =
            "Type error: must override BasicMintDelegate's dataBridgeClass";
        //@ts-expect-error
        const wrongMintDgtError: BI_IMD["usesContractDgtBridge"] =
            "Type error: must override ContractBasedDelegate's dataBridgeClass";
    }

    {
        type BI_BMD = bridgeInspector<BasicMintDelegate>;
        type BridgeBools = BridgeBooleanEntries<BI_BMD>;
        type NeverEntries = BridgeNeverEntries<BI_BMD>;
        type NonNeverEntries = BridgeNonNeverEntries<BI_BMD>;
        type SomeEntries = BridgeSomethingEntries<BI_BMD>;

        const isBMD: BI_BMD["isTheBasicMintDgt"] = true;
        const checkBridge: BI_BMD = {
            inspected: {} as BasicMintDelegate,
            thatDefinedBridgeType: undefined as any,
            extendsCapoBridge: undefined as never,
            isTheBasicMintDgt: true, //ok
            usesMintDgtBridge: undefined as any,
            isAbstractContractDgt: false, //ok
            usesContractDgtBridge: undefined as any,
            usesOtherBridge: undefined as any,
            bridgeClass: undefined as any,
            bridgeType: undefined as any,
            isAbstractBridgeType: undefined as any,
            isDataMaker: undefined as any,
            hasReadDatum: undefined as any,
            activityHelper: undefined as any,
        };
        const checkBridgeNegative: BI_BMD = {};
    }

    {
        type BItestDelegate = bridgeInspector<MintDelegateWithGenericUuts>;
        type BridgeBools = BridgeBooleanEntries<BItestDelegate>;
        type NeverEntries = BridgeNeverEntries<BItestDelegate>;
        type NonNeverEntries = BridgeNonNeverEntries<BItestDelegate>;
        type SomeEntries = BridgeSomethingEntries<BItestDelegate>;

        const checkBridge: BItestDelegate = {
            inspected: {} as MintDelegateWithGenericUuts,
            thatDefinedBridgeType: undefined as any,
            extendsCapoBridge: undefined as never,
            isTheBasicMintDgt: false, //ok
            usesMintDgtBridge: undefined as any,
            isAbstractContractDgt: false, //ok
            usesContractDgtBridge: undefined as any,
            usesOtherBridge: undefined as any,
            bridgeClass: undefined as any,
            bridgeType: undefined as any,
            isAbstractBridgeType: undefined as any,
            isDataMaker: undefined as any,
            hasReadDatum: undefined as any,
            activityHelper: undefined as any,
        };
        const checkBridgeNegative: BItestDelegate = {};
    }

    {
        type BICapo = bridgeInspector<Capo<any>>;
        type BridgeBools = BridgeBooleanEntries<BICapo>;
        type NeverEntries = BridgeNeverEntries<BICapo>;
        type NonNeverEntries = BridgeNonNeverEntries<BICapo>;
        type SomeEntries = BridgeSomethingEntries<BICapo>;

        const CapoIsAbstractDgt: BICapo["isAbstractContractDgt"] = false;
        const CapoIsAbstractMintDgt: BICapo["isTheBasicMintDgt"] = false;
        const CapoBridgeClass: BICapo["bridgeClass"] = CapoDataBridge;
        const CapoBridgeType: BICapo["bridgeType"] = new CapoDataBridge(
            "" as any
        );
        //@ts-expect-error
        const CapoMustHaveReadDatum: BICapo["hasReadDatum"] = undefined;

        const checkBridge: BICapo = {
            inspected: {} as Capo<any>,
            thatDefinedBridgeType: undefined as CapoDataBridge,
            extendsCapoBridge: undefined as never,
            isTheBasicMintDgt: false, //ok
            usesMintDgtBridge: undefined as any,
            isAbstractContractDgt: false, //ok
            usesContractDgtBridge: undefined as any,
            usesOtherBridge: undefined as any,
            bridgeClass: CapoDataBridge,
            bridgeType: CapoBridgeType,
            isAbstractBridgeType: undefined as any,
            isDataMaker: undefined as any,
            hasReadDatum: undefined as any,
            activityHelper: undefined as any,
        };
        const checkBridgeNegative: BICapo = {
            //@ts-expect-error
            inspected: {} as ContractBasedDelegate,
            bridgeClass: CapoDataBridge,
            bridgeType: CapoBridgeType,
        };
    }

    {
        type BISC = bridgeInspector<StellarContract<any>>;
        type BridgeBools = BridgeBooleanEntries<BISC>;
        const bools: BridgeBools = {
            isAbstractBridgeType: true,
            isTheBasicMintDgt: false,
            isAnyContractDgt: false,
            isAnyMintDgt: false,
        };
        type NeverEntries = BridgeNeverEntries<BISC>;
        type NonNeverEntries = BridgeNonNeverEntries<BISC>;
        type SomeEntries = BridgeSomethingEntries<BISC>;

        const BISCisAbstractDgt: BISC["isAbstractContractDgt"] = false;
        const checkBridge: BISC = {
            inspected: {} as StellarContract<any>,
            thatDefinedBridgeType: undefined as any,
            extendsCapoBridge: undefined as never,
            isTheBasicMintDgt: false, //ok
            usesMintDgtBridge: undefined as any,
            isAbstractContractDgt: true, //ok
            usesContractDgtBridge: undefined as any,
            usesOtherBridge: undefined as any,
            bridgeClass: undefined as any,
            bridgeType: undefined as any,
            isAbstractBridgeType: undefined as any,
            isDataMaker: undefined as any,
            hasReadDatum: undefined as any,
            activityHelper: undefined as any,
        };
        const checkBridgeNegative: BISC = {};
    }

    {
        type BI_CapoMinter = bridgeInspector<CapoMinter>;
        type BridgeBools = BridgeBooleanEntries<BI_CapoMinter>;
        type NeverEntries = BridgeNeverEntries<BI_CapoMinter>;
        type NonNeverEntries = BridgeNonNeverEntries<BI_CapoMinter>;
        type SomeEntries = BridgeSomethingEntries<BI_CapoMinter>;

        const CM_noReadDatum: ISNEVER<BI_CapoMinter["hasReadDatum"]> = true;

        const bools: BridgeBools = {
            isTheBasicMintDgt: false,
            isAbstractContractDgt: false,
            isDataMaker: false,
        };

        const checkBridgeNegative: BI_CapoMinter = {
            extendsCapoBridge: undefined as never,
            // extendsCapo: undefined as unknown,
            // extendsCapo: undefined as StellarContract<any>,
            // extendsCapo: undefined as StellarContract<any>,

            bridgeClass: "" as unknown,
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
    [k in keyof T as IFISNEVER<T[k], k, never>]: ISNEVER<T[k]>;
};

type BridgeSomethingEntries<T extends anyBridgeInspector> = {
    [k in keyof T as IFISNEVER<T[k], never, k>]: ISSOME<T[k]>;
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

type BridgeBooleanEntries_int<T extends anyBridgeInspector> = {
    [k in keyof T as T[k] extends boolean
        ? IFISNEVER<T[k], never, k>
        : never]: T[k];
};
type BridgeBooleanEntries<T extends anyBridgeInspector> = {
    [k in keyof BridgeBooleanEntries_int<T>]: BridgeBooleanEntries_int<T>[k];
};
