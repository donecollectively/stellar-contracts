import { dumpAny as dumpAny$1, TxBatcher, GenericSigner, UtxoHelper, txAsString as txAsString$1, lovelaceToAda as lovelaceToAda$1, StellarTxnContext as StellarTxnContext$1, CapoWithoutSettings, parseCapoJSONConfig } from '@donecollectively/stellar-contracts';
import { makeNetworkParamsHelper, makeAddress, makeAssets, DEFAULT_NETWORK_PARAMS, makeTxOutputId, makeStakingAddress } from '@helios-lang/ledger';
import { encodeBech32, generateBytes, mulberry32 } from '@helios-lang/crypto';
import { bytesToHex, decodeUtf8, encodeUtf8, isValidUtf8 } from '@helios-lang/codec-utils';
import { makeByteArrayData } from '@helios-lang/uplc';
import { makeTxBuilder, makeTxChainBuilder, makeWalletHelper, SECOND, makeEmulatorGenesisTx, makeEmulatorRegularTx, BIP39_DICT_EN, restoreRootPrivateKey, signCip30CoseData, makeRootPrivateKey } from '@helios-lang/tx-utils';
import { customAlphabet } from 'nanoid';
import { expectDefined } from '@helios-lang/type-utils';

async function addTestContext(context, TestHelperClass, stConfig, helperState) {
  console.log(" ======== ======== ======== +test context");
  Object.defineProperty(context, "strella", {
    get: function() {
      return this.h.strella;
    }
  });
  context.initHelper = async (stConfig2, helperState2) => {
    const helper = new TestHelperClass(stConfig2, helperState2);
    if (context.h) {
      if (!stConfig2.skipSetup)
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
    await context.initHelper(stConfig, helperState);
  } catch (e) {
    if (!stConfig) {
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
  const p = typeof process == "undefined" ? {
    env: {}
  } : process;
  if (p?.env?.EXPAND_DETAIL) {
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
    nameBytesHex = encodeUtf8(nameBytesOrString).map((byte) => ("0" + (byte & 255).toString(16)).slice(-2)).join("");
    nameString = nameBytesOrString;
  } else {
    nameBytesHex = nameBytesOrString.map((byte) => ("0" + (byte & 255).toString(16)).slice(-2)).join("");
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
  let cache = utxoDCache?.get(txoid);
  if (cache) {
    return `\u267B\uFE0F ${cache} (same as above)`;
  }
  cache = `${prefix} ${addrAsString(x.address)}${showRefScript(
    x.refScript
  )} ${valueAsString(x.value)}`;
  return `${cache} ${datumSummary(x.datum)}`;
}
function addrAsString(address) {
  const bech32 = address.toString();
  return `${bech32.slice(0, 14)}\u2026${bech32.slice(-4)}`;
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
      return `num array: \u2039"${byteArrayAsString(makeByteArrayData(x))}"\u203A`;
    }
    if (firstItem.kind == "TxOutput") {
      return "tx outputs: \n" + x.map((txo) => txOutputAsString(txo)).join("\n");
    }
    if (firstItem.kind == "TxInput") {
      return "utxos: \n" + utxosAsString(x);
    }
    if (firstItem.kind == "ByteArrayData") {
      return "byte array list:\n" + byteArrayListAsString(x);
    }
    if ("object" == typeof firstItem) {
      if (firstItem instanceof Uint8Array) {
        return `byte array: \u2039"${byteArrayAsString(firstItem)}"\u203A`;
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
  if (isLibraryMatchedTcx(x)) {
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

const proc = typeof process == "undefined" ? {
  stdout: {
    columns: 65
  }} : process;
class UplcConsoleLogger {
  didStart = false;
  // lines: LineOrGroup[] = [];
  lastMessage = "";
  lastReason;
  history = [];
  groupStack = [{
    name: "",
    lines: []
  }];
  constructor() {
    this.logPrint = this.logPrint.bind(this);
    this.reset = this.reset.bind(this);
  }
  get currentGroupLines() {
    return this.groupStack.at(-1).lines;
  }
  get topLines() {
    return this.groupStack.at(0).lines;
  }
  reset(reason) {
    this.lastMessage = "";
    this.lastReason = reason;
    this.groupStack = [{
      name: "",
      lines: []
    }];
    if (reason == "build") {
      this.groupStack[0].lines = [];
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
  interesting = 0;
  logPrint(message, site) {
    if (message.match(/STokMint/)) {
      this.interesting = 1;
    }
    if (message.startsWith("\u{1F423}")) {
      const groupName = message.replace("\u{1F423}", "").replace("\u{1F5DC}\uFE0F", "");
      const collapse = !!message.match(/^🐣🗜️/);
      const nextGroup = {
        name: groupName.replace(/^\s+/, ""),
        lines: [],
        collapse
      };
      this.currentGroupLines.push(nextGroup);
      this.groupStack.push(nextGroup);
      return this;
    } else if (message.startsWith("\u{1F95A} ")) {
      const rest = message.replace("\u{1F95A} ", "");
      if (this.groupStack.length == 1) {
        const t = this.formatLines(this.topLines);
        debugger;
        console.warn(
          "Ignoring extra groupEnd() called in contract script\n" + t.join("\n")
        );
      } else {
        this.currentGroup.result = rest;
        this.groupStack.pop();
      }
      return this;
    }
    if ("string" != typeof message) {
      console.log("wtf");
    }
    this.lastMessage = message;
    this.currentGroup.lines.push(...message.split("\n"));
    return this;
  }
  get currentGroup() {
    const group = this.groupStack.at(-1);
    if (!group) {
      debugger;
      throw new Error("Too many groupEnd()s called in contract script");
    }
    return group;
  }
  logError(message, stack) {
    this.logPrint("\n");
    this.logPrint(
      "-".repeat((proc?.stdout?.columns || 65) - 8)
    );
    this.logPrint("--- \u26A0\uFE0F  ERROR: " + message.trimStart() + "\n");
    this.logPrint(
      "-".repeat((proc?.stdout?.columns || 65) - 8) + "\n"
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
  // formatGroupedOutput() {
  //     const content: string[] = [];
  //     const terminalWidth = process?.stdout?.columns || 65;
  //     for (const group of this.groupStack) {
  //         content.push(... this.formatGroup(group));
  //         let {name, lines} = group;
  //         if (name) name = `  ${name}  `;
  //         const groupHeader = `╭${name}`;
  //         content.push(groupHeader);
  //         content.push(lines.map(line => ` │ ${line}`).join("\n"));
  //         let lastLine = lines.at(-1)
  //         if (lastLine && lastLine.startsWith("╰")) {
  //             lastLine = `╰ ${lastLine.slice(1)}`;
  //         }
  //         content.push(lastLine);
  //     }
  // }
  formatGroup(group) {
    let { name, lines, result = "" } = group;
    const terminalWidth = proc?.stdout?.columns || 65;
    const content = [];
    const groupHeader = `${name}`;
    const formattedLines = this.formatLines(lines);
    const indentedLines = formattedLines.map((line) => `  \u2502 ${line}`);
    {
      content.push(groupHeader);
      content.push(...indentedLines);
    }
    const lastLine = formattedLines.at(-1);
    const happySimpleResult = result && result == "\u2705" ? "\u2705" : "";
    const noResult = !result;
    const noResultClosingLine = noResult ? "\u2508".repeat(terminalWidth - 5) : "";
    if ((noResult || happySimpleResult) && lastLine && lastLine?.match(/^\s+╰/)) {
      const innerLine = lastLine.replace(/^\s+/, "");
      const marker = happySimpleResult || "\u2508";
      let replacementLastLine = `  \u2570${marker} ${innerLine}`;
      if (replacementLastLine.length > terminalWidth) {
        const tooMuch = replacementLastLine.length - terminalWidth;
        if (replacementLastLine.endsWith("\u2508".repeat(tooMuch))) {
          replacementLastLine = replacementLastLine.slice(0, -tooMuch);
        }
      }
      {
        content.splice(-1, 1, replacementLastLine);
      }
    } else if ((happySimpleResult || noResult) && lastLine?.match(/^\s*✅/)) {
      const replacementLastLine = `  \u2570 ${lastLine.replace(/^\s+/, "")}`;
      {
        content.splice(-1, 1, replacementLastLine);
      }
    } else if (result) {
      const extraClosingLine = `  \u2570 ${result}`;
      content.push(extraClosingLine);
    } else {
      const extraClosingLine = `  \u2570${noResultClosingLine}`;
      content.push(extraClosingLine);
    }
    return content;
  }
  formatLines(lines) {
    const content = [];
    for (const line of lines) {
      if (typeof line == "string") {
        content.push(line);
      } else {
        content.push(...this.formatGroup(line));
      }
    }
    content.at(-1)?.replace(/\n+$/, "");
    while (content.at(-1)?.match(/^\n?$/)) {
      content.pop();
    }
    return content;
  }
  flushLines(footerString) {
    let content = [];
    const terminalWidth = proc?.stdout?.columns || 65;
    const formattedLines = this.formatLines(this.topLines);
    this.history.push(formattedLines.join("\n"));
    if (!this.didStart) {
      this.didStart = true;
      content.push("\u256D\u2508\u2508\u2508\u252C" + "\u2508".repeat(terminalWidth - 5) + "\n");
      this.resetDots();
    } else if (this.topLines.length) {
      content.push("\u251C\u2508\u2508\u2508\u253C" + "\u2508".repeat(terminalWidth - 5) + "\n");
      this.resetDots();
    }
    for (const line of formattedLines) {
      content.push(`${this.showDot()}${line}
`);
    }
    content.push(this.showDot() + "\n");
    if (!this.toggler) {
      content.push(this.showDot() + "\n");
    }
    if (footerString) {
      content.push(footerString);
    }
    const joined = content.join("");
    this.formattedHistory.push(joined);
    console.log(joined);
    this.groupStack = [{
      name: "",
      lines: []
    }];
  }
  finish() {
    this.flushLines(
      "\u2570\u2508\u2508\u2508\u2534" + "\u2508".repeat((proc?.stdout?.columns || 65) - 5)
    );
    return this;
  }
  get groupLines() {
    return this.groupStack.at(-1)?.lines || [];
  }
  flush() {
    if (this.topLines.length) {
      if (this.lastMessage.at(-1) != "") {
        this.groupLines.push("");
      }
      this.flushLines();
    }
    return this;
  }
  flushError(message = "") {
    if (this.lastMessage.at(-1) != "\n") {
      this.groupLines.push("\n");
    }
    if (message.at(-1) == "\n") {
      message = message.slice(0, -1);
    }
    const terminalWidth = proc?.stdout?.columns || 65;
    if (message) this.logError(message);
    if (this.topLines.length) {
      this.flushLines(
        "\u23BD\u23BC\u23BB\u23BA\u23BB\u23BA\u23BC\u23BC\u23BB\u23BA\u23BB\u23BD\u23BC\u23BA\u23BB\u23BB\u23BA\u23BC\u23BC\u23BB\u23BA".repeat((terminalWidth - 2) / 21)
      );
    }
    return this;
  }
}

const nanoid = customAlphabet("0123456789abcdefghjkmnpqrstvwxyz", 12);
//!!! if we could access the inputs and outputs in a building Tx,
const emptyUuts = Object.freeze({});
class StellarTxnContext {
  kind = "StellarTxnContext";
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
    const [policy, tokens, r = { redeemer: void 0 }] = args;
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
            const cpuSlush = BigInt(250000000n);
            const memSlush = BigInt(50000n);
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
    return this.buildAndQueueAll(options).then((batch) => {
      return batch;
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
        description: this.txnName ? this.txnName : "\u2039unnamed tx\u203A",
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
            return this.currentBatch;
          });
        }
        return this.currentBatch;
      });
    } else if (this.state.addlTxns) {
      if (this.isFacade) {
        this.currentBatch.$txInfo(this.id)?.transition("isFacade");
      }
      console.log(
        `\u{1F384}\u26C4\u{1F381} ${this.id}   -- B&QA - registering txns in facade`
      );
      return this.queueAddlTxns(generalSubmitOptions).then(() => {
        return this.currentBatch;
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
      logger.logPrint(`\u26A0\uFE0F  txn validation failed: ${description}
${errMsg}
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
    logger.logPrint(`end: ${description}`);
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

let p = typeof process == "undefined" ? {
  platform: "browser",
  argv: [],
  env: {}
} : process, argv = p.argv, env = p.env;
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

class TxNotNeededError extends Error {
  constructor(message) {
    super(message);
    this.name = "TxAlreadyPresentError";
  }
}
function isLibraryMatchedTcx(arg) {
  if (arg instanceof StellarTxnContext) {
    return true;
  }
  if (arg.kind === "StellarTxnContext") {
    throw new Error("Stellar Contracts: library mismatch detected.  Ensure you're using only one version of the library");
  }
  return false;
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

const { magenta } = colors;
class SimpleWallet_stellar {
  networkCtx;
  spendingPrivateKey;
  spendingPubKey;
  stakingPrivateKey;
  stakingPubKey;
  get cardanoClient() {
    return this.networkCtx.network;
  }
  static fromPhrase(phrase, networkCtx, dict = BIP39_DICT_EN) {
    return SimpleWallet_stellar.fromRootPrivateKey(
      restoreRootPrivateKey(phrase, dict),
      networkCtx
    );
  }
  static fromRootPrivateKey(key, networkCtx) {
    return new SimpleWallet_stellar(
      networkCtx,
      key.deriveSpendingKey(),
      key.deriveStakingKey()
    );
  }
  constructor(networkCtx, spendingPrivateKey, stakingPrivateKey = void 0) {
    this.networkCtx = networkCtx;
    this.spendingPrivateKey = spendingPrivateKey;
    this.spendingPubKey = this.spendingPrivateKey.derivePubKey();
    this.stakingPrivateKey = stakingPrivateKey;
    this.stakingPubKey = this.stakingPrivateKey?.derivePubKey();
  }
  get privateKey() {
    return this.spendingPrivateKey;
  }
  get pubKey() {
    return this.spendingPubKey;
  }
  get spendingPubKeyHash() {
    return this.spendingPubKey.hash();
  }
  get stakingPubKeyHash() {
    return this.stakingPubKey?.hash();
  }
  get address() {
    return makeAddress(
      this.cardanoClient.isMainnet(),
      this.spendingPubKeyHash,
      this.stakingPubKey?.hash()
    );
  }
  get stakingAddress() {
    if (this.stakingPubKey) {
      return makeStakingAddress(
        this.cardanoClient.isMainnet(),
        this.stakingPubKey.hash()
      );
    } else {
      return void 0;
    }
  }
  get stakingAddresses() {
    return new Promise((resolve, _) => {
      const stakingAddress = this.stakingAddress;
      resolve(stakingAddress ? [stakingAddress] : []);
    });
  }
  async isMainnet() {
    return this.networkCtx.network.isMainnet();
  }
  /**
   * Assumed wallet was initiated with at least 1 UTxO at the pubkeyhash address.
   */
  get usedAddresses() {
    return new Promise((resolve, _) => {
      resolve([this.address]);
    });
  }
  get unusedAddresses() {
    return new Promise((resolve, _) => {
      resolve([]);
    });
  }
  get utxos() {
    return new Promise((resolve, _) => {
      resolve(this.cardanoClient.getUtxos(this.address));
    });
  }
  get collateral() {
    return new Promise((resolve, _) => {
      resolve([]);
    });
  }
  async signData(addr, data) {
    const spendingCredential = addr.spendingCredential;
    const stakingCredential = addr.stakingCredential;
    if (stakingCredential) {
      if (!addr.isEqual(this.address)) {
        throw new Error(
          "givend address doesn't correspond to SimpleWallet's address"
        );
      }
      const pubKey = expectDefined(this.stakingPubKey);
      const privateKey = expectDefined(this.stakingPrivateKey);
      return {
        signature: signCip30CoseData(addr, privateKey, data),
        key: pubKey
      };
    } else {
      if (!spendingCredential.isEqual(this.address.spendingCredential)) {
        throw new Error(
          "given address.spendingCredential doesn't correspond to SimpleWallet's spending credential"
        );
      }
      return {
        signature: signCip30CoseData(
          addr,
          this.spendingPrivateKey,
          data
        ),
        key: this.spendingPubKey
      };
    }
  }
  /**
   * Simply assumed the tx needs to by signed by this wallet without checking.
   */
  async signTx(tx) {
    return [this.spendingPrivateKey.sign(tx.body.hash())];
  }
  async submitTx(tx) {
    return await this.cardanoClient.submitTx(tx);
  }
}
let i = 1;
class StellarNetworkEmulator {
  #seed;
  #random;
  genesis;
  mempool;
  blocks;
  /**
   * Cached map of all UTxOs ever created
   * @internal
   */
  _allUtxos;
  /**
   * Cached set of all UTxOs ever consumed
   * @internal
   */
  _consumedUtxos;
  /**
   * Cached map of UTxOs at addresses
   * @internal
   */
  _addressUtxos;
  id;
  params;
  /**
   * Instantiates a NetworkEmulator at slot 0.
   * An optional seed number can be specified, from which all EMULATED RANDOMNESS is derived.
   */
  constructor(seed = 0, { params } = {
    params: DEFAULT_NETWORK_PARAMS()
  }) {
    this.id = i++;
    this.params = params || DEFAULT_NETWORK_PARAMS();
    this.#seed = seed;
    this.currentSlot = 0;
    this.#random = this.mulberry32.bind(this);
    this.genesis = [];
    this.mempool = [];
    this.blocks = [];
    this._allUtxos = {};
    this._consumedUtxos = /* @__PURE__ */ new Set();
    this._addressUtxos = {};
    this.initHelper();
  }
  isMainnet() {
    return false;
  }
  /**
   * Each slot is assumed to be 1000 milliseconds
   *
   * returns milliseconds since start of emulation
   */
  get now() {
    return SECOND * this.currentSlot;
  }
  get parameters() {
    return new Promise((resolve, _) => resolve(this.parametersSync));
  }
  get parametersSync() {
    return {
      ...this.params,
      refTipSlot: this.currentSlot,
      refTipTime: this.now
    };
  }
  /**
   * retains continuity for the seed and the RNG through one or more snapshots.
   * @internal
   */
  mulberry32 = () => {
    //!!mutates vvvvvvvvvv this.#seed
    let t = this.#seed += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  netPHelper;
  initHelper() {
    this.netPHelper = makeNetworkParamsHelper(this.parametersSync);
    return this.netPHelper;
  }
  /**
   * Ignores the genesis txs
   */
  get txIds() {
    const res = [];
    for (let block of this.blocks) {
      for (let tx of block) {
        if (tx.kind == "Regular") {
          res.push(tx.id());
        }
      }
    }
    return res;
  }
  snapshot(snapName) {
    if (this.mempool.length > 0) {
      throw new Error(`can't snapshot with pending txns`);
    }
    console.log(
      `        .---.
        |[X]|
 _.==._.""""".___n__
/ __ ___.-''-. _____b
|[__]  /."""".\\ _   |
|     // /""\\ \\\\_)  |
|     \\\\ \\__/ //    |
|      \\\`.__.'/     |
\\=======\`-..-'======/
 \`-----------------'   
            \u{1F4F8} \u{1F4F8} \u{1F4F8}   \u2588\u2588\u2588\u2588  \u{1F4F8} \u{1F4F8} \u{1F4F8}  #` + this.id,
      ` - snapshot '${snapName}' at slot `,
      this.currentSlot.toString(),
      "height ",
      this.blocks.length
    );
    return {
      name: snapName,
      seed: this.#seed,
      netNumber: this.id,
      slot: this.currentSlot,
      genesis: [...this.genesis],
      blocks: [...this.blocks],
      allUtxos: { ...this._allUtxos },
      consumedUtxos: new Set(this._consumedUtxos),
      addressUtxos: Object.fromEntries(
        Object.entries(this._addressUtxos).map(([addr, utxoList]) => [
          addr,
          [...utxoList]
        ])
      )
    };
  }
  fromSnapshot = "";
  loadSnapshot(snapshot) {
    this.#seed = snapshot.seed;
    this.currentSlot = snapshot.slot;
    this.genesis = [...snapshot.genesis];
    this.blocks = [...snapshot.blocks];
    this.fromSnapshot = snapshot.name;
    this._allUtxos = { ...snapshot.allUtxos };
    this._consumedUtxos = new Set(snapshot.consumedUtxos);
    this._addressUtxos = Object.fromEntries(
      Object.entries(snapshot.addressUtxos).map(([addr, utxoList]) => [
        addr,
        [...utxoList]
      ])
    );
    this.initHelper();
    console.log(
      `
      .--.             .--.             .--.             .--.       
    .'_\\/_'.         .'_\\/_'.         .'_\\/_'.         .'_\\/_'.     
    '. /\\ .'         '. /\\ .'         '. /\\ .'         '. /\\ .'     
      "||"             "||"             "||"             "||"       
       || /\\            || /\\            || /\\            || /\\     
    /\\ ||//\\)        /\\ ||//\\)        /\\ ||//\\)        /\\ ||//\\)    
   (/\\\\||/          (/\\\\||/          (/\\\\||/          (/\\\\||/       
______\\||/_____________\\||/_____________\\||/_____________\\||/_______
            \u{1F33A}\u{1F33A}\u{1F33A} \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588  # ${this.id}
`,
      ` - restored snapshot '${snapshot.name}' from #${snapshot.netNumber} at slot `,
      this.currentSlot.toString(),
      "height ",
      this.blocks.length
    );
  }
  // /**
  //  * Creates a new `NetworkParams` instance that has access to current slot
  //  * (so that the `Tx` validity range can be set automatically during `Tx.finalize()`).
  //  */
  // initNetworkParams(networkParams): NetworkParams {
  //     const raw = Object.assign({}, networkParams.raw);
  //     // raw.latestTip = {
  //     //     epoch: 0,
  //     //     hash: "",
  //     //     slot: 0,
  //     //     time: 0,
  //     // };
  //     return (this.#netParams = new NetworkParams(raw, () => {
  //         return this.currentSlot;
  //     }));
  // }
  /**
   * Creates a new SimpleWallet and populates it with a given lovelace quantity and assets.
   * Special genesis transactions are added to the emulated chain in order to create these assets.
   * @deprecated - use TestHelper.createWallet instead, enabling wallets to be transported to
   *     different networks (e.g. ones that have loaded snapshots from the original network).
   */
  createWallet(lovelace = 0n, assets = makeAssets([])) {
    throw new Error("use TestHelper.createWallet instead");
  }
  /**
   * Creates a UTxO using a GenesisTx.  The txn doesn't need to balance or be signed.  It's magic.
   * @param wallet - the utxo is created at this wallet's address
   * @param lovelace - the lovelace amount to create
   * @param assets - other assets to include in the utxo
   */
  createUtxo(wallet, lovelace, assets = makeAssets([])) {
    if (lovelace != 0n || !assets.isZero()) {
      const tx = makeEmulatorGenesisTx(
        this.genesis.length,
        wallet.address,
        lovelace,
        assets
      );
      this.genesis.push(tx);
      this.mempool.push(tx);
      return makeTxOutputId(tx.id(), 0);
    } else {
      throw new Error("zero-value utxos not supported");
    }
  }
  // #netParams!: NetworkParams;
  // async getParameters() {
  //     if (this.#netParams) return this.#netParams;
  //     return this.initNetworkParams(
  //         new NetworkParams(rawNetworkEmulatorParams)
  //     );
  // }
  warnMempool() {
    if (this.mempool.length > 0) {
      console.error(
        "Warning: mempool not empty (hint: use 'network.tick()')"
      );
    }
  }
  /**
   * Throws an error if the UTxO isn't found
   */
  async getUtxo(id) {
    this.warnMempool();
    const utxo = this._allUtxos[id.toString()];
    if (!utxo) {
      throw new Error(`utxo with id ${id.toString()} doesn't exist`);
    } else {
      return utxo;
    }
  }
  /*
   * @param {TxOutputId} id
   * @returns {Promise<TxInput>}
   */
  async hasUtxo(id) {
    try {
      return !!await this.getUtxo(id);
    } catch (e) {
      return false;
    }
  }
  async getUtxos(address) {
    this.warnMempool();
    return this._addressUtxos[address.toString()] ?? [];
  }
  isSubmissionExpiryError(e) {
    if (e.message.match(/slot out of range/)) return true;
    return false;
  }
  isUnknownUtxoError(e) {
    if (e.message.match(/previously consumed/)) return true;
    if (e.message.match(/don't exist/)) return true;
    return false;
  }
  dump() {
    console.log(`${this.blocks.length} BLOCKS`);
    this.blocks.forEach((block, i2) => {
      console.log(`${block.length} TXs in BLOCK ${i2}`);
      for (let tx of block) {
        tx.dump();
      }
    });
  }
  isConsumed(utxo) {
    return this._consumedUtxos.has(utxo.id.toString()) || this.mempool.some((tx) => {
      return tx.consumes(utxo);
    });
  }
  async submitTx(tx) {
    this.warnMempool();
    if (!tx.isValidSlot(BigInt(this.currentSlot))) {
      debugger;
      throw new Error(
        `tx invalid (slot out of range, ${this.currentSlot} not in ${tx.body.getValidityTimeRange(this.parametersSync).toString()})`
      );
    }
    if (!tx.body.inputs.every(
      (input) => input.id.toString() in this._allUtxos
    )) {
      throw new Error("some inputs don't exist");
    }
    if (!tx.body.refInputs.every(
      (input) => input.id.toString() in this._allUtxos
    )) {
      throw new Error("some ref inputs don't exist");
    }
    for (const input of tx.body.inputs) {
      if (this.isConsumed(input)) {
        throw new Error(
          `## ${this.id}: input previously consumed:` + dumpAny$1(input)
        );
      }
    }
    this.mempool.push(makeEmulatorRegularTx(tx));
    console.log(
      `[EmuNet #${this.id}] +mempool txn = ${this.mempool.length}`
    );
    return tx.id();
  }
  /**
   * Mint a block with the current mempool, and advance the slot by a number of slots.
   */
  tick(nSlots) {
    const n = BigInt(nSlots);
    if (n < 1) throw new Error(`nSlots must be > 0, got ${n.toString()}`);
    const count = this.mempool.length;
    this.currentSlot += Number(n);
    const time = new Date(
      Number(this.netPHelper.slotToTime(this.currentSlot))
    );
    if (this.mempool.length > 0) {
      const txIds = this.mempool.map((tx) => {
        const t = tx.id().toString();
        return `${t.substring(0, 2)}...${t.substring(t.length - 4)}`;
      });
      this.pushBlock(this.mempool);
      const height = this.blocks.length;
      this.mempool = [];
      console.log(
        magenta(`\u2588\u2588\u2588${"\u2592".repeat(
          count
        )} ${count} txns (${txIds.join(",")}) -> slot ${this.currentSlot.toString()} = ${formatDate(
          time
        )} @ht=${height}`)
      );
    } else {
      console.log(
        magenta(`tick -> slot ${this.currentSlot.toString()} = ${formatDate(
          time
        )} (no txns)`)
      );
    }
  }
  /**
   * @internal
   */
  pushBlock(txs) {
    this.blocks.push(txs);
    txs.forEach((tx) => {
      tx.newUtxos().forEach((utxo) => {
        const key = utxo.id.toString();
        this._allUtxos[key] = utxo;
        const addr = utxo.address.toString();
        if (addr in this._addressUtxos) {
          this._addressUtxos[addr].push(utxo);
        } else {
          this._addressUtxos[addr] = [utxo];
        }
      });
      tx.consumedUtxos().forEach((utxo) => {
        this._consumedUtxos.add(utxo.id.toString());
        const addr = utxo.address.toString();
        if (addr in this._addressUtxos) {
          this._addressUtxos[addr] = this._addressUtxos[addr].filter(
            (inner) => !inner.isEqual(utxo)
          );
        }
      });
    });
  }
}
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

class StellarTestHelper {
  state;
  config;
  defaultActor;
  strella;
  actors;
  optimize = false;
  netPHelper;
  networkCtx;
  _actorName;
  /**
   * @public
   */
  get actorName() {
    return this._actorName;
  }
  /**
   * @public
   */
  get network() {
    return this.networkCtx.network;
  }
  /**
   * Gets the current actor wallet
   *
   * @public
   **/
  get wallet() {
    const wallet = this.actorContext.wallet;
    if (!wallet) {
      throw new Error(`no current actor; use setActor(actorName) first`);
    }
    return wallet;
  }
  /**
   * @public
   */
  actorContext = {
    others: {},
    wallet: void 0
  };
  /**
   * @public
   */
  async setActor(actorName) {
    const thisActor = this.actors[actorName];
    if (!thisActor)
      throw new Error(
        `setCurrentActor: network #${this.network.id}: invalid actor name '${actorName}'
   ... try one of: 
  - ` + Object.keys(this.actors).join(",\n  - ")
      );
    if (this._actorName) {
      if (actorName == this._actorName) {
        if (this.actorContext.wallet !== thisActor) {
          throw new Error(
            `actor / wallet mismatch: ${this._actorName} ${dumpAny$1(
              this.actorContext.wallet?.address
            )} vs ${actorName} ${dumpAny$1(thisActor.address)}`
          );
        }
        return;
      }
      console.log(
        `
\u{1F3AD} -> \u{1F3AD} changing actor from \u{1F3AD} ${this._actorName} to  \u{1F3AD} ${actorName} ${dumpAny$1(thisActor.address)}`
      );
    } else {
      console.log(
        `
\u{1F3AD}\u{1F3AD} initial actor ${actorName} ${dumpAny$1(
          thisActor.address
        )}`
      );
    }
    this._actorName = actorName;
    this.actorContext.wallet = thisActor;
  }
  address;
  setupPending;
  /**
   * @public
   */
  async setupActors() {
    console.warn(
      `using 'hiro' as default actor because ${this.constructor.name} doesn't define setupActors()`
    );
    this.addActor("hiro", 1863n * ADA);
  }
  /**
   * @public
   */
  setDefaultActor() {
    return this.setActor("hiro");
  }
  helperState;
  constructor(config, helperState) {
    this.state = {};
    if (!helperState) {
      console.warn(
        // warning emoji: "⚠️"
        // info emoji: "ℹ️"
        `\u26A0\uFE0F \u26A0\uFE0F \u26A0\uFE0F Note: this test helper doesn't have a helperState, so it won't be able to use test-chain snapshots
\u2139\uFE0F \u2139\uFE0F \u2139\uFE0F ... to add helper state, follow this pattern:

    // in your test helper:

    @CapoTestHelper.hasNamedSnapshot("yourSnapshot", "tina")
    snapTo\u2039YourSnapshot\u203A() {
        // never called
    }
    async \u2039yourSnapshot\u203A() {
        this.setActor("tina");

        // ... your good sequence of transaction(s) here
        const tcx = this.capo.mkTxn\u2039...\u203A(...)
        return this.submitTxnWithBlock(tcx);
    }

    // in your test setup:

    type localTC = StellarTestContext<YourCapo>;
    let helperState: TestHelperState<YourCapo> = {
        snapshots: {},
    } as any;

    beforeEach<localTC>(async (context) => {
        await addTestContext(context,
            YourCapoTestHelper,
            undefined,
            helperState
        )
    }                

    // in your tests:
    
    describe("your thing", async () => {
        it("your test", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
            await h.reusableBootstrap();

            await h.snapTo\u2039yourSnapshot\u203A()
        });
        it("your other test", async (context: localTC) => { 
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
            // this one will use the snapshot generated earlier
            await h.snapTo\u2039yourSnapshot\u203A()
        });
    })

... happy (and snappy) testing!`
      );
    }
    this.helperState = helperState;
    const cfg = config || {};
    if (Object.keys(cfg).length) {
      console.log(
        "XXXXXXXXXXXXXXXXXXXXXXXXXX test helper with config",
        config
      );
      this.config = config;
    }
    const t = this.mkNetwork(this.fixupParams(DEFAULT_NETWORK_PARAMS()));
    const theNetwork = t[0];
    const netParamsHelper = t[1];
    this.netPHelper = netParamsHelper;
    this.networkCtx = {
      network: theNetwork
    };
    this.randomSeed = config?.randomSeed || 42;
    this.actors = {};
    const now = /* @__PURE__ */ new Date();
    this.waitUntil(now);
    console.log(" + StellarTestHelper");
  }
  /**
   * @public
   */
  fixupParams(preProdParams) {
    if (preProdParams.isFixedUp) return preProdParams;
    const origMaxTxSize = preProdParams.maxTxSize;
    preProdParams.origMaxTxSize = origMaxTxSize;
    const maxTxSize = Math.floor(origMaxTxSize * 5);
    console.log(
      "test env: \u{1F527}\u{1F527}\u{1F527} fixup max tx size",
      origMaxTxSize,
      " -> \u{1F527}",
      maxTxSize
    );
    preProdParams.maxTxSize = maxTxSize;
    const origMaxMem = preProdParams.maxTxExMem;
    preProdParams.origMaxTxExMem = origMaxMem;
    const maxMem = Math.floor(origMaxMem * 8);
    console.log(
      "test env: \u{1F527}\u{1F527}\u{1F527} fixup max memory",
      origMaxMem,
      " -> \u{1F527}",
      maxMem
    );
    preProdParams.maxTxExMem = maxMem;
    const origMaxCpu = preProdParams.maxTxExCpu;
    preProdParams.origMaxTxExCpu = origMaxCpu;
    const maxCpu = Math.floor(origMaxCpu * 3.1);
    console.log(
      "test env: \u{1F527}\u{1F527}\u{1F527} fixup max cpu",
      origMaxCpu,
      " -> \u{1F527}",
      maxCpu
    );
    preProdParams.maxTxExCpu = maxCpu;
    preProdParams.isFixedUp = true;
    return preProdParams;
  }
  /**
   * Submits a transaction and advances the network block
   * @public
   * @param TCX - The type of transaction context state, must extend anyState
   */
  async submitTxnWithBlock(tcx, options = {}) {
    const t = await tcx;
    await this.advanceNetworkTimeForTx(t, options.futureDate);
    return t.buildAndQueueAll(options).then(() => {
      this.network.tick(1);
      return tcx;
    });
  }
  /**
   * @public
   */
  async advanceNetworkTimeForTx(tcx, futureDate) {
    let validFrom = 0, validTo = 0;
    let targetTime = futureDate?.getTime() || Date.now();
    let targetSlot = this.netPHelper.timeToSlot(BigInt(targetTime));
    const nph = this.netPHelper;
    if (tcx.isFacade && !futureDate) {
      console.log("not advancing network time for facade tx");
      return;
    } else if (!tcx.isFacade) {
      validFrom = (() => {
        const { slot, timestamp } = tcx.txb.validFrom?.left || {};
        if (slot) return slot;
        if (!timestamp) return void 0;
        return nph.timeToSlot(BigInt(timestamp));
      })();
      validTo = (() => {
        const { slot, timestamp } = tcx.txb.validFrom?.left || {};
        if (slot) return slot;
        if (!timestamp) return void 0;
        return nph.timeToSlot(BigInt(timestamp));
      })();
    }
    const currentSlot = this.network.currentSlot;
    const nowSlot = nph.timeToSlot(BigInt(Date.now()));
    const slotDiff = targetSlot - currentSlot;
    const validInPast = validTo && nowSlot > validTo;
    const validInFuture = validFrom && nowSlot < validFrom;
    tcx.logger.logPrint(
      `
    ---- \u2697\uFE0F \u{1F41E}\u{1F41E} advanceNetworkTimeForTx: tx valid ${validFrom || "anytime"} -> ${validTo || "anytime"}`
    );
    function withPositiveSign(x) {
      return x < 0 ? `${x}` : `+${x}`;
    }
    const currentToNowDiff = withPositiveSign(nowSlot - currentSlot);
    const currentToTargetDiff = withPositiveSign(slotDiff);
    let effectiveNetworkSlot = targetSlot;
    function showEffectiveNetworkSlotTIme() {
      tcx.logger.logPrint(
        `
    \u2697\uFE0F \u{1F41E}\u2139\uFE0F  with now=network slot ${effectiveNetworkSlot}: ${nph.slotToTime(
          effectiveNetworkSlot
        )}
           tx valid ${validFrom ? withPositiveSign(effectiveNetworkSlot - validFrom) : "anytime"} -> ${validTo ? withPositiveSign(effectiveNetworkSlot - validTo) : "anytime"} from now`
      );
    }
    if (validInPast || validInFuture) {
      tcx.logger.logPrint(
        "\n  \u2697\uFE0F \u{1F41E}\u2139\uFE0F  advanceNetworkTimeForTx: " + (tcx.txnName || "")
      );
      if (futureDate) {
        debugger;
        tcx.logger.logPrint(
          `
    ---- \u2697\uFE0F \u{1F41E}\u{1F41E} explicit futureDate ${futureDate.toISOString()} -> slot ${targetSlot}`
        );
      }
      tcx.logger.logPrint(
        `
    ---- \u2697\uFE0F \u{1F41E}\u{1F41E} current slot ${currentSlot} ${currentToNowDiff} = now slot ${nowSlot} 
                    current ${currentToTargetDiff} = targetSlot ${targetSlot}`
      );
      if (futureDate) {
        tcx.logger.logPrint(
          `
    ---- \u2697\uFE0F \u{1F41E}\u2139\uFE0F  txnTime ${validInPast ? "already in the past" : validInFuture ? "not yet valid" : "\u2039??incontheevable??\u203A"}; advancing to explicit futureDate @now + ${targetSlot - nowSlot}s`
        );
      } else {
        tcx.logger.logPrint(
          `
    -- \u2697\uFE0F \u{1F41E} txnTime ${validInPast ? "already in the past" : validInFuture ? "not yet valid" : "\u2039??incontheevable??\u203A"}; no futureDate specified; not interfering with network time`
        );
        effectiveNetworkSlot = nowSlot;
        showEffectiveNetworkSlotTIme();
        tcx.logger.flush();
        return;
      }
    }
    if (slotDiff < 0) {
      effectiveNetworkSlot = nowSlot;
      showEffectiveNetworkSlotTIme();
      if (futureDate) {
        tcx.logger.logPrint(
          `
    ------ \u2697\uFE0F \u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}can't go back in time ${slotDiff}s (current slot ${this.network.currentSlot}, target ${targetSlot})`
        );
        throw new Error(
          `explicit futureDate ${futureDate} is in the past; can't go back ${slotDiff}s`
        );
      }
      tcx.logger.logPrint(
        `
   -- \u2697\uFE0F \u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u2697\uFE0F  NOT ADVANCING: the network is already ahead of the current time by ${0 - slotDiff}s \u2697\uFE0F \u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u2697\uFE0F`
      );
      tcx.logger.flush();
      return;
    }
    if (this.network.currentSlot < targetSlot) {
      effectiveNetworkSlot = targetSlot;
      tcx.logger.logPrint(
        `
    \u2697\uFE0F \u{1F41E}\u2139\uFE0F  advanceNetworkTimeForTx ${withPositiveSign(
          slotDiff
        )} slots`
      );
      showEffectiveNetworkSlotTIme();
      this.network.tick(slotDiff);
    } else {
      effectiveNetworkSlot = currentSlot;
      showEffectiveNetworkSlotTIme();
    }
    tcx.logger.flush();
  }
  /**
   * @public
   */
  async initialize({
    randomSeed = 42
  } = {}) {
    console.log("STINIT");
    debugger;
    if (this.strella && this.randomSeed == randomSeed) {
      console.log(
        "       ----- skipped duplicate initialize() in test helper"
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
    } else {
      console.log(
        "???????????????????????? Test helper initializing without this.strella"
      );
    }
    console.log("STINIT2");
    await this.delay(1);
    this._actorName = "";
    if (!Object.keys(this.actors).length) {
      const actorSetup = this.setupActors();
      await actorSetup;
      this.setDefaultActor();
    }
    console.log("STINIT3");
    return this.initStellarClass();
  }
  /**
   * @public
   */
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
  setup;
  initSetup(setup = void 0) {
    setup = setup || {
      actorContext: this.actorContext,
      networkParams: this.networkParams,
      uh: void 0,
      isTest: true,
      isMainnet: false,
      optimize: process.env.OPTIMIZE ? true : this.optimize
    };
    const getNetwork = () => {
      return this.network;
    };
    const getActor = () => {
      return this.actorContext.wallet;
    };
    Object.defineProperty(setup, "network", {
      get: getNetwork,
      configurable: true
    });
    setup.txBatcher = new TxBatcher({
      setup,
      submitters: {
        get emulator() {
          return getNetwork();
        }
      },
      get signingStrategy() {
        return new GenericSigner(getActor());
      }
    }), setup.txBatcher.setup = setup;
    setup.uh = new UtxoHelper(setup);
    return this.setup = setup;
  }
  /**
   * @public
   */
  async initStrella(TargetClass, config) {
    process.env.OPTIMIZE;
    const setup = this.initSetup();
    let cfg = {
      setup,
      config
    };
    if (!config)
      cfg = {
        setup,
        partialConfig: {}
      };
    if (setup.actorContext.wallet) {
      console.log(
        "+strella init with actor addr",
        setup.actorContext.wallet.address.toBech32()
      );
    } else {
      debugger;
      console.log("+strella init without actor");
    }
    return TargetClass.createWith(cfg);
  }
  //! it has a seed for mkRandomBytes, which must be set by caller
  randomSeed;
  //! it makes a rand() function based on the randomSeed after first call to mkRandomBytes
  rand;
  /**
   * @public
   */
  delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }
  /**
   * Creates a new SimpleWallet and populates it with a given lovelace quantity and assets.
   * Special genesis transactions are added to the emulated chain in order to create these assets.
   * @public
   */
  createWallet(lovelace = 0n, assets = makeAssets([])) {
    const wallet = SimpleWallet_stellar.fromRootPrivateKey(
      makeRootPrivateKey(generateBytes(this.network.mulberry32, 32)),
      this.networkCtx
    );
    this.network.createUtxo(wallet, lovelace, assets);
    return wallet;
  }
  /**
   * @public
   */
  async submitTx(tx, force) {
    this.wallet?.address;
    const isAlreadyInitialized = !!this.strella;
    if (isAlreadyInitialized && !force) {
      throw new Error(
        `helper is already initialized; use the submitTx from the testing-context's 'strella' object instead`
      );
    }
    console.log(
      `Test helper ${force || ""} submitting tx${" prior to instantiateWithParams()"}:
` + txAsString$1(tx, this.networkParams)
      // new Error(`at stack`).stack
    );
    try {
      const txId = await this.network.submitTx(tx);
      console.log(
        "test helper submitted direct txn:" + txAsString$1(tx, this.networkParams)
      );
      this.network.tick(1);
      return txId;
    } catch (e) {
      console.error(
        `submit failed: ${e.message}
  ... in tx ${txAsString$1(tx)}`
      );
      throw e;
    }
  }
  /**
   * @public
   */
  mkRandomBytes(length) {
    if (!this.randomSeed)
      throw new Error(
        `test must set context.randomSeed for deterministic randomness in tests`
      );
    if (!this.rand) this.rand = mulberry32(this.randomSeed);
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
    const a = this.createWallet(walletBalance);
    const addr = a.address.toString();
    console.log(
      `+\u{1F3AD} Actor: ${roleName}: ${addr.slice(0, 12)}\u2026${addr.slice(
        -4
      )} ${lovelaceToAda$1(walletBalance)} (\u{1F511}#${a.address.spendingCredential?.toHex().substring(0, 8)}\u2026)`
    );
    this.actorContext.others[roleName] = a;
    //! it makes collateral for each actor, above and beyond the initial balance,
    const five = 5n * ADA;
    if (0 == moreUtxos.length) moreUtxos = [five, five, five];
    for (const moreLovelace of moreUtxos) {
      if (moreLovelace > 0n) {
        this.network.createUtxo(a, moreLovelace);
      }
    }
    this.actors[roleName] = a;
    return a;
  }
  //todo use this for enabling prettier diagnostics with clear labels for
  //  -- actor addresses -> names
  //  -- script addresses -> names
  addrRegistry = {};
  /**
   * @public
   */
  get networkParams() {
    return this.netPHelper.params;
  }
  /**
   * @public
   */
  mkNetwork(params) {
    const theNetwork = new StellarNetworkEmulator(void 0, { params });
    const emuParams = theNetwork.initHelper();
    return [theNetwork, emuParams];
  }
  /**
   * @public
   */
  slotToTime(s) {
    return this.netPHelper.slotToTime(s);
  }
  /**
   * @public
   */
  currentSlot() {
    return this.network.currentSlot;
  }
  /**
   * @public
   */
  waitUntil(time) {
    const targetTimeMillis = BigInt(time.getTime());
    const targetSlot = this.netPHelper.timeToSlot(targetTimeMillis);
    const c = this.currentSlot();
    const slotsToWait = targetSlot - (c || 0);
    if (slotsToWait < 1) {
      throw new Error(`the indicated time is not in the future`);
    }
    this.network.tick(slotsToWait);
    return slotsToWait;
  }
}

const ACTORS_ALREADY_MOVED = "NONE! all actors were moved from a different network via snapshot";
const SNAP_BOOTSTRAP = "bootstrapped";
class CapoTestHelper extends StellarTestHelper {
  get capo() {
    return this.strella;
  }
  featureFlags = void 0;
  constructor(config, helperState) {
    if (!config) {
      super(config, helperState);
    } else {
      const { featureFlags, ...otherConfig } = config;
      if (Object.keys(otherConfig).length) {
        super(config, helperState);
      } else {
        super(void 0, helperState);
      }
      if (featureFlags) {
        this.featureFlags = featureFlags;
      }
    }
  }
  async initialize({ randomSeed = 42 } = {}, args) {
    if (this.strella && this.randomSeed == randomSeed) {
      console.log(
        "       ----- skipped duplicate initialize() in test helper"
      );
      return this.strella;
    }
    if (this.strella) {
      console.log(
        `    -- \u{1F331}\u{1F331}\u{1F331} new test helper setup with new seed (was ${this.randomSeed}, now ${randomSeed})...
` + new Error("stack").stack.split("\n").slice(1).filter(
          (line) => !line.match(/node_modules/) && !line.match(/node:internal/)
        ).join("\n")
      );
      this.strella = void 0;
      this.actors = {};
      this._actorName = "";
    }
    await this.delay(1);
    this.randomSeed = randomSeed;
    if (Object.keys(this.actors).length) {
      console.log("Skipping actor setup - already done");
    } else {
      console.log("  -- \u{1F3AD}\u{1F3AD}\u{1F3AD} actor setup...");
      const actorSetup = this.setupActors();
      await actorSetup;
      this.network.tick(1);
      await this.setDefaultActor();
    }
    this.state.mintedCharterToken = void 0;
    this.state.parsedConfig = void 0;
    //! when there's not a preset config, it leaves the detailed setup to be done just-in-time
    if (!this.config) {
      console.log("  -- Capo not yet bootstrapped");
      const ts1 = Date.now();
      const { featureFlags } = this;
      if (featureFlags) {
        this.strella = await this.initStrella(this.stellarClass, { featureFlags });
        this.strella.featureFlags = this.featureFlags;
      } else {
        this.strella = await this.initStrella(this.stellarClass);
      }
      const ts2 = Date.now();
      console.log(
        // stopwatch emoji: ⏱️
        `  -- \u23F1\uFE0F initialized Capo: ${ts2 - ts1}ms`
      );
      console.log("checking delegate scripts...");
      return this.checkDelegateScripts(args).then(() => {
        const ts3 = Date.now();
        console.log(`  -- \u23F1\uFE0F checked delegate scripts: ${ts3 - ts2}ms`);
        return this.strella;
      });
    }
    console.log("  -- Capo already bootstrapped");
    const strella = await this.initStrella(this.stellarClass, this.config);
    this.strella = strella;
    const { address, mintingPolicyHash: mph } = strella;
    const { name } = strella.program;
    console.log(
      name,
      address.toString().substring(0, 18) + "\u2026",
      "vHash \u{1F4DC} " + strella.validatorHash.toHex().substring(0, 12) + "\u2026",
      "mph \u{1F3E6} " + mph?.toHex().substring(0, 12) + "\u2026"
    );
    console.log("<- CAPO initialized()");
    return strella;
  }
  async checkDelegateScripts(args = {}) {
    throw new Error(
      `doesn't fail, because it's implemented by DefaultCapoTestHelper`
    );
  }
  get ready() {
    return !!(this.strella.configIn && !this.strella.didDryRun.configIn || this.state.parsedConfig);
  }
  /**
   * Creates a new transaction-context with the helper's current or default actor
   * @public
   **/
  mkTcx(txnName) {
    const tcx = new StellarTxnContext$1(this.strella.setup);
    if (txnName) return tcx.withName(txnName);
    return tcx;
  }
  loadSnapshot(snapName) {
    const snap = this.helperState.snapshots[snapName];
    if (!snap) throw new Error(`no snapshot named ${snapName}`);
    this.network.loadSnapshot(snap);
  }
  async reusableBootstrap(snap = SNAP_BOOTSTRAP) {
    let capo;
    const helperState = this.helperState;
    if (helperState.bootstrapped) {
      console.log("  ---  \u2697\uFE0F\u{1F41E}\u{1F41E} already bootstrapped");
      if (!helperState.previousHelper) {
        debugger;
        throw new Error(
          `already bootstrapped, but no previousHelper : ( `
        );
      }
      capo = await this.restoreFrom(snap);
    } else {
      capo = await this.bootstrap();
      helperState.bootstrappedStrella = capo;
    }
    const { previousHelper } = helperState;
    if (!previousHelper) {
      this.snapshot(SNAP_BOOTSTRAP);
    } else {
      console.log(
        `changing helper from network ${previousHelper.network.id} to ${this.network.id}`
      );
    }
    helperState.bootstrapped = true;
    helperState.previousHelper = this;
    return capo;
  }
  // a decorator for test-helper functions that generate named snapshots
  static hasNamedSnapshot(snapshotName, actorName) {
    return function(target, propertyKey, descriptor) {
      descriptor.value;
      descriptor.value = SnapWrap;
      const [_, WithCapMethodName] = propertyKey.match(/^snapTo(.*)/) || [];
      if (!WithCapMethodName) {
        throw new Error(
          `hasNamedSnapshot(): ${propertyKey}(): expected method name to start with 'snapTo'`
        );
      }
      const methodName = WithCapMethodName[0].toLowerCase() + WithCapMethodName.slice(1);
      const generateSnapshotFunc = target[methodName];
      if (!generateSnapshotFunc) {
        throw new Error(
          `hasNamedSnapshot(): ${propertyKey}: expected method ${methodName} to exist`
        );
      }
      console.log(
        "hasNamedSnapshot(): ",
        propertyKey,
        " -> ",
        methodName
      );
      async function SnapWrap(...args) {
        await this.reusableBootstrap();
        return this.findOrCreateSnapshot(
          snapshotName,
          actorName,
          () => {
            return generateSnapshotFunc.apply(this, ...args).then((result) => {
              if (this.actorName !== actorName) {
                throw new Error(
                  `snapshot ${snapshotName}: expected actor '${actorName}', but current actor is '${this.actorName}'`
                );
              }
              this.network.tick(1);
              return result;
            });
          }
        );
      }
      return descriptor;
    };
  }
  hasSnapshot(snapshotName) {
    return !!this.helperState?.snapshots[snapshotName];
  }
  snapshot(snapshotName) {
    if (!this.helperState) {
      throw new Error(`can't snapshot without a helperState`);
    }
    if (this.hasSnapshot(snapshotName)) {
      throw new Error(`snapshot ${snapshotName} already exists`);
    }
    this.helperState.snapshots[snapshotName] = this.network.snapshot(snapshotName);
  }
  async findOrCreateSnapshot(snapshotName, actorName, contentBuilder) {
    if (this.helperState.snapshots[snapshotName]) {
      const capo = await this.restoreFrom(snapshotName);
      await this.setActor(actorName);
      return capo;
    }
    let result;
    try {
      result = await contentBuilder();
      return this.strella;
      return result;
    } catch (e) {
      throw e;
    } finally {
      if (result) {
        this.snapshot(snapshotName);
      }
    }
  }
  async restoreFrom(snapshotName) {
    const {
      helperState,
      helperState: {
        snapshots,
        previousHelper,
        bootstrappedStrella
      } = {}
    } = this;
    if (!helperState)
      throw new Error(
        `can't restore from a previous helper without a helperState`
      );
    if (!bootstrappedStrella)
      throw new Error(
        `can't restore from a previous helper without a bootstrappedStrella`
      );
    if (!snapshots || !snapshots[snapshotName]) {
      throw new Error(`no snapshot named ${snapshotName} in helperState`);
    }
    if (!previousHelper) {
      throw new Error(`no previousHelper in helperState`);
    }
    const { parsedConfig } = previousHelper.state;
    const {
      networkCtx: oldNetworkEnvelope,
      actorContext: oldActorContext,
      setup: previousSetup
    } = previousHelper;
    const { network: previousNetwork } = oldNetworkEnvelope;
    const { network: newNet } = this.networkCtx;
    this.initSetup(previousSetup);
    const otherNet = previousHelper.actors[ACTORS_ALREADY_MOVED];
    if (otherNet) {
      if (otherNet !== newNet.id) {
        throw new Error(
          `actors already moved to network #${otherNet}; can't move to #${newNet.id} now.`
        );
      }
      console.log("  -- actors are already here");
    } else {
      if (this === previousHelper) {
        console.log(
          "  -- helper already transferred; loading incremental snapshot"
        );
      } else {
        Object.assign(this.actors, previousHelper.actors);
        previousHelper.networkCtx = { network: previousNetwork };
        previousHelper.actorContext = {
          wallet: "previous network retired",
          others: previousHelper.actorContext.others
        };
        this.networkCtx = oldNetworkEnvelope;
        this.actorContext = oldActorContext;
        this.networkCtx.network = newNet;
        this.state.mintedCharterToken = previousHelper.state.mintedCharterToken;
        this.state.parsedConfig = parsedConfig;
        previousHelper.actors = { [ACTORS_ALREADY_MOVED]: newNet.id };
        console.log(
          `   -- moving ${Object.keys(this.actors).length} actors from network ${previousNetwork.id} to ${newNet.id}`
        );
      }
      newNet.loadSnapshot(snapshots[snapshotName]);
    }
    if (!this.actorName) {
      await this.setDefaultActor();
    }
    this.strella = bootstrappedStrella;
    if (!this.strella) {
      await this.initStellarClass(parsedConfig);
    }
    return this.strella;
  }
  async bootstrap(args, submitOptions = {}) {
    let strella = this.strella || await this.initialize(void 0, args);
    if (this.bootstrap != CapoTestHelper.prototype.bootstrap) {
      throw new Error(
        `Don't override the test-helper bootstrap().  Instead, provide an implementation of extraBootstrapping()`
      );
    }
    if (this.ready) {
      console.log(
        "       --- \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2705 Capo bootstrap already OK"
      );
      return strella;
    }
    const options = {
      ...submitOptions,
      onSubmitted: () => {
        this.network.tick(1);
      }
    };
    await this.mintCharterToken(args, options);
    console.log(
      "       --- \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2705 Capo bootstrap with charter"
    );
    this.network.tick(1);
    await this.extraBootstrapping(args, options);
    return strella;
  }
  async extraBootstrapping(args, submitOptions = {}) {
    this.mkTcx("extra bootstrapping").facade();
    const capoUtxos = await this.capo.findCapoUtxos();
    const charterData = await this.capo.findCharterData(void 0, {
      optional: false,
      capoUtxos
    });
    const tcx2 = await this.capo.mkTxnUpgradeIfNeeded(charterData);
    await this.submitTxnWithBlock(tcx2, submitOptions);
    return this.strella;
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
   * @param s - your Capo subclass
   * @typeParam CAPO - no need to specify it; it's inferred from your parameter
   * @public
   **/
  static forCapoClass(s, specialState) {
    class specificCapoHelper extends DefaultCapoTestHelper {
      get stellarClass() {
        return s;
      }
    }
    return specificCapoHelper;
  }
  //xx@ts-expect-error
  get stellarClass() {
    return CapoWithoutSettings;
  }
  _start;
  constructor(config, helperState) {
    super(config, helperState);
    this._start = (/* @__PURE__ */ new Date()).getTime();
  }
  ts(...args) {
    console.log(this.relativeTs, ...args);
  }
  requiresActorRole(roleName, firstLetter) {
    if (this.actorName[0] != firstLetter) {
      throw new Error(
        `expected current actor name (${this.actorName}) to be one of the ${roleName} profiles starting with '${firstLetter}' in the test helper`
      );
    }
  }
  get relativeTs() {
    const ms = (/* @__PURE__ */ new Date()).getTime() - this._start;
    const s = ms / 1e3;
    return `@ ${s}s`;
  }
  //!!! todo: create type-safe ActorMap helper hasActors(), on same pattern as hasRequirements
  async setupActors() {
    this.addActor("tina", 11000n * ADA);
    this.addActor("tracy", 13n * ADA);
    this.addActor("tom", 1200n * ADA);
  }
  setDefaultActor() {
    return this.setActor("tina");
  }
  async mkCharterSpendTx() {
    await this.mintCharterToken();
    const treasury = await this.strella;
    const tcx = this.mkTcx();
    const tcx2 = await treasury.txnAttachScriptOrRefScript(
      await treasury.txnAddGovAuthority(tcx),
      await treasury.asyncCompiledScript()
    );
    return treasury.txnMustUseCharterUtxo(
      tcx2,
      treasury.activityUsingAuthority()
    );
  }
  // accesses the delegate roles, iterates the namedDelegate entries,
  // and uses txnCreateConfiguredDelegate() to trigger compilation of the script for each one
  async checkDelegateScripts(args = {}) {
    const { strella: capo } = this;
    const { delegateRoles } = capo;
    const goodArgs = {
      ...this.mkDefaultCharterArgs(),
      ...args
    };
    let helperTxn = await capo.mkTxnMintCharterToken(
      goodArgs,
      void 0,
      "DRY_RUN"
    );
    console.log("  \u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E} ");
    for (const dgtLabel of Object.keys(delegateRoles)) {
      const dgtSetup = delegateRoles[dgtLabel];
      const { config, delegateClass, delegateType, uutPurpose } = dgtSetup;
      console.log(
        `  -- checking delegate script: ${dgtLabel} (${delegateType})`
      );
      helperTxn = await capo.txnWillMintUuts(
        helperTxn,
        [uutPurpose],
        { usingSeedUtxo: helperTxn.state.seedUtxo },
        {
          // namedDelegate: uutPurpose,
          [dgtLabel]: uutPurpose
        }
      );
      const addr = this.wallet.address;
      await capo.txnCreateOffchainDelegateLink(
        helperTxn,
        dgtLabel,
        {
          // strategyName: delegateName,
          uutName: helperTxn.state.uuts[uutPurpose].name,
          config: {
            // rev: 1n,
            addrHint: [addr]
          }
        }
      );
    }
  }
  mkDefaultCharterArgs() {
    const addr = this.wallet.address;
    console.log("test helper charter -> actor addr", addr.toString());
    return {
      govAuthorityLink: {
        config: {
          //this.capo.stringifyDgtConfig({
          addrHint: [addr]
        }
      },
      mintDelegateLink: {
        config: {}
      },
      spendDelegateLink: {
        config: {}
      },
      mintInvariants: [],
      spendInvariants: [],
      otherNamedDelegates: /* @__PURE__ */ new Map(),
      manifest: /* @__PURE__ */ new Map(),
      rev: 1n
    };
  }
  async mintCharterToken(args, submitOptions = {}) {
    const { delay } = this;
    const { tina, tom, tracy } = this.actors;
    if (this.state.mintedCharterToken) {
      console.warn(
        "reusing minted charter from existing testing-context"
      );
      return this.state.mintedCharterToken;
    }
    if (!this.strella) await this.initialize();
    const capo = await this.strella;
    const goodArgs = {
      ...this.mkDefaultCharterArgs(),
      ...args || {}
    };
    const tcx = await capo.mkTxnMintCharterToken(goodArgs);
    const rawConfig = this.state.rawConfig = this.state.config = tcx.state.bootstrappedConfig;
    this.state.parsedConfig = parseCapoJSONConfig(rawConfig);
    expect(capo.network).toBe(this.network);
    await tcx.submitAll(submitOptions);
    console.log(
      `----- charter token minted at slot ${this.network.currentSlot}`
    );
    this.network.tick(1);
    this.state.mintedCharterToken = tcx;
    return tcx;
  }
  async updateCharter(args, submitSettings = {}) {
    await this.mintCharterToken();
    const treasury = await this.strella;
    const { signers } = this.state;
    const tcx = await treasury.mkTxnUpdateCharter(args);
    return tcx.submitAll({
      signers,
      ...submitSettings
    }).then(() => {
      this.network.tick(1);
      return tcx;
    });
  }
  // async updateSettings(
  //     args: DetectSettingsType<CAPO>,
  //     submitSettings: SubmitOptions = {}
  // ) {
  //     await this.mintCharterToken();
  //     const capo = this.strella!;
  //     const tcx = await capo.mkTxnUpdateOnchainSettings(args);
  //     return tcx.submit(submitSettings).then(() => {
  //         this.network.tick(1);
  //         return tcx;
  //     });
  // }
}

const insufficientInputError = /(need .* lovelace, but only have|transaction doesn't have enough inputs)/;
Error.stackTraceLimit = 100;

export { ADA, CapoTestHelper, DefaultCapoTestHelper, SimpleWallet_stellar, StellarNetworkEmulator, StellarTestHelper, addTestContext, insufficientInputError };
//# sourceMappingURL=testing-node.mjs.map
