import { existsSync, readFileSync, statSync } from "fs";

import type { UplcData } from "@helios-lang/uplc";
import type { DataType } from "@helios-lang/compiler";
import type { Source } from "@helios-lang/compiler-utils";

import { CachedHeliosProgram } from "./CachedHeliosProgram.js";

import { DataReader } from "./dataBridge/DataReader.js";
import type { CapoHeliosBundle } from "../CapoHeliosBundle.js";
import type {
    CapoBundleClass,
    HeliosBundleClassWithCapo,
    defaultNoDefinedModuleName,
    HeliosBundleTypes,
} from "./HeliosMetaTypes.js";

};

export abstract class HeliosScriptBundle {
    static isCapoBundle = false;
    capoBundle?: CapoHeliosBundle;
    isConcrete = false;

    /**
     * Constructs a base class for any Helios script bundle,
     * given the class for an application-specific CapoHeliosBundle.
     * @remarks
     * The resulting class provides its own CapoHeliosBundle instance
     * for independent use (specifically, for compiling this bundle using
     * the dependency libraries provided by the Capo bundle).
     */
    //
    //     * NOTE: the following is NOT needed for efficiency, and not implemented
    //     *, as the Capo
    //     * bundle referenced above should never need to be compiled via
    //     * `this.capoBundle.program`.
    //     *
    //     * XXX - For application runtime purposes, it can ALSO accept a
    //     * XXX - CapoHeliosBundle instance as a constructor argument,
    //     * XXX - enabling lower-overhead instantiation and re-use across
    //     * XXX - various bundles used within a single Capo,
    //     */
    static usingCapoBundleClass<CB extends CapoBundleClass>(c: CB) : HeliosBundleClassWithCapo {
        const cb = new c();
        const newClass = class aCapoBoundBundle extends HeliosScriptBundle {
            capoBundle = cb;
            constructor() {
                super();
            }

            isConcrete = true;
        } as HeliosBundleClassWithCapo & typeof newClass

        return newClass;
    }
    /**
     * optional attribute explicitly naming a type for the datum
     * @remarks
     * This can be used if needed for a contract whose entry point uses an abstract
     * type for the datum; the type-bridge & type-gen system will use this data type
     * instead of inferrring the type from the entry point.
     */
    datumTypeName?: string;

    /**
     * optional attribute explicitly naming a type for the redeemer
     * @remarks
     * This can be used if needed for a contract whose entry point uses an abstract
     * type for the redeemer; the type-bridge & type-gen system will use this data type
     * instead of inferring the type from the entry point.
     */
    redeemerTypeName?: string;

    constructor() {
        // this.devReloadModules()
    }

    // these should be unnecessary if we arrange the rollup plugin
    // ... to watch the underlying helios files for changes that would affect the bundle
    // checkDevReload() {
    //     const env = process.env.NODE_ENV;
    //     if (env !== "test" && env !== "development") {
    //         console.log("disabling module reloading in non-dev environment");
    //         return
    //     }
    //     this.reloadModule(this.main);
    //     for (const module of this.modules) {
    //         this.reloadModule(module)
    //     }
    // }
    // reloadModule(module: HeliosModuleSrc) {
    //     // treat module.name as a filename.
    //     // check if it can be opened as a file.
    //     // reassign module.content to the file's contents.

    //     if (existsSync(module.name)) {
    //         console.log(`bundle module load: ${module.name}`);
    //         const newContent = readFileSync(module.name, "utf8");
    //         if (module.content !== newContent) {
    //             console.log(`♻️ module reload: ${module.name}`);
    //             module.content = newContent;
    //         }
    //     }
    // }

    get main(): Source {
        throw new Error(
            `${this.constructor.name}: get main() must be implemented in subclass`
        );
    }

    get modules(): Source[] {
        return [];
    }

    get bridgeClassName() {
        const mName = this.moduleName || this.program.name;
        return `${mName}DataBridge`;
    }

    get moduleName() {
        return this.constructor.name
            .replace(/Bundle/, "")
            .replace(/Helios/, "");
        defaultNoDefinedModuleName; // overridden in subclasses where relevant
    }

    get program(): CachedHeliosProgram {
        let mName = this.moduleName;
        if (mName === defaultNoDefinedModuleName) {
            mName = "";
        }
        try {
            return CachedHeliosProgram.forCurrentPlatform(this.main, {
                moduleSources: this.modules,
                name: mName, // it will fall back to the program name if this is empty
            });
        } catch (e: any) {
            // !!! probably this stuff needs to move to compileWithScriptParams()
            if (e.message.match(/invalid parameter name/)) {
                debugger;
                throw new Error(
                    e.message +
                        `\n   ... this typically occurs when your StellarContract class (${this.constructor.name})` +
                        "\n   ... can be missing a getContractScriptParamsUplc() method " +
                        "\n   ... to map from the configured settings to contract parameters"
                );
            }
            const [unsetConst, constName] =
                e.message.match(/used unset const '(.*?)'/) || [];
            if (unsetConst) {
                console.log(e.message);
                throw new Error(
                    `${this.constructor.name}: missing required script param '${constName}' in static getDefaultParams() or getContractScriptParams()`
                );
            }
            if (!e.site) {
                console.error(
                    `unexpected error while compiling helios program (or its imported module) \n` +
                        `> ${e.message}\n` +
                        `Suggested: connect with debugger (we provided a debugging point already)\n` +
                        `  ... and use 'break on caught exceptions' to analyze the error \n` +
                        `This likely indicates a problem in Helios' error reporting - \n` +
                        `   ... please provide a minimal reproducer as an issue report for repair!\n\n` +
                        e.stack.split("\n").slice(1).join("\n")
                );
                try {
                    debugger;
                    // debugger'ing?  YOU ARE AWESOME!
                    //  reminder: ensure "pause on caught exceptions" is enabled
                    //  before playing this next line to dig deeper into the error.

                    const try2 = CachedHeliosProgram.forCurrentPlatform(
                        this.main,
                        {
                            moduleSources: this.modules,
                            name: mName, // it will fall back to the program name if this is empty
                        }
                    );

                    // const script2 = new Program(codeModule, {
                    //     moduleSources: modules,
                    //     isTestnet: this.setup.isTest,
                    // });
                    // console.log({ params });
                    // if (params) {
                    //     for (const [p, v] of Object.entries(params || {})) {
                    //         script2.changeParam(p, v);
                    //     }
                    //     script2.compile();
                    // }
                    console.warn("NOTE: no error thrown on second attempt");
                } catch (sameError) {
                    // entirely expected it would throw the same error
                    // throw sameError;
                }
                // throw e;
            }
            debugger;
            const [_, notFoundModule] =
                e.message.match(/module '(.*)' not found/) || [];
            if (notFoundModule) {
                console.log(
                    "module not found; included modules:\n" +
                        this.modules
                            .map((m) => {
                                const pInfo = m.project
                                    ? ` [in ${m.project}]/`
                                    : "";
                                return ` • ${m.moduleName}${pInfo}${m.name} (${m.content.length} bytes)`;
                            })
                            .join("\n")
                );
            }
            if (!e.site) {
                console.warn(
                    "error thrown from helios doesn't have source site info; rethrowing it"
                );
                throw e;
            }
            const moduleName2 = e.site.file; // moduleName? & filename ? :pray:
            const errorModule = [this.main, ...this.modules].find(
                (m) => m.name == moduleName2
            );

            // const errorModule = [codeModule, ...modules].find(
            //     (m) => (m as any).name == moduleName
            // );

            const {
                project,
                moduleName,
                name: srcFilename = "‹unknown path to module›",
                moreInfo,
            } = errorModule || {};
            let errorInfo: string = "";
            try {
                statSync(srcFilename).isFile();
            } catch (e) {
                const indent = " ".repeat(6);
                errorInfo = project
                    ? `\n${indent}Error found in project ${project}:${srcFilename}\n` +
                      `${indent}- in module ${moduleName}:\n${moreInfo}\n` +
                      `${indent}  ... this can be caused by not providing correct types in a module specialization,\n` +
                      `${indent}  ... or if your module definition doesn't include a correct path to your helios file\n`
                    : `\n${indent}WARNING: the error was found in a Helios file that couldn't be resolved in your project\n` +
                      `${indent}  ... this can be caused if your module definition doesn't include a correct path to your helios file\n` +
                      `${indent}  ... (possibly in mkHeliosModule(heliosCode, \n${indent}    "${srcFilename}"\n${indent})\n`;
            }

            const { startLine, startColumn } = e.site;
            const t = new Error(errorInfo);
            const modifiedStack = t.stack!.split("\n").slice(1).join("\n");
            debugger;
            const additionalErrors = (e.otherErrors || []).slice(1).map(
                (oe) =>
                    `       |         ⚠️  also: ${
                        // (oe.message as string).replace(e.site.file, "")}`);
                        oe.site.file == e.site.file
                            ? oe.site
                                  .toString()
                                  .replace(e.site.file + ":", "at ") +
                              ": " +
                              oe.originalMessage
                            : oe.site.toString() + " - " + oe.originalMessage
                    }`
            );
            const addlErrorText = additionalErrors.length
                ? ["", ...additionalErrors, "       v"].join("\n")
                : "";
            t.message = `${e.kind}: ${
                this.constructor.name
            }\n${e.site.toString()} - ${
                e.originalMessage
            }${addlErrorText}\n${errorInfo}`;

            t.stack =
                `${this.constructor.name}: ${
                    e.message
                }\n    at ${moduleName2} (${srcFilename}:${1 + startLine}:${
                    1 + startColumn
                })\n` + modifiedStack;

            throw t;
        }
    }

    isHeliosScriptBundle() {
        return true;
    }

    addTypeProxies() {
        // const typeGenerator = new BundleTypeGenerator(this);
        // const { activityTypeDetails, datumTypeDetails } = typeGenerator;
        // this.Activity = new ActivityMaker(this);
        // if (datumTypeDetails) {
        //     this.readDatum = new DataReader(datumTypeDetails);
        // }
    }

    effectiveDatumTypeName() {
        return (
            this.datumTypeName ||
            this.locateDatumType()?.name ||
            "‹unknown datum-type name›"
        );
    }

    locateDatumType(): DataType | undefined {
        let datumType: DataType | undefined;
        // let datumTypeName: string | undefined;

        const program = this.program;
        const programName = program.name;
        const argTypes = program.entryPoint.mainArgTypes;
        const argCount = argTypes.length;
        if (argCount === 2) {
            datumType = argTypes[0];
            // datumTypeName = argTypes[0].name;
        }

        if (this.datumTypeName) {
            datumType =
                program.entryPoint.userTypes[programName][this.datumTypeName];
            if (!datumType) {
                throw new Error(
                    `${this.constructor.name}.datumTypeName=\`${this.datumTypeName}\` not found in userTypes of script program ${programName}`
                );
            }
        }

        return datumType;
    }

    locateRedeemerType(): DataType {
        const program = this.program;
        const argTypes = program.entryPoint.mainArgTypes;
        const argCount = argTypes.length;

        let redeemerType: DataType;
        if (argCount === 2) {
            redeemerType = argTypes[1];
        } else {
            redeemerType = argTypes[0];
        }

        if (this.redeemerTypeName) {
            const programName = program.name;
            redeemerType =
                program.entryPoint.userTypes[programName][
                    this.redeemerTypeName
                ];
            if (!redeemerType) {
                throw new Error(
                    `${this.constructor.name}.redeemerTypeName=\`${this.redeemerTypeName}\` not found in userTypes of script program ${programName}`
                );
            }
        }

        return redeemerType;
    }

    getTopLevelTypes(): HeliosBundleTypes {
        const types = {
            datum: this.locateDatumType(),
            redeemer: this.locateRedeemerType(),
        };

        const program = this.program;
        const {userTypes} = program;
        const {mainModule} = program.entryPoint;
        const mainTypes = userTypes[mainModule.name.value];
        for (const [typeName, type] of Object.entries(mainTypes)) {
            const s = type.toSchema()
            if (s.kind == "struct") {
                types[typeName] = type;
            }
        }

        if (userTypes.specializedDelegate) {
            const specializationName = this.moduleName
            const specializationTypes = userTypes[specializationName];
            if (!specializationTypes) {
                console.log("NOTE:  debugging breakpoint available for more troubleshooting")
                debugger
                console.log("NOTE: the module name for the delegate policy script must match bundle's moduleName");
                throw new Error(`specialization types not found for ${
                    this.moduleName
                } in program ${program.name}`);
            }
            for (const [typeName, type] of Object.entries(specializationTypes)) {
                const s = type.toSchema()
                if (s.kind == "struct") {
                    types[typeName] = type;
                }
            }
        }

        return types
    }
}
