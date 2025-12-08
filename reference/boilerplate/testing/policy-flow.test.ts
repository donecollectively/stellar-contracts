// @ts-nocheck
import {
    describe as descrWithContext,
    it as itWithContext,
    expect,
    beforeEach,
    vi,
} from "vitest";

import { addTestContext, StellarTestContext } from "@donecollectively/stellar-contracts/testing";
import { PizzaTestHelper, helperState } from "../testHelper";

type TC = StellarTestContext<PizzaTestHelper>;
const describe = descrWithContext<TC>;
const it = itWithContext<TC>;

describe("pizza: policy-ish flow with snapshots and negative paths", () => {
    beforeEach<TC>(async (context) => {
        await addTestContext(context, PizzaTestHelper, undefined, helperState);
    });

    it("happy path: registered customer → pending order → baked", async ({ h }) => {
        await h.snapToFirstOrderBaked();
        expect(h.helperState.namedRecords["firstRegisteredCustomer"]).toBeDefined();
        expect(h.helperState.namedRecords["firstPendingOrder"]).toBeDefined();
        expect(h.helperState.namedRecords["firstBakedOrder"]).toBeDefined();
    });

    it("negative path: controller tampering is caught", async ({ h }) => {
        await h.snapToFirstOrderPending();

        const fakeController = {
            mkTxnUpdateRecord: (...args: unknown[]) => ({ args }),
        };

        vi.spyOn(fakeController, "mkTxnUpdateRecord").mockImplementation(() => {
            throw new Error("must not add pineapple without consent");
        });

        await expect(async () => {
            // Replace with your own policy/controller flow.
            fakeController.mkTxnUpdateRecord("pizza-policy", { pie: "pineapple" });
        }).rejects.toThrow(/must not add pineapple/);
    });

    it("snapshot chaining: baked depends on pending depends on registration", async ({ h }) => {
        await h.snapToFirstOrderBaked();
        expect(h.helperState.snapshots["firstRegisteredCustomer"]).toBe(true);
        expect(h.helperState.snapshots["firstOrderPending"]).toBe(true);
        expect(h.helperState.snapshots["firstOrderBaked"]).toBe(true);
    });
});
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

