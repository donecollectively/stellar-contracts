import { hasSeedUtxo } from "../../src/StellarTxnContext";
import { BasicMintDelegate } from "../../src/minting/BasicMintDelegate";
import { uutMintingMintDelegate } from "./uutMintingMintDelegate";
import { Activity } from "../../dist/stellar-contracts";
import { hasSeed } from "../../src/StellarContract";


export class MintDelegateWithGenericUuts extends BasicMintDelegate {
    @Activity.redeemer
    activityMintingUutsAppSpecific(tcx: hasSeedUtxo, purposes: string[]) {
        const seed = tcx.getSeedUtxoDetails();

        return  this.mkMintingActivity("mintingUuts", seed.txId, seed.idx, purposes);
    }

    @Activity.redeemer
    activityCreatingTestNamedDelegate(seed: hasSeed, uutPurpose: string) {
        const { txId, idx } = this.getSeed(seed);
        return this.mkCapoLifecycleActivity("CreatingDelegate", txId, idx, uutPurpose);
 //       return this.mkMintingActivity("CreatingVault", txId, idx, uutPurpose);
    }

    get specializedDelegate() {
        return uutMintingMintDelegate;
    }
}
