import type { StellarContract, anyDatumProps } from "./StellarContract.js";
import { Capo } from "./Capo.js";
import { DatumAdapter, type adapterParsedOnchainData } from "./DatumAdapter.js";
import type {
    AnyDataTemplate,
    hasAnyDataTemplate,
} from "./DelegatedDatumAdapter.js";

// an incantation so that settings adapters don't have to get the finicky details right

export type ParsedSettings<
    T extends anyDatumProps,
    innerParsedDetails = WrappedSettingsAdapterBridge<T> extends
        WrappedSettingsAdapterBridge<any, infer U> ? U : never
> = innerParsedDetails extends never ? never : {
    data: adapterParsedOnchainData<AnyDataTemplate<"set-", T>, "SettingsData">
};

export abstract class SettingsAdapter<
    appType, settingsBridgeUnwrapped
> extends DatumAdapter<appType, WrappedSettingsAdapterBridge<settingsBridgeUnwrapped>> {
    // constructor(strella: StellarContract<any>) {
    //     super(strella);

    //     if (this.fromOnchainDatum !== SettingsAdapter.prototype.fromOnchainDatum) {
    //         throw new Error("SettingsAdapter subclasses must implement fromOnchainSettings(), not fromOnchainDatum()");
    //     }
    // }

}

/**
 * given a bridge type for the essential settings struct, this type indicates
 * that it's always wrapped in a data field, and that it has the "anyData" form
 * (which is a CIP-68-style k/v struct).
 */
export type WrappedSettingsAdapterBridge<
    unwrappedBT,
    canBeBridgeType extends adapterParsedOnchainData<
        any,
        any
    > = unwrappedBT extends {data: any} ? never :
    unwrappedBT extends adapterParsedOnchainData<any, any> ? unwrappedBT : never
> = canBeBridgeType extends never ? never //"TYPE_ERROR: settings adapter mustn't include a data: wrapper" 
: anyDatumProps & hasAnyDataTemplate<"set-", anyDatumProps & canBeBridgeType>;

// type isOkay = "yes" extends never ? "yikes?  whew, this doesn't happen" : "okay!";

// arranges an abstract interface for indicating the general
// type of settings adapters for Capo classes.
export interface hasSettingsType<C extends Capo<any>> {
    mkInitialSettings(): Promise<any>; //OffchainSettingsType<C>;
    initSettingsAdapter(): DatumAdapter<any, any> | Promise<DatumAdapter<any, any>>;
}

// independently knows how to inspect the concrete
// type for the settings adapater for a particular Capo class.
export interface detectCapoSettingsType<DAT extends DatumAdapter<any, any>> {
    initSettingsAdapter(): DAT;
    // mkInitialSettings() : OffchainType<DAT>;
}

export type CapoSettingsAdapterFor<
    CAPO_TYPE extends Capo<any>,
    // CCT extends Capo<any> = CAPO_TYPE extends Capo<infer cct> ? cct : never,
    SAT = CAPO_TYPE extends detectCapoSettingsType<infer DAT> ? DAT : never
> = DatumAdapter<any, any> & SAT;

export type CapoOnchainSettingsType<CAPO_TYPE extends Capo<any>> =
    hasAnyDataTemplate<"set-", any> &
        CapoSettingsAdapterFor<CAPO_TYPE> extends DatumAdapter<
        any,
        infer Onchain
    >
        ? Onchain extends hasAnyDataTemplate<"set-", any>
            ? Onchain["data"]
            : never //"TYPE_MISMATCH: settings DatumAdapter must have an on-chain 'data' field of type AnyDataTemplate<'set-'>"
        : never;

export type CapoOffchainSettingsType<CAPO_TYPE extends Capo<any>> =
    CapoSettingsAdapterFor<CAPO_TYPE> extends DatumAdapter<
        infer appSettingsType,
        any
    >
        ? appSettingsType
        : never;

export type DatumAdapterOffchainType<DAT extends DatumAdapter<any, any>> =
    DAT extends DatumAdapter<infer appSettingsType, any>
        ? appSettingsType
        : never;
