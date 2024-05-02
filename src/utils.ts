import {
    Assets,
    MintingPolicyHash,
    Value,
    textToBytes,    
} from "@hyperionbt/helios";
import type { uutPurposeMap } from "./Capo.js";
import type { valuesEntry } from "./HeliosPromotedTypes.js";
import { UutName } from "./delegation/UutName.js";


/**
 * Creates Value-creation entires for a list of uuts
 * @remarks
 * 
 * returns a list of `entries` usable in Value's `[mph, entries[]]` tuple.
 * @param uuts - a list of {@link UutName}s or a {@link uutPurposeMap}
 * @public
 **/
export function mkUutValuesEntries(uuts: UutName[]): valuesEntry[];
/** @public **/
export function mkUutValuesEntries(uuts: uutPurposeMap<any>): valuesEntry[];
/** @public **/
export function mkUutValuesEntries(
    uuts: UutName[] | uutPurposeMap<any>
): valuesEntry[] {
    const uutNs = Array.isArray(uuts) ? uuts : Object.values(uuts);
    const uniqs : UutName[] = [];
    for (const un of uutNs) {
        if (!uniqs.includes(un)) uniqs.push(un)
    }
    return uniqs.map((uut) => mkValuesEntry(uut.name, BigInt(1)));
}

/**
 * Converts string to array of UTF-8 byte-values 
* @public
 **/
export const stringToNumberArray = textToBytes
// func stringToNumberArray (str: string): number[] {
//     let encoder = new TextEncoder();
//     let byteArray = encoder.encode(str);
//     return [...byteArray].map((x) => parseInt(x.toString()));
// }

/**
 * Creates a tuple usable in a Value, converting token-name to byte-array if needed
 * @public
 **/
export function mkValuesEntry(
    tokenName: string | number[],
    count: bigint
): valuesEntry {
    const tnBytes = Array.isArray(tokenName)
        ? tokenName
        : stringToNumberArray(tokenName);

    // addrHint,  //moved to config
    // reqdAddress,  // removed

    return [tnBytes, count];
}

/**
 * construct a Value based on a token-name
 * @remarks
 *
 * A simpler version of the Value constructor to serve the
 * common case of a single, string-based token name.
 *
 * If you need the Value to contain its minUtx computed based
 * on network parameters, use the StellarContract's mkMinTv()
 * method instead.
 *
 * @param mph - policy-hash of the token
 * @param tokenName - string name of the token
 * @param count: number of the tokens to include in the value
 * @public
 **/
export function mkTv(
    mph: MintingPolicyHash,
    tokenName: string | number[],
    count: bigint = 1n
): Value {
    const v = new Value(
        undefined,
        new Assets([[mph, [mkValuesEntry(tokenName, count)]]])
    );
    return v;
}
