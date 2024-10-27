import { CapoHeliosBundle } from "../src/CapoHeliosBundle";
import StructDatumTester from "../src/testing/StructDatumTester.hlbundle.js";

// import StructDatumTesterScript from "../src/testing/StructDatumTester.hl";
/**
 * A CapoHeliosBundle subclass that can be used with generic UUTs.
 */
export default class CapoBundleWithGenericUuts extends CapoHeliosBundle {
    // get modules() {  // optional
    //     return [
    //         ...super.modules,
    //         StructDatumTesterScript,
    //     ];
    // }
}
