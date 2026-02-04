// @ts-nocheck
import { vi, expect } from "vitest";

// Import pre-wired describe/it from your test helper - NOT from vitest!
// This auto-injects the helper instance as `h` in the test context.
// fit = focused test (only runs this one), xit = skipped test
import {
    describe,
    it,
    fit,
    xit,
    type PizzaCapo_TC,
} from "../testHelper.js";

describe("pizza: basic off-chain transaction-building flow with snapshots", () => {
    it("shows how named records are captured during snapshots", async ({ h }: PizzaCapo_TC) => {
        await h.snapToFirstRegisteredCustomer();

        // captureRecordId stores IDs in helperState.namedRecords
        expect(h.helperState!.namedRecords["firstRegisteredCustomer"]).toMatch(
            /cust-/
        );
    });

    it("registers the first customer via decorated snapshot", async ({ h }: PizzaCapo_TC) => {
        await h.snapToFirstRegisteredCustomer();

        const carla = await h.findFirstCustomer();
        expect(carla.data.name).toBe("carla");
    });

    it("rejects orders without a credit card", async ({ h }: PizzaCapo_TC) => {
        await h.snapToFirstRegisteredCustomer();
        await h.setActor("carla"); // the customer
        const orderController = await h.getOrderController();
        vi.spyOn(orderController, "addCreditCard").mockImplementation(() => {
            // skips adding credit card to the transaction
        });
        const tcx = h.mkTxnCreateOrder({
            pie: "margherita",
            drink: "sparkling",
        });
        await expect(
            h.submitTxnWithBlock(tcx, {
                expectError: true,
            })
        ).rejects.toThrow(/missing credit card/);
    });

    it("chains pending order after customer registration", async ({ h }: PizzaCapo_TC) => {
        // snapToFirstPendingOrder automatically loads its parent (firstRegisteredCustomer)
        // via parentSnapName - no manual chaining needed
        await h.snapToFirstPendingOrder();

        // Both records are captured in namedRecords
        expect(h.helperState!.namedRecords["firstRegisteredCustomer"]).toMatch(/cust-/);
        expect(h.helperState!.namedRecords["firstPendingOrder"]).toMatch(/order-/);
    });

    it("rejects orders with multiple coupons", async ({ h }: PizzaCapo_TC) => {
        await h.snapToFirstRegisteredCustomer();
        const orderController = await h.getOrderController();
        vi.spyOn(orderController, "addCoupon").mockImplementation((tcx) => {
            tcx.txnAddCoupon({ coupon: "10% off" });
            tcx.txnAddCoupon({ coupon: "20% off" });
            return tcx;
        });

        const tcx = h.mkTxnCreateOrder({
            pie: "margherita",
            drink: "sparkling",
        });
        await expect(
            h.submitTxnWithBlock(tcx, { expectError: true })
        ).rejects.toThrow(/multiple coupons/);
    });

    it("bakes the first order and captures the baked id", async ({ h }: PizzaCapo_TC) => {
        await h.snapToFirstOrderBaked();
        const firstOrder = await h.findFirstOrder();
        expect(firstOrder.data.status).toBe("readyForDelivery");

        // other test logic here...
    });
});
