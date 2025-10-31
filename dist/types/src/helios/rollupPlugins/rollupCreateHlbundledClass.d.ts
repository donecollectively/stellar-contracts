import type { HeliosScriptBundle } from "../scriptBundling/HeliosScriptBundle.js";
import type { CapoHeliosBundle } from "../scriptBundling/CapoHeliosBundle.js";
export type heliosSourceFileSeenHook = (heliosSourceId: string, outputFile: string) => void;
type hlBundleOptions = {
    projectRoot: string;
    outDir: string;
    onHeliosSource?: heliosSourceFileSeenHook;
};
export declare function relativePath(id: string): string;
export declare function rollupCreateHlPrecompiledClass(inputFile: string, options: hlBundleOptions): Promise<(typeof HeliosScriptBundle & {
    hash: string;
    compileTime: number;
    afterDelay: number;
}) | (typeof CapoHeliosBundle & {
    hash: string;
    compileTime: number;
    afterDelay: number;
})>;
export type BundleClassWithLoadStats = (typeof CapoHeliosBundle | typeof HeliosScriptBundle) & {
    hash: string;
    compileTime: number;
    afterDelay: number;
};
export {};
//# sourceMappingURL=rollupCreateHlbundledClass.d.ts.map