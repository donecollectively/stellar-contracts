import { type PubKey, type PubKeyHash, type NetworkParamsHelper, type Tx, type Address, type NetworkParams, type Assets, type TxOutputId, type Signature, type TxInput, type TxId, type StakingAddress, type ShelleyAddress } from "@helios-lang/ledger";
import { type BytesLike, type IntLike } from "@helios-lang/codec-utils";
import { type EmulatorTx, type Emulator, type Wallet, type EmulatorGenesisTx, type Bip32PrivateKey, type RootPrivateKey, type SimpleWallet, type Cip30CoseSign1 } from "@helios-lang/tx-utils";
import { type NetworkContext } from "@donecollectively/stellar-contracts";
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
    get cardanoClient(): import("@helios-lang/tx-utils").CardanoClient;
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
 * Captures details from emulated network, to be used for quickly restoring a network state.
 * @public
 */
export type NetworkSnapshot = {
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
        collateralUTXO?: string;
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
//# sourceMappingURL=StellarNetworkEmulator.d.ts.map