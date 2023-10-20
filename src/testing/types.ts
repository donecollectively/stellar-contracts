import {
    NetworkParams,
    SimpleWallet as WalletEmulator,
    SimpleWallet
} from "@hyperionbt/helios";

import { promises as fs } from "fs";
import { Vitest, vitest } from "vitest";
import {
    ConfigFor,
    StellarContract,
    configBase,
} from "../StellarContract.js";
import { StellarTestContext } from "./StellarTestContext.js";
import { StellarTestHelper } from "./StellarTestHelper.js";
import ppParams from "../../preprod.json" assert { type: "json" }

export const preProdParams = ppParams

export type enhancedNetworkParams = NetworkParams & {
    slotToTimestamp(n: bigint): Date;
};

export type stellarTestHelperSubclass<
    SC extends StellarContract<any>,
> = new (config: ConfigFor<SC> & canHaveRandomSeed) => StellarTestHelper<SC>;

export type canHaveRandomSeed = {
    randomSeed?: number;
};
export type canSkipSetup = {
    skipSetup?: true;
};

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

export const ADA = 1_000_000n; // lovelace
