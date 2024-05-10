import {
    ByteArrayData,
    IntData,
    MapData,
    UplcData,
    textToBytes,
    type Datum,
    ConstrData,
} from "@hyperionbt/helios";
import type { StellarContract } from "./StellarContract.js";
import * as helios from "@hyperionbt/helios";

export type BigIntRecord<T extends Record<string, number>> = {
    [K in keyof T]: bigint;
};

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
> {
    strella: StellarContract<any>;
    constructor(strella: StellarContract<any>) {
        this.strella = strella;
    }

    /**
     * The type of data expected from the on-chain datum parser
     * 
     * Note that the on-chain type for delegates will differ from the Capo's on-chain type.
     * Note: When you're working with a Capo delegate, you may reference 
     * this.capo.onChainDatumType as well (but if your delegate is handling 
     * DelegatedData entries in the Capo, just use  {@link DelegatedDatumAdapter} instead
     */
    get onChainDatumType() {
        return this.strella.onChainDatumType;
    }

    get onChainTypes() {
        return this.strella.onChainTypes;
    }

    get capo() {
        if ("initSettingsAdapter" in this.strella) return this.strella;
        if (this.strella.configIn?.capo) return this.strella.configIn?.capo;

        throw new Error(
            `not a capo instance: ${this.strella.constructor.name}`
        );
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
    abstract toOnchainDatum(d: appType): Datum | Promise<Datum>;

    uplcReal(n: number): IntData {
        // supports fractional inputs (they can always be represented as a BigInt, with sufficient precision)
        // note: don't expect very very small numbers to be accurately represented
        const microInt1 = Number(n) * 1_000_000;
        // supports larger integer inputs
        BigInt((42.008).toFixed(0));

        let microInt2;
        try {
            microInt2 = BigInt(n.toFixed(0)) * 1_000_000n;
        } catch (e) {}
        if (microInt2 && microInt2 > Number.MAX_SAFE_INTEGER) {
            throw new Error(
                `microInt value too large for Number: ${microInt2}`
            );
        }

        return new IntData(BigInt(microInt1));
    }

    /**
     * Formats a string for use on-chain
     */
    uplcString(s: string) {
        return new ByteArrayData(textToBytes(s)); //UplcString(helios.Site.dummy(), s);
    }

    /**
     * Formats a number for use on-chain
     */
    uplcInt(x: number | bigint) {
        return new helios.IntData(BigInt(x));
    }

    wrapCIP68(enumVariant: any, d: MapData | ConstrData) : ConstrData
    wrapCIP68(d: MapData) : ConstrData
    wrapCIP68(dOrV: MapData | any, d?: MapData | ConstrData) : ConstrData {
        let index = 242; // abstract CIP-68 wrapper
        let mapData : MapData | ConstrData;
        if (!d) {
            mapData = dOrV;
        } else {   
            mapData = d         
            index = dOrV.prototype._enumVariantStatement.constrIndex
        }
        return new ConstrData(index, [mapData]);
    }

    toMapData(k: Record<string, any>,
        transformer?: (n: any) => UplcData
    ): MapData
    toMapData(
        k: Record<string, UplcData> | Record<string,any>
    ): MapData
    toMapData(
        k: Record<string, UplcData> | Record<string,any>, 
        transformer?: (n: any) => UplcData
    ): MapData {
        const t = new MapData(
            Object.entries(k).map(([key, value]) => {
                const keyBytes = new ByteArrayData(textToBytes(key));
                const uplcValue = transformer ? transformer(value) : value;
                if (!uplcValue.memSize || Number.isNaN(uplcValue.memSize)) {
                    console.log("  ⚠️ ⚠️ ⚠️  toMapData: bad UplcData value - must have numeric memSize", key, value);
                    if (uplcValue._toUplcData) {
                        debugger;
                        throw new Error(`toMapData(): key ${key} not converted to uplc - try _toUplcData()`);
                    }
                }
                return [keyBytes, uplcValue] as [UplcData, UplcData];
            })
        );
        return t;
    }

    fromOnchainMap<KEYS extends string>(
        data: Record<KEYS, BigInt>,
        transformer: (x: bigint) => number
    ) {
        return Object.fromEntries(
            (Object.entries(data) as [string, bigint][]).map(([k, v]: [string, bigint]) => [
                k,
                transformer(v),
            ])
        ) as Record<KEYS, number>;
    }

    fromUplcReal(x: bigint | number) {
        return Number(x) / 1_000_000
    }

    fromUplcString(x: number[]) {
        return helios.bytesToText(x)
    }
}
