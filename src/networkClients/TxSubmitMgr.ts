import {
    decodeTx,
    makeNetworkParamsHelper,
    makeTxOutputId,
    type NetworkParams,
    type Tx,
    type TxId,
} from "@helios-lang/ledger";
import type { CardanoClient, CardanoTxSubmitter } from "@helios-lang/tx-utils";
import {
    mkCancellablePromise,
    type WrappedPromise,
} from "./mkCancellablePromise.js";
import type { SetupInfo } from "../StellarContract.js";
import type {
    SubmitOptions,
    TxDescription,
    TxSubmitCallbacks,
} from "../StellarTxnContext.js";
import { bytesToHex } from "@helios-lang/codec-utils";
import {
    StateMachine,
    type $transitions,
    type StateTransitionTable,
} from "../StateMachine.js";

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
    // nextSubmissionAttempt?: dateAsMillis;
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
    // nextConfirmAttempt: dateAsMillis;
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

const basicRetryInterval = 1000;
const gradualBackoff = 1.27;
const firmBackoff = /* ~1.61 */ gradualBackoff * gradualBackoff;
const halfSlot = 10 * 1000; // half of avg slot-time 20s

type txSubmissionDetails = {
    name: string;
    description: string;
    /**
     * the txd id (created before the tcx or tx may exist)
     */
    id: string;
    /**
     * the stringified transaction id (available after the tx is built)
     */
    txId: string;
    tx: Tx;
    // submitter: CardanoTxSubmitter;
    // onStateChanged: (state: SubmitManagerState) => void;
};

type TxSubmitterStates =
    | "submitting"
    | "confirming"
    | "softConfirmed"
    | "confirmed"
    | "failed";
type TxSubmitterTransitions =
    | "submitted"
    | "confirmed"
    | "unconfirmed"
    | "hardConfirm"
    | "failed"
    | "notOk"
    | "timeout"
    | "txExpired"
    | "reconfirm"
    | "otherSubmitterProblem";

export type SubmitterRetryIntervals = {
    reconfirm?: number;
    submit?: number;
    confirm?: number;
    startup?: number;
    maximum?: number;
};

const noTransitionsExcept = {
    submitted: null,
    confirmed: null,
    unconfirmed: null,
    hardConfirm: null,
    failed: null,
    notOk: null,
    timeout: null,
    txExpired: null,
    reconfirm: null,
    otherSubmitterProblem: null,
};

/**
 * manages the submission of a single transaction to a single submitter
 * @public
 */
export class TxSubmitMgr extends StateMachine<
    TxSubmitterStates,
    TxSubmitterTransitions
> {
    name: string; // name of the submitter
    submitter: CardanoTxSubmitter;
    txd: TxDescription<any, "signed">;
    // state: SubmissionStates;
    get $$statusSummary() {
        const {
            totalSubmissionAttempts,
            totalSubmissionSuccesses,
            totalConfirmationAttempts,
            totalConfirmationSuccesses,
            confirmationFailures,
            confirmations,
            expirationDetected,
            pendingActivity,
            signsOfServiceLife,
            battleDetected: slotBattleDetected,
            isBadTx,
            nextActivityStartTime,
        } = this.$mgrState;
        const { $describeDeferredAction: deferredAction } = this;

        return {
            status: this.$state,
            currentActivity: pendingActivity,
            deferredAction,
            confirmations,
            hasConfirmationProblems: confirmationFailures > 1,
            expirationDetected,
            isHealthy: signsOfServiceLife > 2,
            isBadTx,
            recovering: slotBattleDetected,
            nextActivityStartTime: nextActivityStartTime,
            stats: {
                totalSubmissionAttempts,
                totalSubmissionSuccesses,
                totalConfirmationAttempts,
                totalConfirmationSuccesses,
                confirmationFailures,
                signsOfServiceLife,
            },
        };
    }

    $mgrState!: SubmitManagerState;
    setup: SetupInfo;
    submitIssue?: string = undefined;
    pending: (WrappedPromise<any> & { activity: string }) | undefined;
    retryIntervals: Required<SubmitterRetryIntervals>;

    constructor(args: {
        name: string;
        txd: TxDescription<any, "signed">;
        setup: SetupInfo;
        submitter: CardanoTxSubmitter;
        retryIntervals?: SubmitterRetryIntervals;
    }) {
        super();
        const { name, txd, submitter, setup, retryIntervals = {} } = args;
        this.retryIntervals = {
            reconfirm: 10000,
            submit: 5000,
            confirm: 3000,
            startup: 0,
            maximum: 60 * 1000,
            ...retryIntervals,
        };
        this.name = name;
        this.txd = txd;
        this.submitter = submitter;
        this.setup = setup;
        this.pending = undefined;

        this.resetState();
        this.notSubmitted = this.notSubmitted.bind(this);
        this.notConfirmed = this.notConfirmed.bind(this);
        // console.log("TxSubmitMgr: constructor2", this.mgrState);
        // debugger;
        this.delayed(this.retryIntervals.startup).then(() => {
            this.trySubmit().catch((e) => {
                console.log("submitter startup error", e);
            });
        });
        // this.notifier.on("changed", this.wasUpdated.bind(this));
    }

    destroy() {
        this.pending?.cancel();
        super.destroy();
    }

    get networkParams(): NetworkParams {
        return this.setup.networkParams;
    }

    get network(): CardanoClient {
        return this.setup.network;
    }

    get stateMachineName() {
        return `submitMgr '${this.txId}' via ${this.name}`;
    }

    get txDescription() {
        return this.txd.description;
    }

    /**
     * the locally-unique id-ish label of the tx description
     * @remarks
     * see {@link txId} for the actual txId available after the tx is built
     */
    get id() {
        return this.txd.id;
    }

    get txId() {
        return this.txd.txId;
    }

    get tx() {
        return this.txd.tx;
    }

    wasUpdated() {
        //makes a new object : / - good for downstream UI though
        this.$mgrState = {
            ...this.$mgrState,
        };
        this.ignoringListenerErrors("changed", () => {
            this.$notifier.emit("changed", this);
        });
        console.log("!!! ensure Batch-controller gets the news");
        // ^ then delete vvvvvv
        // this.txDetails.onStateChanged(this.mgrState);
    }

    get initialState() {
        return "submitting" as TxSubmitterStates;
    }

    resetState() {
        // this.state = this.initialState;
        console.log("SM: RESET");
        this.$mgrState = {
            pendingActivity: "none",
            lastSubmissionAttempt: undefined,
            // nextSubmissionAttempt: undefined,

            expirationDetected: false,
            failedSubmissions: 0,
            successfulSubmitAt: undefined,

            confirmations: 0,
            firstConfirmedAt: undefined,
            lastConfirmedAt: undefined,
            confirmationFailures: 0,
            lastConfirmationFailureAt: undefined,
            // nextConfirmAttempt: Date.now(),

            serviceFailures: 0,
            signsOfServiceLife: 0,
            battleDetected: false,

            totalSubmissionAttempts: 0,
            totalSubmissionSuccesses: 0,
            totalConfirmationAttempts: 0,
            totalConfirmationSuccesses: 0,

            nextActivityStartTime: undefined,
        };
    }

    otherSubmitterProblem() {
        this.transition("otherSubmitterProblem");
    }

    // whenAvailable() {
    //     if (this.pending) {
    //         return this.pending.promise
    //     }
    //     return Promise.resolve()
    // }
    //

    nothingPendingAllowed(that: string) {
        if (this.pending) {
            debugger;
            throw new Error(
                `submitter ${this.name}: can't start activity '${that}' \n` +
                    `  ...while activity '${this.pending.activity}' is pending`
            );
        }
    }

    async pendingActivity<P>(
        activityName: string,
        p: Promise<P>
    ): Promise<P | undefined> {
        this.nothingPendingAllowed(activityName);
        // debugger;
        const pending = mkCancellablePromise<P>({
            wrap: p,
            timeout: 3000,
            onTimeout: () => {
                if (this.destroyed) return;
                this.transition("timeout");
            },
        });
        this.pending = {
            activity: activityName,
            ...pending,
        };
        this.$mgrState.pendingActivity = activityName;
        this.wasUpdated();
        return pending.promise.then(
            (x) => {
                debugger;
                this.done(activityName);
                return x;
            },
            (e) => {
                this.done(activityName);
                if (e.message == "timeout" || e.message == "cancelled") {
                    this.pending = undefined;
                    return undefined;
                }
                console.debug(`  -- activity ${activityName} failed`);
                debugger;
                throw e;
            }
        );
    }

    done(activityName: string) {
        if (this.pending && this.pending.activity == activityName) {
            this.pending.status;
            this.pending = undefined;
            this.$mgrState.pendingActivity = "";
        } else {
            console.warn(
                `submitter ${
                    this.name
                }: done() called for ${activityName} but the pending activity is ${
                    this.pending?.activity ?? "‹none›"
                }`
            );
            throw new Error("invalid done() call");
        }
    }

    async tryConfirm() {
        this.$mgrState.lastConfirmAttempt = Date.now();
        try {
            this.$mgrState.totalConfirmationAttempts++;
            const result = await this.pendingActivity(
                "confirming",
                this.confirmTx()
            )
                .catch(() => {
                    debugger;
                    this.notConfirmed();
                })
                .then((txOk) => {
                    if (!!txOk) {
                        this.log("  ---- confirmed ok", txOk);
                        this.transition("confirmed");
                        return txOk;
                    } else {
                        this.notConfirmed();
                        return;
                        // throw(new Error("not confirmed"))
                    }
                });
        } catch (e) {
            console.error("unhandled confirmation error?", e);
            debugger;
            // console.log("is it already handled?");
        }
    }

    didConfirm() {
        this.$mgrState.confirmations++;
        this.$mgrState.totalConfirmationSuccesses++;
        this.$mgrState.signsOfServiceLife++;

        if (!this.$mgrState.firstConfirmedAt) {
            this.$mgrState.firstConfirmedAt = Date.now();
        }
        this.$mgrState.lastConfirmedAt = Date.now();
    }

    notConfirmed(problem?: Error) {
        const { stack, message, ...details } = problem || {};
        console.log(`submitter ${this.name}: not confirmed:`, {
            message,
            ...details,
        });
        this.transition("notOk");
    }

    scheduleAnotherConfirmation(
        this: this,
        transitionName: TxSubmitterTransitions,
        reason: string,
        backoff: number = gradualBackoff
        // interval: number,
        // retryCount: number
    ) {
        const r: string = reason ? `(${reason}) ` : "";
        const { confirmationFailures } = this.$mgrState;
        // debugger;
        const retryInterval = this.gradualBackoff(
            this.retryIntervals.confirm,
            confirmationFailures,
            backoff
        );
        this.nextStartTime(retryInterval);
        this.ignoringListenerErrors("backoff", () => {
            this.$notifier.emit("backoff", this, retryInterval, "confirming");
        });
        return this.$deferredState(
            transitionName,
            "confirming",
            `${r}will confirm again`,
            retryInterval
        );
    }

    async trySubmit() {
        this.$mgrState.lastSubmissionAttempt = Date.now();
        this.$mgrState.totalSubmissionAttempts++;
        const result = this.pendingActivity(
            "submitting",
            this.doSubmit()
            // this.submitter.submitTx(this.tx)
        ).catch(this.notSubmitted);
        try {
            if (await result) {
                this.$mgrState.totalSubmissionSuccesses++;
                this.transition("submitted");
            }
        } catch (e) {
            console.error("unhandled submit error?", e);
            debugger;
            // console.log("is it already handled?");
        }
    }

    async notSubmitted(problem: Error) {
        const { stack, message, ...details } = problem;
        this.log(`submission failed with this error:`, {
            message,
            ...details,
        });
        if (this.isExpiryError(problem)) {
            if (this.isTxExpired(this.tx)) {
                return this.transition("txExpired");
            }
            this.$mgrState.failedSubmissions++;
            this.submitIssue = "wait for validity period";
            return this.transition("notOk");
        }

        if (this.isUnknownUtxoError(problem)) {
            this.$mgrState.failedSubmissions++;

            if (await this.confirmTx()) {
                return this.transition("confirmed");
            }

            this.submitIssue = "wait for available utxo";
            return this.transition("notOk");
        }
        this.log(
            `unknown error: ${message}\n  - details: `,
            details,
            "\n\n   ... if this error is really not an expired tx or not-yet-valid, \n" +
                "    ... then the tx is almost certainly invalid and will never work"
        );
        debugger;
        this.$mgrState.isBadTx = problem;

        this.transition("failed");
    }

    scheduleAnotherSubmit(
        transitionName: TxSubmitterTransitions,
        displayStatus: string,
        backoff: number = gradualBackoff
    ) {
        this.$mgrState.failedSubmissions;
        const retryInterval = this.gradualBackoff(
            this.retryIntervals.submit,
            this.$mgrState.failedSubmissions,
            backoff
        );
        this.$mgrState.lastSubmissionAttempt = Date.now();
        this.nextStartTime(retryInterval);
        this.ignoringListenerErrors("backoff", () => {
            this.$notifier.emit("backoff", this, retryInterval, "submitting");
        });

        return this.$deferredState(
            transitionName,
            "submitting",
            `(${displayStatus}) - will resubmit`,
            retryInterval
        );
    }

    nextStartTime(retryInterval: number) {
        const now = Date.now();
        this.$mgrState.nextActivityStartTime = now + retryInterval;
        this.ignoringListenerErrors("changed", () => {
            this.$notifier.emit("changed", this);
        });
    }

    txExpired() {
        this.$mgrState.expirationDetected = true;
        this.$mgrState.signsOfServiceLife++;
    }

    resetConfirmationStats() {
        this.$mgrState.confirmations = 0;
        this.$mgrState.confirmationFailures = 0;
        this.$mgrState.lastConfirmationFailureAt = undefined;
        this.$mgrState.lastConfirmAttempt = undefined;
    }

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
    isUnknownUtxoError(problem: Error) {
        return this.submitter.isUnknownUtxoError(problem);
    }

    /**
     * ?? can the expiry error indicate not-yet-valid?  Or only no-longer-valid??
     */
    isExpiryError(problem: Error) {
        return this.submitter.isSubmissionExpiryError(problem);
    }

    gradualBackoff(
        baseInterval: number,
        thisAttempt: number,
        backoff = gradualBackoff
    ) {
        const result = Math.min(
            baseInterval * Math.pow(backoff, thisAttempt - 1),
            this.retryIntervals.maximum
        );
        console.log(
            `gradualBackoff(${baseInterval} * ${backoff} ^ ${thisAttempt} = ${result})`
        );
        return result;
    }

    firmBackoff(baseInterval, thisAttempt: number) {
        return this.gradualBackoff(baseInterval, thisAttempt, firmBackoff);
    }

    /**
     * mockable method for finding the tx from the submitter, which
     * is a confirmation that it was submitted successfully
     */
    async confirmTx() {
        debugger;
        if (this.submitter.getTx) {
            return this.submitter.getTx(this.tx.id()).then(
                (tx) => {
                    console.log(
                        "submitter getTx: found 👍",
                        tx.id().toString()
                    );
                    return !!tx;
                },
                (e) => {
                    console.log("submitter getTx: not found:", e);
                    return false;
                }
            );
        } else {
            return this.submitter.hasUtxo(makeTxOutputId(this.tx.id(), 0));
        }
    }

    onEntry = {
        [`submitting`]: () => {
            this.submitIssue = undefined;
            this.trySubmit();
        },
        [`confirming`]: () => {
            // debugger;
            return this.tryConfirm();
        },
        [`softConfirmed`]: () => {
            // debugger;
            if (
                !this.$mgrState.battleDetected &&
                this.$mgrState.confirmations > 5
            ) {
                return this.transition("hardConfirm");
            }
            if (this.$mgrState.confirmations > 3)
                return this.transition("hardConfirm");

            // markers "9" and "10" in diagram
            this.$deferredTransition(
                "reconfirm",
                "will confirm again",
                this.retryIntervals.reconfirm
            );
        },
        [`failed`]: () => {
            this.$deferredTransition(
                "reconfirm",
                "possible rescue of failure",
                this.retryIntervals.reconfirm
            );
        },
    };

    transitionTable: StateTransitionTable<
        TxSubmitterStates,
        TxSubmitterTransitions
    > = {
        [`submitting`]: {
            ...noTransitionsExcept,
            otherSubmitterProblem: {
                to: "submitting",
                onTransition: () => {
                    return false; //
                },
            },
            failed: {
                // not on the diagram.  We try to confirm it even though it's probably a fail.
                to: "confirming",
            },
            notOk: {
                to: "submitting",
                onTransition: () => {
                    // see marker "1" in diagram
                    this.$mgrState.signsOfServiceLife++;
                    this.$mgrState.failedSubmissions++;
                    if (!this.submitIssue) {
                        throw new Error(`must have a submitIssue`);
                    }
                    this.scheduleAnotherSubmit(
                        "notOk",
                        this.submitIssue,
                        this.retryIntervals.submit
                    );
                    // const interval = this.gradualBackoff(
                    //     this.$mgrState.lastSubmissionAttempt,
                    //     this.$mgrState.nextSubmissionAttempt
                    // );
                    // this.$mgrState.nextSubmissionAttempt =
                    // Date.now() + interval;
                    // return this.$pendingState(
                    //     "submitting",
                    //     "(utxo-needed) will resubmit tx",
                    //     this.retryIntervals.submit
                    // );
                    // return {
                    //     displayStatus: "will resubmit tx",
                    //     targetState: "submitting",
                    //     type: "state",
                    //     promise: this.delayed(interval)
                    // }
                },
            },
            confirmed: { to: "confirming" },
            submitted: {
                to: "confirming",
                onTransition: () => {
                    // see marker "2" in diagram
                    this.$mgrState.signsOfServiceLife++;
                    this.$mgrState.successfulSubmitAt = Date.now();
                    this.resetConfirmationStats();

                    // this.$mgrState.nextConfirmAttempt = Date.now();
                },
            },
            txExpired: {
                to: "confirming",
                onTransition: () => {
                    // if it looks like it's expired, it still ok to go try
                    // confirming it.  Weird maybe, but the tx might
                    // have flowed in through another submitter, and
                    // this rescues the indiciation of possible failure in that case.

                    // see marker "3" in diagram
                    this.txExpired();
                },
            },
            timeout: {
                to: "submitting",
                onTransition: () => {
                    // the service didn't respond ot the submission request
                    // fast enough...
                    // see marker "4" in diagram
                    this.$mgrState.serviceFailures++;
                    this.$mgrState.lastServiceFailureAt = Date.now();
                    this.$mgrState.failedSubmissions++;
                    this.scheduleAnotherSubmit("timeout", "timed out");
                },
            },
        },
        [`confirming`]: {
            ...noTransitionsExcept,
            otherSubmitterProblem: {
                // nothing special to do, as we're still confirming
                to: "confirming",
            },
            unconfirmed: {
                to: "submitting",
            },
            confirmed: {
                to: "softConfirmed",
                onTransition: () => {
                    this.didConfirm();
                    // see marker "9" in diagram
                    // see onEntry.confirmed for periodic reconfirm...
                },
            },
            txExpired: {
                to: "confirming",
                onTransition: () => {
                    throw new Error(`unreachable??`);
                    // there's no detection of expiration when checking for
                    // existence of a transaction - so this transition isn't actually possible
                    console.log(
                        `submitter ${this.name}: not confirmed:\n`,
                        "  -- unexpected path to failure - did we not get a right expiration indicator from the submitter?"
                    );
                    if (this.$mgrState.expirationDetected) {
                        // marker "8" in diagram
                        // it can still re-check after going to failed state
                        // to rescue the error if the tx actually gets on-chain
                        // through another submitter
                        return "failed";
                    }
                    this.$mgrState.expirationDetected = true;
                    throw new Error(
                        `use current method of redoing confirmation`
                    );
                    // return this.$deferredState(
                    //     "softConfirmed",
                    //     "tx seems to be expired; one last-ditch try ...",
                    //     this.gradualBackoff(
                    //         this.$mgrState.lastConfirmationFailureAt
                    //     )
                    // );
                },
            },
            notOk: {
                to: "confirming",
                onTransition: () => {
                    debugger;
                    if (this.$mgrState.isBadTx) {
                        console.log(
                            "       BAD TX ------------------------------"
                        );
                        return "failed";
                    }

                    this.$mgrState.signsOfServiceLife++;
                    this.$mgrState.confirmationFailures++;
                    this.$mgrState.lastConfirmationFailureAt = Date.now();
                    const { confirmationFailures } = this.$mgrState;

                    if (this.$mgrState.expirationDetected) {
                        // marker "8" in diagram
                        // there can still be a recheck to rescue the error state
                        // if it gets on-chain through another submitter
                        return "failed";
                    }
                    if (this.$mgrState.battleDetected) {
                        // marker "6" in diagram
                        return this.scheduleAnotherConfirmation(
                            "notOk",
                            "slot/height battle?"
                        );
                    } else if (!this.$mgrState.successfulSubmitAt) {
                        // if an initial submit wasn't successful, and we can't
                        // immediately see it being confirmed
                        this.log(
                            "  -- no initial submit success; probably need to wait for utxo to become available"
                        );
                        return this.$deferredState(
                            "notOk",
                            "submitting",
                            "will resubmit",
                            this.retryIntervals.submit
                        );
                    } else if (confirmationFailures > 5) {
                        // marker "7" in diagram
                        // the pool no longer has a tx it once had
                        // resubmit right away (after finishing the state-change)
                        this.$mgrState.successfulSubmitAt = undefined;
                        debugger;
                        return "submitting";
                    } else {
                        return this.scheduleAnotherConfirmation(
                            "notOk",
                            "waiting"
                        );
                    }
                },
            },
            timeout: {
                to: "confirming",
                onTransition: () => {
                    // marker "5" in diagram
                    // service didn't respond fast enough to confirmation req

                    this.$mgrState.serviceFailures++;
                    this.$mgrState.confirmationFailures++;

                    this.$mgrState.lastServiceFailureAt = Date.now();
                    return this.scheduleAnotherConfirmation(
                        "timeout",
                        "timed out"
                    );
                },
            },
        },
        [`softConfirmed`]: {
            ...noTransitionsExcept,
            confirmed: {
                to: "softConfirmed",
                onTransition: () => {
                    this.didConfirm();
                    // see marker "9" in diagram
                    // see onEntry.confirmed for periodic reconfirm...
                },
            },
            hardConfirm: {
                to: "confirmed",
            },
            failed: null,
            notOk: null,
            submitted: null,
            txExpired: null,
            timeout: null,
            otherSubmitterProblem: {
                to: "confirming",
                onTransition: () => {
                    // see marker "11" in diagram
                    this.resetConfirmationStats();
                    return this.scheduleAnotherConfirmation(
                        "otherSubmitterProblem",
                        "other submitter problem"
                    );
                },
            },
            reconfirm: {
                // not on the diagram
                to: "confirming",
                // ^^ its onEntry does another confirmation right away
            },
        },
        [`confirmed`]: {
            ...noTransitionsExcept,
            otherSubmitterProblem: {
                to: "confirming",
                onTransition: () => {
                    // see marker "11" in diagram
                    this.resetConfirmationStats();
                    return this.scheduleAnotherConfirmation(
                        "confirmed",
                        "other submitter problem"
                    );
                },
            },
            reconfirm: {
                // not on the diagram
                to: "confirming",
                // ^^ its onEntry does another confirmation right away
            },
        },
        [`failed`]: {
            ...noTransitionsExcept,
            otherSubmitterProblem: {
                // nothing special to do, since we're already in a failed state
                // ... we'll still do the periodic attempt to reconfirm
                to: "confirming",
            },
            reconfirm: {
                // not on the diagram yet
                to: "confirming",
                // ^^ its onEntry does another confirmation right away
            },
        },
    };

    get currentSlot() {
        return makeNetworkParamsHelper(this.networkParams).timeToSlot(
            this.network.now
        );
    }

    /**
     * Mockable method for submitting the transaction
     */
    async doSubmit() {
        const {
            description,
            tcx: { logger },
            tx,
            options,
            signedTxCborHex,
        } = this.txd;
        const { onSubmitError } = options;
        try {
            // const submitting = Promise.resolve(tx.id());
            const submitting = this.submitter
            .submitTx(
                tx,
                //@ts-expect-error extra arg used in test emulated network only
                //   -- ignored by real network clients
                logger
            )
            return submitting.then(
                async (netTxId) => {
                    console.log(
                        "submitTx() success via network: ",
                        netTxId.toString()
                    );
                    const txId = tx.id();
                    if (!txId.isEqual(netTxId)) {
                        throw new Error(
                            `txId mismatch: ${txId.toString()} vs ${netTxId.toString()}`
                        );
                    }
                    options.onSubmitted?.({
                        ...this.txd,
                        txId,
                    });
                    console.timeStamp?.(`submit(): success`);
                    logger.logPrint(
                        `\n\n\n🎉🎉 tx submitted: ${description} 🎉🎉`
                    );
                    logger.finish();

                    return netTxId;
                },
                (e) => {
                    if (
                        "currentSlot" in this.network &&
                        e.message.match(/or slot out of range/)
                    ) {
                        this.checkTxValidityDetails(this.tx);
                    }
                    onSubmitError?.({
                        ...this.txd,
                        error: e.message,
                    });
                    console.warn(
                        "⚠️  submitting via helios CardanoClient failed: ",
                        e.message
                    );
                    debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
                    throw e;
                }
            );
        } catch (e: any) {
            // TODO: move the CBOR-hex dumping
            // into the multi-tx client
            logger.logError(
                `submitting tx failed: ${description}: ❌ ${e.message}`
            );
            logger.flushError();

            const asHex = bytesToHex(tx.toCbor());
            const t2 = decodeTx(asHex);
            debugger;
            if (!options.expectError) {
                console.warn(
                    "------------------- failed tx as cbor-hex -------------------\n" +
                        asHex,
                    "\n------------------^ failed tx details ^------------------\n" +
                        // note, the debugging breakpoint mentioned is actually one or more of
                        // multiple breakpoints above.
                        "(debugging breakpoint available)"
                );
            }
        }
    }

    isTxExpired(tx: Tx) {
        let { currentSlot } = this;
        currentSlot -= 60; // 1 minute buffer

        const validFrom = tx.body.firstValidSlot;
        const validTo = tx.body.lastValidSlot;

        if (validTo && validTo < currentSlot) {
            return true;
        }
        return false;
    }

    private checkTxValidityDetails(tx: Tx) {
        const b = tx.body;
        // const db = tx.dump().body;
        function getAttr(x: string) {
            const qq = tx.body[x];
            if (!qq) {
                throw new Error(`no ${x} in tx.body: `);
            }
            return qq;
        }

        const validFrom = getAttr("firstValidSlot");
        const validTo = getAttr("lastValidSlot");

        // vf = 100,  current = 102, vt = 110  =>   FROM now -2, TO now +8; VALID
        // vf = 100,  current = 98,   vt = 110  =>   FROM now +2, TO now +12; FUTURE
        // vf = 100,  current = 100,  vt = 110  =>  FROM now, TO now +10; VALID
        // vf = 100, current = 120, vt = 110  =>  FROM now -20, TO now -10; PAST
        debugger;
        const { currentSlot } = this;
        const diff1 = validFrom - currentSlot;
        const diff2 = validTo - currentSlot;
        const disp1 =
            diff1 > 0
                ? `NOT VALID for +${diff1}s`
                : `${diff2 > 0 ? "starting" : "was valid"} ${diff1}s ago`;
        const disp2 =
            diff2 > 0
                ? `${diff1 > 0 ? "would be " : ""}VALID until now +${diff2}s`
                : `EXPIRED ${0 - diff2}s ago`;

        console.log(
            `  ⚠️  slot validity issue?\n` +
                `    - validFrom: ${validFrom} - ${disp1}\n` +
                `    - validTo: ${validTo} - ${disp2}\n` +
                `    - current: ${currentSlot}\n`
        );
    }
}
