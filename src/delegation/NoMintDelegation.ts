import { Address, AssetClass, TxInput, Value } from "@hyperionbt/helios";

//@ts-expect-error because TS can't import non-ts content : /
import contract from "./BasicMintDelegate.hl";
import { Activity, StellarContract, configBase } from "../StellarContract.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import { MintDelegateArgs } from "./BasicMintDelegate.js";
import { StellarDelegate } from "./RolesAndDelegates.js";

export class NoMintDelegation
    extends StellarContract<MintDelegateArgs>
    implements StellarDelegate
{
    static currentRev = 1n;
    static get defaultParams() {
        return { rev: this.currentRev };
    }

    delegateReqdAddress() {
        return false as const;
    }

    contractSource() {
        return contract;
    }

    getContractScriptParams(config: MintDelegateArgs): configBase {
        return {
            rev: config.rev,
        };
    }
    txnReceiveAuthorityToken<TCX extends StellarTxnContext<any>>(
        tcx: TCX,
        fromFoundUtxo?: TxInput | undefined
    ): Promise<TCX> {
        throw new Error(`todo`);
    }

    @Activity.partialTxn
    async txnCreatingTokenPolicy(
        tcx: StellarTxnContext,
        tokenName: string
    ): Promise<StellarTxnContext> {
        return tcx;
    }

    static mkDelegateWithArgs(a: MintDelegateArgs) {}
}
