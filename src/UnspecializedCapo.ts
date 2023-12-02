//@ts-nocheck

//! this file implements a workaround for a problem
//  ... where a second imported .hl file in a single .ts file
//  ... causes the dts rollup plugin to not find the second .hl file
import type { HeliosModuleSrc } from "./HeliosModuleSrc.js";
import basics from "./UnspecializedCapo.hl";

export const UnspecializedCapo: HeliosModuleSrc = basics;
