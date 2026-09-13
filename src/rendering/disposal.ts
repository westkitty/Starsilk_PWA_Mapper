/**
 * BACK09: WebGL Resource Disposal Manager.
 * Prevents memory leaks by recursively walking Three.js trees and disposing
 * geometries, materials, shader programs, and textures.
 */

import * as THREE from "three";

export function disposeThreeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh || (child as THREE.Points).isPoints || (child as THREE.Line).isLine) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => disposeMaterial(mat));
        } else {
          disposeMaterial(mesh.material);
        }
      }
    }
  });

  if (obj.parent) {
    obj.parent.remove(obj);
  }
}

function disposeMaterial(mat: THREE.Material): void {
  mat.dispose();
  // Dispose all attached texture maps
  const anyMat = mat as any;
  for (const key of Object.keys(anyMat)) {
    const prop = anyMat[key];
    if (prop && prop instanceof THREE.Texture) {
      prop.dispose();
    }
  }
}
