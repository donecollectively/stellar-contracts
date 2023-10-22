import path from "path";
import { createFilter } from "rollup-pluginutils";

export function heliosRollupLoader(
    opts = {
        include: "**/*.hl",
        exclude: [],
    }
) {
    if (!opts.include) {
        throw Error("missing required 'include' option for helios loader");
    }

    const filter = createFilter(opts.include, opts.exclude);

    return {
        name: "helios",

        transform(content, id) {
            if (filter(id)) {
                const relPath = path.relative(".", id);
                console.warn(
                    `heliosLoader: generating javascript for ${relPath}`
                );
                const [_, purpose, moduleName] =
                    content.match(
                        /(module|minting|spending|endpoint)\s+([a-zA-Z0-9]+)/m
                    ) || [];
                if (!(purpose && moduleName))
                    throw new Error(`Bad format for helios file ${id}`);

                const code = new String(
                    `const code = 
new String(${JSON.stringify(content)});
code.srcFile = ${JSON.stringify(relPath)};
code.purpose = ${JSON.stringify(purpose)}
code.moduleName = ${JSON.stringify(moduleName)}

export default code\n`
                );
                return {
                    code: code,
                    map: { mappings: "" },
                };
            }
        },
    };
}
