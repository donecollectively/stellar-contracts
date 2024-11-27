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
import {
    ProtocolSettingsLike,
    ErgoProtocolSettings
} from "./BadSettings.typeInfo.js";

// const goodSettings: CanBeBadSettings = { data: {
//     "@id": "set-‹replaceMe›",
//     tpe: "set",
//     badSettingToMintDelegate: 0,
//     badSettingToSpendDelegate: 0,
//     meaning: 42,
// }};


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

    mkInitialSettings() : ProtocolSettingsLike {
        return {
            meaning: 42,
            badMinterSetting: 0,
            badSpenderSetting: 0,
            //@ts-expect-error on this bad attribute
            x: 19,
        };
    }
}
