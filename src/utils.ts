import {
    Address,
    Assets,
    MintingPolicyHash,
    TxOutput,
    Value,
    
} from "@hyperionbt/helios";
import { uutPurposeMap } from "./Capo.js";
import { valuesEntry } from "./HeliosPromotedTypes.js";
import { UutName } from "./delegation/RolesAndDelegates.js";

export function mkUutValuesEntries(uuts: UutName[]): valuesEntry[];
export function mkUutValuesEntries(uuts: uutPurposeMap<any>): valuesEntry[];
export function mkUutValuesEntries(
    uuts: UutName[] | uutPurposeMap<any>
): valuesEntry[] {
    const uutNs = Array.isArray(uuts) ? uuts : Object.values(uuts);

    return uutNs.map((uut) => mkValuesEntry(uut.name, BigInt(1)));
}

export function stringToNumberArray(str: string): number[] {
    let encoder = new TextEncoder();
    let byteArray = encoder.encode(str);
    return [...byteArray].map((x) => parseInt(x.toString()));
}

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
