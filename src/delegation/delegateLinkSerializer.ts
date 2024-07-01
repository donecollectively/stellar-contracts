import { Address, bytesToHex, bytesToText } from "@hyperionbt/helios";

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
