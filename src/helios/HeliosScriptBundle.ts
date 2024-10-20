import type { UplcData } from "@helios-lang/uplc";
import { CachedHeliosProgram } from "./CachedHeliosProgram.js";
import type { HeliosModuleSrc } from "./HeliosModuleSrc.js";
import type { isActivity } from "../StellarContract.js";
import type {
    EnumTypeSchema,
    TypeSchema,
    VariantTypeSchema,
} from "@helios-lang/type-utils";
import type { DataType } from "@helios-lang/compiler/src/index.js";
import type { EachUnionElement } from "./typeUtils.js";
import { BundleTypeGenerator } from "./BundleTypeGenerator.js";

export type HeliosBundleClass = new () => HeliosScriptBundle;

// external-facing types for reading and writing data for use in contract scripts.
// 1. create data for Datum or other non-Activity scenarios

export type makesAnyData<T> = 
    T extends EnumType<any, any> ? makesEnumData<T> :
    dataMaker<T>;

// still drafting this...
export type dataMaker<permissiveType> =
    | ((arg: permissiveType) => UplcData)
    | never;

// 2. read data from Datum.  Can also be used for returned results 
//  ... of utility functions defined in Helios code.
export type readsAnyData<T> =
    T extends EnumType<any, any> ? readsUplcEnumData<T> :
    readsUplcData<T>;

export type readsUplcEnumData<nestedType> = {
    placeholder(): "placeholder";
};
    
export type readsUplcData<canonicalType> = (x : UplcData) => canonicalType;

export type makesActivity<permissiveType> = (  // ... a function type
    (arg: permissiveType) => isActivity & { redeemer: UplcData }
);

export type makesAnyActivity<T> =
    T extends EnumType<any, any> ? makesActivityEnum<any, any> : makesActivity<any>;
    // | mkActivityEnum<any, any>
    // | mkActivity<any>;

export type AnyHeliosTypeInfo = TypeSchema | anyTypeDetails;
export type anyTypeDetails = typeDetails | enumTypeDetails;

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

type isSeeded<
    V extends anySingleEnumVariant,
    FLAGS extends SpecialActivityFlags = V extends singleEnumVariant<any, any, any, any, any, infer F> ? F : never
> = FLAGS extends "isSeededActivity" ? true : false;

if (false) {
    type test = ( "x" | "y" ) extends "x" ? true : false; // false
    type test2  = "x" extends ("x" | "y") ? true : false; // true
    const test2Value : test2 = true
}

// special case for the singletonField variety, in which there is no record of field-names -> types
type singletonVariantFieldAllowedInputType<
    V extends anySingleEnumVariant,
    forActivities extends "forActivities" | never = never
> = true extends isSeeded<V> ? V["data"] : V["data"]

type variantFieldArity<V extends anySingleEnumVariant> = V["variantKind"];

type ExtractVariantMakerSignature<
    VARIANTS extends VariantMap,
    singleVariantName extends keyof VARIANTS,
    ET extends EnumType<any, any>,
    forActivities extends "forActivities" | never = never,
    THIS_VARIANT extends anySingleEnumVariant = VARIANTS[singleVariantName],
    ARITY = variantFieldArity<THIS_VARIANT>
> = 
// VARIANTS[singleVariantName] extends singleEnumVariant<ET, any, any, any, infer ARITY, any>
//     ? 
ARITY extends "tagOnly"
        ? {
                // is a simple getter, no function call needed
                [v in singleVariantName]: THIS_VARIANT;
          }
        : ARITY extends "singletonField"
        ? {
              // is a function call with a single arg for the field type
              [v in singleVariantName]: (
                // NOTE: the single inner type is proactively unwrapped 
                //  ... by the type-generator, before this type is ever expanded  
                  field: singletonVariantFieldAllowedInputType<VARIANTS[singleVariantName], forActivities> 
              ) => VARIANTS[singleVariantName];
          }
        : ARITY extends "fields"
        ? {
              [v in singleVariantName]: (
                  //  has {field:type, ... } form
                  fields: VARIANTS[singleVariantName]["data"] // todo: expand the field types with forActivities-sensitivity
              ) => VARIANTS[singleVariantName];
          }
        : never;

// the mkEnum type becomes a smashed type of all possible variant-accessors of any signature.
// this brings together all the separate constructors from individual variant object-types into a single type
// due to use of 'keyof' and

export type makesEnumData<
    ET extends EnumType<any, any>,
    VARIANTS extends VariantMap = ET extends EnumType<any, infer VARIANTS>
        ? VARIANTS
        : never
> = {
    // prettier-ignore
    [k in keyof VARIANTS]: ExtractVariantMakerSignature<VARIANTS, k, ET>
};

export type makesActivityEnum<
    ET extends EnumType<any, any>,
    VARIANTS extends VariantMap = ET extends EnumType<any, infer VARIANTS>
        ? VARIANTS
        : never
> = {
    // prettier-ignore
    [k in keyof VARIANTS]: ExtractVariantMakerSignature<VARIANTS, k, ET, "forActivities">
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
    datum: DataType | undefined;
    redeemer: DataType;
};

export abstract class HeliosScriptBundle {
    declare Activity: makesAnyActivity<any>;
    declare mkDatum: Option<makesAnyData<any>>;
    declare readDatum: Option<readsAnyData<any>>;

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

        this.Activity = this.createMkActivityProxy(activityTypeDetails);
        this.mkDatum = this.createMkDataProxy(datumTypeDetails);
        this.readDatum = this.createReadDataProxy(datumTypeDetails);
    }

    createMkActivityProxy(typeDetails: anyTypeDetails): makesAnyActivity<any> {
        // throw new Error(`implement me!`)
        return (() => {}) as any;
    }

    createMkDataProxy(
        typeDetails: Option<anyTypeDetails>
    ): Option<makesAnyData<any>> {
        if (!typeDetails) {
            return undefined;
        }

        // throw new Error(`implement me!`)
        return (() => {}) as any;
    }

    createReadDataProxy(
        typeDetails: Option<anyTypeDetails>
    ): Option<readsAnyData<any>> {
        if (!typeDetails) {
            return undefined;
        }

        // throw new Error(`implement me!`)
        return (() => {}) as any;
    }

    getTopLevelTypes(): HeliosBundleTypes {
        const program = this.program;
        // const { program } = this;
        const argTypes = program.entryPoint.mainArgTypes;
        const argCount = argTypes.length;
        const programName = program.name;
        // const mainModuleTypes = program.entryPoint.userTypes[programName];

        let datumType: DataType | undefined;
        let redeemerType: DataType;
        let redeemerTypeName: string = "";
        let datumTypeName: string = "";
        if (argCount === 2) {
            datumType = argTypes[0];
            datumTypeName = argTypes[0].name;
            redeemerType = argTypes[1];
        } else {
            // no datum-type for minter
            // datumType = program.entryPoint.mainArgTypes[0]
            redeemerType = argTypes[0];
            redeemerTypeName = argTypes[0].name;
        }

        return {
            datum: datumType,
            redeemer: redeemerType,
        };
    }
}

// const rawTypeProxy = new Proxy(
//     {},
//     {
//         get(_, typeName, ptp) {
//             const cast = ptp.getCast(typeName)
//             return ptp.types.get(prop)
//         },
//         apply(xxx, ptp, args) {
//             debugger
//             return ptp.toUplc(...args)
//         }
//     }
// )
// function proxyBase() {}
// proxyBase.prototype = rawTypeProxy

// class ProgramTypeProxy extends proxyBase {
//     /**
//      * @param {UplcProgramV2} program
//      * @param {string} [ns]
//      * @param {string} [typeName]
//      */
//     constructor(program, ns, typeName) {
//         super()
//         this.program = program
//         this.namespace = ns || program.name
//         this.__typeNames = Object.keys(program.userTypes[this.namespace])
//         this.typeName = typeName ?? ""
//         this.casts = {}
//     }
//     namespace(ns) {
//         if (this.program.userTypes[ns]) {
//             return new ProgramTypeProxy(this.program, userTypes[ns])
//         }
//         throw new Error(
//             `Program ${this.program.name}: namespace ${ns} not found`
//         )
//     }

//     getCast(typeName) {
//         if (!typeName)
//             throw new Error("access via a namespace() and/or .‹typeName›")
//         if (this.casts[typeName]) {
//             return this.casts[typeName]
//         }
//         if (this.program.userTypes[this.namespace][typeName]) {
//             return (this.casts[typeName] = new Cast(this.getType(typeName), {
//                 isMainnet: false
//             }))
//         }
//         throw new Error(
//             `Program ${this.program.name}: ns '${this.namespace}': type '${typeName}' not found`
//         )
//     }

//     /**
//      * @param {UplcData} uplcData
//      * @returns any
//      */
//     fromUplc(uplcData) {
//         return this.getCast(this.typeName).fromUplcData(uplcData)
//     }
//     /**
//      * @param {any} data
//      * @returns UplcData
//      */
//     toUplc(data) {
//         return this.getCast(this.typeName).toUplcData(
//             data,
//             `${this.program.name}::${this.namespace}::${this.typeName}`
//         )
//     }
//     // type(typeName) {
//     //     return new ProgramTypeProxy(this.program, this.namespace, typeName)
//     // }
// }
