import {
    Address,
    Assets,
    Datum,
    MintingPolicyHash,
    TxId,
    TxOutput,
    TxInput,
    Value,
    AssetClass,
} from "@hyperionbt/helios";
import { DefaultMinter } from "./DefaultMinter.js";
import {
    Activity,
    StellarConstructorArgs,
    StellarContract,
    isActivity,
    configBase,
    partialTxn,
    stellarSubclass,
    ConfigFor,
    txn,
} from "./StellarContract.js";
import { InlineDatum, valuesEntry } from "./HeliosPromotedTypes.js";
import { StellarTxnContext } from "./StellarTxnContext.js";
import {
    ConfiguredDelegate,
    SelectedDelegates,
    DelegateConfigNeeded,
    ErrorMap,
    RoleMap,
    SelectedDelegate,
    VariantStrategy,
    PartialParamConfig,
    UutName,
    RelativeDelegateLink,
    capoDelegateConfig,
} from "./delegation/RolesAndDelegates.js";
import { CapoDelegateHelpers } from "./delegation/CapoDelegateHelpers.js";
import { SeedTxnParams } from "./SeedTxn.js";
import { CapoMintHelpers } from "./CapoMintHelpers.js";
import { StellarHeliosHelpers } from "./StellarHeliosHelpers.js";
import { HeliosModuleSrc } from "./HeliosModuleSrc.js";
import { errorMapAsString } from "./diagnostics.js";
import { hasReqts } from "./Requirements.js";
import {
    mkUutValuesEntries,
    mkValuesEntry,
    stringToNumberArray,
} from "./utils.js";
import { MinimalDelegateLink } from "./DefaultCapo.js";

export { variantMap } from "./delegation/RolesAndDelegates.js";
export type {
    RoleMap,
    strategyValidation,
} from "./delegation/RolesAndDelegates.js";

/**
 * strongly-typed map of purpose-names to Uut objects
 *
 * @public
 */
export type uutPurposeMap<unionPurpose extends string> = {
    [purpose in unionPurpose]: UutName;
};

// export type hasSomeUuts<uutEntries extends string> = {
//     uuts: Partial<uutPurposeMap<uutEntries>>;
// };

/**
 * used for transaction-context state having specific uut-purposes
 *
 * @public
 */
export type hasAllUuts<uutEntries extends string> = {
    uuts: uutPurposeMap<uutEntries>;
};

/**
 * the uut-factory interface
 *
 * @public
 */
interface hasUutCreator {
    txnWithUuts<
        const purposes extends string,
        existingTcx extends StellarTxnContext<any>,
        const RM extends Record<ROLES, purposes>,
        const ROLES extends keyof RM & string = string & keyof RM
    >(
        initialTcx: existingTcx,
        uutPurposes: purposes[],
        seedUtxo: TxInput,
        roles?: RM 
    ): Promise<existingTcx & hasUutContext<ROLES | purposes>>;
    mkTxnCreatingUuts<
        const purposes extends string,
        existingTcx extends StellarTxnContext<any>,
        const RM extends Record<ROLES, purposes>,
        const ROLES extends keyof RM & string = string & keyof RM
    >(
        initialTcx: existingTcx,
        uutPurposes: purposes[],
        seedUtxo?: TxInput,
        roles?: RM
    ): Promise<existingTcx & hasUutContext<ROLES | purposes>>;
}

/**
 * UUT minting should always use these settings to guard for uniqueness
 *
 * @public
 */
export type MintUutRedeemerArgs = {
    seedTxn: TxId;
    seedIndex: bigint | number;
    purposes: string[];
};
/**
 * A txn context having specifically-purposed UUTs in its state
 *
 * @public
 */
export type hasUutContext<uutEntries extends string> = StellarTxnContext<
    hasAllUuts<uutEntries>
>;

/**
 * charter-minting interface
 *
 * @public
 */
export interface MinterBaseMethods extends hasUutCreator {
    get mintingPolicyHash(): MintingPolicyHash;
    txnMintingCharter(
        tcx: StellarTxnContext<any>,
        charterMintArgs: {
            owner: Address;
            authZor: UutName;
        },
        tVal: valuesEntry
    ): Promise<StellarTxnContext<any>>;
}

export type anyDatumArgs = Record<string, any>;

//!!! todo: let this be parameterized for more specificity
export type CapoBaseConfig = SeedTxnParams & {
    mph: MintingPolicyHash;
    rev: bigint;
};

//!!! todo: let this be parameterized for more specificity
export type CapoImpliedSettings = {
    uutID: AssetClass;
};

export type hasBootstrappedConfig<CT extends CapoBaseConfig> =
    StellarTxnContext<{
        bootstrappedConfig: CT;
    }>;

type PreconfiguredDelegate<T extends StellarContract<capoDelegateConfig & any>> = Omit<ConfiguredDelegate<T>, "delegate">;

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
export abstract class Capo<
        minterType extends MinterBaseMethods & DefaultMinter = DefaultMinter,
        charterDatumType extends anyDatumArgs = anyDatumArgs,
        configType extends CapoBaseConfig = CapoBaseConfig
    >
    extends StellarContract<configType>
    implements hasUutCreator
{
    abstract get roles(): RoleMap<any>;
    abstract mkFullConfig(baseConfig: CapoBaseConfig): configType;

    constructor(args: StellarConstructorArgs<CapoBaseConfig>) {
        //@ts-expect-error spurious "could be instantiated with a different subtype"
        super(args);

        const { Datum, Redeemer } = this.scriptProgram!.types;

        const { CharterToken } = Datum;
        const { updatingCharter, usingAuthority } = Redeemer;

        if (!CharterToken)
            throw new Error("Datum must have a 'CharterToken' variant");
        if (!updatingCharter)
            throw new Error("Redeemer must have a 'updatingCharter' variant");
        if (!usingAuthority)
            throw new Error("Redeemer must have a 'usingAuthority' variant");
    }
    abstract contractSource(): string;
    abstract mkDatumCharterToken(args: charterDatumType): InlineDatum;
    // abstract txnMustUseCharterUtxo(
    //     tcx: StellarTxnContext,
    //     newDatum?: InlineDatum
    // ): Promise<TxInput | never>;

    get minterClass(): stellarSubclass<DefaultMinter, SeedTxnParams> {
        return DefaultMinter;
    }

    minter?: minterType;
    @partialTxn
    txnWithUuts<
        const purposes extends string,
        existingTcx extends StellarTxnContext<any>,
        const RM extends Record<ROLES, purposes>,
        const ROLES extends keyof RM & string = string & keyof RM
    >(
        initialTcx: existingTcx,
        uutPurposes: purposes[],
        seedUtxo: TxInput,
        //@ts-expect-error
        roles: RM = {} as Record<string, purposes>
    ): Promise<existingTcx & hasUutContext<ROLES | purposes>> {
        return this.minter!.txnWithUuts(
            initialTcx,
            uutPurposes,
            seedUtxo,
            roles
        );
    }

    @txn
    mkTxnCreatingUuts<
        const purposes extends string,
        existingTcx extends StellarTxnContext<any>,
        const RM extends Record<ROLES, purposes>,
        const ROLES extends keyof RM & string = string & keyof RM
    >(
        initialTcx: existingTcx,
        uutPurposes: purposes[],
        seedUtxo?: TxInput,
        //@ts-expect-error
        roles: RM = {} as Record<string, purposes>
    ): Promise<existingTcx & hasUutContext<ROLES | purposes>> {
        return this.minter!.mkTxnCreatingUuts(
            initialTcx,
            uutPurposes,
            seedUtxo,
            roles
        );
    }
    // P extends paramsBase = SC extends StellarContract<infer P> ? P : never

    uutsValue(uutMap: uutPurposeMap<any>): Value;
    uutsValue(tcx: hasUutContext<any>): Value;
    uutsValue(x: uutPurposeMap<any> | hasUutContext<any>): Value {
        const uutMap = x instanceof StellarTxnContext ? x.state.uuts! : x;
        const vEntries = mkUutValuesEntries(uutMap);

        return new Value(
            undefined,
            new Assets([[this.mintingPolicyHash!, vEntries]])
        );
    }

    @Activity.redeemer
    protected usingAuthority(): isActivity {
        const r = this.scriptProgram!.types.Redeemer;
        const { usingAuthority } = r;
        if (!usingAuthority) {
            throw new Error(
                `invalid contract without a usingAuthority redeemer`
            );
        }
        const t = new usingAuthority();

        return { redeemer: t._toUplcData() };
    }

    protected abstract updatingCharter(args: charterDatumType): isActivity;

    tvCharter() {
        return this.minter!.tvCharter();
    }

    get charterTokenAsValue() {
        console.warn(
            "deprecated get charterTokenAsValue; use tvCharter() instead"
        );
        return this.tvCharter();
    }

    importModules(): HeliosModuleSrc[] {
        return [StellarHeliosHelpers, CapoDelegateHelpers, CapoMintHelpers];
    }

    abstract mkTxnMintCharterToken<TCX extends StellarTxnContext>(
        charterDatumArgs: Partial<charterDatumType>,
        existingTcx?: TCX
    ): Promise<
        never | (TCX & hasBootstrappedConfig<CapoBaseConfig & configType>)
    >;

    get charterTokenPredicate() {
        const predicate = this.mkTokenPredicate(this.tvCharter());

        return predicate;
    }

    //! forms a Value with minUtxo included
    tokenAsValue(tokenName: string, quantity: bigint = 1n) {
        const { mintingPolicyHash } = this;

        const e = mkValuesEntry(tokenName, quantity);

        const v = new Value(
            this.ADA(0),
            new Assets([[mintingPolicyHash, [e]]])
        );
        const t = new TxOutput(this.address, v);
        const minLovelace = t.calcMinLovelace(this.networkParams);

        v.setLovelace(minLovelace);
        return v;
    }

    async mustFindCharterUtxo() {
        const predicate = this.mkTokenPredicate(this.tvCharter());

        return this.mustFindMyUtxo("charter", predicate, "has it been minted?");
    }

    abstract txnAddCharterAuthz(
        tcx: StellarTxnContext,
        datum: InlineDatum
    ): Promise<StellarTxnContext<any> | never>;

    async txnMustUseCharterUtxo(
        tcx: StellarTxnContext<any>,
        redeemer: isActivity,
        newDatum?: InlineDatum
    ): Promise<StellarTxnContext<any> | never>;
    async txnMustUseCharterUtxo(
        tcx: StellarTxnContext<any>,
        useReferenceInput: true,
        forceAddRefScript?: true
    ): Promise<StellarTxnContext<any> | never>;
    @partialTxn // non-activity partial
    async txnMustUseCharterUtxo(
        tcx: StellarTxnContext<any>,
        redeemerOrRefInput: isActivity | true,
        newDatumOrForceRefScript?: InlineDatum | true
    ): Promise<StellarTxnContext<any> | never> {
        return this.mustFindCharterUtxo().then(async (ctUtxo: TxInput) => {
            await this.txnAddCharterAuthz(
                tcx,
                ctUtxo.origOutput.datum as InlineDatum
            );

            if (true === redeemerOrRefInput) {
                if (
                    newDatumOrForceRefScript &&
                    true !== newDatumOrForceRefScript
                )
                    throw new Error(
                        `when using reference input for charter, arg3 can only be true (or may be omitted)`
                    );
                tcx.tx.addRefInput(
                    ctUtxo,
                    newDatumOrForceRefScript ? this.compiledScript : undefined
                );
            } else {
                const redeemer = redeemerOrRefInput;
                const newDatum = newDatumOrForceRefScript;
                if (true === newDatum)
                    throw new Error(
                        `wrong type for newDatum when not using reference input for charter`
                    );
                tcx.addInput(ctUtxo, redeemer.redeemer).attachScript(
                    this.compiledScript
                );
                const datum =
                    newDatum || (ctUtxo.origOutput.datum as InlineDatum);

                this.txnKeepCharterToken(tcx, datum);
            }
            return tcx;
        });
    }

    @partialTxn // non-activity partial
    async txnUpdateCharterUtxo(
        tcx: StellarTxnContext,
        redeemer: isActivity,
        newDatum: InlineDatum
    ): Promise<StellarTxnContext | never> {
        // this helper function is very simple.  Why have it?
        //   -> its 3rd arg is required,
        //   -> and its name gives a more specific meaning.
        return this.txnMustUseCharterUtxo(tcx, redeemer, newDatum);
    }

    @partialTxn // non-activity partial
    txnKeepCharterToken(tcx: StellarTxnContext<any>, datum: InlineDatum) {
        const txo = new TxOutput(this.address, this.tvCharter(), datum);
        txo.correctLovelace(this.networkParams);
        tcx.addOutput(txo);

        return tcx;
    }

    @partialTxn
    async txnAddAuthority(tcx: StellarTxnContext<any>) {
        return this.txnMustUseCharterUtxo(tcx, this.usingAuthority());
    }

    /**
     * provides minter-targeted params extracted from the input configuration
     * @remarks
     *
     * extracts the seed-txn details that are key to parameterizing the minter contract
     * @public
     **/
    getMinterParams() {
        const { seedTxn, seedIndex } = this.configIn!;
        return { seedTxn, seedIndex };
    }
    getCapoRev() {
        return 1n;
    }

    /**
     * extracts from the input configuration the key details needed to construct/reconstruct the on-chain contract address
     * @remarks
     *
     * extracts the details that are key to parameterizing the Capo / leader's on-chain contract script
     * @public
     **/
    getContractScriptParams(
        config: configType
    ): configBase & Partial<configType> {
        if (this.configIn && config.mph && config.mph !== this.mph)
            throw new Error(`mph mismatch`);
        const { mph } = config;
        const rev = this.getCapoRev();
        // console.log("this treasury uses mph", mph?.hex);

        //@ts-expect-error because TS only sees the abstract configType, not its constraint's props
        return {
            mph,
            rev,
        };
    }

    get mph() {
        const minter =
            this.minter || this.connectMintingScript(this.getMinterParams());
        return minter.mintingPolicyHash!;
    }

    get mintingPolicyHash() {
        return this.mph;
    }

    connectMintingScript(params: SeedTxnParams): minterType {
        if (this.minter)
            throw new Error(`just use this.minter when it's already present`);
        const { minterClass } = this;
        const { seedTxn, seedIndex } = params;

        const minter = this.addScriptWithParams(minterClass, {
            seedTxn,
            seedIndex,
        });
        const { mintingCharter, mintingUuts } =
            minter.scriptProgram!.types.Redeemer;
        if (!mintingCharter)
            throw new Error(
                `minting script doesn't offer required 'mintingCharter' activity-redeemer`
            );
        if (!mintingUuts)
            throw new Error(
                `minting script doesn't offer required 'mintingUuts' activity-redeemer`
            );

        //@ts-ignore-error - can't seem to indicate to typescript that minter's type can be relied on to be enough
        return (this.minter = minter);
    }

    async txnMustGetSeedUtxo(
        tcx: StellarTxnContext,
        purpose: string,
        tokenNames: string[]
    ): Promise<TxInput | never> {
        //! given a Capo-based contract instance having a free TxInput to seed its validator address,
        //! prior to initial on-chain creation of contract,
        //! it finds that specific TxInput in the current user's wallet.

        const minter = this.configIn
            ? this.minter
            : (this.mockMinter =
                  this.mockMinter ||
                  (new this.minterClass({
                      //@ts-expect-error - this empty config is good enough for a mock-minter
                      //    ... we only need enough for calculating minUtxo
                      config: {},
                      setup: this.setup,
                  }) as minterType));
        const mph = minter!.mintingPolicyHash;

        const minUtxo = tokenNames.reduce(
            addTokenValue.bind(this),
            new Value(0n)
        );
        const uutSeed = this.mkValuePredicate(minUtxo.lovelace, tcx);
        const seedUtxo = await this.mustFindActorUtxo(
            purpose,
            uutSeed,
            tcx
        ).catch((x) => {
            throw x;
        });

        const { txId: seedTxn, utxoIdx } = seedUtxo.outputId;
        const seedIndex = BigInt(utxoIdx);
        const count =
            tokenNames.length > 1 ? `${tokenNames.length} uuts for ` : "";
        console.log(
            `Seed tx for ${count}${purpose}: ${seedTxn.hex.slice(
                0,
                8
            )}…${seedTxn.hex.slice(-4)}#${seedIndex}`
        );
        return seedUtxo;

        //! accumulates min-utxos for each stringy token-name in a reduce()
        function addTokenValue(
            this: Capo<any>,
            accumulator: Value,
            tn: string
        ): Value {
            const ve = mkValuesEntry(tn, 1n);
            const v = new Value(undefined, [[mph, [ve]]]);
            const o = new TxOutput(this.address, minter!.tvCharter());
            o.correctLovelace(this.networkParams);
            return accumulator.add(o.value);
        }
    }
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
     *   ... adding the roles()[roleName] configuration for the selected roleName,
     *   ... along with any explicit `config` from the provided `delegateInfo`
     *   ... and automatically applies a `uut` setting.
     *   ... The later properties in this sequence take precedence.
     * @reqt If the resolved delegate class provides a truthy `delegateReqdAddress()`,
     *   ... the resolved settings will reflect in a `reqdAddr` property.  Otherwise,
     *   ... any provided `delegateAddressesHint()` will be included as `addressesHint`.
     *
     * @param tcx - A transaction-context
     * @param roleName - the role of the delegate, matched with the `roles()` of `this`
     * @param delegateInfo - partial detail of the delegation, with `strategyName` and any other
     *     details required by the particular role
     * @typeParam ‹pName› - descr (for generic types)
     * @public
     **/
    txnCreateDelegateLink<
        DT extends StellarContract<capoDelegateConfig>,
        const RN extends string
    >(
        tcx: hasUutContext<RN>,
        roleName: RN,
        delegateInfo: MinimalDelegateLink<DT> = { strategyName: "default" }
    ) {
        const configured = this.txnCreateConfiguredDelegate(tcx, roleName, delegateInfo);
 
        return this.relativeLink(configured)
    }

    relativeLink<
        DT extends StellarContract<capoDelegateConfig>
    >(configured : ConfiguredDelegate<DT>) : RelativeDelegateLink<DT> {
        const {
            strategyName,
            uutName,
            config,
            addressesHint,
            reqdAddress,
        }: RelativeDelegateLink<DT> = configured;

        return {
            strategyName,
            uutName,
            config,
            addressesHint,
            reqdAddress,
        };
    }

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
    txnCreateConfiguredDelegate<
        DT extends StellarContract<any & capoDelegateConfig>,
        const RN extends string
    >(
        tcx: hasUutContext<RN>,
        roleName: RN,
        delegateInfo: MinimalDelegateLink<DT> = { strategyName: "default" }
    ): ConfiguredDelegate<DT> {
        const { strategyName, config: selectedConfig = {} } = delegateInfo;

        const { roles } = this;
        const uut = tcx.state.uuts[roleName];
        const uutSetting = this.mkImpliedUutDetails(uut);

        const foundStrategies = roles[roleName];
        const selectedStrategy = foundStrategies[
            strategyName
        ] as VariantStrategy<DT>;
        if (!selectedStrategy) {
            let msg = `invalid strategyName '${strategyName}' for role '${roleName}'`;
            if( strategyName == "default") {
                msg =`no selected or default delegate for role '${roleName}'.  Specify strategyName`
            }
            const e = new DelegateConfigNeeded(
                msg,
                {
                    availableStrategies: Object.keys(foundStrategies),
                }
            );
            throw e;
        }
        const { delegateClass, validateConfig } = selectedStrategy;
        const { defaultParams: defaultParamsFromDelegateClass } = delegateClass;
        const scriptParamsFromStrategyVariant =
            selectedStrategy.partialConfig || {};
        const mergedConfig: ConfigFor<DT> = {
            ...defaultParamsFromDelegateClass,
            ...(scriptParamsFromStrategyVariant || {}),
            ...selectedConfig,
            ...uutSetting,
        } as unknown as ConfigFor<DT>;

        debugger;
        //! it validates the net configuration so it can return a working config.
        const errors: ErrorMap | undefined = validateConfig && validateConfig(mergedConfig);
        if (errors) {
            throw new DelegateConfigNeeded(
                `validation errors in contract params for ${roleName} '${strategyName}':\n` +
                    errorMapAsString(errors),
                { errors }
            );
        }

        
        const delegateSettings: PreconfiguredDelegate<DT> = {
            ...delegateInfo,
            roleName,
            delegateClass,
            uutName: uut.name,
            config: mergedConfig,
        };
        let delegate: DT = this.mustGetDelegate(delegateSettings);

        const reqdAddress = delegate.delegateReqdAddress();
        if (reqdAddress) {
            delegateSettings.reqdAddress = reqdAddress;
        } else {
            const addressesHint = delegate.delegateAddressesHint();
            if (addressesHint) {
                delegateSettings.addressesHint = addressesHint;
            }
        }
        return {
            ... delegateSettings,
            delegate
        }
    }

    mkImpliedUutDetails(uut: UutName): CapoImpliedSettings {
        return {
            uutID: new AssetClass({
                mph: this.mph,
                tokenName: stringToNumberArray(uut.name),
            }),
        };
    }

    mustGetDelegate<T extends StellarContract<capoDelegateConfig & any>> (
        configuredDelegate: PreconfiguredDelegate<T>
    ): T {
        const { delegateClass, config } = configuredDelegate;
        try {
            // delegate
            const configured = this.addScriptWithParams(delegateClass, config);
            return configured as T;
        } catch (e: any) {
            const t = e.message.match(/invalid parameter name '([^']+)'$/);

            const [_, badParamName] = t || [];
            if (badParamName) {
                throw new DelegateConfigNeeded(
                    "configuration error while parameterizing contract script",
                    { errors: { [badParamName]: e.message } }
                );
            }
            throw e;
        }
    }

    async connectDelegateWith<
        DelegateType extends StellarContract<
            configBase & capoDelegateConfig >,
        configType extends (DelegateType extends 
            StellarContract<infer c> ? c : configBase) = (DelegateType extends 
                StellarContract<infer c> ? c : configBase)
    >(
        roleName: string,
        delegateLink: RelativeDelegateLink<DelegateType>
    ): Promise<DelegateType> {
        const role = this.roles[roleName];
        //!!! work on type-safety with roleName + available roles
        const {
            strategyName,
            uutName,
            reqdAddress,
            addressesHint,
            config: linkedConfig,
        } = delegateLink;
        const selectedStrat = role[
            strategyName
         ] as unknown as ConfiguredDelegate<DelegateType>;
        if (!selectedStrat) {
            throw new Error(
                `mismatched strategyName '${strategyName}' in delegate link for role '${roleName}'`
            );
        }
        const { delegateClass, config: stratSettings } = selectedStrat;
        const { defaultParams: defaultParamsFromDelegateClass } = delegateClass;
        const implied = this.mkImpliedUutDetails(new UutName(roleName, uutName))
        const {
            uutID
        } = implied

        //@ts-expect-error because this stack of generically partial
        //  ... config elements isn't recognized as adding up to a full config type.
        const config : configType = {
            ...defaultParamsFromDelegateClass,
            ...stratSettings,            
            reqdAddress,
            addressesHint,
            ...linkedConfig,
            uutID
        }

        const { setup } = this;
        return new delegateClass({ setup, config });
    }

    capoRequirements() {
        return hasReqts({
            "is a base class for leader/Capo pattern": {
                purpose:
                    "so that smart contract developers can easily start multi-script development",
                details: [
                    "Instantiating a Capo contract always uses the seed-utxo pattern for uniqueness.",
                    "Subclassing Capo with no type-params gives the default minter,",
                    "  ... which only allows UUTs to be created",
                    "Subclassing Capo<CustomMinter> gives an overloaded minter,",
                    "  ... which must allow UUT minting and may allow more Activities too.",
                ],
                mech: [
                    "provides a default minter",
                    "allows the minter class to be overridden",
                ],
            },
            "can create unique utility tokens": {
                purpose:
                    "so the contract can use UUTs for scoped-authority semantics",
                details: [
                    "That UUT (a Value) is returned, and then should be added to a TxOutput.",
                    "The partial-helper doesn't constrain the semantics of the UUT.",
                    "The uniqueness level can be iterated in future as needed.",
                    "The UUT's token-name combines its textual purpose with a short hash ",
                    "   ... of the seed UTxO, formatted with bech32",
                ],
                mech: [
                    "Building a txn with a UUT involves using the txnCreatingUuts partial-helper on the Capo.",
                    "Fills tcx.state.uuts with purpose-keyed unique token-names",
                    "The UUT uses the seed-utxo pattern to form 64 bits of uniqueness, so that token-names stay short-ish.",
                ],
            },
            "supports the Delegation pattern using roles and strategy-variants":
                {
                    purpose: "enables structured modularity and extensibility",
                    details: [
                        "A Capo constellation can declare a set of roles to be filled in the contract logic.",
                        "The roles are typed, so that implementers of extensibility can know ",
                        "  ... which capabilities their plugins need to provide",
                        "Each role should be filled by a StellarContract class, ",
                        "  ... which is required at the time it is needed during creation of a transaction.",
                        "Each role should normally provide a base implementation ",
                        "  ... of a delegate that can serve the role.",
                        "Strategies, strategy-variants, or simple 'variants' are all similar ways ",
                        "  ... of indicating different named plugins that can serve a particular role.",
                        "Variant-names are human-readable, while the actual code",
                        "  ... behind each variant name are the strategies",
                    ],
                    mech: [],
                    requires: [
                        "supports well-typed role declarations and strategy-adding",
                        "supports just-in-time strategy-selection using txnCreateDelegateLink()",
                        "given a configured delegate-link, it can create a ready-to-use Stellar subclass with all the right settings",
                        "supports concrete resolution of existing role delegates",
                    ],
                },
            "supports well-typed role declarations and strategy-adding": {
                purpose:
                    "for plugin implementers to have a clear picture of what to implement",
                details: [
                    "Each Capo class may declare a roles data structure.",
                    "GOAL: The required type for each role must be matched when adding a plugin class serving a role",
                    "A dApp using a Capo class can add strategy variants by subclassing",
                ],
                mech: [
                    "Capo EXPECTS a synchronous getter for 'roles' to be defined",
                    "Capo provides a default 'roles' having no specific roles (or maybe just minter - TBD)",
                    "Subclasses can define their own get roles(), return a role-map-to-variant-map structure",
                ],
                requires: [
                    "Each role uses a RoleVariants structure which can accept new variants",
                ],
            },
            "supports just-in-time strategy-selection using txnCreateDelegateLink()":
                {
                    purpose:
                        "enabling each transaction to select appropriate plugins for its contextual needs",
                    details: [
                        "When a transaction having an extensibility-point is being created,",
                        "  ... it SHOULD require an explicit choice of the delegate to use in that role.",
                        "When a 'mkTxn‹DoesThings›' method creates a new role-delegated UTxO, ",
                        "  ... it sets essential configuration details for the delegation ",
                        "  ... including a specific UUT that provides a linking mechanism for the delegate",
                        "The delegate contract, including its address and/or reference-script UTxO ",
                        "  ... and/or its parameters and its StellarContract class, MUST be captured ",
                        "  ... so that it can be easily resolved and used/referenced",
                        "  .... during a later transaction whose UTxO-spending is governed by the delegate contract.",
                        "When the delegate serving the role is selected, ",
                        "  ... that delegate will be manifested as a concrete pair of StellarContract subclass ",
                        "  ... and contract address.  The contract address MAY be pre-existing ",
                        "  ... or be instantiated as a result of the delegation details.",
                    ],
                    mech: [
                        "txnCreateDelegateLink(tcx, role, delegationSettings) method configures a new delegate",
                        "txnCreateDelegateLink() will use a 'default' delegate strategy",
                        "If there is no delegate configured (or defaulted) for the needed role, txnCreateDelegateLink throws a DelegateConfigNeeded error.",
                        "If the strategy-configuration doesn't match available variants, the DelegateConfigNeeded error offers suggested strategy-names",
                        "If the strategy-configuration has any configuration problems, the DelegateConfigNeeded error contains an 'errors' object",
                        "txnCreateDelegateSettings(tcx, role, delegationSettings) returns the delegate link plus a concreted delegate instance",
                    ],
                },
            "given a configured delegate-link, it can create a ready-to-use Stellar subclass with all the right settings":
                {
                    purpose:
                        "allows the known facts about a delegate to be resolved to working SC class",
                    details: [
                        "A delegate link created by txnCreateDelegateLink(), can be captured in different ways",
                        "  ... e.g. as a Datum property in a contract, ",
                        "  ... or in any off-chain way.",
                        "A dApp then reconstitutes this key information to a StellarContract, ",
                        "  ... enabling simple multi-contract collaboration",
                    ],
                    mech: [
                        "mustGetDelegate(configuredDelegate) method retrieves a configured delegate",
                    ],
                },

            "Each role uses a RoleVariants structure which can accept new variants":
                {
                    purpose:
                        "provides a type-safe container for adding strategy-variants to a role",
                    details: [
                        "Adding a strategy variant requires a human-readable name for the variant",
                        "  ... and a reference to the StellarContract class implementing that variant.",
                        "Each variant may indicate a type for its configuration data-structure",
                        "  ... and may include a factory function accepting a data-structure of that type.",
                        "TBD: base configuration type?  Capo txn-builders supporting utxo-creation can provide baseline details of the base type, ",
                        "  ... with additional strategy-specific details provided in the transaction-context.",
                        "When adding strategies, existing variants cannot be removed or replaced.",
                    ],
                    mech: [
                        "RoleVariants has type-parameters indicating the baseline types & interfaces for delegates in that role",
                        "TODO: variants can augment the definedRoles object without removing or replacing any existing variant",
                    ],
                    requires: [
                        "provides a Strategy type for binding a contract to a strategy-variant name",
                    ],
                },
            "provides a Strategy type for binding a contract to a strategy-variant name":
                {
                    purpose:
                        "has all the strategy-specific bindings between a variant and the contract delegate",
                    details: [
                        "When adding a contract as a delegate serving in a role, its name",
                        "  ... and its Strategy binding creates the connection between the host contract (suite) ",
                        "  ... and the StellarContract subclass implementing the details of the strategy.",
                        "The Strategy and its underlying contract are type-matched",
                        "  ... with the interface needed by the Role.",
                        "The Strategy is a well-typed structure supporting ",
                        "  ... any strategy-specific configuration details (script parameters)",
                        "  ... and validation of script parameters",
                    ],
                    mech: [
                        "Each strategy must reference a type-matched implementation class",
                        "Each strategy may define scriptParams always used for that strategy",
                        "Each strategy may defer the definition of other script-params to be defined when a specific delegation relationship is being created",
                        "Each strategy must define a validateScriptParams(allScriptParams) function, returning an errors object if there are problems",
                        "validateScriptParams() should return undefined if there are no problems",
                    ],
                    requires: [
                        "supports concrete resolution of existing role delegates",
                    ],
                },
            "supports concrete resolution of existing role delegates": {
                purpose:
                    "so that transactions involving delegated responsibilities can be executed",
                details: [
                    "When a transaction needs to involve a UTxO governed by a delegate contract",
                    "   ... the need for that delegate contract is signalled through Capo callbacks ",
                    "   ... during the transaction-building process.",
                    "Those callbacks contain key information, such as role-name, parameters, and address",
                    "  ... needed in the collaboration to find the correct concrete delegate.",
                    "Once the delegate is resolved to a configured StellarContract class, ",
                    "   ... its established transaction-building interface is triggered, ",
                    "   ... augmenting the transaction with the correct details, ",
                    "   ... and enabling the right on-chain behaviors / verifications",
                    "The Strategy adapter is expected to return the proper delegate with its matching address.",
                ],
                mech: [
                    "TODO: with an existing delegate, the selected strategy class MUST exactly match the known delegate-address",
                ],
            },
        });
    }
}
