import { Cast, type CastConfig, type TypeSchema } from "@helios-lang/contract-utils"
import type { UplcToSchemaContext } from "@helios-lang/contract-utils/types/cast/Cast.js"
import type { EnumTypeSchema, VariantTypeSchema } from "@helios-lang/type-utils"
import type { ConstrData, UplcData } from "@helios-lang/uplc"

export class StellarCast<ErgoCanonical, ErgoPermissive> extends Cast<ErgoCanonical, ErgoPermissive> {
    constructor(
        schema : TypeSchema,
        config: CastConfig
    ) {
        super(schema, config)
    }

    // overrides the mkEnumVariantConstrData and readEnumUplcData methods,
    // detecting those enum variants that use a single field, and using a non-UPLC
    // representation that skips the field-name in the non-uplc (non-ConstrData) representation
    // for mkEnumVariant, this means the input data will have the nested data without the field-name
    // in its structure.  For readEnumUplcData, this means the output data will have the nested data
    // without the field-name in its structure.

    // uses the definition of these methods in the parent class!
    mkEnumVariantConstrData(
        tag: number,
        schema: EnumTypeSchema,
        variantFields: any,
        defs: Record<string, TypeSchema>,
        dataPath: string,
    ) : ConstrData {
        const variantSchema = schema.variantTypes[tag];
        let fieldData = variantFields
        if (variantSchema.fieldTypes.length == 1) {
            const field0 = variantSchema.fieldTypes[0]
            fieldData = { [field0.name]: variantFields }
        }            
        return super.mkEnumVariantConstrData(
            tag, schema, fieldData, defs, dataPath
        )
    }
 
    readEnumUplcData(
        variantSchema: VariantTypeSchema,
        fields: UplcData[],
        context: UplcToSchemaContext,
        enumSchema: EnumTypeSchema,        
    ) : Record<string, any> {
        let result = super.readEnumUplcData(variantSchema, fields, context, enumSchema)

        if (variantSchema.fieldTypes.length == 1) {
            const field0 = variantSchema.fieldTypes[0]
            const variantName = variantSchema.name
            result[variantName] = result[variantName][field0.name]
        }
        return result
    }
}