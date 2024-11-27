import * as helios from "@hyperionbt/helios";
const { Value, TxOutput } = helios;

import type {
    Capo,
    FoundDatumUtxo,
    hasSettingsRef,
    hasUutContext,
} from "../Capo.js";

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

export class DelegatedDatumTester extends DelegatedDataContract {
    dataBridgeClass = DelegateDatumTesterDataBridge
    scriptBundle() {
        return new DelegatedDatumTesterBundle()
    }

    get delegateName() {
        return "TestDataDgt";
    }
    get idPrefix() {
        return "tData";
    }
    get recordTypeName() {
        return "testData";
    }

    exampleData() : DgDatumTestDataLike {
        return {
            id: helios.textToBytes("tData-‹replaceMe›"),
            type: "testData",
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
            hasUutContext<"tData">
    >(tcx: TCX, testData: /*TestRecData*/ any): Promise<TCX> {
        const tcx2 = await this.txnGrantAuthority(
            tcx,
            this.activity.CreatingTData(tcx)
        );

        const testDataOutput = new helios.TxOutput(
            this.capo.address,
            this.uh.mkMinTv(this.capo.mph, tcx2.state.uuts.tData),
            await this.mkDatumDelegatedDataRecord({
                ...testData,
                id: tcx.state.uuts.tData.toString(),
            }as any /* !!!!!!! */ )
        );
        console.log("tData: ", dumpAny(testDataOutput));
        const tcx4 = tcx2.addOutput(testDataOutput);
        return tcx4 as typeof tcx4 & TCX;
    }

    requirements() {
        return hasReqts({
        });
    }
}
