declare module "*.hl" {
    import type { HeliosModuleSrc } from "../helios/HeliosModuleSrc.js";

    const value: HeliosModuleSrc;
    export default value;
}
