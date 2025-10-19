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
export const capoConfigurationDetails : CapoDeployedDetails<"native"> = Object.freeze({
    capo: undefined,
    //@ts-ignore - this is simply for nosy developers who may be looking under the hoold
    isConfigPlaceholder: true,
    // in real life, this is replaced by a real deployment configuration in the stellar rollup plugin
});
