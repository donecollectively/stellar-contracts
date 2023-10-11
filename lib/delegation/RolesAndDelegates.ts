import { Address } from "@hyperionbt/helios";
import { ConfigFor, StellarContract, configBase, stellarSubclass } from "../StellarContract.js";
import { DefaultMinter } from "../DefaultMinter.js";

const _uutName = Symbol("uutName");
const maxUutName = 32
export class UutName {
    private [_uutName]: string
    private purpose : string
    constructor(purpose: string, un: string) {
        this.purpose = purpose;
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

export type strategyParams = configBase;
export type delegateScriptParams = configBase;

export type PartialParamConfig<CT extends configBase> = Partial<{
    [key in keyof CT]: typeof PARAM_REQUIRED | typeof PARAM_IMPLIED | CT[key]
}>

//! declaration for a variant of a Role:
//  ... indicates the details needed to construct a delegate script
//  ... (and it's addr) that may not have existed before.
export type VariantStrategy<
    T extends StellarContract<any>
> = {
    delegateClass: stellarSubclass<T>,
    //! it MAY provide a partial configuration to be used for parameterizing 
    //  the underlying contract script, to be further customized by a delegate-selection
    scriptParams? : PartialParamConfig<ConfigFor<T>>,
    //! it has a function used for validating parameter details
    validateConfig(p: ConfigFor<T>) : strategyValidation
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
    T extends StellarContract<any>
> = {
    strategyName: string
    config: Partial<ConfigFor<T>>,
} 

export function selectDelegate<
    T extends StellarContract<any>
>(sd: SelectedDelegate<T>) {
    return sd
} 


//! a complete, validated configuration for a specific delegate.  
//  ... Combined with a specific UUT, a delegate linkage can be created from this
export type DelegateSettings<
    T extends StellarContract<any>
> = {
    delegateClass: stellarSubclass<T>,

    roleName: string,
    strategyName: string,
    config: ConfigFor<T>, 
    reqdAddress?: Address,
    addressesHint?: Address[],
}

export type RelativeDelegateLink<
    CT extends configBase
> = {
    uutName: string,    
    strategyName: string;
    config: Partial<CT>;
    reqdAddress?: Address;
    addressesHint?: Address[];
}

export type xDelegateLink = {
    strategyName: string,
    uutFingerprint: string,
    reqdAddress?: Address,
    addressesHint?: Address[],
}

export type DelegateDetailSnapshot<
    T extends StellarContract<any>,
> = {
    isDelegateSnapshot: true,
    uut: string,
    settings: DelegateSettings<T>
}

