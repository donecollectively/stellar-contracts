import type { Source } from "@helios-lang/compiler-utils";
import { CapoDelegateBundle } from "../helios/scriptBundling/CapoDelegateBundle.js"
import ReqtsPolicy from "./ReqtsPolicy.hl"
import ReqtsData from "./ReqtsData.hl"
import { CapoHeliosBundle } from "../helios/scriptBundling/CapoHeliosBundle.js"
import { ReqtsBundle } from "./ReqtsBundle.js"

// todo: more specific base class?

/**
 * This concrete bundle for Reqts presumes use in a basic Capo bundle,
 * and provides type-generation for the Reqts module.  It can be used as is
 * if you have no separate Capo or need to share the ReqtsData types with
 * other scripts in your smart contract.
 */
export default class ReqtsConcreteBundle extends ReqtsBundle.usingCapoBundleClass(CapoHeliosBundle) {
    specializedDelegateModule = ReqtsPolicy;
}
