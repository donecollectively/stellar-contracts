import {
    Address,
    AssetClass,
    Datum,
    TxId,
    TxInput,
    TxOutput,
    Value,
} from "@hyperionbt/helios";

//@ts-expect-error because TS can't import non-ts content : /
import contract from "./BasicMintDelegate.hl";
//@ts-expect-error because TS can't import non-ts content : /
import StellarHeliosHelpers from "../StellarHeliosHelpers.hl";

import { Activity, datum } from "../StellarContract.js";
import type { configBase, isActivity } from "../StellarContract.js";
import {
    StellarTxnContext,
    type anyState,
    type hasAddlTxns,
    type hasSeedUtxo,
    type otherAddlTxnNames,
} from "../StellarTxnContext.js";
import type { capoDelegateConfig } from "../delegation/RolesAndDelegates.js";

import { StellarDelegate } from "../delegation/StellarDelegate.js";
import type { InlineDatum } from "../HeliosPromotedTypes.js";
import { CapoDelegateHelpers } from "../delegation/CapoDelegateHelpers.js";
import { CapoMintHelpers } from "../CapoMintHelpers.js";
import type { HeliosModuleSrc } from "../HeliosModuleSrc.js";
import { UnspecializedMintDelegate } from "./UnspecializedMintDelegate.js";
import { UnspecializedCapo } from "../UnspecializedCapo.js";
import { CapoHelpers } from "../CapoHelpers.js";
import type { MintUutActivityArgs, UutCreationAttrsWithSeed, hasUutContext } from "../Capo.js";

export type MintDelegateArgs = capoDelegateConfig & {
    rev: bigint;
};

//!!! TODO: include adapter(s) for Datum, which has the same essential shape
type MintDelegateDatumProps = {
    tokenName: string;
    maxMintSize: bigint;
};

/**
 * Serves a delegated minting-policy role for Capo contracts
 * @remarks
 *
 * shifts detailed minting policy out of the minter and into the delegate.
 * @public
 **/
export class BasicMintDelegate extends StellarDelegate<MintDelegateArgs> {
    static currentRev = 1n;

    static get defaultParams() {
        const params = {
            rev: this.currentRev,
            devGen: 0n,
        };
        return params;
    }

    getContractScriptParams(config) {
        const params = {
            rev: config.rev,
            isDev: false,
            devGen: 0n,
        };

        if ("development" === process.env.NODE_ENV) {
            params.isDev = true;
            if (!config.devGen) {
                throw new Error(
                    `Missing expected devGen in config for BasicMintDelegate`
                );
            }
            params.devGen = config.devGen;
        }
        return params;
    }

    contractSource() {
        return contract;
    }

    @datum
    mkDatumScriptReference() {
        const { ScriptReference: hlScriptReference } = this.onChainDatumType;

        // this is a simple enum tag, indicating the role of this utxo: holding the script
        // on-chain, so it can be used in later transactions without bloating those txns
        // every time.
        const t = new hlScriptReference();
        return Datum.inline(t._toUplcData());
    }

    /**
     * specializedMintDelegate module for customizing policies atop the basic mint delegate
     * @public
     * @remarks
     *
     * The basic mint delegate contains an "unspecialized" implementation of this customization,
     * which doesn't have any special restrictions.  It reserves a CustomConfig field
     * at position 2 in the IsDelegation datum, allowing customizations to use any
     * struct in that position to express any custom configurations.
     **/
    get specializedMintDelegate(): HeliosModuleSrc {
        return UnspecializedMintDelegate;
    }

    get specializedCapo(): HeliosModuleSrc {
        return UnspecializedCapo;
    }

    /**
     * Deprecated
     * @deprecated  - mint delegate should have specific activities for specific use-cases, starting at redeemer index 10
     * @internal
     **/
    @Activity.redeemer
    activityAuthorizing(): isActivity {
        throw new Error(
            `obsolete generic Authorizing activity invalid for mint delegates`
        );
    }

    // inherited from StellarDelegate.
    // @Activity.redeemer
    // activityReplacingMe({
    //     seedTxn,
    //     seedIndex: sIdx,
    //     purpose,
    // } :  Omit<MintUutActivityArgs, "purposes"> & {purpose?: string}) {
    //     const hlReplacingMe = this.mustGetActivity("ReplacingMe");
    //     const t = new hlReplacingMe(
    //         seedTxn, sIdx, purpose
    //     );
    //     return { redeemer: t._toUplcData() };
    // }

    @Activity.redeemer
    activityRetiringDelegate(): isActivity {
        const Retiring = this.mustGetActivity("Retiring");
        return { redeemer: new Retiring()._toUplcData() };
    }

    async txnGrantAuthority<TCX extends StellarTxnContext>(
        tcx: TCX,
        redeemer: isActivity,
        returnExistingDelegate : boolean = true
    ) {
        if (!redeemer)
            throw new Error(
                `mint delegate requires an explicit redeemer for txnGrantAuthority()`
            );

        const {capo} = this.configIn!;
        await capo.txnAttachScriptOrRefScript(tcx, this.compiledScript);

        return super.txnGrantAuthority(tcx, redeemer, returnExistingDelegate);
    }

    // NOTE: prefer application-specific activities that validate
    // particular mints, instead of this generic one
    @Activity.redeemer
    activityMintingUuts({
        seedTxn,
        seedIndex: sIdx,
        purposes,
    }: MintUutActivityArgs): isActivity {
        const seedIndex = BigInt(sIdx);
        console.log("----------- USING DEPRECATED mintingUuts ACTIVITY -----------"+
          "\n       (prefer application-specific mint-delegate activities instead)"
        );
        console.log("UUT redeemer seedTxn", seedTxn.hex);
        const mintingUuts = this.mustGetActivity("mintingUuts");
        const t = new mintingUuts(seedTxn, seedIndex, purposes);

        return { redeemer: t._toUplcData() };
    }

    // NOTE: prefer application-specific activities
    // @Activity.redeemer
    // activityBurningUuts(...uutNames: string[]) : isActivity {
    //     const {burningUuts} =this.onChainActivitiesType;
    //     const { DelegateDetails: hlDelegateDetails } = this.onChainTypes;
    //     const t = new burningUuts(uutNames);

    //     return { redeemer: t._toUplcData() };
    // }

    importModules(): HeliosModuleSrc[] {
        const specializedMintDelegate = this.specializedMintDelegate;
        if (specializedMintDelegate.moduleName !== "specializedMintDelegate") {
            throw new Error(
                `${this.constructor.name}: specializedMintDelegate() module name must be ` +
                    `'specializedMintDelegate', not '${specializedMintDelegate.moduleName}'\n  ... in ${specializedMintDelegate.srcFile}`
            );
        }

        return [
            // StellarHeliosHelpers,
            // CapoDelegateHelpers,
            // CapoHelpers,
            // CapoMintHelpers,
            specializedMintDelegate,
            ...this.configIn!.capo.importModules(),
            // this.specializedCapo,
        ];
    }

    get scriptDatumName() {
        return "MintDelegateDatum";
    }
    get scriptActivitiesName() {
        return "MintDelegateActivity";
    }

    /**
     * Adds a mint-delegate-specific authority token to the txn output
     * @remarks
     *
     * Implements {@link StellarDelegate.txnReceiveAuthorityToken | txnReceiveAuthorityToken() }.
     *
     * Uses {@link BasicMintDelegate.mkDelegationDatum | mkDelegationDatum()} to make the inline Datum for the output.
     * @see {@link StellarDelegate.txnReceiveAuthorityToken | baseline txnReceiveAuthorityToken()'s doc }
     * @public
     **/
    async txnReceiveAuthorityToken<TCX extends StellarTxnContext>(
        tcx: TCX,
        tokenValue: Value,
        fromFoundUtxo?: TxInput
    ): Promise<TCX> {
        console.log(
            `     ----- minting delegate validator receiving mintDgt token at ` +
                this.validatorHash!.hex
        );
        // const ffu = fromFoundUtxo;
        // const v : Value = ffu?.value || this.mkMinAssetValue(this.configIn!.uut);
        const datum = this.mkDelegationDatum(fromFoundUtxo);
        return tcx.addOutput(new TxOutput(this.address, tokenValue, datum));
    }

    /**
     * Depreciated: Add a generic minting-UUTs actvity to the transaction
     * @remarks
     *
     * This is a generic helper function that can be used to mint any UUTs,
     * but **only if the specialized minting delegate has not disabled generic UUT minting**.
     *
     * Generally, it's recommended to use an application-specific activity
     * that validates a particular minting use-case, instead of this generic one.
     *
     * See {@link Capo.txnMintingUuts | Capo.txnMintingUuts() } for further guidance.
     *
     * @param tcx - the transaction context
     * @param uutPurposes - a list of string prefixes for the UUTs
     * @typeParam TCX - for the `tcx`, which must already include the indicated `uutPurposes`
     * @public
     **/
    txnGenericMintingUuts<
        TCX extends hasSeedUtxo & hasUutContext<purposes>,
        purposes extends string
    >(
        tcx: TCX,
        uutPurposes: purposes[],
        activity?: isActivity
        // seedUtxo: TxInput,
    ) {
        let useActivity =
            activity ||
            this.activityMintingUuts({
                purposes: uutPurposes,
                ...tcx.getSeedAttrs(),
            });

        return this.txnGrantAuthority(tcx, useActivity);
    }

    mkDelegationDatum(txin?: TxInput) {
        if (txin) return txin.origOutput.datum!;
        const { capoAddr, mph, tn, ..._otherCfgSettings } = this.configIn!;

        return this.mkDatumIsDelegation({
            capoAddr,
            mph,
            tn,
        });
    }

    @Activity.partialTxn
    async txnCreatingTokenPolicy(tcx: StellarTxnContext, tokenName: string) {
        return tcx;
    }

    static mkDelegateWithArgs(a: MintDelegateArgs) {}
}
