import {
    makeTxOutputId,
    type NetworkParams,
    type Tx,
    type TxId,
} from "@helios-lang/ledger";
import type {
    CardanoTxSubmitter,
    SubmitOnly,
} from "@helios-lang/tx-utils";
import {
    EventEmitter
} from "eventemitter3";
import type { TxDescription } from "../StellarTxnContext.js";
import {
    TxSubmitMgr,
    type dateAsMillis,
    type SubmitManagerState,
} from "./TxSubmitMgr.js";

/**
 * @public
 */
type SingleTxSubmissionState = {
    txDescription: TxDescription<any, "built">;
    state: "pending" | "submitting" | "confirming" | "confirmed" | "failed" | "mostly confirmed";
    submitters: Record<string, SubmitManagerState>;
    notifier: EventEmitter<SMC_TxStatusNotifier> 
};

/**
 * @public
 */
interface MultiTxnSubmissionState {
    [txId: string]: SingleTxSubmissionState;
}

/**
 * @public
 */
export type TimeoutId = ReturnType<typeof setTimeout>;

/**
 * @public
 */
export type SMC_TxChangeNotifier = {
    txAdded: [ SingleTxSubmissionState ];
    destroyed: [ SubmitterMultiClient ];
    txListUpdated: [ SingleTxSubmissionState[] ]
    statusUpdate: [ string ]
    // txFailed: [ SingleTxSubmissionState ]
}

/**
 * @public
 */
export type SMC_TxStatusNotifier = {
    txUpdated: [ SingleTxSubmissionState ];
    txConfirmed: [ SingleTxSubmissionState ];
    txFailed: [ SingleTxSubmissionState ];
}

/**
 * @public
 */
export type txIdString = string;
/**
 * @public
 */
export type submitterName = string;
/**
 * @public
 */
export type namedSubmitters = Record<submitterName, CardanoTxSubmitter>;
/**
 * @public
 */
export type namedTxSubmitMgrs = Record<submitterName, TxSubmitMgr>;

/**
 * @public
 */
export class SubmitterMultiClient {
    readonly submitters: namedSubmitters;
    aggregateState: string;
    state: MultiTxnSubmissionState = {};
    txSubmitMgrs: Record<txIdString, namedTxSubmitMgrs>;
    readonly mainnet: boolean;
    nextUpdate?: TimeoutId;
    txChanges: EventEmitter<SMC_TxChangeNotifier>

    destroy() {
        // cleans up all the notifiers
        for (const [txIdStr, submitMgrs] of Object.entries(this.txSubmitMgrs)) {
            this.state[txIdStr].notifier.removeAllListeners();
            for (const mgr of Object.values(submitMgrs)) {
                mgr.destroy();
            }
        } 
        this.txChanges.emit("destroyed", this);
        this.txChanges.removeAllListeners();
    }

    constructor(submitters: namedSubmitters) {
        this.submitters = submitters;
        this.txSubmitMgrs = {};
        this.aggregateState = "pending";
        this.txChanges = new EventEmitter<SMC_TxChangeNotifier>();

        if (Object.keys(submitters).length == 0) {
            throw new Error("expected at least one submitter");
        }

        const s = Object.values(this.submitters);
        this.mainnet = s.every((client) => client.isMainnet());

        if (s.some((submitter) => submitter.isMainnet() !== this.mainnet)) {
            throw new Error(
                "some submitters are for mainnet and some for testnet"
            );
        }
    }

    // scheduleStateUpdates() {
    //     if (!this.nextUpdate) {
    //         this.nextUpdate = setTimeout(() => {
    //             this.nextUpdate = undefined;
    //             this.updateAllTxStates();
    //         }, 1000);
    //     }
    // }

    // async updateAllTxStates() {
    //     const didCheckTxs: Set<string> = new Set();
    //     let remaining = 1;
    //     while (remaining) {
    //         // allows the state object to be modified asynchronously during this loop
    //         const currentTxs: Set<string> = new Set(Object.keys(this.state));
    //         // allows txs to be (async) added or removed from the state during the loop
    //         const txsToCheck = currentTxs.difference(didCheckTxs);
    //         remaining = txsToCheck.size;
    //         const txId = txsToCheck.values().take(1).next().value;
    //         if (!txId) break;
    //         // it says "await", but it should return without getting blocked
    //         await this.updateOneTxState(txId);
    //     }
    // }

    // async updateOneTxState(txId) {
    //     const stateEntry = this.state[txId];
    //     const { txDescription, state, submitters: submitterStates } = stateEntry;
    //     const { tx, description } = txDescription;
    //     if (state == "confirmed") return;

    //     stateEntry.checkingAt = Date.now()
    //     let { promise, resolve, reject } = Promise.withResolvers();

    //     stateEntry.checkPending = promise;
    //     this.updateTxSubmitters().then(resolve)
    // }

    // async updateTxSubmitters() {
    //     for (const [name, submitter] of Object.entries(this.submitters)) {

    //         await this.updateOneTxSubmitter(txId, name)
    //     }
    // }

    // async updateOneTxSubmitter(txId, name) {
    //     const { txDescription, state, submitters: submitterStates } = this.state[txId];
    //     const { tx, description } = txDescription;
    //     if (state == "confirmed") return;

    //     const submitter = this.submitters[name];
    //     const { state: subState } = submitterStates[name];
    //     if (subState == "confirmed") return;

    //     const hasUtxo = await submitter.hasUtxo(makeTxOutputId(tx.id(), 0));
    //     if (!hasUtxo) {
    //         // not yet accepted
    //         if (subState == "confirming") {
    //             // we just lost the tx's tentative confirmation
    //             submitterStates[name].state = "resubmitting";
    //         }
    //     }
    // }

    isMainnet(): boolean {
        return this.mainnet;
    }

    // async hasTx(submitter: CardanoTxSubmitter, tx: Tx): Promise<boolean> {
    //     return submitter.hasUtxo(makeTxOutputId(tx.id(), 0));
    // }

    txId(tx: Tx): string {
        const id = tx.id();
        return id.toHex();
    }

    async submitTxDescr(txd: TxDescription<any, "built">): Promise<TxId> {
        const { tx } = txd;
        const txId = this.txId(tx);
        if (this.state[txId]) {
            return tx.id();
        }
        const notifier = new EventEmitter<SMC_TxStatusNotifier>()
        notifier.on("txUpdated", this.updateAggregateState.bind(this))
        const state = (this.state[txId] = {
            txDescription: txd,
            state: "submitting",
            submitters: {},
            notifier,
        });

        this.txChanges.emit("txAdded", state);
        this.txSubmitMgrs[txId] = Object.fromEntries(
            Object.entries(this.submitters).map(([name, submitter]) => [
                name,
                new TxSubmitMgr({
                    name,
                    txId,
                    tx,
                    submitter,
                    onStateChanged: this.updateSubmitterState.bind(
                        this,
                        txId,
                        name
                    ),
                }),
            ])
        );
        return tx.id();
    }

    updateAggregateState() {
        // iterates the tx's in the state.
        // if all of them are failed, the aggregate state is failed
        // if all of them are confirmed, the aggregate state is confirmed
        // otherwise, the state is a summary with the the count of each state
        const txs = Object.values(this.state);
        const allConfirmed = txs.every((t) => t.state == "confirmed");
        if (allConfirmed) {
            this.aggregateState = "confirmed";
            return;
        }

        const allFailed = txs.every((t) => t.state == "failed");
        if (allFailed) {
            this.aggregateState = "failed";
            return;
        }
        const countConfirming = txs.filter((t) => t.state == "confirming").length;
        const countSubmitting = txs.filter((t) => t.state == "submitting").length;
        const countConfirmed = txs.filter((t) => t.state == "confirmed").length;
        const countFailed = txs.filter((t) => t.state == "failed").length;
        const countMostlyConfirmed = txs.filter((t) => t.state == "mostly confirmed").length;
        this.aggregateState = [
            countConfirming ? `${countConfirming} confirming` : null,
            countSubmitting ? `${countSubmitting} submitting` : null,
            countConfirmed ? `${countConfirmed} confirmed` : null,
            countMostlyConfirmed ? `${countMostlyConfirmed} mostly confirmed` : null,
            countFailed ? `${countFailed} failed` : null,
        ].filter((s) => s != null).join(", ");

        this.txChanges.emit("statusUpdate", this.aggregateState)
    }

    updateSubmitterState(
        txId: string,
        name: string,
        state: SubmitManagerState
    ) {
        this.state[txId].submitters[name] = state;
        const isFail = state.state == "failed";
        const submitters = Object.values(this.state[txId].submitters);
        const allConfirmed = submitters.every(s => s.state == "confirmed");
        const allFailed = submitters.every(s => s.state == "failed");
        const countConfirming = submitters.filter(s => s.state == "confirming").length;
        const countSubmitting = submitters.filter(s => s.state == "submitting").length;
        const countConfirmed = submitters.filter(s => s.state == "confirmed").length;

        this.state[txId].state = allConfirmed ? "confirmed" : 
            allFailed ? "failed" :
            countSubmitting > Math.max(countConfirming, countConfirmed) ? "submitting" :
            countConfirming > Math.max(countSubmitting, countConfirmed) ? "confirming" :
            countConfirmed > Math.max(countSubmitting, countConfirming) ? "mostly confirmed" 
            : "pending";

        const newState = this.state[txId] = {
            ...this.state[txId],
        }
        this.state[txId].notifier.emit("txUpdated", newState)
        if (newState.state == "confirmed") {
            newState.notifier.emit("txConfirmed", newState)
            newState.notifier.removeAllListeners()
        }
        if (newState.state == "failed") {
            newState.notifier.emit("txFailed", newState)
            newState.notifier.removeAllListeners()
        }

        if (isFail) {
            // trigger otherSubmitterProblem on the other submitters,
            // while skipping this one.  This might indicate a slot battle situation
            const mgrsThisTx = this.txSubmitMgrs[txId];
            const otherSubmitters = Object.entries(mgrsThisTx).filter(([n]) => n !== name);
            for (const [name, mgr] of otherSubmitters) {
                mgr.otherSubmitterProblem();
            }
        }

    }

    reqts() {
        // TODO: review all these and rework them based on 
        // the current state of the code
        // they're generally right but were just enough
        // to get the code working.  Some of the mechanisms
        // are implemented differently, and there are 
        // more outcomes, more specific details, and other
        // methods used in implementation than described here.
        return {
            "allows multiple underlying submitters": {
                purpose:
                    "enables multiple paths to distributing a tx to the network",
                mech: [
                    "? each submitter is a MinimalCardanoClient with submitTx() and hasUtxo()",
                    "? each submitter can be of a different underlying type",
                    "? all submitters should be connected to different nodes on the same network",
                ],
            },
            "uses the basic hasUtxo() function to check for transaction inclusion":
                {
                    purpose: "uses lowest common functionality for simplicity",
                    mech: [
                        "? each submitter has a hasUtxo() function",
                        "? checking for any txn needs only to check for one of its output-ids' presence",
                    ],
                },
            "accepts multiple txns for persistent async submission": {
                purpose:
                    "ensures that each transaction is reliably delivered to the network",
                mech: [
                    "? each transaction is queued for delivery through each submitter",
                    "? allows that each transaction may not be acceptable at the same time",
                    "? ensures that txns are retried as needed until confirmed at all submitters",
                    "? doesn't give up until the tx is confirmed or until least 3m after its expiration",
                ],
            },
            "is resistant to slot battles and rollbacks": {
                purpose: "ensures persistent delivery of txns into the network",
                mech: [
                    "? continues to check each submitter for tx confirmation",
                    "? each a transaction must be found at the submitter 3 separate times",
                ],
            },
            "has an organized structure for the state of submitting each txn": {
                purpose:
                    "transparency of submission progress and responsiveness to possible problems",
                mech: [
                    "? each transaction has a state object with its description and submission state",
                    "? each transaction's state object has a record of the submission state for each submitter",
                    "? the state is 'submitting' until the txn is accepted by all submitters",
                    "? the state is 'confirming' until the txn is confirmed by all submitters",
                    "? if a txn is not confirmed by all submitters after 30s, it changes to  'resubmitting' state",
                    "? after a txn is confirmed by all submitters, its state is 'confirmed'",
                ],
            },
        };
    }
}
