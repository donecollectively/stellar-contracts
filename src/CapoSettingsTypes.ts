import type { StellarContract, anyDatumProps } from "./StellarContract.js";
import { Capo } from "./Capo.js";
import { DatumAdapter, type adapterParsedOnchainData } from "./DatumAdapter.js";
import type {
    AnyDataTemplate,
    hasAnyDataTemplate,
} from "./DelegatedDatumAdapter.js";

// an incantation so that settings adapters don't have to get the finicky details right

/**
 * @public
 */
export type ParsedSettings<
    T extends anyDatumProps,
    innerParsedDetails = WrappedSettingsAdapterBridge<T> extends
        WrappedSettingsAdapterBridge<any, infer U> ? U : never
> = innerParsedDetails extends never ? never : {
    data: adapterParsedOnchainData<AnyDataTemplate<"set-", T>, "SettingsData">
};

/**
 * @public
 */
export abstract class SettingsAdapter<
    appType, settingsBridgeUnwrapped
> extends DatumAdapter<appType> {
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
/**
 * @public
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
/**
 * @public
 */
export interface hasSettingsType<C extends Capo<any>> {
    mkInitialSettings(): Promise<any>; //OffchainSettingsType<C>;
    initSettingsAdapter(): DatumAdapter<any> | Promise<DatumAdapter<any>>;
}

/**
 * @public
 */
export type DatumAdapterOffchainType<DAT extends DatumAdapter<any>> =
    DAT extends DatumAdapter<infer appSettingsType>
        ? appSettingsType
        : never;
