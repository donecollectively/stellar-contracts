# Stellar dapp kickstart (step-by-step)

1) Prep
   - Read quickstarts: on-chain, off-chain, Capo helpers, architecture.
   - Decide network client + wallet; gather one seed UTxO with enough ADA for charter + ref scripts.
   - Ensure Capo subclass + delegates + data policies are compiled/generated (bundles/bridges ready).

2) Instantiate contracts
   - Create Capo instance with config `{seedTxn, seedIndex}` (or run dry-run to capture config).
   - Wire delegate controllers (mint/spend, data policies, named delegates) with Capo reference.
   - Keep `StellarTxnContext` handy for tx assembly.

3) Mint charter (bootstrap)
   - Use `mkTxnMintCharterToken`: consumes seed UTxO, mints charter + core delegate UUTs, writes CharterData.
   - Includes ref-script addl txns for minter/capo/mint delegate; submit all.
   - Result: Capo address now has charter UTxO, ref scripts, manifest initialized.

4) Install policies (data/named delegates)
   - If using delegated data policies: queue install via `mkTxnInstallingPolicyDelegate` (or queue + commit separately).
   - Commit pending changes if queued.

5) Add settings (if used)
   - Use settings controller to create initial record (minting activity) and register `currentSettings` manifest entry.
   - Ensure charter manifest references settings UUT; commit pending changes if needed.

6) Create data records
   - Select seed UTxO if record needs new UUT (idPrefix-based).
   - `txnCreatingRecord` on the controller; add spend/mint delegate authorities + charter ref; attach ref scripts.
   - Submit; record UTxO lands at Capo with inline datum.

7) Update data records
   - Fetch record via controller (`findRecords`); build tx with spend delegate activity + controller update activity.
   - Preserve record UUT/tokenName; return record to Capo address.

8) Upgrade delegates
   - Mint delegate: `mkTxnUpdatingMintDelegate` (normal or forced) → updates CharterData link; burns old UUT unless forced.
   - Spend delegate: `mkTxnUpdatingSpendDelegate` likewise; ensure Capo authority present.
   - Data policy: queue replacement (pending change) then commit; burns old token if configured.

9) Attach/refresh ref scripts
   - If scripts change or missing ref: use `txnMkAddlRefScriptTxn` to store; prefer ref scripts in txns.

10) Validate and submit
   - Ensure charter token returned to Capo unless intentionally spent.
   - Include required delegates + activities; check manifests for correct ids.
   - Submit primary tx + any queued addl txns.

Troubleshooting
   - Missing ref script: `txnAttachScriptOrRefScript` falls back to inline; consider adding ref script.
   - Delegate config mismatch: rebuild delegate with correct params or update pending changes.
   - Insufficient ADA: reselect seed UTxO or add wallet input for ref-script deposits/min-ADA.

Cross-links
   - On-chain essentials: `reference/essential-stellar-onchain.md`
   - Off-chain essentials: `reference/essential-stellar-offchain.md`
   - Capo helpers: `reference/essential-capo-helpers.md`
   - Architecture overview: `reference/essential-stellar-dapp-architecture.md`

