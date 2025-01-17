import { CapoHeliosBundle } from "../../src/CapoHeliosBundle";
import { CapoDelegateBundle } from "../../src/delegation/CapoDelegateBundle";
import BadSettingsPolicy from "./BadSettingsPolicy.hl";
import BadProtocolSettings from "./TestBadSettings.hl";

export default class BadSettingsBundle 
extends CapoDelegateBundle.usingCapoBundleClass(CapoHeliosBundle) {
    get specializedDelegateModule() {
        return BadSettingsPolicy
    }

    get modules() {
        return [
            BadProtocolSettings, 
        ];

        // ... along with automatic-includes from Capo
    }
}

