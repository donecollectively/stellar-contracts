import {
    Datum,
    TxInput,
    ValidatorHash,
    Value,
    bytesToText,
} from "@hyperionbt/helios";
import { Activity, StellarContract, datum } from "../StellarContract.js";
import type { configBase, isActivity } from "../StellarContract.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import { mkTv } from "../utils.js";
import type { InlineDatum } from "../HeliosPromotedTypes.js";
import type {
    DelegationDetail,
    capoDelegateConfig,
} from "./RolesAndDelegates.js";
import { hasReqts } from "../Requirements.js";
import { dumpAny } from "../diagnostics.js";

/**
 * Base class for modules that can serve as Capo delegates
 * @public
 * @remarks
 *
 * establishes a base protocol for delegates.
 * @typeParam CT - type of any specialized configuration; use capoDelegateConfig by default.
 **/

export abstract class StellarDelegate<
    CT extends configBase & capoDelegateConfig = capoDelegateConfig,
    DCCT extends Record<string, any> | string = string
> extends StellarContract<CT> {
    static currentRev = 1n;
    static get defaultParams() {
        return { rev: this.currentRev };
    }

    /**
     * Finds and adds the delegate's authority token to the transaction
     * @remarks
     *
     * calls the delegate-specific DelegateAddsAuthorityToken() method,
     * with the uut found by DelegateMustFindAuthorityToken().
     *
     * returns the token back to the contract using {@link txnReceiveAuthorityToken | txnReceiveAuthorityToken() }
     * @param tcx - transaction context
     * @public
     **/
    async txnGrantAuthority<TCX extends StellarTxnContext>(tcx: TCX, redeemer? : isActivity) {
        const label = `${this.constructor.name} authority`;
        const uutxo = await this.DelegateMustFindAuthorityToken(tcx, label);
        const useMinTv = true;
        const authorityVal = this.tvAuthorityToken(useMinTv);
        console.log(
            `   ------- delegate '${label}' grants authority with ${dumpAny(
                authorityVal,
                this.networkParams
            )}`
        );

        try {
            const tcx2 = await this.DelegateAddsAuthorityToken(tcx, uutxo, redeemer || this.activityAuthorizing());
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

    /**
     * redeemer for exercising the authority of this delegate via its authority UUT
     * @public
     * @remarks
     *
     * The Authorizing redeemer indicates that the delegate is authorizing (certain parts of)
     * a transaction.
     *
     **/
    @Activity.redeemer
    activityAuthorizing() {
        const thisActivity = this.mustGetActivity("Authorizing");
        const t = new thisActivity();

        return { redeemer: t._toUplcData() };
    }

    /**
     * redeemer for spending the authority UUT for burning it.
     * @public
     * @remarks
     *
     * The Retiring redeemer indicates that the delegate is being
     * removed.
     *
     **/
    @Activity.redeemer
    activityRetiring() {
        const thisActivity = this.mustGetActivity("Retiring");
        const t = new thisActivity();

        return { redeemer: t._toUplcData() };
    }

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
    @datum
    mkDatumIsDelegation(
        dd: DelegationDetail,
        ...args: DCCT extends string ? [string] | [] : [DCCT]
    ): InlineDatum {
        const [customConfig = ""] = args;
        const { IsDelegation } = this.onChainDatumType;
        const { DelegationDetail } = this.onChainTypes;
        const t = new IsDelegation(new DelegationDetail(dd), customConfig);
        return Datum.inline(t._toUplcData());
    }
    /**
     * returns the ValidatorHash of the delegate script, if relevant
     * @public
     * @remarks
     *
     * A delegate that doesn't use an on-chain validator should override this method and return undefined.
     **/
    get delegateValidatorHash(): ValidatorHash | undefined {
        if (!this.validatorHash) {
            throw new Error(
                `${this.constructor.name}: address doesn't use a validator hash!\n` +
                    `  ... if that's by design, you may wish to override 'get delegateValidatorHash()'`
            );
        }
        return this.validatorHash;
    }

    mkAuthorityTokenPredicate() {
        return this.mkTokenPredicate(this.tvAuthorityToken());
    }
    tvAuthorityToken(useMinTv: boolean = false) {
        if (!this.configIn)
            throw new Error(`must be instantiated with a configIn`);

        const {
            mph,
            tn,
            // reqdAddress,  // removed
        } = this.configIn;
        if (useMinTv) return this.mkMinTv(mph, tn);
        return mkTv(mph, tn);
    }

    /**
     * Finds the delegate authority token, normally in the delegate's contract address
     * @public
     * @remarks
     *
     * The default implementation finds the UTxO having the authority token
     * in the delegate's contract address.
     *
     * It's possible to have a delegate that doesn't have an on-chain contract script.
     * ... in this case, the delegate should use this.{@link StellarDelegate.tvAuthorityToken | tvAuthorityToken()} and a
     * delegate-specific heuristic to locate the needed token.  It might consult the
     * addrHint in its `configIn` or another technique for resolution.
     *
     * @param tcx - the transaction context
     * @reqt It MUST resolve and return the UTxO (a TxInput type ready for spending)
     *  ... or throw an informative error
     **/
    async findAuthorityToken(): Promise<TxInput | undefined> {
        const { address } = this;
        return this.hasUtxo(
            `authority token: ${bytesToText(this.configIn!.tn)}`,
            this.mkTokenPredicate(this.tvAuthorityToken()),
            { address }
        );
    }

    /**
     * Tries to locate the Delegates authority token in the user's wallet (ONLY for non-smart-contract delegates)
     * @remarks
     *
     * Locates the authority token,if available the current user's wallet.
     *
     * If the token is located in a smart contract, this method will always return `undefined`.  
     * Use {@link StellarDelegate.findAuthorityToken | findAuthorityToken()} in that case.
     *
     * If the authority token is in a user wallet (not the same wallet as currently connected to the Capo contract class),
     * it will return `undefined`.
     *
     * @public
     **/
    async findActorAuthorityToken(): Promise<TxInput | undefined> {
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
     * It's possible to have a delegate that doesn't have an on-chain contract script.
     * ... in this case, the delegate should use this.{@link StellarDelegate.tvAuthorityToken | tvAuthorityToken()} and a
     * delegate-specific heuristic to locate the needed token.  It might consult the
     * addrHint in its `configIn` or another technique for resolution.
     *
     * @param tcx - the transaction context
     * @reqt It MUST resolve and return the UTxO (a TxInput type ready for spending)
     *  ... or throw an informative error
     **/
    async DelegateMustFindAuthorityToken(
        tcx: StellarTxnContext,
        label: string
    ): Promise<TxInput> {
        return this.mustFindMyUtxo(
            `${label}: ${bytesToText(this.configIn!.tn)}`,
            this.mkTokenPredicate(this.tvAuthorityToken()),
            "this delegate strategy might need to override txnMustFindAuthorityToken()"
        );
    }

    /**
     * Adds the delegate's authority token to a transaction
     * @public
     * @remarks
     * Given a delegate already configured by a Capo, this method implements
     * transaction-building logic needed to include the UUT into the `tcx`.
     * the `utxo` is discovered by {@link StellarDelegate.DelegateMustFindAuthorityToken | DelegateMustFindAuthorityToken() }
     * 
     * The default implementation adds the `uutxo` to the transaction 
     * using {@link StellarDelegate.activityAuthorizing | activityAuthorizing() }.
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
     *  * that the token is spent with Authorizing activity (redeemer).  NOTE:
     *     the **CapoDelegateHelpers** helios module provides the `requiresDelegateAuthorizing()` 
     *     function for just this purpose
    
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
    protected async DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(
        tcx: TCX,
        uutxo: TxInput,
        redeemer: isActivity
    ): Promise<TCX> {
        const {capo} = this.configIn!;
        return capo.txnAttachScriptOrRefScript(
            tcx.addInput(uutxo, redeemer),
            this.compiledScript
        )

        // return this.txnKeepValue(
        //     tcx,
        //     uutxo.value,
        //     uutxo.origOutput.datum as InlineDatum
        // );
    }

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
    protected async DelegateRetiresAuthorityToken(
        tcx: StellarTxnContext,
        fromFoundUtxo: TxInput
    ): Promise<StellarTxnContext> {
        const utxo = fromFoundUtxo;
        return tcx.addInput(
            new TxInput(utxo.outputId, utxo.origOutput),
            this.activityRetiring()
        );
    }

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
                        "  ... in whatever way is considered appropriate for its use-case.",
                        "An interface method whose requirement is marked with 'MAY/SHOULD' behavior, ",
                        "  ... MUST still implement the method satisfying the interface, ",
                        "  ... but MAY throw an UnsupportedAction error, to indicate that",
                        "  ... the strategy variant has no meaningful action to perform ",
                        "  ... that would serve the method's purpose",
                    ],
                    mech: [],
                    requires: [
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
