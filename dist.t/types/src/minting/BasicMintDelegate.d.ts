import { StellarTxnContext } from "../StellarTxnContext.js";
import { ContractBasedDelegate } from "../delegation/ContractBasedDelegate.js";
import type { GenericDelegateBridgeClass } from "../delegation/GenericDelegateBridge.js";
import type { hasSeed, isActivity } from "../ActivityTypes.js";
import type { GrantAuthorityOptions } from "../delegation/StellarDelegate.js";
import type { ConcreteCapoDelegateBundle } from "../helios/scriptBundling/CapoDelegateBundle.js";
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
export declare class BasicMintDelegate extends ContractBasedDelegate {
    static isMintDelegate: boolean;
    dataBridgeClass: GenericDelegateBridgeClass;
    /**
     * Enforces that the mint delegate needs gov-authority by default
     */
    get needsGovAuthority(): boolean;
    get delegateName(): string;
    static isMintAndSpendDelegate: boolean;
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
    scriptBundleClass(): Promise<ConcreteCapoDelegateBundle>;
    static get defaultParams(): {
        delegateName: string;
        isMintDelegate: boolean;
        isDgDataPolicy: boolean;
        isSpendDelegate: boolean;
        requiresGovAuthority: boolean;
        rev: bigint;
    };
    /**
     * A mint-delegate activity indicating that a delegated-data controller will be governing
     * creation of a specific piece of delegated data.  No further redeemer details are needed here,
     * but the data-delegate's controller-token may have additional details in ITS redeemer.
     * @public
     */
    activityCreatingDelegatedData(seedFrom: hasSeed, uutPurpose: string): isActivity;
    /**
     * A mint-delegate activity indicating that a delegated-data controller UUT is being created
     * to govern a class of delegated data.  ONLY the indicated data-controller UUT must be minted,
     * and is expected to be deposited into the data-controller's policy-script address.  Use the
     * {@link DelegatedDataContract} class to create the off-chain data controller and its on-chain policy.
     */
    activityCreatingDataDelegate(seedFrom: hasSeed, uutPurpose: string): isActivity;
    mkDatumScriptReference(): any;
    txnGrantAuthority<TCX extends StellarTxnContext>(tcx: TCX, redeemerActivity: isActivity, options?: GrantAuthorityOptions): Promise<TCX>;
}
//# sourceMappingURL=BasicMintDelegate.d.ts.map