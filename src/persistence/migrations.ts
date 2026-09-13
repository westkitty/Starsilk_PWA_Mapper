/**
 * BACK04: Schema Migration Engine.
 * Safely transforms legacy project formats into current schema version.
 */

export const CURRENT_SCHEMA_VERSION = 2;

export function migrateProjectData(rawJson: any): any {
  if (!rawJson || typeof rawJson !== "object") {
    throw new Error("Invalid project data: root must be an object");
  }

  const version = rawJson.version || 1;
  let migrated = { ...rawJson };

  if (version === 1) {
    // Migration v1 -> v2: Ensure classification and physical defaults exist
    if (Array.isArray(migrated.bodies)) {
      migrated.bodies = migrated.bodies.map((b: any) => ({
        ...b,
        classification: b.classification || (b.type === "star" ? undefined : "rocky"),
        albedo: b.albedo ?? 0.3,
        rings: b.rings || [],
      }));
    }
    migrated.version = 2;
  }

  return migrated;
}
