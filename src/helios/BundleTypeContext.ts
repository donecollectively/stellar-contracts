import { genTypes, type TypeSchema } from "@helios-lang/contract-utils";
import type { HeliosScriptBundle } from "./HeliosScriptBundle.js";
import type {
    EnumTypeSchema,
    VariantTypeSchema,
} from "@helios-lang/type-utils";
import type { DataType } from "@helios-lang/compiler/src/index.js";
import type { EnumMemberType } from "@helios-lang/compiler/src/typecheck/common.js";

export type AnyHeliosTypeInfo = TypeSchema | anyTypeDetails;
export type anyTypeDetails = typeDetails | enumTypeDetails;

export type typeDetails = {
    typeName?: string;
    typeSchema: TypeSchema;
    dataType: DataType;
    canonicalType: string; // minimal canonical type
    permissiveType?: string; // minimal permissive type
};

export type variantTypeDetails = {
    variantName: string; // ??????????????????????
    fieldCount: number;
    fields: Record<string, anyTypeDetails>;
    typeSchema: VariantTypeSchema; // for consistency
    dataType: DataType;
    canonicalType: string; // minimal canonical type
    permissiveType: string; // minimal permissive type
};

export type enumTypeDetails = {
    enumName: string;
    typeSchema: EnumTypeSchema; // for consistency
    dataType: DataType;
    variants: Record<string, variantTypeDetails>;
    canonicalType: string; // minimal canonical type
    permissiveType: string; // minimal permissive type
};

/**
 * General type information for the datum and redeemer types in a helios script
 * bundle.  Not exactly the same as the types generated for api access
 * to on-chain data, but covering the same space.  Each enum variant
 * is separately typed, enabling the type-generation to be more precise
 * in creating ergonomic branded types for reading, detecting, and writing
 * each variant.
 */
export type HeliosBundleTypeDetails = {
    datum: Option<typeDetails | enumTypeDetails>;
    redeemer: typeDetails | enumTypeDetails;
};

/**
 * BundleTypeContext gathers any number of types expressible for an on-chain Helios script,
 * and generates types and type aliases for the off-chain TypeScript context.
 *
 * Each struct type is directly expressed as its name
 * Each enum type is expressed as a proxy type, unioned with the possible raw enum variants for that type
 * As each type is encountered (as a **nested field** within a datum or redeemer), any named types encountered
 * are added to the context, with any recursive expansions generated and added to the context, depth-first,
 * ... then the named type is used for the **nested field** where it was encountered.
 */
export class BundleTypeContext {
    bundle: HeliosScriptBundle;
    topLevelTypeDetails: HeliosBundleTypeDetails;
    topLevelDataTypes: {
        redeemer: DataType;
        datum?: DataType
    }
    namedTypes: Record<string, anyTypeDetails> = {};

    constructor(bundle: HeliosScriptBundle) {
        this.bundle = bundle;
        this.namedTypes = {};
        const {
            dataTypes,
            typeDetails
        } = this.gatherTopLevelTypeDetails();        
        this.topLevelTypeDetails = typeDetails;
        this.topLevelDataTypes = dataTypes;
        // const types = this.gatherRawTypes(bundle);

        // const redeemerApiTypes = this.mkRedeemerApiTypes(types.redeemer);
        // if (types.datum) {
        //     const mkDatumApiTypes = this.mkDatumApiTypes(types.datum);
        //     const readDatumApiTypes = this.readDatumApiTypes(types.datum);
        // }
    }

    // it can begin gathering the types from the bundle's main contract
    // this has a side-effect of adding all nested named types to the context
    gatherTopLevelTypeDetails(): {
        typeDetails: HeliosBundleTypeDetails 
        dataTypes: {
            redeemer: DataType
            datum?: DataType
        }
    } {
        const { program } = this.bundle;
        const argTypes = program.entryPoint.mainArgTypes;
        const argCount = argTypes.length;
        const programName = program.name;
        const mainModuleTypes = program.entryPoint.userTypes[programName];

        let datumType : DataType | undefined
        let redeemerType : DataType
        let redeemerTypeName : string = ""
        let datumTypeName : string = ""
        if (argCount === 2) {
            datumType = argTypes[0];
            datumTypeName = argTypes[0].name
            redeemerType = argTypes[1];
        } else {
            // no datum-type for minter
            // datumType = program.entryPoint.mainArgTypes[0]
            redeemerType = argTypes[0];
            redeemerTypeName = argTypes[0].name
        }

        return {
            dataTypes: {
                datum: datumType,
                redeemer: redeemerType,
            },
            typeDetails: {
                datum: datumType ? this.gatherTypeDetails(datumType) : null,
                redeemer: this.gatherTypeDetails(redeemerType),
            }
        };
    }

    gatherTypeDetails(type: DataType): anyTypeDetails {
        const schema = type.toSchema();
        if (schema.kind === "enum") {
            return this.gatherEnumDetails(type as any);
        } else {
            return this.gatherNonEnumDetails(type);
        }
    }

    gatherEnumDetails(enumType: {toSchema(): EnumTypeSchema} & DataType ): enumTypeDetails {
        // gathers names for any nested types, then generates minimal types
        // based on having those names registered in the context.        
        const schema = enumType.toSchema();
        console.log("How to register an enum's member DataTypes?");

        const variants : Record<string, variantTypeDetails> = {}
        // iterate the type's typeMembers, check if they're UplcData, gather \
        // variant details from them        
        for (const member of schema.variantTypes) {
            const memberType = enumType.typeMembers[member.name].asEnumMemberType;
            if (!memberType) {
                throw new Error(`Enum member type for ${member.name} not found`);
            }
            variants[member.name] = this.gatherVariantDetails(memberType as any);
          }
      
        const details = {
            enumName: schema.name,
            dataType: enumType,
            typeSchema: schema,
            variants,
            canonicalType: this.mkMinimalType("canonical", schema),
            permissiveType: this.mkMinimalType("permissive", schema),
        };
        this.namedTypes[schema.name] = details;
        return details
    }

    gatherNonEnumDetails(dataType: DataType): typeDetails {
        // gathers names for any nested types, then generates minimal types
        // based on having those names registered in the context.        
        let typeName: string | undefined = undefined;
        const schema = dataType.toSchema();
        if (schema.kind === "enum") {
            debugger
            throw new Error("must not call gatherNonEnumTypeInfo with an enum schema");
        }
        if ("internal" != schema.kind && "name" in schema) {
            typeName = schema.name;
        }

        // gather nested types where applicable, so they are added to the context.
        switch (schema.kind) {
            case "internal":
                break
            case "reference":
            case "tuple":
                console.log("Not registering nested types for", schema.kind);
                break
            case "list":
                console.log("how to register a list's member DataType?");
                debugger
                // this.gatherTypeDetails(type.itemType);
                break
            case "map":
                console.log("how to register a map's member DataTypes?");
                debugger
                // this.gatherTypeDetails(type.keyType);
                // this.gatherTypeDetails(type.valueType);
                break
            case "option":
                // console.log("how to register an Option's nested DataType?");
                this.gatherTypeDetails((dataType as any).types[0])
                break
            case "struct":
                for (const field of dataType.fieldNames) {
                    this.gatherTypeDetails(dataType.instanceMembers[field].asDataType!);
                }
                console.log("How to register a struct's member DataTypes?");
                // schema.fieldTypes.forEach((field) => {
                //     this.gatherTypeDetails(field.type);
                // });
                break
            case "variant":
                console.log("How to register a variant's member DataTypes?");
                debugger
                // schema.fieldTypes.forEach((field) => {
                //     this.gatherTypeDetails(field.type);
                // });
                break
            default:
                //@ts-expect-error - when all cases are covered, schema is ‹never›
                throw new Error(`Unsupported schema kind: ${schema.kind}`);
        }

        const details = {
            typeSchema: schema,
            typeName,
            dataType,
            canonicalType: this.mkMinimalType("canonical", schema),
            permissiveType: this.mkMinimalType("permissive", schema),
        };
        if (schema.kind !== "internal") debugger
        if (typeName) {
            this.namedTypes[typeName] = details;
        }
        return details
    }

    gatherVariantDetails(variantDataType: {toSchema(): VariantTypeSchema} & EnumMemberType): variantTypeDetails {
        if (!variantDataType.toSchema) debugger
        const schema = variantDataType.toSchema();
        console.log("Enum-variant name: "+schema.name);
        if (schema.kind !== "variant") {
            throw new Error("Must not call gatherVariantTypeInfo with a non-variant schema");
        }
        const fieldCount = schema.fieldTypes.length;
        // console.log("how to register a variant's member DataTypes?");
        const fields = {};

        // use dataType.fieldNames and dataType.instanceMembers to gather the fields
        for (const fieldName of variantDataType.fieldNames) {
            const fieldMember = variantDataType.instanceMembers[fieldName];
            if (!fieldMember) {
                throw new Error(`Field member ${fieldName} not found`);
            }
            fields[fieldName] = this.gatherTypeDetails(fieldMember.asDataType!);
        }

        //  Object.fromEntries(
        //     schema.fieldTypes.map((field) => {
        //         return [field.name, this.gatherTypeDetails(field.type)];
        //     })
        // )

        // const canonicalType : string = fieldCount === 0 ? 
        // this.mkMinimalType("canonical", schema) : fieldCount === 1 ?
        // ...
        return {
            fields,
            fieldCount: fieldCount,
            variantName: schema.name,
            typeSchema: schema,
            dataType: variantDataType,
            canonicalType: this.mkMinimalType("canonical", schema),
            permissiveType: this.mkMinimalType("permissive", schema),
        };
    }

    mkMinimalType(typeVariety: "canonical" | "permissive", schema: TypeSchema) {
        const varietyIndex = typeVariety === "canonical" ? 0 : 1;
        // switch on each schema kind...
        switch (schema.kind) {
            case "internal":
                // use genType directly to return the indicated type
                return genTypes(schema)[varietyIndex];
            case "reference":
                throw new Error("References are not yet supported");
            case "tuple":
                throw new Error("Tuples are not yet supported");
            case "list":
                return `Array<${this.mkMinimalType(
                    typeVariety,
                    schema.itemType
                )}>`;
            case "map":
                // todo: support string keys with simpler Record<string, ...> type
                return `Map<${this.mkMinimalType(
                    typeVariety,
                    schema.keyType
                )}, ${this.mkMinimalType(
                    typeVariety, 
                    schema.valueType
                )}>`;
            case "option":
                return `Option<${this.mkMinimalType(
                    typeVariety,
                    schema.someType
                )}>`;
            case "struct":
                if (typeVariety === "canonical") {
                    return schema.name;
                }
                return `to${schema.name}`;
            case "enum":
                if (typeVariety === "canonical") {
                    return schema.name;
                }
                return `to${schema.name}`;
            case "variant":
                if (typeVariety === "canonical") {
                    return schema.name;
                }
                return `to${schema.name}`;
            default: 
                //@ts-expect-error - when all cases are covered, schema is ‹never›
                throw new Error(`Unsupported schema kind: ${schema.kind}`);
            
        }

    }

    //    // this function is not intended to be the final form of type-gathering.
    //    // Copilot should use this as a reference.
    // gatherRawTypes(
    //     bundle: HeliosScriptBundle,
    // ): HeliosBundleTypeInfo {
    //     const { program } = bundle;
    //     const argTypes = program.entryPoint.mainArgTypes;
    //     const argCount = argTypes.length;
    //     const programName = program.name;
    //     const mainModuleTypes = program.entryPoint.userTypes[programName];
    //
    //     let datumTypeName, datumType, redeemerTypeName, redeemerType;
    //     if (argCount === 2) {
    //         datumType = argTypes[0];
    //         // datumTypeName = argTypes[0].name
    //         redeemerType = argTypes[1];
    //     } else {
    //         // no datum-type for minter
    //         // datumType = program.entryPoint.mainArgTypes[0]
    //         redeemerType = argTypes[0];
    //     }
    //
    //     const datumSchema = datumType?.toSchema();
    //     const redeemerSchema = redeemerType.toSchema();
    //
    //     const types: HeliosBundleTypeInfo = {
    //         datum: null,
    //         redeemer: null,
    //     } as any;
    //
    //     if (redeemerSchema.kind == "enum") {
    //         // redeemers are write-only; no need for reading them.
    //         types.redeemer = {
    //             enumName: redeemerSchema.name,
    //             typeSchema: redeemerSchema,
    //             variants: Object.fromEntries(
    //                 redeemerSchema.variantTypes.map((variant) => {
    //                     // todo: treat single-field variants without extra nesting
    //                     // todo: treat zero-field variants directly
    //                     const [canonicalType, permissiveType] =
    //                         genTypes(variant);
    //                     return [
    //                         variant.name,
    //                         {
    //                             kind: "variant",
    //                             canonicalType,
    //                             permissiveType,
    //                         },
    //                     ];
    //                 })
    //             ),
    //         };
    //     } else {
    //         const [canonicalType, permissiveType] = genTypes(redeemerSchema);
    //         types.redeemer = {
    //             kind: redeemerSchema.kind,
    //             canonicalType,
    //             permissiveType,
    //         };
    //         // todo
    //     }
    //
    //     // these are the essential/low-level details about the datum, not
    //     // the developer-facing types provided by TS type-generation.
    //     // each enum variant's type is available separately.
    //     if (datumSchema?.kind == "enum") {
    //         types.datum = {
    //             kind: "enum",
    //             enumName: datumSchema.name,
    //             variants: Object.fromEntries(
    //                 datumSchema.variantTypes.map((variant) => {
    //                     const [canonicalType, permissiveType] =
    //                         genTypes(variant);
    //                     return [
    //                         variant.name,
    //                         {
    //                             kind: "variant",
    //                             canonicalType,
    //                             permissiveType,
    //                         },
    //                     ];
    //                 })
    //             ),
    //         };
    //         // when reading a datum, ... todo: more here ...
    //
    //         debugger;
    //     } else if (datumSchema) {
    //         const [canonicalType, permissiveType] = genTypes(datumSchema);
    //         types.datum = {
    //             kind: datumSchema.kind,
    //             canonicalType,
    //             permissiveType,
    //         };
    //     }
    //
    //     return types;
    // }

    // it can add any found types to the context by name.

    // it can generate all the source code for the types in the context.
    // this creates a .d.ts file that grants clear type information for the .hlbundle.js

    generateTypesSource(className: string, parentClassName: string) {
        return (
            "" +
            `// generated by StellarHeliosProject using Stellar heliosRollupTypeGen()
        
import type {CapoBundle} from "src/CapoHeliosBundle.ts"   // todo import  from @stellar-contracts
import type {HeliosScriptBundle} from "src/helios/HeliosScriptBundle.ts" // todo import from @stellar-contracts

${this.generateNamedDependencyTypes()}
${this.maybeGenerateNamedDatumProxyType(className)}
type ${className}Activity = ${this.generateProxyOrRawFunctionType("redeemer")} 

export default class ${className} extends ${parentClassName} {
    ${this.generateDatumApiTypes()}
    Activity: ${className}Activity    
}
`
        );
    }

    maybeGenerateNamedDatumProxyType(className: string) {
        if (!this.topLevelTypeDetails.datum) {
            return `// no datum types in this script`;
        }
        return `type ${className}Datum = ${this.generateProxyOrRawFunctionType(
            "datum"
        )}\n\n`;
    }

    generateProxyOrRawFunctionType(typeName: "datum" | "redeemer" | "named") {
        //pretter-ignore
        return `{ 
    placeholderFor: "${typeName} proxy or raw function type"
};\n\n`;
    }

    generateNamedDependencyTypes() {
        return Object.entries(this.namedTypes)
            .map(([name, typeInfo]) => {
                if (typeInfo.typeSchema.kind === "enum") {
                    return this.generateEnumTypeSource(
                        name,
                        typeInfo as enumTypeDetails
                    );
                } else {
                    return this.generateTypeSource(
                        name,
                        typeInfo as typeDetails
                    );
                }
            })
            .join("\n");
    }

    generateEnumTypeSource(name: string, typeInfo: enumTypeDetails) {
        return (
            `type ${name} = ${typeInfo.canonicalType}\n` +
            `type to${name} = ${typeInfo.permissiveType}\n\n`
        );
    }

    generateTypeSource(name: string, typeInfo: typeDetails) {
        return (
            `type ${name} = ${typeInfo.canonicalType}\n` +
            `type to${name} = ${typeInfo.permissiveType}\n\n`
        );
    }

    // redeemer is write-only
    generateRedeemerApiTypes() {
        return this.generateWriteApiTypes(this.topLevelTypeDetails.redeemer);
    }

    // datums are read/write, when present
    generateDatumApiTypes() {
        // datum: HeliosTypeInfo | HeliosEnumInfo) {
        if (!this.topLevelTypeDetails.datum) {
            return `// no datum types in this script`;
        }

        this.generateWriteApiTypes(this.topLevelTypeDetails.datum) +
            this.generateReadApiTypes(this.topLevelTypeDetails.datum);

        // mkDatum: {
        //     placeholder: "generate proxy types here";
        // }
        // readDatum: {
        //     placeholder: "show proxy types here";
        // }
    }

    // generateReadDatumApiTypes(datum: HeliosTypeInfo | HeliosEnumInfo) {
    // }

    generateWriteApiTypes(typeInfo: anyTypeDetails) {
        if (typeInfo.typeSchema.kind === "enum") {
            // When writing an enum variant with 0 fields, the typescript api for generating
            //   ... that enum variant data should require only the variant name,
            //   ... IF it is accessed via that type's named proxy (e.g. mkDatum.variantName
            //   ... or  `{ ..., someNestedField: /*proxy*/ SomeEnumType.variantName }`).  If not
            //   ... using the proxy type, then raw `{ ... someNestedField: { variantName: {} } }`
            //   ... form will be needed.
            //
            // When writing a single-field variant, the raw form needed will look like
            //   ... `{ variantName: { singleFIeldName: ‹nestedFieldData› } }` or,
            //   ... `{ ..., someNestedField: { variantName: { singleFieldName: ‹nestedFieldData› } } }`
            //   ... while the proxy- provided interface can be used like
            //   ... `mkDatum.variantName({...nestedFieldData})`
            //   ...  or `{ ..., someNestedField: /*proxy*/ SomeEnumType.variantName(‹nestedFieldData›) }`
            //
            // When an enum variant has multiple fields, we use the variant like a struct,
            //   ... with each named field being represented in the the type-proxy:
            //   ... `mkDatum.variantName({ field1: ‹fieldData›, field2: ... })`
            //   ... or `{ ..., someNestedField: /*proxy*/ SomeEnumType.variantName({ field1: ‹fieldData›, field2: ... }) }`
            //
            // In all these cases, the types for any datum/redeemer enum (or enum nested-field)
            //   ... should ideally indicate the EnumTypeProxy's aggregate named type, with the raw type
            //   ... as a secondary alternative for people who prefer to write out the full structure.
            //
            // The types returned by the proxy's accessors will be identical to the raw types.

            return Object.entries((typeInfo as enumTypeDetails).variants)
                .map(([variantName, variant]) => {
                    if (Object.keys(variant.fields).length === 0) {
                        return `${variantName}: ConstrData`;
                    }
                    if (Object.keys(variant.fields).length === 1) {
                        const fieldName = Object.keys(variant.fields)[0];
                        return `${variantName}: ${variant.fields[fieldName].permissiveType}`;
                    }
                    return `${variantName}: {
            ${Object.entries(variant.fields)
                .map(([fieldName, fieldType]) => {
                    return `${fieldName}: ${fieldType.permissiveType}`;
                })
                .join("\n")}
        }`;
                })
                .join("\n");
        } else {
            return `placeholder: "generate proxy types here"`;
        }
    }

    generateReadApiTypes(typeInfo: typeDetails | enumTypeDetails) {
        // this generates types for a function that takes on-chain
        // datum info, doing light transformations for ergonomics,
        // and returns the underlying data in its canonical form.
        //
        // Enums with no fields are returned as the a branded type
        //   having only the (full) `Enum::variant` name.
        // Enums with one field are returned as an object with the variant-name
        //   pointing to the nested field type
        // Enums with multiple fields are returnd as an object with the

        if (typeInfo.typeSchema.kind === "enum") {
            return Object.entries((typeInfo as enumTypeDetails).variants)
                .map(([variantName, variant]) => {
                    if (Object.keys(variant.fields).length === 0) {
                        return `${variantName}: Data`;
                    }
                    if (Object.keys(variant.fields).length === 1) {
                        const fieldName = Object.keys(variant.fields)[0];
                        return `${variantName}: ${variant.fields[fieldName].canonicalType}`;
                    }
                    return `${variantName}: {
            ${Object.entries(variant.fields)
                .map(([fieldName, fieldType]) => {
                    return `${fieldName}: ${fieldType.canonicalType}`;
                })
                .join("\n")}
        }`;
                })
                .join("\n");
        } else {
            return `placeholder: "show proxy types here"`;
        }
    }
}
