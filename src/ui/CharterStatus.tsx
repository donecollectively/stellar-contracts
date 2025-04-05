"use client";
import * as React from "react";
import { makeShelleyAddress } from "@helios-lang/ledger";
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
import { useCapoDappProvider } from "./CapoDappProvider.js";
import { TxBatchViewer } from "./TxBatchViewer.js";

export function CharterStatus() {
    const provider = useCapoDappProvider();
    const blockfrost = provider?.bf;

    const [charterData, setCharterData] = React.useState<CharterData>();
    const [statusMessage, setStatusMessage] = React.useState("");
    const capo = provider?.capo;

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
        const bundle = capo.getBundle();
        if (!bundle) {
            setStatusMessage("no bundle");
            return;
        }
        if (!bundle._progIsPrecompiled) {
            setStatusMessage("Capo bundle not configured");
            return;
        }

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
    }, [capo, provider?.userInfo, provider]);

    const [upgradeTxn, setUpgradeTxn] = React.useState<
        hasAddlTxns<StellarTxnContext> | "ok" | undefined
    >();
    React.useEffect(
        function checkForNeededUpgrades() {
            if (!capo) return;
            if (!charterData) return;

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
                        setUpgradeTxn(tcx as hasAddlTxns<StellarTxnContext>);
                    } else {
                        setUpgradeTxn("ok");
                        setStatusMessage("no upgrade needed");
                    }
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
                    <>
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
                    </>
                }
            >
                {capo && charterData && (
                    <CharterHighlights capo={capo} charterData={charterData} />
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

export function CharterHighlights({
    capo,
    charterData,
}: {
    capo: Capo<any, any>;
    charterData: CharterData;
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
                    });
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
                            <DashHighlightItem title={roleName}>
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
}: {
    roleName: string;
    delegate: DelegatedDataContract<any, any>;
    mainnet: boolean;
    foundRole: ErgoCapoManifestEntry;
}) {
    debugger;
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
                        <div className="text-xs">
                            &nbsp;&nbsp;&nbsp;
                            {bytesToText(foundRole.tokenName)}
                        </div>
                    </Softlight>
                </div>
                <div className="flex flex-col items-end">
                    <Lowlight className="text-xs">for type</Lowlight>
                    <Highlight as="span">
                        {foundRole.entryType.DgDataPolicy?.idPrefix}-*
                    </Highlight>
                </div>
            </div>
            {delegate?.getBundle().previousOnchainScript ? (
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

            {delegate?.getBundle().previousOnchainScript ? (
                <Highlight className="text-right">
                    update needed{" "}
                    <Softlight>to apply changes to on-chain policy</Softlight>
                </Highlight>
            ) : null}
        </DashHighlightItem>
    );
}
