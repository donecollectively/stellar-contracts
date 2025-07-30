import { makeValue, makeAssets, makeNetworkParamsHelper, makeAddress, makeTxOutput, makeAssetClass, makeDummyAddress, makeTxOutputId, makeValidatorHash, makeMintingPolicyHash, makeInlineTxOutputDatum, makeTxInput } from '@helios-lang/ledger';
import { makeByteArrayData } from '@helios-lang/uplc';
import { decodeUtf8, isValidUtf8, encodeUtf8, bytesToHex, equalsBytes } from '@helios-lang/codec-utils';
import { encodeBech32 } from '@helios-lang/crypto';
import { makeTxBuilder, makeTxChainBuilder, makeWalletHelper, selectLargestFirst } from '@helios-lang/tx-utils';
import { customAlphabet } from 'nanoid';
import './HeliosBundle.mjs';
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
      const addrUtxos = await this.network.getUtxos(addr);
      utxos.push(...addrUtxos);
    }
    const filtered = options.exceptInTcx ? utxos.filter(
      options.exceptInTcx.utxoNotReserved.bind(options.exceptInTcx)
    ) : utxos;
    if (!Array.isArray(strategy)) {
      strategy = [strategy];
    }
    for (const s of strategy) {
      const [selected, others] = s(filtered, amount);
      if (selected.length > 0) {
        return selected;
      }
    }
    throw new Error(
      `no sufficient utxos found using any of ${strategy.length} strategies`
    );
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
  /**
   * @internal
   */
  "\u1C7A\u1C7Aschema";
  /**
   * @internal
   */
  isMainnet;
  /**
   * @internal
   */
  isActivity;
  /**
   * @internal
   */
  isNested;
  /**
   * @internal
   */
  "\u1C7A\u1C7Acast";
  /**
   * @internal
   */
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
  /**
   * @internal
   */
  redirectTo;
  /**
   * @internal
   */
  mkDataVia(redirectionCallback) {
    if (!this.isNested) {
      throw new Error(
        `dataMaker ${this.constructor.name}: redirectTo is only valid for nested enums`
      );
    }
    this.redirectTo = redirectionCallback;
  }
  /**
   * @internal
   */
  get isEnum() {
    return "enum" === this["\u1C7A\u1C7Aschema"].kind;
  }
  /**
   * @internal
   */
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
    const useMinTv = true;
    const authorityVal = this.tvAuthorityToken(useMinTv);
    const existing = tcx.hasAuthorityToken(authorityVal);
    if (existing) {
      console.error("This should be okay IF the redeemer on the txn is consistent with the redeemer being added");
      console.error("TODO: can the delegate have multiple redeemers, covering both activities?");
      throw new Error(`Delegate ${label}: already added: ${dumpAny(
        authorityVal,
        this.networkParams
      )}`);
    }
    const uutxo = await this.DelegateMustFindAuthorityToken(tcx, label);
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

We'll generate an additional .typeInfo.d.ts, based on the types in your Helios sources,
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

export { getSeed as $, Activity as A, valueAsString as B, ContractBasedDelegate as C, DataBridge as D, utxosAsString as E, policyIdAsString as F, txOutputAsString as G, txInputAsString as H, lovelaceToAda as I, addrAsString as J, byteArrayAsString as K, txidAsString as L, txOutputIdAsString as M, byteArrayListAsString as N, datumSummary as O, hexToPrintableString as P, betterJsonSerializer as Q, abbrevAddress as R, StellarContract as S, TxNotNeededError as T, UutName as U, abbreviatedDetail as V, abbreviatedDetailBytes as W, UtxoHelper as X, findInputsInWallets as Y, mergesInheritedReqts as Z, SeedActivity as _, ContractDataBridge as a, ContractDataBridgeWithEnumDatum as a0, ContractDataBridgeWithOtherDatum as a1, DataBridgeReaderClass as b, StellarDelegate as c, datum as d, dumpAny as e, StellarTxnContext as f, mkUutValuesEntries as g, delegateLinkSerializer as h, impliedSeedActivityMaker as i, errorMapAsString as j, AlreadyPendingError as k, hasReqts as l, mkValuesEntry as m, debugMath as n, realMul as o, partialTxn as p, toFixedReal as q, realDiv as r, colors as s, txn as t, uplcDataSerializer as u, displayTokenName as v, stringToPrintableString as w, assetsAsString as x, txAsString as y, utxoAsString as z };
//# sourceMappingURL=ContractBasedDelegate2.mjs.map
