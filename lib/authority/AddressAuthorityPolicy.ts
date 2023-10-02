import { SeedTxnParams } from "../SeedTxn.js";
import { Activity, StellarContract, isActivity, partialTxn } from "../StellarContract.js";
import { StellarTxnContext } from "../index.js";
import { AuthorityPolicy } from "./AuthorityPolicy.js";

export class AddressAuthorityPolicy extends AuthorityPolicy {

    @Activity.redeemer
    protected usingAuthority(): isActivity {
        const r = this.configuredContract.types.Redeemer;
        const { usingAuthority } = r;
        if (!usingAuthority) {
            throw new Error(
                `invalid contract without a usingAuthority redeemer`
            );
        }
        const t = new usingAuthority();

        return { redeemer: t._toUplcData() };
    }


}