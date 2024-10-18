import { genTypes, type TypeSchema } from "@helios-lang/contract-utils";
import type {
    anyTypeDetails,
    EnumId,
    enumTypeDetails,
    HeliosBundleTypeDetails,
    HeliosBundleTypes,
    HeliosScriptBundle,
    typeDetails,
    variantTypeDetails,
} from "./HeliosScriptBundle.js";
import type {
    EnumTypeSchema,
    VariantTypeSchema,
} from "@helios-lang/type-utils";
import type { DataType } from "@helios-lang/compiler/src/index.js";
import type { EnumMemberType } from "@helios-lang/compiler/src/typecheck/common.js";

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
        datum?: DataType;
    };
    namedTypes: Record<string, anyTypeDetails> = {};

    constructor(bundle: HeliosScriptBundle) {
        this.bundle = bundle;
        this.namedTypes = {};
        const dataTypes = (this.topLevelDataTypes =
            this.bundle.getTopLevelTypes());
        this.topLevelTypeDetails = this.gatherTopLevelTypeDetails(dataTypes);
    }

    // it can begin gathering the types from the bundle's main contract
    // this has a side-effect of adding all nested named types to the context
    gatherTopLevelTypeDetails(
        dataTypes: HeliosBundleTypes
    ): HeliosBundleTypeDetails {
        return {
            datum: dataTypes.datum
                ? this.gatherTypeDetails(dataTypes.datum)
                : null,
            redeemer: this.gatherTypeDetails(dataTypes.redeemer),
        };
    }

    gatherTypeDetails(
        type: DataType,
        useTypeNamesAt?: "nestedField"
    ): anyTypeDetails {
        const schema = type.toSchema();
        if (schema.kind === "enum") {
            return this.gatherEnumDetails(type as any, useTypeNamesAt);
        } else {
            return this.gatherNonEnumDetails(type, useTypeNamesAt);
        }
    }

    gatherEnumDetails(
        enumType: { toSchema(): EnumTypeSchema } & DataType,
        useTypeNamesAt?: "nestedField"
    ): enumTypeDetails {
        // gathers names for any nested types, then generates minimal types
        // based on having those names registered in the context.
        const schema = enumType.toSchema();
        const enumName = schema.name;
        const module = this.extractModuleName(schema);
        // at type-gen time, we don't need this to be a fully-typed VariantMap.
        //  ... a lookup record is fine.
        const variants: Record<string, variantTypeDetails> = {};
        for (const member of schema.variantTypes) {
            const memberType =
                enumType.typeMembers[member.name].asEnumMemberType;
            if (!memberType) {
                throw new Error(
                    `Enum member type for ${member.name} not found`
                );
            }
            variants[member.name] = this.gatherVariantDetails(
                memberType as any,
                { module, enumName }
            );
        }

        const details = {
            enumName: schema.name,
            dataType: enumType,
            typeSchema: schema,
            variants,
            canonicalType: this.mkMinimalType(
                "canonical",
                schema,
                useTypeNamesAt
            ),
            permissiveType: this.mkMinimalType(
                "permissive",
                schema,
                useTypeNamesAt
            ),
        };
        this.namedTypes[schema.name] = details;
        return details;
    }

    private extractModuleName(schema: EnumTypeSchema | VariantTypeSchema) {
        return schema.id.replace(/__module__(\w+)?__.*$/, "$1");
    }

    gatherNonEnumDetails(
        dataType: DataType,
        useTypeNamesAt?: "nestedField"
    ): typeDetails {
        // gathers names for any nested types, then generates minimal types
        // based on having those names registered in the context.
        let typeName: string | undefined = undefined;
        const schema = dataType.toSchema();
        if (schema.kind === "enum") {
            throw new Error(
                "must not call gatherNonEnumTypeInfo with an enum schema"
            );
        }
        if ("internal" != schema.kind && "name" in schema) {
            typeName = schema.name;
        }

        // gather nested types where applicable, so they are added to the context.
        switch (schema.kind) {
            case "internal":
                break;
            case "reference":
            case "tuple":
                console.log(
                    "Not registering nested types for (as-yet unsupported)",
                    schema.kind
                );
                break;
            case "list":
                console.log("how to register a list's member DataType?");
                this.gatherTypeDetails((dataType as any).types[0]);
                debugger;
                // this.gatherTypeDetails(type.itemType);
                break;
            case "map":
                console.log("how to register a map's member DataTypes?");
                debugger;
                // this.gatherTypeDetails(type.keyType);
                // this.gatherTypeDetails(type.valueType);
                break;
            case "option":
                // console.log("how to register an Option's nested DataType?");
                this.gatherTypeDetails((dataType as any).types[0]);
                break;
            case "struct":
                for (const field of dataType.fieldNames) {
                    this.gatherTypeDetails(
                        dataType.instanceMembers[field].asDataType!,
                        "nestedField"
                    );
                }
                break;
            case "variant":
                console.log("How to register a variant's member DataTypes?");
                debugger;
                break;
            default:
                //@ts-expect-error - when all cases are covered, schema is ‹never›
                throw new Error(`Unsupported schema kind: ${schema.kind}`);
        }

        const details = {
            typeSchema: schema,
            typeName,
            dataType,
            canonicalType: this.mkMinimalType(
                "canonical",
                schema,
                useTypeNamesAt
            ),
            permissiveType: this.mkMinimalType(
                "permissive",
                schema,
                useTypeNamesAt
            ),
        };
        // if (schema.kind !== "internal") debugger
        if (typeName) {
            this.namedTypes[typeName] = details;
        }
        return details;
    }

    gatherVariantDetails(
        variantDataType: { toSchema(): VariantTypeSchema } & EnumMemberType,
        enumId: EnumId
    ): variantTypeDetails {
        if (!variantDataType.toSchema) debugger;
        const schema = variantDataType.toSchema();

        // console.log("Enum-variant name: " + schema.name);
        if (schema.kind !== "variant") {
            throw new Error(
                "Must not call gatherVariantTypeInfo with a non-variant schema"
            );
        }
        const fieldCount = schema.fieldTypes.length;
        const fields = {};

        // uses dataType.fieldNames and dataType.instanceMembers to gather the fields
        for (const fieldName of variantDataType.fieldNames) {
            const fieldMember = variantDataType.instanceMembers[fieldName];
            if (!fieldMember) {
                throw new Error(`Field member ${fieldName} not found`);
            }
            fields[fieldName] = this.gatherTypeDetails(fieldMember.asDataType!);
        }

        return {
            fields,
            fieldCount: fieldCount,
            variantName: schema.name,
            typeSchema: schema,
            dataType: variantDataType,
            canonicalType: this.mkMinimalType("canonical", schema, undefined, enumId.enumName),
            permissiveType: this.mkMinimalType("permissive", schema, undefined, enumId.enumName),
        };
    }

    mkMinimalType(
        typeVariety: "canonical" | "permissive",
        schema: TypeSchema,
        useTypeNamesAt?: "nestedField",
        parentName?: string
    ) {
        const varietyIndex = typeVariety === "canonical" ? 0 : 1;
        //@ts-expect-error - not every schema-type has a name
        let name = schema.name as string | undefined;

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
                    schema.itemType,
                    useTypeNamesAt
                )}>`;
            case "map":
                // todo: support string keys with simpler Record<string, ...> type
                return `Map<${this.mkMinimalType(
                    typeVariety,
                    schema.keyType,
                    useTypeNamesAt
                )}, ${this.mkMinimalType(
                    typeVariety,
                    schema.valueType,
                    useTypeNamesAt
                )}>`;
            case "option":
                return `Option<${this.mkMinimalType(
                    typeVariety,
                    schema.someType,
                    useTypeNamesAt
                )}>`;
            case "struct":
                if (typeVariety === "permissive") {
                    name = `${name}Like`;
                }
                if (useTypeNamesAt) return name;

                return `{\n${schema.fieldTypes
                    .map(
                        (field) =>
                            `    ${field.name}: ${this.mkMinimalType(
                                typeVariety,
                                field.type,
                                "nestedField"
                            )}`
                    )
                    .join("\n")}\n};\n`;
            case "enum":
                if (typeVariety === "permissive") {
                    name = `${name}Like`;
                }
                if (useTypeNamesAt) return name;
                const module = this.extractModuleName(schema);
                const enumId : EnumId = {module, enumName: name!}
                const $enumId = this.$enumId(enumId);
                return `EnumType<${$enumId}, {\n${schema.variantTypes
                    .map((variant) => {
                        return `        ${variant.name}: ${this.mkMinimalVariantType(
                            variant, 
                            enumId, 
                            typeVariety,
                            // "nestedField"
                        )}`;
                    })
                    .join(",\n")}\n    }\n>;\n`;
            case "variant":
                if (!parentName) {
                    debugger
                    throw new Error(
                        "Variant types need a parent type-name"
                    );
                }
                return this.mkMinimalVariantType(schema, {
                    enumName: parentName,
                    module: this.extractModuleName(schema),
                }, typeVariety );
            default:
                //@ts-expect-error - when all cases are covered, schema is ‹never›
                throw new Error(`Unsupported schema kind: ${schema.kind}`);
        }
    }

    mkMinimalVariantType(
        schema: VariantTypeSchema,
        enumId: EnumId,
        typeVariety: "canonical" | "permissive",
        useTypeNamesAt?: "nestedField"
    ) {
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
        let name = schema.name;
        if (typeVariety === "permissive") {
            name = `${name}Like`;
        }
        if (useTypeNamesAt) return schema.name;

        const fieldCount = schema.fieldTypes.length;
        const variety =
            fieldCount === 0
                ? "tagOnly"
                : fieldCount === 1
                ? "singletonField"
                : "fields";
        const $nlindent = "\n" + " ".repeat(12);
        const $nlindentMore = "\n" + " ".repeat(16);
        const $nloutdent = "\n" + " ".repeat(8);
        let quotedVariety =
            "fields" === variety ? `${$nlindent}"${variety}"` : `"${variety}"`;
        const fieldDefs =
            "tagOnly" == variety
                ? "never"
                : "singletonField" == variety
                ? $nlindent +
                  this.mkMinimalType(
                      typeVariety,
                      schema.fieldTypes[0].type,
                      "nestedField"
                  )
                : `{${
                      //pretter-ignore
                      schema.fieldTypes
                          .map(
                              (field) =>
                                  `${$nlindentMore}${
                                      field.name
                                  }: ${this.mkMinimalType(
                                      typeVariety,
                                      field.type,
                                      "nestedField"
                                  )}`
                          )
                          .join(",")
                  }${$nlindent}}`;

        const $enumId = this.$enumId(enumId);
        //pretter-ignore
        const minimalVariantSrc =
            `EnumVariant<${$enumId},`+(
            `${$nlindent}"Constr#${schema.tag}", ${quotedVariety}, ` +
            `${fieldDefs}` )+
            `${$nloutdent}>`;
        return minimalVariantSrc;
    }

    private $enumId(enumId: EnumId) {
        return `{module: "${enumId.module}", enumName: "${enumId.enumName}"}`;
    }

    generateTypesSource(className: string, parentClassName: string) {
        return (
            "" +
            `// generated by StellarHeliosProject using Stellar heliosRollupTypeGen()
        
import type { UplcData } from "@helios-lang/uplc";
import {
    Address,
    AssetClass,
    DatumHash,
    MintingPolicyHash,
    PubKey,
    PubKeyHash,
    ScriptHash,
    SpendingCredential,
    StakingCredential,
    StakingHash,
    StakingValidatorHash,
    TimeRange,
    TxId,
    TxInput,
    TxOutput,
    TxOutputId,
    TxOutputDatum,
    ValidatorHash,
    Value,
} from "@helios-lang/ledger";
import { Cast } from "@helios-lang/contract-utils";

import type {CapoBundle} from "src/CapoHeliosBundle.ts"   // todo import  from @stellar-contracts
import type {CapoDelegateBundle} from "src/delegation/CapoDelegateBundle.ts"   // todo import  from @stellar-contracts
import {
    HeliosScriptBundle,
    mkEnum,
    type EnumType,
    type EnumVariant,
} from "src/helios/HeliosScriptBundle.ts" // todo import from @stellar-contracts

${this.generateNamedDependencyTypes()}

export default 
class ${className} 
extends ${parentClassName} {
${this.generateDatumApiTypes()}
${this.generateRedeemerApiTypes()}
}
`
        );
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
                    return this.generateOtherNamedTypeSource(
                        name,
                        typeInfo as typeDetails
                    );
                }
            })
            .join("\n");
    }

    generateEnumTypeSource(name: string, typeInfo: enumTypeDetails) {
        return (
            `export type ${name} = ${typeInfo.canonicalType}\n` +
            `export type ${name}Like = ${typeInfo.permissiveType}\n`
        );
    }

    generateOtherNamedTypeSource(name: string, typeInfo: typeDetails) {
        return (
            `export type ${name} = ${typeInfo.canonicalType}\n` +
            `export type ${name}Like = ${typeInfo.permissiveType}\n`
        );
    }

    // redeemer is write-only
    generateRedeemerApiTypes() {
        return this.generateWriteApiTypes(
            this.topLevelTypeDetails.redeemer,
            "Activity"
        );
    }

    // datums are read/write, when present
    generateDatumApiTypes() {
        // datum: HeliosTypeInfo | HeliosEnumInfo) {
        if (!this.topLevelTypeDetails.datum) {
            return `// no datum types in this script`;
        }

        return (
            this.generateWriteApiTypes(
                this.topLevelTypeDetails.datum,
                "mkDatum"
            ) +
            this.generateReadApiTypes(
                this.topLevelTypeDetails.datum,
                "readDatum"
            )
        );

        // mkDatum: {
        //     placeholder: "generate proxy types here";
        // }
        // readDatum: {
        //     placeholder: "show proxy types here";
        // }
    }

    generateWriteApiTypes(typeInfo: anyTypeDetails, accessorName?: string) {
        if (!accessorName) {
            //@ts-expect-error - name not always present
            if (!typeInfo.typeSchema.name) {
                throw new Error("typeName must be provided for unnamed types");
            }
            //@ts-expect-error - name already guarded above
            accessorName = `mk${typeInfo.typeSchema.name}`;
        }
        if (typeInfo.typeSchema.kind === "enum") {
            return `    ${accessorName}: mkEnum<${typeInfo.typeSchema.name}Like>;\n`;
        }
        //@ts-expect-error - name not always present
        if (typeInfo.typeSchema.name) {
            //@ts-expect-error - name already guarded above
            return `    ${accessorName}: dataMaker<${typeInfo.typeSchema.name}Like>;\n`;
        } else {
            console.log(
                " ????????? is non-named dataMaker ever used?\nyes:" +
                    new Error("").stack!.split("\n").splice(2).join("\n")
            );
            return `    ${accessorName}: dataMaker<${typeInfo.permissiveType}>;\n`;
        }
    }

    generateReadApiTypes(typeInfo: anyTypeDetails, accessorName?: string) {
        if (!accessorName) {
            //@ts-expect-error - name not always present
            if (!typeInfo.typeSchema.name) {
                throw new Error("typeName must be provided for unnamed types");
            }
            //@ts-expect-error - name already guarded above
            accessorName = `read${typeInfo.typeSchema.name}`;
        }
        if (typeInfo.typeSchema.kind === "enum") {
            return `    ${accessorName}: readEnum<${typeInfo.typeSchema.name}>;\n`;
        }
        //@ts-expect-error - name not always present
        if (typeInfo.typeSchema.name) {
            //@ts-expect-error - name already guarded above
            return `    ${accessorName}: dataReader<${typeInfo.typeSchema.name}>;\n`;
        }
        return `    ${accessorName}: dataReader<${typeInfo.canonicalType}>;\n`;
    }
}
