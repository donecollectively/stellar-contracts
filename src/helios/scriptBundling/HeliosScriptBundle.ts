import type { DataType, Program } from "@helios-lang/compiler";
import type { Source } from "@helios-lang/compiler-utils";
import {
    type UplcData,
    type UplcProgramV2,
    type UplcSourceMapJsonSafe,
} from "@helios-lang/uplc";
import { decodeUplcProgramV2FromCbor } from "@helios-lang/uplc";
// import { decodeUplcProgramV3FromCbor } from "@helios-lang/uplc";

import { HeliosProgramWithCacheAPI } from "@donecollectively/stellar-contracts/HeliosProgramWithCacheAPI";

import type { CapoHeliosBundle } from "./CapoHeliosBundle.js";
import type {
    configBaseWithRev,
    HeliosOptimizeOptions,
    SetupOrMainnetSignalForBundle,
    StellarBundleSetupDetails,
    UplcRecord,
} from "../../StellarContract.js";
import type { anyUplcProgram } from "../../HeliosPromotedTypes.js";
import type {
    CapoBundleClass,
    HeliosBundleClassWithCapo,
    HeliosBundleTypes,
} from "../HeliosMetaTypes.js";
import {
    programFromCacheEntry,
    serializeCacheEntry,
    type PrecompiledProgramJSON,
} from "../CachedHeliosProgram.js";
import type { DeployedScriptDetails } from "../../configuration/DeployedScriptConfigs.js";
import { bytesToHex, equalsBytes } from "@helios-lang/codec-utils";
import { makeCast } from "@helios-lang/contract-utils";
import { makeMintingPolicyHash } from "@helios-lang/ledger";
import { environment } from "../../environment.js";

/**
 * @internal
 */
export const defaultNoDefinedModuleName = "‹default-needs-override›";

/**
 * @public
 */
export const placeholderSetupDetails: StellarBundleSetupDetails<any> = {
    specialOriginatorLabel: "for abstract bundleClass",
    setup: {
        isMainnet: "mainnet" === environment.CARDANO_NETWORK,
    },
};

let T__id = 0;

/**
 * Base class for any Helios script bundle
 * @remarks
 * See also {@link CapoHeliosBundle} and {@link CapoDelegateBundle}
 * and {@link DelegatedDataBundle} for specialized bundle types
 * @public
 */
export abstract class HeliosScriptBundle {
    /**
     * an indicator of a Helios bundle that is intended to be used as a Capo contract
     * @remarks
     * the CapoHeliosBundle class overrides this to true.
     * @internal
     */
    static isCapoBundle = false;
    abstract requiresGovAuthority: boolean;
    /**
     * set to true if the bundle depends on having a deployed capo's configuration details
     * @public
     */
    static needsCapoConfiguration = false;

    /**
     * an opt-in indicator of abstractness
     * @remarks
     * Subclasses that aren't intended for instantiation can set this to true.
     *
     * Subclasses that don't set this will not be treated as abstract.
     * @public
     */
    static isAbstract?: boolean | undefined = undefined;

    // static get defaultParams() {
    //     return {};
    // }
    //
    // static currentRev = 1n;

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
        c: CB, generic : "generic" | false = false
    ): HeliosBundleClassWithCapo {
        //@ts-expect-error returning a subclass without concrete implementations
        // of the abstract members; hopefully the subclass will error if they're missing
        const cb = new c(placeholderSetupDetails);

        abstract class aCapoBoundBundle extends HeliosScriptBundle {
            capoBundle = cb;
            constructor(
                setupDetails: StellarBundleSetupDetails<any> = placeholderSetupDetails
            ) {
                super(setupDetails);
            }

            isConcrete = !!!generic;
        }

        return aCapoBoundBundle as HeliosBundleClassWithCapo &
            typeof aCapoBoundBundle;
    }

    static create<THIS extends typeof HeliosScriptBundle>(
        this: THIS,
        setupDetails: StellarBundleSetupDetails<any> = placeholderSetupDetails
    ) {
        //@ts-expect-error creating instance of abstract class
        const created = new this(setupDetails);

        created.init(setupDetails);
        return created;
    }
    abstract scriptParamsSource: "config" | "bundle" | "none";
    capoBundle?: CapoHeliosBundle;
    isConcrete = false;
    configuredScriptDetails?: DeployedScriptDetails = undefined;

    /**
     * optional attribute explicitly naming a type for the datum
     * @remarks
     * This can be used if needed for a contract whose entry point uses an abstract
     * type for the datum; the type-bridge & type-gen system will use this data type
     * instead of inferring the type from the entry point.
     */
    datumTypeName?: string;

    /**
     * optional attribute explicitly naming a type for the redeemer
     * @remarks
     * This can be used if needed for a contract whose entry point uses an abstract
     * type for the redeemer; the type-bridge & type-gen system will use this data type
     * instead of inferring the type from the entry point.
     */
    redeemerTypeName: string = "";
    isMainnet: boolean;
    _program: HeliosProgramWithCacheAPI | undefined = undefined;
    previousOnchainScript:
        | {
              validatorHash: number[];
              uplcProgram: anyUplcProgram;
          }
        | undefined = undefined;
    _progIsPrecompiled = false;
    setup: SetupOrMainnetSignalForBundle;
    setupDetails!: StellarBundleSetupDetails<any>;
    ___id: number = T__id++;
    _didInit = false;
    _selectedVariant?: string;
    debug = false;
    // scriptHash?: number[] | undefined;
    configuredUplcParams: UplcRecord<any> | undefined = undefined;
    configuredParams: any | undefined = undefined;
    precompiledScriptDetails?: {
        [variant: string]: DeployedScriptDetails<any, "native">;
    };
    alreadyCompiledScript: anyUplcProgram | undefined;

    constructor(
        setupDetails: StellarBundleSetupDetails<any> = placeholderSetupDetails
    ) {
        // this.devReloadModules()
        // if (setupDetails) debugger;
        this.setupDetails = setupDetails;
        this.configuredParams = setupDetails.params;
        this.setup = setupDetails.setup;
        this.isMainnet = this.setup.isMainnet;

        if (this.setup && "undefined" === typeof this.isMainnet) {
            debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
            throw new Error(
                `${this.constructor.name}: setup.isMainnet must be defined (debugging breakpoint available)`
            );
        }
    }

    get hasAnyVariant() {
        return true;
    }

    init(setupDetails: StellarBundleSetupDetails<any>) {
        const {
            deployedDetails,
            params,
            params: { delegateName, variant = "singleton" } = {},
            setup,
            scriptParamsSource = this.scriptParamsSource,
            previousOnchainScript,
            specialOriginatorLabel,
        } = setupDetails;
        // const { config,
        //     // programBundle
        // } = deployedDetails || {};

        if (this.scriptParamsSource !== scriptParamsSource) {
            console.warn(
                `   -- ${this.constructor.name}: overrides scriptParamsSource (originator '${specialOriginatorLabel || "‹unknown›"}')    '\n        was ${this.scriptParamsSource}, now ${scriptParamsSource}`
            );
            // debugger
            this.scriptParamsSource = scriptParamsSource;
        }
        if (scriptParamsSource === "config") {
            if (params) {
                this.configuredParams = {
                    ...params,
                    ...this.params
                }
            } else {
                if (!specialOriginatorLabel) {
                    debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
                    throw new Error(
                        `${this.constructor.name}: scriptParamsSource=config, but no program bundle, no script params`
                    );
                }
                console.log(`special originator '${specialOriginatorLabel}' initializing with basic config`)
            }
        } else if (scriptParamsSource == "bundle") {
            // the bundle has its own built-in params

            if (!this.precompiledScriptDetails) {
                debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
                throw new Error(
                    `${this.constructor.name}: scriptParamsSource=bundle without precompiled script details (originator '${specialOriginatorLabel || "‹unknown›"}')`
                );
            }
            const thisVariant = this.precompiledScriptDetails[variant];
            if (!thisVariant) {
                const msg = `${this.constructor.name}: no precompiled variant '${variant}' (originator '${specialOriginatorLabel || "‹unknown›"}') (dbpa)`;
                console.warn(
                    `${msg}\n  -- available variants: ${Object.keys(
                        this.precompiledScriptDetails
                    ).join(", ")}`
                );
                console.log(
                    "configured variant should be in scriptBundle's 'params'"
                );
                debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
                throw new Error(msg);
            }
            this._selectedVariant = variant;
            // debugger
            const preConfig = thisVariant.config;
            preConfig.rev = BigInt(preConfig.rev || 1);

            if (preConfig.capoMph?.bytes) {
                preConfig.capoMph = makeMintingPolicyHash(
                    preConfig.capoMph.bytes
                );
            }
            this.configuredParams = preConfig;

            // // temp singleton
            // const selectedVariant = "singleton";
            // this.configuredParams =
            //     this.getPreconfiguredVariantParams(selectedVariant);
        } else if (this.scriptParamsSource != "none") {
            throw new Error(
                `unknown scriptParamsSource: ${this.scriptParamsSource} (${specialOriginatorLabel})`
            );
        }

        this._didInit = true;
    }

    get scriptHash() {
        const hash =
            this.previousOnchainScript?.uplcProgram.hash() ||
            this.configuredScriptDetails?.scriptHash ||
            this.alreadyCompiledScript?.hash();
        if (!hash) {
            console.log("scriptHash called before program is loaded.  Call loadProgram() first (expensive!) if this is intentional")
            const script = this.compiledScript()
            return script.hash()
            throw new Error(
                "no scriptHash available yet (dbpa) - has the program been loaded and compiled?"
            );
        }
        return hash;
    }

    /**
     * deferred initialization of program details, preventing the need to
     * load the program prior to it actually being needed
     */
    initProgramDetails() {
        const { setupDetails } = this;

        const {
            deployedDetails,
            setup,
            previousOnchainScript,
        } = setupDetails;
        let { params } = setupDetails;
        const {
            config,
            // programBundle
        } = deployedDetails || {};

        if (previousOnchainScript) {
            this.previousOnchainScript = previousOnchainScript;
            // this.scriptHash = previousOnchainScript.uplcProgram.hash();
            // "string" === typeof deployedDetails?.scriptHash
            //     ? hexToBytes(deployedDetails.scriptHash)
            //     : deployedDetails?.scriptHash;
            return;
        }

        if (this.scriptParamsSource === "config") {
            if (params) {
                if (this.precompiledScriptDetails) {
                    const { configuredParams } = this;
                    const uplcPreConfig = this.paramsToUplc(configuredParams);

                    // checks the current params against the precompiled params
                    // throws an error on any mismatches

                    // omits delegateName from the strict checks
                    //  ... it's provided by the bundle, which the
                    //  ... off-chain wrapper class may not have access to.
                    const {
                        params: { delegateName, ...otherParams },
                    } = setupDetails;
                    this.isConcrete = true;
                    params = {
                        ...otherParams,
                        ...this.params
                    }
                    const uplcRuntimeConfig = this.paramsToUplc(params);
                    let didFindProblem: string = "";
                    for (const k of Object.keys(uplcPreConfig)) {
                        const runtime = uplcRuntimeConfig[k];
                        // skips past any runtime setting that was not explicitly set
                        if (!runtime) continue;
                        const pre = uplcPreConfig[k];
                        if (!runtime.isEqual(pre)) {
                            if (!didFindProblem) {
                                console.warn(
                                    `${this.constructor.name}: config mismatch between pre-config and runtime-config`
                                );
                                didFindProblem = k;
                            }
                            console.warn(
                                `• ${k}:  pre-config: `,
                                configuredParams[k] || (pre.rawData ?? pre),
                                ` at runtime:`,
                                params[k] || (runtime.rawData ?? runtime)
                            );
                        }
                    }
                    if (didFindProblem) {
                        throw new Error(
                            `runtime-config conflicted with pre-config (see logged details) at key ${didFindProblem}`
                        );
                    }
                } else {
                    params = {
                        ...params,
                        ...this.params
                    }
                }
                // moved to init
                // this.configuredParams = setupDetails.params;
                this.configuredUplcParams = this.paramsToUplc(
                    params
                );
            }
        } else if (this.scriptParamsSource == "bundle") {
            // the bundle has its own built-in params

            // temp singleton
            const selectedVariant = "singleton";
            this.configuredParams =
                this.getPreconfiguredVariantParams(selectedVariant);
            if (this.configuredParams) {
                this.configuredUplcParams =
                    this.getPreconfiguredUplcParams(selectedVariant);
            }
        } else if (this.scriptParamsSource != "none") {
            throw new Error(
                `unknown scriptParamsSource: ${this.scriptParamsSource}`
            );
        }
    }

    // XXinitProgramDetails() {
    //     const {setupDetails} = this;
    //     // if (!setupDetails?.params) {
    //     //     debugger
    //     //     console.warn(`setupDetails/params not set (dbpa)`);
    //     // }
    //     const {
    //         deployedDetails,
    //         params,
    //         params: { delegateName, variant = "singleton" } = {},
    //         setup,
    //         previousOnchainScript
    //     } = setupDetails;
    //     const { config,
    //         // programBundle
    //     } = deployedDetails || {};

    //     if (previousOnchainScript) {
    //         this.previousOnchainScript = previousOnchainScript;
    //         this.scriptHash = previousOnchainScript.uplcProgram.hash();
    //             // "string" === typeof deployedDetails?.scriptHash
    //             //     ? hexToBytes(deployedDetails.scriptHash)
    //             //     : deployedDetails?.scriptHash;
    //         return;
    //     }

    //     if (this.scriptParamsSource === "config") {
    //         debugger;
    //         // WHERE TO GET THE PROGRAM BUNDLE IN THIS CASE??
    //         //   IS IT MAYBE ALREADY COMPILED?
    //         if (false) { //programBundle) {
    //         //     if (!scriptHash)
    //         //         throw new Error(
    //         //     `${this.constructor.name}: missing deployedDetails.scriptHash`
    //         // );

    //             // debugger; // do we need to cross-check config <=> params ?
    //             this.configuredParams = config;
    //             this.configuredUplcParams = this.paramsToUplc(config);
    //             // change to preCompiledRawProgram,
    //             // and use async getPreCompiledProgram(variant)
    //             //    to get either this raw program or async-imported program data
    //             this.precompiledScriptDetails = {
    //                 singleton: {
    //                     // programBundle,
    //                 config
    //             },
    //             };
    //             // this.precompiledBundle = programBundle;
    //         } else if (params) {
    //             if (this.precompiledScriptDetails) {
    //                 // change to async getPreCompiledProgram(variant)
    //                 const thisVariant = this.precompiledScriptDetails[variant];
    //                 if (!thisVariant) {
    //                     const msg = `${this.constructor.name}: no precompiled variant '${variant}'`;
    //                     console.warn(
    //                         `${msg}\n  -- available variants: ${Object.keys(
    //                             this.precompiledScriptDetails
    //                         ).join(", ")}`
    //                     );
    //                     console.log(
    //                         "configured variant should be in scriptBundle's 'params'"
    //                     );
    //                     throw new Error(msg);
    //                 }
    //                 this._selectedVariant = variant;
    //                 debugger
    //                 const preConfig = thisVariant.config;
    //                 preConfig.rev = BigInt(preConfig.rev);

    //                 if (preConfig.capoMph?.bytes) {
    //                     preConfig.capoMph = makeMintingPolicyHash(
    //                         preConfig.capoMph.bytes
    //                     );
    //                 }
    //                 const uplcPreConfig = this.paramsToUplc(preConfig);
    //                 // omits delegateName from the strict checks
    //                 //  ... it's provided by the bundle, which the
    //                 //  ... off-chain wrapper class may not have access to.
    //                 const {
    //                     params: { delegateName, ...params },
    //                 } = setupDetails;
    //                 this.isConcrete = true;
    //                 const uplcRuntimeConfig = this.paramsToUplc(params);
    //                 let didFindProblem: string = "";
    //                 for (const k of Object.keys(uplcPreConfig)) {
    //                     const runtime = uplcRuntimeConfig[k];
    //                     // skips past any runtime setting that was not explicitly set
    //                     if (!runtime) continue;
    //                     const pre = uplcPreConfig[k];
    //                     if (!runtime.isEqual(pre)) {
    //                         if (!didFindProblem) {
    //                             console.warn(
    //                                 `${this.constructor.name}: config mismatch between pre-config and runtime-config`
    //                             );
    //                             didFindProblem = k;
    //                         }
    //                         console.warn(
    //                             `• ${k}:  pre-config: `,
    //                             preConfig[k] || (pre.rawData ?? pre),
    //                             ` at runtime:`,
    //                             params[k] || (runtime.rawData ?? runtime)
    //                         );
    //                     }
    //                 }
    //                 if (didFindProblem) {
    //                     throw new Error(
    //                         `runtime-config conflicted with pre-config (see logged details) at key ${didFindProblem}`
    //                     );
    //                 }
    //             }
    //             // moved to init
    //             // this.configuredParams = setupDetails.params;
    //             this.configuredUplcParams = this.paramsToUplc(
    //                 setupDetails.params
    //             );
    //         } else if (!setup.isPlaceholder) {
    //             debugger
    //             throw new Error(
    //                 `${this.constructor.name}: scriptParamsSource=config, but no program bundle, no script params`
    //             );
    //         }
    //     } else if (this.scriptParamsSource == "mixed") {
    //         debugger;
    //         const {params} = setupDetails

    //         if (this.configuredParams) {
    //             debugger;
    //             throw new Error(
    //                 `unreachable: configuredParameters used without deployedDetails? (dbpa)`
    //             );
    //         }
    //     } else if (this.scriptParamsSource == "bundle") {
    //         // the bundle has its own built-in params

    //         // temp singleton
    //         const selectedVariant = "singleton";
    //         this.configuredParams =
    //             this.getPreconfiguredVariantParams(selectedVariant);
    //         if (this.configuredParams) {
    //             this.configuredUplcParams =
    //                 this.getPreconfiguredUplcParams(selectedVariant);
    //         }
    //     } else {
    //         throw new Error(`unknown scriptParamsSource: ${this.scriptParamsSource}`);
    //     }
    // }

    get isPrecompiled() {
        // return !!this.preCompiledScriptDetails
        if (this.scriptParamsSource == "bundle") {
            return true;
        }
        if (!!this.configuredScriptDetails) {
            debugger;
            // ^^  inspect this situation to verify   vvvv
            if (this.setupDetails.specialOriginatorLabel) {
                // it's normal for the rollup bundler to get here
                return false
            }
            console.warn(
                `scriptParamsSource is not 'bundle'; isPrecompiled() returns false for originator '${this.setupDetails.specialOriginatorLabel || "‹unknown›"}'`
            );
            throw new Error(`check isPrecompiled() logic here`);
            return false;
        }
        return false;
        // return !! this.configuredScriptDetails
    }

    // !!! deprecate or change to async? (-> loadPrecompiledVariant() -> programFromCacheEntry())
    getPreCompiledBundle(variant: string) {
        throw new Error("deprecated");

        // const foundVariant = this.preCompiledScriptDetails?.[variant];
        // if (!foundVariant) {
        //     throw new Error(
        //         `${this.constructor.name}: variant ${variant} not found in preCompiledScriptDetails`
        //     );
        // }

        // return foundVariant.programBundle;
    }

    getPreconfiguredVariantParams(variantName: string) {
        const p = this.variants?.[variantName] || this.params;
        return p;
    }

    getPreconfiguredUplcParams(
        variantName: string
    ): UplcRecord<any> | undefined {
        // debugger
        const p = this.getPreconfiguredVariantParams(variantName);
        if (!p) return undefined;
        return this.paramsToUplc(p);
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
        return undefined as any;
    }
    /**
     * The known variants of this contract script, with any contract
     * parameters applicable to each variant.  By default, there is a
     * singleton variant that uses the result of `get params()`.
     */
    get variants(): { [variantName: string]: any } {
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
    implicitIncludedCapoModules(): string[] {
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
        const capoModules = this.capoBundle!.modules;
        if (!capoModules) {
            throw new Error(
                `${
                    this.capoBundle!.constructor.name
                }: no modules() list defined`
            );
        }
        const capoIncludedModules = capoModules.filter((x) => {
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
    get optimize(): HeliosOptimizeOptions | boolean | undefined {
        return this.setup!.optimize ?? true;
    }

    get moduleName() {
        return this.constructor.name
            .replace(/Bundle/, "")
            .replace(/Helios/, "");
        defaultNoDefinedModuleName; // overridden in subclasses where relevant
    }

    /**
     * Sets the currently-selected variant for this bundle, asserting its presence
     * in the `variants()` list.
     */
    withVariant(vn: string) {
        if (!this.variants) {
            throw new Error(
                `variants not defined for ${this.constructor.name}`
            );
        }
        const foundVariant =
            this.variants[vn] ?? this.precompiledScriptDetails?.[vn];
        if (!foundVariant) {
            throw new Error(
                `${this.constructor.name}: variant ${vn} not found in variants()`
            );
        }
        if (this._selectedVariant) {
            throw new Error(
                `we aren't sharing variants on a single bundle instance, right?`
            );
        }

        this._selectedVariant = vn;
        return this;
    }

    previousCompiledScript() {
        const { uplcProgram, validatorHash } = this.previousOnchainScript || {};
        if (!uplcProgram) return undefined;
        if (!validatorHash) return undefined;

        const actualHash = uplcProgram.hash();
        if (!equalsBytes(validatorHash, actualHash)) {
            throw new Error(
                `script hash mismatch: ${bytesToHex(
                    validatorHash
                )} != ${bytesToHex(actualHash)}`
            );
        }

        return uplcProgram;
    }
    async loadPrecompiledVariant(
        variant: string
    ): Promise<PrecompiledProgramJSON> {
        debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
        throw new Error(
            `${this.constructor.name}: Dysfunctional bundler bypass (loadPrecompiledVariant() not found) (dbpa)`
        );
    }

    /**
     * resolves the compiled script for this class with its provided
     * configuration details
     * @remarks
     * The configuration details & pre-compiled script may be injected by
     * the HeliosRollupBundler or by compiling the script with provided
     * params (in tests or during a first deployment of a Capo)
     *
     * When the asyncOk flag is not present, returns or fails synchronously.
     * With the asyncOk flag, returns synchronously if the script is already
     * compiled, or returns a Promise that resolves to the compiled script.
     */
    compiledScript(): anyUplcProgram;
    compiledScript(asyncOk: true): anyUplcProgram | Promise<anyUplcProgram>;
    compiledScript(asyncOk?: true): anyUplcProgram | Promise<anyUplcProgram> {
        const {
            setup,
            previousOnchainScript,
            _program: loadedProgram,
        } = this;

        if (this.alreadyCompiledScript) {
            return this.alreadyCompiledScript;
        }

        let program = loadedProgram!;
        if (!asyncOk) {
            throw new Error(
                `compiledScript() must be called with asyncOk=true when the script is not already loaded`
            );
        }

        if (this.isPrecompiled) {
            // debugger;
            const { singleton } = this.precompiledScriptDetails!;
            if (singleton && !this._selectedVariant) {
                this.withVariant("singleton");
            }
            const detailsForVariant =
                this.precompiledScriptDetails?.[this._selectedVariant!];
            return this.loadPrecompiledVariant(this._selectedVariant!).then(
                (programForVariant: PrecompiledProgramJSON) => {
                    if (!detailsForVariant || !programForVariant) {
                        throw new Error(
                            `${this.constructor.name}: variant ${this._selectedVariant} not found in preCompiled`
                        );
                    }
                    const bundleForVariant = {
                        ...detailsForVariant,
                        programBundle: programForVariant,
                    };
                    const p = (this.alreadyCompiledScript =
                        programFromCacheEntry(bundleForVariant.programBundle));
                    return p;
                }
            );
        }

        if (!this.configuredParams || !setup) {
            debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
            // theoretically only here for type-narrowing
            throw new Error(
                `${this.constructor.name}: missing required params or setup for compiledScript() (debugging breakpoint available)`
            );
        }
        program = this.loadProgram();
        const params = this.configuredUplcParams;

        // debugger
        const maybeOptimizing = this.optimize ? "and optimizing " : "";
        console.warn(
            `${this.constructor.name}: compiling ${maybeOptimizing}helios script.  This could take 30s or more... `
        );

        // falls back to actually compiling the program.
        // on server side, this comes with caching for performance.
        // on the browser, there's not (currently) a cache.  It's intended
        // that the preCompiledScriptDetails will usually be available, so
        // the cases where this is needed on the browser
        // side should be rare (from .hlb's params() or variants())
        // or only used in special cases of capo deployment (with its configuredScriptDetails)
        const t = new Date().getTime();
        const rawValues: Record<string, any> = {};
        if (params) {
            for (const [p, v] of Object.entries(params)) {
                program.changeParam(p, v);
                rawValues[p] = v.rawData;
            }
        }

        const net = this.isMainnet ? "mainnet" : "testnet";
        console.log(
            `(${net}) ${this.moduleName} with params:\n`,
            Object.fromEntries(
                Object.entries(program.entryPoint.paramsDetails()).map(
                    ([k, uplcVal]) => {
                        return [k, [uplcVal, rawValues[k]?.toString()].flat()];
                    }
                )
            )
        );
        console.log(new Error(`(special originator ${this.setupDetails.specialOriginatorLabel || "‹unknown›"} where?)`).stack)

        return program
            .compileWithCache({
                optimize: this.optimize,
            })
            .then((uplcProgram) => {
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
                this.alreadyCompiledScript = uplcProgram;
                const scriptHash = bytesToHex(uplcProgram.hash());
                console.log(
                    program.compileTime ||
                        `compiled: ${new Date().getTime() - t}ms`,
                    `-> ${scriptHash}`
                );
                // if (globalThis.document) {
                //     console.log({
                //         uplcProgram,
                //         cbor: bytesToHex(uplcProgram.toCbor()),
                //     });
                // }
                return uplcProgram;
            });
    }

    // !!! deprecate or change to async? (-> loadPrecompiledVariant() -> programFromCacheEntry())
    get preBundledScript() {
        throw new Error("deprecated");
        // if (!this.isPrecompiled) return undefined;
        // const { singleton } = this.preCompiledScriptDetails!;
        // if (singleton && !this._selectedVariant) {
        //     this.withVariant("singleton");
        // }
        // const bundleForVariant = this.preCompiledScriptDetails?.[this._selectedVariant!];
        // if (!bundleForVariant) {
        //     throw new Error(
        //         `${this.constructor.name}: variant ${this._selectedVariant} not found in preCompiled`
        //     );
        // }
        // return programFromCacheEntry(bundleForVariant.programBundle);
    }

    async getSerializedProgramBundle() {
        const compiledScript = await this.compiledScript(true);
        const cacheEntry = this.program.cacheEntry;
        if (!cacheEntry) throw new Error(`missing cacheEntry`);
        const serializedCacheEntry = serializeCacheEntry(cacheEntry);
        const {
            programElements,
            version,
            optimizeOptions,
            optimized,
            unoptimized,
            optimizedIR,
            unoptimizedIR,
            optimizedSmap,
            unoptimizedSmap,
        } = serializedCacheEntry;
        return {
            scriptHash: bytesToHex(compiledScript.hash()),
            programBundle: {
                programElements,
                version,
                optimized,
                unoptimized,
                optimizedIR,
                unoptimizedIR,
                optimizedSmap,
                unoptimizedSmap,
            },
        };
    }

    decodeAnyPlutusUplcProgram(
        version: "PlutusV2" | "PlutusV3",
        cborHex: string,
        ir?: string,
        sourceMap?: UplcSourceMapJsonSafe,
        alt?: anyUplcProgram
    ) {
        if (version === "PlutusV2") {
            if (alt && alt.plutusVersion != "PlutusScriptV2") {
                throw new Error(
                    `expected alt script to have matching Plutus V2, not ${alt.plutusVersion}`
                );
            }
            return decodeUplcProgramV2FromCbor(cborHex, {
                ir: ir,
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

    get program(): HeliosProgramWithCacheAPI {
        if (!this._program) {
            debugger;
            throw new Error(
                "call loadProgram() (a one-time expense) before accessing this.program (dbpa)"
            );
        }
        return this._program!;
    }

    loadProgram() {
        if (this._program) {
            // bust through pre-cached version if the
            // fundamental settings are changed
            if (
                this.isPrecompiled != this._progIsPrecompiled ||
                this.setup?.isMainnet !== this.isMainnet
            ) {
                throw new Error("unused code path? program cache busting");
                console.warn("busting program cache");
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
            console.warn(`${this.constructor.name}: loading program`);
            // console.log(`HERE ${this.___id}: ${new Error("(where?)").stack}`)
            const p = new HeliosProgramWithCacheAPI(this.main, {
                isTestnet,
                moduleSources,
                name: mName, // it will fall back to the program name if this is empty
            });
            this._program = p;
            this.initProgramDetails();
            this._progIsPrecompiled = this.isPrecompiled;

            // Hi!  Are you investigating a duplicate load of the same module?
            //  🔥🔥🔥  thanks! you're saving people 100ms at a time!
            console.log(
                `📦 ${mName}: loaded & parsed ${
                    this.isPrecompiled
                        ? "w/ pre-compiled program"
                        : "for type-gen"
                }: ${Date.now() - ts1}ms`
                // new Error(`stack`).stack
            );
            return p;
        } catch (e: any) {
            // !!! probably this stuff needs to move to compileWithScriptParams()
            if (e.message.match(/invalid parameter name/)) {
                debugger;
                throw new Error(
                    e.message +
                        `\n   ... this typically occurs when your StellarContract class (${this.constructor.name})` +
                        "\n   ... can be missing a getContractScriptParams() method " +
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
                    `unexpected error while compiling helios program (or its imported module): ${
                        mName || this.main.name
                    }\n` +
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
            //eslint-disable-next-line no-debugger
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
            //eslint-disable-next-line no-debugger
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

    /**
     * @internal
     */
    locateDatumType(): DataType | undefined {
        let datumType: DataType | undefined;
        // let datumTypeName: string | undefined;

        const program = this.loadProgram();
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

    /**
     * @internal
     */
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

    get includeEnums(): string[] {
        return [];
    }

    /**
     * @internal
     */
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
            const s = (type as DataType).toSchema();
            if (s.kind == "struct") {
                types[typeName] = type as DataType;
            }
            if (s.kind == "enum" && this.includeEnums.includes(typeName)) {
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
                const s = (type as DataType).toSchema();
                if (s.kind == "struct") {
                    types[typeName] = type as DataType;
                }
                if (s.kind == "enum" && this.includeEnums.includes(typeName)) {
                    types[typeName] = type as DataType;
                }
            }
        }

        return types;
    }

    /**
     * @internal
     */
    paramsToUplc<ConfigType extends configBaseWithRev>(
        params: Record<string, any>
    ): UplcRecord<ConfigType> {
        const namespace = this.program.name;
        const { paramTypes } = this.program;

        return Object.fromEntries(
            Object.entries(params)
                .map<[string, UplcData]>(([paramName, data]) => {
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
                            return undefined as any;
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

    /**
     * @internal
     */
    typeToUplc(type: DataType, data: any, path: string = ""): UplcData {
        const schema = type.toSchema();
        if (!this.setup) {
            debugger;
        }
        const isMainnet = this.setup!.isMainnet;
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
