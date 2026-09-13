/**
 * High-Efficiency Binary State Serializer.
 * Encodes celestial body state vectors (positions, velocities, masses) into packed ArrayBuffers.
 */

import { Vector3 } from 'three';
import { CelestialBody } from '../simulation/types';

const MAGIC_HEADER = 0x53544152; // 'STAR'
const VERSION = 1;

export class BinaryStateSerializer {
  /**
   * Serializes celestial bodies into a compact binary ArrayBuffer.
   * Format:
   * [Header: uint32][Version: uint16][BodyCount: uint16]
   * Repeated per body:
   * [Mass: float64][Radius: float32]
   * [posX: float64][posY: float64][posZ: float64]
   * [velX: float64][velY: float64][velZ: float64]
   */
  public static serialize(bodies: CelestialBody[]): ArrayBuffer {
    // 4 (magic) + 2 (version) + 2 (count) = 8 bytes header
    // Per body: 8 (mass) + 4 (radius) + 3*8 (pos) + 3*8 (vel) = 60 bytes
    const bodyRecordSize = 60;
    const totalSize = 8 + bodies.length * bodyRecordSize;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    view.setUint32(0, MAGIC_HEADER, true);
    view.setUint16(4, VERSION, true);
    view.setUint16(6, bodies.length, true);

    let offset = 8;
    for (const b of bodies) {
      const m = b.massKg ?? b.mass ?? 1.0;
      view.setFloat64(offset, m, true);
      offset += 8;
      const r = b.radiusKm ?? b.radius ?? 1.0;
      view.setFloat32(offset, r, true);
      offset += 4;

      view.setFloat64(offset, b.position.x, true);
      offset += 8;
      view.setFloat64(offset, b.position.y, true);
      offset += 8;
      view.setFloat64(offset, b.position.z, true);
      offset += 8;

      view.setFloat64(offset, b.velocity.x, true);
      offset += 8;
      view.setFloat64(offset, b.velocity.y, true);
      offset += 8;
      view.setFloat64(offset, b.velocity.z, true);
      offset += 8;
    }

    return buffer;
  }

  /**
   * Deserializes compact binary buffer into state records.
   */
  public static deserialize(buffer: ArrayBuffer): { mass: number; radius: number; position: Vector3; velocity: Vector3 }[] {
    const view = new DataView(buffer);
    if (view.byteLength < 8) throw new Error('Buffer too short');

    const magic = view.getUint32(0, true);
    if (magic !== MAGIC_HEADER) throw new Error('Invalid magic header');

    const count = view.getUint16(6, true);
    const results = [];
    let offset = 8;

    for (let i = 0; i < count; i++) {
      const mass = view.getFloat64(offset, true);
      offset += 8;
      const radius = view.getFloat32(offset, true);
      offset += 4;

      const px = view.getFloat64(offset, true);
      offset += 8;
      const py = view.getFloat64(offset, true);
      offset += 8;
      const pz = view.getFloat64(offset, true);
      offset += 8;

      const vx = view.getFloat64(offset, true);
      offset += 8;
      const vy = view.getFloat64(offset, true);
      offset += 8;
      const vz = view.getFloat64(offset, true);
      offset += 8;

      results.push({
        mass,
        radius,
        position: new Vector3(px, py, pz),
        velocity: new Vector3(vx, vy, vz),
      });
    }

    return results;
  }
}
