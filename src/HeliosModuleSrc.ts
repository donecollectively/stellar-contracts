/**
 * Properties for a Helios source file
 * @public
 **/
export type HeliosModuleSrc = string & {
    srcFile: string;
    purpose: string;
    moduleName: string;
    project?: string
};

/**
 * Creates a String object from Helios source code, having additional properties about the helios source 
 * @remarks
 * 
 * `srcFile`, `purpose`, and `moduleName` are parsed from the Helios source string using a simple regular expression.
 * @public
 **/
export function mkHeliosModule(src: string, filename: string, project : string = ""): HeliosModuleSrc {
    if (!src) { 
         const e = new Error(`mkHeliosModule: undefined is invalid as Helios source code (? in ${filename})\n  ... Are you using default import?  ->  \`import someModuleName ... \`, not \`import { someModuleName } ...\`  `);
         e.stack = e.stack?.split("\n").slice(3).join("\n");
        //  console.log( "stack:>"+ e.stack + "<")
         throw e
    }

    //@ts-expect-error - the later lines add the props that typescript wants to see.
    const module: HeliosModuleSrc = new String(src);
    const [_, purpose, moduleName] =
        src.match(/(module|minting|spending|endpoint)\s+([a-zA-Z0-9]+)/m) || [];

    module.srcFile = filename;
    module.purpose = purpose;
    module.project = project
    module.moduleName = moduleName;

    return module;
}
