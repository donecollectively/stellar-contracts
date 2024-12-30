import type { TypeSchema } from "@helios-lang/type-utils"
import { type Cast, makeCast, makeErgoCast } from "@helios-lang/contract-utils"
import { type TxOutputId } from "@helios-lang/ledger"
import type { UplcData } from "@helios-lang/uplc"

import type { 
    HeliosScriptBundle,
    readsUplcData,
} from "../HeliosScriptBundle.js"
import { StellarTxnContext } from "../../StellarTxnContext.js"
import type { EnumBridge } from "./EnumBridge.js"
import type { readsUplcTo } from "./BridgeTypeUtils.js"
import { getSeed, type hasSeed, type SeedAttrs } from "../../ActivityTypes.js"

// const rawDataMakerProxy = new Proxy(
//     {},
//     {
//         // cases to cover:
//         // 1. type is an enum, accessor is a tagOnly field
//         //     -> instantiate the right constrData through the cast(   { variantName:{} )
//         // 2. type is an enum, accessor is a singletonField
//         //   2a. nested field is an enum
//         //      -> returns a proxy for the nested enum type, 
//         //           ... with seed semantics and NO {redeemer: } wrapper
//         //   2b. nested field not an enum
//         //     -> returns a function that takes the field value and calls cast ( { variantName: { fieldName: value } } )
//         // 3. type is an enum, accessor has fields
//         //    -> returns a function that takes the fields and calls cast ( { variantName: { ...fields } } )
//         // 4. type is not an enum.  
//         //   -> the apply() trap is called with the arg(s) for filling that data type

//         // if it is an activity, wrap it in a {redeemer: } object
//         // ... to satisfy the isActivity type

//         get(_, typeName : string | Symbol, THIS : DataBridge) {
//             // throw new Error(`dataMaker ${DMP.constructor.name}: GET: ${typeName}`)
//             const {__typeDetails: typeDetails, __schema: schema, __cast: cast} = THIS;
//             // const {dataType} = typeDetails;
//             if ("string" !== typeof typeName) {
//                 // if the symbol is a node-inspector symbol, show the type-details
//                 if (typeName == Symbol.for("nodejs.util.inspect.custom")) {
//                     debugger
//                     return undefined // {DataBridgeProxy:{typeDetails}}
//                 }
//                 if (typeName == Symbol.for("toString")) {
//                     return () => `dataMaker ${THIS.constructor.name} for ${THIS.name}`;
//                 }
                
//                 // add any special handling for symbols above.
//                 throw new Error(`dataMaker ${THIS.constructor.name}: GET(${typeName}) -> null`)
//                 return null
//             }

//             switch (schema.kind) {
//                 case "enum": 
//                     const enumSchema = schema
//                     const variant = enumSchema.variantTypes.find(variant => variant.name === typeName);
//                     // variants[typeName as keyof typeof enumSchema.variants];
//                     if (variant) {
//                         if (variant.fieldTypes.length == 0) {
//                             return cast.toUplcData({[typeName]: {}});
//                         }
//                         if (variant.fieldTypes.length === 1) {
//                             // todo
//                         }
//                         // if (variant.accessor === "singletonField") {
//                         //     const nestedType = variant.nestedType;
//                         //     if (nestedType.kind === "enum") {
//                         //         return new Proxy({}, {
//                         //             get(_, nestedTypeName: string | Symbol) {
//                         //                 const nestedVariant = nestedType.variants[nestedTypeName as keyof typeof nestedType.variants];
//                         //                 if (!nestedVariant) throw new Error(`dataMaker ${THIS.constructor.name}: GET: ${nestedTypeName} not found in ${nestedType.kind}`);
//                         //                 return (...args: any[]) => cast.toUplcData({[typeName]: { [nestedTypeName]: args[0] }});
//                         //             }
//                         //         });
//                         //     } else {
//                         //         return (value: any) => cast.toUplcData({[typeName]: { [variant.name]: value }});
//                         //     }
//                         // }
//                         // if (variant.accessor === "fields") {
//                         //     return (...args: any[]) => cast.toUplcData({[typeName]: { ...args }});
//                         // }
//                     }
//                     throw new Error(`dataMaker ${THIS.constructor.name}: GET: ${typeName} not found in ${schema.kind}`);
//             }
//             if (THIS.isStruct) {
//             }

//         },
//         apply(_, 
//             THIS : DataBridge, 
//             args : any
//         ) {
//             debugger
//             if (args?.length > 1) throw new Error(`dataMaker APPLY: got ${args.length} args, expected 1`)
//             // throw new Error(`dataMaker ${DMP.constructor.name} APPLY`)

//             // the only case for an apply trap is when the type is not an enum or struct, but is a single value
//             if (THIS.isEnum) {
//                 throw new Error(`dataMaker ${THIS.constructor.name} APPLY invalid on enum ${THIS.__typeName}`)
//             }
//             if (THIS.isStruct) {
//                 throw new Error(`dataMaker ${THIS.constructor.name} APPLY invalid on struct ${THIS.__typeName}`)
//             }
//             return THIS.toUplc(args[0])
//         }
//     }
// )

const rawDataBridgeProxy = new Proxy({}, {
    apply(_, THIS: DataBridge, [x]: any[]) {
        // typescript protects against this code-path being allowed by types, but
        // this serves javascript-based callers and other run-time scenarios where the type-checking
        // may not be enforced (SWC and vitest, notably)
        if (!THIS.isCallable) throw new Error(`dataBridge ${THIS.constructor.name} is not callable`)

        //x@ts-expect-error drilling through the 'protected' attribute - TS can't know about
        //x  the relationship between this object and the DataBridge class
        return THIS.ᱺᱺcast.toUplcData(x);
    }
})

function dataBridgeProxyBase() {}
dataBridgeProxyBase.prototype = rawDataBridgeProxy

export type DataBridgeOptions = {
    isActivity?: boolean;
    isNested?: boolean;
};
export type callWith<ARGS, T extends DataBridge> 
    = T & ( 
        (x: ARGS) => ReturnType<T["ᱺᱺcast"]["toUplcData"]> 
    )

export class DataBridge extends (dataBridgeProxyBase as any) {
    protected ᱺᱺschema : TypeSchema 
    protected isActivity: boolean;
    protected isNested: boolean;
    // relaxed protected so that GenericDelegateBridge and specific bridges don't have to
    //   use an inheritance relationship.  Can add that kind of inheritance and make this protected again.
    ᱺᱺcast: Cast<any,any>
    isCallable = false

    /**
     *   uses unicode U+1c7a - sorts to the end */
    ᱺᱺmkData: this["ᱺᱺcast"]["toUplcData"] = 
        (x: any) => this.ᱺᱺcast.toUplcData(x) 
    readData: this["ᱺᱺcast"]["fromUplcData"] = 
        (x: any) => this.ᱺᱺcast.fromUplcData(x) 

    constructor(options: DataBridgeOptions = {}) {
        super()
        // these start undefined, but are always forced into existence immediately
        // via getTypeSchema().  Any exceptions means this protocol wasn't followed 
        // correctly.
        // uses U+1c7a - sorts to the end
        this.ᱺᱺschema = undefined as any
        this.ᱺᱺcast = undefined as any

        const { isActivity, isNested } = options
        this.isActivity = isActivity || false;
        this.isNested = isNested || false;
    }
    
    // 
    // declare activity: DataBridge | ((...args:any) => UplcData)

    // declare  datum: DataBridge | ((...args:any) => UplcData)
    // // get datum() {
    // //     throw new Error(`each dataBridge makes its own datum`)
    // // }

    getSeed(arg: hasSeed | TxOutputId ): TxOutputId {
        return getSeed(arg)
    }

    protected redirectTo?: (value: any) => void;
    protected mkDataVia(redirectionCallback: (value: any) => void) {
        if (!this.isNested) {
            throw new Error(`dataMaker ${this.constructor.name}: redirectTo is only valid for nested enums`)
        }
        this.redirectTo = redirectionCallback;        
    }

    protected get isEnum() {
        return "enum" === this.ᱺᱺschema!.kind
    }
    protected getTypeSchema() {
        if (!this.ᱺᱺschema) {
            this.ᱺᱺschema = "placeholder" as any // this.__typeDetails.dataType.toSchema() 
            this.ᱺᱺcast = makeErgoCast(this.ᱺᱺschema, {isMainnet: true})
        }
        return this.ᱺᱺschema
    }
    // usesRedeemerWrapper : boolean = false

    // toUplc(x: any) {
    //     return this.ᱺᱺcast.toUplcData(x)
    // }

    // get __typeName() : string {
    //     return "someTypeName" // this.__typeDetails.dataType.name

    //     // //@ts-expect-error not all schemas have names
    //     // const {name=""} = this.ᱺᱺschema!
    //     // if (!name) {
    //     //     throw new Error(`can't get typeName for unnamed type: ${this.__schema!.kind}`)
    //     // }
    //     // return name
    // }
}

export class ContractDataBridge {
    static isAbstract : (true | false) = true as const
    isAbstract : (true | false) = true as const
    declare types: Record<string, DataBridge | ((x: any) => UplcData)>
    declare reader: DataBridgeReaderClass | undefined;
    declare datum: DataBridge | undefined;
    declare activity: DataBridge;
    declare readDatum : readsUplcData<any> | undefined

    constructor() {

    }
    readData(x: any) {
        if (!this.datum) throw new Error(`no datum on this dataBridge`)

        return this.datum.readData(x)
    }
}

export class ContractDataBridgeWithEnumDatum extends ContractDataBridge {    
    static isAbstract : (true | false) = true as const
    isAbstract : (true | false) = true as const
    declare datum: EnumBridge;
    declare readDatum : readsUplcData<unknown>

    constructor() {
        super();
    }
}

export class ContractDataBridgeWithOtherDatum extends ContractDataBridge {
    static isAbstract : (true | false) = true as const
    isAbstract : (true | false) = true as const
    // declare datum: (any) => UplcData;
    constructor() {
        super();
    }
    declare readDatum : readsUplcData<unknown>

}
// type DataBridgeReader = DataBridgeReaderClass & {
//     [key: string]: (x : UplcData) => any
// }
export class DataBridgeReaderClass {
    declare datum: readsUplcTo<unknown> | undefined
}
