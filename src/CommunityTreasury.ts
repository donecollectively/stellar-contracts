import {
    Address,
    Program,
    Tx,
    UplcProgram,
    TxOutput,
    Value,
    Datum,
    Wallet,
} from "@hyperionbt/helios";

import { StellarContract } from "../lib/StellarContract.js";

//@ts-expect-error
import contract from "./CommunityTreasury.hl";

export type CCTParams = {
    nonce: number[];
    initialTrustees: Address[];
};
export class CommunityTreasury extends StellarContract<CCTParams> {
    contractSource() {
        return contract;
    }

    async buildCharterUtxo(tx: Tx, wallets: Wallet[]) {
        const dType = this.configuredContract.mainArgTypes[0];
        console.log({ dType });

        //! deposits one ADA into the contract for use with the CoinFactory charter.
        //! deposits the minimum 
        const txValue = new Value(this.ADA(1));
        // console.error(this.configuredContract.mainArgTypes[0])
        
        const output = new TxOutput(
            this.address,
            txValue,
            // Datum.inline(new this.datumType.CharterUtxo([42]))
            Datum.inline(this.configuredContract.evalParam("CHARTER").data)
        );

        // const addresses : Address[] = []; 
        const input = await this.findInputsInWallets(txValue, { wallets });

        // prettier-ignore
        tx.addOutput(output)
            .addInput(input)

        return { tx, input, output};
    }

    // buildCharterTxn() {
    //     const output = new TxOutput(this.address)
    //         new helios.Value(1_000_000n), // 1 tAda == 1 million lovelace
    //     )

    // }
}
