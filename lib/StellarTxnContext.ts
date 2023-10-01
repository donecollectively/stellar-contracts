import {
    HeliosData, Signature, Tx,
    TxOutput,
    TxWitnesses,
    TxInput,
    UplcData,
    UplcDataValue,
    Wallet,
    bytesToHex,
    hexToBytes
} from "@hyperionbt/helios";
import { txAsString } from "./diagnostics.js";
import { paramsBase, stellarSubclass } from "./StellarContract.js";
import { SelectedDelegates } from "./delegation/RolesAndDelegates.js";

//!!! if we could access the inputs and outputs in a building Tx,
//  this might  not be necessary (unless it becomes a
//   bigger-picture contextual container that serves various Stellar
//   contract scripts with non-txn context for building a Tx)

type noState = {}

export class StellarTxnContext<S=noState> {
    tx: Tx;
    inputs: TxInput[];
    collateral?: TxInput;
    outputs: TxOutput[];
    feeLimit?: bigint;
    state : S;
    selectedDelegates : SelectedDelegates = {}
    constructor(state: Partial<S>={}) {
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

    mintTokens(...args: Parameters<Tx["mintTokens"]>) : StellarTxnContext<S> {
        this.tx.mintTokens(...args);

        return this;
    }
    
    reservedUtxos() : TxInput[] {
        return [
            ... this.inputs, 
            this.collateral 
        ].filter((x) => !!x) as TxInput[]
    }

    utxoNotReserved(u: TxInput) : TxInput | undefined {
        if (this.collateral?.eq(u)) return undefined;
        if (this.inputs.find(i => i.eq(u)) ) return undefined;
        return u;
    }

    addCollateral(collateral: TxInput) {
        if (!collateral.value.assets.isZero()) {
            throw new Error(`invalid attempt to add non-pure-ADA utxo as collateral`)
        }
        this.collateral = collateral;

        this.tx.addCollateral(collateral)
        return this;
    }

    addInput(...args: Parameters<Tx["addInput"]>) : StellarTxnContext<S> {
        const [input, ..._otherArgs] = args;
        this.inputs.push(input);
        this.tx.addInput(...args);
        return this;
    }

    addInputs(...args: Parameters<Tx["addInputs"]>) : StellarTxnContext<S> {
        const [inputs, ..._otherArgs] = args;
        this.inputs.push(...inputs);
        this.tx.addInputs(...args);
        return this;
    }

    addOutput(...args: Parameters<Tx["addOutput"]>) : StellarTxnContext<S> {
        const [output, ..._otherArgs] = args;
        this.outputs.push(output);
        this.tx.addOutput(...args);
        return this;
    }

    addOutputs(...args: Parameters<Tx["addOutputs"]>) : StellarTxnContext<S> {
        const [outputs, ..._otherArgs] = args;
        this.outputs.push(...outputs);
        this.tx.addOutputs(...args);

        return this;
    }

    attachScript(...args: Parameters<Tx["attachScript"]>) {
        this.tx.attachScript(...args)

        return this;
    }

    async addSignature(wallet: Wallet) {
        const [sig] = await wallet.signTx(this.tx);
        
        this.tx.addSignature(sig)

    }

    /**
     * To add a script to the transaction context, use `attachScript`
     *
     * @deprecated - invalid method name; use attachScript
     **/
    addScript() {
    }
}

