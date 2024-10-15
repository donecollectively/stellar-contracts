
import { CapoDelegateBundle } from "./CapoDelegateBundle.js"
import UnspecializedMintDelegate from "../delegation/UnspecializedDelegate.hl"

export default class UnspecializedDgtBundle extends CapoDelegateBundle {
    get specializedDelegateModule() {
        return UnspecializedMintDelegate
    }
}

