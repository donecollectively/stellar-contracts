import type { ActorContext } from '@donecollectively/stellar-contracts';
import { Address } from '@helios-lang/ledger';
import type { anyState } from '@donecollectively/stellar-contracts';
import { Assets } from '@helios-lang/ledger';
import { Bip32PrivateKey } from '@helios-lang/tx-utils';
import { BytesLike } from '@helios-lang/codec-utils';
import { Capo } from '@donecollectively/stellar-contracts';
import type { CapoConfig } from '@donecollectively/stellar-contracts';
import type { CapoFeatureFlags } from '@donecollectively/stellar-contracts';
import { CapoWithoutSettings } from '@donecollectively/stellar-contracts';
import { CardanoClient } from '@helios-lang/tx-utils';
import type { CharterDataLike } from '@donecollectively/stellar-contracts';
import { charterDataState } from '@donecollectively/stellar-contracts';
import { Cip30CoseSign1 } from '@helios-lang/tx-utils';
import type { configBase } from '@donecollectively/stellar-contracts';
import type { ConfigFor } from '@donecollectively/stellar-contracts';
import { Emulator } from '@helios-lang/tx-utils';
import { EmulatorGenesisTx } from '@helios-lang/tx-utils';
import { EmulatorTx } from '@helios-lang/tx-utils';
import { hasAddlTxns } from '@donecollectively/stellar-contracts';
import { hasBootstrappedCapoConfig } from '@donecollectively/stellar-contracts';
import { hasSeedUtxo } from '@donecollectively/stellar-contracts';
import { hasUutContext } from '@donecollectively/stellar-contracts';
import { IntLike } from '@helios-lang/codec-utils';
import type { MinimalCharterDataArgs } from '@donecollectively/stellar-contracts';
import { NetworkContext } from '@donecollectively/stellar-contracts';
import { NetworkParams } from '@helios-lang/ledger';
import { NetworkParamsHelper } from '@helios-lang/ledger';
import { PubKey } from '@helios-lang/ledger';
import { PubKeyHash } from '@helios-lang/ledger';
import { RootPrivateKey } from '@helios-lang/tx-utils';
import type { SetupInfo } from '@donecollectively/stellar-contracts';
import { ShelleyAddress } from '@helios-lang/ledger';
import { Signature } from '@helios-lang/ledger';
import { SimpleWallet } from '@helios-lang/tx-utils';
import { StakingAddress } from '@helios-lang/ledger';
import { StellarContract } from '@donecollectively/stellar-contracts';
import type { stellarSubclass } from '@donecollectively/stellar-contracts';
import { StellarTxnContext } from '@donecollectively/stellar-contracts';
import type { SubmitOptions } from '@donecollectively/stellar-contracts';
import type { TestContext } from 'vitest';
import { Tx } from '@helios-lang/ledger';
import { TxId } from '@helios-lang/ledger';
import { TxInput } from '@helios-lang/ledger';
import { TxOutputId } from '@helios-lang/ledger';
import { Wallet } from '@helios-lang/tx-utils';

/**
 * @public
 */
export declare type actorMap = Record<string, SimpleWallet_stellar>;

/**
 * @public
 */
export declare const ADA = 1000000n;

/**
 * Adds a test helper class to a `vitest` testing context.
 * @remarks
 *
 * @param context -  a vitest context, typically created with StellarTestContext
 * @param TestHelperClass - typically created with DefaultCapoTestHelper
 * @param stConfig - preset configuration for the contract under test
 * @public
 **/
export declare function addTestContext<SC extends StellarContract<any>, ST_CONFIG extends configBase & ConfigFor<SC> = ConfigFor<SC>>(context: StellarTestContext<any, SC>, TestHelperClass: SC extends Capo<any> ? DefaultCapoTestHelperClass<SC> : stellarTestHelperSubclass<SC>, stConfig?: Partial<SC extends Capo<any, infer FF> ? {
    featureFlags: FF;
} & ST_CONFIG : ST_CONFIG>, helperState?: TestHelperState<SC>): Promise<void>;

/**
 * @public
 */
export declare type canHaveRandomSeed = {
    randomSeed?: number;
};

/**
 * @public
 */
export declare type canSkipSetup = {
    skipSetup?: true;
};

/**
 * Base class for test helpers for Capo contracts
 * @remarks
 *
 * You should probably use DefaultCapoTestHelper instead of this class.
 * @public
 **/
export declare abstract class CapoTestHelper<SC extends Capo<any>> extends StellarTestHelper<SC> {
    config?: canHaveRandomSeed & SC extends Capo<any, infer FF> ? ConfigFor<SC> & CapoConfig<FF> : never;
    get capo(): SC;
    featureFlags: CapoFeatureFlags | undefined;
    constructor(config?: SC extends Capo<any, infer FF> ? ConfigFor<SC> & CapoConfig<FF> : ConfigFor<SC>, helperState?: TestHelperState<SC>);
    initialize({ randomSeed }?: {
        randomSeed?: number;
    }, args?: Partial<MinimalCharterDataArgs>): Promise<SC>;
    checkDelegateScripts(args?: Partial<MinimalCharterDataArgs>): Promise<void>;
    get ready(): boolean;
    /**
     * Creates a new transaction-context with the helper's current or default actor
     * @public
     **/
    mkTcx<T extends anyState = anyState>(txnName?: string): StellarTxnContext<T>;
    loadSnapshot(snapName: string): void;
    reusableBootstrap(snap?: string): Promise<any>;
    static hasNamedSnapshot(snapshotName: string, actorName: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
    hasSnapshot(snapshotName: string): boolean;
    snapshot(snapshotName: string): void;
    findOrCreateSnapshot(snapshotName: string, actorName: string, contentBuilder: () => Promise<StellarTxnContext<any>>): Promise<SC>;
    restoreFrom(snapshotName: string): Promise<SC>;
    bootstrap(args?: Partial<MinimalCharterDataArgs>, submitOptions?: SubmitOptions): Promise<SC>;
    extraBootstrapping(args?: Partial<MinimalCharterDataArgs>, submitOptions?: SubmitOptions): Promise<SC>;
    abstract mkDefaultCharterArgs(): Partial<MinimalCharterDataArgs>;
    abstract mintCharterToken(args?: Partial<MinimalCharterDataArgs>, submitOptions?: SubmitOptions): Promise<hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt"> & hasBootstrappedCapoConfig & hasAddlTxns<any>>;
}

/**
 * Test helper for classes extending Capo
 * @remarks
 *
 * Arranges an test environment with predefined actor-names having various amounts of ADA in their (emulated) wallets,
 * and default helpers for setting up test scenarios.  Provides a simplified framework for testing Stellar contracts extending
 * the Capo class.
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
 * @typeParam DC - the specific Capo subclass under test
 * @public
 **/
export declare class DefaultCapoTestHelper<CAPO extends Capo<any> = CapoWithoutSettings> extends CapoTestHelper<CAPO> {
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
     * @param s - your Capo subclass
     * @typeParam CAPO - no need to specify it; it's inferred from your parameter
     * @public
     **/
    static forCapoClass<CAPO extends Capo<any>>(s: stellarSubclass<CAPO>): DefaultCapoTestHelperClass<CAPO>;
    get stellarClass(): stellarSubclass<CAPO>;
    _start: number;
    constructor(config?: CAPO extends Capo<any, infer FF> ? ConfigFor<CAPO> & CapoConfig<FF> : ConfigFor<CAPO>, helperState?: TestHelperState<CAPO>);
    ts(...args: any[]): void;
    requiresActorRole(roleName: string, firstLetter: string): void;
    get relativeTs(): string;
    setupActors(): Promise<void>;
    setDefaultActor(): Promise<void>;
    mkCharterSpendTx(): Promise<StellarTxnContext>;
    checkDelegateScripts(args?: Partial<MinimalCharterDataArgs>): Promise<void>;
    mkDefaultCharterArgs(): MinimalCharterDataArgs;
    mintCharterToken(args?: Partial<MinimalCharterDataArgs>, submitOptions?: SubmitOptions): Promise<hasBootstrappedCapoConfig & hasAddlTxns<hasBootstrappedCapoConfig, {
    bsc: CapoConfig;
    uuts: {
    [x: string]: unknown;
    };
    bootstrappedConfig: any;
    }> & StellarTxnContext<charterDataState> & hasUutContext<"govAuthority" | "mintDelegate" | "capoGov" | "mintDgt" | "setting"> & hasUutContext<"spendDelegate" | "govAuthority" | "mintDelegate" | "capoGov" | "mintDgt" | "spendDgt"> & hasSeedUtxo>;
    updateCharter(args: CharterDataLike, submitSettings?: SubmitOptions): Promise<StellarTxnContext>;
}

/**
 * @public
 */
export declare type DefaultCapoTestHelperClass<SC extends Capo<any>> = new (config?: canHaveRandomSeed & SC extends Capo<any, infer FF> ? ConfigFor<SC> & CapoConfig<FF> : ConfigFor<SC>, helperState?: TestHelperState<SC>) => DefaultCapoTestHelper<SC>;

/**
 * @public
 */
export declare type enhancedNetworkParams = NetworkParams & {
    slotToTimestamp(n: bigint): Date;
};

/**
 * Recursively expand all types in a type
 * @public
 */
export declare type ExpandRecursively<T> = T extends object ? T extends infer O ? {
    [K in keyof O]: ExpandRecursively<O[K]>;
} : never : T;

/**
 * @public
 */
export declare const insufficientInputError: RegExp;

/**
 * Captures details from emulated network, to be used for quickly restoring a network state.
 * @public
 */
export declare type NetworkSnapshot = {
    seed: number;
    netNumber: number;
    name: string;
    slot: number;
    genesis: EmulatorGenesisTx[];
    blocks: EmulatorTx[][];
    allUtxos: Record<string, TxInput>;
    consumedUtxos: Set<string>;
    addressUtxos: Record<string, TxInput[]>;
};

/**
 * This wallet only has a single private/public key, which isn't rotated.
 * Staking is not yet supported.
 * @public
 */
export declare class SimpleWallet_stellar implements Wallet {
    networkCtx: NetworkContext;
    spendingPrivateKey: Bip32PrivateKey;
    spendingPubKey: PubKey;
    stakingPrivateKey: Bip32PrivateKey | undefined;
    stakingPubKey: PubKey | undefined;
    get cardanoClient(): CardanoClient;
    static fromPhrase(phrase: string[], networkCtx: NetworkContext, dict?: string[]): SimpleWallet_stellar;
    static fromRootPrivateKey(key: RootPrivateKey, networkCtx: NetworkContext): SimpleWallet_stellar;
    constructor(networkCtx: NetworkContext, spendingPrivateKey: Bip32PrivateKey, stakingPrivateKey?: Bip32PrivateKey | undefined);
    get privateKey(): Bip32PrivateKey;
    get pubKey(): PubKey;
    get spendingPubKeyHash(): PubKeyHash;
    get stakingPubKeyHash(): PubKeyHash | undefined;
    get address(): ShelleyAddress<PubKeyHash>;
    get stakingAddress(): StakingAddress<PubKeyHash> | undefined;
    get stakingAddresses(): Promise<StakingAddress[]>;
    isMainnet(): Promise<boolean>;
    /**
     * Assumed wallet was initiated with at least 1 UTxO at the pubkeyhash address.
     */
    get usedAddresses(): Promise<ShelleyAddress<PubKeyHash>[]>;
    get unusedAddresses(): Promise<ShelleyAddress<PubKeyHash>[]>;
    get utxos(): Promise<TxInput<PubKeyHash>[]>;
    get collateral(): Promise<TxInput<PubKeyHash>[]>;
    signData(addr: ShelleyAddress<PubKeyHash>, data: BytesLike): Promise<{
        signature: Cip30CoseSign1;
        key: PubKey;
    }>;
    /**
     * Simply assumed the tx needs to by signed by this wallet without checking.
     */
    signTx(tx: Tx): Promise<Signature[]>;
    submitTx(tx: Tx): Promise<TxId>;
}

/**
 * A simple emulated Network.
 * This can be used to do integration tests of whole dApps.
 * Staking is not yet supported.
 * @public
 */
export declare class StellarNetworkEmulator implements Emulator {
    #private;
    currentSlot: number;
    genesis: EmulatorGenesisTx[];
    mempool: EmulatorTx[];
    blocks: EmulatorTx[][];
    /**
     * Cached map of all UTxOs ever created
     * @internal
     */
    _allUtxos: Record<string, TxInput>;
    /**
     * Cached set of all UTxOs ever consumed
     * @internal
     */
    _consumedUtxos: Set<string>;
    /**
     * Cached map of UTxOs at addresses
     * @internal
     */
    _addressUtxos: Record<string, TxInput[]>;
    id: number;
    params: NetworkParams;
    /**
     * Instantiates a NetworkEmulator at slot 0.
     * An optional seed number can be specified, from which all EMULATED RANDOMNESS is derived.
     */
    constructor(seed?: number, { params }?: {
        params: NetworkParams;
    });
    isMainnet(): boolean;
    /**
     * Each slot is assumed to be 1000 milliseconds
     *
     * returns milliseconds since start of emulation
     */
    get now(): number;
    get parameters(): Promise<NetworkParams>;
    get parametersSync(): {
        refTipSlot: number;
        refTipTime: number;
        txFeeFixed: number;
        txFeePerByte: number;
        exMemFeePerUnit: number;
        exCpuFeePerUnit: number;
        utxoDepositPerByte: number;
        refScriptsFeePerByte: number;
        collateralPercentage: number;
        maxCollateralInputs: number;
        maxTxExMem: number;
        maxTxExCpu: number;
        maxTxSize: number;
        secondsPerSlot: number;
        stakeAddrDeposit: number;
        costModelParamsV1: number[];
        costModelParamsV2: number[];
        costModelParamsV3: number[];
    };
    /**
     * retains continuity for the seed and the RNG through one or more snapshots.
     * @internal
     */
    mulberry32: () => number;
    netPHelper: NetworkParamsHelper;
    initHelper(): NetworkParamsHelper;
    /**
     * Ignores the genesis txs
     */
    get txIds(): TxId[];
    snapshot(snapName: string): NetworkSnapshot;
    fromSnapshot: string;
    loadSnapshot(snapshot: NetworkSnapshot): void;
    /**
     * Creates a new SimpleWallet and populates it with a given lovelace quantity and assets.
     * Special genesis transactions are added to the emulated chain in order to create these assets.
     * @deprecated - use TestHelper.createWallet instead, enabling wallets to be transported to
     *     different networks (e.g. ones that have loaded snapshots from the original network).
     */
    createWallet(lovelace?: bigint, assets?: Assets): SimpleWallet_stellar;
    /**
     * Creates a UTxO using a GenesisTx.  The txn doesn't need to balance or be signed.  It's magic.
     * @param wallet - the utxo is created at this wallet's address
     * @param lovelace - the lovelace amount to create
     * @param assets - other assets to include in the utxo
     */
    createUtxo(wallet: SimpleWallet, lovelace: bigint, assets?: Assets): TxOutputId;
    warnMempool(): void;
    /**
     * Throws an error if the UTxO isn't found
     */
    getUtxo(id: TxOutputId): Promise<TxInput>;
    hasUtxo(id: any): Promise<boolean>;
    getUtxos(address: Address): Promise<TxInput[]>;
    isSubmissionExpiryError(e: Error): boolean;
    isUnknownUtxoError(e: Error): boolean;
    dump(): void;
    isConsumed(utxo: any): boolean;
    submitTx(tx: Tx): Promise<TxId>;
    /**
     * Mint a block with the current mempool, and advance the slot by a number of slots.
     */
    tick(nSlots: IntLike): void;
    /**
     * @internal
     */
    pushBlock(txs: EmulatorTx[]): void;
}

/**
 * Interface augmenting the generic vitest testing context with a convention for testing contracts created with Stellar Contracts.
 * @public
 **/
export declare interface StellarTestContext<HTH extends StellarTestHelper<SC>, SC extends StellarContract<any> = HTH extends StellarTestHelper<infer iSC> ? iSC : never> extends canHaveRandomSeed, TestContext {
    h: HTH;
    get strella(): SC;
    initHelper(config: Partial<ConfigFor<SC>> & canHaveRandomSeed & canSkipSetup, helperState?: TestHelperState<SC>): Promise<StellarTestHelper<SC>>;
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
    abstract get stellarClass(): stellarSubclass<SC>;
    config?: ConfigFor<SC> & canHaveRandomSeed;
    defaultActor?: string;
    strella: SC;
    actors: actorMap;
    optimize: boolean;
    netPHelper: NetworkParamsHelper;
    networkCtx: NetworkContext<StellarNetworkEmulator>;
    protected _actorName: string;
    /**
     * @public
     */
    get actorName(): string;
    /**
     * @public
     */
    get network(): StellarNetworkEmulator;
    /**
     * Gets the current actor wallet
     *
     * @public
     **/
    get wallet(): SimpleWallet_stellar;
    /**
     * @public
     */
    actorContext: ActorContext<SimpleWallet_stellar>;
    /**
     * @public
     */
    setActor(actorName: string): Promise<void>;
    address?: Address;
    setupPending?: Promise<any>;
    /**
     * @public
     */
    setupActors(): Promise<void>;
    /**
     * @public
     */
    setDefaultActor(): Promise<void>;
    helperState?: TestHelperState<SC>;
    constructor(config?: ConfigFor<SC> & canHaveRandomSeed & canSkipSetup, helperState?: TestHelperState<SC>);
    /**
     * @public
     */
    fixupParams(preProdParams: NetworkParams): NetworkParams;
    /**
     * Submits a transaction and advances the network block
     * @public
     * @param TCX - The type of transaction context state, must extend anyState
     */
    submitTxnWithBlock<TCX extends StellarTxnContext>(tcx: TCX | Promise<TCX>, options?: TestHelperSubmitOptions): Promise<TCX>;
    /**
     * @public
     */
    advanceNetworkTimeForTx(tcx: StellarTxnContext, futureDate?: Date): Promise<void>;
    /**
     * @public
     */
    initialize({ randomSeed, }?: {
        randomSeed?: number;
    }): Promise<SC>;
    /**
     * @public
     */
    initStellarClass(config?: (ConfigFor<SC> & canHaveRandomSeed) | undefined): Promise<SC>;
    setup: SetupInfo;
    initSetup(setup?: SetupInfo): SetupInfo;
    /**
     * @public
     */
    initStrella(TargetClass: stellarSubclass<SC>, config?: ConfigFor<SC>): Promise<SC>;
    randomSeed?: number;
    rand?: () => number;
    /**
     * @public
     */
    delay(ms: any): Promise<unknown>;
    /**
     * Creates a new SimpleWallet and populates it with a given lovelace quantity and assets.
     * Special genesis transactions are added to the emulated chain in order to create these assets.
     * @public
     */
    createWallet(lovelace?: bigint, assets?: Assets): SimpleWallet_stellar;
    /**
     * @public
     */
    mkSeedUtxo(seedIndex?: bigint): Promise<TxId>;
    /**
     * @public
     */
    submitTx(tx: Tx, force?: "force"): Promise<TxId>;
    /**
     * @public
     */
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
    addrRegistry: Record<string, string>;
    /**
     * @public
     */
    get networkParams(): NetworkParams;
    /**
     * @public
     */
    mkNetwork(params: NetworkParams): [StellarNetworkEmulator, NetworkParamsHelper];
    /**
     * @public
     */
    slotToTime(s: bigint): number | Date;
    /**
     * @public
     */
    currentSlot(): number;
    /**
     * @public
     */
    waitUntil(time: Date): number;
}

/**
 * @public
 */
export declare type stellarTestHelperSubclass<SC extends StellarContract<any>> = new (stConfig: ConfigFor<SC> & canHaveRandomSeed, helperState?: TestHelperState<SC>) => StellarTestHelper<SC>;

/**
 * @public
 */
export declare type TestHelperState<SC extends StellarContract<any>> = {
    bootstrapped: Boolean;
    bootstrappedStrella?: SC;
    snapshots: Record<string, NetworkSnapshot>;
    previousHelper: StellarTestHelper<any>;
};

export declare type TestHelperSubmitOptions = SubmitOptions & {
    futureDate?: Date;
};

export { }
