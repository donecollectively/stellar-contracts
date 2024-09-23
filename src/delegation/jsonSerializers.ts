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

// this is NOT a jsonifier, but it emits nice-looking info onscreen.
export function datumSerializer(key: string, value: any) {
    if (key === "spendDelegateLink") debugger

    if (typeof value === "bigint") {
        return `big‹${value.toString()}n›`;
    } else if ("bytes" == key && Array.isArray(value)) {
        return `‹bytes ${bytesToHex(value)}›`;
    } else if (value instanceof Address) {
        return `‹${abbrevAddress(value)}›`;
    } else if (value instanceof ScriptHash) {
        return `script‹${abbreviatedDetail(value.toHex())}›`;
    } else if ("tn" == key && Array.isArray(value)) {
        return bytesToText(value);
    } else if (value instanceof Map) {
        return `map‹${value.size}›${JSON.stringify(Object.fromEntries(value.entries()), datumSerializer, 4).slice(1,-1)}›`
    } else if (Array.isArray(value) && value.length == 0) {
        return "[]";
    } else if (Array.isArray(value) && value.every((v) => typeof v === "number")) {
        return `bytes‹${abbreviatedDetail(bytesToHex(value))}›`;
    // } else if (value.toString) {
    //     return value.toString();
    } else if ("string" == typeof value) {
        return JSON.stringify(value);
    }
    
    if (!value) {
        return JSON.stringify(value);
    }
    const keys = Object.keys(value)
    if (keys.length == 1) {
        const singleKey = keys[0]
        let s = `${singleKey}: { ${JSON.stringify(value[singleKey], datumSerializer, 4).slice(1, -1)}`
        if (key) return `${key}: { ${s} }`
        return s
    }
    const s = keys.map((k) => `${k}: ${
        datumSerializer(k, value[k])
    //    JSON.stringify(value[k], datumSerializer, 4)
    }`).join(", ");
    if (key) return `${key}: { ${s} }`
    debugger
    return s
    // return value; // return everything else unchanged
}
export function abbrevAddress(address: Address) {
    return abbreviatedDetail(address.toBech32(), 12, false);
}
export function abbreviatedDetail(hext: string, initLength = 8, countOmitted: boolean = true) {
    if (process?.env?.EXPAND_DETAIL) {
        return hext;
    } else {
        const omittedCount = countOmitted ? hext.length - initLength - 4 : 0;
        let omittedString = countOmitted ? `‹…${omittedCount}…›` : "…";
        if (countOmitted && omittedCount < omittedString.length) { omittedString = hext.slice(initLength, -4); }
        return `${hext.slice(0, initLength)}${omittedString}${hext.slice(-4)}`;
    }
}
