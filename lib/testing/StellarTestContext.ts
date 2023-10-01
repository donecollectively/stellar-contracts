import { TestContext } from "vitest";
import { StellarContract, paramsBase } from "../StellarContract.js";
import { canHaveRandomSeed, canSkipSetup } from "./types.js";
import { StellarTestHelper } from "./StellarTestHelper.js";


export interface StellarTestContext<
    HTH extends StellarTestHelper<SC, P>,
    SC extends StellarContract<any> = HTH extends StellarTestHelper<
        infer SC2, any
    > ? SC2 : never,
    P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never
> extends canHaveRandomSeed, TestContext {
    h: HTH;
    get strella(): SC;
    initHelper(
        // <
        //     SC extends StellarContract<any>,
        //     P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never
        // >
        params: Partial<P> & canHaveRandomSeed & canSkipSetup
    ): Promise<StellarTestHelper<SC, P>>;
}
