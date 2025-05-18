"use client";
import React, {
    type ChangeEventHandler,
    type MouseEventHandler,
    Component,
    Fragment,
} from "react";
import {
    makeHydraClient,
    makeRandomRootPrivateKey,
    makeRootPrivateKey,
    type BlockfrostV0Client,
    type CardanoClient,
    type Cip30FullHandle,
    type Cip30Wallet,
    type HydraClientOptions,
    type SimpleWallet,
    type TxChainBuilder,
    type Wallet,
    type WalletHelper,
} from "@helios-lang/tx-utils";
import type { NetworkParams, Tx, TxInput } from "@helios-lang/ledger";
import {
    makeBlockfrostV0Client,
    makeCip30Wallet,
    makeRandomSimpleWallet,
    makeSimpleWallet,
    makeTxChainBuilder,
    makeWalletHelper,
} from "@helios-lang/tx-utils";

import {
    TransactionSubmission,
    type Connection,
    type ConnectionConfig,
    createInteractionContext,
    createTransactionSubmissionClient,
    createLedgerStateQueryClient,
} from "@cardano-ogmios/client";

import type {
    Capo,
    CapoConfig,
    ConfigFor,
    MinimalCharterDataArgs,
    namedSubmitters,
    simpleOgmiosConn,
    StellarFactoryArgs,
    stellarSubclass,
    submitterName,
    TxBatcherOptions,
    TxDescription,
} from "@donecollectively/stellar-contracts";

import {
    GenericSigner,
    OgmiosTxSubmitter,
    StellarTxnContext,
    TxBatcher,
    UutName,
    dumpAny,
    parseCapoJSONConfig,
} from "@donecollectively/stellar-contracts";

import { Button } from "./Button.js";
import { InPortal } from "./inPortal.js";
import { Progress } from "./Progress.js";
import { ClientSideOnly } from "./ClientSideOnly.js";
import { TxBatchUI } from "./TxBatchUI.js";
import { environment } from "../environment.js";
import { bytesToHex, hexToBytes } from "@helios-lang/codec-utils";

// Making your own dApp using Stellar Contracts?  Here's how to get started:
//   First, use the "null" config here.
//   Next, charter your Capo using the guide in the README file.
//   Do any development work you'd like to do; incremental configurations
//     ... are stored in localStorage.
//   When you're ready, paste the configuration (see "deploy this!" in the console logs)
//     ... in place of the non-null config structure below.
//
//
const ourCapoConfig = null;

//!!! comment out the following block while using the "null" config.
// const ourCapoConfig = {
//     mph: { bytes: "1caa8526c25066237f4d1e5e271790fa7de0bc286c1b39ccac076f92" },
//     rev: "1",
//     isDev: true,
//     seedTxn: {
//         bytes: "ebea3b3fe691b71fa254682e9232ab14540ea694c13945ac41d32c6487c1e21e",
//     },
//     seedIndex: "5",
//     rootCapoScriptHash: {
//         bytes: "d3b181cdf036c70178ae4763a0a50f2f829cf8a50abdc59c41958d17",
//     },
// };

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

const networkNames = {
    0: "preprod",
    1: "mainnet",
    2: "preview",
};

let mountCount = 0;

// const bfKeys = {
//     mainnet: "mainnetvtlJdtsOo7nNwf58Az9F5HRDGCIkxujZ",
//     preprod: "preprodCwAM4ABR6SowGsmURORvDJvQTyWmCHJP",
// };

/**
 * @public
 */
export type UpdateStateProps = Partial<
    Omit<CapoDappProviderState<any>, "status">
>;

/**
 * @public
 */
export type UpdateStatusProps<T extends UserActionMap<any>> = Omit<
    CapoDappStatus<T>,
    "message" | "nextAction"
> & {
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
    uiPortals?:
        | "headless"
        | {
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
    // provider.mkCapoSiteCtx();onContextChange

    onContextChange?: (provider?: CapoDAppProvider<CapoType, any>) => void;
    onWalletChange?: (wallet: Wallet | undefined) => void;
    children: React.ReactNode;
    // ??current-transaction display/state-change hook
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
    // showDetail?: string;
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
 * @public
 */
export class CapoDAppProvider<
    CapoType extends Capo<any>,
    UserActions extends UserActionMap<any> = BaseUserActionMap
> extends Component<propsType<CapoType>, CapoDappProviderState<CapoType>> {
    bf: BlockfrostV0Client;
    // bfFast: TxChainBuilder & BlockfrostV0Client;
    capoClass: stellarSubclass<CapoType>;
    static notProse = true;
    i: number = 0;
    didWarnDappName = false;
    get dAppName() {
        if (!this.props.dAppName && !this.didWarnDappName) {
            console.warn(
                "using generic dAppName.  Override it in props `dAppName=`, if you wish"
            );
            this.didWarnDappName = true;
            return "dApp contract";
        }
        return this.props.dAppName;
    }
    constructor(props: propsType<CapoType>) {
        super(props);
        this.capoClass = props.capoClass;
        this.i = mountCount += 1;
        this.bootstrapCapo = this.bootstrapCapo.bind(this);
        this.connectCapo = this.connectCapo.bind(this);

        this.updateStatus = this.updateStatus.bind(this);
        this.reportError = this.reportError.bind(this);
        this.renderRoleInfo = this.renderRoleInfo.bind(this);
        this.renderActionButton = this.renderActionButton.bind(this);
        this.renderWalletInfo = this.renderWalletInfo.bind(this);
        this.renderProgressBar = this.renderProgressBar.bind(this);
        this.renderPersistentMessage = this.renderPersistentMessage.bind(this);
        this.renderNotification = this.renderNotification.bind(this);
        this.renderErrorStatus = this.renderErrorStatus.bind(this);

        this.connectWallet = this.connectWallet.bind(this);
        this.bf = makeBlockfrostV0Client(
            props.targetNetwork,
            props.blockfrostKey
        );
        this.state = {
            status: {
                message: `... connecting to ${this.dAppName} ...`,
                keepOnscreen: true,

                developerGuidance:
                    "... discovering the on-chain status e.g. from blockfrost",
            },
            userInfo: {
                roles: [],
                foundNetworkName: "",
                connectingWallet: false,
            },
            txBatcher: undefined,
            bf: this.bf,
            dAppName: this.dAppName,
        };
        // this.bfFast = makeTxChainBuilder(this.bf);
    }

    componentDidUpdate(
        prevProps: propsType<CapoType>,
        prevState: CapoDappProviderState<CapoType>
    ) {
        if (prevProps.dAppName !== this.props.dAppName) {
            this.setState({ dAppName: this.dAppName });
        }
        const { capo, userInfo, status } = this.state;
        if (this.props.onUserInfo && userInfo !== prevState.userInfo) {
            this.props.onUserInfo(userInfo);
        }
        if (this.props.onStatusChange && status !== prevState.status) {
            this.props.onStatusChange(status);
        }
        if (this.props.onContextChange && capo !== prevState.capo) {
            this.props.onContextChange(this);
        }
        if (
            this.props.onWalletChange &&
            userInfo.wallet !== prevState.userInfo.wallet
        ) {
            this.props.onWalletChange(userInfo.wallet);
        }
    }

    supportedWallets() {
        return ["eternl", "zwallet"];
    }

    isWalletSupported(wallet: string) {
        const supported =
            this.props.supportedWallets ?? this.supportedWallets();

        return supported.includes(wallet);
    }

    walletIsAvailable(wallet: string) {
        if (wallet === "zwallet") {
            return true;
        }
        return !!(window as any).cardano?.[wallet];
    }

    render() {
        let {
            tcx,
            capo,
            walletUtxos,
            walletHelper,
            userInfo: { wallet, connectingWallet, roles, memberUut: collabUut },
            status: {
                moreInstructions,
                message,
                progressBar,
                progressPercent,
                keepOnscreen,
                clearAfter,
                isError,
            },
        } = this.state;
        const { children = <></>, uiPortals, portalDelay } = this.props;

        if ("headless" == uiPortals) {
            return (
                <CapoDappProviderContext.Provider value={this}>
                    {children}
                </CapoDappProviderContext.Provider>
            );
        }

        let results: React.ReactNode = children;
        // if (isError) {
        //     results = <>
        //         {/* <div>Fix the problem before continuing.</div> */}
        //         {children}
        //     </>;
        // }

        // const loading = <Progress key={status}>loading</Progress>;
        const walletInfo = this.renderWalletInfo();
        const showProgressBar = !!progressBar;

        const roleInfo = this.renderRoleInfo();
        const capoInfo =
            "development" == process.env.NODE_ENV && capo?._compiledScript
                ? <div className="inline-block flex flex-row">
                    {/* show a chip with the capo address, short until expanded on hover */}
                    {/* leaves space for a hat icon on its left */}
                    <span
                        className="mb-0 pl-2 text-black overflow-hidden max-w-48 hover:max-w-full inline-block rounded border border-slate-500 bg-blue-500 px-2 py-0 text-sm shadow-none outline-none hover:cursor-text"
                    >
                        Capo&nbsp;{capo.address.toString()}
                    </span>&nbsp;
                    {roleInfo}
                </div>
                : "";
        {
            capoInfo ? "address: " + capoInfo : "";
        }

        const portalFallbackMessage = {
            fallbackHelp:
                "CapoDAppProvider: set the uiPortals= prop and/or provide the expected portal elements in the DOM",
        };
        // const inviteLink = roles?.includes("admin") ? this.inviteButton() : "";
        const userDetails = (
            <InPortal
                key="capoUserDetails"
                domId={uiPortals?.capoUserDetails ?? "capoUserDetails"}
                maxRetries={uiPortals ? 10 : 1}
                fallbackLocation="top"
                {...{ delay: portalDelay, portalFallbackMessage }}
            >
                 {capoInfo} 
                {walletInfo}
                {/* {inviteLink} */}
            </InPortal>
        );

        const txBatchUI = (
            <InPortal
                key="txBatchUI"
                domId={uiPortals?.txBatchUI ?? "txBatchUI"}
                fallbackLocation="top"
            >
                <TxBatchUI />
            </InPortal>
        );

        const progressLabel = "string" == typeof progressBar ? progressBar : "";

        const renderedStatus =
            (message && (
                <InPortal
                    key="capoStatus"
                    domId={uiPortals?.capoStatus ?? "capoStatus"}
                    fallbackLocation="bottom"
                    {...{ delay: portalDelay, portalFallbackMessage }}
                >
                    <div className="z-40 opacity-60">
                        {showProgressBar
                            ? this.renderProgressBar(
                                  progressLabel,
                                  progressPercent
                              )
                            : ""}
                        {isError
                            ? this.renderErrorStatus()
                            : keepOnscreen
                            ? this.renderPersistentMessage()
                            : this.renderNotification()}
                    </div>
                </InPortal>
            )) ||
            "";

        return (
            <ClientSideOnly
                children={
                    <CapoDappProviderContext.Provider value={this}>
                        <div>
                            {renderedStatus}
                            {userDetails}
                            {txBatchUI}
                            {results as any}
                        </div>
                    </CapoDappProviderContext.Provider>
                }
            />
        );
    }

    /**
     * Renders a progress bar with a label and optional percentage
     * @remarks
     * The progress bar will be indeterminate if no percentage is provided,
     * showing an indicator of activity without a specific completion percentage.
     */
    renderProgressBar(
        progressLabel: string,
        progressPercent?: number
    ): React.ReactNode {
        const pp: any = progressPercent ? { progressPercent } : {};

        return (
            <Progress key="capoProgress" {...pp}>
                {progressLabel}
            </Progress>
        );
    }

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
    renderPersistentMessage(): React.ReactNode {
        const {
            status: { moreInstructions, message, isError },
        } = this.state;
        const statusClass =
            //  !isError
            //     ? "font-bold bg-red-800 text-orange-200" :
            "bg-blue-300 border-blue-500 text-black font-bold dark:bg-blue-900 dark:text-blue-300";
        return (
            <div
                className={`flex flex-row w-full status min-h-10 relative left-0 top-0 mb-4 rounded border p-1 ${statusClass}`}
                key="persistentMessage"
                role="banner"
            >
                <div className="">
                    <span key="status" className="block sm:inline">
                        {message}
                    </span>
                    <div className="text-sm text-gray-700 dark:text-gray-300 italic">
                        {moreInstructions}
                    </div>
                </div>

                <div className="mr-2 flex-grow">{this._renderNextAction()}</div>
            </div>
        );
    }

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
    renderNotification(): React.ReactNode {
        return this.renderPersistentMessage();
    }

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
    renderErrorStatus() {
        const {
            status: { moreInstructions, message },
        } = this.state;
        return (
            <div
                className="flex flex-row w-full error min-h-10 relative left-0 top-0 mb-4 rounded border p-1 font-bold bg-[#e7560a] text-black"
                role="alert"
                key="errorStatus"
            >
                <div className="">
                    <strong className="font-bold">Whoops! &nbsp;&nbsp;</strong>
                    <span key="status-err" className="block sm:inline">
                        {message!.split("\n").map((line, i) => (
                            <React.Fragment key={`line-${i}`}>
                                {line}
                                <br />
                            </React.Fragment>
                        ))}
                    </span>
                    <div className="text-sm italic">{moreInstructions}</div>
                </div>

                <div className="mr-2 flex-grow text-nowrap">
                    {this._renderNextAction()}
                </div>
            </div>
        );
    }

    private _renderNextAction() {
        const {
            status: {
                nextAction: {
                    key: actionKey,
                    label: actionMessage,
                    trigger: actionTrigger,
                } = {},
            },
        } = this.state;

        if (!actionKey) return;
        if (!actionTrigger) {
            console.error("no action trigger for next action", actionKey);
            return;
        }
        return this.renderActionButton(actionKey, actionTrigger, actionMessage);
    }

    renderActionButton(
        actionKey: string,
        actionTrigger: MouseEventHandler<HTMLButtonElement>,
        actionMessage?: string
    ) {
        return (
            <button
                className="btn float-right ml-1 rounded-md border-2 border-amber-800 bg-blue-900 p-2 text-white hover:bg-blue-600 dark:border-amber-700 dark:bg-blue-200 dark:text-black dark:hover:bg-blue-50"
                onClick={actionTrigger}
            >
                {actionMessage || this.userActions[actionKey].label}
            </button>
        );
    }

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
    renderRoleInfo() {
        const {
            userInfo: { roles },
        } = this.state;
        if (!roles) return;

        return (
            <>
                {roles.map((r) => {
                    return (
                        <Fragment key={`role-${r}`}>
                            {this.renderRoleTag(r)}
                        </Fragment>
                    );
                })}
            </>
        );
    }

    /**
     * displays a single role tag detected for the current user
     * @remarks
     * This method is called by the default renderRoleInfo() method to display a single role tag.
     */
    renderRoleTag(role: string) {
        return (
            <span className="ml-1 mb-0 inline-block rounded border border-slate-500 bg-emerald-800 px-2 py-0 text-sm text-slate-400 shadow-none outline-none transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:cursor-text">
                {role}
            </span>
        );
    }

    // doAction(action) {
    //     const actions = {
    //         initializeCapo: this.bootstrapCapo,
    //         retryCreation: this.connectCapo,
    //     };
    //     const thisAction = actions[action];
    //     thisAction.call(this);
    // }

    /**
     * renders a lightweight wallet connection button.
     * @remarks
     * It's recommended to override this method to present your preferred
     * wallet connection button.
     *
     * When you detect a wallet change, call the `setWallet()` method to
     * notify the dApp.
     */
    renderWalletInfo() {
        const {
            userInfo: {
                wallet,
                walletAddress,
                connectingWallet,
                foundNetworkName,
            },
        } = this.state;

        if (wallet) {
            return (
                <div className="flex flex-row">
                    {walletAddress && ( 
                        <span
                            key="chip-walletAddr"
                            // make it small by default, but allow it to grow on hover
                            // also, make it right-aligned and chop the overflow
                            // color the text black
                            className="mb-0 text-black overflow-hidden max-w-24 hover:max-w-full inline-block rounded border border-slate-500 bg-blue-500 px-2 py-0 text-sm shadow-none outline-none hover:cursor-text"
                        >
                            {walletAddress}
                        </span>
                    )}
                    &nbsp;
                    <span
                        key="chip-networkName"
                        className="mb-0 inline-block rounded border border-slate-500 bg-blue-900 px-2 py-0 text-sm text-slate-400 shadow-none outline-none transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:cursor-text"
                    >
                        {foundNetworkName}
                    </span>
                </div>
            );
        } else if (connectingWallet) {
            return (
                <div>
                    <Button variant="secondary" disabled className="-mt-3">
                        ... connecting ...
                    </Button>
                </div>
            );
        } else {
            return (
                <div>
                    <select onChange={this.onWalletChange}>
                        <option value="zwallet">Zero Wallet</option>
                        <option value="eternl">Eternl</option>
                    </select>
                    <Button
                        variant="secondary"
                        className="-mt-3"
                        onClick={this.onConnectButton}
                    >
                        Connect Wallet
                    </Button>
                </div>
            );
        }
    }

    onWalletChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
        this.newWalletSelected(event.target.value);
    };

    onConnectButton: MouseEventHandler<HTMLButtonElement> = async (event) => {
        this.connectWallet();
    };

    // txnDump() {
    //     const { tcx } = this.state;
    //     if (!tcx) return;

    //     const built = await tcx.build();
    //     const txnDump = tcx.dump();
    //     {
    //         txnDump && (
    //             <pre
    //                 style={{
    //                     color: "#999",
    //                     border: "1px dashed #505",
    //                     borderRadius: "0.5em",
    //                 }}
    //             >
    //                 {txnDump}

    //                 {tcx.state.bsc &&
    //                     JSON.stringify(tcx.state.bootstrappedConfig, null, 2)}
    //             </pre>
    //         );
    //     }
    // }

    //  ---- Component setup sequence starts here
    //  -- step 1: get blockfrost's network params
    async componentDidMount() {
        // in dev environment, React re-mounts the same component : /
        if (this._unmounted) this._unmounted = false;

        if (this._unmounted) {
            // debugger;
            return;
        }

        this._isInitializing = this._isInitializing || this.doInitialize();
    }
    _isInitializing: Promise<any> | undefined = undefined;
    async doInitialize() {
        const networkParams: NetworkParams = await this.bf.parameters;

        if ("undefined" != typeof window) {
            const autoWallet = window.localStorage.getItem(
                "capoAutoConnectWalletName"
            );
            if (autoWallet) {
                await this.newWalletSelected(autoWallet, false);
            }
        }

        // await this.updateState('connecting to wallet', {
        await this.updateStatus(
            "initializing on-chain contracts",
            {
                developerGuidance: "status message for the user",
            },
            "//component did mount",
            {
                networkParams,
            }
        );
        if (this.props.onNetwork) this.props.onNetwork(this.bf);
        if (this.props.onStatusChange)
            this.props.onStatusChange(this.state.status);
        if (this.props.onUserInfo) this.props.onUserInfo(this.state.userInfo);

        if (this.props.onContextChange) this.props.onContextChange(this);
        // if (this.props.onWalletChange) this.props.onWalletChange(undefined);

        await this.updateStatus(
            "setting up tx submitters",
            {
                developerGuidance: "just show the message to the user",
            },
            "//setupSubmitters"
        );
        await this.setupSubmitters();

        this.connectCapo();
    }
    submitters: namedSubmitters = {};

    async setupSubmitters() {
        this.submitters = {
            blockfrost: this.bf,
            ...(this.props.otherSubmitters || {}),
        };
        for (const [name, conn] of Object.entries(
            this.props.ogmiosConnections || {}
        )) {
            if (name in this.submitters) {
                throw new Error(
                    `ogmios submitter ${name} conflicts with other implied or provided submitter`
                );
            }

            this.submitters[name] = await OgmiosTxSubmitter.withOgmiosConn(
                this.isMainnet(),
                conn
            );
        }
        const { promise, resolve } = Promise.withResolvers();
        const { networkParams, userInfo: { wallet } = {} } = this.state;
        if (!networkParams) {
            throw new Error("network params not available");
        }

        // const wallet = makeCip30Wallet(walletHandle);
        // const {txBatcher} = this.state
        // if (txBatcher) {
        //     txBatcher.signingStrategy = new GenericCip30Signer(wallet)
        // }

        const txBatcherOptions: TxBatcherOptions = {
            submitters: this.submitters,
        };
        if (wallet) {
            txBatcherOptions.signingStrategy = new GenericSigner(wallet);
        }
        this.setState(
            {
                txBatcher: new TxBatcher(txBatcherOptions),
                // , {
                //     network: this.bf,
                //     networkParams,
                // }),
            },
            () => resolve("")
        );

        return promise;
    }

    _unmounted = false;
    async componentWillUnmount() {
        this._unmounted = true;

        // not really an error - just big and red so it's super obvious when it happens
        console.error("capo dApp provider unmounted");
    }

    /**
     * @internal
     */
    newWalletSelected(selectedWallet: string = "eternl", autoNext = true) {
        if (!this.isWalletSupported(selectedWallet)) {
            debugger;
            this.reportError(
                new Error("wallet not supported"),
                `selected wallet '${selectedWallet}' not supported`,
                {
                    developerGuidance:
                        "let the user know to install the wallet plugin",
                }
            );
            return;
        }

        if (!this.walletIsAvailable(selectedWallet)) {
            this.reportError(
                new Error(`wallet '${selectedWallet}' not available`),
                `selected wallet '${selectedWallet}' isn't activated - enable the browser extension to continue`,
                {
                    developerGuidance:
                        "let the user know to install the wallet plugin",
                }
            );
            return;
        }

        return new Promise<void>((resolve) => {
            this.setState(
                {
                    userInfo: {
                        ...this.state.userInfo,
                        selectedWallet,
                    },
                },
                () => resolve()
            );
        }).then(() => {
            return this.connectWallet(autoNext);
        });
    }

    get userInfo() {
        return this.state.userInfo;
    }

    //  -- step 2: connect to Cardano wallet
    walletConnectPromise?: Promise<any>;

    async connectWallet(autoNext = true, retries = 5) {
        const {
            userInfo,
            userInfo: { wallet: alreadyConnected, selectedWallet = "eternl" },
            capo,
        } = this.state;
        if (this._unmounted) {
            debugger;
            return true;
        }
        if (alreadyConnected) return true;

        if (!this.isWalletSupported(selectedWallet)) {
            this.reportError(
                new Error(`wallet '${selectedWallet}' not supported`),
                `selected wallet '${selectedWallet}' isn't supported`,
                {
                    developerGuidance:
                        "let the user know to install the wallet plugin",
                }
            );
            return;
        }
        if (!this.walletIsAvailable(selectedWallet)) {
            this.reportError(
                new Error(`wallet '${selectedWallet}' not available`),
                `selected wallet '${selectedWallet}' isn't activated - enable the browser extension to continue`,
                {
                    developerGuidance:
                        "let the user know to install the wallet plugin",
                }
            );
            return;
        }
        //! it suppresses lame nextjs/react-sourced double-trigger of mount sequence
        // if (this._unmounted) return
        // debugger
        if (this.walletConnectPromise) {
            console.warn(
                "suppressing redundant wallet connect, already pending"
            );

            return this.walletConnectPromise;
        }

        await this.updateStatus(
            "connecting to Cardano wallet",
            {
                progressBar: true,
                developerGuidance: "just a status message for the user",
            },
            "//connecting wallet",
            {
                userInfo: { ...userInfo, connectingWallet: true },
            }
        );
        let simpleWallet: SimpleWallet | undefined;
        let walletHandle: Cip30FullHandle | undefined;
        if (selectedWallet === "zwallet") {
            let privKeyHex = window.localStorage.getItem("zwk");
            if (!privKeyHex) {
                const entropy = makeRandomRootPrivateKey().entropy;
                privKeyHex = bytesToHex(entropy);
                window.localStorage.setItem("zwk", privKeyHex);
            }
            const privKey = makeRootPrivateKey(hexToBytes(privKeyHex));

            // const capo = this.state.capo;
            // if (!capo) {
            //     throw new Error("capo not initialized")
            // }
            const isMainnet = this.props.targetNetwork === "mainnet";
            const useHydra = !!this.props.hydra;
            const hydraOptions: HydraClientOptions | undefined=
                useHydra
                    ? {
                          ...(this.props.hydra === true ? {} : this.props.hydra),
                          isForMainnet: isMainnet,
                      }
                    : undefined;
            let networkClient = useHydra ? makeHydraClient(WebSocket, {
                onReceive(message) {
                    console.log("onReceive", message);
                },
                isForMainnet: isMainnet,
                ...hydraOptions,
            }) : this.bf;
            simpleWallet = makeSimpleWallet(privKey, networkClient);
        } else {
            if (!!this.props.hydra) {
                throw new Error("hydra not supported for this wallet");
            }
            const connecting = (this.walletConnectPromise =
                //@ts-expect-error on Cardano
                window.cardano[selectedWallet]?.enable());
            walletHandle = await connecting.catch((e: any) => {
                simpleWallet = undefined;

                // eternl plugin seems to have a race for initializing
                // the wallet connection, when we do auto-connect.
                if (!!retries && e.message.match(/no account set/)) {
                    const delay = Math.pow(1.6, 5 - retries) * 200;
                    return new Promise((res) => setTimeout(res, delay)).then(
                        () => {
                            return this.connectWallet(autoNext, retries - 1);
                        }
                    );
                }
                this.reportError(e, "wallet connect", {
                    developerGuidance:
                        "guide the user to get connected to a supported wallet plugin",
                });
            });

            if (!walletHandle) return;
        }

        return this.setWallet({
            cip30WalletHandle: walletHandle,
            simpleWallet: simpleWallet,
            walletName: selectedWallet,
            autoNext,
        });
    }

    /**
     * allows setting the wallet for the dApp from a CIP-30 wallet handle
     * @remarks
     * if your application has its own UI for the user to choose their wallet and connect or disconnect,
     * call this method any time a new wallet is selected.
     * @public
     */
    async setWallet(details: SetWalletDetails) {
        let {
            walletName,
            simpleWallet,
            cip30WalletHandle: walletHandle,
            autoNext = true,
        } = details;
        if (!simpleWallet && !walletHandle) {
            debugger;
            throw new Error("wallet or walletHandle is required");
        }

        let wallet: Wallet | undefined = simpleWallet;
        let addrString: string | undefined;
        console.warn("CIP-30 Wallet Handle", walletHandle);

        let foundNetworkName: string | undefined;
        if (walletHandle) {
            const netId = await walletHandle.getNetworkId();
            const addr = (await walletHandle.getUsedAddresses())[0];
            addrString = addr
            foundNetworkName = networkNames[netId];
            if (foundNetworkName !== this.props.targetNetwork) {
                return this.updateStatus(
                    `This application is only available on the ${this.props.targetNetwork} network.  Your wallet is connected to network ${netId} (${foundNetworkName})`,
                    {
                        isError: true,
                        developerGuidance:
                            "when the user switches networks, the dApp should automatically(?) reconnect",
                    },
                    "//wallet not on expected network",
                    {
                        userInfo: {
                            ...this.userInfo,
                            connectingWallet: false,
                            walletAddress: addrString,
                            foundNetworkName: foundNetworkName || "‹unknown›",
                        },
                    }
                );
            }

            if (this.bf.networkName !== foundNetworkName) {
                //! checks that wallet network matches network params / bf
                this.updateStatus(
                    `wallet network mismatch; expected ${this.bf.networkName}, wallet ${foundNetworkName}`,
                    {
                        isError: true,
                        developerGuidance:
                            "the dApp should automatically(?) reconnect when the user switches networks",
                    },
                    "//wallet network doesn't match bf network",
                    {
                        userInfo: {
                            ...this.userInfo,
                            connectingWallet: false,                            
                            walletAddress: addrString,
                            foundNetworkName,
                        },
                    }
                );
                return;
            }
            wallet = makeCip30Wallet(walletHandle);
        } else {
            if (!simpleWallet) {
                throw new Error("wallet not found"); // for TypeScript
            }
            wallet = simpleWallet;
            foundNetworkName = this.props.targetNetwork;
            if (this.capo) {
                this.capo.setup.network = simpleWallet.cardanoClient;
                this.capo.setup.actorContext.wallet = wallet;
            }
            const networkParams = await simpleWallet.cardanoClient.parameters;
            const addr = (await wallet.usedAddresses)[0];
            addrString = addr.toString();
            await this.updateStatus(
                "connected with zero-wallet",
                {
                    developerGuidance: "status message for the user",
                },
                "// zero-wallet connected",
                {
                    networkParams,
                    userInfo: {
                        ...this.userInfo,
                        connectingWallet: false,
                        wallet,
                        walletAddress: addrString,
                    },
                }
            );
        }
        if (!wallet) {
            throw new Error("wallet not found"); // for TypeScript
        }
        const { txBatcher } = this.state;

        if (txBatcher) {
            txBatcher.signingStrategy = new GenericSigner(wallet);
        }

        const walletHelper = makeWalletHelper(wallet);
        if ("undefined" !== typeof window) {
            if (
                window.localStorage.getItem("capoAutoConnectWalletName") !==
                walletName
            ) {
                window.localStorage.setItem(
                    "capoAutoConnectWalletName",
                    walletName
                );
            }
        }

        const newState: UpdateStateProps = {
            userInfo: {
                ...this.userInfo,
                wallet,
                walletHandle,
                selectedWallet: walletName,
                connectingWallet: false,
                foundNetworkName,
            },
            walletHelper,
        };
        await this.updateStatus(
            "finding collateral and other wallet utxos",
            {
                developerGuidance: "show status message onscreen",
                clearAfter: 5000,
                progressBar: true,
            },
            "//finding wallet utxos & collateral",
            newState
        );

        if (this.capo) this.capo.actorContext.wallet = wallet;

        const collateralUtxos = await wallet.collateral;
        if (!collateralUtxos?.length) {
            this.updateStatus(
                `Error: no collateral UTxO set in wallet config`,
                {
                    isError: true,
                    moreInstructions:
                        "Ensure at least one small-ish pure-ADA utxo (<20 ADA) exists in your wallet.  You may also try marking one or more small-ish (~5 ada) utxos in your wallet as being reserved for collateral",
                    developerGuidance:
                        "let the user fix the problem.  Or, you may check for 'no collateral' in the error message and make a txn for creating some collateral < 20 ADA",
                },
                "//no collateral seen"
            );
            return;
        }

        await walletHelper.utxos.then((walletUtxos) => {
            return this.updateStatus(
                undefined,
                {
                    developerGuidance:
                        "nothing to do here but clear an existing status message (if needed)",
                },
                "//found wallet utxos",
                {
                    walletUtxos,
                }
            );
        });

        if (
            (this.state.networkParams && autoNext && !this.state.capo) ||
            !(await this.state.capo?.isConfigured)
        ) {
            await this.updateStatus(
                `reconnecting to ${this.dAppName} with connected wallet`,
                {
                    developerGuidance: "status message for the user",
                },
                "//reinit after wallet"
            );
            return this.connectCapo(autoNext);
        }
    }

    async checkWalletTokens() {
        const { capo } = this.state;
        if (!capo?.actorContext.wallet) {
            await this.updateStatus(
                "no capo yet, or not connected to wallet",
                {
                    developerGuidance:
                        "wait for the wallet to be connected before calling checkWalletTokens",
                },
                "/// no capo or wallet; skipping scan for authority tokens"
            );
            return;
        }

        await this.updateStatus(
            "checking wallet for authority tokens ",
            {
                progressBar: true,
                developerGuidance: "status message for the user",
            },
            "/// looking for authority tokens  from policy " + capo.mph.toHex()
        );

        const roles: String[] = [];
        //@ts-expect-error - for now - only works if capo uses member info
        const member = await capo.findMemberInfo?.();
        const isAdmin = await capo.findActorUut("capoGov");

        let memberUut;
        if (!!member) {
            memberUut = member.uut;

            roles.push("collaborator");
        }
        if (!!isAdmin) roles.push("admin");

        const message = roles.includes("member")
            ? // || roles.includes("admin")
              ""
            : this.getStartedMessage();

        this.updateStatus(
            message,
            {
                progressPercent: 100,
                developerGuidance:
                    "display the indicated roles in the UI and/or show/hide app features based on the roles",
            },
            `/// found ${roles.length} roles: ${roles.join(", ")}}`,
            {
                userInfo: {
                    ...this.userInfo,
                    //@ts-expect-error on strict types
                    roles,
                    memberUut,
                },
            }
        );
    }

    getStartedMessage(): string {
        return `Hurray!  Users can now start doing their thing. Customize this content in your CapoDappProvider's getStartedMessage() method.`;
    }

    // -- step 3 - check if the Capo is configured and ready for use
    async connectCapo(autoNext = true, reset?: "reset") {
        if (this._unmounted) return;

        // const priorVH = "b30c39d09103f5ed3588adc9179cb957137ffa79568e6a5dfda4e317"
        // const addr = helios.Address.fromHashes(new helios.ValidatorHash(priorVH))
        // window.alert(addr.toBech32())

        // !!! todo: consider a way for clients of this component
        //  ... to indicate conditions for auto-connect to wallet
        // if ("create" == route || "edit" == route) {
        //     await this.connectWallet();
        // }
        let {
            networkParams,
            capo,

            userInfo: { wallet },
        } = this.state;

        let localConfig = null; // window.localStorage.getItem("capoConfig");
        if (localConfig)
            try {
                localConfig = JSON.parse(localConfig);

                console.log(
                    "------------------- deploy this -----------------------\n",
                    localConfig,
                    "\n------------------- deploy this! -----------------------\n",
                    "... by pasting this into your dAPI repo's capo.config.json"
                );

                this.updateStatus(
                    "using dev-time config from localStorage to load contract ...",
                    {
                        clearAfter: 5000,
                        moreInstructions:
                            "to deploy this configuration, see details in the console",
                        developerGuidance:
                            "at production time, we'll use the deployed config instead",
                    },
                    "// dev-time notice"
                );
            } catch (e: any) {
                return this.reportError(e, "parsing devCfg from localStorage", {
                    nextAction: "initializeCapo",
                    moreInstructions:
                        "You can re-initialize the capo to reset the dev config, or deploy a good config using the `cst` command-line tool",
                    developerGuidance:
                        "If this situation persists, you might need to investigate why the dev config is being written as something non-parseable",
                });
            }
        const bestKnownConfig = localConfig || ourCapoConfig;
        let config =
            !reset && bestKnownConfig
                ? { config: parseCapoJSONConfig(bestKnownConfig) }
                : { partialConfig: {} };

        if (!wallet) console.warn("connecting to capo with no wallet");
        if (!networkParams) {
            console.warn("no network params");
            return;
        }
        type t = ConfigFor<CapoType>;
        let { txBatcher } = this.state;
        if (!txBatcher) {
            const batcherOptions: TxBatcherOptions = {
                submitters: this.submitters,
                ...(wallet
                    ? {
                          signingStrategy: new GenericSigner(wallet),
                      }
                    : {}),
            };

            txBatcher = new TxBatcher(batcherOptions);
        }

        let network: CardanoClient = this.bf;
        //@ts-expect-error - sorry, typescript : /
        if (this.state.userInfo.wallet?.cardanoClient) {
            network = (this.state.userInfo.wallet! as SimpleWallet)
                .cardanoClient;
            networkParams = await network.parameters;
        const setup = {
            network,
            networkParams,
            txBatcher,
            actorContext: {
                wallet,
            },
            isMainnet: this.isMainnet(),
            optimize: true,
        };
        txBatcher.setup = setup;
        let cfg: StellarFactoryArgs<CapoConfig> = {
            setup: setup,
            // partialConfig: {},
            ...config,
        };
        try {
            console.log("init with cfg", cfg);
            await this.updateStatus(
                `connecting: ${this.dAppName}`,
                {
                    developerGuidance:
                        "wait for connection; possibly show a spinner",
                },
                "//init",
                {
                    txBatcher,
                }
            );

            const capo = await this.capoClass.createWith(
                //@ts-expect-error - sorry, typescript : /
                cfg
            );
            const capoBundle = capo.getBundle();
            const configured = capoBundle.configuredParams;
            const { isChartered } = capo;

            if (!configured || !isChartered) {
                const problem = configured
                    ? isChartered
                        ? "impossible"
                        : "is preconfigured and ready to be chartered!"
                    : isChartered
                    ? "impossible"
                    : "needs to be configured and chartered.   Add a configuration if you have it, or create the Capo charter now.";

                const message = autoNext ? `The Capo contract ${problem} ` : "";

                await this.updateStatus(
                    message,
                    {
                        nextAction: "initializeCapo",
                        developerGuidance:
                            "likely administrative moment for dev-time creation of the capo",
                    },
                    "//bootstrap needed",
                    {
                        capo,
                    }
                );
                return;
                // return this.stellarSetup();
            }
            capo.actorContext.wallet = wallet;
            if (!autoNext)
                return this.updateStatus(
                    "",
                    {
                        developerGuidance:
                            "capture this capo object for use in transaction-building.  See also the dataDelegates...",
                    },
                    "// Capo is connected to wallet, ready to do an on-chain activity",
                    { capo }
                );

            await this.updateStatus(
                "... searching ...",
                {
                    busy: true,
                    developerGuidance:
                        "display a spinner or other indicator that the dApp is doing something",
                },
                "//searching (or freshening search after wallet connection)",
                {
                    capo: capo,
                }
            );
            this.checkWalletTokens();
            // this.fetchBookEntries();
        } catch (error: any) {
            this.reportError(error, `checking ${this.dAppName} configuration`, {
                nextAction: "initializeCapo",
                moreInstructions:
                    "Developer error: Some error has occurred during initialization of on-chain Capo." +
                        "development" ==
                    process.env.NODE_ENV
                        ? "You can try again, or check the console for more information."
                        : `You might need to contact ${this.dAppName}'s support channels for assistance.`,
                developerGuidance:
                    "Check the logs for more information about the error",
            });
        }
    }

    private isMainnet(): boolean {
        const isMainnet = !(
            "development" == environment.NODE_ENV ||
            "test" == environment.NODE_ENV ||
            "preview" == environment.CARDANO_NETWORK ||
            "preprod" == environment.CARDANO_NETWORK
        );
        console.log(
            "isMainnet",
            isMainnet,
            environment.NODE_ENV,
            environment.CARDANO_NETWORK
        );
        return isMainnet;
    }

    async mkDefaultCharterArgs(): Promise<MinimalCharterDataArgs> {
        const { walletHelper } = this.state;
        if (!walletHelper) {
            debugger;
            throw new Error("no wallet helper");
        }
        const addr = await walletHelper.baseAddress;
        return {
            govAuthorityLink: {
                config: {
                    //this.capo.stringifyDgtConfig({
                    addrHint: [addr],
                },
            },
            mintDelegateLink: {
                config: {},
            },
            spendDelegateLink: {
                config: {},
            },
            mintInvariants: [],
            spendInvariants: [],
            otherNamedDelegates: new Map(),
            manifest: new Map(),
            rev: 1n,
        };
    }

    //  -- step 3a - initialize the Capo if needed
    async bootstrapCapo() {
        if (!this.userInfo?.wallet) await this.connectWallet(false);
        await this.connectCapo(false, "reset");
        const {
            capo,
            userInfo: { wallet },
        } = this.state;

        if (!wallet) {
            debugger;
            throw new Error("no wallet");
        }
        if (!capo) {
            debugger;
            throw new Error("no capo");
        }
        if (await capo.isConfigured) {
            return this.reportError(
                new Error(`Capo already has a deployed configuration`),
                "bootstrap",
                {
                    moreInstructions:
                        "This is a developer error that should be unreachable",
                    developerGuidance:
                        "Figure out how this could have happened, and fix the first root cause",
                }
            );
        }

        await this.updateStatus(
            "creating the Capo charter transaction ...",
            {
                progressBar: true,
                moreInstructions:
                    "This could take 60-90 seconds while the contracts are compiled",
                developerGuidance:
                    "status indicator while the transaction is build.  this might take a second or three.",
            },
            "//creating charter txn"
        );

        let tcx: Awaited<ReturnType<CapoType["mkTxnMintCharterToken"]>>;
        try {
            const addresses = await wallet.usedAddresses;
            // type Expand<T> =  T extends infer O ? { [K in keyof O]: O[K] } : never;
            // type tt = Expand<typeof t.state>
            tcx = await capo.mkTxnMintCharterToken(
                await this.mkDefaultCharterArgs()
            );
        } catch (e: any) {
            console.error(e);

            this.reportError(e, "creating charter", {
                nextAction: "retryCreation",
                developerGuidance:
                    "Make sure you're approving the setup transactions in the wallet, and check the logs to investigate possible other causes of error",
            });
            return;
        }
        await this.updateStatus(
            "Bootstrap transaction loading into your wallet...",
            {
                progressBar: true,
                moreInstructions: `If it looks right, sign the transaction to finish chartering the ${this.dAppName}`,
                developerGuidance:
                    "the dApp is waiting for the wallet to sign the bootstrap txn",
            },
            "/// push bootstrap txn to wallet",
            {
                tcx,
            }
        );
        try {
            // const paramsOverride: Partial<NetworkParams> = {
            //     maxTxExCpu: 1000000000000,
            //     maxTxExMem: 100000000,
            //     maxTxSize: 49777,
            // };
            await tcx.submitAll({
                // paramsOverride,
                onSubmitError: (details) => {
                    this.props.onSubmitError?.(details);
                },
                addlTxInfo: {
                    txName: `${this.dAppName} Charter`,
                    description: `Bootstrap on-chain contracts for ${this.dAppName}`,
                    moreInfo: `If this looks right, sign the transaction to finish chartering the ${this.dAppName}`,
                },
                fixupBeforeSubmit: ({
                    tcx,
                    description,
                    moreInfo,
                    optional,
                    txName,
                }) => {
                    return this.updateStatus(
                        "creating addl Txn: " + description,
                        {
                            moreInstructions: moreInfo,
                            progressBar: "waiting for wallet signature",
                            developerGuidance:
                                "to user: get this thing deployed, yo",
                        },
                        `/// push ${description} txn to wallet`
                    );
                },
                onSubmitted: ({ description, tcx }) => {
                    return this.updateStatus(
                        "submitted txn: " + description,
                        {
                            moreInstructions:
                                "the txn will take a few moments to be confirmed",
                            developerGuidance: "it's just a user confirmation",
                        },
                        "/// txn submitted ok to network"
                    );
                },
            });
            console.warn(
                "------------------- Boostrapped Config -----------------------\n",
                tcx.state.bootstrappedConfig,
                "\n------------------- deploy this! -----------------------\n",
                "... by pasting this into your dAPI repo's capo.config.json"
            );

            if ("development" == process.env.NODE_ENV) {
                window.localStorage.setItem(
                    "capoConfig",
                    JSON.stringify(tcx.state.bootstrappedConfig)
                );
                await this.updateStatus(
                    "Okay: self-deployed dev-time config.  It might take 10-20s for the charter to be found on-chain",
                    {
                        keepOnscreen: true,
                        moreInstructions:
                            "Bootstrap config saved to localStorage.  It will be used on next load.",

                        developerGuidance:
                            "dev-time 'deployment' to localStorage ready!",
                    },
                    "//stored bootstrapped config in localStorage"
                );
                await new Promise((res) => setTimeout(res, 5000));
            } else {
                await this.updateStatus(
                    `Capo contract creation submitted.  Use the details from the console to deploy this configuration.`,
                    {
                        keepOnscreen: true,
                        moreInstructions:
                            "The charter transaction is submitted to the network.  It may take a few minutes to be confirmed.",
                        developerGuidance:
                            "Deploy the capo configuration by pasting these details into your dApp code, the build and deploy the dApp.",
                    },
                    "//ok: charter txn submitted to network"
                );
            }

            // this.seekConfirmation()
        } catch (e: any) {
            console.error(e);
            this.updateStatus(
                `while building bootstrap txn: "${e.message}"`,
                {
                    isError: true,
                    nextAction: "retryCreation",
                    developerGuidance:
                        "creating the capo didn't work for some reason.  Let the user try again.",
                },
                "//wallet error during charter",
                {
                    capo: undefined,
                }
            );
        }
    }

    /**
     * sets the state to indicate an error condition and possible next steps
     * @remarks
     */
    reportError(
        e: Error,
        prefix: string,
        addlAttrs: UpdateStatusProps<UserActions>
    ) {
        console.error(e.stack || e.message);
        debugger;
        return this.updateStatus(
            `${prefix}: "${e.message}"`,
            {
                isError: true,
                keepOnscreen: true,
                ...addlAttrs,
            },
            "//error msg to user"
        );
    }

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
    updateStatus(
        message: string | undefined,
        statusProps: UpdateStatusProps<UserActions>,
        extraComment: string,
        extraState: UpdateStateProps = {}
    ): Promise<any> {
        const {
            nextAction = undefined,
            // moreInstructions = undefined,
            // progressBar = undefined,
            isError = undefined,
            clearAfter = 0,
            ...otherStatusProps
        } = statusProps;

        // if (this._unmounted) {
        //     console.warn(`suppressing state update after unmount (\"${status}\")`)
        //     return
        // }
        if (!clearAfter) {
            otherStatusProps.keepOnscreen = true;
        }
        console.log(`instance ${this.i}`, { status: message });
        const status: CapoDappStatus<UserActions> =
            "undefined" === typeof message
                ? {
                      message: undefined,
                      developerGuidance:
                          "the current state was cleared, indicating no pending actions.  You MAY clear the most recent message.",
                  }
                : {
                      ...otherStatusProps,
                      message,
                      isError,
                      clearAfter,
                      ...(nextAction
                          ? {
                                nextAction: {
                                    key: nextAction,
                                    label: this.userActions[nextAction]?.label,
                                    trigger:
                                        this.userActions[nextAction]?.trigger,
                                },
                            }
                          : {}),
                  };
        const newState: CapoDappProviderState<CapoType> = {
            ...this.state,
            status: status,
            ...extraState,
        };
        const doneWith =
            ("" == message &&
                this.state.status.message &&
                `(done: ${this.state.status.message})`) ||
            "";

        console.warn(extraComment || "" + doneWith || "", {
            newState,
        });
        return new Promise<void>((resolve) => {
            this.setState(newState, resolve);
            if (clearAfter) {
                setTimeout(() => {
                    if (this.state.status.message == message)
                        this.updateStatus(
                            "",
                            {
                                clearAfter: 0,
                                developerGuidance:
                                    "clearing the message after the indicated time; if you have already used the previous clearAfter signal for a temporary message, it's ok to ignore this",
                            },
                            "//clear previous message"
                        );
                }, clearAfter);
            }
        });
    }

    /**
     * Defines activities that can be specified as nextAction: ‹key›,
     * and offered to the user as a button to trigger the activity.
     * @remarks
     * Subclasses MAY override this method to provide additional actions
     * and SHOULD include `{ ... super.userActions }`
     */
    get userActions(): UserActions {
        return {
            initializeCapo: {
                label: "Setup Capo",
                trigger: this.bootstrapCapo,
            },
            retryCreation: {
                label: "Retry",
                trigger: this.connectCapo,
            },
        } as BaseUserActionMap as UserActions;
    }

    /**
     * emits an object allowing clients to access the provider's capabilities
     * including including status updates, error-reporting and default UI
     * elements
     */
    get capo(): CapoType | undefined {
        return this.state.capo;
    }
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
    roles: ("member" | "admin" | "artist" | "muNodeOp")[];
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
export type UserActionMap<actions extends string> = Record<
    actions,
    UserAction
> &
    BaseUserActionMap;

/**
 * @public
 */
export const CapoDappProviderContext =
    React.createContext<CapoDAppProvider<any> | null>(null);

export function useCapoDappProvider() {
    const context = React.useContext(CapoDappProviderContext);
    if (!context) {
        throw new Error(
            "useCapoDappProvider must be used within a CapoDappProvider"
        );
    }
    return context;
}

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
