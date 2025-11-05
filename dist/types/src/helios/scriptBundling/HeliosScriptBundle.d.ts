import type { DataType } from "@helios-lang/compiler";
import type { Source } from "@helios-lang/compiler-utils";
import { type UplcData, type UplcProgramV2, type UplcSourceMapJsonSafe } from "@helios-lang/uplc";
import { HeliosProgramWithCacheAPI } from "@donecollectively/stellar-contracts/HeliosProgramWithCacheAPI";
import type { CapoHeliosBundle } from "./CapoHeliosBundle.js";
import type { configBaseWithRev, HeliosOptimizeOptions, SetupOrMainnetSignalForBundle, StellarBundleSetupDetails, UplcRecord } from "../../StellarContract.js";
import type { anyUplcProgram } from "../../HeliosPromotedTypes.js";
import type { CapoBundleClass, HeliosBundleClassWithCapo, HeliosBundleTypes } from "../HeliosMetaTypes.js";
import { type PrecompiledProgramJSON } from "../CachedHeliosProgram.js";
import type { DeployedScriptDetails } from "../../configuration/DeployedScriptConfigs.js";
/**
 * @internal
 */
export declare const defaultNoDefinedModuleName = "\u2039default-needs-override\u203A";
/**
 * @public
 */
export declare const placeholderSetupDetails: StellarBundleSetupDetails<any>;
/**
 * Base class for any Helios script bundle
 * @remarks
 * See also {@link CapoHeliosBundle} and {@link CapoDelegateBundle}
 * and {@link DelegatedDataBundle} for specialized bundle types
 * @public
 */
export declare abstract class HeliosScriptBundle {
    /**
     * an indicator of a Helios bundle that is intended to be used as a Capo contract
     * @remarks
     * the CapoHeliosBundle class overrides this to true.
     * @internal
     */
    static isCapoBundle: boolean;
    abstract requiresGovAuthority: boolean;
    /**
     * set to true if the bundle depends on having a deployed capo's configuration details
     * @public
     */
    static needsCapoConfiguration: boolean;
    /**
     * the current revision of the bundle
     * @remarks
     * Allows forced incrementing of the on-chain policy script.  This supports test scenarios,
     * and allows the the bundle script to be swapped out even when nothing else is changed
     * (we don't have specific cases for this, but it's better to have and not need it, than to need
     * it and not have it)
     * @public
     */
    static currentRev: bigint;
    get rev(): bigint;
    /**
     * an opt-in indicator of abstractness
     * @remarks
     * Subclasses that aren't intended for instantiation can set this to true.
     *
     * Subclasses that don't set this will not be treated as abstract.
     * @public
     */
    static isAbstract?: boolean | undefined;
    /**
     * Constructs a base class for any Helios script bundle,
     * given the class for an application-specific CapoHeliosBundle.
     * @remarks
     * The resulting class provides its own CapoHeliosBundle instance
     * for independent use (specifically, for compiling this bundle using
     * the dependency libraries provided by the Capo bundle).
     */
    static usingCapoBundleClass<CB extends CapoBundleClass>(c: CB, generic?: "generic" | false): HeliosBundleClassWithCapo;
    static create<THIS extends typeof HeliosScriptBundle>(this: THIS, setupDetails?: StellarBundleSetupDetails<any>): any;
    abstract scriptParamsSource: "config" | "bundle" | "none";
    capoBundle?: CapoHeliosBundle;
    isConcrete: boolean;
    configuredScriptDetails?: DeployedScriptDetails;
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
    redeemerTypeName: string;
    isMainnet: boolean;
    _program: HeliosProgramWithCacheAPI | undefined;
    previousOnchainScript: {
        validatorHash: number[];
        uplcProgram: anyUplcProgram;
    } | undefined;
    _progIsPrecompiled: boolean;
    setup: SetupOrMainnetSignalForBundle;
    setupDetails: StellarBundleSetupDetails<any>;
    ___id: number;
    _didInit: boolean;
    _selectedVariant?: string;
    debug: boolean;
    configuredUplcParams: UplcRecord<any> | undefined;
    configuredParams: any | undefined;
    precompiledScriptDetails?: {
        [variant: string]: DeployedScriptDetails<any, "native">;
    };
    alreadyCompiledScript: anyUplcProgram | undefined;
    constructor(setupDetails?: StellarBundleSetupDetails<any>);
    get hasAnyVariant(): boolean;
    init(setupDetails: StellarBundleSetupDetails<any>): void;
    get scriptHash(): number[];
    /**
     * deferred initialization of program details, preventing the need to
     * load the program prior to it actually being needed
     */
    initProgramDetails(): void;
    get isPrecompiled(): boolean;
    getPreCompiledBundle(variant: string): void;
    getPreconfiguredVariantParams(variantName: string): any;
    getPreconfiguredUplcParams(variantName: string): UplcRecord<any> | undefined;
    get params(): any;
    /**
     * The known variants of this contract script, with any contract
     * parameters applicable to each variant.  By default, there is a
     * singleton variant that uses the result of `get params()`.
     */
    get variants(): {
        [variantName: string]: any;
    };
    get main(): Source;
    /**
     * A list of modules always available for import to Capo-hosted policy scripts
     * @public
     */
    implicitIncludedCapoModules(): string[];
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
    includeFromCapoModules(): string[];
    /**
     * Computes a list of modules to be provided to the Helios compiler
     * @remarks
     * includes any explicit `modules` from your script bundle, along with any
     * modules, provided by your Capo and listed by name in your
     * `includeFromCapoModules()` method.
     * @public
     */
    getEffectiveModuleList(): Source[];
    resolveCapoIncludedModules(): Source[];
    logModuleDetails(): void;
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
    get modules(): Source[];
    get displayName(): string;
    get bridgeClassName(): string;
    /**
     * indicates whether the script should be optimized.
     * @remarks
     * Defaults to the general optimize setting provided by the factoryArgs.
     * Override to force optimization on or off.
     */
    get optimize(): HeliosOptimizeOptions | boolean | undefined;
    get moduleName(): string;
    /**
     * Sets the currently-selected variant for this bundle, asserting its presence
     * in the `variants()` list.
     */
    withVariant(vn: string): this;
    previousCompiledScript(): UplcProgramV2 | undefined;
    loadPrecompiledVariant(variant: string): Promise<PrecompiledProgramJSON>;
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
    get preBundledScript(): void;
    getSerializedProgramBundle(): Promise<{
        scriptHash: string;
        programBundle: {
            programElements: Record<string, string | Object>;
            version: "PlutusV2" | "PlutusV3";
            optimized: string | undefined;
            unoptimized: string | undefined;
            optimizedIR: string | undefined;
            unoptimizedIR: string | undefined;
            optimizedSmap: UplcSourceMapJsonSafe | undefined;
            unoptimizedSmap: UplcSourceMapJsonSafe | undefined;
        };
    }>;
    decodeAnyPlutusUplcProgram(version: "PlutusV2" | "PlutusV3", cborHex: string, ir?: string, sourceMap?: UplcSourceMapJsonSafe, alt?: anyUplcProgram): UplcProgramV2;
    /**
     * provides a temporary indicator of mainnet-ness, while not
     * requiring the question to be permanently resolved.
     */
    isDefinitelyMainnet(): boolean;
    get program(): HeliosProgramWithCacheAPI;
    loadProgram(): HeliosProgramWithCacheAPI;
    isHeliosScriptBundle(): boolean;
    addTypeProxies(): void;
    effectiveDatumTypeName(): string;
    /**
     * @internal
     */
    locateDatumType(): DataType | undefined;
    /**
     * @internal
     */
    locateRedeemerType(): DataType;
    get includeEnums(): string[];
    /**
     * @internal
     */
    getTopLevelTypes(): HeliosBundleTypes;
    /**
     * @internal
     */
    paramsToUplc<ConfigType extends configBaseWithRev>(params: Record<string, any>): UplcRecord<ConfigType>;
    /**
     * @internal
     */
    typeToUplc(type: DataType, data: any, path?: string): UplcData;
}
//# sourceMappingURL=HeliosScriptBundle.d.ts.map