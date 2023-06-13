import {
    Address,
    Program,
    Tx,
    UplcProgram,
    TxOutput,
    Value,
    Datum,
    Wallet,
    UTxO,
    DatumHash,
    ByteArray,
} from "@hyperionbt/helios";

import { StellarConstructorArgs, StellarContract } from "../lib/StellarContract.js";

//@ts-expect-error
import contract from "./CommunityTreasury.hl";
import { CommunityCoinFactory } from "./CommunityCoinFactory.js";

export type CtParams = {
    nonce: number[];
    initialTrustees: Address[];
};

type paramsFuncForStar<
    S2 extends StellarContract<any> 
> = () => S2 extends StellarContract<infer P> ? Promise<P> : never

type paramsForStar<
    S2 extends StellarContract<any>
> = S2 extends StellarContract<infer P> ? P : never


export class CommunityTreasury extends StellarContract<CtParams> {
    minter?: CommunityCoinFactory;

    async mkMinter() : Promise<CommunityCoinFactory> {
        if (this.minter) return this.minter
        const seedUtxo = (await this.findDatum(this.charterSeedDatum))[0]
        if (!seedUtxo) throw new Error(`no seed utxo is present in ${this.address.toBech32()}.  Was it deposited?  Was it already transformed to a charterToken?`)

        this.minter = this.addScriptWithParams(CommunityCoinFactory, {
            seedTxn: seedUtxo.txId,
            index: seedUtxo.utxoIdx
        })
        return this.minter
    }

    addScriptWithParams<
        SC extends StellarContract<any>,
        // P = SC extends StellarContract<infer P> ? P : never
    >(TargetClass: new(a: SC extends StellarContract<any> ? StellarConstructorArgs<SC> : never) => SC, 
        params: SC extends StellarContract<infer P> ? P : never
    ) {
        const args : StellarConstructorArgs<SC> = {
            params,
            network: this.network,
            myself: this.myself,
            networkParams: this.networkParams,
            isTest: true,
        }
        //@ts-expect-error todo: why is the conditional type not matching enough?
        const strella = new TargetClass(args);
        return strella
    }
    contractSource() {
        return contract;
    }
    get charterSeedDatum() {
        return Datum.inline(this.configuredContract.evalParam("CHARTER_SEED").data);
    }
    }


    async txDepositCharterSeed(tx : Tx = new Tx()) {
        //! EXPECTS myself to be set
        if (!this.myself)
            throw new Error(
                `missing required 'myself' attribute on ${this.constructor.name}`
            );

        //! deposits one ADA into the contract for use with the CoinFactory charter.
        //! deposits the minimum
        const txValue = new Value(this.ADA(1));

        const outputs =  [new TxOutput(
            this.address,
            txValue,
            // Datum.inline(new this.datumType.CharterSeed([42]))
            this.charterSeedDatum
        )]

        const inputs = [ await this.findInputsInWallets(txValue, {
            wallets: [this.myself],
        }) ]

        // prettier-ignore
        tx.addOutputs(outputs)
            .addInputs(inputs)

        return { tx, inputs, outputs };
    }

    // buildCharterTxn() {
    //     const output = new TxOutput(this.address)
    //         new helios.Value(1_000_000n), // 1 tAda == 1 million lovelace
    //     )

    // }
}
