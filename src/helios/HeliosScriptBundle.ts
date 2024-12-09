import { existsSync, readFileSync, statSync } from "fs";

import type { UplcData } from "@helios-lang/uplc";
import type { DataType } from "@helios-lang/compiler";
import type { Source } from "@helios-lang/compiler-utils";
import type { TxOutputId } from "@helios-lang/ledger";

import type {
    EnumTypeSchema,
    TypeSchema,
    VariantTypeSchema,
} from "@helios-lang/type-utils";
import { CachedHeliosProgram } from "./CachedHeliosProgram.js";

import { DataBridge } from "./dataBridge/DataBridge.js";
import { DataReader } from "./dataBridge/DataReader.js";
import type { hasSeedUtxo } from "../StellarTxnContext.js";
import type { CapoHeliosBundle } from "../CapoHeliosBundle.js";
import type { hasSeed, isActivity, SeedAttrs } from "../ActivityTypes.js";

export type HeliosBundleClass = new () => HeliosScriptBundle;
export type CapoBundleClass = new () => CapoHeliosBundle;
export type hasCapoBundle = { capoBundle: CapoHeliosBundle };

export type TypeVariety = "canonical" | "permissive" | "ergonomic";
export type VariantFlavor = "tagOnly" | "fields" | "singletonField";
export type SpecialActivityFlags = "isSeededActivity" | "noSpecialFlags";

export type tagOnly=Record<string, never>
export const tagOnly: tagOnly = Object.freeze({})

// external-facing types for reading and writing data for use in contract scripts.
// 1. create data for Datum or other non-Activity scenarios



export type uplcDataBridge<permissiveType> =
    // can be called
    (
        (arg: permissiveType) => UplcData
    ) & DataBridge

// 2. read data from Datum.  Can also be used for returned results
//  ... of utility functions defined in Helios code.
export type readsSomeUplcData<T> = T extends EnumTypeMeta<any, any>
    ? readsUplcEnumData<T>
    : readsUplcData<T>;

export type readsUplcEnumData<T extends EnumTypeMeta<any, any>> = {
    read(x: UplcData): T;
};

export type readsUplcData<canonicalType> = (x: UplcData) => canonicalType;

export type makesUplcActivityData<permissiveType> = // ... a function type
    (arg: permissiveType) => isActivity & { redeemer: UplcData };

export type makesSomeActivityData<T> = T extends EnumTypeMeta<any, any>
    ? makesUplcActivityEnumData<any, any>
    : makesUplcActivityData<any>;

// export type AnyHeliosTypeInfo = TypeSchema | anyTypeDetails;
export type anyTypeDetails<T=undefined> = typeDetails<T> | enumTypeDetails<T>;

// creates smashed type of all possible variant-accessors of any signature.
// this brings together all the separate entries from separate union elements into a single type
// due to use of 'keyof'
export type expanded<T> = {
    [k in keyof T]: T[k];
};



// Utility types representing runtime information retrievable through the Helios APi
//   ... these are all ABOUT the types seen in the contract scripts
export type typeDetails<T=undefined> = {
    typeName?: string;
    typeSchema: TypeSchema;
    dataType: DataType;

    canonicalTypeName? : string; // type name (strict)
    ergoCanonicalTypeName?: string; // canonical type for ergonomic use
    permissiveTypeName? : string; // type name (permissive)

    canonicalType: string; // minimal canonical type (name if avaiable, or inline type as string)
    ergoCanonicalType: string; // minimal canonical type (name if avaiable, or inline type as string)
    permissiveType?: string; // minimal permissive type (name if available, or inline type as string)
    moreInfo: T
};

export type variantTypeDetails<T=undefined> = {
    variantName: string; 
    fieldCount: number;
    fields: Record<string, anyTypeDetails<T>>;
    typeSchema: VariantTypeSchema; // for consistency
    dataType: DataType;
    canonicalType: string; // minimal canonical type
    ergoCanonicalType: string; // minimal canonical type
    permissiveType: string; // minimal permissive type
    
    canonicalTypeName: string; // type name, always available
    ergoCanonicalTypeName: string; // canonical type for ergonomic use
    permissiveTypeName: string; // typ name, always available

    canonicalMetaType: string; // minimal canonical meta-type (singleEnumVariant<...>) string
    permissiveMetaType: string; // minimal permissive meta-type (singleEnumVariant<...>) string

    moreInfo: T;
};

export type enumTypeDetails<T=undefined> = {
    enumName: string;
    typeSchema: EnumTypeSchema; // for consistency
    dataType: DataType;
    
    canonicalTypeName: string; // type name for this enum
    ergoCanonicalTypeName: string; // type name for this enum (strict/enumLike form)
    permissiveTypeName: string; // type name for this enum (loose/enumLike form)

    canonicalType: string; // minimal canonical type
    ergoCanonicalType: string;
    permissiveType: string; // minimal permissive type

    variants: Record<string, variantTypeDetails<T>>;
    canonicalMetaType: string; // minimal canonical meta-type (EnumType<...>) string
    permissiveMetaType: string; // minimal permissive meta-type (EnumType<...>) string

    moreInfo: T;
};

// compile-time types for representing what is known about the types in the contract scripts
// created by the Stellar type-generator
export type VariantMap = {
    // Record<string, EnumVariant<any, any, any, any>>;
    [variantName: string]: singleEnumVariantMeta<any, any, any, any, any, any>;
};

export type EnumId = {
    module: string;
    enumName: string;
};

/**
 * ### Don't use this type directly.
 *
 * This type is used as an intermediate representation of an enum,
 * for generating the types for reading and writing data conforming to the type.
 */
export type EnumTypeMeta<EID extends EnumId, enumVariants extends VariantMap> = {
    NEVER_INSTANTIATED: "?maybe?";
    SEE_BUNDLE_CLASS: "accessor gateway there";
    kind: "enum";
    enumId: EID;
    variants: {
        [k in keyof enumVariants]: enumVariants[k];
    };
};

/**
 * ### Don't use this type directly.
 *
 * This type is used as an intermediate representation of an enum variant,
 * for generating the types of utilities that read and write the enum data.
 * See the mkEnum<EnumType> factory function, the ‹tbd› reader function
 * and the ‹tbd› readable type
 */
export type singleEnumVariantMeta<
    ET extends EnumTypeMeta<any, any>,
    VNAME extends keyof ET["variants"],
    variantConstr extends `Constr#${string}`,
    FLAVOR extends VariantFlavor,
    // variantArgs must be well specified for each variant
    variantArgs extends (FLAVOR extends "tagOnly" ? tagOnly : any),
    specialFlags extends SpecialActivityFlags,
    EID extends EnumId = ET["enumId"]
> = {
    kind: "variant";
    enumId: EID;
    variantName: VNAME;
    // not needed in a data structure, but useful in the type params
    // ... for signature-expansion of the mkEnum type
    // flags: EachUnionElement<specialFlags>;
    variantKind: FLAVOR;
    constr: variantConstr;
    data: variantArgs;
    uplcData: UplcData;
};

// utility types for transforming an EnumType into interfaces for reading/writing data of that type

type anySingleEnumVariantMeta = singleEnumVariantMeta<any, any, any, any, any, any>;

if (false) {
    type test = "x" | "y" extends "x" ? true : false; // false
    type test2 = "x" extends "x" | "y" ? true : false; // true
    const test2Value: test2 = true;

    const t: never extends "foo" ? true : false = true;
    const t2: "foo" extends never ? true : false = false;
}

type _expandInputFields<V extends anySingleEnumVariantMeta> = {
    [k in keyof V["data"]]: V["data"][k];
};

// -------------------- Non-Activity Variant Creator Types  --------------------



type _variantFieldArity<V extends anySingleEnumVariantMeta> = V["variantKind"];

// -------------------- Activity Variant Creator Types --------------------

export type anySeededActivity = singleEnumVariantMeta<
    any,
    any,
    any,
    any,
    { seed: TxOutputId | string },
    "isSeededActivity"
>;

type _singletonFieldActivityVariantCreator<
    V extends anySingleEnumVariantMeta,
    rawArgType = V["data"],
    RESULT_TYPE = EnumUplcActivityResult<V>,
    rawFuncType = (field: rawArgType) => RESULT_TYPE
> = V extends anySeededActivity
    ? (seedOrSeedArg: hasSeed | rawArgType) => RESULT_TYPE
    : rawFuncType;

type _multiFieldActivityVariantCreator<
    V extends anySingleEnumVariantMeta,
    RESULT_TYPE = EnumUplcActivityResult<V>,
    rawFuncType = (
        fields: // V["data"]
        _expandInputFields<V>
    ) => RESULT_TYPE
> = V extends anySeededActivity
    ? makesMultiFieldSeededData<V, RESULT_TYPE>
    : rawFuncType;

export type ActivityEnumVariantCreator<
    VARIANT extends anySingleEnumVariantMeta,
    RESULT_TYPE = EnumUplcActivityResult<VARIANT>,
    ARITY = _variantFieldArity<VARIANT>
> = ARITY extends "tagOnly"
    ? // is a simple getter, no function call needed
      RESULT_TYPE
    : ARITY extends "singletonField"
    ? VARIANT["data"] extends EnumTypeMeta<any, any>
        ? _noRedeemerWrappers<makesUplcActivityEnumData<VARIANT["data"]>>
        : _singletonFieldActivityVariantCreator<VARIANT>
    : ARITY extends "fields"
    ? _multiFieldActivityVariantCreator<VARIANT, RESULT_TYPE>
    : never;

export type _noRedeemerWrappers<T extends makesUplcActivityEnumData<any>> = {
    [k in keyof T]: _noRedeemerWrapper<T[k]>; 
}

export type _noRedeemerWrapper<T> = T extends (...args: infer A) => {redeemer: infer R} ? (...args: A) => R : T;

export type EnumUplcActivityResult<
    V extends anySingleEnumVariantMeta,
    hasData = {
        uplcData: V["uplcData"];
        variantName: V["variantName"];
        enumId: V["enumId"];
    }
> = { redeemer: hasData };

// utilities for representing an enum variant-creator having a seed, with 2 possible signatures
type makesMultiFieldSeededData<V extends anySeededActivity, RESULT_TYPE> = (
    ...args: [hasSeedUtxo | SeedAttrs, _nonSeededFieldsType<V>] | [V["data"]]
) => RESULT_TYPE;

type remainingFields<T> = {
    // same as expanded<T>
    [k in keyof T]: T[k];
};

type _nonSeededFieldsType<V extends anySeededActivity> = remainingFields<{
    [k in Exclude<keyof V["data"], "seed">]: V["data"][k];
}>;

export type makesUplcActivityEnumData<
    ET extends EnumTypeMeta<any, any>,
    VARIANTS extends VariantMap = ET extends EnumTypeMeta<any, infer VARIANTS>
        ? VARIANTS
        : never
> = {
        // prettier-ignore
        [k in keyof VARIANTS]: ActivityEnumVariantCreator<VARIANTS[k]>
            };

/**
 * General type information for the datum and redeemer types in a helios script
 * bundle.  Not exactly the same as the types generated for api access
 * to on-chain data, but covering the same space.  Each enum variant
 * is separately typed, enabling the type-generation to be more precise
 * in creating ergonomic branded types for reading, detecting, and writing
 * each variant.
 */
export type HeliosBundleTypeDetails<T=undefined> = {
    datum?: typeDetails<T> | enumTypeDetails<T>;
    redeemer: typeDetails<T> | enumTypeDetails<T>;
};

export type HeliosBundleTypes = {
    datum?: DataType;
    redeemer: DataType;
};
const defaultNoDefinedModuleName = "‹default-needs-override›";


export abstract class HeliosScriptBundle {
    static isCapoBundle = false;
    abstract capoBundle: CapoHeliosBundle;
    /**
     * Constructs a base class for any Helios script bundle,
     * given the class for an application-specific CapoHeliosBundle.
     * @remarks
     * The resulting class provides its own CapoHeliosBundle instance
     * for independent use (specifically, for compiling this bundle using 
     * the dependency libraries provided by the Capo bundle).
     */
    //
//     * NOTE: the following is NOT needed for efficiency, and not implemented
//     *, as the Capo
//     * bundle referenced above should never need to be compiled via 
//     * `this.capoBundle.program`.
//     * 
//     * XXX - For application runtime purposes, it can ALSO accept a 
//     * XXX - CapoHeliosBundle instance as a constructor argument, 
//     * XXX - enabling lower-overhead instantiation and re-use across 
//     * XXX - various bundles used within a single Capo,
//     */
    static using<CB extends CapoBundleClass>(c : CB) {
        const newClass = class aCapoBoundBundle 
        extends HeliosScriptBundle {
        // implements hasCapoBundle {
            capoBundle = new c()
        } //as HeliosBundleClass // & hasCapoBundle //& typeof HeliosScriptBundle &  // & typeof newClass

        return newClass
    }
    /**
     * optional attribute explicitly naming a type for the datum
     * @remarks
     * This can be used if needed for a contract whose entry point uses an abstract
     * type for the datum; the type-bridge & type-gen system will use this data type
     * instead of inferrring the type from the entry point.
     */
    datumTypeName?: string;

    /**
     * optional attribute explicitly naming a type for the redeemer
     * @remarks
     * This can be used if needed for a contract whose entry point uses an abstract
     * type for the redeemer; the type-bridge & type-gen system will use this data type
     * instead of inferring the type from the entry point.
     */
    redeemerTypeName?: string;

    constructor() {
        // this.devReloadModules()
    }

    // these should be unnecessary if we arrange the rollup plugin
    // ... to watch the underlying helios files for changes that would affect the hlbundle
    // checkDevReload() {
    //     const env = process.env.NODE_ENV;
    //     if (env !== "test" && env !== "development") {
    //         console.log("disabling module reloading in non-dev environment");
    //         return
    //     }
    //     this.reloadModule(this.main);
    //     for (const module of this.modules) {
    //         this.reloadModule(module)
    //     }
    // }
    // reloadModule(module: HeliosModuleSrc) {
    //     // treat module.name as a filename.
    //     // check if it can be opened as a file.
    //     // reassign module.content to the file's contents.

    //     if (existsSync(module.name)) {
    //         console.log(`bundle module load: ${module.name}`);
    //         const newContent = readFileSync(module.name, "utf8");
    //         if (module.content !== newContent) {
    //             console.log(`♻️ module reload: ${module.name}`);
    //             module.content = newContent;
    //         }
    //     }
    // }

    get main() : Source {
        throw new Error(`${this.constructor.name}: get main() must be implemented in subclass`);
    }

    get modules(): Source[] {
        return []
    };
    
    get bridgeClassName() {
        const mName = this.moduleName || this.program.name;
        return `${mName}DataBridge`
    }

    get moduleName() {
        return this.constructor.name.replace(/Bundle/, "").replace(/Helios/, "")
        defaultNoDefinedModuleName// overridden in subclasses where relevant
    }

    get program(): CachedHeliosProgram {
        let mName = this.moduleName
        if (mName === defaultNoDefinedModuleName) {
            mName = ""
        }
        try {
            return CachedHeliosProgram.forCurrentPlatform(this.main, {
                moduleSources: this.modules,
                name: mName // it will fall back to the program name if this is empty
            });
        } catch (e: any) {
            // !!! probably this stuff needs to move to compileWithScriptParams()
            if (e.message.match(/invalid parameter name/)) {
                debugger                
                throw new Error(
                    e.message +
                        `\n   ... this typically occurs when your StellarContract class (${this.constructor.name})` +
                        "\n   ... can be missing a getContractScriptParamsUplc() method " +
                        "\n   ... to map from the configured settings to contract parameters"
                );
            }
            const [unsetConst, constName] =
                e.message.match(/used unset const '(.*?)'/) || [];
            if (unsetConst) {
                console.log(e.message);
                throw new Error(
                    `${this.constructor.name}: missing required script param '${constName}' in static getDefaultParams() or getContractScriptParams()`
                );
            }
            if (!e.site) {
                console.error(
                    `unexpected error while compiling helios program (or its imported module) \n` +
                        `> ${e.message}\n` +
                        `Suggested: connect with debugger (we provided a debugging point already)\n` +
                        `  ... and use 'break on caught exceptions' to analyze the error \n` +
                        `This likely indicates a problem in Helios' error reporting - \n` +
                        `   ... please provide a minimal reproducer as an issue report for repair!\n\n` +
                        e.stack.split("\n").slice(1).join("\n")
                );
                try {
                    debugger;
                    // debugger'ing?  YOU ARE AWESOME!
                    //  reminder: ensure "pause on caught exceptions" is enabled
                    //  before playing this next line to dig deeper into the error.

                    const try2 = CachedHeliosProgram.forCurrentPlatform(this.main, {
                        moduleSources: this.modules,
                        name: mName // it will fall back to the program name if this is empty
                    });
        
                    // const script2 = new Program(codeModule, {
                    //     moduleSources: modules,
                    //     isTestnet: this.setup.isTest,
                    // });
                    // console.log({ params });
                    // if (params) {
                    //     for (const [p, v] of Object.entries(params || {})) {
                    //         script2.changeParam(p, v);
                    //     }
                    //     script2.compile();
                    // }
                    console.warn("NOTE: no error thrown on second attempt");
                } catch (sameError) {
                    // entirely expected it would throw the same error
                    // throw sameError;
                }
                // throw e;
            }
            debugger;
            const [_, notFoundModule] = e.message.match(/module '(.*)' not found/) || []
            if (notFoundModule) {
                console.log("module not found; included modules:\n"+ 
                    this.modules.map((m) => {
                        const pInfo = m.project ? ` [in ${m.project}]/` : "";
                        return ` • ${m.moduleName}${pInfo}${m.name} (${m.content.length} bytes)`
                    }).join("\n")
                )
            }
            if (!e.site) {
                console.warn(
                    "error thrown from helios doesn't have source site info; rethrowing it"
                );
                throw e;
            }
            const moduleName2 = e.site.file; // moduleName? & filename ? :pray:
            const errorModule = [
                this.main,
                 ...this.modules
            ].find((m) => m.name == moduleName2);

            // const errorModule = [codeModule, ...modules].find(
            //     (m) => (m as any).name == moduleName
            // );

            const {
                project,
                moduleName,
                name: srcFilename = "‹unknown path to module›",
                moreInfo,
            } = errorModule || {};
            let errorInfo: string = "";
            try {
                statSync(srcFilename).isFile();
            } catch (e) {
                const indent = " ".repeat(6);
                errorInfo = project
                    ? `\n${indent}Error found in project ${project}:${srcFilename}\n` +
                      `${indent}- in module ${moduleName}:\n${moreInfo}\n` +
                      `${indent}  ... this can be caused by not providing correct types in a module specialization,\n` +
                      `${indent}  ... or if your module definition doesn't include a correct path to your helios file\n`
                    : `\n${indent}WARNING: the error was found in a Helios file that couldn't be resolved in your project\n` +
                      `${indent}  ... this can be caused if your module definition doesn't include a correct path to your helios file\n` +
                      `${indent}  ... (possibly in mkHeliosModule(heliosCode, \n${indent}    "${srcFilename}"\n${indent})\n`;
            }

            const { startLine, startColumn } = e.site;
            const t = new Error(errorInfo);
            const modifiedStack = t.stack!.split("\n").slice(1).join("\n");
            debugger
            const additionalErrors = (e.otherErrors || [])
                .slice(1)
                .map((oe) => `       |         ⚠️  also: ${
                    // (oe.message as string).replace(e.site.file, "")}`);
                    oe.site.file == e.site.file ?
                        oe.site.toString().replace(e.site.file+":", "at ") + ": "+ oe.originalMessage
                    : oe.site.toString() + " - " + oe.originalMessage
                }`);
            const addlErrorText = additionalErrors.length
                ? ["", ...additionalErrors, "       v"].join("\n")
                : "";
            t.message = `${e.kind}: ${this.constructor.name}\n${
                e.site.toString() 
            } - ${
                e.originalMessage
            }${addlErrorText
            }\n${errorInfo}`;

            t.stack =
                `${this.constructor.name}: ${
                    e.message
                }\n    at ${moduleName2} (${srcFilename}:${1 + startLine}:${
                    1 + startColumn
                })\n` + modifiedStack;

            throw t;
        }
    }

    isHeliosScriptBundle() {
        return true
    }

    addTypeProxies() {
        // const typeGenerator = new BundleTypeGenerator(this);
        // const { activityTypeDetails, datumTypeDetails } = typeGenerator;

        // this.Activity = new ActivityMaker(this);
        // if (datumTypeDetails) {                    
        //     this.readDatum = new DataReader(datumTypeDetails);
        // }
    }

    effectiveDatumTypeName() {
        return this.datumTypeName || this.locateDatumType()?.name || "‹unknown datum-type name›";
    }

    locateDatumType(): DataType | undefined{
        let datumType: DataType | undefined;
        // let datumTypeName: string | undefined;

        const program = this.program;
        const programName = program.name;
        const argTypes = program.entryPoint.mainArgTypes;
        const argCount = argTypes.length;
        if (argCount === 2) {
            datumType = argTypes[0];
            // datumTypeName = argTypes[0].name;
        }

        if (this.datumTypeName) {
            datumType =
                program.entryPoint.userTypes[programName][this.datumTypeName];
            if (!datumType) {
                throw new Error(
                    `${this.constructor.name}.datumTypeName=\`${this.datumTypeName}\` not found in userTypes of script program ${programName}`
                );
            }
        }

        return datumType;
    }

    locateRedeemerType(): DataType {
        const program = this.program;
        const argTypes = program.entryPoint.mainArgTypes;
        const argCount = argTypes.length;

        let redeemerType: DataType;
        if (argCount === 2) {
            redeemerType = argTypes[1];
        } else {
            redeemerType = argTypes[0];
        }

        if (this.redeemerTypeName) {
            const programName = program.name;
            redeemerType =
                program.entryPoint.userTypes[programName][
                    this.redeemerTypeName
                ];
            if (!redeemerType) {
                throw new Error(
                    `${this.constructor.name}.redeemerTypeName=\`${this.redeemerTypeName}\` not found in userTypes of script program ${programName}`
                );
            }
        }

        return redeemerType;
    }

    getTopLevelTypes(): HeliosBundleTypes {
        return {
            datum: this.locateDatumType(),
            redeemer: this.locateRedeemerType(),
        };
    }
}
