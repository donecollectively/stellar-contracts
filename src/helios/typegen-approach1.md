## Type Generation for helios scripts in Stellar Contracts

### approach 1

The first approach we attempted for type-generation used a Rollup plugin
that watched for imports of .hlb.[tj]s files

As each .hlb.* file was loaded, it was written to a temporary directory 
and loaded to the Rollup process with async import().

This required a custom node.js loader to be registered, in which 
resolution and loading of .hl files, already implemented as a Rollup 
loader, were reproduced to enable the .hlb file's depenencies
to be loaded.  

Using node.js 22's type-stripping, we were able to resolve imports of TypeScript dependencies
load the underlying program just-in-time, and then trigger the type-generation functions
in the Helios lib.  

However, this approach proved to be rather slow, as it includes Helios optimization & IR generation.
It also required typescript imports to be rewritten to reference .ts files directly, resulting in 
a need to change the typescript configuration.  Although nodejs type-stripping and Typescript
configurations may converge eventually, it's not likely to be an entirely smooth path; so we went 
in search of other options.

See approach-2.
