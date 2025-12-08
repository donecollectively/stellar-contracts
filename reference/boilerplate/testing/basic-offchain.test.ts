// @ts-nocheck
import {
    describe as descrWithContext,
    it as itWithContext,
    expect,
    beforeEach,
} from "vitest";

import { addTestContext, StellarTestContext } from "@donecollectively/stellar-contracts/testing";
import { PizzaTestHelper, helperState } from "../testHelper";

type TC = StellarTestContext<PizzaTestHelper>;
const describe = descrWithContext<TC>;
const it = itWithContext<TC>;

describe("pizza: basic off-chain flow with snapshots", () => {
    beforeEach<TC>(async (context) => {
        await addTestContext(context, PizzaTestHelper, undefined, helperState);
    });

    it("registers the first customer via decorated snapshot", async ({ h }) => {
        await h.snapToFirstRegisteredCustomer();
        expect(h.helperState.snapshots["firstRegisteredCustomer"]).toBe(true);
        expect(h.helperState.namedRecords["firstRegisteredCustomer"]).toMatch(/cust-/);

        // second call should reuse without rebuilding
        await h.snapToFirstRegisteredCustomer();
        expect(h.helperState.snapshots["firstRegisteredCustomer"]).toBe(true);
    });

    it("chains pending order after customer registration", async ({ h }) => {
        await h.snapToFirstOrderPending();
        expect(h.helperState.snapshots["firstRegisteredCustomer"]).toBe(true);
        expect(h.helperState.snapshots["firstOrderPending"]).toBe(true);
        expect(h.helperState.namedRecords["firstPendingOrder"]).toMatch(/order-/);
    });

    it("bakes the first order and captures the baked id", async ({ h }) => {
        await h.snapToFirstOrderBaked();
        expect(h.helperState.snapshots["firstOrderPending"]).toBe(true);
        expect(h.helperState.snapshots["firstOrderBaked"]).toBe(true);
        expect(h.helperState.namedRecords["firstBakedOrder"]).toBeDefined();
    });
});
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

