import {
    Address,
    Value,
    MintingPolicyHash,
    Assets,
    Crypto,
    TxInput,
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
    MintUutRedeemerArgs,
    MinterBaseMethods,
    hasUutContext,
    uutPurposeMap,
} from "./Capo.js";
import { SeedTxnParams } from "./SeedTxn.js";
import { valuesEntry } from "./HeliosPromotedTypes.js";
import { StellarHeliosHelpers } from "./StellarHeliosHelpers.js";
import { CapoDelegateHelpers } from "./delegation/CapoDelegateHelpers.js";
import { RelativeDelegateLink, UutName } from "./delegation/RolesAndDelegates.js";
import { HeliosModuleSrc } from "./HeliosModuleSrc.js";

type MintCharterRedeemerArgs<T = {}> = T & {
    owner: Address;
};

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

    @partialTxn
    async txnWithUuts<
        const purposes extends string, 
        existingTcx extends StellarTxnContext<any>,
        const R extends string
    >(
        tcx: existingTcx,
        uutPurposes: purposes [],
        seedUtxo: TxInput,
        role: R,
    ): Promise<existingTcx & hasUutContext<purposes | ( R extends "" ? never : R )>> {
        const { txId, utxoIdx } = seedUtxo.outputId;

            const { blake2b } = Crypto;
            if (role && uutPurposes.length !== 1) throw new Error(`role uut must have exactly one purpose`)
            const uutMap: uutPurposeMap<purposes | R> = Object.fromEntries(
                uutPurposes.map((uutPurpose) => {
                    const txoId = txId.bytes.concat([
                        "@".charCodeAt(0),
                        utxoIdx,
                    ]);
                    // console.warn("&&&&&&&& txoId", bytesToHex(txoId));
                    const uutName = new UutName(uutPurpose, `${uutPurpose}-${bytesToHex(
                        blake2b(txoId).slice(0, 6)
                    )}`)
                    return [
                        uutPurpose,
                        uutName,
                    ];
                })
            ) as uutPurposeMap<purposes | R>
            if (role) uutMap[role] = uutMap[uutPurposes[0]]

            if (tcx.state.uuts) throw new Error(`uuts are already there`);
            tcx.state.uuts = uutMap;

            return tcx
    }

    @Activity.partialTxn
    async txnCreatingUuts<
        const purposes extends string,
        TCX extends StellarTxnContext<any>,
    >(
        initialTcx: TCX,
        uutPurposes: purposes[],
        seedUtxo?: TxInput
    ): Promise<TCX & hasUutContext<purposes>> {
        const gettingSeed = seedUtxo ? Promise.resolve<TxInput>(seedUtxo) :
        new Promise<TxInput>(res => {
            //!!! make it big enough to serve minUtxo for the new UUT(s)
            const uutSeed = this.mkValuePredicate(BigInt(42_000), initialTcx);
            this.mustFindActorUtxo(
                `for-uut-${uutPurposes.join("+")}`,
                uutSeed,
                initialTcx
            ).then(res)
        });

        return gettingSeed.then(async (seedUtxo) => {
            const tcx = await this.txnWithUuts(initialTcx, uutPurposes, seedUtxo, "");
            const vEntries = this.mkUutValuesEntries(tcx.state.uuts);

            tcx.addInput(seedUtxo);
            const { txId: seedTxn, utxoIdx: seedIndex } = seedUtxo.outputId;

            tcx.attachScript(this.compiledScript).mintTokens(
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

    mkUutValuesEntries<UM extends uutPurposeMap<any>>(uutMap: UM): valuesEntry[] {
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
    }: MintCharterRedeemerArgs): isActivity {
        const { DelegateDetails: hlDelegateDetails, Redeemer } = this.scriptProgram!.types;
        const t =
            new Redeemer.mintingCharter(
                owner,
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
        const t = new this.scriptProgram!.types.Redeemer.mintingUuts(
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
        { owner, authZor } : {
            authZor:  UutName,
            owner: Address, 
        }
    ): Promise<StellarTxnContext> {
        const charterVE = this.charterTokenAsValuesEntry;
        const authzVE = this.mkValuesEntry(authZor.name, BigInt(1));

        return tcx
            .mintTokens(
                this.mintingPolicyHash!,
                [charterVE, authzVE],
                this.mintingCharter({ 
                    owner
                 }).redeemer
            )
            .attachScript(this.compiledScript);
    }
}
