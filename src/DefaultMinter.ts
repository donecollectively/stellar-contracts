import {
    Program,
    Datum,
    TxId,
    TxOutputId,
    Address,
    Value,
    TxOutput,
    MintingPolicyHash,
    Assets,
} from "@hyperionbt/helios";
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
import { MinterBaseMethods } from "../lib/Capo.js";

export type SeedTxnParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};

export type MintCharterRedeemerArgs = {
    owner: Address;
};
export type MintUUTRedeemerArgs = {
    seedTxn: TxId;
    seedIndex: bigint | number;
};

export class DefaultMinter 
extends StellarContract<SeedTxnParams> 
implements MinterBaseMethods {
    contractSource() {
        return contract;
    }

    async txnCreateUUT(tcx: StellarTxnContext, l: string): Promise<Value> {
        const isEnough = this.mkTokenPredicate(
            new Value({
                lovelace: 42000,
            })
        );

        return this.mustFindActorUtxo(`for-uut-${l}`, isEnough, tcx).then(
            async (freeUtxo) => {
                const vEnt = this.mkValuesEntry(l, BigInt(1));
                tcx.addInput(freeUtxo);

                const {
                    txId: seedTxn,
                    utxoIdx: seedIndex
                } = freeUtxo;

                tcx.mintTokens(
                    this.mintingPolicyHash!,
                    [vEnt],
                    this.mintingUUT({ seedTxn, seedIndex })
                );
                
                const v =  new Value(undefined, new Assets([ 
                    [ this.mintingPolicyHash!, [vEnt]  ]
                ]))

                return v;
            }
        );
    }

    get mintingPolicyHash(): MintingPolicyHash {
        return super.mintingPolicyHash!;
    }

    @redeem
    mintingCharterToken({ owner }: MintCharterRedeemerArgs) {
        // debugger
        const t =
            new this.configuredContract.types.Redeemer.mintingCharterToken(
                owner
            );

        return t._toUplcData();
    }

    @redeem
    mintingUUT({ seedTxn, seedIndex: sIdx }: MintUUTRedeemerArgs) {
        // debugger
        const seedIndex = BigInt(sIdx)
        const t = new this.configuredContract.types.Redeemer.mintingUUT(
            seedTxn,
            seedIndex
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
        owner: Address,
        tVal: valuesEntry
    ): Promise<StellarTxnContext> {
        return tcx
            .mintTokens(
                this.mintingPolicyHash!,
                [tVal],
                this.mintingCharterToken({ owner  })
            )
            .attachScript(this.compiledContract);
    }

    async txnMintingNamedToken(
        tcx: StellarTxnContext,
        tokenName: string,
        count: bigint
    ): Promise<StellarTxnContext>;

    async txnMintingNamedToken(
        tcx: StellarTxnContext,
        tokenNamesAndCounts: tokenNamesOrValuesEntry[]
    ): Promise<StellarTxnContext>;

    @partialTxn
    async txnMintingNamedToken(
        tcx: StellarTxnContext,
        tokenNameOrPairs: string | tokenNamesOrValuesEntry[],
        count?: bigint
    ): Promise<StellarTxnContext> {
        let namesAndCounts: tokenNamesOrValuesEntry[];
        if (!Array.isArray(tokenNameOrPairs)) {
            const tokenName = tokenNameOrPairs;
            if (!count)
                throw new Error(
                    `missing required 'count' arg when using 'tokenName:string' overload`
                );

            namesAndCounts = [[tokenName, count]];
        } else {
            namesAndCounts = tokenNameOrPairs;
        }
        let values: valuesEntry[] = namesAndCounts.map(([name, count]) => {
            if (Array.isArray(name)) return [name, count] as valuesEntry;
            return this.mkValuesEntry(name, count);
        });
        return tcx
            .mintTokens(
                this.mintingPolicyHash!,
                values,
                this.mintingNamedToken()
            )
            .attachScript(this.compiledContract);
    }
}
