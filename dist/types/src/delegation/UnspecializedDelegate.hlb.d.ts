import type { Source } from "@helios-lang/compiler-utils";
declare const UnspecializedDgtBundle_base: import("../..").ConcreteCapoDelegateBundle;
/**
 * @public
 */
export declare class UnspecializedDgtBundle extends UnspecializedDgtBundle_base {
    specializedDelegateModule: Source;
    requiresGovAuthority: boolean;
    get params(): {
        rev: bigint;
        delegateName: string;
        isMintDelegate: boolean;
        isSpendDelegate: boolean;
        isDgDataPolicy: boolean;
        requiresGovAuthority: boolean;
    };
    get moduleName(): string;
    get bridgeClassName(): string;
}
export default UnspecializedDgtBundle;
//# sourceMappingURL=UnspecializedDelegate.hlb.d.ts.map