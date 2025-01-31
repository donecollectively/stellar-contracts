
import { 
    CapoHeliosBundle,
    CapoDelegateBundle
 } from "@donecollectively/stellar-contracts"

 import TesterPolicy from "./DelegatedDatumTester.hl"

// this bundle is used explicitly and only within the context of
// ... the test-environment "CapoCanMintGenericUuts"


export default class DelegatedDatumTesterBundle 
extends CapoDelegateBundle.usingCapoBundleClass(CapoHeliosBundle){
    get specializedDelegateModule() {
        return TesterPolicy
    }
}

