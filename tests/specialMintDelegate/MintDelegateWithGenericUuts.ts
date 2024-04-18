import { hasSeedUtxo } from "../../src/StellarTxnContext";
import { BasicMintDelegate } from "../../src/minting/BasicMintDelegate";
import { uutMintingMintDelegate } from "./uutMintingMintDelegate";
import { Activity } from "../../dist/stellar-contracts";

export class MintDelegateWithGenericUuts extends BasicMintDelegate {
    @Activity.redeemer
    activityMintingUutsAppSpecific(tcx: hasSeedUtxo, purposes: string[]) {
        const mintingUuts = this.mustGetActivity("mintingUuts");

        const seed = tcx.getSeedUtxoDetails();
        const t = new mintingUuts(
            seed.txId,
            seed.idx,
            purposes
        );

        return { redeemer: t._toUplcData() };
    }

    get specializedMintDelegate() {
        return uutMintingMintDelegate;
    }
}
