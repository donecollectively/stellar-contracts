import {
    defineRole,
    delegateRoles
} from "../src/delegation/RolesAndDelegates";
// import CapoBundleWithGenericUuts from "./CapoWithGenericUuts.hlbundle.js";
import { MintDelegateWithGenericUuts } from "../src/testing/specialMintDelegate/MintDelegateWithGenericUuts.js";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings";
import { DelegatedDatumTester } from "../src/testing/DelegatedDatumTester.js";
import { CapoHeliosBundle } from "../src/CapoHeliosBundle.js";
import StructDatumTester from "../src/testing/StructDatumTester.hlbundle.js";

export class CapoCanMintGenericUuts extends CapoWithoutSettings {
    async getMintDelegate(): Promise<MintDelegateWithGenericUuts> {
        return super.getMintDelegate() as any
    }
    async getSpendDelegate(): Promise<MintDelegateWithGenericUuts> {
        return super.getSpendDelegate() as any
    }
    
    scriptBundle() {
        return new CapoHeliosBundle();
    }
    async t() {
        const t = await this.getSpendDelegate()
        t.activity.CapoLifecycleActivities.commitPendingChanges
    }
    
    initDelegateRoles() {
        const inherited = super.initDelegateRoles()
        const { reqts, mintDelegate: parentMintDelegate, ...othersInherited } =
            inherited;
        const {
            config,
            delegateClass,
            delegateType,
            uutPurpose,
        } = parentMintDelegate;
        const mintDelegate = defineRole("mintDgt", MintDelegateWithGenericUuts, {
            // defaultV1: {
            //     delegateClass: BasicMintDelegate,
            //     validateConfig(args) {},
            // },

            delegateClass: MintDelegateWithGenericUuts,
            validateConfig(args) {
            }
        });
        const spendDelegate = defineRole("spendDgt", MintDelegateWithGenericUuts, {
            delegateClass: MintDelegateWithGenericUuts,
            validateConfig(args) {
            }
        });

        return delegateRoles({
            ...inherited,
            // noDefault: defineRole("", CapoMinter, {}),
            mintDelegate,
            spendDelegate,
            reqts,
            // inventionPolicy: defineRole("dgDataPolicy", InventionPolicy, {})
            testData: defineRole("dgDataPolicy", DelegatedDatumTester, {}),
            
        })
    }
}
