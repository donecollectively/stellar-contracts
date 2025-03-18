declare module "*.hl" {
    import type { Source } from "@helios-lang/compiler-utils";

    const value: Source;
    export default value;
}

/**
 * this file ONLY needs a declaration for *.hl files.
 * 
 * hlb.ts, hlBundled.mjs and bridge.ts and typeInfo.ts are just
 * regular typescript files and don't need any special handling.
 */
