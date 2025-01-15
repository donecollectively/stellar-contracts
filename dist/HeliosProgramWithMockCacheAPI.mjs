// src/helios/HeliosProgramWithMockCacheAPI.ts
import { Program } from "@helios-lang/compiler";

// src/HeliosPromotedTypes.ts
import {
  encodeUtf8,
  decodeUtf8
} from "@helios-lang/codec-utils";

// src/helios/HeliosProgramWithMockCacheAPI.ts
var HeliosProgramWithCacheAPI = class extends Program {
  constructor(mainSource, props) {
    super(mainSource, props);
  }
  async compileWithCache(optimizeOrOptions) {
    return this.compile(optimizeOrOptions);
  }
};
export {
  HeliosProgramWithCacheAPI
};
//# sourceMappingURL=HeliosProgramWithMockCacheAPI.mjs.map
