import type { UplcData } from "@helios-lang/uplc";
import type { isActivity } from "../../StellarContract.js";
import { someDataMaker } from "./someDataMaker.js";
import type { HeliosScriptBundle } from "../HeliosScriptBundle.js";

const JustAnEnum = Symbol("JustAnEnum");
export type JustAnEnum = typeof JustAnEnum;
const Nested = Symbol("Nested");
export type Nested = typeof Nested;5
const NotNested = Symbol("NotNested");
export type NotNested = typeof NotNested;

export type EnumMakerOptions = {
    isActivity?: boolean;
    isNested?: boolean;
};

/**
 * EnumMaker provides
 */

export class EnumMaker<
    TYPE extends isActivity | JustAnEnum = JustAnEnum,
    // NESTED extends Nested | NotNested = NotNested,
    uplcReturnType = //extends (isActivity extends TYPE ? { redeemer: UplcData } : UplcData) =
    isActivity extends TYPE ? { redeemer: UplcData } : UplcData
> extends someDataMaker {
    isActivity: boolean;
    isNested: boolean;
    constructor(bundle: HeliosScriptBundle,{ isActivity, isNested } : EnumMakerOptions) {
        super(bundle);
        this.isActivity = isActivity || false;
        this.isNested = isNested || false;
    }   
    redirectTo?: (value: any) => void;
    mkDataVia(redirectionCallback: (value: any) => void) {
        if (!this.isNested) {
            throw new Error(`dataMaker ${this.constructor.name}: redirectTo is only valid for nested enums`)
        }
    this.redirectTo = redirectionCallback;        
    }
    // the uplcReturnType provides type clues, mainly for editor support
    // and compile-time type-checking.  
    mkUplcData(value: any, enumPathExpr: string) : uplcReturnType{
        if (this.redirectTo) {
            //@ts-expect-error the signature's return type is provided by the returned
            //   value from the redirectTo() callback.
            return this.redirectTo(value)
        }
        const uplc = this.__cast.toUplcData(value);
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

export class DataMaker extends someDataMaker {

}

