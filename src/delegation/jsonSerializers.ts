import { isValidUtf8 } from "@helios-lang/codec-utils";
import { encodeBech32 } from "@helios-lang/crypto";
import { Address, ScriptHash, bytesToHex, bytesToText } from "@hyperionbt/helios";

/**
 * toJSON adapter for delegate links
 * @internal
 **/

export function delegateLinkSerializer(key: string, value: any) {
    if (typeof value === "bigint") {
        return value.toString();
    } else if ("bytes" == key && Array.isArray(value)) {
        return bytesToHex(value);
    } else if (value instanceof Address) {
        return value.toBech32();
    } else if ("tn" == key && Array.isArray(value)) {
        return bytesToText(value);
    }
    if (key === "capo") return undefined;
    return value; // return everything else unchanged
}

// this is NOT a jsonifier, but it emits nice-looking info onscreen when used with JSON.stringify (in arg2)
export function uplcDataSerializer(key: string, value: any, depth=0) {
    if (typeof value === "bigint") {
        return `big‹${value.toString()}n›`;
    } else if ("bytes" == key && Array.isArray(value)) {
        // return `‹bytes‹${value.length}›=${bytesToHex(value)}›`;
        return `${abbreviatedDetailBytes(`bytes‹${value.length}›`, value, 40)}`
    } else if (value instanceof Address) {
        return `‹${abbrevAddress(value)}›`;
    } else if (value instanceof ScriptHash) {
        return `${abbreviatedDetailBytes("script‹", value.bytes)}›`
            // .toHex())}›`;
    } else if ("tn" == key && Array.isArray(value)) {
        return bytesToText(value);
    } else if ("number" == typeof value) {
        return value.toString();
    } else if (value instanceof Map) {
        return `map‹${value.size}›: ${
            uplcDataSerializer("", Object.fromEntries(value.entries()), Math.max(depth,3))
        }`
    } else if (Array.isArray(value) && value.length == 0) {
        return "[]";
    } else if (Array.isArray(value) && value.every((v) => typeof v === "number")) {
        // return `bytes‹${value.length}›=${abbreviatedDetail(bytesToHex(value),14)}`;
        return `${abbreviatedDetailBytes(`bytes‹${value.length}›`, value, 40)}`
    // } else if (value.toString) {
    //     return value.toString();
    } else if ("string" == typeof value) {
        return `'${value}'`// JSON.stringify(value, null, 4);
    }
    
    if (!value) {
        return JSON.stringify(value);
    }
    const keys = Object.keys(value)
    if (keys.length == 0) {
        return "{}";
    }
    if (keys.length == 1) {
        const singleKey = keys[0]
        let s = `${singleKey}: { ${uplcDataSerializer("", value[singleKey], Math.max(depth,3))} }`
        if (key) return `${key}: ${s}`
        return s
    }
    const indent = "    ".repeat(depth);
    const outdent = "    ".repeat(depth-1);
    const s = keys.map((k) => `${indent}${k}: ${
        uplcDataSerializer(k, value[k], Math.max(depth+1,2))
    //    JSON.stringify(value[k], datumSerializer, 4)
// }`).join(`,\nz${indent}`);
    }`).join(`,\n`);
if (key) return `{\n${s}\n${outdent}}`
    // if (key) return `${s}\n`
    return `\n${s}`
    // return value; // return everything else unchanged
}
export function abbrevAddress(address: Address) {
    return abbreviatedDetail(address.toBech32(), 12, false);
}
export function abbreviatedDetailBytes(prefix: string, value: number[], initLength=8) {    
    const hext = bytesToHex(value);
    const text = isValidUtf8(value) ? ` ‹"${abbreviatedDetail(bytesToText(value), initLength)}"›` : "";

    if (value.length <= initLength) return `${prefix}${hext}${text}`
    const checksumString = encodeBech32("_", value).slice(-4)
    return `${prefix}${hext.slice(0, initLength)}… ‹${checksumString}›${text}`;
}
export function abbreviatedDetail(hext: string, initLength = 8, countOmitted: boolean = false) {
    if (process?.env?.EXPAND_DETAIL) {
        return hext;
    } else {
        if (hext.length <= initLength) return hext;
        const omittedCount = countOmitted ? hext.length - initLength - 4 : 0;
        let omittedString = countOmitted ? `‹…${omittedCount}…›` : "…";
        if (countOmitted && omittedCount < omittedString.length) { omittedString = hext.slice(initLength, -4); }
        return `${hext.slice(0, initLength)}${omittedString}${hext.slice(-4)}`;
    }
}
