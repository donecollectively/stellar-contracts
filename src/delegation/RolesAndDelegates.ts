import { Address, MintingPolicyHash, ValidatorHash, bytesToHex, bytesToText } from "@hyperionbt/helios";
import {
    ConfigFor,
    StellarContract,
    configBase,
    stellarSubclass,
} from "../StellarContract.js";

import { StellarDelegate } from "./StellarDelegate.js";

const _uutName = Symbol("uutName");
const maxUutName = 32;
/**
 * a unique utility token having a unique name
 * @remarks
 *
 * This class contains a general 'purpose' name, mapped to a unique
 * `name`, which is generated using a seed-utxo pattern.
 *
 * @public
 **/
export class UutName {
    private [_uutName]: string;
    purpose: string;
    constructor(purpose: string, fullUutName: string) {
        this.purpose = purpose;
        if (fullUutName.length > maxUutName) {
            throw new Error(
                `uut name '${fullUutName}' exceeds max length of ${maxUutName}`
            );
        }
        this[_uutName] = fullUutName;
    }
    /**
     * the full uniquified name of this UUT
     * @remarks
     *
     * format: `purpose-‹...uniqifier...›`
     * @public
     **/
    get name() {
        return this[_uutName];
    }
    toString() {
        return this[_uutName];
    }
}

export class DelegateConfigNeeded extends Error {
    errors?: ErrorMap;
    availableStrategies?: string[];
    constructor(
        message: string,
        options: {
            errors?: ErrorMap;
            availableStrategies?: string[];
        }
    ) {
        super(message);
        const { errors, availableStrategies } = options;
        if (errors) this.errors = errors;
        if (availableStrategies) this.availableStrategies = availableStrategies;
    }
}

export type ErrorMap = Record<string, string[]>;
// return type for strategy's validateScriptParams()
export type strategyValidation = ErrorMap | undefined;

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
export type capoDelegateConfig = configBase & {
    capoAddr: Address;
    mph: MintingPolicyHash;
    tn: number[];
    rev: bigint;
    addrHint: Address[];
};

export type RoleMap<KR extends Record<string, RoleInfo<any, any, any, any>>> = {
    [roleName in keyof KR]: KR[roleName];
};

export function delegateRoles<const RM extends RoleMap<any>>(
    x: RM
): RoleMap<RM> {
    return x;
}
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
    return value; // return everything else unchanged
}

export type RoleInfo<
    SC extends StellarContract<any>,
    VM extends Record<variants, VariantStrategy<SC>>,
    UUTP extends string,
    variants extends string = string & keyof VM
> = {
    uutPurpose: UUTP;
    baseClass: stellarSubclass<SC>;
    variants: { [variant in variants]: VM[variant] };
};

export function defineRole<
    const UUTP extends string,
    SC extends StellarContract<any>,
    const VMv extends RoleInfo<SC, any, UUTP>["variants"]
>(
    uutBaseName: UUTP,
    baseClass: stellarSubclass<SC> & any,
    variants: VMv
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

//! declaration for a variant of a Role:
//  ... indicates the details needed to construct a delegate script
//  ... (and it's addr) that may not have existed before.
export type VariantStrategy<
    T extends StellarContract<capoDelegateConfig & any>
> = {
    delegateClass: stellarSubclass<T>;
    //! it MAY provide a partial configuration to be used for parameterizing
    //  the underlying contract script, to be further customized by a delegate-selection
    partialConfig?: PartialParamConfig<ConfigFor<T>>;
    //! it has a function used for validating parameter details
    validateConfig?: (p: ConfigFor<T>) => strategyValidation;
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
    config: ConfigFor<DT>;
} & RelativeDelegateLink<DT>;

export type RelativeDelegateLink<T extends StellarDelegate<any>> = {
    uutName: string;
    strategyName: string;
    config: Partial<ConfigFor<T>>;
    delegateValidatorHash?: ValidatorHash;
    // reqdAddress?: Address; removed
    // addrHint?: Address[]; moved to config
};
