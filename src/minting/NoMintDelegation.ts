import { Address, AssetClass, TxInput, Value } from "@hyperionbt/helios";

//@ts-expect-error because TS can't import non-ts content : /
import contract from "./BasicMintDelegate.hl";
import { Activity, StellarContract, configBase } from "../StellarContract.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import { MintDelegateArgs } from "./BasicMintDelegate.js";
import { StellarDelegate } from "../delegation/StellarDelegate.js";

/**
 * Stores the mintDgt UUT together with the charter, thus requiring that the 
 * govAuthority delegate directly approves any mint
 * @remarks
 * 
 * @public
 **/
export class NoMintDelegation
    extends StellarDelegate<MintDelegateArgs>
{
    static currentRev = 1n;
    static get defaultParams() {
        return { rev: this.currentRev };
    }

de
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
        value: Value,
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
