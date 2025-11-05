import {
    CapoWithoutSettings,
    CapoHeliosBundle,
    defineRole,
    delegateRoles,
} from "@donecollectively/stellar-contracts";

// import CapoBundleWithGenericUuts from "./CapoWithGenericUuts.hlb.js";
import { MintDelegateWithGenericUuts } from "../src/testing/specialMintDelegate/MintDelegateWithGenericUuts.js";
import {
    DelegatedDatumTester,
    DelegatedDatumTester2,
} from "../src/testing/DelegatedDatumTester.js";
import type { CapoDatum$Ergo$CharterData } from "../src/helios/scriptBundling/CapoHeliosBundle.typeInfo.js";

export class CapoCanMintGenericUuts extends CapoWithoutSettings {
    static useExtraModel = false;

    async getMintDelegate(): Promise<MintDelegateWithGenericUuts> {
        return super.getMintDelegate() as any;
    }
    async getSpendDelegate(): Promise<MintDelegateWithGenericUuts> {
        return super.getSpendDelegate() as any;
    }

    async scriptBundleClass(): Promise<typeof CapoHeliosBundle> {
        return CapoHeliosBundle;
    }
    async t() {
        const t = await this.getSpendDelegate();
        t.activity.CapoLifecycleActivities.commitPendingChanges;
    }

    /**
     * Finds and instantiates the controller for S3 Driver records
     */
    async getTestDataController(
        charterData?: CapoDatum$Ergo$CharterData
    ): Promise<DelegatedDatumTester> {
        if (!charterData) {
            charterData = await this.findCharterData();
        }
        return this.getDgDataController("testData", {
            charterData: charterData as CapoDatum$Ergo$CharterData,
        }) as Promise<DelegatedDatumTester>;
    }

    initDelegateRoles() {
        const inherited = super.initDelegateRoles();
        const {
            Reqt,
            mintDelegate: parentMintDelegate,
            ...othersInherited
        } = inherited;
        const { config, delegateClass, delegateType, uutPurpose } =
            parentMintDelegate;
        const mintDelegate = defineRole(
            "mintDgt",
            MintDelegateWithGenericUuts,
            {

                delegateClass: MintDelegateWithGenericUuts,
                validateConfig(args) {},
            }
        );
        const spendDelegate = defineRole(
            "spendDgt",
            MintDelegateWithGenericUuts,
            {
                delegateClass: MintDelegateWithGenericUuts,
                validateConfig(args) {},
            }
        );

        const { useExtraModel } = CapoCanMintGenericUuts;

        const testData2 = useExtraModel
            ? {
                  testData2: defineRole("dgDataPolicy", DelegatedDatumTester2, {
                      delegateClass: DelegatedDatumTester2,
                      validateConfig(args) {},
                  }),
              }
            : {};

        return delegateRoles({
            ...inherited,
            // noDefault: defineRole("", CapoMinter, {}),
            mintDelegate,
            spendDelegate,
            Reqt,
            // inventionPolicy: defineRole("dgDataPolicy", InventionPolicy, {})
            testData: defineRole("dgDataPolicy", DelegatedDatumTester, {}),
            ...testData2,
        });
    }
}
