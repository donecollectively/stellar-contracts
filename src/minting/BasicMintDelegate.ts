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

import { Activity } from "../StellarContract.js";
import type { configBase, isActivity } from "../StellarContract.js";
import { StellarTxnContext, type hasSeedUtxo } from "../StellarTxnContext.js";
import type { capoDelegateConfig } from "../delegation/RolesAndDelegates.js";

import { StellarDelegate } from "../delegation/StellarDelegate.js";
import type { InlineDatum } from "../HeliosPromotedTypes.js";
import { CapoDelegateHelpers } from "../delegation/CapoDelegateHelpers.js";
import { CapoMintHelpers } from "../CapoMintHelpers.js";
import type { HeliosModuleSrc } from "../HeliosModuleSrc.js";
import { UnspecializedMintDelegate } from "./UnspecializedMintDelegate.js";
import { UnspecializedCapo } from "../UnspecializedCapo.js";
import { CapoHelpers } from "../CapoHelpers.js";
import type {
    MintUutActivityArgs,
    hasUutContext,
} from "../Capo.js";

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
        return { rev: this.currentRev };
    }

    contractSource() {
        return contract;
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

    // NOTE: prefer application-specific activities that validate
    // particular mints, instead of this generic one
    @Activity.redeemer
    activityMintingUuts({
        seedTxn,
        seedIndex: sIdx,
        purposes,
    }: MintUutActivityArgs): isActivity {
        const seedIndex = BigInt(sIdx);
        console.log("UUT redeemer seedTxn", seedTxn.hex);
        const { mintingUuts } = this.onChainActivitiesType;
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
            StellarHeliosHelpers,
            CapoDelegateHelpers,
            CapoHelpers,
            CapoMintHelpers,
            specializedMintDelegate,
            this.specializedCapo,
        ];
    }

    get scriptDatumName() {
        return "MintDelegateDatum";
    }
    get scriptActivitiesName() {
        return "MintDelegateActivity";
    }

    getContractScriptParams(config: MintDelegateArgs): configBase {
        return {
            rev: config.rev,
        };
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
                this.address.validatorHash!.hex
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
        let useActivity = activity || this.activityMintingUuts({ 
            purposes: uutPurposes,
            ...(tcx.getSeedAttrs()),
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
