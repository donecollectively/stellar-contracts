import { blake2b } from "@helios-lang/crypto";
import { bytesToHex, encodeUtf8, hexToBytes } from "@helios-lang/codec-utils";
import { existsSync, mkdirSync, readFileSync, writeFileSync, utimesSync, statSync } from "fs";
import { dirname, join } from "path";
import type { NetworkSnapshot } from "./StellarNetworkEmulator.js";
import type { BundleCacheKeyInputs } from "../../helios/scriptBundling/HeliosScriptBundle.js";
import {
    type EmulatorGenesisTx,
    type EmulatorTx,
    makeEmulatorGenesisTx,
    makeEmulatorRegularTx,
} from "@helios-lang/tx-utils";
import { decodeTx, makeAddress, makeAssets, type TxInput, makeTxInput, makeTxOutputId, makeTxOutput, makeValue } from "@helios-lang/ledger";

/**
 * Inputs for computing a snapshot cache key.
 * @public
 */
export type CacheKeyInputs = {
    bundles: BundleCacheKeyInputs[];
    extra?: Record<string, unknown>;
};

/**
 * A snapshot stored in the cache, including metadata for chaining.
 * @public
 */
export type CachedSnapshot = {
    /** The network snapshot data */
    snapshot: NetworkSnapshot;
    /** Named records captured with this snapshot */
    namedRecords: Record<string, string>;
    /** Logical name of the parent snapshot, or null for root */
    parentName: string | null;
    /** Hash of the parent snapshot, or null for root */
    parentHash: string | null;
    /** Hash of this snapshot for use as parent in child snapshots */
    snapshotHash: string;
};

/**
 * Serialized genesis transaction.
 * @internal
 */
type SerializedGenesisTx = {
    id: number;
    address: string; // bech32
    lovelace: string; // bigint as string
    assets: Array<[string, Array<[string, string]>]>; // [[mph, [[name, qty]]]]
};

/**
 * Serialized transaction - either CBOR hex for regular tx or genesis tx data.
 * @internal
 */
type SerializedTx =
    | { type: "regular"; cbor: string }
    | { type: "genesis"; data: SerializedGenesisTx };

/**
 * Serialized block - array of serialized transactions.
 * @internal
 */
type SerializedBlock = SerializedTx[];

/**
 * JSON-serializable version of NetworkSnapshot.
 * @internal
 */
type SerializedSnapshot = {
    seed: number;
    netNumber: number;
    name: string;
    slot: number;
    blockHashes: string[];
    genesis: SerializedGenesisTx[];
    blocks: SerializedBlock[];
};

/**
 * JSON-serializable version of CachedSnapshot.
 * @internal
 */
type SerializedCachedSnapshot = {
    snapshot: SerializedSnapshot;
    namedRecords: Record<string, string>;
    parentName: string | null;
    parentHash: string | null;
    snapshotHash: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Gets a property or calls a method from an object, checking both the public interface and internal underscore-prefixed property.
 * @internal
 */
function getProp<T>(obj: any, name: string): T {
    // Try the public getter/method first
    const value = obj[name];
    if (typeof value === "function") {
        return value.call(obj);
    }
    if (value !== undefined) return value;
    // Fall back to underscore-prefixed internal property
    return obj[`_${name}`];
}

/**
 * Serializes a genesis transaction to JSON-safe format.
 * @internal
 */
function serializeGenesisTx(tx: EmulatorGenesisTx): SerializedGenesisTx {
    // Access properties - genesis tx stores index as _id (internal), id() returns TxId
    const txAny = tx as any;
    const id = txAny._id as number; // Genesis tx index, not TxId
    const address = getProp<any>(tx, "address");
    const lovelace = getProp<bigint>(tx, "lovelace");
    const txAssets = getProp<any>(tx, "assets");

    if (!address) {
        throw new Error(`Genesis tx ${id} has no address. Keys: ${Object.keys(tx).join(", ")}`);
    }

    const assets: Array<[string, Array<[string, string]>]> = [];
    if (txAssets && !txAssets.isZero()) {
        for (const mph of txAssets.getPolicies()) {
            const tokenList: Array<[string, string]> = [];
            for (const [tokenName, qty] of txAssets.getPolicyTokens(mph)) {
                tokenList.push([bytesToHex(tokenName), qty.toString()]);
            }
            assets.push([mph.toHex(), tokenList]);
        }
    }
    return {
        id,
        address: address.toBech32(),
        lovelace: lovelace.toString(),
        assets,
    };
}

/**
 * Deserializes a genesis transaction from JSON-safe format.
 * @internal
 */
function deserializeGenesisTx(data: SerializedGenesisTx): EmulatorGenesisTx {
    const assets = makeAssets();
    for (const [mphHex, tokens] of data.assets) {
        for (const [nameHex, qtyStr] of tokens) {
            assets.addComponent(mphHex, hexToBytes(nameHex), BigInt(qtyStr));
        }
    }
    return makeEmulatorGenesisTx(
        data.id,
        makeAddress(data.address),
        BigInt(data.lovelace),
        assets
    );
}

/**
 * Checks if a transaction is a genesis transaction.
 * @internal
 */
function isGenesisTx(tx: EmulatorTx): tx is EmulatorGenesisTx {
    // Genesis transactions have _id, _address, _lovelace, _assets
    // Regular transactions have _tx
    const txAny = tx as any;
    return "_address" in txAny || "_lovelace" in txAny;
}

/**
 * Serializes blocks (transactions) to serialized format.
 * Handles both regular and genesis transactions.
 * @internal
 */
function serializeBlocks(blocks: EmulatorTx[][]): SerializedBlock[] {
    return blocks.map(block =>
        block.map(tx => {
            if (isGenesisTx(tx)) {
                return { type: "genesis" as const, data: serializeGenesisTx(tx) };
            } else {
                // Regular transaction - get CBOR from wrapped tx
                const txAny = tx as any;
                const innerTx = txAny._tx || txAny;
                const cbor = innerTx.toCbor ? innerTx.toCbor() : tx.toCbor();
                return { type: "regular" as const, cbor: bytesToHex(cbor) };
            }
        })
    );
}

/**
 * Deserializes blocks from serialized format.
 * Handles both regular and genesis transactions.
 * @internal
 */
function deserializeBlocks(serializedBlocks: SerializedBlock[]): EmulatorTx[][] {
    return serializedBlocks.map(block =>
        block.map(serializedTx => {
            if (serializedTx.type === "genesis") {
                return deserializeGenesisTx(serializedTx.data);
            } else {
                return makeEmulatorRegularTx(decodeTx(hexToBytes(serializedTx.cbor)));
            }
        })
    );
}

/**
 * Rebuilds UTxO indexes from genesis and block transactions.
 * @internal
 */
function rebuildUtxoIndexes(
    genesis: EmulatorGenesisTx[],
    blocks: EmulatorTx[][]
): {
    allUtxos: Record<string, TxInput>;
    consumedUtxos: Set<string>;
    addressUtxos: Record<string, TxInput[]>;
} {
    const allUtxos: Record<string, TxInput> = {};
    const consumedUtxos = new Set<string>();
    const addressUtxos: Record<string, TxInput[]> = {};

    // Helper to add UTxO to indexes
    const addUtxo = (utxo: TxInput) => {
        const id = utxo.id.toString();
        allUtxos[id] = utxo;
        const addr = utxo.address.toBech32();
        if (!addressUtxos[addr]) {
            addressUtxos[addr] = [];
        }
        addressUtxos[addr].push(utxo);
    };

    // Helper to consume UTxO
    const consumeUtxo = (id: string) => {
        consumedUtxos.add(id);
        const utxo = allUtxos[id];
        if (utxo) {
            const addr = utxo.address.toBech32();
            if (addressUtxos[addr]) {
                addressUtxos[addr] = addressUtxos[addr].filter(u => u.id.toString() !== id);
            }
        }
    };

    // Process genesis transactions
    for (const tx of genesis) {
        const txId = getProp<any>(tx, "id"); // Can be a method or number
        const address = getProp<any>(tx, "address");
        const lovelace = getProp<bigint>(tx, "lovelace");
        const txAssets = getProp<any>(tx, "assets");
        const output = makeTxOutput(address, makeValue(lovelace, txAssets));
        // Use tx.id() to get the TxId if it's a method, otherwise construct from genesis index
        const outputId = typeof tx.id === "function"
            ? makeTxOutputId(tx.id(), 0)
            : makeTxOutputId(`${"0".repeat(64 - String(txId).length)}${txId}`, 0);
        const utxo = makeTxInput(outputId, output);
        addUtxo(utxo);
    }

    // Process block transactions (skip genesis - they're already processed above)
    for (const block of blocks) {
        for (const tx of block) {
            // Genesis transactions don't have body, skip them
            if (!("body" in tx) || !(tx as any).body) {
                continue;
            }

            // Mark inputs as consumed
            for (const input of (tx as any).body.inputs) {
                consumeUtxo(input.id.toString());
            }

            // Add new outputs as UTxOs
            const txId = tx.id();
            const outputs = (tx as any).body.outputs;
            for (let i = 0; i < outputs.length; i++) {
                const output = outputs[i];
                const utxo = makeTxInput(makeTxOutputId(txId, i), output);
                addUtxo(utxo);
            }
        }
    }

    return { allUtxos, consumedUtxos, addressUtxos };
}

/**
 * Serializes a NetworkSnapshot to JSON-safe format.
 * @internal
 */
function serializeSnapshot(snapshot: NetworkSnapshot): SerializedSnapshot {
    return {
        seed: snapshot.seed,
        netNumber: snapshot.netNumber,
        name: snapshot.name,
        slot: snapshot.slot,
        blockHashes: snapshot.blockHashes,
        genesis: snapshot.genesis.map(serializeGenesisTx),
        blocks: serializeBlocks(snapshot.blocks),
    };
}

/**
 * Deserializes a NetworkSnapshot from JSON-safe format.
 * Rebuilds UTxO indexes from transaction data.
 * @internal
 */
function deserializeSnapshot(data: SerializedSnapshot): NetworkSnapshot {
    const genesis = data.genesis.map(deserializeGenesisTx);
    const blocks = deserializeBlocks(data.blocks);
    const { allUtxos, consumedUtxos, addressUtxos } = rebuildUtxoIndexes(genesis, blocks);

    return {
        seed: data.seed,
        netNumber: data.netNumber,
        name: data.name,
        slot: data.slot,
        blockHashes: data.blockHashes,
        genesis,
        blocks,
        allUtxos,
        consumedUtxos,
        addressUtxos,
    };
}

/**
 * Manages on-disk caching of emulator snapshots.
 *
 * Snapshots are stored in `.stellar/emulator/<cacheKey>.json` and are keyed
 * by a hash of the parent snapshot + script dependencies + params.
 *
 * @public
 */
export class SnapshotCache {
    private cacheDir: string;

    constructor(projectRoot?: string) {
        const root = projectRoot || this.findProjectRoot();
        this.cacheDir = join(root, ".stellar", "emulator");
        this.ensureCacheDir();
    }

    /**
     * Walks up the directory tree to find package.json.
     * @internal
     */
    private findProjectRoot(): string {
        let dir = process.cwd();
        while (dir !== "/") {
            if (existsSync(join(dir, "package.json"))) {
                return dir;
            }
            dir = dirname(dir);
        }
        // Fall back to cwd if no package.json found
        return process.cwd();
    }

    /**
     * Ensures the cache directory exists.
     * @internal
     */
    private ensureCacheDir(): void {
        if (!existsSync(this.cacheDir)) {
            mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    /**
     * Computes a cache key from parent hash and cache key inputs.
     */
    computeKey(parentHash: string | null, inputs: CacheKeyInputs): string {
        // Use replacer to handle BigInt in params
        const replacer = (_key: string, value: unknown) =>
            typeof value === "bigint" ? value.toString() : value;
        const data = JSON.stringify({
            parent: parentHash,
            bundles: inputs.bundles,
            extra: inputs.extra,
        }, replacer);
        return bytesToHex(blake2b(encodeUtf8(data))).slice(0, 32); // Use first 32 chars for reasonable filename length
    }

    /**
     * Gets the file path for a cache key.
     * @internal
     */
    private getCachePath(cacheKey: string): string {
        return join(this.cacheDir, `${cacheKey}.json`);
    }

    /**
     * Looks up a cached snapshot by key.
     * Returns null on cache miss.
     * Touches the file if it's more than 1 day old.
     */
    async find(cacheKey: string): Promise<CachedSnapshot | null> {
        const cachePath = this.getCachePath(cacheKey);

        if (!existsSync(cachePath)) {
            return null;
        }

        try {
            // Touch file if older than 1 day to keep it fresh for cleanup
            const stats = statSync(cachePath);
            const age = Date.now() - stats.mtimeMs;
            if (age > ONE_DAY_MS) {
                const now = new Date();
                utimesSync(cachePath, now, now);
            }

            const content = readFileSync(cachePath, "utf-8");
            const serialized = JSON.parse(content) as SerializedCachedSnapshot;

            // Deserialize the snapshot (rebuilds UTxO indexes from transactions)
            const snapshot = deserializeSnapshot(serialized.snapshot);

            console.log(`SnapshotCache: loaded '${snapshot.name}' from ${cachePath}`);
            return {
                snapshot,
                namedRecords: serialized.namedRecords,
                parentName: serialized.parentName,
                parentHash: serialized.parentHash,
                snapshotHash: serialized.snapshotHash,
            };
        } catch (e) {
            console.warn(`SnapshotCache: failed to read ${cachePath}:`, e);
            return null;
        }
    }

    /**
     * Stores a snapshot with the given cache key.
     */
    async store(cacheKey: string, cachedSnapshot: CachedSnapshot): Promise<void> {
        const cachePath = this.getCachePath(cacheKey);
        this.ensureCacheDir();

        // Serialize the snapshot (stores transactions, not UTxO indexes)
        const serialized: SerializedCachedSnapshot = {
            snapshot: serializeSnapshot(cachedSnapshot.snapshot),
            namedRecords: cachedSnapshot.namedRecords,
            parentName: cachedSnapshot.parentName,
            parentHash: cachedSnapshot.parentHash,
            snapshotHash: cachedSnapshot.snapshotHash,
        };

        const content = JSON.stringify(serialized, null, 2);
        writeFileSync(cachePath, content, "utf-8");

        console.log(`SnapshotCache: stored ${cacheKey} -> ${cachePath}`);
    }

    /**
     * Checks if a cached snapshot exists for the given key.
     */
    has(cacheKey: string): boolean {
        return existsSync(this.getCachePath(cacheKey));
    }

    /**
     * Deletes a cached snapshot.
     */
    delete(cacheKey: string): boolean {
        const cachePath = this.getCachePath(cacheKey);
        if (existsSync(cachePath)) {
            const { unlinkSync } = require("fs");
            unlinkSync(cachePath);
            return true;
        }
        return false;
    }

    /**
     * Returns the cache directory path.
     */
    getCacheDir(): string {
        return this.cacheDir;
    }
}
