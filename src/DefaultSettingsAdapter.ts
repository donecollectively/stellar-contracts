import { ConstrData, Datum } from "@hyperionbt/helios";
import { DatumAdapter,  type Numeric,  type adapterParsedOnchainData  } from "./DatumAdapter.js";
import type { AnyDataTemplate } from "./DelegatedDatumAdapter.js";
import type { WrappedSettingsAdapterBridge, ParsedSettings } from "./CapoSettingsTypes.js";


export type RealNumberSettingsMap =  { [key: string]: number };
// export type onchainRealNumberSettingsMap = {
//     data: AnyDataTemplate<"set-", Record<string, bigint>> 
// };

type RealNumberSettingsBridge = Record<string, Numeric<"int">>;

type onChainSettings = adapterParsedOnchainData<
    RealNumberSettingsBridge, 
    "CanBeBadSettings"
>;
type BridgeForSettingsData = WrappedSettingsAdapterBridge<RealNumberSettingsBridge>
export class SampleSettingsAdapter extends DatumAdapter<
    RealNumberSettingsMap,
    BridgeForSettingsData
> {
    datumName: string = "SettingsData";
    fromOnchainDatum(
        parsedDatum: ParsedSettings<BridgeForSettingsData>,
    ): RealNumberSettingsMap {
        console.log("-------------------------------------> ", parsedDatum);
        const settingsMap: Record<string, number> = {};
        for (const [ name, microInt ] of Object.entries(parsedDatum.data)) {
            // get the number found in the microInt
            if (microInt as bigint > Number.MAX_SAFE_INTEGER) {
                throw new Error(
                    `microInt value too large for Number: ${microInt}`
                );
            }
            settingsMap[name] = (0.0 + Number(microInt)) / 1_000_000;
        }
        return settingsMap;
    }
    toOnchainDatum(settings: RealNumberSettingsMap) {
        const { SettingsData: hlSettingsData } = this.onChainDatumType;
        const { RealnumSettingsValueV1 } = this.onChainTypes;

        const {constrIndex} = hlSettingsData.prototype._enumVariantStatement;

        // const variant = hlSettingsData.prototype._enumVariantStatement;
        // const settingsConstrIndex = new hlSettingsData(
        //     "placeholder")._enumVariantStatement.constrIndex;
        // const def = variant.dataDefinition
        // const f0 = def.fields[0];
        // const t = this.configDataToUplc(config);

        // temporarily use the helios on-chain type.  Later this can just return a JSON structure
        // that Helios will easily convert to its on-chain type.
        return Datum.inline(
            new ConstrData(constrIndex, [
                this.toMapData(settings, this.uplcReal)
            ])
        );
        // const t2 = new ConstrData(settingsConstrIndex, [t])
        // const a = hlSettingsData.fromCbor(
        //     ConstrData.fromCbor(t.toCbor())
        // )
        // const tt = t.toCborHex()
        // console.log("--------", tt)
        // throw new Error("ffff");
    }
}
