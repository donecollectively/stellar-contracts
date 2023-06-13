import { Program, Datum, TxId, TxOutputId, Address } from "@hyperionbt/helios";
import { StellarContract } from "../lib/StellarContract.js";

//@ts-expect-error
import contract from "./CommunityCoinFactory.hl";

export type CcfParams = {
    seedTxn: TxId
    seedIndex: bigint
};

export type CcfCharterRedeemerArgs = {
    treasury: Address
}

export class CommunityCoinFactory extends StellarContract<CcfParams> {
    contractSource() { return contract }

    mkCharterRedeemer({
        treasury,
    }: CcfCharterRedeemerArgs) {
        // debugger
        const t =  new this.configuredContract.types.Redeemer.Charter(
            treasury
        );
        
        return t._toUplcData();
        return t;
    }

    t() {
        const t = Datum.inline(this.configuredContract.evalParam("seedTxn").data);
    
        return t
    }
    //! its endpoints can be introspected
    // endpoints(

    //! it must have transaction-builders for each endpoint
    // buildTxnForEndpoint



    
    //! Sells the first ones for 30% less (first 205?)

    //! Grants extra weight (2.56x) to next 256.  Back-dated to include first 205.

    //! Next (205+256 = 461) get 1.618x rewards (or 2.05x)

    //! -or- from 461 to 8500, the rewards buff leaks away 


}

