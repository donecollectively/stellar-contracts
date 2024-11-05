
import { CapoDelegateBundle } from "../delegation/CapoDelegateBundle.js"
import TesterPolicy from "./DelegatedDatumTester.hl"

export default class DelegatedDatumTesterBundle extends CapoDelegateBundle {
    get specializedDelegateModule() {
        return TesterPolicy
    }
}
