import { makeUplcSourceMap, decodeUplcProgramV2FromCbor } from '@helios-lang/uplc';
import { HeliosProgramWithCacheAPI } from '@donecollectively/stellar-contracts/HeliosProgramWithCacheAPI';
import { Program, extractName } from '@helios-lang/compiler';
import { bytesToHex, encodeUtf8, equalsBytes } from '@helios-lang/codec-utils';
import { blake2b } from '@helios-lang/crypto';
import { makeCast } from '@helios-lang/contract-utils';
import { makeMintingPolicyHash } from '@helios-lang/ledger';
import { e as environment } from './environment.mjs';

const redirecToCorrectConstructor = "\u{1F422}${this.id}: wrong direct use of new() constructor in CachedHeliosProgram; use forCurrentPlatform() instead";
class CachedHeliosProgram extends Program {
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
    //!!! todo work on this more
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
    let lock = weMustCompile || this.locks.get(cacheKey);
    if (!lock) {
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
    return this.acquireLock(cacheKey).then(async (lock) => {
      if (lock) {
        const cached = await this.ifCached(cacheKey);
        if (cached) {
          lock?.release();
          return cached;
        }
        this.locks.set(cacheKey, lock);
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
    return this.subclass.acquireLock(cacheKey, this.props).then((lock) => {
      this.locks.set(cacheKey, lock);
      return lock;
    });
  }
  /**
   * Acquires a lock for the given cache key if it can do so immediately.
   * Stores the lock in the instance's lock map.
   */
  async acquireImmediateLock(cacheKey) {
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
    const lock = this.locks.get(cacheKey);
    if (lock) {
      lock.release();
      this.locks.delete(cacheKey);
    } else {
      throw new Error(`releaseLock: no lock found for ${cacheKey}`);
    }
  }
}
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

const defaultNoDefinedModuleName = "\u2039default-needs-override\u203A";
const placeholderSetupDetails = {
  specialOriginatorLabel: "for abstract bundleClass",
  setup: {
    isMainnet: "mainnet" === environment.CARDANO_NETWORK
  }
};
let T__id = 0;
class HeliosScriptBundle {
  /**
   * an indicator of a Helios bundle that is intended to be used as a Capo contract
   * @remarks
   * the CapoHeliosBundle class overrides this to true.
   * @internal
   */
  static isCapoBundle = false;
  /**
   * set to true if the bundle depends on having a deployed capo's configuration details
   * @public
   */
  static needsCapoConfiguration = false;
  /**
   * the current revision of the bundle
   * @remarks
   * Allows forced incrementing of the on-chain policy script.  This supports test scenarios,
   * and allows the the bundle script to be swapped out even when nothing else is changed
   * (we don't have specific cases for this, but it's better to have and not need it, than to need
   * it and not have it)
   * @public
   */
  static currentRev = 1n;
  get rev() {
    return this.constructor.currentRev;
  }
  /**
   * an opt-in indicator of abstractness
   * @remarks
   * Subclasses that aren't intended for instantiation can set this to true.
   *
   * Subclasses that don't set this will not be treated as abstract.
   * @public
   */
  static isAbstract = void 0;
  // static get defaultParams() {
  //     return {};
  // }
  //
  // static currentRev = 1n;
  /**
   * Constructs a base class for any Helios script bundle,
   * given the class for an application-specific CapoHeliosBundle.
   * @remarks
   * The resulting class provides its own CapoHeliosBundle instance
   * for independent use (specifically, for compiling this bundle using
   * the dependency libraries provided by the Capo bundle).
   */
  //
  //     * NOTE: the following is NOT needed for efficiency, and not implemented
  //     *, as the Capo
  //     * bundle referenced above should never need to be compiled via
  //     * `this.capoBundle.program`.
  //     *
  //     * XXX - For application runtime purposes, it can ALSO accept a
  //     * XXX - CapoHeliosBundle instance as a constructor argument,
  //     * XXX - enabling lower-overhead instantiation and re-use across
  //     * XXX - various bundles used within a single Capo,
  //     */
  static usingCapoBundleClass(c, generic = false) {
    const cb = new c(placeholderSetupDetails);
    class aCapoBoundBundle extends HeliosScriptBundle {
      capoBundle = cb;
      constructor(setupDetails = placeholderSetupDetails) {
        super(setupDetails);
      }
      isConcrete = !!!generic;
    }
    return aCapoBoundBundle;
  }
  static create(setupDetails = placeholderSetupDetails) {
    const created = new this(setupDetails);
    created.init(setupDetails);
    return created;
  }
  capoBundle;
  isConcrete = false;
  configuredScriptDetails = void 0;
  /**
   * optional attribute explicitly naming a type for the datum
   * @remarks
   * This can be used if needed for a contract whose entry point uses an abstract
   * type for the datum; the type-bridge & type-gen system will use this data type
   * instead of inferring the type from the entry point.
   */
  datumTypeName;
  /**
   * optional attribute explicitly naming a type for the redeemer
   * @remarks
   * This can be used if needed for a contract whose entry point uses an abstract
   * type for the redeemer; the type-bridge & type-gen system will use this data type
   * instead of inferring the type from the entry point.
   */
  redeemerTypeName = "";
  isMainnet;
  _program = void 0;
  previousOnchainScript = void 0;
  _progIsPrecompiled = false;
  setup;
  setupDetails;
  ___id = T__id++;
  _didInit = false;
  _selectedVariant;
  debug = false;
  // scriptHash?: number[] | undefined;
  configuredUplcParams = void 0;
  configuredParams = void 0;
  precompiledScriptDetails;
  alreadyCompiledScript;
  constructor(setupDetails = placeholderSetupDetails) {
    this.setupDetails = setupDetails;
    this.configuredParams = setupDetails.params;
    this.setup = setupDetails.setup;
    this.isMainnet = this.setup.isMainnet;
    if (this.setup && "undefined" === typeof this.isMainnet) {
      debugger;
      throw new Error(
        `${this.constructor.name}: setup.isMainnet must be defined (debugging breakpoint available)`
      );
    }
  }
  get hasAnyVariant() {
    return true;
  }
  init(setupDetails) {
    const {
      deployedDetails,
      params,
      params: { delegateName, variant = "singleton" } = {},
      setup,
      scriptParamsSource = this.scriptParamsSource,
      previousOnchainScript,
      specialOriginatorLabel
    } = setupDetails;
    if (this.scriptParamsSource !== scriptParamsSource) {
      console.warn(
        `   -- ${this.constructor.name}: overrides scriptParamsSource (originator '${specialOriginatorLabel || "\u2039unknown\u203A"}')    '
        was ${this.scriptParamsSource}, now ${scriptParamsSource}`
      );
      this.scriptParamsSource = scriptParamsSource;
    }
    if (scriptParamsSource === "config") {
      if (params) {
        this.configuredParams = {
          ...params,
          ...this.params
        };
      } else {
        if (!specialOriginatorLabel) {
          debugger;
          throw new Error(
            `${this.constructor.name}: scriptParamsSource=config, but no program bundle, no script params`
          );
        }
        console.log(
          `special originator '${specialOriginatorLabel}' initializing with basic config`
        );
      }
    } else if (scriptParamsSource == "bundle") {
      if (!this.precompiledScriptDetails) {
        debugger;
        throw new Error(
          `${this.constructor.name}: scriptParamsSource=bundle without precompiled script details (originator '${specialOriginatorLabel || "\u2039unknown\u203A"}')`
        );
      }
      const thisVariant = this.precompiledScriptDetails[variant];
      if (!thisVariant) {
        const msg = `${this.constructor.name}: no precompiled variant '${variant}' (originator '${specialOriginatorLabel || "\u2039unknown\u203A"}') (dbpa)`;
        console.warn(
          `${msg}
  -- available variants: ${Object.keys(
            this.precompiledScriptDetails
          ).join(", ")}`
        );
        console.log(
          "configured variant should be in scriptBundle's 'params'"
        );
        debugger;
        throw new Error(msg);
      }
      this._selectedVariant = variant;
      const preConfig = thisVariant.config;
      preConfig.rev = BigInt(preConfig.rev || 1);
      if (preConfig.capoMph?.bytes) {
        preConfig.capoMph = makeMintingPolicyHash(
          preConfig.capoMph.bytes
        );
      }
      this.configuredParams = preConfig;
    } else if (this.scriptParamsSource != "none") {
      throw new Error(
        `unknown scriptParamsSource: ${this.scriptParamsSource} (${specialOriginatorLabel})`
      );
    }
    this._didInit = true;
  }
  get scriptHash() {
    const hash = this.previousOnchainScript?.uplcProgram.hash() || this.configuredScriptDetails?.scriptHash || this.alreadyCompiledScript?.hash();
    if (!hash) {
      console.log(
        "scriptHash called before program is loaded.  Call loadProgram() first (expensive!) if this is intentional"
      );
      const script = this.compiledScript();
      return script.hash();
    }
    return hash;
  }
  /**
   * deferred initialization of program details, preventing the need to
   * load the program prior to it actually being needed
   */
  initProgramDetails() {
    const { setupDetails } = this;
    const { deployedDetails, setup, previousOnchainScript } = setupDetails;
    let { params } = setupDetails;
    const {
      config
      // programBundle
    } = deployedDetails || {};
    if (previousOnchainScript) {
      this.previousOnchainScript = previousOnchainScript;
      return;
    }
    if (this.scriptParamsSource === "config") {
      if (params) {
        if (this.precompiledScriptDetails) {
          const { configuredParams } = this;
          const uplcPreConfig = this.paramsToUplc(configuredParams);
          const {
            params: { delegateName, ...otherParams }
          } = setupDetails;
          this.isConcrete = true;
          params = {
            ...otherParams,
            ...this.params
          };
          const uplcRuntimeConfig = this.paramsToUplc(params);
          let didFindProblem = "";
          for (const k of Object.keys(uplcPreConfig)) {
            const runtime = uplcRuntimeConfig[k];
            if (!runtime) continue;
            const pre = uplcPreConfig[k];
            if (!runtime.isEqual(pre)) {
              if (!didFindProblem) {
                console.warn(
                  `${this.constructor.name}: config mismatch between pre-config and runtime-config`
                );
                didFindProblem = k;
              }
              console.warn(
                `\u2022 ${k}:  pre-config: `,
                configuredParams[k] || (pre.rawData ?? pre),
                ` at runtime:`,
                params[k] || (runtime.rawData ?? runtime)
              );
            }
          }
          if (didFindProblem) {
            throw new Error(
              `runtime-config conflicted with pre-config (see logged details) at key ${didFindProblem}`
            );
          }
        } else {
          params = {
            ...params,
            ...this.params
          };
        }
        this.configuredParams = params;
        this.configuredUplcParams = this.paramsToUplc(params);
      }
    } else if (this.scriptParamsSource == "bundle") {
      const selectedVariant = "singleton";
      this.configuredParams = this.getPreconfiguredVariantParams(selectedVariant);
      if (this.configuredParams) {
        this.configuredUplcParams = this.getPreconfiguredUplcParams(selectedVariant);
      }
    } else if (this.scriptParamsSource != "none") {
      throw new Error(
        `unknown scriptParamsSource: ${this.scriptParamsSource}`
      );
    }
  }
  // XXinitProgramDetails() {
  //     const {setupDetails} = this;
  //     // if (!setupDetails?.params) {
  //     //     debugger
  //     //     console.warn(`setupDetails/params not set (dbpa)`);
  //     // }
  //     const {
  //         deployedDetails,
  //         params,
  //         params: { delegateName, variant = "singleton" } = {},
  //         setup,
  //         previousOnchainScript
  //     } = setupDetails;
  //     const { config,
  //         // programBundle
  //     } = deployedDetails || {};
  //     if (previousOnchainScript) {
  //         this.previousOnchainScript = previousOnchainScript;
  //         this.scriptHash = previousOnchainScript.uplcProgram.hash();
  //             // "string" === typeof deployedDetails?.scriptHash
  //             //     ? hexToBytes(deployedDetails.scriptHash)
  //             //     : deployedDetails?.scriptHash;
  //         return;
  //     }
  //     if (this.scriptParamsSource === "config") {
  //         debugger;
  //         // WHERE TO GET THE PROGRAM BUNDLE IN THIS CASE??
  //         //   IS IT MAYBE ALREADY COMPILED?
  //         if (false) { //programBundle) {
  //         //     if (!scriptHash)
  //         //         throw new Error(
  //         //     `${this.constructor.name}: missing deployedDetails.scriptHash`
  //         // );
  //             // debugger; // do we need to cross-check config <=> params ?
  //             this.configuredParams = config;
  //             this.configuredUplcParams = this.paramsToUplc(config);
  //             // change to preCompiledRawProgram,
  //             // and use async getPreCompiledProgram(variant)
  //             //    to get either this raw program or async-imported program data
  //             this.precompiledScriptDetails = {
  //                 singleton: {
  //                     // programBundle,
  //                 config
  //             },
  //             };
  //             // this.precompiledBundle = programBundle;
  //         } else if (params) {
  //             if (this.precompiledScriptDetails) {
  //                 // change to async getPreCompiledProgram(variant)
  //                 const thisVariant = this.precompiledScriptDetails[variant];
  //                 if (!thisVariant) {
  //                     const msg = `${this.constructor.name}: no precompiled variant '${variant}'`;
  //                     console.warn(
  //                         `${msg}\n  -- available variants: ${Object.keys(
  //                             this.precompiledScriptDetails
  //                         ).join(", ")}`
  //                     );
  //                     console.log(
  //                         "configured variant should be in scriptBundle's 'params'"
  //                     );
  //                     throw new Error(msg);
  //                 }
  //                 this._selectedVariant = variant;
  //                 debugger
  //                 const preConfig = thisVariant.config;
  //                 preConfig.rev = BigInt(preConfig.rev);
  //                 if (preConfig.capoMph?.bytes) {
  //                     preConfig.capoMph = makeMintingPolicyHash(
  //                         preConfig.capoMph.bytes
  //                     );
  //                 }
  //                 const uplcPreConfig = this.paramsToUplc(preConfig);
  //                 // omits delegateName from the strict checks
  //                 //  ... it's provided by the bundle, which the
  //                 //  ... off-chain wrapper class may not have access to.
  //                 const {
  //                     params: { delegateName, ...params },
  //                 } = setupDetails;
  //                 this.isConcrete = true;
  //                 const uplcRuntimeConfig = this.paramsToUplc(params);
  //                 let didFindProblem: string = "";
  //                 for (const k of Object.keys(uplcPreConfig)) {
  //                     const runtime = uplcRuntimeConfig[k];
  //                     // skips past any runtime setting that was not explicitly set
  //                     if (!runtime) continue;
  //                     const pre = uplcPreConfig[k];
  //                     if (!runtime.isEqual(pre)) {
  //                         if (!didFindProblem) {
  //                             console.warn(
  //                                 `${this.constructor.name}: config mismatch between pre-config and runtime-config`
  //                             );
  //                             didFindProblem = k;
  //                         }
  //                         console.warn(
  //                             `• ${k}:  pre-config: `,
  //                             preConfig[k] || (pre.rawData ?? pre),
  //                             ` at runtime:`,
  //                             params[k] || (runtime.rawData ?? runtime)
  //                         );
  //                     }
  //                 }
  //                 if (didFindProblem) {
  //                     throw new Error(
  //                         `runtime-config conflicted with pre-config (see logged details) at key ${didFindProblem}`
  //                     );
  //                 }
  //             }
  //             // moved to init
  //             // this.configuredParams = setupDetails.params;
  //             this.configuredUplcParams = this.paramsToUplc(
  //                 setupDetails.params
  //             );
  //         } else if (!setup.isPlaceholder) {
  //             debugger
  //             throw new Error(
  //                 `${this.constructor.name}: scriptParamsSource=config, but no program bundle, no script params`
  //             );
  //         }
  //     } else if (this.scriptParamsSource == "mixed") {
  //         debugger;
  //         const {params} = setupDetails
  //         if (this.configuredParams) {
  //             debugger;
  //             throw new Error(
  //                 `unreachable: configuredParameters used without deployedDetails? (dbpa)`
  //             );
  //         }
  //     } else if (this.scriptParamsSource == "bundle") {
  //         // the bundle has its own built-in params
  //         // temp singleton
  //         const selectedVariant = "singleton";
  //         this.configuredParams =
  //             this.getPreconfiguredVariantParams(selectedVariant);
  //         if (this.configuredParams) {
  //             this.configuredUplcParams =
  //                 this.getPreconfiguredUplcParams(selectedVariant);
  //         }
  //     } else {
  //         throw new Error(`unknown scriptParamsSource: ${this.scriptParamsSource}`);
  //     }
  // }
  get isPrecompiled() {
    if (this.scriptParamsSource == "bundle") {
      return true;
    }
    if (!!this.configuredScriptDetails) {
      debugger;
      if (this.setupDetails.specialOriginatorLabel) {
        return false;
      }
      console.warn(
        `scriptParamsSource is not 'bundle'; isPrecompiled() returns false for originator '${this.setupDetails.specialOriginatorLabel || "\u2039unknown\u203A"}'`
      );
      throw new Error(`check isPrecompiled() logic here`);
    }
    return false;
  }
  // !!! deprecate or change to async? (-> loadPrecompiledVariant() -> programFromCacheEntry())
  getPreCompiledBundle(variant) {
    throw new Error("deprecated");
  }
  getPreconfiguredVariantParams(variantName) {
    const p = this.variants?.[variantName] || this.params;
    return p;
  }
  getPreconfiguredUplcParams(variantName) {
    const p = this.getPreconfiguredVariantParams(variantName);
    if (!p) return void 0;
    return this.paramsToUplc(p);
  }
  // these should be unnecessary if we arrange the rollup plugin
  // ... to watch the underlying helios files for changes that would affect the bundle
  // checkDevReload() {
  //     const env = process.env.NODE_ENV;
  //     if (env !== "test" && env !== "development") {
  //         console.log("disabling module reloading in non-dev environment");
  //         return
  //     }
  //     this.reloadModule(this.main);
  //     for (const module of this.modules) {
  //         this.reloadModule(module)
  //     }
  // }
  // reloadModule(module: HeliosModuleSrc) {
  //     // treat module.name as a filename.
  //     // check if it can be opened as a file.
  //     // reassign module.content to the file's contents.
  //     if (existsSync(module.name)) {
  //         console.log(`bundle module load: ${module.name}`);
  //         const newContent = readFileSync(module.name, "utf8");
  //         if (module.content !== newContent) {
  //             console.log(`♻️ module reload: ${module.name}`);
  //             module.content = newContent;
  //         }
  //     }
  // }
  get params() {
    return void 0;
  }
  /**
   * The known variants of this contract script, with any contract
   * parameters applicable to each variant.  By default, there is a
   * singleton variant that uses the result of `get params()`.
   */
  get variants() {
    return { singleton: this.params };
  }
  get main() {
    throw new Error(
      `${this.constructor.name}: get main() must be implemented in subclass`
    );
  }
  /**
   * A list of modules always available for import to Capo-hosted policy scripts
   * @public
   */
  implicitIncludedCapoModules() {
    return [
      "CapoMintHelpers",
      "CapoDelegateHelpers",
      "StellarHeliosHelpers",
      "CapoHelpers"
    ];
  }
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
  includeFromCapoModules() {
    return [];
  }
  /**
   * Computes a list of modules to be provided to the Helios compiler
   * @remarks
   * includes any explicit `modules` from your script bundle, along with any
   * modules, provided by your Capo and listed by name in your
   * `includeFromCapoModules()` method.
   * @public
   */
  getEffectiveModuleList() {
    if (!this.capoBundle) {
      return [...this.modules];
    }
    return [...this.resolveCapoIncludedModules(), ...this.modules];
  }
  resolveCapoIncludedModules() {
    const includeList = [
      ...this.implicitIncludedCapoModules(),
      ...this.includeFromCapoModules()
    ];
    const unsatisfiedIncludes = new Set(includeList);
    const capoModules = this.capoBundle.modules;
    if (!capoModules) {
      throw new Error(
        `${this.capoBundle.constructor.name}: no modules() list defined`
      );
    }
    const capoIncludedModules = capoModules.filter((x) => {
      const mName = x.moduleName;
      const found = includeList.includes(mName);
      unsatisfiedIncludes.delete(mName);
      return found;
    });
    if (unsatisfiedIncludes.size) {
      throw new Error(
        `${this.displayName}: includeFromCapoModules() includes modules not provided by the Capo:
 ${Array.from(
          unsatisfiedIncludes
        ).map((m) => `   \u2022 ${m}
`).join("\n")}`
      );
    }
    return capoIncludedModules;
  }
  logModuleDetails() {
    const capoIncludedModules = this.resolveCapoIncludedModules();
    function moduleDetails(m) {
      const pInfo = m.project ? ` [in ${m.project}]/` : "";
      return `    \u2022 ${m.moduleName}${pInfo}${m.name} (${m.content.length} chars)`;
    }
    console.log(
      `
Modules in ${this.displayName}:
 \u2022 includeFromCapoModules(): ${this.includeFromCapoModules().join(
        ", "
      )}
 \u2022 implicit Capo modules:    ${this.implicitIncludedCapoModules().join(
        ", "
      )}
 \u2022 modules from Capo: 
${capoIncludedModules.map(moduleDetails).join("\n")}
 \u2022 get modules() (${this.modules.length}): 
${this.modules.map(moduleDetails).join("\n")}`
    );
  }
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
  get modules() {
    return [];
  }
  get displayName() {
    return this.moduleName || this.program.name;
  }
  get bridgeClassName() {
    const mName = this.displayName;
    return `${mName}DataBridge`;
  }
  /**
   * indicates whether the script should be optimized.
   * @remarks
   * Defaults to the general optimize setting provided by the factoryArgs.
   * Override to force optimization on or off.
   */
  get optimize() {
    return this.setup.optimize ?? true;
  }
  get moduleName() {
    return this.constructor.name.replace(/Bundle/, "").replace(/Helios/, "");
  }
  /**
   * Sets the currently-selected variant for this bundle, asserting its presence
   * in the `variants()` list.
   */
  withVariant(vn) {
    if (!this.variants) {
      throw new Error(
        `variants not defined for ${this.constructor.name}`
      );
    }
    const foundVariant = this.variants[vn] ?? this.precompiledScriptDetails?.[vn];
    if (!foundVariant) {
      throw new Error(
        `${this.constructor.name}: variant ${vn} not found in variants()`
      );
    }
    if (this._selectedVariant) {
      throw new Error(
        `we aren't sharing variants on a single bundle instance, right?`
      );
    }
    this._selectedVariant = vn;
    return this;
  }
  previousCompiledScript() {
    const { uplcProgram, validatorHash } = this.previousOnchainScript || {};
    if (!uplcProgram) return void 0;
    if (!validatorHash) return void 0;
    const actualHash = uplcProgram.hash();
    if (!equalsBytes(validatorHash, actualHash)) {
      throw new Error(
        `script hash mismatch: ${bytesToHex(
          validatorHash
        )} != ${bytesToHex(actualHash)}`
      );
    }
    return uplcProgram;
  }
  async loadPrecompiledVariant(variant) {
    debugger;
    throw new Error(
      `${this.constructor.name}: Dysfunctional bundler bypass (loadPrecompiledVariant() not found) (dbpa)`
    );
  }
  compiledScript(asyncOk) {
    const { setup, previousOnchainScript, _program: loadedProgram } = this;
    if (this.alreadyCompiledScript) {
      return this.alreadyCompiledScript;
    }
    let program = loadedProgram;
    if (!asyncOk) {
      throw new Error(
        `compiledScript() must be called with asyncOk=true when the script is not already loaded`
      );
    }
    if (this.isPrecompiled) {
      const { singleton } = this.precompiledScriptDetails;
      if (singleton && !this._selectedVariant) {
        this.withVariant("singleton");
      }
      const detailsForVariant = this.precompiledScriptDetails?.[this._selectedVariant];
      return this.loadPrecompiledVariant(this._selectedVariant).then(
        (programForVariant) => {
          if (!detailsForVariant || !programForVariant) {
            throw new Error(
              `${this.constructor.name}: variant ${this._selectedVariant} not found in preCompiled`
            );
          }
          const bundleForVariant = {
            ...detailsForVariant,
            programBundle: programForVariant
          };
          const p = this.alreadyCompiledScript = programFromCacheEntry(bundleForVariant.programBundle);
          return p;
        }
      );
    }
    if (!this.configuredParams || !setup) {
      debugger;
      throw new Error(
        `${this.constructor.name}: missing required params or setup for compiledScript() (debugging breakpoint available)`
      );
    }
    program = this.loadProgram();
    const params = this.configuredUplcParams;
    const maybeOptimizing = this.optimize ? "and optimizing " : "";
    console.warn(
      `${this.constructor.name}: compiling ${maybeOptimizing}helios script.  This could take 30s or more... `
    );
    const t = (/* @__PURE__ */ new Date()).getTime();
    const rawValues = {};
    if (params) {
      for (const [p, v] of Object.entries(params)) {
        program.changeParam(p, v);
        rawValues[p] = v.rawData;
      }
    }
    const net = this.isMainnet ? "mainnet" : "testnet";
    console.log(
      `(${net}) ${this.moduleName} with params:
`,
      Object.fromEntries(
        Object.entries(program.entryPoint.paramsDetails()).map(
          ([k, uplcVal]) => {
            return [k, [uplcVal, rawValues[k]?.toString()].flat()];
          }
        )
      )
    );
    console.log(
      new Error(
        `(special originator ${this.setupDetails.specialOriginatorLabel || "\u2039unknown\u203A"} where?)`
      ).stack
    );
    return program.compileWithCache({
      optimize: this.optimize
    }).then((uplcProgram) => {
      this.alreadyCompiledScript = uplcProgram;
      const scriptHash = bytesToHex(uplcProgram.hash());
      console.log(
        program.compileTime || `compiled: ${(/* @__PURE__ */ new Date()).getTime() - t}ms`,
        `-> ${scriptHash}`
      );
      return uplcProgram;
    });
  }
  // !!! deprecate or change to async? (-> loadPrecompiledVariant() -> programFromCacheEntry())
  get preBundledScript() {
    throw new Error("deprecated");
  }
  async getSerializedProgramBundle() {
    const compiledScript = await this.compiledScript(true);
    const cacheEntry = this.program.cacheEntry;
    if (!cacheEntry) throw new Error(`missing cacheEntry`);
    const serializedCacheEntry = serializeCacheEntry(cacheEntry);
    const {
      programElements,
      version,
      optimizeOptions,
      optimized,
      unoptimized,
      optimizedIR,
      unoptimizedIR,
      optimizedSmap,
      unoptimizedSmap
    } = serializedCacheEntry;
    return {
      scriptHash: bytesToHex(compiledScript.hash()),
      programBundle: {
        programElements,
        version,
        optimized,
        unoptimized,
        optimizedIR,
        unoptimizedIR,
        optimizedSmap,
        unoptimizedSmap
      }
    };
  }
  decodeAnyPlutusUplcProgram(version, cborHex, ir, sourceMap, alt) {
    if (version === "PlutusV2") {
      if (alt && alt.plutusVersion != "PlutusScriptV2") {
        throw new Error(
          `expected alt script to have matching Plutus V2, not ${alt.plutusVersion}`
        );
      }
      return decodeUplcProgramV2FromCbor(cborHex, {
        ir,
        sourceMap,
        alt
      });
    } else if (version === "PlutusV3") {
      throw new Error(`Plutus V3 not yet supported`);
    } else {
      throw new Error(`unexpected Plutus version ${version}`);
    }
  }
  /**
   * provides a temporary indicator of mainnet-ness, while not
   * requiring the question to be permanently resolved.
   */
  isDefinitelyMainnet() {
    return this.isMainnet ?? false;
  }
  get program() {
    if (!this._program) {
      debugger;
      throw new Error(
        "call loadProgram() (a one-time expense) before accessing this.program (dbpa)"
      );
    }
    return this._program;
  }
  loadProgram() {
    if (this._program) {
      if (this.isPrecompiled != this._progIsPrecompiled || this.setup?.isMainnet !== this.isMainnet) {
        throw new Error("unused code path? program cache busting");
      } else {
        return this._program;
      }
    }
    const isMainnet = this.setup?.isMainnet ?? false;
    const isTestnet = !isMainnet;
    const ts1 = Date.now();
    let mName = this.moduleName;
    if (mName === defaultNoDefinedModuleName) {
      mName = "";
    }
    const moduleSources = this.getEffectiveModuleList();
    if (!isTestnet) {
      debugger;
    }
    try {
      console.warn(`${this.constructor.name}: loading program`);
      const p = new HeliosProgramWithCacheAPI(this.main, {
        isTestnet,
        moduleSources,
        name: mName
        // it will fall back to the program name if this is empty
      });
      this._program = p;
      this.initProgramDetails();
      this._progIsPrecompiled = this.isPrecompiled;
      console.log(
        `\u{1F4E6} ${mName}: loaded & parsed ${this.isPrecompiled ? "w/ pre-compiled program" : "for type-gen"}: ${Date.now() - ts1}ms`
        // new Error(`stack`).stack
      );
      return p;
    } catch (e) {
      if (e.message.match(/invalid parameter name/)) {
        debugger;
        throw new Error(
          e.message + `
   ... this typically occurs when your StellarContract class (${this.constructor.name})
   ... can be missing a getContractScriptParams() method 
   ... to map from the configured settings to contract parameters`
        );
      }
      const [unsetConst, constName] = e.message.match(/used unset const '(.*?)'/) || [];
      if (unsetConst) {
        console.log(e.message);
        throw new Error(
          `${this.constructor.name}: missing required script param '${constName}' in static getDefaultParams() or getContractScriptParams()`
        );
      }
      if (!e.site) {
        console.error(
          `unexpected error while compiling helios program (or its imported module): ${mName || this.main.name}
> ${e.message}
(debugging breakpoint available)
This likely indicates a problem in Helios' error reporting - 
   ... please provide a minimal reproducer as an issue report for repair!

` + e.stack.split("\n").slice(1).join("\n")
        );
        try {
          debugger;
          const try2 = new HeliosProgramWithCacheAPI(this.main, {
            isTestnet,
            moduleSources,
            name: mName
            // it will fall back to the program name if this is empty
          });
          console.warn("NOTE: no error thrown on second attempt");
        } catch (sameError) {
        }
      }
      debugger;
      const [_, notFoundModule] = e.message.match(/module '(.*)' not found/) || [];
      if (notFoundModule) {
        this.logModuleDetails();
        console.log(
          `${this.constructor.name} module '${notFoundModule}' not found; see module details above`
        );
      }
      if (!e.site) {
        console.warn(
          "error thrown from helios doesn't have source site info; rethrowing it"
        );
        throw e;
      }
      const moduleName2 = e.site.file;
      const errorModule = [this.main, ...moduleSources].find(
        (m) => m.name == moduleName2
      );
      const {
        project,
        moduleName,
        name: srcFilename = "\u2039unknown path to module\u203A",
        moreInfo
      } = errorModule || {};
      let errorInfo = "";
      if (!HeliosProgramWithCacheAPI.checkFile(srcFilename)) {
        const indent = " ".repeat(6);
        errorInfo = project ? `
${indent}Error found in project ${project}:${srcFilename}
${indent}- in module ${moduleName}:
${moreInfo}
${indent}  ... this can be caused by not providing correct types in a module specialization,
${indent}  ... or if your module definition doesn't include a correct path to your helios file
` : `
${indent}WARNING: the error was found in a Helios file that couldn't be resolved in your project
${indent}  ... this can be caused if your module definition doesn't include a correct path to your helios file
${indent}  ... (possibly in mkHeliosModule(heliosCode, 
${indent}    "${srcFilename}"
${indent})
`;
      }
      const { startLine, startColumn } = e.site;
      const t = new Error(errorInfo);
      const modifiedStack = t.stack.split("\n").slice(1).join("\n");
      debugger;
      const additionalErrors = (e.otherErrors || []).slice(1).map(
        (oe) => `       |         \u26A0\uFE0F  also: ${// (oe.message as string).replace(e.site.file, "")}`);
        oe.site.file == e.site.file ? oe.site.toString().replace(e.site.file + ":", "at ") + ": " + oe.originalMessage : oe.site.toString() + " - " + oe.originalMessage}`
      );
      const addlErrorText = additionalErrors.length ? ["", ...additionalErrors, "       v"].join("\n") : "";
      t.message = `${e.kind}: ${this.constructor.name}
${e.site.toString()} - ${e.originalMessage}${addlErrorText}
${errorInfo}`;
      t.stack = `${this.constructor.name}: ${e.message}
    at ${moduleName2} (${srcFilename}:${1 + startLine}:${1 + startColumn})
` + modifiedStack;
      throw t;
    }
  }
  isHeliosScriptBundle() {
    return true;
  }
  addTypeProxies() {
  }
  effectiveDatumTypeName() {
    return this.datumTypeName || this.locateDatumType()?.name || "\u2039unknown datum-type name\u203A";
  }
  /**
   * @internal
   */
  locateDatumType() {
    let datumType;
    const program = this.loadProgram();
    const programName = program.name;
    const argTypes = program.entryPoint.mainArgTypes;
    const argCount = argTypes.length;
    if (argCount === 2) {
      datumType = argTypes[0];
    }
    if (this.datumTypeName) {
      datumType = program.entryPoint.userTypes[programName][this.datumTypeName];
      if (!datumType) {
        throw new Error(
          `${this.constructor.name}.datumTypeName=\`${this.datumTypeName}\` not found in userTypes of script program ${programName}`
        );
      }
    }
    return datumType;
  }
  /**
   * @internal
   */
  locateRedeemerType() {
    const program = this.program;
    const argTypes = program.entryPoint.mainArgTypes;
    const argCount = argTypes.length;
    let redeemerType;
    if (argCount === 2) {
      redeemerType = argTypes[1];
    } else {
      redeemerType = argTypes[0];
    }
    if (this.redeemerTypeName) {
      const programName = program.name;
      redeemerType = program.entryPoint.userTypes[programName][this.redeemerTypeName];
      if (!redeemerType) {
        throw new Error(
          `${this.constructor.name}.redeemerTypeName=\`${this.redeemerTypeName}\` not found in userTypes of script program ${programName}`
        );
      }
    }
    return redeemerType;
  }
  get includeEnums() {
    return [];
  }
  /**
   * @internal
   */
  getTopLevelTypes() {
    const types = {
      datum: this.locateDatumType(),
      redeemer: this.locateRedeemerType()
    };
    const program = this.program;
    const { userTypes } = program;
    const { mainModule } = program.entryPoint;
    const mainTypes = userTypes[mainModule.name.value];
    for (const [typeName, type] of Object.entries(mainTypes)) {
      const s = type.toSchema();
      if (s.kind == "struct") {
        types[typeName] = type;
      }
      if (s.kind == "enum" && this.includeEnums.includes(typeName)) {
        types[typeName] = type;
      }
    }
    if (userTypes.specializedDelegate) {
      const specializationName = this.moduleName;
      const specializationTypes = userTypes[specializationName];
      if (!specializationTypes) {
        console.log(
          "NOTE: the module name for the delegate policy script must match bundle's moduleName"
        );
        debugger;
        throw new Error(
          `specialization types not found for ${this.moduleName} in program ${program.name} (debugging breakpoint available)`
        );
      }
      for (const [typeName, type] of Object.entries(
        specializationTypes
      )) {
        const s = type.toSchema();
        if (s.kind == "struct") {
          types[typeName] = type;
        }
        if (s.kind == "enum" && this.includeEnums.includes(typeName)) {
          types[typeName] = type;
        }
      }
    }
    return types;
  }
  /**
   * @internal
   */
  paramsToUplc(params) {
    const namespace = this.program.name;
    const { paramTypes } = this.program;
    return Object.fromEntries(
      Object.entries(params).map(([paramName, data]) => {
        const fullName = `${namespace}::${paramName}`;
        const thatType = paramTypes[fullName];
        if (!thatType) {
          const availableParams = Object.entries(
            paramTypes
          ).reduce((acc, [k, v]) => {
            const [ns, name] = k.split("::");
            if (!acc[ns]) acc[ns] = [];
            acc[ns].push(name);
            return acc;
          }, {});
          const availableScriptParams = Object.entries(
            availableParams
          ).map(
            ([ns, names]) => `  ${ns}::{${names.join(", ")}}`
          ).join("\n");
          if (paramName == "0") {
            throw new Error(
              `numeric param name is probably wrong`
            );
          }
          if (paramName = "addrHint") {
            return void 0;
          }
          throw new Error(
            `invalid script-parameter '${paramName}' in namespace '${namespace}' 
  ... expected one of: ${availableScriptParams}`
          );
        }
        return [
          fullName,
          this.typeToUplc(thatType, data, `params[${fullName}]`)
        ];
      }).filter((x) => !!x)
    );
  }
  /**
   * @internal
   */
  typeToUplc(type, data, path = "") {
    const schema = type.toSchema();
    if (!this.setup) {
      debugger;
    }
    const isMainnet = this.setup.isMainnet;
    if ("undefined" == typeof isMainnet) {
      throw new Error(
        `${this.constructor.name}: isMainnet must be defined in the setup`
      );
    }
    const cast = makeCast(schema, {
      isMainnet,
      unwrapSingleFieldEnumVariants: true
    });
    return cast.toUplcData(data, path);
  }
}

export { HeliosScriptBundle, defaultNoDefinedModuleName, placeholderSetupDetails };
//# sourceMappingURL=HeliosBundle.mjs.map
