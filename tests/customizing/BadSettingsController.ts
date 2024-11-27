import { CapoHeliosBundle } from "../../src/CapoHeliosBundle.js";
import { DelegatedDataContract } from "../../src/delegation/DelegatedDataContract.js";
import { hasReqts } from "../../src/Requirements";
import BadSettingsBundle from "./BadSettings.hlbundle.js";
 import {
    SpendingActivity,
    SpendingActivityLike,
    ProtocolSettingsLike,
    ProtocolSettings,
 } from "./BadSettings.typeInfo.js";
import { 
    BadSettingsPolicyDataBridge
} from "./BadSettings.bridge.js" ;
import { textToBytes } from "@hyperionbt/helios";

export class BadSettingsController extends DelegatedDataContract {
    dataBridgeClass = BadSettingsPolicyDataBridge;
    scriptBundle() {
        return new BadSettingsBundle()
    }

    exampleData() : ProtocolSettingsLike { // !!! fix the upstream type to omit id
        return {
            id: textToBytes("set-42"),
            type: "settings",
            meaning: 42,
            badSpenderSetting: 0,
            badMinterSetting: 0
        }
    }

    get delegateName() {
        return "settingsPolicy";
    }
    get recordTypeName() {
        return "settings";
    }
    get idPrefix() {
        return "set"
    }

    requirements() {
        // this.activity.$seed$CreatingDelegatedData({
        //     dataType: "settings",
        // })
        return hasReqts({});
    }
}
