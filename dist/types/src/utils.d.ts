import type { uutPurposeMap } from "./CapoTypes.js";
import { type valuesEntry } from "./HeliosPromotedTypes.js";
import { UutName } from "./delegation/UutName.js";
import { type Value, type MintingPolicyHash } from "@helios-lang/ledger";
import { StellarTxnContext } from "./StellarTxnContext.js";
/**
 * Creates Value-creation entires for a list of uuts
 * @remarks
 *
 * returns a list of `entries` usable in Value's `[mph, entries[]]` tuple.
 * @param uuts - a list of {@link UutName}s or a {@link uutPurposeMap}
 * @public
 **/
export declare function mkUutValuesEntries(uuts: UutName[]): valuesEntry[];
/** @public **/
export declare function mkUutValuesEntries(uuts: uutPurposeMap<any>): valuesEntry[];
/** @public **/
export declare function mkUutValuesEntries(uuts: UutName[] | uutPurposeMap<any>): valuesEntry[];
/**
 * Creates a tuple usable in a Value, converting token-name to byte-array if needed
 * @public
 **/
export declare function mkValuesEntry(tokenName: string | number[], count: bigint): valuesEntry;
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
export declare function mkTv(mph: MintingPolicyHash, tokenName: string | number[], count?: bigint): Value;
/**
 * Multiplies two numbers using integer math semantics for matching with Helios on-chain Real math
 *
 * @remarks
 * The numbers can be whole or fractional, with 6 decimal places of honored precision.
 * The result is rounded to 6 decimal places.
 * @todo - delegate this to a call into the on-chain version of same
 * @public
 */
export declare function realMul(a: number, b: number): number;
/**
 * Divides two numbers using integer math semantics for matching with Helios on-chain Real math
 *
 * @remarks
 * The numbers can be whole or fractional, with 6 decimal places of honored precision.
 * The result is rounded to 6 decimal places.
 * @todo - delegate this to a call into the on-chain version of same
 * @public
 */
export declare function realDiv(a: number, b: number): number;
/**
 * Rounds a number to 6 decimal places, with correction for low-value floating-point
 * errors e.g. `(2.999999999) -> 3.0`
 * @public
 */
export declare function toFixedReal(n: number): number;
/**
 * Temporarily enable debugRealMath for the duration of the callback
 * @internal
 */
export declare function debugMath<T extends number>(callback: () => T): T;
/**
 * @public
 */
export declare class TxNotNeededError extends Error {
    constructor(message: string);
}
/**
 * @public
 */
export declare class AlreadyPendingError extends TxNotNeededError {
    constructor(message: string);
}
/**
 * @internal
 */
export declare function isLibraryMatchedTcx(arg: any): arg is StellarTxnContext;
/**
 * @public
 */
export declare function checkValidUTF8(data: number[]): boolean;
export { colors } from "./colors.js";
//# sourceMappingURL=utils.d.ts.map