import * as React from "react";
import { type CharterData, type Capo } from "@donecollectively/stellar-contracts";
/**
 * Shows a Capo-based dApp's charter status as a dashboard-style screen
 * @public
 */
export declare function CharterStatus(): React.JSX.Element | null;
/**
 * Shows a highlights of various contract elements within a Capo-based dApp
 * @remarks
 * Includes mint and spend delegates, delegated data policies, and named manifest entries
 * @public
 */
export declare function CharterHighlights({ capo, charterData, }: {
    capo: Capo<any, any>;
    charterData: CharterData;
}): React.JSX.Element | null;
//# sourceMappingURL=CharterStatus.d.ts.map