export default class needResolveConditions {
    constructor() {
        throw new Error(`

This app tried to load a deployed on-chain script bundle, without
having indicated a network-id.

To resolve deployed on-chain script bundles, you need to specify
custom resolver condition to connect the specific deployment
environment with the pre-compiled scripts for that environment.

In Next.js, try something like this in next.config.js:
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: true
  },
  webpack: (config) => {
    config.resolve.conditionNames.push(`network-${CARDANO_NETWORK || "preprod"}`);
    return config;
  }
    ...
                        `)
                    }

In VIte, use its resolve.conditions setting.
- see https://vite.dev/config/shared-options.html#resolve-conditions
                 
export default defineConfig({
     ...
     resolve: {
         conditions: [
             `network-${process.env.CARDANO_NETWORK || "preprod"}`
         ]
 })

More about conditional exports and the resolver conditions they match:

https://nodejs.org/docs/latest-v22.x/api/packages.html#conditional-exports
`  
}
}
