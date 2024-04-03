import { ByteArrayData, IntData, MapData, textToBytes, type Datum } from "@hyperionbt/helios";
import type { StellarContract } from "./StellarContract.js";
import type { helios } from "../index.js";

    /**
     * Provides transformations of data between preferred application types and on-chain data types
     * @remarks
     * 
     * This class is intended to be subclassed for each specific data type used StellarContracts class
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
    get capo() {
        if ("initSettingsAdapter" in this.strella) return this.strella;

        throw new Error(`not a capo instance: ${this.strella.constructor.name}`);
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

    toRealNum(n: number): helios.IntData {
        // supports fractional inputs (they can always be represented as a BigInt, with sufficient precision)
        // note: don't expect very very small numbers to be accurately represented
        const microInt1 = Number(n) * 1_000_000;
        // supports larger integer inputs
        BigInt((42.008).toFixed(0));

        let microInt2;
        try {
            microInt2 = BigInt(n.toFixed(0)) * 1_000_000n;
        } catch(e) {}
            if (microInt2 && microInt2 > Number.MAX_SAFE_INTEGER) {
                throw new Error(
                    `microInt value too large for Number: ${microInt2}`
                );
            }

        return new IntData(BigInt(microInt1));
    }

    toMapData<T = any>(
        k: Record<string, T>,
        transformer?: (n: T) => helios.UplcData
    ): helios.MapData {
        const t = new MapData(
            Object.entries(k).map(([key, value]) => {
                const keyBytes = new ByteArrayData(textToBytes(key));
                const uplcValue = transformer ? transformer(value) : value;
                return [keyBytes, uplcValue] as [helios.UplcData, helios.UplcData];
            })
        );
        return t;
    }

}

