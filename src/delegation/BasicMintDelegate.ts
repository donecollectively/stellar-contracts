import { Address, AssetClass, Datum, TxInput, TxOutput, Value } from "@hyperionbt/helios";

//@ts-expect-error because TS can't import non-ts content : /
import contract from "./BasicMintDelegate.hl";
import {
    Activity,
    StellarContract,
    configBase,
    datum,
} from "../StellarContract.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import { StellarDelegate, capoDelegateConfig } from "./RolesAndDelegates.js";
import { InlineDatum } from "../HeliosPromotedTypes.js";
import { StellarHeliosHelpers } from "../StellarHeliosHelpers.js";
import { CapoDelegateHelpers } from "./CapoDelegateHelpers.js";
import { CapoMintHelpers } from "../CapoMintHelpers.js";
import { HeliosModuleSrc } from "../HeliosModuleSrc.js";

export type MintDelegateArgs = capoDelegateConfig & {
    rev: bigint;
};

//!!! TODO: include adapter(s) for Datum, which has the same essential shape
type MintDelegateDatumProps = {
    tokenName: string;
    maxMintSize: bigint;
};

export type MintDelegate<T> = StellarContract<any & T> & {
    txnCreateTokenPolicy;
};

export class BasicMintDelegate 
extends StellarContract<MintDelegateArgs> 
implements StellarDelegate {
    static currentRev = 1n;
    static get defaultParams() {
        return { rev: this.currentRev };
    }

    contractSource() {
        return contract;
    }

    importModules(): HeliosModuleSrc[] {
       
        return [
            StellarHeliosHelpers, 
            CapoDelegateHelpers,
            CapoMintHelpers
        ];
    }

    @datum
    mkDatumDelegate(): InlineDatum {
        const {
            Datum: { Delegate },
        } = this.scriptProgram!.types;

        const t = new Delegate();
        return Datum.inline(t._toUplcData());
    }

    getContractScriptParams(config: MintDelegateArgs): configBase {
        return {
            rev: config.rev,
        };
    }

    async txnReceiveAuthorityToken<TCX extends StellarTxnContext<any>>(
        tcx: TCX, 
        fromFoundUtxo?: TxInput
    ): Promise<TCX> {
        const ffu = fromFoundUtxo;
        const v : Value = ffu?.value || this.mkMinAssetValue(this.configIn!.uut);
        const datum = this.mkDelegationDatum(fromFoundUtxo)

        return tcx.addOutput(new TxOutput(this.address, v, datum))
    }

    mkDelegationDatum(txin? : TxInput) {
        if (txin) return txin.origOutput.datum!
        return this.mkDatumDelegate()
    }

    @Activity.partialTxn
    async txnCreatingTokenPolicy(
        tcx: StellarTxnContext,
        tokenName: string
    ) {
        return tcx;
    }

    static mkDelegateWithArgs(a: MintDelegateArgs) {}
}
