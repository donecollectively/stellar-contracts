import { SeedTxnParams } from "../SeedTxn.js";
import { Activity, StellarContract, isActivity, partialTxn } from "../StellarContract.js";
import { StellarTxnContext } from "../index.js";

export abstract class AbstractAuthority extends StellarContract<SeedTxnParams>{


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

    // @partialTxn
    abstract txnAuthorizeCharter(tcx: StellarTxnContext) :StellarTxnContext

}