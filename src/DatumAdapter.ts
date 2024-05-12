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
    [K in keyof T]: Numeric<"bigint">;
};

// for application-side data types that don't need classes to represent them,
// you must define a chain-bridge type, and you can derive a type representing 
// its off-chains forms.

// for application-side types that benefit from having a class to represent them,
// with javascript methods fitting logical needs (some kinds of "business logic") 
// for the on-chain objects, those methods become available because you first
// define the on-chain bridge type, and also define the class as the appType.  

// in both cases, you may need to define fromOnchainDatum() and 
// toOnchainDatum() to convert data from it's "parsed, but may not be ready to use" form
// into its UI-application-adapted form.  The DatumAdapter then collaborates with your
// Capo and other contracts when you readDatum() and when creating 
//   mkTxn...() and txn...() methods to serve your applications use cases.  
//
//Specifically, calls to readDatum(datumAdapter) will trigger the transformation of 
//  on-chain data to the application's preferred form, and the 
// result of readDatum() is ready to use, with class methods if you've defined 
// your appType in that way..
//
// ...and when spending datum-holding utxos from a contract, the 


// export type UplcFor<t , k extends string> = 
//         t extends helios.MintingPolicyHash ? number[] :
//         t extends bigint ? bigint :
//         t extends Numeric<any> ? bigint :
//         t extends string ? number[] :
//         t extends number ? `TYPE ERROR - use Numeric<> to define '${k}'` :
//         // t extends { [k: string]: any } ? UplcFor<> :
//         t extends Array<infer U> ? UplcFor<U, `${k}[]`>[] :
//         t extends Record<string, any> ? {
//             [ key in string & keyof t ] : UplcFor<t[key], `${k}.${key}`>
//         } :
//         never 


export type OnchainEnum<EnumName extends string> = {
    constrData: EnumName;
}

// in intemediate steps of bridging with on-chain data, where there is an 
// on-chain "Bridge" type with abstract Numeric<>s, we can benefit from
// conversion to some equivalate structural types.

// This one represents data that has been parsed FROM on-chain UPLC data.
export type adapterParsedOnchainData<t, k extends string> =
        t extends helios.MintingPolicyHash ? number[] : // !!! verify it's not a MPH
        t extends OnchainEnum<any> ? helios.ConstrData :
        t extends bigint ? bigint :
        t extends Numeric<any> ? bigint :
        t extends string ? number[] :  // !!! verify it's not a String
        t extends number ? `TYPE ERROR - use Numeric<> to define '${k}'` :
        t extends Array<infer U> ? adapterParsedOnchainData<U, `${k}[]`>[] :
        t extends Record<string, any> ? {
            [ 
                key in string & keyof t 
            ] : adapterParsedOnchainData<t[key], `${k}.${key}`>
        } :
        t extends unknown ? unknown :
        never;

/**
 * flags data types supporting abstract Numeric<"something"> types.  
 * {@link adapterParsedOnchainData} and {@link offchainDatumType} can 
 * be used to represent the same essential type in other forms for different 
 * purposes, mastered from the single "Chain Bridge" type.
 * 
 * Use Numeric<> to express all numerically-encoded data types, which 
 * will be represented as a BigInt (Plutus "Integer" on-chain), and some other
 * numeric-like form off-chain
 */
interface isChainTypeBridge { chainTypeBridge: true };

/**
 * Represents on-chain data types that have been converted (or, perhaps your code is 
* converting) from the {@link adapterParsedOnchainData} to be appropriate for 
* off-chain application use, but  that hasn't yet been adapted to an application-specific 
* class.  For an application not needing a special off-chain class, this form can be used 
* directly.  We'll probably have a converter that transforms the numerics from parsed
* to off-chain form, elimintating boilerplat for the simple cases.
*/
export type offchainDatumType<t, k extends string> =
        t extends helios.MintingPolicyHash ? helios.MintingPolicyHash :
        t extends OnchainEnum<any> ? string :
        t extends bigint ? bigint :
        t extends Numeric<any> ? inferOffchainNumericType<t> :
        t extends string ? string :
        t extends number ? `TYPE ERROR - use Numeric<> to define '${k}'` :
        t extends Array<infer U> ? offchainDatumType<U & isChainTypeBridge, `${k}[]`>[] :
        t extends Record<string, any> ? {
            [ key in string & keyof t ] : offchainDatumType<t[key], `${k}.${key}`>
        } :
        never;

export type Numeric<
    T extends "real" | "int" | "bigint" | "Date", 
    inferred = 
        T extends "real" ? number : 
        T extends "int" ? number : 
        T extends "bigint" ? bigint : 
        T extends "Date" ? Date : 
        never 
> = {
    number: inferred
} 
export type inferOffchainNumericType<T extends Numeric<any>> = T extends Numeric<any, infer N> ? N : never;

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
        raw: adapterParsedOnchainData<OnchainBridgeType, any>
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
