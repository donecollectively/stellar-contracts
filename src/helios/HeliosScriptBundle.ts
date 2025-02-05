import type { DataType, Program } from "@helios-lang/compiler";
import type { Source } from "@helios-lang/compiler-utils";
import {
    type UplcData,
    type UplcProgramV2,
    type UplcProgramV3,
    type UplcSourceMapJsonSafe,
} from "@helios-lang/uplc";
import { decodeUplcProgramV2FromCbor } from "@helios-lang/uplc";
// import { decodeUplcProgramV3FromCbor } from "@helios-lang/uplc";

import { HeliosProgramWithCacheAPI } from "@donecollectively/stellar-contracts/HeliosProgramWithCacheAPI";

import type { CapoHeliosBundle } from "../CapoHeliosBundle.js";
import type {
    configBaseWithRev,
    SetupInfo,
    SetupOrMainnetSignalForBundle,
    StellarBundleSetupUplc,
    UplcRecord,
} from "../StellarContract.js";
import type { anyUplcProgram } from "../HeliosPromotedTypes.js";
import type {
    CapoBundleClass,
    HeliosBundleClassWithCapo,
    HeliosBundleTypes,
} from "./HeliosMetaTypes.js";
import type { StringifiedHeliosCacheEntry } from "./CachedHeliosProgram.js";
import type { DeployedScriptDetails } from "../configuration/DeployedScriptConfigs.js";
import { bytesToHex } from "@helios-lang/codec-utils";
import { makeCast } from "@helios-lang/contract-utils";

/**
 * @internal
 */
export const defaultNoDefinedModuleName = "‹default-needs-override›";

/**
 * Base class for any Helios script bundle
 * @remarks
 * See also {@link CapoHeliosBundle} and {@link CapoDelegateBundle} for
 * specialized bundle types
 * @public
 */
export abstract class HeliosScriptBundle {
    static isCapoBundle = false;

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
        //@ts-expect-error creating from abstract class
        const cb = new c();
        const newClass = class aCapoBoundBundle extends HeliosScriptBundle {
            capoBundle = cb;
            constructor(setupDetails: StellarBundleSetupUplc<any>) {
                super(setupDetails);
            }

            isConcrete = true;
        } as HeliosBundleClassWithCapo & typeof newClass;

        return newClass;
    }

    capoBundle?: CapoHeliosBundle;
    isConcrete = false;

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
    isMainnet?: boolean;
    _program?: HeliosProgramWithCacheAPI;
    _progHasDeploymentDetails = false;
    setup: SetupOrMainnetSignalForBundle;
    configuredParams?: UplcRecord<any>;
    deployedScriptDetails?: DeployedScriptDetails;

    constructor(setupDetails: StellarBundleSetupUplc<any>) {
        // this.devReloadModules()
        // if (setupDetails) debugger;
        this._program = undefined;
        this.setup = setupDetails?.setup;
        this.isMainnet = this.setup?.isMainnet;
        if (this.setup && "undefined" === typeof this.isMainnet) {
            throw new Error(
                `${this.constructor.name}: setup.isMainnet must be defined`
            );
        }
        this.configuredParams = setupDetails?.params;
        this.deployedScriptDetails = setupDetails?.deployedDetails;
    }

    get hasDeploymentDetails() {
        return !!this.deployedScriptDetails;
    }

    withSetupDetails(details: StellarBundleSetupUplc<any>) {
        if (this.setup) {
            throw new Error(`setup already present`);
        }
        //@ts-expect-error with dynamic creation
        return new this.constructor(details);
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

    get params() {
        return {} as any
    }
    /**
     * The known variants of this contract script, with any contract
     * parameters applicable to each variant.  By default, there is a
     * singleton variant that uses the result of `get params()`.
     */
    get variants() : { [variantName: string]: any } {
        return { singleton: this.params };
    }

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
     *
     * If you include any modules provided by other scripts in your project, you should
     * be aware that any material changes to those scripts will change your delegate's validator,
     * resulting in a need to deploy new script contracts.  This is why it's important to only include
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

    /**
     * indicates whether the script should be optimized.
     * @remarks
     * Defaults to the general optimize setting provided by the factoryArgs.
     * Override to force optimization on or off.
     */
    get optimize() {
        return this.setup!.optimize ?? true;
    }

    get moduleName() {
        return this.constructor.name
            .replace(/Bundle/, "")
            .replace(/Helios/, "");
        defaultNoDefinedModuleName; // overridden in subclasses where relevant
    }

    /**
     * resolves the compiled script for this class with its provided
     * configuration details
     * @remarks
     * The configuration details may come through the Capo bundle's
     * `deployedDetails` or by compiling the script with the provided
     * params.
     */
    async compiledScript(): Promise<anyUplcProgram> {
        const { configuredParams: params, setup, program } = this;
        if (!params || !setup) {
            debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
            // theoretically only here for type-narrowing
            throw new Error(
                `(unreachable?): missing required params or setup for compiledScript() (debugging breakpoint available)`
            );
        }

        if (this.deployedScriptDetails?.programBundle) {
            const {
                optimized,
                unoptimized,
                // optimizedIR, // omitted
                // unoptimizedIR, // omitted
                optimizedSmap,
                unoptimizedSmap,
                version,
            } = this.deployedScriptDetails.programBundle;
            if (!unoptimized) {
                debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
                throw new Error(
                    `${this.constructor.name}: missing unoptimized program in serialized program cache\n` +
                        `  (debugging breakpoint available)`
                );
            }
            if (/* !unoptimizedIR || */ !unoptimizedSmap) {
                console.error({
                    // unoptimizedIR,
                    unoptimizedSmap,
                });
                debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
                throw new Error(
                    `${this.constructor.name}: missing expected ` +
                        /*unoptimizedIR or */ `sourcemap in serialized program cache\n` +
                        `  (debugging breakpoint available)`
                );
            }
            const altProgram = this.decodeAnyPlutusUplcProgram(
                version,
                unoptimized,
                // unoptimizedIR,
                unoptimizedSmap
            );
            if (this.optimize) {
                if (!optimized) {
                    debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
                    throw new Error(
                        `${this.constructor.name}: missing optimized program in serialized program cache, with optimization enabled\n` +
                            `  (debugging breakpoint available)`
                    );
                }
                if (/* !optimizedIR || */ !optimizedSmap) {
                    console.error({
                        // optimizedIR,
                        optimizedSmap,
                    });
                    throw new Error(
                        `${this.constructor.name}: missing expected optimizedIR or sourcemap in serialized program cache, with optimization enabled\n` +
                            `  (debugging breakpoint available)`
                    );
                }
                return this.decodeAnyPlutusUplcProgram(
                    version,
                    optimized,
                    // optimizedIR,
                    optimizedSmap,
                    altProgram
                );
            }
            return altProgram;
        }

        // falls back to actually compiling the program.
        // on server side, this comes with caching for performance.
        // on the browser, there's not (currently) a cache.  It's intended
        // that the deployedScriptDetails will usually be available, so
        // the cases where this is needed on the browser side should be rare.
        console.warn("compiling helios script.  This could take 30s or so... ");
        const t = new Date().getTime();
        for (const [p, v] of Object.entries(params)) {
            program.changeParam(p, v);
        }

        const net = setup.isMainnet ? "mainnet" : "testnet";
        console.log(
            `(${net}) ${this.moduleName} with params:`,
            program.entryPoint.paramsDetails()
        );

        const uplcProgram = await program.compileWithCache({
            optimize: this.optimize,
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
        if (globalThis.document) {
            console.log({
                uplcProgram,
                cbor: bytesToHex(uplcProgram.toCbor()),
            });
        }
        return uplcProgram;
    }

    decodeAnyPlutusUplcProgram(
        version: "PlutusV2" | "PlutusV3",
        cborHex: string,
        // ir: string,
        sourceMap: UplcSourceMapJsonSafe,
        alt?: anyUplcProgram
    ) {
        if (version === "PlutusV2") {
            if (alt && alt.plutusVersion != "PlutusScriptV2") {
                throw new Error(
                    `expected alt script to have matching Plutus V2, not ${alt.plutusVersion}`
                );
            }
            return decodeUplcProgramV2FromCbor(cborHex, {
                // ir: ir,
                sourceMap: sourceMap,
                alt: alt as UplcProgramV2,
            });
        } else if (version === "PlutusV3") {
            throw new Error(`Plutus V3 not yet supported`);
            // if (alt && alt.plutusVersion != "PlutusScriptV3") {
            //     throw new Error(`expected alt script to have matching Plutus V3, not ${alt.plutusVersion}`);
            // }
            // return decodeUplcProgramV3FromCbor(cborHex, {
            //     ir: ir,
            //     sourceMap: sourceMap,
            //     alt: alt as UplcProgramV3
            // });
        } else {
            throw new Error(`unexpected Plutus version ${version}`);
        }
    }

    /**
     * provides a temporary indicator of mainnet-ness, while not
     * requiring the question to be permanently resolved.
     */
    isDefinitelyMainnet() {
        return this.isMainnet ?? false;
    }

    // _pct: number = 0
    get program(): HeliosProgramWithCacheAPI {
        if (this._program) {
            if (
                this.hasDeploymentDetails != this._progHasDeploymentDetails ||
                this.setup?.isMainnet !== this.isMainnet
            ) {
                this._program = undefined;
            } else {
                return this._program;
            }
        }
        const isMainnet = this.setup?.isMainnet ?? false;
        const isTestnet = !isMainnet;

        const ts1 = Date.now();
        let mName = this.moduleName;
        if (mName === defaultNoDefinedModuleName) {
            mName = "";
        }
        const moduleSources = this.getEffectiveModuleList();

        if (!isTestnet) {
            debugger;
        }
        try {
            const p = new HeliosProgramWithCacheAPI(this.main, {
                isTestnet,
                moduleSources,
                name: mName, // it will fall back to the program name if this is empty
            });
            this._program = p;
            this._progHasDeploymentDetails = this.hasDeploymentDetails;
            console.log(
                `📦 ${mName}: loaded & parsed ${
                    this.hasDeploymentDetails ? "with" : "without"
                } setup: ${Date.now() - ts1}ms`
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
                        `(debugging breakpoint available)\n` +
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
                        isTestnet,
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
                    "NOTE: the module name for the delegate policy script must match bundle's moduleName"
                );
                debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
                throw new Error(
                    `specialization types not found for ${this.moduleName} in program ${program.name} (debugging breakpoint available)`
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

    paramsToUplc<
        ConfigType extends configBaseWithRev
    >(params: Record<string, any>): UplcRecord<ConfigType> {
        const namespace = this.program.name;
        const { paramTypes } = this.program;

        return Object.fromEntries(
            Object.entries(params)
                .map(([paramName, data]) => {
                    const fullName = `${namespace}::${paramName}`;
                    // console.log("  -- param", fullName);
                    const thatType = paramTypes[fullName];
                    if (!thatType) {
                        // group the params by namespace to produce a list of:
                        //   "namespace::{ ... paramNames ... }"
                        //   "namespace2::{ ... paramNames ... }"
                        const availableParams = Object.entries(
                            paramTypes
                        ).reduce((acc, [k, v]) => {
                            const [ns, name] = k.split("::");
                            if (!acc[ns]) acc[ns] = [];
                            acc[ns].push(name);
                            return acc;
                        }, {} as Record<string, string[]>);
                        // if (Array.isArray(data)) {
                        //     // probably it's wrong to categorically reject arrays,
                        //     // but if you have this problem, please let us know and we'll help you resolve it.
                        //     throw new Error(
                        //         `invalid script-parameter '${paramName}' in namespace '${namespace}' \n` +
                        //             `  ... expected single value, got array`
                        //     );
                        // }

                        // throw an error showing all the namespaces and all the short params in each
                        const availableScriptParams = Object.entries(
                            availableParams
                        )
                            .map(
                                ([ns, names]) =>
                                    `  ${ns}::{${names.join(", ")}}`
                            )
                            .join("\n");
                        // console.log("availableScriptParams", availableScriptParams);
                        if (paramName == "0") {
                            throw new Error(
                                `numeric param name is probably wrong`
                            );
                        }
                        if ((paramName = "addrHint")) {
                            // silently ignore this one
                            return undefined;
                        }
                        throw new Error(
                            `invalid script-parameter '${paramName}' in namespace '${namespace}' \n` +
                                `  ... expected one of: ${availableScriptParams}`
                        );
                    }
                    return [
                        fullName,
                        this.typeToUplc(thatType, data, `params[${fullName}]`),
                    ];
                })
                .filter((x) => !!x)
        ) as UplcRecord<ConfigType>;
    }

    typeToUplc(type: DataType, data: any, path: string = ""): UplcData {
        const schema = type.toSchema();
        const isMainnet = this.setup!.isMainnet
        if ("undefined" == typeof isMainnet) {
            throw new Error(
                `${this.constructor.name}: isMainnet must be defined in the setup`
            );
        }
        const cast = makeCast(schema, {
            isMainnet,
            unwrapSingleFieldEnumVariants: true,
        });
        return cast.toUplcData(data, path);
    }

}
