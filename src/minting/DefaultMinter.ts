import {
    Address,
    Value,
    MintingPolicyHash,
    Assets,
    Crypto,
    TxInput,
    bytesToHex,
    HInt,
} from "@hyperionbt/helios";
import {
    Activity,
    StellarContract,
    partialTxn,
    txn,
} from "../StellarContract.js";
import type {
    configBase,
    isActivity,
} from "../StellarContract.js";

//@ts-expect-error
import contract from "./DefaultMinter.hl";
export const MinterContract = contract

//@ts-expect-error
import StellarHeliosHelpers from "../StellarHeliosHelpers.hl";

import { CapoMintHelpers } from "../CapoMintHelpers.js";

import { StellarTxnContext, emptyUuts } from "../StellarTxnContext.js";
import type {
    MintUutActivityArgs,
    MinterBaseMethods,
    hasUutContext,
    uutPurposeMap,
} from "../Capo.js";
import type { SeedTxnParams } from "../SeedTxn.js";
import type { valuesEntry } from "../HeliosPromotedTypes.js";
import { CapoDelegateHelpers } from "../delegation/CapoDelegateHelpers.js";
import { UutName } from "../delegation/UutName.js";

import type { HeliosModuleSrc } from "../HeliosModuleSrc.js";
import { mkUutValuesEntries, mkValuesEntry } from "../utils.js";
import { dumpAny } from "../diagnostics.js";
import type { DefaultCapo } from "../DefaultCapo.js";

type MintCharterActivityArgs<T = {}> = T & {
    owner: Address;
};

export type BasicMinterParams = SeedTxnParams & {
    capo: DefaultCapo<any, any,any>
}

/**
 * A basic minting validator serving a Capo's family of contract scripts
 * @remarks
 * 
 * Mints charter tokens based on seed UTxOs.  Can also mint UUTs and 
 * other tokens as approved by the Capo's minting delegate.
* @public
 **/
export class DefaultMinter
    extends StellarContract<BasicMinterParams>
    implements MinterBaseMethods
{
    contractSource() {
        return contract;
    }
    getContractScriptParams(config: BasicMinterParams): configBase & SeedTxnParams {
        const {seedIndex, seedTxn} = config

        return { seedIndex, seedTxn }
    }

    importModules(): HeliosModuleSrc[] {
        return [
            //prettier-ignore
            StellarHeliosHelpers,
            CapoDelegateHelpers,
            CapoMintHelpers,
            this.configIn!.capo.specializedCapo,
            this.configIn!.capo.capoHelpers,
        ];
    }


    //!!! todo: fold args 2 & 4, allowing either array or map but not both.
    @partialTxn
    async txnWillMintUuts<
        const purposes extends string,
        existingTcx extends StellarTxnContext,
        const RM extends Record<ROLES,purposes>,
        const ROLES extends string & keyof RM = string & keyof RM
    >(
        tcx: existingTcx,
        uutPurposes: purposes[],
        seedUtxo: TxInput,
        //@ts-expect-error
        roles: RM = {} as Record<string, purposes>,
    ): Promise<
        hasUutContext<ROLES | purposes> & existingTcx 
    > {
        const { txId, utxoIdx } = seedUtxo.outputId;

        const { blake2b } = Crypto;

        const uutMap: uutPurposeMap<ROLES | purposes> = Object.fromEntries(
            uutPurposes.map((uutPurpose) => {
                const idx = new HInt(utxoIdx).toCbor()
                const txoId = txId.bytes.concat(["@".charCodeAt(0)], idx);
                // console.warn("&&&&&&&& txoId", bytesToHex(txoId));
                const uutName = new UutName(
                    uutPurpose,
                    `${uutPurpose}-${bytesToHex(blake2b(txoId).slice(0, 6))}`
                );
                return [uutPurpose, uutName];
            })
        ) as uutPurposeMap<ROLES | purposes>;
        for (const [role, uutPurpose] of Object.entries(roles)) {
            uutMap[role] = uutMap[uutPurpose as string];
        }
        
        if (!tcx.state) tcx.state = {uuts: {}};
        tcx.state.uuts = {
            ...(tcx.state.uuts),
            ...(uutMap)
        };

        return tcx as hasUutContext<ROLES | purposes> & existingTcx 
    }

    @txn
    async mkTxnMintingUuts<
        const purposes extends string,
        existingTcx extends StellarTxnContext,
        const RM extends Record<ROLES, purposes>,
        const ROLES extends keyof RM & string = string & keyof RM,
    >(
        initialTcx: existingTcx,
        uutPurposes: purposes[],
        seedUtxo?: TxInput,
        //@ts-expect-error
        roles: RM = {} as Record<string, purposes>,
    ): Promise<hasUutContext<ROLES | purposes> & existingTcx> {
        const gettingSeed = seedUtxo
            ? Promise.resolve<TxInput>(seedUtxo)
            : new Promise<TxInput>((res) => {
                  //!!! make it big enough to serve minUtxo for the new UUT(s)
                  const uutSeed = this.mkValuePredicate(
                      BigInt(42_000),
                      initialTcx
                  );

                  this.mustFindActorUtxo(
                      `seed-for-uut ${uutPurposes.join("+")}`,
                      uutSeed,
                      initialTcx
                  ).then(res);
              });

        return gettingSeed.then(async (seedUtxo) => {
            const tcx = await this.txnWillMintUuts(
                initialTcx,
                uutPurposes,
                seedUtxo,
                roles,
            );
            const vEntries = mkUutValuesEntries(tcx.state.uuts);

            tcx.addInput(seedUtxo);
            const { txId: seedTxn, utxoIdx: seedIndex } = seedUtxo.outputId;
            tcx.attachScript(this.compiledScript).mintTokens(
                this.mintingPolicyHash!,
                vEntries,
                this.activityMintingUuts({
                    seedTxn,
                    seedIndex,
                    purposes: uutPurposes,
                }).redeemer
            );

            return tcx;
        });
    }

    //! overrides base getter type with undefined not being allowed
    get mintingPolicyHash(): MintingPolicyHash {
        return super.mintingPolicyHash!;
    }

    @Activity.redeemer
    @Activity.redeemer
    activityMintingCharter({ owner }: MintCharterActivityArgs): isActivity {
        const {mintingCharter} =this.onChainActivitiesType;
        const { DelegateDetails: hlDelegateDetails } = this.onChainTypes;
        const t = new mintingCharter(owner);

        return { redeemer: t._toUplcData() };
    }


    @Activity.redeemer
    activityMintingUuts({
        seedTxn,
        seedIndex: sIdx,
        purposes,
    }: MintUutActivityArgs): isActivity {
        // debugger
        const seedIndex = BigInt(sIdx);
        console.log("UUT redeemer seedTxn", seedTxn.hex);
        const {mintingUuts} = this.onChainActivitiesType;
        const t = new mintingUuts(
            seedTxn,
            seedIndex,
            purposes
        );

        return { redeemer: t._toUplcData() };
    }

    get charterTokenAsValuesEntry(): valuesEntry {
        return mkValuesEntry("charter", BigInt(1));
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
    async txnMintingCharter<TCX extends StellarTxnContext>(
        tcx: TCX,
        {
            owner,
            capoGov,
            mintDgt,
        }: {
            owner: Address;
            capoGov: UutName;
            mintDgt: UutName;
        }
    ): Promise<TCX> {
        //!!! todo: can we expect capoGov & mintDgt in tcx.state.uuts? and update the type constraint here?

        const charterVE = this.charterTokenAsValuesEntry;
        const capoGovVE = mkValuesEntry(capoGov.name, BigInt(1));
        const mintDgtVE = mkValuesEntry(mintDgt.name, BigInt(1));

        return tcx
            .mintTokens(
                this.mintingPolicyHash!,
                [
                    charterVE, 
                    capoGovVE,
                    mintDgtVE
                ],
                this.activityMintingCharter({
                    owner,
                }).redeemer
            )
            .attachScript(this.compiledScript) as TCX;
    }
}
