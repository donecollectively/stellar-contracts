import type { CapoDeployedDetails } from "./DeployedScriptConfigs.js";
/**
 * default null-deployment
 * @remarks
 * Provides a default configuration to hold the place of a real
 * Capo deployment.
 *
 * This serves to provide a resolution for the \`currentCapoConfig\` import,
 * being bundled to dist/currentCapoConfig.mjs.
 *
 * This also serves during the heliosRollupBundler's
 * type- and bridge-code generation activities, which are independent
 * of the actual deployment environment.
 * @public
 */
export declare const capoConfigurationDetails: CapoDeployedDetails<"native">;
//# sourceMappingURL=DefaultNullCapoDeploymentConfig.d.ts.map