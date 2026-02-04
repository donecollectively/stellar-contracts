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
    /** Cache key inputs for debugging cache misses. REQT-1.2.11/whp4cvpk9e */
    cacheKeyInputs?: CacheKeyInputs;
    /** Original block count at capture time - used by children to correctly slice incremental blocks */
    capturedBlockCount?: number;
};

/**
 * Metadata for a registered snapshot, used to resolve parent chain and compute cache keys.
 * @public
 */
export type SnapshotRegistryEntry = {
    /** Parent snapshot name */
    parentSnapName: ParentSnapName;
    /** Resolver function to compute cache key inputs. Takes helper as explicit argument for correct lifetime (ARCH-8rqhpfy1ym). */
    resolveScriptDependencies?: (helper: unknown) => Promise<CacheKeyInputs>;
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
    /** Original block count at capture time - used by children to correctly slice incremental blocks */
    capturedBlockCount: number;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Resolves snapshot name aliases.
 * "bootstrapped" is a symbolic alias for "enabledDelegatesDeployed".
 * @internal
 */
function resolveSnapshotAlias(name: string): string {
    if (name === "bootstrapped") {
        return "enabledDelegatesDeployed";
    }
    return name;
}

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
 * Gets the transaction body from an EmulatorTx.
 * EmulatorRegularTxImpl wraps the Tx in _tx property, so body is at _tx.body.
 * @internal
 */
function getTxBody(tx: EmulatorTx): { inputs: TxInput[]; outputs: any[] } | null {
    // EmulatorRegularTxImpl stores tx in _tx property
    const innerTx = (tx as any)._tx;
    if (innerTx?.body) {
        return innerTx.body;
    }
    // Fallback for direct body access (shouldn't happen with current implementation)
    if ((tx as any).body) {
        return (tx as any).body;
    }
    return null;
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
            const body = getTxBody(tx);
            if (!body) {
                continue;
            }

            // Mark inputs as consumed
            for (const input of body.inputs) {
                consumeUtxo(input.id.toString());
            }

            // Add new outputs as UTxOs
            const txId = tx.id();
            const outputs = body.outputs;
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
    let processedTxCount = 0;
    let skippedTxCount = 0;
    let addedUtxoCount = 0;
    for (const block of incrementalBlocks) {
        for (const tx of block) {
            // Genesis transactions don't have body, skip them
            const body = getTxBody(tx);
            if (!body) {
                skippedTxCount++;
                continue;
            }

            processedTxCount++;
            // Mark inputs as consumed
            for (const input of body.inputs) {
                consumeUtxo(input.id.toString());
            }

            // Add new outputs as UTxOs
            const txId = tx.id();
            const outputs = body.outputs;
            for (let i = 0; i < outputs.length; i++) {
                const output = outputs[i];
                const utxo = makeTxInput(makeTxOutputId(txId, i), output);
                addUtxo(utxo);
                addedUtxoCount++;
            }
        }
    }
    console.log(`  [DIAG applyIncremental] processed ${processedTxCount} txs, skipped ${skippedTxCount}, added ${addedUtxoCount} UTxOs`);

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
     * @param snapshotName - The snapshot name to find
     * @param helper - The current helper instance, passed to resolvers for correct lifetime (ARCH-8rqhpfy1ym, REQT-3.2.3/97qa2f7m25)
     */
    async find(snapshotName: string, helper: unknown): Promise<CachedSnapshot | null> {
        const entry = this.getRegistryEntry(snapshotName);
        if (!entry) {
            console.warn(`SnapshotCache: no registry entry for '${snapshotName}'`);
            return null;
        }

        // Resolve parent chain first (needed for cache key computation)
        let parentPath: string | null = null;
        let parentHash: string | null = null;
        let parent: CachedSnapshot | null = null;

        if (entry.parentSnapName !== "genesis") {
            // Resolve alias (e.g., "bootstrapped" → "enabledDelegatesDeployed")
            const resolvedParentName = resolveSnapshotAlias(entry.parentSnapName);
            parent = await this.find(resolvedParentName, helper);
            if (!parent) {
                // Parent not in cache, can't resolve this snapshot
                console.log(`  [find:${snapshotName}] ❌ MISS: parent '${resolvedParentName}' not found`);
                return null;
            }
            parentPath = parent.path || null;
            parentHash = parent.snapshotHash;
            console.log(`  [find:${snapshotName}] parent '${resolvedParentName}' → hash=${parentHash?.slice(0, 12)}...`);
        } else {
            console.log(`  [find:${snapshotName}] genesis snapshot (no parent)`);
        }

        // Compute cache key BEFORE checking in-memory cache
        // Different seeds/configs produce different cache keys (REQT-1.2.10.3)
        let cacheKey: string;
        let inputs: CacheKeyInputs;
        if (entry.resolveScriptDependencies) {
            inputs = await entry.resolveScriptDependencies(helper);
            cacheKey = this.computeKey(parentHash, inputs);
            // Log key inputs for debugging
            const bundleNames = inputs.bundles.map(b => `${b.name}:${b.sourceHash?.slice(0, 8)}`).join(', ');
            const extraKeys = inputs.extra ? Object.keys(inputs.extra).join(',') : '';
            console.log(`  [find:${snapshotName}] cacheKey=${cacheKey} (bundles=[${bundleNames}], extra=[${extraKeys}])`);
        } else {
            // No resolver - use parent hash only (for simple snapshots)
            inputs = { bundles: [] };
            cacheKey = this.computeKey(parentHash, inputs);
            console.log(`  [find:${snapshotName}] cacheKey=${cacheKey} (no resolver, parent-only)`);
        }

        // Check in-memory cache with composite key (REQT-1.2.10.3)
        // Composite key ensures different seeds don't collide
        const mapKey = `${snapshotName}:${cacheKey}`;
        const cached = this.loadedSnapshots.get(mapKey);
        if (cached) {
            console.log(`  [find:${snapshotName}] ✅ HIT (in-memory)`);
            return cached;
        }
        console.log(`  [find:${snapshotName}] not in memory, checking disk...`);

        // Construct hierarchical path
        const snapshotDir = this.getSnapshotDir(cacheKey, snapshotName, parentPath);
        const cachePath = this.getSnapshotFilePath(snapshotDir);

        if (!existsSync(cachePath)) {
            console.log(`  [find:${snapshotName}] ❌ MISS: path not found: ${snapshotDir}`);
            return null;
        }
        console.log(`  [find:${snapshotName}] found on disk: ${snapshotDir}`)

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
            if (parent && serialized.parentHash) {
                console.log(`  [find:${snapshotName}] parentHash check: stored=${serialized.parentHash.slice(0, 12)}... vs parent.snapshotHash=${parent.snapshotHash.slice(0, 12)}...`);
                if (serialized.parentHash !== parent.snapshotHash) {
                    console.warn(`  [find:${snapshotName}] ❌ INVALID: parent hash mismatch - stored expects ${serialized.parentHash}, but parent has ${parent.snapshotHash}`);
                    return null; // Cache invalid, trigger rebuild
                }
                console.log(`  [find:${snapshotName}] ✅ parentHash matches`);
            }

            // Chain loading: apply incremental blocks to parent state (REQT-1.2.10.1, 1.2.10.2)
            if (parent) {
                // Save incremental blocks before concatenation
                const incrementalBlocks = thisSnapshot.blocks;
                const incrementalBlockCount = incrementalBlocks.length;
                const incrementalTxCount = incrementalBlocks.reduce((sum, block) => sum + block.length, 0);

                console.log(`  [DIAG chain-load] '${snapshotName}': ${incrementalBlockCount} incremental blocks, ${incrementalTxCount} txs`);
                console.log(`  [DIAG chain-load] parent '${parent.snapshot.name}' addressUtxos keys: ${Object.keys(parent.snapshot.addressUtxos).length}`);

                // Inherit genesis from parent (child snapshots store genesis: [] on disk)
                thisSnapshot.genesis = parent.snapshot.genesis;

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

                console.log(`  [DIAG chain-load] AFTER applyIncrementalBlocks: addressUtxos keys: ${Object.keys(addressUtxos).length}`);
                console.log(`  [DIAG chain-load] addressUtxos keys: ${Object.keys(addressUtxos).slice(0, 5).join(', ')}`);

                // Visual summary: [parent blocks/txns] + █ per tx (space between blocks)  # total
                const parentBlockCount = parent.snapshot.blocks.length;
                const parentTxCount = parent.snapshot.blocks.reduce((sum, block) => sum + block.length, 0);
                const incrementalViz = incrementalBlocks.map(block => "🌺" + "█".repeat(block.length)).join(" ");
                const totalBlockCount = thisSnapshot.blocks.length;
                // Pass parentBlockCount to emulator for display purposes
                thisSnapshot.parentBlockCount = parentBlockCount;
                console.log(`SnapshotCache: chain-loaded '${snapshotName}' [${parentBlockCount} blocks/${parentTxCount} txns] + ${incrementalViz || "(none)"}  # ${totalBlockCount}`);
            } else if (thisSnapshot.genesis.length > 0 && thisSnapshot.blocks.length === 0) {
                // Root snapshot: create genesis block from genesis txs (work unit 9gnevpjmpt)
                // UTxOs already built by rebuildUtxoIndexes(genesis, [])
                // blockHashes already loaded from disk - integrity check below will verify
                thisSnapshot.blocks = [thisSnapshot.genesis as EmulatorTx[]];
                const genesisViz = "🌒".repeat(thisSnapshot.genesis.length);
                console.log(`SnapshotCache: root-loaded '${snapshotName}' ${genesisViz}  # 1`);
            }

            // Verify snapshot integrity: computed block hash must match recorded snapshotHash (REQT-1.2.9.3.3)
            const verifyStart = performance.now();
            const computedHash = thisSnapshot.blockHashes.length > 0
                ? thisSnapshot.blockHashes[thisSnapshot.blockHashes.length - 1]
                : "genesis";
            console.log(`  [find:${snapshotName}] integrity check: computed=${computedHash.slice(0, 12)}... vs stored=${serialized.snapshotHash.slice(0, 12)}...`);
            if (computedHash !== serialized.snapshotHash) {
                console.warn(`  [find:${snapshotName}] ❌ INVALID: snapshot hash mismatch - computed ${computedHash}, recorded ${serialized.snapshotHash}`);
                return null; // Corruption or implementation bug, trigger rebuild
            }
            const verifyMs = (performance.now() - verifyStart).toFixed(2);

            console.log(`  [find:${snapshotName}] ✅ LOADED from ${cachePath} (${verifyMs}ms)`);

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

            // Load key-inputs.json if it exists (REQT-1.2.11.2/e79g49xyyj, REQT-1.2.11.3/hn8f6z92k0)
            let cacheKeyInputs: CacheKeyInputs | undefined;
            const keyInputsPath = join(snapshotDir, "key-inputs.json");
            if (existsSync(keyInputsPath)) {
                try {
                    const keyInputsContent = readFileSync(keyInputsPath, "utf-8");
                    cacheKeyInputs = JSON.parse(keyInputsContent) as CacheKeyInputs;
                } catch (keyInputsErr) {
                    console.warn(`SnapshotCache: failed to read key-inputs.json for '${snapshotName}':`, keyInputsErr);
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
                cacheKeyInputs,
                capturedBlockCount: serialized.capturedBlockCount,
            };
            // Use composite key for in-memory cache (REQT-1.2.10.3)
            this.loadedSnapshots.set(mapKey, result);
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
     * @param helper - The current helper instance, passed to resolvers for correct lifetime (ARCH-8rqhpfy1ym)
     */
    async store(snapshotName: string, cachedSnapshot: CachedSnapshot, helper: unknown): Promise<void> {
        const entry = this.getRegistryEntry(snapshotName);
        if (!entry) {
            throw new Error(`SnapshotCache: cannot store unregistered snapshot '${snapshotName}'`);
        }

        // Resolve parent to get path and block count
        let parentPath: string | null = null;
        let parentBlockCount = 0;

        if (entry.parentSnapName !== "genesis") {
            // Resolve alias (e.g., "bootstrapped" → "enabledDelegatesDeployed")
            const resolvedParentName = resolveSnapshotAlias(entry.parentSnapName);
            const parent = await this.find(resolvedParentName, helper);
            if (!parent) {
                throw new Error(`SnapshotCache: parent '${resolvedParentName}' not found for '${snapshotName}'`);
            }
            parentPath = parent.path || null;
            // Use capturedBlockCount if available (original live block count at parent's capture time)
            // This ensures we slice from the correct position in the live network
            parentBlockCount = parent.capturedBlockCount ?? parent.snapshot.blocks.length;
        }

        // Compute cache key using resolver
        let cacheKey: string;
        let cacheKeyInputs: CacheKeyInputs;
        if (entry.resolveScriptDependencies) {
            cacheKeyInputs = await entry.resolveScriptDependencies(helper);
            cacheKey = this.computeKey(cachedSnapshot.parentHash, cacheKeyInputs);
            const bundleNames = cacheKeyInputs.bundles.map(b => `${b.name}:${b.sourceHash?.slice(0, 8)}`).join(', ');
            console.log(`  [store:${snapshotName}] cacheKey=${cacheKey} (parentHash=${cachedSnapshot.parentHash?.slice(0, 12)}, bundles=[${bundleNames}])`);
        } else {
            cacheKeyInputs = { bundles: [] };
            cacheKey = this.computeKey(cachedSnapshot.parentHash, cacheKeyInputs);
            console.log(`  [store:${snapshotName}] cacheKey=${cacheKey} (parentHash=${cachedSnapshot.parentHash?.slice(0, 12)}, no resolver)`);
        }

        // Construct hierarchical path
        const snapshotDir = this.getSnapshotDir(cacheKey, snapshotName, parentPath);
        const cachePath = this.getSnapshotFilePath(snapshotDir);

        // Check if we're overwriting an existing snapshot
        if (existsSync(cachePath)) {
            try {
                const existing = JSON.parse(readFileSync(cachePath, "utf-8")) as SerializedCachedSnapshot;
                console.log(`  [store:${snapshotName}] ⚠️ OVERWRITING existing snapshot!`);
                console.log(`    old snapshotHash: ${existing.snapshotHash}`);
                console.log(`    new snapshotHash: ${cachedSnapshot.snapshotHash}`);
                console.log(`    old parentHash: ${existing.parentHash}`);
                console.log(`    new parentHash: ${cachedSnapshot.parentHash}`);
                if (existing.snapshotHash !== cachedSnapshot.snapshotHash) {
                    console.log(`    ❌ snapshotHash CHANGED - children with old parentHash will be orphaned!`);
                }
            } catch (e) {
                console.log(`  [store:${snapshotName}] ⚠️ OVERWRITING (couldn't read old): ${e}`);
            }
        } else {
            console.log(`  [store:${snapshotName}] creating new snapshot at ${snapshotDir}`);
        }

        // Ensure directory exists
        mkdirSync(snapshotDir, { recursive: true });

        // Create a copy of the snapshot for incremental serialization (REQT-1.2.5.1)
        const incrementalSnapshot = { ...cachedSnapshot.snapshot };

        // Record the original live block count BEFORE modifying (for children to use)
        const capturedBlockCount = cachedSnapshot.snapshot.blocks.length;

        if (entry.parentSnapName === "genesis") {
            // Root snapshot: store genesis only, no blocks (work unit 9gnevpjmpt)
            // Keep only the genesis block hash (blockHashes[0])
            const genesisBlockHash = cachedSnapshot.snapshot.blockHashes[0];
            if (!genesisBlockHash) {
                throw new Error(`Root snapshot '${snapshotName}' has no blockHashes - was tick() called after creating genesis UTxOs?`);
            }
            incrementalSnapshot.blocks = [];
            incrementalSnapshot.blockHashes = [genesisBlockHash];
            // Update snapshotHash to match the genesis block hash
            cachedSnapshot.snapshotHash = genesisBlockHash;
            // Update cachedSnapshot to reflect reconstituted state for in-memory cache
            // Children will use this to compute parentBlockCount correctly
            cachedSnapshot.snapshot.blocks = [cachedSnapshot.snapshot.genesis as EmulatorTx[]];
            cachedSnapshot.snapshot.blockHashes = [genesisBlockHash];
        } else {
            // Child snapshot: don't store genesis (inherited from root via parent chain)
            incrementalSnapshot.genesis = [];
            // Store only incremental blocks since parent (REQT-1.2.5.1, REQT-1.2.5.2)
            incrementalSnapshot.blocks = cachedSnapshot.snapshot.blocks.slice(parentBlockCount);
            incrementalSnapshot.blockHashes = cachedSnapshot.snapshot.blockHashes.slice(parentBlockCount);
        }

        // Serialize the incremental snapshot (stores only new transactions, not UTxO indexes)
        const serialized: SerializedCachedSnapshot = {
            snapshot: serializeSnapshot(incrementalSnapshot),
            namedRecords: cachedSnapshot.namedRecords,
            parentSnapName: cachedSnapshot.parentSnapName,
            parentHash: cachedSnapshot.parentHash,
            parentCacheKey: cachedSnapshot.parentCacheKey, // Deprecated but retained
            parentBlockCount,
            snapshotHash: cachedSnapshot.snapshotHash,
            capturedBlockCount,
        };

        const content = JSON.stringify(serialized, null, 2);
        writeFileSync(cachePath, content, "utf-8");

        // Write offchain.json if offchainData is provided and non-empty (REQT-1.2.12.1/020mbw1gqw, REQT-1.2.12.3/yd750dddgy)
        if (cachedSnapshot.offchainData && Object.keys(cachedSnapshot.offchainData).length > 0) {
            const offchainPath = join(snapshotDir, "offchain.json");
            writeFileSync(offchainPath, JSON.stringify(cachedSnapshot.offchainData, null, 2), "utf-8");
        }

        // Write key-inputs.json for debugging cache misses (REQT-1.2.11.1/vn0drr8d8s)
        const keyInputsPath = join(snapshotDir, "key-inputs.json");
        const bigIntReplacer = (_key: string, value: unknown) =>
            typeof value === "bigint" ? value.toString() : value;
        writeFileSync(keyInputsPath, JSON.stringify(cacheKeyInputs, bigIntReplacer, 2), "utf-8");

        // Store path, cacheKeyInputs, and capturedBlockCount on the cachedSnapshot for caller's use
        cachedSnapshot.path = snapshotDir;
        cachedSnapshot.cacheKeyInputs = cacheKeyInputs;
        cachedSnapshot.capturedBlockCount = capturedBlockCount;

        // Cache in memory using composite key (REQT-1.2.10.3)
        const mapKey = `${snapshotName}:${cacheKey}`;
        this.loadedSnapshots.set(mapKey, cachedSnapshot);

        const totalBlocks = cachedSnapshot.snapshot.blocks.length;
        const storedBlocks = incrementalSnapshot.blocks.length;
        console.log(`  [store:${snapshotName}] ✅ stored (${storedBlocks}/${totalBlocks} blocks, snapshotHash=${cachedSnapshot.snapshotHash.slice(0, 12)}...) -> ${snapshotDir.split('/').slice(-2).join('/')}/`);
    }

    /**
     * Checks if a cached snapshot exists for the given snapshot name.
     * Uses registry to compute expected path.
     * @param snapshotName - The snapshot name to check
     * @param helper - The current helper instance, passed to resolvers for correct lifetime (ARCH-8rqhpfy1ym)
     */
    async has(snapshotName: string, helper: unknown): Promise<boolean> {
        const cached = await this.find(snapshotName, helper);
        return cached !== null;
    }

    /**
     * Deletes a cached snapshot and all its children (REQT-1.2.9.4).
     * Uses recursive directory deletion.
     * @param snapshotName - The snapshot name to delete
     * @param helper - The current helper instance, passed to resolvers for correct lifetime (ARCH-8rqhpfy1ym)
     */
    async delete(snapshotName: string, helper: unknown): Promise<boolean> {
        const entry = this.getRegistryEntry(snapshotName);
        if (!entry) {
            return false;
        }

        // Find the snapshot to get its path
        const cached = await this.find(snapshotName, helper);
        if (!cached || !cached.path) {
            return false;
        }

        const deletedPath = cached.path;

        // Recursively delete the snapshot directory and all children
        if (existsSync(deletedPath)) {
            rmSync(deletedPath, { recursive: true, force: true });

            // Clear from in-memory cache: remove this snapshot and any children
            // Children have paths that start with the deleted path
            for (const [mapKey, cachedSnap] of this.loadedSnapshots.entries()) {
                if (cachedSnap.path && cachedSnap.path.startsWith(deletedPath)) {
                    this.loadedSnapshots.delete(mapKey);
                }
            }

            console.log(`SnapshotCache: deleted '${snapshotName}' and children at ${deletedPath}`);
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
