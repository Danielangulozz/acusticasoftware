/**
 * Cámara del Estudio de renders: una sola «postura» ({ pos, target, fov }) y cuatro formas de
 * moverla. Cambiar de modo nunca salta: la cámara viaja de la postura actual a la nueva.
 *
 *   orbit     maqueta: gira alrededor de la sala (los muros que estorban se ocultan solos)
 *   walk      recorrer: a la altura de los ojos, dentro de la sala, sin atravesar muros
 *   exterior  la sala cerrada, vista desde afuera a ras de suelo
 *   plan      planta: desde arriba, para acomodar los objetos
 *
 * Además reproduce recorridos (`play`) definidos por tomas clave, que son los mismos que luego
 * se exportan a video. No depende de React ni del DOM: se puede probar con vitest.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rad = (deg) => (deg * Math.PI) / 180;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const VIEW_MODES = {
  orbit: { label: 'Maqueta', fov: 30, elevation: [4, 86], zoom: [0.45, 3.2] },
  walk: { label: 'Recorrer', fov: 62 },
  exterior: { label: 'Exterior', fov: 40, elevation: [1.5, 60], zoom: [0.35, 2.4] },
  plan: { label: 'Planta', fov: 18, elevation: [89.4, 89.4], zoom: [0.7, 4] },
};

/** ¿El punto (x, z) cae dentro del contorno de la sala? */
export function pointInOutline(x, z, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

/** Aleja un punto de los muros hasta dejarlo a `margin` metros (para no atravesarlos al caminar). */
export function constrainToRoom(x, z, layout, margin = 0.3) {
  let px = x;
  let pz = z;
  for (let iter = 0; iter < 3; iter++) {
    for (const wall of layout.walls) {
      for (const s of wall.segments) {
        const dx = px - s.p0.x;
        const dz = pz - s.p0.z;
        const along = dx * s.tx + dz * s.tz;
        if (along < -margin || along > s.segLen + margin) continue;
        const dist = dx * s.inX + dz * s.inZ;
        if (dist < margin && dist > -1.2) {
          px += s.inX * (margin - dist);
          pz += s.inZ * (margin - dist);
        }
      }
    }
  }
  return { x: px, z: pz };
}

/** Distancia a la que una esfera de radio `radius` cabe en el encuadre. */
export function fitDistance(radius, fov, aspect, margin = 1) {
  const half = rad(fov / 2);
  const fit = Math.min(half, Math.atan(Math.tan(half) * aspect));
  return (radius / Math.sin(fit)) * margin;
}

const orbitPos = (target, azimuth, elevation, distance) => {
  const az = rad(azimuth);
  const el = rad(elevation);
  return [
    target[0] + distance * Math.cos(el) * Math.sin(az),
    target[1] + distance * Math.sin(el),
    target[2] + distance * Math.cos(el) * Math.cos(az),
  ];
};

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Postura de un recorrido en el instante u ∈ [0, 1]. Las tomas se unen con una curva suave y se
 * recorren a velocidad constante, con arranque y frenado suaves si el recorrido no es un bucle.
 */
export function samplePath(path, u) {
  const keys = path?.keys ?? [];
  if (keys.length === 0) return null;
  if (keys.length === 1) return { pos: [...keys[0].pos], target: [...keys[0].target], fov: keys[0].fov ?? 50 };
  const n = keys.length;
  const loop = Boolean(path.loop);
  const segments = loop ? n : n - 1;
  const at = (i) => (loop ? keys[((i % n) + n) % n] : keys[clamp(i, 0, n - 1)]);

  // Longitud de cada tramo: lo que avanza la cámara o, si solo gira, lo que barre la mirada
  const lengths = [];
  let total = 0;
  for (let i = 0; i < segments; i++) {
    const a = at(i);
    const b = at(i + 1);
    const len = Math.max(dist3(a.pos, b.pos), dist3(a.target, b.target) * 0.6, 0.6);
    lengths.push(len);
    total += len;
  }
  const s = (loop ? ((u % 1) + 1) % 1 : easeInOut(clamp(u, 0, 1))) * total;
  let i = 0;
  let acc = 0;
  while (i < segments - 1 && acc + lengths[i] < s) {
    acc += lengths[i];
    i++;
  }
  const t = clamp((s - acc) / lengths[i], 0, 1);
  const [k0, k1, k2, k3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
  const mix = (field) => [0, 1, 2].map((c) => catmull(k0[field][c], k1[field][c], k2[field][c], k3[field][c], t));
  return { pos: mix('pos'), target: mix('target'), fov: lerp(k1.fov ?? 50, k2.fov ?? 50, t) };
}

/** Recorridos ya armados para una sala: se pueden usar tal cual o como punto de partida. */
export function pathPresets({ layout, focus, aspect = 16 / 9 }) {
  const { W, D, H } = layout;
  const center = [focus.center.x, focus.center.y, focus.center.z];
  const dist = fitDistance(focus.radius, 30, aspect, 0.92);
  const eye = clamp(H * 0.58, 1.45, 1.7);
  const inset = (fx, fz) => {
    const p = constrainToRoom(fx * W * 0.5, fz * D * 0.5, layout, 0.6);
    return [p.x, eye, p.z];
  };
  const look = (from, tx, tz, ty = eye - 0.25) => ({ pos: from, target: [tx, ty, tz], fov: 62 });

  const orbit = Array.from({ length: 8 }, (_, k) => ({ pos: orbitPos(center, 40 + k * 45, 24 + (k % 2) * 5, dist), target: center, fov: 30 }));

  const walk = [
    look(inset(-0.58, 0.6), W * 0.12, -D * 0.2),
    look(inset(-0.55, -0.45), W * 0.3, -D * 0.05),
    look(inset(0.5, -0.5), -W * 0.05, D * 0.25),
    look(inset(0.55, 0.55), -W * 0.3, -D * 0.1),
  ];

  const reveal = [
    { pos: orbitPos(center, 52, 34, dist * 1.45), target: center, fov: 30 },
    { pos: orbitPos(center, 30, 20, dist * 0.95), target: center, fov: 34 },
    { pos: orbitPos([0, eye - 0.2, 0], 12, 6, Math.max(W, D) * 0.75), target: [0, eye - 0.3, -D * 0.1], fov: 50 },
    look(inset(0.05, 0.35), 0, -D * 0.45, eye - 0.3),
  ];

  const drone = [
    { pos: orbitPos(center, -40, 58, dist * 1.3), target: center, fov: 30 },
    { pos: orbitPos(center, 20, 46, dist * 1.15), target: center, fov: 30 },
    { pos: orbitPos(center, 85, 36, dist * 1.05), target: center, fov: 30 },
    { pos: orbitPos(center, 140, 28, dist * 1.0), target: center, fov: 30 },
  ];

  return {
    orbit: { id: 'orbit', label: 'Giro completo', hint: 'La maqueta gira 360°', loop: true, duration: 16, keys: orbit },
    walk: { id: 'walk', label: 'Paseo interior', hint: 'Camina por dentro de la sala', loop: true, duration: 18, keys: walk },
    reveal: { id: 'reveal', label: 'Entrada', hint: 'Llega desde afuera y entra', loop: false, duration: 12, keys: reveal },
    drone: { id: 'drone', label: 'Vuelo de dron', hint: 'Arco alto alrededor', loop: false, duration: 12, keys: drone },
  };
}

export class CameraRig {
  constructor() {
    this.mode = 'orbit';
    this.aspect = 4 / 3;
    this.layout = null;
    this.focus = { center: { x: 0, y: 0.9, z: 0 }, radius: 4 };
    this.margin = 0.86;
    this.orbits = {
      orbit: { azimuth: 40, elevation: 27, zoom: 1, pan: [0, 0, 0] },
      exterior: { azimuth: 32, elevation: 8, zoom: 0.78, pan: [0, 0, 0] },
      plan: { azimuth: 0, elevation: 89.4, zoom: 1.3, pan: [0, 0, 0] },
    };
    this.walk = null; // { x, z, eye, yaw, pitch }
    this.velocity = { f: 0, s: 0, t: 0 };
    this.pose = { pos: [6, 4, 6], target: [0, 1, 0], fov: 30 };
    this.tween = null;
    this.playback = null;
    this.dirty = true;
  }

  /** Datos de la escena construida: contorno, esfera de encuadre y proporción del lienzo. */
  setScene({ layout = null, focus, margin = 0.86 }, aspect = this.aspect) {
    const first = !this.layout && layout;
    this.layout = layout;
    this.focus = focus;
    this.margin = margin;
    if (Number.isFinite(aspect) && aspect > 0) this.aspect = aspect;
    if (layout && (!this.walk || first)) this.walk = this.defaultWalk();
    if (layout && this.walk) {
      const p = constrainToRoom(this.walk.x, this.walk.z, layout, 0.3);
      this.walk.x = p.x;
      this.walk.z = p.z;
      this.walk.eye = clamp(this.walk.eye, 0.6, layout.H - 0.2);
    }
    if (!this.tween && !this.playback) this.pose = this.poseFor(this.mode);
    this.dirty = true;
  }

  defaultWalk() {
    const { W, D, H } = this.layout;
    // Desde el frente de la sala, mirando hacia el fondo (donde suele estar lo importante)
    const p = constrainToRoom(W * 0.08, D * 0.36, this.layout, 0.6);
    return { x: p.x, z: p.z, eye: clamp(H * 0.58, 1.45, 1.7), yaw: Math.atan2(-W * 0.05 - p.x, -D * 0.3 - p.z), pitch: -0.1 };
  }

  center() {
    const c = this.focus.center;
    return [c.x, c.y, c.z];
  }

  /** Postura que corresponde al estado guardado de un modo. */
  poseFor(mode) {
    if (mode === 'walk' && this.walk) {
      const { x, z, eye, yaw, pitch } = this.walk;
      const cp = Math.cos(pitch);
      return { pos: [x, eye, z], target: [x + Math.sin(yaw) * cp * 2, eye + Math.sin(pitch) * 2, z + Math.cos(yaw) * cp * 2], fov: VIEW_MODES.walk.fov };
    }
    const m = VIEW_MODES[mode] ?? VIEW_MODES.orbit;
    const o = this.orbits[mode] ?? this.orbits.orbit;
    const c = this.center();
    const target = mode === 'exterior' ? [c[0] + o.pan[0], (this.layout?.H ?? 2.7) * 0.5, c[2] + o.pan[2]] : [c[0] + o.pan[0], c[1] + o.pan[1], c[2] + o.pan[2]];
    const distance = fitDistance(this.focus.radius, m.fov, this.aspect, mode === 'orbit' ? this.margin : 1) / o.zoom;
    return { pos: orbitPos(target, o.azimuth, o.elevation, distance), target, fov: m.fov };
  }

  /** Cambia de modo viajando desde la postura actual. */
  setMode(mode, { animate = true, duration = 0.9 } = {}) {
    if (!VIEW_MODES[mode]) return;
    this.playback = null;
    this.mode = mode;
    this.flyTo(this.poseFor(mode), { animate, duration });
  }

  /** Lleva la cámara a una postura (con viaje suave o de golpe). */
  flyTo(pose, { animate = true, duration = 0.9, onDone = null } = {}) {
    if (!animate) {
      this.pose = { pos: [...pose.pos], target: [...pose.target], fov: pose.fov };
      this.tween = null;
      this.dirty = true;
      if (onDone) onDone();
      return;
    }
    this.tween = { from: this.getPose(), to: { pos: [...pose.pos], target: [...pose.target], fov: pose.fov }, t: 0, duration, onDone };
  }

  /** Adopta una postura cualquiera (una toma guardada): elige el modo según dónde quede la cámara. */
  adoptPose(pose, { animate = true } = {}) {
    this.playback = null;
    const inside = this.isInside(pose.pos);
    const dx = pose.target[0] - pose.pos[0];
    const dy = pose.target[1] - pose.pos[1];
    const dz = pose.target[2] - pose.pos[2];
    const len = Math.hypot(dx, dy, dz) || 1;
    if (inside && this.layout) {
      this.mode = 'walk';
      this.walk = { x: pose.pos[0], z: pose.pos[2], eye: pose.pos[1], yaw: Math.atan2(dx, dz), pitch: clamp(Math.asin(dy / len), -1.1, 1.1) };
      this.flyTo(this.poseFor('walk'), { animate });
    } else {
      const mode = this.mode === 'exterior' ? 'exterior' : 'orbit';
      this.mode = mode;
      const m = VIEW_MODES[mode];
      const c = this.center();
      const baseY = mode === 'exterior' ? (this.layout?.H ?? 2.7) * 0.5 : c[1];
      const o = this.orbits[mode];
      o.pan = [pose.target[0] - c[0], pose.target[1] - baseY, pose.target[2] - c[2]];
      o.azimuth = (Math.atan2(-dx, -dz) * 180) / Math.PI;
      o.elevation = clamp((Math.asin(clamp(-dy / len, -1, 1)) * 180) / Math.PI, m.elevation[0], m.elevation[1]);
      o.zoom = clamp(fitDistance(this.focus.radius, m.fov, this.aspect, mode === 'orbit' ? this.margin : 1) / len, m.zoom[0], m.zoom[1]);
      this.flyTo({ ...pose, fov: pose.fov ?? m.fov }, { animate });
    }
  }

  getPose() {
    return { pos: [...this.pose.pos], target: [...this.pose.target], fov: this.pose.fov };
  }

  /** Copia del estado de la cámara, para volver a él tras exportar una imagen o un video. */
  snapshot() {
    return JSON.parse(JSON.stringify({ mode: this.mode, orbits: this.orbits, walk: this.walk, pose: this.pose }));
  }

  restore(saved) {
    if (!saved) return;
    this.tween = null;
    this.playback = null;
    this.mode = saved.mode;
    this.orbits = saved.orbits;
    this.walk = saved.walk;
    this.pose = saved.pose;
    this.dirty = true;
  }

  isInside(pos = this.pose.pos) {
    if (!this.layout) return false;
    return pos[1] > -0.05 && pos[1] < this.layout.H && pointInOutline(pos[0], pos[2], this.layout.outlinePoints);
  }

  get busy() {
    return Boolean(this.tween || this.playback);
  }

  /* ----------------------------------------------------------- entrada del usuario */

  /** Arrastre: gira (órbita o mirada) o desplaza el punto de mira si `pan` es true. */
  drag(dx, dy, { pan = false } = {}) {
    if (this.tween) return;
    this.playback = null;
    if (this.mode === 'walk') {
      // Estilo «arrastrar la escena»: mover el ratón a la derecha lleva la escena a la derecha
      this.walk.yaw += dx * 0.0045;
      this.walk.pitch = clamp(this.walk.pitch + dy * 0.0036, -1.05, 1.05);
    } else {
      const m = VIEW_MODES[this.mode];
      const o = this.orbits[this.mode];
      if (pan || this.mode === 'plan') {
        // metros de escena por píxel de pantalla (lienzo de unos 600 px de alto)
        const scale = ((fitDistance(this.focus.radius, m.fov, this.aspect) / o.zoom) * 2 * Math.tan(rad(m.fov / 2))) / 600;
        const az = rad(o.azimuth);
        const limit = Math.max(this.layout?.W ?? 6, this.layout?.D ?? 6);
        o.pan[0] = clamp(o.pan[0] - (dx * Math.cos(az) + dy * Math.sin(az)) * scale, -limit, limit);
        o.pan[2] = clamp(o.pan[2] - (-dx * Math.sin(az) + dy * Math.cos(az)) * scale, -limit, limit);
      } else {
        o.azimuth -= dx * 0.35;
        o.elevation = clamp(o.elevation + dy * 0.25, m.elevation[0], m.elevation[1]);
      }
    }
    this.pose = this.poseFor(this.mode);
    this.dirty = true;
  }

  /** Rueda: acerca o aleja; caminando, avanza o retrocede. */
  wheel(deltaY) {
    if (this.tween) return;
    this.playback = null;
    if (this.mode === 'walk') {
      this.stepWalk(deltaY < 0 ? 0.45 : -0.45, 0);
    } else {
      const m = VIEW_MODES[this.mode];
      const o = this.orbits[this.mode];
      o.zoom = clamp(o.zoom * (deltaY < 0 ? 1.1 : 1 / 1.1), m.zoom[0], m.zoom[1]);
      this.pose = this.poseFor(this.mode);
    }
    this.dirty = true;
  }

  zoomBy(factor) {
    if (this.mode === 'walk') return;
    const m = VIEW_MODES[this.mode];
    const o = this.orbits[this.mode];
    o.zoom = clamp(o.zoom * factor, m.zoom[0], m.zoom[1]);
    this.flyTo(this.poseFor(this.mode), { duration: 0.35 });
  }

  /** Cámaras rápidas de la maqueta (esquina, frente, lado, desde arriba). */
  frame(azimuth, elevation) {
    const mode = this.mode === 'walk' || this.mode === 'plan' ? 'orbit' : this.mode;
    const o = this.orbits[mode];
    const m = VIEW_MODES[mode];
    // gira por el camino corto
    const current = o.azimuth;
    o.azimuth = current + ((((azimuth - current) % 360) + 540) % 360) - 180;
    o.elevation = clamp(elevation, m.elevation[0], m.elevation[1]);
    o.pan = [0, 0, 0];
    o.zoom = 1;
    this.setMode(mode, { duration: 0.7 });
  }

  resetView() {
    this.orbits.orbit = { azimuth: 40, elevation: 27, zoom: 1, pan: [0, 0, 0] };
    this.orbits.exterior = { azimuth: 32, elevation: 8, zoom: 0.78, pan: [0, 0, 0] };
    this.orbits.plan = { azimuth: 0, elevation: 89.4, zoom: 1.3, pan: [0, 0, 0] };
    if (this.layout) this.walk = this.defaultWalk();
    this.setMode(this.mode, { duration: 0.6 });
  }

  /** Centra la maqueta en un punto (por ejemplo el objeto seleccionado). */
  focusOn(point, zoom = 1.7) {
    const mode = this.mode === 'walk' ? 'orbit' : this.mode;
    const c = this.center();
    const o = this.orbits[mode];
    const m = VIEW_MODES[mode];
    o.pan = [point[0] - c[0], mode === 'orbit' ? point[1] - c[1] : 0, point[2] - c[2]];
    o.zoom = clamp(Math.max(o.zoom, zoom), m.zoom[0], m.zoom[1]);
    this.setMode(mode, { duration: 0.7 });
  }

  /** Desplaza al caminante `forward` metros al frente y `side` a la derecha, sin atravesar muros. */
  stepWalk(forward, side) {
    const w = this.walk;
    if (!w || !this.layout) return;
    const fx = Math.sin(w.yaw);
    const fz = Math.cos(w.yaw);
    const p = constrainToRoom(w.x + fx * forward - fz * side, w.z + fz * forward + fx * side, this.layout, 0.3);
    w.x = p.x;
    w.z = p.z;
    this.pose = this.poseFor('walk');
  }

  /** Camina hasta un punto del piso. */
  walkTo(x, z) {
    if (!this.walk || !this.layout) return;
    const p = constrainToRoom(x, z, this.layout, 0.35);
    const from = { ...this.walk };
    const distance = Math.hypot(p.x - from.x, p.z - from.z);
    if (distance < 0.05) return;
    this.walk = { ...from, x: p.x, z: p.z };
    const to = this.poseFor('walk');
    this.flyTo(to, { duration: clamp(distance * 0.38, 0.35, 1.6) });
  }

  /** Camina hasta quedar a `distance` metros de un punto y lo mira de frente. */
  walkToward(point, distance = 1.8) {
    if (!this.walk || !this.layout) return;
    const w = this.walk;
    let dx = point[0] - w.x;
    let dz = point[2] - w.z;
    let len = Math.hypot(dx, dz);
    if (len < 1e-3) {
      dx = Math.sin(w.yaw);
      dz = Math.cos(w.yaw);
      len = 1;
    }
    const stop = Math.min(len, distance);
    const p = constrainToRoom(point[0] - (dx / len) * stop, point[2] - (dz / len) * stop, this.layout, 0.35);
    const flat = Math.hypot(point[0] - p.x, point[2] - p.z) || 1;
    this.walk = { ...w, x: p.x, z: p.z, yaw: Math.atan2(point[0] - p.x, point[2] - p.z), pitch: clamp(Math.atan2(point[1] - w.eye, flat), -0.8, 0.5) };
    this.mode = 'walk';
    this.flyTo(this.poseFor('walk'), { duration: clamp(Math.hypot(p.x - w.x, p.z - w.z) * 0.38, 0.45, 1.6) });
  }

  setEye(height) {
    if (!this.walk || !this.layout) return;
    this.walk.eye = clamp(height, 0.6, this.layout.H - 0.2);
    if (this.mode === 'walk' && !this.tween) {
      this.pose = this.poseFor('walk');
      this.dirty = true;
    }
  }

  /* ------------------------------------------------------------------- recorridos */

  play(path, { onProgress = null, onEnd = null, from = 0 } = {}) {
    if (!path?.keys?.length) return;
    this.tween = null;
    this.playback = { path, u: from, onProgress, onEnd };
  }

  stop() {
    if (!this.playback) return;
    const { onEnd } = this.playback;
    this.playback = null;
    this.adoptPose(this.getPose(), { animate: false });
    if (onEnd) onEnd(false);
  }

  /** Coloca la cámara en el instante u de un recorrido (sin reproducirlo). */
  seek(path, u) {
    const pose = samplePath(path, u);
    if (!pose) return;
    this.tween = null;
    this.pose = pose;
    this.dirty = true;
  }

  /* --------------------------------------------------------------------- por cuadro */

  /**
   * Avanza `dt` segundos. `keys` es el conjunto de teclas pulsadas (códigos de KeyboardEvent).
   * Devuelve true si la postura cambió y hay que redibujar.
   */
  update(dt, keys = null) {
    let changed = this.dirty;
    this.dirty = false;

    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / tw.duration);
      const k = easeInOut(tw.t);
      this.pose = {
        pos: tw.from.pos.map((v, i) => lerp(v, tw.to.pos[i], k)),
        target: tw.from.target.map((v, i) => lerp(v, tw.to.target[i], k)),
        fov: lerp(tw.from.fov, tw.to.fov, k),
      };
      if (tw.t >= 1) {
        this.tween = null;
        if (tw.onDone) tw.onDone();
      }
      return true;
    }

    if (this.playback) {
      const pb = this.playback;
      pb.u += dt / Math.max(1, pb.path.duration || 12);
      let ended = false;
      if (pb.u >= 1) {
        if (pb.path.loop) pb.u %= 1;
        else {
          pb.u = 1;
          ended = true;
        }
      }
      this.pose = samplePath(pb.path, pb.u);
      if (pb.onProgress) pb.onProgress(pb.u);
      if (ended) {
        this.playback = null;
        this.adoptPose(this.getPose(), { animate: false });
        if (pb.onEnd) pb.onEnd(true);
      }
      return true;
    }

    if (this.mode === 'walk' && this.walk && keys) {
      const run = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.1 : 1;
      const want = {
        f: ((keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0)) * 1.7 * run,
        s: ((keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0)) * 1.4 * run,
        t: ((keys.has('ArrowLeft') || keys.has('KeyQ') ? 1 : 0) - (keys.has('ArrowRight') || keys.has('KeyE') ? 1 : 0)) * 1.5,
      };
      const v = this.velocity;
      const blend = Math.min(1, dt * 9);
      v.f += (want.f - v.f) * blend;
      v.s += (want.s - v.s) * blend;
      v.t += (want.t - v.t) * blend;
      const lift = (keys.has('KeyR') ? 1 : 0) - (keys.has('KeyF') ? 1 : 0);
      if (Math.abs(v.f) > 0.02 || Math.abs(v.s) > 0.02 || Math.abs(v.t) > 0.02 || lift) {
        this.walk.yaw += v.t * dt;
        if (lift) this.walk.eye = clamp(this.walk.eye + lift * dt * 0.7, 0.6, this.layout.H - 0.2);
        this.stepWalk(v.f * dt, v.s * dt);
        changed = true;
      }
    }
    return changed;
  }
}
