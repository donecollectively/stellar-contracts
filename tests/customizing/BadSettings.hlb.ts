import { CapoDelegateBundle, CapoHeliosBundle } from "@donecollectively/stellar-contracts";
import BadSettingsPolicy from "./BadSettingsPolicy.hl";
import BadProtocolSettings from "./TestBadSettings.hl";

export default class BadSettingsBundle 
extends CapoDelegateBundle.usingCapoBundleClass(CapoHeliosBundle) {
    specializedDelegateModule = BadSettingsPolicy

    get modules() {
        return [
            BadProtocolSettings, 
        ];

        // ... along with automatic-includes from Capo
    }
}

