import { CompileOptions } from '@helios-lang/compiler';
import { Program } from '@helios-lang/compiler';
import { ProgramProps } from '@helios-lang/compiler';
import type { Source } from '@helios-lang/compiler-utils';
import { UplcProgramV2 } from '@helios-lang/uplc';
import { UplcSourceMapJsonSafe } from '@helios-lang/uplc';

/**
 * @public
 */
export declare type anyUplcProgram = UplcProgramV2;

declare type CacheableProgramProps = ProgramProps & {
    isTestnet: boolean;
    /**
     * The cache key for the program. Defaults to the hash of the source code.
     * If there is no source code, the cacheKey is required
     */
    cacheKey?: string;
    /**
     * The timeout, in milliseconds for waiting for another instance to finish compiling.
     * The default timeout is 30 seconds.
     */
    timeout?: number;
    /**
     * The expected script hash for the program.  The compiled program is checked against
     * this script hash, if provided.
     */
    expectedScriptHash?: string;
    /**
     * name of the script, which may be different from the name of the script's entry-point
     * / main module
     */
    name?: string;
};

/**
 * @public
 */
export declare type CompileOptionsForCachedHeliosProgram = CompileOptions & {
    /**
     * The timeout for waiting for another instance to finish compiling.
     * Defaults to 30 seconds.
     */
    timeout?: number;
};

/**
 * @internal
 */
declare type HeliosProgramCacheEntry = {
    version: "PlutusV2" | "PlutusV3";
    createdBy: string;
    programElements: Record<string, string | Object>;
    optimizeOptions: OptimizeOptions;
    optimized?: UplcProgramV2;
    unoptimized?: UplcProgramV2;
    optimizedIR?: string;
    unoptimizedIR?: string;
    optimizedSmap?: UplcSourceMapJsonSafe;
    unoptimizedSmap?: UplcSourceMapJsonSafe;
};

/**
 * Provides an interface for building Helios programs that may be cached
 * @remarks
 * When building through this interface in the browser, the async API is the
 * same as that used in a development environment (using node.js).  In the
 * developer environment, the cache is a file system cache.  In the browser,
 * there is not current a cache implementation.
 *
 * Otherwise, the compileWithCache() is simply an async wrapper around the
 * normal interface for compiling a Helios program with options including
 * optimization.
 * @public
 */
export declare class HeliosProgramWithCacheAPI extends Program {
    cacheEntry: HeliosProgramCacheEntry | undefined;
    constructor(mainSource: string | Source, props: CacheableProgramProps);
    compileTime: {
        compiled?: number;
        stored?: number;
        fetchedCache?: number;
    } | undefined;
    static checkFile(srcFilename: string): boolean | null;
    compileWithCache(optimizeOrOptions: boolean | CompileOptionsForCachedHeliosProgram): Promise<anyUplcProgram>;
}

declare type OptimizeOptions = false | Omit<Exclude<CompileOptions["optimize"], boolean | undefined>, "iterSpecificOptions" | "commonSubExprCount">;

export { }
