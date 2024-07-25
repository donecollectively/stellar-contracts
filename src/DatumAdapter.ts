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

// in both cases, you may need to define fromOnchainDatum() to convert data from
// its "parsed, but may not be ready to use" form
// into its UI-application-adapted form.  The DatumAdapter then collaborates with your
// Capo and other contracts when you readDatum()
//
//Specifically, calls to readDatum(datumAdapter) will trigger the transformation of
//  on-chain data to the application's preferred form, and the
// result of readDatum() is ready to use, with class methods if you've defined
// your appType in that way..
//
// Use the datum adapter's toOnchainDatum() method directly, to convert the
// application-type data into the on-chain form, for use in transactions.  Typically,
// this will happen in a mkDatum... function defined in the typescript wrapper for
// the contract script.

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

export type OnchainEnum<EnumName extends string, innerDetailsType=undefined> = {
    constrData: EnumName;
    innerDetails: innerDetailsType;
};

export type RawBytes<offchainType> = {
    repr?: offchainType;
    rawBytes: number[];
};

// in intemediate steps of bridging with on-chain data, where there is an
// on-chain "Bridge" type with abstract Numeric<>s, we can benefit from
// conversion to some equivalate structural types.

// This one represents data that has been parsed FROM on-chain UPLC data.
export type adapterParsedOnchainData<
    t,
    k extends string
> = t extends helios.MintingPolicyHash
    ? number[] // !!! verify it's not a MPH
    : t extends helios.Value
    ? Record<string, Record<string, bigint>>
    : t extends OnchainEnum<any, undefined>
    ? helios.ConstrData
    : t extends OnchainEnum<any, infer NESTED_STRUCT>
    ? adapterParsedOnchainData<NESTED_STRUCT, k>
    : t extends RawBytes<any>
    ? number[]
    : t extends bigint
    ? bigint
    : t extends Numeric<any>
    ? bigint
    : t extends string
    ? number[] // !!! verify it's not a String
    : t extends number
    ? `TYPE ERROR - use Numeric<> to define '${k}'`
    : t extends Array<infer U>
    ? adapterParsedOnchainData<U, `${k}[]`>[]
    : t extends Record<string, any>
    ? {
          [key in string & keyof t]: adapterParsedOnchainData<
              t[key],
              `${k}.${key}`
          >;
      }
    : t extends unknown
    ? unknown
    : never;

/**
 * flags data types supporting abstract Numeric<"something"> types.
 * {@link adapterParsedOnchainData} and {@link offchainDatumType} can
 * be used to represent the same essential type in other forms for different
 * purposes, mastered from the single "Chain Bridge" type.
 *
 * Use Numeric<> to express all numerically-encoded data types, which
 * will be represented as a BigInt (Plutus "Integer" on-chain), and an indicated other
 * numeric-like form off-chain
 */
interface isChainTypeBridge {
    chainTypeBridge: true;
}

/**
 * Represents on-chain data types that have been converted (or, perhaps your code is
 * converting) from the {@link adapterParsedOnchainData} to be appropriate for
 * off-chain application use, but  that hasn't yet been adapted to an application-specific
 * class.  For an application not needing a special off-chain class, this form can be used
 * directly.  We'll probably have a converter that transforms the numerics from parsed
 * to off-chain form, elimintating boilerplat for the simple cases.
 */
export type offchainDatumType<
    t,
    k extends string
> = t extends helios.MintingPolicyHash
    ? helios.MintingPolicyHash
    : t extends helios.Value
    ? helios.Value
    : t extends OnchainEnum<any>
    ? string
    : t extends RawBytes<infer reprType>
    ? reprType
    : t extends bigint
    ? bigint
    : t extends Numeric<any>
    ? inferOffchainNumericType<t>
    : t extends string
    ? string
    : t extends number
    ? `TYPE ERROR - use Numeric<> to define '${k}'`
    : t extends Array<infer U>
    ? offchainDatumType<U & isChainTypeBridge, `${k}[]`>[]
    : t extends Record<string, any>
    ? {
          [key in string & keyof t]: offchainDatumType<t[key], `${k}.${key}`>;
      }
    : never;

export type Numeric<
    T extends "real" | "int" | "bigint" | "Time" | "Duration",
    inferred = T extends "real"
        ? number
        : T extends "int"
        ? number
        : T extends "bigint"
        ? bigint
        : T extends "Time"
        ? Date
        : T extends "Duration"
        ? number
        : never
> = {
    number: inferred;
};

export type inferOffchainNumericType<T extends Numeric<any>> =
    T extends Numeric<any, infer N> ? N : never;

/**
 * Provides transformations of data between preferred application types and on-chain data types
 * @remarks
 *
 * This class is intended to be subclassed for each specific data type used StellarContracts class
 *
 * The toOnchainDatum method should be implemented to convert application data to UPLC form for on-chain use.
 *
 * The fromOnchainDatum method should be implemented to convert deserialized on-chain data to the application type,
 *
 * A subclass can use the contract class from the constructor to access helper methods, on-chain types,  etc,
 *  via `this.strella`.  That subclass can choose a convention where that strella is either a Capo or another StellarContract
 * class, including a Capo delegate.  When the subclass is a Capo or a Capo delegate, `this.capo` will be available to access
 * that class, either directly or via a delegate's capo.
 *
 * @typeParam appType - high-level preferred application type for the data; may be a class having various methods
 * @typeParam OnchainBridgeType - the on-chain data type, as deserialized from the contract
 * @typeParam contractType - the specific contract class that uses this data type
 * @public
 **/
export abstract class DatumAdapter<appType, OnchainBridgeType> {
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
            `not a capo instance or delegate: ${this.strella.constructor.name}`
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

    fromUplcValue(valueInfo: Record<string, Record<string, bigint>>) {
        return new helios.Value(
            0n,
            Object.entries(valueInfo).map(([mph, tokenMap]) => [
                mph,
                Object.entries(tokenMap).map(
                    ([tokenName, tokenCount]) =>
                        [helios.textToBytes(tokenName), tokenCount] as [
                            number[],
                            bigint
                        ]
                ),
            ])
        );
    }

    fromUplcTime(millis: number | bigint) {
        return new Date(Number(millis));
    }

    fromUplcEnum(enumName: string, member: helios.ConstrData) {
        const stateVariant = this.getEnumMember(enumName, member);

        // NOTE: a stateVariant has these details:
        // #constrIndex : 0
        // #dataDef : DataDefinition
        // #parent : EnumStatement
        // constrIndex : (...)
        // name: Word
        // dataDefinition : DataDefinition
        //    #fields : Array(0)
        //    #name : Word
        //    #site : Site
        //    fieldNames : (...)
        //    fields : Array(0)
        //    nFields : (...)
        //    name : (...)
        //    site : (...)

        const variantName = stateVariant.name.toString();
        // handle enums having internal fields
        if (stateVariant.dataDefinition.nFields > 0) {
            const fieldNames = stateVariant.dataDefinition.fieldNames;
            return {
                [variantName]: Object.fromEntries(
                    fieldNames.map((fieldName, i) => {
                        const field = stateVariant[fieldName];
                        return [fieldName, field];
                    })
                ),
            };
        } else {
            return variantName;
        }
    }


    uplcEnumMember(enumName: string, member: string, ...args: any[]) {
        const stateVariant = this.getEnumMember(enumName, member);

        const varSt = stateVariant.prototype._enumVariantStatement;
        const def = varSt.dataDefinition

        if (args.every(x => x instanceof helios.UplcData)) {
            // the data is already encoded as UplcData, so we can simply
            // wrap it in a ConstrData with the correct index
            return new helios.ConstrData(varSt.constrIndex, args);
        }

        return new stateVariant(...args)._toUplcData();
    }

    getEnumMember(
        enumName: string,
        enumVariant: string | number | helios.ConstrData
    ) {
        const enumDef = this.onChainTypes[enumName];
        if (!enumDef) {
            throw new Error(
                `${this.constructor.name}: Enum ${enumName} not found in onChainTypes` +
                    `\n   ... try one of: (${Object.keys(
                        this.onChainTypes
                    ).join(", ")})` +
                    `\n   (from ${
                        this.strella.compiledScript.properties.name
                    } in ${
                        //@ts-expect-error
                        this.strella.contractSource.srcFile || "‹unk srcFile›"
                    })`
            );
        }
        var foundVariant;
        if ("string" == typeof enumVariant) {
            foundVariant = enumDef[enumVariant];
        } else {
            const index =
                "number" == typeof enumVariant
                    ? enumVariant
                    : enumVariant instanceof helios.ConstrData
                    ? //@ts-expect-error ConstrData really does have an .index - !!!
                      enumVariant.index
                    : -1;

            foundVariant =
                enumDef.prototype._enumStatement.getEnumMember(index);
        }
        if (!foundVariant) {
            let more = "";
            if (enumVariant instanceof helios.ConstrData) {
                //x@ts-expect-error
                more = ` (from ConstrData ${foundVariant.index})`;
            }

            throw new Error(
                `Enum ${enumName} has no variant ${enumVariant} ${more}`
            );
        }
        return foundVariant;
    }

    get fromUplc() {
        return {
            Str: this.fromUplcString.bind(this),
            Real: this.fromUplcReal.bind(this),
            Time: this.fromUplcTime.bind(this),
            Value: this.fromUplcValue.bind(this),
            Enum: this.fromUplcEnum.bind(this),
        };
    }

    uplcReal(n: number): IntData {
        // supports fractional inputs (they can always be represented as a BigInt, with sufficient precision)
        // note: don't expect very very small numbers to be accurately represented
        const microInt1 = Math.trunc( Number(n) * 1_000_000 + 0.1 )
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

    uplcTime(x: Date) {
        return this.uplcInt(x.getTime());
    }

    uplcValue(x: helios.Value) {
        return x._toUplcData();
    }

    /**
     * Formats a supported input value as raw bytes matching its on-chain representation
     */
    uplcBytes(x: number[]) {
        return new ByteArrayData(x);
    }

    uplcMph(x: helios.MintingPolicyHash) {
        return this.uplcBytes(x.bytes);
    }

    wrapCIP68(enumVariant: any, d: MapData | ConstrData): UplcData & ConstrData;
    wrapCIP68(d: MapData): UplcData & ConstrData;
    wrapCIP68(dOrV: MapData | any, d?: MapData | ConstrData): UplcData & ConstrData {
        let index = 242; // abstract CIP-68 wrapper
        let mapData: MapData | ConstrData;
        if (!d) {
            mapData = dOrV;
        } else {
            mapData = d;
            index = "number" == typeof dOrV ? dOrV : dOrV.prototype._enumVariantStatement.constrIndex;
        }
        // console.log("creating CIP68 struct with index ", index, mapData);
        // debugger
        return new ConstrData(index, [
            mapData,  
            // this.uplcInt(2n),
            // this.uplcInt(0n),
        ]);
    }

    uplcTaggedStruct(k: Record<string, UplcData>) : UplcData & ConstrData {
        return this.wrapCIP68(this.toMapData(k));
    }

    toMapData(
        k: Record<string, any>,
        transformer?: (n: any) => UplcData
    ): MapData;
    toMapData(k: Record<string, UplcData> | Record<string, any>): MapData;
    toMapData(
        k: Record<string, UplcData> | Record<string, any>,
        transformer?: (n: any) => UplcData
    ): MapData {
        const t = new MapData(
            Object.entries(k).map(([key, value]) => {
                const keyBytes = new ByteArrayData(textToBytes(key));
                const uplcValue = transformer ? transformer(value) : value;
                if (!uplcValue?.memSize || Number.isNaN(uplcValue?.memSize)) {
                    console.log(
                        "  ⚠️ ⚠️ ⚠️  toMapData: bad UplcData value - must have numeric memSize",
                        key,
                        value
                    );
                    if (uplcValue?._toUplcData) {
                        debugger;
                        throw new Error(
                            `toMapData(): key ${key} not converted to uplc - try _toUplcData()`
                        );
                    }
                    throw new Error(
                        `toMapData(): key ${key} not converted to uplc`
                    );
                }
                return [keyBytes, uplcValue] as [UplcData, UplcData];
            })
        );
        return t;
    }

    fromOnchainIntMap<KEYS extends string>(
        data: Record<KEYS, BigInt>,
        transformer: (x: bigint) => number
    ) {
        return Object.fromEntries(
            (Object.entries(data) as [string, bigint][]).map(
                ([k, v]: [string, bigint]) => [k, transformer(v)]
            )
        ) as Record<KEYS, number>;
    }

    fromUplcReal(x: bigint | number) {
        return Number(x) / 1_000_000;
    }

    fromUplcString(x: number[]) {
        return helios.bytesToText(x);
    }
}
