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

type TxSubmitterStates = "submitting" | "confirming" | "confirmed" | "failed";
type TxSubmitterTransitions =
    | "submitted"
    | "confirmed"
    | "failed"
    | "notOk"
    | "timeout"
    | "txExpired"
    | "reconfirm"
    | "otherSubmitterProblem";

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
    mgrState!: SubmitManagerState;
    setup: SetupInfo;
    pending: (WrappedPromise<any> & { activity: string }) | undefined;
    constructor(args: {
        name: string;
        txd: TxDescription<any, "signed">;
        setup: SetupInfo;
        submitter: CardanoTxSubmitter;
    }) {
        super();
        const { name, txd, submitter, setup } = args;
        this.name = name;
        this.txd = txd;
        this.submitter = submitter;
        this.setup = setup;
        this.pending = undefined;
        this.notSubmitted = this.notSubmitted.bind(this);
        this.notConfirmed = this.notConfirmed.bind(this);
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
        return `submit '${this.txId}' via ${this.name}`;
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
        this.mgrState = {
            ...this.mgrState,
        };
        this.notifier.emit("changed", this);
        console.log("!!! ensure Batch-controller gets the news");
        // ^ then delete vvvvvv
        // this.txDetails.onStateChanged(this.mgrState);
    }

    get initialState() {
        return "submitting" as TxSubmitterStates;
    }

    resetState() {
        this.state = this.initialState;
        this.mgrState = {
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
        };
    }

    otherSubmitterProblem() {
        this.transition("otherSubmitterProblem");
    }

    async update(delay?: number) {
        if (delay) {
            this.mgrState.pendingActivity = `waiting a moment`;
            this.mgrState.nextActivityDelay = delay;
            return setTimeout(this.update.bind(this), delay);
        }

        if ("submitting" == this.state) {
            return this.trySubmit();
        } else if ("confirming" == this.state) {
            return this.tryConfirm();
        }
        console.log(`submitter ${this.name}: already ${this.state}`);
    }

    nothingPendingAllowed(that: string) {
        if (this.pending) {
            throw new Error(
                `submitter ${this.name}: can't do ${that} while ${this.pending.activity} is pending`
            );
        }
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
        this.mgrState.pendingActivity = activityName;
        this.wasUpdated();
        return pending.promise.catch((e) => {
            if (e.message == "timeout" || e.message == "cancelled") {
                this.pending = undefined;
                return undefined;
            }
            throw e;
        });
    }

    async trySubmit() {
        this.mgrState.lastSubmissionAttempt = Date.now();

        const result = await this.pendingActivity(
            "submitting",
            this.doSubmit()
            // this.submitter.submitTx(this.tx)
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
            this.mgrState.failedSubmissions++;
            return this.transition("notOk");
        }
        console.log(`unknown error: ${message}\n  - details: `, details);
        console.log(
            "if this error is really not an expired tx or not-yet-valid, \n" +
                "then the tx is almost certainly invalid and will never work"
        );

        this.transition("failed");
    }

    async tryConfirm() {
        this.mgrState.lastConfirmAttempt = Date.now();
        const result = await this.pendingActivity(
            "confirming",
            this.getTx()
        ).catch(this.notConfirmed);
        if (result) {
            this.mkTransition("confirmed");
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
        const thisInterval =
            interval ||
            this.gradualBackoff(
                this.mgrState.lastConfirmationFailureAt,
                this.mgrState.nextConfirmAttempt
            );
        this.mgrState.nextConfirmAttempt = Date.now() + thisInterval;
        this.update(interval);
    }


    async getTx() {
        if (this.submitter.getTx) {
            return this.submitter.getTx(this.tx.id());
        } else {
            return this.submitter.hasUtxo(makeTxOutputId(this.tx.id(), 0));
        }
    }

    transitionTable: StateTransitionTable<
        TxSubmitterStates,
        TxSubmitterTransitions
    > = {
        [`submitting`]: {
            otherSubmitterProblem: {
                to: "submitting",
            },
            failed: {
                // not on the diagram
                to: "failed",
            },
            notOk: {
                to: "submitting",
                onTransition: () => {
                    // see marker "1" in diagram
                    const interval = this.gradualBackoff(
                        this.mgrState.lastSubmissionAttempt,
                        this.mgrState.nextSubmissionAttempt
                    );
                    this.mgrState.signsOfServiceLife++;
                    this.mgrState.nextSubmissionAttempt = Date.now() + interval;
                },
            },
            submitted: {
                to: "confirming",
                onTransition: () => {
                    // see marker "2" in diagram
                    this.mgrState.successfulSubmitAt = Date.now();
                    this.mgrState.confirmations = 0;
                    this.mgrState.confirmationFailures = 0;
                    this.mgrState.lastConfirmationFailureAt = undefined;
                    this.mgrState.lastConfirmAttempt = undefined;
                    this.mgrState.nextConfirmAttempt = Date.now();
                    this.mgrState.signsOfServiceLife++;
                    this.confirmAgain();
                },
            },
            txExpired: {
                to: "confirming",
                onTransition: () => {
                    // see marker "3" in diagram
                    this.mgrState.expirationDetected = true;
                    this.mgrState.signsOfServiceLife++;
                    this.confirmAgain();
                },
            },
            timeout: {
                to: "submitting",
                onTransition: () => {
                    // see marker "4" in diagram
                    const interval = this.firmBackoff(
                        this.mgrState.lastSubmissionAttempt,
                        this.mgrState.nextSubmissionAttempt
                    );
                    this.mgrState.serviceFailures++;
                    this.mgrState.lastServiceFailureAt = Date.now();
                    this.mgrState.nextSubmissionAttempt = Date.now() + interval;

                    this.update(interval);
                },
            },
            confirmed: null,
            reconfirm: null,
        },
        [`confirmed`]: {
            confirmed: null,
            failed: null,
            notOk: null,
            submitted: null,
            txExpired: null,
            timeout: null,
            otherSubmitterProblem: {
                to: "confirming",
                onTransition: () => {
                    // see marker "11" in diagram
                    this.mgrState.confirmations = 0;
                    this.mgrState.confirmationFailures = 0;
                    this.mgrState.lastConfirmationFailureAt = undefined;
                    this.mgrState.lastConfirmAttempt = undefined;
                    this.confirmAgain();
                },
            },
            reconfirm: {
                // not on the diagram
                to: "confirming",
                onTransition: () => {
                    this.confirmAgain(halfSlot);
                },
            },
        },
        [`confirming`]: {
            failed: null,
            reconfirm: null,
            submitted: null,
            otherSubmitterProblem: {
                // nothing special to do, as we're still confirming
                to: "confirming",
            },
            confirmed: {
                to: "confirmed",
                onTransition: () => {
                    this.mgrState.confirmations++;
                    this.mgrState.signsOfServiceLife++;
                    if (!this.mgrState.firstConfirmedAt) {
                        this.mgrState.firstConfirmedAt = Date.now();
                    }
                    this.mgrState.lastConfirmedAt = Date.now();
                    if (!this.mgrState.slotBattleDetected) {
                        // see marker "9" in diagram
                        return "confirmed";
                    } else {
                        if (this.mgrState.confirmations > 3) {
                            // also marker "9" in diagram
                            return "confirmed";
                        }

                        // see marker "10" in diagram
                        this.confirmAgain();
                        return "confirming";
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
                    if (this.mgrState.expirationDetected) {
                        // marker "8" in diagram
                        // NO NEXT ACTIVITY!
                        return "failed";
                    }
                    this.mgrState.expirationDetected = true;
                    // last-ditch try
                    this.confirmAgain();
                },
            },
            notOk: {
                to: "confirming",
                onTransition: () => {
                    this.mgrState.confirmationFailures++;
                    this.mgrState.lastConfirmationFailureAt = Date.now();
                    this.mgrState.signsOfServiceLife++;

                    if (this.mgrState.expirationDetected) {
                        // marker "8" in diagram
                        // NO NEXT ACTIVITY!
                        return "failed";
                    }
                    if (!this.mgrState.slotBattleDetected) {
                        // marker "6" in diagram
                        this.confirmAgain();
                    } else {
                        // marker "7" in diagram
                        // the pool no longer has a tx it once had
                        // resubmit right away (after finishing the state-change)
                        this.update(1);
                        this.mgrState.successfulSubmitAt = undefined;
                        return "submitting";
                    }
                },
            },
            timeout: {
                to: "confirming",
                onTransition: () => {
                    const interval = this.firmBackoff(
                        this.mgrState.lastConfirmationFailureAt,
                        this.mgrState.nextConfirmAttempt
                    );
                    // marker "5" in diagram
                    this.mgrState.serviceFailures++;
                    this.mgrState.lastServiceFailureAt = Date.now();
                    this.mgrState.nextConfirmAttempt = Date.now() + interval;
                    this.update(interval);
                },
            },
        },
        [`failed`]: {
            confirmed: null,
            failed: null,
            notOk: null,
            submitted: null,
            timeout: null,
            txExpired: null,
            otherSubmitterProblem: {
                // nothing special to do, since we're already in a failed state
                // ... we'll still do the periodic attempt to reconfirm
                to: "failed",
            },
            reconfirm: {
                // not on the diagram yet
                to: "confirming",
                onTransition: () => {
                    this.confirmAgain(halfSlot);
                },
            },
        },
    };

    get currentSlot() {
        return makeNetworkParamsHelper(this.networkParams).timeToSlot(
            this.network.now
        );
    }

    async doSubmit() {
        const {
            description,
            tcx: { logger },
            tx,
            options,
        } = this.txd;
        const { onSubmitError } = options;
        try {
            return this.submitter
                .submitTx(
                    tx,
                    //@ts-expect-error extra arg used in test emulated network only
                    //   -- ignored by real network clients
                    logger
                )
                .then(
                    async (netTxId) => {
                        console.log(
                            "submitTx() success via network: ",
                            netTxId
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
