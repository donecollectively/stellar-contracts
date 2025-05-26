let DEBUG;
let CARDANO_NETWORK;
let NODE_ENV;
let OPTIMIZE;
const isNodeJS = typeof process !== "undefined";
const cwd = isNodeJS ? process.cwd() : "";
let anyNEXTjsCue = process.env.NEXT_PUBLIC_DEBUG || process.env.NEXT_PUBLIC_CARDANO_NETWORK || process.env.NEXT_PUBLIC_OPTIMIZE || process.env.NODE_ENV;
if ((() => {
  try {
    return import.meta.env;
  } catch (e) {
    return void 0;
  }
})()) {
  console.log("VITE env - using import.meta.env");
  DEBUG = parseInt(import.meta.env.VITE_DEBUG || "0");
  CARDANO_NETWORK = import.meta.env.VITE_CARDANO_NETWORK || "preprod";
  NODE_ENV = import.meta.env.DEV ? "development" : "production";
  OPTIMIZE = parseInt(import.meta.env.VITE_OPTIMIZE || "0");
} else if (anyNEXTjsCue) {
  console.log("nextjs worker env - using NODE_ENV and NEXT_PUBLIC_*");
  DEBUG = parseInt(process.env.NEXT_PUBLIC_DEBUG || "0");
  CARDANO_NETWORK = process.env.NEXT_PUBLIC_CARDANO_NETWORK || "preprod";
  NODE_ENV = process.env.NODE_ENV || "development";
  OPTIMIZE = parseInt(process.env.NEXT_PUBLIC_OPTIMIZE || "0");
} else {
  console.log("non-vite, non-nextjs - consulting process.env keys directly");
  DEBUG = parseInt(process.env.DEBUG || "0");
  CARDANO_NETWORK = process.env.CARDANO_NETWORK || "preprod";
  NODE_ENV = process.env.NODE_ENV || "development";
  OPTIMIZE = parseInt(process.env.OPTIMIZE || "0");
}
console.log("env:", { DEBUG, CARDANO_NETWORK, NODE_ENV, OPTIMIZE, cwd });
const environment = {
  DEBUG,
  CARDANO_NETWORK,
  NODE_ENV,
  OPTIMIZE,
  cwd
};

export { environment as e };
//# sourceMappingURL=environment.mjs.map
