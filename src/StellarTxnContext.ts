import { Tx, TxOutput, TxInput, UplcProgram } from "@hyperionbt/helios";
import type { Address, Hash, NetworkParams, Wallet } from "@hyperionbt/helios";

import { dumpAny, txAsString } from "./diagnostics.js";
import type { hasUutContext } from "./Capo.js";
import { UutName, type SeedAttrs } from "./delegation/UutName.js";
import type { ActorContext } from "./StellarContract.js";
import { delegateLinkSerializer } from "./delegation/delegateLinkSerializer.js";

/**
 * A txn context having a seedUtxo in its state
 * @public
 **/
export type hasSeedUtxo = StellarTxnContext<
    anyState & {
        seedUtxo: TxInput;
    }
>;

export type TxDescription<T extends StellarTxnContext> = {
    tcx: T | (() => T) | (() => Promise<T>);

    description: string;
    moreInfo: string;
    optional: boolean;
    txName?: string;
};

export type MultiTxnCallback =
    | ((futTx: TxDescription<any>) => void)
    | ((futTx: TxDescription<any>) => Promise<void>)
    // | ((futTx: TxDescription<any>) => StellarTxnContext<any>)
    // | ((futTx: TxDescription<any>) => Promise<StellarTxnContext<any>>)
    | ((futTx: TxDescription<any>) => StellarTxnContext<any> | false)
    | ((futTx: TxDescription<any>) => Promise<StellarTxnContext<any> | false>);

/**
 * A transaction context that includes additional transactions in its state for later execution
 * @remarks
 *
 * During the course of creating a transaction, the transaction-building functions for a contract
 * suite may suggest or require further transactions, which may not be executable until after the
 * current transaction is executed.  This type allows the transaction context to include such
 * future transactions in its state, so that they can be executed later.
 *
 * The future transactions can be executed using the {@link StellarContract.submitAddlTxns}
 * helper method.
 * @public
 **/
export type hasAddlTxns<
    TCX extends StellarTxnContext<anyState>,
    existingStateType extends anyState = TCX["state"]
> = StellarTxnContext<
    existingStateType & {
        addlTxns: Record<string, TxDescription<any>>;
    }
>;

export type otherAddlTxnNames<TCX extends StellarTxnContext<any>> = string &
    TCX extends { state: { addlTxns: infer aTNs } }
    ? keyof aTNs
    : never;

// type combinedAddlTxns<
//     extraTxnName extends string,
//     stateType extends anyState,
//     existingTxns = stateType extends {addlTxns: any} ? stateType["addlTxns"] : never,
//     existingTxnNames extends string = string & keyof existingTxns
// > = {
//     addlTxns: {
//         //prettier-ignore
//         [txnName in (
//             | extraTxnName
//             | existingTxnNames
//         )]: AddlTxInfo<any>
//     }
// } & stateType;

//!!! if we could access the inputs and outputs in a building Tx,
//  this might  not be necessary (unless it becomes a
//   bigger-picture contextual container that serves various Stellar
//   contract scripts with non-txn context for building a Tx)

/**
 * A base state for a transaction context
 * @public
 **/
export interface anyState {
    uuts: uutMap;
}

/**
 * A base state for a transaction context
 * @public
 **/
// export type anyState = emptyState;
export type uutMap = Record<string, unknown>;
export const emptyUuts: uutMap = Object.freeze({});

type addInputArgs = Parameters<Tx["addInput"]>;
type addRefInputArgs = Parameters<Tx["addRefInput"]>;
type addRefInputsArgs = Parameters<Tx["addRefInputs"]>;
type _redeemerArg = addInputArgs[1];

type RedeemerArg = {
    redeemer: _redeemerArg;
};

/**
 * Transaction-building context for Stellar Contract transactions
 * @remarks
 *
 * Uses same essential facade as Helios Tx.
 *
 * Adds a transaction-state container with strong typing of its contents,
 * enabling transaction-building code to use type-sensitive auto-complete
 * and allowing Stellar Contracts library code to require transaction contexts
 * having known states.
 *
 * Retains reflection capabilities to allow utxo-finding utilities to exclude
 * utxo's already included in the contract.
 *
 * @typeParam S - type of the context's `state` prop
 * @public
 **/
export class StellarTxnContext<S extends anyState = anyState> {
    tx = Tx.new();
    inputs: TxInput[] = [];
    collateral?: TxInput;
    outputs: TxOutput[] = [];
    feeLimit?: bigint;
    state: S;
    actorContext: ActorContext<any>;
    neededSigners: Address[] = [];
    parentTcx?: StellarTxnContext<any>;
    childReservedUtxos: TxInput[] = [];
    networkParams: NetworkParams;

    txnName: string = "";
    withName(name: string) {
        this.txnName = name;
        return this;
    }

    constructor(
        actorContext: ActorContext<any>,
        networkParams: NetworkParams,
        state: Partial<S> = {},
        parentTcx?: StellarTxnContext<any>
    ) {
        this.actorContext = actorContext;
        this.networkParams = networkParams;
        this.parentTcx = parentTcx;
        const { uuts = { ...emptyUuts }, ...moreState } = state;
        //@ts-expect-error
        this.state = {
            uuts,
            ...moreState,
        };
    }
    get actorWallet() {
        return this.actorContext.wallet;
    }

    dump(networkParams?: NetworkParams) {
        const { tx } = this;
        return txAsString(tx, networkParams);
    }

    includeAddlTxn<
        TCX extends StellarTxnContext<anyState>,
        RETURNS extends hasAddlTxns<TCX> = TCX extends hasAddlTxns<any>
            ? TCX
            : hasAddlTxns<TCX>
    >(this: TCX, txnName: string, txInfo: TxDescription<any>): RETURNS {
        const thisWithMoreType: RETURNS = this as any;
        thisWithMoreType.state.addlTxns = {
            ...(thisWithMoreType.state.addlTxns || {}),
            [txnName]: txInfo,
        };
        return thisWithMoreType;
    }

    mintTokens(...args: Parameters<Tx["mintTokens"]>): StellarTxnContext<S> {
        this.tx.mintTokens(...args);

        return this;
    }

    getSeedAttrs<TCX extends hasSeedUtxo>(this: TCX): SeedAttrs {
        const { seedUtxo } = this.state;
        const { txId, utxoIdx: seedIndex } = seedUtxo.outputId;
        return { txId, idx: BigInt(seedIndex) };
    }

    reservedUtxos(): TxInput[] {
        return this.parentTcx
            ? this.parentTcx.reservedUtxos()
            : ([
                  ...this.inputs,
                  this.collateral,
                  ...this.childReservedUtxos,
              ].filter((x) => !!x) as TxInput[]);
    }

    utxoNotReserved(u: TxInput): TxInput | undefined {
        if (this.collateral?.eq(u)) return undefined;
        if (this.inputs.find((i) => i.eq(u))) return undefined;
        return u;
    }

    addUut<T extends string, TCX extends StellarTxnContext>(
        this: TCX,
        //!!! todo: type this more strongly by adding strong typing to the UutName itself?
        uutName: UutName,
        ...names: T[]
    ): hasUutContext<T> & TCX {
        this.state.uuts = this.state.uuts || {};

        for (const name of names) {
            this.state.uuts[name] = uutName;
        }

        return this as hasUutContext<T> & TCX;
    }

    addState<TCX extends StellarTxnContext, K extends string, V>(
        this: TCX,
        key: K,
        value: V
    ): StellarTxnContext<{ [keyName in K]: V } & anyState> & TCX {
        //@ts-expect-error
        this.state[key] = value;
        return this as StellarTxnContext<{ [keyName in K]: V } & anyState> &
            TCX;
    }

    addCollateral(collateral: TxInput) {
        if (!collateral.value.assets.isZero()) {
            throw new Error(
                `invalid attempt to add non-pure-ADA utxo as collateral`
            );
        }
        this.collateral = collateral;

        this.tx.addCollateral(collateral);
        return this;
    }
    getSeedUtxoDetails(this: hasSeedUtxo): SeedAttrs {
        const seedUtxo = this.state.seedUtxo;
        return {
            txId: seedUtxo.outputId.txId,
            idx: BigInt(seedUtxo.outputId.utxoIdx),
        };
    }

    _txnTime?: Date;
    /**
     * Sets a future date for the transaction to be executed, returning the transaction context.  Call this before calling validFor().
     *
     * @remarks Returns the txn context.
     * Throws an error if the transaction already has a txnTime set.
     * 
     * This method does not itself set the txn's validity interval.  You MUST combine it with
     * a call to validFor(), to set the txn's validity period.  The resulting transaction will
     * be valid from the moment set here until the end of the validity period set by validFor().
     *
     * This can be used anytime to construct a transaction valid in the future.  This is particularly useful
     * during test scenarios to verify time-sensitive behaviors.
     * 
     * In the test environment, the network wil normally be advanced to this date
     * before executing the transaction, unless a different execution time is indicated.
     * Use the test helper's `submitTxnWithBlock(txn, otherTime)` or `advanceNetworkTimeForTx()` methods, or args to
     * use-case-specific functions that those methods.
     */
    futureDate<TCX extends StellarTxnContext<S>>(this: TCX, date: Date) {
        if (this._txnTime) {
            throw new Error(
                "txnTime already set; cannot set futureDate() after txnTime"
            );
        }

        const d = new Date(
            Number(
                this.networkParams.slotToTime(
                    this.networkParams.timeToSlot(
                        BigInt((date.getTime())
                    )
                )
            )
        ))
        // time emoji: ⏰
        console.log("  ⏰⏰ setting txnTime to ", d.toString());
        this._txnTime = d;
        return this;
    }

    /**
     * Identifies the time at which the current transaction is expected to be executed.
     * Use this attribute in any transaction-building code that sets date/time values
     * for the transaction.
     * Honors any futureDate() setting or uses the current time if none has been set.
     */
    get txnTime() {
        if (this._txnTime) return this._txnTime;
        const d = new Date(
            Number(
                this.networkParams.slotToTime(
                    this.networkParams.timeToSlot(BigInt(new Date().getTime()))
                )
            )
        );
        // time emoji: ⏰
        console.log("⏰⏰setting txnTime to ", d.toString());
        return (this._txnTime = d);
    }

    /**
     * Sets an on-chain validity period for the transaction, in miilliseconds
     *
     * @remarks if futureDate() has been set on the transaction, that date will be used as the starting point for the validity period
     *
     * @param durationMs the total validity duration for the transaction.  On-chain checks using CapoCtx `now(granularity)` can enforce this duration
     * @param backwardMs a look-back interval allowing the transaction to be included in a very recent slot
     *
     * @returns
     */
    validFor<TCX extends StellarTxnContext<S>>(
        this: TCX,
        durationMs: number
        // backwardMs = 1 * 60 * 1000 // allow it to be up to ~3 blocks / 1 minute old by default
    ): TCX {
        const startMoment = this.txnTime.getTime();
        this.tx
            .validFrom(new Date(startMoment))
            .validTo(new Date(startMoment + durationMs));

        return this;
    }

    txRefInputs: TxInput[] = [];
    /**
     * adds a reference input to the transaction context
     * @remarks
     *
     * idempotent version of helios addRefInput()
     *
     * @public
     **/
    addRefInput<TCX extends StellarTxnContext<S>>(
        this: TCX,
        ...inputArgs: addRefInputArgs
    ) {
        const [input, ...moreArgs] = inputArgs;
        if (this.txRefInputs.find((v) => v.outputId.eq(input.outputId))) {
            console.warn("suppressing second add of refInput");
            return this;
        }
        this.txRefInputs.push(input);

        // if (moreArgs.length) {
        //     //@ts-expect-error
        //     this.tx.attachScript(...moreArgs);
        //     return this
        // }

        const t = this.tx.witnesses.scripts.length;
        this.tx.addRefInput(input, ...moreArgs);
        const t2 = this.tx.witnesses.scripts.length;
        if (t2 > t) {
            console.log(
                "       --- addRefInput added ",
                this.tx.witnesses.scripts.length - t,
                " to tx.scripts"
            );
        }

        return this;
    }

    addRefInputs<TCX extends StellarTxnContext<S>>(
        this: TCX,
        ...args: addRefInputsArgs
    ) {
        const [inputs] = args;

        for (const input of inputs) {
            this.addRefInput(input);
        }
        return this;
    }

    addInput<TCX extends StellarTxnContext<S>>(
        this: TCX,
        input: addInputArgs[0],
        r?: RedeemerArg
    ): TCX {
        if (r && !r.redeemer) {
            console.log("activity without redeemer tag: ", r);
            throw new Error(
                `addInput() redeemer must match the isActivity type {redeemer: ‹activity›}\n` +
                    JSON.stringify(r, delegateLinkSerializer)
            );
        }

        if (input.address.pubKeyHash) this.neededSigners.push(input.address);
        this.inputs.push(input);
        if (this.parentTcx) {
            this.parentTcx.childReservedUtxos.push(input);
        }
        try {
            this.tx.addInput(input, r?.redeemer);
        } catch (e: any) {
            console.log("failed adding input to txn: ", dumpAny(this));

            throw new Error(
                `addInput: ${e.message}` +
                    "\n   ...see partial txn above.  Failed TxInput:\n" +
                    dumpAny(input)
            );
        }

        return this;
    }

    addInputs<TCX extends StellarTxnContext<S>>(
        this: TCX,
        inputs: Parameters<Tx["addInputs"]>[0],
        r: RedeemerArg
    ): TCX {
        if (r && !r.redeemer) {
            console.log("activity without redeemer tag: ", r);
            throw new Error(
                `addInputs() redeemer must match the isActivity type {redeemer: ‹activity›}\n` +
                    JSON.stringify(r, delegateLinkSerializer)
            );
        }
        for (const input of inputs) {
            if (input.address.pubKeyHash)
                this.neededSigners.push(input.address);
        }
        this.inputs.push(...inputs);
        if (this.parentTcx) {
            this.parentTcx.childReservedUtxos.push(...inputs);
        }
        this.tx.addInputs(inputs, r.redeemer);

        return this;
    }

    addOutput<TCX extends StellarTxnContext<S>>(
        this: TCX,
        ...args: Parameters<Tx["addOutput"]>
    ): TCX {
        const [output, ..._otherArgs] = args;
        this.outputs.push(output);
        try {
            this.tx.addOutput(...args);
        } catch (e: any) {
            console.log("failed adding output to txn: ", dumpAny(this));
            throw new Error(
                `addOutput: ${e.message}` +
                    "\n   ...see partial txn above.  Failed TxOutput:\n" +
                    dumpAny(output)
            );
        }

        return this;
    }

    addOutputs<TCX extends StellarTxnContext<S>>(
        this: TCX,
        ...args: Parameters<Tx["addOutputs"]>
    ): TCX {
        const [outputs, ..._otherArgs] = args;
        this.outputs.push(...outputs);
        this.tx.addOutputs(...args);

        return this;
    }

    attachScript(...args: Parameters<Tx["attachScript"]>) {
        throw new Error(
            `use addScriptProgram(), increasing the txn size, if you don't have a referenceScript.\n` +
                `Use <capo>.txnAttachScriptOrRefScript() to use a referenceScript when available.`
        );
    }

    addScriptProgram(...args: Parameters<Tx["attachScript"]>) {
        const script = args[0];
        // console.log("in attachScript, scripts is ", this.tx.witnesses.scripts.map(x => x.hash().slice(0,8)))
        if (script instanceof UplcProgram) {
            const thisPurpose = script.properties.purpose;
            const whichHash =
                thisPurpose == "minting"
                    ? "mintingPolicyHash"
                    : thisPurpose == "staking"
                    ? "stakingValidatorHash"
                    : thisPurpose == "spending"
                    ? "validatorHash"
                    : "";
            const expected: Hash = script[whichHash];
            if (!whichHash || !expected)
                throw new Error(
                    `unexpected script purpose ${script.properties.purpose} in attachScript()`
                );

            if (
                this.txRefInputs?.find((ri) => {
                    const rs = ri.origOutput.refScript;
                    if (!rs) return false;
                    const { purpose } = rs.properties;
                    if (purpose && purpose != thisPurpose) return false;

                    const foundHash: Hash =
                        ri.origOutput.refScript?.[whichHash];
                    return foundHash.eq(expected);
                })
            ) {
                console.log(
                    "     --- txn already has this script as a refScript; not re-adding"
                );
                return this;
            }
        }
        this.tx.attachScript(...args);

        return this;
    }

    async addSignature(wallet: Wallet) {
        const [sig] = await wallet.signTx(this.tx);

        this.tx.addSignature(sig);
    }

    /**
     * To add a script to the transaction context, use `attachScript`
     *
     * @deprecated - invalid method name; use attachScript
     **/
    addScript() {}
}
