# Stellar Contracts

A Typescript library for high-functioning Cardano smart contracts using the Heliios language

## How and Why?

Small smart contracts can be built for Cardano using multiple languages including Haskell, Aiken, Helios, Python, and others.  However, creating more practical applications that need to use more detailed data structures, multiple kinds of data, and have support for incremental on-chain software improvements becomes unwieldy with the tooling they offer.

Stellar Contracts provides a complete off-chain and on-chain suite of software for real-world software applications using the Cardano Ouroborous ledger.  It directly supports different aspects of your application to be created as granular policies - so that each part of your application can be simple, while supporting interlinking.  

The result?  You can create sophisticated applications that can take incremental, in-place upgrades AND handle money.

Relative to traditional database applications, apps built with Stellar Contracts can add payments and with low-level essentials for accounting and tokenomics, they can skip many of the hassles for keeping the books balanced; and they benefit from other features of public-ledger technology, such as global consensus, on Cardano mainnet or on private side-chains.  

Relative to typical Cardano applications, apps built with Stellar Contracts gain high-quality patterns of software decomposition, segmentation of responsibilities, and SDLC management.  They gain the ability to treat on-chain UTxO's as database records, with the ability to perform instant upgrades of the policies that control those records, when needed.

Layering on the Helios on-chain language and its Javascript-based off-chain APIs for accessing on-chain records and transaction building, Stellar contracts provides direct support for off-chain Typescript classes fitting your application, so you can construct a domain-specific API fitting your application, and distribute it as a separate module if you like.  And you can wire up that dAPI to your dApp's UI.

## How does it work?

Off-chain, the base classes provided by the Stellar Contracts library provide a beautifully-typed off-chain environment for **building transactions fitting your application's use cases**.  

On-chain, we have **prepared modules for multi-contract applications and upgradability** (along with the finicky essentials they need, and the off-chain support elements to match).  Thanks to **Helios' highly accessible language** for including core OO-like objects (WITH object methods but WITHOUT inheritance) and for its "Plutus-and-a-little-extra" environment that help make our on-chain API so powerful.

We have also provided a **top-level application** component for every dApp (the Capo, or "leader" contract) for positively managing the software-development lifecycle and for plugging in on-chain and off-chain functions to your app - so you can start small and incrementally build new functionality (on-chain and off-chain), **without ever changing the main address for your contract**.

Stellar Contract's test helpers provide a fluent environment for **spelling out scenarios and verifying expectations that need to hold true** in those scenarios, and we provide type-safe requirements-management utilities for expressing core expectations for your software components.  Writing on-chain software needs a level of assurance that can't be possible without really clear and complete requirements, and these utilities support you in rigorously keeping track of what your dApp really needs to do.

When you combine Stellar Contracts with your choice of UI-layer Javascript code, you get powerful yet straightforward blockchain integration for building dApps without any server-side or build environment.  

## Guidelines

See [creating a delegate][creating-a-delegate.md] for a recipe for creating new contract logic plugging into an existing Stellar Contrract suite.

## Acknowledgements

The Helios library makes Cardano smart contracts easily accessible from Typescript.  Its great documentation,  ongoing development and very thoughtful language design provide a powerful, accessible surface for functional programming (and more than a bit extra) on Cardano.

Special thanks to https://github.com/aleeusgr/potential-robot for developments harnessing Helios' capabilities in a testing environment

## Getting started

  * `pnpm i @donecollectivelhy/stellar-contracts`
  * `cardano-stellar init`  // TODO
  * `cardano-stellar add-delegate` // TODO
  
  
## Getting started developing in this repo
  
  * `nvm use`
  * `pnpm i`
  * `pnpm test`

