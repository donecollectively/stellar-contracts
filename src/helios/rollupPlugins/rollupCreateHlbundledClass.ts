import { existsSync, readFileSync } from "fs";
import {
    rollup,
} from "rollup";
import esbuild from "rollup-plugin-esbuild";
import { heliosRollupLoader } from "./heliosRollupLoader.js";
import path from "path";

export async function rollupCreateHlbundledClass(inputFile: string, projectRoot: string) {
    // writes the output file next to the input file as *.hlBundled.mjs
    const outputFile = inputFile.replace(
        /\.hlb\.[tj]s$/,
        ".hlBundled.mjs" // ??? move to dist/ or .hltemp/?  hlbundle
    );
    if (inputFile == outputFile) {
        throw new Error(`inputFile cannot be the same as outputFile`);
    }

    const buildStartTime = Date.now();

    // throw new Error(inputFile);
    console.log(`📦 StellarHeliosProject: loading ${inputFile}`);
    let didWarn = false;
    const bundle = await rollup({
        input: inputFile,
        external(id) {
            return !/^[./]/.test(id);
        },

        onwarn(warning, warn) {
            if (warning.code === "UNUSED_EXTERNAL_IMPORT") return;
            if (warning.code === "CIRCULAR_DEPENDENCY") {
                if (
                    warning.message ==
                        "Circular dependency: src/StellarTxnContext.ts -> src/diagnostics.ts -> src/StellarTxnContext.ts" ||
                    warning.message ==
                        "Circular dependency: src/diagnostics.ts -> src/StellarTxnContext.ts -> src/delegation/jsonSerializers.ts -> src/diagnostics.ts" ||
                    warning.message ==
                        "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramFs.ts -> src/helios/CachedHeliosProgram.ts" ||
                    warning.message ==
                        "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramWeb.ts -> src/helios/CachedHeliosProgram.ts" ||
                    warning.message ==
                        "Circular dependency: src/diagnostics.ts -> src/StellarTxnContext.ts -> src/diagnostics.ts" ||
                    warning.message ==
                        "Circular dependency: src/diagnostics.ts -> src/delegation/jsonSerializers.ts -> src/diagnostics.ts"
                ) {
                    if (didWarn) return;
                    didWarn = true;
                    // warn("    ... all the usual Circular dependencies...")
                    return;
                }
            }
            warn(warning);
        },
        plugins: [
            // stellarDeploymentHook("plugin"),
            heliosRollupLoader({
                // todo make this right for the context
                project: "stellar-contracts",
                // onLoadHeliosFile: (filename) => {
                //   remember this list of files
                // }
            }),
            // !!! figure out how to make the bundle include the compiled & optimized
            //   program, when options.compile is true.
            esbuild({
                tsconfig: "./tsconfig.json",
                target: ["node18"],

                sourceMap: false,
            }),
            // after the build is finished, append the list of input files
            // in a way making it quick and easy to load an existing compiled
            // file and let it check its own input files for changes.  Then
            // we can save time and avoid this build step if everything is already good.
        ],
        // output: {
        //     file: this.compiledProjectFilename,
        //     sourcemap: true,
        //     format: "es",
        // },
    }).catch((error) => {
        console.error("Error during rollup of helios bundle:", error);
        throw error;
    });

    const result = await bundle.generate({ format: "es" });
    if (result.output.length > 1) {
        throw new Error(`unexpected: bundle should have one output`);
    }
    const compiled = result.output[0].code;
    let buildTime = Date.now() - buildStartTime;

    let needsWrite = true;
    // if the file is not changed, skip write of the compiled file
    if (existsSync(outputFile)) {
        const existing = readFileSync(outputFile, "utf-8");
        if (existing === compiled) {
            console.log(
                `📦 StellarHeliosProject: unchanged bundle (${buildTime}ms): ${path.relative(projectRoot, outputFile)}`
            );
            needsWrite = false;
        }
    }
    if (needsWrite) {
        await bundle.write({
            file: outputFile,
            // sourcemap: true,  // ?? how to get this to work properly?  debugging goes to wrong site
            format: "es",
        });
        buildTime = Date.now() - buildStartTime;
        console.log(
            `📦 StellarHeliosProject: wrote compiled bundle (${buildTime}ms): ${outputFile}`
        );
    }
    bundle.close();
    return import(outputFile).then((mod) => {
        if (mod.default) {
            const BundleClass = mod.default;
            return BundleClass;
        } else {
            throw new Error(`no default export in ${outputFile}`);
        }
    });
}
