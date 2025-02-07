import { CapoDelegateBundle } from "../../delegation/CapoDelegateBundle.js";

/**
 * base class for helios code bundles for a mint/spend delegate
 * @public
 */
export abstract class MintSpendDelegateBundle extends CapoDelegateBundle {
    
    get params() {
        return {
            rev: this.rev,
            delegateName: this.moduleName,
            isMintDelegate: true,
            isSpendDelegate: true,
            isDgDataPolicy: false,
        }
    }   
}