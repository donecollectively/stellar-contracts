import {
    Address,
    AssetClass,
    MintingPolicyHash,
    TxInput,
} from "@hyperionbt/helios";
import {
    ConfigFor,
    StellarContract,
    configBase,
    stellarSubclass,
} from "../StellarContract.js";
import { DefaultMinter } from "../DefaultMinter.js";
import { Capo } from "../Capo.js";
import { StellarTxnContext } from "../StellarTxnContext.js";

const _uutName = Symbol("uutName");
const maxUutName = 32;
export class UutName {
    private [_uutName]: string;
    private purpose: string;
    constructor(purpose: string, un: string) {
        this.purpose = purpose;
        if (un.length > maxUutName) {
            throw new Error(
                `uut name '${un}' exceeds max length of ${maxUutName}`
            );
        }
        this[_uutName] = un;
    }
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

export interface StellarDelegate {
    /**
     * Standard delegate method for receiving the authority token
     * @remarks
     * 
     * creates a UTxO depositing the indicated token-name into the delegated destination.
     * 
    * Each implemented subclass can use it's own style to match its strategy & mechanism.
    //! This is used both for the original deposit and for returning the token during a grant-of-authority
    //! impls should normally preserve the datum from an already-present sourceUtxo
     * @param tcx - transaction-context
     * @param fromFoundUtxo - always present when the authority token already existed
     * @public
     **/
    txnReceiveAuthorityToken<TCX extends StellarTxnContext<any>>(
        tcx: TCX,
        // delegateAddr: Address,
        fromFoundUtxo?: TxInput
    ): Promise<TCX>;
};
export function variantMap<T extends StellarContract<any>>(vm: VariantMap<T>) {
    return vm;
}

export type VariantMap<T extends StellarContract<any>> = Record<
    string,
    VariantStrategy<T>
>;
/**
 * Allows any targeted delegate class to use the address of the leader contract
 * @remarks
 *
 * This setting is implicitly defined on all Delegate configurations, and includes
 * `uut` and `capo.address`, along with optional `reqdAddress` and `addrHint`,
 *
 * These allow any Capo delegate class to reference details from its essential
 * delegation context
 *
 * @public
 **/
export type capoDelegateConfig = configBase & {
    uutID: AssetClass;
    capo: {
        address: Address;
        mph: MintingPolicyHash;
    };
    reqdAddress?: Address;
    addrHint: Address[];
};


export type RoleMap<KR extends Record<string, VariantMap<any>>> = {
    [roleName in keyof KR]: KR[roleName]
}

export function isRoleMap<const RM extends RoleMap<any>>(x: RM): RoleMap<RM> {
    return x;
}

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

export function selectDelegate<T extends StellarContract<any>>(
    sd: SelectedDelegate<T>
) {
    return sd;
}

/**
 * A complete, validated and resolved configuration for a specific delegate
 * @remarks
 *
 * Use StellarContract's `txnCreateDelegateSettings()` method to resolve
 * from any (minimal or better) delegate details to a ResolvedDelegate object.
 * @typeParam DT - a StellarContract class conforming to the `roleName`,
 *     within the scope of a Capo class's `roles()`.
 * @public
 **/
export type ConfiguredDelegate<
    DT extends StellarContract<any & capoDelegateConfig>
> = {
    delegateClass: stellarSubclass<DT>;
    delegate: DT;
    roleName: string;
    config: ConfigFor<DT>;
} & RelativeDelegateLink<DT>;

export type RelativeDelegateLink<T extends StellarContract<any>> = {
    uutName: string;
    strategyName: string;
    config: Partial<ConfigFor<T>>;
    reqdAddress?: Address;
    addressesHint?: Address[];
};

export type xDelegateLink = {
    strategyName: string;
    uutFingerprint: string;
    reqdAddress?: Address;
    addressesHint?: Address[];
};

export type DelegateDetailSnapshot<T extends StellarContract<any>> = {
    isDelegateSnapshot: true;
    uut: string;
    settings: ConfiguredDelegate<T>;
};
