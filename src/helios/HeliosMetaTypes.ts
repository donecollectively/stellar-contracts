import type { DataType } from "@helios-lang/compiler";
import type { TxOutputId } from "@helios-lang/ledger";
import type {
    TypeSchema,
    VariantTypeSchema,
    EnumTypeSchema,
} from "@helios-lang/type-utils";
import type { UplcData } from "@helios-lang/uplc";
import type { isActivity, hasSeed, SeedAttrs } from "../ActivityTypes.js";
import type { CapoHeliosBundle } from "./scriptBundling/CapoHeliosBundle.js";
import type { hasSeedUtxo } from "../StellarTxnContext.js";
import type { DataBridge } from "./dataBridge/DataBridge.js";
import type { HeliosScriptBundle } from "./scriptBundling/HeliosScriptBundle.js";
import type { AbstractNew } from "./typeUtils.js";


export type HeliosBundleClass = AbstractNew<HeliosScriptBundle>
export type CapoBundleClass = AbstractNew<CapoHeliosBundle>
export type hasCapoBundle = { capoBundle: CapoHeliosBundle; };

export type TypeVariety = "canonical" | "permissive" | "ergonomic";
export type VariantFlavor = "tagOnly" | "fields" | "singletonField";
export type SpecialActivityFlags = "isSeededActivity" | "noSpecialFlags";

/**
 * Type of enum variant having no fields (only the variant-tag)
 * @public
 */
export type tagOnly = Record<string, never>;
/**
 * An empty object, satisfying the data-bridge for a tag-only enum variant having no fields.
 * @public
 */
export const tagOnly: tagOnly = Object.freeze({});
// external-facing types for reading and writing data for use in contract scripts.
// 1. create data for Datum or other non-Activity scenarios

export type uplcDataBridge<permissiveType> =
    // can be called
    ((arg: permissiveType) => UplcData) & DataBridge;
// 2. read data from Datum.  Can also be used for returned results
//  ... of utility functions defined in Helios code.

export type readsSomeUplcData<T> = T extends EnumTypeMeta<any, any>
    ? readsUplcEnumData<T>
    : readsUplcData<T>;

export type readsUplcEnumData<T extends EnumTypeMeta<any, any>> = {
    read(x: UplcData): T;
};

export type readsUplcData<canonicalType> = (x: UplcData) => canonicalType;

export type makesUplcActivityData<permissiveType> = (
    arg: permissiveType
) => isActivity & { redeemer: UplcData };

export type makesSomeActivityData<T> = T extends EnumTypeMeta<any, any>
    ? makesUplcActivityEnumData<any, any>
    : makesUplcActivityData<any>;
// export type AnyHeliosTypeInfo = TypeSchema | anyTypeDetails;

export type anyTypeDetails<T = undefined> = typeDetails<T> | enumTypeDetails<T>;
// creates smashed type of all possible variant-accessors of any signature.
// this brings together all the separate entries from separate union elements into a single type
// due to use of 'keyof'

export type expanded<T> = {
    [k in keyof T]: T[k];
};
// Utility types representing runtime information retrievable through the Helios APi
//   ... these are all ABOUT the types seen in the contract scripts

export type typeDetails<T = undefined> = {
    typeName?: string;
    typeSchema: TypeSchema;
    dataType: DataType;

    canonicalTypeName?: string; // type name (strict)
    ergoCanonicalTypeName?: string; // canonical type for ergonomic use
    permissiveTypeName?: string; // type name (permissive)

    canonicalType: string; // minimal canonical type (name if avaiable, or inline type as string)
    ergoCanonicalType: string; // minimal canonical type (name if avaiable, or inline type as string)
    permissiveType?: string; // minimal permissive type (name if available, or inline type as string)
    moreInfo: T;
};

export type variantTypeDetails<T = undefined> = {
    variantName: string;
    fieldCount: number;
    fields: Record<string, anyTypeDetails<T>>;
    typeSchema: VariantTypeSchema; // for consistency
    dataType: DataType;
    canonicalType: string; // minimal canonical type
    ergoCanonicalType: string; // minimal canonical type
    permissiveType: string; // minimal permissive type

    canonicalTypeName: string; // type name, always available
    ergoCanonicalTypeName: string; // canonical type for ergonomic use
    permissiveTypeName: string; // typ name, always available

    canonicalMetaType: string; // minimal canonical meta-type (singleEnumVariant<...>) string
    permissiveMetaType: string; // minimal permissive meta-type (singleEnumVariant<...>) string

    moreInfo: T;
};

export type enumTypeDetails<T = undefined> = {
    enumName: string;
    typeSchema: EnumTypeSchema; // for consistency
    dataType: DataType;

    canonicalTypeName: string; // type name for this enum
    ergoCanonicalTypeName: string; // type name for this enum (strict/enumLike form)
    permissiveTypeName: string; // type name for this enum (loose/enumLike form)

    canonicalType: string; // minimal canonical type
    ergoCanonicalType: string;
    permissiveType: string; // minimal permissive type

    variants: Record<string, variantTypeDetails<T>>;
    canonicalMetaType: string; // minimal canonical meta-type (EnumType<...>) string
    permissiveMetaType: string; // minimal permissive meta-type (EnumType<...>) string

    moreInfo: T;
};
// compile-time types for representing what is known about the types in the contract scripts
// created by the Stellar type-generator

export type VariantMap = {
    // Record<string, EnumVariant<any, any, any, any>>;
    [variantName: string]: singleEnumVariantMeta<any, any, any, any, any, any>;
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
 * @public
 */
export type EnumTypeMeta<
    EID extends EnumId,
    enumVariants extends VariantMap
> = {
    NEVER_INSTANTIATED: "?maybe?";
    SEE_BUNDLE_CLASS: "accessor gateway there";
    kind: "enum";
    enumId: EID;
    variants: {
        [k in keyof enumVariants]: enumVariants[k];
    };
};
/**
 * ### Don't use this type directly.
 *
 * This type is used as an intermediate representation of an enum variant,
 * for generating the types of utilities that read and write the enum data.
 * See the mkEnum<EnumType> factory function, the ‹tbd› reader function
 * and the ‹tbd› readable type
 * @public
 */
export type singleEnumVariantMeta<
    ET extends EnumTypeMeta<any, any>,
    VNAME extends keyof ET["variants"],
    variantConstr extends `Constr#${string}`,
    FLAVOR extends VariantFlavor,
    // variantArgs must be well specified for each variant
    variantArgs extends FLAVOR extends "tagOnly" ? tagOnly : any,
    specialFlags extends SpecialActivityFlags,
    EID extends EnumId = ET["enumId"]
> = {
    kind: "variant";
    enumId: EID;
    variantName: VNAME;
    // not needed in a data structure, but useful in the type params
    // ... for signature-expansion of the mkEnum type
    // flags: EachUnionElement<specialFlags>;
    variantKind: FLAVOR;
    constr: variantConstr;
    data: variantArgs;
    uplcData: UplcData;
};
// utility types for transforming an EnumType into interfaces for reading/writing data of that type
type anySingleEnumVariantMeta = singleEnumVariantMeta<
    any,
    any,
    any,
    any,
    any,
    any
>;
if (false) {
    type test = "x" | "y" extends "x" ? true : false; // false
    type test2 = "x" extends "x" | "y" ? true : false; // true
    const test2Value: test2 = true;

    const t: never extends "foo" ? true : false = true;
    const t2: "foo" extends never ? true : false = false;
}
type _expandInputFields<V extends anySingleEnumVariantMeta> = {
    [k in keyof V["data"]]: V["data"][k];
};
// -------------------- Non-Activity Variant Creator Types  --------------------
type _variantFieldArity<V extends anySingleEnumVariantMeta> = V["variantKind"];
// -------------------- Activity Variant Creator Types --------------------

export type anySeededActivity = singleEnumVariantMeta<
    any,
    any,
    any,
    any,
    { seed: TxOutputId | string },
    "isSeededActivity"
>;
type _singletonFieldActivityVariantCreator<
    V extends anySingleEnumVariantMeta,
    rawArgType = V["data"],
    RESULT_TYPE = EnumUplcActivityResult<V>,
    rawFuncType = (field: rawArgType) => RESULT_TYPE
> = V extends anySeededActivity
    ? (seedOrSeedArg: hasSeed | rawArgType) => RESULT_TYPE
    : rawFuncType;
type _multiFieldActivityVariantCreator<
    V extends anySingleEnumVariantMeta,
    RESULT_TYPE = EnumUplcActivityResult<V>,
    rawFuncType = (fields: _expandInputFields<V>) => RESULT_TYPE
> = V extends anySeededActivity
    ? makesMultiFieldSeededData<V, RESULT_TYPE>
    : rawFuncType;

export type ActivityEnumVariantCreator<
    VARIANT extends anySingleEnumVariantMeta,
    RESULT_TYPE = EnumUplcActivityResult<VARIANT>,
    ARITY = _variantFieldArity<VARIANT>
> = ARITY extends "tagOnly"
    ? RESULT_TYPE
    : ARITY extends "singletonField"
    ? VARIANT["data"] extends EnumTypeMeta<any, any>
        ? _noRedeemerWrappers<makesUplcActivityEnumData<VARIANT["data"]>>
        : _singletonFieldActivityVariantCreator<VARIANT>
    : ARITY extends "fields"
    ? _multiFieldActivityVariantCreator<VARIANT, RESULT_TYPE>
    : never;

export type _noRedeemerWrappers<T extends makesUplcActivityEnumData<any>> = {
    [k in keyof T]: _noRedeemerWrapper<T[k]>;
};

export type _noRedeemerWrapper<T> = T extends (...args: infer A) => {
    redeemer: infer R;
}
    ? (...args: A) => R
    : T;

export type EnumUplcActivityResult<
    V extends anySingleEnumVariantMeta,
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
    [k in keyof T]: T[k];
};
type _nonSeededFieldsType<V extends anySeededActivity> = remainingFields<{
    [k in Exclude<keyof V["data"], "seed">]: V["data"][k];
}>;

export type makesUplcActivityEnumData<
    ET extends EnumTypeMeta<any, any>,
    VARIANTS extends VariantMap = ET extends EnumTypeMeta<any, infer VARIANTS>
        ? VARIANTS
        : never
> = {
    [k in keyof VARIANTS]: ActivityEnumVariantCreator<VARIANTS[k]>;
};
/**
 * General type information for the datum and redeemer types in a helios script
 * bundle.  Not exactly the same as the types generated for api access
 * to on-chain data, but covering the same space.  Each enum variant
 * is separately typed, enabling the type-generation to be more precise
 * in creating ergonomic branded types for reading, detecting, and writing
 * each variant.
 */

export type HeliosBundleTypeDetails<T = undefined> = {
    datum?: typeDetails<T> | enumTypeDetails<T>;
    redeemer: typeDetails<T> | enumTypeDetails<T>;
};

export type HeliosBundleTypes = {
    datum?: DataType;
    redeemer: DataType;
};
export type Constructor<T> = new (...args: any[]) => T;
export type EmptyConstructor<T> = new () => T;
export type HeliosBundleClassWithCapo = typeof HeliosScriptBundle &
    //Constructor<HeliosScriptBundle> &
    EmptyConstructor<HeliosScriptBundle> & {
        capoBundle: CapoHeliosBundle;
        isConcrete: true;
    };
