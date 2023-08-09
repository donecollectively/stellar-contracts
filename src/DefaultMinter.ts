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
    bytesToHex,
} from "@hyperionbt/helios";
import {
    Activity,
    StellarContract,
    isActivity,
    partialTxn,
} from "../lib/StellarContract.js";

//@ts-expect-error
import contract from "./DefaultMinter.hl";
import {CapoMintHelpers} from "./CapoMintHelpers.js";

import { StellarTxnContext } from "../lib/StellarTxnContext.js";
import {
    MintCharterRedeemerArgs,
    MintUUTRedeemerArgs,
    MinterBaseMethods,
} from "../lib/Capo.js";
import { valuesEntry } from "../lib/HeliosPromotedTypes.js";

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
    capoMinterHelpers() : string{
        return CapoMintHelpers
    }
    importModules() : string[] {
        return [
            this.capoMinterHelpers()
        ]
    }

    @Activity.partialTxn
    async txnCreatingUUTs(
        tcx: StellarTxnContext,
        purposes: string[]
    ): Promise<Value> {
        //!!! make it big enough to serve minUtxo for the new UUT
        const uutSeed = this.mkValuePredicate(BigInt(42_000), tcx);

        return this.mustFindActorUtxo(
            `for-uut-${purposes.join("+")}`,
            uutSeed,
            tcx
        ).then(async (freeSeedUtxo) => {
            tcx.addInput(freeSeedUtxo);
            const { txId, utxoIdx } = freeSeedUtxo;
            const { encodeBech32, blake2b, encodeBase32 } = Crypto;

            const assetNames = purposes.map(uutPurpose => {
                const txoId = txId.bytes.concat(["@".charCodeAt(0), utxoIdx]);
                // console.warn("txId " + txId.hex)
                // console.warn("&&&&&&&& txoId", bytesToHex(txoId));
                return `${uutPurpose}.${
                    bytesToHex(blake2b(txoId).slice(0,6))
                }`;
            })

            const vEntries = this.mkUUTValuesEntries(assetNames);

            const { txId: seedTxn, utxoIdx: seedIndex } = freeSeedUtxo;

            tcx.attachScript(this.compiledContract).mintTokens(
                this.mintingPolicyHash!,
                vEntries,
                this.mintingUUT({
                    seedTxn,
                    seedIndex,
                    purposes,
                }).redeemer
            );

            const v = new Value(
                undefined,
                new Assets([[this.mintingPolicyHash!, vEntries]])
            );

            return v;
        });
    }

    mkUUTValuesEntries(assetNames : string[]) {
        return assetNames.map(assetName => {
            return this.mkValuesEntry(assetName, BigInt(1))
        })
    }

    //! overrides base getter type with undefined not being allowed
    get mintingPolicyHash(): MintingPolicyHash {
        return super.mintingPolicyHash!;
    }

    @Activity.redeemer
    protected mintingCharterToken({ owner }: MintCharterRedeemerArgs) : isActivity {
        // debugger
        const t =
            new this.configuredContract.types.Redeemer.mintingCharterToken(
                owner
            );

        return { redeemer: t._toUplcData() }
    }

    @Activity.redeemer
    protected mintingUUT({
        seedTxn,
        seedIndex: sIdx,
        purposes,
    }: MintUUTRedeemerArgs)  : isActivity {
        // debugger
        const seedIndex = BigInt(sIdx);
        console.log("UUT redeemer seedTxn", seedTxn.hex);
        const t = new this.configuredContract.types.Redeemer.mintingUUTs(
            seedTxn,
            seedIndex,
            purposes
        );

        return { redeemer: t._toUplcData() }
    }

    get charterTokenAsValuesEntry(): valuesEntry {
        return this.mkValuesEntry("charter", BigInt(1));
    }

    tvCharter() {
        const { mintingPolicyHash } = this;

        const v = new Value(
            this.ADA(1.7),
            new Assets([[mintingPolicyHash, [this.charterTokenAsValuesEntry]]])
        );
        return v;
    }

    get charterTokenAsValue() {
        console.warn("deprecated use of `get minter.charterTokenAsValue`; use tvCharter() instead")
        return this.tvCharter()
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
                this.mintingCharterToken({ owner }).redeemer
            )
            .attachScript(this.compiledContract);
    }
}
