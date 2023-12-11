import { Address } from '@hyperionbt/helios';
import { AssetClass } from '@hyperionbt/helios';
import { Assets } from '@hyperionbt/helios';
import { ByteArray } from '@hyperionbt/helios';
import { ByteArrayData } from '@hyperionbt/helios';
import { capoDelegateConfig as capoDelegateConfig_2 } from './delegation/RolesAndDelegates.js';
import { configBase } from '../StellarContract.js';
import { Datum } from '@hyperionbt/helios';
import { emptyState as emptyState_2 } from './StellarTxnContext.js';
import { emptyState as emptyState_3 } from '../StellarTxnContext.js';
import * as helios from '@hyperionbt/helios';
import { MintingPolicyHash } from '@hyperionbt/helios';
import { Network } from '@hyperionbt/helios';
import { NetworkEmulator } from '@hyperionbt/helios';
import { NetworkParams } from '@hyperionbt/helios';
import { Program } from '@hyperionbt/helios';
import { ReqtsMap as ReqtsMap_2 } from '../Requirements.js';
import { ReqtsMap as ReqtsMap_3 } from './Requirements.js';
import { RoleInfo } from './delegation/RolesAndDelegates.js';
import { RoleMap as RoleMap_2 } from './Capo.js';
import { SimpleWallet } from '@hyperionbt/helios';
import { StakeAddress } from '@hyperionbt/helios';
import { StakingValidatorHash } from '@hyperionbt/helios';
import type { TestContext } from 'vitest';
import { textToBytes } from '@hyperionbt/helios';
import { Tx } from '@hyperionbt/helios';
import { TxId } from '@hyperionbt/helios';
import { TxInput } from '@hyperionbt/helios';
import { TxOutput } from '@hyperionbt/helios';
import { TxOutputId } from '@hyperionbt/helios';
import { UplcData } from '@hyperionbt/helios';
import { UplcDataValue } from '@hyperionbt/helios';
import { UplcProgram } from '@hyperionbt/helios';
import { ValidatorHash } from '@hyperionbt/helios';
import { Value } from '@hyperionbt/helios';
import { Wallet } from '@hyperionbt/helios';
import { WalletHelper } from '@hyperionbt/helios';

/**
 * Decorators for on-chain activity (redeemer) factory functions
 * @public
 **/
export declare const Activity: {
    /**
     * Decorates a partial-transaction function that spends a contract-locked UTxO using a specific activity ("redeemer")
     * @remarks
     *
     * activity-linked transaction-partial functions must follow the txn\{...\}
     * and active-verb ("ing") naming conventions.  `txnRetiringDelegation`,
     * `txnModifyingVote` and `txnWithdrawingStake` would be examples
     * of function names following this guidance.
     *
     * @public
     **/
    partialTxn(proto: any, thingName: any, descriptor: any): any;
    /**
     * Decorates a factory-function for creating tagged redeemer data for a specific on-chain activity
     * @remarks
     *
     * The factory function should follow an active-verb convention by including "ing" in the name of the factory function
     * @public
     **/
    redeemer(proto: any, thingName: any, descriptor: any): any;
    redeemerData(proto: any, thingName: any, descriptor: any): any;
};

declare type actorMap = Record<string, SimpleWallet>;

/**
 * 1 million as bigint.  Multiply by this a `Bigint` ADA value to get lovelace
 * @public
 * @example
 *    const three = 3n * ADA
 *    const four = Bigint(4) * ADA
 **/
export declare const ADA = 1000000n;

declare type addInputArgs = Parameters<Tx["addInput"]>;

/**
 * Renders an address in shortened bech32 form, with prefix and part of the bech32 suffix
 * @remarks
 * @param address - address
 * @public
 **/
export declare function addrAsString(address: Address): string;

declare type addRefInputArgs = Parameters<Tx["addRefInput"]>;

declare type addRefInputsArgs = Parameters<Tx["addRefInputs"]>;

export { Address }

/**
 * Adds a test helper class to a `vitest` testing context.
 * @remarks
 *
 * @param context -  a vitest context, typically created with StellarTestContext
 * @param TestHelperClass - typically created with DefaultCapoTestHelper
 * @param params - preset configuration for the contract under test
 * @public
 **/
export declare function addTestContext<SC extends StellarContract<any>, P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never>(context: StellarTestContext<any, SC>, TestHelperClass: stellarTestHelperSubclass<SC>, params?: P): Promise<void>;

/**
 * Token-based authority
 * @remarks
 *
 * Transferrable authority using a unique token and no smart-contract.
 *     Network,
 Wallet,

 * @public
 **/
export declare class AnyAddressAuthorityPolicy extends AuthorityPolicy {
    loadProgramScript(params: any): undefined;
    get delegateValidatorHash(): undefined;
    protected usingAuthority(): isActivity;
    /**
     * Finds the delegate authority token, normally in the delegate's contract address
     * @public
     * @remarks
     *
     * The default implementation finds the UTxO having the authority token
     * in the delegate's contract address.
     *
     * It's possible to have a delegate that doesn't have an on-chain contract script.
     * ... in this case, the delegate should use this.{@link StellarDelegate.tvAuthorityToken | tvAuthorityToken()} and a
     * delegate-specific heuristic to locate the needed token.  It might consult the
     * addrHint in its `configIn` or another technique for resolution.
     *
     * @param tcx - the transaction context
     * @reqt It MUST resolve and return the UTxO (a TxInput type ready for spending)
     *  ... or throw an informative error
     **/
    findAuthorityToken(): Promise<TxInput | undefined>;
    findActorAuthorityToken(): Promise<TxInput | undefined>;
    DelegateMustFindAuthorityToken(tcx: StellarTxnContext, label: string): Promise<TxInput>;
    txnReceiveAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, tokenValue: Value, fromFoundUtxo: TxInput): Promise<TCX>;
    DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, fromFoundUtxo: TxInput): Promise<TCX>;
    DelegateRetiresAuthorityToken(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
}

declare type anyDatumArgs = Record<string, any>;

/**
 * Properties for Datum structures for on-chain scripts
 * @public
 **/
export declare type anyDatumProps = Record<string, any>;

export declare type anyState = emptyState;

/**
 * Converts an array of [ policyId, ‹tokens› ] tuples for on-screen presentation
 * @remarks
 *
 * Presents policy-ids with shortened identifiers, and shows a readable & printable
 * representation of token names even if they're not UTF-8 encoded.
 * @public
 **/
export declare function assetsAsString(a: Assets): any;

/**
 * Generic class as base for pure authorization
 * @remarks
 *
 * This isn't different from StellarDelegate, but
 * using it as a base class more specific than "any delegate"
 * gives useful semantics for Capo's govAuthority role
 * @public
 **/
export declare abstract class AuthorityPolicy<T extends capoDelegateConfig = capoDelegateConfig> extends StellarDelegate<T> {
}

/**
 * Serves a delegated minting-policy role for Capo contracts
 * @remarks
 *
 * shifts detailed minting policy out of the minter and into the delegate.
 * @public
 **/
export declare class BasicMintDelegate extends StellarDelegate<MintDelegateArgs> {
    static currentRev: bigint;
    static get defaultParams(): {
        rev: bigint;
    };
    contractSource(): any;
    /**
     * specializedMintDelegate module for customizing policies atop the basic mint delegate
     * @public
     * @remarks
     *
     * The basic mint delegate contains an "unspecialized" implementation of this customization,
     * which doesn't have any special restrictions.  It reserves a CustomConfig field
     * at position 2 in the IsDelegation datum, allowing customizations to use any
     * struct in that position to express any custom configurations.
     **/
    get specializedMintDelegate(): HeliosModuleSrc;
    get specializedCapo(): HeliosModuleSrc;
    importModules(): HeliosModuleSrc[];
    get scriptDatumName(): string;
    get scriptActivitiesName(): string;
    getContractScriptParams(config: MintDelegateArgs): paramsBase;
    /**
     * Adds a mint-delegate-specific authority token to the txn output
     * @remarks
     *
     * Implements {@link StellarDelegate.txnReceiveAuthorityToken | txnReceiveAuthorityToken() }.
     *
     * Uses {@link BasicMintDelegate.mkDelegationDatum | mkDelegationDatum()} to make the inline Datum for the output.
     * @see {@link StellarDelegate.txnReceiveAuthorityToken | baseline txnReceiveAuthorityToken()'s doc }
     * @public
     **/
    txnReceiveAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, tokenValue: Value, fromFoundUtxo?: TxInput): Promise<TCX>;
    mkDelegationDatum(txin?: TxInput): Datum;
    txnCreatingTokenPolicy(tcx: StellarTxnContext, tokenName: string): Promise<StellarTxnContext<emptyState_3>>;
    static mkDelegateWithArgs(a: MintDelegateArgs): void;
}

declare type BasicMinterParams = SeedTxnParams & {
    capo: DefaultCapo<any, any, any>;
};

/**
 * Renders a byteArray in printable form, assuming it contains (mostly) text
 * @remarks
 *
 * Because it uses {@link hexToPrintableString()}, it will render any non-printable
 * characters using ‹hex› notation.
 * @param ba - the byte array
 * @public
 **/
export declare function byteArrayAsString(ba: ByteArray | ByteArrayData): string;

/**
 * Converts a list of ByteArrays to printable form
 * @remarks
 *
 * ... using {@link hexToPrintableString}
 * @public
 **/
export declare function byteArrayListAsString(items: ByteArray[] | ByteArrayData[], joiner?: string): string;

declare type canHaveRandomSeed = {
    randomSeed?: number;
};

declare type canHaveToken = TxInput | TxOutput | Assets;

declare type canSkipSetup = {
    skipSetup?: true;
};

/**
 * Base class for the leader of a set of contracts
 * @remarks
 *
 * A Capo contract provides a central contract address that can act as a treasury or data registry;
 * it can mint tokens using its connected minting-policy, and it can delegate policies to other contract
 * scripts.  Subclasses of Capo can use these capabilities in custom ways for strong flexibility.
 *
 * Any Capo contract can (and must) define delegateRoles() to establish collaborating scripts; these are used for
 * separating granular responsbilities for different functional purposes within your (on-chain and off-chain)
 * application; this approach enables delegates to use any one of multiple strategies with different
 * functional logic to serve in any given role, thus providing flexibility and extensibility.
 *
 * The delegation pattern uses UUTs, which are non-fungible / unique utility tokens.  See DefaultCapo for more about them.
 *
 * **Capo is a foundational class**; you should consider using DefaultCapo as a starting point,
 * unless its govAuthority role conflicts with your goals.
 *
 * Inherits from: {@link StellarContract}\<`configType`\> (is this a redundant doc entry?) .
 *
 * @typeParam minterType - allows setting a different contract (script & off-chain class) for the minting policy
 * @typeParam charterDatumType - specifies schema for datum information held in the Capo's primary or "charter" UTXO
 * @typeParam configType - specifies schema for details required to pre-configure the contract suite, or to reproduce it in a specific application instance.
 * @public
 */
export declare abstract class Capo<minterType extends MinterBaseMethods & DefaultMinter = DefaultMinter, charterDatumType extends anyDatumArgs = anyDatumArgs, configType extends CapoBaseConfig = CapoBaseConfig> extends StellarContract<configType> implements hasUutCreator {
    #private;
    abstract get delegateRoles(): RoleMap<any>;
    abstract verifyCoreDelegates(): Promise<any>;
    verifyConfigs(): Promise<any>;
    abstract mkFullConfig(baseConfig: CapoBaseConfig): configType;
    get isConfigured(): Promise<boolean>;
    _verifyingConfigs?: Promise<any>;
    static parseConfig(rawJsonConfig: any): void;
    constructor(args: StellarConstructorArgs<CapoBaseConfig>);
    static bootstrapWith(args: StellarConstructorArgs<CapoBaseConfig>): any;
    abstract contractSource(): HeliosModuleSrc;
    abstract mkDatumCharterToken(args: charterDatumType): InlineDatum;
    get minterClass(): stellarSubclass<DefaultMinter, BasicMinterParams>;
    minter?: minterType;
    txnWillMintUuts<const purposes extends string, existingTcx extends StellarTxnContext, const RM extends Record<ROLES, purposes>, const ROLES extends keyof RM & string = string & keyof RM>(initialTcx: existingTcx, uutPurposes: purposes[], seedUtxo: TxInput, roles?: RM): Promise<hasUutContext<ROLES | purposes> & existingTcx>;
    mkTxnMintingUuts<const purposes extends string, existingTcx extends StellarTxnContext, const RM extends Record<ROLES, purposes>, const ROLES extends keyof RM & string = string & keyof RM>(initialTcx: existingTcx, uutPurposes: purposes[], seedUtxo?: TxInput, roles?: RM): Promise<hasUutContext<ROLES | purposes> & existingTcx>;
    /**
     * returns a value representing the provided UUT(s)
     * @remarks
     *
     * The inputs can be of a few forms - see the overload variants
     * @param uutMap - a set of UUTs, all of which will be represented in the returned value
     * @param tcx - a transaction context, whose `state.uuts` will be processed as in the `uutMap` variant
     * @param uutName - a UutName object representinga single UUT
     * @public
     **/
    uutsValue(uutMap: uutPurposeMap<any>): Value;
    uutsValue(tcx: hasUutContext<any>): Value;
    uutsValue(uutName: UutName): Value;
    usingAuthority(): isActivity;
    protected abstract updatingCharter(args: charterDatumType): isActivity;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    importModules(): HeliosModuleSrc[];
    /**
     * Initiates a seeding transaction, creating a new Capo contract of this type
     * @remarks
     *
     * The returned transaction context has `state.bootstrappedConfig` for
     * capturing the details for reproducing the contract's settings and on-chain
     * address.
     *
     * @param charterDatumArgs - initial details for the charter datum
     * @param tcx - any existing transaction context
     * @typeParam TCX - inferred type of a provided transaction context
     * @public
     **/
    abstract mkTxnMintCharterToken<TCX extends StellarTxnContext>(charterDatumArgs: Partial<charterDatumType>, existingTcx?: TCX): Promise<never | (TCX & hasBootstrappedConfig<CapoBaseConfig & configType>)>;
    get charterTokenPredicate(): ((something: any) => any) & {
        value: Value;
    };
    tokenAsValue(tokenName: string | UutName, count?: bigint): Value;
    mustFindCharterUtxo(): Promise<TxInput>;
    abstract findGovDelegate(): Promise<AuthorityPolicy>;
    abstract txnAddGovAuthority<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX>;
    txnMustUseCharterUtxo<TCX extends StellarTxnContext>(tcx: TCX, redeemer: isActivity, newDatum?: InlineDatum): Promise<TCX>;
    txnMustUseCharterUtxo<TCX extends StellarTxnContext>(tcx: TCX, useReferenceInput: "refInput" | true): Promise<TCX>;
    txnUpdateCharterUtxo(tcx: StellarTxnContext, redeemer: isActivity, newDatum: InlineDatum): Promise<StellarTxnContext | never>;
    txnKeepCharterToken<TCX extends StellarTxnContext>(tcx: TCX, datum: InlineDatum): TCX;
    /**
     * Tries to locate the Capo charter's gov-authority token through its configured delegate
     * @remarks
     *
     * Uses the Capo's govAuthority delegate to locate the gov-authority token,
     * if available.  If that token is located in a smart contract, it should always be
     * found (note, however, that the current user may not have the direct permission
     * to spend the token in a transaction).
     *
     * If the token is located in a user wallet, and that user is not the contract's current
     * actor, then the token utxo will not be returned from this method.
     *
     * @public
     **/
    findGovAuthority(): Promise<TxInput | undefined>;
    /**
     * Tries to locate the Capo charter's gov-authority token in the user's wallet, using its configured delegate
     * @remarks
     *
     * Uses the Capo's govAuthority delegate to locate the gov-authority token,
     * if available the current user's wallet.
     *
     * A delegate whose authority token is located in a smart contract will always return `undefined`.
     *
     * If the authority token is in a user wallet (not the same wallet as currently connected to the Capo contract class),
     * it will return `undefined`.
     *
     * @public
     **/
    findActorGovAuthority(): Promise<TxInput | undefined>;
    /**
     * REDIRECT: Use txnAddGovAuthorityTokenRef to add the charter-governance authority token to a transaction,
     * or findGovAuthority() or findActorGovAuthority() for locating that txo.
     * @remarks
     *
     * this is a convenience method for redirecting developers to
     * find the right method name for finding or including a gov-authority token
     * in a transaction
     * @deprecated - see other method names, depending on what result you want
     * @public
     **/
    findCharterAuthority(): void;
    /**
     * REDIRECT: use txnAddGovAuthorityTokenRef() instead
     * @remarks
     *
     * this method was renamed.
     * @deprecated - look for txnAddGovAuthorityTokenRef() instead
     * @public
     **/
    txnAddCharterAuthorityTokenRef<TCX extends StellarTxnContext>(): Promise<void>;
    /**
     * adds the charter-token, along with its gov-authority UUT, to a transaction context
     * @remarks
     *
     * Uses txnAddGovAuthority() to locate the govAuthority delegate and txnGrantAuthority() to
     * add its authority token to a transaction.
     *
     * The charter-token is included as a reference input.
     *
     * @param tcx - the transaction context
     * @public
     **/
    txnAddGovAuthorityTokenRef<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX>;
    /**
     * provides minter-targeted params extracted from the input configuration
     * @remarks
     *
     * extracts the seed-txn details that are key to parameterizing the minter contract
     * @public
     **/
    getMinterParams(): {
        seedTxn: TxId;
        seedIndex: bigint;
    };
    getCapoRev(): bigint;
    /**
     * extracts from the input configuration the key details needed to construct/reconstruct the on-chain contract address
     * @remarks
     *
     * extracts the details that are key to parameterizing the Capo / leader's on-chain contract script
     * @public
     **/
    getContractScriptParams(config: configType): paramsBase & Partial<configType>;
    connectMinter(): minterType;
    get mph(): MintingPolicyHash;
    get mintingPolicyHash(): MintingPolicyHash;
    connectMintingScript(params: SeedTxnParams): minterType;
    /**
     * Finds a sufficient-sized utxo for seeding one or more named tokens
     * @remarks
     *
     * For allocating a charter token (/its minter), one or more UUTs, or other token name(s)
     * to be minted, this function calculates the size of minUtxo needed for all the needed tokens,
     * assuming they'll each be stored in separate utxos.  It then finds and returns a UTxO from the
     * current actor's wallet.  The utxo is NOT added to the transaction.
     *
     * When the transaction context already has some utxo's being consumed, they're not
     * eligible for selection.
     *
     * If the transaction doesn't store the new tokens in separate utxos, any spare lovelace
     * are returned as change in the transaction.
     *
     * @param tcx - transaction context
     * @param purpose - a descriptive purpose used during utxo-finding in case of problems
     * @param tokenNames - the token names to be seeded.
     * @public
     **/
    txnMustGetSeedUtxo(tcx: StellarTxnContext, purpose: string, tokenNames: string[]): Promise<TxInput | never>;
    mockMinter?: minterType;
    /**
     * Creates a new delegate link, given a delegation role and and strategy-selection details
     * @remarks
     *
     * Combines partal and implied configuration settings, validating the resulting configuration.
     *
     * The resulting "relative" delegate link can be used directly in a Datum field of type RelativeDelegateLink
     * or can be stored off-chain in any way suitable for your dApp.
     *
     * To get a full DelegateSettings object, use txnCreateDelegateSettings() instead.
     *
     * @reqt throws DelegateConfigNeeded with an `errors` entry
     *   ... if there are any problems in validating the net configuration settings.
     * @reqt EXPECTS the `tcx` to be minting a UUT for the delegation,
     *   ... whose UutName can be found in `tcx.state.uuts[roleName]`
     * @reqt combines base settings from the selected delegate class's `defaultParams`
     *   ... adding the delegateRoles()[roleName] configuration for the selected roleName,
     *   ... along with any explicit `config` from the provided `delegateInfo`
     *   ... and automatically applies a `uut` setting.
     *   ... The later properties in this sequence take precedence.
     *
     * @param tcx - A transaction-context
     * @param roleName - the role of the delegate, matched with the `delegateRoles()` of `this`
     * @param delegateInfo - partial detail of the delegation, with `strategyName` and any other
     *     details required by the particular role.  Its delegate type must be matchy with the type indicated by the `roleName`.
     * @public
     **/
    txnCreateDelegateLink<DT extends StellarDelegate, const RN extends string>(tcx: hasUutContext<RN>, roleName: RN, delegateInfo?: MinimalDelegateLink<DT>): Promise<RelativeDelegateLink<DT>>;
    relativeLink<DT extends StellarDelegate<any>>(configured: ConfiguredDelegate<DT>): RelativeDelegateLink<DT>;
    /**
     * Generates and returns a complete set of delegate settings, given a delegation role and strategy-selection details.
     * @remarks
     *
     * Maps the indicated delegation role to specific UUT details from the provided transaction-context
     * to provide the resulting settings.  The transaction context isn't modified.
     *
     * Behaves exactly like (and provides the core implementation of) {@link Capo.txnCreateDelegateLink | txnCreateDelegateLink()},
     * returning additional `roleName` and `delegateClass`, to conform with the DelegateSettings type.
     *
     * See txnCreateDelegateLink for further details.
     * @public
     **/
    txnCreateConfiguredDelegate<DT extends StellarDelegate<any>, const RN extends string>(tcx: hasUutContext<RN>, roleName: RN & keyof this["delegateRoles"], delegateInfo?: MinimalDelegateLink<DT>): ConfiguredDelegate<DT>;
    mkImpliedDelegationDetails(uut: UutName): DelegationDetail;
    connectDelegateWithLink<DelegateType extends StellarDelegate<any>, configType extends (DelegateType extends StellarContract<infer c> ? c : paramsBase) = DelegateType extends StellarContract<infer c> ? c : paramsBase>(roleName: string, delegateLink: RelativeDelegateLink<DelegateType>): Promise<DelegateType>;
    private showDelegateLink;
    mustGetDelegate<T extends StellarDelegate<any>>(configuredDelegate: PreconfiguredDelegate<T>): T;
    tvForDelegate(dgtLink: RelativeDelegateLink<any>): Value;
    mkDelegatePredicate(dgtLink: RelativeDelegateLink<any>): ((something: any) => any) & {
        value: Value;
    };
    capoRequirements(): ReqtsMap_3<"is a base class for leader/Capo pattern" | "can create unique utility tokens" | "supports the Delegation pattern using roles and strategy-variants" | "supports well-typed role declarations and strategy-adding" | "supports just-in-time strategy-selection using txnCreateDelegateLink()" | "given a configured delegate-link, it can create a ready-to-use Stellar subclass with all the right settings" | "supports concrete resolution of existing role delegates" | "Each role uses a RoleVariants structure which can accept new variants" | "provides a Strategy type for binding a contract to a strategy-variant name">;
}

declare type CapoBaseConfig = paramsBase & rootCapoConfig & SeedTxnParams & {
    mph: MintingPolicyHash;
    rev: bigint;
    bootstrapping?: true;
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
export declare type capoDelegateConfig = paramsBase & {
    capoAddr: Address;
    mph: MintingPolicyHash;
    tn: number[];
    rev: bigint;
    addrHint: Address[];
};

/**
 * Base class for test helpers for Capo contracts
 * @remarks
 *
 * Unless you have a custom Capo not based on DefaultCapo, you
 * should probably use DefaultCapoTestHelper instead of this class.
 * @public
 **/
export declare abstract class CapoTestHelper<SC extends Capo<DefaultMinter & MinterBaseMethods, CDT, CT>, CDT extends anyDatumArgs = SC extends Capo<DefaultMinter, infer iCDT> ? iCDT : anyDatumArgs, //prettier-ignore
CT extends CapoBaseConfig = SC extends Capo<any, any, infer iCT> ? iCT : never> extends StellarTestHelper<SC> {
    initialize({ randomSeed, config, }?: {
        config?: CT;
        randomSeed?: number;
    }): Promise<SC>;
    get ready(): boolean;
    bootstrap(args?: MinimalDefaultCharterDatumArgs): Promise<SC | undefined>;
    abstract mkDefaultCharterArgs(): Partial<MinimalDefaultCharterDatumArgs<any>>;
    abstract mintCharterToken(args?: MinimalDefaultCharterDatumArgs<any>): Promise<hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt"> & hasBootstrappedConfig<CapoBaseConfig>>;
}

/**
 * @public
 * Extracts the config type for a Stellar Contract class
 **/
export declare type ConfigFor<SC extends StellarContract<C>, C extends paramsBase = SC extends StellarContract<infer inferredConfig> ? inferredConfig : never> = C;

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
export declare type ConfiguredDelegate<DT extends StellarDelegate<any>> = {
    delegateClass: stellarSubclass<DT>;
    delegate: DT;
    roleName: string;
    config: ConfigFor<DT>;
} & RelativeDelegateLink<DT>;

export { Datum }

/**
 * Decorates datum-building functions
 * @remarks
 *
 * function names must follow the mkDatum... convention.
 *
 * The function should accept a single argument with input type
 * that feels Typescripty, and that can be fit to the on-chain type of
 * the underlying Datum variant of the given name.
 *
 * @public
 **/
export declare function datum(proto: any, thingName: any, descriptor: any): any;

/**
 * converts a Datum to a printable summary
 * @remarks
 *
 * using shortening techniques for the datumHash
 * @public
 **/
export declare function datumAsString(d: Datum | null | undefined): string;

declare const DatumInline: typeof Datum.inline;

/**
 * Base class for leader contracts, with predefined roles for delegating governance authority and minting policies
 * @remarks
 *
 *  * A Capo contract provides a central contract address that can act as a treasury or data registry;
 * it can mint tokens using its connected minting-policy, and it can delegate policies to other contract
 * scripts.  Subclasses of Capo can use these capabilities in custom ways for strong flexibility.

 * Subclass and customize DefaultCapo's type-parameters if you need to customize further.
 *
 * Any Capo contract can (and must) define roles() to establish collaborating scripts; these are used for
 * separating granular responsbilities for different functional purposes within your (on-chain and off-chain)
 * application; this approach enables delegates to use any one of multiple strategies with different
 * functional logic to serve in any given role, thus providing flexibility and extensibility.
 *
 * DefaultCapo provides roles for govAuthority and mintDelegate, and methods to facilitate
 * the lifecycle of charter creation & update.
 *
 * **Example: Multisig authority delegation** - a Capo contract would get much more complicated if it
 * contained multisig logic.  Instead, the governance authority for the Capo can be delegated to a
 * standalone multi-sig contract, which can contain all (and only) the multi-sig logic.  Separating the
 * responsibilities makes each part simpler, easing the process of ensuring each part is doing its job
 * perfectly :pray:
 *
 * A Capo subclass can decorate an existing entry from `super.roles()` with additional strategy entries, or can add
 * extra roles useful in the operation of its application.
 *
 * The Capo base class provides utilities for creating and using UUT's, or **unique utility tokens**,
 * which are non-fungible assets that can form a positive linkage between the Capo (which should
 * normally retain a reference to that UUT) and any delegate; that delegate is most commonly another
 * contract script also referenced within the roles() definition, with a selected strategy.
 *
 * Architecturally, UUTs provide a simple and unique handle for the Capo to use as a  **required transaction element**
 * in key operational activities (like updating the charter details); so that the delegate holding the UUT is entrusted to
 * approved the UUT's inclusion in a transaction, with all the policy-enforcement implicated on the other end of the
 * delegation.
 *
 * Customizing Datum and Activity
 *
 * The baseline contract script can have specialized Datum and Activity ("redeemer")
 * definitions by subclassing DefaultCapo with a `get specializedCapo()`.  This
 * should be an imported helios script having `module specializedCapo` at the top.
 * It MUST export Datum and Activity enums, with variants matching those in the provided
 * baseline/unspecializedCapo module.
 *
 * A customized Datum::validateSpend(self, ctx) -\> Bool method
 * should be defined, even if it doesn't put constraints on spending Datum.
 * If it does choose to add hard constraints, note that this method doesn't
 * have access to the Activity ("redeemer") type.  It's a simple place to express simple
 * constraints on spending a custom Datum that only needs one 'spendingDatum'
 * activity.
 *
 * A customized Activity: allowActivity(self, datum, ctx) -\> Bool method
 * has access to both the redeemer (in self), as well as Datum and the transaction
 * context.  In this method, use self.switch\{...\} to implement activity-specific
 * validations.
 *
 * See the {@link Capo | Capo base class} and {@link StellarContract} for addition context.
 * @public
 */
export declare class DefaultCapo<MinterType extends DefaultMinter = DefaultMinter, CDT extends DefaultCharterDatumArgs = DefaultCharterDatumArgs, configType extends CapoBaseConfig = CapoBaseConfig> extends Capo<MinterType, CDT, configType> {
    contractSource(): any;
    static parseConfig(rawJsonConfig: any): any;
    /**
     * indicates any specialization of the baseline Capo types
     * @remarks
     *
     * The default implementation is an UnspecialiedCapo, which
     * you can use as a template for your specialized Capo.
     *
     * Every specalization MUST include Datum and Activity ("redeemer") enums,
     * and MAY include additional functions, and methods on Datum / Activity.
     *
     * The datum SHOULD have a validateSpend(self, datum, ctx) method.
     *
     * The redeemer SHOULD have an allowActivity(self, datum, ctx) method.
     *
     * @public
     **/
    get specializedCapo(): HeliosModuleSrc;
    /**
     * indicates any specialization of the baseline Capo types
     * @remarks
     *
     * The default implementation is an UnspecialiedCapo, which
     * you can use as a template for your specialized Capo.
     *
     * Every specalization MUST include Datum and  Activity ("redeemer") enums,
     * and MAY include additional functions, and methods on Datum / Activity.
     *
     * The datum enum SHOULD have a validateSpend(self, datum, ctx) method.
     *
     * The activity enum SHOULD have an allowActivity(self, datum, ctx) method.
     *
     * @public
     **/
    get capoHelpers(): HeliosModuleSrc;
    importModules(): HeliosModuleSrc[];
    /**
     * Use the `delegateRoles` getter instead
     * @remarks
     *
     * this no-op method is a convenience for Stellar Contracts maintainers
     * and intuitive developers using autocomplete.  Including it enables an entry
     * in VSCode "Outline" view, which doesn't include the delegateRoles getter : /
     * @deprecated but please keep as a kind of redirect
     * @public
     **/
    getDelegateRoles(): void;
    get delegateRoles(): RoleMap_2<    {
    readonly govAuthority: RoleInfo<StellarContract<any>, {
    readonly address: {
    readonly delegateClass: typeof AnyAddressAuthorityPolicy;
    readonly validateConfig: (args: any) => strategyValidation;
    };
    readonly multisig: {
    readonly delegateClass: typeof MultisigAuthorityPolicy;
    readonly validateConfig: (args: any) => strategyValidation;
    };
    }, "capoGov", "address" | "multisig">;
    readonly mintDelegate: RoleInfo<StellarContract<any>, {
    readonly default: {
    readonly delegateClass: typeof BasicMintDelegate;
    readonly partialConfig: {};
    readonly validateConfig: (args: any) => strategyValidation;
    };
    }, "mintDgt", "default">;
    }>;
    /**
     * Performs a validation of all critical delegate connections
     * @remarks
     *
     * Checks that each delegate connection is correct and that the underlying
     * scripts for those delegates have not been modified in unplanned ways.
     *
     * Every Capo subclass that adds new delegate types SHOULD implement
     * this method, performing any checks needed to verify the scripts underlying
     * those delegate-types.  It should return `Promise.all([ super(), ...myOwnChecks])`.
     * @public
     **/
    verifyCoreDelegates(): Promise<[AuthorityPolicy<capoDelegateConfig_2>, BasicMintDelegate]>;
    mkOnchainDelegateLink(dl: RelativeDelegateLink<any>): any;
    mkDatumCharterToken(args: CDT): InlineDatum;
    findCharterDatum(): Promise<DefaultCharterDatumArgs>;
    findGovDelegate(): Promise<AuthorityPolicy<capoDelegateConfig_2>>;
    txnAddGovAuthority<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX>;
    /**
     * should emit a complete configuration structure that can reconstitute a contract (suite) after its first bootstrap transaction
     * @remarks
     *
     * mkFullConfig is called during a bootstrap transaction.  The default implementation works
     * for subclasses as long as they use CapoBaseConfig for their config type.  Or, if they're
     * instantiated with a partialConfig that augments CapoBaseConfig with concrete details that
     * fulfill their extensions to the config type.
     *
     * If you have a custom mkBootstrapTxn() that uses techniques to explicitly add config
     * properties not provided by your usage of `partialConfig` in the constructor, then you'll
     * need to provide a more specific impl of mkFullConfig().  It's recommended that you
     * call super.mkFullConfig() from your impl.
     * @param baseConfig - receives the BaseConfig properties: mph, seedTxn and seedIndex
     * @public
     **/
    mkFullConfig(baseConfig: CapoBaseConfig): CapoBaseConfig & configType & rootCapoConfig;
    mkTxnMintingUuts<const purposes extends string, existingTcx extends StellarTxnContext, const RM extends Record<ROLES, purposes>, const ROLES extends keyof RM & string = string & keyof RM>(initialTcx: existingTcx, uutPurposes: purposes[], seedUtxo?: TxInput | undefined, roles?: RM): Promise<hasUutContext<ROLES | purposes> & existingTcx>;
    getMintDelegate(): Promise<BasicMintDelegate>;
    getGovDelegate(): Promise<AuthorityPolicy<capoDelegateConfig_2>>;
    txnAddMintDelegate<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX>;
    /**
     * {@inheritdoc Capo.mkTxnMintCharterToken}
     * @public
     **/
    mkTxnMintCharterToken<TCX extends StellarTxnContext>(charterDatumArgs: MinimalDefaultCharterDatumArgs<CDT>, existingTcx?: TCX): Promise<never | (hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt"> & TCX & hasBootstrappedConfig<CapoBaseConfig & configType>)>;
    updatingCharter(): isActivity;
    mkTxnUpdateCharter(args: CDT, tcx?: StellarTxnContext): Promise<StellarTxnContext>;
    requirements(): ReqtsMap_3<"the trustee group can be changed" | "positively governs all administrative actions" | "has a unique, permanent charter token" | "has a unique, permanent treasury address" | "the trustee threshold is enforced on all administrative actions" | "the charter token is always kept in the contract" | "can mint other tokens, on the authority of the Charter token" | "has a singleton minting policy" | "foo">;
}

/**
 * Test helper for classes extending DefaultCapo
 * @remarks
 *
 * Arranges an test environment with predefined actor-names having various amounts of ADA in their (emulated) wallets,
 * and default helpers for setting up test scenarios.  Provides a simplified framework for testing Stellar contracts extending
 * the DefaultCapo class.
 *
 * To use it, you MUST extend DefaultCapoTestHelper<YourStellarCapoClass>.
 *
 * You MUST also implement a getter  for stellarClass, returning the specific class for YourStellarCapoClass
 *
 * You SHOULD also implement a setupActors method to arrange named actors for your test scenarios.
 * It's recommended to identify general roles of different people who will interact with the contract, and create
 * one or more actor names for each role, where the actor names start with the same letter as the role-names.
 * For example, a set of Trustees in a contract might have actor names tina, tracy and tom, while
 * unprivileged Public users might have actor names like pablo and peter.  setupActors() also
 * should pre-assign some ADA funds to each actor: e.g. `this.addActor(‹actorName›, 142n * ADA)`
 *
 * @typeParam DC - the specific DefaultCapo subclass under test
 * @public
 **/
export declare class DefaultCapoTestHelper<DC extends DefaultCapo<DefaultMinter, CDT, CT> = DefaultCapo, //prettier-ignore
CDT extends DefaultCharterDatumArgs = DC extends Capo<DefaultMinter, infer iCDT> ? iCDT : DefaultCharterDatumArgs, //prettier-ignore
CT extends CapoBaseConfig = DC extends Capo<any, any, infer iCT> ? iCT : never> extends CapoTestHelper<DC, CDT, CT> {
    /**
     * Creates a prepared test helper for a given Capo class, with boilerplate built-in
     *
     * @remarks
     *
     * You may wish to provide an overridden setupActors() method, to arrange actor
     * names that fit your project's user-roles / profiles.
     *
     * You may also wish to add methods that satisfy some of your application's key
     * use-cases in simple predefined ways, so that your automated tests can re-use
     * the logic and syntax instead of repeating them in multiple test-cases.
     *
     * @param s - your Capo class that extends DefaultCapo
     * @typeParam DC - no need to specify it; it's inferred from your parameter
     * @public
     **/
    static forCapoClass<DC extends DefaultCapo<DefaultMinter, any, any>>(s: stellarSubclass<DC>): DefaultCapoTestHelperClass<DC>;
    get stellarClass(): stellarSubclass<DC>;
    setupActors(): void;
    mkCharterSpendTx(): Promise<StellarTxnContext>;
    mkDefaultCharterArgs(): Partial<MinimalDefaultCharterDatumArgs<CDT>>;
    mintCharterToken(args?: MinimalDefaultCharterDatumArgs<CDT>): Promise<hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt"> & hasBootstrappedConfig<CapoBaseConfig>>;
    updateCharter(args: CDT): Promise<StellarTxnContext>;
}

export declare type DefaultCapoTestHelperClass<SC extends DefaultCapo<any, any, any>> = new (config: ConfigFor<SC> & canHaveRandomSeed) => StellarTestHelper<SC> & DefaultCapoTestHelper<SC> & {
    stellarClass: stellarSubclass<SC>;
};

/**
 * Schema for Charter Datum, which allows state to be stored in the Leader contract
 * together with it's primary or "charter" utxo.
 * @public
 **/
export declare type DefaultCharterDatumArgs = {
    govAuthorityLink: RelativeDelegateLink<AuthorityPolicy>;
    mintDelegateLink: RelativeDelegateLink<BasicMintDelegate>;
};

/**
 * A basic minting validator serving a Capo's family of contract scripts
 * @remarks
 *
 * Mints charter tokens based on seed UTxOs.  Can also mint UUTs and
 * other tokens as approved by the Capo's minting delegate.
 * @public
 **/
export declare class DefaultMinter extends StellarContract<BasicMinterParams> implements MinterBaseMethods {
    contractSource(): any;
    getContractScriptParams(config: BasicMinterParams): paramsBase & SeedTxnParams;
    importModules(): HeliosModuleSrc[];
    txnWillMintUuts<const purposes extends string, existingTcx extends StellarTxnContext, const RM extends Record<ROLES, purposes>, const ROLES extends string & keyof RM = string & keyof RM>(tcx: existingTcx, uutPurposes: purposes[], seedUtxo: TxInput, roles?: RM): Promise<hasUutContext<ROLES | purposes> & existingTcx>;
    mkTxnMintingUuts<const purposes extends string, existingTcx extends StellarTxnContext, const RM extends Record<ROLES, purposes>, const ROLES extends keyof RM & string = string & keyof RM>(initialTcx: existingTcx, uutPurposes: purposes[], seedUtxo?: TxInput, roles?: RM): Promise<hasUutContext<ROLES | purposes> & existingTcx>;
    get mintingPolicyHash(): MintingPolicyHash;
    protected mintingCharter({ owner }: MintCharterActivityArgs): isActivity;
    protected mintingUuts({ seedTxn, seedIndex: sIdx, purposes, }: MintUutActivityArgs): isActivity;
    get charterTokenAsValuesEntry(): valuesEntry;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    txnMintingCharter<TCX extends StellarTxnContext>(tcx: TCX, { owner, capoGov, mintDgt, }: {
        owner: Address;
        capoGov: UutName;
        mintDgt: UutName;
    }): Promise<TCX>;
}

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
export declare function defineRole<const UUTP extends string, SC extends StellarContract<any>, const VMv extends RoleInfo_2<SC, any, UUTP>["variants"]>(uutBaseName: UUTP, baseClass: stellarSubclass<SC> & any, variants: VMv): RoleInfo_2<SC, VMv, UUTP>;

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
export declare function delegateRoles<const RM extends RoleMap<any>>(roleMap: RM): RoleMap<RM>;

/**
 * Captures normal details of every delegate relationship
 * @remarks
 *
 * Includes the address of the leader contract, its minting policy, and the token-name
 * used for the delegate
 * @public
 **/
declare type DelegationDetail = {
    capoAddr: Address;
    mph: MintingPolicyHash;
    tn: number[];
};

/**
 * Converts any (supported) input arg to string
 * @remarks
 *
 * more types to be supported TODO
 * @public
 **/
export declare function dumpAny(x: Tx | StellarTxnContext | Address | Value | TxOutput | TxInput | TxInput[] | TxId | ByteArray | ByteArray[] | ByteArrayData | ByteArrayData[]): string;

export declare type emptyState = {
    uuts: Record<string, UutName>;
};

declare type enhancedNetworkParams = NetworkParams & {
    slotToTimestamp(n: bigint): Date;
};

/**
 * Reveals errors found during delegate selection
 * @remarks
 *
 * Each field name is mapped to an array of string error messages found on that field.
 * @public
 **/
export declare type ErrorMap = Record<string, string[]>;

/**
 * Converts an Errors object to a string for onscreen presentation
 * @public
 **/
export declare function errorMapAsString(em: ErrorMap, prefix?: string): string;

/**
 * used for transaction-context state having specific uut-purposes
 *
 * @public
 */
export declare type hasAllUuts<uutEntries extends string> = {
    uuts: uutPurposeMap<uutEntries>;
};

/**
 * StellarTransactionContext exposing a bootstrapped Capo configuration
 * @remarks
 *
 * During first-time setup of a Capo contract, its manifest configuration details
 * should be captured for reproducibility, and this type allows the bootstrap
 * transaction to expose that configuration.
 *
 * Capo's {@link Capo.mkTxnMintCharterToken | mkTxnMintCharterToken()} returns a transaction context
 * of this type, with `state.bootstrappedConfig`;
 * @public
 **/
export declare type hasBootstrappedConfig<CT extends CapoBaseConfig> = StellarTxnContext<{
    bsc: CT;
    uuts: uutMap;
    bootstrappedConfig: any;
}>;

/**
 * Factory for type-safe requirements details for a unit of software
 * @remarks
 *
 * return `hasReqts({... requirements})` from a requirements() or other method in a class, to express
 * requirements using a standardized form that supports arbitrary amounts of detailed requirements
 * with references to unit-test labels that can verify the impl details.
 *
 * You don't need to provide the type params or TS type annotations.  `requirements() { return hasReqts({...yourReqts}) }` will work fine.
 *
 * See the {@link ReqtsMap} and {@link RequirementEntry} types for more details about expressing requirements.
 *
 * NOTE: Type parameters are inferred from the provided data structure
 * @param reqtsMap - the ReqtsMap structure for the software unit
 * @public
 **/
export declare function hasReqts<R extends ReqtsMap<validReqts>, const validReqts extends string = string & keyof R>(reqtsMap: R): ReqtsMap<validReqts>;

export declare namespace hasReqts {
    var TODO: unique symbol;
}

/**
 * A txn context having specifically-purposed UUTs in its state
 *
 * @public
 */
export declare type hasUutContext<uutEntries extends string> = StellarTxnContext<hasAllUuts<uutEntries>>;

/**
 * the uut-factory interface
 *
 * @public
 */
declare interface hasUutCreator {
    txnWillMintUuts<const purposes extends string, existingTcx extends StellarTxnContext, const RM extends Record<ROLES, purposes>, const ROLES extends keyof RM & string = string & keyof RM>(initialTcx: existingTcx, uutPurposes: purposes[], seedUtxo: TxInput, roles?: RM): Promise<hasUutContext<ROLES | purposes> & existingTcx>;
    mkTxnMintingUuts<const purposes extends string, existingTcx extends StellarTxnContext, const RM extends Record<ROLES, purposes>, const ROLES extends keyof RM & string = string & keyof RM>(initialTcx: existingTcx, uutPurposes: purposes[], seedUtxo?: TxInput, roles?: RM): Promise<hasUutContext<ROLES | purposes> & existingTcx>;
}

export { helios }

/**
 * Properties for a Helios source file
 * @public
 **/
export declare type HeliosModuleSrc = string & {
    srcFile: string;
    purpose: string;
    moduleName: string;
};

/**
 * Rollup loader for Helios source files
 * @public
 **/
export declare function heliosRollupLoader(opts?: {
    include: string;
    exclude: never[];
}): {
    name: string;
    transform(content: any, id: any): {
        code: string;
        map: {
            mappings: string;
        };
    } | undefined;
};

/**
 * converts a hex string to a printable alternative, with no assumptions about the underlying data
 * @remarks
 *
 * Unlike Helios' bytesToText, hexToPrintable() simply changes printable characters to characters,
 * and represents non-printable characters in '‹XX›' format.
 * @param ‹pName› - descr
 * @typeParam ‹pName› - descr (for generic types)
 * @public
 **/
export declare function hexToPrintableString(hexStr: any): string;

/**
 * Inline Datum for contract outputs
 * @public
 **/
export declare type InlineDatum = ReturnType<typeof DatumInline>;

export declare const insufficientInputError: RegExp;

/**
 * a type for redeemer/activity-factory functions declared with \@Activity.redeemer
 *
 * @public
 */
export declare type isActivity = {
    redeemer: UplcDataValue | UplcData;
};

/**
 * Converts lovelace to approximate ADA, in consumable 3-decimal form
 * @public
 **/
export declare function lovelaceToAda(l: bigint | number): string;

/**
 * Establishes minimum requirements for creating a charter-datum
 * @remarks
 *
 * requires a baseline configuration for the gov authority and mint delegate.
 *
 * @typeParam DAT - a charter-datum type that may have additional properties in case of advanced extensions to DefaultCapo.
 * @public
 **/
declare type MinimalDefaultCharterDatumArgs<DAT extends DefaultCharterDatumArgs = DefaultCharterDatumArgs> = {
    govAuthorityLink: MinimalDelegateLink<AuthorityPolicy>;
    mintDelegateLink?: MinimalDelegateLink<BasicMintDelegate>;
};

/**
 * Includes key details needed to create a delegate link
 * @remarks
 *
 * Requires a `strategyName` and may include a partial `config` for the targeted SC contract type
 *
 * Because delegates can be of different subtypes, the SC and `config` are typically
 * generic at the type level.  When using the `config` entry for a specific delegate subtype,
 * additional details might be needed (not expected to be the norm).
 *
 * uutName can't be specified in this structure because creating a delegate link
 * should use txnMustGetSeedUtxo() instead, minting a new UUT for the purpose.
 * If you seek to reuse an existing uutName, probably you're modifying an existing
 * full RelativeDelegateLink structure instead - e.g. with a different `strategy` and
 * `config`; this type wouldn't be involved in that case.
 *
 * @typeParam SC - the type of StellarContract targeted for delegation
 * @public
 **/
declare type MinimalDelegateLink<SC extends StellarDelegate<any>> = Required<Pick<RelativeDelegateLink<SC>, "strategyName">> & Partial<Omit<RelativeDelegateLink<SC>, "uutName">>;

declare type MintCharterActivityArgs<T = {}> = T & {
    owner: Address;
};

declare type MintDelegateArgs = capoDelegateConfig & {
    rev: bigint;
};

/**
 * charter-minting interface
 *
 * @public
 */
declare interface MinterBaseMethods extends hasUutCreator {
    get mintingPolicyHash(): MintingPolicyHash;
    txnMintingCharter<TCX extends StellarTxnContext>(tcx: TCX, charterMintArgs: {
        owner: Address;
        capoGov: UutName;
    }, tVal: valuesEntry): Promise<TCX>;
}

/**
 * UUT minting should always use these settings to guard for uniqueness
 *
 * @public
 */
export declare type MintUutActivityArgs = {
    seedTxn: TxId;
    seedIndex: bigint | number;
    purposes: string[];
};

/**
 * Creates a String object from Helios source code, having additional properties about the helios source
 * @remarks
 *
 * `srcFile`, `purpose`, and `moduleName` are parsed from the Helios source string using a simple regular expression.
 * @public
 **/
export declare function mkHeliosModule(src: string, filename: string): HeliosModuleSrc;

/**
 * Creates Value-creation entires for a list of uuts
 * @remarks
 *
 * returns a list of `entries` usable in Value's `[mph, entries[]]` tuple.
 * @param uuts - a list of {@link UutName}s or a {@link uutPurposeMap}
 * @public
 **/
export declare function mkUutValuesEntries(uuts: UutName[]): valuesEntry[];

/** @public **/
export declare function mkUutValuesEntries(uuts: uutPurposeMap<any>): valuesEntry[];

/**
 * Creates a tuple usable in a Value, converting token-name to byte-array if needed
 * @public
 **/
export declare function mkValuesEntry(tokenName: string | number[], count: bigint): valuesEntry;

declare class MultisigAuthorityPolicy extends AuthorityPolicy {
    static currentRev: bigint;
    static get defaultParams(): {
        rev: bigint;
    };
    contractSource(): any;
    txnReceiveAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, val: Value, fromFoundUtxo?: TxInput | undefined): Promise<TCX>;
    DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, fromFoundUtxo: TxInput): Promise<TCX>;
    DelegateRetiresAuthorityToken(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
    requirements(): ReqtsMap_2<"provides arms-length proof of authority to any other contract" | "positively governs spend of the UUT" | "the trustee threshold is required to spend its UUT" | "the trustee group can be changed" | "TODO: has a unique authority UUT" | "TODO: the trustee threshold is required to spend its UUT" | "TODO: the trustee group can be changed">;
}

export { Network }

declare type NetworkName = "testnet" | "mainnet";

/**
 * Configuration details for StellarContract classes
 * @public
 **/
export declare type paramsBase = Record<string, any>;

declare type PartialParamConfig<CT extends paramsBase> = Partial<CT>;

/**
 * decorates functions that increment a transaction by adding needed details for a use-case
 * @remarks
 *
 * Function names must follow the txn\{...\} naming convention. Typical partial-transaction names
 * may describe the semantics of how the function augments the transaction.
 * `txnAddSignatures` or `txnReceivePayment` could be example names following
 * this guidance
 *
 * Partial transactions should have a \<TCX extends StellarTxnContext\<...\>\> type parameter,
 * matched to its first function argument, and should return a type extending that same TCX,
 * possibly with additional StellarTxnContext\<...\> type info.
 *
 * The TCX constraint can specify key requirements for an existing transaction context when
 * that's relevant.
 *
 * @public
 **/
export declare function partialTxn(proto: any, thingName: any, descriptor: any): any;

export declare function policyIdAsString(p: MintingPolicyHash): string;

declare type PreconfiguredDelegate<T extends StellarDelegate<any>> = Omit<ConfiguredDelegate<T>, "delegate" | "delegateValidatorHash">;

declare type RedeemerArg = {
    redeemer: _redeemerArg;
};

declare type _redeemerArg = addInputArgs[1];

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
export declare type RelativeDelegateLink<DT extends StellarDelegate<any>> = {
    uutName: string;
    strategyName: string;
    config: Partial<ConfigFor<DT>>;
    delegateValidatorHash?: ValidatorHash;
};

/**
 * Describes the requirements for a unit of software
 * @remarks
 *
 * A requirements map is a list of described requirements, in which each requirement
 * has a synopsis, a description of its purpose, descriptive detail, and technical requirements
 * for the mechanism used for implementation.  The mech strings should be usable as unit-test titles.
 *
 * use the hasReqts() helper method to declare a type-safe set of requirements following this data structure.
 *
 * Each requirement also has space for nested 'requires', without the need for deeply nested data structures;
 * these reference other requirements in the same hasReqts() data structure. As a result, high-level and detail-
 * level requirements and 'impl' details can have progressive levels of detail.
 *
 * @typeParam reqts - the list of known requirement names.  Implicitly detected by the hasReqts() helper.
 * @public
 **/
export declare type ReqtsMap<validReqts extends string> = {
    [reqtDescription in validReqts]: TODO_TYPE | RequirementEntry<validReqts>;
};

/**
 * Documents one specific requirement
 * @remarks
 *
 * Describes the purpose, details, and implementation mechanism for a single requirement for a unit of software.
 *
 * Also references any other requirements in the host ReqtsMap structure, whose behavior this requirement
 * depends on.  The details of those other dependencies, are delegated entirely to the other requirement, facilitating
 * narrowly-focused capture of for key expectations within each individual semantic expectation of a software unit's
 * behavior.
 *
 * @typeParam reqts - constrains `requires` entries to the list of requirements in the host ReqtsMap structure
 * @public
 **/
export declare type RequirementEntry<reqts extends string> = {
    purpose: string;
    details: string[];
    mech: string[];
    impl?: string;
    requires?: reqts[];
};

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
declare type RoleInfo_2<SC extends StellarContract<any>, VM extends Record<variants, VariantStrategy<SC>>, UUTP extends string, variants extends string = string & keyof VM> = {
    uutPurpose: UUTP;
    baseClass: stellarSubclass<SC>;
    variants: {
        [variant in variants]: VM[variant];
    };
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
export declare type RoleMap<KR extends Record<string, RoleInfo_2<any, any, any, any>>> = {
    [roleName in keyof KR]: KR[roleName];
};

declare type rootCapoConfig = {
    rootCapoScriptHash?: ValidatorHash;
};

declare type scriptPurpose = "testing" | "minting" | "spending" | "staking" | "module" | "endpoint";

/**
 * details of seed transaction
 * @public
 **/
export declare type SeedTxnParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};

/**
 * standard setup for any Stellar Contract class
 * @public
 **/
declare type SetupDetails = {
    network: Network;
    networkParams: NetworkParams;
    isMainnet?: boolean;
    myActor?: Wallet;
    isTest?: boolean;
    isDev?: boolean;
    optimize?: boolean;
};

export { StakeAddress }

export { StakingValidatorHash }

/**
 * Initializes a stellar contract class
 * @remarks
 *
 * Includes network and other standard setup details, and any configuration needed
 * for the specific class.
 * @public
 **/
export declare type StellarConstructorArgs<CT extends paramsBase> = {
    setup: SetupDetails;
    config?: CT;
    partialConfig?: Partial<CT>;
};

export declare class StellarContract<ConfigType extends paramsBase> {
    scriptProgram?: Program;
    configIn?: ConfigType;
    partialConfig?: Partial<ConfigType>;
    contractParams?: paramsBase;
    setup: SetupDetails;
    network: Network;
    networkParams: NetworkParams;
    myActor?: Wallet;
    static get defaultParams(): {};
    static parseConfig(rawJsonConfig: any): void;
    /**
     * returns the wallet connection used by the current actor
     * @remarks
     *
     * Throws an error if the strella contract facade has not been initialized with a wallet in settings.myActor
     * @public
     **/
    get wallet(): helios.Wallet;
    getContractScriptParams(config: ConfigType): paramsBase & Partial<ConfigType>;
    delegateReqdAddress(): false | Address;
    delegateAddrHint(): Address[] | undefined;
    walletNetworkCheck?: Promise<NetworkName> | NetworkName;
    constructor(args: StellarConstructorArgs<ConfigType>);
    compiledScript: UplcProgram;
    get datumType(): any;
    /**
     * @internal
     **/
    _purpose?: scriptPurpose;
    get purpose(): scriptPurpose | "non-script";
    get address(): Address;
    get mintingPolicyHash(): MintingPolicyHash | undefined;
    get identity(): string;
    outputsSentToDatum(datum: InlineDatum): Promise<TxInput[]>;
    totalValue(utxos: TxInput[]): Value;
    /**
     * Returns the indicated Value to the contract script
     * @public
     * @param tcx - transaction context
     * @param value - a value already having minUtxo calculated
     * @param datum - inline datum
     **/
    txnKeepValue(tcx: StellarTxnContext, value: Value, datum: InlineDatum): StellarTxnContext<emptyState_2>;
    addStrellaWithConfig<SC extends StellarContract<any>>(TargetClass: new (a: SC extends StellarContract<any> ? StellarConstructorArgs<ConfigFor<SC>> : never) => SC, config: SC extends StellarContract<infer iCT> ? iCT : never): SC;
    /**
     * Returns all the types exposed by the contract script
     * @remarks
     *
     * Passed directly from Helios; property names match contract's defined type names
     *
     * @public
     **/
    get onChainTypes(): {
        [x: string]: any;
    };
    /**
     * identifies the enum used for the script Datum
     * @remarks
     *
     * Override this if your contract script uses a type name other than Datum.
     * @public
     **/
    get scriptDatumName(): string;
    /**
     * returns the on-chain type for datum
     * @remarks
     *
     * returns the on-chain enum used for attaching data (or data hashes) to contract utxos
     * the returned type (and its enum variants) are suitable for off-chain txn-creation
     * override `get scriptDatumName()` if needed to match your contract script.
     * @public
     **/
    get onChainDatumType(): any;
    /**
     * identifies the enum used for activities (redeemers) in the Helios script
     * @remarks
     *
     * Override this if your contract script uses a type name other than Activity.
     * @public
     **/
    get scriptActivitiesName(): string;
    /**
     * returns the on-chain type for activites ("redeemers")
     * @remarks
     *
     * returns the on-chain enum used for spending contract utxos or for different use-cases of minting (in a minting script).
     * the returned type (and its enum variants) are suitable for off-chain txn-creation
     * override `get onChainActivitiesName()` if needed to match your contract script.
     * @public
     **/
    get onChainActivitiesType(): any;
    mustGetActivity(activityName: any): any;
    readDatum<DPROPS extends anyDatumProps>(datumName: string, datum: Datum | InlineDatum): Promise<DPROPS | undefined>;
    private readUplcStructList;
    private readUplcEnumVariant;
    private readUplcDatum;
    private readUplcField;
    findSmallestUnusedUtxo(lovelace: bigint, utxos: TxInput[], tcx?: StellarTxnContext): TxInput | undefined;
    mkValuePredicate(lovelace: bigint, tcx?: StellarTxnContext): tokenPredicate<TxInput>;
    mkMinTv(mph: MintingPolicyHash, tokenName: string | UutName | number[], count?: bigint): Value;
    mkAssetValue(tokenId: AssetClass, count?: bigint): Value;
    mkMinAssetValue(tokenId: AssetClass, count?: bigint): Value;
    mkTokenPredicate(val: Value): tokenPredicate<any>;
    mkTokenPredicate(mph: MintingPolicyHash, tokenName: string, quantity?: bigint): tokenPredicate<any>;
    mkTokenPredicate(vOrMph: AssetClass, quantity?: bigint): tokenPredicate<any>;
    private hasToken;
    private utxoHasToken;
    private inputHasToken;
    private assetsHasToken;
    private outputHasToken;
    tokenAsValue(tokenName: string, quantity: bigint, mph?: MintingPolicyHash): Value;
    hasOnlyAda(value: Value, tcx: StellarTxnContext | undefined, u: TxInput): TxInput | undefined;
    /**
     * @internal
     **/
    protected _utxoSortSmallerAndPureADA({ free: free1, minAdaAmount: r1 }: utxoInfo, { free: free2, minAdaAmount: r2 }: utxoInfo): 1 | -1 | 0;
    /**
     * @internal
     **/
    protected _utxoIsSufficient({ sufficient }: utxoInfo): boolean;
    /**
     * @internal
     **/
    protected _utxoIsPureADA({ u }: utxoInfo): TxInput | undefined;
    protected _infoBackToUtxo({ u }: utxoInfo): TxInput;
    /**
     * @internal
     **/
    protected _mkUtxoSortInfo(min: bigint, max?: bigint): (u: TxInput) => utxoInfo;
    /**
     * @internal
     **/
    protected _utxoCountAdaOnly(c: number, { minAdaAmount }: utxoInfo): number;
    findAnySpareUtxos(tcx: StellarTxnContext): Promise<TxInput[] | never>;
    findChangeAddr(): Promise<Address>;
    submit(tcx: StellarTxnContext, { signers, }?: {
        signers?: Address[];
    }): Promise<helios.TxId>;
    ADA(n: bigint | number): bigint;
    contractSource(): string | never;
    importModules(): HeliosModuleSrc[];
    loadProgramScript(params?: Partial<ConfigType>): Program | undefined;
    private get missingActorError();
    findActorUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined): Promise<TxInput | undefined>;
    mustFindActorUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined, exceptInTcx: StellarTxnContext, extraErrorHint?: string): Promise<TxInput | never>;
    mustFindActorUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined, extraErrorHint?: string): Promise<TxInput | never>;
    /**
     * Locates a UTxO locked in a validator contract address
     * @remarks
     *
     * Throws an error if no matching UTxO can be found
     * @param semanticName - descriptive name; used in diagnostic messages and any errors thrown
     * @param predicate - filter function; returns its utxo if it matches expectations
     * @param exceptInTcx - any utxos already in the transaction context are disregarded and not passed to the predicate function
     * @param extraErrorHint - user- or developer-facing guidance for guiding them to deal with the miss
     * @public
     **/
    mustFindMyUtxo(semanticName: string, predicate: (u: TxInput) => TxInput | undefined, exceptInTcx: StellarTxnContext, extraErrorHint?: string): Promise<TxInput>;
    mustFindMyUtxo(semanticName: string, predicate: (u: TxInput) => TxInput | undefined, extraErrorHint?: string): Promise<TxInput>;
    mustFindUtxo(semanticName: string, predicate: (u: TxInput) => TxInput | undefined, searchScope: UtxoSearchScope, extraErrorHint?: string): Promise<TxInput | never>;
    utxoSearchError(semanticName: string, searchScope: UtxoSearchScope, extraErrorHint?: string): string;
    toUtxoId(u: TxInput): string;
    /**
     * Try finding a utxo matching a predicate
     * @remarks
     *
     * Finds the first matching utxo, if any, either in the indicated search-scope's `wallet` or `address`.
     *
     * @public
     **/
    hasUtxo(semanticName: string, predicate: utxoPredicate, { address, wallet, exceptInTcx }: UtxoSearchScope): Promise<TxInput | undefined>;
    hasMyUtxo(semanticName: string, predicate: utxoPredicate): Promise<TxInput | undefined>;
}

/**
 * Base class for modules that can serve as Capo delegates
 * @public
 * @remarks
 *
 * establishes a base protocol for delegates.
 * @typeParam CT - type of any specialized configuration; use capoDelegateConfig by default.
 **/
export declare abstract class StellarDelegate<CT extends paramsBase & capoDelegateConfig = capoDelegateConfig, DCCT extends Record<string, any> | string = string> extends StellarContract<CT> {
    static currentRev: bigint;
    static get defaultParams(): {
        rev: bigint;
    };
    /**
     * Finds and adds the delegate's authority token to the transaction
     * @remarks
     *
     * calls the delegate-specific DelegateAddsAuthorityToken() method,
     * with the uut found by DelegateMustFindAuthorityToken().
     *
     * returns the token back to the contract using {@link txnReceiveAuthorityToken | txnReceiveAuthorityToken() }
     * @param tcx - transaction context
     * @public
     **/
    txnGrantAuthority<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX>;
    /**
     * Finds the authority token and adds it to the transaction, tagged for retirement
     * @public
     * @remarks
     * Doesn't return the token back to the contract.
     **/
    txnRetireAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX): Promise<StellarTxnContext<emptyState_3>>;
    /**
     * Standard delegate method for receiving the authority token as a txn output
     * @remarks
     *
     * creates a UTxO / TxOutput, depositing the indicated token-name into the delegated destination.
     *
     * Each implemented subclass can use it's own style to match its strategy & mechanism,
     * and is EXPECTED to use tcx.addOutput() to receive the indicated `tokenValue` into the
     * contract or other destination address.
     *
     * This method is used both for the original deposit and for returning the token during a grant-of-authority.
     *
     * Impls should normally preserve the datum from an already-present sourceUtxo, possibly with evolved details.
     *
     * @param tcx - transaction-context
     * @param tokenValue - the Value of the token that needs to be received.  Always includes
     *   the minUtxo needed for this authority token
     * @param fromFoundUtxo - always present when the authority token already existed; can be
     *   used to duplicate or iterate on an existing datum, or to include any additional Value in the new
     *   UTxO, to match the previous UTxO with minimal extra heuristics
     * @public
     **/
    abstract txnReceiveAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, tokenValue: Value, fromFoundUtxo?: TxInput): Promise<TCX>;
    /**
     * redeemer for exercising the authority of this delegate via its authority UUT
     * @public
     * @remarks
     *
     * The Authorizing redeemer indicates that the delegate is authorizing (certain parts of)
     * a transaction.
     *
     **/
    activityAuthorizing(): {
        redeemer: any;
    };
    /**
     * redeemer for spending the authority UUT for burning it.
     * @public
     * @remarks
     *
     * The Retiring redeemer indicates that the delegate is being
     * removed.
     *
     **/
    activityRetiring(): {
        redeemer: any;
    };
    /**
     * creates the essential datum for a delegate UTxO
     * @remarks
     *
     * Every delegate is expected to have a two-field 'IsDelegation' variant
     * in the first position of its on-chain Datum type.  This helper method
     * constructs a suitable UplcData structure, given appropriate inputs.
     * @param dd - Delegation details
     * @public
     **/
    mkDatumIsDelegation(dd: DelegationDetail, ...args: DCCT extends string ? [string] | [] : [DCCT]): InlineDatum;
    /**
     * returns the ValidatorHash of the delegate script, if relevant
     * @public
     * @remarks
     *
     * A delegate that doesn't use an on-chain validator should override this method and return undefined.
     **/
    get delegateValidatorHash(): ValidatorHash | undefined;
    mkAuthorityTokenPredicate(): ((something: any) => any) & {
        value: Value;
    };
    tvAuthorityToken(useMinTv?: boolean): Value;
    /**
     * Finds the delegate authority token, normally in the delegate's contract address
     * @public
     * @remarks
     *
     * The default implementation finds the UTxO having the authority token
     * in the delegate's contract address.
     *
     * It's possible to have a delegate that doesn't have an on-chain contract script.
     * ... in this case, the delegate should use this.{@link StellarDelegate.tvAuthorityToken | tvAuthorityToken()} and a
     * delegate-specific heuristic to locate the needed token.  It might consult the
     * addrHint in its `configIn` or another technique for resolution.
     *
     * @param tcx - the transaction context
     * @reqt It MUST resolve and return the UTxO (a TxInput type ready for spending)
     *  ... or throw an informative error
     **/
    findAuthorityToken(): Promise<TxInput | undefined>;
    /**
     * Tries to locate the Delegates authority token in the user's wallet (ONLY for non-smart-contract delegates)
     * @remarks
     *
     * Locates the authority token,if available the current user's wallet.
     *
     * If the token is located in a smart contract, this method will always return `undefined`.
     *
     * If the authority token is in a user wallet (not the same wallet as currently connected to the Capo contract class),
     * it will return `undefined`.
     *
     * @public
     **/
    findActorAuthorityToken(): Promise<TxInput | undefined>;
    /**
     * Finds the delegate authority token, normally in the delegate's contract address
     * @public
     * @remarks
     *
     * The default implementation finds the UTxO having the authority token
     * in the delegate's contract address.
     *
     * It's possible to have a delegate that doesn't have an on-chain contract script.
     * ... in this case, the delegate should use this.{@link StellarDelegate.tvAuthorityToken | tvAuthorityToken()} and a
     * delegate-specific heuristic to locate the needed token.  It might consult the
     * addrHint in its `configIn` or another technique for resolution.
     *
     * @param tcx - the transaction context
     * @reqt It MUST resolve and return the UTxO (a TxInput type ready for spending)
     *  ... or throw an informative error
     **/
    DelegateMustFindAuthorityToken(tcx: StellarTxnContext, label: string): Promise<TxInput>;
    /**
     * Adds the delegate's authority token to a transaction
     * @public
     * @remarks
     * Given a delegate already configured by a Capo, this method implements
     * transaction-building logic needed to include the UUT into the `tcx`.
     * the `utxo` is discovered by {@link StellarDelegate.DelegateMustFindAuthorityToken | DelegateMustFindAuthorityToken() }
     *
     * The default implementation adds the `uutxo` to the transaction
     * using {@link StellarDelegate.activityAuthorizing | activityAuthorizing() }.
     *
     * The off-chain code shouldn't need to check the details; it can simply
     * arrange the details properly and spend the delegate's authority token,
     * using this method.
     *
     * ### Reliance on this delegate
     *
     * Other contract scripts can rely on the delegate script to have validated its
     * on-chain policy and enforced its own "return to the delegate script" logic.
     *
     * ### Enforcing on-chain policy
     *
     * When spending the authority token in this way, the delegate's authority is typically
     * narrowly scoped, and it's expected that the delegate's on-chain script validates that
     * those parts of the transaction detail should be authorized, in accordance with the
     * delegate's core purpose/responsbility - i.e. that the txn does all of what the delegate
     * expects, and none of what it shouldn't do in that department.
     *
     * The on-chain code SHOULD typically enforce:
     *  * that the token is spent with Authorizing activity (redeemer).  NOTE:
     *     the **CapoDelegateHelpers** helios module provides the `requiresDelegateAuthorizing()`
     *     function for just this purpose

     *  * that the authority token is returned to the contract with its datum unchanged
     *  * that any other tokens it may also hold in the same UTxO do not become
     *     inaccessible as a result of the transactions - perhaps by requiring them to be
     *     returned together with the authority token.
     *
     * It MAY enforce additional requirements as well.
     *
     * @example
     * A minting delegate should check that all the expected tokens are
     * minted, AND that no other tokens are minted.
     *
     * @example
     * A role-based authentication/signature-checking delegate can
     * require an appropriate signature on the txn.
     *
     * @param tcx - the transaction context
     * @param utxo - the utxo having the authority UUT for this delegate
     * @reqt Adds the uutxo to the transaction inputs with appropriate redeemer.
     * @reqt Does not output the value; can EXPECT txnReceiveAuthorityToken to be called for that purpose.
     **/
    protected DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, uutxo: TxInput): Promise<TCX>;
    /**
     * Adds any important transaction elemements supporting the authority token being retired, closing the delegate contracts' utxo.
     * @remarks
     *
     * EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
     *
     * EXPECTS the `burn` instruction to be separately added to the transaction.
     *
     * The default implementation uses the conventional `Retiring` activity
     * to spend the token.
     *
     * @reqt
     * It MUST add the indicated utxo to the transaction as an input
     *
     * @reqt
     * When backed by a contract:
     *   * it should use an activity/redeemer allowing the token to be spent
     *      **and NOT returned**.
     *   * the contract script SHOULD ensure any other UTXOs it may also hold, related to this delegation,
     *      do not become inaccessible as a result.
     *
     * It MAY enforce additional requirements and/or block the action.
     *
     *
     * @param tcx - transaction context
     * @param fromFoundUtxo - the utxo having the authority otken
     * @public
     **/
    protected DelegateRetiresAuthorityToken(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
    /**
     * Captures requirements as data
     * @remarks
     *
     * see reqts structure
     * @public
     **/
    delegateRequirements(): ReqtsMap_2<"provides an interface for providing arms-length proof of authority to any other contract" | "implementations SHOULD positively govern spend of the UUT" | "implementations MUST provide an essential interface for transaction-building" | "requires a txnReceiveAuthorityToken(tcx, delegateAddr, fromFoundUtxo?)" | "requires a mustFindAuthorityToken(tcx)" | "requires a txnGrantAuthority(tcx, delegateAddr, fromFoundUtxo)" | "requires txnRetireCred(tcx, fromFoundUtxo)">;
}

/**
 * Type for the Class that constructs to a given type
 * @remarks
 *
 * Type of the matching literal class
 *
 * note: Typescript should make this pattern easier
 *
 * @typeParam S - the type of objects of this class
 * @typeParam CT - inferred type of the constructor args for the class
 * @public
 **/
export declare type stellarSubclass<S extends StellarContract<CT>, CT extends paramsBase = S extends StellarContract<infer iCT> ? iCT : paramsBase> = (new (args: StellarConstructorArgs<CT>) => S & StellarContract<CT>) & {
    defaultParams: Partial<CT>;
    parseConfig(rawJsonConfig: any): any;
};

/**
 * Interface augmenting the generic vitest testing context with a convention for testing contracts created with Stellar Contracts.
 * @public
 **/
export declare interface StellarTestContext<HTH extends StellarTestHelper<SC>, SC extends StellarContract<any> = HTH extends StellarTestHelper<infer iSC> ? iSC : never> extends canHaveRandomSeed, TestContext {
    h: HTH;
    get strella(): SC;
    initHelper(config: Partial<ConfigFor<SC>> & canHaveRandomSeed & canSkipSetup): Promise<StellarTestHelper<SC>>;
}

/**
 * Base class for test-helpers on generic Stellar contracts
 * @remarks
 *
 * NOTE: DefaultCapoTestHelper is likely to be a better fit for typical testing needs and typical contract-development scenarios.
 * Use this class for specific unit-testing needs not sufficiently served by integration-testing on a Capo.
 * @public
 **/
export declare abstract class StellarTestHelper<SC extends StellarContract<any>> {
    state: Record<string, any>;
    abstract get stellarClass(): stellarSubclass<SC, any>;
    config?: ConfigFor<SC>;
    defaultActor?: string;
    strella: SC;
    actors: actorMap;
    optimize: boolean;
    liveSlotParams: NetworkParams;
    networkParams: NetworkParams;
    network: NetworkEmulator;
    private _actorName;
    get actorName(): string;
    get currentActor(): SimpleWallet;
    set currentActor(actorName: string);
    address?: Address;
    setupPending?: Promise<any>;
    setupActors(): void;
    constructor(config?: ConfigFor<SC> & canHaveRandomSeed & canSkipSetup);
    initialize(config: ConfigFor<SC> & canHaveRandomSeed): Promise<SC>;
    initStellarClass(config?: (SC extends StellarContract<infer inferredConfig extends configBase> ? inferredConfig : never) | undefined): SC & StellarContract<SC extends StellarContract<infer inferredConfig extends configBase> ? inferredConfig : never>;
    initStrella(TargetClass: stellarSubclass<SC, ConfigFor<SC>>, config?: ConfigFor<SC>): SC & StellarContract<SC extends StellarContract<infer inferredConfig extends configBase> ? inferredConfig : never>;
    randomSeed?: number;
    rand?: () => number;
    delay(ms: any): Promise<unknown>;
    mkSeedUtxo(seedIndex?: bigint): Promise<helios.TxId>;
    submitTx(tx: Tx, force?: "force"): Promise<TxId>;
    mkRandomBytes(length: number): number[];
    /**
     * creates a new Actor in the transaction context with initial funds, returning a Wallet object
     * @remarks
     *
     * Given an actor name ("marcie") or role name ("marketer"), and a number
     * of indicated lovelace, creates and returns a wallet having the indicated starting balance.
     *
     * By default, three additional, separate 5-ADA utxos are created, to ensure sufficient Collateral and
     * small-change are existing, making typical transaction scenarios work easily.  If you want to include
     * other utxo's instead you can supply their lovelace sizes.
     *
     * To suppress creation of additional utxos, use `0n` for arg3.
     *
     * You may wish to import {@link ADA} = 1_000_000n from the testing/ module, and
     * multiply smaller integers by that constant.
     *
     * @param roleName - an actor name or role-name for this wallet
     * @param walletBalance - initial wallet balance
     * @param moreUtxos - additional utxos to include
     *
     * @example
     *     this.addActor("cheapo", 14n * ADA, 0n);  //  14 ADA and no additional utxos
     *     this.addActor("flexible", 14n * ADA);  //  14 ADA + default 15 ADA in 3 additional utxos
     *     this.addActor("moneyBags", 42_000_000n * ADA, 5n, 4n);  //  many ADA and two collaterals
     *
     *     //  3O ADA in 6 separate utxos:
     *     this.addActor("smallChange", 5n * ADA, 5n * ADA, 5n * ADA, 5n * ADA, 5n * ADA, 5n * ADA);
     *
     * @public
     **/
    addActor(roleName: string, walletBalance: bigint, ...moreUtxos: bigint[]): Wallet;
    mkNetwork(): [NetworkEmulator, enhancedNetworkParams];
    slotToTimestamp(s: bigint): bigint | Date;
    currentSlot(): bigint | null;
    waitUntil(time: Date): bigint;
}

declare type stellarTestHelperSubclass<SC extends StellarContract<any>> = new (config: ConfigFor<SC> & canHaveRandomSeed) => StellarTestHelper<SC>;

/**
 * Transaction-building context for Stellar Contract transactions
 * @remarks
 *
 * Uses same essential facade as Helios Tx.
 *
 * Adds a transaction-state container with strong typing of its contents,
 * enabling transaction-building code to use type-sensitive auto-complete
 * and allowing Stellar Contracts library code to require transaction contexts
 * having known states.
 *
 * Retains reflection capabilities to allow utxo-finding utilities to exclude
 * utxo's already included in the contract.
 *
 * @typeParam S - type of the context's `state` prop
 * @public
 **/
export declare class StellarTxnContext<S extends anyState = anyState> {
    tx: Tx;
    inputs: TxInput[];
    collateral?: TxInput;
    outputs: TxOutput[];
    feeLimit?: bigint;
    state: S;
    actor?: Wallet;
    neededSigners: Address[];
    constructor(actor?: Wallet, state?: Partial<S>);
    dump(): string;
    mintTokens(...args: Parameters<Tx["mintTokens"]>): StellarTxnContext<S>;
    reservedUtxos(): TxInput[];
    utxoNotReserved(u: TxInput): TxInput | undefined;
    addUut<T extends string, TCX extends StellarTxnContext>(this: TCX, uutName: UutName, ...names: T[]): hasUutContext<T> & TCX;
    addState<TCX extends StellarTxnContext, K extends string, V>(this: TCX, key: K, value: V): StellarTxnContext<{
        [keyName in K]: V;
    } & anyState> & TCX;
    addCollateral(collateral: TxInput): this;
    validFor<TCX extends StellarTxnContext<S>>(this: TCX, durationMs: number, backwardMs?: number): TCX;
    txRefInputs: TxInput[];
    /**
     * adds a reference input to the transaction context
     * @remarks
     *
     * idempotent version of helios addRefInput()
     *
     * @typeParam ‹pName› - descr (for generic types)
     * @public
     **/
    addRefInput<TCX extends StellarTxnContext<S>>(this: TCX, input: addRefInputArgs[0]): TCX;
    addRefInputs<TCX extends StellarTxnContext<S>>(this: TCX, ...args: addRefInputsArgs): TCX;
    addInput<TCX extends StellarTxnContext<S>>(this: TCX, input: addInputArgs[0], r?: RedeemerArg): TCX;
    addInputs<TCX extends StellarTxnContext<S>>(this: TCX, inputs: Parameters<Tx["addInputs"]>[0], r: RedeemerArg): TCX;
    addOutput<TCX extends StellarTxnContext<S>>(this: TCX, ...args: Parameters<Tx["addOutput"]>): TCX;
    addOutputs<TCX extends StellarTxnContext<S>>(this: TCX, ...args: Parameters<Tx["addOutputs"]>): TCX;
    attachScript(...args: Parameters<Tx["attachScript"]>): this;
    addSignature(wallet: Wallet): Promise<void>;
    /**
     * To add a script to the transaction context, use `attachScript`
     *
     * @deprecated - invalid method name; use attachScript
     **/
    addScript(): void;
}

/**
 * return type for strategy's validateScriptParams()
 * @internal
 **/
export declare type strategyValidation = ErrorMap | undefined;

/**
 * Converts string to array of UTF-8 byte-values
 * @public
 **/
export declare const stringToNumberArray: typeof textToBytes;

declare const TODO: unique symbol;

/**
 * tags requirement that aren't yet implemented
 * @public
 **/
declare type TODO_TYPE = typeof TODO;

/**
 * tuple expressing a token-name and count
 * @public
 **/
export declare type tokenNamesOrValuesEntry = [string | number[], bigint];

declare type tokenPredicate<tokenBearer extends canHaveToken> = ((something: tokenBearer) => tokenBearer | undefined) & {
    value: Value;
};

export { Tx }

/**
 * Converts a Tx to printable form
 * @public
 **/
export declare function txAsString(tx: Tx): string;

export declare function txidAsString(x: TxId): string;

export { TxInput }

/**
 * Converts a TxInput to printable form
 * @remarks
 *
 * Shortens address and output-id for visual simplicity; doesn't include datum info
 * @public
 **/
export declare function txInputAsString(x: TxInput, prefix?: string): string;

/**
 * Decorates functions that can construct a new transaction context for a specific use-case
 * @remarks
 *
 * function names must follow the mkTxn... convention.
 * @public
 **/
export declare function txn(proto: any, thingName: any, descriptor: any): any;

export { TxOutput }

/**
 * Converts a txOutput to printable form
 * @remarks
 *
 * including all its values, and shortened Address.
 * @public
 **/
export declare function txOutputAsString(x: TxOutput, prefix?: string): string;

export declare function txOutputIdAsString(x: TxOutputId): string;

/**
 * converts a utxo to printable form
 * @remarks
 *
 * shows shortened output-id and the value being output, plus its datum
 * @internal
 **/
export declare function utxoAsString(x: TxInput, prefix?: string): string;

declare type utxoInfo = {
    u: TxInput;
    sufficient: boolean;
    free: bigint;
    minAdaAmount: bigint;
};

/**
 * a function that can filter txInputs for coin-selection
 * @remarks
 *
 * short form: "returns truthy" if the input is matchy for the context
 * @public
 **/
export declare type utxoPredicate = ((u: TxInput) => TxInput | undefined) | ((u: TxInput) => boolean) | ((u: TxInput) => boolean | undefined);

/**
 * Converts a list of UTxOs to printable form
 * @remarks
 *
 * ... using {@link txInputAsString}
 * @public
 **/
export declare function utxosAsString(utxos: TxInput[], joiner?: string): string;

declare type UtxoSearchScope = {
    address?: Address;
    wallet?: Wallet;
    exceptInTcx?: StellarTxnContext;
};

declare type uutMap = Record<string, UutName>;

/**
 * a unique utility token having a unique name
 * @remarks
 *
 * This class contains a general 'purpose' name, mapped to a unique
 * `name`, which is generated using a seed-utxo pattern.
 *
 * @public
 **/
export declare class UutName {
    private [_uutName];
    purpose: string;
    constructor(purpose: string, fullUutName: string);
    /**
     * the full uniquified name of this UUT
     * @remarks
     *
     * format: `purpose-‹...uniqifier...›`
     * @public
     **/
    get name(): string;
    toString(): string;
}

declare const _uutName: unique symbol;

/**
 * strongly-typed map of purpose-names to Uut objects
 *
 * @public
 */
export declare type uutPurposeMap<unionPurpose extends string> = {
    [purpose in unionPurpose]: UutName;
};

export { ValidatorHash }

export { Value }

/**
 * Converts a Value to printable form
 * @public
 **/
export declare function valueAsString(v: Value): string;

/**
 * Tuple of byte-array, count, needed for Value creation on native tokens.
 * @public
 **/
export declare type valuesEntry = [number[], bigint];

/**
 * declaration for one strategy-variant of a delegate role
 * @remarks
 *
 * Indicates the details needed to construct a delegate script
 *
 * NOTE: the Type param is always inferred by defineRole()
 * @public
 **/
export declare type VariantStrategy<DT extends StellarContract<capoDelegateConfig & any>> = {
    delegateClass: stellarSubclass<DT>;
    partialConfig?: PartialParamConfig<ConfigFor<DT>>;
    validateConfig?: (p: ConfigFor<DT>) => strategyValidation;
};

export { Wallet }

export { WalletHelper }

export { }
