import {
    Datum,
} from "@hyperionbt/helios";
 import * as helios from "@hyperionbt/helios";

import {  Activity, datum } from "../StellarContract.js";
import type { hasSeed, isActivity } from "../StellarContract.js";
import {
    StellarTxnContext,
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
    get delegateName() { return "mintDelegate" }
    get isMintAndSpendDelegate() { return false }

    // uses the basic delegate script, plus the isMintDelegate param

    static get defaultParams() {
        return {
            ...super.defaultParams,
            delegateName: "mintDelegate",
            isMintDelegate: true,
            isSpendDelegate: this.prototype.isMintAndSpendDelegate 
        }
    }

    @Activity.redeemer
    activityCreatingDelegatedData(seedFrom: hasSeed, uutPurpose: string) {
        const seed = this.getSeed(seedFrom);
        const Activity = this.mustGetActivity("CreatingDelegatedData");
        return {
            redeemer: new Activity(
                seed,
                uutPurpose, 
            )
        }
    }

    @Activity.redeemer
    activityUpdatingDelegatedData(uutPurpose: string, recId: string | number[]) : isActivity {
        const recIdBytes = Array.isArray(recId) ? recId : helios.textToBytes(recId);
        const Activity = this.mustGetActivity("UpdatingDelegatedData");
        return {
            redeemer: new Activity(uutPurpose, recIdBytes)
        }
    }

    @Activity.redeemer
    activityDeletingDelegatedData(uutPurpose: string, recId: string | number[]) : isActivity {
        const recIdBytes = Array.isArray(recId) ? recId : helios.textToBytes(recId);
        const Activity = this.mustGetActivity("DeletingDelegatedData");
        return {
            redeemer: new Activity(uutPurpose, recIdBytes)
        }
    }


    @Activity.redeemer
    activityCreatingDataDelegate(seedFrom: hasSeed, uutPurpose: string) {
        const seed = this.getSeed(seedFrom);
        return this.mkCapoLifecycleActivity("CreatingDelegate", seed, uutPurpose);
    }


    @datum
    mkDatumScriptReference() {
        throw new Error(`obsolete mkDatumScriptReference!!!`);
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
