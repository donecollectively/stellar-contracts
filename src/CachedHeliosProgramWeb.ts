import type { UplcProgramV2, UplcProgramV3 } from "@helios-lang/uplc";
import { CachedHeliosProgram } from "./CachedHeliosProgram.js";

export function mkCachedHeliosProgramWeb() : typeof CachedHeliosProgram {
    return class CachedHeliosProgramWeb extends CachedHeliosProgram {
        // use https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API
        async acquireLock(cacheKey: any) {}

        static async cacheStore(
            key: string,
            value: UplcProgramV2 | UplcProgramV3
        ): Promise<void> {}
    };
}
