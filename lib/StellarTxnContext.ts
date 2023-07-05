import {
    HeliosData, Signature, Tx,
    TxOutput,
    TxWitnesses,
    UTxO,
    UplcData,
    UplcDataValue,
    Wallet,
    bytesToHex,
    hexToBytes
} from "@hyperionbt/helios";
import { txAsString } from "./StellarContract.js";

//!!! if we could access the inputs and outputs in a building Tx,
//  this might  not be necessary (unless it becomes a
//   bigger-picture contextual container that serves various Stellar
//   contract scripts with non-txn context for building a Tx)

export class StellarTxnContext {
    tx: Tx;
    inputs: UTxO[];
    collateral?: UTxO;
    outputs: TxOutput[];
    constructor() {
        this.tx = new Tx();
        this.inputs = [];
        this.collateral = undefined;
        this.outputs = [];
    }
    dump() {
        const { tx } = this;
        return txAsString(tx);
    }

    mintTokens(...args: Parameters<Tx["mintTokens"]>) : StellarTxnContext {
        this.tx.mintTokens(...args);

        return this;
    }
    
    reservedUtxos() : UTxO[] {
        return [
            ... this.inputs, 
            this.collateral 
        ].filter((x) => !!x) as UTxO[]
    }

    utxoNotReserved(u: UTxO) : UTxO | undefined {
        if (this.collateral?.eq(u)) return undefined;
        if (this.inputs.find(i => i.eq(u)) ) return undefined;
        return u;
    }

    addCollateral(collateral: UTxO) {
        if (!collateral.value.assets.isZero()) {
            throw new Error(`invalid attempt to add non-pure-ADA utxo as collateral`)
        }
        this.collateral = collateral;

        this.tx.addCollateral(collateral)
        return this;
    }

    addInput(input: UTxO,
        rawRedeemer?: null | UplcDataValue | UplcData | HeliosData
    ) {
        this.inputs.push(input);
        this.tx.addInput(input, rawRedeemer);
        return this;
    }

    addInputs(inputs: UTxO[]) {
        this.inputs.push(...inputs);
        this.tx.addInputs(inputs);
        return this;
    }

    addOutput(output: TxOutput) {
        this.outputs.push(output);
        this.tx.addOutput(output);
        return this;
    }
    addOutputs(outputs: TxOutput[]) {
        this.outputs.push(...outputs);
        this.tx.addOutputs(outputs);
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

