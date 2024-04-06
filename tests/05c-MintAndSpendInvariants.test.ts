import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";
import { DefaultCapo } from "../src/DefaultCapo";

import {
    Address,
    Datum,
    Signature,
    Tx,
    TxOutput,
    TxInput,
    Value,
    bytesToText,
} from "@hyperionbt/helios";

import { StellarTxnContext } from "../src/StellarTxnContext";
import { ADA, StellarTestContext, addTestContext } from "../src/testing";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";
import { ConfigFor } from "../src/StellarContract";
import { dumpAny } from "../src/diagnostics";
import { DelegationDetail } from "../src/delegation/RolesAndDelegates";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate";
// import { RoleDefs } from "../src/RolesAndDelegates";

type localTC = StellarTestContext<DefaultCapoTestHelper>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

describe("Capo", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise(res => setTimeout(res, 10));
        await addTestContext(context, DefaultCapoTestHelper);
    });

    describe("can add invariant minting delegates to the charter settings", () => {
        it.todo("can add a minting invariant", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
              // const strella =
            await h.bootstrap();
        });
    
        it.todo("fails without the capoGov- authority uut", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
              // const strella =
            await h.bootstrap();
        });
    
        it.todo("cannot change mint invariants when updating other charter settings", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
              // const strella =
            await h.bootstrap();
        })
        it.todo("can never remove a mint invariants after it is added", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
              // const strella =
            await h.bootstrap();
        });
        it.todo("always enforces new mint invariants after they are added", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
              // const strella =
            await h.bootstrap();
        });
    });

});
