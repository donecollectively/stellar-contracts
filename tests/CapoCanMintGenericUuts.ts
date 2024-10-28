import {
    strategyValidation,
    defineRole
} from "../src/delegation/RolesAndDelegates";
import CapoBundleWithGenericUuts from "./CapoWithGenericUuts.hlbundle.js";
import { MintDelegateWithGenericUuts } from "../src/testing/specialMintDelegate/MintDelegateWithGenericUuts.js";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings";
import { CharterDatumProps } from "../src/Capo.js";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate.js";

export class CapoCanMintGenericUuts extends CapoWithoutSettings {
    async getMintDelegate(): Promise<MintDelegateWithGenericUuts> {
        return super.getMintDelegate() as any
    }

    scriptBundle() {
        return new CapoBundleWithGenericUuts();
    }
    
    initDelegateRoles() {
        const inherited = super.initDelegateRoles();
        return {
            ...inherited,
            mintDelegate: defineRole("mintDgt", MintDelegateWithGenericUuts, {
                defaultV1: {
                    delegateClass: MintDelegateWithGenericUuts,
                    partialConfig: {},
                    validateConfig(args): strategyValidation {
                        return undefined;
                    },
                },
            })
        };
    }
}
