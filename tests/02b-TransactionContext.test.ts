import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";
import { decodeTx, makeTxOutput, NetworkParams, TxOutput } from "@helios-lang/ledger";
import {
    Capo,
    StellarTxnContext,
    parseCapoJSONConfig,
    CapoWithoutSettings,
    type ConfigFor,
    TxDescription,
    TxSubmitMgr
} from "@donecollectively/stellar-contracts";
import {
    blue
} from "ansi-colors"
import { ADA, StellarTestContext, TestHelperState, addTestContext } from "../src/testing";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";
import { expectTxnError } from "../src/testing/StellarTestHelper";
import { makeBlockfrostV0Client } from "@helios-lang/tx-utils";
import { UplcConsoleLogger } from "../src/UplcConsoleLogger";
// import { RoleDefs } from "../src/RolesAndDelegates";

type localTC = StellarTestContext<DefaultCapoTestHelper>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

let helperState: TestHelperState<CapoWithoutSettings> = {
    snapshots: {},
} as any;

describe("Transaction context", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 1));
        console.log(blue(
            "====================================================================="+
            "=====================================================================\n"+
            "====================================================================="+
            "====================================================================="
        ))
        await addTestContext(context, DefaultCapoTestHelper,
            undefined,
            helperState
        )
        await context.h.delay(1);
    });
    describe("Transactions & Submitting", () => {
        it("StellarTxnContext: initiates a tx batch controller if needed", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
            await h.reusableBootstrap();

            const capo = h.capo
            const tcx = capo.mkTcx();
            expect(tcx.id).toBeTruthy();
            expect(capo.setup.txBatcher._current).toBeTruthy();
        })        
    })
})
