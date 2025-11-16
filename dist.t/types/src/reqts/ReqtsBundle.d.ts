import { DelegatedDataBundle } from "../helios/scriptBundling/DelegatedDataBundle.js";
import type { Source } from "@helios-lang/compiler-utils";
export declare abstract class ReqtsBundle extends DelegatedDataBundle {
    specializedDelegateModule: Source;
    get modules(): Source[];
}
//# sourceMappingURL=ReqtsBundle.d.ts.map