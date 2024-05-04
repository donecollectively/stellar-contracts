import type { anyDatumProps } from "./StellarContract.js";
import { Capo } from "./Capo.js";
import { DatumAdapter, type AnyDataTemplate } from "./DatumAdapter.js";

export type SettingsAdapterFor<
    CAPO_TYPE extends Capo<any, any, any, any>> = ( DatumAdapter<
        any, { data: AnyDataTemplate<"set-"> }, CAPO_TYPE
    > &
        CAPO_TYPE 
    ) extends Capo<infer STA, any, any, any> ? STA : never;

export type OnchainSettingsType<CAPO_TYPE extends Capo<any, any, any, any>> =
    anyDatumProps & SettingsAdapterFor<CAPO_TYPE> extends DatumAdapter<
        any,
        infer Onchain,
        any
    >
        ? Onchain extends { data: AnyDataTemplate<"set-"> }
            ? Onchain
            : "TYPE_MISMATCH: DatumAdpater must have a data field of type AnyDataTemplate<'set-'>"
        : never;

export type OffchainSettingsType<
    CAPO_TYPE extends Capo<any, any, any, any>
> =
    SettingsAdapterFor<CAPO_TYPE> extends DatumAdapter<infer OCST, any, any> ? OCST : never;

