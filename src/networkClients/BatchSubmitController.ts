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
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("0123456789abcdefghjkmnpqrstvwxyz", 12);
import {
    mkCancellablePromise,
    type ResolveablePromise,
} from "./mkCancellablePromise.js";
import { TxSubmissionTracker } from "./TxSubmissionTracker.js";
import type { SetupInfo } from "../StellarContract.js";
import type { WalletSigningStrategy } from "./WalletSigningStrategy.js";
import { hasReqts } from "../Requirements.js";

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
    destroyed: [BatchSubmitController];
    txListUpdated: [BatchSubmitController];
    statusUpdate: [aggregatedStateString[]];
    // txFailed: [ SingleTxSubmissionState ]
};

/**
 * @public
 */
type numberString = `${number}`;

/**
 * @public
 */
export type stateSummary =
    | `pending`
    | `building`
    | `confirmed`
    | `submitting`
    | `confirming`
    | `failed`
    | `mostly confirmed`
    | `pending`;

/**
 * @public
 */
export type aggregatedStateString =
    | `pending`
    | `${numberString} confirming`
    | `${numberString} submitting`
    | `${numberString} confirmed`
    | `${numberString} failed`
    | `${numberString} mostly confirmed`;

/**
 * @public
 */
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
export class BatchSubmitController {
    /* was SubmitterMultiClient */
    readonly submitters: namedSubmitters;
    setup: SetupInfo;
    submitOptions: SubmitOptions & TxSubmitCallbacks;
    $stateInfoCombined: aggregatedStateString[];
    $stateShortSummary: stateSummary;
    $txStates: AllTxSubmissionStates = {};
    $registeredTxs: AllTxSubmissionStates = {};
    isOpen = false;
    isConfirmationComplete = false;
    readonly _mainnet: boolean;
    nextUpdate?: TimeoutId;
    signingStrategy: WalletSigningStrategy;
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
        return this.setup.chainBuilder;
    }

    destroy() {
        // cleans up all the notifiers
        for (const [txIdStr, submitTracker] of Object.entries(
            this.$registeredTxs
        )) {
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
            submitOptions = {},
        } = options;
        this.submitters = submitters;
        this.setup = setup;
        if (!this.setup.network) {
            debugger;
        }
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

    changeTxId(oldId: string, newId: string) {
        const where = this.$txStates[oldId]
            ? this.$txStates
            : this.$registeredTxs;
        const tracker = where[oldId];
        if (!tracker) {
            throw new Error(`no tracker found for tx '${oldId}'`);
        }
        tracker.txd.id = newId;
        delete where[oldId];
        where[newId] = tracker;
    }

    map<T>(
        fn:
            | ((txd: TxSubmissionTracker, i: number) => T)
            | ((txd: TxSubmissionTracker) => T)
    ) {
        return [
            ...Object.values(this.$txStates),
            ...Object.values(this.$registeredTxs),
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
        if (Array.isArray(tcxd)) {
            for (const txd of tcxd) {
                this.addTxDescr(txd);
                //, options);
            }
        }
        //@ts-expect-error on type probe
        else if (tcxd.kind == "StellarTxnContext") {
            // when there's not a wrapper TxDescription,
            // then this is a StellarTxnContext. We construct a TxDescription
            // ... based on the already-existing transaction context

            const tcx: StellarTxnContext = tcxd as any;
            if (!tcx.isFacade && !!tcx.state) {
                const tx = tcx._builtTx ? await tcx._builtTx : undefined;
                const id = tcx?.id ?? nanoid(5);
                this.addTxDescr({
                    description: tcx.txnName || "‹unnamed txn›",
                    id,
                    tcx,
                    tx,
                    txName: tcx.txnName,
                    depth: tcx.depth, // should typically be 0
                    parentId: tcx.parentId, // should typically be empty
                });
                for (const [name, txd] of Object.entries(tcx.addlTxns)) {
                    this.addTxDescr(txd);
                }
            } else if (!! tcx.state && tcx.addlTxns) {
                // for a tx facade, only the addlTxns are relevant
                return this.$addTxns(Object.values(tcx.addlTxns));
            } else {
                debugger
                throw new Error(`unexpected tcx state: ${tcx.state} (dbpa)`);
            }
        } else {
            const txd = tcxd as TxDescription<any, any>;
            this.addTxDescr(txd);
        }
    }

    $txInfo(id: string) {
        this.notDestroyed();
        return this.$txStates[id] || this.$registeredTxs[id];
    }

    submitIfIsTestnet(
        txd: TxDescription<any, "built">,
        tracker: TxSubmissionTracker
    ) {
        if (!this.setup.isTest) return;

        const { network } = this.setup;
        const {
            tcx,
            tx,
            tcx: { logger, _builtTx },
        } = txd;
        tracker.isSigned = true; // bit of a fib, but in test-env is ok
        const t = network.submitTx(tx);
        // //@ts-expect-error
        // if (t.then) {
        //     debugger
        //     throw new Error(`emulator's submitTx() should work synchronously`);
        // }
        //@ts-expect-error probing for the test-network-emulator's tick
        //   ... in regular execution environment, this is a no-op
        this.setup.network?.tick(1);

        tracker._emulatorConfirmed();
    }

    addTxDescr(
        txd: TxDescription<any, any>
        // options: TxBatchOptions = this.defaultTxBatchOptions
    ) {
        this.notDestroyed();
        const { id, depth, parentId } = txd;

        this.isOpen = true;
        const pendingTracker = this.$registeredTxs[id];
        const builtTracker = this.$txStates[id];
        if (builtTracker && pendingTracker) {
            throw new Error(
                `impossible membership in both registered- and built-tx list: ${id}`
            );
        }
        let tracker: TxSubmissionTracker = builtTracker || pendingTracker;
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
                pendingTracker.transition("alreadyDone");
            } else if (txd.tcx?.isFacade) {
                // this isn't the expected path for a facade txn, but for completeness...
                pendingTracker.transition("isFacade");
            } else {
                this.submitIfIsTestnet(
                    txd as TxDescription<any, "built">,
                    pendingTracker
                );
            }
            tracker.update(txd);
        } else if (!builtTracker) {
            const { parentId, depth } = txd;
            const patchedTxd = (() => {
                if (!parentId) return txd;
                const parent = this.$txInfo(parentId);
                if (!parent) {
                    // debugger
                    console.warn("tx batcher: no parent", parentId);
                    return txd;
                }
                const pDepth = parent.txd.depth;
                return { ...txd, depth: 1 + pDepth };
            })();
            tracker = new TxSubmissionTracker({
                txd: patchedTxd,
                submitters: this.submitters,
                setup: this.setup,
            });

            tracker.$notifier.on(
                "changed",
                this.updateAggregateState.bind(this)
            );

            if (txd.tx) {
                // adds resolved txs to the end of
                // the tx-trackers list
                this.$txStates[id] = tracker;
                this.submitIfIsTestnet(
                    txd as TxDescription<any, "built">,
                    tracker
                );
            } else {
                // splits $registeredTxs into two lists: one having txns with this same parentId
                // and one with any other parent-ids.  Both must preserve the order of the original list.
                const [others, sameParentId] = Object.entries(
                    this.$registeredTxs
                ).reduce(
                    ([others, sameParentId], [k, v]) => {
                        if (v.txd.parentId == parentId) {
                            sameParentId[k] = v;
                        } else {
                            others[k] = v;
                        }
                        return [others, sameParentId];
                    },
                    [{} as AllTxSubmissionStates, {} as AllTxSubmissionStates]
                );
                // adds newly registered txs at the
                // top of known-txs list
                this.$registeredTxs = {
                    ...sameParentId,
                    [id]: tracker,
                    ...others,
                };
            }
            tracker.update(patchedTxd);
            this.$txChanges.emit("txAdded", tracker);
            this.$txChanges.emit("txListUpdated", this);
        }

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

    async $signAndSubmitAll() {
        // submitOptions: SubmitOptions & TxSubmitCallbacks = {} // txd: TxDescription<any, "built">,
        // debugger
        if (!this.setup.isTest) {
            const result = await this.signingStrategy.signTxBatch(this);
            console.log("signingStrategy result: ", result);
            debugger;
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
     * event to the batch-controller's {@link BatchSubmitController.$txChanges|txChanges}
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
            ...Object.values(this.$registeredTxs),
            ...Object.values(this.$txStates),
        ];
        const count = txTrackers.length;
        const allConfirmed =
            count &&
            txTrackers.every(
                (t) => t.$state == "confirmed" || t.$state == "not needed"
            );
        const anyFailed =
            count &&
            txTrackers.some((txTracker) => txTracker.$state == "failed");
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
            // Batch lifecycle complete — clear the chain builder from shared setup.
            // The chain builder's tx list is stale after confirmation and causes
            // duplicate UTxOs in queries (its getUtxos appends chain outputs that
            // the source already includes). Per-tx tracking continues independently
            // via PendingTxTracker / CachedUtxoIndex.
            this.setup.chainBuilder = undefined;
        } else if (anyFailed) {
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
                countConfirming > 0 &&
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
        return hasReqts({
            "manages the submission of transactions to the network": {
                purpose: "provides users with simple status info on multiple txns",
                details: [
                    "accepts one or more transactions to be tracked",
                    "supports transactions built via callback, with details only known later",
                    "automaticallly registered additional txns chained on the end of any other txn",
                    "manages the tree of txns for visualization in UI",
                    "organizes them into a consistent state model (pending, building, signing, submitting, confirming, confirmed, failed)",
                    "aggregates the state of all tracked transactions into a single summary",
                    "emits events that collaborators can subscribe to for updates when individual or aggregate state changes",
                ],
                mech: [
                    "uses `TxSubmissionTracker` to manage state for each transaction",
                    "its $txChanges is a typed event emitter ",
                    "the `txAdded` event is emitted when a new transaction is added",
                    "the `statusUpdate` event is emitted when the aggregate state changes",
                    "the `txListUpdated` event is emitted when the list of transactions changes",
                    "the `destroyed` event is emitted when the batch controller is destroyed",
                ],
                requires: [
                    "processes each submitted transaction through its own tracking pipeline",
                    "maintains the tree of transactions for visualizing nested txns",
                    "accepts multiple txns for persistent async submission",
                    "allows multiple underlying submitters",
                    "has an organized structure for the state of submitting each individual txn",
                    "processes updated states of any transaction by id",
                    "uses each submitter's basic hasUtxo() function to check for tx confirmations",
                    "is resistant to slot/block battles and rollbacks",
                    "supports tcx callback transactions",
                ]
            },
            "supports tcx callback transactions": {
                purpose: "supports transactions built via callback, with details only known later",
                details: [
                    "accepts transactions built via callback, with details only known later",
                ],
                mech: [
                    "adds a new transaction to the `$registeredTxs` group when a callback transaction is added",
                    "the resulting tcx from a callback transaction MAY be a facade, without its own tx details",
                    "when the callback transaction is built, any nested transactions are detected at that time",
                    "relies on incrementa;l txd updates and the StellarTxnContext's buildAndQueueAll() for building the transactions ",
                    "relies on the StellarTxnContext to build transactions in depth-first order for execution"
                ],
                requires: [
                    "processes nested transactions (facades and child txns)",
                    "processes updated states of any transaction by id",
                    "accepts multiple txns for persistent async submission",
                    "has an organized structure for the state of submitting each individual txn",
                ]
            },
            "maintains aggregate state of all transactions": {
                purpose: "provides a simple view of the state of all transactions",
                details: [
                    "by tracking all the known transactions, and watching their state changes, it can provide a simple view of the state of all transactions",
                    "when an transaction fails, it reflects the entire batch as `failed`",
                    "when all the transactions are confirmed (or not needed), the batch is `confirmed`",
                    "aggregation logic is applied to other combinations of states",
                ],
                mech: [
                    "subscribes to the `statusUpdate` event from each TxSubmissionTracker",
                    "calculates aggregate state in `updateAggregateState`",
                    "iterates the transactions in `$txStates` and `$registeredTxs`",
                    "emits a `statusUpdate` event when the aggregate state changes",
                ],
                requires: [
                    "processes each submitted transaction through its own tracking pipeline",
                    "has an organized structure for the state of submitting each individual txn",
                    "accepts multiple txns for persistent async submission",
                    "processes nested transactions (facades and child txns)"
                ]
            },
            "processes nested transactions (facades and child txns)": {
                purpose: "supports the management of nested transactions",
                details: [
                    "accepts nested transactions (facades and child txns)",
                    "maintains the tree of transactions for visualization in UI",
                ],
                mech: [
                    "adds nested transactions to the `$registeredTxs` group",
                    "doesn't create a TxSubmissionTracker for facade transactions",
                    "automatically registers parent-tx-id's for visualizing nested txns",
                ],
                requires: [
                    "processes each submitted transaction through its own tracking pipeline",
                    "accepts multiple txns for persistent async submission",
                ]
            },
            "processes each submitted transaction through its own tracking pipeline": {
                purpose: "proactively manages each transaction and supports UI interactions",
                details: [
                    "accepts new transactions to the batch (via `$addTxns()`)",
                    "allows the same tx description to be added multiple times for continuing evolution",
                    "maintains two groups of registered and already-built transactions",
                    "keeps the transactions in order of addition to match on-chain submission order needs",
                ],
                mech: [
                    "exposes an $addTxns method for adding transactions to the batch",
                    "$addTxns accepts a StellarTxnContext, TxDescription, or array of TxDescriptions",
                    "adds new transactions to the end of the list of known transactions",
                    "creates a TxSubmissionTracker for each added transaction",
                    "adds unbuilt transactions to the `$registeredTxs` group",
                    "adds built transactions to the `$txStates` group",
                    "moves a transaction from the `$registeredTxs` group to the `$txStates` group when a built tx is found",
                    "sends updated txd to the TxSubmissionTracker to handle tx-level state progression",
                    "relies on event subscriptions on the TxSubmissionTracker to for its own aggregate state progression",
                ],
                requires: [
                    "has an organized structure for the state of submitting each individual txn",
                    "processes updated states of any transaction by id",
                ]
            },
            "processes updated states of any transaction by id": {
                purpose: "retains a unified state of all its transactions while tracking them in two groups",
                details: [
                    "exposes a $txInfo method for getting the state of any transaction by id",
                    "$txInfo returns a TxSubmissionTracker for the transaction",
                    "TxSubmissionTracker maintains the state of the transaction",
                    "the `registered` group is for transactions that are not yet done being built",
                    "the `submitting` group is for transactions that are built and are being submitted",
                ],
                mech: [
                    "uses a map of all transactions by id in $txStates and $registeredTxs",
                    "merges the `registered` and `submitting` maps into a $allTxns as a single list of TxSubmissionTrackers",
                    "allows iterating over the transactions with a map() method",
                    "has a $txInfo method for getting the state of any transaction by id",
                ]
            },
            "maintains the tree of transactions for visualizing nested txns": {
                purpose: "supports the UI to visualize the tx batch structure",
                details: [
                    "recognizes transactions that are their own batch ('facades')",
                    "recognizes transactions containing chained transactions ('child txns')",
                ],
                mech: [
                    "adds nested transactions to batch automatically",
                    "registers parent-tx-id's for nested txns",
                    "orders parent transactions (facade or otherwise) before child txns",
                    "orders newly-detected child transactions after other transactions in the same parent-tx-id group",
                ],
                requires: [
                    "processes nested transactions (facades and child txns)"
                ]
            },
            "allows multiple underlying submitters": {
                purpose: "enables multiple paths to distributing a tx to the network",
                details: [
                    "accepts a map of named submitters in constructor",
                    "validates that all submitters are on the same network (mainnet vs testnet)",
                    "distributes each transaction to all configured submitters",
                ],
                mech: [
                    "stores submitters in `this.submitters`",
                    "passes the full list of submitters to each `TxSubmissionTracker`",
                    "TxSubmissionTracker creates a `TxSubmitMgr` for each submitter",
                ],
            },
            "uses each submitter's basic hasUtxo() function to check for tx confirmations": {
                purpose: "uses lowest common functionality for simplicity",
                details: [
                    "checks for transaction confirmation by looking for its outputs on-chain",
                    "supports submitters that only provide `hasUtxo` without full `getTx` capability",
                ],
                mech: [
                    "delegates confirmation check to `TxSubmitMgr`",
                    "`TxSubmitMgr` prefers `getTx` if available, otherwise calls `hasUtxo` with the 0th output ID of the tx",
                ],
            },
            "accepts multiple txns for persistent async submission": {
                purpose: "ensures that each transaction is reliably delivered to the network",
                details: [
                    "allows adding transactions via `StellarTxnContext` or `TxDescription`",
                    "supports adding dependent transactions (facade or child txns)",
                    "persists in submitting until confirmed or failed/expired",
                ],
                mech: [
                    "`$addTxns` method handles various input formats and creates trackers",
                    "trackers persist through `TxSubmissionTracker` state machine",
                    "retry logic is handled within `TxSubmitMgr` with backoff strategies",
                ],
                requires: [
                    "processes each submitted transaction through its own tracking pipeline"
                ],
            },
            "is resistant to slot/block battles and rollbacks": {
                purpose: "ensures persistent delivery of txns into the network",
                details: [
                    "detects if a transaction is not confirmed as expected",
                    "monitors multiple submitters for consensus or failure",
                    "re-submits if necessary when one path fails but validity allows",
                ],
                mech: [
                    "`TxSubmitMgr` detects `battleDetected` scenarios",
                    "if one submitter fails (e.g. `otherSubmitterProblem`), others are notified to maintain vigilance or re-submit",
                    "confirmation depth is tracked in `TxSubmitMgr` (requires multiple confirmations for 'hard' confirm)",
                ],
            },
            "has an organized structure for the state of submitting each individual txn": {
                purpose: "transparency of submission progress and responsiveness to possible problems",
                details: [
                    "tracks lifecycle: registered -> building -> built -> signing -> submitting -> confirming -> confirmed",
                    "handles failure and retries explicitly",
                    "provides granular state for each submitter of each transaction",
                ],
                mech: [
                    "uses `TxSubmissionTracker`' StateMachine for each specific transaction",
                    "uses `TxSubmitMgr`'s StateMachine for per-submitter progress",
                    "states are aggregated up from submit-mgr to tx-submission-tracker to batch-controller",
                ],
            },
        });
    }
}
