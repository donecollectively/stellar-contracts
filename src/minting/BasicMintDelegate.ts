import {
    Address,
    AssetClass,
    Datum,
    TxInput,
    TxOutput,
    Value,
} from "@hyperionbt/helios";

//@ts-expect-error because TS can't import non-ts content : /
import contract from "./BasicMintDelegate.hl";
//@ts-expect-error because TS can't import non-ts content : /
import StellarHeliosHelpers from "../StellarHeliosHelpers.hl";

import {
    Activity,
} from "../StellarContract.js";
import type {
    configBase,
} from "../StellarContract.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import type {
    capoDelegateConfig,
} from "../delegation/RolesAndDelegates.js";


import { StellarDelegate } from "../delegation/StellarDelegate.js";
import type { InlineDatum } from "../HeliosPromotedTypes.js";
import { CapoDelegateHelpers } from "../delegation/CapoDelegateHelpers.js";
import { CapoMintHelpers } from "../CapoMintHelpers.js";
import type { HeliosModuleSrc } from "../HeliosModuleSrc.js";
import { UnspecializedMintDelegate } from "./UnspecializedMintDelegate.js";
import { UnspecializedCapo } from "../UnspecializedCapo.js";
import { CapoHelpers } from "../CapoHelpers.js";

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
            this.specializedCapo
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
            `     ----- minting delegate validator receiving mintDgt token at `+
            this.address.validatorHash!.hex
        )
        // const ffu = fromFoundUtxo;
        // const v : Value = ffu?.value || this.mkMinAssetValue(this.configIn!.uut);
        const datum = this.mkDelegationDatum(fromFoundUtxo);
        return tcx.addOutput(new TxOutput(this.address, tokenValue, datum));
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
