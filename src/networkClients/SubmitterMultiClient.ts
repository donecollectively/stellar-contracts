import {
    makeTxOutputId,
    type NetworkParams,
    type Tx,
    type TxId,
} from "@helios-lang/ledger";
import type { CardanoTxSubmitter } from "@helios-lang/tx-utils";
import { EventEmitter } from "eventemitter3";
import type {
    FacadeTxnContext,
    hasAddlTxns,
    resolvedOrBetter,
    StellarTxnContext,
    SubmitOptions,
    TxDescription,
    TxDescriptionWithError,
    TxSubmitCallbacks,
} from "../StellarTxnContext.js";
import {
    TxSubmitMgr,
    type dateAsMillis,
    type SubmitManagerState,
} from "./TxSubmitMgr.js";
import { nanoid } from "nanoid";
import {
    mkCancellablePromise,
    type ResolveablePromise,
} from "./mkCancellablePromise.js";
import { TxSubmissionTracker } from "./TxSubmissionTracker.js";
import type { SetupInfo } from "../StellarContract.js";
import type { WalletSigningStrategy } from "./WalletSigningStrategy.js";

/**
 * @public
 */
interface AllTxSubmissionStates {
    [txId: string]: TxSubmissionTracker;
}

/**
 * @public
 */
export type TimeoutId = ReturnType<typeof setTimeout>;

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

// export type TxBatchOptions = {
//     releaseEach?: "interactive" | "automatic";
//     releaseAll?: "interactive" | "automatic";
// };

// const defaultTxBatchOptions: TxBatchOptions = {
//     releaseEach: "automatic",
//     releaseAll: "automatic",
// };

/**
 * @public
 */
export type TxBatchChangeNotifier = {
    txAdded: [TxSubmissionTracker];
    destroyed: [SubmitterMultiClient];
    txListUpdated: [SubmitterMultiClient];
    statusUpdate: [aggregatedStateString[]];
    // txFailed: [ SingleTxSubmissionState ]
};
type numberString = `${number}`;

export type stateSummary =
    | `pending`
    | `building`
    | `confirmed`
    | `submitting`
    | `confirming`
    | `failed`
    | `mostly confirmed`
    | `pending`;
export type aggregatedStateString =
    | `pending`
    | `${numberString} confirming`
    | `${numberString} submitting`
    | `${numberString} confirmed`
    | `${numberString} failed`
    | `${numberString} mostly confirmed`;

export type BatchSubmitControllerOptions = {
    submitters: namedSubmitters;
    setup: SetupInfo;
    signingStrategy: WalletSigningStrategy;
    submitOptions?: SubmitOptions & TxSubmitCallbacks;
};

/**
 * Gathers and manages submission of a batch of linked transactions
 * @remarks
 * Initialized with a pool of named submitters, the batch-submit controller
 * gathers a set of transactions in collaboration with one or more
 * transaction-context ("tcx" or StellarTxnContext) objects.
 *
 * Those tcx's provide the batch controller with a set of tx-descriptions,
 * either describing themselves `{id, description, tcx, ...}` or describing
 * a set of linked `addlTxns`.  Each of those linked transactions may itself
 * resolve to a tcx having its own bounded set of `addlTxns`.  This leads
 * to an eventually-bounded tree of resolved transactions, each having
 * a short, locally-unique string `id`.  The submit controller
 * shepherds those transactions through their path from being
 * known-but-abstract (description-only), to being resolved, then
 * signed as needed and submitted through TxSubmitMgr objects.
 *
 * The tx-descriptions added to the batch-controller are exposed for
 * presentation in the UI layer, and each one also contains a notifier
 * object - an event emitter that the UI can use to easily subscribe to
 * changes in the state of each transaction as it makes progress.
 *
 * It is expected that the transaction batch will generally be signed as
 * a unit after on-screen review, either with a wallet-specific "sign multiple"
 * strategy or using a series of individual tx-signing interactions (i.e. with
 * less-capable wallet interfaces).  To achieve this, the batch controller is
 * designed to use a signing-strategy object, which works in the abstract
 * on either individual transactions or the entire batch.  When working
 * with wallets having various different mechanisms or APIs for multi-signing
 * (or not having them), the strategy object provides a simple interface to
 * support wallet-specific implementation of the intended result.
 *
 * For single-tx-signers, the signing-strategy object is expected to indicate
 * step-wise progress, so the UI can be signalled to incrementally present
 * related details about each tx as appropriate for the dApp's user-interaction
 * model).  Full-batch signing strategies SHOULD NOT emit single-tx signing
 * signals.
 *
 * Once the signature(s) are collected for any tx, the submit-controller
 * creates txSubmitMgrs for that tx, and it aggregates the net state of
 * each transaction's submission progress. The aggregated information
 * about per-tx progress is included in state updates emitted to subscribers
 * of that transaction's change-notification events, for UI-level presentation
 * purposes.
 * @public
 */
export class /* BatchSubmitController */ SubmitterMultiClient {
    readonly submitters: namedSubmitters;
    setup: SetupInfo;
    submitOptions: SubmitOptions & TxSubmitCallbacks;
    $stateInfoCombined: aggregatedStateString[];
    $stateShortSummary: stateSummary;
    $txStates: AllTxSubmissionStates = {};
    $registeredTxs: AllTxSubmissionStates = {};
        // txSubmitMgrs: Record<txIdString, namedTxSubmitMgrs>;
    isOpen = false;
    isConfirmationComplete = false;
    readonly _mainnet: boolean;
    nextUpdate?: TimeoutId;
    signingStrategy: WalletSigningStrategy
    $txChanges: EventEmitter<TxBatchChangeNotifier>;
    // releaseAllOption?: TxBatchOptions["releaseAll"];
    destroyed = false;
    // submitAll?:
    //     | ResolveablePromise<void>
    //     | {
    //           promise: Promise<void>;
    //           status: "automatic";
    //       };

    get chainBuilder() {
        return this.setup.chainBuilder
    }
    
    destroy() {
        // cleans up all the notifiers
        for (const [txIdStr, submitTracker] of Object.entries(this.$registeredTxs)) {
            submitTracker.destroy();
        }
        for (const [txIdStr, submitTracker] of Object.entries(this.$txStates)) {
            submitTracker.destroy();
        }
        this.$txChanges.emit("destroyed", this);
        this.$txChanges.removeAllListeners();
        this.$txStates = {};
        this.destroyed = true;
    }
    notDestroyed() {
        if (this.destroyed) {
            throw new Error("submitter-multi-client has been destroyed");
        }
    }

    constructor(options: BatchSubmitControllerOptions) {
        const {
            submitters,
            setup,
            signingStrategy,
            submitOptions={},
        } = options
        this.submitters = submitters;
        this.setup = setup;
        this.signingStrategy = signingStrategy;
        this.submitOptions = submitOptions;
        this.$stateInfoCombined = ["pending"];
        this.$stateShortSummary = "pending";
        this.$txChanges = new EventEmitter<TxBatchChangeNotifier>();

        if (Object.keys(submitters).length == 0) {
            throw new Error("expected at least one submitter");
        }

        const s = Object.values(this.submitters);
        this._mainnet = s.every((client) => client.isMainnet());

        if (s.some((submitter) => submitter.isMainnet() !== this._mainnet)) {
            throw new Error(
                "some submitters are for mainnet and some for testnet"
            );
        }
    }

    isMainnet(): boolean {
        return this._mainnet;
    }

    // async hasTx(submitter: CardanoTxSubmitter, tx: Tx): Promise<boolean> {
    //     return submitter.hasUtxo(makeTxOutputId(tx.id(), 0));
    // }

    txId(tx: Tx): string {
        const id = tx.id();
        return id.toHex();
    }

    map<T>(
        fn:
            | ((txd: TxSubmissionTracker, i: number) => T)
            | ((txd: TxSubmissionTracker) => T)
    ) {
        return [ 
            ...Object.values(this.$txStates),
            ...Object.values(this.$registeredTxs)
        ].map(fn);
    }

    async $addTxns(tcx: StellarTxnContext);
    //, options?: TxBatchOptions);
    async $addTxns(txd: TxDescription<any, any>);
    //, options?: TxBatchOptions);
    async $addTxns(txds: TxDescription<any, any>[]);
    //, options?: TxBatchOptions);
    async $addTxns(
        tcxd:
            | StellarTxnContext
            | TxDescription<any, any>
            | TxDescription<any, any>[]

        // options: TxBatchOptions = this.defaultTxBatchOptions
    ) {
        this.notDestroyed();
        // const { releaseEach, releaseAll } = options;
        //@ts-expect-error on type probe
        if (!tcxd.isFacade && !!tcxd.state) {
            // when there's not a wrapper TxDescription, 
            // then this is a StellarTxnContext. We construct a TxDescription
            // ... based on the already-existing
            const tcx: StellarTxnContext = tcxd as any;
            const tx = tcx._builtTx ? await tcx._builtTx : undefined;
            const id = tcx?.id  ?? nanoid(5);
            this.addTxDescr({
                description: tcx.txnName || "‹unnamed txn›",
                id,
                tcx,
                txName: tcx.txnName,
                depth: tcx.depth, // should typically be 0
                parentId: tcx.parentId, // should typically be empty
            });
            for (const [name, txd] of Object.entries(tcx.addlTxns)) {
                this.addTxDescr(txd);
                // , options);
            }
        } else if (
            //prettier-ignore
            //@ts-ignore-error on type probe
            !! tcxd.state && tcxd.addlTxns
        ) {
            // it's a facade transaction.
            const tcx: hasAddlTxns<any> = tcxd as any;
            return this.$addTxns(Object.values(tcx.addlTxns));
            // , options);
        } else if (Array.isArray(tcxd)) {
            for (const txd of tcxd) {
                this.addTxDescr(txd);
                //, options);
            }
        } else {
            const txd = tcxd as TxDescription<any, any>;
            this.addTxDescr(txd);
            // , options);
        }
    }


    $txInfo(id: string) {
        this.notDestroyed();
        return this.$txStates[id] || this.$registeredTxs[id];
    }

    addTxDescr(
        txd: TxDescription<any, any>
        // options: TxBatchOptions = this.defaultTxBatchOptions
    ) {
        this.notDestroyed();
        const { id } = txd;

        this.isOpen = true;
        const pendingTracker = this.$registeredTxs[id];
        const builtTracker = this.$txStates[id];
        if (builtTracker && pendingTracker) {
            throw new Error(
                `impossible membership in both registered- and built-tx list: ${id}`
            );
        }
        let tracker: TxSubmissionTracker = builtTracker || pendingTracker
        if (tracker) {
            if (Object.keys(tracker.txSubmitters).length) {
                throw new Error(`tx '${id}' already present and submitting`);
            }
        }  
        if (pendingTracker && txd.tcx) {
            // move a "was-pending" tx to the "built" list
            delete this.$registeredTxs[id];

            this.$txStates[id] = pendingTracker;
            if (txd.tcx?.alreadyPresent) {
                pendingTracker.transition("alreadyDone")
            }
        } else if (!builtTracker) {
            const {
                parentId, depth
            } = txd
            tracker = new TxSubmissionTracker({
                txd,
                submitters: this.submitters,
                setup: this.setup,
            });

            tracker.$notifier.on(
                "changed",
                this.updateAggregateState.bind(this)
            );
            if (txd.tcx) {
                // adds resolved txs to the end of 
                // the tx-trackers list
                this.$txStates[id]= tracker
            } else {
                // splits $registeredTxs into two lists: one having txns with this same parentId
                // and one with any other parent-ids.  Both must preserve the order of the original list.
                const [others, sameParentId] = Object.entries(this.$registeredTxs).reduce(
                    ([others, sameParentId], [k, v]) => {
                        if (v.txd.parentId == parentId) {
                            sameParentId[k] = v;
                        } else {
                            others[k] = v;
                        }
                        return [others, sameParentId];
                    },
                    [{} as AllTxSubmissionStates, {} as AllTxSubmissionStates]
                )                
                // adds newly registered txs at the
                // top of known-txs list
                this.$registeredTxs = {
                    ...sameParentId,
                    [id]: tracker,
                    ... others
                }
            }
            this.$txChanges.emit("txAdded", tracker);
            this.$txChanges.emit("txListUpdated", this);
        }

        tracker.update(txd);
        this.$txChanges.emit("txListUpdated", this);
    }

    get $allTxns() {
        return [
            ...Object.values(this.$txStates),
            ...Object.values(this.$registeredTxs),
        ];
    }

    async txError(txd: TxDescriptionWithError) {
        this.notDestroyed();
        const { id, tcx, tx, error } = txd;

        if (this.$txStates[id]) {
            const existing = this.$txStates[id];
            existing.update(txd, "failed");

            this.updateAggregateState();
        }
    }

    /**
     * triggers all the transactions in the batch to be signed
     * and submitted.
     * @remarks
     * While the transactions are being signed, the signing-strategy
     * object will emit incremental status updates (the "signingSingleTx" event)
     * if it only supports signing one tx at a time.  If it supports multiple
     * tx signing, it should emit a single "signingAll" event instead.
     *
     * UI implementations are expected to listen for signingSingleTx events
     * and present a useful summary of the current transation being signed,
     * to ease the user's understanding of the signing process.
     *
     * If signing is successful, the batch controller will continue by
     * submitting each transation for submission through each of
     * the submitters configured on the batch controller.
     *
     * The controller and individual tx-submission trackers will continue
     * emitting status update events as each tx makes progress.  UIs
     * should continue reflecting updated state information to the user.
     * @public
     */

    async $signAndSubmitAll(
        // txd: TxDescription<any, "built">,
        // submitOptions: SubmitOptions & TxSubmitCallbacks = {}
    ) {
        debugger
        if (!this.setup.isTest) {
            const result = await this.signingStrategy.signTxBatch(this);
            console.log("signingStrategy result: ", result);
            debugger
        }
    }

    // async $submitTxDescr(txd: TxDescription<any, "built">): Promise<TxId> {
    //     this.notDestroyed();
    //     const {
    //         tx,
    //         tcx: { id },
    //     } = txd;
    //     // const txId = tx.id().toString();
    //     if (!this.$txStates[id]) {
    //         this.addTxDescr(txd);
    //     }
    //     return tx.id();
    // }

    /**
     * Updates the aggregate state of the tx batch and notifies listeners
     * @remarks
     * The aggregate state is a summary of the state of all the tx's in the batch.
     *
     * It counts the number of tx's in each state, and emits a  `statusUpdate`
     * event to the batch-controller's {@link SubmitterMultiClient.$txChanges|txChanges}
     * event stream.
     *
     * The result is
     * @public
     */
    updateAggregateState() {
        this.notDestroyed();
        // iterates the tx's in the state.
        // if all of them are failed, the aggregate state is failed
        // if all of them are confirmed, the aggregate state is confirmed
        // otherwise, the state is a summary with the the count of each state
        const txTrackers = [
            ... Object.values(this.$registeredTxs),
            ... Object.values(this.$txStates)
        ]
        const count = txTrackers.length;
        const allConfirmed =
            count && txTrackers.every((t) => t.$state == "confirmed");
        const allFailed =
            count &&
            txTrackers.every((txTracker) => txTracker.$state == "failed");
        if (!count) {
            console.warn(
                "unreachable updateAggregateState before having tx trackers?"
            );
            this.$stateInfoCombined = ["pending"];
            this.$stateShortSummary = "pending";
        } else if (allConfirmed) {
            this.$stateInfoCombined = [`${txTrackers.length} confirmed`];
            this.$stateShortSummary = "confirmed";
            this.isConfirmationComplete = true;
        } else if (allFailed) {
            this.$stateInfoCombined = [`${txTrackers.length} failed`];
            this.$stateShortSummary = "failed";
        } else {
            const countConfirming = txTrackers.filter(
                (t) => t.$state == "confirming"
            ).length;
            const countSubmitting = txTrackers.filter(
                (t) => t.$state == "submitting"
            ).length;
            const countConfirmed = txTrackers.filter(
                (t) => t.$state == "confirmed"
            ).length;
            const countFailed = txTrackers.filter(
                (t) => t.$state == "failed"
            ).length;
            const countMostlyConfirmed = txTrackers.filter(
                (t) => t.$state == "mostly confirmed"
            ).length;
            const countRegistered = txTrackers.filter(
                (t) => t.$state == "registered"
            ).length;
            const countBuilding = txTrackers.filter(
                (t) => t.$state == "building"
            ).length;
            this.$stateInfoCombined = [
                countConfirming ? `${countConfirming} confirming` : null,
                countSubmitting ? `${countSubmitting} submitting` : null,
                countConfirmed ? `${countConfirmed} confirmed` : null,
                countMostlyConfirmed
                    ? `${countMostlyConfirmed} mostly confirmed`
                    : null,
                countFailed ? `${countFailed} failed` : null,
            ].filter((s) => s != null) as any;

            if (count == countConfirmed) {
                this.$stateShortSummary = "confirmed";
            } else if (count == countFailed) {
                this.$stateShortSummary = "failed";
            } else if (
                count ==
                countConfirmed + countConfirming + countMostlyConfirmed
            ) {
                this.$stateShortSummary = "confirming";
            } else if (count == countConfirmed + countMostlyConfirmed) {
                this.$stateShortSummary = "mostly confirmed";
            } else if (!countBuilding && !countRegistered) {
                this.$stateShortSummary = "pending";
            } else if (countRegistered + countBuilding > 0) {
                this.$stateShortSummary = "building";
            } else {
                this.$stateShortSummary = "submitting";
            }
        }
        this.$txChanges.emit("statusUpdate", this.$stateInfoCombined);
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

