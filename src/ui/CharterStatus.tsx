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
    type hasAddlTxns,
    type StellarTxnContext,
    type BatchSubmitController,
    bytesToText,
    uplcDataSerializer,
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

    const [currentBatch, setTxBatch] = React.useState<BatchSubmitController>();
    const [initialId, setInitialId] = React.useState<string | undefined>(
        undefined
    );
    React.useEffect(
        function monitorTxBatcher() {
            if (!capo) return;
            const { txBatcher } = capo.setup;

            txBatcher.$notifier.on("rotated", (batch) => {
                console.log("batch rotated", batch);
                const txns = batch.$allTxns;
                if (txns.length) {
                    setInitialId(txns[0].id);
                } else {
                    batch.$txChanges.once("txAdded", (txTracker) => {
                        console.log("tx added", txTracker);
                        const { id } = txTracker;
                        setInitialId(id);
                    });
                }
                setTxBatch(batch);
            });
        },
        [capo, capo?.setup.txBatcher]
    );

    const loadUpgrades = React.useMemo(() => {
        return async function loadUpgradeTxns() {
            if (!capo) return;
            if (!upgradeTxn) return;
            if ("ok" === upgradeTxn) return;
            const { txBatcher } = capo.setup;

            txBatcher!.current.$addTxns(upgradeTxn);
            setInitialId(Object.values(upgradeTxn.addlTxns)[0].id);

            upgradeTxn.buildAndQueueAll({});
        };
    }, [capo, capo?.setup.txBatcher, upgradeTxn]);

    const hasBatch = !!currentBatch && !!currentBatch?.$allTxns.length;
    let upgradeInfo = <></>;
    if (upgradeTxn === "ok") {
        upgradeInfo = (
            <DashHighlightItem title="Deployment">
                <br />
                <Lowlight>Everything is up to date</Lowlight>
            </DashHighlightItem>
        );
    } else if (upgradeTxn) {
        upgradeInfo = (
            <DashHighlightItem button="Review & Submit" onClick={loadUpgrades}>
                <Highlight className="text-xl">
                    {Object.keys(upgradeTxn.addlTxns).length}{" "}
                    <Lowlight as="span" className="text-lg">
                        txns needed
                    </Lowlight>
                </Highlight>
                <Softlight>
                    To bring the on-chain deployment up to date
                </Softlight>
            </DashHighlightItem>
        );
    }

    return (
        <DashboardTemplate title="Charter">
            <div>
                {provider?.dAppName}: {statusMessage}
            </div>
            <DashboardRow>
                <DashboardSummary title="Stats">
                    <DashSummaryItem title="Node Operators">42</DashSummaryItem>
                    <DashSummaryItem title="Active Stake">
                        14,200
                        <Highlight>ADA</Highlight>
                    </DashSummaryItem>
                    <DashSummaryItem title="Great Things">1042</DashSummaryItem>
                </DashboardSummary>
                <DashboardHighlights title="Highlights">
                    {capo && charterData && (
                        <CharterHighlights
                            capo={capo}
                            charterData={charterData}
                        />
                    )}
                    {upgradeInfo}
                </DashboardHighlights>
            </DashboardRow>
            {!!hasBatch && (
                <TxBatchViewer batch={currentBatch} {...{ initialId }} />
            )}
            <DashboardRow>
                <DashboardHighlights
                    colSpan="4"
                    className="w-full"
                    title="Charter Dump"
                >
                    {(charterData && (
                        <code className="text-sm">
                            <pre>{uplcDataSerializer("", charterData)}</pre>
                        </code>
                    )) || <pre>loading charter data...</pre>}
                </DashboardHighlights>
            </DashboardRow>
        </DashboardTemplate>
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

    const { mintDelegateLink: mintDgt, spendDelegateLink: spendDgt } = charterData;
    const mintDgtAddr = mintDgt?.delegateValidatorHash
        ? makeShelleyAddress(isMainnet, mintDgt.delegateValidatorHash)
        : undefined;
    const spendDgtAddr = spendDgt?.delegateValidatorHash
        ? makeShelleyAddress(isMainnet, spendDgt.delegateValidatorHash)
        : undefined;
    return (
        <>
            {...Object.entries(capo.delegateRoles).flatMap(
                ([roleName, roleInfo]) => {
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
                    return null;
                }
            )}
        </>
    );
}
