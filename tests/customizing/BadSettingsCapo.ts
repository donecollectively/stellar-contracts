// type BridgeCanBeBadSettings = hasAnyDataTemplate<
//     "set",
//     {
//         meaning: Numeric<"int">;
//         badSettingToMintDelegate: Numeric<"int">;
//         badSettingToSpendDelegate: Numeric<"int">;
//     }
// >;

import { Capo } from "../../src/Capo";
import { defineRole } from "../../src/delegation/RolesAndDelegates";
import { BadSettingsController } from "./BadSettingsController.js";
// // ONLY DO THIS WHEN YOU DON'T NEED a special off-chain application class
// type CanBeBadSettings = offchainDatumType<
//     BridgeCanBeBadSettings,
//     "SettingsData"
// >;
// // WHEN YOU don't need a special off-chain application class, ALWAYS DO THIS ^^^^

const goodSettings: CanBeBadSettings = { data: {
    "@id": "set-‹replaceMe›",
    tpe: "set",
    badSettingToMintDelegate: 0,
    badSettingToSpendDelegate: 0,
    meaning: 42,
}};


export class CapoCanHaveBadSettings extends Capo<CapoCanHaveBadSettings> {
    // get customCapoSettingsModule() {
    //     return TestBadSettings;
    // }

    initDelegateRoles() {
        return {
            ... this.basicDelegateRoles(),
            settings: defineRole("dgDataPolicy", BadSettingsController, {})
        }
    }

    async initDelegatedDatumWrappers(): Promise<
        Record<string, DelegatedDatumAdapter<any>>
    > {
        // return {
        //     settings: new BadSettingsAdapter(this),
        // };
        return {}
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
