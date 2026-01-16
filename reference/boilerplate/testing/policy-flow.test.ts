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
        await h.snapToFirstPendingOrder();

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
