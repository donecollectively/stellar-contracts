import { makeCast } from '@helios-lang/contract-utils';
import { makeInlineTxOutputDatum, makeAddress, makeMintingPolicyHash, makeAssetClass, makeValidatorHash, decodeTx, makeTxId, makeTxOutputId, makeValue, makeDatumHash, makeHashedTxOutputDatum, makeTxOutput, makeTxInput } from '@helios-lang/ledger';
import { O as DataBridge, C as ContractDataBridge, D as DataBridgeReaderClass, i as impliedSeedActivityMaker, U as nanoid } from './DataBridge.mjs';
import { bytesToHex, encodeUtf8, hexToBytes } from '@helios-lang/codec-utils';
import { type, ArkErrors } from 'arktype';
import EventEmitter from 'eventemitter3';
import { decodeUplcProgramV2FromCbor, decodeUplcData } from '@helios-lang/uplc';
import Dexie, { Entity } from 'dexie';
import { jsonSchemaToType } from '@ark/json-schema';

const JustAnEnum = Symbol("JustAnEnum");
const Nested = Symbol("Nested");
const NotNested = Symbol("NotNested");
const isDatum = Symbol("isDatum");
class EnumBridge extends DataBridge {
  constructor(options) {
    super(options);
  }
  // the uplcReturnType provides type clues, mainly for editor support
  // and compile-time type-checking.  
  mkUplcData(value, enumPathExpr) {
    if (this.redirectTo) {
      return this.redirectTo(value);
    }
    const uplc = this["\u1C7A\u1C7Acast"].toUplcData(value, enumPathExpr);
    uplc.toString();
    bytesToHex(uplc.toCbor());
    uplc.dataPath = enumPathExpr;
    if (this.isActivity) {
      return {
        redeemer: uplc
      };
    } else {
      return uplc;
    }
  }
}

function debugBox(msg, ...args) {
  console.debug(`%c${msg}`, "background: blue; color: white; padding: 2px 4px;", ...args);
}

class CapoDataBridge extends ContractDataBridge {
  static isAbstract = false;
  isAbstract = false;
  /**
   * Helper class for generating TxOutputDatum for the ***datum type (CapoDatum)***
   * for this contract script. 
   */
  datum = new CapoDatumHelper({ isMainnet: this.isMainnet });
  // datumAccessor/enum
  /**
   * this is the specific type of datum for the `Capo` script
   */
  CapoDatum = this.datum;
  readDatum = (d) => {
    return this.reader.CapoDatum(d);
  };
  /**
   * generates UplcData for the activity type (***CapoActivity***) for the `Capo` script
   */
  activity = new CapoActivityHelper({ isMainnet: this.isMainnet, isActivity: true });
  // activityAccessor/enum
  CapoActivity = this.activity;
  reader = new CapoDataBridgeReader(this, this.isMainnet);
  /**
   * accessors for all the types defined in the `Capo` script
   * @remarks - these accessors are used to generate UplcData for each type
   */
  types = {
    /**
     * generates UplcData for the enum type ***DelegateRole*** for the `Capo` script
     */
    DelegateRole: new DelegateRoleHelper({ isMainnet: this.isMainnet }),
    /**
     * generates UplcData for the enum type ***ManifestEntryType*** for the `Capo` script
     */
    ManifestEntryType: new ManifestEntryTypeHelper({ isMainnet: this.isMainnet }),
    /**
     * generates UplcData for the enum type ***PendingDelegateAction*** for the `Capo` script
     */
    PendingDelegateAction: new PendingDelegateActionHelper({ isMainnet: this.isMainnet }),
    /**
     * generates UplcData for the enum type ***ManifestActivity*** for the `Capo` script
     */
    ManifestActivity: new ManifestActivityHelper({ isMainnet: this.isMainnet }),
    /**
     * generates UplcData for the enum type ***PendingCharterChange*** for the `Capo` script
     */
    PendingCharterChange: new PendingCharterChangeHelper({ isMainnet: this.isMainnet }),
    /**
     * generates UplcData for the enum type ***CapoDatum*** for the `Capo` script
     */
    CapoDatum: new CapoDatumHelper({ isMainnet: this.isMainnet }),
    /**
     * generates UplcData for the enum type ***CapoLifecycleActivity*** for the `Capo` script
     */
    CapoLifecycleActivity: new CapoLifecycleActivityHelper({ isMainnet: this.isMainnet }),
    /**
     * generates UplcData for the enum type ***CapoActivity*** for the `Capo` script
     */
    CapoActivity: new CapoActivityHelper({ isMainnet: this.isMainnet }),
    /**
     * generates UplcData for the enum type ***RelativeDelegateLink*** for the `Capo` script
     */
    RelativeDelegateLink: (fields) => {
      return this["\u1C7A\u1C7ARelativeDelegateLinkCast"].toUplcData(fields);
    },
    /**
     * generates UplcData for the enum type ***CapoManifestEntry*** for the `Capo` script
     */
    CapoManifestEntry: (fields) => {
      return this["\u1C7A\u1C7ACapoManifestEntryCast"].toUplcData(fields);
    },
    /**
     * generates UplcData for the enum type ***PendingDelegateChange*** for the `Capo` script
     */
    PendingDelegateChange: (fields) => {
      return this["\u1C7A\u1C7APendingDelegateChangeCast"].toUplcData(fields);
    },
    /**
     * generates UplcData for the enum type ***AnyData*** for the `Capo` script
     */
    AnyData: (fields) => {
      return this["\u1C7A\u1C7AAnyDataCast"].toUplcData(fields);
    }
  };
  /**
              * uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7ARelativeDelegateLinkCast" = makeCast(
    RelativeDelegateLinkSchema,
    { isMainnet: true, unwrapSingleFieldEnumVariants: true }
  );
  /**
              * uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7ACapoManifestEntryCast" = makeCast(
    CapoManifestEntrySchema,
    { isMainnet: true, unwrapSingleFieldEnumVariants: true }
  );
  /**
              * uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7APendingDelegateChangeCast" = makeCast(
    PendingDelegateChangeSchema,
    { isMainnet: true, unwrapSingleFieldEnumVariants: true }
  );
  /**
              * uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7AAnyDataCast" = makeCast(
    AnyDataSchema,
    { isMainnet: true, unwrapSingleFieldEnumVariants: true }
  );
}
class CapoDataBridgeReader extends DataBridgeReaderClass {
  constructor(bridge, isMainnet) {
    super();
    this.bridge = bridge;
  }
  /**
      * reads UplcData *known to fit the **DelegateRole*** enum type,
      * for the Capo script.
      * #### Standard WARNING
      * 
      * This is a low-level data-reader for use in ***advanced development scenarios***.
      * 
      * Used correctly with data that matches the enum type, this reader
      * returns strongly-typed data - your code using these types will be safe.
      * 
      * On the other hand, reading non-matching data will not give you a valid result.  
      * It may throw an error, or it may throw no error, but return a value that
      * causes some error later on in your code, when you try to use it.
      */
  DelegateRole(d) {
    const typeHelper = this.bridge.types.DelegateRole;
    const cast = typeHelper["\u1C7A\u1C7Acast"];
    return cast.fromUplcData(d);
  }
  /* enumReader helper */
  /**
      * reads UplcData *known to fit the **ManifestEntryType*** enum type,
      * for the Capo script.
      * #### Standard WARNING
      * 
      * This is a low-level data-reader for use in ***advanced development scenarios***.
      * 
      * Used correctly with data that matches the enum type, this reader
      * returns strongly-typed data - your code using these types will be safe.
      * 
      * On the other hand, reading non-matching data will not give you a valid result.  
      * It may throw an error, or it may throw no error, but return a value that
      * causes some error later on in your code, when you try to use it.
      */
  ManifestEntryType(d) {
    const typeHelper = this.bridge.types.ManifestEntryType;
    const cast = typeHelper["\u1C7A\u1C7Acast"];
    return cast.fromUplcData(d);
  }
  /* enumReader helper */
  /**
      * reads UplcData *known to fit the **PendingDelegateAction*** enum type,
      * for the Capo script.
      * #### Standard WARNING
      * 
      * This is a low-level data-reader for use in ***advanced development scenarios***.
      * 
      * Used correctly with data that matches the enum type, this reader
      * returns strongly-typed data - your code using these types will be safe.
      * 
      * On the other hand, reading non-matching data will not give you a valid result.  
      * It may throw an error, or it may throw no error, but return a value that
      * causes some error later on in your code, when you try to use it.
      */
  PendingDelegateAction(d) {
    const typeHelper = this.bridge.types.PendingDelegateAction;
    const cast = typeHelper["\u1C7A\u1C7Acast"];
    return cast.fromUplcData(d);
  }
  /* enumReader helper */
  /**
      * reads UplcData *known to fit the **ManifestActivity*** enum type,
      * for the Capo script.
      * #### Standard WARNING
      * 
      * This is a low-level data-reader for use in ***advanced development scenarios***.
      * 
      * Used correctly with data that matches the enum type, this reader
      * returns strongly-typed data - your code using these types will be safe.
      * 
      * On the other hand, reading non-matching data will not give you a valid result.  
      * It may throw an error, or it may throw no error, but return a value that
      * causes some error later on in your code, when you try to use it.
      */
  ManifestActivity(d) {
    const typeHelper = this.bridge.types.ManifestActivity;
    const cast = typeHelper["\u1C7A\u1C7Acast"];
    return cast.fromUplcData(d);
  }
  /* enumReader helper */
  /**
      * reads UplcData *known to fit the **PendingCharterChange*** enum type,
      * for the Capo script.
      * #### Standard WARNING
      * 
      * This is a low-level data-reader for use in ***advanced development scenarios***.
      * 
      * Used correctly with data that matches the enum type, this reader
      * returns strongly-typed data - your code using these types will be safe.
      * 
      * On the other hand, reading non-matching data will not give you a valid result.  
      * It may throw an error, or it may throw no error, but return a value that
      * causes some error later on in your code, when you try to use it.
      */
  PendingCharterChange(d) {
    const typeHelper = this.bridge.types.PendingCharterChange;
    const cast = typeHelper["\u1C7A\u1C7Acast"];
    return cast.fromUplcData(d);
  }
  /* enumReader helper */
  datum = (d) => {
    return this.CapoDatum(d);
  };
  /**
      * reads UplcData *known to fit the **CapoDatum*** enum type,
      * for the Capo script.
      * #### Standard WARNING
      * 
      * This is a low-level data-reader for use in ***advanced development scenarios***.
      * 
      * Used correctly with data that matches the enum type, this reader
      * returns strongly-typed data - your code using these types will be safe.
      * 
      * On the other hand, reading non-matching data will not give you a valid result.  
      * It may throw an error, or it may throw no error, but return a value that
      * causes some error later on in your code, when you try to use it.
      */
  CapoDatum(d) {
    const typeHelper = this.bridge.types.CapoDatum;
    const cast = typeHelper["\u1C7A\u1C7Acast"];
    return cast.fromUplcData(d);
  }
  /* enumReader helper */
  /**
      * reads UplcData *known to fit the **CapoLifecycleActivity*** enum type,
      * for the Capo script.
      * #### Standard WARNING
      * 
      * This is a low-level data-reader for use in ***advanced development scenarios***.
      * 
      * Used correctly with data that matches the enum type, this reader
      * returns strongly-typed data - your code using these types will be safe.
      * 
      * On the other hand, reading non-matching data will not give you a valid result.  
      * It may throw an error, or it may throw no error, but return a value that
      * causes some error later on in your code, when you try to use it.
      */
  CapoLifecycleActivity(d) {
    const typeHelper = this.bridge.types.CapoLifecycleActivity;
    const cast = typeHelper["\u1C7A\u1C7Acast"];
    return cast.fromUplcData(d);
  }
  /* enumReader helper */
  /**
      * reads UplcData *known to fit the **CapoActivity*** enum type,
      * for the Capo script.
      * #### Standard WARNING
      * 
      * This is a low-level data-reader for use in ***advanced development scenarios***.
      * 
      * Used correctly with data that matches the enum type, this reader
      * returns strongly-typed data - your code using these types will be safe.
      * 
      * On the other hand, reading non-matching data will not give you a valid result.  
      * It may throw an error, or it may throw no error, but return a value that
      * causes some error later on in your code, when you try to use it.
      */
  CapoActivity(d) {
    const typeHelper = this.bridge.types.CapoActivity;
    const cast = typeHelper["\u1C7A\u1C7Acast"];
    return cast.fromUplcData(d);
  }
  /* enumReader helper */
  /**
      * reads UplcData *known to fit the **RelativeDelegateLink*** struct type,
      * for the Capo script.
      * #### Standard WARNING
      * 
      * This is a low-level data-reader for use in ***advanced development scenarios***.
      * 
      * Used correctly with data that matches the type, this reader
      * returns strongly-typed data - your code using these types will be safe.
      * 
      * On the other hand, reading non-matching data will not give you a valid result.  
      * It may throw an error, or it may throw no error, but return a value that
      * causes some error later on in your code, when you try to use it.
      */
  RelativeDelegateLink(d) {
    const cast = this.bridge["\u1C7A\u1C7ARelativeDelegateLinkCast"];
    return cast.fromUplcData(d);
  }
  /* structReader helper */
  /**
      * reads UplcData *known to fit the **CapoManifestEntry*** struct type,
      * for the Capo script.
      * #### Standard WARNING
      * 
      * This is a low-level data-reader for use in ***advanced development scenarios***.
      * 
      * Used correctly with data that matches the type, this reader
      * returns strongly-typed data - your code using these types will be safe.
      * 
      * On the other hand, reading non-matching data will not give you a valid result.  
      * It may throw an error, or it may throw no error, but return a value that
      * causes some error later on in your code, when you try to use it.
      */
  CapoManifestEntry(d) {
    const cast = this.bridge["\u1C7A\u1C7ACapoManifestEntryCast"];
    return cast.fromUplcData(d);
  }
  /* structReader helper */
  /**
      * reads UplcData *known to fit the **PendingDelegateChange*** struct type,
      * for the Capo script.
      * #### Standard WARNING
      * 
      * This is a low-level data-reader for use in ***advanced development scenarios***.
      * 
      * Used correctly with data that matches the type, this reader
      * returns strongly-typed data - your code using these types will be safe.
      * 
      * On the other hand, reading non-matching data will not give you a valid result.  
      * It may throw an error, or it may throw no error, but return a value that
      * causes some error later on in your code, when you try to use it.
      */
  PendingDelegateChange(d) {
    const cast = this.bridge["\u1C7A\u1C7APendingDelegateChangeCast"];
    return cast.fromUplcData(d);
  }
  /* structReader helper */
  /**
      * reads UplcData *known to fit the **AnyData*** struct type,
      * for the Capo script.
      * #### Standard WARNING
      * 
      * This is a low-level data-reader for use in ***advanced development scenarios***.
      * 
      * Used correctly with data that matches the type, this reader
      * returns strongly-typed data - your code using these types will be safe.
      * 
      * On the other hand, reading non-matching data will not give you a valid result.  
      * It may throw an error, or it may throw no error, but return a value that
      * causes some error later on in your code, when you try to use it.
      */
  AnyData(d) {
    const cast = this.bridge["\u1C7A\u1C7AAnyDataCast"];
    return cast.fromUplcData(d);
  }
  /* structReader helper */
}
class DelegateRoleHelper extends EnumBridge {
  /*mkEnumHelperClass*/
  /**
          * @internal
          *  uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7Acast" = makeCast(
    DelegateRoleSchema,
    { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
  );
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
   */
  get MintDgt() {
    const uplc = this.mkUplcData(
      { MintDgt: {} },
      "CapoDelegateHelpers::DelegateRole.MintDgt"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
   */
  get SpendDgt() {
    const uplc = this.mkUplcData(
      { SpendDgt: {} },
      "CapoDelegateHelpers::DelegateRole.SpendDgt"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
   */
  get MintInvariant() {
    const uplc = this.mkUplcData(
      { MintInvariant: {} },
      "CapoDelegateHelpers::DelegateRole.MintInvariant"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
   */
  get SpendInvariant() {
    const uplc = this.mkUplcData(
      { SpendInvariant: {} },
      "CapoDelegateHelpers::DelegateRole.SpendInvariant"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
   */
  DgDataPolicy(name) {
    const uplc = this.mkUplcData({
      DgDataPolicy: name
    }, "CapoDelegateHelpers::DelegateRole.DgDataPolicy");
    return uplc;
  }
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
   */
  OtherNamedDgt(name) {
    const uplc = this.mkUplcData({
      OtherNamedDgt: name
    }, "CapoDelegateHelpers::DelegateRole.OtherNamedDgt");
    return uplc;
  }
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
   */
  get BothMintAndSpendDgt() {
    const uplc = this.mkUplcData(
      { BothMintAndSpendDgt: {} },
      "CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
   */
  get HandledByCapoOnly() {
    const uplc = this.mkUplcData(
      { HandledByCapoOnly: {} },
      "CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
}
class ManifestEntryTypeHelper extends EnumBridge {
  /*mkEnumHelperClass*/
  /**
          * @internal
          *  uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7Acast" = makeCast(
    ManifestEntryTypeSchema,
    { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
  );
  /**
   * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.NamedTokenRef"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
   */
  get NamedTokenRef() {
    const uplc = this.mkUplcData(
      { NamedTokenRef: {} },
      "CapoHelpers::ManifestEntryType.NamedTokenRef"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DgDataPolicy"***
   * @remarks - ***ManifestEntryType$DgDataPolicyLike*** is the same as the expanded field-types.
   */
  DgDataPolicy(fields) {
    const uplc = this.mkUplcData({
      DgDataPolicy: fields
    }, "CapoHelpers::ManifestEntryType.DgDataPolicy");
    return uplc;
  }
  /*multiFieldVariant enum accessor*/
  /**
   * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DelegateThreads"***
   * @remarks - ***ManifestEntryType$DelegateThreadsLike*** is the same as the expanded field-types.
   */
  DelegateThreads(fields) {
    const uplc = this.mkUplcData({
      DelegateThreads: fields
    }, "CapoHelpers::ManifestEntryType.DelegateThreads");
    return uplc;
  }
  /*multiFieldVariant enum accessor*/
  /**
   * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleMembership"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
   */
  get MerkleMembership() {
    const uplc = this.mkUplcData(
      { MerkleMembership: {} },
      "CapoHelpers::ManifestEntryType.MerkleMembership"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleStateRoot"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#4***
   */
  get MerkleStateRoot() {
    const uplc = this.mkUplcData(
      { MerkleStateRoot: {} },
      "CapoHelpers::ManifestEntryType.MerkleStateRoot"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
}
class PendingDelegateActionHelper extends EnumBridge {
  /*mkEnumHelperClass*/
  /**
          * @internal
          *  uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7Acast" = makeCast(
    PendingDelegateActionSchema,
    { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
  );
  Add(seedOrUf, filteredFields) {
    if (filteredFields) {
      const seedTxOutputId = this.getSeed(seedOrUf);
      const uplc = this.mkUplcData({
        Add: { seed: seedTxOutputId, ...filteredFields }
      }, "CapoDelegateHelpers::PendingDelegateAction.Add");
      return uplc;
    } else {
      const fields = seedOrUf;
      const uplc = this.mkUplcData({
        Add: fields
      }, "CapoDelegateHelpers::PendingDelegateAction.Add");
      return uplc;
    }
  }
  /*multiFieldVariant/seeded enum accessor*/
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***, 
   * @param fields - \{ purpose: string, idPrefix: string \}
   * @remarks
  * ##### Seeded activity
  * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
   * ##### Activity contains implied seed
   * Creates a SeedActivity based on the provided args, reserving space for a seed to be 
   * provided implicitly by a SeedActivity-supporting library function. 
   *
   * #### Usage
   *   1. Call the `$seeded$Add({ purpose, idPrefix })`
    *       method with the indicated (non-seed) details.
   *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
   *       `mkTxnCreateRecord({activity})` method.
   */
  $seeded$Add = impliedSeedActivityMaker(
    this,
    this.Add
  );
  /* coda: seeded helper in same multiFieldVariant/seeded */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Remove"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
   */
  get Remove() {
    const uplc = this.mkUplcData(
      { Remove: {} },
      "CapoDelegateHelpers::PendingDelegateAction.Remove"
    );
    return uplc;
  }
  Replace(seedOrUf, filteredFields) {
    if (filteredFields) {
      const seedTxOutputId = this.getSeed(seedOrUf);
      const uplc = this.mkUplcData({
        Replace: { seed: seedTxOutputId, ...filteredFields }
      }, "CapoDelegateHelpers::PendingDelegateAction.Replace");
      return uplc;
    } else {
      const fields = seedOrUf;
      const uplc = this.mkUplcData({
        Replace: fields
      }, "CapoDelegateHelpers::PendingDelegateAction.Replace");
      return uplc;
    }
  }
  /*multiFieldVariant/seeded enum accessor*/
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***, 
   * @param fields - \{ purpose: string, idPrefix: string, replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | \{mph: MintingPolicyHash | string | number[], tokenName: string | number[]\} \}
   * @remarks
  * ##### Seeded activity
  * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
   * ##### Activity contains implied seed
   * Creates a SeedActivity based on the provided args, reserving space for a seed to be 
   * provided implicitly by a SeedActivity-supporting library function. 
   *
   * #### Usage
   *   1. Call the `$seeded$Replace({ purpose, idPrefix, replacesDgt })`
    *       method with the indicated (non-seed) details.
   *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
   *       `mkTxnCreateRecord({activity})` method.
   */
  $seeded$Replace = impliedSeedActivityMaker(
    this,
    this.Replace
  );
  /* coda: seeded helper in same multiFieldVariant/seeded */
}
class ManifestActivityHelper extends EnumBridge {
  /*mkEnumHelperClass*/
  /**
          * @internal
          *  uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7Acast" = makeCast(
    ManifestActivitySchema,
    { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
  );
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
   */
  retiringEntry(key) {
    const uplc = this.mkUplcData({
      retiringEntry: key
    }, "CapoDelegateHelpers::ManifestActivity.retiringEntry");
    return uplc;
  }
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
   * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
   */
  updatingEntry(fields) {
    const uplc = this.mkUplcData({
      updatingEntry: fields
    }, "CapoDelegateHelpers::ManifestActivity.updatingEntry");
    return uplc;
  }
  /*multiFieldVariant enum accessor*/
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
   * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
   */
  addingEntry(fields) {
    const uplc = this.mkUplcData({
      addingEntry: fields
    }, "CapoDelegateHelpers::ManifestActivity.addingEntry");
    return uplc;
  }
  /*multiFieldVariant enum accessor*/
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
   * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
   */
  forkingThreadToken(fields) {
    const uplc = this.mkUplcData({
      forkingThreadToken: fields
    }, "CapoDelegateHelpers::ManifestActivity.forkingThreadToken");
    return uplc;
  }
  /*multiFieldVariant enum accessor*/
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
   * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
   */
  burningThreadToken(fields) {
    const uplc = this.mkUplcData({
      burningThreadToken: fields
    }, "CapoDelegateHelpers::ManifestActivity.burningThreadToken");
    return uplc;
  }
  /*multiFieldVariant enum accessor*/
}
class PendingCharterChangeHelper extends EnumBridge {
  /*mkEnumHelperClass*/
  /**
          * @internal
          *  uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7Acast" = makeCast(
    PendingCharterChangeSchema,
    { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
  );
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::PendingCharterChange.delegateChange"***
   * @remarks - ***PendingDelegateChangeLike*** is the same as the expanded field-type.
   */
  delegateChange(change) {
    const uplc = this.mkUplcData({
      delegateChange: change
    }, "CapoDelegateHelpers::PendingCharterChange.delegateChange");
    return uplc;
  }
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::PendingCharterChange.otherManifestChange"***
   * @remarks - ***PendingCharterChange$otherManifestChangeLike*** is the same as the expanded field-types.
   */
  otherManifestChange(fields) {
    const uplc = this.mkUplcData({
      otherManifestChange: fields
    }, "CapoDelegateHelpers::PendingCharterChange.otherManifestChange");
    return uplc;
  }
  /*multiFieldVariant enum accessor*/
}
class CapoDatumHelper extends EnumBridge {
  /*mkEnumHelperClass*/
  /**
          * @internal
          *  uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7Acast" = makeCast(
    CapoDatumSchema,
    { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
  );
  /**
   * generates  InlineTxOutputDatum for ***"CapoHelpers::CapoDatum.CharterData"***
   * @remarks - ***CapoDatum$CharterDataLike*** is the same as the expanded field-types.
   */
  CharterData(fields) {
    const uplc = this.mkUplcData({
      CharterData: fields
    }, "CapoHelpers::CapoDatum.CharterData");
    return makeInlineTxOutputDatum(uplc);
  }
  /*multiFieldVariant enum accessor*/
  /**
   * (property getter): InlineTxOutputDatum for ***"CapoHelpers::CapoDatum.ScriptReference"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
   */
  get ScriptReference() {
    const uplc = this.mkUplcData(
      { ScriptReference: {} },
      "CapoHelpers::CapoDatum.ScriptReference"
    );
    return makeInlineTxOutputDatum(uplc);
  }
  /* tagOnly variant accessor */
  /**
   * generates  InlineTxOutputDatum for ***"CapoHelpers::CapoDatum.DelegatedData"***
   * @remarks - ***CapoDatum$DelegatedDataLike*** is the same as the expanded field-types.
   */
  DelegatedData(fields) {
    const uplc = this.mkUplcData({
      DelegatedData: fields
    }, "CapoHelpers::CapoDatum.DelegatedData");
    return makeInlineTxOutputDatum(uplc);
  }
  /*multiFieldVariant enum accessor*/
}
class DelegateRoleHelperNested extends EnumBridge {
  /*mkEnumHelperClass*/
  /**
          * @internal
          *  uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7Acast" = makeCast(
    DelegateRoleSchema,
    { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
  );
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
   */
  get MintDgt() {
    const uplc = this.mkUplcData(
      { MintDgt: {} },
      "CapoDelegateHelpers::DelegateRole.MintDgt"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
   */
  get SpendDgt() {
    const uplc = this.mkUplcData(
      { SpendDgt: {} },
      "CapoDelegateHelpers::DelegateRole.SpendDgt"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
   */
  get MintInvariant() {
    const uplc = this.mkUplcData(
      { MintInvariant: {} },
      "CapoDelegateHelpers::DelegateRole.MintInvariant"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
   */
  get SpendInvariant() {
    const uplc = this.mkUplcData(
      { SpendInvariant: {} },
      "CapoDelegateHelpers::DelegateRole.SpendInvariant"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
  * @remarks
  * #### Nested activity: 
  * this is connected to a nested-activity wrapper, so the details are piped through 
  * the parent's uplc-encoder, producing a single uplc object with 
  * a complete wrapper for this inner activity detail.
   */
  DgDataPolicy(name) {
    const uplc = this.mkUplcData({
      DgDataPolicy: name
    }, "CapoDelegateHelpers::DelegateRole.DgDataPolicy");
    return uplc;
  }
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
  * @remarks
  * #### Nested activity: 
  * this is connected to a nested-activity wrapper, so the details are piped through 
  * the parent's uplc-encoder, producing a single uplc object with 
  * a complete wrapper for this inner activity detail.
   */
  OtherNamedDgt(name) {
    const uplc = this.mkUplcData({
      OtherNamedDgt: name
    }, "CapoDelegateHelpers::DelegateRole.OtherNamedDgt");
    return uplc;
  }
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
   */
  get BothMintAndSpendDgt() {
    const uplc = this.mkUplcData(
      { BothMintAndSpendDgt: {} },
      "CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
   */
  get HandledByCapoOnly() {
    const uplc = this.mkUplcData(
      { HandledByCapoOnly: {} },
      "CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
}
class ManifestActivityHelperNested extends EnumBridge {
  /*mkEnumHelperClass*/
  /**
          * @internal
          *  uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7Acast" = makeCast(
    ManifestActivitySchema,
    { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
  );
  /**
   * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
  * @remarks
  * #### Nested activity: 
  * this is connected to a nested-activity wrapper, so the details are piped through 
  * the parent's uplc-encoder, producing a single uplc object with 
  * a complete wrapper for this inner activity detail.
   */
  retiringEntry(key) {
    const uplc = this.mkUplcData({
      retiringEntry: key
    }, "CapoDelegateHelpers::ManifestActivity.retiringEntry");
    return uplc;
  }
  /**
   * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
   * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
  * ##### Nested activity: 
  * this is connected to a nested-activity wrapper, so the details are piped through 
  * the parent's uplc-encoder, producing a single uplc object with 
  * a complete wrapper for this inner activity detail.
   */
  updatingEntry(fields) {
    const uplc = this.mkUplcData({
      updatingEntry: fields
    }, "CapoDelegateHelpers::ManifestActivity.updatingEntry");
    return uplc;
  }
  /*multiFieldVariant enum accessor*/
  /**
   * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
   * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
  * ##### Nested activity: 
  * this is connected to a nested-activity wrapper, so the details are piped through 
  * the parent's uplc-encoder, producing a single uplc object with 
  * a complete wrapper for this inner activity detail.
   */
  addingEntry(fields) {
    const uplc = this.mkUplcData({
      addingEntry: fields
    }, "CapoDelegateHelpers::ManifestActivity.addingEntry");
    return uplc;
  }
  /*multiFieldVariant enum accessor*/
  /**
   * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
   * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
  * ##### Nested activity: 
  * this is connected to a nested-activity wrapper, so the details are piped through 
  * the parent's uplc-encoder, producing a single uplc object with 
  * a complete wrapper for this inner activity detail.
   */
  forkingThreadToken(fields) {
    const uplc = this.mkUplcData({
      forkingThreadToken: fields
    }, "CapoDelegateHelpers::ManifestActivity.forkingThreadToken");
    return uplc;
  }
  /*multiFieldVariant enum accessor*/
  /**
   * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
   * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
  * ##### Nested activity: 
  * this is connected to a nested-activity wrapper, so the details are piped through 
  * the parent's uplc-encoder, producing a single uplc object with 
  * a complete wrapper for this inner activity detail.
   */
  burningThreadToken(fields) {
    const uplc = this.mkUplcData({
      burningThreadToken: fields
    }, "CapoDelegateHelpers::ManifestActivity.burningThreadToken");
    return uplc;
  }
  /*multiFieldVariant enum accessor*/
}
class CapoLifecycleActivityHelper extends EnumBridge {
  /*mkEnumHelperClass*/
  /**
          * @internal
          *  uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7Acast" = makeCast(
    CapoLifecycleActivitySchema,
    { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
  );
  CreatingDelegate(seedOrUf, filteredFields) {
    if (filteredFields) {
      const seedTxOutputId = this.getSeed(seedOrUf);
      const uplc = this.mkUplcData({
        CreatingDelegate: { seed: seedTxOutputId, ...filteredFields }
      }, "CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate");
      return uplc;
    } else {
      const fields = seedOrUf;
      const uplc = this.mkUplcData({
        CreatingDelegate: fields
      }, "CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate");
      return uplc;
    }
  }
  /*multiFieldVariant/seeded enum accessor*/
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***, 
   * @param fields - \{ purpose: string \}
   * @remarks
  * ##### Seeded activity
  * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
   * ##### Activity contains implied seed
   * Creates a SeedActivity based on the provided args, reserving space for a seed to be 
   * provided implicitly by a SeedActivity-supporting library function. 
   *
   * #### Usage
   *   1. Call the `$seeded$CreatingDelegate({ purpose })`
    *       method with the indicated (non-seed) details.
   *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
   *       `mkTxnCreateRecord({activity})` method.
   */
  $seeded$CreatingDelegate = impliedSeedActivityMaker(
    this,
    this.CreatingDelegate
  );
  /* coda: seeded helper in same multiFieldVariant/seeded */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
   */
  get queuePendingChange() {
    const uplc = this.mkUplcData(
      { queuePendingChange: {} },
      "CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * access to different variants of the ***nested DelegateRole*** type needed for ***CapoLifecycleActivity:removePendingChange***.
   */
  get removePendingChange() {
    const nestedAccessor = new DelegateRoleHelperNested({
      isMainnet: this.isMainnet,
      isNested: true,
      isActivity: false
    });
    nestedAccessor.mkDataVia(
      (role) => {
        return this.mkUplcData(
          { removePendingChange: role },
          "CapoDelegateHelpers::CapoLifecycleActivity.removePendingChange"
        );
      }
    );
    return nestedAccessor;
  }
  /* nested enum accessor */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
   */
  get commitPendingChanges() {
    const uplc = this.mkUplcData(
      { commitPendingChanges: {} },
      "CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"
    );
    return uplc;
  }
  forcingNewSpendDelegate(seedOrUf, filteredFields) {
    if (filteredFields) {
      const seedTxOutputId = this.getSeed(seedOrUf);
      const uplc = this.mkUplcData({
        forcingNewSpendDelegate: { seed: seedTxOutputId, ...filteredFields }
      }, "CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate");
      return uplc;
    } else {
      const fields = seedOrUf;
      const uplc = this.mkUplcData({
        forcingNewSpendDelegate: fields
      }, "CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate");
      return uplc;
    }
  }
  /*multiFieldVariant/seeded enum accessor*/
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***, 
   * @param fields - \{ purpose: string \}
   * @remarks
  * ##### Seeded activity
  * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
   * ##### Activity contains implied seed
   * Creates a SeedActivity based on the provided args, reserving space for a seed to be 
   * provided implicitly by a SeedActivity-supporting library function. 
   *
   * #### Usage
   *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
    *       method with the indicated (non-seed) details.
   *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
   *       `mkTxnCreateRecord({activity})` method.
   */
  $seeded$forcingNewSpendDelegate = impliedSeedActivityMaker(
    this,
    this.forcingNewSpendDelegate
  );
  forcingNewMintDelegate(seedOrUf, filteredFields) {
    if (filteredFields) {
      const seedTxOutputId = this.getSeed(seedOrUf);
      const uplc = this.mkUplcData({
        forcingNewMintDelegate: { seed: seedTxOutputId, ...filteredFields }
      }, "CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate");
      return uplc;
    } else {
      const fields = seedOrUf;
      const uplc = this.mkUplcData({
        forcingNewMintDelegate: fields
      }, "CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate");
      return uplc;
    }
  }
  /*multiFieldVariant/seeded enum accessor*/
  /**
   * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***, 
   * @param fields - \{ purpose: string \}
   * @remarks
  * ##### Seeded activity
  * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
   * ##### Activity contains implied seed
   * Creates a SeedActivity based on the provided args, reserving space for a seed to be 
   * provided implicitly by a SeedActivity-supporting library function. 
   *
   * #### Usage
   *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
    *       method with the indicated (non-seed) details.
   *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
   *       `mkTxnCreateRecord({activity})` method.
   */
  $seeded$forcingNewMintDelegate = impliedSeedActivityMaker(
    this,
    this.forcingNewMintDelegate
  );
  /* coda: seeded helper in same multiFieldVariant/seeded */
  /**
   * access to different variants of the ***nested ManifestActivity*** type needed for ***CapoLifecycleActivity:updatingManifest***.
   */
  get updatingManifest() {
    const nestedAccessor = new ManifestActivityHelperNested({
      isMainnet: this.isMainnet,
      isNested: true,
      isActivity: false
    });
    nestedAccessor.mkDataVia(
      (activity) => {
        return this.mkUplcData(
          { updatingManifest: activity },
          "CapoDelegateHelpers::CapoLifecycleActivity.updatingManifest"
        );
      }
    );
    return nestedAccessor;
  }
  /* nested enum accessor */
}
class ActivityDelegateRoleHelperNested extends EnumBridge {
  /*mkEnumHelperClass*/
  /**
          * @internal
          *  uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7Acast" = makeCast(
    DelegateRoleSchema,
    { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
  );
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
   */
  get MintDgt() {
    const uplc = this.mkUplcData(
      { MintDgt: {} },
      "CapoDelegateHelpers::DelegateRole.MintDgt"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
   */
  get SpendDgt() {
    const uplc = this.mkUplcData(
      { SpendDgt: {} },
      "CapoDelegateHelpers::DelegateRole.SpendDgt"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
   */
  get MintInvariant() {
    const uplc = this.mkUplcData(
      { MintInvariant: {} },
      "CapoDelegateHelpers::DelegateRole.MintInvariant"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
   */
  get SpendInvariant() {
    const uplc = this.mkUplcData(
      { SpendInvariant: {} },
      "CapoDelegateHelpers::DelegateRole.SpendInvariant"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
  * @remarks
  * #### Nested activity: 
  * this is connected to a nested-activity wrapper, so the details are piped through 
  * the parent's uplc-encoder, producing a single uplc object with 
  * a complete wrapper for this inner activity detail.
   */
  DgDataPolicy(name) {
    const uplc = this.mkUplcData({
      DgDataPolicy: name
    }, "CapoDelegateHelpers::DelegateRole.DgDataPolicy");
    return uplc;
  }
  /**
   * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
  * @remarks
  * #### Nested activity: 
  * this is connected to a nested-activity wrapper, so the details are piped through 
  * the parent's uplc-encoder, producing a single uplc object with 
  * a complete wrapper for this inner activity detail.
   */
  OtherNamedDgt(name) {
    const uplc = this.mkUplcData({
      OtherNamedDgt: name
    }, "CapoDelegateHelpers::DelegateRole.OtherNamedDgt");
    return uplc;
  }
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
   */
  get BothMintAndSpendDgt() {
    const uplc = this.mkUplcData(
      { BothMintAndSpendDgt: {} },
      "CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
   */
  get HandledByCapoOnly() {
    const uplc = this.mkUplcData(
      { HandledByCapoOnly: {} },
      "CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
}
class CapoLifecycleActivityHelperNested extends EnumBridge {
  /*mkEnumHelperClass*/
  /**
          * @internal
          *  uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7Acast" = makeCast(
    CapoLifecycleActivitySchema,
    { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
  );
  CreatingDelegate(seedOrUf, filteredFields) {
    if (filteredFields) {
      const seedTxOutputId = this.getSeed(seedOrUf);
      const uplc = this.mkUplcData({
        CreatingDelegate: { seed: seedTxOutputId, ...filteredFields }
      }, "CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate");
      return uplc;
    } else {
      const fields = seedOrUf;
      const uplc = this.mkUplcData({
        CreatingDelegate: fields
      }, "CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate");
      return uplc;
    }
  }
  /*multiFieldVariant/seeded enum accessor*/
  /**
   * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***, 
   * @param fields - \{ purpose: string \}
   * @remarks
  * ##### Seeded activity
  * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
   * ##### Activity contains implied seed
   * Creates a SeedActivity based on the provided args, reserving space for a seed to be 
   * provided implicitly by a SeedActivity-supporting library function. 
   *
   * #### Usage
   *   1. Call the `$seeded$CreatingDelegate({ purpose })`
    *       method with the indicated (non-seed) details.
   *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
   *       `mkTxnCreateRecord({activity})` method.
  * ##### Nested activity: 
  * this is connected to a nested-activity wrapper, so the details are piped through 
  * the parent's uplc-encoder, producing a single uplc object with 
  * a complete wrapper for this inner activity detail.
   */
  $seeded$CreatingDelegate = impliedSeedActivityMaker(
    this,
    this.CreatingDelegate
  );
  /* coda: seeded helper in same multiFieldVariant/seeded */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
   */
  get queuePendingChange() {
    const uplc = this.mkUplcData(
      { queuePendingChange: {} },
      "CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * access to different variants of the ***nested DelegateRole*** type needed for ***CapoLifecycleActivity:removePendingChange***.
   */
  get removePendingChange() {
    const nestedAccessor = new ActivityDelegateRoleHelperNested({
      isMainnet: this.isMainnet,
      isNested: true,
      isActivity: true
    });
    nestedAccessor.mkDataVia(
      (role) => {
        return this.mkUplcData(
          { removePendingChange: role },
          "CapoDelegateHelpers::CapoLifecycleActivity.removePendingChange"
        );
      }
    );
    return nestedAccessor;
  }
  /* nested enum accessor */
  /**
   * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
   */
  get commitPendingChanges() {
    const uplc = this.mkUplcData(
      { commitPendingChanges: {} },
      "CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"
    );
    return uplc;
  }
  forcingNewSpendDelegate(seedOrUf, filteredFields) {
    if (filteredFields) {
      const seedTxOutputId = this.getSeed(seedOrUf);
      const uplc = this.mkUplcData({
        forcingNewSpendDelegate: { seed: seedTxOutputId, ...filteredFields }
      }, "CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate");
      return uplc;
    } else {
      const fields = seedOrUf;
      const uplc = this.mkUplcData({
        forcingNewSpendDelegate: fields
      }, "CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate");
      return uplc;
    }
  }
  /*multiFieldVariant/seeded enum accessor*/
  /**
   * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***, 
   * @param fields - \{ purpose: string \}
   * @remarks
  * ##### Seeded activity
  * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
   * ##### Activity contains implied seed
   * Creates a SeedActivity based on the provided args, reserving space for a seed to be 
   * provided implicitly by a SeedActivity-supporting library function. 
   *
   * #### Usage
   *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
    *       method with the indicated (non-seed) details.
   *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
   *       `mkTxnCreateRecord({activity})` method.
  * ##### Nested activity: 
  * this is connected to a nested-activity wrapper, so the details are piped through 
  * the parent's uplc-encoder, producing a single uplc object with 
  * a complete wrapper for this inner activity detail.
   */
  $seeded$forcingNewSpendDelegate = impliedSeedActivityMaker(
    this,
    this.forcingNewSpendDelegate
  );
  forcingNewMintDelegate(seedOrUf, filteredFields) {
    if (filteredFields) {
      const seedTxOutputId = this.getSeed(seedOrUf);
      const uplc = this.mkUplcData({
        forcingNewMintDelegate: { seed: seedTxOutputId, ...filteredFields }
      }, "CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate");
      return uplc;
    } else {
      const fields = seedOrUf;
      const uplc = this.mkUplcData({
        forcingNewMintDelegate: fields
      }, "CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate");
      return uplc;
    }
  }
  /*multiFieldVariant/seeded enum accessor*/
  /**
   * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***, 
   * @param fields - \{ purpose: string \}
   * @remarks
  * ##### Seeded activity
  * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
   * ##### Activity contains implied seed
   * Creates a SeedActivity based on the provided args, reserving space for a seed to be 
   * provided implicitly by a SeedActivity-supporting library function. 
   *
   * #### Usage
   *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
    *       method with the indicated (non-seed) details.
   *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
   *       `mkTxnCreateRecord({activity})` method.
  * ##### Nested activity: 
  * this is connected to a nested-activity wrapper, so the details are piped through 
  * the parent's uplc-encoder, producing a single uplc object with 
  * a complete wrapper for this inner activity detail.
   */
  $seeded$forcingNewMintDelegate = impliedSeedActivityMaker(
    this,
    this.forcingNewMintDelegate
  );
  /* coda: seeded helper in same multiFieldVariant/seeded */
  /**
   * access to different variants of the ***nested ManifestActivity*** type needed for ***CapoLifecycleActivity:updatingManifest***.
   */
  get updatingManifest() {
    const nestedAccessor = new ManifestActivityHelperNested({
      isMainnet: this.isMainnet,
      isNested: true,
      isActivity: true
    });
    nestedAccessor.mkDataVia(
      (activity) => {
        return this.mkUplcData(
          { updatingManifest: activity },
          "CapoDelegateHelpers::CapoLifecycleActivity.updatingManifest"
        );
      }
    );
    return nestedAccessor;
  }
  /* nested enum accessor */
}
class CapoActivityHelper extends EnumBridge {
  /*mkEnumHelperClass*/
  /**
          * @internal
          *  uses unicode U+1c7a - sorts to the end */
  "\u1C7A\u1C7Acast" = makeCast(
    CapoActivitySchema,
    { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
  );
  /**
   * access to different variants of the ***nested CapoLifecycleActivity*** type needed for ***CapoActivity:capoLifecycleActivity***.
   */
  get capoLifecycleActivity() {
    const nestedAccessor = new CapoLifecycleActivityHelperNested({
      isMainnet: this.isMainnet,
      isNested: true,
      isActivity: true
    });
    nestedAccessor.mkDataVia(
      (activity) => {
        return this.mkUplcData(
          { capoLifecycleActivity: activity },
          "CapoHelpers::CapoActivity.capoLifecycleActivity"
        );
      }
    );
    return nestedAccessor;
  }
  /* nested enum accessor */
  /**
   * (property getter): UplcData for ***"CapoHelpers::CapoActivity.usingAuthority"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
   */
  get usingAuthority() {
    const uplc = this.mkUplcData(
      { usingAuthority: {} },
      "CapoHelpers::CapoActivity.usingAuthority"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoHelpers::CapoActivity.retiringRefScript"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
   */
  get retiringRefScript() {
    const uplc = this.mkUplcData(
      { retiringRefScript: {} },
      "CapoHelpers::CapoActivity.retiringRefScript"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoHelpers::CapoActivity.addingSpendInvariant"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
   */
  get addingSpendInvariant() {
    const uplc = this.mkUplcData(
      { addingSpendInvariant: {} },
      "CapoHelpers::CapoActivity.addingSpendInvariant"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoHelpers::CapoActivity.spendingDelegatedDatum"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#4***
   */
  get spendingDelegatedDatum() {
    const uplc = this.mkUplcData(
      { spendingDelegatedDatum: {} },
      "CapoHelpers::CapoActivity.spendingDelegatedDatum"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
  /**
   * (property getter): UplcData for ***"CapoHelpers::CapoActivity.updatingCharter"***
   * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#5***
   */
  get updatingCharter() {
    const uplc = this.mkUplcData(
      { updatingCharter: {} },
      "CapoHelpers::CapoActivity.updatingCharter"
    );
    return uplc;
  }
  /* tagOnly variant accessor */
}
const RelativeDelegateLinkSchema = {
  "kind": "struct",
  "format": "list",
  "id": "__module__CapoDelegateHelpers__RelativeDelegateLink[]",
  "name": "RelativeDelegateLink",
  "fieldTypes": [
    {
      "name": "uutName",
      "type": {
        "kind": "internal",
        "name": "String"
      }
    },
    {
      "name": "delegateValidatorHash",
      "type": {
        "kind": "option",
        "someType": {
          "kind": "internal",
          "name": "ValidatorHash"
        }
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "internal",
        "name": "ByteArray"
      }
    }
  ]
};
const DelegateRoleSchema = {
  "kind": "enum",
  "name": "DelegateRole",
  "id": "__module__CapoDelegateHelpers__DelegateRole[]",
  "variantTypes": [
    {
      "kind": "variant",
      "tag": 0,
      "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintDgt",
      "name": "MintDgt",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 1,
      "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendDgt",
      "name": "SpendDgt",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 2,
      "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintInvariant",
      "name": "MintInvariant",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 3,
      "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendInvariant",
      "name": "SpendInvariant",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 4,
      "id": "__module__CapoDelegateHelpers__DelegateRole[]__DgDataPolicy",
      "name": "DgDataPolicy",
      "fieldTypes": [
        {
          "name": "name",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 5,
      "id": "__module__CapoDelegateHelpers__DelegateRole[]__OtherNamedDgt",
      "name": "OtherNamedDgt",
      "fieldTypes": [
        {
          "name": "name",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 6,
      "id": "__module__CapoDelegateHelpers__DelegateRole[]__BothMintAndSpendDgt",
      "name": "BothMintAndSpendDgt",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 7,
      "id": "__module__CapoDelegateHelpers__DelegateRole[]__HandledByCapoOnly",
      "name": "HandledByCapoOnly",
      "fieldTypes": []
    }
  ]
};
const ManifestEntryTypeSchema = {
  "kind": "enum",
  "name": "ManifestEntryType",
  "id": "__module__CapoHelpers__ManifestEntryType[]",
  "variantTypes": [
    {
      "kind": "variant",
      "tag": 0,
      "id": "__module__CapoHelpers__ManifestEntryType[]__NamedTokenRef",
      "name": "NamedTokenRef",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 1,
      "id": "__module__CapoHelpers__ManifestEntryType[]__DgDataPolicy",
      "name": "DgDataPolicy",
      "fieldTypes": [
        {
          "name": "policyLink",
          "type": {
            "kind": "struct",
            "format": "list",
            "id": "__module__CapoDelegateHelpers__RelativeDelegateLink[]",
            "name": "RelativeDelegateLink",
            "fieldTypes": [
              {
                "name": "uutName",
                "type": {
                  "kind": "internal",
                  "name": "String"
                }
              },
              {
                "name": "delegateValidatorHash",
                "type": {
                  "kind": "option",
                  "someType": {
                    "kind": "internal",
                    "name": "ValidatorHash"
                  }
                }
              },
              {
                "name": "config",
                "type": {
                  "kind": "internal",
                  "name": "ByteArray"
                }
              }
            ]
          }
        },
        {
          "name": "idPrefix",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        },
        {
          "name": "refCount",
          "type": {
            "kind": "internal",
            "name": "Int"
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 2,
      "id": "__module__CapoHelpers__ManifestEntryType[]__DelegateThreads",
      "name": "DelegateThreads",
      "fieldTypes": [
        {
          "name": "role",
          "type": {
            "kind": "enum",
            "name": "DelegateRole",
            "id": "__module__CapoDelegateHelpers__DelegateRole[]",
            "variantTypes": [
              {
                "kind": "variant",
                "tag": 0,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintDgt",
                "name": "MintDgt",
                "fieldTypes": []
              },
              {
                "kind": "variant",
                "tag": 1,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendDgt",
                "name": "SpendDgt",
                "fieldTypes": []
              },
              {
                "kind": "variant",
                "tag": 2,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintInvariant",
                "name": "MintInvariant",
                "fieldTypes": []
              },
              {
                "kind": "variant",
                "tag": 3,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendInvariant",
                "name": "SpendInvariant",
                "fieldTypes": []
              },
              {
                "kind": "variant",
                "tag": 4,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__DgDataPolicy",
                "name": "DgDataPolicy",
                "fieldTypes": [
                  {
                    "name": "name",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 5,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__OtherNamedDgt",
                "name": "OtherNamedDgt",
                "fieldTypes": [
                  {
                    "name": "name",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 6,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__BothMintAndSpendDgt",
                "name": "BothMintAndSpendDgt",
                "fieldTypes": []
              },
              {
                "kind": "variant",
                "tag": 7,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__HandledByCapoOnly",
                "name": "HandledByCapoOnly",
                "fieldTypes": []
              }
            ]
          }
        },
        {
          "name": "refCount",
          "type": {
            "kind": "internal",
            "name": "Int"
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 3,
      "id": "__module__CapoHelpers__ManifestEntryType[]__MerkleMembership",
      "name": "MerkleMembership",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 4,
      "id": "__module__CapoHelpers__ManifestEntryType[]__MerkleStateRoot",
      "name": "MerkleStateRoot",
      "fieldTypes": []
    }
  ]
};
const CapoManifestEntrySchema = {
  "kind": "struct",
  "format": "map",
  "id": "__module__CapoHelpers__CapoManifestEntry[]",
  "name": "CapoManifestEntry",
  "fieldTypes": [
    {
      "name": "entryType",
      "type": {
        "kind": "enum",
        "name": "ManifestEntryType",
        "id": "__module__CapoHelpers__ManifestEntryType[]",
        "variantTypes": [
          {
            "kind": "variant",
            "tag": 0,
            "id": "__module__CapoHelpers__ManifestEntryType[]__NamedTokenRef",
            "name": "NamedTokenRef",
            "fieldTypes": []
          },
          {
            "kind": "variant",
            "tag": 1,
            "id": "__module__CapoHelpers__ManifestEntryType[]__DgDataPolicy",
            "name": "DgDataPolicy",
            "fieldTypes": [
              {
                "name": "policyLink",
                "type": {
                  "kind": "struct",
                  "format": "list",
                  "id": "__module__CapoDelegateHelpers__RelativeDelegateLink[]",
                  "name": "RelativeDelegateLink",
                  "fieldTypes": [
                    {
                      "name": "uutName",
                      "type": {
                        "kind": "internal",
                        "name": "String"
                      }
                    },
                    {
                      "name": "delegateValidatorHash",
                      "type": {
                        "kind": "option",
                        "someType": {
                          "kind": "internal",
                          "name": "ValidatorHash"
                        }
                      }
                    },
                    {
                      "name": "config",
                      "type": {
                        "kind": "internal",
                        "name": "ByteArray"
                      }
                    }
                  ]
                }
              },
              {
                "name": "idPrefix",
                "type": {
                  "kind": "internal",
                  "name": "String"
                }
              },
              {
                "name": "refCount",
                "type": {
                  "kind": "internal",
                  "name": "Int"
                }
              }
            ]
          },
          {
            "kind": "variant",
            "tag": 2,
            "id": "__module__CapoHelpers__ManifestEntryType[]__DelegateThreads",
            "name": "DelegateThreads",
            "fieldTypes": [
              {
                "name": "role",
                "type": {
                  "kind": "enum",
                  "name": "DelegateRole",
                  "id": "__module__CapoDelegateHelpers__DelegateRole[]",
                  "variantTypes": [
                    {
                      "kind": "variant",
                      "tag": 0,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintDgt",
                      "name": "MintDgt",
                      "fieldTypes": []
                    },
                    {
                      "kind": "variant",
                      "tag": 1,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendDgt",
                      "name": "SpendDgt",
                      "fieldTypes": []
                    },
                    {
                      "kind": "variant",
                      "tag": 2,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintInvariant",
                      "name": "MintInvariant",
                      "fieldTypes": []
                    },
                    {
                      "kind": "variant",
                      "tag": 3,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendInvariant",
                      "name": "SpendInvariant",
                      "fieldTypes": []
                    },
                    {
                      "kind": "variant",
                      "tag": 4,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__DgDataPolicy",
                      "name": "DgDataPolicy",
                      "fieldTypes": [
                        {
                          "name": "name",
                          "type": {
                            "kind": "internal",
                            "name": "String"
                          }
                        }
                      ]
                    },
                    {
                      "kind": "variant",
                      "tag": 5,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__OtherNamedDgt",
                      "name": "OtherNamedDgt",
                      "fieldTypes": [
                        {
                          "name": "name",
                          "type": {
                            "kind": "internal",
                            "name": "String"
                          }
                        }
                      ]
                    },
                    {
                      "kind": "variant",
                      "tag": 6,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__BothMintAndSpendDgt",
                      "name": "BothMintAndSpendDgt",
                      "fieldTypes": []
                    },
                    {
                      "kind": "variant",
                      "tag": 7,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__HandledByCapoOnly",
                      "name": "HandledByCapoOnly",
                      "fieldTypes": []
                    }
                  ]
                }
              },
              {
                "name": "refCount",
                "type": {
                  "kind": "internal",
                  "name": "Int"
                }
              }
            ]
          },
          {
            "kind": "variant",
            "tag": 3,
            "id": "__module__CapoHelpers__ManifestEntryType[]__MerkleMembership",
            "name": "MerkleMembership",
            "fieldTypes": []
          },
          {
            "kind": "variant",
            "tag": 4,
            "id": "__module__CapoHelpers__ManifestEntryType[]__MerkleStateRoot",
            "name": "MerkleStateRoot",
            "fieldTypes": []
          }
        ]
      },
      "key": "tpe"
    },
    {
      "name": "tokenName",
      "type": {
        "kind": "internal",
        "name": "ByteArray"
      },
      "key": "tn"
    },
    {
      "name": "mph",
      "type": {
        "kind": "option",
        "someType": {
          "kind": "internal",
          "name": "MintingPolicyHash"
        }
      }
    }
  ]
};
const PendingDelegateActionSchema = {
  "kind": "enum",
  "name": "PendingDelegateAction",
  "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]",
  "variantTypes": [
    {
      "kind": "variant",
      "tag": 0,
      "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]__Add",
      "name": "Add",
      "fieldTypes": [
        {
          "name": "seed",
          "type": {
            "kind": "internal",
            "name": "TxOutputId"
          }
        },
        {
          "name": "purpose",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        },
        {
          "name": "idPrefix",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 1,
      "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]__Remove",
      "name": "Remove",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 2,
      "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]__Replace",
      "name": "Replace",
      "fieldTypes": [
        {
          "name": "seed",
          "type": {
            "kind": "internal",
            "name": "TxOutputId"
          }
        },
        {
          "name": "purpose",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        },
        {
          "name": "idPrefix",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        },
        {
          "name": "replacesDgt",
          "type": {
            "kind": "internal",
            "name": "AssetClass"
          }
        }
      ]
    }
  ]
};
const PendingDelegateChangeSchema = {
  "kind": "struct",
  "format": "list",
  "id": "__module__CapoDelegateHelpers__PendingDelegateChange[]",
  "name": "PendingDelegateChange",
  "fieldTypes": [
    {
      "name": "action",
      "type": {
        "kind": "enum",
        "name": "PendingDelegateAction",
        "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]",
        "variantTypes": [
          {
            "kind": "variant",
            "tag": 0,
            "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]__Add",
            "name": "Add",
            "fieldTypes": [
              {
                "name": "seed",
                "type": {
                  "kind": "internal",
                  "name": "TxOutputId"
                }
              },
              {
                "name": "purpose",
                "type": {
                  "kind": "internal",
                  "name": "String"
                }
              },
              {
                "name": "idPrefix",
                "type": {
                  "kind": "internal",
                  "name": "String"
                }
              }
            ]
          },
          {
            "kind": "variant",
            "tag": 1,
            "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]__Remove",
            "name": "Remove",
            "fieldTypes": []
          },
          {
            "kind": "variant",
            "tag": 2,
            "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]__Replace",
            "name": "Replace",
            "fieldTypes": [
              {
                "name": "seed",
                "type": {
                  "kind": "internal",
                  "name": "TxOutputId"
                }
              },
              {
                "name": "purpose",
                "type": {
                  "kind": "internal",
                  "name": "String"
                }
              },
              {
                "name": "idPrefix",
                "type": {
                  "kind": "internal",
                  "name": "String"
                }
              },
              {
                "name": "replacesDgt",
                "type": {
                  "kind": "internal",
                  "name": "AssetClass"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "role",
      "type": {
        "kind": "enum",
        "name": "DelegateRole",
        "id": "__module__CapoDelegateHelpers__DelegateRole[]",
        "variantTypes": [
          {
            "kind": "variant",
            "tag": 0,
            "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintDgt",
            "name": "MintDgt",
            "fieldTypes": []
          },
          {
            "kind": "variant",
            "tag": 1,
            "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendDgt",
            "name": "SpendDgt",
            "fieldTypes": []
          },
          {
            "kind": "variant",
            "tag": 2,
            "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintInvariant",
            "name": "MintInvariant",
            "fieldTypes": []
          },
          {
            "kind": "variant",
            "tag": 3,
            "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendInvariant",
            "name": "SpendInvariant",
            "fieldTypes": []
          },
          {
            "kind": "variant",
            "tag": 4,
            "id": "__module__CapoDelegateHelpers__DelegateRole[]__DgDataPolicy",
            "name": "DgDataPolicy",
            "fieldTypes": [
              {
                "name": "name",
                "type": {
                  "kind": "internal",
                  "name": "String"
                }
              }
            ]
          },
          {
            "kind": "variant",
            "tag": 5,
            "id": "__module__CapoDelegateHelpers__DelegateRole[]__OtherNamedDgt",
            "name": "OtherNamedDgt",
            "fieldTypes": [
              {
                "name": "name",
                "type": {
                  "kind": "internal",
                  "name": "String"
                }
              }
            ]
          },
          {
            "kind": "variant",
            "tag": 6,
            "id": "__module__CapoDelegateHelpers__DelegateRole[]__BothMintAndSpendDgt",
            "name": "BothMintAndSpendDgt",
            "fieldTypes": []
          },
          {
            "kind": "variant",
            "tag": 7,
            "id": "__module__CapoDelegateHelpers__DelegateRole[]__HandledByCapoOnly",
            "name": "HandledByCapoOnly",
            "fieldTypes": []
          }
        ]
      }
    },
    {
      "name": "dgtLink",
      "type": {
        "kind": "option",
        "someType": {
          "kind": "struct",
          "format": "list",
          "id": "__module__CapoDelegateHelpers__RelativeDelegateLink[]",
          "name": "RelativeDelegateLink",
          "fieldTypes": [
            {
              "name": "uutName",
              "type": {
                "kind": "internal",
                "name": "String"
              }
            },
            {
              "name": "delegateValidatorHash",
              "type": {
                "kind": "option",
                "someType": {
                  "kind": "internal",
                  "name": "ValidatorHash"
                }
              }
            },
            {
              "name": "config",
              "type": {
                "kind": "internal",
                "name": "ByteArray"
              }
            }
          ]
        }
      }
    }
  ]
};
const ManifestActivitySchema = {
  "kind": "enum",
  "name": "ManifestActivity",
  "id": "__module__CapoDelegateHelpers__ManifestActivity[]",
  "variantTypes": [
    {
      "kind": "variant",
      "tag": 0,
      "id": "__module__CapoDelegateHelpers__ManifestActivity[]__retiringEntry",
      "name": "retiringEntry",
      "fieldTypes": [
        {
          "name": "key",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 1,
      "id": "__module__CapoDelegateHelpers__ManifestActivity[]__updatingEntry",
      "name": "updatingEntry",
      "fieldTypes": [
        {
          "name": "key",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        },
        {
          "name": "tokenName",
          "type": {
            "kind": "internal",
            "name": "ByteArray"
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 2,
      "id": "__module__CapoDelegateHelpers__ManifestActivity[]__addingEntry",
      "name": "addingEntry",
      "fieldTypes": [
        {
          "name": "key",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        },
        {
          "name": "tokenName",
          "type": {
            "kind": "internal",
            "name": "ByteArray"
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 3,
      "id": "__module__CapoDelegateHelpers__ManifestActivity[]__forkingThreadToken",
      "name": "forkingThreadToken",
      "fieldTypes": [
        {
          "name": "key",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        },
        {
          "name": "newThreadCount",
          "type": {
            "kind": "internal",
            "name": "Int"
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 4,
      "id": "__module__CapoDelegateHelpers__ManifestActivity[]__burningThreadToken",
      "name": "burningThreadToken",
      "fieldTypes": [
        {
          "name": "key",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        },
        {
          "name": "burnedThreadCount",
          "type": {
            "kind": "internal",
            "name": "Int"
          }
        }
      ]
    }
  ]
};
const PendingCharterChangeSchema = {
  "kind": "enum",
  "name": "PendingCharterChange",
  "id": "__module__CapoDelegateHelpers__PendingCharterChange[]",
  "variantTypes": [
    {
      "kind": "variant",
      "tag": 0,
      "id": "__module__CapoDelegateHelpers__PendingCharterChange[]__delegateChange",
      "name": "delegateChange",
      "fieldTypes": [
        {
          "name": "change",
          "type": {
            "kind": "struct",
            "format": "list",
            "id": "__module__CapoDelegateHelpers__PendingDelegateChange[]",
            "name": "PendingDelegateChange",
            "fieldTypes": [
              {
                "name": "action",
                "type": {
                  "kind": "enum",
                  "name": "PendingDelegateAction",
                  "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]",
                  "variantTypes": [
                    {
                      "kind": "variant",
                      "tag": 0,
                      "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]__Add",
                      "name": "Add",
                      "fieldTypes": [
                        {
                          "name": "seed",
                          "type": {
                            "kind": "internal",
                            "name": "TxOutputId"
                          }
                        },
                        {
                          "name": "purpose",
                          "type": {
                            "kind": "internal",
                            "name": "String"
                          }
                        },
                        {
                          "name": "idPrefix",
                          "type": {
                            "kind": "internal",
                            "name": "String"
                          }
                        }
                      ]
                    },
                    {
                      "kind": "variant",
                      "tag": 1,
                      "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]__Remove",
                      "name": "Remove",
                      "fieldTypes": []
                    },
                    {
                      "kind": "variant",
                      "tag": 2,
                      "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]__Replace",
                      "name": "Replace",
                      "fieldTypes": [
                        {
                          "name": "seed",
                          "type": {
                            "kind": "internal",
                            "name": "TxOutputId"
                          }
                        },
                        {
                          "name": "purpose",
                          "type": {
                            "kind": "internal",
                            "name": "String"
                          }
                        },
                        {
                          "name": "idPrefix",
                          "type": {
                            "kind": "internal",
                            "name": "String"
                          }
                        },
                        {
                          "name": "replacesDgt",
                          "type": {
                            "kind": "internal",
                            "name": "AssetClass"
                          }
                        }
                      ]
                    }
                  ]
                }
              },
              {
                "name": "role",
                "type": {
                  "kind": "enum",
                  "name": "DelegateRole",
                  "id": "__module__CapoDelegateHelpers__DelegateRole[]",
                  "variantTypes": [
                    {
                      "kind": "variant",
                      "tag": 0,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintDgt",
                      "name": "MintDgt",
                      "fieldTypes": []
                    },
                    {
                      "kind": "variant",
                      "tag": 1,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendDgt",
                      "name": "SpendDgt",
                      "fieldTypes": []
                    },
                    {
                      "kind": "variant",
                      "tag": 2,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintInvariant",
                      "name": "MintInvariant",
                      "fieldTypes": []
                    },
                    {
                      "kind": "variant",
                      "tag": 3,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendInvariant",
                      "name": "SpendInvariant",
                      "fieldTypes": []
                    },
                    {
                      "kind": "variant",
                      "tag": 4,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__DgDataPolicy",
                      "name": "DgDataPolicy",
                      "fieldTypes": [
                        {
                          "name": "name",
                          "type": {
                            "kind": "internal",
                            "name": "String"
                          }
                        }
                      ]
                    },
                    {
                      "kind": "variant",
                      "tag": 5,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__OtherNamedDgt",
                      "name": "OtherNamedDgt",
                      "fieldTypes": [
                        {
                          "name": "name",
                          "type": {
                            "kind": "internal",
                            "name": "String"
                          }
                        }
                      ]
                    },
                    {
                      "kind": "variant",
                      "tag": 6,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__BothMintAndSpendDgt",
                      "name": "BothMintAndSpendDgt",
                      "fieldTypes": []
                    },
                    {
                      "kind": "variant",
                      "tag": 7,
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]__HandledByCapoOnly",
                      "name": "HandledByCapoOnly",
                      "fieldTypes": []
                    }
                  ]
                }
              },
              {
                "name": "dgtLink",
                "type": {
                  "kind": "option",
                  "someType": {
                    "kind": "struct",
                    "format": "list",
                    "id": "__module__CapoDelegateHelpers__RelativeDelegateLink[]",
                    "name": "RelativeDelegateLink",
                    "fieldTypes": [
                      {
                        "name": "uutName",
                        "type": {
                          "kind": "internal",
                          "name": "String"
                        }
                      },
                      {
                        "name": "delegateValidatorHash",
                        "type": {
                          "kind": "option",
                          "someType": {
                            "kind": "internal",
                            "name": "ValidatorHash"
                          }
                        }
                      },
                      {
                        "name": "config",
                        "type": {
                          "kind": "internal",
                          "name": "ByteArray"
                        }
                      }
                    ]
                  }
                }
              }
            ]
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 1,
      "id": "__module__CapoDelegateHelpers__PendingCharterChange[]__otherManifestChange",
      "name": "otherManifestChange",
      "fieldTypes": [
        {
          "name": "activity",
          "type": {
            "kind": "enum",
            "name": "ManifestActivity",
            "id": "__module__CapoDelegateHelpers__ManifestActivity[]",
            "variantTypes": [
              {
                "kind": "variant",
                "tag": 0,
                "id": "__module__CapoDelegateHelpers__ManifestActivity[]__retiringEntry",
                "name": "retiringEntry",
                "fieldTypes": [
                  {
                    "name": "key",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 1,
                "id": "__module__CapoDelegateHelpers__ManifestActivity[]__updatingEntry",
                "name": "updatingEntry",
                "fieldTypes": [
                  {
                    "name": "key",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  },
                  {
                    "name": "tokenName",
                    "type": {
                      "kind": "internal",
                      "name": "ByteArray"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 2,
                "id": "__module__CapoDelegateHelpers__ManifestActivity[]__addingEntry",
                "name": "addingEntry",
                "fieldTypes": [
                  {
                    "name": "key",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  },
                  {
                    "name": "tokenName",
                    "type": {
                      "kind": "internal",
                      "name": "ByteArray"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 3,
                "id": "__module__CapoDelegateHelpers__ManifestActivity[]__forkingThreadToken",
                "name": "forkingThreadToken",
                "fieldTypes": [
                  {
                    "name": "key",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  },
                  {
                    "name": "newThreadCount",
                    "type": {
                      "kind": "internal",
                      "name": "Int"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 4,
                "id": "__module__CapoDelegateHelpers__ManifestActivity[]__burningThreadToken",
                "name": "burningThreadToken",
                "fieldTypes": [
                  {
                    "name": "key",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  },
                  {
                    "name": "burnedThreadCount",
                    "type": {
                      "kind": "internal",
                      "name": "Int"
                    }
                  }
                ]
              }
            ]
          }
        },
        {
          "name": "remainingDelegateValidations",
          "type": {
            "kind": "list",
            "itemType": {
              "kind": "enum",
              "name": "DelegateRole",
              "id": "__module__CapoDelegateHelpers__DelegateRole[]",
              "variantTypes": [
                {
                  "kind": "variant",
                  "tag": 0,
                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintDgt",
                  "name": "MintDgt",
                  "fieldTypes": []
                },
                {
                  "kind": "variant",
                  "tag": 1,
                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendDgt",
                  "name": "SpendDgt",
                  "fieldTypes": []
                },
                {
                  "kind": "variant",
                  "tag": 2,
                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintInvariant",
                  "name": "MintInvariant",
                  "fieldTypes": []
                },
                {
                  "kind": "variant",
                  "tag": 3,
                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendInvariant",
                  "name": "SpendInvariant",
                  "fieldTypes": []
                },
                {
                  "kind": "variant",
                  "tag": 4,
                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__DgDataPolicy",
                  "name": "DgDataPolicy",
                  "fieldTypes": [
                    {
                      "name": "name",
                      "type": {
                        "kind": "internal",
                        "name": "String"
                      }
                    }
                  ]
                },
                {
                  "kind": "variant",
                  "tag": 5,
                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__OtherNamedDgt",
                  "name": "OtherNamedDgt",
                  "fieldTypes": [
                    {
                      "name": "name",
                      "type": {
                        "kind": "internal",
                        "name": "String"
                      }
                    }
                  ]
                },
                {
                  "kind": "variant",
                  "tag": 6,
                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__BothMintAndSpendDgt",
                  "name": "BothMintAndSpendDgt",
                  "fieldTypes": []
                },
                {
                  "kind": "variant",
                  "tag": 7,
                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__HandledByCapoOnly",
                  "name": "HandledByCapoOnly",
                  "fieldTypes": []
                }
              ]
            }
          }
        }
      ]
    }
  ]
};
const CapoDatumSchema = {
  "kind": "enum",
  "name": "CapoDatum",
  "id": "__module__CapoHelpers__CapoDatum[]",
  "variantTypes": [
    {
      "kind": "variant",
      "tag": 0,
      "id": "__module__CapoHelpers__CapoDatum[]__CharterData",
      "name": "CharterData",
      "fieldTypes": [
        {
          "name": "spendDelegateLink",
          "type": {
            "kind": "struct",
            "format": "list",
            "id": "__module__CapoDelegateHelpers__RelativeDelegateLink[]",
            "name": "RelativeDelegateLink",
            "fieldTypes": [
              {
                "name": "uutName",
                "type": {
                  "kind": "internal",
                  "name": "String"
                }
              },
              {
                "name": "delegateValidatorHash",
                "type": {
                  "kind": "option",
                  "someType": {
                    "kind": "internal",
                    "name": "ValidatorHash"
                  }
                }
              },
              {
                "name": "config",
                "type": {
                  "kind": "internal",
                  "name": "ByteArray"
                }
              }
            ]
          }
        },
        {
          "name": "spendInvariants",
          "type": {
            "kind": "list",
            "itemType": {
              "kind": "struct",
              "format": "list",
              "id": "__module__CapoDelegateHelpers__RelativeDelegateLink[]",
              "name": "RelativeDelegateLink",
              "fieldTypes": [
                {
                  "name": "uutName",
                  "type": {
                    "kind": "internal",
                    "name": "String"
                  }
                },
                {
                  "name": "delegateValidatorHash",
                  "type": {
                    "kind": "option",
                    "someType": {
                      "kind": "internal",
                      "name": "ValidatorHash"
                    }
                  }
                },
                {
                  "name": "config",
                  "type": {
                    "kind": "internal",
                    "name": "ByteArray"
                  }
                }
              ]
            }
          }
        },
        {
          "name": "otherNamedDelegates",
          "type": {
            "kind": "map",
            "keyType": {
              "kind": "internal",
              "name": "String"
            },
            "valueType": {
              "kind": "struct",
              "format": "list",
              "id": "__module__CapoDelegateHelpers__RelativeDelegateLink[]",
              "name": "RelativeDelegateLink",
              "fieldTypes": [
                {
                  "name": "uutName",
                  "type": {
                    "kind": "internal",
                    "name": "String"
                  }
                },
                {
                  "name": "delegateValidatorHash",
                  "type": {
                    "kind": "option",
                    "someType": {
                      "kind": "internal",
                      "name": "ValidatorHash"
                    }
                  }
                },
                {
                  "name": "config",
                  "type": {
                    "kind": "internal",
                    "name": "ByteArray"
                  }
                }
              ]
            }
          }
        },
        {
          "name": "mintDelegateLink",
          "type": {
            "kind": "struct",
            "format": "list",
            "id": "__module__CapoDelegateHelpers__RelativeDelegateLink[]",
            "name": "RelativeDelegateLink",
            "fieldTypes": [
              {
                "name": "uutName",
                "type": {
                  "kind": "internal",
                  "name": "String"
                }
              },
              {
                "name": "delegateValidatorHash",
                "type": {
                  "kind": "option",
                  "someType": {
                    "kind": "internal",
                    "name": "ValidatorHash"
                  }
                }
              },
              {
                "name": "config",
                "type": {
                  "kind": "internal",
                  "name": "ByteArray"
                }
              }
            ]
          }
        },
        {
          "name": "mintInvariants",
          "type": {
            "kind": "list",
            "itemType": {
              "kind": "struct",
              "format": "list",
              "id": "__module__CapoDelegateHelpers__RelativeDelegateLink[]",
              "name": "RelativeDelegateLink",
              "fieldTypes": [
                {
                  "name": "uutName",
                  "type": {
                    "kind": "internal",
                    "name": "String"
                  }
                },
                {
                  "name": "delegateValidatorHash",
                  "type": {
                    "kind": "option",
                    "someType": {
                      "kind": "internal",
                      "name": "ValidatorHash"
                    }
                  }
                },
                {
                  "name": "config",
                  "type": {
                    "kind": "internal",
                    "name": "ByteArray"
                  }
                }
              ]
            }
          }
        },
        {
          "name": "govAuthorityLink",
          "type": {
            "kind": "struct",
            "format": "list",
            "id": "__module__CapoDelegateHelpers__RelativeDelegateLink[]",
            "name": "RelativeDelegateLink",
            "fieldTypes": [
              {
                "name": "uutName",
                "type": {
                  "kind": "internal",
                  "name": "String"
                }
              },
              {
                "name": "delegateValidatorHash",
                "type": {
                  "kind": "option",
                  "someType": {
                    "kind": "internal",
                    "name": "ValidatorHash"
                  }
                }
              },
              {
                "name": "config",
                "type": {
                  "kind": "internal",
                  "name": "ByteArray"
                }
              }
            ]
          }
        },
        {
          "name": "manifest",
          "type": {
            "kind": "map",
            "keyType": {
              "kind": "internal",
              "name": "String"
            },
            "valueType": {
              "kind": "struct",
              "format": "map",
              "id": "__module__CapoHelpers__CapoManifestEntry[]",
              "name": "CapoManifestEntry",
              "fieldTypes": [
                {
                  "name": "entryType",
                  "type": {
                    "kind": "enum",
                    "name": "ManifestEntryType",
                    "id": "__module__CapoHelpers__ManifestEntryType[]",
                    "variantTypes": [
                      {
                        "kind": "variant",
                        "tag": 0,
                        "id": "__module__CapoHelpers__ManifestEntryType[]__NamedTokenRef",
                        "name": "NamedTokenRef",
                        "fieldTypes": []
                      },
                      {
                        "kind": "variant",
                        "tag": 1,
                        "id": "__module__CapoHelpers__ManifestEntryType[]__DgDataPolicy",
                        "name": "DgDataPolicy",
                        "fieldTypes": [
                          {
                            "name": "policyLink",
                            "type": {
                              "kind": "struct",
                              "format": "list",
                              "id": "__module__CapoDelegateHelpers__RelativeDelegateLink[]",
                              "name": "RelativeDelegateLink",
                              "fieldTypes": [
                                {
                                  "name": "uutName",
                                  "type": {
                                    "kind": "internal",
                                    "name": "String"
                                  }
                                },
                                {
                                  "name": "delegateValidatorHash",
                                  "type": {
                                    "kind": "option",
                                    "someType": {
                                      "kind": "internal",
                                      "name": "ValidatorHash"
                                    }
                                  }
                                },
                                {
                                  "name": "config",
                                  "type": {
                                    "kind": "internal",
                                    "name": "ByteArray"
                                  }
                                }
                              ]
                            }
                          },
                          {
                            "name": "idPrefix",
                            "type": {
                              "kind": "internal",
                              "name": "String"
                            }
                          },
                          {
                            "name": "refCount",
                            "type": {
                              "kind": "internal",
                              "name": "Int"
                            }
                          }
                        ]
                      },
                      {
                        "kind": "variant",
                        "tag": 2,
                        "id": "__module__CapoHelpers__ManifestEntryType[]__DelegateThreads",
                        "name": "DelegateThreads",
                        "fieldTypes": [
                          {
                            "name": "role",
                            "type": {
                              "kind": "enum",
                              "name": "DelegateRole",
                              "id": "__module__CapoDelegateHelpers__DelegateRole[]",
                              "variantTypes": [
                                {
                                  "kind": "variant",
                                  "tag": 0,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintDgt",
                                  "name": "MintDgt",
                                  "fieldTypes": []
                                },
                                {
                                  "kind": "variant",
                                  "tag": 1,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendDgt",
                                  "name": "SpendDgt",
                                  "fieldTypes": []
                                },
                                {
                                  "kind": "variant",
                                  "tag": 2,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintInvariant",
                                  "name": "MintInvariant",
                                  "fieldTypes": []
                                },
                                {
                                  "kind": "variant",
                                  "tag": 3,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendInvariant",
                                  "name": "SpendInvariant",
                                  "fieldTypes": []
                                },
                                {
                                  "kind": "variant",
                                  "tag": 4,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__DgDataPolicy",
                                  "name": "DgDataPolicy",
                                  "fieldTypes": [
                                    {
                                      "name": "name",
                                      "type": {
                                        "kind": "internal",
                                        "name": "String"
                                      }
                                    }
                                  ]
                                },
                                {
                                  "kind": "variant",
                                  "tag": 5,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__OtherNamedDgt",
                                  "name": "OtherNamedDgt",
                                  "fieldTypes": [
                                    {
                                      "name": "name",
                                      "type": {
                                        "kind": "internal",
                                        "name": "String"
                                      }
                                    }
                                  ]
                                },
                                {
                                  "kind": "variant",
                                  "tag": 6,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__BothMintAndSpendDgt",
                                  "name": "BothMintAndSpendDgt",
                                  "fieldTypes": []
                                },
                                {
                                  "kind": "variant",
                                  "tag": 7,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__HandledByCapoOnly",
                                  "name": "HandledByCapoOnly",
                                  "fieldTypes": []
                                }
                              ]
                            }
                          },
                          {
                            "name": "refCount",
                            "type": {
                              "kind": "internal",
                              "name": "Int"
                            }
                          }
                        ]
                      },
                      {
                        "kind": "variant",
                        "tag": 3,
                        "id": "__module__CapoHelpers__ManifestEntryType[]__MerkleMembership",
                        "name": "MerkleMembership",
                        "fieldTypes": []
                      },
                      {
                        "kind": "variant",
                        "tag": 4,
                        "id": "__module__CapoHelpers__ManifestEntryType[]__MerkleStateRoot",
                        "name": "MerkleStateRoot",
                        "fieldTypes": []
                      }
                    ]
                  },
                  "key": "tpe"
                },
                {
                  "name": "tokenName",
                  "type": {
                    "kind": "internal",
                    "name": "ByteArray"
                  },
                  "key": "tn"
                },
                {
                  "name": "mph",
                  "type": {
                    "kind": "option",
                    "someType": {
                      "kind": "internal",
                      "name": "MintingPolicyHash"
                    }
                  }
                }
              ]
            }
          }
        },
        {
          "name": "pendingChanges",
          "type": {
            "kind": "list",
            "itemType": {
              "kind": "enum",
              "name": "PendingCharterChange",
              "id": "__module__CapoDelegateHelpers__PendingCharterChange[]",
              "variantTypes": [
                {
                  "kind": "variant",
                  "tag": 0,
                  "id": "__module__CapoDelegateHelpers__PendingCharterChange[]__delegateChange",
                  "name": "delegateChange",
                  "fieldTypes": [
                    {
                      "name": "change",
                      "type": {
                        "kind": "struct",
                        "format": "list",
                        "id": "__module__CapoDelegateHelpers__PendingDelegateChange[]",
                        "name": "PendingDelegateChange",
                        "fieldTypes": [
                          {
                            "name": "action",
                            "type": {
                              "kind": "enum",
                              "name": "PendingDelegateAction",
                              "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]",
                              "variantTypes": [
                                {
                                  "kind": "variant",
                                  "tag": 0,
                                  "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]__Add",
                                  "name": "Add",
                                  "fieldTypes": [
                                    {
                                      "name": "seed",
                                      "type": {
                                        "kind": "internal",
                                        "name": "TxOutputId"
                                      }
                                    },
                                    {
                                      "name": "purpose",
                                      "type": {
                                        "kind": "internal",
                                        "name": "String"
                                      }
                                    },
                                    {
                                      "name": "idPrefix",
                                      "type": {
                                        "kind": "internal",
                                        "name": "String"
                                      }
                                    }
                                  ]
                                },
                                {
                                  "kind": "variant",
                                  "tag": 1,
                                  "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]__Remove",
                                  "name": "Remove",
                                  "fieldTypes": []
                                },
                                {
                                  "kind": "variant",
                                  "tag": 2,
                                  "id": "__module__CapoDelegateHelpers__PendingDelegateAction[]__Replace",
                                  "name": "Replace",
                                  "fieldTypes": [
                                    {
                                      "name": "seed",
                                      "type": {
                                        "kind": "internal",
                                        "name": "TxOutputId"
                                      }
                                    },
                                    {
                                      "name": "purpose",
                                      "type": {
                                        "kind": "internal",
                                        "name": "String"
                                      }
                                    },
                                    {
                                      "name": "idPrefix",
                                      "type": {
                                        "kind": "internal",
                                        "name": "String"
                                      }
                                    },
                                    {
                                      "name": "replacesDgt",
                                      "type": {
                                        "kind": "internal",
                                        "name": "AssetClass"
                                      }
                                    }
                                  ]
                                }
                              ]
                            }
                          },
                          {
                            "name": "role",
                            "type": {
                              "kind": "enum",
                              "name": "DelegateRole",
                              "id": "__module__CapoDelegateHelpers__DelegateRole[]",
                              "variantTypes": [
                                {
                                  "kind": "variant",
                                  "tag": 0,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintDgt",
                                  "name": "MintDgt",
                                  "fieldTypes": []
                                },
                                {
                                  "kind": "variant",
                                  "tag": 1,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendDgt",
                                  "name": "SpendDgt",
                                  "fieldTypes": []
                                },
                                {
                                  "kind": "variant",
                                  "tag": 2,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintInvariant",
                                  "name": "MintInvariant",
                                  "fieldTypes": []
                                },
                                {
                                  "kind": "variant",
                                  "tag": 3,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendInvariant",
                                  "name": "SpendInvariant",
                                  "fieldTypes": []
                                },
                                {
                                  "kind": "variant",
                                  "tag": 4,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__DgDataPolicy",
                                  "name": "DgDataPolicy",
                                  "fieldTypes": [
                                    {
                                      "name": "name",
                                      "type": {
                                        "kind": "internal",
                                        "name": "String"
                                      }
                                    }
                                  ]
                                },
                                {
                                  "kind": "variant",
                                  "tag": 5,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__OtherNamedDgt",
                                  "name": "OtherNamedDgt",
                                  "fieldTypes": [
                                    {
                                      "name": "name",
                                      "type": {
                                        "kind": "internal",
                                        "name": "String"
                                      }
                                    }
                                  ]
                                },
                                {
                                  "kind": "variant",
                                  "tag": 6,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__BothMintAndSpendDgt",
                                  "name": "BothMintAndSpendDgt",
                                  "fieldTypes": []
                                },
                                {
                                  "kind": "variant",
                                  "tag": 7,
                                  "id": "__module__CapoDelegateHelpers__DelegateRole[]__HandledByCapoOnly",
                                  "name": "HandledByCapoOnly",
                                  "fieldTypes": []
                                }
                              ]
                            }
                          },
                          {
                            "name": "dgtLink",
                            "type": {
                              "kind": "option",
                              "someType": {
                                "kind": "struct",
                                "format": "list",
                                "id": "__module__CapoDelegateHelpers__RelativeDelegateLink[]",
                                "name": "RelativeDelegateLink",
                                "fieldTypes": [
                                  {
                                    "name": "uutName",
                                    "type": {
                                      "kind": "internal",
                                      "name": "String"
                                    }
                                  },
                                  {
                                    "name": "delegateValidatorHash",
                                    "type": {
                                      "kind": "option",
                                      "someType": {
                                        "kind": "internal",
                                        "name": "ValidatorHash"
                                      }
                                    }
                                  },
                                  {
                                    "name": "config",
                                    "type": {
                                      "kind": "internal",
                                      "name": "ByteArray"
                                    }
                                  }
                                ]
                              }
                            }
                          }
                        ]
                      }
                    }
                  ]
                },
                {
                  "kind": "variant",
                  "tag": 1,
                  "id": "__module__CapoDelegateHelpers__PendingCharterChange[]__otherManifestChange",
                  "name": "otherManifestChange",
                  "fieldTypes": [
                    {
                      "name": "activity",
                      "type": {
                        "kind": "enum",
                        "name": "ManifestActivity",
                        "id": "__module__CapoDelegateHelpers__ManifestActivity[]",
                        "variantTypes": [
                          {
                            "kind": "variant",
                            "tag": 0,
                            "id": "__module__CapoDelegateHelpers__ManifestActivity[]__retiringEntry",
                            "name": "retiringEntry",
                            "fieldTypes": [
                              {
                                "name": "key",
                                "type": {
                                  "kind": "internal",
                                  "name": "String"
                                }
                              }
                            ]
                          },
                          {
                            "kind": "variant",
                            "tag": 1,
                            "id": "__module__CapoDelegateHelpers__ManifestActivity[]__updatingEntry",
                            "name": "updatingEntry",
                            "fieldTypes": [
                              {
                                "name": "key",
                                "type": {
                                  "kind": "internal",
                                  "name": "String"
                                }
                              },
                              {
                                "name": "tokenName",
                                "type": {
                                  "kind": "internal",
                                  "name": "ByteArray"
                                }
                              }
                            ]
                          },
                          {
                            "kind": "variant",
                            "tag": 2,
                            "id": "__module__CapoDelegateHelpers__ManifestActivity[]__addingEntry",
                            "name": "addingEntry",
                            "fieldTypes": [
                              {
                                "name": "key",
                                "type": {
                                  "kind": "internal",
                                  "name": "String"
                                }
                              },
                              {
                                "name": "tokenName",
                                "type": {
                                  "kind": "internal",
                                  "name": "ByteArray"
                                }
                              }
                            ]
                          },
                          {
                            "kind": "variant",
                            "tag": 3,
                            "id": "__module__CapoDelegateHelpers__ManifestActivity[]__forkingThreadToken",
                            "name": "forkingThreadToken",
                            "fieldTypes": [
                              {
                                "name": "key",
                                "type": {
                                  "kind": "internal",
                                  "name": "String"
                                }
                              },
                              {
                                "name": "newThreadCount",
                                "type": {
                                  "kind": "internal",
                                  "name": "Int"
                                }
                              }
                            ]
                          },
                          {
                            "kind": "variant",
                            "tag": 4,
                            "id": "__module__CapoDelegateHelpers__ManifestActivity[]__burningThreadToken",
                            "name": "burningThreadToken",
                            "fieldTypes": [
                              {
                                "name": "key",
                                "type": {
                                  "kind": "internal",
                                  "name": "String"
                                }
                              },
                              {
                                "name": "burnedThreadCount",
                                "type": {
                                  "kind": "internal",
                                  "name": "Int"
                                }
                              }
                            ]
                          }
                        ]
                      }
                    },
                    {
                      "name": "remainingDelegateValidations",
                      "type": {
                        "kind": "list",
                        "itemType": {
                          "kind": "enum",
                          "name": "DelegateRole",
                          "id": "__module__CapoDelegateHelpers__DelegateRole[]",
                          "variantTypes": [
                            {
                              "kind": "variant",
                              "tag": 0,
                              "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintDgt",
                              "name": "MintDgt",
                              "fieldTypes": []
                            },
                            {
                              "kind": "variant",
                              "tag": 1,
                              "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendDgt",
                              "name": "SpendDgt",
                              "fieldTypes": []
                            },
                            {
                              "kind": "variant",
                              "tag": 2,
                              "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintInvariant",
                              "name": "MintInvariant",
                              "fieldTypes": []
                            },
                            {
                              "kind": "variant",
                              "tag": 3,
                              "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendInvariant",
                              "name": "SpendInvariant",
                              "fieldTypes": []
                            },
                            {
                              "kind": "variant",
                              "tag": 4,
                              "id": "__module__CapoDelegateHelpers__DelegateRole[]__DgDataPolicy",
                              "name": "DgDataPolicy",
                              "fieldTypes": [
                                {
                                  "name": "name",
                                  "type": {
                                    "kind": "internal",
                                    "name": "String"
                                  }
                                }
                              ]
                            },
                            {
                              "kind": "variant",
                              "tag": 5,
                              "id": "__module__CapoDelegateHelpers__DelegateRole[]__OtherNamedDgt",
                              "name": "OtherNamedDgt",
                              "fieldTypes": [
                                {
                                  "name": "name",
                                  "type": {
                                    "kind": "internal",
                                    "name": "String"
                                  }
                                }
                              ]
                            },
                            {
                              "kind": "variant",
                              "tag": 6,
                              "id": "__module__CapoDelegateHelpers__DelegateRole[]__BothMintAndSpendDgt",
                              "name": "BothMintAndSpendDgt",
                              "fieldTypes": []
                            },
                            {
                              "kind": "variant",
                              "tag": 7,
                              "id": "__module__CapoDelegateHelpers__DelegateRole[]__HandledByCapoOnly",
                              "name": "HandledByCapoOnly",
                              "fieldTypes": []
                            }
                          ]
                        }
                      }
                    }
                  ]
                }
              ]
            }
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 1,
      "id": "__module__CapoHelpers__CapoDatum[]__ScriptReference",
      "name": "ScriptReference",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 2,
      "id": "__module__CapoHelpers__CapoDatum[]__DelegatedData",
      "name": "DelegatedData",
      "fieldTypes": [
        {
          "name": "data",
          "type": {
            "kind": "map",
            "keyType": {
              "kind": "internal",
              "name": "String"
            },
            "valueType": {
              "kind": "internal",
              "name": "Data"
            }
          }
        },
        {
          "name": "version",
          "type": {
            "kind": "internal",
            "name": "Int"
          }
        },
        {
          "name": "otherDetails",
          "type": {
            "kind": "internal",
            "name": "Data"
          }
        }
      ]
    }
  ]
};
const CapoLifecycleActivitySchema = {
  "kind": "enum",
  "name": "CapoLifecycleActivity",
  "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]",
  "variantTypes": [
    {
      "kind": "variant",
      "tag": 0,
      "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]__CreatingDelegate",
      "name": "CreatingDelegate",
      "fieldTypes": [
        {
          "name": "seed",
          "type": {
            "kind": "internal",
            "name": "TxOutputId"
          }
        },
        {
          "name": "purpose",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 1,
      "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]__queuePendingChange",
      "name": "queuePendingChange",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 2,
      "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]__removePendingChange",
      "name": "removePendingChange",
      "fieldTypes": [
        {
          "name": "role",
          "type": {
            "kind": "enum",
            "name": "DelegateRole",
            "id": "__module__CapoDelegateHelpers__DelegateRole[]",
            "variantTypes": [
              {
                "kind": "variant",
                "tag": 0,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintDgt",
                "name": "MintDgt",
                "fieldTypes": []
              },
              {
                "kind": "variant",
                "tag": 1,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendDgt",
                "name": "SpendDgt",
                "fieldTypes": []
              },
              {
                "kind": "variant",
                "tag": 2,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintInvariant",
                "name": "MintInvariant",
                "fieldTypes": []
              },
              {
                "kind": "variant",
                "tag": 3,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendInvariant",
                "name": "SpendInvariant",
                "fieldTypes": []
              },
              {
                "kind": "variant",
                "tag": 4,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__DgDataPolicy",
                "name": "DgDataPolicy",
                "fieldTypes": [
                  {
                    "name": "name",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 5,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__OtherNamedDgt",
                "name": "OtherNamedDgt",
                "fieldTypes": [
                  {
                    "name": "name",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 6,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__BothMintAndSpendDgt",
                "name": "BothMintAndSpendDgt",
                "fieldTypes": []
              },
              {
                "kind": "variant",
                "tag": 7,
                "id": "__module__CapoDelegateHelpers__DelegateRole[]__HandledByCapoOnly",
                "name": "HandledByCapoOnly",
                "fieldTypes": []
              }
            ]
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 3,
      "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]__commitPendingChanges",
      "name": "commitPendingChanges",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 4,
      "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]__forcingNewSpendDelegate",
      "name": "forcingNewSpendDelegate",
      "fieldTypes": [
        {
          "name": "seed",
          "type": {
            "kind": "internal",
            "name": "TxOutputId"
          }
        },
        {
          "name": "purpose",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 5,
      "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]__forcingNewMintDelegate",
      "name": "forcingNewMintDelegate",
      "fieldTypes": [
        {
          "name": "seed",
          "type": {
            "kind": "internal",
            "name": "TxOutputId"
          }
        },
        {
          "name": "purpose",
          "type": {
            "kind": "internal",
            "name": "String"
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 6,
      "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]__updatingManifest",
      "name": "updatingManifest",
      "fieldTypes": [
        {
          "name": "activity",
          "type": {
            "kind": "enum",
            "name": "ManifestActivity",
            "id": "__module__CapoDelegateHelpers__ManifestActivity[]",
            "variantTypes": [
              {
                "kind": "variant",
                "tag": 0,
                "id": "__module__CapoDelegateHelpers__ManifestActivity[]__retiringEntry",
                "name": "retiringEntry",
                "fieldTypes": [
                  {
                    "name": "key",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 1,
                "id": "__module__CapoDelegateHelpers__ManifestActivity[]__updatingEntry",
                "name": "updatingEntry",
                "fieldTypes": [
                  {
                    "name": "key",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  },
                  {
                    "name": "tokenName",
                    "type": {
                      "kind": "internal",
                      "name": "ByteArray"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 2,
                "id": "__module__CapoDelegateHelpers__ManifestActivity[]__addingEntry",
                "name": "addingEntry",
                "fieldTypes": [
                  {
                    "name": "key",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  },
                  {
                    "name": "tokenName",
                    "type": {
                      "kind": "internal",
                      "name": "ByteArray"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 3,
                "id": "__module__CapoDelegateHelpers__ManifestActivity[]__forkingThreadToken",
                "name": "forkingThreadToken",
                "fieldTypes": [
                  {
                    "name": "key",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  },
                  {
                    "name": "newThreadCount",
                    "type": {
                      "kind": "internal",
                      "name": "Int"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 4,
                "id": "__module__CapoDelegateHelpers__ManifestActivity[]__burningThreadToken",
                "name": "burningThreadToken",
                "fieldTypes": [
                  {
                    "name": "key",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  },
                  {
                    "name": "burnedThreadCount",
                    "type": {
                      "kind": "internal",
                      "name": "Int"
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
};
const CapoActivitySchema = {
  "kind": "enum",
  "name": "CapoActivity",
  "id": "__module__CapoHelpers__CapoActivity[]",
  "variantTypes": [
    {
      "kind": "variant",
      "tag": 0,
      "id": "__module__CapoHelpers__CapoActivity[]__capoLifecycleActivity",
      "name": "capoLifecycleActivity",
      "fieldTypes": [
        {
          "name": "activity",
          "type": {
            "kind": "enum",
            "name": "CapoLifecycleActivity",
            "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]",
            "variantTypes": [
              {
                "kind": "variant",
                "tag": 0,
                "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]__CreatingDelegate",
                "name": "CreatingDelegate",
                "fieldTypes": [
                  {
                    "name": "seed",
                    "type": {
                      "kind": "internal",
                      "name": "TxOutputId"
                    }
                  },
                  {
                    "name": "purpose",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 1,
                "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]__queuePendingChange",
                "name": "queuePendingChange",
                "fieldTypes": []
              },
              {
                "kind": "variant",
                "tag": 2,
                "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]__removePendingChange",
                "name": "removePendingChange",
                "fieldTypes": [
                  {
                    "name": "role",
                    "type": {
                      "kind": "enum",
                      "name": "DelegateRole",
                      "id": "__module__CapoDelegateHelpers__DelegateRole[]",
                      "variantTypes": [
                        {
                          "kind": "variant",
                          "tag": 0,
                          "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintDgt",
                          "name": "MintDgt",
                          "fieldTypes": []
                        },
                        {
                          "kind": "variant",
                          "tag": 1,
                          "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendDgt",
                          "name": "SpendDgt",
                          "fieldTypes": []
                        },
                        {
                          "kind": "variant",
                          "tag": 2,
                          "id": "__module__CapoDelegateHelpers__DelegateRole[]__MintInvariant",
                          "name": "MintInvariant",
                          "fieldTypes": []
                        },
                        {
                          "kind": "variant",
                          "tag": 3,
                          "id": "__module__CapoDelegateHelpers__DelegateRole[]__SpendInvariant",
                          "name": "SpendInvariant",
                          "fieldTypes": []
                        },
                        {
                          "kind": "variant",
                          "tag": 4,
                          "id": "__module__CapoDelegateHelpers__DelegateRole[]__DgDataPolicy",
                          "name": "DgDataPolicy",
                          "fieldTypes": [
                            {
                              "name": "name",
                              "type": {
                                "kind": "internal",
                                "name": "String"
                              }
                            }
                          ]
                        },
                        {
                          "kind": "variant",
                          "tag": 5,
                          "id": "__module__CapoDelegateHelpers__DelegateRole[]__OtherNamedDgt",
                          "name": "OtherNamedDgt",
                          "fieldTypes": [
                            {
                              "name": "name",
                              "type": {
                                "kind": "internal",
                                "name": "String"
                              }
                            }
                          ]
                        },
                        {
                          "kind": "variant",
                          "tag": 6,
                          "id": "__module__CapoDelegateHelpers__DelegateRole[]__BothMintAndSpendDgt",
                          "name": "BothMintAndSpendDgt",
                          "fieldTypes": []
                        },
                        {
                          "kind": "variant",
                          "tag": 7,
                          "id": "__module__CapoDelegateHelpers__DelegateRole[]__HandledByCapoOnly",
                          "name": "HandledByCapoOnly",
                          "fieldTypes": []
                        }
                      ]
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 3,
                "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]__commitPendingChanges",
                "name": "commitPendingChanges",
                "fieldTypes": []
              },
              {
                "kind": "variant",
                "tag": 4,
                "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]__forcingNewSpendDelegate",
                "name": "forcingNewSpendDelegate",
                "fieldTypes": [
                  {
                    "name": "seed",
                    "type": {
                      "kind": "internal",
                      "name": "TxOutputId"
                    }
                  },
                  {
                    "name": "purpose",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 5,
                "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]__forcingNewMintDelegate",
                "name": "forcingNewMintDelegate",
                "fieldTypes": [
                  {
                    "name": "seed",
                    "type": {
                      "kind": "internal",
                      "name": "TxOutputId"
                    }
                  },
                  {
                    "name": "purpose",
                    "type": {
                      "kind": "internal",
                      "name": "String"
                    }
                  }
                ]
              },
              {
                "kind": "variant",
                "tag": 6,
                "id": "__module__CapoDelegateHelpers__CapoLifecycleActivity[]__updatingManifest",
                "name": "updatingManifest",
                "fieldTypes": [
                  {
                    "name": "activity",
                    "type": {
                      "kind": "enum",
                      "name": "ManifestActivity",
                      "id": "__module__CapoDelegateHelpers__ManifestActivity[]",
                      "variantTypes": [
                        {
                          "kind": "variant",
                          "tag": 0,
                          "id": "__module__CapoDelegateHelpers__ManifestActivity[]__retiringEntry",
                          "name": "retiringEntry",
                          "fieldTypes": [
                            {
                              "name": "key",
                              "type": {
                                "kind": "internal",
                                "name": "String"
                              }
                            }
                          ]
                        },
                        {
                          "kind": "variant",
                          "tag": 1,
                          "id": "__module__CapoDelegateHelpers__ManifestActivity[]__updatingEntry",
                          "name": "updatingEntry",
                          "fieldTypes": [
                            {
                              "name": "key",
                              "type": {
                                "kind": "internal",
                                "name": "String"
                              }
                            },
                            {
                              "name": "tokenName",
                              "type": {
                                "kind": "internal",
                                "name": "ByteArray"
                              }
                            }
                          ]
                        },
                        {
                          "kind": "variant",
                          "tag": 2,
                          "id": "__module__CapoDelegateHelpers__ManifestActivity[]__addingEntry",
                          "name": "addingEntry",
                          "fieldTypes": [
                            {
                              "name": "key",
                              "type": {
                                "kind": "internal",
                                "name": "String"
                              }
                            },
                            {
                              "name": "tokenName",
                              "type": {
                                "kind": "internal",
                                "name": "ByteArray"
                              }
                            }
                          ]
                        },
                        {
                          "kind": "variant",
                          "tag": 3,
                          "id": "__module__CapoDelegateHelpers__ManifestActivity[]__forkingThreadToken",
                          "name": "forkingThreadToken",
                          "fieldTypes": [
                            {
                              "name": "key",
                              "type": {
                                "kind": "internal",
                                "name": "String"
                              }
                            },
                            {
                              "name": "newThreadCount",
                              "type": {
                                "kind": "internal",
                                "name": "Int"
                              }
                            }
                          ]
                        },
                        {
                          "kind": "variant",
                          "tag": 4,
                          "id": "__module__CapoDelegateHelpers__ManifestActivity[]__burningThreadToken",
                          "name": "burningThreadToken",
                          "fieldTypes": [
                            {
                              "name": "key",
                              "type": {
                                "kind": "internal",
                                "name": "String"
                              }
                            },
                            {
                              "name": "burnedThreadCount",
                              "type": {
                                "kind": "internal",
                                "name": "Int"
                              }
                            }
                          ]
                        }
                      ]
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    },
    {
      "kind": "variant",
      "tag": 1,
      "id": "__module__CapoHelpers__CapoActivity[]__usingAuthority",
      "name": "usingAuthority",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 2,
      "id": "__module__CapoHelpers__CapoActivity[]__retiringRefScript",
      "name": "retiringRefScript",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 3,
      "id": "__module__CapoHelpers__CapoActivity[]__addingSpendInvariant",
      "name": "addingSpendInvariant",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 4,
      "id": "__module__CapoHelpers__CapoActivity[]__spendingDelegatedDatum",
      "name": "spendingDelegatedDatum",
      "fieldTypes": []
    },
    {
      "kind": "variant",
      "tag": 5,
      "id": "__module__CapoHelpers__CapoActivity[]__updatingCharter",
      "name": "updatingCharter",
      "fieldTypes": []
    }
  ]
};
const AnyDataSchema = {
  "kind": "struct",
  "format": "map",
  "id": "__module__StellarHeliosHelpers__AnyData[]",
  "name": "AnyData",
  "fieldTypes": [
    {
      "name": "id",
      "type": {
        "kind": "internal",
        "name": "ByteArray"
      },
      "key": "@id"
    },
    {
      "name": "type",
      "type": {
        "kind": "internal",
        "name": "String"
      },
      "key": "tpe"
    }
  ]
};

class dexieBlockDetails extends Entity {
  hash;
  height;
  time;
  slot;
}

class indexerLogs extends Entity {
  logId;
  pid;
  time;
  location;
  message;
}

class dexieUtxoDetails extends Entity {
  utxoId;
  address;
  lovelace;
  tokens;
  datumHash;
  inlineDatum;
  referenceScriptHash;
  // REQT/tqrhbphgyx
  uutIds;
}

const DEFAULT_DB_NAME = "StellarDappIndex-v0.1";
class DexieUtxoStore extends Dexie {
  blocks;
  utxos;
  txs;
  scripts;
  walletAddresses;
  logs;
  pid = 0;
  constructor(dbName = DEFAULT_DB_NAME) {
    super(dbName);
    this.version(1).stores({
      blocks: "hash, height",
      utxos: "utxoId, *uutIds, address",
      txs: "txid",
      scripts: "scriptHash",
      walletAddresses: "address",
      logs: "logId, [pid+time]"
    });
    this.blocks.mapToClass(dexieBlockDetails);
    this.utxos.mapToClass(dexieUtxoDetails);
    this.logs.mapToClass(indexerLogs);
    this.initializing = this.init();
    this.initializing.then((pid) => {
      console.log(`DexieUtxoStore initialized with pid: ${pid}`);
    });
  }
  initializing;
  // REQT/cm9ez5thxz (Process ID Management)
  async init() {
    if (this.initializing) {
      return this.initializing;
    }
    const maxPid = await this.logs.orderBy("pid").reverse().limit(1).first();
    if (!maxPid) {
      this.pid = 1;
      return 1;
    }
    this.pid = 1 + maxPid.pid;
    this.initializing = void 0;
    return this.pid;
  }
  // REQT/p7ryk4ztes (Logging Implementation)
  async log(id, message) {
    const location = new Error().stack.split("\n")[2].trim();
    const pid = this.initializing ? await this.initializing : this.pid;
    console.log(`${id}: ${message}`);
    const logId = `${id}-${nanoid()}`;
    await this.logs.add(
      {
        logId,
        pid,
        time: Date.now(),
        location,
        message
      }
    );
  }
  // REQT/76e18y06kp (Block Storage)
  async findBlockId(blockId) {
    return await this.blocks.where("hash").equals(blockId).first();
  }
  async saveBlock(block) {
    await this.blocks.put(block);
  }
  async getLatestBlock() {
    return await this.blocks.orderBy("height").reverse().limit(1).first();
  }
  // REQT/1gw45sp198 (UTXO Storage)
  async findUtxoId(utxoId) {
    return await this.utxos.where("utxoId").equals(utxoId).first();
  }
  async saveUtxo(entry) {
    await this.utxos.put(entry);
  }
  // REQT/cchf3wgnk3 (UUT Catalog Storage) - query UTXOs by UUT identifier
  async findUtxoByUUT(uutId) {
    return await this.utxos.where("uutIds").equals(uutId).first();
  }
  // REQT/nm2ed7m80y (Transaction Storage)
  async findTxId(txId) {
    return await this.txs.where("txid").equals(txId).first();
  }
  async saveTx(tx) {
    await this.txs.put(tx);
  }
  // REQT/k2wvnd3f1e (Script Storage)
  async findScript(scriptHash) {
    return await this.scripts.where("scriptHash").equals(scriptHash).first();
  }
  async saveScript(script) {
    await this.scripts.put(script);
  }
  // REQT/50zkk5xgrx: Query API Methods
  async findUtxosByAsset(policyId, tokenName, options) {
    const { limit = 100, offset = 0 } = options ?? {};
    const allUtxos = await this.utxos.toArray();
    const filtered = allUtxos.filter((utxo) => {
      return utxo.tokens.some((token) => {
        if (token.policyId !== policyId) return false;
        if (tokenName !== void 0 && token.tokenName !== tokenName)
          return false;
        return true;
      });
    });
    return filtered.slice(offset, offset + limit);
  }
  async findUtxosByAddress(address, options) {
    const { limit = 100, offset = 0 } = options ?? {};
    return await this.utxos.where("address").equals(address).offset(offset).limit(limit).toArray();
  }
  async getAllUtxos(options) {
    const { limit = 100, offset = 0 } = options ?? {};
    return await this.utxos.offset(offset).limit(limit).toArray();
  }
  // REQT/620ypcc34d: Wallet Address Storage
  async findWalletAddress(address) {
    return await this.walletAddresses.where("address").equals(address).first();
  }
  async saveWalletAddress(entry) {
    await this.walletAddresses.put(entry);
  }
  async getAllWalletAddresses() {
    return await this.walletAddresses.toArray();
  }
}

class RateLimitedFetch {
  availableBurst;
  lastUpdateTime;
  maxBurst;
  baseRefillRate;
  currentRefillRate;
  name;
  logOnRateLimited;
  // Hold state for external rate limiting (HTTP 429)
  onHold = null;
  resolveHold = null;
  recoveryInterval = null;
  // Metrics tracking
  requestTimestamps = [];
  metricsInterval = null;
  lastEmittedMetrics = null;
  events;
  /**
   * @param options.name - Name for logging (default: "RateLimitedFetch")
   * @param options.maxBurst - Maximum burst capacity (default: 300)
   * @param options.refillRate - Tokens refilled per second (default: 7)
   * @param options.logOnRateLimited - Log when rate limiting kicks in (default: true)
   */
  constructor(options = {}) {
    this.name = options.name ?? "RateLimitedFetch";
    this.maxBurst = options.maxBurst ?? 300;
    this.baseRefillRate = options.refillRate ?? 7;
    this.currentRefillRate = this.baseRefillRate;
    this.logOnRateLimited = options.logOnRateLimited ?? true;
    this.availableBurst = this.maxBurst;
    this.lastUpdateTime = Date.now();
    this.events = new EventEmitter();
    this.startMetricsInterval();
  }
  /**
   * Starts the interval that emits metrics once per second if changed.
   */
  startMetricsInterval() {
    this.metricsInterval = setInterval(() => {
      this.emitMetricsIfChanged();
    }, 1e3);
    console.log("unref at startMetricsInterval " + new Error().stack);
    this.metricsInterval.unref();
  }
  /**
   * Emits metrics event if they have changed since last emission.
   */
  emitMetricsIfChanged() {
    const metrics = this.getMetrics();
    if (!this.lastEmittedMetrics || !this.metricsEqual(metrics, this.lastEmittedMetrics)) {
      this.lastEmittedMetrics = metrics;
      this.events.emit("metrics", metrics);
    }
  }
  /**
   * Compares two metrics objects for equality.
   */
  metricsEqual(a, b) {
    return a.requestsPerSecond === b.requestsPerSecond && a.currentRefillRate === b.currentRefillRate && a.baseRefillRate === b.baseRefillRate && a.availableBurst === b.availableBurst && a.isRateLimited === b.isRateLimited && a.isOnHold === b.isOnHold && a.isRecovering === b.isRecovering;
  }
  /**
   * Gets current metrics snapshot.
   */
  getMetrics() {
    this.refillTokens();
    this.pruneOldRequestTimestamps();
    return {
      requestsPerSecond: this.requestTimestamps.length,
      currentRefillRate: this.currentRefillRate,
      baseRefillRate: this.baseRefillRate,
      availableBurst: Math.floor(this.availableBurst),
      isRateLimited: this.availableBurst < 1,
      isOnHold: this.onHold !== null,
      isRecovering: this.recoveryInterval !== null
    };
  }
  /**
   * Records a request timestamp for metrics tracking.
   */
  recordRequest() {
    this.requestTimestamps.push(Date.now());
  }
  /**
   * Removes request timestamps older than 1 second.
   */
  pruneOldRequestTimestamps() {
    const cutoff = Date.now() - 1e3;
    while (this.requestTimestamps.length > 0 && this.requestTimestamps[0] < cutoff) {
      this.requestTimestamps.shift();
    }
  }
  /**
   * Waits if necessary to stay within rate limits, then executes the fetch.
   * Handles HTTP 429 by backing off and retrying.
   */
  async fetch(url, options) {
    if (this.onHold) {
      await this.onHold;
    }
    await this.acquireToken();
    this.recordRequest();
    const response = await fetch(url, options);
    if (response.status === 429) {
      await this.handleExternalRateLimit();
      return this.fetch(url, options);
    }
    return response;
  }
  /**
   * Handles external rate limiting (HTTP 429).
   * Exhausts bucket, waits 10s, then reduces refill rate and starts recovery.
   */
  async handleExternalRateLimit() {
    if (this.logOnRateLimited) {
      console.log(
        `[${this.name}] HTTP 429 - External rate limit hit, backing off 10s`
      );
    }
    this.availableBurst = 0;
    if (!this.onHold) {
      this.onHold = new Promise((resolve) => {
        this.resolveHold = resolve;
      });
    }
    await this.sleep(1e4);
    const PHI = 1.61;
    const MIN_REFILL_RATE = 0.5;
    this.currentRefillRate = Math.max(
      MIN_REFILL_RATE,
      this.currentRefillRate / PHI
    );
    if (this.logOnRateLimited) {
      console.log(
        `[${this.name}] Resuming with reduced refill rate: ${this.currentRefillRate.toFixed(2)}/s`
      );
    }
    if (this.resolveHold) {
      this.resolveHold();
      this.onHold = null;
      this.resolveHold = null;
    }
    this.startRecovery();
  }
  /**
   * Starts the recovery process to gradually restore refill rate.
   * Increases by 1 qps every 10 seconds until back to base rate.
   */
  startRecovery() {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
    }
    this.recoveryInterval = setInterval(() => {
      if (this.currentRefillRate < this.baseRefillRate) {
        this.currentRefillRate = Math.min(
          this.baseRefillRate,
          this.currentRefillRate + 1
        );
        if (this.logOnRateLimited) {
          console.log(
            `[${this.name}] Recovery: refill rate now ${this.currentRefillRate}/s`
          );
        }
      }
      if (this.currentRefillRate >= this.baseRefillRate) {
        if (this.recoveryInterval) {
          clearInterval(this.recoveryInterval);
          this.recoveryInterval = null;
        }
        if (this.logOnRateLimited) {
          console.log(
            `[${this.name}] Recovery complete, refill rate restored to ${this.baseRefillRate}/s`
          );
        }
      }
    }, 1e4);
    console.log("unref at startRecovery " + new Error().stack);
    this.recoveryInterval.unref();
  }
  /**
   * Acquires a token, waiting if the bucket is empty.
   */
  async acquireToken() {
    this.refillTokens();
    if (this.availableBurst < 1) {
      if (this.logOnRateLimited) {
        console.log(
          `[${this.name}] Rate limited - waiting 1s (burst exhausted)`
        );
      }
      while (this.availableBurst < 1) {
        await this.sleep(1e3);
        this.refillTokens();
      }
    }
    this.availableBurst -= 1;
  }
  /**
   * Refills tokens based on time elapsed since last update.
   */
  refillTokens() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastUpdateTime) / 1e3;
    const tokensToAdd = elapsedSeconds * this.currentRefillRate;
    this.availableBurst = Math.min(
      this.maxBurst,
      this.availableBurst + tokensToAdd
    );
    this.lastUpdateTime = now;
  }
  /**
   * Sleep for the specified number of milliseconds.
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Returns the current number of available burst tokens.
   * Useful for debugging/monitoring.
   */
  get currentBurstAvailable() {
    this.refillTokens();
    return Math.floor(this.availableBurst);
  }
  /**
   * Returns the current refill rate (may be reduced during recovery).
   */
  get refillRate() {
    return this.currentRefillRate;
  }
  /**
   * Stops the metrics interval. Call when shutting down.
   */
  destroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }
    this.events.removeAllListeners();
  }
}
let blockfrostRateLimiter = null;
function getBlockfrostRateLimiter() {
  if (blockfrostRateLimiter) {
    return blockfrostRateLimiter;
  }
  blockfrostRateLimiter = new RateLimitedFetch({
    name: "Blockfrost"
  });
  return blockfrostRateLimiter;
}

const BlockDetailsFactory = type({
  time: "number",
  height: "number",
  hash: "string",
  slot: "number",
  epoch: "number",
  epoch_slot: "number",
  slot_leader: "string",
  size: "number",
  tx_count: "number",
  output: "string | null",
  fees: "string | null",
  block_vrf: "string | null",
  op_cert: "string | null",
  op_cert_counter: "string | null",
  previous_block: "string | null",
  next_block: "string | null",
  confirmations: "number"
});
jsonSchemaToType({
  "type": "object",
  "properties": {
    "time": {
      "type": "integer",
      "description": "Block creation time in UNIX time"
      // "examples": [
      //   1641338934
      // ]
    },
    "height": {
      "type": [
        "integer",
        "null"
      ],
      "description": "Block number"
      // "examples": [
      //   15243593
      // ]
    },
    "hash": {
      "type": "string",
      "description": "Hash of the block"
      //  "examples": [
      //   "4ea1ba291e8eef538635a53e59fddba7810d1679631cc3aed7c8e6c4091a516a"
      // ]
    },
    "slot": {
      "type": [
        "integer",
        "null"
      ],
      "description": "Slot number"
      // "examples": [
      //   412162133
      // ]
    },
    "epoch": {
      "type": [
        "integer",
        "null"
      ],
      "description": "Epoch number"
      // "examples": [
      //   425
      // ]
    },
    "epoch_slot": {
      "type": [
        "integer",
        "null"
      ],
      "description": "Slot within the epoch"
      // "examples": [
      //   12
      // ]
    },
    "slot_leader": {
      "type": "string",
      "description": "Bech32 ID of the slot leader or specific block description in case there is no slot leader"
      // "examples": [
      //   "pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2qnikdy"
      // ]
    },
    "size": {
      "type": "integer",
      "description": "Block size in Bytes"
      // "examples": [
      //   3
      // ]
    },
    "tx_count": {
      "type": "integer",
      "description": "Number of transactions in the block"
      // "examples": [
      //   1
      // ]
    },
    "output": {
      "type": [
        "string",
        "null"
      ],
      "description": "Total output within the block in Lovelaces"
      // "examples": [
      //   "128314491794"
      // ]
    },
    "fees": {
      "type": [
        "string",
        "null"
      ],
      "description": "Total fees within the block in Lovelaces"
      // "examples": [
      //   "592661"
      // ]
    },
    "block_vrf": {
      "type": [
        "string",
        "null"
      ],
      "description": "VRF key of the block"
      // "minLength": 65,
      // "maxLength": 65,
      // "examples": [
      //   "vrf_vk1wf2k6lhujezqcfe00l6zetxpnmh9n6mwhpmhm0dvfh3fxgmdnrfqkms8ty"
      // ]
    },
    "op_cert": {
      "type": [
        "string",
        "null"
      ],
      "description": "The hash of the operational certificate of the block producer"
      // "examples": [
      //   "da905277534faf75dae41732650568af545134ee08a3c0392dbefc8096ae177c"
      // ]
    },
    "op_cert_counter": {
      "type": [
        "string",
        "null"
      ],
      "description": "The value of the counter used to produce the operational certificate"
      // "examples": [
      //   "18"
      // ]
    },
    "previous_block": {
      "type": [
        "string",
        "null"
      ],
      "description": "Hash of the previous block"
      // "examples": [
      //   "43ebccb3ac72c7cebd0d9b755a4b08412c9f5dcb81b8a0ad1e3c197d29d47b05"
      // ]
    },
    "next_block": {
      "type": [
        "string",
        "null"
      ],
      "description": "Hash of the next block"
      // "examples": [
      //   "8367f026cf4b03e116ff8ee5daf149b55ba5a6ec6dec04803b8dc317721d15fa"
      // ]
    },
    "confirmations": {
      "type": "integer",
      "description": "Number of block confirmations"
      // "examples": [
      //   4698
      // ]
    }
  },
  "required": [
    "time",
    "height",
    "hash",
    "slot",
    "epoch",
    "epoch_slot",
    "slot_leader",
    "size",
    "tx_count",
    "output",
    "fees",
    "block_vrf",
    "op_cert",
    "op_cert_counter",
    "previous_block",
    "next_block",
    "confirmations"
  ]
});

const ValueType = type({
  unit: "string",
  quantity: "string.numeric.parse"
});
const UtxoDetailsValidator = type({
  address: "string",
  tx_hash: "string",
  tx_index: "number",
  output_index: "number",
  amount: ValueType.array(),
  block: "string",
  data_hash: "string | null",
  inline_datum: "string | null",
  reference_script_hash: "string | null"
});
function validateUtxoDetails(data) {
  const result = UtxoDetailsValidator(data);
  if (result instanceof type.errors) {
    throw new Error(`Invalid UtxoDetails: ${result.summary}`);
  }
  return result;
}
jsonSchemaToType({
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "address": {
        "type": "string",
        "description": "Bech32 encoded addresses - useful when querying by payment_cred",
        "examples": [
          "addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz"
        ]
      },
      "tx_hash": {
        "type": "string",
        "description": "Transaction hash of the UTXO"
      },
      "tx_index": {
        "type": "integer",
        "deprecated": true,
        "description": "UTXO index in the transaction"
      },
      "output_index": {
        "type": "integer",
        "description": "UTXO index in the transaction"
      },
      "amount": {
        "type": "array",
        "items": {
          "type": "object",
          "description": "The sum of all the UTXO per asset",
          "properties": {
            "unit": {
              "type": "string",
              "format": "Lovelace or concatenation of asset policy_id and hex-encoded asset_name",
              "description": "The unit of the value"
            },
            "quantity": {
              "type": "string",
              "description": "The quantity of the unit"
            }
          },
          "required": [
            "unit",
            "quantity"
          ]
        }
      },
      "block": {
        "type": "string",
        "description": "Block hash of the UTXO"
      },
      "data_hash": {
        "type": [
          "string",
          "null"
        ],
        "description": "The hash of the transaction output datum"
      },
      "inline_datum": {
        "type": [
          "string",
          "null"
        ],
        "description": "CBOR encoded inline datum",
        "examples": [
          "19a6aa"
        ]
      },
      "reference_script_hash": {
        "type": [
          "string",
          "null"
        ],
        "description": "The hash of the reference script of the output",
        "examples": [
          "13a3efd825703a352a8f71f4e2758d08c28c564e8dfcce9f77776ad1"
        ]
      }
    },
    "required": [
      "address",
      "tx_hash",
      "tx_index",
      "output_index",
      "amount",
      "block",
      "data_hash",
      "inline_datum",
      "reference_script_hash"
    ]
  },
  "examples": [
    [
      {
        "address": "addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz",
        "tx_hash": "39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58",
        "output_index": 0,
        "amount": [
          {
            "unit": "lovelace",
            "quantity": "42000000"
          }
        ],
        "block": "7eb8e27d18686c7db9a18f8bbcfe34e3fed6e047afaa2d969904d15e934847e6",
        "data_hash": "9e478573ab81ea7a8e31891ce0648b81229f408d596a3483e6f4f9b92d3cf710",
        "inline_datum": null,
        "reference_script_hash": null
      },
      {
        "address": "addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz",
        "tx_hash": "4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49",
        "output_index": 0,
        "amount": [
          {
            "unit": "lovelace",
            "quantity": "729235000"
          }
        ],
        "block": "953f1b80eb7c11a7ffcd67cbd4fde66e824a451aca5a4065725e5174b81685b7",
        "data_hash": null,
        "inline_datum": null,
        "reference_script_hash": null
      },
      {
        "address": "addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz",
        "tx_hash": "768c63e27a1c816a83dc7b07e78af673b2400de8849ea7e7b734ae1333d100d2",
        "output_index": 1,
        "amount": [
          {
            "unit": "lovelace",
            "quantity": "42000000"
          },
          {
            "unit": "b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e",
            "quantity": "12"
          }
        ],
        "block": "5c571f83fe6c784d3fbc223792627ccf0eea96773100f9aedecf8b1eda4544d7",
        "data_hash": null,
        "inline_datum": null,
        "reference_script_hash": null
      }
    ]
  ]
});

const AddressTransactionSummariesFactory = type({
  tx_hash: "string",
  tx_index: "number",
  block_height: "number",
  block_time: "number"
});
jsonSchemaToType({
  type: "array",
  items: {
    type: "object",
    properties: {
      tx_hash: {
        type: "string",
        description: "Hash of the transaction"
      },
      tx_index: {
        type: "integer",
        description: "Transaction index within the block"
      },
      block_height: {
        type: "integer",
        description: "Block height"
      },
      block_time: {
        type: "integer",
        description: "Block creation time in UNIX time"
      }
    },
    required: ["tx_hash", "tx_index", "block_height", "block_time"]
  },
  examples: [
    [
      {
        tx_hash: "8788591983aa73981fc92d6cddbbe643959f5a784e84b8bee0db15823f575a5b",
        tx_index: 6,
        block_height: 69,
        block_time: 1635505891
      },
      {
        tx_hash: "52e748c4dec58b687b90b0b40d383b9fe1f24c1a833b7395cdf07dd67859f46f",
        tx_index: 9,
        block_height: 4547,
        block_time: 1635505987
      },
      {
        tx_hash: "e8073fd5318ff43eca18a852527166aa8008bee9ee9e891f585612b7e4ba700b",
        tx_index: 0,
        block_height: 564654,
        block_time: 1834505492
      }
    ]
  ]
});

const refreshInterval = 60 * 1e3;
const DEFAULT_SYNC_PAGE_SIZE = 100;
const DEFAULT_MAX_SYNC_PAGES = Infinity;
const DEFAULT_WALLET_STALENESS_MS = 30 * 1e3;
class CachedUtxoIndex {
  blockfrostKey;
  blockfrostBaseUrl = "https://cardano-mainnet.blockfrost.io";
  // remembers the last block-id, height, and slot seen in any capo utxo
  lastBlockId;
  lastBlockHeight;
  lastSlot;
  store;
  network;
  // Configurable sync parameters (for testing)
  syncPageSize = DEFAULT_SYNC_PAGE_SIZE;
  maxSyncPages = DEFAULT_MAX_SYNC_PAGES;
  // REQT/92m7kpkny7: Wallet staleness threshold (configurable)
  walletStalenessMs = DEFAULT_WALLET_STALENESS_MS;
  // Decoupled components (instead of full Capo instance)
  _address;
  _mph;
  _isMainnet;
  bridge;
  // REQT/zzsg63b2fb: Timer for periodic refresh
  refreshTimerId = null;
  // Promise that resolves when initial sync completes.
  // Query methods await this before accessing the cache.
  syncReady;
  syncReadyResolve;
  // Event emitter for sync status and rate limit metrics
  events = new EventEmitter();
  // REQT/9a0nx1gr4b (Core State) - expose capoAddress for external access
  get capoAddress() {
    return this.addressToBech32(this._address);
  }
  // REQT/9a0nx1gr4b (Core State) - expose capoMph for external access
  get capoMph() {
    return this._mph.toHex();
  }
  /**
   * Converts an Address to bech32 string, throwing for Byron addresses.
   * Byron addresses use base58 encoding and are not supported by this indexer.
   */
  addressToBech32(address) {
    if (address.era === "Byron") {
      throw new Error(
        "Byron addresses are not supported by CachedUtxoIndex"
      );
    }
    return address.toBech32();
  }
  // =========================================================================
  // REQT/rc7km2x8hp: ReadonlyCardanoClient Interface Conformance
  // =========================================================================
  /**
   * Returns whether the network is mainnet.
   *
   * REQT/gy8z4a7pu (isMainnet Method)
   */
  isMainnet() {
    return this._isMainnet;
  }
  /**
   * Returns current slot number from the latest synced block.
   *
   * REQT/gz9a5b8qv (now Property)
   */
  get now() {
    return this.lastSlot;
  }
  /**
   * Returns network parameters from the underlying network client.
   *
   * REQT/ha0b6c9rw (parameters Property)
   */
  get parameters() {
    return this.network.parameters;
  }
  /**
   * Checks if a UTXO exists in the cache.
   *
   * REQT/gw6x2y5ns (hasUtxo Method)
   */
  async hasUtxo(utxoId) {
    await this.syncReady;
    const id = utxoId.toString();
    const entry = await this.store.findUtxoId(id);
    return entry !== void 0;
  }
  /**
   * Submits a transaction to the network.
   * Delegates to the underlying network client.
   *
   * This allows CachedUtxoIndex to be used as a full CardanoClient replacement,
   * not just a ReadonlyCardanoClient.
   */
  async submitTx(tx) {
    return this.network.submitTx(tx);
  }
  constructor({
    address,
    mph,
    isMainnet,
    network,
    bridge,
    blockfrostKey,
    storeIn: strategy = "dexie",
    dbName,
    syncPageSize,
    maxSyncPages
  }) {
    this._address = typeof address === "string" ? makeAddress(address) : address;
    this._mph = typeof mph === "string" ? makeMintingPolicyHash(mph) : mph;
    this._isMainnet = isMainnet;
    this.network = network;
    this.bridge = bridge;
    this.blockfrostKey = blockfrostKey;
    if (blockfrostKey.startsWith("mainnet")) {
      this.blockfrostBaseUrl = "https://cardano-mainnet.blockfrost.io";
    } else if (blockfrostKey.startsWith("preprod")) {
      this.blockfrostBaseUrl = "https://cardano-preprod.blockfrost.io";
    } else if (blockfrostKey.startsWith("preview")) {
      this.blockfrostBaseUrl = "https://cardano-preview.blockfrost.io";
    }
    this.lastBlockId = "";
    this.lastBlockHeight = 0;
    this.lastSlot = 0;
    if (syncPageSize !== void 0) {
      this.syncPageSize = syncPageSize;
    }
    if (maxSyncPages !== void 0) {
      this.maxSyncPages = maxSyncPages;
    }
    if (strategy === "dexie") {
      this.store = new DexieUtxoStore(dbName);
    } else if (strategy === "memory") {
      throw new Error("Memory strategy not implemented");
    } else if (strategy === "dred") {
      throw new Error("Dred strategy not implemented");
    } else {
      throw new Error(`Invalid strategy: ${strategy}`);
    }
    this.store.log(
      "agsbb",
      `CachedUtxoIndex created for address: ${this._address.toString()}`
    );
    getBlockfrostRateLimiter().events.on("metrics", (metrics) => {
      this.events.emit("rateLimitMetrics", metrics);
    });
    this.syncReady = new Promise((resolve) => {
      this.syncReadyResolve = resolve;
    });
    this.syncNow();
  }
  async syncNow() {
    this.events.emit("syncStart");
    const cachedBlock = await this.store.getLatestBlock();
    if (cachedBlock) {
      this.lastBlockId = cachedBlock.hash;
      this.lastBlockHeight = cachedBlock.height;
      this.lastSlot = cachedBlock.slot;
      await this.store.log(
        "c8init",
        `Initialized from cache: block #${cachedBlock.height}, slot ${cachedBlock.slot}`
      );
      await this.checkForNewTxns();
      this.syncReadyResolve();
      this.events.emit("syncComplete");
      return;
    }
    const capoUtxos = await this.network.getUtxos(this._address);
    await this.store.log("yz58q", `Found ${capoUtxos.length} capo UTXOs`);
    for (const utxo of capoUtxos) {
      const entry = this.txInputToIndexEntry(utxo);
      await this.store.saveUtxo(entry);
    }
    const uniqueTxIds = new Set(
      capoUtxos.map((utxo) => {
        const id = utxo.id.toString();
        return id.split("#")[0];
      })
    );
    await this.store.log(
      "yuyqy",
      `Found ${uniqueTxIds.size} unique transaction IDs`
    );
    for (const txId of uniqueTxIds) {
      await this.store.log(
        "48nyb",
        `Fetching transaction details for ${txId}`
      );
      await this.findOrFetchTxDetails(txId);
    }
    const charterUtxo = this.findCharterUtxo(capoUtxos);
    if (!charterUtxo) {
      throw new Error("Charter UTXO not found at capo address");
    }
    const charterData = this.decodeCharterData(charterUtxo);
    await this.catalogDelegateUuts(charterData);
    await this.fetchAndStoreLatestBlock();
    this.syncReadyResolve();
    this.events.emit("syncComplete");
  }
  /**
   * Checks for new transactions at the capo address and indexes new UTXOs.
   * Supports pagination with configurable page size and max pages.
   *
   * REQT-1.3.2 (checkForNewTxns)
   */
  async checkForNewTxns(fromBlockHeight) {
    this.events.emit("syncing");
    const startHeight = fromBlockHeight ?? (this.lastBlockHeight > 0 ? this.lastBlockHeight + 1 : 0);
    if (startHeight == 0) {
      this.events.emit("synced");
      throw new Error(
        "Cannot start checking for new transactions at block height 0"
      );
    }
    let currentPage = 1;
    let hasMorePages = true;
    let lastTxIndex;
    while (hasMorePages && currentPage <= this.maxSyncPages) {
      let url = `addresses/${this.capoAddress}/transactions?order=asc&count=${this.syncPageSize}&from=${startHeight}`;
      if (lastTxIndex !== void 0) {
        url += `&after=${lastTxIndex}`;
      }
      const untyped = await this.fetchFromBlockfrost(url);
      if (!Array.isArray(untyped) || untyped.length === 0) {
        hasMorePages = false;
        break;
      }
      const transactionSummaries = [];
      for (const item of untyped) {
        const validationResult = AddressTransactionSummariesFactory(item);
        if (validationResult instanceof ArkErrors) {
          console.error(
            `Error validating transaction summary:`,
            item
          );
          validationResult.throw();
        }
        transactionSummaries.push(
          validationResult
        );
      }
      for (const summary of transactionSummaries) {
        await this.processTransactionForNewUtxos(
          summary.tx_hash,
          summary
        );
      }
      if (untyped.length < this.syncPageSize) {
        hasMorePages = false;
      } else {
        const lastSummary = transactionSummaries[transactionSummaries.length - 1];
        lastTxIndex = lastSummary.tx_index;
        currentPage++;
      }
    }
    if (currentPage > this.maxSyncPages && hasMorePages) {
      await this.store.log(
        "pglim",
        `Stopped after ${this.maxSyncPages} pages (maxSyncPages limit reached)`
      );
    }
    this.events.emit("synced");
  }
  /**
   * Starts periodic refresh timer to automatically check for new transactions.
   *
   * REQT/zzsg63b2fb (Automated Periodic Refresh)
   */
  startPeriodicRefresh() {
    if (this.refreshTimerId) {
      return;
    }
    this.store.log(
      "pr5t1",
      `Starting periodic refresh every ${refreshInterval / 1e3} seconds`
    );
    this.refreshTimerId = setInterval(async () => {
      try {
        await this.checkForNewTxns();
      } catch (e) {
        console.warn("Periodic refresh failed:", e);
        this.store.log(
          "pr5er",
          `Periodic refresh error: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }, refreshInterval);
    this.refreshTimerId.unref();
  }
  /**
   * Stops the periodic refresh timer.
   *
   * REQT/zzsg63b2fb (Automated Periodic Refresh)
   */
  stopPeriodicRefresh() {
    if (this.refreshTimerId) {
      this.store.log("pr5t0", "Stopping periodic refresh");
      clearInterval(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }
  /**
   * Returns whether periodic refresh is currently active.
   *
   * REQT/zzsg63b2fb (Automated Periodic Refresh)
   */
  get isPeriodicRefreshActive() {
    return this.refreshTimerId !== null;
  }
  // =========================================================================
  // REQT/ngn9agx52a: Wallet Address Indexing
  // =========================================================================
  /**
   * Registers a wallet address for UTXO indexing.
   * Fetches current UTXOs and stores them in the cache.
   *
   * REQT/mp4dx7ngvf (Address Registration)
   */
  async addWalletAddress(address) {
    await this.syncReady;
    const existing = await this.store.findWalletAddress(address);
    if (existing) {
      await this.store.log(
        "wa1sk",
        `Wallet address ${address} already registered, skipping`
      );
      return;
    }
    await this.store.log("wa1rg", `Registering wallet address: ${address}`);
    const heliosAddress = makeAddress(address);
    const utxos = await this.network.getUtxos(heliosAddress);
    for (const utxo of utxos) {
      const entry = this.txInputToIndexEntry(utxo);
      await this.store.saveUtxo(entry);
    }
    await this.store.saveWalletAddress({
      address,
      lastBlockHeight: this.lastBlockHeight,
      lastSyncTime: Date.now()
    });
    await this.store.log(
      "wa1ok",
      `Registered wallet address ${address} with ${utxos.length} UTXOs`
    );
  }
  /**
   * Syncs UTXOs for a registered wallet address if stale.
   * Returns true if sync was performed, false if cache was fresh.
   *
   * REQT/92m7kpkny7 (On-Demand Sync)
   */
  async syncWalletAddressIfStale(address) {
    const walletEntry = await this.store.findWalletAddress(address);
    if (!walletEntry) {
      return false;
    }
    const now = Date.now();
    const age = now - walletEntry.lastSyncTime;
    if (age < this.walletStalenessMs) {
      return false;
    }
    await this.store.log(
      "wa2sy",
      `Wallet ${address} is stale (${Math.round(age / 1e3)}s old), syncing`
    );
    const heliosAddress = makeAddress(address);
    const utxos = await this.network.getUtxos(heliosAddress);
    for (const utxo of utxos) {
      const entry = this.txInputToIndexEntry(utxo);
      await this.store.saveUtxo(entry);
    }
    await this.store.saveWalletAddress({
      address,
      lastBlockHeight: this.lastBlockHeight,
      lastSyncTime: now
    });
    await this.store.log(
      "wa2ok",
      `Synced wallet ${address}: ${utxos.length} UTXOs`
    );
    return true;
  }
  /**
   * Processes a transaction to identify and index new UTXOs.
   *
   * REQT-1.3.3 (processTransactionForNewUtxos)
   */
  async processTransactionForNewUtxos(txHash, summary) {
    const tx = await this.findOrFetchTxDetails(txHash);
    const mph = this._mph;
    let charterChanged = false;
    for (let outputIndex = 0; outputIndex < tx.body.outputs.length; outputIndex++) {
      const output = tx.body.outputs[outputIndex];
      const utxoId = this.formatUtxoId(txHash, outputIndex);
      const existingUtxo = await this.store.findUtxoId(utxoId);
      if (existingUtxo) {
        continue;
      }
      await this.indexUtxoFromOutput(txHash, outputIndex, output);
      const tokenNames = output.value.assets.getPolicyTokenNames(mph);
      for (const tokenNameBytes of tokenNames) {
        try {
          const tokenName = new TextDecoder().decode(
            new Uint8Array(tokenNameBytes)
          );
          if (tokenName === "charter") {
            charterChanged = true;
          }
        } catch (e) {
          console.error(
            `ignoring non-UTF8 token name:`,
            tokenNameBytes,
            e.message || e
          );
        }
      }
    }
    if (charterChanged) {
      await this.store.log(
        "ch4rt",
        `Charter token detected in tx ${txHash}, re-cataloging delegates`
      );
      const capoUtxos = await this.network.getUtxos(this._address);
      const charterUtxo = this.findCharterUtxo(capoUtxos);
      if (charterUtxo) {
        const charterData = this.decodeCharterData(charterUtxo);
        await this.catalogDelegateUuts(charterData);
      }
    }
  }
  /**
   * Extracts UUT identifiers from a TxOutput's value.
   * UUT names match pattern: {purpose}-{hash} where purpose is [a-z]+ and hash is 12 hex chars.
   *
   * REQT/cchf3wgnk3 (UUT Catalog Storage)
   */
  extractUutIds(output) {
    const uutPattern = /^[a-z]+-[0-9a-f]{12}$/;
    const tokenNames = output.value.assets.getPolicyTokenNames(this._mph);
    return tokenNames.map((bytes) => {
      try {
        return new TextDecoder().decode(new Uint8Array(bytes));
      } catch (e) {
        console.error(
          `ignoring non-UTF8 token name:`,
          bytes,
          e.message || e
        );
        return "";
      }
    }).filter((name) => uutPattern.test(name));
  }
  /**
   * Extracts UUT identifiers from a TxInput's value.
   */
  extractUutIdsFromTxInput(txInput) {
    const uutPattern = /^[a-z]+-[0-9a-f]{12}$/;
    const tokenNames = txInput.value.assets.getPolicyTokenNames(this._mph);
    return tokenNames.map((bytes) => {
      try {
        return new TextDecoder().decode(new Uint8Array(bytes));
      } catch (e) {
        console.error(
          `ignoring non-UTF8 token name:`,
          bytes,
          e.message || e
        );
        return "";
      }
    }).filter((name) => uutPattern.test(name));
  }
  /**
   * Converts a TxOutput to a storage-agnostic UtxoIndexEntry.
   *
   * TYPE BOUNDARY: This method converts Helios types to storage types.
   */
  txOutputToIndexEntry(txHash, outputIndex, output) {
    const utxoId = this.formatUtxoId(txHash, outputIndex);
    const tokens = [];
    for (const mph of output.value.assets.getPolicies()) {
      for (const [tokenName, qty] of output.value.assets.getPolicyTokens(
        mph
      )) {
        tokens.push({
          policyId: mph.toHex(),
          tokenName: bytesToHex(tokenName),
          quantity: qty
        });
      }
    }
    let datumHash = null;
    let inlineDatum = null;
    if (output.datum) {
      if (output.datum.kind === "HashedTxOutputDatum") {
        datumHash = output.datum.hash.toHex();
      } else if (output.datum.kind === "InlineTxOutputDatum") {
        inlineDatum = bytesToHex(output.datum.data.toCbor());
      }
    }
    const referenceScriptHash = output.refScript ? bytesToHex(output.refScript.hash()) : null;
    return {
      utxoId,
      address: this.addressToBech32(output.address),
      lovelace: output.value.lovelace,
      tokens,
      datumHash,
      inlineDatum,
      referenceScriptHash,
      uutIds: this.extractUutIds(output)
    };
  }
  /**
   * Converts a TxInput to a storage-agnostic UtxoIndexEntry.
   *
   * TYPE BOUNDARY: This method converts Helios types to storage types.
   */
  txInputToIndexEntry(txInput) {
    const utxoId = txInput.id.toString();
    const tokens = [];
    for (const mph of txInput.value.assets.getPolicies()) {
      for (const [tokenName, qty] of txInput.value.assets.getPolicyTokens(
        mph
      )) {
        tokens.push({
          policyId: mph.toHex(),
          tokenName: bytesToHex(tokenName),
          quantity: qty
        });
      }
    }
    let datumHash = null;
    let inlineDatum = null;
    if (txInput.datum) {
      if (txInput.datum.kind === "HashedTxOutputDatum") {
        datumHash = txInput.datum.hash.toHex();
      } else if (txInput.datum.kind === "InlineTxOutputDatum") {
        inlineDatum = bytesToHex(txInput.datum.data.toCbor());
      }
    }
    const referenceScriptHash = txInput.output?.refScript ? bytesToHex(txInput.output.refScript.hash()) : null;
    return {
      utxoId,
      address: this.addressToBech32(txInput.address),
      lovelace: txInput.value.lovelace,
      tokens,
      datumHash,
      inlineDatum,
      referenceScriptHash,
      uutIds: this.extractUutIdsFromTxInput(txInput)
    };
  }
  /**
   * Converts Blockfrost UtxoDetailsType to storage-agnostic UtxoIndexEntry.
   *
   * TYPE BOUNDARY: This method converts Blockfrost types to storage types.
   */
  blockfrostUtxoToIndexEntry(bfUtxo, utxoId) {
    const lovelaceAmount = bfUtxo.amount.find((a) => a.unit === "lovelace");
    const lovelace = lovelaceAmount ? BigInt(lovelaceAmount.quantity) : 0n;
    const tokens = [];
    for (const amt of bfUtxo.amount) {
      if (amt.unit !== "lovelace") {
        const policyId = amt.unit.slice(0, 56);
        const tokenName = amt.unit.slice(56);
        tokens.push({
          policyId,
          tokenName,
          quantity: BigInt(amt.quantity)
        });
      }
    }
    const capoMphHex = this.capoMph;
    const uutPattern = /^[a-z]+-[0-9a-f]{12}$/;
    const uutIds = [];
    for (const token of tokens) {
      if (token.policyId === capoMphHex) {
        const bytes = new Uint8Array(
          token.tokenName.match(/.{2}/g)?.map((b) => parseInt(b, 16)) || []
        );
        try {
          const name = new TextDecoder().decode(bytes);
          if (uutPattern.test(name)) {
            uutIds.push(name);
          }
        } catch (e) {
          console.error(
            `ignoring non-UTF8 token name:`,
            bytes,
            e.message || e
          );
        }
      }
    }
    return {
      utxoId,
      address: bfUtxo.address,
      lovelace,
      tokens,
      datumHash: bfUtxo.data_hash,
      inlineDatum: bfUtxo.inline_datum,
      referenceScriptHash: bfUtxo.reference_script_hash,
      uutIds
    };
  }
  /**
   * Converts Blockfrost BlockDetailsType to storage-agnostic BlockIndexEntry.
   *
   * TYPE BOUNDARY: This method converts Blockfrost types to storage types.
   */
  blockfrostBlockToIndexEntry(bfBlock) {
    return {
      hash: bfBlock.hash,
      height: bfBlock.height,
      time: bfBlock.time,
      slot: bfBlock.slot
    };
  }
  /**
   * Finds the charter UTXO from a list of UTXOs.
   * The charter UTXO contains the "charter" token from the capo's minting policy.
   */
  findCharterUtxo(utxos) {
    const charterTokenName = bytesToHex([
      ...new TextEncoder().encode("charter")
    ]);
    for (const utxo of utxos) {
      const tokens = utxo.value.assets.getPolicyTokens(this._mph);
      for (const [tokenName, _qty] of tokens) {
        if (bytesToHex(tokenName) === charterTokenName) {
          return utxo;
        }
      }
    }
    return void 0;
  }
  /**
   * Decodes charter data from a charter UTXO using the bridge.
   */
  decodeCharterData(charterUtxo) {
    const datum = charterUtxo.datum;
    if (!datum || !datum.data) {
      throw new Error("Charter UTXO has no datum");
    }
    const decoded = this.bridge.reader.CapoDatum(datum.data);
    if (!decoded.CharterData) {
      throw new Error("Charter UTXO datum is not CharterData");
    }
    return decoded.CharterData;
  }
  /**
   * Indexes a UTXO from a transaction output.
   *
   * REQT/mvjrak021s (UTXO Indexing)
   */
  async indexUtxoFromOutput(txHash, outputIndex, output) {
    const entry = this.txOutputToIndexEntry(txHash, outputIndex, output);
    await this.store.saveUtxo(entry);
  }
  /**
   * Catalogs delegate UUTs mentioned in the charter.
   * Uses delegate links directly with Blockfrost queries (decoupled from Capo).
   *
   * REQT-1.2.1 (catalogDelegateUuts)
   */
  async catalogDelegateUuts(charterData) {
    await this.store.log("z5h89", `Cataloging delegate UUTs`);
    try {
      const mintDelegateLink = charterData.mintDelegateLink;
      if (mintDelegateLink?.uutName) {
        await this.store.log(
          "ht8mg",
          `Fetching mint delegate UUT: ${mintDelegateLink.uutName}`
        );
        await this.fetchAndIndexDelegateLinkUut(
          mintDelegateLink,
          "mintDelegate"
        );
      }
    } catch (e) {
      throw new Error(
        `Could not resolve mint delegate UUT: ${e.message || e}`
      );
    }
    try {
      const spendDelegateLink = charterData.spendDelegateLink;
      if (spendDelegateLink?.uutName) {
        await this.store.log(
          "fgmtv",
          `Fetching spend delegate UUT: ${spendDelegateLink.uutName}`
        );
        await this.fetchAndIndexDelegateLinkUut(
          spendDelegateLink,
          "spendDelegate"
        );
      }
    } catch (e) {
      throw new Error(
        `Could not resolve spend delegate UUT: ${e.message || e}`
      );
    }
    try {
      const govAuthorityLink = charterData.govAuthorityLink;
      if (govAuthorityLink?.uutName) {
        await this.store.log(
          "g8xpk",
          `Fetching gov authority UUT: ${govAuthorityLink.uutName}`
        );
        await this.fetchAndIndexDelegateLinkUut(
          govAuthorityLink,
          "govAuthority"
        );
      }
    } catch (e) {
      throw new Error(
        `Could not resolve gov authority UUT: ${e.message || e}`
      );
    }
    if (charterData.spendInvariants) {
      for (let i = 0; i < charterData.spendInvariants.length; i++) {
        throw new Error(`TODO: support for invariants`);
      }
    }
    if (charterData.mintInvariants) {
      for (let i = 0; i < charterData.mintInvariants.length; i++) {
        throw new Error(`TODO: support for invariants`);
      }
    }
    if (charterData.otherNamedDelegates) {
      const namedDelegates = charterData.otherNamedDelegates instanceof Map ? [...charterData.otherNamedDelegates.entries()] : Object.entries(charterData.otherNamedDelegates);
      for (const [delegateName, delegateLink] of namedDelegates) {
        try {
          if (delegateLink && typeof delegateLink === "object" && "uutName" in delegateLink && delegateLink.uutName) {
            await this.store.log(
              "nd8uu",
              `Fetching named delegate '${delegateName}' UUT`
            );
            await this.fetchAndIndexDelegateLinkUut(
              delegateLink,
              `namedDelegate:${delegateName}`
            );
          }
        } catch (e) {
          throw new Error(
            `Could not resolve named delegate '${delegateName}' UUT: ${e.message || e}`
          );
        }
      }
    }
    for (const [entryName, entryInfo] of charterData.manifest.entries()) {
      const { DgDataPolicy } = entryInfo.entryType;
      if (!DgDataPolicy) {
        const actualType = Object.keys(entryInfo.entryType)[0];
        this.store.log(
          "pm5rq",
          `${entryName} is a ${actualType}, not a DgDataPolicy; skipping`
        );
        continue;
      }
      try {
        const { policyLink } = DgDataPolicy;
        if (policyLink?.uutName) {
          await this.store.log(
            "c6awj",
            `Fetching dgData controller UUT: ${policyLink.uutName}`
          );
          await this.fetchAndIndexDelegateLinkUut(
            policyLink,
            `dgDataController:${entryName}`
          );
        }
      } catch (e) {
        throw new Error(
          `Could not resolve dgData controller ${entryName}: ${e.message || e}`
        );
      }
    }
  }
  /**
   * Fetches and indexes a delegate's authority token UTXO from a delegate link.
   */
  async fetchAndIndexDelegateLinkUut(delegateLink, label) {
    const tokenNameBytes = encodeUtf8(delegateLink.uutName);
    const assetClass = makeAssetClass(this._mph, tokenNameBytes);
    const address = delegateLink.delegateValidatorHash ? makeAddress(
      this._isMainnet,
      makeValidatorHash(delegateLink.delegateValidatorHash)
    ) : this._address;
    await this.store.log(
      "dx8pq",
      `Fetching UUT for ${label} at address ${address.toString()}`
    );
    const policyId = assetClass.mph.toHex();
    const assetName = bytesToHex(assetClass.tokenName);
    const asset = `${policyId}${assetName}`;
    const url = `addresses/${address.toString()}/utxos/${asset}?count=1&order=desc`;
    const untyped = await this.fetchFromBlockfrost(url);
    if (!Array.isArray(untyped) || untyped.length === 0) {
      await this.store.log(
        "no8uu",
        `No UTXO found for ${label} with asset ${asset}`
      );
      return;
    }
    const typed = validateUtxoDetails(untyped[0]);
    const utxoId = this.formatUtxoId(typed.tx_hash, typed.output_index);
    const entry = this.blockfrostUtxoToIndexEntry(typed, utxoId);
    await this.store.saveUtxo(entry);
  }
  /**
   * Indexes a UTXO from a TxInput object.
   */
  async indexUtxoFromTxInput(txInput) {
    const entry = this.txInputToIndexEntry(txInput);
    await this.store.saveUtxo(entry);
  }
  async fetchFromBlockfrost(url) {
    return getBlockfrostRateLimiter().fetch(`${this.blockfrostBaseUrl}/api/v0/${url}`, {
      headers: {
        project_id: this.blockfrostKey
      }
    }).then(async (res) => {
      const result = await res.json();
      if (!res.ok) {
        await this.store.log(
          "3ecxh",
          `Error fetching from blockfrost: ${url} ${result.message}`
        );
        throw new Error(result.message);
      }
      await this.store.log(
        "rm7g8",
        `Successfully fetched from blockfrost: ${url} ${JSON.stringify(result)}`
      );
      return result;
    });
  }
  async findOrFetchBlockHeight(blockId) {
    const block = await this.store.findBlockId(blockId);
    if (block) {
      return block.height;
    }
    const details = await this.fetchBlockDetails(blockId);
    const entry = this.blockfrostBlockToIndexEntry(details);
    await this.store.saveBlock(entry);
    return entry.height;
  }
  async fetchBlockDetails(blockId) {
    await this.store.log(
      "78q9n",
      `Fetching block details for ${blockId} from blockfrost`
    );
    const untyped = await this.fetchFromBlockfrost(`blocks/${blockId}`);
    const typed = BlockDetailsFactory(untyped);
    if (typed instanceof ArkErrors) {
      return typed.throw();
    }
    return typed;
  }
  async fetchAndStoreLatestBlock() {
    await this.store.log("x2xzt", `Fetching latest block from blockfrost`);
    const untyped = await this.fetchFromBlockfrost(`blocks/latest`);
    const typed = BlockDetailsFactory(untyped);
    if (typed instanceof ArkErrors) {
      return typed.throw();
    }
    await this.store.log(
      "8y2yn",
      `latest block from blockfrost: #${typed.height} ${typed.hash}`
    );
    const entry = this.blockfrostBlockToIndexEntry(typed);
    await this.store.saveBlock(entry);
    if (typed.height > this.lastBlockHeight) {
      await this.store.log(
        "2k3uq",
        `new latest block: #${typed.height} ${typed.hash}`
      );
      this.lastBlockHeight = typed.height;
      this.lastBlockId = typed.hash;
      this.lastSlot = entry.slot;
    }
    return entry;
  }
  /**
   * Fetches and caches a reference script by its hash.
   * Returns the decoded UplcProgramV2 or undefined if not found.
   *
   * REQT/tqrhbphgyx (Reference Script Fetching)
   * REQT/k2wvnd3f1e (Script Storage)
   */
  async fetchAndCacheScript(scriptHash) {
    const cached = await this.store.findScript(scriptHash);
    if (cached) {
      return decodeUplcProgramV2FromCbor(cached.cbor);
    }
    try {
      const response = await this.fetchFromBlockfrost(`scripts/${scriptHash}/cbor`);
      if (!response.cbor) {
        await this.store.log(
          "scr0",
          `Script ${scriptHash} has no CBOR (may be native script)`
        );
        return void 0;
      }
      await this.store.saveScript({ scriptHash, cbor: response.cbor });
      return decodeUplcProgramV2FromCbor(response.cbor);
    } catch (e) {
      throw new Error(
        `Failed to fetch script ${scriptHash}: ${e.message || e}`
      );
    }
  }
  /**
   * Retrieves a transaction by ID.
   * Implements ReadonlyCardanoClient.getTx
   *
   * REQT/gx7y3z6ot (getTx Method)
   */
  async getTx(id) {
    await this.syncReady;
    return this.findOrFetchTxDetails(id.toHex());
  }
  /**
   * Retrieves a transaction by ID with fully-restored input data.
   * Uses Helios tx.recover() to populate input output data from cache.
   *
   * Unlike getTx() which returns raw decoded Tx, this method ensures
   * inputs have their output data (address, value, datum, refScript).
   *
   * REQT/qc7qgsqphv (getTx with Restored Inputs)
   */
  async getTxInfo(id) {
    await this.syncReady;
    const tx = await this.findOrFetchTxDetails(id.toHex());
    await tx.recover(this);
    return tx;
  }
  async findOrFetchTxDetails(txId) {
    const txCbor = await this.store.findTxId(txId);
    if (txCbor) {
      return decodeTx(txCbor.cbor);
    }
    await this.store.log(
      "qwmrh",
      `Fetching tx details for ${txId} from blockfrost`
    );
    const { cbor: cborHex } = await this.fetchFromBlockfrost(`txs/${txId}/cbor`);
    await this.store.saveTx({ txid: txId, cbor: cborHex });
    return decodeTx(cborHex);
  }
  async fetchTxDetails(txId) {
    await this.store.log("64qjp", `Fetching tx details for ${txId}`);
    const { cbor: cborHex } = await this.fetchFromBlockfrost(`txs/${txId}/cbor`);
    return decodeTx(cborHex);
  }
  /**
   * Constructs a UTXO ID from tx_hash and output_index
   */
  formatUtxoId(txHash, outputIndex) {
    return `${txHash}#${outputIndex}`;
  }
  /**
   * Restores full TxInput data for all inputs in a transaction.
   *
   * When a Tx is decoded from CBOR, its inputs only contain TxOutputId references.
   * This method looks up each input's corresponding UTXO from the cache and
   * returns fully restored TxInputs with complete output data (address, value,
   * datum, reference script).
   *
   * REQT/qc7qgsqphv (getTx with restored inputs)
   *
   * @param tx - The decoded transaction
   * @returns Array of fully restored TxInputs with output data
   */
  async restoreTxInputs(tx) {
    const restoredInputs = [];
    for (const input of tx.body.inputs) {
      const utxoId = input.id.toString();
      const entry = await this.store.findUtxoId(utxoId);
      if (entry) {
        restoredInputs.push(await this.indexEntryToTxInput(entry));
      } else {
        try {
          const restored = await this.network.getUtxo(input.id);
          restoredInputs.push(restored);
        } catch (e) {
          throw new Error(
            `Could not restore input ${utxoId}: ${e.message || e}`
          );
        }
      }
    }
    return restoredInputs;
  }
  // =========================================================================
  // REQT/50zkk5xgrx: Public Query API Methods
  // =========================================================================
  /**
   * Converts a UtxoIndexEntry back to a Helios TxInput.
   * This is the inverse of txOutputToIndexEntry.
   *
   * REQT/nqemw2gvm2 (restoreTxInput Method) - async to support script fetching
   */
  async indexEntryToTxInput(entry) {
    const [txHash, indexStr] = entry.utxoId.split("#");
    const outputIndex = parseInt(indexStr, 10);
    const txId = makeTxId(txHash);
    const txOutputId = makeTxOutputId(txId, outputIndex);
    const assets = entry.tokens.map((t) => [
      makeAssetClass(
        makeMintingPolicyHash(t.policyId),
        hexToBytes(t.tokenName)
      ),
      t.quantity
    ]);
    const value = makeValue(entry.lovelace, assets);
    let datum = void 0;
    if (entry.inlineDatum) {
      const uplcData = decodeUplcData(hexToBytes(entry.inlineDatum));
      datum = makeInlineTxOutputDatum(uplcData);
    } else if (entry.datumHash) {
      const datumHash = makeDatumHash(entry.datumHash);
      datum = makeHashedTxOutputDatum(datumHash);
    }
    let refScript = void 0;
    if (entry.referenceScriptHash) {
      refScript = await this.fetchAndCacheScript(
        entry.referenceScriptHash
      );
    }
    const address = makeAddress(entry.address);
    const txOutput = makeTxOutput(address, value, datum, refScript);
    return makeTxInput(txOutputId, txOutput);
  }
  /**
   * Retrieves a UTXO by its output ID.
   * Implements ReadonlyCardanoClient.getUtxo
   *
   * REQT/gt3ux9v2kp (getUtxo Method)
   */
  async getUtxo(id) {
    await this.syncReady;
    const utxoId = id.toString();
    const entry = await this.store.findUtxoId(utxoId);
    if (entry) {
      return await this.indexEntryToTxInput(entry);
    }
    return this.network.getUtxo(id);
  }
  /**
   * Retrieves all UTXOs at an address.
   * Implements ReadonlyCardanoClient.getUtxos
   *
   * REQT/gu4vy0w3lq (getUtxos Method)
   */
  async getUtxos(address) {
    await this.syncReady;
    const addrStr = this.addressToBech32(address);
    await this.syncWalletAddressIfStale(addrStr);
    const entries = await this.store.findUtxosByAddress(addrStr);
    if (entries.length > 0) {
      return Promise.all(entries.map((e) => this.indexEntryToTxInput(e)));
    }
    return this.network.getUtxos(address);
  }
  /**
   * Retrieves UTXOs at an address containing a specific asset class.
   * Implements ReadonlyCardanoClient.getUtxosWithAssetClass
   *
   * REQT/gv5wz1x4mr (getUtxosWithAssetClass Method)
   *
   * @throws Error if address is not the Capo address or a delegate-policy address
   */
  async getUtxosWithAssetClass(address, assetClass) {
    await this.syncReady;
    const addrStr = this.addressToBech32(address);
    const policyId = assetClass.mph.toHex();
    const tokenName = assetClass.tokenName.toString();
    const entries = await this.store.findUtxosByAsset(policyId, tokenName);
    const filtered = entries.filter((e) => e.address === addrStr);
    if (filtered.length > 0) {
      return Promise.all(
        filtered.map((e) => this.indexEntryToTxInput(e))
      );
    }
    if (this.network.getUtxosWithAssetClass) {
      return this.network.getUtxosWithAssetClass(address, assetClass);
    }
    const allUtxos = await this.network.getUtxos(address);
    const minAssetValue = makeValue(
      assetClass.mph,
      assetClass.tokenName,
      1n
    );
    return allUtxos.filter((u) => u.value.isGreaterOrEqual(minAssetValue));
  }
  /**
   * Finds a UTXO containing a specific UUT by its name.
   *
   * REQT/50zkk5xgrx (Query API Methods)
   */
  async findUtxoByUUT(uutId) {
    await this.syncReady;
    return this.store.findUtxoByUUT(uutId);
  }
  /**
   * Finds all UTXOs containing a specific asset (by policy ID and optional token name).
   *
   * REQT/50zkk5xgrx (Query API Methods)
   */
  async findUtxosByAsset(policyId, tokenName, options) {
    await this.syncReady;
    return this.store.findUtxosByAsset(policyId, tokenName, options);
  }
  /**
   * Finds all UTXOs at a specific address.
   *
   * REQT/50zkk5xgrx (Query API Methods)
   */
  async findUtxosByAddress(address, options) {
    await this.syncReady;
    return this.store.findUtxosByAddress(address, options);
  }
  /**
   * Returns all indexed UTXOs with optional pagination.
   *
   * REQT/50zkk5xgrx (Query API Methods)
   */
  async getAllUtxos(options) {
    await this.syncReady;
    return this.store.getAllUtxos(options);
  }
}

export { CapoDataBridge as C, EnumBridge as E, JustAnEnum as J, Nested as N, NotNested as a, CachedUtxoIndex as b, debugBox as d, isDatum as i };
//# sourceMappingURL=CachedUtxoIndex.mjs.map
