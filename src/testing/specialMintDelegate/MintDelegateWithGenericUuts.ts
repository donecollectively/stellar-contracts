import { Activity } from "../../StellarContract.js";
import { type hasSeedUtxo } from "../../StellarTxnContext.js";
import { BasicMintDelegate } from "../../minting/BasicMintDelegate.js";
import type { hasSeed } from "../../ActivityTypes.js";

import uutMintingMintDelegateBundle from "./uutMintingMintDelegate.hlbundle.js";
import ummdDataBridge from "./uutMintingMintDelegate.bridge.js"

export class MintDelegateWithGenericUuts extends BasicMintDelegate {
    dataBridgeClass = ummdDataBridge;
    get delegateName() { return "uutMintingDelegate" }

    scriptBundle() {
        return new uutMintingMintDelegateBundle();
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
