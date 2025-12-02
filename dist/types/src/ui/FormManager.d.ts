import type { Capo, DelegatedDataContract, FoundDatumUtxo } from "@donecollectively/stellar-contracts";
import { CapoDAppProvider } from "@donecollectively/stellar-contracts/ui";
export declare class FormManager<DataContract extends DelegatedDataContract<any, any>> {
    options: FormManagerOptions<DataContract>;
    el: HTMLFormElement;
    provider: CapoDAppProvider<any, any>;
    capo: Capo<any, any>;
    constructor(form: HTMLFormElement, provider: CapoDAppProvider<any, any>, options: FormManagerOptions<DataContract>);
    handleChange(event: Event): void;
    get form(): HTMLFormElement;
    destroy(): void;
    getFieldError(name: string): undefined;
    useRecordId(id: string): FoundDatumUtxo<any, any> | null;
}
type FormManagerOptions<DataContract extends DelegatedDataContract<any, any>, DataType extends DataContract extends DelegatedDataContract<infer T, infer TLike> ? T : never = DataContract extends DelegatedDataContract<infer T, infer TLike> ? T : never, DataTypeLike extends DataContract extends DelegatedDataContract<infer T, infer TLike> ? TLike : never = DataContract extends DelegatedDataContract<infer T, infer TLike> ? TLike : never> = {
    typeName: DataContract["recordTypeName"];
    recordId: string;
    emptyData?: Partial<DataTypeLike>;
};
export declare function useFormManager<DataContract extends DelegatedDataContract<any, any>>(options: FormManagerOptions<DataContract>): {
    formManager: FormManager<DataContract> | null;
    formRef: (element: HTMLFormElement | null) => void;
};
export {};
//# sourceMappingURL=FormManager.d.ts.map