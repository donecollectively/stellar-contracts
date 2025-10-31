import type { UplcData } from "@helios-lang/uplc";
import { DataBridge, type DataBridgeOptions } from "./DataBridge.js";
import type { isActivity } from "../../ActivityTypes.js";
/**
 * @public
 */
export declare const JustAnEnum: unique symbol;
/**
 * @public
 */
export type JustAnEnum = typeof JustAnEnum;
/**
 * @public
 */
export declare const Nested: unique symbol;
/**
 * @public
 */
export type Nested = typeof Nested;
/**
 * @public
 */
export declare const NotNested: unique symbol;
/**
 * @public
 */
export type NotNested = typeof NotNested;
/**
 * @public
 */
export declare const isDatum: unique symbol;
/**
 * @public
 */
export type isDatum = typeof isDatum;
/**
 * EnumMaker provides a way to create UplcData for enums.  It optionally includes an activity wrapper \{ redeemer: UplcData \}
 * ... and honors a nested context to inject (instead of UPLC-ing) typed, nested data into a parent context for uplc formatting.
 * @public
 */
export declare class EnumBridge<TYPE extends isActivity | isDatum | JustAnEnum = JustAnEnum, uplcReturnType = isActivity extends TYPE ? {
    redeemer: UplcData;
} : UplcData> extends DataBridge {
    constructor(options: DataBridgeOptions);
    mkUplcData(value: any, enumPathExpr: string): uplcReturnType;
}
//# sourceMappingURL=EnumBridge.d.ts.map