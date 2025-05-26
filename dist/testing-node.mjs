import { dumpAny, environment, TxBatcher, GenericSigner, UtxoHelper, utxosAsString, findInputsInWallets, txAsString, lovelaceToAda, StellarTxnContext, CapoWithoutSettings, parseCapoJSONConfig } from '@donecollectively/stellar-contracts';
import { DEFAULT_NETWORK_PARAMS, makeNetworkParamsHelper, makeAssets, makeTxOutputId, makeAddress, makeStakingAddress, makeValue } from '@helios-lang/ledger';
import { generateBytes, mulberry32 } from '@helios-lang/crypto';
import '@helios-lang/codec-utils';
import { SECOND, makeEmulatorGenesisTx, makeEmulatorRegularTx, BIP39_DICT_EN, restoreRootPrivateKey, signCip30CoseData, makeRootPrivateKey, makeTxBuilder } from '@helios-lang/tx-utils';
import { expectDefined } from '@helios-lang/type-utils';

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

let p = process || {}, argv = p.argv || [], env = p.env || {};
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
  static fromRootPrivateKey(key, networkCtx) {
    return new SimpleWallet_stellar(
      networkCtx,
      key.deriveSpendingKey(),
      key.deriveStakingKey()
    );
  }
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
  blocks;
  /**
   * Cached map of all UTxOs ever created
   * @internal
   */
  _allUtxos;
  /**
   * Cached set of all UTxOs ever consumed
   * @internal
   */
  _consumedUtxos;
  /**
   * Cached map of UTxOs at addresses
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
  snapshot(snapName) {
    if (this.mempool.length > 0) {
      throw new Error(`can't snapshot with pending txns`);
    }
    console.log(
      "            \u{1F4F8} \u{1F4F8} \u{1F4F8}   \u2588\u2588\u2588\u2588  \u{1F4F8} \u{1F4F8} \u{1F4F8}  #" + this.id,
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
          [...utxoList]
        ])
      )
    };
  }
  fromSnapshot = "";
  loadSnapshot(snapshot) {
    this.#seed = snapshot.seed;
    this.currentSlot = snapshot.slot;
    this.genesis = [...snapshot.genesis];
    this.blocks = [...snapshot.blocks];
    this.fromSnapshot = snapshot.name;
    this._allUtxos = { ...snapshot.allUtxos };
    this._consumedUtxos = new Set(snapshot.consumedUtxos);
    this._addressUtxos = Object.fromEntries(
      Object.entries(snapshot.addressUtxos).map(([addr, utxoList]) => [
        addr,
        [...utxoList]
      ])
    );
    this.initHelper();
    console.log(
      "            \u{1F33A}\u{1F33A}\u{1F33A} \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588  #" + this.id,
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
          `## ${this.id}: input previously consumed:` + dumpAny(input)
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
   * @internal
   */
  pushBlock(txs) {
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

class StellarTestHelper {
  state;
  config;
  defaultActor;
  strella;
  actors;
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
   * @public
   */
  actorContext = {
    wallet: void 0
  };
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
            `actor / wallet mismatch: ${this._actorName} ${dumpAny(
              this.actorContext.wallet?.address
            )} vs ${actorName} ${dumpAny(thisActor.address)}`
          );
        }
        return;
      }
      console.log(
        `
\u{1F3AD} -> \u{1F3AD} changing actor from \u{1F3AD} ${this._actorName} to  \u{1F3AD} ${actorName} ${dumpAny(thisActor.address)}`
      );
    } else {
      console.log(
        `
\u{1F3AD}\u{1F3AD} initial actor ${actorName} ${dumpAny(
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
  helperState;
  constructor(config, helperState) {
    this.state = {};
    if (!helperState) {
      console.warn(
        // warning emoji: "⚠️"
        // info emoji: "ℹ️"
        `\u26A0\uFE0F \u26A0\uFE0F \u26A0\uFE0F Note: this test helper doesn't have a helperState, so it won't be able to use test-chain snapshots
\u2139\uFE0F \u2139\uFE0F \u2139\uFE0F ... to add helper state, follow this pattern:

    // in your test helper:

    @CapoTestHelper.hasNamedSnapshot("yourSnapshot", "tina")
    snapTo\u2039YourSnapshot\u203A() {
        // never called
    }
    async \u2039yourSnapshot\u203A() {
        this.setActor("tina");

        // ... your good sequence of transaction(s) here
        const tcx = this.capo.mkTxn\u2039...\u203A(...)
        return this.submitTxnWithBlock(tcx);
    }

    // in your test setup:

    type localTC = StellarTestContext<YourCapo>;
    let helperState: TestHelperState<YourCapo> = {
        snapshots: {},
    } as any;

    beforeEach<localTC>(async (context) => {
        await addTestContext(context,
            YourCapoTestHelper,
            undefined,
            helperState
        )
    }                

    // in your tests:
    
    describe("your thing", async () => {
        it("your test", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
            await h.reusableBootstrap();

            await h.snapTo\u2039yourSnapshot\u203A()
        });
        it("your other test", async (context: localTC) => { 
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
            // this one will use the snapshot generated earlier
            await h.snapTo\u2039yourSnapshot\u203A()
        });
    })

... happy (and snappy) testing!`
      );
    }
    this.helperState = helperState;
    const cfg = config || {};
    if (Object.keys(cfg).length) {
      console.log(
        "XXXXXXXXXXXXXXXXXXXXXXXXXX test helper with config",
        config
      );
      this.config = config;
    }
    const t = this.mkNetwork(this.fixupParams(DEFAULT_NETWORK_PARAMS()));
    const theNetwork = t[0];
    const netParamsHelper = t[1];
    this.netPHelper = netParamsHelper;
    this.networkCtx = {
      network: theNetwork
    };
    this.randomSeed = config?.randomSeed || 42;
    this.actors = {};
    const now = /* @__PURE__ */ new Date();
    this.waitUntil(now);
    console.log(" + StellarTestHelper");
  }
  /**
   * @public
   */
  fixupParams(preProdParams) {
    if (preProdParams.isFixedUp) return preProdParams;
    const origMaxTxSize = preProdParams.maxTxSize;
    preProdParams.origMaxTxSize = origMaxTxSize;
    const maxTxSize = Math.floor(origMaxTxSize * 5);
    console.log(
      "test env: \u{1F527}\u{1F527}\u{1F527} fixup max tx size",
      origMaxTxSize,
      " -> \u{1F527}",
      maxTxSize
    );
    preProdParams.maxTxSize = maxTxSize;
    const origMaxMem = preProdParams.maxTxExMem;
    preProdParams.origMaxTxExMem = origMaxMem;
    const maxMem = Math.floor(origMaxMem * 8);
    console.log(
      "test env: \u{1F527}\u{1F527}\u{1F527} fixup max memory",
      origMaxMem,
      " -> \u{1F527}",
      maxMem
    );
    preProdParams.maxTxExMem = maxMem;
    const origMaxCpu = preProdParams.maxTxExCpu;
    preProdParams.origMaxTxExCpu = origMaxCpu;
    const maxCpu = Math.floor(origMaxCpu * 3.1);
    console.log(
      "test env: \u{1F527}\u{1F527}\u{1F527} fixup max cpu",
      origMaxCpu,
      " -> \u{1F527}",
      maxCpu
    );
    preProdParams.maxTxExCpu = maxCpu;
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
      optimize: environment.OPTIMIZE ? true : this.optimize
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
    environment.OPTIMIZE;
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
   * @public
   */
  async mkSeedUtxo(seedIndex = 0n) {
    const { wallet } = this;
    const { network } = this;
    const txb = makeTxBuilder({
      isMainnet: network.isMainnet()
    });
    const actorMoney = await wallet.utxos;
    console.log(
      `${this._actorName} has money: 
` + utxosAsString(actorMoney)
    );
    txb.spendWithoutRedeemer(
      await findInputsInWallets(
        makeValue(30n * ADA),
        { wallets: [wallet] },
        network
      )
    );
    txb.payUnsafe(wallet.address, makeValue(10n * ADA));
    txb.payUnsafe(wallet.address, makeValue(10n * ADA));
    let si = 2;
    for (; si < seedIndex; si++) {
      txb.payUnsafe(wallet.address, makeValue(10n * ADA));
    }
    const txId = await this.submitTx(
      await txb.build({
        changeAddress: wallet.address,
        networkParams: this.networkParams
      }),
      "force"
    );
    return txId;
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
` + txAsString(tx, this.networkParams)
      // new Error(`at stack`).stack
    );
    try {
      const txId = await this.network.submitTx(tx);
      console.log(
        "test helper submitted direct txn:" + txAsString(tx, this.networkParams)
      );
      this.network.tick(1);
      return txId;
    } catch (e) {
      console.error(
        `submit failed: ${e.message}
  ... in tx ${txAsString(tx)}`
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
  addActor(roleName, walletBalance, ...moreUtxos) {
    if (this.actors[roleName])
      throw new Error(`duplicate role name '${roleName}'`);
    //! it instantiates a wallet with the indicated balance pre-set
    const a = this.createWallet(walletBalance);
    const addr = a.address.toString();
    console.log(
      `+\u{1F3AD} Actor: ${roleName}: ${addr.slice(0, 12)}\u2026${addr.slice(
        -4
      )} ${lovelaceToAda(walletBalance)} (\u{1F511}#${a.address.spendingCredential?.toHex().substring(0, 8)}\u2026)`
    );
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
    const theNetwork = new StellarNetworkEmulator(void 0, { params });
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

const ACTORS_ALREADY_MOVED = "NONE! all actors were moved from a different network via snapshot";
const SNAP_BOOTSTRAP = "bootstrapped";
class CapoTestHelper extends StellarTestHelper {
  get capo() {
    return this.strella;
  }
  featureFlags = void 0;
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
      this._actorName = "";
    }
    await this.delay(1);
    this.randomSeed = randomSeed;
    if (Object.keys(this.actors).length) {
      console.log("Skipping actor setup - already done");
    } else {
      console.log("  -- \u{1F3AD}\u{1F3AD}\u{1F3AD} actor setup...");
      const actorSetup = this.setupActors();
      await actorSetup;
      this.network.tick(1);
      await this.setDefaultActor();
    }
    this.state.mintedCharterToken = void 0;
    this.state.parsedConfig = void 0;
    //! when there's not a preset config, it leaves the detailed setup to be done just-in-time
    if (!this.config) {
      console.log("  -- Capo not yet bootstrapped");
      const ts1 = Date.now();
      const { featureFlags } = this;
      if (featureFlags) {
        this.strella = await this.initStrella(this.stellarClass, { featureFlags });
        this.strella.featureFlags = this.featureFlags;
      } else {
        this.strella = await this.initStrella(this.stellarClass);
      }
      const ts2 = Date.now();
      console.log(
        // stopwatch emoji: ⏱️
        `  -- \u23F1\uFE0F initialized Capo: ${ts2 - ts1}ms`
      );
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
    const tcx = new StellarTxnContext(this.strella.setup);
    if (txnName) return tcx.withName(txnName);
    return tcx;
  }
  loadSnapshot(snapName) {
    const snap = this.helperState.snapshots[snapName];
    if (!snap) throw new Error(`no snapshot named ${snapName}`);
    this.network.loadSnapshot(snap);
  }
  async reusableBootstrap(snap = SNAP_BOOTSTRAP) {
    let capo;
    const helperState = this.helperState;
    if (helperState.bootstrapped) {
      console.log("  ---  \u2697\uFE0F\u{1F41E}\u{1F41E} already bootstrapped");
      if (!helperState.previousHelper) {
        debugger;
        throw new Error(
          `already bootstrapped, but no previousHelper : ( `
        );
      }
      capo = await this.restoreFrom(snap);
    } else {
      capo = await this.bootstrap();
      helperState.bootstrappedStrella = capo;
    }
    const { previousHelper } = helperState;
    if (!previousHelper) {
      this.snapshot(SNAP_BOOTSTRAP);
    } else {
      console.log(
        `changing helper from network ${previousHelper.network.id} to ${this.network.id}`
      );
    }
    helperState.bootstrapped = true;
    helperState.previousHelper = this;
    return capo;
  }
  // a decorator for test-helper functions that generate named snapshots
  static hasNamedSnapshot(snapshotName, actorName) {
    return function(target, propertyKey, descriptor) {
      descriptor.value;
      descriptor.value = SnapWrap;
      const [_, WithCapMethodName] = propertyKey.match(/^snapTo(.*)/) || [];
      if (!WithCapMethodName) {
        throw new Error(
          `hasNamedSnapshot(): ${propertyKey}(): expected method name to start with 'snapTo'`
        );
      }
      const methodName = WithCapMethodName[0].toLowerCase() + WithCapMethodName.slice(1);
      const generateSnapshotFunc = target[methodName];
      if (!generateSnapshotFunc) {
        throw new Error(
          `hasNamedSnapshot(): ${propertyKey}: expected method ${methodName} to exist`
        );
      }
      console.log(
        "hasNamedSnapshot(): ",
        propertyKey,
        " -> ",
        methodName
      );
      async function SnapWrap(...args) {
        await this.reusableBootstrap();
        return this.findOrCreateSnapshot(
          snapshotName,
          actorName,
          () => {
            return generateSnapshotFunc.apply(this, ...args).then((result) => {
              if (this.actorName !== actorName) {
                throw new Error(
                  `actorName mismatch during snapshot generation; was '${this.actorName}', expected '${actorName}'`
                );
              }
              this.network.tick(1);
              return result;
            });
          }
        );
      }
      return descriptor;
    };
  }
  hasSnapshot(snapshotName) {
    return !!this.helperState?.snapshots[snapshotName];
  }
  snapshot(snapshotName) {
    if (!this.helperState) {
      throw new Error(`can't snapshot without a helperState`);
    }
    if (this.hasSnapshot(snapshotName)) {
      throw new Error(`snapshot ${snapshotName} already exists`);
    }
    this.helperState.snapshots[snapshotName] = this.network.snapshot(snapshotName);
  }
  async findOrCreateSnapshot(snapshotName, actorName, contentBuilder) {
    if (this.helperState.snapshots[snapshotName]) {
      const capo = await this.restoreFrom(snapshotName);
      await this.setActor(actorName);
      return capo;
    }
    let result;
    try {
      result = await contentBuilder();
      return this.strella;
      return result;
    } catch (e) {
      throw e;
    } finally {
      if (result) {
        this.snapshot(snapshotName);
      }
    }
  }
  async restoreFrom(snapshotName) {
    const {
      helperState,
      helperState: {
        snapshots,
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
    if (!snapshots || !snapshots[snapshotName]) {
      throw new Error(`no snapshot named ${snapshotName} in helperState`);
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
    const otherNet = previousHelper.actors[ACTORS_ALREADY_MOVED];
    if (otherNet) {
      if (otherNet !== newNet.id) {
        throw new Error(
          `actors already moved to network #${otherNet}; can't move to #${newNet.id} now.`
        );
      }
      console.log("  -- actors are already here");
    } else {
      if (this === previousHelper) {
        console.log(
          "  -- helper already transferred; loading incremental snapshot"
        );
      } else {
        Object.assign(this.actors, previousHelper.actors);
        previousHelper.networkCtx = { network: previousNetwork };
        previousHelper.actorContext = {
          wallet: "previous network retired"
        };
        this.networkCtx = oldNetworkEnvelope;
        this.actorContext = oldActorContext;
        this.networkCtx.network = newNet;
        this.state.mintedCharterToken = previousHelper.state.mintedCharterToken;
        this.state.parsedConfig = parsedConfig;
        previousHelper.actors = { [ACTORS_ALREADY_MOVED]: newNet.id };
        console.log(
          `   -- moving ${Object.keys(this.actors).length} actors from network ${previousNetwork.id} to ${newNet.id}`
        );
      }
      newNet.loadSnapshot(snapshots[snapshotName]);
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
    if (this.bootstrap != CapoTestHelper.prototype.bootstrap) {
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
    await this.mintCharterToken(args, options);
    console.log(
      "       --- \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2697\uFE0F \u{1F41E} \u2705 Capo bootstrap with charter"
    );
    this.network.tick(1);
    await this.extraBootstrapping(args, options);
    return strella;
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
}

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
  static forCapoClass(s) {
    class specificCapoHelper extends DefaultCapoTestHelper {
      get stellarClass() {
        return s;
      }
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
      treasury.compiledScript
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
      console.warn(
        "reusing minted charter from existing testing-context"
      );
      return this.state.mintedCharterToken;
    }
    if (!this.strella) await this.initialize();
    const capo = await this.strella;
    const goodArgs = {
      ...this.mkDefaultCharterArgs(),
      ...args || {}
    };
    const tcx = await capo.mkTxnMintCharterToken(goodArgs);
    const rawConfig = this.state.rawConfig = this.state.config = tcx.state.bootstrappedConfig;
    this.state.parsedConfig = parseCapoJSONConfig(rawConfig);
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

export { ADA, CapoTestHelper, DefaultCapoTestHelper, SimpleWallet_stellar, StellarNetworkEmulator, StellarTestHelper, addTestContext, insufficientInputError };
//# sourceMappingURL=testing-node.mjs.map
