import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
} from "vitest";

import { ADA, StellarTestContext, addTestContext } from "../src/testing";
import { CustomCapoTestHelper } from "./customizing/CustomCapoTestHelper";

type localTC = StellarTestContext<CustomCapoTestHelper>;
const wrongMinSigs = /minSigs can't be more than the size of the trustee-list/;
const notEnoughSignaturesRegex = /not enough trustees.*have signed/;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip;

const describe = descrWithContext<localTC>;

// args = args || {
//     trustees: [tina.address, tom.address, tracy.address],
//     minSigs: 2,
// };

describe("Capo: Authority: Multisig", async () => {
    beforeEach<localTC>(async (context) => {
        // await new Promise(res => setTimeout(res, 10));
        await addTestContext(context, CustomCapoTestHelper);
    });

    describe("the trustee threshold is enforced on all administrative actions", () => {
        it("works with a minSigs=1 if one person signs", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            const { tina, tom, tracy } = actors;
            await h.initialize();
            // await delay(1000);
            const treasury = context.strella!;

            await h.mintCharterToken({
                trustees: [tina.address, tom.address, tracy.address],
                minSigs: 1,
            });

            const count = 1n;

            const tcx = await treasury.mkTxnUpdateCharter(
                [tina.address, tom.address],
                count
            );

            await treasury.submit(tcx, { signers: [tina, tom] });
        });

        it("breaks with a minSigs=2 and only one person signs", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            const { tina, tom, tracy } = actors;
            await h.initialize();
            const treasury = context.strella!;

            await h.mintCharterToken({
                trustees: [tina.address, tom.address, tracy.address],
                minSigs: 2,
            });

            const count = 1n;

            const tcx = await treasury.mkTxnUpdateCharter(
                [tina.address, tom.address],
                count
            );

            await expect(treasury.submit(tcx)).rejects.toThrow(
                notEnoughSignaturesRegex
            );
        });

        it("works with a minSigs=2 and three people sign", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            const { tina, tom, tracy } = actors;
            await h.initialize();
            const treasury = context.strella!;

            await h.mintCharterToken({
                trustees: [tina.address, tom.address, tracy.address],
                minSigs: 2,
            });

            const count = 1n;

            const tcx = await treasury.mkTxnUpdateCharter(
                [tina.address, tom.address],
                count
            );

            await treasury.submit(tcx, { signers: [tina, tom, tracy] });
        });
    });

    describe("the trustee group can be changed", () => {
        it("requires the existing threshold of existing trustees to be met", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            state.signers = [actors.tina];

            await expect(
                h.updateCharter([actors.tina.address], 1n)
            ).rejects.toThrow(notEnoughSignaturesRegex);
        });

        it("requires all of the new trustees to sign the transaction", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            state.signers = [actors.tina, actors.tom];

            await expect(
                h.updateCharter([actors.tracy.address], 1n)
            ).rejects.toThrow(/all the new trustees must sign/);

            state.signers = [actors.tina, actors.tom, actors.tracy];
            return h.updateCharter([actors.tracy.address], 1n);
        });

        it("does not allow minSigs to exceed the number of trustees", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            state.signers = [actors.tina, actors.tracy];

            await expect(
                h.updateCharter([actors.tracy.address], 2n)
            ).rejects.toThrow(wrongMinSigs);
        });
    });
});
