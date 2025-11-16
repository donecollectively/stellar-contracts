declare const CapoMinterBundle_base: {
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
        datumTypeName: any;
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
        initProgramDetails(): void;
        get isPrecompiled(): boolean;
        getPreCompiledBundle(variant: any): void;
        getPreconfiguredVariantParams(variantName: any): any;
        getPreconfiguredUplcParams(variantName: any): any;
        get params(): undefined;
        get variants(): {
            singleton: undefined;
        };
        get main(): void;
        implicitIncludedCapoModules(): string[];
        includeFromCapoModules(): never[];
        getEffectiveModuleList(): any[];
        resolveCapoIncludedModules(): any;
        logModuleDetails(): void;
        get modules(): never[];
        readonly displayName: any;
        get bridgeClassName(): string;
        readonly optimize: any;
        get moduleName(): string;
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
        isDefinitelyMainnet(): boolean;
        get program(): never;
        loadProgram(): import("@donecollectively/stellar-contracts/HeliosProgramWithCacheAPI").HeliosProgramWithCacheAPI;
        isHeliosScriptBundle(): boolean;
        addTypeProxies(): void;
        effectiveDatumTypeName(): any;
        locateDatumType(): import("node_modules/@helios-lang/compiler/types/typecheck/common.js").DataType | undefined;
        locateRedeemerType(): any;
        get includeEnums(): never[];
        getTopLevelTypes(): {
            datum: import("node_modules/@helios-lang/compiler/types/typecheck/common.js").DataType | undefined;
            redeemer: any;
        };
        paramsToUplc(params: any): any;
        typeToUplc(type: any, data: any, path?: string): import("@helios-lang/uplc").UplcData;
    };
    isCapoBundle: boolean;
    needsCapoConfiguration: boolean;
    currentRev: bigint;
    isAbstract: undefined;
    usingCapoBundleClass(c: any, generic?: boolean): /*elided*/ any;
    create(setupDetails?: {
        specialOriginatorLabel: string;
        setup: {
            isMainnet: boolean;
        };
    }): HeliosScriptBundle;
};
export class CapoMinterBundle extends CapoMinterBundle_base {
    static needsSpecializedDelegateModule: boolean;
    scriptParamsSource: string;
    requiresGovAuthority: boolean;
    get params(): {
        rev: any;
        seedTxn?: undefined;
        seedIndex?: undefined;
    } | {
        rev: any;
        seedTxn: any;
        seedIndex: any;
    };
    get main(): import("@helios-lang/compiler-utils").Source;
    loadPrecompiledVariant(variant: any): Promise<any>;
}
import { HeliosScriptBundle } from '../HeliosBundle.mjs';
export { CapoMinterBundle as default };
//# sourceMappingURL=CapoMinter.hlb.d.mts.map