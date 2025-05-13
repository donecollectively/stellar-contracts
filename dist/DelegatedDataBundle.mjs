import { CapoDelegateBundle } from './CapoDelegateHeliosBundle.mjs';
import '@helios-lang/compiler-utils';
import './HeliosScriptBundle.mjs';
import '@helios-lang/uplc';
import '@donecollectively/stellar-contracts/HeliosProgramWithCacheAPI';
import '@helios-lang/compiler';
import '@helios-lang/codec-utils';
import '@helios-lang/crypto';
import '@helios-lang/contract-utils';
import '@helios-lang/ledger';
import '@helios-lang/tx-utils';
import 'nanoid';
import './environment.mjs';
import './DefaultCapo.mjs';
import './BasicDelegate.mjs';

class DelegatedDataBundle extends CapoDelegateBundle {
  scriptParamsSource = "bundle";
  get params() {
    return {
      rev: this.rev,
      delegateName: this.moduleName,
      isMintDelegate: false,
      isSpendDelegate: false,
      isDgDataPolicy: true,
      requiresGovAuthority: this.requiresGovAuthority
    };
  }
}

export { DelegatedDataBundle };
//# sourceMappingURL=DelegatedDataBundle.mjs.map
