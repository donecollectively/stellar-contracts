

let DEBUG;
let CARDANO_NETWORK;
let NODE_ENV;
let OPTIMIZE;
  //@ts-expect-error
  if(import.meta?.env && import.meta.env) {
  console.log('VITE env');
  //@ts-expect-error
  DEBUG = parseInt(import.meta.env.VITE_DEBUG || "0");
  //@ts-expect-error
  CARDANO_NETWORK = import.meta.env.VITE_CARDANO_NETWORK || "preprod";
  //@ts-expect-error
  NODE_ENV = import.meta.env.DEV ? "development" : "production";
  //@ts-expect-error
  OPTIMIZE = parseInt(import.meta.env.VITE_OPTIMIZE || "0");
}
else {
    console.log("non-vite - process.env")
  DEBUG = parseInt(process.env.DEBUG || "0");
  CARDANO_NETWORK = process.env.CARDANO_NETWORK || "preprod";
  NODE_ENV = process.env.NODE_ENV || "development";
  OPTIMIZE = parseInt(process.env.OPTIMIZE || "0");
}

console.log(DEBUG);

export const environment = {
    DEBUG,
    CARDANO_NETWORK,
    NODE_ENV,
    OPTIMIZE
}