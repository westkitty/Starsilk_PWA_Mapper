/**
 * GAME12: Celestial Temperature & Climate Simulation.
 * Models atmospheric greenhouse warming, thermal equilibrium, and surface liquid water presence.
 */

import { STEFAN_BOLTZMANN } from "./units";

export interface ClimateState {
  equilibriumTempK: number;
  surfaceTempK: number;
  hasLiquidWater: boolean;
  climateZone: "scorched" | "tropical" | "temperate" | "glacial" | "cryogenic";
}

export function evaluateClimate(
  distanceKm: number,
  starLuminosityW: number,
  albedo: number = 0.3,
  greenhouseOffsetK: number = 0
): ClimateState {
  const distM = distanceKm * 1000;
  // Incident flux S = L / (4 * pi * d^2)
  const flux = starLuminosityW / (4 * Math.PI * distM * distM || 1);

  // Stefan-Boltzmann blackbody temp: T_eq = ( (1 - A) * S / (4 * sigma) )^(1/4)
  const numerator = (1 - albedo) * flux;
  const denominator = 4 * STEFAN_BOLTZMANN;
  const equilibriumTempK = Math.pow(Math.max(0, numerator / denominator), 0.25);

  const surfaceTempK = equilibriumTempK + greenhouseOffsetK;
  const hasLiquidWater = surfaceTempK >= 273.15 && surfaceTempK <= 373.15;

  let climateZone: ClimateState["climateZone"] = "temperate";
  if (surfaceTempK > 380) climateZone = "scorched";
  else if (surfaceTempK > 310) climateZone = "tropical";
  else if (surfaceTempK > 270) climateZone = "temperate";
  else if (surfaceTempK > 200) climateZone = "glacial";
  else climateZone = "cryogenic";

  return {
    equilibriumTempK: Number(equilibriumTempK.toFixed(1)),
    surfaceTempK: Number(surfaceTempK.toFixed(1)),
    hasLiquidWater,
    climateZone,
  };
}

export function calculatePlanetaryClimate(
  body: { albedo?: number; greenhouseOffsetK?: number },
  distanceKm: number,
  starLuminosityW: number
) {
  const state = evaluateClimate(distanceKm, starLuminosityW, body.albedo ?? 0.3, body.greenhouseOffsetK ?? 0);
  const distM = distanceKm * 1000;
  const flux = starLuminosityW / (4 * Math.PI * distM * distM || 1);
  return {
    ...state,
    stellarFluxWM2: flux,
  };
}
