import * as helios from '@hyperionbt/helios';
import { Address, Tx, Value, UTxO, TxOutput, Assets, MintingPolicyHash, Program, bytesToHex, Crypto, NetworkParams, NetworkEmulator, Datum } from '@hyperionbt/helios';
import { promises } from 'fs';
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
    "outputs",
    "fee",
    "lastValidSlot",
    "firstValidSlot",
    "metadataHash",
    "scriptDataHash",
    "signers",
    "collateralReturn",
    "refInputs"
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
      item = `${(Math.round(item / 1e3) / 1e3).toFixed(3)} ADA`;
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
    details = details + `  txId: ${tx.id().dump()}`;
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
  constructor() {
    this.tx = new Tx();
    this.inputs = [];
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
  // async findDatum(d: Datum | DatumHash): Promise<UTxO[]>;
  // async findDatum(predicate: utxoPredicate): Promise<UTxO[]>;
  // async findDatum(d: Datum | DatumHash | utxoPredicate): Promise<UTxO[]> {
  //     let targetHash: DatumHash | undefined =
  //         d instanceof Datum
  //             ? d.hash
  //             : d instanceof DatumHash
  //             ? d
  //             : undefined;
  //     let predicate =
  //         "function" === typeof d
  //             ? d
  //             : (u: UTxO) => {
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
  findSmallestUnusedUtxo(lovelace, utxos, tcx) {
    const value = new Value({ lovelace });
    const toSortInfo = this._mkUtxoSortInfo(value.lovelace);
    const found = utxos.map(toSortInfo).filter(this._utxoIsPureADA).filter(this._utxoIsSufficient).filter((uInfo) => {
      if (!tcx)
        return true;
      return !!tcx?.utxoNotReserved(uInfo.u);
    }).sort(this._utxoSortSmallerAndPureADA).map(this._infoBackToUtxo).at(0);
    return found;
  }
  //! creates a filtering function, currently for UTxO-filtering only.
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
    if (something instanceof UTxO)
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
  tokenAsValue(tokenName, quantity, mph) {
    if (!mph) {
      mph = this.mph;
      if (!mph)
        throw new Error(
          `tokenAsValue: mph in arg3 required unless the stellar contract (${this.constructor.name}) has an 'mph' getter.`
        );
    }
    const v = new Value(
      this.ADA(0),
      new Assets([[mph, [this.mkValuesEntry(tokenName, quantity)]]])
    );
    const o = new TxOutput(this.address, v);
    v.setLovelace(o.calcMinLovelace(this.networkParams));
    return v;
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
      return 1;
    if (free2 < free1)
      return -1;
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
    const toSortInfo = this._mkUtxoSortInfo(this.ADA(2), this.ADA(10));
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
      const feeEstimated = tx.estimateCollateralBaseFee(this.networkParams, changeAddress, spares);
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
  //         let maxFree: UTxO, minToken: UTxO;
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

var contract$1 = "minting defaultMinter\n\nconst seedTxn : TxId = TxId::new(#1234)\nconst seedIndex : Int = 42\n\nimport { \n    hasSeedUtxo, \n    validateUUTminting\n} from CapoMintHelpers\n\nenum Redeemer { \n    mintingCharterToken {\n        owner: Address\n    }\n    mintingUUTs {\n        seedTxn: TxId\n        seedIndex: Int\n        //!!! todo: apply this everywhere else\n        purposes: []String\n    }\n}\n\nfunc hasContractSeedUtxo(tx: Tx) -> Bool {\n    hasSeedUtxo(tx, seedTxn, seedIndex, \"charter\")\n}\n\nfunc main(r : Redeemer, ctx: ScriptContext) -> Bool {\n    tx: Tx = ctx.tx;\n    mph: MintingPolicyHash = ctx.get_current_minting_policy_hash();\n    value_minted: Value = tx.minted;\n\n    charterToken: AssetClass = AssetClass::new(\n        mph,\n        \"charter\".encode_utf8()\n    );\n\n    ok : Bool = r.switch {\n        charter: mintingCharterToken => {       \n            assert(value_minted == Value::new(charterToken, 1), \"no charter token minted\");\n\n            hasContractSeedUtxo(tx) &&\n            tx.outputs.all( (output: TxOutput) -> Bool {\n                output.value != value_minted || (\n                    output.value == value_minted &&\n                    output.address == charter.owner\n                )\n            })\n        },\n\n        mintingUUTs{sTxId, sIdx, purposes} => validateUUTminting(ctx, sTxId, sIdx, purposes),\n        _ => true\n    };\n\n    print(\"defaultMinter: minting value: \" + value_minted.show());\n\n    ok\n}\n\n";

var cmh = "module CapoMintHelpers\n\n\nfunc hasSeedUtxo(tx: Tx, sTxId : TxId, sIdx: Int, reason: String) -> Bool {\n    seedUtxo: TxOutputId = TxOutputId::new(\n        sTxId,\n        sIdx\n    );\n    assert(tx.inputs.any( (input: TxInput) -> Bool {\n        input.output_id == seedUtxo\n    }),  \"seed utxo required for minting \"+reason);\n\n    true\n}\n\nfunc validateUUTminting(ctx: ScriptContext, sTxId : TxId, sIdx : Int, purposes: []String) -> Bool {\n    tx: Tx = ctx.tx;\n    mph: MintingPolicyHash = ctx.get_current_minting_policy_hash();\n    value_minted: Value = tx.minted;\n    idxBytes : ByteArray = sIdx.bound_max(255).serialize();\n    // assert(idxBytes.length == 1, \"surprise!\");\n\n    //! yuck: un-CBOR...\n    rawTxId : ByteArray = sTxId.serialize().slice(5,37);\n\n    txoId : ByteArray = (rawTxId + \"@\".encode_utf8() + idxBytes);\n    assert(txoId.length == 34, \"txId + @ + int should be length 34\");\n    // print( \"******** txoId \" + txoId.show());\n\n    miniHash : ByteArray = txoId.blake2b().slice(0,6);\n    assert(miniHash.length == 6, \"urgh.  slice 5? expected 12, got \"+ miniHash.length.show());\n\n    assetValues = Value::sum(purposes.map(\n        (purpose: String) -> Value {\n            assetName : ByteArray = (purpose + \".\" + miniHash.show()).encode_utf8();\n            assetClass : AssetClass = AssetClass::new(mph, assetName);\n\n            Value::new(assetClass, 1)\n        }\n    ));\n    expectedMint : Map[ByteArray]Int = assetValues.get_policy(mph);\n    actualMint : Map[ByteArray]Int = value_minted.get_policy(mph);\n\n    // print(\"redeemer\" + sTxId.show() + \" \" + sIdx.show() + \" asset \" + assetName.show());\n    // expectedMint.for_each( (b : ByteArray, i: Int) -> {\n    //     print( \"expected: \" + b.show() + \" \" + i.show() )\n    // });\n    temp : []ByteArray = actualMint.fold( (l: []ByteArray, b : ByteArray, i: Int) -> {\n        l.find_safe((x : ByteArray) -> Bool { x == b }).switch{\n            None => l.prepend(b),\n            Some => error(\"UUT purposes not unique\")\n        }\n    }, []ByteArray{});\n    assert(temp == temp, \"prevent unused var\");\n\n    // actualMint.for_each( (b : ByteArray, i: Int) -> {\n    //     print( \"actual: \" + b.show() + \" \" + i.show() )\n    // });\n\n    assert(expectedMint == actualMint, \"bad UUT mint has mismatch;\"+ \n        \"\\n   ... expected \"+ assetValues.show()+\n        \"   ... actual \"+ value_minted.show()+\n        \"   ... diff = \" + (assetValues - value_minted).show()\n    );\n    hasSeedUtxo(tx, sTxId, sIdx, \"UUT \"+purposes.join(\"+\"))\n}";

//! this file implements a workaround for a problem 
const CapoMintHelpers = cmh;

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
class DefaultMinter extends StellarContract {
  contractSource() {
    return contract$1;
  }
  capoMinterHelpers() {
    return CapoMintHelpers;
  }
  importModules() {
    return [
      this.capoMinterHelpers()
    ];
  }
  async txnCreatingUUTs(tcx, purposes) {
    //!!! make it big enough to serve minUtxo for the new UUT
    const uutSeed = this.mkValuePredicate(BigInt(42e3), tcx);
    return this.mustFindActorUtxo(
      `for-uut-${purposes.join("+")}`,
      uutSeed,
      tcx
    ).then(async (freeSeedUtxo) => {
      tcx.addInput(freeSeedUtxo);
      const { txId, utxoIdx } = freeSeedUtxo;
      const { encodeBech32, blake2b, encodeBase32 } = Crypto;
      const assetNames = purposes.map((uutPurpose) => {
        const txoId = txId.bytes.concat(["@".charCodeAt(0), utxoIdx]);
        return `${uutPurpose}.${bytesToHex(blake2b(txoId).slice(0, 6))}`;
      });
      const vEntries = this.mkUUTValuesEntries(assetNames);
      const { txId: seedTxn, utxoIdx: seedIndex } = freeSeedUtxo;
      tcx.attachScript(this.compiledContract).mintTokens(
        this.mintingPolicyHash,
        vEntries,
        this.mintingUUTs({
          seedTxn,
          seedIndex,
          purposes
        }).redeemer
      );
      const v = new Value(
        void 0,
        new Assets([[this.mintingPolicyHash, vEntries]])
      );
      return v;
    });
  }
  mkUUTValuesEntries(assetNames) {
    return assetNames.map((assetName) => {
      return this.mkValuesEntry(assetName, BigInt(1));
    });
  }
  //! overrides base getter type with undefined not being allowed
  get mintingPolicyHash() {
    return super.mintingPolicyHash;
  }
  mintingCharterToken({ owner }) {
    const t = new this.configuredContract.types.Redeemer.mintingCharterToken(
      owner
    );
    return { redeemer: t._toUplcData() };
  }
  mintingUUTs({
    seedTxn,
    seedIndex: sIdx,
    purposes
  }) {
    const seedIndex = BigInt(sIdx);
    console.log("UUT redeemer seedTxn", seedTxn.hex);
    const t = new this.configuredContract.types.Redeemer.mintingUUTs(
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
    console.warn("deprecated use of `get minter.charterTokenAsValue`; use tvCharter() instead");
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
__decorateClass$2([
  Activity.partialTxn
], DefaultMinter.prototype, "txnCreatingUUTs", 1);
__decorateClass$2([
  Activity.redeemer
], DefaultMinter.prototype, "mintingCharterToken", 1);
__decorateClass$2([
  Activity.redeemer
], DefaultMinter.prototype, "mintingUUTs", 1);
__decorateClass$2([
  Activity.partialTxn
], DefaultMinter.prototype, "txnMintingCharterToken", 1);

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
class Capo extends StellarContract {
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
  // ): Promise<UTxO | never>;
  get minterClass() {
    return DefaultMinter;
  }
  minter;
  async txnCreatingUUTs(tcx, uutPurposes) {
    return this.minter.txnCreatingUUTs(tcx, uutPurposes);
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
    console.warn("deprecated get charterTokenAsValue; use tvCharter() instead");
    return this.tvCharter();
  }
  async mkTxnMintCharterToken(datumArgs, tcx = new StellarTxnContext()) {
    console.log(`minting charter from seed ${this.paramsIn.seedTxn.hex.substring(0, 12)}\u2026@${this.paramsIn.seedIndex}`);
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
  async mustFindCharterUtxo() {
    const predicate = this.mkTokenPredicate(this.tvCharter());
    return this.mustFindMyUtxo(
      "charter",
      predicate,
      "has it been minted?"
    );
  }
  // non-activity partial
  async txnMustUseCharterUtxo(tcx, redeemer, newDatum) {
    return this.mustFindCharterUtxo().then((ctUtxo) => {
      tcx.addInput(
        ctUtxo,
        redeemer.redeemer
      ).attachScript(this.compiledContract);
      const datum2 = newDatum || ctUtxo.origOutput.datum;
      this.txnKeepCharterToken(tcx, datum2);
      return tcx;
    });
  }
  // non-activity partial
  async txnUpdateCharterUtxo(tcx, redeemer, newDatum) {
    return this.txnMustUseCharterUtxo(tcx, redeemer, newDatum);
  }
  // non-activity partial
  txnKeepCharterToken(tcx, datum2) {
    tcx.addOutput(
      new TxOutput(this.address, this.tvCharter(), datum2)
    );
    return tcx;
  }
  async txnAddAuthority(tcx) {
    return this.txnMustUseCharterUtxo(tcx, this.usingAuthority());
  }
  //! it can provide minter-targeted params through getMinterParams()
  getMinterParams() {
    return this.paramsIn;
  }
  getContractParams(params) {
    const { mph } = this;
    return {
      mph
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
    const { mintingCharterToken, mintingUUTs } = minter.configuredContract.types.Redeemer;
    if (!mintingCharterToken)
      throw new Error(
        `minting script doesn't offer required 'mintingCharterToken' activity-redeemer`
      );
    if (!mintingUUTs)
      throw new Error(
        `minting script doesn't offer required 'mintingUUTs' activity-redeemer`
      );
    return this.minter = minter;
  }
  async mustGetContractSeedUtxo() {
    //! given a Capo-based contract instance having a free UTxO to seed its validator address,
    //! prior to initial on-chain creation of contract,
    //! it finds that specific UTxO in the current user's wallet.
    const { seedTxn, seedIndex } = this.paramsIn;
    console.log(`seeking seed txn ${seedTxn.hex.substring(0, 12)}\u2026@${seedIndex}`);
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
          "Building a txn with a UUT involves using the txnCreatingUUT partial-helper on the Capo.",
          "That UUT (a Value) is returned, and then should be added to a TxOutput.",
          "The partial-helper doesn't constrain the semantics of the UUT.",
          "The UUT uses the seed-utxo pattern to form 64 bits of uniqueness",
          "   ... so that token-names stay short-ish.",
          "The uniqueness level can be iterated in future as needed.",
          "The UUT's token-name combines its textual purpose with a short hash ",
          "   ... of the seed UTxO, formatted with bech32"
        ]
      }
    };
  }
}
__decorateClass$1([
  Activity.partialTxn
], Capo.prototype, "txnCreatingUUTs", 1);
__decorateClass$1([
  Activity.redeemer
], Capo.prototype, "usingAuthority", 1);
__decorateClass$1([
  Activity.redeemer
], Capo.prototype, "updatingCharter", 1);
__decorateClass$1([
  txn
], Capo.prototype, "mkTxnMintCharterToken", 1);
__decorateClass$1([
  partialTxn
], Capo.prototype, "txnMustUseCharterUtxo", 1);
__decorateClass$1([
  partialTxn
], Capo.prototype, "txnUpdateCharterUtxo", 1);
__decorateClass$1([
  partialTxn
], Capo.prototype, "txnKeepCharterToken", 1);
__decorateClass$1([
  partialTxn
], Capo.prototype, "txnAddAuthority", 1);

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
    return this.initStrella(p);
  }
  initStrella(params) {
    const TargetClass = this.stellarClass;
    const strella = new TargetClass({
      params,
      network: this.network,
      myActor: this.currentActor,
      networkParams: this.networkParams,
      isTest: true
    });
    this.strella = strella;
    this.address = strella.address;
    return strella;
  }
  //! it has a seed for mkRandomBytes, which must be set by caller
  randomSeed;
  //! it makes a rand() function based on the randomSeed after first call to mkRandomBytes
  rand;
  delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
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
      throw e;
    }
    if (isAlreadyInitialized && !force) {
      throw new Error(
        `use the submitTx from the testing-context's 'strella' object instead`
      );
    }
    console.log(
      "Test helper submitting tx prior to instantiateWithParams():\n " + txAsString(tx)
      // new Error(`at stack`).stack
    );
    const txId = await this.network.submitTx(tx);
    this.network.tick(1n);
    return txId;
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
    const script = this.initStrella({
      seedTxn,
      seedIndex
    });
    const { address, mintingPolicyHash: mph } = script;
    const { name } = script.configuredContract;
    console.log(
      name,
      address.toBech32().substring(0, 18) + "\u2026",
      "vHash \u{1F4DC} " + script.compiledContract.validatorHash.hex.substring(0, 12) + "\u2026",
      "mph \u{1F3E6} " + mph?.hex.substring(0, 12) + "\u2026"
    );
    return script;
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

var contract = "spending SampleTreasury\n\n// needed in helios 0.13: defaults\nconst mph : MintingPolicyHash = MintingPolicyHash::new(#1234)\n\nenum Datum {\n    CharterToken {\n        trustees: []Address\n        minSigs: Int\n    }\n}\n\nenum Redeemer {\n    mintingOriginalCharter\n    updatingCharter{\n        trustees: []Address\n        minSigs: Int\n    }\n    usingAuthority\n}\n\nfunc didSign(ctx : ScriptContext, a: Address) -> Bool {\n    tx : Tx = ctx.tx;\n\n    pkh : PubKeyHash = a.credential.switch{\n        PubKey{h} => h,\n        _ => error(\"trustee can't be a contract\")\n    };\n    // print(\"checking if trustee signed: \" + pkh.show());\n\n    tx.is_signed_by(pkh)\n}\nfunc didSignInCtx(ctx: ScriptContext) -> (a: Address) -> Bool {\n    (a : Address) -> Bool {\n        didSign(ctx, a)\n    }\n}\n\nfunc requiresAuthorization(ctx: ScriptContext, datum: Datum) -> Bool {\n    Datum::CharterToken{trustees, minSigs} = datum;\n\n    foundSigs: Int = trustees.fold[Int](\n        (count: Int, a: Address) -> Int {            \n            count + if (didSign(ctx, a)) {1} else {0}\n        }, 0\n    );\n    assert(foundSigs >= minSigs, \n        \"not enough trustees (\"+foundSigs.show()+ \" of \" + minSigs.show() + \" needed) have signed the tx\" \n    );\n\n    true\n}\n\nfunc getCharterOutput(tx: Tx) -> TxOutput {\n    charterTokenValue : Value = Value::new(\n        AssetClass::new(mph, \"charter\".encode_utf8()), \n        1\n    );\n    tx.outputs.find_safe(\n        (txo : TxOutput) -> Bool {\n            txo.value >= charterTokenValue\n        }\n    ).switch{\n        None => error(\"this could only happen if the charter token is burned.\"),\n        Some{o} => o\n    }\n}\n\nfunc preventCharterChange(ctx: ScriptContext, datum: Datum) -> Bool {\n    tx: Tx = ctx.tx;\n\n    charterOutput : TxOutput = getCharterOutput(tx);\n\n    cvh : ValidatorHash = ctx.get_current_validator_hash();\n    myself : Credential = Credential::new_validator(cvh);\n    if (charterOutput.address.credential != myself) {\n        actual : String = charterOutput.address.credential.switch{\n            PubKey{pkh} => \"pkh:🔑#\" + pkh.show(),\n            Validator{vh} => \"val:📜#:\" + vh.show()\n        };\n        error(\n            \"charter token must be returned to the contract \" + cvh.show() +\n            \"... but was sent to \" +actual\n        )\n    };\n\n    Datum::CharterToken{trustees, minSigs} = datum;\n    Datum::CharterToken{newTrustees, newMinSigs} = Datum::from_data( \n        charterOutput.datum.get_inline_data() \n    );\n    if ( !(\n        newTrustees == trustees &&\n        newMinSigs == minSigs\n    )) { \n        error(\"invalid update to charter settings\") \n    };\n\n    true\n}\nfunc requiresValidMinSigs(datum: Datum) -> Bool {\n    Datum::CharterToken{trustees, minSigs} = datum;\n\n    assert(\n        minSigs <= trustees.length,\n        \"minSigs can't be more than the size of the trustee-list\"\n    );\n\n    true\n}\n\nfunc requiresProofOfNewTrustees(\n    ctx: ScriptContext,\n    datum: Datum\n) -> Bool {\n    Datum::CharterToken{newTrustees, _} = datum;\n\n    assert(\n        newTrustees.all(didSignInCtx(ctx)), \n        \"all the new trustees must sign\"\n    );\n\n    requiresValidMinSigs(datum)\n}\n\n\nfunc main(datum: Datum, redeemer: Redeemer, ctx: ScriptContext) -> Bool {\n    tx: Tx = ctx.tx;\n    // now: Time = tx.time_range.start;\n    \n    notUpdatingCharter : Bool = redeemer.switch {\n        updatingCharter => false,  \n        _ => true\n    };\n    charterChangeAllowable : Bool = if(notUpdatingCharter) { \n        preventCharterChange(ctx, datum) // throws if it's not kosher\n     } else { \n        true // \"maybe\", really\n    };\n\n    redeemerSpecificChecks : Bool = redeemer.switch {\n        mintingOriginalCharter => {\n            true\n        },\n        updatingCharter{trustees, minSigs} => { \n            //! guards from optimizing mph out of the program, screwing up parameterization\n            assert(mph.serialize() != datum.serialize(), \"guard failed\"); // can't fail.\n            assert(trustees.serialize() == trustees.serialize(), \"guard failed\"); // can't fail.\n            assert(minSigs.serialize() == minSigs.serialize(), \"guard failed\"); // can't fail.\n            \n            charterOutput : TxOutput = getCharterOutput(tx);\n            newDatum = Datum::from_data( \n                charterOutput.datum.get_inline_data() \n            );\n            \n            requiresAuthorization(ctx, datum) &&\n            requiresProofOfNewTrustees(ctx, newDatum)\n        },\n        // authorizeByCharter{otherRedeemerData, otherSignatures} => {            \n        //     false // todo support authorizing **other** things to be done with this token\n        // },\n        usingAuthority => {\n            assert(mph.serialize() != datum.serialize(), \"guard failed\"); // can't fail.\n\n            notUpdatingCharter &&\n            requiresAuthorization(ctx, datum)\n        }\n    };\n\n    charterChangeAllowable &&\n    redeemerSpecificChecks &&\n    tx.serialize() != datum.serialize()\n}\n\nconst charterTokenBaseInfo: Datum::CharterToken = Datum::CharterToken{\n    trustees: []Address{},\n    minSigs: 1\n}\n\n// const mkCharterTokenDatum : (trustees: []Address, minSigs: Int) -> Datum::CharterSeed = (trustees: []Address, minSigs: Int) -> Datum::CharterSeed {\n//      Datum::CharterToken{\n//         nce: nce(),\n//         trustees: trustees,\n//         minSigs: minSigs\n//     }\n// }\n";

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
    return contract;
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

export { ADA, Activity, Capo, DefaultMinter, SampleTreasury, StellarCapoTestHelper, StellarContract, StellarTestHelper, StellarTxnContext, addTestContext, assetsAsString, datum, lovelaceToAda, partialTxn, txAsString, txInputAsString, txOutputAsString, txn, utxoAsString, utxosAsString, valueAsString };
//# sourceMappingURL=stellar-contracts.mjs.map
