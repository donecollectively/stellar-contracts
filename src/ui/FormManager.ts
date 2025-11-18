import type {
    AnyDataTemplate,
    anyDatumProps,
    Capo,
    DelegatedDataContract,
    FoundDatumUtxo,
    minimalData,
    minimalDgDataTypeLike,
} from "@donecollectively/stellar-contracts";
import {
    CapoDAppProvider,
    CapoDappProviderContext,
    useCapoDappProvider,
} from "@donecollectively/stellar-contracts/ui";
import { useCallback, useContext, useEffect, useRef, useState, type RefObject } from "react";

export class FormManager<DataContract extends DelegatedDataContract<any, any>> {
    options: FormManagerOptions<DataContract>;
    el: HTMLFormElement;
    provider: CapoDAppProvider<any, any>;
    capo: Capo<any, any>;
    constructor(
        form: HTMLFormElement,
        provider: CapoDAppProvider<any, any>,
        options: FormManagerOptions<DataContract>
    ) {
        this.el = form;
        this.provider = provider;
        this.capo = provider.capo;
        this.options = options;
        this.handleChange = this.handleChange.bind(this);
        this.el.addEventListener("change", this.handleChange, { capture: true });
    }

    handleChange(event: Event) {
        const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        console.log("change event", target.name, target.value);
    }

    get form() {
        return this.el;
    }
    destroy() {
        this.form.removeEventListener("change", this.handleChange, { capture: true });
    }

    getFieldError(name: string) {
        // TODO: Implement field error checking
        return undefined;
    }
    useRecordId(id: string) {
        const [utxo, setUtxo] = useState<FoundDatumUtxo<any, any> | null>(null);
        useEffect(() => {
            // TODO: Implement record lookup if provider has findRecords method
            // if (this.provider.findRecords) {
            //     this.provider.findRecords(id).then((utxo: FoundDatumUtxo<any, any> | null) => {
            //         setUtxo(utxo);
            //     });
            // }
        }, [id]);

        return utxo;
    }
}

type FormManagerOptions<
    DataContract extends DelegatedDataContract<any, any>,
    DataType extends DataContract extends DelegatedDataContract<infer T, infer TLike>
        ? T
        : never = DataContract extends DelegatedDataContract<infer T, infer TLike> ? T : never,
    DataTypeLike extends DataContract extends DelegatedDataContract<infer T, infer TLike>
        ? TLike
        : never = DataContract extends DelegatedDataContract<infer T, infer TLike> ? TLike : never,
> = {
    typeName: DataContract["recordTypeName"];
    recordId: string;
    emptyData: Partial<DataTypeLike>;
    // mockData: DataTypeLike;
};
// DelegatedDataContract<ErgoDriverData, DriverDataLike>
// export type minimalDriverData = minimalData<DriverDataLike>
// export type DgDataType<T extends DelegatedDataContract<any, any>> =
//     T extends DelegatedDataContract<infer T, infer TLike> ? T : never;

export function useFormManager<DataContract extends DelegatedDataContract<any, any>>(
    options: FormManagerOptions<DataContract>
) {
    const providerContext = useCapoDappProvider();
    if (!providerContext || !providerContext.provider) {
        throw new Error("FormManager: missing required CapoDAppProviderContext");
    }
    const { provider } = providerContext;

    const formManagerRef = useRef<FormManager<DataContract> | null>(null);
    // Track the form element using state - this will trigger re-renders when it changes
    const [formElement, setFormElement] = useState<HTMLFormElement | null>(null);

    // Callback ref that gets called when form element is mounted/unmounted
    // This is the key: callback refs trigger when elements are mounted, unlike RefObjects
    // When the element is mounted, React calls this with the element
    // When unmounted, React calls this with null
    const formCallbackRef = useCallback((element: HTMLFormElement | null) => {
        // State update triggers effect re-run
        setFormElement(element);
    }, []);

    // Create FormManager when form element and provider are available
    useEffect(() => {
        if (formElement && provider && !formManagerRef.current) {
            formManagerRef.current = new FormManager<DataContract>(formElement, provider, options);
        }

        return () => {
            // Cleanup when component unmounts or dependencies change
            if (formManagerRef.current) {
                formManagerRef.current.destroy();
                formManagerRef.current = null;
            }
        };
    }, [provider, formElement, options]);

    // Return both the formManager and the callback ref
    // The component should use formRef on the form element
    return {
        formManager: formManagerRef.current,
        formRef: formCallbackRef,
    };
}
