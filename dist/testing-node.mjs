import { dumpAny as dumpAny$1, TxBatcher, GenericSigner, UtxoHelper, txAsString as txAsString$1, lovelaceToAda as lovelaceToAda$1, StellarTxnContext as StellarTxnContext$1, parseCapoJSONConfig, CapoWithoutSettings } from '@donecollectively/stellar-contracts';
import { VERSION } from '@helios-lang/compiler';
import { blake2b, encodeBech32, generateBytes, mulberry32 } from '@helios-lang/crypto';
import { encodeUtf8, hexToBytes, bytesToHex, decodeUtf8, isValidUtf8 } from '@helios-lang/codec-utils';
import { existsSync, mkdirSync, statSync, utimesSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { makeEmulatorGenesisTx, makeEmulatorRegularTx, makeTxBuilder, makeTxChainBuilder, makeWalletHelper, BIP39_DICT_EN, restoreRootPrivateKey, signCip30CoseData, SECOND, makeRootPrivateKey, makeBip32PrivateKey } from '@helios-lang/tx-utils';
import { makeTxInput, makeTxOutputId, makeMintingPolicyHash, makeAssets, makeAddress, decodeTx, makeTxOutput, makeValue, makeTxId, makeNetworkParamsHelper, makeStakingAddress, DEFAULT_NETWORK_PARAMS } from '@helios-lang/ledger';
import { customAlphabet } from 'nanoid';
import { makeByteArrayData } from '@helios-lang/uplc';
import { expectDefined } from '@helios-lang/type-utils';
import { describe, it, beforeEach } from 'vitest';

const ONE_DAY_MS = 24 * 60 * 60 * 1e3;
function resolveSnapshotAlias(name) {
  if (name === "bootstrapped") {
    return "enabledDelegatesDeployed";
  }
  return name;
}
function sanitizeSnapshotName(name) {
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  return sanitized.slice(0, 50);
}
function getProp(obj, name) {
  const value = obj[name];
  if (typeof value === "function") {
    return value.call(obj);
  }
  if (value !== void 0) return value;
  return obj[`_${name}`];
}
function serializeGenesisTx(tx) {
  const txAny = tx;
  const id = txAny._id;
  const address = getProp(tx, "address");
  const lovelace = getProp(tx, "lovelace");
  const txAssets = getProp(tx, "assets");
  if (!address) {
    throw new Error(`Genesis tx ${id} has no address. Keys: ${Object.keys(tx).join(", ")}`);
  }
  const assets = [];
  if (txAssets && !txAssets.isZero()) {
    for (const mph of txAssets.getPolicies()) {
      const tokenList = [];
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
    assets
  };
}
function deserializeGenesisTx(data) {
  const assetsArray = data.assets.map(
    ([mphHex, tokens]) => [
      makeMintingPolicyHash(mphHex),
      tokens.map(([nameHex, qtyStr]) => [
        [...hexToBytes(nameHex)],
        BigInt(qtyStr)
      ])
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
function isGenesisTx(tx) {
  const txAny = tx;
  return "_address" in txAny || "_lovelace" in txAny;
}
function serializeBlocks(blocks) {
  return blocks.map(
    (block) => block.map((tx) => {
      if (isGenesisTx(tx)) {
        return { type: "genesis", data: serializeGenesisTx(tx) };
      } else {
        const innerTx = tx._tx;
        if (!innerTx) {
          throw new Error(`EmulatorRegularTx missing internal _tx property`);
        }
        return { type: "regular", cbor: bytesToHex(innerTx.toCbor()) };
      }
    })
  );
}
function deserializeBlocks(serializedBlocks) {
  return serializedBlocks.map(
    (block) => block.map((serializedTx) => {
      if (serializedTx.type === "genesis") {
        return deserializeGenesisTx(serializedTx.data);
      } else {
        return makeEmulatorRegularTx(decodeTx(hexToBytes(serializedTx.cbor)));
      }
    })
  );
}
function getTxBody(tx) {
  const innerTx = tx._tx;
  if (innerTx?.body) {
    return innerTx.body;
  }
  if (tx.body) {
    return tx.body;
  }
  return null;
}
function rebuildUtxoIndexes(genesis, blocks) {
  const allUtxos = {};
  const consumedUtxos = /* @__PURE__ */ new Set();
  const addressUtxos = {};
  const addUtxo = (utxo) => {
    const id = utxo.id.toString();
    allUtxos[id] = utxo;
    const addr = utxo.address.toString();
    if (!addressUtxos[addr]) {
      addressUtxos[addr] = [];
    }
    addressUtxos[addr].push(utxo);
  };
  const consumeUtxo = (id) => {
    consumedUtxos.add(id);
    const utxo = allUtxos[id];
    if (utxo) {
      const addr = utxo.address.toString();
      if (addressUtxos[addr]) {
        addressUtxos[addr] = addressUtxos[addr].filter((u) => u.id.toString() !== id);
      }
    }
  };
  const genesisAlwaysSingleOutputIndex = 0;
  for (const tx of genesis) {
    const txId = getProp(tx, "id");
    const address = getProp(tx, "address");
    const lovelace = getProp(tx, "lovelace");
    const txAssets = getProp(tx, "assets");
    const output = makeTxOutput(address, makeValue(lovelace, txAssets));
    const outputId = typeof tx.id === "function" ? makeTxOutputId(tx.id(), genesisAlwaysSingleOutputIndex) : makeTxOutputId(makeTxId(`${"0".repeat(64 - String(txId).length)}${txId}`), genesisAlwaysSingleOutputIndex);
    const utxo = makeTxInput(outputId, output);
    addUtxo(utxo);
  }
  for (const block of blocks) {
    for (const tx of block) {
      const body = getTxBody(tx);
      if (!body) {
        continue;
      }
      for (const input of body.inputs) {
        consumeUtxo(input.id.toString());
      }
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
function applyIncrementalBlocks(parentState, incrementalBlocks) {
  const allUtxos = { ...parentState.allUtxos };
  const consumedUtxos = new Set(parentState.consumedUtxos);
  const addressUtxos = {};
  for (const [addr, utxos] of Object.entries(parentState.addressUtxos)) {
    addressUtxos[addr] = [...utxos];
  }
  const addUtxo = (utxo) => {
    const id = utxo.id.toString();
    allUtxos[id] = utxo;
    const addr = utxo.address.toString();
    if (!addressUtxos[addr]) {
      addressUtxos[addr] = [];
    }
    addressUtxos[addr].push(utxo);
  };
  const consumeUtxo = (id) => {
    consumedUtxos.add(id);
    const utxo = allUtxos[id];
    if (utxo) {
      const addr = utxo.address.toString();
      if (addressUtxos[addr]) {
        addressUtxos[addr] = addressUtxos[addr].filter((u) => u.id.toString() !== id);
      }
    }
  };
  let processedTxCount = 0;
  let skippedTxCount = 0;
  let addedUtxoCount = 0;
  for (const block of incrementalBlocks) {
    for (const tx of block) {
      const body = getTxBody(tx);
      if (!body) {
        skippedTxCount++;
        continue;
      }
      processedTxCount++;
      for (const input of body.inputs) {
        consumeUtxo(input.id.toString());
      }
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
function serializeSnapshot(snapshot) {
  return {
    seed: snapshot.seed,
    netNumber: snapshot.netNumber,
    name: snapshot.name,
    slot: snapshot.slot,
    blockHashes: snapshot.blockHashes,
    genesis: snapshot.genesis.map(serializeGenesisTx),
    blocks: serializeBlocks(snapshot.blocks)
  };
}
function deserializeSnapshot(data) {
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
    addressUtxos
  };
}
class SnapshotCache {
  /** REQT/7k3mfpw2nx (Cache files stored in .stellar/emu/) */
  cacheDir;
  /** Registry of snapshot metadata for resolving parent chain and computing cache keys */
  registry = /* @__PURE__ */ new Map();
  /**
   * helperState-scope cache of loaded snapshots (REQT/j9adgp9rwv).
   * Avoids redundant disk reads and tx reconstruction across tests sharing the same SnapshotCache.
   */
  loadedSnapshots = /* @__PURE__ */ new Map();
  constructor(projectRoot) {
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
  register(snapshotName, metadata) {
    this.registry.set(snapshotName, metadata);
  }
  /**
   * Gets registered metadata for a snapshot name.
   * Resolves aliases (e.g., "bootstrapped" → "enabledDelegatesDeployed") before lookup.
   * @internal
   */
  getRegistryEntry(snapshotName) {
    const resolvedName = resolveSnapshotAlias(snapshotName);
    return this.registry.get(resolvedName);
  }
  /**
   * Walks up the directory tree to find package.json.
   * @internal
   */
  findProjectRoot() {
    let dir = process.cwd();
    while (dir !== "/") {
      if (existsSync(join(dir, "package.json"))) {
        return dir;
      }
      dir = dirname(dir);
    }
    return process.cwd();
  }
  /**
   * Ensures the cache directory exists.
   * @internal
   */
  ensureCacheDir() {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }
  /**
   * Computes a cache key from parent hash and cache key inputs.
   * Returns 6 bech32 characters (~1 billion combinations, sufficient for uniqueness).
   * (ARCH-14zt4f9rtg)
   */
  computeKey(parentHash, inputs) {
    const replacer = (_key, value) => typeof value === "bigint" ? value.toString() : value;
    const data = JSON.stringify({
      parent: parentHash,
      bundles: inputs.bundles,
      extra: inputs.extra
    }, replacer);
    const hashBytes = blake2b(encodeUtf8(data));
    const bech32Str = encodeBech32("snap", hashBytes);
    return bech32Str.slice(-6);
  }
  /**
   * Gets the directory path for a snapshot.
   * Format: {parentPath}/{snapshotName}-{dirLabel}-{cacheKey}/ (REQT/d230hkb6vm)
   * Note: Empty label produces double-dash (--) which is valid and visually distinct.
   * @param cacheKey - The cache key for this snapshot (6 bech32 chars)
   * @param snapshotName - The snapshot name
   * @param parentPath - Parent directory path, or null for root snapshots
   * @param dirLabel - Optional human-readable label from computeDirLabel (default: "")
   * @internal
   */
  getSnapshotDir(cacheKey, snapshotName, parentPath, dirLabel = "") {
    const sanitizedName = sanitizeSnapshotName(snapshotName);
    const sanitizedLabel = sanitizeSnapshotName(dirLabel);
    const dirName = `${sanitizedName}-${sanitizedLabel}-${cacheKey}`;
    if (parentPath) {
      return join(parentPath, dirName);
    }
    return join(this.cacheDir, dirName);
  }
  /**
   * Gets the snapshot.json file path within a snapshot directory.
   * @internal
   */
  getSnapshotFilePath(snapshotDir) {
    return join(snapshotDir, "snapshot.json");
  }
  /**
   * Looks up a cached snapshot by name using registered metadata.
   * Resolves parent chain via registry, computes cache key, loads from hierarchical path.
   * Returns null on cache miss.
   * Touches the directory if it's more than 1 day old (REQT/m1d6jk9w3p).
   * Verifies parentHash and snapshotHash for integrity (REQT/rgxhbqp84g, REQT/q6f457kp86).
   * @param snapshotName - The snapshot name to find
   * @param helper - The current helper instance, passed to resolvers for correct lifetime (ARCH-8rqhpfy1ym, REQT/97qa2f7m25)
   */
  async find(snapshotName, helper) {
    const resolvedName = resolveSnapshotAlias(snapshotName);
    if (resolvedName !== snapshotName) {
      console.log(`  [find] alias '${snapshotName}' \u2192 '${resolvedName}'`);
    }
    snapshotName = resolvedName;
    const entry = this.getRegistryEntry(snapshotName);
    if (!entry) {
      console.warn(`SnapshotCache: no registry entry for '${snapshotName}'`);
      return null;
    }
    let parentPath = null;
    let parentHash = null;
    let parent = null;
    if (entry.parentSnapName !== "genesis") {
      const resolvedParentName = resolveSnapshotAlias(entry.parentSnapName);
      parent = await this.find(resolvedParentName, helper);
      if (!parent) {
        console.log(`  [find:${snapshotName}] \u274C MISS: parent '${resolvedParentName}' not found`);
        return null;
      }
      parentPath = parent.path || null;
      parentHash = parent.snapshotHash;
      console.log(`  [find:${snapshotName}] parent '${resolvedParentName}' \u2192 hash=${parentHash?.slice(0, 12)}...`);
    } else {
      console.log(`  [find:${snapshotName}] genesis snapshot (no parent)`);
    }
    let cacheKey;
    let inputs;
    if (entry.resolveScriptDependencies) {
      inputs = await entry.resolveScriptDependencies(helper);
      cacheKey = this.computeKey(parentHash, inputs);
      const bundleNames = inputs.bundles.map((b) => `${b.name}:${b.sourceHash?.slice(0, 8)}`).join(", ");
      const extraKeys = inputs.extra ? Object.keys(inputs.extra).join(",") : "";
      console.log(`  [find:${snapshotName}] cacheKey=${cacheKey} (bundles=[${bundleNames}], extra=[${extraKeys}])`);
    } else {
      inputs = { bundles: [] };
      cacheKey = this.computeKey(parentHash, inputs);
      console.log(`  [find:${snapshotName}] cacheKey=${cacheKey} (no resolver, parent-only)`);
    }
    const dirLabel = entry.computeDirLabel ? entry.computeDirLabel(inputs) : "";
    const mapKey = `${snapshotName}:${cacheKey}`;
    const cached = this.loadedSnapshots.get(mapKey);
    if (cached) {
      console.log(`  [find:${snapshotName}] \u2705 HIT (in-memory)`);
      return cached;
    }
    console.log(`  [find:${snapshotName}] not in memory, checking disk...`);
    const snapshotDir = this.getSnapshotDir(cacheKey, snapshotName, parentPath, dirLabel);
    const cachePath = this.getSnapshotFilePath(snapshotDir);
    if (!existsSync(cachePath)) {
      console.log(`  [find:${snapshotName}] \u274C MISS: path not found: ${snapshotDir}`);
      return null;
    }
    console.log(`  [find:${snapshotName}] found on disk: ${snapshotDir}`);
    try {
      const stats = statSync(snapshotDir);
      const age = Date.now() - stats.mtimeMs;
      if (age > ONE_DAY_MS) {
        const now = /* @__PURE__ */ new Date();
        utimesSync(snapshotDir, now, now);
      }
      const content = readFileSync(cachePath, "utf-8");
      const serialized = JSON.parse(content);
      const thisSnapshot = deserializeSnapshot(serialized.snapshot);
      if (parent && serialized.parentHash) {
        console.log(`  [find:${snapshotName}] parentHash check: stored=${serialized.parentHash.slice(0, 12)}... vs parent.snapshotHash=${parent.snapshotHash.slice(0, 12)}...`);
        if (serialized.parentHash !== parent.snapshotHash) {
          console.warn(`  [find:${snapshotName}] \u274C INVALID: parent hash mismatch - stored expects ${serialized.parentHash}, but parent has ${parent.snapshotHash}`);
          return null;
        }
        console.log(`  [find:${snapshotName}] \u2705 parentHash matches`);
      }
      if (parent) {
        const incrementalBlocks = thisSnapshot.blocks;
        const incrementalBlockCount = incrementalBlocks.length;
        const incrementalTxCount = incrementalBlocks.reduce((sum, block) => sum + block.length, 0);
        console.log(`  [DIAG chain-load] '${snapshotName}': ${incrementalBlockCount} incremental blocks, ${incrementalTxCount} txs`);
        console.log(`  [DIAG chain-load] parent '${parent.snapshot.name}' addressUtxos keys: ${Object.keys(parent.snapshot.addressUtxos).length}`);
        thisSnapshot.genesis = parent.snapshot.genesis;
        thisSnapshot.blocks = [...parent.snapshot.blocks, ...incrementalBlocks];
        thisSnapshot.blockHashes = [...parent.snapshot.blockHashes, ...thisSnapshot.blockHashes];
        const { allUtxos, consumedUtxos, addressUtxos } = applyIncrementalBlocks(
          {
            allUtxos: parent.snapshot.allUtxos,
            consumedUtxos: parent.snapshot.consumedUtxos,
            addressUtxos: parent.snapshot.addressUtxos
          },
          incrementalBlocks
        );
        thisSnapshot.allUtxos = allUtxos;
        thisSnapshot.consumedUtxos = consumedUtxos;
        thisSnapshot.addressUtxos = addressUtxos;
        console.log(`  [DIAG chain-load] AFTER applyIncrementalBlocks: addressUtxos keys: ${Object.keys(addressUtxos).length}`);
        console.log(`  [DIAG chain-load] addressUtxos keys: ${Object.keys(addressUtxos).slice(0, 5).join(", ")}`);
        const parentBlockCount = parent.snapshot.blocks.length;
        const parentTxCount = parent.snapshot.blocks.reduce((sum, block) => sum + block.length, 0);
        const incrementalViz = incrementalBlocks.map((block) => "\u{1F33A}" + "\u2588".repeat(block.length)).join(" ");
        const totalBlockCount = thisSnapshot.blocks.length;
        thisSnapshot.parentBlockCount = parentBlockCount;
        console.log(`SnapshotCache: chain-loaded '${snapshotName}' [${parentBlockCount} blocks/${parentTxCount} txns] + ${incrementalViz || "(none)"}  # ${totalBlockCount}`);
      } else if (thisSnapshot.genesis.length > 0 && thisSnapshot.blocks.length === 0) {
        thisSnapshot.blocks = [thisSnapshot.genesis];
        const genesisViz = "\u{1F312}".repeat(thisSnapshot.genesis.length);
        console.log(`SnapshotCache: root-loaded '${snapshotName}' ${genesisViz}  # 1`);
      }
      const verifyStart = performance.now();
      const computedHash = thisSnapshot.blockHashes.length > 0 ? thisSnapshot.blockHashes[thisSnapshot.blockHashes.length - 1] : "genesis";
      console.log(`  [find:${snapshotName}] integrity check: computed=${computedHash.slice(0, 12)}... vs stored=${serialized.snapshotHash.slice(0, 12)}...`);
      if (computedHash !== serialized.snapshotHash) {
        console.warn(`  [find:${snapshotName}] \u274C INVALID: snapshot hash mismatch - computed ${computedHash}, recorded ${serialized.snapshotHash}`);
        return null;
      }
      const verifyMs = (performance.now() - verifyStart).toFixed(2);
      console.log(`  [find:${snapshotName}] \u2705 LOADED from ${cachePath} (${verifyMs}ms)`);
      let mergedOffchainData;
      if (parent?.offchainData) {
        mergedOffchainData = { ...parent.offchainData };
      }
      const offchainPath = join(snapshotDir, "offchain.json");
      if (existsSync(offchainPath)) {
        try {
          const offchainContent = readFileSync(offchainPath, "utf-8");
          const thisOffchainData = JSON.parse(offchainContent);
          mergedOffchainData = { ...mergedOffchainData, ...thisOffchainData };
        } catch (offchainErr) {
          console.warn(`SnapshotCache: failed to read offchain.json for '${snapshotName}':`, offchainErr);
        }
      }
      let cacheKeyInputs;
      const keyInputsPath = join(snapshotDir, "key-inputs.json");
      if (existsSync(keyInputsPath)) {
        try {
          const keyInputsContent = readFileSync(keyInputsPath, "utf-8");
          cacheKeyInputs = JSON.parse(keyInputsContent);
        } catch (keyInputsErr) {
          console.warn(`SnapshotCache: failed to read key-inputs.json for '${snapshotName}':`, keyInputsErr);
        }
      }
      const result = {
        snapshot: thisSnapshot,
        namedRecords: serialized.namedRecords,
        parentSnapName: serialized.parentSnapName,
        parentHash: serialized.parentHash,
        snapshotHash: serialized.snapshotHash,
        path: snapshotDir,
        offchainData: mergedOffchainData,
        cacheKeyInputs,
        capturedBlockCount: serialized.capturedBlockCount
      };
      this.loadedSnapshots.set(mapKey, result);
      return result;
    } catch (e) {
      console.warn(`SnapshotCache: failed to read ${cachePath}:`, e);
      return null;
    }
  }
  /**
   * Stores a snapshot using registered metadata to compute hierarchical path.
   * Only stores incremental blocks since parent (REQT/6xjggf5hsd).
   * @param snapshotName - The snapshot name (must be registered)
   * @param cachedSnapshot - The snapshot to store
   * @param helper - The current helper instance, passed to resolvers for correct lifetime (ARCH-8rqhpfy1ym)
   */
  async store(snapshotName, cachedSnapshot, helper) {
    const resolvedName = resolveSnapshotAlias(snapshotName);
    snapshotName = resolvedName;
    const entry = this.getRegistryEntry(snapshotName);
    if (!entry) {
      throw new Error(`SnapshotCache: cannot store unregistered snapshot '${snapshotName}'`);
    }
    let parentPath = null;
    let parentBlockCount = 0;
    if (entry.parentSnapName !== "genesis") {
      const resolvedParentName = resolveSnapshotAlias(entry.parentSnapName);
      const parent = await this.find(resolvedParentName, helper);
      if (!parent) {
        throw new Error(`SnapshotCache: parent '${resolvedParentName}' not found for '${snapshotName}'`);
      }
      parentPath = parent.path || null;
      parentBlockCount = parent.capturedBlockCount ?? parent.snapshot.blocks.length;
    }
    let cacheKey;
    let cacheKeyInputs;
    if (entry.resolveScriptDependencies) {
      cacheKeyInputs = await entry.resolveScriptDependencies(helper);
      cacheKey = this.computeKey(cachedSnapshot.parentHash, cacheKeyInputs);
      const bundleNames = cacheKeyInputs.bundles.map((b) => `${b.name}:${b.sourceHash?.slice(0, 8)}`).join(", ");
      console.log(`  [store:${snapshotName}] cacheKey=${cacheKey} (parentHash=${cachedSnapshot.parentHash?.slice(0, 12)}, bundles=[${bundleNames}])`);
    } else {
      cacheKeyInputs = { bundles: [] };
      cacheKey = this.computeKey(cachedSnapshot.parentHash, cacheKeyInputs);
      console.log(`  [store:${snapshotName}] cacheKey=${cacheKey} (parentHash=${cachedSnapshot.parentHash?.slice(0, 12)}, no resolver)`);
    }
    const dirLabel = entry.computeDirLabel ? entry.computeDirLabel(cacheKeyInputs) : "";
    const snapshotDir = this.getSnapshotDir(cacheKey, snapshotName, parentPath, dirLabel);
    const cachePath = this.getSnapshotFilePath(snapshotDir);
    if (existsSync(cachePath)) {
      try {
        const existing = JSON.parse(readFileSync(cachePath, "utf-8"));
        console.log(`  [store:${snapshotName}] \u26A0\uFE0F OVERWRITING existing snapshot!`);
        console.log(`    old snapshotHash: ${existing.snapshotHash}`);
        console.log(`    new snapshotHash: ${cachedSnapshot.snapshotHash}`);
        console.log(`    old parentHash: ${existing.parentHash}`);
        console.log(`    new parentHash: ${cachedSnapshot.parentHash}`);
        if (existing.snapshotHash !== cachedSnapshot.snapshotHash) {
          console.log(`    \u274C snapshotHash CHANGED - children with old parentHash will be orphaned!`);
        }
      } catch (e) {
        console.log(`  [store:${snapshotName}] \u26A0\uFE0F OVERWRITING (couldn't read old): ${e}`);
      }
    } else {
      console.log(`  [store:${snapshotName}] creating new snapshot at ${snapshotDir}`);
    }
    mkdirSync(snapshotDir, { recursive: true });
    const incrementalSnapshot = { ...cachedSnapshot.snapshot };
    const capturedBlockCount = cachedSnapshot.snapshot.blocks.length;
    if (entry.parentSnapName === "genesis") {
      const genesisBlockHash = cachedSnapshot.snapshot.blockHashes[0];
      if (!genesisBlockHash) {
        throw new Error(`Root snapshot '${snapshotName}' has no blockHashes - was tick() called after creating genesis UTxOs?`);
      }
      incrementalSnapshot.blocks = [];
      incrementalSnapshot.blockHashes = [genesisBlockHash];
      cachedSnapshot.snapshotHash = genesisBlockHash;
      cachedSnapshot.snapshot.blocks = [cachedSnapshot.snapshot.genesis];
      cachedSnapshot.snapshot.blockHashes = [genesisBlockHash];
    } else {
      incrementalSnapshot.genesis = [];
      incrementalSnapshot.blocks = cachedSnapshot.snapshot.blocks.slice(parentBlockCount);
      incrementalSnapshot.blockHashes = cachedSnapshot.snapshot.blockHashes.slice(parentBlockCount);
    }
    const serialized = {
      snapshot: serializeSnapshot(incrementalSnapshot),
      namedRecords: cachedSnapshot.namedRecords,
      parentSnapName: cachedSnapshot.parentSnapName,
      parentHash: cachedSnapshot.parentHash,
      parentBlockCount,
      snapshotHash: cachedSnapshot.snapshotHash,
      capturedBlockCount
    };
    const content = JSON.stringify(serialized, null, 2);
    writeFileSync(cachePath, content, "utf-8");
    if (cachedSnapshot.offchainData && Object.keys(cachedSnapshot.offchainData).length > 0) {
      const offchainPath = join(snapshotDir, "offchain.json");
      writeFileSync(offchainPath, JSON.stringify(cachedSnapshot.offchainData, null, 2), "utf-8");
    }
    const keyInputsPath = join(snapshotDir, "key-inputs.json");
    const bigIntReplacer = (_key, value) => typeof value === "bigint" ? value.toString() : value;
    writeFileSync(keyInputsPath, JSON.stringify(cacheKeyInputs, bigIntReplacer, 2), "utf-8");
    cachedSnapshot.path = snapshotDir;
    cachedSnapshot.cacheKeyInputs = cacheKeyInputs;
    cachedSnapshot.capturedBlockCount = capturedBlockCount;
    const mapKey = `${snapshotName}:${cacheKey}`;
    this.loadedSnapshots.set(mapKey, cachedSnapshot);
    const totalBlocks = cachedSnapshot.snapshot.blocks.length;
    const storedBlocks = incrementalSnapshot.blocks.length;
    console.log(`  [store:${snapshotName}] \u2705 stored (${storedBlocks}/${totalBlocks} blocks, snapshotHash=${cachedSnapshot.snapshotHash.slice(0, 12)}...) -> ${snapshotDir.split("/").slice(-2).join("/")}/`);
  }
  /**
   * Checks if a cached snapshot exists for the given snapshot name.
   * Uses registry to compute expected path.
   * @param snapshotName - The snapshot name to check
   * @param helper - The current helper instance, passed to resolvers for correct lifetime (ARCH-8rqhpfy1ym)
   */
  async has(snapshotName, helper) {
    const cached = await this.find(snapshotName, helper);
    return cached !== null;
  }
  /**
   * Deletes a cached snapshot and all its children (REQT/dwaf8qb8s1).
   * Uses recursive directory deletion.
   * @param snapshotName - The snapshot name to delete
   * @param helper - The current helper instance, passed to resolvers for correct lifetime (ARCH-8rqhpfy1ym)
   */
  async delete(snapshotName, helper) {
    const entry = this.getRegistryEntry(snapshotName);
    if (!entry) {
      return false;
    }
    const cached = await this.find(snapshotName, helper);
    if (!cached || !cached.path) {
      return false;
    }
    const deletedPath = cached.path;
    if (existsSync(deletedPath)) {
      rmSync(deletedPath, { recursive: true, force: true });
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
  getCacheDir() {
    return this.cacheDir;
  }
}

function uplcDataSerializer(key, value, depth = 0) {
  const indent = "    ".repeat(depth);
  const outdent = "    ".repeat(Math.max(0, depth - 1));
  if (typeof value === "bigint") {
    return `big\u2039${value.toString()}n\u203A`;
  } else if ("bytes" == key && Array.isArray(value)) {
    return abbreviatedDetailBytes(`bytes\u2039${value.length}\u203A`, value, 40);
  } else if ("string" == typeof value) {
    return `'${value}'`;
  } else if (value === null) {
    return `\u2039null\u203A`;
  } else if ("undefined" == typeof value) {
    return `\u2039und\u203A`;
  } else if (value.kind == "Address") {
    const a = value;
    const cbor = a.toCbor();
    return `\u2039${abbrevAddress(value)}\u203A = ` + abbreviatedDetailBytes(`cbor\u2039${cbor.length}\u203A:`, cbor, 99);
  } else if (value.kind == "ValidatorHash") {
    return abbreviatedDetailBytes(
      `script\u2039${value.bytes.length}\u203A`,
      value.bytes
    );
  } else if (value.kind == "MintingPolicyHash") {
    const v = value;
    return `mph\u2039${policyIdAsString(v)}\u203A`;
  } else if (value.kind == "TxOutputId") {
    return `\u2039txoid:${txOutputIdAsString(value, 8)}\u203A`;
  }
  if (value.rawData) {
    return uplcDataSerializer(key, value.rawData, Math.max(depth, 3));
  }
  if (value.kind == "int") {
    const v = value;
    return `IntData\u2039${v.value}\u203A`;
  }
  if (value.kind == "bytes") {
    const v = value;
    return abbreviatedDetailBytes(
      `ByteArray\u2039${v.bytes.length}\u203A`,
      v.bytes,
      40
    );
  }
  if (value.kind == "Value") {
    return valueAsString(value);
  }
  if (value.kind == "Assets") {
    return `assets:\u2039${assetsAsString(value)}\u203A`;
  }
  if (value.kind == "AssetClass") {
    const ac = value;
    return `assetClass:\u2039${policyIdAsString(ac.mph)} ${displayTokenName(
      ac.tokenName
    )}}\u203A`;
  }
  if (value.kind)
    console.log("info: no special handling for KIND = ", value.kind);
  if ("tn" == key && Array.isArray(value)) {
    return decodeUtf8(value);
  } else if ("number" == typeof value) {
    return value.toString();
  } else if (value instanceof Map) {
    return `map\u2039${value.size}\u203A: { ${uplcDataSerializer(
      "",
      Object.fromEntries(value.entries()),
      Math.max(depth, 3)
    )}    }`;
  } else if (Array.isArray(value) && value.length == 0) {
    return "[]";
  } else if (Array.isArray(value) && value.every((v) => typeof v === "number")) {
    return `${abbreviatedDetailBytes(`bytes\u2039${value.length}\u203A`, value, 40)}`;
  } else if (Array.isArray(value)) {
    const inner = value.map(
      (v) => uplcDataSerializer("", v, Math.max(depth + 1, 3))
    );
    let extraNewLine2 = "";
    let usesOutdent2 = "";
    const multiLine2 = inner.map((s2) => {
      s2.trim().includes("\n");
      if (s2.length > 40) {
        extraNewLine2 = "\n";
        usesOutdent2 = outdent;
        return `${indent}${s2}`;
      }
      return s2;
    }).join(`, ${extraNewLine2}`);
    return `[ ${extraNewLine2}${multiLine2}${extraNewLine2}${usesOutdent2} ]`;
  }
  if (!value) {
    return JSON.stringify(value);
  }
  const keys = Object.keys(value);
  if (keys.length == 0) {
    return key ? "" : "{}";
  }
  if (keys.length == 1) {
    const singleKey = keys[0];
    const thisValue = value[singleKey];
    let inner = uplcDataSerializer("", thisValue, Math.max(depth, 3)) || "";
    if (Array.isArray(thisValue)) {
      if (!inner.length) {
        inner = "[ \u2039empty list\u203A ]";
      }
    } else {
      if (inner.length) inner = `{ ${inner} }`;
    }
    let s2 = `${singleKey}: ${inner}`;
    return s2;
  }
  let extraNewLine = "";
  let usesOutdent = "";
  let s = keys.map(
    (k) => `${indent}${k}: ${uplcDataSerializer(k, value[k], Math.max(depth + 1, 2))}`
  );
  const multiLineItems = s.map((s2) => {
    if (s2.length < 40 && !s2.includes("\n")) {
      return `${s2}`;
    } else {
      extraNewLine = "\n";
      usesOutdent = outdent;
      return `${s2}`;
    }
  });
  const multiLine = multiLineItems.join(`, ${extraNewLine}`);
  s = `${multiLine}${extraNewLine}${usesOutdent}`;
  if (key) return `{${extraNewLine}${s}}`;
  return `
${s}`;
}
function abbrevAddress(address) {
  return abbreviatedDetail(address.toString(), 12, false);
}
function abbreviatedDetailBytes(prefix, value, initLength = 8) {
  const hext = bytesToHex(value);
  value.length;
  const text = checkValidUTF8(value) ? ` \u2039"${abbreviatedDetail(decodeUtf8(value), initLength)}"\u203A` : ``;
  if (value.length <= initLength) return `${prefix}${hext}${text}`;
  const checksumString = encodeBech32("_", value).slice(-4);
  return `${prefix}${hext.slice(0, initLength)}\u2026 \u2039${checksumString}\u203A${text}`;
}
function abbreviatedDetail(hext, initLength = 8, countOmitted = false) {
  const p = typeof process == "undefined" ? {
    env: {}
  } : process;
  if (p?.env?.EXPAND_DETAIL) {
    return hext;
  } else {
    if (hext.length <= initLength) return hext;
    const omittedCount = countOmitted ? hext.length - initLength - 4 : 0;
    let omittedString = countOmitted ? `\u2039\u2026${omittedCount}\u2026\u203A` : "\u2026";
    if (countOmitted && omittedCount < omittedString.length) {
      omittedString = hext.slice(initLength, -4);
    }
    return `${hext.slice(0, initLength)}${omittedString}${hext.slice(-4)}`;
  }
}

function hexToPrintableString(hexStr) {
  let result = "";
  for (let i = 0; i < hexStr.length; i += 2) {
    let hexChar = hexStr.substring(i, i + 2);
    let charCode = parseInt(hexChar, 16);
    if (charCode >= 32 && charCode <= 126) {
      result += String.fromCharCode(charCode);
    } else {
      result += `\u2039${hexChar}\u203A`;
    }
  }
  return result;
}
function displayTokenName(nameBytesOrString) {
  let nameString = "";
  let cip68Tag = "";
  let cip68TagHex = "";
  let nameBytesHex = "";
  let isCip68 = false;
  if (typeof nameBytesOrString === "string") {
    nameBytesHex = encodeUtf8(nameBytesOrString).map((byte) => ("0" + (byte & 255).toString(16)).slice(-2)).join("");
    nameString = nameBytesOrString;
  } else {
    nameBytesHex = nameBytesOrString.map((byte) => ("0" + (byte & 255).toString(16)).slice(-2)).join("");
    nameString = stringToPrintableString(nameBytesOrString);
  }
  if (nameBytesHex.length >= 8) {
    if (nameBytesHex.substring(0, 1) === "0" && nameBytesHex.substring(7, 8) === "0") {
      cip68TagHex = nameBytesHex.substring(1, 5);
      nameBytesHex.substring(5, 7);
      cip68Tag = parseInt(cip68TagHex, 16).toString();
      nameString = stringToPrintableString(nameBytesOrString.slice(4));
      isCip68 = true;
    }
  }
  if (isCip68) {
    nameString = `\u2039cip68/${cip68Tag}\u203A${nameString}`;
  } else {
    nameString = stringToPrintableString(nameBytesOrString);
  }
  return nameString;
}
function stringToPrintableString(str) {
  if ("string" != typeof str) {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(
        new Uint8Array(str)
      );
    } catch (e) {
      str = Buffer.from(str).toString("hex");
    }
  }
  let result = "";
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);
    if (charCode >= 32 && charCode <= 126) {
      result += str[i];
    } else {
      result += `\u2039${charCode.toString(16)}\u203A`;
    }
  }
  return result;
}
function assetsAsString(a, joiner = "\n    ", showNegativeAsBurn, mintRedeemers) {
  const assets = a.assets;
  return (assets?.map(([policyId, tokenEntries], index) => {
    let redeemerInfo = mintRedeemers?.[index] || "";
    if (redeemerInfo) {
      redeemerInfo = `
        r = ${redeemerInfo} `;
    }
    const tokenString = tokenEntries.map(([nameBytes, count]) => {
      const nameString = displayTokenName(nameBytes);
      const negWarning = count < 1n ? showNegativeAsBurn ? "\u{1F525} " : " \u26A0\uFE0F NEGATIVE\u26A0\uFE0F" : "";
      const burned = count < 1 ? showNegativeAsBurn ? "- BURN \u{1F525} " : "" : "";
      return `${negWarning} ${count}\xD7\u{1F4B4} ${nameString} ${burned}`;
    }).join("+");
    return `\u2991${policyIdAsString(
      policyId
    )} ${tokenString} ${redeemerInfo}\u2992`;
  }) || []).join(joiner);
}
function policyIdAsString(p) {
  const pIdHex = p.toHex();
  const abbrev = abbreviatedDetail(pIdHex);
  return `\u{1F3E6} ${abbrev}`;
}
function lovelaceToAda(lovelace) {
  const asNum = parseInt(lovelace.toString());
  const whole = Math.floor(asNum / 1e6).toFixed(0);
  let fraction = (asNum % 1e6).toFixed(0);
  fraction = fraction.padStart(6, "0");
  const wholeWithSeparators = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "_");
  let fractionWithSeparators = fraction.replace(/(\d{3})(?=\d)/g, "$1_").replace(/^-/, "");
  return `${wholeWithSeparators}.${fractionWithSeparators} ADA`;
}
function intWithGrouping(i) {
  const whole = Math.floor(Number(i)).toFixed(0);
  const fraction = Math.abs(Number(i) - Math.floor(Number(i))).toFixed(0);
  const wholeWithSeparators = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "_");
  const fractionWithSeparators = fraction.replace(/(\d{3})(?=\d)/g, "$1_");
  return `${wholeWithSeparators}.${fractionWithSeparators}`;
}
function valueAsString(v) {
  const ada = lovelaceToAda(v.lovelace);
  const assets = assetsAsString(v.assets);
  return [ada, assets].filter((x) => !!x).join(" + ");
}
function txAsString(tx, networkParams) {
  const outputOrder = [
    ["body", "inputs"],
    ["body", "minted"],
    ["body", "outputs"],
    ["body", "refInputs"],
    ["witnesses", "redeemers"],
    ["body", "signers"],
    ["witnesses", "v2refScripts"],
    ["witnesses", "v2scripts"],
    ["witnesses", "nativeScripts"],
    ["body", "collateral"],
    ["body", "collateralReturn"],
    ["body", "scriptDataHash"],
    ["body", "metadataHash"],
    ["witnesses", "signatures"],
    ["witnesses", "datums"],
    ["body", "lastValidSlot"],
    ["body", "firstValidSlot"],
    ["body", "fee"]
  ];
  let details = "";
  if (!networkParams) {
    console.warn(
      new Error(`dumpAny: no networkParams; can't show txn size info!?!`)
    );
  }
  const networkParamsHelper = networkParams ? makeNetworkParamsHelper(networkParams) : void 0;
  const seenRedeemers = /* @__PURE__ */ new Set();
  const allRedeemers = tx.witnesses.redeemers;
  let hasIndeterminate = false;
  const inputRedeemers = Object.fromEntries(
    allRedeemers.map((x, index) => {
      if (x.kind != "TxSpendingRedeemer") return void 0;
      const { inputIndex } = x;
      const isIndeterminate = inputIndex == -1;
      if (isIndeterminate) hasIndeterminate = true;
      const inpIndex = isIndeterminate ? `\u2039unk${index}\u203A` : inputIndex;
      if (!x.data) debugger;
      const showData = x.data.rawData ? uplcDataSerializer("", x.data.rawData) : x.data?.toString() || "\u2039no data\u203A";
      return [inpIndex, { r: x, display: showData }];
    }).filter((x) => !!x)
  );
  if (hasIndeterminate)
    inputRedeemers["hasIndeterminate"] = {
      r: void 0,
      display: "\u2039unk\u203A"
    };
  const mintRedeemers = Object.fromEntries(
    allRedeemers.map((x) => {
      if ("TxMintingRedeemer" != x.kind) return void 0;
      if ("number" != typeof x.policyIndex) {
        debugger;
        throw new Error(`non-mint redeemer here not yet supported`);
      }
      if (!x.data) debugger;
      const showData = (x.data.rawData ? uplcDataSerializer("", x.data.rawData) : x.data?.toString() || "\u2039no data\u203A") + "\n" + bytesToHex(x.data.toCbor());
      return [x.policyIndex, showData];
    }).filter((x) => !!x)
  );
  //!!! todo: improve interface of tx so useful things have a non-private api
  //!!! todo: get back to type-safety in this diagnostic suite
  for (const [where, x] of outputOrder) {
    let item = tx[where][x];
    let skipLabel = false;
    if (Array.isArray(item) && !item.length) continue;
    if (!item) continue;
    if ("inputs" == x) {
      item = `
  ${item.map((x2, i) => {
        const { r, display } = inputRedeemers[i] || inputRedeemers["hasIndeterminate"] || {};
        if (!display && x2.datum?.data) debugger;
        if (r) seenRedeemers.add(r);
        return txInputAsString(
          x2,
          /* unicode blue arrow right -> */
          `\u27A1\uFE0F  @${1 + i} `,
          i,
          display
          // || "‹failed to find redeemer info›"
        );
      }).join("\n  ")}`;
    }
    if ("refInputs" == x) {
      item = `
  ${item.map((x2) => txInputAsString(x2, "\u2139\uFE0F  ")).join("\n  ")}`;
    }
    if ("collateral" == x) {
      //!!! todo: group collateral with inputs and reflect it being spent either way,
      //!!! todo: move collateral to bottom with collateralReturn,
      item = item.map((x2) => txInputAsString(x2, "\u{1F52A}")).join("\n    ");
    }
    if ("minted" == x) {
      if (!item.assets.length) {
        continue;
      }
      item = `
   \u2747\uFE0F  ${assetsAsString(
        item,
        "\n   \u2747\uFE0F  ",
        "withBURN",
        mintRedeemers
      )}`;
    }
    if ("outputs" == x) {
      item = `
  ${item.map(
        (x2, i) => txOutputAsString(
          x2,
          `\u{1F539}${i} <-`
        )
      ).join("\n  ")}`;
    }
    if ("firstValidSlot" == x || "lastValidSlot" == x) {
      if (networkParamsHelper) {
        const slotTime = new Date(networkParamsHelper.slotToTime(item));
        const timeDiff = (slotTime.getTime() - Date.now()) / 1e3;
        const sign = timeDiff > 0 ? "+" : "-";
        const timeDiffString = sign + Math.abs(timeDiff).toFixed(1) + "s";
        item = `${item} ${slotTime.toLocaleDateString()} ${slotTime.toLocaleTimeString()} (now ${timeDiffString})`;
      }
    }
    if ("signers" == x) {
      item = item.map((x2) => {
        const hex = x2.toHex();
        return `\u{1F511}#${hex.slice(0, 6)}\u2026${hex.slice(-4)}`;
      });
    }
    if ("fee" == x) {
      item = lovelaceToAda(item);
    }
    if ("collateralReturn" == x) {
      skipLabel = true;
      item = `  ${txOutputAsString(
        item,
        `0  <- \u2753`
      )} conditional: collateral change (returned in case of txn failure)`;
    }
    if ("scriptDataHash" == x) {
      item = bytesToHex(item);
    }
    if ("datums" == x && !Object.entries(item || {}).length) continue;
    if ("signatures" == x) {
      if (!item) continue;
      item = item.map((s) => {
        const addr = makeAddress(true, s.pubKeyHash);
        const hashHex = s.pubKeyHash.toHex();
        return `\u{1F58A}\uFE0F ${addrAsString(addr)} = \u{1F511}\u2026${hashHex.slice(-4)}`;
      });
      if (item.length > 1) item.unshift("");
      item = item.join("\n    ");
    }
    if ("redeemers" == x) {
      if (!item) continue;
      //!!! todo: augment with mph when that's available from the Activity.
      item = item.map((x2) => {
        const indexInfo = x2.kind == "TxMintingRedeemer" ? `minting policy ${x2.policyIndex}` : `spend txin \u27A1\uFE0F  @${1 + x2.inputIndex}`;
        const showData = seenRedeemers.has(x2) ? "(see above)" : x2.data.fromData ? uplcDataSerializer("", x2.data.fromData) : x2.data.toString();
        return `\u{1F3E7}  ${indexInfo} ${showData}`;
      });
      if (item.length > 1) item.unshift("");
      item = item.join("\n    ");
    }
    if ("v2Scripts" == x) {
      if (!item) continue;
      item = item.map((s) => {
        try {
          const mph = s.mintingPolicyHash.toHex();
          return `\u{1F3E6} ${mph.slice(0, 8)}\u2026${mph.slice(-4)} (minting): ${s.serializeBytes().length} bytes`;
        } catch (e) {
          const vh = s.validatorHash;
          const vhh = vh.toHex();
          const addr = makeAddress(true, vh);
          return `\u{1F4DC} ${vhh.slice(0, 8)}\u2026${vhh.slice(
            -4
          )} (validator at ${addrAsString(addr)}): ${s.serializeBytes().length} bytes`;
        }
      });
      if (item.length > 1) item.unshift("");
      item = item.join("\n    ");
    }
    if ("v2RefScripts" == x) {
      item = `${item.length} - see refInputs`;
    }
    if (!item) continue;
    details += `${skipLabel ? "" : "  " + x + ": "}${item}
`;
  }
  try {
    details += `  txId: ${tx.id().toHex()}`;
    if (networkParams) details += `  

size: ${tx.toCbor().length} bytes`;
  } catch (e) {
    details = details + `(Tx not yet finalized!)`;
    if (networkParams) details += `
  - NOTE: can't determine txn size
`;
  }
  return details;
}
function txInputAsString(x, prefix = "-> ", index, redeemer) {
  const { output: oo } = x;
  const redeemerInfo = redeemer ? `
    r = ${redeemer}` : " \u2039no redeemer\u203A";
  const datumInfo = oo.datum?.kind == "InlineTxOutputDatum" ? datumSummary(oo.datum) : "";
  return `${prefix}${addrAsString(x.address)}${showRefScript(
    oo.refScript
  )} ${valueAsString(x.value)} ${datumInfo} = \u{1F4D6} ${txOutputIdAsString(
    x.id
  )}${redeemerInfo}`;
}
function utxosAsString(utxos, joiner = "\n", utxoDCache) {
  return utxos.map((u) => utxoAsString(u, " \u{1F4B5}", utxoDCache)).join(joiner);
}
function txOutputIdAsString(x, length = 8) {
  return txidAsString(x.txId, length) + `\u{1F539}#${x.index}`;
}
function txidAsString(x, length = 8) {
  const tid = x.toHex();
  return `${tid.slice(0, length)}\u2026${tid.slice(-4)}`;
}
function utxoAsString(x, prefix = "\u{1F4B5}", utxoDCache) {
  return ` \u{1F4D6} ${txOutputIdAsString(x.id)}: ${txOutputAsString(
    x.output,
    prefix,
    utxoDCache,
    x.id
  )}`;
}
function datumSummary(d) {
  if (!d) return "";
  const dh = d.hash.toHex();
  const dhss = `${dh.slice(0, 8)}\u2026${dh.slice(-4)}`;
  if (d.kind == "InlineTxOutputDatum") {
    const attachedData = d.data.rawData;
    if (attachedData) {
      return `
    d\u2039inline:${dhss} - ${uplcDataSerializer("", attachedData)}=${d.toCbor().length} bytes\u203A`;
    } else {
      return `d\u2039inline:${dhss} - ${d.toCbor().length} bytes\u203A`;
    }
  }
  return `d\u2039hash:${dhss}\u2026\u203A`;
}
function showRefScript(rs) {
  if (!rs) return "";
  const hash = rs.hash();
  const hh = bytesToHex(hash);
  const size = rs.toCbor().length;
  const rshInfo = `${hh.slice(0, 8)}\u2026${hh.slice(-4)}`;
  return ` \u2039\u{1F4C0} refScript\u{1F4DC} ${rshInfo}: ${size} bytes\u203A +`;
}
function txOutputAsString(x, prefix = "<-", utxoDCache, txoid) {
  let cache = utxoDCache?.get(txoid);
  if (cache) {
    return `\u267B\uFE0F ${cache} (same as above)`;
  }
  cache = `${prefix} ${addrAsString(x.address)}${showRefScript(
    x.refScript
  )} ${valueAsString(x.value)}`;
  return `${cache} ${datumSummary(x.datum)}`;
}
function addrAsString(address) {
  const bech32 = address.toString();
  return `${bech32.slice(0, 14)}\u2026${bech32.slice(-4)}`;
}
function byteArrayListAsString(items, joiner = "\n  ") {
  return "[\n  " + items.map((ba) => byteArrayAsString(ba)).join(joiner) + "\n]\n";
}
function byteArrayAsString(ba) {
  return hexToPrintableString(ba.toHex());
}
function dumpAny(x, networkParams, forJson = false) {
  if ("undefined" == typeof x) return "\u2039undefined\u203A";
  if (x?.kind == "Assets") {
    return `assets: ${assetsAsString(x)}`;
  }
  if (Array.isArray(x)) {
    if (!x.length) return "\u2039empty array\u203A";
    const firstItem = x[0];
    if ("number" == typeof firstItem) {
      return `num array: \u2039"${byteArrayAsString(makeByteArrayData(x))}"\u203A`;
    }
    if (firstItem.kind == "TxOutput") {
      return "tx outputs: \n" + x.map((txo) => txOutputAsString(txo)).join("\n");
    }
    if (firstItem.kind == "TxInput") {
      return "utxos: \n" + utxosAsString(x);
    }
    if (firstItem.kind == "ByteArrayData") {
      return "byte array list:\n" + byteArrayListAsString(x);
    }
    if ("object" == typeof firstItem) {
      if (firstItem instanceof Uint8Array) {
        return `byte array: \u2039"${byteArrayAsString(firstItem)}"\u203A`;
      }
      return `[` + x.map((item) => JSON.stringify(item, betterJsonSerializer)).join(", ") + `]`;
    }
    console.log("firstItem", firstItem);
    throw new Error(
      `dumpAny(): unsupported array type: ${typeof firstItem}`
    );
  }
  if ("bigint" == typeof x) {
    return x.toString();
  }
  if (isLibraryMatchedTcx(x)) {
    debugger;
    throw new Error(`use await build() and dump the result instead.`);
  }
  const xx = x;
  if (x.kind == "TxOutput") {
    return txOutputAsString(x);
  }
  if (xx.kind == "Tx") {
    return txAsString(xx, networkParams);
  }
  if (xx.kind == "TxOutputId") {
    return txOutputIdAsString(xx);
  }
  if (xx.kind == "TxId") {
    return txidAsString(xx);
  }
  if (xx.kind == "TxInput") {
    return utxoAsString(xx);
  }
  if (xx.kind == "Value") {
    return valueAsString(xx);
  }
  if (xx.kind == "Address") {
    return addrAsString(xx);
  }
  if (xx.kind == "MintingPolicyHash") {
    return policyIdAsString(xx);
  }
  if (forJson) return xx;
  if ("object" == typeof x) {
    return `{${Object.entries(x).map(([k, v]) => `${k}: ${dumpAny(v, networkParams)}`).join(",\n")}}`;
  }
  debugger;
  return "dumpAny(): unsupported type or library mismatch";
}
const betterJsonSerializer = (key, value) => {
  return dumpAny(value, void 0, true);
};
if ("undefined" == typeof window) {
  globalThis.peek = dumpAny;
} else {
  window.peek = dumpAny;
}

const proc = typeof process == "undefined" ? {
  stdout: {
    columns: 65
  }} : process;
class UplcConsoleLogger {
  didStart = false;
  // lines: LineOrGroup[] = [];
  lastMessage = "";
  lastReason;
  history = [];
  groupStack = [{
    name: "",
    lines: []
  }];
  constructor() {
    this.logPrint = this.logPrint.bind(this);
    this.reset = this.reset.bind(this);
  }
  get currentGroupLines() {
    return this.groupStack.at(-1).lines;
  }
  get topLines() {
    return this.groupStack.at(0).lines;
  }
  reset(reason) {
    this.lastMessage = "";
    this.lastReason = reason;
    this.groupStack = [{
      name: "",
      lines: []
    }];
    if (reason == "build") {
      this.groupStack[0].lines = [];
      return;
    }
    if (reason == "validate") {
      this.flush();
      return;
    }
  }
  // log(...msgs: string[]) {
  //     return this.logPrint(...msgs);
  // }
  // error(...msgs: string[]) {
  //     return this.logError(...msgs, "\n");
  // }
  // logPrintLn(...msgs: string[]) {
  //     return this.logPrint(...msgs, "\n");
  // }
  interesting = 0;
  logPrint(message, site) {
    if (message.match(/STokMint/)) {
      this.interesting = 1;
    }
    if (message.startsWith("\u{1F423}")) {
      const groupName = message.replace("\u{1F423}", "").replace("\u{1F5DC}\uFE0F", "");
      const collapse = !!message.match(/^🐣🗜️/);
      const nextGroup = {
        name: groupName.replace(/^\s+/, ""),
        lines: [],
        collapse
      };
      this.currentGroupLines.push(nextGroup);
      this.groupStack.push(nextGroup);
      return this;
    } else if (message.startsWith("\u{1F95A} ")) {
      const rest = message.replace("\u{1F95A} ", "");
      if (this.groupStack.length == 1) {
        const t = this.formatLines(this.topLines);
        debugger;
        console.warn(
          "Ignoring extra groupEnd() called in contract script\n" + t.join("\n")
        );
      } else {
        this.currentGroup.result = rest;
        this.groupStack.pop();
      }
      return this;
    }
    if ("string" != typeof message) {
      console.log("wtf");
    }
    this.lastMessage = message;
    this.currentGroup.lines.push(...message.split("\n"));
    return this;
  }
  get currentGroup() {
    const group = this.groupStack.at(-1);
    if (!group) {
      debugger;
      throw new Error("Too many groupEnd()s called in contract script");
    }
    return group;
  }
  logError(message, stack) {
    this.logPrint("\n");
    this.logPrint(
      "-".repeat((proc?.stdout?.columns || 65) - 8)
    );
    this.logPrint("--- \u26A0\uFE0F  ERROR: " + message.trimStart() + "\n");
    this.logPrint(
      "-".repeat((proc?.stdout?.columns || 65) - 8) + "\n"
    );
  }
  // printlnFunction(msg) {
  //     console.log("                              ---- println")
  //     this.lines.push(msg);
  //     this.lines.push("\n");
  //     this.flushLines();
  // }
  toggler = 0;
  toggleDots() {
    this.toggler = 1 - this.toggler;
  }
  get isMine() {
    return true;
  }
  resetDots() {
    this.toggler = 0;
  }
  showDot() {
    const s = this.toggler ? "\u2502   \u250A " : "\u2502 \u25CF \u250A ";
    this.toggleDots();
    return s;
  }
  fullHistory() {
    return this.history.join("\n");
  }
  formattedHistory = [];
  fullFormattedHistory() {
    return this.formattedHistory.join("\n");
  }
  // formatGroupedOutput() {
  //     const content: string[] = [];
  //     const terminalWidth = process?.stdout?.columns || 65;
  //     for (const group of this.groupStack) {
  //         content.push(... this.formatGroup(group));
  //         let {name, lines} = group;
  //         if (name) name = `  ${name}  `;
  //         const groupHeader = `╭${name}`;
  //         content.push(groupHeader);
  //         content.push(lines.map(line => ` │ ${line}`).join("\n"));
  //         let lastLine = lines.at(-1)
  //         if (lastLine && lastLine.startsWith("╰")) {
  //             lastLine = `╰ ${lastLine.slice(1)}`;
  //         }
  //         content.push(lastLine);
  //     }
  // }
  formatGroup(group) {
    let { name, lines, result = "" } = group;
    const terminalWidth = proc?.stdout?.columns || 65;
    const content = [];
    const groupHeader = `${name}`;
    const formattedLines = this.formatLines(lines);
    const indentedLines = formattedLines.map((line) => `  \u2502 ${line}`);
    {
      content.push(groupHeader);
      content.push(...indentedLines);
    }
    const lastLine = formattedLines.at(-1);
    const happySimpleResult = result && result == "\u2705" ? "\u2705" : "";
    const noResult = !result;
    const noResultClosingLine = noResult ? "\u2508".repeat(terminalWidth - 5) : "";
    if ((noResult || happySimpleResult) && lastLine && lastLine?.match(/^\s+╰/)) {
      const innerLine = lastLine.replace(/^\s+/, "");
      const marker = happySimpleResult || "\u2508";
      let replacementLastLine = `  \u2570${marker} ${innerLine}`;
      if (replacementLastLine.length > terminalWidth) {
        const tooMuch = replacementLastLine.length - terminalWidth;
        if (replacementLastLine.endsWith("\u2508".repeat(tooMuch))) {
          replacementLastLine = replacementLastLine.slice(0, -tooMuch);
        }
      }
      {
        content.splice(-1, 1, replacementLastLine);
      }
    } else if ((happySimpleResult || noResult) && lastLine?.match(/^\s*✅/)) {
      const replacementLastLine = `  \u2570 ${lastLine.replace(/^\s+/, "")}`;
      {
        content.splice(-1, 1, replacementLastLine);
      }
    } else if (result) {
      const extraClosingLine = `  \u2570 ${result}`;
      content.push(extraClosingLine);
    } else {
      const extraClosingLine = `  \u2570${noResultClosingLine}`;
      content.push(extraClosingLine);
    }
    return content;
  }
  formatLines(lines) {
    const content = [];
    for (const line of lines) {
      if (typeof line == "string") {
        content.push(line);
      } else {
        content.push(...this.formatGroup(line));
      }
    }
    content.at(-1)?.replace(/\n+$/, "");
    while (content.at(-1)?.match(/^\n?$/)) {
      content.pop();
    }
    return content;
  }
  flushLines(footerString) {
    let content = [];
    const terminalWidth = proc?.stdout?.columns || 65;
    const formattedLines = this.formatLines(this.topLines);
    this.history.push(formattedLines.join("\n"));
    if (!this.didStart) {
      this.didStart = true;
      content.push("\u256D\u2508\u2508\u2508\u252C" + "\u2508".repeat(terminalWidth - 5) + "\n");
      this.resetDots();
    } else if (this.topLines.length) {
      content.push("\u251C\u2508\u2508\u2508\u253C" + "\u2508".repeat(terminalWidth - 5) + "\n");
      this.resetDots();
    }
    for (const line of formattedLines) {
      content.push(`${this.showDot()}${line}
`);
    }
    content.push(this.showDot() + "\n");
    if (!this.toggler) {
      content.push(this.showDot() + "\n");
    }
    if (footerString) {
      content.push(footerString);
    }
    const joined = content.join("");
    this.formattedHistory.push(joined);
    console.log(joined);
    this.groupStack = [{
      name: "",
      lines: []
    }];
  }
  finish() {
    this.flushLines(
      "\u2570\u2508\u2508\u2508\u2534" + "\u2508".repeat((proc?.stdout?.columns || 65) - 5)
    );
    return this;
  }
  get groupLines() {
    return this.groupStack.at(-1)?.lines || [];
  }
  flush() {
    if (this.topLines.length) {
      if (this.lastMessage.at(-1) != "") {
        this.groupLines.push("");
      }
      this.flushLines();
    }
    return this;
  }
  flushError(message = "") {
    if (this.lastMessage.at(-1) != "\n") {
      this.groupLines.push("\n");
    }
    if (message.at(-1) == "\n") {
      message = message.slice(0, -1);
    }
    const terminalWidth = proc?.stdout?.columns || 65;
    if (message) this.logError(message);
    if (this.topLines.length) {
      this.flushLines(
        "\u23BD\u23BC\u23BB\u23BA\u23BB\u23BA\u23BC\u23BC\u23BB\u23BA\u23BB\u23BD\u23BC\u23BA\u23BB\u23BB\u23BA\u23BC\u23BC\u23BB\u23BA".repeat((terminalWidth - 2) / 21)
      );
    }
    return this;
  }
}

const nanoid = customAlphabet("0123456789abcdefghjkmnpqrstvwxyz", 12);

//!!! if we could access the inputs and outputs in a building Tx,
const emptyUuts = Object.freeze({});
class StellarTxnContext {
  kind = "StellarTxnContext";
  id = nanoid(5);
  inputs = [];
  /** Maps input ID (as string) to the stack trace where it was added */
  inputStackTraces = /* @__PURE__ */ new Map();
  /** Maps reference input ID (as string) to the stack trace where it was added (REQT/acczfb1bd6) */
  refInputStackTraces = /* @__PURE__ */ new Map();
  collateral;
  outputs = [];
  feeLimit;
  state;
  allNeededWitnesses = [];
  otherPartySigners = [];
  parentTcx;
  childReservedUtxos = [];
  parentId = "";
  alreadyPresent = void 0;
  depth = 0;
  // submitOptions?: SubmitOptions
  txb;
  txnName = "";
  withName(name) {
    this.txnName = name;
    return this;
  }
  get wallet() {
    return this.setup.actorContext.wallet;
  }
  get uh() {
    return this.setup.uh;
  }
  get networkParams() {
    return this.setup.networkParams;
  }
  get actorContext() {
    return this.setup.actorContext;
  }
  /**
   * Provides a lightweight, NOT complete, serialization for presenting the transaction context
   * @remarks
   * Serves rendering of the transaction context in vitest
   * @internal
   */
  toJSON() {
    return {
      kind: "StellarTxnContext",
      state: !!this.state ? `{${Object.keys(this.state).join(", ")}}` : void 0,
      inputs: `[${this.inputs.length} inputs]`,
      outputs: `[${this.outputs.length} outputs]`,
      isBuilt: !!this._builtTx,
      hasParent: !!this.parentTcx,
      //@ts-expect-error
      addlTxns: this.state.addlTxns ? [
        //@ts-expect-error
        ...Object.keys(this.state.addlTxns || {})
      ] : void 0
    };
  }
  logger = new UplcConsoleLogger();
  constructor(setup, state = {}, parentTcx) {
    if (parentTcx) {
      console.warn(
        "Deprecated use of 'parentTcx' - use includeAddlTxn() instead\n  ... setup.txBatcher.current holds an in-progress utxo set for all 'parent' transactions"
      );
      throw new Error(`parentTcx used where? `);
    }
    Object.defineProperty(this, "setup", {
      enumerable: false,
      value: setup
    });
    Object.defineProperty(this, "_builtTx", {
      enumerable: false,
      writable: true
    });
    const isMainnet = setup.isMainnet;
    this.isFacade = void 0;
    if ("undefined" == typeof isMainnet) {
      throw new Error(
        "StellarTxnContext: setup.isMainnet must be defined"
      );
    }
    this.txb = makeTxBuilder({
      isMainnet
    });
    this.state = {
      ...state,
      uuts: state.uuts || { ...emptyUuts }
    };
    const currentBatch = this.currentBatch;
    currentBatch?.isOpen;
    if (!currentBatch || currentBatch.isConfirmationComplete) {
      this.setup.txBatcher.rotate(this.setup.chainBuilder);
    }
    if (!this.setup.isTest && !this.setup.chainBuilder) {
      if (currentBatch.chainBuilder) {
        this.setup.chainBuilder = currentBatch.chainBuilder;
      } else {
        this.setup.chainBuilder = makeTxChainBuilder(
          this.setup.network
        );
      }
    }
    if (parentTcx) {
      debugger;
      throw new Error(`parentTcx used where? `);
    }
    this.parentTcx = parentTcx;
  }
  isFacade;
  facade() {
    if (this.isFacade === false)
      throw new Error(`this tcx already has txn material`);
    if (this.parentTcx)
      throw new Error(`no parentTcx allowed for tcx facade`);
    const t = this;
    t.state.addlTxns = t.state.addlTxns || {};
    t.isFacade = true;
    return this;
  }
  noFacade(situation) {
    if (this.isFacade)
      throw new Error(
        `${situation}: ${this.txnName || "this tcx"} is a facade for nested multi-tx`
      );
    this.isFacade = false;
  }
  withParent(tcx) {
    this.noFacade("withParent");
    this.parentTcx = tcx;
    return this;
  }
  get actorWallet() {
    return this.actorContext.wallet;
  }
  dump(tx) {
    const t = tx || this.builtTx;
    if (t instanceof Promise) {
      return t.then((tx2) => {
        return txAsString(tx2, this.setup.networkParams);
      });
    }
    return txAsString(t, this.setup.networkParams);
  }
  includeAddlTxn(txnName, txInfoIn) {
    const txInfo = {
      ...txInfoIn
    };
    if (!txInfo.id)
      txInfo.id = //@ts-expect-error - the tcx is never there,
      // but including the fallback assignment here for
      // consistency about the policy of syncing to it.
      txInfo.tcx?.id || nanoid(5);
    txInfo.parentId = this.id;
    txInfo.depth = (this.depth || 0) + 1;
    const thisWithMoreType = this;
    if ("undefined" == typeof this.isFacade) {
      throw new Error(
        `to include additional txns on a tcx with no txn details, call facade() first.
   ... otherwise, add txn details first or set isFacade to false`
      );
    }
    if (thisWithMoreType.state.addlTxns?.[txnName]) {
      throw new Error(
        `addlTxns['${txnName}'] already included in this transaction:
` + Object.keys(thisWithMoreType.state.addlTxns).map(
          (k) => ` \u2022 ${k}`
        ).join("\n")
      );
    }
    thisWithMoreType.state.addlTxns = {
      ...thisWithMoreType.state.addlTxns || {},
      [txnName]: txInfo
    };
    return thisWithMoreType;
  }
  /**
   * @public
   */
  get addlTxns() {
    return this.state.addlTxns || {};
  }
  mintTokens(...args) {
    this.noFacade("mintTokens");
    const [policy, tokens, r = { redeemer: void 0 }] = args;
    const { redeemer } = r;
    if (this.txb.mintPolicyTokensUnsafe) {
      this.txb.mintPolicyTokensUnsafe(policy, tokens, redeemer);
    } else {
      this.txb.mintTokens(policy, tokens, redeemer);
    }
    return this;
  }
  getSeedAttrs() {
    this.noFacade("getSeedAttrs");
    const seedUtxo = this.state.seedUtxo;
    return { txId: seedUtxo.id.txId, idx: BigInt(seedUtxo.id.index) };
  }
  reservedUtxos() {
    this.noFacade("reservedUtxos");
    return this.parentTcx ? this.parentTcx.reservedUtxos() : [
      ...this.inputs,
      this.collateral,
      ...this.childReservedUtxos
    ].filter((x) => !!x);
  }
  utxoNotReserved(u) {
    if (this.collateral?.isEqual(u)) return void 0;
    if (this.inputs.find((i) => i.isEqual(u))) return void 0;
    return u;
  }
  addUut(uutName, ...names) {
    this.noFacade("addUut");
    this.state.uuts = this.state.uuts || {};
    for (const name of names) {
      this.state.uuts[name] = uutName;
    }
    return this;
  }
  addState(key, value) {
    this.noFacade("addState");
    this.state[key] = value;
    return this;
  }
  addCollateral(collateral) {
    this.noFacade("addCollateral");
    console.warn(
      "explicit addCollateral() should be unnecessary unless a babel payer is covering it"
    );
    if (!collateral.value.assets.isZero()) {
      throw new Error(
        `invalid attempt to add non-pure-ADA utxo as collateral`
      );
    }
    this.collateral = collateral;
    this.txb.addCollateral(collateral);
    return this;
  }
  getSeedUtxoDetails() {
    this.noFacade("getSeedUtxoDetails");
    const seedUtxo = this.state.seedUtxo;
    return {
      txId: seedUtxo.id.txId,
      idx: BigInt(seedUtxo.id.index)
    };
  }
  _txnTime;
  /**
   * Sets a future date for the transaction to be executed, returning the transaction context.  Call this before calling validFor().
   *
   * @remarks Returns the txn context.
   * Throws an error if the transaction already has a txnTime set.
   *
   * This method does not itself set the txn's validity interval.  You MUST combine it with
   * a call to validFor(), to set the txn's validity period.  The resulting transaction will
   * be valid from the moment set here until the end of the validity period set by validFor().
   *
   * This can be used anytime to construct a transaction valid in the future.  This is particularly useful
   * during test scenarios to verify time-sensitive behaviors.
   *
   * In the test environment, the network wil normally be advanced to this date
   * before executing the transaction, unless a different execution time is indicated.
   * Use the test helper's `submitTxnWithBlock(txn, {futureDate})` or `advanceNetworkTimeForTx()` methods, or args to
   * use-case-specific functions that those methods.
   */
  futureDate(date) {
    this.noFacade("futureDate");
    if (this._txnTime) {
      throw new Error(
        "txnTime already set; cannot set futureDate() after txnTime"
      );
    }
    const d = new Date(
      Number(this.slotToTime(this.timeToSlot(BigInt(date.getTime()))))
    );
    console.log("  \u23F0\u23F0 setting txnTime to ", d.toString());
    this._txnTime = d;
    return this;
  }
  assertNumber(obj, msg = "expected a number") {
    if (obj === void 0 || obj === null) {
      throw new Error(msg);
    } else if (typeof obj == "number") {
      return obj;
    } else {
      throw new Error(msg);
    }
  }
  /**
   * Calculates the time (in milliseconds in 01/01/1970) associated with a given slot number.
   * @param slot - Slot number
   */
  slotToTime(slot) {
    let secondsPerSlot = this.assertNumber(
      this.networkParams.secondsPerSlot
    );
    let lastSlot = BigInt(this.assertNumber(this.networkParams.refTipSlot));
    let lastTime = BigInt(this.assertNumber(this.networkParams.refTipTime));
    let slotDiff = slot - lastSlot;
    return lastTime + slotDiff * BigInt(secondsPerSlot * 1e3);
  }
  /**
   * Calculates the slot number associated with a given time.
   * @param time - Milliseconds since 1970
   */
  timeToSlot(time) {
    let secondsPerSlot = this.assertNumber(
      this.networkParams.secondsPerSlot
    );
    let lastSlot = BigInt(this.assertNumber(this.networkParams.refTipSlot));
    let lastTime = BigInt(this.assertNumber(this.networkParams.refTipTime));
    let timeDiff = time - lastTime;
    return lastSlot + BigInt(Math.round(Number(timeDiff) / (1e3 * secondsPerSlot)));
  }
  /**
   * Identifies the time at which the current transaction is expected to be executed.
   * Use this attribute in any transaction-building code that sets date/time values
   * for the transaction.
   * Honors any futureDate() setting or uses the current time if none has been set.
   */
  get txnTime() {
    if (this._txnTime) return this._txnTime;
    const now = Date.now();
    const recent = now - 18e4;
    const d = new Date(
      Number(this.slotToTime(this.timeToSlot(BigInt(recent))))
    );
    console.log("\u23F0\u23F0setting txnTime to ", d.toString());
    return this._txnTime = d;
  }
  _txnEndTime;
  get txnEndTime() {
    if (this._txnEndTime) return this._txnEndTime;
    throw new Error(
      "call [optional: futureDate() and] validFor(durationMs) before fetching the txnEndTime"
    );
  }
  /**
   * Sets an on-chain validity period for the transaction, in miilliseconds
   *
   * @remarks if futureDate() has been set on the transaction, that
   * date will be used as the starting point for the validity period.
   *
   * Returns the transaction context for chaining.
   *
   * @param durationMs - the total validity duration for the transaction.  On-chain
   *  checks using CapoCtx `now(granularity)` can enforce this duration
   */
  validFor(durationMs) {
    this.noFacade("validFor");
    const startMoment = this.txnTime.getTime();
    this._validityPeriodSet = true;
    this._txnEndTime = new Date(startMoment + durationMs);
    this.txb.validFromTime(new Date(startMoment)).validToTime(this._txnEndTime);
    return this;
  }
  _validityPeriodSet = false;
  txRefInputs = [];
  /**
   * adds a reference input to the transaction context
   * @remarks
   *
   * idempotent version of helios addRefInput()
   *
   * @public
   **/
  addRefInput(input, refScript) {
    this.noFacade("addRefInput");
    if (!input) throw new Error(`missing required input for addRefInput()`);
    const currentStack = new Error().stack || "(stack unavailable)";
    const inputIdKey = input.id.toString();
    if (this.txRefInputs.find((v) => v.id.isEqual(input.id))) {
      console.warn("suppressing second add of refInput");
      return this;
    }
    if (this.inputs.find((v) => v.id.isEqual(input.id))) {
      console.warn(
        "suppressing add of refInput that is already an input"
      );
      return this;
    }
    this.refInputStackTraces.set(inputIdKey, currentStack);
    this.txRefInputs.push(input);
    const v2sBefore = this.txb.v2Scripts;
    if (refScript) {
      this.txb.addV2RefScript(refScript);
    }
    this.txb.refer(input);
    const v2sAfter = this.txb.v2Scripts;
    if (v2sAfter.length > v2sBefore.length) {
      console.log("       --- addRefInput added a script to tx.scripts");
    }
    return this;
  }
  /**
   * @deprecated - use addRefInput() instead.
   */
  addRefInputs(...args) {
    throw new Error(`deprecated`);
  }
  addInput(input, r) {
    this.noFacade("addInput");
    if (r && !r.redeemer) {
      console.log("activity without redeemer tag: ", r);
      throw new Error(
        `addInput() redeemer must match the isActivity type {redeemer: \u2039activity\u203A}
`
        // JSON.stringify(r, delegateLinkSerializer)
      );
    }
    const currentStack = new Error().stack || "(stack unavailable)";
    const inputIdKey = input.id.toString();
    const existingStack = this.inputStackTraces.get(inputIdKey);
    if (existingStack) {
      const originalStackSummary = existingStack.split("\n").slice(1, 6).join("\n");
      throw new Error(
        `Duplicate input detected: ${inputIdKey}

Original input was added at:
${originalStackSummary}

Duplicate addition attempted at:
${currentStack}`
      );
    }
    this.inputStackTraces.set(inputIdKey, currentStack);
    if (input.address.pubKeyHash)
      this.allNeededWitnesses.push(input.address);
    this.inputs.push(input);
    if (this.parentTcx) {
      this.parentTcx.childReservedUtxos.push(input);
    }
    try {
      this.txb.spendUnsafe(input, r?.redeemer);
    } catch (e) {
      debugger;
      throw new Error(
        `addInput: ${e.message}
   ...TODO: dump partial txn from txb above.  Failed TxInput:
` + dumpAny(input)
      );
    }
    return this;
  }
  addOutput(output) {
    this.noFacade("addOutput");
    try {
      this.txb.addOutput(output);
      this.outputs.push(output);
    } catch (e) {
      console.log(
        "Error adding output to txn: \n  | inputs:\n  | " + utxosAsString(this.inputs, "\n  | ") + "\n  | " + dumpAny(this.outputs).split("\n").join("\n  |   ") + "\n... in context of partial tx above: failed adding output: \n  |  ",
        dumpAny(output),
        "\n" + e.message,
        "\n   (see thrown stack trace below)"
      );
      e.message = `addOutput: ${e.message}
   ...see logged details above`;
      throw e;
    }
    return this;
  }
  attachScript(...args) {
    throw new Error(
      `use addScriptProgram(), increasing the txn size, if you don't have a referenceScript.
Use <capo>.txnAttachScriptOrRefScript() to use a referenceScript when available.`
    );
  }
  /**
   * Adds a UPLC program to the transaction context, increasing the transaction size.
   * @remarks
   * Use the Capo's `txnAttachScriptOrRefScript()` method to use a referenceScript
   * when available. That method uses a fallback approach adding the script to the
   * transaction if needed.
   */
  addScriptProgram(...args) {
    this.noFacade("addScriptProgram");
    this.txb.attachUplcProgram(...args);
    return this;
  }
  wasModified() {
    this.txb.wasModified();
  }
  _builtTx;
  get builtTx() {
    this.noFacade("builtTx");
    if (!this._builtTx) {
      throw new Error(`can't go building the tx willy-nilly`);
    }
    return this._builtTx;
  }
  async addSignature(wallet) {
    this.noFacade("addSignature");
    const builtTx = await this.builtTx;
    const sig = await wallet.signTx(builtTx);
    builtTx.addSignature(sig[0]);
  }
  hasAuthorityToken(authorityValue) {
    return this.inputs.some(
      (i) => i.value.isGreaterOrEqual(authorityValue)
    );
  }
  async findAnySpareUtxos() {
    this.noFacade("findAnySpareUtxos");
    const mightNeedFees = 3500000n;
    const toSortInfo = this.uh.mkUtxoSortInfo(mightNeedFees);
    const notReserved = this.utxoNotReserved.bind(this) || ((u) => u);
    const uh = this.uh;
    return uh.findActorUtxo(
      "spares for tx balancing",
      notReserved,
      {
        wallet: this.wallet,
        dumpDetail: "onFail"
      },
      "multiple"
    ).then(async (utxos) => {
      if (!utxos) {
        throw new Error(
          `no utxos found for spares for tx balancing.  We can ask the user to send a series of 10, 11, 12, ... ADA to themselves or do it automatically`
        );
      }
      const allSpares = utxos.map(toSortInfo).filter(uh.utxoIsSufficient).sort(uh.utxoSortSmallerAndPureADA);
      if (allSpares.reduce(uh.reduceUtxosCountAdaOnly, 0) > 0) {
        return allSpares.filter(uh.utxoIsPureADA).map(uh.sortInfoBackToUtxo);
      }
      return allSpares.map(uh.sortInfoBackToUtxo);
    });
  }
  async findChangeAddr() {
    this.noFacade("findChangeAddr");
    const wallet = this.actorContext.wallet;
    if (!wallet) {
      throw new Error(
        `\u26A0\uFE0F  ${this.constructor.name}: no this.actorContext.wallet; can't get required change address!`
      );
    }
    let unused = (await wallet.unusedAddresses).at(0);
    if (!unused) unused = (await wallet.usedAddresses).at(-1);
    if (!unused)
      throw new Error(
        `\u26A0\uFE0F  ${this.constructor.name}: can't find a good change address!`
      );
    return unused;
  }
  /**
   * Adds required signers to the transaction context
   * @remarks
   * Before a transaction can be submitted, signatures from each of its signers must be included.
   *
   * Any inputs from the wallet are automatically added as signers, so addSigners() is not needed
   * for those.
   */
  async addSigners(...signers) {
    this.noFacade("addSigners");
    this.allNeededWitnesses.push(...signers);
  }
  async build({
    signers = [],
    addlTxInfo = {
      description: this.txnName ? ": " + this.txnName : ""
    },
    beforeValidate,
    paramsOverride,
    expectError
  } = {}) {
    this.noFacade("build");
    console.timeStamp?.(`submit() txn ${this.txnName}`);
    console.log("tcx build() @top");
    if (!this._validityPeriodSet) {
      this.validFor(12 * 60 * 1e3);
    }
    let { description } = addlTxInfo;
    if (description && !description.match(/^:/)) {
      description = ": " + description;
    }
    const {
      actorContext: { wallet }
    } = this;
    let walletMustSign = false;
    let tx;
    const logger = this.logger;
    if (wallet || signers.length) {
      console.timeStamp?.(`submit(): findChangeAddr()`);
      const changeAddress = await this.findChangeAddr();
      console.timeStamp?.(`submit(): findAnySpareUtxos()`);
      const spares = await this.findAnySpareUtxos();
      const willSign = [...signers, ...this.allNeededWitnesses].map((addrOrPkh) => {
        if (addrOrPkh.kind == "PubKeyHash") {
          return addrOrPkh;
        } else if (addrOrPkh.kind == "Address") {
          if (addrOrPkh.era == "Shelley") {
            return addrOrPkh.spendingCredential.kind == "PubKeyHash" ? addrOrPkh.spendingCredential : void 0;
          } else {
            return void 0;
          }
        } else {
          return void 0;
        }
      }).filter((pkh) => !!pkh).flat(1);
      console.timeStamp?.(`submit(): addSIgners()`);
      this.txb.addSigners(...willSign);
      const wHelper = wallet && makeWalletHelper(wallet);
      const othersMustSign = [];
      if (wallet && wHelper) {
        for (const a of willSign) {
          if (await wHelper.isOwnAddress(a)) {
            walletMustSign = true;
          } else {
            othersMustSign.push(a);
          }
        }
        this.otherPartySigners = othersMustSign;
        const inputs = this.txb.inputs;
        if (!inputs) throw new Error(`no inputs in txn`);
        for (const input of inputs) {
          if (!await wHelper.isOwnAddress(input.address)) continue;
          this.allNeededWitnesses.push(input.address);
          walletMustSign = true;
          const pubKeyHash = input.address.pubKeyHash;
          if (pubKeyHash) {
            this.txb.addSigners(pubKeyHash);
          }
        }
      } else {
        console.warn(
          "txn build: no wallet/helper available for txn signining (debugging breakpoint available)"
        );
        debugger;
      }
      let capturedCosts = {
        total: { cpu: 0n, mem: 0n },
        slush: { cpu: 0n, mem: 0n }
      };
      const inputValues = this.inputs.map((i) => i.value.assets).reduce((a, b) => a.add(b), makeAssets());
      const outputValues = this.outputs.map((o) => o.value.assets).reduce((a, b) => a.add(b), makeAssets());
      const mintValues = this.txb.mintedTokens;
      const netTxAssets = inputValues.add(mintValues).subtract(outputValues);
      if (!netTxAssets.isZero()) {
        console.log(
          "tx imbalance=" + dumpAny(netTxAssets, this.networkParams)
        );
      }
      try {
        tx = await this.txb.buildUnsafe({
          changeAddress,
          spareUtxos: spares,
          networkParams: {
            ...this.networkParams,
            ...paramsOverride
          },
          logOptions: logger,
          beforeValidate,
          modifyExBudget: (txi, purpose, index, costs) => {
            capturedCosts[`${purpose} @${1 + index}`] = {
              ...costs
            };
            const cpuSlush = BigInt(250000000n);
            const memSlush = BigInt(50000n);
            capturedCosts.slush.cpu += cpuSlush;
            capturedCosts.slush.mem += memSlush;
            costs.cpu += cpuSlush;
            costs.mem += memSlush;
            capturedCosts.total.cpu += costs.cpu;
            capturedCosts.total.mem += costs.mem;
            if ("minting" == purpose) purpose = "minting ";
            return costs;
          }
        });
        this._builtTx = tx;
        this.txb.validToTime;
        //!!! todo: come back to this later.  Blockfrost's endpoint for this
      } catch (e) {
        e.message += "; txn build failed (debugging breakpoint available)\n" + (netTxAssets.isZero() ? "" : "tx imbalance=" + dumpAny(netTxAssets, this.networkParams)) + `  inputs: ${dumpAny(this.inputs)}
  outputs: ${dumpAny(this.outputs)}
  mint: ${dumpAny(this.txb.mintedTokens)}
  refInputs: ${dumpAny(this.txRefInputs)}
`;
        logger.logError(`txn build failed: ${e.message}`);
        if (tx) logger.logPrint(dumpAny(tx));
        logger.logError(
          `  (it shouldn't be possible for buildUnsafe to be throwing errors!)`
        );
        logger.flushError();
        throw e;
      }
      if (tx.hasValidationError) {
        const e = tx.hasValidationError;
        let heliosStack = e.stack?.split("\n") || void 0;
        heliosStack = heliosStack?.map((line) => {
          if (line.match(/<helios>@at/)) {
            line = line.replace(
              /<helios>@at /,
              "   ... in helios function "
            ).replace(
              /, \[(.*)\],/,
              (_, bracketed) => ``
              // ` with scope [\n        ${
              //     bracketed.replace(/, /g, ",\n        ")
              // }\n      ]`
            );
          }
          return line;
        });
        debugger;
        const scriptContext = "string" == typeof e ? void 0 : e.scriptContext;
        logger.logError(
          `tx validation failure: 
  \u274C ${//@ts-expect-error
          tx.hasValidationError.message || tx.hasValidationError}
` + (heliosStack?.join("\n") || "")
        );
        logger.flush();
        const ctxCbor = scriptContext?.toCbor();
        const cborHex = ctxCbor ? bytesToHex(ctxCbor) : "";
        if (!expectError) {
          console.log(
            cborHex ? "------------------- failed ScriptContext as cbor-hex -------------------\n" + cborHex + "\n" : "",
            "------------------- failed tx as cbor-hex -------------------\n" + bytesToHex(tx.toCbor()),
            "\n------------------^ failed tx details ^------------------\n(debugging breakpoint available)"
          );
        }
      }
      return {
        tx,
        willSign,
        walletMustSign,
        wallet,
        wHelper,
        costs: capturedCosts
      };
    } else {
      throw new Error("no 'actorContext.wallet'; can't make  a txn");
    }
  }
  log(...msgs) {
    if (msgs.length > 1) {
      debugger;
      throw new Error(`no multi-arg log() calls`);
    }
    this.logger.logPrint(msgs[0]);
    return this;
  }
  flush() {
    this.logger.flush();
    return this;
  }
  finish() {
    this.logger.finish();
    return this;
  }
  /**
   * Submits the current transaction and any additional transactions in the context.
   * @remarks
   * To submit only the current transaction, use the `submit()` method.
   *
   * Uses the TxBatcher to create a new batch of transactions.  This new batch
   * overlays a TxChainBuilder on the current network-client, using that facade
   * to provide utxos for chained transactions in the batch.
   *
   * The signers array can be used to add additional signers to the transaction, and
   * is passed through to the submit() for the current txn only; it is not used for
   * any additional transactions.
   *
   * The beforeSubmit, onSubmitted callbacks are used for each additional transaction.
   *
   * beforeSubmit can be used to notify the user of the transaction about to be submitted,
   * and can also be used to add additional signers to the transaction or otherwise modify
   * it (by returning the modified transaction).
   *
   * onSubmitted can be used to notify the user that the transaction has been submitted,
   * or for logging or any other post-submission processing.
   */
  async submitAll(options = {}) {
    const currentBatch = this.currentBatch;
    currentBatch?.isOpen;
    //!!! remove because it's already done in the constructor?
    //!!! ^^^ remove?
    return this.buildAndQueueAll(options).then((batch) => {
      return batch;
    });
  }
  /**
   * augments a transaction context with a type indicator
   * that it has additional transactions to be submitted.
   * @public
   * @remarks
   * The optional argument can also be used to include additional
   * transactions to be chained after the current transaction.
   */
  withAddlTxns(addlTxns = {}) {
    this.state.addlTxns = this.state.addlTxns || {};
    for (const [name, txn] of Object.entries(addlTxns)) {
      this.includeAddlTxn(name, txn);
    }
    return this;
  }
  async buildAndQueueAll(options = {}) {
    const {
      addlTxInfo = {
        description: this.txnName ? this.txnName : "\u2039unnamed tx\u203A",
        id: this.id,
        tcx: this
      },
      ...generalSubmitOptions
    } = options;
    if (options.paramsOverride) {
      console.warn(
        "\u26A0\uFE0F  paramsOverride can be useful for extreme cases \nof troubleshooting tx execution by submitting an oversized tx \nwith unoptimized contract scripts having diagnostic print/trace calls\nto a custom preprod node having overloaded network params, thus allowing \nsuch a transaction to be evaluated end-to-end by the Haskell evaluator using \nthe cardano-node's script-budgeting mini-protocol.\n\nThis will cause problems for regular transactions (such as requiring very large collateral)Be sure to remove any params override if you're not dealing with \none of those very special situations. \n"
      );
      debugger;
    }
    if (this.isFacade == false) {
      return this.buildAndQueue({
        ...generalSubmitOptions,
        addlTxInfo
      }).then(() => {
        if (this.state.addlTxns) {
          console.log(
            `\u{1F384}\u26C4\u{1F381} ${this.id}   -- B&QA - registering addl txns`
          );
          return this.queueAddlTxns(options).then(() => {
            return this.currentBatch;
          });
        }
        return this.currentBatch;
      });
    } else if (this.state.addlTxns) {
      if (this.isFacade) {
        this.currentBatch.$txInfo(this.id)?.transition("isFacade");
      }
      console.log(
        `\u{1F384}\u26C4\u{1F381} ${this.id}   -- B&QA - registering txns in facade`
      );
      return this.queueAddlTxns(generalSubmitOptions).then(() => {
        return this.currentBatch;
      });
    }
    console.warn(`\u26A0\uFE0F  submitAll(): no txns to queue/submit`, this);
    throw new Error(
      `unreachable? -- nothing to do for submitting this tcx`
    );
  }
  get currentBatch() {
    return this.setup.txBatcher.current;
  }
  /**
   * Submits only the current transaction.
   * @remarks
   * To also submit additional transactions, use the `submitAll()` method.
   */
  async buildAndQueue(submitOptions = {}) {
    let {
      signers = [],
      addlTxInfo,
      paramsOverride,
      expectError,
      beforeError,
      beforeValidate,
      whenBuilt,
      fixupBeforeSubmit,
      onSubmitError,
      onSubmitted
    } = submitOptions;
    this.noFacade("submit");
    if (!addlTxInfo) {
      debugger;
      throw new Error(`expecting addlTxInfo to be passed`);
    }
    const {
      logger,
      setup: { network }
    } = this;
    const {
      tx,
      willSign,
      walletMustSign,
      wallet,
      wHelper,
      costs = {
        total: { cpu: 0n, mem: 0n }
      }
    } = await this.build({
      signers,
      paramsOverride,
      addlTxInfo,
      beforeValidate,
      expectError
    });
    let { description, id } = addlTxInfo;
    if (!id) {
      id = addlTxInfo.id = this.id;
    }
    const existing = this.currentBatch.$txInfo(id);
    const existingInfo = existing?.txd || {};
    const addlTxInfo2 = {
      ...addlTxInfo,
      ...existingInfo,
      // tx,
      tcx: this
    };
    const txStats = {
      costs,
      wallet,
      walletMustSign,
      wHelper,
      willSign
    };
    const errMsg = tx.hasValidationError && tx.hasValidationError.toString();
    if (errMsg) {
      logger.logPrint(
        `\u26A0\uFE0F  txn validation failed: ${description}
${errMsg}
`
      );
      logger.logPrint(this.dump(tx));
      this.emitCostDetails(tx, costs);
      logger.flush();
      logger.logError(`FAILED submitting tx: ${description}`);
      logger.logPrint(errMsg);
      if (expectError) {
        logger.logPrint(
          `

\u{1F4A3}\u{1F389} \u{1F4A3}\u{1F389} \u{1F389} \u{1F389} transaction failed (as expected)`
        );
      }
      const txErrorDescription = {
        ...addlTxInfo2,
        tcx: this,
        error: errMsg,
        tx,
        stats: txStats,
        options: submitOptions,
        txCborHex: bytesToHex(tx.toCbor())
      };
      this.currentBatch.txError(txErrorDescription);
      let errorHandled;
      if (beforeError) {
        errorHandled = await beforeError(txErrorDescription);
      }
      logger.flushError();
      if (errMsg.match(
        /multi:Minting: only dgData activities ok in mintDgt/
      )) {
        console.log(
          `\u26A0\uFE0F  mint delegate for multiple activities should be given delegated-data activities, not the activities of the delegate`
        );
      }
      if (!errorHandled) {
        debugger;
        throw new Error(errMsg);
      }
    }
    for (const pkh of willSign) {
      if (!pkh) continue;
      if (tx.body.signers.find((s) => pkh.isEqual(s))) continue;
      throw new Error(
        `incontheeivable! all signers should have been added to the builder above`
      );
    }
    const txDescr = {
      ...addlTxInfo2,
      tcx: this,
      tx,
      txId: tx.id(),
      options: submitOptions,
      stats: txStats,
      txCborHex: bytesToHex(tx.toCbor())
    };
    const { currentBatch } = this;
    currentBatch.$txStates[id];
    logger.logPrint(`tx transcript: ${description}
`);
    logger.logPrint(this.dump(tx));
    this.emitCostDetails(tx, costs);
    logger.logPrint(`end: ${description}`);
    logger.flush();
    console.timeStamp?.(`tx: add to current-tx-batch`);
    console.log("add to current batch", { whenBuilt });
    currentBatch.$addTxns(txDescr);
    this.setup.chainBuilder?.with(txDescr.tx);
    await whenBuilt?.(txDescr);
  }
  emitCostDetails(tx, costs) {
    const { logger } = this;
    const {
      maxTxExCpu,
      maxTxExMem,
      maxTxSize,
      //@ts-expect-error on our synthetic attributes
      origMaxTxSize = maxTxSize,
      //@ts-expect-error on our synthetic attributes
      origMaxTxExMem = maxTxExMem,
      //@ts-expect-error on our synthetic attributes
      origMaxTxExCpu = maxTxExCpu,
      exCpuFeePerUnit,
      exMemFeePerUnit,
      txFeePerByte,
      txFeeFixed
    } = this.networkParams;
    const oMaxSize = origMaxTxSize;
    const oMaxMem = origMaxTxExMem;
    const oMaxCpu = origMaxTxExCpu;
    const { total, ...otherCosts } = costs;
    const txSize = tx.calcSize();
    Number(tx.calcMinFee(this.networkParams));
    const txFee = tx.body.fee;
    const cpuFee = BigInt((Number(total.cpu) * exCpuFeePerUnit).toFixed(0));
    const memFee = BigInt((Number(total.mem) * exMemFeePerUnit).toFixed(0));
    const sizeFee = BigInt(txSize * txFeePerByte);
    const nCpu = Number(total.cpu);
    const nMem = Number(total.mem);
    let refScriptSize = 0;
    for (const anyInput of [...tx.body.inputs, ...tx.body.refInputs]) {
      const refScript = anyInput.output.refScript;
      if (refScript) {
        const scriptSize = refScript.toCbor().length;
        refScriptSize += scriptSize;
      }
    }
    let multiplier = 1;
    let refScriptsFee = 0n;
    let refScriptsFeePerByte = this.networkParams.refScriptsFeePerByte;
    let refScriptCostDetails = [];
    const tierSize = 25600;
    let alreadyConsumed = 0;
    for (let tier = 0; tier * tierSize < refScriptSize; tier += 1, multiplier *= 1.2) {
      const consumedThisTier = Math.min(
        tierSize,
        refScriptSize - alreadyConsumed
      );
      alreadyConsumed += consumedThisTier;
      const feeThisTier = Math.round(
        consumedThisTier * multiplier * refScriptsFeePerByte
      );
      refScriptsFee += BigInt(feeThisTier);
      refScriptCostDetails.push(
        `
      -- refScript tier${1 + tier} (${consumedThisTier} \xD7 ${multiplier}) \xD7${refScriptsFeePerByte} = ${lovelaceToAda(
          feeThisTier
        )}`
      );
    }
    const fixedTxFeeBigInt = BigInt(txFeeFixed);
    const remainderUnaccounted = txFee - cpuFee - memFee - sizeFee - fixedTxFeeBigInt - refScriptsFee;
    if (nCpu > oMaxCpu || nMem > oMaxMem || txSize > oMaxSize) {
      logger.logPrint(
        `\u{1F525}\u{1F525}\u{1F525}\u{1F525}  THIS TX EXCEEDS default (overridden in test env) limits on network params  \u{1F525}\u{1F525}\u{1F525}\u{1F525}
  -- cpu ${intWithGrouping(nCpu)} = ${(100 * nCpu / oMaxCpu).toFixed(1)}% of ${intWithGrouping(
          oMaxCpu
        )} (patched to ${intWithGrouping(maxTxExCpu)})
  -- mem ${nMem} = ${(100 * nMem / oMaxMem).toFixed(
          1
        )}% of ${intWithGrouping(
          oMaxMem
        )} (patched to ${intWithGrouping(maxTxExMem)})
  -- tx size ${intWithGrouping(txSize)} = ${(100 * txSize / oMaxSize).toFixed(1)}% of ${intWithGrouping(
          oMaxSize
        )} (patched to ${intWithGrouping(maxTxSize)})
`
      );
    }
    const scriptBreakdown = Object.keys(otherCosts).length > 0 ? `
    -- per script (with % blame for actual costs):` + Object.entries(otherCosts).map(
      ([key, { cpu, mem }]) => `
      -- ${key}: cpu ${lovelaceToAda(
        Number(cpu) * exCpuFeePerUnit
      )} = ${(Number(cpu) / Number(total.cpu) * 100).toFixed(1)}%, mem ${lovelaceToAda(
        Number(mem) * exMemFeePerUnit
      )} = ${(Number(mem) / Number(total.mem) * 100).toFixed(1)}%`
    ).join("") : "";
    logger.logPrint(
      `costs: ${lovelaceToAda(txFee)}
  -- fixed fee = ${lovelaceToAda(txFeeFixed)}
  -- tx size fee = ${lovelaceToAda(sizeFee)} (${intWithGrouping(txSize)} bytes = ${(Number(1e3 * txSize / oMaxSize) / 10).toFixed(1)}% of tx size limit)
  -- refScripts fee = ${lovelaceToAda(refScriptsFee)}` + refScriptCostDetails.join("") + `
  -- scripting costs
    -- cpu units ${intWithGrouping(total.cpu)} = ${lovelaceToAda(cpuFee)} (${(Number(1000n * total.cpu / BigInt(oMaxCpu)) / 10).toFixed(1)}% of cpu limit/tx)
    -- memory units ${intWithGrouping(total.mem)} = ${lovelaceToAda(memFee)} (${(Number(1000n * total.mem / BigInt(oMaxMem)) / 10).toFixed(1)}% of mem limit/tx)` + scriptBreakdown + `
  -- remainder ${lovelaceToAda(
        remainderUnaccounted
      )} unaccounted-for`
    );
  }
  /**
   * Executes additional transactions indicated by an existing transaction
   * @remarks
   *
   * During the off-chain txn-creation process, additional transactions may be
   * queued for execution.  This method is used to register those transactions,
   * along with any chained transactions THEY may trigger.
   *
   * The TxBatcher and batch-controller classes handle wallet-signing
   * and submission of the transactions for execution.
   * @public
   **/
  async queueAddlTxns(pipelineOptions) {
    const { addlTxns } = this.state;
    if (!addlTxns) return;
    return this.submitTxnChain({
      ...pipelineOptions,
      txns: Object.values(addlTxns)
    });
  }
  /**
   * Resolves a list of tx descriptions to full tcx's, without handing any of their
   * any chained/nested txns.
   * @remarks
   * if submitEach is provided, each txn will be submitted as it is resolved.
   * If submitEach is not provided, then the network must be capable of tx-chaining
   * use submitTxnChain() to submit a list of txns with chaining
   */
  async resolveMultipleTxns(txns, pipelineOptions) {
    for (const [txName, addlTxInfo] of Object.entries(txns)) {
      const { id } = addlTxInfo;
      let txTracker = this.currentBatch.$txInfo(id);
      if (!txTracker) {
        this.currentBatch.$addTxns(addlTxInfo);
        txTracker = this.currentBatch.$txInfo(id);
      }
    }
    await new Promise((res) => setTimeout(res, 5));
    for (const [txName, addlTxInfo] of Object.entries(txns)) {
      const { id, depth, parentId } = addlTxInfo;
      let txTracker = this.currentBatch.$txInfo(id);
      txTracker.$transition("building");
      await new Promise((res) => setTimeout(res, 5));
      const txInfoResolved = addlTxInfo;
      const { txName: txName2, description } = txInfoResolved;
      let alreadyPresent = void 0;
      console.log("  -- before: " + description);
      const tcx = "function" == typeof addlTxInfo.mkTcx ? await (async () => {
        console.log(
          "  creating TCX just in time for: " + description
        );
        const tcx2 = await addlTxInfo.mkTcx();
        tcx2.parentId = parentId || "";
        tcx2.depth = depth;
        if (id) {
          this.currentBatch.changeTxId(id, tcx2.id);
          txInfoResolved.id = tcx2.id;
        } else {
          addlTxInfo.id = tcx2.id;
          console.warn(
            `expected id to be set on addlTxInfo; falling back to JIT-generated id in new tcx`
          );
        }
        return tcx2;
      })().catch((e) => {
        if (e instanceof TxNotNeededError) {
          alreadyPresent = e;
          const tcx2 = new StellarTxnContext(
            this.setup
          ).withName(
            `addlTxInfo already present: ${description}`
          );
          tcx2.alreadyPresent = alreadyPresent;
          return tcx2;
        }
        throw e;
      }) : (() => {
        console.log(
          "  ---------------- warning!!!! addlTxInfo is already built!"
        );
        debugger;
        throw new Error(" unreachable - right?");
      })();
      if ("undefined" == typeof tcx) {
        throw new Error(
          `no txn provided for addlTx ${txName2 || description}`
        );
      }
      txInfoResolved.tcx = tcx;
      if (tcx.alreadyPresent) {
        console.log(
          "  -- tx effects are already present; skipping: " + txName2 || description
        );
        this.currentBatch.$addTxns(txInfoResolved);
        continue;
      }
      const replacementTcx = pipelineOptions?.fixupBeforeSubmit && await pipelineOptions.fixupBeforeSubmit(
        txInfoResolved
      ) || tcx;
      if (false === replacementTcx) {
        console.log("callback cancelled txn: ", txName2);
        continue;
      }
      if (replacementTcx !== true && replacementTcx !== tcx) {
        console.log(
          `callback replaced txn ${txName2} with a different txn: `,
          dumpAny(replacementTcx)
        );
      }
      const effectiveTcx = true === replacementTcx ? tcx : replacementTcx || tcx;
      txInfoResolved.tcx = effectiveTcx;
      //!!! was just buildAndQueue, but that was executing
      await effectiveTcx.buildAndQueueAll({
        ...pipelineOptions,
        addlTxInfo: txInfoResolved
      });
    }
  }
  /**
   * To add a script to the transaction context, use `attachScript`
   *
   * @deprecated - invalid method name; use `addScriptProgram()` or capo's `txnAttachScriptOrRefScript()` method
   **/
  addScript() {
  }
  async submitTxnChain(options = {
    //@ts-expect-error because the type of this context doesn't
    //   guarantee the presence of addlTxns.  But it might be there!
    txns: this.state.addlTxns || []
  }) {
    const addlTxns = this.state.addlTxns;
    const { txns, onSubmitError } = options;
    const newTxns = txns || addlTxns || [];
    const txChainSubmitOptions = {
      onSubmitError,
      // txns,  // see newTxns
      fixupBeforeSubmit: (txinfo) => {
        options.fixupBeforeSubmit?.(txinfo);
      },
      whenBuilt: async (txinfo) => {
        const { id: parentId, tx } = txinfo;
        const stackedPromise = options.whenBuilt?.(txinfo);
        const more = (
          //@ts-expect-error on optional prop
          txinfo.tcx.state.addlTxns || {}
        );
        console.log("  \u2705 " + txinfo.description);
        const moreTxns = Object.values(more);
        for (const nested of moreTxns) {
          nested.parentId = parentId;
        }
        console.log(
          `\u{1F384}\u26C4\u{1F381} ${parentId}   -- registering nested txns ASAP`
        );
        this.currentBatch.$addTxns(moreTxns);
        await new Promise((res) => setTimeout(res, 5));
        return stackedPromise;
      },
      onSubmitted: (txinfo) => {
        this.setup.network.tick?.(1);
      }
    };
    const isolatedTcx = new StellarTxnContext(this.setup);
    console.log("\u{1F41D}\u{1F63E}\u{1F43B}\u{1F980}");
    isolatedTcx.id = this.id;
    console.log(
      "at d=0: submitting addl txns: \n" + newTxns.map((t2) => `  \u{1F7E9} ${t2.description}
`).join("")
    );
    const t = isolatedTcx.resolveMultipleTxns(
      newTxns,
      txChainSubmitOptions
    );
    await t;
    return;
  }
}

let p = typeof process == "undefined" ? {
  platform: "browser",
  argv: [],
  env: {}
} : process, argv = p.argv, env = p.env;
let isColorSupported = !(!!env.NO_COLOR || argv.includes("--no-color")) && (!!env.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || true);
let formatter = (open, close, replace = open) => {
  const f = (input) => {
    let string = "" + input, index = string.indexOf(close, open.length);
    return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
  };
  f.start = open;
  f.close = close;
  return f;
};
let replaceClose = (string, close, replace, index) => {
  let result = "", cursor = 0;
  do {
    result += string.substring(cursor, index) + replace;
    cursor = index + close.length;
    index = string.indexOf(close, cursor);
  } while (~index);
  return result + string.substring(cursor);
};
let createColors = (enabled = isColorSupported) => {
  let f = enabled ? formatter : () => String;
  return {
    isColorSupported: enabled,
    reset: f("\x1B[0m", "\x1B[0m"),
    bold: f("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
    dim: f("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
    italic: f("\x1B[3m", "\x1B[23m"),
    underline: f("\x1B[4m", "\x1B[24m"),
    inverse: f("\x1B[7m", "\x1B[27m"),
    hidden: f("\x1B[8m", "\x1B[28m"),
    strikethrough: f("\x1B[9m", "\x1B[29m"),
    black: f("\x1B[30m", "\x1B[39m"),
    red: f("\x1B[31m", "\x1B[39m"),
    green: f("\x1B[32m", "\x1B[39m"),
    yellow: f("\x1B[33m", "\x1B[39m"),
    blue: f("\x1B[34m", "\x1B[39m"),
    magenta: f("\x1B[35m", "\x1B[39m"),
    cyan: f("\x1B[36m", "\x1B[39m"),
    white: f("\x1B[37m", "\x1B[39m"),
    gray: f("\x1B[90m", "\x1B[39m"),
    bgBlack: f("\x1B[40m", "\x1B[49m"),
    bgRed: f("\x1B[41m", "\x1B[49m"),
    bgGreen: f("\x1B[42m", "\x1B[49m"),
    bgYellow: f("\x1B[43m", "\x1B[49m"),
    bgBlue: f("\x1B[44m", "\x1B[49m"),
    bgMagenta: f("\x1B[45m", "\x1B[49m"),
    bgCyan: f("\x1B[46m", "\x1B[49m"),
    bgWhite: f("\x1B[47m", "\x1B[49m"),
    blackBright: f("\x1B[90m", "\x1B[39m"),
    redBright: f("\x1B[91m", "\x1B[39m"),
    greenBright: f("\x1B[92m", "\x1B[39m"),
    yellowBright: f("\x1B[93m", "\x1B[39m"),
    blueBright: f("\x1B[94m", "\x1B[39m"),
    magentaBright: f("\x1B[95m", "\x1B[39m"),
    cyanBright: f("\x1B[96m", "\x1B[39m"),
    whiteBright: f("\x1B[97m", "\x1B[39m"),
    bgBlackBright: f("\x1B[100m", "\x1B[49m"),
    bgRedBright: f("\x1B[101m", "\x1B[49m"),
    bgGreenBright: f("\x1B[102m", "\x1B[49m"),
    bgYellowBright: f("\x1B[103m", "\x1B[49m"),
    bgBlueBright: f("\x1B[104m", "\x1B[49m"),
    bgMagentaBright: f("\x1B[105m", "\x1B[49m"),
    bgCyanBright: f("\x1B[106m", "\x1B[49m"),
    bgWhiteBright: f("\x1B[107m", "\x1B[49m")
  };
};
const colors = createColors();

class TxNotNeededError extends Error {
  constructor(message) {
    super(message);
    this.name = "TxAlreadyPresentError";
  }
}
function isLibraryMatchedTcx(arg) {
  if (arg instanceof StellarTxnContext) {
    return true;
  }
  if (arg.kind === "StellarTxnContext") {
    throw new Error("Stellar Contracts: library mismatch detected.  Ensure you're using only one version of the library");
  }
  return false;
}
function checkValidUTF8(data) {
  let i = 0;
  while (i < data.length) {
    if ((data[i] & 128) === 0) {
      i++;
    } else if ((data[i] & 224) === 192) {
      if (i + 1 >= data.length || (data[i + 1] & 192) !== 128) return false;
      i += 2;
    } else if ((data[i] & 240) === 224) {
      if (i + 2 >= data.length || (data[i + 1] & 192) !== 128 || (data[i + 2] & 192) !== 128) return false;
      i += 3;
    } else if ((data[i] & 248) === 240) {
      if (i + 3 >= data.length || (data[i + 1] & 192) !== 128 || (data[i + 2] & 192) !== 128 || (data[i + 3] & 192) !== 128) return false;
      i += 4;
    } else {
      return false;
    }
  }
  return isValidUtf8(data);
}

const { magenta } = colors;
class SimpleWallet_stellar {
  networkCtx;
  spendingPrivateKey;
  spendingPubKey;
  stakingPrivateKey;
  stakingPubKey;
  get cardanoClient() {
    return this.networkCtx.network;
  }
  static fromPhrase(phrase, networkCtx, dict = BIP39_DICT_EN) {
    return SimpleWallet_stellar.fromRootPrivateKey(
      restoreRootPrivateKey(phrase, dict),
      networkCtx
    );
  }
  // REQT/fppjhaq32f (Derive spending key from root private key)
  static fromRootPrivateKey(key, networkCtx) {
    return new SimpleWallet_stellar(
      networkCtx,
      key.deriveSpendingKey(),
      key.deriveStakingKey()
    );
  }
  // REQT/zhas8edv7d (Support optional staking key derivation)
  constructor(networkCtx, spendingPrivateKey, stakingPrivateKey = void 0) {
    this.networkCtx = networkCtx;
    this.spendingPrivateKey = spendingPrivateKey;
    this.spendingPubKey = this.spendingPrivateKey.derivePubKey();
    this.stakingPrivateKey = stakingPrivateKey;
    this.stakingPubKey = this.stakingPrivateKey?.derivePubKey();
  }
  get privateKey() {
    return this.spendingPrivateKey;
  }
  get pubKey() {
    return this.spendingPubKey;
  }
  get spendingPubKeyHash() {
    return this.spendingPubKey.hash();
  }
  get stakingPubKeyHash() {
    return this.stakingPubKey?.hash();
  }
  get address() {
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
      return void 0;
    }
  }
  get stakingAddresses() {
    return new Promise((resolve, _) => {
      const stakingAddress = this.stakingAddress;
      resolve(stakingAddress ? [stakingAddress] : []);
    });
  }
  async isMainnet() {
    return this.networkCtx.network.isMainnet();
  }
  /**
   * Assumed wallet was initiated with at least 1 UTxO at the pubkeyhash address.
   */
  get usedAddresses() {
    return new Promise((resolve, _) => {
      resolve([this.address]);
    });
  }
  get unusedAddresses() {
    return new Promise((resolve, _) => {
      resolve([]);
    });
  }
  // REQT/2a0ffb3cd3 (Query UTxOs from associated network context)
  get utxos() {
    return new Promise((resolve, _) => {
      resolve(this.cardanoClient.getUtxos(this.address));
    });
  }
  get collateral() {
    return new Promise((resolve, _) => {
      resolve([]);
    });
  }
  async signData(addr, data) {
    const spendingCredential = addr.spendingCredential;
    const stakingCredential = addr.stakingCredential;
    if (stakingCredential) {
      if (!addr.isEqual(this.address)) {
        throw new Error(
          "givend address doesn't correspond to SimpleWallet's address"
        );
      }
      const pubKey = expectDefined(this.stakingPubKey);
      const privateKey = expectDefined(this.stakingPrivateKey);
      return {
        signature: signCip30CoseData(addr, privateKey, data),
        key: pubKey
      };
    } else {
      if (!spendingCredential.isEqual(this.address.spendingCredential)) {
        throw new Error(
          "given address.spendingCredential doesn't correspond to SimpleWallet's spending credential"
        );
      }
      return {
        signature: signCip30CoseData(
          addr,
          this.spendingPrivateKey,
          data
        ),
        key: this.spendingPubKey
      };
    }
  }
  /**
   * Simply assumed the tx needs to by signed by this wallet without checking.
   * REQT/9cvn4evfpn (Sign transactions with spending private key)
   */
  async signTx(tx) {
    return [this.spendingPrivateKey.sign(tx.body.hash())];
  }
  async submitTx(tx) {
    return await this.cardanoClient.submitTx(tx);
  }
}
let i = 1;
class StellarNetworkEmulator {
  #seed;
  #random;
  genesis;
  mempool;
  /** REQT/9ted2tk8a3 (Store blocks as array of transaction arrays) */
  blocks;
  blockHashes;
  /**
   * Cached map of all UTxOs ever created.
   * Implements REQT/49h2ekt53d (O(1) UTxO lookup by ID).
   * @internal
   */
  _allUtxos;
  /**
   * Cached set of all UTxOs ever consumed.
   * Implements REQT/f9va8cpejn (Track consumed UTxOs).
   * @internal
   */
  _consumedUtxos;
  /**
   * Cached map of UTxOs at addresses.
   * Implements REQT/8cp2p83gdn (Address-based queries).
   * @internal
   */
  _addressUtxos;
  id;
  params;
  /**
   * Instantiates a NetworkEmulator at slot 0.
   * An optional seed number can be specified, from which all EMULATED RANDOMNESS is derived.
   */
  constructor(seed = 0, { params } = {
    params: DEFAULT_NETWORK_PARAMS()
  }) {
    this.id = i++;
    this.params = params || DEFAULT_NETWORK_PARAMS();
    this.#seed = seed;
    this.currentSlot = 0;
    this.#random = this.mulberry32.bind(this);
    this.genesis = [];
    this.mempool = [];
    this.blocks = [];
    this.blockHashes = [];
    this._allUtxos = {};
    this._consumedUtxos = /* @__PURE__ */ new Set();
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
  get now() {
    return SECOND * this.currentSlot;
  }
  get parameters() {
    return new Promise((resolve, _) => resolve(this.parametersSync));
  }
  get parametersSync() {
    return {
      ...this.params,
      refTipSlot: this.currentSlot,
      refTipTime: this.now
    };
  }
  /**
   * retains continuity for the seed and the RNG through one or more snapshots.
   * @internal
   */
  mulberry32 = () => {
    //!!mutates vvvvvvvvvv this.#seed
    let t = this.#seed += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  netPHelper;
  initHelper() {
    this.netPHelper = makeNetworkParamsHelper(this.parametersSync);
    return this.netPHelper;
  }
  /**
   * Returns the hash of the last committed block, or "genesis" if no blocks.
   * Used for snapshot cache key computation.
   */
  get lastBlockHash() {
    return this.blockHashes.length > 0 ? this.blockHashes[this.blockHashes.length - 1] : "genesis";
  }
  /**
   * Ignores the genesis txs
   */
  get txIds() {
    const res = [];
    for (let block of this.blocks) {
      for (let tx of block) {
        if (tx.kind == "Regular") {
          res.push(tx.id());
        }
      }
    }
    return res;
  }
  /**
   * Captures network state for later restoration.
   * Implements REQT/egfb0jds34 (Snapshot Support).
   */
  snapshot(snapName) {
    if (this.mempool.length > 0) {
      throw new Error(`can't snapshot with pending txns`);
    }
    console.log(
      `        .---.
        |[X]|
 _.==._.""""".___n__
/ __ ___.-''-. _____b
|[__]  /."""".\\ _   |
|     // /""\\ \\\\_)  |
|     \\\\ \\__/ //    |
|      \\\`.__.'/     |
\\=======\`-..-'======/
 \`-----------------'   
            \u{1F4F8} \u{1F4F8} \u{1F4F8}   \u2588\u2588\u2588\u2588  \u{1F4F8} \u{1F4F8} \u{1F4F8}  #` + this.id,
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
      blockHashes: [...this.blockHashes],
      allUtxos: { ...this._allUtxos },
      consumedUtxos: new Set(this._consumedUtxos),
      addressUtxos: Object.fromEntries(
        Object.entries(this._addressUtxos).map(([addr, utxoList]) => [
          addr,
          [...utxoList]
        ])
      )
    };
  }
  fromSnapshot = "";
  /**
   * Restores network state from a snapshot.
   * Implements REQT/473wtxxe8d (Fully restore all captured state).
   */
  loadSnapshot(snapshot) {
    this.mempool = [];
    this.#seed = snapshot.seed;
    this.currentSlot = snapshot.slot;
    this.genesis = [...snapshot.genesis];
    this.blocks = [...snapshot.blocks];
    this.blockHashes = [...snapshot.blockHashes || []];
    this.fromSnapshot = snapshot.name;
    this._allUtxos = { ...snapshot.allUtxos };
    this._consumedUtxos = new Set(snapshot.consumedUtxos);
    this._addressUtxos = Object.fromEntries(
      Object.entries(snapshot.addressUtxos).map(([addr, utxoList]) => [
        addr,
        [...utxoList]
      ])
    );
    const parentBlockCount = snapshot.parentBlockCount ?? 0;
    const parentBlocks = this.blocks.slice(0, parentBlockCount);
    const incrementalBlocks = this.blocks.slice(parentBlockCount);
    const totalTxs = parentBlocks.reduce((sum, block) => sum + block.length, 0);
    const newBlocks = incrementalBlocks.length;
    const newTxns = incrementalBlocks.reduce((sum, block) => sum + block.length, 0);
    const prevTxnCount = totalTxs;
    const blockViz = incrementalBlocks.map((block) => "\u{1F33A}" + "\u2588".repeat(block.length)).join(" ");
    const inheritedPart = parentBlockCount === 0 ? "[genesis]" : `[ ${parentBlockCount} blocks/${prevTxnCount} txs ]`;
    console.log(
      `
      .--.             .--.             .--.             .--.
    .'_\\/_'.         .'_\\/_'.         .'_\\/_'.         .'_\\/_'.
    '. /\\ .'         '. /\\ .'         '. /\\ .'         '. /\\ .'
      "||"             "||"             "||"             "||"
       || /\\            || /\\            || /\\            || /\\
    /\\ ||//\\)        /\\ ||//\\)        /\\ ||//\\)        /\\ ||//\\)
   (/\\\\||/          (/\\\\||/          (/\\\\||/          (/\\\\||/
______\\||/_____________\\||/_____________\\||/_____________\\||/_______
${inheritedPart} + ${newBlocks}b/${newTxns}t ${blockViz} 
`,
      ` - restored snapshot '${snapshot.name}' from #${snapshot.netNumber} at slot `,
      this.currentSlot.toString(),
      "height ",
      this.blocks.length
    );
    const realtimeSlot = this.netPHelper.timeToSlot(BigInt(Date.now()));
    const slotsToAdvance = realtimeSlot - this.currentSlot;
    if (slotsToAdvance > 0) {
      this.tick(slotsToAdvance);
    }
  }
  /**
   * Creates a new SimpleWallet and populates it with a given lovelace quantity and assets.
   * Special genesis transactions are added to the emulated chain in order to create these assets.
   * 
   * This is kept only to ensure compliance with Helios Emulator interface.
   * 
   * @deprecated - use TestHelper.createWallet instead, enabling wallets to be transported to
   *     different networks (e.g. ones that have loaded snapshots from the original network).
   */
  createWallet(lovelace = 0n, assets = makeAssets([])) {
    throw new Error("use TestHelper.createWallet instead");
  }
  /**
   * Creates a UTxO using a GenesisTx.  The txn doesn't need to balance or be signed.  It's magic.
   * @param wallet - the utxo is created at this wallet's address
   * @param lovelace - the lovelace amount to create
   * @param assets - other assets to include in the utxo
   */
  createUtxo(wallet, lovelace, assets = makeAssets([])) {
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
  async getUtxo(id) {
    this.warnMempool();
    const utxo = this._allUtxos[id.toString()];
    if (!utxo) {
      throw new Error(`utxo with id ${id.toString()} doesn't exist`);
    } else {
      return utxo;
    }
  }
  /*
   * @param {TxOutputId} id
   * @returns {Promise<TxInput>}
   */
  async hasUtxo(id) {
    try {
      return !!await this.getUtxo(id);
    } catch (e) {
      return false;
    }
  }
  async getUtxos(address) {
    this.warnMempool();
    return this._addressUtxos[address.toString()] ?? [];
  }
  isSubmissionExpiryError(e) {
    if (e.message.match(/slot out of range/)) return true;
    return false;
  }
  isUnknownUtxoError(e) {
    if (e.message.match(/previously consumed/)) return true;
    if (e.message.match(/don't exist/)) return true;
    return false;
  }
  dump() {
    console.log(`${this.blocks.length} BLOCKS`);
    this.blocks.forEach((block, i2) => {
      console.log(`${block.length} TXs in BLOCK ${i2}`);
      for (let tx of block) {
        tx.dump();
      }
    });
  }
  isConsumed(utxo) {
    return this._consumedUtxos.has(utxo.id.toString()) || this.mempool.some((tx) => {
      return tx.consumes(utxo);
    });
  }
  /**
   * Validates and submits a transaction to the mempool.
   * Implements REQT/qr6r27cg3q (Transaction Validation).
   */
  async submitTx(tx) {
    this.warnMempool();
    if (!tx.isValidSlot(BigInt(this.currentSlot))) {
      debugger;
      throw new Error(
        `tx invalid (slot out of range, ${this.currentSlot} not in ${tx.body.getValidityTimeRange(this.parametersSync).toString()})`
      );
    }
    if (!tx.body.inputs.every(
      (input) => input.id.toString() in this._allUtxos
    )) {
      throw new Error("some inputs don't exist");
    }
    if (!tx.body.refInputs.every(
      (input) => input.id.toString() in this._allUtxos
    )) {
      throw new Error("some ref inputs don't exist");
    }
    for (const input of tx.body.inputs) {
      if (this.isConsumed(input)) {
        throw new Error(
          `## ${this.id}: input previously consumed:` + dumpAny$1(input)
        );
      }
    }
    this.mempool.push(makeEmulatorRegularTx(tx));
    console.log(
      `[EmuNet #${this.id}] +mempool txn = ${this.mempool.length}`
    );
    return tx.id();
  }
  /**
   * Mint a block with the current mempool, and advance the slot by a number of slots.
   * Implements REQT/3286vdzwyk (Block Production).
   */
  tick(nSlots) {
    const n = BigInt(nSlots);
    if (n < 1) throw new Error(`nSlots must be > 0, got ${n.toString()}`);
    const count = this.mempool.length;
    this.currentSlot += Number(n);
    const time = new Date(
      Number(this.netPHelper.slotToTime(this.currentSlot))
    );
    if (this.mempool.length > 0) {
      const txIds = this.mempool.map((tx) => {
        const t = tx.id().toString();
        return `${t.substring(0, 2)}...${t.substring(t.length - 4)}`;
      });
      this.pushBlock(this.mempool);
      const height = this.blocks.length;
      this.mempool = [];
      console.log(
        magenta(`\u2588\u2588\u2588${"\u2592".repeat(
          count
        )} ${count} txns (${txIds.join(",")}) -> slot ${this.currentSlot.toString()} = ${formatDate(
          time
        )} @ht=${height}`)
      );
    } else {
      console.log(
        magenta(`tick -> slot ${this.currentSlot.toString()} = ${formatDate(
          time
        )} (no txns)`)
      );
    }
  }
  /**
   * Adds a block to the chain and updates UTxO state.
   * Implements REQT/5cwn151ybf (Update UTxO indices - create new, mark consumed),
   * REQT/9ted2tk8a3 (Store blocks as array of transaction arrays).
   * @internal
   */
  pushBlock(txs) {
    const prevHash = this.lastBlockHash;
    const txHashes = txs.map((tx) => tx.id().toString());
    const blockHash = bytesToHex(blake2b(encodeUtf8([prevHash, ...txHashes].join("\n"))));
    this.blockHashes.push(blockHash);
    this.blocks.push(txs);
    txs.forEach((tx) => {
      tx.newUtxos().forEach((utxo) => {
        const key = utxo.id.toString();
        this._allUtxos[key] = utxo;
        const addr = utxo.address.toString();
        if (addr in this._addressUtxos) {
          this._addressUtxos[addr].push(utxo);
        } else {
          this._addressUtxos[addr] = [utxo];
        }
      });
      tx.consumedUtxos().forEach((utxo) => {
        this._consumedUtxos.add(utxo.id.toString());
        const addr = utxo.address.toString();
        if (addr in this._addressUtxos) {
          this._addressUtxos[addr] = this._addressUtxos[addr].filter(
            (inner) => !inner.isEqual(utxo)
          );
        }
      });
    });
    this.fromSnapshot = "";
  }
}
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function addTestContext(context, TestHelperClass, stConfig, helperState) {
  console.log(" ======== ======== ======== +test context");
  Object.defineProperty(context, "strella", {
    get: function() {
      return this.h.strella;
    }
  });
  context.initHelper = async (stConfig2, helperState2) => {
    const helper = new TestHelperClass(stConfig2, helperState2);
    if (context.h) {
      if (!stConfig2.skipSetup)
        throw new Error(
          `re-initializing shouldn't be necessary without skipSetup`
        );
      console.log(
        "   ............. reinitializing test helper without setup"
      );
    }
    context.h = helper;
    return helper;
  };
  try {
    await context.initHelper(stConfig, helperState);
  } catch (e) {
    if (!stConfig) {
      console.error(
        `${TestHelperClass.name}: error during initialization; does this test helper require initialization with explicit params?`
      );
      throw e;
    } else {
      console.error("urgh");
      throw e;
    }
  }
}
const ADA = 1000000n;

class StellarTestHelper {
  state;
  config;
  defaultActor;
  strella;
  actors;
  /** Records actor setup info for cache key computation */
  actorSetupInfo = [];
  optimize = false;
  netPHelper;
  networkCtx;
  _actorName;
  /**
   * @public
   */
  get actorName() {
    return this._actorName;
  }
  /**
   * @public
   */
  get network() {
    return this.networkCtx.network;
  }
  /**
   * Gets the current actor wallet
   *
   * @public
   **/
  get wallet() {
    const wallet = this.actorContext.wallet;
    if (!wallet) {
      throw new Error(`no current actor; use setActor(actorName) first`);
    }
    return wallet;
  }
  /**
   * Shared actorContext envelope - singleton across all helpers via helperState (REQT/ch01gxgm4g).
   * All helpers and the Capo share this same object so setActor() updates are visible everywhere.
   * Update contents (actorContext.wallet, actorContext.others) - never replace the envelope.
   * @public
   */
  get actorContext() {
    return this.helperState.actorContext;
  }
  set actorContext(_value) {
    throw new Error(
      "actorContext is a shared singleton envelope (REQT/ch01gxgm4g). Update its contents (actorContext.wallet, actorContext.others) instead of replacing it."
    );
  }
  /**
   * @public
   */
  async setActor(actorName) {
    const thisActor = this.actors[actorName];
    if (!thisActor)
      throw new Error(
        `setCurrentActor: network #${this.network.id}: invalid actor name '${actorName}'
   ... try one of: 
  - ` + Object.keys(this.actors).join(",\n  - ")
      );
    if (this._actorName) {
      if (actorName == this._actorName) {
        if (this.actorContext.wallet !== thisActor) {
          throw new Error(
            `actor / wallet mismatch: ${this._actorName} ${dumpAny$1(
              this.actorContext.wallet?.address
            )} vs ${actorName} ${dumpAny$1(thisActor.address)}`
          );
        }
        return;
      }
      console.log(
        `
\u{1F3AD} -> \u{1F3AD} changing actor from \u{1F3AD} ${this._actorName} to  \u{1F3AD} ${actorName} ${dumpAny$1(thisActor.address)}`
      );
    } else {
      console.log(
        `
\u{1F3AD}\u{1F3AD} initial actor ${actorName} ${dumpAny$1(
          thisActor.address
        )}`
      );
    }
    this._actorName = actorName;
    this.actorContext.wallet = thisActor;
  }
  address;
  setupPending;
  /**
   * @public
   */
  async setupActors() {
    console.warn(
      `using 'hiro' as default actor because ${this.constructor.name} doesn't define setupActors()`
    );
    this.addActor("hiro", 1863n * ADA);
  }
  /**
   * @public
   */
  setDefaultActor() {
    return this.setActor("hiro");
  }
  /**
   * Helper state for named records and bootstrap tracking.
   * Always initialized from the class's static defaultHelperState.
   */
  helperState;
  /**
   * Default helperState shared across all instances of this helper class.
   * Subclasses can override this to provide custom default state.
   * @public
   */
  static defaultHelperState = {
    namedRecords: {},
    actorContext: { others: {}, wallet: void 0 }
  };
  constructor(config, helperState) {
    this.state = {};
    this.helperState = helperState ?? this.constructor.defaultHelperState;
    const cfg = config || {};
    if (Object.keys(cfg).length) {
      console.log(
        "XXXXXXXXXXXXXXXXXXXXXXXXXX test helper with config",
        config
      );
      this.config = config;
    }
    this.randomSeed = config?.randomSeed || 42;
    const t = this.mkNetwork(this.fixupParams(DEFAULT_NETWORK_PARAMS()));
    const theNetwork = t[0];
    const netParamsHelper = t[1];
    this.netPHelper = netParamsHelper;
    this.networkCtx = {
      network: theNetwork
    };
    this.actors = {};
    this.actorSetupInfo = [];
    const now = /* @__PURE__ */ new Date();
    this.waitUntil(now);
    console.log(" + StellarTestHelper");
  }
  /**
   * Adjusts network params for test environment flexibility.
   * Implements REQT/6rdjgebzyx (Network Parameter Fixups).
   * @public
   */
  fixupParams(preProdParams) {
    if (preProdParams.isFixedUp) return preProdParams;
    const origMaxTxSize = preProdParams.maxTxSize;
    preProdParams.origMaxTxSize = origMaxTxSize;
    const maxTxSize = Math.floor(origMaxTxSize * 6.5);
    console.log(
      "test env: \u{1F527}\u{1F527}\u{1F527} fixup max tx size",
      origMaxTxSize,
      " -> \u{1F527}",
      maxTxSize
    );
    preProdParams.maxTxSize = maxTxSize;
    const origMaxMem = preProdParams.maxTxExMem;
    preProdParams.origMaxTxExMem = origMaxMem;
    const maxMem = Math.floor(origMaxMem * 9);
    console.log(
      "test env: \u{1F527}\u{1F527}\u{1F527} fixup max memory",
      origMaxMem,
      " -> \u{1F527}",
      maxMem
    );
    preProdParams.maxTxExMem = maxMem;
    const origMaxCpu = preProdParams.maxTxExCpu;
    preProdParams.origMaxTxExCpu = origMaxCpu;
    const maxCpu = Math.floor(origMaxCpu * 3.4);
    console.log(
      "test env: \u{1F527}\u{1F527}\u{1F527} fixup max cpu",
      origMaxCpu,
      " -> \u{1F527}",
      maxCpu
    );
    preProdParams.maxTxExCpu = maxCpu;
    const origRefScriptsFeePerByte = preProdParams.refScriptsFeePerByte;
    preProdParams.origRefScriptsFeePerByte = origRefScriptsFeePerByte;
    const refScriptsFeePerByte = Math.floor(origRefScriptsFeePerByte / 4);
    console.log(
      "test env: \u{1F527}\u{1F527}\u{1F527} fixup refScripts fee per byte",
      origRefScriptsFeePerByte,
      " -> \u{1F527}",
      refScriptsFeePerByte
    );
    preProdParams.refScriptsFeePerByte = refScriptsFeePerByte;
    preProdParams.isFixedUp = true;
    return preProdParams;
  }
  /**
   * Submits a transaction and advances the network block
   * @public
   * @param TCX - The type of transaction context state, must extend anyState
   */
  async submitTxnWithBlock(tcx, options = {}) {
    const t = await tcx;
    await this.advanceNetworkTimeForTx(t, options.futureDate);
    return t.buildAndQueueAll(options).then(() => {
      this.network.tick(1);
      if (options.expectError) {
        throw new Error(
          "txn ^^^ should have failed but it succeeded instead"
        );
      }
      return tcx;
    });
  }
  /**
   * @public
   */
  async advanceNetworkTimeForTx(tcx, futureDate) {
    let validFrom = 0, validTo = 0;
    let targetTime = futureDate?.getTime() || Date.now();
    let targetSlot = this.netPHelper.timeToSlot(BigInt(targetTime));
    const nph = this.netPHelper;
    if (tcx.isFacade && !futureDate) {
      console.log("not advancing network time for facade tx");
      return;
    } else if (!tcx.isFacade) {
      validFrom = (() => {
        const { slot, timestamp } = tcx.txb.validFrom?.left || {};
        if (slot) return slot;
        if (!timestamp) return void 0;
        return nph.timeToSlot(BigInt(timestamp));
      })();
      validTo = (() => {
        const { slot, timestamp } = tcx.txb.validFrom?.left || {};
        if (slot) return slot;
        if (!timestamp) return void 0;
        return nph.timeToSlot(BigInt(timestamp));
      })();
    }
    const currentSlot = this.network.currentSlot;
    const nowSlot = nph.timeToSlot(BigInt(Date.now()));
    const slotDiff = targetSlot - currentSlot;
    const validInPast = validTo && nowSlot > validTo;
    const validInFuture = validFrom && nowSlot < validFrom;
    tcx.logger.logPrint(
      `
    ---- \u2697\uFE0F \u{1F41E}\u{1F41E} advanceNetworkTimeForTx: tx valid ${validFrom || "anytime"} -> ${validTo || "anytime"}`
    );
    function withPositiveSign(x) {
      return x < 0 ? `${x}` : `+${x}`;
    }
    const currentToNowDiff = withPositiveSign(nowSlot - currentSlot);
    const currentToTargetDiff = withPositiveSign(slotDiff);
    let effectiveNetworkSlot = targetSlot;
    function showEffectiveNetworkSlotTIme() {
      tcx.logger.logPrint(
        `
    \u2697\uFE0F \u{1F41E}\u2139\uFE0F  with now=network slot ${effectiveNetworkSlot}: ${nph.slotToTime(
          effectiveNetworkSlot
        )}
           tx valid ${validFrom ? withPositiveSign(effectiveNetworkSlot - validFrom) : "anytime"} -> ${validTo ? withPositiveSign(effectiveNetworkSlot - validTo) : "anytime"} from now`
      );
    }
    if (validInPast || validInFuture) {
      tcx.logger.logPrint(
        "\n  \u2697\uFE0F \u{1F41E}\u2139\uFE0F  advanceNetworkTimeForTx: " + (tcx.txnName || "")
      );
      if (futureDate) {
        debugger;
        tcx.logger.logPrint(
          `
    ---- \u2697\uFE0F \u{1F41E}\u{1F41E} explicit futureDate ${futureDate.toISOString()} -> slot ${targetSlot}`
        );
      }
      tcx.logger.logPrint(
        `
    ---- \u2697\uFE0F \u{1F41E}\u{1F41E} current slot ${currentSlot} ${currentToNowDiff} = now slot ${nowSlot} 
                    current ${currentToTargetDiff} = targetSlot ${targetSlot}`
      );
      if (futureDate) {
        tcx.logger.logPrint(
          `
    ---- \u2697\uFE0F \u{1F41E}\u2139\uFE0F  txnTime ${validInPast ? "already in the past" : validInFuture ? "not yet valid" : "\u2039??incontheevable??\u203A"}; advancing to explicit futureDate @now + ${targetSlot - nowSlot}s`
        );
      } else {
        tcx.logger.logPrint(
          `
    -- \u2697\uFE0F \u{1F41E} txnTime ${validInPast ? "already in the past" : validInFuture ? "not yet valid" : "\u2039??incontheevable??\u203A"}; no futureDate specified; not interfering with network time`
        );
        effectiveNetworkSlot = nowSlot;
        showEffectiveNetworkSlotTIme();
        tcx.logger.flush();
        return;
      }
    }
    if (slotDiff < 0) {
      effectiveNetworkSlot = nowSlot;
      showEffectiveNetworkSlotTIme();
      if (futureDate) {
        tcx.logger.logPrint(
          `
    ------ \u2697\uFE0F \u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}can't go back in time ${slotDiff}s (current slot ${this.network.currentSlot}, target ${targetSlot})`
        );
        throw new Error(
          `explicit futureDate ${futureDate} is in the past; can't go back ${slotDiff}s`
        );
      }
      tcx.logger.logPrint(
        `
   -- \u2697\uFE0F \u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u2697\uFE0F  NOT ADVANCING: the network is already ahead of the current time by ${0 - slotDiff}s \u2697\uFE0F \u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u2697\uFE0F`
      );
      tcx.logger.flush();
      return;
    }
    if (this.network.currentSlot < targetSlot) {
      effectiveNetworkSlot = targetSlot;
      tcx.logger.logPrint(
        `
    \u2697\uFE0F \u{1F41E}\u2139\uFE0F  advanceNetworkTimeForTx ${withPositiveSign(
          slotDiff
        )} slots`
      );
      showEffectiveNetworkSlotTIme();
      this.network.tick(slotDiff);
    } else {
      effectiveNetworkSlot = currentSlot;
      showEffectiveNetworkSlotTIme();
    }
    tcx.logger.flush();
  }
  /**
   * @public
   */
  async initialize({
    randomSeed = 42
  } = {}) {
    console.log("STINIT");
    debugger;
    if (this.strella && this.randomSeed == randomSeed) {
      console.log(
        "       ----- skipped duplicate initialize() in test helper"
      );
      return this.strella;
    }
    if (this.strella) {
      console.warn(
        ".... warning: new test helper setup with new seed...."
      );
      this.rand = void 0;
      this.randomSeed = randomSeed;
      this.actors = {};
      this.actorSetupInfo = [];
    } else {
      console.log(
        "???????????????????????? Test helper initializing without this.strella"
      );
    }
    console.log("STINIT2");
    await this.delay(1);
    this._actorName = "";
    if (!Object.keys(this.actors).length) {
      const actorSetup = this.setupActors();
      await actorSetup;
      this.setDefaultActor();
    }
    console.log("STINIT3");
    return this.initStellarClass();
  }
  /**
   * @public
   */
  async initStellarClass(config = this.config) {
    const TargetClass = this.stellarClass;
    const strella = await this.initStrella(TargetClass, config);
    this.strella = strella;
    this.address = strella.address;
    return strella;
  }
  //!!! reconnect tests to tcx-based config-capture
  // onInstanceCreated: async (config: ConfigFor<SC>) => {
  //     this.config = config
  //     return {
  //         evidence: this,
  //         id: "empheral",
  //         scope: "unit test"
  //     }
  // }
  setup;
  initSetup(setup = void 0) {
    setup = setup || {
      actorContext: this.actorContext,
      networkParams: this.networkParams,
      uh: void 0,
      isTest: true,
      isMainnet: false,
      optimize: process.env.OPTIMIZE ? true : this.optimize
    };
    const getNetwork = () => {
      return this.network;
    };
    const getActor = () => {
      return this.actorContext.wallet;
    };
    Object.defineProperty(setup, "network", {
      get: getNetwork,
      configurable: true
    });
    setup.txBatcher = new TxBatcher({
      setup,
      submitters: {
        get emulator() {
          return getNetwork();
        }
      },
      get signingStrategy() {
        return new GenericSigner(getActor());
      }
    }), setup.txBatcher.setup = setup;
    setup.uh = new UtxoHelper(setup);
    return this.setup = setup;
  }
  /**
   * @public
   */
  async initStrella(TargetClass, config) {
    process.env.OPTIMIZE;
    const setup = this.initSetup();
    let cfg = {
      setup,
      config
    };
    if (!config)
      cfg = {
        setup,
        partialConfig: {}
      };
    if (setup.actorContext.wallet) {
      console.log(
        "+strella init with actor addr",
        setup.actorContext.wallet.address.toBech32()
      );
    } else {
      debugger;
      console.log("+strella init without actor");
    }
    return TargetClass.createWith(cfg);
  }
  //! it has a seed for mkRandomBytes, which must be set by caller
  randomSeed;
  //! it makes a rand() function based on the randomSeed after first call to mkRandomBytes
  rand;
  /**
   * @public
   */
  delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }
  /**
   * Creates a new SimpleWallet and populates it with a given lovelace quantity and assets.
   * Special genesis transactions are added to the emulated chain in order to create these assets.
   * @public
   */
  createWallet(lovelace = 0n, assets = makeAssets([])) {
    const wallet = SimpleWallet_stellar.fromRootPrivateKey(
      makeRootPrivateKey(generateBytes(this.network.mulberry32, 32)),
      this.networkCtx
    );
    this.network.createUtxo(wallet, lovelace, assets);
    return wallet;
  }
  /**
   * Extracts wallet private keys from current actors for storage in offchainData.
   * Returns data suitable for storing in CachedSnapshot.offchainData. REQT/1p346cabct
   * @public
   */
  getActorWalletKeys() {
    const actorWallets = {};
    for (const [name, wallet] of Object.entries(this.actors)) {
      const w = wallet;
      actorWallets[name] = {
        spendingKey: bytesToHex(w.spendingPrivateKey.bytes),
        stakingKey: w.stakingPrivateKey ? bytesToHex(w.stakingPrivateKey.bytes) : void 0
      };
    }
    return { actorWallets };
  }
  /**
   * Restores actor wallets from stored private keys (fast path).
   * Replaces PRNG-based regeneration. REQT/avwkcrnwqp, REQT/ncbfwtyr8h
   * @param storedData - The offchainData containing actorWallets
   * @internal
   */
  restoreActorsFromStoredKeys(storedData) {
    if (Object.keys(this.actors).length > 0) {
      console.log(`  -- Skipping actor restoration: actors already exist (${Object.keys(this.actors).length})`);
      return;
    }
    const { actorWallets } = storedData;
    if (!actorWallets || Object.keys(actorWallets).length === 0) {
      console.log(`  -- No stored actor wallets to restore`);
      return;
    }
    console.log(`  -- Restoring ${Object.keys(actorWallets).length} actors from stored keys...`);
    for (const [name, keys] of Object.entries(actorWallets)) {
      const spendingKey = makeBip32PrivateKey(hexToBytes(keys.spendingKey));
      const stakingKey = keys.stakingKey ? makeBip32PrivateKey(hexToBytes(keys.stakingKey)) : void 0;
      const wallet = new SimpleWallet_stellar(this.networkCtx, spendingKey, stakingKey);
      this.actors[name] = wallet;
      this.actorContext.others[name] = wallet;
      console.log(`    + Restored actor: ${name}`);
    }
  }
  /**
   * @public
   */
  async submitTx(tx, force) {
    this.wallet?.address;
    const isAlreadyInitialized = !!this.strella;
    if (isAlreadyInitialized && !force) {
      throw new Error(
        `helper is already initialized; use the submitTx from the testing-context's 'strella' object instead`
      );
    }
    console.log(
      `Test helper ${force || ""} submitting tx${" prior to instantiateWithParams()"}:
` + txAsString$1(tx, this.networkParams)
      // new Error(`at stack`).stack
    );
    try {
      const txId = await this.network.submitTx(tx);
      console.log(
        "test helper submitted direct txn:" + txAsString$1(tx, this.networkParams)
      );
      this.network.tick(1);
      return txId;
    } catch (e) {
      console.error(
        `submit failed: ${e.message}
  ... in tx ${txAsString$1(tx)}`
      );
      throw e;
    }
  }
  /**
   * @public
   */
  mkRandomBytes(length) {
    if (!this.randomSeed)
      throw new Error(
        `test must set context.randomSeed for deterministic randomness in tests`
      );
    if (!this.rand) this.rand = mulberry32(this.randomSeed);
    const bytes = [];
    for (let i = 0; i < length; i++) {
      bytes.push(Math.floor(this.rand() * 256));
    }
    return bytes;
  }
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
  _silentActorSetup = false;
  addActor(roleName, walletBalance, ...moreUtxos) {
    if (this.actors[roleName])
      throw new Error(`duplicate role name '${roleName}'`);
    this.actorSetupInfo.push({
      name: roleName,
      initialBalance: walletBalance,
      additionalUtxos: [...moreUtxos]
    });
    //! it instantiates a wallet with the indicated balance pre-set
    const a = this.createWallet(walletBalance);
    if (!this._silentActorSetup) {
      this.logActor(roleName, a, walletBalance);
    }
    this.actorContext.others[roleName] = a;
    //! it makes collateral for each actor, above and beyond the initial balance,
    const five = 5n * ADA;
    if (0 == moreUtxos.length) moreUtxos = [five, five, five];
    for (const moreLovelace of moreUtxos) {
      if (moreLovelace > 0n) {
        this.network.createUtxo(a, moreLovelace);
      }
    }
    this.actors[roleName] = a;
    return a;
  }
  /**
   * Logs detailed info for a single actor.
   * @internal
   */
  logActor(name, wallet, balance) {
    const addr = wallet.address.toString();
    console.log(
      `+\u{1F3AD} Actor: ${name}: ${addr.slice(0, 12)}\u2026${addr.slice(
        -4
      )} ${lovelaceToAda$1(balance)} (\u{1F511}#${wallet.address.spendingCredential?.toHex().substring(0, 8)}\u2026)`
    );
  }
  /**
   * Logs detailed actor information. Used when actors were created silently
   * during cache key computation but we want to show them on cache miss.
   * @internal
   */
  logActorDetails() {
    for (const info of this.actorSetupInfo) {
      const actor = this.actors[info.name];
      if (actor) {
        this.logActor(info.name, actor, info.initialBalance);
      }
    }
  }
  //todo use this for enabling prettier diagnostics with clear labels for
  //  -- actor addresses -> names
  //  -- script addresses -> names
  addrRegistry = {};
  /**
   * @public
   */
  get networkParams() {
    return this.netPHelper.params;
  }
  /**
   * @public
   */
  mkNetwork(params) {
    const theNetwork = new StellarNetworkEmulator(this.randomSeed, { params });
    const emuParams = theNetwork.initHelper();
    return [theNetwork, emuParams];
  }
  /**
   * @public
   */
  slotToTime(s) {
    return this.netPHelper.slotToTime(s);
  }
  /**
   * @public
   */
  currentSlot() {
    return this.network.currentSlot;
  }
  /**
   * @public
   */
  waitUntil(time) {
    const targetTimeMillis = BigInt(time.getTime());
    const targetSlot = this.netPHelper.timeToSlot(targetTimeMillis);
    const c = this.currentSlot();
    const slotsToWait = targetSlot - (c || 0);
    if (slotsToWait < 1) {
      throw new Error(`the indicated time is not in the future`);
    }
    this.network.tick(slotsToWait);
    return slotsToWait;
  }
}

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = __getOwnPropDesc(target, key) ;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (decorator(target, key, result) ) || result;
  if (result) __defProp(target, key, result);
  return result;
};
const ACTORS_ALREADY_MOVED = "NONE! all actors were moved from a different network via snapshot";
const SNAP_ACTORS = "bootstrapWithActors";
const SNAP_CAPO_INIT = "capoInitialized";
const SNAP_DELEGATES = "enabledDelegatesDeployed";
const _CapoTestHelper = class _CapoTestHelper extends StellarTestHelper {
  get capo() {
    return this.strella;
  }
  featureFlags = void 0;
  /**
   * Pre-selected seed UTxO for breaking chicken-and-egg dependency (REQT/84f4k7nb6p).
   * Selected during bootstrapWithActors and stored in actors snapshot offchainData.
   */
  preSelectedSeedUtxo = void 0;
  /** Disk cache for snapshots, shared via helperState for cross-test reuse */
  snapshotCache;
  constructor(config, helperState) {
    if (!config) {
      super(config, helperState);
    } else {
      const { featureFlags, ...otherConfig } = config;
      if (Object.keys(otherConfig).length) {
        super(config, helperState);
      } else {
        super(void 0, helperState);
      }
      if (featureFlags) {
        this.featureFlags = featureFlags;
      }
    }
    if (this.helperState?.snapCache) {
      this.snapshotCache = this.helperState.snapCache;
    } else {
      this.snapshotCache = new SnapshotCache();
      if (this.helperState) {
        this.helperState.snapCache = this.snapshotCache;
      }
    }
    this.snapshotCache.register(SNAP_ACTORS, {
      parentSnapName: "genesis",
      resolveScriptDependencies: async (helper) => helper.resolveActorsDependencies(),
      // Label includes seed for easier debugging (ARCH-jj5swg0hfk)
      computeDirLabel: (inputs) => `seed${inputs.extra?.randomSeed ?? ""}`
    });
  }
  /**
   * Registers the capo-dependent snapshots. Called after capo is initialized.
   * @internal
   */
  registerCapoSnapshots() {
    if (this.snapshotCache["registry"].has(SNAP_CAPO_INIT)) {
      return;
    }
    this.snapshotCache.register(SNAP_CAPO_INIT, {
      parentSnapName: SNAP_ACTORS,
      resolveScriptDependencies: async (helper) => helper.resolveCoreCapoDependencies()
    });
    this.snapshotCache.register(SNAP_DELEGATES, {
      parentSnapName: SNAP_CAPO_INIT,
      resolveScriptDependencies: async (helper) => helper.resolveEnabledDelegatesDependencies()
    });
  }
  /**
   * Default helperState shared across all instances of this helper class.
   * Subclasses can override this to provide custom default state.
   * @public
   */
  static defaultHelperState = {
    namedRecords: {},
    snapCache: new SnapshotCache(),
    actorContext: { others: {}, wallet: void 0 }
  };
  /**
   * Creates pre-wired describe/it functions that automatically inject this test helper.
   *
   * @remarks
   * This eliminates the need for boilerplate beforeEach setup in every test file.
   * The returned describe/it functions automatically set up the test context with
   * this helper class.
   *
   * @example
   * ```typescript
   * // In your test helper file:
   * export const { describe, it } = MyCapoTestHelper.createTestContext();
   *
   * // In your test files:
   * import { describe, it } from "../MyCapoTestHelper.js";
   *
   * describe("My Tests", () => {
   *     it("works", async ({ h }) => {
   *         await h.reusableBootstrap();
   *         // h is already wired up
   *     });
   * });
   * ```
   *
   * @param options - Optional configuration including helperState and config
   * @returns An object with describe, it, fit, and xit functions
   * @public
   */
  static createTestContext(options) {
    const HelperClass = this;
    const {
      helperState = HelperClass.defaultHelperState,
      config
    } = options ?? {};
    let beforeEachRegistered = false;
    const wrapDescribe = (vitestFn) => {
      return (name, fn) => {
        vitestFn(name, () => {
          if (!beforeEachRegistered) {
            beforeEachRegistered = true;
            beforeEach(async (context) => {
              await addTestContext(
                context,
                HelperClass,
                config,
                helperState
              );
            });
          }
          fn();
        });
      };
    };
    const describe$1 = wrapDescribe(describe);
    describe$1.only = wrapDescribe(describe.only);
    describe$1.skip = describe.skip;
    describe$1.todo = describe.todo;
    const it$1 = it;
    const fit = it$1.only;
    const xit = it$1.skip;
    return { describe: describe$1, it: it$1, fit, xit };
  }
  async initialize({ randomSeed = 42 } = {}, args) {
    if (this.strella && this.randomSeed == randomSeed) {
      console.log(
        "       ----- skipped duplicate initialize() in test helper"
      );
      return this.strella;
    }
    if (this.strella) {
      console.log(
        `    -- \u{1F331}\u{1F331}\u{1F331} new test helper setup with new seed (was ${this.randomSeed}, now ${randomSeed})...
` + new Error("stack").stack.split("\n").slice(1).filter(
          (line) => !line.match(/node_modules/) && !line.match(/node:internal/)
        ).join("\n")
      );
      this.strella = void 0;
      this.actors = {};
      this.actorSetupInfo = [];
      this._actorName = "";
      this.actorContext.wallet = void 0;
      this.actorContext.others = {};
      if (this.helperState) {
        this.helperState.offchainData = {};
        this.helperState.bootstrappedStrella = void 0;
        this.helperState.previousHelper = void 0;
      }
    }
    await this.delay(1);
    this.randomSeed = randomSeed;
    if (Object.keys(this.actors).length) {
      console.log("Skipping actor setup - already done");
    } else {
      await this.snapToBootstrapWithActors();
    }
    this.state.mintedCharterToken = void 0;
    this.state.parsedConfig = void 0;
    //! when there's not a preset config, it leaves the detailed setup to be done just-in-time
    if (!this.config) {
      console.log("  -- Capo not yet bootstrapped");
      const ts1 = Date.now();
      const { featureFlags } = this;
      if (featureFlags) {
        this.strella = await this.initStrella(this.stellarClass, {
          featureFlags
        });
        this.strella.featureFlags = this.featureFlags;
      } else {
        this.strella = await this.initStrella(this.stellarClass);
      }
      const ts2 = Date.now();
      console.log(
        // stopwatch emoji: ⏱️
        `  -- \u23F1\uFE0F initialized Capo: ${ts2 - ts1}ms`
      );
      this.registerCapoSnapshots();
      console.log("checking delegate scripts...");
      return this.checkDelegateScripts(args).then(() => {
        const ts3 = Date.now();
        console.log(`  -- \u23F1\uFE0F checked delegate scripts: ${ts3 - ts2}ms`);
        return this.strella;
      });
    }
    console.log("  -- Capo already bootstrapped");
    const strella = await this.initStrella(this.stellarClass, this.config);
    this.strella = strella;
    const { address, mintingPolicyHash: mph } = strella;
    const { name } = strella.program;
    console.log(
      name,
      address.toString().substring(0, 18) + "\u2026",
      "vHash \u{1F4DC} " + strella.validatorHash.toHex().substring(0, 12) + "\u2026",
      "mph \u{1F3E6} " + mph?.toHex().substring(0, 12) + "\u2026"
    );
    console.log("<- CAPO initialized()");
    return strella;
  }
  async checkDelegateScripts(args = {}) {
    throw new Error(
      `doesn't fail, because it's implemented by DefaultCapoTestHelper`
    );
  }
  get ready() {
    return !!(this.strella.configIn && !this.strella.didDryRun.configIn || this.state.parsedConfig);
  }
  /**
   * Creates a new transaction-context with the helper's current or default actor
   * @public
   **/
  mkTcx(txnName) {
    const tcx = new StellarTxnContext$1(this.strella.setup);
    if (txnName) return tcx.withName(txnName);
    return tcx;
  }
  /**
   * Reuses existing bootstrap or creates fresh one.
   * Implements REQT/trjb6qtjt6 (Snapshot Orchestration).
   */
  async reusableBootstrap(snap = SNAP_DELEGATES) {
    let capo;
    const helperState = this.helperState;
    const { bootstrappedStrella, previousHelper } = helperState;
    if (previousHelper === this && bootstrappedStrella) {
      console.log("  ---  \u2697\uFE0F\u{1F41E}\u{1F41E} nested call - returning existing capo");
      return bootstrappedStrella;
    }
    const cached = bootstrappedStrella && previousHelper ? await this.snapshotCache.find(snap, this) : null;
    if (cached && bootstrappedStrella && previousHelper) {
      console.log("  ---  \u2697\uFE0F\u{1F41E}\u{1F41E} already bootstrapped");
      console.log(
        `changing helper from network ${previousHelper.network.id} to ${this.network.id}`
      );
      capo = await this.restoreFrom(snap);
    } else {
      capo = await this.bootstrap();
      helperState.bootstrappedStrella = capo;
      helperState.parsedConfig = this.state.parsedConfig;
    }
    helperState.previousHelper = this;
    return capo;
  }
  /**
   * Static registry of snapshot metadata, populated at class definition time.
   * Maps snapshot name → registration metadata including the snap* method reference.
   * @internal
   */
  static _snapshotRegistrations = /* @__PURE__ */ new Map();
  /**
   * A decorator for test-helper functions that generate named snapshots.
   * Snapshot name is derived from method name: snapToFoo → "foo".
   * Implements REQT/7hcqed9mvn (Built-in Snapshot Registration).
   * @param options - Options object with actor, parentSnapName, and optional resolveScriptDependencies
   */
  static hasNamedSnapshot(options) {
    const { actor: actorName, parentSnapName, internal, resolveScriptDependencies, computeDirLabel } = options;
    if (!parentSnapName) {
      throw new Error(
        `hasNamedSnapshot(): parentSnapName is required. Use 'bootstrapped' for typical app snapshots, or 'genesis' for root snapshots.`
      );
    }
    return function(target, propertyKey, descriptor) {
      descriptor.value;
      descriptor.value = SnapWrap;
      const [_, WithCapMethodName] = propertyKey.match(/^snapTo(.*)/) || [];
      if (!WithCapMethodName) {
        throw new Error(
          `hasNamedSnapshot(): ${propertyKey}(): expected method name to start with 'snapTo'`
        );
      }
      const snapshotName = WithCapMethodName[0].toLowerCase() + WithCapMethodName.slice(1);
      const generateSnapshotFunc = target[snapshotName];
      if (!generateSnapshotFunc) {
        throw new Error(
          `hasNamedSnapshot(): ${propertyKey}: expected builder method '${snapshotName}' to exist`
        );
      }
      async function SnapWrap(...args) {
        this.ensureSnapshotRegistrations();
        if (parentSnapName === "genesis") {
          this.ensureHelperState();
        } else if (internal) {
          this.ensureHelperState();
        } else {
          await this.reusableBootstrap();
        }
        return this.findOrCreateSnapshot(
          snapshotName,
          actorName,
          () => {
            return generateSnapshotFunc.apply(this, args).then((result) => {
              if (actorName === "default") {
                if (!this.actorName) {
                  throw new Error(
                    `snapshot ${snapshotName}: expected default actor to be set, but no actor is set`
                  );
                }
              } else if (this.actorName !== actorName) {
                throw new Error(
                  `snapshot ${snapshotName}: expected actor '${actorName}', but current actor is '${this.actorName}'`
                );
              }
              this.network.tick(1);
              return result;
            });
          }
        );
      }
      const ctor = target.constructor;
      if (!ctor.hasOwnProperty("_snapshotRegistrations")) {
        ctor._snapshotRegistrations = new Map(ctor._snapshotRegistrations || []);
      }
      ctor._snapshotRegistrations.set(snapshotName, {
        parentSnapName,
        resolveScriptDependencies,
        computeDirLabel,
        actor: actorName,
        internal,
        snapMethod: SnapWrap
        // Store the decorated method for parent resolution
      });
      console.log(
        `hasNamedSnapshot(): ${propertyKey} \u2192 "${snapshotName}" (parent: "${parentSnapName}")`
      );
      return descriptor;
    };
  }
  /**
   * Copies all snapshot registrations from the class hierarchy to the snapshotCache.
   * Called once per helper instance to ensure all metadata is available.
   * @internal
   */
  _registrationsCopied = false;
  ensureSnapshotRegistrations() {
    if (this._registrationsCopied) return;
    this._registrationsCopied = true;
    let ctor = this.constructor;
    while (ctor) {
      const registrations = ctor._snapshotRegistrations;
      if (registrations) {
        for (const [snapshotName, meta] of registrations) {
          if (!this.snapshotCache["registry"].has(snapshotName)) {
            this.snapshotCache.register(snapshotName, {
              parentSnapName: meta.parentSnapName,
              resolveScriptDependencies: meta.resolveScriptDependencies,
              computeDirLabel: meta.computeDirLabel
            });
          }
        }
      }
      ctor = Object.getPrototypeOf(ctor);
    }
  }
  /**
   * Determines whether a new Capo should be created based on current state vs loaded config.
   * Implements the Capo reconstruction decision tree (REQT/vz0fc3s057).
   *
   * Returns true (create new) when:
   * - a) No Capo exists at all
   * - a) Capo exists but is unconfigured (egg)
   * - b) Capo exists but has different mph than loaded config
   *
   * Returns false (hot-swap) when:
   * - c) Capo exists and has same mph as loaded config
   *
   * @internal
   */
  shouldCreateNewCapo(loadedConfig) {
    if (!this.strella) {
      console.log(`  [shouldCreateNewCapo] No Capo \u2192 create new`);
      return true;
    }
    if (!this.strella.configIn?.mph) {
      console.log(`  [shouldCreateNewCapo] Egg (no mph) \u2192 create new`);
      return true;
    }
    if (!loadedConfig?.mph) {
      console.log(`  [shouldCreateNewCapo] No loaded config \u2192 keep existing`);
      return false;
    }
    const currentMph = this.strella.mintingPolicyHash?.toHex();
    const loadedMph = loadedConfig.mph.toHex();
    if (currentMph !== loadedMph) {
      console.log(`  [shouldCreateNewCapo] Different mph (${currentMph?.slice(0, 12)} vs ${loadedMph.slice(0, 12)}) \u2192 create new`);
      return true;
    }
    console.log(`  [shouldCreateNewCapo] Same mph \u2192 hot-swap`);
    return false;
  }
  /**
   * Gets the pre-selected seed UTxO from the actors snapshot's offchainData.
   * Used by resolvers for cache key computation (REQT/mvf88mnsez).
   * @internal
   */
  getPreSelectedSeedUtxo() {
    if (this.preSelectedSeedUtxo) {
      return this.preSelectedSeedUtxo;
    }
    const actorsOffchainData = this.helperState?.offchainData?.[SNAP_ACTORS];
    if (actorsOffchainData?.targetSeedUtxo) {
      return actorsOffchainData.targetSeedUtxo;
    }
    return void 0;
  }
  /**
   * Pre-selects a seed UTxO from the default actor's wallet (REQT/84f4k7nb6p).
   * Must be called after setDefaultActor() so wallet is available.
   * @internal
   */
  async preSelectSeedUtxo() {
    if (!this.wallet) {
      throw new Error(`preSelectSeedUtxo: no wallet - call setDefaultActor() first`);
    }
    const utxos = await this.wallet.utxos;
    if (utxos.length === 0) {
      throw new Error(`preSelectSeedUtxo: default actor has no UTxOs`);
    }
    const seedUtxo = utxos[utxos.length - 1];
    this.preSelectedSeedUtxo = {
      txId: seedUtxo.id.txId.toString(),
      utxoIdx: seedUtxo.id.index
    };
    console.log(`  -- Pre-selected seed UTxO: ${this.preSelectedSeedUtxo.txId.slice(0, 12)}...#${this.preSelectedSeedUtxo.utxoIdx}`);
  }
  /**
   * Creates test actors for the emulator.
   * Idempotent: only runs if actors haven't been set up yet.
   * Called by snapToBootstrapWithActors via @hasNamedSnapshot decorator.
   * @internal
   */
  async bootstrapWithActors() {
    if (this.actorSetupInfo.length === 0) {
      await this.setupActors();
    } else {
      this.logActorDetails();
    }
    await this.setDefaultActor();
    this.network.tick(1);
    await this.preSelectSeedUtxo();
  }
  async snapToBootstrapWithActors() {
  }
  async snapToCapoInitialized(args, options) {
  }
  /**
   * Mints the charter token and initializes the Capo.
   * Called by snapToCapoInitialized via @hasNamedSnapshot decorator.
   * @internal
   */
  async capoInitialized(args, options) {
    await this.mintCharterToken(args, options);
    console.log(
      "       --- \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2705 Capo bootstrap with charter"
    );
  }
  /**
   * Deploys enabled delegates after Capo initialization.
   * Called by snapToEnabledDelegatesDeployed via @hasNamedSnapshot decorator.
   * @internal
   */
  async enabledDelegatesDeployed(args, options) {
    await this.extraBootstrapping(args, options);
    console.log(
      "       --- \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2705 Delegates deployed"
    );
  }
  async snapToEnabledDelegatesDeployed(args, options) {
  }
  /**
   * Ensures helperState exists, creating a default one if needed.
   * This enables disk caching for test helpers that don't use the @hasNamedSnapshot decorator.
   * @internal
   */
  ensureHelperState() {
    if (!this.helperState) {
      this.helperState = {
        namedRecords: {}
      };
    } else {
      if (!this.helperState.namedRecords) {
        this.helperState.namedRecords = {};
      }
    }
  }
  /**
   * Builds offchainData for a snapshot being stored.
   * Also populates helperState.offchainData for in-memory cache access.
   * @internal
   */
  buildOffchainData(snapshotName, entry) {
    const parentSnapName = entry?.parentSnapName || "genesis";
    let offchainData;
    if (parentSnapName === "genesis" && Object.keys(this.actors).length > 0) {
      offchainData = {
        ...this.getActorWalletKeys(),
        targetSeedUtxo: this.preSelectedSeedUtxo
      };
    } else if (this.state.config) {
      const capoAddr = this.strella?.address?.toString();
      offchainData = {
        capoConfig: this.state.config,
        _diag: {
          capoAddr,
          validatorHash: this.strella?.validatorHash?.toHex(),
          utxoCountAtCapoAddr: capoAddr ? this.network._addressUtxos[capoAddr]?.length || 0 : 0,
          addressUtxoKeys: Object.keys(this.network._addressUtxos)
        }
      };
    }
    if (offchainData) {
      if (!this.helperState.offchainData) {
        this.helperState.offchainData = {};
      }
      this.helperState.offchainData[snapshotName] = offchainData;
    }
    return offchainData;
  }
  /**
   * Logs diagnostic comparison between stored and current Capo state.
   * Essential for debugging address mismatches and UTxO loading issues.
   * @internal
   */
  logSnapshotRestoreDiagnostics(cached, snapshotName) {
    const storedDiag = cached.offchainData?._diag;
    if (!storedDiag) return;
    const currentCapoAddr = this.strella?.address?.toString();
    const currentValidatorHash = this.strella?.validatorHash?.toHex();
    const currentUtxoCount = currentCapoAddr ? this.network._addressUtxos[currentCapoAddr]?.length || 0 : 0;
    const currentAddressKeys = Object.keys(this.network._addressUtxos);
    console.log(`  [DIAG] Snapshot restore comparison for '${snapshotName}':`);
    console.log(`    storedCapoAddr:   ${storedDiag.capoAddr}`);
    console.log(`    currentCapoAddr:  ${currentCapoAddr}`);
    console.log(`    addrMatch: ${storedDiag.capoAddr === currentCapoAddr}`);
    console.log(`    storedValidatorHash:  ${storedDiag.validatorHash}`);
    console.log(`    currentValidatorHash: ${currentValidatorHash}`);
    console.log(`    vhMatch: ${storedDiag.validatorHash === currentValidatorHash}`);
    console.log(`    storedUtxoCount:  ${storedDiag.utxoCountAtCapoAddr}`);
    console.log(`    currentUtxoCount: ${currentUtxoCount}`);
    console.log(`    storedAddressKeys (${storedDiag.addressUtxoKeys?.length}): ${storedDiag.addressUtxoKeys?.slice(0, 5).join(", ")}${(storedDiag.addressUtxoKeys?.length || 0) > 5 ? "..." : ""}`);
    console.log(`    currentAddressKeys (${currentAddressKeys.length}): ${currentAddressKeys.slice(0, 5).join(", ")}${currentAddressKeys.length > 5 ? "..." : ""}`);
    if (storedDiag.capoAddr !== currentCapoAddr) {
      console.warn(`    \u26A0\uFE0F ADDRESS MISMATCH - this is likely the bug!`);
    }
    if (currentUtxoCount === 0 && (storedDiag.utxoCountAtCapoAddr || 0) > 0) {
      console.warn(`    \u26A0\uFE0F UTxO COUNT DROPPED TO ZERO - snapshot may not have loaded correctly`);
    }
  }
  /**
   * Handles Capo reconstruction when loading a non-genesis snapshot.
   * Implements the decision tree from REQT/vz0fc3s057.
   * @internal
   */
  async handleCapoReconstruction(cached, snapshotName) {
    const { bootstrappedStrella } = this.helperState;
    const loadedRawConfig = cached.offchainData?.capoConfig;
    const loadedConfig = loadedRawConfig ? parseCapoJSONConfig(loadedRawConfig) : void 0;
    const shouldCreateNew = this.shouldCreateNewCapo(loadedConfig);
    if (shouldCreateNew) {
      console.log(`  -- Creating new Capo from loaded config (shouldCreateNew=${shouldCreateNew})`);
      const config = loadedConfig || this.helperState.parsedConfig;
      if (config) {
        this.helperState.parsedConfig = config;
        this.state.parsedConfig = config;
        this.state.config = loadedRawConfig;
        await this.initStellarClass(config);
      } else {
        await this.initStellarClass();
      }
      this.helperState.bootstrappedStrella = this.strella;
      this.helperState.previousHelper = this;
    } else if (bootstrappedStrella && this.helperState.previousHelper) {
      console.log(`  -- Hot-swapping network for existing Capo`);
      await this.restoreFrom(snapshotName);
    } else {
      console.log(`  -- Using existing Capo (no previousHelper)`);
      this.helperState.bootstrappedStrella = this.strella;
      this.helperState.previousHelper = this;
    }
    if (loadedRawConfig && !this.state.config) {
      this.state.config = loadedRawConfig;
    }
    if (loadedRawConfig && !this.state.mintedCharterToken) {
      this.state.mintedCharterToken = { restored: true };
    }
  }
  /**
   * Loads a cached snapshot into the emulator and sets up helper state.
   * This is called for BOTH cache hits AND freshly-built snapshots.
   * @internal
   */
  async loadCachedSnapshot(cached, snapshotName, actorName) {
    this.network.loadSnapshot(cached.snapshot);
    Object.assign(this.helperState.namedRecords, cached.namedRecords);
    if (cached.offchainData) {
      if (!this.helperState.offchainData) {
        this.helperState.offchainData = {};
      }
      this.helperState.offchainData[snapshotName] = cached.offchainData;
    }
    const entry = this.snapshotCache["registry"].get(snapshotName);
    const isGenesisSnapshot = entry?.parentSnapName === "genesis";
    if (isGenesisSnapshot) {
      if (Object.keys(this.actors).length === 0) {
        const actorWallets = cached.offchainData?.actorWallets;
        if (actorWallets) {
          this.restoreActorsFromStoredKeys({ actorWallets });
        } else {
          console.warn(`  \u26A0\uFE0F No stored actor keys in disk cache for '${snapshotName}' - cache may need rebuild`);
        }
      }
      if (!this.preSelectedSeedUtxo && cached.offchainData?.targetSeedUtxo) {
        this.preSelectedSeedUtxo = cached.offchainData.targetSeedUtxo;
        console.log(`  -- Restored pre-selected seed UTxO from cache: ${this.preSelectedSeedUtxo.txId.slice(0, 12)}...#${this.preSelectedSeedUtxo.utxoIdx}`);
      }
    } else {
      await this.handleCapoReconstruction(cached, snapshotName);
      this.logSnapshotRestoreDiagnostics(cached, snapshotName);
    }
    if (actorName === "default") {
      await this.setDefaultActor();
    } else {
      await this.setActor(actorName);
    }
  }
  /**
   * Resolves snapshot name aliases.
   * "bootstrapped" is a symbolic alias for "enabledDelegatesDeployed".
   * @internal
   */
  resolveSnapshotAlias(name) {
    if (name === "bootstrapped") {
      return "enabledDelegatesDeployed";
    }
    return name;
  }
  /**
   * Ensures a snapshot is in cache (memory or disk), building recursively if needed.
   * This is the single chokepoint for snapshot resolution.
   * @internal
   */
  async ensureSnapshotCached(snapshotName, contentBuilder) {
    const cacheStart = performance.now();
    let cached = await this.snapshotCache.find(snapshotName, this);
    if (cached) {
      const entry2 = this.snapshotCache["registry"].get(snapshotName);
      const isGenesis = entry2?.parentSnapName === "genesis";
      const cacheElapsed = (performance.now() - cacheStart).toFixed(1);
      console.log(`  \u26A1 cache hit${isGenesis ? " (genesis)" : ""} '${snapshotName}': ${cacheElapsed}ms`);
      return cached;
    }
    console.log(`  \u{1F4E6} cache miss '${snapshotName}' - building...`);
    const entry = this.snapshotCache["registry"].get(snapshotName);
    const parentSnapName = entry?.parentSnapName;
    if (parentSnapName && parentSnapName !== "genesis") {
      const resolvedParentName = this.resolveSnapshotAlias(parentSnapName);
      let parentCached2 = await this.snapshotCache.find(parentSnapName, this);
      if (!parentCached2) {
        const parentReg = this.constructor._snapshotRegistrations?.get(resolvedParentName);
        if (parentReg?.snapMethod) {
          const aliasNote = resolvedParentName !== parentSnapName ? ` (alias for '${resolvedParentName}')` : "";
          console.log(`  \u{1F4E6} building parent '${parentSnapName}'${aliasNote} first...`);
          await parentReg.snapMethod.call(this);
          parentCached2 = await this.snapshotCache.find(parentSnapName, this);
        } else {
          throw new Error(
            `Parent snapshot '${parentSnapName}' has no snapMethod registered. Ensure snapTo${resolvedParentName[0].toUpperCase()}${resolvedParentName.slice(1)}() exists with @hasNamedSnapshot decorator.`
          );
        }
      }
      if (!parentCached2) {
        throw new Error(
          `Parent '${parentSnapName}' should be cached after snapMethod call, but wasn't found.`
        );
      }
      console.log(`  \u{1F4E6} loading parent '${parentSnapName}' state for building '${snapshotName}'...`);
      this.network.loadSnapshot(parentCached2.snapshot);
      Object.assign(this.helperState.namedRecords, parentCached2.namedRecords);
    }
    console.log(`  \u{1F528} building '${snapshotName}'...`);
    const buildStart = performance.now();
    await contentBuilder();
    const buildElapsed = (performance.now() - buildStart).toFixed(1);
    console.log(`  \u{1F422} built '${snapshotName}': ${buildElapsed}ms`);
    const storeStart = performance.now();
    const snapshot = this.network.snapshot(snapshotName);
    const parentCached = parentSnapName && parentSnapName !== "genesis" ? await this.snapshotCache.find(parentSnapName, this) : null;
    const parentHash = parentCached?.snapshotHash || null;
    if (!this.helperState.namedRecords) {
      throw new Error(
        `ensureSnapshotCached('${snapshotName}'): helperState.namedRecords is undefined. This should not happen - ensureHelperState() should have initialized it.`
      );
    }
    const offchainData = this.buildOffchainData(snapshotName, entry);
    const cachedSnapshot = {
      snapshot,
      namedRecords: { ...this.helperState.namedRecords },
      parentSnapName: parentSnapName || "genesis",
      parentHash,
      snapshotHash: this.network.lastBlockHash,
      offchainData
    };
    await this.snapshotCache.store(snapshotName, cachedSnapshot, this);
    const storeElapsed = (performance.now() - storeStart).toFixed(1);
    console.log(`  \u{1F4BE} stored '${snapshotName}': ${storeElapsed}ms`);
    return cachedSnapshot;
  }
  /**
   * Finds or creates a snapshot, using the single chokepoint pattern (ARCH-7jcyqx1mg8).
   * 1. ensureSnapshotCached() handles recursive parent resolution and caching
   * 2. loadCachedSnapshot() provides uniform loading for both cache hits and freshly-built
   * Implements REQT/sjer71jjmb (Reuse existing or create new snapshot).
   */
  async findOrCreateSnapshot(snapshotName, actorName, contentBuilder) {
    const startTime = performance.now();
    const cached = await this.ensureSnapshotCached(snapshotName, contentBuilder);
    await this.loadCachedSnapshot(cached, snapshotName, actorName);
    const elapsed = (performance.now() - startTime).toFixed(1);
    console.log(`  \u2705 '${snapshotName}' ready: ${elapsed}ms`);
    return this.strella;
  }
  /**
   * Restores helper state from a named snapshot.
   * Implements REQT/7n8ws6gabc (Actor Wallet Transfer).
   */
  async restoreFrom(snapshotName) {
    const {
      helperState,
      helperState: {
        previousHelper,
        bootstrappedStrella
      } = {}
    } = this;
    if (!helperState)
      throw new Error(
        `can't restore from a previous helper without a helperState`
      );
    if (!bootstrappedStrella)
      throw new Error(
        `can't restore from a previous helper without a bootstrappedStrella`
      );
    const cached = await this.snapshotCache.find(snapshotName, this);
    if (!cached) {
      throw new Error(`no snapshot named ${snapshotName} in snapshotCache`);
    }
    if (!previousHelper) {
      throw new Error(`no previousHelper in helperState`);
    }
    const { parsedConfig } = previousHelper.state;
    const {
      networkCtx: oldNetworkEnvelope,
      actorContext: oldActorContext,
      setup: previousSetup
    } = previousHelper;
    const { network: previousNetwork } = oldNetworkEnvelope;
    const { network: newNet } = this.networkCtx;
    this.initSetup(previousSetup);
    console.log(`  [DEBUG restoreFrom] this===previousHelper: ${this === previousHelper}`);
    console.log(`  [DEBUG restoreFrom] this._actorName: "${this._actorName}"`);
    console.log(`  [DEBUG restoreFrom] this.actorContext.wallet: ${this.actorContext.wallet?.address?.toString().slice(0, 20) || "undefined"}`);
    console.log(`  [DEBUG restoreFrom] oldActorContext.wallet: ${oldActorContext.wallet?.address?.toString().slice(0, 20) || oldActorContext.wallet || "undefined"}`);
    console.log(`  [DEBUG restoreFrom] Object.keys(this.actors): ${Object.keys(this.actors).join(", ")}`);
    console.log(`  [DEBUG restoreFrom] Object.keys(previousHelper.actors): ${Object.keys(previousHelper.actors).join(", ")}`);
    const thisHasRealActors = Object.keys(this.actors).some((k) => k !== ACTORS_ALREADY_MOVED);
    const previousHasRealActors = Object.keys(previousHelper.actors).some((k) => k !== ACTORS_ALREADY_MOVED);
    if (this === previousHelper || thisHasRealActors) {
      console.log(
        `  -- ${this === previousHelper ? "same helper" : "actors already present"} - loading snapshot only`
      );
      console.log(`  [DEBUG restoreFrom] BEFORE: this.networkCtx.network.id=${this.networkCtx.network.id}, newNet.id=${newNet.id}`);
      console.log(`  [DEBUG restoreFrom] BEFORE: bootstrappedStrella?.setup?.network?.id=${bootstrappedStrella?.setup?.network?.id}`);
      if (this !== previousHelper) {
        this.state.config = previousHelper.state.config;
        this.state.parsedConfig = parsedConfig;
        this.state.mintedCharterToken = previousHelper.state.mintedCharterToken;
      }
      newNet.loadSnapshot(cached.snapshot);
      if (this.networkCtx.network !== newNet) {
        console.log(`  [DEBUG restoreFrom] Swapping this.networkCtx.network from ${this.networkCtx.network.id} to ${newNet.id}`);
        this.networkCtx.network = newNet;
      }
      if (bootstrappedStrella?.setup?.network !== newNet) {
        console.log(`  [DEBUG restoreFrom] Swapping bootstrappedStrella.setup.network from ${bootstrappedStrella?.setup?.network?.id} to ${newNet.id}`);
        bootstrappedStrella.setup.network = newNet;
      }
      console.log(`  [DEBUG restoreFrom] AFTER: this.networkCtx.network.id=${this.networkCtx.network.id}`);
      console.log(`  [DEBUG restoreFrom] AFTER: bootstrappedStrella?.setup?.network?.id=${bootstrappedStrella?.setup?.network?.id}`);
    } else if (!previousHasRealActors) {
      throw new Error(
        `restoreFrom('${snapshotName}'): previousHelper has no actors to transfer (already retired). This usually means helperState is stale from a previous test.`
      );
    } else {
      Object.assign(this.actors, previousHelper.actors);
      previousHelper.networkCtx = { network: previousNetwork };
      this.networkCtx = oldNetworkEnvelope;
      this.networkCtx.network = newNet;
      this.state.mintedCharterToken = previousHelper.state.mintedCharterToken;
      this.state.parsedConfig = parsedConfig;
      this.state.config = previousHelper.state.config;
      previousHelper.actors = { [ACTORS_ALREADY_MOVED]: newNet.id };
      console.log(
        `   -- moving ${Object.keys(this.actors).length} actors from network ${previousNetwork.id} to ${newNet.id}`
      );
      newNet.loadSnapshot(cached.snapshot);
    }
    if (!this.actorName) {
      await this.setDefaultActor();
    }
    this.strella = bootstrappedStrella;
    if (!this.strella) {
      await this.initStellarClass(parsedConfig);
    }
    return this.strella;
  }
  async bootstrap(args, submitOptions = {}) {
    let strella = this.strella || await this.initialize(void 0, args);
    if (this.bootstrap != _CapoTestHelper.prototype.bootstrap) {
      throw new Error(
        `Don't override the test-helper bootstrap().  Instead, provide an implementation of extraBootstrapping()`
      );
    }
    if (this.ready) {
      console.log(
        "       --- \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2705 Capo bootstrap already OK"
      );
      return strella;
    }
    const options = {
      ...submitOptions,
      onSubmitted: () => {
        this.network.tick(1);
      }
    };
    await this.snapToCapoInitialized(args, options);
    await this.snapToEnabledDelegatesDeployed(args, options);
    return this.strella;
  }
  /**
   * Returns the id of a named record previously stored in the helperState.namedRecords.
   * @remarks
   * Throws an error if the named record is not found.
   */
  getNamedRecordId(recordName) {
    const found = this.helperState.namedRecords[recordName];
    if (!found) throw new Error(`named record: '${recordName}' not found`);
    return found;
  }
  /**
   * Waits for a tx to be built, and captures the record id indicated in the transaction context
   * @remarks
   * The captured id is stored in the helperState, using the indicated recordName.
   *
   * Returns the transaction-context object resolved from arg2.
   *
   * Without a uutName option, the "recordId" UUT name is expected in the txn context.
   * If you receive a type error on the tcxPromise argument, use the uutName option to
   * set the expectation for a UUT name actually found in the transaction context.
   *
   * Optionally submits the txn. In this case, if the expectError option is set, an error will be
   * thrown if the txn ***succeeds***.  This combines well with `await expect(promise).rejects.toThrow()`.
   *
   * Resolves after all the above are done.
   */
  async captureRecordId(options, tcxPromise) {
    const {
      recordName: name,
      submit = true,
      uutName = "recordId",
      expectError
    } = options;
    const stack = new Error().stack.split("\n").slice(2, 3);
    const tcx = await tcxPromise.catch((e) => {
      const lines = (e.stack || "").split("\n");
      const index = lines.findIndex(
        (line) => line.match(/captureRecordId/)
      );
      lines.splice(index === -1 ? 0 : index + 1, 0, ...stack);
      e.stack = lines.join("\n");
      throw e;
    });
    const id = tcx.state.uuts[uutName];
    if (!id) {
      console.log("UUTs in tcx:", tcx.state.uuts);
      throw new Error(
        `captureRecordId: no ${uutName.toString()} found in txn context for ${name}`
      );
    }
    this.helperState.namedRecords[name] = id.toString();
    if (submit)
      return this.submitTxnWithBlock(tcx, {
        expectError
      });
    return tcx;
  }
  async extraBootstrapping(args, submitOptions = {}) {
    this.mkTcx("extra bootstrapping").facade();
    const capoUtxos = await this.capo.findCapoUtxos();
    const charterData = await this.capo.findCharterData(void 0, {
      optional: false,
      capoUtxos
    });
    const tcx2 = await this.capo.mkTxnUpgradeIfNeeded(charterData);
    await this.submitTxnWithBlock(tcx2, submitOptions);
    return this.strella;
  }
  /**
   * Resolves cache key inputs for the base actors snapshot.
   * @public
   */
  resolveActorsDependencies() {
    const actorData = this.actorSetupInfo.map((actor) => ({
      name: actor.name,
      initialBalance: actor.initialBalance.toString(),
      additionalUtxos: actor.additionalUtxos.map((u) => u.toString())
    }));
    console.log(`[DEBUG resolveActorsDependencies] randomSeed=${this.randomSeed}, actorCount=${actorData.length}`);
    return {
      bundles: [],
      // No script bundles for actors snapshot
      extra: {
        actors: actorData,
        randomSeed: this.randomSeed,
        // REQT/xh612fhw3c
        heliosVersion: VERSION
        // REQT/v4c7x9m1kz
      }
    };
  }
  /**
   * Ensures an egg (unconfigured Capo) exists for cache key computation (REQT/dynnc9bq1v).
   * Creates one via initStrella() if this.strella is undefined or unconfigured.
   * @internal
   */
  async ensureEggForCacheKey() {
    if (this.strella) {
      return;
    }
    console.log(`  -- Creating egg (unconfigured Capo) for cache key computation`);
    const { featureFlags } = this;
    if (featureFlags) {
      this.strella = await this.initStrella(this.stellarClass, {
        featureFlags
      });
    } else {
      this.strella = await this.initStrella(this.stellarClass);
    }
  }
  /**
   * Resolves cache key inputs for core Capo scripts (minter, mint delegate, spend delegate).
   * Used for snapshot cache key computation for the capoInitialized snapshot.
   * Implements REQT/p19q6ak0xj (Bundle Dependency Hashing).
   * @public
   */
  async resolveCoreCapoDependencies() {
    await this.ensureEggForCacheKey();
    const seedUtxo = this.getPreSelectedSeedUtxo();
    const capoBundle = await this.capo.getBundle();
    const capoBundleClass = capoBundle.constructor;
    const bundles = [{
      name: capoBundle.moduleName || capoBundle.constructor.name,
      sourceHash: capoBundle.computeSourceHash(),
      // Works without config! (REQT/mexwd3p8mr)
      params: { seedUtxo }
      // Identity params only, NOT derived values like mph
    }];
    const { delegateRoles } = this.capo;
    if (delegateRoles.mintDelegate) {
      const mintDelegateClass = delegateRoles.mintDelegate.delegateClass;
      const mintBundleClass = await mintDelegateClass.scriptBundleClass();
      const boundMintBundleClass = mintBundleClass.usingCapoBundleClass(capoBundleClass);
      const mintBundle = new boundMintBundleClass();
      bundles.push({
        name: mintBundle.moduleName || mintBundle.constructor.name,
        sourceHash: mintBundle.computeSourceHash(),
        params: {}
      });
    }
    if (delegateRoles.spendDelegate) {
      const spendDelegateClass = delegateRoles.spendDelegate.delegateClass;
      const spendBundleClass = await spendDelegateClass.scriptBundleClass();
      const boundSpendBundleClass = spendBundleClass.usingCapoBundleClass(capoBundleClass);
      const spendBundle = new boundSpendBundleClass();
      bundles.push({
        name: spendBundle.moduleName || spendBundle.constructor.name,
        sourceHash: spendBundle.computeSourceHash(),
        params: {}
      });
    }
    return {
      bundles,
      extra: {
        // heliosVersion is in genesis (actors) snapshot only - no need to repeat here
        // heliosVersion: HELIOS_VERSION,
      }
    };
  }
  /**
   * Resolves cache key inputs for all enabled delegates.
   * Used for snapshot cache key computation for the enabledDelegatesDeployed snapshot.
   * Includes dgData controllers (filtered by featureFlags) per REQT/venhawwjrz and REQT/3r1d1ntx6e.
   * Uses computeSourceHash() to work with egg Capo (REQT/mvf88mnsez, REQT/mexwd3p8mr).
   * @public
   */
  async resolveEnabledDelegatesDependencies() {
    const coreInputs = await this.resolveCoreCapoDependencies();
    const bundles = [...coreInputs.bundles];
    const capoBundle = await this.capo.getBundle();
    const capoBundleClass = capoBundle.constructor;
    const { delegateRoles } = this.capo;
    for (const [roleName, roleSetup] of Object.entries(delegateRoles)) {
      const { delegateType, delegateClass } = roleSetup;
      if (["spendDgt", "mintDgt", "authority"].includes(delegateType)) {
        continue;
      }
      if (delegateType === "dgDataPolicy") {
        const isSettingsRole = roleName === "settings";
        if (!isSettingsRole && !this.featureFlags?.[roleName]) {
          continue;
        }
        const dgDelegateClass = delegateClass;
        const dgBundleClass = await dgDelegateClass.scriptBundleClass();
        const boundDgBundleClass = dgBundleClass.usingCapoBundleClass(capoBundleClass);
        const dgBundle = new boundDgBundleClass();
        bundles.push({
          name: dgBundle.moduleName || dgBundle.constructor.name,
          sourceHash: dgBundle.computeSourceHash(),
          params: {}
        });
      }
    }
    return {
      bundles,
      extra: {
        // heliosVersion is in genesis (actors) snapshot only - no need to repeat here
        // ...coreInputs.extra,
        featureFlags: this.featureFlags || {}
      }
    };
  }
};
__decorateClass([
  _CapoTestHelper.hasNamedSnapshot({
    actor: "default",
    parentSnapName: "genesis",
    // Resolver takes helper as explicit argument (ARCH-8rqhpfy1ym)
    async resolveScriptDependencies(helper) {
      const h = helper;
      if (h.actorSetupInfo.length === 0) {
        h._silentActorSetup = true;
        try {
          await h.setupActors();
        } finally {
          h._silentActorSetup = false;
        }
      }
      return h.resolveActorsDependencies();
    },
    // Label includes seed for easier debugging (ARCH-jj5swg0hfk)
    computeDirLabel: (inputs) => `seed${inputs.extra?.randomSeed ?? ""}`
  })
], _CapoTestHelper.prototype, "snapToBootstrapWithActors");
__decorateClass([
  _CapoTestHelper.hasNamedSnapshot({
    actor: "default",
    parentSnapName: SNAP_ACTORS,
    internal: true,
    // REQT/h4kp7wm2nx (internal: true skips reusableBootstrap)
    // Resolver takes helper as explicit argument (ARCH-8rqhpfy1ym)
    async resolveScriptDependencies(helper) {
      return helper.resolveCoreCapoDependencies();
    }
  })
], _CapoTestHelper.prototype, "snapToCapoInitialized");
__decorateClass([
  _CapoTestHelper.hasNamedSnapshot({
    actor: "default",
    parentSnapName: SNAP_CAPO_INIT,
    internal: true,
    // REQT/h4kp7wm2nx (internal: true skips reusableBootstrap)
    // Resolver takes helper as explicit argument (ARCH-8rqhpfy1ym)
    async resolveScriptDependencies(helper) {
      return helper.resolveEnabledDelegatesDependencies();
    }
  })
], _CapoTestHelper.prototype, "snapToEnabledDelegatesDeployed");
let CapoTestHelper = _CapoTestHelper;

class DefaultCapoTestHelper extends CapoTestHelper {
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
  static forCapoClass(s, specialState) {
    class specificCapoHelper extends DefaultCapoTestHelper {
      get stellarClass() {
        return s;
      }
      /**
       * Merged defaultHelperState including any specialState fields
       */
      static defaultHelperState = {
        ...DefaultCapoTestHelper.defaultHelperState,
        ...specialState ?? {}
      };
    }
    return specificCapoHelper;
  }
  //xx@ts-expect-error
  get stellarClass() {
    return CapoWithoutSettings;
  }
  _start;
  constructor(config, helperState) {
    super(config, helperState);
    this._start = (/* @__PURE__ */ new Date()).getTime();
  }
  ts(...args) {
    console.log(this.relativeTs, ...args);
  }
  requiresActorRole(roleName, firstLetter) {
    if (this.actorName[0] != firstLetter) {
      throw new Error(
        `expected current actor name (${this.actorName}) to be one of the ${roleName} profiles starting with '${firstLetter}' in the test helper`
      );
    }
  }
  get relativeTs() {
    const ms = (/* @__PURE__ */ new Date()).getTime() - this._start;
    const s = ms / 1e3;
    return `@ ${s}s`;
  }
  //!!! todo: create type-safe ActorMap helper hasActors(), on same pattern as hasRequirements
  async setupActors() {
    this.addActor("tina", 11000n * ADA);
    this.addActor("tracy", 13n * ADA);
    this.addActor("tom", 1200n * ADA);
  }
  setDefaultActor() {
    return this.setActor("tina");
  }
  async mkCharterSpendTx() {
    await this.mintCharterToken();
    const treasury = await this.strella;
    const tcx = this.mkTcx();
    const tcx2 = await treasury.txnAttachScriptOrRefScript(
      await treasury.txnAddGovAuthority(tcx),
      await treasury.asyncCompiledScript()
    );
    return treasury.txnMustUseCharterUtxo(
      tcx2,
      treasury.activityUsingAuthority()
    );
  }
  // accesses the delegate roles, iterates the namedDelegate entries,
  // and uses txnCreateConfiguredDelegate() to trigger compilation of the script for each one
  async checkDelegateScripts(args = {}) {
    const { strella: capo } = this;
    const { delegateRoles } = capo;
    const goodArgs = {
      ...this.mkDefaultCharterArgs(),
      ...args
    };
    let helperTxn = await capo.mkTxnMintCharterToken(
      goodArgs,
      void 0,
      "DRY_RUN"
    );
    console.log("  \u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E} ");
    for (const dgtLabel of Object.keys(delegateRoles)) {
      const dgtSetup = delegateRoles[dgtLabel];
      const { config, delegateClass, delegateType, uutPurpose } = dgtSetup;
      console.log(
        `  -- checking delegate script: ${dgtLabel} (${delegateType})`
      );
      helperTxn = await capo.txnWillMintUuts(
        helperTxn,
        [uutPurpose],
        { usingSeedUtxo: helperTxn.state.seedUtxo },
        {
          // namedDelegate: uutPurpose,
          [dgtLabel]: uutPurpose
        }
      );
      const addr = this.wallet.address;
      await capo.txnCreateOffchainDelegateLink(
        helperTxn,
        dgtLabel,
        {
          // strategyName: delegateName,
          uutName: helperTxn.state.uuts[uutPurpose].name,
          config: {
            // rev: 1n,
            addrHint: [addr]
          }
        }
      );
    }
  }
  mkDefaultCharterArgs() {
    const addr = this.wallet.address;
    console.log("test helper charter -> actor addr", addr.toString());
    return {
      govAuthorityLink: {
        config: {
          //this.capo.stringifyDgtConfig({
          addrHint: [addr]
        }
      },
      mintDelegateLink: {
        config: {}
      },
      spendDelegateLink: {
        config: {}
      },
      mintInvariants: [],
      spendInvariants: [],
      otherNamedDelegates: /* @__PURE__ */ new Map(),
      manifest: /* @__PURE__ */ new Map(),
      rev: 1n
    };
  }
  async mintCharterToken(args, submitOptions = {}) {
    const { delay } = this;
    const { tina, tom, tracy } = this.actors;
    if (this.state.mintedCharterToken) {
      if (typeof this.state.mintedCharterToken === "object" && this.state.mintedCharterToken.state) {
        console.warn(
          "reusing minted charter from existing testing-context"
        );
        return this.state.mintedCharterToken;
      }
      console.log("  -- charter already minted (restored from cache)");
      return;
    }
    if (!this.strella) await this.initialize();
    const capo = await this.strella;
    const goodArgs = {
      ...this.mkDefaultCharterArgs(),
      ...args || {}
    };
    const tcx = await capo.mkTxnMintCharterToken(goodArgs);
    const config = this.state.config = tcx.state.bootstrappedConfig;
    this.state.parsedConfig = parseCapoJSONConfig(config);
    expect(capo.network).toBe(this.network);
    await tcx.submitAll(submitOptions);
    console.log(
      `----- charter token minted at slot ${this.network.currentSlot}`
    );
    this.network.tick(1);
    this.state.mintedCharterToken = tcx;
    return tcx;
  }
  async updateCharter(args, submitSettings = {}) {
    await this.mintCharterToken();
    const treasury = await this.strella;
    const { signers } = this.state;
    const tcx = await treasury.mkTxnUpdateCharter(args);
    return tcx.submitAll({
      signers,
      ...submitSettings
    }).then(() => {
      this.network.tick(1);
      return tcx;
    });
  }
  // async updateSettings(
  //     args: DetectSettingsType<CAPO>,
  //     submitSettings: SubmitOptions = {}
  // ) {
  //     await this.mintCharterToken();
  //     const capo = this.strella!;
  //     const tcx = await capo.mkTxnUpdateOnchainSettings(args);
  //     return tcx.submit(submitSettings).then(() => {
  //         this.network.tick(1);
  //         return tcx;
  //     });
  // }
}

const insufficientInputError = /(need .* lovelace, but only have|transaction doesn't have enough inputs)/;
Error.stackTraceLimit = 100;

export { ADA, CapoTestHelper, DefaultCapoTestHelper, SimpleWallet_stellar, SnapshotCache, StellarNetworkEmulator, StellarTestHelper, addTestContext, insufficientInputError };
//# sourceMappingURL=testing-node.mjs.map
