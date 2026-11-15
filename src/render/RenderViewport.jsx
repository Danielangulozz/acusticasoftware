import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RenderEngine, tick } from './engine.js';
import { buildScene, cameraFor } from './scenes.js';
import { findSupportingSurface } from './catalog.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Lienzo de render progresivo. Reconstruye la escena cuando cambia `spec`, vuelve a acumular
 * cuando cambia la cámara (`view`), permite girar la escena arrastrando, hacer zoom con la rueda
 * del ratón (`wheel`) y seleccionar o arrastrar objetos directamente en 3D (`onSelectItem`, `onMoveItem`).
 *
 * Incluye soporte para modos de ahorro de recursos (`shadowSize`, `skipBloom`, `previewSamples`, `previewMax`).
 * Con una ref expone `renderFinal(opciones)` → Blob de la imagen en alta calidad.
 */
const RenderViewport = forwardRef(function RenderViewport(
  {
    spec,
    view,
    onViewChange,
    onSelectItem = null,
    onMoveItem = null,
    interactionMode = 'auto', // 'auto' | 'orbit' | 'move'
    matte = null,
    aspect = 4 / 3,
    previewMax = 900,
    previewSamples = 72,
    shadowSize = 1024,
    skipBloom = false,
    className = '',
  },
  ref
) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const builtRef = useRef(null);
  const runRef = useRef(0);
  const dragRef = useRef(null);
  const [hoverItemId, setHoverItemId] = useState(null);
  const [draggingItemId, setDraggingItemId] = useState(null);

  const latest = useRef({
    view,
    matte,
    previewSamples,
    skipBloom,
    spec,
    onViewChange,
    onSelectItem,
    onMoveItem,
    interactionMode,
  });
  latest.current = {
    view,
    matte,
    previewSamples,
    skipBloom,
    spec,
    onViewChange,
    onSelectItem,
    onMoveItem,
    interactionMode,
  };
  const [status, setStatus] = useState({ samples: 0, final: null, error: null });

  const specKey = useMemo(() => JSON.stringify(spec), [spec]);
  const previewSize = useMemo(() => {
    const w = aspect >= 1 ? previewMax : Math.round(previewMax * aspect);
    return [w, Math.round(w / aspect)];
  }, [aspect, previewMax]);

  // Acumula pasadas hasta la calidad de vista previa; un cambio posterior lo interrumpe
  const refine = async () => {
    const engine = engineRef.current;
    if (!engine?.scene) return;
    const token = ++runRef.current;
    while (
      engineRef.current === engine &&
      token === runRef.current &&
      engine.samples < latest.current.previewSamples
    ) {
      const targetSamples = latest.current.previewSamples;
      const stepCount = targetSamples <= 6 ? 1 : engine.samples < 4 ? 1 : 4;
      engine.step(Math.min(stepCount, targetSamples - engine.samples));
      engine.present(latest.current.matte, { skipBloom: latest.current.skipBloom });
      if (engine.samples % 8 === 0 || engine.samples < 6 || engine.samples >= targetSamples) {
        setStatus((s) => ({ ...s, samples: engine.samples }));
      }
      await tick();
    }
    if (token === runRef.current) setStatus((s) => ({ ...s, samples: engine.samples }));
  };

  useEffect(() => {
    let engine;
    try {
      engine = new RenderEngine(canvasRef.current);
    } catch (err) {
      setStatus((s) => ({ ...s, error: 'Tu navegador no pudo iniciar WebGL para dibujar el render.' }));
      return undefined;
    }
    engineRef.current = engine;
    return () => {
      runRef.current++;
      engineRef.current = null;
      engine.dispose();
    };
  }, []);

  // Zoom con la rueda del ratón (listener no pasivo para evitar scroll de página mientras se hace zoom al modelo)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;
    const handleWheel = (e) => {
      if (!latest.current.onViewChange || status.final !== null) return;
      e.preventDefault();
      const v = latest.current.view || { azimuth: 40, elevation: 27, zoom: 1 };
      const curZoom = Number(v.zoom) || 1;
      const factor = e.deltaY < 0 ? 1.08 : 0.925;
      const nextZoom = clamp(Math.round(curZoom * factor * 100) / 100, 0.45, 3.0);
      if (nextZoom !== curZoom) {
        latest.current.onViewChange({ ...v, zoom: nextZoom });
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [status.final]);

  // Escena nueva
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    runRef.current++;
    try {
      const built = buildScene(spec);
      builtRef.current = built;
      engine.setSize(previewSize[0], previewSize[1], shadowSize);
      engine.load(built);
      engine.setCamera(cameraFor(built, latest.current.view, previewSize[0] / previewSize[1]));
      setStatus((s) => ({ ...s, error: null }));
      refine();
    } catch (err) {
      setStatus((s) => ({ ...s, error: `No se pudo construir la escena: ${err.message}` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specKey, previewSize, shadowSize]);

  // Cámara nueva (incluyendo recorrido cinemático interior firstPerson o exterior targetX, targetY, targetZ)
  useEffect(() => {
    const engine = engineRef.current;
    const built = builtRef.current;
    if (!engine?.scene || !built) return;
    engine.setCamera(cameraFor(built, view, engine.width / engine.height));
    refine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    view?.azimuth,
    view?.elevation,
    view?.zoom,
    view?.targetX,
    view?.targetY,
    view?.targetZ,
    view?.firstPerson,
    view?.camX,
    view?.camY,
    view?.camZ,
    view?.lookX,
    view?.lookY,
    view?.lookZ,
    view?.fov,
  ]);

  useEffect(() => {
    engineRef.current?.present(matte, { skipBloom });
  }, [matte, skipBloom]);

  useImperativeHandle(ref, () => ({
    async renderFinal({ width, height, samples = 220, type = 'image/png', quality = 0.92, matte: finalMatte = null }) {
      const engine = engineRef.current;
      if (!engine) return null;
      const token = ++runRef.current;

      // Reconstruir sin el aro de selección para la imagen final descargada
      const cleanSpec = latest.current.spec?.selectedItemId
        ? { ...latest.current.spec, hideSelection: true }
        : latest.current.spec;
      const built = buildScene(cleanSpec);
      builtRef.current = built;
      engine.setSize(width, height, 2048);
      engine.load(built);
      engine.setCamera(cameraFor(built, latest.current.view, width / height));

      let blob = null;
      while (token === runRef.current && engine.samples < samples) {
        engine.step(Math.min(6, samples - engine.samples));
        if (engine.samples % 24 === 0) engine.present(finalMatte, { skipBloom: false });
        setStatus((s) => ({ ...s, final: engine.samples / samples }));
        await tick();
      }
      if (token === runRef.current) {
        engine.present(finalMatte, { skipBloom: false });
        blob = await engine.toBlob(type, quality);
      }
      setStatus((s) => ({ ...s, final: null }));
      // De vuelta a la vista previa (si mientras tanto no cambió la escena)
      if (token === runRef.current && engineRef.current === engine) {
        const previewBuilt = buildScene(latest.current.spec);
        builtRef.current = previewBuilt;
        engine.setSize(previewSize[0], previewSize[1], shadowSize);
        engine.load(previewBuilt);
        engine.setCamera(cameraFor(previewBuilt, latest.current.view, previewSize[0] / previewSize[1]));
        refine();
      }
      return blob;
    },
  }));

  const interactive = Boolean(onViewChange) && status.final === null;

  const getRaycasterFromEvent = (e) => {
    if (!engineRef.current?.scene || !engineRef.current?.camera || !canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), engineRef.current.camera);
    return raycaster;
  };

  const hitTestSceneItem = (e) => {
    const raycaster = getRaycasterFromEvent(e);
    if (!raycaster) return null;
    const hits = raycaster.intersectObjects(engineRef.current.scene.children, true);
    for (const hit of hits) {
      let cur = hit.object;
      while (cur) {
        if (cur.userData?.sceneItemId) {
          return { itemId: cur.userData.sceneItemId, point: hit.point.clone() };
        }
        cur = cur.parent;
      }
    }
    return null;
  };

  const compute3DDragPatch = (e, dragState) => {
    const raycaster = getRaycasterFromEvent(e);
    const layout = builtRef.current?.layout;
    const item = dragState.item;
    if (!raycaster || !layout || !item || item.locked) return null;

    const { W, D, H, walls, corners } = layout;

    if (item.mount === 'wall' && walls.length > 0) {
      const wIdx = ((Number(item.wallIndex) || 0) % walls.length + walls.length) % walls.length;
      const wInfo = walls[wIdx];
      const wallNormal = new THREE.Vector3(wInfo.inX, 0, wInfo.inZ).normalize();
      const wallPoint = new THREE.Vector3(wInfo.midX, H * 0.5, wInfo.midZ);
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(wallNormal, wallPoint);
      const intersectPt = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, intersectPt)) return null;

      const vx = intersectPt.x - wInfo.midX;
      const vz = intersectPt.z - wInfo.midZ;
      const rawAlong = vx * wInfo.tx + vz * wInfo.tz + dragState.offsetAlong;
      const halfLim = Math.max(0.1, wInfo.length / 2 - 0.22);
      const nextAlong = Math.round(clamp(rawAlong, -halfLim, halfLim) * 20) / 20;
      const isFloorAnchoredWallItem =
        item.typeId === 'arch_door' ||
        item.typeId === 'double_door' ||
        item.typeId === 'floor_to_ceiling_window';
      const nextElev = isFloorAnchoredWallItem
        ? item.elevation
        : Math.round(clamp(intersectPt.y + dragState.offsetY, 0.25, H - 0.25) * 20) / 20;
      return { along: nextAlong, elevation: nextElev };
    }

    // Si es un elemento de techo y el usuario mantiene Alt, ajusta la altura de separación del techo (drop)
    if (item.mount === 'ceiling' && e.altKey) {
      const dy = e.clientY - (dragState.startClientY || e.clientY);
      const baseDrop = Number(dragState.startDrop) || 0.35;
      const nextDrop = Math.round(clamp(baseDrop + dy * 0.005, 0.02, Math.max(0.25, H - 1.4)) * 100) / 100;
      return { dims: { ...item.dims, drop: nextDrop } };
    }

    // Plano horizontal a la altura del punto de agarre inicial
    const horizPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -dragState.planeY);
    const pt = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(horizPlane, pt)) return null;

    if (item.mount === 'corner' && corners.length > 0) {
      let bestIdx = 0;
      let bestDist = Infinity;
      corners.forEach((c, idx) => {
        const d = Math.hypot(pt.x - c.x, pt.z - c.z);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = idx;
        }
      });
      return { cornerIndex: bestIdx };
    }

    const limX = Math.max(0.2, W / 2 - 0.18);
    const limZ = Math.max(0.2, D / 2 - 0.18);
    const nextX = Math.round(clamp(pt.x + dragState.offsetX, -limX, limX) * 20) / 20;
    const nextZ = Math.round(clamp(pt.z + dragState.offsetZ, -limZ, limZ) * 20) / 20;

    // Detección automática de mesas o estanterías para colocar objetos encima
    if (item.mount === 'floor') {
      const allItems = latest.current.spec?.items || [];
      const support = findSupportingSurface(item, nextX, nextZ, allItems);
      if (support) {
        const currentY = Number(item.y) || 0;
        const matchesExistingLevel = support.levels.some((lv) => Math.abs(lv.y - currentY) < 0.04);
        return {
          x: nextX,
          z: nextZ,
          y: matchesExistingLevel ? currentY : support.defaultY,
        };
      }
      if ((Number(item.y) || 0) > 0 && !e.altKey) {
        return { x: nextX, z: nextZ, y: 0 };
      }
    }

    return {
      x: nextX,
      z: nextZ,
    };
  };

  const cursorClass = !interactive
    ? ''
    : draggingItemId
      ? 'cursor-move'
      : hoverItemId && (interactionMode === 'move' || spec?.selectedItemId === hoverItemId)
        ? 'cursor-move'
        : hoverItemId
          ? 'cursor-pointer'
          : 'cursor-grab active:cursor-grabbing';

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className={`block w-full h-auto touch-none select-none ${cursorClass}`}
        style={{ aspectRatio: String(aspect) }}
        onPointerDown={(e) => {
          if (!interactive) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const v = latest.current.view;
          const hit = (onSelectItem || onMoveItem) ? hitTestSceneItem(e) : null;
          const items = latest.current.spec?.items;
          const hitItem = hit && Array.isArray(items) ? items.find((it) => it.id === hit.itemId) : null;

          // Si el objeto está bloqueado, permitir seleccionarlo al hacer clic pero NO arrastrarlo
          const shouldDragItem =
            Boolean(onMoveItem && hitItem && !hitItem.locked) &&
            (latest.current.interactionMode === 'move' ||
              e.shiftKey ||
              latest.current.spec?.selectedItemId === hitItem.id);

          if (shouldDragItem && hitItem) {
            if (onSelectItem) onSelectItem(hitItem.id);
            const layout = builtRef.current?.layout;
            let offsetAlong = 0;
            if (hitItem.mount === 'wall' && layout?.walls?.length) {
              const wIdx = ((Number(hitItem.wallIndex) || 0) % layout.walls.length + layout.walls.length) % layout.walls.length;
              const wInfo = layout.walls[wIdx];
              const curProj = (hit.point.x - wInfo.midX) * wInfo.tx + (hit.point.z - wInfo.midZ) * wInfo.tz;
              offsetAlong = (Number(hitItem.along) || 0) - curProj;
            }
            setDraggingItemId(hitItem.id);
            dragRef.current = {
              mode: 'item',
              item: hitItem,
              planeY: hit.point.y,
              offsetX: (Number(hitItem.x) || 0) - hit.point.x,
              offsetZ: (Number(hitItem.z) || 0) - hit.point.z,
              offsetY: (Number(hitItem.elevation) || 1.35) - hit.point.y,
              offsetAlong,
              startClientY: e.clientY,
              startDrop: hitItem.dims?.drop ?? 0.35,
              moved: false,
            };
            return;
          }

          dragRef.current = {
            mode: 'orbit',
            x: e.clientX,
            y: e.clientY,
            azimuth: v.azimuth,
            elevation: v.elevation,
            firstPerson: Boolean(v.firstPerson),
            camX: Number(v.camX) || 0,
            camY: Number(v.camY) || 1.62,
            camZ: Number(v.camZ) || 0,
            lookX: Number(v.lookX) || 0,
            lookY: Number(v.lookY) || 1.48,
            lookZ: Number(v.lookZ) || -1,
            hitItemId: hit?.itemId || null,
            moved: false,
          };
        }}
        onPointerMove={(e) => {
          const d = dragRef.current;
          if (!d) {
            if (interactive && (onSelectItem || onMoveItem)) {
              const h = hitTestSceneItem(e);
              if ((h?.itemId || null) !== hoverItemId) setHoverItemId(h?.itemId || null);
            }
            return;
          }
          if (!interactive) return;

          if (d.mode === 'item' && onMoveItem) {
            d.moved = true;
            const patchObj = compute3DDragPatch(e, d);
            if (patchObj) {
              onMoveItem(d.item.id, patchObj);
            }
            return;
          }

          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (Math.hypot(dx, dy) > 4) d.moved = true;

          // Si estamos en cámara interior (primera persona), rotar la mirada 360° dentro del recinto
          if (d.firstPerson) {
            const vx = d.lookX - d.camX;
            const vy = d.lookY - d.camY;
            const vz = d.lookZ - d.camZ;
            const horizDist = Math.max(0.2, Math.hypot(vx, vz));
            const baseYaw = Math.atan2(vx, vz);
            const basePitch = Math.atan2(vy, horizDist);
            const nextYaw = baseYaw - dx * 0.0055;
            const nextPitch = clamp(basePitch - dy * 0.004, -0.65, 0.65);
            const lookDist = 2.5;
            onViewChange({
              ...latest.current.view,
              firstPerson: true,
              camX: d.camX,
              camY: d.camY,
              camZ: d.camZ,
              lookX: Math.round((d.camX + Math.sin(nextYaw) * Math.cos(nextPitch) * lookDist) * 100) / 100,
              lookY: Math.round((d.camY + Math.sin(nextPitch) * lookDist) * 100) / 100,
              lookZ: Math.round((d.camZ + Math.cos(nextYaw) * Math.cos(nextPitch) * lookDist) * 100) / 100,
            });
            return;
          }

          onViewChange({
            ...latest.current.view,
            azimuth: Math.round((d.azimuth - dx * 0.35) * 10) / 10,
            elevation: clamp(Math.round((d.elevation + dy * 0.25) * 10) / 10, 3, 85),
          });
        }}
        onPointerUp={() => {
          const d = dragRef.current;
          dragRef.current = null;
          setDraggingItemId(null);
          if (d && !d.moved && d.mode === 'orbit' && onSelectItem) {
            onSelectItem(d.hitItemId || null);
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setDraggingItemId(null);
        }}
      />

      {status.error ? (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-rose-600 dark:text-rose-300">{status.error}</div>
      ) : (
        <div className="pointer-events-none absolute left-3 bottom-3 rounded-full bg-black/55 text-white backdrop-blur px-2.5 py-1 text-[10px] font-mono flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${status.samples >= previewSamples && status.final === null ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
          {status.final !== null
            ? `Render final · ${Math.round(status.final * 100)} %`
            : status.samples >= previewSamples
              ? `Vista previa lista (${previewSamples <= 6 ? 'Modo Ligero ⚡' : `${previewSamples} pasadas`})`
              : `Afinando vista previa · ${status.samples}/${previewSamples}`}
        </div>
      )}
      {status.final !== null && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
          <div className="h-full bg-[#5833c7] transition-[width] duration-200" style={{ width: `${status.final * 100}%` }} />
        </div>
      )}
    </div>
  );
});

export default RenderViewport;
