import {
    NetworkParams,
    type Network,
} from "@hyperionbt/helios";

import type {
    ConfigFor,
    StellarContract,
    configBaseWithRev,
    stellarSubclass,
} from "../StellarContract.js";
import type { StellarTestContext } from "./StellarTestContext.js";
import type { StellarTestHelper } from "./StellarTestHelper.js";
import ppParams from "../../preprod.json" assert { type: "json" };
import type { DefaultCapoTestHelper } from "./DefaultCapoTestHelper.js";
import type { Capo, CapoBaseConfig } from "../Capo.js";
import type { NetworkSnapshot, SimpleWallet_stellar as emulatedWallet } from "./StellarNetworkEmulator.js";

//   ppParams.latestParams.maxTxExecutionUnits.memory = 28_000_000

export const preProdParams = ppParams;

export type enhancedNetworkParams = NetworkParams & {
    slotToTimestamp(n: bigint): Date;
};
export type stellarTestHelperSubclass<SC extends StellarContract<any>> = new (
    config: ConfigFor<SC> & canHaveRandomSeed, helperState: any
) => StellarTestHelper<SC>;

export type DefaultCapoTestHelperClass<SC extends Capo<any>> = new (
    config: ConfigFor<SC> & canHaveRandomSeed
) => StellarTestHelper<SC> & DefaultCapoTestHelper<SC> 
// & { get stellarClass(): stellarSubclass<SC> };

// type DefaultCapoTestHelperSubclass<SC extends DefaultCapo<any>> = new (
//     args: StellarConstructorArgs<CapoBaseConfig>
// ) => DefaultCapoTestHelper<SC>;

export type canHaveRandomSeed = {
    randomSeed?: number;
};
export type canSkipSetup = {
    skipSetup?: true;
};

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
 * @param params - preset configuration for the contract under test
 * @public
 **/
export async function addTestContext<
    SC extends StellarContract<any>,
    P extends configBaseWithRev = ConfigFor<SC>
>(
    context: StellarTestContext<any, SC>,
    TestHelperClass: stellarTestHelperSubclass<SC>,
    params?: P,
    helperState?: TestHelperState<SC>
) {
    console.log(" ======== ======== ======== +test context");
    Object.defineProperty(context, "strella", {
        get: function () {
            return this.h.strella;
        },
    });

    context.initHelper = async (params, helperState) => {
        //@ts-expect-error
        const helper = new TestHelperClass(params, helperState);
        // await helper.setupPending;
        if (context.h) {
            //xx@ts-expect-error temporarily
            if (!params.skipSetup)
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
        await context.initHelper(params, helperState);
    } catch (e) {
        if (!params) {
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
