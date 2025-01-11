    // During initialization, it loads the .hlproject.js file from the project root,
    // parsing for the .hlb(undle).* mentioned in the project file, it verifies that they exist
    // any not existing are reported as warnings, and commented out of the project file.
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

    // During (load or) transformation, it registers each used .hlb(undle).js file, and when the build is complete,
    // it writes an updated .hlproject.js file with the list of all bundles used in the build.
    // Finally, it dynamically imports the updated project file, initializing the next version of the project and
    // generates types for each bundle.  If any of these are changed (e.g. vs the 'any' types generated for new bundles),
    // it writes the updated types to the .d.ts file for that bundle.  It doesn't write the .d.ts file if the types are unchanged.
    // 
