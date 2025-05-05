import { LoadResult } from 'rollup';
import { PluginContext } from 'rollup';
import { ResolvedId } from 'rollup';
import type { ResolveIdResult } from 'rollup';
import { SourceMap } from 'magic-string';

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
        handler(this: PluginContext, source: any, importer: any, options: any): Promise<string | ResolvedId | null>;
    };
    load: {
        order: string;
        handler: (this: PluginContext, id: string) => Promise<LoadResult>;
    };
    transform: {
        order: string;
        handler: (this: PluginContext, code: string, id: string) => Promise<{
            code: string;
            map: SourceMap;
        } | null | undefined> | null | undefined;
    };
};

/**
 * Rollup loader for Helios source files
 * @public
 **/
export declare function heliosRollupLoader(opts?: {
    include?: string;
    exclude?: string[];
    project?: string;
    resolve?: string | false | null;
}): {
    name: string;
    resolveId: (this: PluginContext, source: string, importer: string | undefined, options: any) => ResolveIdResult;
    load(this: PluginContext, id: string): LoadResult;
};

export { }
