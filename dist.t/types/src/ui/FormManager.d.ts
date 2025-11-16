import type { Capo, DelegatedDataContract } from "@donecollectively/stellar-contracts";
import type { CapoDAppProvider } from "./CapoDappProvider";
export declare class FormManager<DataContract extends DelegatedDataContract<any, any>> {
    options: FormManagerOptions<DataContract>;
    el: HTMLFormElement;
    provider: CapoDAppProvider<any, any>;
    capo: Capo<any, any>;
    constructor(form: HTMLFormElement, provider: CapoDAppProvider<any, any>, options: FormManagerOptions<DataContract>);
    handleChange(event: Event): void;
    get form(): HTMLFormElement;
    destroy(): void;
    getFieldError(name: string): void;
}
type FormManagerOptions<DataContract extends DelegatedDataContract<any, any>, DataTypeLike extends DataContract extends DelegatedDataContract<infer T, infer TLike> ? TLike : never = DataContract extends DelegatedDataContract<infer T, infer TLike> ? TLike : never> = {
    typeName: DataContract["recordTypeName"];
    recordId: string;
    emptyData: Partial<DataTypeLike>;
};
export declare function useFormManager<DataContract extends DelegatedDataContract<any, any>, DataType extends DataContract extends DelegatedDataContract<infer T, infer TLike> ? T : never = DataContract extends DelegatedDataContract<infer T, infer TLike> ? T : never>(formRef: React.RefObject<HTMLFormElement | null>, options: FormManagerOptions<DataContract>): FormManager<DataContract> | null;
export {};
//# sourceMappingURL=FormManager.d.ts.map