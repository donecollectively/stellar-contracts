import type { NetworkParams } from "@helios-lang/ledger";
import type {
    Capo,
    StellarContract,
    ConfigFor,
    configBase,
    SeedTxnScriptParams,
    CapoFeatureFlags,
    rootCapoConfig,
    CapoConfig,
} from "@donecollectively/stellar-contracts";
import type { StellarTestHelper } from "./StellarTestHelper.js";
import type { DefaultCapoTestHelper } from "./DefaultCapoTestHelper.js";
import {
    SimpleWallet_stellar as emulatedWallet,
    type NetworkSnapshot,
} from "./StellarNetworkEmulator.js";
import type { StellarTestContext } from "./StellarTestContext.js";
// import type {
//     StellarTestContext,
//     StellarTestHelper,
//     DefaultCapoTestHelper,
//     NetworkSnapshot,
//     SimpleWallet_stellar as emulatedWallet,
// } from "@donecollectively/stellar-contracts/testing";

/**
 * @public
 */
export type enhancedNetworkParams = NetworkParams & {
    slotToTimestamp(n: bigint): Date;
};
/**
 * @public
 */
export type stellarTestHelperSubclass<SC extends StellarContract<any>> = new (
    stConfig: ConfigFor<SC> & canHaveRandomSeed,
    helperState?: TestHelperState<SC>
) => StellarTestHelper<SC>;

// export type allCapoConfigDetails<SC extends Capo<any>> =
// ConfigFor<SC> & rootCapoConfig & CapoFeatureFlags &
//         SeedTxnScriptParams & {
//             mph: MintingPolicyHash;
//         };

/**
 * @public
 */
export type DefaultCapoTestHelperClass<
    SC extends Capo<any>,
    SpecialState extends Record<string, any> = {}
> = new (
    config?: canHaveRandomSeed & SC extends Capo<any, infer FF>
        ? ConfigFor<SC> & CapoConfig<FF>
        : ConfigFor<SC>,
    helperState?: TestHelperState<SC, SpecialState>
) => // StellarTestHelper<SC> &
DefaultCapoTestHelper<SC, SpecialState>;

/**
 * @public
 */
export type canHaveRandomSeed = {
    randomSeed?: number;
};
/**
 * @public
 */
export type canSkipSetup = {
    skipSetup?: true;
};

/**
 * Establishes a state object for a test helper.  
 * @remarks
 * The second optional type parameter allows adding arbitrary fields to the state object,
 * suitable for state particular to your app testing needs.
 * @public
 */
export type TestHelperState<
    SC extends StellarContract<any>, 
    Special extends Record<string, any> = {[key: string]: never}
> = {
    bootstrapped: Boolean;
    bootstrappedStrella?: SC;
    snapshots: Record<string, NetworkSnapshot>;
    previousHelper: StellarTestHelper<any>;
} & Special;

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
    ST_CONFIG extends configBase & ConfigFor<SC> = ConfigFor<SC>,
    SpecialState extends Record<string, any> = {[key: string]: never}
>(
    context: StellarTestContext<any, SC>,
    TestHelperClass: SC extends Capo<any>
        ? DefaultCapoTestHelperClass<SC, SpecialState>
        : stellarTestHelperSubclass<SC>,
    stConfig?: Partial<
        SC extends Capo<any, infer FF> ? {featureFlags: FF} & ST_CONFIG : ST_CONFIG
    >,
    helperState?: TestHelperState<SC, SpecialState>
) {
    console.log(" ======== ======== ======== +test context");
    Object.defineProperty(context, "strella", {
        get: function () {
            return this.h.strella;
        },
    });

    //@ts-expect-error on matchiness of the SC type
    context.initHelper = async (stConfig, helperState) => {
        //@ts-expect-error on matchiness of helperState
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

/**
 * @public
 */
export type actorMap = Record<string, emulatedWallet>;

/**
 * 1 million as bigint.  Multiply by this a `Bigint` ADA value to get lovelace
 * @public
 * @example
 *    const three = 3n * ADA
 *    const four = Bigint(4) * ADA
 **/
/**
 * @public
 */
export const ADA = 1_000_000n; // lovelace

/**
 * Recursively expand all types in a type
 * @public
 */
export type ExpandRecursively<T> = T extends object
    ? T extends infer O
        ? { [K in keyof O]: ExpandRecursively<O[K]> }
        : never
    : T;
