/**
 * ASSET06: Celestial Collision Bursts.
 * Expanding particle shockwave and spark bursts upon planetary impact.
 */

import * as THREE from "three";

export class CollisionBurstManager {
  private group: THREE.Group = new THREE.Group();
  private particles: { mesh: THREE.Points; birthTime: number; duration: number }[] = [];

  getGroup(): THREE.Group {
    return this.group;
  }

  spawnBurst(position: THREE.Vector3, count: number = 80): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const speed = Math.random() * 4 + 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    (geometry as any).userData = { velocities };

    const material = new THREE.PointsMaterial({
      color: 0xffaa44,
      size: 3,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    this.group.add(points);
    this.particles.push({ mesh: points, birthTime: performance.now(), duration: 1500 });
  }

  update(now: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const item = this.particles[i];
      const age = now - item.birthTime;
      if (age > item.duration) {
        this.group.remove(item.mesh);
        item.mesh.geometry.dispose();
        (item.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const progress = age / item.duration;
      (item.mesh.material as THREE.PointsMaterial).opacity = 1.0 - progress;

      const posAttr = item.mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      const velocities = (item.mesh.geometry as any).userData.velocities as Float32Array;

      for (let j = 0; j < posAttr.count; j++) {
        posAttr.setXYZ(
          j,
          posAttr.getX(j) + velocities[j * 3] * 0.16,
          posAttr.getY(j) + velocities[j * 3 + 1] * 0.16,
          posAttr.getZ(j) + velocities[j * 3 + 2] * 0.16
        );
      }
      posAttr.needsUpdate = true;
    }
  }
}
