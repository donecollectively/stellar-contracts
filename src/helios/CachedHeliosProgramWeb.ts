import type { UplcProgramV2, UplcProgramV3 } from "@helios-lang/uplc";
import { CachedHeliosProgram, type lockInfo } from "./CachedHeliosProgram.js";

export function mkCachedHeliosProgramWeb() : typeof CachedHeliosProgram {
    return class CachedHeliosProgramWeb extends CachedHeliosProgram {
        // use https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API
        async acquireLock(cacheKey: string) : Promise<lockInfo<any>> {
            throw new Error(`todo`);
        }

        static async cacheStore(
            key: string,
            value: string
        ): Promise<void> {}
    };
}
