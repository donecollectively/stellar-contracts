# Stellar UI essentials

## MUST READ: Context and Dependencies

Before studying this document, you should understand the off-chain patterns in `reference/essential-stellar-offchain.md` and the overall architecture in `reference/essential-stellar-dapp-architecture.md`.

The Stellar Contracts UI layer is React-based. The `CapoDappProvider` is the main entry point — it provides the Capo instance, wallet integration, transaction batching, and status portals to the rest of your application.

For building a dApp UI from scratch, see the kickstart guide at `reference/essential-stellar-dapp-kickstart.md`. For detailed component architecture and state machines, see `dapp-ui.architecture.md`.

## CapoDappProvider

- The `CapoDappProvider` component provides a React context for the Capo instance, and a portal for the tx batch UI.
- Each application should create their own subclass of CapoDappProvider, and render `<TheirCapoProvider>...</TheirCapoProvider>` in their layout, passing their own Capo as the `capoClass` prop (along with other key details). There is a React signals pattern for subscribing to updates from the provider, easily wired up with the other props.
- The `useCapoDappProvider()` hook gives access to the Capo instance and the provider from anywhere in the application.

### Portals

- The provider provides portals for the Capo status UI (current network, address, balance) and the transaction batch UI.
- dApp developers should provide divs in their layout for these portals (txBatchUI, capoStatus, capoUserDetails), or use the `uiPortals=` prop to map those names to the ids of the portals in their layout.
- dApp developers may also take full control of the presentation, with multiple options. With `uiPortals="headless"`, they can take full control of the UI elements for status, and SHOULD respond to state updates observed in the provider to display relevant information to the user. They may instead override the default renderers in their subclass, while using ui portals to let the provider manage the placement of the resulting UI elements in their layout.

## Transaction Batch UI

- The `TxBatchUI` component provides a UI for interacting with a batch of transactions, with support for viewing the status of each transaction, submitting transactions, and observing the resulting transaction confirmations.
- Its advanced view shows more details about each transaction, including the detailed logs of each script policy, its executed requirements and diagnostic outputs.

## CharterStatus

- The `CharterStatus` component provides a dashboard-style screen showing the current status of the Capo, including the current charter data, current charter token, current charter links, and current charter manifest.
- When loaded, it checks for any on-chain policies needing upgrades, and displays a button to trigger the upgrade transactions.
- See `reference/essential-offchain-bootstrapping.md` for the charter lifecycle operations that CharterStatus triggers.

## DataManager & FormManager

- The `DataManager` helps applications find, display, and work with on-chain delegated data records. It connects to data controllers fetched via `getDgDataController()` from the Capo instance (available through the CapoDappProvider context).
- The `FormManager` provides headless form state management for creating and updating delegated data records, with related helper classes and UI components for displaying and managing forms.
- Together, DataManager and FormManager give dApp developers a streamlined path from on-chain data discovery to user-facing forms — without needing to build transaction plumbing manually. See `reference/essential-stellar-offchain.md` for the underlying delegated data controller patterns.

## Tailwind integration

The provider's default renderers are styled with tailwind classes that reference the application's branding colors. Application developers should customize their theme colors with css variables and they will need to add tailwind to their project. They should ensure their tailwind processes the library's css variables and styles.

Add these lines to your `src/styles/global.css`:
```
@source "../../node_modules/@donecollectively/stellar-contracts/dist/ui.mjs";
@source "../../node_modules/stellar-tokenomics/dist/*.mjs";
```

### Theme variables

Set the following in your `tailwind.css` file:
```
    --color-background: hsl(217 33% 17%);
    --color-foreground: hsl(210 40% 80%);
    --color-primary: hsl(217 91% 60%);
    --color-primary-foreground: hsl(210 40% 98%);
    --color-secondary: hsl(217 10% 64%);
    --color-secondary-foreground: hsl(217 33% 17%);
    --color-accent:  hsl(37, 83%, 47%);
    --color-card: hsl(217 40% 22%);
    --color-card-foreground: hsl(210 40% 98%);
    --color-border: hsl(217 60% 66%;)
    --color-ring: hsl(224 76% 65%);
```

Adjust the theme colors to suit your needs.

> NOTE: If you use an older version of tailwind that uses different conventions, where `className="text-(--color-accent)"` is built from raw theme value `--accent-foreground`, you may need to upgrade tailwind or adjust your --color attributes to follow these values as hsl colors.

## Cross-links
- Off-chain flows: `reference/essential-stellar-offchain.md`
- Architecture view: `reference/essential-stellar-dapp-architecture.md`
- Kickstart guide: `reference/essential-stellar-dapp-kickstart.md`
- Bootstrapping & lifecycle: `reference/essential-offchain-bootstrapping.md`
- UI component architecture: `dapp-ui.architecture.md`
- Tailwind setup details: `src/ui/README.md`
