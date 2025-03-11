import type { Cip30Wallet, Wallet, WalletHelper } from "@helios-lang/tx-utils";
import type { BatchSubmitController } from "./BatchSubmitController.js";
import {
    decodeTxWitnesses,
    makeSignature,
    makeTxInput,
    makeTxOutputId,
    type Signature,
    type Tx,
} from "@helios-lang/ledger";
import type { TxSubmissionTracker } from "./TxSubmissionTracker.js";
import { bytesToHex } from "@helios-lang/codec-utils";

export abstract class WalletSigningStrategy {
    abstract canBatch: boolean;
    wallet: Wallet;
    // wHelper: WalletHelper

    constructor(wallet: Wallet) {
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
    async signTxBatch(
        batch: BatchSubmitController
    ): Promise<(undefined | Signature[])[]> {
        if (this.canBatch) {
            throw new Error(
                `${this.constructor.name}: signTxBatch must be implemented if canBatch is true`
            );
        }

        const rv : Signature[][] = [];
        for (const txTracker of batch.map((txTracker : TxSubmissionTracker )=> txTracker)){ 
            if (!txTracker.isBuilt) {
                throw new Error(`all txns must be built before signing`);
            }
            const sigs = await this.signTx(txTracker);
            if (sigs) {
                txTracker.txd.tx!.addSignatures(sigs);
                rv.push(sigs);
            }
            txTracker.$didSignTx()
        }
        return rv
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

export class GenericSigner extends WalletSigningStrategy {
    canBatch = false;

    signSingleTx(tx: Tx): Promise<Signature[]> {
        return this.wallet.signTx(tx);
    }
}

export class DraftEternlMultiSigner extends GenericSigner {
    canBatch = true;

    async signTxBatch(batch: BatchSubmitController) {
        debugger;
        const w = (this.wallet as any).handle
        return (w.experimental as any)
            .signTxs(
                batch.map((txTracker) => {
                    return {
                        cbor: bytesToHex(txTracker.txd.tx!.toCbor()),
                        partialSign: true,
                    };
                })
            )
            .then((signatures: Signature[][]) => {
                debugger
                batch.map((txTracker, i) => {
                    const wits = signatures[i];
                    debugger
                    const sigs = decodeTxWitnesses(wits as any).signatures
                    const tx = txTracker.txd.tx;

                    txTracker.txd.tx?.addSignatures(wits);
                    txTracker.$didSignTx();
                    return wits;
                });
                return signatures;
            });
    }
}
