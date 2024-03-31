import type { Datum } from "@hyperionbt/helios";
import type { StellarContract, anyDatumProps } from "./StellarContract.js";
import type { DefaultCharterDatumArgs } from "./DefaultCapo.js";
import type { Capo } from "./Capo.js";

export type RawDatumType<T extends DatumAdapter<any, any,any>> =
    T extends DatumAdapter<infer R, any,any> ? R : never;

    /**
     * Provides transformations of data between preferred application types and on-chain data types
     * @remarks
     * 
     * This class is intended to be subclassed for each specific data type used in a Capo contract.
     * 
     * The fromOnchainDatum method should be implemented to convert deserialized on-chain data to the application type,
     * 
     * @typeParam appType - high-level preferred application type for the data; may be a class having various methods
     * @typeParam OnchainBridgeType - the on-chain data type, as deserialized from the contract
     * @typeParam contractType - the specific contract class that uses this data type
     * @public
     **/
export abstract class DatumAdapter<
    appType,
    OnchainBridgeType,
    contractType extends StellarContract<any>
> {
    strella: contractType;
    constructor(strella: contractType) {
        this.strella = strella;
    }
    get onChainDatumType() {
        return this.strella.onChainDatumType;
    }
    get onChainTypes() {
        return this.strella.onChainTypes;
    }

    abstract datumName: string;
    /**
     * Transforms deserialized on-chain data into the preferred application type
     * @remarks
     * 
     * The type of data received from the on-chain datum parser is specific to the contract
     * and on-chain datum type.  This method should convert that data into the preferred form.
     * @public
     **/    
    abstract fromOnchainDatum(
        raw: OnchainBridgeType
    ): appType | Promise<appType>;
        /**
         * Should construct the right form of on-chain data, using classes provided by the Helios contract
         * @remarks
         * 
         * The type constructed by this method will (short-term) be on-chain types.
         * Soon, this can simply be an adapted form of JSON suitable for Helios' JSON-structured data bridge.
         * @public
         **/
    abstract toOnchainDatum(d: appType): Datum;
}
