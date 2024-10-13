import {
    Address,
    TxInput,
    TxOutput,
    Value,
    bytesToText,
} from "@hyperionbt/helios";
import { Activity } from "../StellarContract.js";

import type { isActivity } from "../StellarContract.js";

import { StellarTxnContext } from "../StellarTxnContext.js";
import { AuthorityPolicy } from "./AuthorityPolicy.js";
import { dumpAny } from "../diagnostics.js";
import { UplcInt } from "@helios-lang/uplc";

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
    loadBundle(params) {
        return undefined;
    }

    usesContractScript : boolean = false;


    getContractScriptParamsUplc() {
        return {
            rev: new UplcInt(0) as any
        }
    }

    get delegateValidatorHash() {
        return undefined;
    }

    /**
     * special-case activity for non-contract (no redeemer)
     */
    @Activity.redeemer
    activityAuthorizing(): isActivity {
        return { redeemer: undefined };
    }

    //! impls MUST resolve the indicated token to a specific UTxO
    //  ... or throw an informative error
    async DelegateMustFindAuthorityToken(
        tcx: StellarTxnContext,
        label: string
    ): Promise<TxInput> {
        const v = this.tvAuthorityToken();

        const { addrHint } = this.configIn!;
        return this.uh.mustFindActorUtxo(
            `${label}: ${bytesToText(this.configIn!.tn)}`,
            this.uh.mkTokenPredicate(v),
            tcx,
            "are you connected to the right wallet address? " +
                (addrHint?.length
                    ? "\nauthority token originally issued to " +
                      addrHint
                          .map((x) => {
                              const addr =
                                  "string" == typeof x ? Address.fromBech32(x) : x;
                              return dumpAny(addr) + " = " + addr.toBech32();
                          })
                          .join("\n or ")
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
            console.log(
                "    🐞🐞  " +
                    dumpAny(fromFoundUtxo.address, this.networkParams)
            );
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
        console.log(
            "    🐞🐞  ...with output" + dumpAny(output, this.networkParams)
        );

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
    async DelegateRetiresAuthorityToken<TCX extends StellarTxnContext>(
        tcx: TCX,
        fromFoundUtxo: TxInput
    ): Promise<TCX> {
        //! no need to specify a redeemer
        return tcx.addInput(fromFoundUtxo) as TCX;
    }
}
