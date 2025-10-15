import {
    CapoWithoutSettings,
    CapoHeliosBundle,
    defineRole,
    delegateRoles
} from "@donecollectively/stellar-contracts";

// import CapoBundleWithGenericUuts from "./CapoWithGenericUuts.hlb.js";
import { MintDelegateWithGenericUuts } from "../src/testing/specialMintDelegate/MintDelegateWithGenericUuts.js";
import { DelegatedDatumTester, DelegatedDatumTester2 } from "../src/testing/DelegatedDatumTester.js";
import StructDatumTester from "../src/testing/StructDatumTester.hlb.js";

export class CapoCanMintGenericUuts extends CapoWithoutSettings {
    static useExtraModel = false;

    async getMintDelegate(): Promise<MintDelegateWithGenericUuts> {
        return super.getMintDelegate() as any
    }
    async getSpendDelegate(): Promise<MintDelegateWithGenericUuts> {
        return super.getSpendDelegate() as any
    }
    
    async scriptBundle(): Promise<CapoHeliosBundle> {
        return CapoHeliosBundle.create();
    }
    async t() {
        const t = await this.getSpendDelegate()
        t.activity.CapoLifecycleActivities.commitPendingChanges
    }
    
    initDelegateRoles() {
        const inherited = super.initDelegateRoles()
        const { Reqt, mintDelegate: parentMintDelegate, ...othersInherited } =
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

        const {useExtraModel} = CapoCanMintGenericUuts;

        const testData2 =  useExtraModel ? {
            testData2: defineRole("dgDataPolicy", DelegatedDatumTester2, {
                delegateClass: DelegatedDatumTester2,
                validateConfig(args) {
                }
            })
        } : {};

        return delegateRoles({
            ...inherited,
            // noDefault: defineRole("", CapoMinter, {}),
            mintDelegate,
            spendDelegate,
            Reqt,
            // inventionPolicy: defineRole("dgDataPolicy", InventionPolicy, {})
            testData: defineRole("dgDataPolicy", DelegatedDatumTester, {}),
            ...testData2,
        })
    }
}
