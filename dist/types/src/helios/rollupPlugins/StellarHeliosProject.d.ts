import type { HeliosScriptBundle } from "../scriptBundling/HeliosScriptBundle.js";
import type { UplcData } from "@helios-lang/uplc";
import type { CapoHeliosBundle } from "../scriptBundling/CapoHeliosBundle.js";
type BundleStatusEntry = {
    filename: string;
    status: "registering" | "pendingLoad" | "loaded";
    bundleClassName: string;
    parentClassName?: string;
    bundleClass?: typeof HeliosScriptBundle;
    bundle?: HeliosScriptBundle;
};
export declare function isUplcData(x: any): x is UplcData;
/**
 * Gathers `*.hlb.[tj]s` files along with their status and attributes.
 * @public
 * @remarks
 * For script bundles that have previously been loaded, the project will
 * have access to the bundle's type information, and  be able to
 * instantiate the bundle, given a CapoBundle that typically provides
 * library dependencies.
 *
 * For script bundles that are being loaded for the first time, the project
 * can generate a "placeholder" type-definition, to be updated once the
 * bundle has been transformed by the helios rollup loader to be able to
 * do the above.
 */
export declare class StellarHeliosProject {
    static details: {
        projectRoot: string;
        packageJSON: {
            name: string;
            version: string;
            dependencies: Record<string, string>;
            devDependencies: Record<string, string>;
        };
    };
    configuredCapo: import("../../networkClients/mkCancellablePromise.js").ResolveablePromise<CapoHeliosBundle>;
    bundleEntries: Map<string, BundleStatusEntry>;
    capoBundleName?: string;
    capoBundle: CapoHeliosBundle | undefined;
    constructor();
    _isSC: boolean | undefined;
    isStellarContracts(): boolean | undefined;
    get projectRoot(): string;
    replaceWithNewCapo(absoluteFilename: string, newCapoClass: typeof HeliosScriptBundle): StellarHeliosProject;
    relativePath(filename: string): string;
    loadBundleWithClass(options: {
        absoluteFilename: string;
        bundleClass: typeof HeliosScriptBundle;
        harmlessSecondCapo?: boolean;
        originatorLabel: string;
        scriptParamsSource?: "config" | "bundle" | "none";
    }): void;
    hasBundleClass(filename: string): any;
    generateBundleTypes(oneFile: string): void;
    writeDataBridgeCode(oneFilename: string, bundleEntry: BundleStatusEntry): void;
    writeIfUnchanged(filename: string, source: string): string | undefined;
    normalizeFilePath(filename: string): string;
    writeTypeInfo(filename: string, bundleEntry: BundleStatusEntry): void;
    static findProjectDetails(): {
        projectRoot: string;
        packageJSON: {
            name: string;
            version: string;
            dependencies: Record<string, string>;
            devDependencies: Record<string, string>;
        };
    };
}
export {};
//# sourceMappingURL=StellarHeliosProject.d.ts.map