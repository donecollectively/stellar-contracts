import type { Value, TxOutputId, TxInput, ValidatorHash } from "@helios-lang/ledger";
import type { Capo } from "../Capo.js";
import type { DelegateSetupWithoutMintDelegate, MinimalDelegateLink, MintUutActivityArgs, NormalDelegateSetup, hasCharterRef } from "../CapoTypes.js";
import type { mustFindActivityType, mustFindConcreteContractBridgeType, mustFindDatumType, mustFindReadDatumType } from "../helios/dataBridge/BridgeTypes.js";
import type { GenericDelegateBridge, GenericDelegateBridgeClass } from "./GenericDelegateBridge.js";
import { type PartialStellarBundleDetails } from "../StellarContract.js";
import { StellarDelegate } from "./StellarDelegate.js";
import type { DelegationDetail, capoDelegateConfig } from "./RolesAndDelegates.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import type { CapoDelegateBundle } from "../helios/scriptBundling/CapoDelegateBundle.js";
import type { isActivity } from "../ActivityTypes.js";
import { type HeliosScriptBundle } from "../helios/index.js";
/**
 * Base class for delegates controlled by a smart contract, as opposed
 * to a simple delegate backed by an issued token, whose presence
 * grants delegated authority.
 * @public
 */
export declare class ContractBasedDelegate extends StellarDelegate {
    /**
     * Each contract-based delegate must define its own dataBridgeClass, but they all
     * use the same essential template for the outer layer of their activity & datum interface.
     */
    dataBridgeClass: GenericDelegateBridgeClass;
    _dataBridge: GenericDelegateBridge;
    static currentRev: bigint;
    /**
     * Configures the matching parameter name in the on-chain script, indicating
     * that this delegate serves the Capo by enforcing policy for spending the Capo's utxos.
     * @remarks
     * Not used for any mint delegate.  Howeever, a mint delegate class can instead provide a true isMintAndSpendDelegate,
     *...  if a single script controls both the mintDgt-* and spendDgt-* tokens/delegation roles for your Capo.
     *
     * DO NOT enable this attribute for second-level delegates, such as named delegates or delegated-data controllers.
     * The base on-chain delegate script recognizes this conditional role and enforces that its generic delegated-data activities
     * are used only in the context the Capo's main spend delegate, re-delegating to the data-controller which
     * can't use those generic activities, but instead implements its user-facing txns as variants of its SpendingActivities enum.
     */
    static isSpendDelegate: boolean;
    get delegateName(): string;
    _scriptBundle: HeliosScriptBundle | undefined;
    mkScriptBundle(setupDetails?: PartialStellarBundleDetails<any>): Promise<any>;
    get onchain(): mustFindConcreteContractBridgeType<this>;
    get offchain(): mustFindConcreteContractBridgeType<this>["reader"];
    get reader(): mustFindConcreteContractBridgeType<this>["reader"];
    get activity(): mustFindActivityType<this>;
    get mkDatum(): mustFindDatumType<this>;
    get newReadDatum(): mustFindReadDatumType<this>;
    get capo(): Capo<any, any>;
    scriptBundleClass(): Promise<typeof CapoDelegateBundle>;
    get scriptDatumName(): string;
    get scriptActivitiesName(): string;
    static isMintDelegate: boolean;
    static isMintAndSpendDelegate: boolean;
    static isDgDataPolicy: boolean;
    static get defaultParams(): {
        rev: bigint;
        isMintDelegate: boolean;
        isSpendDelegate: boolean;
        isDgDataPolicy: boolean;
    };
    static mkDelegateWithArgs(a: capoDelegateConfig): void;
    getContractScriptParams(config: capoDelegateConfig): {
        delegateName: string;
        rev: bigint;
        addrHint: import("@helios-lang/ledger").Address[];
    };
    tcxWithCharterRef<TCX extends StellarTxnContext | hasCharterRef>(tcx: TCX): Promise<TCX & hasCharterRef>;
    /**
     * Adds a mint-delegate-specific authority token to the txn output
     * @remarks
     *
     * Implements {@link StellarDelegate.txnReceiveAuthorityToken | txnReceiveAuthorityToken() }.
     *
     * Uses {@link ContractBasedDelegate.mkDelegationDatum | mkDelegationDatum()} to make the inline Datum for the output.
     * @see {@link StellarDelegate.txnReceiveAuthorityToken | baseline txnReceiveAuthorityToken()'s doc }
     * @public
     **/
    txnReceiveAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, tokenValue: Value, fromFoundUtxo?: TxInput): Promise<TCX>;
    mkDelegationDatum(txin?: TxInput): import("@helios-lang/ledger").TxOutputDatum;
    /**
     * redeemer for replacing the authority UUT with a new one
     * @remarks
     *
     * When replacing the delegate, the current UUT will be burned,
     * and a new one will be minted.  It can be deposited to any next delegate address.
     *
     * @param seedTxnDetails - seed details for the new UUT
     * @public
     **/
    activityReplacingMe({ seed, purpose, }: Omit<MintUutActivityArgs, "purposes"> & {
        purpose: string;
    }): void;
    mkDelegateLifecycleActivity(delegateActivityName: "ReplacingMe" | "Retiring" | "ValidatingSettings", args?: Record<string, any>): isActivity;
    mkCapoLifecycleActivity(capoLifecycleActivityName: "CreatingDelegate" | "ActivatingDelegate", { seed, purpose, ...otherArgs }: Omit<MintUutActivityArgs, "purposes"> & {
        purpose?: string;
    }): isActivity;
    /**
     * Creates a reedemer for the indicated spending activity name
     **/
    mkSpendingActivity(spendingActivityName: string, args: {
        id: string | number[];
    } & Record<string, any>): isActivity;
    mkSeedlessMintingActivity(mintingActivityName: string, args: Record<string, any>): isActivity;
    mkSeededMintingActivity(mintingActivityName: string, args: {
        seed: TxOutputId;
    } & Record<string, any>): isActivity;
    /**
     * redeemer for spending the authority UUT for burning it.
     * @public
     * @remarks
     *
     * The Retiring redeemer indicates that the delegate is being
     * removed.
     *
     **/
    activityRetiring(): void;
    activityValidatingSettings(): void;
    activityMultipleDelegateActivities(...activities: isActivity[]): isActivity;
    /**
     * A mint-delegate activity indicating that a delegated-data controller will be governing
     * a deletion (burning its UUT) of a specific piece of delegated data.  No further redeemer details are needed here,
     * but the data-delegate's controller-token may have additional details in ITS redeemer,
     */
    activityDeletingDelegatedData(recId: string | number[]): isActivity;
    /**
     * creates the essential datum for a delegate UTxO
     * @remarks
     *
     * Every delegate is expected to have a two-field 'IsDelegation' variant
     * in the first position of its on-chain Datum type.  This helper method
     * constructs a suitable UplcData structure, given appropriate inputs.
     * @param dd - Delegation details
     * @public
     **/
    mkDatumIsDelegation(dd: DelegationDetail): import("@helios-lang/ledger").InlineTxOutputDatum;
    /**
     * returns the ValidatorHash of the delegate script, if relevant
     * @public
     * @remarks
     *
     * A delegate that doesn't use an on-chain validator should override this method and return undefined.
     **/
    get delegateValidatorHash(): ValidatorHash | undefined;
    /**
     * {@inheritdoc StellarDelegate.DelegateMustFindAuthorityToken}
     **/
    DelegateMustFindAuthorityToken(tcx: StellarTxnContext, label: string): Promise<TxInput>;
    /**
     * Adds the delegate's authority token to a transaction
     * @public
     * @remarks
     * Given a delegate already configured by a Capo, this method implements
     * transaction-building logic needed to include the UUT into the `tcx`.
     * the `utxo` is discovered by {@link StellarDelegate.DelegateMustFindAuthorityToken | DelegateMustFindAuthorityToken() }
     *
     * The off-chain code shouldn't need to check the details; it can simply
     * arrange the details properly and spend the delegate's authority token,
     * using this method.
     *
     * ### Reliance on this delegate
     *
     * Other contract scripts can rely on the delegate script to have validated its
     * on-chain policy and enforced its own "return to the delegate script" logic.
     *
     * ### Enforcing on-chain policy
     *
     * When spending the authority token in this way, the delegate's authority is typically
     * narrowly scoped, and it's expected that the delegate's on-chain script validates that
     * those parts of the transaction detail should be authorized, in accordance with the
     * delegate's core purpose/responsbility - i.e. that the txn does all of what the delegate
     * expects, and none of what it shouldn't do in that department.
     *
     * The on-chain code SHOULD typically enforce:
     *  * that the token is spent with an application-specific redeemer variant of its
     *     MintingActivity or SpendingActivitie.
     *
     *  * that the authority token is returned to the contract with its datum unchanged
     *  * that any other tokens it may also hold in the same UTxO do not become
     *     inaccessible as a result of the transactions - perhaps by requiring them to be
     *     returned together with the authority token.
     *
     * It MAY enforce additional requirements as well.
     *
     * @example
     * A minting delegate should check that all the expected tokens are
     * minted, AND that no other tokens are minted.
     *
     * @example
     * A role-based authentication/signature-checking delegate can
     * require an appropriate signature on the txn.
     *
     * @param tcx - the transaction context
     * @param utxo - the utxo having the authority UUT for this delegate
     * @reqt Adds the uutxo to the transaction inputs with appropriate redeemer.
     * @reqt Does not output the value; can EXPECT txnReceiveAuthorityToken to be called for that purpose.
     **/
    DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, uutxo: TxInput, redeemer: isActivity): Promise<TCX>;
    /**
     * {@inheritdoc StellarDelegate.DelegateAddsAuthorityToken}
     **/
    DelegateRetiresAuthorityToken<TCX extends StellarTxnContext>(this: ContractBasedDelegate, tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<TCX>;
}
/**
 * @public
 */
export type NamedPolicyCreationOptions<thisType extends Capo<any>, DT extends StellarDelegate> = PolicyCreationOptions & {
    /**
     * Optional name for the UUT; uses the delegate name if not provided.
     **/
    uutName?: string;
};
export type PolicyCreationOptions = MinimalDelegateLink & {
    /**
     * details for creating the delegate
     */
    mintSetup: NormalDelegateSetup | DelegateSetupWithoutMintDelegate;
    /**
     * Installs the named delegate without burning the existing UUT for this delegate.
     * That UUT may become lost and inaccessible, along with any of its minUtxo.
     **/
    forcedUpdate?: true;
};
//# sourceMappingURL=ContractBasedDelegate.d.ts.map