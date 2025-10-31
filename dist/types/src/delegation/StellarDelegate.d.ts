import type { TxInput, ValidatorHash } from "@helios-lang/ledger";
import type { Value } from "@helios-lang/ledger";
import { StellarContract } from "../StellarContract.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import type { capoDelegateConfig } from "./RolesAndDelegates.js";
import type { ContractDataBridgeWithEnumDatum } from "../helios/dataBridge/DataBridge.js";
import type { AbstractNew } from "../helios/typeUtils.js";
import type { isActivity } from "../ActivityTypes.js";
import type { UplcData } from "@helios-lang/uplc";
export type GrantAuthorityOptions = {
    skipReturningDelegate?: true;
    ifExists?: (existingInput: TxInput, existingRedeemer: UplcData) => void;
};
/**
 * Base class for modules that can serve as Capo delegates
 * @public
 * @remarks
 *
 * establishes a base protocol for delegates.
 * @typeParam CT - type of any specialized configuration; use capoDelegateConfig by default.
 **/
export declare abstract class StellarDelegate extends StellarContract<capoDelegateConfig> {
    static currentRev: bigint;
    static get defaultParams(): {
        rev: bigint;
    };
    dataBridgeClass: AbstractNew<ContractDataBridgeWithEnumDatum> | undefined;
    existingRedeemerError(label: string, authorityVal: Value, existingRedeemer: UplcData, redeemerActivity?: UplcData): Error;
    /**
     * Finds and adds the delegate's authority token to the transaction
     * @remarks
     *
     * calls the delegate-specific DelegateAddsAuthorityToken() method,
     * with the uut found by DelegateMustFindAuthorityToken().
     *
     * Returns the token back to the contract using {@link StellarDelegate.txnReceiveAuthorityToken | txnReceiveAuthorityToken() },
     * automatically, unless the `skipReturningDelegate` option is provided.
     *
     * If the authority token
     * @param tcx - transaction context
     * @public
     **/
    txnGrantAuthority<TCX extends StellarTxnContext>(tcx: TCX, redeemer?: isActivity, options?: GrantAuthorityOptions): Promise<TCX>;
    /**
     * Finds the authority token and adds it to the transaction, tagged for retirement
     * @public
     * @remarks
     * Doesn't return the token back to the contract.
     **/
    txnRetireAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX>;
    /**
     * Standard delegate method for receiving the authority token as a txn output
     * @remarks
     *
     * creates a UTxO / TxOutput, depositing the indicated token-name into the delegated destination.
     *
     * Each implemented subclass can use it's own style to match its strategy & mechanism,
     * and is EXPECTED to use tcx.addOutput() to receive the indicated `tokenValue` into the
     * contract or other destination address.
     *
     * This method is used both for the original deposit and for returning the token during a grant-of-authority.
     *
     * Impls should normally preserve the datum from an already-present sourceUtxo, possibly with evolved details.
     *
     * @param tcx - transaction-context
     * @param tokenValue - the Value of the token that needs to be received.  Always includes
     *   the minUtxo needed for this authority token
     * @param fromFoundUtxo - always present when the authority token already existed; can be
     *   used to duplicate or iterate on an existing datum, or to include any additional Value in the new
     *   UTxO, to match the previous UTxO with minimal extra heuristics
     * @public
     **/
    abstract txnReceiveAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, tokenValue: Value, fromFoundUtxo?: TxInput): Promise<TCX>;
    mkAuthorityTokenPredicate(): import("../UtxoHelper.js").tokenPredicate<any>;
    get authorityTokenName(): number[];
    tvAuthorityToken(useMinTv?: boolean): Value;
    get delegateValidatorHash(): ValidatorHash | undefined;
    /**
     * Finds the delegate authority token, normally in the delegate's contract address
     * @public
     * @remarks
     *
     * The default implementation finds the UTxO having the authority token
     * in the delegate's contract address.
     *
     * @param tcx - the transaction context
     * @reqt It MUST resolve and return the UTxO (a TxInput type ready for spending)
     *  ... or throw an informative error
     **/
    abstract DelegateMustFindAuthorityToken(tcx: StellarTxnContext, label: string): Promise<TxInput>;
    /**
     * Adds the delegate's authority token to a transaction
     * @public
     * @remarks
     * Given a delegate already configured by a Capo, this method implements
     * transaction-building logic needed to include the UUT into the `tcx`.
     * the `utxo` is discovered by {@link StellarDelegate.DelegateMustFindAuthorityToken | DelegateMustFindAuthorityToken() }
     **/
    abstract DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, uutxo: TxInput, redeemer?: isActivity): Promise<TCX>;
    /**
     * Adds any important transaction elemements supporting the authority token being retired, closing the delegate contracts' utxo.
     * @remarks
     *
     * EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
     *
     * EXPECTS the `burn` instruction to be separately added to the transaction.
     *
     * The default implementation uses the conventional `Retiring` activity
     * to spend the token.
     *
     * @reqt
     * It MUST add the indicated utxo to the transaction as an input
     *
     * @reqt
     * When backed by a contract:
     *   * it should use an activity/redeemer allowing the token to be spent
     *      **and NOT returned**.
     *   * the contract script SHOULD ensure any other UTXOs it may also hold, related to this delegation,
     *      do not become inaccessible as a result.
     *
     * It MAY enforce additional requirements and/or block the action.
     *
     *
     * @param tcx - transaction context
     * @param fromFoundUtxo - the utxo having the authority otken
     * @public
     **/
    abstract DelegateRetiresAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, fromFoundUtxo: TxInput): Promise<TCX>;
    /**
     * Captures requirements as data
     * @remarks
     *
     * see reqts structure
     * @public
     **/
    delegateRequirements(): import("../Requirements.js").ReqtsMap<"provides an interface for providing arms-length proof of authority to any other contract" | "implementations SHOULD positively govern spend of the UUT" | "implementations MUST provide an essential interface for transaction-building" | "requires a txnReceiveAuthorityToken(tcx, delegateAddr, fromFoundUtxo?)" | "requires a mustFindAuthorityToken(tcx)" | "requires a txnGrantAuthority(tcx, delegateAddr, fromFoundUtxo)" | "requires txnRetireCred(tcx, fromFoundUtxo)", never>;
}
//# sourceMappingURL=StellarDelegate.d.ts.map