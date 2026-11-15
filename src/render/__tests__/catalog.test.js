import { describe, it, expect } from 'vitest';
import {
  PANEL_CATALOG,
  DIFFUSER_CATALOG,
  FURNITURE_CATALOG,
  createSceneItem,
  calculateItemAbsorption,
  calculateSceneObjectsAbsorption,
  findSupportingSurface,
  generateStarterSceneItems,
  getSupportSurfaceLevels,
} from '../catalog.js';
import { getPolygonLayout, sampleWallPoint } from '../kit.js';
import { buildScene, cameraFor } from '../scenes.js';
import { saveMaterialsToCookie, loadMaterialsFromCookie } from '../../utils/cookieStorage.js';
import {
  calculatePolygonGeometry,
  calculateRoomAbsorption,
  calculateReverberationTimes,
} from '../../utils/acousticCalculations.js';
import { getDefaultPolygonMaterials } from '../../utils/defaultMaterials.js';

describe('Catálogo 3D de Mobiliario, Paneles y Difusores (Estudio de Renders)', () => {
  it('incluye múltiples tipos de paneles con curvas de absorción α(f) diferenciadas', () => {
    const porous50 = PANEL_CATALOG.panel_porous_50;
    const broadband100 = PANEL_CATALOG.panel_broadband_100;
    const pyramid = PANEL_CATALOG.panel_foam_pyramid;
    const helmholtz = PANEL_CATALOG.panel_perforated_helmholtz;
    const membrane = PANEL_CATALOG.panel_membrane;

    // El panel broadband 100mm absorbe más en graves (125 Hz) que el poroso 50mm
    expect(broadband100.coefficients[125]).toBeGreaterThan(porous50.coefficients[125]);

    // La espuma piramidal absorbe mucho en agudos (4000 Hz) y poco en graves (125 Hz)
    expect(pyramid.coefficients[4000]).toBeGreaterThan(0.9);
    expect(pyramid.coefficients[125]).toBeLessThan(0.2);

    // La trampa diafragmática (membrana) absorbe más en graves (125 Hz) que en agudos (4000 Hz)
    expect(membrane.coefficients[125]).toBeGreaterThan(membrane.coefficients[4000]);

    // El resonador Helmholtz perforado tiene pico selectivo en medios-bajos (500 Hz > 4000 Hz)
    expect(helmholtz.coefficients[500]).toBeGreaterThan(helmholtz.coefficients[4000]);
  });

  it('calcula los Sabines aportados por paneles, difusores y muebles y escala con count', () => {
    const singlePanel = createSceneItem('panel_broadband_100', {
      count: 1,
      dims: { w: 0.6, h: 1.2, t: 0.1 },
    });
    const quadPanel = createSceneItem('panel_broadband_100', {
      count: 4,
      dims: { w: 0.6, h: 1.2, t: 0.1 },
    });

    const abs1 = calculateItemAbsorption(singlePanel);
    const abs4 = calculateItemAbsorption(quadPanel);

    expect(abs4.byBand[500]).toBeCloseTo(abs1.byBand[500] * 4, 5);
    expect(abs1.byBand[1000]).toBeGreaterThan(0.6);

    const sofa = createSceneItem('sofa', { count: 1 });
    const sofaAbs = calculateItemAbsorption(sofa);
    expect(sofaAbs.byBand[500]).toBeGreaterThan(1.0);
  });

  it('reduce el tiempo de reverberación RT60 al agregar paneles, trampas y muebles a la sala', () => {
    const poly = {
      vertices: [
        { x: 0, y: 0 },
        { x: 8, y: 0 },
        { x: 8, y: 5 },
        { x: 0, y: 5 },
      ],
      height: 3.0,
      curvatures: {},
    };
    const geo = calculatePolygonGeometry(poly.vertices, poly.height, poly.curvatures);
    const mats = getDefaultPolygonMaterials(4);

    const items = generateStarterSceneItems('studio', { W: 8, D: 5, H: 3, wallCount: 4 });
    const { totalByBand } = calculateSceneObjectsAbsorption(items);

    const baseAbs = calculateRoomAbsorption(geo.surfaceAreas, geo.totalSurfaceArea, mats, null);
    const treatedAbs = calculateRoomAbsorption(geo.surfaceAreas, geo.totalSurfaceArea, mats, totalByBand);

    const baseRT = calculateReverberationTimes(geo.volume, geo.totalSurfaceArea, geo.surfaceAreas, baseAbs, mats, true, null);
    const treatedRT = calculateReverberationTimes(geo.volume, geo.totalSurfaceArea, geo.surfaceAreas, treatedAbs, mats, true, totalByBand);

    expect(treatedRT[500].sabine).toBeLessThan(baseRT[500].sabine);
    expect(treatedRT[125].sabine).toBeLessThan(baseRT[125].sabine);
  });

  it('calcula correctamente el layout 3D para polígonos arbitrarios (incluyendo 5 lados y curvatura)', () => {
    const pentagon = {
      vertices: [
        { x: 0, y: 0 },
        { x: 6, y: 0 },
        { x: 7, y: 3 },
        { x: 3, y: 5 },
        { x: 0, y: 4 },
      ],
      height: 3.2,
      curvatures: { 0: 0.4 },
    };
    const layout = getPolygonLayout(pentagon);
    expect(layout.walls).toHaveLength(5);
    expect(layout.corners).toHaveLength(5);
    expect(layout.H).toBeCloseTo(3.2);
    expect(layout.walls[0].segments.length).toBeGreaterThan(1);
  });

  it('dispone de catálogos completos de paneles, difusores y mobiliario (Universidad, Industrial, Arquitectura y Estudio)', () => {
    expect(Object.keys(PANEL_CATALOG).length).toBeGreaterThanOrEqual(10);
    expect(Object.keys(DIFFUSER_CATALOG).length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(FURNITURE_CATALOG).length).toBeGreaterThanOrEqual(30);

    // Verificar mueblería universitaria / escolar
    expect(FURNITURE_CATALOG.student_desk).toBeDefined();
    expect(FURNITURE_CATALOG.classroom_desk_grid).toBeDefined();
    expect(FURNITURE_CATALOG.teacher_desk).toBeDefined();
    expect(FURNITURE_CATALOG.whiteboard).toBeDefined();
    expect(FURNITURE_CATALOG.podium).toBeDefined();
    expect(FURNITURE_CATALOG.ceiling_projector).toBeDefined();
    expect(FURNITURE_CATALOG.locker_bank).toBeDefined();
    expect(FURNITURE_CATALOG.lab_bench).toBeDefined();

    // Verificar equipamiento industrial
    expect(FURNITURE_CATALOG.industrial_machine).toBeDefined();
    expect(FURNITURE_CATALOG.hvac_duct).toBeDefined();
    expect(FURNITURE_CATALOG.industrial_shelving).toBeDefined();
    expect(FURNITURE_CATALOG.workbench).toBeDefined();
    expect(FURNITURE_CATALOG.acoustic_barrier).toBeDefined();
    expect(FURNITURE_CATALOG.person_figure).toBeDefined();

    // Verificar elementos arquitectónicos
    expect(FURNITURE_CATALOG.arch_door).toBeDefined();
    expect(FURNITURE_CATALOG.arch_window).toBeDefined();
    expect(FURNITURE_CATALOG.draped_curtain).toBeDefined();
  });

  it('genera kits iniciales completos para Aula Universidad/Colegio y Nave Industrial y escala Sabines en matriz de pupitres', () => {
    const classroomItems = generateStarterSceneItems('classroom', { W: 7.6, D: 6.2, H: 3.1, wallCount: 4 });
    const industrialItems = generateStarterSceneItems('industrial', { W: 8.5, D: 6.6, H: 3.8, wallCount: 4 });

    expect(classroomItems.length).toBeGreaterThanOrEqual(8);
    expect(industrialItems.length).toBeGreaterThanOrEqual(8);

    const gridSmall = createSceneItem('classroom_desk_grid', { dims: { cols: 2, rows: 2 } });
    const gridLarge = createSceneItem('classroom_desk_grid', { dims: { cols: 4, rows: 3 } });
    expect(calculateItemAbsorption(gridLarge).byBand[500]).toBeCloseTo(
      calculateItemAbsorption(gridSmall).byBand[500] * 3,
      5
    );
  });

  it('muestrea correctamente la posición y tangente local en paredes curvas mediante sampleWallPoint', () => {
    const curvedRoom = {
      vertices: [
        { x: 0, y: 0 },
        { x: 6, y: 0 },
        { x: 6, y: 5 },
        { x: 0, y: 5 },
      ],
      height: 3.0,
      curvatures: { 0: 0.6 },
    };
    const layout = getPolygonLayout(curvedRoom);
    const curvedWall = layout.walls[0];
    expect(curvedWall.segments.length).toBeGreaterThan(10);

    const leftSample = sampleWallPoint(curvedWall, -1.8);
    const midSample = sampleWallPoint(curvedWall, 0);
    const rightSample = sampleWallPoint(curvedWall, 1.8);

    // En una pared curva los ángulos normales en los extremos difieren del centro
    expect(leftSample.rotationY).not.toBeCloseTo(rightSample.rotationY, 2);
    expect(Number.isFinite(midSample.x)).toBe(true);
    expect(Number.isFinite(midSample.z)).toBe(true);
  });

  it('incluye ventanales panorámicos, puertas dobles, sillas con brazo, TVs, laptops, cámaras, luces y estanterías medias', () => {
    expect(FURNITURE_CATALOG.panoramic_window).toBeDefined();
    expect(FURNITURE_CATALOG.floor_to_ceiling_window).toBeDefined();
    expect(FURNITURE_CATALOG.studio_visor_window).toBeDefined();
    expect(FURNITURE_CATALOG.double_door).toBeDefined();
    expect(FURNITURE_CATALOG.stage_curtain).toBeDefined();
    expect(FURNITURE_CATALOG.school_arm_chair).toBeDefined();
    expect(FURNITURE_CATALOG.ergonomic_chair).toBeDefined();
    expect(FURNITURE_CATALOG.visitor_chair).toBeDefined();
    expect(FURNITURE_CATALOG.bar_stool).toBeDefined();
    expect(FURNITURE_CATALOG.armchair_lounge).toBeDefined();
    expect(FURNITURE_CATALOG.mid_shelf_credenza).toBeDefined();
    expect(FURNITURE_CATALOG.wall_tv).toBeDefined();
    expect(FURNITURE_CATALOG.rolling_tv_stand).toBeDefined();
    expect(FURNITURE_CATALOG.laptop_prop).toBeDefined();
    expect(FURNITURE_CATALOG.desktop_pc_setup).toBeDefined();
    expect(FURNITURE_CATALOG.cinema_camera_tripod).toBeDefined();
    expect(FURNITURE_CATALOG.ptz_conference_cam).toBeDefined();
    expect(FURNITURE_CATALOG.studio_softbox_light).toBeDefined();
    expect(FURNITURE_CATALOG.ring_light_stand).toBeDefined();
    expect(FURNITURE_CATALOG.ceiling_led_panel).toBeDefined();
    expect(FURNITURE_CATALOG.track_spotlight_bar).toBeDefined();
    expect(FURNITURE_CATALOG.desk_lamp).toBeDefined();
  });

  it('detecta superficies de soporte (mesas alargables y estanterías medias) para colocar objetos encima', () => {
    const shelf = createSceneItem('mid_shelf_credenza', {
      x: 1.0,
      z: -0.5,
      dims: { w: 2.2, d: 0.45, h: 1.15 },
    });
    const table = createSceneItem('meeting_table', {
      x: -1.5,
      z: 0.5,
      dims: { w: 3.6, d: 1.2, h: 0.76 },
    });
    const laptop = createSceneItem('laptop_prop', { x: 1.1, z: -0.5 });

    const shelfLevels = getSupportSurfaceLevels(shelf);
    expect(shelfLevels.length).toBe(3); // Repisa baja, media y tope superior

    const support = findSupportingSurface(laptop, 1.1, -0.5, [shelf, table, laptop]);
    expect(support).not.toBeNull();
    expect(support.item.id).toBe(shelf.id);
    expect(support.defaultY).toBeCloseTo(1.15, 2);

    const tableSupport = findSupportingSurface(laptop, -1.2, 0.5, [shelf, table, laptop]);
    expect(tableSupport).not.toBeNull();
    expect(tableSupport.item.id).toBe(table.id);
    expect(tableSupport.defaultY).toBeCloseTo(0.76, 2);
  });

  it('construye la escena 3D con separación de techo ajustable (drop), puertas en ambos lados y cámara interior firstPerson', () => {
    const items = [
      createSceneItem('cloud_ceiling', { dims: { w: 1.8, d: 1.2, t: 0.08, drop: 0.65 } }),
      createSceneItem('baffles_ceiling', { dims: { w: 1.2, h: 0.35, t: 0.05, drop: 0.5 } }),
      createSceneItem('arch_door', { wallIndex: 0, along: 0 }),
      createSceneItem('panoramic_window', { wallIndex: 1, along: 0 }),
      createSceneItem('mid_shelf_credenza', { x: 0, z: 0, dims: { w: 2.0, d: 0.42, h: 1.1 } }),
      createSceneItem('laptop_prop', { x: 0, z: 0, y: 1.1 }),
      createSceneItem('studio_softbox_light', { x: 1.2, z: 1.0 }),
    ];

    const built = buildScene({
      kind: 'custom_room',
      usePolygon: false,
      W: 6.0,
      D: 5.0,
      H: 3.0,
      cutMode: 'full',
      items,
      palette: {
        primary: 0x7464cc,
        secondary: 0xb3a7ec,
        neutral: 0xe9e2d3,
        accent: 0xd9a441,
        dark: 0x3b3b45,
        wood: 'oak',
        wall: 0xf1eee8,
        floor: 'planks',
      },
    });

    expect(built.scene).toBeDefined();
    expect(built.layout.W).toBe(6.0);

    // Verificar cámara interior en primera persona
    const fpCam = cameraFor(
      built,
      {
        firstPerson: true,
        camX: -1.2,
        camY: 1.62,
        camZ: 1.1,
        lookX: 0,
        lookY: 1.5,
        lookZ: -1.0,
        fov: 58,
      },
      16 / 9
    );
    expect(fpCam.position.x).toBeCloseTo(-1.2, 2);
    expect(fpCam.position.y).toBeCloseTo(1.62, 2);
    expect(fpCam.position.z).toBeCloseTo(1.1, 2);
    expect(fpCam.fov).toBe(58);
  });

  it('guarda y recupera los materiales de superficie del usuario en cookies', () => {
    const sampleMats = {
      floor: { materialId: 'carpet_heavy', customAlpha: null },
      ceiling: { materialId: 'plaster_smooth', customAlpha: null },
      wall_0: { materialId: 'wood_door_solid', customAlpha: null },
      wall_1: { materialId: 'glass_large_pane', customAlpha: null },
    };
    const ok = saveMaterialsToCookie(sampleMats);
    expect(ok).toBe(true);
    const loaded = loadMaterialsFromCookie(null);
    expect(loaded).not.toBeNull();
    expect(loaded.wall_0.materialId).toBe('wood_door_solid');
    expect(loaded.wall_1.materialId).toBe('glass_large_pane');
  });
});

