import React, { type ReactNode } from "react";
/**
 * Directs react contents into a portal, with simple interface and automatic fallback
 * @public
 */
export declare function InPortal(props: {
    domId: string;
    fallbackLocation?: "top" | "bottom" | "none";
    fallbackHelp?: string;
    fallbackComponent?: React.ComponentType<any>;
    delay?: number;
    maxRetries?: number;
    children: ReactNode;
}): React.JSX.Element;
//# sourceMappingURL=inPortal.d.ts.map