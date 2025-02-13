import { CapoDelegateBundle } from "./CapoDelegateBundle.js";

export abstract class DelegatedDataBundle extends CapoDelegateBundle {
    get params() {
        return {
            rev: this.rev,
            delegateName: this.moduleName,
            isMintDelegate: false,
            isSpendDelegate: false,
            isDgDataPolicy: true,
        }
    }
}