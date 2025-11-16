import { CapoDelegateBundle } from "./CapoDelegateBundle.js";
import type { Source } from "@helios-lang/compiler-utils";
/**
 * base class for helios code bundles for a mint/spend delegate
 * @public
 */
export declare abstract class MintSpendDelegateBundle extends CapoDelegateBundle {
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
    requiresGovAuthority: boolean;
    scriptParamsSource: "config";
    /**
     * returns an unspecialized module that works for basic use-cases of mint/spend delegate
     * @public
     */
    get unspecializedDelegateModule(): Source;
    get params(): {
        rev: bigint;
        delegateName: string;
        isMintDelegate: boolean;
        isSpendDelegate: boolean;
        isDgDataPolicy: boolean;
        requiresGovAuthority: true;
    };
}
//# sourceMappingURL=MintSpendDelegateBundle.d.ts.map