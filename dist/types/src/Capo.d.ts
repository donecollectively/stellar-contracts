import { type UplcData } from "@helios-lang/uplc";
import { type MintingPolicyHash, type TxInput, type Value, type TxOutputDatum, type TxId } from "@helios-lang/ledger";
import { CapoHeliosBundle } from "./helios/scriptBundling/CapoHeliosBundle.js";
import { CapoMinter } from "./minting/CapoMinter.js";
import { StellarContract } from "./StellarContract.js";
import type { StellarSetupDetails, stellarSubclass, ConfigFor, StellarBundleSetupDetails } from "./StellarContract.js";
import type { anyUplcProgram } from "./HeliosPromotedTypes.js";
import { StellarTxnContext, type hasAddlTxns, type hasSeedUtxo, type anyState } from "./StellarTxnContext.js";
import { UutName } from "./delegation/UutName.js";
import type { ConfiguredDelegate, DelegateConfigDetails, OffchainPartialDelegateLink, DelegationDetail, capoDelegateConfig } from "./delegation/RolesAndDelegates.js";
import type { SeedTxnScriptParams } from "./SeedTxnScriptParams.js";
import { StellarDelegate } from "./delegation/StellarDelegate.js";
import { BasicMintDelegate } from "./minting/BasicMintDelegate.js";
import { type NamedPolicyCreationOptions } from "./delegation/ContractBasedDelegate.js";
import { ContractBasedDelegate } from "./delegation/ContractBasedDelegate.js";
import { AuthorityPolicy } from "./authority/AuthorityPolicy.js";
import type { AnyDataTemplate } from "./delegation/DelegatedData.js";
import type { tokenPredicate, UtxoSearchScope } from "./UtxoHelper.js";
import CapoDataBridge from "./helios/scriptBundling/CapoHeliosBundle.bridge.js";
import type { mustFindActivityType } from "./helios/dataBridge/BridgeTypes.js";
import type { mustFindConcreteContractBridgeType } from "./helios/dataBridge/BridgeTypes.js";
import type { mustFindReadDatumType } from "./helios/dataBridge/BridgeTypes.js";
import type { mustFindDatumType } from "./helios/dataBridge/BridgeTypes.js";
import type { CapoDatum$Ergo$CharterData, ErgoRelativeDelegateLink, RelativeDelegateLinkLike } from "./helios/scriptBundling/CapoHeliosBundle.typeInfo.js";
import type { IF_ISANY } from "./helios/typeUtils.js";
import type { SomeDgtActivityHelper } from "./delegation/GenericDelegateBridge.js";
import type { DelegatedDataContract } from "./delegation/DelegatedDataContract.js";
import type { isActivity } from "./ActivityTypes.js";
import type { ErgoPendingCharterChange } from "./delegation/UnspecializedDelegate.typeInfo.js";
import type { CapoConfig, CapoFeatureFlags, CharterData, CharterDataLike, DelegateSetupWithoutMintDelegate, DelegatedDataPredicate, FindableViaCharterData, FoundDatumUtxo, FoundUut, ManifestEntryTokenRef, MinimalCharterDataArgs, MinimalDelegateLink, MinimalDelegateUpdateLink, NormalDelegateSetup, PreconfiguredDelegate, UutCreationAttrsWithSeed, basicDelegateMap, basicDelegateRoles, charterDataState, hasBootstrappedCapoConfig, hasCharterRef, hasGovAuthority, hasNamedDelegate, hasSettingsRef, hasSpendDelegate, hasUutContext, uutPurposeMap } from "./CapoTypes.js";
import type { PrecompiledProgramJSON } from "./helios/CachedHeliosProgram.js";
type InstallPolicyDgtOptions<CAPO extends Capo<any>, TypeName extends string & keyof CAPO["delegateRoles"]> = {
    typeName: TypeName;
    idPrefix: string;
    charterData: CapoDatum$Ergo$CharterData;
};
/**
 * Base class for leader contracts, with predefined roles for cooperating/delegated policies
 * @remarks
 *
 * A Capo contract provides a central contract address that can act as a treasury or data registry;
 * it can mint tokens using its connected minting-policy, and it can delegate policies to other contract
 * scripts.  Capo contract can use these capabilities in custom ways for strong flexibility.
 *
 * ### Defining Delegates
 * Any Capo contract can define delegateRoles() to establish custom collaborating scripts; these are used for
 * separating granular responsbilities for different functional purposes within your (on-chain and off-chain)
 * application; this approach enables delegates to use any one of multiple strategies with different
 * functional logic to serve in any given role, thus providing flexibility and extensibility.
 *
 * Capo provides roles for govAuthority and mintDelegate, and methods to facilitate
 * the lifecycle of charter creation & update.   Define a delegateRoles data structure using
 * the standalone helper function of that name, use its type in your `extends Capo<...>` clause,
 * and return that delegate map from the `delegateRoles()` method in your subclass.
 *
 * You may wish to use the `basicRoles()` helper function to easily access any of the default
 * mint/ spend/ authority delegate definitions, and the defineRole() method to make additional
 * roles for your application's data types.
 *
 * ### The Delegation Pattern and UUTs
 *
 * The delegation pattern uses UUTs, which are non-fungible / ***unique utility tokens***.  This is
 * equivalent to a "thread token" - a provable source of self-authority or legitimacy for contract
 * UTxOs.  Without the UUT, a contract UTxO is just a piece of untrusted data; with the UUT, it
 * can be blessed with proactive policy enforcement during creation.
 *
 * Architecturally, UUTs provide a simple and unique handle for the Capo to use as a  **required transaction element**
 * in key operational activities (like updating the charter details); so that the delegate holding the UUT is entrusted to
 * approved the UUT's inclusion in a transaction, with all the policy-enforcement implicated on the other end of the
 * delegation.
 *
 * UUTs can be used to form a positive linkage between the Capo (which should normally retain a reference
 * to that UUT) and any delegate; that delegate is most commonly another contract script also
 * referenced within the roles() definition.
 *
 *  * **Example: Multisig authority delegation** - a Capo contract would get much more complicated if it
 * contained multisig logic.  Instead, the governance authority for the Capo can be delegated to a
 * standalone multi-sig contract, which can contain all (and only) the multi-sig logic.  Separating the
 * responsibilities makes each part simpler, easing the process of ensuring each part is doing its job :pray:
 *
 * ### UUTs and Delegated Data
 *
 * UUTs can also be used as a form of uniqueness for data stored in the Capo's UTxOs (i.e. a record id).
 * The UTxO only lasts until it is spent, but the UUT's identity can continue along with any value and
 * connected data.
 *
 * Policy delegates provide on-chain delegation of authority for the Capo's data, while being upgradable
 * to support the evolving needs of the application.  Delegated datums store data of various types
 * at the Capo's address, while delegate policies, each at its own address are invoked to enforce creation
 * and update rules for each type of data.
 *
 * @public
 */
export declare abstract class Capo<SELF extends Capo<any>, featureFlags extends CapoFeatureFlags = {}> extends StellarContract<CapoConfig & {
    featureFlags?: Partial<featureFlags>;
}> {
    static currentRev: bigint;
    static currentConfig(): Promise<void>;
    /**
     * Enable auto-setup for delegates in the Capo contract.
     * @remarks
     *
     * This is a flag that can be set to true to enable auto-setup for delegates in the Capo contract.
     * It is currently false by default, meaning that the Capo contract will not automatically setup any delegates.
     *
     * We'll change that to true real soon now.
     */
    autoSetup: boolean;
    isChartered: boolean;
    dataBridgeClass: typeof CapoDataBridge;
    needsCoreDelegateUpdates: boolean;
    usesContractScript: boolean;
    get onchain(): mustFindConcreteContractBridgeType<this>;
    get offchain(): mustFindConcreteContractBridgeType<this>["reader"];
    /**
     * @internal
     */
    get reader(): mustFindConcreteContractBridgeType<this>["reader"];
    /**
     * Accessor for generating activity-data ("redeemer") values for use in transactions.
     * @remarks
     * This object contains named accessors for generating activity-data values for each
     * activity type defined in the contract's on-chain scripts.
     *
     * Most activity types on the Capo are used implicitly by the other methods on the Capo,
     * so you may seldom need to use this object directly.
     *
     * @example
     * ```typescript
     * const activity = capo.activity.usingAuthority;
     * ```
     */
    get activity(): mustFindActivityType<this>;
    get mkDatum(): mustFindDatumType<this>;
    /**
     * @internal
     */
    get defaultFeatureFlags(): featureFlags;
    /**
     * @internal
     */
    featureEnabled(f: keyof featureFlags): boolean;
    get canPartialConfig(): boolean;
    get newReadDatum(): mustFindReadDatumType<this>;
    getBundle(): Promise<CapoHeliosBundle>;
    scriptBundleClass(): Promise<typeof CapoHeliosBundle>;
    mkScriptBundle(setupDetails?: StellarBundleSetupDetails<any>): Promise<any>;
    /**
     * Reveals any bootstrapping details that may be present during initial creation
     * of the Capo contract, for use during and immediately after charter-creation.
     *
     * @public
     **/
    bootstrapping?: {
        [key in "govAuthority" | "mintDelegate" | "spendDelegate"]: ConfiguredDelegate<any>;
    };
    get scriptDatumName(): string;
    get scriptActivitiesName(): string;
    static get defaultParams(): {
        rev: bigint;
    };
    init(args: StellarSetupDetails<CapoConfig & {
        featureFlags?: Partial<featureFlags>;
    }>): Promise<this>;
    static bootstrapWith(args: StellarSetupDetails<CapoConfig>): any;
    /**
     * Creates any additional transactions needed during charter creation
     * @public
     * @remarks
     *
     * This method is a hook for subclasses to add extra transactions during the
     * charter creation process.  It is called during the creation of the charter transaction.
     *
     * The Capo has a {@link Capo.bootstrapping|`bootstrapping`} property that can be
     * referenced as needed during extra transaction creation.
     *
     * The provided transaction context has state.charterData in case it's needed.
     *
     * This method should use {@link StellarTxnContext.includeAddlTxn} to add transactions
     * to the context.
     *
     **/
    mkAdditionalTxnsForCharter<TCX extends hasAddlTxns<StellarTxnContext<any>>>(tcx: TCX, options: {
        charterData: CharterData;
        capoUtxos: TxInput[];
    }): Promise<hasAddlTxns<TCX>>;
    get minterClass(): stellarSubclass<CapoMinter>;
    minter: CapoMinter;
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
    /**
     * from all the uuts in the transaction context
     **/
    uutsValue(tcx: hasUutContext<any>): Value;
    /**
     * from a single uut name or byte array
     */
    uutsValue(uutName: UutName | number[]): Value;
    /**
     * mockable method to make testing easier
     * @internal
     */
    mkUutValuesEntries(uutNameOrMap: UutName[] | uutPurposeMap<any>): import("./HeliosPromotedTypes.js").valuesEntry[];
    activityUsingAuthority(): isActivity;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    get charterTokenPredicate(): tokenPredicate<any>;
    tokenAsValue(tokenName: string | number[] | UutName, count?: bigint): Value;
    canFindCharterUtxo(capoUtxos: TxInput[]): Promise<TxInput | undefined>;
    mustFindCharterUtxo(capoUtxos?: TxInput[]): Promise<TxInput>;
    /**
     * @deprecated - use tcxWithCharterRef() instead
     */
    txnAddCharterRef<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX & hasCharterRef>;
    /**
     * Ensures the transaction context has a reference to the charter token
     * @remarks
     *
     * Accepts a transaction context that may already have a charter reference.  Returns a typed
     * tcx with hasCharterRef type.
     *
     * The transaction is typed with the presence of the charter reference (found in tcx.state.charterRef).
     *
     * If the charter reference is already present in the transaction context, the transaction will not be modified.
     */
    tcxWithCharterRef<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX & hasCharterRef>;
    tcxWithSettingsRef<TCX extends StellarTxnContext>(this: SELF, tcx: TCX, { charterData, capoUtxos, }: {
        charterData: CharterData;
        capoUtxos: TxInput[];
    }): Promise<TCX & hasSettingsRef<any, any>>;
    /**
     * finds and spends the Capo's charter utxo, typically for updating
     * its CharterData datum.
     */
    txnMustUseCharterUtxo<TCX extends StellarTxnContext>(tcx: TCX, redeemer: isActivity, newCharterData?: CharterDataLike): Promise<TCX>;
    /**
     * @deprecated - use {@link Capo.tcxWithCharterRef |tcxWithCharterRef(tcx)} instead
     */
    txnMustUseCharterUtxo<TCX extends StellarTxnContext>(tcx: TCX, useReferenceInput: "refInput" | true): Promise<TCX>;
    txnUpdateCharterUtxo<TCX extends StellarTxnContext>(tcx: TCX, redeemer: isActivity, newDatum: CharterDataLike): Promise<StellarTxnContext | never>;
    txnKeepCharterToken<TCX extends StellarTxnContext>(tcx: TCX, datum: TxOutputDatum): TCX;
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
    txnMustUseSpendDelegate<TCX extends hasCharterRef>(tcx: TCX, spendDelegate: ContractBasedDelegate, activity: isActivity): Promise<TCX & hasSpendDelegate>;
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
    get mph(): MintingPolicyHash;
    get mintingPolicyHash(): MintingPolicyHash;
    findActorUut(uutPrefix: string, mph?: MintingPolicyHash): Promise<FoundUut | undefined>;
    /**
     * parses details in a delegate-link
     * @deprecated - use an adapter for CharterData instead?
     */
    offchainLink<T extends MinimalDelegateLink | OffchainPartialDelegateLink | RelativeDelegateLinkLike>(link: T): T;
    parseDgtConfig(inLink: // | MinimalDelegateLink
    ErgoRelativeDelegateLink | RelativeDelegateLinkLike): Partial<capoDelegateConfig>;
    serializeDgtConfig(config: Partial<capoDelegateConfig>): number[];
    /**
     * @deprecated - use the bridge type directly, and parseDgtConfig iff we ever need that.
     */
    parseDelegateLinksInCharter(charterData: CharterData): void;
    /**
     * finds charter data for a capo.
     * @remarks
     * Accepts a current utxo for that charter
     * @public
     */
    findCharterData(currentCharterUtxo?: TxInput, options?: {
        optional: false;
        capoUtxos?: TxInput[];
    }): Promise<CharterData>;
    /**
     * Finds charter data for a Capo, if available.  Otherwise, returns undefined.
     * @public
     */
    findCharterData(currentCharterUtxo: TxInput | undefined, options: {
        optional: true;
        capoUtxos?: TxInput[];
    }): Promise<CharterData | undefined>;
    findCharterData(currentCharterUtxo?: TxInput, options?: {
        optional: boolean;
        capoUtxos?: TxInput[];
    }): Promise<CharterData>;
    /**
     * Finds the currentSettings record for a Capo
     * @remarks
     * A Capo's currentSettings can be different in any deployment, but
     * any deployment can have one.  This function finds the currentSettings
     * as found in the Capo's `charterData.manifest`, and returns it with its
     * underlying `data` and possible application-layer `dataWrapped` object.
     *
     * Provide charterData and capoUtxos to resolve the currentSettings without
     * extra queries.
     *
     * Define your SettingsController as a subclass of WrappedDgDataContract
     * to provide a custom data-wrapper.
     *
     * If your protocol doesn't use settings, you probably aren't using
     * this method.  If you are writing some protocol-independent code, be sure
     * to use the `optional` attribute and be robust to cases of "no settings yet"
     * and "the specific current protocol doesn't use settings at all".
     *
     * Future: we will cache charterData and UTxOs so that this function will be
     * simpler in its interface and fast to execute without external management
     * of `{charterData, capoUtxos}`.
     * @public
     */
    findSettingsInfo(this: SELF, options?: {
        charterData?: CharterData;
        capoUtxos?: TxInput[];
        optional?: boolean;
    }): Promise<FoundDatumUtxo<any, any> | undefined>;
    /**
     * @public
     */
    addStrellaWithConfig<SC extends StellarContract<any>>(TargetClass: stellarSubclass<SC>, config: ConfigFor<SC>, previousOnchainScript?: {
        validatorHash: number[];
        uplcProgram: anyUplcProgram;
    }): Promise<SC>;
    connectMintingScript(params: SeedTxnScriptParams): Promise<CapoMinter>;
    /**
     * Finds a sufficient-sized utxo for seeding one or more named tokens
     * @remarks
     *
     * For allocating a charter token (/its minter), one or more UUTs, or other token name(s)
     * to be minted, this function calculates the size of minUtxo needed for all the needed tokens,
     * assuming they'll each be stored in separate utxos.  It then finds and returns a UTxO from the
     * current actor's wallet.  The utxo is NOT implicitly added to the transaction (use tcx.addInput() to add it).
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
    /**
     * Creates a new delegate link, given a delegation role and and strategy-selection details
     * @param tcx - A transaction-context having state.uuts[roleName] matching the roleName
     * @param role - the role of the delegate, matched with the `delegateRoles()` of `this`
     * @param delegateInfo - partial detail of the delegation with any
     *     details required by the particular role.  Its delegate type may be a subclass of the type
     *     indicated by the `roleName`.
     * @remarks
     *
     * Combines partal and implied configuration settings, validating the resulting configuration.
     *
     * It expects the transaction-context to have a UUT whose name (or a UUT roleName) matching
     * the indicated `roleName`.  Use {@link Capo.txnWillMintUuts|txnWillMintUuts()} or {@link Capo.txnMintingUuts|txnMintingUuts()} to construct
     * a transaction having that and a compliant txn-type.
     *
     * The resulting delegate-linking details can be used with this.mkRelativeDelegateLink() to
     * encode it as an on-chain RelativeLinkLink in the Capo's charter.
     *
     * The delegate-link is by default a contract-based delegate.  If that's not what you want,
     * you can the type-parameters to override it to a more general StellarDelegate type (NOTE: if you
     * find you're needing to specify a more specific contract-based delegate type, please let us know, as
     * our expectation is that the general type for a contract-based delegate should already provide all the
     * necessary type information for all kinds of contract-based delegate subclasses).
     *
     * To get a full DelegateSettings object, use txnCreateDelegateSettings() instead.
     *
     * @public
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
     **/
    txnCreateOffchainDelegateLink<RN extends string & keyof SELF["_delegateRoles"], DT extends StellarDelegate = ContractBasedDelegate>(tcx: hasUutContext<RN>, role: RN, delegateInfo: OffchainPartialDelegateLink): Promise<ConfiguredDelegate<DT> & Required<OffchainPartialDelegateLink>>;
    /**
     * extracts the key details for creating an on-chain delegate link, given a setup-phase
     * configuration for that delegate.
     */
    mkOnchainRelativeDelegateLink<CT extends ConfiguredDelegate<any>>(configured: CT): RelativeDelegateLinkLike;
    /**
     * extracts the key details of a delegate link, given a delegate configuration.
     * @remarks
     * This is valid only during the setup phase of creating a delegate, and does not encode the config entry.
     *
     * use mkRelativeDelegateLink() to encode the config entry, and use this.parseDgtConfig() to decode it.
     */
    extractDelegateLinkDetails<CT extends ConfiguredDelegate<DT> | OffchainPartialDelegateLink, DT extends StellarDelegate | never = CT extends ConfiguredDelegate<infer D> ? D : never>(configured: CT): CT extends ConfiguredDelegate<any> ? CT & OffchainPartialDelegateLink : OffchainPartialDelegateLink;
    /**
     * Generates and returns a complete set of delegate settings, given a delegation role and strategy-selection details.
     * @remarks
     *
     * Maps the indicated delegation role to specific UUT details from the provided transaction-context
     * to provide the resulting settings.  The transaction context isn't modified.
     *
     * Behaves exactly like (and provides the core implementation of) {@link Capo.txnCreateOffchainDelegateLink | txnCreateDelegateLink()},
     * returning additional `roleName` and `delegateClass`, to conform with the DelegateSettings type.
     *
     * ### Overriding the Delegate Type
     * The configuration is typed for a contract-based delegate by default.  If you need a more general
     * StellarDelegate type (for AuthorityPolicy, for example), you can override the type-parameters (if you are finding
     * that you need to specify a more specific contract-based delegate type, please let us know, as our expectation is that
     * the general type for a contract-based delegate should already provide all the necessary type information for all kinds of
     * contract-based delegate subclasses).
     *
     * See txnCreateDelegateLink for further details.
     * @public
     **/
    txnCreateConfiguredDelegate<RN extends string & keyof SELF["_delegateRoles"], DT extends StellarDelegate = ContractBasedDelegate>(tcx: hasUutContext<RN>, role: RN, delegateInfo: OffchainPartialDelegateLink): Promise<ConfiguredDelegate<DT>>;
    /**
     * loads the pre-compiled minter script from the pre-compiled bundle
     */
    /** note, here in this file we show only a stub.  The heliosRollupBundler
     * actually writes a real implementation that does a JIT import of the
     * precompiled bundle
     */
    loadPrecompiledMinterScript(): Promise<PrecompiledProgramJSON>;
    mkImpliedDelegationDetails(uut: UutName): DelegationDetail;
    _delegateCache: {
        [roleName: string]: {
            [delegateLink: string]: {
                delegate: StellarDelegate;
            };
        };
    };
    connectDelegateWithOnchainRDLink<RN extends string & keyof SELF["_delegateRoles"], DT extends StellarDelegate = ContractBasedDelegate>(role: RN, delegateLink: RelativeDelegateLinkLike): Promise<DT>;
    showDelegateLink(delegateLink: RelativeDelegateLinkLike): string;
    /**
     * Given a role name and configuration details,
     * finds and creates the class for the delegate in that role.
     * @remarks
     * Uses the deployedDetails from the Capo's bundle
     * for the compiled on-chain script, if available.
     *
     * If the indicated script role is not deployed as a singleton,
     * the deployedName is required, and matched against those
     * instances of the script seen in the bundle's deployedDetails.
     *
     * If the script role has no deployedDetails, the configuredDelegate
     * details are used to compile the script for on-chain use, after
     * which the resulting details should be used to update the bundle's
     * deployedDetails.  Normally this should be done during the build
     * of a new version of the package, resulting in a bundle having
     * "deployedDetails" for a script that is actually created on-chain
     * after the package is installed.
     */
    mustGetDelegate<T extends StellarDelegate>(scriptRole: string, configuredDelegate: PreconfiguredDelegate<T>, deployedName?: string): Promise<T>;
    tvForDelegate(dgtLink: ErgoRelativeDelegateLink): Value;
    mkDelegatePredicate(dgtLink: ErgoRelativeDelegateLink): tokenPredicate<any>;
    activityUpdatingCharter(): isActivity;
    activitySpendingDelegatedDatum(): {
        redeemer: UplcData;
    };
    /**
     * USE THE `delegateRoles` GETTER INSTEAD
     * @remarks
     *
     * - this no-op method is a convenience for Stellar Contracts maintainers
     *   and intuitive developers using autocomplete.
     * - Including it enables an entry
     *   in VSCode "Outline" view, which doesn't include the delegateRoles getter : /
     * @deprecated but please keep as a kind of redirect
     * @public
     **/
    getDelegateRoles(): void;
    get delegateRoles(): basicDelegateMap<any>;
    _delegateRoles: basicDelegateMap<any> & IF_ISANY<ReturnType<SELF["initDelegateRoles"]>, basicDelegateRoles>;
    abstract initDelegateRoles(): basicDelegateMap<any>;
    addressAuthorityConfig(): DelegateConfigDetails<AuthorityPolicy>;
    basicDelegateRoles(): basicDelegateMap;
    verifyIsChartered(): Promise<CapoDatum$Ergo$CharterData | undefined>;
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
    verifyCoreDelegates(): Promise<[BasicMintDelegate, AuthorityPolicy, ContractBasedDelegate] | undefined>;
    mkDatumScriptReference(): import("@helios-lang/ledger").InlineTxOutputDatum;
    findGovDelegate(charterData?: CharterData): Promise<ContractBasedDelegate>;
    txnAddGovAuthority<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX & hasGovAuthority>;
    getMintDelegate(charterData?: CharterData): Promise<BasicMintDelegate>;
    getSpendDelegate(charterData?: CharterData): Promise<BasicMintDelegate>;
    getSettingsController(this: SELF, options: FindableViaCharterData): Promise<DelegatedDataContract<any, any> | undefined>;
    /**
     * Finds the delegated-data controller for a given typeName.
     * @remarks
     * REQUIRES that the Capo manifest contains an installed DgDataPolicy
     * and that the off-chain Capo delegateMap provides an off-chain controller
     * for that typeName.
     */
    getDgDataController<RN extends string & keyof SELF["_delegateRoles"]>(this: SELF, recordTypeName: RN, options?: FindableViaCharterData): Promise<undefined | DelegatedDataContract<any, any>>;
    /**
     * @deprecated - use getOtherNamedDelegate() or getDgDataController() instead
     */
    getNamedDelegate(): void;
    /**
     * Finds a contract's named delegate, given the expected delegateName.
     * @remarks
     * @public
     **/
    getOtherNamedDelegate(delegateName: string, charterData?: CharterData): Promise<ContractBasedDelegate>;
    getNamedDelegates(charterData?: CharterData): Promise<{
        [k: string]: ContractBasedDelegate;
    }>;
    getGovDelegate(charterData?: CharterData): Promise<void>;
    /**
     * helper for test environment, allowing an abortive initial charter-creation, without
     * most of the costs, but enabling named-delegate scripts to be compiled/validated
     * much earlier in the test lifecycle.  The real charter process can then continue without
     * duplicating any of the dry-run setup costs.
     */
    didDryRun: {
        minter: CapoMinter;
        seedUtxo: TxInput;
        configIn: CapoConfig;
        args: MinimalCharterDataArgs;
    };
    /**
     * Initiates a seeding transaction, creating a new Capo contract of this type
     * @remarks
     *
     * The returned transaction context has `state.bootstrappedConfig` for
     * capturing the details for reproducing the contract's settings and on-chain
     * address, and state.charterData
     *
     * @param charterDataArgs - initial details for the charter datum
     * @param existinTcx - any existing transaction context
     * @typeParam TCX - inferred type of a provided transaction context
     * @public
     **/
    mkTxnMintCharterToken<TCX extends undefined | StellarTxnContext<anyState>, TCX2 extends StellarTxnContext<anyState> = hasBootstrappedCapoConfig & (TCX extends StellarTxnContext<infer TCXT> ? StellarTxnContext<TCXT> : unknown), TCX3 = TCX2 & hasAddlTxns<TCX2> & StellarTxnContext<charterDataState> & hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt" | "setting">>(this: SELF, charterDataArgs: MinimalCharterDataArgs, existingTcx?: TCX, dryRun?: "DRY_RUN"): Promise<TCX3 & Awaited<hasUutContext<"spendDelegate" | "govAuthority" | "mintDelegate" | "capoGov" | "mintDgt" | "spendDgt"> & TCX2 & hasBootstrappedCapoConfig & hasSeedUtxo & StellarTxnContext<charterDataState>>>;
    mkTxnUpgradeIfNeeded(this: SELF, charterData?: CharterData): Promise<hasAddlTxns<hasAddlTxns<StellarTxnContext<anyState>, anyState> & {
        isFacade: true;
    }>>;
    findCapoUtxos(option?: Required<Pick<UtxoSearchScope, "dumpDetail">>): Promise<TxInput[]>;
    tcxWithCharterData<TCX extends StellarTxnContext>(this: SELF, tcx: TCX): Promise<TCX & StellarTxnContext<charterDataState>>;
    /**
     * Adds an additional txn to the transaction context, committing any pending manifest changes
     * @remarks
     *
     * If the capo manifest has any pending changes, this tx makes them active.
     * Use this after each queued manifest update
     * @public
     */
    commitPendingChangesIfNeeded(this: SELF, tcx: StellarTxnContext): Promise<hasAddlTxns<StellarTxnContext<anyState>, anyState>>;
    addTxnBootstrappingSettings<TCX extends StellarTxnContext>(this: SELF, tcx: TCX, charterData: CharterData): Promise<hasAddlTxns<TCX>>;
    /**
     * Creates an additional reference-script-creation txn
     * @remarks
     *
     * Creates a txn for reference-script creation, and
     * adds it to the current transaction context to also be submitted.
     *
     * The reference script is stored in the Capo contract with a special
     * Datum, and it can be used in future transactions to save space and fees.
     *
     * @param tcx - the transaction context
     * @param scriptName - the name of the script, used in the addlTxn's  name
     * @param script - the script to be stored onchain for future reference
     * @public
     **/
    txnMkAddlRefScriptTxn<TCX extends StellarTxnContext<anyState>, RETURNS extends hasAddlTxns<TCX> = TCX extends hasAddlTxns<any> ? TCX : hasAddlTxns<TCX>>(tcx: TCX, scriptName: string, script: anyUplcProgram): Promise<RETURNS>;
    mkRefScriptTxn(script: anyUplcProgram): Promise<StellarTxnContext>;
    /**
     * Attach the given script by reference to a transaction
     * @remarks
     *
     * If the given script is found in the Capo's known list of reference scripts,
     * it is used to attach the refScript to the transaction context.  Otherwise,
     * the script's bytes are added directly to the transaction.
     *
     * The indicated script is expected to be found in one of the Capo's
     * refScript utxos.  Otherwise, a missing-refScript warning is emitted,
     * and the program is added directly to the transaction.
     * If this makes the transaction too big, the console
     * warning will be followed by a thrown error during the transaction's
     * wallet-submission sequence.
     * @param program2 - the UPLC program to attach to the script
     * @public
     **/
    txnAttachScriptOrRefScript<TCX extends StellarTxnContext>(tcx: TCX, program?: anyUplcProgram | undefined, useRefScript?: boolean): Promise<TCX>;
    findRefScriptUtxo(expectedVh: number[], capoUtxos: TxInput[]): Promise<TxInput | undefined>;
    /** finds UTXOs in the capo that are of tnhe ReferenceScript variety of its datum
     * @remarks
     *
     * @public
     */
    findScriptReferences(capoUtxos: TxInput[]): Promise<TxInput[]>;
    mkTxnUpdateCharter<TCX extends StellarTxnContext>(args: CharterDataLike, activity?: isActivity, tcx?: TCX): Promise<StellarTxnContext>;
    txnAddNamedDelegateAuthority<TCX extends StellarTxnContext>(tcx: TCX, delegateName: string, delegate: ContractBasedDelegate, activity: isActivity): Promise<TCX>;
    /**
     * Returns a single item from a list, throwing an error if it has multiple items
     *
     */
    singleItem<T>(xs: Array<T>): T;
    /**
     * Queries a chain-index to find utxos having a specific type of delegated datum
     * @remarks
     * Optionally filters records by `id`, `type` and/or `predicate`
     *
     * The `predicate` function, if provided, can implement any logic suitable for a specific case of data-finding.
     */
    findDelegatedDataUtxos<const T extends undefined | (string & keyof SELF["_delegateRoles"]), RAW_DATUM_TYPE extends T extends string ? AnyDataTemplate<T, any> : never, PARSED_DATUM_TYPE>(this: SELF, { type, id, predicate, query, charterData, capoUtxos, }: {
        type?: T;
        id?: string | number[] | UutName;
        predicate?: DelegatedDataPredicate<RAW_DATUM_TYPE>;
        query?: never;
        charterData?: CharterData;
        capoUtxos?: TxInput[];
    }): Promise<FoundDatumUtxo<RAW_DATUM_TYPE, PARSED_DATUM_TYPE>[]>;
    /**
     * Installs a new Minting delegate to the Capo contract
     * @remarks
     *
     * Updates the policy by which minting under the contract's minting policy is allowed.
     *
     * This supports the evolution of logic for token-minting.
     * Note that updating the minting policy can't modify or interfere with constraints
     * enforced by any existing mintInvariants.
     *
     * Normally, the existing minting delegate is signalled to be Retiring its delegation token,
     * burning it as part of the update transaction and cleaning things up.  The minUtxo from
     * the old delegation UUT will be recycled for use in the new delegate.
     *
     * @param delegateInfo - the new minting delegate's info
     * @param options - allows a forced update, which leaves a dangling delegation token
     *   in the old minting delegate, but allows the new minting delegate to take over without
     *   involving the old delegate in the transaction.
     * @param tcx - any existing transaction context
     * @public
     **/
    mkTxnUpdatingMintDelegate<THIS extends Capo<any>, TCX extends hasSeedUtxo = hasSeedUtxo>(this: THIS, delegateInfo: MinimalDelegateUpdateLink, tcx?: TCX): Promise<TCX & hasUutContext<"mintDelegate" | "mintDgt"> & hasSeedUtxo>;
    mkValuesBurningDelegateUut(current: ErgoRelativeDelegateLink): import("./HeliosPromotedTypes.js").valuesEntry[];
    mkTxnUpdatingSpendDelegate<THIS extends Capo<any>, TCX extends hasSeedUtxo = hasSeedUtxo>(this: THIS, delegateInfo: MinimalDelegateUpdateLink, tcx?: TCX): Promise<TCX>;
    mkTxnAddingMintInvariant<THIS extends Capo<any>, TCX extends hasSeedUtxo = hasSeedUtxo>(this: THIS, delegateInfo: OffchainPartialDelegateLink, tcx?: TCX): Promise<StellarTxnContext>;
    mkTxnAddingSpendInvariant<THIS extends Capo<any>, const SN extends string & keyof THIS["delegateRoles"]["spendDelegate"]["variants"], TCX extends hasSeedUtxo = hasSeedUtxo>(this: THIS, delegateInfo: OffchainPartialDelegateLink, tcx?: TCX): Promise<hasUutContext<"spendDelegate" | "spendDgt"> & TCX & hasSeedUtxo>;
    /**
     * Adds or replaces a named delegate in the Capo contract
     * @remarks
     *
     * Registers a new delegate, keyed by its name.  The delegate may
     * replace another
     *
     * Other contract scripts can reference named delegates through the
     * contract's charter, requiring their presence in a transaction - thus
     * delegating some portion of validation responsibility to the other script
     *
     * @param delegateName - the key that will be used in the on-chain data structures and in dependent contracts.
     *  @param options - configuration for the delegate
     * @public
     **/
    mkTxnAddingNamedDelegate<DT extends StellarDelegate, thisType extends Capo<any>, const delegateName extends string, TCX extends hasSeedUtxo = hasSeedUtxo>(this: thisType, delegateName: delegateName, options: OffchainPartialDelegateLink & NamedPolicyCreationOptions<thisType, DT>, tcx?: TCX): Promise<hasAddlTxns<TCX & hasSeedUtxo & hasNamedDelegate<DT, delegateName>>>;
    /**
     * Helper for installing a named policy delegate
     * @remarks
     *
     * Creates a transaction for adding a delegate-data-policy to the Capo.
     *
     * The designated role name refers to the a key in the Capo's delegateRoles list -
     * typically the full `typename` of a delegated-data-policy.
     *
     * The idPrefix refers to the short prefix used for UUT id's for this data-type.
     *
     * An addlTxn for ref-script creation is included.
     *
     * An addlTxn for committing pending changes is NOT included, leaving pendingChange queued in the Capo's charter.
     * Use mkTxnInstallPolicyDelegate to also ***commit*** pending changes.
     */
    mkTxnInstallingPolicyDelegate<const TypeName extends string & keyof SELF["delegateRoles"], THIS extends Capo<any>>(this: THIS, options: InstallPolicyDgtOptions<THIS, TypeName>): Promise<hasAddlTxns<StellarTxnContext<anyState> & hasSeedUtxo & hasNamedDelegate<StellarDelegate, TypeName, "dgData">> & hasUutContext<TypeName | "dgDataPolicy">>;
    /**
     * Helper for installing a named policy delegate
     * @remarks
     *
     * Creates a transaction for adding a delegate-data-policy to the Capo, using the same logic as mkTxnInstallingPolicyDelegate.
     *
     * In addition, it also commits the pending changes to the Capo's charter.
     *
     * Use mkTxnInstallingPolicyDelegate to queue a pending change without committing it (useful
     * for tests, or when multiple policies can be queued and installed at once).
     *
     * Note that deploying multiple policies at once is currently disabled, to help prevent resource-exhaustion attacks.
     *
     * @public
     */
    mkTxnInstallPolicyDelegate<const TypeName extends string & keyof SELF["delegateRoles"], THIS extends Capo<any>>(this: THIS, options: InstallPolicyDgtOptions<THIS, TypeName>): Promise<hasAddlTxns<StellarTxnContext<anyState>, anyState>>;
    /**
     * Adds a new entry to the Capo's manifest
     * @remarks
     * Use mkTxnQueueingDelegateChange for changing DgDataPolicy entries.
     *
     * The type exclusions here mean this CURRENTLY works only with the
     * NamedTokenRef variety of manifest entry, but that's just pragmatic
     * because the other types don't yet have an implementation.
     * Other types can be eligible for adding to this API or to a different call.
     */
    mkTxnAddManifestEntry<THIS extends Capo<any>, TCX extends StellarTxnContext<anyState> = StellarTxnContext<anyState>>(this: THIS, key: string, utxo: FoundDatumUtxo<any, any>, entry: ManifestEntryTokenRef, tcx?: TCX): Promise<StellarTxnContext<anyState>>;
    mkTxnQueuingDelegateChange<DT extends StellarDelegate, THIS extends Capo<any>, const TypeName extends string & keyof SELF["delegateRoles"], OPTIONS extends OffchainPartialDelegateLink, TCX extends StellarTxnContext<anyState> = StellarTxnContext<anyState>>(this: THIS, change: "Add" | "Replace", options: {
        typeName: TypeName;
        charterData: CharterData;
        idPrefix: string;
        dgtOptions?: OPTIONS;
    }, tcx?: TCX): Promise<hasAddlTxns<TCX & hasNamedDelegate<DT, TypeName, "dgData">> & hasUutContext<TypeName | "dgDataPolicy">>;
    /**
     * Looks up a policy in the manifest, returning the policy name and the manifest entry if found.
     * @remarks
     * Returns a pair of [ policyName, manifestEntry ] if found.  Returns undefined if the policy is not found.
     * @public
     */
    hasPolicyInManifest<const RoLabel extends string & keyof SELF["delegateRoles"]>(policyName: RoLabel, charterData: CapoDatum$Ergo$CharterData): [string, import("../index.js").ErgoCapoManifestEntry] | undefined;
    /**
     * mockable helper for finding a pending change in the charter, to make it easier to test
     */
    findPendingChange(charterData: CapoDatum$Ergo$CharterData, changingThisRole: (pc: ErgoPendingCharterChange) => boolean): Partial<{
        delegateChange: import("./helios/scriptBundling/CapoHeliosBundle.typeInfo.js").ErgoPendingDelegateChange;
        otherManifestChange: import("./helios/scriptBundling/CapoHeliosBundle.typeInfo.js").PendingCharterChange$Ergo$otherManifestChange;
    }> | undefined;
    tempMkDelegateLinkForQueuingDgtChange(seedUtxo: TxInput, mintDgtActivity: SomeDgtActivityHelper, purpose: string, typeName: string, idPrefix: string, options: OffchainPartialDelegateLink): Promise<{
        delegateClass: stellarSubclass<ContractBasedDelegate>;
        delegate: ContractBasedDelegate;
        roleName: string;
        fullCapoDgtConfig: Partial<CapoConfig> & capoDelegateConfig;
    } & OffchainPartialDelegateLink & Required<OffchainPartialDelegateLink>>;
    mkTxnCommittingPendingChanges<TCX extends StellarTxnContext>(tcx?: TCX): Promise<StellarTxnContext<anyState>>;
    /**
     * Adds UUT minting to a transaction
     * @remarks
     *
     * Constructs UUTs with the indicated purposes, and adds them to the contract state.
     * This is a useful generic capability to support any application-specific purpose.
     *
     * The provided transaction context must have a seedUtxo - use {@link StellarContract.tcxWithSeedUtxo | tcxWithSeedUtxo()} to add one
     * from the current user's wallet. The seed utxo is consumed, so it can never be used again; its
     * value will be returned to the user wallet.  All the uuts named in the uutPurposes argument will
     * be minted from the same seedUtxo, and will share the same suffix, because it is derived from the
     * seedUtxo's outputId.
     *
     * Many cases of UUT minting are covered by the delegation pattern, where this method
     * is used implicitly.
     *
     * @param initialTcx - an existing transaction context
     * @param uutPurposes - a set of purpose-names (prefixes) for the UUTs to be minted
     * @param options - additional options for the minting operation.  In particular, you likely want
     * to provide a custom activity instead of the default uutMinting activity.
     * @param roles - a map of role-names to purpose-names
     * @public
     **/
    txnMintingUuts<const purposes extends string, existingTcx extends hasSeedUtxo, const RM extends Record<ROLES, purposes>, const ROLES extends keyof RM & string = string & keyof RM>(initialTcx: existingTcx, uutPurposes: purposes[], options: NormalDelegateSetup | DelegateSetupWithoutMintDelegate, roles?: RM): Promise<hasUutContext<ROLES | purposes> & existingTcx>;
    /**
     * @deprecated use tcxWithSeedUtxo() instead
     * @remarks adds a seed utxo to a transaction-context,
     */
    addSeedUtxo<TCX extends StellarTxnContext>(tcx?: TCX, seedUtxo?: TxInput): Promise<TCX & hasSeedUtxo>;
    /**
     * Adds UUT types to the transaction context
     * @remarks
     *
     * adds tcx.state.uut entries for each purpose.
     *
     * also adds a second uut entry for each role-name found in the roles map, corresponding to the uut entry for its purpose.
     *
     * NOTE: this method doesn't add a minting instruction to the transaction, so that
     * all the minting/burning needed for the txn can (because it must) be done in one minting instruction.
     *
     * If the uuts being minted are the only minting/burning needed in the transaction, then
     * you can use {@link Capo.txnMintingUuts | txnMintingUuts()} instead of this method.
     *
     * @param tcx - the transaction context
     * @param uutPurposes - a list of short names for the UUTs (will be augmented with unique suffixes)
     * @param usingSeedUtxo - the seed utxo to be used for minting the UUTs (consumed in the transaction, and controls the suffixes)
     * @param roles - a map of role-names to purpose-names
     * @public
     **/
    txnWillMintUuts<const purposes extends string, existingTcx extends StellarTxnContext, const RM extends Record<ROLES, purposes>, const ROLES extends string & keyof RM = string & keyof RM>(tcx: existingTcx, uutPurposes: purposes[], { usingSeedUtxo }: UutCreationAttrsWithSeed, roles?: RM): Promise<hasUutContext<ROLES | purposes> & existingTcx>;
    requirements(): import("./Requirements.js").ReqtsMap<"is a base class for leader/Capo pattern" | "can create unique utility tokens" | "supports the Delegation pattern using roles and strategy-variants" | "supports well-typed role declarations and strategy-adding" | "supports just-in-time strategy-selection using txnCreateDelegateLink()" | "given a configured delegate-link, it can create a ready-to-use Stellar subclass with all the right settings" | "supports concrete resolution of existing role delegates" | "Each role uses a RoleVariants structure which can accept new variants" | "provides a Strategy type for binding a contract to a strategy-variant name" | "can locate UUTs in the user's wallet" | "positively governs all administrative actions" | "has a unique, permanent charter token" | "has a unique, permanent treasury address" | "the charter token is always kept in the contract" | "the charter details can be updated by authority of the capoGov-* token" | "can mint other tokens, on the authority of the charter's registered mintDgt- token" | "can handle large transactions with reference scripts" | "has a singleton minting policy" | "can update the minting delegate in the charter data" | "can update the spending delegate in the charter data" | "can add invariant minting delegates to the charter data" | "can add invariant spending delegates to the charter data" | "supports an abstract Settings structure stored in the contact" | "added and updated delegates always validate the present configuration data" | "can commit new delegates" | "supports storing new types of datum not pre-defined in the Capo's on-chain script" | "the charter has a namedDelegates structure for semantic delegate links" | "CreatingDelegatedDatum: creates a UTxO with any custom datum" | "UpdatingDelegatedDatum: checks that a custom data element can be updated", {
        inheriting: "‹empty/base class›";
    }>;
}
export {};
//# sourceMappingURL=Capo.d.ts.map