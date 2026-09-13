/**
 * Core-Collapse Supernova & Stellar Remnant Evolution.
 * Triggers stellar detonation when stellar mass exceeds Chandrasekhar/Tolman-Oppenheimer-Volkoff limits.
 */

import { CelestialBody } from './types';

export interface SupernovaEventResult {
  isSupernovaTriggered: boolean;
  remnantType: 'white_dwarf' | 'neutron_star' | 'black_hole';
  remnantMass: number;
  ejectedMass: number;
  blastEnergyJoules: number;
  shockwaveExpansionVelocityKmS: number;
}

export class SupernovaEngine {
  public static evaluateStellarCollapse(star: CelestialBody): SupernovaEventResult {
    // Stellar mass in solar masses M☉
    const mSolar = star.massKg ? star.massKg / 1.989e30 : (star.mass || 1.0);

    if (mSolar < 8.0) {
      // Gentle planetary nebula -> White dwarf
      return {
        isSupernovaTriggered: false,
        remnantType: 'white_dwarf',
        remnantMass: Math.min(1.4, mSolar * 0.6),
        ejectedMass: mSolar * 0.4,
        blastEnergyJoules: 1e44,
        shockwaveExpansionVelocityKmS: 30,
      };
    } else if (mSolar >= 8.0 && mSolar < 25.0) {
      // Type II Supernova -> Neutron Star
      return {
        isSupernovaTriggered: true,
        remnantType: 'neutron_star',
        remnantMass: 1.4 + (mSolar - 8.0) * 0.05,
        ejectedMass: mSolar - (1.4 + (mSolar - 8.0) * 0.05),
        blastEnergyJoules: 1e46,
        shockwaveExpansionVelocityKmS: 15000,
      };
    } else {
      // Hypernova / Core Collapse -> Black Hole
      return {
        isSupernovaTriggered: true,
        remnantType: 'black_hole',
        remnantMass: 3.0 + (mSolar - 25.0) * 0.2,
        ejectedMass: mSolar - (3.0 + (mSolar - 25.0) * 0.2),
        blastEnergyJoules: 1e47,
        shockwaveExpansionVelocityKmS: 25000,
      };
    }
  }
}
