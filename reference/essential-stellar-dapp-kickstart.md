# Stellar dapp kickstart (builder’s guide)

Use this as a map; the detailed, step-by-step off-chain flow now lives in `reference/essential-stellar-offchain.md`, and lifecycle duties in `reference/essential-capo-lifecycle.md`.

## What you need before coding
- Read: on-chain, off-chain, architecture, internals.
- Tools: Node/PNPM, Helios toolchain; wallet + network client.
- Seed UTxO: one UTxO with enough ADA for charter + ref scripts; capture `{seedTxn, seedIndex}`.
- Build bundles/bridges: run rollup/build so Capo/delegates/controllers have compiled bundles.

## Build your app

### Start with a skeleton 
- Implement a basic Capo subclass with `delegateRoles()` and feature flags.
- Make a dApp UI skeleton using CapoDappProvider and related React components.  Astro works well for this.  See essential-stellar-ui.md
- Run the dApp in development mode.
- Charter your app in preproduction - the UI should help you deploy the initial version.
- Get the deployed configuration json and re-build your dApp bundle to include the deployed configuration and pre-compiled script policies.
- Use the CharterStatus page/component to check the deployment status and trigger upgrades and on-chain policy creation if needed.

### Add more data policies
- import delegate controllers from Stellar Contracts or Stellar Tokenomics, or build your own.  Implement `delegateRoles()` and feature flags to make the policies active.  See essential-stellar-data-policy.md
- Use CharterStatus page to deploy new policies
- When writing a data-policy delegate, implement `additionalDelegateValidation(priorIsDelegationDatum, capoCtx)`; it runs once per nested activity (including inside `MultipleDelegateActivities`). Handle your policy’s spending/minting/burning variants here, rejecting anything unexpected and using `capoCtx` helpers (e.g., `creatingDgData`, `updatingDgData`) to read CIP-68 payloads and enforce business rules.  
 - You only need to process Minting/Spending/Burning activities here; Other activities are rarely needed and some of those activities will never be invoked or triggered in your additionalDelegateValidation() function.  You can use a `_ => true` default case in the switch, to ignore activities you don't need to process.
 - See essential-stellar-onchain.md for more details.

### Define Requirements
- Clearly define the requirements for your application. This helps everyone agree on what it needs to do, and gives you a point of reference for testing and development.

### Create automated tests
Tests run a simulated blockchain environment to verify policy code without deploying it to a live network.  See essential-stellar-testing.md

### Iterate the policy code and tests
- Iterate the policy code and tests as needed.
- Commit changes and deploy updates to preproduction when you're satisfied.
- use CharterStatus page to deploy policy updates.

### Develop UI
- Develop the UI for your application.  See essential-stellar-ui.md
- Run the dApp in development mode (preproduction network) 
- Use DataManager and FormManager to find, display, and show onscreen forms for record creation/updating.  
 - And/or write your own UI components to gather user intentions, and construct transactions using a data-controller fetched via `getDgDataController()` from the Capo instance (found in the CapoDappProvider context).  See essential-stellar-offchain.md
 - See essential-stellar-ui.md for more details.

