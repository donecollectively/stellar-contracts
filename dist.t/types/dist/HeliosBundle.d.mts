export class HeliosScriptBundle {
    /**
     * an indicator of a Helios bundle that is intended to be used as a Capo contract
     * @remarks
     * the CapoHeliosBundle class overrides this to true.
     * @internal
     */
    static isCapoBundle: boolean;
    /**
     * set to true if the bundle depends on having a deployed capo's configuration details
     * @public
     */
    public static needsCapoConfiguration: boolean;
    /**
     * the current revision of the bundle
     * @remarks
     * Allows forced incrementing of the on-chain policy script.  This supports test scenarios,
     * and allows the the bundle script to be swapped out even when nothing else is changed
     * (we don't have specific cases for this, but it's better to have and not need it, than to need
     * it and not have it)
     * @public
     */
    public static currentRev: bigint;
    /**
     * an opt-in indicator of abstractness
     * @remarks
     * Subclasses that aren't intended for instantiation can set this to true.
     *
     * Subclasses that don't set this will not be treated as abstract.
     * @public
     */
    public static isAbstract: undefined;
    /**
     * Constructs a base class for any Helios script bundle,
     * given the class for an application-specific CapoHeliosBundle.
     * @remarks
     * The resulting class provides its own CapoHeliosBundle instance
     * for independent use (specifically, for compiling this bundle using
     * the dependency libraries provided by the Capo bundle).
     */
    static usingCapoBundleClass(c: any, generic?: boolean): {
        new (setupDetails?: {
            specialOriginatorLabel: string;
            setup: {
                isMainnet: boolean;
            };
        }): {
            capoBundle: any;
            isConcrete: boolean;
            readonly rev: any;
            configuredScriptDetails: undefined;
            /**
             * optional attribute explicitly naming a type for the datum
             * @remarks
             * This can be used if needed for a contract whose entry point uses an abstract
             * type for the datum; the type-bridge & type-gen system will use this data type
             * instead of inferring the type from the entry point.
             */
            datumTypeName: any;
            /**
             * optional attribute explicitly naming a type for the redeemer
             * @remarks
             * This can be used if needed for a contract whose entry point uses an abstract
             * type for the redeemer; the type-bridge & type-gen system will use this data type
             * instead of inferring the type from the entry point.
             */
            redeemerTypeName: string;
            isMainnet: boolean;
            _program: undefined;
            previousOnchainScript: undefined;
            _progIsPrecompiled: boolean;
            setup: {
                isMainnet: boolean;
            };
            setupDetails: {
                specialOriginatorLabel: string;
                setup: {
                    isMainnet: boolean;
                };
            };
            ___id: number;
            _didInit: boolean;
            _selectedVariant: any;
            debug: boolean;
            configuredUplcParams: undefined;
            configuredParams: undefined;
            precompiledScriptDetails: any;
            alreadyCompiledScript: any;
            get hasAnyVariant(): boolean;
            init(setupDetails: any): void;
            scriptParamsSource: any;
            readonly scriptHash: any;
            /**
             * deferred initialization of program details, preventing the need to
             * load the program prior to it actually being needed
             */
            initProgramDetails(): void;
            get isPrecompiled(): boolean;
            getPreCompiledBundle(variant: any): void;
            getPreconfiguredVariantParams(variantName: any): any;
            getPreconfiguredUplcParams(variantName: any): any;
            get params(): undefined;
            /**
             * The known variants of this contract script, with any contract
             * parameters applicable to each variant.  By default, there is a
             * singleton variant that uses the result of `get params()`.
             */
            get variants(): {
                singleton: undefined;
            };
            get main(): void;
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
            includeFromCapoModules(): never[];
            /**
             * Computes a list of modules to be provided to the Helios compiler
             * @remarks
             * includes any explicit `modules` from your script bundle, along with any
             * modules, provided by your Capo and listed by name in your
             * `includeFromCapoModules()` method.
             * @public
             */
            getEffectiveModuleList(): any[];
            resolveCapoIncludedModules(): any;
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
            get modules(): never[];
            readonly displayName: any;
            get bridgeClassName(): string;
            /**
             * indicates whether the script should be optimized.
             * @remarks
             * Defaults to the general optimize setting provided by the factoryArgs.
             * Override to force optimization on or off.
             */
            readonly optimize: any;
            get moduleName(): string;
            /**
             * Sets the currently-selected variant for this bundle, asserting its presence
             * in the `variants()` list.
             */
            withVariant(vn: any): /*elided*/ any;
            previousCompiledScript(): any;
            loadPrecompiledVariant(variant: any): Promise<void>;
            compiledScript(asyncOk: any): any;
            get preBundledScript(): void;
            getSerializedProgramBundle(): Promise<{
                scriptHash: string;
                programBundle: {
                    programElements: any;
                    version: any;
                    optimized: any;
                    unoptimized: any;
                    optimizedIR: any;
                    unoptimizedIR: any;
                    optimizedSmap: any;
                    unoptimizedSmap: any;
                };
            }>;
            decodeAnyPlutusUplcProgram(version: any, cborHex: any, ir: any, sourceMap: any, alt: any): import("@helios-lang/uplc").UplcProgramV2;
            /**
             * provides a temporary indicator of mainnet-ness, while not
             * requiring the question to be permanently resolved.
             */
            isDefinitelyMainnet(): boolean;
            get program(): never;
            loadProgram(): HeliosProgramWithCacheAPI;
            isHeliosScriptBundle(): boolean;
            addTypeProxies(): void;
            effectiveDatumTypeName(): any;
            /**
             * @internal
             */
            locateDatumType(): import("node_modules/@helios-lang/compiler/types/typecheck/common.js").DataType | undefined;
            /**
             * @internal
             */
            locateRedeemerType(): any;
            get includeEnums(): never[];
            /**
             * @internal
             */
            getTopLevelTypes(): {
                datum: import("node_modules/@helios-lang/compiler/types/typecheck/common.js").DataType | undefined;
                redeemer: any;
            };
            /**
             * @internal
             */
            paramsToUplc(params: any): any;
            /**
             * @internal
             */
            typeToUplc(type: any, data: any, path?: string): import("@helios-lang/uplc").UplcData;
        };
        /**
         * an indicator of a Helios bundle that is intended to be used as a Capo contract
         * @remarks
         * the CapoHeliosBundle class overrides this to true.
         * @internal
         */
        isCapoBundle: boolean;
        /**
         * set to true if the bundle depends on having a deployed capo's configuration details
         * @public
         */
        needsCapoConfiguration: boolean;
        /**
         * the current revision of the bundle
         * @remarks
         * Allows forced incrementing of the on-chain policy script.  This supports test scenarios,
         * and allows the the bundle script to be swapped out even when nothing else is changed
         * (we don't have specific cases for this, but it's better to have and not need it, than to need
         * it and not have it)
         * @public
         */
        currentRev: bigint;
        /**
         * an opt-in indicator of abstractness
         * @remarks
         * Subclasses that aren't intended for instantiation can set this to true.
         *
         * Subclasses that don't set this will not be treated as abstract.
         * @public
         */
        isAbstract: undefined;
        usingCapoBundleClass(c: any, generic?: boolean): /*elided*/ any;
        create(setupDetails?: {
            specialOriginatorLabel: string;
            setup: {
                isMainnet: boolean;
            };
        }): HeliosScriptBundle;
    };
    static create(setupDetails?: {
        specialOriginatorLabel: string;
        setup: {
            isMainnet: boolean;
        };
    }): HeliosScriptBundle;
    constructor(setupDetails?: {
        specialOriginatorLabel: string;
        setup: {
            isMainnet: boolean;
        };
    });
    get rev(): any;
    capoBundle: any;
    isConcrete: boolean;
    configuredScriptDetails: undefined;
    /**
     * optional attribute explicitly naming a type for the datum
     * @remarks
     * This can be used if needed for a contract whose entry point uses an abstract
     * type for the datum; the type-bridge & type-gen system will use this data type
     * instead of inferring the type from the entry point.
     */
    datumTypeName: any;
    /**
     * optional attribute explicitly naming a type for the redeemer
     * @remarks
     * This can be used if needed for a contract whose entry point uses an abstract
     * type for the redeemer; the type-bridge & type-gen system will use this data type
     * instead of inferring the type from the entry point.
     */
    redeemerTypeName: string;
    isMainnet: boolean;
    _program: undefined;
    previousOnchainScript: undefined;
    _progIsPrecompiled: boolean;
    setup: {
        isMainnet: boolean;
    };
    setupDetails: {
        specialOriginatorLabel: string;
        setup: {
            isMainnet: boolean;
        };
    };
    ___id: number;
    _didInit: boolean;
    _selectedVariant: any;
    debug: boolean;
    configuredUplcParams: undefined;
    configuredParams: undefined;
    precompiledScriptDetails: any;
    alreadyCompiledScript: any;
    get hasAnyVariant(): boolean;
    init(setupDetails: any): void;
    scriptParamsSource: any;
    get scriptHash(): any;
    /**
     * deferred initialization of program details, preventing the need to
     * load the program prior to it actually being needed
     */
    initProgramDetails(): void;
    get isPrecompiled(): boolean;
    getPreCompiledBundle(variant: any): void;
    getPreconfiguredVariantParams(variantName: any): any;
    getPreconfiguredUplcParams(variantName: any): any;
    get params(): undefined;
    /**
     * The known variants of this contract script, with any contract
     * parameters applicable to each variant.  By default, there is a
     * singleton variant that uses the result of `get params()`.
     */
    get variants(): {
        singleton: undefined;
    };
    get main(): void;
    /**
     * A list of modules always available for import to Capo-hosted policy scripts
     * @public
     */
    public implicitIncludedCapoModules(): string[];
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
    public includeFromCapoModules(): never[];
    /**
     * Computes a list of modules to be provided to the Helios compiler
     * @remarks
     * includes any explicit `modules` from your script bundle, along with any
     * modules, provided by your Capo and listed by name in your
     * `includeFromCapoModules()` method.
     * @public
     */
    public getEffectiveModuleList(): any[];
    resolveCapoIncludedModules(): any;
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
    get modules(): never[];
    get displayName(): any;
    get bridgeClassName(): string;
    /**
     * indicates whether the script should be optimized.
     * @remarks
     * Defaults to the general optimize setting provided by the factoryArgs.
     * Override to force optimization on or off.
     */
    get optimize(): any;
    get moduleName(): string;
    /**
     * Sets the currently-selected variant for this bundle, asserting its presence
     * in the `variants()` list.
     */
    withVariant(vn: any): this;
    previousCompiledScript(): any;
    loadPrecompiledVariant(variant: any): Promise<void>;
    compiledScript(asyncOk: any): any;
    get preBundledScript(): void;
    getSerializedProgramBundle(): Promise<{
        scriptHash: string;
        programBundle: {
            programElements: any;
            version: any;
            optimized: any;
            unoptimized: any;
            optimizedIR: any;
            unoptimizedIR: any;
            optimizedSmap: any;
            unoptimizedSmap: any;
        };
    }>;
    decodeAnyPlutusUplcProgram(version: any, cborHex: any, ir: any, sourceMap: any, alt: any): import("@helios-lang/uplc").UplcProgramV2;
    /**
     * provides a temporary indicator of mainnet-ness, while not
     * requiring the question to be permanently resolved.
     */
    isDefinitelyMainnet(): boolean;
    get program(): never;
    loadProgram(): HeliosProgramWithCacheAPI;
    isHeliosScriptBundle(): boolean;
    addTypeProxies(): void;
    effectiveDatumTypeName(): any;
    /**
     * @internal
     */
    locateDatumType(): import("node_modules/@helios-lang/compiler/types/typecheck/common.js").DataType | undefined;
    /**
     * @internal
     */
    locateRedeemerType(): any;
    get includeEnums(): never[];
    /**
     * @internal
     */
    getTopLevelTypes(): {
        datum: import("node_modules/@helios-lang/compiler/types/typecheck/common.js").DataType | undefined;
        redeemer: any;
    };
    /**
     * @internal
     */
    paramsToUplc(params: any): any;
    /**
     * @internal
     */
    typeToUplc(type: any, data: any, path?: string): import("@helios-lang/uplc").UplcData;
}
export const defaultNoDefinedModuleName: "\u2039default-needs-override\u203A";
export namespace placeholderSetupDetails {
    let specialOriginatorLabel: string;
    namespace setup {
        let isMainnet: boolean;
    }
}
import { HeliosProgramWithCacheAPI } from '@donecollectively/stellar-contracts/HeliosProgramWithCacheAPI';
//# sourceMappingURL=HeliosBundle.d.mts.map