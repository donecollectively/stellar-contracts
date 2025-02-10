import type { Address, MintingPolicyHash, ValidatorHash } from "@helios-lang/ledger";
import type {
    ConfigFor,
    configBaseWithRev,
    stellarSubclass,
} from "../StellarContract.js";
import {
    StellarContract,
} from "../StellarContract.js";

import { StellarDelegate } from "./StellarDelegate.js";
import type { Capo } from "../Capo.js";
import type { CapoConfig } from "../CapoTypes.js";
import type { ContractBasedDelegate } from "./ContractBasedDelegate.js";
import type { RelativeDelegateLinkLike } from "../helios/scriptBundling/CapoHeliosBundle.typeInfo.js";
import type { DelegatedDataContract } from "./DelegatedDataContract.js";

/**
 * An error type for reflecting configuration problems at time of delegate setup
 * @remarks
 *
 * acts like a regular error, plus has an `errors` object mapping field names
 * to problems found in those fields.
 * @public
 **/
export class DelegateConfigNeeded extends Error {
    errors?: ErrorMap;
    availableDgtNames?: string[];
    constructor(
        message: string,
        options: {
            errors?: ErrorMap;
            availableDgtNames?: string[];
            errorRole?: string;
        }
    ) {
        super(message);
        const { errors, availableDgtNames } = options;
        if (errors) this.errors = errors;
        if (availableDgtNames) this.availableDgtNames = availableDgtNames;
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
 * return type for a delegate-config's validateScriptParams()
 * @internal
 **/
export type delegateConfigValidation = ErrorMap | undefined | void;

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
export type capoDelegateConfig = configBaseWithRev & {
    rev: bigint;
    delegateName: string;
    mph: MintingPolicyHash;
    tn: number[];
    addrHint: Address[];
    capoAddr: Address;
    capo: Capo<any>;
};

export type minimalDelegateConfig = Pick<capoDelegateConfig, 
    "rev" | "delegateName" 
> & {
    rev: bigint;
    delegateName: string;
    isMintDelegate: true,
    isSpendDelegate: true,
    isDgDataPolicy: false,
}


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
export type DelegateMap<
    KR extends Record<string, DelegateSetup<any, any, any>>
> = {
    [roleName in keyof KR]: KR[roleName];
};

/**
 * Standalone helper method defining a specific DelegateMap; used in a Capo's delegateRoles() instance method
 * @remarks
 *
 * Called with a set of literal role defintitions, the full type  of the DelegateMap is inferred.
 *
 * Use {@link defineRole}() to create each role entry
 *
 * @param roleMap - maps role-names to role-definitions
 * @typeParam RM - inferred type of the `delegateMap` param
 * @public
 **/
export function delegateRoles<const RM extends DelegateMap<any>>(
    delegateMap: RM
): DelegateMap<RM> {
    return delegateMap;
}

type DelegateTypes =
    | "spendDgt"
    | "mintDgt"
    | "authority"
    | "dgDataPolicy"
    | "other";

/**
 * Describes one delegation role used in a Capo contract
 * @remarks
 *
 * Includes the controller / delegate class, the configuration details for that class,
 * and a uutPurpose (base name for the authority tokens).
 *
 * All type-parameters are normally inferred from {@link defineRole}()
 *
 * @public
 **/
export type DelegateSetup<
    DT extends DelegateTypes,
    SC extends (DT extends "dgDataPolicy" ? DelegatedDataContract<any, any> : StellarDelegate),
    CONFIG extends DelegateConfigDetails<SC>,
    // variantNames extends string = string & keyof Vmap,
> = {
    uutPurpose: string
    delegateType: DelegateTypes
    delegateClass: stellarSubclass<SC>
    config: CONFIG
    // variants:{ 
    //     [variant in variantNames]: Vmap[variant]  
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
 * @param delegate - class and configuration for a selected delegate - see {@link DelegateConfigDetails}
 * @param delegateType - the variety of delegate
 * @public
 **/
export function defineRole<
    DT extends DelegateTypes,
    SC extends (DT extends "dgDataPolicy" ? DelegatedDataContract<any, any> : StellarDelegate),
    const CONFIG extends DelegateConfigDetails<SC>,
    // = CONFIG extends DelegateConfigDetails<infer sc> ? sc : never
    // DelegateClass extends stellarSubclass<infer sc> ? 
    //     sc : never  // NOTE: type (XX & unknown) is same as XX    
>(
    delegateType: DT,
    delegateClass: stellarSubclass<SC>,
    config:  CONFIG,
    uutBaseName?: string,
): DelegateSetup<DT, SC, CONFIG> {
    return {
        delegateType,
        delegateClass: delegateClass,
        config: config,
        uutPurpose: uutBaseName || delegateType,
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

export type strategyParams = configBaseWithRev;
export type delegateScriptParams = configBaseWithRev;

export type PartialParamConfig<CT extends configBaseWithRev> = Partial<CT>;

/**
 * declaration for one strategy-variant of a delegate role
 * @remarks
 *
 * Indicates the details needed to construct a delegate script
 *
 * NOTE: the Type param is always inferred by defineRole()
 * @public
 **/
export interface DelegateConfigDetails<
    DT extends StellarDelegate // StellarContract<capoDelegateConfig & any>
> {
    //! it MAY provide a partial configuration to be used for parameterizing
    //  the underlying contract script, to be further customized by a delegate-selection
    partialConfig?: PartialParamConfig<ConfigFor<DT>>;
    //! it has a function used for validating parameter details
    validateConfig?: (p: ConfigFor<DT>) => delegateConfigValidation;
}

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
export type ConfiguredDelegate<DT extends StellarDelegate> = {
    delegateClass: stellarSubclass<DT>;
    delegate: DT;
    roleName: string;
    fullCapoDgtConfig: Partial<CapoConfig> & capoDelegateConfig;
} & OffchainPartialDelegateLink;

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
 * Use Capo mkDelegateLink(x: OffchainRelativeDelegateLink) to
 * convert this data for on-chain use in the Capo's charter data structure
 *
 * @typeParam DT - the base class, to which all role-strategy variants conform
 * @public
 **/
export type OffchainPartialDelegateLink = {
    uutName?: string;
    // strategyName: string;
    config: Partial<capoDelegateConfig>;
    delegateValidatorHash?: ValidatorHash;
    // reqdAddress?: Address; removed
    // addrHint?: Address[]; moved to config
};
