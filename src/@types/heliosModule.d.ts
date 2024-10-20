declare module "*.hl" {
    import type { HeliosModuleSrc } from "src/helios/HeliosModuleSrc.js";

    const value: HeliosModuleSrc;
    export default value;
}
