import type { anyDatumProps } from "./StellarContract.js";
import { Capo } from "./Capo.js";
import { DatumAdapter } from "./DatumAdapter.js";

export type SettingsAdapterFor<
    CAPO_TYPE extends Capo<any, any, any, any>
> = DatumAdapter<any, any, CAPO_TYPE> & ReturnType<CAPO_TYPE["initSettingsAdapter"]>;

export type OnchainSettingsType<
    CAPO_TYPE extends Capo<any, any, any, any>
> = anyDatumProps & SettingsAdapterFor<CAPO_TYPE> extends DatumAdapter<
    any, infer Onchain, any
> ? Onchain : never;

export type OffchainSettingsType<
    CAPO_TYPE extends Capo<any, any, any, any>
> = ReturnType<CAPO_TYPE["initSettingsAdapter"]> extends DatumAdapter<
    infer appType, any, any
> ? appType : never;
