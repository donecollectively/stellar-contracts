import { Address } from "@hyperionbt/helios";
import { StellarContract, paramsBase, stellarSubclass } from "../StellarContract.js";
import { DefaultMinter } from "../DefaultMinter.js";


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

export type VariantStrategy<
    T extends StellarContract<any>
> = {
    delegateClass: stellarSubclass<T>,
    scriptParams? : strategyParams,
    validateScriptParams(p: strategyParams) : strategyValidation
}
export function variantMap<
    T extends StellarContract<any>
>(vm: VariantMap<T>) { return vm }

export type VariantMap<
    T extends StellarContract<any>
> = Record<string, VariantStrategy<T>>

export type RoleMap = Record<string, VariantMap<any>>

export type strategyParams = paramsBase;
export type delegateScriptParams = paramsBase;

export type DelegateConfig = {
    strategyName: string,
    addlParams: delegateScriptParams, 
    reqdAddress?: Address 
    addressesHint?: Address[]
}
export type SelectedDelegates = {
    [roleName: string]: DelegateConfig
}

