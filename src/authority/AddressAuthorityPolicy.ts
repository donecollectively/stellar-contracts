import {
    Address,
    AssetClass,
    Assets,
    TxInput,
    TxOutput,
    Value,
} from "@hyperionbt/helios";
import { SeedTxnParams } from "../SeedTxn.js";
import {
    Activity,
    StellarContract,
    isActivity,
    partialTxn,
} from "../StellarContract.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import { AuthorityPolicy } from "./AuthorityPolicy.js";

export class AddressAuthorityPolicy extends AuthorityPolicy {
    loadProgramScript(params) {
        return undefined;
    }
    @Activity.redeemer
    protected usingAuthority(): isActivity {
        const r = this.scriptProgram?.types.Redeemer;
        const { usingAuthority } = r;
        if (!usingAuthority) {
            throw new Error(
                `invalid contract without a usingAuthority redeemer`
            );
        }
        const t = new usingAuthority();

        return { redeemer: t._toUplcData() };
    }

    //! impls MUST resolve the indicated token to a specific UTxO
    //  ... or throw an informative error
    async txnMustFindAuthorityToken(tcx): Promise<TxInput> {
        if (!this.configIn)
            throw new Error(`must be instantiated with a configIn`);
        const { uut, addrHint } = this.configIn;
        const v = this.mkAssetValue(uut);
        debugger;
        return this.mustFindActorUtxo(
            `authority-token(address strat)`,
            this.mkTokenPredicate(v),
            tcx,
            "are you connected to the right wallet address? " +
                (addrHint?.length
                    ? "  maybe at:\n    " + addrHint.join("\n or ")
                    : "")
        );
    }

    //! creates a UTxO depositing the indicated token-name into the delegated destination.
    async txnReceiveAuthorityToken(
        tcx: StellarTxnContext,
        delegateAddr: Address
    ): Promise<StellarTxnContext> {
        if (!this.configIn)
            throw new Error(`must be instantiated with a configIn`);
        const { uut } = this.configIn;
        const v = this.mkAssetValue(uut, 1);
        const output = new TxOutput(delegateAddr, v);
        output.correctLovelace(this.networkParams);
        tcx.addOutput(output);

        return tcx;
    }

    //! Adds the indicated token to the txn as an input with apporpriate activity/redeemer
    //! EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
    async txnGrantAuthority(
        tcx: StellarTxnContext,
        fromFoundUtxo: TxInput
    ): Promise<StellarTxnContext> {
        //! no need to specify a redeemer
        return tcx.addInput(fromFoundUtxo);
    }

    //! Adds the indicated utxo to the transaction with appropriate activity/redeemer
    //  ... allowing the token to be burned by the minting policy.
    //! EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
    async txnRetireCred(
        tcx: StellarTxnContext,
        fromFoundUtxo: TxInput
    ): Promise<StellarTxnContext> {
        //! no need to specify a redeemer
        return tcx.addInput(fromFoundUtxo);
    }
}
