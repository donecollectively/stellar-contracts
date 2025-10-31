import { Program, type CompileOptions, type ProgramProps } from "@helios-lang/compiler";
import type { Source } from "@helios-lang/compiler-utils";
import { type UplcProgramV2, type UplcSourceMapJsonSafe } from "@helios-lang/uplc";
import type { CompileOptionsForCachedHeliosProgram } from "../HeliosPromotedTypes.js";
export type CacheableProgramProps = ProgramProps & {
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
type OptimizeOptions = false | Omit<Exclude<CompileOptions["optimize"], boolean | undefined>, "iterSpecificOptions" | "commonSubExprCount">;
/**
 * @internal
 */
export type HeliosProgramCacheEntry = {
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
 * @internal
 */
export type SerializedHeliosCacheEntry = {
    version: "PlutusV2" | "PlutusV3";
    createdBy: string;
    programElements: Record<string, string | Object>;
    optimizeOptions: OptimizeOptions;
    optimized?: string;
    unoptimized?: string;
    optimizedIR?: string;
    unoptimizedIR?: string;
    optimizedSmap?: UplcSourceMapJsonSafe;
    unoptimizedSmap?: UplcSourceMapJsonSafe;
};
/**
 * @internal
 */
export type PrecompiledProgramJSON = Pick<SerializedHeliosCacheEntry, "version" | "programElements" | "optimized" | "unoptimized" | "optimizedIR" | "unoptimizedIR" | "optimizedSmap" | "unoptimizedSmap">;
/**
 * @internal
 */
export type lockInfo<T> = {
    lock: T;
    release: () => void;
};
/**
 * @internal
 */
export type LockInfoForStrat<T extends CachedHeliosProgram> = Awaited<ReturnType<T["acquireLock"]>>;
/**
 * A Helios program that caches its compiled UPLC program.
 * @remarks
 * Only available in the node.js environment for now, by importing
 * HeliosProgramWithCacheAPI from the @stellar-contracts/HeliosProgramWithCacheAPI module.
 *
 * ### Feedback please?
 * Probably nobody ever sees this doc?  If you do, please let us know!
 * @public
 */
export declare class CachedHeliosProgram extends Program {
    props: CacheableProgramProps;
    locks: Map<string, lockInfo<any>>;
    programElements: Record<string, string | Object>;
    cacheEntry: HeliosProgramCacheEntry | undefined;
    sources: (Source | string)[];
    static id: string;
    id: string;
    /**
     * Creates a new CachedHeliosProgram.
     * @remarks
     * Expects the same arguments as the Helios {@link Program} constructor.
     *
     * Returns a Program subclass that also conforms to the CachedHeliosProgram interface.
     *
     * Use the {@link compileCached | compileCached()} method to compile the program.
     * @public
     */
    constructor(mainSource: string | Source, props: CacheableProgramProps);
    /**
     * Checks for the presence of a cache key, without attempting a lock.  Indicates
     * whether the program is in the cache; if so, no lock is needed to read it.  Returns
     * the cached program if found, or null if not found.  Must be implemented by each subclass
     * as a platform-specific STATIC method.
     */
    static ifCached(cacheKey: string): Promise<string | null>;
    /**
     * Acquires a lock for the given cache key.  Must be implemented by each subclass
     * as a platform-specific STATIC method.  Blocks while waiting for the lock.  Returns
     * the lock details or throws an error if the lock cannot be acquired.
     * The method receives the cache key and the program properties, which includes
     * the timeout to be used.
     */
    static acquireLock(cacheKey: string, props: CacheableProgramProps): Promise<lockInfo<any>>;
    /**
     * Acquires a lock for the given cache key, but does not wait.  Must be implemented by each subclass
     * as a platform-specific STATIC method.
     */
    static acquireImmediateLock(cacheKey: any, props: CacheableProgramProps): Promise<lockInfo<any> | null>;
    /**
     * Stores a compiled UPLC program in the cache.  Must be implemented by each subclass
     * as a platform-specific STATIC method.
     */
    static cacheStore(key: string, value: string, raw: HeliosProgramCacheEntry): Promise<void>;
    static initCacheFromBundle(cacheEntries: Record<string, string | SerializedHeliosCacheEntry>): Promise<void>;
    static toHeliosProgramCacheEntry(value: SerializedHeliosCacheEntry): HeliosProgramCacheEntry;
    /**
     * for vscode index view
     * @internal
     */
    private ______endStatics;
    /**
     * transforms an object of strings, hashing its values
     */
    hashObjectEntries(obj: Record<string, string>): Record<string, string>;
    /**
     * transforms an object of strings to a text representation in RFC822 "headers" style
     */
    objectToText(obj: Record<string, string | number | boolean>): string;
    /**
     * Builds an index of the source code hashes for the program elements
     * (main script, other modules)
     */
    sourceHashIndex(): Record<string, string>;
    /**
     * Gathers the program elements needed for caching
     */
    gatherProgramElements(): Record<string, string | Object>;
    computeInputsHash(options: CompileOptionsForCachedHeliosProgram): string;
    optimizeOptions(options: CompileOptionsForCachedHeliosProgram): OptimizeOptions;
    textOptimizeOptions(options: CompileOptionsForCachedHeliosProgram): string;
    get preferredProgramName(): string;
    getCacheKey(options: CompileOptionsForCachedHeliosProgram): string;
    /**
     * Compiles a Helios program to UPLC, with caching for performance
     *
     * ### Caching behavior
     * This method seeks to quickly return a compiled version of the program, using
     * a platform-specific cache (and lock) mechanism.
     * #### Happy path
     *  - if the program is found in the cache, it is immediately returned
     * #### First compilation and cache-storage
     *  - Otherwise, a lock is acquired and the program is compiled
     *  - Once compiled, the cache entry is created for future use, and its lock is lifted
     *
     * #### When there is a compile already pending
     *
     * Once a Helios program starts compiling once, calling `compileCached()` on any
     * instance of the same program with the same settings results in the same cache
     * key.  This may occur in a different browser tab, service worker, node-js thread/worker,
     * or a different node process.  In each case, the second `compileCached()` call:
     *
     *  - Issues a warning that it is waiting for another process to complete the compilation.
     *  - waits up to 15 seconds (or the configured `timeout`) for a lock (indicating that
     *    another instance is compiling the program already)
     * - when the lock  is released, the compiled program is read from the cache, and returned.
     *  - includes the unoptimized version of the UPLC program for logging
     *
     * #### When everything goes wrong
     * If the process holding a lock doesn't succeed and doesn't release the lock, the
     * lock goes stale automatically, and the lock fails (after the `timeout` period).  In
     * this case, each instance of the program:
     *
     *   - makes a last attempt to compile the program
     *   - If it fails, the local process will report the error normally, and no caching is done
     *   - If it succeeds, the result is returned.
     *   - it also tries to cache the result (if it can do so without delay)
     *
     *  - todo: measure the time cost of the "has errors" path.
     *
     * See Helios' {@link Program.compile} for more information about compiling Helios programs.
     *
     * import from stellar-contracts/CacheableProgramAPI in a node.js environment
     * to access this method.  In the web environment, that import returns a different
     * class with the same interface.
     */
    compileWithCache(optimizeOrOptions: boolean | CompileOptionsForCachedHeliosProgram): Promise<UplcProgramV2>;
    compileTime: {
        compiled?: number;
        stored?: number;
        fetchedCache?: number;
    } | undefined;
    waitForCaching(cacheKey: string): Promise<SerializedHeliosCacheEntry>;
    getFromCache(cacheKey: string): Promise<undefined | UplcProgramV2>;
    get subclass(): typeof CachedHeliosProgram;
    static checkPlatform(): "web" | "nodejs";
    /**
     * for vscode index view
     * @internal
     */
    __vvv_______instanceToStatic(): Promise<void>;
    ifCached(cacheKey: string): Promise<SerializedHeliosCacheEntry | null>;
    /**
     * Acquires a lock for the given cache key, waiting according to the
     * configured `timeout` for another instance to finish compiling.
     *
     * Throws an error if the timeout expires
     */
    acquireLock(cacheKey: string): Promise<lockInfo<any>>;
    /**
     * Acquires a lock for the given cache key if it can do so immediately.
     * Stores the lock in the instance's lock map.
     */
    acquireImmediateLock(cacheKey: string): Promise<lockInfo<any> | null>;
    /**
     * Stores a compiled UPLC program in the cache.
     * Requires the lock to exist.
     * Releases the lock after storing the program.
     */
    storeInCache(cacheKey: string, value: HeliosProgramCacheEntry): Promise<void>;
    /**
     * Releases the lock for the given cache key.
     * Removes the lock from the instance's lock map.
     * Throws an error if the lock is not found.
     */
    releaseLock(cacheKey: string): void;
}
export declare function stringifyCacheEntry(entry: HeliosProgramCacheEntry): string;
export declare function serializeCacheEntry(entry: HeliosProgramCacheEntry): SerializedHeliosCacheEntry;
export declare function programFromCacheEntry(fromCache: PrecompiledProgramJSON | SerializedHeliosCacheEntry): UplcProgramV2;
export declare function deserializeHeliosCacheEntry(entry: SerializedHeliosCacheEntry): HeliosProgramCacheEntry;
export {};
//# sourceMappingURL=CachedHeliosProgram.d.ts.map