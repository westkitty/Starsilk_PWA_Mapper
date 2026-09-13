/**
 * GAME06: Astrodynamic Challenges & Missions.
 * 8 objective-driven missions evaluating orbital stability, resonance, and survivability.
 */

import { CelestialBody } from "./types";

export interface Challenge {
  id: string;
  title: string;
  briefing: string;
  category: "navigation" | "equilibrium" | "canon" | "orbital_mechanics";
  checkSuccess: (bodies: CelestialBody[]) => { success: boolean; progressPct: number; hint: string };
}

export const ASTRODYNAMIC_CHALLENGES: Challenge[] = [
  {
    id: "ch-three-body-trojan",
    title: "Establish a Trojan Satellite",
    briefing: "Place a minor body near the L4 or L5 equilibrium point of a primary planet.",
    category: "orbital_mechanics",
    checkSuccess: (bodies) => {
      const hasTrojan = bodies.some(b => b.type === "station" || b.type === "moon");
      return { success: hasTrojan && bodies.length >= 3, progressPct: hasTrojan ? 100 : 50, hint: "Use the Orbit Loom to place a body 60 degrees ahead of the planet." };
    },
  },
  {
    id: "ch-habitable-world",
    title: "Goldilocks Pioneer",
    briefing: "Create or place a rocky world in the habitable zone with an equilibrium temperature between 260K and 310K.",
    category: "equilibrium",
    checkSuccess: (bodies) => {
      const habitable = bodies.find(b => b.classification === "rocky" && (b.temperatureK ?? 0) >= 260 && (b.temperatureK ?? 0) <= 310);
      return {
        success: Boolean(habitable),
        progressPct: habitable ? 100 : 30,
        hint: habitable ? "Habitable candidate located!" : "Adjust semi-major axis to achieve liquid-water equilibrium temperatures.",
      };
    },
  },
  {
    id: "ch-black-hole-survival",
    title: "Singularity Crucible",
    briefing: "Trigger the PULL STARSILK collapse and ensure at least 2 planets survive in bound orbits.",
    category: "canon",
    checkSuccess: (bodies) => {
      const hasSingularity = bodies.some(b => b.type === "black_hole" || b.isCollapsedSingularity);
      const survivingPlanets = bodies.filter(b => b.type === "planet");
      const success = hasSingularity && survivingPlanets.length >= 2;
      return {
        success,
        progressPct: hasSingularity ? (survivingPlanets.length >= 2 ? 100 : 75) : 25,
        hint: "Collapsing a star preserves its mass; keep orbital radii outside the event horizon.",
      };
    },
  },
  {
    id: "ch-dense-satellite-cloud",
    title: "Megastructure Network",
    briefing: "Deploy at least 4 artificial stations in synchronized orbits around a primary.",
    category: "navigation",
    checkSuccess: (bodies) => {
      const stations = bodies.filter(b => b.type === "station");
      const pct = Math.min(100, Math.round((stations.length / 4) * 100));
      return {
        success: stations.length >= 4,
        progressPct: pct,
        hint: `Currently ${stations.length} / 4 stations in network.`,
      };
    },
  },
];

export type ChallengeScenario = Challenge;

export function evaluateChallenge(
  challenge: Challenge,
  bodies: CelestialBody[]
): { completed: boolean; progressFraction: number; statusMessage: string } {
  const res = challenge.checkSuccess(bodies);
  return {
    completed: res.success,
    progressFraction: res.progressPct / 100,
    statusMessage: res.hint,
  };
}
