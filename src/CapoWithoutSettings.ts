import { ConstrData, Datum } from "@hyperionbt/helios";
import { Capo } from "./Capo.js";
import { DatumAdapter, type UplcFor } from "./DatumAdapter.js";

export type onChainNoSettings = {
    data: {none: "" };
};

export type NoSettings = {
    none: "";
};

class NoSettingsAdapter extends DatumAdapter<NoSettings, onChainNoSettings> {
    datumName: string = "SettingsData";
    fromOnchainDatum(parsedDatum: onChainNoSettings): NoSettings {
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

    mkInitialSettings() {
        return {
            none: "" as const,
        } //as NoSettings
    }
}

