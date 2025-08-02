let DEBUG : number;
let CARDANO_NETWORK: string;
let NODE_ENV: string;
let OPTIMIZE: number;
let BF_API_KEY: string;

const isNodeJS =typeof process !== 'undefined' 
const cwd = isNodeJS ? process.cwd() : ""

let anyNEXTjsCue = process.env.NEXT_PUBLIC_DEBUG || 
    process.env.NEXT_PUBLIC_CARDANO_NETWORK || 
    process.env.NEXT_PUBLIC_OPTIMIZE || 
    process.env.NODE_ENV;

if (
    ( () => {
        try {
            //@ts-expect-error
            return import.meta.env
        } catch (e) {
            return undefined
        }
    }
)()) {
    console.log("VITE env - using import.meta.env");
    //@ts-expect-error
    DEBUG = parseInt(import.meta.env.VITE_DEBUG || "0");
    //@ts-expect-error
    CARDANO_NETWORK = import.meta.env.VITE_CARDANO_NETWORK || "preprod";
    //@ts-expect-error
    NODE_ENV = import.meta.env.DEV ? "development" : "production";
    //@ts-expect-error
    BF_API_KEY = import.meta.env.VITE_BF_API_KEY || "";
    //@ts-expect-error
    OPTIMIZE = parseInt(import.meta.env.VITE_OPTIMIZE || "0");
} else if (anyNEXTjsCue) {
    console.log("nextjs worker env - using NODE_ENV and NEXT_PUBLIC_*");
    DEBUG = parseInt(process.env.NEXT_PUBLIC_DEBUG || "0");
    CARDANO_NETWORK = process.env.NEXT_PUBLIC_CARDANO_NETWORK || "preprod";
    NODE_ENV = process.env.NODE_ENV || "development";
    BF_API_KEY = process.env.NEXT_PUBLIC_BF_API_KEY || "";
    OPTIMIZE = parseInt(process.env.NEXT_PUBLIC_OPTIMIZE || "0");
} else {
    console.log("non-vite, non-nextjs - consulting process.env keys directly");
    DEBUG = parseInt(process.env.DEBUG || "0");
    CARDANO_NETWORK = process.env.CARDANO_NETWORK || "preprod";
    NODE_ENV = process.env.NODE_ENV || "development";
    BF_API_KEY = process.env.BF_API_KEY || "";
    OPTIMIZE = parseInt(process.env.OPTIMIZE || "0");
}

// console.log(process.env);
console.log("env:", {DEBUG, CARDANO_NETWORK, NODE_ENV, BF_API_KEY, OPTIMIZE, cwd, });

/**
 * @public
 */
export const environment = {
    DEBUG,
    CARDANO_NETWORK,
    BF_API_KEY,
    NODE_ENV,
    OPTIMIZE,
    cwd,
};
