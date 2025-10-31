import { type Address, type MintingPolicyHash } from "@helios-lang/ledger";
import { StellarContract } from "../StellarContract.js";
import type { StellarBundleSetupDetails, configBaseWithRev } from "../StellarContract.js";
import { StellarTxnContext, type anyState } from "../StellarTxnContext.js";
import type { Capo } from "../Capo.js";
import type { MinterBaseMethods } from "../CapoTypes.js";
import type { SeedTxnScriptParams } from "../SeedTxnScriptParams.js";
import type { valuesEntry } from "../HeliosPromotedTypes.js";
import { UutName } from "../delegation/UutName.js";
import type { BasicMintDelegate } from "./BasicMintDelegate.js";
import CapoMinterDataBridge from "./CapoMinter.bridge.js";
import type { mustFindActivityType, mustFindConcreteContractBridgeType } from "../helios/dataBridge/BridgeTypes.js";
import type { hasSeed, isActivity } from "../ActivityTypes.js";
import type { GrantAuthorityOptions } from "../delegation/StellarDelegate.js";
type MintCharterActivityArgs<T = {}> = T & {
    owner: Address;
};
/**
 * The parameters for the Capo's basic minter
 * @public
 */
export type BasicMinterParams = configBaseWithRev & SeedTxnScriptParams & {
    capo: Capo<any>;
};
/**
 * A basic minting validator serving a Capo's family of contract scripts
 * @remarks
 *
 * NOTE that this class provides the actual MINTING script, which is
 * DIFFERENT from the minting delegate.  The minting delegate is a separate
 * contract that can be updated within the scope of a Capo, with this minting
 * script remaining unchanged.
 *
 * Because this minter always defers to the minting delegate, that delegate
 * always expresses the true policy for minting application-layer tokens.
 * This minter contains only the most basic minting constraints - mostly, those
 * needed for supporting Capo lifeycle activities in which the minting delegate
 * isn't yet available, or is being replaced.
 *
 * Mints charter tokens based on seed UTxOs.  Can also mint UUTs and
 * other tokens as approved by the Capo's minting delegate.
 * @public
 **/
export declare class CapoMinter extends StellarContract<BasicMinterParams> implements MinterBaseMethods {
    currentRev: bigint;
    scriptBundleClass(): Promise<typeof import("./CapoMinter.hlb.js").CapoMinterBundle>;
    mkScriptBundle(setupDetails?: StellarBundleSetupDetails<any>): Promise<any>;
    /**
     * the data bridge for this minter is fixed to one particular type
     */
    dataBridgeClass: typeof CapoMinterDataBridge;
    get onchain(): mustFindConcreteContractBridgeType<this>;
    get activity(): mustFindActivityType<CapoMinter>;
    get scriptActivitiesName(): string;
    /**
     * Mints initial charter token for a Capo contract
     * @remarks
     *
     * This is the fundamental bootstrapping event for a Capo.
     * @param ownerInfo - contains the `{owner}` address of the Capo contract
     * @public
     **/
    activityMintingCharter(ownerInfo: MintCharterActivityArgs): isActivity;
    /**
     * Mints any tokens on sole authority of the Capo contract's minting delegage
     * @remarks
     *
     * The Capo's minting delegate takes on the responsibility of validating a mint.
     * It can validate mintingUuts, burningUuts and any application-specific use-cases
     * for minting and/or burning tokens from the policy.
     * @public
     **/
    activityMintWithDelegateAuthorizing(): isActivity;
    /**
     * Mints a new UUT specifically for a minting invariant
     * @remarks
     *
     * When adding a minting invariant, the Capo's existing mint delegate
     * doesn't get to be involved, as it could otherwise block a critical administrative
     * change needed.  The Capo's authority token is all the minter requires
     * to create the needed UUT.
     *
     * @param seedFrom - either a transaction-context with seedUtxo, or `{seedTxn, seedIndex}`
     * @public
     **/
    activityAddingMintInvariant(seedFrom: hasSeed): isActivity;
    /** Mints a new UUT specifically for a spending invariant
     * @remarks When adding a spending invariant, the Capo's existing mint delegate
     * is not consulted, as this administrative function works on a higher
     * level than the usual minting delegate's authority.
     *
     * @public
     * **/
    activityAddingSpendInvariant(seedFrom: hasSeed): isActivity;
    /**
     * Forces replacement of the Capo's mint delegate
     * @remarks
     *
     * Forces the minting of a new UUT to replace the Capo's mint delegate.
     *
     * @public
     **/
    activityForcingNewMintDelegate(seedFrom: hasSeed): isActivity;
    /**
     * Forces replacement of the Capo's spend delegate
     * @remarks
     *
     * Creates a new UUT to replace the Capo's spend delegate.  The mint delegate
     * is bypassed in this operation.  There is always some existing spend delegate
     * when this is called, and it's normally burned in the process, when replacingUut is
     * provided.  If replacingUut is not provided, the existing spend delegate is left in place,
     * although it won't be useful because the new spend delegate will have been installed.
     *
     * @param seedFrom - either a transaction-context with seedUtxo, or `{seedTxn, seedIndex}`
     * @param replacingUut - the name of an exiting delegate being replaced
     * @public
     **/
    activityForcingNewSpendDelegate(seedFrom: hasSeed, replacingUut?: number[]): isActivity;
    get mintingPolicyHash(): MintingPolicyHash;
    get charterTokenAsValuesEntry(): valuesEntry;
    tvCharter(): import("@helios-lang/ledger").Value;
    get charterTokenAsValue(): import("@helios-lang/ledger").Value;
    txnMintingCharter<TCX extends StellarTxnContext<anyState>>(this: CapoMinter, tcx: TCX, { owner, capoGov, mintDelegate, spendDelegate, }: {
        owner: Address;
        capoGov: UutName;
        mintDelegate: UutName;
        spendDelegate: UutName;
    }): Promise<TCX>;
    attachScript<TCX extends StellarTxnContext<anyState>>(tcx: TCX, useRefScript?: boolean): Promise<TCX>;
    txnMintingWithoutDelegate<TCX extends StellarTxnContext>(tcx: TCX, vEntries: valuesEntry[], minterActivity: isActivity): Promise<TCX>;
    txnMintWithDelegateAuthorizing<TCX extends StellarTxnContext>(tcx: TCX, vEntries: valuesEntry[], mintDelegate: BasicMintDelegate, mintDgtRedeemer: isActivity, options?: GrantAuthorityOptions): Promise<TCX>;
}
export {};
//# sourceMappingURL=CapoMinter.d.ts.map