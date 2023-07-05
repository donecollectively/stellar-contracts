import { Program, Datum, TxId, TxOutputId, Address } from "@hyperionbt/helios";
import {
    StellarContract,
    partialTxn,
    redeem,
    tokenNamesOrValuesEntry,
    valuesEntry,
} from "../lib/StellarContract.js";

//@ts-expect-error
import contract from "./DefaultMinter.hl";
import { StellarTxnContext } from "../lib/StellarTxnContext.js";

export type SeedTxnParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};

export type MintCharterRedeemerArgs = {
    treasury: Address;
};
export type MintUUTRedeemerArgs = {
    seedTxn: TxId;
    seedIndex: bigint | number;
};

export class DefaultMinter extends StellarContract<SeedTxnParams> {
    contractSource() {
        return contract;
    }

    @redeem
    mintingCharterToken({ treasury }: MintCharterRedeemerArgs) {
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
        tokenName: string,
        count: bigint,
    ): Promise<StellarTxnContext>

    async txnMintingNamedToken(
        tcx: StellarTxnContext,
        tokenNamesAndCounts: tokenNamesOrValuesEntry[]
    ): Promise<StellarTxnContext>

    @partialTxn
    async txnMintingNamedToken(
        tcx: StellarTxnContext,
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
}
