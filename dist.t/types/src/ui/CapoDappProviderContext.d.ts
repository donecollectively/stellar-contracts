import type { Capo } from "@donecollectively/stellar-contracts";
import type { CapoDAppProvider } from "./CapoDappProvider.js";
import React from "react";
/**
 * @public
 */
export declare const CapoDappProviderContext: React.Context<CapoDAppProvider<any, import("./CapoDappProvider.js").BaseUserActionMap> | null>;
/**
 * React hook for accessing the CapoDappProvider context.
 * @remarks
 * The context data now includes the capo instance as well as the provider.
 *
 * Indicate your Capo's type in the type parameter to access your Capo's methods and properties.
 * @typeParam C - the type of the capo instance
 * @public
 */
export declare function useCapoDappProvider<C extends Capo<any, any> = Capo<any, any>>(): {
    capo: C | undefined;
    provider: CapoDAppProvider<C, import("./CapoDappProvider.js").BaseUserActionMap>;
    isMounted: boolean;
};
//# sourceMappingURL=CapoDappProviderContext.d.ts.map