import * as helios from '@hyperionbt/helios';
import { Tx, TxOutput, Value, Address, textToBytes, Assets, ConstrData, AssetClass, MintingPolicyHash, TxInput, WalletHelper, Program, NetworkParams, Crypto, NetworkEmulator, bytesToHex, bytesToText, Datum, TxId, ValidatorHash, Option } from '@hyperionbt/helios';
import { expect } from 'vitest';

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
  return assets.map(([policyId, tokenEntries]) => {
    const pIdHex = policyId.hex;
    const tokenString = tokenEntries.map(
      ([nameBytes, count]) => {
        const nameString = hexToPrintableString(nameBytes.hex);
        return `${count}\xD7\u{1F4B4} ${nameString}`;
      }
    ).join(" + ");
    return `\u2991\u{1F3E6} ${pIdHex.slice(0, 8)}\u2026${pIdHex.slice(
      -4
    )} ${tokenString}\u2992`;
  }).join("\n  ");
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
      item = ` \u2747\uFE0F  ${assetsAsString(item)}`;
    }
    if ("outputs" == x) {
      item = `
  ${item.map((x2, i) => txOutputAsString(x2, `${i}  <-`)).join("\n  ")}`;
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
        const indexInfo = x2.inputIndex == -1 ? `spend txin #\u2039tbd\u203A` : "inputIndex" in x2 ? `spend txin #${1 + x2.inputIndex}` : `mint policy#${1 + x2.mphIndex}`;
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
          return `\u{1F3E6} ${mph.slice(0, 8)}\u2026${mph.slice(-4)} (minting)`;
        } catch (e) {
          const vh = s.validatorHash.hex;
          const addr = Address.fromHash(s.validatorHash);
          return `\u{1F4DC} ${vh.slice(0, 8)}\u2026${vh.slice(
            -4
          )} (validator at ${addrAsString(addr)})`;
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
  const oid = x.outputId.txId.hex;
  const oidx = x.outputId.utxoIdx;
  return `${prefix}${addrAsString(x.address)} ${valueAsString(
    x.value
  )} = \u{1F4D6} ${oid.slice(0, 6)}\u2026${oid.slice(-4)}#${oidx}`;
}
function utxosAsString(utxos, joiner = "\n") {
  return utxos.map((u) => utxoAsString(u, " \u{1F4B5}")).join(joiner);
}
function utxoAsString(x, prefix = "\u{1F4B5}") {
  const oid = x.outputId.txId.hex;
  const oidx = x.outputId.utxoIdx;
  return ` \u{1F4D6} ${oid.slice(0, 6)}\u2026${oid.slice(-4)}#${oidx}: ${txOutputAsString(
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
    return `d\u2039inline:${dhss}\u203A`;
  return `d\u2039hash:${dhss}\u2026\u203A`;
}
function txOutputAsString(x, prefix = "<-") {
  return `${prefix} ${addrAsString(x.address)} ${datumAsString(
    x.datum
  )} ${valueAsString(x.value)}`;
}
function addrAsString(address) {
  const bech32 = address.bech32 || address.toBech32();
  return `${bech32.slice(0, 14)}\u2026${bech32.slice(-4)}`;
}
function errorMapAsString(em, prefix = "  ") {
  return Object.keys(em).map((k) => `in field ${prefix}${k}: ${JSON.stringify(em[k])}`).join("\n");
}
function dumpAny(x) {
  if (x instanceof Tx) {
    return txAsString(x);
  }
  if (x instanceof TxOutput) {
    return txOutputAsString(x);
  }
  if (x instanceof Value) {
    return valueAsString(x);
  }
  if (x instanceof Address) {
    return addrAsString(x);
  }
  if (x instanceof StellarTxnContext) {
    return txAsString(x.tx);
  }
}
if ("undefined" == typeof window) {
  globalThis.peek = dumpAny;
} else {
  window.peek = dumpAny;
}

//!!! if we could access the inputs and outputs in a building Tx,
class StellarTxnContext {
  tx = new Tx();
  inputs = [];
  collateral;
  outputs = [];
  feeLimit;
  state;
  actor;
  neededSigners = [];
  constructor(actor, state = {}) {
    this.actor = actor;
    this.state = state;
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
   * The factory function should follow an active-verb convention by including "ing" in the name of the factory function
   * @public
   **/
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
  constructor(args) {
    const { setup, config, partialConfig } = args;
    this.setup = setup;
    const { network, networkParams, isTest, myActor } = setup;
    this.network = network;
    this.networkParams = networkParams;
    if (myActor)
      this.myActor = myActor;
    if (config) {
      this.configIn = config;
      const fullScriptParams = this.contractParams = this.getContractScriptParams(config);
      this.scriptProgram = this.loadProgramScript(fullScriptParams);
    } else {
      this.partialConfig = partialConfig;
      this.scriptProgram = this.loadProgramScript();
    }
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
  addStrellaWithConfig(TargetClass, config) {
    const args = {
      config,
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
      if ("StructStatement" == Object.getPrototypeOf(statement).constructor.name) {
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
   * returns the on-chain type for datum
   * @remarks
   *
   * returns the on-chain enum used for attaching data (or data hashes) to contract utxos
   * the returned type (and its enum variants) are suitable for off-chain txn-creation
   * override `get scriptDatumName()` if needed to match your contract script.
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
   * returns the on-chain type for activites ("redeemers")
   * @remarks
   *
   * returns the on-chain enum used for spending contract utxos or for different use-cases of minting (in a minting script).
   * the returned type (and its enum variants) are suitable for off-chain txn-creation
   * override `get onChainActivitiesName()` if needed to match your contract script.
   * @public
   **/
  get onChainActivitiesType() {
    const { scriptActivitiesName: onChainActivitiesName } = this;
    const { [onChainActivitiesName]: ActivitiesType } = this.scriptProgram.types;
    return ActivitiesType;
  }
  mustGetActivity(activityName) {
    const { [activityName]: activityType } = this.onChainActivitiesType;
    if (!activityType) {
      const { scriptActivitiesName: onChainActivitiesName } = this;
      throw new Error(
        `$${this.constructor.name}: activity name mismatch ${onChainActivitiesName}::${activityName}''
   known activities in this script: ${Object.keys(
          this.onChainActivitiesType
        ).join(", ")}`
      );
    }
    return activityType;
  }
  async readDatum(datumName, datum2) {
    const thisDatumType = this.onChainDatumType[datumName];
    if (!thisDatumType)
      throw new Error(`invalid datumName ${datumName}`);
    if (!datum2.isInline())
      throw new Error(
        `datum must be an InlineDatum to be readable using readDatum()`
      );
    return this.readUplcDatum(thisDatumType, datum2.data).catch((e) => {
      if (e.message?.match(/expected constrData/))
        return void 0;
      throw e;
    });
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
            console.warn("error parsing nested data inside enum variant", { fn, fieldType, fieldData });
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
  mkMinTv(mph, tn, count = 1n) {
    return this.mkMinAssetValue(
      new AssetClass([mph, stringToNumberArray(tn.toString())]),
      count
    );
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
    signers = []
  } = {}) {
    let { tx, feeLimit = 2000000n } = tcx;
    const { myActor: wallet } = this;
    if (wallet || signers.length) {
      const [changeAddress] = await this.myActor?.usedAddresses || [];
      const spares = await this.findAnySpareUtxos(tcx);
      const willSign = [...signers, ...tcx.neededSigners];
      const wHelper = wallet && new WalletHelper(wallet);
      if (wallet && wHelper) {
        if (tx.isSmart() && !tcx.collateral) {
          let [c] = await wallet.collateral;
          if (!c) {
            c = await wHelper.pickCollateral(this.ADA(5n));
            if (c.value.lovelace > this.ADA(20n))
              throw new Error(
                `The only collateral-eligible utxos in this wallet have more than 20 ADA.  It's recommended to create and maintain collateral values between 2 and 20 ADA (or 5 and 20, for more complex txns)`
              );
          }
          tcx.addCollateral(c);
        }
      }
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
        console.log("FAILED submitting:", tcx.dump());
        debugger;
        throw e;
      }
      if (wallet && wHelper) {
        let actorMustSign = false;
        for (const a of willSign) {
          if (!await wHelper.isOwnAddress(a))
            continue;
          actorMustSign = true;
        }
        if (actorMustSign) {
          const sigs = await wallet.signTx(tx);
          //! doesn't need to re-verify a sig it just collected
          tx.addSignatures(sigs, false);
        }
      }
    } else {
      console.warn("no 'myActor'; not finalizing");
    }
    console.log("Submitting tx: ", tcx.dump());
    const promises = [
      this.network.submitTx(tx)
    ];
    if (wallet) {
      if (!this.setup.isTest)
        promises.push(wallet.submitTx(tx));
    }
    return Promise.all(promises);
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
      if (params)
        script.parameters = params;
      const simplify = this.setup.optimize || !this.setup.isTest && !this.setup.isDev;
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
      t.message = e.message + addlErrorText;
      t.stack = `${e.message}
    at ${moduleName} (${srcFile}:${1 + sl}:${1 + sc})
` + modifiedStack;
      throw t;
    }
  }
  get missingActorError() {
    return `Wallet not connected to Stellar Contract '${this.constructor.name}'`;
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
  async mustFindUtxo(semanticName, predicate, { address, wallet, exceptInTcx }, extraErrorHint = "") {
    const found = await this.hasUtxo(semanticName, predicate, {
      address,
      wallet,
      exceptInTcx
    });
    if (!found) {
      const where = address ? "address" : "connected wallet";
      throw new Error(
        `${this.constructor.name}: '${semanticName}' utxo not found (${extraErrorHint}) in ${where}`
      );
    }
    return found;
  }
  toUtxoId(u) {
    return `${u.outputId.txId.hex}@${u.outputId.utxoIdx}`;
  }
  async hasUtxo(semanticName, predicate, { address, wallet, exceptInTcx }) {
    const utxos = address ? await this.network.getUtxos(address) : await wallet.utxos;
    const collateral = wallet ? await wallet.collateral : [];
    const notCollateral = utxos.filter(
      (u) => !collateral.find((c) => c.eq(u))
    );
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
__decorateClass$6([
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
    this.actorName = "";
    this.setupActors();
    if (!this.actorName)
      throw new Error(
        `${this.constructor.name} doesn't set currentActor in setupActors()`
      );
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
    } else {
      console.log(
        " - Test helper bootstrapping (will emit details to onInstanceCreated())"
      );
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
  //!!! reconnect tests to tcx-based config-capture
  // onInstanceCreated: async (config: ConfigFor<SC>) => {
  //     this.config = config
  //     return {
  //         evidence: this,
  //         id: "empheral",
  //         scope: "unit test"
  //     }
  // }
  initStrella(TargetClass, config) {
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
    return new TargetClass(cfg);
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
    this.network.createUtxo(a, 5n * ADA);
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
    config
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
      console.log(
        `  ---  new test helper setup with new seed (was ${this.randomSeed}, now ${randomSeed})...
` + new Error("stack").stack.split("\n").slice(1).filter(
          (line) => !line.match(/node_modules/) && !line.match(/node:internal/)
        ).join("\n")
      );
    this.randomSeed = randomSeed;
    this.state.mintedCharterToken = void 0;
    //! when there's not a preset config, it leaves the detailed setup to be done just-in-time
    if (!config)
      return this.strella = this.initStrella(this.stellarClass);
    const strella = this.initStrella(this.stellarClass, config);
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
  async bootstrap(args) {
    let strella = this.strella || await this.initialize();
    await this.mintCharterToken(args);
    return strella;
  }
}

const code$9 = new String("spending Capo\n\n// needed in helios 0.13: defaults\nconst mph : MintingPolicyHash = MintingPolicyHash::new(#1234)\nconst rev : Int = 1\n\nimport {\n    tvCharter\n} from CapoHelpers\n\nimport { \n    RelativeDelegateLink,\n    requiresValidDelegateOutput\n} from CapoDelegateHelpers\n\nimport {\n    mkTv,\n    didSign,\n    didSignInCtx\n} from StellarHeliosHelpers\n\nimport { Datum, Activity } from specializedCapo\n\n/**\n * \n */\nfunc requiresAuthorization(ctx: ScriptContext, datum: Datum) -> Bool {\n    Datum::CharterToken{\n        govDelegateLink, _\n    } = datum;\n\n    requiresValidDelegateOutput(govDelegateLink, mph, ctx)\n}\n\nfunc getCharterOutput(tx: Tx) -> TxOutput {\n    charterTokenValue : Value = Value::new(\n        AssetClass::new(mph, \"charter\".encode_utf8()), \n        1\n    );\n    tx.outputs.find_safe(\n        (txo : TxOutput) -> Bool {\n            txo.value >= charterTokenValue\n        }\n    ).switch{\n        None => error(\"this could only happen if the charter token is burned.\"),\n        Some{o} => o\n    }\n}\n\nfunc notUpdatingCharter(activity: Activity) -> Bool { activity.switch {\n    updatingCharter => false,  \n    _ => true\n}}\n\nfunc preventCharterChange(ctx: ScriptContext, datum: Datum::CharterToken) -> Bool {\n    tx: Tx = ctx.tx;\n\n    charterOutput : TxOutput = getCharterOutput(tx);\n\n    cvh : ValidatorHash = ctx.get_current_validator_hash();\n    myself : Credential = Credential::new_validator(cvh);\n    if (charterOutput.address.credential != myself) {\n        error(\"charter token must be returned to the contract \")\n        // actual : String = charterOutput.address.credential.switch{\n        //     PubKey{pkh} => \"pkh:🔑#\" + pkh.show(),\n        //     Validator{vh} => \"val:📜#:\" + vh.show()\n        // };\n        // error(\n        //     \"charter token must be returned to the contract \" + cvh.show() +\n        //     \"... but was sent to \" +actual\n        // )\n    };\n\n    Datum::CharterToken{\n        govDelegate,\n        mintDelegate\n    } = datum;\n    Datum::CharterToken{\n        newGovDelegate,\n        newMintDelegate\n    } = Datum::from_data( \n        charterOutput.datum.get_inline_data() \n    );\n    if ( !(\n        newGovDelegate == govDelegate &&\n        newMintDelegate == mintDelegate\n    )) { \n        error(\"invalid update to charter settings\") \n    };\n\n    true\n}\n\nfunc main(datum: Datum, activity: Activity, ctx: ScriptContext) -> Bool {\n    tx: Tx = ctx.tx;\n    // now: Time = tx.time_range.start;\n    \n    allDatumSpecificChecks: Bool = datum.switch {\n        ctd : CharterToken => {\n            // throws if bad\n            if(notUpdatingCharter(activity)) { \n                preventCharterChange(ctx, ctd)\n            } else {\n                true // \"maybe\", really\n            }\n        },\n        _ => {\n            activity.switch {\n                spendingDatum => datum.validateSpend(ctx, mph),\n                _ => true\n            }\n        }            \n    };\n    allActivitySpecificChecks : Bool = activity.switch {\n        updatingCharter => {\n            charterOutput : TxOutput = getCharterOutput(tx);\n            newDatum = Datum::from_data( \n                charterOutput.datum.get_inline_data() \n            );\n            Datum::CharterToken{govDelegate, mintDelegate} = newDatum;\n\n            requiresValidDelegateOutput(govDelegate, mph, ctx) &&\n            requiresValidDelegateOutput(mintDelegate, mph, ctx) &&\n            requiresAuthorization(ctx, datum)\n        },\n        usingAuthority => {\n            // by definition, we're truly notUpdatingCharter(activity) \n            datum.switch {\n                 // throws if bad\n                ctd : CharterToken => requiresAuthorization(ctx, ctd),\n                _ => error(\"wrong use of usingAuthority action for non-CharterToken datum\")\n            }\n        },\n        _ => activity.allowActivity(datum, ctx, mph)\n    };\n\n    assert(allDatumSpecificChecks, \"datum-check fail\");\n    assert(allActivitySpecificChecks, \"redeeemer-check fail\");\n\n    //! retains mph in parameterization\n    assert(\n        ( allDatumSpecificChecks && allActivitySpecificChecks ) ||\n            // this should never execute (much less fail), yet it also shouldn't be optimized out.\n             mph.serialize() /* never */ == datum.serialize(), \n        \"unreachable\"\n    ); \n\n    allDatumSpecificChecks && \n    allActivitySpecificChecks &&\n    tx.serialize() != datum.serialize()\n}\n");

code$9.srcFile = "src/DefaultCapo.hl";
code$9.purpose = "spending";
code$9.moduleName = "Capo";

const code$8 = new String("minting DefaultMinter \n\nimport { \n    hasSeedUtxo, \n    mkUutTnFactory,\n    validateUutMinting, \n    Activity\n} from CapoMintHelpers\n\nimport {mkTv} from StellarHeliosHelpers\n\nimport {\n    requiresValidDelegateOutput\n} from CapoDelegateHelpers\n\n//!!!! todo: change to TxOutputId, rolling up these two things:\nconst seedTxn : TxId = TxId::new(#1234)\nconst seedIndex : Int = 42\n\n\nfunc hasContractSeedUtxo(tx: Tx) -> Bool {\n    hasSeedUtxo(tx, seedTxn, seedIndex\n        // , \"charter\"\n    )\n}\n\nfunc main(r : Activity, ctx: ScriptContext) -> Bool {\n    tx: Tx = ctx.tx;\n    mph: MintingPolicyHash = ctx.get_current_minting_policy_hash();\n    value_minted: Value = tx.minted;\n\n    ok : Bool = r.switch {\n        charter: mintingCharter => {       \n            charterVal : Value = mkTv(mph, \"charter\");\n            authTnBase : String = \"capoGov\";\n            mintDgtTnBase : String = \"mintDgt\";\n  \n\n            assert(value_minted >= charterVal,\n                \"charter token not minted\");\n\n            hasContractSeedUtxo(tx) &&\n            validateUutMinting(\n                ctx: ctx, \n                seedTxId: seedTxn, \n                seedIdx: seedIndex, \n                purposes: []String{authTnBase, mintDgtTnBase}, \n                mkTokenName: mkUutTnFactory(seedTxn, seedIndex),\n                bootstrapCharter: charterVal\n            ) &&\n            tx.outputs.all( (output: TxOutput) -> Bool {\n                output.value != value_minted || (\n                    output.value == value_minted &&\n                    output.address == charter.owner\n                )\n            })\n        },\n\n        mintingUuts{sTxId, sIdx, purposes} => validateUutMinting(\n            ctx: ctx, \n            seedTxId: sTxId, \n            seedIdx: sIdx, \n            purposes: purposes,\n            mkTokenName: r.uutTnFactory()\n        ),\n        _ => true\n    };\n\n    // print(\"defaultMinter: minting value: \" + value_minted.show());\n\n    ok\n}\n\n");

code$8.srcFile = "src/minting/DefaultMinter.hl";
code$8.purpose = "minting";
code$8.moduleName = "DefaultMinter";

const code$7 = new String("module StellarHeliosHelpers\n\nfunc didSign(ctx : ScriptContext, a: Address) -> Bool {\n    tx : Tx = ctx.tx;\n\n    pkh : PubKeyHash = a.credential.switch{\n        PubKey{h} => h,\n        _ => error(\"trustee can't be a contract\")\n    };\n    // print(\"checking if trustee signed: \" + pkh.show());\n\n    tx.is_signed_by(pkh)\n}\n\nfunc didSignInCtx(ctx: ScriptContext) -> (a: Address) -> Bool {\n    (a : Address) -> Bool {\n        didSign(ctx, a)\n    }\n}\n\n//! represents the indicated token name as a Value\nfunc mkTv(mph: MintingPolicyHash, tn: String, count : Int = 1) -> Value {\n    Value::new(\n        AssetClass::new(mph, tn.encode_utf8()), \n        count\n    )\n}\n\n//! returns the charter-token from our minter, as a Value\nfunc tvCharter(mph: MintingPolicyHash)  -> Value {\n    mkTv(mph, \"charter\")\n}\n\nfunc returnsValueToScript(value : Value, ctx : ScriptContext) -> Bool {\n    input : TxInput = ctx.get_current_input();\n    input.value.contains(value) &&\n    ctx.tx.outputs.any( (txo : TxOutput) -> Bool {\n        txo.address == input.address &&\n        txo.value.contains(value)\n    } )\n}\n\n\nfunc getOutputWithValue(ctx: ScriptContext, v : Value) -> TxOutput {\n    ctx.tx.outputs.find((txo: TxOutput) -> { txo.value >= v })\n}\n\nfunc getSingleAssetValue(input: TxInput) -> Value{\n    inputMap : Map[MintingPolicyHash]Map[ByteArray]Int = input.value.get_assets().to_map();\n    assert( inputMap.length == 1, \"getSingleAssetValue needs single-asset input\");\n\n    inputTokens : Map[ByteArray]Int = inputMap.head_value;\n    assert(inputTokens.length == 1, \"getSingleAssetValue needs single-token input\");\n\n    input.value.get_assets()\n}\n\nfunc outputDatum[T](newTxo : TxOutput) -> T {\n    T::from_data(newTxo.datum.get_inline_data())\n}\n\nfunc getOutputForInput(ctx: ScriptContext, input: TxInput) -> TxOutput {\n    inputValue : Value = getSingleAssetValue(input);\n\n    getOutputWithValue(ctx, inputValue)\n}");

code$7.srcFile = "src/StellarHeliosHelpers.hl";
code$7.purpose = "module";
code$7.moduleName = "StellarHeliosHelpers";

const code$6 = new String("module CapoMintHelpers\nimport {\n    mkTv,\n    tvCharter\n} from StellarHeliosHelpers\n\nimport {\n    getRefCharterDatum\n} from CapoHelpers\n\nimport {\n    Datum, Activity as CapoActivity\n} from specializedCapo\n\nimport {\n    RelativeDelegateLink,\n    requiresDelegateAuthorizing\n} from CapoDelegateHelpers\n\nfunc hasSeedUtxo(tx: Tx, seedTxId : TxId, seedIdx: Int\n    // , reason: String\n) -> Bool {\n    seedUtxo: TxOutputId = TxOutputId::new(\n        seedTxId,\n        seedIdx\n    );\n    assert(tx.inputs.any( (input: TxInput) -> Bool {\n        input.output_id == seedUtxo\n    }),  \"seed utxo required for minting \"\n        // +reason \n        // + \"\\n\"+seedTxId.show() + \" : \" + seedIdx.show()\n    );\n\n    true\n}\n\n//! pre-computes the hash-based suffix for a token name, returning\n//  a function that makes Uut names with any given purpose, given the seed-txn details\nfunc mkUutTnFactory(\n    seedTxId : TxId, seedIdx : Int\n) -> (String) -> String {\n\n    idxBytes : ByteArray = seedIdx.bound_max(255).serialize();\n    // assert(idxBytes.length == 1, \"surprise!\");\n\n    //! yuck: un-CBOR...\n    rawTxId : ByteArray = seedTxId.serialize().slice(5,37);\n\n    txoId : ByteArray = (rawTxId + \"@\".encode_utf8() + idxBytes);\n    assert(txoId.length == 34, \"txId + @ + int should be length 34\");\n    // print( \"******** txoId \" + txoId.show());\n\n    miniHash : ByteArray = txoId.blake2b().slice(0,6);\n    // assert(miniHash.length == 6, \"urgh.  slice 5? expected 12, got \"+ miniHash.length.show());\n\n    mhs: String = miniHash.show();\n    (p: String) -> String {\n        p + \"-\" + mhs\n    }\n}\n\nfunc validateUutMinting(\n    ctx: ScriptContext, \n    seedTxId : TxId, seedIdx : Int, \n    purposes: []String, \n    mkTokenName: (String) -> String,\n    bootstrapCharter:Value = Value::new(AssetClass::ADA, 0)\n) -> Bool {\n    tx: Tx = ctx.tx;\n    mph: MintingPolicyHash = ctx.get_current_minting_policy_hash();\n\n    isBootstrapping : Bool = !( bootstrapCharter.is_zero() );\n    delegateApproval : Bool = if ( isBootstrapping ) { \n        true \n    } else {\n        // not bootstrapping; must honor the mintDelegate's authority\n        Datum::CharterToken {\n            _, mintDgt\n        } = getRefCharterDatum(ctx, mph);\n\n        //!!! todo: add explicit activity details in authorization\n        requiresDelegateAuthorizing(\n            mintDgt, \n            mph, \n            ctx\n        )\n    };\n\n    valueMinted: Value = tx.minted;\n\n    // idxBytes : ByteArray = seedIdx.bound_max(255).serialize();\n    // // assert(idxBytes.length == 1, \"surprise!\");\n\n    // //! yuck: un-CBOR...\n    // rawTxId : ByteArray = seedTxId.serialize().slice(5,37);\n\n    // txoId : ByteArray = (rawTxId + \"@\".encode_utf8() + idxBytes);\n    // assert(txoId.length == 34, \"txId + @ + int should be length 34\");\n    // // print( \"******** txoId \" + txoId.show());\n\n    // miniHash : ByteArray = txoId.blake2b().slice(0,6);\n    // // assert(miniHash.length == 6, \"urgh.  slice 5? expected 12, got \"+ miniHash.length.show());\n\n    // tokenName1 = purpose + \".\" + miniHash.show();\n\n    expectedValue : Value = Value::sum(purposes.sort((a:String, b:String) -> Bool { a == b }).map(\n        (purpose: String) -> Value {\n            mkTv(mph, mkTokenName(purpose))\n        }\n    )) + bootstrapCharter;\n    // expectedMint : Map[ByteArray]Int = expectedValue.get_policy(mph);\n    actualMint : Map[ByteArray]Int = valueMinted.get_policy(mph);\n    // actualMint.for_each( (b : ByteArray, i: Int) -> {\n    //     print( \"actual: \" + b.show() + \" \" + i.show() )\n    // });\n\n    // print(\"activity\" + seedTxId.show() + \" \" + seedIdx.show() + \" asset \" + assetName.show());\n    // expectedMint.for_each( (b : ByteArray, i: Int) -> {\n    //     print( \"expected: \" + b.show() + \" \" + i.show() )\n    // });\n    temp : []ByteArray = actualMint.fold( (l: []ByteArray, b : ByteArray, i: Int) -> {\n        l.find_safe((x : ByteArray) -> Bool { x == b }).switch{\n            None => l.prepend(b),\n            Some /*{x}*/ => error(\"UUT duplicate purpose \"\n                // +  x.decode_utf8()\n            )\n        }\n    }, []ByteArray{});\n    assert(temp == temp, \"prevent unused var\");\n\n\n    expectationsMet : Bool = valueMinted  == expectedValue;\n\n    assert(expectationsMet, \"bad UUT mint has mismatch\"\n        // +\";\\n   ... expected \"+ expectedValue.show()+\n        // \"   ... actual \"+ valueMinted.show()+\n        // \"   ... diff = \\n\" + (expectedValue - valueMinted).show()\n    );\n\n    delegateApproval && expectationsMet &&\n    hasSeedUtxo(tx, seedTxId, seedIdx\n        //, \"UUT \"+purposes.join(\"+\")\n    )\n}\n\nenum\n Activity { \n    mintingCharter\n     {\n        owner: Address\n\n        // we don't have a responsiblity to enforce delivery to the right location\n        // govAuthority: RelativeDelegateLink   // not needed \n    }\n    mintingUuts {\n        seedTxn: TxId\n        seedIndex: Int\n        purposes: []String\n    }\n\n    func tvForPurpose(self, ctx: ScriptContext, purpose: String) -> Value {\n        mph : MintingPolicyHash = ctx.get_current_minting_policy_hash();\n        \n        mkTv(mph, self.uutTnFactory()(purpose))\n    }\n\n    func uutTnFactory(self) -> (String) -> String {\n        self.switch{\n            mintingUuts{MUseedTxn, MUseedIndex, _} => {\n                mkUutTnFactory(MUseedTxn, MUseedIndex)\n            },\n            // mintingCharter => {\n            //     mkUutTnFactory(seedTxn, seedIndex)\n            // },\n            _ => error(\"uutTnFactory called on unsupported Activity/redeemer variant\")\n        } \n    }\n}\n");

code$6.srcFile = "src/CapoMintHelpers.hl";
code$6.purpose = "module";
code$6.moduleName = "CapoMintHelpers";

const CapoMintHelpers = code$6;

const code$5 = new String("module CapoDelegateHelpers\n\nimport {\n    mkTv\n} from StellarHeliosHelpers\n\n// Delegates can define addtional activities in their enum variants,\n// but these 4 basic activities are essential.\nenum BASE_DELEGATE_Activity {\n    Authorizing\n    Reassigning\n    Retiring\n    Modifying\n}\n\nstruct RelativeDelegateLink {\n    uutName: String\n    strategyName: String\n    delegateValidator: Option[ValidatorHash]\n\n    // config: Data\n}\n\nstruct DelegationDetail {\n    capoAddr: Address\n    mph: MintingPolicyHash\n    tn: ByteArray\n}\n\n// Delegates can define additional Datum in their enums,\n// but this first Datum is essential\nenum BASE_DELEGATE_Datum {\n    IsDelegation {\n        dd: DelegationDetail\n        CustomConfig: Data\n    }\n}\n\n//!!! call with existing delegate Datum.serialize()\nfunc unmodifiedDelegation(oldDD : ByteArray, ctx: ScriptContext) -> Bool {\n    o : []TxOutput = ctx.get_cont_outputs();\n    //    print(\"::::::::::::::::::::::::::::::::: hi \"+o.head.datum.get_inline_data().serialize().show());\n    assert(o.head.datum.get_inline_data().serialize() == oldDD,\n        \"delegation datum must not be modified\"\n    );\n    true\n    // MintDelegateDatum::IsDelegation{\n    //     ddNew, _\n    // } = MintDelegateDatum::from_data( \n        \n    // );\n\n    //! the datum must be unchanged.\n    // ddNew == dd \n}\n\n/**\n * returns the AssetClass for the authority token found in the given DelegationDetail struct\n */\nfunc acAuthorityToken(dd: DelegationDetail) -> AssetClass {\n    AssetClass::new(dd.mph, dd.tn)\n}\n\n/**\n * returns a Value for the authority-token found in the given DelegationDetail struct\n */\n func tvAuthorityToken(dd: DelegationDetail) -> Value {\n    Value::new(\n        acAuthorityToken(dd), 1\n    )\n}\n\nfunc requiresValidDelegateOutput(\n    dd: RelativeDelegateLink, \n    mph: MintingPolicyHash, \n    ctx : ScriptContext\n) -> Bool {\n    RelativeDelegateLink{\n        uut, strategy,\n        validatorHash\n    } = dd;\n    if (strategy.encode_utf8().length < 4) {\n        error(\"strategy too short\")\n        // error(\"strategy must be at least 4 bytes, got: '\"+strategy +\n        //     \"' = \"+ strategy.encode_utf8().length.show()\n        // )\n    };\n\n    v : Value = mkTv(mph, uut);\n    validatorHash.switch{\n        Some{vh} => {\n            if (ctx.tx.value_locked_by(vh).contains(v)) {\n                true \n            } else { \n                error(\"invalid delegate / missing uut output: \"+ uut + \" to validator \" +vh.show()) \n            }\n        },\n        None =>\n\n        ctx.tx.outputs.find_safe((o : TxOutput) -> Bool {\n            o.value.contains(v)\n        }).switch{\n            Some => true, \n            None => error(\"invalid delegate or missing uut \" + uut)\n        }\n    }\n}\n\n\nfunc requiresDelegateAuthorizing(\n    dd: RelativeDelegateLink, \n    mph: MintingPolicyHash, \n    ctx : ScriptContext\n) -> Bool {\n    authzVal : Value = Value::new(AssetClass::new(mph, dd.uutName.encode_utf8()), 1);\n    print(\"finding: \" + authzVal.show());\n    targetId : TxOutputId = ctx.tx.inputs.find_safe((i: TxInput) -> {\n        // print(\"   ?  in \"+i.value.show());\n        i.value.contains(authzVal) // find my authority token\n    }).switch{\n        Some{x} => x.output_id,\n        None => error(\"missing required delegate UUT \"+dd.uutName)\n     };\n    print (\"found\");\n    k : ScriptPurpose = ctx.tx.redeemers.find_key( \n        (purpose : ScriptPurpose) -> { purpose.switch{ \n            sp: Spending => {\n                // print (\"oid: \" + sp.output_id.show());\n                sp.output_id == targetId\n            }, \n            _ => false \n        } }\n    );\n    // r : Data = ctx.tx.redeemers.get(  // index redeemers by...\n    //     ScriptPurpose::new_spending(  // [spending, plus ...\n    //     );\n        \n        print(\"hi there\");\n    isAuthorizing : Bool = ctx.tx.redeemers.get(k).switch {\n        (index: Int, fields: []Data) => {\n            // a: BASE_DELEGATE_Activity => a.switch {\n            //     Authorizing => true,\n            if (index == 0 && fields.length == 0) { true } else {\n                error(\"authz token not spent with Authorizing activity!\")\n            }\n        },\n        _ => error(\"authz token not spent with Authorizing activity!\")\n    };\n\n    isAuthorizing && requiresValidDelegateOutput(dd, mph, ctx)\n}\n");

code$5.srcFile = "src/delegation/CapoDelegateHelpers.hl";
code$5.purpose = "module";
code$5.moduleName = "CapoDelegateHelpers";

const CapoDelegateHelpers = code$5;

const _uutName = Symbol("uutName");
const maxUutName = 32;
class UutName {
  [_uutName];
  purpose;
  constructor(purpose, fullUutName) {
    this.purpose = purpose;
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
class DefaultMinter extends StellarContract {
  contractSource() {
    return code$8;
  }
  getContractScriptParams(config) {
    const { seedIndex, seedTxn } = config;
    return { seedIndex, seedTxn };
  }
  importModules() {
    return [
      //prettier-ignore
      code$7,
      CapoDelegateHelpers,
      CapoMintHelpers,
      this.configIn.capo.specializedCapo,
      this.configIn.capo.capoHelpers
    ];
  }
  async txnWillMintUuts(tcx, uutPurposes, seedUtxo, roles = {}) {
    const { txId, utxoIdx } = seedUtxo.outputId;
    const { blake2b } = Crypto;
    const uutMap = Object.fromEntries(
      uutPurposes.map((uutPurpose) => {
        const txoId = txId.bytes.concat(["@".charCodeAt(0), utxoIdx]);
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
      tcx.state = {};
    if (tcx.state.uuts)
      throw new Error(`uuts are already there`);
    tcx.state.uuts = uutMap;
    return tcx;
  }
  async mkTxnMintingUuts(initialTcx, uutPurposes, seedUtxo, roles = {}) {
    const gettingSeed = seedUtxo ? Promise.resolve(seedUtxo) : new Promise((res) => {
      //!!! make it big enough to serve minUtxo for the new UUT(s)
      const uutSeed = this.mkValuePredicate(
        BigInt(42e3),
        initialTcx
      );
      this.mustFindActorUtxo(
        `seed-for-uut ${uutPurposes.join("+")}`,
        uutSeed,
        initialTcx
      ).then(res);
    });
    return gettingSeed.then(async (seedUtxo2) => {
      const tcx = await this.txnWillMintUuts(
        initialTcx,
        uutPurposes,
        seedUtxo2,
        roles
      );
      const vEntries = mkUutValuesEntries(tcx.state.uuts);
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
  //! overrides base getter type with undefined not being allowed
  get mintingPolicyHash() {
    return super.mintingPolicyHash;
  }
  mintingCharter({ owner }) {
    const { mintingCharter } = this.onChainActivitiesType;
    this.onChainTypes;
    const t = new mintingCharter(owner);
    return { redeemer: t._toUplcData() };
  }
  mintingUuts({
    seedTxn,
    seedIndex: sIdx,
    purposes
  }) {
    const seedIndex = BigInt(sIdx);
    console.log("UUT redeemer seedTxn", seedTxn.hex);
    const { mintingUuts } = this.onChainActivitiesType;
    const t = new mintingUuts(
      seedTxn,
      seedIndex,
      purposes
    );
    return { redeemer: t._toUplcData() };
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
    mintDgt
  }) {
    const charterVE = this.charterTokenAsValuesEntry;
    const capoGovVE = mkValuesEntry(capoGov.name, BigInt(1));
    const mintDgtVE = mkValuesEntry(mintDgt.name, BigInt(1));
    return tcx.mintTokens(
      this.mintingPolicyHash,
      [
        charterVE,
        capoGovVE,
        mintDgtVE
      ],
      this.mintingCharter({
        owner
      }).redeemer
    ).attachScript(this.compiledScript);
  }
}
__decorateClass$5([
  partialTxn
], DefaultMinter.prototype, "txnWillMintUuts", 1);
__decorateClass$5([
  txn
], DefaultMinter.prototype, "mkTxnMintingUuts", 1);
__decorateClass$5([
  Activity.redeemer
], DefaultMinter.prototype, "mintingCharter", 1);
__decorateClass$5([
  Activity.redeemer
], DefaultMinter.prototype, "mintingUuts", 1);
__decorateClass$5([
  Activity.partialTxn
], DefaultMinter.prototype, "txnMintingCharter", 1);

const TODO = Symbol("needs to be implemented");
function hasReqts(reqtsMap) {
  return reqtsMap;
}
hasReqts.TODO = TODO;

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
  verifyConfigs() {
    return this.verifyCoreDelegates();
  }
  get isConfigured() {
    if (!this.configIn)
      return Promise.resolve(false);
    if (this._verifyingConfigs)
      return this._verifyingConfigs;
    return Promise.resolve(true);
  }
  _verifyingConfigs;
  constructor(args) {
    super(args);
    const {
      scriptDatumName: onChainDatumName,
      scriptActivitiesName: onChainActivitiesName
    } = this;
    const { CharterToken } = this.onChainDatumType;
    const { updatingCharter, usingAuthority } = this.onChainActivitiesType;
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
      this._verifyingConfigs = this.verifyConfigs().then((r) => {
        this._verifyingConfigs = void 0;
        return r;
      });
    }
  }
  static bootstrapWith(args) {
    const { setup, config } = args;
    const Class = this;
    return new Class({ setup, config: { ...config, bootstrapping: true } });
  }
  // abstract txnMustUseCharterUtxo(
  //     tcx: StellarTxnContext,
  //     newDatum?: InlineDatum
  // ): Promise<TxInput | never>;
  get minterClass() {
    return DefaultMinter;
  }
  minter;
  txnWillMintUuts(initialTcx, uutPurposes, seedUtxo, roles = {}) {
    return this.minter.txnWillMintUuts(
      initialTcx,
      uutPurposes,
      seedUtxo,
      roles
    );
  }
  async mkTxnMintingUuts(initialTcx, uutPurposes, seedUtxo, roles = {}) {
    const tcx = await this.minter.mkTxnMintingUuts(
      initialTcx,
      uutPurposes,
      seedUtxo,
      roles
    );
    return tcx;
  }
  uutsValue(x) {
    const uutMap = x instanceof StellarTxnContext ? x.state.uuts : x instanceof UutName ? { single: x } : x;
    const vEntries = mkUutValuesEntries(uutMap);
    return new Value(
      void 0,
      new Assets([[this.mintingPolicyHash, vEntries]])
    );
  }
  usingAuthority() {
    const { usingAuthority } = this.onChainActivitiesType;
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
    return [code$7, CapoDelegateHelpers, CapoMintHelpers];
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
  async txnMustUseCharterUtxo(tcx, redeemerOrRefInput, newDatumOrForceRefScript) {
    return this.mustFindCharterUtxo().then(async (ctUtxo) => {
      if (true === redeemerOrRefInput || "refInput" === redeemerOrRefInput) {
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
        tcx.addInput(ctUtxo, redeemer).attachScript(
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
  async txnAddCharterAuthorityTokenRef(tcx) {
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
  getCapoRev() {
    return 1n;
  }
  /**
   * extracts from the input configuration the key details needed to construct/reconstruct the on-chain contract address
   * @remarks
   *
   * extracts the details that are key to parameterizing the Capo / leader's on-chain contract script
   * @public
   **/
  getContractScriptParams(config) {
    if (this.configIn && config.mph && !config.mph.eq(this.mph))
      throw new Error(`mph mismatch`);
    const { mph } = config;
    const rev = this.getCapoRev();
    return {
      mph,
      rev
    };
  }
  connectMinter() {
    return this.minter || this.connectMintingScript(this.getMinterParams());
  }
  get mph() {
    return this.connectMinter().mintingPolicyHash;
  }
  get mintingPolicyHash() {
    return this.mph;
  }
  connectMintingScript(params) {
    if (this.minter)
      throw new Error(`just use this.minter when it's already present`);
    const { minterClass } = this;
    const { seedTxn, seedIndex } = params;
    const { mph: expectedMph } = this.configIn || {};
    const minter = this.addStrellaWithConfig(minterClass, {
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
    const { mintingCharter, mintingUuts } = minter.onChainActivitiesType;
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
  /**
   * Finds a sufficient-sized utxo for seeding one or more named tokens
   * @remarks
   *
   * For allocating a charter token (/its minter), one or more UUTs, or other token name(s)
   * to be minted, this function calculates the size of minUtxo needed for all the needed tokens,
   * assuming they'll each be stored in separate utxos.  It then finds and returns a UTxO from the
   * current actor's wallet.  The utxo is NOT added to the transaction.
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
  mockMinter;
  /**
   * Creates a new delegate link, given a delegation role and and strategy-selection details
   * @remarks
   *
   * Combines partal and implied configuration settings, validating the resulting configuration.
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
    const configured = this.txnCreateConfiguredDelegate(
      tcx,
      roleName,
      delegateInfo
    );
    await configured.delegate.txnReceiveAuthorityToken(
      tcx,
      this.mkMinTv(this.mph, tcx.state.uuts[roleName])
    );
    return this.relativeLink(configured);
  }
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
   * Returns a complete set of delegate settings, given a delegation role and strategy-selection details
   * @remarks
   *
   * Behaves exactly like (and provides the core implementation of) {@link Capo.txnCreateDelegateLink | txnCreateDelegateLink()},
   * returning additional `roleName` and `delegateClass`, to conform with the DelegateSettings type.
   *
   * See txnCreateDelegateLink for further details.
   * @public
   **/
  txnCreateConfiguredDelegate(tcx, roleName, delegateInfo = { strategyName: "default" }) {
    const { strategyName, config: selectedConfig = {} } = delegateInfo;
    const { delegateRoles } = this;
    const uut = tcx.state.uuts[roleName];
    const impliedDelegationDetails = this.mkImpliedDelegationDetails(uut);
    const foundStrategies = delegateRoles[roleName];
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
      ...impliedDelegationDetails
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
    let delegate = this.mustGetDelegate(delegateSettings);
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
    );
    if (!cache[roleName])
      cache[roleName] = {};
    const roleCache = cache[roleName];
    const cachedRole = roleCache[cacheKey];
    if (cachedRole) {
      return cachedRole;
    }
    const role = this.delegateRoles[roleName];
    //!!! work on type-safety with roleName + available roles
    const {
      strategyName,
      uutName,
      delegateValidatorHash: edvh,
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
      ...impliedDelegationDetails
    };
    //!  //  delegate: DT // omitted in "pre-configured";
    const delegate = this.mustGetDelegate({
      delegateClass,
      config,
      roleName,
      uutName,
      strategyName
      // reqdAddress,
      // addrHint,
    });
    const dvh = delegate.delegateValidatorHash;
    if (edvh && dvh && !edvh.eq(dvh)) {
      throw new Error(
        `${this.constructor.name}: ${roleName}: mismatched delegate: expected validator ${edvh?.hex}, got ${dvh.hex}`
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
  mustGetDelegate(configuredDelegate) {
    const { delegateClass, config } = configuredDelegate;
    try {
      const configured = this.addStrellaWithConfig(delegateClass, config);
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
      }
    });
  }
}
__decorateClass$4([
  partialTxn
], Capo.prototype, "txnWillMintUuts", 1);
__decorateClass$4([
  txn
], Capo.prototype, "mkTxnMintingUuts", 1);
__decorateClass$4([
  Activity.redeemer
], Capo.prototype, "usingAuthority", 1);
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
], Capo.prototype, "txnAddCharterAuthorityTokenRef", 1);

const code$4 = new String("spending BasicMintDelegate\n\nconst rev : Int = 1\nconst instance : ByteArray = #67656e6572616c\n\nimport {\n    DelegationDetail,\n    acAuthorityToken,\n    tvAuthorityToken\n} from CapoDelegateHelpers\n\nimport {\n    returnsValueToScript\n} from StellarHeliosHelpers\n\nimport {\n    MintDelegateActivity,\n    MintDelegateDatum\n} from specializedMintDelegate\n\n// import { \n//     preventCharterChange\n// } from MultiSigAuthority\n// func main(datum: Datum,_,ctx: ScriptContext) -> Bool {\n//     preventCharterChange(ctx, datum) \n// }\n\nfunc mustReturnValueToScript(value : Value, ctx : ScriptContext) -> Bool {\n    if (!returnsValueToScript( value, ctx)) {\n         error(\"the authZor token MUST be returned\")\n    };\n    true\n}\n\nfunc main(mdd: MintDelegateDatum, activity: MintDelegateActivity, ctx: ScriptContext) -> Bool {\n    // input = ctx.get_current_input();\n    mdd.switch{\n        isD : IsDelegation{dd, _} => {\n            // MintDelegateDatum::IsDelegation{dd, cfg} = isD;\n            activity.switch {        \n                Authorizing => {\n                    ok : Bool = mustReturnValueToScript(tvAuthorityToken(dd), ctx);\n\n                    o : []TxOutput = ctx.get_cont_outputs();\n                    if (o.length != 1) { error(\"only one utxo allowed in return to mint delegate\") };\n\n                    // Note: unspecialized delegate requires unchanged datum\n                    // ... in additionalDelegateValidation.  ...like this:\n                    //      unmodifiedDelegation( /*isD, same as*/ ddd.serialize(), ctx) &&\n\n                    ok\n                },\n                Reassigning => {\n                    // the token isn't burned, and it isn't returned back to this script\n                    ctx.tx.minted.get_safe( acAuthorityToken(dd) ) == 0 &&\n                    !returnsValueToScript( tvAuthorityToken(dd), ctx)\n                },\n                Retiring => {\n                    // the token is burned\n                    ctx.tx.minted.get(acAuthorityToken(dd)) == -1\n                },\n                Modifying => {\n                    authorityValue : Value = tvAuthorityToken(dd);\n                    ok : Bool = mustReturnValueToScript(authorityValue, ctx);\n                    dlgt : TxOutput = ctx.get_cont_outputs().find(\n                        (o :TxOutput) -> Bool {\n                            o.value.contains(authorityValue)\n                        }\n                    );\n                            \n                    ddNew : MintDelegateDatum::IsDelegation = \n                    MintDelegateDatum::from_data( \n                        dlgt.datum.get_inline_data() \n                    );\n\n                    mdd.validateCDConfig(ddNew) && ok\n                },\n                _ => true\n            } && activity.additionalDelegateValidation(isD, ctx)\n        },\n        _ => {\n            invalidRedeemer = () -> {  error(\"custom datum must not use Activities reserved for IsDelegation datum.\") };\n            activity.switch{\n                Authorizing => invalidRedeemer(),\n                Reassigning => invalidRedeemer(),\n                Retiring => invalidRedeemer(),\n                Modifying => invalidRedeemer(),\n                _ => activity.otherDatumValidation(mdd, ctx)\n            }\n        }\n    }\n}\n");

code$4.srcFile = "src/minting/BasicMintDelegate.hl";
code$4.purpose = "spending";
code$4.moduleName = "BasicMintDelegate";

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
  async txnGrantAuthority(tcx) {
    const label = `${this.constructor.name} authority`;
    const uutxo = await this.DelegateMustFindAuthorityToken(
      tcx,
      label
    );
    const authorityVal = this.tvAuthorityToken();
    console.log(`   ------- delegate ${label} grants authority with ${dumpAny(authorityVal)}`);
    try {
      const tcx2 = await this.DelegateAddsAuthorityToken(tcx, uutxo);
      return this.txnReceiveAuthorityToken(
        tcx2,
        authorityVal,
        uutxo
      );
    } catch (error) {
      if (error.message.match(/input already added/)) {
        throw new Error(`Delegate ${label}: already added: ${dumpAny(authorityVal)}`);
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
    const thisActivity = this.mustGetActivity("Authorizing");
    const t = new thisActivity();
    return { redeemer: t._toUplcData() };
  }
  activityRetiring() {
    const thisActivity = this.mustGetActivity("Retiring");
    const t = new thisActivity();
    return { redeemer: t._toUplcData() };
  }
  mkDatumIsDelegation(dd, ...args) {
    const [customConfig = ""] = args;
    const { IsDelegation } = this.onChainDatumType;
    const { DelegationDetail: DelegationDetail2 } = this.onChainTypes;
    const t = new IsDelegation(new DelegationDetail2(dd), customConfig);
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
    if (!this.compiledScript.validatorHash) {
      throw new Error(
        `${this.constructor.name}: address doesn't use a validator hash!
  ... if that's by design, you may wish to override 'get delegateValidatorHash()' -> undefined`
      );
    }
    return this.compiledScript.validatorHash;
  }
  mkAuthorityTokenPredicate() {
    return this.mkTokenPredicate(this.tvAuthorityToken());
  }
  tvAuthorityToken() {
    if (!this.configIn)
      throw new Error(`must be instantiated with a configIn`);
    const {
      mph,
      tn
      // reqdAddress,  // removed
    } = this.configIn;
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
  async DelegateAddsAuthorityToken(tcx, uutxo) {
    return tcx.addInput(
      uutxo,
      this.activityAuthorizing()
    ).attachScript(this.compiledScript);
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
__decorateClass$3([
  Activity.redeemer
], StellarDelegate.prototype, "activityAuthorizing", 1);
__decorateClass$3([
  Activity.redeemer
], StellarDelegate.prototype, "activityRetiring", 1);
__decorateClass$3([
  datum
], StellarDelegate.prototype, "mkDatumIsDelegation", 1);

const code$3 = new String("module specializedMintDelegate\n\n//! provides a basic version, not actually specialized,\n// of the \"specializedMintDelegate\" interface, which simply\n// exports a DelegateDatum enum and DelegateActivities (redeemer enum).  \n//! these specializations MAY include additional enum variants, and \n//  ... they MUST include the same enum variants found in this\n//  ... unspecialized version.  \n//  If you're specializing and you get a Helios compiler error,\n// ... these are the first things you should check!\n//! Your specialization MAY include any \n// ... additional functions, imports or methods\n\nimport {\n     DelegationDetail,\n     unmodifiedDelegation\n} from CapoDelegateHelpers\n\nenum MintDelegateDatum {\n    IsDelegation {\n        dd: DelegationDetail\n        // provides structural space for (non-string) configuration data.\n        // the string case is degenerate (expect empty string always)\n        CustomConfig: String\n    }\n    \n    func validateCDConfig(self, updated: MintDelegateDatum::IsDelegation) -> Bool {\n        self.switch {\n            ddd: IsDelegation => {\n                (ddd.CustomConfig == \"\") &&\n                (updated == self)\n            },\n            _ => error(\"unreachable\")\n        }\n    }\n}\n\nenum MintDelegateActivity {\n    Authorizing\n    Reassigning\n    Retiring\n    Modifying\n    //! used only for validating IsDelegation datum, that is,\n    //   ... to approve minting requests or any customize spending modes \n    //   ... of that datum.  In this unspecialized version, \n    //   ... the \"Modifying\" activity is an unsupported stand-in for that use-case, always rejecting.\n    //! in a real-life customization case, additional custom IsDelegation config can be\n    //   ... enforced in \"Modifying\" event the second field of IsDelegation (the \"CDConfig\" stand-in here)\n    //   ... the BasicMintDelegate allows for that field's presence, without any assumptions\n    //   ... about its type.\n    //  Note that the basic mint delegate already\n    //   ... enforces the authority UUT being returned to the delegate script,\n    //   ... and other basic administrative expectations, so any specialization\n    //   ... can focus on higher-level policy considerations.\n    func additionalDelegateValidation( self,\n        priorMddd: MintDelegateDatum::IsDelegation, \n        ctx: ScriptContext\n    ) -> Bool {\n        // print(\"  ----- checking additional delegate validation\");\n        self.switch {\n            Authorizing => {\n                unmodifiedDelegation(priorMddd.serialize(), ctx) && \n                true\n            },\n            Modifying => false,\n            _ => true\n        } || ctx.tx.serialize() != priorMddd.serialize()\n    }\n\n    //! used only for validating non-IsDelegation datum types.\n    //   if you have any admininstrative data structures that inform \n    //   your minting policy, these\n    func otherDatumValidation( self,\n        priorMdd: MintDelegateDatum, \n        ctx: ScriptContext\n    ) -> Bool {\n        neverTriggered = () -> {  error(\"never called\") };\n        self.switch{\n            Authorizing => neverTriggered(),\n            Reassigning => neverTriggered(),\n            Retiring => neverTriggered(),\n            Modifying => neverTriggered(),\n            _ => false\n        } && (priorMdd.serialize() != ctx.serialize())\n    }\n}\n\nstruct types {\n    redeemers: MintDelegateActivity\n    datum : MintDelegateDatum\n}\n");

code$3.srcFile = "src/minting/UnspecializedMintDelegate.hl";
code$3.purpose = "module";
code$3.moduleName = "specializedMintDelegate";

const UnspecializedMintDelegate = code$3;

const code$2 = new String("module specializedCapo\n\n//! provides a basic version, not actually specialized,\n// of the \"specializedCapo\" interface, which simply\n// exports Datum and Activity ('redemeer\") enum types.  \n//! the Datum and Activity of specializations\n//  MUST include the same enum variants as in this\n//  unspecialized version.  if you're specializing \n//  ... and you get a Helios compiler error,\n// ... these are the first things you should check!\n//! Your specialization MAY include any \n// ... additional functions, imports or methods\n\nimport { \n    RelativeDelegateLink\n} from CapoDelegateHelpers\n\n//! provides a basic version of Datum in default specializedCapo module\nenum Datum {\n    CharterToken {\n        govAuthorityLink: RelativeDelegateLink\n        mintDelegateLink: RelativeDelegateLink\n    }\n    //! datum-validation only supports checks of absolute spendability, \n    //  ... and can't check details of the Activity (\"redeemer\") being used.\n    func validateSpend(self, ctx: ScriptContext, mph: MintingPolicyHash) -> Bool {\n        //! Note: an overridden Datum's impl of validateSpend() \n        // ... is never called with the CharterToken variant\n        assert(false, \"can't happen\");\n        self.switch{\n            CharterToken => true,\n            _ => error(\"can't happen\")\n        } || (\n            ctx.tx.serialize() /* never */ == self.serialize() ||\n            mph.serialize() /* never */ == self.serialize()\n        )\n    }   \n}\n\n//! provides a basic version of Activity (\"redeemer\" type) in default specializedCapo module\nenum Activity {\n    usingAuthority\n    spendingDatum\n    updatingCharter    \n\n    func allowActivity(self, datum: Datum, ctx: ScriptContext, mph: MintingPolicyHash) -> Bool {\n        self.switch{\n            //! Note: an overridden Reedeemer def doesn't have to replicate the checks\n            // ... for the baseline enum variants; it's not called in those cases.\n            updatingCharter => true,\n            usingAuthority => true,\n            _ => error(\"unreachable code\")\n            // not executed, but prevents the args from showing up as unused:\n        } || (\n            ctx.tx.serialize() /* never */ == datum.serialize() ||\n            mph.serialize() /* never */ == datum.serialize()\n        )\n    }    \n}\n\nstruct types {\n    redeemers: Activity\n    datum : Datum\n}\n");

code$2.srcFile = "src/UnspecializedCapo.hl";
code$2.purpose = "module";
code$2.moduleName = "specializedCapo";

const UnspecializedCapo = code$2;

const code$1 = new String("module CapoHelpers\n\nimport {\n    mkTv,\n    tvCharter\n} from StellarHeliosHelpers\n\nimport { Datum, Activity } from specializedCapo\n\nfunc getRefCharterDatum(ctx: ScriptContext, mph : MintingPolicyHash) -> Datum::CharterToken {\n    chVal : Value = tvCharter(mph);\n    hasCharter = (txin : TxInput) -> Bool { txin.value.contains(chVal) };\n    print(\"getting ref_input for charter\");\n    charterUtxo : TxInput = ctx.tx.ref_inputs.find_safe(hasCharter).switch{\n        Some{ch} => ch,\n        None => error(\"Missing charter in required ref_inputs\")\n    };\n    ctd : Datum::CharterToken = Datum::from_data( \n        charterUtxo.datum.get_inline_data() \n    );\n\n    ctd    \n}\n\n\n//! retrieves a required Charter Datum for the indicated policy - \n// ... either from the txn's reference inputs  or inputs.\nfunc getTxCharterDatum(ctx: ScriptContext, mph : MintingPolicyHash) -> Datum::CharterToken {\n    chVal : Value = tvCharter(mph);\n    hasCharter = (txin : TxInput) -> Bool { txin.value.contains(chVal) };\n\n    charterUtxo : TxInput = ctx.tx.ref_inputs.find_safe(hasCharter).switch{\n        Some{ch} => ch,\n        None => ctx.tx.inputs.find_safe(hasCharter).switch{\n            Some{ch} => ch,\n            None => error(\"Missing charter inputs / ref_inputs\")\n        }\n    };\n    ctd : Datum::CharterToken = Datum::from_data( \n        charterUtxo.datum.get_inline_data() \n    );\n\n    ctd    \n}\n\n");

code$1.srcFile = "src/CapoHelpers.hl";
code$1.purpose = "module";
code$1.moduleName = "CapoHelpers";

const CapoHelpers = code$1;

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
class BasicMintDelegate extends StellarDelegate {
  static currentRev = 1n;
  static get defaultParams() {
    return { rev: this.currentRev };
  }
  contractSource() {
    return code$4;
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
  importModules() {
    const specializedMintDelegate = this.specializedMintDelegate;
    if (specializedMintDelegate.moduleName !== "specializedMintDelegate") {
      throw new Error(
        `${this.constructor.name}: specializedMintDelegate() module name must be 'specializedMintDelegate', not '${specializedMintDelegate.moduleName}'
  ... in ${specializedMintDelegate.srcFile}`
      );
    }
    return [
      code$7,
      CapoDelegateHelpers,
      CapoHelpers,
      CapoMintHelpers,
      specializedMintDelegate,
      this.specializedCapo
    ];
  }
  get scriptDatumName() {
    return "MintDelegateDatum";
  }
  get scriptActivitiesName() {
    return "MintDelegateActivity";
  }
  getContractScriptParams(config) {
    return {
      rev: config.rev
    };
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
      `     ----- minting delegate validator receiving mintDgt token at ` + this.address.validatorHash.hex
    );
    const datum2 = this.mkDelegationDatum(fromFoundUtxo);
    return tcx.addOutput(new TxOutput(this.address, tokenValue, datum2));
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
__decorateClass$2([
  Activity.partialTxn
], BasicMintDelegate.prototype, "txnCreatingTokenPolicy", 1);

class AuthorityPolicy extends StellarDelegate {
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
class AnyAddressAuthorityPolicy extends AuthorityPolicy {
  loadProgramScript(params) {
    return void 0;
  }
  get delegateValidatorHash() {
    return void 0;
  }
  usingAuthority() {
    const { usingAuthority } = this.onChainActivitiesType;
    if (!usingAuthority) {
      throw new Error(
        `invalid contract without a usingAuthority activity`
      );
    }
    const t = new usingAuthority();
    return { redeemer: t._toUplcData() };
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
    if (fromFoundUtxo) {
      dest = fromFoundUtxo.address;
    } else {
      if (!this.configIn?.addrHint?.[0])
        throw new Error(
          `missing addrHint`
        );
      const {
        addrHint
        // reqdAddress,  // removed
      } = this.configIn;
      dest = addrHint[0];
    }
    const output = new TxOutput(dest, tokenValue);
    output.correctLovelace(this.networkParams);
    tcx.addOutput(output);
    return tcx;
  }
  //! Adds the indicated token to the txn as an input with apporpriate activity/redeemer
  //! EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
  async DelegateAddsAuthorityToken(tcx, fromFoundUtxo) {
    //! no need to specify a redeemer
    return tcx.addInput(fromFoundUtxo);
  }
  //! Adds the indicated utxo to the transaction with appropriate activity/redeemer
  //  ... allowing the token to be burned by the minting policy.
  //! EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
  async DelegateRetiresAuthorityToken(tcx, fromFoundUtxo) {
    //! no need to specify a redeemer
    return tcx.addInput(fromFoundUtxo);
  }
}
__decorateClass$1([
  Activity.redeemer
], AnyAddressAuthorityPolicy.prototype, "usingAuthority", 1);

const code = new String("spending MultiSigAuthority\n\nconst rev : Int = 1\nconst instance : ByteArray = #67656e6572616c\n\nfunc preventCharterChange(ctx: ScriptContext, datum: Datum) -> Bool {\n    tx: Tx = ctx.tx;\n\n    charterOutput : TxOutput = getCharterOutput(tx);\n\n    cvh : ValidatorHash = ctx.get_current_validator_hash();\n    myself : Credential = Credential::new_validator(cvh);\n    if (charterOutput.address.credential != myself) {\n        error(\"charter token must be returned to the contract\")\n        // actual : String = charterOutput.address.credential.switch{\n        //     PubKey{pkh} => \"pkh:🔑#\" + pkh.show(),\n        //     Validator{vh} => \"val:📜#:\" + vh.show()\n        // };\n        // error(\n        //     \"charter token must be returned to the contract \" + cvh.show() +\n        //     \"... but was sent to \" +actual\n        // )\n    };\n\n    Datum::CharterToken{trustees, minSigs} = datum;\n    Datum::CharterToken{newTrustees, newMinSigs} = Datum::from_data( \n        charterOutput.datum.get_inline_data() \n    );\n    if ( !(\n        newTrustees == trustees &&\n        newMinSigs == minSigs\n    )) { \n        error(\"invalid update to charter settings\") \n    };\n\n    true\n}\n\nfunc requiresValidMinSigs(datum: Datum) -> Bool {\n    Datum::CharterToken{trustees, minSigs} = datum;\n\n    assert(\n        minSigs <= trustees.length,\n        \"minSigs can't be more than the size of the trustee-list\"\n    );\n\n    true\n}\n\nfunc requiresProofOfNewTrustees(\n    ctx: ScriptContext,\n    datum: Datum\n) -> Bool {\n    Datum::CharterToken{newTrustees, _} = datum;\n\n    assert(\n        newTrustees.all(didSignInCtx(ctx)), \n        \"all the new trustees must sign\"\n    );\n\n    requiresValidMinSigs(datum)\n}\n\n//!!! adapt to use my UUT\nfunc requiresAuthorization(ctx: ScriptContext, datum: Datum) -> Bool {\n    Datum::CharterToken{trustees, minSigs} = datum;\n\n    foundSigs: Int = trustees.fold[Int](\n        (count: Int, a: Address) -> Int {            \n            count + if (didSign(ctx, a)) {1} else {0}\n        }, 0\n    );\n    assert(foundSigs >= minSigs, \n        \"not enough trustees have signed the tx\" \n        // \"not enough trustees (\"+foundSigs.show()+ \" of \" + minSigs.show() + \" needed) have signed the tx\" \n    );\n\n    true\n}\nfunc main(_,_,_) -> Bool {\n    true\n}\n// for updating trustee list:\n// requiresProofOfNewTrustees(ctx, newDatum)\n");

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
  // @Activity.partialTxn
  // async txnFresheningCredInfo(
  //     tcx: StellarTxnContext,
  //     tokenName: string
  // ): Promise<StellarTxnContext> {
  //     return tcx
  // }
  async txnReceiveAuthorityToken(tcx, val, fromFoundUtxo) {
    throw new Error(`todo`);
  }
  //! Adds the indicated token to the txn as an input with apporpriate activity/redeemer
  async DelegateAddsAuthorityToken(tcx, fromFoundUtxo) {
    throw new Error(`todo`);
  }
  //! Adds the indicated utxo to the transaction with appropriate activity/redeemer
  //  ... allowing the token to be burned by the minting policy.
  async DelegateRetiresAuthorityToken(tcx, fromFoundUtxo) {
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
//!!! todo enable "other" datum args - (ideally, those other than delegate-link types) to be inlcuded in MDCDA above.
class DefaultCapo extends Capo {
  contractSource() {
    return code$9;
  }
  static parseConfig(jsonConfig) {
    const { mph, rev, seedTxn, seedIndex, rootCapoScriptHash } = jsonConfig;
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
      outputConfig.rootCapoScriptHash = ValidatorHash.fromHex(rootCapoScriptHash.bytes);
    return outputConfig;
  }
  /**
   * indicates any specialization of the baseline Capo types
   * @remarks
   *
   * The default implementation is an UnspecialiedCapo, which
   * you can use as a template for your specialized Capo.
   *
   * Every specalization MUST include Datum and Activity ("redeemer") enums,
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
  /**
   * indicates any specialization of the baseline Capo types
   * @remarks
   *
   * The default implementation is an UnspecialiedCapo, which
   * you can use as a template for your specialized Capo.
   *
   * Every specalization MUST include Datum and  Activity ("redeemer") enums,
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
    const specializedCapo = this.specializedCapo;
    if (specializedCapo.moduleName !== "specializedCapo") {
      throw new Error(
        `${this.constructor.name}: specializedCapo() module name must be 'specializedCapo', not '${specializedCapo.moduleName}'
  ... in ${specializedCapo.srcFile}`
      );
    }
    return [specializedCapo, this.capoHelpers, ...parentModules];
  }
  // // @Activity.redeemer
  // updatingCharter() : isActivity {
  //     return this.updatingDefaultCharter()
  // }
  /**
   * Use the `delegateRoles` getter instead
   * @remarks
   * 
   * this no-op method is a convenience for Stellar Contracts maintainers
   * and intuitive developers using autocomplete.  Including it enables an entry
   * in VSCode "Outline" view, which doesn't include the delegateRoles getter : /
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
        },
        multisig: {
          delegateClass: MultisigAuthorityPolicy,
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
      mintDelegate: defineRole("mintDgt", BasicMintDelegate, {
        default: {
          delegateClass: BasicMintDelegate,
          partialConfig: {},
          validateConfig(args) {
            return void 0;
          }
        }
        // undelegated: { ... todo ... }
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
    if (rcsh && !rcsh.eq(this.address.validatorHash)) {
      console.error(`expected: ` + rcsh.hex + `
  actual: ` + this.address.validatorHash.hex);
      throw new Error(`${this.constructor.name}: the leader contract script '${this.scriptProgram?.name}', or one of its dependencies, has been modified`);
    }
    this.connectMinter();
    const charter = await this.findCharterDatum();
    const { govAuthorityLink, mintDelegateLink } = charter;
    return Promise.all([
      this.connectDelegateWithLink("govAuthority", govAuthorityLink),
      this.connectDelegateWithLink("mintDelegate", mintDelegateLink)
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
  mkDatumCharterToken(args) {
    //!!! todo: make it possible to type these datum helpers more strongly
    console.log("--> mkDatumCharter", args);
    const { CharterToken: hlCharterToken } = this.onChainDatumType;
    const govAuthority = this.mkOnchainDelegateLink(args.govAuthorityLink);
    const mintDelegate = this.mkOnchainDelegateLink(args.mintDelegateLink);
    const t = new hlCharterToken(govAuthority, mintDelegate);
    return Datum.inline(t._toUplcData());
  }
  async findCharterDatum() {
    return this.mustFindCharterUtxo().then(async (ctUtxo) => {
      const charterDatum = await this.readDatum(
        "CharterToken",
        ctUtxo.origOutput.datum
      );
      if (!charterDatum)
        throw Error(`invalid charter UTxO datum`);
      return charterDatum;
    });
  }
  async txnAddGovAuthority(tcx) {
    const charterDatum = await this.findCharterDatum();
    console.log(
      "adding charter's govAuthority via delegate",
      charterDatum.govAuthorityLink
    );
    const capoGov = await this.connectDelegateWithLink(
      "govAuthority",
      charterDatum.govAuthorityLink
    );
    return capoGov.txnGrantAuthority(tcx);
  }
  // getMinterParams() {
  //     const { seedTxn, seedIdx } = this.configIn
  //     return { seedTxn, seedIdx }
  // }
  /**
   * should emit a complete configuration structure that can reconstitute a contract (suite) after its first bootstrap transaction
   * @remarks
   *
   * mkFullConfig is called during a bootstrap transaction.  The default implementation works
   * for subclasses as long as they use CapoBaseConfig for their config type.  Or, if they're
   * instantiated with a partialConfig that augments CapoBaseConfig with concrete details that
   * fulfill their extensions to the config type.
   *
   * If you have a custom mkBootstrapTxn() that uses techniques to explicitly add config
   * properties not provided by your usage of `partialConfig` in the constructor, then you'll
   * need to provide a more specific impl of mkFullConfig().  It's recommended that you
   * call super.mkFullConfig() from your impl.
   * @param baseConfig - receives the BaseConfig properties: mph, seedTxn and seedIndex
   * @public
   **/
  mkFullConfig(baseConfig) {
    const pCfg = this.partialConfig || {};
    const newClass = this.constructor;
    const newCapo = newClass.bootstrapWith({ setup: this.setup, config: { ...baseConfig, ...pCfg } });
    return {
      ...baseConfig,
      ...pCfg,
      rootCapoScriptHash: newCapo.compiledScript.validatorHash
    };
  }
  async mkTxnMintingUuts(initialTcx, uutPurposes, seedUtxo, roles) {
    const tcx = await super.mkTxnMintingUuts(
      initialTcx,
      uutPurposes,
      seedUtxo,
      roles
    );
    await this.txnMustUseCharterUtxo(tcx, "refInput");
    return this.txnAddMintDelegate(tcx);
  }
  async getMintDelegate() {
    const charterDatum = await this.findCharterDatum();
    return this.connectDelegateWithLink(
      "mintDelegate",
      charterDatum.mintDelegateLink
    );
  }
  async getGovDelegate() {
    const charterDatum = await this.findCharterDatum();
    return this.connectDelegateWithLink(
      "govDelegate",
      charterDatum.govAuthorityLink
    );
  }
  async txnAddMintDelegate(tcx) {
    const mintDelegate = await this.getMintDelegate();
    await mintDelegate.txnGrantAuthority(tcx);
    return tcx;
  }
  //@ts-expect-error - typescript can't seem to understand that
  //    <Type> - govAuthorityLink + govAuthorityLink is <Type> again
  async mkTxnMintCharterToken(charterDatumArgs, existingTcx) {
    if (this.configIn)
      throw new Error(
        `this contract suite is already configured and can't be re-chartered`
      );
    const initialTcx = existingTcx || new StellarTxnContext(this.myActor);
    return this.txnMustGetSeedUtxo(initialTcx, "charter bootstrapping", [
      "charter"
    ]).then(async (seedUtxo) => {
      const { txId: seedTxn, utxoIdx } = seedUtxo.outputId;
      const seedIndex = BigInt(utxoIdx);
      this.connectMintingScript({ seedIndex, seedTxn });
      const { mintingPolicyHash: mph } = this.minter;
      const rev = this.getCapoRev();
      const bsc = this.mkFullConfig({
        mph,
        rev,
        seedTxn,
        seedIndex
      });
      initialTcx.state.bsc = bsc;
      initialTcx.state.bootstrappedConfig = JSON.parse(
        JSON.stringify(bsc, delegateLinkSerializer)
      );
      const fullScriptParams = this.contractParams = this.getContractScriptParams(bsc);
      this.configIn = bsc;
      this.scriptProgram = this.loadProgramScript(fullScriptParams);
      const tcx = await this.minter.txnWillMintUuts(
        initialTcx,
        ["capoGov", "mintDgt"],
        seedUtxo,
        {
          govAuthority: "capoGov",
          mintDelegate: "mintDgt"
        }
      );
      const { capoGov, govAuthority, mintDgt, mintDelegate } = tcx.state.uuts;
      {
        if (govAuthority !== capoGov)
          throw new Error(`assertion can't fail`);
      }
      const govAuthorityLink = await this.txnCreateDelegateLink(tcx, "govAuthority", charterDatumArgs.govAuthorityLink);
      const mintDelegateLink = await this.txnCreateDelegateLink(tcx, "mintDelegate", charterDatumArgs.mintDelegateLink);
      const fullCharterArgs = {
        ...charterDatumArgs,
        govAuthorityLink,
        mintDelegateLink
      };
      const datum2 = this.mkDatumCharterToken(fullCharterArgs);
      const charterOut = new TxOutput(
        this.address,
        this.tvCharter(),
        datum2
      );
      charterOut.correctLovelace(this.networkParams);
      tcx.addInput(seedUtxo);
      tcx.addOutputs([charterOut]);
      console.log(
        " ---------------- CHARTER MINT ---------------------\n",
        txAsString(tcx.tx)
      );
      return this.minter.txnMintingCharter(tcx, {
        owner: this.address,
        capoGov,
        // same as govAuthority,
        mintDgt
      });
    });
  }
  updatingCharter() {
    const { updatingCharter } = this.onChainActivitiesType;
    const t = new updatingCharter();
    return { redeemer: t._toUplcData() };
  }
  async mkTxnUpdateCharter(args, tcx = new StellarTxnContext(this.myActor)) {
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

class DefaultCapoTestHelper extends CapoTestHelper {
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
  setupActors() {
    this.addActor("tina", 1100n * ADA);
    this.addActor("tracy", 13n * ADA);
    this.addActor("tom", 120n * ADA);
    this.currentActor = "tina";
  }
  async mkCharterSpendTx() {
    await this.mintCharterToken();
    const treasury = this.strella;
    const tcx = new StellarTxnContext(this.currentActor);
    const tcx2 = await treasury.txnAddGovAuthority(tcx);
    return treasury.txnMustUseCharterUtxo(tcx2, treasury.usingAuthority());
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
      }
      // mintDelegateLink: {
      //     strategyName: "default",
      // },
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
    const script = this.strella;
    const goodArgs = args || this.mkDefaultCharterArgs();
    const tcx = await script.mkTxnMintCharterToken(
      goodArgs
    );
    this.state.config = tcx.state.bootstrappedConfig;
    expect(script.network).toBe(this.network);
    await script.submit(tcx);
    console.log(`----- charter token minted at slot ${this.network.currentSlot}`);
    this.network.tick(1n);
    this.state.mintedCharterToken = tcx;
    return tcx;
  }
  async updateCharter(args) {
    await this.mintCharterToken();
    const treasury = this.strella;
    const { signers } = this.state;
    const tcx = await treasury.mkTxnUpdateCharter(args);
    return treasury.submit(tcx, { signers }).then(() => {
      this.network.tick(1n);
      return tcx;
    });
  }
}

const insufficientInputError = /(need .* lovelace, but only have|transaction doesn't have enough inputs)/;
Error.stackTraceLimit = 100;

export { ADA, CapoTestHelper, DefaultCapoTestHelper, StellarTestHelper, addTestContext, insufficientInputError };
//# sourceMappingURL=testing.mjs.map
