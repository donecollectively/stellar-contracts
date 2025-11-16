import type { Address, MintingPolicyHash, ValidatorHash } from "@helios-lang/ledger";
import type { ConfigFor, configBaseWithRev, stellarSubclass } from "../StellarContract.js";
import { StellarContract } from "../StellarContract.js";
import { StellarDelegate } from "./StellarDelegate.js";
import type { Capo } from "../Capo.js";
import type { CapoConfig } from "../CapoTypes.js";
import type { DelegatedDataContract } from "./DelegatedDataContract.js";
/**
 * An error type for reflecting configuration problems at time of delegate setup
 * @remarks
 *
 * acts like a regular error, plus has an `errors` object mapping field names
 * to problems found in those fields.
 * @public
 **/
export declare class DelegateConfigNeeded extends Error {
    errors?: ErrorMap;
    availableDgtNames?: string[];
    constructor(message: string, options: {
        errors?: ErrorMap;
        availableDgtNames?: string[];
        errorRole?: string;
    });
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
export type minimalDelegateConfig = Pick<capoDelegateConfig, "rev" | "delegateName"> & {
    rev: bigint;
    delegateName: string;
    isMintDelegate: true;
    isSpendDelegate: true;
    isDgDataPolicy: false;
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
export type DelegateMap<KR extends Record<string, DelegateSetup<any, any, any>>> = {
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
export declare function delegateRoles<const RM extends DelegateMap<any>>(delegateMap: RM): DelegateMap<RM>;
type DelegateTypes = "spendDgt" | "mintDgt" | "authority" | "dgDataPolicy" | "other";
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
export type DelegateSetup<DT extends DelegateTypes, SC extends (DT extends "dgDataPolicy" ? DelegatedDataContract<any, any> : StellarDelegate), CONFIG extends DelegateConfigDetails<SC>> = {
    uutPurpose: string;
    delegateType: DelegateTypes;
    delegateClass: stellarSubclass<SC>;
    config: CONFIG;
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
export declare function defineRole<DT extends DelegateTypes, SC extends (DT extends "dgDataPolicy" ? DelegatedDataContract<any, any> : StellarDelegate), const CONFIG extends DelegateConfigDetails<SC>>(delegateType: DT, delegateClass: stellarSubclass<SC>, config: CONFIG, uutBaseName?: string): DelegateSetup<DT, SC, CONFIG>;
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
export interface DelegateConfigDetails<DT extends StellarDelegate> {
    partialConfig?: PartialParamConfig<ConfigFor<DT>>;
    validateConfig?: (p: ConfigFor<DT>) => delegateConfigValidation;
}
export type SelectedDelegates = {
    [roleName: string]: SelectedDelegate<StellarContract<any>>;
};
export type SelectedDelegate<SC extends StellarContract<any>> = {
    strategyName: string;
    config?: Partial<ConfigFor<SC>>;
};
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
    config: Partial<capoDelegateConfig>;
    delegateValidatorHash?: ValidatorHash;
};
export {};
//# sourceMappingURL=RolesAndDelegates.d.ts.map