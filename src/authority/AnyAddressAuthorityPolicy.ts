import {
    Address,
    AssetClass,
    Assets,
    TxInput,
    TxOutput,
    Value,
    bytesToText,
} from "@hyperionbt/helios";
import type { SeedTxnParams } from "../SeedTxn.js";
import { Activity, StellarContract, partialTxn } from "../StellarContract.js";

import type { isActivity } from "../StellarContract.js";

import { StellarTxnContext } from "../StellarTxnContext.js";
import { StellarDelegate } from "../delegation/StellarDelegate.js";
import { AuthorityPolicy } from "./AuthorityPolicy.js";
import { dumpAny } from "../diagnostics.js";

/**
 * Token-based authority
 * @remarks
 * 
 * Transferrable authority using a unique token and no smart-contract.
 *     Network,
    Wallet,

 * @public
 **/
export class AnyAddressAuthorityPolicy extends AuthorityPolicy {
    loadProgramScript(params) {
        return undefined;
    }

    get delegateValidatorHash() {
        return undefined;
    }

    @Activity.redeemer
    activityAuthorizing() : isActivity<undefined> {
        return { redeemer: undefined};
    }

    @Activity.redeemer
    protected activityUsingAuthority(): isActivity {
        throw new Error(`usingAuthority is only used in capo contracts.  use activityAuthorizing() for delegates`);
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
        const { wallet } = this;
        return this.hasUtxo(
            `authority token: ${bytesToText(this.configIn!.tn)}`,
            this.mkTokenPredicate(this.tvAuthorityToken()),
            { wallet }
        );
    }

    async findActorAuthorityToken(): Promise<TxInput | undefined> {
        return this.findAuthorityToken();
    }

    //! impls MUST resolve the indicated token to a specific UTxO
    //  ... or throw an informative error
    async DelegateMustFindAuthorityToken(
        tcx: StellarTxnContext,
        label: string
    ): Promise<TxInput> {
        const v = this.tvAuthorityToken();
        const { addrHint } = this.configIn!;

        return this.mustFindActorUtxo(
            `${label}: ${bytesToText(this.configIn!.tn)}`,
            this.mkTokenPredicate(v),
            tcx,
            "are you connected to the right wallet address? " +
                (addrHint?.length
                    ? "  maybe at:\n    " + addrHint.join("\n or ")
                    : "")
        );
    }

    async txnReceiveAuthorityToken<TCX extends StellarTxnContext>(
        tcx: TCX,
        tokenValue: Value,
        fromFoundUtxo: TxInput
    ): Promise<TCX> {
        let dest: Address;
        console.log("🐞🐞  receive authority token");
        if (fromFoundUtxo) {
            dest = fromFoundUtxo.address;
            console.log("    🐞🐞  " + dumpAny(fromFoundUtxo.address, this.networkParams));
        } else {
            if (!this.configIn?.addrHint?.[0])
                throw new Error(`missing addrHint`);
            const {
                addrHint,
                // reqdAddress,  // removed
            } = this.configIn;
            dest = addrHint[0];
        }

        const output = new TxOutput(dest, tokenValue);
        output.correctLovelace(this.networkParams);
        tcx.addOutput(output);
        console.log("    🐞🐞  ...with output" + dumpAny(output, this.networkParams));

        return tcx;
    }

    //! Adds the indicated token to the txn as an input with apporpriate activity/redeemer
    //! EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
    async DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(
        tcx: TCX,
        fromFoundUtxo: TxInput,
        redeemer?: isActivity
    ): Promise<TCX> {
        //! no need to specify a redeemer, but we pass it through 
        //  ... in case the authority token is stored in a contract,
        //  ... which would need a redeemer to spend it.  In that case,
        //  ... the caller will need to add the script to the transaction.
        return tcx.addInput(fromFoundUtxo, redeemer);
    }

    //! Adds the indicated utxo to the transaction with appropriate activity/redeemer
    //  ... allowing the token to be burned by the minting policy.
    //! EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
    async DelegateRetiresAuthorityToken(
        tcx: StellarTxnContext,
        fromFoundUtxo: TxInput
    ): Promise<StellarTxnContext> {
        //! no need to specify a redeemer
        return tcx.addInput(fromFoundUtxo);
    }
}
