import { SeedTxnParams } from "../../lib/Capo.js";
import { Activity, isActivity, stellarSubclass, txn } from "../../lib/StellarContract.js";
import { StellarTxnContext } from "../../lib/StellarTxnContext.js";
import { CustomMinter } from "../CustomMinter.js";
import { SampleTreasury } from "./SampleTreasury.js";

import contract from "./CustomTreasury.hl";

export class CustomTreasury extends SampleTreasury {
    contractSource() {
        return contract;
    }

    get minterClass(): stellarSubclass<CustomMinter, SeedTxnParams> {
        return CustomMinter;
    }
    declare minter: CustomMinter;

    @Activity.redeemer
    mintingToken(tokenName: string)  : isActivity {
        const t = new this.configuredContract.types.Redeemer.mintingToken(
            tokenName
        );

        return {redeemer: t._toUplcData() }
    }

    @txn
    async mkTxnMintNamedToken(
        tokenName: string,
        count: bigint,
        tcx: StellarTxnContext = new StellarTxnContext()
    ): Promise<StellarTxnContext> {
        console.log("minting named token ");
        return this.txnMustUseCharterUtxo(
            tcx,
            this.mintingToken(tokenName)
        ).then(async (_sameTcx) => {
            return this.minter!.txnMintingNamedToken(tcx, tokenName, count);
        });
    }
}
