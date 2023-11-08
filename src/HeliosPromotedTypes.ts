import {
    Datum,
} from "@hyperionbt/helios";
//! because we are separately exporting all of helios,
//! it's not necessary to import or export any of its members.
//! ... but it's helpful to re-export some of its types.

export type {
    Datum,
    Tx,
    TxInput,
    Address,
    TxOutput,
    ValidatorHash,
    Value,
    StakingValidatorHash,
    StakeAddress,
    Wallet
} from "@hyperionbt/helios";

const DatumInline = Datum.inline;
/**
 * Inline Datum for contract outputs
 * @public
 **/
export type InlineDatum = ReturnType<typeof DatumInline>;
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
