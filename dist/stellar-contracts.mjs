import * as helios from '@hyperionbt/helios';
import { bytesToText, textToBytes, Value, Assets, Tx, UplcProgram, Address, TxInput, ByteArray, ByteArrayData, TxOutput, TxOutputId, TxId, MintingPolicyHash, IntData, MapData, HeliosData, ConstrData, AssetClass, WalletHelper, Program, Option, Datum, bytesToHex, ValidatorHash, HInt, Crypto, NetworkParams, NetworkEmulator } from '@hyperionbt/helios';
export { helios };
import path from 'path';
import { createFilter } from 'rollup-pluginutils';

const _uutName = Symbol("uutName");
const maxUutName = 32;
class UutName {
  [_uutName];
  purpose;
  constructor(purpose, fullUutName) {
    this.purpose = purpose;
    if (Array.isArray(fullUutName)) {
      fullUutName = bytesToText(fullUutName);
    }
    if (fullUutName.length > maxUutName) {
      throw new Error(
        `uut name '${fullUutName}' exceeds max length of ${maxUutName}`
      );
    }
    this[_uutName] = fullUutName;
  }
  /**
   * the full uniquified name of this UUT
   * @remarks
   *
   * format: `purpose-‹...uniqifier...›`
   * @public
   **/
  get name() {
    return this[_uutName];
  }
  toString() {
    return this[_uutName];
  }
}

function mkUutValuesEntries(uuts) {
  const uutNs = Array.isArray(uuts) ? uuts : Object.values(uuts);
  const uniqs = [];
  for (const un of uutNs) {
    if (!uniqs.includes(un))
      uniqs.push(un);
  }
  return uniqs.map((uut) => mkValuesEntry(uut.name, BigInt(1)));
}
const stringToNumberArray = textToBytes;
function mkValuesEntry(tokenName, count) {
  const tnBytes = Array.isArray(tokenName) ? tokenName : stringToNumberArray(tokenName);
  return [tnBytes, count];
}
function mkTv(mph, tokenName, count = 1n) {
  const v = new Value(
    void 0,
    new Assets([[mph, [mkValuesEntry(tokenName, count)]]])
  );
  return v;
}

const emptyUuts = Object.freeze({});
class StellarTxnContext {
  tx = Tx.new();
  inputs = [];
  collateral;
  outputs = [];
  feeLimit;
  state;
  actor;
  neededSigners = [];
  constructor(actor, state = {}) {
    this.actor = actor;
    const { uuts = { ...emptyUuts }, ...moreState } = state;
    this.state = {
      uuts,
      ...moreState
    };
  }
  dump(networkParams) {
    const { tx } = this;
    return txAsString(tx, networkParams);
  }
  includeAddlTxn(txnName, txInfo) {
    const thisWithMoreType = this;
    thisWithMoreType.state.addlTxns = {
      ...thisWithMoreType.state.addlTxns || {},
      [txnName]: txInfo
    };
    return thisWithMoreType;
  }
  mintTokens(...args) {
    this.tx.mintTokens(...args);
    return this;
  }
  getSeedAttrs() {
    const { seedUtxo } = this.state;
    const { txId: seedTxn, utxoIdx: seedIndex } = seedUtxo.outputId;
    return { seedTxn, seedIndex: BigInt(seedIndex) };
  }
  reservedUtxos() {
    return [...this.inputs, this.collateral].filter(
      (x) => !!x
    );
  }
  utxoNotReserved(u) {
    if (this.collateral?.eq(u))
      return void 0;
    if (this.inputs.find((i) => i.eq(u)))
      return void 0;
    return u;
  }
  addUut(uutName, ...names) {
    this.state.uuts = this.state.uuts || {};
    for (const name of names) {
      this.state.uuts[name] = uutName;
    }
    return this;
  }
  addState(key, value) {
    this.state[key] = value;
    return this;
  }
  addCollateral(collateral) {
    if (!collateral.value.assets.isZero()) {
      throw new Error(
        `invalid attempt to add non-pure-ADA utxo as collateral`
      );
    }
    this.collateral = collateral;
    this.tx.addCollateral(collateral);
    return this;
  }
  validFor(durationMs, backwardMs = 3 * 60 * 1e3) {
    this.tx.validFrom(new Date(Date.now() - backwardMs)).validTo(new Date(Date.now() + durationMs));
    return this;
  }
  txRefInputs = [];
  /**
   * adds a reference input to the transaction context
   * @remarks
   *
   * idempotent version of helios addRefInput()
   *
   * @public
   **/
  addRefInput(...inputArgs) {
    const [input, ...moreArgs] = inputArgs;
    if (this.txRefInputs.find((v) => v.outputId.eq(input.outputId))) {
      console.warn("suppressing second add of refInput");
      return this;
    }
    this.txRefInputs.push(input);
    const t = this.tx.witnesses.scripts.length;
    this.tx.addRefInput(input, ...moreArgs);
    const t2 = this.tx.witnesses.scripts.length;
    if (t2 > t) {
      console.log(
        "      --- addRefInput added ",
        this.tx.witnesses.scripts.length - t,
        " to tx.scripts"
      );
    }
    return this;
  }
  addRefInputs(...args) {
    const [inputs] = args;
    for (const input of inputs) {
      this.addRefInput(input);
    }
    return this;
  }
  addInput(input, r) {
    if (input.address.pubKeyHash)
      this.neededSigners.push(input.address);
    this.inputs.push(input);
    this.tx.addInput(input, r?.redeemer);
    return this;
  }
  addInputs(inputs, r) {
    for (const input of inputs) {
      if (input.address.pubKeyHash)
        this.neededSigners.push(input.address);
    }
    this.inputs.push(...inputs);
    this.tx.addInputs(inputs, r.redeemer);
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
    throw new Error(
      `use addScriptProgram(), increasing the txn size, if you don't have a referenceScript.
Use <capo>.txnAttachScriptOrRefScript() to use a referenceScript when available.`
    );
  }
  addScriptProgram(...args) {
    const script = args[0];
    if (script instanceof UplcProgram) {
      const thisPurpose = script.properties.purpose;
      const whichHash = thisPurpose == "minting" ? "mintingPolicyHash" : thisPurpose == "staking" ? "stakingValidatorHash" : thisPurpose == "spending" ? "validatorHash" : "";
      const expected = script[whichHash];
      if (!whichHash || !expected)
        throw new Error(
          `unexpected script purpose ${script.properties.purpose} in attachScript()`
        );
      if (this.txRefInputs?.find((ri) => {
        const rs = ri.origOutput.refScript;
        if (!rs)
          return false;
        const { purpose } = rs.properties;
        if (purpose && purpose != thisPurpose)
          return false;
        const foundHash = ri.origOutput.refScript?.[whichHash];
        return foundHash.eq(expected);
      })) {
        console.log(
          "     --- txn already has this script as a refScript; not re-adding"
        );
        return this;
      }
    }
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
function assetsAsString(a) {
  const assets = a.assets;
  return (assets?.map(([policyId, tokenEntries]) => {
    const tokenString = tokenEntries.map(([nameBytes, count]) => {
      const nameString = hexToPrintableString(nameBytes.hex);
      const burn = count < 1 ? "\u{1F525}" : "";
      const burned = count < 1 ? "- BURN \u{1F525} " : "";
      return `${burn} ${count}\xD7\u{1F4B4} ${nameString} ${burned}`;
    }).join(" + ");
    return `\u2991${policyIdAsString(policyId)} ${tokenString}\u2992`;
  }) || []).join("\n  ");
}
function policyIdAsString(p) {
  const pIdHex = p.hex;
  return `\u{1F3E6} ${pIdHex.slice(0, 8)}\u2026${pIdHex.slice(-4)}`;
}
function lovelaceToAda(l) {
  const asNum = parseInt(l.toString());
  const ada = asNum && `${(Math.round(asNum / 1e3) / 1e3).toFixed(3)} ADA` || "";
  return ada;
}
function valueAsString(v) {
  const ada = lovelaceToAda(v.lovelace);
  const assets = assetsAsString(v.assets);
  return [ada, assets].filter((x) => !!x).join(" + ");
}
function txAsString(tx, networkParams) {
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
  if (!networkParams) {
    console.warn(
      new Error(`dumpAny: no networkParams; can't show txn size info!?!`)
    );
  }
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
  ${item.map((x2, i) => txInputAsString(
        x2,
        `\u27A1\uFE0F  @${1 + i} `
      )).join("\n  ")}`;
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
      item = ` \u2747\uFE0F  ${assetsAsString(item)}`;
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
    if ("signers" == x) {
      item = item.map((x2) => {
        if (!x2.hex)
          debugger;
        return `\u{1F511}#${x2.hex.slice(0, 6)}\u2026${x2.hex.slice(-4)}`;
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
        const addr = Address.fromHash(s.pubKeyHash);
        return `\u{1F58A}\uFE0F ${addrAsString(addr)} = \u{1F511}\u2026${s.pubKeyHash.hex.slice(
          -4
        )}`;
      });
      if (item.length > 1)
        item.unshift("");
      item = item.join("\n    ");
    }
    if ("redeemers" == x) {
      if (!item)
        continue;
      //!!! todo: augment with mph when that's available from the Activity.
      item = item.map((x2) => {
        const isIndeterminate = x2.inputIndex == -1;
        const indexInfo = isIndeterminate ? `spend txin #\u2039tbd\u203A` : "inputIndex" in x2 ? `spend txin \u27A1\uFE0F  @${1 + x2.inputIndex}` : `mint policy#${1 + x2.mphIndex}`;
        return `\u{1F3E7}  ${indexInfo} ${x2.data.toString()}`;
      });
      if (item.length > 1)
        item.unshift("");
      item = item.join("\n    ");
    }
    if ("scripts" == x) {
      if (!item)
        continue;
      item = item.map((s) => {
        try {
          const mph = s.mintingPolicyHash.hex;
          return `\u{1F3E6} ${mph.slice(0, 8)}\u2026${mph.slice(-4)} (minting): ${s.serializeBytes().length} bytes`;
        } catch (e) {
          const vh = s.validatorHash;
          const vhh = vh.hex;
          const addr = Address.fromHash(vh);
          return `\u{1F4DC} ${vhh.slice(0, 8)}\u2026${vhh.slice(
            -4
          )} (validator at ${addrAsString(addr)}): ${s.serializeBytes().length} bytes`;
        }
      });
      if (item.length > 1)
        item.unshift("");
      item = item.join("\n    ");
    }
    if ("refScripts" == x) {
      item = `${item.length} - see refInputs`;
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
    details += `  txId: ${tx.id().hex}`;
    if (networkParams)
      details += `  size: ${tx.toTxData(networkParams).toCbor().length} bytes`;
  } catch (e) {
    details = details + `(Tx not yet finalized!)`;
    if (networkParams)
      details += `
  - NOTE: can't determine txn size
`;
  }
  return details;
}
function txInputAsString(x, prefix = "-> ") {
  return `${prefix}${addrAsString(x.address)}${showRefScript(x.origOutput.refScript)} ${valueAsString(
    x.value
  )} = \u{1F4D6} ${txOutputIdAsString(x.outputId)}`;
}
function utxosAsString(utxos, joiner = "\n") {
  return utxos.map((u) => utxoAsString(u, " \u{1F4B5}")).join(joiner);
}
function txOutputIdAsString(x) {
  return txidAsString(x.txId) + `\u{1F539}#${x.utxoIdx}`;
}
function txidAsString(x) {
  const tid = x.hex;
  return `${tid.slice(0, 6)}\u2026${tid.slice(-4)}`;
}
function utxoAsString(x, prefix = "\u{1F4B5}") {
  return ` \u{1F4D6} ${txOutputIdAsString(x.outputId)}: ${txOutputAsString(
    x.origOutput,
    prefix
  )}`;
}
function datumAsString(d) {
  if (!d)
    return "";
  const dh = d.hash.hex;
  const dhss = `${dh.slice(0, 8)}\u2026${dh.slice(-4)}`;
  if (d.isInline())
    return `d\u2039inline:${dhss} - ${d.toCbor().length} bytes\u203A`;
  return `d\u2039hash:${dhss}\u2026\u203A`;
}
function showRefScript(rs) {
  if (!rs)
    return "";
  const thisPurpose = rs.properties?.purpose;
  const whichHash = thisPurpose == "minting" ? "mintingPolicyHash" : thisPurpose == "staking" ? "stakingValidatorHash" : "validatorHash";
  const expected = rs[whichHash];
  const rsh = expected.hex;
  const rshInfo = `${rsh.slice(0, 8)}\u2026${rsh.slice(-4)}`;
  return ` \u2039\u{1F4C0} refScript\u{1F4DC} ${rshInfo}: ${rs.calcSize()} bytes\u203A +`;
}
function txOutputAsString(x, prefix = "<-") {
  return `${prefix} ${addrAsString(x.address)}${showRefScript(x.refScript)} ${valueAsString(
    x.value
  )} ${datumAsString(x.datum)}`;
}
function addrAsString(address) {
  const bech32 = address.bech32 || address.toBech32();
  return `${bech32.slice(0, 14)}\u2026${bech32.slice(-4)}`;
}
function errorMapAsString(em, prefix = "  ") {
  return Object.keys(em).map((k) => `in field ${prefix}${k}: ${JSON.stringify(em[k])}`).join("\n");
}
function byteArrayListAsString(items, joiner = "\n  ") {
  return "[\n  " + items.map((ba) => byteArrayAsString(ba)).join(joiner) + "\n]\n";
}
function byteArrayAsString(ba) {
  return hexToPrintableString(ba.hex);
}
function dumpAny(x, networkParams) {
  if (Array.isArray(x)) {
    if (x[0] instanceof TxInput) {
      return "utxos: \n" + utxosAsString(x);
    }
    if (x[0] instanceof ByteArray || x[0] instanceof ByteArrayData) {
      return "byte array:\n" + byteArrayListAsString(x);
    }
  }
  if (x instanceof Tx) {
    return txAsString(x, networkParams);
  }
  if (x instanceof TxOutput) {
    return txOutputAsString(x);
  }
  if (x instanceof TxOutputId) {
    return txOutputIdAsString(x);
  }
  if (x instanceof TxId) {
    return txidAsString(x);
  }
  if (x instanceof TxInput) {
    return utxoAsString(x);
  }
  if (x instanceof Value) {
    return valueAsString(x);
  }
  if (x instanceof Address) {
    return addrAsString(x);
  }
  if (x instanceof MintingPolicyHash) {
    return policyIdAsString(x);
  }
  if (x instanceof StellarTxnContext) {
    return txAsString(x.tx, networkParams);
  }
  if (x instanceof ByteArray || x[0] instanceof ByteArrayData) {
    return byteArrayAsString(x);
  }
  debugger;
  return "dumpAny(): unsupported type or library mismatch";
}
if ("undefined" == typeof window) {
  globalThis.peek = dumpAny;
} else {
  window.peek = dumpAny;
}

class DatumAdapter {
  strella;
  constructor(strella) {
    this.strella = strella;
  }
  get onChainDatumType() {
    return this.strella.onChainDatumType;
  }
  get onChainTypes() {
    return this.strella.onChainTypes;
  }
  get capo() {
    if ("initSettingsAdapter" in this.strella)
      return this.strella;
    throw new Error(`not a capo instance: ${this.strella.constructor.name}`);
  }
  toRealNum(n) {
    const microInt1 = Number(n) * 1e6;
    BigInt(42.008.toFixed(0));
    let microInt2;
    try {
      microInt2 = BigInt(n.toFixed(0)) * 1000000n;
    } catch (e) {
    }
    if (microInt2 && microInt2 > Number.MAX_SAFE_INTEGER) {
      throw new Error(
        `microInt value too large for Number: ${microInt2}`
      );
    }
    return new IntData(BigInt(microInt1));
  }
  toMapData(k, transformer) {
    const t = new MapData(
      Object.entries(k).map(([key, value]) => {
        const keyBytes = new ByteArrayData(textToBytes(key));
        const uplcValue = transformer ? transformer(value) : value;
        return [keyBytes, uplcValue];
      })
    );
    return t;
  }
}

var __defProp$7 = Object.defineProperty;
var __getOwnPropDesc$7 = Object.getOwnPropertyDescriptor;
var __decorateClass$7 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$7(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$7(target, key, result);
  return result;
};
let configuredNetwork = void 0;
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
const isInternalConstructor = Symbol("internalConstructor");
//!!! todo: type configuredStellarClass = class -> networkStuff -> withParams = stellar instance.
class StellarContract {
  //! it has scriptProgram: a parameterized instance of the contract
  //  ... with specific `parameters` assigned.
  scriptProgram;
  configIn;
  partialConfig;
  contractParams;
  setup;
  network;
  networkParams;
  myActor;
  // isTest?: boolean
  static get defaultParams() {
    return {};
  }
  static parseConfig(rawJsonConfig) {
    throw new Error(
      `Stellar contract subclasses should define their own static parseConfig where needed to enable connection from a specific dApp to a specific Stellar Contract.`
    );
  }
  get isConnected() {
    return !!this.myActor;
  }
  /**
   * returns the wallet connection used by the current actor
   * @remarks
   *
   * Throws an error if the strella contract facade has not been initialized with a wallet in settings.myActor
   * @public
   **/
  get wallet() {
    if (!this.myActor)
      throw new Error(
        `wallet is not connected to strella '${this.constructor.name}'`
      );
    return this.myActor;
  }
  //! can transform input configuration to contract script params
  //! by default, all the config keys are used as script params
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
    const { setup, config, partialConfig } = args;
    const c = new Class(setup, isInternalConstructor);
    return c.init(args);
  }
  /**
   * obsolete public constructor.  Use the createWith() factory function instead.
   *
   * @public
   **/
  constructor(setup, internal) {
    this.setup = setup;
    if (internal !== isInternalConstructor) {
      throw new Error(
        `StellarContract: use createWith() factory function`
      );
    }
    const { network, networkParams, isTest, myActor, isMainnet } = setup;
    helios.config.set({ IS_TESTNET: !isMainnet });
    this.network = network;
    this.networkParams = networkParams;
  }
  async init(args) {
    const { isMainnet, myActor } = this.setup;
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
    if (myActor) {
      const isMain = await myActor.isMainnet();
      const foundNetwork = isMain ? "mainnet" : "testnet";
      if (foundNetwork !== chosenNetwork) {
        throw new Error(
          `wallet on ${foundNetwork} doesn't match network from setup`
        );
      }
      this.myActor = myActor;
    }
    const { config, partialConfig } = args;
    if (config) {
      this.configIn = config;
      const fullScriptParams = this.contractParams = this.getContractScriptParams(config);
      this.scriptProgram = this.loadProgramScript(fullScriptParams);
    } else {
      this.partialConfig = partialConfig;
      this.scriptProgram = this.loadProgramScript();
    }
    return this;
  }
  compiledScript;
  // initialized in loadProgramScript
  get datumType() {
    return this.onChainDatumType;
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
  get validatorHash() {
    const { vh } = this._cache;
    if (vh)
      return vh;
    const nvh = this.compiledScript.validatorHash;
    return this._cache.vh = nvh;
  }
  //  todo: stakingAddress?: Address or credential or whatever;
  get address() {
    const { addr } = this._cache;
    console.log(
      this.constructor.name,
      "cached addr",
      addr?.toBech32() || "none"
    );
    if (addr)
      return addr;
    console.log("TODO TODO TODO TODO TODO - ensure each contract can indicate the right stake part of its address");
    console.log("and that the onchain part also supports it");
    const nAddr = Address.fromHashes(this.validatorHash);
    return this._cache.addr = nAddr;
  }
  get mintingPolicyHash() {
    if ("minting" != this.purpose)
      return void 0;
    const { mph } = this._cache;
    if (mph)
      return mph;
    const nMph = this.compiledScript.mintingPolicyHash;
    return this._cache.mph = nMph;
  }
  get identity() {
    const { identity } = this._cache;
    if (identity)
      return identity;
    console.log(this.constructor.name, "identity", identity || "none");
    let result;
    if ("minting" == this.purpose) {
      const b32 = this.mintingPolicyHash.toBech32();
      //!!! todo: verify bech32 checksum isn't messed up by this:
      result = b32.replace(/^asset/, "mph");
    } else {
      result = this.address.toBech32();
    }
    return this._cache.identity = result;
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
  async addStrellaWithConfig(TargetClass, config) {
    const args = {
      config,
      setup: this.setup
    };
    const strella = await TargetClass.createWith(args);
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
  /**
   * Returns all the types exposed by the contract script
   * @remarks
   *
   * Passed directly from Helios; property names match contract's defined type names
   *
   * @public
   **/
  get onChainTypes() {
    const types = { ...this.scriptProgram.types };
    const statements = this.scriptProgram.allStatements;
    for (const [statement, _someBoolThingy] of statements) {
      const name = statement.name.value;
      if (types[name])
        continue;
      const protoName = Object.getPrototypeOf(statement).constructor.name;
      if ("StructStatement" == protoName || "EnumStatement" == protoName) {
        const type = statement.genOffChainType();
        const name2 = type.name.value;
        if (types[name2])
          throw new Error(`ruh roh`);
        types[name2] = type;
      }
    }
    return types;
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
    const { scriptDatumName: onChainDatumName } = this;
    const { [onChainDatumName]: DatumType } = this.scriptProgram.types;
    return DatumType;
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
    if (!this.scriptProgram)
      throw new Error(`no scriptProgram`);
    const { [onChainActivitiesName]: ActivitiesType } = this.scriptProgram.types;
    return ActivitiesType;
  }
  /**
   * Retrieves an on-chain type for a specific named activity ("redeemer")
   * @remarks
   *
   * Cross-checks the requested name against the available activities in the script.
   * Throws a helpful error if the requested activity name isn't present.
   * @param activityName - the name of the requested activity
   * @public
   **/
  mustGetActivity(activityName) {
    const ocat = this.onChainActivitiesType;
    return this.mustGetEnumVariant(ocat, activityName);
  }
  mustGetEnumVariant(enumType, variantName) {
    const { [variantName]: variantType } = enumType;
    if (!variantType) {
      const variantNames = [];
      for (const [name, _] of Object.entries(
        Object.getOwnPropertyDescriptors(enumType)
      )) {
        if (enumType[name].prototype instanceof HeliosData) {
          variantNames.push(name);
        }
      }
      debugger;
      throw new Error(
        `$${this.constructor.name}: activity/enum-variant name mismatch ${enumType}::${variantName}''
   variants in this enum: ${variantNames.join(
          ", "
        )}`
      );
    }
    return variantType;
  }
  async readDatum(datumNameOrAdapter, datum2) {
    const hasAdapter = datumNameOrAdapter instanceof DatumAdapter;
    const datumName = hasAdapter ? datumNameOrAdapter.datumName : datumNameOrAdapter;
    const thisDatumType = this.onChainDatumType[datumName];
    if (!thisDatumType)
      throw new Error(`invalid datumName ${datumName}`);
    if (!datum2.isInline())
      throw new Error(
        `datum must be an InlineDatum to be readable using readDatum()`
      );
    const rawParsedData = await this.readUplcDatum(thisDatumType, datum2.data).catch((e) => {
      if (e.message?.match(/expected constrData/))
        return void 0;
      throw e;
    });
    if (!rawParsedData)
      return void 0;
    if (hasAdapter) {
      return datumNameOrAdapter.fromOnchainDatum(rawParsedData);
    }
    return rawParsedData;
  }
  async readUplcStructList(uplcType, uplcData) {
    const { fieldNames, instanceMembers } = uplcType;
    if (uplcType.fieldNames?.length == 1) {
      const fn = fieldNames[0];
      const singleFieldStruct = {
        [fn]: await this.readUplcField(fn, instanceMembers[fn], uplcData)
      };
      return singleFieldStruct;
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
  async readUplcEnumVariant(uplcType, enumDataDef, uplcData) {
    const fieldNames = enumDataDef.fieldNames;
    const { fields } = uplcData;
    return Object.fromEntries(
      await Promise.all(
        fieldNames.map(async (fn, i) => {
          const fieldData = fields[i];
          const fieldType = enumDataDef.fields[i].type;
          const value = await this.readUplcField(
            fn,
            fieldType,
            fieldData
          ).catch((nestedError) => {
            console.warn(
              "error parsing nested data inside enum variant",
              { fn, fieldType, fieldData }
            );
            debugger;
            throw nestedError;
          });
          return [fn, value];
        })
      )
    );
  }
  async readUplcDatum(uplcType, uplcData) {
    const { fieldNames, instanceMembers } = uplcType;
    if (!fieldNames) {
      const enumVariant = uplcType.prototype._enumVariantStatement;
      if (enumVariant) {
        const foundIndex = uplcData.index;
        const { dataDefinition: enumDataDef, constrIndex } = enumVariant;
        if (!(uplcData instanceof ConstrData))
          throw new Error(
            `uplcData mismatch - no constrData, expected constData#${constrIndex}`
          );
        if (!(foundIndex == constrIndex))
          throw new Error(
            `uplcData expected constrData#${constrIndex}, got #${foundIndex}`
          );
        const t = this.readUplcEnumVariant(
          uplcType,
          enumDataDef,
          uplcData
        );
        return t;
      }
      throw new Error(
        `can't determine how to parse UplcDatum without 'fieldNames'.  Tried enum`
      );
    }
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
    try {
      let internalType;
      try {
        internalType = fieldType.typeDetails.internalType.type;
        if ("Struct" == internalType) {
          value = await this.readUplcStructList(fieldType, uplcDataField);
          return value;
        }
      } catch (e) {
      }
      value = fieldType.uplcToJs(uplcDataField);
      if (value.then)
        value = await value;
      if (internalType) {
        if ("Enum" === internalType && 0 === uplcDataField.fields.length) {
          return value = Object.keys(value)[0];
        }
      } else {
        return value;
      }
    } catch (e) {
      if (e.message?.match(/doesn't support converting from Uplc/)) {
        if (!offChainType) {
          return this.readOtherUplcType(fn, uplcDataField, fieldType);
        }
        try {
          value = await offChainType.fromUplcData(uplcDataField);
          if (value && "some" in value)
            value = value.some;
          if (value && "string" in value)
            value = value.string;
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
  async readOtherUplcType(fn, uplcDataField, fieldType) {
    if (uplcDataField instanceof helios.IntData) {
      return uplcDataField.value;
    }
    if (uplcDataField instanceof helios.MapData) {
      const entries = {};
      for (const [k, v] of uplcDataField["map"]) {
        debugger;
        const bytesToString = {
          uplcToJs(uplcField) {
            return helios.bytesToText(uplcField.bytes);
          }
        };
        const parsedKey = await this.readUplcField(`${fn}.\u2039mapKey\u203A`, bytesToString, k);
        debugger;
        entries[parsedKey] = await this.readOtherUplcType(
          `${fn}.\u2039map\u203A@${parsedKey}`,
          v,
          void 0
        );
      }
      debugger;
      return entries;
    }
    console.log(`datum: field ${fn}: no offChainType, no internalType`, { fieldType, uplcDataField });
    debugger;
    return uplcDataField;
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
  mkMinTv(mph, tokenName, count = 1n) {
    const tnBytes = Array.isArray(tokenName) ? tokenName : stringToNumberArray(tokenName.toString());
    return this.mkMinAssetValue(new AssetClass([mph, tnBytes]), count);
  }
  mkAssetValue(tokenId, count = 1n) {
    const assets = [[tokenId, count]];
    const v = new Value(void 0, assets);
    return v;
  }
  mkMinAssetValue(tokenId, count = 1n) {
    this.mkAssetValue(tokenId, count);
    const txo = new TxOutput(
      new Address(Array(29).fill(0)),
      this.mkAssetValue(tokenId, count)
    );
    txo.correctLovelace(this.networkParams);
    return txo.value;
  }
  mkTokenPredicate(specifier, quantOrTokenName, quantity) {
    let v;
    let mph;
    let tokenName;
    //!!! todo: support (AssetClass, quantity) input form
    if (!specifier)
      throw new Error(
        `missing required Value or MintingPolicyHash or UutName (or uut-name as byte-array) in arg1`
      );
    const predicate = _tokenPredicate.bind(this);
    const isValue = specifier instanceof Value;
    const isUut = specifier instanceof Array || specifier instanceof UutName;
    if (isValue) {
      v = predicate.value = specifier;
      return predicate;
    } else if (isUut) {
      const uutNameOrBytes = specifier instanceof Array ? specifier : specifier.name;
      const quant = quantOrTokenName ? BigInt(quantOrTokenName) : 1n;
      v = predicate.value = this.tokenAsValue(
        uutNameOrBytes,
        quant
        // quantity if any
      );
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
  async findChangeAddr() {
    const { myActor } = this;
    if (!myActor) {
      throw new Error(
        `\u26A0\uFE0F ${this.constructor.name}: no this.myActor; can't get required change address!`
      );
    }
    let unused = (await myActor.unusedAddresses).at(0);
    if (!unused)
      unused = (await myActor.usedAddresses).at(-1);
    if (!unused)
      throw new Error(
        `\u26A0\uFE0F ${this.constructor.name}: can't find a good change address!`
      );
    return unused;
  }
  async submit(tcx, {
    signers = []
  } = {}) {
    let { tx, feeLimit = 2000000n } = tcx;
    const { myActor: wallet } = this;
    let walletMustSign = false;
    let sigs = [];
    if (wallet || signers.length) {
      const changeAddress = await this.findChangeAddr();
      const spares = await this.findAnySpareUtxos(tcx);
      const willSign = [...signers, ...tcx.neededSigners];
      const wHelper = wallet && new WalletHelper(wallet);
      for (const { pubKeyHash: pkh } of willSign) {
        if (!pkh)
          continue;
        if (tx.body.signers.find((s) => pkh.eq(s)))
          continue;
        tx.addSigner(pkh);
      }
      try {
        await tx.finalize(this.networkParams, changeAddress, spares);
      } catch (e) {
        console.log("FAILED submitting:", tcx.dump(this.networkParams));
        debugger;
        throw e;
      }
      if (wallet && wHelper) {
        for (const a of willSign) {
          if (!await wHelper.isOwnAddress(a))
            continue;
          walletMustSign = true;
          break;
        }
        if (!walletMustSign)
          for (const input of tx.body.inputs) {
            if (!await wHelper.isOwnAddress(input.address))
              continue;
            walletMustSign = true;
            tcx.neededSigners.push(input.address);
            break;
          }
        if (walletMustSign) {
          const walletSign = wallet.signTx(tx);
          sigs = await walletSign.catch((e) => {
            console.warn(
              "signing via wallet failed: " + e.message,
              tcx.dump(this.networkParams)
            );
            return null;
          });
          //! doesn't need to re-verify a sig it just collected
          if (sigs)
            tx.addSignatures(sigs, false);
        }
      }
    } else {
      console.warn("no 'myActor'; not finalizing");
    }
    if (walletMustSign && !sigs) {
      throw new Error(`wallet signing failed`);
    }
    console.log("Submitting tx: ", tcx.dump(this.networkParams));
    const promises = [
      this.network.submitTx(tx).catch((e) => {
        console.warn(
          "submitting via helios Network failed: ",
          e.message
        );
        debugger;
        throw e;
      })
    ];
    if (wallet) {
      if (!this.setup.isTest)
        promises.push(
          wallet.submitTx(tx).catch((e) => {
            console.warn(
              "submitting via wallet failed: ",
              e.message
            );
            debugger;
            throw e;
          })
        );
    }
    return Promise.any(promises);
  }
  /**
   * Executes additional transactions indicated by an existing transaction
   * @remarks
   *
   * During the off-chain txn-creation process, additional transactions may be
   * queued for execution.  This method is used to execute those transactions.
   * @param tcx - the prior txn context having the additional txns to execute
   * @param callback - an optional async callback that you can use to notify a user, or to log the results of the additional txns
   * @public
   **/
  async submitAddlTxns(tcx, callback) {
    const { addlTxns } = tcx.state;
    for (const [txName, addlTxInfo] of Object.entries(addlTxns)) {
      const { description, moreInfo, optional, tcx: tcx2 } = addlTxInfo;
      const replacementTcx = callback && await callback({ txName, ...addlTxInfo });
      await this.submit(replacementTcx || tcx2);
    }
  }
  ADA(n) {
    const bn = "number" == typeof n ? BigInt(Math.round(1e6 * n)) : BigInt(1e6) * n;
    return bn;
  }
  //! it requires each subclass to define a contractSource
  contractSource() {
    throw new Error(`${this.constructor.name}: missing required implementation of contractSource()`);
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
  _cache = {};
  loadProgramScript(params) {
    const src = this.contractSource();
    const modules = this.importModules();
    console.log(
      `${this.constructor.name}: loading program script from`,
      //@ts-expect-error
      src.srcFile || "\u2039unknown path\u203A"
    );
    for (const module of modules) {
      const { srcFile, purpose, moduleName } = module;
      console.log(`  -- ${purpose}: ${moduleName} from ${srcFile}`);
      if (!(srcFile && purpose && moduleName)) {
        throw new Error(
          `${this.constructor.name}: invalid module returned from importModules():
${module.split("\n").slice(0, 3).join("\n")}
... you may need to create it with mkHeliosModule() if heliosRollupLoader() isn't suitable for your project`
        );
      }
    }
    try {
      const script = Program.new(src, modules);
      if (params)
        script.parameters = params;
      const simplify = "optimize" in this.setup ? this.setup.optimize : !this.setup.isTest && !this.setup.isDev;
      if (simplify) {
        console.warn(
          `Loading optimized contract code for ` + script.name
        );
      }
      console.log(
        `${this.constructor.name}: setting compiledScript with simplify=${simplify} + params:`,
        params
      );
      //!!! todo: consider pushing this to JIT or async
      this.compiledScript = script.compile(simplify);
      this._cache = {};
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
          const script2 = Program.new(src, modules);
          console.log({ params });
          if (params)
            script2.parameters = params;
        } catch (sameError) {
          throw sameError;
        }
        throw e;
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
      t.message = this.constructor.name + ":" + e.message + addlErrorText;
      t.stack = `${this.constructor.name}: ${e.message}
    at ${moduleName} (${srcFile}:${1 + sl}:${1 + sc})
` + modifiedStack;
      throw t;
    }
  }
  get missingActorError() {
    return `Wallet not connected to Stellar Contract '${this.constructor.name}'`;
  }
  async findActorUtxo(name, predicate) {
    const wallet = this.myActor;
    if (!wallet)
      throw new Error(this.missingActorError);
    return this.hasUtxo(name, predicate, { wallet });
  }
  async mustFindActorUtxo(name, predicate, hintOrExcept, hint) {
    const wallet = this.myActor;
    if (!wallet)
      throw new Error(this.missingActorError);
    const isTcx = hintOrExcept instanceof StellarTxnContext;
    const exceptInTcx = isTcx ? hintOrExcept : void 0;
    const extraErrorHint = isTcx ? hint : "string" == typeof hintOrExcept ? hintOrExcept : void 0;
    return this.mustFindUtxo(
      name,
      predicate,
      { wallet, exceptInTcx },
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
  async mustFindUtxo(semanticName, predicate, searchScope, extraErrorHint = "") {
    const { address, wallet, exceptInTcx } = searchScope;
    const found = await this.hasUtxo(semanticName, predicate, {
      address,
      wallet,
      exceptInTcx
    });
    if (!found) {
      throw new Error(this.utxoSearchError(semanticName, searchScope));
    }
    return found;
  }
  utxoSearchError(semanticName, searchScope, extraErrorHint) {
    const where = searchScope.address ? `address ${searchScope.address.toBech32()}` : `connected wallet`;
    return `${this.constructor.name}: '${semanticName}' utxo not found (${extraErrorHint || "sorry, no extra clues available"}) in ${where}`;
  }
  toUtxoId(u) {
    return `${u.outputId.txId.hex}@${u.outputId.utxoIdx}`;
  }
  /**
   * Try finding a utxo matching a predicate
   * @remarks
   *
   * Finds the first matching utxo, if any, either in the indicated search-scope's `wallet` or `address`.
   *
   * @public
   **/
  async hasUtxo(semanticName, predicate, { address, wallet, exceptInTcx }) {
    const utxos = address ? await this.network.getUtxos(address) : await wallet.utxos;
    const collateral = (wallet ? await wallet.collateral : [])[0];
    const notCollateral = utxos.filter((u) => !collateral?.eq(u));
    const filtered = exceptInTcx ? notCollateral.filter(
      exceptInTcx.utxoNotReserved.bind(exceptInTcx)
    ) : notCollateral;
    console.log(
      `finding '${semanticName}' utxo${exceptInTcx ? " (not already being spent in txn)" : ""} from set:
  ${utxosAsString(filtered, "\n  ")}`
      // ...(exceptInTcx && filterUtxos?.length
      //     ? [
      //           "\n  ... after filtering out:\n ",
      //           utxosAsString(exceptInTcx.reservedUtxos(), "\n  "),
      //       ]
      //     : [])
    );
    const found = filtered.find(predicate);
    if (found) {
      console.log("  <- found:" + utxosAsString([found]));
    } else {
      console.log("  (not found)");
    }
    return found;
  }
  async hasMyUtxo(semanticName, predicate) {
    return this.hasUtxo(semanticName, predicate, { address: this.address });
  }
}
__decorateClass$7([
  partialTxn
], StellarContract.prototype, "txnKeepValue", 1);

const code$9 = new String("minting CapoMinter\n\nimport { \n    hasSeedUtxo, \n    mkUutTnFactory,\n    requiresMintDelegateApproval,\n    validateUutMinting, \n    validateUutBurning,\n    mintsUutForCharterUsingRedeemerIndex,\n    MinterActivity\n} from CapoMintHelpers\n\nimport { Datum as CapoDatum } from specializedCapo\n\nimport {\n    getRefCharterUtxo\n} from CapoHelpers\n\nimport {\n    mustFindInputRedeemer,\n    mkTv,\n    outputAndDatum,\n    tvCharter\n} from StellarHeliosHelpers\n\n//!!!! todo: change to TxOutputId, rolling up these two things:\nconst seedTxn : TxId = TxId::new(#1234)\nconst seedIndex : Int = 42\nconst rev : Int = 1\n//!!! todo propagate isDev from Capo\nconst isDev : Bool = false\n\nfunc hasContractSeedUtxo(tx: Tx) -> Bool {\n    hasSeedUtxo(tx, seedTxn, seedIndex\n        // , \"charter\"\n    )\n}\n\n// this is a simple example showing how a tagged struct\n//   ... can be cast from a generic Map[String]Data\n// struct Foo {\n//     // the \"meaning\" field can be an Int, and this makes it \"just work\" as a Real.\n//     m: Real \"meaning\"\n//     // the struct can have the \"happy\" field, and we don't have to interpret it!\n//     // h: Int \"happy\"\n//     func info(self) ->() {\n//         print(\n//             // \"happy? \"+self.h.show()+\n//             \"; the answer is \" + self.m.show()\n//         )\n//     }\n// }\n\n\nfunc main(r : MinterActivity, ctx: ScriptContext) -> Bool {\n    tx: Tx = ctx.tx;\n    mph: MintingPolicyHash = ctx.get_current_minting_policy_hash();\n    value_minted: Value = tx.minted;\n    assert(rev.serialize() == rev.serialize(), \"impossible!\");\n    print(\"hi from minter\");\n\n    ok : Bool = r.switch {\n        charter: mintingCharter => {       \n            charterVal : Value = mkTv(mph, \"charter\");\n\n            // these must be sorted by length first, then lexicographically\n            //   (actually byte-wise, but ~same diff)\n            settingsTnBase: String = \"set\";\n            authTnBase : String = \"capoGov\";\n            mintDgtTnBase : String = \"mintDgt\";  \n            spendDgtTnBase: String = \"spendDgt\";\n            purposes = []String{\n                settingsTnBase,\n                authTnBase, \n                mintDgtTnBase, \n                spendDgtTnBase\n            };\n\n            assert(value_minted >= charterVal,\n                \"charter token not minted\");\n\n            hasSeed: Bool = hasContractSeedUtxo(tx);\n            mkUutName: (String) -> String = mkUutTnFactory(seedTxn, seedIndex);\n            print(\"defaultMinter @B\");\n            mintsUuts: Bool = validateUutMinting(\n                ctx: ctx, \n                mph: mph,\n                seedTxId: seedTxn, \n                seedIdx: seedIndex, \n                purposes: purposes, \n                mkTokenName: mkUutName,\n                bootstrapCharter: charterVal\n            );\n            charterOutput: TxOutput = tx.outputs.find( (output: TxOutput) -> Bool {\n                output.address == charter.owner &&\n                    output.value.contains(charterVal)\n            });\n            // ^^ fails if there's no charter output to the right address\n\n            print(\"defaultMinter @C\");\n            charterData : Data = charterOutput.datum.get_inline_data();\n            charterDatum = CapoDatum::CharterToken::from_data(charterData);\n            CapoDatum::CharterToken{\n                spendDgt, \n                spendInvariants,\n                /* settingsUut */ _, \n                namedDelegates,\n                mintDgt, \n                mintInvariants, \n                authDgt\n            } = charterDatum;\n            foundSettings : outputAndDatum[CapoDatum::SettingsData] = \n                charterDatum.mustFindSettingsOutput(ctx: ctx, mph: mph, inAddr: charter.owner);\n            assert(foundSettings == foundSettings, \"no way\");\n\n                // charterData.switch{\n            //         // c: Datum => c.switch{ \n            //         // c:CharterToken => c, _ => error(\"unexpected datum type\") },\n            //     (index: Int, fields: []Data) => {\n            //         assert(index==0, \"charter token must be at index 0\");\n            //         assert(fields.length == 7, \"charter token must have 7 fields\");\n            //         // {authDgt, mintDgt, spendDgt, mintInvariants, spendInvariants}\n            //         print(\"defaultMinter @D\");\n            //         settingsIndex : Int = 2;\n\n            //         t : Data = fields.get(settingsIndex);\n            //         print(\"ok: \"+ t.serialize().show());\n\n            //         CapoDatum::CharterToken::from_data(charterData)\n            //     },\n            //     _ => error(\"unexpected datum type\")  \n            // };\n            // settingsValue : Value = mkTv(\n            //     mph: mph, \n            //     tnBytes: settingsUut\n            // );\n            // assert(settingsOutput.value.contains(settingsValue), \"settings output must contain settings UUT\");\n\n            print(\"defaultMinter @E\");\n            // print(\"\" + settingsMap.tag.show());\n            // settingsMap.switch {\n\n            // };\n            // print(settingsMap.show());\n            // assert(settings.id == \"set\", \"must have settings.id='set'\");\n            // assert(settingsMap.length == 1, \"no settings fields allowed at charter creation\");\n\n            // once we have burned down the test backlog a bit, we can add these in:\n            assert(mintInvariants.length == 0, \"no mint invariants allowed at charter creation\");\n            assert(spendInvariants.length == 0, \"no spend invariants allowed at charter creation\");\n            assert(namedDelegates.length ==0, \"no named delegates allowed at charter creation\");\n            \n            hasGoodDelegates : Bool = authDgt.hasValidOutput(mph, ctx) &&\n                mintDgt.hasValidOutput(mph, ctx) &&\n                spendDgt.hasValidOutput(mph, ctx);\n\n            print(\"     -- hasSeed: \" + hasSeed.show());\n            print(\"     -- mintsUuts: \" + mintsUuts.show());\n            print(\"     -- hasGoodDelegates: \" + hasGoodDelegates.show());\n            hasGoodDelegates && mintsUuts && hasSeed\n        },\n\n        mintWithDelegateAuthorizing => {\n            if (true) {\n                // todo: enforces minting invariants.\n                print(\"------- TODO: must enforce minting invariants\")\n            }; \n            requiresMintDelegateApproval(ctx, mph)\n        },\n\n        addingMintInvariant{sTxId, sIdx} => {\n            addMintInvariant : Int = 3;\n            print(\"checking for addingMintInvariant\");\n\n            mintsUutForCharterUsingRedeemerIndex(\n                ctx : ctx, \n                mph: mph, \n                purpose: \"mintInvar\", \n                seedTxId: sTxId, \n                seedIdx: sIdx, \n                charterRedeemerIndex: addMintInvariant                \n            )\n        },\n\n        addingSpendInvariant{sTxId, sIdx} => {\n            addSpendInvariant : Int = 4;\n            print(\"checking for addingSpendInvariant\");\n            mintsUutForCharterUsingRedeemerIndex(\n                ctx : ctx, \n                mph: mph, \n                purpose: \"spendInvar\", \n                seedTxId: sTxId, \n                seedIdx: sIdx, \n                charterRedeemerIndex: addSpendInvariant\n            )\n        },\n\n        ForcingNewMintDelegate{sTxId, sIdx} => {\n            updateCharter : Int = 1; // general update to charter\n            print(\"checking for ForcingNewMintDelegate\");\n            mintsUutForCharterUsingRedeemerIndex(\n                ctx : ctx, \n                mph: mph, \n                purpose: \"mintDgt\", \n                seedTxId: sTxId, \n                seedIdx: sIdx, \n                charterRedeemerIndex: updateCharter,\n                needsMintDelegateApproval: false\n            )\n        },\n\n        CreatingNewSpendDelegate{seedTxId, seedIdx, replaceExisting} => {\n            updateCharter : Int = 1; // general update to charter\n            print(\"checking for CreatingNewSpendDelegate\");\n\n            otherMintedValue : Value = replaceExisting.switch {\n                Some{oldTokenName} => {\n                    BURNED: Int = -1;\n                    Value::new(\n                        AssetClass::new(mph, oldTokenName), \n                        BURNED\n                    )\n                },\n                None => Value::ZERO\n            };\n\n            mintsUutForCharterUsingRedeemerIndex(\n                ctx : ctx,\n                mph: mph,\n                purpose: \"spendDgt\",\n                seedTxId: seedTxId,\n                seedIdx: seedIdx,\n                charterRedeemerIndex: updateCharter,\n                needsMintDelegateApproval: false,\n                otherMintedValue: otherMintedValue\n            )\n        },\n\n        mintingUuts => { // {sTxId, sIdx, purposes} => {\n            error(\"minter:mintingUuts obsolete; use minter:followingDelegate with delegate:mintingUuts or a more application-specific activity\")\n            // validateUutMinting(\n            //     ctx: ctx, \n            //     seedTxId: sTxId, \n            //     seedIdx: sIdx, \n            //     purposes: purposes,\n            //     mkTokenName: r.uutTnFactory()\n            // )\n        },\n        burningUuts => { // {tns} => {\n            error(\"minter:burningUuts obslete; use minter:followingDelegate with delegate:burningUuts or a more application-specific activity\")\n            // validateUutBurning(\n            //     ctx: ctx,\n            //     tns: tns\n            // ) \n        },\n        _ => true\n    };\n\n    // print(\"defaultMinter: minting value: \" + value_minted.show());\n\n    ok\n}\n\n");

code$9.srcFile = "src/minting/CapoMinter.hl";
code$9.purpose = "minting";
code$9.moduleName = "CapoMinter";

const code$8 = new String("module StellarHeliosHelpers\n\n// keep this as-is.  Make RealnumSettingsValueV2 or something else if it needs to change\nstruct RealnumSettingsValueV1 {\n    name: String\n    microInt: Int // \"Real\" semantics, times 1_000_000\n}\n\nfunc didSign(ctx : ScriptContext, a: Address) -> Bool {\n    tx : Tx = ctx.tx;\n\n    pkh : PubKeyHash = a.credential.switch{\n        PubKey{h} => h,\n        _ => error(\"trustee can't be a contract\")\n    };\n    // print(\"checking if trustee signed: \" + pkh.show());\n\n    tx.is_signed_by(pkh)\n}\n\nfunc didSignInCtx(ctx: ScriptContext) -> (a: Address) -> Bool {\n    (a : Address) -> Bool {\n        didSign(ctx, a)\n    }\n}\n\n//! represents the indicated token name as a Value\nfunc mkTv(\n    mph: MintingPolicyHash, \n    tn: String=\"\", \n    tnBytes: ByteArray=tn.encode_utf8(),\n    count : Int = 1\n) -> Value {\n    assert(tnBytes.length > 0, \"missing reqd tn or tnBytes\");\n    Value::new(\n        AssetClass::new(mph, tnBytes), \n        count\n    )\n}\n\n//! returns the charter-token from our minter, as a Value\nfunc tvCharter(mph: MintingPolicyHash)  -> Value {\n    mkTv(mph, \"charter\")\n}\n\nfunc spendsAndReturns(value : Value, ctx : ScriptContext, input: TxInput) -> Bool {\n    input.value.contains(value) &&\n    ctx.tx.outputs.any( (txo : TxOutput) -> Bool {\n        txo.address == input.address &&\n        txo.value.contains(value)\n    } )\n}\n\nfunc returnsValueToScript(value : Value, ctx : ScriptContext) -> Bool {\n    input : TxInput = ctx.get_current_input();\n    input.value.contains(value) &&\n    ctx.tx.outputs.any( (txo : TxOutput) -> Bool {\n        txo.address == input.address &&\n        txo.value.contains(value)\n    } )\n}\n\n\nfunc getOutputWithValue(ctx: ScriptContext, v : Value) -> TxOutput {\n    ctx.tx.outputs.find((txo: TxOutput) -> { txo.value >= v })\n}\n\nstruct outputAndDatum[T] {\n    output: TxOutput\n    datum: T\n    rawData: Data\n}\n\nfunc getSingleAssetValue(input: TxInput) -> Value{\n    inputMap : Map[MintingPolicyHash]Map[ByteArray]Int = input.value.get_assets().to_map();\n    assert( inputMap.length == 1, \n        \"multiple assets\"\n        // \"getSingleAssetValue needs single-asset input\"\n    );\n\n    inputTokens : Map[ByteArray]Int = inputMap.head_value;\n    assert(inputTokens.length == 1, \n        \"multiple tokens\"\n        // \"getSingleAssetValue needs single-token input\"\n    );\n\n    input.value.get_assets()\n}\n\nfunc outputDatum[T](newTxo : TxOutput) -> T {\n    T::from_data(newTxo.datum.get_inline_data())\n}\n\nfunc getOutputForInput(ctx: ScriptContext, input: TxInput) -> TxOutput {\n    inputValue : Value = getSingleAssetValue(input);\n\n    getOutputWithValue(ctx, inputValue)\n}\n\n//! retrieves the redeemer for a specific input\nfunc mustFindInputRedeemer(\n    ctx : ScriptContext,\n    txInput: TxInput    \n) -> Data {\n    targetId : TxOutputId = txInput.output_id;\n    redeemers : Map[ScriptPurpose]Data = ctx.tx.redeemers;\n    spendsExpectedInput : ScriptPurpose = redeemers.find_key( \n        (purpose : ScriptPurpose) -> { purpose.switch{ \n            sp: Spending => {\n                // print (\"oid: \" + sp.output_id.show());\n                sp.output_id == targetId\n            }, \n            _ => false \n        } }\n    );\n    redeemers.get(spendsExpectedInput)\n}\n\n\n");

code$8.srcFile = "src/StellarHeliosHelpers.hl";
code$8.purpose = "module";
code$8.moduleName = "StellarHeliosHelpers";

const code$7 = new String("\n\nmodule CapoMintHelpers\nimport {\n    mustFindInputRedeemer,\n    mkTv,\n    tvCharter\n} from StellarHeliosHelpers\n\nimport {\n    getTxCharterDatum,\n    getRefCharterDatum\n} from CapoHelpers\n\nimport {\n    Datum, Activity as CapoActivity\n} from specializedCapo\n\nimport {\n    RelativeDelegateLink,\n    requiresDelegateAuthorizingMint // todo: move it into this file instead.\n} from CapoDelegateHelpers\n\nfunc hasSeedUtxo(tx: Tx, seedTxId : TxId, seedIdx: Int\n    // , reason: String\n) -> Bool {\n    seedUtxo: TxOutputId = TxOutputId::new(\n        seedTxId,\n        seedIdx\n    );\n    assert(tx.inputs.any( (input: TxInput) -> Bool {\n        input.output_id == seedUtxo\n    }),  \"seed utxo required for minting \"\n        // +reason \n        // + \"\\n\"+seedTxId.show() + \" : \" + seedIdx.show()\n    );\n    print( \"  -- has seed -> ok\");\n    true\n}\n\nfunc requiresMintDelegateApproval(\n    ctx: ScriptContext, \n    mph: MintingPolicyHash\n) -> Bool {\n    Datum::CharterToken {\n        /*spendDgt*/ _,  \n        /* spendInvariants */ _,\n        /* settings */ _,\n        /* namedDelegates */ _,\n        mintDgt, \n        /* mintInvariants */ _, \n        /* govAuthority */ _\n    } = getRefCharterDatum(ctx, mph);\n\n    requiresDelegateAuthorizingMint(\n        delegateLink: mintDgt, \n        mph: mph,\n        ctx: ctx\n    )\n}\n\n//! pre-computes the hash-based suffix for a token name, returning\n//  a function that cheaply makes Uut names with any given purpose, \n// given the initial seed-txn details\nfunc mkUutTnFactory(\n    seedTxId : TxId, seedIdx : Int\n) -> (String) -> String {\n   \n    idxBytes : ByteArray = seedIdx.serialize();\n    // assert(idxBytes.length == 1, \"surprise!\");\n\n    //! yuck: un-CBOR...\n    rawTxId : ByteArray = seedTxId.serialize().slice(5,37);\n\n    txoInfo : ByteArray = if (idxBytes.length > 9) { \n        // allows 9 bytes to ensure we can support \n        // the largest possible cbor encoding of txo-index integers, \n        // even though we only expect integers < 256 currently\n        assert(false, \n            //\"expected cbor(txo index) to be at most 9 bytes, got cbor( index=\n            //  + seedIdx.show() + \" ).hex = \" + idxBytes.show()\n            \"cbor(txoId) len > 9 !!\"  \n        );\n        idxBytes // never used\n    } else {\n       ( rawTxId + \"@\".encode_utf8() )+ idxBytes\n    };\n    // assert(txoId.length == 34, \"txId + @ + int should be length 34\");\n    // print( \"******** txoId \" + txoId.show());\n\n    miniHash : ByteArray = txoInfo.blake2b().slice(0,6);\n    // assert(miniHash.length == 6, \"urgh.  slice 5? expected 12, got \"+ miniHash.length.show());\n\n    mhs: String = miniHash.show();\n\n    // returns a function computing a lightweight prefix + miniHash\n    (p: String) -> String {\n        p + \"-\" + mhs\n    }\n}\n\nfunc validateUutBurning(\n    ctx: ScriptContext, \n    tns: []String\n) -> Bool {\n    tx: Tx = ctx.tx;\n    mph: MintingPolicyHash = ctx.get_current_minting_policy_hash();\n    Datum::CharterToken {\n        /*spendDgt*/ _,  \n        /* spendInvariants */ _,\n        /* settings */ _,\n        /* namedDelegates */ _,\n        mintDgt, \n        /* mintInvariants */ _, \n        /* govAuthority */ _\n    } = getRefCharterDatum(ctx, mph);\n\n    valueBurned: Value = tx.minted;\n\n    expectedBurn : Value = Value::sum(tns.map(\n        (tn: String) -> Value {\n            mkTv(mph: mph, tn: tn, count: -1)\n        }\n    ));\n    actualBurn : Map[ByteArray]Int = valueBurned.get_policy(mph);\n    hasExpectedBurn : Bool = actualBurn == expectedBurn.get_policy(mph);\n    if (!hasExpectedBurn)  {\n        // actualBurn.for_each( (b : ByteArray, i: Int) -> {\n        //     print( \"actual: \" + b.show() + \" \" + i.show() )\n        // });\n        // expectedBurn.get_policy(mph).for_each( (b : ByteArray, i: Int) -> {\n        //     print( \"expected: \" + b.show() + \" \" + i.show() )\n        // });\n        assert(false, \"mismatch in UUT burn, diff:\\n\"\n            + (expectedBurn - valueBurned).show()\n        )\n    };\n\n    hasExpectedBurn && requiresDelegateAuthorizingMint(\n        mintDgt, \n        mph, \n        ctx\n    )\n\n}\n\n// checks all of the following:\n//  - there's an approving delegate (or we're bootstrapping)\n//  - the mint includes the seed UTXO\n//  - the mint matches the UUTs indicated by the list of purposes\nfunc validateUutMinting(\n    ctx: ScriptContext, \n    mph: MintingPolicyHash,\n    seedTxId : TxId, seedIdx : Int, \n    purposes: []String,     \n    mkTokenName: (String) -> String,\n    bootstrapCharter:Value = Value::new(AssetClass::ADA, 0),\n    otherMintedValue: Value = Value::new(AssetClass::ADA, 0),\n    needsMintDelegateApproval: Bool = true,\n    extraMintDelegateRedeemerCheck: Bool = true\n) -> Bool {\n    tx: Tx = ctx.tx;\n\n    isBootstrapping : Bool = !( bootstrapCharter.is_zero() );\n    delegateApproval : Bool = if ( isBootstrapping ) { \n        true \n    } else {\n        // not bootstrapping; must honor the mintDelegate's authority\n        Datum::CharterToken {\n            /*spendDgt*/ _,  \n            /* spendInvariants */ _,\n            /* settings */ _,\n            /* namedDelegates */ _,\n            mintDgt, \n            /* mintInvariants */ _, \n            /* govAuthority */ _\n        } = getTxCharterDatum(ctx, mph);\n\n        if (needsMintDelegateApproval) {\n            //!!! todo: add explicit activity details in authorization\n            requiresDelegateAuthorizingMint(\n                delegateLink: mintDgt, \n                mph: mph, \n                ctx: ctx,\n                extraMintDelegateRedeemerCheck: extraMintDelegateRedeemerCheck\n            )\n        } else {\n            true\n        }\n    };\n\n    valueMinted: Value = tx.minted;\n\n    // idxBytes : ByteArray = seedIdx.bound_max(255).serialize();\n    // // assert(idxBytes.length == 1, \"surprise!\");\n\n    // //! yuck: un-CBOR...\n    // rawTxId : ByteArray = seedTxId.serialize().slice(5,37);\n\n    // txoId : ByteArray = (rawTxId + \"@\".encode_utf8() + idxBytes);\n    // assert(txoId.length == 34, \"txId + @ + int should be length 34\");\n    // // print( \"******** txoId \" + txoId.show());\n\n    // miniHash : ByteArray = txoId.blake2b().slice(0,6);\n    // // assert(miniHash.length == 6, \"urgh.  slice 5? expected 12, got \"+ miniHash.length.show());\n\n    // tokenName1 = purpose + \".\" + miniHash.show();\n\n    // print(\" purposes: \" + purposes.join(\", \"));\n    expectedValue : Value = bootstrapCharter + otherMintedValue + Value::sum(\n        purposes.sort((a:String, b:String) -> Bool { a != b }).map(\n            (purpose: String) -> Value {\n                // print(\"purpose: \" + purpose);\n                mkTv(mph, mkTokenName(purpose))\n            }\n        )\n    );\n\n    actualMint : Map[ByteArray]Int = valueMinted.get_policy(mph);\n    // expectedMint : Map[ByteArray]Int = expectedValue.get_policy(mph);\n    if (true) {\n        actualMint.for_each( (b : ByteArray, i: Int) -> {\n            print( \"actual: \" + b.decode_utf8() + \" \" + i.show() )\n        });\n\n        print(\"uut-minting seed: \" + seedTxId.show() + \"🔹#\" + seedIdx.show());\n        expectedValue.get_policy(mph).for_each( (b : ByteArray, i: Int) -> {\n            print( \"expected: \" + b.decode_utf8() + \" \" + i.show() )\n        })\n    };\n\n    temp : []ByteArray = actualMint.fold( (l: []ByteArray, b : ByteArray, i: Int) -> {\n        l.find_safe((x : ByteArray) -> Bool { x == b }).switch{\n            None => l.prepend(b),\n            Some /*{x}*/ => error(\"UUT duplicate purpose \"\n                // +  x.decode_utf8()\n            )\n        }\n    }, []ByteArray{});\n    assert(temp == temp, \"prevent unused var\");\n\n\n    expectationsMet : Bool = valueMinted  == expectedValue;\n\n    assert(expectationsMet, \"mismatch in UUT mint\"\n        // +\";\\n   ... expected \"+ expectedValue.show()+\n        // \"   ... actual \"+ valueMinted.show()+\n        // \"   ... diff = \\n\" + (expectedValue - valueMinted).show()\n    );\n\n    delegateApproval && expectationsMet &&\n    hasSeedUtxo(tx, seedTxId, seedIdx\n        //, \"UUT \"+purposes.join(\"+\")\n    )\n}\n\nfunc mintsUutForCharterUsingRedeemerIndex(\n    ctx: ScriptContext,\n    mph: MintingPolicyHash,\n    purpose: String,\n    seedTxId: TxId,\n    seedIdx: Int,\n    charterRedeemerIndex: Int,\n    otherMintedValue: Value = Value::new(AssetClass::ADA, 0),\n    needsMintDelegateApproval: Bool = true,\n    extraMintDelegateRedeemerCheck: Bool = true\n) -> Bool {\n            // only has to check that a) it's minting all-and-only the invariant-uut,\n            // and b) the contract charter is BEING SPENT WITH THE ACTIVITY at the indicated index.\n            // ------> The charter-spend policy for that activity checks all the other necessaries\n            //     given that activity.\n\n            // NOT needed; the charter-spend policy ensures the expected delegate output is created when adding a spend invariant.\n            // hasRightDestination : Bool = output.value == value_minted &&\n            //     output.address == charterUtxo.address;\n\n    chVal : Value = tvCharter(mph);\n    hasCharter = (txin : TxInput) -> Bool { txin.value.contains(chVal) };\n    print(\"  --- finding required charter input \");\n    charterInput : TxInput = ctx.tx.inputs.find(hasCharter);\n    print (\"  <-- found charter input\");\n    charterRedeemer : Data  = mustFindInputRedeemer(ctx, charterInput);\n    // print(\"defaultMinter @A\");\n\n    charterRedeemer.switch{\n        (index: Int, _fields: []Data) => {\n            /* avoids unused-variable warning: */ _fields == _fields && \n\n            if (index == charterRedeemerIndex) { \n                // ok, good charter-redeemer as expected; print(\"ok here\");\n                true \n            } else {  \n                error(\"wrong charter Activity for adding spend invariant; expected redeemer #\"+ \n                    charterRedeemerIndex.show()+\n                     \", got \"+index.show()\n                )\n            }\n        },\n        _ => error(\"incontheeivable!\")\n    } &&\n    validateUutMinting(\n        ctx: ctx, \n        mph: mph,\n        seedTxId: seedTxId, \n        seedIdx: seedIdx, \n        purposes: []String{purpose}, \n        mkTokenName: mkUutTnFactory(seedTxId, seedIdx),\n        otherMintedValue: otherMintedValue,\n        needsMintDelegateApproval: needsMintDelegateApproval,\n        extraMintDelegateRedeemerCheck: extraMintDelegateRedeemerCheck\n    ) && if (/* more debug info? */ true) {\n        print (\"  -- CMH: mint UUT \"+purpose+\" w/ charter redeemer #\"+charterRedeemerIndex.show());\n        true\n    } else { true } \n}\n\nenum MinterActivity { \n    mintingCharter\n     {\n        owner: Address\n        // we don't have a responsiblity to enforce delivery to the right location\n        // govAuthority: RelativeDelegateLink   // not needed \n    }\n    mintWithDelegateAuthorizing // delegate is handling all mints\n\n    addingMintInvariant {\n        seedTxn: TxId\n        seedIndex: Int\n    }\n\n    addingSpendInvariant {\n        seedTxn: TxId\n        seedIndex: Int\n    }\n\n    ForcingNewMintDelegate {\n        seedTxn: TxId\n        seedIndex: Int\n    }\n\n    CreatingNewSpendDelegate {\n        seedTxn: TxId\n        seedIndex: Int\n        replacingUut: Option[ByteArray]\n    }\n\n    mintingUuts {\n        seedTxn: TxId\n        seedIndex: Int\n        purposes: []String\n    }\n\n    //??? have the charter know about the UUT purposes, \n    // ... so we can limit the mint/burns to match the known list??\n    burningUuts {\n        tns: []String\n    }\n\n    func tvForPurpose(self, ctx: ScriptContext, purpose: String) -> Value {\n        mph : MintingPolicyHash = ctx.get_current_minting_policy_hash();\n        \n        mkTv(mph, self.uutTnFactory()(purpose))\n    }\n\n    func uutTnFactory(self) -> (String) -> String {\n        self.switch{\n            mintingUuts{MUseedTxn, MUseedIndex, _} => {\n                mkUutTnFactory(MUseedTxn, MUseedIndex)\n            },\n            // mintingCharter => {\n            //     mkUutTnFactory(seedTxn, seedIndex)\n            // },\n            _ => error(\"uutTnFactory: not mintingUuts!\")\n        } \n    }\n}\n\n");

code$7.srcFile = "src/CapoMintHelpers.hl";
code$7.purpose = "module";
code$7.moduleName = "CapoMintHelpers";

const CapoMintHelpers = code$7;

const code$6 = new String("module CapoDelegateHelpers\n\nimport {\n    mustFindInputRedeemer,\n    mkTv,\n    returnsValueToScript\n} from StellarHeliosHelpers\n\n// Delegates can define addtional activities in their enum variants,\n// but these 4 basic activities are essential.\nenum BASE_DELEGATE_Activity {\n    Authorizing\n    Reassigning\n    Retiring\n    Modifying\n}\n\n// todo: add this to RelativeDelegateLink\nenum stakingKeyRequirement {\n    NoStakingKeyAllowed\n    StakingKeyRequired\n    SpecificStakeKeyRequired {\n        stakeCredential: StakingCredential\n    }\n}\n\n// use this activity at Redeemer zero, as enum Redeemer {\n//   DelegateActivity { a: DelegateActivity }}\n//   ...app-specific redeemer variants\n// }\nenum DelegateActivity {\n    ReplacingMe { // replaces this mint delegate with a different one\n        seedTxn: TxId\n        seedIndex: Int\n        purpose: String\n    }\n    Retiring\n    Modifying\n    ValidatingSettings\n}\n\n// use this enum to match any redeemer if you don't care about what other\n// variants may be in that delegate, but you know it has to be a delegate with the \n// universal delegate activities at const#0\nenum MustUseDelegateActivity {\n    DelegateActivity {\n        a: DelegateActivity\n    }\n    // _r1  // shouldn't need placeholder variants, hopefully.\n    // _r2\n    // _r3\n    // _r4\n}\n\n\n// data stored in the Capo, representing basic delegate info\n//   about the connection to a delegate.  \nstruct RelativeDelegateLink {\n    uutName: String\n    strategyName: String\n    // delegate links without a validator hash are \"arms-length\" delegates,\n    // which means they won't be checked for possible auto-upgrades \n    //  ... to new versions of their code.\n    // it also means that they won't be able to participate \n    //   ... in validation of configuration changes in the Capo.\n    delegateValidatorHash: Option[ValidatorHash]\n    // !!! todo ???  - for namedDelegates particularly\n    // stakingCred: stakingKeyRequirement\n\n    func validatesUpdatedSettings(self,\n        inputs: []TxInput,\n        validatorHashRequired: Bool,\n        mph: MintingPolicyHash,\n        inputRequired: Bool,\n        ctx: ScriptContext\n    ) -> Option[Bool] {\n        self.hasDelegateInput(\n            inputs: inputs,\n            mph: mph,\n            validatorHashRequired: validatorHashRequired,\n            inputRequired: inputRequired\n        ).switch {\n            // hasDelegateInput already failed if the input was required.\n            None => Option[Bool]::None, // clean \"not found but that's permitted\"\n            Some{spendDelegateInput} => {\n                spendDelegateIsValid : Bool = MustUseDelegateActivity::from_data( \n                    mustFindInputRedeemer(ctx, spendDelegateInput)\n                ).switch {\n                    DelegateActivity{a} => {\n                        a.switch {\n                            ValidatingSettings => self.hasValidOutput(\n                                 mph, ctx\n                            ),\n                            _ => error(\"delegate not ValidatingSettings: \"+ self.uutName)\n                        }\n                    },\n                    _ => error(\"no way\") // throws if the redeemer isn't #0.\n                };\n\n                assert(spendDelegateIsValid, \"no way\"); // it threw any error already\n                Option[Bool]::Some{spendDelegateIsValid}        \n            }\n        }\n    }\n\n    func hasDelegateInput(self, \n        inputs: []TxInput, \n        validatorHashRequired: Bool,\n        mph: MintingPolicyHash,\n        inputRequired: Bool\n    ) -> Option[TxInput] {\n        addrCredNeeded : Option[Credential] = self.delegateValidatorHash.switch{\n            Some{vh} => Option[Credential]::Some{Credential::new_validator(vh)},\n            None => if (validatorHashRequired) { \n                // this is a major conflict - this delegate type is EXPECTED to have a validator hash.\n                error(\"missing required validator hash in delegate link \" + self.uutName)\n            } else { \n                Option[Credential]::None \n            }\n        };\n\n        addrCredNeeded.switch {\n            None => {\n                // when no special input is needed by the delegate, \n                // validatorHashRequired=true throws error above.\n                assert(!validatorHashRequired, \"no way\");\n\n                // when the delegate has no validator hash, then we shouldn't bother \n                // looking for a specific input.\n                //  so we should quickly return None.  Caller should bail out if the input is needed\n                if (inputRequired) {\n                    error(\"missing required input for delegate link \" + self.uutName)\n                };\n                Option[TxInput]::None\n            },\n            Some{needsAddrWithCred} => {\n                // if we arrived here, then we have a delegate that's supposed to be at a specific address.\n                // if we can't find an input with that address, it's an error condition.\n                // we need an input with this address, having the expected UUT.\n                expectedUut : Value = mkTv(mph, self.uutName);\n                inputs.find_safe((i: TxInput) -> Bool {\n                    i.address.credential == needsAddrWithCred &&\n                    i.value.contains(expectedUut)\n                }).switch {\n                    foundGood: Some => foundGood,\n                    /* notFound: */ None => {\n                        error(\"missing required input for delegate link \" + self.uutName)\n                    }\n                }\n            }        \n        }\n    }\n\n    // was requiresValidDelegateOutput \n    func hasValidOutput(\n        self, // delegateLink: RelativeDelegateLink, \n        mph: MintingPolicyHash, \n        ctx : ScriptContext,\n        required: Bool = true\n    ) -> Bool {\n        RelativeDelegateLink{\n            uut, strategy,\n            validatorHash\n        } = self;\n        if (strategy.encode_utf8().length < 4) {\n            error(\"strategy too short\")\n            // error(\"strategy must be at least 4 bytes, got: '\"+strategy +\n            //     \"' = \"+ strategy.encode_utf8().length.show()\n            // )\n        };\n    \n        v : Value = mkTv(mph, uut);\n        hasDelegate : Bool = validatorHash.switch{\n            Some{vh} => {\n                print(\" - seek dgTkn in vh \" + vh.show());\n                ctx.tx.value_locked_by(vh).contains(v)\n            },\n            None => {\n                print( \" - seek dgTkn in any outputs; no special vhash requirement\");\n                ctx.tx.outputs.find_safe((o : TxOutput) -> Bool {\n                    o.value.contains(v)\n                }).switch{\n                    Some => true, \n                    None => false\n                }\n            }\n        };\n    \n        if (!hasDelegate && required) {\n            error(\"missing dgTkn \"+ uut )\n        } else {\n            if (hasDelegate) {\n                print(\"has delegate: yes\")\n            } else {\n                print(\"has delegate: returning false\")\n            }\n        };\n        hasDelegate\n    }\n    \n    // config: Data\n}\n\n// data stored in isDelegate Datum (in the delegate's script)\n// ... links back to the capo info\nstruct DelegationDetail {\n    capoAddr: Address\n    mph: MintingPolicyHash\n    tn: ByteArray\n}\n\n// Delegates can define additional Datum in their enums,\n// but this first Datum is essential\nenum BASE_DELEGATE_Datum {\n    IsDelegation {\n        dd: DelegationDetail\n        CustomConfig: Data\n    }\n}\n\nfunc mustReturnValueToScript(value : Value, ctx : ScriptContext) -> Bool {\n    if (!returnsValueToScript( value, ctx)) {\n        error(\"authZor not returned\")\n        // error(\"the authZor token MUST be returned\")\n    };\n    true\n}\n\n//!!! call with existing delegate Datum.serialize()\nfunc unmodifiedDelegation(oldDD : ByteArray, ctx: ScriptContext) -> Bool {\n    o : []TxOutput = ctx.get_cont_outputs();\n    //    print(\"::::::::::::::::::::::::::::::::: hi \"+o.head.datum.get_inline_data().serialize().show());\n    assert(o.head.datum.get_inline_data().serialize() == oldDD,\n    // \"delegation datum must not be modified\"\n    \"modified dgtDtm\"\n);\n    true\n    // MintDelegateDatum::IsDelegation{\n    //     ddNew, _\n    // } = MintDelegateDatum::from_data( \n        \n    // );\n\n    //! the datum must be unchanged.\n    // ddNew == dd \n}\n\n/**\n * returns the AssetClass for the authority token found in the given DelegationDetail struct\n */\nfunc acAuthorityToken(dd: DelegationDetail) -> AssetClass {\n    AssetClass::new(dd.mph, dd.tn)\n}\n\n/**\n * returns a Value for the authority-token found in the given DelegationDetail struct\n */\n func tvAuthorityToken(dd: DelegationDetail) -> Value {\n    Value::new(\n        acAuthorityToken(dd), 1\n    )\n}\n\nfunc requiresNoDelegateInput(\n    delegateLink: RelativeDelegateLink, \n    mph: MintingPolicyHash, \n    ctx : ScriptContext\n) -> Bool {\n    v : Value = mkTv(mph, delegateLink.uutName);\n    if (ctx.tx.inputs.any((i: TxInput) -> Bool {\n        i.value.contains(v)\n    })) {\n        error(\"must not have dgTkn input: \"+delegateLink.uutName)\n    };\n    print(\"ok: no dgTkn input: \"+ delegateLink.uutName);\n    true\n}\n\n// just some convenience stuff to lead people to the right place\nstruct delegateLink_hasValidOutput_asMethod {\n    placeHolder: String \n}\n\nfunc requiresValidDelegateOutput(\n    delegateLink: delegateLink_hasValidOutput_asMethod,\n    mph: MintingPolicyHash, \n    ctx : ScriptContext,\n    required: Bool = true\n) -> Bool {\n    assert(false, \"replaced by delegateLink.hasValidOutput(...)\");\n    assert(delegateLink==delegateLink, \"no way\");\n    assert(mph==mph, \"no way\");\n    assert(ctx==ctx, \"no way\");\n    assert(required==required, \"no way\");\n    true\n}\n\n// todo: move to Mint helpers, as that's it's only purpose.\nfunc requiresDelegateAuthorizingMint(\n    delegateLink: RelativeDelegateLink, \n    mph: MintingPolicyHash, \n    ctx : ScriptContext,\n    extraMintDelegateRedeemerCheck: Bool = true\n) -> Bool {\n    authzVal : Value = Value::new(AssetClass::new(mph, delegateLink.uutName.encode_utf8()), 1);\n    print(\"finding my inp \"+ delegateLink.uutName);\n    targetId: TxOutputId = ctx.tx.inputs.find_safe((i: TxInput) -> {\n        // print(\"   ?  in \"+i.value.show());\n        i.value.contains(authzVal) // find my authority token\n    }).switch{\n        Some{x} => x.output_id,\n        None => error(\"missing dgTkn \"+delegateLink.uutName)\n    };\n    print (\"     found ^\");\n    spendsAuthorityUut : ScriptPurpose = ctx.tx.redeemers.find_key( \n        (purpose : ScriptPurpose) -> { purpose.switch{ \n            sp: Spending => {\n                // print (\"oid: \" + sp.output_id.show());\n                sp.output_id == targetId\n            }, \n            _ => false \n        } }\n    );\n\n    // r : Data = ctx.tx.redeemers.get(  // index redeemers by...\n    //     ScriptPurpose::new_spending(  // [spending, plus ...\n    //     );\n        \n    err : String = \"dgTkn \"+delegateLink.uutName+\" not being spent as expected\"; // \"not spent with an authorizing activity!\")\n    maybeCheckedMintDelegateAuthority : Bool = ctx.tx.redeemers.get_safe(\n        spendsAuthorityUut\n    ).switch {\n        None => {\n            error(err)\n        },\n        Some{x} => x.switch {\n            (index: Int, _fields: []Data) => {\n\n                /* avoids unused-variable warning: */ _fields == _fields && \n                if (!extraMintDelegateRedeemerCheck) {\n                    print(\"  -- okay, the delegate token was spent\");\n                    print(\"  -- skipping extra check for mint delegate's particular redeemer\");\n                    true\n                } else { \n                    if (0 == index || index >= 9) {\n                        print (\" -- delegate is authorizing: ok redeemer #\"+index.show());\n                        true\n                        } else {\n                        print(\"expected mint-delegation activity with index = 0 or >= 9, not: \"+index.show());\n                        error(err)\n                    }\n                }\n            },\n            _ => {\n                error(err)\n            }\n        }\n    };\n    delegateDidAuthorize = true; // otherwise, we'd have failed above.\n\n    // NOTE: DOESN'T CHECK that the AUTHORIZING DELEGATE is returned anywhere specific.\n    //    - it's not generally a minting responsibility (however, as an exception the bootstrap charter event DOES \n    //      actually check for valid delegate outputs).  All other cases should have the correct\n    //      delegate outputs checked (e.g. in the Capo's CharterDatum spend checker).\n    // print(\"no no no\");\n    // maybeCheckDelegateOutput : Bool = if (!checkDelegateOutput) {\n    //     print(\"  -- skipping check for expected delegate output \");\n    //     true\n    // } else {\n    //     delegateLink.hasValidOutput(mph, ctx)        \n    // };\n    delegateDidAuthorize && maybeCheckedMintDelegateAuthority\n}\n");

code$6.srcFile = "src/delegation/CapoDelegateHelpers.hl";
code$6.purpose = "module";
code$6.moduleName = "CapoDelegateHelpers";

const CapoDelegateHelpers = code$6;

var __defProp$6 = Object.defineProperty;
var __getOwnPropDesc$6 = Object.getOwnPropertyDescriptor;
var __decorateClass$6 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$6(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$6(target, key, result);
  return result;
};
class CapoMinter extends StellarContract {
  currentRev = 1n;
  contractSource() {
    return code$9;
  }
  getContractScriptParams(config) {
    const {
      seedIndex,
      seedTxn,
      rev = this.currentRev,
      isDev,
      devGen
    } = config;
    return {
      rev,
      seedIndex,
      seedTxn
    };
  }
  get scriptActivitiesName() {
    return "MinterActivity";
  }
  importModules() {
    const { capo } = this.configIn || this.partialConfig;
    if (!capo)
      throw new Error(
        `missing capo in config or partial-config for ${this.constructor.name}`
      );
    return capo.importModules();
  }
  activityMintingCharter(ownerInfo) {
    const { owner } = ownerInfo;
    const mintingCharter = this.mustGetActivity("mintingCharter");
    this.onChainTypes;
    const t = new mintingCharter(owner);
    return { redeemer: t._toUplcData() };
  }
  activityMintWithDelegateAuthorizing() {
    const mintWithDelegateAuthorizing = this.mustGetActivity(
      "mintWithDelegateAuthorizing"
    );
    const t = new mintWithDelegateAuthorizing();
    return { redeemer: t._toUplcData() };
  }
  activityAddingMintInvariant({
    seedTxn,
    seedIndex: sIdx
  }) {
    const addingMintInvariant = this.mustGetActivity("addingMintInvariant");
    const t = new addingMintInvariant(seedTxn, BigInt(sIdx));
    return { redeemer: t._toUplcData() };
  }
  activityAddingSpendInvariant({
    seedTxn,
    seedIndex: sIdx
  }) {
    const addingSpendInvariant = this.mustGetActivity(
      "addingSpendInvariant"
    );
    const t = new addingSpendInvariant(seedTxn, BigInt(sIdx));
    return { redeemer: t._toUplcData() };
  }
  activityForcingNewMintDelegate({
    seedTxn,
    seedIndex
  }) {
    console.warn(
      "NOTE: REPLACING THE MINT DELEGATE USING A DIRECT MINTER ACTIVITY\nTHIS IS NOT THE RECOMMENDED PATH - prefer using the existing mint delegate's ReplacingMe activity'"
    );
    const ReplacingMintDelegate = this.mustGetActivity(
      "ForcingNewMintDelegate"
    );
    const t = new ReplacingMintDelegate(seedTxn, BigInt(seedIndex));
    return { redeemer: t._toUplcData() };
  }
  activityCreatingNewSpendDelegate({
    seedTxn,
    seedIndex,
    replacingUut
  }) {
    const ReplacingSpendDelegate = this.mustGetActivity(
      "CreatingNewSpendDelegate"
    );
    const OptByteArray = Option(ByteArray);
    const uutName = new OptByteArray(replacingUut);
    const t = new ReplacingSpendDelegate(
      seedTxn,
      BigInt(seedIndex),
      uutName
    );
    return { redeemer: t._toUplcData() };
  }
  activityMintingUuts({
    seedTxn,
    seedIndex: sIdx,
    purposes
  }) {
    throw new Error(
      `minter:mintingUuts obsolete; use minter:MintWithDelegateAuthorizing with delegate:mintingUuts or another application-specific activity`
    );
  }
  activityBurningUuts(...uutNames) {
    throw new Error(
      `minter:burningUuts obsolete; use minter:MintWithDelegateAuthorizing with delegate:burningUuts or another application-specific activity`
    );
  }
  async txnBurnUuts(initialTcx, uutNames) {
    const tokenNames = uutNames.map((un) => un.name);
    const tcx2 = this.attachRefScript(
      initialTcx.mintTokens(
        this.mintingPolicyHash,
        tokenNames.map(
          (tokenName) => mkValuesEntry(tokenName, BigInt(-1))
        ),
        this.activityBurningUuts(...tokenNames).redeemer
      )
    );
    return tcx2;
  }
  //! overrides base getter type with undefined not being allowed
  get mintingPolicyHash() {
    return super.mintingPolicyHash;
  }
  get charterTokenAsValuesEntry() {
    return mkValuesEntry("charter", BigInt(1));
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
  async txnMintingCharter(tcx, {
    owner,
    capoGov,
    mintDelegate,
    spendDelegate,
    settingsUut
  }) {
    //!!! todo: can we expect capoGov & mintDgt in tcx.state.uuts? and update the type constraint here?
    const charterVE = this.charterTokenAsValuesEntry;
    const capoGovVE = mkValuesEntry(capoGov.name, BigInt(1));
    const mintDgtVE = mkValuesEntry(mintDelegate.name, BigInt(1));
    const spendDgtVE = mkValuesEntry(spendDelegate.name, BigInt(1));
    const settingsUutVE = mkValuesEntry(settingsUut.name, BigInt(1));
    const values = [
      charterVE,
      settingsUutVE,
      capoGovVE,
      mintDgtVE,
      spendDgtVE
    ];
    return this.attachRefScript(
      tcx.mintTokens(
        this.mintingPolicyHash,
        values,
        this.activityMintingCharter({
          owner
        }).redeemer
      )
    );
  }
  attachRefScript(tcx) {
    return this.configIn.capo.txnAttachScriptOrRefScript(
      tcx,
      this.compiledScript
    );
  }
  async txnMIntingWithoutDelegate(tcx, vEntries, minterActivity) {
    return this.attachRefScript(
      tcx.mintTokens(
        this.mintingPolicyHash,
        vEntries,
        minterActivity.redeemer
      )
    );
  }
  async txnMintWithDelegateAuthorizing(tcx, vEntries, mintDelegate, mintDgtRedeemer, returnExistingDelegate = true) {
    const { capo } = this.configIn;
    const md = mintDelegate || await capo.getMintDelegate();
    const tcx1 = await capo.txnMustUseCharterUtxo(tcx, "refInput");
    const tcx2 = await md.txnGrantAuthority(
      tcx1,
      mintDgtRedeemer,
      returnExistingDelegate
    );
    return this.attachRefScript(
      tcx2.mintTokens(
        this.mintingPolicyHash,
        vEntries,
        this.activityMintWithDelegateAuthorizing().redeemer
      )
    );
  }
}
__decorateClass$6([
  Activity.redeemer
], CapoMinter.prototype, "activityMintingCharter", 1);
__decorateClass$6([
  Activity.redeemer
], CapoMinter.prototype, "activityMintWithDelegateAuthorizing", 1);
__decorateClass$6([
  Activity.redeemer
], CapoMinter.prototype, "activityAddingMintInvariant", 1);
__decorateClass$6([
  Activity.redeemer
], CapoMinter.prototype, "activityAddingSpendInvariant", 1);
__decorateClass$6([
  Activity.redeemer
], CapoMinter.prototype, "activityForcingNewMintDelegate", 1);
__decorateClass$6([
  Activity.redeemer
], CapoMinter.prototype, "activityCreatingNewSpendDelegate", 1);
__decorateClass$6([
  Activity.redeemer
], CapoMinter.prototype, "activityMintingUuts", 1);
__decorateClass$6([
  Activity.redeemer
], CapoMinter.prototype, "activityBurningUuts", 1);
__decorateClass$6([
  partialTxn
], CapoMinter.prototype, "txnBurnUuts", 1);
__decorateClass$6([
  Activity.partialTxn
], CapoMinter.prototype, "txnMintingCharter", 1);
__decorateClass$6([
  Activity.partialTxn
], CapoMinter.prototype, "txnMIntingWithoutDelegate", 1);
__decorateClass$6([
  Activity.partialTxn
], CapoMinter.prototype, "txnMintWithDelegateAuthorizing", 1);

const TODO = Symbol("needs to be implemented");
function hasReqts(reqtsMap) {
  return reqtsMap;
}
hasReqts.TODO = TODO;
function mergesInheritedReqts(inherits, reqtsMap) {
  return { ...inherits, ...reqtsMap };
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
class StellarDelegate extends StellarContract {
  static currentRev = 1n;
  static get defaultParams() {
    return { rev: this.currentRev };
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
  async txnGrantAuthority(tcx, redeemer, returnExistingDelegate = true) {
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
      const tcx2 = await this.DelegateAddsAuthorityToken(tcx, uutxo, redeemer || this.activityAuthorizing());
      if (!returnExistingDelegate)
        return tcx2;
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
  activityAuthorizing() {
    throw new Error("unused");
  }
  activityReplacingMe({
    // todo: add type for seedTxnDetails
    seedTxn,
    seedIndex,
    purpose
  }) {
    debugger;
    const {
      DelegateActivity: thisActivity,
      activity: ReplacingMe
    } = this.mustGetDelegateActivity("ReplacingMe");
    const t = new thisActivity(
      new ReplacingMe(
        seedTxn,
        seedIndex,
        purpose
      )
    );
    return { redeemer: t._toUplcData() };
  }
  mustGetDelegateActivity(delegateActivityName) {
    const DAType = this.mustGetActivity("DelegateActivity");
    const { DelegateActivity } = this.onChainTypes;
    const activity = this.mustGetEnumVariant(
      DelegateActivity,
      delegateActivityName
    );
    return { DelegateActivity: DAType, activity };
  }
  activityRetiring() {
    const { DelegateActivity, activity: Retiring } = this.mustGetDelegateActivity("Retiring");
    const t = new DelegateActivity(
      new Retiring()
    );
    return { redeemer: t._toUplcData() };
  }
  activityModifying() {
    const { DelegateActivity, activity: Modifying } = this.mustGetDelegateActivity("Modifying");
    const t = new DelegateActivity(
      new Modifying()
    );
    return { redeemer: t._toUplcData() };
  }
  activityValidatingSettings() {
    const { DelegateActivity, activity: ValidatingSettings } = this.mustGetDelegateActivity("ValidatingSettings");
    const t = new DelegateActivity(
      new ValidatingSettings()
    );
    return { redeemer: t._toUplcData() };
  }
  mkDatumIsDelegation(dd, ...args) {
    const [customConfig = ""] = args;
    const { IsDelegation } = this.onChainDatumType;
    const { DelegationDetail } = this.onChainTypes;
    const t = new IsDelegation(new DelegationDetail(dd), customConfig);
    return Datum.inline(t._toUplcData());
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
  mkAuthorityTokenPredicate() {
    return this.mkTokenPredicate(this.tvAuthorityToken());
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
    if (useMinTv)
      return this.mkMinTv(mph, tn);
    return mkTv(mph, tn);
  }
  /**
   * Finds the delegate authority token, normally in the delegate's contract address
   * @public
   * @remarks
   *
   * The default implementation finds the UTxO having the authority token
   * in the delegate's contract address.
   *
   * It's possible to have a delegate that doesn't have an on-chain contract script.
   * ... in this case, the delegate should use this.{@link StellarDelegate.tvAuthorityToken | tvAuthorityToken()} and a
   * delegate-specific heuristic to locate the needed token.  It might consult the
   * addrHint in its `configIn` or another technique for resolution.
   *
   * @param tcx - the transaction context
   * @reqt It MUST resolve and return the UTxO (a TxInput type ready for spending)
   *  ... or throw an informative error
   **/
  async findAuthorityToken() {
    const { address } = this;
    return this.hasUtxo(
      `authority token: ${bytesToText(this.configIn.tn)}`,
      this.mkTokenPredicate(this.tvAuthorityToken()),
      { address }
    );
  }
  /**
   * Tries to locate the Delegates authority token in the user's wallet (ONLY for non-smart-contract delegates)
   * @remarks
   *
   * Locates the authority token,if available the current user's wallet.
   *
   * If the token is located in a smart contract, this method will always return `undefined`.  
   * Use {@link StellarDelegate.findAuthorityToken | findAuthorityToken()} in that case.
   *
   * If the authority token is in a user wallet (not the same wallet as currently connected to the Capo contract class),
   * it will return `undefined`.
   *
   * @public
   **/
  async findActorAuthorityToken() {
    return void 0;
  }
  /**
   * Finds the delegate authority token, normally in the delegate's contract address
   * @public
   * @remarks
   *
   * The default implementation finds the UTxO having the authority token
   * in the delegate's contract address.
   *
   * It's possible to have a delegate that doesn't have an on-chain contract script.
   * ... in this case, the delegate should use this.{@link StellarDelegate.tvAuthorityToken | tvAuthorityToken()} and a
   * delegate-specific heuristic to locate the needed token.  It might consult the
   * addrHint in its `configIn` or another technique for resolution.
   *
   * @param tcx - the transaction context
   * @reqt It MUST resolve and return the UTxO (a TxInput type ready for spending)
   *  ... or throw an informative error
   **/
  async DelegateMustFindAuthorityToken(tcx, label) {
    return this.mustFindMyUtxo(
      `${label}: ${bytesToText(this.configIn.tn)}`,
      this.mkTokenPredicate(this.tvAuthorityToken()),
      "this delegate strategy might need to override txnMustFindAuthorityToken()"
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
   * The default implementation adds the `uutxo` to the transaction 
   * using {@link StellarDelegate.activityAuthorizing | activityAuthorizing() }.
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
   *  * that the token is spent with Authorizing activity (redeemer).  NOTE:
   *     the **CapoDelegateHelpers** helios module provides the `requiresDelegateAuthorizing()` 
   *     function for just this purpose
  
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
    return capo.txnAttachScriptOrRefScript(
      tcx.addInput(uutxo, redeemer),
      this.compiledScript
    );
  }
  /**
   * Adds any important transaction elemements supporting the authority token being retired, closing the delegate contracts' utxo.
   * @remarks
   *
   * EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
   *
   * EXPECTS the `burn` instruction to be separately added to the transaction.
   *
   * The default implementation uses the conventional `Retiring` activity
   * to spend the token.
   *
   * @reqt
   * It MUST add the indicated utxo to the transaction as an input
   *
   * @reqt
   * When backed by a contract:
   *   * it should use an activity/redeemer allowing the token to be spent
   *      **and NOT returned**.
   *   * the contract script SHOULD ensure any other UTXOs it may also hold, related to this delegation,
   *      do not become inaccessible as a result.
   *
   * It MAY enforce additional requirements and/or block the action.
   *
   *
   * @param tcx - transaction context
   * @param fromFoundUtxo - the utxo having the authority otken
   * @public
   **/
  async DelegateRetiresAuthorityToken(tcx, fromFoundUtxo) {
    const utxo = fromFoundUtxo;
    return tcx.addInput(
      new TxInput(utxo.outputId, utxo.origOutput),
      this.activityRetiring()
    );
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
__decorateClass$5([
  Activity.redeemer
], StellarDelegate.prototype, "activityAuthorizing", 1);
__decorateClass$5([
  Activity.redeemer
], StellarDelegate.prototype, "activityReplacingMe", 1);
__decorateClass$5([
  Activity.redeemer
], StellarDelegate.prototype, "activityRetiring", 1);
__decorateClass$5([
  Activity.redeemer
], StellarDelegate.prototype, "activityModifying", 1);
__decorateClass$5([
  Activity.redeemer
], StellarDelegate.prototype, "activityValidatingSettings", 1);
__decorateClass$5([
  datum
], StellarDelegate.prototype, "mkDatumIsDelegation", 1);

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
function delegateRoles(roleMap) {
  return roleMap;
}
function delegateLinkSerializer(key, value) {
  if (typeof value === "bigint") {
    return value.toString();
  } else if ("bytes" == key && Array.isArray(value)) {
    return bytesToHex(value);
  } else if (value instanceof Address) {
    return value.toBech32();
  } else if ("tn" == key && Array.isArray(value)) {
    return bytesToText(value);
  }
  if (key === "capo")
    return void 0;
  return value;
}
function defineRole(uutBaseName, baseClass, variants) {
  return {
    uutPurpose: uutBaseName,
    baseClass,
    variants
  };
}
//!!! todo: develop this further to allow easily enhancing a parent role-definition
//! a map of delegate selections needed for a transaction
//! a single delegate selection, where a person chooses

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
//!!! todo: let this be parameterized for more specificity
class Capo extends StellarContract {
  static currentRev = 1n;
  devGen = 0n;
  verifyConfigs() {
    return this.verifyCoreDelegates();
  }
  get isConfigured() {
    if (!this.configIn)
      return Promise.resolve(false);
    return Promise.resolve(true);
  }
  static parseConfig(rawJsonConfig) {
    throw new Error(
      `Stellar contract subclasses should define their own static parseConfig where needed to enable connection from a specific dApp to a specific Stellar Contract.`
    );
  }
  static get defaultParams() {
    const params = {
      rev: this.currentRev,
      devGen: 0n
    };
    return params;
  }
  /**
   * extracts from the input configuration the key details needed to construct/reconstruct the on-chain contract address
   * @remarks
   *
   * extracts the details that are key to parameterizing the Capo / leader's on-chain contract script
   * @public
   **/
  getContractScriptParams(config) {
    if (this.configIn && config.mph && this.minter && !config.mph.eq(this.mph))
      throw new Error(`mph mismatch`);
    const { mph } = config;
    const rev = this.constructor.currentRev;
    const params = {
      mph,
      rev,
      isDev: false,
      devGen: 0n
    };
    if ("production" !== process.env.NODE_ENV) {
      if (0n === this.devGen && "test" !== process.env.NODE_ENV) {
        throw new Error(
          `${this.constructor.name}: missing required instance property devGen : bigint > 0n`
        );
      }
      params.isDev = true;
      params.devGen = this.devGen;
    }
    return params;
  }
  async init(args) {
    await super.init(args);
    const {
      scriptDatumName: onChainDatumName,
      scriptActivitiesName: onChainActivitiesName
    } = this;
    const { CharterToken } = this.onChainDatumType;
    const updatingCharter = this.mustGetActivity("updatingCharter");
    const usingAuthority = this.mustGetActivity("usingAuthority");
    if (!CharterToken)
      throw new Error(
        `datum type ${onChainDatumName} must have a 'CharterToken' variant`
      );
    if (!updatingCharter)
      throw new Error(
        `activities type ${onChainActivitiesName} must have a 'updatingCharter' variant`
      );
    if (!usingAuthority)
      throw new Error(
        `activities type${onChainActivitiesName} must have a 'usingAuthority' variant`
      );
    if (this.configIn && !this.configIn.bootstrapping) {
      const { seedIndex, seedTxn } = this.configIn;
      await this.connectMintingScript({ seedIndex, seedTxn });
      await this.verifyConfigs();
    }
    this.settingsAdapter = this.initSettingsAdapter();
    return this;
  }
  static bootstrapWith(args) {
    const { setup, config } = args;
    const Class = this;
    return new Class({ setup, config: { ...config, bootstrapping: true } });
  }
  settingsAdapter;
  // abstract readSettingsDatum(settings: 
  //     ReturnType<this["initSettingsAdapter"]> extends DatumAdapter<any, infer Onchain, any> ? 
  //     Onchain : never
  // );
  async readSettingsDatum(parsedDatum) {
    return this.settingsAdapter.fromOnchainDatum(parsedDatum);
  }
  get minterClass() {
    return CapoMinter;
  }
  minter;
  uutsValue(x) {
    let uutMap = x instanceof StellarTxnContext ? x.state.uuts : x instanceof UutName ? { single: x } : Array.isArray(x) ? { single: new UutName("some-uut", x) } : x;
    const vEntries = mkUutValuesEntries(uutMap);
    return new Value(
      void 0,
      new Assets([[this.mintingPolicyHash, vEntries]])
    );
  }
  activityUsingAuthority() {
    const usingAuthority = this.mustGetActivity("usingAuthority");
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
    return [code$8, CapoDelegateHelpers, CapoMintHelpers];
  }
  get charterTokenPredicate() {
    const predicate = this.mkTokenPredicate(this.tvCharter());
    return predicate;
  }
  //! forms a Value with minUtxo included
  tokenAsValue(tokenName, count = 1n) {
    const { mph } = this;
    const tn = tokenName.toString();
    return this.mkMinTv(mph, tn, count);
  }
  async mustFindCharterUtxo() {
    const predicate = this.mkTokenPredicate(this.tvCharter());
    return this.mustFindMyUtxo("charter", predicate, "has it been minted?");
  }
  // non-activity partial
  async txnMustUseCharterUtxo(tcx, redeemerOrRefInput, newDatum) {
    return this.mustFindCharterUtxo().then(async (ctUtxo) => {
      if (true === redeemerOrRefInput || "refInput" === redeemerOrRefInput) {
        if (newDatum)
          throw new Error(
            `when using reference input for charter, arg3 must be omitted`
          );
        tcx.addRefInput(ctUtxo);
      } else {
        const redeemer = redeemerOrRefInput;
        this.txnAttachScriptOrRefScript(
          tcx.addInput(ctUtxo, redeemer),
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
  /**
   * Tries to locate the Capo charter's gov-authority token through its configured delegate
   * @remarks
   *
   * Uses the Capo's govAuthority delegate to locate the gov-authority token,
   * if available.  If that token is located in a smart contract, it should always be
   * found (note, however, that the current user may not have the direct permission
   * to spend the token in a transaction).
   *
   * If the token is located in a user wallet, and that user is not the contract's current
   * actor, then the token utxo will not be returned from this method.
   *
   * @public
   **/
  async findGovAuthority() {
    const delegate = await this.findGovDelegate();
    return delegate.findAuthorityToken();
  }
  /**
   * Tries to locate the Capo charter's gov-authority token in the user's wallet, using its configured delegate
   * @remarks
   *
   * Uses the Capo's govAuthority delegate to locate the gov-authority token,
   * if available the current user's wallet.
   *
   * A delegate whose authority token is located in a smart contract will always return `undefined`.
   *
   * If the authority token is in a user wallet (not the same wallet as currently connected to the Capo contract class),
   * it will return `undefined`.
   *
   * @public
   **/
  async findActorGovAuthority() {
    const delegate = await this.findGovDelegate();
    return delegate.findActorAuthorityToken();
  }
  /**
   * REDIRECT: Use txnAddGovAuthorityTokenRef to add the charter-governance authority token to a transaction,
   * or findGovAuthority() or findActorGovAuthority() for locating that txo.
   * @remarks
   *
   * this is a convenience method for redirecting developers to
   * find the right method name for finding or including a gov-authority token
   * in a transaction
   * @deprecated - see other method names, depending on what result you want
   * @public
   **/
  findCharterAuthority() {
    throw new Error(
      `use findGovAuthority() to locate charter's gov-authority token`
    );
  }
  /**
   * REDIRECT: use txnAddGovAuthorityTokenRef() instead
   * @remarks
   *
   * this method was renamed.
   * @deprecated - look for txnAddGovAuthorityTokenRef() instead
   * @public
   **/
  async txnAddCharterAuthorityTokenRef() {
    throw new Error(`use txnAddGovAuthorityTokenRef() instead`);
  }
  async txnAddGovAuthorityTokenRef(tcx) {
    const tcx2 = await this.txnMustUseCharterUtxo(tcx, "refInput");
    const tcx3 = await this.txnAddGovAuthority(tcx2);
    return tcx3;
  }
  /**
   * provides minter-targeted params extracted from the input configuration
   * @remarks
   *
   * extracts the seed-txn details that are key to parameterizing the minter contract
   * @public
   **/
  getMinterParams() {
    const { seedTxn, seedIndex } = this.configIn;
    return { seedTxn, seedIndex };
  }
  // getCapoRev() {
  //     return 1n;
  // }
  get mph() {
    return this.minter.mintingPolicyHash;
  }
  get mintingPolicyHash() {
    return this.mph;
  }
  async findActorUut(uutPrefix, mph = this.mph) {
    const foundUtxo = await this.findActorUtxo(`uut ${uutPrefix}-`, (utxo) => {
      if (getMatchingTokenName(utxo, mph)) {
        return utxo;
      }
    });
    if (!foundUtxo)
      return void 0;
    return {
      utxo: foundUtxo,
      uut: new UutName(uutPrefix, getMatchingTokenName(foundUtxo, mph))
    };
    function getMatchingTokenName(utxo, mph2) {
      const tokenNamesExisting = utxo.value.assets.getTokenNames(mph2).map((x) => bytesToText(x.bytes));
      const tokenNames = tokenNamesExisting.filter((x) => {
        return !!x.startsWith(`${uutPrefix}-`);
      });
      return tokenNames[0];
    }
  }
  async connectMintingScript(params) {
    if (this.minter)
      throw new Error(`just use this.minter when it's already present`);
    const { minterClass } = this;
    const { seedTxn, seedIndex } = params;
    const {
      mph: expectedMph,
      devGen,
      isDev
    } = this.configIn || {
      isDev: false,
      devGen: 0n
    };
    const minter = await this.addStrellaWithConfig(minterClass, {
      isDev,
      devGen,
      seedTxn,
      seedIndex,
      //@ts-expect-error - subclassing Capo in a different way than DefaultCapo
      //   isn't actively supported yet
      capo: this
    });
    if (expectedMph && !minter.mintingPolicyHash.eq(expectedMph)) {
      throw new Error(
        `This minter script with this seed-utxo doesn't produce the required  minting policy hash
expected: ` + expectedMph.hex + "\nactual: " + minter.mintingPolicyHash.hex
      );
    } else if (!expectedMph) {
      console.log(`${this.constructor.name}: seeding new minting policy`);
    }
    const mintingCharter = minter.mustGetActivity("mintingCharter");
    if (!mintingCharter)
      throw new Error(
        `minting script doesn't offer required 'mintingCharter' activity-redeemer`
      );
    return this.minter = minter;
  }
  /**
   * Finds a sufficient-sized utxo for seeding one or more named tokens
   * @remarks
   *
   * For allocating a charter token (/its minter), one or more UUTs, or other token name(s)
   * to be minted, this function calculates the size of minUtxo needed for all the needed tokens,
   * assuming they'll each be stored in separate utxos.  It then finds and returns a UTxO from the
   * current actor's wallet.  The utxo is NOT implicitly added to the transaction (use tcx.addInput() to add it).
   *
   * When the transaction context already has some utxo's being consumed, they're not
   * eligible for selection.
   *
   * If the transaction doesn't store the new tokens in separate utxos, any spare lovelace
   * are returned as change in the transaction.
   *
   * @param tcx - transaction context
   * @param purpose - a descriptive purpose used during utxo-finding in case of problems
   * @param tokenNames - the token names to be seeded.
   * @public
   **/
  async txnMustGetSeedUtxo(tcx, purpose, tokenNames) {
    //! given a Capo-based contract instance having a free TxInput to seed its validator address,
    //! prior to initial on-chain creation of contract,
    //! it finds that specific TxInput in the current user's wallet.
    const fakeMph = new MintingPolicyHash([]);
    const totalMinUtxoValue = tokenNames.reduce(
      addTokenValue.bind(this),
      new Value(0n)
    );
    //! accumulates min-utxos for each stringy token-name in a reduce()
    function addTokenValue(accumulator, tn) {
      const vMin = this.mkMinTv(fakeMph, tn);
      return accumulator.add(vMin);
    }
    const uutSeed = this.mkValuePredicate(totalMinUtxoValue.lovelace, tcx);
    const seedUtxo = await this.mustFindActorUtxo(
      purpose,
      uutSeed,
      tcx
    ).catch((x) => {
      throw x;
    });
    const { txId: seedTxn, utxoIdx } = seedUtxo.outputId;
    const seedIndex = BigInt(utxoIdx);
    const count = tokenNames.length > 1 ? `${tokenNames.length} uuts for ` : "";
    console.log(
      `Seed tx for ${count}${purpose}: ${seedTxn.hex.slice(
        0,
        8
      )}\u2026${seedTxn.hex.slice(-4)}#${seedIndex}`
    );
    return seedUtxo;
  }
  /**
   * Creates a new delegate link, given a delegation role and and strategy-selection details
   * @remarks
   *
   * Combines partal and implied configuration settings, validating the resulting configuration.
   * 
   * It expects the transaction-context to have a UUT whose name (or a UUT roleName) matching 
   * the indicated `roleName`.  Use {@link txnWillMintUuts`} or {@link txnMintingUuts} to construct
   * a transaction having that and a compliant txn-type.
   *
   * The resulting "relative" delegate link can be used directly in a Datum field of type RelativeDelegateLink
   * or can be stored off-chain in any way suitable for your dApp.
   *
   * To get a full DelegateSettings object, use txnCreateDelegateSettings() instead.
   *
   * @reqt throws DelegateConfigNeeded with an `errors` entry
   *   ... if there are any problems in validating the net configuration settings.
   * @reqt EXPECTS the `tcx` to be minting a UUT for the delegation,
   *   ... whose UutName can be found in `tcx.state.uuts[roleName]`
   * @reqt combines base settings from the selected delegate class's `defaultParams`
   *   ... adding the delegateRoles()[roleName] configuration for the selected roleName,
   *   ... along with any explicit `config` from the provided `delegateInfo`
   *   ... and automatically applies a `uut` setting.
   *   ... The later properties in this sequence take precedence.
   *
   * @param tcx - A transaction-context
   * @param roleName - the role of the delegate, matched with the `delegateRoles()` of `this`
   * @param delegateInfo - partial detail of the delegation, with `strategyName` and any other
   *     details required by the particular role.  Its delegate type must be matchy with the type indicated by the `roleName`.
   * @public
   **/
  async txnCreateDelegateLink(tcx, roleName, delegateInfo = { strategyName: "default" }) {
    const configured = await this.txnCreateConfiguredDelegate(
      tcx,
      roleName,
      delegateInfo
    );
    await configured.delegate.txnReceiveAuthorityToken(
      tcx,
      this.mkMinTv(this.mph, tcx.state.uuts[roleName])
    );
    return configured;
  }
  // this is just type sugar - a configured delegate already has all the relative-delegate link properties.
  relativeLink(configured) {
    const {
      strategyName,
      delegateValidatorHash,
      uutName,
      config
    } = configured;
    return {
      strategyName,
      uutName,
      delegateValidatorHash,
      config
      // addrHint,  //moved to config
      // reqdAddress,  // removed
    };
  }
  /**
   * Generates and returns a complete set of delegate settings, given a delegation role and strategy-selection details.
   * @remarks
   *
   * Maps the indicated delegation role to specific UUT details from the provided transaction-context
   * to provide the resulting settings.  The transaction context isn't modified.
   *
   * Behaves exactly like (and provides the core implementation of) {@link Capo.txnCreateDelegateLink | txnCreateDelegateLink()},
   * returning additional `roleName` and `delegateClass`, to conform with the DelegateSettings type.
   *
   * See txnCreateDelegateLink for further details.
   * @public
   **/
  async txnCreateConfiguredDelegate(tcx, roleName, delegateInfo = { strategyName: "default" }) {
    const { strategyName, config: selectedConfig = {} } = delegateInfo;
    const { delegateRoles } = this;
    const uut = tcx.state.uuts[roleName];
    const impliedDelegationDetails = this.mkImpliedDelegationDetails(uut);
    const foundStrategies = delegateRoles[roleName];
    if (!foundStrategies) {
      throw new Error(`no delegateRoles entry for role '${roleName}'`);
    }
    const selectedStrategy = foundStrategies.variants[strategyName];
    if (!selectedStrategy) {
      let msg = `invalid strategyName '${strategyName}' for role '${roleName}'`;
      if (strategyName == "default") {
        msg = `no selected or default delegate for role '${roleName}'.  Specify strategyName`;
      }
      const e = new DelegateConfigNeeded(msg, {
        errorRole: roleName,
        availableStrategies: Object.keys(foundStrategies.variants)
      });
      throw e;
    }
    const { delegateClass, validateConfig } = selectedStrategy;
    const { defaultParams: defaultParamsFromDelegateClass } = delegateClass;
    const scriptParamsFromStrategyVariant = selectedStrategy.partialConfig || {};
    const mergedConfig = {
      ...defaultParamsFromDelegateClass,
      ...scriptParamsFromStrategyVariant || {},
      ...selectedConfig,
      ...impliedDelegationDetails,
      devGen: this.devGen,
      capo: this
    };
    //! it validates the net configuration so it can return a working config.
    const errors = validateConfig && validateConfig(mergedConfig);
    if (errors) {
      throw new DelegateConfigNeeded(
        `validation errors in delegateInfo.config for ${roleName} '${strategyName}':
` + errorMapAsString(errors),
        { errors }
      );
    }
    const delegateSettings = {
      ...delegateInfo,
      roleName,
      delegateClass,
      uutName: uut.name,
      config: mergedConfig
    };
    let delegate = await this.mustGetDelegate(delegateSettings);
    const { delegateValidatorHash } = delegate;
    const pcd = {
      ...delegateSettings,
      delegateValidatorHash,
      delegate
    };
    return pcd;
  }
  mkImpliedDelegationDetails(uut) {
    return {
      capoAddr: this.address,
      mph: this.mph,
      tn: stringToNumberArray(uut.name)
    };
  }
  #_delegateCache = {};
  // get connectDelegate()
  async connectDelegateWithLink(roleName, delegateLink) {
    const cache = this.#_delegateCache;
    const cacheKey = JSON.stringify(
      delegateLink,
      delegateLinkSerializer,
      4
      // indent 4 spaces 
    );
    console.log(`   ----- delegate '${roleName}' cache key `, cacheKey);
    if (!cache[roleName])
      cache[roleName] = {};
    const roleCache = cache[roleName];
    const cachedRole = roleCache[cacheKey];
    if (cachedRole) {
      console.log("   <---- cached delegate");
      return cachedRole;
    }
    const role = this.delegateRoles[roleName];
    //!!! work on type-safety with roleName + available roles
    const {
      strategyName,
      uutName,
      delegateValidatorHash: expectedDvh,
      // addrHint,  //moved to config
      // reqdAddress,  // removed
      config: linkedConfig
    } = delegateLink;
    const selectedStrat = role.variants[strategyName];
    if (!selectedStrat) {
      throw new Error(
        `mismatched strategyName '${strategyName}' in delegate link for role '${roleName}'
  ...available strategies: ${Object.keys(
          role.variants
        ).join(", ")}.

 link details: ${this.showDelegateLink(
          delegateLink
        )}`
      );
    }
    const { delegateClass, config: stratSettings } = selectedStrat;
    const { defaultParams: defaultParamsFromDelegateClass } = delegateClass;
    const impliedDelegationDetails = this.mkImpliedDelegationDetails(
      new UutName(roleName, uutName)
    );
    const config = {
      ...defaultParamsFromDelegateClass,
      ...stratSettings,
      // addrHint,  //moved to config
      // reqdAddress,  // removed
      ...linkedConfig,
      ...impliedDelegationDetails,
      devGen: this.devGen,
      capo: this
    };
    //!  //  delegate: DT // omitted in "pre-configured";
    const delegate = await this.mustGetDelegate({
      delegateClass,
      config,
      roleName,
      uutName,
      strategyName
      // reqdAddress,
      // addrHint,
    });
    const dvh = delegate.delegateValidatorHash;
    if (expectedDvh && dvh && !expectedDvh.eq(dvh)) {
      throw new Error(
        `${this.constructor.name}: ${roleName}: mismatched or modified delegate: expected validator ${expectedDvh?.hex}, got ${dvh.hex}`
      );
    }
    console.log(
      `    <--- caching first instance of delegate ${roleName} @ key = ${cacheKey}`
    );
    roleCache[cacheKey] = delegate;
    return delegate;
  }
  showDelegateLink(delegateLink) {
    return JSON.stringify(delegateLink, null, 2);
  }
  async mustGetDelegate(configuredDelegate) {
    const { delegateClass, config } = configuredDelegate;
    try {
      const configured = await this.addStrellaWithConfig(
        delegateClass,
        config
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
  tvForDelegate(dgtLink) {
    return this.tokenAsValue(dgtLink.uutName);
  }
  mkDelegatePredicate(dgtLink) {
    return this.mkTokenPredicate(this.tvForDelegate(dgtLink));
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
          "Building a txn with a UUT involves using the txnMintingUuts partial-helper on the Capo.",
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
          "supports just-in-time strategy-selection using txnCreateDelegateLink()",
          "given a configured delegate-link, it can create a ready-to-use Stellar subclass with all the right settings",
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
          "Capo EXPECTS a synchronous getter for 'delegateRoles' to be defined",
          "Capo provides a default 'delegateRoles' having no specific roles (or maybe just minter - TBD)",
          "Subclasses can define their own get delegateRoles(), return a role-map-to-variant-map structure"
        ],
        requires: [
          "Each role uses a RoleVariants structure which can accept new variants"
        ]
      },
      "supports just-in-time strategy-selection using txnCreateDelegateLink()": {
        purpose: "enabling each transaction to select appropriate plugins for its contextual needs",
        details: [
          "When a transaction having an extensibility-point is being created,",
          "  ... it SHOULD require an explicit choice of the delegate to use in that role.",
          "When a 'mkTxn\u2039DoesThings\u203A' method creates a new role-delegated UTxO, ",
          "  ... it sets essential configuration details for the delegation ",
          "  ... including a specific UUT that provides a linking mechanism for the delegate",
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
          "txnCreateDelegateLink(tcx, role, delegationSettings) method configures a new delegate",
          "txnCreateDelegateLink() will use a 'default' delegate strategy",
          "If there is no delegate configured (or defaulted) for the needed role, txnCreateDelegateLink throws a DelegateConfigNeeded error.",
          "If the strategy-configuration doesn't match available variants, the DelegateConfigNeeded error offers suggested strategy-names",
          "If the strategy-configuration has any configuration problems, the DelegateConfigNeeded error contains an 'errors' object",
          "txnCreateDelegateSettings(tcx, role, delegationSettings) returns the delegate link plus a concreted delegate instance"
        ]
      },
      "given a configured delegate-link, it can create a ready-to-use Stellar subclass with all the right settings": {
        purpose: "allows the known facts about a delegate to be resolved to working SC class",
        details: [
          "A delegate link created by txnCreateDelegateLink(), can be captured in different ways",
          "  ... e.g. as a Datum property in a contract, ",
          "  ... or in any off-chain way.",
          "A dApp then reconstitutes this key information to a StellarContract, ",
          "  ... enabling simple multi-contract collaboration"
        ],
        mech: [
          "mustGetDelegate(configuredDelegate) method retrieves a configured delegate"
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
          "TODO: variants can augment the delegateRoles object without removing or replacing any existing variant"
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
      },
      "can locate UUTs in the user's wallet": {
        purpose: "for finding UUTs representing user's authority",
        details: [
          "A Capo contract can locate UUTs in the user's wallet",
          "  ... using the findActorUut() method",
          "This is useful for finding authority tokens, ",
          "  ... such as a charter-governance token, ",
          "  ... or a token representing a user's authority in a smart contract"
        ],
        mech: [
          "findActorUut() returns a FoundUut object, "
        ]
      }
    });
  }
}
__decorateClass$4([
  Activity.redeemer
], Capo.prototype, "activityUsingAuthority", 1);
__decorateClass$4([
  partialTxn
], Capo.prototype, "txnMustUseCharterUtxo", 1);
__decorateClass$4([
  partialTxn
], Capo.prototype, "txnUpdateCharterUtxo", 1);
__decorateClass$4([
  partialTxn
], Capo.prototype, "txnKeepCharterToken", 1);
__decorateClass$4([
  partialTxn
], Capo.prototype, "txnAddGovAuthorityTokenRef", 1);

const code$5 = new String("spending BasicMintDelegate\n\nconst rev : Int = 1\nconst instance : ByteArray = #67656e6572616c\nconst devGen : Int = 0\nconst isDev: Bool = false\n\nimport {\n    DelegationDetail,\n    acAuthorityToken,\n    tvAuthorityToken,\n    unmodifiedDelegation,\n    mustReturnValueToScript\n} from CapoDelegateHelpers\n\nimport {\n    Datum as CapoDatum\n} from specializedCapo\n\nimport {\n    capoSettings\n} from CustomCapoSettings\n\nimport {\n    getTxCharterDatum\n    // getRefCharterDatum,\n    // mustFindInputRedeemer\n} from CapoHelpers\n\nimport {\n    mkUutTnFactory,\n    validateUutMinting,\n    mintsUutForCharterUsingRedeemerIndex\n} from CapoMintHelpers\n\nimport {\n    returnsValueToScript,\n    mkTv,\n    outputAndDatum,\n    tvCharter\n} from StellarHeliosHelpers\n\nimport {\n    MintDelegateActivity,\n    MintDelegateDatum\n} from specializedMintDelegate\n\n\n// import { \n//     preventCharterChange\n// } from MultiSigAuthority\n// func main(datum: Datum,_,ctx: ScriptContext) -> Bool {\n//     preventCharterChange(ctx, datum) \n// }\n\n\n\nfunc main(mdd: MintDelegateDatum, activity: MintDelegateActivity, ctx: ScriptContext) -> Bool {\n    print(\"hi from mint delegate\");\n    if (isDev) {\n        print(\"is dev @gen \" + devGen.show() )\n    };\n\n    // input = ctx.get_current_input();\n    mdd.switch{\n        //! performs essential checks of policy for spending the minting delegate's authority token \"mintDgt-*\"\n        //! It also calls any additionalDelegateValidation() defined in a specialized minting delegate.\n        isD : IsDelegation{dd, _} => {\n            // MintDelegateDatum::IsDelegation{dd, cfg} = isD;\n            activity.switch {\n                // authorizing minting of a new token or burning an existing token:\n                //   guards that the authority token is returned to this script.\n                // specialized minting delegates should likely perform additional checks.\n\n                DelegateActivity{innerActvity} => innerActvity.switch {\n                    // reassigning the authority token to a new minting delegate\n                    ReplacingMe{seedTxId, seedIdx, purpose} => {\n                        // should burn the old UUT, mint the new UUT, and update the Charter\n                        // with the new mint authority\n\n                        //xxx -   ctx.tx.minted.get_safe( acAuthorityToken(dd) ) == 0 &&\n                        //xxx -   !returnsValueToScript( tvAuthorityToken(dd), ctx)\n\n                        updatingCharter: Int = 1;\n                        BURNED: Int = -1;\n                        otherMintedValue: Value = Value::new(\n                            AssetClass::new(dd.mph, dd.tn), \n                            BURNED\n                        );\n\n                        print(\"checking ReplacingMe on \"+purpose+\": \"+dd.tn.decode_utf8());\n                        mintsUutForCharterUsingRedeemerIndex(\n                            ctx: ctx, \n                            mph: dd.mph,\n                            purpose: purpose,\n                            seedTxId: seedTxId,\n                            seedIdx: seedIdx,\n                            charterRedeemerIndex: updatingCharter,\n                            otherMintedValue: otherMintedValue,\n                            needsMintDelegateApproval: false,\n                            extraMintDelegateRedeemerCheck: false\n                        )\n                    },\n\n                    // the token is being burned, retiring the authority token for this minting delegate\n                    // as a result, this minting delegate will no longer be consulted.  This could be combined\n                    // with the creation of a new minting delegate with a new authority token, registered\n                    // with the Capo in place of this one (or Reassigning could be used for such a case).\n                    // If there is no replacement minting delegate, then the Capo will not be able to perform \n                    // any further minting activities.\n                    //\n                    // Retiring is not suitable for authorizing token-burning.\n                    Retiring => {\n                        ctx.tx.minted.get(acAuthorityToken(dd)) == -1\n                    },\n\n                    // adjusting any configuration details for this mint delegate:\n                    // guards that the authority token is returned to this script, \n                    // ... and calls additional validateCDConfig() defined in a specialized minting delegate.\n                    // specialized minting delegates can perform additional checks, but\n                    // ... if they only need to validate custom mint-delegate configuration, \n                    // ... they can simply implement a validateCDConfig() method.\n                    Modifying => {\n                        authorityValue : Value = tvAuthorityToken(dd);\n                        ok : Bool = mustReturnValueToScript(authorityValue, ctx);\n                        dlgt : TxOutput = ctx.get_cont_outputs().find(\n                            (o :TxOutput) -> Bool {\n                                o.value.contains(authorityValue)\n                            }\n                        );\n                                \n                        ddNew : MintDelegateDatum::IsDelegation = \n                        MintDelegateDatum::from_data( \n                            dlgt.datum.get_inline_data() \n                        );\n\n                        mdd.validateCDConfig(ddNew) && ok\n                    },\n                    ValidatingSettings => {\n                        //!!! todo: verify if any cost diff between this vs direct-field-access.\n                        // CapoDatum::CharterToken {\n                        //     /*spendDgt*/ _,  \n                        //     /* spendInvariants */ _,\n                        //     settingsUut,\n                        //     /* namedDelegates */ _,\n                        //     /* mintDgt */ _, \n                        //     /* mintInvariants */ _, \n                        //     /* govAuthority */ _\n                    // } = getTxCharterDatum(ctx, dd.mph);\n                    charter : CapoDatum::CharterToken = getTxCharterDatum(ctx, dd.mph);\n                    foundSettings : outputAndDatum[CapoDatum::SettingsData] = \n                        charter.mustFindSettingsOutput(ctx, dd.mph, dd.capoAddr);\n                    customSettings = capoSettings::from_data(foundSettings.rawData);\n\n                    print(\"MINT DELEGATE TRYING TO VALIDATE SETTINGS\");\n                    validated : Bool = customSettings.validate();\n                     print(\"HURRAY\");\n                    validated && \n                        // isValid : Bool = \n                        //     ((isTest && throwIfBadSettings(ctx, mdd, settings)) || true) &&\n                        //     mdd.validateSettings(settings, ctx);\n                        // isValid\n                        true\n                    }\n                },\n                _ => true\n            } && activity.additionalDelegateValidation(isD, ctx)\n        },\n        _ => {\n            invalidRedeemer = () -> {  error(\"wrong Actvy/dtm\") }; ///Activity custom datum must not use Activities reserved for IsDelegation datum.\") };\n            activity.switch{\n                DelegateActivity => invalidRedeemer(), \n                _ => activity.otherDatumValidation(mdd, ctx)\n            }\n        }\n    }\n}\n");

code$5.srcFile = "src/minting/BasicMintDelegate.hl";
code$5.purpose = "spending";
code$5.moduleName = "BasicMintDelegate";

const code$4 = new String("module specializedMintDelegate\n\n//! provides a basic version, not yet specialized,\n// of the \"specializedMintDelegate\" interface, which simply\n// exports a DelegateDatum enum and DelegateActivities (redeemer enum).  \n\n//! these specializations MAY include additional enum variants, and \n//  ... they MUST include the same enum variants found in this\n//  ... unspecialized version.   If you're specializing and you get a Helios \n//  ... compiler error, these are the first things you should check!\n\n// The MintDelegateActivity (redeemer) enum reserves the first 10\n// ... variants for use-cases inside the script, with the remaining\n// ... available for authorizing application-specific use-cases.\n\n// The mintingUuts activity is deprecated, and should be replaced with\n// ... application-specific activities that validate minting of UUTs.\n// It's recommended to retain the error-throwing behavior of the\n// ... genericUutMinting function, and expect that it will no longer \n// ... be called after Stellar Contracts v1.0\n\n// The MintDelegateDatum enum reserves the first variant for the\n// ... \"IsDelegation\" datum, which can contain any delegate-specific \n// ... configuration.  Its CustomConfig field is specified as a String \n// ... in the unspecialized version, but may be redefined to use different\n// ... type in your specialization.  The Modifying activity may be used for\n// ... applying updates to that datum, with validation of that activity\n// ... provided by your specialization.\n\n//! Your specialization MAY include any \n// ... additional functions, imports or methods\n\nimport {\n    DelegationDetail,\n    mustReturnValueToScript,\n    tvAuthorityToken,\n    DelegateActivity,\n    unmodifiedDelegation\n} from CapoDelegateHelpers\n\nimport {\n    validateUutMinting,\n    mkUutTnFactory\n} from CapoMintHelpers\n\nimport {\n    capoSettings\n} from CustomCapoSettings\n\nenum MintDelegateDatum {\n    IsDelegation {\n        dd: DelegationDetail\n        // provides structural space for (non-string) configuration data.\n        // the string case is degenerate (expect empty string always)\n        CustomConfig: String\n    }\n    ScriptReference\n\n    func validateSettings(self, ctx: ScriptContext, settings: capoSettings) -> Bool{\n        assert(false, \"not valid (stubbed)\");\n        settings.serialize() != self.serialize() &&\n        ctx.tx.serialize() != self.serialize() &&        \n        true\n    }\n\n    func validateCDConfig(self, updated: MintDelegateDatum::IsDelegation) -> Bool {\n        self.switch {\n            ddd: IsDelegation => {\n                (ddd.CustomConfig == \"\") &&\n                (updated == self)\n            },\n            _ => error(\"unreachable\")\n        }\n    }\n}\n\nenum MintDelegateActivity {\n    // Authorizing  - obsolete\n    DelegateActivity {\n        activity: DelegateActivity\n    }\n\n    // reserved activities for possible maintenance of utxos within the mint-delegate script.\n    //  - these could be application-specific, but not used for mint delegation use-cases.\n    _reserved1\n    _reserved2\n    _reserved3\n    _reserved4\n    _reserved5\n    _reserved6\n    _reserved7\n    _reserved8\n    //     _reserved9 // temporarily held by the mintingUuts activity \n    // NOTE: all activities at index > 9 are reserved for application-specific use-cases\n    //    of delegated control for mint/burn scenarios\n\n    // NOTE: prefer application-specific use-cases with particular minting validations,\n    // ... rather than generic mintingUuts\n    mintingUuts {  // index 9\n        seedTxn: TxId\n        seedIndex: Int\n        purposes: []String\n    }\n\n    //prefer application-specific use-cases with particular minting validations,\n    // ... rather than generic mintingUuts\n    //xxx //??? have the charter know about the UUT purposes, \n    //xxx // ... so we can limit the mint/burns to match the known list??\n    //xxx burningUuts {\n    // xxx    tns: []String\n    //xxx }\n\n    func usesGenericUutMinting(self) -> Bool {\n        // use this error to completely disable the uutMinting activity in\n        // favor of app-specific activities with more directed validations:\n        //   error(\"no generic UUT minting in this delegate\");\n\n        self == self\n        && true\n    }\n\n    // this function gives a general-purpose implementation of checking for \n    // valid uut mints. A specialization might modify it use different policies\n    // or enforce additional requirements\n    func genericUutMinting(self, \n        mdd: MintDelegateDatum,\n        ctx: ScriptContext\n    ) -> Bool {\n        MintDelegateActivity::mintingUuts{sTxId, sIdx, purposes} = self;\n        MintDelegateDatum::IsDelegation{dd, _} = mdd;\n        returnsAuthzToken : Bool = mustReturnValueToScript(tvAuthorityToken(dd), ctx);\n\n        assert(self.usesGenericUutMinting(), \"no genericUutMinting\");\n        o : []TxOutput = ctx.get_cont_outputs();\n        if (o.length != 1) { error(\"single utxo only\") };\n\n        print (\"in unsp_MD\");\n        isOk : Bool = returnsAuthzToken && \n        // A project that wants to evolve the Datum's isDelegation.CustomConfig \n        // should enforce that requirement instead of this \"not modified\" check.\n        unmodifiedDelegation( /* isD, same as mdd */ mdd.serialize(), ctx) &&\n\n        // This call can serve as a template for enforcing expected mints \n        // of uuts (and additional token values) in validation of application-\n        // specific activities, given (mph, sTxId, sIdx, purposes)\n        validateUutMinting(\n            ctx: ctx, \n            mph: dd.mph,\n            seedTxId: sTxId, \n            seedIdx: sIdx, \n            purposes: purposes,\n            // additionalValues: ()\n            mkTokenName: mkUutTnFactory(sTxId, sIdx)\n        );\n\n        isOk\n    }\n\n    //! used only for validating IsDelegation datum, that is,\n    //   ... to approve minting requests or any customize spending modes \n    //   ... of that datum.  In the unspecialized version, \n    //   ... the \"Modifying\" activity is a stand-in for that use-case, that always rejects.\n    //! To customize further, additional custom IsDelegation config can be\n    //   ... enforced in the \"Modifying\" event - see the second field of IsDelegation (see the \"CustomConfig\" stand-in)\n    //   ... the BasicMintDelegate allows for that field's presence, without any assumptions\n    //   ... about its type.\n    //  Note that the basic mint delegate already enforces some basic\n    //    administrative expectations for Reassigning, Retiring, Modifying activites, \n    //    so a specialization doesn't need to re-implement those checks.\n    func additionalDelegateValidation( self,\n        priorMddd: MintDelegateDatum::IsDelegation, \n        ctx: ScriptContext\n    ) -> Bool {\n        // print(\"  ----- checking additional delegate validation\");\n        self.switch {\n            // todo: delete this obsolete activity.\n            mintingUuts => self.genericUutMinting(priorMddd, ctx),\n            // generic DelegateActivity is already validated, but \n            //  ... you can add more constraints here if needed\n            DelegateActivity => true,\n\n            _ => false\n        } || ctx.tx.serialize() != priorMddd.serialize()\n    }\n\n    //! used only for validating non-IsDelegation datum types and activities.\n    //   if you have any admininstrative data structures that inform \n    //   your minting policy, this might be useful.  Otherise, look to Activity validations\n    //   above, in which the isDelegation token is being spent with an application-specific\n    //   activity/redeemer\n    func otherDatumValidation( self,\n        priorMdd: MintDelegateDatum, \n        ctx: ScriptContext\n    ) -> Bool {\n        neverTriggered = () -> {  error(\"never called\") };\n        self.switch{\n            // Note: this set of DelegateActivities is reserved for the IsDelegation datum.\n            //  Using it on any other Datum type will always fail and execution will never arrive here.\n            DelegateActivity => neverTriggered(),\n            \n            // ------------------- application-specific activities can be added here\n\n            _ => false  // prevents non-exhaustive match errors, even if you remove the above neverTriggered() calls\n        } && (priorMdd.serialize() != ctx.serialize())\n    }\n}\n\nstruct types {\n    redeemers: MintDelegateActivity\n    datum : MintDelegateDatum\n}\n");

code$4.srcFile = "src/minting/UnspecializedMintDelegate.hl";
code$4.purpose = "module";
code$4.moduleName = "specializedMintDelegate";

const UnspecializedMintDelegate = code$4;

const code$3 = new String("module specializedCapo\n\n// SPECIALIZING Capo is now DEPRECATED.\n// \n\nimport { \n    RelativeDelegateLink\n} from CapoDelegateHelpers\n\nimport {\n    capoSettings\n} from CustomCapoSettings\n\nimport {\n    outputAndDatum,\n    mkTv,\n    tvCharter\n} from StellarHeliosHelpers\n\n// field-names style of struct, arbitrary & extensible\n// field list, can be interpreted by any script that defines a \n// field-names style of struct with its own fields & data types.\nstruct AnyData {\n    id: String \"@id\"  // same as the UUT name for this data\n    // can have other fields; receiver will interpret their target types.\n}\n\n//! provides a basic version of Datum in default specializedCapo module\nenum Datum {\n    CharterToken {\n        spendDelegateLink: RelativeDelegateLink\n        spendInvariants: []RelativeDelegateLink\n        settingsUut: ByteArray // UUT-name links to SettingsData\n        namedDelegates: Map[String]RelativeDelegateLink\n        mintDelegateLink: RelativeDelegateLink\n        mintInvariants: []RelativeDelegateLink\n        govAuthorityLink: RelativeDelegateLink\n    }\n    ScriptReference\n    SettingsData {\n        data:  Map[String]Data\n    }\n    DelegatedData {\n        data: AnyData\n        delegateLink: RelativeDelegateLink\n    }\n\n    //! datum-validation only supports checks of absolute spendability, \n    //  ... and can't check details of the Activity (\"redeemer\") being used.\n    func validateSpend(self, ctx: ScriptContext, mph: MintingPolicyHash) -> Bool {\n        //! Note: an overridden Datum's impl of validateSpend() \n        // ... is never called with the CharterToken variant\n        assert(false, \"can't happen\");\n        self.switch{\n            CharterToken => true,\n            _ => error(\"can't happen\")\n        } || (\n            ctx.tx.serialize() /* never */ == self.serialize() ||\n            mph.serialize() /* never */ == self.serialize()\n        )\n    }\n\n    // this needs to be a method on the Datum enum,\n    // ... because it's called by other methods here, AND\n    // ... it depends on the Datum's own enum variants.\n    func hasCharterRefInput(\n        self,\n        ctx: ScriptContext, \n        mph : MintingPolicyHash\n    ) -> Option[Datum::CharterToken] {\n        assert( // avoid \"unused variable self\" error\n            self.serialize() != ctx.serialize() &&\n            self.serialize() != mph.serialize(), \"never thrown\"\n        );\n        \n        chVal : Value = tvCharter(mph);\n        hasCharter = (txin : TxInput) -> Bool { txin.value.contains(chVal) };\n\n        ctx.tx.ref_inputs.find_safe(hasCharter).switch{\n            Some{txin} => Option[Datum::CharterToken]::Some{\n                Datum::from_data( \n                    txin.datum.get_inline_data() \n                ).switch{\n                    c : CharterToken => c,\n                    _ => error(\"wrong enum\")\n                }\n            },\n            None => Option[Datum::CharterToken]::None\n        }\n    }\n\n    func mustFindSettingsOutput(self, ctx: ScriptContext, mph: MintingPolicyHash, inAddr: Address) -> outputAndDatum[Datum::SettingsData] {\n        settingsVal : Value = mkTv(mph: mph, tnBytes: self.switch {\n            ct: CharterToken => ct.settingsUut,\n            _ => error(\"mustFindSettings - only valid on CharterToken datum\")\n        });\n        print( \"finding settings output\" );\n        tx : Tx = ctx.tx;\n        notFound = Option[outputAndDatum[Datum::SettingsData]]::None;\n        foundSettings: []outputAndDatum[Datum::SettingsData] = \n            tx.outputs.map_option[\n                outputAndDatum[Datum::SettingsData]\n            ](\n                 (output: TxOutput) -> Option[outputAndDatum[Datum::SettingsData]] {\n                    print(\"defaultMinter finding settings output\");\n                    if ( output.address != inAddr ) {\n                        // print(\"not the right address\");\n                        notFound\n                    } else {\n                        rawDatum : Data = output.datum.get_inline_data();\n                        Datum::from_data(\n                            rawDatum\n                        ).switch {\n                            settings: SettingsData => {\n                                print(\"found Datum::SettingsData\");\n                                Option[\n                                    outputAndDatum[Datum::SettingsData]\n                                ]::Some{\n                                    outputAndDatum[Datum::SettingsData] {\n                                        output, settings, rawDatum\n                                        // .switch { \n                                        //     (index:Int, fields: []Data) => {\n                                        //         // work around issue where index can't be made unused with _\n                                        //         assert(index == index, \"no way\");\n                                        //         fields.head\n                                        //     },\n                                        //     _ => error(\"no way\")\n                                        // }\n                                    }\n                                }\n                            },\n                            _ => {\n                                // print(\"found non-SettingsData\");\n                                notFound\n                            }\n                        }\n                    }\n                }\n            );\n\n        // if (isDev) { \n        assert(foundSettings.length < 2, \"too many settings outputs\") ;\n        assert(foundSettings.length == 1, \"no settings output\");\n\n        settingsOutput : TxOutput = foundSettings.head.output;\n        assert(\n            // already checked above.\n            // settingsOutput.address == charter.owner &&\n            settingsOutput.value.contains(settingsVal),\n                \"settings output not found in contract with expected UUT\"\n        );\n        assert(settingsVal.contains(settingsOutput.value.get_assets()), \n            \"excess value in settings output: \"+(settingsOutput.value - settingsVal).show()\n        );\n        foundSettings.head\n        // ^^ fails if there's no settings output to the right address\n\n        // the settings output should be empty?\n        // assert(foundSettings.head.datum.data.length == 0,\n        //     \"temp: settings must be empty during charter\"\n        // );\n\n        // assert(settingsOutput.serialize() == settingsOutput.serialize(), \"no way\");\n\n    }\n\n}\n\n//! provides a basic version of Activity (\"redeemer\" type) in default specializedCapo module\nenum Activity {\n    usingAuthority // variant 0\n    updatingCharter // variant 1\n    retiringRefScript // variant 2\n    addingSpendInvariant // variant 3\n    spendingDelegatedDatum // variant 4\n    updatingSettings // variant 5\n    retiringSettings // variant 6\n\n    func allowActivity(self, datum: Datum, ctx: ScriptContext, mph: MintingPolicyHash) -> Bool {\n        self.switch{\n            //! Note: an overridden Reedeemer def doesn't have to replicate the checks\n            // ... for the baseline enum variants; it's not called in those cases.\n            updatingCharter => true,\n            usingAuthority => true,\n            _ => error(\"unreachable code\")\n            // not executed, but prevents the args from showing up as unused:\n        } || (\n            ctx.tx.serialize() /* never */ == datum.serialize() ||\n            mph.serialize() /* never */ == datum.serialize()\n        )\n    }    \n}\n\nstruct types {\n    redeemers: Activity\n    datum : Datum\n}\n");

code$3.srcFile = "src/UnspecializedCapo.hl";
code$3.purpose = "module";
code$3.moduleName = "specializedCapo";

const UnspecializedCapo = code$3;

const code$2 = new String("module CapoHelpers\n\nimport {\n    mkTv,\n    tvCharter\n} from StellarHeliosHelpers\n\nimport { Datum, Activity } from specializedCapo\n\n\nfunc getRefCharterUtxo(ctx: ScriptContext, mph : MintingPolicyHash) -> TxInput {\n    chVal : Value = tvCharter(mph);\n    hasCharter = (txin : TxInput) -> Bool { txin.value.contains(chVal) };\n    print(\"getting ref_input for charter\");\n    charterUtxo : TxInput = ctx.tx.ref_inputs.find_safe(hasCharter).switch{\n        Some{ch} => ch,\n        None => error(\"Missing charter in required ref_inputs\")\n    };\n\n    charterUtxo\n}\n\nfunc getRefCharterDatum(ctx: ScriptContext, mph : MintingPolicyHash) -> Datum::CharterToken {\n    charterUtxo : TxInput = getRefCharterUtxo(ctx, mph);\n    ctd : Datum::CharterToken = Datum::from_data( \n        charterUtxo.datum.get_inline_data() \n    );\n\n    ctd\n}\n\n//! retrieves a required Charter Datum for the indicated policy - \n// ... either from the txn's reference inputs  or inputs.\nfunc getTxCharterDatum(\n    ctx: ScriptContext, \n    mph : MintingPolicyHash,\n    refInputs : []TxInput = ctx.tx.ref_inputs\n) -> Datum::CharterToken {\n    chVal : Value = tvCharter(mph);\n    hasCharter = (txin : TxInput) -> Bool { txin.value.contains(chVal) };\n\n    charterUtxo : TxInput = refInputs.find_safe(hasCharter).switch{\n        Some{ch} => ch,\n        None => ctx.tx.inputs.find_safe(hasCharter).switch{\n            Some{ch} => ch,\n            None => error(\"Missing charter inputs / ref_inputs\")\n        }\n    };\n    ctd : Datum::CharterToken = Datum::CharterToken::from_data( \n        charterUtxo.datum.get_inline_data() \n    );\n\n    ctd    \n}\n\nfunc mustHaveGovAuthority(\n    ctx: ScriptContext, \n    mph : MintingPolicyHash,\n    charterDatum : Datum::CharterToken = getTxCharterDatum(ctx, mph)\n) -> Bool {\n    charterDatum.govAuthorityLink.hasValidOutput(mph, ctx)\n}\n\n");

code$2.srcFile = "src/CapoHelpers.hl";
code$2.purpose = "module";
code$2.moduleName = "CapoHelpers";

const CapoHelpers = code$2;

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
//!!! TODO: include adapter(s) for Datum, which has the same essential shape
class BasicMintDelegate extends StellarDelegate {
  static currentRev = 1n;
  static get defaultParams() {
    const params = {
      rev: this.currentRev,
      devGen: 0n
    };
    return params;
  }
  getContractScriptParams(config) {
    const params = {
      rev: config.rev,
      isDev: false,
      devGen: 0n
    };
    if ("development" === process.env.NODE_ENV) {
      params.isDev = true;
      if (!config.devGen) {
        throw new Error(
          `Missing expected devGen in config for BasicMintDelegate`
        );
      }
      params.devGen = config.devGen;
    }
    return params;
  }
  contractSource() {
    return code$5;
  }
  mkDatumScriptReference() {
    const { ScriptReference: hlScriptReference } = this.onChainDatumType;
    const t = new hlScriptReference();
    return Datum.inline(t._toUplcData());
  }
  /**
   * specializedMintDelegate module for customizing policies atop the basic mint delegate
   * @public
   * @remarks
   *
   * The basic mint delegate contains an "unspecialized" implementation of this customization,
   * which doesn't have any special restrictions.  It reserves a CustomConfig field
   * at position 2 in the IsDelegation datum, allowing customizations to use any
   * struct in that position to express any custom configurations.
   **/
  get specializedMintDelegate() {
    return UnspecializedMintDelegate;
  }
  get specializedCapo() {
    return UnspecializedCapo;
  }
  activityAuthorizing() {
    throw new Error(
      `obsolete generic Authorizing activity invalid for mint delegates`
    );
  }
  activityRetiringDelegate() {
    const Retiring = this.mustGetActivity("Retiring");
    return { redeemer: new Retiring()._toUplcData() };
  }
  async txnGrantAuthority(tcx, redeemer, returnExistingDelegate = true) {
    if (!redeemer)
      throw new Error(
        `mint delegate requires an explicit redeemer for txnGrantAuthority()`
      );
    const { capo } = this.configIn;
    await capo.txnAttachScriptOrRefScript(tcx, this.compiledScript);
    return super.txnGrantAuthority(tcx, redeemer, returnExistingDelegate);
  }
  activityMintingUuts({
    seedTxn,
    seedIndex: sIdx,
    purposes
  }) {
    const seedIndex = BigInt(sIdx);
    console.log(
      "----------- USING DEPRECATED mintingUuts ACTIVITY -----------\n       (prefer application-specific mint-delegate activities instead)"
    );
    console.log("UUT redeemer seedTxn", seedTxn.hex);
    const mintingUuts = this.mustGetActivity("mintingUuts");
    const t = new mintingUuts(seedTxn, seedIndex, purposes);
    return { redeemer: t._toUplcData() };
  }
  // NOTE: prefer application-specific activities
  // @Activity.redeemer
  // activityBurningUuts(...uutNames: string[]) : isActivity {
  //     const {burningUuts} =this.onChainActivitiesType;
  //     const { DelegateDetails: hlDelegateDetails } = this.onChainTypes;
  //     const t = new burningUuts(uutNames);
  //     return { redeemer: t._toUplcData() };
  // }
  importModules() {
    const specializedMintDelegate = this.specializedMintDelegate;
    if (specializedMintDelegate.moduleName !== "specializedMintDelegate") {
      throw new Error(
        `${this.constructor.name}: specializedMintDelegate() module name must be 'specializedMintDelegate', not '${specializedMintDelegate.moduleName}'
  ... in ${specializedMintDelegate.srcFile}`
      );
    }
    const { capo } = this.configIn || this.partialConfig;
    if (!capo)
      throw new Error(`missing capo in config or partial-config for ${this.constructor.name}`);
    return [
      // StellarHeliosHelpers,
      // CapoDelegateHelpers,
      // CapoHelpers,
      // CapoMintHelpers,
      specializedMintDelegate,
      ...capo.importModules()
      // this.specializedCapo,
    ];
  }
  get scriptDatumName() {
    return "MintDelegateDatum";
  }
  get scriptActivitiesName() {
    return "MintDelegateActivity";
  }
  /**
   * Adds a mint-delegate-specific authority token to the txn output
   * @remarks
   *
   * Implements {@link StellarDelegate.txnReceiveAuthorityToken | txnReceiveAuthorityToken() }.
   *
   * Uses {@link BasicMintDelegate.mkDelegationDatum | mkDelegationDatum()} to make the inline Datum for the output.
   * @see {@link StellarDelegate.txnReceiveAuthorityToken | baseline txnReceiveAuthorityToken()'s doc }
   * @public
   **/
  async txnReceiveAuthorityToken(tcx, tokenValue, fromFoundUtxo) {
    console.log(
      `     ----- minting delegate validator receiving mintDgt token at ` + this.validatorHash.hex
    );
    const datum2 = this.mkDelegationDatum(fromFoundUtxo);
    return tcx.addOutput(new TxOutput(this.address, tokenValue, datum2));
  }
  /**
   * Depreciated: Add a generic minting-UUTs actvity to the transaction
   * @remarks
   *
   * This is a generic helper function that can be used to mint any UUTs,
   * but **only if the specialized minting delegate has not disabled generic UUT minting**.
   *
   * Generally, it's recommended to use an application-specific activity
   * that validates a particular minting use-case, instead of this generic one.
   *
   * See {@link Capo.txnMintingUuts | Capo.txnMintingUuts() } for further guidance.
   *
   * @param tcx - the transaction context
   * @param uutPurposes - a list of string prefixes for the UUTs
   * @typeParam TCX - for the `tcx`, which must already include the indicated `uutPurposes`
   * @public
   **/
  txnGenericMintingUuts(tcx, uutPurposes, activity) {
    let useActivity = activity || this.activityMintingUuts({
      purposes: uutPurposes,
      ...tcx.getSeedAttrs()
    });
    return this.txnGrantAuthority(tcx, useActivity);
  }
  mkDelegationDatum(txin) {
    if (txin)
      return txin.origOutput.datum;
    const { capoAddr, mph, tn, ..._otherCfgSettings } = this.configIn;
    return this.mkDatumIsDelegation({
      capoAddr,
      mph,
      tn
    });
  }
  async txnCreatingTokenPolicy(tcx, tokenName) {
    return tcx;
  }
  static mkDelegateWithArgs(a) {
  }
}
__decorateClass$3([
  datum
], BasicMintDelegate.prototype, "mkDatumScriptReference", 1);
__decorateClass$3([
  Activity.redeemer
], BasicMintDelegate.prototype, "activityAuthorizing", 1);
__decorateClass$3([
  Activity.redeemer
], BasicMintDelegate.prototype, "activityRetiringDelegate", 1);
__decorateClass$3([
  Activity.redeemer
], BasicMintDelegate.prototype, "activityMintingUuts", 1);
__decorateClass$3([
  Activity.partialTxn
], BasicMintDelegate.prototype, "txnCreatingTokenPolicy", 1);

class AuthorityPolicy extends StellarDelegate {
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
class AnyAddressAuthorityPolicy extends AuthorityPolicy {
  loadProgramScript(params) {
    return void 0;
  }
  get delegateValidatorHash() {
    return void 0;
  }
  activityAuthorizing() {
    return { redeemer: void 0 };
  }
  activityUsingAuthority() {
    throw new Error(`usingAuthority is only used in capo contracts.  use activityAuthorizing() for delegates`);
  }
  /**
   * Finds the delegate authority token, normally in the delegate's contract address
   * @public
   * @remarks
   *
   * The default implementation finds the UTxO having the authority token
   * in the delegate's contract address.
   *
   * It's possible to have a delegate that doesn't have an on-chain contract script.
   * ... in this case, the delegate should use this.{@link StellarDelegate.tvAuthorityToken | tvAuthorityToken()} and a
   * delegate-specific heuristic to locate the needed token.  It might consult the
   * addrHint in its `configIn` or another technique for resolution.
   *
   * @param tcx - the transaction context
   * @reqt It MUST resolve and return the UTxO (a TxInput type ready for spending)
   *  ... or throw an informative error
   **/
  async findAuthorityToken() {
    const { wallet } = this;
    return this.hasUtxo(
      `authority token: ${bytesToText(this.configIn.tn)}`,
      this.mkTokenPredicate(this.tvAuthorityToken()),
      { wallet }
    );
  }
  async findActorAuthorityToken() {
    return this.findAuthorityToken();
  }
  //! impls MUST resolve the indicated token to a specific UTxO
  //  ... or throw an informative error
  async DelegateMustFindAuthorityToken(tcx, label) {
    const v = this.tvAuthorityToken();
    const { addrHint } = this.configIn;
    return this.mustFindActorUtxo(
      `${label}: ${bytesToText(this.configIn.tn)}`,
      this.mkTokenPredicate(v),
      tcx,
      "are you connected to the right wallet address? " + (addrHint?.length ? "  maybe at:\n    " + addrHint.join("\n or ") : "")
    );
  }
  async txnReceiveAuthorityToken(tcx, tokenValue, fromFoundUtxo) {
    let dest;
    console.log("\u{1F41E}\u{1F41E}  receive authority token");
    if (fromFoundUtxo) {
      dest = fromFoundUtxo.address;
      console.log("    \u{1F41E}\u{1F41E}  " + dumpAny(fromFoundUtxo.address, this.networkParams));
    } else {
      if (!this.configIn?.addrHint?.[0])
        throw new Error(`missing addrHint`);
      const {
        addrHint
        // reqdAddress,  // removed
      } = this.configIn;
      dest = addrHint[0];
    }
    const output = new TxOutput(dest, tokenValue);
    output.correctLovelace(this.networkParams);
    tcx.addOutput(output);
    console.log("    \u{1F41E}\u{1F41E}  ...with output" + dumpAny(output, this.networkParams));
    return tcx;
  }
  //! Adds the indicated token to the txn as an input with apporpriate activity/redeemer
  //! EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
  async DelegateAddsAuthorityToken(tcx, fromFoundUtxo, redeemer) {
    //! no need to specify a redeemer, but we pass it through 
    return tcx.addInput(fromFoundUtxo, redeemer);
  }
  //! Adds the indicated utxo to the transaction with appropriate activity/redeemer
  //  ... allowing the token to be burned by the minting policy.
  //! EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
  async DelegateRetiresAuthorityToken(tcx, fromFoundUtxo) {
    //! no need to specify a redeemer
    return tcx.addInput(fromFoundUtxo);
  }
}
__decorateClass$2([
  Activity.redeemer
], AnyAddressAuthorityPolicy.prototype, "activityAuthorizing", 1);
__decorateClass$2([
  Activity.redeemer
], AnyAddressAuthorityPolicy.prototype, "activityUsingAuthority", 1);

const code$1 = new String("spending Capo\n\n// needed in helios 0.13: defaults\nconst mph : MintingPolicyHash = MintingPolicyHash::new(#1234)\nconst rev : Int = 1\nconst devGen : Int = 0\nconst isDev: Bool = false\n\n// import {\n//     tvCharter\n// } from CapoHelpers\n\nimport { \n    MustUseDelegateActivity,\n    requiresNoDelegateInput,\n    requiresValidDelegateOutput,\n    RelativeDelegateLink\n} from CapoDelegateHelpers\n\nimport {\n    mustFindInputRedeemer,\n    tvCharter,\n    mkTv,\n    didSign,\n    didSignInCtx\n} from StellarHeliosHelpers\n\nimport {\n    getTxCharterDatum,\n    mustHaveGovAuthority\n} from CapoHelpers\n\nimport { \n    Datum, \n    Activity\n } from specializedCapo\n\n/**\n * \n */\nfunc requiresAuthorization(ctx: ScriptContext, ctd: Datum::CharterToken) -> Bool {\n    govDelegate : RelativeDelegateLink = ctd.govAuthorityLink;\n\n    govDelegate.hasValidOutput(mph, ctx)\n}\n\nfunc getCharterOutput(tx: Tx) -> TxOutput {\n    charterTokenValue : Value = Value::new(\n        AssetClass::new(mph, \"charter\".encode_utf8()), \n        1\n    );\n    tx.outputs.find_safe(\n        (txo : TxOutput) -> Bool {\n            txo.value >= charterTokenValue\n        }\n    ).switch{\n        None => error(\"this could only happen if the charter token is burned.\"),\n        Some{o} => o\n    }\n}\n\nfunc notUpdatingCharter(activity: Activity) -> Bool { activity.switch {\n    updatingCharter => false,  \n    _ => true\n}}\n\nfunc preventCharterChange(ctx: ScriptContext, datum: Datum::CharterToken) -> Bool {\n    tx: Tx = ctx.tx;\n\n    charterOutput : TxOutput = getCharterOutput(tx);\n\n    cvh : ValidatorHash = ctx.get_current_validator_hash();\n    myself : Credential = Credential::new_validator(cvh);\n    if (charterOutput.address.credential != myself) {\n        error(\"charter token must be returned to the contract \")\n        // actual : String = charterOutput.address.credential.switch{\n        //     PubKey{pkh} => \"pkh:🔑#\" + pkh.show(),\n        //     Validator{vh} => \"val:📜#:\" + vh.show()\n        // };\n        // error(\n        //     \"charter token must be returned to the contract \" + cvh.show() +\n        //     \"... but was sent to \" +actual\n        // )\n    };\n\n    newDatum : Datum = Datum::from_data( \n        charterOutput.datum.get_inline_data() \n    );\n    if (datum.serialize() != newDatum.serialize()) {\n        error(\"invalid update to charter settings\") \n    };\n\n    true\n}\n\nfunc checkpoint(s: String) -> Bool {\n    print(\"checkpoint: \" + s);\n    true\n}\n\nfunc main(datum: Datum, activity: Activity, ctx: ScriptContext) -> Bool {\n    tx: Tx = ctx.tx;\n    // now: Time = tx.time_range.start;\n    print(\"hi from capo\");\n\n    if (isDev) {\n        print(\"is dev @gen \" + devGen.show() )\n    };\n    \n    allDatumSpecificChecks: Bool = datum.switch {\n        ctd : CharterToken => {\n            // throws if bad\n            if (notUpdatingCharter(activity)) { \n                preventCharterChange(ctx, ctd)\n            } else {\n                true // \"maybe\", really -> depends on the activity\n            }\n        },\n        SettingsData => {\n            true // maybe -> activity updatingSettings will check\n        },\n\n        scriptRef : ScriptReference => {\n            // only here to ensure specializations are properly arranged\n            assert(true || (scriptRef == scriptRef), \"never\");\n            true\n        },\n\n        _ => { // delegates to specialization's Datum::validateSpend() method.\n            datum.validateSpend(ctx, mph)\n        }\n    };\n\n    // the normal case for validation is to use Datum-specific checks.  \n    // however, this section allows activity-specific checks to be included, so extensions aren't painted into a corner.\n    allActivitySpecificChecks : Bool = activity.switch {\n        updatingCharter => {\n            // print(\"hi from updatingCharter\");\n\n            charterOutput : TxOutput = getCharterOutput(tx);\n            newCtDatum = Datum::CharterToken::from_data( \n                charterOutput.datum.get_inline_data() \n            );\n            oldCtDatum : Datum::CharterToken = datum.switch {\n                octd: CharterToken => octd,\n                _ => error(\"wrong use of updatingCharter action for non-CharterToken datum\")\n            };\n            Datum::CharterToken{                \n                spendDelegate, \n                spendInvariants,\n                settingsUut,\n                namedDelegates,\n                mintDelegate, \n                mintInvariants,\n                govDelegate\n            } = newCtDatum;\n\n            Datum::CharterToken{\n                oldSpendDelegate, \n                oldSpendInvariants, \n                oldSettingsUut,\n                oldNamedDelegates,\n                oldMintDelegate, \n                oldMintInvariants,\n                /* _oldGovDelegate */ _ \n            } = oldCtDatum;\n\n            mustNotModifyMintInvariants : Bool =  ( mintInvariants == oldMintInvariants );\n            mustNotModifySpendInvariants : Bool = ( spendInvariants == oldSpendInvariants );\n\n            unchangedSpendDgt : Bool = ( spendDelegate.serialize() == oldSpendDelegate.serialize() );\n            unchangedMintDgt : Bool = ( mintDelegate.serialize() == oldMintDelegate.serialize() );\n            changedAnyNamedDelegate : Bool = ( namedDelegates.serialize() != oldNamedDelegates.serialize() );\n            mustNotModifySettings : Bool = ( settingsUut == oldSettingsUut );\n\n            if (isDev) {\n                print(\"is spendDgt unchanged? \" + unchangedSpendDgt.show() +\n                    \"\\n  - old: \"+ oldSpendDelegate.uutName + \" = \" + oldSpendDelegate.strategyName +\n                    \" => \"+  oldSpendDelegate.delegateValidatorHash.switch{Some{v} => v.show(), None => \" (any addr)\"} +\n                \"\\n  - new: \"+ spendDelegate.uutName + \" = \" + spendDelegate.strategyName +\n                    \" => \"+ spendDelegate.delegateValidatorHash.switch{Some{v} => v.show(), None => \" (any addr)\"} \n                );\n                print(\"is mintDgt unchanged?  \" + unchangedMintDgt.show() + \n                    \"\\n  - old: \"+ oldMintDelegate.uutName + \" = \" + oldMintDelegate.strategyName +\n                    \" => \"+  oldMintDelegate.delegateValidatorHash.switch{Some{v} => v.show(), None => \" (any addr)\"} +\n                    \"\\n  - new: \"+ mintDelegate.uutName + \" = \" + mintDelegate.strategyName +\n                    \" => \"+ mintDelegate.delegateValidatorHash.switch{Some{v} => v.show(), None => \" (any addr)\"}\n                );\n                print(\"is config unchanged? \" + mustNotModifySettings.show() +\n                    \"\\n  - old: \"+ oldSettingsUut.decode_utf8() +\n                    \"\\n  - new: \"+ settingsUut.decode_utf8()\n                )\n            };\n            assert(mustNotModifySettings, \"cannot change settings uut\");\n\n            // govDelegate is always spent, so we always check its destination is kosher.\n            mustNotModifySettings &&\n            govDelegate.hasValidOutput(mph, ctx) &&\n            checkpoint(\"1\") &&\n            if (unchangedMintDgt) {\n                // unchanged mintDgt must not be included in the tx\n                checkpoint(\"2b\") &&\n                requiresNoDelegateInput(mintDelegate, mph, ctx)\n            } else {\n                //  the new one has to go to the right place\n                checkpoint(\"2a\") &&\n                 mintDelegate.hasValidOutput(mph, ctx)\n            } && \n            checkpoint(\"3\") &&\n            if ( unchangedSpendDgt) {\n                // unchanged spendDgt must not be included in the tx\n                checkpoint(\"4b\") &&\n                requiresNoDelegateInput(spendDelegate, mph, ctx)\n            } else {\n                //  the new one has to go to the right place\n                checkpoint(\"4a\") &&\n                spendDelegate.hasValidOutput(mph, ctx)\n            } &&\n            checkpoint(\"5\") &&\n            if (!changedAnyNamedDelegate) { true } else {\n                // namedDelegates are not allowed to change\n                checkpoint(\"5b\") && \n                namedDelegates.fold( (ok: Bool, name : String, dgt : RelativeDelegateLink) -> Bool {\n                    oldDgt : RelativeDelegateLink = oldNamedDelegates.get(name);\n                    ok && if (oldDgt.serialize() == dgt.serialize()) {\n                        // unchanged named delegate must not be included in the tx\n                        requiresNoDelegateInput(dgt, mph, ctx)\n                    } else {\n                        //  the new one has to go to the right place\n                        dgt.hasValidOutput(mph, ctx)\n                    }\n                }, true)\n            } &&\n            mustNotModifyMintInvariants &&\n            mustNotModifySpendInvariants &&\n            requiresAuthorization(ctx, oldCtDatum) &&\n            checkpoint(\"6\")\n        },\n\n        retiringRefScript => {\n            // the ref script is being spent:\n            isSpendingRefScript : Bool = datum.switch{\n                ScriptReference => true,\n                _ => error(\"wrong use of retiringRefScript action for non-ScriptRef datum\")\n            };\n\n            hasGovAuthority : Bool = mustHaveGovAuthority(ctx,mph);\n\n            isSpendingRefScript && \n            hasGovAuthority &&\n            true\n            // no other constraints; the ref script could be re-created or\n            // replaced with a new one, or simply destroyed.\n        },\n\n        usingAuthority => {\n            // by definition, we're truly notUpdatingCharter(activity) \n            datum.switch {\n                 // throws if bad\n                ctd : CharterToken => requiresAuthorization(ctx, ctd),\n                _ => error(\"wrong use of usingAuthority action for non-CharterToken datum\")\n            }\n        },\n\n        updatingSettings => {\n            datum.switch {\n                SettingsData => {\n                    charterDatum : Datum::CharterToken = getTxCharterDatum(\n                        ctx: ctx,\n                        mph: mph\n                    );\n                    // it requires the govAuthority to be present\n                    hasGovAuthority : Bool = mustHaveGovAuthority(\n                        ctx : ctx,\n                        mph: mph,\n                        charterDatum: charterDatum // already resolved\n                   );\n                   Datum::CharterToken{\n                        spendDelegate,\n                        spendInvariants,\n                        /* settingsUut */ _,\n                        namedDelegates,\n                        mintDelegate ,\n                        mintInvariants,\n                        govDelegate\n                    } = charterDatum;\n                    \n                   // ?? can we iterate inputs along with delegates, to reduce the overhead\n                   //    ... of multiple passes over the tx inputs?\n                    //  option 1: pay for iterating N inputs, \n                    //    - times a switch{} for delegate-matching\n                    //    -    ... and invariants-iteration\n                    //    -    ... and namedDelegates-iteration\n                    //    - Plus a \"is-anything-missing\" check over delegates/invariants/namedDelegates\n                    // option 2: switch and iterate over delegates, invariants, namedDelegates\n                    //    - times a switch for input-finding\n                    //    - ... and no separate is-anything-missing checks.\n                    // ^^^ option 2 has to be cheaper.\n\n                    inputs: []TxInput = ctx.tx.inputs;\n\n                    spendDelegateIsValidating : Bool = \n                        spendDelegate.validatesUpdatedSettings(\n                            inputs: inputs,\n                            mph: mph,\n                            validatorHashRequired: true,\n                            inputRequired: true,\n                            ctx: ctx\n                        ).unwrap();\n                    // tt : Bool = requiresValidDelegateOutput(\n                    //         spendDelegate, mph, ctx);\n                            \n\n                    // minting delegates are checking the settings\n                    mintDelegateIsValidating : Bool = \n                        mintDelegate.validatesUpdatedSettings(\n                            inputs: inputs,\n                            mph: mph,\n                            validatorHashRequired: true,\n                            inputRequired: true,\n                            ctx: ctx\n                        ).unwrap();\n\n                    // govAuthority is checking the settings\n                    govDelegateMaybeValidating : Bool = \n                        govDelegate.validatesUpdatedSettings(\n                            inputs: inputs,\n                            mph: mph,\n                            validatorHashRequired: false,\n                            inputRequired: false,\n                            ctx: ctx\n                        ).switch{\n                            Some => true,\n                            None => true\n                        };\n                    checkOneInvariant : (Bool, RelativeDelegateLink) -> Bool = \n                    (ok: Bool, oneDgt: RelativeDelegateLink) -> Bool {\n                        ok && oneDgt.validatesUpdatedSettings(\n                            inputs: inputs,\n                            mph: mph,\n                            validatorHashRequired: true,\n                            inputRequired: true,\n                            ctx: ctx\n                        ).unwrap()\n                    };\n                    // spendInvariants are checking the settings\n                    spendInvariantsAreValidating : Bool = spendInvariants.fold( \n                        checkOneInvariant, true\n                    );\n                    // mintInvariants are checking the settings\n                    mintInvariantsAreValidating : Bool = mintInvariants.fold( \n                        checkOneInvariant, true\n                    );\n                    // namedDelegates are checking the settings\n                    namedDelegatesAreValidating : Bool = namedDelegates.fold( \n                        (ok: Bool, _, dgt: RelativeDelegateLink) -> Bool {\n                            ok && dgt.validatesUpdatedSettings(\n                                inputs: inputs,\n                                mph: mph,\n                                validatorHashRequired: true,\n                                inputRequired: true,\n                                ctx: ctx\n                            ).unwrap()\n                        }, true\n                    );\n\n                    spendDelegateIsValidating &&\n                    mintDelegateIsValidating &&\n                    govDelegateMaybeValidating &&\n                    spendInvariantsAreValidating &&\n                    mintInvariantsAreValidating &&\n                    namedDelegatesAreValidating &&\n                    hasGovAuthority\n                },\n                _ => error(\"wrong use of updatingSettings action for non-SettingsData datum\")\n            }\n        },\n        retiringSettings => {\n            error(\"implement me\")\n        },\n        // defers to the specialization's Activity::allowActivity() method for checking other activities\n        _ => activity.allowActivity(datum, ctx, mph)\n    };\n\n    assert(allDatumSpecificChecks, \"some datum-check failed\");\n    assert(allActivitySpecificChecks, \"some redeeemer-check failed\");\n\n    //! retains mph in parameterization\n    assert(\n        ( allDatumSpecificChecks && allActivitySpecificChecks ) ||\n            // this should never execute (much less fail), yet it also shouldn't be optimized out.\n             mph.serialize() /* never */ == datum.serialize(), \n        \"unreachable\"\n    ); \n\n    allDatumSpecificChecks && \n    allActivitySpecificChecks &&\n    tx.serialize() != datum.serialize()\n}\n");

code$1.srcFile = "src/DefaultCapo.hl";
code$1.purpose = "spending";
code$1.moduleName = "Capo";

class DefaultSettingsAdapter extends DatumAdapter {
  datumName = "SettingsData";
  fromOnchainDatum(parsedDatum) {
    console.log("-------------------------------------> ", parsedDatum);
    const settingsMap = {};
    for (const [name, microInt] of Object.entries(parsedDatum.data)) {
      if (microInt > Number.MAX_SAFE_INTEGER) {
        throw new Error(
          `microInt value too large for Number: ${microInt}`
        );
      }
      settingsMap[name] = (0 + Number(microInt)) / 1e6;
    }
    return settingsMap;
  }
  toOnchainDatum(settings) {
    this.onChainDatumType;
    this.onChainTypes;
    return Datum.inline(
      new ConstrData(2, [
        this.toMapData(settings, this.toRealNum)
      ])
    );
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
class NoMintDelegation extends StellarDelegate {
  static currentRev = 1n;
  static get defaultParams() {
    return { rev: this.currentRev };
  }
  de;
  contractSource() {
    return code$5;
  }
  getContractScriptParams(config) {
    return {
      rev: config.rev
    };
  }
  txnReceiveAuthorityToken(tcx, value, fromFoundUtxo) {
    throw new Error(`todo`);
  }
  async txnCreatingTokenPolicy(tcx, tokenName) {
    return tcx;
  }
  static mkDelegateWithArgs(a) {
  }
}
__decorateClass$1([
  Activity.partialTxn
], NoMintDelegation.prototype, "txnCreatingTokenPolicy", 1);

const code = new String("module CustomCapoSettings\n\nstruct capoSettings {\n    meaning: Int  \"meaning\"\n    happy: Int  \"happy\"\n    func validate(self) -> Bool {\n        assert(self == self, \"no way\");\n        // assert(self.meaning == 42, \"meaning must be 42\");\n        true\n    }\n}\n\n\n");

code.srcFile = "src/UncustomCapoSettings.hl";
code.purpose = "module";
code.moduleName = "CustomCapoSettings";

const UncustomCapoSettings = code;

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
//!!! todo enable "other" datum args - (ideally, those other than delegate-link types) to be inlcuded in MDCDA above.
class DefaultCapo extends Capo {
  contractSource() {
    return code$1;
  }
  static parseConfig(rawJsonConfig) {
    const { mph, rev, seedTxn, seedIndex, rootCapoScriptHash } = rawJsonConfig;
    const outputConfig = {};
    if (mph)
      outputConfig.mph = MintingPolicyHash.fromHex(mph.bytes);
    if (rev)
      outputConfig.rev = BigInt(rev);
    if (seedTxn)
      outputConfig.seedTxn = TxId.fromHex(seedTxn.bytes);
    if (seedIndex)
      outputConfig.seedIndex = BigInt(seedIndex);
    if (rootCapoScriptHash)
      outputConfig.rootCapoScriptHash = ValidatorHash.fromHex(
        rootCapoScriptHash.bytes
      );
    return outputConfig;
  }
  /**
   * indicates any specialization of the baseline Capo types
   * @remarks
   *
   * The default implementation is an UnspecialiedCapo, which
   * you can use as a template for your specialized Capo.
   *
   * Every specialization MUST include Datum and Activity ("redeemer") enums,
   * and MAY include additional functions, and methods on Datum / Activity.
   *
   * The datum SHOULD have a validateSpend(self, datum, ctx) method.
   *
   * The redeemer SHOULD have an allowActivity(self, datum, ctx) method.
   *
   * @public
   **/
  get specializedCapo() {
    return UnspecializedCapo;
  }
  get customCapoSettings() {
    return UncustomCapoSettings;
  }
  /**
   * indicates any specialization of the baseline Capo types
   * @remarks
   *
   * The default implementation is an UnspecialiedCapo, which
   * you can use as a template for your specialized Capo.
   *
   * Every specialization MUST include Datum and  Activity ("redeemer") enums,
   * and MAY include additional functions, and methods on Datum / Activity.
   *
   * The datum enum SHOULD have a validateSpend(self, datum, ctx) method.
   *
   * The activity enum SHOULD have an allowActivity(self, datum, ctx) method.
   *
   * @public
   **/
  get capoHelpers() {
    return CapoHelpers;
  }
  importModules() {
    const parentModules = super.importModules();
    const { specializedCapo, customCapoSettings } = this;
    if (specializedCapo.moduleName !== "specializedCapo") {
      throw new Error(
        `${this.constructor.name}: specializedCapo() module name must be 'specializedCapo', not '${specializedCapo.moduleName}'
  ... in ${specializedCapo.srcFile}`
      );
    }
    return [
      specializedCapo,
      customCapoSettings,
      this.capoHelpers,
      ...parentModules
    ];
  }
  activityUpdatingCharter() {
    const updatingCharter = this.mustGetActivity("updatingCharter");
    const t = new updatingCharter();
    return { redeemer: t._toUplcData() };
  }
  activityUpdatingSettings() {
    const updatingSettings = this.mustGetActivity("updatingSettings");
    const t = new updatingSettings();
    return { redeemer: t._toUplcData() };
  }
  /**
   * USE THE `delegateRoles` GETTER INSTEAD
   * @remarks
   *
   * - this no-op method is a convenience for Stellar Contracts maintainers
   *   and intuitive developers using autocomplete.
   * - Including it enables an entry
   *   in VSCode "Outline" view, which doesn't include the delegateRoles getter : /
   * @deprecated but please keep as a kind of redirect
   * @public
   **/
  getDelegateRoles() {
    throw new Error(`use the delegateRoles getter instead`);
  }
  get delegateRoles() {
    return delegateRoles({
      govAuthority: defineRole("capoGov", AuthorityPolicy, {
        address: {
          delegateClass: AnyAddressAuthorityPolicy,
          validateConfig(args) {
            const { rev, tn, addrHint } = args;
            const errors = {};
            if (!rev)
              errors.rev = ["required"];
            if (!tn?.length)
              errors.tn = ["(token-name) required"];
            if (!addrHint?.length)
              errors.addrHint = ["destination address required"];
            if (Object.keys(errors).length > 0)
              return errors;
            return void 0;
          }
        }
        // multisig: {
        //     delegateClass: MultisigAuthorityPolicy,
        //     validateConfig(args): strategyValidation {
        //         const { rev, uut } = args;
        //         const errors: ErrorMap = {};
        //         if (!rev) errors.rev = ["required"];
        //         if (!uut) errors.uut = ["required"];
        //         if (Object.keys(errors).length > 0) return errors;
        //         return undefined;
        //     },
        // },
      }),
      mintDelegate: defineRole("mintDgt", BasicMintDelegate, {
        default: {
          delegateClass: BasicMintDelegate,
          partialConfig: {},
          validateConfig(args) {
            return void 0;
          }
        }
        // undelegated: { ... todo ... }
      }),
      spendDelegate: defineRole("spendDgt", StellarDelegate, {
        default: {
          delegateClass: BasicMintDelegate,
          partialConfig: {},
          validateConfig(args) {
            return void 0;
          }
        }
      })
    });
  }
  /**
   * Performs a validation of all critical delegate connections
   * @remarks
   *
   * Checks that each delegate connection is correct and that the underlying
   * scripts for those delegates have not been modified in unplanned ways.
   *
   * Every Capo subclass that adds new delegate types SHOULD implement
   * this method, performing any checks needed to verify the scripts underlying
   * those delegate-types.  It should return `Promise.all([ super(), ...myOwnChecks])`.
   * @public
   **/
  async verifyCoreDelegates() {
    const rcsh = this.configIn?.rootCapoScriptHash;
    if (rcsh && !rcsh.eq(this.validatorHash)) {
      console.error(
        `expected: ` + rcsh.hex + `
  actual: ` + this.validatorHash.hex
      );
      throw new Error(
        `${this.constructor.name}: the leader contract script '${this.scriptProgram?.name}', or one of its dependencies, has been modified`
      );
    }
    const charter = await this.findCharterDatum();
    const { govAuthorityLink, mintDelegateLink, spendDelegateLink } = charter;
    return Promise.all([
      this.connectDelegateWithLink("govAuthority", govAuthorityLink),
      this.connectDelegateWithLink("mintDelegate", mintDelegateLink),
      this.connectDelegateWithLink("spendDelegate", spendDelegateLink)
    ]);
  }
  mkOnchainDelegateLink(dl) {
    const { RelativeDelegateLink: hlRelativeDelegateLink } = this.onChainTypes;
    let {
      uutName,
      strategyName,
      delegateValidatorHash,
      config
      // reqdAddress: canRequireAddr,
      // addrHint = [],
    } = dl;
    const OptValidator = Option(ValidatorHash);
    return new hlRelativeDelegateLink(
      uutName,
      strategyName,
      new OptValidator(delegateValidatorHash)
      // config //!!! todo - support inline config if/when needed
      // needsAddr,
      // addrHint
    );
  }
  async mkDatumCharterToken(args) {
    //!!! todo: make it possible to type these datum helpers more strongly
    console.log("--> mkDatumCharterToken", args);
    const { CharterToken: hlCharterToken } = this.onChainDatumType;
    const govAuthority = this.mkOnchainDelegateLink(args.govAuthorityLink);
    const mintDelegate = this.mkOnchainDelegateLink(args.mintDelegateLink);
    const spendDelegate = this.mkOnchainDelegateLink(
      args.spendDelegateLink
    );
    const mintInvariants = args.mintInvariants.map((dl) => {
      return this.mkOnchainDelegateLink(dl);
    });
    const spendInvariants = args.spendInvariants.map((dl) => {
      return this.mkOnchainDelegateLink(dl);
    });
    const namedDelegates = new Map(
      Object.entries(args.namedDelegates).map(([k, v]) => {
        return [k, this.mkOnchainDelegateLink(v)];
      })
    );
    const settingsUutNameBytes = this.mkSettingsUutName(args.settingsUut);
    const t = new hlCharterToken(
      spendDelegate,
      spendInvariants,
      settingsUutNameBytes,
      namedDelegates,
      mintDelegate,
      mintInvariants,
      govAuthority
    );
    return Datum.inline(t._toUplcData());
  }
  mkSettingsUutName(settingsUut) {
    return settingsUut instanceof UutName ? textToBytes(settingsUut.name) : settingsUut;
  }
  mkDatumScriptReference() {
    const { ScriptReference: hlScriptReference } = this.onChainDatumType;
    const t = new hlScriptReference();
    return Datum.inline(t._toUplcData());
  }
  // XX@ts-expect-error on the default return type - override this method with
  //    more specific adapter
  initSettingsAdapter() {
    return new DefaultSettingsAdapter(this);
  }
  mkDatumSettingsData(settings) {
    const adapter = this.settingsAdapter;
    return adapter.toOnchainDatum(settings);
  }
  //@Xts-expect-error - method should be overridden
  mkInitialSettings() {
    return {
      meaning: 42,
      happy: 1
    };
  }
  // settingsDataToUplc(config: ContractSettingsData<this>) {
  //     const {RealnumSettingsValueV1} = this.onChainTypes;
  //     return
  //     //  new ListData([
  //         //@ts-expect-error
  //         Object.entries(config).map(([k, v]) => {
  //             debugger
  //             return new ConfigValue(k, BigInt(v) * 1_000_000n)._toUplcData();
  //         })
  //     // ])
  //     // return new MapData([
  //     //     [new ByteArrayData(textToBytes("empty")), new ByteArrayData(
  //     //         textToBytes(config.empty)
  //     //     )],
  //     //     [new ByteArrayData(textToBytes("hi")), new ByteArrayData(
  //     //         textToBytes("there")
  //     //     )]
  //     // ])
  // }
  async findCharterDatum(currentCharterUtxo) {
    if (!currentCharterUtxo) {
      currentCharterUtxo = await this.mustFindCharterUtxo();
    }
    const charterDatum = await this.readDatum(
      "CharterToken",
      currentCharterUtxo.origOutput.datum
    );
    if (!charterDatum)
      throw Error(`invalid charter UTxO datum`);
    return charterDatum;
  }
  async findGovDelegate() {
    const charterDatum = await this.findCharterDatum();
    const capoGovDelegate = await this.connectDelegateWithLink(
      "govAuthority",
      charterDatum.govAuthorityLink
    );
    console.log(
      "finding charter's govDelegate via link",
      charterDatum.govAuthorityLink
    );
    return capoGovDelegate;
  }
  async txnAddGovAuthority(tcx) {
    const capoGovDelegate = await this.findGovDelegate();
    console.log("adding charter's govAuthority");
    return capoGovDelegate.txnGrantAuthority(tcx);
  }
  // getMinterParams() {
  //     const { seedTxn, seedIdx } = this.configIn
  //     return { seedTxn, seedIdx }
  // }
  // async txnBurnUuts<
  //     existingTcx extends StellarTxnContext<any>,
  // >(
  //     initialTcx: existingTcx,
  //     uutNames: UutName[],
  // ): Promise<existingTcx> {
  //     const minter = this.connectMinter();
  //     const tcx = await minter.txnBurnUuts(
  //         initialTcx,
  //         uutNames,
  //     );
  //     const tcx2 = await this.txnMustUseCharterUtxo(tcx, "refInput");
  //     return this.txnAddMintDelegate(tcx2);
  // }
  async getMintDelegate() {
    const charterDatum = await this.findCharterDatum();
    return this.connectDelegateWithLink(
      "mintDelegate",
      charterDatum.mintDelegateLink
    );
  }
  async getSpendDelegate() {
    const charterDatum = await this.findCharterDatum();
    return this.connectDelegateWithLink(
      "spendDelegate",
      charterDatum.spendDelegateLink
    );
  }
  async getGovDelegate() {
    const charterDatum = await this.findCharterDatum();
    return this.connectDelegateWithLink(
      "govDelegate",
      charterDatum.govAuthorityLink
    );
  }
  /**
   * Initiates a seeding transaction, creating a new Capo contract of this type
   * @remarks
   *
   * The returned transaction context has `state.bootstrappedConfig` for
   * capturing the details for reproducing the contract's settings and on-chain
   * address.
   *
   * @param charterDatumArgs - initial details for the charter datum
   * @param existinTcx - any existing transaction context
   * @typeParam TCX - inferred type of a provided transaction context
   * @public
   **/
  // @txn
  async mkTxnMintCharterToken(charterDatumArgs, existingTcx) {
    if (this.configIn)
      throw new Error(
        `this contract suite is already configured and can't be re-chartered`
      );
    const initialTcx = existingTcx || new StellarTxnContext(this.myActor);
    const promise = this.txnMustGetSeedUtxo(
      initialTcx,
      "charter bootstrapping",
      ["charter"]
    ).then(async (seedUtxo) => {
      const { txId: seedTxn, utxoIdx } = seedUtxo.outputId;
      const seedIndex = BigInt(utxoIdx);
      const minter = await this.connectMintingScript({
        seedIndex,
        seedTxn
      });
      const { mintingPolicyHash: mph } = minter;
      const csp = this.getContractScriptParams(
        this.configIn || this.partialConfig
      );
      const bsc = {
        ...csp,
        mph,
        seedTxn,
        seedIndex
      };
      this.loadProgramScript({ ...csp, mph });
      bsc.rootCapoScriptHash = this.compiledScript.validatorHash;
      initialTcx.state.bsc = bsc;
      initialTcx.state.bootstrappedConfig = JSON.parse(
        JSON.stringify(bsc, delegateLinkSerializer)
      );
      const fullScriptParams = this.contractParams = this.getContractScriptParams(bsc);
      this.configIn = bsc;
      this.scriptProgram = this.loadProgramScript(fullScriptParams);
      const uutPurposes = ["capoGov", "mintDgt", "spendDgt", "set"];
      const tcx = await this.txnWillMintUuts(
        initialTcx,
        uutPurposes,
        { usingSeedUtxo: seedUtxo },
        {
          govAuthority: "capoGov",
          mintDelegate: "mintDgt",
          spendDelegate: "spendDgt"
        }
      );
      const { uuts } = tcx.state;
      if (uuts.govAuthority !== uuts.capoGov) {
        throw new Error(`assertion can't fail`);
      }
      const govAuthority = await this.txnCreateDelegateLink(tcx, "govAuthority", charterDatumArgs.govAuthorityLink);
      const mintDelegate = await this.txnCreateDelegateLink(tcx, "mintDelegate", charterDatumArgs.mintDelegateLink);
      const spendDelegate = await this.txnCreateDelegateLink(tcx, "spendDelegate", charterDatumArgs.spendDelegateLink);
      const fullCharterArgs = {
        ...charterDatumArgs,
        settingsUut: uuts.set,
        govAuthorityLink: govAuthority,
        mintDelegateLink: mintDelegate,
        namedDelegates: {},
        // can only be empty at charter, for now.
        spendDelegateLink: spendDelegate
      };
      const datum2 = await this.mkDatumCharterToken(fullCharterArgs);
      const charterOut = new TxOutput(
        this.address,
        this.tvCharter(),
        datum2
        // this.compiledScript
      );
      charterOut.correctLovelace(this.networkParams);
      tcx.addInput(seedUtxo);
      tcx.addOutputs([charterOut]);
      const tcx2 = await this.txnMkAddlRefScriptTxn(
        tcx,
        "mintDelegate",
        mintDelegate.delegate.compiledScript
      );
      const tcx3 = await this.txnMkAddlRefScriptTxn(
        tcx2,
        "capo",
        this.compiledScript
      );
      const tcx4 = await this.txnMkAddlRefScriptTxn(
        tcx3,
        "minter",
        minter.compiledScript
      );
      console.log(
        " ---------------- CHARTER MINT ---------------------\n",
        txAsString(tcx4.tx, this.networkParams)
      );
      const settings = this.mkInitialSettings();
      const tcx5 = this.txnAddSettingsOutput(tcx4, settings);
      const minting = this.minter.txnMintingCharter(tcx5, {
        owner: this.address,
        capoGov: uuts.capoGov,
        // same as govAuthority,
        mintDelegate: uuts.mintDelegate,
        spendDelegate: uuts.spendDelegate,
        settingsUut: uuts.set
      });
      return minting;
    });
    return promise;
  }
  async findSettingsDatum({
    settingsUtxo,
    charterUtxo
  } = {}) {
    const foundSettingsUtxo = settingsUtxo || await this.findSettingsUtxo(charterUtxo);
    const data = await this.readDatum(
      this.settingsAdapter,
      foundSettingsUtxo.origOutput.datum
    );
    if (!data)
      throw Error(`missing or invalid settings UTxO datum`);
    return data;
  }
  txnAddSettingsOutput(tcx, settings) {
    const settingsOut = new TxOutput(
      this.address,
      this.uutsValue(tcx.state.uuts.set),
      this.mkDatumSettingsData(settings)
    );
    settingsOut.correctLovelace(this.networkParams);
    return tcx.addOutput(settingsOut);
  }
  /**
   * Creates an additional reference-script-creation txn
   * @remarks
   *
   * Creates a txn for reference-script creation, and
   * adds it to the current transaction context to also be submitted.
   *
   * The reference script is stored in the Capo contract with a special
   * Datum, and it can be used in future transactions to save space and fees.
   *
   * @param tcx - the transaction context
   * @param scriptName - the name of the script, used in the addlTxn's  name
   * @param script - the script to be stored onchain for future reference
   * @public
   **/
  async txnMkAddlRefScriptTxn(tcx, scriptName, script) {
    const refScriptUtxo = new TxOutput(
      this.address,
      new Value(this.ADA(0n)),
      this.mkDatumScriptReference(),
      script
    );
    refScriptUtxo.correctLovelace(this.networkParams);
    const nextTcx = new StellarTxnContext(this.myActor).addOutput(
      refScriptUtxo
    );
    const sn = scriptName[0].toUpperCase() + scriptName.slice(1);
    return tcx.includeAddlTxn(`refScript${sn}`, {
      description: `creates on-chain reference script for ${scriptName}`,
      moreInfo: "saves txn fees and txn space in future txns",
      optional: false,
      tcx: nextTcx
    });
  }
  async txnAttachScriptOrRefScript(tcx, program = this.compiledScript) {
    let expectedVh = this.getProgramHash(program);
    const { purpose: expectedPurpose } = program.properties;
    const isCorrectRefScript = (txin) => {
      const refScript = txin.origOutput.refScript;
      if (!refScript)
        return false;
      const { purpose } = refScript.properties || {};
      if (purpose && purpose != expectedPurpose)
        return false;
      const foundHash = this.getProgramHash(refScript);
      return foundHash == expectedVh;
    };
    if (tcx.txRefInputs.find(isCorrectRefScript)) {
      console.warn("suppressing second add of refScript");
      return tcx;
    }
    const scriptReferences = await this.findScriptReferences();
    const matchingScriptRefs = scriptReferences.find(
      ([txin, refScript]) => isCorrectRefScript(txin)
    );
    if (!matchingScriptRefs) {
      console.warn(
        `missing refScript in Capo ${this.address.toBech32()} for expected script hash ${expectedVh}; adding script directly to txn`
      );
      return tcx.addScriptProgram(program);
    }
    return tcx.addRefInput(matchingScriptRefs[0], program);
  }
  getProgramHash(program) {
    let hash;
    try {
      hash = program.validatorHash.toString();
    } catch (e1) {
      try {
        hash = program.mintingPolicyHash.toString();
      } catch (e2) {
        try {
          hash = program.stakingValidatorHash.toString();
        } catch (e3) {
          debugger;
          throw new Error(
            `can't get script hash from program:
  - tried validatorHash: ${e1.message}
  - tried mintingPolicyHash: ${e2.message}
  - tried stakingValidatorHash: ${e3.message}`
          );
        }
      }
    }
    return hash;
  }
  async findScriptReferences() {
    const utxos = await this.network.getUtxos(this.address);
    const utxosWithDatum = (await Promise.all(
      utxos.map((utxo) => {
        const { datum: datum2 } = utxo.origOutput;
        if (!datum2)
          return null;
        return this.readDatum("ScriptReference", datum2).catch(() => {
          return null;
        }).then((scriptRef) => {
          if (!scriptRef)
            return null;
          return [utxo, scriptRef];
        });
      })
    )).filter((x) => !!x);
    return utxosWithDatum;
  }
  async mkTxnUpdateCharter(args, activity = this.activityUpdatingCharter(), tcx = new StellarTxnContext(this.myActor)) {
    console.log("update charter", { activity });
    return this.txnUpdateCharterUtxo(
      tcx,
      activity,
      await this.mkDatumCharterToken(args)
    );
  }
  async findSettingsUtxo(charterUtxo) {
    const chUtxo = charterUtxo || await this.mustFindCharterUtxo();
    const charterDatum = await this.findCharterDatum(chUtxo);
    const uutName = charterDatum.settingsUut;
    console.log("findSettingsUut", { uutName, charterDatum });
    const uutValue = this.uutsValue(uutName);
    return await this.mustFindMyUtxo(
      "set-uut",
      this.mkTokenPredicate(uutValue)
    );
  }
  async mkTxnUpdateOnchainSettings(data, settingsUtxo, tcx = new StellarTxnContext(this.myActor)) {
    settingsUtxo = settingsUtxo || await this.findSettingsUtxo();
    const spendingDelegate = await this.getSpendDelegate();
    const mintDelegate = await this.getMintDelegate();
    console.log("HI");
    const tcx2 = await this.txnAddGovAuthority(tcx);
    const tcx2a = await this.txnMustUseCharterUtxo(tcx2, "refInput");
    const tcx2b = await this.txnAttachScriptOrRefScript(tcx2a);
    const tcx2c = await spendingDelegate.txnGrantAuthority(
      tcx2b,
      spendingDelegate.activityValidatingSettings()
    );
    const tcx2d = await mintDelegate.txnGrantAuthority(
      tcx2c,
      mintDelegate.activityValidatingSettings()
    );
    const tcx3 = tcx2d.addInput(settingsUtxo, this.activityUpdatingSettings()).addOutput(
      new TxOutput(
        this.address,
        settingsUtxo.origOutput.value,
        this.mkDatumSettingsData(data)
      )
    );
    return tcx3;
  }
  async mkTxnUpdatingMintDelegate(delegateInfo, options = {}, tcx = new StellarTxnContext(this.myActor)) {
    const currentCharter = await this.mustFindCharterUtxo();
    const currentDatum = await this.findCharterDatum(currentCharter);
    const mintDelegate = await this.getMintDelegate();
    const { minter } = this;
    const tcxWithSeed = await this.addSeedUtxo(tcx);
    const uutOptions = options.forcedUpdate ? {
      omitMintDelegate: true,
      minterActivity: minter.activityForcingNewMintDelegate({
        seedTxn: tcxWithSeed.state.seedUtxo.outputId.txId,
        seedIndex: tcxWithSeed.state.seedUtxo.outputId.utxoIdx
      })
    } : {
      usingMintDelegateActivity: mintDelegate.activityReplacingMe({
        seedTxn: tcxWithSeed.state.seedUtxo.outputId.txId,
        seedIndex: tcxWithSeed.state.seedUtxo.outputId.utxoIdx,
        purpose: "mintDgt"
      }),
      additionalMintValues: this.mkValuesBurningDelegateUut(
        currentDatum.mintDelegateLink
      ),
      returnExistingDelegateToScript: false
      // so it can be burned without a txn imbalance
    };
    debugger;
    const tcx2 = await this.txnMintingUuts(
      // todo: make sure seed-utxo is selected with enough minUtxo ADA for the new UUT name.
      // const seedUtxo = await this.txnMustGetSeedUtxo(tcx, "mintDgt", ["mintDgt-XxxxXxxxXxxx"]);
      tcxWithSeed,
      ["mintDgt"],
      uutOptions,
      {
        mintDelegate: "mintDgt"
      }
    );
    const newMintDelegate = await this.txnCreateDelegateLink(tcx2, "mintDelegate", delegateInfo);
    const fullCharterArgs = {
      ...currentDatum,
      mintDelegateLink: newMintDelegate
    };
    return this.mkTxnUpdateCharter(
      fullCharterArgs,
      void 0,
      await this.txnAddGovAuthority(tcx2)
    );
  }
  mkValuesBurningDelegateUut(current) {
    return [mkValuesEntry(current.uutName, -1n)];
  }
  async mkTxnUpdatingSpendDelegate(delegateInfo, options = {}, tcx = new StellarTxnContext(this.myActor)) {
    const currentCharter = await this.mustFindCharterUtxo();
    const currentDatum = await this.findCharterDatum(currentCharter);
    const spendDelegate = await this.getSpendDelegate();
    const tcxWithSeed = await this.addSeedUtxo(tcx);
    const uutOptions = {
      omitMintDelegate: true,
      minterActivity: this.minter.activityCreatingNewSpendDelegate({
        seedTxn: tcxWithSeed.state.seedUtxo.outputId.txId,
        seedIndex: tcxWithSeed.state.seedUtxo.outputId.utxoIdx,
        ...options.forcedUpdate ? {} : {
          // minter will enforce this Burn
          replacingUut: spendDelegate.authorityTokenName
        }
      }),
      ...options.forcedUpdate ? {
        // the minter won't require the old delegate to be burned
        returnExistingDelegateToScript: false
        // so it can be burned without a txn imbalance
      } : {
        additionalMintValues: this.mkValuesBurningDelegateUut(
          currentDatum.spendDelegateLink
        )
      }
    };
    debugger;
    const tcx2 = await this.txnMintingUuts(
      // todo: make sure seed-utxo is selected with enough minUtxo ADA for the new UUT name.
      // const seedUtxo = await this.txnMustGetSeedUtxo(tcx, "mintDgt", ["mintDgt-XxxxXxxxXxxx"]);
      tcxWithSeed,
      ["spendDgt"],
      uutOptions,
      {
        spendDelegate: "spendDgt"
      }
    );
    const newSpendDelegate = await this.txnCreateConfiguredDelegate(tcx2, "spendDelegate", delegateInfo);
    const tcx2a = options.forcedUpdate ? tcx2 : await spendDelegate.txnGrantAuthority(
      tcx2,
      spendDelegate.activityReplacingMe({
        seedTxn: tcxWithSeed.state.seedUtxo.outputId.txId,
        seedIndex: tcxWithSeed.state.seedUtxo.outputId.utxoIdx,
        purpose: "spendDgt"
      }),
      false
    );
    const tcx2b = await newSpendDelegate.delegate.txnReceiveAuthorityToken(
      tcx2a,
      newSpendDelegate.delegate.tvAuthorityToken()
    );
    debugger;
    const fullCharterArgs = {
      ...currentDatum,
      spendDelegateLink: newSpendDelegate
    };
    return this.mkTxnUpdateCharter(
      fullCharterArgs,
      void 0,
      await this.txnAddGovAuthority(tcx2b)
    );
  }
  async mkTxnAddingMintInvariant(delegateInfo, tcx = new StellarTxnContext(this.myActor)) {
    const currentDatum = await this.findCharterDatum();
    const tcx2 = await this.txnMintingUuts(
      await this.addSeedUtxo(tcx),
      ["mintDgt"],
      {},
      {
        mintDelegate: "mintDgt"
      }
    );
    const mintDelegate = await this.txnCreateDelegateLink(tcx2, "mintDelegate", delegateInfo);
    const fullCharterArgs = {
      ...currentDatum,
      mintInvariants: [...currentDatum.mintInvariants, mintDelegate]
    };
    const datum2 = await this.mkDatumCharterToken(fullCharterArgs);
    const charterOut = new TxOutput(
      this.address,
      this.tvCharter(),
      datum2
      // this.compiledScript
    );
    return tcx2.addOutput(charterOut);
  }
  async mkTxnAddingSpendInvariant(delegateInfo, tcx = new StellarTxnContext(this.myActor)) {
    const currentDatum = await this.findCharterDatum();
    const tcx2 = await this.txnMintingUuts(
      await this.addSeedUtxo(tcx),
      ["spendDgt"],
      {},
      {
        spendDelegate: "spendDgt"
      }
    );
    const spendDelegate = await this.txnCreateDelegateLink(tcx2, "spendDelegate", delegateInfo);
    const fullCharterArgs = {
      ...currentDatum,
      spendInvariants: [...currentDatum.spendInvariants, spendDelegate]
    };
    const datum2 = await this.mkDatumCharterToken(fullCharterArgs);
    const charterOut = new TxOutput(
      this.address,
      this.tvCharter(),
      datum2
      // this.compiledScript
    );
    return tcx2.addOutput(charterOut);
  }
  async mkTxnAddingNamedDelegate(delegateName, delegateInfo, tcx = new StellarTxnContext(this.myActor)) {
    const currentDatum = await this.findCharterDatum();
    const tcx2 = await this.txnMintingUuts(
      await this.addSeedUtxo(tcx),
      ["spendDgt"],
      {},
      {
        spendDelegate: "spendDgt"
      }
    );
    const spendDelegate = await this.txnCreateDelegateLink(tcx2, "spendDelegate", delegateInfo);
    const fullCharterArgs = {
      ...currentDatum,
      namedDelegates: {
        ...currentDatum.namedDelegates,
        [delegateName]: spendDelegate
      }
    };
    const datum2 = await this.mkDatumCharterToken(fullCharterArgs);
    const charterOut = new TxOutput(
      this.address,
      this.tvCharter(),
      datum2
      // this.compiledScript
    );
    return tcx2.addOutput(charterOut);
  }
  async findUutSeedUtxo(uutPurposes, tcx) {
    //!!! make it big enough to serve minUtxo for the new UUT(s)
    const uutSeed = this.mkValuePredicate(BigInt(42e3), tcx);
    return this.mustFindActorUtxo(
      `seed-for-uut ${uutPurposes.join("+")}`,
      uutSeed,
      tcx
    );
  }
  async txnMintingUuts(initialTcx, uutPurposes, options = {}, roles = {}) {
    const {
      usingSeedUtxo,
      additionalMintValues = [],
      usingMintDelegateActivity,
      omitMintDelegate = false,
      minterActivity,
      returnExistingDelegateToScript = true
    } = options;
    const mintDelegate = await this.getMintDelegate();
    const { seedUtxo } = initialTcx.state;
    const tcx = await this.txnWillMintUuts(
      initialTcx,
      uutPurposes,
      {
        usingSeedUtxo: seedUtxo
        // additionalMintValues,
        // existingDelegateReplacementActivity,
      },
      roles
    );
    if (omitMintDelegate) {
      if (usingMintDelegateActivity)
        throw new Error(
          `omitMintDelegate and usingMintDelegateActivity are mutually exclusive`
        );
      if (!minterActivity) {
        throw new Error(
          `txnMintingUuts: omitMintDelegate requires a minterActivity to be specified
  ... this indicates an activity in the MINTER (not the minting delegate),  ... the minter should be able to honor that activity/redeemer.`
        );
      }
      const tcx22 = await this.minter.txnMIntingWithoutDelegate(
        tcx,
        [
          ...mkUutValuesEntries(tcx.state.uuts),
          ...additionalMintValues
        ],
        minterActivity
      );
      return tcx22;
    }
    if (additionalMintValues.length && !usingMintDelegateActivity) {
      throw new Error(
        `additionalMintValues requires a custom activity provided by your mint delegate specialization`
      );
    }
    const dgtActivity = usingMintDelegateActivity || mintDelegate.activityMintingUuts({
      purposes: uutPurposes,
      ...tcx.getSeedAttrs()
    });
    const tcx2 = await this.minter.txnMintWithDelegateAuthorizing(
      tcx,
      [...mkUutValuesEntries(tcx.state.uuts), ...additionalMintValues],
      mintDelegate,
      dgtActivity,
      returnExistingDelegateToScript
    );
    console.log(
      "    \u{1F41E}\u{1F41E} @end of txnMintingUuts",
      dumpAny(tcx2, this.networkParams)
    );
    return tcx2;
  }
  /**
   * Finds a free seed-utxo from the user wallet, and adds it to the transaction
   * @remarks
   *
   * The seedUtxo will be consumed in the transaction, so it can never be used
   * again; its value will be returned to the user wallet.
   *
   * The seedUtxo is needed for UUT minting, and the transaction is typed with
   * the presence of that seed (found in tcx.state.seedUtxo).
   * @public
   **/
  async addSeedUtxo(tcx) {
    const seedUtxo = await this.findUutSeedUtxo([], tcx);
    const tcx2 = tcx.addInput(seedUtxo);
    tcx2.state.seedUtxo = seedUtxo;
    return tcx2;
  }
  async txnWillMintUuts(tcx, uutPurposes, { usingSeedUtxo }, roles = {}) {
    const { txId, utxoIdx } = usingSeedUtxo.outputId;
    const { blake2b } = Crypto;
    const uutMap = Object.fromEntries(
      uutPurposes.map((uutPurpose) => {
        const idx = new HInt(utxoIdx).toCbor();
        const txoId = txId.bytes.concat(["@".charCodeAt(0)], idx);
        const uutName = new UutName(
          uutPurpose,
          `${uutPurpose}-${bytesToHex(blake2b(txoId).slice(0, 6))}`
        );
        return [uutPurpose, uutName];
      })
    );
    for (const [role, uutPurpose] of Object.entries(roles)) {
      uutMap[role] = uutMap[uutPurpose];
    }
    if (!tcx.state)
      tcx.state = { uuts: {} };
    tcx.state.uuts = {
      ...tcx.state.uuts,
      ...uutMap
    };
    return tcx;
  }
  requirements() {
    return hasReqts({
      "positively governs all administrative actions": {
        purpose: "to maintain clear control by an abstract entity",
        details: [
          // descriptive details of the requirement (not the tech):
          "A governance delegate is defined during contract creation",
          "The contract's policy for allowing governance actions is abstract, ",
          "  ... enforced only by a delegation pattern. ",
          "Thus, the Capo doesn't contain any of the policy details.",
          "The delegate can be evolved through governance action"
        ],
        mech: [
          // descriptive details of the chosen mechanisms for implementing the reqts:
          "uses a 'charter' token specialized for this contract",
          "the charter token has a govDgt (governance delegate) in its Datum structure",
          "the gov delegate's token can provide authorization for administrative actions",
          "the charter Datum is updated when needed to reflect a new gov delegation config"
        ],
        requires: [
          "has a unique, permanent charter token",
          "has a unique, permanent treasury address",
          // "the trustee threshold is enforced on all administrative actions",
          // "the trustee group can be changed",
          "the charter token is always kept in the contract",
          "the charter details can be updated by authority of the capoGov-* token",
          "can mint other tokens, on the authority of the charter's registered mintDgt- token",
          "can handle large transactions with reference scripts"
        ]
      },
      "has a singleton minting policy": {
        purpose: "to mint various tokens authorized by the treasury",
        details: [
          "A chosen minting script is bound deterministically to the contract constellation",
          "Its inaugural (aka 'initial Charter' or 'Charter Mint') transaction creates a charter token",
          "The minting script can issue further tokens approved by the Capo's minting delegate",
          "The minting script does not need to concern itself with details of the delegate's approval"
        ],
        mech: [
          "has an initial UTxO chosen arbitrarily, and that UTxO is consumed during initial Charter",
          "makes a different address depending on (txId, outputIndex) parameters of the Minting script"
        ],
        requires: [
          "can mint other tokens, on the authority of the charter's registered mintDgt- token"
        ]
      },
      "the charter details can be updated by authority of the capoGov-* token": {
        purpose: "to support behavioral changes over time by repointing the delegate links",
        details: [
          "The Capo's ability to accept charter-configuration changes allows its behavior to evolve. ",
          "These configuration changes can accept a new minting-delegate configuration ,",
          " ... or other details of the Charter datum that may be specialized.",
          "Charter updates are authorized by the gov delegate"
        ],
        mech: ["can update details of the datum"],
        requires: [
          "can update the minting delegate in the charter data",
          "can update the spending delegate in the charter data",
          "can add invariant minting delegates to the charter data",
          "can add invariant spending delegates to the charter data"
        ]
      },
      "can update the minting delegate in the charter data": {
        purpose: "to evolve the minting policy for the contract",
        details: [
          "when updating the minting policy delegate, the gov authority is used to authorize the change",
          "the minting policy is updated in the charter datum",
          "the old minting policy should be retired when changing policies"
        ],
        impl: "mkTxnUpdatingMintDelegate()",
        mech: [
          "can install an updated minting delegate",
          "fails without the capoGov- authority uut",
          "normally requires the eixsting mint delegate to be involved in the replacement",
          "can force-replace the mint delegate if needed",
          "keeps the charter token in the contract address",
          "uses the new minting delegate after it is installed",
          "can't use the old minting delegate after it is replaced"
        ]
      },
      "can update the spending delegate in the charter data": {
        purpose: "to evolve the spending policy for the contract's delegated-datum types",
        details: [
          "when updating the spending policy delegate, the gov authority is used to authorize the change",
          "the spending policy is updated in the charter datum",
          "the old spending policy should be retired when changing policies"
        ],
        mech: [
          "can install an updated spending delegate",
          "fails without the capoGov- authority uut",
          "normally requires the eixsting mint delegate to be involved in the replacement",
          "can force-replace the mint delegate if needed",
          "keeps the charter token in the contract address",
          "uses the new spending delegate after it is installed",
          "can't use the old spending delegate after it is replaced"
        ]
      },
      "can add invariant spending delegates to the charter data": {
        purpose: "to arrange permanent spending policies for custom data types",
        details: [
          "The Capo can add invariant spending policies for custom data types",
          "These invariants are enforced forever, and can't be changed",
          "The baseline scripts directly enforce these invariants, so that a delegate-swap actvity can't undermine the invariant"
        ],
        mech: [
          "TODO: TEST can add an invariant spending delegate for a datum type",
          "TODO: TEST cannot change any other charter settings when adding an invariant",
          "TODO: TEST cannot change spend invariants when updating other charter settings",
          "TODO: TEST new invariants are always enforced",
          "TODO: TEST can never remove an invariant spending delegate for a datum type"
        ]
      },
      "can add invariant minting delegates to the charter data": {
        purpose: "to arrange permanent minting policies constraining what can be minted",
        details: [
          "The Capo can add invariant mint policies",
          "These invariants are enforced forever, and can't be changed",
          "The baseline scripts directly enforce these invariants, so that a mint-delegate-swap actvity can't undermine the invariant"
        ],
        mech: [
          "TODO: TEST can add an invariant mint delegate",
          "TODO: TEST fails without the capoGov- authority uut",
          "TODO: TEST cannot change any other charter settings when adding the mint invariant",
          "TODO: TEST can never remove an mint invariant mint after it is added",
          "TODO: TEST cannot change mint invariants when updating other charter settings",
          "TODO: TEST always enforces new mint invariants"
        ]
      },
      "has a unique, permanent treasury address": {
        purpose: "to give continuity for its stakeholders",
        details: [
          "One-time creation is ensured by UTxO's unique-spendability property",
          "Determinism is transferred from the charter utxo to the MPH and to the treasury address",
          "Further software development lifecycle is enabled by evolution of details stored in the Charter datum"
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
          // "XXX - move to multi-sig Delegate - TODO: fails if minSigs is longer than trustee list",
          "doesn't work with a different spent utxo"
        ],
        requires: [
          "has a singleton minting policy",
          "the charter token is always kept in the contract"
        ]
      },
      "supports an abstract Settings structure stored in the contact": {
        purpose: "allows settings that can evolve to support Capo-related scripts as needed",
        details: [
          "The Settings structure can be stored in the contract, separately from the CharterDatum. ",
          "It can be updated by the govAuthority, and can be used to store any ",
          "  ... data needed by the Capo's scripts, such as minting and spending delegates.",
          "The charter datum references the settings uut, and shouldn't ",
          "  ... ever need to change that reference, since the settings data can be updated in place.",
          "The settings can store various data using string keys and conventions defined within the Capo.",
          "The Capo contract MUST NOT make any calls to methods in the Settings structure, ",
          "  ... so that that the Capo's code won't be changed if any methods are modified."
        ],
        mech: [
          "has a 'SettingsData' datum variant & utxo in the contract",
          "offchain code can read the settings data from the contract",
          "TODO: TEST onchain code can read the settings data from the contract",
          "charter creation requires a CharterDatum reference to the settings UUT",
          "charter creation requires presence of a SettingsData map",
          "updatingCharter activity MUST NOT change the set-UUT reference"
        ],
        requires: [
          "mkTxnUpdateSettings(): can update the settings",
          "added and updated delegates always validate the present configuration data"
        ]
      },
      "mkTxnUpdateSettings(): can update the settings": {
        purpose: "to support parameter changes",
        impl: "mkTxnUpdateSettings()",
        details: [
          "The minting delegate is expected to validate all updates to the configuration data.",
          "The spending delegate is expected to validate all updates to the configuration data.",
          "Settings changes are validated by all registered delegates before being accepted."
        ],
        mech: [
          "can update the settings data with a separate UpdatingSettings Activity on the Settings",
          "requires the capoGov- authority uut to update the settings data",
          "the spending delegate must validate the UpdatingSettings details",
          "the minting delegate must validate the UpdatingSettings details",
          "all named delegates must validate the UpdatingSettings details",
          "TODO: the spending invariant delegates must validate the UpdatingSettings details",
          "TODO: the minting invariant delegates must validate the UpdatingSettings details"
        ]
      },
      "added and updated delegates always validate the present configuration data": {
        purpose: "to ensure that the entirety of policies in a contract suite have integrity",
        details: [
          "New delegates cannot be adopted unless they also validate the present configuration data, ",
          "  ... so that configuration and current delegates can always be expected to be in sync.",
          "However, a new delegate can't verify the config during their creation, ",
          "  ... because its policy can be triggered only after it has a utxo in it)",
          "With an an initial step of staging a prospective delegate, the new delegate can ",
          "  ... provide positive assurance of  compatibility with the current settings."
        ],
        impl: "mkTxnStagingNewDelegate",
        mech: [
          "TODO: staging a Named delegate updates the namedDelegates structure with staged item",
          "TODO: staging a Mint delegate updates the mintDelegateLink structure with staged item",
          "TODO: staging a Spend delegate updates the spendDelegateLink structure with staged item",
          "TODO: staging an invariant delegate updates the invariantDelegates structure with staged item"
        ],
        requires: ["can commit new delegates"]
      },
      "can commit new delegates": {
        purpose: "to finalize the adoption of a new or updated delegate",
        details: [
          "A staged delegate can be committed, if it the current settings validate okay with it. ",
          "This gives that delegate space to exist, so that its settings-validation logic can ",
          "  ... possibly be triggered."
        ],
        mech: [
          "TODO: a staged delegate is only adopted if it validates ok with the then-current settings"
        ]
      },
      "supports storing new types of datum not pre-defined in the Capo's on-chain script": {
        purpose: "to allow data extensibility and evolution in a backwards-compatible way",
        details: [
          "The Capo's DelegatedDatum type encapsulates all custom data types, ",
          "  ... and can be thought of as a Union of types that can be extended over time",
          "This allows the policies governing each type of data to evolve independently",
          "  ... without those data needing to be moved between contract addresses when changing the policies.",
          "The spending delegate script is expected to enforce spending rules for each type of custom data",
          "The minting delegate is expected to enforce creation rules for each type of custom data",
          "The mint- and spend-delegates can evolve to handle new types of data",
          "A namedDelegates structure in the Capo provides a manifest of additional delegates, ",
          "  ... whose involvement may be required as needed by the mint- and spend-delegates."
        ],
        mech: [
          "has named delegates, as a string map to named delegate links",
          "the spending policy "
        ],
        requires: [
          "the charter has a namedDelegates structure for semantic delegate links",
          "CreatingDelegatedDatum: creates a UTxO with any custom datum",
          "UpdatingDelegatedDatum: checks that a custom data element can be updated"
        ]
      },
      "the charter has a namedDelegates structure for semantic delegate links": {
        purpose: "to provide a manifest of additional delegates that may be required to enforce application semantics",
        details: [
          "The namedDelegates structure is a string map to named delegate links",
          "The minting and spending delegates can use these named delegates as needed",
          "The minting and spending delegates can evolve to handle new types of data",
          "The namedDelegates structure can be updated by the gov delegate"
        ],
        mech: [
          "has a namedDelegates structure in the charter datum",
          "the namedDelegates structure can be updated by the gov delegate"
        ],
        requires: []
      },
      "CreatingDelegatedDatum: creates a UTxO with any custom datum": {
        purpose: "allows the application to enforce policies for custom record creation",
        details: [
          "The Capo must involve the minting delegate in creating a custom datum",
          "  ... which can apply its own logic to deciding whether the creation is allowed.",
          "The Capo trusts the minting delegate's enforcement of policy."
        ],
        impl: "mkTxnCreatingDelegatedDatum",
        mech: [
          "builds transactions including the minting delegate",
          "fails if the minting delegate is not included in the transaction"
        ]
      },
      "UpdatingDelegatedDatum: checks that a custom data element can be updated": {
        purpose: "guards appropriate updates to custom data elements",
        details: [
          "When updating a custom datum, the Capo must involve the spending delegate ",
          "  ... which can apply its own logic to deciding whether the update is allowed.",
          "The Capo trusts the spending delegate's enforcement of policy."
        ],
        mech: [
          "builds transactions including the spending-delegate",
          "fails if the spending delegate is not included in the transaction",
          "TODO: builds transactions including the invariant spending-delegates",
          "TODO: fails if the expected invariant delegate is not included in the transaction"
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
          "TODO: ensures that the charter token is kept separate from other assets in the contract"
        ],
        requires: []
      },
      "can mint other tokens, on the authority of the charter's registered mintDgt- token": {
        purpose: "to simplify the logic of minting, while being sure of minting authority",
        details: [
          "the minting policy doesn't have to directly express detailed policy for authorization",
          "instead, it defers authority to the minting delegate, ",
          "... which can implement its own policy for minting",
          "... and by simply requiring that the mintDgt token is being spent.",
          "The minting delegate decides whether that's to be allowed."
        ],
        mech: [
          "can build transactions that mint non-'charter' tokens",
          "requires the charter-token to be spent as proof of authority",
          "fails if the charter-token is not returned to the treasury",
          "fails if the charter-token parameters are modified"
        ]
      },
      "can handle large transactions with reference scripts": {
        purpose: "to support large transactions and reduce per-transaction costs",
        details: [
          "Each Capo involves the leader contract, a short minting script, ",
          "  ... and a minting delegate.  Particularly in pre-production, these ",
          "  ... can easily add up to more than the basic 16kB transaction size limit.",
          "By creating reference scripts, the size budget overhead for later ",
          "  ... transactions is reduced, at cost of an initial deposit for each refScript. ",
          "Very small validators may get away without refScripts, but more complicated ",
          "  ... transactions will need them.  So creating them is recommended in all cases."
        ],
        mech: [
          "creates refScript for minter during charter creation",
          "creates refScript for capo during charter creation",
          "creates refScript for mintDgt during charter creation",
          "finds refScripts in the Capo's utxos",
          "txnAttachScriptOrRefScript(): uses scriptRefs in txns on request"
        ]
      }
    });
  }
}
__decorateClass([
  Activity.redeemer
], DefaultCapo.prototype, "activityUpdatingCharter", 1);
__decorateClass([
  Activity.redeemer
], DefaultCapo.prototype, "activityUpdatingSettings", 1);
__decorateClass([
  datum
], DefaultCapo.prototype, "mkDatumCharterToken", 1);
__decorateClass([
  datum
], DefaultCapo.prototype, "mkDatumScriptReference", 1);
__decorateClass([
  datum
], DefaultCapo.prototype, "mkDatumSettingsData", 1);
__decorateClass([
  partialTxn
], DefaultCapo.prototype, "txnAttachScriptOrRefScript", 1);
__decorateClass([
  txn
], DefaultCapo.prototype, "mkTxnUpdateCharter", 1);
__decorateClass([
  txn
], DefaultCapo.prototype, "mkTxnUpdateOnchainSettings", 1);
__decorateClass([
  txn
], DefaultCapo.prototype, "mkTxnUpdatingMintDelegate", 1);
__decorateClass([
  txn
], DefaultCapo.prototype, "mkTxnUpdatingSpendDelegate", 1);
__decorateClass([
  txn
], DefaultCapo.prototype, "mkTxnAddingMintInvariant", 1);
__decorateClass([
  txn
], DefaultCapo.prototype, "mkTxnAddingSpendInvariant", 1);
__decorateClass([
  partialTxn
], DefaultCapo.prototype, "txnMintingUuts", 1);
__decorateClass([
  partialTxn
], DefaultCapo.prototype, "txnWillMintUuts", 1);

function mkHeliosModule(src, filename) {
  const module = new String(src);
  const [_, purpose, moduleName] = src.match(/(module|minting|spending|endpoint)\s+([a-zA-Z0-9]+)/m) || [];
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
        console.warn(
          `heliosLoader: generating javascript for ${relPath}`
        );
        const [_, purpose, moduleName] = content.match(
          /(module|minting|spending|endpoint)\s+([a-zA-Z0-9]+)/m
        ) || [];
        if (!(purpose && moduleName))
          throw new Error(`Bad format for helios file ${id}`);
        const code = `const code = new String(${JSON.stringify(content)});

code.srcFile = ${JSON.stringify(relPath)};
code.purpose = ${JSON.stringify(purpose)}
code.moduleName = ${JSON.stringify(moduleName)}

export default code
`;
        return {
          code,
          map: { mappings: "" }
        };
      }
    }
    // buildStart({ plugins }) {
    // 	const parentName = 'esbuild';
    // 	const parentPlugin = plugins.find(
    // 		plugin => plugin.name === parentName
    // 	);
    // 	if (!parentPlugin) {
    // 		// or handle this silently if it is optional
    // 		throw new Error(
    // 			`This plugin depends on the "${parentName}" plugin.`
    // 		);
    // 	}
    // 	// now you can access the API methods in subsequent hooks
    // 	esbuildApi = parentPlugin;
    // },
  };
}

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
    await helper.setupPending;
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
  _actorName;
  get actorName() {
    return this._actorName;
  }
  /**
   * Gets the current actor wallet
   *
   * @public
   **/
  get currentActor() {
    return this.actors[this._actorName];
  }
  /**
   * @deprecated
   * NOTE: setting currentActor = <string> is obsolete; use setActor() instead
   *
   * @internal
   **/
  set currentActor(actorName) {
    throw new Error(`deprecated; use async setActor()`);
  }
  async setActor(actorName) {
    const thisActor = this.actors[actorName];
    if (!thisActor)
      throw new Error(
        `setCurrentActor: invalid actor name '${actorName}'`
      );
    if (this._actorName) {
      console.log(
        `
\u{1F3AD} -> \u{1F3AD} changing actor from \u{1F3AD} ${this._actorName} to  \u{1F3AD} ${actorName} ${dumpAny(thisActor.address)}`
      );
    } else {
      console.log(
        `
\u{1F3AD}\u{1F3AD} initial actor ${actorName} ${dumpAny(
          thisActor.address
        )}`
      );
    }
    this._actorName = actorName;
    if (this.strella) {
      this.strella = await this.initStellarClass(
        this.state.parsedConfig || this.config
      );
    }
  }
  address;
  setupPending;
  async setupActors() {
    console.warn(
      `using 'hiro' as default actor because ${this.constructor.name} doesn't define setupActors()`
    );
    this.addActor("hiro", 1863n * ADA);
    return this.setActor("hiro");
  }
  constructor(config) {
    this.state = {};
    if (config) {
      console.log(
        "XXXXXXXXXXXXXXXXXXXXXXXXXX test helper with config",
        config
      );
      this.config = config;
    }
    const [theNetwork, emuParams] = this.mkNetwork();
    this.liveSlotParams = emuParams;
    this.network = theNetwork;
    this.networkParams = new NetworkParams(preProdParams);
    this.actors = {};
    const now = /* @__PURE__ */ new Date();
    this.waitUntil(now);
    if (config?.skipSetup) {
      console.log("test helper skipping setup");
      return;
    }
    this.setupPending = this.initialize(config);
  }
  async initialize(config) {
    const { randomSeed, ...p } = config;
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
      this.actors = {};
      this.setupPending = void 0;
    } else {
      console.log(
        "???????????????????????? Test helper initializing without this.strella"
      );
    }
    if (this.setupPending)
      return this.setupPending;
    this._actorName = "";
    const actorSetup = this.setupActors();
    await actorSetup;
    if (!this._actorName)
      throw new Error(
        `${this.constructor.name} doesn't setActor()  in setupActors()`
      );
    return this.initStellarClass();
  }
  async initStellarClass(config = this.config) {
    const TargetClass = this.stellarClass;
    const strella = await this.initStrella(TargetClass, config);
    this.strella = strella;
    this.address = strella.address;
    return strella;
  }
  //!!! reconnect tests to tcx-based config-capture
  // onInstanceCreated: async (config: ConfigFor<SC>) => {
  //     this.config = config
  //     return {
  //         evidence: this,
  //         id: "empheral",
  //         scope: "unit test"
  //     }
  // }
  async initStrella(TargetClass, config) {
    const setup = {
      network: this.network,
      myActor: this.currentActor,
      networkParams: this.networkParams,
      isTest: true
    };
    let cfg = {
      setup,
      config
    };
    if (!config)
      cfg = {
        setup,
        partialConfig: {}
      };
    if (setup.myActor) {
      console.log(
        "+strella init with actor addr",
        setup.myActor.address.toBech32()
      );
    } else {
      console.log("+strella init without actor");
    }
    return TargetClass.createWith(cfg);
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
      `${this._actorName} has money: 
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
        e.message + "\nin tx: " + txAsString(tx, this.networkParams) + "\nprofile: " + tx.profileReport
      );
    }
    if (isAlreadyInitialized && !force) {
      throw new Error(
        `helper is already initialized; use the submitTx from the testing-context's 'strella' object instead`
      );
    }
    console.log(
      `Test helper ${force || ""} submitting tx${force && "" || " prior to instantiateWithParams()"}:
` + txAsString(tx, this.networkParams)
      // new Error(`at stack`).stack
    );
    try {
      const txId = await this.network.submitTx(tx);
      console.log(
        "test helper submitted direct txn:" + txAsString(tx, this.networkParams)
      );
      this.network.tick(1n);
      return txId;
    } catch (e) {
      console.error(
        `submit failed: ${e.message}
  ... in tx ${txAsString(tx)}`
      );
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
  /**
   * creates a new Actor in the transaction context with initial funds, returning a Wallet object
   * @remarks
   *
   * Given an actor name ("marcie") or role name ("marketer"), and a number
   * of indicated lovelace, creates and returns a wallet having the indicated starting balance.
   *
   * By default, three additional, separate 5-ADA utxos are created, to ensure sufficient Collateral and
   * small-change are existing, making typical transaction scenarios work easily.  If you want to include
   * other utxo's instead you can supply their lovelace sizes.
   *
   * To suppress creation of additional utxos, use `0n` for arg3.
   *
   * You may wish to import {@link ADA} = 1_000_000n from the testing/ module, and
   * multiply smaller integers by that constant.
   *
   * @param roleName - an actor name or role-name for this wallet
   * @param walletBalance - initial wallet balance
   * @param moreUtxos - additional utxos to include
   *
   * @example
   *     this.addActor("cheapo", 14n * ADA, 0n);  //  14 ADA and no additional utxos
   *     this.addActor("flexible", 14n * ADA);  //  14 ADA + default 15 ADA in 3 additional utxos
   *     this.addActor("moneyBags", 42_000_000n * ADA, 5n, 4n);  //  many ADA and two collaterals
   *
   *     //  3O ADA in 6 separate utxos:
   *     this.addActor("smallChange", 5n * ADA, 5n * ADA, 5n * ADA, 5n * ADA, 5n * ADA, 5n * ADA);
   *
   * @public
   **/
  addActor(roleName, walletBalance, ...moreUtxos) {
    if (this.actors[roleName])
      throw new Error(`duplicate role name '${roleName}'`);
    //! it instantiates a wallet with the indicated balance pre-set
    const a = this.network.createWallet(walletBalance);
    const addr = a.address.toBech32();
    console.log(
      `+\u{1F3AD} Actor: ${roleName}: ${addr.slice(0, 12)}\u2026${addr.slice(
        -4
      )} ${lovelaceToAda(
        walletBalance
      )} (\u{1F511}#${a.address.pubKeyHash?.hex.substring(0, 8)}\u2026)`
    );
    //! it makes collateral for each actor, above and beyond the initial balance,
    this.network.tick(BigInt(2));
    const five = 5n * ADA;
    if (0 == moreUtxos.length)
      moreUtxos = [five, five, five];
    for (const moreLovelace of moreUtxos) {
      if (moreLovelace > 0n) {
        this.network.createUtxo(a, moreLovelace);
      }
    }
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
    config
  } = {}) {
    if (this.strella && this.randomSeed == randomSeed) {
      console.log(
        "       ----- skipped duplicate setup() in test helper"
      );
      return this.strella;
    }
    if (this.strella) {
      console.log(
        `  ---  new test helper setup with new seed (was ${this.randomSeed}, now ${randomSeed})...
` + new Error("stack").stack.split("\n").slice(1).filter(
          (line) => !line.match(/node_modules/) && !line.match(/node:internal/)
        ).join("\n")
      );
      this.setupPending = void 0;
      this.actors = {};
    }
    if (this.setupPending) {
      return this.setupPending;
    }
    await this.delay(1);
    const actorSetup = this.setupActors();
    await actorSetup;
    this.randomSeed = randomSeed;
    this.state.mintedCharterToken = void 0;
    this.state.parsedConfig = void 0;
    //! when there's not a preset config, it leaves the detailed setup to be done just-in-time
    if (!config)
      return this.strella = await this.initStrella(this.stellarClass);
    const strella = await this.initStrella(this.stellarClass, config);
    this.strella = strella;
    const { address, mintingPolicyHash: mph } = strella;
    const { name } = strella.scriptProgram;
    console.log(
      name,
      address.toBech32().substring(0, 18) + "\u2026",
      "vHash \u{1F4DC} " + strella.validatorHash.hex.substring(0, 12) + "\u2026",
      "mph \u{1F3E6} " + mph?.hex.substring(0, 12) + "\u2026"
    );
    return strella;
  }
  get ready() {
    return !!(this.strella.configIn || this.state.parsedConfig);
  }
  /**
   * Creates a new transaction-context with the helper's current or default actor
   * @public
   **/
  mkTcx() {
    return new StellarTxnContext(this.currentActor);
  }
  async bootstrap(args) {
    let strella = this.strella || await this.initialize();
    if (this.ready)
      return strella;
    await this.mintCharterToken(args);
    return strella;
  }
}

class DefaultCapoTestHelper extends CapoTestHelper {
  /**
   * Creates a prepared test helper for a given Capo class, with boilerplate built-in
   *
   * @remarks
   *
   * You may wish to provide an overridden setupActors() method, to arrange actor
   * names that fit your project's user-roles / profiles.
   *
   * You may also wish to add methods that satisfy some of your application's key
   * use-cases in simple predefined ways, so that your automated tests can re-use
   * the logic and syntax instead of repeating them in multiple test-cases.
   *
   * @param s - your Capo class that extends DefaultCapo
   * @typeParam DC - no need to specify it; it's inferred from your parameter
   * @public
   **/
  static forCapoClass(s) {
    class specificCapoHelper extends DefaultCapoTestHelper {
      get stellarClass() {
        return s;
      }
    }
    return specificCapoHelper;
  }
  //@ts-expect-error
  get stellarClass() {
    return DefaultCapo;
  }
  //!!! todo: create type-safe ActorMap helper hasActors(), on same pattern as hasRequirements
  async setupActors() {
    this.addActor("tina", 1100n * ADA);
    this.addActor("tracy", 13n * ADA);
    this.addActor("tom", 120n * ADA);
    return this.setActor("tina");
  }
  async mkCharterSpendTx() {
    await this.mintCharterToken();
    const treasury = await this.strella;
    const tcx = new StellarTxnContext(this.currentActor);
    const tcx2 = await treasury.txnAttachScriptOrRefScript(
      await treasury.txnAddGovAuthority(tcx),
      treasury.compiledScript
    );
    return treasury.txnMustUseCharterUtxo(
      tcx2,
      treasury.activityUsingAuthority()
    );
  }
  mkDefaultCharterArgs() {
    const addr = this.currentActor.address;
    console.log("test helper charter -> actor addr", addr.toBech32());
    return {
      govAuthorityLink: {
        strategyName: "address",
        config: {
          addrHint: [addr]
        }
      },
      mintDelegateLink: {
        strategyName: "default"
      },
      spendDelegateLink: {
        strategyName: "default"
      },
      mintInvariants: [],
      spendInvariants: []
    };
  }
  async mintCharterToken(args) {
    this.actors;
    if (this.state.mintedCharterToken) {
      console.warn(
        "reusing minted charter from existing testing-context"
      );
      return this.state.mintedCharterToken;
    }
    if (!this.strella)
      await this.initialize();
    const script = await this.strella;
    const goodArgs = args || this.mkDefaultCharterArgs();
    const tcx = await script.mkTxnMintCharterToken(goodArgs);
    const rawConfig = this.state.rawConfig = this.state.config = tcx.state.bootstrappedConfig;
    this.state.parsedConfig = this.stellarClass.parseConfig(rawConfig);
    expect(script.network).toBe(this.network);
    await script.submit(tcx);
    console.log(
      `----- charter token minted at slot ${this.network.currentSlot}`
    );
    this.network.tick(1n);
    await script.submitAddlTxns(tcx, ({
      txName,
      description
    }) => {
      this.network.tick(1n);
      console.log(
        `           ------- submitting addl txn ${txName} at slot ${this.network.currentSlot}:`
      );
    });
    this.network.tick(1n);
    this.state.mintedCharterToken = tcx;
    return tcx;
  }
  async updateCharter(args) {
    await this.mintCharterToken();
    const treasury = await this.strella;
    const { signers } = this.state;
    const tcx = await treasury.mkTxnUpdateCharter(args);
    return treasury.submit(tcx, { signers }).then(() => {
      this.network.tick(1n);
      return tcx;
    });
  }
  async updateSettings(args) {
    await this.mintCharterToken();
    const capo = this.strella;
    const tcx = await capo.mkTxnUpdateOnchainSettings(args);
    return capo.submit(tcx).then(() => {
      this.network.tick(1n);
      return tcx;
    });
  }
}

const insufficientInputError = /(need .* lovelace, but only have|transaction doesn't have enough inputs)/;
Error.stackTraceLimit = 100;

export { ADA, Activity, AnyAddressAuthorityPolicy, AuthorityPolicy, BasicMintDelegate, Capo, CapoMinter, CapoTestHelper, DatumAdapter, DefaultCapo, DefaultCapoTestHelper, StellarContract, StellarDelegate, StellarTestHelper, StellarTxnContext, UutName, addTestContext, addrAsString, assetsAsString, byteArrayAsString, byteArrayListAsString, datum, datumAsString, defineRole, delegateRoles, dumpAny, errorMapAsString, hasReqts, heliosRollupLoader, hexToPrintableString, insufficientInputError, lovelaceToAda, mergesInheritedReqts, mkHeliosModule, mkUutValuesEntries, mkValuesEntry, partialTxn, policyIdAsString, stringToNumberArray, txAsString, txInputAsString, txOutputAsString, txOutputIdAsString, txidAsString, txn, utxoAsString, utxosAsString, valueAsString };
//# sourceMappingURL=stellar-contracts.mjs.map
