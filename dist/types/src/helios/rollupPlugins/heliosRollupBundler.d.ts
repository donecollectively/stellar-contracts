import { type PartialResolvedId, type LoadResult, type PluginContext } from "rollup";
/**
 * Rollup loader for generating typescript types from Helios source files
 * @remarks
 * This rollup plugin is designed to be used in a rollup configuration
 * to generate typescript types from Helios source files.
 *
 * The plugin is designed to be used in conjunction with the helios rollup loader,
 * which compiles the helios source files into javascript.
 *
 * The following Rollup build hooks are used to make it all happen:
 * - resolveId: this hook is used to intercept the import of the helios bundle files, and use the
 *   project to generate updated types if needed and available.
 * @public
 **/
export declare function heliosRollupBundler(opts?: {
    include?: string;
    exclude?: string[];
    project?: string;
    vite?: boolean;
    emitBundled?: boolean;
    compile?: boolean;
    exportPrefix?: string;
}): {
    name: string;
    buildEnd: {
        order: string;
        handler(this: PluginContext, error?: Error): void;
    };
    resolveId: {
        order: string;
        handler: (this: PluginContext, source: string, importer: string, options: any) => Promise<string | PartialResolvedId | null>;
    };
    load: {
        order: string;
        handler: (this: PluginContext, id: string) => Promise<LoadResult>;
    };
    watchChange: {
        order: string;
        handler: (this: PluginContext, id: string, change: {
            event: "create" | "update" | "delete";
        }) => Promise<void>;
    };
    shouldTransformCachedModule: {
        handler: (this: PluginContext, id: string) => boolean;
    };
    transform: {
        order: string;
        handler: (this: PluginContext, code: string, id: string) => Promise<{
            code: string;
            map: import("magic-string").SourceMap;
        } | null | undefined> | null | undefined;
    };
};
//# sourceMappingURL=heliosRollupBundler.d.ts.map