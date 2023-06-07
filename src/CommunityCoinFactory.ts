import { Program } from "@hyperionbt/helios";
import { StellarContract } from "../lib/StellarContract.js";

//@ts-expect-error
import contract from "./CommunityCoinFactory.hl";

export class CommunityCoinFactory extends StellarContract<CommunityCoinFactory> {

    contractSource() { return contract }

    //! its endpoints can be introspected
    // endpoints(

    //! it must have transaction-builders for each endpoint
    // buildTxnForEndpoint



    
    //! Sells the first ones for 30% less (first 205?)

    //! Grants extra weight (2.56x) to next 256.  Back-dated to include first 205.

    //! Next (205+256 = 461) get 1.618x rewards (or 2.05x)

    //! -or- from 461 to 8500, the rewards buff leaks away 


}

