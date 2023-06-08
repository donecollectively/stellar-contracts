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
    get charterSeedDatum() {
        return Datum.inline(this.configuredContract.evalParam("CHARTER").data);
    }

    async buildCharterSeed(tx : Tx = new Tx()) {
        //! EXPECTS myself to be set
        if (!this.myself)
            throw new Error(
                `missing required 'myself' attribute on ${this.constructor.name}`
            );

        //! deposits one ADA into the contract for use with the CoinFactory charter.
        //! deposits the minimum
        const txValue = new Value(this.ADA(1));

        const output = new TxOutput(
            this.address,
            txValue,
            // Datum.inline(new this.datumType.CharterSeed([42]))
            this.charterSeedDatum
        );

        const input = await this.findInputsInWallets(txValue, {
            wallets: [this.myself],
        });

        // prettier-ignore
        tx.addOutput(output)
            .addInput(input)

        return { tx, input, output };
    }

    // buildCharterTxn() {
    //     const output = new TxOutput(this.address)
    //         new helios.Value(1_000_000n), // 1 tAda == 1 million lovelace
    //     )

    // }
}
