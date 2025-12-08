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

export const helperState: TestHelperState = {
    snapshots: {},
    namedRecords: {},
};

type OrderUuts = { recordId: string };

export class PizzaTestHelper extends DefaultCapoTestHelper {
    // Snapshot decorators must wrap a thin wrapper (never called directly)
    @CapoTestHelper.hasNamedSnapshot("firstRegisteredCustomer", "tina")
    async snapToFirstRegisteredCustomer() {
        // never called; see firstRegisteredCustomer()
        throw new Error("decorated snapshot wrapper; call registerFirstCustomer()");
    }

    @CapoTestHelper.hasNamedSnapshot("firstOrderPending", "tina")
    async snapToFirstOrderPending() {
        throw new Error("decorated snapshot wrapper; call proposeFirstOrder()");
    }

    @CapoTestHelper.hasNamedSnapshot("firstOrderBaked", "tom")
    async snapToFirstOrderBaked() {
        throw new Error("decorated snapshot wrapper; call bakeFirstOrder()");
    }

    /**
     * Register the first customer; stores record id via captureRecordId.
     */
    async registerFirstCustomer(options: { submit?: boolean; expectError?: true } = {}) {
        const { submit = true, expectError } = options;
        await this.bootstrap();
        await this.setActor("tina"); // chef/owner
        const tcx = this.mkCustomerTxn("tina");
        return this.captureRecordId({ recordName: "firstRegisteredCustomer", submit, expectError }, tcx);
    }

    /**
     * Propose first order; depends on registered customer snapshot.
     */
    async proposeFirstOrder(options: { submit?: boolean; expectError?: true } = {}) {
        const { submit = true, expectError } = options;
        await this.snapToFirstRegisteredCustomer();
        await this.setActor("tina"); // same actor to place order
        const tcx = this.mkOrderTxn({ pie: "margherita", drink: "sparkling" });
        return this.captureRecordId({ recordName: "firstPendingOrder", submit, expectError }, tcx);
    }

    /**
     * Bake/approve first order; chains from pending; switches actor.
     */
    async bakeFirstOrder(options: { submit?: boolean; expectError?: true } = {}) {
        const { submit = true, expectError } = options;
        await this.snapToFirstOrderPending();
        await this.setActor("tom"); // baker/approver
        const tcx = this.mkOrderUpdateTxn("firstPendingOrder", { status: "Baked" });
        return this.captureRecordId({ recordName: "firstBakedOrder", submit, expectError }, tcx);
    }

    /**
     * Centralized id capture, matching production helpers.
     */
    async captureRecordId<
        T extends StellarTxnContext<any> & { state: { uuts: OrderUuts } },
        const U extends string & keyof T["state"]["uuts"] = "recordId",
    >(
        options: {
            recordName: string;
            submit?: boolean;
            uutName?: U;
            expectError?: true;
        },
        tcx: Promise<T> | T,
    ) {
        const { recordName, submit = true, uutName = "recordId" as U, expectError } = options;
        const built = await tcx;
        const id = built.state.uuts[uutName];
        if (!id) throw new Error(`captureRecordId: no ${String(uutName)} found for ${recordName}`);
        this.helperState.namedRecords[recordName] = id.toString();
        if (submit) return this.submitTxnWithBlock(built, { expectError });
        return built;
    }

    // --- sample txn factories (replace with real controller calls) ---
    mkCustomerTxn(name: string) {
        const tcx = this.mkTcx();
        tcx.state.uuts = { recordId: `cust-${name}` };
        tcx.state.customer = { name };
        return tcx;
    }

    mkOrderTxn(order: { pie: string; drink: string }) {
        const tcx = this.mkTcx();
        tcx.state.uuts = { recordId: `order-${order.pie}` };
        tcx.state.order = order;
        return tcx;
    }

    mkOrderUpdateTxn(existingName: string, updated: Record<string, string>) {
        const tcx = this.mkTcx();
        const id = this.helperState.namedRecords[existingName];
        if (!id) throw new Error(`no named record ${existingName}`);
        tcx.state.uuts = { recordId: id };
        tcx.state.orderUpdate = updated;
        return tcx;
    }
}

