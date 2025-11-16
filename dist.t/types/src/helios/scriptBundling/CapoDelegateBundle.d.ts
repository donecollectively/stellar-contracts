import { type Source } from "@helios-lang/compiler-utils";
import { CapoHeliosBundle } from "./CapoHeliosBundle.js";
import { HeliosScriptBundle } from "./HeliosScriptBundle.js";
import { type CapoBundleClass, type Constructor, type EmptyConstructor } from "../HeliosMetaTypes.js";
export type CapoDelegateBundleClass = new () => CapoDelegateBundle;
/**
 * @public
 */
export type ConcreteCapoDelegateBundle = typeof CapoDelegateBundle & Constructor<CapoDelegateBundle> & EmptyConstructor<CapoDelegateBundle> & {
    capoBundle: CapoHeliosBundle;
    isConcrete: true;
};
/**
 * for any Capo delegate; combines the BasicDelegate with a
 *  concrete specialization
 * @public
 **/
export declare abstract class CapoDelegateBundle extends HeliosScriptBundle {
    /**
     * The delegate module specialization for this script bundle.
     * @remarks
     * Basic mint/spend delegates can use the UnspecializedDelegateScript for this purpose.
     *
     * Delegated-data policy bundles need to provide their own specialization, probably
     * by using a template, or by copying the UnspecializedDelegateScript and adding any
     * application-specific logic needed.
     * @public
     */
    abstract specializedDelegateModule: Source;
    /**
     * indicates where the script params are sourced from
     * ### advanced usage
     * use "config" to draw the script params from a json file
     * use "bundle" to draw the script params from the bundle's params and/or defined variants
     */
    scriptParamsSource: "bundle" | "config";
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
    capoBundle: CapoHeliosBundle;
    isConcrete: boolean;
    /**
     * Creates a CapoDelegateBundle subclass based on a specific CapoHeliosBundle class
     */
    static usingCapoBundleClass<THIS extends typeof CapoDelegateBundle, CB extends CapoBundleClass>(this: THIS, c: CB, generic?: "generic" | false): ConcreteCapoDelegateBundle;
    get main(): Source;
    get params(): {
        rev: bigint;
        delegateName: string;
        isMintDelegate: boolean;
        isSpendDelegate: boolean;
        isDgDataPolicy: boolean;
        requiresGovAuthority: boolean;
    };
    get moduleName(): string;
    getEffectiveModuleList(): Source[];
    get modules(): Source[];
    mkDelegateWrapper(moduleName: any): Source;
}
//# sourceMappingURL=CapoDelegateBundle.d.ts.map