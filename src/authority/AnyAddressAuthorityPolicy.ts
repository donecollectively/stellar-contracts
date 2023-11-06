import {
    Address,
    AssetClass,
    Assets,
    TxInput,
    TxOutput,
    Value,
    bytesToText,
} from "@hyperionbt/helios";
import { SeedTxnParams } from "../SeedTxn.js";
import {
    Activity,
    StellarContract,
    isActivity,
    partialTxn,
} from "../StellarContract.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import { StellarDelegate } from "../delegation/StellarDelegate.js";
import { AuthorityPolicy } from "./AuthorityPolicy.js";

/**
 * Token-based authority
 * @remarks
 * 
 * Transferrable authority using a unique token and no smart-contract.
 * 
 * This simple strategy relies entirely on the presence of a specific, unique token
 * held in a wallet.  Authorizing activities using this strategy requires diligent review
 * by the person controlling the wallet, since it has no enforced validation logic.
 * 
 * @public
 **/
export class AnyAddressAuthorityPolicy extends AuthorityPolicy {
    loadProgramScript(params) {
        return undefined;
    }

    get delegateValidatorHash() {
        return undefined
    }

    @Activity.redeemer
    protected usingAuthority(): isActivity {
        const { usingAuthority } = this.onChainActivitiesType;
        if (!usingAuthority) {
            throw new Error(
                `invalid contract without a usingAuthority activity`
            );
        }
        const t = new usingAuthority();

        return { redeemer: t._toUplcData() };
    }

    //! impls MUST resolve the indicated token to a specific UTxO
    //  ... or throw an informative error
    async DelegateMustFindAuthorityToken(tcx: StellarTxnContext<any>, label: string): Promise<TxInput> {
        const v = this.tvAuthorityToken()
        const {addrHint} = this.configIn!

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

    async txnReceiveAuthorityToken<TCX extends StellarTxnContext<any>>(
        tcx: TCX,
        tokenValue: Value,
        fromFoundUtxo: TxInput
    ): Promise<TCX> {
        let dest : Address;
        if (fromFoundUtxo) { 
            dest = fromFoundUtxo.address
        } else {
            if (!this.configIn?.addrHint?.[0])
                throw new Error(
                    `missing addrHint`
                );
            const {
                addrHint,
                // reqdAddress,  // removed
            } = this.configIn;
            dest = addrHint[0]
        }

        const output = new TxOutput(dest, tokenValue);
        output.correctLovelace(this.networkParams);
        tcx.addOutput(output);

        return tcx;
    }

    //! Adds the indicated token to the txn as an input with apporpriate activity/redeemer
    //! EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
    async DelegateAddsAuthorityToken<TCX extends StellarTxnContext<any>>(
        tcx: TCX,
        fromFoundUtxo: TxInput
    ): Promise<TCX & StellarTxnContext<any>> {
        //! no need to specify a redeemer
        return tcx.addInput(fromFoundUtxo);
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
