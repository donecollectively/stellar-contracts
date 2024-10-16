import { genTypes, type TypeSchema } from "@helios-lang/contract-utils";
import type { HeliosScriptBundle } from "./HeliosScriptBundle.js";

export type HeliosTypeInfo = {
    kind: TypeSchema["kind"];
    canonicalType: string;
    permissiveType: string;
};

export type HeliosVariantInfo = {
    fields: Record<string, HeliosTypeInfo>;
};

export type HeliosEnumInfo = {
    kind: "enum";
    enumName: string;
    variants: Record<string, HeliosVariantInfo>;
};

/**
 * General type information for the datum and redeemer types in a helios script
 * bundle.  Not exactly the same as the types generated for api access
 * to on-chain data, but covering the same space.  Each enum variant
 * is separately typed, enabling the type-generation to be more precise
 * in creating ergonomic branded types for reading, detecting, and writing
 * each variant.
 */
export type HeliosBundleTypeInfo = {
    datum: Option<HeliosTypeInfo | HeliosEnumInfo>;
    redeemer: HeliosTypeInfo | HeliosEnumInfo;
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
    constructor(bundle: HeliosScriptBundle) {
        this.bundle = bundle;

        const types = this.gatherRawTypes(bundle);

        const redeemerApiTypes = this.mkRedeemerApiTypes(types.redeemer);
        if (types.datum) {
            const mkDatumApiTypes = this.mkDatumApiTypes(types.datum);
            const readDatumApiTypes = this.readDatumApiTypes(types.datum);
        }
    }
    // it can begin gathering the types from the bundle's main contract

    gatherTypesFromBundle(bundle: HeliosScriptBundle) {
    }

    gatherRawTypes(
        bundle: HeliosScriptBundle,
        typeContext: BundleTypeContext
    ): HeliosBundleTypeInfo {
        const { program } = bundle;
        const argTypes = program.entryPoint.mainArgTypes;
        const argCount = argTypes.length;
        const programName = program.name;
        const mainModuleTypes = program.entryPoint.userTypes[programName];

        let datumTypeName, datumType, redeemerTypeName, redeemerType;
        if (argCount === 2) {
            datumType = argTypes[0];
            // datumTypeName = argTypes[0].name
            redeemerType = argTypes[1];
        } else {
            // no datum-type for minter
            // datumType = program.entryPoint.mainArgTypes[0]
            redeemerType = argTypes[0];
        }

        const datumSchema = datumType?.toSchema();
        const redeemerSchema = redeemerType.toSchema();

        const types: HeliosBundleTypeInfo = {
            datum: null,
            redeemer: null,
        } as any;

        if (redeemerSchema.kind == "enum") {
            // redeemers are write-only; no need for reading them.
            types.redeemer = {
                kind: "enum",
                enumName: redeemerSchema.name,
                variants: Object.fromEntries(
                    redeemerSchema.variantTypes.map((variant) => {
                        // todo: treat single-field variants without extra nesting
                        // todo: treat zero-field variants directly
                        const [canonicalType, permissiveType] =
                            genTypes(variant);
                        return [
                            variant.name,
                            {
                                kind: "variant",
                                canonicalType,
                                permissiveType,
                            },
                        ];
                    })
                ),
            };
        } else {
            const [canonicalType, permissiveType] = genTypes(redeemerSchema);
            types.redeemer = {
                kind: redeemerSchema.kind,
                canonicalType,
                permissiveType,
            };
            // todo
        }

        // these are the essential/low-level details about the datum, not
        // the developer-facing types provided by TS type-generation.
        // each enum variant's type is available separately.
        if (datumSchema?.kind == "enum") {
            types.datum = {
                kind: "enum",
                enumName: datumSchema.name,
                variants: Object.fromEntries(
                    datumSchema.variantTypes.map((variant) => {
                        const [canonicalType, permissiveType] =
                            genTypes(variant);
                        return [
                            variant.name,
                            {
                                kind: "variant",
                                canonicalType,
                                permissiveType,
                            },
                        ];
                    })
                ),
            };
            // when reading a datum, ... todo: more here ...

            debugger;
        } else if (datumSchema) {
            const [canonicalType, permissiveType] = genTypes(datumSchema);
            types.datum = {
                kind: datumSchema.kind,
                canonicalType,
                permissiveType,
            };
        }

        return types;
    }

    // it can add any found types to the context by name.
    
    // it can generate all the source code for the types in the context.
    // this creates a .d.ts file that grants clear type information for the .hlbundle.js

    generateTypesSource(className: string, parentClassName: string) {
        return "" + 
`// generated by StellarHeliosProject using Stellar heliosRollupTypeGen()
        
import type {CapoBundle} from "src/CapoHeliosBundle.ts"   // todo import  from @stellar-contracts
import type {HeliosScriptBundle} from "src/helios/HeliosScriptBundle.ts" // todo import from @stellar-contracts

type ${className}Activity = ${this.proxyOrRawFunctionType("redeemer")} 

export default class ${className} extends ${parentClassName} {
    ${this.generateDatumApiTypes()}
    Activity: ${className}Activity
    
    mkDatum: {
        placeholder: "generate proxy types here";
    }
    readDatum: {
        placeholder: "show proxy types here";
    }
}
`
                
    }

    // redeemer is write-only
    generateRedeemerApiTypes(redeemer: HeliosTypeInfo | HeliosEnumInfo) {
        return this.generateWriteApiTypes(redeemer);
    }
    // datums are read/write
    generateDatumApiTypes(datum: HeliosTypeInfo | HeliosEnumInfo) {
        this.generateWriteApiTypes(datum);
        this.generateReadApiTypes(datum);        
    }

    // generateReadDatumApiTypes(datum: HeliosTypeInfo | HeliosEnumInfo) {
    // }

    generateWriteApiTypes(typeInfo: HeliosTypeInfo | HeliosEnumInfo) {
        if (typeInfo.kind === "enum") {
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

            return Object.entries((typeInfo as HeliosEnumInfo).variants)
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

    generateReadApiTypes(typeInfo: HeliosTypeInfo | HeliosEnumInfo) {
        // this generates types for a function that takes on-chain
        // datum info, doing light transformations for ergonomics,
        // and returns the underlying data in its canonical form.
        //
        // Enums with no fields are returned as the a branded type
        //   having only the (full) `Enum::variant` name.
        // Enums with one field are returned as an object with the variant-name
        //   pointing to the nested field type
        // Enums with multiple fields are returnd as an object with the

        if (typeInfo.kind === "enum") {
            return Object.entries((typeInfo as HeliosEnumInfo).variants)
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