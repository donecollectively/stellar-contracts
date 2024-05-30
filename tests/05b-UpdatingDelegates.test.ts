import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";

import {
    Address,
    Datum,
    Signature,
    Tx,
    TxOutput,
    TxInput,
    Value,
    bytesToText,
} from "@hyperionbt/helios";

import { StellarTxnContext } from "../src/StellarTxnContext";
import { ADA, StellarTestContext, addTestContext } from "../src/testing";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";
import { ConfigFor } from "../src/StellarContract";
import { dumpAny } from "../src/diagnostics";
import { DelegationDetail } from "../src/delegation/RolesAndDelegates";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate";
// import { RoleDefs } from "../src/RolesAndDelegates";

type localTC = StellarTestContext<DefaultCapoTestHelper>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

describe("Capo", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise(res => setTimeout(res, 10));
        await addTestContext(context, DefaultCapoTestHelper);
    });
    
    describe("can update the MINTING delegate in the charter settings", () => {
        // kc983ndk
        it("can install an updated minting delegate", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const originalDatum = await capo.findCharterDatum();

            const tcx = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "defaultV1",
                },
            );
            await capo.submit(tcx);
            network.tick(1n);

            const updatedDatum = await capo.findCharterDatum();
            expect(updatedDatum.mintDelegateLink.uutName).not.toEqual(
                originalDatum.mintDelegateLink.uutName
            );
        });

        it("fails without the capoGov- authority uut", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const addedGovToken = vi
                .spyOn(capo, "txnAddGovAuthority")
                .mockImplementation(
                    //@ts-expect-error
                    (tcx) => tcx!
                );
            console.log(
                " ------- case 1: with mint delegate involved in the replacement"
            );
            const tcx1 = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "defaultV1",
                },
            );
            expect(addedGovToken).toHaveBeenCalledTimes(1);
            await expect(capo.submit(tcx1)).rejects.toThrow(
                /missing dgTkn capoGov-/
            );

            console.log(" ------- case 2: forced replacement of mint delegate");
            const tcx2 = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "defaultV1",
                    forcedUpdate: true,
                },
            );
            expect(addedGovToken).toHaveBeenCalledTimes(2);
            await expect(capo.submit(tcx2)).rejects.toThrow(
                /missing dgTkn capoGov-/
            );
        });

        it("can force-replace the mint delegate if needed", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const originalDatum = await capo.findCharterDatum();
            const oldMintDelegate = await capo.getMintDelegate();
            const oldPredicate = oldMintDelegate.mkAuthorityTokenPredicate();

            const tcx = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "defaultV1",
                    forcedUpdate: true,
                },
            );
            await capo.submit(tcx);
            network.tick(1n);
            const updatedDatum = await capo.findCharterDatum();
            expect(updatedDatum.mintDelegateLink.uutName).not.toEqual(
                originalDatum.mintDelegateLink.uutName
            );

            const stillExists = await oldMintDelegate.mustFindMyUtxo(
                "old delegate UUT",
                oldPredicate
            );
            expect(stillExists).toBeTruthy();
            const newDelegate = await capo.getMintDelegate();
            const newPredicate = newDelegate.mkAuthorityTokenPredicate();
            const newExists = await newDelegate.mustFindMyUtxo(
                "new delegate UUT",
                newPredicate
            );
            expect(newExists).toBeTruthy();
            expect(stillExists.outputId.eq(newExists.outputId)).toBeFalsy();
        });

        it("normally requires the existing minting delegate to be involved in the replacement", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();

            const md = await capo.getMintDelegate();
            console.log(
                "  ----------- mocking mint delegate's txnGrantAuthority()"
            );
            const didGrantMockedAuthority = vi
                .spyOn(md, "txnGrantAuthority")
                .mockImplementation(async (tcx) => tcx);
            const didntBurnBecauseMocked = vi
                .spyOn(capo, "mkValuesBurningDelegateUut")
                .mockImplementation(() => []);
            const tcx2 = await capo.mkTxnUpdatingMintDelegate({
                strategyName: "defaultV1",
        });
            expect(didGrantMockedAuthority).toHaveBeenCalledTimes(1);
            expect(didntBurnBecauseMocked).toHaveBeenCalledTimes(1);

            await expect(capo.submit(tcx2)).rejects.toThrow(
                /missing req.* input .*script addr.* mintDgt-/
            );
        });

        it("uses the new minting delegate after it is installed", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();

            const mintDelegate = await capo.getMintDelegate();
            const oldPredicate = mintDelegate.mkAuthorityTokenPredicate();
            console.log(
                " ------- case 1: with mint delegate involved in the replacement"
            );
            const tcx = await capo.mkTxnUpdatingMintDelegate({
                strategyName: "defaultV1",
            });
            await capo.submit(tcx);
            network.tick(1n);
            
            console.log(" ------- case 1a: replacing second delegate to see that it's involved in the upgrade ");
            const tcx2 = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "defaultV1",
                },
            );

            console.log("  --- followup to make sure the second mint delegate was used in the replacement txn ----")
            console.log("  -- ...^  in txn: ", dumpAny(tcx2));
            expect(tcx2.outputs.find(oldPredicate)).toBeFalsy();
            const newerPredicate = (
                await capo.getMintDelegate()
            ).mkAuthorityTokenPredicate();
            expect(tcx2.inputs.find(newerPredicate)).toBeTruthy();

            console.log(" ------- case 2: forced replacement of mint delegate");

            const tcx3 = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "defaultV1",
                    forcedUpdate: true,
                },
            );

            await expect(capo.submit(tcx3)).resolves.toBeTruthy();
            network.tick(1n);

            const tcx3a = await capo.addSeedUtxo(new StellarTxnContext<any>());
            const purpose2 = ["anything2"];
            const tcx3b = await capo.txnMintingUuts(
                tcx3a,
                purpose2,
                { // this isn't of any significance; we're just checking that the new
                    // delegate is used in this txn, not expecting the txn to succeed.
                    mintDelegateActivity: mintDelegate.activityValidatingSettings()
                }
            );

            expect(tcx3b.outputs.find(oldPredicate)).toBeFalsy();
            expect(tcx3b.outputs.find(newerPredicate)).toBeFalsy();
            const newestPredicate = (
                await capo.getMintDelegate()
            ).mkAuthorityTokenPredicate();
            expect(tcx3b.outputs.find(newestPredicate)).toBeTruthy();
        });

        it("can't use the old minting delegate after it is replaced", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const oldCharterDatum = await capo.findCharterDatum();
            const oldMintDelegate = await capo.getMintDelegate();
            const oldPredicate = oldMintDelegate.mkAuthorityTokenPredicate();

            // NO CASE 1 - there's no delegate UUT remaining to spend
            //  if the old delegate is replaced.
            //   console.log( " ------- ⚗️ case 1: with mint delegate involved in the replacement");
            console.log(" -------⚗️🐞⚗️🐞 case 2: forced replacement of mint delegate\n"+
                "    - leaves the existing delegate dangling"
            );
            const tcx = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "defaultV1",
                    forcedUpdate: true,
                },
            );
            await capo.submit(tcx);
            network.tick(1n);

            const fakeDelegate = vi.spyOn(capo, "getMintDelegate").mockImplementation(async () => {
                return oldMintDelegate;
            });
            const fakeCharter = vi.spyOn(capo, "findCharterDatum").mockImplementation(async () => {
                return oldCharterDatum;
            })
            console.log( " ------ 🐞⚗️🐞⚗️ - use the old mint delegate in a new txn")
            const tcx2 = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "defaultV1",
                },
            );
            expect(fakeDelegate).toHaveBeenCalled();
            expect(fakeCharter).toHaveBeenCalled();
            expect(tcx2.inputs.find(oldPredicate)).toBeTruthy();

            await expect(capo.submit(tcx2)).rejects.toThrow(
                /missing .*mintDgt/
            );
        });
    });

    describe("can update the SPENDING delegate in the charter settings", () => {
        it("can install an updated spending delegate", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const originalDatum = await capo.findCharterDatum();
            const mintDelegate = await capo.getMintDelegate();

            const tcx = await capo.mkTxnUpdatingSpendDelegate(
                {
                    strategyName: "defaultV1",
                },
            );
            await capo.submit(tcx);
            network.tick(1n);

            const updatedDatum = await capo.findCharterDatum();
            expect(updatedDatum.spendDelegateLink.uutName).not.toEqual(
                originalDatum.spendDelegateLink.uutName
            );
        });

        it("fails without the capoGov- authority uut", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const addedGovToken = vi
                .spyOn(capo, "txnAddGovAuthority")
                .mockImplementation(
                    //@ts-expect-error
                    (tcx) => tcx!
                );
            console.log(
                " ------- case 1: with spend delegate involved in the replacement"
            );
            const tcx1 = await capo.mkTxnUpdatingSpendDelegate(
                {
                    strategyName: "defaultV1",
                },
            );
            expect(addedGovToken).toHaveBeenCalledTimes(1);
            await expect(capo.submit(tcx1)).rejects.toThrow(
                /missing dgTkn capoGov-/
            );

            console.log(
                " ------- case 2: forced replacement of spend delegate"
            );
            const tcx2 = await capo.mkTxnUpdatingSpendDelegate(
                {
                    strategyName: "defaultV1",
                    forcedUpdate: true,
                },
            );
            expect(addedGovToken).toHaveBeenCalledTimes(2);
            await expect(capo.submit(tcx2)).rejects.toThrow(
                /missing dgTkn capoGov-/
            );
        });

        it("can force-replace the spending delegate if needed", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const originalDatum = await capo.findCharterDatum();
            const oldSpendDelegate = await capo.getSpendDelegate();
            const oldPredicate = oldSpendDelegate.mkAuthorityTokenPredicate();

            const tcx = await capo.mkTxnUpdatingSpendDelegate(
                {
                    strategyName: "defaultV1",
                    forcedUpdate: true,
                },
            );
            await capo.submit(tcx);
            network.tick(1n);
            const updatedDatum = await capo.findCharterDatum();
            expect(updatedDatum.spendDelegateLink.uutName).not.toEqual(
                originalDatum.spendDelegateLink.uutName
            );

            const stillExists = await oldSpendDelegate.mustFindMyUtxo(
                "old delegate UUT",
                oldPredicate
            );
            expect(stillExists).toBeTruthy();
            const newDelegate = await capo.getSpendDelegate();
            const newPredicate = newDelegate.mkAuthorityTokenPredicate();
            const newExists = await newDelegate.mustFindMyUtxo(
                "new delegate UUT",
                newPredicate
            );
            expect(newExists).toBeTruthy();
            expect(stillExists.outputId.eq(newExists.outputId)).toBeFalsy();
        });

        it("normally requires the existing spending delegate to be involved in the replacement", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();

            const sd = await capo.getSpendDelegate();
            console.log(
                "  ----------- mocking spend delegate's txnGrantAuthority()"
            );
            const didGrantMockedAuthority = vi
                .spyOn(sd, "txnGrantAuthority")
                .mockImplementation(async (tcx) => tcx);
            const didntBurnBecauseMocked = vi
                .spyOn(capo, "mkValuesBurningDelegateUut")
                .mockImplementation(() => []);
            const tcx2 = await capo.mkTxnUpdatingSpendDelegate({
                strategyName: "defaultV1",
            });
            expect(didGrantMockedAuthority).toHaveBeenCalledTimes(1);
            expect(didntBurnBecauseMocked).toHaveBeenCalledTimes(1);

            const submission = capo.submit(tcx2);
            await expect(submission).rejects.toThrow(
                /* \X matches any char including line breaks */
                new RegExp(`-1x ${bytesToText(sd.authorityTokenName)}`)
            );

            await expect(submission).rejects.toThrow(/\X*mismatch in UUT mint/);
        });

        it.todo(
            "TODO uses the new spending delegate after it is installed",
            async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;

                const capo = await h.bootstrap();

                const sd = await capo.getSpendDelegate();
                const oldPredicate = sd.mkAuthorityTokenPredicate();
                console.log(
                    " ------- case 1: with spend delegate involved in the replacement"
                );
                const tcx = await capo.mkTxnUpdatingSpendDelegate({
                    strategyName: "defaultV1",
                });
                await capo.submit(tcx);
                network.tick(1n);
                console.log("    ---- spending with the new delegate");

                // TODO: Make a different txn type for delegated-spend (config record?)
                const tcx1 = await capo.txnSpendingUuts(
                    await capo.addSeedUtxo(new StellarTxnContext<any>()),
                    ["anything"]
                );

                console.log(
                    " ------------------------------------------------------------------\n",
                    dumpAny(tcx1)
                );
                expect(tcx1.outputs.find(oldPredicate)).toBeFalsy();
                const newerPredicate = (
                    await capo.getSpendDelegate()
                ).mkAuthorityTokenPredicate();
                expect(tcx1.outputs.find(newerPredicate)).toBeTruthy();
                await expect(capo.submit(tcx1)).resolves.toBeTruthy();
            }
        );

        it.todo(
            "TODO: can't use the old spending delegate after it is replaced",
            async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;

                // const strella =
                await h.bootstrap();
            }
        );
    });
});
