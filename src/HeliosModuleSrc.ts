
import { Source } from "@helios-lang/compiler-utils"

/**
 * Properties for a Helios source file
 * @public
 **/
export type HeliosModuleOptions = {
    content?: string;
    srcFile: string;
    purpose: string;
    name: string;
    project?: string
};
export class HeliosModuleSrc extends Source {
    static parseFrom(heliosModuleInfo: HeliosModuleOptions) {
        return new HeliosModuleSrc(
            heliosModuleInfo.content!,
            heliosModuleInfo
        );
    }
    srcFile: string;
    purpose: string;
    project?: string;
    // todo: trim this back once we get better helios integration
    name: string;
    moduleName: string;

    constructor(public content: string, options: HeliosModuleOptions) {
        super(content, options);
        this.srcFile = options.srcFile;
        this.purpose = options.purpose;
        this.moduleName = options.name;
        this.name = options.name;
        this.project = options.project;            
    }
}

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

    const [_, purpose, moduleName] =
        src.match(/(module|minting|spending|endpoint)\s+([a-zA-Z0-9]+)/m) || [];

    const module = new HeliosModuleSrc(src, {
        srcFile: filename,
        purpose, project, name: moduleName
    });

    return module;
}
