import { TxId } from "@hyperionbt/helios";

/**
 * details of seed transaction
 * @remarks
 * Provides attribute names used for parameterizing scripts 
 * based on the "seed-txn" pattern for guaranteed uniqueness.
 * 
 * Note that when minting UUTs based on the same pattern,
 * these attribute names are not used.  See `UutName` and DefaultCapo 
 * for more.
 * 
 * @public
 **/
export type SeedTxnScriptParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};

