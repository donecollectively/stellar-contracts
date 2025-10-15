
import { 
    CapoHeliosBundle,
    DelegatedDataBundle
 } from "@donecollectively/stellar-contracts"

 import TesterPolicy from "./DelegatedDatumTester.hl"

// this bundle is used explicitly and only within the context of
// ... the test-environment "CapoCanMintGenericUuts"


export class DelegatedDatumTesterBundle 
extends DelegatedDataBundle.usingCapoBundleClass(CapoHeliosBundle){
    specializedDelegateModule = TesterPolicy
    scriptParamsSource = "config" as const

    requiresGovAuthority = true
    
}

export default DelegatedDatumTesterBundle;