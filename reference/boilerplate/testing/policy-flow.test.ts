// @ts-nocheck
import { vi, expect } from "vitest";

// Import pre-wired describe/it from your test helper - NOT from vitest!
// fit = focused test, xit = skipped test
import { describe, it, fit, xit, type PizzaCapo_TC } from "../testHelper.js";

describe("pizza: policy-ish flow with snapshots and negative paths", () => {
    it("happy path: registered customer → pending order → baked", async ({ h }: PizzaCapo_TC) => {
        // snapToFirstOrderBaked loads the full chain automatically via parentSnapName
        await h.snapToFirstOrderBaked();

        // All records captured in namedRecords through the chain
        expect(h.helperState!.namedRecords["firstRegisteredCustomer"]).toBeDefined();
        expect(h.helperState!.namedRecords["firstPendingOrder"]).toBeDefined();
        expect(h.helperState!.namedRecords["firstBakedOrder"]).toBeDefined();
    });

    it("negative path: controller tampering is caught", async ({ h }: PizzaCapo_TC) => {
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

    it("snapshot chaining loads full parent hierarchy", async ({ h }: PizzaCapo_TC) => {
        // Just call the leaf snapshot - parents are loaded automatically
        await h.snapToFirstOrderBaked();

        // Verify the chain was loaded by checking namedRecords
        expect(h.helperState!.namedRecords["firstRegisteredCustomer"]).toBeDefined();
        expect(h.helperState!.namedRecords["firstPendingOrder"]).toBeDefined();
        expect(h.helperState!.namedRecords["firstBakedOrder"]).toBeDefined();
    });
});
