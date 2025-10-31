import type { anyDatumProps } from "../StellarContract.js";
/**
 * @public
 */
export type AnyDataTemplate<TYPENAME extends string, others extends anyDatumProps> = {
    [key in string & ("id" | "type" | keyof Omit<others, "id">)]: key extends "id" ? string : key extends "type" ? TYPENAME : others[key];
};
/**
 * for a delegated-data record type, omits the id and type fields to indicate
 * the minimal fields needed for records of that type
 * @public
 */
export type minimalData<T extends AnyDataTemplate<any, anyDatumProps>> = Omit<T, "id" | "type">;
/**
 * @public
 */
export interface hasAnyDataTemplate<DATA_TYPE extends string, T extends anyDatumProps> {
    data: AnyDataTemplate<DATA_TYPE, T>;
}
//# sourceMappingURL=DelegatedData.d.ts.map