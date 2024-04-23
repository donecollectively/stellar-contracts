import {
    Address,
    AssetClass,
    Datum,
    TxId,
    TxInput,
    TxOutput,
    Value,
} from "@hyperionbt/helios";

import { BasicDelegate } from "../delegation/BasicDelegate.js";

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

import { ContractBasedDelegate } from "../delegation/ContractBasedDelegate.js";

/**
 * Serves a delegated minting-policy role for Capo contracts
 * @remarks
 *
 * shifts detailed minting policy out of the minter and into the delegate.
 * @public
 **/
export class BasicMintDelegate extends ContractBasedDelegate<capoDelegateConfig> {
    static currentRev = 1n;

    delegateName = "mintDelegate"

    static get defaultParams() {
        return {
            ...super.defaultParams,
            delegateName: "mintDelegate",
            isMintDelegate: true
        }
    }

    @datum
    mkDatumScriptReference() {
        throw new Error(`obsolete, right?`);
        const { ScriptReference: hlScriptReference } = this.onChainDatumType;

        // this is a simple enum tag, indicating the role of this utxo: holding the script
        // on-chain, so it can be used in later transactions without bloating those txns
        // every time.
        const t = new hlScriptReference();
        return Datum.inline(t._toUplcData());
    }

    async txnGrantAuthority<TCX extends StellarTxnContext>(
        tcx: TCX,
        redeemer: isActivity,
        skipReturningDelegate? :  "skipDelegateReturn"
    ) {
        if (!redeemer)
            throw new Error(
                `mint delegate requires an explicit redeemer for txnGrantAuthority()`
            );

        const {capo} = this.configIn!;
        await capo.txnAttachScriptOrRefScript(tcx, this.compiledScript);

        return super.txnGrantAuthority(tcx, redeemer, skipReturningDelegate);
    }

    // moved to to super
    // static mkDelegateWithArgs(a: capoDelegateConfig) {}
}
