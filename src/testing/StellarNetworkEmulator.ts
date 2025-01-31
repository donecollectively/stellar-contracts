import {
    makeTxId,
    makeTxInput,
    makeTxOutput,
    makeValue,
    type PubKey,
    type PubKeyHash,
    type TxOutput,
    type NetworkParamsHelper,
    type Tx,
    type Address,
    type NetworkParams,
    type Assets,
    type TxOutputId,
    type Signature,
    makeTxOutputId,
    type TxInput,
    type TxId,
    makeAddress,
    makeStakingAddress,
    type StakingAddress,
    makeNetworkParamsHelper,
    makeAssets,
    type ShelleyAddress,
    type Value,
} from "@helios-lang/ledger";

import {
    type IntLike,
} from "@helios-lang/codec-utils";
import {
    BIP39_DICT_EN,
    SECOND,
    type EmulatorTx,
    type Emulator,
    type Wallet,
    type EmulatorGenesisTx,
    type EmulatorRegularTx,
    type Bip32PrivateKey,
    restoreRootPrivateKey,
    type RootPrivateKey,
    makeEmulatorGenesisTx,
    makeEmulatorRegularTx,
    type SimpleWallet,
} from "@helios-lang/tx-utils";
import type { NumberGenerator } from "@helios-lang/crypto";
import { DEFAULT_NETWORK_PARAMS } from "@helios-lang/ledger";
import { type UplcLogger } from "@helios-lang/uplc";

import { 
    dumpAny, 
    type NetworkContext 
} from "@donecollectively/stellar-contracts";

// class GenesisTx implements EmulatorGenesisTx {
//     #id: number;
//     #address: Address;
//     #lovelace: bigint;
//     #assets: Assets;

//     constructor(
//         id: number,
//         address: Address,
//         lovelace: bigint,
//         assets: Assets
//     ) {
//         this.#id = id;
//         this.#address = address;
//         this.#lovelace = lovelace;
//         this.#assets = assets;
//     }

//     /**
//      * Simple incremental txId for genesis transactions.
//      * It's very unlikely that regular transactions have the same hash.
//      */
//     id() {
//         let bytes = encodeIntBE(BigInt(this.#id));

//         if (bytes.length < 32) {
//             bytes = new Array(32 - bytes.length).fill(0).concat(bytes);
//         }

//         return makeTxId(bytes);
//     }

//     consumes(utxo) {
//         return false;
//     }

//     collectUtxos(address, utxos) {
//         if (equalsBytes(this.#address.bytes, address.bytes)) {
//             utxos = utxos.slice();

//             utxos.push(
//                 makeTxInput(
//                     makeTxOutputId(this.id(), 0),
//                     makeTxOutput(
//                         this.#address,
//                         makeValue(this.#lovelace, this.#assets)
//                     )
//                 )
//             );

//             return utxos;
//         } else {
//             return utxos;
//         }
//     }

//     getUtxo(id: TxOutputId) {
//         if (!(this.id().isEqual(id.txId) && id.index == 0)) {
//             return null;
//         }

//         return makeTxInput(
//             makeTxOutputId(this.id(), 0),
//             makeTxOutput(this.#address, makeValue(this.#lovelace, this.#assets))
//         );
//     }

//     dump() {
//         console.log("GENESIS TX");
//         console.log(
//             `id: ${this.#id.toString()},\naddress: ${this.#address.toString() // same as .toBech32()
//                 },\nlovelace: ${this.#lovelace.toString()},\nassets: ${JSON.stringify(
//                 this.#assets.dump(),
//                 undefined,
//                 "    "
//             )}`
//         );
//     }
// }

// class RegularTx implements EmulatorRegularTx {
//     #tx: Tx;

//     kind = "Regular" as const
//     constructor(tx: Tx) {
//         this.#tx = tx;
//     }

//     #txId: TxId | null = null;
//     id() {
//         if (this.#txId) return this.#txId;
//         return (this.#txId = this.#tx.id());
//     }

//     consumes(utxo) {
//         const txInputs = this.#tx.body.inputs;

//         return txInputs.some((txInput) => txInput.isEqual(utxo));
//     }

//     collectUtxos(address, utxos) {
//         utxos = utxos.filter((utxo) => !this.consumes(utxo));

//         const txOutputs = this.#tx.body.outputs;
//         const txId = this.id();
//         txOutputs.forEach((txOutput, utxoId) => {
//             if (equalsBytes(txOutput.address.bytes, address.bytes)) {
//                 utxos.push(makeTxInput(makeTxOutputId(txId, utxoId), txOutput));
//             }
//         });

//         return utxos;
//     }

//     getUtxo(id: TxOutputId) : TxInput | undefined{
//         if (!id.txId.isEqual(this.id())) {
//             return undefined;
//         }

//         /**
//          * @type {null | TxInput}
//          */
//         let utxo: TxInput | undefined;

//         this.#tx.body.outputs.forEach((output, i) => {
//             if (i == id.index) {
//                 utxo = makeTxInput(id, output);
//             }
//         });

//         return utxo;
//     }

//     dump() {
//         console.log("REGULAR TX");
//         console.log(JSON.stringify(this.#tx.dump(), undefined, "  "));
//     }
// }

/**
 * This wallet only has a single private/public key, which isn't rotated. 
 * Staking is not yet supported.
 * @public
 */
export class SimpleWallet_stellar implements Wallet {
    networkCtx: NetworkContext;
    spendingPrivateKey: Bip32PrivateKey;
    spendingPubKey: PubKey;

    stakingPrivateKey: Bip32PrivateKey | undefined
    stakingPubKey: PubKey | undefined;

    get cardanoClient() {
        return this.networkCtx.network;
    }

    static fromPhrase(
        phrase: string[],
        networkCtx: NetworkContext,
        dict = BIP39_DICT_EN
    ): SimpleWallet_stellar {
        return SimpleWallet_stellar.fromRootPrivateKey(
            restoreRootPrivateKey(phrase, dict),
            networkCtx
        );
    }
    static fromRootPrivateKey(
        key: RootPrivateKey,
        networkCtx: NetworkContext
    ): SimpleWallet_stellar {
        return new SimpleWallet_stellar(
            networkCtx,
            key.deriveSpendingKey(),
            key.deriveStakingKey()
        );
    }

    constructor(
        networkCtx: NetworkContext,
        spendingPrivateKey: Bip32PrivateKey,
        stakingPrivateKey: Bip32PrivateKey | undefined = undefined
    ) {
        this.networkCtx = networkCtx;
        this.spendingPrivateKey = spendingPrivateKey;
        this.spendingPubKey = this.spendingPrivateKey.derivePubKey();

        this.stakingPrivateKey = stakingPrivateKey;
        this.stakingPubKey = this.stakingPrivateKey?.derivePubKey();

        // TODO: staking credentials
    }

    get privateKey(): Bip32PrivateKey {
        return this.spendingPrivateKey;
    }

    get pubKey(): PubKey {
        return this.spendingPubKey;
    }

    get spendingPubKeyHash(): PubKeyHash {
        return this.spendingPubKey.hash();
    }

    get stakingPubKeyHash() {
        return this.stakingPubKey?.hash();
    }

    get address(): ShelleyAddress<PubKeyHash> {
        return makeAddress(
            this.cardanoClient.isMainnet(),
            this.spendingPubKeyHash,
            this.stakingPubKey?.hash()
        );
    }

    get stakingAddress() {
        if (this.stakingPubKey) {
            return makeStakingAddress(
                this.cardanoClient.isMainnet(),
                this.stakingPubKey.hash()
            );
        } else {
            return undefined;
        }
    }

    get stakingAddresses(): Promise<StakingAddress[]> {
        return new Promise((resolve, _) => {
            const stakingAddress = this.stakingAddress;

            resolve(stakingAddress ? [stakingAddress] : []);
        });
    }

    async isMainnet(): Promise<boolean> {
        return this.networkCtx.network.isMainnet();
    }

    /**
     * Assumed wallet was initiated with at least 1 UTxO at the pubkeyhash address.
     */
    get usedAddresses(): Promise<ShelleyAddress<PubKeyHash>[]> {
        return new Promise((resolve, _) => {
            resolve([this.address]);
        });
    }
    get unusedAddresses(): Promise<ShelleyAddress<PubKeyHash>[]> {
        return new Promise((resolve, _) => {
            resolve([]);
        });
    }
    get utxos(): Promise<TxInput<PubKeyHash>[]> {
        return new Promise((resolve, _) => {
            resolve(this.cardanoClient.getUtxos(this.address) as any);
        });
    }

    get collateral(): Promise<TxInput<PubKeyHash>[]> {
        return new Promise((resolve, _) => {
            resolve([]);
        });
    }

    /**
     * Not yet implemented.
     */
    async signData(addr: Address, message: number[]): Promise<Signature> {
        throw new Error("not yet implemented");
    }

    /**
     * Simply assumed the tx needs to by signed by this wallet without checking.
     */
    async signTx(tx: Tx): Promise<Signature[]> {
        return [this.spendingPrivateKey.sign(tx.body.hash())];
    }

    async submitTx(tx: Tx): Promise<TxId> {
        return await this.cardanoClient.submitTx(tx);
    }
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

let i = 1;
/**
 * A simple emulated Network.
 * This can be used to do integration tests of whole dApps.
 * Staking is not yet supported.
 * @public
 */
export class StellarNetworkEmulator implements Emulator {
    declare currentSlot: number;
    #seed: number;
    #random: NumberGenerator;
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
    _addressUtxos: Record<string, TxInput[]>

    id: number;
    params: NetworkParams;
    /**
     * Instantiates a NetworkEmulator at slot 0.
     * An optional seed number can be specified, from which all EMULATED RANDOMNESS is derived.
     */
    constructor(
        seed = 0,
        { params }: { params: NetworkParams } = {
            params: DEFAULT_NETWORK_PARAMS(),
        }
    ) {
        this.id = i++;
        this.params = params || DEFAULT_NETWORK_PARAMS();
        this.#seed = seed;
        this.currentSlot = 0;
        this.#random = this.mulberry32.bind(this);
        this.genesis = [];
        this.mempool = [];
        this.blocks = [];

        this._allUtxos = {};
        this._consumedUtxos = new Set();
        this._addressUtxos = {};

        this.initHelper();
    }
    isMainnet() {
        return false;
    }
    /**
     * Each slot is assumed to be 1000 milliseconds
     *
     * returns milliseconds since start of emulation
     */
    get now(): number {
        return SECOND * this.currentSlot;
    }

    get parameters(): Promise<NetworkParams> {
        return new Promise((resolve, _) => resolve(this.parametersSync));
    }

    get parametersSync() {
        return {
            ...this.params,
            refTipSlot: this.currentSlot,
            refTipTime: this.now,
        };
    }

    /**
     * retains continuity for the seed and the RNG through one or more snapshots.
     * @internal
     */
    mulberry32 = () => {
        //!!mutates vvvvvvvvvv this.#seed
        let t = (this.#seed += 0x6d2b79f5);

        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    netPHelper!: NetworkParamsHelper;
    initHelper() {
        this.netPHelper = makeNetworkParamsHelper(this.parametersSync);
        return this.netPHelper;
    }

    /**
     * Ignores the genesis txs
     */
    get txIds() : TxId[]{
        const res : TxId[] = []

        // TODO: the current approach is very slow, use a snapshot
        for (let block of this.blocks) {
            for (let tx of block) {
                if (tx.kind == "Regular") {
                    res.push(tx.id())
                }
            }
        }

        return res
    }


    snapshot(snapName: string): NetworkSnapshot {
        if (this.mempool.length > 0) {
            throw new Error(`can't snapshot with pending txns`);
        }
        console.log(
            "            📸 📸 📸   ████  📸 📸 📸  #" + this.id,
            ` - snapshot '${snapName}' at slot `,
            this.currentSlot.toString(),
            "height ",
            this.blocks.length
        );

        return {
            name: snapName,
            seed: this.#seed,
            netNumber: this.id,
            slot: this.currentSlot,
            genesis: [...this.genesis],
            blocks: [...this.blocks],
            allUtxos: { ...this._allUtxos },
            consumedUtxos: new Set(this._consumedUtxos),
            addressUtxos: Object.fromEntries(
                Object.entries(this._addressUtxos).map(([addr, utxoList]) => [
                    addr,
                    [...utxoList],
                ])
            ),
        };
    }


    fromSnapshot = "";
    loadSnapshot(snapshot: NetworkSnapshot) {
        this.#seed = snapshot.seed;
        this.currentSlot = snapshot.slot;
        this.genesis = [...snapshot.genesis];
        this.blocks = [...snapshot.blocks];
        this.fromSnapshot = snapshot.name;

        this._allUtxos = { ...snapshot.allUtxos };
        this._consumedUtxos = new Set(snapshot.consumedUtxos);
        // this._addressUtxos = { ...snapshot.addressUtxos };
        this._addressUtxos = Object.fromEntries(
            Object.entries(snapshot.addressUtxos).map(([addr, utxoList]) => [
                addr,
                [...utxoList],
            ])
        );

        this.initHelper();
        console.log(
            "            🌺🌺🌺 ████████  #" + this.id,
            ` - restored snapshot '${snapshot.name}' from #${snapshot.netNumber} at slot `,
            this.currentSlot.toString(),
            "height ",
            this.blocks.length
        );
    }

    // /**
    //  * Creates a new `NetworkParams` instance that has access to current slot
    //  * (so that the `Tx` validity range can be set automatically during `Tx.finalize()`).
    //  */
    // initNetworkParams(networkParams): NetworkParams {
    //     const raw = Object.assign({}, networkParams.raw);

    //     // raw.latestTip = {
    //     //     epoch: 0,
    //     //     hash: "",
    //     //     slot: 0,
    //     //     time: 0,
    //     // };

    //     return (this.#netParams = new NetworkParams(raw, () => {
    //         return this.currentSlot;
    //     }));
    // }

    /**
     * Creates a new SimpleWallet and populates it with a given lovelace quantity and assets.
     * Special genesis transactions are added to the emulated chain in order to create these assets.
     * @deprecated - use TestHelper.createWallet instead, enabling wallets to be transported to
     *     different networks (e.g. ones that have loaded snapshots from the original network).
     */
    createWallet(lovelace = 0n, assets = makeAssets([])): SimpleWallet_stellar {
        throw new Error("use TestHelper.createWallet instead");
    }

    /**
     * Creates a UTxO using a GenesisTx.  The txn doesn't need to balance or be signed.  It's magic.
     * @param wallet - the utxo is created at this wallet's address
     * @param lovelace - the lovelace amount to create
     * @param assets - other assets to include in the utxo
     */
    createUtxo(
        wallet: SimpleWallet,
        lovelace: bigint, 
        assets : Assets = makeAssets([])
    ): TxOutputId {
        if (lovelace != 0n || !assets.isZero()) {
            const tx = makeEmulatorGenesisTx(
                this.genesis.length,
                wallet.address,
                lovelace,
                assets
            );

            this.genesis.push(tx);
            this.mempool.push(tx);
            return makeTxOutputId(tx.id(), 0);
        } else {
            throw new Error("zero-value utxos not supported");
        }
    }

    // #netParams!: NetworkParams;
    // async getParameters() {
    //     if (this.#netParams) return this.#netParams;

    //     return this.initNetworkParams(
    //         new NetworkParams(rawNetworkEmulatorParams)
    //     );
    // }

    warnMempool() {
        if (this.mempool.length > 0) {
            console.error(
                "Warning: mempool not empty (hint: use 'network.tick()')"
            );
        }
    }

    /**
     * Throws an error if the UTxO isn't found
     */
    async getUtxo(id: TxOutputId): Promise<TxInput> {
        this.warnMempool();

        const utxo = this._allUtxos[id.toString()];

        if (!utxo) {
            throw new Error(`utxo with id ${id.toString()} doesn't exist`);
        } else {
            return utxo;
        }
    }

    async getUtxos(address : Address) : Promise<TxInput[]> {
        this.warnMempool();

        return this._addressUtxos[address.toString()] ?? [];
    }

    dump() {
        console.log(`${this.blocks.length} BLOCKS`);
        this.blocks.forEach((block, i) => {
            console.log(`${block.length} TXs in BLOCK ${i}`);
            for (let tx of block) {
                tx.dump();
            }
        });
    }

    isConsumed(utxo) {
        return (
            this._consumedUtxos.has(utxo.id.toString()) ||
            this.mempool.some((tx) => {
                return tx.consumes(utxo);
            })
        );
    }

    async submitTx(tx: Tx, logger?: UplcLogger) {
        this.warnMempool();

        if (!tx.isValidSlot(BigInt(this.currentSlot))) {
            throw new Error(
                `tx invalid (slot out of range, ${
                    this.currentSlot
                } not in ${tx.body
                    .getValidityTimeRange(this.parametersSync)
                    .toString()})`
            );
        }

        // make sure that each input exists
        if (
            !tx.body.inputs.every(
                (input) => input.id.toString() in this._allUtxos
            )
        ) {
            throw new Error("some inputs don't exist")
        }

        // make sure that each ref input exists
        if (
            !tx.body.refInputs.every(
                (input) => input.id.toString() in this._allUtxos
            )
        ) {
            throw new Error("some ref inputs don't exist")
        }

        // make sure that none of the inputs have been consumed before
        for (const input of tx.body.inputs) {
            if (this.isConsumed(input)) {
                throw new Error(
                    `## ${this.id}: input previously consumed:` + dumpAny(input)
                );
            }
        }

        this.mempool.push(makeEmulatorRegularTx(tx));
        if (logger) {
            logger.logPrint(
                `[EmuNet #${this.id}] +mempool txn = ${this.mempool.length}`
            );
        } else {
            console.log(
                `[EmuNet #${this.id}] +mempool txn = ${this.mempool.length}`
            );
        }
        return tx.id();
    }

    /**
     * Mint a block with the current mempool, and advance the slot by a number of slots.
     */
    tick(nSlots: IntLike) {
        const n = BigInt(nSlots);
        if (n < 1) throw new Error(`nSlots must be > 0, got ${n.toString()}`);

        const count = this.mempool.length;
        const height = this.blocks.length;

        this.currentSlot += Number(n);
        const time = new Date(
            Number(this.netPHelper.slotToTime(this.currentSlot))
        );

        if (this.mempool.length > 0) {
            this.pushBlock(this.mempool)

            this.mempool = [];

            console.log(`█  #${this.id} @ht=${height}`);
            console.log(
                `█${"▒".repeat(
                    count
                )} ${count} txns -> slot ${this.currentSlot.toString()} = ${formatDate(
                    time
                )}`
            );
        } else {
            console.log(
                `tick -> slot ${this.currentSlot.toString()} = ${formatDate(
                    time
                )} (no txns)`
            );
        }
    }


    /**
     * @internal
     */
    pushBlock(txs: EmulatorTx[]) {
        this.blocks.push(txs)

        // add all new utxos
        txs.forEach((tx) => {
            tx.newUtxos().forEach((utxo) => {
                const key = utxo.id.toString()
                this._allUtxos[key] = utxo

                const addr = utxo.address.toString()

                if (addr in this._addressUtxos) {
                    this._addressUtxos[addr].push(utxo)
                } else {
                    this._addressUtxos[addr] = [utxo]
                }
            })

            tx.consumedUtxos().forEach((utxo) => {
                this._consumedUtxos.add(utxo.id.toString())

                const addr = utxo.address.toString()

                if (addr in this._addressUtxos) {
                    this._addressUtxos[addr] = this._addressUtxos[addr].filter(
                        (inner) => !inner.isEqual(utxo)
                    )
                }
            })
        })
    }
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
