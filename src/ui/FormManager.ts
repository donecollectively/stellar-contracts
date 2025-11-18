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
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type RefObject,
} from "react";
import type { CapoDAppProvider } from "./CapoDappProvider";
import { useCapoDappProvider } from "./CapoDappProviderContext";
import type { CapoDatum$Ergo$CharterData } from "@donecollectively/stellar-contracts";

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
        this.el.addEventListener("change", this.handleChange, {
            capture: true,
        });
    }

    handleChange(event: Event) {
        const target = event.target as
            | HTMLInputElement
            | HTMLSelectElement
            | HTMLTextAreaElement;
        console.log("change event", target.name, target.value);
    }

    get form() {
        return this.el;
    }
    destroy() {
        this.form.removeEventListener("change", this.handleChange, {
            capture: true,
        });
    }

    getFieldError(name: string) {}
}

type FormManagerOptions<
    DataContract extends DelegatedDataContract<any, any>,
    DataTypeLike extends DataContract extends DelegatedDataContract<
        infer T,
        infer TLike
    >
        ? TLike
        : never = DataContract extends DelegatedDataContract<
        infer T,
        infer TLike
    >
        ? TLike
        : never
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

export function useFormManager<
    DataContract extends DelegatedDataContract<any, any>,
    DataType extends DataContract extends DelegatedDataContract<
        infer T,
        infer TLike
    >
        ? T
        : never = DataContract extends DelegatedDataContract<
        infer T,
        infer TLike
    >
        ? T
        : never
>(
    formRef: React.RefObject<HTMLFormElement | null>,
    options: FormManagerOptions<DataContract>
) {
    const { capo, provider } = useCapoDappProvider() || {};
    // if (!provider) {
    //     throw new Error(
    //         "FormManager: missing required CapoDAppProviderContext"
    //     );
    // }

    const formManagerRef = useRef<FormManager<DataContract> | null>(null);
    const [controller, setController] = useState<DataContract | undefined>(
        undefined
    );
    useEffect(() => {
        (async function getController() {
            if (!capo) return undefined;
            if (!provider) return undefined;

            const charterData = await capo.findCharterData();

            const controller = (await capo.getDgDataController(
                options.typeName,
                {
                    charterData: charterData as CapoDatum$Ergo$CharterData,
                }
            )) as DataContract;

            setController(controller);
        })();
    }, [capo, options.typeName, provider]);

    const [utxo, setUtxo] = useState<FoundDatumUtxo<DataType, any> | null>(
        null
    );

    useEffect(() => {
        if (!controller) return;
        controller.findRecords({ id: options.recordId }).then((utxo) => {
            setUtxo(utxo);
        });
    }, [controller, options.recordId]);

    useEffect(() => {
        const form = formRef.current;
        if (!controller || !utxo || !form || !capo || !provider) return;
        if (form && !formManagerRef.current) {
            // Create FormManager only once when form element becomes available
            formManagerRef.current = new FormManager<DataContract>(
                form,
                provider,
                options
            );
        }

        return () => {
            // Cleanup when component unmounts
            if (formManagerRef.current) {
                formManagerRef.current.destroy();
                formManagerRef.current = null;
            }
        };
    }, [provider, capo, controller, utxo]);

    return formManagerRef.current;
}
