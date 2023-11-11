import { Datum, Tx } from "@hyperionbt/helios";

export const DatumInline = Datum.inline;
export type InlineDatum = ReturnType<typeof DatumInline>;
export type tokenNamesOrValuesEntry = [string | number[], bigint];
export type valuesEntry = [number[], bigint];
