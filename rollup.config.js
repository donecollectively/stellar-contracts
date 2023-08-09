import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import externals from "rollup-plugin-node-externals";
import resolve from "@rollup/plugin-node-resolve";
import { platformModulePaths } from "./rollup.lib.js";
import sourcemaps from "rollup-plugin-sourcemaps";

import packageJson from "./package.json" assert { type: "json" };
const name = packageJson.main.replace(/\.m?js$/, "");

const serverBundledModules = [];
const forcedServerExternals = ["@hyperionbt/helios"];

import { createFilter } from "rollup-pluginutils";

function heliosLoader(opts = {}) {
    if (!opts.include) {
        throw Error("include option should be specified");
    }

    const filter = createFilter(opts.include, opts.exclude);

    return {
        name: "string",

        transform(code, id) {
            if (filter(id)) {
                console.warn(`heliosLoader: generating javascript for ${id}`);               
                return {
                    code: `export default ${JSON.stringify(code)};`,
                    map: { mappings: "" },
                };
            }
        },
    };
}

// import { join } from "path";
// import alias from "@rollup/plugin-alias";
// console.warn({modulePaths})
const codeBundle = (config) => {
    if (!config.input) throw new Error(`missing required entry module 'input'`);

    return {
        ...config,
        external: (id) => {
            if (serverBundledModules.includes(id)) return false;
            if (forcedServerExternals.includes(id)) {
                console.warn("---ext detect ---", id);
                return true;
            }

            return !/^[./]/.test(id);
        },
    };
};

// console.log(JSON.stringify(browserRollupConfig, null, 2))
export default [
    codeBundle({
        input: "lib/index.ts",
        plugins: [
            sourcemaps(),
            externals(),
            heliosLoader({
                // Required to be specified
                include: "**/*.hl",
            }),
            resolve({
                ...platformModulePaths("server"),
                extensions: [".json", ".ts"],
            }),
            esbuild(),
        ],
        output: [
            {
                file: `${name}.mjs`,
                format: "es",
                sourcemap: true,
            },
        ],
    }),
    codeBundle({
        input: "lib/index.ts",
        plugins: [dts()],
        output: {
            file: `${name}.d.ts`,
            format: "es",
        },
    }),
];
