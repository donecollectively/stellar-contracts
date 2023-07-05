import { seedUtxoParams } from "../../lib/Capo.js";
import { stellarSubclass, txn } from "../../lib/StellarContract.js";
import { StellarTxnContext } from "../../lib/StellarTxnContext.js";
import { CustomMinter } from "../CustomMinter.js";
import { SampleTreasury, chTok } from "./SampleTreasury.js";


export class CustomTreasury extends SampleTreasury {
    //! uses same main code as SampleTreasury
    //! points to a different minter class, which has a different minter contract-script

    get minterClass(): stellarSubclass<CustomMinter, seedUtxoParams> {
        return CustomMinter;
    }
    minter!: CustomMinter

    @txn
    async mkTxnMintNamedToken(
        tokenName: string,
        count: bigint,
        tcx: StellarTxnContext = new StellarTxnContext()
    ): Promise<StellarTxnContext> {
        return this.txnMustUseCharterUtxo(tcx).then(async (charterToken) => {
            tcx.addInput(
                charterToken[chTok],
                this.mintingToken(tokenName)
            ).attachScript(this.compiledContract);

            return this.minter!.txnMintingNamedToken(
                tcx,
                tokenName,
                count
            );
        });
    }
}