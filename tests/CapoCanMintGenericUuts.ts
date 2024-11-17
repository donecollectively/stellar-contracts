import {
    defineRole,
    delegateRoles
} from "../src/delegation/RolesAndDelegates";
import CapoBundleWithGenericUuts from "./CapoWithGenericUuts.hlbundle.js";
import { MintDelegateWithGenericUuts } from "../src/testing/specialMintDelegate/MintDelegateWithGenericUuts.js";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings";
import { DelegatedDatumTester } from "../src/testing/DelegatedDatumTester.js";

export class CapoCanMintGenericUuts extends CapoWithoutSettings {
    async getMintDelegate(): Promise<MintDelegateWithGenericUuts> {
        return super.getMintDelegate() as any
    }
    async getSpendDelegate(): Promise<MintDelegateWithGenericUuts> {
        return super.getSpendDelegate() as any
    }
    
    scriptBundle() {
        return new CapoBundleWithGenericUuts();
    }
    async t() {
        const t = await this.getSpendDelegate()
        t.activity.CapoLifecycleActivities.commitPendingDgtChanges
    }
    
    initDelegateRoles() {
        const inherited = super.basicDelegateRoles();
        const { mintDelegate: parentMintDelegate, ...othersInherited } =
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
            // inventionPolicy: defineRole("dgDataPolicy", InventionPolicy, {})
            testDataPolicy: defineRole("dgDataPolicy", DelegatedDatumTester, {}),
            
        })
    }
}
