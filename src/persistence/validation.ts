/**
 * BACK04: System Data Validation Engine.
 * Ensures system configurations, bodies, and snapshots contain valid physical values.
 */

import { CelestialBody } from "../simulation/types";

export interface ValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export function validateCelestialBody(body: Partial<CelestialBody>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!body.id || typeof body.id !== "string") {
    issues.push({ field: "id", message: "Body must have valid string ID", severity: "error" });
  }
  if (!body.name || typeof body.name !== "string") {
    issues.push({ field: "name", message: "Body must have valid name", severity: "error" });
  }
  if (typeof body.massKg !== "number" || !Number.isFinite(body.massKg) || body.massKg <= 0) {
    issues.push({ field: "massKg", message: "Mass must be positive finite number", severity: "error" });
  }
  if (typeof body.radiusKm !== "number" || !Number.isFinite(body.radiusKm) || body.radiusKm <= 0) {
    issues.push({ field: "radiusKm", message: "Radius must be positive finite number", severity: "error" });
  }
  if (!body.position || !Number.isFinite(body.position.x) || !Number.isFinite(body.position.y) || !Number.isFinite(body.position.z)) {
    issues.push({ field: "position", message: "Position coordinates must be finite numbers", severity: "error" });
  }
  if (!body.velocity || !Number.isFinite(body.velocity.x) || !Number.isFinite(body.velocity.y) || !Number.isFinite(body.velocity.z)) {
    issues.push({ field: "velocity", message: "Velocity vectors must be finite numbers", severity: "error" });
  }
  if (!body.color || typeof body.color !== "string") {
    issues.push({ field: "color", message: "Color hex must be specified", severity: "warning" });
  }

  return issues;
}

export function sanitizeCelestialBody(body: Partial<CelestialBody>): CelestialBody {
  return {
    id: body.id || ("body-" + Math.random().toString(36).substring(2, 9)),
    name: body.name || "Unnamed Celestial",
    type: body.type || "planet",
    massKg: Number.isFinite(body.massKg) && body.massKg! > 0 ? body.massKg! : 5.972e24,
    radiusKm: Number.isFinite(body.radiusKm) && body.radiusKm! > 0 ? body.radiusKm! : 6371,
    position: {
      x: Number.isFinite(body.position?.x) ? body.position!.x : 0,
      y: Number.isFinite(body.position?.y) ? body.position!.y : 0,
      z: Number.isFinite(body.position?.z) ? body.position!.z : 0,
    },
    velocity: {
      x: Number.isFinite(body.velocity?.x) ? body.velocity!.x : 0,
      y: Number.isFinite(body.velocity?.y) ? body.velocity!.y : 0,
      z: Number.isFinite(body.velocity?.z) ? body.velocity!.z : 0,
    },
    color: body.color || "#4a90e2",
    fixed: Boolean(body.fixed),
    primaryId: body.primaryId || null,
    classification: body.classification || "rocky",
    luminosityW: body.luminosityW,
    albedo: body.albedo ?? 0.3,
    greenhouseOffsetK: body.greenhouseOffsetK ?? 0,
    temperatureK: body.temperatureK ?? 280,
    rings: body.rings || [],
  };
}
