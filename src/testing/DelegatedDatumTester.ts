import { makeTxOutput } from "@helios-lang/ledger";
import {
    StellarTxnContext,
    DelegatedDataContract,
    hasReqts,
    dumpAny,
} from "@donecollectively/stellar-contracts";
import type {
    hasUutContext,
    hasSeedUtxo,
    hasSettingsRef,
    DgDataTypeLike,
    capoDelegateConfig,
    DelegatedDataBundle,
} from "@donecollectively/stellar-contracts";

import { DelegateDatumTesterDataBridge } from "./DelegatedDatumTester.bridge.js";
import type {
    DgDatumTestData,
    DgDatumTestDataLike,
    minimalDgDatumTestData,
} from "./DelegatedDatumTester.typeInfo.js";

import type { DelegatedDatumTesterBundle } from "./DelegatedDatumTester.hlb.js";
import { textToBytes } from "../HeliosPromotedTypes.js";

export class DelegatedDatumTester extends DelegatedDataContract<
    DgDatumTestData,
    DgDatumTestDataLike
> {
    dataBridgeClass = DelegateDatumTesterDataBridge;

    async scriptBundleClass(): Promise<typeof DelegatedDataBundle> {
        const bundleModule = await import("./DelegatedDatumTester.hlb.js");
        return bundleModule.DelegatedDatumTesterBundle;
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

    exampleData(): minimalDgDatumTestData {
        return {
            // id: textToBytes("tData-‹replaceMe›"),
            // type: "testData",
            name: "Fred",
            number: 42,
        };
    }

    // get capo(): Capo<any> {
    //     // type S = CapoOffchainSettingsType<DEMUTokenomicsCapo>;

    //     return this.configIn?.capo as unknown as Capo<any>;
    // }

    async txnCreatingTestRecord<
        TCX extends StellarTxnContext &
            hasSeedUtxo &
            hasSettingsRef &
            hasUutContext<this["idPrefix"]>
    >(
        this: DelegatedDatumTester,
        tcx: TCX,
        testData: DgDataTypeLike<DelegatedDatumTester>
    ): Promise<TCX> {
        const tcx2 = await this.txnGrantAuthority(
            tcx,
            this.activity.MintingActivities.CreatingTData(tcx)
        );

        const testDataOutput = makeTxOutput(
            this.capo.address,
            this.uh.mkMinTv(
                this.capo.mph,
                tcx2.state.uuts[this.idPrefix] as any
            ),
            this.mkDgDatum(
                {
                    ...testData,
                    id: tcx.state.uuts[this.idPrefix]!.toString(),
                } as any /* !!!!!!! */
            )
        );
        console.log("tData: ", dumpAny(testDataOutput));
        const tcx4 = tcx2.addOutput(testDataOutput);
        return tcx4 as typeof tcx4 & TCX;
    }

    requirements() {
        return hasReqts({});
    }
}

export class DelegatedDatumTester2 extends DelegatedDatumTester {
    get idPrefix() {
        return "tData2";
    }
    get delegateName() {
        return "TestDataDgt2";
    }
    get recordTypeName() {
        return "testData2";
    }
}
