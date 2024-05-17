// import * as helios from "@hyperionbt/helios";

import {
    Assets,
    Bip32PrivateKey,
    Crypto,
    NetworkParams,
    TxId,
    TxInput,
    TxOutput,
    TxOutputId,
    Value,
    type NumberGenerator,
    //@ts-expect-error on internals
    bigIntToBytes, eq, rawNetworkEmulatorParams, type EmulatorTx, type Wallet,
    type Network,
    Address,
    StakeAddress,
    Signature,
    PubKey,
    PubKeyHash,
    Tx
} from "@hyperionbt/helios";
import { dumpAny } from "../diagnostics.js";
import type { NetworkContext } from "../StellarContract.js";

const isInternal = Symbol("isInternal");

class GenesisTx implements EmulatorTx{
    #id : number
    #address : Address
    #lovelace: bigint
    #assets: Assets

    constructor(
        id: number,
        address: Address,
        lovelace: bigint,
         assets: Assets
    ) {
        this.#id = id;
        this.#address = address;
        this.#lovelace = lovelace;
        this.#assets = assets;
    }

    /**
     * Simple incremental txId for genesis transactions.
     * It's very unlikely that regular transactions have the same hash.
     */
    id() {
        let bytes = bigIntToBytes(BigInt(this.#id));

        if (bytes.length < 32) {
            bytes = new Array(32 - bytes.length).fill(0).concat(bytes);
        }

        return new TxId(bytes);
    }

    consumes(utxo) {
        return false;
    }

    collectUtxos(address, utxos) {
        if (eq(this.#address.bytes, address.bytes)) {
            utxos = utxos.slice();

            utxos.push(
                new TxInput(
                    new TxOutputId(this.id(), 0),
                    new TxOutput(
                        this.#address,
                        new Value(this.#lovelace, this.#assets)
                    )
                )
            );

            return utxos;
        } else {
            return utxos;
        }
    }

    getUtxo(id) {
        if (!(this.id().eq(id.txId) && id.utxoIdx == 0)) {
            return null;
        }

        return new TxInput(
            new TxOutputId(this.id(), 0),
            new TxOutput(this.#address, new Value(this.#lovelace, this.#assets))
        );
    }

    dump() {
        console.log("GENESIS TX");
        console.log(
            `id: ${this.#id.toString()},\naddress: ${this.#address.toBech32()},\nlovelace: ${this.#lovelace.toString()},\nassets: ${JSON.stringify(
                this.#assets.dump(),
                undefined,
                "    "
            )}`
        );
    }
}

class RegularTx implements EmulatorTx {
    #tx: Tx;

    constructor(tx: Tx) {
        this.#tx = tx;
    }

    id() {
        return this.#tx.id();
    }

    consumes(utxo) {
        const txInputs = this.#tx.body.inputs;

        return txInputs.some((txInput) => txInput.eq(utxo));
    }

    collectUtxos(address, utxos) {
        utxos = utxos.filter((utxo) => !this.consumes(utxo));

        const txOutputs = this.#tx.body.outputs;

        txOutputs.forEach((txOutput, utxoId) => {
            if (eq(txOutput.address.bytes, address.bytes)) {
                utxos.push(
                    new TxInput(new TxOutputId(this.id(), utxoId), txOutput)
                );
            }
        });

        return utxos;
    }

    getUtxo(id) {
        if (!id.txId.eq(this.id())) {
            return null;
        }

        /**
         * @type {null | TxInput}
         */
        let utxo : null | TxInput = null;

        this.#tx.body.outputs.forEach((output, i) => {
            if (i == id.utxoIdx) {
                utxo = new TxInput(id, output);
            }
        });

        return utxo;
    }

    dump() {
        console.log("REGULAR TX");
        console.log(JSON.stringify(this.#tx.dump(), undefined, "  "));
    }
}

/**
 * This wallet only has a single private/public key, which isn't rotated. Staking is not yet supported.
 */
export class SimpleWallet_stellar implements Wallet{
    #networkCtx: NetworkContext;
    #privateKey: Bip32PrivateKey
    #pubKey: PubKey;

    get network() {
        return this.#networkCtx.network
    }

    constructor(networkCtx : NetworkContext, privateKey : Bip32PrivateKey) {
        this.#networkCtx = networkCtx;
        this.#privateKey = privateKey;
        this.#pubKey = this.#privateKey.derivePubKey();

        // TODO: staking credentials
    }


    get privateKey() : Bip32PrivateKey{
        return this.#privateKey;
    }

    get pubKey() : PubKey {
        return this.#pubKey;
    }

    get pubKeyHash() : PubKeyHash {
         return this.#pubKey.pubKeyHash;
    }

    get address() : Address{
        return Address.fromHash(this.pubKeyHash);
    }

    async isMainnet() : Promise<boolean>{
        return false;
    }

    /**
     * Not yet implemented.
     */
    get rewardAddresses() : Promise<StakeAddress[]> {
        throw new Error("not yet implemented")
    }

    /**
     * Assumed wallet was initiated with at least 1 UTxO at the pubkeyhash address.
     */
    get usedAddresses() : Promise<Address[]> {
        return new Promise((resolve, _) => {
            resolve([this.address])
        });
    }
    get unusedAddresses() : Promise<Address[]>{
        return new Promise((resolve, _) => {
            resolve([])
        });
    }
    get utxos() : Promise<TxInput[]>{
        return new Promise((resolve, _) => {
            resolve(this.network.getUtxos(this.address));
        });
    }

     get collateral() : Promise<TxInput[]>{
        return new Promise((resolve, _) => {
            resolve([])
        });
    }

    /**
     * Not yet implemented.
     */
    async signData(addr: Address, message: string) : Promise<{signature: string, key: string}> {
        throw new Error("not yet implemented")
    }

    /**
     * Simply assumed the tx needs to by signed by this wallet without checking.
     */
    async signTx(tx: Tx): Promise<Signature[]> {
        return [
            this.#privateKey.sign(tx.bodyHash)
        ];
    }

    async submitTx(tx: Tx) : Promise<TxId> {
        return await this.network.submitTx(tx);
    }
}


/**
 * Captures details from emulated network, to be used for quickly restoring a network state.
* @alpha
*/
export type NetworkSnapshot = {
    seed: number,
    netNumber: number,
    slot: bigint
    genesis: GenesisTx[],
    blocks: EmulatorTx[][]
}

let i = 1
/**
 * A simple emulated Network.
 * This can be used to do integration tests of whole dApps.
 * Staking is not yet supported. 
 * @alpha
 */
export class StellarNetworkEmulator implements Network{
    #slot : bigint
    #seed: number
    #random: NumberGenerator
    #genesis : GenesisTx[]
    #mempool: EmulatorTx[]
    #blocks: EmulatorTx[][]
    id : number
    /**
     * Instantiates a NetworkEmulator at slot 0.
     * An optional seed number can be specified, from which all emulated randomness is derived.
     */
    constructor(
        seed = 0,
    ) {
        this.id = i++
        this.#seed = seed
        this.#slot = 0n;
        this.#random = this.mulberry32.bind(this);
        this.#genesis = [];
        this.#mempool = [];
        this.#blocks = [];
    }

    // retains continuity for the seed and the RNG through one or more snapshots.
    mulberry32 = () => {
        let t = this.#seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    snapshot() : NetworkSnapshot {
        if (this.#mempool.length > 0) {
            throw new Error(`can't snapshot with pending txns`);
        }
        console.log("            📸 📸 📸   ████  📸 📸 📸  #"+this.id, "  - snapshot at slot ", this.#slot.toString(), "height ", this.#blocks.length)
        return { 
            seed: this.#seed, 
            netNumber: this.id,
            slot: this.#slot, 
            genesis: [ ... this.#genesis ],
            blocks: [ ... this.#blocks ]
        }
    }

    loadSnapshot(snapshot : NetworkSnapshot) {
        this.#seed = snapshot.seed;
        this.#slot = snapshot.slot;
        this.#genesis = [ ... snapshot.genesis ]
        this.#blocks = [ ... snapshot.blocks ]

        console.log("            🌺🌺🌺 ████████  #"+this.id,  ` - restored snapshot from #${snapshot.netNumber} at slot `, this.#slot.toString(), "height ", this.#blocks.length)
    }

    get currentSlot() : bigint{
        return this.#slot;
    }

    /**
     * Creates a new `NetworkParams` instance that has access to current slot
     * (so that the `Tx` validity range can be set automatically during `Tx.finalize()`).
     */
    initNetworkParams(networkParams) : NetworkParams{
        const raw = Object.assign({}, networkParams.raw);

        raw.latestTip = {
            epoch: 0,
            hash: "",
            slot: 0,
            time: 0,
        };

        return new NetworkParams(raw, () => {
            return this.#slot;
        });
    }

    /**
     * Creates a new SimpleWallet and populates it with a given lovelace quantity and assets.
     * Special genesis transactions are added to the emulated chain in order to create these assets.
     * @deprecated - use TestHelper.createWallet instead, enabling wallets to be transported to
     *     different networks (e.g. ones that have loaded snapshots from the original network).
     */
    createWallet(lovelace = 0n, assets = new Assets([])) {
        throw new Error("use TestHelper.createWallet instead")
    }

    /**
     * Creates a UTxO using a GenesisTx.  The txn doesn't need to balance or be signed.  It's magic.
     * @param wallet - the utxo is created at this wallet's address
     * @param lovelace - the lovelace amount to create
     * @param assets - other assets to include in the utxo
     */
    createUtxo(wallet, lovelace, assets = new Assets([])) {
        if (lovelace != 0n || !assets.isZero()) {
            const tx = new GenesisTx(
                this.#genesis.length,
                wallet.address,
                lovelace,
                assets
            );

            this.#genesis.push(tx);
            this.#mempool.push(tx);
        }
    }

    async getParameters() {
        return this.initNetworkParams(
            new NetworkParams(rawNetworkEmulatorParams)
        );
    }

    warnMempool() {
        if (this.#mempool.length > 0) {
            console.error(
                "Warning: mempool not empty (hint: use 'network.tick()')"
            );
        }
    }

    /**
     * Throws an error if the UTxO isn't found
     */
    async getUtxo(id) {
        this.warnMempool();

        for (let block of this.#blocks) {
            for (let tx of block) {
                const utxo = tx.getUtxo(id);
                if (utxo) {
                    return utxo;
                }
            }
        }

        throw new Error(`utxo with id ${id.toString()} doesn't exist`);
    }

    async getUtxos(address) {
        this.warnMempool();

        let utxos : TxInput[] = [];

        for (let block of this.#blocks) {
            for (let tx of block) {
                utxos = tx.collectUtxos(address, utxos);
            }
        }

        return utxos;
    }

    dump() {
        console.log(`${this.#blocks.length} BLOCKS`);
        this.#blocks.forEach((block, i) => {
            console.log(`${block.length} TXs in BLOCK ${i}`);
            for (let tx of block) {
                tx.dump();
            }
        });
    }

    isConsumed(utxo) {
        return (
            this.#blocks.some((b) => {
                return b.some((tx) => {
                    return tx.consumes(utxo);
                });
            }) ||
            this.#mempool.some((tx) => {
                return tx.consumes(utxo);
            })
        );
    }

    async submitTx(tx) {
        this.warnMempool();

        assert(
            tx.isValid(this.#slot),
            "tx invalid (not finalized or slot out of range)"
        );

        // make sure that none of the inputs have been consumed before
        for (const input of tx.body.inputs) {
            if (this.isConsumed(input)) {
                throw new Error(`## ${this.id}: input previously consumed:`+ dumpAny(input))
            }
        }

        this.#mempool.push(new RegularTx(tx));
        console.log("##"+this.id+": +mempool txn = ", this.#mempool.length)

        return tx.id();
    }

    /**
     * Mint a block with the current mempool, and advance the slot by a number of slots.
     */
    tick(nSlots: bigint | number) {
        const n = BigInt(nSlots);
        assert(n> 0, `nSlots must be > 0, got ${n.toString()}`);

        const count = this.#mempool.length;
        const height = this.#blocks.length;
        if (this.#mempool.length > 0) {
            this.#blocks.push(this.#mempool);

            this.#mempool = [];
        }

        this.#slot += n;
        console.log("█  #"+this.id)
        console.log("██")
        console.log("███")
        console.log(`████  @h=${height} + ${count}  txns`)
        console.log(`█████ -> slot ${this.#slot.toString()}`)
    }

}
