import { Program, Datum, TxId, TxOutputId, Address } from "@hyperionbt/helios";
import {
    StellarContract,
    partialTxn,
    redeem,
    tokenNamesOrValuesEntry,
    valuesEntry,
} from "../lib/StellarContract.js";

//@ts-expect-error
import contract from "./CommunityCoinFactory.hl";
import { StellarTxnContext } from "../lib/StellarTxnContext.js";
import { CharterTokenUTxO } from "./CommunityTreasury.js";

export type CcfParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};

export type CcfCharterRedeemerArgs = {
    treasury: Address;
};
export type CcfMintRedeemerArgs = {
    tokenName: string;
};

export class CommunityCoinFactory extends StellarContract<CcfParams> {
    contractSource() {
        return contract;
    }

    @redeem
    mintingCharterToken({ treasury }: CcfCharterRedeemerArgs) {
        // debugger
        const t =
            new this.configuredContract.types.Redeemer.mintingCharterToken(
                treasury
            );

        return t._toUplcData();
    }

    @redeem
    mintingNamedToken() {
        const t =
            new this.configuredContract.types.Redeemer.mintingNamedToken();

        return t._toUplcData();
    }

    // t() {
    //     const t = Datum.inline(this.configuredContract.evalParam("seedTxn").data);
    //
    //     return t
    // }
    @partialTxn
    async txnAddCharterInit(
        tcx: StellarTxnContext,
        treasury: Address,
        tVal: valuesEntry
    ): Promise<StellarTxnContext> {
        return tcx
            .mintTokens(
                this.mintingPolicyHash!,
                [tVal],
                this.mintingCharterToken({ treasury })
            )
            .attachScript(this.compiledContract);
    }

    async txnMintingNamedToken(
        tcx: StellarTxnContext,
        charterToken: CharterTokenUTxO,
        tokenName: string,
        count: bigint,
    ): Promise<StellarTxnContext>

    async txnMintingNamedToken(
        tcx: StellarTxnContext,
        charterToken: CharterTokenUTxO,
        tokenNamesAndCounts: tokenNamesOrValuesEntry[]
    ): Promise<StellarTxnContext>

    @partialTxn
    async txnMintingNamedToken(
        tcx: StellarTxnContext,
        charterToken: CharterTokenUTxO,
        tokenNameOrPairs: string | tokenNamesOrValuesEntry[],
        count?: bigint,
    ): Promise<StellarTxnContext> {
        let namesAndCounts : tokenNamesOrValuesEntry[];
        if (!Array.isArray(tokenNameOrPairs)) {
            const tokenName = tokenNameOrPairs;            
            if (!count) throw new Error(`missing required 'count' arg when using 'tokenName:string' overload`)

            namesAndCounts = [ [tokenName, count] ]
        } else {
            namesAndCounts =  tokenNameOrPairs;
        }
        let values : valuesEntry[] = namesAndCounts.map(([name, count]) => {
            if (Array.isArray(name)) return [name, count] as valuesEntry;
            return this.mkValuesEntry(name, count)
        })
        return tcx
            .mintTokens(
                this.mintingPolicyHash!,
                values,
                this.mintingNamedToken()
            )
            .attachScript(this.compiledContract);
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
