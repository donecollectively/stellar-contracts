import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
    beforeAll,
} from "vitest";
import { makeTxOutput, Value } from "@helios-lang/ledger";


import { CapoWithoutSettings } from "@donecollectively/stellar-contracts";

import { addTestContext, TestHelperState } from "../src/testing/types.js";
import { CapoWithoutSettings_testHelper, TestContext_CapoWithoutSettings } from "./CapoWithoutSettingsTestHelper.js";

let helperState: TestHelperState<CapoWithoutSettings> = {
    snapshots: {},
} as any;
type LOCAL_TC = TestContext_CapoWithoutSettings;

const months = 24 * 60 * 60 * 1000 * 30;

const it = itWithContext<TestContext_CapoWithoutSettings>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<LOCAL_TC>;
describe.skip("Capo Requirements", async () => {
    beforeEach<LOCAL_TC>(async (context) => {
        
        await new Promise((res) => setTimeout(res, 10));
        console.log("\n\n\n\n   ==================== ======================");
        await addTestContext(
            context,
            CapoWithoutSettings_testHelper,
            undefined,
            helperState
            // testContextSnapshots - TODO shift this capability to upstream.
        );
        await context.h.delay(10);
    });

    describe("findListenerVaultUtxos()", () => {
        it("finds the listener's vault entries", async (context: LOCAL_TC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
            await h.reusableBootstrap();

            await h.setActor("lila");
            let capo: CapoWithoutSettings = h.strella;

            expect(await capo.findListenerBox()).toBeFalsy();

            await h.snapToFirstListenerBox();
            const vault = await capo.findListenerBox();
            expect(vault).toBeTruthy();
        });
    });

    describe("mkTxnStartingListenerBox()", () => {
        it("creates a ListenerBox utxo in the contract with the StartingListenerBox activity", async (context: LOCAL_TC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
            await h.reusableBootstrap();
            await h.snapToFirstListenerBox();
            let { capo } = h;

            const listenerBox = await capo.findListenerBox();
            expect(listenerBox).toBeTruthy();
            expect(
                listenerBox.utxo.address.eq(capo.address),
                "wrong address"
            ).toBeTruthy();

            expect(
                [listenerBox.utxo].find(
                    capo.mkTokenPredicate(capo.mph, listenerBox.datum.id)
                )
            ).toBeTruthy();
        });

        it("won't create the vault without the listener's member token ", async (context: LOCAL_TC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
            await h.reusableBootstrap();
            await h.setActor("lila");

            let capo: DEMUTokenomicsCapo = h.strella;
            await h.snapToFirstListenerMember();

            const member = await capo.findMemberInfo();
            const listenerVaultDelegate = await capo.getListenerVaultDelegate();
            console.log("  ------------  ⚗️ ⚗️ ⚗️ ⚗️ 🐞  member: ", member);
            const didGetMemberInfo = vi
                .spyOn(capo, "mkTxnWithMemberInfo")
                .mockImplementation(async () => {
                    console.log("  ------------  ⚗️ ⚗️ ⚗️ ⚗️ 🐞  mock member info: ", context);

                    const t =
                        //@ts-expect-error
                        new StellarTxnContext() as hasMemberToken ;
                    t.state.memberToken = member.uut;
                    
                    return capo.tcxWithSeedUtxo(t)
                });
                const mockTokenReturn = vi.spyOn(
                    listenerVaultDelegate, "txnReturnMemberTokenPlus"
                ).mockImplementation(async (tcx, v: Value) => {
                    console.log("fake txnReturnMemberTokenPlus");
                    
                    return tcx.addOutput(makeTxOutput(
                        member.utxo.address, v
                    ));
                })
                
            let submitting = h.createListenerBox(sampleListenerBox, {
                initialVaultStake: 14n * ADA,
            });
            // await submitting;
            await expect(submitting).rejects.toThrow(/missing member token/);
            expect(didGetMemberInfo).toHaveBeenCalled();
            expect(mockTokenReturn).toHaveBeenCalled();
        });

        it("requires a minimum deposit to register", async (context: LOCAL_TC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
            await h.reusableBootstrap();
            await h.setActor("lila");
            await h.snapToFirstListenerMember();
            const capo = h.capo;

            const listenerVaultDelegate = await capo.getListenerVaultDelegate();

            const mockFee = vi
                .spyOn(listenerVaultDelegate, "txnListenerMemberFee")
                .mockImplementation(async (tcx) => {
                    return new helios.Value(capo.ADA(0.5));
                });

            const registering1 = h.createListenerBox(
                sampleListenerBox,
                { initialVaultStake: 0n }
            );
            await expect(registering1).rejects.toThrow(
                /short fee for lsnrBox/
            );
            expect(mockFee).toHaveBeenCalled();
            mockFee.mockRestore();

            // await h.registerAlbum();
            // const registering2 = h.registerAlbum();
            //
            // const newAlbum = tcx.state.uuts.lsnrBox
            // const destination = tcx.outputs.find(capo.mkTokenPredicate(capo.mph, newAlbum.name));
            // expect(destination.value.ge(capo.mkMinTv(capo.mph, newAlbum))).toBeTruthy();
        });

    });

    describe("mkTxnUpdatingReqt()", () => {
        beforeEach<LOCAL_TC>(async (context: LOCAL_TC) => {
            const {h, h:{network, actors, delay, state} } = context;
            await h.delay(100);
            await h.reusableBootstrap();
            await h.snapToFirstReqt();
            await h.setActor("lila");
        });

        it("fails if the listenerVault-* UUT is not returned", async (context: LOCAL_TC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
            let { capo } = h;

            const listenerVaultDelegate = await capo.getListenerVaultDelegate();
            const member = await capo.findMemberInfo();

            const didReceiveAuthToken = vi
                .spyOn(listenerVaultDelegate, "txnReceiveAuthorityToken")
                .mockImplementation(async (tcx) => {
                    return tcx;
                });
            const listenerBox = await capo.findListenerBox();
            expect(listenerBox).toBeTruthy();
            console.log("  ---  ⚗️🐞  albumInfo: ", listenerBox);
            const updating = h.listenerUpdatesBoxDeposit(listenerBox, {
                depositIncrement: 0n,
            });

            await expect(updating).rejects.toThrow(
                /dgTkn not returned: listenerVault-/
            );

            expect(didReceiveAuthToken).toHaveBeenCalled();
        });

    });
});
