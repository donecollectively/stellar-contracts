import type { TestContext } from "vitest";
import type { ConfigFor, StellarContract, configBaseWithRev } from "../StellarContract.js";
import type { TestHelperState, canHaveRandomSeed, canSkipSetup } from "./types.js";
import type { StellarTestHelper } from "./StellarTestHelper.js";

/**
 * Interface augmenting the generic vitest testing context with a convention for testing contracts created with Stellar Contracts.
 * @public
 **/
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
        config: Partial<ConfigFor<SC>> & canHaveRandomSeed & canSkipSetup,
        helperState?: TestHelperState<SC>
    ): Promise<StellarTestHelper<SC>>;
}
