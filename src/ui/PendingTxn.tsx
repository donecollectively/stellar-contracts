"use client"
import type { TxDescription } from "@donecollectively/stellar-contracts"
import { TxSubmitMgr } from "@donecollectively/stellar-contracts"
import * as React from "react"
import {
  DashboardRow,
  DashboardHighlights,
  DashHighlightItem,
  Highlight,
  Lowlight,
  Softlight,
} from "./DashboardTemplate.js"

export type PendingTxn = {
  txd: TxDescription<any, any>
  statusSummary: string
  mgr?: TxSubmitMgr
}

/**
 * @deprecated
 * @internal the CharterStatus component is now preferred
 */
export function ShowPendingTxns({
  pendingTxns,
}: {
  pendingTxns: Map<string, PendingTxn>
}) {
  return (
    <DashboardRow>
      <DashboardHighlights title="Pending Txns">
        {...Array.from(pendingTxns.values()).map(({ mgr, statusSummary, txd }) => (
          <DashHighlightItem key={txd.id} title={txd.txName || txd.description}>
            {statusSummary}
            {mgr?.pending?.activity}
          </DashHighlightItem>
        ))}
      </DashboardHighlights>
    </DashboardRow>
  )
}
