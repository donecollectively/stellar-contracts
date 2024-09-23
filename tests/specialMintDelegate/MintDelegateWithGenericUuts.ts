import { Activity, hasSeed } from "../../src/StellarContract";
import { hasSeedUtxo } from "../../src/StellarTxnContext";
import { BasicMintDelegate } from "../../src/minting/BasicMintDelegate";
import { uutMintingMintDelegate } from "./uutMintingMintDelegate";
import { ByteArrayData, ListData, textToBytes } from "@hyperionbt/helios";

export class MintDelegateWithGenericUuts extends BasicMintDelegate {
    get delegateName() { return "uutMintingDelegate" }

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

    get specializedDelegateModule() {
        return uutMintingMintDelegate;
    }
}
