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
} from "./StellarContract.js";

//@ts-expect-error
import contract from "./DefaultMinter.hl";
import { CapoMintHelpers } from "./CapoMintHelpers.js";

import { StellarTxnContext } from "./StellarTxnContext.js";
import {
    MintCharterRedeemerArgs,
    MintUutRedeemerArgs,
    MinterBaseMethods,
    hasAllUuts,
    hasSomeUuts,
    hasUutContext,
    uutPurposeMap,
} from "../lib/Capo.js";
import { SeedTxnParams } from "./SeedTxn.js";
import { valuesEntry } from "./HeliosPromotedTypes.js";
import { StellarHeliosHelpers } from "./StellarHeliosHelpers.js";
import { CapoDelegateHelpers } from "./delegation/CapoDelegateHelpers.js";
import { RelativeDelegateLink, UutName } from "./delegation/RolesAndDelegates.js";
import { HeliosModuleSrc } from "./HeliosModuleSrc.js";

export class DefaultMinter
    extends StellarContract<SeedTxnParams>
    implements MinterBaseMethods
{
    contractSource() {
        return contract;
    }
    
    importModules(): HeliosModuleSrc[] {
        return [ 
            StellarHeliosHelpers, 
            CapoDelegateHelpers,
            CapoMintHelpers 
        ]
    }

    @Activity.partialTxn
    async txnCreatingUuts<UutMapType extends uutPurposeMap>(
        tcx: StellarTxnContext<any>,
        uutPurposes: (string & keyof UutMapType)[],
        seedUtxo?: TxInput
    ): Promise<hasUutContext<UutMapType>> {
        const gettingSeed = seedUtxo ? Promise.resolve<TxInput>(seedUtxo) :
        new Promise<TxInput>(res => {
            //!!! make it big enough to serve minUtxo for the new UUT
            const uutSeed = this.mkValuePredicate(BigInt(42_000), tcx);
            this.mustFindActorUtxo(
                `for-uut-${uutPurposes.join("+")}`,
                uutSeed,
                tcx
            ).then(res)
        });

        return gettingSeed.then(async (seedUtxo) => {
            tcx.addInput(seedUtxo);
            const { txId, utxoIdx } = seedUtxo.outputId;

            const { encodeBech32, blake2b, encodeBase32 } = Crypto;

            const uutMap: UutMapType = Object.fromEntries(
                uutPurposes.map((uutPurpose) => {
                    const txoId = txId.bytes.concat([
                        "@".charCodeAt(0),
                        utxoIdx,
                    ]);
                    // console.warn("txId " + txId.hex)
                    // console.warn("&&&&&&&& txoId", bytesToHex(txoId));
                    const uutName = new UutName(`${uutPurpose}.${bytesToHex(
                        blake2b(txoId).slice(0, 6)
                    )}`)
                    return [
                        uutPurpose,
                        uutName,
                    ];
                })
            ) as UutMapType;

            if (tcx.state.uuts) throw new Error(`uuts are already there`);
            tcx.state.uuts = uutMap;

            const vEntries = this.mkUutValuesEntries(uutMap);

            const { txId: seedTxn, utxoIdx: seedIndex } = seedUtxo.outputId;

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
        return Object.entries(uutMap).map(([_purpose, uut]) => {
            return this.mkValuesEntry(uut.name, BigInt(1));
        });
    }

    //! overrides base getter type with undefined not being allowed
    get mintingPolicyHash(): MintingPolicyHash {
        return super.mintingPolicyHash!;
    }

    @Activity.redeemer
    protected mintingCharter({
        owner,
        govAuthorityLink
    }: MintCharterRedeemerArgs): isActivity {
        // debugger

        const { DelegateDetails: hlDelegateDetails, Redeemer } = this.configuredContract.types;

        const {uut, strategyName, reqdAddress, addressesHint } = govAuthorityLink
        const delegateDetails = hlDelegateDetails(
            uut, strategyName, reqdAddress, addressesHint
        );
        const t =
            new Redeemer.mintingCharter(
                owner,
                delegateDetails
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
            undefined,
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
    async txnMintingCharter(
        tcx: StellarTxnContext,
        { owner, govAuthorityLink } : {
            owner: Address, 
            govAuthorityLink: RelativeDelegateLink
        }
    ): Promise<StellarTxnContext> {
        const tVal = this.charterTokenAsValuesEntry;

        return tcx
            .mintTokens(
                this.mintingPolicyHash!,
                [tVal],
                this.mintingCharter({ 
                    owner, govAuthorityLink
                 }).redeemer
            )
            .attachScript(this.compiledContract);
    }
}
