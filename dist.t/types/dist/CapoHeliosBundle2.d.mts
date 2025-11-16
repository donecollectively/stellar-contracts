declare class CapoHeliosBundle extends HeliosScriptBundle {
    preConfigured: any;
    precompiledScriptDetails: {
        capo: undefined;
    };
    scriptParamsSource: string;
    requiresGovAuthority: boolean;
    parseCapoJSONConfig(config: any): {
        mph: import("@helios-lang/ledger").MintingPolicyHash<unknown>;
        rev: bigint;
        seedTxn: import("@helios-lang/ledger").TxId;
        seedIndex: bigint;
        rootCapoScriptHash: import("@helios-lang/ledger").ValidatorHash<unknown>;
    };
    parseCapoMinterJSONConfig(config: any): {
        seedTxn: import("@helios-lang/ledger").TxId;
        seedIndex: bigint;
    };
    loadPrecompiledScript(): Promise<void>;
    loadPrecompiledMinterScript(): Promise<void>;
    get main(): import("@helios-lang/compiler-utils").Source;
    datumTypeName: string;
    capoBundle: this;
    get scriptConfigs(): void;
    /**
     * returns only the modules needed for the Capo contract
     * @remarks
     * overrides the base class's logic that references a connected
     * Capo bundle - that policy is not needed here because this IS
     * the Capo bundle.
     */
    getEffectiveModuleList(): import("@helios-lang/compiler-utils").Source[];
    /**
     * indicates a list of modules available for inclusion in Capo-connected scripts
     * @remarks
     * Subclasses can implement this method to provide additional modules
     * shareable to various Capo-connected scripts; those scripts need to
     * include the modules by name in their `includeFromCapoModules()` method.
     *
     * See the
     */
    get sharedModules(): never[];
    get modules(): import("@helios-lang/compiler-utils").Source[];
}
declare function mkCapoDeployment({ capo }: {
    capo: any;
}): {
    capo: {
        config: {
            mph: import("@helios-lang/ledger").MintingPolicyHash<unknown>;
            rev: bigint;
            seedTxn: import("@helios-lang/ledger").TxId;
            seedIndex: bigint;
            rootCapoScriptHash: import("@helios-lang/ledger").ValidatorHash<unknown>;
        };
    };
};
declare function mkDelegateDeployment(ddd: any): any;
declare function parseCapoMinterJSONConfig(rawJSONConfig: any): {
    seedTxn: import("@helios-lang/ledger").TxId;
    seedIndex: bigint;
};
declare function mkDeployedScriptConfigs(x: any): any;
declare function parseCapoJSONConfig(rawJsonConfig: any): {
    mph: import("@helios-lang/ledger").MintingPolicyHash<unknown>;
    rev: bigint;
    seedTxn: import("@helios-lang/ledger").TxId;
    seedIndex: bigint;
    rootCapoScriptHash: import("@helios-lang/ledger").ValidatorHash<unknown>;
};
import { HeliosScriptBundle } from './HeliosBundle.mjs';
export { CapoHeliosBundle as C, mkCapoDeployment as a, mkDelegateDeployment as b, parseCapoMinterJSONConfig as c, mkDeployedScriptConfigs as m, parseCapoJSONConfig as p };
//# sourceMappingURL=CapoHeliosBundle2.d.mts.map