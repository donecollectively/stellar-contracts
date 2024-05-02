import {
    Address,
    Value,
    MintingPolicyHash,
    Assets,
    Crypto,
    TxInput,
    bytesToHex,
    HInt,
    ByteArray,
    //@ts-expect-error
    Option,
} from "@hyperionbt/helios";
import {
    Activity,
    StellarContract,
    partialTxn,
    txn,
} from "../StellarContract.js";
import type {
    configBase,
    hasSeed,
    isActivity,
} from "../StellarContract.js";

//@ts-expect-error - typescript doesn't grok Helios
import contract from "./CapoMinter.hl";
export const MinterContract = contract;
//@ts-expect-error
import StellarHeliosHelpers from "../StellarHeliosHelpers.hl";

import { CapoMintHelpers } from "../CapoMintHelpers.js";

import {
    StellarTxnContext,
    emptyUuts,
    type anyState,
    type hasSeedUtxo,
} from "../StellarTxnContext.js";
import type {
    MintUutActivityArgs,
    MinterBaseMethods,
    hasUutContext,
    uutPurposeMap,
} from "../Capo.js";
import type { SeedTxnScriptParams } from "../SeedTxnScriptParams.js";
import type { valuesEntry } from "../HeliosPromotedTypes.js";
import { CapoDelegateHelpers } from "../delegation/CapoDelegateHelpers.js";
import { UutName } from "../delegation/UutName.js";

import type { HeliosModuleSrc } from "../HeliosModuleSrc.js";
import { mkUutValuesEntries, mkValuesEntry, stringToNumberArray } from "../utils.js";
import { dumpAny } from "../diagnostics.js";

import type { DefaultCapo } from "../DefaultCapo.js";
import type { BasicMintDelegate } from "./BasicMintDelegate.js";

type MintCharterActivityArgs<T = {}> = T & {
    owner: Address;
};

export type BasicMinterParams = configBase & SeedTxnScriptParams & {
    capo: DefaultCapo<any, any,any>
    isDev: boolean
    devGen: bigint
}


/**
 * A basic minting validator serving a Capo's family of contract scripts
 * @remarks
 *
 * Mints charter tokens based on seed UTxOs.  Can also mint UUTs and
 * other tokens as approved by the Capo's minting delegate.
 * @public
 **/
export class CapoMinter
extends StellarContract<BasicMinterParams>
implements MinterBaseMethods
{
    currentRev: bigint = 1n;
    contractSource() {
        return contract;
    }
    getContractScriptParams(
        config: BasicMinterParams
    ): configBase & SeedTxnScriptParams {
        const {
            seedIndex,
            seedTxn,
            rev = this.currentRev,
            isDev,
            devGen,
        } = config;

        return {
            rev,
            seedIndex,
            seedTxn,
        };
    }

    get scriptActivitiesName() {
        return "MinterActivity";
    }

    importModules(): HeliosModuleSrc[] {
        //@ts-expect-error
        const { capo } = this.configIn || this.partialConfig;

        if (!capo)
            throw new Error(
                `missing capo in config or partial-config for ${this.constructor.name}`
            );

        return capo.importModules();
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
        const { owner } = ownerInfo;
        const mintingCharter = this.mustGetActivity("mintingCharter");
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
        const mintWithDelegateAuthorizing = this.mustGetActivity(
            "mintWithDelegateAuthorizing"
        );
        const t = new mintWithDelegateAuthorizing();

        return { redeemer: t._toUplcData() };
    }

    /**
     * Mints a new UUT specifically for a minting invariant
     * @remarks
     *
     * When adding a minting invariant, the Capo's existing mint delegate
     * doesn't get to be involved, as it could otherwise block a critical administrative
     * change needed.  The Capo's authority token is all the minter requires
     * to create the needed UUT.
     *
     * @param arg - either a transaction-context with seedUtxo, or {seedTxn, seedIndex}
     * @public
     **/
    @Activity.redeemer
    activityAddingMintInvariant(arg: hasSeed) : isActivity {
        const { txId, idx } = this.getSeed(arg);

        const addingMintInvariant = this.mustGetActivity("addingMintInvariant");
        const t = new addingMintInvariant(txId, idx);

        return { redeemer: t._toUplcData() };
    }

    /** Mints a new UUT specifically for a spending invariant
     * @remarks
     *
     * When adding a spending invariant, the Capo's existing mint delegate
     * is not consulted, as this administrative function works on a higher
     * level than the usual minting delegate's authority.
     *
     * @public
     * **/
    @Activity.redeemer
    activityAddingSpendInvariant(arg: hasSeed) : isActivity {
        const { txId, idx } = this.getSeed(arg);
        const addingSpendInvariant = this.mustGetActivity(
            "addingSpendInvariant"
        );
        const t = new addingSpendInvariant(txId, idx);

        return { redeemer: t._toUplcData() };
    }

    /**
     * Forces replacement of the Capo's mint delegate
     * @remarks
     *
     * Forces the minting of a new UUT to replace the Capo's mint delegate.
     *
     * @param ‹pName› - descr
     * @typeParam ‹pName› - descr (for generic types)
     * @public
     **/
    @Activity.redeemer
    activityForcingNewMintDelegate(arg: hasSeed) {
        console.warn(
            "NOTE: REPLACING THE MINT DELEGATE USING A DIRECT MINTER ACTIVITY\n" +
                "THIS IS NOT THE RECOMMENDED PATH - prefer using the existing mint delegate's ReplacingMe activity'"
        );
        const ReplacingMintDelegate = this.mustGetActivity(
            "ForcingNewMintDelegate"
        );
        const { txId, idx } = this.getSeed(arg);
        const t = new ReplacingMintDelegate(txId, idx);
        return { redeemer: t._toUplcData() };
    }

    /**
     * Forces replacement of the Capo's spend delegate
     * @remarks
     *
     * Creates a new UUT to replace the Capo's spend delegate.  The mint delegate
     * is bypassed in this operation.  There is always some existing spend delegate
     * when this is called, and it's normally burned in the process, when replacingUut is 
     * provided.  If replacingUut is not provided, the existing spend delegate is left in plac,e
     * although it won't be useful because the new spend delegate will have been installed.
     *
     * @param seed - either a transaction-context with seedUtxo, or {seedTxn, seedIndex}
     * @param replacingUut - the name of an exiting delegate being replaced
     * @public
     **/
    @Activity.redeemer
    activityCreatingNewSpendDelegate(seed: hasSeed, 
        replacingUut?: number[]
    ) : isActivity {
        const ReplacingSpendDelegate = this.mustGetActivity(
            "CreatingNewSpendDelegate"
        );
        const OptByteArray = Option(ByteArray);
        const { txId, idx } = this.getSeed(seed);
        const uutName = new OptByteArray(replacingUut);
        const t = new ReplacingSpendDelegate(
            txId, idx,
            uutName
        );
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
        throw new Error(
            `minter:mintingUuts obsolete; use minter:MintWithDelegateAuthorizing with delegate:mintingUuts or another application-specific activity`
        );
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
     * @deprecated - use minter:MintWithDelegateAuthorizing with delegate:burningUuts
     * or another application-specific activity
     **/
    @Activity.redeemer
    activityBurningUuts(...uutNames: string[]): isActivity {
        throw new Error(
            `minter:burningUuts obsolete; use minter:MintWithDelegateAuthorizing with delegate:burningUuts or another application-specific activity`
        );
        // const {burningUuts} =this.onChainActivitiesType;
        // const { DelegateDetails: hlDelegateDetails } = this.onChainTypes;
        // const t = new burningUuts(uutNames);

        // return { redeemer: t._toUplcData() };
    }

    @partialTxn
    async txnBurnUuts<existingTcx extends StellarTxnContext<any>>(
        initialTcx: existingTcx,
        uutNames: UutName[]
    ) {
        const tokenNames = uutNames.map((un) => un.name);
        const tcx2 = this.attachRefScript(
            initialTcx.mintTokens(
                this.mintingPolicyHash!,
                tokenNames.map((tokenName) =>
                    mkValuesEntry(tokenName, BigInt(-1))
                ),
                this.activityBurningUuts(...tokenNames).redeemer
            )
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
    async txnMintingCharter<TCX extends StellarTxnContext<anyState>>(
        tcx: TCX,
        {
            owner,
            capoGov,
            mintDelegate,
            spendDelegate,
            settingsUut,
        }: {
            owner: Address;
            capoGov: UutName;
            mintDelegate: UutName;
            spendDelegate: UutName;
            settingsUut: UutName;
        }
    ): Promise<TCX> {
        //!!! todo: can we expect capoGov & mintDgt in tcx.state.uuts? and update the type constraint here?
        //   ^^^ possibly based on role names instead of UUT names.
        const charterVE = this.charterTokenAsValuesEntry;
        const capoGovVE = mkValuesEntry(capoGov.name, BigInt(1));
        const mintDgtVE = mkValuesEntry(mintDelegate.name, BigInt(1));
        const spendDgtVE = mkValuesEntry(spendDelegate.name, BigInt(1));
        const settingsUutVE = mkValuesEntry(settingsUut.name, BigInt(1));

        // these are listed in the order they're expected to be found in the txn
        // even though the txn builder would take care of reordering them.
        //  a) shortest-first,
        //  b) then same-length items are sorted according to byte values.
        const values = [
            charterVE,
            settingsUutVE,
            capoGovVE,
            mintDgtVE,
            spendDgtVE,
        ];

        return this.attachRefScript(
            tcx.mintTokens(
                this.mintingPolicyHash!,
                values,
                this.activityMintingCharter({
                    owner,
                }).redeemer
            )
        );
        // as TCX;
    }
    attachRefScript(tcx) {
        return this.configIn!.capo.txnAttachScriptOrRefScript(
            tcx,
            this.compiledScript
        );
    }

    @Activity.partialTxn
    async txnMIntingWithoutDelegate<TCX extends StellarTxnContext>(
        tcx: TCX,
        vEntries: valuesEntry[],
        minterActivity: isActivity
    ): Promise<TCX> {
        return this.attachRefScript(
            tcx.mintTokens(
                this.mintingPolicyHash!,
                vEntries,
                minterActivity.redeemer
            )
        );
    }

    @Activity.partialTxn
    async txnMintWithDelegateAuthorizing<TCX extends StellarTxnContext>(
        tcx: TCX,
        vEntries: valuesEntry[],
        mintDelegate: BasicMintDelegate,
        mintDgtRedeemer: isActivity,
        skipReturningDelegate? : "skipDelegateReturn"
    ): Promise<TCX> {
        const { capo } = this.configIn!;
        const md = mintDelegate || (await capo.getMintDelegate());
        const tcx1 = await capo.txnAddCharterRef(tcx);
        const tcx2 = await md.txnGrantAuthority(
            tcx1,
            mintDgtRedeemer,
            skipReturningDelegate
        );

        return this.attachRefScript(
            tcx2.mintTokens(
                this.mintingPolicyHash!,
                vEntries,
                this.activityMintWithDelegateAuthorizing().redeemer
            )
        );
        //  as TCX;
    }
}
