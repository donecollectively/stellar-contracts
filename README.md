# Stellar Contracts

A Typescript library for high-functioning Cardano smart contracts using the Helios language

## How and Why?

Small smart contracts can be built for Cardano using multiple languages 
including Haskell, Aiken, Helios, Python, and others.  However, 
creating practical applications that need to use rich
data structures, manage multiple kinds of data, and have support for 
incremental on-chain software improvements can get unwieldy, regardless 
of the underlying smart-contract language.

Stellar Contracts is a suite of Cardano off-chain and on-chain software, 
supporting real-world software applications throughout their lifecycles.
It directly supports different aspects of your application to be created 
as granular policies - so that each part of your application can be simple, 
while supporting integrated behavior and in-place upgrades.

The result?  You can create sophisticated applications that support 
modern practices of software management, including incremental 
releases, on-chain upgrades of behavior, database record-management, and 
responsible management of funds, collectibles and other digital assets.

### Compared to traditional database applications 

Apps built with Stellar Contracts support data creation and high-assurance 
data-updates, improving on the outcomes of even best-in-class database 
applications. They can also add payments and other workflows, integrating 
funds management logic.  

With easy access to the essentials of accounting and other ledger-based operations, they can 
skip many of the hassles of keeping books balanced.  They also benefit from 
Cardano's rigorous research-backed technology and its global consensus, 
whether on the Cardano mainnet or private side-chains.  

### Compared to other Cardano frameworks

Relative to today's capabilities for Cardano applications and frameworks, 
apps built with Stellar Contracts gain high-quality patterns of software 
composition, segmentation of responsibilities, and SDLC management.  They 
gain the ability to treat on-chain UTxO's as database records, and can 
perform instant on-chain upgrades of the policies that control those records, 
when needed.

Using its layered approach, with the Helios on-chain language and its 
JavaScript-based off-chain APIs for accessing on-chain records and 
transaction building, Stellar Contracts provides direct support for off-chain 
Typescript classes that fit your application, so that you can construct a 
domain-specific API fitting your application, and distribute it as a 
separate module if you like.  And you can wire up that dAPI to your 
dApp's UI.

## How does it work?

### Fluent off-chain APIs for UTxO-finding and transaction building

Off-chain, the base classes provided by the Stellar Contracts library 
provide a beautifully-typed off-chain environment for **building 
transactions fitting your application's use cases**.  It includes 
classes, types, and autocomplete for every data structure defined in 
your on-chain code, easily accessible from TypeScript.

### Rich applications with all the accoutrements

On-chain, we have **prepared modules for multi-contract applications 
and upgradability** (along with the finicky essentials they need, and 
the off-chain support elements to match).  Thanks to **Helios' highly 
accessible language** for expressing functional policies and packaging 
data-structure definitions together with a lightweight style of expressing 
the object-oriented business logic they need.  Helios' inspired 
language design and rigorous implementation enables a 
"Plutus-and-a-little-extra" environment that helps make our on-chain APIs 
so powerful.

We have also provided a **top-level application** component for every 
dApp (the Capo, or "leader" contract) for positively managing the 
software-development lifecycle and for plugging in on-chain and off-chain 
functions to your app - so you can start small and incrementally build new 
functionality (on-chain and off-chain), **without ever changing the main 
address for your contract**.

This thoughtful, sophisticated arrangement of software infrastructure 
provides a smooth, ergonomic surface for your developers of on-chain, 
transaction-building, and UI software, so you can focus on making your 
essential product elements, securing your on-chain transactions, and 
creating great user experiences.  

### Transparency and clarity for the win

Every on-chain script also has a toolkit ready for production 
applications, providing script-execution tracing and diagnostics.  These 
diagnostics reflect every core requirement, along with conditional 
expectations and situational logging of details for powerful clarity about 
your on-chain transaction executions.  This gives you tremendous power 
to better support customers and provide user-facing progress information 
and transparency. 

They also help you easily troubleshoot contract logic at development time and 
enhance effectiveness and efficiency for auditors.

### Specs and Tests

Stellar Contract's test helpers provide a fluent environment for **spelling 
out scenarios and verifying expectations that need to hold true**, including 
an emulated blockchain for smooth automated testing of positive ("works when 
it should") and negative ("fails when, where, and how it's supposed to") test 
scenarios.  ***This is a key enabler for iterative development, in which your development team makes a basic thing work, provably - then continues augmenting and refining results while the tests take charge of continuously guarding against regression.***

Because writing on-chain software needs a level of assurance that can't be 
possible without really clear and complete requirements, we provide type-safe 
requirements-management utilities to support you in ***rigorously keeping 
track of what your dApp really needs to do.  These combine with 
test automation, helping your responsible developers create very reliable 
results.***

### UI Integration and High-performance data management

By combining Stellar Contracts with your choice of UI-layer JavaScript 
framework, you can get powerful yet straightforward blockchain integration for 
building dApps, without requiring any server-side or build environment.  

Please enquire about our UI, sidechain, database integration, and real-time 
multi-user coordination components for support of dApps needing larger 
databases, high transaction volumes, and real-time collaborative experiences 
for your audiences.

## Guidelines

See [creating a delegate](creating-a-delegate.md) for a recipe for creating 
new contract logic plugging into an existing Stellar Contract suite.

## Acknowledgements

The Helios library makes Cardano smart contracts easily accessible from 
TypeScript.  Its great documentation,  ongoing development, and 
thoughtful language design provide a powerful, accessible surface for 
functional programming (and more than a bit extra) on Cardano.  Its powerful 
off-chain API also supports our minimal-dependency-tree philosophy, 
maintaining simplicity in your software supply chain.

Special thanks to https://github.com/aleeusgr/potential-robot for initial 
research and development harnessing Helios' capabilities in a testing 
environment.

## Getting started

  * `pnpm i @donecollectively/stellar-contracts`
  * `cardano-stellar init`  // TODO
  * `cardano-stellar add-delegate` // TODO
  
  
## Getting started developing in this repo
  
  * `nvm use`
  * `pnpm i`
  * `pnpm test`

