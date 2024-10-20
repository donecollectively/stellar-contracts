import { ConstrData, Datum } from "@hyperionbt/helios";
import { Capo } from "./Capo.js";
import { DatumAdapter, type offchainDatumType, type adapterParsedOnchainData } from "./DatumAdapter.js";
import { SettingsAdapter, type ParsedSettings } from "./CapoSettingsTypes.js";
import type { DelegatedDatumAdapter } from "./delegation/DelegatedDatumAdapter.js";
import type { StellarTestContext } from "./testing/StellarTestContext.js";
import { CapoHeliosBundle } from "./CapoHeliosBundle.js";

// export type BridgeNoSettings = {
//     none: string;
// };
// // export type onChainNoSettings = {
// //     data: {none: "" };
// // };

// export type NoSettings = {
//     id: string;
//     none: string;
// };

// class NoSettingsAdapter extends SettingsAdapter<NoSettings, BridgeNoSettings> {
//     datumName: string = "SettingsData";
//     fromOnchainDatum(
//         // TODO: this type should fail: ParsedSettings<{yuck: string}>
//         //   ... because it doesn't match the underlying adapter bridge (Wrapped...<BridgeNoSettings>)
//         parsedDatum: ParsedSettings< 
//             BridgeNoSettings
//         >
//     ): NoSettings {
//         return {
//             id: parsedDatum.data["@id"],
//             none: "nothing here"
//         };
//     }

//     toOnchainDatum(settings: NoSettings) {
//         return this.inlineDatum("SettingsData", {
//             data: {
//                 "tpe": this.uplcString("set-"),
//                 "@id": this.uplcString("set-42"),
//                 none: this.uplcString("nothing here")
//             }
//         });
//     }
// }

/**
 * @internal
 */
export class CapoWithoutSettings extends Capo<CapoWithoutSettings> {
    // initSettingsAdapter() {
    //     return new NoSettingsAdapter(this);
    // }
    scriptBundle() {
        return new MyCapoBundle();
    }
    
    initDelegatedDatumAdapters(): Promise<Record<string, DelegatedDatumAdapter<any>>> {
        return {} as any
    }

    initDelegateRoles() {
        return this.basicDelegateRoles();
    }

    // async mkInitialSettings() {
    //     return {
    //         none: "🙈" as const,
    //     } //as NoSettings
    // }
}

export default class MyCapoBundle extends CapoHeliosBundle {
}
