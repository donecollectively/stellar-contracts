import type { Wallet } from "@helios-lang/tx-utils";
import type { BatchSubmitController } from "./BatchSubmitController.js";
import { type Signature, type Tx } from "@helios-lang/ledger";
import type { TxSubmissionTracker } from "./TxSubmissionTracker.js";
/**
 * @public
 */
export declare abstract class WalletSigningStrategy {
    abstract canBatch: boolean;
    wallet: Wallet;
    constructor(wallet: Wallet);
    abstract signSingleTx(tx: Tx): Promise<Signature[]>;
    /**
     * has the wallet sign the txns in the batch
     * @remarks
     * implements a fallback for strategies that don't support batching
     *
     * You must override this method if your wallet can batch sign.  Also,
     * set canBatch = true.
     *
     * Adds the signatures to the txns and also returns the signatures
     * in case that's helpful.
     */
    signTxBatch(batch: BatchSubmitController): Promise<(undefined | Signature[])[]>;
    signTx(txTracker: TxSubmissionTracker): Promise<void | Signature[]>;
}
/**
 * @public
 */
export declare class GenericSigner extends WalletSigningStrategy {
    canBatch: boolean;
    signSingleTx(tx: Tx): Promise<Signature[]>;
}
/**
 * @public
 */
export declare class DraftEternlMultiSigner extends GenericSigner {
    canBatch: boolean;
    signTxBatch(batch: BatchSubmitController): Promise<any>;
}
//# sourceMappingURL=WalletSigningStrategy.d.ts.map