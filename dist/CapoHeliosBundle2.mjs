import { HeliosScriptBundle } from './HeliosBundle.mjs';
import { C as Capo_hl, a as CapoMintHelpers_hl, b as CapoDelegateHelpers_hl, S as StellarHeliosHelpers_hl, c as CapoHelpers_hl, T as TypeMapMetadata_hl } from './DefaultCapo.mjs';
import { makeMintingPolicyHash, makeTxId, makeValidatorHash } from '@helios-lang/ledger';

function mkDeployedScriptConfigs(x) {
  return x;
}
function mkCapoDeployment({
  capo
}) {
  const {
    config
    // programBundle
  } = capo;
  return {
    // scripts,
    capo: {
      config: parseCapoJSONConfig(config)
    }
  };
}
function mkDelegateDeployment(ddd) {
  return ddd;
}
function parseCapoJSONConfig(rawJsonConfig) {
  const jsonConfig = typeof rawJsonConfig === "string" ? JSON.parse(rawJsonConfig) : rawJsonConfig;
  const { mph, rev, seedTxn, seedIndex, rootCapoScriptHash } = jsonConfig;
  const outputConfig = {};
  if (!mph) throw new Error("mph is required");
  if (!seedTxn) throw new Error("seedTxn is required");
  if (!seedIndex) throw new Error("seedIndex is required");
  if (!rootCapoScriptHash) throw new Error("rootCapoScriptHash is required");
  outputConfig.mph = makeMintingPolicyHash(mph.bytes);
  outputConfig.rev = BigInt(rev || 1);
  outputConfig.seedTxn = makeTxId(seedTxn.bytes);
  outputConfig.seedIndex = BigInt(seedIndex);
  outputConfig.rootCapoScriptHash = makeValidatorHash(
    rootCapoScriptHash.bytes
  );
  return outputConfig;
}
function parseCapoMinterJSONConfig(rawJSONConfig) {
  const { seedTxn, seedIndex } = rawJSONConfig;
  if (!seedTxn) throw new Error("seedTxn is required");
  if (!seedIndex) throw new Error("seedIndex is required");
  return {
    seedTxn: makeTxId(seedTxn.bytes),
    seedIndex: BigInt(seedIndex)
  };
}

class CapoHeliosBundle extends HeliosScriptBundle {
  preConfigured;
  precompiledScriptDetails = { capo: void 0 };
  scriptParamsSource = "config";
  requiresGovAuthority = true;
  get hasAnyVariant() {
    if (this.preConfigured?.capo?.config) return true;
    throw new Error("can we live without configuredUplcParams before accessing program?");
  }
  parseCapoJSONConfig(config) {
    return parseCapoJSONConfig(config);
  }
  parseCapoMinterJSONConfig(config) {
    return parseCapoMinterJSONConfig(config);
  }
  init(setupDetails) {
    const { setup } = setupDetails;
    let deployedDetails;
    if (this.precompiledScriptDetails?.capo) {
      this.configuredScriptDetails = deployedDetails = this.precompiledScriptDetails.capo;
      const {
        config
        // programBundle
      } = deployedDetails;
      this.configuredParams = config;
      this._selectedVariant = "capo";
    } else if (setupDetails.deployedDetails) {
      this.configuredScriptDetails = deployedDetails = setupDetails.deployedDetails;
    } else if (!this.configuredScriptDetails) {
      console.warn(`no script details configured for ${this.constructor.name} (dbpa)`);
    }
    this._didInit = true;
  }
  initProgramDetails() {
    const { configuredScriptDetails } = this;
    const hasParams = configuredScriptDetails?.config || this.setupDetails.params;
    const uplcParams = hasParams ? this.paramsToUplc(hasParams) : void 0;
    if (hasParams) {
      this.configuredParams = hasParams;
      this.configuredUplcParams = uplcParams;
    }
  }
  get isPrecompiled() {
    const t = super.isPrecompiled;
    const hasScriptHash = !!this.precompiledScriptDetails?.capo?.scriptHash;
    if (t !== hasScriptHash) {
      debugger;
      throw new Error("surprise! this code path is used: isPrecompiled() - precompiledScriptDetails mismatch (dbpa)");
    }
    return t;
  }
  async loadPrecompiledScript() {
    throw new Error("capo on-chain bundle is not precompiled");
  }
  async loadPrecompiledMinterScript() {
    throw new Error("capo minter on-chain bundle is not precompiled");
  }
  getPreCompiledBundle(variant) {
    throw new Error("deprecated");
  }
  get main() {
    return Capo_hl;
  }
  getPreconfiguredUplcParams(variantName) {
    if (!this.preConfigured?.capo?.config) {
      return void 0;
    }
    return super.getPreconfiguredUplcParams(variantName);
  }
  get params() {
    if (this.configuredParams) {
      return this.configuredParams;
    }
  }
  datumTypeName = "CapoDatum";
  capoBundle = this;
  // ???
  get scriptConfigs() {
    throw new Error(`scriptConfigs - do something else instead`);
  }
  get bridgeClassName() {
    if (this.constructor === CapoHeliosBundle) {
      return "CapoDataBridge";
    }
    return this.constructor.name.replace("Helios", "").replace("Bundle", "") + "Bridge";
  }
  static isCapoBundle = true;
  /**
   * returns only the modules needed for the Capo contract
   * @remarks
   * overrides the base class's logic that references a connected
   * Capo bundle - that policy is not needed here because this IS
   * the Capo bundle.
   */
  getEffectiveModuleList() {
    return this.modules;
  }
  /**
   * indicates a list of modules available for inclusion in Capo-connected scripts
   * @remarks
   * Subclasses can implement this method to provide additional modules
   * shareable to various Capo-connected scripts; those scripts need to
   * include the modules by name in their `includeFromCapoModules()` method.
   *
   * See the
   */
  get sharedModules() {
    return [];
  }
  get modules() {
    return [
      CapoMintHelpers_hl,
      CapoDelegateHelpers_hl,
      StellarHeliosHelpers_hl,
      CapoHelpers_hl,
      TypeMapMetadata_hl
    ];
  }
}

export { CapoHeliosBundle as C, mkCapoDeployment as a, mkDelegateDeployment as b, parseCapoMinterJSONConfig as c, mkDeployedScriptConfigs as m, parseCapoJSONConfig as p };
//# sourceMappingURL=CapoHeliosBundle2.mjs.map
