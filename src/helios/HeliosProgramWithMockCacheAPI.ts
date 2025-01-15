// shim for node.js, returning a class that provides Helios' Program interface
// ... plus caching

import { Program } from "@helios-lang/compiler";
import type { CompileOptionsForCachedHeliosProgram } from "../HeliosPromotedTypes.js";
import type { anyUplcProgram } from "../HeliosPromotedTypes.js";
import type { CacheableProgramProps } from "./CachedHeliosProgram.js";
import type { Source } from "@helios-lang/compiler-utils";

export { type CompileOptionsForCachedHeliosProgram } from "../HeliosPromotedTypes.js";
export type { anyUplcProgram } from "../HeliosPromotedTypes.js";

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
export class HeliosProgramWithCacheAPI extends Program {
    constructor(mainSource: string | Source, props?: CacheableProgramProps) {
        super(mainSource, props);
    }
    async compileWithCache(
        optimizeOrOptions: boolean | CompileOptionsForCachedHeliosProgram
    ) : Promise<anyUplcProgram> {
        return this.compile(optimizeOrOptions) as any;
    }
}
