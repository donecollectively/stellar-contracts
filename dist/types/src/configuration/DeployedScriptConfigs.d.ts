/**
 * Provides a registry for script configurations that are deployed to the
 * on-chain enviorment.
 * @remarks
 *
 */
import type { CapoConfig } from "../CapoTypes.js";
import type { PrecompiledProgramJSON } from "../helios/CachedHeliosProgram.js";
import type { configBaseWithRev } from "../StellarContract.js";
import type { minimalDelegateConfig } from "../delegation/RolesAndDelegates.js";
import type { BasicMinterParams } from "../minting/CapoMinter.js";
/**
 * type-safe factory function for creating a registry of scripts with their
 * deployment details for the on-chain environment
 * @remarks
 * use this in your Capo bundle's `config()` function
 *
 * The registry is indexed by each script's moduleName, and contains a list of
 * deployed configurations for that script, with configuration details,
 * on-chain script hash, and program CBOR.
 * @public
 */
export declare function mkDeployedScriptConfigs(x: AllDeployedScriptConfigs): AllDeployedScriptConfigs;
/**
 * type-safe factory function for creating a Capo deployment details object
 * with details of its scripts deployed to the on-chain environment
 * @remarks
 * use this to make your Capo bundle's deployedDetails attribute.
 * @public
 */
export declare function mkCapoDeployment({ capo, }: Required<CapoDeployedDetails<"json">>): {
    capo: DeployedScriptDetails<CapoConfig, "native">;
};
/**
 * @public
 */
type DelegateDeployment = {
    config: minimalDelegateConfig;
    scriptHash: string;
    programBundle?: PrecompiledProgramJSON;
};
/**
 * type-safe factory function for creating a Delegate deployment details object
 * @public
 */
export declare function mkDelegateDeployment(ddd: DelegateDeployment): DelegateDeployment;
/**
 * @public
 */
export type CapoDeployedDetails<form extends "json" | "native" = "native"> = {
    capo?: DeployedScriptDetails<CapoConfig, form>;
    minter?: DeployedScriptDetails<BasicMinterParams, form>;
};
/**
 * @public
 */
export type AllDeployedScriptConfigs = {
    [scriptModuleName: string]: ScriptDeployments;
};
/**
 * @public
 */
type DeployedConfigWithVariants = {
    [name: string]: DeployedScriptDetails;
} & {
    singleton?: never;
};
/**
 * @public
 */
type DeployedSingletonConfig<CT extends configBaseWithRev = configBaseWithRev> = {
    singleton: DeployedScriptDetails<CT>;
};
/**
 * @public
 */
export type ScriptDeployments = DeployedSingletonConfig | DeployedConfigWithVariants;
/**
 * @public
 */
export type DeployedScriptDetails<CT extends configBaseWithRev = configBaseWithRev, form extends "json" | "native" = "native"> = {
    config: form extends "json" ? any : CT;
    scriptHash?: number[];
    programName?: string;
};
/**
 * @public
 */
export type CapoConfigJSON = {
    mph: {
        bytes: string;
    };
    rev: bigint;
    seedTxn?: {
        bytes: string;
    };
    seedIndex: bigint;
    rootCapoScriptHash: {
        bytes: string;
    };
};
/**
 * parses details needed for a Capo and its related minter to be instantiated
 * @public
 */
export declare function parseCapoJSONConfig(rawJsonConfig: CapoConfigJSON | string): CapoConfig;
/**
 * parses details needed for a Capo minter to be instantiated
 * @public
 */
export declare function parseCapoMinterJSONConfig(rawJSONConfig: Pick<CapoConfigJSON, "seedTxn" | "seedIndex">): {
    seedTxn: import("@helios-lang/ledger").TxId;
    seedIndex: bigint;
};
export {};
//# sourceMappingURL=DeployedScriptConfigs.d.ts.map