import { Address } from '@hyperionbt/helios';
import { AssetClass } from '@hyperionbt/helios';
import { Assets } from '@hyperionbt/helios';
import { Datum } from '@hyperionbt/helios';
import * as helios from '@hyperionbt/helios';
import { MintingPolicyHash } from '@hyperionbt/helios';
import { Network } from '@hyperionbt/helios';
import { NetworkEmulator } from '@hyperionbt/helios';
import { NetworkParams } from '@hyperionbt/helios';
import { Program } from '@hyperionbt/helios';
import { ReqtsMap as ReqtsMap_2 } from './Requirements.js';
import { ReqtsMap as ReqtsMap_3 } from '../Requirements.js';
import { SimpleWallet } from '@hyperionbt/helios';
import { TestContext } from 'vitest';
import { Tx } from '@hyperionbt/helios';
import { TxId } from '@hyperionbt/helios';
import { TxInput } from '@hyperionbt/helios';
import { TxOutput } from '@hyperionbt/helios';
import { UplcData } from '@hyperionbt/helios';
import { UplcDataValue } from '@hyperionbt/helios';
import { UplcProgram } from '@hyperionbt/helios';
import { Value } from '@hyperionbt/helios';
import { Wallet } from '@hyperionbt/helios';

export declare const Activity: {
    partialTxn(proto: any, thingName: any, descriptor: any): any;
    redeemer(proto: any, thingName: any, descriptor: any): any;
    redeemerData(proto: any, thingName: any, descriptor: any): any;
};

declare type actorMap = Record<string, SimpleWallet>;

export declare const ADA = 1000000n;

export declare function addTestContext<SC extends StellarContract<any>, P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never>(context: StellarTestContext<any, SC>, TestHelperClass: stellarTestHelperSubclass<SC>, params?: P): Promise<void>;

declare class AnyAddressAuthorityPolicy extends AuthorityPolicy {
    loadProgramScript(params: any): undefined;
    delegateReqdAddress(): false;
    protected usingAuthority(): isActivity;
    txnMustFindAuthorityToken(tcx: any): Promise<TxInput>;
    txnReceiveAuthorityToken(tcx: StellarTxnContext, delegateAddr: Address, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
    txnGrantAuthority(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
    txnRetireCred(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
}

declare type anyDatumArgs = Record<string, any>;

export declare type anyDatumProps = Record<string, any>;

export declare function assetsAsString(v: any): string;

declare abstract class AuthorityPolicy<T extends AuthorityPolicySettings = AuthorityPolicySettings> extends StellarContract<T> {
    static currentRev: bigint;
    static get defaultParams(): {
        rev: bigint;
    };
    txnCreatingAuthority(tcx: StellarTxnContext, tokenId: AssetClass, delegateAddr: Address): Promise<StellarTxnContext>;
    abstract txnMustFindAuthorityToken(tcx: StellarTxnContext): Promise<TxInput>;
    abstract txnGrantAuthority(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
    abstract txnRetireCred(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
    authorityPolicyRequirements(): ReqtsMap_3<"provides an interface for providing arms-length proof of authority to any other contract" | "implementations SHOULD positively govern spend of the UUT" | "implementations MUST provide an essential interface for transaction-building" | "requires a txnReceiveAuthorityToken(tcx, delegateAddr, fromFoundUtxo?)" | "requires a mustFindAuthorityToken(tcx)" | "requires a txnGrantAuthority(tcx, delegateAddr, fromFoundUtxo)" | "requires txnRetireCred(tcx, fromFoundUtxo)">;
}

declare type AuthorityPolicySettings = capoDelegateConfig & {
    rev: bigint;
};

export declare class BasicMintDelegate extends StellarContract<MintDelegateArgs> implements StellarDelegate {
    static currentRev: bigint;
    static get defaultParams(): {
        rev: bigint;
    };
    contractSource(): any;
    importModules(): HeliosModuleSrc[];
    mkDatumDelegate(): InlineDatum;
    getContractScriptParams(config: MintDelegateArgs): paramsBase;
    txnReceiveAuthorityToken<TCX extends StellarTxnContext<any>>(tcx: TCX, fromFoundUtxo?: TxInput): Promise<TCX>;
    mkDelegationDatum(txin?: TxInput): Datum;
    txnCreatingTokenPolicy(tcx: StellarTxnContext, tokenName: string): Promise<StellarTxnContext<{}>>;
    static mkDelegateWithArgs(a: MintDelegateArgs): void;
}

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
 * **Capo is a foundational class**; you should consider using DefaultCapo as a starting point, unless its govAuthority
 * role conflicts with your goals.
 *
 * Inherits from: {@link StellarContract}\<`configType`\> (is this a redundant doc entry?) .
 *
 * @typeParam minterType - allows setting a different contract (script & off-chain class) for the minting policy
 * @typeParam charterDatumType - specifies schema for datum information held in the Capo's primary or "charter" UTXO
 * @typeParam configType - specifies schema for details required to pre-configure the contract suite, or to reproduce it in a specific application instance.
 * @public
 */
export declare abstract class Capo<minterType extends MinterBaseMethods & DefaultMinter = DefaultMinter, charterDatumType extends anyDatumArgs = anyDatumArgs, configType extends CapoBaseConfig = CapoBaseConfig> extends StellarContract<configType> implements hasUutCreator {
    abstract get delegateRoles(): RoleMap<any>;
    abstract mkFullConfig(baseConfig: CapoBaseConfig): configType;
    constructor(args: StellarConstructorArgs<CapoBaseConfig>);
    abstract contractSource(): string;
    abstract mkDatumCharterToken(args: charterDatumType): InlineDatum;
    get minterClass(): stellarSubclass<DefaultMinter, SeedTxnParams>;
    minter?: minterType;
    txnWithUuts<const purposes extends string, existingTcx extends StellarTxnContext<any>, const RM extends Record<ROLES, purposes>, const ROLES extends keyof RM & string = string & keyof RM>(initialTcx: existingTcx, uutPurposes: purposes[], seedUtxo: TxInput, roles?: RM): Promise<existingTcx & hasUutContext<ROLES | purposes>>;
    mkTxnCreatingUuts<const purposes extends string, existingTcx extends StellarTxnContext<any>, const RM extends Record<ROLES, purposes>, const ROLES extends keyof RM & string = string & keyof RM>(initialTcx: existingTcx, uutPurposes: purposes[], seedUtxo?: TxInput, roles?: RM): Promise<existingTcx & hasUutContext<ROLES | purposes>>;
    uutsValue(uutMap: uutPurposeMap<any>): Value;
    uutsValue(tcx: hasUutContext<any>): Value;
    protected usingAuthority(): isActivity;
    protected abstract updatingCharter(args: charterDatumType): isActivity;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    importModules(): HeliosModuleSrc[];
    abstract mkTxnMintCharterToken<TCX extends StellarTxnContext>(charterDatumArgs: Partial<charterDatumType>, existingTcx?: TCX): Promise<never | (TCX & hasBootstrappedConfig<CapoBaseConfig & configType>)>;
    get charterTokenPredicate(): ((something: any) => any) & {
        value: Value;
    };
    tokenAsValue(tokenName: string, quantity?: bigint): Value;
    mustFindCharterUtxo(): Promise<TxInput>;
    abstract txnAddCharterAuthz(tcx: StellarTxnContext, datum: InlineDatum): Promise<StellarTxnContext<any> | never>;
    txnMustUseCharterUtxo(tcx: StellarTxnContext<any>, redeemer: isActivity, newDatum?: InlineDatum): Promise<StellarTxnContext<any> | never>;
    txnMustUseCharterUtxo(tcx: StellarTxnContext<any>, useReferenceInput: true, forceAddRefScript?: true): Promise<StellarTxnContext<any> | never>;
    txnUpdateCharterUtxo(tcx: StellarTxnContext, redeemer: isActivity, newDatum: InlineDatum): Promise<StellarTxnContext | never>;
    txnKeepCharterToken(tcx: StellarTxnContext<any>, datum: InlineDatum): StellarTxnContext<any>;
    txnAddAuthority(tcx: StellarTxnContext<any>): Promise<StellarTxnContext<any>>;
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
    get mph(): MintingPolicyHash;
    get mintingPolicyHash(): MintingPolicyHash;
    connectMintingScript(params: SeedTxnParams): minterType;
    txnMustGetSeedUtxo(tcx: StellarTxnContext, purpose: string, tokenNames: string[]): Promise<TxInput | never>;
    mockMinter?: minterType;
    /**
     * Creates a delegate link, given a delegation role and and strategy-selection details
     * @remarks
     *
     * Combines partal and implied configuration settings, validating the resulting configuration.
     *
     * The resulting "relative" delegate link can be used directly in a Datum field of type RelativeDelegateLink
     * or can be stored off-chain in any way suitable for your dApp.
     *
     * To get a full DelegateSettings object, use txnCreateDelegateSettings() instead.
     *
     * Note: if you have a delegate use-case that should not include a `reqdAddress`,
     * `delegateReqdAddress() { return false as const }` is a useful Typescript snippet.
     * in that case, you may wish to also provide an `delegateAddressesHint()`, if the resulting
     * details provides a useful path for your dApp's functionality.
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
     * @reqt If the resolved delegate class provides a truthy `delegateReqdAddress()`,
     *   ... the resolved settings will reflect in a `reqdAddr` property.  Otherwise,
     *   ... any provided `delegateAddressesHint()` will be included as `addressesHint`.
     *
     * @param tcx - A transaction-context
     * @param roleName - the role of the delegate, matched with the `delegateRoles()` of `this`
     * @param delegateInfo - partial detail of the delegation, with `strategyName` and any other
     *     details required by the particular role
     * @typeParam ‹pName› - descr (for generic types)
     * @public
     **/
    txnCreateDelegateLink<DT extends StellarContract<capoDelegateConfig>, const RN extends string>(tcx: hasUutContext<RN>, roleName: RN, delegateInfo?: MinimalDelegateLink<DT>): RelativeDelegateLink<DT>;
    relativeLink<DT extends StellarContract<capoDelegateConfig>>(configured: ConfiguredDelegate<DT>): RelativeDelegateLink<DT>;
    /**
     * Returns a complete set of delegate settings, given a delegation role and strategy-selection details
     * @remarks
     *
     * Behaves exactly like (and provides the core implementation of) {@link txnCreateDelegateLink},
     * returning additional `roleName` and `delegateClass`, to conform with the DelegateSettings type.
     *
     * See txnCreateDelegateLink for further details.
     * @public
     **/
    txnCreateConfiguredDelegate<DT extends StellarContract<any & capoDelegateConfig>, const RN extends string>(tcx: hasUutContext<RN>, roleName: RN & keyof this["delegateRoles"], delegateInfo?: MinimalDelegateLink<DT>): ConfiguredDelegate<DT>;
    mkImpliedUutDetails(uut: UutName): CapoImpliedSettings;
    mustGetDelegate<T extends StellarContract<capoDelegateConfig & any>>(configuredDelegate: PreconfiguredDelegate<T>): T;
    connectDelegateWith<DelegateType extends StellarContract<paramsBase & capoDelegateConfig>, configType extends (DelegateType extends StellarContract<infer c> ? c : paramsBase) = (DelegateType extends StellarContract<infer c> ? c : paramsBase)>(roleName: string, delegateLink: RelativeDelegateLink<DelegateType>): Promise<DelegateType>;
    capoRequirements(): ReqtsMap_2<"is a base class for leader/Capo pattern" | "can create unique utility tokens" | "supports the Delegation pattern using roles and strategy-variants" | "supports well-typed role declarations and strategy-adding" | "supports just-in-time strategy-selection using txnCreateDelegateLink()" | "given a configured delegate-link, it can create a ready-to-use Stellar subclass with all the right settings" | "supports concrete resolution of existing role delegates" | "Each role uses a RoleVariants structure which can accept new variants" | "provides a Strategy type for binding a contract to a strategy-variant name">;
}

declare type CapoBaseConfig = SeedTxnParams & {
    mph: MintingPolicyHash;
    rev: bigint;
};

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
declare type capoDelegateConfig = paramsBase & {
    uutID: AssetClass;
    capo: {
        address: Address;
        mph: MintingPolicyHash;
    };
    reqdAddress?: Address;
    addrHint: Address[];
};

declare type CapoImpliedSettings = {
    uutID: AssetClass;
};

export declare abstract class CapoTestHelper<SC extends Capo<DefaultMinter & MinterBaseMethods, CDT, CT>, CDT extends anyDatumArgs = SC extends Capo<DefaultMinter, infer iCDT> ? iCDT : anyDatumArgs, //prettier-ignore
CT extends CapoBaseConfig = SC extends Capo<any, any, infer iCT> ? iCT : never> extends StellarTestHelper<SC> {
    initialize({ randomSeed, config, }?: {
        config?: CT;
        randomSeed?: number;
    }): Promise<SC>;
    bootstrap(args?: MinimalDefaultCharterDatumArgs): Promise<SC>;
    abstract mkDefaultCharterArgs(): Partial<MinimalDefaultCharterDatumArgs<any>>;
    abstract mintCharterToken(args?: MinimalDefaultCharterDatumArgs<any>): Promise<hasBootstrappedConfig<CT>>;
}

declare type ConfigFor<SC extends StellarContract<C>, C extends paramsBase = SC extends StellarContract<infer inferredConfig> ? inferredConfig : never> = C;

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
declare type ConfiguredDelegate<DT extends StellarContract<any & capoDelegateConfig>> = {
    delegateClass: stellarSubclass<DT>;
    delegate: DT;
    roleName: string;
    config: ConfigFor<DT>;
} & RelativeDelegateLink<DT>;

export declare function datum(proto: any, thingName: any, descriptor: any): any;

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
 * Customizing Datum and Redeemer
 *
 * The baseline contract script can have specialized Datum and Redeemer
 * definitions by subclassing DefaultCapo with a `get specializedCapo()`.  This
 * should be an imported helios script having `module specializedCapo` at the top.
 * It MUST export Datum and Redeemer enums, with variants matching those in the provided
 * baseline/unspecializedCapo module.
 *
 * A customized Datum::validateSpend(self, ctx) -> Bool method
 * should be defined, even if it doesn't put constraints on spending Datum.
 * If it does choose to add hard constraints, note that this method doesn't
 * have access to the Redeemer.  It's a simple place to express simple
 * constraints on spending a custom Datum that only needs one 'spendingDatum'
 * activity.
 *
 * A customized Redeemer: allowActivity(self, datum, ctx) -> Bool method
 * has access to both the redeemer (in self), as well as Datum and the transaction
 * context.  In this method, use self.switch{...} to implement activity-specific
 * validations.
 *
 * See the {@link Capo | Capo base class} and {@link StellarContract} for addition context.
 * @public
 */
export declare class DefaultCapo<MinterType extends DefaultMinter = DefaultMinter, CDT extends DefaultCharterDatumArgs = DefaultCharterDatumArgs, configType extends CapoBaseConfig = CapoBaseConfig> extends Capo<MinterType, CDT, configType> {
    contractSource(): any;
    /**
     * indicates any specialization of the baseline Capo types
     * @remarks
     *
     * The default implementation is an UnspecialiedCapo, which
     * you can use as a template for your specialized Capo.
     *
     * Every specalization MUST include a Datum and a Redeemer,
     * and MAY include additional functions, and methods on Datum / Redeemer.
     *
     * The datum SHOULD have a validateSpend(self, datum, ctx) method.
     *
     * The redeemer SHOULD have an allowActivity(self, datum, ctx) method.
     *
     * @public
     **/
    get specializedCapo(): HeliosModuleSrc;
    importModules(): HeliosModuleSrc[];
    get delegateRoles(): RoleMap<{
        readonly govAuthority: RoleInfo<StellarContract<any>, {
            readonly address: {
                readonly delegateClass: typeof AnyAddressAuthorityPolicy;
                readonly validateConfig: (args: any) => strategyValidation;
            };
            readonly multisig: {
                readonly delegateClass: typeof MultisigAuthorityPolicy;
                readonly validateConfig: (args: any) => strategyValidation;
            };
        }, "authZor", "address" | "multisig">;
        readonly mintDelegate: RoleInfo<StellarContract<any>, {
            readonly default: {
                readonly delegateClass: typeof BasicMintDelegate;
                readonly partialConfig: {};
                readonly validateConfig: (args: any) => strategyValidation;
            };
        }, "mintDgt", "default">;
    }>;
    extractDelegateLink(dl: RelativeDelegateLink<any>): any;
    mkDatumCharterToken(args: CDT): InlineDatum;
    txnAddCharterAuthz(tcx: StellarTxnContext, datum: InlineDatum): Promise<StellarTxnContext<{}>>;
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
    mkFullConfig(baseConfig: CapoBaseConfig): CapoBaseConfig & configType;
    /**
     * Initiates a seeding transaction, creating a new Capo contract of this type
     * @remarks
     *
     * detailed remarks
     * @param ‹pName› - descr
     * @typeParam ‹pName› - descr (for generic types)
     * @public
     **/
    mkTxnMintCharterToken<TCX extends StellarTxnContext>(charterDatumArgs: MinimalDefaultCharterDatumArgs<CDT>, existingTcx?: TCX): Promise<never | (TCX & hasBootstrappedConfig<CapoBaseConfig & configType>)>;
    updatingCharter(): isActivity;
    mkTxnUpdateCharter(args: CDT, tcx?: StellarTxnContext): Promise<StellarTxnContext>;
    requirements(): ReqtsMap_2<"the trustee group can be changed" | "positively governs all administrative actions" | "has a unique, permanent charter token" | "has a unique, permanent treasury address" | "the trustee threshold is enforced on all administrative actions" | "the charter token is always kept in the contract" | "can mint other tokens, on the authority of the Charter token" | "has a singleton minting policy" | "foo">;
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
    static forCapoClass<DC extends DefaultCapo<DefaultMinter, any, any>>(s: stellarSubclass<DC>): stellarTestHelperSubclass<DC>;
    get stellarClass(): stellarSubclass<DC>;
    setupActors(): void;
    mkCharterSpendTx(): Promise<StellarTxnContext>;
    mkDefaultCharterArgs(): Partial<MinimalDefaultCharterDatumArgs<CDT>>;
    mintCharterToken(args?: MinimalDefaultCharterDatumArgs<CDT>): Promise<hasBootstrappedConfig<CT>>;
    updateCharter(args: CDT): Promise<StellarTxnContext>;
}

/**
 * Schema for Charter Datum, which allows state to be stored in the Leader contract
 * together with it's primary or "charter" utxo.
 * @public
 **/
export declare type DefaultCharterDatumArgs = {
    govAuthorityLink: RelativeDelegateLink<AuthorityPolicy>;
    mintDelegateLink: RelativeDelegateLink<BasicMintDelegate>;
};

export declare class DefaultMinter extends StellarContract<SeedTxnParams> implements MinterBaseMethods {
    contractSource(): any;
    importModules(): HeliosModuleSrc[];
    txnWithUuts<const purposes extends string, existingTcx extends StellarTxnContext<any>, const RM extends Record<ROLES, purposes>, const ROLES extends string & keyof RM = string & keyof RM>(tcx: existingTcx, uutPurposes: purposes[], seedUtxo: TxInput, roles?: RM): Promise<hasUutContext<ROLES | purposes> & existingTcx>;
    mkTxnCreatingUuts<const purposes extends string, existingTcx extends StellarTxnContext<any>, const RM extends Record<ROLES, purposes>, const ROLES extends keyof RM & string = string & keyof RM>(initialTcx: existingTcx, uutPurposes: purposes[], seedUtxo?: TxInput, roles?: RM): Promise<existingTcx & hasUutContext<ROLES | purposes>>;
    get mintingPolicyHash(): MintingPolicyHash;
    protected mintingCharter({ owner }: MintCharterRedeemerArgs): isActivity;
    protected mintingUuts({ seedTxn, seedIndex: sIdx, purposes, }: MintUutRedeemerArgs): isActivity;
    get charterTokenAsValuesEntry(): valuesEntry;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    txnMintingCharter<TCX extends StellarTxnContext<any>>(tcx: TCX, { owner, authZor, }: {
        authZor: UutName;
        owner: Address;
    }): Promise<TCX>;
}

export declare function defineRole<const UUTP extends string, SC extends StellarContract<any>, const VMv extends RoleInfo<SC, any, UUTP>["variants"]>(uutBaseName: UUTP, baseClass: stellarSubclass<SC> & any, variants: VMv): RoleInfo<SC, VMv, UUTP>;

export declare function delegateRoles<const RM extends RoleMap<any>>(x: RM): RoleMap<RM>;

export declare function dumpAny(x: Tx | StellarTxnContext): string | undefined;

declare type enhancedNetworkParams = NetworkParams & {
    slotToTimestamp(n: bigint): Date;
};

declare type ErrorMap = Record<string, string[]>;

export declare function errorMapAsString(em: ErrorMap, prefix?: string): string;

/**
 * used for transaction-context state having specific uut-purposes
 *
 * @public
 */
export declare type hasAllUuts<uutEntries extends string> = {
    uuts: uutPurposeMap<uutEntries>;
};

export declare type hasBootstrappedConfig<CT extends CapoBaseConfig> = StellarTxnContext<{
    bootstrappedConfig: CT;
}>;

/**
 * Factory for type-safe requirements details for a unit of software
 * @public
 * @remarks
 * return `hasReqts({... requirements})` from a requirements() or other method in a class, to express
 * requirements using a standardized form that supports arbitrary amounts of detailed requirements
 * with references to unit-test labels that can verify the impl details.
 *
 * You don't need to provide the type params or TS type annotations.  `requirements() { return hasReqts({...yourReqts}) }` will work fine.
 *
 * See the {@link ReqtsMap} and {@link RequirementEntry} types for more details about expressing requirements.
 *
 * @param reqtsMap - the ReqtsMap structure for the software unit
 * @typeParam R - implicitly matches the provided `reqtsMap`
 * @typeParam reqts - implicitly matches the requirements strings from the provided `reqtsMap`
 */
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
    txnWithUuts<const purposes extends string, existingTcx extends StellarTxnContext<any>, const RM extends Record<ROLES, purposes>, const ROLES extends keyof RM & string = string & keyof RM>(initialTcx: existingTcx, uutPurposes: purposes[], seedUtxo: TxInput, roles?: RM): Promise<existingTcx & hasUutContext<ROLES | purposes>>;
    mkTxnCreatingUuts<const purposes extends string, existingTcx extends StellarTxnContext<any>, const RM extends Record<ROLES, purposes>, const ROLES extends keyof RM & string = string & keyof RM>(initialTcx: existingTcx, uutPurposes: purposes[], seedUtxo?: TxInput, roles?: RM): Promise<existingTcx & hasUutContext<ROLES | purposes>>;
}

export declare type HeliosModuleSrc = string & {
    srcFile: string;
    purpose: string;
    moduleName: string;
};

export declare function heliosRollupLoader(opts?: {
    include: string;
    exclude: never[];
}): {
    name: string;
    transform(content: any, id: any): {
        code: String;
        map: {
            mappings: string;
        };
    } | undefined;
};

export declare type InlineDatum = ReturnType<typeof DatumInline>;

/**
 * a type for redeemer/activity-factory functions declared with @Activity.redeemer
 *
 * @public
 */
export declare type isActivity = {
    redeemer: UplcDataValue | UplcData;
};

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
 * full RelativeDelegateLink structure instead - e.g. with a different `strategy`,
 * `config`, and/or `reqdAddress`; this type wouldn't be involved in that case.
 *
 * @typeParam SC - the type of StellarContract targeted for delegation
 * @public
 **/
declare type MinimalDelegateLink<SC extends StellarContract<any>> = Required<Pick<RelativeDelegateLink<SC>, "strategyName">> & Partial<Omit<RelativeDelegateLink<SC>, "uutName">>;

declare type MintCharterRedeemerArgs<T = {}> = T & {
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
    txnMintingCharter(tcx: StellarTxnContext<any>, charterMintArgs: {
        owner: Address;
        authZor: UutName;
    }, tVal: valuesEntry): Promise<StellarTxnContext<any>>;
}

/**
 * UUT minting should always use these settings to guard for uniqueness
 *
 * @public
 */
export declare type MintUutRedeemerArgs = {
    seedTxn: TxId;
    seedIndex: bigint | number;
    purposes: string[];
};

export declare function mkHeliosModule(src: string, filename: string): HeliosModuleSrc;

export declare function mkUutValuesEntries(uuts: UutName[]): valuesEntry[];

export declare function mkUutValuesEntries(uuts: uutPurposeMap<any>): valuesEntry[];

export declare function mkValuesEntry(tokenName: string, count: bigint): valuesEntry;

declare class MultisigAuthorityPolicy extends AuthorityPolicy implements StellarDelegate {
    static currentRev: bigint;
    static get defaultParams(): {
        rev: bigint;
    };
    contractSource(): any;
    txnMustFindAuthorityToken(tcx: StellarTxnContext): Promise<TxInput>;
    txnReceiveAuthorityToken<TCX extends StellarTxnContext<any>>(tcx: TCX, fromFoundUtxo?: TxInput | undefined): Promise<TCX>;
    txnGrantAuthority(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
    txnRetireCred(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
    requirements(): ReqtsMap_3<"provides arms-length proof of authority to any other contract" | "positively governs spend of the UUT" | "the trustee threshold is required to spend its UUT" | "the trustee group can be changed" | "TODO: has a unique authority UUT" | "TODO: the trustee threshold is required to spend its UUT" | "TODO: the trustee group can be changed">;
}

declare type noState = {};

export declare type paramsBase = Record<string, any>;

declare type PartialParamConfig<CT extends paramsBase> = Partial<CT>;

export declare function partialTxn(proto: any, thingName: any, descriptor: any): any;

declare type PreconfiguredDelegate<T extends StellarContract<capoDelegateConfig & any>> = Omit<ConfiguredDelegate<T>, "delegate">;

declare type RelativeDelegateLink<T extends StellarContract<any>> = {
    uutName: string;
    strategyName: string;
    config: Partial<ConfigFor<T>>;
    reqdAddress?: Address;
    addressesHint?: Address[];
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

declare type RoleInfo<SC extends StellarContract<any>, VM extends Record<variants, VariantStrategy<SC>>, UUTP extends string, variants extends string = string & keyof VM> = {
    uutPurpose: UUTP;
    baseClass: stellarSubclass<SC>;
    variants: {
        [variant in variants]: VM[variant];
    };
};

export declare type RoleMap<KR extends Record<string, RoleInfo<any, any, any, any>>> = {
    [roleName in keyof KR]: KR[roleName];
};

declare type scriptPurpose = "testing" | "minting" | "spending" | "staking" | "module" | "endpoint";

export declare type SeedTxnParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};

declare type SetupDetails = {
    network: Network;
    networkParams: NetworkParams;
    isTest: boolean;
    myActor?: Wallet;
};

declare type StellarConstructorArgs<CT extends paramsBase> = {
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
    getContractScriptParams(config: ConfigType): paramsBase & Partial<ConfigType>;
    delegateReqdAddress(): false | Address;
    delegateAddressesHint(): Address[] | undefined;
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
    txnKeepValue(tcx: StellarTxnContext, value: Value, datum: InlineDatum): StellarTxnContext<{}>;
    addScriptWithParams<SC extends StellarContract<any>>(TargetClass: new (a: SC extends StellarContract<any> ? StellarConstructorArgs<ConfigFor<SC>> : never) => SC, config: SC extends StellarContract<infer iCT> ? iCT : never): SC;
    readDatum<DPROPS extends anyDatumProps>(datumName: string, datum: Datum | InlineDatum): Promise<DPROPS>;
    private readUplcStructList;
    private readUplcDatum;
    private readUplcField;
    findSmallestUnusedUtxo(lovelace: bigint, utxos: TxInput[], tcx?: StellarTxnContext): TxInput | undefined;
    mkValuePredicate(lovelace: bigint, tcx?: StellarTxnContext): tokenPredicate<TxInput>;
    mkAssetValue(tokenId: AssetClass, count?: number): Value;
    mkMinAssetValue(tokenId: AssetClass, count?: number): Value;
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
    submit(tcx: StellarTxnContext, { sign, signers, }?: {
        sign?: boolean;
        signers?: Wallet[];
    }): Promise<TxId>;
    ADA(n: bigint | number): bigint;
    contractSource(): string | never;
    importModules(): HeliosModuleSrc[];
    loadProgramScript(params?: Partial<ConfigType>): Program | undefined;
    getMyActorAddress(): Promise<Address>;
    private get missingActorError();
    mustFindActorUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined, exceptInTcx: StellarTxnContext<any>, extraErrorHint?: string): Promise<TxInput | never>;
    mustFindActorUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined, extraErrorHint?: string): Promise<TxInput | never>;
    mustFindMyUtxo(semanticName: string, predicate: (u: TxInput) => TxInput | undefined, exceptInTcx: StellarTxnContext<any>, extraErrorHint?: string): Promise<TxInput | never>;
    mustFindMyUtxo(semanticName: string, predicate: (u: TxInput) => TxInput | undefined, extraErrorHint?: string): Promise<TxInput | never>;
    mustFindUtxo(semanticName: string, predicate: (u: TxInput) => TxInput | undefined, { address, exceptInTcx, }: {
        address: Address;
        exceptInTcx?: StellarTxnContext<any>;
    }, extraErrorHint?: string): Promise<TxInput | never>;
    toUtxoId(u: TxInput): string;
    txnFindUtxo(tcx: StellarTxnContext<any>, name: string, predicate: utxoPredicate, address?: Address): Promise<TxInput | undefined>;
    hasUtxo(semanticName: string, predicate: utxoPredicate, { address, exceptInTcx, }: {
        address: Address;
        exceptInTcx?: StellarTxnContext<any>;
    }): Promise<TxInput | undefined>;
    hasMyUtxo(semanticName: string, predicate: utxoPredicate): Promise<TxInput | undefined>;
}

declare interface StellarDelegate {
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
    txnReceiveAuthorityToken<TCX extends StellarTxnContext<any>>(tcx: TCX, fromFoundUtxo?: TxInput): Promise<TCX>;
}

export declare type stellarSubclass<S extends StellarContract<CT>, CT extends paramsBase = S extends StellarContract<infer iCT> ? iCT : paramsBase> = (new (args: StellarConstructorArgs<CT>) => S & StellarContract<CT>) & {
    defaultParams: Partial<CT>;
};

export declare interface StellarTestContext<HTH extends StellarTestHelper<SC>, SC extends StellarContract<any> = HTH extends StellarTestHelper<infer iSC> ? iSC : never> extends canHaveRandomSeed, TestContext {
    h: HTH;
    get strella(): SC;
    initHelper(config: Partial<ConfigFor<SC>> & canHaveRandomSeed & canSkipSetup): Promise<StellarTestHelper<SC>>;
}

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
    private actorName;
    get currentActor(): SimpleWallet;
    set currentActor(actorName: string);
    address?: Address;
    setupPending?: Promise<any>;
    setupActors(): void;
    constructor(config?: ConfigFor<SC> & canHaveRandomSeed & canSkipSetup);
    initialize(config: ConfigFor<SC> & canHaveRandomSeed): Promise<SC>;
    initStellarClass(): SC & StellarContract<SC extends StellarContract<infer inferredConfig extends paramsBase> ? inferredConfig : never>;
    initStrella(TargetClass: stellarSubclass<SC, ConfigFor<SC>>, config?: ConfigFor<SC>): SC & StellarContract<SC extends StellarContract<infer inferredConfig extends paramsBase> ? inferredConfig : never>;
    randomSeed?: number;
    rand?: () => number;
    delay(ms: any): Promise<unknown>;
    mkSeedUtxo(seedIndex?: bigint): Promise<helios.TxId>;
    submitTx(tx: Tx, force?: "force"): Promise<TxId>;
    mkRandomBytes(length: number): number[];
    addActor(roleName: string, walletBalance: bigint): helios.SimpleWallet;
    mkNetwork(): [NetworkEmulator, enhancedNetworkParams];
    slotToTimestamp(s: bigint): bigint | Date;
    currentSlot(): bigint | null;
    waitUntil(time: Date): bigint;
}

declare type stellarTestHelperSubclass<SC extends StellarContract<any>> = new (config: ConfigFor<SC> & canHaveRandomSeed) => StellarTestHelper<SC>;

export declare class StellarTxnContext<S = noState> {
    tx: Tx;
    inputs: TxInput[];
    collateral?: TxInput;
    outputs: TxOutput[];
    feeLimit?: bigint;
    state: S;
    constructor(state?: Partial<S>);
    dump(): string;
    mintTokens(...args: Parameters<Tx["mintTokens"]>): StellarTxnContext<S>;
    reservedUtxos(): TxInput[];
    utxoNotReserved(u: TxInput): TxInput | undefined;
    addCollateral(collateral: TxInput): this;
    addInput<TCX extends StellarTxnContext<S>>(this: TCX, ...args: Parameters<Tx["addInput"]>): TCX;
    addInputs<TCX extends StellarTxnContext<S>>(this: TCX, ...args: Parameters<Tx["addInputs"]>): TCX;
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

export declare type strategyValidation = ErrorMap | undefined;

export declare function stringToNumberArray(str: string): number[];

declare const TODO: unique symbol;

declare type TODO_TYPE = typeof TODO;

export declare type tokenNamesOrValuesEntry = [string | number[], bigint];

declare type tokenPredicate<tokenBearer extends canHaveToken> = ((something: tokenBearer) => tokenBearer | undefined) & {
    value: Value;
};

export declare function txAsString(tx: Tx): string;

export declare function txInputAsString(x: TxInput, prefix?: string): string;

export declare function txn(proto: any, thingName: any, descriptor: any): any;

export declare function txOutputAsString(x: TxOutput, prefix?: string): string;

export declare function utxoAsString(x: TxInput, prefix?: string): string;

declare type utxoInfo = {
    u: TxInput;
    sufficient: boolean;
    free: bigint;
    minAdaAmount: bigint;
};

export declare type utxoPredicate = ((u: TxInput) => TxInput | undefined) | ((u: TxInput) => boolean) | ((u: TxInput) => boolean | undefined);

export declare function utxosAsString(utxos: TxInput[], joiner?: string): string;

declare class UutName {
    private [_uutName];
    private purpose;
    constructor(purpose: string, un: string);
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

export declare function valueAsString(v: Value): string;

export declare type valuesEntry = [number[], bigint];

declare type VariantStrategy<T extends StellarContract<capoDelegateConfig & any>> = {
    delegateClass: stellarSubclass<T>;
    partialConfig?: PartialParamConfig<ConfigFor<T>>;
    validateConfig?: (p: ConfigFor<T>) => strategyValidation;
};

export { }
