import { type Address, type NetworkParams, type NetworkParamsHelper, type Tx, type TxId } from "@helios-lang/ledger";
import { SimpleWallet_stellar as emulatedWallet, StellarNetworkEmulator } from "./emulator/StellarNetworkEmulator.js";
import { StellarContract } from "@donecollectively/stellar-contracts";
import type { stellarSubclass, ConfigFor, ActorContext, NetworkContext, SetupInfo, StellarTxnContext, SubmitOptions } from "@donecollectively/stellar-contracts";
/**
 * Records the setup info for an actor, used for snapshot cache key computation.
 * @public
 */
export type ActorSetupInfo = {
    name: string;
    initialBalance: bigint;
    additionalUtxos: bigint[];
};
/**
 * Stored wallet keys for fast actor restoration. REQT/n93h9y5s85
 * @public
 */
export type StoredActorWalletKeys = {
    /** Hex-encoded spending private key bytes */
    spendingKey: string;
    /** Hex-encoded staking private key bytes (optional) */
    stakingKey?: string;
};
/**
 * Map of actor names to stored wallet keys for offchainData.
 * @public
 */
export type ActorWalletsOffchainData = {
    actorWallets: Record<string, StoredActorWalletKeys>;
};
import type { TestHelperState, actorMap, canHaveRandomSeed, canSkipSetup } from "./types.js";
import { type Wallet } from "@helios-lang/tx-utils";
/**
 * @public
 */
export declare const expectTxnError: Partial<SubmitOptions>;
/**
 * @public
 */
export type TestHelperSubmitOptions = SubmitOptions & {
    futureDate?: Date;
};
/**
 * Base class for test-helpers on generic Stellar contracts
 * @remarks
 *
 * NOTE: DefaultCapoTestHelper is likely to be a better fit for typical testing needs and typical contract-development scenarios.
 * Use this class for specific unit-testing needs not sufficiently served by integration-testing on a Capo.
 * @public
 **/
export declare abstract class StellarTestHelper<SC extends StellarContract<any>, SpecialState extends Record<string, any> = {}> {
    state: Record<string, any>;
    abstract get stellarClass(): stellarSubclass<SC>;
    config?: ConfigFor<SC> & canHaveRandomSeed;
    defaultActor?: string;
    strella: SC;
    actors: actorMap;
    /** Records actor setup info for cache key computation */
    actorSetupInfo: ActorSetupInfo[];
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
    get wallet(): emulatedWallet;
    /**
     * Shared actorContext envelope - singleton across all helpers via helperState (REQT/ch01gxgm4g).
     * All helpers and the Capo share this same object so setActor() updates are visible everywhere.
     * Update contents (actorContext.wallet, actorContext.others) - never replace the envelope.
     * @public
     */
    get actorContext(): ActorContext<emulatedWallet>;
    set actorContext(_value: ActorContext<emulatedWallet>);
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
    /**
     * Helper state for named records and bootstrap tracking.
     * Always initialized from the class's static defaultHelperState.
     */
    helperState: TestHelperState<SC, SpecialState>;
    /**
     * Default helperState shared across all instances of this helper class.
     * Subclasses can override this to provide custom default state.
     * @public
     */
    static defaultHelperState: TestHelperState<any, any>;
    constructor(config?: ConfigFor<SC> & canHaveRandomSeed & canSkipSetup, helperState?: TestHelperState<SC, SpecialState>);
    /**
     * Adjusts network params for test environment flexibility.
     * Implements REQT/6rdjgebzyx (Network Parameter Fixups).
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
    createWallet(lovelace?: bigint, assets?: import("@helios-lang/ledger").Assets): emulatedWallet;
    /**
     * Extracts wallet private keys from current actors for storage in offchainData.
     * Returns data suitable for storing in CachedSnapshot.offchainData. REQT/1p346cabct
     * @public
     */
    getActorWalletKeys(): ActorWalletsOffchainData;
    /**
     * Restores actor wallets from stored private keys (fast path).
     * Replaces PRNG-based regeneration. REQT/avwkcrnwqp, REQT/ncbfwtyr8h
     * @param storedData - The offchainData containing actorWallets
     * @internal
     */
    restoreActorsFromStoredKeys(storedData: ActorWalletsOffchainData): void;
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
    /** When true, suppresses actor creation logging (used during cache key computation) */
    protected _silentActorSetup: boolean;
    addActor(roleName: string, walletBalance: bigint, ...moreUtxos: bigint[]): Wallet;
    /**
     * Logs detailed info for a single actor.
     * @internal
     */
    private logActor;
    /**
     * Logs detailed actor information. Used when actors were created silently
     * during cache key computation but we want to show them on cache miss.
     * @internal
     */
    logActorDetails(): void;
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
//# sourceMappingURL=StellarTestHelper.d.ts.map