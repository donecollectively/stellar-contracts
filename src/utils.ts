import { isValidUtf8 } from "@helios-lang/codec-utils";
import type { uutPurposeMap } from "./CapoTypes.js";
import { textToBytes, type valuesEntry } from "./HeliosPromotedTypes.js";
import { UutName } from "./delegation/UutName.js";
import {
    makeAssets,
    makeValue,
    type Value,
    type MintingPolicyHash,
} from "@helios-lang/ledger";

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
): valuesEntry[];
/** @public **/
export function mkUutValuesEntries(
    uuts: UutName[] | uutPurposeMap<any>
): valuesEntry[] {
    const uutNs = Array.isArray(uuts) ? uuts : Object.values(uuts);
    const uniqs: UutName[] = [];
    for (const un of uutNs) {
        if (!uniqs.includes(un)) uniqs.push(un);
    }
    return uniqs.map((uut) => mkValuesEntry(uut.name, BigInt(1)));
}

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
        : textToBytes(tokenName);

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
    const v = makeValue(
        0,
        makeAssets([[mph, [mkValuesEntry(tokenName, count)]]])
    );
    return v;
}

/**
 * Multiplies two numbers using integer math semantics for matching with Helios on-chain Real math
 *
 * @remarks
 * The numbers can be whole or fractional, with 6 decimal places of honored precision.
 * The result is rounded to 6 decimal places.
 * @todo - delegate this to a call into the on-chain version of same
 * @public
 */
export function realMul(a: number, b: number) {
    const a2 = Math.trunc(1000000 * a);
    const b2 = Math.trunc(1000000 * b);
    const result1 = a2 * b2;
    const result2 = result1 / 1_000_000_000_000;
    if (debugRealMath) {
        console.log("    ---- realMul", a2, b2);
        console.log("    ---- realMul result1", result1);
        console.log("    ---- realMul result2", result2);
    }
    return result2;
}

/**
 * Divides two numbers using integer math semantics for matching with Helios on-chain Real math
 *
 * @remarks
 * The numbers can be whole or fractional, with 6 decimal places of honored precision.
 * The result is rounded to 6 decimal places.
 * @todo - delegate this to a call into the on-chain version of same
 * @public
 */
export function realDiv(a: number, b: number) {
    if (b === 0) {
        throw new Error("Cannot divide by zero");
    }
    const a2 = Math.trunc(1_000_000 * a);
    const b2 = Math.trunc(1_000_000 * b);
    const result1 = a2 / b;
    // const result2 = toFixedReal(result1 / 1_000_000);
    const result2 = Math.round(result1) / 1_000_000;
    if (debugRealMath) {
        console.log("    ---- realDiv", a, "/", b);
        console.log("    ---- realDiv", a2);
        console.log("    ---- realDiv result1", result1);
        console.log("    ---- realDiv result2", result2);
    }
    return result2;
}

/**
 * Rounds a number to 6 decimal places, with correction for low-value floating-point
 * errors e.g. `(2.999999999) -> 3.0`
 * @public
 */
export function toFixedReal(n: number) {
    return parseFloat((Math.floor(n * 1_000_000 + 0.1) / 1_000_000).toFixed(6));
}
/**
 * Temporarily enable debugRealMath for the duration of the callback
 * @internal
 */
export function debugMath<T extends number>(callback: () => T): T {
    const old = debugRealMath;
    debugRealMath = true;
    const result = callback();
    debugRealMath = old;
    return result;
}

let debugRealMath = false;



export class TxNotNeededError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TxAlreadyPresentError";
    }
}

export class AlreadyPendingError extends TxNotNeededError {
    constructor(message: string) {
        super(message);
        this.name = "AlreadyPendingError";
    }
}

export function checkValidUTF8(data: number[]) {
  // quickly check, without throwing errors, for invalid UTF-8 sequences:
  let i = 0;
  while (i < data.length) {
    if ((data[i] & 0x80) === 0x00) {
      i++;
    } else if ((data[i] & 0xE0) === 0xC0) {
      if (i + 1 >= data.length || (data[i + 1] & 0xC0) !== 0x80) return false;
      i += 2;
    } else if ((data[i] & 0xF0) === 0xE0) {
      if (i + 2 >= data.length || (data[i + 1] & 0xC0) !== 0x80 || (data[i + 2] & 0xC0) !== 0x80) return false;
      i += 3
    } else if ((data[i] & 0xF8) === 0xF0) {
      if (i + 3 >= data.length || (data[i + 1] & 0xC0) !== 0x80 || (data[i + 2] & 0xC0) !== 0x80 || (data[i + 3] & 0xC0) !== 0x80) return false;
      i += 4;
    } else {
      return false;
    }
  }
  // if it didn't fail above, fine - but still defer to isValidUtf8.  it CAN throw (and catch) an error,
  // but the above checks are much likelier to return false with NO caught error.
  return isValidUtf8(data);
}

export {colors} from "./colors.js"