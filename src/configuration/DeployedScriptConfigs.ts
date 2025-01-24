/**
 * Provides a registry for script configurations that are deployed to the
 * on-chain enviorment.
 * @remarks
 *
 */

import {
    makeMintingPolicyHash,
    makeTxId,
    makeValidatorHash,
} from "@helios-lang/ledger";
import type { CapoConfig } from "../CapoTypes.js";
import type { DeployedProgramBundle } from "../helios/CachedHeliosProgram.js";
import type { configBaseWithRev } from "../StellarContract.js";

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
export function mkDeployedScriptConfigs(x: AllDeployedScriptConfigs) {
    return x;
}
/**
 * type-safe factory function for creating a Capo deployment details object
 * with details of its scripts deployed to the on-chain environment
 * @remarks
 * use this to make your Capo bundle's deployedDetails attribute.
 * @public
 */
export function mkCapoDeploymentJSON({
    capo,
    scripts,
}: CapoDeployedDetails<"json">) {
    const { config, hash, programBundle } = capo;
    return {
        scripts,
        capo: {
            config: parseCapoJSONConfig(config),
            hash, programBundle
        } as DeployedScriptDetails<CapoConfig, "native">,
    };
}
export type CapoDeployedDetails<form extends "json" | "native" = "native"> = {
    capo: DeployedScriptDetails<CapoConfig, form>;
    scripts: AllDeployedScriptConfigs & {
        mintDgt: DeployedSingletonConfig;
        spendDgt?: DeployedSingletonConfig;
        settings?: DeployedSingletonConfig;

    };
};

export type AllDeployedScriptConfigs = {
    [scriptModuleName: string]: ScriptDeployments;
};

type DeployedConfigWithVariants = {
    [name: string]: DeployedScriptDetails;
} & {
    singleton?: never;
};

type DeployedSingletonConfig = {
    singleton: DeployedScriptDetails;
};

export type ScriptDeployments =
    | DeployedSingletonConfig
    | DeployedConfigWithVariants;

export type DeployedScriptDetails<
    CT extends configBaseWithRev = configBaseWithRev,
    form extends "json" | "native" = "native"
> =
    | {
          config: form extends "json" ? any : CT;
          hash?: string;
          programBundle?: DeployedProgramBundle;
      }
    | {
          config: CT;
          hash: string;
          programBundle: DeployedProgramBundle;
      };
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
export function parseCapoJSONConfig(rawJsonConfig: CapoConfigJSON | string) {
    const jsonConfig =
        typeof rawJsonConfig === "string"
            ? (JSON.parse(rawJsonConfig) as CapoConfigJSON)
            : rawJsonConfig;

    const { mph, rev, seedTxn, seedIndex, rootCapoScriptHash } = jsonConfig;

    const outputConfig: any = {};
    if (!mph) throw new Error("mph is required");
    if (!seedTxn) throw new Error("seedTxn is required");
    if (!seedIndex) throw new Error("seedIndex is required");
    if (!rootCapoScriptHash) throw new Error("rootCapoScriptHash is required");

    outputConfig.mph = makeMintingPolicyHash(mph.bytes);
    outputConfig.rev = BigInt(rev || 1);
    outputConfig.seedTxn = makeTxId(seedTxn.bytes);
    outputConfig.seedIndex = BigInt(seedIndex);
    outputConfig.rootCapoScriptHash = makeValidatorHash(
        rootCapoScriptHash.bytes
    );

    return outputConfig as CapoConfig;
}
