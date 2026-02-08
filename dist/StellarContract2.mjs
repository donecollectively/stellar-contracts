import { makeTxOutput, makeValue, makeAssetClass, makeDummyAddress, makeValidatorHash, makeAddress, makeMintingPolicyHash, makeInlineTxOutputDatum } from '@helios-lang/ledger';
import { o as utxosAsString, d as dumpAny, N as getSeed, a as isLibraryMatchedTcx, S as StellarTxnContext } from './DataBridge.mjs';
import { decodeUtf8, encodeUtf8, equalsBytes } from '@helios-lang/codec-utils';
import { selectLargestFirst } from '@helios-lang/tx-utils';
import '@helios-lang/crypto';
import { e as environment } from './environment.mjs';
import { placeholderSetupDetails } from './HeliosBundle.mjs';
import '@helios-lang/contract-utils';

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
  /**
   * the full uniquified name of the UUT, in byte-array (number[]) form
   */
  get bytes() {
    return encodeUtf8(this._uutName);
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
   * finds utxos in the current actor's wallet that have enough ada to cover the given amount
   * @remarks
   * This method is useful for finding ADA utxos that can be used to pay for a transaction.
   *
   * Other methods in the utxo helper are better for finding individual utxos.
   *
   * If the `required` option is true, it throws an error if no sufficient utxos are found.
   * @public
   */
  async findSufficientActorUtxos(name, amount, options = {}, strategy = [
    selectLargestFirst({ allowSelectingUninvolvedAssets: false }),
    selectLargestFirst({ allowSelectingUninvolvedAssets: true })
  ]) {
    const wallet = options.wallet ?? this.wallet;
    const addrs = await wallet.usedAddresses;
    const utxos = [];
    for (const addr of addrs.flat(1)) {
      if (!addr) continue;
      if (options.findCached) {
        console.log(
          `  Temporary: calling through to network instead of using cache: ` + this.network.constructor.name || "\u2039no network name\u203A"
        );
      }
      const addrUtxos = await this.network.getUtxos(addr);
      utxos.push(...addrUtxos);
    }
    const filtered = options.exceptInTcx ? utxos.filter(
      options.exceptInTcx.utxoNotReserved.bind(options.exceptInTcx)
    ) : utxos;
    const { searchOthers = false } = options;
    if (!Array.isArray(strategy)) {
      strategy = [strategy];
    }
    let someError;
    for (const s of strategy) {
      try {
        const [selected, others] = s(filtered, amount);
        if (selected.length > 0) {
          return selected;
        }
      } catch (e) {
        if (!searchOthers) someError = e;
      }
    }
    if (!searchOthers && someError) throw someError;
    if (!searchOthers) {
      throw new Error(`crazy talk! (expected to find utxos in actor's wallet, but didn't; and searchOthers is false)`);
    }
    if (searchOthers) {
      console.log(
        `   -- actor's primary wallet doesn't have needed value; searching in other actor-wallets...`
      );
      for (const [name2, utxo] of Object.entries(
        this.setup.actorContext.others
      )) {
        try {
          const utxos2 = await this.findSufficientActorUtxos(
            name2,
            amount,
            {
              ...options,
              searchOthers: false,
              wallet: utxo
            }
          );
          if (utxos2.length > 0) {
            console.log(
              `      -- found sufficient utxos in other wallet: ${name2}`
            );
            return utxos2;
          }
        } catch {
          console.log(
            `      -- searched in other wallet: ${name2} without result`
          );
        }
      }
    }
    console.log("TODO: add a fallback to search in multiple utxos from multiple active wallets");
    throw new Error(
      `no sufficient utxos found using any of ${strategy.length} strategies and ${Object.keys(this.setup.actorContext.others).length} additional wallets from actor-context (doesn't yet fund the total by contribution from multiple wallets)`
    );
  }
  /**
   * Locates a utxo in the current actor's wallet that matches the provided token predicate
   * @remarks
   * With the mode="multiple" option, it returns an array of matches if any are found, or undefined if none are found.
   * 
   * In "single" mode, it returns the single matching utxo, or undefined if none are found
   * 
   * When the searchOthers option is true, it searches in other wallets from the actor-context
   * if no utxos are matched  in the current actor's wallet.
   * @public
   */
  async findActorUtxo(name, predicate, options = {}, mode = "single") {
    const wallet = options.wallet ?? this.wallet;
    const { searchOthers = false, findCached = true } = options;
    const addrs = await wallet?.usedAddresses ?? [];
    const utxos = [];
    for (const addr of addrs.flat(1)) {
      if (!addr) continue;
      if (findCached) {
        console.log(`  Temporary: calling through to network instead of using cache`);
      }
      const addrUtxos = await this.network.getUtxos(addr);
      utxos.push(...addrUtxos);
    }
    return this.hasUtxo(
      name,
      predicate,
      {
        ...options,
        searchOthers: false,
        wallet,
        utxos
      },
      mode
    ).then(async (result) => {
      if (result) return result;
      if (!searchOthers) return result;
      console.log(
        `   -- no matching utxos found searching in actor's wallet: ${name}; searching in other wallets from actor-context...`
      );
      for (const [name2, otherWallet] of Object.entries(
        this.setup.actorContext.others
      )) {
        try {
          const otherActorUtxos = await this.findActorUtxo(
            name2,
            predicate,
            {
              ...options,
              searchOthers: false,
              wallet: otherWallet
            }
          );
          if (otherActorUtxos) {
            console.log(
              `     -- ^ found matching utxos in other wallet: ${name2}`
            );
            return otherActorUtxos;
          }
          console.log(
            `     -- no matching utxos found searching in other wallet: ${name2}; `
          );
        } catch {
          console.log(
            `     -- error searching in other wallet: ${name2}; `
          );
        }
      }
      console.log(
        `   -- Yikes! no matching utxos found searching in any wallets from actor-context`
      );
      return void 0;
    });
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
    dumpDetail,
    searchOthers
  }, mode = "single") {
    if (searchOthers) {
      throw new Error(
        "hasUtxo(): search option `searchOthers`: true is only valid in higher-level methods like findActorUtxo()"
      );
    }
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
      exceptInTcx,
      findCached = true
    } = options;
    const addrs = await wallet?.usedAddresses ?? [address];
    const utxos = [];
    for (const addr of addrs.flat(1)) {
      if (!addr) continue;
      if (findCached) {
        console.log(`  Temporary: calling through to network instead of using cache`);
      }
      const addrUtxos = await this.network.getUtxos(addr);
      utxos.push(...addrUtxos);
    }
    const found = await this.hasUtxo(semanticName, predicate, {
      address,
      wallet,
      exceptInTcx,
      utxos,
      extraErrorHint,
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
        ...environment.isTest ? [] : [{ wallet }],
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
  static async scriptBundleClass() {
    debugger;
    throw new Error(
      `${this.name}: missing required implementation of scriptBundleClass()
...each Stellar Contract must provide a static scriptBundleClass() method. 
It should return a class (not an instance) defined in a *.hlb.ts file.  At minimum:

    export default class MyScriptBundle extends HeliosScriptBundle { ... }
 or export default CapoDelegateBundle.usingCapoBundleClass(SomeCapoBundleClass) { ... }

We'll generate TS types and other utilities for connecting to the data-types in your Helios sources.
Your scriptBundle() method can return \`MyScriptBundle.create();\`

The function is async, so you can await a dynamic import() and reduce the initial bundle-load time.`
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
  async getBundle() {
    if (!this._bundle) {
      const bundle = await this.mkScriptBundle({});
      if (
        // this._bundle.precompiledScriptDetails &&
        // !this._bundle.precompiledScriptDetails.singleton
        !bundle.configuredScriptDetails
      ) {
        console.log(
          "first-time configuration of bundle ${bundle.constructor.name}"
        );
      }
      if (!bundle._didInit) {
        console.warn(
          `NOTE: the scriptBundle() method in ${this.constructor.name} isn't
initialized properly; it should use \`${bundle.constructor.name}.create({...})\`
... instead of \`new ${bundle.constructor.name}({...})\` `
        );
      }
      this._bundle = bundle;
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
   * This results in a generated **`.typeInfo.d.ts`** and **`.bridge.ts`** with complete
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
      if (this._bundle?._program) {
        const datumType = this._bundle.locateDatumType();
        if (datumType) {
          console.canDebug?.(
            `${this.constructor.name} dataBridgeClass = `,
            dataBridgeClass.name
          );
          if (!newBridge.datum) {
            console.warn(
              `${this.constructor.name}: dataBridgeClass must define a datum accessor.  This is likely a code-generation problem.`
            );
          }
        }
      }
      if (!newBridge.activity) {
        console.warn(
          `${this.constructor.name}: dataBridgeClass must define an activity accessor.  This is likely a code-generation problem.`
        );
      }
      this._dataBridge = newBridge;
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
    const {
      config,
      partialConfig: pCfg,
      previousOnchainScript,
      previousOnchainScript: {
        validatorHash,
        uplcProgram: previousUplcProgram
      } = {}
    } = args;
    this.configIn = config;
    let partialConfig = void 0;
    if (pCfg && Object.keys(pCfg).length == 0) {
      console.warn(
        `${this.constructor.name}: ignoring empty partialConfig; change the upstream code to leave it out`
      );
    } else {
      partialConfig = pCfg;
    }
    this.partialConfig = partialConfig;
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
    if (previousUplcProgram) {
      const bundle = await this.mkScriptBundle({
        scriptParamsSource: "config",
        previousOnchainScript
        // params: this.getContractScriptParams(config),
        // deployedDetails: {
        //     config,
        // },
      });
      this._bundle = bundle;
    } else if (config || partialConfig) {
      const variant = (config || partialConfig).variant;
      console.canDebug?.(
        `${this.constructor.name}: stellar offchain class init with config`
      );
      let params = config ? this.getContractScriptParams(config) : void 0;
      if (this.usesContractScript) {
        const deployedDetails = {
          config
          // programBundle,
          // scriptHash,
        };
        if (!config) {
          console.warn(
            `${this.constructor.name}: no config provided`
          );
        }
        const bundle = await this.mkScriptBundle({
          variant,
          deployedDetails,
          params
        });
        this._bundle = bundle;
        console.error("------------------------ bundle init done");
        if (!bundle.isHeliosScriptBundle()) {
          throw new Error(
            `${this.constructor.name}: this.bundle must be a HeliosScriptBundle; got ${bundle.constructor.name}`
          );
        }
        if (bundle.setup && bundle.configuredParams) {
          try {
            if (false) ;
          } catch (e) {
            console.warn("while loading program: ", e.message);
          }
        } else if (bundle.setup && bundle.params) {
          debugger;
          throw new Error(`what is this situation here? (dbpa)`);
        }
        console.canDebug?.(
          bundle.configuredScriptDetails?.programName || bundle.moduleName || this.constructor.name,
          "bundle loaded"
        );
      }
    } else {
      const bundle = await this.getBundle();
      if (bundle.isPrecompiled) {
        console.log(
          `${bundle.displayName}: will load the precompiled on-chain policy on-demand`
        );
      } else if (bundle.scriptParamsSource == "config") {
        console.error(
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
  async mkScriptBundle(setupDetails = placeholderSetupDetails) {
    const bundleClass = await this.constructor.scriptBundleClass();
    return bundleClass.create({
      ...setupDetails,
      setup: this.setup
      // defaultParams: (
      //     this.constructor as typeof StellarContract<any>
      // ).defaultParams,
    });
  }
  _compiledScript;
  // initialized in compileWithScriptParams()
  get compiledScript() {
    if (this._bundle?.alreadyCompiledScript) {
      return this._bundle.alreadyCompiledScript;
    }
    if (!this._compiledScript) {
      throw new Error(
        `${this.constructor.name}: compiledScript not yet initialized; call asyncCompiledScript() first`
      );
    }
    return this._compiledScript;
  }
  async asyncCompiledScript() {
    if (!this.usesContractScript) {
      throw new Error(
        `${this.constructor.name}: usesContractScript is false; don't call asyncCompiledScript().`
      );
    }
    const b = await this.getBundle();
    const compiledScript = await b.compiledScript(true);
    if (b.alreadyCompiledScript !== compiledScript) {
      throw new Error(
        "impossible! alreadyCompiledScript should be present"
      );
    }
    return compiledScript;
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
    if (this._bundle?.scriptHash) {
      return this._cache.vh = makeValidatorHash(
        this._bundle.scriptHash
      );
    }
    throw new Error(
      "bundle not initialized with getBundle() before getting validatorHash"
    );
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
    console.log(
      "TODO - ensure each contract can indicate the right stake part of its address"
    );
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
    const { mph } = this._cache;
    if (mph) return mph;
    const hash = this._bundle?.scriptHash;
    if (!hash) {
      throw new Error(
        "bundle not initialized with getBundle() before getting mintingPolicyHash"
      );
    }
    const nMph = makeMintingPolicyHash(hash);
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
    return this.preloadedBundle.locateDatumType();
  }
  get preloadedBundle() {
    if (!this._bundle) {
      throw new Error("bundle must be loaded before calling this");
    }
    return this._bundle;
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
  loadProgram() {
    if (!this._bundle)
      throw new Error(
        `${this.constructor.name}: no bundle / script program`
      );
    return this._bundle.loadProgram();
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
    const program = this.loadProgram();
    const scriptNamespace = program.name;
    const {
      [scriptNamespace]: { [onChainActivitiesName]: ActivitiesType }
    } = this.program.userTypes;
    return ActivitiesType;
  }
  /** @ignore */
  /**
   * Retrieves an on-chain type for a specific named activity ("redeemer")
   * @remarks
   *
   * Cross-checks the requested name against the available activities in the script.
   * Throws a helpful error if the requested activity name isn't present.'
   *
   * @param activityName - the name of the requested activity
   *
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
    return this.preloadedBundle.isDefinitelyMainnet();
  }
  paramsToUplc(params) {
    return this.preloadedBundle.paramsToUplc(params);
  }
  typeToUplc(type, data, path = "") {
    return this.preloadedBundle.typeToUplc(type, data, path);
  }
  get program() {
    return this.preloadedBundle.program;
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
    let bundle = await this.getBundle();
    if (!this.setup) {
      console.warn(
        `compileWithScriptParams() called before setup is available`
      );
      debugger;
    }
    if (bundle.isConcrete || bundle.configuredParams) {
      throw new Error(
        `can't prepare bundle when there's already a good one`
      );
    }
    bundle = this._bundle = await this.mkScriptBundle({
      params,
      scriptParamsSource: "config"
    });
    this._compiledScript = await bundle.compiledScript(true);
    this._cache = {};
  }
  /**
   * Locates a UTxO locked in a validator contract address
   * @remarks
   *
   * Throws an error if no matching UTxO can be found
   * @param semanticName - descriptive name; used in diagnostic messages and any errors thrown
   * @param options - options for the search
   * @public
   **/
  async mustFindMyUtxo(semanticName, options) {
    const { predicate, exceptInTcx, extraErrorHint, utxos, findCached } = options;
    const { address } = this;
    return this.utxoHelper.mustFindUtxo(semanticName, {
      predicate,
      address,
      exceptInTcx,
      extraErrorHint,
      utxos,
      findCached
    });
  }
  mkTcx(tcxOrName, name) {
    const effectiveName = tcxOrName && isLibraryMatchedTcx(tcxOrName) ? name : tcxOrName || "\u2039unnamed context\u203A";
    const tcx = (
      //@ts-expect-error on this type probe
      tcxOrName?.kind === "StellarTxnContext" ? tcxOrName : new StellarTxnContext(this.setup).withName(
        name || tcxOrName || "\u2039no-name\u203A"
      )
    );
    if (effectiveName && !tcx?.txnName)
      return tcx.withName(effectiveName);
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
__decorateClass([
  partialTxn
], StellarContract.prototype, "txnKeepValue");

export { Activity as A, StellarContract as S, UutName as U, UtxoHelper as a, datum as d, isUplcData as i, partialTxn as p, txn as t };
//# sourceMappingURL=StellarContract2.mjs.map
