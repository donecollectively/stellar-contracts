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
 * The class is a sublcass of someDataMaker, which provides some basics for working
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
export class mkDataBridgeGenerator
    extends BundleBasedGenerator
    implements TypeGenHooks<dataBridgeTypeInfo>
{
    enumSchemas: Record<string, TypeSchema> = {};

    // satisfies TypeGenHooks<dataBridgeTypeInfo> for creating more details for an enum type
    getMoreEnumInfo?(typeDetails: enumTypeDetails): dataBridgeTypeInfo {
        const enumName = typeDetails.enumName;
        const helperClassName = `${enumName}Helper`;

        this.enumSchemas[enumName] = typeDetails.typeSchema;

        return {
            accessorCode: `get ${enumName}() {
                return new ${helperClassName}();
            }`,
            helperClassName,
        };
    }

    getMoreStructInfo?(details: typeDetails): dataBridgeTypeInfo {
        const structName = details.typeName;
        const castMemberName = `__${structName}Cast`;
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
    generateMkDataBridge(inputFile: string, projectName?: string) {
        const typeFile = inputFile.replace(/\.mkData.ts$/, ".typeInfo.js");
        let relativeTypeFile = path.relative(path.dirname(inputFile), typeFile);
        if (relativeTypeFile[0] !== ".") {
            relativeTypeFile = `./${relativeTypeFile}`;
        }
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
import type { EnumTypeSchema } from "@helios-lang/type-utils";

import type {\n${Object.entries(this.typeBundle.namedTypes)
            .map(([typeName, _]) => `    ${typeName}, ${typeName}Like`)
            .join(",\n")}
} from "${relativeTypeFile}"\n`;
        let scImports = `import { someDataMaker, type tagOnly, type hasSeed } from "@donecollectively/stellar-contracts"\n`;
        if (this._isSC) {
            scImports =
                `import { someDataMaker } from "${this.mkRelativeImport(
                    inputFile,
                    "src/helios/dataBridge/someDataMaker.js"
                )}"\n` +
                `import type { tagOnly } from "${this.mkRelativeImport(
                    inputFile,
                    "src/helios/HeliosScriptBundle.js"
                )}"\n` +
                `import type {hasSeed} from "${this.mkRelativeImport(
                    inputFile,
                    "src/StellarContract.js"
                )}"\n`;
        }
        return `// generated by Stellar Contracts mkDataBridgeGenerator
// based on types defined in ${this.bundle.program.name} (${
            this.bundle.main.name
        })
// recommended: CHECK THIS FILE INTO YOUR VERSION CONTROL SYSTEM
//   ... and keep checking in the changes as your on-chain types evolve.
//
// NOTE: this file is auto-generated; do not edit directly
${imports}
${scImports}
export default class mkDatumBridge${
            this.bundle.program.name
        } extends someDataMaker {
${this.includeDatumAccessors()}
    // include accessors for activity types

    // include accessors for other enums (other than datum/activity)

    // include accessors for any other structs (other than datum/activity)

    // TODO: include any utility functions defined in the contract
}

${this.includeEnumHelperClasses()}
${this.includeEnumSchemas()}
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
                `    datum: ${helperClassName} = new ${helperClassName}(this.bundle)   // datumAccessor\n` +
                `    ${details.typeSchema.name}: ${helperClassName} = this.datum;\n`
            );
            // ----
        }

        if (details.typeSchema.kind === "variant") {
            throw new Error(`Yup, need the type-name here`);
        }

        const typeName = details.canonicalType; // ??? name?
        const permissiveTypeName = details.permissiveType; // !!! name?
        const castDef = `    __datumCast = new Cast<
        ${typeName}, ${permissiveTypeName}
    >(${details.typeSchema}}, { isMainnet: true }); // datumAccessorCast\n`;
        const datumAccessor = `    datum(x: ${permissiveTypeName}) {
        return this.__datumCast.toUplcData(x);
    }\n`;

        if (details.typeSchema.kind === "struct") {
            return (
                castDef +
                datumAccessor +
                `    ${details.typeSchema.name}(fields: ${permissiveTypeName}) {\n` +
                `        return this.__datumCast.toUplcData(fields);\n` +
                `    }\n`
            );
        }

        // if it's not an enum or struct, there's no name to expose separately;
        // just the accessor is enough, with it supporting cast object.
        // todo: use a branded structure for the result??
        return castDef + datumAccessor;
    }

    // iterate all the named types, generating helper classes for each enum
    includeEnumHelperClasses() {
        const classSources = [] as string[];
        for (const [name, typeDetails] of Object.entries(
            this.typeBundle.namedTypes
        )) {
            if (typeDetails.typeSchema.kind === "enum") {
                const enumDetails =
                    typeDetails as unknown as fullEnumTypeDetails;
                classSources.push(this.mkEnumHelperClass(enumDetails));
            }
        }
        return classSources.join("\n");
    }

    mkEnumHelperClass(typeDetails: fullEnumTypeDetails) {
        return (
            `class ${typeDetails.moreInfo.helperClassName} extends someDataMaker {\n` +
            // todo: this needs to reflect the actual structure for nested enums, not our facade
            // for them.  Our interface for each of these variants is separate from what the Cast utility requires.
            `    enumCast = new Cast<\n` +
            `       ${typeDetails.canonicalTypeName},\n` +
            `       ${typeDetails.permissiveTypeName}\n` +
            `   >(${typeDetails.enumName}Schema, { isMainnet: true });\n` +
            this.mkEnumDatumAccessors(typeDetails) +
            `\n}\n\n`
        );
    }

    mkEnumDatumAccessors(enumDetails: fullEnumTypeDetails) {
        const accessors = Object.keys(enumDetails.variants)
            .map((variantName) => {
                const variantDetails = enumDetails.variants[variantName];
                const fieldCount = variantDetails.fieldCount;
                if (fieldCount === 0) {
                    return (
                        `    get ${variantName}() {\n` +
                        `        return this.enumCast.toUplcData({ ${variantName}: {} });\n` +
                        `    }`
                    );
                } else if (fieldCount === 1) {
                    return this.mkSIngleFieldVariantAccessor(
                        variantDetails,
                        variantName
                    );
                } else {
                    return this.mkMultiFieldVariantAccessor(
                        variantDetails,
                        variantName
                    );
                }
            })
            .join("\n\n");
        return accessors;
    }

    private mkMultiFieldVariantAccessor(
        variantDetails: variantTypeDetails<dataBridgeTypeInfo>,
        variantName: string
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
        if ("seed" == Object.keys(variantDetails.fields)[0]) {
            // && isSeededActivity
            function filteredFields(indent = 2) {
                return Object.keys(variantDetails.fields)
                    .filter((fieldName) => fieldName !== "seed")
                    .map((x) => mkFieldType(x, indent))
                    .join(",\n");
            }
            const { permissiveTypeName } = variantDetails;

            return (
                `    /**\n` +
                `     * generates UplcData, given a transaction-context with a seed utxo and other field details\n` +
                `     * @remarks\n` +
                `     * See the \`tcxWithSeedUtxo()\` method in your contract's off-chain StellarContracts subclass.` +
                `     */\n` +
                `    ${variantName}(value: hasSeed, fields: { \n${filteredFields(
                    2
                )} \n` +
                `    } ) : UplcData\n` +
                `    /**\n` +
                `    * generates UplcData with raw seed details included in fields.\n` +
                `    */\n` +
                `    ${variantName}(fields: ${permissiveTypeName}): UplcData\n` +
                `    ${variantName}(\n` +
                `        seedOrUf: hasSeed | ${permissiveTypeName}, \n` +
                `        filteredFields?: { \n${filteredFields(3)}\n` +
                `    }) : UplcData {\n` +
                `        if (filteredFields) {\n` +
                `            const seedTxOutputId = this.getSeed(seedOrUf as hasSeed);\n` +
                `            return this.enumCast.toUplcData({\n` +
                `                ${variantName}: { seed: seedTxOutputId, ...filteredFields } \n` +
                `            });\n` +
                `        } else {\n` +
                `            const fields = seedOrUf as ${permissiveTypeName}; \n` +
                `            return this.enumCast.toUplcData({\n` +
                `                ${variantName}: fields \n` +
                `            });\n` +
                `        }\n` +
                `    }\n`
            );
        }
        return (
            `    ${variantName}(fields: { \n${unfilteredFields()}\n` +
            `    }) {\n` +
            `        return this.enumCast.toUplcData({\n` +
            `            ${variantName}: fields \n` +
            `        });\n` +
            `    }`
        );
    }

    private mkSIngleFieldVariantAccessor(
        variantDetails: variantTypeDetails<dataBridgeTypeInfo>,
        variantName: string
    ) {
        const fieldName = Object.keys(variantDetails.fields)[0];
        const oneField = variantDetails.fields[fieldName];
        if ("seed" == fieldName) {
            // && isSeededActivity
            return (
                `    ${variantName}(value: hasSeed | ${oneField.permissiveType}) {\n` +
                `       const seedTxOutputId = "string" == typeof value ? value : this.getSeed(value);\n` +
                `        return this.enumCast.toUplcData({ \n` +
                `           ${variantName}: { ${fieldName}: seedTxOutputId } \n` +
                `        });  /*SingleField/seeded*/\n` +
                `    }`
            );
        }
        let thatType = oneField.permissiveType;
        if ("permissiveTypeName" in oneField) {
            thatType = oneField.permissiveTypeName;
        }
        return (
            `    ${variantName}(\n` +
            `        value: ${thatType}\n` +
            `    ) {\n` +
            `        return this.enumCast.toUplcData({ \n` +
            `           ${variantName}: { ${fieldName}: value } \n` +
            `        }); /*SingleField*/\n` +
            `    }`
        );
    }

    includeEnumSchemas() {
        const schemas = Object.entries(this.enumSchemas)
            .map(([name, schema]) => {
                return `export const ${name}Schema : EnumTypeSchema = ${JSON.stringify(
                    schema,
                    null,
                    2
                )};`;
            })
            .join("\n");
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
