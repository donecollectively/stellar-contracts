import { Address } from "@hyperionbt/helios";
import { StellarContract, paramsBase, stellarSubclass } from "../StellarContract.js";
import { DefaultMinter } from "../DefaultMinter.js";

const _uutName = Symbol("uutName");
const maxUutName = 32
export class UutName {
    private [_uutName]: string

    constructor(un: string) {
        if (un.length > maxUutName ) {
            throw new Error(`uut name '${un}' exceeds max length of ${maxUutName}`)
        }
        this[_uutName] = un
    }
    get name() { return this[_uutName] }
    toString() { return this[_uutName] }
}
export const PARAM_REQUIRED = Symbol("paramReqd");
export const PARAM_IMPLIED = Symbol("paramImplied");

export class DelegateConfigNeeded extends Error {
    errors?: ErrorMap
    availableStrategies?: string[]
    constructor(message: string, options: {
        errors?: ErrorMap,
        availableStrategies?: string[]
    }) {
        super(message)
        const {errors, availableStrategies} = options;
        if (errors) this.errors = errors;
        if (availableStrategies) this.availableStrategies = availableStrategies;
    }
}

export type ErrorMap = Record<string, string[]>
// return type for strategy's validateScriptParams()
export type strategyValidation = ErrorMap | undefined

export function variantMap<
    T extends StellarContract<any>
>(vm: VariantMap<T>) { return vm }

export type VariantMap<
    T extends StellarContract<any>
> = Record<string, VariantStrategy<T>>

export type RoleMap = Record<string, VariantMap<any>>

export type strategyParams = paramsBase;
export type delegateScriptParams = paramsBase;

export type PartialParamConfig<PT extends paramsBase> = Partial<{
    [key in keyof PT]: typeof PARAM_REQUIRED | typeof PARAM_IMPLIED | PT[key]
}>

//! declaration for a variant of a Role:
//  ... indicates the details needed to construct a delegate script
//  ... (and it's addr) that may not have existed before.
export type VariantStrategy<
    T extends StellarContract<any>,
    PT extends paramsBase = T extends StellarContract<infer iPT> ? iPT : never
> = {
    delegateClass: stellarSubclass<T>,
    //! it MAY provide a partial configuration to be used for parameterizing 
    //  the underlying contract script, to be further customized by a delegate-selection
    scriptParams? : PartialParamConfig<PT>,
    //! it has a function used for validating parameter details
    validateScriptParams(p: PT) : strategyValidation
}

//! a map of delegate selections needed for a transaction 
//  ... to construct a concrete delegate that hasn't yet been manifested.  
//  ... This commonly is needed during initial setup of a contract, 
//  ... but may happen also at later moments in the contract's lifecycle.
export type SelectedDelegates = {
    [roleName: string]: SelectedDelegate<StellarContract<any>>
}

//! a single delegate selection, where a person chooses 
//  ... one of the strategy variants 
//  ... and the settings (script parameters) needed to create the on-chain contract
export type SelectedDelegate<
    T extends StellarContract<any>,
    PT extends paramsBase = T extends StellarContract<infer iPT> ? iPT : never
> = {
    strategyName: string
    scriptParams: Partial<PT>,
} 

export function selectDelegate<
    T extends StellarContract<any>,
    PT extends paramsBase = T extends StellarContract<infer iPT> ? iPT : never
>(sd: string | SelectedDelegate<T, PT>) {
    if ("string" == typeof sd) return { strategyName: sd, scriptParams: {} }
    return sd
} 


//! a complete, validated configuration for a specific delegate.  
//  ... Combined with a specific UUT, a delegate linkage can be created from this
export type DelegateConfig<
    T extends StellarContract<any>,
    PT extends paramsBase = T extends StellarContract<infer iPT> ? iPT : never
> = {
    roleName: string,
    strategyName: string,
    selectedClass: stellarSubclass<T>,
    scriptParams: PT, 
    reqdAddress?: Address,
    addressesHint?: Address[],
}

export type RelativeDelegateLink = {
    strategyName: string,
    uut: UutName,
    reqdAddress?: Address,
    addressesHint?: Address[],
}

export type xDelegateLink = {
    strategyName: string,
    uutFingerprint: string,
    reqdAddress?: Address,
    addressesHint?: Address[],
}

export type DelegateDetailSnapshot<
    T extends StellarContract<any>,
    PT extends paramsBase = T extends StellarContract<infer iPT> ? iPT : never
> = {
    isDelegateSnapshot: true
    roleName: string,
    strategyName: string,
    uut: string,
    scriptParams: PT, 
    reqdAddress?: Address 
    addressesHint?: Address[]
}


