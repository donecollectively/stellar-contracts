import { type Address, type MintingPolicyHash, type NetworkParams, type TxInput, type ValidatorHash, type Value, type TxOutputId } from "@helios-lang/ledger";
import type { CardanoClient, Emulator, TxChainBuilder, Wallet } from "@helios-lang/tx-utils";
import type { UplcData } from "@helios-lang/uplc";
import type { DataType, Program, EnumMemberType } from "@helios-lang/compiler";
import { StellarTxnContext, type TxDescription, type hasSeedUtxo } from "./StellarTxnContext.js";
import type { anyUplcProgram, InlineDatum } from "./HeliosPromotedTypes.js";
import { UtxoHelper, type utxoPredicate } from "./UtxoHelper.js";
import { HeliosScriptBundle } from "./helios/scriptBundling/HeliosScriptBundle.js";
import { ContractDataBridge } from "./helios/dataBridge/DataBridge.js";
import type { possiblyAbstractContractBridgeType } from "./helios/dataBridge/BridgeTypes.js";
import type { findReadDatumType } from "./helios/dataBridge/BridgeTypes.js";
import type { AbstractNew } from "./helios/typeUtils.js";
import { type hasSeed } from "./ActivityTypes.js";
import type { DeployedScriptDetails } from "./configuration/DeployedScriptConfigs.js";
import type { TxBatcher } from "./networkClients/TxBatcher.js";
type NetworkName = "testnet" | "mainnet";
/**
 * @public
 */
export declare function isUplcData(x: any): x is UplcData;
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
export type stellarSubclass<S extends StellarContract<any>> = (new (setup: SetupInfo) => S) & {
    defaultParams: Partial<ConfigFor<S>>;
    createWith(args: StellarSetupDetails<ConfigFor<S>>): Promise<S>;
    parseConfig(rawJsonConfig: any): any;
};
/**
 * Properties for Datum structures for on-chain scripts
 * @public
 **/
export type anyDatumProps = Record<string, any>;
/**
 * Configuration details for StellarContract classes
 * @public
 **/
export interface configBaseWithRev {
    rev: bigint;
}
/**
 * @public
 */
export type UplcRecord<CT extends configBaseWithRev> = {
    [key in keyof CT]: UplcData;
};
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
     * The factory function should follow an active-verb convention by including "ing" in
     * the name of the factory function
     *
     * Its leading prefix should also match one of 'activity', 'burn', or 'mint'.  These
     * conventions don't affect the way the activity is verified on-chain, but they
     * provide guard-rails for naming consistency.
     * @public
     **/
    redeemer(proto: any, thingName: any, descriptor: any): any;
    redeemerData(proto: any, thingName: any, descriptor: any): any;
};
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
 * Decorates functions that can construct a new transaction context for a specific use-case
 * @remarks
 *
 * function names must follow the mkTxn... convention.
 * @public
 **/
export declare function txn(proto: any, thingName: any, descriptor: any): any;
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
/**
 * @public
 */
export type HeliosOptimizeOptions = Exclude<Pick<Exclude<Parameters<Program["compile"]>[0], undefined | boolean>, "optimize">["optimize"], undefined | boolean>;
/**
 * @public
 */
export type UtxoDisplayCache = Map<TxOutputId, string>;
/**
 * standard setup for any Stellar Contract class
 * @public
 **/
export type SetupInfo = {
    /** access to ledger: utxos, txn-posting; can sometimes be a TxChainBuilder overlay on the real network */
    network: CardanoClient | Emulator;
    /** the actual network client; never a TxChainBuilder */
    chainBuilder?: TxChainBuilder;
    /** the params for this network */
    networkParams: NetworkParams;
    /** collects a batch of transactions, connected with a TxChainBuilder in context */
    txBatcher: TxBatcher;
    /** false for any testnet.  todo: how to express L2? */
    isMainnet: boolean;
    /** wallet-wrapping envelope, allows wallet-changing without reinitializing anything using that envelope */
    actorContext: ActorContext;
    /** testing environment? */
    isTest?: boolean;
    /** helper for finding utxos and related utility functions */
    uh?: UtxoHelper;
    /** global setting for script-compile optimization, only used when a compilation is triggered, can be overridden per script-bundle  */
    optimize?: boolean | HeliosOptimizeOptions;
    /** presentation-cache indicates utxos whose details have already been emitted to the console */
    uxtoDisplayCache?: UtxoDisplayCache;
};
/**
 * @public
 * Extracts the config type for a Stellar Contract class
 **/
export type ConfigFor<SC extends StellarContract<any>> = configBaseWithRev & SC extends StellarContract<infer inferredConfig> ? inferredConfig : never;
/**
 * Initializes a stellar contract class
 * @remarks
 *
 * Includes network and other standard setup details, and any configuration needed
 * for the specific class.
 * @public
 **/
export type StellarSetupDetails<CT extends configBaseWithRev> = {
    setup: SetupInfo;
    config?: CT;
    partialConfig?: Partial<CT>;
    previousOnchainScript?: {
        validatorHash: number[];
        uplcProgram: anyUplcProgram;
    };
};
export type SetupOrMainnetSignalForBundle = Partial<Omit<SetupInfo, "isMainnet">> & Required<Pick<SetupInfo, "isMainnet">>;
export type PartialStellarBundleDetails<CT extends configBaseWithRev> = Omit<StellarBundleSetupDetails<CT>, "setup">;
export type StellarBundleSetupDetails<CT extends configBaseWithRev> = {
    setup: SetupOrMainnetSignalForBundle;
    scriptParamsSource?: "config" | "bundle" | "none";
    specialOriginatorLabel?: string;
    previousOnchainScript?: {
        validatorHash: number[];
        uplcProgram: anyUplcProgram;
    };
    params?: CT;
    /**
     * used only for Capo bundles, to initialize them based on
     * their `.hlDeploy.<network>.json` config file
     */
    deployedDetails?: DeployedScriptDetails<CT>;
    variant?: string;
};
type scriptPurpose = "testing" | "minting" | "spending" | "staking" | "module" | "endpoint" | "non-script";
type ComputedScriptProperties = Partial<{
    vh: ValidatorHash;
    addr: Address;
    mph: MintingPolicyHash;
    program: Program;
    identity: string;
}>;
/**
 * @public
 */
export type ActorContext<WTP extends Wallet = Wallet> = {
    wallet?: WTP;
    others: Record<string, WTP>;
};
/**
 * @public
 */
export type NetworkContext<NWT extends CardanoClient = CardanoClient> = {
    network: NWT;
};
/**
 * Basic wrapper and off-chain facade for interacting with a single Plutus contract script
 * @remarks
 *
 * This class is normally used only for individual components of a higher-level {@link Capo | Capo or Leader contract},
 * which act as delegates within its application context.  Nonetheless, it is the base class for every Capo as well as
 * simpler contract scripts.
 *
 * The StellarContract class serves as an off-chain facade for transaction-building and interfacing to any on-chain
 * contract script.  Each StellarContract subclass must define a `contractSource()`, which is currently a Helios-language
 * script, compiled in any Javascript environment to an on-chain executable UPLC or "plutus core" form.  This enables
 * a static dApp to be self-sovereign, without need for any server ("application back-end") environment.
 *
 * @typeParam ConfigType - schema for the configuration needed for creating or reproducing a
 * specific instance of the contract script on-chain.
 *
 * @public
 **/
export declare class StellarContract<ConfigType extends configBaseWithRev> {
    configIn?: ConfigType;
    partialConfig?: Partial<ConfigType>;
    setup: SetupInfo;
    get network(): CardanoClient | Emulator | TxChainBuilder;
    networkParams: NetworkParams;
    actorContext: ActorContext<any>;
    static get defaultParams(): {};
    static parseConfig(rawJsonConfig: any): void;
    /** each StellarContracts subclass needs to provide a scriptBundle class.
     * @remarks
     * Your script bundle MUST be defined in a separate file using a convention of
     * `‹scriptName›.hlb.ts`, and exported as a default class.  It should inherit
     * from HeliosScriptBundle or one of its subclasses.  Stellar Contracts processes
     * this file, analyzes the on-chain types defined in your Helios sources, and generates
     * Typescript types and a data-bridging class for your script.
     *
     * Once the data-bridge class is generated, you should import it into your contract
     * module and assign it to your `dataBridgeClass` attribute.
     */
    scriptBundleClass(): Promise<typeof HeliosScriptBundle>;
    /**
     * the dataBridgeClass attribute MUST be defined for any bundle having a datum type
     *  - this is the bridge class for converting from off-chain data types to on-chain data
     *  - it provides convenient, type-safe interfaces for doing that
     *
     * @remarks
     * Minters don't have datum, so they don't need to define this attribute.  However,
     * note that ***mint delegates*** do in fact have datum types. If you are defining
     * a custom delegate of that kind, you will need to define this attribute.
     */
    dataBridgeClass: AbstractNew<ContractDataBridge> | undefined;
    /**
     * The `onchain` object provides access to all bridging capabilities for this contract script.
     * @remarks
     * Its nested attributes include:
     *  - `types` - a collection of all the on-chain types defined in the script, with data-creation helpers for each
     *  - `activity` - a creation helper for the activities/redeemers defined in the script
     *
     * Scripts that use datum types (not including minters) will also have:
     *  - `datum` - a data-creation helper for the datum type of the script
     *  - `readDatum` - a data-reading helper for the datum type of the script
     *
     * ### Low-level type access
     * For low-level access (it's likely you don't need to use this) for on-chain types, the `reader` attribute (aka `offchain`) exists: .
     *  - `reader` - a collection of data-reading helpers for the on-chain types, given UPLC data known to be of that type
     * @public
     */
    get onchain(): possiblyAbstractContractBridgeType<this>;
    /**
     * The `offchain` object provides access to readers for the on-chain types of this contract script.
     * @remarks
     * Its nested attributes include all the on-chain types defined in the script, with data-reading helpers for each.
     * This is useful for reading on-chain data in off-chain code.
     *
     * ### Warning: low-level typed-data access!
     *
     * Note that these readers will work properly with UPLC data known to be of the correct type.  If you
     * encounter errors related to these results, it's likely you are using the wrong reader for the data you
     * have in hand.
     *
     * For the typical use-case of reading the datum type from a UTxO held in the contract, this is not a problem,
     * and note that the `readDatum` helper provides a shortcut for this most-common use-case.
     *
     * If you're not sure what you're doing, it's likely that this is not the right tool for your job.
     * @public
     */
    get offchain(): possiblyAbstractContractBridgeType<this>["reader"];
    get reader(): possiblyAbstractContractBridgeType<this>["reader"];
    get activity(): any;
    /**
     * Converts UPLC from an on-chain datum object to a typed off-chain datum object.
     *
     * Given a **utxo with a datum of the contract's datum type**, this method will convert the UPLC datum
     * to a typed off-chain datum object.
     *
     * ### Standard WARNING
     *
     * If the datum's structure is not of the expected type, this method MAY throw an error, or it might
     * return data that can cause problems somewhere else in your code.  That won't happen if you're
     * following the guidance above.
     */
    get newReadDatum(): findReadDatumType<this>;
    _bundle: HeliosScriptBundle | undefined;
    getBundle(): Promise<HeliosScriptBundle>;
    /**
     * Provides access to the script's activities with type-safe structures needed by the validator script.
     *
     * @remarks - the **redeemer** data (needed by the contract script) is defined as one or
     * more activity-types (e.g. in a struct, or an enum as indicated in the type of the last argument to
     * the validator function).
     *   - See below for more about ***setup & type-generation*** if your editor doesn't  provide auto-complete for
     *    the activities.
     *
     * ### A terminology note: Activities and Redeemers
     *
     * Although the conventional terminology of "redeemer" is universally well-known
     * in the Cardano developer community, we find that defining one or more **activities**,
     * with their associated ***redeemer data***, provides an effective semantic model offering
     * better clarity and intution.
     *
     * Each type of contract activity corresponds to an enum variant in the contract script.
     * For each of those variants, its redeemer data contextualizes the behavior of the requested
     * transaction.  A non-enum redeemer-type implies that there is only one type of activity.
     *
     * Any data not present in the transaction inputs or outputs, but needed for
     * specificity of the requested activity, can only be provided through these activity details.
     * If that material is like a "claim ticket", it would match the "redeemer" type of labeling.
     *
     * Activity data can include any kinds of details needed by the validator: settings for what it
     * is doing, options for how it is being done, or what remaining information the validator may
     * need, to verify the task is being completed according to protocol.  Transactions containing
     * a variety of inputs and output, each potential candidates for an activity, can use the activity
     * details to resolve ambiguity so the validator easily acts on the correct items.
     *
     * ### Setup and Type generation
     * #### Step 1: create your script **`.hlb.ts`**
     * With a defined script bundle, `import YourScriptNameBundle from "./YourBundleName.hlb.js"`
     * to your StellarContracts class module, and define a `scriptBundle() { return new YourScriptNameBundle() }` or
     * similar method in that class.
     *
     * This results in a generated **`.typeInfo.d.ts`** and **`.bridge.ts`** with complete
     * typescript bindings for your on-chain script (trouble? check Plugin setup below).
     *
     * #### Step 2: Import the generated bridge class
     * Using the generated .bridge file:
     * > `import YourScriptNameDataBridge from "./YourBundleName.bridge.js"`
     *
     * ... and set the `dataBridgeClass` property in your class:
     *
     * >    `dataBridgeClass = YourScriptNameDataBridge`
     *
     * ### Plugin Setup
     *
     * The activity types should be available through type-safe auto-complete in your editor.  If not,
     * you may need to install and configure the Stellar Contracts rollup plugins for importing .hl
     * files and generating .d.ts for your .hlb.ts files.  See the Stellar Contracts development
     * guide for additional details.
     *
     */
    /**
     * Provides access to the script's defined on-chain types, using a fluent
     * API for type-safe generation of data conforming to on-chain data formats & types.
     * @remarks
     *
     */
    _dataBridge?: ContractDataBridge;
    getOnchainBridge(): possiblyAbstractContractBridgeType<this>;
    ADA(n: bigint | number): bigint;
    get isConfigured(): boolean;
    get isConnected(): boolean;
    /**
     * returns the wallet connection used by the current actor
     * @remarks
     *
     * Throws an error if the strella contract facade has not been initialized with a wallet in settings.actorContext
     * @public
     **/
    get wallet(): any;
    get missingActorError(): string;
    /**
     * Transforms input configuration to contract script params
     * @remarks
     * May filter out any keys from the ConfigType that are not in the contract
     * script's params.  Should add any keys that may be needed by the script and
     * not included in the ConfigType (as delegate scripts do with `delegateName`).
     */
    getContractScriptParams(config: ConfigType): Partial<ConfigType> & Required<Pick<ConfigType, "rev">>;
    delegateReqdAddress(): false | Address;
    delegateAddrHint(): Address[] | undefined;
    walletNetworkCheck?: Promise<NetworkName> | NetworkName;
    /**
     * Factory function for a configured instance of the contract
     * @remarks
     *
     * Due to boring details of initialization order, this factory function is needed
     * for creating a new instance of the contract.
     * @param args - setup and configuration details
     * @public
     **/
    static createWith<thisType extends StellarContract<configType>, configType extends configBaseWithRev = thisType extends StellarContract<infer iCT> ? iCT : never>(this: stellarSubclass<any>, args: StellarSetupDetails<configType>): Promise<StellarContract<configType> & InstanceType<typeof this>>;
    /**
     * obsolete public constructor.  Use the createWith() factory function instead.
     *
     * @public
     **/
    constructor(setup: SetupInfo);
    get canPartialConfig(): boolean;
    /**
     * performs async initialization, enabling an async factory pattern
     * @remarks
     * This method is called by the createWith() factory function, and should not be called directly.
     *
     *
     */
    init(args: StellarSetupDetails<ConfigType>): Promise<this>;
    mkScriptBundle(setupDetails?: PartialStellarBundleDetails<any>): Promise<any>;
    _compiledScript: anyUplcProgram;
    get compiledScript(): anyUplcProgram;
    asyncCompiledScript(): Promise<import("@helios-lang/uplc").UplcProgramV2>;
    usesContractScript: boolean;
    get datumType(): DataType;
    /**
     * @internal
     **/
    get purpose(): scriptPurpose;
    get validatorHash(): ValidatorHash<unknown>;
    get address(): Address;
    get mintingPolicyHash(): MintingPolicyHash;
    get identity(): string;
    outputsSentToDatum(datum: InlineDatum): Promise<any>;
    /**
     * Returns the indicated Value to the contract script
     * @public
     * @param tcx - transaction context
     * @param value - a value already having minUtxo calculated
     * @param datum - inline datum
     **/
    txnKeepValue(tcx: StellarTxnContext, value: Value, datum: InlineDatum): StellarTxnContext<import("./StellarTxnContext.js").anyState>;
    /**
     * Returns all the types exposed by the contract script
     * @remarks
     *
     * Passed directly from Helios; property names match contract's defined type names
     *
     * @public
     **/
    get onChainTypes(): Program["userTypes"][string];
    /**
     * identifies the enum used for the script Datum
     * @remarks
     *
     * Override this if your contract script uses a type name other than Datum.
     * @public
     **/
    get scriptDatumName(): string;
    /**
     * The on-chain type for datum
     * @remarks
     *
     * This getter provides a class, representing the on-chain enum used for attaching
     * data (or data hashes) to contract utxos the returned type (and its enum variants)
     * are suitable for off-chain txn-creation override `get scriptDatumName()` if
     * needed to match your contract script.
     * @public
     **/
    get onChainDatumType(): DataType;
    get preloadedBundle(): HeliosScriptBundle;
    /**
     * identifies the enum used for activities (redeemers) in the Helios script
     * @remarks
     *
     * Override this if your contract script uses a type name other than Activity.
     * @public
     **/
    get scriptActivitiesName(): string;
    getSeed(arg: hasSeed): TxOutputId;
    loadProgram(): import("./helios/HeliosProgramWithMockCacheAPI.js").HeliosProgramWithCacheAPI;
    /**
     * returns the on-chain type for activities ("redeemers")
     * @remarks
     *
     * Use mustGetActivityName() instead, to get the type for a specific activity.
     *
     * returns the on-chain enum used for spending contract utxos or for different use-cases of minting (in a minting script).
     * the returned type (and its enum variants) are suitable for off-chain txn-creation
     * override `get onChainActivitiesName()` if needed to match your contract script.
     * @public
     **/
    get onChainActivitiesType(): DataType;
    /** @ignore */
    /**
     * Retrieves an on-chain type for a specific named activity ("redeemer")
     * @remarks
     *
     * Cross-checks the requested name against the available activities in the script.
     * Throws a helpful error if the requested activity name isn't present.'
     *
     * @param activityName - the name of the requested activity
     *
     **/
    mustGetActivity(activityName: string): EnumMemberType | null;
    /**
     * asserts the presence of the indicated activity name in the on-chain script
     * @remarks
     * The activity name is expected to be found in the script's redeemer enum
     */
    mustHaveActivity(activityName: string): EnumMemberType | null;
    activityRedeemer(activityName: string, data?: any): {
        redeemer: UplcData;
    };
    activityVariantToUplc(activityName: string, data: any): UplcData;
    mustGetEnumVariant(enumType: DataType, variantName: string): EnumMemberType | null;
    inlineDatum(datumName: string, data: any): import("@helios-lang/ledger").InlineTxOutputDatum;
    /**
     * provides a temporary indicator of mainnet-ness, while not
     * requiring the question to be permanently resolved.
     * @remarks
     * Allows other methods to proceed prior to the final determination of mainnet status.
     *
     * Any code using this path should avoid caching a negative result.  If you need to
     * determine the actual network being used, getBundle().isMainnet, if present, provides
     * the definitive answer.  If that attribute is not yet present, then the mainnet status
     * has not yet been materialized.
     * @public
     */
    isDefinitelyMainnet(): boolean;
    paramsToUplc(params: Record<string, any>): UplcRecord<ConfigType>;
    typeToUplc(type: DataType, data: any, path?: string): UplcData;
    get program(): import("./helios/HeliosProgramWithMockCacheAPI.js").HeliosProgramWithCacheAPI;
    _utxoHelper: UtxoHelper;
    /**
     * Provides access to a UtxoHelper instance
     */
    get utxoHelper(): UtxoHelper;
    /**
     * Provides access to a UtxoHelper instance
     * @remarks - same as utxoHelper, but with a shorter name
     */
    get uh(): UtxoHelper;
    /**
     * @deprecated - use `tcx.submit()` instead.
     */
    submit(tcx: StellarTxnContext, { signers, addlTxInfo, }?: {
        signers?: Address[];
        addlTxInfo?: Pick<TxDescription<any, any>, "description">;
    }): Promise<void>;
    _cache: ComputedScriptProperties;
    optimize: boolean;
    prepareBundleWithScriptParams(params: Partial<ConfigType> & Required<Pick<ConfigType, "rev">>): Promise<void>;
    /**
     * Locates a UTxO locked in a validator contract address
     * @remarks
     *
     * Throws an error if no matching UTxO can be found
     * @param semanticName - descriptive name; used in diagnostic messages and any errors thrown
     * @param options - options for the search
     * @public
     **/
    mustFindMyUtxo(semanticName: string, options: {
        /** filter function; returns its utxo if it matches expectations */
        predicate: utxoPredicate;
        /** any utxos already in the transaction context are disregarded and not passed to the predicate function */
        exceptInTcx?: StellarTxnContext;
        /** developer-facing guidance for dealing with the miss if the utxo is not found.  The developer might pass this along to the user; try to make it helpful. */
        extraErrorHint?: string;
        /** any utxos already in the transaction context are disregarded and not passed to the predicate function */
        utxos?: TxInput[];
    }): Promise<TxInput>;
    /**
     * Reuses an existing transaction context, or creates a new one with the given name and the current actor context
     */
    mkTcx<TCX extends StellarTxnContext>(tcx: StellarTxnContext | undefined, name?: string): TCX;
    /**
     * Creates a new transaction context with the current actor context
     */
    mkTcx(name?: string): StellarTxnContext;
    /**
     * Finds a free seed-utxo from the user wallet, and adds it to the transaction
     * @remarks
     *
     * Accepts a transaction context that may already have a seed.  Returns a typed
     * tcx with hasSeedUtxo type.
     *
     * The seedUtxo will be consumed in the transaction, so it can never be used
     * again; its value will be returned to the user wallet.
     *
     * The seedUtxo is needed for UUT minting, and the transaction is typed with
     * the presence of that seed (found in tcx.state.seedUtxo).
     *
     * If a seedUtxo is already present in the transaction context, no additional seedUtxo
     * will be added.
     *
     * If a seedUtxo is provided as an argument, that utxo must already be present
     * in the transaction inputs; the state will be updated to reference it.
     *
     * @public
     *
     **/
    tcxWithSeedUtxo<TCX extends StellarTxnContext>(tcx?: TCX, seedUtxo?: TxInput): Promise<TCX & hasSeedUtxo>;
    findUutSeedUtxo(uutPurposes: string[], tcx: StellarTxnContext<any>): Promise<TxInput>;
}
export {};
//# sourceMappingURL=StellarContract.d.ts.map