//@ts-nocheck

//! this file implements a workaround for a problem
//  ... where a second imported .hl file in a single .ts file
//  ... causes the dts rollup plugin to not find the second .hl file
import { HeliosModuleSrc } from "../../src/HeliosModuleSrc.js";
import heliosModuleInfo from "./uutMintingMintDelegate.hl";

export const uutMintingMintDelegate = HeliosModuleSrc.parseFromOptions(heliosModuleInfo);
