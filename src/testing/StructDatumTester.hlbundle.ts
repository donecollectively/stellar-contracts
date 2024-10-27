
import { HeliosScriptBundle } from "../helios/HeliosScriptBundle.js";
import StructDatumTesterScript from "./StructDatumTester.hl";
/**
 * A CapoHeliosBundle subclass that can be used with generic UUTs.
 */
export default class StructDatumTester extends HeliosScriptBundle {
    get main() {
        return StructDatumTesterScript;
    }
    get modules() { return [] }    
}
