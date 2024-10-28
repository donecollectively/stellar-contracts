import type { Capo } from "../../Capo.js";
import type { ContractBasedDelegate } from "../../delegation/ContractBasedDelegate.js";
import { BasicMintDelegate } from "../../minting/BasicMintDelegate.js";
import type { StellarContract } from "../../StellarContract.js";
import type { MintDelegateWithGenericUuts } from "../../testing/specialMintDelegate/MintDelegateWithGenericUuts.js";
import type { DataMaker } from "./dataMakers.js";

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

export type findReadDatumType<T extends canHaveDataBridge> = bridgeInspector<T>["hasReadDatum"];
export type findActivityType<T extends canHaveDataBridge> = bridgeInspector<T>["activityHelper"]

type definesBridgeClass<T> = T extends { dataBridgeClass: infer DBC }
    ? DBC extends abstract new (...args: any) => any
        ? DBC
        : never
    : never;
type baseDelegateDataBridge = definesBridgeClass<ContractBasedDelegate>;
type capoDataBridge = definesBridgeClass<Capo<any>>;

    type bridgeInspector<
        SC extends canHaveDataBridge,
        // thatProto = typeof BasicMintDelegate.prototype,
        thatDataBridge extends abstract new (
            ...args: any
        ) => any = definesBridgeClass<SC>, // extends definesBridge<infer DBC> ? DBC : never;
        extendsCapo = thatDataBridge extends capoDataBridge
            ? thatDataBridge
            : never,
        isMintDgt extends boolean = BasicMintDelegate extends SC
            ? SC extends BasicMintDelegate
                ? true
                : false
            : false,
        usesMintDgtBridge = definesBridgeClass<BasicMintDelegate> extends thatDataBridge
            ? isMintDgt extends true
                ? thatDataBridge
                : dataBridgeError<"BasicMintDelegate">
            : never,
        usesContractDgt = isMintDgt extends true
            ? never
            : usesMintDgtBridge extends thatDataBridge
            ? never
            : definesBridgeClass<ContractBasedDelegate> extends thatDataBridge
            ? // contract delegate establishes a definition, subclasses must override
              OR<usesMintDgtBridge, dataBridgeError<"ContractBasedDelegate">>
            : thatDataBridge,
        usesBaseDgt = isMintDgt extends true
            ? never
            : definesBridgeClass<StellarContract<any>> extends thatDataBridge
            ? // not ok to inherit the base declaration of needed bridge from StellarContracts class.
              OR<
                  usesMintDgtBridge,
                  OR<usesContractDgt, dataBridgeError<"StellarContract">>
              >
            : never,
        bridgeClass = OR<
            // IF<isMintDgt, usesMintDgtBridge>,
            usesMintDgtBridge, 
            OR<usesBaseDgt, OR<usesContractDgt, thatDataBridge>>
        >,
        bridgeType = InstanceType<thatDataBridge>,
        isDataMaker = bridgeType extends DataMaker ? true : false,
        hasReadDatum = bridgeType extends { readDatum: infer RD } ? RD : never,
        activityHelper = bridgeType extends { activity: infer A } ? A : never
    > = {
        inspected: SC;
        // thatProto: thatProto,
        thatDataBridge: thatDataBridge;
        extendsCapo: extendsCapo;
        isMintDelegate: isMintDgt;
        usesMintDgtBridge: usesMintDgtBridge;
        usesContractDgt: usesContractDgt;
        usesBaseDgt: usesBaseDgt;
        bridgeClass: bridgeClass;
        bridgeType: bridgeType;
        isDataMaker: isDataMaker;
        hasReadDatum: hasReadDatum;
        activityHelper: activityHelper;
    };

    type dataBridgeError<T extends string> =
    `Type error: must override ${T}'s dataBridgeClass`;
    type IF<T1 extends boolean | never, T2> = T1 extends true ? T2 : never;
    type OR<T1, T2> = [T1] extends [never] ? T2 : T1;

    
    {        
        // testing zone

        // const t : never extends any ? true : false = true;
        // const t2 : unknown extends any ? true : false = true;
        // const t3 : any extends unknown ? true : false = true;
        // const t4 : unknown extends never ? true : false = false
        // const t5 : never extends unknown ? true : false = true
        const t6: never extends true ? true : false = true;
    
        {
            class foo extends BasicMintDelegate {
                something = "hi";
            }
            type BIFoo = bridgeInspector<foo>;
            const fooIsNOTMintDgt: BIFoo["isMintDelegate"] = false;
            const rightMintDgtError: BIFoo["usesMintDgtBridge"] =
                "Type error: must override BasicMintDelegate's dataBridgeClass";
            //@ts-expect-error
            const wrongMintDgtError: BIFoo["usesContractDgt"] =
                "Type error: must override ContractBasedDelegate's dataBridgeClass";
        }
    
        {
            type BI_BMD = bridgeInspector<BasicMintDelegate>;
            const isBMD: BI_BMD["isMintDelegate"] = true;
        }
    
        type BItestDelegate = bridgeInspector<MintDelegateWithGenericUuts>;
    
    
    // const t6 : never extends never ? true : false = true;
    // any -> never = true | false (INDETERMINATE! )
    // const t2 : any extends never ? true : false = false;
    // const t3 : any extends never ? true : false = true;

}


