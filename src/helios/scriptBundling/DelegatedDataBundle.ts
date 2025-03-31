import { CapoDelegateBundle } from "./CapoDelegateBundle.js";

export abstract class DelegatedDataBundle extends CapoDelegateBundle {
    scriptParamsSource = "bundle" as const

    /**
     * when set to true, the controller class will include the Capo's
     * gov authority in the transaction, to ease transaction setup.
     * @remarks
     * If you set this to false, a delegated-data script will not 
     * require governance authority for its transactions, and you will
     * need to explicitly enforce any user-level permissions needed
     * for authorizing delegated-data transactions.
     * @public
     */
    abstract requiresGovAuthority: boolean;

    get params() {
        return {
            rev: this.rev,
            delegateName: this.moduleName,
            isMintDelegate: false,
            isSpendDelegate: false,
            isDgDataPolicy: true,
            requiresGovAuthority: this.requiresGovAuthority,
        }
    }
}
