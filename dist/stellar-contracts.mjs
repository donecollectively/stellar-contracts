import path from 'path';
import { createFilter } from 'rollup-pluginutils';
import * as helios from '@hyperionbt/helios';
import { Address, Tx, Value, TxOutput, MintingPolicyHash, AssetClass, TxInput, Assets, Program, bytesToHex, Crypto, NetworkParams, NetworkEmulator, Option, Datum } from '@hyperionbt/helios';
import { expect } from 'vitest';

function mkHeliosModule(src, filename) {
  const module = new String(src);
  const [_, purpose, moduleName] = src.match(
    /(module|minting|spending|endpoint)\s+([a-zA-Z0-9]+)/m
  ) || [];
  module.srcFile = filename;
  module.purpose = purpose;
  module.moduleName = moduleName;
  return module;
}

function heliosRollupLoader(opts = {
  include: "**/*.hl",
  exclude: []
}) {
  if (!opts.include) {
    throw Error("missing required 'include' option for helios loader");
  }
  const filter = createFilter(opts.include, opts.exclude);
  return {
    name: "helios",
    transform(content, id) {
      if (filter(id)) {
        const relPath = path.relative(".", id);
        console.warn(`heliosLoader: generating javascript for ${relPath}`);
        const [_, purpose, moduleName] = content.match(
          /(module|minting|spending|endpoint)\s+([a-zA-Z0-9]+)/m
        ) || [];
        if (!(purpose && moduleName))
          throw new Error(`Bad format for helios file ${id}`);
        const code = new String(
          `const code = 
new String(${JSON.stringify(content)});
code.srcFile = ${JSON.stringify(relPath)};
code.purpose = ${JSON.stringify(purpose)}
code.moduleName = ${JSON.stringify(moduleName)}

export default code
`
        );
        return {
          code,
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
function errorMapAsString(em, prefix = "  ") {
  return Object.keys(em).map(
    (k) => `${prefix}${k}: ${JSON.stringify(em[k])}`
  ).join("\n");
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

var __defProp$5 = Object.defineProperty;
var __getOwnPropDesc$5 = Object.getOwnPropertyDescriptor;
var __decorateClass$5 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$5(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$5(target, key, result);
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
  constructor({
    setup,
    config
  }) {
    if (!setup)
      setup = this.constructor.setup;
    const { network, networkParams, isTest, myActor } = setup;
    this.setup = setup;
    this.configIn = config;
    this.network = network;
    this.networkParams = networkParams;
    if (myActor)
      this.myActor = myActor;
    const fullParams = this.contractParams = this.getContractScriptParams(config);
    this.scriptProgram = this.loadProgramScript(fullParams);
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
__decorateClass$5([
  partialTxn
], StellarContract.prototype, "txnKeepValue", 1);

const code$6 = 
new String("minting DefaultMinter \n\nimport { \n    hasSeedUtxo, \n    validateUutMinting\n} from CapoMintHelpers\n\nimport {mkTv} from StellarHeliosHelpers\n\nimport {\n    requiresValidDelegate\n} from CapoDelegateHelpers\n\n//!!!! todo: change to TxOutputId, rolling up these two things:\nconst seedTxn : TxId = TxId::new(#1234)\nconst seedIndex : Int = 42\n\nenum Redeemer { \n    mintingCharter {\n        owner: Address\n\n        // we don't have a responsiblity to enforce delivery to the right location\n        // govAuthority: RelativeDelegateLink   // not needed \n    }\n    mintingUuts {\n        //!!!! todo: change to TxOutputId, rolling up these two things:\n        seedTxn: TxId\n        seedIndex: Int\n        purposes: []String\n    }\n}\n\nfunc hasContractSeedUtxo(tx: Tx) -> Bool {\n    hasSeedUtxo(tx, seedTxn, seedIndex, \"charter\")\n}\n\nfunc main(r : Redeemer, ctx: ScriptContext) -> Bool {\n    tx: Tx = ctx.tx;\n    mph: MintingPolicyHash = ctx.get_current_minting_policy_hash();\n    value_minted: Value = tx.minted;\n\n    ok : Bool = r.switch {\n        charter: mintingCharter => {       \n            charterVal : Value = mkTv(mph, \"charter\");\n            authTnBase : String = \"authZor\";\n\n            assert(value_minted >= charterVal,\n                \"charter token not minted\");\n\n            hasContractSeedUtxo(tx) &&\n            validateUutMinting(ctx:ctx, \n                sTxId:seedTxn, \n                sIdx:seedIndex, \n                purposes: []String{authTnBase}, \n                exact:false\n            ) &&\n            tx.outputs.all( (output: TxOutput) -> Bool {\n                output.value != value_minted || (\n                    output.value == value_minted &&\n                    output.address == charter.owner\n                )\n            })\n        },\n\n        mintingUuts{sTxId, sIdx, purposes} => validateUutMinting(ctx, sTxId, sIdx, purposes),\n        _ => true\n    };\n\n    print(\"defaultMinter: minting value: \" + value_minted.show());\n\n    ok\n}\n\n");
code$6.srcFile = "src/DefaultMinter.hl";
code$6.purpose = "minting";
code$6.moduleName = "DefaultMinter";

const code$5 = 
new String("module CapoMintHelpers\nimport {\n    mkTv\n    // txHasOutput\n} from StellarHeliosHelpers\n\nfunc hasSeedUtxo(tx: Tx, sTxId : TxId, sIdx: Int, reason: String) -> Bool {\n    seedUtxo: TxOutputId = TxOutputId::new(\n        sTxId,\n        sIdx\n    );\n    assert(tx.inputs.any( (input: TxInput) -> Bool {\n        input.output_id == seedUtxo\n    }),  \"seed utxo required for minting \"+reason \n        + \"\\n\"+sTxId.show() + \" : \" + sIdx.show()\n    );\n\n    true\n}\n\n//! pre-computes the hash-based suffix for a token name, returning\n//  a function that makes Uut names with any given purpose, given the seed-txn details\nfunc tnUutFactory(\n    sTxId : TxId, sIdx : Int\n) -> (String) -> String {\n\n    idxBytes : ByteArray = sIdx.bound_max(255).serialize();\n    // assert(idxBytes.length == 1, \"surprise!\");\n\n    //! yuck: un-CBOR...\n    rawTxId : ByteArray = sTxId.serialize().slice(5,37);\n\n    txoId : ByteArray = (rawTxId + \"@\".encode_utf8() + idxBytes);\n    assert(txoId.length == 34, \"txId + @ + int should be length 34\");\n    // print( \"******** txoId \" + txoId.show());\n\n    miniHash : ByteArray = txoId.blake2b().slice(0,6);\n    // assert(miniHash.length == 6, \"urgh.  slice 5? expected 12, got \"+ miniHash.length.show());\n\n    mhs: String = miniHash.show();\n    (p: String) -> String {\n        p + \"-\" + mhs\n    }\n}\n\nfunc validateUutMinting(\n    ctx: ScriptContext, \n    sTxId : TxId, sIdx : Int, \n    purposes: []String, \n    exact:Bool=true) -> Bool {\n\n    tx: Tx = ctx.tx;\n    mph: MintingPolicyHash = ctx.get_current_minting_policy_hash();\n    valueMinted: Value = tx.minted;\n\n    // idxBytes : ByteArray = sIdx.bound_max(255).serialize();\n    // // assert(idxBytes.length == 1, \"surprise!\");\n\n    // //! yuck: un-CBOR...\n    // rawTxId : ByteArray = sTxId.serialize().slice(5,37);\n\n    // txoId : ByteArray = (rawTxId + \"@\".encode_utf8() + idxBytes);\n    // assert(txoId.length == 34, \"txId + @ + int should be length 34\");\n    // // print( \"******** txoId \" + txoId.show());\n\n    // miniHash : ByteArray = txoId.blake2b().slice(0,6);\n    // // assert(miniHash.length == 6, \"urgh.  slice 5? expected 12, got \"+ miniHash.length.show());\n\n    mkTokenName: (String) -> String = tnUutFactory(sTxId, sIdx);\n    // tokenName1 = purpose + \".\" + miniHash.show();\n\n    expectedValue = Value::sum(purposes.sort((a:String, b:String) -> Bool { a == b }).map(\n        (purpose: String) -> Value {\n            mkTv(mph, mkTokenName(purpose))\n        }\n    ));\n    // expectedMint : Map[ByteArray]Int = expectedValue.get_policy(mph);\n    actualMint : Map[ByteArray]Int = valueMinted.get_policy(mph);\n\n    // print(\"redeemer\" + sTxId.show() + \" \" + sIdx.show() + \" asset \" + assetName.show());\n    // expectedMint.for_each( (b : ByteArray, i: Int) -> {\n    //     print( \"expected: \" + b.show() + \" \" + i.show() )\n    // });\n    temp : []ByteArray = actualMint.fold( (l: []ByteArray, b : ByteArray, i: Int) -> {\n        l.find_safe((x : ByteArray) -> Bool { x == b }).switch{\n            None => l.prepend(b),\n            Some => error(\"UUT purposes not unique\")\n        }\n    }, []ByteArray{});\n    assert(temp == temp, \"prevent unused var\");\n\n    // actualMint.for_each( (b : ByteArray, i: Int) -> {\n    //     print( \"actual: \" + b.show() + \" \" + i.show() )\n    // });\n\n    expectationString : String = if( exact ) {\"\"} else {\"at least \"};\n    expectationsMet : Bool = if (exact) { \n        valueMinted  == expectedValue\n    } else { \n        valueMinted >= expectedValue\n    };\n\n    assert(expectationsMet, \"bad UUT mint has mismatch;\"+ \n        \"\\n   ... expected \"+ expectationString + expectedValue.show()+\n        \"   ... actual \"+ valueMinted.show()+\n        \"   ... diff = \\n\" + (expectedValue - valueMinted).show()\n    );\n    hasSeedUtxo(tx, sTxId, sIdx, \"UUT \"+purposes.join(\"+\"))\n}");
code$5.srcFile = "src/CapoMintHelpers.hl";
code$5.purpose = "module";
code$5.moduleName = "CapoMintHelpers";

const CapoMintHelpers = code$5;

const code$4 = 
new String("module StellarHeliosHelpers\n\nfunc didSign(ctx : ScriptContext, a: Address) -> Bool {\n    tx : Tx = ctx.tx;\n\n    pkh : PubKeyHash = a.credential.switch{\n        PubKey{h} => h,\n        _ => error(\"trustee can't be a contract\")\n    };\n    // print(\"checking if trustee signed: \" + pkh.show());\n\n    tx.is_signed_by(pkh)\n}\n\nfunc didSignInCtx(ctx: ScriptContext) -> (a: Address) -> Bool {\n    (a : Address) -> Bool {\n        didSign(ctx, a)\n    }\n}\n\n\n//! represents the indicated token name as a Value\nfunc mkTv(mph: MintingPolicyHash, tn: String, count : Int = 1) -> Value {\n    Value::new(\n        AssetClass::new(mph, tn.encode_utf8()), \n        count\n    )\n}\n\n//! makes a predicate for checking outputs against an expected value\nfunc outputHas(v: Value, addr: Option[Address]=Option[Address]::None) -> (TxOutput) -> Bool {\n    (txo: TxOutput) -> Bool {\n        txo.value.contains(v) &&\n        addr.switch {\n            None => true,\n            Some{dest} => txo.address == dest\n        }\n    }\n}\n\n//! tests a transaction for an expected output value\nfunc txHasOutput(tx: Tx, v: Value, addr: Option[Address] = Option[Address]::None) -> Bool {\n    tx.outputs.find_safe(\n        outputHas(v, addr)\n   ).switch{\n        None => false,\n        Some => true\n    }\n}\n");
code$4.srcFile = "src/StellarHeliosHelpers.hl";
code$4.purpose = "module";
code$4.moduleName = "StellarHeliosHelpers";

const StellarHeliosHelpers = code$4;

const code$3 = 
new String("module CapoDelegateHelpers\n\nimport {\n    txHasOutput,\n    mkTv\n} from StellarHeliosHelpers\n\nstruct RelativeDelegateLink {\n    uutName: String\n    strategyName: String\n    reqdAddr: Option[Address]\n    addrHint: []Address\n}\n\nfunc requiresValidDelegate(\n    dd: RelativeDelegateLink, \n    mph: MintingPolicyHash, \n    ctx : ScriptContext\n) -> Bool {\n    RelativeDelegateLink{uut, strategy, reqdAddr, _} = dd;\n    if (!(strategy.encode_utf8().length < 4)) {\n        error(\"strategy must be at least 4 bytes\")\n    };\n\n    //! the delegate is valid as long as the transaction pays the UUT into the indicated address\n    //   ... that address might not be the permanent address for a \"bearer\" strategy, but\n    //   ... for other strategies, it should be.  So we just check it the same way for all cases.\n    //! the uut can be minted in the current transaction, or transferred from anywhere.\n    txHasOutput(ctx.tx, mkTv(mph, uut), reqdAddr )\n}");
code$3.srcFile = "src/delegation/CapoDelegateHelpers.hl";
code$3.purpose = "module";
code$3.moduleName = "CapoDelegateHelpers";

const CapoDelegateHelpers = code$3;

const _uutName = Symbol("uutName");
const maxUutName = 32;
class UutName {
  [_uutName];
  purpose;
  constructor(purpose, un) {
    this.purpose = purpose;
    if (un.length > maxUutName) {
      throw new Error(`uut name '${un}' exceeds max length of ${maxUutName}`);
    }
    this[_uutName] = un;
  }
  get name() {
    return this[_uutName];
  }
  toString() {
    return this[_uutName];
  }
}
const PARAM_IMPLIED = Symbol("paramImplied");
class DelegateConfigNeeded extends Error {
  errors;
  availableStrategies;
  constructor(message, options) {
    super(message);
    const { errors, availableStrategies } = options;
    if (errors)
      this.errors = errors;
    if (availableStrategies)
      this.availableStrategies = availableStrategies;
  }
}
function variantMap(vm) {
  return vm;
}
//! declaration for a variant of a Role:
//! a map of delegate selections needed for a transaction 
//! a single delegate selection, where a person chooses 
function selectDelegate(sd) {
  return sd;
}
//! a complete, validated configuration for a specific delegate.

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
class DefaultMinter extends StellarContract {
  contractSource() {
    return code$6;
  }
  importModules() {
    return [
      StellarHeliosHelpers,
      CapoDelegateHelpers,
      CapoMintHelpers
    ];
  }
  async txnWithUuts(tcx, uutPurposes, seedUtxo, role) {
    const { txId, utxoIdx } = seedUtxo.outputId;
    const { blake2b } = Crypto;
    if (role && uutPurposes.length !== 1)
      throw new Error(`role uut must have exactly one purpose`);
    const uutMap = Object.fromEntries(
      uutPurposes.map((uutPurpose) => {
        const txoId = txId.bytes.concat([
          "@".charCodeAt(0),
          utxoIdx
        ]);
        const uutName = new UutName(uutPurpose, `${uutPurpose}-${bytesToHex(
          blake2b(txoId).slice(0, 6)
        )}`);
        return [
          uutPurpose,
          uutName
        ];
      })
    );
    if (role)
      uutMap[role] = uutMap[uutPurposes[0]];
    if (tcx.state.uuts)
      throw new Error(`uuts are already there`);
    tcx.state.uuts = uutMap;
    return tcx;
  }
  async txnCreatingUuts(initialTcx, uutPurposes, seedUtxo) {
    const gettingSeed = seedUtxo ? Promise.resolve(seedUtxo) : new Promise((res) => {
      //!!! make it big enough to serve minUtxo for the new UUT(s)
      const uutSeed = this.mkValuePredicate(BigInt(42e3), initialTcx);
      this.mustFindActorUtxo(
        `for-uut-${uutPurposes.join("+")}`,
        uutSeed,
        initialTcx
      ).then(res);
    });
    return gettingSeed.then(async (seedUtxo2) => {
      const tcx = await this.txnWithUuts(initialTcx, uutPurposes, seedUtxo2, "");
      const vEntries = this.mkUutValuesEntries(tcx.state.uuts);
      tcx.addInput(seedUtxo2);
      const { txId: seedTxn, utxoIdx: seedIndex } = seedUtxo2.outputId;
      tcx.attachScript(this.compiledScript).mintTokens(
        this.mintingPolicyHash,
        vEntries,
        this.mintingUuts({
          seedTxn,
          seedIndex,
          purposes: uutPurposes
        }).redeemer
      );
      return tcx;
    });
  }
  mkUutValuesEntries(uutMap) {
    return Object.entries(uutMap).map(([_purpose, uut]) => {
      return this.mkValuesEntry(uut.name, BigInt(1));
    });
  }
  //! overrides base getter type with undefined not being allowed
  get mintingPolicyHash() {
    return super.mintingPolicyHash;
  }
  mintingCharter({
    owner
  }) {
    const { DelegateDetails: hlDelegateDetails, Redeemer } = this.scriptProgram.types;
    const t = new Redeemer.mintingCharter(
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
    const t = new this.scriptProgram.types.Redeemer.mintingUuts(
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
      void 0,
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
  async txnMintingCharter(tcx, { owner, authZor }) {
    const charterVE = this.charterTokenAsValuesEntry;
    const authzVE = this.mkValuesEntry(authZor.name, BigInt(1));
    return tcx.mintTokens(
      this.mintingPolicyHash,
      [charterVE, authzVE],
      this.mintingCharter({
        owner
      }).redeemer
    ).attachScript(this.compiledScript);
  }
}
__decorateClass$4([
  partialTxn
], DefaultMinter.prototype, "txnWithUuts", 1);
__decorateClass$4([
  Activity.partialTxn
], DefaultMinter.prototype, "txnCreatingUuts", 1);
__decorateClass$4([
  Activity.redeemer
], DefaultMinter.prototype, "mintingCharter", 1);
__decorateClass$4([
  Activity.redeemer
], DefaultMinter.prototype, "mintingUuts", 1);
__decorateClass$4([
  Activity.partialTxn
], DefaultMinter.prototype, "txnMintingCharter", 1);

const TODO = Symbol("needs to be implemented");
function hasReqts(reqtsMap) {
  return reqtsMap;
}
hasReqts.TODO = TODO;

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
//!!! todo: let this be parameterized for more specificity
//!!! todo: let this be parameterized for more specificity
class Capo extends StellarContract {
  constructor(args) {
    super(args);
    const { Datum: Datum2, Redeemer } = this.scriptProgram.types;
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
  txnCreatingUuts(tcx, uutPurposes, seedUtxo) {
    return this.minter.txnCreatingUuts(tcx, uutPurposes, seedUtxo);
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
    const r = this.scriptProgram.types.Redeemer;
    const { usingAuthority } = r;
    if (!usingAuthority) {
      throw new Error(
        `invalid contract without a usingAuthority redeemer`
      );
    }
    const t = new usingAuthority();
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
  importModules() {
    return [StellarHeliosHelpers, CapoDelegateHelpers, CapoMintHelpers];
  }
  // @txn
  // async mkTxnMintCharterToken(
  //     datumArgs: charterDatumType,
  //     tcx: StellarTxnContext = new StellarTxnContext()
  // ): Promise<StellarTxnContext | never> {
  //     console.log(
  //         `minting charter from seed ${this.paramsIn.seedTxn.hex.substring(
  //             0,
  //             12
  //         )}…@${this.paramsIn.seedIndex}`
  //     );
  //     return this.mustGetContractSeedUtxo().then((seedUtxo) => {
  //         const v = this.tvCharter();
  //         const datum = this.mkDatumCharterToken(datumArgs);
  //         const output = new TxOutput(this.address, v, datum);
  //         output.correctLovelace(this.networkParams);
  //         tcx.addInput(seedUtxo).addOutputs([output]);
  //         return this.minter!.txnMintingCharter(tcx, {
  //             owner: this.address,
  //             delegate
  //         })
  //     });
  // }
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
    return this.mustFindCharterUtxo().then(async (ctUtxo) => {
      await this.txnAddCharterAuthz(
        tcx,
        ctUtxo.origOutput.datum
      );
      if (true === redeemerOrRefInput) {
        if (newDatumOrForceRefScript && true !== newDatumOrForceRefScript)
          throw new Error(
            `when using reference input for charter, arg3 can only be true (or may be omitted)`
          );
        tcx.tx.addRefInput(
          ctUtxo,
          newDatumOrForceRefScript ? this.compiledScript : void 0
        );
      } else {
        const redeemer = redeemerOrRefInput;
        const newDatum = newDatumOrForceRefScript;
        if (true === newDatum)
          throw new Error(
            `wrong type for newDatum when not using reference input for charter`
          );
        tcx.addInput(ctUtxo, redeemer.redeemer).attachScript(
          this.compiledScript
        );
        const datum = newDatum || ctUtxo.origOutput.datum;
        this.txnKeepCharterToken(tcx, datum);
      }
      return tcx;
    });
  }
  // non-activity partial
  async txnUpdateCharterUtxo(tcx, redeemer, newDatum) {
    return this.txnMustUseCharterUtxo(tcx, redeemer, newDatum);
  }
  // non-activity partial
  txnKeepCharterToken(tcx, datum) {
    const txo = new TxOutput(this.address, this.tvCharter(), datum);
    txo.correctLovelace(this.networkParams);
    tcx.addOutput(txo);
    return tcx;
  }
  async txnAddAuthority(tcx) {
    return this.txnMustUseCharterUtxo(tcx, this.usingAuthority());
  }
  //! it can provide minter-targeted params through getMinterParams()
  getMinterParams() {
    return this.configIn;
  }
  getCapoRev() {
    return 1n;
  }
  getContractScriptParams(params) {
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
    this.configIn;
    const minter = this.addScriptWithParams(minterClass, params);
    const { mintingCharter, mintingUuts } = minter.scriptProgram.types.Redeemer;
    if (!mintingCharter)
      throw new Error(
        `minting script doesn't offer required 'mintingCharter' activity-redeemer`
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
    const { seedTxn, seedIndex } = this.configIn;
    console.log(
      `seeking seed txn ${seedTxn.hex.substring(0, 12)}\u2026@${seedIndex}`
    );
    return this.mustFindActorUtxo(
      "seed",
      (u) => {
        const { txId, utxoIdx } = u.outputId;
        if (txId.eq(seedTxn) && BigInt(utxoIdx) == seedIndex) {
          return u;
        }
      },
      "already spent?"
    );
  }
  withDelegates(delegates) {
    const tcx = new StellarTxnContext();
    tcx.state.delegates = delegates;
    return tcx;
  }
  txnGetSelectedDelegateConfig(tcx, roleName) {
    const selected = this.txnMustSelectDelegate(tcx, roleName);
    const { strategyName, config: selectedConfig } = selected;
    const { roles } = this;
    const foundStrategies = roles[roleName];
    const selectedStrategy = foundStrategies[strategyName];
    const stratConfig = selectedStrategy.partialConfig || {};
    return {
      ...stratConfig,
      ...selectedConfig
    };
  }
  txnMustSelectDelegate(tcx, roleName) {
    const { delegates: selectedDelegates } = tcx.state;
    let selected = selectedDelegates[roleName];
    const role = this.roles[roleName];
    if (!selected) {
      if (role.default) {
        selected = {
          strategyName: "default",
          config: {}
        };
      }
    }
    if (!selected) {
      const foundDelegateSelections = Object.keys(selectedDelegates);
      if (!foundDelegateSelections.length)
        foundDelegateSelections.push("\u2039none\u203A");
      throw new DelegateConfigNeeded(
        `no selected or default delegate for role '${roleName}' found in transaction-context.  
 Hint:   use \u2039capo instance\u203A.withDelegates(delegates) to select delegates by role name
    (found selections: ${foundDelegateSelections.join(
          ", "
        )})`,
        { availableStrategies: Object.keys(role) }
      );
    }
    return selected;
  }
  //! stacks partial and implied configuration settings, validates and returns a good configuration
  //  ... or throws errors
  txnMustConfigureSelectedDelegate(tcx, roleName) {
    let selected = this.txnMustSelectDelegate(tcx, roleName);
    const { strategyName, config: selectedConfig } = selected;
    const { roles } = this;
    const uut = tcx.state.uuts[roleName];
    const impliedSettings = this.mkImpliedSettings(uut);
    const foundStrategies = roles[roleName];
    const selectedStrategy = foundStrategies[strategyName];
    if (!selectedStrategy) {
      const e = new DelegateConfigNeeded(
        `invalid strategy name '${strategyName}' for role '${roleName}'`,
        {
          availableStrategies: Object.keys(foundStrategies)
        }
      );
      throw e;
    }
    const { delegateClass, validateConfig } = selectedStrategy;
    const { defaultParams: defaultParamsFromDelegateClass } = delegateClass;
    const scriptParamsFromStrategyVariant = selected.config;
    const mergedParams = {
      ...defaultParamsFromDelegateClass,
      ...scriptParamsFromStrategyVariant || {},
      ...impliedSettings,
      ...selectedConfig
    };
    //! it validates the net configuration so it can return a working config.
    const errors = validateConfig(mergedParams);
    if (errors) {
      throw new DelegateConfigNeeded(
        "validation errors in contract params:\n" + errorMapAsString(errors),
        { errors }
      );
    }
    return {
      roleName,
      strategyName,
      config: mergedParams,
      delegateClass
    };
  }
  mkImpliedSettings(uut) {
    return {
      uut: new AssetClass({
        mph: this.mph,
        tokenName: this.stringToNumberArray(uut.name)
      })
    };
  }
  txnMustGetDelegate(tcx, roleName, configuredDelegate) {
    const sdd = configuredDelegate || this.txnMustConfigureSelectedDelegate(tcx, roleName);
    const { delegateClass, config: scriptParams } = sdd;
    try {
      const configured = this.addScriptWithParams(
        delegateClass,
        scriptParams
      );
      return configured;
    } catch (e) {
      const t = e.message.match(/invalid parameter name '([^']+)'$/);
      const [_, badParamName] = t || [];
      if (badParamName) {
        throw new DelegateConfigNeeded(
          "configuration error while parameterizing contract script",
          { errors: { [badParamName]: e.message } }
        );
      }
      throw e;
    }
  }
  async connectDelegateWith(roleName, delegateLink) {
    const role = this.roles[roleName];
    //!!! work on type-safety with roleName + available roles
    const {
      strategyName,
      uutName,
      reqdAddress,
      addressesHint,
      config: linkedConfig
    } = delegateLink;
    const selectedStrat = role[strategyName];
    if (!selectedStrat) {
      throw new Error(
        `mismatched strategyName '${strategyName}' in delegate link for role '${roleName}'`
      );
    }
    const { delegateClass, config: stratSettings } = selectedStrat;
    const config = {
      ...stratSettings,
      ...this.mkImpliedSettings(new UutName("some-delegate", uutName)),
      ...linkedConfig
    };
    const { setup } = this;
    return new delegateClass({ setup, config });
  }
  capoRequirements() {
    return hasReqts({
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
          "That UUT (a Value) is returned, and then should be added to a TxOutput.",
          "The partial-helper doesn't constrain the semantics of the UUT.",
          "The uniqueness level can be iterated in future as needed.",
          "The UUT's token-name combines its textual purpose with a short hash ",
          "   ... of the seed UTxO, formatted with bech32"
        ],
        mech: [
          "Building a txn with a UUT involves using the txnCreatingUuts partial-helper on the Capo.",
          "Fills tcx.state.uuts with purpose-keyed unique token-names",
          "The UUT uses the seed-utxo pattern to form 64 bits of uniqueness, so that token-names stay short-ish."
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
        mech: [],
        requires: [
          "supports well-typed role declarations and strategy-adding",
          "supports just-in-time strategy-selection using withDelegates() and txnMustGetDelegate()",
          "supports concrete resolution of existing role delegates"
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
          "Each role uses a RoleVariants structure which can accept new variants"
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
          "supports concrete resolution of existing role delegates"
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
    });
  }
}
__decorateClass$3([
  Activity.partialTxn
], Capo.prototype, "txnCreatingUuts", 1);
__decorateClass$3([
  Activity.redeemer
], Capo.prototype, "usingAuthority", 1);
__decorateClass$3([
  partialTxn
], Capo.prototype, "txnMustUseCharterUtxo", 1);
__decorateClass$3([
  partialTxn
], Capo.prototype, "txnUpdateCharterUtxo", 1);
__decorateClass$3([
  partialTxn
], Capo.prototype, "txnKeepCharterToken", 1);
__decorateClass$3([
  partialTxn
], Capo.prototype, "txnAddAuthority", 1);

const code$2 = 
new String("spending SampleMintDelegate\n\nconst rev : Int = 1\nconst instance : ByteArray = #67656e6572616c\n\n// import { \n//     preventCharterChange\n// } from MultiSigAuthority\n\n// struct Datum {\n//     hi: String\n// }\n\n// func main(datum: Datum,_,ctx: ScriptContext) -> Bool {\n//     preventCharterChange(ctx, datum) \n// }\n\nfunc main(_,_,_) -> Bool {\n    true\n}\n");
code$2.srcFile = "src/delegation/BasicMintDelegate.hl";
code$2.purpose = "spending";
code$2.moduleName = "SampleMintDelegate";

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
//!!! TODO: include adapter(s) for Datum, which has the same essential shape
class BasicMintDelegate extends StellarContract {
  static currentRev = 1n;
  static get defaultParams() {
    return { rev: this.currentRev };
  }
  contractSource() {
    return code$2;
  }
  getContractScriptParams(config) {
    return {
      rev: config.rev
    };
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
__decorateClass$2([
  Activity.partialTxn
], BasicMintDelegate.prototype, "txnCreatingTokenPolicy", 1);

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
    const strella = this.initStrella(TargetClass, this.params);
    this.strella = strella;
    this.address = strella.address;
    return strella;
  }
  initStrella(TargetClass, params) {
    return new TargetClass({
      config: params,
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

const code$1 = 
new String("spending DefaultCapo\n\n// needed in helios 0.13: defaults\nconst mph : MintingPolicyHash = MintingPolicyHash::new(#1234)\nconst rev : Int = 1\n\nimport { \n    RelativeDelegateLink,\n    requiresValidDelegate\n} from CapoDelegateHelpers\n\nimport {\n    mkTv,\n    txHasOutput,\n    didSign,\n    didSignInCtx\n} from StellarHeliosHelpers\n\nenum Datum {\n    CharterToken {\n        govAuthorityLink: RelativeDelegateLink\n    }\n}\n\nenum Redeemer {\n    updatingCharter    \n    usingAuthority\n}\n\nfunc requiresAuthorization(ctx: ScriptContext, datum: Datum) -> Bool {\n    Datum::CharterToken{\n        RelativeDelegateLink{uutName, _, _, _}\n    } = datum;\n\n    assert(txHasOutput(ctx.tx,  mkTv(mph, uutName)),\n        \"missing required authZor token \"+uutName\n    );\n    true\n}\n\nfunc getCharterOutput(tx: Tx) -> TxOutput {\n    charterTokenValue : Value = Value::new(\n        AssetClass::new(mph, \"charter\".encode_utf8()), \n        1\n    );\n    tx.outputs.find_safe(\n        (txo : TxOutput) -> Bool {\n            txo.value >= charterTokenValue\n        }\n    ).switch{\n        None => error(\"this could only happen if the charter token is burned.\"),\n        Some{o} => o\n    }\n}\n\nfunc preventCharterChange(ctx: ScriptContext, datum: Datum) -> Bool {\n    tx: Tx = ctx.tx;\n\n    charterOutput : TxOutput = getCharterOutput(tx);\n\n    cvh : ValidatorHash = ctx.get_current_validator_hash();\n    myself : Credential = Credential::new_validator(cvh);\n    if (charterOutput.address.credential != myself) {\n        actual : String = charterOutput.address.credential.switch{\n            PubKey{pkh} => \"pkh:🔑#\" + pkh.show(),\n            Validator{vh} => \"val:📜#:\" + vh.show()\n        };\n        error(\n            \"charter token must be returned to the contract \" + cvh.show() +\n            \"... but was sent to \" +actual\n        )\n    };\n\n    Datum::CharterToken{\n        RelativeDelegateLink{uut, strategy, reqdAddress, addressesHint}\n    } = datum;\n    Datum::CharterToken{\n        RelativeDelegateLink{newUut, newStrategy, newReqdAddress, newAddressesHint}\n    } = Datum::from_data( \n        charterOutput.datum.get_inline_data() \n    );\n    if ( !(\n        newUut  == uut &&\n        newStrategy == strategy  &&\n        newReqdAddress == reqdAddress &&\n        newAddressesHint == addressesHint\n    )) { \n        error(\"invalid update to charter settings\") \n    };\n\n    true\n}\n\nfunc main(datum: Datum, redeemer: Redeemer, ctx: ScriptContext) -> Bool {\n    tx: Tx = ctx.tx;\n    // now: Time = tx.time_range.start;\n    \n    notUpdatingCharter : Bool = redeemer.switch {\n        updatingCharter => false,  \n        _ => true\n    };\n    charterChangeAllowable : Bool = if(notUpdatingCharter) { \n        preventCharterChange(ctx, datum) // throws if it's not kosher\n     } else { \n        true // \"maybe\", really\n    };\n\n    redeemerSpecificChecks : Bool = redeemer.switch {\n        updatingCharter => { \n            //! guards from optimizing mph out of the program, screwing up parameterization\n            assert(mph.serialize() != datum.serialize(), \"guard failed\"); // can't fail.\n            \n            charterOutput : TxOutput = getCharterOutput(tx);\n            newDatum = Datum::from_data( \n                charterOutput.datum.get_inline_data() \n            );\n            Datum::CharterToken{delegate} = newDatum;\n\n            requiresValidDelegate(delegate, mph, ctx) &&\n            requiresAuthorization(ctx, datum)\n        },\n        // authorizeByCharter{otherRedeemerData, otherSignatures} => {            \n        //     false // todo support authorizing **other** things to be done with this token\n        // },\n        usingAuthority => {\n            assert(mph.serialize() != datum.serialize(), \"guard failed\"); // can't fail.\n\n            notUpdatingCharter &&\n            requiresAuthorization(ctx, datum)\n        }\n    };\n\n    charterChangeAllowable &&\n    redeemerSpecificChecks &&\n    tx.serialize() != datum.serialize()\n}\n");
code$1.srcFile = "src/DefaultCapo.hl";
code$1.purpose = "spending";
code$1.moduleName = "DefaultCapo";

//! an interface & base class to enforce policy for authorizing activities
class AuthorityPolicy extends StellarContract {
  static currentRev = 1n;
  static get defaultParams() {
    return { rev: this.currentRev };
  }
  // // @Activity.redeemer
  // protected x(tokenName: string): isActivity {
  //     const t =
  //         new this.scriptProgram.types.Redeemer.commissioningNewToken(
  //             tokenName
  //         );
  //     return { redeemer: t._toUplcData() };
  // }
  //! it has a lifecycle method coordinating authority-creation in abstract way
  async txnCreatingAuthority(tcx, tokenId, delegateAddr) {
    tokenId.toFingerprint();
    debugger;
    throw new Error(`todo`);
  }
  // static mkDelegateWithArgs(a: RCPolicyArgs) {
  //
  // }
  authorityPolicyRequirements() {
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
          "  ... in whatever way is considered appropriate for its use-case"
        ],
        mech: [],
        requires: []
      },
      "implementations MUST provide an essential interface for transaction-building": {
        purpose: "enabling a strategy-agnostic interface for making transactions using any supported strategy-variant",
        details: [
          "Subclasses MUST implement the interface methods",
          "  ... in whatever way is considered appropriate for its use-case.",
          "An interface method whose requirement is marked with 'MAY/SHOULD' behavior, ",
          "  ... MUST still implement the method satisfying the interface, ",
          "  ... but MAY throw an UnsupportedAction error, to indicate that",
          "  ... the strategy variant has no meaningful action to perform ",
          "  ... that would serve the method's purpose"
        ],
        mech: [],
        requires: [
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
class AddressAuthorityPolicy extends AuthorityPolicy {
  loadProgramScript(params) {
    return null;
  }
  usingAuthority() {
    const r = this.scriptProgram?.types.Redeemer;
    const { usingAuthority } = r;
    if (!usingAuthority) {
      throw new Error(
        `invalid contract without a usingAuthority redeemer`
      );
    }
    const t = new usingAuthority();
    return { redeemer: t._toUplcData() };
  }
  //! impls MUST resolve the indicated token to a specific UTxO
  //  ... or throw an informative error
  async txnMustFindAuthorityToken(tcx) {
    const { uut, addrHint } = this.configIn;
    const v = this.mkAssetValue(uut);
    debugger;
    return this.mustFindActorUtxo(
      `authority-token(address strat)`,
      this.mkTokenPredicate(v),
      tcx,
      "are you connected to the right wallet address? " + (addrHint?.length ? "  maybe at:\n    " + addrHint.join("\n or ") : "")
    );
  }
  //! creates a UTxO depositing the indicated token-name into the delegated destination.
  async txnReceiveAuthorityToken(tcx, delegateAddr) {
    const { uut } = this.configIn;
    const v = this.mkAssetValue(uut, 1);
    const output = new TxOutput(delegateAddr, v);
    output.correctLovelace(this.networkParams);
    tcx.addOutput(output);
    return tcx;
  }
  //! Adds the indicated token to the txn as an input with apporpriate activity/redeemer
  //! EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
  async txnGrantAuthority(tcx, fromFoundUtxo) {
    //! no need to specify a redeemer
    return tcx.addInput(fromFoundUtxo);
  }
  //! Adds the indicated utxo to the transaction with appropriate activity/redeemer
  //  ... allowing the token to be burned by the minting policy.
  //! EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
  async txnRetireCred(tcx, fromFoundUtxo) {
    //! no need to specify a redeemer
    return tcx.addInput(fromFoundUtxo);
  }
}
__decorateClass$1([
  Activity.redeemer
], AddressAuthorityPolicy.prototype, "usingAuthority", 1);

const code = 
new String("spending MultiSigAuthority\n\nconst rev : Int = 1\nconst instance : ByteArray = #67656e6572616c\n\nfunc preventCharterChange(ctx: ScriptContext, datum: Datum) -> Bool {\n    tx: Tx = ctx.tx;\n\n    charterOutput : TxOutput = getCharterOutput(tx);\n\n    cvh : ValidatorHash = ctx.get_current_validator_hash();\n    myself : Credential = Credential::new_validator(cvh);\n    if (charterOutput.address.credential != myself) {\n        actual : String = charterOutput.address.credential.switch{\n            PubKey{pkh} => \"pkh:🔑#\" + pkh.show(),\n            Validator{vh} => \"val:📜#:\" + vh.show()\n        };\n        error(\n            \"charter token must be returned to the contract \" + cvh.show() +\n            \"... but was sent to \" +actual\n        )\n    };\n\n    Datum::CharterToken{trustees, minSigs} = datum;\n    Datum::CharterToken{newTrustees, newMinSigs} = Datum::from_data( \n        charterOutput.datum.get_inline_data() \n    );\n    if ( !(\n        newTrustees == trustees &&\n        newMinSigs == minSigs\n    )) { \n        error(\"invalid update to charter settings\") \n    };\n\n    true\n}\n\nfunc requiresValidMinSigs(datum: Datum) -> Bool {\n    Datum::CharterToken{trustees, minSigs} = datum;\n\n    assert(\n        minSigs <= trustees.length,\n        \"minSigs can't be more than the size of the trustee-list\"\n    );\n\n    true\n}\n\nfunc requiresProofOfNewTrustees(\n    ctx: ScriptContext,\n    datum: Datum\n) -> Bool {\n    Datum::CharterToken{newTrustees, _} = datum;\n\n    assert(\n        newTrustees.all(didSignInCtx(ctx)), \n        \"all the new trustees must sign\"\n    );\n\n    requiresValidMinSigs(datum)\n}\n\n//!!! adapt to use my UUT\nfunc requiresAuthorization(ctx: ScriptContext, datum: Datum) -> Bool {\n    Datum::CharterToken{trustees, minSigs} = datum;\n\n    foundSigs: Int = trustees.fold[Int](\n        (count: Int, a: Address) -> Int {            \n            count + if (didSign(ctx, a)) {1} else {0}\n        }, 0\n    );\n    assert(foundSigs >= minSigs, \n        \"not enough trustees (\"+foundSigs.show()+ \" of \" + minSigs.show() + \" needed) have signed the tx\" \n    );\n\n    true\n}\nfunc main(_,_,_) -> Bool {\n    true\n}\n// for updating trustee list:\n// requiresProofOfNewTrustees(ctx, newDatum)\n");
code.srcFile = "src/authority/MultisigAuthorityPolicy.hl";
code.purpose = "spending";
code.moduleName = "MultiSigAuthority";

//! a contract enforcing policy for a registered credential
class MultisigAuthorityPolicy extends AuthorityPolicy {
  static currentRev = 1n;
  static get defaultParams() {
    return { rev: this.currentRev };
  }
  contractSource() {
    return code;
  }
  // // @Activity.redeemer
  // protected x(tokenName: string): isActivity {
  //     const t =
  //         new this.scriptProgram.types.Redeemer.commissioningNewToken(
  //             tokenName
  //         )
  //     return { redeemer: t._toUplcData() }
  // }
  // @Activity.partialTxn
  // async txnFresheningCredInfo(
  //     tcx: StellarTxnContext,
  //     tokenName: string
  // ): Promise<StellarTxnContext> {
  //     return tcx
  // }
  // ! impls MUST resolve the indicated token to a specific UTxO
  //  ... or throw an informative error
  async txnMustFindAuthorityToken(tcx) {
    const {
      addrHint,
      uut,
      reqdAddress
    } = this.configIn;
    return this.mustFindMyUtxo("authorityToken", this.mkTokenPredicate(uut));
  }
  async txnReceiveAuthorityToken(tcx, delegateAddr) {
    throw new Error(`implementation TODO`);
  }
  //! Adds the indicated token to the txn as an input with apporpriate activity/redeemer
  async txnGrantAuthority(tcx, fromFoundUtxo) {
    return tcx;
  }
  //! Adds the indicated utxo to the transaction with appropriate activity/redeemer
  //  ... allowing the token to be burned by the minting policy.
  async txnRetireCred(tcx, fromFoundUtxo) {
    return tcx;
  }
  requirements() {
    return hasReqts({
      "provides arms-length proof of authority to any other contract": {
        purpose: "to decouple authority administration from its effects",
        details: [
          "See GenericAuthority for more background on authority delegation.",
          "This policy uses a trustee list and minSigs threshold to provide multisig-based authority"
        ],
        mech: [],
        requires: [
          "positively governs spend of the UUT",
          "the trustee threshold is required to spend its UUT",
          "the trustee group can be changed"
        ]
      },
      "positively governs spend of the UUT": {
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
          "the UUT has a trustee list in its Datum structure",
          "the UUT has a threshold setting in its Datum structure",
          "the Settings datum is updated when needed to reflect new trustees/thresholds"
        ],
        requires: [
          "TODO: has a unique authority UUT",
          "TODO: the trustee threshold is required to spend its UUT",
          "TODO: the trustee group can be changed"
        ]
      },
      "TODO: has a unique authority UUT": hasReqts.TODO,
      "TODO: the trustee threshold is required to spend its UUT": hasReqts.TODO,
      "TODO: the trustee group can be changed": hasReqts.TODO,
      "the trustee threshold is required to spend its UUT": {
        purpose: "allows progress in case a small fraction of trustees may not be available",
        details: [
          "A group can indicate how many of the trustees are required to provide their explicit approval",
          "If a small number of trustees lose their keys, this allows the remaining trustees to directly regroup",
          "For example, they can replace the trustee list with a new set of trustees and a new approval threshold",
          "Normal day-to-day administrative activities can also be conducted while a small number of trustees are on vacation or otherwise temporarily unavailable"
        ],
        mech: [
          "TODO: doesn't allow the UUT to be spent without enough minSigs from the trustee list"
        ],
        requires: []
      },
      "the trustee group can be changed": {
        purpose: "to ensure administrative continuity for the group",
        details: [
          "When the needed threshold for administrative modifications is achieved, the Settings datum can be updated",
          "When changing trustees, it should guard against mistakes in the new trustee list, ",
          "  ... by validating signatures of the new trustees",
          "  ... and by validating new minSigs"
        ],
        mech: [
          "TODO: trustee list can be changed if the signature threshold is met",
          "TODO: the new trustees must sign any change of trustees",
          "TODO: does not allow minSigs to exceed the number of trustees"
        ],
        requires: []
      }
    });
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
class DefaultCapo extends Capo {
  contractSource() {
    return code$1;
  }
  // // @Activity.redeemer
  // updatingCharter() : isActivity {
  //     return this.updatingDefaultCharter()
  // }
  get roles() {
    return {
      govAuthority: variantMap({
        address: {
          delegateClass: AddressAuthorityPolicy,
          partialConfig: {
            uut: PARAM_IMPLIED
          },
          validateConfig(args) {
            const { rev, uut } = args;
            const errors = {};
            if (!rev)
              errors.rev = ["required"];
            if (!uut)
              errors.uut = ["required"];
            if (Object.keys(errors).length > 0)
              return errors;
            return void 0;
          }
        },
        multisig: {
          delegateClass: MultisigAuthorityPolicy,
          partialConfig: {
            uut: PARAM_IMPLIED
          },
          validateConfig(args) {
            const { rev, uut } = args;
            const errors = {};
            if (!rev)
              errors.rev = ["required"];
            if (!uut)
              errors.uut = ["required"];
            if (Object.keys(errors).length > 0)
              return errors;
            return void 0;
          }
        }
      }),
      mintDelegate: variantMap({
        default: {
          delegateClass: BasicMintDelegate,
          partialConfig: {},
          validateConfig(args) {
            return void 0;
          }
        }
      })
    };
  }
  mkDatumCharterToken(args) {
    //!!! todo: make it possible to type these datum helpers more strongly
    console.log("--> mkDatumCharter", args);
    const {
      Datum: { CharterToken: hlCharterToken },
      RelativeDelegateLink: hlRelativeDelegateLink
    } = this.scriptProgram.types;
    let {
      uutName,
      strategyName,
      reqdAddress: canRequireAddr,
      addressesHint = []
    } = args.govAuthorityLink;
    const OptAddr = Option(Address);
    const needsAddr = new OptAddr(canRequireAddr);
    const t = new hlCharterToken(
      new hlRelativeDelegateLink(
        uutName,
        strategyName,
        needsAddr,
        addressesHint
      )
    );
    return Datum.inline(t._toUplcData());
  }
  async txnAddCharterAuthz(tcx, datum2) {
    const charterDatum = await this.readDatum("CharterToken", datum2);
    console.log("add charter authz", charterDatum);
    charterDatum.govAuthorityLink;
    debugger;
    const authZor = await this.connectDelegateWith(
      "govAuthority",
      charterDatum.govAuthorityLink
    );
    const authZorUtxo = await authZor.txnMustFindAuthorityToken(tcx);
    authZor.txnGrantAuthority(tcx, authZorUtxo);
    return tcx;
  }
  //@ts-expect-error - typescript can't seem to understand that
  //    <Type> - govAuthorityLink + govAuthorityLink is <Type> again
  async mkTxnMintCharterToken(charterDatumArgs, existingTcx) {
    console.log(
      `minting charter from seed ${this.configIn.seedTxn.hex.substring(
        0,
        12
      )}\u2026@${this.configIn.seedIndex}`
    );
    const { strategyName } = charterDatumArgs.govAuthorityLink;
    const initialTcx = existingTcx || this.withDelegates({});
    return this.mustGetContractSeedUtxo().then(async (seedUtxo) => {
      const tcx = await this.minter.txnWithUuts(
        initialTcx,
        ["authZor"],
        seedUtxo,
        "govAuthority"
      );
      const { authZor } = tcx.state.uuts;
      this.txnGetSelectedDelegateConfig(
        tcx,
        "govAuthority"
      );
      this.txnMustConfigureSelectedDelegate(tcx, "govAuthority");
      const govAuthorityLink = {
        strategyName,
        uutName: authZor.name
      };
      const fullCharterArgs = {
        ...charterDatumArgs,
        govAuthorityLink
      };
      const datum2 = this.mkDatumCharterToken(fullCharterArgs);
      const output = new TxOutput(this.address, this.tvCharter(), datum2);
      output.correctLovelace(this.networkParams);
      tcx.addInput(seedUtxo);
      tcx.addOutputs([output]);
      console.log(
        " ---------------- CHARTER MINT ---------------------\n",
        txAsString(tcx.tx)
      );
      return this.minter.txnMintingCharter(tcx, {
        owner: this.address,
        authZor
      });
    });
  }
  updatingCharter() {
    const { RelativeDelegateLink: hlRelativeDelegateLink, Redeemer } = this.scriptProgram.types;
    const t = new Redeemer.updatingCharter();
    return { redeemer: t._toUplcData() };
  }
  async mkTxnUpdateCharter(args, tcx = new StellarTxnContext()) {
    return this.txnUpdateCharterUtxo(
      tcx,
      this.updatingCharter(),
      this.mkDatumCharterToken(args)
    );
  }
  requirements() {
    return hasReqts({
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
        impl: "txnMintCharterToken()",
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
      "can mint other tokens, on the authority of the Charter token": {
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
    });
  }
}
__decorateClass([
  datum
], DefaultCapo.prototype, "mkDatumCharterToken", 1);
__decorateClass([
  txn
], DefaultCapo.prototype, "mkTxnMintCharterToken", 1);
__decorateClass([
  Activity.redeemer
], DefaultCapo.prototype, "updatingCharter", 1);
__decorateClass([
  txn
], DefaultCapo.prototype, "mkTxnUpdateCharter", 1);

export { ADA, Activity, BasicMintDelegate, Capo, CapoTestHelper, DefaultCapo, DefaultMinter, StellarContract, StellarTestHelper, StellarTxnContext, addTestContext, assetsAsString, datum, errorMapAsString, hasReqts, heliosRollupLoader, lovelaceToAda, mkHeliosModule, partialTxn, txAsString, txInputAsString, txOutputAsString, txn, utxoAsString, utxosAsString, valueAsString, variantMap };
//# sourceMappingURL=stellar-contracts.mjs.map
