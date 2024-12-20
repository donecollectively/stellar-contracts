import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";

import { StellarTxnContext } from "../src/StellarTxnContext";
import { ADA, StellarTestContext, addTestContext } from "../src/testing";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";
import { dumpAny } from "../src/diagnostics";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate";
 
import { Capo } from "../src/Capo";
import { expectTxnError } from "../src/testing/StellarTestHelper";
import { defineRole } from "../src/delegation/RolesAndDelegates";
import { DelegatedDataContract } from "../src/delegation/DelegatedDataContract";
import { CapoCanHaveBadSettings } from "./customizing/BadSettingsCapo";
import { textToBytes } from "../src/HeliosPromotedTypes";
// import { RoleDefs } from "../src/RolesAndDelegates";

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

// Will test all of these things:
// "has a 'SettingsData' datum variant & utxo in the contract",
// "charter creation requires presence of an empty SettingsData and a CharterData reference to that minted UUT",
// "updatingCharter activity MUST NOT change the set-UUT reference",
// "can update the settings data with a separate UpdatingSettings Activity on the Settings",
// "requires the capoGov- authority uut to update the settings data",
// "the spending delegate must validate the UpdatingSettings details",
// "the minting delegate must validate the UpdatingSettings details",


class BadSettingsTestHelper extends DefaultCapoTestHelper.forCapoClass(
    CapoCanHaveBadSettings
) {}

type localTC = StellarTestContext<BadSettingsTestHelper>;

describe("supports a Settings structure stored as a type of DelegatedDatum", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(context, BadSettingsTestHelper);
    });

    it("can create a dgDataPolicy in the pendingDgtChanges queue to be adopted by the Capo", async (context: localTC) => {
        const {h, h:{network, actors, delay, state} } = context;

        const capo = await h.bootstrap();

        
    })

    // it.skip("MOVE to delegated datum + spend-delegate logice: singleton Settings struct", async (context: localTC) => {
    //     // prettier-ignore
    //     const {h, h:{network, actors, delay, state} } = context;

    //     const capo = await h.bootstrap();
    //     const charterData = await capo.findCharterData();
    //     const settings = charterData.settingsUut;
    //     expect(settings).toBeDefined();
    // });

    fit("offchain code can read the settings data from the contract", async (context: localTC) => {
        // prettier-ignore
        const {h, h:{network, actors, delay, state} } = context;

        const capo = await h.bootstrap();
        const settings = await capo.findSettingsInfo();
        expect(settings.data.meaning).toEqual(42n);
    });
    it.todo("TEST: onchain code can read the settings data from the contract");

    it.skip("MOVE to special spend-delegate logic (when enabled): charter creation requires presence of a SettingsData map", async (context: localTC) => {
        // prettier-ignore
        const {h, h:{network, actors, delay, state} } = context;
        global.id = "08";

        const capo = await h.initialize();
        vi.spyOn(capo, "txnAddSettingsOutput").mockImplementation((tcx) => {
            // allow the settings UUT to be implicitly returned to the user's wallet
            // for txn-balancing purposes
            return tcx;
        });
        await expect(h.bootstrap({}, expectTxnError)).rejects.toThrow(
            /no settings output/
        );
    });

    it.todo("TEST: Settings creation adds a uutManfest.currentSettings pointing to the settings UUT", async (context: localTC) => {
        // prettier-ignore
        const {h, h:{network, actors, delay, state} } = context;

        const capo = await h.initialize();
        vi.spyOn(capo, "mkSettingsUutName").mockImplementation((uutName) => {
            return textToBytes("thisTokenNameDoesNotExist");
        });
        await expect(h.bootstrap({}, expectTxnError)).rejects.toThrow(
            /settings output not found in contract with expected UUT/
        );
    });

    it("updatingCharter activity MUST NOT change the set-UUT reference", async (context: localTC) => {
        // prettier-ignore
        // !!! change by ensuring that updatingCharter can't also
        // do other kinds of activities at the same time.
        
        const {h, h:{network, actors, delay, state} } = context;

        const capo = await h.bootstrap();
        const charterData = await capo.findCharterData();
        const settings = charterData.settingsUut;
        const updating = h.updateCharter(
            {
                ...charterData,
                manifest: new Map([
                    ...charterData.manifest.entries(),
                    ["currentSettings", {
                        tokenName: textToBytes("charter"), // a token-name that does exist in the contract
                        entryType: {NamedTokenRef: {}},
                        mph: null
                    }]
                ])
            },
            expectTxnError
        );
        await expect(updating).rejects.toThrow(/must not change the manifest/);
    });

    describe("mkTxnUpdateSettings(): can update the settings", () => {
        it("can update the settings data with a separate UpdatingSettings Activity on the Settings", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const updating = h.updateSettings({
                meaning: 19,
                badSettingToMintDelegate: 0,
                badSettingToSpendDelegate: 0,
            });
            await updating;
            await expect(updating).resolves.toBeTruthy();
            const newSettings = await capo.findSettingsInfo();
            expect(newSettings.data.meaning).toEqual(19);
        });

        it("requires the capoGov- authority uut to update the settings data", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();

            const didUseAuthority = vi
                .spyOn(capo, "txnAddGovAuthority")
                .mockImplementation(async (tcx) => tcx);
            const updating = h.updateSettings(
                {
                    meaning: 19,
                    badSettingToMintDelegate: 0,
                    badSettingToSpendDelegate: 0,
                },
                expectTxnError
            );
            await expect(updating).rejects.toThrow(
                /missing required.* dgTkn capoGov-/
            );
            expect(didUseAuthority).toHaveBeenCalled();
        });

        it("the spending delegate must validate the UpdatingSettings details", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();

            const updating = h.updateSettings(
                {
                    badSettingToSpendDelegate: 1,
                    badSettingToMintDelegate: 0,
                    meaning: 42,
                },
                expectTxnError
            );

            await expect(updating).rejects.toThrow(
                /must not have badSettingToSpendDelegate/
            );
            console.log(
                "  -- ⚗️🐞⚗️🐞 case 2 : throws an error if the spend delegate isn't included"
            );
            const spendDelegate = await capo.getSpendDelegate();
            vi.spyOn(spendDelegate, "txnGrantAuthority").mockImplementation(
                async (tcx) => tcx
            );
            await expect(
                h.updateSettings(goodSettings, expectTxnError)
            ).rejects.toThrow(/missing .* spendDgt-/);
        });

        it("the minting delegate must validate the UpdatingSettings details", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const updating = h.updateSettings(
                {
                    badSettingToMintDelegate: 1,
                    badSettingToSpendDelegate: 0,
                    meaning: 42,
                },
                expectTxnError
            );

            await expect(updating).rejects.toThrow(
                /must not have badSettingToMintDelegate/
            );

            const mintDelegate = await capo.getMintDelegate();
            console.log(
                "  -- ⚗️🐞⚗️🐞 case 2 : throws an error if the mint delegate isn't included"
            );
            vi.spyOn(mintDelegate, "txnGrantAuthority").mockImplementation(
                async (tcx) => tcx
            );
            await expect(
                h.updateSettings(goodSettings, expectTxnError)
            ).rejects.toThrow(/missing .* mintDgt/);
        });

        it.todo(
            "TODO: TEST: all named delegates must validate the UpdatingSettings details",
            async (context: localTC) => {}
        );

        it.todo(
            "TODO: TEST: the spending invariant delegates must validate the UpdatingSettings details",
            async (context: localTC) => {}
        );

        it.todo(
            "TODO: TEST: the minting invariant delegates must validate the UpdatingSettings details",
            async (context: localTC) => {}
        );
    });
});
