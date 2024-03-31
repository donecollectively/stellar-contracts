import { Datum } from "@hyperionbt/helios";
import { DatumAdapter } from "./DatumAdapter.js";
import type { Capo } from "./Capo.js";

export type RealNumberSettingsMap = { [key: string]: number };
export type onchainRealNumberSettingsMap = {
    data: Array<{
        name: string;
        microInt: bigint;
    }>;
};

export class DefaultSettingsAdapter extends DatumAdapter<
    RealNumberSettingsMap,
    onchainRealNumberSettingsMap,
    Capo<any, any, any, any>
> {
    datumName: string = "SettingsData";
    fromOnchainDatum(
        parsedDatum: onchainRealNumberSettingsMap
    ): RealNumberSettingsMap {
        console.log("-------------------------------------> ", parsedDatum);
        const settingsMap: Record<string, number> = {};
        for (const { name, microInt } of parsedDatum.data) {
            // get the number found in the microInt
            if (microInt > Number.MAX_SAFE_INTEGER) {
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

        // const variant = hlSettingsData.prototype._enumVariantStatement;
        // const settingsConstrIndex = new hlSettingsData(
        //     "placeholder")._enumVariantStatement.constrIndex;
        // const def = variant.dataDefinition
        // const f0 = def.fields[0];
        // const t = this.configDataToUplc(config);

        // temporarily use the helios on-chain type.  Later this can just return a JSON structure
        // that Helios will easily convert to its on-chain type.
        return Datum.inline(
            new hlSettingsData(
                Object.entries(settings).map(([k, v]) => {
                    const microInt = BigInt(v) * 1_000_000n;
                    if (microInt > Number.MAX_SAFE_INTEGER) {
                        throw new Error(
                            `microInt value too large for Number: ${microInt}`
                        );
                    }

                    return new RealnumSettingsValueV1(k, microInt);
                })
            )._toUplcData()
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
