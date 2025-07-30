import { makeValue, makeTxOutput } from '@helios-lang/ledger';
import { makeIntData } from '@helios-lang/uplc';
import { C as ContractBasedDelegate, u as uplcDataSerializer, Q as betterJsonSerializer, e as dumpAny } from './ContractBasedDelegate2.mjs';
import { encodeUtf8 } from '@helios-lang/codec-utils';
import '@helios-lang/crypto';
import '@helios-lang/tx-utils';
import 'nanoid';
import './HeliosBundle.mjs';
import '@donecollectively/stellar-contracts/HeliosProgramWithCacheAPI';
import '@helios-lang/compiler';
import '@helios-lang/contract-utils';
import './environment.mjs';

class DelegatedDataContract extends ContractBasedDelegate {
  static isDgDataPolicy = true;
  static isMintDelegate = false;
  usesWrappedData;
  dgDatumHelper = this.dataBridgeClass?.prototype.DelegateDatum;
  /**
   * when set to true, the controller class will include the Capo's
   * gov authority in the transaction, to ease transaction setup.
   * @remarks
   * This is a convenience for the controller, and should be used along with
   * the appropriate on-chain policy to require the gov token's presence.
   * @public
   */
  get needsGovAuthority() {
    return this._bundle.requiresGovAuthority;
  }
  /**
   * Provides a customized label for the delegate, used in place of
   * a generic script name ("BasicDelegate").  DelegatedDataContract
   * provides a default name with the record type name and "Pol" suffix.
   *
   * Affects the on-chain logging for the policy and the compiled script
   * output in the script-cache on-disk or in browser's storage.
   */
  get delegateName() {
    return `${this.recordTypeName}Pol`;
  }
  // async findRecord(id: string | UutName) {
  //     return this.capo
  //         .findDelegatedDataUtxos({
  //             type: this.recordTypeName,
  //             id,
  //         })
  //         .then(this.capo.singleItem);
  // }
  get abstractBundleClass() {
    return void 0;
  }
  scriptBundle() {
    if (this.abstractBundleClass) {
      throw new Error(
        `${this.constructor.name}: this pluggable delegate requires a bit of setup that doesn't seem to be done yet.
First, ensure you have derived a subclass for the controller, with a scriptBundle() method.

That method should \`return YourConcreteBundle.create()\`

  ... where YourConcreteBundle is a subclass of CapoDelegateBundle that you've created.

A concrete bundle class should be defined in \`${this.delegateName}.concrete.hlb.ts\`
  ... in the same directory as your derived controller class:

    import {YourAppCapo} from "./YourAppCapo.js";
    import {${this.abstractBundleClass.name}} from ...
    export default class YourConcreteBundle extends ${this.abstractBundleClass.name}} {
        // ... 
    }
`
      );
    }
    throw new Error(
      `${this.constructor.name}: missing required implementation of scriptBundle()

That method should \`return YourScriptBundle.create()\`

  ... where YourScriptBundle is a subclass of CapoDelegateBundle that you've created.

Defined in a \`*.hlb.ts\` file, it should have at minimum:
    import {YourAppCapo} from "./YourAppCapo.js";

    import SomeSpecializedDelegate from "./YourSpecializedDelegate.hl";

    export default class SomeDelegateBundle extends CapoHeliosBundle {
        specializedDelegateModule = SomeSpecializedDelegate;
    }

We'll generate types in a .typeInfo.d.ts file, based on the types in your Helios sources,
  ... and a .bridge.ts file having data-conversion classes for your on-chain types.
When your delegated-data controller is used within your Capo, your bundle will
have access via import {...} to any helios modules provided by that Capo's .hlb.ts. `
    );
  }
  async findRecords(options = {}) {
    const result = await this.capo.findDelegatedDataUtxos({
      type: this.recordTypeName,
      id: options.id
      // single, // todo: support single in the options
      // predicate
    });
    if (options.id == void 0) {
      return result;
    }
    return this.capo.singleItem(result);
  }
  mkDgDatum(record) {
    return this.mkDatum.capoStoredData({
      data: record,
      version: 2n,
      otherDetails: makeIntData(0)
    });
  }
  /**
   * Intuition hook redirecting to activity.MintingActivities.$seeded$...
   * @remarks
   * @deprecated use activites.MintingActivites.$seeded$* accessors/methods instead.
   */
  usesSeedActivity(a, seedPlaceholder, ...args) {
    throw new Error(
      `make an implied-seed activity with this.activity.MintingActivites.$seeded$*`
    );
  }
  /**
   * builds a txn creating a record of this type in the data store
   * @remarks
   * The \{activity\} option can be a {@link SeedActivity} object provided by
   * `this.activity.MintingActivities.$seeded$‹activityName›` accessors/methods,
   * which creates a record id based on the (unique) spend of a seed value.
   */
  async mkTxnCreateRecord(options, tcx) {
    tcx = tcx || this.mkTcx(`create ${this.recordTypeName}`);
    const tcx1a = await this.tcxWithCharterRef(tcx);
    const tcx1b = await this.tcxWithSeedUtxo(tcx1a);
    const tcx1c = tcx1b;
    const { capo } = this;
    const mintDelegate = await capo.getMintDelegate();
    const dataType = this.recordTypeName;
    const tcx2 = await capo.txnMintingUuts(
      tcx1c,
      [this.idPrefix],
      {
        mintDelegateActivity: mintDelegate.activity.CreatingDelegatedData(tcx1c, {
          dataType
        })
      },
      {
        recordId: this.idPrefix
      }
    );
    const effectiveActivity = options.activity ?? //@ts-expect-error on a default activity name that SHOULD be there by convention
    this.activity.MintingActivities.$seeded$CreatingRecord;
    const activity = effectiveActivity && //@ts-expect-error hitting up the SeedActivity object with a conditional func call
    // ... that might be just an activity object
    (effectiveActivity.mkRedeemer?.(tcx2) ?? effectiveActivity);
    if (!activity) {
      throw new Error(
        `no activity provided, and the default activity name (this.activity.MintingActivities.$seeded$CreatingRecord) is missing from the type bridge`
      );
    }
    return this.txnCreatingRecord(tcx2, {
      ...options,
      activity
    }).then((tcx3) => tcx3);
  }
  creationDefaultDetails() {
    return {};
  }
  beforeCreate(record) {
    return record;
  }
  async txnCreatingRecord(tcx, options) {
    const newType = this.recordTypeName;
    const idPrefix = this.idPrefix;
    const {
      addedUtxoValue: extraCreationValue = makeValue(0n),
      data: typedData,
      activity
    } = options;
    const tcx2 = await this.txnGrantAuthority(tcx, activity);
    const uut = tcx.state.uuts[idPrefix];
    let newRecord = typedData;
    const defaults = this.creationDefaultDetails() || {};
    const fullRecord = this.beforeCreate({
      // the type-name itself is sometimes const and fully type-safe, but sometimes is just stringy - but it's there
      id: encodeUtf8(uut.toString()),
      type: newType,
      ...defaults,
      ...newRecord
    });
    const newDatum = this.mkDatum.capoStoredData({
      // data: new Map(Object.entries(beforeSave(fullRecord) as any)),
      data: fullRecord,
      version: 2n,
      otherDetails: makeIntData(0)
    });
    console.log(
      `\u{1F3D2} creating ${newType} -> ` + uplcDataSerializer(newType, fullRecord, 1)
    );
    let tcx3 = tcx2;
    if (this.needsGovAuthority) {
      tcx3 = await this.capo.txnAddGovAuthority(tcx2);
    }
    return tcx3.addOutput(
      makeTxOutput(
        this.capo.address,
        this.uh.mkMinTv(this.capo.mph, uut).add(extraCreationValue),
        newDatum
      )
    );
  }
  /**
   * Creates an indirect reference to an an update activity with arguments,
   * using a record-id placeholder.
   *
   * @remarks
   * Provide an update activity function, a placeholder for the record-id, any other args
   * for the on-chain activity/redeemer.  The update-activity function can be any of this
   * contract's `activity.SpendingActivities.*` functions.
   *
   * This approach is similar to the creation-time {@link DelegatedDataContract.usesSeedActivity|usesSeedActivity()} method,
   * with a "...recId" placeholder instead of a "...seed" placeholder.
   *
   * The arguments are passed to the update activity function, which is expected to return
   * an {@link isActivity} object serializing the `{redeemer}` data as a UplcData object.
   * Normally that's done with {@link ContractBasedDelegate.mkSpendingActivity | mkSpendingActivity()}.
   */
  usesUpdateActivity(a, _idPlaceholder, ...args) {
    return new UpdateActivity(this, a, args);
  }
  /**
   * Creates a transaction for updating a record in the delegated data store
   *
   * @remarks
   * Provide a transaction name, an existing item, and a controller activity to trigger.
   * The activity MUST either be an activity triggering one of the controller's SpendingActivity variants,
   * or the result of calling {@link DelegatedDataContract.usesUpdateActivity | usesUpdateActivity()}.
   *   **or TODO support a multi-activity**
   *
   * The updatedRecord only needs to contain the fields that are being updated.
   */
  async mkTxnUpdateRecord(txnName, item, options, tcx) {
    tcx = tcx || this.mkTcx(txnName);
    const { capo } = this;
    await capo.getMintDelegate();
    const tcx1 = await this.tcxWithCharterRef(tcx);
    const {
      activity,
      addedUtxoValue,
      // beforeSave = (x) => x,
      updatedFields
    } = options;
    const tcx2 = await capo.txnAttachScriptOrRefScript(
      tcx1,
      capo.compiledScript
    );
    const tcx2a = tcx2.addInput(
      item.utxo,
      capo.activitySpendingDelegatedDatum()
    );
    const existingTypedData = item.data;
    let recId = existingTypedData.id;
    if (!Array.isArray(recId)) {
      recId = encodeUtf8(recId);
    }
    const spendDelegate = await capo.getSpendDelegate(
      tcx2a.state.charterData
    );
    const dataType = this.recordTypeName;
    const tcx2b = await spendDelegate.txnGrantAuthority(
      tcx2a,
      spendDelegate.activity.UpdatingDelegatedData({
        dataType,
        recId
      })
    );
    const materializedActivity = activity instanceof UpdateActivity ? activity.mkRedeemer(recId) : activity;
    let recordWithUpdates = {
      ...existingTypedData,
      ...updatedFields
    };
    if (this.needsGovAuthority) {
      await this.capo.txnAddGovAuthority(tcx2b);
    }
    return this.txnUpdatingRecord(tcx2b, recId, item, {
      activity: materializedActivity,
      addedUtxoValue,
      updatedFields: recordWithUpdates
    });
  }
  async txnUpdatingRecord(tcx, id, item, options) {
    const recType = this.recordTypeName;
    const {
      addedUtxoValue = makeValue(0),
      // beforeSave = (x) => x,
      activity,
      updatedFields: updatedRecord
    } = options;
    const fullUpdatedRecord = {
      ...item.data,
      ...updatedRecord
    };
    console.log(
      `\u{1F3D2} updating ${recType} ->`,
      uplcDataSerializer(
        recType,
        JSON.parse(
          JSON.stringify(updatedRecord, betterJsonSerializer, 2)
        ),
        1
      )
    );
    await this.txnGrantAuthority(tcx, activity);
    console.log(
      "    -- prev value in dgData utxo:",
      dumpAny(item.utxo.value)
    );
    console.log(
      "    -- addedUtxoValue in dgData utxo:",
      dumpAny(addedUtxoValue)
    );
    return this.returnUpdatedRecord(
      tcx,
      item.utxo.value.add(addedUtxoValue),
      // .add(this.mkMinTv(this.capo.mph, id))
      fullUpdatedRecord
    );
  }
  getReturnAddress() {
    return this.capo.address;
  }
  returnUpdatedRecord(tcx, returnedValue, updatedRecord) {
    return tcx.addOutput(
      makeTxOutput(
        this.getReturnAddress(),
        returnedValue,
        this.mkDatum.capoStoredData({
          data: updatedRecord,
          version: 2n,
          otherDetails: makeIntData(0)
        })
        // this.mkDatumDelegatedDataRecord(beforeSave(record))
      )
    );
  }
  moreInfo() {
    return `This delegate helps manage the on-chain delegated data store for ${this.idPrefix}-* records with type=${this.recordTypeName}`;
  }
  /**
   * Generates any needed transactions for updating the Capo manifest
   * to install or (todo: support for update) the policy for this delegate.
   * @remarks
   * The default implementation checks for the presence of the delegate policy
   * in the Capo's manifest, and if not found, creates a transaction to install it.
   *
   * The data-controller class's recordTypeName and idPrefix are used to
   * initialize the Capo's registry of data-controllers.  You may also implement
   * a moreInfo() method to provide more on-screen context about the
   * data-controller's role for administrators and/or end-users; the moreInfo
   * will be displayed in the Capo's on-screen policy-management (administrative)
   * interface, and you may also display it elsewhere in your application.
   *
   * To add any other transactions that may be needed for the delegate to operate
   * effectively, override this method, call `super(...args)`, and then add your
   * additional transactions using tcx.includeAddlTxn(...).  In that case, be sure to
   * perform any needed queries for ***fresh state of the on-chain data***, such as
   * for settings or the Capo's fresh charter data, INSIDE your mkTcx() function.
   */
  async setupCapoPolicy(tcx, typeName, options) {
    const { charterData, capoUtxos } = options;
    const { recordTypeName, idPrefix } = this;
    if (!this.capo.featureEnabled(typeName)) {
      console.warn(`\u274C\u274C\u274C ${this.constructor.name}: skipping setup for data-type '${typeName}' because it is not enabled in my featureFlags`);
      return void 0;
    }
    const existing = await this.capo.getDgDataController(
      recordTypeName,
      {
        charterData,
        optional: true
      }
    );
    const action = existing ? "update" : "create";
    tcx.includeAddlTxn(`${action} ${typeName} delegate`, {
      description: `${action} on-chain policy for ${idPrefix}-* records of type ${recordTypeName}`,
      moreInfo: this.moreInfo(),
      mkTcx: async () => {
        const charterData2 = await this.capo.findCharterData();
        console.warn(
          "---- vvv   when multiple policies can be queued and installed at once, use mkTxnInstall**ing**PolicyDelegate instead"
        );
        return this.capo.mkTxnInstallPolicyDelegate({
          typeName: recordTypeName,
          idPrefix,
          charterData: charterData2
        });
      }
    });
  }
}
class UpdateActivity {
  args;
  host;
  factoryFunc;
  constructor(host, factoryFunc, args) {
    this.args = args;
    this.host = host;
    this.factoryFunc = factoryFunc;
  }
  mkRedeemer(recId) {
    return this.factoryFunc.call(this.host, recId, ...this.args);
  }
}

export { DelegatedDataContract, UpdateActivity };
//# sourceMappingURL=DelegatedDataContract.mjs.map
