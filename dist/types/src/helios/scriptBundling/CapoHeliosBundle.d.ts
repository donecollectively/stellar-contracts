import type { Source } from "@helios-lang/compiler-utils";
import { HeliosScriptBundle } from "./HeliosScriptBundle.js";
import type { StellarBundleSetupDetails } from "../../StellarContract.js";
import type { AbstractNew } from "../typeUtils.js";
import { type CapoDeployedDetails } from "../../configuration/DeployedScriptConfigs.js";
import type { capoConfigurationDetails } from "../../configuration/DefaultNullCapoDeploymentConfig.js";
import type { PrecompiledProgramJSON } from "../CachedHeliosProgram.js";
export type CapoHeliosBundleClass = AbstractNew<CapoHeliosBundle>;
/**
 * A set of Helios scripts that are used to define a Capo contract.
 * @remarks
 * This class is intended to be extended to provide a specific Capo contract.
 *
 * You can inherit & augment `get sharedModules()` to make additional
 * helios modules available for use in related contract scripts.  Other
 * bundles can include these modules only by naming them in their
 * own `includeFromCapoModules()` method.
 * @public
 */
export declare class CapoHeliosBundle extends HeliosScriptBundle {
    preConfigured?: typeof capoConfigurationDetails;
    precompiledScriptDetails?: CapoDeployedDetails<any>;
    scriptParamsSource: "config";
    requiresGovAuthority: boolean;
    get hasAnyVariant(): boolean;
    parseCapoJSONConfig(config: any): import("../../CapoTypes.js").CapoConfig;
    parseCapoMinterJSONConfig(config: any): {
        seedTxn: import("@helios-lang/ledger").TxId;
        seedIndex: bigint;
    };
    init(setupDetails: StellarBundleSetupDetails<any>): void;
    initProgramDetails(): void;
    get isPrecompiled(): boolean;
    loadPrecompiledScript(): Promise<PrecompiledProgramJSON>;
    loadPrecompiledMinterScript(): Promise<PrecompiledProgramJSON>;
    getPreCompiledBundle(variant: string): any;
    get main(): Source;
    getPreconfiguredUplcParams(variantName: string): import("../../StellarContract.js").UplcRecord<any> | undefined;
    get params(): any;
    datumTypeName: string;
    capoBundle: this;
    get scriptConfigs(): void;
    get bridgeClassName(): string;
    static isCapoBundle: boolean;
    /**
     * returns only the modules needed for the Capo contract
     * @remarks
     * overrides the base class's logic that references a connected
     * Capo bundle - that policy is not needed here because this IS
     * the Capo bundle.
     */
    getEffectiveModuleList(): Source[];
    /**
     * indicates a list of modules available for inclusion in Capo-connected scripts
     * @remarks
     * Subclasses can implement this method to provide additional modules
     * shareable to various Capo-connected scripts; those scripts need to
     * include the modules by name in their `includeFromCapoModules()` method.
     *
     * See the
     */
    get sharedModules(): Source[];
    get modules(): Source[];
}
//# sourceMappingURL=CapoHeliosBundle.d.ts.map