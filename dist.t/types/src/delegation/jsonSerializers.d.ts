import { type Address } from "@helios-lang/ledger";
/**
 * toJSON adapter for delegate links
 * @remarks
 * used for on-chain serialization of contract config details
 * @internal
 **/
export declare function delegateLinkSerializer(key: string, value: any): any;
/**
 *  this is NOT a jsonifier, but it emits nice-looking info onscreen when used with JSON.stringify (in arg2)
 * @public
 */
export declare function uplcDataSerializer(key: string, value: any, depth?: number): any;
/**
 * short version of address for compact display
 * @public
 */
export declare function abbrevAddress(address: Address): string;
/**
 * short representation of bytes for compact display
 * @public
 */
export declare function abbreviatedDetailBytes(prefix: string, value: number[], initLength?: number): string;
/**
 * short version of hex string for compact display
 * @internal
 */
export declare function abbreviatedDetail(hext: string, initLength?: number, countOmitted?: boolean): string;
//# sourceMappingURL=jsonSerializers.d.ts.map