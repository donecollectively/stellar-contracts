## Type Generation for helios scripts in Stellar Contracts
### Approach 2
#### Goals
  - Use node 20, not experimental node 22 TS loading
  - Don't rely on HeliosLib's .typeCheckScripts and writeValidators(), as they do much more 
    than needed to enable encoding of Redeemers and encoding/decoding of Datum, which
    represent the 90% needs of off-chain code
 - Generate types for Datum (read/write) and Redeemer (txn-building only)
 - Expose type-safe accessors for each Datum/Redeemer variant, so off-chain code
    can easily be written, autocompleted, and type-checked by vscode and typescript.
 - Low-latency access to any Helios compilation problems
 - Minimize delays between type changes in Helios sources and the resulting off-chain
    types, so that any resulting Typescript type changes are quickly reflected in off-chain code.
 - Minimal code-generation; ideally, only types are generated, while the code that actually
    transforms data to and from UPLC format will be type-agnostic, based on type-safe 
    interfaces.
    
### Overall approach

This approach is Rollup-centric, supporting `vitest` and `vite` due to their use of Rollup.
When developers use these tools (including direct `rollup --watch` live bundling), they should
get a very fluid experience with off-chain types kept nicely in-sync with on-chain definitions.

This approach uses a generational technique, in which the results of running the full Rollup 
sequence produces useful Javascript artifacts representing the full set of Helios contract 
scripts.  This is easily loaded into Rollup during the next run with a simple import.  In the first 
generation, an empty Project is generated, representing "no known scripts".  In subsequent
generations, the known scripts are part of the Project (see below for how it is used).

Note that the Helios type-gen plugin is separate from the Helios Source plugin, which loads and
transforms .hl files into a javascript structure suitable for Helios' `Source` interface for modules 
and validators.  

#### multi-phase rollup build

The rollup build is segmented into three phases: the first, a normal typescript project build that 
includes the Helios type-gen plugin that identifies any `*.hlbundle.js` files used by various contract 
scripts in the dApp's typescript code.  In the second phase of the build, the registered .hlbundle files 
are used to form a "just the contract scripts" package including type-generation code. 

In the third build phase, that type-generation code is triggered, writing (if needed) the detected types 
to `.d.ts` files next to each `.hlbundle.js`.

#### building at Generation 1

As a result of running (all three build phases in) Generation 1, types for each `*.hlbundle.js` are written, 
representing the off-chain types Helios can use for converting to (and from) on-chain form; these are 
immediately used by vscode.

#### building at Generation 2

Starting in Generation 2, the Project is available within the Rollup process.  More importantly,
`hlbundle.d.ts` files are ready in the filesystem for use by vscode, `vitest`, `rollup`, and any other 
typescript tooling.

There's an implication that the Helios artifacts used by Generation 2 are identical to the INPUT artifacts 
from Generation 1.  Therefore the resulting `.d.ts` files shouldn't be modified.

Typescript/javascript changes could be present, without implying advancement to Generation 3.  Rollup
and `vitest` will pick up those changes and act normally.  During each of these builds, teh Project 
information is loaded and referenced, but because no changes to the Helios input files are seen, no new 
off-chain types are needed.

#### building at Generation 3

Generation 3 is triggered when some Helios scripts have changed (the **types** found in those files
might not have any changes).

The Project's structure is crafted such that the Helios script files (`*.hl`) are read synchronously, 
with their up-to-the-moment contents.  As a result, ***any compilation problems introduced 
are presented immediately to the developer***.  Ideally this does not interrupt the `rollup --watch` 
workflow, and ideally Rollup and `vitest` will present any problems seen in the same way they'd do in 
the presence of javascript problems.  Meanwhile, the previous generation of `.d.ts` output will naturally 
continue to be active - for better or worse.  

Given successful parsing of any changes, the Rollup plugin uses the Project's interface to write any updated 
types to each `.hlbundle.d.ts` file, just in time for them to be used for detailed type information during that 
same build.  Beyond use by Rollup, ***this step is crucial for realtime type updates***, which we want to 
see right away in VSCode.  Thus, failing to run `rollup --watch` or `vitest watch` (or a workable alternative) will 
mean that on-chain types can get out of sync with the last-generated "off-chain" types, so Typescript and vscode 
won't reflect any problems in red.  So devs should keep that bundler running!

### Rollup initialization

During initialization, the Helios type-gen plugin checks for a `hlproject.js` in the project root.  If it does not exist, 
an empty Project object is 
created ("Generation 1" is implied).

Advanced: It loads the `hlproject.js` file from the project root, parsing for the .hlbundles mentioned in the project 
file, verifying that they exist; any not existing are reported as warnings, and commented out of the project file.

Each `.hlbundle.js` seen in the Project is iterated, and its current types are generated (in a `.d.ts` file next to the
`*.hlbundle.js` file).   The text of those generated types is compared to the text of any current `.d.ts` file.  If they
differ, an updated .d.ts file is written.

### Stage 2: Resolution of `*.hlbundle.js` files

During stage 2 of the Rollup

During
this first build, each encountered .hlbundle.ts file is registered by the Helios type-gen plugin.  
In the second phase of the build, a `hlproject.ts` file is created (or updated), to include all the 
`*.hlbundle.ts` modules.

In the second, smaller phase of the build, Rollup is instructed to take the generated .hlproject.ts as 
input, transpiling and bundling `dist/hlproject.mjs` (the artifact mentioned above).  



    // having processed the project file during startup, it then dynamically imports that project 
    // (to the Rollup process).

    // if there is no .hlproject.js file, it registers an empty set of bundles.  Otherwise, it  accesses all 
    // of the bundles imported from the project, finds the CapoBundle class (currently limited 
    // to one per project) and instantiates each bundle.  ??? can it report any Helios compile errors
    // at this time?  this would give faster error reporting to the user, if it doesn't mess up the 
    // rollup build process.

    // During resolution, it answers queries for .d.ts types for each bundle, with a synthetic typescript
    // file representing the current types implied by any known heilos code (from the Rollup process) 
    // in that bundle.  If there is no corresponding bundle (because it is being seen for the first time)
    // known by the Rollup process, the types are synthesized as 'any'.
    // The types generated are then written to a .d.ts file, and that file is resolved as the answer to the
    // resolveId query.

    // During (load or) transformation, it registers each used .hlbundle.js file, and when the build is complete,
    // it writes an updated .hlproject.js file with the list of all bundles used in the build.
    // Finally, it dynamically imports the updated project file, initializing the next version of the project and
    // generates types for each bundle.  If any of these are changed (e.g. vs the 'any' types generated for new bundles),
    // it writes the updated types to the .d.ts file for that bundle.  It doesn't write the .d.ts file if the types are unchanged.
    // 
