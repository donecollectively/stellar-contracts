// @ts-nocheck
import {
    describe as descrWithContext,
    it as itWithContext,
    expect,
    beforeEach,
} from "vitest";

import {
    addTestContext,
    StellarTestContext,
} from "@donecollectively/stellar-contracts/testing";

import {
    PizzaCapoTestHelper,
    type PizzaCapo_TC,
    helperState,
} from "../testHelper.js";

type TC = StellarTestContext<PizzaTestHelper>;
const describe = descrWithContext<TC>;
const it = itWithContext<TC>;

describe("pizza: basic off-chain transaction-building flow with snapshots", () => {
    beforeEach<PizzaCapo_TC>(async (context) => {
        await addTestContext(
            context,
            PizzaCapoTestHelper,
            undefined,
            helperState
        );
    });

    it("shows how the helper state evolves when snapshots are used", async (context: PizzaCapo_TC) => {
        const {
            h,
            h: { network, actors, delay, state },
        } = context;
        await h.reusableBootstrap();
        await h.snapToFirstRegisteredCustomer();

        expect(h.helperState.snapshots["firstRegisteredCustomer"]).toBe(true);
        expect(h.helperState.namedRecords["firstRegisteredCustomer"]).toMatch(
            /cust-/
        );
    });

    it("registers the first customer via decorated snapshot", async (context: PizzaCapo_TC) => {
        const {
            h,
            h: { network, actors, delay, state },
        } = context;

        // the first test is not fast.
        await h.snapToFirstRegisteredCustomer();

        const carla = await h.findFirstCustomer();
        expect(carla.data.name).toBe("carla");
    });

    it("rejects orders without a credit card", async (context: PizzaCapo_TC) => {
        const {
            h,
            h: { network, actors, delay, state },
        } = context;

        // the second test quickly gets to the "registered customer" snapshot
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

    it("chains pending order after customer registration", async (context: PizzaCapo_TC) => {
        const {
            h,
            h: { network, actors, delay, state },
        } = context;

        // the third test quickly gets to the "registered customer" snapshot,
        // then takes a few more moments to build the pending order.
        // this time, it's successful
        await h.snapToFirstPendingOrder();

        expect(h.helperState.snapshots["firstRegisteredCustomer"]).toBe(true);
        expect(h.helperState.snapshots["firstOrderPending"]).toBe(true);
        expect(h.helperState.namedRecords["firstPendingOrder"]).toMatch(
            /order-/
        );
    });

    it("rejects orders with multiple coupons", async (context: PizzaCapo_TC) => {
        const {
            h,
            h: { network, actors, delay, state },
        } = context;

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

    it("bakes the first order and captures the baked id", async (context: PizzaCapo_TC) => {
        const {
            h,
            h: { network, actors, delay, state },
        } = context;

        await h.snapToFirstOrderBaked();
        const firstOrder = await h.findFirstOrder();
        expect(firstOrder.data.status).toBe("readyForDelivery");
        
        // other test logic here...
    });
});
