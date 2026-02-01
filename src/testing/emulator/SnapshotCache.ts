import { blake2b } from "@helios-lang/crypto";
import { bytesToHex, encodeUtf8 } from "@helios-lang/codec-utils";
import { existsSync, mkdirSync, readFileSync, writeFileSync, utimesSync, statSync } from "fs";
import { dirname, join } from "path";
import type { NetworkSnapshot } from "./StellarNetworkEmulator.js";
import type { BundleCacheKeyInputs } from "../../helios/scriptBundling/HeliosScriptBundle.js";

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
 * JSON-serializable version of CachedSnapshot.
 * @internal
 */
type SerializedCachedSnapshot = {
    snapshot: {
        seed: number;
        netNumber: number;
        name: string;
        slot: number;
        blockHashes: string[];
        // blocks/genesis/utxos serialized separately
    };
    namedRecords: Record<string, string>;
    parentHash: string | null;
    snapshotHash: string;
    // Full snapshot is complex - we store just the hash and rebuild from parent chain
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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
        const data = JSON.stringify({
            parent: parentHash,
            bundles: inputs.bundles,
            extra: inputs.extra,
        });
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
            const parsed = JSON.parse(content) as CachedSnapshot;
            console.log(`SnapshotCache: loaded '${parsed.snapshot.name}' from ${cachePath}`);
            return parsed;
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

        const content = JSON.stringify(cachedSnapshot, null, 2);
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
