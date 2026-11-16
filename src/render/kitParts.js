import * as THREE from 'three';

/**
 * Piezas geométricas pequeñas que usan kitExtra.js y kitAudio.js (complementan box/cyl/ball de kit.js).
 * Todas aceptan { x, y, z, rx, ry, rz } para colocarse.
 */

export const lit = (mesh) => {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

/** Proyección de UV para telas y maderas (ver projectUV en materials.js). */
export const FAB = { grain: 'y', along: 0.16, across: 0.16 };
export const wuv = (grain = 'x') => ({ grain, along: 1.5, across: 0.5 });

function pose(mesh, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0 } = {}) {
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}

export function add(group, ...objects) {
  objects.forEach((o) => o && group.add(o));
  return group;
}

/** Barra cilíndrica vertical (largo en Y). */
export function bar(radius, length, material, o = {}) {
  return pose(lit(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, o.seg ?? 10), material)), o);
}

export function cone(radius, height, material, o = {}) {
  return pose(lit(new THREE.Mesh(new THREE.ConeGeometry(radius, height, o.seg ?? 16), material)), o);
}

/** Círculo plano mirando hacia arriba (con rx: π/2 mira hacia +Z). */
export function disc(radius, material, o = {}) {
  const geo = new THREE.CircleGeometry(radius, o.seg ?? 32);
  geo.rotateX(-Math.PI / 2);
  return pose(lit(new THREE.Mesh(geo, material)), o);
}

/** Toro en el plano XY (mira hacia +Z); `arc` para dibujar solo un tramo. */
export function torus(radius, tube, material, o = {}) {
  return pose(lit(new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, o.seg ?? 24, o.arc ?? Math.PI * 2), material)), o);
}

/** Sólido de revolución alrededor de Y a partir de puntos [radio, altura]. */
export function lathe(points, material, o = {}) {
  const geo = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), o.seg ?? 32);
  return pose(lit(new THREE.Mesh(geo, material)), o);
}

/** Extrusión de un contorno 2D (puntos [x, y]) con espesor `depth` hacia +Z. */
export function extrude(points, depth, material, o = {}) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  return extrudeShape(shape, depth, material, o);
}

export function extrudeShape(shape, depth, material, o = {}) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: o.curveSegments ?? 10 });
  if (o.center) geo.translate(0, 0, -depth / 2);
  return pose(lit(new THREE.Mesh(geo, material)), o);
}

/** Tubo que sigue una curva suave por los puntos [x, y, z]. */
export function tube(points, radius, material, o = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', o.tension ?? 0.5);
  return pose(lit(new THREE.Mesh(new THREE.TubeGeometry(curve, o.seg ?? 32, radius, 8, false), material)), o);
}

/** Cuatro patas cilíndricas en las esquinas de una huella w × d, de alto h desde el piso. */
export function legs(material, w, d, h, { r = 0.02, inset = 0.03 } = {}) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(pose(lit(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, h, 12), material)), { x: sx * (w / 2 - inset - r), y: h / 2, z: sz * (d / 2 - inset - r) }));
    }
  }
  return g;
}
