import type { InlineTxOutputDatum } from "@helios-lang/ledger";
import { makeCardanoClientHelper } from "@helios-lang/tx-utils";

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

export type InlineDatum = InlineTxOutputDatum

