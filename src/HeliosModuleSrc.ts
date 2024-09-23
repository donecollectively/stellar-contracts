
import { Source } from "@helios-lang/compiler-utils"

/**
 * Properties for a Helios source file
 * @public
 **/
export type HeliosModuleOptions = {
    content?: string;
    // srcFile: string;
    purpose: string;
    name: string;
    moduleName: string;
    project?: string;
    moreInfo?: string
};

export class HeliosModuleSrc extends Source {
    static parseFromOptions(mInfo: HeliosModuleOptions | HeliosModuleSrc) {
        if (mInfo instanceof HeliosModuleSrc) return mInfo;
        if (!mInfo.content) throw new Error(`missing required {content} prop in contractSource()`);
        // console.log(`HeliosModuleSrc.parseFrom: mInfo:`, mInfo)
        return new HeliosModuleSrc(
            mInfo.content!,
            mInfo
        );
    }
    // srcFile: string;
    purpose: string;
    project?: string;
    // source filename is suitable here
    name: string;
    moduleName: string;
    moreInfo?: string;

    constructor(public content: string, options: HeliosModuleOptions) {
        super(content, options);
        // this.srcFile = options.srcFile;
        //@ts-expect-error
        if (options.srcFile) throw new Error(`use name, not srcFile in HeliosModuleSrc`);
        this.purpose = options.purpose;
        this.moduleName = options.moduleName;
        this.name = options.name;
        this.project = options.project;            
        this.moreInfo = options.moreInfo;
    }
}

/**
 * Creates a String object from Helios source code, having additional properties about the helios source 
 * @remarks
 * 
 * `purpose` and `moduleName` are parsed from the Helios source string using a simple regular expression.
 * @public
 **/
export function mkHeliosModule(
    src: string, 
    filename: string, 
    {project = "", moreInfo = ""}:{
        project?: string,
        moreInfo?: string
    }={}
): HeliosModuleSrc {
    if (!src) { 
         const e = new Error(`mkHeliosModule: undefined is invalid as Helios source code (? in ${filename})\n  ... Are you using default import?  ->  \`import someModuleName ... \`, not \`import { someModuleName } ...\`  `);
         e.stack = e.stack?.split("\n").slice(3).join("\n");
        //  console.log( "stack:>"+ e.stack + "<")
         throw e
    }

    const [_, purpose, moduleName] =
        src.match(/(module|minting|spending|endpoint)\s+([a-zA-Z0-9]+)/m) || [];

    const module = new HeliosModuleSrc(src, {
        name: filename,
        purpose, project, moduleName, moreInfo
    });

    return module;
}
