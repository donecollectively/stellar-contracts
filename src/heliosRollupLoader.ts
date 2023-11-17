import path from "path";
import { createFilter } from "rollup-pluginutils";
import * as helios from "@hyperionbt/helios";

/**
 * Rollup loader for Helios source files
 * @public
 **/
export function heliosRollupLoader(
    opts = {
        include: "**/*.hl",
        exclude: [],
    }
)  {
    if (!opts.include) {
        throw Error("missing required 'include' option for helios loader");
    }

    const filter = createFilter(opts.include, opts.exclude);

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

                const code = `const code = new String(${JSON.stringify(content)});\n\n`+
                    `code.srcFile = ${JSON.stringify(relPath)};\n`+
                    `code.purpose = ${JSON.stringify(purpose)}\n`+
                    `code.moduleName = ${JSON.stringify(moduleName)}\n`+
                    // `type foo={ hello: "world" }\n`+
                    `\nexport default code\n`
                ;

                return {
                    code: code,                    
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
