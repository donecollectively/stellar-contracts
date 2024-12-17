import { CapoHeliosBundle } from "../../src/CapoHeliosBundle.js";
import { DelegatedDataContract } from "../../src/delegation/DelegatedDataContract.js";
import { hasReqts } from "../../src/Requirements";
import BadSettingsBundle from "./BadSettings.hlbundle.js";
 import {
    SpendingActivity,
    SpendingActivityLike,
    type ProtocolSettingsLike,
    type ProtocolSettings,
 } from "./BadSettings.typeInfo.js";
import { 
    BadSettingsPolicyDataBridge
} from "./BadSettings.bridge.js" ;
import { textToBytes } from "../../src/HeliosPromotedTypes.js";
import { WrappedDgDataContract } from "../../src/delegation/WrappedDgDataContract.js";


export class BadSettingsController extends DelegatedDataContract<
    ProtocolSettings, ProtocolSettingsLike
> {
    dataBridgeClass = BadSettingsPolicyDataBridge;
    scriptBundle() {
        return new BadSettingsBundle()
    }

    exampleData() {
        return {
            // id: textToBytes("set-42"),
            // type: "settings",
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

class NoOpWrapper {
    constructor(public x: ProtocolSettings) {
    }
    unwrapData() {
        return this.x;
    }
}

export class BadSettingsControllerWithWrapper 
extends WrappedDgDataContract<ProtocolSettings, ProtocolSettingsLike, NoOpWrapper> {
    dataBridgeClass = BadSettingsPolicyDataBridge;
    scriptBundle() {
        return new BadSettingsBundle()
    }

    mkDataWrapper(x: ProtocolSettings) {
        return new NoOpWrapper(x);
    }

    exampleData() {
        return {
            // id: textToBytes("set-42"),
            // type: "settings",
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

