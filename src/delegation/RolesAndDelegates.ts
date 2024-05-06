import { Address, MintingPolicyHash, ValidatorHash, bytesToHex, bytesToText } from "@hyperionbt/helios";
import type {
    ConfigFor,
    configBase,
    devConfigProps,
    stellarSubclass,
} from "../StellarContract.js";
import {
    StellarContract,
} from "../StellarContract.js";

import { StellarDelegate } from "./StellarDelegate.js";
import type { Capo, CapoBaseConfig } from "../Capo.js";

/**
 * An error type for reflecting configuration problems at time of delegate setup
 * @remarks
 * 
 * acts like a regular error, plus has an `errors` object mapping field names
 * to problems found in those fields.   
 *
 * When a strategy-selection failure happens, the `availableStrategies` property 
 * also has a list of known strategies for a selected delegation role.
 *  
 * @param ‹pName› - descr
 * @public
 **/
export class DelegateConfigNeeded extends Error {
    errors?: ErrorMap;
    availableStrategies?: string[];
    constructor(
        message: string,
        options: {
            errors?: ErrorMap;
            availableStrategies?: string[];
            errorRole? : string;
        }
    ) {
        super(message);
        const { errors, availableStrategies } = options;
        if (errors) this.errors = errors;
        if (availableStrategies) this.availableStrategies = availableStrategies;
    }
}

/**
 * Reveals errors found during delegate selection
 * @remarks
 * 
 * Each field name is mapped to an array of string error messages found on that field.
 * @public
 **/
export type ErrorMap = Record<string, string[]>;

/**
 * return type for strategy's validateScriptParams()
 * @internal
 **/
export type strategyValidation = ErrorMap | undefined | void;

/**
 * Captures normal details of every delegate relationship
 * @remarks
 * 
 * Includes the address of the leader contract, its minting policy, and the token-name
 * used for the delegate
 * @public
 **/
export type DelegationDetail = {
    capoAddr: Address;
    mph: MintingPolicyHash;
    tn: number[];
};

/**
 * Allows any targeted delegate class to access & use certain details originating in the leader contract
 * @remarks
 *
 * This setting is implicitly defined on all Delegate configurations.
 *
 * These allow any Capo delegate class to reference details from its essential
 * delegation context
 *
 * @public
 **/
export type capoDelegateConfig = configBase & devConfigProps & {
    capoAddr: Address;
    capo: Capo;
    mph: MintingPolicyHash;
    delegateName: string;
    tn: number[];
    rev: bigint;
    isDev: boolean;
    devGen: bigint;
    addrHint: Address[];
};

/**
 * Richly-typed structure that can capture the various delegation roles available
 * in a Capo contract
 * @remarks
 * 
 * Defined in a delegateRoles() method using the standalone delegateRoles() 
 * and defineRole() helper functions.
 * @typeParam KR - deep, strong type of the role map - always inferred by 
 * delegateRoles() helper.
 * @public
 **/
export type RoleMap<KR extends Record<string, RoleInfo<any, any, any, any>>> = {
    [roleName in keyof KR]: KR[roleName];
};

/**
 * Standalone helper method defining a specific RoleMap; used in a Capo's delegateRoles() instance method
 * @remarks
 * 
 * Called with a set of literal role defintitions, the full type  of the RoleMap is inferred.
 * 
 * Use {@link defineRole}() to create each role entry
 * 
 * @param roleMap - maps role-names to role-definitions
 * @typeParam RM - inferred type of the `roleMap` param
 * @public
 **/
export function delegateRoles<const RM extends RoleMap<any>>(
    roleMap: RM
): RoleMap<RM> {
    return roleMap;
}

/**
 * toJSON adapter for delegate links
 * @internal
 **/
export function delegateLinkSerializer(key: string, value: any) {
    if (typeof value === "bigint") {
        return value.toString();
    } else if ("bytes" == key && Array.isArray(value)) {
        return bytesToHex(value)
    } else if (value instanceof Address) {
        return value.toBech32()
    } else if ("tn" == key && Array.isArray(value)) {
        return bytesToText(value)
    }
    if (key === "capo") return undefined;
    return value; // return everything else unchanged
}

/**
 * Describes one delegation role used in a Capo contract
 * @remarks
 * 
 * Includes the base class for all the variants of the role, a 
 * uutPurpose (base name for their authority tokens), and
 * named variants for that role
 * 
 * All type-parameters are normally inferred from {@link defineRole}()
 * 
 * @public
 **/
export type RoleInfo<
    SC extends StellarContract<any>,
    VM extends Record<variants, VariantStrategy<SC>>,
    UUTP extends string,
    variants extends string = string & keyof VM
> = {
    uutPurpose: UUTP;
    baseClass: stellarSubclass<SC>;
    variants:{ 
        // doesn't work together with next line: [otherVariant: string]: VariantStrategy<SC>,
        [variant in variants]: VM[variant]  
    }
    // sadly, this doesn't work either
    // &  Record<string, VariantStrategy<SC>> 
    // nope, this doesn't work either
    //  & {
    //     [key: string]: VariantStrategy<SC>
    // }
};

/**
 * Creates a strongly-typed definition of a delegation role used in a Capo contract
 * 
 * @remarks
 * The definition ncludes the different strategy variants that can serve in that role.
 * 
 * NOTE: all type parameters are inferred from the function params.
 * 
* @param uutBaseName - token-name prefix for the tokens connecting delegates for the role
 * @param baseClass - each variant is expected to inherit from this base class
 * @param variants - maps each strategy-variant name to a detailed {@link VariantStrategy}  definition
 * @public
 **/
export function defineRole<
    const UUTP extends string,
    SC extends StellarContract<any>,
    const VMv extends Record<string, VariantStrategy<SC>> //& RoleInfo<SC, any, UUTP>["variants"]
>(
    uutBaseName: UUTP,
    baseClass: stellarSubclass<SC> & any,
    variants:  VMv
): RoleInfo<SC, VMv, UUTP> {
    return {
        uutPurpose: uutBaseName,
        baseClass,
        variants,
    };
}

//!!! todo: develop this further to allow easily enhancing a parent role-definition
// ... with an additional strategy variant

// type vmapBuilder<
//     SC extends StellarContract<any>,
//     UUTP extends string,
//     VMv extends RoleInfo<SC, any, UUTP>["variants"]
// > = (variants: VMv) => RoleInfo<SC, VMv, UUTP>;
// export function defineRole<
//     SC extends StellarContract<any>,
//     const PUUTP extends string,
// >(
//     inheritedRoleDefinition: RoleInfo<SC, any, PUUTP>
// ) : vmapBuilder<SC, PUUTP, RoleInfo<SC, any, PUUTP>["variants"]>
// export function defineRole<
//     const UUTP extends string,
//     SC extends StellarContract<any>,
// >(
//     uutBaseName: UUTP,
//     subclass: stellarSubclass<SC> & any,
// ) : vmapBuilder<SC, UUTP, RoleInfo<SC, any, UUTP>["variants"]>
// export function defineRole<
//     const UUTP extends string,
//     SC extends StellarContract<any>,
//     const Puutp extends string,
// >(
//     uBNorParentDef: Puutp | RoleInfo<SC, any, UUTP>,
//     subclass?: stellarSubclass<SC> & any,
// ) : vmapBuilder<SC, Puutp | UUTP, RoleInfo<SC, any, Puutp | UUTP>["variants"]> {
//     const uutBaseName = (
//         "string" == typeof uBNorParentDef
//      ) ? uBNorParentDef
//         : uBNorParentDef.uutPurpose;

//     return function vmapBuilder<
//         const VMv extends RoleInfo<SC, any, UUTP>["variants"]
//     >(
//         variants: VMv
//     ): RoleInfo<SC, VMv, UUTP> {
//         return {
//             uutPurpose: uutBaseName,
//             variants,
//         };
//     }

export type strategyParams = configBase;
export type delegateScriptParams = configBase;

export type PartialParamConfig<CT extends configBase> = Partial<CT>;

/**
 * declaration for one strategy-variant of a delegate role
 * @remarks
 * 
 * Indicates the details needed to construct a delegate script
 * 
 * NOTE: the Type param is always inferred by defineRole()
 * @public
 **/
export interface VariantStrategy<
    DT extends StellarContract<capoDelegateConfig & any>
> {
    delegateClass: stellarSubclass<DT>;
    //! it MAY provide a partial configuration to be used for parameterizing
    //  the underlying contract script, to be further customized by a delegate-selection
    partialConfig?: PartialParamConfig<ConfigFor<DT>>;
    //! it has a function used for validating parameter details
    validateConfig?: (p: ConfigFor<DT>) => strategyValidation;
};

//! a map of delegate selections needed for a transaction
//  ... to construct a concrete delegate that hasn't yet been manifested.
//  ... This commonly is needed during initial setup of a contract,
//  ... but may happen also at later moments in the contract's lifecycle.
export type SelectedDelegates = {
    [roleName: string]: SelectedDelegate<StellarContract<any>>;
};

//! a single delegate selection, where a person chooses
//  ... one of the strategy variants
//  ... and the settings (script parameters) needed to create the on-chain contract
export type SelectedDelegate<SC extends StellarContract<any>> = {
    strategyName: string;
    config?: Partial<ConfigFor<SC>>;
};

// export type StellarDelegate =
//     StellarDelegateClass<any & configBase & capoDelegateConfig> &
//     StellarContract<any & configBase & capoDelegateConfig>;

// export function selectDelegate<T extends StellarContract<any>>(
//     sd: SelectedDelegate<T>
// ) {
//     return sd;
// }

/**
 * A complete, validated and resolved configuration for a specific delegate
 * @public
 * @remarks
 *
 * Use StellarContract's `txnCreateDelegateSettings()` method to resolve
 * from any (minimal or better) delegate details to a ResolvedDelegate object.
 * @typeParam DT - a StellarContract class conforming to the `roleName`,
 *     within the scope of a Capo class's `roles()`.
 **/
export type ConfiguredDelegate<DT extends StellarDelegate<any>> = {
    delegateClass: stellarSubclass<DT>;
    delegate: DT;
    roleName: string;
    config: Partial<CapoBaseConfig> & ConfigFor<DT>;
} & RelativeDelegateLink<DT>;

/**
 * Minimal structure for connecting a specific Capo contract to a configured StellarDelegate
 * @remarks
 * 
 * This structure can always resolve to a reproducible delegate class (a {@link StellarDelegate}),
 * given a specific Capo and roleName.  
 * 
 * When the delegate isn't backed by a specific on-chain contract script, the delegateValidatorHash 
 * is optional.
 * 
 * @typeParam DT - the base class, to which all role-strategy variants conform
 * @public
 **/
export type RelativeDelegateLink<DT extends StellarDelegate<any>> = {
    uutName: string;
    strategyName: string;
    config: Partial<ConfigFor<DT>>;
    delegateValidatorHash?: ValidatorHash;
    // reqdAddress?: Address; removed
    // addrHint?: Address[]; moved to config
};
