import { type TypeGenHooks } from "./BundleTypes.js";
import type { anyTypeDetails, enumTypeDetails, typeDetails, variantTypeDetails } from "../HeliosMetaTypes.js";
import type { TypeSchema } from "@helios-lang/type-utils";
import { BundleBasedGenerator } from "./BundleBasedGenerator.js";
type dataBridgeTypeInfo = {
    accessorCode: string;
    castCode?: string;
    helperClassName?: string;
};
type fullEnumTypeDetails = enumTypeDetails<dataBridgeTypeInfo>;
type fullTypeDetails = typeDetails<dataBridgeTypeInfo>;
/**
 * Gathers any number of types expressible for an on-chain Helios script,
 * and does code generation for a class, including accessors for generating typed data
 * by converting expected data using the Cast class.
 *
 * The class uses a various subclasses of DataBridge for different types defined
 * in the contract script.
 *
 * Uses the BundleTypes class as a helper, in which the bridge-generator is a
 * "collaborator" in that class.  Thus, the data-bridge has access to the same
 * key events in the schema-finding process, and can tap into all the essential
 * logic for finding types.
 *
 * This strategy is also used for generating the data-reader class.
 *
 * When generating methods in the new class, the following rules apply:
 *
 * 1.  Each struct type is directly exposed as its name, making ‹bridge›.‹struct name›
 *      available for generating any data expected to match that form.
 *
 * 2.  Each enum type is exposed as its name, with nested accessors for each enum variant,
 *       ... with the accessors for each variant depend on the number of fields in the variant.
 *
 *     - if the variant has no fields, the accessor directly returns ‹cast›.toUplcData(\{ variantName: \{\} \})
 *
 *     - if the variant has a single field, the accessor is a function that takes the field value
 *        (with a strong type) and returns ‹cast›.toUplcData(\{ variantName: \{ fieldName: value \} \}
 *
 *     - if the variant has multiple fields, the accessor is a function that takes a strongly-typed
 *       object having the fields and returns ‹cast›.toUplcData(\{ variantName: \{ ...fields \} \})
 *
 * 3. Datum creator functions return a InlineTxOutputDatum, not just UplcData.
 *
 * 4. Reader types use an ergonomic type, where enum variants at any level are merged into a single
 *     type, not a union of its variants.  Enums and Structs with nested enums are also ergonomic.
 *
 * While gathering types, all the known type names are registered in a local namespace,
 * with function implementations gathered for each type.
 *
 * As each type is encountered (as a **nested field** within a datum or redeemer), any named
 * types encountered are added to the context, with any recursive expansions generated and
 * added to the context, depth-first... then the named type is used for the **nested field**
 * where it was encountered.
 * @public
 */
export declare class dataBridgeGenerator extends BundleBasedGenerator implements TypeGenHooks<dataBridgeTypeInfo> {
    namedSchemas: Record<string, TypeSchema>;
    getMoreEnumInfo?(typeDetails: enumTypeDetails): dataBridgeTypeInfo;
    getMoreStructInfo?(typeDetails: typeDetails): dataBridgeTypeInfo;
    getMoreVariantInfo?(details: variantTypeDetails): dataBridgeTypeInfo;
    getMoreTypeInfo?(details: typeDetails): dataBridgeTypeInfo;
    generateDataBridge(inputFile: string, projectName?: string): string;
    includeCastMemberInitializers(): string;
    includeDataReaderHelper(): string;
    generateDataReaderClass(className: string): string;
    includeEnumReaders(): string;
    includeStructReaders(): string;
    additionalCastMemberDefs: Record<string, string>;
    includeTypeAccessors(): string;
    includeEnumTypeAccessors(): string;
    includeStructTypeAccessors(): string;
    includeUtilityFunctions(): string;
    includeScriptNamedTypes(inputFile: string): string;
    includeActivityCreator(): string;
    includeDatumAccessors(): string;
    mkOtherDataHelperClass(helperClassName: string, details: fullTypeDetails): string;
    helperClasses: Record<string, string>;
    gatherHelperClasses(): string;
    includeAllHelperClasses(): string;
    get redeemerTypeName(): string;
    nestedHelperClassName(options: {
        typeDetails: fullEnumTypeDetails;
        isActivity: boolean;
    }): string;
    mkStructHelperClass(typeDetails: fullTypeDetails): string;
    mkEnumHelperClass(options: {
        typeDetails: fullEnumTypeDetails;
        isActivity?: boolean;
        isNested?: "isNested";
    }): string;
    mkNestedEnumAccessor(options: {
        enumTypeDetails: fullEnumTypeDetails;
        variantDetails: variantTypeDetails<dataBridgeTypeInfo>;
        variantName: string;
        parentContext: string;
        fieldName: string;
        oneField: anyTypeDetails<dataBridgeTypeInfo>;
        isInActivity?: boolean;
    }): string;
    getEnumPath(variantDetails: variantTypeDetails<any>): string;
    getEnumPathExpr(variantDetails: variantTypeDetails<any>): string;
    mkEnumVariantAccessors(options: {
        enumDetails: fullEnumTypeDetails;
        isDatum: boolean;
        isActivity: boolean;
        isNested?: "isNested";
    }): string;
    private mkMultiFieldVariantAccessor;
    private mkSingleFieldVariantAccessor;
    includeNamedSchemas(): string;
}
export {};
//# sourceMappingURL=dataBridgeGenerator.d.ts.map