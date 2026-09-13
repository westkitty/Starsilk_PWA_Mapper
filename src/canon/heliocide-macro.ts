/**
 * GAME15: Canon Macro: Heliocide & Solar Flare Outburst.
 * Triggers intense coronal energy pulse that warms worlds and modifies albedos.
 */

import { CelestialBody } from "../simulation/types";

export function executeHeliocideOutburst(bodies: CelestialBody[]): { bodies: CelestialBody[]; energyReleasedJ: number } {
  const star = bodies.find(b => b.type === "star");
  const energyReleasedJ = star ? (star.luminosityW || 3.828e26) * 1e12 : 1e38;

  const updatedBodies = bodies.map(body => {
    if (body.type === "planet") {
      // Atmospheric heating and scorching of exposed crust
      const tempBoostK = Math.min(250, 150000000 / (Math.hypot(body.position.x, body.position.y, body.position.z) || 1));
      return {
        ...body,
        temperatureK: (body.temperatureK ?? 280) + tempBoostK,
        albedo: Math.max(0.1, (body.albedo ?? 0.3) * 0.85), // Darkened by vitrification
      };
    }
    return body;
  });

  return { bodies: updatedBodies, energyReleasedJ };
}
