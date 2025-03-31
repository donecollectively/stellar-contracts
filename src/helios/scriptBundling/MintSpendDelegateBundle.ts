import { CapoDelegateBundle } from "./CapoDelegateBundle.js";

/**
 * base class for helios code bundles for a mint/spend delegate
 * @public
 */
export abstract class MintSpendDelegateBundle extends CapoDelegateBundle {
    requiresGovAuthority = true
    scriptParamsSource = "bundle" as const

    get params() {
        if (!this.requiresGovAuthority) {
            throw new Error("MintSpendDelegateBundle requiresGovAuthority must not be false")
        }
        
        return {
            rev: this.rev,
            delegateName: this.moduleName,
            isMintDelegate: true,
            isSpendDelegate: true,
            isDgDataPolicy: false,
            requiresGovAuthority: this.requiresGovAuthority,
        }
    }   
}
