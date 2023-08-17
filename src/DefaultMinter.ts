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
    TxInput,
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
import { CapoMintHelpers } from "./CapoMintHelpers.js";

import { StellarTxnContext } from "../lib/StellarTxnContext.js";
import {
    MintCharterRedeemerArgs,
    MintUutRedeemerArgs,
    MinterBaseMethods,
    SeedTxnParams,
    hasAllUuts,
    hasSomeUuts,
    hasUutContext,
    uutPurposeMap,
} from "../lib/Capo.js";
import { valuesEntry } from "../lib/HeliosPromotedTypes.js";

export class DefaultMinter
    extends StellarContract<SeedTxnParams>
    implements MinterBaseMethods
{
    contractSource() {
        return contract;
    }

    capoMinterHelpers(): string {
        return CapoMintHelpers;
    }
    
    importModules(): string[] {
        return [this.capoMinterHelpers()];
    }

    @Activity.partialTxn
    async txnCreatingUuts<UutMapType extends uutPurposeMap>(
        tcx: StellarTxnContext<any>,
        uutPurposes: (string & keyof UutMapType)[]
    ): Promise<hasUutContext<UutMapType>> {
        //!!! make it big enough to serve minUtxo for the new UUT
        const uutSeed = this.mkValuePredicate(BigInt(42_000), tcx);
        return this.mustFindActorUtxo(
            `for-uut-${uutPurposes.join("+")}`,
            uutSeed,
            tcx
        ).then(async (freeSeedUtxo) => {
            tcx.addInput(freeSeedUtxo);
            const { txId, utxoIdx } = freeSeedUtxo.outputId;

            const { encodeBech32, blake2b, encodeBase32 } = Crypto;

            const uutMap: UutMapType = Object.fromEntries(
                uutPurposes.map((uutPurpose) => {
                    const txoId = txId.bytes.concat([
                        "@".charCodeAt(0),
                        utxoIdx,
                    ]);
                    // console.warn("txId " + txId.hex)
                    // console.warn("&&&&&&&& txoId", bytesToHex(txoId));
                    return [
                        uutPurpose,
                        `${uutPurpose}.${bytesToHex(
                            blake2b(txoId).slice(0, 6)
                        )}`,
                    ];
                })
            ) as UutMapType;

            if (tcx.state.uuts) throw new Error(`uuts are already there`);
            tcx.state.uuts = uutMap;

            const vEntries = this.mkUutValuesEntries(uutMap);

            const { txId: seedTxn, utxoIdx: seedIndex } = freeSeedUtxo.outputId;

            return tcx.attachScript(this.compiledContract).mintTokens(
                this.mintingPolicyHash!,
                vEntries,
                this.mintingUuts({
                    seedTxn,
                    seedIndex,
                    purposes: uutPurposes,
                }).redeemer
            );

            return tcx;
        });
    }

    mkUutValuesEntries<UM extends uutPurposeMap>(uutMap: UM): valuesEntry[] {
        return Object.entries(uutMap).map(([_purpose, assetName]) => {
            return this.mkValuesEntry(assetName, BigInt(1));
        });
    }

    //! overrides base getter type with undefined not being allowed
    get mintingPolicyHash(): MintingPolicyHash {
        return super.mintingPolicyHash!;
    }

    @Activity.redeemer
    protected mintingCharterToken({
        owner,
    }: MintCharterRedeemerArgs): isActivity {
        // debugger
        const t =
            new this.configuredContract.types.Redeemer.mintingCharterToken(
                owner
            );

        return { redeemer: t._toUplcData() };
    }

    @Activity.redeemer
    protected mintingUuts({
        seedTxn,
        seedIndex: sIdx,
        purposes,
    }: MintUutRedeemerArgs): isActivity {
        // debugger
        const seedIndex = BigInt(sIdx);
        console.log("UUT redeemer seedTxn", seedTxn.hex);
        const t = new this.configuredContract.types.Redeemer.mintingUuts(
            seedTxn,
            seedIndex,
            purposes
        );

        return { redeemer: t._toUplcData() };
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
        console.warn(
            "deprecated use of `get minter.charterTokenAsValue`; use tvCharter() instead"
        );
        return this.tvCharter();
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
