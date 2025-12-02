import type { TypeSchema } from "@helios-lang/type-utils";
import { type Cast } from "@helios-lang/contract-utils";
import { type TxOutputId } from "@helios-lang/ledger";
import type { UplcData } from "@helios-lang/uplc";
import type { readsUplcData } from "../HeliosMetaTypes.js";
import type { EnumBridge } from "./EnumBridge.js";
import type { readsUplcTo } from "./BridgeTypes.js";
import { type hasSeed } from "../../ActivityTypes.js";
/**
 * @internal
 */
export type DataBridgeOptions = {
    isMainnet: boolean;
    isActivity?: boolean;
    isNested?: boolean;
};
/**
 * @internal
 */
export type callWith<ARGS, T extends DataBridge> = T & ((x: ARGS) => ReturnType<T["ᱺᱺcast"]["toUplcData"]>);
declare const DataBridge_base: ObjectConstructor;
/**
 * @internal
 */
export declare class DataBridge extends DataBridge_base {
    /**
     * @internal
     */
    ᱺᱺschema: TypeSchema;
    /**
     * @internal
     */
    isMainnet: boolean;
    /**
     * @internal
     */
    isActivity: boolean;
    /**
     * @internal
     */
    isNested: boolean;
    /**
     * @internal
     */
    ᱺᱺcast: Cast<any, any>;
    /**
     * @internal
     */
    isCallable: boolean;
    mkData: this["ᱺᱺcast"]["toUplcData"];
    readData: this["ᱺᱺcast"]["fromUplcData"];
    constructor(options: DataBridgeOptions);
    getSeed(arg: hasSeed | TxOutputId): TxOutputId;
    /**
     * @internal
     */
    redirectTo?: (value: any) => void;
    /**
     * @internal
     */
    mkDataVia(redirectionCallback: (value: any) => void): void;
    /**
     * @internal
     */
    get isEnum(): boolean;
    /**
     * @internal
     */
    getTypeSchema(): TypeSchema;
}
/**
 * @public
 */
export declare class ContractDataBridge {
    static isAbstract: true | false;
    isAbstract: true | false;
    isMainnet: boolean;
    types: Record<string, DataBridge | ((x: any) => UplcData)>;
    reader: DataBridgeReaderClass | undefined;
    datum: DataBridge | undefined;
    activity: DataBridge;
    readDatum: readsUplcData<any> | undefined;
    constructor(isMainnet: boolean);
    readData(x: any): any;
}
/**
 * @public
 */
export declare class ContractDataBridgeWithEnumDatum extends ContractDataBridge {
    static isAbstract: true | false;
    isAbstract: true | false;
    datum: EnumBridge;
    readDatum: readsUplcData<unknown>;
}
/**
 * @public
 */
export declare class ContractDataBridgeWithOtherDatum extends ContractDataBridge {
    static isAbstract: true | false;
    isAbstract: true | false;
    readDatum: readsUplcData<unknown>;
}
/**
 * @public
 */
export declare class DataBridgeReaderClass {
    datum: readsUplcTo<unknown> | undefined;
}
export {};
//# sourceMappingURL=DataBridge.d.ts.map