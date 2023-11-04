import {
    HeliosData,
    Tx,
    TxOutput,
    TxInput,
    Wallet,
} from "@hyperionbt/helios";
import { txAsString } from "./diagnostics.js";

//!!! if we could access the inputs and outputs in a building Tx,
//  this might  not be necessary (unless it becomes a
//   bigger-picture contextual container that serves various Stellar
//   contract scripts with non-txn context for building a Tx)

type noState = {};

type addInputArgs = Parameters<Tx["addInput"]>;
type _redeemerArg = addInputArgs[1]

type RedeemerArg = {
    redeemer: _redeemerArg;
};

export class StellarTxnContext<S = noState> {
    tx: Tx;
    inputs: TxInput[];
    collateral?: TxInput;
    outputs: TxOutput[];
    feeLimit?: bigint;
    state: S;
    constructor(state: Partial<S> = {}) {
        this.tx = new Tx();
        this.inputs = [];
        //@ts-expect-error
        this.state = state;
        this.collateral = undefined;
        this.outputs = [];
    }
    dump() {
        const { tx } = this;
        return txAsString(tx);
    }

    mintTokens(...args: Parameters<Tx["mintTokens"]>): StellarTxnContext<S> {
        this.tx.mintTokens(...args);

        return this;
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

    addInput<TCX extends StellarTxnContext<S>>(
        this: TCX, 
        input: addInputArgs[0], 
        r?: RedeemerArg
    ) : TCX  {
        this.inputs.push(input);
        this.tx.addInput(input, r?.redeemer);
        return this;
    }

    addInputs<TCX extends StellarTxnContext<S>>(
        this:TCX, 
        inputs: Parameters<Tx["addInputs"]>[0], 
        r: RedeemerArg
    ): TCX {
        this.inputs.push(...inputs);
        this.tx.addInputs(inputs, r.redeemer);
        return this;
    }

    addOutput<TCX extends StellarTxnContext<S>>(
        this:TCX, 
        ...args: Parameters<Tx["addOutput"]>
    ): TCX {
        const [output, ..._otherArgs] = args;
        this.outputs.push(output);
        this.tx.addOutput(...args);
        return this;
    }

    addOutputs<TCX extends StellarTxnContext<S>>(
        this:TCX
        ,...args: Parameters<Tx["addOutputs"]>
    ): TCX {
        const [outputs, ..._otherArgs] = args;
        this.outputs.push(...outputs);
        this.tx.addOutputs(...args);

        return this;
    }

    attachScript(...args: Parameters<Tx["attachScript"]>) {
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
