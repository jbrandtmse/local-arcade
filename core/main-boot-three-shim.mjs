// Story 2.3 QA boot tier: the "three" seam main.ts sees under
// core/main-boot-qa.test.ts's module.registerHooks. Real three for every-
// thing headless-safe (the math/geometry/objects tier the real-three tests
// already trust); WebGLRenderer (the one DOM-coupled constructor boot
// touches) becomes a recording stub, and PointLight construction is
// recorded so the boot test can observe the shipped rig graph's lights.
// Reached ONLY via the hook (parentURL guard below) from that one test
// file; every other suite boots in its own process and sees real three.
export * from "three";
import { PointLight as RealPointLight } from "three";

export const pointLightsBuilt = [];

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
