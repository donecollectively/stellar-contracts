export type HeliosModuleSrc = string & {
    srcFile: string;
    purpose: string;
    moduleName: string;
};

export function mkHeliosModule(src: string, filename: string): HeliosModuleSrc {
    //@ts-expect-error we didn't finish building yet.  Patience, grasshopper.
    const module: HeliosModuleSrc = new String(src);
    const [_, purpose, moduleName] =
        src.match(/(module|minting|spending|endpoint)\s+([a-zA-Z0-9]+)/m) || [];

    module.srcFile = filename;
    module.purpose = purpose;
    module.moduleName = moduleName;

    return module;
}
