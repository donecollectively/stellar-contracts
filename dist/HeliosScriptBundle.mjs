import { makeUplcSourceMap, decodeUplcProgramV2FromCbor, makeByteArrayData } from '@helios-lang/uplc';
import { HeliosProgramWithCacheAPI } from '@donecollectively/stellar-contracts/HeliosProgramWithCacheAPI';
import { Program, extractName } from '@helios-lang/compiler';
import { bytesToHex, encodeUtf8, isValidUtf8, decodeUtf8, equalsBytes } from '@helios-lang/codec-utils';
import { blake2b, encodeBech32 } from '@helios-lang/crypto';
import { makeCast } from '@helios-lang/contract-utils';
import { makeValue, makeAssets, makeNetworkParamsHelper, makeAddress, makeMintingPolicyHash } from '@helios-lang/ledger';
import { makeTxBuilder, makeTxChainBuilder, makeWalletHelper } from '@helios-lang/tx-utils';
import { customAlphabet } from 'nanoid';
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
    const cacheKey = this.getCacheKey(options);
    const fromCache = await this.getFromCache(cacheKey);
    if (fromCache) {
      console.log(`\u{1F422}${this.id}: ${cacheKey}: from cache`);
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
      const uplcProgram = this.compile(options);
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

class UplcConsoleLogger {
  didStart = false;
  lines = [];
  lastMessage = "";
  lastReason;
  history = [];
  constructor() {
    this.logPrint = this.logPrint.bind(this);
    this.reset = this.reset.bind(this);
  }
  reset(reason) {
    this.lastMessage = "";
    this.lastReason = reason;
    if (reason == "build") {
      this.lines = [];
      return;
    }
    if (reason == "validate") {
      this.flush();
      return;
    }
  }
  // log(...msgs: string[]) {
  //     return this.logPrint(...msgs);
  // }
  // error(...msgs: string[]) {
  //     return this.logError(...msgs, "\n");
  // }
  // logPrintLn(...msgs: string[]) {
  //     return this.logPrint(...msgs, "\n");
  // }
  logPrint(message, site) {
    if ("string" != typeof message) {
      console.log("wtf");
    }
    if (message && message.at(-1) != "\n") {
      message += "\n";
    }
    this.lastMessage = message;
    this.lines.push(message);
    return this;
  }
  logError(message, stack) {
    this.logPrint("\n");
    this.logPrint(
      "-".repeat((process?.stdout?.columns || 65) - 8)
    );
    this.logPrint("--- \u26A0\uFE0F  ERROR: " + message.trimStart() + "\n");
    this.logPrint(
      "-".repeat((process?.stdout?.columns || 65) - 8) + "\n"
    );
  }
  // printlnFunction(msg) {
  //     console.log("                              ---- println")
  //     this.lines.push(msg);
  //     this.lines.push("\n");
  //     this.flushLines();
  // }
  toggler = 0;
  toggleDots() {
    this.toggler = 1 - this.toggler;
  }
  get isMine() {
    return true;
  }
  resetDots() {
    this.toggler = 0;
  }
  showDot() {
    const s = this.toggler ? "\u2502   \u250A " : "\u2502 \u25CF \u250A ";
    this.toggleDots();
    return s;
  }
  fullHistory() {
    return this.history.join("\n");
  }
  formattedHistory = [];
  fullFormattedHistory() {
    return this.formattedHistory.join("\n");
  }
  flushLines(footerString) {
    let content = [];
    const terminalWidth = process?.stdout?.columns || 65;
    const thisBatch = this.lines.join("").trimEnd();
    this.history.push(thisBatch);
    if (!this.didStart) {
      this.didStart = true;
      content.push("\u256D\u2508\u2508\u2508\u252C" + "\u2508".repeat(terminalWidth - 5));
      this.resetDots();
    } else if (this.lines.length) {
      content.push("\u251C\u2508\u2508\u2508\u253C" + "\u2508".repeat(terminalWidth - 5));
      this.resetDots();
    }
    for (const line of thisBatch.split("\n")) {
      content.push(`${this.showDot()}${line}`);
    }
    content.push(this.showDot());
    if (!this.toggler) {
      content.push(this.showDot());
    }
    if (footerString) {
      content.push(footerString);
    }
    const joined = content.join("\n");
    this.formattedHistory.push(joined);
    console.log(joined);
    this.lines = [];
  }
  finish() {
    this.flushLines(
      "\u2570\u2508\u2508\u2508\u2534" + "\u2508".repeat((process?.stdout?.columns || 65) - 5)
    );
    return this;
  }
  flush() {
    if (this.lines.length) {
      if (this.lastMessage.at(-1) != "\n") {
        this.lines.push("\n");
      }
      this.flushLines();
    }
    return this;
  }
  flushError(message = "") {
    if (this.lastMessage.at(-1) != "\n") {
      this.lines.push("\n");
    }
    if (message.at(-1) == "\n") {
      message = message.slice(0, -1);
    }
    const terminalWidth = process?.stdout?.columns || 65;
    if (message) this.logError(message);
    if (this.lines.length) {
      this.flushLines(
        "\u23BD\u23BC\u23BB\u23BA\u23BB\u23BA\u23BC\u23BC\u23BB\u23BA\u23BB\u23BD\u23BC\u23BA\u23BB\u23BB\u23BA\u23BC\u23BC\u23BB\u23BA".repeat((terminalWidth - 2) / 21)
      );
    }
    return this;
  }
}

let p = process || {}, argv = p.argv || [], env = p.env || {};
let isColorSupported = !(!!env.NO_COLOR || argv.includes("--no-color")) && (!!env.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || true);
let formatter = (open, close, replace = open) => {
  const f = (input) => {
    let string = "" + input, index = string.indexOf(close, open.length);
    return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
  };
  f.start = open;
  f.close = close;
  return f;
};
let replaceClose = (string, close, replace, index) => {
  let result = "", cursor = 0;
  do {
    result += string.substring(cursor, index) + replace;
    cursor = index + close.length;
    index = string.indexOf(close, cursor);
  } while (~index);
  return result + string.substring(cursor);
};
let createColors = (enabled = isColorSupported) => {
  let f = enabled ? formatter : () => String;
  return {
    isColorSupported: enabled,
    reset: f("\x1B[0m", "\x1B[0m"),
    bold: f("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
    dim: f("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
    italic: f("\x1B[3m", "\x1B[23m"),
    underline: f("\x1B[4m", "\x1B[24m"),
    inverse: f("\x1B[7m", "\x1B[27m"),
    hidden: f("\x1B[8m", "\x1B[28m"),
    strikethrough: f("\x1B[9m", "\x1B[29m"),
    black: f("\x1B[30m", "\x1B[39m"),
    red: f("\x1B[31m", "\x1B[39m"),
    green: f("\x1B[32m", "\x1B[39m"),
    yellow: f("\x1B[33m", "\x1B[39m"),
    blue: f("\x1B[34m", "\x1B[39m"),
    magenta: f("\x1B[35m", "\x1B[39m"),
    cyan: f("\x1B[36m", "\x1B[39m"),
    white: f("\x1B[37m", "\x1B[39m"),
    gray: f("\x1B[90m", "\x1B[39m"),
    bgBlack: f("\x1B[40m", "\x1B[49m"),
    bgRed: f("\x1B[41m", "\x1B[49m"),
    bgGreen: f("\x1B[42m", "\x1B[49m"),
    bgYellow: f("\x1B[43m", "\x1B[49m"),
    bgBlue: f("\x1B[44m", "\x1B[49m"),
    bgMagenta: f("\x1B[45m", "\x1B[49m"),
    bgCyan: f("\x1B[46m", "\x1B[49m"),
    bgWhite: f("\x1B[47m", "\x1B[49m"),
    blackBright: f("\x1B[90m", "\x1B[39m"),
    redBright: f("\x1B[91m", "\x1B[39m"),
    greenBright: f("\x1B[92m", "\x1B[39m"),
    yellowBright: f("\x1B[93m", "\x1B[39m"),
    blueBright: f("\x1B[94m", "\x1B[39m"),
    magentaBright: f("\x1B[95m", "\x1B[39m"),
    cyanBright: f("\x1B[96m", "\x1B[39m"),
    whiteBright: f("\x1B[97m", "\x1B[39m"),
    bgBlackBright: f("\x1B[100m", "\x1B[49m"),
    bgRedBright: f("\x1B[101m", "\x1B[49m"),
    bgGreenBright: f("\x1B[102m", "\x1B[49m"),
    bgYellowBright: f("\x1B[103m", "\x1B[49m"),
    bgBlueBright: f("\x1B[104m", "\x1B[49m"),
    bgMagentaBright: f("\x1B[105m", "\x1B[49m"),
    bgCyanBright: f("\x1B[106m", "\x1B[49m"),
    bgWhiteBright: f("\x1B[107m", "\x1B[49m")
  };
};
const colors = createColors();

function mkUutValuesEntries(uuts) {
  const uutNs = Array.isArray(uuts) ? uuts : Object.values(uuts);
  const uniqs = [];
  for (const un of uutNs) {
    if (!uniqs.includes(un)) uniqs.push(un);
  }
  return uniqs.map((uut) => mkValuesEntry(uut.name, BigInt(1)));
}
function mkValuesEntry(tokenName, count) {
  const tnBytes = Array.isArray(tokenName) ? tokenName : encodeUtf8(tokenName);
  return [tnBytes, count];
}
function mkTv(mph, tokenName, count = 1n) {
  const v = makeValue(
    0,
    makeAssets([[mph, [mkValuesEntry(tokenName, count)]]])
  );
  return v;
}
function realMul(a, b) {
  const a2 = Math.trunc(1e6 * a);
  const b2 = Math.trunc(1e6 * b);
  const result1 = a2 * b2;
  const result2 = result1 / 1e12;
  if (debugRealMath) {
    console.log("    ---- realMul", a2, b2);
    console.log("    ---- realMul result1", result1);
    console.log("    ---- realMul result2", result2);
  }
  return result2;
}
function realDiv(a, b) {
  if (b === 0) {
    throw new Error("Cannot divide by zero");
  }
  const a2 = Math.trunc(1e6 * a);
  const result1 = a2 / b;
  const result2 = Math.round(result1) / 1e6;
  if (debugRealMath) {
    console.log("    ---- realDiv", a, "/", b);
    console.log("    ---- realDiv", a2);
    console.log("    ---- realDiv result1", result1);
    console.log("    ---- realDiv result2", result2);
  }
  return result2;
}
function toFixedReal(n) {
  return parseFloat((Math.floor(n * 1e6 + 0.1) / 1e6).toFixed(6));
}
function debugMath(callback) {
  const old = debugRealMath;
  debugRealMath = true;
  const result = callback();
  debugRealMath = old;
  return result;
}
let debugRealMath = false;
class TxNotNeededError extends Error {
  constructor(message) {
    super(message);
    this.name = "TxAlreadyPresentError";
  }
}
class AlreadyPendingError extends TxNotNeededError {
  constructor(message) {
    super(message);
    this.name = "AlreadyPendingError";
  }
}
function checkValidUTF8(data) {
  let i = 0;
  while (i < data.length) {
    if ((data[i] & 128) === 0) {
      i++;
    } else if ((data[i] & 224) === 192) {
      if (i + 1 >= data.length || (data[i + 1] & 192) !== 128) return false;
      i += 2;
    } else if ((data[i] & 240) === 224) {
      if (i + 2 >= data.length || (data[i + 1] & 192) !== 128 || (data[i + 2] & 192) !== 128) return false;
      i += 3;
    } else if ((data[i] & 248) === 240) {
      if (i + 3 >= data.length || (data[i + 1] & 192) !== 128 || (data[i + 2] & 192) !== 128 || (data[i + 3] & 192) !== 128) return false;
      i += 4;
    } else {
      return false;
    }
  }
  return isValidUtf8(data);
}

const nanoid = customAlphabet("0123456789abcdefghjkmnpqrstvwxyz", 12);
//!!! if we could access the inputs and outputs in a building Tx,
const emptyUuts = Object.freeze({});
class StellarTxnContext {
  id = nanoid(5);
  inputs = [];
  collateral;
  outputs = [];
  feeLimit;
  state;
  allNeededWitnesses = [];
  otherPartySigners = [];
  parentTcx;
  childReservedUtxos = [];
  parentId = "";
  alreadyPresent = void 0;
  depth = 0;
  // submitOptions?: SubmitOptions
  txb;
  txnName = "";
  withName(name) {
    this.txnName = name;
    return this;
  }
  get wallet() {
    return this.setup.actorContext.wallet;
  }
  get uh() {
    return this.setup.uh;
  }
  get networkParams() {
    return this.setup.networkParams;
  }
  get actorContext() {
    return this.setup.actorContext;
  }
  /**
   * Provides a lightweight, NOT complete, serialization for presenting the transaction context
   * @remarks
   * Serves rendering of the transaction context in vitest
   * @internal
   */
  toJSON() {
    return {
      kind: "StellarTxnContext",
      state: !!this.state ? `{${Object.keys(this.state).join(", ")}}` : void 0,
      inputs: `[${this.inputs.length} inputs]`,
      outputs: `[${this.outputs.length} outputs]`,
      isBuilt: !!this._builtTx,
      hasParent: !!this.parentTcx,
      //@ts-expect-error
      addlTxns: this.state.addlTxns ? [
        //@ts-expect-error
        ...Object.keys(this.state.addlTxns || {})
      ] : void 0
    };
  }
  logger = new UplcConsoleLogger();
  constructor(setup, state = {}, parentTcx) {
    if (parentTcx) {
      console.warn(
        "Deprecated use of 'parentTcx' - use includeAddlTxn() instead\n  ... setup.txBatcher.current holds an in-progress utxo set for all 'parent' transactions"
      );
      throw new Error(`parentTcx used where? `);
    }
    Object.defineProperty(this, "setup", {
      enumerable: false,
      value: setup
    });
    Object.defineProperty(this, "_builtTx", {
      enumerable: false,
      writable: true
    });
    const isMainnet = setup.isMainnet;
    this.isFacade = void 0;
    if ("undefined" == typeof isMainnet) {
      throw new Error(
        "StellarTxnContext: setup.isMainnet must be defined"
      );
    }
    this.txb = makeTxBuilder({
      isMainnet
    });
    this.state = {
      ...state,
      uuts: state.uuts || { ...emptyUuts }
    };
    const currentBatch = this.currentBatch;
    currentBatch?.isOpen;
    if (!currentBatch || currentBatch.isConfirmationComplete) {
      this.setup.txBatcher.rotate(this.setup.chainBuilder);
    }
    if (!this.setup.isTest && !this.setup.chainBuilder) {
      if (currentBatch.chainBuilder) {
        this.setup.chainBuilder = currentBatch.chainBuilder;
      } else {
        this.setup.chainBuilder = makeTxChainBuilder(
          this.setup.network
        );
      }
    }
    if (parentTcx) {
      debugger;
      throw new Error(`parentTcx used where? `);
    }
    this.parentTcx = parentTcx;
  }
  isFacade;
  facade() {
    if (this.isFacade === false)
      throw new Error(`this tcx already has txn material`);
    if (this.parentTcx)
      throw new Error(`no parentTcx allowed for tcx facade`);
    const t = this;
    t.state.addlTxns = t.state.addlTxns || {};
    t.isFacade = true;
    return this;
  }
  noFacade(situation) {
    if (this.isFacade)
      throw new Error(
        `${situation}: ${this.txnName || "this tcx"} is a facade for nested multi-tx`
      );
    this.isFacade = false;
  }
  withParent(tcx) {
    this.noFacade("withParent");
    this.parentTcx = tcx;
    return this;
  }
  get actorWallet() {
    return this.actorContext.wallet;
  }
  dump(tx) {
    const t = tx || this.builtTx;
    if (t instanceof Promise) {
      return t.then((tx2) => {
        return txAsString(tx2, this.setup.networkParams);
      });
    }
    return txAsString(t, this.setup.networkParams);
  }
  includeAddlTxn(txnName, txInfoIn) {
    const txInfo = {
      ...txInfoIn
    };
    if (!txInfo.id)
      txInfo.id = //@ts-expect-error - the tcx is never there,
      // but including the fallback assignment here for
      // consistency about the policy of syncing to it.
      txInfo.tcx?.id || nanoid(5);
    txInfo.parentId = this.id;
    txInfo.depth = (this.depth || 0) + 1;
    const thisWithMoreType = this;
    if ("undefined" == typeof this.isFacade) {
      throw new Error(
        `to include additional txns on a tcx with no txn details, call facade() first.
   ... otherwise, add txn details first or set isFacade to false`
      );
    }
    thisWithMoreType.state.addlTxns = {
      ...thisWithMoreType.state.addlTxns || {},
      [txInfo.id]: txInfo
    };
    return thisWithMoreType;
  }
  /**
   * @public
   */
  get addlTxns() {
    return this.state.addlTxns || {};
  }
  mintTokens(...args) {
    this.noFacade("mintTokens");
    const [policy, tokens, r = { }] = args;
    const { redeemer } = r;
    if (this.txb.mintPolicyTokensUnsafe) {
      this.txb.mintPolicyTokensUnsafe(policy, tokens, redeemer);
    } else {
      this.txb.mintTokens(policy, tokens, redeemer);
    }
    return this;
  }
  getSeedAttrs() {
    this.noFacade("getSeedAttrs");
    const seedUtxo = this.state.seedUtxo;
    return { txId: seedUtxo.id.txId, idx: BigInt(seedUtxo.id.index) };
  }
  reservedUtxos() {
    this.noFacade("reservedUtxos");
    return this.parentTcx ? this.parentTcx.reservedUtxos() : [
      ...this.inputs,
      this.collateral,
      ...this.childReservedUtxos
    ].filter((x) => !!x);
  }
  utxoNotReserved(u) {
    if (this.collateral?.isEqual(u)) return void 0;
    if (this.inputs.find((i) => i.isEqual(u))) return void 0;
    return u;
  }
  addUut(uutName, ...names) {
    this.noFacade("addUut");
    this.state.uuts = this.state.uuts || {};
    for (const name of names) {
      this.state.uuts[name] = uutName;
    }
    return this;
  }
  addState(key, value) {
    this.noFacade("addState");
    this.state[key] = value;
    return this;
  }
  addCollateral(collateral) {
    this.noFacade("addCollateral");
    console.warn("explicit addCollateral() should be unnecessary unless a babel payer is covering it");
    if (!collateral.value.assets.isZero()) {
      throw new Error(
        `invalid attempt to add non-pure-ADA utxo as collateral`
      );
    }
    this.collateral = collateral;
    this.txb.addCollateral(collateral);
    return this;
  }
  getSeedUtxoDetails() {
    this.noFacade("getSeedUtxoDetails");
    const seedUtxo = this.state.seedUtxo;
    return {
      txId: seedUtxo.id.txId,
      idx: BigInt(seedUtxo.id.index)
    };
  }
  _txnTime;
  /**
   * Sets a future date for the transaction to be executed, returning the transaction context.  Call this before calling validFor().
   *
   * @remarks Returns the txn context.
   * Throws an error if the transaction already has a txnTime set.
   *
   * This method does not itself set the txn's validity interval.  You MUST combine it with
   * a call to validFor(), to set the txn's validity period.  The resulting transaction will
   * be valid from the moment set here until the end of the validity period set by validFor().
   *
   * This can be used anytime to construct a transaction valid in the future.  This is particularly useful
   * during test scenarios to verify time-sensitive behaviors.
   *
   * In the test environment, the network wil normally be advanced to this date
   * before executing the transaction, unless a different execution time is indicated.
   * Use the test helper's `submitTxnWithBlock(txn, {futureDate})` or `advanceNetworkTimeForTx()` methods, or args to
   * use-case-specific functions that those methods.
   */
  futureDate(date) {
    this.noFacade("futureDate");
    if (this._txnTime) {
      throw new Error(
        "txnTime already set; cannot set futureDate() after txnTime"
      );
    }
    const d = new Date(
      Number(this.slotToTime(this.timeToSlot(BigInt(date.getTime()))))
    );
    console.log("  \u23F0\u23F0 setting txnTime to ", d.toString());
    this._txnTime = d;
    return this;
  }
  assertNumber(obj, msg = "expected a number") {
    if (obj === void 0 || obj === null) {
      throw new Error(msg);
    } else if (typeof obj == "number") {
      return obj;
    } else {
      throw new Error(msg);
    }
  }
  /**
   * Calculates the time (in milliseconds in 01/01/1970) associated with a given slot number.
   * @param slot - Slot number
   */
  slotToTime(slot) {
    let secondsPerSlot = this.assertNumber(
      this.networkParams.secondsPerSlot
    );
    let lastSlot = BigInt(this.assertNumber(this.networkParams.refTipSlot));
    let lastTime = BigInt(this.assertNumber(this.networkParams.refTipTime));
    let slotDiff = slot - lastSlot;
    return lastTime + slotDiff * BigInt(secondsPerSlot * 1e3);
  }
  /**
   * Calculates the slot number associated with a given time.
   * @param time - Milliseconds since 1970
   */
  timeToSlot(time) {
    let secondsPerSlot = this.assertNumber(
      this.networkParams.secondsPerSlot
    );
    let lastSlot = BigInt(this.assertNumber(this.networkParams.refTipSlot));
    let lastTime = BigInt(this.assertNumber(this.networkParams.refTipTime));
    let timeDiff = time - lastTime;
    return lastSlot + BigInt(Math.round(Number(timeDiff) / (1e3 * secondsPerSlot)));
  }
  /**
   * Identifies the time at which the current transaction is expected to be executed.
   * Use this attribute in any transaction-building code that sets date/time values
   * for the transaction.
   * Honors any futureDate() setting or uses the current time if none has been set.
   */
  get txnTime() {
    if (this._txnTime) return this._txnTime;
    const now = Date.now();
    const recent = now - 18e4;
    const d = new Date(
      Number(this.slotToTime(this.timeToSlot(BigInt(recent))))
    );
    console.log("\u23F0\u23F0setting txnTime to ", d.toString());
    return this._txnTime = d;
  }
  _txnEndTime;
  get txnEndTime() {
    if (this._txnEndTime) return this._txnEndTime;
    throw new Error("call [optional: futureDate() and] validFor(durationMs) before fetching the txnEndTime");
  }
  /**
    * Sets an on-chain validity period for the transaction, in miilliseconds
    *
    * @remarks if futureDate() has been set on the transaction, that
    * date will be used as the starting point for the validity period.
    *
    * Returns the transaction context for chaining.
    *
    * @param durationMs - the total validity duration for the transaction.  On-chain
    *  checks using CapoCtx `now(granularity)` can enforce this duration
    */
  validFor(durationMs) {
    this.noFacade("validFor");
    const startMoment = this.txnTime.getTime();
    this._validityPeriodSet = true;
    this.txb.validFromTime(new Date(startMoment)).validToTime(new Date(startMoment + durationMs));
    return this;
  }
  _validityPeriodSet = false;
  txRefInputs = [];
  /**
   * adds a reference input to the transaction context
   * @remarks
   *
   * idempotent version of helios addRefInput()
   *
   * @public
   **/
  addRefInput(input, refScript) {
    this.noFacade("addRefInput");
    if (!input) throw new Error(`missing required input for addRefInput()`);
    if (this.txRefInputs.find((v) => v.id.isEqual(input.id))) {
      console.warn("suppressing second add of refInput");
      return this;
    }
    if (this.inputs.find((v) => v.id.isEqual(input.id))) {
      console.warn(
        "suppressing add of refInput that is already an input"
      );
      return this;
    }
    this.txRefInputs.push(input);
    const v2sBefore = this.txb.v2Scripts;
    if (refScript) {
      this.txb.addV2RefScript(refScript);
    }
    this.txb.refer(input);
    const v2sAfter = this.txb.v2Scripts;
    if (v2sAfter.length > v2sBefore.length) {
      console.log("       --- addRefInput added a script to tx.scripts");
    }
    return this;
  }
  /**
   * @deprecated - use addRefInput() instead.
   */
  addRefInputs(...args) {
    throw new Error(`deprecated`);
  }
  addInput(input, r) {
    this.noFacade("addInput");
    if (r && !r.redeemer) {
      console.log("activity without redeemer tag: ", r);
      throw new Error(
        `addInput() redeemer must match the isActivity type {redeemer: \u2039activity\u203A}
`
        // JSON.stringify(r, delegateLinkSerializer)
      );
    }
    if (input.address.pubKeyHash)
      this.allNeededWitnesses.push(input.address);
    this.inputs.push(input);
    if (this.parentTcx) {
      this.parentTcx.childReservedUtxos.push(input);
    }
    try {
      this.txb.spendUnsafe(input, r?.redeemer);
    } catch (e) {
      debugger;
      throw new Error(
        `addInput: ${e.message}
   ...TODO: dump partial txn from txb above.  Failed TxInput:
` + dumpAny(input)
      );
    }
    return this;
  }
  addOutput(output) {
    this.noFacade("addOutput");
    try {
      this.txb.addOutput(output);
      this.outputs.push(output);
    } catch (e) {
      console.log(
        "Error adding output to txn: \n  | inputs:\n  | " + utxosAsString(this.inputs, "\n  | ") + "\n  | " + dumpAny(this.outputs).split("\n").join("\n  |   ") + "\n... in context of partial tx above: failed adding output: \n  |  ",
        dumpAny(output),
        "\n" + e.message,
        "\n   (see thrown stack trace below)"
      );
      e.message = `addOutput: ${e.message}
   ...see logged details above`;
      throw e;
    }
    return this;
  }
  attachScript(...args) {
    throw new Error(
      `use addScriptProgram(), increasing the txn size, if you don't have a referenceScript.
Use <capo>.txnAttachScriptOrRefScript() to use a referenceScript when available.`
    );
  }
  /**
   * Adds a UPLC program to the transaction context, increasing the transaction size.
   * @remarks
   * Use the Capo's `txnAttachScriptOrRefScript()` method to use a referenceScript
   * when available. That method uses a fallback approach adding the script to the
   * transaction if needed.
   */
  addScriptProgram(...args) {
    this.noFacade("addScriptProgram");
    this.txb.attachUplcProgram(...args);
    return this;
  }
  wasModified() {
    this.txb.wasModified();
  }
  _builtTx;
  get builtTx() {
    this.noFacade("builtTx");
    if (!this._builtTx) {
      throw new Error(`can't go building the tx willy-nilly`);
    }
    return this._builtTx;
  }
  async addSignature(wallet) {
    this.noFacade("addSignature");
    const builtTx = await this.builtTx;
    const sig = await wallet.signTx(builtTx);
    builtTx.addSignature(sig[0]);
  }
  hasAuthorityToken(authorityValue) {
    return this.inputs.some((i) => i.value.isGreaterOrEqual(authorityValue));
  }
  async findAnySpareUtxos() {
    this.noFacade("findAnySpareUtxos");
    const mightNeedFees = 3500000n;
    const toSortInfo = this.uh.mkUtxoSortInfo(mightNeedFees);
    const notReserved = this.utxoNotReserved.bind(this) || ((u) => u);
    const uh = this.uh;
    return uh.findActorUtxo(
      "spares for tx balancing",
      notReserved,
      {
        wallet: this.wallet,
        dumpDetail: "onFail"
      },
      "multiple"
    ).then(async (utxos) => {
      if (!utxos) {
        throw new Error(
          `no utxos found for spares for tx balancing.  We can ask the user to send a series of 10, 11, 12, ... ADA to themselves or do it automatically`
        );
      }
      const allSpares = utxos.map(toSortInfo).filter(uh.utxoIsSufficient).sort(uh.utxoSortSmallerAndPureADA);
      if (allSpares.reduce(uh.reduceUtxosCountAdaOnly, 0) > 0) {
        return allSpares.filter(uh.utxoIsPureADA).map(uh.sortInfoBackToUtxo);
      }
      return allSpares.map(uh.sortInfoBackToUtxo);
    });
  }
  async findChangeAddr() {
    this.noFacade("findChangeAddr");
    const wallet = this.actorContext.wallet;
    if (!wallet) {
      throw new Error(
        `\u26A0\uFE0F  ${this.constructor.name}: no this.actorContext.wallet; can't get required change address!`
      );
    }
    let unused = (await wallet.unusedAddresses).at(0);
    if (!unused) unused = (await wallet.usedAddresses).at(-1);
    if (!unused)
      throw new Error(
        `\u26A0\uFE0F  ${this.constructor.name}: can't find a good change address!`
      );
    return unused;
  }
  /**
   * Adds required signers to the transaction context
   * @remarks
   * Before a transaction can be submitted, signatures from each of its signers must be included.
   * 
   * Any inputs from the wallet are automatically added as signers, so addSigners() is not needed
   * for those.
   */
  async addSigners(...signers) {
    this.noFacade("addSigners");
    this.allNeededWitnesses.push(...signers);
  }
  async build({
    signers = [],
    addlTxInfo = {
      description: this.txnName ? ": " + this.txnName : ""
    },
    beforeValidate,
    paramsOverride,
    expectError
  } = {}) {
    this.noFacade("build");
    console.timeStamp?.(`submit() txn ${this.txnName}`);
    console.log("tcx build() @top");
    if (!this._validityPeriodSet) {
      this.validFor(12 * 60 * 1e3);
    }
    let { description } = addlTxInfo;
    if (description && !description.match(/^:/)) {
      description = ": " + description;
    }
    const {
      actorContext: { wallet }
    } = this;
    let walletMustSign = false;
    let tx;
    const logger = this.logger;
    if (wallet || signers.length) {
      console.timeStamp?.(`submit(): findChangeAddr()`);
      const changeAddress = await this.findChangeAddr();
      console.timeStamp?.(`submit(): findAnySpareUtxos()`);
      const spares = await this.findAnySpareUtxos();
      const willSign = [...signers, ...this.allNeededWitnesses].map((addrOrPkh) => {
        if (addrOrPkh.kind == "PubKeyHash") {
          return addrOrPkh;
        } else if (addrOrPkh.kind == "Address") {
          if (addrOrPkh.era == "Shelley") {
            return addrOrPkh.spendingCredential.kind == "PubKeyHash" ? addrOrPkh.spendingCredential : void 0;
          } else {
            return void 0;
          }
        } else {
          return void 0;
        }
      }).filter((pkh) => !!pkh).flat(1);
      console.timeStamp?.(`submit(): addSIgners()`);
      this.txb.addSigners(...willSign);
      const wHelper = wallet && makeWalletHelper(wallet);
      const othersMustSign = [];
      if (wallet && wHelper) {
        for (const a of willSign) {
          if (await wHelper.isOwnAddress(a)) {
            walletMustSign = true;
          } else {
            othersMustSign.push(a);
          }
        }
        this.otherPartySigners = othersMustSign;
        const inputs = this.txb.inputs;
        if (!inputs) throw new Error(`no inputs in txn`);
        for (const input of inputs) {
          if (!await wHelper.isOwnAddress(input.address)) continue;
          this.allNeededWitnesses.push(input.address);
          walletMustSign = true;
          const pubKeyHash = input.address.pubKeyHash;
          if (pubKeyHash) {
            this.txb.addSigners(pubKeyHash);
          }
        }
      } else {
        console.warn(
          "txn build: no wallet/helper available for txn signining (debugging breakpoint available)"
        );
        debugger;
      }
      let capturedCosts = {
        total: { cpu: 0n, mem: 0n },
        slush: { cpu: 0n, mem: 0n }
      };
      const inputValues = this.inputs.map((i) => i.value.assets).reduce((a, b) => a.add(b), makeAssets());
      const outputValues = this.outputs.map((o) => o.value.assets).reduce((a, b) => a.add(b), makeAssets());
      const mintValues = this.txb.mintedTokens;
      const netTxAssets = inputValues.add(mintValues).subtract(outputValues);
      if (!netTxAssets.isZero()) {
        console.log(
          "tx imbalance=" + dumpAny(netTxAssets, this.networkParams)
        );
      }
      try {
        tx = await this.txb.buildUnsafe({
          changeAddress,
          spareUtxos: spares,
          networkParams: {
            ...this.networkParams,
            ...paramsOverride
          },
          logOptions: logger,
          beforeValidate,
          modifyExBudget: (txi, purpose, index, costs) => {
            capturedCosts[`${purpose} @${1 + index}`] = {
              ...costs
            };
            const cpuSlush = BigInt(350000000n);
            const memSlush = BigInt(430000n);
            capturedCosts.slush.cpu += cpuSlush;
            capturedCosts.slush.mem += memSlush;
            costs.cpu += cpuSlush;
            costs.mem += memSlush;
            capturedCosts.total.cpu += costs.cpu;
            capturedCosts.total.mem += costs.mem;
            if ("minting" == purpose) purpose = "minting ";
            return costs;
          }
        });
        this._builtTx = tx;
        this.txb.validToTime;
        //!!! todo: come back to this later.  Blockfrost's endpoint for this
      } catch (e) {
        e.message += "; txn build failed (debugging breakpoint available)\n" + (netTxAssets.isZero() ? "" : "tx imbalance=" + dumpAny(netTxAssets, this.networkParams)) + `  inputs: ${dumpAny(this.inputs)}
  outputs: ${dumpAny(this.outputs)}
  mint: ${dumpAny(this.txb.mintedTokens)}
  refInputs: ${dumpAny(this.txRefInputs)}
`;
        logger.logError(`txn build failed: ${e.message}`);
        if (tx) logger.logPrint(dumpAny(tx));
        logger.logError(
          `  (it shouldn't be possible for buildUnsafe to be throwing errors!)`
        );
        logger.flushError();
        throw e;
      }
      if (tx.hasValidationError) {
        const e = tx.hasValidationError;
        let heliosStack = e.stack?.split("\n") || void 0;
        heliosStack = heliosStack?.map((line) => {
          if (line.match(/<helios>@at/)) {
            line = line.replace(
              /<helios>@at /,
              "   ... in helios function "
            ).replace(
              /, \[(.*)\],/,
              (_, bracketed) => ``
              // ` with scope [\n        ${
              //     bracketed.replace(/, /g, ",\n        ")
              // }\n      ]`
            );
          }
          return line;
        });
        debugger;
        const scriptContext = "string" == typeof e ? void 0 : e.scriptContext;
        logger.logError(
          `tx validation failure: 
  \u274C ${//@ts-expect-error
          tx.hasValidationError.message || tx.hasValidationError}
` + (heliosStack?.join("\n") || "")
        );
        logger.flush();
        const ctxCbor = scriptContext?.toCbor();
        const cborHex = ctxCbor ? bytesToHex(ctxCbor) : "";
        if (!expectError) {
          console.log(
            cborHex ? "------------------- failed ScriptContext as cbor-hex -------------------\n" + cborHex + "\n" : "",
            "------------------- failed tx as cbor-hex -------------------\n" + bytesToHex(tx.toCbor()),
            "\n------------------^ failed tx details ^------------------\n(debugging breakpoint available)"
          );
        }
      }
      return {
        tx,
        willSign,
        walletMustSign,
        wallet,
        wHelper,
        costs: capturedCosts
      };
    } else {
      throw new Error("no 'actorContext.wallet'; can't make  a txn");
    }
  }
  log(...msgs) {
    if (msgs.length > 1) {
      debugger;
      throw new Error(`no multi-arg log() calls`);
    }
    this.logger.logPrint(msgs[0]);
    return this;
  }
  flush() {
    this.logger.flush();
    return this;
  }
  finish() {
    this.logger.finish();
    return this;
  }
  /**
   * Submits the current transaction and any additional transactions in the context.
   * @remarks
   * To submit only the current transaction, use the `submit()` method.
   *
   * Uses the TxBatcher to create a new batch of transactions.  This new batch
   * overlays a TxChainBuilder on the current network-client, using that facade
   * to provide utxos for chained transactions in the batch.
   *
   * The signers array can be used to add additional signers to the transaction, and
   * is passed through to the submit() for the current txn only; it is not used for
   * any additional transactions.
   *
   * The beforeSubmit, onSubmitted callbacks are used for each additional transaction.
   *
   * beforeSubmit can be used to notify the user of the transaction about to be submitted,
   * and can also be used to add additional signers to the transaction or otherwise modify
   * it (by returning the modified transaction).
   *
   * onSubmitted can be used to notify the user that the transaction has been submitted,
   * or for logging or any other post-submission processing.
   */
  async submitAll(options = {}) {
    const currentBatch = this.currentBatch;
    currentBatch?.isOpen;
    //!!! remove because it's already done in the constructor?
    //!!! ^^^ remove?
    return this.buildAndQueueAll(options).then(() => {
      return true;
    });
  }
  /**
   * augments a transaction context with a type indicator
   * that it has additional transactions to be submitted.
   * @public
   * @remarks
   * The optional argument can also be used to include additional
   * transactions to be chained after the current transaction.
   */
  withAddlTxns(addlTxns = {}) {
    this.state.addlTxns = this.state.addlTxns || {};
    for (const [name, txn] of Object.entries(addlTxns)) {
      this.includeAddlTxn(name, txn);
    }
    return this;
  }
  async buildAndQueueAll(options = {}) {
    const {
      addlTxInfo = {
        description: this.txnName ? ": " + this.txnName : "\u2039unnamed tx\u203A",
        id: this.id,
        tcx: this
      },
      ...generalSubmitOptions
    } = options;
    if (options.paramsOverride) {
      console.warn(
        "\u26A0\uFE0F  paramsOverride can be useful for extreme cases \nof troubleshooting tx execution by submitting an oversized tx \nwith unoptimized contract scripts having diagnostic print/trace calls\nto a custom preprod node having overloaded network params, thus allowing \nsuch a transaction to be evaluated end-to-end by the Haskell evaluator using \nthe cardano-node's script-budgeting mini-protocol.\n\nThis will cause problems for regular transactions (such as requiring very large collateral)Be sure to remove any params override if you're not dealing with \none of those very special situations. \n"
      );
      debugger;
    }
    if (this.isFacade == false) {
      return this.buildAndQueue({
        ...generalSubmitOptions,
        addlTxInfo
      }).then(() => {
        if (this.state.addlTxns) {
          console.log(
            `\u{1F384}\u26C4\u{1F381} ${this.id}   -- B&QA - registering addl txns`
          );
          return this.queueAddlTxns(options).then(() => {
            return true;
          });
        }
      });
    } else if (this.state.addlTxns) {
      if (this.isFacade) {
        this.currentBatch.$txInfo(this.id)?.transition("isFacade");
      }
      console.log(
        `\u{1F384}\u26C4\u{1F381} ${this.id}   -- B&QA - registering txns in facade`
      );
      return this.queueAddlTxns(generalSubmitOptions).then(() => {
        return true;
      });
    }
    console.warn(`\u26A0\uFE0F  submitAll(): no txns to queue/submit`, this);
    throw new Error(
      `unreachable? -- nothing to do for submitting this tcx`
    );
  }
  get currentBatch() {
    return this.setup.txBatcher.current;
  }
  /**
   * Submits only the current transaction.
   * @remarks
   * To also submit additional transactions, use the `submitAll()` method.
   */
  async buildAndQueue(submitOptions = {}) {
    let {
      signers = [],
      addlTxInfo,
      paramsOverride,
      expectError,
      beforeError,
      beforeValidate,
      whenBuilt,
      fixupBeforeSubmit,
      onSubmitError,
      onSubmitted
    } = submitOptions;
    this.noFacade("submit");
    if (!addlTxInfo) {
      debugger;
      throw new Error(`expecting addlTxInfo to be passed`);
    }
    const {
      logger,
      setup: { network }
    } = this;
    const {
      tx,
      willSign,
      walletMustSign,
      wallet,
      wHelper,
      costs = {
        total: { cpu: 0n, mem: 0n }
      }
    } = await this.build({
      signers,
      paramsOverride,
      addlTxInfo,
      beforeValidate,
      expectError
    });
    let { description, id } = addlTxInfo;
    if (!id) {
      id = addlTxInfo.id = this.id;
    }
    const addlTxInfo2 = {
      ...addlTxInfo
    };
    const txStats = {
      costs,
      wallet,
      walletMustSign,
      wHelper,
      willSign
    };
    const errMsg = tx.hasValidationError && tx.hasValidationError.toString();
    if (errMsg) {
      logger.logPrint(`\u26A0\uFE0F  txn validation failed: ${errMsg}
`);
      logger.logPrint(this.dump(tx));
      this.emitCostDetails(tx, costs);
      logger.flush();
      logger.logError(`FAILED submitting tx: ${description}`);
      logger.logPrint(errMsg);
      if (expectError) {
        logger.logPrint(
          `

\u{1F4A3}\u{1F389} \u{1F4A3}\u{1F389} \u{1F389} \u{1F389} transaction failed (as expected)`
        );
      }
      const txErrorDescription = {
        ...addlTxInfo2,
        tcx: this,
        error: errMsg,
        tx,
        stats: txStats,
        options: submitOptions,
        txCborHex: bytesToHex(tx.toCbor())
      };
      this.currentBatch.txError(txErrorDescription);
      let errorHandled;
      if (beforeError) {
        errorHandled = await beforeError(txErrorDescription);
      }
      logger.flushError();
      if (errMsg.match(
        /multi:Minting: only dgData activities ok in mintDgt/
      )) {
        console.log(
          `\u26A0\uFE0F  mint delegate for multiple activities should be given delegated-data activities, not the activities of the delegate`
        );
      }
      if (!errorHandled) {
        debugger;
        throw new Error(errMsg);
      }
    }
    for (const pkh of willSign) {
      if (!pkh) continue;
      if (tx.body.signers.find((s) => pkh.isEqual(s))) continue;
      throw new Error(
        `incontheeivable! all signers should have been added to the builder above`
      );
    }
    const txDescr = {
      ...addlTxInfo2,
      tcx: this,
      tx,
      txId: tx.id(),
      options: submitOptions,
      stats: txStats,
      txCborHex: bytesToHex(tx.toCbor())
    };
    const { currentBatch } = this;
    currentBatch.$txStates[id];
    logger.logPrint(`tx transcript: ${description}
`);
    logger.logPrint(this.dump(tx));
    this.emitCostDetails(tx, costs);
    logger.flush();
    console.timeStamp?.(`tx: add to current-tx-batch`);
    currentBatch.$addTxns(txDescr);
    this.setup.chainBuilder?.with(txDescr.tx);
    await whenBuilt?.(txDescr);
  }
  emitCostDetails(tx, costs) {
    const { logger } = this;
    const {
      maxTxExCpu,
      maxTxExMem,
      maxTxSize,
      //@ts-expect-error on our synthetic attributes
      origMaxTxSize = maxTxSize,
      //@ts-expect-error on our synthetic attributes
      origMaxTxExMem = maxTxExMem,
      //@ts-expect-error on our synthetic attributes
      origMaxTxExCpu = maxTxExCpu,
      exCpuFeePerUnit,
      exMemFeePerUnit,
      txFeePerByte,
      txFeeFixed
    } = this.networkParams;
    const oMaxSize = origMaxTxSize;
    const oMaxMem = origMaxTxExMem;
    const oMaxCpu = origMaxTxExCpu;
    const { total, ...otherCosts } = costs;
    const txSize = tx.calcSize();
    Number(tx.calcMinFee(this.networkParams));
    const txFee = tx.body.fee;
    const cpuFee = BigInt((Number(total.cpu) * exCpuFeePerUnit).toFixed(0));
    const memFee = BigInt((Number(total.mem) * exMemFeePerUnit).toFixed(0));
    const sizeFee = BigInt(txSize * txFeePerByte);
    const nCpu = Number(total.cpu);
    const nMem = Number(total.mem);
    let refScriptSize = 0;
    for (const anyInput of [...tx.body.inputs, ...tx.body.refInputs]) {
      const refScript = anyInput.output.refScript;
      if (refScript) {
        const scriptSize = refScript.toCbor().length;
        refScriptSize += scriptSize;
      }
    }
    let multiplier = 1;
    let refScriptsFee = 0n;
    let refScriptsFeePerByte = this.networkParams.refScriptsFeePerByte;
    let refScriptCostDetails = [];
    const tierSize = 25600;
    let alreadyConsumed = 0;
    for (let tier = 0; tier * tierSize < refScriptSize; tier += 1, multiplier *= 1.2) {
      const consumedThisTier = Math.min(
        tierSize,
        refScriptSize - alreadyConsumed
      );
      alreadyConsumed += consumedThisTier;
      const feeThisTier = Math.round(
        consumedThisTier * multiplier * refScriptsFeePerByte
      );
      refScriptsFee += BigInt(feeThisTier);
      refScriptCostDetails.push(
        `
      -- refScript tier${1 + tier} (${consumedThisTier} \xD7 ${multiplier}) \xD7${refScriptsFeePerByte} = ${lovelaceToAda(
          feeThisTier
        )}`
      );
    }
    const fixedTxFeeBigInt = BigInt(txFeeFixed);
    const remainderUnaccounted = txFee - cpuFee - memFee - sizeFee - fixedTxFeeBigInt - refScriptsFee;
    if (nCpu > oMaxCpu || nMem > oMaxMem || txSize > oMaxSize) {
      logger.logPrint(
        `\u{1F525}\u{1F525}\u{1F525}\u{1F525}  THIS TX EXCEEDS default (overridden in test env) limits on network params  \u{1F525}\u{1F525}\u{1F525}\u{1F525}
  -- cpu ${intWithGrouping(nCpu)} = ${(100 * nCpu / oMaxCpu).toFixed(1)}% of ${intWithGrouping(
          oMaxCpu
        )} (patched to ${intWithGrouping(maxTxExCpu)})
  -- mem ${nMem} = ${(100 * nMem / oMaxMem).toFixed(
          1
        )}% of ${intWithGrouping(
          oMaxMem
        )} (patched to ${intWithGrouping(maxTxExMem)})
  -- tx size ${intWithGrouping(txSize)} = ${(100 * txSize / oMaxSize).toFixed(1)}% of ${intWithGrouping(
          oMaxSize
        )} (patched to ${intWithGrouping(maxTxSize)})
`
      );
    }
    const scriptBreakdown = Object.keys(otherCosts).length > 0 ? `
    -- per script (with % blame for actual costs):` + Object.entries(otherCosts).map(
      ([key, { cpu, mem }]) => `
      -- ${key}: cpu ${lovelaceToAda(
        Number(cpu) * exCpuFeePerUnit
      )} = ${(Number(cpu) / Number(total.cpu) * 100).toFixed(1)}%, mem ${lovelaceToAda(
        Number(mem) * exMemFeePerUnit
      )} = ${(Number(mem) / Number(total.mem) * 100).toFixed(1)}%`
    ).join("") : "";
    logger.logPrint(
      `costs: ${lovelaceToAda(txFee)}
  -- fixed fee = ${lovelaceToAda(txFeeFixed)}
  -- tx size fee = ${lovelaceToAda(sizeFee)} (${intWithGrouping(txSize)} bytes = ${(Number(1e3 * txSize / oMaxSize) / 10).toFixed(1)}% of tx size limit)
  -- refScripts fee = ${lovelaceToAda(refScriptsFee)}` + refScriptCostDetails.join("") + `
  -- scripting costs
    -- cpu units ${intWithGrouping(total.cpu)} = ${lovelaceToAda(cpuFee)} (${(Number(1000n * total.cpu / BigInt(oMaxCpu)) / 10).toFixed(1)}% of cpu limit/tx)
    -- memory units ${intWithGrouping(total.mem)} = ${lovelaceToAda(memFee)} (${(Number(1000n * total.mem / BigInt(oMaxMem)) / 10).toFixed(1)}% of mem limit/tx)` + scriptBreakdown + `
  -- remainder ${lovelaceToAda(
        remainderUnaccounted
      )} unaccounted-for`
    );
  }
  /**
   * Executes additional transactions indicated by an existing transaction
   * @remarks
   *
   * During the off-chain txn-creation process, additional transactions may be
   * queued for execution.  This method is used to register those transactions,
   * along with any chained transactions THEY may trigger.
   *
   * The TxBatcher and batch-controller classes handle wallet-signing
   * and submission of the transactions for execution.
   * @public
   **/
  async queueAddlTxns(pipelineOptions) {
    const { addlTxns } = this.state;
    if (!addlTxns) return;
    return this.submitTxnChain({
      ...pipelineOptions,
      txns: Object.values(addlTxns)
    });
  }
  /**
   * Resolves a list of tx descriptions to full tcx's, without handing any of their
   * any chained/nested txns.
   * @remarks
   * if submitEach is provided, each txn will be submitted as it is resolved.
   * If submitEach is not provided, then the network must be capable of tx-chaining
   * use submitTxnChain() to submit a list of txns with chaining
   */
  async resolveMultipleTxns(txns, pipelineOptions) {
    for (const [txName, addlTxInfo] of Object.entries(txns)) {
      const { id } = addlTxInfo;
      let txTracker = this.currentBatch.$txInfo(id);
      if (!txTracker) {
        this.currentBatch.$addTxns(addlTxInfo);
        txTracker = this.currentBatch.$txInfo(id);
      }
    }
    await new Promise((res) => setTimeout(res, 5));
    for (const [txName, addlTxInfo] of Object.entries(txns)) {
      const { id, depth, parentId } = addlTxInfo;
      let txTracker = this.currentBatch.$txInfo(id);
      txTracker.$transition("building");
      await new Promise((res) => setTimeout(res, 5));
      const txInfoResolved = addlTxInfo;
      const { txName: txName2, description } = txInfoResolved;
      let alreadyPresent = void 0;
      console.log("  -- before: " + description);
      const tcx = "function" == typeof addlTxInfo.mkTcx ? await (async () => {
        console.log(
          "  creating TCX just in time for: " + description
        );
        const tcx2 = await addlTxInfo.mkTcx();
        tcx2.parentId = parentId || "";
        tcx2.depth = depth;
        if (id) {
          this.currentBatch.changeTxId(id, tcx2.id);
          txInfoResolved.id = tcx2.id;
        } else {
          addlTxInfo.id = tcx2.id;
          console.warn(
            `expected id to be set on addlTxInfo; falling back to JIT-generated id in new tcx`
          );
        }
        return tcx2;
      })().catch((e) => {
        if (e instanceof TxNotNeededError) {
          alreadyPresent = e;
          const tcx2 = new StellarTxnContext(
            this.setup
          ).withName(
            `addlTxInfo already present: ${description}`
          );
          tcx2.alreadyPresent = alreadyPresent;
          return tcx2;
        }
        throw e;
      }) : (() => {
        console.log(
          "  ---------------- warning!!!! addlTxInfo is already built!"
        );
        debugger;
        throw new Error(" unreachable - right?");
      })();
      if ("undefined" == typeof tcx) {
        throw new Error(
          `no txn provided for addlTx ${txName2 || description}`
        );
      }
      txInfoResolved.tcx = tcx;
      if (tcx.alreadyPresent) {
        console.log(
          "  -- tx effects are already present; skipping: " + txName2 || description
        );
        this.currentBatch.$addTxns(txInfoResolved);
        continue;
      }
      const replacementTcx = pipelineOptions?.fixupBeforeSubmit && await pipelineOptions.fixupBeforeSubmit(
        txInfoResolved
      ) || tcx;
      if (false === replacementTcx) {
        console.log("callback cancelled txn: ", txName2);
        continue;
      }
      if (replacementTcx !== true && replacementTcx !== tcx) {
        console.log(
          `callback replaced txn ${txName2} with a different txn: `,
          dumpAny(replacementTcx)
        );
      }
      const effectiveTcx = true === replacementTcx ? tcx : replacementTcx || tcx;
      txInfoResolved.tcx = effectiveTcx;
      //!!! was just buildAndQueue, but that was executing
      await effectiveTcx.buildAndQueueAll({
        ...pipelineOptions,
        addlTxInfo: txInfoResolved
      });
    }
  }
  /**
   * To add a script to the transaction context, use `attachScript`
   *
   * @deprecated - invalid method name; use `addScriptProgram()` or capo's `txnAttachScriptOrRefScript()` method
   **/
  addScript() {
  }
  async submitTxnChain(options = {
    //@ts-expect-error because the type of this context doesn't
    //   guarantee the presence of addlTxns.  But it might be there!
    txns: this.state.addlTxns || []
  }) {
    const addlTxns = this.state.addlTxns;
    const { txns, onSubmitError } = options;
    const newTxns = txns || addlTxns || [];
    const txChainSubmitOptions = {
      onSubmitError,
      // txns,  // see newTxns
      fixupBeforeSubmit: (txinfo) => {
        options.fixupBeforeSubmit?.(txinfo);
      },
      whenBuilt: async (txinfo) => {
        const { id: parentId, tx } = txinfo;
        const stackedPromise = options.whenBuilt?.(txinfo);
        const more = (
          //@ts-expect-error on optional prop
          txinfo.tcx.state.addlTxns || {}
        );
        console.log("  \u2705 " + txinfo.description);
        const moreTxns = Object.values(more);
        for (const nested of moreTxns) {
          nested.parentId = parentId;
        }
        console.log(
          `\u{1F384}\u26C4\u{1F381} ${parentId}   -- registering nested txns ASAP`
        );
        this.currentBatch.$addTxns(moreTxns);
        await new Promise((res) => setTimeout(res, 5));
        return stackedPromise;
      },
      onSubmitted: (txinfo) => {
        this.setup.network.tick?.(1);
      }
    };
    const isolatedTcx = new StellarTxnContext(this.setup);
    console.log("\u{1F41D}\u{1F63E}\u{1F43B}\u{1F980}");
    isolatedTcx.id = this.id;
    console.log(
      "at d=0: submitting addl txns: \n" + newTxns.map((t2) => `  \u{1F7E9} ${t2.description}
`).join("")
    );
    const t = isolatedTcx.resolveMultipleTxns(
      newTxns,
      txChainSubmitOptions
    );
    await t;
    return;
  }
}

function hexToPrintableString(hexStr) {
  let result = "";
  for (let i = 0; i < hexStr.length; i += 2) {
    let hexChar = hexStr.substring(i, i + 2);
    let charCode = parseInt(hexChar, 16);
    if (charCode >= 32 && charCode <= 126) {
      result += String.fromCharCode(charCode);
    } else {
      result += `\u2039${hexChar}\u203A`;
    }
  }
  return result;
}
function displayTokenName(nameBytesOrString) {
  let nameString = "";
  let cip68Tag = "";
  let cip68TagHex = "";
  let nameBytesHex = "";
  let isCip68 = false;
  if (typeof nameBytesOrString === "string") {
    nameBytesHex = Buffer.from(encodeUtf8(nameBytesOrString)).toString(
      "hex"
    );
    nameString = nameBytesOrString;
  } else {
    nameBytesHex = Buffer.from(nameBytesOrString).toString("hex");
    nameString = stringToPrintableString(nameBytesOrString);
  }
  if (nameBytesHex.length >= 8) {
    if (nameBytesHex.substring(0, 1) === "0" && nameBytesHex.substring(7, 8) === "0") {
      cip68TagHex = nameBytesHex.substring(1, 5);
      nameBytesHex.substring(5, 7);
      cip68Tag = parseInt(cip68TagHex, 16).toString();
      nameString = stringToPrintableString(nameBytesOrString.slice(4));
      isCip68 = true;
    }
  }
  if (isCip68) {
    nameString = `\u2039cip68/${cip68Tag}\u203A${nameString}`;
  } else {
    nameString = stringToPrintableString(nameBytesOrString);
  }
  return nameString;
}
function stringToPrintableString(str) {
  if ("string" != typeof str) {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(
        new Uint8Array(str)
      );
    } catch (e) {
      str = Buffer.from(str).toString("hex");
    }
  }
  let result = "";
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);
    if (charCode >= 32 && charCode <= 126) {
      result += str[i];
    } else {
      result += `\u2039${charCode.toString(16)}\u203A`;
    }
  }
  return result;
}
function assetsAsString(a, joiner = "\n    ", showNegativeAsBurn, mintRedeemers) {
  const assets = a.assets;
  return (assets?.map(([policyId, tokenEntries], index) => {
    let redeemerInfo = mintRedeemers?.[index] || "";
    if (redeemerInfo) {
      redeemerInfo = `
        r = ${redeemerInfo} `;
    }
    const tokenString = tokenEntries.map(([nameBytes, count]) => {
      const nameString = displayTokenName(nameBytes);
      const negWarning = count < 1n ? showNegativeAsBurn ? "\u{1F525} " : " \u26A0\uFE0F NEGATIVE\u26A0\uFE0F" : "";
      const burned = count < 1 ? showNegativeAsBurn ? "- BURN \u{1F525} " : "" : "";
      return `${negWarning} ${count}\xD7\u{1F4B4} ${nameString} ${burned}`;
    }).join("+");
    return `\u2991${policyIdAsString(
      policyId
    )} ${tokenString} ${redeemerInfo}\u2992`;
  }) || []).join(joiner);
}
function policyIdAsString(p) {
  const pIdHex = p.toHex();
  const abbrev = abbreviatedDetail(pIdHex);
  return `\u{1F3E6} ${abbrev}`;
}
function lovelaceToAda(lovelace) {
  const asNum = parseInt(lovelace.toString());
  const whole = Math.floor(asNum / 1e6).toFixed(0);
  let fraction = (asNum % 1e6).toFixed(0);
  fraction = fraction.padStart(6, "0");
  const wholeWithSeparators = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "_");
  let fractionWithSeparators = fraction.replace(/(\d{3})(?=\d)/g, "$1_").replace(/^-/, "");
  return `${wholeWithSeparators}.${fractionWithSeparators} ADA`;
}
function intWithGrouping(i) {
  const whole = Math.floor(Number(i)).toFixed(0);
  const fraction = Math.abs(Number(i) - Math.floor(Number(i))).toFixed(0);
  const wholeWithSeparators = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "_");
  const fractionWithSeparators = fraction.replace(/(\d{3})(?=\d)/g, "$1_");
  return `${wholeWithSeparators}.${fractionWithSeparators}`;
}
function valueAsString(v) {
  const ada = lovelaceToAda(v.lovelace);
  const assets = assetsAsString(v.assets);
  return [ada, assets].filter((x) => !!x).join(" + ");
}
function txAsString(tx, networkParams) {
  const outputOrder = [
    ["body", "inputs"],
    ["body", "minted"],
    ["body", "outputs"],
    ["body", "refInputs"],
    ["witnesses", "redeemers"],
    ["body", "signers"],
    ["witnesses", "v2refScripts"],
    ["witnesses", "v2scripts"],
    ["witnesses", "nativeScripts"],
    ["body", "collateral"],
    ["body", "collateralReturn"],
    ["body", "scriptDataHash"],
    ["body", "metadataHash"],
    ["witnesses", "signatures"],
    ["witnesses", "datums"],
    ["body", "lastValidSlot"],
    ["body", "firstValidSlot"],
    ["body", "fee"]
  ];
  let details = "";
  if (!networkParams) {
    console.warn(
      new Error(`dumpAny: no networkParams; can't show txn size info!?!`)
    );
  }
  const networkParamsHelper = networkParams ? makeNetworkParamsHelper(networkParams) : void 0;
  const seenRedeemers = /* @__PURE__ */ new Set();
  const allRedeemers = tx.witnesses.redeemers;
  let hasIndeterminate = false;
  const inputRedeemers = Object.fromEntries(
    allRedeemers.map((x, index) => {
      if (x.kind != "TxSpendingRedeemer") return void 0;
      const { inputIndex } = x;
      const isIndeterminate = inputIndex == -1;
      if (isIndeterminate) hasIndeterminate = true;
      const inpIndex = isIndeterminate ? `\u2039unk${index}\u203A` : inputIndex;
      if (!x.data) debugger;
      const showData = x.data.rawData ? uplcDataSerializer("", x.data.rawData) : x.data?.toString() || "\u2039no data\u203A";
      return [inpIndex, { r: x, display: showData }];
    }).filter((x) => !!x)
  );
  if (hasIndeterminate)
    inputRedeemers["hasIndeterminate"] = {
      r: void 0,
      display: "\u2039unk\u203A"
    };
  const mintRedeemers = Object.fromEntries(
    allRedeemers.map((x) => {
      if ("TxMintingRedeemer" != x.kind) return void 0;
      if ("number" != typeof x.policyIndex) {
        debugger;
        throw new Error(`non-mint redeemer here not yet supported`);
      }
      if (!x.data) debugger;
      const showData = (x.data.rawData ? uplcDataSerializer("", x.data.rawData) : x.data?.toString() || "\u2039no data\u203A") + "\n" + bytesToHex(x.data.toCbor());
      return [x.policyIndex, showData];
    }).filter((x) => !!x)
  );
  //!!! todo: improve interface of tx so useful things have a non-private api
  //!!! todo: get back to type-safety in this diagnostic suite
  for (const [where, x] of outputOrder) {
    let item = tx[where][x];
    let skipLabel = false;
    if (Array.isArray(item) && !item.length) continue;
    if (!item) continue;
    if ("inputs" == x) {
      item = `
  ${item.map((x2, i) => {
        const { r, display } = inputRedeemers[i] || inputRedeemers["hasIndeterminate"] || {};
        if (!display && x2.datum?.data) debugger;
        if (r) seenRedeemers.add(r);
        return txInputAsString(
          x2,
          /* unicode blue arrow right -> */
          `\u27A1\uFE0F  @${1 + i} `,
          i,
          display
          // || "‹failed to find redeemer info›"
        );
      }).join("\n  ")}`;
    }
    if ("refInputs" == x) {
      item = `
  ${item.map((x2) => txInputAsString(x2, "\u2139\uFE0F  ")).join("\n  ")}`;
    }
    if ("collateral" == x) {
      //!!! todo: group collateral with inputs and reflect it being spent either way,
      //!!! todo: move collateral to bottom with collateralReturn,
      item = item.map((x2) => txInputAsString(x2, "\u{1F52A}")).join("\n    ");
    }
    if ("minted" == x) {
      if (!item.assets.length) {
        continue;
      }
      item = `
   \u2747\uFE0F  ${assetsAsString(
        item,
        "\n   \u2747\uFE0F  ",
        "withBURN",
        mintRedeemers
      )}`;
    }
    if ("outputs" == x) {
      item = `
  ${item.map(
        (x2, i) => txOutputAsString(
          x2,
          `\u{1F539}${i} <-`
        )
      ).join("\n  ")}`;
    }
    if ("firstValidSlot" == x || "lastValidSlot" == x) {
      if (networkParamsHelper) {
        const slotTime = new Date(networkParamsHelper.slotToTime(item));
        const timeDiff = (slotTime.getTime() - Date.now()) / 1e3;
        const sign = timeDiff > 0 ? "+" : "-";
        const timeDiffString = sign + Math.abs(timeDiff).toFixed(1) + "s";
        item = `${item} ${slotTime.toLocaleDateString()} ${slotTime.toLocaleTimeString()} (now ${timeDiffString})`;
      }
    }
    if ("signers" == x) {
      item = item.map((x2) => {
        const hex = x2.toHex();
        return `\u{1F511}#${hex.slice(0, 6)}\u2026${hex.slice(-4)}`;
      });
    }
    if ("fee" == x) {
      item = lovelaceToAda(item);
    }
    if ("collateralReturn" == x) {
      skipLabel = true;
      item = `  ${txOutputAsString(
        item,
        `0  <- \u2753`
      )} conditional: collateral change (returned in case of txn failure)`;
    }
    if ("scriptDataHash" == x) {
      item = bytesToHex(item);
    }
    if ("datums" == x && !Object.entries(item || {}).length) continue;
    if ("signatures" == x) {
      if (!item) continue;
      item = item.map((s) => {
        const addr = makeAddress(true, s.pubKeyHash);
        const hashHex = s.pubKeyHash.toHex();
        return `\u{1F58A}\uFE0F ${addrAsString(addr)} = \u{1F511}\u2026${hashHex.slice(-4)}`;
      });
      if (item.length > 1) item.unshift("");
      item = item.join("\n    ");
    }
    if ("redeemers" == x) {
      if (!item) continue;
      //!!! todo: augment with mph when that's available from the Activity.
      item = item.map((x2) => {
        const indexInfo = x2.kind == "TxMintingRedeemer" ? `minting policy ${x2.policyIndex}` : `spend txin \u27A1\uFE0F  @${1 + x2.inputIndex}`;
        const showData = seenRedeemers.has(x2) ? "(see above)" : x2.data.fromData ? uplcDataSerializer("", x2.data.fromData) : x2.data.toString();
        return `\u{1F3E7}  ${indexInfo} ${showData}`;
      });
      if (item.length > 1) item.unshift("");
      item = item.join("\n    ");
    }
    if ("v2Scripts" == x) {
      if (!item) continue;
      item = item.map((s) => {
        try {
          const mph = s.mintingPolicyHash.toHex();
          return `\u{1F3E6} ${mph.slice(0, 8)}\u2026${mph.slice(-4)} (minting): ${s.serializeBytes().length} bytes`;
        } catch (e) {
          const vh = s.validatorHash;
          const vhh = vh.toHex();
          const addr = makeAddress(true, vh);
          return `\u{1F4DC} ${vhh.slice(0, 8)}\u2026${vhh.slice(
            -4
          )} (validator at ${addrAsString(addr)}): ${s.serializeBytes().length} bytes`;
        }
      });
      if (item.length > 1) item.unshift("");
      item = item.join("\n    ");
    }
    if ("v2RefScripts" == x) {
      item = `${item.length} - see refInputs`;
    }
    if (!item) continue;
    details += `${skipLabel ? "" : "  " + x + ": "}${item}
`;
  }
  try {
    details += `  txId: ${tx.id().toHex()}`;
    if (networkParams) details += `  

size: ${tx.toCbor().length} bytes`;
  } catch (e) {
    details = details + `(Tx not yet finalized!)`;
    if (networkParams) details += `
  - NOTE: can't determine txn size
`;
  }
  return details;
}
function txInputAsString(x, prefix = "-> ", index, redeemer) {
  const { output: oo } = x;
  const redeemerInfo = redeemer ? `
    r = ${redeemer}` : " \u2039no redeemer\u203A";
  const datumInfo = oo.datum?.kind == "InlineTxOutputDatum" ? datumSummary(oo.datum) : "";
  return `${prefix}${addrAsString(x.address)}${showRefScript(
    oo.refScript
  )} ${valueAsString(x.value)} ${datumInfo} = \u{1F4D6} ${txOutputIdAsString(
    x.id
  )}${redeemerInfo}`;
}
function utxosAsString(utxos, joiner = "\n", utxoDCache) {
  return utxos.map((u) => utxoAsString(u, " \u{1F4B5}", utxoDCache)).join(joiner);
}
function txOutputIdAsString(x, length = 8) {
  return txidAsString(x.txId, length) + `\u{1F539}#${x.index}`;
}
function txidAsString(x, length = 8) {
  const tid = x.toHex();
  return `${tid.slice(0, length)}\u2026${tid.slice(-4)}`;
}
function utxoAsString(x, prefix = "\u{1F4B5}", utxoDCache) {
  return ` \u{1F4D6} ${txOutputIdAsString(x.id)}: ${txOutputAsString(
    x.output,
    prefix,
    utxoDCache,
    x.id
  )}`;
}
function datumSummary(d) {
  if (!d) return "";
  const dh = d.hash.toHex();
  const dhss = `${dh.slice(0, 8)}\u2026${dh.slice(-4)}`;
  if (d.kind == "InlineTxOutputDatum") {
    const attachedData = d.data.rawData;
    if (attachedData) {
      return `
    d\u2039inline:${dhss} - ${uplcDataSerializer("", attachedData)}=${d.toCbor().length} bytes\u203A`;
    } else {
      return `d\u2039inline:${dhss} - ${d.toCbor().length} bytes\u203A`;
    }
  }
  return `d\u2039hash:${dhss}\u2026\u203A`;
}
function showRefScript(rs) {
  if (!rs) return "";
  const hash = rs.hash();
  const hh = bytesToHex(hash);
  const size = rs.toCbor().length;
  const rshInfo = `${hh.slice(0, 8)}\u2026${hh.slice(-4)}`;
  return ` \u2039\u{1F4C0} refScript\u{1F4DC} ${rshInfo}: ${size} bytes\u203A +`;
}
function txOutputAsString(x, prefix = "<-", utxoDCache, txoid) {
  if (utxoDCache && !txoid) {
    throw new Error(
      `txOutputAsString: must provide txoid when using cache`
    );
  }
  let cache = utxoDCache?.get(txoid);
  if (cache) {
    return `\u267B\uFE0F ${cache} (same as above)`;
  }
  cache = `${prefix} ${addrAsString(x.address)}${showRefScript(
    x.refScript
  )} ${valueAsString(x.value)}`;
  utxoDCache?.set(txoid, cache);
  return `${cache} ${datumSummary(x.datum)}`;
}
function addrAsString(address) {
  const bech32 = address.toString();
  return `${bech32.slice(0, 14)}\u2026${bech32.slice(-4)}`;
}
function errorMapAsString(em, prefix = "  ") {
  return Object.keys(em).map((k) => `in field ${prefix}${k}: ${JSON.stringify(em[k])}`).join("\n");
}
function byteArrayListAsString(items, joiner = "\n  ") {
  return "[\n  " + items.map((ba) => byteArrayAsString(ba)).join(joiner) + "\n]\n";
}
function byteArrayAsString(ba) {
  return hexToPrintableString(ba.toHex());
}
function dumpAny(x, networkParams, forJson = false) {
  if ("undefined" == typeof x) return "\u2039undefined\u203A";
  if (x?.kind == "Assets") {
    return `assets: ${assetsAsString(x)}`;
  }
  if (Array.isArray(x)) {
    if (!x.length) return "\u2039empty array\u203A";
    const firstItem = x[0];
    if ("number" == typeof firstItem) {
      return "num array: " + byteArrayListAsString([makeByteArrayData(x)]);
    }
    if (firstItem.kind == "TxOutput") {
      return "tx outputs: \n" + x.map((txo) => txOutputAsString(txo)).join("\n");
    }
    if (firstItem.kind == "TxInput") {
      return "utxos: \n" + utxosAsString(x);
    }
    if (firstItem.kind == "ByteArrayData") {
      return "byte array:\n" + byteArrayListAsString(x);
    }
    if ("object" == typeof firstItem) {
      if (firstItem instanceof Uint8Array) {
        return "byte array: " + byteArrayAsString(firstItem);
      }
      return `[` + x.map((item) => JSON.stringify(item, betterJsonSerializer)).join(", ") + `]`;
    }
    console.log("firstItem", firstItem);
    throw new Error(
      `dumpAny(): unsupported array type: ${typeof firstItem}`
    );
  }
  if ("bigint" == typeof x) {
    return x.toString();
  }
  if (x instanceof StellarTxnContext) {
    debugger;
    throw new Error(`use await build() and dump the result instead.`);
  }
  const xx = x;
  if (x.kind == "TxOutput") {
    return txOutputAsString(x);
  }
  if (xx.kind == "Tx") {
    return txAsString(xx, networkParams);
  }
  if (xx.kind == "TxOutputId") {
    return txOutputIdAsString(xx);
  }
  if (xx.kind == "TxId") {
    return txidAsString(xx);
  }
  if (xx.kind == "TxInput") {
    return utxoAsString(xx);
  }
  if (xx.kind == "Value") {
    return valueAsString(xx);
  }
  if (xx.kind == "Address") {
    return addrAsString(xx);
  }
  if (xx.kind == "MintingPolicyHash") {
    return policyIdAsString(xx);
  }
  if (forJson) return xx;
  if ("object" == typeof x) {
    return `{${Object.entries(x).map(([k, v]) => `${k}: ${dumpAny(v, networkParams)}`).join(",\n")}}`;
  }
  debugger;
  return "dumpAny(): unsupported type or library mismatch";
}
const betterJsonSerializer = (key, value) => {
  return dumpAny(value, void 0, true);
};
if ("undefined" == typeof window) {
  globalThis.peek = dumpAny;
} else {
  window.peek = dumpAny;
}

function delegateLinkSerializer(key, value) {
  if (typeof value === "bigint") {
    return value.toString();
  } else if ("bytes" == key && Array.isArray(value)) {
    return bytesToHex(value);
  } else if (value?.kind == "Address") {
    return value.toString();
  } else if ("tn" == key && Array.isArray(value)) {
    return decodeUtf8(value);
  }
  if ("capo" == key) return void 0;
  if ("uh" == key) return '"\u2039utxo helper\u203A"';
  if ("capoBundle" == key) return '"\u2039capo bundle\u203A"';
  return value;
}
function uplcDataSerializer(key, value, depth = 0) {
  const indent = "    ".repeat(depth);
  const outdent = "    ".repeat(Math.max(0, depth - 1));
  if (typeof value === "bigint") {
    return `big\u2039${value.toString()}n\u203A`;
  } else if ("bytes" == key && Array.isArray(value)) {
    return abbreviatedDetailBytes(`bytes\u2039${value.length}\u203A`, value, 40);
  } else if ("string" == typeof value) {
    return `'${value}'`;
  } else if (value === null) {
    return `\u2039null\u203A`;
  } else if ("undefined" == typeof value) {
    return `\u2039und\u203A`;
  } else if (value.kind == "Address") {
    const a = value;
    const cbor = a.toCbor();
    return `\u2039${abbrevAddress(value)}\u203A = ` + abbreviatedDetailBytes(`cbor\u2039${cbor.length}\u203A:`, cbor, 99);
  } else if (value.kind == "ValidatorHash") {
    return abbreviatedDetailBytes(
      `script\u2039${value.bytes.length}\u203A`,
      value.bytes
    );
  } else if (value.kind == "MintingPolicyHash") {
    const v = value;
    return `mph\u2039${policyIdAsString(v)}\u203A`;
  } else if (value.kind == "TxOutputId") {
    return `\u2039txoid:${txOutputIdAsString(value, 8)}\u203A`;
  }
  if (value.rawData) {
    return uplcDataSerializer(key, value.rawData, Math.max(depth, 3));
  }
  if (value.kind == "int") {
    const v = value;
    return `IntData\u2039${v.value}\u203A`;
  }
  if (value.kind == "bytes") {
    const v = value;
    return abbreviatedDetailBytes(
      `ByteArray\u2039${v.bytes.length}\u203A`,
      v.bytes,
      40
    );
  }
  if (value.kind == "Value") {
    return valueAsString(value);
  }
  if (value.kind == "Assets") {
    return `assets:\u2039${assetsAsString(value)}\u203A`;
  }
  if (value.kind == "AssetClass") {
    const ac = value;
    return `assetClass:\u2039${policyIdAsString(ac.mph)} ${displayTokenName(
      ac.tokenName
    )}}\u203A`;
  }
  if (value.kind)
    console.log("info: no special handling for KIND = ", value.kind);
  if ("tn" == key && Array.isArray(value)) {
    return decodeUtf8(value);
  } else if ("number" == typeof value) {
    return value.toString();
  } else if (value instanceof Map) {
    return `map\u2039${value.size}\u203A: { ${uplcDataSerializer(
      "",
      Object.fromEntries(value.entries()),
      Math.max(depth, 3)
    )}    }`;
  } else if (Array.isArray(value) && value.length == 0) {
    return "[]";
  } else if (Array.isArray(value) && value.every((v) => typeof v === "number")) {
    return `${abbreviatedDetailBytes(`bytes\u2039${value.length}\u203A`, value, 40)}`;
  } else if (Array.isArray(value)) {
    const inner = value.map(
      (v) => uplcDataSerializer("", v, Math.max(depth + 1, 3))
    );
    let extraNewLine2 = "";
    let usesOutdent2 = "";
    const multiLine2 = inner.map((s2) => {
      s2.trim().includes("\n");
      if (s2.length > 40) {
        extraNewLine2 = "\n";
        usesOutdent2 = outdent;
        return `${indent}${s2}`;
      }
      return s2;
    }).join(`, ${extraNewLine2}`);
    return `[ ${extraNewLine2}${multiLine2}${extraNewLine2}${usesOutdent2} ]`;
  }
  if (!value) {
    return JSON.stringify(value);
  }
  const keys = Object.keys(value);
  if (keys.length == 0) {
    return key ? "" : "{}";
  }
  if (keys.length == 1) {
    const singleKey = keys[0];
    const thisValue = value[singleKey];
    let inner = uplcDataSerializer("", thisValue, Math.max(depth, 3)) || "";
    if (Array.isArray(thisValue)) {
      if (!inner.length) {
        inner = "[ \u2039empty list\u203A ]";
      }
    } else {
      if (inner.length) inner = `{ ${inner} }`;
    }
    let s2 = `${singleKey}: ${inner}`;
    return s2;
  }
  let extraNewLine = "";
  let usesOutdent = "";
  let s = keys.map(
    (k) => `${indent}${k}: ${uplcDataSerializer(k, value[k], Math.max(depth + 1, 2))}`
  );
  const multiLineItems = s.map((s2) => {
    if (s2.length < 40 && !s2.includes("\n")) {
      return `${s2}`;
    } else {
      extraNewLine = "\n";
      usesOutdent = outdent;
      return `${s2}`;
    }
  });
  const multiLine = multiLineItems.join(`, ${extraNewLine}`);
  s = `${multiLine}${extraNewLine}${usesOutdent}`;
  if (key) return `{${extraNewLine}${s}}`;
  return `
${s}`;
}
function abbrevAddress(address) {
  return abbreviatedDetail(address.toString(), 12, false);
}
function abbreviatedDetailBytes(prefix, value, initLength = 8) {
  const hext = bytesToHex(value);
  value.length;
  const text = checkValidUTF8(value) ? ` \u2039"${abbreviatedDetail(decodeUtf8(value), initLength)}"\u203A` : ``;
  if (value.length <= initLength) return `${prefix}${hext}${text}`;
  const checksumString = encodeBech32("_", value).slice(-4);
  return `${prefix}${hext.slice(0, initLength)}\u2026 \u2039${checksumString}\u203A${text}`;
}
function abbreviatedDetail(hext, initLength = 8, countOmitted = false) {
  if (process?.env?.EXPAND_DETAIL) {
    return hext;
  } else {
    if (hext.length <= initLength) return hext;
    const omittedCount = countOmitted ? hext.length - initLength - 4 : 0;
    let omittedString = countOmitted ? `\u2039\u2026${omittedCount}\u2026\u203A` : "\u2026";
    if (countOmitted && omittedCount < omittedString.length) {
      omittedString = hext.slice(initLength, -4);
    }
    return `${hext.slice(0, initLength)}${omittedString}${hext.slice(-4)}`;
  }
}

const defaultNoDefinedModuleName = "\u2039default-needs-override\u203A";
const placeholderSetupDetails = {
  setup: {
    isMainnet: "mainnet" === environment.CARDANO_NETWORK,
    isPlaceholder: "for abstract bundleClass"
  }
};
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
   * an opt-in indicator of abstractness
   * @remarks
   * Subclasses that aren't intended for instantiation can set this to true.
   *
   * Subclasses that don't set this will not be treated as abstract.
   * @public
   */
  static isAbstract = void 0;
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
  static usingCapoBundleClass(c) {
    const cb = new c(placeholderSetupDetails);
    class aCapoBoundBundle extends HeliosScriptBundle {
      capoBundle = cb;
      constructor(setupDetails = placeholderSetupDetails) {
        super(setupDetails);
      }
      isConcrete = true;
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
  /**
   * optional attribute explicitly naming a type for the datum
   * @remarks
   * This can be used if needed for a contract whose entry point uses an abstract
   * type for the datum; the type-bridge & type-gen system will use this data type
   * instead of inferrring the type from the entry point.
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
  configuredUplcParams = void 0;
  configuredParams = void 0;
  preCompiled;
  alreadyCompiledScript;
  constructor(setupDetails = placeholderSetupDetails) {
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
  _didInit = false;
  debug = false;
  scriptHash;
  init(setupDetails) {
    const {
      deployedDetails,
      params,
      params: { delegateName, variant = "singleton" } = {},
      setup,
      previousOnchainScript
    } = setupDetails;
    const { config, programBundle } = deployedDetails || {};
    if (previousOnchainScript) {
      this.previousOnchainScript = previousOnchainScript;
      this.scriptHash = previousOnchainScript.uplcProgram.hash();
      return;
    }
    if (this.scriptParamsSource === "config") {
      if (programBundle) {
        this.configuredParams = config;
        this.configuredUplcParams = this.paramsToUplc(config);
        this.preCompiled = {
          singleton: { programBundle, config }
        };
      } else if (params) {
        if (this.preCompiled) {
          const thisVariant = this.preCompiled[variant];
          if (!thisVariant) {
            const msg = `${this.constructor.name}: no precompiled variant '${variant}'`;
            console.warn(
              `${msg}
  -- available variants: ${Object.keys(
                this.preCompiled
              ).join(", ")}`
            );
            console.log(
              "configured variant should be in scriptBundle's 'params'"
            );
            throw new Error(msg);
          }
          this._selectedVariant = variant;
          const preConfig = thisVariant.config;
          preConfig.rev = BigInt(preConfig.rev);
          if (preConfig.capoMph?.bytes) {
            preConfig.capoMph = makeMintingPolicyHash(
              preConfig.capoMph.bytes
            );
          }
          const uplcPreConfig = this.paramsToUplc(preConfig);
          const {
            params: { delegateName: delegateName2, ...params2 }
          } = setupDetails;
          const uplcRuntimeConfig = this.paramsToUplc(params2);
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
                preConfig[k] || (pre.rawData ?? pre),
                ` at runtime:`,
                params2[k] || (runtime.rawData ?? runtime)
              );
            }
          }
          if (didFindProblem) {
            throw new Error(
              `runtime-config conflicted with pre-config (see logged details) at key ${didFindProblem}`
            );
          }
        }
        this.configuredParams = setupDetails.params;
        this.configuredUplcParams = this.paramsToUplc(
          setupDetails.params
        );
      } else if (!setup.isPlaceholder) {
        throw new Error(
          `${this.constructor.name}: scriptParamsSource=config, but no program bundle, no script params`
        );
      }
    } else if (this.scriptParamsSource == "mixed") {
      debugger;
      const { params: params2 } = setupDetails;
      if (this.configuredParams) {
        debugger;
        throw new Error(
          `unreachable: configuredParameters used without deployedDetails? (dbpa)`
        );
      }
    } else if (this.scriptParamsSource == "bundle") {
      const selectedVariant = "singleton";
      this.configuredParams = this.getPreconfiguredVariantParams(selectedVariant);
      if (this.configuredParams) {
        this.configuredUplcParams = this.getPreconfiguredUplcParams(selectedVariant);
      }
    } else {
      throw new Error(`unknown scriptParamsSource: ${this.scriptParamsSource}`);
    }
    this._didInit = true;
  }
  get isPrecompiled() {
    return !!this.preCompiled;
  }
  getPreCompiledBundle(variant) {
    const foundVariant = this.preCompiled?.[variant];
    if (!foundVariant) {
      throw new Error(
        `${this.constructor.name}: variant ${variant} not found in preCompiled scripts`
      );
    }
    return foundVariant.programBundle;
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
  withSetupDetails(details) {
    if (details.setup.isPlaceholder) {
      debugger;
      throw new Error(
        `unexpected use of placeholder setup for helios script bundle (debugging breakpoint available)`
      );
    }
    const created = new this.constructor(details);
    created.init(details);
    return created;
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
      throw new Error(`${this.capoBundle.constructor.name}: no modules() list defined`);
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
  _selectedVariant;
  withVariant(vn) {
    if (!this.variants) {
      throw new Error(
        `variants not defined for ${this.constructor.name}`
      );
    }
    const foundVariant = this.variants[vn] ?? this.preCompiled?.[vn];
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
  compiledScript(asyncOk) {
    const {
      configuredUplcParams: params,
      setup,
      previousOnchainScript,
      program
    } = this;
    if (this.alreadyCompiledScript) {
      return this.alreadyCompiledScript;
    }
    if (this.isPrecompiled) {
      const { singleton } = this.preCompiled;
      if (singleton && !this._selectedVariant) {
        this.withVariant("singleton");
      }
      const bundleForVariant = this.preCompiled?.[this._selectedVariant];
      if (!bundleForVariant) {
        throw new Error(
          `${this.constructor.name}: variant ${this._selectedVariant} not found in preCompiled`
        );
      }
      if (bundleForVariant) {
        const p = this.alreadyCompiledScript = programFromCacheEntry(
          bundleForVariant.programBundle
        );
        return p;
      }
    } else {
      if (!params || !setup) {
        debugger;
        throw new Error(
          `${this.constructor.name}: missing required params or setup for compiledScript() (debugging breakpoint available)`
        );
      }
    }
    console.warn(
      `${this.constructor.name}: compiling helios script.  This could take 30s or more... `
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
    return program.compileWithCache({
      optimize: this.optimize
    }).then((uplcProgram) => {
      this.alreadyCompiledScript = uplcProgram;
      const scriptHash = bytesToHex(uplcProgram.hash());
      console.log(
        `compiled in ${(/* @__PURE__ */ new Date()).getTime() - t}ms -> ${scriptHash}`
      );
      return uplcProgram;
    });
  }
  get preBundledScript() {
    if (!this.isPrecompiled) return void 0;
    const { singleton } = this.preCompiled;
    if (singleton && !this._selectedVariant) {
      this.withVariant("singleton");
    }
    const bundleForVariant = this.preCompiled?.[this._selectedVariant];
    if (!bundleForVariant) {
      throw new Error(
        `${this.constructor.name}: variant ${this._selectedVariant} not found in preCompiled`
      );
    }
    return programFromCacheEntry(bundleForVariant.programBundle);
  }
  async getSerializedProgramBundle() {
    const compiledScript = await this.compiledScript();
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
  // _pct: number = 0
  get program() {
    if (this._program) {
      if (this.isPrecompiled != this._progIsPrecompiled || this.setup?.isMainnet !== this.isMainnet) {
        console.warn("busting program cache");
        this._program = void 0;
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
      const p = new HeliosProgramWithCacheAPI(this.main, {
        isTestnet,
        moduleSources,
        name: mName
        // it will fall back to the program name if this is empty
      });
      this._program = p;
      this._progIsPrecompiled = this.isPrecompiled;
      console.log(
        `\u{1F4E6} ${mName}: loaded & parsed ${this.isPrecompiled ? "with" : "without"} pre-compiled program: ${Date.now() - ts1}ms`
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
          `unexpected error while compiling helios program (or its imported module) 
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
  locateDatumType() {
    let datumType;
    const program = this.program;
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

export { AlreadyPendingError as A, byteArrayListAsString as B, datumSummary as C, hexToPrintableString as D, betterJsonSerializer as E, abbrevAddress as F, abbreviatedDetail as G, abbreviatedDetailBytes as H, HeliosScriptBundle as I, defaultNoDefinedModuleName as J, placeholderSetupDetails as K, mkTv as L, StellarTxnContext as S, TxNotNeededError as T, mkUutValuesEntries as a, delegateLinkSerializer as b, debugMath as c, dumpAny as d, errorMapAsString as e, realMul as f, colors as g, displayTokenName as h, assetsAsString as i, txAsString as j, utxoAsString as k, utxosAsString as l, mkValuesEntry as m, txOutputAsString as n, txInputAsString as o, policyIdAsString as p, lovelaceToAda as q, realDiv as r, stringToPrintableString as s, toFixedReal as t, uplcDataSerializer as u, valueAsString as v, addrAsString as w, byteArrayAsString as x, txidAsString as y, txOutputIdAsString as z };
//# sourceMappingURL=HeliosScriptBundle.mjs.map
