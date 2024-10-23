import type { TypeSchema } from "@helios-lang/type-utils"
import type { 
    anyTypeDetails,
    ActivityEnumVariantCreator,
    AnyHeliosTypeInfo,
    EnumId,
    EnumType,
    makesUplcActivityEnumData,
    EnumUplcActivityResult,
    EnumUplcResult,
    EnumVariantCreator,
    HeliosBundleClass,
    HeliosBundleTypeDetails,
    HeliosBundleTypes,
    HeliosScriptBundle,
    VariantMap,
    anySeededActivity,
    enumTypeDetails,
    makesSomeActivityData,
    makesUplcActivityData,
    makesSomeUplcData,
    makesUplcEnumData,
    readsSomeUplcData,
    readsUplcData,
    readsUplcEnumData,
    singleEnumVariant,
    typeDetails,
    uplcDataMaker,
    variantTypeDetails
} from "../HeliosScriptBundle.js"
import { Cast } from "@helios-lang/contract-utils"

const rawDataMakerProxy = new Proxy(
    {},
    {
        // cases to cover:
        // 1. type is an enum, accessor is a tagOnly field
        //     -> instantiate the right constrData through the cast(   { variantName:{} )
        // 2. type is an enum, accessor is a singletonField
        //   2a. nested field is an enum
        //      -> returns a proxy for the nested enum type, 
        //           ... with seed semantics and NO {redeemer: } wrapper
        //   2b. nested field not an enum
        //     -> returns a function that takes the field value and calls cast ( { variantName: { fieldName: value } } )
        // 3. type is an enum, accessor has fields
        //    -> returns a function that takes the fields and calls cast ( { variantName: { ...fields } } )
        // 4. type is not an enum.  
        //   -> the apply() trap is called with the arg(s) for filling that data type

        // if it is an activity, wrap it in a {redeemer: } object
        // ... to satisfy the isActivity type

        get(_, typeName : string | Symbol, THIS : someDataMaker) {
            // throw new Error(`dataMaker ${DMP.constructor.name}: GET: ${typeName}`)
            const {__typeDetails: typeDetails, __schema: schema, __cast: cast} = THIS;
            // const {dataType} = typeDetails;
            if ("string" !== typeof typeName) {
                // if the symbol is a node-inspector symbol, show the type-details
                if (typeName == Symbol.for("nodejs.util.inspect.custom")) {
                    debugger
                    return undefined // {someDataMakerProxy:{typeDetails}}
                }
                if (typeName == Symbol.for("toString")) {
                    return () => `dataMaker ${THIS.constructor.name} for ${THIS.name}`;
                }
                
                // add any special handling for symbols above.
                throw new Error(`dataMaker ${THIS.constructor.name}: GET(${typeName}) -> null`)
                return null
            }

            switch (schema.kind) {
                case "enum": 
                    const enumSchema = schema
                    const variant = enumSchema.variantTypes.find(variant => variant.name === typeName);
                    // variants[typeName as keyof typeof enumSchema.variants];
                    if (variant) {
                        if (variant.fieldTypes.length == 0) {
                            return cast.toUplcData({[typeName]: {}});
                        }
                        if (variant.fieldTypes.length === 1) {
                            
                        if (variant.accessor === "singletonField") {
                            const nestedType = variant.nestedType;
                            if (nestedType.kind === "enum") {
                                return new Proxy({}, {
                                    get(_, nestedTypeName: string | Symbol) {
                                        const nestedVariant = nestedType.variants[nestedTypeName as keyof typeof nestedType.variants];
                                        if (!nestedVariant) throw new Error(`dataMaker ${THIS.constructor.name}: GET: ${nestedTypeName} not found in ${nestedType.kind}`);
                                        return (...args: any[]) => cast.toUplcData({[typeName]: { [nestedTypeName]: args[0] }});
                                    }
                                });
                            } else {
                                return (value: any) => cast.toUplcData({[typeName]: { [variant.name]: value }});
                            }
                        }
                        if (variant.accessor === "fields") {
                            return (...args: any[]) => cast.toUplcData({[typeName]: { ...args }});
                        }
                    }
                    throw new Error(`dataMaker ${THIS.constructor.name}: GET: ${typeName} not found in ${schema.kind}`);
            }
            if (THIS.isStruct) {
            }

        },
        apply(_, 
            THIS : someDataMaker, 
            args : any
        ) {
            debugger
            if (args?.length > 1) throw new Error(`dataMaker APPLY: got ${args.length} args, expected 1`)
            // throw new Error(`dataMaker ${DMP.constructor.name} APPLY`)

            // the only case for an apply trap is when the type is not an enum or struct, but is a single value
            if (THIS.isEnum) {
                throw new Error(`dataMaker ${THIS.constructor.name} APPLY invalid on enum ${THIS.__typeName}`)
            }
            if (THIS.isStruct) {
                throw new Error(`dataMaker ${THIS.constructor.name} APPLY invalid on struct ${THIS.__typeName}`)
            }
            return THIS.toUplc(...args)
        }
    }
)

function dataMakerProxyBase() {}
dataMakerProxyBase.prototype = rawDataMakerProxy

export class someDataMaker extends (dataMakerProxyBase as any) {
    constructor(public __typeDetails: anyTypeDetails) {
        super()
        // these start undefined, but are always forced into existence immediately
        // via getTypeSchema().  Any exceptions means this protocol wasn't followed 
        // correctly.
        this.__schema = undefined as any
        this.__cast = undefined as any
    }
    __schema : TypeSchema 
    __cast: Cast<any,any>
    get isEnum() {
        return "enum" === this.__schema!.kind
    }
    getTypeSchema() {
        if (!this.__schema) {
            this.__schema = this.__typeDetails.dataType.toSchema()
            this.__cast = new Cast(this.__schema, {isMainnet: true})
        }
        return this.__schema
    }
    usesRedeemerWrapper : boolean = false
    usesSeedSemantics: boolean = false

    toUplc(x: any) {
        return this.__cast.toUplcData(x)
    }

    get __typeName() : string {
        return this.__typeDetails.dataType.name

        // //@ts-expect-error not all schemas have names
        // const {name=""} = this.__schema!
        // if (!name) {
        //     throw new Error(`can't get typeName for unnamed type: ${this.__schema!.kind}`)
        // }
        // return name
    }
}


export class NestedActivityMaker extends someDataMaker {
    usesRedeemerWrapper : boolean = true
    usesSeedSemantics: boolean = true
}

