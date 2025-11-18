import type { Capo } from "@donecollectively/stellar-contracts";
import type { CapoDAppProvider } from "./CapoDappProvider.js";
import React from "react";

/**
 * @public
 */
export const CapoDappProviderContext =
    React.createContext<CapoDAppProvider<any> | null>(null);

/**
 * React hook for accessing the CapoDappProvider context.
 * @remarks
 * The context data now includes the capo instance as well as the provider.
 *
 * Indicate your Capo's type in the type parameter to access your Capo's methods and properties.
 * @typeParam C - the type of the capo instance
 * @public
 */
export function useCapoDappProvider<
    C extends Capo<any, any> = Capo<any, any>
>() {
    const provider = React.useContext(
        CapoDappProviderContext as React.Context<CapoDAppProvider<C> | null>
    );
    if (!provider) {
        return null;
        throw new Error(
            "useCapoDappProvider must be used within a CapoDappProvider"
        );
    }
    const [isMounted, setIsMounted] = React.useState(false);
    const [capo, setCapo] = React.useState<C>();
    const [checking, keepChecking] = React.useState(1);

    React.useEffect(() => {
        setIsMounted(true);
        setTimeout(() => {
            if (capo !== provider?.capo) {
                setCapo(provider?.capo);
            }
            keepChecking(1 + checking);
        }, 2000);
    }, [checking, provider, provider?.userInfo.wallet, capo]);

    return { capo, provider, isMounted };
}
