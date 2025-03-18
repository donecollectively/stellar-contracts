import type { ResolveablePromise, TxDescription, TxSubmissionTracker, StellarTxnContext } from "@donecollectively/stellar-contracts"
import { BatchSubmitController, dumpAny } from "@donecollectively/stellar-contracts"
import type { Tx } from "@helios-lang/ledger"
import { decodeTx } from "@helios-lang/ledger"
import * as React from "react"
import {
  ActionButton,
  Highlight,
  Lowlight,
  Softlight,
  DashboardRow,
  DashboardHighlights,
  DashHighlightItem,
} from "./DashboardTemplate.js"

// Shows a master/detail view of the tx batch
// includes a list of txns on the left
// shows the details of the selected txn on the right
// shows a summary of the batch status at the top

export function TxBatchViewer({
  batch,
  initialId,
}: {
  batch: BatchSubmitController
  initialId?: string
}) {
  const [selectedId, setSelectedId] = React.useState<string | undefined>(initialId)
  const [selectedTx, setSelectedTx] = React.useState<Tx | undefined>()
  const [txMgr, setTxMgr] = React.useState<TxSubmissionTracker | undefined>()
  const [gen, setGen] = React.useState(0)

  const renderNow = React.useMemo(() => () => setGen((g) => g + 1), [])

  React.useEffect(() => {
    if (!selectedId) return
    const tx = batch.$txStates[selectedId]
    if (!tx) return
    setTxMgr(tx)
  }, [selectedId, batch])

  React.useEffect(() => {
    if (!txMgr?.txd.tx) return
    const tx = txMgr.txd.tx
    if (typeof tx === 'string') {
      setSelectedTx(decodeTx(tx))
    } else {
      setSelectedTx(tx)
    }
  }, [txMgr])

  React.useEffect(() => {
    batch.$txChanges.on("txAdded", renderNow)
    batch.$txChanges.on("statusUpdate", renderNow)
    return () => {
      batch.$txChanges.off("txAdded", renderNow)
      batch.$txChanges.off("statusUpdate", renderNow)
    }
  }, [batch, renderNow])

  return (
    <DashboardRow>
      <div className="flex flex-row gap-2 w-full">
        <ShowTxList batch={batch} initialId={initialId} renderNow={renderNow} selectedId={selectedId} setSelectedId={setSelectedId} />
        {(() => {
          const indicateSelectedTx = selectedId
            ? "border-s-4 border-s-brand-orange/20"
            : ""

          if (!selectedId) {
            return (
              <div
                className={`${indicateSelectedTx} bg-background rounded-md border border-white/10 p-2 w-9/12`}
              >
                <Softlight>Select a transaction to view details</Softlight>
              </div>
            )
          }

          if (!txMgr) {
            return (
              <div
                className={`${indicateSelectedTx} bg-background rounded-md border border-white/10 p-2 w-9/12`}
              >
                <Softlight>Loading transaction details...</Softlight>
              </div>
            )
          }

          return (
            <div
              className={`${indicateSelectedTx} bg-background rounded-md border border-white/10 p-2 w-9/12`}
            >
              <ShowTxDescription txTracker={txMgr} />
            </div>
          )
        })()}
      </div>
    </DashboardRow>
  )
}

function ShowTxList({
  batch,
  initialId,
  renderNow,
  selectedId,
  setSelectedId,
}: {
  batch: BatchSubmitController
  initialId?: string
  renderNow: () => void
  selectedId: string | undefined
  setSelectedId: (id: string | undefined) => void
}) {
  const { $allTxns } = batch
  const byId = {} as Record<string, TxDescription<any, any>>

  return (
    <div className="flex flex-col gap-1 w-3/12">
      {batch.$allTxns.map((txTracker) => {
        const {
          $state,
          txSubmitters,
          id,
          txd,
        } = txTracker

        const submitterStates = Object.values(txSubmitters)
          .map((s) => {
            const summary = s.$$statusSummary
            return `${summary.status} - ${summary.currentActivity}`
          })
          .join(", ")

        const isCurrent = id == selectedId
        const countNested = txd.tcx?.addlTxns ? Object.keys(txd.tcx.addlTxns).length : 0

        return (
          <DashHighlightItem
            key={id}
            title={txd.txName || txd.description}
            button={isCurrent ? undefined : "Select"}
            onClick={isCurrent ? undefined : () => setSelectedId(id)}
          >
            <Softlight>{submitterStates}</Softlight>
            {countNested > 0 && (
              <Lowlight>
                {countNested} nested txns
              </Lowlight>
            )}
          </DashHighlightItem>
        )
      })}
    </div>
  )
}

function ShowTxDescription({ txTracker }: { txTracker: TxSubmissionTracker }) {
  const { $state, txSubmitters, id, txd } = txTracker

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row justify-between">
        <Highlight>{txd.txName || txd.description}</Highlight>
        <Lowlight>{$state}</Lowlight>
      </div>
      <div className="flex flex-col gap-1">
        {Object.entries(txSubmitters).map(([key, submitter]) => (
          <div key={key} className="flex flex-row justify-between">
            <Softlight>{key}</Softlight>
            <Lowlight>{`${submitter.$$statusSummary.status} - ${submitter.$$statusSummary.currentActivity}`}</Lowlight>
          </div>
        ))}
      </div>
      {txd.tcx?.addlTxns && (
        <div className="flex flex-col gap-1">
          <Softlight>Nested Transactions:</Softlight>
          {Object.entries(txd.tcx.addlTxns).map(([key, tx]) => (
            <div key={key} className="flex flex-row justify-between">
              <Lowlight>{key}</Lowlight>
              <Lowlight>{tx.id}</Lowlight>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
