import path from "path";
import { BundleTypes, type TypeGenHooks } from "./BundleTypes.js";
import type {
    anyTypeDetails,
    EnumId,
    enumTypeDetails,
    HeliosScriptBundle,
    typeDetails,
    variantTypeDetails,
} from "../HeliosScriptBundle.js";
import type { DataType } from "@helios-lang/compiler/src/index.js";
import type {
    EnumTypeSchema,
    TypeSchema,
    VariantTypeSchema,
} from "@helios-lang/type-utils";
import type { EnumMemberType } from "@helios-lang/compiler/src/typecheck/common.js";
import { Cast, genTypes } from "@helios-lang/contract-utils";
import { BundleBasedGenerator } from "./BundleBasedGenerator.js";

type dataBridgeTypeInfo = {
    accessorCode: string;
    castCode?: string;
    helperClassName?: string;
};

type fullDetails = anyTypeDetails<dataBridgeTypeInfo>;
type fullEnumTypeDetails = enumTypeDetails<dataBridgeTypeInfo>;
type fullVariantTypeDetails = variantTypeDetails<dataBridgeTypeInfo>;
type fullTypeDetails = typeDetails<dataBridgeTypeInfo>;

/**
 * Gathers any number of types expressible for an on-chain Helios script,
 * and does code generation for a class, including accessors for generating typed data
 * by converting expected data structures using the Cast class.
 *
 * The class is a sublcass of DataBridge, which provides some basics for working
 * with UPLC data, given the type-metadata.
 *
 * Uses the BundleTypes class as a helper, in which the bridge-generator is a
 * "collaborator" in that class.  Thus, the data-bridge has access to the same
 * key events in the schema-finding process, and can tap into all the essential
 * logic for finding types.
 *
 * This strategy is also used for generating the data-reader class.
 *
 * When generating methods in the new class, the following rules apply:
 *
 * 1.  Each struct type is directly exposed as its name, making <bridge>.<struct name>
 *      available for generating any data expected to match that form.
 *
 * 2.  Each enum type is exposed as its name, with nested accessors for each enum variant,
 *       ... with the accessors for each variant depend on the number of fields in the variant.
 *
 *     - if the variant has no fields, the accessor directly returns <cast>.toUplcData({ variantName: {} })
 *
 *     - if the variant has a single field, the accessor is a function that takes the field value
 *        (with a strong type) and returns <cast>.toUplcData({ variantName: { fieldName: value } }
 *
 *     - if the variant has multiple fields, the accessor is a function that takes a strongly-typed
 *       object having the fields and returns <cast>.toUplcData({ variantName: { ...fields } })
 *
 * While gathering types, all the known type names are registered in a local namespace,
 * with function implementations gathered for each type.
 *
 * As each type is encountered (as a **nested field** within a datum or redeemer), any named
 * types encountered are added to the context, with any recursive expansions generated and
 * added to the context, depth-first... then the named type is used for the **nested field**
 * where it was encountered.
 */
export class dataBridgeGenerator
    extends BundleBasedGenerator
    implements TypeGenHooks<dataBridgeTypeInfo>
{
    namedSchemas: Record<string, TypeSchema> = {};

    // satisfies TypeGenHooks<dataBridgeTypeInfo> for creating more details for an enum type
    getMoreEnumInfo?(typeDetails: enumTypeDetails): dataBridgeTypeInfo {
        const enumName = typeDetails.enumName;
        const helperClassName = `${enumName}Helper`;

        this.namedSchemas[enumName] = typeDetails.typeSchema;

        return {
            accessorCode: `get ${enumName}() {
                return new ${helperClassName}();
            }`,
            helperClassName,
        };
    }

    getMoreStructInfo?(typeDetails: typeDetails): dataBridgeTypeInfo {
        const structName = typeDetails.typeName!;
        const castMemberName = `__${structName}Cast`;

        this.namedSchemas[structName] = typeDetails.typeSchema;

        return {
            castCode: `
                 ${castMemberName}: Cast<${structName}Like, ${structName}> = new Cast<${structName}Like, ${structName}>(this.schema.${structName}, { isMainnet: true });
            `,
            accessorCode: `${structName}(fields: ${structName}Like}) {
                return this.${castMemberName}.toUplcData(fields);
            }`,
        };
    }

    getMoreVariantInfo?(details: variantTypeDetails): dataBridgeTypeInfo {
        return {} as any;
    }
    getMoreTypeInfo?(details: typeDetails): dataBridgeTypeInfo {
        return {} as any;
    }

    // creates a class providing an interface for creating each type of data relevent
    // for a contract script, with an 'activity' accessor for creating redeemer data,
    // a 'datum' accessor well-typed on-chain datum, and any utility functions defined
    // in on-chain scripts.
    // Any of these that are enums will have their own helper classes for creating
    //  the enum's specific variants.
    generateDataBridge(inputFile: string, projectName?: string) {
        const { bridgeClassName } = this.bundle;

        let imports = `
import { Cast } from "@helios-lang/contract-utils"
import type { UplcData } from "@helios-lang/uplc";
import type { 
    IntLike,
    ByteArrayLike,
 } from "@helios-lang/codec-utils";
import type {
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
import type { EnumTypeSchema, StructTypeSchema } from "@helios-lang/type-utils";

`;
        let scImports = `import {
    type tagOnly, 
    type hasSeed, 
    DataBridge, 
    EnumBrdige,
    type JustAnEnum,
    type isActivity
} from "@donecollectively/stellar-contracts"\n`;
        if (this._isSC) {
            scImports =
                `import { DataBridge } from "${this.mkRelativeImport(
                    inputFile,
                    "src/helios/dataBridge/DataBridge.js"
                )}"\n` +
                `import { 
    EnumBridge,
    type JustAnEnum,
} from "${this.mkRelativeImport(
                    inputFile,
                    "src/helios/dataBridge/EnumBridge.js"
                )}"\n` +
                `import type { tagOnly } from "${this.mkRelativeImport(
                    inputFile,
                    "src/helios/HeliosScriptBundle.js"
                )}"\n` +
                `import type {hasSeed, isActivity} from "${this.mkRelativeImport(
                    inputFile,
                    "src/StellarContract.js"
                )}"\n`;
        }
        return `// generated by Stellar Contracts dataBridgeGenerator
// based on types defined in ${this.bundle.program.name} (${
            this.bundle.main.name
        })
// recommended: CHECK THIS FILE INTO YOUR VERSION CONTROL SYSTEM
//   ... and keep checking in the changes as your on-chain types evolve.
//
// NOTE: this file is auto-generated; do not edit directly
${imports}
${scImports}
// todo: namespacing for all the good stuff here
// namespace ${bridgeClassName} {
${this.includeScriptNamedTypes(inputFile)}

//Note about @ts-expect-error drilling through protected accessors: This 
//   allows the interface for the nested accessor to show only the public details,
//   while allowing us to collaborate between these two closely-related classes.
//   Like "friends" in C++.

/**
 * data bridge for ${this.bundle.program.name} script (defined in ${
            this.bundle.constructor.name
        })}
 * main: ${this.bundle.main.name}, project: ${
            this.bundle.main.project || "‹local proj›"
        }
 * @remarks - note that you may override get dataBridgeName() { return "..." } to customize the name of this bridge class
 */
export class ${bridgeClassName} extends DataBridge {
    // for datum:
${this.includeDatumAccessors()}

// for activity types:
${this.includeActivityCreator()}

    // include accessors for other enums (other than datum/activity)

    // include accessors for any other structs (other than datum/activity)

    // TODO: include any utility functions defined in the contract
}
export default ${bridgeClassName};


${this.includeEnumHelperClasses()}
${this.includeNamedSchemas()}
// }
`;
    }

    // gatherDatumAccessors() {
    //     const {datumTypeName} = this
    //     if (!datumTypeName) {
    //         return '';
    //     }
    //     if (this.datumTypeDetails?.typeSchema?.kind === "enum") {
    //         return this.gatherEnumDatumAccessors(datumTypeName);
    //     }
    //     return this.gatherNonEnumDatumAccessors(datumTypeName);
    // }

    // gatherEnumDatumAccessors(datumTypeName: string) {
    //     // Implementation for generating datum accessors goes here
    //     const $indent = " ".repeat(8);
    //     return `
    // get ${datumTypeName}() {
    //     return this.datum
    // }
    // datum : makesUplcEnumData<${datumTypeName}Like> = {\n${
    //     this.generateEnumVariantAccessor(datumTypeName,
    // }
    // }

    //     `;
    // }

    // generateNonEnumDatumAccessors(datumTypeName: string) {
    //     // Implementation for generating datum accessors goes here
    //     throw new Error("Not yet implemented");
    // }

    includeScriptNamedTypes(inputFile: string) {
        // if (inputFile.match(/StructDatum/)) debugger;
        const typeFile = inputFile.replace(/\.bridge.ts$/, ".typeInfo.js");
        let relativeTypeFile = path.relative(path.dirname(inputFile), typeFile);
        if (relativeTypeFile[0] !== ".") {
            relativeTypeFile = `./${relativeTypeFile}`;
        }

        return `
import type {\n${Object.entries(this.typeBundle.namedTypes)
            .map(([typeName, typeDetails]) => {
                return `    ${typeName}, ${typeName}Like`;
            })
            .join(",\n")}
} from "${relativeTypeFile}";

export type * as types from "${relativeTypeFile}";
import type * as types from "${relativeTypeFile}";\n\n`;
    }

    includeActivityCreator() {
        // like datumAccessors, but without a need for reading
        const activityDetails = this.activityTypeDetails;
        if (!activityDetails) {
            throw new Error(
                `${this.bundle.constructor.name}: missing required activity type`
            );
        }

        let schemaName = "";
        let activityName;
        switch (activityDetails.typeSchema.kind) {
            case "enum":
                activityName = activityDetails.typeSchema.name;
                schemaName = `${activityName}Schema`;
                break;
            case "variant":
                activityName = activityDetails.typeSchema.name;
                schemaName = `${activityName}Schema`;
                break;
            case "struct":
                activityName = activityDetails.typeSchema.name;
                schemaName = `${activityName}Schema`;
                break;
            default:
                schemaName = JSON.stringify(activityDetails.typeSchema);
        }
        const canonicalType =
            activityDetails.canonicalTypeName! || activityDetails.canonicalType;
        const permissiveType =
            activityDetails.permissiveTypeName! ||
            activityDetails.permissiveType;
        const activityTypeName = activityDetails.canonicalTypeName!;
        const castDef = `
    __activityCast = new Cast<
        ${canonicalType}, ${permissiveType}
    >(${schemaName}, { isMainnet: true }); // activityAccessorCast`;

        // `    datum: ${helperClassName} = new ${helperClassName}(this.bundle)   // datumAccessor/enum \n` +
        // `    ${details.typeSchema.name}: ${helperClassName} = this.datum;\n` +

        if (activityDetails.typeSchema.kind === "enum") {
            const helperClassName = `${activityName}Helper`;
            return `${castDef}

    /**
     * generates UplcData for the activity type (${activityTypeName}) for the ${this.bundle.program.name} script
     */
    activity : ${helperClassName}= new ${helperClassName}(this.bundle, {isActivity: true}); // activityAccessor/enum
        ${activityName}: ${helperClassName} = this.activity;\n`;
        } else if (activityDetails.typeSchema.kind === "struct") {
            return `${castDef}

    ${activityTypeName}(fields: ${activityTypeName}Like) {
        return this.__activityCast.toUplcData(fields);
    }\n\n`;
        } else {
            return `${castDef}
            
    /**
     * generates UplcData for the activity type (${activityTypeName}) for the ${this.bundle.program.name} script
     * @remarks - same as {@link activity}
     */
    ${activityTypeName}(activity: ${permissiveType}) {
        return this.__activityCast.toUplcData(activity);
    }\n`;
        }
    }

    includeDatumAccessors() {
        const details = this.datumTypeDetails;
        if (!details) return ``; // no datum type defined for this bundle

        if (details.typeSchema.kind === "enum") {
            //@ts-expect-error - todo: use type-branding & type-inspection function to mke this safer
            const d: fullEnumTypeDetails = details as fullEnumTypeDetails;
            const {
                moreInfo: { helperClassName },
            } = d;
            return (
                "" +
                `    datum: ${helperClassName} = new ${helperClassName}(this.bundle, {})   // datumAccessor/enum \n` +
                `    ${details.typeSchema.name}: ${helperClassName} = this.datum;\n` +
                `    readDatum = (d: UplcData) => {\n` +
                `        //@ts-expect-error drilling through the protected accessor.\n`+
                `        //   ... see more comments about that above\n` +
                `        return this.datum.__cast.fromUplcData(d);\n` +
                `    }\n`
            );
            // ----
        }

        if (details.typeSchema.kind === "variant") {
            throw new Error(`Datum as specific enum-variant not yet supported`);
        }

        const typeName =
            ("canonicalTypeName" in details ? details.canonicalTypeName : "") ||
            details.canonicalType;
        const permissiveTypeName =
            ("permissiveTypeName" in details
                ? details.permissiveTypeName
                : "") || details.permissiveType;
        const castDef = `    __datumCast = new Cast<
        ${typeName}, ${permissiveTypeName}
    >(${typeName}Schema, { isMainnet: true }); // datumAccessorCast\n`;
        const datumAccessor = `
    /**
     * generates UplcData for the datum type (${typeName}) for the ${this.bundle.program.name} script
     */
    datum(x: ${permissiveTypeName}) {
        return this.__datumCast.toUplcData(x);
    }\n`;

        const readDatum = `
        /**
         * reads UplcData for the datum type (${typeName}) for the ${this.bundle.program.name} script
         */
        readDatum(d: UplcData) { return this.__datumCast.fromUplcData(d); }\n`;

        if (details.typeSchema.kind === "struct") {
            return (
                castDef +
                readDatum +
                datumAccessor +
                `
    /**
     * generates UplcData for the datum type (${typeName}) for the ${this.bundle.program.name} script
     * @remarks - same as {@link datum}
     */
` +
                `    ${details.typeSchema.name}(fields: ${permissiveTypeName}) {\n` +
                `        return this.__datumCast.toUplcData(fields);\n` +
                `    } // datumAccessor/byName \n`
            );
        }

        // if it's not an enum or struct, there's no name to expose separately;
        // just the accessor+readDatum is enough, with it supporting cast object.

        return castDef + readDatum + datumAccessor;
    }

    helperClasses: Record<string, string> = {};

    // iterate all the named types, generating helper classes for each enum
    includeEnumHelperClasses() {
        const classSources = [] as string[];
        for (const [name, typeDetails] of Object.entries(
            this.typeBundle.namedTypes
        )) {
            if (typeDetails.typeSchema.kind === "enum") {
                const enumDetails =
                    typeDetails as unknown as fullEnumTypeDetails;
                this.helperClasses[name] = this.mkEnumHelperClass(enumDetails);
            }
        }
        return Object.values(this.helperClasses).join("\n");
    }

    get redeemerTypeName() {
        return this.activityTypeDetails.dataType.name;
    }

    nestedHelperClassName(
        typeDetails: fullEnumTypeDetails,
        isActivity: boolean
    ) {
        let helperClassName = typeDetails.moreInfo.helperClassName;
        if (isActivity && !helperClassName?.match(/Activit/)) {
            helperClassName = `Activity${helperClassName}`;
        }

        return `${helperClassName}Nested`;
    }

    mkEnumHelperClass(
        typeDetails: fullEnumTypeDetails,
        isActivity = this.redeemerTypeName === typeDetails.enumName,
        isNested?: "isNested"
    ) {
        const enumName = typeDetails.enumName;
        // const maybeNested = isNested ? ", Nested" : "";
        const parentClass = isActivity
            ? `EnumBridge<isActivity>` // ${maybeNested}>`
            : `EnumBridge<JustAnEnum>`; //${maybeNested}>`;

        const helperClassName = isNested
            ? this.nestedHelperClassName(typeDetails, isActivity)
            : typeDetails.moreInfo.helperClassName;

        return (
            `/**\n` +
            ` * Helper class for generating UplcData for variants of the ${enumName} enum type.\n` +
            ` */\n` +
            `export class ${helperClassName} extends ${parentClass} {\n` +
            `    protected __cast = new Cast<\n` +
            `       ${typeDetails.canonicalTypeName},\n` +
            `       ${typeDetails.permissiveTypeName}\n` +
            `   >(${enumName}Schema, { isMainnet: true });\n` +
            `\n` +
            this.mkEnumDatumAccessors(typeDetails, isActivity, isNested) +
            `\n}\n\n`
        );
    }

    mkNestedEnumAccessor(
        enumTypeDetails: fullEnumTypeDetails,
        variantDetails: variantTypeDetails<dataBridgeTypeInfo>,
        variantName: string,
        fieldName: string,
        oneField: anyTypeDetails<dataBridgeTypeInfo>
    ) {
        const enumName = enumTypeDetails.enumName;
        debugger;
        const isActivity = this.redeemerTypeName === enumName;

        const enumPathExpr = this.getEnumPathExpr(variantDetails);
        const nestedEnumDetails = oneField.typeSchema as EnumTypeSchema;
        const nestedEnumName = nestedEnumDetails.name;

        const nestedEnumField : fullEnumTypeDetails = oneField as any;
        const nestedHelperClassName = this.nestedHelperClassName(nestedEnumField, isActivity);

        const nestedHelper = this.mkEnumHelperClass(
            nestedEnumField,
            isActivity,
            "isNested"
        );
        this.helperClasses[`${nestedEnumName}Nested`] = nestedHelper; // registers the nested helper class

        // const nestedHelperTypeParams = `<\n        ${
        //     isActivity ? "isActivity" : "JustAnEnum"
        // }, Nested\n        >`;

        return (
            `    get ${variantName}() {\n` +
            `        const nestedAccessor = new ${nestedHelperClassName}(this.bundle,
            {isNested: true, isActivity: ${
                isActivity ? "true" : "false"
            } 
        });\n` +
        `        //@ts-expect-error drilling through the protected accessor.  See more comments about that above\n`+
        `        nestedAccessor.mkDataVia((nested: ${nestedEnumName}Like) => {\n` +
            `           return  this.mkUplcData({ ${variantName}: { ${fieldName}: nested } }, 
            ${enumPathExpr});\n` +
            `        });\n` +
            `        return nestedAccessor;\n` +
            `    } /* nested enum accessor */`
        );
    }

    getEnumPathExpr(variantDetails: variantTypeDetails<any>, quoted = true) {
        const { parentType } = variantDetails.dataType.asEnumMemberType!;
        const enumName =
            variantDetails.dataType.asEnumMemberType?.parentType.name;
        // parentType.path looks like __module__SomeModule__EnumName[]
        const [_1, _module, moduleName, _enumPlusBracket] =
            parentType.path.split("__");
        //result should be SomeModule::EnumName.variantName

        return JSON.stringify(
            `${moduleName}::${enumName}.${variantDetails.variantName}`
        );
    }

    mkEnumDatumAccessors(enumDetails: fullEnumTypeDetails, isActivity? : boolean, isNested? : "isNested") {
        const accessors = Object.keys(enumDetails.variants)
            .map((variantName) => {
                const variantDetails = enumDetails.variants[variantName];
                const fieldCount = variantDetails.fieldCount;

                if (fieldCount === 0) {
                    const enumPathExpr = this.getEnumPathExpr(variantDetails);
                    return (
                        `/**\n` +
                        ` * (property getter): UplcData for ${enumPathExpr}\n` +
                        ` */\n` +
                        `    get ${variantName}() {\n` +
                        `        const uplc = this.mkUplcData({ ${variantName}: {} }, \n` +
                        `            ${enumPathExpr});\n` +
                        `       return uplc;\n` +
                        `    } /* tagOnly variant accessor */`
                    );
                } else if (fieldCount === 1) {
                    return this.mkSIngleFieldVariantAccessor(
                        enumDetails,
                        variantDetails,
                        variantName,
                        isActivity, isNested
                    );
                } else {
                    return this.mkMultiFieldVariantAccessor(
                        enumDetails,
                        variantDetails,
                        variantName,
                        isActivity, isNested

                    );
                }
            })
            .join("\n\n");
        return accessors;
    }

    private mkMultiFieldVariantAccessor(
        enumTypeDetails: fullEnumTypeDetails,
        variantDetails: variantTypeDetails<dataBridgeTypeInfo>,
        variantName: string,
        isActivity: boolean = this.redeemerTypeName === enumTypeDetails.enumName,
        isNested?: "isNested"
    ) {
        function mkFieldType(fieldName: string, indent = 2): string {
            const oneField = variantDetails.fields[fieldName];
            let thatType = oneField.permissiveType;
            if ("permissiveTypeName" in oneField) {
                thatType = oneField.permissiveTypeName;
            }
            return (
                `    `.repeat(indent) + `${fieldName}: ${thatType}`.trimEnd()
            );
        }
        function unfilteredFields(indent = 2) {
            return Object.keys(variantDetails.fields)
                .map((x) => mkFieldType(x, indent))
                .join(",\n");
        }
        const { permissiveTypeName } = variantDetails;
        const enumPathExpr = this.getEnumPathExpr(variantDetails);
        const returnType = isActivity ? "isActivity" : "UplcData";
        if ("seed" == Object.keys(variantDetails.fields)[0]) {
            // && isSeededActivity
            function filteredFields(indent = 2) {
                return Object.keys(variantDetails.fields)
                    .filter((fieldName) => fieldName !== "seed")
                    .map((x) => mkFieldType(x, indent))
                    .join(",\n");
            }

            return (
                `    /**\n` +
                `     * generates ${
                    isActivity ? "isActivity/redeemer wrapper with" : ""
                } UplcData for ${enumPathExpr}, given a transaction-context with a seed utxo and other field details\n` +
                `     * @remarks\n` +
                `     * See the \`tcxWithSeedUtxo()\` method in your contract's off-chain StellarContracts subclass.` +
                `     */\n` +
                `    ${variantName}(value: hasSeed, fields: { \n${filteredFields(
                    2
                )} \n` +
                `    } ) : ${returnType}\n` +
                `    /**\n` +
                `    * generates UplcData for ${enumPathExpr} with raw seed details included in fields.\n` +
                `    */\n` +
                `    ${variantName}(fields: ${permissiveTypeName} | {\n${unfilteredFields(
                    3
                )}\n    } ): ${returnType}\n` +
                `    ${variantName}(\n` +
                `        seedOrUf: hasSeed | ${permissiveTypeName}, \n` +
                `        filteredFields?: { \n${filteredFields(3)}\n` +
                `    }) : ${returnType} {\n` +
                `        if (filteredFields) {\n` +
                `            const seedTxOutputId = this.getSeed(seedOrUf as hasSeed);\n` +
                `            const uplc = this.mkUplcData({\n` +
                `                ${variantName}: { seed: seedTxOutputId, ...filteredFields } \n` +
                `            }, ${enumPathExpr});\n` +
                `           return uplc;\n` +
                `        } else {\n` +
                `            const fields = seedOrUf as ${permissiveTypeName}; \n` +
                `           const uplc = this.mkUplcData({\n` +
                `                ${variantName}: fields \n` +
                `            }, ${enumPathExpr});\n` +
                `           return uplc;\n` +
                `        }\n` +
                `    } /*multiFieldVariant/seeded enum accessor*/ \n`
            );
        }
        return (
            `    /**\n` +
            `     * generates ${isActivity ? "isActivity/redeemer wrapper with" : ""} UplcData for ${enumPathExpr}\n` +
            `     * @remarks - ${permissiveTypeName} is the same as the expanded field-types.` +
            `     */\n` +
            `    ${variantName}(fields: ${permissiveTypeName} | { \n${unfilteredFields()} } ) : ${returnType} {\n` +
            `        const uplc = this.mkUplcData({\n` +
            `            ${variantName}: fields \n` +
            `        }, ${enumPathExpr});\n` +
            `       return uplc;\n` +
            `    } /*multiFieldVariant enum accessor*/`
        );
    }

    private mkSIngleFieldVariantAccessor(
        enumTypeDetails: fullEnumTypeDetails,
        variantDetails: variantTypeDetails<dataBridgeTypeInfo>,
        variantName: string,
        isActivity: boolean = this.redeemerTypeName === enumTypeDetails.enumName,
        isNested?: "isNested"
    ) {
        const fieldName = Object.keys(variantDetails.fields)[0];
        const oneField = variantDetails.fields[fieldName];
        const enumName =
            variantDetails.dataType.asEnumMemberType?.parentType.name;
        const enumPathExpr = this.getEnumPathExpr(variantDetails);

        const returnType = isActivity ? "isActivity" : "UplcData";

        if ("enum" == oneField.typeSchema.kind) {
            return this.mkNestedEnumAccessor(
                enumTypeDetails,
                variantDetails,
                variantName,
                fieldName,
                oneField
            );
        }
        if ("seed" == fieldName) {
            // && isSeededActivity
            return (
                `    ${variantName}(value: hasSeed | ${oneField.permissiveType}) : ${returnType} {\n` +
                `        const seedTxOutputId = "string" == typeof value ? value : this.getSeed(value);\n` +
                `        const uplc = this.mkUplcData({ \n` +
                `           ${variantName}: { ${fieldName}: seedTxOutputId } \n` +
                `        },${enumPathExpr});  /*SingleField/seeded enum variant*/\n` +
                `       return uplc;\n` +
                `    }`
            );
        }
        let thatType = oneField.permissiveType;
        if ("permissiveTypeName" in oneField) {
            thatType = oneField.permissiveTypeName;
        }
        return (
            `    ${variantName}(\n` +
            `        ${fieldName}: ${thatType}\n` +
            `    ) : ${returnType} {\n` +
            `        const uplc = this.mkUplcData({ \n` +
            `           ${variantName}: { ${fieldName}: ${fieldName} } \n` +
            `        }, ${enumPathExpr}); /*SingleField enum variant*/\n` +
            `       return uplc;\n` +
            `    }`
        );
    }

    includeNamedSchemas() {
        const schemas = Object.entries(this.namedSchemas)
            .map(([name, schema]) => {
                const type =
                    schema.kind === "enum"
                        ? "EnumTypeSchema"
                        : "StructTypeSchema";
                return `export const ${name}Schema : ${type} = ${JSON.stringify(
                    schema,
                    null,
                    4
                )};`;
            })
            .join("\n\n");
        return schemas;
    }

    // gatherNonEnumDatumAccessors(datumTypeName: string) {
    //     const details = this.datumTypeDetails as typeDetails;
    //     const fields = Object.keys(details.fields).map(fieldName => {
    //         return `${fieldName}: ${details.fields[fieldName].canonicalTypeName}`;
    //     }).join(", ");
    //     return `get ${datumTypeName}() {
    //         return this.toUplcData({ ${datumTypeName}: { ${fields} } });
    //     }`;
    // }
}
