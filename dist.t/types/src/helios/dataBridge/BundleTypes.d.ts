import type { HeliosScriptBundle } from "../scriptBundling/HeliosScriptBundle.js";
import type { anyTypeDetails, EnumId, enumTypeDetails, HeliosBundleTypeDetails, HeliosBundleTypes, typeDetails, TypeVariety, VariantFlavor, variantTypeDetails } from "../HeliosMetaTypes.js";
import type { EnumTypeSchema, VariantTypeSchema, TypeSchema } from "@helios-lang/type-utils";
import type { DataType, EnumMemberType } from "@helios-lang/compiler";
export interface TypeGenHooks<T> {
    registerNamedType?(details: anyTypeDetails): void;
    getMoreEnumInfo?(details: enumTypeDetails): T;
    getMoreStructInfo?(details: typeDetails): T;
    getMoreVariantInfo?(details: variantTypeDetails): T;
    getMoreTypeInfo?(details: typeDetails): T;
}
/**
 * Gathers any number of types expressible for an on-chain Helios script,
 * and generates types and type aliases for the off-chain TypeScript context.
 *
 * Each struct type is directly expressed as its name
 * Each enum type is expressed as a proxy type, unioned with the possible raw enum variants for that type
 * As each type is encountered (as a **nested field** within a datum or redeemer), any named types encountered
 * are added to the context, with any recursive expansions generated and added to the context, depth-first,
 * ... then the named type is used for the **nested field** where it was encountered.
 */
export declare class BundleTypes implements TypeGenHooks<undefined> {
    bundle: HeliosScriptBundle;
    collaborator?: TypeGenHooks<any> | undefined;
    topLevelTypeDetails: HeliosBundleTypeDetails;
    topLevelDataTypes: HeliosBundleTypes;
    namedTypes: Record<string, anyTypeDetails>;
    constructor(bundle: HeliosScriptBundle, collaborator?: TypeGenHooks<any> | undefined);
    get activityTypeDetails(): anyTypeDetails;
    get datumTypeDetails(): anyTypeDetails | undefined;
    gatherTopLevelTypeDetails(dataTypes: HeliosBundleTypes): HeliosBundleTypeDetails;
    gatherTypeDetails(type: DataType, useTypeNamesAt?: "nestedField"): anyTypeDetails;
    /**
     * type-gen interface: registers a named type in the context
     */
    registerNamedType(details: anyTypeDetails): void;
    private extractModuleName;
    private extractVariantParentName;
    gatherOtherTypeDetails(dataType: DataType, useTypeNamesAt?: "nestedField"): typeDetails;
    gatherEnumDetails(enumType: {
        toSchema(): EnumTypeSchema;
    } & DataType, useTypeNamesAt?: "nestedField"): enumTypeDetails;
    gatherVariantDetails(variantDataType: {
        toSchema(): VariantTypeSchema;
    } & EnumMemberType, enumId: EnumId): variantTypeDetails;
    mkMinimalType(typeVariety: TypeVariety, schema: TypeSchema, useTypeNamesAt?: "nestedField", parentName?: string): string;
    mkMinimalEnumMetaType(typeVariety: TypeVariety, schema: EnumTypeSchema): string;
    mkMinimalVariantMetaType(typeVariety: TypeVariety, schema: VariantTypeSchema, enumId: EnumId): string;
    variantFlavor(schema: VariantTypeSchema): VariantFlavor;
    private mkMinimalVariantType;
}
//# sourceMappingURL=BundleTypes.d.ts.map