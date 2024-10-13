declare module "*.hl" {
    import type { HeliosModuleSrc } from "../helios/HeliosModuleSrc.ts";

    const value: HeliosModuleSrc;
    export default value;
}
