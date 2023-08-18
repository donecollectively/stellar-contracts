import { createFilter } from "rollup-pluginutils";

export function heliosRollupLoader(opts = {
    include: "**/*.hl",
}) {
    if (!opts.include) {
        throw Error("missing required 'include' option for helios loader");
    }

    const filter = createFilter(opts.include, opts.exclude);

    return {
        name: "helios",

        transform(code, id) {
            if (filter(id)) {
                // console.warn(`heliosLoader: generating javascript for ${id}`);               
                return {
                    code: `export default ${JSON.stringify(code)};`,
                    map: { mappings: "" },
                };
            }
        },
    };
}
