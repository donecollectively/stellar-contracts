import {
    strategyValidation,
    defineRole
} from "../src/delegation/RolesAndDelegates";
import { MintDelegateWithGenericUuts } from "./specialMintDelegate/MintDelegateWithGenericUuts";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings";

export class CapoCanMintGenericUuts extends CapoWithoutSettings {

    async getMintDelegate(): Promise<MintDelegateWithGenericUuts> {
        return await super.getMintDelegate() as MintDelegateWithGenericUuts;
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
