import path from "path";
import { createFilter } from "rollup-pluginutils";

/**
 * Rollup loader for Helios source files
 * @public
 **/
export function heliosRollupLoader(
    opts : {include? : string, exclude? : string[], project?: string} = {}
)  {
    const options = {
        ...{
            include: "**/*.hl",
            exclude: [],
            project: ""
        },
        ...opts
    }
    if (!options.include) {
        throw Error("missing required 'include' option for helios loader");
    }

    const filter = createFilter(options.include, options.exclude);
    const project = options.project ? `${options.project}` : "";

    type Loader = { 
        code: string, 
        map: {mappings: string} 
    }
    let esbuildApi;
    return {
        name: "helios",

        transform(content, id) {
            if (filter(id)) {
                const relPath = path.relative(".", id);
                console.warn(
                    `heliosLoader: generating javascript for ${relPath}`
                );

                // helios.Program.new(content) // fails unless it can resolve deps

                const [_, purpose, moduleName] =
                    content.match(
                        /(module|minting|spending|endpoint)\s+([a-zA-Z0-9]+)/m
                    ) || [];

                if (!(purpose && moduleName))
                    throw new Error(`Bad format for helios file ${id}`);

                const code = 
                    `const heliosModule = {\n`+
                    `  content: ${JSON.stringify(content)},\n`+
                    `  srcFile: ${JSON.stringify(relPath)},\n`+
                    `  project: ${JSON.stringify(project)},\n`+
                    `  purpose: ${JSON.stringify(purpose)},\n`+
                    `  name:  ${JSON.stringify(moduleName)},\n`+
                    `}\n`+
                    // `type foo={ hello: "world" }\n`+
                    `\nexport default heliosModule\n`
                ;

                return {
                    code: code,                    
                    id: `${id}‹generated›.ts`,
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
