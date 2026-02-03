import { blake2b } from "@helios-lang/crypto";
import { bytesToHex, encodeUtf8, hexToBytes } from "@helios-lang/codec-utils";
import { existsSync, mkdirSync, readFileSync, writeFileSync, utimesSync, statSync, rmSync } from "fs";
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
    | (string & Record<never, never>);  // custom snapshot name (preserves autocomplete for literals above)

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
    /** @deprecated With hierarchical directories, parent path is implicit. Retained as breadcrumb but MUST NOT be used for path construction (REQT-1.2.9.3.1) */
    parentCacheKey: string | null;
    /** Hash of this snapshot for use as parent in child snapshots */
    snapshotHash: string;
    /** Directory path where this snapshot is stored (set after find() or store()) */
    path?: string;
    /** Offchain data merged from parent chain - NOT included in cache key (e.g., actor wallet keys). REQT-1.2.12/mkap3784hw */
    offchainData?: Record<string, unknown>;
};

/**
 * Metadata for a registered snapshot, used to resolve parent chain and compute cache keys.
 * @public
 */
export type SnapshotRegistryEntry = {
    /** Parent snapshot name */
    parentSnapName: ParentSnapName;
    /** Resolver function to compute cache key inputs (must be pre-bound to helper instance) */
    resolveScriptDependencies?: () => Promise<CacheKeyInputs>;
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
 * Applies incremental blocks to existing UTxO state without rebuilding from genesis.
 * Used for efficient chain loading where parent state is already computed (REQT-1.2.10.1).
 * @internal
 */
function applyIncrementalBlocks(
    parentState: {
        allUtxos: Record<string, TxInput>;
        consumedUtxos: Set<string>;
        addressUtxos: Record<string, TxInput[]>;
    },
    incrementalBlocks: EmulatorTx[][]
): {
    allUtxos: Record<string, TxInput>;
    consumedUtxos: Set<string>;
    addressUtxos: Record<string, TxInput[]>;
} {
    // Clone parent state to avoid mutation
    const allUtxos: Record<string, TxInput> = { ...parentState.allUtxos };
    const consumedUtxos = new Set<string>(parentState.consumedUtxos);
    const addressUtxos: Record<string, TxInput[]> = {};

    // Deep clone addressUtxos arrays
    for (const [addr, utxos] of Object.entries(parentState.addressUtxos)) {
        addressUtxos[addr] = [...utxos];
    }

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

    // Process only the incremental blocks
    for (const block of incrementalBlocks) {
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
 * Snapshots are stored in `.stellar/emu/<cacheKey>.json` and are keyed
 * by a hash of the parent snapshot + script dependencies + params.
 *
 * @public
 */
export class SnapshotCache {
    private cacheDir: string;

    /** Registry of snapshot metadata for resolving parent chain and computing cache keys */
    private registry: Map<string, SnapshotRegistryEntry> = new Map();

    /**
     * Process-lifetime cache of loaded snapshots (REQT-1.2.10.3).
     * Avoids redundant disk reads and tx reconstruction across tests.
     */
    private loadedSnapshots: Map<string, CachedSnapshot> = new Map();

    constructor(projectRoot?: string) {
        const root = projectRoot || this.findProjectRoot();
        this.cacheDir = join(root, ".stellar", "emu");
        this.ensureCacheDir();
    }

    /**
     * Registers snapshot metadata for cache key computation and parent chain resolution.
     * NOTE: resolveScriptDependencies must be pre-bound to helper instance before registration.
     * @param snapshotName - The snapshot name to register
     * @param metadata - Parent snapshot name and optional resolver function
     * @public
     */
    register(snapshotName: string, metadata: SnapshotRegistryEntry): void {
        this.registry.set(snapshotName, metadata);
    }

    /**
     * Gets registered metadata for a snapshot name.
     * @internal
     */
    private getRegistryEntry(snapshotName: string): SnapshotRegistryEntry | undefined {
        return this.registry.get(snapshotName);
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
     * Gets the directory path for a snapshot.
     * Format: {parentPath}/{snapshotName}-{cacheKey}/ (REQT-1.2.9.1)
     * @param cacheKey - The cache key for this snapshot
     * @param snapshotName - The snapshot name
     * @param parentPath - Parent directory path, or null for root snapshots
     * @internal
     */
    private getSnapshotDir(cacheKey: string, snapshotName: string, parentPath: string | null): string {
        const sanitizedName = sanitizeSnapshotName(snapshotName);
        const dirName = `${sanitizedName}-${cacheKey}`;
        if (parentPath) {
            return join(parentPath, dirName);
        }
        return join(this.cacheDir, dirName);
    }

    /**
     * Gets the snapshot.json file path within a snapshot directory.
     * @internal
     */
    private getSnapshotFilePath(snapshotDir: string): string {
        return join(snapshotDir, "snapshot.json");
    }

    /**
     * Looks up a cached snapshot by name using registered metadata.
     * Resolves parent chain via registry, computes cache key, loads from hierarchical path.
     * Returns null on cache miss.
     * Touches the directory if it's more than 1 day old (REQT-1.2.7.1).
     * Verifies parentHash and snapshotHash for integrity (REQT-1.2.9.3.2, REQT-1.2.9.3.3).
     */
    async find(snapshotName: string): Promise<CachedSnapshot | null> {
        // Check in-memory cache first (REQT-1.2.10.3)
        // Within a single SnapshotCache instance, resolvers are deterministic,
        // so snapshot name maps to exactly one cache key.
        const cached = this.loadedSnapshots.get(snapshotName);
        if (cached) {
            return cached;
        }

        const entry = this.getRegistryEntry(snapshotName);
        if (!entry) {
            console.warn(`SnapshotCache: no registry entry for '${snapshotName}'`);
            return null;
        }

        // Resolve parent chain first
        let parentPath: string | null = null;
        let parentHash: string | null = null;
        let parent: CachedSnapshot | null = null;

        if (entry.parentSnapName !== "genesis") {
            parent = await this.find(entry.parentSnapName);
            if (!parent) {
                // Parent not in cache, can't resolve this snapshot
                return null;
            }
            parentPath = parent.path || null;
            parentHash = parent.snapshotHash;
        }

        // Compute cache key using resolver
        let cacheKey: string;
        if (entry.resolveScriptDependencies) {
            const inputs = await entry.resolveScriptDependencies();
            cacheKey = this.computeKey(parentHash, inputs);
        } else {
            // No resolver - use parent hash only (for simple snapshots)
            cacheKey = this.computeKey(parentHash, { bundles: [] });
        }

        // Construct hierarchical path
        const snapshotDir = this.getSnapshotDir(cacheKey, snapshotName, parentPath);
        const cachePath = this.getSnapshotFilePath(snapshotDir);

        if (!existsSync(cachePath)) {
            return null;
        }

        try {
            // Touch directory if older than 1 day to keep it fresh for cleanup (REQT-1.2.7.1)
            const stats = statSync(snapshotDir);
            const age = Date.now() - stats.mtimeMs;
            if (age > ONE_DAY_MS) {
                const now = new Date();
                utimesSync(snapshotDir, now, now);
            }

            const content = readFileSync(cachePath, "utf-8");
            const serialized = JSON.parse(content) as SerializedCachedSnapshot;

            // Deserialize the snapshot blocks stored in this file
            const thisSnapshot = deserializeSnapshot(serialized.snapshot);

            // Verify parent hash matches expected (REQT-1.2.9.3.2)
            if (parent && serialized.parentHash && serialized.parentHash !== parent.snapshotHash) {
                console.warn(`SnapshotCache: parent hash mismatch for '${snapshotName}': expected ${serialized.parentHash}, got ${parent.snapshotHash}`);
                return null; // Cache invalid, trigger rebuild
            }

            // Chain loading: apply incremental blocks to parent state (REQT-1.2.10.1, 1.2.10.2)
            if (parent) {
                // Save incremental blocks before concatenation
                const incrementalBlocks = thisSnapshot.blocks;
                const incrementalBlockCount = incrementalBlocks.length;

                // Concatenate block arrays for final snapshot
                thisSnapshot.blocks = [...parent.snapshot.blocks, ...incrementalBlocks];
                thisSnapshot.blockHashes = [...parent.snapshot.blockHashes, ...thisSnapshot.blockHashes];

                // Apply only incremental blocks to parent's UTxO state (not full rebuild)
                const { allUtxos, consumedUtxos, addressUtxos } = applyIncrementalBlocks(
                    {
                        allUtxos: parent.snapshot.allUtxos,
                        consumedUtxos: parent.snapshot.consumedUtxos,
                        addressUtxos: parent.snapshot.addressUtxos,
                    },
                    incrementalBlocks
                );
                thisSnapshot.allUtxos = allUtxos;
                thisSnapshot.consumedUtxos = consumedUtxos;
                thisSnapshot.addressUtxos = addressUtxos;

                console.log(`SnapshotCache: chain-loaded '${thisSnapshot.name}' (${thisSnapshot.blocks.length} total, ${incrementalBlockCount} incremental)`);
            }

            // Verify snapshot integrity: computed block hash must match recorded snapshotHash (REQT-1.2.9.3.3)
            const verifyStart = performance.now();
            const computedHash = thisSnapshot.blockHashes.length > 0
                ? thisSnapshot.blockHashes[thisSnapshot.blockHashes.length - 1]
                : "genesis";
            if (computedHash !== serialized.snapshotHash) {
                console.warn(`SnapshotCache: snapshot hash mismatch for '${snapshotName}': computed ${computedHash}, recorded ${serialized.snapshotHash}`);
                return null; // Corruption or implementation bug, trigger rebuild
            }
            const verifyMs = (performance.now() - verifyStart).toFixed(2);

            console.log(`SnapshotCache: loaded '${thisSnapshot.name}' from ${cachePath} (integrity check: ${verifyMs}ms)`);

            // Load and merge offchain data from parent chain (REQT-1.2.12.2/khqyf56m0g, REQT-1.2.12.4/0k6bnbbg95)
            let mergedOffchainData: Record<string, unknown> | undefined;

            // Start with parent's merged offchainData (if any)
            if (parent?.offchainData) {
                mergedOffchainData = { ...parent.offchainData };
            }

            // Load this snapshot's offchain.json if it exists (child keys override parent)
            const offchainPath = join(snapshotDir, "offchain.json");
            if (existsSync(offchainPath)) {
                try {
                    const offchainContent = readFileSync(offchainPath, "utf-8");
                    const thisOffchainData = JSON.parse(offchainContent) as Record<string, unknown>;
                    mergedOffchainData = { ...mergedOffchainData, ...thisOffchainData };
                } catch (offchainErr) {
                    console.warn(`SnapshotCache: failed to read offchain.json for '${snapshotName}':`, offchainErr);
                }
            }

            // Build result and cache before returning (REQT-1.2.10.3)
            const result: CachedSnapshot = {
                snapshot: thisSnapshot,
                namedRecords: serialized.namedRecords,
                parentSnapName: serialized.parentSnapName,
                parentHash: serialized.parentHash,
                parentCacheKey: serialized.parentCacheKey, // Deprecated but retained
                snapshotHash: serialized.snapshotHash,
                path: snapshotDir,
                offchainData: mergedOffchainData,
            };
            this.loadedSnapshots.set(snapshotName, result);
            return result;
        } catch (e) {
            console.warn(`SnapshotCache: failed to read ${cachePath}:`, e);
            return null;
        }
    }

    /**
     * Stores a snapshot using registered metadata to compute hierarchical path.
     * Only stores incremental blocks since parent (REQT-1.2.5.1).
     * @param snapshotName - The snapshot name (must be registered)
     * @param cachedSnapshot - The snapshot to store
     */
    async store(snapshotName: string, cachedSnapshot: CachedSnapshot): Promise<void> {
        const entry = this.getRegistryEntry(snapshotName);
        if (!entry) {
            throw new Error(`SnapshotCache: cannot store unregistered snapshot '${snapshotName}'`);
        }

        // Resolve parent to get path and block count
        let parentPath: string | null = null;
        let parentBlockCount = 0;

        if (entry.parentSnapName !== "genesis") {
            const parent = await this.find(entry.parentSnapName);
            if (!parent) {
                throw new Error(`SnapshotCache: parent '${entry.parentSnapName}' not found for '${snapshotName}'`);
            }
            parentPath = parent.path || null;
            parentBlockCount = parent.snapshot.blocks.length;
        }

        // Compute cache key using resolver
        let cacheKey: string;
        if (entry.resolveScriptDependencies) {
            const inputs = await entry.resolveScriptDependencies();
            cacheKey = this.computeKey(cachedSnapshot.parentHash, inputs);
        } else {
            cacheKey = this.computeKey(cachedSnapshot.parentHash, { bundles: [] });
        }

        // Construct hierarchical path
        const snapshotDir = this.getSnapshotDir(cacheKey, snapshotName, parentPath);
        const cachePath = this.getSnapshotFilePath(snapshotDir);

        // Ensure directory exists
        mkdirSync(snapshotDir, { recursive: true });

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
            parentCacheKey: cachedSnapshot.parentCacheKey, // Deprecated but retained
            parentBlockCount,
            snapshotHash: cachedSnapshot.snapshotHash,
        };

        const content = JSON.stringify(serialized, null, 2);
        writeFileSync(cachePath, content, "utf-8");

        // Write offchain.json if offchainData is provided and non-empty (REQT-1.2.12.1/020mbw1gqw, REQT-1.2.12.3/yd750dddgy)
        if (cachedSnapshot.offchainData && Object.keys(cachedSnapshot.offchainData).length > 0) {
            const offchainPath = join(snapshotDir, "offchain.json");
            writeFileSync(offchainPath, JSON.stringify(cachedSnapshot.offchainData, null, 2), "utf-8");
        }

        // Store path on the cachedSnapshot for caller's use
        cachedSnapshot.path = snapshotDir;

        const totalBlocks = cachedSnapshot.snapshot.blocks.length;
        const storedBlocks = incrementalSnapshot.blocks.length;
        console.log(`SnapshotCache: stored '${snapshotName}' (${storedBlocks}/${totalBlocks} blocks) -> ${cachePath}`);
    }

    /**
     * Checks if a cached snapshot exists for the given snapshot name.
     * Uses registry to compute expected path.
     */
    async has(snapshotName: string): Promise<boolean> {
        const cached = await this.find(snapshotName);
        return cached !== null;
    }

    /**
     * Deletes a cached snapshot and all its children (REQT-1.2.9.4).
     * Uses recursive directory deletion.
     */
    async delete(snapshotName: string): Promise<boolean> {
        const entry = this.getRegistryEntry(snapshotName);
        if (!entry) {
            return false;
        }

        // Find the snapshot to get its path
        const cached = await this.find(snapshotName);
        if (!cached || !cached.path) {
            return false;
        }

        // Recursively delete the snapshot directory and all children
        if (existsSync(cached.path)) {
            rmSync(cached.path, { recursive: true, force: true });
            console.log(`SnapshotCache: deleted '${snapshotName}' and children at ${cached.path}`);
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
