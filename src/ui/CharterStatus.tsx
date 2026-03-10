import * as React from "react";
import { makeShelleyAddress, makeAssetClass } from "@helios-lang/ledger";
import type { MintingPolicyHash } from "@helios-lang/ledger";
import {
    DashHighlightItem,
    Highlight,
    Lowlight,
    Softlight,
    DashboardTemplate,
    DashboardRow,
    DashboardSummary,
    DashSummaryItem,
    DashboardHighlights,
} from "./DashboardTemplate.js";
import {
    abbrevAddress,
    type CharterData,
    type Capo,
    type DelegateSetup,
    type hasAddlTxns,
    type StellarTxnContext,
    type BatchSubmitController,
    type ErgoCapoManifestEntry,
    type RelativeDelegateLink,
    bytesToText,
    uplcDataSerializer,
    BasicMintDelegate,
    StellarDelegate,
    DelegatedDataContract,
} from "@donecollectively/stellar-contracts";
import {
    useCapoDappProvider,
} from "./CapoDappProviderContext.js";

/**
 * Hook for hosting a shared copy-feedback indicator.
 * Call `showCopyFeedback(msg)` from any child; the message auto-clears after 2s.
 */
function useCopyFeedback(timeout = 2000) {
    const [message, setMessage] = React.useState<string | null>(null);
    const timerRef = React.useRef<ReturnType<typeof setTimeout>>();

    const show = React.useCallback(
        (msg: string) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setMessage(msg);
            timerRef.current = setTimeout(() => setMessage(null), timeout);
        },
        [timeout]
    );

    // Cleanup on unmount
    React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    return { copyFeedback: message, showCopyFeedback: show };
}

/**
 * Shows a Capo-based dApp's charter status as a dashboard-style screen
 * @public
 */
export function CharterStatus() {
    const { capo, provider, isMounted } = useCapoDappProvider() || {};
    const blockfrost = provider?.bf;

    const [charterData, setCharterData] = React.useState<CharterData>();
    const [statusMessage, setStatusMessage] = React.useState("");
    const { copyFeedback, showCopyFeedback } = useCopyFeedback();

    React.useEffect(() => {
        if (!provider?.userInfo?.wallet) {
            setStatusMessage("no user info");
            return;
        }
        if (!provider) {
            setStatusMessage("no provider");
            return;
        }

        // @ts-ignore - This is a temporary global variable for debugging
        globalThis.capo = capo;
        setStatusMessage("finding charter data...");
        if (!capo) return;
        capo.getBundle().then((bundle) => {
            if (!bundle) {
                setStatusMessage("no bundle");
                return;
            }
            if (!bundle._progIsPrecompiled) {
                setStatusMessage("Capo bundle not configured");
                return;
            }
            const configured = bundle.configuredParams;
            const { isChartered } = capo;

            if (!configured || !isChartered) {
                const problem = configured
                    ? isChartered
                        ? "impossible"
                        : "is preconfigured and ready to be chartered!"
                    : isChartered
                    ? "impossible"
                    : "needs to be configured and chartered.   Add a configuration if you have it, or create the Capo charter now.";

                const message = `The Capo contract ${problem} `;

                setStatusMessage(message);
            }
        });
        if (capo && capo.isChartered) {
            capo?.findCharterData(undefined, { optional: true }).then((cd) => {
                if (!cd) {
                    setStatusMessage("no charter data found");
                    return;
                }
                setStatusMessage("charter data found");
                // @ts-ignore - This is a temporary global variable for debugging
                globalThis.charter = cd;

                setCharterData(cd);
            });
        }
    }, [provider, provider?.userInfo.wallet, capo]);

    const [upgradeTxn, setUpgradeTxn] = React.useState<
        hasAddlTxns<StellarTxnContext> | "ok" | undefined
    >();
    React.useEffect(
        function checkForNeededUpgrades() {
            if (!capo) return;
            if (!charterData) return;

            capo.verifyCoreDelegates().then(() => {
                capo.mkTxnUpgradeIfNeeded()
                    .catch((e) => {
                        setStatusMessage("error: " + e.message);
                        debugger;
                    })
                    .then((tcx) => {
                        if (!tcx) {
                            setStatusMessage("no upgrade needed");
                            return;
                        }
                        if (Object.keys(tcx.addlTxns).length) {
                            setUpgradeTxn(
                                tcx as hasAddlTxns<StellarTxnContext>
                            );
                        } else {
                            setUpgradeTxn("ok");
                            setStatusMessage("no upgrade needed");
                        }
                    });
            });
        },
        [charterData]
    );

    // const [currentBatch, setTxBatch] = React.useState<BatchSubmitController>();
    // const [initialId, setInitialId] = React.useState<string | undefined>(
    //     undefined
    // );
    // React.useEffect(
    //     function monitorTxBatcher() {
    //         if (!capo) return;
    //         const { txBatcher } = capo.setup;

    //         txBatcher.$notifier.on("rotated", (batch) => {
    //             console.log("batch rotated", batch);
    //             const txns = batch.$allTxns;
    //             if (txns.length) {
    //                 setInitialId(txns[0].id);
    //             } else {
    //                 batch.$txChanges.once("txAdded", (txTracker) => {
    //                     console.log("tx added", txTracker);
    //                     const { id } = txTracker;
    //                     setInitialId(id);
    //                 });
    //             }
    //             setTxBatch(batch);
    //         });
    //     },
    //     [capo, capo?.setup.txBatcher]
    // );

    const loadUpgrades = React.useMemo(() => {
        return async function loadUpgradeTxns() {
            if (!capo) return;
            if (!upgradeTxn) return;
            if ("ok" === upgradeTxn) return;
            const { txBatcher } = capo.setup;

            txBatcher!.current.$addTxns([
                {
                    description: "Upgrade Charter",
                    tcx: upgradeTxn,
                    id: upgradeTxn.id,
                    depth: 0,
                    moreInfo:
                        "Applies needed updates to on-chain deployment details",
                },
            ]);
            // setInitialId(Object.values(upgradeTxn.addlTxns)[0].id);

            upgradeTxn.buildAndQueueAll({});
        };
    }, [capo, capo?.setup.txBatcher, upgradeTxn]);

    if (!isMounted) {
        return null;
    }

    let upgradeInfo = <></>;
    if (upgradeTxn === "ok") {
        upgradeInfo = (
            <DashHighlightItem title="Deployment">
                <br />
                <Lowlight>Everything is up to date</Lowlight>
            </DashHighlightItem>
        );
    } else if (upgradeTxn) {
        const txnCount = Object.keys(upgradeTxn.addlTxns).length;
        const txns = txnCount === 1 ? "tx" : "txns";
        upgradeInfo = (
            <DashHighlightItem button="Review & Submit" onClick={loadUpgrades}>
                <Highlight>
                    {txnCount}{" "}
                    <Lowlight as="span" className="text-lg">
                        {txns} needed
                    </Lowlight>
                </Highlight>
                <Softlight className="italic">
                    To bring the on-chain deployment up to date
                </Softlight>
            </DashHighlightItem>
        );
    }

    let highlights: React.ReactNode | null = null;
    if (capo && !capo.isChartered) {
        highlights = (
            <DashboardHighlights title="Highlights">
                <DashHighlightItem
                    title="Needs Charter"
                    footer="The Capo has not been created yet"
                >
                    <Highlight>Setup the Capo to resolve</Highlight>
                </DashHighlightItem>
            </DashboardHighlights>
        );
    } else if (charterData) {
        highlights = (
            <DashboardHighlights
                title="Highlights"
                footer={
                    <div className="flex justify-between items-end w-full gap-4">
                        <span
                            className={`text-[11px] text-green-400/80 transition-opacity duration-300 whitespace-nowrap ${
                                copyFeedback ? "opacity-100" : "opacity-0"
                            }`}
                        >
                            {copyFeedback || "\u00A0"}
                        </span>
                        <span className="text-right">
                            Capo:{" "}
                            <Softlight as="span">
                                {capo?.address?.toString()}
                            </Softlight>
                            <div>
                                Minting policy:{" "}
                                <Softlight as="span">
                                    {capo?.mintingPolicyHash?.toString()}
                                </Softlight>
                            </div>
                        </span>
                    </div>
                }
            >
                {capo && charterData && (
                    <CharterHighlights capo={capo} charterData={charterData} showCopyFeedback={showCopyFeedback} />
                )}
                {upgradeInfo}
            </DashboardHighlights>
        );
    }

    return (
        <>
            <DashboardTemplate title="Charter">
                <div>
                    {provider?.dAppName}: {statusMessage}
                </div>
                <DashboardRow>
                    <DashboardSummary title="Stats">
                        <DashSummaryItem title="Node Operators">
                            42
                        </DashSummaryItem>
                        <DashSummaryItem title="Active Stake">
                            14,200
                            <Highlight>ADA</Highlight>
                        </DashSummaryItem>
                        <DashSummaryItem title="Great Things">
                            1042
                        </DashSummaryItem>
                    </DashboardSummary>
                    {highlights}
                </DashboardRow>
            </DashboardTemplate>
            {(charterData && (
                <code className="text-sm">
                    <pre>{uplcDataSerializer("", charterData)}</pre>
                </code>
            )) || <pre>loading charter data...</pre>}
        </>
    );
}

/**
 * Shows a highlights of various contract elements within a Capo-based dApp
 * @remarks
 * Includes mint and spend delegates, delegated data policies, and named manifest entries
 * @public
 */
export function CharterHighlights({
    capo,
    charterData,
    showCopyFeedback,
}: {
    capo: Capo<any, any>;
    charterData: CharterData;
    showCopyFeedback: (msg: string) => void;
}) {
    const isMainnet = capo.setup.isMainnet;
    const [{ mintDgt, spendDgt }, setDelegates] = React.useState<{
        mintDgt: BasicMintDelegate | undefined | null;
        spendDgt: BasicMintDelegate | undefined | null;
    }>({
        mintDgt: undefined,
        spendDgt: undefined,
    });
    const [dataControllers, setDataControllers] = React.useState<{
        [key: string]: DelegatedDataContract<any, any>;
    }>({});
    React.useEffect(() => {
        async function loadDelegates() {
            const mintDgt = (await capo.getMintDelegate(charterData)) || null;
            const spendDgt = (await capo.getSpendDelegate(charterData)) || null;
            setDelegates({ mintDgt, spendDgt });

            const dataControllers = {};
            for (const [entryName, entryInfo] of [
                ...charterData.manifest.entries(),
            ]) {
                if (entryInfo.entryType.DgDataPolicy) {
                    const dgt = await capo.getDgDataController(entryName, {
                        charterData,
                        onchain: true, 
                    });
                    await dgt?.getBundle();
                    dataControllers[entryName] = dgt;
                }
            }
            setDataControllers(dataControllers);
        }
        loadDelegates();
    }, [capo, charterData]);

    const { mintDelegateLink } = charterData;
    const { spendDelegateLink } = charterData;

    // const mintDgtAddr = mintDelegateLink?.delegateValidatorHash
    //     ? makeShelleyAddress(isMainnet, mintDelegateLink.delegateValidatorHash)
    //     : undefined
    // const spendDgtAddr = spendDelegateLink?.delegateValidatorHash
    //     ? makeShelleyAddress(isMainnet, spendDelegateLink.delegateValidatorHash)
    //     : undefined

    if (!charterData) return null;
    // debugger

    const manifestNamedEntries = [...charterData.manifest.entries()]
        .filter(([_, foundRole]) => !foundRole.entryType.DgDataPolicy)
        .map(([roleName, foundRole]: [string, ErgoCapoManifestEntry]) => {
            const entryType = Object.keys(foundRole.entryType)[0];
            // debugger

            return (
                <DashHighlightItem
                    key={`role-${roleName}`}
                    title={roleName}
                    footer={`manifest '${entryType}' entry`}
                >
                    <Softlight>{bytesToText(foundRole.tokenName)}</Softlight>
                </DashHighlightItem>
            );
        });

    const coreDelegates = (() => {
        if (!mintDgt) return null;
        if (!spendDgt) return null;
        return (
            <>
                <CoreDelegateHighlightItem
                    title="Mint Delegate"
                    delegate={mintDgt}
                    delegateLink={mintDelegateLink}
                    isMainnet={isMainnet}
                    footer="governs all token minting"
                />

                <CoreDelegateHighlightItem
                    title="Spend Delegate"
                    delegate={spendDgt}
                    delegateLink={spendDelegateLink}
                    isMainnet={isMainnet}
                    footer="controls admin &amp; redelegation"
                />
            </>
        );
    })();

    return (
        <>
            {coreDelegates}
            {manifestNamedEntries}

            {...Object.entries(capo.delegateRoles).flatMap(
                ([roleName, roleInfo]: [
                    string,
                    DelegateSetup<any, StellarDelegate, any>
                ]) => {
                    if (roleName == "govAuthority") return null;
                    if (roleName == "mintDelegate") return null;
                    if (roleName == "spendDelegate") return null;

                    const foundRole = charterData.manifest.get(roleName);
                    if (!foundRole)
                        return (
                            <DashHighlightItem
                                title={roleName}
                                key={`mftRole-${roleName}`}
                            >
                                <Softlight>Delegated data policy</Softlight>
                                <Highlight>needs deployment</Highlight>
                            </DashHighlightItem>
                        );
                    return (
                        <DelegatedDataPolicyItem
                            roleName={roleName}
                            delegate={dataControllers[roleName]}
                            mainnet={isMainnet}
                            foundRole={foundRole}
                            capoMph={capo.mintingPolicyHash as MintingPolicyHash}
                            showCopyFeedback={showCopyFeedback}
                        />
                    );
                }
            )}
        </>
    );
}

function DelegatedDataPolicyItem({
    roleName,
    delegate,
    mainnet,
    foundRole,
    capoMph,
    showCopyFeedback,
}: {
    roleName: string;
    delegate: DelegatedDataContract<any, any>;
    mainnet: boolean;
    foundRole: ErgoCapoManifestEntry;
    capoMph: MintingPolicyHash;
    showCopyFeedback: (msg: string) => void;
}) {
    const tokenName = bytesToText(foundRole.tokenName);
    const policyHex = delegate?.validatorHash.toHex() ?? "";
    // Trim: show first 8 + … + last 8 of the 56-char policy hash
    const policyTrimmed =
        policyHex.length > 20
            ? `${policyHex.slice(0, 8)}…${policyHex.slice(-8)}`
            : policyHex;

    // Token name: split at last dash for prefix/suffix trimming (matches MemberStatusPanel UUT pattern)
    const dashIdx = tokenName.lastIndexOf("-");
    const tnPrefix = dashIdx > 0 ? tokenName.slice(0, dashIdx) : tokenName;
    const tnSuffix = dashIdx > 0 ? tokenName.slice(dashIdx) : "";

    const copyAssetClass = async () => {
        try {
            const ac = makeAssetClass(capoMph, foundRole.tokenName);
            await navigator.clipboard.writeText(ac.toString());
            showCopyFeedback(`Copied assetId ${tokenName}`);
        } catch {
            showCopyFeedback("Copy failed");
        }
    };

    const copyPolicyId = async () => {
        try {
            await navigator.clipboard.writeText(policyHex);
            showCopyFeedback(`Copied policy ${policyTrimmed}`);
        } catch {
            showCopyFeedback("Copy failed");
        }
    };

    return (
        <DashHighlightItem
            title={roleName}
            footer={
                <>
                    Governs all{" "}
                    <Lowlight as="span">
                        <b>{delegate?.recordTypeName}</b>
                    </Lowlight>{" "}
                    records
                </>
            }
        >
            <div className="flex flex-row justify-between w-full">
                <div>
                    <Softlight>
                        Delegated data policy
                        <div key="thing1" className="text-xs">
                            &nbsp;&nbsp;&nbsp;
                            <Lowlight as="span" className="text-xs">for type </Lowlight>
                            <Highlight as="span" className="whitespace-nowrap">
                                {foundRole.entryType.DgDataPolicy?.idPrefix}-*
                            </Highlight>
                        </div>
                        <div key="thing2" className="text-xs">
                            policy{" "}
                            <span
                                className="cursor-pointer hover:bg-slate-700/50 transition-all
                                           rounded-sm px-0.5"
                                title="Click to copy policy hash"
                                onClick={copyPolicyId}
                            >
                                <span className="text-slate-300">{policyTrimmed}</span>
                            </span>
                        </div>
                    </Softlight>
                </div>
                <div className="flex flex-col items-end">
                    <span
                        className="group/tn inline-flex items-center cursor-pointer
                                   bg-slate-700/50 hover:bg-slate-600/50
                                   rounded-l-full rounded-r-sm
                                   origin-center transition-transform duration-300 ease-out
                                   hover:scale-125"
                        title="Click to copy AssetClass"
                        onClick={copyAssetClass}
                    >
                        {/* Coin circle — always visible */}
                        <span className="relative flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            <span
                                className="absolute inset-0 rounded-full"
                                style={{
                                    background:
                                        "radial-gradient(circle at 35% 35%, #d1d5db 0%, #94a3b8 60%, #64748b 100%)",
                                    opacity: 0.35,
                                }}
                            />
                            <span className="relative text-slate-200 text-[9px] font-semibold leading-none">
                                {(tnPrefix.charAt(0) + tnPrefix.slice(1).replace(/[^A-Z]/g, "")).toUpperCase()}
                            </span>
                        </span>
                        <span className="pl-0.5 pr-1.5 h-5 flex items-center text-xs">
                            <span className="text-slate-300 group-hover/tn:text-slate-100 leading-none flex-shrink-0 transition-colors duration-300">{tnPrefix}</span>
                            <span className="text-slate-500/70 group-hover/tn:text-slate-300 text-[9px] leading-none whitespace-nowrap transition-colors duration-300">
                                {tnSuffix}
                            </span>
                        </span>
                    </span>
                </div>
            </div>
            {delegate?.preloadedBundle.previousOnchainScript ? (
                <div className="text-xs mt-2 w-full text-right">
                    <Highlight as="span">update needed </Highlight>
                    <Softlight className="italic">
                        to apply pending code changes to on-chain policy
                    </Softlight>
                </div>
            ) : (
                ""
            )}
        </DashHighlightItem>
    );
}

function CoreDelegateHighlightItem({
    title,
    delegate,
    delegateLink,
    isMainnet,
    footer,
}: {
    title: string;
    delegate?: BasicMintDelegate;
    delegateLink?: RelativeDelegateLink;
    isMainnet: boolean;
    footer?: string;
}) {
    if (!delegateLink) {
        return (
            <DashHighlightItem title={title}>
                <Highlight>needs deployment</Highlight>
            </DashHighlightItem>
        );
    }
    const dvh = delegateLink.delegateValidatorHash;
    const addr = dvh ? abbrevAddress(makeShelleyAddress(isMainnet, dvh)) : "";
    // if (delegate) debugger
    return (
        <DashHighlightItem title={title} footer={footer}>
            <Softlight>{delegateLink?.uutName}</Softlight>
            <Lowlight className="text-right">{addr}</Lowlight>

            {delegate?.preloadedBundle.previousOnchainScript ? (
                <Highlight className="text-right">
                    update needed{" "}
                    <Softlight>to apply changes to on-chain policy</Softlight>
                </Highlight>
            ) : null}
        </DashHighlightItem>
    );
}
