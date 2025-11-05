import {
    MinimalCharterDataArgs,
    CapoWithoutSettings,
} from "@donecollectively/stellar-contracts";

import { CapoTestHelper } from "../src/testing/CapoTestHelper.js";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper.js";
import { StellarTestContext } from "../src/testing/StellarTestContext.js";
import { ADA, TestHelperState } from "../src/testing/types.js";
import { CapoCanMintGenericUuts } from "./CapoCanMintGenericUuts.js";
import { DelegatedDatumTester } from "../src/testing/DelegatedDatumTester.js";

export let helperState: TestHelperState<CapoCanMintGenericUuts> = {
    snapshots: {},
} as any;

export class CapoForDgDataPolicy_testHelper extends DefaultCapoTestHelper.forCapoClass(
    CapoCanMintGenericUuts
) {
    _start: number;
    constructor(config, helperState) {
        super(config, helperState);
        // debugger
        // generateContractTypes()
        // this.optimize = true
        this._start = new Date().getTime();
    }

    ts(...args: any[]) {
        console.log(this.relativeTs, ...args);
    }

    get relativeTs() {
        const ms = new Date().getTime() - this._start;
        const s = ms / 1000;
        return `@ ${s}s`;
    }

    get stellarClass() {
        return CapoCanMintGenericUuts;
    }

    async setupActors() {
        await super.setupActors();

        // artists
        this.addActor(
            "alice",
            8_700n * ADA,
            ...Array(8).fill(5_500_000n * ADA),
            ...Array(7).fill(7n * ADA)
        );
        this.addActor("bob", 8_700n * ADA, ...Array(7).fill(7n * ADA));
        this.addActor("charlie", 50_100_000n * ADA, ...Array(7).fill(7n * ADA));

        // --- NOTE: these actors are better placed in a tokenomics-generic test helper,
        //     - sticking them here only because we don't yet have an intermediate test-helper
        //        subclass for tokenomics that's easy to further subclass for DEMU
    }

    get capo(): CapoCanMintGenericUuts {
        return this.strella;
    }

    async basicBootstrap(
        ...args: Parameters<DefaultCapoTestHelper["bootstrap"]>
    ) {
        return super.bootstrap(...args);
    }

    async extraBootstrapping(args?: Partial<MinimalCharterDataArgs>) {
        // console.log("    ... now the delegates ...");
        // return this.capo
        //     .multiTxnCreateAdditionalCapoDelegates(
        //         (txinfo) => {
        //             return true;
        //         },
        //         (txinfo) => this.network.tick(1)
        //     )
        //     .then(() => {
        //         this.network.tick(1n);
        //         console.log(
        //             "        --- ⚗️🐞 ⚗️🐞 ⚗️🐞 ⚗️🐞 ✅ DEMU bootstrap success!"
        //         );
        //         // throw new Error("hi")
        //     });
        return this.strella;
    }

    @CapoTestHelper.hasNamedSnapshot("installingTestDataPolicy", "tina")
    async snapToInstallingTestDataPolicy() {
        console.log("never called");
        return this.installingTestDataPolicy();
    }
    async installingTestDataPolicy() {
        const charterData = await this.capo.findCharterData();
        const tcx = await this.capo.mkTxnInstallingPolicyDelegate({
            typeName: "testData",
            idPrefix: "tData",
            charterData,
        });
        return this.submitTxnWithBlock(tcx);
    }

    @CapoTestHelper.hasNamedSnapshot("hasTestDataPolicyDgt", "tina")
    async snapToInstalledTestDataPolicy() {
        console.log("never called");
        return this.installedTestDataPolicy();
    }

    async installedTestDataPolicy() {
        await this.snapToInstallingTestDataPolicy();

        const tcx = await this.capo.mkTxnCommittingPendingChanges();
        return this.submitTxnWithBlock(tcx);
    }

    @CapoTestHelper.hasNamedSnapshot("replacingTestDataPolicy", "tina")
    async snapToReplacingTestDataPolicy() {
        console.log("never called");
        return this.replacingTestDataPolicy();
    }

    async replacingTestDataPolicy() {
        await this.snapToInstalledTestDataPolicy();
        const testDataController1 = await this.capo.getTestDataController();
        const bundle1 = await testDataController1.getBundle();
        (bundle1.constructor as any).currentRev = 2n;

        this.capo._delegateCache["testData"] = {};
        const testDataController = await this.capo.getTestDataController();

        console.log("        --- ⚗️🐞🐞🐞🐞🐞🐞🐞🐞 ⚗️🐞 ⚗️🐞 ⚗️🐞 ")
        const charterData = await this.capo.findCharterData();
        const tcx = await this.capo.mkTxnInstallingPolicyDelegate({
            typeName: "testData",
            idPrefix: "tData",
            charterData,
        });
        
        return this.submitTxnWithBlock(tcx);
    }
}

export type TestContext_CapoForDgData =
    StellarTestContext<CapoForDgDataPolicy_testHelper> & {
        helperState: typeof helperState;
        snapshot(this: TestContext_CapoForDgData, snapName: string): void;
        loadSnapshot(this: TestContext_CapoForDgData, snapName: string): void;
        reusableBootstrap(
            this: TestContext_CapoForDgData
        ): Promise<CapoWithoutSettings>;
    };
