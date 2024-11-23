import type { StellarContract, anyDatumProps } from "./StellarContract.js";
import { Capo } from "./Capo.js";
import { DatumAdapter, type adapterParsedOnchainData } from "./DatumAdapter.js";
import type {
    AnyDataTemplate,
    hasAnyDataTemplate,
} from "./delegation/DelegatedDatumAdapter.js";
import type { ErgoAnyData } from "./CapoHeliosBundle.typeInfo.js";

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
> extends DatumAdapter<any, appType> {
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
export interface hasSettingsType{
    mkInitialSettings(): Promise<{type:string}>;
    // initSettingsAdapter(): DatumAdapter<any,any> | Promise<DatumAdapter<any,any>>;
}

export type DetectSettingsType<
    C extends Capo<any>,
    MIS extends hasSettingsType["mkInitialSettings"] = C extends hasSettingsType ? C["mkInitialSettings"] : never 
> = MIS extends never ? never :
    Awaited<ReturnType<MIS>>

/**
 * @public
 */
export type DatumAdapterOffchainType<DAT extends DatumAdapter<any, any>> =
    DAT extends DatumAdapter<infer offChainType, any>
        ? offChainType
        : never;

        export type DatumAdapterAppType<DAT extends DatumAdapter<any, any>> =
    DAT extends DatumAdapter<any, infer appSettingsType>
        ? appSettingsType
        : never;
