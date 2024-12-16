import { MinimalCharterDataArgs } from "../src/Capo.js";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings.js";
import { minimalReqtData } from "../src/reqts/Reqts.concrete.typeInfo.js";
import { ReqtsController } from "../src/reqts/ReqtsController.js";
import { CapoTestHelper } from "../src/testing/CapoTestHelper.js";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper.js";
import { StellarTestContext } from "../src/testing/StellarTestContext.js";
import { ADA, TestHelperState } from "../src/testing/types.js";

export let helperState: TestHelperState<CapoWithoutSettings> = {
    snapshots: {},
} as any;

export class CapoWithoutSettings_testHelper extends DefaultCapoTestHelper.forCapoClass(
    CapoWithoutSettings
) {
    _start: number;
    constructor(config, helperState) {
        //@ts-expect-error - typescript, why are you wrong about the constructor-arg count?
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

    //@ts-expect-error - why does it expect this is a property, when it's defined as a getter everywhere?
    get stellarClass() {
        return CapoWithoutSettings;
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

    get capo(): CapoWithoutSettings {
        return this.strella;
    }

    async basicBootstrap(
        ...args: Parameters<DefaultCapoTestHelper["bootstrap"]>
    ) {
        return super.bootstrap(...args);
    }

    //!! todo move to library
    requiresActorRole(roleName: string, firstLetter: string) {
        if (this.actorName[0] != firstLetter) {
            throw new Error(
                `expected current actor name (${this.actorName}) to be one of the ${roleName} profiles starting with '${firstLetter}' in the test helper`
            );
        }
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

    @CapoTestHelper.hasNamedSnapshot("firstReqt", "tina")
    async snapToFirstReqt() {
        console.log("never called");
        return this.firstReqt();
    }

    async firstReqt() {
        this.setActor("tina");
        const reqtsController = (await this.capo.getDgDataController(
            "reqts"
        )) as ReqtsController;
        const t = await this.capo.findDelegatedDataUtxos({
            type: "reqts",
        });
        return this.createReqt(reqtsController.exampleData());
    }

    @CapoTestHelper.hasNamedSnapshot("firstDependentReqt", "tina")
    async snapToFirstDependentReqt() {
        console.log("never called");
        return this.firstDependentReqt();
    }

    async firstDependentReqt() {
        this.setActor("tina");
        await this.snapToFirstReqt();
        const purpose = await this.findFirstReqt();
        // type t = dgDataRoles<typeof this.capo>;
        const reqtsController = await this.capo.reqtsController();
        const exampleData = reqtsController.exampleData() as minimalReqtData;

        return this.createReqt({
            ...exampleData,
            purpose: "a reqt depending on another",
            requires: purpose.id,
        });
    }

    async findFirstDependentReqt() {
        const delegate = (await this.capo.getDgDataController(
            "reqts"
        )) as ReqtsController;
        const firstReqt = await this.findFirstReqt();
        const reqts = await this.capo.findReqts({
            requires: firstReqt.id,
        });
        if (reqts.length > 1) {
            throw new Error("expected only one dependent requirement");
        }
        return reqts[0];
    }

    async findFirstReqt() {
        const purposes = await this.capo.findReqts({
            requires: null,
        });
        if (purposes.length > 1) {
            throw new Error("expected only one purpose");
        }
        return purposes[0];
    }

    async createReqt(
        reqt: minimalReqtData,
        options: {
            submit?: boolean;
        } = {}
    ) {
        const { submit = true } = options;
        this.requiresActorRole("CapoAdmin", "t");

        console.log("  -- ⚗️🐞 ⚗️🐞 " + this.relativeTs + " Creating reqt");

        const delegate = (await this.capo.getDgDataController(
            "reqts"
        )) as ReqtsController;
        // ).getNamedDelegate("reqtCtrl");
        // getNamedDelegate("reqtCtrl") ) as ReqtsController
        // const tcx = await delegate.mkTxnCreateReqt(reqt);
        const tcx = await delegate.mkTxnCreateRecord({
            activity: delegate.activity.$seed$CreatingDelegatedData({
                dataType: "reqts",
            }),
            data: reqt,
        });

        if (!submit) return tcx;
        return this.submitTxnWithBlock(tcx);
    }
}

export type TestContext_CapoWithoutSettings =
    StellarTestContext<CapoWithoutSettings_testHelper> & {
        helperState: typeof helperState;
        snapshot(this: TestContext_CapoWithoutSettings, snapName: string): void;
        loadSnapshot(
            this: TestContext_CapoWithoutSettings,
            snapName: string
        ): void;
        reusableBootstrap(
            this: TestContext_CapoWithoutSettings
        ): Promise<CapoWithoutSettings>;
    };
