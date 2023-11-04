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
import {
    Activity,
    StellarContract,
    configBase,
    datum,
} from "../StellarContract.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import {
    DelegationDetail,
    capoDelegateConfig,
} from "../delegation/RolesAndDelegates.js";
import { StellarDelegate } from "../delegation/StellarDelegate.js";
import { InlineDatum } from "../HeliosPromotedTypes.js";
import { StellarHeliosHelpers } from "../StellarHeliosHelpers.js";
import { CapoDelegateHelpers } from "../delegation/CapoDelegateHelpers.js";
import { CapoMintHelpers } from "../CapoMintHelpers.js";
import { HeliosModuleSrc } from "../HeliosModuleSrc.js";
import { UnspecializedMintDelegate } from "./UnspecializedMintDelegate.js";

export type MintDelegateArgs = capoDelegateConfig & {
    rev: bigint;
};

//!!! TODO: include adapter(s) for Datum, which has the same essential shape
type MintDelegateDatumProps = {
    tokenName: string;
    maxMintSize: bigint;
};

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

    importModules(): HeliosModuleSrc[] {
        const specialization = this.specializedMintDelegate;
        if (specialization.moduleName !== "specializedMintDelegate") {
            throw new Error(
                `${this.constructor.name}: specializedMintDelegate() module name must be ` +
                    `'specializedMintDelegate', not '${specialization.moduleName}'\n  ... in ${specialization.srcFile}`
            );
        }

        return [
            StellarHeliosHelpers,
            CapoDelegateHelpers,
            CapoMintHelpers,
            specialization,
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
     * Implements {@link StellarDelegate.txnReceiveAuthorityToken}.
     * 
     * Uses {@link mkDelegationDatum} to make the inline Datum for the output.
     * @public
     **/
    async txnReceiveAuthorityToken<TCX extends StellarTxnContext<any>>(
        tcx: TCX,
        tokenValue: Value,
        fromFoundUtxo?: TxInput
    ): Promise<TCX> {
        console.log(
            `::::::::::: minting delegate validator receiving mintDgt token at `+
            this.address.validatorHash!.hex
        )
        debugger
        const ffu = fromFoundUtxo;
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
