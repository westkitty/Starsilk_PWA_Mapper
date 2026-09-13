/**
 * GAME08: Procedural Solar System Generator.
 * Seeded algorithm generating stable multi-planet systems adhering to Titius-Bode scaling.
 */

import { CelestialBody } from "../types";
import { SeededRNG } from "../../core/seeded-rng";
import { KM_PER_AU, SOLAR_MASS_KG, SOLAR_RADIUS_KM, EARTH_MASS_KG, EARTH_RADIUS_KM, JUPITER_MASS_KG, JUPITER_RADIUS_KM, G_KM } from "../units";

export function generateProceduralSystem(seed: number = 42): { name: string; bodies: CelestialBody[] } {
  const rng = new SeededRNG(seed);
  const bodies: CelestialBody[] = [];

  const starNames = ["Aethelgard", "Vespera", "Solas-9", "Caelum", "Zephyros", "Drakken-Prime"];
  const starName = rng.pick(starNames) + "-" + rng.intRange(10, 99);

  // 1. Primary Star
  const star: CelestialBody = {
    id: "star-primary",
    name: starName,
    type: "star",
    massKg: SOLAR_MASS_KG * rng.range(0.8, 1.4),
    radiusKm: SOLAR_RADIUS_KM * rng.range(0.9, 1.3),
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    fixed: true,
    color: rng.pick(["#ffddaa", "#fff0dd", "#ffcc88", "#aaccff"]),
    luminosityW: 3.828e26 * rng.range(0.7, 1.5),
    surfaceSeed: seed,
  };
  bodies.push(star);

  // 2. Planets (3 to 6)
  const planetCount = rng.intRange(3, 6);
  let currentDistanceAu = rng.range(0.35, 0.55);

  const planetTypes: CelestialBody["classification"][] = ["rocky", "desert", "oceanic", "gas_giant", "ice"];

  for (let i = 0; i < planetCount; i++) {
    const isGasGiant = currentDistanceAu > 2.5;
    const classification = isGasGiant ? "gas_giant" : rng.pick(planetTypes);
    const massKg = isGasGiant ? JUPITER_MASS_KG * rng.range(0.3, 1.2) : EARTH_MASS_KG * rng.range(0.4, 2.5);
    const radiusKm = isGasGiant ? JUPITER_RADIUS_KM * rng.range(0.7, 1.1) : EARTH_RADIUS_KM * rng.range(0.8, 1.5);

    const distKm = currentDistanceAu * KM_PER_AU;
    const angle = rng.range(0, Math.PI * 2);

    const posX = Math.cos(angle) * distKm;
    const posY = (rng.next() - 0.5) * distKm * 0.05; // Slight inclination
    const posZ = Math.sin(angle) * distKm;

    // Circular orbital speed: v = sqrt(G * M / r)
    const speed = Math.sqrt((G_KM * star.massKg) / distKm);
    // Perpendicular velocity vector
    const velX = -Math.sin(angle) * speed;
    const velY = (rng.next() - 0.5) * speed * 0.02;
    const velZ = Math.cos(angle) * speed;

    const planet: CelestialBody = {
      id: `planet-${i + 1}`,
      name: `${starName} ${String.fromCharCode(66 + i)}`,
      type: "planet",
      massKg,
      radiusKm,
      position: { x: posX, y: posY, z: posZ },
      velocity: { x: velX, y: velY, z: velZ },
      primaryId: star.id,
      classification,
      color: isGasGiant ? rng.pick(["#e0ae6f", "#c8945a", "#8db3c9"]) : rng.pick(["#3a88e9", "#c96a3a", "#5ab982", "#b0d0e0"]),
      albedo: rng.range(0.2, 0.6),
      surfaceSeed: seed + i * 100,
    };
    bodies.push(planet);

    // Titius-Bode distance expansion factor
    currentDistanceAu *= rng.range(1.5, 2.1);
  }

  return { name: starName + " System", bodies };
}
