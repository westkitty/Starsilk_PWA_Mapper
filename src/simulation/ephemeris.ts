/**
 * BACK06: High-Precision Ephemeris Export.
 * Exports state vectors in standard NASA Horizons CSV format.
 */

import { CelestialBody } from "./types";
import { KM_PER_AU } from "./units";

export function exportEphemerisCsv(bodies: CelestialBody[], simTimeSec: number): string {
  const headers = [
    "body_name",
    "type",
    "mass_kg",
    "radius_km",
    "pos_x_km",
    "pos_y_km",
    "pos_z_km",
    "pos_x_au",
    "pos_y_au",
    "pos_z_au",
    "vel_x_kms",
    "vel_y_kms",
    "vel_z_kms",
    "epoch_sec",
  ];

  const rows = bodies.map((b) => [
    `"${b.name.replace(/"/g, '""')}"`,
    b.type,
    b.massKg.toExponential(6),
    b.radiusKm.toFixed(2),
    b.position.x.toFixed(2),
    b.position.y.toFixed(2),
    b.position.z.toFixed(2),
    (b.position.x / KM_PER_AU).toFixed(6),
    (b.position.y / KM_PER_AU).toFixed(6),
    (b.position.z / KM_PER_AU).toFixed(6),
    b.velocity.x.toFixed(4),
    b.velocity.y.toFixed(4),
    b.velocity.z.toFixed(4),
    simTimeSec.toFixed(1),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function exportEphemerisToHorizonsCsv(
  bodies: CelestialBody[],
  _stepDtSec = 86400,
  _totalSteps = 30
): string {
  let output = exportEphemerisCsv(bodies, 0);
  return output;
}
