import { createFilter } from 'rollup-pluginutils';
import * as helios from '@hyperionbt/helios';
import { Address, Tx, Value, TxOutput, TxInput, Assets, MintingPolicyHash, Program, bytesToHex, Crypto, NetworkParams, NetworkEmulator, Datum } from '@hyperionbt/helios';
import { promises } from 'fs';
import { expect } from 'vitest';

function heliosRollupLoader(opts = {
  include: "**/*.hl"
}) {
  if (!opts.include) {
    throw Error("missing required 'include' option for helios loader");
  }
  const filter = createFilter(opts.include, opts.exclude);
  return {
    name: "helios",
    transform(code, id) {
      if (filter(id)) {
        return {
          code: `export default ${JSON.stringify(code)};`,
          map: { mappings: "" }
        };
      }
    }
  };
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
function assetsAsString(v) {
  return Object.entries(v).map(([policyId, tokens]) => {
    const tokenString = Object.entries(tokens).map(
      ([name, count]) => `${count}\xD7\u{1F4B4} ${hexToPrintableString(name)}`
    ).join(" + ");
    return `\u2991\u{1F3E6} ${policyId.substring(0, 12)}\u2026 ${tokenString}\u2992`;
  }).join("\n  ");
}
function lovelaceToAda(l) {
  const asNum = parseInt(l.toString());
  const ada = asNum && `${(Math.round(asNum / 1e3) / 1e3).toFixed(3)} ADA` || "";
  return ada;
}
function valueAsString(v) {
  const ada = lovelaceToAda(v.lovelace);
  const assets = assetsAsString(v.assets.dump?.() || v.assets);
  return [ada, assets].filter((x) => !!x).join(" + ");
}
function txAsString(tx) {
  const bodyAttrs = [
    "inputs",
    "minted",
    "collateral",
    "refInputs",
    "outputs",
    "fee",
    "lastValidSlot",
    "firstValidSlot",
    "metadataHash",
    "scriptDataHash",
    "signers",
    "collateralReturn"
  ];
  const witnessAttrs = [
    "signatures",
    "datums",
    "refScripts",
    "scripts",
    "redeemers",
    "nativeScripts"
  ];
  let details = "";
  const d = tx.dump();
  //!!! todo: improve interface of tx so useful things have a non-private api
  //!!! todo: get rid of dump()
  //!!! todo: get back to type-safety in this diagnostic suite
  for (const x of bodyAttrs) {
    let item = tx.body[x] || d.body[x];
    let skipLabel = false;
    if (Array.isArray(item) && !item.length)
      continue;
    if (!item)
      continue;
    if ("inputs" == x) {
      item = `
  ${item.map((x2) => txInputAsString(x2)).join("\n  ")}`;
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
      const assets = item?.dump();
      if (!Object.entries(assets || {}).length)
        continue;
      item = ` \u2747\uFE0F  ${assetsAsString(assets)}`;
    }
    if ("outputs" == x) {
      item = `
  ${item.map((x2, i) => txOutputAsString(x2, `${i}  <-`)).join("\n  ")}`;
    }
    if ("signers" == x) {
      item = item.map((x2) => {
        if (!x2.hex)
          debugger;
        return `\u{1F511}#${x2.hex.substring(0, 8)}\u2026`;
      });
    }
    if ("fee" == x) {
      item = parseInt(item);
      item = `${(Math.round(item / 1e3) / 1e3).toFixed(3)} ADA ` + tx.profileReport.split("\n")[0];
    }
    if ("collateralReturn" == x) {
      skipLabel = true;
      item = `  ${txOutputAsString(
        item,
        `0  <- \u2753`
      )} conditional: collateral change (returned in case of txn failure)`;
    }
    details += `${skipLabel ? "" : "  " + x + ": "}${item}
`;
  }
  let hasWinfo = false;
  const winfo = {};
  for (const x of witnessAttrs) {
    let item = tx.witnesses[x] || d.witnesses[x];
    if (Array.isArray(item) && !item.length)
      continue;
    if ("datums" == x && !Object.entries(item || {}).length)
      continue;
    if ("signatures" == x) {
      if (!item)
        continue;
      item = item.map((s) => {
        return `\u{1F58A}\uFE0F ${Address.fromPubKeyHash(s.pubKeyHash).toBech32().substring(0, 24)}\u2026`;
      });
      if (item.length > 1)
        item.unshift("");
      item = item.join("\n    ");
    }
    if ("redeemers" == x) {
      if (!item)
        continue;
      //!!! todo: augment with mph when that's available from the Redeemer.
      item = item.map(
        (x2) => {
          const indexInfo = x2.inputIndex == -1 ? `spend txin #\u2039tbd\u203A` : "inputIndex" in x2 ? `spend txin #${1 + x2.inputIndex}` : `mint policy#${1 + x2.mphIndex}`;
          return `\u{1F3E7}  ${indexInfo} ${x2.data.toString()}`;
        }
      );
      if (item.length > 1)
        item.unshift("");
      item = item.join("\n    ");
    }
    if ("scripts" == x) {
      if (!item)
        continue;
      item = item.map((s) => {
        try {
          return `\u{1F3E6} ${s.mintingPolicyHash.hex.substring(
            0,
            12
          )}\u2026 (minting)`;
        } catch (e) {
          return `\u{1F4DC} ${s.validatorHash.hex.substring(
            0,
            12
          )}\u2026 (validator)`;
        }
      });
      if (item.length > 1)
        item.unshift("");
      item = item.join("\n    ");
    }
    if (!item)
      continue;
    hasWinfo = true;
    winfo[x] = item;
  }
  if (hasWinfo) {
    details += Object.entries(winfo).map(([k, v]) => `  ${k}: ${v}
`).join("");
  }
  try {
    details = details + `  txId: ${tx.id().hex}`;
  } catch (e) {
    details = details + `  (Tx not yet finalized!)`;
  }
  return details;
}
function txInputAsString(x, prefix = "-> ") {
  return `${prefix}${x.address.toBech32().substring(0, 18)}\u2026 ${valueAsString(
    x.value
  )} = \u{1F4D6} ${x.txId.hex.substring(0, 12)}\u2026@${x.utxoIdx}`;
}
function utxosAsString(utxos, joiner = "\n") {
  return utxos.map((u) => utxoAsString(u, " \u{1F4B5}")).join(joiner);
}
function utxoAsString(u, prefix = "\u{1F4B5}") {
  return ` \u{1F4D6} ${u.txId.hex.substring(0, 12)}\u2026@${u.utxoIdx}: ${txOutputAsString(u.origOutput, prefix)}`;
}
function datumAsString(d) {
  if (!d)
    return "";
  const dhss = d.hash.hex.substring(0, 12);
  if (d.isInline())
    return `d\u2039inline:${dhss}\u2026\u203A`;
  return `d\u2039hash:${dhss}\u2026\u203A`;
}
function txOutputAsString(x, prefix = "<-") {
  const bech32 = x.address.bech32 || x.address.toBech32();
  return `${prefix} ${bech32.substring(0, 18)}\u2026 ${datumAsString(
    x.datum
  )} ${valueAsString(x.value)}`;
}

//!!! if we could access the inputs and outputs in a building Tx,
class StellarTxnContext {
  tx;
  inputs;
  collateral;
  outputs;
  feeLimit;
  state;
  selectedDelegates = {};
  constructor(state = {}) {
    this.tx = new Tx();
    this.inputs = [];
    this.state = state;
    this.collateral = void 0;
    this.outputs = [];
  }
  dump() {
    const { tx } = this;
    return txAsString(tx);
  }
  mintTokens(...args) {
    this.tx.mintTokens(...args);
    return this;
  }
  reservedUtxos() {
    return [
      ...this.inputs,
      this.collateral
    ].filter((x) => !!x);
  }
  utxoNotReserved(u) {
    if (this.collateral?.eq(u))
      return void 0;
    if (this.inputs.find((i) => i.eq(u)))
      return void 0;
    return u;
  }
  addCollateral(collateral) {
    if (!collateral.value.assets.isZero()) {
      throw new Error(`invalid attempt to add non-pure-ADA utxo as collateral`);
    }
    this.collateral = collateral;
    this.tx.addCollateral(collateral);
    return this;
  }
  addInput(...args) {
    const [input, ..._otherArgs] = args;
    this.inputs.push(input);
    this.tx.addInput(...args);
    return this;
  }
  addInputs(...args) {
    const [inputs, ..._otherArgs] = args;
    this.inputs.push(...inputs);
    this.tx.addInputs(...args);
    return this;
  }
  addOutput(...args) {
    const [output, ..._otherArgs] = args;
    this.outputs.push(output);
    this.tx.addOutput(...args);
    return this;
  }
  addOutputs(...args) {
    const [outputs, ..._otherArgs] = args;
    this.outputs.push(...outputs);
    this.tx.addOutputs(...args);
    return this;
  }
  attachScript(...args) {
    this.tx.attachScript(...args);
    return this;
  }
  async addSignature(wallet) {
    const [sig] = await wallet.signTx(this.tx);
    this.tx.addSignature(sig);
  }
  /**
   * To add a script to the transaction context, use `attachScript`
   *
   * @deprecated - invalid method name; use attachScript
   **/
  addScript() {
  }
}

var __defProp$4 = Object.defineProperty;
var __getOwnPropDesc$4 = Object.getOwnPropertyDescriptor;
var __decorateClass$4 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$4(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$4(target, key, result);
  return result;
};
const Activity = {
  partialTxn(proto, thingName, descriptor) {
    needsActiveVerb(thingName);
    return partialTxn(proto, thingName, descriptor);
  },
  redeemer(proto, thingName, descriptor) {
    needsActiveVerb(thingName, true);
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
    throw new Error(
      `@partialTxn factory: ${thingName}: should start with 'txn[A-Z]...'`
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
    console.log("finding funds in wallet", a.toBech32().substring(0, 18));
    const utxos = await w.utxos;
    for (const u of utxos) {
      if (lovelaceOnly) {
        if (u.value.assets.isZero() && u.value.lovelace >= v.lovelace) {
          return u;
        }
        console.log("  - too small; skipping ", u.value.dump());
      } else {
        if (u.value.ge(v)) {
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
        if (u.value.ge(v)) {
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
  //! it has configuredContract: a parameterized instance of the contract
  //  ... with specific `parameters` assigned.
  configuredContract;
  compiledContract;
  paramsIn;
  contractParams;
  network;
  networkParams;
  _template;
  myActor;
  static get defaultParams() {
    return {};
  }
  getContractParams(params) {
    return params;
  }
  constructor({
    params,
    network,
    networkParams,
    isTest,
    myActor
  }) {
    this.network = network;
    this.networkParams = networkParams;
    this.paramsIn = params;
    if (myActor)
      this.myActor = myActor;
    this.contractParams = this.getContractParams(params);
    const configured = this.configuredContract = this.contractTemplate();
    this.configuredContract.parameters = this.contractParams;
    const simplify = !isTest;
    if (simplify) {
      console.warn(`Loading optimized contract code for ` + this.configuredContract.name);
    }
    this.compiledContract = configured.compile(simplify);
  }
  get datumType() {
    return this.configuredContract.types.Datum;
  }
  _purpose;
  get purpose() {
    if (this._purpose)
      return this._purpose;
    const purpose = this.configuredContract.purpose;
    return this._purpose = purpose;
  }
  get address() {
    return Address.fromHashes(this.compiledContract.validatorHash);
  }
  get mintingPolicyHash() {
    if ("minting" != this.purpose)
      return void 0;
    return this.compiledContract.mintingPolicyHash;
  }
  get identity() {
    if ("minting" == this.purpose) {
      const b32 = this.compiledContract.mintingPolicyHash.toBech32();
      //!!! todo: verify bech32 checksum isn't messed up by this:
      return b32.replace(/^asset/, "mph");
    }
    return this.address.toBech32();
  }
  stringToNumberArray(str) {
    let encoder = new TextEncoder();
    let byteArray = encoder.encode(str);
    return [...byteArray].map((x) => parseInt(x.toString()));
  }
  mkValuesEntry(tokenName, count) {
    return [this.stringToNumberArray(tokenName), count];
  }
  //! searches the network for utxos stored in the contract,
  //  returning those whose datum hash is the same as the input datum
  async outputsSentToDatum(datum2) {
    const myUtxos = await this.network.getUtxos(this.address);
    return myUtxos.filter((u) => {
      return u.origOutput.datum.hash.hex == datum2.hash.hex;
    });
  }
  //! adds the values of the given TxInputs
  totalValue(utxos) {
    return utxos.reduce((v, u) => {
      return v.add(u.value);
    }, new Value(0n));
  }
  // non-activity partial
  txnKeepValue(tcx, value, datum2) {
    tcx.addOutput(new TxOutput(this.address, value, datum2));
    return tcx;
  }
  addScriptWithParams(TargetClass, params) {
    const args = {
      params,
      network: this.network,
      myActor: this.myActor,
      networkParams: this.networkParams,
      isTest: true
    };
    const strella = new TargetClass(args);
    return strella;
  }
  // async findDatum(d: Datum | DatumHash): Promise<TxInput[]>;
  // async findDatum(predicate: utxoPredicate): Promise<TxInput[]>;
  // async findDatum(d: Datum | DatumHash | utxoPredicate): Promise<TxInput[]> {
  //     let targetHash: DatumHash | undefined =
  //         d instanceof Datum
  //             ? d.hash
  //             : d instanceof DatumHash
  //             ? d
  //             : undefined;
  //     let predicate =
  //         "function" === typeof d
  //             ? d
  //             : (u: TxInput) => {
  //                   const match =
  //                       u.origOutput?.datum?.hash.hex == targetHash?.hex;
  //                   console.log(
  //                       txOutputAsString(
  //                           u.origOutput,
  //                           `    ${match ? "✅ matched " : "❌ no match"}`
  //                       )
  //                   );
  //                   return !!match;
  //               };
  //     //prettier-ignore
  //     console.log(
  //         `finding utxo with datum ${
  //             targetHash?.hex.substring(0,12)
  //         }... in wallet`,
  //         this.address.toBech32().substring(0,18)
  //     );
  //     const heldUtxos = await this.network.getUtxos(this.address);
  //     console.log(`    - found ${heldUtxos.length} utxo:`);
  //     return heldUtxos.filter(predicate);
  // }
  async readDatum(datumName, datum2) {
    const thisDatumType = this.configuredContract.mainArgTypes.find(
      (x) => "Datum" == x.name
    ).typeMembers[datumName];
    if (!thisDatumType)
      throw new Error(`invalid datumName ${datumName}`);
    if (!datum2.isInline())
      throw new Error(`datum must be an InlineDatum to be readable using readDatum()`);
    const { fieldNames, instanceMembers } = thisDatumType;
    const offChainTypes = Object.fromEntries(
      fieldNames.map((fn) => {
        return [fn, instanceMembers[fn].offChainType];
      })
    );
    return Object.fromEntries(await Promise.all(
      fieldNames.map(async (fn, i) => {
        let current;
        const uplcData = datum2.data.fields[i];
        const thisFieldType = instanceMembers[fn];
        try {
          current = thisFieldType.uplcToJs(uplcData);
          if (current.then)
            current = await current;
          if ("Enum" === thisFieldType?.typeDetails?.internalType?.type && 0 === uplcData.fields.length) {
            current = Object.keys(current)[0];
          }
        } catch (e) {
          if (e.message?.match(/doesn't support converting from Uplc/)) {
            try {
              current = await offChainTypes[fn].fromUplcData(uplcData);
              if ("some" in current)
                current = current.some;
            } catch (e2) {
              console.error(`datum: field ${fn}: ${e2.message}`);
              debugger;
              throw e2;
            }
          } else {
            throw e;
          }
        }
        return [fn, current];
      })
    ));
  }
  findSmallestUnusedUtxo(lovelace, utxos, tcx) {
    const value = new Value({ lovelace });
    const toSortInfo = this._mkUtxoSortInfo(value.lovelace);
    const found = utxos.map(toSortInfo).filter(this._utxoIsPureADA).filter(this._utxoIsSufficient).filter((uInfo) => {
      if (!tcx)
        return true;
      return !!tcx?.utxoNotReserved(uInfo.u);
    }).sort(this._utxoSortSmallerAndPureADA).map(this._infoBackToUtxo);
    console.log("smallest utxos: ", utxosAsString(found));
    const chosen = found.at(0);
    return chosen;
  }
  //! creates a filtering function, currently for TxInput-filtering only.
  //! with the optional tcx argument, utxo's already reserved
  //  ... in that transaction context will be skipped.
  mkValuePredicate(lovelace, tcx) {
    const value = new Value({ lovelace });
    const predicate = _adaPredicate.bind(this, tcx);
    predicate.value = value;
    return predicate;
    function _adaPredicate(tcx2, utxo) {
      return this.hasOnlyAda(value, tcx2, utxo);
    }
  }
  mkTokenPredicate(vOrMph, tokenName, quantity) {
    let v;
    if (!vOrMph)
      throw new Error(
        `missing required Value or MintingPolicyHash in arg1`
      );
    const predicate = _tokenPredicate.bind(this);
    const isValue = !(vOrMph instanceof MintingPolicyHash);
    if (isValue) {
      v = predicate.value = vOrMph;
      return predicate;
    }
    if (!tokenName || !quantity)
      throw new Error(
        `missing required tokenName, quantity for this mph`
      );
    const mph = vOrMph;
    v = predicate.value = this.tokenAsValue(tokenName, quantity, mph);
    return predicate;
    function _tokenPredicate(something) {
      return this.hasToken(something, v);
    }
  }
  hasToken(something, value, tokenName, quantity) {
    if (something instanceof TxInput)
      return this.utxoHasToken(something, value, tokenName, quantity) && something || void 0;
    if (something instanceof TxOutput)
      return this.outputHasToken(something, value, tokenName, quantity) && something || void 0;
    if (something instanceof Assets)
      return this.assetsHasToken(something, value, tokenName, quantity) && something || void 0;
    //!!! todo: more explicit match for TxInput, which seems to be a type but not an 'instanceof'-testable thing.
    return this.inputHasToken(something, value, tokenName, quantity) && something || void 0;
  }
  utxoHasToken(u, value, tokenName, quantity) {
    return this.outputHasToken(u.origOutput, value, tokenName, quantity) && u;
  }
  inputHasToken(i, value, tokenName, quantity) {
    return this.outputHasToken(i.origOutput, value, tokenName, quantity) && i;
  }
  assetsHasToken(a, vOrMph, tokenName, quantity) {
    const v = vOrMph instanceof MintingPolicyHash ? this.tokenAsValue(tokenName, quantity, vOrMph) : vOrMph;
    return a.ge(v.assets);
  }
  outputHasToken(o, vOrMph, tokenName, quantity) {
    if (vOrMph instanceof MintingPolicyHash && !tokenName)
      throw new Error(
        `missing required tokenName (or use a Value in arg2`
      );
    if (vOrMph instanceof MintingPolicyHash && !quantity)
      throw new Error(
        `missing required quantity (or use a Value in arg2`
      );
    const v = vOrMph instanceof MintingPolicyHash ? this.tokenAsValue(tokenName, quantity, vOrMph) : vOrMph;
    return o.value.ge(v);
  }
  //! deprecated tokenAsValue - use Capo
  tokenAsValue(tokenName, quantity, mph) {
    throw new Error(`deprecated tokenAsValue on StellarContract base class (Capo has mph, not so much any StellarContract`);
  }
  hasOnlyAda(value, tcx, u) {
    const toSortInfo = this._mkUtxoSortInfo(value.lovelace);
    const found = [u].map(toSortInfo).filter(this._utxoIsSufficient).filter(this._utxoIsPureADA).map(this._infoBackToUtxo).at(0);
    return found;
  }
  _utxoSortSmallerAndPureADA({ free: free1, minAdaAmount: r1 }, { free: free2, minAdaAmount: r2 }) {
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
    if (free2 > free1)
      return -1;
    if (free2 < free1)
      return 1;
    return 0;
  }
  _utxoIsSufficient({ sufficient }) {
    return !!sufficient;
  }
  _utxoIsPureADA({ u }) {
    return u.value.assets.isZero() ? u : void 0;
  }
  _infoBackToUtxo({ u }) {
    return u;
  }
  _mkUtxoSortInfo(min, max) {
    return (u) => {
      const minAdaAmount = u.value.assets.isZero() ? BigInt(0) : u.origOutput.calcMinLovelace(this.networkParams);
      const free = u.value.lovelace - minAdaAmount;
      const sufficient = free > min && (max ? free < max : true);
      const t = { u, sufficient, free, minAdaAmount };
      return t;
    };
  }
  _utxoCountAdaOnly(c, { minAdaAmount }) {
    return c + (minAdaAmount ? 0 : 1);
  }
  async findAnySpareUtxos(tcx) {
    if (!this.myActor)
      throw this.missingActorError;
    const mightNeedFees = this.ADA(3.5);
    const toSortInfo = this._mkUtxoSortInfo(mightNeedFees);
    const notReserved = tcx ? tcx.utxoNotReserved.bind(tcx) : (u) => u;
    return this.myActor.utxos.then((utxos) => {
      const allSpares = utxos.filter(notReserved).map(toSortInfo).filter(this._utxoIsSufficient).sort(this._utxoSortSmallerAndPureADA);
      if (allSpares.reduce(this._utxoCountAdaOnly, 0) > 0) {
        return allSpares.filter(this._utxoIsPureADA).map(this._infoBackToUtxo);
      }
      return allSpares.map(this._infoBackToUtxo);
    });
  }
  async submit(tcx, {
    sign = true,
    signers = []
  } = {}) {
    let { tx, feeLimit = 2000000n } = tcx;
    if (this.myActor || signers.length) {
      const [changeAddress] = await this.myActor?.usedAddresses || [];
      const spares = await this.findAnySpareUtxos(tcx);
      const willSign = [...signers];
      if (sign && this.myActor) {
        willSign.push(this.myActor);
      }
      for (const s of willSign) {
        const [a] = await s.usedAddresses;
        if (tx.body.signers.find((s2) => a.pubKeyHash.hex === s2.hex))
          continue;
        tx.addSigner(a.pubKeyHash);
      }
      const feeEstimated = tx.estimateFee(this.networkParams);
      if (feeEstimated > feeLimit) {
        console.log("outrageous fee - adjust tcx.feeLimit to get a different threshold");
        throw new Error(`outrageous fee-computation found - check txn setup for correctness`);
      }
      try {
        await tx.finalize(this.networkParams, changeAddress, spares);
      } catch (e) {
        console.log("FAILED submitting:", tcx.dump());
        throw e;
      }
      for (const s of willSign) {
        const sig = await s.signTx(tx);
        tx.addSignatures(sig, true);
      }
    } else {
      console.warn("no 'myActor'; not finalizing");
    }
    console.log("Submitting tx: ", tcx.dump());
    return this.network.submitTx(tx);
  }
  ADA(n) {
    const bn = "number" == typeof n ? BigInt(Math.round(1e6 * n)) : BigInt(1e6) * n;
    return bn;
  }
  //! it requires an subclass to define a contractSource
  contractSource() {
    throw new Error(`missing contractSource impl`);
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
  // static withParams(this: new () => StellarContract, params: any) : never | StellarContract {
  //     throw new Error(`subclass must implement static withParams`);
  //     // return new this(params)
  // }
  // constructor(params: any) {
  // }
  importModules() {
    return [];
  }
  contractTemplate() {
    const src = this.contractSource();
    const modules = this.importModules();
    return this._template = this._template || Program.new(src, modules);
  }
  async getMyActorAddress() {
    if (!this.myActor)
      throw this.missingActorError;
    const [addr] = await this.myActor.usedAddresses;
    return addr;
  }
  get missingActorError() {
    return `missing required 'myActor' property on ${this.constructor.name} instance`;
  }
  async mustFindActorUtxo(name, predicate, hintOrExcept, hint) {
    const address = await this.getMyActorAddress();
    const isTcx = hintOrExcept instanceof StellarTxnContext;
    const exceptInTcx = isTcx ? hintOrExcept : void 0;
    const extraErrorHint = isTcx ? hint : "string" == typeof hintOrExcept ? hintOrExcept : void 0;
    return this.mustFindUtxo(
      name,
      predicate,
      { address, exceptInTcx },
      extraErrorHint
    );
  }
  async mustFindMyUtxo(name, predicate, hintOrExcept, hint) {
    const { address } = this;
    const isTcx = hintOrExcept instanceof StellarTxnContext;
    const exceptInTcx = isTcx ? hintOrExcept : void 0;
    const extraErrorHint = isTcx ? hint : "string" == typeof hintOrExcept ? hintOrExcept : void 0;
    return this.mustFindUtxo(
      name,
      predicate,
      { address, exceptInTcx },
      extraErrorHint
    );
  }
  async mustFindUtxo(name, predicate, {
    address,
    exceptInTcx
  }, extraErrorHint = "") {
    const found = await this.hasUtxo(name, predicate, {
      address,
      exceptInTcx
    });
    if (!found) {
      throw new Error(
        `${this.constructor.name}: '${name}' utxo not found (${extraErrorHint}) in address`
      );
    }
    return found;
  }
  toUtxoId(u) {
    return `${u.txId.hex}@${u.utxoIdx}`;
  }
  async txnFindUtxo(tcx, name, predicate, address = this.address) {
    return this.hasUtxo(name, predicate, {
      address,
      exceptInTcx: tcx
    });
  }
  async hasUtxo(name, predicate, {
    address,
    exceptInTcx
  }) {
    const utxos = await this.network.getUtxos(address);
    const filterUtxos = exceptInTcx?.reservedUtxos();
    const filtered = exceptInTcx ? utxos.filter(exceptInTcx.utxoNotReserved.bind(exceptInTcx)) : utxos;
    console.log(
      `finding '${name}' utxo${exceptInTcx ? " (not already being spent in txn)" : ""} from set:
  ${utxosAsString(filtered, "\n  ")}`,
      ...exceptInTcx && filterUtxos?.length ? [
        "\n  ... after filtering out:\n  ",
        utxosAsString(exceptInTcx.reservedUtxos(), "\n  ")
      ] : []
    );
    const found = filtered.find(predicate);
    if (found) {
      console.log({
        found: utxosAsString([found])
      });
    } else {
      console.log("  (not found)");
    }
    return found;
  }
  async hasMyUtxo(name, predicate) {
    return this.hasUtxo(name, predicate, { address: this.address });
  }
}
__decorateClass$4([
  partialTxn
], StellarContract.prototype, "txnKeepValue", 1);

var contract$2 = "minting defaultMinter\n\nconst seedTxn : TxId = TxId::new(#1234)\nconst seedIndex : Int = 42\n\nimport { \n    hasSeedUtxo, \n    validateUutMinting\n} from CapoMintHelpers\n\nenum Redeemer { \n    mintingCharterToken {\n        owner: Address\n    }\n    mintingUuts {\n        seedTxn: TxId\n        seedIndex: Int\n        //!!! todo: apply this everywhere else\n        purposes: []String\n    }\n}\n\nfunc hasContractSeedUtxo(tx: Tx) -> Bool {\n    hasSeedUtxo(tx, seedTxn, seedIndex, \"charter\")\n}\n\nfunc main(r : Redeemer, ctx: ScriptContext) -> Bool {\n    tx: Tx = ctx.tx;\n    mph: MintingPolicyHash = ctx.get_current_minting_policy_hash();\n    value_minted: Value = tx.minted;\n\n    charterToken: AssetClass = AssetClass::new(\n        mph,\n        \"charter\".encode_utf8()\n    );\n\n    ok : Bool = r.switch {\n        charter: mintingCharterToken => {       \n            assert(value_minted == Value::new(charterToken, 1), \"no charter token minted\");\n\n            hasContractSeedUtxo(tx) &&\n            tx.outputs.all( (output: TxOutput) -> Bool {\n                output.value != value_minted || (\n                    output.value == value_minted &&\n                    output.address == charter.owner\n                )\n            })\n        },\n\n        mintingUuts{sTxId, sIdx, purposes} => validateUutMinting(ctx, sTxId, sIdx, purposes),\n        _ => true\n    };\n\n    print(\"defaultMinter: minting value: \" + value_minted.show());\n\n    ok\n}\n\n";

var cmh = "module CapoMintHelpers\n\n\nfunc hasSeedUtxo(tx: Tx, sTxId : TxId, sIdx: Int, reason: String) -> Bool {\n    seedUtxo: TxOutputId = TxOutputId::new(\n        sTxId,\n        sIdx\n    );\n    assert(tx.inputs.any( (input: TxInput) -> Bool {\n        input.output_id == seedUtxo\n    }),  \"seed utxo required for minting \"+reason);\n\n    true\n}\n\nfunc validateUutMinting(ctx: ScriptContext, sTxId : TxId, sIdx : Int, purposes: []String) -> Bool {\n    tx: Tx = ctx.tx;\n    mph: MintingPolicyHash = ctx.get_current_minting_policy_hash();\n    value_minted: Value = tx.minted;\n    idxBytes : ByteArray = sIdx.bound_max(255).serialize();\n    // assert(idxBytes.length == 1, \"surprise!\");\n\n    //! yuck: un-CBOR...\n    rawTxId : ByteArray = sTxId.serialize().slice(5,37);\n\n    txoId : ByteArray = (rawTxId + \"@\".encode_utf8() + idxBytes);\n    assert(txoId.length == 34, \"txId + @ + int should be length 34\");\n    // print( \"******** txoId \" + txoId.show());\n\n    miniHash : ByteArray = txoId.blake2b().slice(0,6);\n    assert(miniHash.length == 6, \"urgh.  slice 5? expected 12, got \"+ miniHash.length.show());\n\n    assetValues = Value::sum(purposes.sort((a:String, b:String) -> Bool { a == b }).map(\n        (purpose: String) -> Value {\n            assetName : ByteArray = (purpose + \".\" + miniHash.show()).encode_utf8();\n            assetClass : AssetClass = AssetClass::new(mph, assetName);\n\n            Value::new(assetClass, 1)\n        }\n    ));\n    expectedMint : Map[ByteArray]Int = assetValues.get_policy(mph);\n    actualMint : Map[ByteArray]Int = value_minted.get_policy(mph);\n\n    // print(\"redeemer\" + sTxId.show() + \" \" + sIdx.show() + \" asset \" + assetName.show());\n    // expectedMint.for_each( (b : ByteArray, i: Int) -> {\n    //     print( \"expected: \" + b.show() + \" \" + i.show() )\n    // });\n    temp : []ByteArray = actualMint.fold( (l: []ByteArray, b : ByteArray, i: Int) -> {\n        l.find_safe((x : ByteArray) -> Bool { x == b }).switch{\n            None => l.prepend(b),\n            Some => error(\"UUT purposes not unique\")\n        }\n    }, []ByteArray{});\n    assert(temp == temp, \"prevent unused var\");\n\n    // actualMint.for_each( (b : ByteArray, i: Int) -> {\n    //     print( \"actual: \" + b.show() + \" \" + i.show() )\n    // });\n\n    assert(expectedMint == actualMint, \"bad UUT mint has mismatch;\"+ \n        \"\\n   ... expected \"+ assetValues.show()+\n        \"   ... actual \"+ value_minted.show()+\n        \"   ... diff = \" + (assetValues - value_minted).show()\n    );\n    hasSeedUtxo(tx, sTxId, sIdx, \"UUT \"+purposes.join(\"+\"))\n}";

//! this file implements a workaround for a problem 
const CapoMintHelpers = cmh;

var __defProp$3 = Object.defineProperty;
var __getOwnPropDesc$3 = Object.getOwnPropertyDescriptor;
var __decorateClass$3 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$3(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$3(target, key, result);
  return result;
};
class DefaultMinter extends StellarContract {
  contractSource() {
    return contract$2;
  }
  capoMinterHelpers() {
    return CapoMintHelpers;
  }
  importModules() {
    return [this.capoMinterHelpers()];
  }
  async txnCreatingUuts(tcx, uutPurposes) {
    //!!! make it big enough to serve minUtxo for the new UUT
    const uutSeed = this.mkValuePredicate(BigInt(42e3), tcx);
    return this.mustFindActorUtxo(
      `for-uut-${uutPurposes.join("+")}`,
      uutSeed,
      tcx
    ).then(async (freeSeedUtxo) => {
      tcx.addInput(freeSeedUtxo);
      const { txId, utxoIdx } = freeSeedUtxo.outputId;
      const { encodeBech32, blake2b, encodeBase32 } = Crypto;
      const uutMap = Object.fromEntries(
        uutPurposes.map((uutPurpose) => {
          const txoId = txId.bytes.concat([
            "@".charCodeAt(0),
            utxoIdx
          ]);
          return [
            uutPurpose,
            `${uutPurpose}.${bytesToHex(
              blake2b(txoId).slice(0, 6)
            )}`
          ];
        })
      );
      if (tcx.state.uuts)
        throw new Error(`uuts are already there`);
      tcx.state.uuts = uutMap;
      const vEntries = this.mkUutValuesEntries(uutMap);
      const { txId: seedTxn, utxoIdx: seedIndex } = freeSeedUtxo.outputId;
      return tcx.attachScript(this.compiledContract).mintTokens(
        this.mintingPolicyHash,
        vEntries,
        this.mintingUuts({
          seedTxn,
          seedIndex,
          purposes: uutPurposes
        }).redeemer
      );
    });
  }
  mkUutValuesEntries(uutMap) {
    return Object.entries(uutMap).map(([_purpose, assetName]) => {
      return this.mkValuesEntry(assetName, BigInt(1));
    });
  }
  //! overrides base getter type with undefined not being allowed
  get mintingPolicyHash() {
    return super.mintingPolicyHash;
  }
  mintingCharterToken({
    owner
  }) {
    const t = new this.configuredContract.types.Redeemer.mintingCharterToken(
      owner
    );
    return { redeemer: t._toUplcData() };
  }
  mintingUuts({
    seedTxn,
    seedIndex: sIdx,
    purposes
  }) {
    const seedIndex = BigInt(sIdx);
    console.log("UUT redeemer seedTxn", seedTxn.hex);
    const t = new this.configuredContract.types.Redeemer.mintingUuts(
      seedTxn,
      seedIndex,
      purposes
    );
    return { redeemer: t._toUplcData() };
  }
  get charterTokenAsValuesEntry() {
    return this.mkValuesEntry("charter", BigInt(1));
  }
  tvCharter() {
    const { mintingPolicyHash } = this;
    const v = new Value(
      this.ADA(1.7),
      new Assets([[mintingPolicyHash, [this.charterTokenAsValuesEntry]]])
    );
    return v;
  }
  get charterTokenAsValue() {
    console.warn(
      "deprecated use of `get minter.charterTokenAsValue`; use tvCharter() instead"
    );
    return this.tvCharter();
  }
  async txnMintingCharterToken(tcx, owner) {
    const tVal = this.charterTokenAsValuesEntry;
    return tcx.mintTokens(
      this.mintingPolicyHash,
      [tVal],
      this.mintingCharterToken({ owner }).redeemer
    ).attachScript(this.compiledContract);
  }
}
__decorateClass$3([
  Activity.partialTxn
], DefaultMinter.prototype, "txnCreatingUuts", 1);
__decorateClass$3([
  Activity.redeemer
], DefaultMinter.prototype, "mintingCharterToken", 1);
__decorateClass$3([
  Activity.redeemer
], DefaultMinter.prototype, "mintingUuts", 1);
__decorateClass$3([
  Activity.partialTxn
], DefaultMinter.prototype, "txnMintingCharterToken", 1);

class DelegateConfigNeeded extends Error {
  errors;
  constructor(message, errors) {
    super(message);
    if (errors)
      this.errors = errors;
  }
}
function variantMap(vm) {
  return vm;
}

var __defProp$2 = Object.defineProperty;
var __getOwnPropDesc$2 = Object.getOwnPropertyDescriptor;
var __decorateClass$2 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$2(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$2(target, key, result);
  return result;
};
class Capo extends StellarContract {
  get roles() {
    return {};
  }
  constructor(args) {
    super(args);
    const { Datum: Datum2, Redeemer } = this.configuredContract.types;
    const { CharterToken } = Datum2;
    const { updatingCharter, usingAuthority } = Redeemer;
    if (!CharterToken)
      throw new Error("Datum must have a 'CharterToken' variant");
    if (!updatingCharter)
      throw new Error("Redeemer must have a 'updatingCharter' variant");
    if (!usingAuthority)
      throw new Error("Redeemer must have a 'usingAuthority' variant");
  }
  // abstract txnMustUseCharterUtxo(
  //     tcx: StellarTxnContext,
  //     newDatum?: InlineDatum
  // ): Promise<TxInput | never>;
  get minterClass() {
    return DefaultMinter;
  }
  minter;
  txnCreatingUuts(tcx, uutPurposes) {
    return this.minter.txnCreatingUuts(tcx, uutPurposes);
  }
  uutsValue(x) {
    const uutMap = x instanceof StellarTxnContext ? x.state.uuts : x;
    const vEntries = this.minter.mkUutValuesEntries(uutMap);
    return new Value(
      void 0,
      new Assets([[this.mintingPolicyHash, vEntries]])
    );
  }
  usingAuthority() {
    const r = this.configuredContract.types.Redeemer;
    const { usingAuthority } = r;
    if (!usingAuthority) {
      throw new Error(
        `invalid contract without a usingAuthority redeemer`
      );
    }
    const t = new usingAuthority();
    return { redeemer: t._toUplcData() };
  }
  updatingCharter({
    trustees,
    minSigs
  }) {
    const t = new this.configuredContract.types.Redeemer.updatingCharter(
      trustees,
      minSigs
    );
    return { redeemer: t._toUplcData() };
  }
  tvCharter() {
    return this.minter.tvCharter();
  }
  get charterTokenAsValue() {
    console.warn(
      "deprecated get charterTokenAsValue; use tvCharter() instead"
    );
    return this.tvCharter();
  }
  async mkTxnMintCharterToken(datumArgs, tcx = new StellarTxnContext()) {
    console.log(
      `minting charter from seed ${this.paramsIn.seedTxn.hex.substring(
        0,
        12
      )}\u2026@${this.paramsIn.seedIndex}`
    );
    return this.mustGetContractSeedUtxo().then((seedUtxo) => {
      const v = this.tvCharter();
      const datum2 = this.mkDatumCharterToken(datumArgs);
      const outputs = [new TxOutput(this.address, v, datum2)];
      tcx.addInput(seedUtxo).addOutputs(outputs);
      return this.minter.txnMintingCharterToken(tcx, this.address);
    });
  }
  get charterTokenPredicate() {
    const predicate = this.mkTokenPredicate(this.tvCharter());
    return predicate;
  }
  //! forms a Value with minUtxo included
  tokenAsValue(tokenName, quantity = 1n) {
    const { mintingPolicyHash } = this;
    const e = this.mkValuesEntry(tokenName, quantity);
    const v = new Value(
      this.ADA(0),
      new Assets([[mintingPolicyHash, [e]]])
    );
    const t = new TxOutput(this.address, v);
    const minLovelace = t.calcMinLovelace(this.networkParams);
    v.setLovelace(minLovelace);
    return v;
  }
  async mustFindCharterUtxo() {
    const predicate = this.mkTokenPredicate(this.tvCharter());
    return this.mustFindMyUtxo("charter", predicate, "has it been minted?");
  }
  // non-activity partial
  async txnMustUseCharterUtxo(tcx, redeemerOrRefInput, newDatumOrForceRefScript) {
    return this.mustFindCharterUtxo().then((ctUtxo) => {
      if (true === redeemerOrRefInput) {
        if (newDatumOrForceRefScript && true !== newDatumOrForceRefScript)
          throw new Error(
            `when using reference input for charter, arg3 can only be true (or may be omitted)`
          );
        tcx.tx.addRefInput(
          ctUtxo,
          newDatumOrForceRefScript ? this.compiledContract : void 0
        );
      } else {
        const redeemer = redeemerOrRefInput;
        const newDatum = newDatumOrForceRefScript;
        if (true === newDatum)
          throw new Error(
            `wrong type for newDatum when not using reference input for charter`
          );
        tcx.addInput(ctUtxo, redeemer.redeemer).attachScript(
          this.compiledContract
        );
        const datum2 = newDatum || ctUtxo.origOutput.datum;
        this.txnKeepCharterToken(tcx, datum2);
      }
      return tcx;
    });
  }
  // non-activity partial
  async txnUpdateCharterUtxo(tcx, redeemer, newDatum) {
    return this.txnMustUseCharterUtxo(tcx, redeemer, newDatum);
  }
  // non-activity partial
  txnKeepCharterToken(tcx, datum2) {
    tcx.addOutput(new TxOutput(this.address, this.tvCharter(), datum2));
    return tcx;
  }
  async txnAddAuthority(tcx) {
    return this.txnMustUseCharterUtxo(tcx, this.usingAuthority());
  }
  //! it can provide minter-targeted params through getMinterParams()
  getMinterParams() {
    return this.paramsIn;
  }
  getCapoRev() {
    return 1n;
  }
  getContractParams(params) {
    const { mph } = this;
    const rev = this.getCapoRev();
    return {
      mph,
      rev
    };
  }
  get mph() {
    const minter = this.connectMintingScript(this.getMinterParams());
    return minter.mintingPolicyHash;
  }
  get mintingPolicyHash() {
    return this.mph;
  }
  connectMintingScript(params) {
    if (this.minter)
      return this.minter;
    const { minterClass } = this;
    this.paramsIn;
    const minter = this.addScriptWithParams(minterClass, params);
    const { mintingCharterToken, mintingUuts } = minter.configuredContract.types.Redeemer;
    if (!mintingCharterToken)
      throw new Error(
        `minting script doesn't offer required 'mintingCharterToken' activity-redeemer`
      );
    if (!mintingUuts)
      throw new Error(
        `minting script doesn't offer required 'mintingUuts' activity-redeemer`
      );
    return this.minter = minter;
  }
  async mustGetContractSeedUtxo() {
    //! given a Capo-based contract instance having a free TxInput to seed its validator address,
    //! prior to initial on-chain creation of contract,
    //! it finds that specific TxInput in the current user's wallet.
    const { seedTxn, seedIndex } = this.paramsIn;
    console.log(
      `seeking seed txn ${seedTxn.hex.substring(0, 12)}\u2026@${seedIndex}`
    );
    return this.mustFindActorUtxo(
      "seed",
      (u) => {
        const { txId, utxoIdx } = u;
        if (txId.eq(seedTxn) && BigInt(utxoIdx) == seedIndex) {
          return u;
        }
      },
      "already spent?"
    );
  }
  withDelegates(delegates) {
    const tcx = new StellarTxnContext();
    tcx.selectedDelegates = delegates;
    return tcx;
  }
  txnMustGetDelegate(tcx, roleName) {
    const { selectedDelegates: d } = tcx;
    let selected = d[roleName];
    if (!selected) {
      const role = this.roles[roleName];
      if (role.default) {
        selected = { strategyName: "default", addlParams: {} };
      }
    }
    if (!selected)
      throw new DelegateConfigNeeded(
        `no delegate for role ${roleName} found in transaction-context or default`
      );
    const { strategyName, addlParams } = selected;
    const { roles } = this;
    const selectedStrategy = roles[roleName][strategyName];
    const { delegateClass, validateScriptParams } = selectedStrategy;
    const { defaultParams } = delegateClass;
    const mergedParams = {
      ...defaultParams,
      ...selectedStrategy.scriptParams,
      ...addlParams
    };
    const errors = validateScriptParams(mergedParams);
    if (errors) {
      throw new DelegateConfigNeeded(
        "validation errors in contract params",
        errors
      );
    }
    try {
      const configured = this.addScriptWithParams(
        selectedStrategy.delegateClass,
        mergedParams
      );
      return configured;
    } catch (e) {
      const t = e.message.match(/invalid parameter name '([^']+)'$/);
      const [_, badParamName] = t || [];
      if (badParamName) {
        throw new DelegateConfigNeeded(
          "configuration error while parameterizing contract script",
          { [badParamName]: e.message }
        );
      }
      throw e;
    }
  }
  capoRequirements() {
    return {
      "is a base class for leader/Capo pattern": {
        purpose: "so that smart contract developers can easily start multi-script development",
        details: [
          "Instantiating a Capo contract always uses the seed-utxo pattern for uniqueness.",
          "Subclassing Capo with no type-params gives the default minter,",
          "  ... which only allows UUTs to be created",
          "Subclassing Capo<CustomMinter> gives an overloaded minter,",
          "  ... which must allow UUT minting and may allow more Activities too."
        ],
        mech: [
          "provides a default minter",
          "allows the minter class to be overridden"
        ]
      },
      "can create unique utility tokens": {
        purpose: "so the contract can use UUTs for scoped-authority semantics",
        details: [
          "Building a txn with a UUT involves using the txnCreatingUuts partial-helper on the Capo.",
          "That UUT (a Value) is returned, and then should be added to a TxOutput.",
          "Fills tcx.state.uuts with purpose-keyed unique token-names",
          "The partial-helper doesn't constrain the semantics of the UUT.",
          "The UUT uses the seed-utxo pattern to form 64 bits of uniqueness",
          "   ... so that token-names stay short-ish.",
          "The uniqueness level can be iterated in future as needed.",
          "The UUT's token-name combines its textual purpose with a short hash ",
          "   ... of the seed UTxO, formatted with bech32"
        ]
      },
      "supports the Delegation pattern using roles and strategy-variants": {
        purpose: "enables structured modularity and extensibility",
        details: [
          "A Capo constellation can declare a set of roles to be filled in the contract logic.",
          "The roles are typed, so that implementers of extensibility can know ",
          "  ... which capabilities their plugins need to provide",
          "Each role should be filled by a StellarContract class, ",
          "  ... which is required at the time it is needed during creation of a transaction.",
          "Each role should normally provide a base implementation ",
          "  ... of a delegate that can serve the role.",
          "Strategies, strategy-variants, or simple 'variants' are all similar ways ",
          "  ... of indicating different named plugins that can serve a particular role.",
          "Variant-names are human-readable, while the actual code",
          "  ... behind each variant name are the strategies"
        ],
        requires: [
          "supports well-typed role declarations and strategy-adding",
          "supports just-in-time strategy-selection",
          "can concretely resolve role delegates"
        ]
      },
      "supports well-typed role declarations and strategy-adding": {
        purpose: "for plugin implementers to have a clear picture of what to implement",
        details: [
          "Each Capo class may declare a roles data structure.",
          "GOAL: The required type for each role must be matched when adding a plugin class serving a role",
          "A dApp using a Capo class can add strategy variants by subclassing"
        ],
        mech: [
          "Capo EXPECTS a synchronous getter for 'roles' to be defined",
          "Capo provides a default 'roles' having no specific roles (or maybe just minter - TBD)",
          "Subclasses can define their own get roles(), return a role-map-to-variant-map structure"
        ],
        requires: [
          "role definitions use a RoleMap and nested VariantMap data structure"
        ]
      },
      "supports just-in-time strategy-selection using withDelegates() and txnMustGetDelegate()": {
        purpose: "enabling each transaction to select appropriate plugins for its contextual needs",
        details: [
          "When a transaction having an extensibility-point is being created,",
          "  ... it SHOULD require an explicit choice of the delegate to use in that role.",
          "When a mkTxnDoesThings method creates a new role-delegated UTxO, ",
          "  ... it sets essential configuration details for the delegation ",
          "  ... and it requires the transaction-context to have delegation details.",
          "The delegate contract, including its address and/or reference-script UTxO ",
          "  ... and/or its parameters and its StellarContract class, MUST be captured ",
          "  ... so that it can be easily resolved and used/referenced",
          "  .... during a later transaction whose UTxO-spending is governed by the delegate contract.",
          "When the delegate serving the role is selected, ",
          "  ... that delegate will be manifested as a concrete pair of StellarContract subclass ",
          "  ... and contract address.  The contract address MAY be pre-existing ",
          "  ... or be instantiated as a result of the delegation details."
        ],
        mech: [
          "withDelegates method starts a transaction with prepared delegate settings",
          "txnMustGetDelegate(tcx, role) method retrieves a configured delegate",
          "txnMustGetDelegate() will use a 'default' delegate",
          "If there is no delegate configured (or defaulted) for the needed role, txnMustGetDelegate throws a DelegateConfigNeeded error.",
          "If the strategy-configuration has any configuration problems, the DelegateConfigNeeded error contains an 'errors' object"
        ]
      },
      "Each role uses a RoleVariants structure which can accept new variants": {
        purpose: "provides a type-safe container for adding strategy-variants to a role",
        details: [
          "Adding a strategy variant requires a human-readable name for the variant",
          "  ... and a reference to the StellarContract class implementing that variant.",
          "Each variant may indicate a type for its configuration data-structure",
          "  ... and may include a factory function accepting a data-structure of that type.",
          "TBD: base configuration type?  Capo txn-builders supporting utxo-creation can provide baseline details of the base type, ",
          "  ... with additional strategy-specific details provided in the transaction-context.",
          "When adding strategies, existing variants cannot be removed or replaced."
        ],
        mech: [
          "RoleVariants has type-parameters indicating the baseline types & interfaces for delegates in that role",
          "TODO: variants can augment the definedRoles object without removing or replacing any existing variant"
        ],
        requires: [
          "provides a Strategy type for binding a contract to a strategy-variant name"
        ]
      },
      "provides a Strategy type for binding a contract to a strategy-variant name": {
        purpose: "has all the strategy-specific bindings between a variant and the contract delegate",
        details: [
          "When adding a contract as a delegate serving in a role, its name",
          "  ... and its Strategy binding creates the connection between the host contract (suite) ",
          "  ... and the StellarContract subclass implementing the details of the strategy.",
          "The Strategy and its underlying contract are type-matched",
          "  ... with the interface needed by the Role.",
          "The Strategy is a well-typed structure supporting ",
          "  ... any strategy-specific configuration details (script parameters)",
          "  ... and validation of script parameters"
        ],
        mech: [
          "Each strategy must reference a type-matched implementation class",
          "Each strategy may define scriptParams always used for that strategy",
          "Each strategy may defer the definition of other script-params to be defined when a specific delegation relationship is being created",
          "Each strategy must define a validateScriptParams(allScriptParams) function, returning an errors object if there are problems",
          "validateScriptParams() should return undefined if there are no problems"
        ],
        requires: [
          "supports concrete resolution of role delegates"
        ]
      },
      "supports concrete resolution of existing role delegates": {
        purpose: "so that transactions involving delegated responsibilities can be executed",
        details: [
          "When a transaction needs to involve a UTxO governed by a delegate contract",
          "   ... the need for that delegate contract is signalled through Capo callbacks ",
          "   ... during the transaction-building process.",
          "Those callbacks contain key information, such as role-name, parameters, and address",
          "  ... needed in the collaboration to find the correct concrete delegate.",
          "Once the delegate is resolved to a configured StellarContract class, ",
          "   ... its established transaction-building interface is triggered, ",
          "   ... augmenting the transaction with the correct details, ",
          "   ... and enabling the right on-chain behaviors / verifications",
          "The Strategy adapter is expected to return the proper delegate with its matching address."
        ],
        mech: [
          "TODO: with an existing delegate, the selected strategy class MUST exactly match the known delegate-address"
        ]
      }
    };
  }
}
__decorateClass$2([
  Activity.partialTxn
], Capo.prototype, "txnCreatingUuts", 1);
__decorateClass$2([
  Activity.redeemer
], Capo.prototype, "usingAuthority", 1);
__decorateClass$2([
  Activity.redeemer
], Capo.prototype, "updatingCharter", 1);
__decorateClass$2([
  txn
], Capo.prototype, "mkTxnMintCharterToken", 1);
__decorateClass$2([
  partialTxn
], Capo.prototype, "txnMustUseCharterUtxo", 1);
__decorateClass$2([
  partialTxn
], Capo.prototype, "txnUpdateCharterUtxo", 1);
__decorateClass$2([
  partialTxn
], Capo.prototype, "txnKeepCharterToken", 1);
__decorateClass$2([
  partialTxn
], Capo.prototype, "txnAddAuthority", 1);

helios.config.set({ EXPERIMENTAL_CEK: true });
const preProdParams = JSON.parse(
  await promises.readFile("./src/preprod.json", "utf8")
);
async function addTestContext(context, TestHelperClass, params) {
  console.log(" ======== ========= ======== +test context");
  Object.defineProperty(context, "strella", {
    get: function() {
      return this.h.strella;
    }
  });
  context.initHelper = async (params2) => {
    const helper = new TestHelperClass(params2);
    if (context.h) {
      if (!params2.skipSetup)
        throw new Error(
          `re-initializing shouldn't be necessary without skipSetup`
        );
      console.log(
        "   ............. reinitializing test helper without setup"
      );
    }
    context.h = helper;
    return helper;
  };
  try {
    await context.initHelper(params);
  } catch (e) {
    if (!params) {
      console.error(
        `${TestHelperClass.name}: error during initialization; does this test helper require initialization with explicit params?`
      );
      throw e;
    } else {
      console.error("urgh");
      throw e;
    }
  }
}
class StellarTestHelper {
  state;
  params;
  defaultActor;
  strella;
  actors;
  optimize = false;
  liveSlotParams;
  networkParams;
  network;
  actorName;
  //@ts-ignore type mismatch in getter/setter until ts v5
  get currentActor() {
    return this.actors[this.actorName];
  }
  set currentActor(actorName) {
    const thisActor = this.actors[actorName];
    if (!thisActor)
      throw new Error(
        `setCurrentActor: invalid actor name '${actorName}'`
      );
    if (this.strella)
      this.strella.myActor = thisActor;
    this.actorName = actorName;
  }
  address;
  setupPending;
  setupActors() {
    console.warn(
      `using 'hiro' as default actor because ${this.constructor.name} doesn't define setupActors()`
    );
    this.addActor("hiro", 1863n * ADA);
    this.currentActor = "hiro";
  }
  constructor(params) {
    this.state = {};
    if (params)
      this.params = params;
    const [theNetwork, emuParams] = this.mkNetwork();
    this.liveSlotParams = emuParams;
    this.network = theNetwork;
    this.networkParams = new NetworkParams(preProdParams);
    this.actors = {};
    this.actorName = "";
    this.setupActors();
    if (!this.actorName)
      throw new Error(
        `${this.constructor.name} doesn't set currentActor in setupActors()`
      );
    const now = /* @__PURE__ */ new Date();
    this.waitUntil(now);
    if (params?.skipSetup) {
      console.log("test helper skipping setup");
      return;
    }
    this.setupPending = this.setup(params).then((p) => {
      return p;
    });
  }
  async setup(params) {
    const { randomSeed, ...p } = params;
    if (this.setupPending)
      await this.setupPending;
    if (this.strella && this.randomSeed == randomSeed) {
      console.log(
        "       ----- skipped duplicate setup() in test helper"
      );
      return this.strella;
    }
    if (this.strella) {
      console.warn(
        ".... warning: new test helper setup with new seed...."
      );
      this.rand = void 0;
      this.randomSeed = randomSeed;
    }
    return this.initStellarClass();
  }
  initStellarClass() {
    const TargetClass = this.stellarClass;
    const strella = this.initStrella(TargetClass, this.params);
    this.strella = strella;
    this.address = strella.address;
    return strella;
  }
  initStrella(TargetClass, params) {
    return new TargetClass({
      params,
      network: this.network,
      myActor: this.currentActor,
      networkParams: this.networkParams,
      isTest: true
    });
  }
  //! it has a seed for mkRandomBytes, which must be set by caller
  randomSeed;
  //! it makes a rand() function based on the randomSeed after first call to mkRandomBytes
  rand;
  delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }
  async mkSeedUtxo(seedIndex = 0n) {
    const { currentActor } = this;
    const { network } = this;
    const tx = new Tx();
    const actorMoney = await currentActor.utxos;
    console.log(
      `${this.actorName} has money: 
` + utxosAsString(actorMoney)
    );
    tx.addInput(
      await findInputsInWallets(
        new helios.Value(30n * ADA),
        { wallets: [currentActor] },
        network
      )
    );
    tx.addOutput(new TxOutput(currentActor.address, new Value(10n * ADA)));
    tx.addOutput(new TxOutput(currentActor.address, new Value(10n * ADA)));
    let si = 2;
    for (; si < seedIndex; si++) {
      tx.addOutput(
        new TxOutput(currentActor.address, new Value(10n * ADA))
      );
    }
    const txId = await this.submitTx(tx, "force");
    return txId;
  }
  async submitTx(tx, force) {
    const sendChangeToCurrentActor = this.currentActor.address;
    const isAlreadyInitialized = !!this.strella;
    try {
      await tx.finalize(this.networkParams, sendChangeToCurrentActor);
    } catch (e) {
      throw new Error(
        e.message + "\nin tx: " + txAsString(tx) + "\nprofile: " + tx.profileReport
      );
    }
    if (isAlreadyInitialized && !force) {
      throw new Error(
        `helper is already initialized; use the submitTx from the testing-context's 'strella' object instead`
      );
    }
    console.log(
      `Test helper ${force || ""} submitting tx${force && "" || " prior to instantiateWithParams()"}:
` + txAsString(tx)
      // new Error(`at stack`).stack
    );
    try {
      const txId = await this.network.submitTx(tx);
      console.log("test helper submitted direct txn:" + txAsString(tx));
      this.network.tick(1n);
      return txId;
    } catch (e) {
      console.error(`submit failed: ${e.message}
  ... in tx ${txAsString(tx)}`);
      throw e;
    }
  }
  mkRandomBytes(length) {
    if (!this.randomSeed)
      throw new Error(
        `test must set context.randomSeed for deterministic randomness in tests`
      );
    if (!this.rand)
      this.rand = Crypto.rand(this.randomSeed);
    const bytes = [];
    for (let i = 0; i < length; i++) {
      bytes.push(Math.floor(this.rand() * 256));
    }
    return bytes;
  }
  addActor(roleName, walletBalance) {
    if (this.actors[roleName])
      throw new Error(`duplicate role name '${roleName}'`);
    //! it instantiates a wallet with the indicated balance pre-set
    const a = this.network.createWallet(walletBalance);
    console.log(
      `+\u{1F3AD} Actor: ${roleName}: ${a.address.toBech32().substring(0, 18)}\u2026 ${lovelaceToAda(
        walletBalance
      )} (\u{1F511}#${a.address.pubKeyHash.hex.substring(0, 8)}\u2026)`
    );
    //! it makes collateral for each actor, above and beyond the initial balance,
    this.network.tick(BigInt(2));
    this.network.createUtxo(a, 5n * ADA);
    this.network.tick(BigInt(1));
    this.actors[roleName] = a;
    return a;
  }
  mkNetwork() {
    const theNetwork = new NetworkEmulator();
    const emuParams = theNetwork.initNetworkParams({
      ...preProdParams,
      raw: { ...preProdParams }
    });
    emuParams.timeToSlot = function(t) {
      const seconds = BigInt(t / 1000n);
      return seconds;
    };
    emuParams.slotToTimestamp = this.slotToTimestamp;
    return [theNetwork, emuParams];
  }
  slotToTimestamp(s) {
    const num = parseInt(BigInt.asIntN(52, s * 1000n).toString());
    return new Date(num);
  }
  currentSlot() {
    return this.liveSlotParams.liveSlot;
  }
  waitUntil(time) {
    const targetTimeMillis = BigInt(time.getTime());
    const targetSlot = this.liveSlotParams.timeToSlot(targetTimeMillis);
    const c = this.currentSlot();
    const slotsToWait = targetSlot - c;
    if (slotsToWait < 1) {
      throw new Error(`the indicated time is not in the future`);
    }
    this.network.tick(slotsToWait);
    return slotsToWait;
  }
}
class StellarCapoTestHelper extends StellarTestHelper {
  async setup({
    randomSeed = 42,
    seedTxn,
    seedIndex = 0n
  } = {}) {
    if (this.setupPending)
      await this.setupPending;
    if (this.strella && this.randomSeed == randomSeed) {
      console.log(
        "       ----- skipped duplicate setup() in test helper"
      );
      return this.strella;
    }
    if (this.strella)
      console.warn(
        ".... warning: new test helper setup with new seed...."
      );
    this.randomSeed = randomSeed;
    if (!seedTxn) {
      seedTxn = await this.mkSeedUtxo(seedIndex);
    }
    const strella = this.initStrella(this.stellarClass, {
      seedTxn,
      seedIndex
    });
    this.strella = strella;
    const { address, mintingPolicyHash: mph } = strella;
    const { name } = strella.configuredContract;
    console.log(
      name,
      address.toBech32().substring(0, 18) + "\u2026",
      "vHash \u{1F4DC} " + strella.compiledContract.validatorHash.hex.substring(0, 12) + "\u2026",
      "mph \u{1F3E6} " + mph?.hex.substring(0, 12) + "\u2026"
    );
    return strella;
  }
  async mintCharterToken(args) {
    const { tina, tom, tracy } = this.actors;
    if (this.state.mintedCharterToken) {
      console.warn(
        "reusing minted charter from existing testing-context"
      );
      return this.state.mintedCharterToken;
    }
    await this.setup();
    const script = this.strella;
    args = args || {
      trustees: [tina.address, tom.address, tracy.address],
      minSigs: 2
    };
    const tcx = await script.mkTxnMintCharterToken(args);
    expect(script.network).toBe(this.network);
    await script.submit(tcx);
    console.log("charter token minted");
    this.network.tick(1n);
    return this.state.mintedCharterToken = tcx;
  }
}
const ADA = 1000000n;

var contract$1 = "spending SampleTreasury\n\n// needed in helios 0.13: defaults\nconst mph : MintingPolicyHash = MintingPolicyHash::new(#1234)\nconst rev : Int = 1\n\nenum Datum {\n    CharterToken {\n        trustees: []Address\n        minSigs: Int\n    }\n}\n\nenum Redeemer {\n    updatingCharter{\n        trustees: []Address\n        minSigs: Int\n    }\n    usingAuthority\n}\n\nfunc didSign(ctx : ScriptContext, a: Address) -> Bool {\n    tx : Tx = ctx.tx;\n\n    pkh : PubKeyHash = a.credential.switch{\n        PubKey{h} => h,\n        _ => error(\"trustee can't be a contract\")\n    };\n    // print(\"checking if trustee signed: \" + pkh.show());\n\n    tx.is_signed_by(pkh)\n}\nfunc didSignInCtx(ctx: ScriptContext) -> (a: Address) -> Bool {\n    (a : Address) -> Bool {\n        didSign(ctx, a)\n    }\n}\n\nfunc requiresAuthorization(ctx: ScriptContext, datum: Datum) -> Bool {\n    Datum::CharterToken{trustees, minSigs} = datum;\n\n    foundSigs: Int = trustees.fold[Int](\n        (count: Int, a: Address) -> Int {            \n            count + if (didSign(ctx, a)) {1} else {0}\n        }, 0\n    );\n    assert(foundSigs >= minSigs, \n        \"not enough trustees (\"+foundSigs.show()+ \" of \" + minSigs.show() + \" needed) have signed the tx\" \n    );\n\n    true\n}\n\nfunc getCharterOutput(tx: Tx) -> TxOutput {\n    charterTokenValue : Value = Value::new(\n        AssetClass::new(mph, \"charter\".encode_utf8()), \n        1\n    );\n    tx.outputs.find_safe(\n        (txo : TxOutput) -> Bool {\n            txo.value >= charterTokenValue\n        }\n    ).switch{\n        None => error(\"this could only happen if the charter token is burned.\"),\n        Some{o} => o\n    }\n}\n\nfunc preventCharterChange(ctx: ScriptContext, datum: Datum) -> Bool {\n    tx: Tx = ctx.tx;\n\n    charterOutput : TxOutput = getCharterOutput(tx);\n\n    cvh : ValidatorHash = ctx.get_current_validator_hash();\n    myself : Credential = Credential::new_validator(cvh);\n    if (charterOutput.address.credential != myself) {\n        actual : String = charterOutput.address.credential.switch{\n            PubKey{pkh} => \"pkh:🔑#\" + pkh.show(),\n            Validator{vh} => \"val:📜#:\" + vh.show()\n        };\n        error(\n            \"charter token must be returned to the contract \" + cvh.show() +\n            \"... but was sent to \" +actual\n        )\n    };\n\n    Datum::CharterToken{trustees, minSigs} = datum;\n    Datum::CharterToken{newTrustees, newMinSigs} = Datum::from_data( \n        charterOutput.datum.get_inline_data() \n    );\n    if ( !(\n        newTrustees == trustees &&\n        newMinSigs == minSigs\n    )) { \n        error(\"invalid update to charter settings\") \n    };\n\n    true\n}\nfunc requiresValidMinSigs(datum: Datum) -> Bool {\n    Datum::CharterToken{trustees, minSigs} = datum;\n\n    assert(\n        minSigs <= trustees.length,\n        \"minSigs can't be more than the size of the trustee-list\"\n    );\n\n    true\n}\n\nfunc requiresProofOfNewTrustees(\n    ctx: ScriptContext,\n    datum: Datum\n) -> Bool {\n    Datum::CharterToken{newTrustees, _} = datum;\n\n    assert(\n        newTrustees.all(didSignInCtx(ctx)), \n        \"all the new trustees must sign\"\n    );\n\n    requiresValidMinSigs(datum)\n}\n\n\nfunc main(datum: Datum, redeemer: Redeemer, ctx: ScriptContext) -> Bool {\n    tx: Tx = ctx.tx;\n    // now: Time = tx.time_range.start;\n    \n    notUpdatingCharter : Bool = redeemer.switch {\n        updatingCharter => false,  \n        _ => true\n    };\n    charterChangeAllowable : Bool = if(notUpdatingCharter) { \n        preventCharterChange(ctx, datum) // throws if it's not kosher\n     } else { \n        true // \"maybe\", really\n    };\n\n    redeemerSpecificChecks : Bool = redeemer.switch {\n        updatingCharter{trustees, minSigs} => { \n            //! guards from optimizing mph out of the program, screwing up parameterization\n            assert(mph.serialize() != datum.serialize(), \"guard failed\"); // can't fail.\n            assert(trustees.serialize() == trustees.serialize(), \"guard failed\"); // can't fail.\n            assert(minSigs.serialize() == minSigs.serialize(), \"guard failed\"); // can't fail.\n            \n            charterOutput : TxOutput = getCharterOutput(tx);\n            newDatum = Datum::from_data( \n                charterOutput.datum.get_inline_data() \n            );\n            \n            requiresAuthorization(ctx, datum) &&\n            requiresProofOfNewTrustees(ctx, newDatum)\n        },\n        // authorizeByCharter{otherRedeemerData, otherSignatures} => {            \n        //     false // todo support authorizing **other** things to be done with this token\n        // },\n        usingAuthority => {\n            assert(mph.serialize() != datum.serialize(), \"guard failed\"); // can't fail.\n\n            notUpdatingCharter &&\n            requiresAuthorization(ctx, datum)\n        }\n    };\n\n    charterChangeAllowable &&\n    redeemerSpecificChecks &&\n    tx.serialize() != datum.serialize()\n}\n\nconst charterTokenBaseInfo: Datum::CharterToken = Datum::CharterToken{\n    trustees: []Address{},\n    minSigs: 1\n}\n\n// const mkCharterTokenDatum : (trustees: []Address, minSigs: Int) -> Datum::CharterSeed = (trustees: []Address, minSigs: Int) -> Datum::CharterSeed {\n//      Datum::CharterToken{\n//         nce: nce(),\n//         trustees: trustees,\n//         minSigs: minSigs\n//     }\n// }\n";

var contract = "spending SampleMintDelegate\n\nconst rev: Int = 1\n\nfunc main(_,_,_) -> Bool {\n    true\n}\n\n// func main(d: Datum, r: Redeemer, ctx: ScriptContext) -> Bool {\n//     true\n// }";

var __defProp$1 = Object.defineProperty;
var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
var __decorateClass$1 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$1(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$1(target, key, result);
  return result;
};
//!!! TODO: include adapter(s) for Datum, which has the same essential shape
class SampleMintDelegate extends StellarContract {
  static currentRev = 1n;
  static get defaultParams() {
    return { rev: this.currentRev };
  }
  contractSource() {
    return contract;
  }
  // @Activity.redeemer
  x(tokenName) {
    const t = new this.configuredContract.types.Redeemer.commissioningNewToken(
      tokenName
    );
    return { redeemer: t._toUplcData() };
  }
  async txnCreatingTokenPolicy(tcx, tokenName) {
    return tcx;
  }
  servesDelegationRole(role) {
    if ("mintingPolicy" == role)
      return true;
  }
  static mkDelegateWithArgs(a) {
  }
}
__decorateClass$1([
  Activity.partialTxn
], SampleMintDelegate.prototype, "txnCreatingTokenPolicy", 1);

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp(target, key, result);
  return result;
};
class SampleTreasury extends Capo {
  contractSource() {
    return contract$1;
  }
  get roles() {
    return {
      noDefault: variantMap({}),
      mintDelegate: variantMap({
        default: {
          delegateClass: SampleMintDelegate,
          scriptParams: {},
          validateScriptParams(args) {
            if (args.bad) {
              return { bad: ["must not be provided"] };
            }
            return void 0;
          }
        }
      })
    };
  }
  mkDatumCharterToken({
    trustees,
    minSigs
  }) {
    //!!! todo: make it possible to type these datum helpers more strongly
    const t = new this.configuredContract.types.Datum.CharterToken(
      trustees,
      minSigs
    );
    return Datum.inline(t._toUplcData());
  }
  async mkTxnMintCharterToken({ trustees, minSigs }, tcx = new StellarTxnContext()) {
    console.log(`minting charter from seed ${this.paramsIn.seedTxn.hex.substring(0, 12)}\u2026@${this.paramsIn.seedIndex}`);
    return this.mustGetContractSeedUtxo().then((seedUtxo) => {
      const datum2 = this.mkDatumCharterToken({
        trustees,
        minSigs: BigInt(minSigs)
      });
      const outputs = [new TxOutput(this.address, this.tvCharter(), datum2)];
      tcx.addInput(seedUtxo).addOutputs(outputs);
      return this.minter.txnMintingCharterToken(tcx, this.address);
    });
  }
  async mkTxnUpdateCharter(trustees, minSigs, tcx = new StellarTxnContext()) {
    return this.txnUpdateCharterUtxo(
      tcx,
      this.updatingCharter({ trustees, minSigs }),
      this.mkDatumCharterToken({ trustees, minSigs })
    );
  }
  requirements() {
    return {
      "positively governs all administrative actions": {
        purpose: "to maintain clear control by a trustee group",
        details: [
          // descriptive details of the requirement (not the tech):
          "a trustee group is defined during contract creation",
          "the trustee list's signatures provide consent",
          "the trustee group can evolve by consent of the trustee group",
          "a threshold set of the trustee group can give consent for the whole group"
        ],
        mech: [
          // descriptive details of the chosen mechanisms for implementing the reqts:
          "uses a 'charter' token specialized for this contract",
          "the charter token has a trustee list in its Datum structure",
          "the charter token has a threshold setting in its Datum structure",
          "the charter Datum is updated when needed to reflect new trustees/thresholds"
        ],
        requires: [
          "has a unique, permanent charter token",
          "has a unique, permanent treasury address",
          "the trustee threshold is enforced on all administrative actions",
          "the trustee group can be changed",
          "the charter token is always kept in the contract",
          "can mint other tokens, on the authority of the Charter token"
        ]
      },
      "has a singleton minting policy": {
        purpose: "to mint various tokens authorized by the treasury",
        details: [
          "A chosen minting script is bound deterministically to the contract constellation",
          "Its inaugural (aka 'initial Charter' or 'Charter Mint') transaction creates a charter token",
          "The minting script can issue further tokens approved by Treasury Trustees",
          "The minting script does not need to concern itself with details of Treasury Trustee approval"
        ],
        mech: [
          "has an initial UTxO chosen arbitrarily, and that UTxO is consumed during initial Charter",
          "makes a different address depending on (txId, outputIndex) parameters of the Minting script"
        ],
        requires: []
      },
      "has a unique, permanent treasury address": {
        purpose: "to give continuity for its stakeholders",
        details: [
          "One-time creation is ensured by UTxO's unique-spendability property",
          "Determinism is transferred from the charter utxo to the MPH and to the treasury address"
        ],
        mech: [
          "uses the Minting Policy Hash as the sole parameter for the treasury spending script"
        ],
        requires: ["has a singleton minting policy"]
      },
      "has a unique, permanent charter token": {
        purpose: "to guarantee permanent identity of a token constraining administrative actions",
        details: [
          "a charter token is uniquely created when bootstrapping the constellation contract",
          "the charter token can't ever be recreated (it's non-fungible and can't be re-minted)",
          "the treasury address, minting policy hash, and charter token are all deterministic based on input utxo"
        ],
        impl: "txMintCharterToken()",
        mech: [
          "creates a unique 'charter' token, with assetId determined from minting-policy-hash+'charter'",
          "TODO: fails if minSigs is longer than trustee list",
          "doesn't work with a different spent utxo"
        ],
        requires: [
          "has a singleton minting policy",
          "the charter token is always kept in the contract"
        ]
      },
      "the charter token is always kept in the contract": {
        purpose: "so that the treasury contract is always in control of administrative changes",
        details: [
          "The charter token's spendability' is used as a signal of administrative authority for transactions wanting proof of authority",
          "... thus, other scripts don't need to express any of the authority policy, but can simply verify the token's presence in the txn",
          "It shouldn't ever be possible to interfere with its spendability, e.g. by bundling it in an inconvenient way with other assets",
          "By enforcing that the charter token is always returned to the contract, ",
          "... it has assurance of continuing ability to govern the next activity using that token",
          "Note: the charter mint can bind with any contract having suitable assurances, ",
          "... but we only focus on the case of binding to this treasury contract"
        ],
        mech: [
          "builds transactions with the charter token returned to the contract",
          "fails to spend the charter token if it's not returned to the contract",
          "TODO: keeps the charter token separate from other assets in the contract"
        ],
        requires: []
      },
      "XXX can mint other tokens, on the authority of the charter token": {
        purpose: "to simplify the logic of minting, while being sure of minting authority",
        details: [
          "the minting policy doesn't have to directly enforce the trustee-list policy",
          "instead, it delegates that to the treasury spending script, ",
          "... and simply requires that the charter token is used for minting anything else"
        ],
        mech: [
          "can build transactions that mint non-'charter' tokens",
          "requires the charter-token to be spent as proof of authority",
          "fails if the charter-token is not returned to the treasury",
          "fails if the charter-token parameters are modified"
        ]
      },
      "the trustee group can be changed": {
        purpose: "to ensure administrative continuity for the group",
        details: [
          "When the needed threshold for administrative modifications is achieved, the Charter Datum can be updated",
          "This type of administrative action should be explicit and separate from any other administrative activity",
          "If the CharterToken's Datum is being changed, no other redeemer activities are allowed"
        ],
        mech: [
          "requires the existing threshold of existing trustees to be met",
          "requires all of the new trustees to sign the transaction",
          "does not allow minSigs to exceed the number of trustees"
        ],
        requires: [
          "the trustee threshold is enforced on all administrative actions"
        ]
      },
      "the trustee threshold is enforced on all administrative actions": {
        purpose: "allows progress in case a small fraction of trustees may not be available",
        details: [
          "A group can indicate how many of the trustees are required to provide their explicit approval",
          "If a small number of trustees lose their keys, this allows the remaining trustees to directly regroup",
          "For example, they can replace the trustee list with a new set of trustees and a new approval threshold",
          "Normal day-to-day administrative activities can also be conducted while a small number of trustees are on vacation or otherwise temporarily unavailable"
        ],
        mech: [
          "doesn't allow the charterToken to be sent without enough minSigs from the trustee list"
        ],
        requires: []
      },
      foo: {
        purpose: "",
        details: [],
        mech: [],
        requires: []
      }
    };
  }
}
__decorateClass([
  datum
], SampleTreasury.prototype, "mkDatumCharterToken", 1);
__decorateClass([
  txn
], SampleTreasury.prototype, "mkTxnMintCharterToken", 1);
__decorateClass([
  txn
], SampleTreasury.prototype, "mkTxnUpdateCharter", 1);

export { ADA, Activity, Capo, DefaultMinter, SampleTreasury, StellarCapoTestHelper, StellarContract, StellarTestHelper, StellarTxnContext, addTestContext, assetsAsString, datum, heliosRollupLoader, lovelaceToAda, partialTxn, txAsString, txInputAsString, txOutputAsString, txn, utxoAsString, utxosAsString, valueAsString, variantMap };
//# sourceMappingURL=stellar-contracts.mjs.map
