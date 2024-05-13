import { ConstrData, Datum } from "@hyperionbt/helios";
import { Capo } from "./Capo.js";
import { DatumAdapter, type offchainDatumType, type adapterParsedOnchainData } from "./DatumAdapter.js";
import { SettingsAdapter, type ParsedSettings } from "./CapoSettingsTypes.js";

export type BridgeNoSettings = {
    none: string;
};
// export type onChainNoSettings = {
//     data: {none: "" };
// };

export type NoSettings = {
    none: string;
};

class NoSettingsAdapter extends SettingsAdapter<NoSettings, BridgeNoSettings> {
    datumName: string = "SettingsData";
    fromOnchainDatum(
        // TODO: this type should fail: ParsedSettings<{yuck: string}>
        //   ... because it doesn't match the underlying adapter bridge (Wrapped...<BridgeNoSettings>)
        parsedDatum: ParsedSettings< 
            BridgeNoSettings
        >
    ): NoSettings {
        return {
            none: ""
        };
    }

    toOnchainDatum(settings: NoSettings) {
        const { SettingsData: hlSettingsData } = this.onChainDatumType;

        const {constrIndex} = hlSettingsData.prototype._enumVariantStatement;
        return Datum.inline(
            new ConstrData(constrIndex, [
                this.toMapData({
                    "tpe": this.uplcString("set-"),
                    "@id": this.uplcString("set-42"),
                    none: this.uplcString("")
                })
            ])
        );
    }
}

export class CapoWithoutSettings extends Capo<CapoWithoutSettings> {
    initSettingsAdapter() {
        return new NoSettingsAdapter(this);
    }

    initDelegateRoles() {
        return this.basicDelegateRoles();
    }

    mkInitialSettings() {
        return {
            none: "" as const,
        } //as NoSettings
    }
}

