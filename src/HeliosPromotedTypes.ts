import type { CompileOptions } from "@helios-lang/compiler";
import type { InlineTxOutputDatum } from "@helios-lang/ledger";
import type { UplcProgramV2 } from "@helios-lang/uplc";

/**
 * @public
 */
export type CompileOptionsForCachedHeliosProgram = CompileOptions & {
    /**
     * The timeout for waiting for another instance to finish compiling.
     * Defaults to 30 seconds.
     */
    timeout?: number;
};

/**
 * @public
 */
export type anyUplcProgram = UplcProgramV2;
// | UplcProgramV3;

export { 
    encodeUtf8 as textToBytes,
    decodeUtf8 as bytesToText,
} from "@helios-lang/codec-utils";

/**
 * tuple expressing a token-name and count
 * @public
 **/
export type tokenNamesOrValuesEntry = [string | number[], bigint];
/**
 * Tuple of byte-array, count, needed for Value creation on native tokens.
 * @public
 **/
export type valuesEntry = [number[], bigint];

/**
 * @public
 */
export type InlineDatum = InlineTxOutputDatum

