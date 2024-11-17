import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";

import { ADA, addTestContext, TestHelperState } from "../src/testing/types";
import { CapoCanMintGenericUuts } from "./CapoCanMintGenericUuts.js";
import { CapoForDgDataPolicy_testHelper, helperState, TestContext_CapoForDgData } from "./CapoForDgDataPolicyTestHelper.js";

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

type localTC = TestContext_CapoForDgData
// let helperState: TestHelperState<CapoCanMintGenericUuts> = {
//     snapshots: {},
// } as any;

describe("Capo", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(
            context, CapoForDgDataPolicy_testHelper, 
            undefined,
            helperState
        );
    });

    describe("Creating data-policy delegate", () => {
        let capo : CapoCanMintGenericUuts;
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
                await h.snapToInstallingTestDataPolicy()
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

            await h.snapToInstallingTestDataPolicy()

            const tcx2 = await capo.mkTxnInstallingPolicyDelegate("testDataPolicy");
            const submitting = tcx2.submit();
            // await submitting
            await expect(submitting).rejects.toThrow("already has a pending change for this delegate");
        })

        it("commits pending changes and installs the new policy delegate", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            await h.snapToInstalledTestDataPolicy();

            const charter = await capo.findCharterData();
            expect(charter.pendingDgtChanges.length).toBe(0);
            expect(charter.otherNamedDelegates.size).toBe(0);
            expect(charter.manifest.size).toBe(1);
        })


    })


});
