import { makeValue, makeTxOutput } from '@helios-lang/ledger';
import { makeIntData } from '@helios-lang/uplc';
import { b as ContractBasedDelegate, R as SeedActivity, u as uplcDataSerializer, O as betterJsonSerializer, e as dumpAny } from './ContractBasedDelegate2.mjs';
import { encodeUtf8 } from '@helios-lang/codec-utils';
import '@helios-lang/crypto';
import '@helios-lang/tx-utils';
import '@donecollectively/stellar-contracts/HeliosProgramWithCacheAPI';
import '@helios-lang/contract-utils';

class DelegatedDataContract extends ContractBasedDelegate {
  usesWrappedData;
  dgDatumHelper = this.dataBridgeClass?.prototype.DelegateDatum;
  /**
   * when set to true, the controller class will include the Capo's
   * gov authority in the transaction, to ease transaction setup.
   * @remarks
   * This is a convenience for the controller, and should be used along with
   * the appropriate on-chain policy to require the gov token's presence.
   */
  needsGovAuthority = false;
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

That method should \`return new YourConcreteBundle()\`

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
      `${this.constructor.name}: missing required implementation of abstractBundleClass()

Defined in a \`*.hlb.ts\` file, it should have at minimum:
    import {YourAppCapo} from "./YourAppCapo.js";

    import SomeSpecializedDelegate from "./YourSpecializedDelegate.hl";

    export default class SomeDelegateBundle extends CapoHeliosBundle {
        get specializedDelegateModule() { return SomeSpecializedDelegate; }
    }

We'll generate types in a .typeInfo.ts file, based on the types in your Helios sources,
  ... and a .bridge.ts file having data-conversion classes for your on-chain types.
When your delegated-data controller is used within your Capo, your bundle will
have access via import {...} to any helios modules provided by that Capo's .hlb.ts. `
    );
  }
  /**
   * Finds records of this delegate's type, optionally by ID.
   * @remarks
   * Returns a record list when no ID is provided, or a single record when an ID is provided.
   */
  async findRecords(options = {}) {
    const result = await this.capo.findDelegatedDataUtxos({
      type: this.recordTypeName
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
    const tcx2 = await capo.txnMintingUuts(tcx1c, [this.idPrefix], {
      mintDelegateActivity: mintDelegate.activity.CreatingDelegatedData(
        tcx1c,
        { dataType }
      )
    });
    const activity = options.activity instanceof SeedActivity ? options.activity.mkRedeemer(tcx2) : options.activity;
    return this.txnCreatingRecord(tcx2, {
      ...options,
      activity
    }).then((tcx3) => tcx3);
  }
  creationDefaultDetails() {
    return {};
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
    const fullRecord = {
      id: encodeUtf8(uut.toString()),
      type: newType,
      ...defaults,
      ...newRecord
    };
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
        JSON.parse(JSON.stringify(updatedRecord, betterJsonSerializer, 2)),
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
}
class UpdateActivity {
  constructor(host, factoryFunc, args) {
    this.host = host;
    this.factoryFunc = factoryFunc;
    this.args = args;
  }
  args;
  mkRedeemer(recId) {
    return this.factoryFunc.call(this.host, recId, ...this.args);
  }
}

export { DelegatedDataContract, UpdateActivity };
//# sourceMappingURL=DelegatedDataContract.mjs.map
