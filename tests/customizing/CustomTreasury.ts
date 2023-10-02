import { SeedTxnParams } from "../../lib/SeedTxn.js";
import { Activity, isActivity, stellarSubclass, txn } from "../../lib/StellarContract.js";
import { StellarTxnContext } from "../../lib/StellarTxnContext.js";
import { CustomMinter } from "./CustomMinter.js";
import { DefaultCapo } from "../../lib/DefaultCapo.js";

import contract from "./CustomTreasury.hl";
import { RoleMap, variantMap } from "../../lib/delegation/RolesAndDelegates.js";
import { DefaultMinter } from "../../lib/DefaultMinter.js";
import { BasicMintDelegate } from "../../lib/index.js";

export class CustomTreasury extends DefaultCapo<CustomMinter> {
    contractSource() {
        return contract;
    }

    get minterClass(): stellarSubclass<CustomMinter, SeedTxnParams> {
        return CustomMinter;
    }
    declare minter: CustomMinter;

    static get defaultParams() {
        return {}
    }

    get roles() : RoleMap {
        return {
            noDefault: variantMap<BasicMintDelegate>({ 
            }),
            mintDelegate: variantMap<DefaultMinter>({ 
                default: {
                    delegateClass:  CustomMinter,
                    validateScriptParams(a) {
                        return undefined // any params are okay here (temporary)
                    }
                }
            })
        }
    }

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
