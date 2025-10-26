import { CapoDelegateBundle } from "./CapoDelegateBundle.js";
import unspecializedDelegate from "../../delegation/UnspecializedDelegate.hl";
import type { Source } from "@helios-lang/compiler-utils";

/**
 * base class for helios code bundles for a mint/spend delegate
 * @public
 */
export abstract class MintSpendDelegateBundle extends CapoDelegateBundle {
    /**
     * The delegate module specialization for this mint/spend delegate script.
     * @remarks
     * Basic mint/spend delegates can use the UnspecializedDelegateScript for this purpose.
     * 
     * For more advanced mint/spend delegates, you may start from a template 
     * or copy the UnspecializedDelegateScript and add any application-specific logic needed.
     * 
     * @public
     */
    abstract specializedDelegateModule: Source;

    requiresGovAuthority = true
    scriptParamsSource = "config" as const

    /**
     * returns an unspecialized module that works for basic use-cases of mint/spend delegate
     * @public
     */
    get unspecializedDelegateModule() {
        return unspecializedDelegate
    }

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
