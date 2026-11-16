import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { getBackdropTexture } from './materials.js';

/**
 * Motor de render de POZOLE (rasterización distribuida con vista interactiva).
 *
 * Trabaja en dos velocidades sobre la misma escena:
 *
 *   · Vista interactiva (`renderInteractive`): un solo cuadro con antialiasing por hardware y
 *     los mapas de sombra ya calculados. Mientras solo se mueve la cámara no se recalcula
 *     ninguna sombra, así que orbitar o caminar cuesta un único dibujo de la escena.
 *
 *   · Acumulación (`step` + `present`): muchas pasadas que se promedian en un buffer de 32 bits.
 *     En cada pasada la cámara se desplaza una fracción de píxel (antialiasing), el sol se
 *     mueve dentro de un cono (penumbra) y la luz del cielo se muestrea desde varias direcciones
 *     a la vez (oclusión ambiental). La primera pasada coincide con el cuadro interactivo, así
 *     que al soltar el ratón la imagen se afina sin saltos.
 *
 * Luces que maneja el motor (viven en él y se prestan a cada escena):
 *   key          sol: una direccional con sombra
 *   skyLights[]  bóveda celeste: SKY_LIGHTS direccionales con sombra, repartidas por estratos
 *   bounce       rebote del piso hacia techos y partes bajas (hemisférica sin sombra)
 *
 * Capas: los objetos solo en la capa 1 (el techo de la sala) dan sombra al sol pero no a la luz
 * del cielo; así un recinto cerrado se ve iluminado de forma pareja sin perder el techo.
 *
 * Uso mínimo:
 *   const engine = new RenderEngine(canvas);
 *   engine.setSize(1200, 900);
 *   engine.load({ scene, lighting });
 *   engine.setCamera(camera);
 *   engine.step(8); engine.present();     // repetir hasta la calidad deseada
 */

export const SKY_LIGHTS = 4;
/** Capa de los objetos que tapan el sol pero dejan pasar la luz del cielo (techo). */
export const SUN_ONLY_LAYER = 1;
const SKY_SHADOW_LAYER = 2;

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
  uniform vec2 uvScale;
  uniform vec2 uvMax;
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
    vec4 acc = texture2D(tAccum, min(vUv * uvScale, uvMax)) * invSamples;
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
  constructor(canvas, { msaa = 4 } = {}) {
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
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;
    this.msaa = Math.min(msaa, renderer.capabilities.maxSamples || 0);

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
      uvScale: { value: new THREE.Vector2(1, 1) },
      uvMax: { value: new THREE.Vector2(1, 1) },
    });

    this.width = 0;
    this.height = 0;
    this.shadowSize = 1024;
    this.samples = 0;
    this.needsClear = true;
    this.scene = null;
    this.camera = null;
    this.lighting = {};
    this.targets = null;
    this.fast = null;
    this.practicals = [];
    this.sphere = new THREE.Sphere(new THREE.Vector3(), 1);
    this.shadowRadius = 1;
    this.shadowsDirty = true;
    this.shadowState = 'none';
    this.zenith = new THREE.Color(0xffffff);
    this.horizon = new THREE.Color(0xffffff);
    this.scratch = { dir: new THREE.Vector3(), tangent: new THREE.Vector3(), bitangent: new THREE.Vector3(), keyDir: new THREE.Vector3(0.5, 0.7, 0.5).normalize() };

    // Luces propias del motor: se crean una vez para no reservar mapas de sombra en cada escena
    const directional = (extraLayer) => {
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.castShadow = true;
      light.shadow.autoUpdate = false;
      light.shadow.mapSize.set(this.shadowSize, this.shadowSize);
      light.shadow.camera.layers.enable(extraLayer);
      return light;
    };
    this.key = directional(SUN_ONLY_LAYER);
    this.skyLights = Array.from({ length: SKY_LIGHTS }, () => directional(SKY_SHADOW_LAYER));
    this.bounce = new THREE.HemisphereLight(0x000000, 0xffffff, 0);
    this.sky = this.skyLights[0];
  }

  get ownLights() {
    return [this.key, ...this.skyLights];
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
    this.ownLights.forEach((light) => {
      light.shadow.mapSize.set(this.shadowSize, this.shadowSize);
      if (light.shadow.map) {
        light.shadow.map.dispose();
        light.shadow.map = null;
      }
    });
    this.fitShadows();
    this.shadowsDirty = true;
  }

  /** Encuadra los mapas de sombra en la esfera de lo que proyecta sombra. */
  fitShadows() {
    const R = this.shadowRadius;
    const texel = (2 * R) / this.shadowSize;
    const fit = (light, radius, softness) => {
      const cam = light.shadow.camera;
      cam.left = -radius;
      cam.right = radius;
      cam.top = radius;
      cam.bottom = -radius;
      cam.near = 0.05;
      cam.far = this.shadowRadius * 4.4;
      cam.updateProjectionMatrix();
      light.shadow.bias = -0.00025;
      light.shadow.normalBias = this.lighting.normalBias ?? Math.max(0.006, texel * 1.35 * (radius / R));
      light.shadow.radius = softness;
    };
    fit(this.key, R * 1.12, this.lighting.key?.radius ?? 1.6);
    this.skyLights.forEach((light) => fit(light, R, this.lighting.sky?.radius ?? 3.2));
  }

  /** Carga una escena: { scene, lighting }. Libera la anterior. */
  load({ scene, lighting }) {
    this.unload();
    this.scene = scene;
    this.lighting = lighting;
    scene.environment = this.envTexture;
    scene.environmentIntensity = lighting.env ?? 0.25;

    // Esfera envolvente de lo que proyecta sombra → encuadre de los mapas de sombra
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    scene.traverse((o) => {
      if (o.isMesh && o.castShadow) bounds.expandByObject(o);
    });
    if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1, 1));
    bounds.getBoundingSphere(this.sphere);
    this.shadowRadius = this.sphere.radius * 1.02;
    this.fitShadows();

    const sky = lighting.sky;
    this.zenith.set(sky?.zenith ?? 0xffffff);
    this.horizon.set(sky?.horizon ?? 0xffffff);
    this.skyLights.forEach((light) => {
      light.visible = Boolean(sky);
      light.intensity = sky ? sky.intensity / SKY_LIGHTS : 0;
      // Una parte de la luz del cielo atraviesa los obstáculos: equivale al relleno por rebotes
      light.shadow.intensity = sky?.occlusion ?? 0.9;
      light.target.position.copy(this.sphere.center);
      scene.add(light, light.target);
    });

    const { keyDir, tangent, bitangent } = this.scratch;
    this.key.visible = Boolean(lighting.key);
    if (lighting.key) {
      const az = THREE.MathUtils.degToRad(lighting.key.azimuth);
      const el = THREE.MathUtils.degToRad(lighting.key.elevation);
      keyDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
      this.key.color.set(lighting.key.color ?? 0xffffff);
      this.key.intensity = lighting.key.intensity;
      const up = Math.abs(keyDir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      tangent.crossVectors(up, keyDir).normalize();
      bitangent.crossVectors(keyDir, tangent);
    }
    this.key.target.position.copy(this.sphere.center);
    scene.add(this.key, this.key.target);

    const bounce = lighting.bounce;
    this.bounce.visible = Boolean(bounce && bounce.intensity > 0);
    if (this.bounce.visible) {
      this.bounce.groundColor.set(bounce.color ?? 0xffffff);
      this.bounce.intensity = bounce.intensity;
    }
    scene.add(this.bounce);

    this.practicals = (lighting.practicals ?? []).map((p) => {
      if (p.light.shadow) p.light.shadow.autoUpdate = false;
      return { ...p, base: p.light.position.clone() };
    });
    this.shadowsDirty = true;
    this.shadowState = 'none';
    this.reset();
  }

  setCamera(camera) {
    this.camera = camera;
    // La cámara también ve los objetos de la capa «solo sol» (el techo)
    camera.layers.enable(SUN_ONLY_LAYER);
    this.reset();
  }

  /** Empieza la acumulación de cero (tras cambiar cámara, tamaño o escena). */
  reset() {
    this.samples = 0;
    this.needsClear = true;
  }

  /** Avisa de que cambió algo que proyecta sombra (se movió u ocultó un objeto). */
  invalidateShadows() {
    this.shadowsDirty = true;
    this.reset();
  }

  aim(light, dir) {
    light.position.copy(this.sphere.center).addScaledVector(dir, this.shadowRadius * 2.1);
    light.target.updateMatrixWorld();
    light.shadow.needsUpdate = true;
  }

  /** Coloca las luces para la pasada `n`. La pasada 1 es la posición canónica (sin desplazar). */
  placeLights(n) {
    const { lighting } = this;
    const { dir, tangent, bitangent, keyDir } = this.scratch;

    // Bóveda celeste: un estrato de elevación por luz, ponderado por coseno
    if (lighting.sky) {
      const minElevation = lighting.sky.minElevation ?? 0.16;
      this.skyLights.forEach((light, j) => {
        const u1 = (j + halton(n, 5)) / SKY_LIGHTS;
        const phi = 2 * Math.PI * (halton(n, 7) + j * 0.61803398875);
        const y = Math.max(minElevation, Math.sqrt(1 - u1));
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        dir.set(r * Math.cos(phi), y, r * Math.sin(phi));
        this.aim(light, dir);
        light.color.lerpColors(this.horizon, this.zenith, y);
      });
    }

    // Sol con penumbra: la primera pasada va centrada
    if (lighting.key) {
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

    // Luces interiores con un poco de área
    this.practicals.forEach((p, k) => {
      const radius = p.radius ?? 0;
      if (!radius || n === 1) {
        p.light.position.copy(p.base);
      } else {
        const a = 2 * Math.PI * halton(n, 17 + 2 * k);
        const rr2 = Math.sqrt(halton(n, 19 + 2 * k)) * radius;
        p.light.position.set(p.base.x + rr2 * Math.cos(a), p.base.y, p.base.z + rr2 * Math.sin(a));
      }
      if (p.light.shadow) p.light.shadow.needsUpdate = true;
    });
  }

  /** Deja las sombras en su posición canónica; solo recalcula si algo cambió. */
  ensureCanonicalShadows() {
    if (this.shadowState === 'canonical' && !this.shadowsDirty) return;
    this.placeLights(1);
    this.shadowState = 'canonical';
    this.shadowsDirty = false;
  }

  /**
   * Cuadro rápido para cuando la cámara se mueve: una sola pasada con las sombras ya calculadas.
   * `scale` (0.4–1) baja la resolución interna para mantener la fluidez en equipos modestos.
   */
  renderInteractive(matte = null, { scale = 1 } = {}) {
    const { scene, camera, renderer } = this;
    if (!scene || !camera || !this.targets) return;
    this.ensureCanonicalShadows();
    camera.clearViewOffset();
    if (!this.fast) {
      this.fast = new THREE.WebGLRenderTarget(this.width, this.height, { type: THREE.HalfFloatType, depthBuffer: true, samples: this.msaa });
    }
    const sw = Math.max(2, Math.round(this.width * scale));
    const sh = Math.max(2, Math.round(this.height * scale));
    this.fast.viewport.set(0, 0, sw, sh);
    this.fast.scissor.set(0, 0, sw, sh);
    this.fast.scissorTest = true;
    renderer.setRenderTarget(this.fast);
    renderer.clear();
    renderer.render(scene, camera);
    this.resolve(this.fast.texture, 1, matte, { bloom: 0, sw, sh });
    this.reset();
  }

  /** Añade `count` pasadas a la imagen acumulada. */
  step(count = 1) {
    const { scene, camera, targets, renderer, width, height } = this;
    if (!scene || !camera || !targets) return;
    if (this.needsClear) {
      renderer.setRenderTarget(targets.accumA);
      renderer.clear();
      this.needsClear = false;
    }

    for (let i = 0; i < count; i++) {
      const n = this.samples + 1;
      if (n === 1) {
        // Primera pasada centrada y con las sombras canónicas: idéntica al cuadro interactivo
        camera.clearViewOffset();
        this.ensureCanonicalShadows();
      } else {
        camera.setViewOffset(width, height, halton(n, 2) - 0.5, halton(n, 3) - 0.5, width, height);
        this.placeLights(n);
        this.shadowState = 'jittered';
      }

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
    const { targets, lighting } = this;
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
    this.resolve(targets.accumA.texture, 1 / this.samples, matte, { bloom });
  }

  /** Paso final común: exposición, mapa de tonos, fondo y salida al lienzo. */
  resolve(texture, invSamples, matte, { bloom = 0, sw = this.width, sh = this.height } = {}) {
    const { targets, lighting, renderer } = this;
    const u = this.resolveMaterial.uniforms;
    u.tAccum.value = texture;
    u.tBloom.value = bloom > 0 ? targets.bloomA.texture : null;
    u.bloom.value = bloom;
    u.invSamples.value = invSamples;
    u.exposure.value = lighting.exposure ?? 1;
    u.saturation.value = lighting.saturation ?? 1;
    u.uvScale.value.set(sw / this.width, sh / this.height);
    u.uvMax.value.set((sw - 0.5) / this.width, (sh - 0.5) / this.height);

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
    const own = new Set(this.ownLights);
    this.ownLights.forEach((light) => this.scene.remove(light, light.target));
    this.scene.remove(this.bounce);
    this.scene.traverse((o) => {
      // Las geometrías marcadas como compartidas pertenecen a una caché y se reutilizan
      if (o.isMesh && !o.geometry.userData.shared) o.geometry.dispose();
      if (o.isLight && !own.has(o) && !o.userData.shared && o.shadow?.map) o.shadow.map.dispose();
    });
    this.scene = null;
    this.practicals = [];
  }

  disposeTargets() {
    if (this.fast) {
      this.fast.dispose();
      this.fast = null;
    }
    if (!this.targets) return;
    Object.values(this.targets).forEach((t) => t.dispose());
    this.targets = null;
  }

  dispose() {
    this.unload();
    this.disposeTargets();
    this.ownLights.forEach((light) => light.shadow.map?.dispose());
    this.envTexture.dispose();
    this.renderer.dispose();
  }
}
