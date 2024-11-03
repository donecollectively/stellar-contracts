import { genTypes, type TypeSchema } from "@helios-lang/contract-utils";
import type {
    anyTypeDetails,
    EnumId,
    EnumTypeMeta,
    enumTypeDetails,
    HeliosBundleTypeDetails,
    HeliosBundleTypes,
    HeliosScriptBundle,
    makesUplcActivityEnumData,
    singleEnumVariantMeta,
    typeDetails,
    TypeVariety,
    VariantFlavor,
    variantTypeDetails,
} from "../HeliosScriptBundle.js";
import type {
    EnumTypeSchema,
    VariantTypeSchema,
} from "@helios-lang/type-utils";
import type { DataType } from "@helios-lang/compiler/src/index.js";
import type { EnumMemberType } from "@helios-lang/compiler/src/typecheck/common.js";

export interface TypeGenHooks<T> {
    registerNamedType?(details: anyTypeDetails): void;
    getMoreEnumInfo?(details: enumTypeDetails): T;
    getMoreStructInfo?(details: typeDetails): T;
    getMoreVariantInfo?(details: variantTypeDetails): T;
    getMoreTypeInfo?(details: typeDetails): T;
}

/**
 * Gathers any number of types expressible for an on-chain Helios script,
 * and generates types and type aliases for the off-chain TypeScript context.
 *
 * Each struct type is directly expressed as its name
 * Each enum type is expressed as a proxy type, unioned with the possible raw enum variants for that type
 * As each type is encountered (as a **nested field** within a datum or redeemer), any named types encountered
 * are added to the context, with any recursive expansions generated and added to the context, depth-first,
 * ... then the named type is used for the **nested field** where it was encountered.
 */
export class BundleTypes implements TypeGenHooks<undefined> {
    topLevelTypeDetails: HeliosBundleTypeDetails;
    topLevelDataTypes: HeliosBundleTypes;
    namedTypes: Record<string, anyTypeDetails> = {};

    constructor(
        public bundle: HeliosScriptBundle,
        public collaborator?: TypeGenHooks<any>
    ) {
        this.namedTypes = {};
        const dataTypes = (this.topLevelDataTypes =
            this.bundle.getTopLevelTypes());
        this.topLevelTypeDetails = this.gatherTopLevelTypeDetails(dataTypes);
    }

    get activityTypeDetails(): anyTypeDetails {
        return this.topLevelTypeDetails.redeemer;
    }

    get datumTypeDetails(): Option<anyTypeDetails> {
        return this.topLevelTypeDetails.datum;
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
            return this.gatherOtherTypeDetails(type, useTypeNamesAt);
        }
    }

    /**
     * type-gen interface: registers a named type in the context,
     *   ... with any
     */
    registerNamedType(details: anyTypeDetails) {
        const {
            //@ts-expect-error - some schemas don't have a name, but anything here does.
            typeSchema: { name },
            canonicalTypeName,
        } = details;
        if (canonicalTypeName) {
            this.namedTypes[canonicalTypeName] = details;
        } else {
            this.namedTypes[name] = details;
        }
    }

    private extractModuleName(schema: EnumTypeSchema | VariantTypeSchema) {
        return schema.id.replace(/__module__(\w+)?__.*$/, "$1");
    }

    gatherOtherTypeDetails(
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
                // built-in data types don't need to be registered in the type context
                break;
            case "reference":
            case "tuple":
                console.log(
                    "Not registering nested types for (as-yet unsupported)",
                    schema.kind
                );
                break;
            case "list":
                this.gatherTypeDetails((dataType as any).types[0]);
                // this.gatherTypeDetails(type.itemType);
                break;
            case "map":
                this.gatherTypeDetails((dataType as any).types[0]);
                this.gatherTypeDetails((dataType as any).types[1]);
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

        const details: typeDetails<any> = {
            typeSchema: schema,
            typeName,
            dataType,
            canonicalType: this.mkMinimalType(
                "canonical",
                schema,
            ),
            permissiveType: this.mkMinimalType(
                "permissive",
                schema,
            ),
            moreInfo: undefined,
        };
        // if (schema.kind !== "internal") debugger
        // if (schema.kind === "struct") debugger
        if (typeName) {
            details.canonicalTypeName = typeName;
            details.permissiveTypeName = `${typeName}Like`;
            this.registerNamedType(details);
            const moreInfo =
                schema.kind == "struct"
                    ? this.collaborator?.getMoreStructInfo?.(details)
                    : this.collaborator?.getMoreTypeInfo?.(details);
            if (moreInfo) details.moreInfo = moreInfo;
            this.collaborator?.registerNamedType?.(details);
        }
        return details;
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

        if (useTypeNamesAt) {
            throw new Error("surprise!");
        }
        const details: enumTypeDetails<any> = {
            enumName: schema.name,
            dataType: enumType,
            typeSchema: schema,
            variants,
            canonicalTypeName: `${enumName}`,
            permissiveTypeName: `${enumName}Like`,
            canonicalMetaType: this.mkMinimalEnumMetaType("canonical", schema),
            permissiveMetaType: this.mkMinimalEnumMetaType(
                "permissive",
                schema
            ),
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
            moreInfo: undefined,
        };

        this.registerNamedType(details);
        const moreInfo = this.collaborator?.getMoreEnumInfo?.(details);
        if (moreInfo) details.moreInfo = moreInfo;
        this.collaborator?.registerNamedType?.(details);

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

        const variantName = schema.name;
        const canonicalTypeName = fieldCount > 0 ? `${enumId.enumName}$${variantName}` : "tagOnly";
        const permissiveTypeName = fieldCount > 0 ? `${enumId.enumName}$${variantName}Like` : "tagOnly";
        const details: variantTypeDetails<any> = {
            fields,
            fieldCount: fieldCount,
            variantName: variantName,
            typeSchema: schema,
            dataType: variantDataType,
            canonicalTypeName,
            permissiveTypeName,
            canonicalType: this.mkMinimalType(
                "canonical",
                schema,
                undefined,
                enumId.enumName
            ),
            permissiveType: this.mkMinimalType(
                "permissive",
                schema,
                undefined,
                enumId.enumName
            ),
            canonicalMetaType: this.mkMinimalVariantMetaType(
                "canonical",
                schema,
                enumId
            ), //, "nestedField"),
            permissiveMetaType: this.mkMinimalVariantMetaType(
                "permissive",
                schema,
                enumId
            ), //, "nestedField"),
            moreInfo: undefined,
        };
        if (this.collaborator) {
            const moreInfo = this.collaborator.getMoreVariantInfo?.(details);
            details.moreInfo = moreInfo
        }
        if (fieldCount==1) {
            // debugger
        }

        // don't register named types for tagOnly variants; worthless indirection
        if (fieldCount > 1) {
            this.registerNamedType(details);
            this.collaborator?.registerNamedType?.(details);
        }

        // the enum itself is registered, and we don't need the variants registered separately.
        // this.collaborator?.registerNamedType?.(details);
        return details;
    }

    mkMinimalType(
        typeVariety: "canonical" | "permissive",
        schema: TypeSchema,
        useTypeNamesAt?: "nestedField",
        parentName?: string
    ): string {
        const varietyIndex = typeVariety === "canonical" ? 0 : 1;
        //@ts-expect-error - not every schema-type has a name
        let name = schema.name as string | undefined;
        let nameLikeOrName = name;
        let $nameLike = name ? `${name}Like` : undefined;

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
                    nameLikeOrName = $nameLike;
                }
                if (useTypeNamesAt) return nameLikeOrName as string;

                return `{\n${schema.fieldTypes
                    .map(
                        (field) =>
                            `    ${
                                field.name
                            }: /*minStructField*/ ${this.mkMinimalType(
                                typeVariety,
                                field.type,
                                "nestedField"
                            )}`
                    )
                    .join("\n")}\n}\n`;
            case "enum":
                if (typeVariety === "permissive") {
                    nameLikeOrName = $nameLike;
                }
                if (useTypeNamesAt) return nameLikeOrName as string;

                const module = this.extractModuleName(schema);
                const enumId: EnumId = { module, enumName: name! };

                return schema.variantTypes
                    .map((variant) => {
                        return `\n        | { ${
                            variant.name
                        }: /*minEnumVariant*/ ${this.mkMinimalType(
                            typeVariety,
                            variant,
                            "nestedField",
                            enumId.enumName
                        )} }`;
                    })
                    .join("");

            case "variant":
                if (!parentName) {
                    debugger;
                    throw new Error("Variant types need a parent type-name");
                }

                const variantInfo = this.mkMinimalVariantType(
                    schema,
                    typeVariety
                );
                if (variantInfo === "tagOnly") return variantInfo;
                if (Array.isArray(variantInfo)) {
                    if (typeVariety === "permissive") {
                        nameLikeOrName = `${parentName}$${$nameLike}`;
                    } else {
                        nameLikeOrName = `${parentName}$${name}`;
                    }
                    if (useTypeNamesAt) return nameLikeOrName;

                    return `{${
                        variantInfo.join(`,`)}\n`+
                    `}\n`;

                } else {
                    // variant only has one field
                    
                    return `${variantInfo} /*singleVariantField ; elided extra { ${schema.fieldTypes[0].name}: ${variantInfo}} structure*/\n  `;
                }
            default:
                //@ts-expect-error - when all cases are covered, schema is ‹never›
                throw new Error(`Unsupported schema kind: ${schema.kind}`);
        }
    }

    mkMinimalEnumMetaType(
        typeVariety: "canonical" | "permissive",
        schema: EnumTypeSchema
    ) {
        const name = schema.name;

        const module = this.extractModuleName(schema);
        const enumId: EnumId = { module, enumName: name! };
        const $enumId = `{module: "${enumId.module}", enumName: "${enumId.enumName}"}`;

        return `EnumTypeMeta<\n    ${$enumId}, {\n${schema.variantTypes
            .map((variantSchema) => {
                return `        ${
                    variantSchema.name
                }: ${this.mkMinimalVariantMetaType(
                    typeVariety,
                    variantSchema,
                    enumId
                    // "nestedField"
                )}`;
            })
            .join(",\n")}\n    }\n>;\n`;
    }

    mkMinimalVariantMetaType(
        typeVariety: "canonical" | "permissive",
        schema: VariantTypeSchema,
        enumId: EnumId
        // useTypeNamesAt?: "nestedField"
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
        //   ... while the interface can be used like
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
        let variantName = schema.name;
        // if (typeVariety === "permissive") {
        //     if (useTypeNamesAt) {
        //         // throw new Error("Write path not yet supported for variants");
        //         return `${variantName}Like /*writePath*/`;
        //     }
        //     // variant name remains unchanged in this case
        //     // variantName = `${variantName}Like`;
        // }
        // if (useTypeNamesAt) return `${variantName}`;

        const variantFlavor = this.variantFlavor(schema);
        const $nlindent = "\n" + " ".repeat(12);
        const $nloutdent = "\n" + " ".repeat(8);
        let quotedFlavor =
            "fields" === variantFlavor
                ? `${$nlindent}"${variantFlavor}"`
                : `"${variantFlavor}"`;

        const fieldDefs = this.mkMinimalType(
            typeVariety,
            schema,
            "nestedField",
            enumId.enumName
        );
        // this.mkMinimalVariantType(schema, typeVariety);

        const specialFlags: string[] = [];
        if (schema.fieldTypes[0]?.name === "seed") {
            specialFlags.push(`"isSeededActivity"`);
        }
        const $specialFlags = specialFlags.join(" | ") || `"noSpecialFlags"`;
        //pretter-ignore
        const minimalVariantSrc =
            `singleEnumVariantMeta<${enumId.enumName}Meta, "${variantName}",` +
            `${$nlindent}"Constr#${schema.tag}", ${quotedFlavor}, ` +
            `${fieldDefs}, ${$specialFlags}` +
            `${$nloutdent}>`;
        return minimalVariantSrc;
    }

    variantFlavor(schema: VariantTypeSchema): VariantFlavor {
        switch (schema.fieldTypes.length) {
            case 0:
                return "tagOnly";
            case 1:
                return "singletonField";
            default:
                return "fields";
        }
    }

    private mkMinimalVariantType(
        schema: VariantTypeSchema,
        typeVariety: TypeVariety
    ): string | string[] {
        const $nlindent = "\n" + " ".repeat(4);
        // const $nlindentMore = "\n" + " ".repeat(16);

        const variantFlavor = this.variantFlavor(schema);
        switch (variantFlavor) {
            case "tagOnly":
                return "tagOnly";
            case "singletonField":
                return (
                    this.mkMinimalType(
                        typeVariety,
                        schema.fieldTypes[0].type,
                        "nestedField"
                    )
                );
            case "fields":
                //pretter-ignore
                return schema.fieldTypes.map(
                    (field) =>
                        `${$nlindent}${
                            field.name
                        }: ${this.mkMinimalType(
                            typeVariety,
                            field.type,
                            "nestedField"
                        )}  /*minVariantField*/ `
                );
            default:
                throw new Error(
                    `Incomplete switch or invalid variant flavor: ${variantFlavor}`
                );
        }
    }
}
