import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { getBackdropTexture } from './materials.js';

/**
 * Motor de render por acumulación (rasterización distribuida) de POZOLE.
 *
 * En lugar de un solo cuadro se dibujan muchas pasadas de la escena. En cada una:
 *   · la cámara se desplaza una fracción de píxel   → antialiasing
 *   · una luz direccional recorre la bóveda celeste → luz de cielo con oclusión ambiental
 *   · la luz principal se mueve dentro de un cono   → sombras con penumbra suave
 *   · las luces interiores se mueven un poco        → sombras suaves de lámparas
 * Las pasadas se suman en un buffer de 32 bits y se promedian; el resultado mejora de forma
 * progresiva, así que la misma escena sirve para una vista previa interactiva (pocas pasadas)
 * y para la imagen final (cientos). El suelo solo aporta sombra, que sale en el canal alfa.
 *
 * Uso:
 *   const engine = new RenderEngine(canvas);
 *   engine.setSize(1200, 900);
 *   engine.load({ scene, lighting });
 *   engine.setCamera(camera);
 *   engine.step(8); engine.present();     // repetir hasta la calidad deseada
 */

function halton(index, base) {
  let f = 1;
  let r = 0;
  let i = index;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}

/** Cede el hilo sin depender de temporizadores (que se ralentizan en pestañas en segundo plano). */
export const tick = () =>
  new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => resolve();
    ch.port2.postMessage(0);
  });

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const ADD_FRAG = /* glsl */ `
  uniform sampler2D tPrev;
  uniform sampler2D tSample;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(tPrev, vUv) + texture2D(tSample, vUv);
  }
`;

const BLUR_FRAG = /* glsl */ `
  uniform sampler2D tInput;
  uniform vec2 direction;
  uniform float threshold;
  uniform float scale;
  varying vec2 vUv;
  vec3 pick(vec2 uv) {
    vec3 c = texture2D(tInput, uv).rgb * scale;
    if (threshold <= 0.0) return c;
    float l = max(c.r, max(c.g, c.b));
    return c * smoothstep(threshold, threshold * 2.0, l);
  }
  void main() {
    vec3 sum = pick(vUv) * 0.227027;
    sum += (pick(vUv + direction * 1.3846) + pick(vUv - direction * 1.3846)) * 0.316216;
    sum += (pick(vUv + direction * 3.2308) + pick(vUv - direction * 3.2308)) * 0.070270;
    gl_FragColor = vec4(sum, 1.0);
  }
`;

const RESOLVE_FRAG = /* glsl */ `
  uniform sampler2D tAccum;
  uniform sampler2D tBloom;
  uniform sampler2D tBackdrop;
  uniform float invSamples;
  uniform float exposure;
  uniform float bloom;
  uniform float saturation;
  uniform vec3 matte;
  uniform float matteMix;
  uniform float backdropMix;
  varying vec2 vUv;

  // Khronos PBR Neutral: comprime las altas luces sin torcer los colores base
  vec3 neutralToneMap(vec3 color) {
    const float startCompression = 0.8 - 0.04;
    const float desaturation = 0.15;
    float x = min(color.r, min(color.g, color.b));
    float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
    color -= offset;
    float peak = max(color.r, max(color.g, color.b));
    if (peak < startCompression) return color;
    float d = 1.0 - startCompression;
    float newPeak = 1.0 - d * d / (peak + d - startCompression);
    color *= newPeak / peak;
    float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
    return mix(color, vec3(newPeak), g);
  }
  vec3 toSRGB(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  }
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  void main() {
    vec4 acc = texture2D(tAccum, vUv) * invSamples;
    float a = clamp(acc.a, 0.0, 1.0);
    vec3 c = a > 0.0001 ? acc.rgb / a : vec3(0.0);
    c = c * exposure + texture2D(tBloom, vUv).rgb * bloom;
    float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(luma), c, saturation);
    c = toSRGB(neutralToneMap(max(c, 0.0)));
    c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    vec3 bg = backdropMix > 0.5 ? texture2D(tBackdrop, vUv).rgb : matte;
    float useBg = max(matteMix, backdropMix);
    vec3 flattened = mix(bg, c, a);
    gl_FragColor = mix(vec4(c * a, a), vec4(flattened, 1.0), useBg);
  }
`;

const SCENIC_BACKDROPS = new Set(['landscape', 'city', 'sunset', 'studio']);

export class RenderEngine {
  constructor(canvas) {
    this.canvas = canvas;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;

    const pmrem = new THREE.PMREMGenerator(renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);

    const pass = (fragmentShader, uniforms) =>
      new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader, depthTest: false, depthWrite: false, blending: THREE.NoBlending });
    this.addMaterial = pass(ADD_FRAG, { tPrev: { value: null }, tSample: { value: null } });
    this.blurMaterial = pass(BLUR_FRAG, { tInput: { value: null }, direction: { value: new THREE.Vector2() }, threshold: { value: 0 }, scale: { value: 1 } });
    this.resolveMaterial = pass(RESOLVE_FRAG, {
      tAccum: { value: null },
      tBloom: { value: null },
      tBackdrop: { value: null },
      invSamples: { value: 1 },
      exposure: { value: 1 },
      bloom: { value: 0 },
      saturation: { value: 1 },
      matte: { value: new THREE.Color(1, 1, 1) },
      matteMix: { value: 0 },
      backdropMix: { value: 0 },
    });

    this.width = 0;
    this.height = 0;
    this.shadowSize = 1024;
    this.samples = 0;
    this.scene = null;
    this.camera = null;
    this.lighting = {};
    this.targets = null;
    this.practicals = [];
    this.scratch = { dir: new THREE.Vector3(), tangent: new THREE.Vector3(), bitangent: new THREE.Vector3(), keyDir: new THREE.Vector3() };
  }

  runPass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  /** Tamaño de salida en píxeles y resolución de los mapas de sombra. Reinicia la acumulación. */
  setSize(width, height, shadowSize = this.shadowSize) {
    const w = Math.max(2, Math.round(width));
    const h = Math.max(2, Math.round(height));
    if (shadowSize !== this.shadowSize) {
      this.shadowSize = shadowSize;
      this.applyShadowSize();
    }
    if (w === this.width && h === this.height && this.targets) {
      this.reset();
      return;
    }
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.disposeTargets();
    const accum = { type: THREE.FloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
    const half = { type: THREE.HalfFloatType, depthBuffer: false };
    const bw = Math.max(2, Math.round(w / 4));
    const bh = Math.max(2, Math.round(h / 4));
    this.targets = {
      sample: new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: true }),
      accumA: new THREE.WebGLRenderTarget(w, h, accum),
      accumB: new THREE.WebGLRenderTarget(w, h, accum),
      bloomA: new THREE.WebGLRenderTarget(bw, bh, half),
      bloomB: new THREE.WebGLRenderTarget(bw, bh, half),
    };
    this.reset();
  }

  applyShadowSize() {
    const apply = (light) => {
      if (!light?.shadow) return;
      light.shadow.mapSize.set(this.shadowSize, this.shadowSize);
      if (light.shadow.map) {
        light.shadow.map.dispose();
        light.shadow.map = null;
      }
    };
    apply(this.sky);
    apply(this.key);
  }

  /** Carga una escena: { scene, lighting }. Libera la anterior. */
  load({ scene, lighting }) {
    this.unload();
    this.scene = scene;
    this.lighting = lighting;
    scene.environment = this.envTexture;
    scene.environmentIntensity = lighting.env ?? 0.25;

    // Esfera envolvente de lo que proyecta sombra → encuadre de los mapas de sombra
    const bounds = new THREE.Box3();
    scene.traverse((o) => {
      if (o.isMesh && o.castShadow) bounds.expandByObject(o);
    });
    this.sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const R = this.sphere.radius * 1.02;
    this.shadowRadius = R;

    const makeDirectional = () => {
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.castShadow = true;
      light.shadow.mapSize.set(this.shadowSize, this.shadowSize);
      const cam = light.shadow.camera;
      cam.left = -R;
      cam.right = R;
      cam.top = R;
      cam.bottom = -R;
      cam.near = 0.05;
      cam.far = R * 4;
      cam.updateProjectionMatrix();
      light.shadow.bias = -0.00028;
      light.shadow.normalBias = lighting.normalBias ?? 0.016;
      light.shadow.radius = 2.2;
      light.target.position.copy(this.sphere.center);
      scene.add(light, light.target);
      return light;
    };
    this.sky = lighting.sky ? makeDirectional() : null;
    this.key = lighting.key ? makeDirectional() : null;
    this.zenith = new THREE.Color(lighting.sky?.zenith ?? 0xffffff);
    this.horizon = new THREE.Color(lighting.sky?.horizon ?? 0xffffff);

    // Luz hemisférica continua para evitar sombras dobles o bruscas al mover la cámara
    if (lighting.sky) {
      this.hemi = new THREE.HemisphereLight(
        lighting.sky.zenith ?? 0xdde8ff,
        lighting.sky.horizon ?? 0xfff2e0,
        (lighting.sky.intensity ?? 2.0) * 0.52
      );
      scene.add(this.hemi);
    } else {
      this.hemi = null;
    }

    const { keyDir, tangent, bitangent } = this.scratch;
    if (this.key) {
      const az = THREE.MathUtils.degToRad(lighting.key.azimuth);
      const el = THREE.MathUtils.degToRad(lighting.key.elevation);
      keyDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
      this.key.color.set(lighting.key.color ?? 0xffffff);
      this.key.intensity = lighting.key.intensity;
      const up = Math.abs(keyDir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      tangent.crossVectors(up, keyDir).normalize();
      bitangent.crossVectors(keyDir, tangent);
    }
    this.practicals = (lighting.practicals ?? []).map((p) => ({ ...p, base: p.light.position.clone() }));
    this.reset();
  }

  setCamera(camera) {
    this.camera = camera;
    this.reset();
  }

  /** Empieza la acumulación de cero (tras cambiar cámara, tamaño o escena). */
  reset() {
    this.samples = 0;
    if (!this.targets) return;
    this.renderer.setRenderTarget(this.targets.accumA);
    this.renderer.clear();
  }

  aim(light, dir) {
    light.position.copy(this.sphere.center).addScaledVector(dir, this.shadowRadius * 2);
    light.target.updateMatrixWorld();
  }

  /** Añade `count` pasadas a la imagen acumulada. */
  step(count = 1) {
    const { scene, camera, lighting, targets, renderer, width, height } = this;
    if (!scene || !camera || !targets) return;
    const { dir, tangent, bitangent, keyDir } = this.scratch;
    const minElevation = lighting.sky?.minElevation ?? 0.18;

    for (let i = 0; i < count; i++) {
      const n = this.samples + 1;
      // 1. antialiasing: primera pasada centrada para máxima nitidez al orbitar/arrastrar
      if (n === 1) {
        camera.clearViewOffset();
      } else {
        camera.setViewOffset(width, height, halton(n, 2) - 0.5, halton(n, 3) - 0.5, width, height);
      }

      // 2. bóveda celeste: durante el movimiento rápido (n <= 3) no proyecta sombra dura lateral
      if (this.sky) {
        if (n <= 3) {
          this.sky.castShadow = false;
          dir.set(0.12, 0.98, 0.12).normalize();
          this.aim(this.sky, dir);
          this.sky.color.lerpColors(this.horizon, this.zenith, 0.75);
          this.sky.intensity = lighting.sky.intensity * 0.48;
        } else {
          this.sky.castShadow = true;
          const u1 = halton(n, 5);
          const phi = 2 * Math.PI * halton(n, 7);
          const y = Math.max(minElevation, Math.sqrt(1 - u1));
          const r = Math.sqrt(1 - y * y);
          dir.set(r * Math.cos(phi), y, r * Math.sin(phi));
          this.aim(this.sky, dir);
          this.sky.color.lerpColors(this.horizon, this.zenith, y);
          this.sky.intensity = lighting.sky.intensity * 0.48;
        }
      }

      // 3. luz principal con penumbra: primera pasada centrada, pasadas siguientes suavizan el borde
      if (this.key) {
        if (n === 1) {
          this.aim(this.key, keyDir);
        } else {
          const soft = THREE.MathUtils.degToRad(lighting.key.soft ?? 3);
          const rr = Math.sqrt(halton(n, 11)) * Math.tan(soft);
          const th = 2 * Math.PI * halton(n, 13);
          dir.copy(keyDir).addScaledVector(tangent, rr * Math.cos(th)).addScaledVector(bitangent, rr * Math.sin(th)).normalize();
          this.aim(this.key, dir);
        }
      }

      // 4. luces interiores con un poco de área
      this.practicals.forEach((p, k) => {
        const radius = p.radius ?? 0;
        if (!radius || n === 1) {
          p.light.position.copy(p.base);
          return;
        }
        const a = 2 * Math.PI * halton(n, 17 + 2 * k);
        const rr2 = Math.sqrt(halton(n, 19 + 2 * k)) * radius;
        p.light.position.set(p.base.x + rr2 * Math.cos(a), p.base.y, p.base.z + rr2 * Math.sin(a));
      });

      renderer.setRenderTarget(targets.sample);
      renderer.clear();
      renderer.render(scene, camera);

      this.addMaterial.uniforms.tPrev.value = targets.accumA.texture;
      this.addMaterial.uniforms.tSample.value = targets.sample.texture;
      this.runPass(this.addMaterial, targets.accumB);
      [targets.accumA, targets.accumB] = [targets.accumB, targets.accumA];
      this.samples = n;
    }
    camera.clearViewOffset();
  }

  /** Muestra en el lienzo el promedio acumulado. `matte` puede ser un color CSS o un fondo escénico ('landscape', 'city', 'sunset', 'studio'). */
  present(matte = null, { skipBloom = false } = {}) {
    const { targets, lighting, renderer } = this;
    if (!targets || this.samples === 0) return;
    const bloom = skipBloom ? 0 : (lighting.bloom ?? 0);
    if (bloom > 0) {
      const u = this.blurMaterial.uniforms;
      const { bloomA, bloomB } = targets;
      u.tInput.value = targets.accumA.texture;
      u.scale.value = (lighting.exposure ?? 1) / this.samples;
      u.threshold.value = lighting.bloomThreshold ?? 1.0;
      u.direction.value.set(1 / bloomA.width, 0);
      this.runPass(this.blurMaterial, bloomA);
      u.threshold.value = 0;
      u.scale.value = 1;
      for (let k = 0; k < 5; k++) {
        const spread = 1 + k * 1.5;
        u.tInput.value = bloomA.texture;
        u.direction.value.set(0, spread / bloomA.height);
        this.runPass(this.blurMaterial, bloomB);
        u.tInput.value = bloomB.texture;
        u.direction.value.set(spread / bloomA.width, 0);
        this.runPass(this.blurMaterial, bloomA);
      }
    }
    const u = this.resolveMaterial.uniforms;
    u.tAccum.value = targets.accumA.texture;
    u.tBloom.value = bloom > 0 ? targets.bloomA.texture : null;
    u.bloom.value = bloom;
    u.invSamples.value = 1 / this.samples;
    u.exposure.value = lighting.exposure ?? 1;
    u.saturation.value = lighting.saturation ?? 1;

    if (matte && SCENIC_BACKDROPS.has(matte)) {
      u.tBackdrop.value = getBackdropTexture(matte);
      u.backdropMix.value = 1;
      u.matteMix.value = 0;
    } else if (matte) {
      u.backdropMix.value = 0;
      u.matteMix.value = 1;
      u.matte.value.set(matte);
    } else {
      u.backdropMix.value = 0;
      u.matteMix.value = 0;
    }

    renderer.setRenderTarget(null);
    renderer.clear();
    this.runPass(this.resolveMaterial, null);
  }

  toBlob(type = 'image/png', quality = 0.92) {
    return new Promise((done) => this.canvas.toBlob(done, type, quality));
  }

  unload() {
    if (!this.scene) return;
    this.scene.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
      if (o.isLight && o.shadow?.map) o.shadow.map.dispose();
    });
    this.scene = null;
    this.sky = null;
    this.key = null;
    this.hemi = null;
    this.practicals = [];
  }

  disposeTargets() {
    if (!this.targets) return;
    Object.values(this.targets).forEach((t) => t.dispose());
    this.targets = null;
  }

  dispose() {
    this.unload();
    this.disposeTargets();
    this.envTexture.dispose();
    this.renderer.dispose();
  }
}
