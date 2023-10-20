import { expect } from 'vitest';
import * as helios from '@hyperionbt/helios';
import { Address, Tx, Value, TxOutput, MintingPolicyHash, AssetClass, TxInput, Assets, Program, NetworkParams, Crypto, NetworkEmulator } from '@hyperionbt/helios';

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
        return `\u{1F58A}\uFE0F ${Address.fromHash(s.pubKeyHash).toBech32().substring(0, 24)}\u2026`;
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
//!!! todo: type configuredStellarClass = class -> networkStuff -> withParams = stellar instance.
class StellarContract {
  //! it has scriptProgram: a parameterized instance of the contract
  //  ... with specific `parameters` assigned.
  scriptProgram;
  configIn;
  contractParams;
  setup;
  network;
  networkParams;
  myActor;
  // isTest?: boolean
  static get defaultParams() {
    return {};
  }
  //! can transform input configuration to contract script params
  //! by default, all the config keys are used as script params
  getContractScriptParams(config) {
    return config;
  }
  constructor(args) {
    const { setup, config, partialConfig, onInstanceCreated } = args;
    this.setup = setup;
    const { network, networkParams, isTest, myActor } = setup;
    if (config) {
      this.configIn = config;
    } else if (!args.onInstanceCreated) {
      throw new Error(`first time setup for ${this.constructor.name} missing config.onInstanceCreated() callback`);
    }
    this.network = network;
    this.networkParams = networkParams;
    if (myActor)
      this.myActor = myActor;
    const fullScriptParams = this.contractParams = this.getContractScriptParams(config);
    this.scriptProgram = this.loadProgramScript(fullScriptParams);
  }
  compiledScript;
  // initialized in loadProgramScript
  get datumType() {
    return this.scriptProgram?.types.Datum;
  }
  /**
   * @internal
   **/
  _purpose;
  get purpose() {
    if (this._purpose)
      return this._purpose;
    const purpose = this.scriptProgram?.purpose;
    if (!purpose)
      return "non-script";
    return this._purpose = purpose;
  }
  get address() {
    return Address.fromHashes(this.compiledScript.validatorHash);
  }
  get mintingPolicyHash() {
    if ("minting" != this.purpose)
      return void 0;
    return this.compiledScript.mintingPolicyHash;
  }
  get identity() {
    if ("minting" == this.purpose) {
      const b32 = this.compiledScript.mintingPolicyHash.toBech32();
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
      return u.origOutput.datum?.hash.hex == datum2.hash.hex;
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
      config: params,
      setup: this.setup
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
    const thisDatumType = this.scriptProgram.mainArgTypes.find(
      (x) => "Datum" == x.name
    ).typeMembers[datumName];
    if (!thisDatumType)
      throw new Error(`invalid datumName ${datumName}`);
    if (!datum2.isInline())
      throw new Error(
        `datum must be an InlineDatum to be readable using readDatum()`
      );
    return this.readUplcDatum(
      thisDatumType,
      datum2.data
    );
  }
  async readUplcStructList(uplcType, uplcData) {
    const { fieldNames, instanceMembers } = uplcType;
    if (uplcType.fieldNames?.length == 1) {
      throw new Error(`todo: support for single-field nested structs?`);
    }
    const nestedFieldList = uplcData.list;
    return Object.fromEntries(
      await Promise.all(
        fieldNames.map(async (fn, i) => {
          const fieldData = nestedFieldList[i];
          const fieldType = instanceMembers[fn];
          const value = await this.readUplcField(
            fn,
            fieldType,
            fieldData
          );
          return [fn, value];
        })
      )
    );
  }
  async readUplcDatum(uplcType, uplcData) {
    const { fieldNames, instanceMembers } = uplcType;
    return Object.fromEntries(
      await Promise.all(
        fieldNames.map(async (fn, i) => {
          let current;
          const uplcDataField = uplcData.fields[i];
          const fieldType = instanceMembers[fn];
          current = await this.readUplcField(
            fn,
            fieldType,
            uplcDataField
          );
          return [fn, current];
        })
      )
    );
  }
  async readUplcField(fn, fieldType, uplcDataField) {
    let value;
    const { offChainType } = fieldType;
    const internalType = fieldType.typeDetails.internalType.type;
    if ("Struct" == internalType) {
      value = await this.readUplcStructList(fieldType, uplcDataField);
      return value;
    }
    try {
      value = fieldType.uplcToJs(uplcDataField);
      if (value.then)
        value = await value;
      if ("Enum" === internalType && 0 === uplcDataField.fields.length) {
        value = Object.keys(value)[0];
      }
    } catch (e) {
      if (e.message?.match(/doesn't support converting from Uplc/)) {
        try {
          value = await offChainType.fromUplcData(uplcDataField);
          if ("some" in value)
            value = value.some;
        } catch (e2) {
          console.error(`datum: field ${fn}: ${e2.message}`);
          debugger;
          throw e2;
        }
      } else {
        throw e;
      }
    }
    return value;
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
  mkAssetValue(tokenId, count = 1) {
    const assets = [[tokenId, count]];
    const v = new Value(void 0, assets);
    return v;
  }
  mkTokenPredicate(specifier, quantOrTokenName, quantity) {
    let v;
    let mph;
    let tokenName;
    //!!! todo: support (AssetClass, quantity) input form
    if (!specifier)
      throw new Error(
        `missing required Value or MintingPolicyHash in arg1`
      );
    const predicate = _tokenPredicate.bind(this);
    const isValue = specifier instanceof Value;
    if (isValue) {
      v = predicate.value = specifier;
      return predicate;
    } else if (specifier instanceof MintingPolicyHash) {
      mph = specifier;
      if ("string" !== typeof quantOrTokenName)
        throw new Error(
          `with minting policy hash, token-name must be a string (or ByteArray support is TODO)`
        );
      tokenName = quantOrTokenName;
      quantity = quantity || 1n;
      v = predicate.value = this.tokenAsValue(tokenName, quantity, mph);
      return predicate;
    } else if (specifier instanceof AssetClass) {
      mph = specifier.mintingPolicyHash;
      if (!quantOrTokenName)
        quantOrTokenName = 1n;
      if ("bigint" !== typeof quantOrTokenName)
        throw new Error(
          `with AssetClass, the second arg must be a bigint like 3n, or omitted`
        );
      quantity = quantOrTokenName;
      v = predicate.value = new Value(0n, [[specifier, quantity]]);
      return predicate;
    } else {
      throw new Error(
        `wrong token specifier (need Value, MPH+tokenName, or AssetClass`
      );
    }
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
    throw new Error(
      `deprecated tokenAsValue on StellarContract base class (Capo has mph, not so much any StellarContract`
    );
  }
  hasOnlyAda(value, tcx, u) {
    const toSortInfo = this._mkUtxoSortInfo(value.lovelace);
    const found = [u].map(toSortInfo).filter(this._utxoIsSufficient).filter(this._utxoIsPureADA).map(this._infoBackToUtxo).at(0);
    return found;
  }
  /**
   * @internal
   **/
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
  /**
   * @internal
   **/
  _utxoIsSufficient({ sufficient }) {
    return !!sufficient;
  }
  /**
   * @internal
   **/
  _utxoIsPureADA({ u }) {
    return u.value.assets.isZero() ? u : void 0;
  }
  /*
   * @internal
   **/
  _infoBackToUtxo({ u }) {
    return u;
  }
  /**
   * @internal
   **/
  _mkUtxoSortInfo(min, max) {
    return (u) => {
      const minAdaAmount = u.value.assets.isZero() ? BigInt(0) : u.origOutput.calcMinLovelace(this.networkParams);
      const free = u.value.lovelace - minAdaAmount;
      const sufficient = free > min && (max ? free < max : true);
      const t = { u, sufficient, free, minAdaAmount };
      return t;
    };
  }
  /**
   * @internal
   **/
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
  importModules() {
    return [];
  }
  loadProgramScript(params) {
    const src = this.contractSource();
    const modules = this.importModules();
    try {
      const script = Program.new(src, modules);
      script.parameters = params;
      const simplify = !this.setup.isTest;
      if (simplify) {
        console.warn(
          `Loading optimized contract code for ` + script.name
        );
      }
      //!!! todo: consider pushing this to JIT or async
      this.compiledScript = script.compile(simplify);
      return script;
    } catch (e) {
      if (e.message.match(/invalid parameter name/)) {
        throw new Error(
          e.message + `
   ... this typically occurs when your StellarContract class (${this.constructor.name})
   ... can be missing a getContractScriptParams() method 
   ... to map from the configured settings to contract parameters`
        );
      }
      if (!e.src) {
        console.error(
          `unexpected error while compiling helios program (or its imported module) 
> ${e.message}
Suggested: connect with debugger (we provided a debugging point already)
  ... and use 'break on caught exceptions' to analyze the error 
This likely indicates a problem in Helios' error reporting - 
   ... please provide a minimal reproducer as an issue report for repair!

` + e.stack.split("\n").slice(1).join("\n")
        );
        try {
          debugger;
          Program.new(src, modules);
        } catch (sameError) {
          throw sameError;
        }
      }
      const moduleName = e.src.name;
      const errorModule = [src, ...modules].find(
        (m) => m.moduleName == moduleName
      );
      const { srcFile = "\u2039unknown path to module\u203A" } = errorModule || {};
      const [sl, sc, el, ec] = e.getFilePos();
      const t = new Error("");
      const modifiedStack = t.stack.split("\n").slice(1).join("\n");
      const additionalErrors = e.src.errors.slice(1).map((x) => `       |         \u26A0\uFE0F  also: ${x}`);
      const addlErrorText = additionalErrors.length ? ["", ...additionalErrors, "       v"].join("\n") : "";
      t.message = e.message + addlErrorText;
      t.stack = `${e.message}
    at ${moduleName} (${srcFile}:${1 + sl}:${1 + sc})
` + modifiedStack;
      throw t;
    }
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
  async mustFindMyUtxo(semanticName, predicate, hintOrExcept, hint) {
    const { address } = this;
    const isTcx = hintOrExcept instanceof StellarTxnContext;
    const exceptInTcx = isTcx ? hintOrExcept : void 0;
    const extraErrorHint = isTcx ? hint : "string" == typeof hintOrExcept ? hintOrExcept : void 0;
    return this.mustFindUtxo(
      semanticName,
      predicate,
      { address, exceptInTcx },
      extraErrorHint
    );
  }
  async mustFindUtxo(semanticName, predicate, {
    address,
    exceptInTcx
  }, extraErrorHint = "") {
    const found = await this.hasUtxo(semanticName, predicate, {
      address,
      exceptInTcx
    });
    if (!found) {
      throw new Error(
        `${this.constructor.name}: '${semanticName}' utxo not found (${extraErrorHint}) in address`
      );
    }
    return found;
  }
  toUtxoId(u) {
    return `${u.outputId.txId.hex}@${u.outputId.utxoIdx}`;
  }
  async txnFindUtxo(tcx, name, predicate, address = this.address) {
    return this.hasUtxo(name, predicate, {
      address,
      exceptInTcx: tcx
    });
  }
  async hasUtxo(semanticName, predicate, {
    address,
    exceptInTcx
  }) {
    const utxos = await this.network.getUtxos(address);
    const filterUtxos = exceptInTcx?.reservedUtxos();
    const filtered = exceptInTcx ? utxos.filter(exceptInTcx.utxoNotReserved.bind(exceptInTcx)) : utxos;
    console.log(
      `finding '${semanticName}' utxo${exceptInTcx ? " (not already being spent in txn)" : ""} from set:
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
  async hasMyUtxo(semanticName, predicate) {
    return this.hasUtxo(semanticName, predicate, { address: this.address });
  }
}
__decorateClass([
  partialTxn
], StellarContract.prototype, "txnKeepValue", 1);

var shelleyGenesis = {
	activeSlotsCoeff: 0.05,
	epochLength: 432000,
	genDelegs: {
		"637f2e950b0fd8f8e3e811c5fbeb19e411e7a2bf37272b84b29c1a0b": {
			delegate: "aae9293510344ddd636364c2673e34e03e79e3eefa8dbaa70e326f7d",
			vrf: "227116365af2ed943f1a8b5e6557bfaa34996f1578eec667a5e2b361c51e4ce7"
		},
		"8a4b77c4f534f8b8cc6f269e5ebb7ba77fa63a476e50e05e66d7051c": {
			delegate: "d15422b2e8b60e500a82a8f4ceaa98b04e55a0171d1125f6c58f8758",
			vrf: "0ada6c25d62db5e1e35d3df727635afa943b9e8a123ab83785e2281605b09ce2"
		},
		b00470cd193d67aac47c373602fccd4195aad3002c169b5570de1126: {
			delegate: "b3b539e9e7ed1b32fbf778bf2ebf0a6b9f980eac90ac86623d11881a",
			vrf: "0ff0ce9b820376e51c03b27877cd08f8ba40318f1a9f85a3db0b60dd03f71a7a"
		},
		b260ffdb6eba541fcf18601923457307647dce807851b9d19da133ab: {
			delegate: "7c64eb868b4ef566391a321c85323f41d2b95480d7ce56ad2abcb022",
			vrf: "7fb22abd39d550c9a022ec8104648a26240a9ff9c88b8b89a6e20d393c03098e"
		},
		ced1599fd821a39593e00592e5292bdc1437ae0f7af388ef5257344a: {
			delegate: "de7ca985023cf892f4de7f5f1d0a7181668884752d9ebb9e96c95059",
			vrf: "c301b7fc4d1b57fb60841bcec5e3d2db89602e5285801e522fce3790987b1124"
		},
		dd2a7d71a05bed11db61555ba4c658cb1ce06c8024193d064f2a66ae: {
			delegate: "1e113c218899ee7807f4028071d0e108fc790dade9fd1a0d0b0701ee",
			vrf: "faf2702aa4893c877c622ab22dfeaf1d0c8aab98b837fe2bf667314f0d043822"
		},
		f3b9e74f7d0f24d2314ea5dfbca94b65b2059d1ff94d97436b82d5b4: {
			delegate: "fd637b08cc379ef7b99c83b416458fcda8a01a606041779331008fb9",
			vrf: "37f2ea7c843a688159ddc2c38a2f997ab465150164a9136dca69564714b73268"
		}
	},
	initialFunds: {
	},
	maxKESEvolutions: 120,
	maxLovelaceSupply: 45000000000000000,
	networkId: "Testnet",
	networkMagic: 1,
	protocolParams: {
		a0: 0.1,
		decentralisationParam: 1,
		eMax: 18,
		extraEntropy: {
			tag: "NeutralNonce"
		},
		keyDeposit: 400000,
		maxBlockBodySize: 65536,
		maxBlockHeaderSize: 1100,
		maxTxSize: 16384,
		minFeeA: 44,
		minFeeB: 155381,
		minPoolCost: 0,
		minUTxOValue: 0,
		nOpt: 50,
		poolDeposit: 500000000,
		protocolVersion: {
			major: 2,
			minor: 0
		},
		rho: 0.00178650067,
		tau: 0.1
	},
	securityParam: 2160,
	slotLength: 1,
	slotsPerKESPeriod: 86400,
	staking: {
		pools: {
		},
		stake: {
		}
	},
	systemStart: "2022-06-01T00:00:00Z",
	updateQuorum: 5
};
var alonzoGenesis = {
	lovelacePerUTxOWord: 34482,
	executionPrices: {
		prSteps: {
			numerator: 721,
			denominator: 10000000
		},
		prMem: {
			numerator: 577,
			denominator: 10000
		}
	},
	maxTxExUnits: {
		exUnitsMem: 10000000,
		exUnitsSteps: 10000000000
	},
	maxBlockExUnits: {
		exUnitsMem: 50000000,
		exUnitsSteps: 40000000000
	},
	maxValueSize: 5000,
	collateralPercentage: 150,
	maxCollateralInputs: 3,
	costModels: {
		PlutusV1: {
			"sha2_256-memory-arguments": 4,
			"equalsString-cpu-arguments-constant": 1000,
			"cekDelayCost-exBudgetMemory": 100,
			"lessThanEqualsByteString-cpu-arguments-intercept": 103599,
			"divideInteger-memory-arguments-minimum": 1,
			"appendByteString-cpu-arguments-slope": 621,
			"blake2b-cpu-arguments-slope": 29175,
			"iData-cpu-arguments": 150000,
			"encodeUtf8-cpu-arguments-slope": 1000,
			"unBData-cpu-arguments": 150000,
			"multiplyInteger-cpu-arguments-intercept": 61516,
			"cekConstCost-exBudgetMemory": 100,
			"nullList-cpu-arguments": 150000,
			"equalsString-cpu-arguments-intercept": 150000,
			"trace-cpu-arguments": 150000,
			"mkNilData-memory-arguments": 32,
			"lengthOfByteString-cpu-arguments": 150000,
			"cekBuiltinCost-exBudgetCPU": 29773,
			"bData-cpu-arguments": 150000,
			"subtractInteger-cpu-arguments-slope": 0,
			"unIData-cpu-arguments": 150000,
			"consByteString-memory-arguments-intercept": 0,
			"divideInteger-memory-arguments-slope": 1,
			"divideInteger-cpu-arguments-model-arguments-slope": 118,
			"listData-cpu-arguments": 150000,
			"headList-cpu-arguments": 150000,
			"chooseData-memory-arguments": 32,
			"equalsInteger-cpu-arguments-intercept": 136542,
			"sha3_256-cpu-arguments-slope": 82363,
			"sliceByteString-cpu-arguments-slope": 5000,
			"unMapData-cpu-arguments": 150000,
			"lessThanInteger-cpu-arguments-intercept": 179690,
			"mkCons-cpu-arguments": 150000,
			"appendString-memory-arguments-intercept": 0,
			"modInteger-cpu-arguments-model-arguments-slope": 118,
			"ifThenElse-cpu-arguments": 1,
			"mkNilPairData-cpu-arguments": 150000,
			"lessThanEqualsInteger-cpu-arguments-intercept": 145276,
			"addInteger-memory-arguments-slope": 1,
			"chooseList-memory-arguments": 32,
			"constrData-memory-arguments": 32,
			"decodeUtf8-cpu-arguments-intercept": 150000,
			"equalsData-memory-arguments": 1,
			"subtractInteger-memory-arguments-slope": 1,
			"appendByteString-memory-arguments-intercept": 0,
			"lengthOfByteString-memory-arguments": 4,
			"headList-memory-arguments": 32,
			"listData-memory-arguments": 32,
			"consByteString-cpu-arguments-intercept": 150000,
			"unIData-memory-arguments": 32,
			"remainderInteger-memory-arguments-minimum": 1,
			"bData-memory-arguments": 32,
			"lessThanByteString-cpu-arguments-slope": 248,
			"encodeUtf8-memory-arguments-intercept": 0,
			"cekStartupCost-exBudgetCPU": 100,
			"multiplyInteger-memory-arguments-intercept": 0,
			"unListData-memory-arguments": 32,
			"remainderInteger-cpu-arguments-model-arguments-slope": 118,
			"cekVarCost-exBudgetCPU": 29773,
			"remainderInteger-memory-arguments-slope": 1,
			"cekForceCost-exBudgetCPU": 29773,
			"sha2_256-cpu-arguments-slope": 29175,
			"equalsInteger-memory-arguments": 1,
			"indexByteString-memory-arguments": 1,
			"addInteger-memory-arguments-intercept": 1,
			"chooseUnit-cpu-arguments": 150000,
			"sndPair-cpu-arguments": 150000,
			"cekLamCost-exBudgetCPU": 29773,
			"fstPair-cpu-arguments": 150000,
			"quotientInteger-memory-arguments-minimum": 1,
			"decodeUtf8-cpu-arguments-slope": 1000,
			"lessThanInteger-memory-arguments": 1,
			"lessThanEqualsInteger-cpu-arguments-slope": 1366,
			"fstPair-memory-arguments": 32,
			"modInteger-memory-arguments-intercept": 0,
			"unConstrData-cpu-arguments": 150000,
			"lessThanEqualsInteger-memory-arguments": 1,
			"chooseUnit-memory-arguments": 32,
			"sndPair-memory-arguments": 32,
			"addInteger-cpu-arguments-intercept": 197209,
			"decodeUtf8-memory-arguments-slope": 8,
			"equalsData-cpu-arguments-intercept": 150000,
			"mapData-cpu-arguments": 150000,
			"mkPairData-cpu-arguments": 150000,
			"quotientInteger-cpu-arguments-constant": 148000,
			"consByteString-memory-arguments-slope": 1,
			"cekVarCost-exBudgetMemory": 100,
			"indexByteString-cpu-arguments": 150000,
			"unListData-cpu-arguments": 150000,
			"equalsInteger-cpu-arguments-slope": 1326,
			"cekStartupCost-exBudgetMemory": 100,
			"subtractInteger-cpu-arguments-intercept": 197209,
			"divideInteger-cpu-arguments-model-arguments-intercept": 425507,
			"divideInteger-memory-arguments-intercept": 0,
			"cekForceCost-exBudgetMemory": 100,
			"blake2b-cpu-arguments-intercept": 2477736,
			"remainderInteger-cpu-arguments-constant": 148000,
			"tailList-cpu-arguments": 150000,
			"encodeUtf8-cpu-arguments-intercept": 150000,
			"equalsString-cpu-arguments-slope": 1000,
			"lessThanByteString-memory-arguments": 1,
			"multiplyInteger-cpu-arguments-slope": 11218,
			"appendByteString-cpu-arguments-intercept": 396231,
			"lessThanEqualsByteString-cpu-arguments-slope": 248,
			"modInteger-memory-arguments-slope": 1,
			"addInteger-cpu-arguments-slope": 0,
			"equalsData-cpu-arguments-slope": 10000,
			"decodeUtf8-memory-arguments-intercept": 0,
			"chooseList-cpu-arguments": 150000,
			"constrData-cpu-arguments": 150000,
			"equalsByteString-memory-arguments": 1,
			"cekApplyCost-exBudgetCPU": 29773,
			"quotientInteger-memory-arguments-slope": 1,
			"verifySignature-cpu-arguments-intercept": 3345831,
			"unMapData-memory-arguments": 32,
			"mkCons-memory-arguments": 32,
			"sliceByteString-memory-arguments-slope": 1,
			"sha3_256-memory-arguments": 4,
			"ifThenElse-memory-arguments": 1,
			"mkNilPairData-memory-arguments": 32,
			"equalsByteString-cpu-arguments-slope": 247,
			"appendString-cpu-arguments-intercept": 150000,
			"quotientInteger-cpu-arguments-model-arguments-slope": 118,
			"cekApplyCost-exBudgetMemory": 100,
			"equalsString-memory-arguments": 1,
			"multiplyInteger-memory-arguments-slope": 1,
			"cekBuiltinCost-exBudgetMemory": 100,
			"remainderInteger-memory-arguments-intercept": 0,
			"sha2_256-cpu-arguments-intercept": 2477736,
			"remainderInteger-cpu-arguments-model-arguments-intercept": 425507,
			"lessThanEqualsByteString-memory-arguments": 1,
			"tailList-memory-arguments": 32,
			"mkNilData-cpu-arguments": 150000,
			"chooseData-cpu-arguments": 150000,
			"unBData-memory-arguments": 32,
			"blake2b-memory-arguments": 4,
			"iData-memory-arguments": 32,
			"nullList-memory-arguments": 32,
			"cekDelayCost-exBudgetCPU": 29773,
			"subtractInteger-memory-arguments-intercept": 1,
			"lessThanByteString-cpu-arguments-intercept": 103599,
			"consByteString-cpu-arguments-slope": 1000,
			"appendByteString-memory-arguments-slope": 1,
			"trace-memory-arguments": 32,
			"divideInteger-cpu-arguments-constant": 148000,
			"cekConstCost-exBudgetCPU": 29773,
			"encodeUtf8-memory-arguments-slope": 8,
			"quotientInteger-cpu-arguments-model-arguments-intercept": 425507,
			"mapData-memory-arguments": 32,
			"appendString-cpu-arguments-slope": 1000,
			"modInteger-cpu-arguments-constant": 148000,
			"verifySignature-cpu-arguments-slope": 1,
			"unConstrData-memory-arguments": 32,
			"quotientInteger-memory-arguments-intercept": 0,
			"equalsByteString-cpu-arguments-constant": 150000,
			"sliceByteString-memory-arguments-intercept": 0,
			"mkPairData-memory-arguments": 32,
			"equalsByteString-cpu-arguments-intercept": 112536,
			"appendString-memory-arguments-slope": 1,
			"lessThanInteger-cpu-arguments-slope": 497,
			"modInteger-cpu-arguments-model-arguments-intercept": 425507,
			"modInteger-memory-arguments-minimum": 1,
			"sha3_256-cpu-arguments-intercept": 0,
			"verifySignature-memory-arguments": 1,
			"cekLamCost-exBudgetMemory": 100,
			"sliceByteString-cpu-arguments-intercept": 150000
		}
	}
};
var latestParams = {
	collateralPercentage: 150,
	costModels: {
		PlutusScriptV1: {
			"addInteger-cpu-arguments-intercept": 205665,
			"addInteger-cpu-arguments-slope": 812,
			"addInteger-memory-arguments-intercept": 1,
			"addInteger-memory-arguments-slope": 1,
			"appendByteString-cpu-arguments-intercept": 1000,
			"appendByteString-cpu-arguments-slope": 571,
			"appendByteString-memory-arguments-intercept": 0,
			"appendByteString-memory-arguments-slope": 1,
			"appendString-cpu-arguments-intercept": 1000,
			"appendString-cpu-arguments-slope": 24177,
			"appendString-memory-arguments-intercept": 4,
			"appendString-memory-arguments-slope": 1,
			"bData-cpu-arguments": 1000,
			"bData-memory-arguments": 32,
			"blake2b_256-cpu-arguments-intercept": 117366,
			"blake2b_256-cpu-arguments-slope": 10475,
			"blake2b_256-memory-arguments": 4,
			"cekApplyCost-exBudgetCPU": 23000,
			"cekApplyCost-exBudgetMemory": 100,
			"cekBuiltinCost-exBudgetCPU": 23000,
			"cekBuiltinCost-exBudgetMemory": 100,
			"cekConstCost-exBudgetCPU": 23000,
			"cekConstCost-exBudgetMemory": 100,
			"cekDelayCost-exBudgetCPU": 23000,
			"cekDelayCost-exBudgetMemory": 100,
			"cekForceCost-exBudgetCPU": 23000,
			"cekForceCost-exBudgetMemory": 100,
			"cekLamCost-exBudgetCPU": 23000,
			"cekLamCost-exBudgetMemory": 100,
			"cekStartupCost-exBudgetCPU": 100,
			"cekStartupCost-exBudgetMemory": 100,
			"cekVarCost-exBudgetCPU": 23000,
			"cekVarCost-exBudgetMemory": 100,
			"chooseData-cpu-arguments": 19537,
			"chooseData-memory-arguments": 32,
			"chooseList-cpu-arguments": 175354,
			"chooseList-memory-arguments": 32,
			"chooseUnit-cpu-arguments": 46417,
			"chooseUnit-memory-arguments": 4,
			"consByteString-cpu-arguments-intercept": 221973,
			"consByteString-cpu-arguments-slope": 511,
			"consByteString-memory-arguments-intercept": 0,
			"consByteString-memory-arguments-slope": 1,
			"constrData-cpu-arguments": 89141,
			"constrData-memory-arguments": 32,
			"decodeUtf8-cpu-arguments-intercept": 497525,
			"decodeUtf8-cpu-arguments-slope": 14068,
			"decodeUtf8-memory-arguments-intercept": 4,
			"decodeUtf8-memory-arguments-slope": 2,
			"divideInteger-cpu-arguments-constant": 196500,
			"divideInteger-cpu-arguments-model-arguments-intercept": 453240,
			"divideInteger-cpu-arguments-model-arguments-slope": 220,
			"divideInteger-memory-arguments-intercept": 0,
			"divideInteger-memory-arguments-minimum": 1,
			"divideInteger-memory-arguments-slope": 1,
			"encodeUtf8-cpu-arguments-intercept": 1000,
			"encodeUtf8-cpu-arguments-slope": 28662,
			"encodeUtf8-memory-arguments-intercept": 4,
			"encodeUtf8-memory-arguments-slope": 2,
			"equalsByteString-cpu-arguments-constant": 245000,
			"equalsByteString-cpu-arguments-intercept": 216773,
			"equalsByteString-cpu-arguments-slope": 62,
			"equalsByteString-memory-arguments": 1,
			"equalsData-cpu-arguments-intercept": 1060367,
			"equalsData-cpu-arguments-slope": 12586,
			"equalsData-memory-arguments": 1,
			"equalsInteger-cpu-arguments-intercept": 208512,
			"equalsInteger-cpu-arguments-slope": 421,
			"equalsInteger-memory-arguments": 1,
			"equalsString-cpu-arguments-constant": 187000,
			"equalsString-cpu-arguments-intercept": 1000,
			"equalsString-cpu-arguments-slope": 52998,
			"equalsString-memory-arguments": 1,
			"fstPair-cpu-arguments": 80436,
			"fstPair-memory-arguments": 32,
			"headList-cpu-arguments": 43249,
			"headList-memory-arguments": 32,
			"iData-cpu-arguments": 1000,
			"iData-memory-arguments": 32,
			"ifThenElse-cpu-arguments": 80556,
			"ifThenElse-memory-arguments": 1,
			"indexByteString-cpu-arguments": 57667,
			"indexByteString-memory-arguments": 4,
			"lengthOfByteString-cpu-arguments": 1000,
			"lengthOfByteString-memory-arguments": 10,
			"lessThanByteString-cpu-arguments-intercept": 197145,
			"lessThanByteString-cpu-arguments-slope": 156,
			"lessThanByteString-memory-arguments": 1,
			"lessThanEqualsByteString-cpu-arguments-intercept": 197145,
			"lessThanEqualsByteString-cpu-arguments-slope": 156,
			"lessThanEqualsByteString-memory-arguments": 1,
			"lessThanEqualsInteger-cpu-arguments-intercept": 204924,
			"lessThanEqualsInteger-cpu-arguments-slope": 473,
			"lessThanEqualsInteger-memory-arguments": 1,
			"lessThanInteger-cpu-arguments-intercept": 208896,
			"lessThanInteger-cpu-arguments-slope": 511,
			"lessThanInteger-memory-arguments": 1,
			"listData-cpu-arguments": 52467,
			"listData-memory-arguments": 32,
			"mapData-cpu-arguments": 64832,
			"mapData-memory-arguments": 32,
			"mkCons-cpu-arguments": 65493,
			"mkCons-memory-arguments": 32,
			"mkNilData-cpu-arguments": 22558,
			"mkNilData-memory-arguments": 32,
			"mkNilPairData-cpu-arguments": 16563,
			"mkNilPairData-memory-arguments": 32,
			"mkPairData-cpu-arguments": 76511,
			"mkPairData-memory-arguments": 32,
			"modInteger-cpu-arguments-constant": 196500,
			"modInteger-cpu-arguments-model-arguments-intercept": 453240,
			"modInteger-cpu-arguments-model-arguments-slope": 220,
			"modInteger-memory-arguments-intercept": 0,
			"modInteger-memory-arguments-minimum": 1,
			"modInteger-memory-arguments-slope": 1,
			"multiplyInteger-cpu-arguments-intercept": 69522,
			"multiplyInteger-cpu-arguments-slope": 11687,
			"multiplyInteger-memory-arguments-intercept": 0,
			"multiplyInteger-memory-arguments-slope": 1,
			"nullList-cpu-arguments": 60091,
			"nullList-memory-arguments": 32,
			"quotientInteger-cpu-arguments-constant": 196500,
			"quotientInteger-cpu-arguments-model-arguments-intercept": 453240,
			"quotientInteger-cpu-arguments-model-arguments-slope": 220,
			"quotientInteger-memory-arguments-intercept": 0,
			"quotientInteger-memory-arguments-minimum": 1,
			"quotientInteger-memory-arguments-slope": 1,
			"remainderInteger-cpu-arguments-constant": 196500,
			"remainderInteger-cpu-arguments-model-arguments-intercept": 453240,
			"remainderInteger-cpu-arguments-model-arguments-slope": 220,
			"remainderInteger-memory-arguments-intercept": 0,
			"remainderInteger-memory-arguments-minimum": 1,
			"remainderInteger-memory-arguments-slope": 1,
			"sha2_256-cpu-arguments-intercept": 806990,
			"sha2_256-cpu-arguments-slope": 30482,
			"sha2_256-memory-arguments": 4,
			"sha3_256-cpu-arguments-intercept": 1927926,
			"sha3_256-cpu-arguments-slope": 82523,
			"sha3_256-memory-arguments": 4,
			"sliceByteString-cpu-arguments-intercept": 265318,
			"sliceByteString-cpu-arguments-slope": 0,
			"sliceByteString-memory-arguments-intercept": 4,
			"sliceByteString-memory-arguments-slope": 0,
			"sndPair-cpu-arguments": 85931,
			"sndPair-memory-arguments": 32,
			"subtractInteger-cpu-arguments-intercept": 205665,
			"subtractInteger-cpu-arguments-slope": 812,
			"subtractInteger-memory-arguments-intercept": 1,
			"subtractInteger-memory-arguments-slope": 1,
			"tailList-cpu-arguments": 41182,
			"tailList-memory-arguments": 32,
			"trace-cpu-arguments": 212342,
			"trace-memory-arguments": 32,
			"unBData-cpu-arguments": 31220,
			"unBData-memory-arguments": 32,
			"unConstrData-cpu-arguments": 32696,
			"unConstrData-memory-arguments": 32,
			"unIData-cpu-arguments": 43357,
			"unIData-memory-arguments": 32,
			"unListData-cpu-arguments": 32247,
			"unListData-memory-arguments": 32,
			"unMapData-cpu-arguments": 38314,
			"unMapData-memory-arguments": 32,
			"verifyEd25519Signature-cpu-arguments-intercept": 9462713,
			"verifyEd25519Signature-cpu-arguments-slope": 1021,
			"verifyEd25519Signature-memory-arguments": 10
		},
		PlutusScriptV2: {
			"addInteger-cpu-arguments-intercept": 205665,
			"addInteger-cpu-arguments-slope": 812,
			"addInteger-memory-arguments-intercept": 1,
			"addInteger-memory-arguments-slope": 1,
			"appendByteString-cpu-arguments-intercept": 1000,
			"appendByteString-cpu-arguments-slope": 571,
			"appendByteString-memory-arguments-intercept": 0,
			"appendByteString-memory-arguments-slope": 1,
			"appendString-cpu-arguments-intercept": 1000,
			"appendString-cpu-arguments-slope": 24177,
			"appendString-memory-arguments-intercept": 4,
			"appendString-memory-arguments-slope": 1,
			"bData-cpu-arguments": 1000,
			"bData-memory-arguments": 32,
			"blake2b_256-cpu-arguments-intercept": 117366,
			"blake2b_256-cpu-arguments-slope": 10475,
			"blake2b_256-memory-arguments": 4,
			"cekApplyCost-exBudgetCPU": 23000,
			"cekApplyCost-exBudgetMemory": 100,
			"cekBuiltinCost-exBudgetCPU": 23000,
			"cekBuiltinCost-exBudgetMemory": 100,
			"cekConstCost-exBudgetCPU": 23000,
			"cekConstCost-exBudgetMemory": 100,
			"cekDelayCost-exBudgetCPU": 23000,
			"cekDelayCost-exBudgetMemory": 100,
			"cekForceCost-exBudgetCPU": 23000,
			"cekForceCost-exBudgetMemory": 100,
			"cekLamCost-exBudgetCPU": 23000,
			"cekLamCost-exBudgetMemory": 100,
			"cekStartupCost-exBudgetCPU": 100,
			"cekStartupCost-exBudgetMemory": 100,
			"cekVarCost-exBudgetCPU": 23000,
			"cekVarCost-exBudgetMemory": 100,
			"chooseData-cpu-arguments": 19537,
			"chooseData-memory-arguments": 32,
			"chooseList-cpu-arguments": 175354,
			"chooseList-memory-arguments": 32,
			"chooseUnit-cpu-arguments": 46417,
			"chooseUnit-memory-arguments": 4,
			"consByteString-cpu-arguments-intercept": 221973,
			"consByteString-cpu-arguments-slope": 511,
			"consByteString-memory-arguments-intercept": 0,
			"consByteString-memory-arguments-slope": 1,
			"constrData-cpu-arguments": 89141,
			"constrData-memory-arguments": 32,
			"decodeUtf8-cpu-arguments-intercept": 497525,
			"decodeUtf8-cpu-arguments-slope": 14068,
			"decodeUtf8-memory-arguments-intercept": 4,
			"decodeUtf8-memory-arguments-slope": 2,
			"divideInteger-cpu-arguments-constant": 196500,
			"divideInteger-cpu-arguments-model-arguments-intercept": 453240,
			"divideInteger-cpu-arguments-model-arguments-slope": 220,
			"divideInteger-memory-arguments-intercept": 0,
			"divideInteger-memory-arguments-minimum": 1,
			"divideInteger-memory-arguments-slope": 1,
			"encodeUtf8-cpu-arguments-intercept": 1000,
			"encodeUtf8-cpu-arguments-slope": 28662,
			"encodeUtf8-memory-arguments-intercept": 4,
			"encodeUtf8-memory-arguments-slope": 2,
			"equalsByteString-cpu-arguments-constant": 245000,
			"equalsByteString-cpu-arguments-intercept": 216773,
			"equalsByteString-cpu-arguments-slope": 62,
			"equalsByteString-memory-arguments": 1,
			"equalsData-cpu-arguments-intercept": 1060367,
			"equalsData-cpu-arguments-slope": 12586,
			"equalsData-memory-arguments": 1,
			"equalsInteger-cpu-arguments-intercept": 208512,
			"equalsInteger-cpu-arguments-slope": 421,
			"equalsInteger-memory-arguments": 1,
			"equalsString-cpu-arguments-constant": 187000,
			"equalsString-cpu-arguments-intercept": 1000,
			"equalsString-cpu-arguments-slope": 52998,
			"equalsString-memory-arguments": 1,
			"fstPair-cpu-arguments": 80436,
			"fstPair-memory-arguments": 32,
			"headList-cpu-arguments": 43249,
			"headList-memory-arguments": 32,
			"iData-cpu-arguments": 1000,
			"iData-memory-arguments": 32,
			"ifThenElse-cpu-arguments": 80556,
			"ifThenElse-memory-arguments": 1,
			"indexByteString-cpu-arguments": 57667,
			"indexByteString-memory-arguments": 4,
			"lengthOfByteString-cpu-arguments": 1000,
			"lengthOfByteString-memory-arguments": 10,
			"lessThanByteString-cpu-arguments-intercept": 197145,
			"lessThanByteString-cpu-arguments-slope": 156,
			"lessThanByteString-memory-arguments": 1,
			"lessThanEqualsByteString-cpu-arguments-intercept": 197145,
			"lessThanEqualsByteString-cpu-arguments-slope": 156,
			"lessThanEqualsByteString-memory-arguments": 1,
			"lessThanEqualsInteger-cpu-arguments-intercept": 204924,
			"lessThanEqualsInteger-cpu-arguments-slope": 473,
			"lessThanEqualsInteger-memory-arguments": 1,
			"lessThanInteger-cpu-arguments-intercept": 208896,
			"lessThanInteger-cpu-arguments-slope": 511,
			"lessThanInteger-memory-arguments": 1,
			"listData-cpu-arguments": 52467,
			"listData-memory-arguments": 32,
			"mapData-cpu-arguments": 64832,
			"mapData-memory-arguments": 32,
			"mkCons-cpu-arguments": 65493,
			"mkCons-memory-arguments": 32,
			"mkNilData-cpu-arguments": 22558,
			"mkNilData-memory-arguments": 32,
			"mkNilPairData-cpu-arguments": 16563,
			"mkNilPairData-memory-arguments": 32,
			"mkPairData-cpu-arguments": 76511,
			"mkPairData-memory-arguments": 32,
			"modInteger-cpu-arguments-constant": 196500,
			"modInteger-cpu-arguments-model-arguments-intercept": 453240,
			"modInteger-cpu-arguments-model-arguments-slope": 220,
			"modInteger-memory-arguments-intercept": 0,
			"modInteger-memory-arguments-minimum": 1,
			"modInteger-memory-arguments-slope": 1,
			"multiplyInteger-cpu-arguments-intercept": 69522,
			"multiplyInteger-cpu-arguments-slope": 11687,
			"multiplyInteger-memory-arguments-intercept": 0,
			"multiplyInteger-memory-arguments-slope": 1,
			"nullList-cpu-arguments": 60091,
			"nullList-memory-arguments": 32,
			"quotientInteger-cpu-arguments-constant": 196500,
			"quotientInteger-cpu-arguments-model-arguments-intercept": 453240,
			"quotientInteger-cpu-arguments-model-arguments-slope": 220,
			"quotientInteger-memory-arguments-intercept": 0,
			"quotientInteger-memory-arguments-minimum": 1,
			"quotientInteger-memory-arguments-slope": 1,
			"remainderInteger-cpu-arguments-constant": 196500,
			"remainderInteger-cpu-arguments-model-arguments-intercept": 453240,
			"remainderInteger-cpu-arguments-model-arguments-slope": 220,
			"remainderInteger-memory-arguments-intercept": 0,
			"remainderInteger-memory-arguments-minimum": 1,
			"remainderInteger-memory-arguments-slope": 1,
			"serialiseData-cpu-arguments-intercept": 1159724,
			"serialiseData-cpu-arguments-slope": 392670,
			"serialiseData-memory-arguments-intercept": 0,
			"serialiseData-memory-arguments-slope": 2,
			"sha2_256-cpu-arguments-intercept": 806990,
			"sha2_256-cpu-arguments-slope": 30482,
			"sha2_256-memory-arguments": 4,
			"sha3_256-cpu-arguments-intercept": 1927926,
			"sha3_256-cpu-arguments-slope": 82523,
			"sha3_256-memory-arguments": 4,
			"sliceByteString-cpu-arguments-intercept": 265318,
			"sliceByteString-cpu-arguments-slope": 0,
			"sliceByteString-memory-arguments-intercept": 4,
			"sliceByteString-memory-arguments-slope": 0,
			"sndPair-cpu-arguments": 85931,
			"sndPair-memory-arguments": 32,
			"subtractInteger-cpu-arguments-intercept": 205665,
			"subtractInteger-cpu-arguments-slope": 812,
			"subtractInteger-memory-arguments-intercept": 1,
			"subtractInteger-memory-arguments-slope": 1,
			"tailList-cpu-arguments": 41182,
			"tailList-memory-arguments": 32,
			"trace-cpu-arguments": 212342,
			"trace-memory-arguments": 32,
			"unBData-cpu-arguments": 31220,
			"unBData-memory-arguments": 32,
			"unConstrData-cpu-arguments": 32696,
			"unConstrData-memory-arguments": 32,
			"unIData-cpu-arguments": 43357,
			"unIData-memory-arguments": 32,
			"unListData-cpu-arguments": 32247,
			"unListData-memory-arguments": 32,
			"unMapData-cpu-arguments": 38314,
			"unMapData-memory-arguments": 32,
			"verifyEcdsaSecp256k1Signature-cpu-arguments": 20000000000,
			"verifyEcdsaSecp256k1Signature-memory-arguments": 20000000000,
			"verifyEd25519Signature-cpu-arguments-intercept": 9462713,
			"verifyEd25519Signature-cpu-arguments-slope": 1021,
			"verifyEd25519Signature-memory-arguments": 10,
			"verifySchnorrSecp256k1Signature-cpu-arguments-intercept": 20000000000,
			"verifySchnorrSecp256k1Signature-cpu-arguments-slope": 0,
			"verifySchnorrSecp256k1Signature-memory-arguments": 20000000000
		}
	},
	executionUnitPrices: {
		priceMemory: 0.0577,
		priceSteps: 0.0000721
	},
	maxBlockBodySize: 90112,
	maxBlockExecutionUnits: {
		memory: 62000000,
		steps: 40000000000
	},
	maxBlockHeaderSize: 1100,
	maxCollateralInputs: 3,
	maxTxExecutionUnits: {
		memory: 14000000,
		steps: 10000000000
	},
	maxTxSize: 16384,
	maxValueSize: 5000,
	minPoolCost: 340000000,
	monetaryExpansion: 0.003,
	poolPledgeInfluence: 0.3,
	poolRetireMaxEpoch: 18,
	protocolVersion: {
		major: 7,
		minor: 0
	},
	stakeAddressDeposit: 2000000,
	stakePoolDeposit: 500000000,
	stakePoolTargetNum: 500,
	treasuryCut: 0.2,
	txFeeFixed: 155381,
	txFeePerByte: 44,
	utxoCostPerByte: 4310
};
var latestTip = {
	epoch: 29,
	hash: "0de380c16222470e4cf4f7cce8af9a7b54d63e5aa4228520df9f2d252a0efcb5",
	slot: 11192926,
	time: 1666876126000
};
var ppParams = {
	shelleyGenesis: shelleyGenesis,
	alonzoGenesis: alonzoGenesis,
	latestParams: latestParams,
	latestTip: latestTip
};

const preProdParams = ppParams;
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
const ADA = 1000000n;

class StellarTestHelper {
  state;
  config;
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
      this.config = params;
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
    this.setupPending = this.initialize(params).then((p) => {
      return p;
    });
  }
  async initialize(params) {
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
    const strella = this.initStrella(TargetClass, this.config);
    this.strella = strella;
    this.address = strella.address;
    return strella;
  }
  initStrella(TargetClass, config) {
    return new TargetClass({
      config,
      setup: {
        network: this.network,
        myActor: this.currentActor,
        networkParams: this.networkParams,
        isTest: true
      }
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
      )} (\u{1F511}#${a.address.pubKeyHash?.hex.substring(0, 8)}\u2026)`
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
    return [theNetwork, emuParams];
  }
  slotToTimestamp(s) {
    return this.networkParams.slotToTime(s);
  }
  currentSlot() {
    return this.liveSlotParams.liveSlot;
  }
  waitUntil(time) {
    const targetTimeMillis = BigInt(time.getTime());
    const targetSlot = this.networkParams.timeToSlot(targetTimeMillis);
    const c = this.currentSlot();
    const slotsToWait = targetSlot - (c || 0n);
    if (slotsToWait < 1) {
      throw new Error(`the indicated time is not in the future`);
    }
    this.network.tick(slotsToWait);
    return slotsToWait;
  }
}

//! declaration for a variant of a Role:
//! a map of delegate selections needed for a transaction 
//! a single delegate selection, where a person chooses 
function selectDelegate(sd) {
  return sd;
}
//! a complete, validated configuration for a specific delegate.

class CapoTestHelper extends StellarTestHelper {
  async initialize({
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
        ".... warning: new test helper setup with new seed ..."
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
    const { name } = strella.scriptProgram;
    console.log(
      name,
      address.toBech32().substring(0, 18) + "\u2026",
      "vHash \u{1F4DC} " + strella.compiledScript.validatorHash.hex.substring(0, 12) + "\u2026",
      "mph \u{1F3E6} " + mph?.hex.substring(0, 12) + "\u2026"
    );
    return strella;
  }
  async mintCharterToken(args) {
    this.actors;
    if (this.state.mintedCharterToken) {
      console.warn(
        "reusing minted charter from existing testing-context"
      );
      return this.state.mintedCharterToken;
    }
    await this.initialize();
    const script = this.strella;
    const goodArgs = args || this.mkDefaultCharterArgs();
    const tcx = await script.mkTxnMintCharterToken(goodArgs, script.withDelegates({
      govAuthority: selectDelegate({
        strategyName: "address",
        config: {}
      })
    }));
    expect(script.network).toBe(this.network);
    await script.submit(tcx);
    console.log("charter token minted");
    this.network.tick(1n);
    return this.state.mintedCharterToken = tcx;
  }
}

const insufficientInputError = /(need .* lovelace, but only have|transaction doesn't have enough inputs)/;
Error.stackTraceLimit = 100;

export { ADA, CapoTestHelper, addTestContext, insufficientInputError };
//# sourceMappingURL=testing.mjs.map
