import { bytesToHex } from "@helios-lang/codec-utils";
import { encodeBech32 } from "@helios-lang/crypto";
import { type Address, type AssetClass } from "@helios-lang/ledger";
import { type MintingPolicyHash } from "@helios-lang/ledger";
import { bytesToText } from "../HeliosPromotedTypes.js";
import {
    txOutputIdAsString,
    valueAsString,
    assetsAsString,
    policyIdAsString,
    displayTokenName,
} from "../diagnostics.js";
import type { ByteArrayData, IntData } from "@helios-lang/uplc";
import { checkValidUTF8 } from "../utils.js";

/**
 * toJSON adapter for delegate links
 * @remarks
 * used for on-chain serialization of contract config details
 * @internal
 **/
export function delegateLinkSerializer(key: string, value: any) {
    if (typeof value === "bigint") {
        return value.toString();
    } else if ("bytes" == key && Array.isArray(value)) {
        return bytesToHex(value);
    } else if (value?.kind == "Address") {
        return value.toString();
    } else if ("tn" == key && Array.isArray(value)) {
        return bytesToText(value);
    }
    if ("capo" == key) return undefined;
    if ("uh" == key) return '"‹utxo helper›"';
    if ("capoBundle" == key) return '"‹capo bundle›"';

    return value; // return everything else unchanged
}

/**
 *  this is NOT a jsonifier, but it emits nice-looking info onscreen when used with JSON.stringify (in arg2)
 * @public
 */
export function uplcDataSerializer(key: string, value: any, depth = 0) {
    const indent = "    ".repeat(depth);
    const outdent = "    ".repeat(Math.max(0, depth - 1));

    if (typeof value === "bigint") {
        return `big‹${value.toString()}n›`;
    } else if ("bytes" == key && Array.isArray(value)) {
        // return `‹bytes‹${value.length}›=${bytesToHex(value)}›`;
        return abbreviatedDetailBytes(`bytes‹${value.length}›`, value, 40);
    } else if ("string" == typeof value) {
        return `'${value}'`; // JSON.stringify(value, null, 4);
    } else if (value === null) {
        return `‹null›`;
    } else if ("undefined" == typeof value) {
        return `‹und›`;
    } else if (value.kind == "Address") {
        const a = value as Address;
        const cbor = a.toCbor();
        // const b = decodeAddress(cbor)
        return (
            `‹${abbrevAddress(value)}› = ` +
            abbreviatedDetailBytes(`cbor‹${cbor.length}›:`, cbor, 99)
        );
    } else if (value.kind == "ValidatorHash") {
        return abbreviatedDetailBytes(
            `script‹${value.bytes.length}›`,
            value.bytes
        );
    } else if (value.kind == "MintingPolicyHash") {
        const v: MintingPolicyHash = value;
        return `mph‹${policyIdAsString(v)}›`;
        // .toHex())}›`;
    } else if (value.kind == "TxOutputId") {
        return `‹txoid:${txOutputIdAsString(value, 8)}›`;
    }
    if (value.rawData) {
        return uplcDataSerializer(key, value.rawData, Math.max(depth, 3));
    }
    if (value.kind == "int") {
        const v: IntData = value;
        return `IntData‹${v.value}›`;
    }
    if (value.kind == "bytes") {
        const v = value as ByteArrayData;
        return abbreviatedDetailBytes(
            `ByteArray‹${v.bytes.length}›`,
            v.bytes,
            40
        );
    }
    if (value.kind == "Value") {
        return valueAsString(value);
    }
    if (value.kind == "Assets") {
        return `assets:‹${assetsAsString(value)}›`;
    }
    if (value.kind == "AssetClass") {
        const ac = value as AssetClass;
        return `assetClass:‹${policyIdAsString(ac.mph)} ${displayTokenName(
            ac.tokenName
        )}}›`;
    }
    if (value.kind)
        console.log("info: no special handling for KIND = ", value.kind);

    if ("tn" == key && Array.isArray(value)) {
        return bytesToText(value);
    } else if ("number" == typeof value) {
        return value.toString();
    } else if (value instanceof Map) {
        return `map‹${value.size}›: { ${uplcDataSerializer(
            "",
            Object.fromEntries(value.entries()),
            Math.max(depth, 3)
        )}    }`;
    } else if (Array.isArray(value) && value.length == 0) {
        return "[]";
    } else if (
        Array.isArray(value) &&
        value.every((v) => typeof v === "number")
    ) {
        return `${abbreviatedDetailBytes(`bytes‹${value.length}›`, value, 40)}`;
        // } else if (value.toString) {
        //     return value.toString();
    } else if (Array.isArray(value)) {
        const inner = value.map((v) =>
            uplcDataSerializer("", v, Math.max(depth + 1, 3))
        );
        let extraNewLine = "";
        let usesOutdent = "";
        const multiLine = inner
            .map((s) => {
                const hasNewline = s.trim().includes("\n");
                if (s.length > 40) {
                    extraNewLine = "\n";
                    usesOutdent = outdent;
                    return `${indent}${s}`;
                } else {
                    // console.log("length, hasNewline = ", s.length, hasNewline)
                }
                return s;
            })
            .join(`, ${extraNewLine}`);
        // console.log("array uses newline/outdent", {extraNewLine, usesOutdent});

        return `[ ${extraNewLine}${multiLine}${extraNewLine}${usesOutdent} ]`;
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
                inner = "[ ‹empty list› ]";
            }
        } else {
            if (inner.length) inner = `{ ${inner} }`;
        }
        let s = `${singleKey}: ${inner}`;
        // if (key) return `**1k** ${key}: ${s}`
        return s;
    }
    let extraNewLine = "";
    let usesOutdent = "";
    let s = keys.map(
        (k) =>
            `${indent}${k}: ${
                uplcDataSerializer(k, value[k], Math.max(depth + 1, 2))
                //    JSON.stringify(value[k], datumSerializer, 4)
                // }`).join(`,\nz${indent}`);
            }`
    );
    const multiLineItems = s.map((s) => {
        if (s.length < 40 && !s.includes("\n")) {
            return `${s}`;
        } else {
            extraNewLine = "\n";
            usesOutdent = outdent;
            return `${s}`;
        }
        return s;
    });
    const multiLine = multiLineItems.join(`, ${extraNewLine}`);
    s = `${multiLine}${extraNewLine}${usesOutdent}`;

    if (key) return `{${extraNewLine}${s}}`;
    return `\n${s}`;
}
/**
 * short version of address for compact display
 * @public
 */
export function abbrevAddress(address: Address) {
    return abbreviatedDetail(address.toString(), 12, false);
}

/**
 * short representation of bytes for compact display
 * @public
 */
export function abbreviatedDetailBytes(
    prefix: string,
    value: number[],
    initLength = 8
) {
    const hext = bytesToHex(value);
    const Len = value.length;
    const text = checkValidUTF8(value)
        ? ` ‹"${abbreviatedDetail(bytesToText(value), initLength)}"›`
        : ``;

    if (value.length <= initLength) return `${prefix}${hext}${text}`;
    const checksumString = encodeBech32("_", value).slice(-4);
    return `${prefix}${hext.slice(0, initLength)}… ‹${checksumString}›${text}`;
}

/**
 * short version of hex string for compact display
 * @internal
 */
export function abbreviatedDetail(
    hext: string,
    initLength = 8,
    countOmitted: boolean = false
) {
    const p = typeof process == "undefined" ? {
        env: {} as Record<string, string>
    } : process;
    if (p?.env?.EXPAND_DETAIL) {
        return hext;
    } else {
        if (hext.length <= initLength) return hext;
        const omittedCount = countOmitted ? hext.length - initLength - 4 : 0;
        let omittedString = countOmitted ? `‹…${omittedCount}…›` : "…";
        if (countOmitted && omittedCount < omittedString.length) {
            omittedString = hext.slice(initLength, -4);
        }
        return `${hext.slice(0, initLength)}${omittedString}${hext.slice(-4)}`;
    }
}
