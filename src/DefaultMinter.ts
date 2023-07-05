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
    Crypto,
    UTxO,
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
import { MintCharterRedeemerArgs, MintUUTRedeemerArgs, MinterBaseMethods } from "../lib/Capo.js";

export type SeedTxnParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};


export class DefaultMinter 
extends StellarContract<SeedTxnParams> 
implements MinterBaseMethods {
    contractSource() {
        return contract;
    }

    async txnCreateUUT(tcx: StellarTxnContext, uutPurpose: string): Promise<Value> {
        //!!! make it big enough to serve minUtxo for the new UUT
        const uutSeed = this.mkValuePredicate(BigInt(42_000), tcx);

        return this.mustFindActorUtxo(`for-uut-${uutPurpose}`, uutSeed, tcx).then(
            async (freeSeedUtxo) => {
                tcx.addInput(freeSeedUtxo);
                const {txId, utxoIdx} = freeSeedUtxo
                const {encodeBech32, blake2b} = Crypto;

                const assetName = encodeBech32(`${uutPurpose}.`, blake2b(txId.bytes.concat(
                    [ "@".charCodeAt(0), utxoIdx ]
                ),8))
                console.log("--------------", {assetName});
                await new Promise(res => {setTimeout(res, 1000)})
                debugger
                const vEnt = this.mkValuesEntry(uutPurpose, BigInt(1));

                const {
                    txId: seedTxn,
                    utxoIdx: seedIndex
                } = freeSeedUtxo;

                tcx.mintTokens(
                    this.mintingPolicyHash!,
                    [vEnt],
                    this.mintingUUT({ 
                        seedTxn, 
                        seedIndex,
                        assetName
                    })
                );
                
                const v =  new Value(undefined, new Assets([ 
                    [ this.mintingPolicyHash!, [vEnt]  ]
                ]))

                return v;
            }
        );
    }

    //! overrides base getter type with undefined not being allowed
    get mintingPolicyHash(): MintingPolicyHash {
        return super.mintingPolicyHash!;
    }

    @redeem
    protected mintingCharterToken({ owner }: MintCharterRedeemerArgs) {
        // debugger
        const t =
            new this.configuredContract.types.Redeemer.mintingCharterToken(
                owner
            );

        return t._toUplcData();
    }

    @redeem
    protected mintingUUT({ seedTxn, seedIndex: sIdx, assetName }: MintUUTRedeemerArgs) {
        // debugger
        const seedIndex = BigInt(sIdx)
        const t = new this.configuredContract.types.Redeemer.mintingUUT(
            seedTxn,
            seedIndex,
            assetName
        );

        return t._toUplcData();
    }

    get charterTokenAsValuesEntry(): valuesEntry {
        return this.mkValuesEntry("charter", BigInt(1));
    }

    get charterTokenAsValue() {
        const { mintingPolicyHash } = this;

        const v = new Value(
            this.ADA(1.7),
            new Assets([[mintingPolicyHash, [this.charterTokenAsValuesEntry]]])
        );
        return v
    }

    @partialTxn
    async txnAddCharterInit(
        tcx: StellarTxnContext,
        owner: Address,
    ): Promise<StellarTxnContext> {
        const tVal = this.charterTokenAsValuesEntry

        return tcx
            .mintTokens(
                this.mintingPolicyHash!,
                [tVal],
                this.mintingCharterToken({ owner  })
            )
            .attachScript(this.compiledContract);
    }

}
