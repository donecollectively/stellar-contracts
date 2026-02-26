import type { UplcData } from "@helios-lang/uplc";
import { DataBridge, type DataBridgeOptions } from "./DataBridge.js";
import type { HeliosScriptBundle } from "../scriptBundling/HeliosScriptBundle.js";
import type { isActivity } from "../../ActivityTypes.js";
import { bytesToHex } from "@helios-lang/codec-utils";

/**
 * @public
 */
export const JustAnEnum = Symbol("JustAnEnum");
/**
 * @public
 */
export type JustAnEnum = typeof JustAnEnum;
/**
 * @public
 */
export const Nested = Symbol("Nested");
/**
 * @public
 */
export type Nested = typeof Nested;
/**
 * @public
 */
export const NotNested = Symbol("NotNested");
/**
 * @public
 */
export type NotNested = typeof NotNested;

/**
 * @public
 */
export const isDatum = Symbol("isDatum");
/**
 * @public
 */
export type isDatum = typeof isDatum;

/**
 * EnumMaker provides a way to create UplcData for enums.  It optionally includes an activity wrapper \{ redeemer: UplcData \}
 * ... and honors a nested context to inject (instead of UPLC-ing) typed, nested data into a parent context for uplc formatting.
 * @public
 */
export class EnumBridge<
    TYPE extends isActivity | isDatum | JustAnEnum = JustAnEnum,
    // NESTED extends Nested | NotNested = NotNested,
    uplcReturnType = //extends (isActivity extends TYPE ? { redeemer: UplcData } : UplcData) =
    isActivity extends TYPE ? { redeemer: UplcData; moduleName: string; activityName: string; activityData: any } : UplcData
> extends DataBridge {
    constructor(options : DataBridgeOptions) {
        super(options);
    }   
    // the uplcReturnType provides type clues, mainly for editor support
    // and compile-time type-checking.  
    mkUplcData(value: any, enumPathExpr: string) : uplcReturnType{
        console.log(`[EnumBridge.mkUplcData] path=${enumPathExpr} isActivity=${this.isActivity} isNested=${this.isNested} hasRedirect=${!!this.redirectTo}`);
        if (this.redirectTo) {
            const result = this.redirectTo(value, enumPathExpr);
            console.log(`[EnumBridge.mkUplcData] after redirect, result keys=${Object.keys(result)}`);
            return result;
        }
        const uplc = this.ᱺᱺcast.toUplcData(value, enumPathExpr);
        const t = uplc.toString();
        const cborHex = bytesToHex(uplc.toCbor());
        
        uplc.dataPath = enumPathExpr;
        if (this.isActivity) {
            const [moduleName, activityName] = enumPathExpr.split("::");
            console.log(`[EnumBridge.mkUplcData] wrapping as activity: moduleName=${moduleName} activityName=${activityName}`);
            return {
                redeemer: uplc,
                moduleName,
                activityName,
                activityData: value
            } as uplcReturnType;
        } else {
            console.log(`[EnumBridge.mkUplcData] NOT wrapping (isActivity=false)`);
            return uplc as uplcReturnType;
        }
    }

}


