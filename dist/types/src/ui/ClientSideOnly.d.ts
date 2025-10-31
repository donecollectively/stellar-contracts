import * as React from 'react';
interface ClientSideOnlyProps {
    children: React.ReactNode | null;
}
interface ClientSideOnlyState {
    isClient: boolean;
}
/**
 * A React component wrapper that only renders its contents on the client side.
 * @remarks
 * Works with Next.js or any other SSR framework that do not trigger componentDidMount
 * @public
 */
export declare class ClientSideOnly extends React.Component<ClientSideOnlyProps, ClientSideOnlyState> {
    constructor(props: ClientSideOnlyProps);
    componentDidMount(): void;
    render(): React.DetailedReactHTMLElement<{
        suppressHydrationWarning: true;
    }, HTMLElement>;
}
export {};
//# sourceMappingURL=ClientSideOnly.d.ts.map