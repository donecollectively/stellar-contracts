// @ts-nocheck
/**
 * Pizza-themed example test helper showing the same conventions as production helpers:
 * - @CapoTestHelper.hasNamedSnapshot
 * - snapToX entrypoints + builder methods
 * - helperState.snapshots + helperState.namedRecords
 * - captureRecordId + submitTxnWithBlock
 */

import {
    CapoTestHelper,
    DefaultCapoTestHelper,
    type TestHelperState,
} from "@donecollectively/stellar-contracts/testing";

import type { StellarTxnContext } from "@donecollectively/stellar-contracts";

type addlState = {
    namedRecords: Record<string, string>;
};

export const helperState: TestHelperState<PizzaCapo, addlState> = {
    snapshots: {},
    namedRecords: {},
} as any;

type OrderUuts = { recordId: string };

export type PizzaCapo_TC = StellarTestContext<PizzaCapoTestHelper> & {
    helperState: typeof helperState;
    snapshot(this: PizzaCapo_TC, snapName: string): void;
    loadSnapshot(this: PizzaCapo_TC, snapName: string): void;
    reusableBootstrap(this: PizzaCapo_TC): Promise<PizzaCapo>;
};

export class PizzaCapoTestHelper extends DefaultCapoTestHelper.forCapoClass(
    PizzaCapo,
    {} as any as addlState,
) {
    getOrderController() {
        return this.capo.getDgDataController("Order");
    }

    // Snapshot decorators must wrap a thin wrapper (never called directly)
    @CapoTestHelper.hasNamedSnapshot("firstRegisteredCustomer", "wally")
    async snapToFirstRegisteredCustomer() {
        throw new Error("never called; see registerFirstCustomer()");
        return this.registerFirstCustomer();
    }

    /**
     * Register the first customer; stores record id via captureRecordId.
     */
    async firstRegisteredCustomer(
        options: { submit?: boolean; expectError?: true } = {},
    ) {
        // ^ note that the snapshot builder name MUST match with the
        //   name of the snapshot-invocation method snapToFirstRegisteredCustomer!
        //   (this note doesn't need to be used in your helpers)
        const { submit = true, expectError } = options;
        await this.bootstrap();
        await this.setActor("wally"); // a worker at the pizza store
        const tcx = this.mkTxnCreateCustomer("carla");
        this.helperState.snapshots["firstRegisteredCustomer"] = true;
        return this.captureRecordId(
            { recordName: "firstRegisteredCustomer", submit, expectError },
            tcx,
        );
    }

    @CapoTestHelper.hasNamedSnapshot("firstOrderPending", "tina")
    async snapToFirstPendingOrder() {
        throw new Error("never called; see proposeFirstOrder()");
        return this.proposeFirstOrder();
    }

    firstPendingOrder(options: { submit?: boolean; expectError?: true } = {}) {
        const { submit = true, expectError } = options;
        await this.setActor("wally"); // a worker at the pizza store
        await this.snapToFirstRegisteredCustomer();
        await this.setActor("carla"); // the customer
        const tcx = this.mkTxnCreateOrder({
            pie: "margherita",
            drink: "sparkling",
        });
        this.helperState.snapshots["firstOrderPending"] = true;
        return this.captureRecordId(
            {
                recordName: "firstPendingOrder",
                submit,
                expectError,
            },
            tcx,
        );
    }

    @CapoTestHelper.hasNamedSnapshot("firstOrderBaked", "baker")
    async snapToFirstOrderBaked() {
        throw new Error("never called; see firstOrderBaked()");
        return this.bakeFirstOrder();
    }

    /**
     * Bake/approve first order; chains from pending; switches actor.
     */
    async firstOrderBaked(
        options: { submit?: boolean; expectError?: true } = {},
    ) {
        const { submit = true, expectError } = options;
        await this.setActor("carla"); // a worker at the pizza store
        await this.snapToFirstPendingOrder();
        await this.setActor("bobby"); // baker
        const tcx = this.mkOrderUpdateTxn("firstPendingOrder", {
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

    // --- sample txn factories (replace with real controller calls) ---
    mkTxnCreateCustomer(name: string) {
        // txn-creating functions always start with mkTxn...
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
        const id = this.helperState.namedRecords[existingName];
        if (!id) throw new Error(`no named record ${existingName}`);
        tcx.state.uuts = { recordId: id };
        tcx.state.orderUpdate = updated;
        return tcx;
    }
}
