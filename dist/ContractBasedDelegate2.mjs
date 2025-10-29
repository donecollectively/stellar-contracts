import { makeTxOutput, makeTxInput } from '@helios-lang/ledger';
import { S as StellarContract, b as dumpAny, Z as mkTv, A as Activity, d as datum } from './StellarContract2.mjs';
import { decodeUtf8 } from '@helios-lang/codec-utils';
import { placeholderSetupDetails } from './HeliosBundle.mjs';

const TODO = Symbol("needs to be implemented");
function hasReqts(reqtsMap) {
  return reqtsMap;
}
hasReqts.TODO = TODO;
function mergesInheritedReqts(inherits, reqtsMap) {
  return { ...inherits, ...reqtsMap };
}

class StellarDelegate extends StellarContract {
  static currentRev = 1n;
  static get defaultParams() {
    return {
      rev: this.currentRev
    };
  }
  existingRedeemerError(label, authorityVal, existingRedeemer, redeemerActivity) {
    console.error(
      "This delegate authority is already being used in the transaction..."
    );
    console.error(
      "... you may use the {ifExists} option to handle this case, if appropriate"
    );
    return new Error(
      `Delegate ${label}: already added: ${dumpAny(
        authorityVal,
        this.networkParams
      )} with redeemer = ${existingRedeemer} ${redeemerActivity ? `
 ... needs redeemer = ${redeemerActivity} (maybe with MultipleDelegateActivities?)` : ""}`
    );
  }
  /**
   * Finds and adds the delegate's authority token to the transaction
   * @remarks
   *
   * calls the delegate-specific DelegateAddsAuthorityToken() method,
   * with the uut found by DelegateMustFindAuthorityToken().
   *
   * Returns the token back to the contract using {@link StellarDelegate.txnReceiveAuthorityToken | txnReceiveAuthorityToken() },
   * automatically, unless the `skipReturningDelegate` option is provided.
   *
   * If the authority token
   * @param tcx - transaction context
   * @public
   **/
  async txnGrantAuthority(tcx, redeemer, options = {}) {
    const label = `${this.constructor.name} authority`;
    const useMinTv = true;
    const authorityVal = this.tvAuthorityToken(useMinTv);
    const { skipReturningDelegate, ifExists } = options;
    const existing = tcx.hasAuthorityToken(authorityVal);
    if (existing) {
      const [existingInput, existingRedeemer] = tcx.txb.spendingRedeemers.find(
        ([inp, _redeemer]) => inp.value.isGreaterOrEqual(authorityVal)
      ) || [];
      if (ifExists) {
        ifExists(existingInput, existingRedeemer);
        return tcx;
      }
      throw this.existingRedeemerError(
        label,
        authorityVal,
        existingRedeemer
      );
    }
    const uutxo = await this.DelegateMustFindAuthorityToken(tcx, label);
    console.log(
      `   ------- delegate '${label}' grants authority with ${dumpAny(
        authorityVal,
        this.networkParams
      )}`
    );
    try {
      const tcx2 = await this.DelegateAddsAuthorityToken(
        tcx,
        uutxo,
        redeemer
      );
      if (skipReturningDelegate) return tcx2;
      return this.txnReceiveAuthorityToken(tcx2, authorityVal, uutxo);
    } catch (error) {
      if (error.message.match(/input already added/)) {
        throw new Error(
          `Delegate ${label}: already added: ${dumpAny(
            authorityVal,
            this.networkParams
          )}`
        );
      }
      throw error;
    }
  }
  /**
   * Finds the authority token and adds it to the transaction, tagged for retirement
   * @public
   * @remarks
   * Doesn't return the token back to the contract.
   **/
  async txnRetireAuthorityToken(tcx) {
    const uutxo = await this.DelegateMustFindAuthorityToken(
      tcx,
      `${this.constructor.name} authority`
    );
    return this.DelegateRetiresAuthorityToken(tcx, uutxo);
  }
  mkAuthorityTokenPredicate() {
    return this.uh.mkTokenPredicate(this.tvAuthorityToken());
  }
  get authorityTokenName() {
    return this.configIn.tn;
  }
  tvAuthorityToken(useMinTv = false) {
    if (!this.configIn)
      throw new Error(`must be instantiated with a configIn`);
    const {
      mph,
      tn
      // reqdAddress,  // removed
    } = this.configIn;
    if (useMinTv) return this.uh.mkMinTv(mph, tn);
    return mkTv(mph, tn);
  }
  get delegateValidatorHash() {
    return void 0;
  }
  /**
   * Captures requirements as data
   * @remarks
   *
   * see reqts structure
   * @public
   **/
  delegateRequirements() {
    return hasReqts({
      "provides an interface for providing arms-length proof of authority to any other contract": {
        purpose: "to decouple authority administration from its effects",
        details: [
          "Any contract can create a UUT for use with an authority policy.",
          "By depositing that UUT to the authority contract, it can delegate completely",
          "  ... all the implementation details for administration of the authority itself.",
          "It can then focus on implementing the effects of authority, requiring only ",
          "  ... that the correct UUT has been spent, to indicate that the authority is granted.",
          "The authority contract can have its own internal details ",
          "A subclass of this authority policy may provide additional administrative dynamics."
        ],
        mech: [],
        requires: [
          "implementations SHOULD positively govern spend of the UUT",
          "implementations MUST provide an essential interface for transaction-building"
        ]
      },
      "implementations SHOULD positively govern spend of the UUT": {
        purpose: "for sufficient assurance of desirable safeguards",
        details: [
          "A subclass of the GenericAuthority should take care of guarding the UUT's spend",
          "  ... in whatever way is appropriate for its use-case"
        ],
        mech: [],
        requires: []
      },
      "implementations MUST provide an essential interface for transaction-building": {
        purpose: "enabling a strategy-agnostic interface for making transactions using any supported strategy-variant",
        details: [
          "Subclasses MUST implement the interface methods",
          "  ... in whatever way is good for its use-case.",
          "An interface method whose requirement is marked with 'MAY/SHOULD' behavior, ",
          "  ... MUST still implement the method satisfying the interface, ",
          "  ... but MAY throw an UnsupportedAction error, to indicate that",
          "  ... the strategy variant has no meaningful action to perform ",
          "  ... that would serve the method's purpose"
        ],
        mech: [],
        requires: [
          //!!! todo: cross-check these requirements for completeness
          //  ... and for accuracy
          "requires a txnReceiveAuthorityToken(tcx, delegateAddr, fromFoundUtxo?)",
          "requires a mustFindAuthorityToken(tcx)",
          "requires a txnGrantAuthority(tcx, delegateAddr, fromFoundUtxo)",
          "requires txnRetireCred(tcx, fromFoundUtxo)"
        ]
      },
      "requires a txnReceiveAuthorityToken(tcx, delegateAddr, fromFoundUtxo?)": {
        purpose: "to deposit the authority token (back) to the delegated destination",
        details: [
          "impls MUST implement txnReceiveAuthorityToken",
          "Each implemented subclass can use it's own style to match its strategy & mechanism",
          "This is used both for the original deposit and for returning the token during a grant-of-authority"
        ],
        mech: [
          "impls MUST create a UTxO depositing the indicated token-name into the delegated destination.",
          "impls should normally preserve the datum from an already-present sourceUtxo"
        ],
        requires: []
      },
      "requires a mustFindAuthorityToken(tcx)": {
        purpose: "to locate the given authority token",
        details: [
          "allows different strategies for finding the UTxO having the authority token",
          "impls MAY use details seen in the txn context to find the indicated token"
        ],
        mech: [
          "impls MUST resolve the indicated token to a specific UTxO or throw an informative error"
        ]
      },
      "requires a txnGrantAuthority(tcx, delegateAddr, fromFoundUtxo)": {
        purpose: "to use the delegated authority",
        details: [
          "Adds the indicated utxo to the transaction with appropriate activity/redeemer",
          "Contracts needing the authority within a transaction can rely on the presence of this spent authority",
          "Impls can EXPECT the token will be returned via txnReceiveAuthorityToken",
          "a contract-backed impl SHOULD enforce the expected return in its on-chain code"
        ],
        mech: [
          "the base AuthorityPolicy MUST call txnReceiveAuthorityToken() with the token's sourceUtxo"
        ]
      },
      "requires txnRetireCred(tcx, fromFoundUtxo)": {
        purpose: "to allow burning the authority token",
        details: [
          "Adds the indicated utxo to the transaction with appropriate activity/redeemer",
          "  ... allowing the token to be burned by the minting policy.",
          "Impls SHOULD ensure any other UTXOs it may hold do not become inaccessible as a result"
        ],
        mech: [
          "impls MUST add the token to the txn if it can be retired",
          "if the token cannot be retired, by appropriate policy, it SHOULD throw an informative error"
        ]
      }
    });
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
class ContractBasedDelegate extends StellarDelegate {
  static currentRev = 1n;
  /**
   * Configures the matching parameter name in the on-chain script, indicating
   * that this delegate serves the Capo by enforcing policy for spending the Capo's utxos.
   * @remarks
   * Not used for any mint delegate.  Howeever, a mint delegate class can instead provide a true isMintAndSpendDelegate,
   *...  if a single script controls both the mintDgt-* and spendDgt-* tokens/delegation roles for your Capo.
   *
   * DO NOT enable this attribute for second-level delegates, such as named delegates or delegated-data controllers.
   * The base on-chain delegate script recognizes this conditional role and enforces that its generic delegated-data activities
   * are used only in the context the Capo's main spend delegate, re-delegating to the data-controller which
   * can't use those generic activities, but instead implements its user-facing txns as variants of its SpendingActivities enum.
   */
  static isSpendDelegate = false;
  get delegateName() {
    throw new Error(
      `${this.constructor.name}: missing required get delegateName() : string`
    );
  }
  _scriptBundle;
  async mkScriptBundle(setupDetails = placeholderSetupDetails) {
    if (this._scriptBundle) return this._scriptBundle;
    const bundle = await super.mkScriptBundle();
    if (bundle.isConcrete) return this._scriptBundle = bundle;
    const bundleClass = await this.scriptBundleClass();
    const myCapoBundle = await this.capo.mkScriptBundle();
    const capoBoundBundle = bundleClass.usingCapoBundleClass(
      myCapoBundle.constructor
    );
    return this._scriptBundle = capoBoundBundle.create({
      params: this.configIn,
      ...setupDetails,
      setup: this.setup
    });
  }
  get onchain() {
    return this.getOnchainBridge();
  }
  get offchain() {
    return super.offchain;
  }
  get reader() {
    return super.offchain;
  }
  get activity() {
    const bridge = this.onchain;
    return bridge.activity;
  }
  get mkDatum() {
    return this.onchain.datum;
  }
  get newReadDatum() {
    const bridge = this.getOnchainBridge();
    const { readDatum } = bridge;
    if (!readDatum) {
      throw new Error(
        `${this.constructor.name}: this contract script doesn't use datum`
      );
    }
    return readDatum;
  }
  get capo() {
    return (this.configIn || this.partialConfig)?.capo;
  }
  // mkBundleWithCapo<T extends HeliosScriptBundle>(BundleClass: new (capo: CapoHeliosBundle) => T) : T {
  //     const { capo } = this.configIn || this.partialConfig || {};
  //     if (!capo)
  //         throw new Error(
  //             `missing capo in config or partial-config for ${this.constructor.name}`
  //         );
  //     const capoBundle = capo.getBundle() as CapoHeliosBundle;
  //     return new BundleClass(capoBundle);
  // }
  async scriptBundleClass() {
    throw new Error(
      `${this.constructor.name}: missing required implementation of scriptBundle()

Each contract-based delegate must provide a scriptBundle() method.
It should return an instance of a class defined in a *.hlb.ts file.  At minimum:

    import {YourAppCapo} from "./YourAppCapo.js";

    import SomeSpecializedDelegate from "./YourSpecializedDelegate.hl";

    export default class SomeDelegateBundle extends CapoDelegateBundle.using(YourAppCapo) {
        specializedDelegateModule = SomeSpecializedDelegate; 
    }

We'll generate an additional .typeInfo.d.ts, based on the types in your Helios sources,
  ... and a .bridge.ts with generated data-conversion code for bridging between off-chain  ... and on-chain data encoding.Your scriptBundle() method can \`return new SomeDelegateBundle()\``
    );
  }
  get scriptDatumName() {
    return "DelegateDatum";
  }
  get scriptActivitiesName() {
    return "DelegateActivity";
  }
  static isMintDelegate = false;
  static isMintAndSpendDelegate = false;
  static isDgDataPolicy = false;
  static get defaultParams() {
    const params = {
      rev: this.currentRev,
      isMintDelegate: this.isMintDelegate,
      isSpendDelegate: this.isMintAndSpendDelegate,
      isDgDataPolicy: this.isDgDataPolicy
    };
    return params;
  }
  static mkDelegateWithArgs(a) {
  }
  getContractScriptParams(config) {
    const { capoAddr, mph, tn, capo, ...otherConfig } = config;
    return {
      ...otherConfig,
      delegateName: this.delegateName
    };
  }
  tcxWithCharterRef(tcx) {
    return this.capo.tcxWithCharterRef(tcx);
  }
  /**
   * Adds a mint-delegate-specific authority token to the txn output
   * @remarks
   *
   * Implements {@link StellarDelegate.txnReceiveAuthorityToken | txnReceiveAuthorityToken() }.
   *
   * Uses {@link ContractBasedDelegate.mkDelegationDatum | mkDelegationDatum()} to make the inline Datum for the output.
   * @see {@link StellarDelegate.txnReceiveAuthorityToken | baseline txnReceiveAuthorityToken()'s doc }
   * @public
   **/
  async txnReceiveAuthorityToken(tcx, tokenValue, fromFoundUtxo) {
    const datum2 = this.mkDelegationDatum(fromFoundUtxo);
    const newOutput = makeTxOutput(this.address, tokenValue, datum2);
    return tcx.addOutput(newOutput);
  }
  mkDelegationDatum(txin) {
    if (txin) return txin.output.datum;
    const { capoAddr, mph, tn, ..._otherCfgSettings } = this.configIn;
    return this.mkDatum.IsDelegation({
      capoAddr,
      mph,
      tn
    });
  }
  activityReplacingMe({
    seed,
    purpose
  }) {
    throw new Error(`deprecated: explicit activity helper`);
  }
  mkDelegateLifecycleActivity(delegateActivityName, args) {
    throw new Error(`deprecated: explicit activity helper`);
  }
  mkCapoLifecycleActivity(capoLifecycleActivityName, {
    seed,
    purpose,
    ...otherArgs
  }) {
    throw new Error(`deprecated: explicit activity helper`);
  }
  /**
   * Creates a reedemer for the indicated spending activity name
   **/
  mkSpendingActivity(spendingActivityName, args) {
    throw new Error(`deprecated: explicit activity helper`);
  }
  mkSeedlessMintingActivity(mintingActivityName, args) {
    const { MintingActivity } = this.onChainTypes;
    this.mustGetEnumVariant(
      MintingActivity,
      mintingActivityName
    );
    throw new Error(`mkSeedlessMintingActivity: deprecated`);
  }
  mkSeededMintingActivity(mintingActivityName, args) {
    const { MintingActivity } = this.onChainTypes;
    this.mustGetEnumVariant(
      MintingActivity,
      mintingActivityName
    );
    throw new Error(`mkSeededMintingActivity: deprecated`);
  }
  activityRetiring() {
    throw new Error(`deprecated: explicit activity helper`);
  }
  activityValidatingSettings() {
    throw new Error(`deprecated: explicit activity helper`);
  }
  // @Activity.redeemer
  activityMultipleDelegateActivities(...activities) {
    throw new Error(`deprecated: explicit activity helper`);
  }
  activityDeletingDelegatedData(recId) {
    throw new Error(`deprecated: explicit activity helper`);
  }
  mkDatumIsDelegation(dd) {
    const { DelegationDetail } = this.onChainTypes;
    throw new Error(`deprecated: explicit datum helper`);
  }
  /**
   * returns the ValidatorHash of the delegate script, if relevant
   * @public
   * @remarks
   *
   * A delegate that doesn't use an on-chain validator should override this method and return undefined.
   **/
  get delegateValidatorHash() {
    if (!this.usesContractScript) {
      throw new Error(
        `${this.constructor.name}: address doesn't use a validator hash!
  ... if that's by design, you may wish to override 'get delegateValidatorHash()'`
      );
    }
    return this.validatorHash;
  }
  /**
   * {@inheritdoc StellarDelegate.DelegateMustFindAuthorityToken}
   **/
  async DelegateMustFindAuthorityToken(tcx, label) {
    return this.mustFindMyUtxo(
      `${label}: ${decodeUtf8(this.configIn.tn)}`,
      {
        predicate: this.uh.mkTokenPredicate(this.tvAuthorityToken()),
        extraErrorHint: "this delegate strategy might need to override txnMustFindAuthorityToken()"
      }
    );
  }
  /**
   * Adds the delegate's authority token to a transaction
   * @public
   * @remarks
   * Given a delegate already configured by a Capo, this method implements
   * transaction-building logic needed to include the UUT into the `tcx`.
   * the `utxo` is discovered by {@link StellarDelegate.DelegateMustFindAuthorityToken | DelegateMustFindAuthorityToken() }
   *
   * The off-chain code shouldn't need to check the details; it can simply
   * arrange the details properly and spend the delegate's authority token,
   * using this method.
   *
   * ### Reliance on this delegate
   *
   * Other contract scripts can rely on the delegate script to have validated its
   * on-chain policy and enforced its own "return to the delegate script" logic.
   *
   * ### Enforcing on-chain policy
   *
   * When spending the authority token in this way, the delegate's authority is typically
   * narrowly scoped, and it's expected that the delegate's on-chain script validates that
   * those parts of the transaction detail should be authorized, in accordance with the
   * delegate's core purpose/responsbility - i.e. that the txn does all of what the delegate
   * expects, and none of what it shouldn't do in that department.
   *
   * The on-chain code SHOULD typically enforce:
   *  * that the token is spent with an application-specific redeemer variant of its
   *     MintingActivity or SpendingActivitie.
   *
   *  * that the authority token is returned to the contract with its datum unchanged
   *  * that any other tokens it may also hold in the same UTxO do not become
   *     inaccessible as a result of the transactions - perhaps by requiring them to be
   *     returned together with the authority token.
   *
   * It MAY enforce additional requirements as well.
   *
   * @example
   * A minting delegate should check that all the expected tokens are
   * minted, AND that no other tokens are minted.
   *
   * @example
   * A role-based authentication/signature-checking delegate can
   * require an appropriate signature on the txn.
   *
   * @param tcx - the transaction context
   * @param utxo - the utxo having the authority UUT for this delegate
   * @reqt Adds the uutxo to the transaction inputs with appropriate redeemer.
   * @reqt Does not output the value; can EXPECT txnReceiveAuthorityToken to be called for that purpose.
   **/
  async DelegateAddsAuthorityToken(tcx, uutxo, redeemer) {
    const { capo } = this.configIn;
    const script = this._bundle?.previousCompiledScript() || await this.asyncCompiledScript();
    const tcx2 = await capo.txnAttachScriptOrRefScript(tcx, script);
    if (!redeemer.redeemer) debugger;
    return tcx2.addInput(uutxo, redeemer);
  }
  /**
   * {@inheritdoc StellarDelegate.DelegateAddsAuthorityToken}
   **/
  async DelegateRetiresAuthorityToken(tcx, fromFoundUtxo) {
    const utxo = fromFoundUtxo;
    return tcx.addInput(
      makeTxInput(utxo.id, utxo.output),
      this.activity.DelegateLifecycleActivities.Retiring
    );
  }
}
__decorateClass([
  Activity.redeemer
], ContractBasedDelegate.prototype, "activityReplacingMe");
__decorateClass([
  Activity.redeemer
], ContractBasedDelegate.prototype, "activityRetiring");
__decorateClass([
  Activity.redeemer
], ContractBasedDelegate.prototype, "activityValidatingSettings");
__decorateClass([
  Activity.redeemer
], ContractBasedDelegate.prototype, "activityDeletingDelegatedData");
__decorateClass([
  datum
], ContractBasedDelegate.prototype, "mkDatumIsDelegation");

export { ContractBasedDelegate as C, StellarDelegate as S, hasReqts as h, mergesInheritedReqts as m };
//# sourceMappingURL=ContractBasedDelegate2.mjs.map
