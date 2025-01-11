import { CapoHeliosBundle } from "../../src/CapoHeliosBundle.js";
import { DelegatedDataContract } from "../../src/delegation/DelegatedDataContract.js";
import { hasReqts } from "../../src/Requirements";
import BadSettingsBundle from "./BadSettings.hlb.js";
 import {
    SpendingActivity,
    SpendingActivityLike,
    type ProtocolSettingsLike,
    type ProtocolSettings,
    minimalProtocolSettings,
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
    needsGovAuthority = true;

    scriptBundle() {
        return new BadSettingsBundle()
    }


    exampleData(this: BadSettingsController) : minimalProtocolSettings {
        return {
            // id: textToBytes("set-42"),
            // type: "settings",
            meaning: 42,
            badSpenderSetting: 0,
            badMinterSetting: 0,
            //@ts-expect-error on this bad attribute
            x: 19,
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
        // this.activity.$seeded$CreatingDelegatedData({
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
        } as minimalProtocolSettings
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
        // this.activity.$seeded$CreatingDelegatedData({
        //     dataType: "settings",
        // })
        return hasReqts({});
    }
}

