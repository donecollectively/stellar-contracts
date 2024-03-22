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
    ValidatorHash,
    UplcProgram,
    bytesToText,
} from "@hyperionbt/helios";
import { DefaultMinter } from "./minting/DefaultMinter.js";
import type { BasicMinterParams } from "./minting/DefaultMinter.js";
import {
    Activity,
    StellarContract,
    partialTxn,
    txn,
} from "./StellarContract.js";
import type {
    StellarFactoryArgs,
    isActivity,
    configBase,
    stellarSubclass,
    ConfigFor,
    devConfigProps,
    SetupDetails,
} from "./StellarContract.js";
import type { InlineDatum, valuesEntry } from "./HeliosPromotedTypes.js";
import {
    StellarTxnContext,
    type hasAddlTxn,
    type hasSeedUtxo,
    type uutMap,
} from "./StellarTxnContext.js";
import {
    DelegateConfigNeeded,
    delegateLinkSerializer,
} from "./delegation/RolesAndDelegates.js";
import { UutName } from "./delegation/UutName.js";
import type {
    ConfiguredDelegate,
    ErrorMap,
    RoleMap,
    VariantStrategy,
    RelativeDelegateLink,
    RoleInfo,
} from "./delegation/RolesAndDelegates.js";

import { CapoDelegateHelpers } from "./delegation/CapoDelegateHelpers.js";
import type { SeedTxnParams } from "./SeedTxn.js";
import { CapoMintHelpers } from "./CapoMintHelpers.js";
//@ts-expect-error
import StellarHeliosHelpers from "./StellarHeliosHelpers.hl";
import type { HeliosModuleSrc } from "./HeliosModuleSrc.js";
import { errorMapAsString } from "./diagnostics.js";
import { hasReqts } from "./Requirements.js";
import {
    mkUutValuesEntries,
    mkValuesEntry,
    stringToNumberArray,
} from "./utils.js";
import type {
    DefaultCharterDatumArgs,
    MinimalDelegateLink,
} from "./DefaultCapo.js";
import type { DelegationDetail } from "./delegation/RolesAndDelegates.js";
import { StellarDelegate } from "./delegation/StellarDelegate.js";
import type { AuthorityPolicy, anyState } from "../index.js";

export type {
    RoleMap,
    strategyValidation,
} from "./delegation/RolesAndDelegates.js";

export type FoundUut = { utxo: TxInput; uut: UutName };


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

export type UutCreationAttrs = {
    usingSeedUtxo?: TxInput | undefined;
    additionalMintValues?: valuesEntry[];
    mintDelegateActivity?: isActivity;
};
export type UutCreationAttrsWithSeed = UutCreationAttrs &
    Required<Pick<UutCreationAttrs, "usingSeedUtxo">>;

/**
 * the uut-factory interface
 *
 * @public
 */
export interface hasUutCreator {
    txnWillMintUuts<
        const purposes extends string,
        existingTcx extends StellarTxnContext,
        const RM extends Record<ROLES, purposes>,
        const ROLES extends keyof RM & string = string & keyof RM
    >(
        initialTcx: existingTcx,
        uutPurposes: purposes[],
        uutArgs: UutCreationAttrsWithSeed,
        roles?: RM
    ): Promise<hasUutContext<ROLES | purposes> & existingTcx>;

    txnMintingUuts<
        const purposes extends string,
        existingTcx extends StellarTxnContext & hasSeedUtxo,
        const RM extends Record<ROLES, purposes>,
        const ROLES extends keyof RM & string = string & keyof RM
    >(
        initialTcx: existingTcx,
        uutPurposes: purposes[],
        uutArgs?: UutCreationAttrs,
        roles?: RM
    ): Promise<hasUutContext<ROLES | purposes> & existingTcx>;

    // txnBurnUuts<
    //     existingTcx extends StellarTxnContext<any>,
    // >(
    //     initialTcx: existingTcx,
    //     uutNames: UutName[],
    // ): Promise<existingTcx>;
}

/**
 * UUT minting should always use these settings to guard for uniqueness
 *
 * @public
 */
export type MintUutActivityArgs = {
    seedTxn: TxId;
    seedIndex: bigint | number;
    purposes: string[];
};
/**
 * A txn context having specifically-purposed UUTs in its state
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
export interface MinterBaseMethods {
    get mintingPolicyHash(): MintingPolicyHash;
    txnMintingCharter<TCX extends StellarTxnContext>(
        tcx: TCX,
        charterMintArgs: {
            owner: Address;
            capoGov: UutName;
        },
        tVal: valuesEntry
    ): Promise<TCX>;
    txnMintWithDelegateAuthorizing<TCX extends StellarTxnContext>(
        tcx: TCX,
        vEntries: valuesEntry[],
        delegate: StellarDelegate<any>,
        redeemer: isActivity
    ): Promise<TCX>;
}

export type anyDatumArgs = Record<string, any>;

export type rootCapoConfig = devConfigProps & {
    rootCapoScriptHash?: ValidatorHash;
};

//!!! todo: let this be parameterized for more specificity
export type CapoBaseConfig = configBase &
    rootCapoConfig &
    SeedTxnParams & {
        mph: MintingPolicyHash;
        rev: bigint;
        bootstrapping?: true;
    };

/**
 * StellarTransactionContext exposing a bootstrapped Capo configuration
 * @remarks
 *
 * During first-time setup of a Capo contract, its manifest configuration details
 * should be captured for reproducibility, and this type allows the bootstrap
 * transaction to expose that configuration.
 *
 * DefaultCapo's {@link DefaultCapo.mkTxnMintCharterToken | mkTxnMintCharterToken()} returns a transaction context
 * of this type, with `state.bootstrappedConfig`;
 * @public
 **/
export type hasBootstrappedConfig<CT extends CapoBaseConfig> =
    StellarTxnContext<{
        bsc: CT;
        uuts: uutMap;
        bootstrappedConfig: any;
    }>;

type PreconfiguredDelegate<T extends StellarDelegate<any>> = Omit<
    ConfiguredDelegate<T>,
    "delegate" | "delegateValidatorHash"
>;

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
export abstract class Capo<
    minterType extends MinterBaseMethods & DefaultMinter = DefaultMinter,
    charterDatumType extends anyDatumArgs = anyDatumArgs,
    configType extends CapoBaseConfig = CapoBaseConfig
> extends StellarContract<configType> {
    static currentRev: bigint = 1n;
    devGen: bigint = 0n;
    abstract get delegateRoles(): RoleMap<any>;
    abstract verifyCoreDelegates(): Promise<any>;
    verifyConfigs(): Promise<any> {
        return this.verifyCoreDelegates();
    }
    get isConfigured(): Promise<boolean> {
        if (!this.configIn) return Promise.resolve(false);
        // if (this._verifyingConfigs) return this._verifyingConfigs;
        return Promise.resolve(true);
    }
    static parseConfig(rawJsonConfig: any) {
        throw new Error(
            `Stellar contract subclasses should define their own static parseConfig where needed to enable connection from a specific dApp to a specific Stellar Contract.`
        );
    }

    static get defaultParams() {
        const params = {
            rev: this.currentRev,
            devGen: 0n,
        };
        return params;
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
    ): configBase & devConfigProps & Partial<configType> {
        if (
            this.configIn &&
            config.mph &&
            this.minter &&
            !config.mph.eq(this.mph)
        )
            throw new Error(`mph mismatch`);
        const { mph } = config;
        const rev = (this.constructor as typeof Capo).currentRev;
        // console.log("this treasury uses mph", mph?.hex);

        const params = {
            mph,
            rev,
            isDev: false,
            devGen: 0n,
        } as configType;

        if ("production" !== process.env.NODE_ENV) {
            if (0n === this.devGen && "test" !== process.env.NODE_ENV) {
                throw new Error(
                    `${this.constructor.name}: missing required instance property devGen : bigint > 0n`
                );
            }
            params.isDev = true;
            params.devGen = this.devGen;
        }

        return params;
    }

    async init(args: StellarFactoryArgs<configType>) {
        await super.init(args);

        const {
            scriptDatumName: onChainDatumName,
            scriptActivitiesName: onChainActivitiesName,
        } = this;

        const { CharterToken } = this.onChainDatumType;
        const updatingCharter = this.mustGetActivity("updatingCharter");
        const usingAuthority = this.mustGetActivity("usingAuthority");

        if (!CharterToken)
            throw new Error(
                `datum type ${onChainDatumName} must have a 'CharterToken' variant`
            );
        if (!updatingCharter)
            throw new Error(
                `activities type ${onChainActivitiesName} must have a 'updatingCharter' variant`
            );
        if (!usingAuthority)
            throw new Error(
                `activities type${onChainActivitiesName} must have a 'usingAuthority' variant`
            );

        if (this.configIn && !this.configIn.bootstrapping) {
            const { seedIndex, seedTxn } = this.configIn;
            await this.connectMintingScript({ seedIndex, seedTxn });

            await this.verifyConfigs();
            // this._verifyingConfigs = this.verifyConfigs().then((r) => {
            //     this._verifyingConfigs = undefined;
            //     return r;
            // });
        } else {
            // this.connectMintingScript(this.getMinterParams());
        }

        return this;
    }

    static bootstrapWith(args: StellarFactoryArgs<CapoBaseConfig>) {
        const { setup, config } = args;
        const Class = this;
        //@ts-expect-error this is just Javascript.  Sorry, typescript!
        return new Class({ setup, config: { ...config, bootstrapping: true } });
    }
    abstract contractSource(): HeliosModuleSrc;
    abstract mkDatumCharterToken(args: charterDatumType): InlineDatum | Promise<InlineDatum>;
    // abstract txnMustUseCharterUtxo(
    //     tcx: StellarTxnContext,
    //     newDatum?: InlineDatum
    // ): Promise<TxInput | never>;

    get minterClass(): stellarSubclass<DefaultMinter, BasicMinterParams> {
        return DefaultMinter;
    }

    minter!: minterType;
    // @partialTxn
    // txnWillMintUuts<
    //     const purposes extends string,
    //     existingTcx extends StellarTxnContext,
    //     const RM extends Record<ROLES, purposes>,
    //     const ROLES extends keyof RM & string = string & keyof RM
    // >(
    //     initialTcx: existingTcx,
    //     uutPurposes: purposes[],
    //     seedUtxo: TxInput,
    //     //@ts-expect-error
    //     roles: RM = {} as Record<string, purposes>
    // ): Promise<hasUutContext<ROLES | purposes> & existingTcx> {
    //     const minter = this.connectMinter()
    //     return this.txnWillMintUuts(
    //         initialTcx,
    //         uutPurposes,
    //         seedUtxo,
    //         roles
    //     );
    // }

    // P extends paramsBase = SC extends StellarContract<infer P> ? P : never

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
    uutsValue(x: UutName | uutPurposeMap<any> | hasUutContext<any>): Value {
        const uutMap =
            x instanceof StellarTxnContext
                ? x.state.uuts!
                : x instanceof UutName
                ? { single: x }
                : x;
        const vEntries = mkUutValuesEntries(uutMap);

        return new Value(
            undefined,
            new Assets([[this.mintingPolicyHash!, vEntries]])
        );
    }

    @Activity.redeemer
    activityUsingAuthority(): isActivity {
        const usingAuthority = this.mustGetActivity("usingAuthority");
        if (!usingAuthority) {
            throw new Error(
                `invalid contract without a usingAuthority redeemer`
            );
        }
        const t = new usingAuthority();

        return { redeemer: t._toUplcData() };
    }

    protected abstract activityUpdatingCharter(
        args: charterDatumType
    ): isActivity;

    tvCharter() {
        return this.minter.tvCharter();
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


    get charterTokenPredicate() {
        const predicate = this.mkTokenPredicate(this.tvCharter());

        return predicate;
    }

    //! forms a Value with minUtxo included
    tokenAsValue(tokenName: string | UutName, count: bigint = 1n) {
        const { mph } = this;

        const tn = tokenName.toString();
        return this.mkMinTv(mph, tn, count);
    }

    async mustFindCharterUtxo() {
        const predicate = this.mkTokenPredicate(this.tvCharter());

        return this.mustFindMyUtxo("charter", predicate, "has it been minted?");
    }

    abstract findGovDelegate(): Promise<AuthorityPolicy>;
    abstract txnAddGovAuthority<TCX extends StellarTxnContext>(
        tcx: TCX
    ): Promise<TCX>;

    async txnMustUseCharterUtxo<TCX extends StellarTxnContext>(
        tcx: TCX,
        redeemer: isActivity,
        newDatum?: InlineDatum
    ): Promise<TCX>;

    async txnMustUseCharterUtxo<TCX extends StellarTxnContext>(
        tcx: TCX,
        useReferenceInput: "refInput" | true
    ): Promise<TCX>;

    @partialTxn // non-activity partial
    async txnMustUseCharterUtxo<TCX extends StellarTxnContext>(
        tcx: TCX,
        redeemerOrRefInput: isActivity | "refInput" | true,
        newDatum?: InlineDatum
    ): Promise<TCX> {
        return this.mustFindCharterUtxo().then(async (ctUtxo: TxInput) => {
            // await this.txnAddCharterAuthz(
            //     tcx,
            //     ctUtxo.origOutput.datum as InlineDatum
            // );

            if (
                true === redeemerOrRefInput ||
                "refInput" === redeemerOrRefInput
            ) {
                // using reference-input has been requested
                if (newDatum)
                    throw new Error(
                        `when using reference input for charter, arg3 must be omitted`
                    );
                tcx.addRefInput(ctUtxo);
            } else {
                // caller requested to **spend** the charter token with a speciic activity / redeemer
                const redeemer = redeemerOrRefInput;
                this.txnAttachScriptOrRefScript(
                    tcx.addInput(ctUtxo, redeemer), 
                    this.compiledScript,
                )
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
    txnKeepCharterToken<TCX extends StellarTxnContext>(
        tcx: TCX,
        datum: InlineDatum
    ): TCX {
        const txo = new TxOutput(this.address, this.tvCharter(), datum);
        txo.correctLovelace(this.networkParams);
        tcx.addOutput(txo);

        return tcx;
    }

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
    async findGovAuthority(): Promise<TxInput | undefined> {
        const delegate = await this.findGovDelegate();
        return delegate.findAuthorityToken();
    }

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
    async findActorGovAuthority() {
        const delegate = await this.findGovDelegate();
        return delegate.findActorAuthorityToken();
    }

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
    findCharterAuthority() {
        throw new Error(
            `use findGovAuthority() to locate charter's gov-authority token`
        );
    }

    /**
     * REDIRECT: use txnAddGovAuthorityTokenRef() instead
     * @remarks
     *
     * this method was renamed.
     * @deprecated - look for txnAddGovAuthorityTokenRef() instead
     * @public
     **/
    async txnAddCharterAuthorityTokenRef<TCX extends StellarTxnContext>() {
        throw new Error(`use txnAddGovAuthorityTokenRef() instead`);
    }

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
    //!!! todo: If the Capo's mintDelegate is using the (TODO) "undelegated" strategy, this method can be used (?)
    // ... to approve token-minting by the authority of the gov authZor
    @partialTxn
    async txnAddGovAuthorityTokenRef<TCX extends StellarTxnContext>(
        tcx: TCX
    ): Promise<TCX> {
        const tcx2 = await this.txnMustUseCharterUtxo(tcx, "refInput");

        const tcx3 = await this.txnAddGovAuthority(tcx2);
        return tcx3;
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
    // getCapoRev() {
    //     return 1n;
    // }

    get mph() {
        return this.minter.mintingPolicyHash!;
    }

    get mintingPolicyHash() {
        return this.mph;
    }

    async findActorUut(
        uutPrefix: string,
        mph: MintingPolicyHash = this.mph
    ): Promise<FoundUut | undefined> {
        const foundUtxo = await this.findActorUtxo(`uut ${uutPrefix}-`, (utxo) => {
            if (getMatchingTokenName(utxo, mph)) {
                return utxo
            }
        });
        if (!foundUtxo) return undefined;
        
        return {
            utxo: foundUtxo,
            uut: new UutName(uutPrefix, getMatchingTokenName(foundUtxo, mph))
        };

        function getMatchingTokenName(utxo: TxInput, mph: MintingPolicyHash) {
            const tokenNamesExisting = utxo.value.assets
                .getTokenNames(mph)
                .map((x) => bytesToText(x.bytes));

            const tokenNames = tokenNamesExisting.filter((x) => {
                // console.info("   - found token name: "+x);
                return !!x.startsWith(`${uutPrefix}-`);
            });

            return tokenNames[0];
        }
    }

    async connectMintingScript(params: SeedTxnParams): Promise<minterType> {
        if (this.minter)
            throw new Error(`just use this.minter when it's already present`);
        const { minterClass } = this;
        const { seedTxn, seedIndex } = params;
        const {
            mph: expectedMph,
            devGen,
            isDev,
        } = this.configIn || {
            isDev: false,
            devGen: 0n,
        };

        const minter = await this.addStrellaWithConfig(minterClass, {
            isDev,
            devGen,
            seedTxn,
            seedIndex,
            //@ts-expect-error - subclassing Capo in a different way than DefaultCapo
            //   isn't actively supported yet
            capo: this,
        });

        if (expectedMph && !minter.mintingPolicyHash.eq(expectedMph)) {
            throw new Error(
                `This minter script with this seed-utxo doesn't produce the required  minting policy hash\n` +
                    "expected: " +
                    expectedMph.hex +
                    "\nactual: " +
                    minter.mintingPolicyHash.hex
            );
        } else if (!expectedMph) {
            console.log(`${this.constructor.name}: seeding new minting policy`);
        }
        const mintingCharter = minter.mustGetActivity("mintingCharter");
        if (!mintingCharter)
            throw new Error(
                `minting script doesn't offer required 'mintingCharter' activity-redeemer`
            );
        // if (!mintingUuts)
        //     throw new Error(
        //         `minting script doesn't offer required 'mintingUuts' activity-redeemer`
        //     );

        //@ts-ignore-error - can't seem to indicate to typescript that minter's type can be relied on to be enough
        return (this.minter = minter);
    }

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
    async txnMustGetSeedUtxo(
        tcx: StellarTxnContext,
        purpose: string,
        tokenNames: string[]
    ): Promise<TxInput | never> {
        //! given a Capo-based contract instance having a free TxInput to seed its validator address,
        //! prior to initial on-chain creation of contract,
        //! it finds that specific TxInput in the current user's wallet.

        const fakeMph = new MintingPolicyHash([]);

        const totalMinUtxoValue = tokenNames.reduce(
            addTokenValue.bind(this),
            new Value(0n)
        );
        //! accumulates min-utxos for each stringy token-name in a reduce()
        function addTokenValue(
            this: Capo<any>,
            accumulator: Value,
            tn: string
        ): Value {
            const vMin = this.mkMinTv(fakeMph, tn);
            return accumulator.add(vMin);
        }

        const uutSeed = this.mkValuePredicate(totalMinUtxoValue.lovelace, tcx);
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
    }

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
    async txnCreateDelegateLink<
        DT extends StellarDelegate,
        const RN extends string
    >(
        tcx: hasUutContext<RN>,
        roleName: RN,
        delegateInfo: MinimalDelegateLink<DT> = { strategyName: "default" }
    ): Promise<ConfiguredDelegate<DT> & RelativeDelegateLink<DT>> {
        const configured = await this.txnCreateConfiguredDelegate(
            tcx,
            roleName,
            delegateInfo
        );
        await configured.delegate.txnReceiveAuthorityToken(
            tcx,
            this.mkMinTv(this.mph, tcx.state.uuts[roleName])
        );

        return configured;
    }
    abstract txnAttachScriptOrRefScript<TCX extends StellarTxnContext>(
        tcx: TCX,
        program?: UplcProgram,
    ): Promise<TCX>;

    // this is just type sugar - a configured delegate already has all the relative-delegate link properties.
    relativeLink<DT extends StellarDelegate<any>>(
        configured: ConfiguredDelegate<DT>
    ): RelativeDelegateLink<DT> {
        const {
            strategyName,
            delegateValidatorHash,
            uutName,
            config,
        }: // addrHint,  //moved to config
        // reqdAddress,  // removed
        RelativeDelegateLink<DT> = configured;

        return {
            strategyName,
            uutName,
            delegateValidatorHash,
            config,
            // addrHint,  //moved to config
            // reqdAddress,  // removed
        };
    }

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
    async txnCreateConfiguredDelegate<
        DT extends StellarDelegate<any>,
        const RN extends string
    >(
        tcx: hasUutContext<RN>,
        roleName: RN & keyof this["delegateRoles"],
        delegateInfo: MinimalDelegateLink<DT> = { strategyName: "default" }
    ): Promise<ConfiguredDelegate<DT>> {
        const { strategyName, config: selectedConfig = {} } = delegateInfo;

        const { delegateRoles } = this;
        const uut = tcx.state.uuts[roleName];
        const impliedDelegationDetails = this.mkImpliedDelegationDetails(uut);

        const foundStrategies = 
            delegateRoles[roleName] as RoleInfo<DT, any, any, RN>; //prettier-ignore
        if (!foundStrategies) {
            throw new Error(`no delegateRoles entry for role '${roleName}'`);
        }
        const selectedStrategy = foundStrategies.variants[
            strategyName
        ] as VariantStrategy<DT>;
        if (!selectedStrategy) {
            let msg = `invalid strategyName '${strategyName}' for role '${roleName}'`;
            if (strategyName == "default") {
                msg = `no selected or default delegate for role '${roleName}'.  Specify strategyName`;
            }
            const e = new DelegateConfigNeeded(msg, {
                errorRole: roleName,
                availableStrategies: Object.keys(foundStrategies.variants),
            });
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
            ...impliedDelegationDetails,
            devGen: this.devGen,
            capo: this,
        } as unknown as ConfigFor<DT>;

        //! it validates the net configuration so it can return a working config.
        const errors: ErrorMap | undefined =
            validateConfig && validateConfig(mergedConfig);
        if (errors) {
            throw new DelegateConfigNeeded(
                `validation errors in delegateInfo.config for ${roleName} '${strategyName}':\n` +
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
        let delegate: DT = await this.mustGetDelegate(delegateSettings);

        // const reqdAddress = delegate.delegateReqdAddress();
        // if (reqdAddress) {
        //     delegateSettings.reqdAddress = reqdAddress;
        // } else {
        //     const addrHint = delegate.delegateAddrHint();
        //     if (addrHint) {
        //         delegateSettings.addrHint = addrHint;
        //     }
        // }
        const { delegateValidatorHash } = delegate;
        const pcd: ConfiguredDelegate<DT> = {
            ...delegateSettings,
            delegateValidatorHash,
            delegate,
        };
        return pcd;
    }

    mkImpliedDelegationDetails(uut: UutName): DelegationDetail {
        return {
            capoAddr: this.address,
            mph: this.mph,
            tn: stringToNumberArray(uut.name),
        };
    }

    #_delegateCache: {
        [roleName: string]: {
            [delegateLink: string]: StellarDelegate<any>;
        };
    } = {};

    // get connectDelegate()
    async connectDelegateWithLink<
        DelegateType extends StellarDelegate<any>,
        configType extends (
            DelegateType extends StellarContract<infer c> ? c : configBase //prettier-ignore
         ) = DelegateType extends StellarContract<infer c> ? c : configBase //prettier-ignore
    >(
        roleName: string,
        delegateLink: RelativeDelegateLink<DelegateType>
    ): Promise<DelegateType> {
        const cache = this.#_delegateCache;

        const cacheKey = JSON.stringify(
            delegateLink,
            delegateLinkSerializer,
            4 // indent 4 spaces 
        );
        // console.log(`   ----- delegate '${roleName}' cache key `, cacheKey);
        if (!cache[roleName]) cache[roleName] = {};
        const roleCache = cache[roleName];
        const cachedRole = roleCache[cacheKey];
        if (cachedRole) {
            // console.log(  "   <---- cached delegate");
            return cachedRole as DelegateType;
        }
        const role = this.delegateRoles[roleName];
        //!!! work on type-safety with roleName + available roles
        const {
            strategyName,
            uutName,
            delegateValidatorHash: expectedDvh,
            // addrHint,  //moved to config
            // reqdAddress,  // removed
            config: linkedConfig,
        } = delegateLink;
        const selectedStrat = role.variants[
            strategyName
        ] as unknown as ConfiguredDelegate<DelegateType>;
        if (!selectedStrat) {
            throw new Error(
                `mismatched strategyName '${strategyName}' in delegate link for role '${roleName}'\n` +
                    `  ...available strategies: ${Object.keys(
                        role.variants
                    ).join(", ")}.\n\n link details: ${this.showDelegateLink(
                        delegateLink
                    )}`
            );
        }
        const { delegateClass, config: stratSettings } = selectedStrat;
        const { defaultParams: defaultParamsFromDelegateClass } = delegateClass;
        const impliedDelegationDetails = this.mkImpliedDelegationDetails(
            new UutName(roleName, uutName)
        );

        //@xxxts-expect-error because this stack of generically partial
        //  ... config elements isn't recognized as adding up to a full config type.
        // NOTE: THIS GETS AN EXISTING DELEGATE, and includes baseline config details.
        // See also the create-delegate code path in txnCreateConfiguredDelegate(), which
        // ... which also includes baseline config details.  IF YOU'RE ADDING STUFF HERE,
        // ... consider that it might also be needed there.
        const config: configType = {
            ...defaultParamsFromDelegateClass,
            ...stratSettings,
            // addrHint,  //moved to config
            // reqdAddress,  // removed
            ...linkedConfig,
            ...impliedDelegationDetails,
            devGen: this.devGen,
            capo: this,
        };
        //configured delegate:
        // delegateClass: stellarSubclass<DT>;
        //!  //  delegate: DT // omitted in "pre-configured";
        // roleName: string;
        // config: ConfigFor<DT>;
        //... from relativeDelegateLink:
        //      uutName: string;
        //      strategyName: string;
        //      config: Partial<ConfigFor<T>>;
        //      reqdAddress?: Address;
        //      addrHint?: Address[];

        const delegate = await this.mustGetDelegate({
            delegateClass,
            config,
            roleName,
            uutName,
            strategyName,
            // reqdAddress,
            // addrHint,
        });

        
        const dvh = delegate.delegateValidatorHash;

        if (expectedDvh && dvh && !expectedDvh.eq(dvh)) {
            throw new Error(
                `${this.constructor.name}: ${roleName}: mismatched or modified delegate: expected validator ${expectedDvh?.hex}, got ${dvh.hex}`
            );
        }
        console.log(
            `    <--- caching first instance of delegate ${roleName} @ key = ${cacheKey}`
        );
        roleCache[cacheKey] = delegate;
        return delegate;
    }

    private showDelegateLink(delegateLink: RelativeDelegateLink<any>) {
        return JSON.stringify(delegateLink, null, 2);
    }

    async mustGetDelegate<T extends StellarDelegate<any>>(
        configuredDelegate: PreconfiguredDelegate<T>
    ): Promise<T> {
        const { delegateClass, config } = configuredDelegate;
        try {
            // delegate
            const configured = await this.addStrellaWithConfig(
                delegateClass,
                config
            );
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

    tvForDelegate(dgtLink: RelativeDelegateLink<any>) {
        return this.tokenAsValue(dgtLink.uutName);
    }
    mkDelegatePredicate(dgtLink: RelativeDelegateLink<any>) {
        return this.mkTokenPredicate(this.tvForDelegate(dgtLink));
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
                    "Building a txn with a UUT involves using the txnMintingUuts partial-helper on the Capo.",
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
                    "Capo EXPECTS a synchronous getter for 'delegateRoles' to be defined",
                    "Capo provides a default 'delegateRoles' having no specific roles (or maybe just minter - TBD)",
                    "Subclasses can define their own get delegateRoles(), return a role-map-to-variant-map structure",
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
                        "TODO: variants can augment the delegateRoles object without removing or replacing any existing variant",
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
            "can locate UUTs in the user's wallet": {
                purpose: "for finding UUTs representing user's authority",
                details: [
                    "A Capo contract can locate UUTs in the user's wallet",
                    "  ... using the findActorUut() method",
                    "This is useful for finding authority tokens, ",
                    "  ... such as a charter-governance token, ",
                    "  ... or a token representing a user's authority in a smart contract",
                ],
                mech: [
                    "findActorUut() returns a FoundUut object, ",
                ]
            }
        });
    }
}
