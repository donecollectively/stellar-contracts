import {
    NetworkParams,
    SimpleWallet as WalletEmulator,
    SimpleWallet,
} from "@hyperionbt/helios";

import type {
    ConfigFor,
    StellarContract,
    configBase,
    stellarSubclass,
} from "../StellarContract.js";
import type { StellarTestContext } from "./StellarTestContext.js";
import type { StellarTestHelper } from "./StellarTestHelper.js";
import ppParams from "../../preprod.json" assert { type: "json" };
import type { DefaultCapoTestHelper } from "./DefaultCapoTestHelper.js";
import type { Capo } from "../Capo.js";
import type { DefaultCapo } from "../DefaultCapo.js";

export const preProdParams = ppParams;

export type enhancedNetworkParams = NetworkParams & {
    slotToTimestamp(n: bigint): Date;
};
export type stellarTestHelperSubclass<SC extends StellarContract<any>> = new (
    config: ConfigFor<SC> & canHaveRandomSeed
) => StellarTestHelper<SC>;

export type DefaultCapoTestHelperClass<SC extends DefaultCapo<any,any,any>> = new (
    config: ConfigFor<SC> & canHaveRandomSeed
) => StellarTestHelper<SC> & DefaultCapoTestHelper<SC> & { stellarClass: stellarSubclass<SC> };

// type DefaultCapoTestHelperSubclass<SC extends DefaultCapo<any>> = new (
//     args: StellarConstructorArgs<CapoBaseConfig>
// ) => DefaultCapoTestHelper<SC>;

export type canHaveRandomSeed = {
    randomSeed?: number;
};
export type canSkipSetup = {
    skipSetup?: true;
};

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
    P extends configBase = SC extends StellarContract<infer PT> ? PT : never
>(
    context: StellarTestContext<any, SC>,
    TestHelperClass: stellarTestHelperSubclass<SC>,
    params?: P
) {
    console.log(" ======== ========= ======== +test context");
    Object.defineProperty(context, "strella", {
        get: function () {
            return this.h.strella;
        },
    });

    context.initHelper = async (params) => {
        //@ts-expect-error
        const helper = new TestHelperClass(params);
        await helper.setupPending;
        if (context.h) {
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
        await context.initHelper(params);
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

export type actorMap = Record<string, WalletEmulator>;

/**
 * 1 million as bigint.  Multiply by this a `Bigint` ADA value to get lovelace
 * @public
 * @example
 *    const three = 3n * ADA
 *    const four = Bigint(4) * ADA
 **/
export const ADA = 1_000_000n; // lovelace
