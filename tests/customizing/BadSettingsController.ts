import BadSettingsBundle from "./BadSettings.hlb.js";
import type {
    // SpendingActivity,
    // SpendingActivityLike,
    ProtocolSettingsLike,
    ProtocolSettings,
    minimalProtocolSettings,
} from "./BadSettings.typeInfo.d.ts";
import { BadSettingsPolicyDataBridge } from "./BadSettings.bridge.js";
import {
    DelegatedDataBundle,
    DelegatedDataContract,
    hasReqts,
    WrappedDgDataContract,
} from "@donecollectively/stellar-contracts";

export class BadSettingsController extends DelegatedDataContract<
    ProtocolSettings,
    ProtocolSettingsLike
> {
    dataBridgeClass = BadSettingsPolicyDataBridge;

    async scriptBundle(): Promise<DelegatedDataBundle> {
        const bundleModule = await import("./BadSettings.hlb.js");
        return bundleModule.BadSettingsBundle.create() as DelegatedDataBundle;
    }

    exampleData(this: BadSettingsController): minimalProtocolSettings {
        return {
            // id: textToBytes("set-42"),
            // type: "settings",
            meaning: 42,
            badSpenderSetting: 0,
            badMinterSetting: 0,
            //@ts-expect-error on this bad attribute
            x: 19,
        };
    }

    get delegateName() {
        return "settingsPolicy";
    }
    get recordTypeName() {
        return "settings";
    }
    get idPrefix() {
        return "set";
    }

    requirements() {
        // this.activity.$seeded$CreatingDelegatedData({
        //     dataType: "settings",
        // })
        return hasReqts({});
    }
}

class NoOpWrapper {
    constructor(public x: ProtocolSettings) {}
    unwrapData() {
        return this.x;
    }
}

export class BadSettingsControllerWithWrapper extends WrappedDgDataContract<
    ProtocolSettings,
    ProtocolSettingsLike,
    NoOpWrapper
> {
    dataBridgeClass = BadSettingsPolicyDataBridge;
    scriptBundle() {
        return BadSettingsBundle.create();
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
            badMinterSetting: 0,
        } as minimalProtocolSettings;
    }

    get delegateName() {
        return "settingsPolicy";
    }
    get recordTypeName() {
        return "settings";
    }
    get idPrefix() {
        return "set";
    }

    requirements() {
        // this.activity.$seeded$CreatingDelegatedData({
        //     dataType: "settings",
        // })
        return hasReqts({});
    }
}
