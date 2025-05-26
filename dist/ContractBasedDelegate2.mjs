import { makeTxOutput, makeValue, makeAssetClass, makeDummyAddress, makeTxOutputId, makeValidatorHash, makeAddress, makeMintingPolicyHash, makeInlineTxOutputDatum, makeTxInput } from '@helios-lang/ledger';
import { l as utxosAsString, d as dumpAny, S as StellarTxnContext, L as mkTv } from './HeliosScriptBundle.mjs';
import { decodeUtf8, equalsBytes, encodeUtf8 } from '@helios-lang/codec-utils';
import { makeCast } from '@helios-lang/contract-utils';

const maxUutName = 32;
class UutName {
  _uutName;
  purpose;
  constructor(purpose, fullUutName) {
    this.purpose = purpose;
    if (Array.isArray(fullUutName)) {
      fullUutName = decodeUtf8(fullUutName);
    }
    if (fullUutName.length > maxUutName) {
      throw new Error(
        `uut name '${fullUutName}' exceeds max length of ${maxUutName}`
      );
    }
    this._uutName = fullUutName;
  }
  /**
   * the full uniquified name of this UUT
   * @remarks
   *
   * format: `purpose-‹...uniqifier...›`
   * @public
   **/
  get name() {
    return this._uutName;
  }
  toString() {
    return this._uutName;
  }
}

class UtxoHelper {
  strella;
  setup;
  constructor(setup, strella) {
    this.setup = setup;
    if (!setup.uxtoDisplayCache) {
      setup.uxtoDisplayCache = /* @__PURE__ */ new Map();
    }
    this.strella = strella;
  }
  get networkParams() {
    return this.setup.networkParams;
  }
  get wallet() {
    return this.setup.actorContext.wallet;
  }
  get network() {
    return this.setup.chainBuilder || this.setup.network;
  }
  /**
   * Filters out utxos having non-ada tokens
   * @internal
   */
  hasOnlyAda(value, tcx, u) {
    const toSortInfo = this.mkUtxoSortInfo(value.lovelace);
    const found = [u].map(toSortInfo).filter(this.utxoIsSufficient).filter(this.utxoIsPureADA).map(this.sortInfoBackToUtxo).at(0);
    return found;
  }
  /**
   * Sorts utxos by size, with pure-ADA utxos preferred over others.
   * @internal
   */
  utxoSortSmallerAndPureADA({ free: free1, minAdaAmount: r1 }, { free: free2, minAdaAmount: r2 }) {
    {
      //! primary: treats pure-ada utxos as always better
      if (!r1 && r2) {
        return -1;
      }
      if (r1 && !r2) {
        return 1;
      }
    }
    //! secondary: smaller utxos are more preferred than larger ones
    if (free2 > free1) return -1;
    if (free2 < free1) return 1;
    return 0;
  }
  /**
   * Filters out utxos that are not sufficient to cover the minimum ADA amount established in
   * the utxo sort info in {@link UtxoHelper.mkUtxoSortInfo | mkUtxoSortInfo(min, max?)}.  Use in a filter() call.
   * @internal
   */
  utxoIsSufficient({ sufficient }) {
    return !!sufficient;
  }
  /**
   * Filters out utxos that have non-ADA tokens, given a utxo sort info object.  Use in a filter() call.
   * @internal
   */
  utxoIsPureADA({ u }) {
    return u.value.assets.isZero() ? u : void 0;
  }
  /**
   * transforms utxo sort info back to just the utxo.
   * @internal
   */
  sortInfoBackToUtxo({ u }) {
    return u;
  }
  /**
   * Creates a function that creates sort-info details for a utxo, given a minimum ADA amount
   * and an optional maximum ADA amount.
   * @internal
   **/
  mkUtxoSortInfo(min, max) {
    return (u) => {
      const minAdaAmount = u.value.assets.isZero() ? BigInt(0) : (() => {
        const dummy = makeTxOutput(
          u.output.address,
          makeValue(0, u.output.value.assets)
        );
        dummy.correctLovelace(this.networkParams);
        return dummy.value.lovelace;
      })();
      const free = u.value.lovelace - minAdaAmount;
      const sufficient = free > min && (max ? free < max : true);
      const t = { u, sufficient, free, minAdaAmount };
      return t;
    };
  }
  /**
   * accumulates the count of utxos, but only if the utxo is ADA-only.  Use in a reduce() call.
   **/
  reduceUtxosCountAdaOnly(c, { minAdaAmount }) {
    return c + (minAdaAmount ? 0 : 1);
  }
  hasToken(something, value, tokenName, quantity) {
    if (something.kind == "TxOutput")
      return this.outputHasToken(
        something,
        value,
        tokenName,
        quantity
      ) && something || void 0;
    if (something.kind == "TxInput")
      return this.utxoHasToken(
        something,
        value,
        tokenName,
        quantity
      ) && something || void 0;
    if (something.kind == "Assets")
      return this.assetsHasToken(
        something,
        value,
        tokenName,
        quantity
      ) && something || void 0;
    throw new Error("unexpected");
  }
  utxoHasToken(u, value, tokenName, quantity) {
    return this.outputHasToken(u.output, value, tokenName, quantity) && u;
  }
  inputHasToken(i, value, tokenName, quantity) {
    return this.outputHasToken(i.output, value, tokenName, quantity) && i;
  }
  assetsHasToken(a, vOrMph, tokenName, quantity) {
    const v = vOrMph.kind == "MintingPolicyHash" ? this.mkAssetValue(vOrMph, tokenName, quantity) : vOrMph;
    return a.isGreaterOrEqual(v.assets);
  }
  outputHasToken(o, vOrMph, tokenName, quantity) {
    const isValue = vOrMph.kind == "Value";
    if (!isValue) {
      if (!tokenName || !quantity) {
        throw new Error(
          `missing required tokenName/quantity (or use a Value in arg2`
        );
      }
    }
    const v = isValue ? vOrMph : makeValue(vOrMph, tokenName, quantity);
    return o.value.isGreaterOrEqual(v);
  }
  /**
   * @deprecated - use helios `makeValue()` instead
   */
  mkAssetValue(mph, tokenName, count = 1n) {
    const v = makeValue(
      mph,
      tokenName,
      count
      // ...other mph / token-map pairs
    );
    return v;
  }
  findSmallestUnusedUtxo(lovelace, utxos, tcx) {
    const value = makeValue(lovelace);
    const toSortInfo = this.mkUtxoSortInfo(value.lovelace);
    const found = utxos.map(toSortInfo).filter(this.utxoIsPureADA).filter(this.utxoIsSufficient).filter((uInfo) => {
      if (!tcx) return true;
      return !!tcx?.utxoNotReserved(uInfo.u);
    }).sort(this.utxoSortSmallerAndPureADA).map(this.sortInfoBackToUtxo);
    console.log("smallest utxos: ", utxosAsString(found));
    const chosen = found.at(0);
    return chosen;
  }
  /**
   * creates a filtering function, currently for TxInput-filtering only.
   * with the optional tcx argument, utxo's already reserved
   *  ... in that transaction context will be skipped.
   * @public
   */
  mkValuePredicate(lovelace, tcx) {
    const value = makeValue(lovelace);
    const predicate = _adaPredicate.bind(this, tcx);
    predicate.predicateValue = value;
    return predicate;
    function _adaPredicate(tcx2, utxo) {
      return this.hasOnlyAda(value, tcx2, utxo);
    }
  }
  mkRefScriptPredicate(expectedScriptHash) {
    return (txin) => {
      const refScript = txin.output.refScript;
      if (!refScript) return false;
      const foundHash = refScript.hash();
      return equalsBytes(foundHash, expectedScriptHash);
    };
  }
  /**
   * Creates an asset class for the given token name, for the indicated minting policy
   */
  acAuthorityToken(tokenName, mph) {
    let ourMph = mph;
    if (!ourMph) {
      if (!this.strella) {
        throw new Error(
          `no contract available for resolving minting policy hash; provide to acAuthorityToken or use a UtxoHelper having a strella prop`
        );
      }
      ourMph = this.strella.mintingPolicyHash;
    }
    if (!ourMph) {
      throw new Error(`no minting policy hash available`);
    }
    return makeAssetClass(ourMph, tokenName);
  }
  /**
   * Creates a Value object representing a token with a minimum lovelace amount
   * making it valid for output in a utxo.
   * @public
   */
  mkMinTv(mph, tokenName, count = 1n) {
    const tnBytes = Array.isArray(tokenName) ? tokenName : encodeUtf8(tokenName.toString());
    return this.mkMinAssetValue(mph, tnBytes, count);
  }
  mkMinAssetValue(mph, tokenName, count = 1n) {
    const v = makeValue(mph, tokenName, count);
    const dummyAddr = makeDummyAddress(false);
    const txo = makeTxOutput(dummyAddr, v);
    txo.correctLovelace(this.networkParams);
    return txo.value;
  }
  tokenAsValue(tokenName, count = 1n) {
    throw new Error(`only implemented by Capo`);
  }
  mkTokenPredicate(specifier, quantOrTokenName, quantity) {
    let mph;
    let tokenName;
    //!!! todo: support (AssetClass, quantity) input form
    if (!specifier)
      throw new Error(
        `missing required Value or MintingPolicyHash or UutName (or uut-name as byte-array) in arg1`
      );
    _tokenPredicate.bind(this);
    const isValue = specifier.kind == "Value";
    const isTokenNameOnly = "string" === typeof specifier || Array.isArray(specifier) && "number" === typeof specifier[0];
    const isUut = specifier instanceof UutName;
    if (isValue) {
      const v2 = specifier;
      const t = _tokenPredicate.bind(this, v2);
      t.predicateValue = v2;
      return t;
    } else if (isUut || isTokenNameOnly) {
      const tn = specifier;
      const quant = quantOrTokenName ? BigInt(quantOrTokenName) : 1n;
      const mph2 = this.strella.mph;
      if (!mph2) {
        throw new Error(
          `this helper doesn't have a capo contract to resolve minting policy hash; specify the mph explicitly`
        );
      }
      const tnBytes = isUut ? encodeUtf8(tn.toString()) : Array.isArray(tn) ? tn : encodeUtf8(tn);
      const tv = makeValue(
        mph2,
        tnBytes,
        quant
        // quantity if any
      );
      const t = _tokenPredicate.bind(this, tv);
      t.predicateValue = tv;
      return t;
    } else if (specifier.kind == "MintingPolicyHash") {
      mph = specifier;
      if ("string" !== typeof quantOrTokenName)
        throw new Error(
          `with minting policy hash, token-name must be a string (or ByteArray support is TODO)`
        );
      tokenName = quantOrTokenName;
      quantity = quantity || 1n;
      const tv = this.mkAssetValue(mph, tokenName, quantity);
      const t = _tokenPredicate.bind(this, tv);
      t.predicateValue = tv;
      return t;
    } else if (specifier.kind == "AssetClass") {
      const s = specifier;
      mph = s.mph;
      if (!quantOrTokenName) quantOrTokenName = 1n;
      if ("bigint" !== typeof quantOrTokenName)
        throw new Error(
          `with AssetClass, the second arg must be a bigint like 3n, or omitted`
        );
      quantity = quantOrTokenName;
      const tv = makeValue(0n, [[mph, [[s.tokenName, quantity]]]]);
      const t = _tokenPredicate.bind(this, tv);
      t.predicateValue = tv;
      return t;
    } else {
      throw new Error(
        `wrong token specifier (need Value, MPH+tokenName, or AssetClass`
      );
    }
    function _tokenPredicate(v2, something) {
      return this.hasToken(something, v2);
    }
  }
  /**
   * adds the values of the given TxInputs
   */
  totalValue(utxos) {
    return utxos.reduce((v, u) => {
      return v.add(u.value);
    }, makeValue(0n));
  }
  /**
   * Creates a Value object representing a token with the given name and quantity
   * @deprecated - Use `helios' makeValue()` instead.
   * @remarks
   * This method doesn't include any lovelace in the Value object.
   * use mkMinAssetValue() to include the minimum lovelace for storing that token in its own utxo
   * @param tokenName - the name of the token
   * @param quantity - the quantity of the token
   * @param mph - the minting policy hash of the token
   * @public
   **/
  mkTokenValue(tokenName, quantity, mph) {
    return makeValue(mph, tokenName, quantity);
  }
  /**
   * Creates a Value having enough lovelace to store the indicated token
   * @deprecated - Use {@link UtxoHelper.mkMinAssetValue | mkMinAssetValue(mph, tokenName, quantity)} instead.
   * @remarks
   * This is equivalent to mkTokenValue() with an extra min-utxo calculation
   * @public
   **/
  mkMinTokenValue(tokenName, quantity, mph) {
    return this.mkMinAssetValue(mph, tokenName, quantity);
  }
  /**
   * Locates a utxo in the current actor's wallet that matches the provided token predicate
   * @remarks
   * With the mode="multiple" option, it returns an array of matches if any are found, or undefined if none are found.
   * @public
   */
  async findActorUtxo(name, predicate, options = {}, mode = "single") {
    const wallet = options.wallet ?? this.wallet;
    const addrs = await wallet?.usedAddresses ?? [];
    const utxos = [];
    for (const addr of addrs.flat(1)) {
      if (!addr) continue;
      const addrUtxos = await this.network.getUtxos(addr);
      utxos.push(...addrUtxos);
    }
    return this.hasUtxo(
      name,
      predicate,
      {
        ...options,
        wallet,
        utxos
      },
      mode
    );
  }
  /**
   * Try finding a utxo matching a predicate
   * @remarks
   * Filters the provided list of utxos to find the first one that matches the predicate.
   *
   * Skips any utxos that are already being spent in the provided transaction context.
   * Skips any utxos that are marked as collateral in the wallet.
   *
   * With the mode="multiple" option, it returns an array of matches if any are found, or undefined if none are found.
   * @public
   **/
  async hasUtxo(semanticName, predicate, {
    // address,
    wallet,
    exceptInTcx,
    utxos,
    required,
    dumpDetail
  }, mode = "single") {
    let notCollateral = await (async () => {
      let nc = utxos;
      try {
        const collateral = ((wallet ? "handle" in wallet ? await wallet.handle.collateral : "collateral" in wallet ? wallet.collateral : void 0 : void 0) ?? [])[0];
        nc = utxos.filter((u) => !collateral?.isEqual(u));
      } catch {
      }
      return nc;
    })();
    const filtered = exceptInTcx ? utxos.filter(exceptInTcx.utxoNotReserved.bind(exceptInTcx)) : notCollateral;
    const foundMultiple = filtered.filter(predicate);
    const foundOne = foundMultiple[0];
    const joiner = "\n   \u{1F50E}  ";
    const detail = (
      // true ||
      dumpDetail == "always" || globalThis.utxoDump || !foundOne && dumpDetail == "onFail" ? "\n  from set: " + joiner + utxosAsString(filtered, joiner) : `(${filtered.length} candidates; show with globalThis.utxoDump or \`dumpDetail\` option)`
    );
    console.log(
      `  \u{1F50E} finding '${semanticName}' utxo${exceptInTcx ? " (not already being spent in txn)" : ""} ${detail}`
      // ...(exceptInTcx && filterUtxos?.length
      //     ? [
      //           "\n  ... after filtering out:\n ",
      //           utxosAsString(exceptInTcx.reservedUtxos(), "\n  "),
      //       ]
      //     : [])
    );
    if (foundOne) {
      const multiInfo = mode == "multiple" ? ` ${foundMultiple.length} matches; first: ` : "";
      console.log(
        "   \u{1F388}found" + multiInfo + utxosAsString(
          [foundOne],
          void 0,
          this.setup.uxtoDisplayCache
        )
      );
    } else {
      if (exceptInTcx) {
        const alreadyInTcx = exceptInTcx.inputs.find(predicate);
        if (alreadyInTcx) {
          console.log(
            `
  um... value ${dumpAny(
              predicate.predicateValue
            )} not found. 
     ${dumpAny(alreadyInTcx)}
  FYI, it seems this ^^ current txn input already has the target value. 
    NOTE: You may want to adjust your dAPI to create an explicit fail-if-already-present semantic
    ... or, alternatively, to allow this token to authenticate multiple transaction elements
    ... by using explicitly idempotent 'addOrReuse' semantics, with details stored in tcx.state

  ... go with care, and ask the community for help if you're unsure
  )` + (required ? "\nBTW, here is that txn as of this time: " + await alreadyInTcx.dump() + "\n\n \u{1F441}\uFE0F   \u{1F441}\uFE0F \u{1F441}\uFE0F ^^^^^^^ More details about the utxo search failure above ^^^^^^^ \u{1F441}\uFE0F \u{1F441}\uFE0F   \u{1F441}\uFE0F" : "")
          );
          return void 0;
        }
      }
    }
    if (mode == "multiple") {
      if (!foundMultiple.length) {
        return void 0;
      }
      return foundMultiple;
    }
    return foundOne;
  }
  async mustFindActorUtxo(name, options) {
    const wallet = this.wallet;
    return this.mustFindUtxo(name, {
      ...options,
      wallet
    });
  }
  async mustFindUtxo(semanticName, options) {
    const {
      predicate,
      extraErrorHint = "",
      wallet,
      address,
      exceptInTcx
    } = options;
    const addrs = await wallet?.usedAddresses ?? [address];
    const utxos = [];
    for (const addr of addrs.flat(1)) {
      if (!addr) continue;
      const addrUtxos = await this.network.getUtxos(addr);
      utxos.push(...addrUtxos);
    }
    const found = await this.hasUtxo(semanticName, predicate, {
      address,
      wallet,
      exceptInTcx,
      utxos,
      required: true
    });
    if (!found) {
      const walletAddr = wallet ? (
        //@ts-ignore - sorry typescript, address sometimes is present on a SimpleWallet in test environment
        wallet.address || await wallet.usedAddresses
      ) : void 0;
      if (!globalThis.utxoDump) {
        console.log(
          // warning emoji: "⚠️"
          " \u26A0\uFE0F find failed in candidate utxos (debugging breakpoint available)\n",
          semanticName,
          dumpAny(utxos)
        );
      }
      debugger;
      const addrString = address?.toString();
      const utxos2 = address ? await this.network.getUtxos(address) : await wallet.utxos;
      console.log(
        addrString,
        wallet,
        addrs.map((a) => a?.toString())
      );
      for (const u of utxos2) {
        predicate(u);
      }
      throw new Error(
        this.utxoSearchError(
          semanticName,
          options,
          extraErrorHint,
          walletAddr
        )
      );
    }
    return found;
  }
  utxoSearchError(semanticName, searchScope, extraErrorHint, walletAddresses) {
    const where = searchScope.address ? `
 -- searched in address ${searchScope.address.toString()}` : ``;
    const wAddrs = Array.isArray(walletAddresses) ? walletAddresses : walletAddresses ? [walletAddresses] : [];
    let more = wAddrs.length ? wAddrs.map((x) => dumpAny(x) + ` = ${x.toString()}`).join("\n") : "";
    if (wAddrs.length > 1) {
      more = "\n  ... wallet addrs:\n";
    } else {
      more = wAddrs.length ? `
  ... in wallet addr: ${more}` : "";
    }
    if (extraErrorHint) more += "\n";
    return `${this.constructor.name}: '${semanticName}' utxo not found ${more}  ... ${extraErrorHint || "sorry, no extra clues available"}${where}
  ... see more details in log`;
  }
  toUtxoId(u) {
    return `${u.id.txId.toHex()}@${u.id.index}`;
  }
}

class SeedActivity {
  constructor(host, factoryFunc, arg) {
    this.host = host;
    this.factoryFunc = factoryFunc;
    this.arg = arg;
  }
  arg;
  mkRedeemer(seedFrom) {
    return this.factoryFunc.call(this.host, seedFrom, this.arg);
  }
}
function impliedSeedActivityMaker(host, factoryFunc) {
  const makesActivityWithImplicitSeedAndArgs = (arg) => {
    const seedActivity = new SeedActivity(host, factoryFunc, arg);
    return seedActivity;
  };
  return makesActivityWithImplicitSeedAndArgs;
}
function getSeed(arg) {
  if (arg.kind == "TxOutputId") return arg;
  if (arg instanceof StellarTxnContext) {
    const { txId, idx } = arg.getSeedUtxoDetails();
    return makeTxOutputId(txId, idx);
  }
  if (arg.idx && arg.txId) {
    const attr = arg;
    return makeTxOutputId(attr.txId, attr.idx);
  }
  const txoIdLike = arg;
  return makeTxOutputId(txoIdLike);
}

const rawDataBridgeProxy = new Proxy(
  {},
  {
    apply(_, THIS, [x]) {
      if (!THIS.isCallable)
        throw new Error(
          `dataBridge ${THIS.constructor.name} is not callable`
        );
      return THIS["\u1C7A\u1C7Acast"].toUplcData(x);
    }
  }
);
function dataBridgeProxyBase() {
}
dataBridgeProxyBase.prototype = rawDataBridgeProxy;
class DataBridge extends dataBridgeProxyBase {
  "\u1C7A\u1C7Aschema";
  isMainnet;
  isActivity;
  isNested;
  // relaxed protected so that GenericDelegateBridge and specific bridges don't have to
  //   use an inheritance relationship.  Can add that kind of inheritance and make this protected again.
  "\u1C7A\u1C7Acast";
  isCallable = false;
  mkData = (x) => this["\u1C7A\u1C7Acast"].toUplcData(x);
  readData = (x) => this["\u1C7A\u1C7Acast"].fromUplcData(x);
  constructor(options) {
    super();
    this["\u1C7A\u1C7Aschema"] = void 0;
    this["\u1C7A\u1C7Acast"] = void 0;
    const { isMainnet, isActivity, isNested } = options;
    this.isMainnet = isMainnet;
    this.isActivity = isActivity || false;
    this.isNested = isNested || false;
  }
  //
  // declare activity: DataBridge | ((...args:any) => UplcData)
  // declare  datum: DataBridge | ((...args:any) => UplcData)
  // // get datum() {
  // //     throw new Error(`each dataBridge makes its own datum`)
  // // }
  getSeed(arg) {
    return getSeed(arg);
  }
  redirectTo;
  mkDataVia(redirectionCallback) {
    if (!this.isNested) {
      throw new Error(
        `dataMaker ${this.constructor.name}: redirectTo is only valid for nested enums`
      );
    }
    this.redirectTo = redirectionCallback;
  }
  get isEnum() {
    return "enum" === this["\u1C7A\u1C7Aschema"].kind;
  }
  getTypeSchema() {
    if (!this["\u1C7A\u1C7Aschema"]) {
      this["\u1C7A\u1C7Aschema"] = "placeholder";
      this["\u1C7A\u1C7Acast"] = makeCast(this["\u1C7A\u1C7Aschema"], {
        isMainnet: this.isMainnet,
        unwrapSingleFieldEnumVariants: true
      });
    }
    return this["\u1C7A\u1C7Aschema"];
  }
  // usesRedeemerWrapper : boolean = false
  // toUplc(x: any) {
  //     return this.ᱺᱺcast.toUplcData(x)
  // }
  // get __typeName() : string {
  //     return "someTypeName" // this.__typeDetails.dataType.name
  //     // //@ts-expect-error not all schemas have names
  //     // const {name=""} = this.ᱺᱺschema!
  //     // if (!name) {
  //     //     throw new Error(`can't get typeName for unnamed type: ${this.__schema!.kind}`)
  //     // }
  //     // return name
  // }
}
class ContractDataBridge {
  static isAbstract = true;
  isAbstract = true;
  isMainnet;
  constructor(isMainnet) {
    if (true !== isMainnet && false !== isMainnet)
      throw new Error(`isMainnet signal must be provided (boolean)`);
    this.isMainnet = isMainnet;
  }
  readData(x) {
    if (!this.datum) throw new Error(`no datum on this dataBridge`);
    return this.datum.readData(x);
  }
}
class ContractDataBridgeWithEnumDatum extends ContractDataBridge {
  static isAbstract = true;
  isAbstract = true;
  // constructor(isMainnet : boolean) {
  //     super(isMainnet);
  // }
}
class ContractDataBridgeWithOtherDatum extends ContractDataBridge {
  static isAbstract = true;
  isAbstract = true;
}
class DataBridgeReaderClass {
}

var __defProp$1 = Object.defineProperty;
var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
var __decorateClass$1 = (decorators, target, key, kind) => {
  var result = __getOwnPropDesc$1(target, key) ;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (decorator(target, key, result) ) || result;
  if (result) __defProp$1(target, key, result);
  return result;
};
let configuredNetwork = void 0;
function isUplcData(x) {
  return "kind" in x && "toCbor" in x;
}
const Activity = {
  /**
   * Decorates a partial-transaction function that spends a contract-locked UTxO using a specific activity ("redeemer")
   * @remarks
   *
   * activity-linked transaction-partial functions must follow the txn\{...\}
   * and active-verb ("ing") naming conventions.  `txnRetiringDelegation`,
   * `txnModifyingVote` and `txnWithdrawingStake` would be examples
   * of function names following this guidance.
   *
   * @public
   **/
  partialTxn(proto, thingName, descriptor) {
    needsActiveVerb(thingName);
    return partialTxn(proto, thingName, descriptor);
  },
  /**
   * Decorates a factory-function for creating tagged redeemer data for a specific on-chain activity
   * @remarks
   *
   * The factory function should follow an active-verb convention by including "ing" in
   * the name of the factory function
   *
   * Its leading prefix should also match one of 'activity', 'burn', or 'mint'.  These
   * conventions don't affect the way the activity is verified on-chain, but they
   * provide guard-rails for naming consistency.
   * @public
   **/
  redeemer(proto, thingName, descriptor) {
    const isActivity = thingName.match(/^activity[A-Z]/);
    const isBurn = thingName.match(/^burn[A-Z]/);
    thingName.match(/^mint[A-Z]/);
    if (!isActivity && !isBurn) {
      throw new Error(
        `@Activity.redeemer: ${thingName}: name should start with '(activity|burn|mint)[A-Z]...'`
      );
    }
    needsActiveVerb(
      thingName,
      /* show workaround offer */
      true
    );
    return Activity.redeemerData(proto, thingName, descriptor);
  },
  redeemerData(proto, thingName, descriptor) {
    //!!! todo: registry and cross-checking for missing redeeming methods
    //!!! todo: develop more patterns of "redeemer uses an input of a certain mph/value"
    return descriptor;
  }
};
function needsActiveVerb(thingName, okWorkaround) {
  if (!thingName.match(/ing/)) {
    const orWorkaround = okWorkaround && "(or work around with @Activity.redeemerData instead)";
    throw new Error(
      `Activity: ${thingName}: name should have 'ing' in it ${orWorkaround}`
    );
  }
  if (thingName.match(/^ing/)) {
    throw new Error(
      `Activity: ${thingName}: name shouldn't start with 'ing'`
    );
  }
}
function datum(proto, thingName, descriptor) {
  if (!thingName.match(/^mkDatum/)) {
    throw new Error(
      `@datum factory: ${thingName}: name should start with 'mkDatum...'`
    );
  }
  return descriptor;
}
function txn(proto, thingName, descriptor) {
  if (!thingName.match(/^mkTxn/)) {
    throw new Error(
      `@txn factory: ${thingName}: name should start with 'mkTxn...'`
    );
  }
  return descriptor;
}
function partialTxn(proto, thingName, descriptor) {
  if (!thingName.match(/^txn[A-Z]/)) {
    let help = "";
    if (thingName.match(/^mkTxn/)) {
      help = `
  ... or, for transaction initiation with mkTxn, you might try @txn instead. `;
    }
    throw new Error(
      `@partialTxn factory: ${thingName}: should start with 'txn[A-Z]...'${help}`
    );
  }
  return descriptor;
}
async function findInputsInWallets(v, searchIn, network) {
  const { wallets, addresses } = searchIn;
  const lovelaceOnly = v.assets.isZero();
  console.warn("finding inputs", {
    lovelaceOnly
  });
  for (const w of wallets) {
    const [a] = await w.usedAddresses;
    console.log("finding funds in wallet", a.toString().substring(0, 18));
    const utxos = await w.utxos;
    for (const u of utxos) {
      if (lovelaceOnly) {
        if (u.value.assets.isZero() && u.value.lovelace >= v.lovelace) {
          return u;
        }
        console.log("  - too small; skipping ", u.value.dump());
      } else {
        if (u.value.isGreaterOrEqual(v)) {
          return u;
        }
      }
    }
  }
  if (lovelaceOnly) {
    throw new Error(
      `no ADA is present except those on token bundles.  TODO: findFreeLovelaceWithTokens`
    );
  }
  //!!! todo: allow getting free ada from a contract address?
  if (addresses) {
    for (const a of addresses) {
      const utxos = await network.getUtxos(a);
      for (const u of utxos) {
        if (u.value.isGreaterOrEqual(v)) {
          return u;
        }
      }
    }
  }
  throw new Error(
    `None of these wallets${addresses && " or addresses" || ""} have the needed tokens`
  );
}
class StellarContract {
  //! it has scriptProgram: a parameterized instance of the contract
  //  ... with specific `parameters` assigned.
  // bundle?: HeliosScriptBundle;
  configIn;
  partialConfig;
  // contractParams?: UplcRecord<ConfigType>;
  setup;
  get network() {
    return this.setup.chainBuilder || this.setup.network;
  }
  networkParams;
  actorContext;
  // isTest?: boolean
  static get defaultParams() {
    return {};
  }
  static parseConfig(rawJsonConfig) {
    throw new Error(
      `Stellar contract subclasses should define their own static parseConfig where needed to enable connection from a specific dApp to a specific Stellar Contract.`
    );
  }
  /** each StellarContracts subclass needs to provide a scriptBundle class.
   * @remarks
   * Your script bundle MUST be defined in a separate file using a convention of
   * `‹scriptName›.hlb.ts`, and exported as a default class.  It should inherit
   * from HeliosScriptBundle or one of its subclasses.  Stellar Contracts processes
   * this file, analyzes the on-chain types defined in your Helios sources, and generates
   * Typescript types and a data-bridging class for your script.
   *
   * Once the data-bridge class is generated, you should import it into your contract
   * module and assign it to your `dataBridgeClass` attribute.
   */
  scriptBundle() {
    debugger;
    throw new Error(
      `${this.constructor.name}: missing required implementation of scriptBundle()
...each Stellar Contract must provide a scriptBundle() method. 
It should return an instance of a class defined in a *.hlb.ts file.  At minimum:

    export default class MyScriptBundle extends HeliosScriptBundle { ... }
 or export default CapoDelegateBundle.usingCapoBundleClass(SomeCapoBundleClass) { ... }

We'll generate TS types and other utilities for connecting to the data-types in your Helios sources.
Your scriptBundle() method can return \`MyScriptBundle.create();\``
    );
  }
  /**
   * the dataBridgeClass attribute MUST be defined for any bundle having a datum type
   *  - this is the bridge class for converting from off-chain data types to on-chain data
   *  - it provides convenient, type-safe interfaces for doing that
   *
   * @remarks
   * Minters don't have datum, so they don't need to define this attribute.  However,
   * note that ***mint delegates*** do in fact have datum types. If you are defining
   * a custom delegate of that kind, you will need to define this attribute.
   */
  dataBridgeClass = void 0;
  /**
   * The `onchain` object provides access to all bridging capabilities for this contract script.
   * @remarks
   * Its nested attributes include:
   *  - `types` - a collection of all the on-chain types defined in the script, with data-creation helpers for each
   *  - `activity` - a creation helper for the activities/redeemers defined in the script
   *
   * Scripts that use datum types (not including minters) will also have:
   *  - `datum` - a data-creation helper for the datum type of the script
   *  - `readDatum` - a data-reading helper for the datum type of the script
   *
   * ### Low-level type access
   * For low-level access (it's likely you don't need to use this) for on-chain types, the `reader` attribute (aka `offchain`) exists: .
   *  - `reader` - a collection of data-reading helpers for the on-chain types, given UPLC data known to be of that type
   * @public
   */
  get onchain() {
    return this.getOnchainBridge();
  }
  /**
   * The `offchain` object provides access to readers for the on-chain types of this contract script.
   * @remarks
   * Its nested attributes include all the on-chain types defined in the script, with data-reading helpers for each.
   * This is useful for reading on-chain data in off-chain code.
   *
   * ### Warning: low-level typed-data access!
   *
   * Note that these readers will work properly with UPLC data known to be of the correct type.  If you
   * encounter errors related to these results, it's likely you are using the wrong reader for the data you
   * have in hand.
   *
   * For the typical use-case of reading the datum type from a UTxO held in the contract, this is not a problem,
   * and note that the `readDatum` helper provides a shortcut for this most-common use-case.
   *
   * If you're not sure what you're doing, it's likely that this is not the right tool for your job.
   * @public
   */
  get offchain() {
    return this.getOnchainBridge().reader;
  }
  get reader() {
    return this.getOnchainBridge().reader;
  }
  get activity() {
    const bridge = this.onchain;
    return bridge.activity;
  }
  /**
   * Converts UPLC from an on-chain datum object to a typed off-chain datum object.
   *
   * Given a **utxo with a datum of the contract's datum type**, this method will convert the UPLC datum
   * to a typed off-chain datum object.
   *
   * ### Standard WARNING
   *
   * If the datum's structure is not of the expected type, this method MAY throw an error, or it might
   * return data that can cause problems somewhere else in your code.  That won't happen if you're
   * following the guidance above.
   */
  get newReadDatum() {
    const bridge = this.getOnchainBridge();
    const { readDatum } = bridge;
    if (!readDatum) {
      throw new Error(
        `${this.constructor.name}: this contract script doesn't use datum`
      );
    }
    return readDatum;
  }
  _bundle;
  getBundle() {
    if (!this._bundle) {
      this._bundle = this.scriptBundle();
      if (this._bundle.preCompiled && !this._bundle.preCompiled.singleton) ;
      if (!this._bundle._didInit) {
        console.warn(
          `NOTE: the scriptBundle() method in ${this.constructor.name} isn't
initialized properly; it should use \`${this._bundle.constructor.name}.create({...})\`
... instead of \`new ${this._bundle.constructor.name}({...})\` `
        );
      }
    }
    return this._bundle;
  }
  /**
   * Provides access to the script's activities with type-safe structures needed by the validator script.
   *
   * @remarks - the **redeemer** data (needed by the contract script) is defined as one or
   * more activity-types (e.g. in a struct, or an enum as indicated in the type of the last argument to
   * the validator function).
   *   - See below for more about ***setup & type-generation*** if your editor doesn't  provide auto-complete for
   *    the activities.
   *
   * ### A terminology note: Activities and Redeemers
   *
   * Although the conventional terminology of "redeemer" is universally well-known
   * in the Cardano developer community, we find that defining one or more **activities**,
   * with their associated ***redeemer data***, provides an effective semantic model offering
   * better clarity and intution.
   *
   * Each type of contract activity corresponds to an enum variant in the contract script.
   * For each of those variants, its redeemer data contextualizes the behavior of the requested
   * transaction.  A non-enum redeemer-type implies that there is only one type of activity.
   *
   * Any data not present in the transaction inputs or outputs, but needed for
   * specificity of the requested activity, can only be provided through these activity details.
   * If that material is like a "claim ticket", it would match the "redeemer" type of labeling.
   *
   * Activity data can include any kinds of details needed by the validator: settings for what it
   * is doing, options for how it is being done, or what remaining information the validator may
   * need, to verify the task is being completed according to protocol.  Transactions containing
   * a variety of inputs and output, each potential candidates for an activity, can use the activity
   * details to resolve ambiguity so the validator easily acts on the correct items.
   *
   * ### Setup and Type generation
   * #### Step 1: create your script **`.hlb.ts`**
   * With a defined script bundle, `import YourScriptNameBundle from "./YourBundleName.hlb.js"`
   * to your StellarContracts class module, and define a `scriptBundle() { return new YourScriptNameBundle() }` or
   * similar method in that class.
   *
   * This results in a generated **`.typeInfo.ts`** and **`.bridge.ts`** with complete
   * typescript bindings for your on-chain script (trouble? check Plugin setup below).
   *
   * #### Step 2: Import the generated bridge class
   * Using the generated .bridge file:
   * > `import YourScriptNameDataBridge from "./YourBundleName.bridge.js"`
   *
   * ... and set the `dataBridgeClass` property in your class:
   *
   * >    `dataBridgeClass = YourScriptNameDataBridge`
   *
   * ### Plugin Setup
   *
   * The activity types should be available through type-safe auto-complete in your editor.  If not,
   * you may need to install and configure the Stellar Contracts rollup plugins for importing .hl
   * files and generating .d.ts for your .hlb.ts files.  See the Stellar Contracts development
   * guide for additional details.
   *
   */
  // get activity(): findActivityType<this> {
  //     const bridge = this.onchain;
  //     // each specific bridge has to have an activity type, but this code can't
  //     // introspect that type.  It could be a getter OR a method, and Typescript can only
  //     // be told it is one, or the other, concretely.
  //     // findActivityType() does probe for the specific type for specific contracts,
  //     // at the **interface** level, but this code has no visibility of that.
  //     //x@ts-expect-error accessing it in this way
  //     const { activity } = bridge
  //     return activity as any
  // }
  // /**
  //  * Redirect for intuitive developers having a 'redeemer' habit
  //  *
  //  * @deprecated - We recommend using `activity` instead of `redeemer`
  //  */
  // get redeemer(): findActivityType<this> {
  //     return this.activity;
  // }
  /**
   * Provides access to the script's defined on-chain types, using a fluent
   * API for type-safe generation of data conforming to on-chain data formats & types.
   * @remarks
   *
   */
  _dataBridge;
  // get mkDatum() : findDatumType<this> {
  //     //x@ts-expect-error probing for presence
  //     if (!this.onchain?.datum) throw new Error(`${this.constructor.name}: no datum is used on this type of script`);
  //     //@ts-expect-error probing for presence
  //     return this.onchain.datum;
  // }
  getOnchainBridge() {
    if ("undefined" == typeof this._dataBridge) {
      const { dataBridgeClass } = this;
      if (!dataBridgeClass) {
        if (this.usesContractScript) {
          throw new Error(
            `${this._bundle?.moduleName || this.constructor.name}: each contract script needs a dataBridgeClass = dataBridge\u2039YourScriptName\u203A
  ... this dataBridge class is generated by heliosRollupBundler 
  ... and imported (\`import dataBridge\u2039something\u203A from "./\u2039yourScriptName\u203A.bridge.js"\`)
      This critical class converts between off-chain and on-chain typed data

Note: if you haven't customized the mint AND spend delegates for your Capo, 
  ... you might want to define both of those roles using a single 
  ... subclass of the BasicMintDelegate. That fixes the most common 
  ... first-time setup problems of this kind.`
          );
        } else {
          console.log(
            `${this.constructor.name} dataBridgeClass = NONE`
          );
          this._dataBridge = void 0;
          return null;
        }
      }
      const datumType = this.getBundle().locateDatumType();
      const isMainnet = this.setup.isMainnet;
      let newBridge;
      try {
        newBridge = new dataBridgeClass(
          isMainnet ?? false
        );
      } catch (e) {
        console.error(e);
        debugger;
      }
      if (datumType) {
        console.log(
          `${this.constructor.name} dataBridgeClass = `,
          dataBridgeClass.name
        );
        if (!newBridge.datum) {
          console.warn(
            `${this.constructor.name}: dataBridgeClass must define a datum accessor.  This is likely a code-generation problem.`
          );
        }
      }
      if (!newBridge.activity) {
        console.warn(
          `${this.constructor.name}: dataBridgeClass must define an activity accessor.  This is likely a code-generation problem.`
        );
      }
      if ("undefined" == typeof isMainnet) {
        return newBridge;
      }
      return this._dataBridge = newBridge;
    }
    if (!this._dataBridge) {
      throw new Error(
        `${this.constructor.name}: this contract script doesn't have a dataBridgeClass defined`
      );
    }
    return this._dataBridge;
  }
  ADA(n) {
    const bn = "number" == typeof n ? BigInt(Math.round(1e6 * n)) : BigInt(1e6) * n;
    return bn;
  }
  get isConfigured() {
    return !!this.configIn;
  }
  get isConnected() {
    return this.isConfigured && !!this.wallet;
  }
  /**
   * returns the wallet connection used by the current actor
   * @remarks
   *
   * Throws an error if the strella contract facade has not been initialized with a wallet in settings.actorContext
   * @public
   **/
  get wallet() {
    if (!this.actorContext.wallet) throw new Error(this.missingActorError);
    return this.actorContext.wallet;
  }
  get missingActorError() {
    return `Wallet not connected to Stellar Contract '${this.constructor.name}'`;
  }
  /**
   * Transforms input configuration to contract script params
   * @remarks
   * May filter out any keys from the ConfigType that are not in the contract
   * script's params.  Should add any keys that may be needed by the script and
   * not included in the ConfigType (as delegate scripts do with `delegateName`).
   */
  getContractScriptParams(config) {
    return config;
  }
  delegateReqdAddress() {
    return this.address;
  }
  delegateAddrHint() {
    return void 0;
  }
  walletNetworkCheck;
  /**
   * Factory function for a configured instance of the contract
   * @remarks
   *
   * Due to boring details of initialization order, this factory function is needed
   * for creating a new instance of the contract.
   * @param args - setup and configuration details
   * @public
   **/
  static async createWith(args) {
    const Class = this;
    const {
      setup,
      config,
      partialConfig,
      previousOnchainScript: program
    } = args;
    const c = new Class(setup);
    return c.init(args);
  }
  /**
   * obsolete public constructor.  Use the createWith() factory function instead.
   *
   * @public
   **/
  constructor(setup) {
    this.setup = setup;
    this._utxoHelper = new UtxoHelper(this.setup, this);
    setup.uh = this._utxoHelper;
    const { networkParams, isTest, isMainnet, actorContext } = setup;
    this.actorContext = actorContext;
    this.networkParams = networkParams;
  }
  get canPartialConfig() {
    return false;
  }
  /**
   * performs async initialization, enabling an async factory pattern
   * @remarks
   * This method is called by the createWith() factory function, and should not be called directly.
   *
   *
   */
  async init(args) {
    const { isMainnet, actorContext } = this.setup;
    const chosenNetwork = isMainnet ? "mainnet" : "testnet";
    if ("undefined" !== typeof configuredNetwork) {
      if (configuredNetwork != chosenNetwork) {
        console.warn(
          `Possible CONFLICT:  previously configured as ${configuredNetwork}, while this setup indicates ${chosenNetwork}
   ... are you or the user switching between networks?`
        );
      }
    }
    configuredNetwork = chosenNetwork;
    if (actorContext.wallet) {
      const walletIsMainnet = await actorContext.wallet.isMainnet();
      const foundNetwork = walletIsMainnet ? "mainnet" : "a testnet (preprod/preview)";
      const chosenNetworkLabel = isMainnet ? "mainnet" : "a testnet (preprod/preview)";
      if (walletIsMainnet !== isMainnet) {
        const message = `The wallet is connected to ${foundNetwork}, doesn't match this app's target network  ${chosenNetworkLabel}`;
        if (chosenNetwork == "mainnet") {
          console.log(
            `${message}
   ... have you provided env.TESTNET to the build to target a testnet?`
          );
        }
        throw new Error(message);
      }
      this.actorContext = actorContext;
    }
    const {
      config,
      partialConfig,
      programBundle,
      previousOnchainScript,
      previousOnchainScript: { validatorHash, uplcProgram } = {}
    } = args;
    this.partialConfig = partialConfig;
    this.configIn = config;
    if (uplcProgram) {
      this._bundle = this.scriptBundle().withSetupDetails({
        setup: this.setup,
        previousOnchainScript
        // params: this.getContractScriptParams(config),
        // deployedDetails: {
        //     config,
        // },
      });
    } else if (config || partialConfig) {
      const variant = (config || partialConfig).variant;
      if (this.usesContractScript) {
        const genericBundle = this.scriptBundle();
        if (!config) {
          debugger;
          console.warn(
            `${this.constructor.name}: no config provided`
          );
        }
        const params = genericBundle.scriptParamsSource != "bundle" ? config ? { params: this.getContractScriptParams(config) } : {} : {};
        const deployedDetails = {
          config,
          programBundle
          // scriptHash,
        };
        if (!programBundle) {
          console.log(
            `  -- \u{1F41E}\u{1F41E}\u{1F41E} \u{1F41E} ${this.constructor.name}: no programBundle; will use JIT compilation`
          );
        }
        this._bundle = genericBundle.withSetupDetails({
          ...params,
          setup: this.setup,
          deployedDetails,
          variant
        });
      } else if (partialConfig) {
        throw new Error(
          `${this.constructor.name}: any use case for partial-config?`
        );
      }
      if (this.usesContractScript) {
        const bundle = this.getBundle();
        if (!bundle) {
          throw new Error(
            `${this.constructor.name}: missing required this.bundle for contract class`
          );
        } else if (!bundle.isHeliosScriptBundle()) {
          throw new Error(
            `${this.constructor.name}: this.bundle must be a HeliosScriptBundle; got ${bundle.constructor.name}`
          );
        }
        if (bundle.setup && bundle.configuredParams) {
          try {
            this._compiledScript = await bundle.compiledScript(
              true
            );
          } catch (e) {
            console.warn(
              "while setting compiledScript: ",
              e.message
            );
          }
        } else if (bundle.setup && bundle.params) {
          debugger;
          throw new Error(`what is this situation here? (dbpa)`);
        }
        console.log(this.program.name, "bundle loaded");
      }
    } else {
      const bundle = this.getBundle();
      if (bundle.isPrecompiled) {
        console.log(
          `${bundle.displayName}: will use precompiled script on-demand`
        );
      } else if (bundle.scriptParamsSource == "config") {
        console.log(
          `${this.constructor.name}: not preconfigured; will use JIT compilation`
        );
      } else if (bundle.scriptParamsSource == "bundle") {
        throw new Error(
          `missing required on-chain script params in bundle`
        );
      }
      this.partialConfig = partialConfig;
    }
    return this;
  }
  _compiledScript;
  // initialized in compileWithScriptParams()
  get compiledScript() {
    if (!this._compiledScript) {
      throw new Error(
        `${this.constructor.name}: compiledScript not yet initialized; call asyncCompiledScript() first`
      );
    }
    return this._compiledScript;
  }
  async asyncCompiledScript() {
    const s = await this.getBundle().compiledScript(true);
    this._compiledScript = s;
    return s;
  }
  usesContractScript = true;
  get datumType() {
    return this.onChainDatumType;
  }
  /**
   * @internal
   **/
  get purpose() {
    const purpose = this.program.purpose;
    if (!purpose) return "non-script";
    return purpose;
  }
  get validatorHash() {
    const { vh } = this._cache;
    if (vh) return vh;
    const nvh = this.compiledScript.hash();
    return this._cache.vh = makeValidatorHash(nvh);
  }
  //  todo: stakingAddress?: Address or credential or whatever;
  get address() {
    const prevVh = this._bundle?.previousOnchainScript?.validatorHash;
    if (prevVh) {
      return makeAddress(this.setup.isMainnet, makeValidatorHash(prevVh));
    }
    const { addr } = this._cache;
    if (addr) return addr;
    if (!this.validatorHash) {
      throw new Error(
        "This contract isn't yet configured with a validatorHash"
      );
    }
    console.log(this.constructor.name, "caching addr");
    console.log(
      "TODO TODO TODO - ensure each contract can indicate the right stake part of its address"
    );
    console.log("and that the onchain part also supports it");
    const isMainnet = this.setup.isMainnet;
    if ("undefined" == typeof isMainnet) {
      throw new Error(
        `${this.constructor.name}: isMainnet must be defined in the setup`
      );
    }
    const nAddr = makeAddress(isMainnet, this.validatorHash);
    return this._cache.addr = nAddr;
  }
  get mintingPolicyHash() {
    if ("minting" != this.purpose) return void 0;
    const { mph } = this._cache;
    if (mph) return mph;
    const nMph = makeMintingPolicyHash(this.compiledScript.hash());
    return this._cache.mph = nMph;
  }
  get identity() {
    const { identity } = this._cache;
    if (identity) return identity;
    console.log(this.constructor.name, "identity", identity || "none");
    let result;
    if ("minting" == this.purpose) {
      const b32 = this.mintingPolicyHash.toString();
      //!!! todo: verify bech32 checksum isn't messed up by this:
      result = b32.replace(/^asset/, "mph");
    } else {
      result = this.address.toString();
    }
    return this._cache.identity = result;
  }
  //! searches the network for utxos stored in the contract,
  //  returning those whose datum hash is the same as the input datum
  async outputsSentToDatum(datum2) {
    await this.network.getUtxos(this.address);
    throw new Error(`unused`);
  }
  // non-activity partial
  txnKeepValue(tcx, value, datum2) {
    tcx.addOutput(makeTxOutput(this.address, value, datum2));
    return tcx;
  }
  /**
   * Returns all the types exposed by the contract script
   * @remarks
   *
   * Passed directly from Helios; property names match contract's defined type names
   *
   * @public
   **/
  get onChainTypes() {
    const scriptNamespace = this.program.name;
    return this.program.userTypes[scriptNamespace];
  }
  /**
   * identifies the enum used for the script Datum
   * @remarks
   *
   * Override this if your contract script uses a type name other than Datum.
   * @public
   **/
  get scriptDatumName() {
    return "Datum";
  }
  /**
   * The on-chain type for datum
   * @remarks
   *
   * This getter provides a class, representing the on-chain enum used for attaching
   * data (or data hashes) to contract utxos the returned type (and its enum variants)
   * are suitable for off-chain txn-creation override `get scriptDatumName()` if
   * needed to match your contract script.
   * @public
   **/
  get onChainDatumType() {
    return this.getBundle().locateDatumType();
  }
  /**
   * identifies the enum used for activities (redeemers) in the Helios script
   * @remarks
   *
   * Override this if your contract script uses a type name other than Activity.
   * @public
   **/
  get scriptActivitiesName() {
    return "Activity";
  }
  getSeed(arg) {
    return getSeed(arg);
  }
  /**
   * returns the on-chain type for activities ("redeemers")
   * @remarks
   *
   * Use mustGetActivityName() instead, to get the type for a specific activity.
   *
   * returns the on-chain enum used for spending contract utxos or for different use-cases of minting (in a minting script).
   * the returned type (and its enum variants) are suitable for off-chain txn-creation
   * override `get onChainActivitiesName()` if needed to match your contract script.
   * @public
   **/
  get onChainActivitiesType() {
    const { scriptActivitiesName: onChainActivitiesName } = this;
    if (!this._bundle) throw new Error(`no scriptProgram`);
    const scriptNamespace = this.program.name;
    const {
      [scriptNamespace]: { [onChainActivitiesName]: ActivitiesType }
    } = this.program.userTypes;
    return ActivitiesType;
  }
  /**
   * @deprecated - see {@link StellarContract.activityVariantToUplc|this.activityVariantToUplc(variant, data)} instead
   * Retrieves an on-chain type for a specific named activity ("redeemer")
   * @remarks
   *
   * Cross-checks the requested name against the available activities in the script.
   * Throws a helpful error if the requested activity name isn't present.'
   *
   * @param activityName - the name of the requested activity
   * @public
   **/
  mustGetActivity(activityName) {
    const ocat = this.onChainActivitiesType;
    return this.mustGetEnumVariant(ocat, activityName);
  }
  /**
   * asserts the presence of the indicated activity name in the on-chain script
   * @remarks
   * The activity name is expected to be found in the script's redeemer enum
   */
  mustHaveActivity(activityName) {
    const ocat = this.onChainActivitiesType;
    if (!(activityName in ocat.typeMembers)) {
      throw new Error(
        `${this.constructor.name}: missing required on-chain activity: ${activityName}`
      );
    }
    return this.mustGetEnumVariant(ocat, activityName);
  }
  activityRedeemer(activityName, data) {
    const activities = this.onChainActivitiesType;
    return {
      redeemer: this.typeToUplc(activities, {
        [activityName]: data
      })
    };
  }
  activityVariantToUplc(activityName, data) {
    const activities = this.onChainActivitiesType;
    return this.typeToUplc(activities, {
      [activityName]: data
    });
  }
  mustGetEnumVariant(enumType, variantName) {
    const { [variantName]: variantType } = enumType.typeMembers;
    if (!variantType) {
      const variantNames = [];
      for (const [name, _] of Object.entries(enumType.typeMembers)) {
        debugger;
        if (isUplcData(enumType[name].prototype)) {
          console.warn(
            "\n".repeat(8) + "------------------------ check enum variant name",
            name
          );
          debugger;
          variantNames.push(name);
        } else {
          debugger;
          throw new Error(
            "variant names only available via HeliosData : ("
          );
        }
      }
      debugger;
      //!!! TODO
      throw new Error(
        `$${this.constructor.name}: activity/enum-variant name mismatch in ${enumType.name}: variant '${variantName}' unknown
 ... variants in this enum: ${variantNames.join(", ")}`
      );
    }
    return variantType.asEnumMemberType;
  }
  inlineDatum(datumName, data) {
    return makeInlineTxOutputDatum(
      this.typeToUplc(this.onChainDatumType, {
        [datumName]: data
      })
    );
  }
  /**
   * provides a temporary indicator of mainnet-ness, while not
   * requiring the question to be permanently resolved.
   * @remarks
   * Allows other methods to proceed prior to the final determination of mainnet status.
   *
   * Any code using this path should avoid caching a negative result.  If you need to
   * determine the actual network being used, getBundle().isMainnet, if present, provides
   * the definitive answer.  If that attribute is not yet present, then the mainnet status
   * has not yet been materialized.
   * @public
   */
  isDefinitelyMainnet() {
    return this.getBundle().isDefinitelyMainnet();
  }
  paramsToUplc(params) {
    return this.getBundle().paramsToUplc(params);
  }
  typeToUplc(type, data, path = "") {
    return this.getBundle().typeToUplc(type, data, path);
  }
  get program() {
    return this.getBundle().program;
  }
  _utxoHelper;
  /**
   * Provides access to a UtxoHelper instance
   */
  get utxoHelper() {
    return this._utxoHelper;
  }
  /**
   * Provides access to a UtxoHelper instance
   * @remarks - same as utxoHelper, but with a shorter name
   */
  get uh() {
    return this._utxoHelper;
  }
  /**
   * @deprecated - use `tcx.submit()` instead.
   */
  async submit(tcx, {
    signers = [],
    addlTxInfo = {
      description: tcx.txnName ? ": " + tcx.txnName : ""
    }
  } = {}) {
    console.warn("deprecated: use tcx.submit() instead");
    return tcx.buildAndQueue({ signers, addlTxInfo });
  }
  //!!! todo: implement more and/or test me:
  // async findFreeLovelaceWithTokens(v: Value, w: Wallet) {
  // it.todo("helps find spare lovelace in tokens");
  // it.todo("will help harvest spare lovelace in the future if minUtxo is changed");
  //     const utxos = await w.utxos;
  //     const lovelaceOnly = v.assets.isZero();
  //     //! it finds free lovelace in token bundles, if it can't find free lovelace otherwise
  //     if (lovelaceOnly) {
  //         let maxFree: TxInput, minToken: TxInput;
  //         let minPolicyCount = Infinity;
  //         for (const u of utxos) {
  //             const policies = u.value.assets.mintingPolicies.length;
  //             if (policies < minPolicyCount) {
  //                 minPolicyCount = policies;
  //                 minToken = u;
  //             }
  //             const free =
  //                 u.value.lovelace -
  //                 u.origOutput.calcMinLovelace(this.networkParams);
  //             //@ts-ignore
  //             if (!maxFree) {
  //                 maxFree = u;
  //             } else if (free > maxFree!.value.lovelace) {
  //                 maxFree = u;
  //             }
  //         }
  //     }
  // }
  _cache = {};
  optimize = true;
  async prepareBundleWithScriptParams(params) {
    if (this._compiledScript) {
      console.warn(
        "compileWithScriptParams() called after script compilation already done"
      );
      debugger;
    }
    if (!this.usesContractScript) {
      throw new Error(`avoid this call to begin with?`);
    }
    if (!params) {
      throw new Error(`contractParams not set`);
    }
    let bundle = this.getBundle();
    if (!this.setup) {
      console.warn(
        `compileWithScriptParams() called before setup is available`
      );
      debugger;
    }
    if (!bundle.setup || bundle.setup.isPlaceholder || !bundle.configuredUplcParams) {
      bundle = this._bundle = bundle.withSetupDetails({
        params,
        setup: this.setup
      });
    }
    this._cache = {};
  }
  /**
   * Locates a UTxO locked in a validator contract address
   * @remarks
   *
   * Throws an error if no matching UTxO can be found
   * @param semanticName - descriptive name; used in diagnostic messages and any errors thrown
   * @param predicate - filter function; returns its utxo if it matches expectations
   * @param exceptInTcx - any utxos already in the transaction context are disregarded and not passed to the predicate function
   * @param extraErrorHint - user- or developer-facing guidance for guiding them to deal with the miss
   * @public
   **/
  //! finds a utxo (
  async mustFindMyUtxo(semanticName, options) {
    const { predicate, exceptInTcx, extraErrorHint, utxos } = options;
    const { address } = this;
    return this.utxoHelper.mustFindUtxo(semanticName, {
      predicate,
      address,
      exceptInTcx,
      extraErrorHint,
      utxos
    });
  }
  mkTcx(tcxOrName, name) {
    const tcx = tcxOrName instanceof StellarTxnContext ? tcxOrName : new StellarTxnContext(this.setup).withName(name || "");
    const effectiveName = tcxOrName instanceof StellarTxnContext ? name : tcxOrName;
    if (effectiveName && !tcx.txnName) return tcx.withName(effectiveName);
    return tcx;
  }
  /**
   * Finds a free seed-utxo from the user wallet, and adds it to the transaction
   * @remarks
   *
   * Accepts a transaction context that may already have a seed.  Returns a typed
   * tcx with hasSeedUtxo type.
   *
   * The seedUtxo will be consumed in the transaction, so it can never be used
   * again; its value will be returned to the user wallet.
   *
   * The seedUtxo is needed for UUT minting, and the transaction is typed with
   * the presence of that seed (found in tcx.state.seedUtxo).
   *
   * If a seedUtxo is already present in the transaction context, no additional seedUtxo
   * will be added.
   *
   * If a seedUtxo is provided as an argument, that utxo must already be present
   * in the transaction inputs; the state will be updated to reference it.
   *
   * @public
   *
   **/
  async tcxWithSeedUtxo(tcx = new StellarTxnContext(this.setup), seedUtxo) {
    if (
      //prettier-ignore
      //@ts-expect-error on this type probe
      tcx.state && tcx.state.seedUtxo
    ) {
      return tcx;
    }
    if (seedUtxo) {
      let tcx2 = tcx;
      if (!tcx.inputs.find((utxo) => utxo.isEqual(seedUtxo))) {
        tcx2 = tcx2.addInput(seedUtxo);
      }
      tcx2.state.seedUtxo = seedUtxo;
      return tcx2;
    } else {
      return this.findUutSeedUtxo([], tcx).then((newSeedUtxo) => {
        const tcx2 = tcx.addInput(newSeedUtxo);
        tcx2.state.seedUtxo = newSeedUtxo;
        return tcx2;
      });
    }
  }
  async findUutSeedUtxo(uutPurposes, tcx) {
    const uh = this.utxoHelper;
    //!!! big enough to serve minUtxo for each of the new UUT(s)
    const uutSeed = uh.mkValuePredicate(BigInt(13e6), tcx);
    return uh.mustFindActorUtxo(`seed-for-uut ${uutPurposes.join("+")}`, {
      predicate: uutSeed,
      exceptInTcx: tcx,
      extraErrorHint: "You might need to create some granular utxos in your wallet by sending yourself a series of small transactions (e.g. 15 then 16 and then 17 ADA) as separate utxos/txns"
    });
  }
}
__decorateClass$1([
  partialTxn
], StellarContract.prototype, "txnKeepValue");

const TODO = Symbol("needs to be implemented");
function hasReqts(reqtsMap) {
  return reqtsMap;
}
hasReqts.TODO = TODO;
function mergesInheritedReqts(inherits, reqtsMap) {
  return { ...inherits, ...reqtsMap };
}

class StellarDelegate extends StellarContract {
  static currentRev = 1n;
  static get defaultParams() {
    return {
      rev: this.currentRev
    };
  }
  /**
   * Finds and adds the delegate's authority token to the transaction
   * @remarks
   *
   * calls the delegate-specific DelegateAddsAuthorityToken() method,
   * with the uut found by DelegateMustFindAuthorityToken().
   *
   * returns the token back to the contract using {@link StellarDelegate.txnReceiveAuthorityToken | txnReceiveAuthorityToken() }
   * @param tcx - transaction context
   * @public
   **/
  async txnGrantAuthority(tcx, redeemer, skipReturningDelegate) {
    const label = `${this.constructor.name} authority`;
    const uutxo = await this.DelegateMustFindAuthorityToken(tcx, label);
    const useMinTv = true;
    const authorityVal = this.tvAuthorityToken(useMinTv);
    console.log(
      `   ------- delegate '${label}' grants authority with ${dumpAny(
        authorityVal,
        this.networkParams
      )}`
    );
    try {
      const tcx2 = await this.DelegateAddsAuthorityToken(
        tcx,
        uutxo,
        redeemer
      );
      if (skipReturningDelegate) return tcx2;
      return this.txnReceiveAuthorityToken(tcx2, authorityVal, uutxo);
    } catch (error) {
      if (error.message.match(/input already added/)) {
        throw new Error(
          `Delegate ${label}: already added: ${dumpAny(
            authorityVal,
            this.networkParams
          )}`
        );
      }
      throw error;
    }
  }
  /**
   * Finds the authority token and adds it to the transaction, tagged for retirement
   * @public
   * @remarks
   * Doesn't return the token back to the contract.
   **/
  async txnRetireAuthorityToken(tcx) {
    const uutxo = await this.DelegateMustFindAuthorityToken(
      tcx,
      `${this.constructor.name} authority`
    );
    return this.DelegateRetiresAuthorityToken(tcx, uutxo);
  }
  mkAuthorityTokenPredicate() {
    return this.uh.mkTokenPredicate(this.tvAuthorityToken());
  }
  get authorityTokenName() {
    return this.configIn.tn;
  }
  tvAuthorityToken(useMinTv = false) {
    if (!this.configIn)
      throw new Error(`must be instantiated with a configIn`);
    const {
      mph,
      tn
      // reqdAddress,  // removed
    } = this.configIn;
    if (useMinTv) return this.uh.mkMinTv(mph, tn);
    return mkTv(mph, tn);
  }
  get delegateValidatorHash() {
    return void 0;
  }
  /**
   * Captures requirements as data
   * @remarks
   *
   * see reqts structure
   * @public
   **/
  delegateRequirements() {
    return hasReqts({
      "provides an interface for providing arms-length proof of authority to any other contract": {
        purpose: "to decouple authority administration from its effects",
        details: [
          "Any contract can create a UUT for use with an authority policy.",
          "By depositing that UUT to the authority contract, it can delegate completely",
          "  ... all the implementation details for administration of the authority itself.",
          "It can then focus on implementing the effects of authority, requiring only ",
          "  ... that the correct UUT has been spent, to indicate that the authority is granted.",
          "The authority contract can have its own internal details ",
          "A subclass of this authority policy may provide additional administrative dynamics."
        ],
        mech: [],
        requires: [
          "implementations SHOULD positively govern spend of the UUT",
          "implementations MUST provide an essential interface for transaction-building"
        ]
      },
      "implementations SHOULD positively govern spend of the UUT": {
        purpose: "for sufficient assurance of desirable safeguards",
        details: [
          "A subclass of the GenericAuthority should take care of guarding the UUT's spend",
          "  ... in whatever way is appropriate for its use-case"
        ],
        mech: [],
        requires: []
      },
      "implementations MUST provide an essential interface for transaction-building": {
        purpose: "enabling a strategy-agnostic interface for making transactions using any supported strategy-variant",
        details: [
          "Subclasses MUST implement the interface methods",
          "  ... in whatever way is good for its use-case.",
          "An interface method whose requirement is marked with 'MAY/SHOULD' behavior, ",
          "  ... MUST still implement the method satisfying the interface, ",
          "  ... but MAY throw an UnsupportedAction error, to indicate that",
          "  ... the strategy variant has no meaningful action to perform ",
          "  ... that would serve the method's purpose"
        ],
        mech: [],
        requires: [
          //!!! todo: cross-check these requirements for completeness
          //  ... and for accuracy
          "requires a txnReceiveAuthorityToken(tcx, delegateAddr, fromFoundUtxo?)",
          "requires a mustFindAuthorityToken(tcx)",
          "requires a txnGrantAuthority(tcx, delegateAddr, fromFoundUtxo)",
          "requires txnRetireCred(tcx, fromFoundUtxo)"
        ]
      },
      "requires a txnReceiveAuthorityToken(tcx, delegateAddr, fromFoundUtxo?)": {
        purpose: "to deposit the authority token (back) to the delegated destination",
        details: [
          "impls MUST implement txnReceiveAuthorityToken",
          "Each implemented subclass can use it's own style to match its strategy & mechanism",
          "This is used both for the original deposit and for returning the token during a grant-of-authority"
        ],
        mech: [
          "impls MUST create a UTxO depositing the indicated token-name into the delegated destination.",
          "impls should normally preserve the datum from an already-present sourceUtxo"
        ],
        requires: []
      },
      "requires a mustFindAuthorityToken(tcx)": {
        purpose: "to locate the given authority token",
        details: [
          "allows different strategies for finding the UTxO having the authority token",
          "impls MAY use details seen in the txn context to find the indicated token"
        ],
        mech: [
          "impls MUST resolve the indicated token to a specific UTxO or throw an informative error"
        ]
      },
      "requires a txnGrantAuthority(tcx, delegateAddr, fromFoundUtxo)": {
        purpose: "to use the delegated authority",
        details: [
          "Adds the indicated utxo to the transaction with appropriate activity/redeemer",
          "Contracts needing the authority within a transaction can rely on the presence of this spent authority",
          "Impls can EXPECT the token will be returned via txnReceiveAuthorityToken",
          "a contract-backed impl SHOULD enforce the expected return in its on-chain code"
        ],
        mech: [
          "the base AuthorityPolicy MUST call txnReceiveAuthorityToken() with the token's sourceUtxo"
        ]
      },
      "requires txnRetireCred(tcx, fromFoundUtxo)": {
        purpose: "to allow burning the authority token",
        details: [
          "Adds the indicated utxo to the transaction with appropriate activity/redeemer",
          "  ... allowing the token to be burned by the minting policy.",
          "Impls SHOULD ensure any other UTXOs it may hold do not become inaccessible as a result"
        ],
        mech: [
          "impls MUST add the token to the txn if it can be retired",
          "if the token cannot be retired, by appropriate policy, it SHOULD throw an informative error"
        ]
      }
    });
  }
}

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = __getOwnPropDesc(target, key) ;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (decorator(target, key, result) ) || result;
  if (result) __defProp(target, key, result);
  return result;
};
class ContractBasedDelegate extends StellarDelegate {
  static currentRev = 1n;
  /**
   * Configures the matching parameter name in the on-chain script, indicating
   * that this delegate serves the Capo by enforcing policy for spending the Capo's utxos.
   * @remarks
   * Not used for any mint delegate.  Howeever, a mint delegate class can instead provide a true isMintAndSpendDelegate,
   *...  if a single script controls both the mintDgt-* and spendDgt-* tokens/delegation roles for your Capo.
   *
   * DO NOT enable this attribute for second-level delegates, such as named delegates or delegated-data controllers.
   * The base on-chain delegate script recognizes this conditional role and enforces that its generic delegated-data activities
   * are used only in the context the Capo's main spend delegate, re-delegating to the data-controller which
   * can't use those generic activities, but instead implements its user-facing txns as variants of its SpendingActivities enum.
   */
  static isSpendDelegate = false;
  get delegateName() {
    throw new Error(
      `${this.constructor.name}: missing required get delegateName() : string`
    );
  }
  get onchain() {
    return this.getOnchainBridge();
  }
  get offchain() {
    return super.offchain;
  }
  get reader() {
    return super.offchain;
  }
  get activity() {
    const bridge = this.onchain;
    return bridge.activity;
  }
  get mkDatum() {
    return this.onchain.datum;
  }
  get newReadDatum() {
    const bridge = this.getOnchainBridge();
    const { readDatum } = bridge;
    if (!readDatum) {
      throw new Error(
        `${this.constructor.name}: this contract script doesn't use datum`
      );
    }
    return readDatum;
  }
  get capo() {
    return (this.configIn || this.partialConfig)?.capo;
  }
  // mkBundleWithCapo<T extends HeliosScriptBundle>(BundleClass: new (capo: CapoHeliosBundle) => T) : T {
  //     const { capo } = this.configIn || this.partialConfig || {};
  //     if (!capo)
  //         throw new Error(
  //             `missing capo in config or partial-config for ${this.constructor.name}`
  //         );
  //     const capoBundle = capo.getBundle() as CapoHeliosBundle;
  //     return new BundleClass(capoBundle);
  // }
  scriptBundle() {
    throw new Error(
      `${this.constructor.name}: missing required implementation of scriptBundle()

Each contract-based delegate must provide a scriptBundle() method.
It should return an instance of a class defined in a *.hlb.ts file.  At minimum:

    import {YourAppCapo} from "./YourAppCapo.js";

    import SomeSpecializedDelegate from "./YourSpecializedDelegate.hl";

    export default class SomeDelegateBundle extends CapoDelegateBundle.using(YourAppCapo) {
        specializedDelegateModule = SomeSpecializedDelegate; 
    }

We'll generate an additional .typeInfo.ts, based on the types in your Helios sources,
  ... and a .bridge.ts with generated data-conversion code for bridging between off-chain  ... and on-chain data encoding.Your scriptBundle() method can \`return new SomeDelegateBundle()\``
    );
  }
  get scriptDatumName() {
    return "DelegateDatum";
  }
  get scriptActivitiesName() {
    return "DelegateActivity";
  }
  static isMintDelegate = false;
  static isMintAndSpendDelegate = false;
  static isDgDataPolicy = false;
  static get defaultParams() {
    const params = {
      rev: this.currentRev,
      isMintDelegate: this.isMintDelegate,
      isSpendDelegate: this.isMintAndSpendDelegate,
      isDgDataPolicy: this.isDgDataPolicy
    };
    return params;
  }
  static mkDelegateWithArgs(a) {
  }
  getContractScriptParams(config) {
    const { capoAddr, mph, tn, capo, ...otherConfig } = config;
    return {
      ...otherConfig,
      delegateName: this.delegateName
    };
  }
  tcxWithCharterRef(tcx) {
    return this.capo.tcxWithCharterRef(tcx);
  }
  /**
   * Adds a mint-delegate-specific authority token to the txn output
   * @remarks
   *
   * Implements {@link StellarDelegate.txnReceiveAuthorityToken | txnReceiveAuthorityToken() }.
   *
   * Uses {@link ContractBasedDelegate.mkDelegationDatum | mkDelegationDatum()} to make the inline Datum for the output.
   * @see {@link StellarDelegate.txnReceiveAuthorityToken | baseline txnReceiveAuthorityToken()'s doc }
   * @public
   **/
  async txnReceiveAuthorityToken(tcx, tokenValue, fromFoundUtxo) {
    const datum2 = this.mkDelegationDatum(fromFoundUtxo);
    const newOutput = makeTxOutput(this.address, tokenValue, datum2);
    return tcx.addOutput(newOutput);
  }
  mkDelegationDatum(txin) {
    if (txin) return txin.output.datum;
    const { capoAddr, mph, tn, ..._otherCfgSettings } = this.configIn;
    return this.mkDatum.IsDelegation({
      capoAddr,
      mph,
      tn
    });
  }
  activityReplacingMe({
    seed,
    purpose
  }) {
    throw new Error(`deprecated: explicit activity helper`);
  }
  mkDelegateLifecycleActivity(delegateActivityName, args) {
    throw new Error(`deprecated: explicit activity helper`);
  }
  mkCapoLifecycleActivity(capoLifecycleActivityName, {
    seed,
    purpose,
    ...otherArgs
  }) {
    throw new Error(`deprecated: explicit activity helper`);
  }
  /**
   * Creates a reedemer for the indicated spending activity name
   **/
  mkSpendingActivity(spendingActivityName, args) {
    throw new Error(`deprecated: explicit activity helper`);
  }
  mkSeedlessMintingActivity(mintingActivityName, args) {
    const { MintingActivity } = this.onChainTypes;
    this.mustGetEnumVariant(
      MintingActivity,
      mintingActivityName
    );
    throw new Error(`mkSeedlessMintingActivity: deprecated`);
  }
  mkSeededMintingActivity(mintingActivityName, args) {
    const { MintingActivity } = this.onChainTypes;
    this.mustGetEnumVariant(
      MintingActivity,
      mintingActivityName
    );
    throw new Error(`mkSeededMintingActivity: deprecated`);
  }
  activityRetiring() {
    throw new Error(`deprecated: explicit activity helper`);
  }
  activityValidatingSettings() {
    throw new Error(`deprecated: explicit activity helper`);
  }
  // @Activity.redeemer
  activityMultipleDelegateActivities(...activities) {
    throw new Error(`deprecated: explicit activity helper`);
  }
  activityDeletingDelegatedData(recId) {
    throw new Error(`deprecated: explicit activity helper`);
  }
  mkDatumIsDelegation(dd) {
    const { DelegationDetail } = this.onChainTypes;
    throw new Error(`deprecated: explicit datum helper`);
  }
  /**
   * returns the ValidatorHash of the delegate script, if relevant
   * @public
   * @remarks
   *
   * A delegate that doesn't use an on-chain validator should override this method and return undefined.
   **/
  get delegateValidatorHash() {
    if (!this.validatorHash) {
      throw new Error(
        `${this.constructor.name}: address doesn't use a validator hash!
  ... if that's by design, you may wish to override 'get delegateValidatorHash()'`
      );
    }
    return this.validatorHash;
  }
  /**
   * {@inheritdoc StellarDelegate.DelegateMustFindAuthorityToken}
   **/
  async DelegateMustFindAuthorityToken(tcx, label) {
    return this.mustFindMyUtxo(
      `${label}: ${decodeUtf8(this.configIn.tn)}`,
      {
        predicate: this.uh.mkTokenPredicate(this.tvAuthorityToken()),
        extraErrorHint: "this delegate strategy might need to override txnMustFindAuthorityToken()"
      }
    );
  }
  /**
   * Adds the delegate's authority token to a transaction
   * @public
   * @remarks
   * Given a delegate already configured by a Capo, this method implements
   * transaction-building logic needed to include the UUT into the `tcx`.
   * the `utxo` is discovered by {@link StellarDelegate.DelegateMustFindAuthorityToken | DelegateMustFindAuthorityToken() }
   *
   * The off-chain code shouldn't need to check the details; it can simply
   * arrange the details properly and spend the delegate's authority token,
   * using this method.
   *
   * ### Reliance on this delegate
   *
   * Other contract scripts can rely on the delegate script to have validated its
   * on-chain policy and enforced its own "return to the delegate script" logic.
   *
   * ### Enforcing on-chain policy
   *
   * When spending the authority token in this way, the delegate's authority is typically
   * narrowly scoped, and it's expected that the delegate's on-chain script validates that
   * those parts of the transaction detail should be authorized, in accordance with the
   * delegate's core purpose/responsbility - i.e. that the txn does all of what the delegate
   * expects, and none of what it shouldn't do in that department.
   *
   * The on-chain code SHOULD typically enforce:
   *  * that the token is spent with an application-specific redeemer variant of its
   *     MintingActivity or SpendingActivitie.
   *
   *  * that the authority token is returned to the contract with its datum unchanged
   *  * that any other tokens it may also hold in the same UTxO do not become
   *     inaccessible as a result of the transactions - perhaps by requiring them to be
   *     returned together with the authority token.
   *
   * It MAY enforce additional requirements as well.
   *
   * @example
   * A minting delegate should check that all the expected tokens are
   * minted, AND that no other tokens are minted.
   *
   * @example
   * A role-based authentication/signature-checking delegate can
   * require an appropriate signature on the txn.
   *
   * @param tcx - the transaction context
   * @param utxo - the utxo having the authority UUT for this delegate
   * @reqt Adds the uutxo to the transaction inputs with appropriate redeemer.
   * @reqt Does not output the value; can EXPECT txnReceiveAuthorityToken to be called for that purpose.
   **/
  async DelegateAddsAuthorityToken(tcx, uutxo, redeemer) {
    const { capo } = this.configIn;
    const script = this._bundle?.previousCompiledScript() || this.compiledScript;
    const tcx2 = await capo.txnAttachScriptOrRefScript(
      tcx,
      script
    );
    if (!redeemer.redeemer) debugger;
    return tcx2.addInput(uutxo, redeemer);
  }
  /**
   * {@inheritdoc StellarDelegate.DelegateAddsAuthorityToken}
   **/
  async DelegateRetiresAuthorityToken(tcx, fromFoundUtxo) {
    const utxo = fromFoundUtxo;
    return tcx.addInput(
      makeTxInput(utxo.id, utxo.output),
      this.activity.DelegateLifecycleActivities.Retiring
    );
  }
}
__decorateClass([
  Activity.redeemer
], ContractBasedDelegate.prototype, "activityReplacingMe");
__decorateClass([
  Activity.redeemer
], ContractBasedDelegate.prototype, "activityRetiring");
__decorateClass([
  Activity.redeemer
], ContractBasedDelegate.prototype, "activityValidatingSettings");
__decorateClass([
  Activity.redeemer
], ContractBasedDelegate.prototype, "activityDeletingDelegatedData");
__decorateClass([
  datum
], ContractBasedDelegate.prototype, "mkDatumIsDelegation");

export { Activity as A, ContractBasedDelegate as C, DataBridge as D, StellarContract as S, UutName as U, ContractDataBridge as a, DataBridgeReaderClass as b, StellarDelegate as c, datum as d, UtxoHelper as e, findInputsInWallets as f, SeedActivity as g, hasReqts as h, impliedSeedActivityMaker as i, getSeed as j, ContractDataBridgeWithEnumDatum as k, ContractDataBridgeWithOtherDatum as l, mergesInheritedReqts as m, partialTxn as p, txn as t };
//# sourceMappingURL=ContractBasedDelegate2.mjs.map
