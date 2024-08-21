import { hasSeedUtxo } from "../../src/StellarTxnContext";
import { BasicMintDelegate } from "../../src/minting/BasicMintDelegate";
import { uutMintingMintDelegate } from "./uutMintingMintDelegate";
import { Activity } from "../../dist/stellar-contracts";
import { hasSeed } from "../../src/StellarContract";
import { ByteArrayData, ListData, textToBytes } from "@hyperionbt/helios";


export class MintDelegateWithGenericUuts extends BasicMintDelegate {
    @Activity.redeemer
    activityMintingUutsAppSpecific(seedFrom: hasSeedUtxo, purposes: string[]) {
        const seed = this.getSeed(seedFrom);

        return  this.mkSeededMintingActivity(
            "mintingUuts", 
            seed,
            new ListData(purposes.map(
                p => new ByteArrayData(textToBytes(p))
            ))
        );
    }

    @Activity.redeemer
    activityCreatingTestNamedDelegate(seedFrom: hasSeed, uutPurpose: string) {
        const seed = this.getSeed(seedFrom);
        return this.mkCapoLifecycleActivity(
            "CreatingDelegate", 
            seed, 
            new ByteArrayData(textToBytes(uutPurpose))
        );
 //       return this.mkMintingActivity("CreatingVault", txId, idx, uutPurpose);
    }

    get specializedDelegateModule() {
        return uutMintingMintDelegate;
    }
}
