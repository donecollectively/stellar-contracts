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

    /**
     * Mints initial charter token for a Capo contract
     * @remarks
     * 
     * This is the fundamental bootstrapping event for a Capo.
     * @param ownerInfo - contains the {owner} address of the Capo contract
     * @public
     **/
    @Activity.redeemer
    activityMintingCharter(ownerInfo: MintCharterActivityArgs): isActivity {
        const {owner} = ownerInfo
        const {mintingCharter} =this.onChainActivitiesType;
        const { DelegateDetails: hlDelegateDetails } = this.onChainTypes;
        const t = new mintingCharter(owner);

        return { redeemer: t._toUplcData() };
    }

    /**
     * Mints any tokens on sole authority of the Capo contract's minting delegage
     * @remarks
     * 
     * The Capo's minting delegate takes on the responsibility of validating a mint.
     * It can validate mintingUuts, burningUuts and any application-specific use-cases 
     * for minting and/or burning tokens from the policy.
     * @public
     **/
    @Activity.redeemer
    activityMintWithDelegateAuthorizing(): isActivity {
        const {
            mintWithDelegateAuthorizing,
        } = this.onChainActivitiesType;
        const t = new mintWithDelegateAuthorizing();

        return { redeemer: t._toUplcData() };
    }

    /**
     * @deprecated
     **/
    @Activity.redeemer
    activityMintingUuts({
        seedTxn,
        seedIndex: sIdx,
        purposes,
    }: MintUutActivityArgs): isActivity {
        throw new Error(`minter:mintingUuts obsolete; use minter:MintWithDelegateAuthorizing with delegate:mintingUuts or another application-specific activity`);
        // const seedIndex = BigInt(sIdx);
        // console.log("UUT redeemer seedTxn", seedTxn.hex);
        // const {mintingUuts} = this.onChainActivitiesType;
        // const t = new mintingUuts(
        //     seedTxn,
        //     seedIndex,
        //     purposes
        // );

        // return { redeemer: t._toUplcData() };
    }

    /**
     * @deprecated
     **/
    @Activity.redeemer
    activityBurningUuts(...uutNames: string[]) : isActivity {
        throw new Error(`minter:burningUuts obsolete; use minter:MintWithDelegateAuthorizing with delegate:burningUuts or another application-specific activity`)
        // const {burningUuts} =this.onChainActivitiesType;
        // const { DelegateDetails: hlDelegateDetails } = this.onChainTypes;
        // const t = new burningUuts(uutNames);

        // return { redeemer: t._toUplcData() };
    }

    @partialTxn
    async txnBurnUuts<
        existingTcx extends StellarTxnContext<any>
    >(
        initialTcx: existingTcx,
        uutNames: UutName[],
    ): Promise<existingTcx> {
        const tokenNames = uutNames.map(un => un.name)
        const tcx2 = initialTcx.attachScript(this.compiledScript).mintTokens(
            this.mintingPolicyHash!, 
            tokenNames.map((tokenName) => mkValuesEntry(tokenName, BigInt(-1))),
            this.activityBurningUuts(...tokenNames).redeemer
        );

        return tcx2 as existingTcx & typeof tcx2;
    }

    //! overrides base getter type with undefined not being allowed
    get mintingPolicyHash(): MintingPolicyHash {
        return super.mintingPolicyHash!;
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

    @Activity.partialTxn
    async txnMintWithDelegateAuthorizing<TCX extends StellarTxnContext>(
        tcx: TCX,
        vEntries: valuesEntry[],
    ): Promise<TCX> {

        return tcx.attachScript(this.compiledScript).mintTokens(
            this.mintingPolicyHash!,
            vEntries,
            this.activityMintWithDelegateAuthorizing().redeemer
        ) as TCX;
    }


}
