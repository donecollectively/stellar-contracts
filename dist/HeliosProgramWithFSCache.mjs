// src/helios/CachedHeliosProgramFS.ts
import * as lockfile from "proper-lockfile";
import { readFile, writeFile } from "fs/promises";
import { existsSync, mkdirSync } from "fs";

// src/helios/CachedHeliosProgram.ts
import {
  Program
} from "@helios-lang/compiler";
import {
  decodeUplcProgramV2FromCbor,
  makeUplcSourceMap
} from "@helios-lang/uplc";
import { bytesToHex } from "@helios-lang/codec-utils";
import { blake2b } from "@helios-lang/crypto";
import { extractName } from "@helios-lang/compiler";

// src/HeliosPromotedTypes.ts
import {
  encodeUtf8,
  decodeUtf8
} from "@helios-lang/codec-utils";

// src/helios/CachedHeliosProgram.ts
var redirecToCorrectConstructor = "\u{1F422}${this.id}: wrong direct use of new() constructor in CachedHeliosProgram; use forCurrentPlatform() instead";
var CachedHeliosProgram = class _CachedHeliosProgram extends Program {
  // static memoryCache = new Map<string, UplcProgramV2 | UplcProgramV3>();
  props;
  locks = /* @__PURE__ */ new Map();
  programElements;
  cacheEntry;
  sources;
  static id = globalThis?.id || Math.floor(Math.random() * 1e3).toString();
  id;
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
  constructor(mainSource, props) {
    super(mainSource, props);
    this.sources = [mainSource, ...props?.moduleSources || []];
    this.programElements = {};
    this.id = this.subclass.id;
    const effectiveProps = {
      ...{
        timeout: 3e4
      },
      ...props || {}
    };
    this.props = effectiveProps;
    if (this.constructor === _CachedHeliosProgram) {
      throw new Error(redirecToCorrectConstructor);
    }
  }
  /**
   * Checks for the presence of a cache key, without attempting a lock.  Indicates
   * whether the program is in the cache; if so, no lock is needed to read it.  Returns
   * the cached program if found, or null if not found.  Must be implemented by each subclass
   * as a platform-specific STATIC method.
   */
  static async ifCached(cacheKey) {
    throw new Error(redirecToCorrectConstructor);
  }
  /**
   * Acquires a lock for the given cache key.  Must be implemented by each subclass
   * as a platform-specific STATIC method.  Blocks while waiting for the lock.  Returns
   * the lock details or throws an error if the lock cannot be acquired.
   * The method receives the cache key and the program properties, which includes
   * the timeout to be used.
   */
  static async acquireLock(cacheKey, props) {
    throw new Error(redirecToCorrectConstructor);
  }
  /**
   * Acquires a lock for the given cache key, but does not wait.  Must be implemented by each subclass
   * as a platform-specific STATIC method.
   */
  static async acquireImmediateLock(cacheKey, props) {
    throw new Error(redirecToCorrectConstructor);
  }
  /**
   * Stores a compiled UPLC program in the cache.  Must be implemented by each subclass
   * as a platform-specific STATIC method.
   */
  static async cacheStore(key, value, raw) {
    throw new Error(redirecToCorrectConstructor);
  }
  static async initCacheFromBundle(cacheEntries) {
    for (const [key, value] of Object.entries(cacheEntries)) {
      const found = await this.ifCached(key);
      if (found) {
        console.log(
          `\u{1F422}${this.id}: duplicate key in compiler cache: ${key}`
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
            `\u{1F422}${this.id}: unknown version '${version}'' in compiler cache entry: ${key}; skipping`
          );
          continue;
        }
        try {
          programFromCacheEntry(value);
        } catch (e) {
          console.log(e.message);
          console.log(
            `^^ \u{1F422}${this.id}: error parsing CBOR program from cache entry: ${key}; skipping`
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
  static toHeliosProgramCacheEntry(value) {
    throw new Error("todo");
  }
  /**
   * for vscode index view
   * @internal
   */
  async ______endStatics() {
  }
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
  hashObjectEntries(obj) {
    return Object.fromEntries(
      Object.entries(obj).map(([name, content]) => [
        name,
        bytesToHex(blake2b(encodeUtf8(content)))
      ])
    );
  }
  /**
   * transforms an object of strings to a text representation in RFC822 "headers" style
   */
  objectToText(obj) {
    return Object.entries(obj).map(([name, content]) => `${name}: ${content}`).join("\n");
  }
  /**
   * Builds an index of the source code hashes for the program elements
   * (main script, other modules)
   */
  sourceHashIndex() {
    return this.hashObjectEntries(
      Object.fromEntries(
        this.sources.map((s) => {
          const name = "string" === typeof s ? extractName(s) : s.name;
          const content = "string" === typeof s ? s : s.content;
          return [name, content];
        })
      )
    );
  }
  /**
   * Gathers the program elements needed for caching
   */
  gatherProgramElements() {
    return this.programElements = {
      ...this.sourceHashIndex(),
      params: this.entryPoint.paramsDetails()
    };
  }
  computeInputsHash(options) {
    const index = {
      ...this.programElements
    };
    const { params, ...otherElements } = index;
    const elementsText = this.objectToText(otherElements);
    const paramsContent = this.objectToText(params);
    const optimizeText = this.textOptimizeOptions(options);
    const optimizeHash = bytesToHex(blake2b(encodeUtf8(optimizeText)));
    const paramsHashText = this.objectToText(
      this.hashObjectEntries({ params: paramsContent })
    );
    return bytesToHex(
      blake2b(
        encodeUtf8(
          elementsText + "\n" + paramsHashText + "\n" + optimizeHash + "\n"
        )
      )
    );
  }
  optimizeOptions(options) {
    let optimize = true == options.optimize ? {} : options.optimize ?? {};
    return optimize;
  }
  textOptimizeOptions(options) {
    let optimize = this.optimizeOptions(options);
    if (false == optimize) return "unoptimized";
    let o = optimize;
    return this.objectToText(
      // sort the keys in optimize.
      Object.fromEntries(
        Object.entries(o).sort(([a], [b]) => a.localeCompare(b))
      )
    );
  }
  get preferredProgramName() {
    return this.props.name || this.name;
  }
  getCacheKey(options) {
    if (this.props.cacheKey) {
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
  async compileWithCache(optimizeOrOptions) {
    const options = typeof optimizeOrOptions === "boolean" ? { optimize: optimizeOrOptions } : optimizeOrOptions;
    const optimize = this.optimizeOptions(optimizeOrOptions);
    const programElements = this.programElements = this.gatherProgramElements();
    const start = Date.now();
    const cacheKey = this.getCacheKey(options);
    const fromCache = await this.getFromCache(cacheKey);
    if (fromCache) {
      console.log(`\u{1F422}${this.id}: ${cacheKey}: from cache`);
      const end1 = Date.now();
      this.compileTime = {
        fetchedCache: end1 - start
      };
      return fromCache;
    }
    const weMustCompile = await this.acquireImmediateLock(cacheKey);
    const otherInstanceIsCompiling = !weMustCompile;
    if (otherInstanceIsCompiling) {
      console.log(
        `\u{1F422}${this.id}: waiting for pending compile: ${cacheKey}`
      );
      try {
        const cacheEntry = await this.waitForCaching(cacheKey);
        const program = programFromCacheEntry(cacheEntry);
        this.cacheEntry = deserializeHeliosCacheEntry(cacheEntry);
        debugger;
        return program;
      } catch (e) {
        console.log(
          `\u{1F422}${this.id}: Failed getting cache-awaited program with cacheKey: ${cacheKey}; will compile in-process`
        );
      }
    }
    let lock2 = weMustCompile || this.locks.get(cacheKey);
    if (!lock2) {
      throw new Error(
        `we should have a lock one way or other at this point`
      );
    }
    try {
      console.log(
        `\u{1F422}${this.id}: compiling program with cacheKey: ${cacheKey}`
      );
      const start2 = Date.now();
      const uplcProgram = this.compile(options);
      const end1 = Date.now();
      const cacheEntry = {
        version: "PlutusV2",
        createdBy: this.id,
        optimizeOptions: optimize,
        programElements
      };
      if (uplcProgram.alt) {
        cacheEntry.unoptimized = uplcProgram.alt;
        cacheEntry.unoptimizedIR = uplcProgram.alt.ir;
        cacheEntry.unoptimizedSmap = makeUplcSourceMap({
          term: uplcProgram.alt.root
        }).toJsonSafe();
        cacheEntry.optimized = uplcProgram;
        cacheEntry.optimizedIR = uplcProgram.ir;
        cacheEntry.optimizedSmap = makeUplcSourceMap({
          term: uplcProgram.root
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
      const end2 = Date.now();
      this.compileTime = {
        compiled: end1 - start2,
        stored: end2 - end1
      };
      return uplcProgram;
    } catch (e) {
      debugger;
      console.log(
        `\u{1F422}${this.id}: compiler cache: throwing compile error: ${e.message} (not caching) (dbpa)`
      );
      this.releaseLock(cacheKey);
      throw e;
    }
  }
  compileTime;
  async waitForCaching(cacheKey) {
    return this.acquireLock(cacheKey).then(async (lock2) => {
      if (lock2) {
        const cached = await this.ifCached(cacheKey);
        if (cached) {
          lock2?.release();
          return cached;
        }
        this.locks.set(cacheKey, lock2);
        console.log(
          `\u{1F422}${this.id}: waitForCaching: Lock acquired but no cache entry.  Storing lock in map`
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
  async getFromCache(cacheKey) {
    const cacheEntry = await this.ifCached(cacheKey);
    if (cacheEntry) {
      this.cacheEntry = deserializeHeliosCacheEntry(cacheEntry);
      return programFromCacheEntry(cacheEntry);
    }
    return void 0;
  }
  get subclass() {
    return this.constructor;
  }
  static checkPlatform() {
    var _nodejs = typeof process !== "undefined" && process.versions && process.versions.node;
    if (_nodejs) {
      _nodejs = {
        version: process.versions.node
      };
    }
    var _browser = !_nodejs && (typeof window !== "undefined" || typeof self !== "undefined");
    if (_browser) {
      if (typeof global === "undefined") {
        if (typeof window !== "undefined") {
          global = window;
          _browser.window = true;
        } else if (typeof self !== "undefined") {
          global = self;
          _browser.self = true;
        }
      }
    }
    if (_nodejs) {
      console.log("Node.js detected");
      return "nodejs";
    }
    console.log("Browser env detected");
    return "web";
  }
  /**
   * for vscode index view
   * @internal
   */
  async __vvv_______instanceToStatic() {
  }
  async ifCached(cacheKey) {
    const string = await this.subclass.ifCached(cacheKey);
    if (string) {
      try {
        return JSON.parse(string);
      } catch (e) {
        console.log(
          `  -- \u{1F422}${this.id}: cleaning up invalid cache entry for ${cacheKey}: ${e.message}`
        );
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
  async acquireLock(cacheKey) {
    return this.subclass.acquireLock(cacheKey, this.props).then((lock2) => {
      this.locks.set(cacheKey, lock2);
      return lock2;
    });
  }
  /**
   * Acquires a lock for the given cache key if it can do so immediately.
   * Stores the lock in the instance's lock map.
   */
  async acquireImmediateLock(cacheKey) {
    const lock2 = await this.subclass.acquireImmediateLock(
      cacheKey,
      this.props
    );
    if (lock2) {
      this.locks.set(cacheKey, lock2);
    }
    return lock2;
  }
  /**
   * Stores a compiled UPLC program in the cache.
   * Requires the lock to exist.
   * Releases the lock after storing the program.
   */
  async storeInCache(cacheKey, value) {
    if (!this.locks.has(cacheKey)) {
      throw new Error(
        `storeInCache: the lock for ${cacheKey} is not present`
      );
    }
    return this.subclass.cacheStore(
      cacheKey,
      stringifyCacheEntry(value),
      value
    ).then(() => {
      this.releaseLock(cacheKey);
    });
  }
  /**
   * Releases the lock for the given cache key.
   * Removes the lock from the instance's lock map.
   * Throws an error if the lock is not found.
   */
  releaseLock(cacheKey) {
    const lock2 = this.locks.get(cacheKey);
    if (lock2) {
      lock2.release();
      this.locks.delete(cacheKey);
    } else {
      throw new Error(`releaseLock: no lock found for ${cacheKey}`);
    }
  }
};
function stringifyCacheEntry(entry) {
  return JSON.stringify(
    serializeCacheEntry(entry),
    null,
    2
  );
}
function serializeCacheEntry(entry) {
  const { optimized, unoptimized } = entry;
  return {
    ...entry,
    ...optimized ? { optimized: bytesToHex(optimized.toCbor()) } : {},
    ...unoptimized ? { unoptimized: bytesToHex(unoptimized.toCbor()) } : {}
  };
}
function programFromCacheEntry(fromCache) {
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
  const o = optimized ? decodeUplcProgramV2FromCbor(optimized, {
    ir: optimizedIR,
    sourceMap: optimizedSmap
  }) : void 0;
  const u = unoptimized ? decodeUplcProgramV2FromCbor(unoptimized, {
    ir: unoptimizedIR,
    sourceMap: unoptimizedSmap
  }) : void 0;
  if (o) {
    if (u) {
      return o.withAlt(u);
    }
    return o;
  }
  if (!u) {
    throw new Error(
      `\u{1F422} No optimized or unoptimized program in cache entry: ${fromCache}`
    );
  }
  return u;
}
function deserializeHeliosCacheEntry(entry) {
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
  } = entry;
  return {
    optimized: optimized ? decodeUplcProgramV2FromCbor(optimized) : void 0,
    unoptimized: unoptimized ? decodeUplcProgramV2FromCbor(unoptimized) : void 0,
    optimizedSmap: optimizedSmap || void 0,
    //XXX it's already json-safe. deserializeUplcSourceMap(optimizedSmap).toJsonSafe() : undefined,
    unoptimizedSmap: unoptimizedSmap || void 0,
    //XXX it's already json-safe. deserializeUplcSourceMap(unoptimizedSmap).toJsonSafe(): undefined,
    optimizeOptions,
    version,
    createdBy,
    programElements,
    optimizedIR,
    unoptimizedIR
  };
}

// src/helios/CachedHeliosProgramFS.ts
var cacheStore = ".stellar/cache";
var CachedHeliosProgramFS = class extends CachedHeliosProgram {
  constructor(mainSource, props) {
    if (!existsSync(cacheStore)) {
      console.log(
        `\u{1F422}${CachedHeliosProgram.id} Creating helios compiler cache in ${cacheStore}`
      );
      mkdirSync(cacheStore, { recursive: true });
    }
    super(mainSource, props);
  }
  static checkFile(srcFilename) {
    return existsSync(srcFilename);
  }
  static async ifCached(cacheKey) {
    if (existsSync(`${cacheStore}/${cacheKey}`)) {
      const result = await readFile(`${cacheStore}/${cacheKey}`, "utf8");
      try {
        console.log(
          `\u{1F422}${this.id}: compiler cache entry: ${cacheKey}: ${result.length} bytes`
        );
        const parsed = JSON.parse(result);
        const { unoptimized, optimized } = parsed;
        console.log(
          `   unoptimized=${unoptimized?.length / 2} bytes, optimized=${optimized?.length / 2} bytes`
        );
      } catch (e) {
        console.log(
          `\u{1F422}${this.id}: parse error -> cache miss: ${cacheKey}`
        );
        return null;
      }
      return result;
    }
    console.log(`\u{1F422}${this.id}: compiler cache miss: ${cacheKey}`);
    return null;
  }
  static async acquireImmediateLock(cacheKey, props) {
    const filename = `${cacheStore}/${cacheKey}`;
    let created = false;
    if (!existsSync(filename)) {
      await writeFile(filename, "");
      created = true;
      console.log(
        `\u{1F422}${this.id}: compiler cache: create and lock ${cacheKey}`
      );
    }
    return lockfile.lock(filename, {
      stale: props.timeout,
      update: 1e3
    }).then((release) => {
      if (!created) {
        console.log(
          `\u{1F422}${this.id}: compiler cache: lock acquired for ${cacheKey}`
        );
      }
      return {
        lock: null,
        cacheKey,
        release
      };
    }).catch((err) => {
      if (created) {
        console.log(
          `\u{1F422}${this.id}: compiler cache: immediate lock not available for ${cacheKey}: ${err.message}`
        );
      }
      return null;
    });
  }
  static async acquireLock(cacheKey, props) {
    const filename = `${cacheStore}/${cacheKey}`;
    if (!existsSync(filename)) {
      await writeFile(filename, "");
      console.log(`\u{1F422}${this.id}: compiler cache: creating ${cacheKey}`);
    }
    return lockfile.lock(filename, {
      retries: {
        factor: 1.41,
        minTimeout: 200,
        maxTimeout: props.timeout,
        randomize: true,
        maxRetryTime: props.timeout
      },
      stale: 15e3,
      update: 1e3
    }).then((release) => {
      console.log(
        `\u{1F422}${this.id}: compiler cache: lock acquired for ${cacheKey}`
      );
      return {
        lock: null,
        cacheKey,
        release
      };
    });
  }
  static async cacheStore(key, value, object) {
    console.log(
      `\u{1F422}${this.id}: compiler cache: storing ${key}: ${value.length} bytes`
    );
    await writeFile(`${cacheStore}/${key}`, value);
    if (object.optimizedIR) {
      await writeFile(
        `${cacheStore}/${key}-ir-optimized`,
        object.optimizedIR
      );
    }
    if (object.unoptimizedIR) {
      await writeFile(
        `${cacheStore}/${key}-ir-unoptimized`,
        object.unoptimizedIR
      );
    }
  }
};
export {
  CachedHeliosProgramFS as HeliosProgramWithCacheAPI
};
//!!! todo work on this more
//# sourceMappingURL=HeliosProgramWithFSCache.mjs.map
