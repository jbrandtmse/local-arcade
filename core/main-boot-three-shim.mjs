// Story 2.3 QA boot tier: the "three" seam main.ts sees under
// core/main-boot-qa.test.ts's module.registerHooks. Real three for every-
// thing headless-safe (the math/geometry/objects tier the real-three tests
// already trust); WebGLRenderer (the one DOM-coupled constructor boot
// touches) becomes a recording stub, and PointLight construction is
// recorded so the boot test can observe the shipped rig graph's lights.
// Story 2.4 adds the PerspectiveCamera record: the Settings rows feed the
// camera at CONSTRUCTION (fov) and at commit (fov + projection) — the boot
// test reads the live camera's own scalar off the recorded instance.
// Reached ONLY via the hook (parentURL guard below) from that one test
// file; every other suite boots in its own process and sees real three.
export * from "three";
import { PerspectiveCamera as RealPerspectiveCamera, PointLight as RealPointLight } from "three";

export const pointLightsBuilt = [];
export const camerasBuilt = [];

export class PerspectiveCamera extends RealPerspectiveCamera {
  // The CONSTRUCTION-time fov, frozen before any boot-time applyRows can
  // overwrite it — the eager-order pin must see the constructor argument,
  // not the live scalar (2.4 review: a hardcoded 60 in main.ts must read
  // red here even though applyRows re-applies the row moments later).
  ctorFov = this.fov;
  constructor(...args) {
    super(...args);
    camerasBuilt.push(this);
  }
}

export class PointLight extends RealPointLight {
  constructor(color, intensity, distance) {
    super(color, intensity, distance);
    pointLightsBuilt.push(this);
  }
}

export class WebGLRenderer {
  constructor() {
    this.domElement = {
      width: 0,
      height: 0,
      style: {},
      addEventListener() {},
      requestPointerLock() {},
    };
    this.capabilities = { getMaxAnisotropy: () => 1 };
    this.toneMapping = 0;
    this.toneMappingExposure = 1;
  }
  setClearColor() {}
  setSize() {}
  setPixelRatio() {}
  render() {}
}
