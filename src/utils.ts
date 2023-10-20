import { uutPurposeMap } from "./Capo.js";
import { valuesEntry } from "./HeliosPromotedTypes.js";
import { UutName } from "./delegation/RolesAndDelegates.js";

export function mkUutValuesEntries(uuts: UutName[]): valuesEntry[]
export function mkUutValuesEntries(uuts: uutPurposeMap<any>): valuesEntry[]
export function mkUutValuesEntries(uuts: UutName[] | uutPurposeMap<any>): valuesEntry[] {
    const uutNs = Array.isArray(uuts) ? uuts :
        Object.values(uuts)

        return uutNs.map(uut => mkValuesEntry(uut.name, BigInt(1)))
}

export function stringToNumberArray(str: string): number[] {
    let encoder = new TextEncoder();
    let byteArray = encoder.encode(str);
    return [...byteArray].map((x) => parseInt(x.toString()));
}

export function mkValuesEntry(tokenName: string, count: bigint): valuesEntry {
    return [stringToNumberArray(tokenName), count];
}
