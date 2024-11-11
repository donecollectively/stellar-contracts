import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";

import {
    Address,
    Datum,
    Signature,
    Tx,
    TxOutput,
    TxInput,
    Value,
    bytesToText,
    textToBytes,
    ConstrData,
} from "@hyperionbt/helios";

import { StellarTxnContext } from "../src/StellarTxnContext";
import { ADA, StellarTestContext, addTestContext } from "../src/testing";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";
import { dumpAny } from "../src/diagnostics";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate";
import { TestBadSettings } from "./TestBadSettings.hl";
import {
    CapoOffchainSettingsType,
    SettingsAdapter,
    ParsedSettings,
} from "../src/CapoSettingsTypes";
import { Capo } from "../src/Capo";
import {
    DatumAdapter,
    Numeric,
    adapterParsedOnchainData,
    offchainDatumType,
} from "../src/DatumAdapter";
import {
    AnyDataTemplate,
    DelegatedDatumAdapter,
    hasAnyDataTemplate,
} from "../src/delegation/DelegatedDatumAdapter";
import { expectTxnError } from "../src/testing/StellarTestHelper";
// import { RoleDefs } from "../src/RolesAndDelegates";

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

// Will test all of these things:
// "has a 'SettingsData' datum variant & utxo in the contract",
// "charter creation requires presence of an empty SettingsData and a CharterDatum reference to that minted UUT",
// "updatingCharter activity MUST NOT change the set-UUT reference",
// "can update the settings data with a separate UpdatingSettings Activity on the Settings",
// "requires the capoGov- authority uut to update the settings data",
// "the spending delegate must validate the UpdatingSettings details",
// "the minting delegate must validate the UpdatingSettings details",

type BridgeCanBeBadSettings = hasAnyDataTemplate<
    "set",
    {
        meaning: Numeric<"int">;
        badSettingToMintDelegate: Numeric<"int">;
        badSettingToSpendDelegate: Numeric<"int">;
    }
>;

// ONLY DO THIS WHEN YOU DON'T NEED a special off-chain application class
type CanBeBadSettings = offchainDatumType<
    BridgeCanBeBadSettings,
    "SettingsData"
>;
// WHEN YOU don't need a special off-chain application class, ALWAYS DO THIS ^^^^

const goodSettings: CanBeBadSettings = { data: {
    "@id": "set-‹replaceMe›",
    tpe: "set",
    badSettingToMintDelegate: 0,
    badSettingToSpendDelegate: 0,
    meaning: 42,
}};

class BadSettingsAdapter extends DelegatedDatumAdapter<
    CanBeBadSettings
> {
    datumName: string = "SettingsData";
    fromOnchainDatum(
        parsedDatum: ParsedSettings<BridgeCanBeBadSettings>
    ): CanBeBadSettings {
        console.log(
            " =====================                  ========================== ",
            parsedDatum
        );
        //@ts-expect-error - hacking types here for temporary purposes
        //  Settings can become a DelegatedDatum soon
        const data = parsedDatum.data as Map<string, any>;
        const {
            "@id": id,
            tpe: tpe,
            ...settings
        } = Object.fromEntries(data.entries());

        const otherParams = this.fromOnchainIntMap(
            settings,
            this.fromUplcReal
        ) as CanBeBadSettings;

        return otherParams;
    }

    toOnchainDatum(settings: CanBeBadSettings) {
        // const { SettingsData: hlSettingsData } = this.onChainDatumType;

        return this.inlineDatum("SettingsData", {
            data: this.valuesToUplc(settings, this.uplcReal),
        });
    }
}

class CapoCanHaveBadSettings extends Capo<CapoCanHaveBadSettings> {
    get customCapoSettingsModule() {
        return TestBadSettings;
    }

    initDelegateRoles() {
        return this.basicDelegateRoles();
    }

    async initDelegatedDatumAdapters(): Promise<
        Record<string, DelegatedDatumAdapter<any>>
    > {
        return {
            settings: new BadSettingsAdapter(this),
        };
    }

    async mkInitialSettings() {
        return {
            meaning: 42,
            x: 19,
            badSettingToMintDelegate: 0,
            badSettingToSpendDelegate: 0,
        };
    }
}

class BadSettingsTestHelper extends DefaultCapoTestHelper.forCapoClass(
    CapoCanHaveBadSettings
) {}

type localTC = StellarTestContext<BadSettingsTestHelper>;

describe.skip("supports a Settings structure stored as a type of DelegatedDatum", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(context, BadSettingsTestHelper);
    });

    // it.skip("MOVE to delegated datum + spend-delegate logice: singleton Settings struct", async (context: localTC) => {
    //     // prettier-ignore
    //     const {h, h:{network, actors, delay, state} } = context;

    //     const capo = await h.bootstrap();
    //     const charterDatum = await capo.findCharterDatum();
    //     const settings = charterDatum.settingsUut;
    //     expect(settings).toBeDefined();
    // });

    it("offchain code can read the settings data from the contract", async (context: localTC) => {
        // prettier-ignore
        const {h, h:{network, actors, delay, state} } = context;

        const capo = await h.bootstrap();
        const settings = await capo.findSettingsDatum();
        expect(settings.meaning).toEqual(42);
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

    it("charter creation requires a CharterDatum reference to the settings UUT", async (context: localTC) => {
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
        const charterDatum = await capo.findCharterDatum();
        const settings = charterDatum.settingsUut;
        const updating = h.updateCharter(
            {
                ...charterDatum,
                settingsUut: textToBytes("charter"), // a token-name that does exist in the contract
            },
            expectTxnError
        );
        await expect(updating).rejects.toThrow(/cannot change settings uut/);
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
            const newSettings = await capo.findSettingsDatum();
            expect(newSettings.meaning).toEqual(19);
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
