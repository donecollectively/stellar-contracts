import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";
import * as helios from "@hyperionbt/helios";

import { StellarTxnContext } from "../src/StellarTxnContext";
import { ADA, StellarTestContext, addTestContext } from "../src/testing";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";
import { ConfigFor } from "../src/StellarContract";
import { dumpAny } from "../src/diagnostics";
import { DelegationDetail } from "../src/delegation/RolesAndDelegates";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate";
import { Capo } from "../src/Capo";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings";
import { TestHelperState } from "../src/testing/types";
// import { RoleDefs } from "../src/RolesAndDelegates";
import {CapoCanMintGenericUuts} from "./CapoCanMintGenericUuts.js";

type localTC = StellarTestContext<DefaultCapoTestHelper<CapoCanMintGenericUuts>>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;


let helperState: TestHelperState<CapoCanMintGenericUuts> = {
    snapshots: {},
} as any;

describe("Capo Minter", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise(res => setTimeout(res, 10));
        await addTestContext(
            context, 
            DefaultCapoTestHelper.forCapoClass(CapoCanMintGenericUuts),
            undefined,
            helperState
        );
    });

    describe("defers to the capo's mint delegate", () => {
        it("allows minting if the Capo mintDgt is using a MintingActivity", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            await h.reusableBootstrap();
            const capo = h.strella!;

            const mintDelegate = await capo.getMintDelegate();
            // const origGrantAuthority = mintDgt.txnGrantAuthority.bind(mintDgt);
            // vi.spyOn(mintDgt, "txnGrantAuthority").mockImplementation(
            //     (tcx, redeemer, skipReturning?) => {
            //         expect(
            //             JSON.stringify(redeemer)
            //         ).toEqual(mintDgt.mkMintingActivity("_placeholder1MA") )

            //         return origGrantAuthority(tcx, redeemer, skipReturning);
            //     }
            // )

            const tcx1 = await capo.tcxWithSeedUtxo(h.mkTcx());
            const purposes = ["fooPurpose"];
            const tcx1a = await capo.txnMintingUuts(
                tcx1,
                purposes,
                { mintDelegateActivity: mintDelegate.activityMintingUutsAppSpecific(tcx1, purposes) }
            );
            await h.submitTxnWithBlock(tcx1a);

        });
        it("fails minting if the mintDgt has a SpendingActivity", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            await h.reusableBootstrap();
            const capo = h.strella!;
            const mintDelegate = await capo.getMintDelegate();
            const tcx1 = await capo.tcxWithSeedUtxo(h.mkTcx());
            const purposes = ["fooPurpose"];

            const tcx1a = await capo.txnMintingUuts(
                tcx1,
                purposes,
                { mintDelegateActivity: mintDelegate.mkSpendingActivity("mockWorkingSpendActivity", helios.textToBytes("anything")) }
            );

            await expect(h.submitTxnWithBlock(tcx1a)).rejects.toThrow(/SpendingActivity can't mint/);
        })

    });
    describe("defers to the capo's mint delegate with MultipleDelegateActivities", () => {
        it("doesn't support Capo mintDgt with MultipleDelegateActivities -> MintingActivity (delegated data activities only)", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            await h.reusableBootstrap();
            const capo = h.strella!;

            const mintDelegate = await capo.getMintDelegate();
            const tcx1 = await capo.tcxWithSeedUtxo(h.mkTcx());
            const purposes = ["fooPurpose"];
            debugger
            const tcx1a = await capo.txnMintingUuts(
                tcx1,
                purposes,
                { mintDelegateActivity: mintDelegate.activityMultipleDelegateActivities(
                    mintDelegate.activityMintingUutsAppSpecific(tcx1, purposes) 
                )}
            );

            await expect( 
                h.submitTxnWithBlock(tcx1a)
            ).rejects.toThrow(/multi:Minting: only dgData activities ok in mintDgt/);
        });

        it("fails minting if the mintDgt has a SpendingActivity in a MultipleDelegateActivities", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            await h.reusableBootstrap();
            const capo = h.strella!;
            const mintDelegate = await capo.getMintDelegate();
            const tcx1 = await capo.tcxWithSeedUtxo(h.mkTcx());
            const purposes = ["fooPurpose"];

            const tcx1a = await capo.txnMintingUuts(
                tcx1,
                purposes,
                { mintDelegateActivity: mintDelegate.activityMultipleDelegateActivities(
                    mintDelegate.mkSpendingActivity("mockWorkingSpendActivity", helios.textToBytes("anything"))
                )}
            );

            await expect(
                h.submitTxnWithBlock(tcx1a)
            ).rejects.toThrow(/mintDgt can't do SpendingActivit/);
        })
        
        it.skip("FIX TEST: fails minting if the mintDgt has a UpdatingDelegatedDatum activity", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            await h.reusableBootstrap();
            const capo = h.strella!;
            const mintDelegate = await capo.getMintDelegate();
            const tcx1 = await capo.tcxWithSeedUtxo(h.mkTcx());
            const purposes = ["fooPurpose"];

            // TODO: the test fails because the token isn't present for possible updating.  
            // ... for this test to actually work, we'd need to have a data delegate that creates such a thing,
            // ... or otherwise provide a matching token that would pass the inDD check in the mint delegate.
            // It might also need a special bit of code in the uut mintDgt policy that would allow the special case, 
            // .. in order that the essential minting policy's failure is triggered as expected

            // hacks the use of the SpendingDelegatedDatum activity 
            const Hacktivity = mintDelegate.mustGetActivity("UpdatingDelegatedData");
            const hacktivity = {
                redeemer: new Hacktivity("fooPurpose", helios.textToBytes("fooPurpose-xyz123"))
            }

            const tcx1a = await capo.txnMintingUuts(
                tcx1,
                purposes,
                {                     
                    mintDelegateActivity: hacktivity
                }
            );

            await expect(h.submitTxnWithBlock(tcx1a)).rejects.toThrow(/UpdatingDelegatedDatum can't mint/);
        });

        it.skip("FIX TEST: can mint with MultipleDelegateActivities having one CreatingDelegatedDatum", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            await h.reusableBootstrap();
            const capo = h.strella!;
            const mintDelegate = await capo.getMintDelegate();
            const tcx1 = await capo.tcxWithSeedUtxo(h.mkTcx());
            const purposes = ["fooPurpose"];

            // this test doesn't work because there are no delegated-data controllers in the current test setup
            // ^^ fix by adding a delegated data controller for it

            // hacks the use of the CreatingDelegatedDatum activity
            const Hacktivity = mintDelegate.mustGetActivity("CreatingDelegatedData");
            const hacktivity = {
                redeemer: new Hacktivity("fooPurpose", helios.textToBytes("fooPurpose-xyz123"))
            }
            const tcx1a = await capo.txnMintingUuts(
                tcx1,
                purposes,
                { mintDelegateActivity: mintDelegate.activityMultipleDelegateActivities(tcx1, 
                        [
                            hacktivity
                        ]
                )}
            );

            await h.submitTxnWithBlock(tcx1a);
        })

        it.todo("TODO: TEST can mint with MultipleDelegateActivities having one DeletingDelegatedDatum", async (context: localTC) => {
            // there's not a working case for deleting delegated data.
            // ^^ contributions welcome
        });

        it.todo("TODO: TEST won't mint with MultipleDelegateActivities having any UpdatingDelegatedDatum", async (context: localTC) => {
            // TODO :please:
        });

        it.todo("TODO: TEST won't mint with MultipleDelegateActivities duplicate CreatingDelegatedDatum", async (context: localTC) => {
            // TODO :please:
        });

        it.todo("TODO: TEST can mint with MultipleDelegateActivities having multiple CreatingDelegatedDatum or DeletingDelegatedDatum activities", async (context: localTC) => {
        });

    });

});


