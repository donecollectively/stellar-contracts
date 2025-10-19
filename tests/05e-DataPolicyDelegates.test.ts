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
import {
    CapoForDgDataPolicy_testHelper,
    helperState,
    TestContext_CapoForDgData,
} from "./CapoForDgDataPolicyTestHelper.js";
import { DelegatedDatumTester } from "../src/testing/DelegatedDatumTester.js";
import { bytesToText, environment } from "@donecollectively/stellar-contracts";
import { UplcProgramV2 } from "@helios-lang/uplc";
import { makeValidatorHash } from "@helios-lang/ledger";

const it = itWithContext<localTC>;
function TEST_REQT(s: string) {
    return it.todo(`TEST: ${s}`, { todo: true });
}
function TODO_REQT(s: string) {
    return it.todo(`TODO: ${s}`, { todo: true });
}
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

type localTC = TestContext_CapoForDgData;
// let helperState: TestHelperState<CapoCanMintGenericUuts> = {
//     snapshots: {},
// } as any;

// console.log("🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞")

describe("Capo", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(
            context,
            CapoForDgDataPolicy_testHelper,
            undefined,
            helperState
        );
    });

    describe("Creating data-policy delegate", () => {
        let capo: CapoCanMintGenericUuts;
        beforeEach<localTC>(async (context) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            await h.reusableBootstrap();
            capo = h.strella;
            // capo = await h.bootstrap({
            //     mintDelegateLink: {
            //         config: {}
            //     }
            // });
        });

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
                await h.snapToInstallingTestDataPolicy();
            }

            {
                const charter2 = await capo.findCharterData();
                expect(charter2.pendingChanges).toBeTruthy();
                console.log(
                    "charter2.namedDelegates",
                    charter2.otherNamedDelegates
                );
                expect(charter2.pendingChanges.length).toBe(1);
                expect(charter2.otherNamedDelegates.size).toBe(0);
                expect(charter2.manifest.size).toBe(0);
            }
        });

        it("refuses to queue an Add for an existing policy name", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            await h.snapToInstalledTestDataPolicy();

            const charterData = await capo.findCharterData();

            vi.spyOn(capo, "hasPolicyInManifest").mockReturnValue(undefined);
            const tcx2 = await capo.mkTxnInstallingPolicyDelegate({
                idPrefix: "tData",
                typeName: "testData",
                charterData,
            });

            const submitting = tcx2.submitAll({
                expectError: true,
            });
            await expect(submitting).rejects.toThrow(
                "already has a delegate for policy name: testData"
            );
        });

        it("refuses to queue another Add if a policy is already in pendingChanges", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            await h.snapToInstallingTestDataPolicy();

            const charterData = await capo.findCharterData();

            // allows the txn-builder to get past its guard for a pending change:
            vi.spyOn(capo, "findPendingChange").mockImplementation(
                () => undefined
            );

            const tcx2 = await capo.mkTxnInstallingPolicyDelegate({
                idPrefix: "tData",
                typeName: "testData",
                charterData,
            });

            const submitting = tcx2.submitAll({
                expectError: true,
            });
            // await submitting
            await expect(submitting).rejects.toThrow(
                "already has a pending change for this delegate"
            );
        });

        it("commits pending changes and installs the new policy delegate", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            await h.snapToInstalledTestDataPolicy();

            const charter = await capo.findCharterData();
            expect(charter.pendingChanges.length).toBe(0);
            expect(charter.otherNamedDelegates.size).toBe(0);
            expect(charter.manifest.size).toBe(1);
        });
    });

    describe("Replacing a data-policy delegate", () => {
        it("queues and replaces the delegate", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            await h.snapToInstalledTestDataPolicy();
            const capo = h.capo;

            const charterData = await capo.findCharterData();

            // allows the txn-builder to get past its guard for a pending change:
            // vi.spyOn(capo, "findPendingChange").mockImplementation(
            //     () => undefined
            // );

            const testDataController = (await capo.getDgDataController(
                "testData",
                { charterData }
            )) as DelegatedDatumTester;

            if (!testDataController)
                throw new Error("testDataController not found");

            capo._delegateCache["testData"] = {};

            DelegatedDatumTester.currentRev = 2n;

            const tcx2 = await capo.mkTxnInstallingPolicyDelegate({
                idPrefix: "tData",
                typeName: "testData",
                charterData,
            });

            const submitting = tcx2.submitAll({
                expectError: true,
            });
            // await submitting
            await expect(submitting).resolves.toBeTruthy();

            const charterData2 = await capo.findCharterData();
            const manifest = charterData2.manifest;
            expect(manifest.size).toBe(1);
            const currentTestData = manifest.get("testData")!;
            expect(charterData2.pendingChanges.length).toBe(1);
            const newChange = charterData2.pendingChanges[0].delegateChange!;
            expect(newChange.action.Replace).toBeTruthy();
            expect(newChange.dgtLink?.uutName).not.toEqual(
                bytesToText(currentTestData.tokenName)
            );

            const tcx3 = await capo.mkTxnCommittingPendingChanges();
            await tcx3.submitAll();
            network.tick(1);

            const charterData3 = await capo.findCharterData();
            expect(charterData3.pendingChanges.length).toBe(0);
            const finalManifest = charterData3.manifest;
            expect(finalManifest.size).toBe(1);
            expect(charterData3.pendingChanges.length).toBe(0);
            expect(
                bytesToText(finalManifest.get("testData")!.tokenName)
            ).toEqual(newChange.dgtLink?.uutName);
            expect(
                finalManifest.get("testData")!.entryType.DgDataPolicy!
                    .policyLink.delegateValidatorHash
            ).toEqual(newChange.dgtLink?.delegateValidatorHash);
        });

        it("refuses to queue an additional Change if a policy already in pendingChanges", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            await h.snapToInstalledTestDataPolicy();
            const capo = h.capo;

            let charterData = await capo.findCharterData();
            const testDataController = (await capo.getDgDataController(
                "testData",
                { charterData }
            )) as DelegatedDatumTester;
            if (!testDataController)
                throw new Error("testDataController not found");

            const uplcProgram = await testDataController._bundle!.compiledScript(true);
            if (!uplcProgram)
                throw new Error("uplcProgram not found");
            const validatorHash = uplcProgram.hash();
            if (!validatorHash)
                throw new Error("validatorHash not found");

            await h.snapToReplacingTestDataPolicy();
            // testDataController._bundle = undefined;
            DelegatedDatumTester.currentRev = 3n;
            h.capo._delegateCache["testData"] = {};

            // allows the txn-builder to get past its guard for a pending change:
            vi.spyOn(capo, "findPendingChange").mockImplementation(
                () => undefined
            );

            charterData = await capo.findCharterData();
            const updatedDelegate = await capo.getDgDataController("testData", { charterData });
            if (!updatedDelegate)
                throw new Error("updatedDelegate not found");
            // updatedDelegate.getBundle()!.previousOnchainScript = {
            //     validatorHash,
            //     uplcProgram
            // };

            const tcx2 = await capo.mkTxnInstallingPolicyDelegate({
                idPrefix: "tData",
                typeName: "testData",
                charterData,
            });

            const submitting = tcx2.submitAll({
                expectError: true,
            });
            // await submitting
            await expect(submitting).rejects.toThrow(
                "already has a pending change for this delegate"
            );
        });

        it("can  queue and replace two delegates at the same time", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            expect(process.env.OPTIMIZE, "OPTIMIZE must == 1 for this test").toBeTruthy();
            await h.snapToInstalledTestDataPolicy();
            // building on top of the single-delegate snapshot:

            const capo = h.capo;
            CapoCanMintGenericUuts.useExtraModel = true;

            //@ts-expect-error
            capo._delegateRoles = capo.initDelegateRoles();

            const charterData = await capo.findCharterData();
            capo.autoSetup = true;
            //@ts-expect-error for now
            capo.featureFlags = {
            //@ts-expect-error for now
            ...capo.featureFlags,
                testData: true,
                testData2: true,
            }

            const tcx = await capo.mkTxnUpgradeIfNeeded(
                charterData
            );
            await tcx.submitAll();
            network.tick(1);
            // console.log("🐞🐞🐞 -- now it has active delegates policies for two types of testData")

            const charterData2 = await capo.findCharterData();
            expect(charterData2.pendingChanges.length).toBe(0);
            expect(charterData2.manifest.size).toBe(2);
            // allows the txn-builder to get past its guard for a pending change:
            // vi.spyOn(capo, "findPendingChange").mockImplementation(
            //     () => undefined
            // );

            const prevTestDataController = (await capo.getDgDataController(
                "testData",
                { charterData: charterData2 }
            )) as DelegatedDatumTester;
            debugger
            const prevTestData2Controller = (await capo.getDgDataController(
                "testData2",
                { charterData: charterData2 }
            )) as DelegatedDatumTester;

            if (!prevTestDataController)
                throw new Error("testDataController not found");
            if (!prevTestData2Controller)
                throw new Error("testData2Controller not found");

            capo._delegateCache["testData"] = {};
            capo._delegateCache["testData2"] = {};

            DelegatedDatumTester.currentRev = 2n;

            const tcx2 = await capo.mkTxnUpgradeIfNeeded(
                charterData2
            );

            // const tcx2 = await capo.mkTxnInstallingPolicyDelegate({
            //     idPrefix: "tData",
            //     policyName: "testData",
            //     charterData,
            // });

            const nextTestDataController = (await capo.getDgDataController(
                "testData",
                { charterData: charterData2 }
            )) as DelegatedDatumTester;
            if (!nextTestDataController)
                throw new Error("nextTestDataController not found");    
            const nextTestData2Controller = (await capo.getDgDataController(
                "testData2",
                { charterData: charterData2 }
            )) as DelegatedDatumTester;
            if (!nextTestData2Controller)
                throw new Error("nextTestData2Controller not found");

            const submitting = tcx2.submitAll({
                // expectError: true,
            });
            // await submitting
            await expect(submitting).resolves.toBeTruthy();

            // console.log("🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞")

            const charterData3 = await capo.findCharterData();
            const manifest = charterData3.manifest;
            expect(manifest.size).toBe(2);
            const currentTestData = manifest.get("testData")!;
            expect(charterData3.pendingChanges.length).toBe(0);
            const finalManifest = charterData3.manifest;
            expect(finalManifest.size).toBe(2);
            const nextTestDataManifest = finalManifest.get("testData")!;
            const nextTestData2Manifest = finalManifest.get("testData2")!;
            const nextTestDataHash = nextTestDataManifest.entryType.DgDataPolicy!.policyLink.delegateValidatorHash;
            const nextTestData2Hash = nextTestData2Manifest.entryType.DgDataPolicy!.policyLink.delegateValidatorHash;
            expect(nextTestDataHash).toBeTruthy();
            expect(nextTestData2Hash).toBeTruthy();

            const prevBundle = await prevTestDataController.getBundle();
            const prevTestDataScript = await prevBundle!.compiledScript(true);
            const prevTestDataHash = makeValidatorHash(prevTestDataScript.hash());
            const prevTestData2Script = await prevBundle!.compiledScript(true);
            const prevTestData2Hash = makeValidatorHash(prevTestData2Script.hash());
            expect(nextTestDataHash!.isEqual(prevTestDataHash)).toBeFalsy();
            expect(nextTestData2Hash!.isEqual(prevTestData2Hash)).toBeFalsy();

            const nextBundle = await nextTestDataController.getBundle();
            const nextTestDataScript = await nextBundle!.compiledScript(true);
            const nextTestData2Script = await nextBundle!.compiledScript(true);
            const nextTestDataHash2 = makeValidatorHash(nextTestDataScript.hash());
            const nextTestData2Hash2 = makeValidatorHash(nextTestData2Script.hash());
            expect(nextTestDataHash!.isEqual(nextTestDataHash2)).toBeTruthy();
            expect(nextTestData2Hash!.isEqual(nextTestData2Hash2)).toBeTruthy();
        });


        TEST_REQT("dgt-change: the idPrefix must not be modified");

        // it.todo("TODO: test that a delegate can be REPLACED", { todo: true });
        TEST_REQT(
            "Replace: verifies that the next-manifest no longer has the replaced entry"
        );
        TEST_REQT(
            "verifies that added & replaced entries are present in the updated map (at its next position)"
        );
    });
    describe("Removing a data-policy delegate", () => {
        TEST_REQT(
            "dgt-change: Remove: verifies that the delegate queued for removal is now removed from the Capo manifest"
        );
        TEST_REQT(
            "verifies that a delegate queued for removal or replacement is burned"
        );
        it.todo("enforces ref sripts creating and burning");
    });
});
