import { TestContext } from "vitest";
import { ConfigFor, StellarContract, configBase } from "../StellarContract.js";
import { canHaveRandomSeed, canSkipSetup } from "./types.js";
import { StellarTestHelper } from "./StellarTestHelper.js";

export interface StellarTestContext<
    HTH extends StellarTestHelper<SC>,
    SC extends StellarContract<any> = HTH extends StellarTestHelper<infer iSC>
        ? iSC
        : never
> extends canHaveRandomSeed,
        TestContext {
    h: HTH;
    get strella(): SC;
    initHelper(
        config: Partial<ConfigFor<SC>> & canHaveRandomSeed & canSkipSetup
    ): Promise<StellarTestHelper<SC>>;
}
