import type { Source } from "@helios-lang/compiler-utils";
declare const ReqtsConcreteBundle_base: import("../../index.js").ConcreteCapoDelegateBundle;
/**
 * This concrete bundle for Reqts presumes use in a basic Capo bundle,
 * and provides type-generation for the Reqts module.  It can be used as is
 * if you have no separate Capo or need to share the ReqtsData types with
 * other scripts in your smart contract.
 */
export declare class ReqtsConcreteBundle extends ReqtsConcreteBundle_base {
    specializedDelegateModule: Source;
    requiresGovAuthority: boolean;
}
export default ReqtsConcreteBundle;
//# sourceMappingURL=Reqts.concrete.hlb.d.ts.map