import { readFileSync } from "fs";
import path from "path";

import { createFilter } from "rollup-pluginutils";
import type { LoadResult, PluginContext, ResolveIdResult } from "rollup";

/**
 * Rollup loader for Helios source files
 * @public
 **/
export function heliosRollupLoader(
    opts: {
        include?: string;
        exclude?: string[];
        project?: string;
        resolve?: string | false | null;
        onHeliosSource?: (heliosSourceId: string) => void;
    } = {}
) {
    const filterOpts = {
        ...{
            include: ["*.hl", "**/*.hl"],
            exclude: [],
            project: ""
        },
        ...opts,
    };
    if (!filterOpts.include) {
        throw Error("missing required 'include' option for helios loader");
    }

    const filter = createFilter(
        filterOpts.include || ["*.hl", "**/*.hl"],
        filterOpts.exclude,
        {
            resolve: filterOpts.resolve,
        }
    );
    const project = filterOpts.project ? `${filterOpts.project}` : "";

    type Loader = {
        code: string;
        map: { mappings: string };
    };
    let esbuildApi;
    function resolveId(this: PluginContext, source: string, importer: string | undefined, options: any) {
        // the source is a relative path name
        // the importer is an a fully resolved id of the imported module
        const where = new Error(`here!`).stack;
        if (!filter(source)) {
            // console.log(`resolver1: resolving ${source} for ${importer}`, 
            //     //where
            // );
            // } else {
            // if (source.match(/\.hl$/))
            // console.log(
            //     `resolver1: skipping ${source} due to filter mismatch`
            //     // filterOpts.include
            // );
            return null;
        }
        // this.addWatchFile(source);

        return {
            id: source,            
        } as ResolveIdResult;
    };
    return {
        name: "helios",
        resolveId, // the resolver hook from above

        
        load(this: PluginContext, id: string): LoadResult {
            if (filter(id)) {
                const relPath = path.relative(".", id);
                // this.warn(`.hl watch: ${id}`);

                // when this loader is used within a nested self-compilation of a helios bundle,
                // this hook informs the caller in the top-level Rollup instance about the presence 
                // of a dependency file.  See rollupCreateHlbundledClass.ts 
                // Not needed for general use in the top-level rollup config.
                if (opts.onHeliosSource) {
                    opts.onHeliosSource(id);
                }
                const content = readFileSync(relPath, "utf-8");
                // console.warn(
                //     `heliosLoader: ${relPath}`
                // );

                // helios.Program.new(content) // fails unless it can resolve deps

                // todo: use Helios' logic for this
                const [_, purpose, moduleName] =
                    content.match(
                        /(module|minting|spending|endpoint)\s+([a-zA-Z0-9]+)/m
                    ) || [];

                if (!(purpose && moduleName))
                    throw new Error(`Bad format for helios file ${id}`);

                const code =
                    `import { makeSource } from "@helios-lang/compiler-utils";\n`+
                    `const ${moduleName}_hl = makeSource(\n` +
                    `  ${JSON.stringify(content)}, {\n` +
                    // `  srcFile: ${JSON.stringify(relPath)},\n`+
                    `    project: ${JSON.stringify(project)},\n` +
                    `    purpose: ${JSON.stringify(purpose)},\n` +
                    `    name:  ${JSON.stringify(
                        relPath
                    )}, // source filename\n` +
                    `    moduleName:  ${JSON.stringify(moduleName)},\n` +
                    `})\n` +
                    `\nexport default ${moduleName}_hl\n`;
                return {
                    code: code,                    
                    // id: `${id}‹generated›.ts`,
                    map: { mappings: "" },
                };
            }
        },

        // buildStart({ plugins }) {
        // 	const parentName = 'esbuild';
        // 	const parentPlugin = plugins.find(
        // 		plugin => plugin.name === parentName
        // 	);
        // 	if (!parentPlugin) {
        // 		// or handle this silently if it is optional
        // 		throw new Error(
        // 			`This plugin depends on the "${parentName}" plugin.`
        // 		);
        // 	}
        // 	// now you can access the API methods in subsequent hooks
        // 	esbuildApi = parentPlugin;
        // },
    };
}
