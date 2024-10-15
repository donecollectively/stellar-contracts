import uutMintingMintDelegate from "./uutMintingMintDelegate.hl";
import { CapoDelegateBundle } from "../../src/delegation/CapoDelegateBundle.js";

export default class BundleMintDelegateWithGenericUuts extends CapoDelegateBundle {
    get specializedDelegateModule() {
        return uutMintingMintDelegate;
    }


}
