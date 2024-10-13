//@ts-nocheck

//! this file implements a workaround for a problem
//  ... where a second imported .hl file in a single .ts file
//  ... causes the dts rollup plugin to not find the second .hl file
import heliosModuleInfo from "./TypeMapMetadata.hl";
import { HeliosModuleSrc } from "./helios/HeliosModuleSrc.js";

export const TypeMapMetadata = HeliosModuleSrc.parseFromOptions(heliosModuleInfo);
