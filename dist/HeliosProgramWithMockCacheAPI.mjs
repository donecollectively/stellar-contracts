// src/helios/HeliosProgramWithMockCacheAPI.ts
import { Program } from "@helios-lang/compiler";
var HeliosProgramWithCacheAPI = class extends Program {
  cacheEntry = void 0;
  constructor(mainSource, props) {
    super(mainSource, props);
  }
  compileTime;
  static checkFile(srcFilename) {
    return null;
  }
  async compileWithCache(optimizeOrOptions) {
    return this.compile(optimizeOrOptions);
  }
};
export {
  HeliosProgramWithCacheAPI
};
//# sourceMappingURL=HeliosProgramWithMockCacheAPI.mjs.map
