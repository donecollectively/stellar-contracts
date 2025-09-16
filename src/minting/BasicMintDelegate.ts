import { Activity, datum } from "../StellarContract.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import type { capoDelegateConfig } from "../delegation/RolesAndDelegates.js";
 
import { ContractBasedDelegate } from "../delegation/ContractBasedDelegate.js";
import UnspecializedDelegateBundle from "../delegation/UnspecializedDelegate.hlb.js";
import type { GenericDelegateBridgeClass } from "../delegation/GenericDelegateBridge.js";
import type { hasSeed, isActivity } from "../ActivityTypes.js";
import type { GrantAuthorityOptions } from "../delegation/StellarDelegate.js";

/**
 * Serves a delegated minting-policy role for Capo contracts
 * @remarks
 *
 * shifts detailed minting policy out of the minter and into the delegate.
 * 
 * By default, this delegate policy serves also as a spend delegate.  To use a separate
 * spend delegate, define `static isMintAndSpendDelegate = false;` in the subclass,
 * define a separate ContractBasedDelegate subclass for the spend delegate, and
 * register it in the Capo contract's `delegateRoles.spendDelegate`.
 * 
 * @public
 **/
export class BasicMintDelegate extends ContractBasedDelegate {
    static currentRev = 1n;
    static isMintDelegate = true;
    declare dataBridgeClass : GenericDelegateBridgeClass

    /**
     * Enforces that the mint delegate needs gov-authority by default
     */
    get needsGovAuthority() {
        return true;
    }

    get delegateName() {
        return "mintDelegate";
    }

    static isMintAndSpendDelegate = true

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
            isDgDataPolicy: false,
            isSpendDelegate: this.isMintAndSpendDelegate,
            requiresGovAuthority: true, // but note: non-true is only relevant for delegated-data policies.
        };
    }

    /**
     * A mint-delegate activity indicating that a delegated-data controller will be governing
     * creation of a specific piece of delegated data.  No further redeemer details are needed here,
     * but the data-delegate's controller-token may have additional details in ITS redeemer.
     * @public
     */
    @Activity.redeemer
    activityCreatingDelegatedData(seedFrom: hasSeed, uutPurpose: string): isActivity {
        throw new Error(`deprecated: explicit activity helper`);
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
    activityCreatingDataDelegate(seedFrom: hasSeed, uutPurpose: string): isActivity {
        throw new Error(`deprecated: explicit activity helper`);

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
        redeemerActivity: isActivity,
        options: GrantAuthorityOptions = {}
    ) {
        if (!redeemerActivity)
            throw new Error(
                `mint delegate requires an explicit redeemer for txnGrantAuthority()`
            );

        const { capo } = this.configIn!;
        // await capo.txnAttachScriptOrRefScript(tcx, this.compiledScript);

        const {redeemer: expectedRedeemer} = redeemerActivity;
        return super.txnGrantAuthority(tcx, redeemerActivity, {
            ifExists: (existingInput, existingRedeemer) => {
                if (!existingRedeemer.rawData.MultipleDelegateActivities) {
                    throw this.existingRedeemerError(
                        "mint delegate authority (not a multiple-activity redeemer)",
                        this.tvAuthorityToken(),
                        existingRedeemer
                    );
                }
                if (existingRedeemer.kind != "constr") throw new Error(`non-enum redeemer`)
                const list = existingRedeemer.fields[0]
                if (list.kind != "list") throw new Error(`non-list redeemer`)

                const existingActivity = list.items.find(f => f.isEqual(expectedRedeemer))
                if (!existingActivity) {
                    throw this.existingRedeemerError(
                        "mint delegate authority (multiple-activity redeemer doesn't include the needed activity)",
                        this.tvAuthorityToken(),
                        existingRedeemer,
                        expectedRedeemer
                    );
                }
            },
            ...options,
        });
    }

    // moved to to super
    // static mkDelegateWithArgs(a: capoDelegateConfig) {}
}
