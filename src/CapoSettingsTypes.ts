import type { anyDatumProps } from "./StellarContract.js";
import { Capo } from "./Capo.js";
import { DatumAdapter, type AnyDataTemplate } from "./DatumAdapter.js";

export interface hasAnyDataTemplate {
    data: AnyDataTemplate<"set-"> 
}

export type SettingsAdapterFor<
    CAPO_TYPE extends Capo
> = Awaited<ReturnType<CAPO_TYPE["initSettingsAdapter"]>> extends ( DatumAdapter<
        any, hasAnyDataTemplate
    > ) ?        
     Awaited<ReturnType<CAPO_TYPE["initSettingsAdapter"]>> : 
     "TYPE_MISMATCH: settings DatumAdaper must have an on-chain 'data' field of type AnyDataTemplate<'set-'>";

export type OnchainSettingsType<CAPO_TYPE extends Capo> =
    anyDatumProps & SettingsAdapterFor<CAPO_TYPE> extends DatumAdapter<
        any,
        infer Onchain
    >
        ? Onchain extends hasAnyDataTemplate
            ? Onchain["data"]
            : "TYPE_MISMATCH: settings DatumAdaper must have an on-chain 'data' field of type AnyDataTemplate<'set-'>"
        : never;

export type OffchainSettingsType<
    CAPO_TYPE extends Capo
> =
    SettingsAdapterFor<CAPO_TYPE> extends DatumAdapter<infer appSettingsType, any> ? appSettingsType : never;

