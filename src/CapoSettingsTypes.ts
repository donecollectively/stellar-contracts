import type { anyDatumProps } from "./StellarContract.js";
import { Capo  } from "./Capo.js";
import { DatumAdapter } from "./DatumAdapter.js";
import type { hasAnyDataTemplate } from "./DelegatedDatumAdapter.js";

// arranges an abstract interface for indicating the general
// type of settings adapters for Capo classes.
export interface hasSettingsType<C extends Capo<any>> {
    mkInitialSettings() : any; //OffchainSettingsType<C>;
    initSettingsAdapter() : DatumAdapter<any, any>;
}

// independently knows how to inspect the concrete
// type for the settings adapater for a particular Capo class.
export interface detectSettingsType<
    DAT extends DatumAdapter<any,any>,
> {
    initSettingsAdapter() : DAT;
    // mkInitialSettings() : OffchainType<DAT>;
}

export type SettingsAdapterFor<
    CAPO_TYPE extends Capo<any>,
    // CCT extends Capo<any> = CAPO_TYPE extends Capo<infer cct> ? cct : never,
    SAT = CAPO_TYPE extends detectSettingsType<infer DAT> ? DAT : never
> = DatumAdapter<any, any> & SAT

export type OnchainSettingsType<CAPO_TYPE extends Capo<any>> =
hasAnyDataTemplate<any> & SettingsAdapterFor<CAPO_TYPE> extends DatumAdapter<
        any,
        infer Onchain
    >
        ? Onchain extends hasAnyDataTemplate<any>
            ? Onchain["data"]
            : "TYPE_MISMATCH: settings DatumAdaper must have an on-chain 'data' field of type AnyDataTemplate<'set-'>"
        : never;

export type OffchainSettingsType<
    CAPO_TYPE extends Capo<any>
> =
    SettingsAdapterFor<CAPO_TYPE> extends DatumAdapter<infer appSettingsType, any> ? appSettingsType : never;


    export type OffchainType<
        DAT extends DatumAdapter<any, any>
    > = DAT extends DatumAdapter<infer appSettingsType, any> ? appSettingsType : never;
