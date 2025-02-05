import { CapoDelegateBundle } from "../../delegation/CapoDelegateBundle.js";

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