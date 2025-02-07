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
import type { capoDelegateConfig, minimalDelegateConfig } from "../delegation/RolesAndDelegates.js";

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
export function mkCapoDeployment({
    capo,
    // scripts,
}: Required<CapoDeployedDetails<"json">>) {
    const { config, programBundle } = capo;
    return {
        capo: {
            config: parseCapoJSONConfig(config),
        } as DeployedScriptDetails<CapoConfig, "native">,
    };
}

/**
 * @public
 */
type DelegateDeployment = {
    config: minimalDelegateConfig;
    scriptHash: string;
    programBundle?: DeployedProgramBundle;
}

/**
 * type-safe factory function for creating a Delegate deployment details object
 * @public
 */
export function mkDelegateDeployment(
    ddd: DelegateDeployment
) : DelegateDeployment {
    return ddd;
}

/**
 * @public
 */
export type CapoDeployedDetails<form extends "json" | "native" = "native"> = {
    capo?: DeployedScriptDetails<CapoConfig, form>;
    isNullDeployment?: boolean;
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
type DeployedSingletonConfig<
    CT extends configBaseWithRev = configBaseWithRev
> = {
    singleton: DeployedScriptDetails<CT>;
};

/**
 * @public
 */
export type ScriptDeployments =
    | DeployedSingletonConfig
    | DeployedConfigWithVariants;

/**
 * @public
 */
export type DeployedScriptDetails<
    CT extends configBaseWithRev = configBaseWithRev,
    form extends "json" | "native" = "native"
> =
    | {
          config: form extends "json" ? any : CT;
          scriptHash?: string;
          programBundle?: DeployedProgramBundle;
      }
    | {
          config: CT;
          scriptHash: string;
          programBundle: DeployedProgramBundle;
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
