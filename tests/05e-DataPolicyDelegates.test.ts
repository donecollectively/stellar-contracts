import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";

import { CapoMinter } from "../src/minting/CapoMinter";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate";
import { ADA, addTestContext } from "../src/testing/types";
import { StellarTestContext } from "../src/testing/StellarTestContext";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";

import {
    DelegateConfigNeeded,
    DelegateMap,
    DelegateSetup,
    delegateRoles,
    delegateConfigValidation,
    defineRole,
} from "../src/delegation/RolesAndDelegates";
import { StellarTxnContext } from "../src/StellarTxnContext";
import { configBaseWithRev, txn } from "../src/StellarContract";
import { dumpAny, txAsString } from "../src/diagnostics";
import { Address } from "@hyperionbt/helios";
import { MintDelegateWithGenericUuts } from "../src/testing/specialMintDelegate/MintDelegateWithGenericUuts";
import { DelegatedDataContract } from "../src/delegation/DelegatedDataContract";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings";
import { expectTxnError } from "../src/testing/StellarTestHelper";
import UnspecializedDelegateBundle from "../src/delegation/UnspecializedDelegate.hlbundle.js"
import { hasReqts } from "../src/Requirements.js";
import { PendingDelegateActionHelper } from "../src/CapoHeliosBundle.bridge.js";
import { dgtStateKey, hasAllUuts } from "../src/Capo.js";

class DataPolicyDelegateTestCapo extends CapoWithoutSettings {
    async getMintDelegate(): Promise<MintDelegateWithGenericUuts> {
        return (await super.getMintDelegate()) as MintDelegateWithGenericUuts;
    }

    @txn
    async mkTxnInstallingPolicyDelegate<const P extends string>(purpose: P) {
        const mintDelegate = await this.getMintDelegate();
        const tcx1 = await this.tcxWithSeedUtxo(mintDelegate.mkTcx());
        const tcx2 = await this.mkTxnQueuingDelegateChange("Add", 
            purpose, 
            undefined,
            tcx1
        );
        return tcx2
            
        //     "Add" | "Replace",
        //     action: dgtAction.(tcx1, {
        //         purpose,
        //         delegateValidatorHash,
        //         config: []
        //     }}
        // });
    }

    initDelegateRoles() {
        const inherited = super.basicDelegateRoles();
        const { mintDelegate: parentMintDelegate, ...othersInherited } =
            inherited;
        const {
            config,
            delegateClass,
            delegateType,
            uutPurpose,
        } = parentMintDelegate;
        const mintDelegate = defineRole("mintDgt", MintDelegateWithGenericUuts, {
            // defaultV1: {
            //     delegateClass: BasicMintDelegate,
            //     validateConfig(args) {},
            // },

            delegateClass: MintDelegateWithGenericUuts,
            validateConfig(args) {
            }
        })

        return delegateRoles({
            ...inherited,
            // noDefault: defineRole("", CapoMinter, {}),
            mintDelegate,
            invention: defineRole("dgDataPolicy", InventionPolicy, {})
            
        })// as any; // TODO - update types so this structure fits the expected type
    }
}

export class InventionPolicy extends DelegatedDataContract {
    get delegateName() { return "invention" }
    get recordTypeName() { return "invent" }

    scriptBundle() {
        return this.mkBundleWithCapo(UnspecializedDelegateBundle)
    }
    requirements() {
        return hasReqts({
            "is a placeholder for testing any delegated-data policy": {
                details: [
                    "provides a record type",
                ],
                purpose: "for testing delegated-data policy lifecycle & basics",
                mech: [
                    "placeholder",
                ]
            }
        })
    }
}

type localTC = StellarTestContext<DefaultCapoTestHelper<DataPolicyDelegateTestCapo>>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

describe("Capo", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(
            context,
            DefaultCapoTestHelper.forCapoClass(DataPolicyDelegateTestCapo)
        );
    });

    describe("Data-policy delegate", () => {
        let capo : DataPolicyDelegateTestCapo
        beforeEach<localTC>(async (context) => {
            const {h, h:{network, actors, delay, state} } = context;
            capo = await h.bootstrap({
                mintDelegateLink: {
                    config: {}
                }
            });
        })

        it("is registered in the Capo charter's pendingDgtChanges queue", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const charter = await capo.findCharterDatum();
            expect(charter.otherNamedDelegates).toBeTruthy();
            expect(Object.keys(charter.otherNamedDelegates).length).toBe(0);

            const tcx = await capo.mkTxnInstallingPolicyDelegate("invention");
            expect(tcx.state.dgPolInvention).toBeTruthy()

            await tcx.submit();
            network.tick(1);

            const charter2 = await capo.findCharterDatum();
            expect(charter2.otherNamedDelegates).toBeTruthy();
            console.log("charter2.namedDelegates", charter2.otherNamedDelegates);
            expect(charter2.otherNamedDelegates.size).toBe(1);
        });
    })


});
