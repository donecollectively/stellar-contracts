import type { UplcData } from "@helios-lang/uplc";
import { CachedHeliosProgram } from "./CachedHeliosProgram.js";
import type { HeliosModuleSrc } from "./HeliosModuleSrc.js";
import type { hasSeed, isActivity } from "../StellarContract.js";
import type {
    EnumTypeSchema,
    TypeSchema,
    VariantTypeSchema,
} from "@helios-lang/type-utils";
import type { DataType } from "@helios-lang/compiler/src/index.js";
import type { EachUnionElement } from "./typeUtils.js";
import { BundleTypeGenerator } from "./BundleTypeGenerator.js";
import { ActivityMaker, DataMaker } from "./dataBridge/dataMakers.js";
import { DataReader } from "./dataBridge/DataReader.js";
import type { TxOutputId } from "@helios-lang/ledger-babbage";
import type { hasSeedUtxo } from "../StellarTxnContext.js";
import type { SeedAttrs } from "../delegation/UutName.js";
import { someDataMaker } from "./dataBridge/someDataMaker.js";

export type HeliosBundleClass = new () => HeliosScriptBundle;

// external-facing types for reading and writing data for use in contract scripts.
// 1. create data for Datum or other non-Activity scenarios

export type makesSomeUplcData<T> = T extends EnumType<any, any>
    ? makesUplcEnumData<T>
    : uplcDataMaker<T>;

export type uplcDataMaker<permissiveType> =
    // can be called
    (
        (arg: permissiveType) => UplcData
    ) & someDataMaker

// 2. read data from Datum.  Can also be used for returned results
//  ... of utility functions defined in Helios code.
export type readsSomeUplcData<T> = T extends EnumType<any, any>
    ? readsUplcEnumData<T>
    : readsUplcData<T>;

export type readsUplcEnumData<T extends EnumType<any, any>> = {
    read(x: UplcData): T;
};

export type readsUplcData<canonicalType> = (x: UplcData) => canonicalType;

export type makesUplcActivityData<permissiveType> = // ... a function type
    (arg: permissiveType) => isActivity & { redeemer: UplcData };

export type makesSomeActivityData<T> = T extends EnumType<any, any>
    ? makesUplcActivityEnumData<any, any>
    : makesUplcActivityData<any>;

export type AnyHeliosTypeInfo = TypeSchema | anyTypeDetails;
export type anyTypeDetails = typeDetails | enumTypeDetails;

// creates smashed type of all possible variant-accessors of any signature.
// this brings together all the separate entries from separate union elements into a single type
// due to use of 'keyof'
export type expanded<T> = {
    [k in keyof T]: T[k];
};

// Utility types representing runtime information retrievable through the Helios APi
//   ... these are all ABOUT the types seen in the contract scripts, so they're a sort of meta-types
export type typeDetails = {
    typeName?: string;
    typeSchema: TypeSchema;
    dataType: DataType;
    canonicalType: string; // minimal canonical type
    permissiveType?: string; // minimal permissive type
};

export type variantTypeDetails = {
    variantName: string; // ??????????????????????
    fieldCount: number;
    fields: Record<string, anyTypeDetails>;
    typeSchema: VariantTypeSchema; // for consistency
    dataType: DataType;
    canonicalType: string; // minimal canonical type
    permissiveType: string; // minimal permissive type
};

export type enumTypeDetails = {
    enumName: string;
    typeSchema: EnumTypeSchema; // for consistency
    dataType: DataType;
    variants: Record<string, variantTypeDetails>;
    canonicalType: string; // minimal canonical type
    permissiveType: string; // minimal permissive type
};

// compile-time types for representing what is known about the types in the contract scripts
// created by the Stellar type-generator
export type VariantMap = {
    // Record<string, EnumVariant<any, any, any, any>>;
    [variantName: string]: singleEnumVariant<any, any, any, any, any, any>;
};

export type EnumId = {
    module: string;
    enumName: string;
};

/**
 * ### Don't use this type directly.
 *
 * This type is used as an intermediate representation of an enum,
 * for generating the types for reading and writing data conforming to the type.
 */
export type EnumType<EID extends EnumId, enumVariants extends VariantMap> = {
    NEVER_INSTANTIATED: "?maybe?";
    SEE_BUNDLE_CLASS: "accessor gateway there";
    kind: "enum";
    enumId: EID;
    variants: {
        [k in keyof enumVariants]: enumVariants[k];
    };
};

type VariantVariety = "tagOnly" | "fields" | "singletonField";
type SpecialActivityFlags = "isSeededActivity" | "noSpecialFlags";
/**
 * ### Don't use this type directly.
 *
 * This type is used as an intermediate representation of an enum variant,
 * for generating the types of utilities that read and write the enum data.
 * See the mkEnum<EnumType> factory function, the ‹tbd› reader function
 * and the ‹tbd› readable type
 */
export type singleEnumVariant<
    ET extends EnumType<any, any>,
    VNAME extends keyof ET["variants"],
    variantConstr extends `Constr#${string}`,
    variety extends VariantVariety,
    // variantArgs must be well specified for each variant
    variantArgs extends variety extends "tagOnly" ? never : any,
    specialFlags extends SpecialActivityFlags,
    EID extends EnumId = ET["enumId"]
> = {
    kind: "variant";
    enumId: EID;
    variantName: VNAME;
    // not needed in a data structure, but useful in the type params
    // ... for signature-expansion of the mkEnum type
    // flags: EachUnionElement<specialFlags>;
    variantKind: variety;
    constr: variantConstr;
    data: variantArgs;
    uplcData: UplcData;
};

// utility types for transforming an EnumType into interfaces for reading/writing data of that type

type anySingleEnumVariant = singleEnumVariant<any, any, any, any, any, any>;

if (false) {
    type test = "x" | "y" extends "x" ? true : false; // false
    type test2 = "x" extends "x" | "y" ? true : false; // true
    const test2Value: test2 = true;

    const t: never extends "foo" ? true : false = true;
    const t2: "foo" extends never ? true : false = false;
}

type _expandInputFields<V extends anySingleEnumVariant> = {
    [k in keyof V["data"]]: V["data"][k];
};

// -------------------- Non-Activity Variant Creator Types  --------------------

export type EnumUplcResult<
    V extends anySingleEnumVariant,
    hasData = {
        uplcData: V["uplcData"];
        variantName: V["variantName"];
        enumId: V["enumId"];
    }
> = hasData;

export type makesUplcEnumData<
    ET extends EnumType<any, any>,
    VARIANTS extends VariantMap = ET extends EnumType<any, infer VARIANTS>
        ? VARIANTS
        : never
> = someDataMaker &{
    // prettier-ignore
    [k in keyof VARIANTS]: EnumVariantCreator<VARIANTS[k]>
};

type _singletonFieldVariantCreator<
    V extends anySingleEnumVariant,
    rawArgType = V["data"],
    RESULT_TYPE = EnumUplcResult<V>,
    //rawArgType
    rawFuncType = (field: V["data"]) => RESULT_TYPE
> = rawFuncType;

type _multiFieldVariantCreator<
    V extends anySingleEnumVariant,
    RESULT_TYPE = EnumUplcResult<V>,
    rawFuncType = (fields: _expandInputFields<V>) => RESULT_TYPE
> = rawFuncType;

export type EnumVariantCreator<
    VARIANT extends anySingleEnumVariant,
    RESULT_TYPE = EnumUplcResult<VARIANT>,
    ARITY = _variantFieldArity<VARIANT>
> = ARITY extends "tagOnly"
    ? // is a simple getter, no function call needed
      RESULT_TYPE
    : ARITY extends "singletonField"
    ? VARIANT["data"] extends EnumType<any, any>
    ? makesUplcEnumData<VARIANT["data"]>
    : _singletonFieldVariantCreator<VARIANT>
    : ARITY extends "fields"
    ? _multiFieldVariantCreator<VARIANT, RESULT_TYPE>
    : never;

type _variantFieldArity<V extends anySingleEnumVariant> = V["variantKind"];

// -------------------- Activity Variant Creator Types --------------------

export type anySeededActivity = singleEnumVariant<
    any,
    any,
    any,
    any,
    { seed: TxOutputId | string },
    "isSeededActivity"
>;

type _singletonFieldActivityVariantCreator<
    V extends anySingleEnumVariant,
    rawArgType = V["data"],
    RESULT_TYPE = EnumUplcActivityResult<V>,
    rawFuncType = (field: rawArgType) => RESULT_TYPE
> = V extends anySeededActivity
    ? (seedOrSeedArg: hasSeed | rawArgType) => RESULT_TYPE
    : rawFuncType;

type _multiFieldActivityVariantCreator<
    V extends anySingleEnumVariant,
    RESULT_TYPE = EnumUplcActivityResult<V>,
    rawFuncType = (
        fields: // V["data"]
        _expandInputFields<V>
    ) => RESULT_TYPE
> = V extends anySeededActivity
    ? makesMultiFieldSeededData<V, RESULT_TYPE>
    : rawFuncType;

export type ActivityEnumVariantCreator<
    VARIANT extends anySingleEnumVariant,
    RESULT_TYPE = EnumUplcActivityResult<VARIANT>,
    ARITY = _variantFieldArity<VARIANT>
> = ARITY extends "tagOnly"
    ? // is a simple getter, no function call needed
      RESULT_TYPE
    : ARITY extends "singletonField"
    ? VARIANT["data"] extends EnumType<any, any>
        ? _noRedeemerWrappers<makesUplcActivityEnumData<VARIANT["data"]>>
        : _singletonFieldActivityVariantCreator<VARIANT>
    : ARITY extends "fields"
    ? _multiFieldActivityVariantCreator<VARIANT, RESULT_TYPE>
    : never;

export type _noRedeemerWrappers<T extends makesUplcActivityEnumData<any>> = {
    [k in keyof T]: _noRedeemerWrapper<T[k]>; 
}

export type _noRedeemerWrapper<T> = T extends (...args: infer A) => {redeemer: infer R} ? (...args: A) => R : T;

export type EnumUplcActivityResult<
    V extends anySingleEnumVariant,
    hasData = {
        uplcData: V["uplcData"];
        variantName: V["variantName"];
        enumId: V["enumId"];
    }
> = { redeemer: hasData };

// utilities for representing an enum variant-creator having a seed, with 2 possible signatures
type makesMultiFieldSeededData<V extends anySeededActivity, RESULT_TYPE> = (
    ...args: [hasSeedUtxo | SeedAttrs, _nonSeededFieldsType<V>] | [V["data"]]
) => RESULT_TYPE;

type remainingFields<T> = {
    // same as expanded<T>
    [k in keyof T]: T[k];
};

type _nonSeededFieldsType<V extends anySeededActivity> = remainingFields<{
    [k in Exclude<keyof V["data"], "seed">]: V["data"][k];
}>;

export type makesUplcActivityEnumData<
    ET extends EnumType<any, any>,
    VARIANTS extends VariantMap = ET extends EnumType<any, infer VARIANTS>
        ? VARIANTS
        : never
> = {
        // prettier-ignore
        [k in keyof VARIANTS]: ActivityEnumVariantCreator<VARIANTS[k]>
            };

/**
 * General type information for the datum and redeemer types in a helios script
 * bundle.  Not exactly the same as the types generated for api access
 * to on-chain data, but covering the same space.  Each enum variant
 * is separately typed, enabling the type-generation to be more precise
 * in creating ergonomic branded types for reading, detecting, and writing
 * each variant.
 */
export type HeliosBundleTypeDetails = {
    datum: Option<typeDetails | enumTypeDetails>;
    redeemer: typeDetails | enumTypeDetails;
};

export type HeliosBundleTypes = {
    datum: Option<DataType>;
    redeemer: DataType;
};

export abstract class HeliosScriptBundle {
    // these are the most abstract possible forms of the proxies for these 3 types
    // specific subclasses will use some much more specific types for them instead
    declare Activity: makesSomeActivityData<any>;
    declare mkDatum: Option<makesSomeUplcData<any>>;
    declare readDatum: Option<readsSomeUplcData<any>>;

    /**
     * optional attribute explicitly naming a type for the datum
     * @remarks
     * This can be used if needed for a contract whose entry point uses an abstract
     * type for the datum; the type-bridge & type-gen system will use this data type
     * instead of inferrring the type from the entry point.
     */
    datumTypeName?: string;

    /**
     * optional attribute explicitly naming a type for the redeemer
     * @remarks
     * This can be used if needed for a contract whose entry point uses an abstract
     * type for the redeemer; the type-bridge & type-gen system will use this data type
     * instead of inferring the type from the entry point.
     */
    redeemerTypeName?: string;

    abstract get main(): HeliosModuleSrc;
    abstract get modules(): HeliosModuleSrc[];

    get program(): CachedHeliosProgram {
        return CachedHeliosProgram.forCurrentPlatform(this.main, {
            moduleSources: this.modules,
        });
    }

    addTypeProxies() {
        const typeGenerator = new BundleTypeGenerator(this);
        const { activityTypeDetails, datumTypeDetails } = typeGenerator;

        this.Activity = new ActivityMaker(activityTypeDetails);
        if (datumTypeDetails) {
            this.mkDatum = new DataMaker(datumTypeDetails);
            this.readDatum = new DataReader(datumTypeDetails);
        }
    }


    locateDatumType(): Option<DataType> {
        let datumType: DataType | undefined;
        // let datumTypeName: string | undefined;

        const program = this.program;
        const programName = program.name;
        const argTypes = program.entryPoint.mainArgTypes;
        const argCount = argTypes.length;
        if (argCount === 2) {
            datumType = argTypes[0];
            // datumTypeName = argTypes[0].name;
        }

        if (this.datumTypeName) {
            datumType =
                program.entryPoint.userTypes[programName][this.datumTypeName];
            if (!datumType) {
                throw new Error(
                    `${this.constructor.name}.datumTypeName=\`${this.datumTypeName}\` not found in userTypes of script program ${programName}`
                );
            }
        }

        return datumType;
    }

    locateRedeemerType(): DataType {
        const program = this.program;
        const argTypes = program.entryPoint.mainArgTypes;
        const argCount = argTypes.length;

        let redeemerType: DataType;
        if (argCount === 2) {
            redeemerType = argTypes[1];
        } else {
            redeemerType = argTypes[0];
        }

        if (this.redeemerTypeName) {
            const programName = program.name;
            redeemerType =
                program.entryPoint.userTypes[programName][
                    this.redeemerTypeName
                ];
            if (!redeemerType) {
                throw new Error(
                    `${this.constructor.name}.redeemerTypeName=\`${this.redeemerTypeName}\` not found in userTypes of script program ${programName}`
                );
            }
        }

        return redeemerType;
    }

    getTopLevelTypes(): HeliosBundleTypes {
        return {
            datum: this.locateDatumType(),
            redeemer: this.locateRedeemerType(),
        };
    }
}
