import type { DataType, Program } from "@helios-lang/compiler";
import type { Source } from "@helios-lang/compiler-utils";

import type { CapoHeliosBundle } from "../CapoHeliosBundle.js";
import type { configBaseWithRev, UplcRecord } from "../StellarContract.js";
import type { anyUplcProgram } from "../HeliosPromotedTypes.js";
import type {
    CapoBundleClass,
    HeliosBundleClassWithCapo,
    HeliosBundleTypes,
} from "./HeliosMetaTypes.js";
import { HeliosProgramWithCacheAPI } from "@donecollectively/stellar-contracts/HeliosProgramWithCacheAPI";

/**
 * @internal
 */
export const defaultNoDefinedModuleName = "‹default-needs-override›";

/**
 * @public
 */
export type HeliosScriptSettings<ConfigType extends configBaseWithRev> = {
    config: ConfigType;
    optimize?: boolean;
};

/**
 * Base class for any Helios script bundle
 * @remarks
 * See also {@link CapoHeliosBundle} and {@link CapoDelegateBundle} for
 * specialized bundle types
 * @public
 */
export abstract class HeliosScriptBundle {
    static isCapoBundle = false;
    capoBundle?: CapoHeliosBundle;
    isConcrete = false;

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
    static usingCapoBundleClass<CB extends CapoBundleClass>(
        c: CB
    ): HeliosBundleClassWithCapo {
        const cb = new c();
        const newClass = class aCapoBoundBundle extends HeliosScriptBundle {
            capoBundle = cb;
            constructor() {
                super();
            }

            isConcrete = true;
        } as HeliosBundleClassWithCapo & typeof newClass;

        return newClass;
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
    // ... to watch the underlying helios files for changes that would affect the bundle
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

    get main(): Source {
        throw new Error(
            `${this.constructor.name}: get main() must be implemented in subclass`
        );
    }

    /**
     * A list of modules always available for import to Capo-hosted policy scripts
     * @public
     */
    protected implicitIncludedCapoModules() {
        return [
            "CapoMintHelpers",
            "CapoDelegateHelpers",
            "StellarHeliosHelpers",
            "CapoHelpers",
        ];
    }

    /**
     * specifies a list module names to be included in the compilation of this script
     * @remarks
     * Only used in bundles created with `HeliosScriptBundle.usingCapoBundleClass()` or
     * `CapoDelegateBundle.usingCapoBundleClass()`.
     *
     * Each of these module-names MUST be provided by the CapoHeliosBundle used for
     * this script bundle (in its `get modules()`).  CapoMintHelpers, CapoDelegateHelpers,
     * StellarHeliosHelpers and CapoHelpers are always available for import to the
     * policy script, and the module names you list here will be added to that list.
     *
     * These module names will then be available for `import { ... }` statements in your helios script.
     *
     * ### Beware of Shifting Sands
     * If you include any modules provided by other scripts in your project, you should
     * be aware that ANY changes to those scripts will change your delegate's validator, resulting
     * in a need to deploy new script contracts.  This is why it's important to only include
     * modules that are relatively stable, or whose changes SHOULD trigger a new deployment
     * for this script.
     *
     * When you can use isolation techniques including abstract data definitions and/or granular
     * code-modularization, you can reduce the incidence of such changes while ensuring that needed
     * upgrades are easy to manage.
     * @public
     */
    includeFromCapoModules(): string[] {
        return [];
    }

    /**
     * Computes a list of modules to be provided to the Helios compiler
     * @remarks
     * includes any explicit `modules` from your script bundle, along with any
     * modules, provided by your Capo and listed by name in your
     * `includeFromCapoModules()` method.
     * @public
     */
    getEffectiveModuleList() {
        if (!this.capoBundle) {
            return [...this.modules];
        }

        return [...this.resolveCapoIncludedModules(), ...this.modules];
    }

    resolveCapoIncludedModules() {
        const includeList = [
            ...this.implicitIncludedCapoModules(),
            ...this.includeFromCapoModules(),
        ];

        const unsatisfiedIncludes = new Set(includeList);
        const capoIncludedModules = this.capoBundle!.modules.filter((x) => {
            const mName = x.moduleName!;
            const found = includeList.includes(mName);
            unsatisfiedIncludes.delete(mName);
            return found;
        });

        if (unsatisfiedIncludes.size) {
            throw new Error(
                `${
                    this.displayName
                }: includeFromCapoModules() includes modules not provided by the Capo:\n ${Array.from(
                    unsatisfiedIncludes
                )
                    .map((m) => `   • ${m}\n`)
                    .join("\n")}`
            );
        }

        return capoIncludedModules;
    }

    logModuleDetails() {
        const capoIncludedModules = this.resolveCapoIncludedModules();

        function moduleDetails(m: Source) {
            const pInfo = m.project ? ` [in ${m.project}]/` : "";
            return `    • ${m.moduleName}${pInfo}${m.name} (${m.content.length} chars)`;
        }

        console.log(
            `\nModules in ${this.displayName}:\n` +
                ` • includeFromCapoModules(): ${this.includeFromCapoModules().join(
                    ", "
                )}\n` +
                ` • implicit Capo modules:    ${this.implicitIncludedCapoModules().join(
                    ", "
                )}\n` +
                ` • modules from Capo: \n${capoIncludedModules
                    .map(moduleDetails)
                    .join("\n")}\n` +
                ` • get modules() (${this.modules.length}): \n${this.modules
                    .map(moduleDetails)
                    .join("\n")}`
        );
    }

    /**
     * lists any helios modules owned by & needed for this script bundle.
     * @remarks
     * Modules listed here should (imported from their .hl files as helios Source objects.
     *
     * Any modules shared ***from other script bundles in your project*** should instead be
     * added to your Capo's `modules`, and named in your `includeFromCapoModules()` method.
     *
     * Any of these modules needed by ***other script bundles*** in your project may also be
     * listed in your Capo's `modules`.
     */
    get modules(): Source[] {
        return [];
    }

    get displayName() {
        return this.moduleName || this.program.name;
    }
    get bridgeClassName() {
        const mName = this.displayName;
        return `${mName}DataBridge`;
    }

    get moduleName() {
        return this.constructor.name
            .replace(/Bundle/, "")
            .replace(/Helios/, "");
        defaultNoDefinedModuleName; // overridden in subclasses where relevant
    }
    config?: HeliosScriptSettings<any> = undefined;
    artifacts = null;
    async compiledScript(params: UplcRecord<any>): Promise<anyUplcProgram> {
        if (this.artifacts) {
            // todo
        }

        const script = this.program;
        // if (!this.program) {
        //     console.warn(
        //         "compileWithScriptParams() called without loaded program"
        //     );
        //     debugger;
        //     throw new Error(`missing required scriptProgram`);
        // }
        // debugger
        console.log(`


        // pre-config: okay, should have what's needed
        // when already deployed, we shouldn't ever need to get here because
        // we should have the CBOR-encoded script instead.
        ...at ${this.constructor.name}::compileWithScriptParams()`);

        const t = new Date().getTime();
        for (const [p, v] of Object.entries(params)) {
            script.changeParam(p, v);
        }

        console.log(
            `${this.moduleName} with params:`,
            script.entryPoint.paramsDetails()
        );

        debugger
        const uplcProgram = await this.program.compileWithCache({
            optimize: (this.config ?? {}).optimize ?? true,
        });
        //     // optimize: {
        //     //     keepTracing: true,
        //     //     factorizeCommon: false,
        //     //     inlineSimpleExprs: false,
        //     //     flattenNestedFuncExprs: false,
        //     //     removeUnusedArgs: false,
        //     //     replaceUncalledArgsWithUnit: false,
        //     //     inlineErrorFreeSingleUserCallExprs: false,
        //     //     inlineSingleUseFuncExprs: false,
        //     // },
        //     withAlt: true,
        // });

        console.log(`compiled in ${new Date().getTime() - t}ms`);
        return uplcProgram;
    }

    _program?: HeliosProgramWithCacheAPI;
    // _pct: number = 0
    get program(): HeliosProgramWithCacheAPI {
        if (this._program) {
            return this._program;
        }
        const ts1 = Date.now();
        let mName = this.moduleName;
        if (mName === defaultNoDefinedModuleName) {
            mName = "";
        }
        const moduleSources = this.getEffectiveModuleList();
        
        try {
            const p = new HeliosProgramWithCacheAPI(this.main, {
                moduleSources,
                name: mName, // it will fall back to the program name if this is empty
            });
            this._program = p;
            console.log(
                `📦 ${mName}: loaded & parsed: ${Date.now() - ts1}ms`
                // Hi!  Are you investigating a duplicate load of the same module?  🔥🔥🔥
                //   thanks! you're saving people 100ms at a time!
                // new Error("stack").stack
            );
            return p;
        } catch (e: any) {
            // !!! probably this stuff needs to move to compileWithScriptParams()
            if (e.message.match(/invalid parameter name/)) {
                debugger;
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

                    const try2 = new HeliosProgramWithCacheAPI(this.main, {
                        moduleSources,
                        name: mName, // it will fall back to the program name if this is empty
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
            const [_, notFoundModule] =
                e.message.match(/module '(.*)' not found/) || [];
            if (notFoundModule) {
                this.logModuleDetails();
                console.log(
                    `${this.constructor.name} module '${notFoundModule}' not found; see module details above`
                );
            }
            if (!e.site) {
                console.warn(
                    "error thrown from helios doesn't have source site info; rethrowing it"
                );
                throw e;
            }
            const moduleName2 = e.site.file; // moduleName? & filename ? :pray:
            const errorModule = [this.main, ...moduleSources].find(
                (m) => m.name == moduleName2
            );

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

            if (!HeliosProgramWithCacheAPI.checkFile(srcFilename)) {
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
            debugger;
            const additionalErrors = (e.otherErrors || []).slice(1).map(
                (oe) =>
                    `       |         ⚠️  also: ${
                        // (oe.message as string).replace(e.site.file, "")}`);
                        oe.site.file == e.site.file
                            ? oe.site
                                  .toString()
                                  .replace(e.site.file + ":", "at ") +
                              ": " +
                              oe.originalMessage
                            : oe.site.toString() + " - " + oe.originalMessage
                    }`
            );
            const addlErrorText = additionalErrors.length
                ? ["", ...additionalErrors, "       v"].join("\n")
                : "";
            t.message = `${e.kind}: ${
                this.constructor.name
            }\n${e.site.toString()} - ${
                e.originalMessage
            }${addlErrorText}\n${errorInfo}`;

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
        return true;
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
        return (
            this.datumTypeName ||
            this.locateDatumType()?.name ||
            "‹unknown datum-type name›"
        );
    }

    locateDatumType(): DataType | undefined {
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
        const types = {
            datum: this.locateDatumType(),
            redeemer: this.locateRedeemerType(),
        };

        const program = this.program;
        const { userTypes } = program;
        const { mainModule } = program.entryPoint;
        const mainTypes = userTypes[mainModule.name.value];
        for (const [typeName, type] of Object.entries(mainTypes)) {
            const s = type.toSchema();
            if (s.kind == "struct") {
                types[typeName] = type;
            }
        }

        if (userTypes.specializedDelegate) {
            const specializationName = this.moduleName;
            const specializationTypes = userTypes[specializationName];
            if (!specializationTypes) {
                console.log(
                    "NOTE:  debugging breakpoint available for more troubleshooting"
                );
                debugger;
                console.log(
                    "NOTE: the module name for the delegate policy script must match bundle's moduleName"
                );
                throw new Error(
                    `specialization types not found for ${this.moduleName} in program ${program.name}`
                );
            }
            for (const [typeName, type] of Object.entries(
                specializationTypes
            )) {
                const s = type.toSchema();
                if (s.kind == "struct") {
                    types[typeName] = type;
                }
            }
        }

        return types;
    }
}
