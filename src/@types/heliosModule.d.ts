declare module "*.hl" {
    import type { Source } from "@helios-lang/compiler-utils";

    const value: Source;
    export default value;
}
