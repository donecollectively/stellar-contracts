import type { Cip30Wallet, WalletHelper } from "@helios-lang/tx-utils";
import type { SubmitterMultiClient } from "./SubmitterMultiClient.js";
import {
    makeTxInput,
    makeTxOutputId,
    type Signature,
    type Tx,
} from "@helios-lang/ledger";
import type { TxSubmissionTracker } from "./TxSubmissionTracker.js";

export abstract class WalletSigningStrategy {
    abstract canBatch: boolean;
    wallet: Cip30Wallet;
    // wHelper: WalletHelper

    constructor(wallet: Cip30Wallet) {
        this.wallet = wallet;
    }

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
    async signTxBatch(batch: SubmitterMultiClient): Promise<(undefined | Signature[])[]> {
        if (this.canBatch) {
            throw new Error(
                `${this.constructor.name}: signTxBatch must be implemented if canBatch is true`
            );
        }

        return Promise.all(
            batch.map(async (txTracker: TxSubmissionTracker) => {
                if (!txTracker.isBuilt) {
                    throw new Error(`all txns must be built before signing`);
                }
                const sigs = await this.signTx(txTracker);;
                if (sigs) {
                    txTracker.txd.tx!.addSignatures(sigs);
                }
                return sigs ?? undefined
            })
        );
    }

    async signTx(txTracker: TxSubmissionTracker) {
        txTracker.transition("signingSingle");
        return this.signSingleTx(txTracker.txd.tx!)
            .then((sigs) => {
                console.log(`${sigs.length} sigs for ${txTracker.txLabel}`);
                debugger;
                txTracker.txd.tx!.addSignatures(sigs);
                debugger;
                txTracker.$didSignTx.bind(txTracker);
                return sigs;
            })
            .catch((e) => {
                debugger;
                console.warn("signing error: " + e.message);
            });
    }
}

export class GenericCip30Signer extends WalletSigningStrategy {
    canBatch = false;

    signSingleTx(tx: Tx): Promise<Signature[]> {
        return this.wallet.signTx(tx);
    }
}

export class DraftEternlMultiSigner extends GenericCip30Signer {
    canBatch = true;

    async signTxBatch(batch: SubmitterMultiClient) {
        debugger;
        //@ts-expect-error in this draft version of the strat
        return this.wallet.cip103
            .signTxs(batch.map((txTracker) => txTracker.txd.tx!))
            .then((signatures: Signature[][]) => {
                batch.map((txTracker, i) => {
                    const sigs = signatures[i];
                    const tx = txTracker.txd.tx;

                    txTracker.txd.tx?.addSignatures(sigs);
                    txTracker.$didSignTx();
                    return sigs;
                });
                return signatures;
            });
    }
}
