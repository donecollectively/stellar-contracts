import {
    describe as descrWithContext,
    it as itWithContext,
    expect,
    beforeEach,
} from "vitest";

import {
    addTestContext,
    StellarTestContext,
} from "../../src/testing";
import { DefaultCapoTestHelper } from "../../src/testing/DefaultCapoTestHelper";

type TC = StellarTestContext<DefaultCapoTestHelper>;
const describe = descrWithContext<TC>;
const it = itWithContext<TC>;

// Template: remove `describe.skip` when you wire this to your own Capo subclass.
describe.skip("template: basic off-chain happy path", () => {
    beforeEach<TC>(async (context) => {
        await addTestContext(context, DefaultCapoTestHelper);
    });

    it("initializes helper + capo and reads a wallet", async ({ h }) => {
        const capo = await h.initialize();
        expect(capo.address.kind).toBe("Address");

        const tinaMoney = await h.actors.tina.utxos;
        expect(tinaMoney.length).toBeGreaterThan(0);
    });
});

