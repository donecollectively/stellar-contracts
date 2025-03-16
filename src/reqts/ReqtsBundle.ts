import { DelegatedDataBundle } from "../helios/scriptBundling/DelegatedDataBundle.js"
import type { Source } from "@helios-lang/compiler-utils";
import ReqtsPolicy from "./ReqtsPolicy.hl"
import ReqtsData from "./ReqtsData.hl"

// this bundle expresses an abstract bundle for its underlying helios code,
// without manifesting a concrete bundle that requires compilation.
// for our tests of this, there (TODO) WILL BE a test-time subclass in an 
// .hlb.* defined for that particular purpose, which imports a specific
// Capo bundle satisfying the specificity requirement.
//
// The current (draft) version of that requirements module does not require
// any specialization code that would be "dependency injected" by the Capo's 
// bundle, but it would be fine for it to do that.

export abstract class ReqtsBundle extends DelegatedDataBundle {
    specializedDelegateModule = ReqtsPolicy;
    
    get modules(): Source[] {
        return [
            ...super.modules,
            ReqtsData
        ]
    }
}
