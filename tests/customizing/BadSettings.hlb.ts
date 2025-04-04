import { CapoHeliosBundle, DelegatedDataBundle, MintSpendDelegateBundle } from "@donecollectively/stellar-contracts";
import BadSettingsPolicy from "./BadSettingsPolicy.hl";
import BadProtocolSettings from "./TestBadSettings.hl";

export default class BadSettingsBundle 
extends DelegatedDataBundle.usingCapoBundleClass(CapoHeliosBundle) {
    specializedDelegateModule = BadSettingsPolicy
    requiresGovAuthority = true;
    
    get modules() {
        return [
            BadProtocolSettings, 
        ];

        // ... along with automatic-includes from Capo
    }
}

