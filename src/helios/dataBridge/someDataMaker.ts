import type { TypeSchema } from "@helios-lang/type-utils"
import type { anyTypeDetails } from "../HeliosScriptBundle.js"
import { Cast } from "@helios-lang/contract-utils"

const rawDataMakerProxy = new Proxy(
    {},
    {
        // cases to cover:
        // 1. type is an enum, accessor is a tagOnly field
        //     -> instantiate the right constrData through the cast(   { variantName:{} )
        // 2. type is an enum, accessor is a singletonField
        //     -> returns a function that takes the field value and calls cast ( { variantName: { fieldName: value } } )
        // 3. type is an enum, accessor has fields
        //    -> returns a function that takes the fields and calls cast ( { variantName: { ...fields } } )
        // 4. type is not an enum.  
        //   -> the apply() trap is called with the arg(s) for filling that data type

        // if it is an activity, wrap it in a {redeemer: } object
        // ... to satisfy the isActivity type

        get(_, typeName : string | Symbol, DMP) {
            throw new Error(`dataMaker ${DMP.constructor.name}: GET: ${typeName}`)
            // const cast = DMP.getCast(typeName)
            // return DMP.types.get(prop)
        },
        apply(xxx, DMP, args) {
            debugger
            if (args?.length > 1) throw new Error(`dataMaker APPLY: got ${args.length} args, expected 1`)
            throw new Error(`dataMaker ${DMP.constructor.name} APPLY`)
            // debugger
            // return ptp.toUplc(...args)
        }
    }
)

function dataMakerProxyBase() {}
dataMakerProxyBase.prototype = rawDataMakerProxy

export class anyDataMaker extends (dataMakerProxyBase as any) {
    constructor(public typeDetails: anyTypeDetails) {
        super()
        this.schema = undefined
        this.cast = undefined
    }
    schema? : TypeSchema
    cast?: Cast<any,any>
    getTypeSchema() {
        if (!this.schema) {
            this.schema = this.typeDetails.dataType.toSchema()
            this.cast = new Cast(this.schema, {isMainnet: true})
        }
        return this.schema
    }
    isActivityMaker : boolean = false
}

