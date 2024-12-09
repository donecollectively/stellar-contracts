import type {
    ConfigFor,
    StellarContract,
    configBaseWithRev,
    stellarSubclass,
} from "../StellarContract.js";
import type { StellarTestContext } from "./StellarTestContext.js";
import type { StellarTestHelper } from "./StellarTestHelper.js";
import type { DefaultCapoTestHelper } from "./DefaultCapoTestHelper.js";
import type { Capo, CapoConfig } from "../Capo.js";
import type { NetworkSnapshot, SimpleWallet_stellar as emulatedWallet } from "./StellarNetworkEmulator.js";
import type { NetworkParams } from "@helios-lang/ledger";

export type enhancedNetworkParams = NetworkParams & {
    slotToTimestamp(n: bigint): Date;
};
export type stellarTestHelperSubclass<SC extends StellarContract<any>> = new (
    stConfig: ConfigFor<SC> & canHaveRandomSeed, helperState: any
) => StellarTestHelper<SC>;

/**
 * @public
 */
export type DefaultCapoTestHelperClass<SC extends Capo<any>> = new (
    config: ConfigFor<SC> & canHaveRandomSeed
) => StellarTestHelper<SC> & DefaultCapoTestHelper<SC> 

export type canHaveRandomSeed = {
    randomSeed?: number;
};
export type canSkipSetup = {
    skipSetup?: true;
};

/**
 * @public
 */
export type TestHelperState<SC extends StellarContract<any>> = {
    bootstrapped: Boolean;
    bootstrappedStrella?: SC;
    snapshots: Record<string, NetworkSnapshot>;
    previousHelper: StellarTestHelper<any>;
}

/**
 * Adds a test helper class to a `vitest` testing context.
 * @remarks
 *
 * @param context -  a vitest context, typically created with StellarTestContext
 * @param TestHelperClass - typically created with DefaultCapoTestHelper
 * @param stConfig - preset configuration for the contract under test
 * @public
 **/
export async function addTestContext<
    SC extends StellarContract<any>,
    ST_CONFIG extends configBaseWithRev & ConfigFor<SC> = ConfigFor<SC>
>(
    context: StellarTestContext<any, SC>,
    TestHelperClass: stellarTestHelperSubclass<SC>,
    stConfig?: ST_CONFIG,
    helperState?: TestHelperState<SC>
) {
    console.log(" ======== ======== ======== +test context");
    Object.defineProperty(context, "strella", {
        get: function () {
            return this.h.strella;
        },
    });

    context.initHelper = async (stConfig, helperState) => {
        //@ts-expect-error
        const helper = new TestHelperClass(stConfig, helperState);
        // await helper.setupPending;
        if (context.h) {
            //xx@ts-expect-error temporarily
            if (!stConfig.skipSetup)
                throw new Error(
                    `re-initializing shouldn't be necessary without skipSetup`
                );
            console.log(
                "   ............. reinitializing test helper without setup"
            );
        }
        context.h = helper;
        // console.log("context IS ", context)
        return helper;
    };
    try {
        //@ts-expect-error
        await context.initHelper(stConfig, helperState);
    } catch (e) {
        if (!stConfig) {
            // console.error(e.stack || e.message || JSON.stringify(e));
            console.error(
                `${TestHelperClass.name}: error during initialization; does this test helper require initialization with explicit params?`
            );
            throw e;
        } else {
            console.error("urgh");
            throw e;
        }
    }
}

export type actorMap = Record<string, emulatedWallet>;

/**
 * 1 million as bigint.  Multiply by this a `Bigint` ADA value to get lovelace
 * @public
 * @example
 *    const three = 3n * ADA
 *    const four = Bigint(4) * ADA
 **/
export const ADA = 1_000_000n; // lovelace

// type debugging - typeinfo
export type Expand<T> = T extends (...args: infer A) => infer R
  ? (...args: Expand<A>) => Expand<R>
  : T extends infer O
  ? { [K in keyof O]: O[K] }
  : never;


export type ExpandRecursively<T> = T extends object
  ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
  : T;
