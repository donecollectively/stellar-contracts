import { makeSource, type Source } from "@helios-lang/compiler-utils";
import { CapoHeliosBundle } from "./CapoHeliosBundle.js";
import {
    HeliosScriptBundle,
    placeholderSetupDetails,
} from "./HeliosScriptBundle.js";
import {
    type CapoBundleClass,
    type Constructor,
    type EmptyConstructor
} from "../HeliosMetaTypes.js";
import BasicDelegate from "../../delegation/BasicDelegate.hl";
import type { configBaseWithRev, StellarBundleSetupDetails, stellarSubclass } from "../../StellarContract.js";
// .hl files are transpiled to helios Source (JS object) attributes.
import type { capoDelegateConfig } from "../../delegation/RolesAndDelegates.js";
// ?? any important need to export the transpiled source?
// export {BasicDelegate}

export type CapoDelegateBundleClass = new () => CapoDelegateBundle;

// this class expresses a "has dependences from the Capo" semantic,
// ... not because it expects any dynamic code dependencies from an
// ... application-specific Capo.  Also, this class being abstract, it never
// ... is used directly.  The direct requirements of its included code from
// ... BasicDelegate are easily satisfied by the unspecialized Capo bundle.
//
// Subclasses of this class MAY have application-specific dependencies
// ... to be provided by an application-specific Capo.

const USING_EXTENSION = Symbol("USING_EXTENSION");

/**
 * @public
 */
export type ConcreteCapoDelegateBundle = typeof CapoDelegateBundle &
    Constructor<CapoDelegateBundle> & 
    EmptyConstructor<CapoDelegateBundle> &

    {
        capoBundle: CapoHeliosBundle;
        isConcrete: true;
    };

/**
 * for any Capo delegate; combines the BasicDelegate with a
 *  concrete specialization
 * @public
 **/
export abstract class CapoDelegateBundle extends HeliosScriptBundle {
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
    scriptParamsSource : "bundle" | "config" = "bundle" as const
    
    
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
    declare capoBundle: CapoHeliosBundle;
    isConcrete = false;

    /**
     * Creates a CapoDelegateBundle subclass based on a specific CapoHeliosBundle class
     */
    static usingCapoBundleClass<
        THIS extends typeof CapoDelegateBundle,
        CB extends CapoBundleClass
    >(
        this: THIS, 
        c: CB, 
        generic : "generic" | false = false
    ) : ConcreteCapoDelegateBundle {
        //@ts-expect-error returning a subclass without concrete implementations
        // of the abstract members; hopefully the subclass will error if they're missing
        const cb = new c(placeholderSetupDetails);
        //@ts-expect-error - same as above
        const newClass = class aCapoBoundBundle extends this {
            capoBundle = cb;
            constructor(setupDetails: StellarBundleSetupDetails<any> = placeholderSetupDetails) {
                super(setupDetails);
            }
            isConcrete = !!!generic;
        } as typeof newClass
        // as typeof CapoDelegateBundle & CapoDelegateBundleClass // & CB

        return newClass
    }

    // constructor(public capoBundle: CapoHeliosBundle) {
    //     super();
    // }

    get main() {
        return BasicDelegate;
    }

    get params() {
        return {
            rev: this.rev,
            delegateName: this.moduleName,
            isMintDelegate: false,
            isSpendDelegate: false,
            isDgDataPolicy: false,
            requiresGovAuthority: this.requiresGovAuthority,
        }
    }

    get moduleName() {
        
        const specialDgt = this.specializedDelegateModule;
        if (!specialDgt.moduleName) {
            throw new Error(
                "specializedDelegate module must have a moduleName"
            );
        }
        return specialDgt.moduleName;
    }

    getEffectiveModuleList() {
        const specialDgt = this.specializedDelegateModule;
        const delegateWrapper = this.mkDelegateWrapper(specialDgt.moduleName);

        return [
            ... super.getEffectiveModuleList(),
            delegateWrapper,
            this.specializedDelegateModule,
        ]
    }

    get modules(): Source[] {
        return []
    }

    mkDelegateWrapper(moduleName) {
        const indent = " ".repeat(8);
        const src = `module specializedDelegate
import {
    DelegateActivity,
    DelegateDatum,
    BurningActivity,
    MintingActivity,
    SpendingActivity
} from ${moduleName}\n`;
        // console.log("mkDelegateWrapper:", new Error( src));
        return makeSource(src, {
            name: `generatedSpecializedDelegateModule`,
            project: "stellar-contracts",
            moreInfo:
                `${indent}- wraps ${moduleName} provided by ${this.constructor.name}\n` +
                `${indent}  (generated by stellar-contracts:src/delegation/ContractBasedDelegate.ts:mkDelegateWrapper())`,
        });
    }
}
