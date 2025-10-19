import type { TxInput, ValidatorHash } from "@helios-lang/ledger";
import type { Value } from "@helios-lang/ledger";

import { StellarContract, type configBaseWithRev } from "../StellarContract.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import type { capoDelegateConfig } from "./RolesAndDelegates.js";
import type {
    ContractDataBridgeWithEnumDatum,
    ContractDataBridgeWithOtherDatum,
} from "../helios/dataBridge/DataBridge.js";
import type { AbstractNew } from "../helios/typeUtils.js";

import type { isActivity } from "../ActivityTypes.js";
import { hasReqts } from "../Requirements.js";
import { dumpAny } from "../diagnostics.js";
import { mkTv } from "../utils.js";
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
export abstract class StellarDelegate extends StellarContract<capoDelegateConfig> {
    static currentRev = 1n;
    static get defaultParams() {
        return {
            rev: this.currentRev,
        };
    }
    // not required except for Contract-based delegates.  A subclass can represent a delegation
    // relationship without an on-chain contract, resulting in there being no relevant data-bridge.
    declare dataBridgeClass:
        | AbstractNew<ContractDataBridgeWithEnumDatum>
        | undefined;

    existingRedeemerError(
        label: string,
        authorityVal: Value,
        existingRedeemer: UplcData,
        redeemerActivity?: UplcData
    ) {
        console.error(
            "This delegate authority is already being used in the transaction..."
        );
        console.error(
            "... you may use the {ifExists} option to handle this case, if appropriate"
        );

        return new Error(
            `Delegate ${label}: already added: ${dumpAny(
                authorityVal,
                this.networkParams
            )} with redeemer = ${existingRedeemer} ${
                redeemerActivity
                    ? `\n ... needs redeemer = ${redeemerActivity} (maybe with MultipleDelegateActivities?)`
                    : ""
            }`
        );
    }

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
    async txnGrantAuthority<TCX extends StellarTxnContext>(
        tcx: TCX,
        redeemer?: isActivity,
        options: GrantAuthorityOptions = {}
    ) {
        const label = `${this.constructor.name} authority`;
        const useMinTv = true;
        const authorityVal = this.tvAuthorityToken(useMinTv);
        const { skipReturningDelegate, ifExists } = options;

        const existing = tcx.hasAuthorityToken(authorityVal);
        if (existing) {
            const [existingInput, existingRedeemer] =
                (
                    (tcx.txb as any).spendingRedeemers as [TxInput, UplcData][]
                ).find(([inp, _redeemer]) =>
                    inp.value.isGreaterOrEqual(authorityVal)
                ) || ([] as any as [TxInput, UplcData]);
            if (ifExists) {
                ifExists(existingInput, existingRedeemer);
                // unreachable, but prevents a " | void" type alternative for the function
                return tcx;
            }

            throw this.existingRedeemerError(
                label,
                authorityVal,
                existingRedeemer
            );
        }

        const uutxo = await this.DelegateMustFindAuthorityToken(tcx, label);
        console.log(
            `   ------- delegate '${label}' grants authority with ${dumpAny(
                authorityVal,
                this.networkParams
            )}`
        );

        try {
            const tcx2 = await this.DelegateAddsAuthorityToken(
                tcx,
                uutxo,
                redeemer
            );
            if (skipReturningDelegate) return tcx2;
            return this.txnReceiveAuthorityToken(tcx2, authorityVal, uutxo);
        } catch (error: any) {
            if (error.message.match(/input already added/)) {
                throw new Error(
                    `Delegate ${label}: already added: ${dumpAny(
                        authorityVal,
                        this.networkParams
                    )}`
                );
            }
            throw error;
        }
    }

    /**
     * Finds the authority token and adds it to the transaction, tagged for retirement
     * @public
     * @remarks
     * Doesn't return the token back to the contract.
     **/
    async txnRetireAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX) {
        const uutxo = await this.DelegateMustFindAuthorityToken(
            tcx,
            `${this.constructor.name} authority`
        );
        return this.DelegateRetiresAuthorityToken(tcx, uutxo);
    }

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
    abstract txnReceiveAuthorityToken<TCX extends StellarTxnContext>(
        tcx: TCX,
        tokenValue: Value,
        // delegateAddr: Address,
        fromFoundUtxo?: TxInput
    ): Promise<TCX>;

    mkAuthorityTokenPredicate() {
        return this.uh.mkTokenPredicate(this.tvAuthorityToken());
    }
    get authorityTokenName() {
        return this.configIn!.tn;
    }

    tvAuthorityToken(useMinTv: boolean = false) {
        if (!this.configIn)
            throw new Error(`must be instantiated with a configIn`);

        const {
            mph,
            tn,
            // reqdAddress,  // removed
        } = this.configIn;
        if (useMinTv) return this.uh.mkMinTv(mph, tn);
        return mkTv(mph, tn);
    }

    get delegateValidatorHash(): ValidatorHash | undefined {
        return undefined;
    }

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
    abstract DelegateMustFindAuthorityToken(
        tcx: StellarTxnContext,
        label: string
    ): Promise<TxInput>;

    /**
     * Adds the delegate's authority token to a transaction
     * @public
     * @remarks
     * Given a delegate already configured by a Capo, this method implements
     * transaction-building logic needed to include the UUT into the `tcx`.
     * the `utxo` is discovered by {@link StellarDelegate.DelegateMustFindAuthorityToken | DelegateMustFindAuthorityToken() }
     **/
    abstract DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(
        tcx: TCX,
        uutxo: TxInput,
        redeemer?: isActivity
    ): Promise<TCX>;

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
    abstract DelegateRetiresAuthorityToken<TCX extends StellarTxnContext>(
        tcx: TCX,
        fromFoundUtxo: TxInput
    ): Promise<TCX>;

    /**
     * Captures requirements as data
     * @remarks
     *
     * see reqts structure
     * @public
     **/
    delegateRequirements() {
        return hasReqts({
            "provides an interface for providing arms-length proof of authority to any other contract":
                {
                    purpose:
                        "to decouple authority administration from its effects",
                    details: [
                        "Any contract can create a UUT for use with an authority policy.",
                        "By depositing that UUT to the authority contract, it can delegate completely",
                        "  ... all the implementation details for administration of the authority itself.",
                        "It can then focus on implementing the effects of authority, requiring only ",
                        "  ... that the correct UUT has been spent, to indicate that the authority is granted.",
                        "The authority contract can have its own internal details ",
                        "A subclass of this authority policy may provide additional administrative dynamics.",
                    ],
                    mech: [],
                    requires: [
                        "implementations SHOULD positively govern spend of the UUT",
                        "implementations MUST provide an essential interface for transaction-building",
                    ],
                },

            "implementations SHOULD positively govern spend of the UUT": {
                purpose: "for sufficient assurance of desirable safeguards",
                details: [
                    "A subclass of the GenericAuthority should take care of guarding the UUT's spend",
                    "  ... in whatever way is appropriate for its use-case",
                ],
                mech: [],
                requires: [],
            },

            "implementations MUST provide an essential interface for transaction-building":
                {
                    purpose:
                        "enabling a strategy-agnostic interface for making transactions using any supported strategy-variant",
                    details: [
                        "Subclasses MUST implement the interface methods",
                        "  ... in whatever way is good for its use-case.",
                        "An interface method whose requirement is marked with 'MAY/SHOULD' behavior, ",
                        "  ... MUST still implement the method satisfying the interface, ",
                        "  ... but MAY throw an UnsupportedAction error, to indicate that",
                        "  ... the strategy variant has no meaningful action to perform ",
                        "  ... that would serve the method's purpose",
                    ],
                    mech: [],
                    requires: [
                        //!!! todo: cross-check these requirements for completeness
                        //  ... and for accuracy
                        "requires a txnReceiveAuthorityToken(tcx, delegateAddr, fromFoundUtxo?)",
                        "requires a mustFindAuthorityToken(tcx)",
                        "requires a txnGrantAuthority(tcx, delegateAddr, fromFoundUtxo)",
                        "requires txnRetireCred(tcx, fromFoundUtxo)",
                    ],
                },

            "requires a txnReceiveAuthorityToken(tcx, delegateAddr, fromFoundUtxo?)":
                {
                    purpose:
                        "to deposit the authority token (back) to the delegated destination",
                    details: [
                        "impls MUST implement txnReceiveAuthorityToken",
                        "Each implemented subclass can use it's own style to match its strategy & mechanism",
                        "This is used both for the original deposit and for returning the token during a grant-of-authority",
                    ],
                    mech: [
                        "impls MUST create a UTxO depositing the indicated token-name into the delegated destination.",
                        "impls should normally preserve the datum from an already-present sourceUtxo",
                    ],
                    requires: [],
                },

            "requires a mustFindAuthorityToken(tcx)": {
                purpose: "to locate the given authority token",
                details: [
                    "allows different strategies for finding the UTxO having the authority token",
                    "impls MAY use details seen in the txn context to find the indicated token",
                ],
                mech: [
                    "impls MUST resolve the indicated token to a specific UTxO or throw an informative error",
                ],
            },

            "requires a txnGrantAuthority(tcx, delegateAddr, fromFoundUtxo)": {
                purpose: "to use the delegated authority",
                details: [
                    "Adds the indicated utxo to the transaction with appropriate activity/redeemer",
                    "Contracts needing the authority within a transaction can rely on the presence of this spent authority",
                    "Impls can EXPECT the token will be returned via txnReceiveAuthorityToken",
                    "a contract-backed impl SHOULD enforce the expected return in its on-chain code",
                ],
                mech: [
                    "the base AuthorityPolicy MUST call txnReceiveAuthorityToken() with the token's sourceUtxo",
                ],
            },

            "requires txnRetireCred(tcx, fromFoundUtxo)": {
                purpose: "to allow burning the authority token",
                details: [
                    "Adds the indicated utxo to the transaction with appropriate activity/redeemer",
                    "  ... allowing the token to be burned by the minting policy.",
                    "Impls SHOULD ensure any other UTXOs it may hold do not become inaccessible as a result",
                ],
                mech: [
                    "impls MUST add the token to the txn if it can be retired",
                    "if the token cannot be retired, by appropriate policy, it SHOULD throw an informative error",
                ],
            },
        });
    }
}
