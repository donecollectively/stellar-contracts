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
import { decodeTx, makeAddress, makeAssets, makeTxId, makeMintingPolicyHash, type TxInput, makeTxInput, makeTxOutputId, makeTxOutput, makeValue, type MintingPolicyHash } from "@helios-lang/ledger";

/**
 * Inputs for computing a snapshot cache key.
 * @public
 */
export type CacheKeyInputs = {
    bundles: BundleCacheKeyInputs[];
    extra?: Record<string, unknown>;
};

/**
 * Parent snapshot name - identifies which snapshot is the parent.
 * @public
 */
export type ParentSnapName =
    | "genesis"                     // root level (no parent)
    | "bootstrapWithActors"         // actors initialized
    | "capoInitialized"             // capo charter minted
    | "enabledDelegatesDeployed"    // delegates deployed
    | "bootstrapped"                // symbolic alias → "enabledDelegatesDeployed"
    | (string & {});                // custom snapshot name

/**
 * A snapshot stored in the cache, including metadata for chaining.
 * @public
 */
export type CachedSnapshot = {
    /** The network snapshot data */
    snapshot: NetworkSnapshot;
    /** Named records captured with this snapshot */
    namedRecords: Record<string, string>;
    /** Parent snapshot name ("genesis" for root) */
    parentSnapName: ParentSnapName;
    /** Hash of the parent snapshot—verified on load to detect stale cache (REQT-1.2.9.3.2), null for root */
    parentHash: string | null;
    /** Cache key of the parent snapshot for O(1 file lookup (REQT-1.2.9.3.1), null for root */
    parentCacheKey: string | null;
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
    parentSnapName: ParentSnapName;
    parentHash: string | null;
    /** Cache key of the parent snapshot for chain loading (REQT-1.2.9.3) */
    parentCacheKey: string | null;
    /** Number of blocks in parent snapshot, for incremental storage (REQT-1.2.5.1) */
    parentBlockCount: number;
    snapshotHash: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sanitizes a snapshot name for use in filenames.
 * - Keeps only alphanumeric, underscore, and hyphen characters
 * - Truncates to max 50 characters
 * @internal
 */
function sanitizeSnapshotName(name: string): string {
    // Replace any character that's not alphanumeric, underscore, or hyphen with underscore
    const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    // Truncate to 50 chars max
    return sanitized.slice(0, 50);
}

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
    // Build assets array in format expected by makeAssets: [[mph, [[tokenName, qty]]]]
    const assetsArray: [MintingPolicyHash, [number[], bigint][]][] = data.assets.map(
        ([mphHex, tokens]) => [
            makeMintingPolicyHash(mphHex),
            tokens.map(([nameHex, qtyStr]) => [
                [...hexToBytes(nameHex)],
                BigInt(qtyStr)
            ] as [number[], bigint])
        ]
    );
    const assets = makeAssets(assetsArray);
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
                // EmulatorRegularTx wraps a Tx internally in _tx property
                const innerTx = (tx as { _tx?: { toCbor(): number[] } })._tx;
                if (!innerTx) {
                    throw new Error(`EmulatorRegularTx missing internal _tx property`);
                }
                return { type: "regular" as const, cbor: bytesToHex(innerTx.toCbor()) };
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
        const addr = utxo.address.toString();
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
            const addr = utxo.address.toString();
            if (addressUtxos[addr]) {
                addressUtxos[addr] = addressUtxos[addr].filter(u => u.id.toString() !== id);
            }
        }
    };

    // Process genesis transactions
    // Genesis transactions always have exactly one output at index 0
    const genesisAlwaysSingleOutputIndex = 0;
    for (const tx of genesis) {
        const txId = getProp<any>(tx, "id"); // Can be a method or number
        const address = getProp<any>(tx, "address");
        const lovelace = getProp<bigint>(tx, "lovelace");
        const txAssets = getProp<any>(tx, "assets");
        const output = makeTxOutput(address, makeValue(lovelace, txAssets));
        // Use tx.id() to get the TxId if it's a method, otherwise construct from genesis index
        const outputId = typeof tx.id === "function"
            ? makeTxOutputId(tx.id(), genesisAlwaysSingleOutputIndex)
            : makeTxOutputId(makeTxId(`${"0".repeat(64 - String(txId).length)}${txId}`), genesisAlwaysSingleOutputIndex);
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
     * Gets the file path for a cache key and snapshot name.
     * Format: {sanitizedName}-{cacheKey}.json (REQT-1.2.9.1)
     * @internal
     */
    private getCachePath(cacheKey: string, snapshotName: string): string {
        const sanitizedName = sanitizeSnapshotName(snapshotName);
        return join(this.cacheDir, `${sanitizedName}-${cacheKey}.json`);
    }

    /**
     * Looks up a cached snapshot by key and snapshot name.
     * Returns null on cache miss.
     * Touches the file if it's more than 1 day old.
     * Recursively loads parent chain and concatenates blocks (REQT-1.2.5.1).
     */
    async find(cacheKey: string, snapshotName: string): Promise<CachedSnapshot | null> {
        const cachePath = this.getCachePath(cacheKey, snapshotName);

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

            // Deserialize the snapshot blocks stored in this file
            const thisSnapshot = deserializeSnapshot(serialized.snapshot);

            // Chain loading: if we have a parent, recursively load and concatenate (REQT-1.2.5.1, REQT-1.2.9.3)
            if (serialized.parentCacheKey && serialized.parentSnapName !== "genesis") {
                const parent = await this.find(serialized.parentCacheKey, serialized.parentSnapName);
                if (parent) {
                    // Verify parent hash matches expected (REQT-1.2.9.3.2)
                    if (serialized.parentHash && serialized.parentHash !== parent.snapshotHash) {
                        console.warn(`SnapshotCache: parent hash mismatch for '${snapshotName}': expected ${serialized.parentHash}, got ${parent.snapshotHash}`);
                        return null; // Cache invalid, trigger rebuild
                    }
                    // Concatenate parent blocks with this snapshot's incremental blocks
                    // Parent genesis + this genesis should be the same (genesis is immutable)
                    // Parent blocks + this incremental blocks = full chain
                    thisSnapshot.blocks = [...parent.snapshot.blocks, ...thisSnapshot.blocks];
                    // Parent blockHashes + this incremental blockHashes
                    thisSnapshot.blockHashes = [...parent.snapshot.blockHashes, ...thisSnapshot.blockHashes];

                    // Rebuild UTxO indexes from the full chain
                    const { allUtxos, consumedUtxos, addressUtxos } = rebuildUtxoIndexes(
                        thisSnapshot.genesis,
                        thisSnapshot.blocks
                    );
                    thisSnapshot.allUtxos = allUtxos;
                    thisSnapshot.consumedUtxos = consumedUtxos;
                    thisSnapshot.addressUtxos = addressUtxos;

                    console.log(`SnapshotCache: chain-loaded '${thisSnapshot.name}' (${thisSnapshot.blocks.length} blocks total)`);
                } else {
                    console.warn(`SnapshotCache: parent cache key ${serialized.parentCacheKey} not found, loading without parent`);
                }
            }

            console.log(`SnapshotCache: loaded '${thisSnapshot.name}' from ${cachePath}`);
            return {
                snapshot: thisSnapshot,
                namedRecords: serialized.namedRecords,
                parentSnapName: serialized.parentSnapName,
                parentHash: serialized.parentHash,
                parentCacheKey: serialized.parentCacheKey,
                snapshotHash: serialized.snapshotHash,
            };
        } catch (e) {
            console.warn(`SnapshotCache: failed to read ${cachePath}:`, e);
            return null;
        }
    }

    /**
     * Stores a snapshot with the given cache key.
     * Only stores incremental blocks since parent (REQT-1.2.5.1).
     * Extracts snapshot name from cachedSnapshot.snapshot.name.
     * @param cacheKey - The cache key for this snapshot
     * @param cachedSnapshot - The snapshot to store (must include parentCacheKey)
     * @param parentBlockCount - Number of blocks in the parent snapshot (for incremental storage)
     */
    async store(cacheKey: string, cachedSnapshot: CachedSnapshot, parentBlockCount: number = 0): Promise<void> {
        const snapshotName = cachedSnapshot.snapshot.name;
        const cachePath = this.getCachePath(cacheKey, snapshotName);
        this.ensureCacheDir();

        // Create a copy of the snapshot for incremental serialization (REQT-1.2.5.1)
        const incrementalSnapshot = { ...cachedSnapshot.snapshot };

        // Slice to only include blocks since the parent (REQT-1.2.5.1, REQT-1.2.5.2)
        incrementalSnapshot.blocks = cachedSnapshot.snapshot.blocks.slice(parentBlockCount);
        incrementalSnapshot.blockHashes = cachedSnapshot.snapshot.blockHashes.slice(parentBlockCount);

        // Serialize the incremental snapshot (stores only new transactions, not UTxO indexes)
        const serialized: SerializedCachedSnapshot = {
            snapshot: serializeSnapshot(incrementalSnapshot),
            namedRecords: cachedSnapshot.namedRecords,
            parentSnapName: cachedSnapshot.parentSnapName,
            parentHash: cachedSnapshot.parentHash,
            parentCacheKey: cachedSnapshot.parentCacheKey,
            parentBlockCount,
            snapshotHash: cachedSnapshot.snapshotHash,
        };

        const content = JSON.stringify(serialized, null, 2);
        writeFileSync(cachePath, content, "utf-8");

        const totalBlocks = cachedSnapshot.snapshot.blocks.length;
        const storedBlocks = incrementalSnapshot.blocks.length;
        console.log(`SnapshotCache: stored '${snapshotName}' (${storedBlocks}/${totalBlocks} blocks) -> ${cachePath}`);
    }

    /**
     * Checks if a cached snapshot exists for the given key and snapshot name.
     */
    has(cacheKey: string, snapshotName: string): boolean {
        return existsSync(this.getCachePath(cacheKey, snapshotName));
    }

    /**
     * Deletes a cached snapshot.
     */
    delete(cacheKey: string, snapshotName: string): boolean {
        const cachePath = this.getCachePath(cacheKey, snapshotName);
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
