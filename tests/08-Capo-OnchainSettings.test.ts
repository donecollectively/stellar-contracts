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
import { ConfigFor } from "../src/StellarContract";
import { dumpAny } from "../src/diagnostics";
import { DelegationDetail } from "../src/delegation/RolesAndDelegates";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate";
import { TestBadSettings } from "./TestBadSettings";
import { OffchainSettingsType } from "../src/CapoSettingsTypes";
import { Capo } from "../src/Capo";
import { AnyDataTemplate, DatumAdapter } from "../src/DatumAdapter";
import { Expand } from "../src/testing/types";
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


type CanBeBadSettings = {
    meaning: number;
    badSettingToMintDelegate: number;
    badSettingToSpendDelegate: number;
}
const goodSettings : CanBeBadSettings = {
    badSettingToMintDelegate: 0,
    badSettingToSpendDelegate: 0,
    meaning: 42
}

type onChainBadSettings = {
    data: CanBeBadSettings & AnyDataTemplate<"set-">
}

class BadSettingsAdapter extends DatumAdapter<CanBeBadSettings, onChainBadSettings> {
    datumName: string = "SettingsData";
    fromOnchainDatum(parsedDatum: onChainBadSettings): CanBeBadSettings {
        return parsedDatum.data;
    }
    toOnchainDatum(settings: CanBeBadSettings) {
        const { SettingsData: hlSettingsData } = this.onChainDatumType;

        const {constrIndex} = hlSettingsData.prototype._enumVariantStatement;
        return Datum.inline(
            new ConstrData(constrIndex, [
                this.toMapData(settings, this.toRealNum)
            ])
        );
    }
}

class CapoCanHaveBadSettings extends Capo {
    get customCapoSettingsModule()  {
        return TestBadSettings;
    }

    mkInitialSettings() : OffchainSettingsType<CapoCanHaveBadSettings> {
        type T = Expand<OffchainSettingsType<CapoCanHaveBadSettings>>;
        return {
            meaning: 42,
            badSettingToMintDelegate: 0,
            badSettingToSpendDelegate: 0,
        } ;
    }    

    initSettingsAdapter() {
        return new BadSettingsAdapter(this);
    }
}

class BadSettingsTestHelper extends DefaultCapoTestHelper.forCapoClass(CapoCanHaveBadSettings) {

}

type localTC = StellarTestContext<BadSettingsTestHelper>;

describe("supports an abstract Settings structure stored in the contact", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise(res => setTimeout(res, 10));
        await addTestContext(context, BadSettingsTestHelper);
    });

    it("has a 'SettingsData' datum variant & utxo in the contract", async (context: localTC) => {
        // prettier-ignore
        const {h, h:{network, actors, delay, state} } = context;

        const capo = await h.bootstrap();
        const charterDatum = await capo.findCharterDatum()
        const settings = charterDatum.settingsUut;
        expect(settings).toBeDefined();
    });

    it("offchain code can read the settings data from the contract", async (context: localTC) => {
        // prettier-ignore
        const {h, h:{network, actors, delay, state} } = context;

        const capo = await h.bootstrap();
        const settings = await capo.findSettingsDatum();
        expect(settings.meaning).toEqual(42);
    });
    it.todo("TEST: onchain code can read the settings data from the contract");

    it("charter creation requires presence of a SettingsData map", async (context: localTC) => {
        // prettier-ignore
        const {h, h:{network, actors, delay, state} } = context;

        const capo = await h.initialize();
        vi.spyOn(capo, "txnAddSettingsOutput").mockImplementation(tcx => {
            // allow the settings UUT to be implicitly returned to the user's wallet
            // for txn-balancing purposes
            return tcx;
        });
        await expect(h.bootstrap()).rejects.toThrow(/no settings output/)
    });

    it("charter creation requires a CharterDatum reference to the settings UUT", async (context: localTC) => {
        // prettier-ignore
        const {h, h:{network, actors, delay, state} } = context;

        const capo = await h.initialize();
        vi.spyOn(capo, "mkSettingsUutName").mockImplementation((uutName) => {
            return textToBytes("thisTokenNameDoesNotExist")
        })
        await expect(h.bootstrap()).rejects.toThrow(/settings output not found in contract with expected UUT/)
    })

    it("updatingCharter activity MUST NOT change the set-UUT reference", async (context: localTC) => {
        // prettier-ignore
        const {h, h:{network, actors, delay, state} } = context;

        const capo = await h.bootstrap();
        const charterDatum = await capo.findCharterDatum()
        const settings = charterDatum.settingsUut;
        const updating = h.updateCharter({
            ... charterDatum,
            settingsUut: textToBytes("charter"), // a token-name that does exist in the contract
        })
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
            await updating
            await expect(updating).resolves.toBeTruthy();
            const newSettings = await capo.findSettingsDatum();
            expect(newSettings.meaning).toEqual(19);
        });

        it("requires the capoGov- authority uut to update the settings data", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();

            const didUseAuthority = vi.spyOn(capo, "txnAddGovAuthority").mockImplementation(
                async tcx => tcx
            );
            const updating = h.updateSettings({
                meaning: 19,
                badSettingToMintDelegate: 0,
                badSettingToSpendDelegate: 0,
            });
            await expect(updating).rejects.toThrow(/missing dgTkn capoGov-/)
            expect(didUseAuthority).toHaveBeenCalled();
        });

        it("the spending delegate must validate the UpdatingSettings details", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();

            const updating = h.updateSettings({
                badSettingToSpendDelegate: 1,
                badSettingToMintDelegate: 0,
                meaning: 42
            });

            await expect(updating).rejects.toThrow(/must not have badSettingToSpendDelegate/);
            console.log("  -- ⚗️🐞⚗️🐞 case 2 : throws an error if the spend delegate isn't included"); 
            const spendDelegate = await capo.getSpendDelegate();
            vi.spyOn(spendDelegate, "txnGrantAuthority").mockImplementation(async tcx => tcx);
            await expect(h.updateSettings(goodSettings)).rejects.toThrow(/missing required input .* spendDgt-/);
        });

        it("the minting delegate must validate the UpdatingSettings details", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const updating = h.updateSettings({
                badSettingToMintDelegate: 1,
                badSettingToSpendDelegate: 0,
                meaning: 42
            });

            await expect(updating).rejects.toThrow(/must not have badSettingToMintDelegate/);

            const mintDelegate = await capo.getMintDelegate();
            console.log("  -- ⚗️🐞⚗️🐞 case 2 : throws an error if the mint delegate isn't included"); 
            vi.spyOn(mintDelegate, "txnGrantAuthority").mockImplementation(async tcx => tcx);
            await expect(h.updateSettings(goodSettings)).rejects.toThrow(/missing required input .* mintDgt-/)
        });

        it.todo("TODO: TEST: all named delegates must validate the UpdatingSettings details", async (context: localTC) => {
            throw new Error(`implement me!`)
        })

        it.todo("TODO: TEST: the spending invariant delegates must validate the UpdatingSettings details", async (context: localTC) => {

        }) 

        it.todo("TODO: TEST: the minting invariant delegates must validate the UpdatingSettings details", async (context: localTC) => {
        })

    });
});
