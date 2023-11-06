export { CapoTestHelper } from "./CapoTestHelper.js";

export { ADA, addTestContext } from "./types.js";
export const insufficientInputError =
    /(need .* lovelace, but only have|transaction doesn't have enough inputs)/;

export type { StellarTestContext } from "./StellarTestContext.js";

Error.stackTraceLimit = 100;

export { DefaultCapoTestHelper } from "./DefaultCapoTestHelper.js";
export { StellarTestHelper } from "./StellarTestHelper.js";
