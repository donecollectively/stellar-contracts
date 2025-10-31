import type { Source } from "@helios-lang/compiler-utils";
import { CapoHeliosBundle } from "../helios/scriptBundling/CapoHeliosBundle.js";
import type { StellarBundleSetupDetails } from "../StellarContract.js";
declare const CapoMinterBundle_base: import("../helios/HeliosMetaTypes.js").HeliosBundleClassWithCapo;
/**
 * for the special Capo minter; makes the Capo's modules available
 * to the minter for imports
 **/
export declare class CapoMinterBundle extends CapoMinterBundle_base {
    scriptParamsSource: "config" | "bundle";
    requiresGovAuthority: boolean;
    static needsSpecializedDelegateModule: boolean;
    static needsCapoConfiguration: boolean;
    capoBundle: CapoHeliosBundle;
    get rev(): bigint;
    get params(): {
        rev: bigint;
        seedTxn: import("@helios-lang/ledger").TxId;
        seedIndex: bigint;
    } | undefined;
    get main(): Source;
    loadPrecompiledVariant(variant: string): Promise<import("../helios/CachedHeliosProgram.js").PrecompiledProgramJSON>;
    init(setupDetails: StellarBundleSetupDetails<any>): void;
}
export default CapoMinterBundle;
//# sourceMappingURL=CapoMinter.hlb.d.ts.map