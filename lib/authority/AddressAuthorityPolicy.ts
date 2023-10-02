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
import { StellarTxnContext } from "../index.js";
import { AuthorityPolicy } from "./AuthorityPolicy.js";

export class AddressAuthorityPolicy extends AuthorityPolicy {
    @Activity.redeemer
    protected usingAuthority(): isActivity {
        const r = this.configuredContract.types.Redeemer;
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
    async mustFindAuthorityToken(tcx, tokenId: AssetClass): Promise<TxInput> {
        const v = this.mkAssetValue(tokenId);
        return this.mustFindActorUtxo(
            `authority-token(address strat)`,
            this.mkTokenPredicate(v),
            tcx,
            "are you connected to the right wallet address?"
        );
    }

    //! creates a UTxO depositing the indicated token-name into the delegated destination.
    async txnReceiveAuthorityToken(
        tcx: StellarTxnContext,
        tokenId: AssetClass,
        delegateAddr: Address,
        sourceUtxo?: TxInput
    ): Promise<StellarTxnContext> {
        //! no need to reference the sourceUtxo

        const v = this.mkAssetValue(tokenId, 1);
        const output = new TxOutput(delegateAddr, v);
        output.correctLovelace(this.networkParams);
        tcx.addOutput(output);

        return tcx;
    }

    //! Adds the indicated token to the txn as an input with apporpriate activity/redeemer
    async txnGrantAuthority(
        tcx: StellarTxnContext,
        tokenId: AssetClass,
        sourceUtxo: TxInput,
        delegateAddr: Address
    ): Promise<StellarTxnContext> {
        //! no need to specify a redeemer
        return tcx.addInput(sourceUtxo);
    }

    //! Adds the indicated utxo to the transaction with appropriate activity/redeemer
    //  ... allowing the token to be burned by the minting policy.
    async txnRetireCred(
        tcx: StellarTxnContext,
        tokenId: AssetClass,
        sourceUtxo: TxInput,
        delegateAddr: Address
    ): Promise<StellarTxnContext> {
        //! no need to specify a redeemer
        return tcx.addInput(sourceUtxo);
    }
}
