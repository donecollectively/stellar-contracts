import {
    Datum,
    Tx,
    TxInput,
    Address,
    TxOutput,
    ValidatorHash,
    Value,
    StakingValidatorHash,
    StakeAddress,
} from "@hyperionbt/helios";

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
