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
    ByteArray,
    ByteArrayData,
} from "@hyperionbt/helios";
import {
    Activity,
    StellarContract,
    partialTxn,
    tokenNamesOrValuesEntry,
    valuesEntry,
} from "../lib/StellarContract.js";

//@ts-expect-error
import contract from "./DefaultMinter.hl";
import { StellarTxnContext } from "../lib/StellarTxnContext.js";
import {
    MintCharterRedeemerArgs,
    MintUUTRedeemerArgs,
    MinterBaseMethods,
} from "../lib/Capo.js";

export type SeedTxnParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};

export class DefaultMinter
    extends StellarContract<SeedTxnParams>
    implements MinterBaseMethods
{
    contractSource() {
        return contract;
    }

    @Activity.txnPartial
    async txnCreatingUUT(
        tcx: StellarTxnContext,
        uutPurpose: string
    ): Promise<Value> {
        //!!! make it big enough to serve minUtxo for the new UUT
        const uutSeed = this.mkValuePredicate(BigInt(42_000), tcx);

        return this.mustFindActorUtxo(
            `for-uut-${uutPurpose}`,
            uutSeed,
            tcx
        ).then(async (freeSeedUtxo) => {
            tcx.addInput(freeSeedUtxo);
            const { txId, utxoIdx } = freeSeedUtxo;
            const { encodeBech32, blake2b, encodeBase32 } = Crypto;

            const assetName = `${uutPurpose}.${encodeBase32(
                blake2b(txId.bytes.concat(["@".charCodeAt(0), utxoIdx]), 6)
            )}`;
            const vEntries = this.mkUUTValuesEntries(assetName);

            const { txId: seedTxn, utxoIdx: seedIndex } = freeSeedUtxo;

            tcx.attachScript(this.compiledContract).mintTokens(
                this.mintingPolicyHash!,
                vEntries,
                this.mintingUUT({
                    seedTxn,
                    seedIndex,
                    assetName,
                })
            );

            const v = new Value(
                undefined,
                new Assets([[this.mintingPolicyHash!, vEntries]])
            );

            return v;
        });
    }
    mkUUTValuesEntries(assetName) {
        return [this.mkValuesEntry(assetName, BigInt(1))];
    }

    //! overrides base getter type with undefined not being allowed
    get mintingPolicyHash(): MintingPolicyHash {
        return super.mintingPolicyHash!;
    }

    @Activity.redeemer
    protected mintingCharterToken({ owner }: MintCharterRedeemerArgs) {
        // debugger
        const t =
            new this.configuredContract.types.Redeemer.mintingCharterToken(
                owner
            );

        return t._toUplcData();
    }

    @Activity.redeemer
    protected mintingUUT({
        seedTxn,
        seedIndex: sIdx,
        assetName,
    }: MintUUTRedeemerArgs) {
        // debugger
        const seedIndex = BigInt(sIdx);
        const t = new this.configuredContract.types.Redeemer.mintingUUT(
            seedTxn,
            seedIndex,
            ByteArrayData.fromString(assetName).bytes
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
        return v;
    }

    @Activity.partialTxn
    async txnMintingCharterToken(
        tcx: StellarTxnContext,
        owner: Address
    ): Promise<StellarTxnContext> {
        const tVal = this.charterTokenAsValuesEntry;

        return tcx
            .mintTokens(
                this.mintingPolicyHash!,
                [tVal],
                this.mintingCharterToken({ owner })
            )
            .attachScript(this.compiledContract);
    }
}
