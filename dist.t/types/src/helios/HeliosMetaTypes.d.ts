import type { DataType } from "@helios-lang/compiler";
import type { TxOutputId } from "@helios-lang/ledger";
import type { TypeSchema, VariantTypeSchema, EnumTypeSchema } from "@helios-lang/type-utils";
import type { UplcData } from "@helios-lang/uplc";
import type { isActivity, hasSeed, SeedAttrs } from "../ActivityTypes.js";
import type { CapoHeliosBundle } from "./scriptBundling/CapoHeliosBundle.js";
import type { hasSeedUtxo } from "../StellarTxnContext.js";
import type { DataBridge } from "./dataBridge/DataBridge.js";
import type { HeliosScriptBundle } from "./scriptBundling/HeliosScriptBundle.js";
import type { AbstractNew } from "./typeUtils.js";
export type HeliosBundleClass = AbstractNew<HeliosScriptBundle>;
export type CapoBundleClass = AbstractNew<CapoHeliosBundle>;
export type hasCapoBundle = {
    capoBundle: CapoHeliosBundle;
};
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
export declare const tagOnly: tagOnly;
export type uplcDataBridge<permissiveType> = ((arg: permissiveType) => UplcData) & DataBridge;
export type readsSomeUplcData<T> = T extends EnumTypeMeta<any, any> ? readsUplcEnumData<T> : readsUplcData<T>;
export type readsUplcEnumData<T extends EnumTypeMeta<any, any>> = {
    read(x: UplcData): T;
};
export type readsUplcData<canonicalType> = (x: UplcData) => canonicalType;
export type makesUplcActivityData<permissiveType> = (arg: permissiveType) => isActivity & {
    redeemer: UplcData;
};
export type makesSomeActivityData<T> = T extends EnumTypeMeta<any, any> ? makesUplcActivityEnumData<any, any> : makesUplcActivityData<any>;
export type anyTypeDetails<T = undefined> = typeDetails<T> | enumTypeDetails<T>;
export type expanded<T> = {
    [k in keyof T]: T[k];
};
export type typeDetails<T = undefined> = {
    typeName?: string;
    typeSchema: TypeSchema;
    dataType: DataType;
    canonicalTypeName?: string;
    ergoCanonicalTypeName?: string;
    permissiveTypeName?: string;
    canonicalType: string;
    ergoCanonicalType: string;
    permissiveType?: string;
    moreInfo: T;
};
export type variantTypeDetails<T = undefined> = {
    variantName: string;
    fieldCount: number;
    fields: Record<string, anyTypeDetails<T>>;
    typeSchema: VariantTypeSchema;
    dataType: DataType;
    canonicalType: string;
    ergoCanonicalType: string;
    permissiveType: string;
    canonicalTypeName: string;
    ergoCanonicalTypeName: string;
    permissiveTypeName: string;
    canonicalMetaType: string;
    permissiveMetaType: string;
    moreInfo: T;
};
export type enumTypeDetails<T = undefined> = {
    enumName: string;
    typeSchema: EnumTypeSchema;
    dataType: DataType;
    canonicalTypeName: string;
    ergoCanonicalTypeName: string;
    permissiveTypeName: string;
    canonicalType: string;
    ergoCanonicalType: string;
    permissiveType: string;
    variants: Record<string, variantTypeDetails<T>>;
    canonicalMetaType: string;
    permissiveMetaType: string;
    moreInfo: T;
};
export type VariantMap = {
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
export type EnumTypeMeta<EID extends EnumId, enumVariants extends VariantMap> = {
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
export type singleEnumVariantMeta<ET extends EnumTypeMeta<any, any>, VNAME extends keyof ET["variants"], variantConstr extends `Constr#${string}`, FLAVOR extends VariantFlavor, variantArgs extends FLAVOR extends "tagOnly" ? tagOnly : any, specialFlags extends SpecialActivityFlags, EID extends EnumId = ET["enumId"]> = {
    kind: "variant";
    enumId: EID;
    variantName: VNAME;
    variantKind: FLAVOR;
    constr: variantConstr;
    data: variantArgs;
    uplcData: UplcData;
};
type anySingleEnumVariantMeta = singleEnumVariantMeta<any, any, any, any, any, any>;
type _expandInputFields<V extends anySingleEnumVariantMeta> = {
    [k in keyof V["data"]]: V["data"][k];
};
type _variantFieldArity<V extends anySingleEnumVariantMeta> = V["variantKind"];
export type anySeededActivity = singleEnumVariantMeta<any, any, any, any, {
    seed: TxOutputId | string;
}, "isSeededActivity">;
type _singletonFieldActivityVariantCreator<V extends anySingleEnumVariantMeta, rawArgType = V["data"], RESULT_TYPE = EnumUplcActivityResult<V>, rawFuncType = (field: rawArgType) => RESULT_TYPE> = V extends anySeededActivity ? (seedOrSeedArg: hasSeed | rawArgType) => RESULT_TYPE : rawFuncType;
type _multiFieldActivityVariantCreator<V extends anySingleEnumVariantMeta, RESULT_TYPE = EnumUplcActivityResult<V>, rawFuncType = (fields: _expandInputFields<V>) => RESULT_TYPE> = V extends anySeededActivity ? makesMultiFieldSeededData<V, RESULT_TYPE> : rawFuncType;
export type ActivityEnumVariantCreator<VARIANT extends anySingleEnumVariantMeta, RESULT_TYPE = EnumUplcActivityResult<VARIANT>, ARITY = _variantFieldArity<VARIANT>> = ARITY extends "tagOnly" ? RESULT_TYPE : ARITY extends "singletonField" ? VARIANT["data"] extends EnumTypeMeta<any, any> ? _noRedeemerWrappers<makesUplcActivityEnumData<VARIANT["data"]>> : _singletonFieldActivityVariantCreator<VARIANT> : ARITY extends "fields" ? _multiFieldActivityVariantCreator<VARIANT, RESULT_TYPE> : never;
export type _noRedeemerWrappers<T extends makesUplcActivityEnumData<any>> = {
    [k in keyof T]: _noRedeemerWrapper<T[k]>;
};
export type _noRedeemerWrapper<T> = T extends (...args: infer A) => {
    redeemer: infer R;
} ? (...args: A) => R : T;
export type EnumUplcActivityResult<V extends anySingleEnumVariantMeta, hasData = {
    uplcData: V["uplcData"];
    variantName: V["variantName"];
    enumId: V["enumId"];
}> = {
    redeemer: hasData;
};
type makesMultiFieldSeededData<V extends anySeededActivity, RESULT_TYPE> = (...args: [hasSeedUtxo | SeedAttrs, _nonSeededFieldsType<V>] | [V["data"]]) => RESULT_TYPE;
type remainingFields<T> = {
    [k in keyof T]: T[k];
};
type _nonSeededFieldsType<V extends anySeededActivity> = remainingFields<{
    [k in Exclude<keyof V["data"], "seed">]: V["data"][k];
}>;
export type makesUplcActivityEnumData<ET extends EnumTypeMeta<any, any>, VARIANTS extends VariantMap = ET extends EnumTypeMeta<any, infer VARIANTS> ? VARIANTS : never> = {
    [k in keyof VARIANTS]: ActivityEnumVariantCreator<VARIANTS[k]>;
};
/**
 * General type information for the datum and redeemer types in a helios script
 * bundle.  Not exactly the same as the types generated for api access
 * to on-chain data, but covering the same space.  Each enum variant
 * is separately typed, enabling the type-generation to be more precise
 * in creating ergonomic branded types for reading, detecting, and writing
 * each variant.
 * @public
 */
export type HeliosBundleTypeDetails<T = undefined> = {
    datum?: typeDetails<T> | enumTypeDetails<T>;
    redeemer: typeDetails<T> | enumTypeDetails<T>;
};
/**
 * @public
 */
export type HeliosBundleTypes = {
    datum?: DataType;
    redeemer: DataType;
};
export type Constructor<T> = new (...args: any[]) => T;
export type EmptyConstructor<T> = new () => T;
/**
 * @public
 */
export type HeliosBundleClassWithCapo = typeof HeliosScriptBundle & EmptyConstructor<HeliosScriptBundle> & {
    capoBundle: CapoHeliosBundle;
    isConcrete: true;
};
export {};
//# sourceMappingURL=HeliosMetaTypes.d.ts.map