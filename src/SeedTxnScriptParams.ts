import type { TxId } from "@helios-lang/ledger";

/**
 * details of seed transaction
 * @remarks
 * Provides attribute names used for parameterizing scripts 
 * based on the "seed-txn" pattern for guaranteed uniqueness.
 * 
 * Note that when minting UUTs based on the same pattern,
 * these attribute names are not used.  See {@link UutName} and {@link Capo} 
 * for more.
 * 
 * @public
 **/
export type SeedTxnScriptParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};

