import type { Datum } from "@hyperionbt/helios";
import type { anyDatumProps } from "./StellarContract.js";
import type { DefaultCharterDatumArgs } from "./DefaultCapo.js";
import type { Capo } from "./Capo.js";

export type RawDatumType<T extends DatumAdapter<any, any>> = T extends DatumAdapter<
    infer R,
    any> ? R : never;

export abstract class DatumAdapter<
    appType,
    OnchainBridgeType
> {
    onChainDatumType: any;
    onChainTypes: any;
    constructor(onChainDatumType: any, onChainTypes: any) { 
        this.onChainDatumType = onChainDatumType
        this.onChainTypes = onChainTypes
    };
    abstract datumName: string;
    abstract fromOnchainDatum(raw: OnchainBridgeType) : appType | Promise<appType>;
    abstract toOnchainDatum(d: appType): Datum;
}
