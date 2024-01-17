import { SeedTxnParams } from "../../src/SeedTxn.js";
import {
    Activity,
    isActivity,
    stellarSubclass,
    txn,
} from "../../src/StellarContract.js";
import { StellarTxnContext } from "../../src/StellarTxnContext.js";
import { CustomMinter } from "./CustomMinter.js";
import { DefaultCapo } from "../../src/DefaultCapo.js";

//@ts-expect-error importing a module provided by Rollup
import contract from "./CustomTreasury.hl";
import { RoleMap, defineRole } from "../../src/delegation/RolesAndDelegates.js";
import { BasicMintDelegate } from "../../src/minting/BasicMintDelegate.js";
import { BasicMinterParams, DefaultMinter } from "../../src/minting/DefaultMinter.js";

export class CustomTreasury extends DefaultCapo<CustomMinter> {
    contractSource() {
        return contract;
    }

    get minterClass(): stellarSubclass<CustomMinter, BasicMinterParams> {
        return CustomMinter;
    }
    declare minter: CustomMinter;

    static get defaultParams() {
        return {};
    }

    @Activity.redeemer
    activityMintingToken(tokenName: string): isActivity {
        const {mintingToken} = this.onChainActivitiesType
        const t = new mintingToken(
            tokenName
        );

        return { redeemer: t._toUplcData() };
    }

    @txn
    async mkTxnMintNamedToken(
        tokenName: string,
        count: bigint,
        tcx: StellarTxnContext = new StellarTxnContext(this.myActor)
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
