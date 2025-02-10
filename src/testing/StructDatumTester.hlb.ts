import { CapoHeliosBundle } from "../helios/scriptBundling/CapoHeliosBundle.js";
import { HeliosScriptBundle } from "../helios/scriptBundling/HeliosScriptBundle.js";
import StructDatumTesterScript from "./StructDatumTester.hl";
/**
 * A CapoHeliosBundle subclass that can be used with generic UUTs.
 */
export default class StructDatumTesterBundle 
extends HeliosScriptBundle.usingCapoBundleClass(
    CapoHeliosBundle
) {
    get main() {
        return StructDatumTesterScript;
    }
    get modules() {
        return [];
    }
}
