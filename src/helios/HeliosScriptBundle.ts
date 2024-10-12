import { CachedHeliosProgram } from "./CachedHeliosProgram.js";
import type { HeliosModuleSrc } from "./HeliosModuleSrc.js";


export abstract class HeliosScriptBundle {
    abstract get main(): HeliosModuleSrc;
    abstract get modules(): HeliosModuleSrc[];

    get program(): CachedHeliosProgram {
        return CachedHeliosProgram.forCurrentPlatform(this.main, {
            moduleSources: this.modules,
        });
    }
}
