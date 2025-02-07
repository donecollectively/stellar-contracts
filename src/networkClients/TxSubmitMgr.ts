import { makeTxOutputId, type Tx, type TxId } from "@helios-lang/ledger";
import type { CardanoTxSubmitter } from "@helios-lang/tx-utils";
import {
    mkCancellablePromise,
    type CancellablePromise,
} from "./mkCancellablePromise.js";

/**
 * @public
 */
export type dateAsMillis = number;
/**
 * @public
 */
export type SubmitManagerState = {
    state: "submitting" | "confirming" | "confirmed" | "failed";
    pendingActivity: string;
    nextActivityDelay?: number;
    lastSubmissionAttempt?: dateAsMillis;
    nextSubmissionAttempt?: dateAsMillis;

    expirationDetected: boolean;
    failedSubmissions: number;
    successfulSubmitAt?: number;

    confirmations: number;
    firstConfirmedAt?: dateAsMillis;
    lastConfirmedAt?: dateAsMillis;
    confirmationFailures: number;
    lastConfirmationFailureAt?: dateAsMillis;
    lastConfirmAttempt?: dateAsMillis;
    nextConfirmAttempt: dateAsMillis;
    slotBattleDetected: boolean;

    serviceFailures: number;
    signsOfServiceLife: number;
    lastServiceFailureAt?: dateAsMillis;
};

const basicRetryInterval = 1000;
const gradualBackoff = 1.27;
const firmBackoff = /* ~1.61 */ gradualBackoff * gradualBackoff;
const halfSlot = 10 * 1000; // half of avg slot-time 20s

type SubmissionDetails = {
    name: string;
    txId: string;
    tx: Tx;
    submitter: CardanoTxSubmitter;
    onStateChanged: (state: SubmitManagerState) => void;
};

/**
 * @public
 */
export class TxSubmitMgr {
    settings: SubmissionDetails;
    state: SubmitManagerState;
    pending: (CancellablePromise<any> & { activity: string }) | undefined;
    constructor(settings: SubmissionDetails) {
        this.settings = settings;
        this.pending = undefined;
        this.notSubmitted = this.notSubmitted.bind(this);
        this.notConfirmed = this.notConfirmed.bind(this);

        this.state = this.resetState();
    }

    get name() {
        return this.settings.name;
    }
    get txId() {
        return this.settings.txId;
    }
    get tx() {
        return this.settings.tx;
    }
    get submitter() {
        return this.settings.submitter;
    }

    wasUpdated() {
        this.state = {
            ...this.state,
        };
        this.settings.onStateChanged(this.state);
    }

    resetState() {
        return (this.state = {
            state: "submitting",
            pendingActivity: "none",
            lastSubmissionAttempt: undefined,
            nextSubmissionAttempt: undefined,

            expirationDetected: false,
            failedSubmissions: 0,
            successfulSubmitAt: undefined,

            confirmations: 0,
            firstConfirmedAt: undefined,
            lastConfirmedAt: undefined,
            confirmationFailures: 0,
            lastConfirmationFailureAt: undefined,
            nextConfirmAttempt: Date.now(),

            serviceFailures: 0,
            signsOfServiceLife: 0,
            slotBattleDetected: false,
        });
    }

    otherSubmitterProblem() {
        this.transition("otherSubmitterProblem");
    }

    async update(delay?: number) {
        if (delay) {
            this.state.pendingActivity = `waiting a moment`
            this.state.nextActivityDelay = delay
            return setTimeout(this.update.bind(this), delay);
        }

        if ("submitting" == this.state.state) {
            return this.trySubmit();
        } else if ("confirming" == this.state.state) {
            return this.tryConfirm();
        }
        console.log(`submitter ${this.name}: already ${this.state.state}`);
    }

    nothingPendingAllowed(that: string) {
        if (this.pending) {
            throw new Error(
                `submitter ${this.name}: can't do ${that} while ${this.pending.activity} is pending`
            );
        }
    }

    destroy() {
        this.pending?.cancel();
    }

    async pendingActivity<P>(
        activityName: string,
        p: Promise<P>
    ): Promise<P | undefined> {
        this.nothingPendingAllowed(activityName);
        const pending = mkCancellablePromise<P>({
            wrap: p,
            timeout: 3000,
            onTimeout: this.mkTransition("timeout"),
        });
        this.pending = {
            activity: activityName,
            ...pending,
        };
        this.state.pendingActivity = activityName;
        this.wasUpdated()
        return pending.promise.catch((e) => {
            if (e.message == "timeout") return undefined;
            if (e.message == "cancelled") return undefined;
            throw e;
        });
    }

    mkTransition(tn: string) {
        return this.transition.bind(this, tn);
    }

    async trySubmit() {
        this.state.lastSubmissionAttempt = Date.now();

        const result = await this.pendingActivity(
            "submitting",
            this.submitter.submitTx(this.tx)
        ).catch(this.notSubmitted);
        if (result) {
            this.transition("submitted");
        }
    }

    notSubmitted(problem: Error) {
        const { stack, message, ...details } = problem;
        console.log(`submitter ${this.name}: not confirmed:`, {
            message,
            ...details,
        });
        if (this.submitter.isSubmissionExpiryError(problem)) {
            return this.transition("txExpired");
        }
        if (this.submitter.isUnknownUtxoError(problem)) {
            this.state.failedSubmissions++;
            return this.transition("notOk");
        }
        console.log(`unknown error: ${message}\n  - details: `, details);
        console.log("if this error is really not an expired tx or not-yet-valid, then the tx is almost certainly invalid and will never work");

        this.transition("failed");
    }

    async tryConfirm() {
        this.state.lastConfirmAttempt = Date.now();
        const result = await this.pendingActivity(
            "confirming",
            this.getTx()            
        ).catch(this.notConfirmed);
        if (result) {
            this.mkTransition("confirmed")
        }
    }

    notConfirmed(problem: Error) {
        const { stack, message, ...details } = problem;
        console.log(`submitter ${this.name}: not confirmed:`, {
            message,
            ...details,
        });
        this.transition("notOk");
    }

    gradualBackoff(
        lastAttempt?: number,
        thisAttempt?: number,
        backoff = gradualBackoff
    ) {
        if (!lastAttempt || !thisAttempt) {
            return basicRetryInterval;
        }

        const currentInterval = thisAttempt! - lastAttempt!;
        const nextInterval = currentInterval * backoff;

        return nextInterval;
    }

    firmBackoff(lastAttempt?: number, thisAttempt?: number) {
        return this.gradualBackoff(lastAttempt, thisAttempt, firmBackoff);
    }

    confirmAgain(interval?: number) {
        const thisInterval = interval || this.gradualBackoff(
            this.state.lastConfirmationFailureAt,
            this.state.nextConfirmAttempt
        );
        this.state.nextConfirmAttempt = Date.now() + thisInterval;
        this.update(interval);
    }


    transition(transName: string) {
        const currentState = this.state.state;
        const foundTransition = this.stateMachine[currentState][transName];
        if (!foundTransition) {
            throw new Error(
                `submitter ${this.name}: ${transName}: invalid transition from ${this.state.state}`
            );
        }
        const { to: targetState, onTransition } = foundTransition;
        console.log(
            `submitter ${this.name}: ${currentState}: ${transName} -> ${targetState}`
        );
        const nextState = onTransition?.() 
        if (nextState == false) {
            console.log(`transition canceled: submitter ${this.name}: ${currentState}: ${transName} XXX ${targetState}`+
                `\n  -- staying in state ${currentState}`
            )
        }
        this.state.state = (nextState || targetState) as any;
        this.wasUpdated()
    }

    async getTx() {
        if (this.submitter.getTx) {
            return this.submitter.getTx(this.tx.id())
        } else {
            return this.submitter.hasUtxo(
                makeTxOutputId(this.tx.id(), 0)
            )
        }
    }

    stateMachine: StateTransitionTable = {
        [`submitting`]: {
            otherSubmitterProblem: {
                to: "submitting",
            },
            failed: { 
                // not on the diagram
                to: "failed" 
            },
            notOk: {
                to: "submitting",
                onTransition: () => {
                    // see marker "1" in diagram
                    const interval = this.gradualBackoff(
                        this.state.lastSubmissionAttempt,
                        this.state.nextSubmissionAttempt
                    );
                    this.state.signsOfServiceLife++
                    this.state.nextSubmissionAttempt = Date.now() + interval;
                },
            },
            submitted: {
                to: "confirming",
                onTransition: () => {
                    // see marker "2" in diagram
                    this.state.successfulSubmitAt = Date.now();
                    this.state.confirmations = 0;
                    this.state.confirmationFailures = 0;
                    this.state.lastConfirmationFailureAt = undefined;
                    this.state.lastConfirmAttempt = undefined;
                    this.state.nextConfirmAttempt = Date.now();
                    this.state.signsOfServiceLife++
                    this.confirmAgain()
                },
            },
            txExpired: {
                to: "confirming",
                onTransition: () => {
                    // see marker "3" in diagram
                    this.state.expirationDetected = true;
                    this.state.signsOfServiceLife++
                    this.confirmAgain()
                },
            },
            timeout: {
                to: "submitting",
                onTransition: () => {
                    // see marker "4" in diagram
                    const interval = this.firmBackoff(
                        this.state.lastSubmissionAttempt,
                        this.state.nextSubmissionAttempt
                    );
                    this.state.serviceFailures++
                    this.state.lastServiceFailureAt = Date.now();
                    this.state.nextSubmissionAttempt =
                        Date.now() + interval;

                    this.update(interval);
                },
            },
        },
        [`confirmed`]: {
            otherSubmitterProblem: {
                to: "confirming",
                onTransition: () => {
                    // see marker "11" in diagram
                    this.state.confirmations = 0;
                    this.state.confirmationFailures = 0;
                    this.state.lastConfirmationFailureAt = undefined;
                    this.state.lastConfirmAttempt = undefined;
                    this.confirmAgain()
                }
            },
            reconfirm: {
                // not on the diagram
                to: "confirming",
                onTransition: () => {
                    this.confirmAgain(halfSlot)
                }
            }
        },
        [`confirming`]: {
            otherSubmitterProblem: {
                // nothing special to do, as we're still confirming
                to: "confirming"
            },
            confirmed: {
                to: "confirmed",
                onTransition: () => {
                    this.state.confirmations++;
                    this.state.signsOfServiceLife++
                    if (!this.state.firstConfirmedAt) {
                        this.state.firstConfirmedAt = Date.now();
                    }
                    this.state.lastConfirmedAt = Date.now();
                    if (!this.state.slotBattleDetected) {
                        // see marker "9" in diagram
                        return "confirmed";
                    } else {
                        if (this.state.confirmations > 3) {
                            // also marker "9" in diagram
                            return "confirmed";
                        }

                        // see marker "10" in diagram
                        this.confirmAgain()
                        return "confirming"
                    }
                },
            },
            txExpired: {
                to: "confirming",
                onTransition: () => {
                        // there's no detection of expiration when checking for
                        // existence of a transaction - so this transition isn't actually possible
                    console.log(
                        `submitter ${this.name}: not confirmed:\n`,
                        "  -- unexpected path to failure - did we not get a right expiration indicator from the submitter?"
                    );
                    if (this.state.expirationDetected) {
                        // marker "8" in diagram
                        // NO NEXT ACTIVITY!
                        return "failed";
                    }
                    this.state.expirationDetected = true;
                    // last-ditch try
                    this.confirmAgain()
                },
            },
            notOk: {
                to: "confirming",
                onTransition: () => {
                    this.state.confirmationFailures++
                    this.state.lastConfirmationFailureAt = Date.now();
                    this.state.signsOfServiceLife++

                    if (this.state.expirationDetected) {
                        // marker "8" in diagram
                        // NO NEXT ACTIVITY!
                        return "failed"
                    }
                    if (!this.state.slotBattleDetected) {
                        // marker "6" in diagram
                        this.confirmAgain();
                    } else {                        
                        // marker "7" in diagram
                        // the pool no longer has a tx it once had
                        // resubmit right away (after finishing the state-change)
                        this.update(1)
                        this.state.successfulSubmitAt = undefined
                        return "submitting"
                    }

                },
            },
            timeout: {
                to: "confirming",
                onTransition: () => {
                    const interval = this.firmBackoff(
                        this.state.lastConfirmationFailureAt,
                        this.state.nextConfirmAttempt
                    );
                    // marker "5" in diagram
                    this.state.serviceFailures++;
                    this.state.lastServiceFailureAt = Date.now();
                    this.state.nextConfirmAttempt = Date.now() + interval;
                    this.update(interval);
                },
            },
        },
        [`failed`]: {
            otherSubmitterProblem: {
                // nothing special to do, since we're already in a failed state
                // ... we'll still do the periodic attempt to reconfirm
                to: "failed"
            },
            reconfirm: {
                // not on the diagram yet
                to: "confirming",
                onTransition: () => {
                    this.confirmAgain(halfSlot)
                }
            }
        }
    };

}

type StateTransitionTable = {
    [state: string]: {
        [transition: string]: {
            to: string;
            onTransition?: (() => string) | (() => false) | (() => void);
        };
    };
};
