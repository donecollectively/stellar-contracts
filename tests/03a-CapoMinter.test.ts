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
    Capo,
    StellarTxnContext,
    parseCapoJSONConfig,
    CapoWithoutSettings,
    BasicMintDelegate,
    dumpAny,
    type ConfigFor,
    TxDescription,
    textToBytes
} from "@donecollectively/stellar-contracts";
import { ADA, StellarTestContext, addTestContext } from "../src/testing";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";
import { TestHelperState } from "../src/testing/types";
// import { RoleDefs } from "../src/RolesAndDelegates";
import { CapoCanMintGenericUuts } from "./CapoCanMintGenericUuts.js";
import { expectTxnError } from "../src/testing/StellarTestHelper.js";

type localTC = StellarTestContext<
    DefaultCapoTestHelper<CapoCanMintGenericUuts>
>;

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
        await new Promise((res) => setTimeout(res, 10));
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
            const tcx1a = await capo.txnMintingUuts(tcx1, purposes, {
                mintDelegateActivity:
                    mintDelegate.activity.MintingActivities.mintingUuts(tcx1, {purposes}),
            });
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

            const mintDelegateActivity =
                mintDelegate.activity.SpendingActivities.mockWorkingSpendActivity(
                    textToBytes("anything")
                );
            const tcx1a = await capo.txnMintingUuts(tcx1, purposes, {
                mintDelegateActivity,
            });

            await expect(
                h.submitTxnWithBlock(tcx1a, expectTxnError)
            ).rejects.toThrow(/SpendingActivity can't mint/);
        });
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

            const mintDelegateActivity = mintDelegate.activity.MultipleDelegateActivities([
                mintDelegate.activity.MintingActivities.mintingUuts(tcx1, {purposes}).redeemer
            ]);
            const tcx1a = await capo.txnMintingUuts(tcx1, purposes, {
                mintDelegateActivity
            });

            await expect(
                h.submitTxnWithBlock(tcx1a, expectTxnError)
            ).rejects.toThrow(
                /mintDgt: MultipleDelegateActivities: nested MintingActivities invalid/
            );
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

            const tcx1a = await capo.txnMintingUuts(tcx1, purposes, {
                mintDelegateActivity:
                    mintDelegate.activity.MultipleDelegateActivities([
                        mintDelegate.activity.SpendingActivities.mockWorkingSpendActivity(textToBytes("anything")).redeemer
                    ]
                    ),
            });

            await expect(
                h.submitTxnWithBlock(tcx1a, expectTxnError)
            ).rejects.toThrow(/mintDgt: Multi.* SpendingActivities invalid/);
        });

        it("fails minting if the mintDgt has a UpdatingDelegatedDatum activity", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            await h.reusableBootstrap();
            const capo = h.strella!;
            const mintDelegate = await capo.getMintDelegate();
            const tcx1 = await capo.tcxWithSeedUtxo(h.mkTcx());
            const purposes = ["fooPurpose"];

            const hacktivity =
                mintDelegate.activity.UpdatingDelegatedData({
                    dataType: "fooPurpose",
                    recId: textToBytes("fooPurpose-xyz123")
            });

            const tcx1a = await capo.txnMintingUuts(tcx1, purposes, {
                mintDelegateActivity: hacktivity,
            });

            await expect(
                h.submitTxnWithBlock(tcx1a, expectTxnError)
            ).rejects.toThrow(/UpdatingDelegatedDatum can't mint/);
        });

        it("can mint with MultipleDelegateActivities having one CreatingDelegatedDatum", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            await h.reusableBootstrap();
            const capo = h.strella!;
            const mintDelegate = await capo.getMintDelegate();
            const tcx1 = await capo.tcxWithSeedUtxo(h.mkTcx());
            const purposes = ["fooPurpose"];

            const hacktivity = mintDelegate.activity.CreatingDelegatedData(
                tcx1,
                {dataType: "fooPurpose"}
            );

            const tcx1a = await capo.txnMintingUuts(tcx1, purposes, {
                mintDelegateActivity:
                    mintDelegate.activity.MultipleDelegateActivities([
                        hacktivity.redeemer
                    ]),
            });

            // this test doesn't run a txn successfully, because there are no
            // delegated-data controllers in the current test setup
            // ... however, the failure message indicates that the script
            // ... unwrapping the MultipleDelegateActivities, trying to
            // ... mint the new delegated data record, and not finding
            // ... a workable policy for it.  So that's a good kind of failure.
            // We can make this test better and prove the positive use-case end-to-end.
            const submitting = tcx1a.submit({ expectError: true });
            await expect(submitting).rejects.toThrow(
                /missing required data policy.*fooPurpose/
            );
        });

        it.todo(
            "TODO: TEST can mint with MultipleDelegateActivities having one DeletingDelegatedDatum",
            async (context: localTC) => {
                // there's not yet a working case for deleting delegated data.
                // ^^ contributions welcome
            }
        );

        it.todo(
            "TODO: TEST won't mint with MultipleDelegateActivities having any UpdatingDelegatedDatum",
            async (context: localTC) => {
                // TODO :please:
            }
        );

        it.todo(
            "TODO: TEST won't mint with MultipleDelegateActivities duplicate CreatingDelegatedDatum",
            async (context: localTC) => {
                // TODO :please:
            }
        );

        it.todo(
            "TODO: TEST can mint with MultipleDelegateActivities having multiple CreatingDelegatedDatum or DeletingDelegatedDatum activities",
            async (context: localTC) => {}
        );
    });
});
