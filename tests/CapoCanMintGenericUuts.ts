import {
    strategyValidation,
    defineRole
} from "../src/delegation/RolesAndDelegates";
import { MintDelegateWithGenericUuts } from "./specialMintDelegate/MintDelegateWithGenericUuts";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings";
import withGenericUuts from "./withGenericUuts.hlbundle.js";

export class CapoCanMintGenericUuts extends CapoWithoutSettings {

    async getMintDelegate(): Promise<MintDelegateWithGenericUuts> {
        return await super.getMintDelegate() as MintDelegateWithGenericUuts;
    }

    scriptBundle() {
        return new withGenericUuts();
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
