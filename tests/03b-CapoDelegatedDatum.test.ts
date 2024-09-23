import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";
import * as helios from "@hyperionbt/helios";

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

import { StellarTxnContext } from "../src/StellarTxnContext.js";
import { ADA, StellarTestContext, addTestContext } from "../src/testing/index.js";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper.js";
import { ConfigFor } from "../src/StellarContract.js";
import { dumpAny } from "../src/diagnostics.js";
import { DelegationDetail } from "../src/delegation/RolesAndDelegates.js";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate.js";
import { Capo } from "../src/Capo.js";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings.js";
import { TestHelperState } from "../src/testing/types.js";
// import { RoleDefs } from "../src/RolesAndDelegates";
import {CapoCanMintGenericUuts} from "./CapoCanMintGenericUuts.js";

type localTC = StellarTestContext<DefaultCapoTestHelper<CapoCanMintGenericUuts>>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;


let helperState: TestHelperState<CapoCanMintGenericUuts> = {
    snapshots: {},
} as any;

describe("Capo spending DelegatedDatum", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise(res => setTimeout(res, 10));
        await addTestContext(
            context, 
            DefaultCapoTestHelper.forCapoClass(CapoCanMintGenericUuts),
            undefined,
            helperState
        );
    });

    describe("defers to the capo's mint delegate", () => {
        it.todo("the capo fails if the spend delegate doesn't have an activity matching the record being updated", async (context: localTC) => {
        })

        it.todo("the capo fails if the spend delegate has multiple activities for any one record id", async (context: localTC) => {
        })

        it.todo("the spend delegate's multi-activity works only with the generic UpdatingDelegatedData activity", async (context: localTC) => {
        })

        it.todo("the spend delegate fails if any of its activities isn't matched by a spent/updated record", async (context: localTC) => {
        })

        it.todo("the spend delegate fails if the delegated data controller doesn't have an activity matching that record", async (context: localTC) => {
        })

        it.todo("the spend delegate fails if the delegated data controller has multiple activities for the record id", async (context: localTC) => {
        })

        it.todo("the data-controller policy fails if any of its activities isn't matched by a spent/updated record", async (context: localTC) => {
        })

        it.todo("the data-controller policy works only with its specific SpendingActivities/MintingActivities, not the generic activities used by the SpendDgt", async (context: localTC) => {
        })

        it.todo("fails if the spending delegate is not included in the transaction", async (context: localTC) => {
        })

        it.todo("builds transactions including the invariant spending-delegates", async (context: localTC) => {
        })

        it.todo("fails if the expected invariant delegate is not included in the transaction", async (context: localTC) => {
        })
    });

});


