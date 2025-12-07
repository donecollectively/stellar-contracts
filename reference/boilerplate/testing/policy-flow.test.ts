import {
    describe as descrWithContext,
    it as itWithContext,
    expect,
    beforeEach,
    vi,
} from "vitest";

import {
    addTestContext,
    StellarTestContext,
} from "../../src/testing";
import { DefaultCapoTestHelper } from "../../src/testing/DefaultCapoTestHelper";

type TC = StellarTestContext<DefaultCapoTestHelper>;
const describe = descrWithContext<TC>;
const it = itWithContext<TC>;

// Template: swap DefaultCapoTestHelper for your app-specific helper (e.g., S3CapoTestHelper).
describe.skip("template: delegated-data / policy flow", () => {
    beforeEach<TC>(async (context) => {
        await addTestContext(context, DefaultCapoTestHelper);
    });

    it("shows how to stub a controller and assert the failure path", async ({ h }) => {
        await h.bootstrap(); // replace with your own scenario shortcut

        const fakeController = {
            mkTxnUpdateRecord: (...args: unknown[]) => ({ args }),
        };

        vi.spyOn(fakeController, "mkTxnUpdateRecord").mockImplementation(() => {
            throw new Error("must not modify the proposed data");
        });

        await expect(async () => {
            // TODO: call your policy/controller flow here, passing `fakeController`
            throw new Error("replace this throw with your own flow");
        }).rejects.toThrow(/must not modify the proposed data/);
    });
});

