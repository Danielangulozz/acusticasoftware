import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RenderEngine, tick } from './engine.js';
import { buildScene } from './scenes.js';
import { FLOOR_ANCHORED_TYPES } from './openings.js';
import { setWallCut } from './kit.js';
import { findSupportingSurface } from './catalog.js';
import { CameraRig, pathPresets } from './cameraRig.js';
import { encodeVideo } from './videoExport.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round5 = (v) => Math.round(v * 20) / 20;

/** Ajustes de la vista previa según la calidad elegida. */
export const PREVIEW_QUALITY = {
  fast: { label: 'Rápida', hint: 'Para equipos modestos o batería', previewMax: 760, samples: 8, shadowSize: 1024, minScale: 0.5 },
  auto: { label: 'Equilibrada', hint: 'Fluida al mover y nítida al soltar', previewMax: 1100, samples: 24, shadowSize: 1024, minScale: 0.6 },
  detailed: { label: 'Detallada', hint: 'Más resolución y sombras más finas', previewMax: 1500, samples: 64, shadowSize: 2048, minScale: 0.7 },
};

const FLOOR_ANCHORED = FLOOR_ANCHORED_TYPES;

const deepVisible = (obj) => {
  for (let o = obj; o; o = o.parent) if (o.visible === false) return false;
  return true;
};

/**
 * Visor interactivo del Estudio de renders.
 *
 * Es dueño del motor, de la cámara (CameraRig) y de un bucle por cuadro: mientras algo se mueve
 * dibuja un cuadro rápido; al quedar quieto, afina la imagen por acumulación. La cámara no pasa
 * por el estado de React, así que orbitar, caminar o reproducir un recorrido no vuelve a pintar
 * la interfaz.
 *
 * Con una ref expone: setMode, frame, zoomBy, resetView, focusItem, getPose, setPose, presets,
 * play, stop, seek, renderImage, renderVideo.
 */
const SceneViewport = forwardRef(function SceneViewport(
  {
    spec,
    selectedItemId = null,
    onSelectItem = null,
    onMoveItem = null,
    mode = 'orbit',
    onModeChange = null,
    onCamera = null,
    moveTool = 'auto', // 'auto' | 'move'
    matte = null,
    aspect = 4 / 3,
    quality = 'auto',
    className = '',
    children = null,
  },
  ref
) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const builtRef = useRef(null);
  const cameraRef = useRef(null);
  const rigRef = useRef(null);
  if (!rigRef.current) rigRef.current = new CameraRig();
  const keysRef = useRef(new Set());
  const keyTimesRef = useRef(new Map());
  const overlayRef = useRef(null);
  // La visibilidad de la capa la maneja updateOverlay (fuera de React, para no reiniciarla en cada render)
  const setOverlayNode = useCallback((node) => {
    if (node) node.style.display = 'none';
    overlayRef.current = node;
  }, []);
  const dragRef = useRef(null);
  const helperRef = useRef(null);
  const sizeRef = useRef([0, 0]);
  const stateRef = useRef({ busy: false, force: true, scale: 1, ema: 16, phase: 'idle', reportedMode: mode, sceneKind: null, hoverAt: 0 });
  const [status, setStatus] = useState({ phase: 'idle', progress: null, error: null });

  const q = PREVIEW_QUALITY[quality] ?? PREVIEW_QUALITY.auto;
  const latest = useRef({});
  latest.current = { spec, selectedItemId, onSelectItem, onMoveItem, onModeChange, onCamera, moveTool, matte, aspect, q };

  const specKey = useMemo(() => JSON.stringify(spec), [spec]);

  const setPhase = (phase) => {
    if (stateRef.current.phase === phase) return;
    stateRef.current.phase = phase;
    setStatus((s) => (s.phase === phase ? s : { ...s, phase }));
  };

  /* -------------------------------------------------------- cámara y visibilidad */

  const updateVisibility = () => {
    const built = builtRef.current;
    const engine = engineRef.current;
    const rig = rigRef.current;
    if (!built?.shell || !engine) return;
    const [px, py, pz] = rig.pose.pos;
    const inside = rig.isInside();
    const plan = rig.mode === 'plan' && !inside;
    const closed = inside || (rig.mode === 'exterior' && !plan);
    const shell = built.shell;
    let changed = setWallCut(shell, (p) => (closed ? true : plan ? false : (px - p.midX) * p.inX + (pz - p.midZ) * p.inZ > -0.05));
    // La luz indirecta se mide dentro de la sala, salvo cuando se mira la sala cerrada desde afuera
    const { W, D, H } = built.layout;
    if (closed && !inside) {
      const len = Math.hypot(px, pz) || 1;
      const reach = Math.max(W, D) / 2 + 2;
      engine.setProbePosition({ x: (px / len) * reach, y: 1.6, z: (pz / len) * reach });
    } else {
      engine.setProbePosition({ x: 0, y: Math.min(H * 0.55, 1.6), z: 0 });
    }
    const ceiling = shell.userData.ceiling;
    if (ceiling && ceiling.visible !== closed) {
      ceiling.visible = closed;
      changed = true;
    }
    // Lo que cuelga de un muro oculto se oculta con él (menos en planta, donde ayuda verlo)
    const parts = shell.userData.wallParts;
    built.itemObjects.forEach((obj) => {
      const wi = obj.userData.wallIndex;
      if (wi === undefined) return;
      const show = plan ? true : parts[wi]?.full.visible !== false;
      if (obj.visible !== show) {
        obj.visible = show;
        changed = true;
      }
    });
    if (changed) engine.invalidateShadows();

    // Vegetación entre la cámara y la sala: se aparta para no tapar la vista
    if (built.env) {
      const reach = Math.hypot(px, pz);
      const near = Math.max(built.layout.W, built.layout.D) * 0.5 + 2.5;
      const az = Math.atan2(px, pz);
      const spread = rig.mode === 'exterior' ? 0.6 : 0.95;
      built.env.sectors.forEach((sector) => {
        const diff = Math.abs(((((sector.userData.azimuth - az) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        sector.visible = inside || reach < near || py > 30 || diff > spread;
      });
    }
  };

  const applyPose = () => {
    const camera = cameraRef.current;
    const rig = rigRef.current;
    const engine = engineRef.current;
    if (!camera || !engine) return;
    const { pos, target, fov } = rig.pose;
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.fov = fov;
    camera.aspect = engine.width / engine.height;
    camera.near = rig.isInside() ? 0.05 : 0.1;
    camera.updateProjectionMatrix();
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateMatrixWorld();
    updateVisibility();
    updateOverlay();
    const cb = latest.current.onCamera;
    if (cb) cb({ x: pos[0], y: pos[1], z: pos[2], yaw: Math.atan2(target[0] - pos[0], target[2] - pos[2]), mode: rig.mode, inside: rig.isInside() });
    if (rig.mode !== stateRef.current.reportedMode) {
      stateRef.current.reportedMode = rig.mode;
      latest.current.onModeChange?.(rig.mode);
    }
  };

  /* ------------------------------------------------- orientación en la vista de planta */

  // En Planta se dibuja el número de cada muro (el mismo del panel) junto a su cara exterior y
  // una brújula con el norte (−Z, el muro del fondo) y el eje X, girados según la cámara.
  const projected = new THREE.Vector3();
  const toScreen = (x, y, z, w, h) => {
    projected.set(x, y, z).project(cameraRef.current);
    return [((projected.x + 1) / 2) * w, ((1 - projected.y) / 2) * h];
  };
  const updateOverlay = () => {
    const el = overlayRef.current;
    const built = builtRef.current;
    const show = Boolean(el && built?.layout && cameraRef.current && rigRef.current.mode === 'plan');
    if (!el) return;
    el.style.display = show ? '' : 'none';
    if (!show) return;
    const { walls, H } = built.layout;
    const labels = el.querySelector('[data-walls]');
    if (labels.childElementCount !== walls.length) {
      labels.replaceChildren(
        ...walls.map((wall) => {
          const tag = document.createElement('span');
          tag.className = 'absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#141526]/80 px-2 py-0.5 text-[11px] font-semibold text-white';
          tag.textContent = `Muro ${wall.index + 1}`;
          return tag;
        })
      );
    }
    const w = el.clientWidth;
    const h = el.clientHeight;
    walls.forEach((wall, i) => {
      // Punto medio del muro (en los muros rectos se toma entre sus dos extremos) y un poco hacia afuera
      const curved = Math.abs(Number(wall.bulge) || 0) > 1e-3;
      const mx = curved ? wall.midX : (wall.v0.x + wall.v1.x) / 2;
      const mz = curved ? wall.midZ : (wall.v0.z + wall.v1.z) / 2;
      const [sx, sy] = toScreen(mx - wall.inX * 0.55, H * 0.5, mz - wall.inZ * 0.55, w, h);
      const tag = labels.children[i];
      tag.style.left = `${sx}px`;
      tag.style.top = `${sy}px`;
    });
    const [ox, oy] = toScreen(0, 0, 0, w, h);
    const angle = (x, z) => {
      const [px, py] = toScreen(x, 0, z, w, h);
      return (Math.atan2(py - oy, px - ox) * 180) / Math.PI;
    };
    el.querySelector('[data-north]').setAttribute('transform', `rotate(${angle(0, -1) + 90})`);
    el.querySelector('[data-east]').setAttribute('transform', `rotate(${angle(1, 0) + 90})`);
  };

  /* ---------------------------------------------------------- objeto seleccionado */

  const refreshSelection = () => {
    const built = builtRef.current;
    const engine = engineRef.current;
    if (!built || !engine) return;
    const old = helperRef.current;
    if (old) {
      old.parent?.remove(old);
      old.traverse((o) => o.geometry?.dispose());
      helperRef.current = null;
    }
    const obj = latest.current.selectedItemId ? built.itemObjects?.get(latest.current.selectedItemId) : null;
    if (obj) {
      const box = new THREE.Box3().setFromObject(obj);
      if (!box.isEmpty()) {
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const helper = new THREE.Group();
        helper.userData.helper = true;
        const color = new THREE.Color(0x8767f9).multiplyScalar(1.6);
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x + 0.05, size.y + 0.05, size.z + 0.05)),
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false })
        );
        edges.position.copy(center);
        edges.renderOrder = 10;
        helper.add(edges);
        if (box.min.y < 0.45) {
          const r = Math.max(0.3, Math.hypot(size.x, size.z) * 0.56);
          const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.03, r, 56), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(center.x, Math.max(0.012, box.min.y + 0.012), center.z);
          helper.add(ring);
        }
        helper.traverse((o) => {
          o.castShadow = false;
          o.receiveShadow = false;
        });
        built.scene.add(helper);
        helperRef.current = helper;
      }
    }
    engine.reset();
    stateRef.current.force = true;
  };

  /* ----------------------------------------------------------------- tamaño */

  const previewSize = () => {
    const el = wrapRef.current;
    const cssW = el?.clientWidth || 800;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const a = latest.current.aspect;
    const longSide = clamp(Math.round(cssW * dpr * (a >= 1 ? 1 : 1 / a)), 360, latest.current.q.previewMax);
    const w = a >= 1 ? longSide : Math.round(longSide * a);
    return [Math.max(2, w), Math.max(2, Math.round(w / a))];
  };

  const fitPreview = () => {
    const engine = engineRef.current;
    if (!engine || stateRef.current.busy) return;
    const [w, h] = previewSize();
    if (w !== sizeRef.current[0] || h !== sizeRef.current[1] || engine.shadowSize !== latest.current.q.shadowSize) {
      sizeRef.current = [w, h];
      engine.setSize(w, h, latest.current.q.shadowSize);
      rigRef.current.aspect = w / h;
      if (builtRef.current) rigRef.current.setScene(builtRef.current, w / h);
    }
    stateRef.current.force = true;
  };

  /* ------------------------------------------------------- motor y bucle por cuadro */

  useEffect(() => {
    let engine;
    try {
      engine = new RenderEngine(canvasRef.current);
    } catch (err) {
      setStatus((s) => ({ ...s, error: 'Tu navegador no pudo iniciar WebGL para dibujar la escena.' }));
      return undefined;
    }
    engineRef.current = engine;
    // Motor nuevo (en desarrollo React monta dos veces): hay que volver a darle tamaño
    sizeRef.current = [0, 0];
    cameraRef.current = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 700);
    engine.setCamera(cameraRef.current);

    /** Un cuadro del visor: mueve la cámara y dibuja rápido, o afina la imagen si todo está quieto. */
    const runFrame = (rawDt) => {
      const st = stateRef.current;
      const built = builtRef.current;
      if (!built || st.busy) return;
      const dt = Math.min(0.1, rawDt);
      const rig = rigRef.current;
      const moved = rig.update(dt, rig.mode === 'walk' ? keysRef.current : null) || st.force;
      if (moved) {
        st.force = false;
        applyPose();
        // Resolución interna adaptable: baja si el equipo no llega a ~30 cuadros por segundo
        // (se ignoran las pausas largas, como cuando la pestaña queda en segundo plano)
        if (rawDt < 0.2) {
          st.ema += (rawDt * 1000 - st.ema) * 0.15;
          if (st.ema > 36) st.scale = Math.max(latest.current.q.minScale, st.scale - 0.05);
          else if (st.ema < 22) st.scale = Math.min(1, st.scale + 0.02);
        }
        engine.renderInteractive(latest.current.matte, { scale: st.scale });
        setPhase('moving');
      } else if (engine.samples < latest.current.q.samples) {
        engine.step(engine.samples < 3 ? 1 : 2);
        engine.present(latest.current.matte);
        setPhase(engine.samples >= latest.current.q.samples ? 'ready' : 'refining');
      }
    };

    let last = performance.now();
    let raf = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = (now - last) / 1000;
      last = now;
      runFrame(dt);
    };
    raf = requestAnimationFrame(loop);
    // Solo en desarrollo: acceso para revisar el visor desde la consola (avanzar cuadros a mano)
    if (import.meta.env?.DEV) window.__pozoleViewport = { engineRef, builtRef, rigRef, stateRef, cameraRef, runFrame };

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fitPreview()) : null;
    if (observer && wrapRef.current) observer.observe(wrapRef.current);

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      engineRef.current = null;
      builtRef.current = null;
      engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escena nueva (los objetos y la sala vienen de cachés: mover algo cuesta milisegundos)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      const built = buildScene(spec);
      builtRef.current = built;
      helperRef.current = null;
      fitPreview();
      engine.load(built);
      const rig = rigRef.current;
      const kind = `${spec.kind}:${spec.item ?? ''}:${spec.design?.type ?? ''}`;
      if (kind !== stateRef.current.sceneKind) {
        // Otra clase de escena: se parte de su encuadre recomendado
        stateRef.current.sceneKind = kind;
        const v = built.view ?? {};
        rig.orbits.orbit = { azimuth: v.azimuth ?? 40, elevation: v.elevation ?? 27, zoom: v.zoom ?? 1, pan: [0, 0, 0] };
        if (!built.layout) rig.mode = 'orbit';
        rig.tween = null;
      }
      rig.setScene(built, engine.width / engine.height);
      setStatus((s) => (s.error ? { ...s, error: null } : s));
      refreshSelection();
    } catch (err) {
      setStatus((s) => ({ ...s, error: `No se pudo construir la escena: ${err.message}` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specKey]);

  useEffect(() => {
    refreshSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId]);

  useEffect(() => {
    fitPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect, quality]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.reset();
    stateRef.current.force = true;
  }, [matte]);

  // El modo lo decide quien usa el visor; si cambia, la cámara viaja a él
  useEffect(() => {
    const rig = rigRef.current;
    if (rig.mode === mode && !rig.playback) return;
    stateRef.current.reportedMode = mode;
    rig.setMode(builtRef.current?.layout ? mode : 'orbit');
  }, [mode]);

  // Teclado para caminar
  useEffect(() => {
    const keys = keysRef.current;
    const typing = (e) => {
      const tag = e.target?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable;
    };
    const WALK_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
    const times = keyTimesRef.current;
    const down = (e) => {
      if (rigRef.current.mode !== 'walk' || typing(e) || e.ctrlKey || e.metaKey || !WALK_KEYS.has(e.code)) return;
      if (!e.repeat && !keys.has(e.code)) times.set(e.code, performance.now());
      keys.add(e.code);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    };
    // Un toque corto (sin dejar la tecla sostenida) da un paso o un giro completo, en vez de perderse
    const up = (e) => {
      const t0 = times.get(e.code);
      times.delete(e.code);
      keys.delete(e.code);
      if (t0 !== undefined && performance.now() - t0 < 220 && rigRef.current.mode === 'walk') {
        rigRef.current.tapWalk(e.code);
        stateRef.current.force = true;
      }
    };
    const clear = () => {
      keys.clear();
      times.clear();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);

  // Rueda del ratón (escucha no pasiva para que no desplace la página)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (stateRef.current.busy) return;
      e.preventDefault();
      rigRef.current.wheel(e.deltaY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* ------------------------------------------------------------- selección y arrastre */

  const raycasterFor = (e) => {
    const camera = cameraRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!camera || !rect?.width) return null;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
    return raycaster;
  };

  /** Primer objeto visible bajo el puntero: { itemId, point } o { point } si es la sala. */
  const pick = (e) => {
    const built = builtRef.current;
    const raycaster = raycasterFor(e);
    if (!built?.root || !raycaster) return null;
    const hits = raycaster.intersectObject(built.root, true);
    for (const hit of hits) {
      if (!deepVisible(hit.object)) continue;
      return { itemId: hit.object.userData?.sceneItemId ?? null, point: hit.point.clone() };
    }
    return null;
  };

  const dragPatch = (e, d) => {
    const raycaster = raycasterFor(e);
    const layout = builtRef.current?.layout;
    const item = d.item;
    if (!raycaster || !layout || !item || item.locked) return null;
    const { W, D, H, walls, corners } = layout;

    if (item.mount === 'wall' && walls.length > 0) {
      const wInfo = walls[((Number(item.wallIndex) || 0) % walls.length + walls.length) % walls.length];
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(wInfo.inX, 0, wInfo.inZ).normalize(), new THREE.Vector3(wInfo.midX, H * 0.5, wInfo.midZ));
      const pt = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, pt)) return null;
      const rawAlong = (pt.x - wInfo.midX) * wInfo.tx + (pt.z - wInfo.midZ) * wInfo.tz + d.offsetAlong;
      const halfLim = Math.max(0.1, wInfo.length / 2 - 0.22);
      return {
        along: round5(clamp(rawAlong, -halfLim, halfLim)),
        elevation: FLOOR_ANCHORED.has(item.typeId) ? item.elevation : round5(clamp(pt.y + d.offsetY, 0.25, H - 0.25)),
      };
    }

    // Objeto de techo con Alt: cambia cuánto baja del techo
    if (item.mount === 'ceiling' && e.altKey) {
      const dy = e.clientY - d.startY;
      return { dims: { ...item.dims, drop: Math.round(clamp(d.startDrop + dy * 0.005, 0.02, Math.max(0.25, H - 1.4)) * 100) / 100 } };
    }

    const pt = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -d.planeY), pt)) return null;

    if (item.mount === 'corner' && corners.length > 0) {
      let best = 0;
      let bestDist = Infinity;
      corners.forEach((c, idx) => {
        const dist = Math.hypot(pt.x - c.x, pt.z - c.z);
        if (dist < bestDist) {
          bestDist = dist;
          best = idx;
        }
      });
      return { cornerIndex: best };
    }

    const x = round5(clamp(pt.x + d.offsetX, -Math.max(0.2, W / 2 - 0.18), Math.max(0.2, W / 2 - 0.18)));
    const z = round5(clamp(pt.z + d.offsetZ, -Math.max(0.2, D / 2 - 0.18), Math.max(0.2, D / 2 - 0.18)));
    if (item.mount === 'floor') {
      // Sobre una mesa o repisa, el objeto sube a ella
      const support = findSupportingSurface(item, x, z, latest.current.spec?.items || []);
      const y = Number(item.y) || 0;
      if (support) return { x, z, y: support.levels.some((lv) => Math.abs(lv.y - y) < 0.04) ? y : support.defaultY };
      if (y > 0 && !e.altKey) return { x, z, y: 0 };
    }
    return { x, z };
  };

  const onPointerDown = (e) => {
    if (stateRef.current.busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { spec: sp, onMoveItem: move, onSelectItem: select, moveTool: tool, selectedItemId: selId } = latest.current;
    const hit = select || move ? pick(e) : null;
    const item = hit?.itemId && Array.isArray(sp?.items) ? sp.items.find((it) => it.id === hit.itemId) : null;
    const canDrag = Boolean(move && item && !item.locked) && e.button === 0 && (tool === 'move' || e.shiftKey || selId === item.id);

    if (canDrag) {
      if (select && selId !== item.id) select(item.id);
      const layout = builtRef.current?.layout;
      let offsetAlong = 0;
      if (item.mount === 'wall' && layout?.walls?.length) {
        const wInfo = layout.walls[((Number(item.wallIndex) || 0) % layout.walls.length + layout.walls.length) % layout.walls.length];
        offsetAlong = (Number(item.along) || 0) - ((hit.point.x - wInfo.midX) * wInfo.tx + (hit.point.z - wInfo.midZ) * wInfo.tz);
      }
      dragRef.current = {
        kind: 'item',
        item,
        planeY: hit.point.y,
        offsetX: (Number(item.x) || 0) - hit.point.x,
        offsetZ: (Number(item.z) || 0) - hit.point.z,
        offsetY: (Number(item.elevation) || 1.35) - hit.point.y,
        offsetAlong,
        startY: e.clientY,
        startDrop: Number(item.dims?.drop) || 0.35,
      };
      canvasRef.current.style.cursor = 'grabbing';
      return;
    }
    dragRef.current = { kind: 'camera', x: e.clientX, y: e.clientY, pan: e.button !== 0 || e.ctrlKey || e.metaKey, moved: false, hit };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) {
      // Cursor según lo que hay debajo (como mucho una consulta cada 60 ms)
      const now = performance.now();
      if (stateRef.current.busy || !latest.current.onSelectItem || now - stateRef.current.hoverAt < 60) return;
      stateRef.current.hoverAt = now;
      const hit = pick(e);
      const sel = latest.current.selectedItemId;
      canvasRef.current.style.cursor = hit?.itemId ? (hit.itemId === sel || latest.current.moveTool === 'move' ? 'move' : 'pointer') : '';
      return;
    }
    if (d.kind === 'item') {
      const patch = dragPatch(e, d);
      if (patch) latest.current.onMoveItem(d.item.id, patch);
      return;
    }
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    d.x = e.clientX;
    d.y = e.clientY;
    rigRef.current.drag(dx, dy, { pan: d.pan });
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = '';
    if (!d || d.kind !== 'camera' || d.moved) return;
    const select = latest.current.onSelectItem;
    if (d.hit?.itemId) {
      select?.(d.hit.itemId);
    } else {
      // Un clic en el piso mientras se recorre la sala: caminar hasta allí
      if (rigRef.current.mode === 'walk' && d.hit && d.hit.point.y < 0.3) rigRef.current.walkTo(d.hit.point.x, d.hit.point.z);
      else select?.(null);
    }
  };

  const itemCenter = (id) => {
    const obj = builtRef.current?.itemObjects?.get(id);
    if (!obj) return null;
    const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
    return [c.x, c.y, c.z];
  };

  /* --------------------------------------------------------------------- exportar */

  /** Deja el motor listo para dibujar a un tamaño de salida y devuelve cómo deshacerlo. */
  const beginExport = (width, height) => {
    const engine = engineRef.current;
    const st = stateRef.current;
    st.busy = true;
    const helper = helperRef.current;
    if (helper) helper.visible = false;
    const saved = rigRef.current.snapshot();
    const rigAspect = rigRef.current.aspect;
    engine.setSize(width, height, 2048);
    setStatus((s) => ({ ...s, phase: 'export', progress: 0 }));
    stateRef.current.phase = 'export';
    return () => {
      if (helper) helper.visible = true;
      if (engineRef.current === engine) {
        sizeRef.current = [0, 0];
        st.busy = false;
        rigRef.current.aspect = rigAspect;
        rigRef.current.restore(saved);
        fitPreview();
      }
      setStatus((s) => ({ ...s, phase: 'idle', progress: null }));
      stateRef.current.phase = 'idle';
    };
  };

  useImperativeHandle(ref, () => ({
    setMode: (m, opts) => rigRef.current.setMode(m, opts),
    getMode: () => rigRef.current.mode,
    frame: (azimuth, elevation) => rigRef.current.frame(azimuth, elevation),
    zoomBy: (factor) => rigRef.current.zoomBy(factor),
    resetView: () => rigRef.current.resetView(),
    setEye: (h) => rigRef.current.setEye(h),
    focusItem: (id) => {
      const c = itemCenter(id);
      if (!c) return;
      if (rigRef.current.mode === 'walk') rigRef.current.walkToward(c);
      else rigRef.current.focusOn(c);
    },
    getPose: () => rigRef.current.getPose(),
    setPose: (pose, opts) => rigRef.current.adoptPose(pose, opts),
    presets: () => (builtRef.current?.layout ? pathPresets({ layout: builtRef.current.layout, focus: builtRef.current.focus, aspect: rigRef.current.aspect }) : {}),
    play: (path, callbacks) => rigRef.current.play(path, callbacks),
    stop: () => rigRef.current.stop(),
    seek: (path, u) => rigRef.current.seek(path, u),
    isPlaying: () => Boolean(rigRef.current.playback),
    walkTo: (x, z) => rigRef.current.walkTo(x, z),

    /** Imagen final: acumula `samples` pasadas al tamaño pedido y devuelve un Blob. */
    async renderImage({ width, height, samples = 64, type = 'image/png', quality: jpeg = 0.92, matte: finalMatte = null, signal = null, onProgress = null, dof = 'none' }) {
      const engine = engineRef.current;
      if (!engine || !builtRef.current || stateRef.current.busy) return null;
      const end = beginExport(width, height);
      try {
        applyPose();
        // Desenfoque de cámara: enfoca el objeto seleccionado o, si no hay, lo del centro del encuadre
        if (dof && dof !== 'none') {
          const camera = cameraRef.current;
          let focus = null;
          const sel = latest.current.selectedItemId ? builtRef.current.itemObjects?.get(latest.current.selectedItemId) : null;
          if (sel) focus = camera.position.distanceTo(new THREE.Box3().setFromObject(sel).getCenter(new THREE.Vector3()));
          if (!focus && builtRef.current.root) {
            const ray = new THREE.Raycaster();
            ray.setFromCamera(new THREE.Vector2(0, -0.1), camera);
            focus = ray.intersectObject(builtRef.current.root, true).find((h) => deepVisible(h.object))?.distance ?? null;
          }
          if (!focus) {
            const t = rigRef.current.pose.target;
            focus = camera.position.distanceTo(new THREE.Vector3(t[0], t[1], t[2]));
          }
          engine.dof = { focus, aperture: Math.min(0.12, focus * (dof === 'strong' ? 0.012 : 0.005)) };
        }
        engine.reset();
        while (engine.samples < samples && !signal?.aborted) {
          engine.step(Math.min(3, samples - engine.samples));
          if (engine.samples % 12 === 0) engine.present(finalMatte);
          setStatus((s) => ({ ...s, progress: engine.samples / samples }));
          onProgress?.(engine.samples / samples);
          // eslint-disable-next-line no-await-in-loop
          await tick();
        }
        if (signal?.aborted) return null;
        engine.present(finalMatte);
        return await engine.toBlob(type, jpeg);
      } finally {
        engine.dof = null;
        end();
      }
    },

    /** Video de un recorrido: dibuja cuadro a cuadro y devuelve { blob, ext }. */
    async renderVideo({ path, width, height, fps = 30, samples = 6, bitrate = 8e6, matte: finalMatte = null, signal = null, onProgress = null }) {
      const engine = engineRef.current;
      if (!engine || !builtRef.current || stateRef.current.busy || !path?.keys?.length) return null;
      const frames = Math.max(2, Math.round((path.duration || 10) * fps));
      const end = beginExport(width, height);
      const rig = rigRef.current;
      rig.aspect = width / height;
      try {
        const renderFrame = async (i) => {
          rig.seek(path, path.loop ? i / frames : i / (frames - 1));
          rig.dirty = false;
          applyPose();
          engine.reset();
          while (engine.samples < samples) {
            engine.step(Math.min(2, samples - engine.samples));
            // eslint-disable-next-line no-await-in-loop
            if (engine.samples < samples) await tick();
          }
          engine.present(finalMatte);
        };
        return await encodeVideo({
          canvas: canvasRef.current,
          width,
          height,
          fps,
          frames,
          bitrate,
          renderFrame,
          signal,
          onProgress: (p) => {
            setStatus((s) => ({ ...s, progress: p }));
            onProgress?.(p);
          },
        });
      } finally {
        end();
      }
    },
  }));

  const exporting = status.phase === 'export';

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="block w-full h-auto touch-none select-none cursor-grab active:cursor-grabbing"
        style={{ aspectRatio: String(aspect) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        onDoubleClick={(e) => {
          const hit = pick(e);
          if (!hit) return;
          if (hit.itemId) {
            const c = itemCenter(hit.itemId);
            if (c && rigRef.current.mode !== 'walk') rigRef.current.focusOn(c);
          } else if (rigRef.current.mode === 'walk') rigRef.current.walkTo(hit.point.x, hit.point.z);
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div
        ref={setOverlayNode}
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div data-walls="" className="absolute inset-0" />
        <div className="absolute top-3 right-3 w-[74px] h-[74px] rounded-full bg-black/45 backdrop-blur text-white">
          <svg viewBox="-37 -37 74 74" className="w-full h-full">
            <circle r="33" fill="none" stroke="rgb(255 255 255 / 0.25)" />
            <g data-north="">
              <path d="M0 -27 L6 -9 L0 -13 L-6 -9Z" fill="#f2b84b" />
              <text y="-16" dy="-13" textAnchor="middle" fontSize="10" fontWeight="700" fill="#f2b84b">N</text>
            </g>
            <g data-east="">
              <line y1="0" y2="-20" stroke="#ff6b6b" strokeWidth="2.5" strokeLinecap="round" />
              <text y="-23" textAnchor="middle" fontSize="9" fontWeight="700" fill="#ff8a8a">X</text>
            </g>
            <circle r="2.5" fill="#fff" />
          </svg>
        </div>
      </div>
      {children}
      {status.error && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-rose-600 dark:text-rose-300 bg-white/80 dark:bg-black/60">{status.error}</div>}
      {!status.error && (status.phase === 'refining' || exporting) && (
        <div className="pointer-events-none absolute left-3 bottom-3 flex items-center gap-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
          {exporting ? `Renderizando · ${Math.round((status.progress ?? 0) * 100)} %` : 'Afinando la imagen'}
        </div>
      )}
      {exporting && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
          <div className="h-full bg-[#8767f9] transition-[width] duration-200" style={{ width: `${(status.progress ?? 0) * 100}%` }} />
        </div>
      )}
    </div>
  );
});

export default SceneViewport;
