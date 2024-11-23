import * as helios from "@hyperionbt/helios";
const { Value, TxOutput } = helios;

import type {
    Capo,
    FoundDatumUtxo,
    hasSettingsRef,
    hasUutContext,
} from "../Capo.js";
import {
    Activity,
    partialTxn,
    type hasSeed,
} from "../StellarContract.js";

import type { StellarTxnContext, hasSeedUtxo } from "../StellarTxnContext.js";
import { dumpAny } from "../diagnostics.js";
import { hasReqts } from "../Requirements.js";
import { DelegatedDataContract } from "../delegation/DelegatedDataContract.js";
import {
    DelegateDatumTesterDataBridge
} from "./DelegatedDatumTester.bridge.js"
import type {
    DgDatumTestDataLike,
    ErgoDgDatumTestData
} from "./DelegatedDatumTester.typeInfo.js"

import DelegatedDatumTesterBundle from "./DelegatedDatumTester.hlbundle.js"
import type { GenericDelegateBridgeClass } from "../delegation/GenericDelegateBridge.js";

export class DelegatedDatumTester extends DelegatedDataContract {
    dataBridgeClass = DelegateDatumTesterDataBridge
    scriptBundle() {
        return new DelegatedDatumTesterBundle()
    }

    get delegateName() {
        return "TestDataDgt";
    }
    get recordTypeName() {
        return "tdata";
    }

    exampleData() : DgDatumTestDataLike {
        return {
            id: helios.textToBytes("tdata-‹replaceMe›"),
            type: "tdata",
            name: "Fred",
            number: 42,
        }
    }

    // get capo(): Capo<any> {
    //     // type S = CapoOffchainSettingsType<DEMUTokenomicsCapo>;

    //     return this.configIn?.capo as unknown as Capo<any>;
    // }


    async txnCreatingTestRecrd<
        TCX extends StellarTxnContext &
            hasSeedUtxo &
            hasSettingsRef &
            hasUutContext<"tdata">
    >(tcx: TCX, testData: /*TestRecData*/ any): Promise<TCX> {
        const tcx2 = await this.txnGrantAuthority(
            tcx,
            this.activity.CreatingTData(tcx)
        );

        const testDataOutput = new helios.TxOutput(
            this.capo.address,
            this.uh.mkMinTv(this.capo.mph, tcx2.state.uuts.tdata),
            await this.mkDatumDelegatedDataRecord({
                ...testData,
                id: tcx.state.uuts.tdata.toString(),
            }as any /* !!!!!!! */ )
        );
        console.log("tdata: ", dumpAny(testDataOutput));
        const tcx4 = tcx2.addOutput(testDataOutput);
        return tcx4 as typeof tcx4 & TCX;
    }

    requirements() {
        return hasReqts({
        });
    }
}
