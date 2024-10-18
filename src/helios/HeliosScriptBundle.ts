import type { UplcData } from "@helios-lang/uplc";
import { CachedHeliosProgram } from "./CachedHeliosProgram.js";
import type { HeliosModuleSrc } from "./HeliosModuleSrc.js";
import type { isActivity } from "../StellarContract.js";
import type { EnumTypeSchema, TypeSchema, VariantTypeSchema } from "@helios-lang/type-utils";
import type { DataType } from "@helios-lang/compiler/src/index.js";

export type HeliosBundleClass = new () => HeliosScriptBundle;

export type mkAnyData = dataMaker<any> | mkEnum<any, any>;
export type dataMaker<permissiveType> =
    | ((arg: permissiveType) => UplcData)
    | never;

export type readAnyData = readData<any> | readEnum<any>;

export type mkAnyRedeemer =
    | mkEnum<any, any>
    | ((...args: any) => isActivity & { redeemer: UplcData });

export type AnyHeliosTypeInfo = TypeSchema | anyTypeDetails;
export type anyTypeDetails = typeDetails | enumTypeDetails;

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


export type VariantMap = {
    // Record<string, EnumVariant<any, any, any, any>>;
    [variantName: string]: enumVariantId<any, any, any, any>;
};

export type EnumId = {
    module: string,
    enumName: string
}

/**
 * ### Don't use this type directly.
 *
 * This type is used as an intermediate representation of an enum,
 * for generating the types for reading and writing data conforming to the type.
 */
export type EnumType<
    EID extends EnumId,
    enumVariants extends VariantMap
> = {
    NEVER_INSTANTIATED: "?maybe?";
    SEE_BUNDLE_CLASS: "accessor gateway there";
    kind: "enum";
    enumId: EID,
    variants: {
        [k in keyof enumVariants]: enumVariants[k];
    };
};

type VariantVariety = "tagOnly" | "fields" | "singletonField";

/**
 * ### Don't use this type directly.
 *
 * This type is used as an intermediate representation of an enum variant,
 * for generating the types of utilities that read and write the enum data.
 * See the mkEnum<EnumType> factory function, the ‹tbd› reader function
 * and the ‹tbd› readable type
 */
export type enumVariantId<
    EID extends EnumId,
    variantConstr extends `Constr#${string}`,
    variety extends VariantVariety,
    // variantArgs must be well specified for each variant
    variantArgs extends (
        variety extends "singletonField"
        ? never : any
        // variety extends "fields"
        // ? Record<string, any>
        // ? any
    ),
> = {
    kind: "variant";
    enumId: EID;
    variety: variety;
    args: variantArgs;
    constr: variantConstr;
};

// the mkEnum type becomes a smashed type of all possible variant-accessors of any signature.
// this brings together all the separate constructors from individual variant object-types into a single type
// due to use of 'keyof' and

export type mkEnum<
    ET extends EnumType<any, any>,
    VARIANTS extends VariantMap = ET extends EnumType<any, infer VARIANTS>
        ? VARIANTS
        : never
> = {
    // prettier-ignore
    [k in keyof VARIANTS]: VARIANTS[k] extends enumVariantId<infer ARITY, any, any, any> ?
        ARITY extends "tagOnly" ? { [ v in k ]: VARIANTS[k] } :
        ARITY extends "singletonField" ? { [ v in k ]: (field: VARIANTS[k]["args"]) => VARIANTS[k] } :
        ARITY extends "fields" ? { [ v in k ]: (fields: VARIANTS[k]["args"]) => VARIANTS[k] } :
    never : never
};

export type readEnum<nestedType> = {
    placeholder(): "placeholder";
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
}

export abstract class HeliosScriptBundle {
    constructor() {
        // this.Activity = this.createMkEnumProxy();
        // this.mkDatum = this.createMkEnumProxy();
        // this.readDatum = this.createReadEnumProxy();
    }
    // todo: refine this type
    Activity: mkAnyRedeemer;
    mkDatum: mkAnyData;
    readDatum: readAnyData;

    // addProxies<T>() {
    //     this.mkDatum = new mkDatumProxy()
    //     this.mkRedeemer = new mkRedeemerProxy()
    //     this.readDatum = new readDatumProxy()
    // }

    abstract get main(): HeliosModuleSrc;
    abstract get modules(): HeliosModuleSrc[];

    get program(): CachedHeliosProgram {
        return CachedHeliosProgram.forCurrentPlatform(this.main, {
            moduleSources: this.modules,
        });
    }

    getTopLevelTypes() : HeliosBundleTypes {
        const {program} = this;
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
        }
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
