//@ts-nocheck

//! this file implements a workaround for a problem
//  ... where a second imported .hl file in a single .ts file
//  ... causes the dts rollup plugin to not find the second .hl file
import heliosModuleInfo from "./StellarHeliosHelpers.hl";
import { HeliosModuleSrc } from "./HeliosModuleSrc.js";

export const StellarHeliosHelpers = HeliosModuleSrc.parseFromOptions(heliosModuleInfo);
