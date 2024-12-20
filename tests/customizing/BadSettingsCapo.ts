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
    ErgoProtocolSettings,
    ErgoDelegationDetail,
    ErgoDelegateActivity,
    ErgoDelegateDatum
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

        // const myListenerVault = await this.findDelegatedDataUtxos({
        //     type: "lsnrBox", 
        //     predicate(ud) {
        //         return ud.value.isGreaterOrEqual(myMemberToken)
        //     }
        // });

        return {
            ... this.basicDelegateRoles(),
            settings: defineRole("dgDataPolicy", BadSettingsController, {})
        }
    }

}
