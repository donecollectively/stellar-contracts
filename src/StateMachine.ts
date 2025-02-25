import { EventEmitter } from "eventemitter3";

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
    // } & { // EventEmitter3 doesn't recognize this approach : /
    //     [k in $states<SM> as string]: [SM, k];
};

export type $states<SM extends StateMachine<any, any>> =
    SM extends StateMachine<infer S, any> ? S : never;

export abstract class StateMachine<
    STATES extends string,
    TRANSITIONS extends string
> {
    state: STATES;
    notifier: EventEmitter<StateMachineEmitter<this>>;
    destroyed = false;
    abstract transitionTable: StateTransitionTable<STATES, TRANSITIONS>;

    abstract resetState(): any;
    constructor() {
        this.state = this.initialState;
        this.notifier = new EventEmitter();
        this.resetState();
        this.notifier.on("state:entered", (sm, state) => {
            const entryHook = this.onEntry[state]
            if (entryHook) {
                entryHook.call(this);
            }
        })
    }

    destroy() {
        this.notifier.emit("destroyed", this);
        this.notifier.removeAllListeners();
        //@ts-expect-error
        this.notifier = "destroyed";
        this.destroyed = true;
    }

    notDestroyed() {
        if (this.destroyed) {
            throw new Error(
                `🍓🍸 ${this.stateMachineName} has already  been destroyed`
            );
        }
    }
    log(...args: [string, ...any[]]) {
        const [msg, ...rest] = args;
        console.log(
            `🍓🍸 ${this.stateMachineName} @${this.state}: `+msg,
            ...rest
        );
    }

    onEntry : Partial<{ [state in STATES]: () => void }> = {}

    get stateMachineName() {
        return this.constructor.name;
    }

    get initialState(): STATES {
        throw new Error("abstract");
    }

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
    $mkTransition(tn: TRANSITIONS) {
        return this.mkTransition(tn);
    }

    /**
     * creates a transition function for the indicated transition name
     * @remarks
     * The resulting callback will try to transition the state-machine
     * but can fail if the transition table doesn't permit the named transition
     * at the time of the call.
     * @public
     */
    mkTransition(tn: TRANSITIONS) {
        return this.transition.bind(this, tn);
    }

    /**
     * returns true if the state-machine can currently use the named transition
     * @public
     */
    $canTransition(tn: TRANSITIONS) {
        return !!this.transitionTable[this.state][tn];
    }

    /**
     * transitions the state-machine through the indicated tx name
     * @remarks
     * can fail if the transition table doesn't permit the named transition
     * while in the current state.
     *
     * the prefix brings this most common method to the top for autocomplete
     * @public
     */
    $transition(tn: TRANSITIONS) {
        return this.transition(tn);
    }
    /**
     * transitions the state-machine through the indicated tx name
     * @public
     */
    transition(tn: TRANSITIONS) {
        const currentState = this.state;
        const foundTransition = this.transitionTable[currentState][tn];
        if (!foundTransition) {
            debugger
            throw new Error(
                ` 🍓🍸 ${this.stateMachineName}: invalid transition '${tn}' from state=${currentState}`
            );
        }
        const { to: targetState, onTransition } = foundTransition;
        let error = "";
        let nextState: string | false;
        let wasCancelled = false;
        try {
            nextState = onTransition?.() || targetState;
        } catch (e: any) {
            nextState = false;
            error = e.message || e;
        }
        if (!error)
            try {
                function mayCancelTransition(reason: string) {
                    wasCancelled = true;
                    error = reason || "‹unknown reason›";
                    nextState = false;
                }
                this.notifier.emit("transition", this, {
                    from: currentState as $states<this>,
                    transition: tn,
                    to: targetState as $states<this>,
                    cancelTransition: mayCancelTransition,
                });
            } catch (e: any) {
                nextState = false;
                wasCancelled = true;
                error = e.message || e.toString();
            }

        if (nextState == false) {
            this.log(
                `transition canceled: ${currentState}: ${tn} XXX ${targetState}` +
                    (wasCancelled
                        ? `\n -- cancelled by 'transition' listener`
                        : "") +
                    (!!error ? ` -- ${error}` : "") +
                    `\n  -- staying in state ${currentState}`
            );
            // "did-change" could be a matter of interpretation
            // this.notifier.emit("changed", this);
            return;
        }
        if (this.state != currentState) {
            const trampolineState = this.state
            this.log(
                `  -- trampolined ^^ ${currentState}: ${tn} 🏒 -> ~~${nextState}~~  🥅 ${trampolineState} during ${tn} `
            );
            // skipped extra notification
        } else {
            nextState = nextState || targetState;
            const stateRedirect =
                nextState == targetState ? "" : `~~${targetState}~~  -> `;
            this.log(
                ` -- ${tn} 🏒 -> ${stateRedirect} 🥅 ${nextState}`
            );
            this.state = (nextState || targetState) as any;
            this.notifier.emit("changed", this);
            this.notifier.emit("state:entered", this, this.state);
        }
    }
}

export type StateTransitionTable<S extends string, T extends string> = {
    [state in S]: {
        [transition in T]: null | {
            to: S;
            onTransition?: (() => S) | (() => false) | (() => void);
        };
    };
};
