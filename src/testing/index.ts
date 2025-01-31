// declare module "@donecollectively/stellar-contracts/testing";

export type { NetworkSnapshot } from "./StellarNetworkEmulator.js";

export { CapoTestHelper } from "./CapoTestHelper.js";
export * from "./types.js";

/**
 * @public
 */
export const insufficientInputError =
    /(need .* lovelace, but only have|transaction doesn't have enough inputs)/;

/**
 * Interfaces with `vitest` to provide a testing context that can be used to test Stellar contracts.
 * @public
 */
export type { StellarTestContext } from "./StellarTestContext.js";

Error.stackTraceLimit = 100;

/**
 * @public
 */
export { DefaultCapoTestHelper } from "./DefaultCapoTestHelper.js";

/**
 * @public
 */
export { StellarTestHelper } from "./StellarTestHelper.js";


export {
    StellarNetworkEmulator,
    SimpleWallet_stellar
} from "./StellarNetworkEmulator.js";