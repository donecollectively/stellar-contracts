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
function TEST_REQT(s: string) { return it.todo(`TEST: ${s}`, {todo:true})}
function TODO_REQT(s: string) { return it.todo(`TODO: ${s}`, {todo:true})}
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

        it("registers the pending installation in the Capo charter's pendingChanges queue", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            {
                const charter = await capo.findCharterData();
                expect(charter.otherNamedDelegates).toBeTruthy();
                expect(charter.otherNamedDelegates.size).toBe(0);
                expect(charter.manifest.size).toBe(0);
                expect(charter.pendingChanges.length).toBe(0);
                
                // const tcx = await capo.mkTxnInstallingPolicyDelegate("inventionPolicy");
                // expect(tcx.state).toBeTruthy()
                // await tcx.submit();
                // network.tick(1);
                await h.snapToInstallingTestDataPolicy()
            }

            {
                const charter2 = await capo.findCharterData();
                expect(charter2.pendingChanges).toBeTruthy();
                console.log("charter2.namedDelegates", charter2.otherNamedDelegates);
                expect(charter2.pendingChanges.length).toBe(1);
                expect(charter2.otherNamedDelegates.size).toBe(0);
                expect(charter2.manifest.size).toBe(0);
            }
        });

        it("refuses to queue an additional change for the same policy name", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            await h.snapToInstallingTestDataPolicy()

            const charterData = await capo.findCharterData();

            const tcx2 = await capo.mkTxnInstallingPolicyDelegate({
                idPrefix: "tData",
                policyName: "testData",
                charterData,
            });
            const submitting = tcx2.submitAll();
            // await submitting
            await expect(submitting).rejects.toThrow("already has a pending change for this delegate");
        })

        it("commits pending changes and installs the new policy delegate", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            await h.snapToInstalledTestDataPolicy();

            const charter = await capo.findCharterData();
            expect(charter.pendingChanges.length).toBe(0);
            expect(charter.otherNamedDelegates.size).toBe(0);
            expect(charter.manifest.size).toBe(1);
        })
        it.todo("TODO: test that a delegate can be REPLACED", {todo: true});

        //!!! switch reqts to "FAILS IF" phrasing for ultimate clarity
        TEST_REQT("the next-changes list must be empty");
        TEST_REQT("dgt-change: Remove: verifies that the delegate queued for removal is now removed from the Capo manifest");
        TEST_REQT("verifies that added & replaced entries are present in the updated map (at its next position)");
        TEST_REQT("Replace: verifies that the next-manifest no longer has the replaced entry");
        TEST_REQT("verifies that a delegate queued for removal or replacement is burned");
        it.todo("enforces ref sripts creating and burning")
    })


});
