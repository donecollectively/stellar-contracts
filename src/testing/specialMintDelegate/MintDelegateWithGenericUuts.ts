import { Activity, type BundleType, type hasSeed } from "../../StellarContract.js";
import { type hasSeedUtxo } from "../../StellarTxnContext.js";
import { HeliosScriptBundle } from "../../helios/HeliosScriptBundle.js";
import { BasicMintDelegate } from "../../minting/BasicMintDelegate.js";
import uutMintingMintDelegateBundle from "./uutMintingMintDelegate.hlbundle.js";

export class MintDelegateWithGenericUuts extends BasicMintDelegate {
    get delegateName() { return "uutMintingDelegate" }

    scriptBundle() {
        return this.mkBundleWithCapo(uutMintingMintDelegateBundle);
    }
    
    @Activity.redeemer
    activityMintingUutsAppSpecific(seedFrom: hasSeedUtxo, purposes: string[]) {
        const seed = this.getSeed(seedFrom);

        return this.mkSeededMintingActivity("mintingUuts", {
            seed,
            purposes, 
        });
    }

    @Activity.redeemer
    activityCreatingTestNamedDelegate(seedFrom: hasSeed, purpose: string) {
        const seed = this.getSeed(seedFrom);
        return this.mkCapoLifecycleActivity("CreatingDelegate", {
            seed,
            purpose,
        });
    }

    // get specializedDelegateModule() {
    //     return uutMintingMintDelegate;
    // }
}
