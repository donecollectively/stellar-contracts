import { SeedTxnParams } from "../../lib/SeedTxn.js";
import { Activity, isActivity, stellarSubclass, txn } from "../../lib/StellarContract.js";
import { StellarTxnContext } from "../../lib/StellarTxnContext.js";
import { CustomMinter } from "./CustomMinter.js";
import { DefaultCapo } from "../../lib/DefaultCapo.js";

import contract from "./CustomTreasury.hl";
import { RoleMap, variantMap } from "../../lib/delegation/RolesAndDelegates.js";
import { BasicMintDelegate } from "../../lib/delegation/BasicMintDelegate.js";
import { DefaultMinter } from "../../lib/DefaultMinter.js";

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
        const inherited = super.roles;
        const {mintDelegate, ... othersInherited} = inherited;
        return {
            ...othersInherited,
            noDefault: variantMap<DefaultMinter>({ 
            }),
            mintDelegate: variantMap<BasicMintDelegate>({ 
                ... mintDelegate,
                failsWhenBad: {
                    delegateClass:  BasicMintDelegate,
                    validateConfig(args) {
                        //@ts-expect-error so we can force test validation
                        if (args.bad) {
                            //note, this isn't the normal way of validating.
                            //  ... usually it's a good field name whose value is missing or wrong.
                            //  ... still, this conforms to the ErrorMap protocol good enough for testing.
                            return {bad:  [ "must not be provided" ]}
                        }
                    }
                },
                
            })
        }
    }

    @Activity.redeemer
    mintingToken(tokenName: string)  : isActivity {
        const t = new this.scriptProgram!.types.Redeemer.mintingToken(
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
