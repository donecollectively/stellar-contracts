import { Activity, datum } from "../StellarContract.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import type { capoDelegateConfig } from "../delegation/RolesAndDelegates.js";
 
import { ContractBasedDelegate } from "../delegation/ContractBasedDelegate.js";
import UnspecializedDelegateBundle from "../delegation/UnspecializedDelegate.hlbundle.js";
import dataBridgeClass, { UnspecializedDelegateBridge } from "../delegation/UnspecializedDelegate.bridge.js";
import type { ContractDataBridgeWithEnumDatum, DataBridge } from "src/helios/dataBridge/DataBridge.js";
import type { HeliosScriptBundle } from "../helios/HeliosScriptBundle.js";
import type { CapoDelegateBundle } from "../delegation/CapoDelegateBundle.js";
import type { GenericDelegateBridge, GenericDelegateBridgeClass } from "../delegation/GenericDelegateBridge.js";
import type { hasSeed, isActivity } from "../ActivityTypes.js";

/**
 * Serves a delegated minting-policy role for Capo contracts
 * @remarks
 *
 * shifts detailed minting policy out of the minter and into the delegate.
 * 
 * By default, this delegate policy serves also as a spend delegate.  To use a separate
 * spend delegate, define `get isMintAndSpendDelegate() { return false; }` in the subclass,
 * define a separate ContractBasedDelegate subclass for the spend delegate, and
 * register it in the Capo contract's `delegateRoles.spendDelegate`.
 * 
 * @public
 **/
export class BasicMintDelegate extends ContractBasedDelegate {
    static currentRev = 1n;
    declare dataBridgeClass : GenericDelegateBridgeClass

    get delegateName() {
        return "mintDelegate";
    }

    get isMintAndSpendDelegate() {
        return true;
    }

    /**
     * the scriptBundle for the BasicMintDelegate looks concrete,
     * but it's actually just referencing a generic, unspecialized delegate script
     * that may not provide much value to any specific application.  
     * 
     * Subclasses should expect to override this and provide a specialized
     * `get scriptBundle() { return new ‹YourMintDelegateBundle› }`, using
     *  a class you derive from CapoDelegateBundle and your own delegate
     * specialization.  TODO: a generator to make this easier.  Until then,
     * you can copy the UnspecializedDelegate.hl and specialize it.
     */
    scriptBundle() {
        return new UnspecializedDelegateBundle()
    }

    // uses the basic delegate script, plus the isMintDelegate param

    static get defaultParams() {
        return {
            ...super.defaultParams,
            delegateName: "mintDelegate",
            isMintDelegate: true,
            isSpendDelegate: this.prototype.isMintAndSpendDelegate,
        };
    }

    /**
     * A mint-delegate activity indicating that a delegated-data controller will be governing
     * creation of a specific piece of delegated data.  No further redeemer details are needed here,
     * but the data-delegate's controller-token may have additional details in ITS redeemer,
     * which will be aligned with the one, as described in {@link BasicMintDelegate.activityUpdatingDelegatedData}.
     * See that topic for more details including multi-activity scenarios.
     */
    @Activity.redeemer
    activityCreatingDelegatedData(seedFrom: hasSeed, uutPurpose: string) {
        const seed = this.getSeed(seedFrom);
        const redeemer = this.activityVariantToUplc("CreatingDelegatedData", {
            seed,
            dataType: uutPurpose,
        });
        return { redeemer };
        // const enumVariantStatement = Activity.prototype._enumVariantStatement;
        // const creatingDgDataIndex = enumVariantStatement.constrIndex;
        // const uutPurposeBytes = helios.textToBytes(uutPurpose);

        // return {
        //     redeemer: new helios.ConstrData(creatingDgDataIndex, [
        //         seed.toUplcData(),
        //         new helios.ByteArrayData(uutPurposeBytes)
        //     ])
        // }
    }

    /**
     * A mint-delegate activity indicating that a delegated-data controller UUT is being created
     * to govern a class of delegated data.  ONLY the indicated data-controller UUT must be minted,
     * and is expected to be deposited into the data-controller's policy-script address.  Use the
     * {@link DelegatedDataContract} class to create the off-chain data controller and its on-chain policy.
     */
    @Activity.redeemer
    activityCreatingDataDelegate(seedFrom: hasSeed, uutPurpose: string) {
        const seed = this.getSeed(seedFrom);
        return this.mkCapoLifecycleActivity(
            "CreatingDelegate",
            {
                seed,
                purpose: uutPurpose,
            }
            // new helios.ByteArrayData(helios.textToBytes(uutPurpose))
        );
    }

    @datum
    mkDatumScriptReference() {
        throw new Error(`obsolete mkDatumScriptReference!!!`);
        //@ts-ignore
        const { ScriptReference: hlScriptReference } = this.onChainDatumType;

        // this is a simple enum tag, indicating the role of this utxo: holding the script
        // on-chain, so it can be used in later transactions without bloating those txns
        // every time.
        const t = new hlScriptReference();
        //@ts-ignore
        return Datum.inline(t._toUplcData());
    }

    async txnGrantAuthority<TCX extends StellarTxnContext>(
        tcx: TCX,
        redeemer: isActivity,
        skipReturningDelegate?: "skipDelegateReturn"
    ) {
        if (!redeemer)
            throw new Error(
                `mint delegate requires an explicit redeemer for txnGrantAuthority()`
            );

        const { capo } = this.configIn!;
        await capo.txnAttachScriptOrRefScript(tcx, this.compiledScript);

        return super.txnGrantAuthority(tcx, redeemer, skipReturningDelegate);
    }

    // moved to to super
    // static mkDelegateWithArgs(a: capoDelegateConfig) {}
}
