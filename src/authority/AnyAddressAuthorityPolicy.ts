import { makeIntData, type UplcInt } from "@helios-lang/uplc";

import { StellarTxnContext } from "../StellarTxnContext.js";
import { AuthorityPolicy } from "./AuthorityPolicy.js";
import { dumpAny } from "../diagnostics.js";
import type { isActivity } from "../ActivityTypes.js";
import { makeAddress, makeTxOutput } from "@helios-lang/ledger";
import type { Address, TxInput, Value } from "@helios-lang/ledger";

import { bytesToText } from "../HeliosPromotedTypes.js";
import type { UtxoSearchScope } from "../UtxoHelper.js";

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

    usesContractScript = false as const;
    getContractScriptParams() {
        return {
            rev: 0n,
        };
    }

    get delegateValidatorHash() {
        return undefined;
    }

    // /**
    //  * special-case activity for non-contract (no redeemer)
    //  */
    // @Activity.redeemer
    // activityAuthorizing(): isActivity {
    //     return { redeemer: undefined };
    // }

    //! impls MUST resolve the indicated token to a specific UTxO
    //  ... or throw an informative error
    async DelegateMustFindAuthorityToken(
        tcx: StellarTxnContext,
        label: string,
        options : UtxoSearchScope = {}
    ): Promise<TxInput> {
        const v = this.tvAuthorityToken();

        const { addrHint } = this.configIn!;
        const extraErrorHint = "are you connected to the right wallet address? " +
            (addrHint?.length
                ? "\nauthority token originally issued to " +
                addrHint
                    .map((x) => {
                        const addr = "string" == typeof x ? makeAddress(x) : x;
                        return (
                            dumpAny(addr) + " = " + addr.toString()
                        );
                    })
                    .join("\n or ")
                : "");
        const found = await this.uh.findActorUtxo(
            `${label}: ${bytesToText(this.configIn!.tn)}`,
            this.uh.mkTokenPredicate(v),
            {
                exceptInTcx: tcx,
                searchOthers: true,
                extraErrorHint,
            }
        );
        if (found) return found;
        throw this.uh.utxoSearchError(label, options, extraErrorHint);
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

        const output = makeTxOutput(dest, tokenValue);
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
        utxo: TxInput,
        redeemer?: isActivity
    ): Promise<TCX> {
        //! no need to specify a redeemer, but we pass it through
        //  ... in case the authority token is stored in a contract,
        //  ... which would need a redeemer to spend it.  In that case,
        //  ... the caller will need to add the script to the transaction.
        return tcx.addInput(utxo, redeemer);
    }

    //! Adds the indicated utxo to the transaction with appropriate activity/redeemer
    //  ... allowing the token to be burned by the minting policy.
    //! EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
    async DelegateRetiresAuthorityToken<TCX extends StellarTxnContext>(
        tcx: TCX,
        utxo: TxInput
    ): Promise<TCX> {
        //! no need to specify a redeemer
        return tcx.addInput(utxo) as TCX;
    }
}
