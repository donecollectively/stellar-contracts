
import { CapoHeliosBundle } from "../CapoHeliosBundle.js"
import { CapoDelegateBundle } from "../delegation/CapoDelegateBundle.js"
import TesterPolicy from "./DelegatedDatumTester.hl"

// this bundle is used explicitly and only within the context of
// ... the test-environment "CapoCanMintGenericUuts"


export default class DelegatedDatumTesterBundle 
extends CapoDelegateBundle.usingCapoBundleClass(CapoHeliosBundle){
    get specializedDelegateModule() {
        return TesterPolicy
    }
}

