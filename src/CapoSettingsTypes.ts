import type { StellarContract, anyDatumProps } from "./StellarContract.js";
import { Capo } from "./Capo.js";
import type {
    AnyDataTemplate,
    hasAnyDataTemplate,
} from "./delegation/DelegatedData.js";


/**
 * 
 * @public
 */
export interface hasSettingsType{
    mkInitialSettings(): Promise<AnyDataTemplate<any,any>>;
    // initSettingsAdapter(): DatumAdapter<any,any> | Promise<DatumAdapter<any,any>>;
}

export type DetectSettingsType<
    C extends Capo<any>,
    MIS extends hasSettingsType["mkInitialSettings"] = C extends hasSettingsType ? C["mkInitialSettings"] : never 
> = MIS extends never ? never :
    Awaited<ReturnType<MIS>>
