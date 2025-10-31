import React, { type ChangeEventHandler, type MouseEventHandler, Component } from "react";
import { type BlockfrostV0Client, type CardanoClient, type Cip30FullHandle, type HydraClientOptions, type SimpleWallet, type Wallet, type WalletHelper } from "@helios-lang/tx-utils";
import type { NetworkParams, TxInput } from "@helios-lang/ledger";
import type { Capo, MinimalCharterDataArgs, namedSubmitters, simpleOgmiosConn, stellarSubclass, submitterName, TxDescription } from "@donecollectively/stellar-contracts";
import { StellarTxnContext, TxBatcher, UutName } from "@donecollectively/stellar-contracts";
/**
 * @public
 */
export type stateUpdaterFunc = CapoDAppProvider<Capo<any>>["updateStatus"];
/**
 * @public
 */
export type errorFunc = CapoDAppProvider<Capo<any>>["reportError"];
/**
 * @public
 */
export type renderFunc = () => JSX.Element | JSX.Element[] | string | void;
/**
 * @public
 */
export type UpdateStateProps = Partial<Omit<CapoDappProviderState<any>, "status">>;
/**
 * @public
 */
export type UpdateStatusProps<T extends UserActionMap<any>> = Omit<CapoDappStatus<T>, "message" | "nextAction"> & {
    nextAction?: string & keyof T;
};
/**
 * @public
 */
export type propsType<CapoType extends Capo<any>> = {
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
    children: React.ReactNode;
};
/**
 * @remarks
 * @public
 */
export type CapoDappProviderState<CapoType extends Capo<any>> = {
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
 * @public
 */
export type SetWalletDetails = {
    walletName: string;
    simpleWallet?: SimpleWallet;
    cip30WalletHandle?: Cip30FullHandle;
    autoNext?: boolean;
};
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
 * use the `uiPortals=` prop to provide dom id's for each type of UI element, if you want
 * to place or style them in a specific location in your layout.  Otherwise, you can simply
 * place (styled or unstyled) <div id="{capoStatus, capoUserDetails, txBatchUI}"> elements in your layout,
 *  and the provider's version of those elements will be rendered into your portals.
 *
 * We recommend providing color themes matching your app's branding; all the provided
 * UI elements are styled with tailwind classes that reference those theme colors.
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
    render(): React.JSX.Element;
    /**
     * Renders a progress bar with a label and optional percentage
     * @remarks
     * The progress bar will be indeterminate if no percentage is provided,
     * showing an indicator of activity without a specific completion percentage.
     */
    renderProgressBar(progressLabel: string, progressPercent?: number): React.ReactNode;
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
    renderPersistentMessage(): React.ReactNode;
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
    renderNotification(): React.ReactNode;
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
    renderErrorStatus(): React.JSX.Element;
    renderNextAction(): React.JSX.Element | undefined;
    renderActionButton(actionKey: string, actionTrigger: MouseEventHandler<HTMLButtonElement>, actionMessage?: string): React.JSX.Element;
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
    renderRoleInfo(): React.JSX.Element | undefined;
    /**
     * displays a single role tag detected for the current user
     * @remarks
     * This method is called by the default renderRoleInfo() method to display a single role tag.
     */
    renderRoleTag(role: string): React.JSX.Element;
    /**
     * renders a lightweight wallet connection button.
     * @remarks
     * It's recommended to override this method to present your preferred
     * wallet connection button.
     *
     * When you detect a wallet change, call the `setWallet()` method to
     * notify the dApp.
     */
    renderWalletInfo(): React.JSX.Element;
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
 * Status info about the current user
 * @remarks
 * Indicates the user's current status and detected roles in the dApp.
 * @public
 */
export type DappUserInfo = {
    selectedWallet?: string;
    connectingWallet: boolean;
    wallet?: Wallet;
    walletHandle?: Cip30FullHandle;
    walletAddress?: string;
    memberUut?: UutName;
    roles: ("member" | "admin")[];
    foundNetworkName: string;
};
/**
 * @public
 */
export type UserAction = {
    label: string;
    trigger: () => void;
};
/**
 * @public
 */
export type BaseUserActionMap = {
    initializeCapo: UserAction;
    retryCreation: UserAction;
};
/**
 * @public
 */
export type UserActionMap<actions extends string> = Record<actions, UserAction> & BaseUserActionMap;
/**
 * @public
 */
export declare const CapoDappProviderContext: React.Context<CapoDAppProvider<any, BaseUserActionMap> | null>;
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
    isMounted: boolean;
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
export type CapoDappStatus<T extends UserActionMap<any> = BaseUserActionMap> = {
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
     * Indicates that the dApp has loaded the user wallet and identified the user's roles.
     */
    ready?: boolean;
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
//# sourceMappingURL=CapoDappProvider.d.ts.map