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
    isActivity extends TYPE ? { redeemer: UplcData } : UplcData
> extends DataBridge {
    constructor(options : DataBridgeOptions) {
        super(options);
    }   
    // the uplcReturnType provides type clues, mainly for editor support
    // and compile-time type-checking.  
    mkUplcData(value: any, enumPathExpr: string) : uplcReturnType{
        if (this.redirectTo) {
            //@ts-expect-error the signature's return type is provided by the returned
            //   value from the redirectTo() callback.
            return this.redirectTo(value)
        }
        const uplc = this.ᱺᱺcast.toUplcData(value, enumPathExpr);
        const t = uplc.toString();
        const cborHex = bytesToHex(uplc.toCbor());
        
        uplc.dataPath = enumPathExpr;
        if (this.isActivity) {
            return {
                redeemer: uplc
            } as uplcReturnType;
        } else {
            return uplc as uplcReturnType;
        }
    }

}


