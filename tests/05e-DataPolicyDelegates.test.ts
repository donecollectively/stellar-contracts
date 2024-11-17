import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";

import { CapoMinter } from "../src/minting/CapoMinter";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate";
import { ADA, addTestContext, TestHelperState } from "../src/testing/types";
import { StellarTestContext } from "../src/testing/StellarTestContext";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";

import {
    DelegateConfigNeeded,
    DelegateMap,
    DelegateSetup,
    delegateRoles,
    delegateConfigValidation,
    defineRole,
} from "../src/delegation/RolesAndDelegates";
import { StellarTxnContext } from "../src/StellarTxnContext";
import { configBaseWithRev, txn } from "../src/StellarContract";
import { dumpAny, txAsString } from "../src/diagnostics";
import { Address } from "@hyperionbt/helios";
import { MintDelegateWithGenericUuts } from "../src/testing/specialMintDelegate/MintDelegateWithGenericUuts";
import { DelegatedDataContract } from "../src/delegation/DelegatedDataContract";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings";
import { expectTxnError } from "../src/testing/StellarTestHelper";
import UnspecializedDelegateBundle from "../src/delegation/UnspecializedDelegate.hlbundle.js"
import { hasReqts } from "../src/Requirements.js";
import { PendingDelegateActionHelper } from "../src/CapoHeliosBundle.bridge.js";
import { dgtStateKey, hasAllUuts } from "../src/Capo.js";
import { CapoTestHelper } from "../src/testing/CapoTestHelper.js";

class DataPolicyDelegateTestCapo extends CapoWithoutSettings {
    async getMintDelegate(): Promise<MintDelegateWithGenericUuts> {
        return (await super.getMintDelegate()) as MintDelegateWithGenericUuts;
    }

    @txn
    async mkTxnInstallingPolicyDelegate<
        const RoLabel extends string & keyof this["delegateRoles"]
    >(dgtRole: RoLabel) {
        const mintDelegate = await this.getMintDelegate();
        const tcx1 = await this.tcxWithSeedUtxo(mintDelegate.mkTcx());
        const tcx2 = await this.mkTxnQueuingDelegateChange("Add", 
            dgtRole, 
            undefined,
            tcx1
        );
        return tcx2
            
        //     "Add" | "Replace",
        //     action: dgtAction.(tcx1, {
        //         purpose,
        //         delegateValidatorHash,
        //         config: []
        //     }}
        // });
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
            inventionPolicy: defineRole("dgDataPolicy", InventionPolicy, {})
            
        })// as any; // TODO - update types so this structure fits the expected type
    }
}

export class InventionPolicy extends DelegatedDataContract {
    get delegateName() { return "invention" }
    get recordTypeName() { return "invent" }

    scriptBundle() {
        return this.mkBundleWithCapo(UnspecializedDelegateBundle)
    }
    requirements() {
        return hasReqts({
            "is a placeholder for testing any delegated-data policy": {
                details: [
                    "provides a record type",
                ],
                purpose: "for testing delegated-data policy lifecycle & basics",
                mech: [
                    "placeholder",
                ]
            }
        })
    }
}

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

class DataPolicyTestHelper extends DefaultCapoTestHelper.forCapoClass(DataPolicyDelegateTestCapo) {
    get capo(): DataPolicyDelegateTestCapo {
        return this.strella;
    }

    @CapoTestHelper.hasNamedSnapshot("installingInventionPolicy", "tina")
    async snapToInstallingInventionPolicy() {
        console.log("never called");
        return this.installingInventionPolicy();
    }
    async installingInventionPolicy() {
        const tcx = await this.capo.mkTxnInstallingPolicyDelegate("inventionPolicy");
        return this.submitTxnWithBlock(tcx);
    }

    @CapoTestHelper.hasNamedSnapshot("hasInventionPolicyDgt", "tina")
    async snapToInstalledInventionPolicy() {
        console.log("never called");
        return this.installedInventionPolicy();
    }

    async installedInventionPolicy() {
        await this.snapToInstallingInventionPolicy();

        const tcx = await this.capo.mkTxnCommittingPendingDgtChanges();
        return this.submitTxnWithBlock(tcx);
    }
}

type localTC = StellarTestContext<DataPolicyTestHelper>;
let helperState: TestHelperState<DataPolicyDelegateTestCapo> = {
    snapshots: {},
} as any;


describe("Capo", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(
            context, DataPolicyTestHelper, 
            undefined,
            helperState
        );
    });

    describe("Creating data-policy delegate", () => {
        let capo : DataPolicyDelegateTestCapo
        beforeEach<localTC>(async (context) => {
            const {h, h:{network, actors, delay, state} } = context;
            await h.reusableBootstrap();
            capo = h.strella;
            // capo = await h.bootstrap({
            //     mintDelegateLink: {
            //         config: {}
            //     }
            // });
        })

        it("registers the pending installation in the Capo charter's pendingDgtChanges queue", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            {
                const charter = await capo.findCharterData();
                expect(charter.otherNamedDelegates).toBeTruthy();
                expect(charter.otherNamedDelegates.size).toBe(0);
                expect(charter.manifest.size).toBe(0);
                expect(charter.pendingDgtChanges.length).toBe(0);
                
                // const tcx = await capo.mkTxnInstallingPolicyDelegate("inventionPolicy");
                // expect(tcx.state).toBeTruthy()
                // await tcx.submit();
                // network.tick(1);
                await h.snapToInstallingInventionPolicy()
            }

            {
                const charter2 = await capo.findCharterData();
                expect(charter2.pendingDgtChanges).toBeTruthy();
                console.log("charter2.namedDelegates", charter2.otherNamedDelegates);
                expect(charter2.pendingDgtChanges.length).toBe(1);
                expect(charter2.otherNamedDelegates.size).toBe(0);
                expect(charter2.manifest.size).toBe(0);
            }
        });

        it("refuses to queue an additional change for the same policy name", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            await h.snapToInstallingInventionPolicy()

            const tcx2 = await capo.mkTxnInstallingPolicyDelegate("inventionPolicy");
            const submitting = tcx2.submit();
            // await submitting
            await expect(submitting).rejects.toThrow("already has a pending change for this delegate");
        })



    })


});
