import {
    HeliosData,
    Tx,
    TxOutput,
    TxInput,
    UplcProgram,
} from "@hyperionbt/helios";
import type { Address, Hash, NetworkParams, TxId, Wallet } from "@hyperionbt/helios";

import { txAsString } from "./diagnostics.js";
import type { hasUutContext } from "./Capo.js";
import { UutName } from "./delegation/UutName.js";

/**
 * A txn context having a seedUtxo in its state
 * @public
 **/
export type hasSeedUtxo = StellarTxnContext<
    anyState & {
        seedUtxo: TxInput;
    }
>;

export type FutureTxInfo<T extends StellarTxnContext> = {
    tx: T;
    description: string,
    moreInfo: string,
    optional: boolean
}

export type hasFutureTxn<
    TCX extends StellarTxnContext,
    txnName extends string,
    FUTURE_TX_TYPE extends StellarTxnContext,
> = TCX & StellarTxnContext<
    emptyState & {
        futureTxns:  { 
            [key in txnName]: FutureTxInfo<FUTURE_TX_TYPE>
        }
    } 
>

export type SeedAttrs = {
    seedTxn: TxId;
    seedIndex: bigint;
};

//!!! if we could access the inputs and outputs in a building Tx,
//  this might  not be necessary (unless it becomes a
//   bigger-picture contextual container that serves various Stellar
//   contract scripts with non-txn context for building a Tx)

export type emptyState = {
    uuts: Record<string, UutName>;
};
export type anyState = emptyState;
export type uutMap = Record<string, UutName>;
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
    actor?: Wallet;
    neededSigners: Address[] = [];
    constructor(actor?: Wallet, state: Partial<S> = {}) {
        this.actor = actor;
        const { uuts = { ...emptyUuts }, ...moreState } = state;
        //@ts-expect-error
        this.state = {
            uuts,
            ...moreState,
        };
    }

    dump(networkParams?: NetworkParams) {
        const { tx } = this;
        return txAsString(tx, networkParams);
    }

    addFutureTxn<
        TCX extends StellarTxnContext<anyState>, 
        txnName extends string, 
        FUTURE_TX_TYPE extends StellarTxnContext
    >(
        this: TCX,
        txnName: txnName, 
        txInfo: FutureTxInfo<FUTURE_TX_TYPE>
    ): hasFutureTxn<TCX, txnName, FUTURE_TX_TYPE> {
        const thisWithMoreType : hasFutureTxn<TCX, txnName, FUTURE_TX_TYPE> = this as any;
        thisWithMoreType.state.futureTxns = {
        ... (thisWithMoreType.state.futureTxns || {}),
            [txnName]: txInfo
        }
        return thisWithMoreType 
    }

    mintTokens(...args: Parameters<Tx["mintTokens"]>): StellarTxnContext<S> {
        this.tx.mintTokens(...args);

        return this;
    }

    getSeedAttrs<TCX extends hasSeedUtxo>(this: TCX): SeedAttrs {
        const { seedUtxo } = this.state;
        const { txId: seedTxn, utxoIdx: seedIndex } = seedUtxo.outputId;
        return { seedTxn, seedIndex: BigInt(seedIndex) };
    }

    reservedUtxos(): TxInput[] {
        return [...this.inputs, this.collateral].filter(
            (x) => !!x
        ) as TxInput[];
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

    validFor<TCX extends StellarTxnContext<S>>(
        this: TCX,
        durationMs: number,
        backwardMs = 3 * 60 * 1000 // allow it to be up to ~12 slots / 3 minutes old by default
    ): TCX {
        this.tx
            .validFrom(new Date(Date.now() - backwardMs))
            .validTo(new Date(Date.now() + durationMs));

        return this;
    }

    txRefInputs: TxInput[] = [];
    /**
     * adds a reference input to the transaction context
     * @remarks
     *
     * idempotent version of helios addRefInput()
     *
     * @typeParam ‹pName› - descr (for generic types)
     * @public
     **/
    addRefInput<TCX extends StellarTxnContext<S>>(
        this: TCX,
        ... inputArgs: addRefInputArgs
    ) {
        const [input, ... moreArgs ] = inputArgs;
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

        const t =  this.tx.witnesses.scripts.length
        this.tx.addRefInput(input, ...moreArgs);
        const t2 =  this.tx.witnesses.scripts.length;
        if (t2 > t) {
            console.log("      --- addRefInput added ", this.tx.witnesses.scripts.length - t, " to tx.scripts")
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
        if (input.address.pubKeyHash) this.neededSigners.push(input.address);
        this.inputs.push(input);
        this.tx.addInput(input, r?.redeemer);

        return this;
    }

    addInputs<TCX extends StellarTxnContext<S>>(
        this: TCX,
        inputs: Parameters<Tx["addInputs"]>[0],
        r: RedeemerArg
    ): TCX {
        for (const input of inputs) {
            if (input.address.pubKeyHash)
                this.neededSigners.push(input.address);
        }
        this.inputs.push(...inputs);
        this.tx.addInputs(inputs, r.redeemer);

        return this;
    }

    addOutput<TCX extends StellarTxnContext<S>>(
        this: TCX,
        ...args: Parameters<Tx["addOutput"]>
    ): TCX {
        const [output, ..._otherArgs] = args;
        this.outputs.push(output);
        this.tx.addOutput(...args);
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
        const script = args[0];
        // console.log("in attachScript, scripts is ", this.tx.witnesses.scripts.map(x => x.hash().slice(0,8)))
        if (script instanceof UplcProgram) {
            const thisPurpose = script.properties.purpose
            const whichHash = 
                thisPurpose == "minting" ? "mintingPolicyHash" 
                : thisPurpose == "staking" ? "stakingValidatorHash" 
                : thisPurpose == "spending" ?  "validatorHash" : ""
            const expected : Hash = script[whichHash];
            if (!whichHash || !expected) throw new Error(`unexpected script purpose ${script.properties.purpose} in attachScript()`);

            if (this.txRefInputs?.find((ri) => {
                    const rs = ri.origOutput.refScript;
                    if (!rs) return false;
                    const {purpose} = rs.properties;
                    if (purpose && (purpose != thisPurpose)) return false;

                    const foundHash : Hash =  ri.origOutput.refScript?.[whichHash];
                    return foundHash.eq(expected);
            })) {
                console.log("     --- txn already has this script as a refScript; not re-adding");
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
