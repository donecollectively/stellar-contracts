import { makeCast } from '@helios-lang/contract-utils';
import { makeInlineTxOutputDatum } from '@helios-lang/ledger';
import { O as DataBridge, C as ContractDataBridge, D as DataBridgeReaderClass, i as impliedSeedActivityMaker } from './DataBridge.mjs';
import { bytesToHex } from '@helios-lang/codec-utils';

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

var CapoHeliosBundle_bridge = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ActivityDelegateRoleHelperNested: ActivityDelegateRoleHelperNested,
    AnyDataSchema: AnyDataSchema,
    CapoActivityHelper: CapoActivityHelper,
    CapoActivitySchema: CapoActivitySchema,
    CapoDataBridge: CapoDataBridge,
    CapoDataBridgeReader: CapoDataBridgeReader,
    CapoDatumHelper: CapoDatumHelper,
    CapoDatumSchema: CapoDatumSchema,
    CapoLifecycleActivityHelper: CapoLifecycleActivityHelper,
    CapoLifecycleActivityHelperNested: CapoLifecycleActivityHelperNested,
    CapoLifecycleActivitySchema: CapoLifecycleActivitySchema,
    CapoManifestEntrySchema: CapoManifestEntrySchema,
    DelegateRoleHelper: DelegateRoleHelper,
    DelegateRoleHelperNested: DelegateRoleHelperNested,
    DelegateRoleSchema: DelegateRoleSchema,
    ManifestActivityHelper: ManifestActivityHelper,
    ManifestActivityHelperNested: ManifestActivityHelperNested,
    ManifestActivitySchema: ManifestActivitySchema,
    ManifestEntryTypeHelper: ManifestEntryTypeHelper,
    ManifestEntryTypeSchema: ManifestEntryTypeSchema,
    PendingCharterChangeHelper: PendingCharterChangeHelper,
    PendingCharterChangeSchema: PendingCharterChangeSchema,
    PendingDelegateActionHelper: PendingDelegateActionHelper,
    PendingDelegateActionSchema: PendingDelegateActionSchema,
    PendingDelegateChangeSchema: PendingDelegateChangeSchema,
    RelativeDelegateLinkSchema: RelativeDelegateLinkSchema,
    default: CapoDataBridge
});

export { CapoDataBridge as C, EnumBridge as E, JustAnEnum as J, Nested as N, NotNested as a, CapoHeliosBundle_bridge as b, isDatum as i };
//# sourceMappingURL=CapoHeliosBundle.bridge.mjs.map
