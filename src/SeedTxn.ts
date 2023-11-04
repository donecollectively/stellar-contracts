import { TxId } from "@hyperionbt/helios";

/**
 * details of seed transaction
 * @public
 **/
export type SeedTxnParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};
