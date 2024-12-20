import { Capo } from "./Capo.js";
import { defineRole } from "./delegation/RolesAndDelegates.js";
import { ReqtsController } from "./reqts/ReqtsController.js";

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
    // scriptBundle() {
    //     return new CapoHeliosBundle();
    // }
    
    initDelegateRoles() {
        return {
            ... this.basicDelegateRoles(),
            reqts: defineRole("dgDataPolicy", ReqtsController, {})
        }
    }
    async reqtsController() { 
        return this.getDgDataController("reqts") as Promise<ReqtsController>;
    }
}

