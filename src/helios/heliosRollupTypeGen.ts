import { readFileSync } from "fs";
import path from "path";
import { createFilter } from "rollup-pluginutils";

type ResolveIdHook = (
    source: string,
    importer: string | undefined,
    options: {
        attributes: Record<string, string>;
        custom?: { [plugin: string]: any };
        isEntry: boolean;
    }
) => ResolveIdResult;

type ResolveIdResult = string | null | false | PartialResolvedId;

interface PartialResolvedId {
    id: string;
    external?: boolean | "absolute" | "relative";
    attributes?: Record<string, string> | null;
    meta?: { [plugin: string]: any } | null;
    moduleSideEffects?: boolean | "no-treeshake" | null;
    resolvedBy?: string | null;
    syntheticNamedExports?: boolean | string | null;
}

/**
 * Rollup loader for just-in-time type imports for helios Bundle files
 * @public
 **/
export function heiiosRollupTypeGen(
    opts: { include?: string; exclude?: string[]; project?: string } = {}
) {
    const options = {
        ...{
            include: "**/*.hlbundle.ts",
            exclude: [],
            project: "",
        },
        ...opts,
    };
    if (!options.include) {
        throw Error("missing required 'include' option for helios loader");
    }

    const filter = createFilter(options.include, options.exclude);
    const project = options.project ? `${options.project}` : "";

    type Loader = {
        code: string;
        map: { mappings: string };
    };
    let esbuildApi;
    const resolveId: ResolveIdHook = (source, importer, options) => {
        // the source is a relative path name
        // the importer is an a fully resolved id of the imported module
        if (!filter(source)) {
           console.log(`resolver2: skipping due to filter mismatch`, {source, importer});
            return null;
        }

        console.log("hlbundle: ", {source, importer});
        return {
            id: source
        }
        //  throw new Error(`heliosLoader: ${importer} is importing ${source}`);
    };
    return {
        name: "helios",
        resolveId,
        transform: {
            order: "post",
            async handler(code, id) {
                if (filter(id)) {
                    const relPath = path.relative(".", id);
                    console.warn(
                        `heliosTypeGen: transforming ${relPath} = ${id}`
                    );
                    console.log({ code });
                    // import(id).then((mod) => {
                    //     console.log({ mod });
                    // })
                }
                return null;
            },
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
