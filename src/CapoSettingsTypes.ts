import type { anyDatumProps } from "./StellarContract.js";
import { Capo, type hasSettingsType } from "./Capo.js";
import { DatumAdapter, type AnyDataTemplate } from "./DatumAdapter.js";

export interface hasAnyDataTemplate {
    data: AnyDataTemplate<"set-"> 
}

export type SettingsAdapterFor<
    CAPO_TYPE extends Capo<any>,
    CBT extends Capo<any> = CAPO_TYPE extends Capo<infer CBT> ? CBT : never
> = ReturnType<hasSettingsType<CBT>["initSettingsAdapter"]>  

export type OnchainSettingsType<CAPO_TYPE extends Capo<any>> =
    anyDatumProps & SettingsAdapterFor<CAPO_TYPE> extends DatumAdapter<
        any,
        infer Onchain
    >
        ? Onchain extends hasAnyDataTemplate
            ? Onchain["data"]
            : "TYPE_MISMATCH: settings DatumAdaper must have an on-chain 'data' field of type AnyDataTemplate<'set-'>"
        : never;

export type OffchainSettingsType<
    CAPO_TYPE extends Capo<any>
> =
    SettingsAdapterFor<CAPO_TYPE> extends DatumAdapter<infer appSettingsType, any> ? appSettingsType : never;

