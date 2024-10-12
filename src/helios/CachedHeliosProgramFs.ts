import * as lockfile from "proper-lockfile";
import { readFile, writeFile } from "fs/promises";

import {
    CachedHeliosProgram,
    type CacheableProgramProps,
    type HeliosProgramCacheEntry,
    type lockInfo,
    type LockInfoForStrat,
    type StringifiedCacheEntry,
} from "./CachedHeliosProgram.js";
import { existsSync, mkdirSync } from "fs";

const cacheStore = ".hlcache";

export function mkCachedHeliosProgramFS(): typeof CachedHeliosProgram {
    // if the cacheStore directory doesn't exist, create it.
    if (!existsSync(cacheStore)) {
        console.log(`🐢${CachedHeliosProgram.id} Creating helios compiler cache in ${cacheStore}`);
        mkdirSync(cacheStore);
    }
    return class CachedHeliosProgramFS extends CachedHeliosProgram {
        static async ifCached(cacheKey: string): Promise<string | null> {
            if (existsSync(`${cacheStore}/${cacheKey}`)) {
                const result = await readFile(`${cacheStore}/${cacheKey}`, "utf8");
                console.log(`🐢${this.id}: compiler cache hit: ${cacheKey}: ${result.length} bytes`)
                return result
            }
            console.log(`🐢${this.id}: compiler cache miss: ${cacheKey}`)
            return null;
        }

        static async acquireImmediateLock(
            cacheKey: any,
            props: CacheableProgramProps
        ): Promise<LockInfoForStrat<CachedHeliosProgramFS> | null> {
            const filename = `${cacheStore}/${cacheKey}`;
            let created = false
            if (!existsSync(filename)) {
                // create it empty
                await writeFile(filename, "");
                created = true
                console.log(`🐢${this.id}: compiler cache: create and lock ${cacheKey}`)
            }
            return lockfile
                .lock(filename, {
                    stale: props.timeout,
                    update: 1000,
                })
                .then((release) => {
                    if (!created) {
                        console.log(`🐢${this.id}: compiler cache: lock acquired for ${cacheKey}`)
                    }
                    return {
                        lock: null,
                        cacheKey,
                        release: release,
                    };
                })
                .catch((err) => {
                    // probably want this to be silent, if all is well.
                    if (created) {
                        console.log(
                            `🐢${this.id}: compiler cache: immediate lock not available for ${cacheKey}: ${err.message}`
                        );
                    }
                    return null;
                });
        }

        static async acquireLock(
            cacheKey: any,
            props: CacheableProgramProps
        ): Promise<lockInfo<null>> {
            const filename = `${cacheStore}/${cacheKey}`;
            if (!existsSync(filename)) {
                // create it empty
                await writeFile(filename, "");
                console.log(`🐢${this.id}: compiler cache: creating ${cacheKey}`)
            }
            return lockfile
                .lock(filename, {
                    retries: {
                        factor: 1.41,
                        minTimeout: 200,
                        maxTimeout: props.timeout,
                        randomize: true,
                        maxRetryTime: props.timeout,
                    },
                    stale: 15000,
                    update: 1000,
                })
                .then((release) => {
                    console.log(`🐢${this.id}: compiler cache: lock acquired for ${cacheKey}`)
                    debugger

                    return {
                        lock: null,
                        cacheKey,
                        release: release,
                    };
                });
        }

        static async cacheStore(
            key: string, 
            value: string, 
            object: HeliosProgramCacheEntry
        ): Promise<void> {
            console.log(`🐢${this.id}: compiler cache: storing ${key}: ${value.length} bytes`)
            await writeFile(`${cacheStore}/${key}`, value);
            if (object.optimizedIR) {
                await writeFile(`${cacheStore}/${key}-ir-optimized`, object.optimizedIR)
            }
            if (object.unoptimizedIR) {
                await writeFile(`${cacheStore}/${key}-ir-unoptimized`, object.unoptimizedIR)
            }
        }
    };
}
