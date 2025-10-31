import type { LoadResult, PluginContext, ResolveIdResult } from "rollup";
/**
 * Rollup loader for Helios source files
 * @public
 **/
export declare function heliosRollupLoader(opts?: {
    include?: string;
    exclude?: string[];
    project?: string;
    resolve?: string | false | null;
    onHeliosSource?: (heliosSourceId: string) => void;
}): {
    name: string;
    resolveId: (this: PluginContext, source: string, importer: string | undefined, options: any) => ResolveIdResult;
    load(this: PluginContext, id: string): LoadResult;
};
//# sourceMappingURL=heliosRollupLoader.d.ts.map