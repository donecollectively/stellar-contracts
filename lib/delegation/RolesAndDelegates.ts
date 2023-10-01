import { Address } from "@hyperionbt/helios";
import { StellarContract, paramsBase, stellarSubclass } from "../StellarContract.js";
import { DefaultMinter } from "../index.js";


export class DelegateConfigNeeded extends Error {
    errors?: ErrorMap
    constructor(message: string, errors?: ErrorMap) {
        super(message)
        if (errors) this.errors = errors;
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
    address?: Address
}
export type SelectedDelegates = {
    [roleName: string]: DelegateConfig
}

