import { bytesToHex } from "@helios-lang/codec-utils";
import { StateMachine, type StateTransitionTable } from "../StateMachine.js";
import type { SetupInfo } from "../StellarContract.js";
import type { TxDescription } from "../StellarTxnContext.js";
import type { namedSubmitters } from "./SubmitterMultiClient.js";
import { TxSubmitMgr, type SubmitManagerState } from "./TxSubmitMgr.js";

type SubmissionsStates =
    | "registered"
    | "building"
    | "alreadyDone"
    | "built"
    | "signingSingle"
    | "submitting"
    | "confirming"
    | "confirmed"
    | "failed"
    | "mostly confirmed";

type SubmissionsTransitions = SubmissionsStates | "rebuild";

const noTransitionsExcept = {
    registered: null,
    alreadyDone: null,
    building: null,
    rebuild: null,
    built: null,
    signingSingle: null,
    submitting: null,
    confirming: null,
    confirmed: null,
    failed: null,
    "mostly confirmed": null,
};
const terminalState = noTransitionsExcept;

/**
 * Tracks the submission of a single tx via one or more submitter clients
 * @public
 */
export class TxSubmissionTracker extends StateMachine<
    SubmissionsStates,
    SubmissionsTransitions
> {
    txd: TxDescription<any, any>;
    submitters: namedSubmitters;
    txSubmitters: Record<string, TxSubmitMgr>;
    setup: SetupInfo;

    isSigned: boolean = false;

    get initialState() {
        return "registered" as const;
    }
    constructor({
        txd,
        submitters,
        setup,
    }: {
        txd: TxDescription<any, any>;
        submitters: namedSubmitters;
        setup: SetupInfo;
    }) {
        super();
        this.txd = txd;
        this.setup = setup;
        this.submitters = submitters;
        this.txSubmitters = {};

        if (txd.tcx) {
            this.log("created directly from tcx");
            this.transition("built");
        } else {
            this.log("📥 registered");
        }
    }

    destroy() {
        for (const submitter of Object.values(this.txSubmitters)) {
            submitter.destroy();
        }
        super.destroy();
        this.txSubmitters = {};
    }

    get id() {
        return this.txd.id;
    }

    get txLabel() {
        return this.txd.txName || this.txd.description;
    }

    get stateMachineName() {
        return `💳 TxSubmissionTracker ${this.id} ${this.txLabel}\n     💳 `;
    }

    get txId() {
        return this.txd.tx!.id().toString();
    }

    resetState() {
        this.$state = this.initialState;
    }

    isBuilt = false;
    onEntry = {
        [`registered`]: () => {
            // debugger
        },
        [`built`]: () => {
            this.isBuilt = true;
        },
        [`signingSingle`]: () => {
            this.$signAndSubmit();
        },
        [`building`]: () => {
            // debugger
        },
    };

    async $signAndSubmit() {
        //!!! signs one tx in the batch
        //   ... using the provided strategy
        const {
            actorContext: { wallet },
        } = this.setup;
        // debugger
        const txd = this.txd as TxDescription<any, "built">;
        const { tcx, tx, options } = txd;
        if (!this.isBuilt || !tx || !tcx) {
            throw new Error(`tx must be built before signing`);
        }
        const { logger } = tcx;
        if (!wallet) {
            throw new Error(`no wallet available for signing`);
        }
        const walletSign = wallet.signTx(tx);
        const sigs = await walletSign.catch((e) => {
            logger.logError("signing via wallet failed: " + e.message);
            logger.logPrint(tcx.dump(tx));
            logger.flushError();
            return null;
        });
        console.timeStamp?.(`submit(): tx.addSignatures()`);
        if (sigs) {
            //! doesn't need to re-verify a sig it just collected
            //   (sig verification is ~2x the cost of signing)
            tx.addSignatures(sigs, false);
            txd.signedTxCborHex = bytesToHex(tx.toCbor());
            const txdSigned: TxDescription<any, "signed"> = txd as any;
            txdSigned.signedTxCborHex = bytesToHex(tx.toCbor());
            debugger;
            this.$didSignTx();
            // this.notifier.emit("changed", this)
        } else {
            options.onSubmitError?.({
                ...txd,
                error: "wallet signing failed",
            });
            throw new Error(`wallet signing failed`);
        }
    }

    update(txd: TxDescription<any, any>, transition?: SubmissionsStates) {
        const {
            txd: { tcx: { id: oldId } = {} },
        } = this;
        const { tcx: { id: newId } = {} } = txd;
        if (oldId && newId && oldId !== newId) {
            debugger;
            throw new Error(`txd.id ${oldId} !== ${newId}`);
        }
        this.txd = { ...txd };
        const { tcx, tx } = txd;
        if (tcx && tx && !this.isBuilt) {
            // notifies change-event automatically:

            this.transition("built");
        }
        if (transition) {
            // notifies change-event automatically:
            this.transition(transition);
        } else {
            this.$notifier.emit("changed", this);
        }
    }

    /**
     * signals that the tx was signed, and automatically triggers submission
     * @remarks
     * this should be triggered by the batch-controller's tx-submit strategy
     * either in bulk or on individual txns
     * @public
     */
    $didSignTx() {
        this.isSigned = true;
        this.$startSubmitting();
    }

    /**
     * indicates if the current state & tx-description affords a rebuild of the tx
     * @public
     */
    $canRebuild() {
        return !!this.txd.mkTcx && this.$canTransition("rebuild");
    }

    /**
     * triggers a rebuild of the tx, if possible.
     * @remarks
     * If $canRebuild() returns false, it will throw an error.
     * @public
     */
    async $rebuild() {
        if (!this.$canRebuild()) {
            throw new Error(`check $canRebuild() before calling $rebuild()`);
        }
        this.transition("rebuild");
    }

    async doRebuild() {
        if (this.txd.mkTcx) {
            const tcx = await this.txd.mkTcx();
            const { tcx: _, tx, ...addlTxInfo } = this.txd;
            this.txd.tcx = tcx;
            await tcx.buildAndQueue({
                addlTxInfo,
            });
        }
    }

    $startSubmitting() {
        if (!this.isBuilt) {
            throw new Error(`tx must be built before submitting`);
        }
        if (!this.isSigned) {
            throw new Error(`tx must be signed before submitting`);
        }
        const txd: TxDescription<any, "signed"> = this.txd as any;
        const { id, tx } = txd;
        if (!tx) {
            throw new Error(
                `incontheeivable! tx must be set before submitting`
            );
        }
        const txId = tx.id().toString();

        this.txSubmitters = Object.fromEntries(
            Object.entries(this.submitters).map(([name, submitter]) => {
                const mgr = new TxSubmitMgr({
                    name,
                    submitter,
                    txd,
                    setup: this.setup,
                });
                mgr.$notifier.on(
                    "changed",
                    this.updateSubmitterState.bind(this, name)
                );
                return [name, mgr];
            })
        );
    }

    transitionTable: StateTransitionTable<
        SubmissionsStates,
        SubmissionsTransitions
    > = {
        [`registered`]: {
            ...noTransitionsExcept,
            built: { to: "built" },
            building: { to: "building" },
            failed: { to: "failed" },
        },
        [`building`]: {
            ...noTransitionsExcept,
            rebuild: {
                to: "building",
                onTransition: () => {
                    this.isBuilt = false;
                    this.doRebuild();
                },
            },
            alreadyDone: { to: "alreadyDone" },
            built: { to: "built" },
            failed: { to: "failed" },
        },
        [`alreadyDone`]: terminalState,
        [`built`]: {
            ...noTransitionsExcept,
            signingSingle: { to: "signingSingle" },
            rebuild: {
                to: "building",
                onTransition: () => {
                    this.isBuilt = false;
                    this.doRebuild();
                },
            },
            submitting: {
                to: "submitting",
                onTransition: () => {
                    if (!this.isSigned) {
                        throw new Error(`tx must be signed before submitting`);
                    }
                    this.isBuilt = true;
                },
            },
        },
        [`signingSingle`]: {
            ...noTransitionsExcept,
            // special case of failure in signing; send it back to built state
            // ... where it can be signed again as single or as part of the batch
            failed: { to: `built` },
            submitting: { to: "submitting" },
        },
        [`submitting`]: {
            ...noTransitionsExcept,
            confirming: { to: "confirming" },
            failed: { to: "failed" },
        },
        [`confirming`]: {
            ...noTransitionsExcept,
            confirming: { to: "confirming" },
            confirmed: { to: "confirmed" },
            "mostly confirmed": { to: "mostly confirmed" },
            failed: { to: "failed" },
        },
        [`mostly confirmed`]: {
            ...noTransitionsExcept,
            confirming: { to: "confirming" },
            confirmed: { to: "confirmed" },
            failed: { to: "failed" },
        },
        [`confirmed`]: terminalState,
        [`failed`]: {
            ...noTransitionsExcept,
            rebuild: {
                to: "building",
                onTransition: () => {
                    this.isBuilt = false;
                    this.doRebuild();
                },
            },
        },
    };

    /**
     * aggregates the states of all the various submitters of a single tx
     * @remarks
     * Called every time one of the submit-managers' state is changed.  Based
     * on the status of that submitter, the tx-tracker's state is updated.
     *
     * If there is a failure detected in the submit-manager, the other submit
     * managers are notified of the problem, which typically triggers them to
     * re-confirm and/or re-submit the transaction to the network, to recover
     * from txns that might otherwise have been dropped due to a slot/height 
     * battle.
     *
     * Switches the tx-tracker's state to match the aggregated state of its
     * submitters.  This aggregated state is suitable for presenting to the user
     */
    updateSubmitterState(name: string, mgr: TxSubmitMgr) {
        this.notDestroyed();
        const state: SubmitManagerState = mgr.$mgrState;
        // this.txStates[txId].submitters[name] = state;

        const isFail = mgr.$state == "failed";
        const submitters = Object.values(this.txSubmitters);
        const allConfirmed = submitters.every((s) => s.$state == "confirmed");
        const allFailed = submitters.every((s) => s.$state == "failed");
        const countConfirming = submitters.filter(
            (s) => s.$state == "confirming"
        ).length;
        const countSubmitting = submitters.filter(
            (s) => s.$state == "submitting"
        ).length;
        const countConfirmed = submitters.filter(
            (s) => s.$state == "confirmed" || s.$state == "softConfirmed"
        ).length;

        // const countBuilt = submitters.filter((s) => s.$state == "built").length;

        const transition = allConfirmed
            ? "confirmed"
            : allFailed
            ? "failed"
            : // : countBuilt > 1 ? "built"
            countSubmitting > Math.max(countConfirming, countConfirmed)
            ? "submitting"
            : countConfirming > Math.max(countSubmitting, countConfirmed)
            ? "confirming"
            : countConfirmed > Math.max(countSubmitting, countConfirming)
            ? "mostly confirmed"
            : undefined;
        if (!transition) {
            debugger;
            throw new Error(
                `don't know how to proceed for aggregated state on ${
                    this.txId
                } (debugging breakpoint available)\n   ${JSON.stringify(
                    submitters
                )}`
            );
        }
        this.transition(transition);

        if (isFail) {
            // trigger otherSubmitterProblem on the other submitters,
            // while skipping this one.  This might indicate a slot battle situation
            const mgrsThisTx = this.txSubmitters;
            const otherSubmitters = Object.entries(mgrsThisTx).filter(
                ([n]) => n !== name
            );
            for (const [name, mgr] of otherSubmitters) {
                mgr.otherSubmitterProblem();
            }
        }
    }
}

// /**
//  * @public
//  */
// type SingleTxSubmissionInfo = {
//     submitters: Record<string, TxSubmitMgr>;
//     txDescription: TxDescription<any, any>;
// }

// was for individual-tx submission trigger
// was inserted into tcx submit(), blocking its flow
// txSubmitter:
//     | ResolveablePromise<void>
//     | {
//           promise: Promise<void>;
//           status: "automatic";
//       };
// moved to state-machine
// state:
//     | "pending"
//     | "submitting"
//     | "confirming"
//     | "confirmed"
//     | "failed"
//     | "mostly confirmed";

// submitters: Record<string, SubmitManagerState>;
// moved into state-machine
// notifier: EventEmitter<SMC_TxStatusNotifier>;
// };
