import type { ErrorMap } from "./delegation/RolesAndDelegates.js";
import { StellarTxnContext } from "./StellarTxnContext.js";
import { type ByteArrayData, type UplcProgramV2 } from "@helios-lang/uplc";
import { type Value, type Address, type Tx, type TxId, type TxInput, type TxOutput, type TxOutputId, type NetworkParams, type Assets, type MintingPolicyHash, type TxOutputDatum } from "@helios-lang/ledger";
import type { UtxoDisplayCache } from "./StellarContract.js";
/**
 * converts a hex string to a printable alternative, with no assumptions about the underlying data
 * @remarks
 *
 * Unlike Helios' bytesToText, hexToPrintable() simply changes printable characters to characters,
 * and represents non-printable characters in '‹XX›' format.
 * @param hexStr - hex input
 * @public
 **/
export declare function hexToPrintableString(hexStr: string): string;
/**
 * Displays a token name in a human-readable form
 * @remarks
 * Recognizes CIP-68 token names and displays them in a special format.
 * @param nameBytesOrString - the token name, as a string or byte array
 * @public
 */
export declare function displayTokenName(nameBytesOrString: string | number[]): string;
/**
 * Presents a string in printable form, even if it contains non-printable characters
 *
 * @remarks
 * Non-printable characters are shown in '‹XX›' format.
 * @public
 */
export declare function stringToPrintableString(str: string | number[]): string;
/**
 * Converts an array of [ policyId, ‹tokens› ] tuples for on-screen presentation
 * @remarks
 *
 * Presents policy-ids with shortened identifiers, and shows a readable & printable
 * representation of token names even if they're not UTF-8 encoded.
 * @public
 **/
export declare function assetsAsString(a: Assets, joiner?: string, showNegativeAsBurn?: "withBURN", mintRedeemers?: Record<number, string>): string;
/**
 * Converts a MintingPolicyHash to a printable form
 * @public
 **/
export declare function policyIdAsString(p: MintingPolicyHash): string;
/**
 * Converts lovelace to approximate ADA, in consumable 3-decimal form
 * @public
 **/
export declare function lovelaceToAdaOld(l: bigint | number): string;
/**
 * Converts lovelace to approximate ADA, in consumable 3-decimal form
 * @public
 */
export declare function lovelaceToAda(lovelace: bigint | number): string;
/**
 * Converts a bigint or number to a string with commas as thousands separators
 * @public
 */
export declare function intWithGrouping(i: bigint | number): string;
/**
 * Converts a Value to printable form
 * @public
 **/
export declare function valueAsString(v: Value): string;
/**
 * Converts a Tx to printable form
 * @public
 **/
export declare function txAsString(tx: Tx, networkParams?: NetworkParams): string;
/**
 * Converts a TxInput to printable form
 * @remarks
 *
 * Shortens address and output-id for visual simplicity; doesn't include datum info
 * @public
 **/
export declare function txInputAsString(x: TxInput, prefix?: string, index?: number, redeemer?: string): string;
/**
 * Converts a list of UTxOs to printable form
 * @remarks
 *
 * ... using {@link utxoAsString}
 * @public
 **/
export declare function utxosAsString(utxos: TxInput[], joiner?: string, utxoDCache?: UtxoDisplayCache): string;
/**
 * Converts a TxOutputId to printable form
 * @public
 */
export declare function txOutputIdAsString(x: TxOutputId, length?: number): string;
/**
 * Converts a TxId to printable form
 * @remarks
 *
 * ... showing only the first 6 and last 4 characters of the hex
 * @public
 **/
export declare function txidAsString(x: TxId, length?: number): string;
/**
 * converts a utxo to printable form
 * @remarks
 *
 * shows shortened output-id and the value being output, plus its datum
 * @internal
 **/
export declare function utxoAsString(x: TxInput, prefix?: string, utxoDCache?: UtxoDisplayCache): string;
/**
 * converts a Datum to a printable summary
 * @remarks
 *
 * using shortening techniques for the datumHash
 * @public
 **/
export declare function datumSummary(d: TxOutputDatum | null | undefined): string;
/**
 * Displays a short summary of any provided reference script
 * @remarks
 *
 * detailed remarks
 * @param ‹pName› - descr
 * @typeParam ‹pName› - descr (for generic types)
 * @public
 **/
export declare function showRefScript(rs?: UplcProgramV2 | null): string;
/**
 * Converts a txOutput to printable form
 * @remarks
 *
 * including all its values, and shortened Address.
 * @public
 **/
export declare function txOutputAsString(x: TxOutput, prefix?: string, utxoDCache?: UtxoDisplayCache, txoid?: TxOutputId): string;
/**
 * Renders an address in shortened bech32 form, with prefix and part of the bech32 suffix
 * @remarks
 * @param address - address
 * @public
 **/
export declare function addrAsString(address: Address): string;
/**
 * Converts an Errors object to a string for onscreen presentation
 * @public
 **/
export declare function errorMapAsString(em: ErrorMap, prefix?: string): string;
/**
 * Converts a list of ByteArrays to printable form
 * @remarks
 *
 * ... using {@link hexToPrintableString}
 * @public
 **/
export declare function byteArrayListAsString(items: ByteArrayData[], joiner?: string): string;
/**
 * Renders a byteArray in printable form, assuming it contains (mostly) text
 * @remarks
 *
 * Because it uses {@link hexToPrintableString | hexToPrintableString()}, it will render any non-printable
 * characters using ‹hex› notation.
 * @param ba - the byte array
 * @public
 **/
export declare function byteArrayAsString(ba: ByteArrayData): string;
/**
 * Converts any (supported) input arg to string
 * @remarks
 *
 * more types to be supported TODO
 * @public
 **/
export declare function dumpAny(x: undefined | Tx | StellarTxnContext | Address | MintingPolicyHash | Value | Assets | TxOutputId | TxOutput | TxOutput[] | TxInput | TxInput[] | TxId | number[] | ByteArrayData | ByteArrayData[], networkParams?: NetworkParams, forJson?: boolean): any;
/**
 * @public
 */
export declare const betterJsonSerializer: (key: any, value: any) => any;
//# sourceMappingURL=diagnostics.d.ts.map