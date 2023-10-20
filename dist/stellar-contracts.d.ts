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

export declare function addTestContext<SC extends StellarContract<any>, P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never>(context: StellarTestContext<any, SC, P>, TestHelperClass: helperSubclass<SC>, params?: P): Promise<void>;

declare type anyDatumArgs = Record<string, any>;

export declare type anyDatumProps = Record<string, any>;

export declare function assetsAsString(v: any): string;

export declare class BasicMintDelegate extends StellarContract<MintDelegateArgs> {
    static currentRev: bigint;
    static get defaultParams(): {
        rev: bigint;
    };
    contractSource(): any;
    getContractScriptParams(config: MintDelegateArgs): paramsBase;
    txnCreatingTokenPolicy(tcx: StellarTxnContext, tokenName: string): Promise<StellarTxnContext>;
    servesDelegationRole(role: string): true | undefined;
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
 * Any Capo contract can (and must) define roles() to establish collaborating scripts; these are used for
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
    abstract get roles(): RoleMap;
    constructor(args: StellarConstructorArgs<CapoBaseConfig>);
    abstract contractSource(): string;
    abstract mkDatumCharterToken(args: charterDatumType): InlineDatum;
    get minterClass(): stellarSubclass<DefaultMinter, SeedTxnParams>;
    minter?: minterType;
    txnCreatingUuts<const purposes extends string, TCX extends StellarTxnContext<any>>(tcx: TCX, uutPurposes: purposes[], seedUtxo?: TxInput): Promise<TCX & hasUutContext<purposes>>;
    uutsValue(uutMap: uutPurposeMap<any>): Value;
    uutsValue(tcx: hasUutContext<any>): Value;
    protected usingAuthority(): isActivity;
    protected abstract updatingCharter(args: charterDatumType): isActivity;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    importModules(): HeliosModuleSrc[];
    abstract mkTxnMintCharterToken(charterDatumArgs: Partial<charterDatumType>, tcx?: StellarTxnContext): Promise<StellarTxnContext | never>;
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
    getMinterParams(): {
        seedTxn: TxId;
        seedIndex: bigint;
    };
    getCapoRev(): bigint;
    getContractScriptParams(config: configType): {
        mph: MintingPolicyHash;
        rev: bigint;
    };
    get mph(): MintingPolicyHash;
    get mintingPolicyHash(): MintingPolicyHash;
    connectMintingScript(params: SeedTxnParams): minterType;
    mustGetContractSeedUtxo(): Promise<TxInput | never>;
    withDelegates(delegates: SelectedDelegates): hasSelectedDelegates;
    txnGetSelectedDelegateConfig<T extends StellarContract<any>, const RN extends string>(tcx: hasSelectedDelegates, roleName: RN): PartialParamConfig<ConfigFor<T>>;
    txnMustSelectDelegate<T extends StellarContract<any>, const RN extends string, TCX extends hasSelectedDelegates>(tcx: TCX, roleName: RN): SelectedDelegate<T>;
    protected txnMustConfigureSelectedDelegate<T extends StellarContract<any>, const RN extends string>(tcx: hasSelectedDelegates & hasUutContext<RN>, roleName: RN): DelegateSettings<T>;
    mkImpliedSettings(uut: UutName): CapoImpliedSettings;
    txnMustGetDelegate<T extends StellarContract<any>, const RN extends string>(tcx: hasSelectedDelegates & hasUutContext<RN>, roleName: RN, configuredDelegate?: DelegateSettings<T>): T;
    connectDelegateWith<DelegateType extends StellarContract<any>>(roleName: string, delegateLink: RelativeDelegateLink<ConfigFor<DelegateType>>): Promise<DelegateType>;
    capoRequirements(): ReqtsMap_2<"is a base class for leader/Capo pattern" | "can create unique utility tokens" | "supports the Delegation pattern using roles and strategy-variants" | "supports well-typed role declarations and strategy-adding" | "supports just-in-time strategy-selection using withDelegates() and txnMustGetDelegate()" | "supports concrete resolution of existing role delegates" | "Each role uses a RoleVariants structure which can accept new variants" | "provides a Strategy type for binding a contract to a strategy-variant name">;
}

declare type CapoBaseConfig = SeedTxnParams & {
    mph: MintingPolicyHash;
};

declare type CapoImpliedSettings = {
    uut: AssetClass;
};

export declare abstract class CapoTestHelper<SC extends Capo<any>, CDT extends anyDatumArgs = SC extends Capo<any, infer iCDT> ? iCDT : anyDatumArgs> extends StellarTestHelper<SC, CapoBaseConfig> {
    initialize({ randomSeed, seedTxn, seedIndex, }?: {
        seedTxn?: TxId;
        seedIndex?: bigint;
        randomSeed?: number;
    }): Promise<SC>;
    abstract mkDefaultCharterArgs(): Partial<CDT>;
    mintCharterToken(args?: CDT): Promise<StellarTxnContext>;
}

declare type ConfigFor<SC extends StellarContract<C>, C extends paramsBase = SC extends StellarContract<infer inferredConfig> ? inferredConfig : never> = C;

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
 *
 * See the {@link Capo | Capo base class} and {@link StellarContract} for addition context.
 * @public
 */
export declare class DefaultCapo<MinterType extends DefaultMinter = DefaultMinter, CDT extends DefaultCharterDatumArgs = DefaultCharterDatumArgs, configType extends CapoBaseConfig = CapoBaseConfig> extends Capo<MinterType, CDT, configType> {
    contractSource(): any;
    get roles(): RoleMap;
    mkDatumCharterToken(args: CDT): InlineDatum;
    txnAddCharterAuthz(tcx: StellarTxnContext, datum: InlineDatum): Promise<StellarTxnContext<{}>>;
    mkTxnMintCharterToken(charterDatumArgs: PartialDefaultCharterDatumArgs<CDT>, existingTcx?: hasSelectedDelegates): Promise<StellarTxnContext | never>;
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
export declare class DefaultCapoTestHelper<DC extends DefaultCapo<any> = DefaultCapo> extends CapoTestHelper<DC> {
    get stellarClass(): stellarSubclass<DC>;
    setupActors(): void;
    mkCharterSpendTx(): Promise<StellarTxnContext>;
    mkDefaultCharterArgs(): PartialDefaultCharterDatumArgs;
    updateCharter(args: DefaultCharterDatumArgs): Promise<StellarTxnContext>;
}

/**
 * Schema for Charter Datum, which allows state to be stored in the Leader contract
 * together with it's primary or "charter" utxo.
 *
 * @typeParam CT - allows type-safe partial-`config`uration details for the charter's authority-delegate
 *    to be to be stored within the datum.
 **/
export declare type DefaultCharterDatumArgs<CT extends paramsBase = CapoBaseConfig> = {
    govAuthorityLink: RelativeDelegateLink<CT>;
};

export declare class DefaultMinter extends StellarContract<SeedTxnParams> implements MinterBaseMethods {
    contractSource(): any;
    importModules(): HeliosModuleSrc[];
    txnWithUuts<const purposes extends string, existingTcx extends StellarTxnContext<any>, const R extends string>(tcx: existingTcx, uutPurposes: purposes[], seedUtxo: TxInput, role: R): Promise<existingTcx & hasUutContext<purposes | (R extends "" ? never : R)>>;
    txnCreatingUuts<const purposes extends string, TCX extends StellarTxnContext<any>>(initialTcx: TCX, uutPurposes: purposes[], seedUtxo?: TxInput): Promise<TCX & hasUutContext<purposes>>;
    mkUutValuesEntries<UM extends uutPurposeMap<any>>(uutMap: UM): valuesEntry[];
    get mintingPolicyHash(): MintingPolicyHash;
    protected mintingCharter({ owner, }: MintCharterRedeemerArgs): isActivity;
    protected mintingUuts({ seedTxn, seedIndex: sIdx, purposes, }: MintUutRedeemerArgs): isActivity;
    get charterTokenAsValuesEntry(): valuesEntry;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    txnMintingCharter(tcx: StellarTxnContext, { owner, authZor }: {
        authZor: UutName;
        owner: Address;
    }): Promise<StellarTxnContext>;
}

declare type DelegateSettings<T extends StellarContract<any>> = {
    delegateClass: stellarSubclass<T>;
    roleName: string;
    strategyName: string;
    config: ConfigFor<T>;
    reqdAddress?: Address;
    addressesHint?: Address[];
};

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

declare type hasDelegateProp = {
    delegates: SelectedDelegates;
};

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
export declare function hasReqts<R extends ReqtsMap<reqts>, const reqts extends string = string & keyof R>(reqtsMap: R): ReqtsMap<reqts>;

export declare namespace hasReqts {
    var TODO: unique symbol;
}

declare type hasSelectedDelegates = StellarTxnContext<hasDelegateProp>;

declare type hasSetup = {
    setup: SetupDetails;
};

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
    txnCreatingUuts<const purposes extends string, TCX extends StellarTxnContext<any>>(tcx: TCX, uutPurposes: purposes[], seedUtxo?: TxInput): Promise<TCX & hasUutContext<purposes>>;
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

declare type helperSubclass<SC extends StellarContract<any>, P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never> = new (params: P & canHaveRandomSeed) => StellarTestHelper<SC, P>;

export declare type InlineDatum = ReturnType<typeof DatumInline>;

/**
 * indirection details pointing to the information needed for reconsistituting an instance
 * @remarks
 *
 * a record of metadata that indirectly identifies where the Capo configuration
 * for a specific instance has been recorded, so that the instance can be reconstituted.
 * @public
 **/
declare type instanceCaptureRecord = {
    id: string;
    scope: string;
    evidence: string;
};

/**
 * a type for redeemer/activity-factory functions declared with @Activity.redeemer
 *
 * @public
 */
export declare type isActivity = {
    redeemer: UplcDataValue | UplcData;
};

export declare function lovelaceToAda(l: bigint | number): string;

declare type MintCharterRedeemerArgs<T = {}> = T & {
    owner: Address;
};

declare type MintDelegateArgs = {
    rev: bigint;
    uut: AssetClass;
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

declare type needsConfigCapture<C extends paramsBase> = {
    partialConfig: Partial<C>;
    onInstanceCreated(config: C): instanceCaptureRecord;
};

declare type noState = {};

declare const PARAM_IMPLIED: unique symbol;

declare const PARAM_REQUIRED: unique symbol;

export declare type paramsBase = Record<string, any>;

declare type PartialDefaultCharterDatumArgs<T extends DefaultCharterDatumArgs<any> = DefaultCharterDatumArgs, CT extends paramsBase = T extends DefaultCharterDatumArgs<infer iCT> ? iCT : never> = Partial<Omit<T, "govAuthorityLink">> & {
    govAuthorityLink: Required<Pick<RelativeDelegateLink<CT>, "strategyName">> & Partial<RelativeDelegateLink<CT>>;
};

declare type PartialParamConfig<CT extends paramsBase> = Partial<{
    [key in keyof CT]: typeof PARAM_REQUIRED | typeof PARAM_IMPLIED | CT[key];
}>;

export declare function partialTxn(proto: any, thingName: any, descriptor: any): any;

declare type RelativeDelegateLink<CT extends paramsBase> = {
    uutName: string;
    strategyName: string;
    config: Partial<CT>;
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
export declare type ReqtsMap<reqts extends string> = {
    [reqtDescription in reqts]: TODO_TYPE | RequirementEntry<reqts>;
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

export declare type RoleMap = Record<string, VariantMap<any>>;

declare type scriptPurpose = "testing" | "minting" | "spending" | "staking" | "module" | "endpoint";

export declare type SeedTxnParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};

declare type SelectedDelegate<T extends StellarContract<any>> = {
    strategyName: string;
    config: Partial<ConfigFor<T>>;
};

declare type SelectedDelegates = {
    [roleName: string]: SelectedDelegate<StellarContract<any>>;
};

declare type SetupDetails = {
    network: Network;
    networkParams: NetworkParams;
    isTest: boolean;
    myActor?: Wallet;
};

declare type StellarConstructorArgs<CT extends paramsBase> = (hasSetup & Partial<needsConfigCapture<CT>> & {
    config: CT;
    partialConfig?: Partial<CT>;
}) & ((hasSetup & {
    config: CT;
}) | (hasSetup & needsConfigCapture<CT>));

export declare class StellarContract<ConfigType extends paramsBase> {
    scriptProgram?: Program;
    configIn: ConfigType;
    contractParams: paramsBase;
    setup: SetupDetails;
    network: Network;
    networkParams: NetworkParams;
    myActor?: Wallet;
    static get defaultParams(): {};
    getContractScriptParams(config: ConfigType): paramsBase;
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
    stringToNumberArray(str: string): number[];
    mkValuesEntry(tokenName: string, count: bigint): valuesEntry;
    outputsSentToDatum(datum: InlineDatum): Promise<TxInput[]>;
    totalValue(utxos: TxInput[]): Value;
    txnKeepValue(tcx: StellarTxnContext, value: Value, datum: InlineDatum): StellarTxnContext<{}>;
    addScriptWithParams<SC extends StellarContract<any>>(TargetClass: new (a: SC extends StellarContract<any> ? StellarConstructorArgs<ConfigFor<SC>> : never) => SC, params: SC extends StellarContract<infer P> ? P : never): SC;
    readDatum<DPROPS extends anyDatumProps>(datumName: string, datum: Datum | InlineDatum): Promise<DPROPS>;
    private readUplcStructList;
    private readUplcDatum;
    private readUplcField;
    findSmallestUnusedUtxo(lovelace: bigint, utxos: TxInput[], tcx?: StellarTxnContext): TxInput | undefined;
    mkValuePredicate(lovelace: bigint, tcx?: StellarTxnContext): tokenPredicate<TxInput>;
    mkAssetValue(tokenId: AssetClass, count?: number): Value;
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
    loadProgramScript(params: ConfigType): Program | null;
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

export declare type stellarSubclass<S extends StellarContract<CT>, CT extends paramsBase = S extends StellarContract<infer iCT> ? iCT : paramsBase> = (new (args: StellarConstructorArgs<CT>) => S & StellarContract<CT>) & {
    defaultParams: Partial<CT>;
};

export declare interface StellarTestContext<HTH extends StellarTestHelper<SC, P>, SC extends StellarContract<any> = HTH extends StellarTestHelper<infer SC2, any> ? SC2 : never, P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never> extends canHaveRandomSeed, TestContext {
    h: HTH;
    get strella(): SC;
    initHelper(params: Partial<P> & canHaveRandomSeed & canSkipSetup): Promise<StellarTestHelper<SC, P>>;
}

export declare abstract class StellarTestHelper<SC extends StellarContract<any>, CT extends paramsBase = SC extends StellarContract<infer iCT> ? iCT : never> {
    state: Record<string, any>;
    abstract get stellarClass(): stellarSubclass<SC, any>;
    config?: CT;
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
    constructor(params?: CT & canHaveRandomSeed & canSkipSetup);
    initialize(params: CT & canHaveRandomSeed): Promise<SC>;
    initStellarClass(): SC & StellarContract<any>;
    initStrella(TargetClass: stellarSubclass<SC, any>, config: any): SC & StellarContract<any>;
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
    addInput(...args: Parameters<Tx["addInput"]>): StellarTxnContext<S>;
    addInputs(...args: Parameters<Tx["addInputs"]>): StellarTxnContext<S>;
    addOutput(...args: Parameters<Tx["addOutput"]>): StellarTxnContext<S>;
    addOutputs(...args: Parameters<Tx["addOutputs"]>): StellarTxnContext<S>;
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

export declare function utxoAsString(u: TxInput, prefix?: string): string;

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

declare type VariantMap<T extends StellarContract<any>> = Record<string, VariantStrategy<T>>;

export declare function variantMap<T extends StellarContract<any>>(vm: VariantMap<T>): VariantMap<T>;

declare type VariantStrategy<T extends StellarContract<any>> = {
    delegateClass: stellarSubclass<T>;
    partialConfig?: PartialParamConfig<ConfigFor<T>>;
    validateConfig(p: ConfigFor<T>): strategyValidation;
};

export { }
