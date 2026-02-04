// @ts-nocheck
/**
 * Pizza-themed example test helper showing the same conventions as production helpers:
 * - @CapoTestHelper.hasNamedSnapshot with parentSnapName for chaining
 * - snapToX entrypoints + builder methods (builders do incremental work only)
 * - captureRecordId + submitTxnWithBlock
 * - createTestContext() for pre-wired describe/it exports
 */

import {
    CapoTestHelper,
    DefaultCapoTestHelper,
    type StellarTestContext,
} from "@donecollectively/stellar-contracts/testing";

// Test context type - tests use this for type annotations
export type PizzaCapo_TC = StellarTestContext<PizzaCapoTestHelper>;

export class PizzaCapoTestHelper extends DefaultCapoTestHelper.forCapoClass(PizzaCapo) {
    getOrderController() {
        return this.capo.getDgDataController("Order");
    }

    // --- Snapshot entry points ---
    // The decorator replaces the method body entirely. Include throw + return for documentation.
    // parentSnapName declares the parent - do NOT call snapTo<parent>() in the builder.

    @CapoTestHelper.hasNamedSnapshot("firstRegisteredCustomer", {
        actor: "wally",
        parentSnapName: "bootstrapped",
    })
    async snapToFirstRegisteredCustomer() {
        throw new Error("never called; see firstRegisteredCustomer()");
        return this.firstRegisteredCustomer();
    }

    /**
     * Register the first customer; stores record id via captureRecordId.
     *
     * NOTE: The decorator handles bootstrap via parentSnapName: "bootstrapped".
     * Builders should only contain the INCREMENTAL work for this snapshot.
     */
    async firstRegisteredCustomer(
        options: { submit?: boolean; expectError?: true } = {},
    ) {
        const { submit = true, expectError } = options;
        // Parent snapshot ("bootstrapped") is loaded automatically by the decorator.
        // Just set the actor and do this snapshot's work.
        await this.setActor("wally"); // a worker at the pizza store
        const tcx = this.mkTxnCreateCustomer("carla");
        return this.captureRecordId(
            { recordName: "firstRegisteredCustomer", submit, expectError },
            tcx,
        );
    }

    @CapoTestHelper.hasNamedSnapshot("firstPendingOrder", {
        actor: "tina",
        parentSnapName: "firstRegisteredCustomer",
    })
    async snapToFirstPendingOrder() {
        throw new Error("never called; see firstPendingOrder()");
        return this.firstPendingOrder();
    }

    /**
     * Create first pending order.
     *
     * NOTE: Parent snapshot ("firstRegisteredCustomer") is loaded automatically
     * via parentSnapName. Do NOT call snapToFirstRegisteredCustomer() here.
     */
    async firstPendingOrder(options: { submit?: boolean; expectError?: true } = {}) {
        const { submit = true, expectError } = options;
        // Parent loaded automatically - just do this snapshot's incremental work
        await this.setActor("carla"); // the customer places an order
        const tcx = this.mkTxnCreateOrder({
            pie: "margherita",
            drink: "sparkling",
        });
        return this.captureRecordId(
            {
                recordName: "firstPendingOrder",
                submit,
                expectError,
            },
            tcx,
        );
    }

    @CapoTestHelper.hasNamedSnapshot("firstOrderBaked", {
        actor: "baker",
        parentSnapName: "firstPendingOrder",
    })
    async snapToFirstOrderBaked() {
        throw new Error("never called; see firstOrderBaked()");
        return this.firstOrderBaked();
    }

    /**
     * Bake/approve first order.
     *
     * NOTE: Parent snapshot ("firstPendingOrder") is loaded automatically
     * via parentSnapName. Do NOT call snapToFirstPendingOrder() here.
     */
    async firstOrderBaked(
        options: { submit?: boolean; expectError?: true } = {},
    ) {
        const { submit = true, expectError } = options;
        // Parent loaded automatically - just do this snapshot's incremental work
        await this.setActor("bobby"); // baker processes the order
        const tcx = this.mkTxnUpdateOrder("firstPendingOrder", {
            status: "Baked",
        });

        return this.captureRecordId(
            {
                recordName: "firstBakedOrder",
                submit,
                expectError,
            },
            tcx,
        );
    }

    // --- Sample txn factories (replace with real controller calls) ---
    mkTxnCreateCustomer(name: string) {
        const tcx = this.mkTcx();
        tcx.state.uuts = { recordId: `cust-${name}` };
        tcx.state.customer = { name };
        return tcx;
    }

    mkTxnCreateOrder(order: { pie: string; drink: string }) {
        const tcx = this.mkTcx();
        tcx.state.uuts = { recordId: `order-${order.pie}` };
        tcx.state.order = order;
        return tcx;
    }

    mkTxnUpdateOrder(existingName: string, updated: Record<string, string>) {
        const tcx = this.mkTcx();
        const id = this.helperState!.namedRecords[existingName];
        if (!id) throw new Error(`no named record ${existingName}`);
        tcx.state.uuts = { recordId: id };
        tcx.state.orderUpdate = updated;
        return tcx;
    }
}

// Export pre-wired describe/it - test files import these instead of from vitest
export const { describe, it, fit, xit } = PizzaCapoTestHelper.createTestContext();
