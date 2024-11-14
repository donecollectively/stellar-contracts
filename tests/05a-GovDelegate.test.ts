import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";

import { ADA, addTestContext } from "../src/testing/types";
import { StellarTestContext } from "../src/testing/StellarTestContext";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings";


//xxx@ts-expect-error
type localTC = StellarTestContext<DefaultCapoTestHelper<CapoWithoutSettings>>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

describe("Capo", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(
            context,
            DefaultCapoTestHelper.forCapoClass(CapoWithoutSettings)
        );
    });

    describe.skip("TODO: Gov delegate", () => {
        describe("can update the govDelegate when needed", () => {
            let capo : CapoWithoutSettings;
            beforeEach<localTC>(async (context) => {
                const {h, h:{network, actors, delay, state} } = context;
                 capo = await h.bootstrap({
                    mintDelegateLink: {
                        config: {}
                    }
                });
            })

            it.skip("the charter.govDelegate can't be updated without the existing capoGov- authority uut", async (context: localTC) => {
        //         // // prettier-ignore
        //         // const {h, h:{network, actors, delay, state} } = context;
    
        //         // const addedGovToken = vi
        //         //     .spyOn(capo, "txnAddGovAuthority")
        //         //     .mockImplementation(
        //         //         //@ts-expect-error
        //         //         (tcx) => tcx!
        //         //     );
    
        //         // const tcx = await capo.mkTxnChangingGovDelegate();
        //         // expect(addedGovToken).toHaveBeenCalledTimes(1);
        //         // await expect(capo.submit(tcx)).rejects.toThrow(
        //         //     /missing dgTkn capoGov-/
        //         // );
            })

            it.todo("burns the old gov delegate when updating", async (context: localTC) => {

            });

            it("a new gov delegate can be installed, by authority of the existing capo-Gov delegate", async (context: localTC) => {
        //         // prettier-ignore
        //         const {h, h:{network, actors, delay, state} } = context;

        //         const firstCharter = await capo.findCharterDatum();
        //         const firstGovDelegate = firstCharter.govAuthorityLink;

        //         const tcx = await capo.mkTxnChangingGovDelegate();
        //         await tcx.submit()
        //         network.tick(1);
        //         const charter = await capo.findCharterDatum();
        //         expect(charter.govAuthorityLink.uutName).toBeTruthy();
        //         expect(charter.govAuthorityLink.uutName).not.toBe(firstGovDelegate.uutName);
            })

            it("the new gov delegate is required after updating", async (context: localTC) => {
        //         // prettier-ignore
        //         const {h, h:{network, actors, delay, state} } = context;
    
        //         const tcx = await capo.mkTxnChangingGovDelegate();
        //         const charter = await capo.findCharterDatum();

        //         const addedGovToken = vi
        //             .spyOn(capo, "txnAddGovAuthority")
        //             .mockImplementation(
        //                 //@ts-expect-error
        //                 (tcx) => tcx!
        //             );
    
        //         expect(addedGovToken).toHaveBeenCalledTimes(1);
        //         await expect(capo.submit(tcx)).rejects.toThrow(
        //             `missing dgTkn capoGov-${charter.govAuthorityLink.uutName}`
        //         );
            })
        });
    });
});
