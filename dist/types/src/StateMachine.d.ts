import { EventEmitter } from "eventemitter3";
import type { ResolveablePromise, WrappedPromise } from "./networkClients/mkCancellablePromise.js";
type transitionEventInfo<SM extends StateMachine<any, any>> = {
    from: $states<SM>;
    transition: string;
    to: $states<SM>;
    cancelTransition: (reason: string) => void;
};
export type StateMachineEmitter<SM extends StateMachine<any, any>> = {
    changed: [SM];
    [`transition`]: [SM, transitionEventInfo<SM>];
    [`state:entered`]: [SM, string];
    [`destroyed`]: [SM];
    [`backoff`]: [SM, number, string];
};
export type $states<SM extends StateMachine<any, any>> = SM extends StateMachine<infer S, any> ? S : never;
export type $transitions<SM extends StateMachine<any, any>> = SM extends StateMachine<any, infer T> ? T : never;
export type AnyPromise<T> = Promise<T> | WrappedPromise<T> | ResolveablePromise<T>;
export type DeferredStateMachineAction<SM extends StateMachine<any, any>, TYPE extends "state" | "transition"> = {
    type: TYPE;
    promise: AnyPromise<any>;
    displayStatus: string;
} & (TYPE extends "state" ? {
    targetState: $states<SM>;
} : TYPE extends "transition" ? {
    transitionName: $transitions<SM>;
} : never);
export type DeferredTransition<SM extends StateMachine<any, any>> = DeferredStateMachineAction<SM, "transition">;
export type DeferredState<SM extends StateMachine<any, any>> = DeferredStateMachineAction<SM, "state">;
export declare abstract class StateMachine<STATES extends string, TRANSITIONS extends string> {
    $state: STATES;
    $notifier: EventEmitter<StateMachineEmitter<this>>;
    destroyed: boolean;
    _deferredSMAction?: DeferredStateMachineAction<this, any>;
    abstract transitionTable: StateTransitionTable<STATES, TRANSITIONS>;
    instanceId: number;
    abstract resetState(): any;
    constructor();
    get $deferredAction(): any;
    get $describeDeferredAction(): string;
    get deferredTargetState(): any;
    /**
     * schedules a deferred transition to be performed when the promise resolves
     * @remarks
     * When there is a deferred transition, the state-machine will not accept other
     * transitions until the promise resolves one way or the other.
     *
     * A prime use-case for a deferred transition is for an onEntry hook to
     * defer (with setTimeout()) an unconditional next activity that will be
     * triggered by transitioning to the next state.
     *
     * The displayStatus is used to provide transparency about the
     * implied "activity" of waiting to trigger the transition.  For instance,
     * a "doneCooking" state on a microwave might have a displayStatus of
     * "food is ready", with a 2m-deferred transition to "remindingReady" state,
     * where it beeps three times and returns to doneCooking for further
     * reminders (opening the door or pressing Cancel would interrupt and
     * prevent the deferred transition).
     *
     * ### Return-type notes
     * Note that the returned type is not usable as result of an
     * onTransition hook or onEntry hook.  In onTransition, you can return
     * `this.$deferredState(...)`.  To use `$deferredTransition(...)` in onEntry,
     * just call it and don't return it.
     */
    $deferredTransition(this: this, tn: TRANSITIONS, displayStatus: string, promiseOrDelay: number | AnyPromise<any>): DeferredTransition<this>;
    ignoringListenerErrors(event: string, cb: () => void): void;
    /**
     * Schedules the completion of a deferred transition, placing the
     * state-machine into the target state.
     * @remarks
     * When the context of a particular state-transition has a natural
     * affinity to a delayed effect of triggering a state-change (or to
     * re-initiating the current-state), this method can be used to
     * indicate that deferred effect.
     *
     * The displayStatus is used to provide transparency about the cause
     * and context of the delayed change-of-state.
     *
     * The deferred transition will be cancelled if the promise is
     * cancelled or fails.
     *
     * A key use-case for this is to allow a transition that can re-trigger
     * the onEntry effects of the current state (or another next state), while
     * remaining cosmetically or semantically in the original state, deferred
     * the deferred entry to the target state; the target state's onEntry
     * hook will then be called after the transition is actually finished.
     *
     * Meanwhile, there is an explicit block on other state-transitions, and
     * there is an explicit current displayStatus providing strong transparency
     * about the deferred switch to the target state.
     *
     * As an example, a kitchen-timer feature on a microwave might (once it
     * finishes its countdown to zero and is done beeping), trigger a
     * `$deferredState("idle", ...)` with a deferred displayStatus of "timer finished".
     * It would then move to idle when the Cancel button is pressed.  This example
     * differs from that in $deferredTransition(), with the assumption that the
     * kitchen timer doesn't try to bug the user about it being finished,
     * the way the "doneCooking" state example describes.
     *
     * ### Return-type notes
     * Note that this type is only valid as the return value of an onTransition
     * callback, and not as a return value of an onEntry hook.  In an onEntry
     * hook, call and don't return the $deferredTransition(...).
     */
    $deferredState(this: this, transitionName: TRANSITIONS, targetState: STATES, displayStatus: string, promiseOrDelay: number | AnyPromise<any>): DeferredState<this>;
    delayed(delay?: number): Promise<unknown>;
    onStateEntered(sm: any, state: any): void;
    destroy(): void;
    notDestroyed(): void;
    log(...args: [string, ...any[]]): void;
    onEntry: Partial<{
        [state in STATES]: () => void;
    }>;
    get stateMachineName(): string;
    get initialState(): STATES;
    /**
     * creates a transition function for the indicated transition name
     * @remarks
     * the prefix brings this most common method to the top for autocomplete
     *
     * the resulting callback will try to transition the state-machine
     * but can fail if the transition table doesn't permit the named transition
     * at the time of the call.
     * @public
     */
    $mkTransition(tn: TRANSITIONS): () => Promise<void>;
    /**
     * creates a transition function for the indicated transition name
     * @remarks
     * The resulting callback will try to transition the state-machine
     * but can fail if the transition table doesn't permit the named transition
     * at the time of the call.
     * @public
     */
    mkTransition(tn: TRANSITIONS): () => Promise<void>;
    /**
     * returns true if the state-machine can currently use the named transition
     * @public
     */
    $canTransition(tn: TRANSITIONS): boolean;
    /**
     * transitions the state-machine through the indicated tx name
     * @remarks
     * can fail if the transition table doesn't permit the named transition
     * while in the current state.
     *
     * the prefix brings this most common method to the top for autocomplete
     * @public
     */
    $transition(tn: TRANSITIONS): Promise<void>;
    /**
     * transitions the state-machine through the indicated tx name
     * @public
     */
    transition(tn: TRANSITIONS): Promise<void>;
    finishTransition(tn: TRANSITIONS, targetState: STATES, currentState: string, nextState: string | false | DeferredState<this>, error: string): Promise<void> | undefined;
}
export type StateTransitionTable<S extends string, T extends string> = {
    [state in S]: {
        [transition in T]: null | {
            to: S;
            onTransition?: (() => void) | (() => S) | (() => DeferredState<StateMachine<S, T>>) | (() => false) | (() => S | false) | (() => S | false | DeferredState<StateMachine<S, T>>) | (() => S | DeferredState<StateMachine<S, T>>) | (() => false | DeferredState<StateMachine<S, T>>);
        };
    };
};
export {};
//# sourceMappingURL=StateMachine.d.ts.map