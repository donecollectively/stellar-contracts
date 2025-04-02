import type { DataType, Program } from "@helios-lang/compiler";
import type { Source } from "@helios-lang/compiler-utils";
import {
    makeUplcProgramV2,
    type UplcData,
    type UplcProgramV2,
    type UplcProgramV3,
    type UplcSourceMapJsonSafe,
} from "@helios-lang/uplc";
import { decodeUplcProgramV2FromCbor } from "@helios-lang/uplc";
// import { decodeUplcProgramV3FromCbor } from "@helios-lang/uplc";

import { HeliosProgramWithCacheAPI } from "@donecollectively/stellar-contracts/HeliosProgramWithCacheAPI";

import type { CapoHeliosBundle } from "./CapoHeliosBundle.js";
import type {
    configBaseWithRev,
    SetupInfo,
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
    type DeployedProgramBundle,
} from "../CachedHeliosProgram.js";
import type {
    DeployedScriptDetails,
    RequiredDeployedScriptDetails,
} from "../../configuration/DeployedScriptConfigs.js";
import { bytesToHex, equalsBytes, hexToBytes } from "@helios-lang/codec-utils";
import { makeCast } from "@helios-lang/contract-utils";
import { uplcDataSerializer } from "../../delegation/jsonSerializers.js";
import {
    makeMintingPolicyHash,
    makeValidatorHash,
    type ValidatorHash,
} from "@helios-lang/ledger";
import { environment } from "../../environment.js";

/**
 * @internal
 */
export const defaultNoDefinedModuleName = "‹default-needs-override›";

/**
 * @public
 */
export const placeholderSetupDetails = {
    setup: {
        isMainnet: "mainnet" === environment.CARDANO_NETWORK,
        isPlaceholder: "for abstract bundleClass",
    },
};

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

            isConcrete = true;
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
    abstract scriptParamsSource: "config" | "bundle" | "mixed";
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
    redeemerTypeName: string = "";
    isMainnet: boolean;
    _program: HeliosProgramWithCacheAPI | undefined = undefined;
    previousOnchainScript: {
        validatorHash: number[];
        uplcProgram: anyUplcProgram;
    } | undefined = undefined;
    _progIsPrecompiled = false;
    setup: SetupOrMainnetSignalForBundle;
    configuredUplcParams: UplcRecord<any> | undefined = undefined;
    configuredParams: any | undefined = undefined;
    preCompiled?: {
        [variant: string]: RequiredDeployedScriptDetails<any, "json">;
    };
    alreadyCompiledScript: anyUplcProgram | undefined;

    constructor(
        setupDetails: StellarBundleSetupDetails<any> = placeholderSetupDetails
    ) {
        // this.devReloadModules()
        // if (setupDetails) debugger;
        this.setup = setupDetails.setup;
        this.isMainnet = this.setup.isMainnet;

        if (this.setup && "undefined" === typeof this.isMainnet) {
            debugger;
            throw new Error(
                `${this.constructor.name}: setup.isMainnet must be defined (debugging breakpoint available)`
            );
        }
    }

    get hasAnyVariant() {
        return true;
    }
    _didInit = false;
    debug = false;
    scriptHash?: number[] | undefined;

    init(setupDetails: StellarBundleSetupDetails<any>) {
        const {
            deployedDetails,
            params,
            params: { delegateName, variant = "singleton" } = {},
            setup,
            previousOnchainScript
        } = setupDetails;
        const { config, programBundle } = deployedDetails || {};
        if (previousOnchainScript) {
            this.previousOnchainScript = previousOnchainScript;
            this.scriptHash = previousOnchainScript.uplcProgram.hash();
                // "string" === typeof deployedDetails?.scriptHash
                //     ? hexToBytes(deployedDetails.scriptHash)
                //     : deployedDetails?.scriptHash;
            return;
        }

        if (this.scriptParamsSource === "config") {
            if (programBundle) {
            //     if (!scriptHash)
            //         throw new Error(
            //     `${this.constructor.name}: missing deployedDetails.scriptHash`
            // );
            
                // debugger; // do we need to cross-check config <=> params ?
                this.configuredParams = config;
                this.configuredUplcParams = this.paramsToUplc(config);
                this.preCompiled = {
                    singleton: {programBundle, config },
                };
            } else if (params) {
                if (this.preCompiled) {
                    const thisVariant = this.preCompiled[variant];
                    if (!thisVariant) {
                        const msg = `${this.constructor.name}: no precompiled variant '${variant}'`;
                        console.warn(
                            `${msg}\n  -- available variants: ${Object.keys(
                                this.preCompiled
                            ).join(", ")}`
                        );
                        console.log(
                            "configured variant should be in scriptBundle's 'params'"
                        );
                        throw new Error(msg);
                    }
                    this._selectedVariant = variant;
                    const preConfig = thisVariant.config;
                    preConfig.rev = BigInt(preConfig.rev);

                    if (preConfig.capoMph?.bytes) {
                        preConfig.capoMph = makeMintingPolicyHash(
                            preConfig.capoMph.bytes
                        );
                    }
                    const uplcPreConfig = this.paramsToUplc(preConfig);
                    // omits delegateName from the strict checks
                    //  ... it's provided by the bundle, which the
                    //  ... off-chain wrapper class may not have access to.
                    const {
                        params: { delegateName, ...params },
                    } = setupDetails;
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
                                preConfig[k] || (pre.rawData ?? pre),
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
                }
                this.configuredParams = setupDetails.params;
                this.configuredUplcParams = this.paramsToUplc(
                    setupDetails.params
                );
            } else if (!setup.isPlaceholder) {
                throw new Error(
                    `${this.constructor.name}: scriptParamsSource=config, but no program bundle, no script params`
                );
            }
        } else if (this.scriptParamsSource == "mixed") {
            debugger;
            const {params} = setupDetails
            
            if (this.configuredParams) {
                debugger;
                throw new Error(
                    `unreachable: configuredParameters used without deployedDetails? (dbpa)`
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
        } else {
            throw new Error(`unknown scriptParamsSource: ${this.scriptParamsSource}`);
        }
        this._didInit = true;
    }

    get isPrecompiled() {
        return !!this.preCompiled
    }

    getPreCompiledBundle(variant: string) {
        const foundVariant = this.preCompiled?.[variant];
        if (!foundVariant) {
            throw new Error(
                `${this.constructor.name}: variant ${variant} not found in preCompiled scripts`
            );
        }

        return foundVariant.programBundle;
    }

    getPreconfiguredVariantParams(variantName: string) {
        const p = this.variants?.[variantName] || this.params;
        return p;
    }

    getPreconfiguredUplcParams(
        variantName: string
    ): UplcRecord<any> | undefined {
        const p = this.getPreconfiguredVariantParams(variantName);
        if (!p) return undefined;
        return this.paramsToUplc(p);
    }

    withSetupDetails(details: StellarBundleSetupDetails<any>): this {
        if (details.setup.isPlaceholder) {
            debugger;
            throw new Error(
                `unexpected use of placeholder setup for helios script bundle (debugging breakpoint available)`
            );
        }
        //@ts-expect-error with dynamic creation
        const created = new this.constructor(details) as this;
        created.init(details);
        return created;
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

    _selectedVariant?: string;
    withVariant(vn: string) {
        if (!this.variants) {
            throw new Error(
                `variants not defined for ${this.constructor.name}`
            );
        }
        const foundVariant = this.variants[vn] ?? this.preCompiled?.[vn];
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
            configuredUplcParams: params,
            setup,
            previousOnchainScript,
            program,
        } = this;

        debugger
        if (previousOnchainScript) {
            const { validatorHash, uplcProgram } = previousOnchainScript;
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

        if (this.alreadyCompiledScript) {
            return this.alreadyCompiledScript;
        }

        if (this.isPrecompiled) {
            const { singleton } = this.preCompiled!;
            if (singleton && !this._selectedVariant) {
                this.withVariant("singleton");
            }
            const bundleForVariant = this.preCompiled?.[this._selectedVariant!];
            if (!bundleForVariant) {
                throw new Error(
                    `${this.constructor.name}: variant ${this._selectedVariant} not found in preCompiled`
                );
            }
            if (bundleForVariant) {
                const p = (this.alreadyCompiledScript = programFromCacheEntry(
                    bundleForVariant.programBundle
                ));
                return p;
            }
        } else {
            if (!params || !setup) {
                debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
                // theoretically only here for type-narrowing
                throw new Error(
                    `${this.constructor.name}: missing required params or setup for compiledScript() (debugging breakpoint available)`
                );
            }

        }
        console.warn(
            `${this.constructor.name}: compiling helios script.  This could take 30s or more... `
        );

        // falls back to actually compiling the program.
        // on server side, this comes with caching for performance.
        // on the browser, there's not (currently) a cache.  It's intended
        // that the preCompiled= settings
        // will usually be available, so the cases where this is needed on the browser
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
                    `compiled in ${new Date().getTime() - t}ms -> ${scriptHash}`
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

    get preBundledScript() {
        if (!this.isPrecompiled) return undefined;
        const { singleton } = this.preCompiled!;
        if (singleton && !this._selectedVariant) {
            this.withVariant("singleton");
        }
        const bundleForVariant = this.preCompiled?.[this._selectedVariant!];
        if (!bundleForVariant) {
            throw new Error(
                `${this.constructor.name}: variant ${this._selectedVariant} not found in preCompiled`
            );
        }
        return programFromCacheEntry(bundleForVariant.programBundle);
    }

    async getSerializedProgramBundle() {
        const compiledScript = await this.compiledScript();
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

    // _pct: number = 0
    get program(): HeliosProgramWithCacheAPI {
        if (this._program) {
            // bust through pre-cached version if the
            // fundmental settings are changed
            if (
                this.isPrecompiled != this._progIsPrecompiled ||
                this.setup?.isMainnet !== this.isMainnet
            ) {
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
            const p = new HeliosProgramWithCacheAPI(this.main, {
                isTestnet,
                moduleSources,
                name: mName, // it will fall back to the program name if this is empty
            });
            this._program = p;
            this._progIsPrecompiled = this.isPrecompiled;

            // Hi!  Are you investigating a duplicate load of the same module?
            //  🔥🔥🔥  thanks! you're saving people 100ms at a time!
            console.log(
                `📦 ${mName}: loaded & parsed ${
                    this.isPrecompiled ? "with" : "without"
                } pre-compiled program: ${Date.now() - ts1}ms`
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

    paramsToUplc<ConfigType extends configBaseWithRev>(
        params: Record<string, any>
    ): UplcRecord<ConfigType> {
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
