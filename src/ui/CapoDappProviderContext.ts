import type { Capo } from "@donecollectively/stellar-contracts";
import type { CapoDAppProvider } from "./CapoDappProvider.js";
import React, { useMemo, useState } from "react";
import { nanoid } from "../util/nanoid.js";
import { debugBox } from "../util/consoleHelper.js";

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
    const providerLocation = new Error().stack?.split("\n")[2].trim();

    const provider = React.useContext(
        CapoDappProviderContext as React.Context<CapoDAppProvider<C> | null>
    );
    if (!provider) {
        return null;
        throw new Error(
            "useCapoDappProvider must be used within a CapoDappProvider"
        );
    }
    const [id, setId] = useState(nanoid(4));
    const [isMounted, setIsMounted] = React.useState(false);
    const [capo, setCapo] = React.useState<C | undefined>(provider.capo!);
    const [checking, keepChecking] = React.useState(1);
    // REQT/fbxxqtz6rd (No Consumer Changes Required) — polling detects gated capo transition
    // REQT/z8zk3jxna7 (Deferred Readiness Polling) — checking in deps keeps polling alive
    React.useEffect(() => {
        if (!isMounted) {
            setIsMounted(true);
        }
        // console.log("useCapoDappProvider checking for new capo")// capo, provider?.capo);
        if (capo !== provider?.capo) {
            debugBox(
                `useCapoDappProvider ${id} setting capo`,
                capo,
                "->",
                provider?.capo,
                `\n${providerLocation}`
            );
            setCapo(provider?.capo);
        }
        if (!capo?.isConnected || !provider?.userInfo.wallet) {
            const t = setTimeout(() => {
                keepChecking(1 + checking);
            }, 2000);
            return () => clearTimeout(t);
        }
    }, [provider, provider?.userInfo.wallet, capo, provider.capo, checking]);

    const memoized = useMemo(() => {
        debugBox(
            `useCapoDappProvider ${id} updated:`,
            capo,
            provider,
            isMounted
        );
        return { capo, provider, isMounted };
    }, [capo, provider, isMounted]);

    return memoized;
}
