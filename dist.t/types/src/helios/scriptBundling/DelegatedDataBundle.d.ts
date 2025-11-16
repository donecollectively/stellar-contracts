import type { Source } from "@helios-lang/compiler-utils";
import { CapoDelegateBundle } from "./CapoDelegateBundle.js";
/**
 * @public
 */
export declare abstract class DelegatedDataBundle extends CapoDelegateBundle {
    scriptParamsSource: "config" | "bundle";
    /**
     * The delegate module specialization for this script bundle.
     * @remarks
     * Each delegated-data policy bundle needs to provide its own specialization, probably
     * by using a template, or by copying the UnspecializedDelegateScript and adding any
     * application-specific logic needed.
     *
     * The specialized module must export `DelegateActivity` and `DelegateDatum` enums,
     * each of which follows the conventions seen in the UnspecializedDelegateScript.
     * The DelegateActivity's additionalDelegateValidation() function must handle MintingActivities,
     * BurningActivities, and SpendingActivities, to govern the creation, updating, and deletion of
     * delegated-data records for defined variants of their nested enums indicating delegate-specific
     * activities.
     *
     * For example, a Vesting delegate might have SpendingActivities::AddingFunds and
     * SpendingActivities::WithdrawingVestedValue; its DelegateActivity::additionalDelegateValidation()
     * would handle each of these cases according to the application's needs, along with any
     * creation or deletion activities within those DelegateActivity variants.
     *
     * The `xxxLifecycleActivities` variants are not handled by DelegatedData specializations; the
     * Capo's mint/spend delegate governs these variants of delegate behaviors.  A delegate bundle
     * receiving these activities will throw errors by virtue of the BasicDelegate's logic.
     *
     * Likewise, the `xxxDelegateData` variants are not handled by DelegatedData specializations,
     * but by the mint/spend delegate, which transfers its responsbility for these activities to your
     * specialized delegate.
     *
     * @public
     */
    abstract specializedDelegateModule: Source;
    /**
     * when set to true, the controller class will include the Capo's
     * gov authority in the transaction, to ease transaction setup.
     * @remarks
     * If you set this to false, a delegated-data script will not
     * require governance authority for its transactions, and you will
     * need to explicitly enforce any user-level permissions needed
     * for authorizing delegated-data transactions.
     * @public
     */
    abstract requiresGovAuthority: boolean;
    get params(): {
        rev: bigint;
        delegateName: string;
        isMintDelegate: boolean;
        isSpendDelegate: boolean;
        isDgDataPolicy: boolean;
        requiresGovAuthority: boolean;
    };
}
//# sourceMappingURL=DelegatedDataBundle.d.ts.map