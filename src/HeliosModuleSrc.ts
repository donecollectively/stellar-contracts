/**
 * Properties for a Helios source file
 * @public
 **/
export type HeliosModuleSrc = string & {
    srcFile: string;
    purpose: string;
    moduleName: string;
};

/**
 * Creates a String object from Helios source code, having additional properties about the helios source 
 * @remarks
 * 
 * `srcFile`, `purpose`, and `moduleName` are parsed from the Helios source string using a simple regular expression.
 * @public
 **/
export function mkHeliosModule(src: string, filename: string): HeliosModuleSrc {
    //@ts-expect-error - the later lines add the props that typescript wants to see.
    const module: HeliosModuleSrc = new String(src);
    const [_, purpose, moduleName] =
        src.match(/(module|minting|spending|endpoint)\s+([a-zA-Z0-9]+)/m) || [];

    module.srcFile = filename;
    module.purpose = purpose;
    module.moduleName = moduleName;

    return module;
}
