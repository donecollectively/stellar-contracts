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
import type {
    EnumTypeSchema,
    TypeSchema,
    VariantTypeSchema,
} from "@helios-lang/type-utils";
import type { 
    DataType,
    EnumMemberType
} from "@helios-lang/compiler";
import { BundleBasedGenerator } from "./BundleBasedGenerator.js";
import { makeInlineTxOutputDatum, type InlineTxOutputDatum, type TxOutputDatum } from "@helios-lang/ledger";

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
 * by converting expected data using the Cast class.
 *
 * The class uses a various subclasses of DataBridge for different types defined
 * in the contract script.
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
 * 1.  Each struct type is directly exposed as its name, making ‹bridge›.‹struct name›
 *      available for generating any data expected to match that form.
 *
 * 2.  Each enum type is exposed as its name, with nested accessors for each enum variant,
 *       ... with the accessors for each variant depend on the number of fields in the variant.
 *
 *     - if the variant has no fields, the accessor directly returns ‹cast›.toUplcData(\{ variantName: \{\} \})
 *
 *     - if the variant has a single field, the accessor is a function that takes the field value
 *        (with a strong type) and returns ‹cast›.toUplcData(\{ variantName: \{ fieldName: value \} \}
 *
 *     - if the variant has multiple fields, the accessor is a function that takes a strongly-typed
 *       object having the fields and returns ‹cast›.toUplcData(\{ variantName: \{ ...fields \} \})
 *
 * 3. Datum creator functions return a InlineTxOutputDatum, not just UplcData.
 *
 * 4. Reader types use an ergonomic type, where enum variants at any level are merged into a single
 *     type, not a union of its variants.  Enums and Structs with nested enums are also ergonomic.
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
        const castMemberName = `ᱺᱺ${structName}Cast`;
        const helperClassName = `${structName}Helper`;

        this.namedSchemas[structName] = typeDetails.typeSchema;

        return {
            castCode: `
                 /*unused?*/ ${castMemberName}: Cast<${structName}Like, ${structName}> = makeErgoCast<${structName}Like, ${structName}>(this.schema.${structName}, { isMainnet: true });
            `,
            accessorCode: `${structName}(fields: ${structName}Like}) {
                return this.${castMemberName}.toUplcData(fields);
            }`,
            helperClassName,
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

        let imports =
            /*-----------------imports---------------*/
            `
import { makeErgoCast, type Cast } from "@helios-lang/contract-utils"
import type { UplcData, ConstrData } from "@helios-lang/uplc";
import type { 
    IntLike,
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
    StakingValidatorHash,
    TimeRange,
    TxId,
    TxInput,
    TxOutput,
    TxOutputId,
    ValidatorHash,
    Value,
} from "@helios-lang/ledger";
 import { makeInlineTxOutputDatum, type InlineTxOutputDatum, type TxOutputDatum } from "@helios-lang/ledger";
import type { EnumTypeSchema, StructTypeSchema } from "@helios-lang/type-utils";

`; // ---------------------/imports------------------------------
        let scImports = /*--------------stellar-contracts-imports --------------*/ `import {
    ContractDataBridge,
    DataBridge, 
    DataBridgeReaderClass ,
    EnumBridge,
    impliedSeedActivityMaker,
    type tagOnly, 
    type hasSeed, 
    type isActivity, 
    type funcWithImpliedSeed,
    type SeedAttrs,
    type JustAnEnum,
    type callWith,
    type IntersectedEnum,
} from "@donecollectively/stellar-contracts"\n`;
        if (this._isSC) {
            scImports =
                `import { 
    DataBridge, 
    ContractDataBridge, 
    DataBridgeReaderClass,
    type callWith,
} from "${this.mkRelativeImport(
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
                `import type { IntersectedEnum } from "${this.mkRelativeImport(
                    inputFile,
                    "src/helios/typeUtils.js"
                )}"\n` +
                `import { \n` +
                `    impliedSeedActivityMaker, SeedActivity, type hasSeed, type isActivity, \n` +
                `    type funcWithImpliedSeed, type SeedAttrs\n} from "${this.mkRelativeImport(
                    inputFile,
                    "src/ActivityTypes.js"
                )}"\n`;
            //---------------------/sc-imports-----------------------;
        }
        return /* --------------overall file format----------------*/ `// generated by Stellar Contracts dataBridgeGenerator
// based on types defined in ${this.bundle.program.name} (${
            this.bundle.main.name
        })
// recommended: CHECK THIS FILE INTO YOUR VERSION CONTROL SYSTEM
//   ... and keep checking in the changes as your on-chain types evolve.
//
// NOTE: this file is auto-generated; do not edit directly
${imports}
${scImports}
export type TimeLike = IntLike;

${this.includeScriptNamedTypes(inputFile)}

/**
 * GENERATED data bridge for **${
     this.bundle.program.name
 }** script (defined in class ***${this.bundle.constructor.name}***)
 * main: **${this.bundle.main.name}**, project: **${
            this.bundle.main.project || "‹local proj›"
        }**
 * @remarks - note that you may override \`get dataBridgeName() { return "..." }\` to customize the name of this bridge class
* @public
 */
export class ${bridgeClassName} extends ContractDataBridge {
    static isAbstract = false as const;
    isAbstract = false as const;
${this.includeDatumAccessors()}
${this.includeActivityCreator()}
${this.includeDataReaderHelper()}
${this.includeTypeAccessors()}
${this.includeUtilityFunctions()}
}
export default ${bridgeClassName};
${this.gatherHelperClasses()}
${this.includeAllHelperClasses()}
${this.includeNamedSchemas()}
// }
`;
        //------------------------------/overall formal------------------------------
    }

    includeCastMemberInitializers() {
        return Object.values(this.additionalCastMemberDefs).join("");
    }

    includeDataReaderHelper() {
        const readerClassName = `${this.bundle.bridgeClassName}Reader`;
        this.helperClasses[readerClassName] =
            this.generateDataReaderClass(readerClassName);
        return `    reader = new ${readerClassName}(this);\n`;
    }

    generateDataReaderClass(className: string) {
        return `/*
 * @public
 */
export class ${className} extends DataBridgeReaderClass {
    constructor(public bridge: ${this.bundle.bridgeClassName}) {
        super();
    }
${this.includeEnumReaders()}
${this.includeStructReaders()}
}\n`;
    }

    includeEnumReaders() {
        return Object.keys(this.typeBundle.namedTypes)
            .filter((typeName) => {
                const typeDetails = this.typeBundle.namedTypes[typeName];
                return typeDetails.typeSchema.kind === "enum";
            })
            .map((typeName) => {
                const typeDetails = this.typeBundle.namedTypes[
                    typeName
                ] as unknown as fullEnumTypeDetails;
                const helperClassName = typeDetails.moreInfo.helperClassName;
                const isDatum = this.datumTypeName === typeName;

                const generateFunc = /* -------------enum-reader-func--------------*/ `    /**
        * reads UplcData *known to fit the **${typeName}*** enum type,
        * for the ${this.bundle.program.name} script.
        * ### Standard WARNING
        * 
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        * 
        * Used correctly with data that matches the enum type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        * 
        * On the other hand, reading non-matching data will not give you a valid result.  
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    ${typeName}(d : UplcData) { 
        const typeHelper = this.bridge.types.${typeName};
        const cast = typeHelper.ᱺᱺcast;  

        return cast.fromUplcData(d) as Ergo${typeName};        
    } /* enumReader helper */\n`;
                //---------------/enum-reader-func--------------------
                if (isDatum) {
                    return (
                        `datum = (d: UplcData) => { return this.${typeName}(d) }\n` +
                        generateFunc
                    );
                }
                return generateFunc;
            })
            .join("\n");
    }

    includeStructReaders() {
        return Object.keys(this.typeBundle.namedTypes)
            .filter((typeName) => {
                const typeDetails = this.typeBundle.namedTypes[typeName];
                return typeDetails.typeSchema.kind === "struct";
            })
            .map((typeName) => {
                const typeDetails = this.typeBundle.namedTypes[typeName];
                const castMemberName = `ᱺᱺ${typeName}Cast`;
                const isDatum = this.datumTypeName === typeName;
                const func = /*-------------struct-reader-func--------------*/ `    /**
        * reads UplcData *known to fit the **${typeName}*** struct type,
        * for the ${this.bundle.program.name} script.
        * ### Standard WARNING
        * 
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        * 
        * Used correctly with data that matches the type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        * 
        * On the other hand, reading non-matching data will not give you a valid result.  
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    ${typeName}(d: UplcData) {
        const cast = this.bridge.${castMemberName};
        return cast.fromUplcData(d) //??? as Ergo${typeName};
    } /* structReader helper */\n`;
                // ----------------struct-reader-func----------------
                if (isDatum) {
                    return (
                        `datum = (d: UplcData) => { return this.${typeName}(d) }\n` +
                        func
                    );
                }
                return func;
            })
            .join("\n");
    }

    additionalCastMemberDefs: Record<string, string> = {};

    includeTypeAccessors() {
        return (
            `    /**\n` +
            `     * accessors for all the types defined in the \`${this.bundle.program.name}\` script\n` +
            `     * @remarks - these accessors are used to generate UplcData for each type\n` +
            `     */\n` +
            `    types = {\n` +
            this.includeEnumTypeAccessors() +
            `\n\n` +
            this.includeStructTypeAccessors() +
            `    }    \n\n` +
            this.includeCastMemberInitializers()
        );
    }

    includeEnumTypeAccessors() {
        const accessors = Object.keys(this.typeBundle.namedTypes)
            .filter((typeName) => {
                const typeDetails = this.typeBundle.namedTypes[typeName];
                return typeDetails.typeSchema.kind === "enum";
            })
            .map((typeName) => {
                const typeDetails = this.typeBundle.namedTypes[
                    typeName
                ] as unknown as fullEnumTypeDetails;
                const helperClassName = typeDetails.moreInfo.helperClassName;

                return (
                    `      /**\n` +
                    `       * generates UplcData for the enum type ***${typeName}*** for the \`${this.bundle.program.name}\` script\n` +
                    `       */\n` +
                    `        ${typeName}: new ${helperClassName}(),`
                );
            })
            .join("\n");

        return accessors;
    }

    // emits accessors for all the struct types defined in the bundle
    // for inclusion in the bridge's 'types' namespace
    // gathers Cast initializers to include in the bridge class

    includeStructTypeAccessors() {
        const accessors = Object.keys(this.typeBundle.namedTypes)
            .filter((typeName) => {
                const typeDetails = this.typeBundle.namedTypes[typeName];
                return typeDetails.typeSchema.kind === "struct";
            })
            .map((typeName) => {
                const typeDetails = this.typeBundle.namedTypes[
                    typeName
                ] as unknown as fullTypeDetails;

                const {
                    canonicalTypeName,
                    permissiveType,
                    permissiveTypeName,
                } = typeDetails;
                const castMemberName = `ᱺᱺ${typeName}Cast`;
                this.additionalCastMemberDefs[castMemberName] =
                    `    /**
                * uses unicode U+1c7a - sorts to the end */\n` +
                    `    ${castMemberName} = makeErgoCast<
                ${canonicalTypeName}, ${permissiveTypeName}
            >(${typeName}Schema, { isMainnet: true });\n`;
                return (
                    `      /**\n` +
                    `       * generates UplcData for the enum type ***${typeName}*** for the \`${this.bundle.program.name}\` script\n` +
                    `       */\n` +
                    `        ${typeName}: (fields: ${permissiveTypeName} | ${permissiveType}) => {
        return this.${castMemberName}.toUplcData(fields);
    },`
                );
            })
            .join("\n");

        return accessors;
    }
    includeUtilityFunctions() {
        // TODO: include any utility functions defined in the contract
        return ``;
    }

    includeScriptNamedTypes(inputFile: string) {
        // if (inputFile.match(/StructDatum/)) debugger;
        const typeFile = inputFile.replace(/\.bridge.ts$/, ".typeInfo.js");
        let relativeTypeFile = path.relative(path.dirname(inputFile), typeFile);
        if (relativeTypeFile[0] !== ".") {
            relativeTypeFile = `./${relativeTypeFile}`;
        }

        return `
import type {\n${Object.entries(this.typeBundle.namedTypes)
            .map(
                ([
                    typeName,
                    {
                        canonicalTypeName,
                        ergoCanonicalTypeName,
                        permissiveTypeName,
                    },
                ]) => {
                    return `    ${[
                        canonicalTypeName,
                        ergoCanonicalTypeName,
                        permissiveTypeName,
                    ]
                        .filter((x) => !!x)
                        .join(", ")}`;
                }
            )
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
    ᱺᱺactivityCast = makeErgoCast<
        ${canonicalType}, ${permissiveType}
    >(${schemaName}, { isMainnet: true }); // activityAccessorCast`;

        if (activityDetails.typeSchema.kind === "enum") {
            //  enum -------------------
            const helperClassName = `${activityName}Helper`;
            return `
    /**
     * generates UplcData for the activity type (***${activityTypeName}***) for the \`${this.bundle.program.name}\` script
     */
    activity : ${helperClassName}= new ${helperClassName}({isActivity: true}); // activityAccessor/enum
        ${activityName}: ${helperClassName} = this.activity;\n`;
            // ---------------------------------
        } else if (activityDetails.typeSchema.kind === "struct") {
            //  struct? -------------------
            return `${castDef}

    /**
     * generates UplcData for the activity type (***${activityTypeName}***) for the \`${this.bundle.program.name}\` script
     * @remarks - same as {@link activity}
     */
    ${activityTypeName}(fields: ${activityTypeName}Like) {
        return this.ᱺᱺactivityCast.toUplcData(fields);
    }\n\n`; // --------------------------
        } else {
            //  not an enum, not a struct; probably an unnamed type -------------------
            const permissiveTypeInfo = `${activityDetails.permissiveType}`;
            const helperClassName = `OtherActivityTypeHelper`;
            const helperClassType = `callWith<${permissiveTypeInfo}, ${helperClassName}>`;
            const helperClassTypeCast = "as any";
            const helperClass = this.mkOtherDataHelperClass(
                helperClassName,
                activityDetails as unknown as fullTypeDetails
            );
            this.helperClasses[helperClassName] = helperClass;

            const moreTypeGuidance = /*------------*/ `
     * 
     * This accessor object is callable with the indicated argument-type
     * @example - contract.mkDatum(arg: /* ... see the indicated callWith args \\*\\/)\\n`;
            // ---------------------------------
            const accessorVarietyAnnotation = ` // activityAccessor/other\n`;
            return (
                "" +
                `    /**\n` +
                `     * Helper class for generating TxOutputDatum for the ***activity type ${
                    activityTypeName ? `(${activityTypeName})` : ""
                }***\n` +
                `     * ("redeemer" type) for this \`${this.bundle.program.name}\` contract script. ${moreTypeGuidance}\n` +
                `     */\n` +
                `    activity: ${helperClassType}\n     = new ${helperClassName}({}) ${helperClassTypeCast} ` +
                accessorVarietyAnnotation
            );
        }
    }

    includeDatumAccessors() {
        const datumDetails = this.datumTypeDetails;
        if (!datumDetails) {
            // debugger;
            this.datumTypeDetails;
            return `datum = undefined // no datum type defined for this bundle (minter / rewards script)\n`;
        }

        if (datumDetails.typeSchema.kind === "variant") {
            throw new Error(`Datum as specific enum-variant not yet supported`);
            // can frame this up with the same approach as the other-datum-type
        }

        // We always create a helper class for datum access, whether its a struct, enum,
        //  ... or other type (including primitives)
        //  - TODO: convert existing code-gen for struct-creators to add helper classes
        //  - TODO: trigger creation of datum-helper class for non-struct/non-enum
        // This arrangement ensures that the 'datum' property is a uniform type
        //   ... generally, that type is Option<DataBridge> (minters and rewards scripts will have null here)
        //
        // if the datum type is is an enum or struct, we ALSO generate an accessor with its type name
        let typeNameAccessor = "";
        let helperClassName = "";
        let helperClassType = "";
        let datumTypeName = this.datumTypeName;
        const typeName =
            ("canonicalTypeName" in datumDetails
                ? datumDetails.canonicalTypeName
                : "") || datumDetails.canonicalType;
        const permissiveTypeName =
            ("permissiveTypeName" in datumDetails
                ? datumDetails.permissiveTypeName
                : "") || datumDetails.permissiveType;

        let moreTypeGuidance = "";
        let helperClassTypeCast = "";
        let datumAccessorVarietyAnnotation = "";
        if (datumDetails.typeSchema.kind === "enum") {
            //@ts-expect-error - todo: use type-branding & type-inspection function to mke this safer
            const d: fullEnumTypeDetails = datumDetails as fullEnumTypeDetails;
            const {
                moreInfo: { helperClassName: hCN },
            } = d;
            if (!hCN)
                throw new Error(
                    `missing helperClassName for enum ${d.enumName}`
                );
            helperClassName = hCN;
            helperClassType = hCN;
            typeNameAccessor =
                `\n    /**\n` +
                `     * this is the specific type of datum for the \`${this.bundle.program.name}\` script\n` +
                `     */\n` +
                `    ${datumDetails.typeSchema.name}: ${helperClassType} = this.datum;`;
            datumAccessorVarietyAnnotation = ` // datumAccessor/enum\n`;
        } else if (datumDetails.typeSchema.kind === "struct") {
            //@ts-expect-error - todo: use type-branding & type-inspection function to mke this safer
            const d: fullTypeDetails = datumDetails as fullTypeDetails;
            const {
                moreInfo: { helperClassName: hCN },
            } = d;
            if (!hCN)
                throw new Error(
                    `missing helperClassName for struct ${d.typeName}`
                );
            helperClassName = hCN;
            const permissiveTypeInfo = `${d.permissiveTypeName} | ${d.permissiveType}`;
            helperClassType = `callWith<${permissiveTypeInfo}, ${hCN}>`;
            helperClassTypeCast = "as any";
            moreTypeGuidance = `
     * 
     * This accessor object is callable with the indicated argument-type
     * @example - contract.mkDatum(arg: /* ... see the indicated callWith args \\*\\/)
    *
    * ${permissiveTypeName} is the same as the expanded type details given\n`;
            // -----

            typeNameAccessor =
                `\n\n    /**\n` +
                `     * this is the specific type of datum for the \`${this.bundle.program.name}\` script\n` +
                `     * normally, we suggest accessing the \`datum\` property instead.\n` +
                `     */\n` +
                `    ${datumDetails.typeSchema.name}: ${helperClassType} = this.datum;`;
            datumAccessorVarietyAnnotation = ` // datumAccessor/struct\n`;
        } else {
            // triggers generation of a helper class for this type
            //  ... and also sets the type name to callWith<helper-class>

            const permissiveTypeInfo = `${datumDetails.permissiveType}`;
            helperClassName = `OtherDatumTypeHelper`;
            helperClassType = `callWith<${permissiveTypeInfo}, ${helperClassName}>`;
            helperClassTypeCast = "as any";
            this.helperClasses[helperClassName] = this.mkOtherDataHelperClass(
                helperClassName,
                datumDetails as unknown as fullTypeDetails
            );
            moreTypeGuidance = `
     * 
     * This accessor object is callable with the indicated argument-type
     * @example - contract.mkDatum(arg: /* ... see the indicated callWith args \\*\\/)\\n`;
            // ----
            datumAccessorVarietyAnnotation = ` // datumAccessor/other\n`;
        }
        return (
            "" +
            `    /**\n` +
            `     * Helper class for generating TxOutputDatum for the ***datum type ${
                datumTypeName ? `(${datumTypeName})` : ""
            }***\n` +
            `     * for this contract script. ${moreTypeGuidance}\n` +
            `     */\n` +
            `    datum: ${helperClassType}\n     = new ${helperClassName}({}) ${helperClassTypeCast} ` +
            datumAccessorVarietyAnnotation +
            typeNameAccessor +
            `\n\n    readDatum : (d: UplcData) => Ergo${typeName} = (d) =>  {\n` +
            //            `        //return this.datum.ᱺᱺcast.fromUplcData(d);\n` +
            `        return this.reader.${typeName}(d)\n` +
            `    }\n`
        );
        // ----
    }

    mkOtherDataHelperClass(helperClassName: string, details: fullTypeDetails) {
        const typeName =
            ("canonicalTypeName" in details ? details.canonicalTypeName : "") ||
            details.canonicalType;
        const permissiveTypeName =
            ("permissiveTypeName" in details
                ? details.permissiveTypeName
                : "") || details.permissiveType;
        if (
            details.typeSchema.kind != "internal" &&
            (typeName || permissiveTypeName)
        ) {
            throw new Error(
                `type name (${typeName}) and permissive type name (${permissiveTypeName}) are NOT expected for an other-data-type accessor (schema kind=${details.typeSchema.kind})`
            );
        }
        const { canonicalType, permissiveType, typeSchema } = details;
        const castDef =
            `    /**
        * uses unicode U+1c7a - sorts to the end */\n` +
            `    ᱺᱺcast = makeErgoCast<
        ${canonicalType}, ${permissiveType}
    >(${JSON.stringify(
        typeSchema
    )}, { isMainnet: true }); // datumAccessorCast\n`;

        return `export class ${helperClassName} extends DataBridge {
    isCallable = true
    ${castDef}
    
    } // mkOtherDatumHelperClass
    `;

        //         const datumAccessor = `
        //     /**
        //      * Generates UplcData for the datum type (${typeName}) for the ${this.bundle.program.name} script
        //      */
        //     datum(x: ${permissiveTypeName}) {
        //         return this.ᱺᱺdatumCast.toUplcData(x);
        //     }\n`;

        //         const readDatum = `
        //         /**
        //          * reads UplcData for the datum type (${typeName}) for the ${this.bundle.program.name} script
        //          */
        //         readDatum(d: UplcData) { return this.ᱺᱺdatumCast.fromUplcData(d); }\n`;

        //         if (details.typeSchema.kind === "struct") {
        //             return (
        //                 castDef +
        //                 readDatum +
        //                 datumAccessor +
        //                 `
        //     /**
        //      * generates UplcData for the datum type (${typeName}) for the ${this.bundle.program.name} script
        //      * @remarks - same as {@link datum}
        //      */
        // ` +
        //                 `    ${details.typeSchema.name}(fields: ${permissiveTypeName}) {\n` +
        //                 `        return this.ᱺᱺdatumCast.toUplcData(fields);\n` +
        //                 `    } // datumAccessor/byName \n`
        //             );
        //         }

        //         // if it's not an enum or struct, there's no name to expose separately;
        //         // just the accessor+readDatum is enough, with it supporting cast object.

        //         return castDef + readDatum + datumAccessor;
    }

    helperClasses: Record<string, string> = {};

    // iterate all the named types, generating helper classes for each
    gatherHelperClasses() {
        const classSources = [] as string[];
        for (const [name, typeDetails] of Object.entries(
            this.typeBundle.namedTypes
        )) {
            if (typeDetails.typeSchema.kind === "enum") {
                const enumDetails =
                    typeDetails as unknown as fullEnumTypeDetails;
                this.helperClasses[name] = this.mkEnumHelperClass(enumDetails);
            } else if (typeDetails.typeSchema.kind === "struct") {
                const structDetails = typeDetails as unknown as fullTypeDetails;
                this.helperClasses[name] =
                    this.mkStructHelperClass(structDetails);
            }
        }
        return "";
    }

    includeAllHelperClasses() {
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
        //  - matches "Activities" or "Activity":
        if (isActivity && !helperClassName?.match(/Activit/)) {
            helperClassName = `Activity${helperClassName}`;
        }

        return `${helperClassName}Nested`;
    }

    mkStructHelperClass(typeDetails: fullTypeDetails) {
        const structName = typeDetails.typeName!;
        return (
            `/**\n` +
            ` * Helper class for generating UplcData for the struct ***${structName}*** type.\n` +
            ` * @public\n`+
            ` */\n` +
            `export class ${structName}Helper extends DataBridge {\n` +
            `    isCallable = true\n` +
            `   /**
            * uses unicode U+1c7a - sorts to the end */\n` +
            `    ᱺᱺcast = makeErgoCast<\n` +
            `        ${typeDetails.canonicalTypeName},\n` +
            `        ${typeDetails.permissiveTypeName}\n` +
            `    >(${structName}Schema, { isMainnet: true });\n` +
            `\n` +
            `    // You might expect a function as follows.  We provide this interface and result, \n` +
            `    // using a proxy in the inheritance chain.\n` +
            `    // see the callableDataBridge type on the 'datum' property in the contract bridge.\n` +
            `    //\n` +
            `    //Also: if you're reading this, ask in our discord server about a 🎁 for curiosity-seekers! \n` +
            `    //\n` +
            `    // ${structName}(fields: ${typeDetails.permissiveTypeName}) {\n` +
            `    //    return this.ᱺᱺcast.toUplcData(fields);\n` +
            `    //}\n` +
            `} //mkStructHelperClass \n\n`
        );
    }

    mkEnumHelperClass(
        typeDetails: fullEnumTypeDetails,
        isActivity = this.redeemerTypeName === typeDetails.enumName,
        isNested?: "isNested"
    ) {
        const enumName = typeDetails.enumName;
        // const maybeNested = isNested ? ", Nested" : "";
        const isDatum = this.datumTypeName === enumName;
        // console.log(this.datumTypeName, enumName, isDatum, "-------------------------------------???");
        const parentClass = isActivity
            ? `EnumBridge<isActivity>` // ${maybeNested}>`
            : `EnumBridge<JustAnEnum>`; //${maybeNested}>`;
        const normalType = isDatum ? "InlineTxOutputDatum" : "UplcData";

        const helperClassName = isNested
            ? this.nestedHelperClassName(typeDetails, isActivity)
            : typeDetails.moreInfo.helperClassName;

        return (
            `/**\n` +
            ` * Helper class for generating ${normalType} for variants of the ***${enumName}*** enum type.\n` +
            ` * @public\n` +
            ` */\n` +
            `export class ${helperClassName} extends ${parentClass} {\n` +
            `    /*mkEnumHelperClass*/\n` +
            `    /**
            *  uses unicode U+1c7a - sorts to the end */\n` +
            `    ᱺᱺcast = makeErgoCast<\n` +
            `       ${typeDetails.canonicalTypeName},\n` +
            `       ${typeDetails.permissiveTypeName}\n` +
            `   >(${enumName}Schema, { isMainnet: true });\n` +
            `\n` +
            this.mkEnumVariantAccessors(
                typeDetails,
                isDatum,
                isActivity,
                isNested
            ) +
            `\n}/*mkEnumHelperClass*/\n\n`
        );
    }

    mkNestedEnumAccessor(
        enumTypeDetails: fullEnumTypeDetails,
        variantDetails: variantTypeDetails<dataBridgeTypeInfo>,
        variantName: string,
        fieldName: string,
        oneField: anyTypeDetails<dataBridgeTypeInfo>,
        isInActivity?: boolean
    ) {
        const enumName = enumTypeDetails.enumName;
        const isActivity = isInActivity || this.redeemerTypeName === enumName;

        const enumPathExpr = this.getEnumPathExpr(variantDetails);
        const nestedEnumDetails = oneField.typeSchema as EnumTypeSchema;
        const nestedEnumName = nestedEnumDetails.name;

        const nestedEnumField: fullEnumTypeDetails = oneField as any;
        const nestedHelperClassName = this.nestedHelperClassName(
            nestedEnumField,
            isActivity
        );

        const nestedHelper = this.mkEnumHelperClass(
            nestedEnumField,
            isActivity,
            "isNested"
        );

        // registers the nested helper class
        this.helperClasses[nestedHelperClassName] = nestedHelper; 

        // const nestedHelperTypeParams = `<\n        ${
        //     isActivity ? "isActivity" : "JustAnEnum"
        // }, Nested\n        >`;

        const nestedFieldName = fieldName;
        return (
            `    /**\n` +
            `     * access to different variants of the ***nested ${nestedEnumName}*** type needed for ***${enumName}:${variantName}***.\n` +
            `     */\n` +
            `    get ${variantName}() {\n` +
            `        const nestedAccessor = new ${nestedHelperClassName}({
            isNested: true, isActivity: ${isActivity ? "true" : "false"} 
        });\n` +
            `        ${"//"}@ts-expect-error drilling through the protected accessor.  See more comments about that above\n` +
            `        nestedAccessor.mkDataVia(\n` +
            `            (${nestedFieldName}: ${nestedEnumName}Like) => {\n` +
            `                return  this.mkUplcData({ ${variantName}: ${nestedFieldName} }, 
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

    mkEnumVariantAccessors(
        enumDetails: fullEnumTypeDetails,
        isDatum: boolean,
        isActivity: boolean,
        isNested?: "isNested"
    ) {
        const accessors = Object.keys(enumDetails.variants)
            .map((variantName) => {
                const variantDetails = enumDetails.variants[variantName];
                const fieldCount = variantDetails.fieldCount;
                const normalType = isDatum ? "InlineTxOutputDatum" : "UplcData";

                if (fieldCount === 0) {
                    const enumPathExpr = this.getEnumPathExpr(variantDetails);
                    return (
                        `/**\n` +
                        ` * (property getter): ${normalType} for ***${enumPathExpr}***\n` +
                        ` * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#${variantDetails.typeSchema.tag}***\n` +
                        ` */\n` +
                        `    get ${variantName}() {\n` +
                        `        const uplc = this.mkUplcData({ ${variantName}: {} }, \n` +
                        `            ${enumPathExpr});\n` +
                        (isDatum
                            ? `        return makeInlineTxOutputDatum(uplc);\n`
                            : `        return uplc;\n`) +
                        `    } /* tagOnly variant accessor */`
                    );
                } else if (fieldCount === 1) {
                    return this.mkSingleFieldVariantAccessor(
                        enumDetails,
                        variantDetails,
                        variantName,
                        isDatum,
                        isActivity,
                        isNested
                    );
                } else {
                    return this.mkMultiFieldVariantAccessor(
                        enumDetails,
                        variantDetails,
                        variantName,
                        isDatum,
                        isActivity,
                        isNested
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
        isDatum: boolean = this.datumTypeName === enumTypeDetails.enumName,
        isActivity: boolean = this.redeemerTypeName ===
            enumTypeDetails.enumName,
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
        const returnType = isActivity
            ? "isActivity"
            : isDatum
            ? `InlineTxOutputDatum`
            : "UplcData";
        if ("seed" == Object.keys(variantDetails.fields)[0] && !isDatum) {
            // && isSeededActivity
            function filteredFields(
                indent = 2,
                callback = mkFieldType,
                joiner = ",\n"
            ) {
                return Object.keys(variantDetails.fields)
                    .filter((fieldName) => fieldName !== "seed")
                    .map((x) => callback(x, indent))
                    .join(joiner);
            }

            const activitySummary = `     * generates ${
                isActivity ? "isActivity/redeemer wrapper with" : ""
            } UplcData for ***${enumPathExpr}***, \n`;

            return (
                `    /**\n` +
                activitySummary +
                `     * given a transaction-context ***with a seed utxo*** and other field details\n` +
                `     * @remarks\n` +
                `     * See the \`tcxWithSeedUtxo()\` method in your contract's off-chain StellarContracts subclass \n` +
                `     * to create a context satisfying \`hasSeed\`.\n` +
                `     * See the {@link $seeded$${variantName}} accessor for use in a context\n` +
                `     * providing an implicit seed utxo. \n` +
                (isNested
                    ? `    * ### Nested activity: \n` +
                      `    * this is connected to a nested-activity wrapper, so the details are piped through \n` +
                      `    * the parent's uplc-encoder, producing a single uplc object with \n` +
                      `    * a complete wrapper for this inner activity detail.\n`
                    : "") +
                `     */\n` +
                `    ${variantName}(value: hasSeed, fields: { \n${filteredFields(
                    2
                )} \n` +
                `    } ) : ${returnType}\n` +
                `    /**\n` +
                `     * generates ${
                    isActivity ? "isActivity/redeemer wrapper with" : ""
                } UplcData for ***${enumPathExpr}*** \n` +
                `     * with raw seed details included in fields.\n` +
                `     */\n` +
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
                `    } /*multiFieldVariant/seeded enum accessor*/ \n\n` +
                `    /**\n` +
                activitySummary +
                `     * @param fields - \\{ ` +
                filteredFields(0, undefined, ", ").replace(/([<>])/g, "\\$1") +
                ` \\}\n` +
                `     * @remarks\n` +
                `    * ### Seeded activity\n` +
                `    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.\n` +
                `     * ### Activity contains implied seed\n` +
                `     * Creates a SeedActivity based on the provided args, reserving space for a seed to be \n` +
                `     * provided implicitly by a SeedActivity-supporting library function. \n` +
                `     *\n` +
                `     * ## Usage\n` +
                `     *   1. Call the \`$seeded$${variantName}({ ` +
                filteredFields(0, (fn) => fn, ", ") +
                ` })\`\n ` +
                `     *       method with the indicated (non-seed) details.\n` +
                `     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's\n` +
                `     *       \`mkTxnCreateRecord({activity})\` method.\n` +
                (isNested
                    ? `    * ## Nested activity: \n` +
                      `    * this is connected to a nested-activity wrapper, so the details are piped through \n` +
                      `    * the parent's uplc-encoder, producing a single uplc object with \n` +
                      `    * a complete wrapper for this inner activity detail.\n`
                    : "") +
                `     */\n` +
                `    $seeded$${variantName} = impliedSeedActivityMaker(this, \n` +
                `        this.${variantName} as (value: hasSeed, fields: { \n${filteredFields(
                    3
                )} \n` +
                `        } ) => ${returnType}\n` +
                `    )\n` +
                `    /* coda: seeded helper in same multiFieldVariant/seeded */\n`
            );
        }
        return (
            `    /**\n` +
            `     * generates ${
                isActivity ? "isActivity/redeemer wrapper with" : ""
            } ${
                isDatum ? "InlineTxOutputDatum" : "UplcData"
            } for ***${enumPathExpr}***\n` +
            `     * @remarks - ***${permissiveTypeName}*** is the same as the expanded field-types.\n` +
            (isNested
                ? `    * ### Nested activity: \n` +
                  `    * this is connected to a nested-activity wrapper, so the details are piped through \n` +
                  `    * the parent's uplc-encoder, producing a single uplc object with \n` +
                  `    * a complete wrapper for this inner activity detail.\n`
                : "") +
            `     */\n` +
            `    ${variantName}(fields: ${permissiveTypeName} | { \n` +
            unfilteredFields() +
            `\n` +
            `    }) : ${returnType} {\n` +
            `        const uplc = this.mkUplcData({\n` +
            `            ${variantName}: fields \n` +
            `        }, ${enumPathExpr});\n` +
            (isDatum
                ? `        return makeInlineTxOutputDatum(uplc);\n`
                : `       return uplc;\n`) +
            `    } /*multiFieldVariant enum accessor*/`
        );
    }

    private mkSingleFieldVariantAccessor(
        enumTypeDetails: fullEnumTypeDetails,
        variantDetails: variantTypeDetails<dataBridgeTypeInfo>,
        variantName: string,
        isDatum: boolean = this.datumTypeName === enumTypeDetails.enumName,
        isActivity: boolean = this.redeemerTypeName ===
            enumTypeDetails.enumName,
        isNested?: "isNested"
    ) {
        const fieldName = Object.keys(variantDetails.fields)[0];
        const oneField = variantDetails.fields[fieldName];
        const enumName =
            variantDetails.dataType.asEnumMemberType?.parentType.name;
        const enumPathExpr = this.getEnumPathExpr(variantDetails);

        const returnType = isActivity
            ? "isActivity"
            : isDatum
            ? "InlineTxOutputDatum"
            : "UplcData";

        if ("enum" == oneField.typeSchema.kind) {
            return this.mkNestedEnumAccessor(
                enumTypeDetails,
                variantDetails,
                variantName,
                fieldName,
                oneField,
                isActivity
            );
        }
        if ("seed" == fieldName && !isDatum) {
            // && isSeededActivity
            return (
                `    /**\n` +
                `    * generates ${
                    isActivity ? "isActivity/redeemer wrapper with" : ""
                } UplcData for ***${enumPathExpr}***, \n` +
                `    * given a transaction-context (or direct arg) with a ***seed utxo*** \n` +
                `    * @remarks\n` +
                `    * ### Seeded activity\n` +
                `    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.\n` +
                `    *  - to get a transaction context having the seed needed for this argument, \n` +
                `    *    see the \`tcxWithSeedUtxo()\` method in your contract's off-chain StellarContracts subclass.\n` +
                `    * - or see the {@link hasSeed} type for other ways to feed it with a TxOutputId.\n` +
                `    *  - in a context providing an implicit seed utxo, use \n` +
                `    *    the {@link $seeded$${variantName}} variant of this activity instead\n` +
                `    *\n ` +
                (isNested
                    ? `    * ## Nested activity: \n` +
                      `    * this is connected to a nested-activity wrapper, so the details are piped through \n` +
                      `    * the parent's uplc-encoder, producing a single uplc object with \n` +
                      `    * a complete wrapper for this inner activity detail.\n`
                    : "") +
                `    */\n` +
                `    ${variantName}(thingWithSeed: hasSeed | ${oneField.permissiveType}) \n` +
                `    : ${returnType} {\n` +
                `        const seedTxOutputId = this.getSeed(thingWithSeed);\n` +
                (isNested
                    ? `\n        // piped through parent's uplc-encoder\n`
                    : "") +
                `        const uplc = this.mkUplcData({ \n` +
                `           ${variantName}: seedTxOutputId\n` +
                `        },${enumPathExpr});  \n` +
                `        return uplc;\n` +
                `    }  /*singleField/seeded enum variant*/\n\n` +
                `    /**\n` +
                `     * generates ${
                    isActivity ? "isActivity/redeemer wrapper with" : ""
                } UplcData for ***${enumPathExpr}***\n` +
                `     * @remarks\n` +
                `    * ### Seeded activity\n` +
                `    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.\n` +
                `     * ### Activity contains implied seed\n` +
                `     * Creates a SeedActivity based on the provided args, reserving space for a seed to be \n` +
                `     * provided implicitly by a SeedActivity-supporting library function. \n` +
                `     * ## Usage\n` +
                `     * Access the activity-creator as a getter: \`$seeded$${variantName}\`\n` +
                `     *\n` +
                `     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's\n` +
                `     * \`mkTxnCreateRecord({activity, ...})\` method.\n` +
                (isNested
                    ? `    * ## Nested activity: \n` +
                      `    * this is connected to a nested-activity wrapper, so the details are piped through \n` +
                      `    * the parent's uplc-encoder, producing a single uplc object with \n` +
                      `    * a complete wrapper for this inner activity detail.\n`
                    : "") +
                `     */\n` +
                `    get $seeded$${variantName}() {\n`+
                `        return impliedSeedActivityMaker(this,this.${variantName})() // called with no args needed\n` +
                `    } /* coda: seeded helper in same singleField/seeded enum variant*/\n`
            );
        }
        let thatType = oneField.permissiveType || "";
        let expandedTypeNote = "";
        if ("permissiveTypeName" in oneField) {
            thatType = `${oneField.permissiveTypeName} | ${oneField.permissiveType}`;
            expandedTypeNote = `     * @remarks - ***${oneField.permissiveTypeName}*** is the same as the expanded field-type.\n`;
        }
        const argNameIsFieldName = fieldName;
        return (
            `    /**\n` +
            `     * generates ${
                isActivity ? "isActivity/redeemer wrapper with" : ""
            } ${
                isDatum ? "InlineTxOutputDatum" : "UplcData"
            } for ***${enumPathExpr}***\n${expandedTypeNote}` +
            (isNested
                ? `    * ## Nested activity: \n` +
                  `    * this is connected to a nested-activity wrapper, so the details are piped through \n` +
                  `    * the parent's uplc-encoder, producing a single uplc object with \n` +
                  `    * a complete wrapper for this inner activity detail.\n`
                : "") +
            `     */\n` +
            `    ${variantName}(\n` +
            `        ${argNameIsFieldName}: ${thatType.trimEnd()}\n` +
            `    ) : ${returnType} {\n` +
            `        const uplc = this.mkUplcData({ \n` +
            `           ${variantName}: ${argNameIsFieldName}\n` +
            `        }, ${enumPathExpr}); /*singleField enum variant*/\n` +
            (isDatum
                ? `        return makeInlineTxOutputDatum(uplc);\n`
                : `       return uplc;\n`) +
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
