import {
    Program,
    type CompileOptions,
    type ProgramProps,
} from "@helios-lang/compiler";
import type { Source } from "@helios-lang/compiler-utils";
import {
    decodeUplcProgramV2FromCbor,
    deserializeUplcSourceMap,
    makeUplcSourceMap,
    type UplcProgramV2,
    type UplcSourceMapJsonSafe,
} from "@helios-lang/uplc";
import { bytesToHex } from "@helios-lang/codec-utils";
import { blake2b } from "@helios-lang/crypto";
import { extractName } from "@helios-lang/compiler";

import { textToBytes } from "../HeliosPromotedTypes.js";
import type { CompileOptionsForCachedHeliosProgram } from "../HeliosPromotedTypes.js";

export type CacheableProgramProps = ProgramProps & {
    isTestnet: boolean; // non-optional
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

type OptimizeOptions =
    | false
    | Omit<
          Exclude<CompileOptions["optimize"], boolean | undefined>,
          "iterSpecificOptions" | "commonSubExprCount"
      >;

/**
 * @internal
 */
export type HeliosProgramCacheEntry = {
    version: "PlutusV2" | "PlutusV3";
    createdBy: string;
    programElements: Record<string, string | Object>;
    optimizeOptions: OptimizeOptions;
    optimized?: UplcProgramV2; // | UplcProgramV3I;
    unoptimized?: UplcProgramV2; //| UplcProgramV3I;
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
export type DeployedProgramBundle = Pick<
    SerializedHeliosCacheEntry,
    | "version"
    | "programElements"
    | "optimized"
    | "unoptimized"
    | "optimizedIR"
    | "unoptimizedIR"
    | "optimizedSmap"
    | "unoptimizedSmap"
>;

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
export type LockInfoForStrat<T extends CachedHeliosProgram> = Awaited<
    ReturnType<T["acquireLock"]>
>;

const redirecToCorrectConstructor =
    "🐢${this.id}: wrong direct use of new() constructor in CachedHeliosProgram; use forCurrentPlatform() instead";

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
export class CachedHeliosProgram extends Program {
    // static memoryCache = new Map<string, UplcProgramV2 | UplcProgramV3>();
    props: CacheableProgramProps;
    locks: Map<string, lockInfo<any>> = new Map();
    programElements: Record<string, string | Object>;
    cacheEntry: HeliosProgramCacheEntry | undefined;

    sources: (Source | string)[];
    static id: string =
        globalThis?.id || Math.floor(Math.random() * 1000).toString();
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
    constructor(mainSource: string | Source, props: CacheableProgramProps) {
        super(mainSource, props);
        this.sources = [mainSource, ...(props?.moduleSources || [])];
        this.programElements = {};
        this.id = this.subclass.id;
        const effectiveProps = {
            ...{
                timeout: 30000,
            },
            ...(props || {}),
        };
        this.props = effectiveProps;

        if (this.constructor === CachedHeliosProgram) {
            throw new Error(redirecToCorrectConstructor);
        }
    }

    /**
     * Checks for the presence of a cache key, without attempting a lock.  Indicates
     * whether the program is in the cache; if so, no lock is needed to read it.  Returns
     * the cached program if found, or null if not found.  Must be implemented by each subclass
     * as a platform-specific STATIC method.
     */
    static async ifCached(cacheKey: string): Promise<string | null> {
        throw new Error(redirecToCorrectConstructor);
    }

    /**
     * Acquires a lock for the given cache key.  Must be implemented by each subclass
     * as a platform-specific STATIC method.  Blocks while waiting for the lock.  Returns
     * the lock details or throws an error if the lock cannot be acquired.
     * The method receives the cache key and the program properties, which includes
     * the timeout to be used.
     */
    static async acquireLock(
        cacheKey: string,
        props: CacheableProgramProps
    ): Promise<lockInfo<any>> {
        throw new Error(redirecToCorrectConstructor);
    }

    /**
     * Acquires a lock for the given cache key, but does not wait.  Must be implemented by each subclass
     * as a platform-specific STATIC method.
     */
    static async acquireImmediateLock(
        cacheKey: any,
        props: CacheableProgramProps
    ): Promise<lockInfo<any> | null> {
        throw new Error(redirecToCorrectConstructor);
    }

    /**
     * Stores a compiled UPLC program in the cache.  Must be implemented by each subclass
     * as a platform-specific STATIC method.
     */
    static async cacheStore(
        key: string,
        value: string,
        raw: HeliosProgramCacheEntry
    ): Promise<void> {
        throw new Error(redirecToCorrectConstructor);
    }

    static async initCacheFromBundle(
        cacheEntries: Record<string, string | SerializedHeliosCacheEntry>
    ): Promise<void> {
        //!!! todo work on this more
        for (const [key, value] of Object.entries(cacheEntries)) {
            const found = await this.ifCached(key);
            if (found) {
                console.log(
                    `🐢${this.id}: duplicate key in compiler cache: ${key}`
                );
            }
            if ("string" === typeof value) {
                this.cacheStore(
                    key,
                    value,
                    this.toHeliosProgramCacheEntry(JSON.parse(value))
                );
            } else {
                const { version } = value;
                if (version !== "PlutusV2" && version !== "PlutusV3") {
                    console.log(
                        `🐢${this.id}: unknown version '${version}'' in compiler cache entry: ${key}; skipping`
                    );
                    continue;
                }
                try {
                    programFromCacheEntry(value);
                } catch (e: any) {
                    console.log(e.message);
                    console.log(
                        `^^ 🐢${this.id}: error parsing CBOR program from cache entry: ${key}; skipping`
                    );
                    continue;
                }

                this.cacheStore(
                    key,
                    JSON.stringify(value),
                    this.toHeliosProgramCacheEntry(value)
                );
            }
        }
    }

    static toHeliosProgramCacheEntry(
        value: SerializedHeliosCacheEntry
    ): HeliosProgramCacheEntry {
        throw new Error("todo");
    }

    /**
     * for vscode index view
     * @internal
     */
    private async ______endStatics() {}

    // hashObjectElements(obj: Record<string, string>): Record<string, string> {
    //     return Object.fromEntries(
    //         Object.entries(obj).map(([name, content]) => [
    //             name,
    //             bytesToHex(blake2b(textToBytes(content))),
    //         ])
    //     );
    // }

    /**
     * transforms an object of strings, hashing its values
     */
    hashObjectEntries(obj: Record<string, string>): Record<string, string> {
        return Object.fromEntries(
            Object.entries(obj).map(([name, content]) => [
                name,
                bytesToHex(blake2b(textToBytes(content))),
            ])
        );
    }

    /**
     * transforms an object of strings to a text representation in RFC822 "headers" style
     */
    objectToText(obj: Record<string, string | number | boolean>): string {
        return Object.entries(obj)
            .map(([name, content]) => `${name}: ${content}`)
            .join("\n");
    }

    /**
     * Builds an index of the source code hashes for the program elements
     * (main script, other modules)
     */
    sourceHashIndex(): Record<string, string> {
        return this.hashObjectEntries(
            Object.fromEntries(
                this.sources.map((s) => {
                    const name =
                        "string" === typeof s ? extractName(s) : s.name;
                    const content = "string" === typeof s ? s : s.content;
                    return [name, content];
                })
            )
        );
    }

    /**
     * Gathers the program elements needed for caching
     */
    gatherProgramElements(): Record<string, string | Object> {
        return (this.programElements = {
            ...this.sourceHashIndex(),
            params: this.entryPoint.paramsDetails(),
        });
    }

    computeInputsHash(options: CompileOptionsForCachedHeliosProgram): string {
        const index = {
            ...this.programElements,
        };
        const { params, ...otherElements } = index;
        const elementsText = this.objectToText(otherElements as any);
        const paramsContent = this.objectToText(params as any);
        // let optimize: OptimizeOptions = options.optimize ?? {};
        // if (true == optimize) optimize = {};
        // const optimizeText =
        // false == optimize ? "unoptimized" : this.objectToText(optimize);
        const optimizeText = this.textOptimizeOptions(options);
        const optimizeHash = bytesToHex(blake2b(textToBytes(optimizeText)));

        const paramsHashText = this.objectToText(
            this.hashObjectEntries({ params: paramsContent })
        );
        return bytesToHex(
            blake2b(
                textToBytes(
                    elementsText +
                        "\n" +
                        paramsHashText +
                        "\n" +
                        optimizeHash +
                        "\n"
                )
            )
        );
    }

    optimizeOptions(
        options: CompileOptionsForCachedHeliosProgram
    ): OptimizeOptions {
        let optimize: OptimizeOptions =
            true == options.optimize
                ? {}
                : (options.optimize as OptimizeOptions) ?? {};

        return optimize;
    }

    textOptimizeOptions(options: CompileOptionsForCachedHeliosProgram): string {
        let optimize = this.optimizeOptions(options);
        if (false == optimize) return "unoptimized";
        type justOptions = Exclude<OptimizeOptions, false>;
        let o: justOptions = optimize as any;
        return this.objectToText(
            // sort the keys in optimize.
            Object.fromEntries(
                Object.entries(o).sort(([a], [b]) => a.localeCompare(b))
            ) as justOptions
        );
    }

    get preferredProgramName(): string {
        return this.props.name || this.name;
    }

    getCacheKey(options: CompileOptionsForCachedHeliosProgram): string {
        if (this.props.cacheKey) {
            // for using ScriptHash as the caching key
            return this.props.cacheKey;
        }
        const hashString = this.computeInputsHash(options);
        const opt = false == options.optimize ? "-unoptimized" : "";

        return `${this.preferredProgramName}${opt}-${hashString}`;
    }

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
    async compileWithCache(
        optimizeOrOptions: boolean | CompileOptionsForCachedHeliosProgram
    ): Promise<UplcProgramV2> {
        // Promise<UplcProgramV2 | UplcProgramV3> {
        const options: CompileOptionsForCachedHeliosProgram =
            typeof optimizeOrOptions === "boolean"
                ? { optimize: optimizeOrOptions }
                : optimizeOrOptions;
        const optimize = this.optimizeOptions(optimizeOrOptions as any);

        const programElements = (this.programElements =
            this.gatherProgramElements());

        const cacheKey = this.getCacheKey(options);
        // const cachedProgram = CachedHeliosProgram.memoryCache.get(cacheKey);

        const fromCache = await this.getFromCache(cacheKey);
        if (fromCache) {
            // const programCount = fromCache.alt ? 2 : 1;
            console.log(`🐢${this.id}: ${cacheKey}: from cache`);
            return fromCache;
        }
        // not in cache.  Get the lock; if we get it, then we compile.  If not, we wait
        // for the lock to be released by another instance.
        const weMustCompile = await this.acquireImmediateLock(cacheKey);
        const otherInstanceIsCompiling = !weMustCompile;
        if (otherInstanceIsCompiling) {
            console.log(
                `🐢${this.id}: waiting for pending compile: ${cacheKey}`
            );
            try {
                const cacheEntry = await this.waitForCaching(cacheKey);
                const program = programFromCacheEntry(cacheEntry);        
                this.cacheEntry = deserializeHeliosCacheEntry(cacheEntry);
                debugger
                return program
            } catch (e) {
                console.log(
                    `🐢${this.id}: Failed getting cache-awaited program with cacheKey: ${cacheKey}; will compile in-process`
                );
                // if this happens, there should be a lock in the locks map... vvvvv
            }
        }
        // we either are delayed from a failed wait-for-cache (with pending lock)
        // ... or we got an immediate lock
        let lock = weMustCompile || this.locks.get(cacheKey);
        if (!lock) {
            throw new Error(
                `we should have a lock one way or other at this point`
            );
        }

        try {
            console.log(
                `🐢${this.id}: compiling program with cacheKey: ${cacheKey}`
            );
            // slow!
            const uplcProgram = this.compile(options);
            const cacheEntry: HeliosProgramCacheEntry = {
                version: "PlutusV2",
                createdBy: this.id,
                optimizeOptions: optimize,
                programElements,
            };

            if (uplcProgram.alt) {
                cacheEntry.unoptimized = uplcProgram.alt;
                cacheEntry.unoptimizedIR = uplcProgram.alt.ir;
                cacheEntry.unoptimizedSmap = makeUplcSourceMap({
                    term: uplcProgram.alt.root,
                }).toJsonSafe();

                cacheEntry.optimized = uplcProgram;
                cacheEntry.optimizedIR = uplcProgram.ir;
                cacheEntry.optimizedSmap = makeUplcSourceMap({
                    term: uplcProgram.root,
                }).toJsonSafe();
            } else {
                const sourceMap = makeUplcSourceMap({ term: uplcProgram.root });
                if (false == options.optimize) {
                    cacheEntry.unoptimized = uplcProgram;
                    cacheEntry.unoptimizedIR = uplcProgram.ir;
                    cacheEntry.unoptimizedSmap = sourceMap.toJsonSafe();
                } else {
                    cacheEntry.optimized = uplcProgram;
                    cacheEntry.optimizedIR = uplcProgram.ir;
                    cacheEntry.optimizedSmap = sourceMap.toJsonSafe();
                }
            }
            this.cacheEntry = cacheEntry;
            this.storeInCache(cacheKey, cacheEntry);
            return uplcProgram;
        } catch (e: any) {
            debugger;
            console.log(
                `🐢${this.id}: compiler cache: throwing compile error: ${e.message} (not caching) (dbpa)`
            );
            this.releaseLock(cacheKey);
            throw e;
        }
    }

    async waitForCaching(
        cacheKey: string
    ): Promise<SerializedHeliosCacheEntry> {
        // we won't get the lock very quickly, but it should come through as
        // soon as the other process finishes.
        return this.acquireLock(cacheKey).then(async (lock) => {
            if (lock) {
                const cached = await this.ifCached(cacheKey);
                if (cached) {
                    lock?.release();
                    return cached;
                }
                // things aren't great if we get here.  But we got the lock, so we can
                // use it to store the program in the cache.
                this.locks.set(cacheKey, lock);
                console.log(
                    `🐢${this.id}: waitForCaching: Lock acquired but no cache entry.  Storing lock in map`
                );
                throw new Error(
                    `Lock acquired but no cache entry for ${cacheKey}; compute locally then release this.locks[key].`
                );
            }
            throw new Error(
                `Lock for ${cacheKey} not acquired; compute locally (and try to populate the cache if possible)`
            );
        });
    }

    async getFromCache(
        cacheKey: string
    ): Promise<undefined | UplcProgramV2 /* | UplcProgramV3 */> {
        const cacheEntry = await this.ifCached(cacheKey);
        if (cacheEntry) {
            this.cacheEntry = deserializeHeliosCacheEntry(cacheEntry)
            // debugger
            return programFromCacheEntry(cacheEntry);
        }
        return undefined;
    }

    get subclass(): typeof CachedHeliosProgram {
        return this.constructor as typeof CachedHeliosProgram;
    }

    static checkPlatform(): "web" | "nodejs" {
        // determine if in-browser or using node.js
        // thanks to https://gist.github.com/rhysburnie/498bfd98f24b7daf5fd5930c7f3c1b7b

        // alt: consider this approach https://stackoverflow.com/a/31090240

        // thuthy
        var _nodejs: any =
            typeof process !== "undefined" &&
            process.versions &&
            process.versions.node;
        if (_nodejs) {
            _nodejs = {
                version: process.versions.node,
            };
        }

        // truthy
        var _browser: any =
            !_nodejs &&
            (typeof window !== "undefined" || typeof self !== "undefined");
        if (_browser) {
            // _browser = {
            //     window: false,
            //     self: false,
            //     $: false,
            // };
            if (typeof global === "undefined") {
                if (typeof window !== "undefined") {
                    global = window;
                    _browser.window = true;
                } else if (typeof self !== "undefined") {
                    global = self;
                    _browser.self = true;
                }
                // } else if (typeof $ !== "undefined") {
                //     global = $;
                //     _browser.$ = true;
                // }
            }
        }

        if (_nodejs) {
            console.log("Node.js detected");
            return "nodejs";
            // module.export = {
            //     nodejs: _nodejs,
            //     browser: _browser,
            // };
        }
        console.log("Browser env detected");
        return "web";
    }

    /**
     * for vscode index view
     * @internal
     */
    async __vvv_______instanceToStatic() {}

    async ifCached(
        cacheKey: string
    ): Promise<SerializedHeliosCacheEntry | null> {
        const string = await this.subclass.ifCached(cacheKey);
        if (string) {
            try {
                return JSON.parse(string) as SerializedHeliosCacheEntry;
            } catch (e: any) {
                console.log(
                    `  -- 🐢${this.id}: cleaning up invalid cache entry for ${cacheKey}: ${e.message}`
                );
                // (cleanup implied by returning null)
            }
        }
        return null;
    }

    /**
     * Acquires a lock for the given cache key, waiting according to the
     * configured `timeout` for another instance to finish compiling.
     *
     * Throws an error if the timeout expires
     */
    async acquireLock(cacheKey: string) {
        return this.subclass.acquireLock(cacheKey, this.props).then((lock) => {
            this.locks.set(cacheKey, lock);
            return lock;
        });
    }

    /**
     * Acquires a lock for the given cache key if it can do so immediately.
     * Stores the lock in the instance's lock map.
     */
    async acquireImmediateLock(cacheKey: string) {
        const lock = await this.subclass.acquireImmediateLock(
            cacheKey,
            this.props
        );
        if (lock) {
            this.locks.set(cacheKey, lock);
        }
        return lock;
    }

    /**
     * Stores a compiled UPLC program in the cache.
     * Requires the lock to exist.
     * Releases the lock after storing the program.
     */
    async storeInCache(
        cacheKey: string,
        value: HeliosProgramCacheEntry
    ): Promise<void> {
        if (!this.locks.has(cacheKey)) {
            throw new Error(
                `storeInCache: the lock for ${cacheKey} is not present`
            );
        }

        return this.subclass
            .cacheStore(
                cacheKey,
                stringifyCacheEntry(value),
                value
            )
            .then(() => {
                this.releaseLock(cacheKey);
            });
    }

    /**
     * Releases the lock for the given cache key.
     * Removes the lock from the instance's lock map.
     * Throws an error if the lock is not found.
     */
    releaseLock(cacheKey: string) {
        const lock = this.locks.get(cacheKey);
        if (lock) {
            lock.release();
            this.locks.delete(cacheKey);
        } else {
            throw new Error(`releaseLock: no lock found for ${cacheKey}`);
        }
    }
}

export function stringifyCacheEntry(entry: HeliosProgramCacheEntry): string {
    return JSON.stringify(
        serializeCacheEntry(entry),
        null,
        2
    );
}

export function serializeCacheEntry(
    entry: HeliosProgramCacheEntry): SerializedHeliosCacheEntry 
{
    const { optimized, unoptimized } = entry;
    return {
        ...entry,
        ...(optimized
            ? { optimized: bytesToHex(optimized.toCbor()) }
            : {}),
        ...(unoptimized
            ? { unoptimized: bytesToHex(unoptimized.toCbor()) }
            : {}),
    } as any;
}

export function programFromCacheEntry(
    fromCache: DeployedProgramBundle | SerializedHeliosCacheEntry
): UplcProgramV2 {
    //  | UplcProgramV3 {
    // the program is a hex-string, accepted by both UplcProgramV2 and UplcProgramV3
    const {
        optimized,
        optimizedIR,
        unoptimized,
        unoptimizedIR,
        version,
        optimizedSmap,
        unoptimizedSmap,
        // optimizeOptions,
        // createdBy,
        programElements
    } = fromCache;
    if (version !== "PlutusV2") throw new Error(`pv3supportpending`);
    // TargetClass = version == "PlutusV2" ? UplcProgramV2 : UplcProgramV3;

    const o = optimized
        ? decodeUplcProgramV2FromCbor(optimized, {
              ir: optimizedIR,
              sourceMap: optimizedSmap,
          })
        : undefined;
    const u = unoptimized
        ? decodeUplcProgramV2FromCbor(unoptimized, {
              ir: unoptimizedIR,
              sourceMap: unoptimizedSmap,
          })
        : undefined;
    if (o) {
        if (u) {
            return o.withAlt(u); // | UplcProgramV3;
        }
        return o;
    }
    if (!u) {
        throw new Error(
            `🐢 No optimized or unoptimized program in cache entry: ${fromCache}`
        );
    }
    return u;
}

export function deserializeHeliosCacheEntry(
    entry: SerializedHeliosCacheEntry
): HeliosProgramCacheEntry {
    const {
        optimized,
        optimizedIR,
        unoptimized,
        unoptimizedIR,
        version,
        optimizedSmap,
        unoptimizedSmap,
        optimizeOptions,
        createdBy,
        programElements
    } = entry

    return {
        optimized: optimized ? decodeUplcProgramV2FromCbor(optimized) : undefined,
        unoptimized: unoptimized ? decodeUplcProgramV2FromCbor(unoptimized) : undefined,
        optimizedSmap: optimizedSmap || undefined, 
        //XXX it's already json-safe. deserializeUplcSourceMap(optimizedSmap).toJsonSafe() : undefined,
        unoptimizedSmap: unoptimizedSmap || undefined,
        //XXX it's already json-safe. deserializeUplcSourceMap(unoptimizedSmap).toJsonSafe(): undefined,
        optimizeOptions,
        version,
        createdBy,
        programElements,
        optimizedIR,
        unoptimizedIR,
    };
}
