import { BatchSubmitController } from '@donecollectively/stellar-contracts';
import { BlockfrostV0Client } from '@helios-lang/tx-utils';
import { Capo } from '@donecollectively/stellar-contracts';
import { CardanoClient } from '@helios-lang/tx-utils';
import { ChangeEventHandler } from 'react';
import { CharterData } from '@donecollectively/stellar-contracts';
import { Cip30FullHandle } from '@helios-lang/tx-utils';
import { Component } from 'react';
import { HydraClientOptions } from '@helios-lang/tx-utils';
import type { MinimalCharterDataArgs } from '@donecollectively/stellar-contracts';
import { MouseEventHandler } from 'react';
import type { namedSubmitters } from '@donecollectively/stellar-contracts';
import type { NetworkParams } from '@helios-lang/ledger';
import { default as React_2 } from 'react';
import * as React_3 from 'react';
import { ReactNode } from 'react';
import type { simpleOgmiosConn } from '@donecollectively/stellar-contracts';
import { SimpleWallet } from '@helios-lang/tx-utils';
import type { stellarSubclass } from '@donecollectively/stellar-contracts';
import { StellarTxnContext } from '@donecollectively/stellar-contracts';
import type { submitterName } from '@donecollectively/stellar-contracts';
import { TxBatcher } from '@donecollectively/stellar-contracts';
import type { TxDescription } from '@donecollectively/stellar-contracts';
import type { TxInput } from '@helios-lang/ledger';
import { TxSubmitMgr } from '@donecollectively/stellar-contracts';
import { UutName } from '@donecollectively/stellar-contracts';
import { Wallet } from '@helios-lang/tx-utils';
import { WalletHelper } from '@helios-lang/tx-utils';

/**
 * A button that is styled to look like a primary action button
 * @remarks
 * Choose a size= or use "md" as the default.
 *
 * Add a className to provide additional style.
 *
 * Expects tailwind.
 * @public
 */
export declare function ActionButton(props: {
    className?: string;
    onClick?: () => void;
    size?: "xs" | "sm" | "md" | "lg";
    children: React_2.ReactNode;
}): React_2.JSX.Element;

/**
 * @public
 */
export declare type BaseUserActionMap = {
    initializeCapo: UserAction;
    retryCreation: UserAction;
};

/**
 * A button component
 * @remarks
 * Expects tailwind.
 *
 * @public
 */
export declare const Button: (props: SpecialButtonProps) => React_2.JSX.Element;

/**
 * A react component providing services for a dApp using Stellar Contracts
 * @remarks
 * The dApp provider helps dApp developers by managing the lifecycle
 * of wallet connections, user roles, and transaction-processing.
 *
 * It provides default UI elements for status messages and error reporting,
 * while allowing developers to customize the user experience with their own
 * overridden presentation.
 *
 * It supports useState()-compatible state updates via its `onStatusChange=`,
 * `onUserInfo=`, and `onSetCapo=` props.  Alternatively, it can be subclassed
 * and its default renderers overridden for another style of customizing.
 *
 * @public
 */
export declare class CapoDAppProvider<CapoType extends Capo<any>, UserActions extends UserActionMap<any> = BaseUserActionMap> extends Component<propsType<CapoType>, CapoDappProviderState<CapoType>> {
    bf: BlockfrostV0Client;
    capoClass: stellarSubclass<CapoType>;
    static notProse: boolean;
    i: number;
    didWarnDappName: boolean;
    get dAppName(): string | undefined;
    constructor(props: propsType<CapoType>);
    componentDidUpdate(prevProps: propsType<CapoType>, prevState: CapoDappProviderState<CapoType>): void;
    supportedWallets(): string[];
    isWalletSupported(wallet: string): boolean;
    walletIsAvailable(wallet: string): boolean;
    render(): React_2.JSX.Element;
    /**
     * Renders a progress bar with a label and optional percentage
     * @remarks
     * The progress bar will be indeterminate if no percentage is provided,
     * showing an indicator of activity without a specific completion percentage.
     */
    renderProgressBar(progressLabel: string, progressPercent?: number): React_2.ReactNode;
    /**
     * Renders a message when the current status indicates that the
     * user should take some action before continuing, or that the material
     * should persist onscreen.
     * @remarks
     *
     * Customizers may override this method to provide a different presentation
     * than the default.
     *
     * The resulting React elements will be rendered using the InPortal component
     * to direct the presentation into the right area of your application layout.
     *
     * The `message` and `moreInstructions` fields SHOULD normally be displayed
     * for the user.
     *
     * Customizers SHOULD always call \{this._renderNextAction\(\)\}, which will render
     * a button for any next recommended action (if applicable) for the user to take.
     * To customize the action button, override `renderActionButton()`.
     *
     * ### More about message notifications
     *
     * Depending on the details of the current status (the `keepOnscreen` flag),
     * either this method or renderNotification() will be called to display the status
     * message. Developers may override one, the other, or both to customize the
     * presentation of the messages.
     *
     * If the `developerGuidance` field is present for any given message, it SHOULD NOT
     * be displayed in the UI, but can help developers determine how they may guide the
     * user.  In a `development` environment, you MAY wish to show the `developerGuidance`
     * onscreen as well.
     *
     */
    renderPersistentMessage(): React_2.ReactNode;
    /**
     * Renders a message when the current status indicates that the
     * the message is transient and should be cleared after a short time.
     * @remarks
     *
     * By default, this method presents using the renderPersistentMessage() method,
     * though customizers may override this method to provide a different presentation.
     *
     * The provider will automatically update the state to clear the status message
     * after this indicated `clearAfter` time has elapsed.  Customizers using tools
     * that spawn their own notification elements (such as "toast" notifications)
     * should feed the `clearAfter` value into their notification system, and may
     * need to ensure a correct response the message-clearing update (if you get
     * empty toast, you didn't do it right : ).
     *
     * Overriding only renderPersistentMessage() will affect both transient and persistent
     * messages.  Overriding only renderNotification() will affect only transient messages.
     *
     * ### More about message notifications
     *
     * Depending on the details of the current status (the `keepOnscreen` flag),
     * either this method or renderPersistentMessage() will be called to display
     * the status message.  Developers may override one, the other, or both to
     * customize the presentation of the messages.
     *
     * The resulting React elements will be rendered using the InPortal component
     * to direct the presentation into the 'capoStatus' portal element in your application layout.
     */
    renderNotification(): React_2.ReactNode;
    /**
     * Renders a message when the current status indicates that an error has occurred
     * @remarks
     * Customizers may override this method to provide a different presentation for this case.
     *
     * This method SHOULD present the `message` and `moreInstructions` fields to the
     * user, indicate a clear error status for visual purposes, and include `{this._renderNextAction()}`
     * to display any recommended next action for the user to take (customize the button by overriding
     * `renderActionButton()`).
     *
     * Customizers SHOULD also provide a role="alert" attribute for accessibility purposes.
     *
     * The resulting React elements will be rendered using the InPortal component
     * to the 'capoStatus' portal element in your application layout.
     */
    renderErrorStatus(): React_2.JSX.Element;
    private _renderNextAction;
    renderActionButton(actionKey: string, actionTrigger: MouseEventHandler<HTMLButtonElement>, actionMessage?: string): React_2.JSX.Element;
    /**
     * displays a list of detected user roles
     * @remarks
     * This method is called by the default render() method to display the user's roles.
     *
     * Customizers may override this method to provide a different presentation for the user's roles.
     * The default implementation simply emits a list of role tags using react fragments,
     * with no additional envelope or decoration.  If you do this, you SHOULD call
     * renderRoleTag() to display each individual role tag.
     *
     * To customize individual role tags, override `renderRoleTag()` instead.
     *
     * The resulting React elements are normally included in the capoUserInfo portal element.
     * Customizers may use this method directly if using the "headless" uiPortals option.
     */
    renderRoleInfo(): React_2.JSX.Element | undefined;
    /**
     * displays a single role tag detected for the current user
     * @remarks
     * This method is called by the default renderRoleInfo() method to display a single role tag.
     */
    renderRoleTag(role: string): React_2.JSX.Element;
    /**
     * renders a lightweight wallet connection button.
     * @remarks
     * It's recommended to override this method to present your preferred
     * wallet connection button.
     *
     * When you detect a wallet change, call the `setWallet()` method to
     * notify the dApp.
     */
    renderWalletInfo(): React_2.JSX.Element;
    onWalletChange: ChangeEventHandler<HTMLSelectElement>;
    onConnectButton: MouseEventHandler<HTMLButtonElement>;
    componentDidMount(): Promise<void>;
    _isInitializing: Promise<any> | undefined;
    doInitialize(): Promise<void>;
    submitters: namedSubmitters;
    setupSubmitters(): Promise<unknown>;
    _unmounted: boolean;
    componentWillUnmount(): Promise<void>;
    /**
     * @internal
     */
    newWalletSelected(selectedWallet?: string, autoNext?: boolean): Promise<any> | undefined;
    get userInfo(): DappUserInfo;
    walletConnectPromise?: Promise<any>;
    connectWallet(autoNext?: boolean, retries?: number): Promise<any>;
    /**
     * allows setting the wallet for the dApp from a CIP-30 wallet handle
     * @remarks
     * if your application has its own UI for the user to choose their wallet and connect or disconnect,
     * call this method any time a new wallet is selected.
     * @public
     */
    setWallet(details: SetWalletDetails): Promise<any>;
    checkWalletTokens(): Promise<void>;
    getStartedMessage(): string;
    connectCapo(autoNext?: boolean, reset?: "reset"): Promise<any>;
    private isMainnet;
    mkDefaultCharterArgs(): Promise<MinimalCharterDataArgs>;
    bootstrapCapo(): Promise<any>;
    /**
     * sets the state to indicate an error condition and possible next steps
     * @remarks
     */
    reportError(e: Error, prefix: string, addlAttrs: UpdateStatusProps<UserActions>): Promise<any>;
    /**
     * Promise-based wrapper for setState, with status message implicit
     * @remarks
     *
     * sets the status message in state.status, along with any other state props
     *
     * automatically clears nextAction, error, and actionLabels if they aren't
     * explicitly set.
     *
     * returns an await-able promise for setting the indicated state
     *
     * TODO: Notifies state-change through the hooks inidicated in props
     *
     * @public
     **/
    updateStatus(message: string | undefined, statusProps: UpdateStatusProps<UserActions>, extraComment: string, extraState?: UpdateStateProps): Promise<any>;
    /**
     * Defines activities that can be specified as nextAction: ‹key›,
     * and offered to the user as a button to trigger the activity.
     * @remarks
     * Subclasses MAY override this method to provide additional actions
     * and SHOULD include `{ ... super.userActions }`
     */
    get userActions(): UserActions;
    /**
     * emits an object allowing clients to access the provider's capabilities
     * including including status updates, error-reporting and default UI
     * elements
     */
    get capo(): CapoType | undefined;
}

/**
 * @public
 */
export declare const CapoDappProviderContext: React_2.Context<CapoDAppProvider<any, BaseUserActionMap> | null>;

/**
 * @remarks
 * @public
 */
export declare type CapoDappProviderState<CapoType extends Capo<any>> = {
    capo?: CapoType;
    networkParams?: NetworkParams;
    status: CapoDappStatus<any>;
    userInfo: DappUserInfo;
    walletHelper?: WalletHelper<Wallet>;
    walletUtxos?: TxInput[];
    txBatcher?: TxBatcher;
    tcx?: StellarTxnContext<any>;
    bf?: BlockfrostV0Client;
    dAppName?: string;
};

/**
 * Status details emitted by the CapoDappProvider to indicate progress and current state
 * @remarks
 * status updates are emitted via the provider's onStatusChange callback,
 * and are intended to provide signals for the client UI to update its display
 * in response to user actions and other events, while keeping the client
 * in complete control of its presentation of the details.
 *
 * The CapoDappProvider can emit its own UI, using tailwind.css classes,
 * and this status object is intended as an alternative to that, allowing
 * complete customization of the UI.
 *
 * To customize some of the rendering while using the provider's built-in
 * rendering for other aspects, see the provider's `mkCapoSiteCtx()` method
 * and the helper methods it exposes.
 * @public
 */
export declare type CapoDappStatus<T extends UserActionMap<any> = BaseUserActionMap> = {
    /**
     * the current status message to display to the user
     * @remarks
     * to clear the status message, set status to an empty string.  The client MAY
     * choose to continue displaying the last status message after it is cleared, for instance
     * if it queues the message for automatic removal.
     *
     * If the prior message has keepOnscreen: true, the client can EXPECT that
     * the message won't be cleared until some additional activity is initiated,
     * typically by the user.
     */
    message: string | undefined;
    /**
     * Indicates that the message SHOULD be left onscreen, and not automatically removed.
     * @remarks
     * if set, clearAfter will be undefined.
     */
    keepOnscreen?: true | undefined;
    /**
     * A hint for the client to clear the status message after a certain amount of time.
     * @remarks
     * The dApp provider will emit a new status with an empty message after the indicated
     * time.  The client MAY choose to pass the clearAfter hint to a UI-notification library
     * and let it handle the timing & presentation of message-removal; then it can ignore
     * the empty-message update.
     */
    clearAfter?: number;
    /**
     * Indicates that the status message is an error message.  The client SHOULD display
     * the message in a way indicating a problem the user may need to address.  dApps
     * issuing such error indications SHOULD normally include a suggested nextAction
     * to take, such as retrying the creation and/or submission of a transaction.
     */
    isError?: true;
    /**
     * Provides additional guidance, information or instructions for people using the dApp.
     */
    moreInstructions?: string;
    /**
     * Indicates a suggestied next activity for the dApp user to take in response to an error
     * or other status message.
     * @remarks
     * If included, the client SHOULD display a button with the indicated label, and SHOULD
     * call the indicated trigger when the button is clicked.  This trigger will initiate a dApp activity
     * facilitating the next useful step for the user.  Typically this may be an administrative activity,
     * but could also be used for end-user actions related to the dApp's day-to-day functionality,
     * particularly those not needing any special UI.
     *
     * When there is a next action, the button and status message SHOULD be displayed
     * in a way that makes it clear that the user should take the next action, typically by
     * rendering the button and the status message within the same container.
     */
    nextAction?: {
        /**
         * a string identifier for a next action the user may take.  MAY include dApp-specific keys
         */
        key: string & keyof T;
        /**
         * the label to display on the button for the next action
         */
        label: string;
        /**
         * a function to call when the user clicks the button to take the next action
         */
        trigger: () => void;
    };
    /**
     * Indicates that the dApp is currently performing an activity that may take some time to complete.
     * @remarks
     * If the progressBar attribute is provided (truthy), the client SHOULD display an indicator
     * that an activity is pending.  If the value is a string, the client SHOULD display the string
     * as a label for the progress indicator.
     *
     * If the progressPercent attribute is provided, the client SHOULD expect incremental updates with
     * new progressPercent values and the same `message` attribute.  dApps providing progressPercent
     * updates SHOULD include a 100%-completion update when their activity is finished.
     *
     * dApps SHOULD try to include incremental updates (e.g. in moreInstructions) at least every 5-10 seconds
     * to keep the user's trust during activities that may take time to be completed or confirmed.
     *
     * For long-running activities taking more than 30s, the completion message SHOULD be
     * left onscreen, not automatically cleared.
     */
    progressBar?: true | string | undefined;
    /**
     * A percentage value indicating the progress of a long-running activity, when avaialble.
     * @remarks
     * Activities not having any numeric information about progress SHOULD NOT include this attribute.
     * Instead, they MAY wish to indicate some expectations in `moreInstructions` to help the user
     * know what to expect.
     */
    progressPercent?: number | undefined;
    /**
     * When multiple transactions are needed to complete an activity, the pendingTxns attribute
     * provides names, descriptions and more information about those transactions.  The UI MAY
     * display this summary information onscreen to guide the user's understanding of the various steps.
     *
     * Note that pending transactions may be abstract, in the sense that the actual built transaction
     * may not be present when presented in this list.  The client SHOULD limit its display of pendingTxns
     * to the summary information provided.
     *
     * NOTE: The transaction-submission API contains a callback for `beforeSubmit(txn)` that should be used
     * separately from this status-indicator to show further transaction details if needed at the time of
     * submitting a built transaction to the wallet for signing.
     */
    pendingTxns?: TxDescription<any, "resolved">[];
    /**
     * A transaction may trigger additional transactions, and those transactions may further trigger
     * a queue of transactions.  In this case, the nextPendingQueue collects a list of transactions
     * triggered by the transactions seen in `pendingTxns`.  All the `pendingTxns` will be processed
     * before any of the transactions from the `nextPendingQueue`.  Once all the transactions in the
     * `pendingTxns` list are completed, the `pendingTxns` will be replaced with the transactions
     * from the `nextPendingQueue`, and the `nextPendingQueue` will be cleared.
     */
    nextPendingQueue?: TxDescription<any, any>[];
    progressResult?: string;
    /**
     * the dev guidance SHOULD NOT be displayed in-app.  When included,
     * it provides a hint to developers about how to handle current status, prompt, error, etc.
     * dev guidance is not always included
     */
    developerGuidance: string | undefined;
    /**
     * Indicates that the dApp is busy doing something.  Client developers are encouraged to indicate
     * the busy state in a way indicating there is something going on, without discouraging the user from
     * doing anything else like navigating to a different page.
     */
    busy?: true;
};

/**
 * Shows a highlights of various contract elements within a Capo-based dApp
 * @remarks
 * Includes mint and spend delegates, delegated data policies, and named manifest entries
 * @public
 */
export declare function CharterHighlights({ capo, charterData, }: {
    capo: Capo<any, any>;
    charterData: CharterData;
}): React_3.JSX.Element | null;

/**
 * Shows a Capo-based dApp's charter status as a dashboard-style screen
 * @public
 */
export declare function CharterStatus(): React_3.JSX.Element;

/**
 * A React component wrapper that only renders its contents on the client side.
 * @remarks
 * Works with Next.js or any other SSR framework that do not trigger componentDidMount
 * @public
 */
export declare class ClientSideOnly extends React_3.Component<ClientSideOnlyProps, ClientSideOnlyState> {
    constructor(props: ClientSideOnlyProps);
    componentDidMount(): void;
    render(): React_3.DetailedReactHTMLElement<{
        suppressHydrationWarning: true;
    }, HTMLElement>;
}

declare interface ClientSideOnlyProps {
    children: React_3.ReactNode | null;
}

declare interface ClientSideOnlyState {
    isClient: boolean;
}

/**
 * A column for the dashboard layout
 * @remarks
 * Expects tailwind.
 *
 * @public
 */
export declare function Column(props: {
    widthPercent: number;
    children: React_2.ReactNode;
}): React_2.JSX.Element;

/**
 * Status info about the current user
 * @remarks
 * Indicates the user's current status and detected roles in the dApp.
 * @public
 */
export declare type DappUserInfo = {
    selectedWallet?: string;
    connectingWallet: boolean;
    wallet?: Wallet;
    walletHandle?: Cip30FullHandle;
    walletAddress?: string;
    memberUut?: UutName;
    roles: ("member" | "admin" | "artist" | "muNodeOp")[];
    foundNetworkName: string;
};

/**
 * A highlights area for a dashboard layout
 * @remarks
 * children should be <li> elements
 *
 * Expects tailwind.
 * @public
 */
export declare function DashboardHighlights(props: {
    title?: string;
    className?: string;
    colSpan?: string;
    footer?: string | React_2.ReactNode;
    children: React_2.ReactNode;
}): React_2.JSX.Element;

/**
 * A row for a dashboard layout
 * @remarks
 * Expects tailwind.
 * @public
 */
export declare function DashboardRow(props: {
    title?: string;
    children: React_2.ReactNode;
}): React_2.JSX.Element;

/**
 * A summary area for a dashboard layout
 * @remarks
 * Children should be <li> elements or <DashSummaryItem> elements, and are displayed as a grid.
 *
 * Expects tailwind.
 * @public
 */
export declare function DashboardSummary(props: {
    title: string;
    children: React_2.ReactNode;
}): React_2.JSX.Element;

/**
 * A template for a dashboard layout
 * @remarks
 * Expects tailwind.
 * @public
 */
export declare function DashboardTemplate(props: {
    title: string;
    children: React_2.ReactNode;
}): React_2.JSX.Element;

/**
 * A highlight item for a dashboard layout, using a smallish box with vertical (columnar) flex
 * @remarks
 *
 * Add a className to provide additional style.
 *
 * Expects tailwind.
 * @public
 */
export declare function DashHighlightItem(props: {
    title?: string;
    button?: string;
    onClick?: () => void;
    titleClassName?: string;
    className?: string;
    style?: React_2.CSSProperties;
    children: React_2.ReactNode;
    footer?: string | React_2.ReactNode;
}): React_2.JSX.Element;

/**
 * A summary item for a dashboard layout
 * @remarks
 *
 * The first child becomes a low-level (h6) heading
 *
 * Other children are displayed as-is.
 *
 * Expects tailwind.
 * @public
 */
export declare function DashSummaryItem(props: {
    title: string;
    children: React_2.ReactNode;
}): React_2.JSX.Element;

/**
 * @public
 */
export declare type errorFunc = CapoDAppProvider<Capo<any>>["reportError"];

/**
 * shows its content in the theme color of the accent foreground
 * @remarks
 * Allows for any as=‹htmlTag› to be used instead of the default <p> tag.
 *
 * Add a className to provide additional style.
 *
 * Expects tailwind.
 * @public
 */
declare function Highlight_2(props: {
    as?: keyof JSX.IntrinsicElements;
    className?: string;
    children: React_2.ReactNode;
}): React_2.JSX.Element;
export { Highlight_2 as Highlight }

/**
 * Directs react contents into a portal, with simple interface and automatic fallback
 * @public
 */
export declare function InPortal(props: {
    domId: string;
    fallbackLocation?: "top" | "bottom" | "none";
    fallbackHelp?: string;
    fallbackComponent?: React_2.ComponentType<any>;
    delay?: number;
    maxRetries?: number;
    children: ReactNode;
}): React_2.JSX.Element;

/**
 * shows its content in a softened version of the theme color of the accent foreground
 * @remarks
 * Allows for any as=‹htmlTag› to be used instead of the default <p> tag.
 *
 * Add a className to provide additional style.
 *
 * Expects tailwind.
 * @public
 */
export declare function Lowlight(props: {
    as?: keyof JSX.IntrinsicElements;
    className?: string;
    children: React_2.ReactNode;
}): React_2.JSX.Element;

/**
 * @public
 */
export declare type OgmiosEvalFailure = {
    failed: string;
    failure: {
        message: string;
        code: number;
        data: any;
    };
};

/**
 * @public
 */
export declare type PendingTxn = {
    txd: TxDescription<any, any>;
    statusSummary: string;
    mgr?: TxSubmitMgr;
};

/**
 * A progress bar
 * @public
 */
export declare const Progress: ({ children, progressPercent }: ProgressProps) => React_2.JSX.Element;

/**
 * Props for the progress bar
 * @public
 */
declare interface ProgressProps {
    /**
     * The percentage of progress (0-100)
     */
    progressPercent: number;
    children: React_2.ReactNode;
}

/**
 * @public
 */
export declare type propsType<CapoType extends Capo<any>> = {
    capoClass: stellarSubclass<CapoType>;
    targetNetwork: "preview" | "preprod" | "mainnet";
    dAppName?: string;
    supportedWallets?: string[];
    hydra?: boolean | Omit<HydraClientOptions, "isForMainnet">;
    blockfrostKey: string;
    ogmiosConnections?: Record<submitterName, simpleOgmiosConn>;
    otherSubmitters?: namedSubmitters;
    /**
     * indicates DOM id's in which the status, details and wallet info should be displayed
     * @remarks
     * If set to "headless", the provider will not render any UI elements.
     *
     * If unset, the provider will render status, userDetails and walletInfo in dom elements
     * of those same names.
     *
     * If these portals are not present, placeholder portals will be created and warnings
     * will be logged to the console.
     */
    uiPortals?: "headless" | {
        capoStatus: string;
        capoUserDetails: string;
        txBatchUI: string;
    };
    /**
     * Sets initial-page-layout rendering time (in milliseconds) before
     * the provider will create placeholder portals for capoStatus and capoUserDetails
     * @remarks
     * Not used if `uiPortals=` is "headless".  If it is explicitly set with portal-ids,
     * the delay will repeated (up to 10 times) until the portals are found.
     *
     * Default is 150ms - should be enough for most apps
     */
    portalDelay?: number;
    onNetwork?: (network: CardanoClient) => void;
    onUserInfo?: (userInfo: DappUserInfo) => void;
    onStatusChange?: (status: CapoDappStatus<any>) => void;
    onSubmitError?: (txd: TxDescription<any, "built">) => void;
    onContextChange?: (provider?: CapoDAppProvider<CapoType, any>) => void;
    onWalletChange?: (wallet: Wallet | undefined) => void;
    children: React_2.ReactNode;
};

/**
 * @public
 */
export declare type renderFunc = () => JSX.Element | JSX.Element[] | string | void;

/**
 * @public
 */
export declare type SetWalletDetails = {
    walletName: string;
    simpleWallet?: SimpleWallet;
    cip30WalletHandle?: Cip30FullHandle;
    autoNext?: boolean;
};

/**
 * @deprecated - probably not needed anymore
 * @public
 */
export declare function ShowFailedActivity({ failed, failure: { message, code, data, ...otherFailInfo }, ...results }?: OgmiosEvalFailure): React_3.JSX.Element;

/**
 * @deprecated - the CharterStatus component is now preferred
 * @public
 */
export declare function ShowPendingTxns({ pendingTxns, }: {
    pendingTxns: Map<string, PendingTxn>;
}): React_3.JSX.Element;

/**
 * shows its content in a softened version of the theme color of the accent foreground
 * @remarks
 * Allows for any as=‹htmlTag› to be used instead of the default <span> tag.
 *
 * Add a className to provide additional style.
 *
 * Expects tailwind.
 * @public
 */
export declare function Softlight(props: {
    as?: keyof JSX.IntrinsicElements;
    className?: string;
    children: React_2.ReactNode;
}): React_2.JSX.Element;

declare type SpecialButtonProps = (React_2.ComponentPropsWithoutRef<"button"> | React_2.ComponentPropsWithoutRef<"a">) & {
    variant?: "primary" | "secondary" | "secondary-sm";
    href?: string;
};

/**
 * @public
 */
export declare type stateUpdaterFunc = CapoDAppProvider<Capo<any>>["updateStatus"];

/**
 * Shows a master/detail view of the tx batch
 * @remarks
 * Includes a list of txns on the left
 *
 * Shows the details of the selected txn on the right
 *
 * Shows a summary of the batch status at the top
 * @public
 */
export declare function TxBatchViewer({ batch, initialId, }: {
    batch: BatchSubmitController;
    initialId?: string;
}): React_3.JSX.Element;

/**
 * @public
 */
export declare type UpdateStateProps = Partial<Omit<CapoDappProviderState<any>, "status">>;

/**
 * @public
 */
export declare type UpdateStatusProps<T extends UserActionMap<any>> = Omit<CapoDappStatus<T>, "message" | "nextAction"> & {
    nextAction?: string & keyof T;
};

/**
 * React hook for accessing the CapoDappProvider context.
 * @remarks
 * The context data now includes the capo instance as well as the provider.
 *
 * Indicate your Capo's type in the type parameter to access your Capo's methods and properties.
 * @typeParam C - the type of the capo instance
 * @public
 */
export declare function useCapoDappProvider<C extends Capo<any, any> = Capo<any, any>>(): {
    capo: C | undefined;
    provider: CapoDAppProvider<C, BaseUserActionMap>;
};

/**
 * @public
 */
export declare type UserAction = {
    label: string;
    trigger: () => void;
};

/**
 * @public
 */
export declare type UserActionMap<actions extends string> = Record<actions, UserAction> & BaseUserActionMap;

export { }
