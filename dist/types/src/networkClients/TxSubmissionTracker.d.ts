import { StateMachine, type StateTransitionTable } from "../StateMachine.js";
import type { SetupInfo } from "../StellarContract.js";
import type { TxDescription } from "../StellarTxnContext.js";
import type { namedSubmitters } from "./BatchSubmitController.js";
import { TxSubmitMgr } from "./TxSubmitMgr.js";
type SubmissionsStates = "registered" | "building" | "nested batch" | "not needed" | "built" | "signingSingle" | "submitting" | "confirming" | "confirmed" | "failed" | "mostly confirmed";
type SubmissionsTransitions = Exclude<SubmissionsStates, "not needed" | "nested batch"> | "reconfirm" | "alreadyDone" | "isFacade";
/**
 * Tracks the submission of a single tx via one or more submitter clients
 * @public
 */
export declare class TxSubmissionTracker extends StateMachine<SubmissionsStates, SubmissionsTransitions> {
    txd: TxDescription<any, any>;
    submitters: namedSubmitters;
    txSubmitters: Record<string, TxSubmitMgr>;
    setup: SetupInfo;
    isSigned: boolean;
    get initialState(): "registered";
    constructor({ txd, submitters, setup, }: {
        txd: TxDescription<any, any>;
        submitters: namedSubmitters;
        setup: SetupInfo;
    });
    destroy(): void;
    get id(): string;
    get txLabel(): string;
    get stateMachineName(): string;
    get txId(): string;
    resetState(): void;
    isBuilt: boolean;
    onEntry: {
        registered: () => void;
        building: () => void;
        built: () => void;
        signingSingle: () => void;
        submitting: () => void;
    };
    $signAndSubmit(): Promise<void>;
    update(txd: TxDescription<any, any>, transition?: SubmissionsTransitions): void;
    /**
     * signals that the tx was signed, and automatically triggers submission
     * @remarks
     * this should be triggered by the batch-controller's tx-submit strategy
     * either in bulk or on individual txns
     * @public
     */
    $didSignTx(): void;
    $startSubmitting(): void;
    transitionTable: StateTransitionTable<SubmissionsStates, SubmissionsTransitions>;
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
    updateSubmitterState(name: string, mgr: TxSubmitMgr): void;
    /**
     * private internal method for forcing the state into an indication
     * of confirmed, without triggering any other state changes
     * @remarks
     * helps prevent the test env from being affected by particularities
     * of the tx batcher that are good for user-facing context but disruptive
     * for test automation
     * @internal
     */
    _emulatorConfirmed(): void;
}
export {};
//# sourceMappingURL=TxSubmissionTracker.d.ts.map