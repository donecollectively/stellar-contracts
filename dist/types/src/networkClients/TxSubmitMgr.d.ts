import { type NetworkParams, type Tx, type TxId } from "@helios-lang/ledger";
import type { CardanoClient, CardanoTxSubmitter, SubmissionExpiryError, SubmissionUtxoError } from "@helios-lang/tx-utils";
import { type WrappedPromise } from "./mkCancellablePromise.js";
import type { SetupInfo } from "../StellarContract.js";
import type { TxDescription } from "../StellarTxnContext.js";
import { StateMachine, type StateTransitionTable } from "../StateMachine.js";
/**
 * @public
 */
export type dateAsMillis = number;
/**
 * @public
 */
export type SubmitManagerState = {
    pendingActivity: string;
    nextActivityDelay?: number;
    lastSubmissionAttempt?: dateAsMillis;
    isBadTx?: Error;
    failedSubmissions: number;
    successfulSubmitAt?: number;
    expirationDetected: boolean;
    confirmations: number;
    firstConfirmedAt?: dateAsMillis;
    lastConfirmedAt?: dateAsMillis;
    confirmationFailures: number;
    lastConfirmationFailureAt?: dateAsMillis;
    lastConfirmAttempt?: dateAsMillis;
    battleDetected: boolean;
    serviceFailures: number;
    signsOfServiceLife: number;
    lastServiceFailureAt?: dateAsMillis;
    totalSubmissionAttempts: number;
    totalSubmissionSuccesses: number;
    totalConfirmationAttempts: number;
    totalConfirmationSuccesses: number;
    nextActivityStartTime?: dateAsMillis;
};
/**
 * @public
 */
type TxSubmitterStates = "submitting" | "confirming" | "softConfirmed" | "confirmed" | "failed";
/**
 * @public
 */
type TxSubmitterTransitions = "submitted" | "confirmed" | "unconfirmed" | "hardConfirm" | "failed" | "notOk" | "timeout" | "txExpired" | "reconfirm" | "otherSubmitterProblem";
/**
 * @public
 */
export type SubmitterRetryIntervals = {
    reconfirm?: number;
    submit?: number;
    confirm?: number;
    startup?: number;
    maximum?: number;
};
/**
 * manages the submission of a single transaction to a single submitter
 * @public
 */
export declare class TxSubmitMgr extends StateMachine<TxSubmitterStates, TxSubmitterTransitions> {
    name: string;
    submitter: CardanoTxSubmitter;
    txd: TxDescription<any, "signed">;
    get $$statusSummary(): {
        status: TxSubmitterStates;
        currentActivity: string;
        deferredAction: string;
        confirmations: number;
        hasConfirmationProblems: boolean;
        expirationDetected: boolean;
        isHealthy: boolean;
        isBadTx: Error | undefined;
        recovering: boolean;
        nextActivityStartTime: number | undefined;
        stats: {
            totalSubmissionAttempts: number;
            totalSubmissionSuccesses: number;
            totalConfirmationAttempts: number;
            totalConfirmationSuccesses: number;
            confirmationFailures: number;
            signsOfServiceLife: number;
        };
    };
    $mgrState: SubmitManagerState;
    setup: SetupInfo;
    submitIssue?: string;
    pending: (WrappedPromise<any> & {
        activity: string;
    }) | undefined;
    retryIntervals: Required<SubmitterRetryIntervals>;
    constructor(args: {
        name: string;
        txd: TxDescription<any, "signed">;
        setup: SetupInfo;
        submitter: CardanoTxSubmitter;
        retryIntervals?: SubmitterRetryIntervals;
    });
    destroy(): void;
    get networkParams(): NetworkParams;
    get network(): CardanoClient;
    get stateMachineName(): string;
    get txDescription(): string;
    /**
     * the locally-unique id-ish label of the tx description
     * @remarks
     * see {@link TxSubmitMgr.txId|txId} for the actual txId available after the tx is built
     */
    get id(): string;
    get txId(): TxId;
    get tx(): Tx;
    wasUpdated(): void;
    get initialState(): TxSubmitterStates;
    resetState(): void;
    otherSubmitterProblem(): void;
    nothingPendingAllowed(that: string): void;
    pendingActivity<P>(activityName: string, p: Promise<P>): Promise<P | undefined>;
    done(activityName: string): void;
    tryConfirm(): Promise<void>;
    didConfirm(): void;
    notConfirmed(problem?: Error): void;
    scheduleAnotherConfirmation(this: this, transitionName: TxSubmitterTransitions, reason: string, backoff?: number): import("../StateMachine.js").DeferredState<this>;
    trySubmit(): Promise<void>;
    inputUtxosAreResolvable(): Promise<boolean>;
    notSubmitted(problem: Error): Promise<void>;
    scheduleAnotherSubmit(transitionName: TxSubmitterTransitions, displayStatus: string, backoff?: number): import("../StateMachine.js").DeferredState<this>;
    nextStartTime(retryInterval: number): void;
    txExpired(): void;
    resetConfirmationStats(): void;
    /**
     * mockable method for checking an error (provided by the submitter)
     * to see if the submitter understands it to be of the "unknown UTXO" type
     * @remarks
     * When a utxo is unknown, it can mean it was existing and is now spent,
     * or it can mean it was not yet known to exist.  The error message can
     * potentially indicate either of these cases, and ideally the submitter can
     * tell the difference.  In any case, a truthy response indicates that the
     * tx is not yet submittable.
     */
    isUnknownUtxoError(problem: Error | SubmissionUtxoError): boolean;
    /**
     * ?? can the expiry error indicate not-yet-valid?  Or only no-longer-valid??
     */
    isExpiryError(problem: Error | SubmissionExpiryError): boolean;
    gradualBackoff(baseInterval: number, thisAttempt: number, backoff?: number): number;
    firmBackoff(baseInterval: any, thisAttempt: number): number;
    /**
     * mockable method for finding the tx from the submitter, which
     * is a confirmation that it was submitted successfully
     */
    confirmTx(): Promise<boolean>;
    onEntry: {
        submitting: () => void;
        confirming: () => Promise<void>;
        softConfirmed: () => Promise<void> | undefined;
        failed: () => void;
    };
    transitionTable: StateTransitionTable<TxSubmitterStates, TxSubmitterTransitions>;
    get currentSlot(): number;
    /**
     * Mockable method for submitting the transaction
     */
    doSubmit(): Promise<TxId | undefined>;
    isTxExpired(tx: Tx): boolean;
    /**
     * @internal
     */
    checkTxValidityDetails(tx: Tx): void;
}
export {};
//# sourceMappingURL=TxSubmitMgr.d.ts.map