import { type Tx } from "@helios-lang/ledger";
import type { CardanoTxSubmitter } from "@helios-lang/tx-utils";
import { EventEmitter } from "eventemitter3";
import type { StellarTxnContext, SubmitOptions, TxDescription, TxDescriptionWithError, TxSubmitCallbacks } from "../StellarTxnContext.js";
import { TxSubmitMgr } from "./TxSubmitMgr.js";
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
/**
 * @public
 */
export type TxBatchChangeNotifier = {
    txAdded: [TxSubmissionTracker];
    destroyed: [BatchSubmitController];
    txListUpdated: [BatchSubmitController];
    statusUpdate: [aggregatedStateString[]];
};
/**
 * @public
 */
type numberString = `${number}`;
/**
 * @public
 */
export type stateSummary = `pending` | `building` | `confirmed` | `submitting` | `confirming` | `failed` | `mostly confirmed` | `pending`;
/**
 * @public
 */
export type aggregatedStateString = `pending` | `${numberString} confirming` | `${numberString} submitting` | `${numberString} confirmed` | `${numberString} failed` | `${numberString} mostly confirmed`;
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
export declare class BatchSubmitController {
    readonly submitters: namedSubmitters;
    setup: SetupInfo;
    submitOptions: SubmitOptions & TxSubmitCallbacks;
    $stateInfoCombined: aggregatedStateString[];
    $stateShortSummary: stateSummary;
    $txStates: AllTxSubmissionStates;
    $registeredTxs: AllTxSubmissionStates;
    isOpen: boolean;
    isConfirmationComplete: boolean;
    readonly _mainnet: boolean;
    nextUpdate?: TimeoutId;
    signingStrategy: WalletSigningStrategy;
    $txChanges: EventEmitter<TxBatchChangeNotifier>;
    destroyed: boolean;
    get chainBuilder(): import("@helios-lang/tx-utils").TxChainBuilder | undefined;
    destroy(): void;
    notDestroyed(): void;
    constructor(options: BatchSubmitControllerOptions);
    isMainnet(): boolean;
    txId(tx: Tx): string;
    changeTxId(oldId: string, newId: string): void;
    map<T>(fn: ((txd: TxSubmissionTracker, i: number) => T) | ((txd: TxSubmissionTracker) => T)): T[];
    $addTxns(tcx: StellarTxnContext): any;
    $addTxns(txd: TxDescription<any, any>): any;
    $addTxns(txds: TxDescription<any, any>[]): any;
    $txInfo(id: string): TxSubmissionTracker;
    submitToTestnet(txd: TxDescription<any, "built">, tracker: TxSubmissionTracker): void;
    addTxDescr(txd: TxDescription<any, any>): void;
    get $allTxns(): TxSubmissionTracker[];
    txError(txd: TxDescriptionWithError): Promise<void>;
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
    $signAndSubmitAll(): Promise<void>;
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
    updateAggregateState(): void;
    reqts(): {
        "allows multiple underlying submitters": {
            purpose: string;
            mech: string[];
        };
        "uses the basic hasUtxo() function to check for transaction inclusion": {
            purpose: string;
            mech: string[];
        };
        "accepts multiple txns for persistent async submission": {
            purpose: string;
            mech: string[];
        };
        "is resistant to slot battles and rollbacks": {
            purpose: string;
            mech: string[];
        };
        "has an organized structure for the state of submitting each txn": {
            purpose: string;
            mech: string[];
        };
    };
}
export {};
//# sourceMappingURL=BatchSubmitController.d.ts.map