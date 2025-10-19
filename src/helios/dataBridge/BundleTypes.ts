import { genTypes } from "@helios-lang/contract-utils";
import type {
    HeliosScriptBundle,
} from "../scriptBundling/HeliosScriptBundle.js";
import type {
    anyTypeDetails,
    EnumId,
    EnumTypeMeta,
    enumTypeDetails,
    HeliosBundleTypeDetails,
    HeliosBundleTypes, 
    makesUplcActivityEnumData,
    singleEnumVariantMeta,
    typeDetails,
    TypeVariety,
    VariantFlavor,
    variantTypeDetails
} from "../HeliosMetaTypes.js";
import type {
    EnumTypeSchema,
    VariantTypeSchema,
    TypeSchema
} from "@helios-lang/type-utils";
import type { DataType, EnumMemberType } from "@helios-lang/compiler";

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
        this.bundle.loadProgram();
        const dataTypes = (this.topLevelDataTypes =
            this.bundle.getTopLevelTypes());
        this.topLevelTypeDetails = this.gatherTopLevelTypeDetails(dataTypes);
    }

    get activityTypeDetails(): anyTypeDetails {
        return this.topLevelTypeDetails.redeemer;
    }

    get datumTypeDetails(): anyTypeDetails | undefined {
        return this.topLevelTypeDetails.datum;
    }

    // it can begin gathering the types from the bundle's main contract
    // this has a side-effect of adding all nested named types to the context
    gatherTopLevelTypeDetails(
        dataTypes: HeliosBundleTypes
    ): HeliosBundleTypeDetails {
        const {datum, redeemer, ...others} = dataTypes;
        const typeDetails = {
            datum: datum
                ? this.gatherTypeDetails(datum)
                : undefined,
            redeemer: this.gatherTypeDetails(redeemer),
        };

        for (const [typeName, dataType] of Object.entries(others)) {
            this.gatherTypeDetails(dataType as DataType);
        }

        return typeDetails
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
     * type-gen interface: registers a named type in the context
     */
    registerNamedType(details: anyTypeDetails) {
        const {
            //@ts-expect-error - some schemas don't have a name, but anything here does.
            typeSchema: { name },
            canonicalTypeName,
        } = details;
        const useTypeName = canonicalTypeName || name;
        if (!this.namedTypes[useTypeName]) {
            this.namedTypes[useTypeName] = details;
        } else {
            // console.log("No need to re-register type:", useTypeName, "(right?)");
            // right!
        }
    }

    private extractModuleName(id: string) {
        return id.replace(/__module__(\w+)?__.*$/, "$1");
    }

    private extractVariantParentName(id: string) {
        // given input "__module__CapoHelpers__CapoDatum[]__CharterData",
        //   ... returns "CapoDatum", not "CapoHelpers"
        return id.replace(/__module__(\w+)?__(\w+)?\[\]__.*/, "$2");
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

        let parentNameMaybe : string | undefined = undefined;
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
                this.gatherTypeDetails((dataType as any)._types[0]);
                // this.gatherTypeDetails(type.itemType);
                break;
            case "map":
                this.gatherTypeDetails((dataType as any)._types[0]);
                this.gatherTypeDetails((dataType as any)._types[1]);
            case "option":
                this.gatherTypeDetails((dataType as any)._types[0]);
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
                // we only hit this case when a nested variant is encountered
                //   as a field of some other data structure, where only that specific variant-type
                //   is expected.  When iterating the variants defined in an enum type,
                //   gatherEnumDetails() calls gatherVariantDetails(), but when this path
                //   is hit, we may need to gather those enum details separately.
                // if (schema.name == "CharterData")
                //     debugger;

                const vType = dataType as EnumMemberType;
                parentNameMaybe = vType.parentType.name;
                return this.gatherVariantDetails(
                    vType as any,
                    { 
                        module:  this.extractModuleName(schema.id),
                        enumName: vType.parentType.name
                    }
                );
                break;
            default:
                //@ts-expect-error - when all cases are covered, schema is ‹never›
                throw new Error(`Unsupported schema kind: ${schema.kind}`);
        }

        const canonType = this.mkMinimalType("canonical", schema, undefined, parentNameMaybe);
        const ergoType = this.mkMinimalType("ergonomic", schema, undefined, parentNameMaybe);
        const details: typeDetails<any> = {
            typeSchema: schema,
            typeName,
            dataType,
            canonicalType: canonType,
            ergoCanonicalType:
                ergoType == canonType
                    ? typeName
                        ? `${typeName}/*like canon-other*/`
                        : ergoType
                    : ergoType,
            permissiveType: this.mkMinimalType("permissive", schema, undefined, parentNameMaybe),
            moreInfo: undefined,
        };
        // if (schema.kind !== "internal") debugger
        // if (schema.kind === "struct") debugger
        if (typeName) {
            details.canonicalTypeName = typeName;
            details.ergoCanonicalTypeName = `Ergo${typeName}`;
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
        const module = this.extractModuleName(schema.id);
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
            // this happens when the enum is a nested field of a struct or variant
            // console.log("enum", enumName, "is used as a nested field, and that's okay!");
            // it's fine to have this useTypeNames hint coming in, but we don't want
            // to use the type-name when registering the enum itself; see "XXX" comments below.
        }

        const canonType = this.mkMinimalType("canonical", schema);
        const ergoType = this.mkMinimalType("ergonomic", schema);
        const details: enumTypeDetails<any> = {
            enumName: schema.name,
            dataType: enumType,
            typeSchema: schema,
            variants,
            canonicalTypeName: `${enumName}`,
            ergoCanonicalTypeName: `Ergo${enumName}`,
            permissiveTypeName: `${enumName}Like`,
            canonicalMetaType: this.mkMinimalEnumMetaType("canonical", schema),
            permissiveMetaType: this.mkMinimalEnumMetaType(
                "permissive",
                schema
            ),
            canonicalType: canonType,
            ergoCanonicalType:
                ergoType == canonType
                    ? `${enumName}/*like canon enum*/`
                    : ergoType,
            permissiveType: this.mkMinimalType(
                "permissive",
                schema
                // XXX here, we always want to register the true type of the enum, not the type-name
                // XXX useTypeNamesAt
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
        const canonicalTypeName =
            fieldCount > 0 ? `${enumId.enumName}$${variantName}` : "tagOnly";
        const permissiveTypeName =
            fieldCount > 0
                ? `${enumId.enumName}$${variantName}Like`
                : "tagOnly";
        const canonType = this.mkMinimalType(
            "canonical",
            schema,
            undefined,
            enumId.enumName
        );
        const ergoType = this.mkMinimalType(
            "ergonomic",
            schema,
            undefined,
            enumId.enumName
        );
        const details: variantTypeDetails<any> = {
            fields,
            fieldCount: fieldCount,
            variantName: variantName,
            typeSchema: schema,
            dataType: variantDataType,
            canonicalTypeName,
            ergoCanonicalTypeName: `${enumId.enumName}$Ergo$${variantName}`,
            permissiveTypeName,
            canonicalType: canonType,
            ergoCanonicalType:
                ergoType == canonType
                    ? `${enumId.enumName}$${variantName}  /*ergo like-canonical-this-variant*/`
                    : ergoType,
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
            details.moreInfo = moreInfo;
        }
        if (fieldCount == 1) {
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
        typeVariety: TypeVariety,
        schema: TypeSchema,
        useTypeNamesAt?: "nestedField",
        parentName?: string
    ): string {
        // uses the canonical underlying type for "ergonomic" versions of internal types
        const varietyIndex = typeVariety === "permissive" ? 1 : 0;
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
                    "nestedField"
                )}>`;
            case "map":
                // todo: support string keys with simpler Record<string, ...> type
                return `Map<${this.mkMinimalType(
                    typeVariety,
                    schema.keyType,
                    "nestedField"
                )}, ${this.mkMinimalType(
                    typeVariety,
                    schema.valueType,
                    "nestedField"
                )}>`;
            case "option":
                return `${this.mkMinimalType(
                    typeVariety,
                    schema.someType,
                    useTypeNamesAt
                )} | undefined`;
            case "struct":
                if (typeVariety === "permissive") {
                    nameLikeOrName = $nameLike;
                } else if (typeVariety === "ergonomic") {
                    nameLikeOrName = `Ergo${name}`;
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
                    nameLikeOrName = $nameLike; // `IntersectedEnum<${$nameLike}>`;
                } else if (typeVariety === "ergonomic") {
                    nameLikeOrName = `Ergo${name}`;
                }
                if (useTypeNamesAt) return nameLikeOrName as string;

                const module = this.extractModuleName(schema.id);
                const enumId: EnumId = { module, enumName: name! };

                return schema.variantTypes
                    .map((variant) => {
                        return `\n        | { ${
                            variant.name
                        }: ${this.mkMinimalType(
                            typeVariety,
                            variant,
                            "nestedField",
                            enumId.enumName
                        )} /*minEnumVariant*/ }`;
                    })
                    .join("") + "\n";

            case "variant":
                if (!parentName) {
                    parentName = this.extractVariantParentName(schema.id);
                }

                const variantInfo = this.mkMinimalVariantType(
                    schema,
                    typeVariety,
                    parentName
                );
                if (variantInfo === "tagOnly") return variantInfo;
                if (Array.isArray(variantInfo)) {
                    const fullVariantName = `${parentName}$${name}`;
                    if (typeVariety === "permissive") {
                        nameLikeOrName = `${parentName}$${$nameLike}`;
                    } else if (typeVariety === "ergonomic") {
                        // todo maybe; it will tend to shrink the type output size
                        //  -- the issue is, the type info isn't necessarily available yet
                        //  -- might need to use a two-pass process, gathering type info first

                        // const thisType = this.namedTypes[fullVariantName];
                        // if (!thisType) {
                        //     debugger
                        //     throw new Error(`No named type found for ${fullVariantName}`);
                        // }
                        // nameLikeOrName = thisType.canonicalType == thisType.ergoCanonicalType ?
                        //     `${parentName}$${name} /*same as $Ergo$ variant*/` :
                        nameLikeOrName = `${parentName}$Ergo$${name}`;
                    } else {
                        nameLikeOrName = fullVariantName;
                    }
                    if (useTypeNamesAt) return nameLikeOrName;

                    return `{${variantInfo.join(`,`)}\n` + `}\n`;
                } else {
                    // variant only has one field

                    return `/* implied wrapper { ${schema.fieldTypes[0].name}: ... } for singleVariantField */ \n\t\t\t${variantInfo}   `;
                }
            default:
                //@ts-expect-error - when all cases are covered, schema is ‹never›
                throw new Error(`Unsupported schema kind: ${schema.kind}`);
        }
    }

    mkMinimalEnumMetaType(typeVariety: TypeVariety, schema: EnumTypeSchema) {
        const name = schema.name;

        const module = this.extractModuleName(schema.id);
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
        typeVariety: TypeVariety,
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
        typeVariety: TypeVariety,
        parentName: string
    ): string | string[] {
        const $nlindent = "\n" + " ".repeat(4);
        // const $nlindentMore = "\n" + " ".repeat(16);

        const variantFlavor = this.variantFlavor(schema);
        switch (variantFlavor) {
            case "tagOnly":
                return "tagOnly";
            case "singletonField":
                return this.mkMinimalType(
                    typeVariety,
                    schema.fieldTypes[0].type,
                    "nestedField"
                );
            case "fields":
                //pretter-ignore
                return schema.fieldTypes.map(
                    (field) =>
                        `${$nlindent}${field.name}: ${this.mkMinimalType(
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
