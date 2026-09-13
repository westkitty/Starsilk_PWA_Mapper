/**
 * Gravity Gradient Torque & Satellite Attitude Libration.
 * Models restoring torque on asymmetric/elongated spacecraft aligning long-axis along the local radial vector.
 */

export interface GravityGradientState {
  torqueNm: number;
  librationFrequencyRadS: number;
  librationPeriodMinutes: number;
  isStable: boolean;
}

export class GravityGradientSolver {
  /**
   * T_gg = (3 * mu / (2 * r^3)) * (I_z - I_x) * sin(2 * theta)
   * mu: GM of central body
   * orbitalRadius: r (m)
   * pitchAngleThetaRad: attitude deviation angle from local vertical
   * iZ: moment of inertia about z (transverse)
   * iX: moment of inertia about x (long axis along radial)
   */
  public static calculateTorque(
    mu: number,
    orbitalRadius: number,
    pitchAngleThetaRad: number,
    iZ = 5000,
    iX = 1000
  ): GravityGradientState {
    if (orbitalRadius <= 0 || mu <= 0) {
      return {
        torqueNm: 0,
        librationFrequencyRadS: 0,
        librationPeriodMinutes: 0,
        isStable: false,
      };
    }

    const n = Math.sqrt(mu / Math.pow(orbitalRadius, 3)); // orbital mean motion
    const deltaI = iZ - iX;

    // Restoring torque
    const torque = 1.5 * n * n * deltaI * Math.sin(2 * pitchAngleThetaRad);

    // Natural libration frequency: omega_lib = sqrt(3 * n^2 * (Iz - Ix) / Iy)
    const iY = iZ;
    const stable = deltaI > 0;
    const freq = stable ? Math.sqrt(3 * (deltaI / iY)) * n : 0;
    const periodMin = freq > 0 ? (2 * Math.PI / freq) / 60 : 0;

    return {
      torqueNm: torque,
      librationFrequencyRadS: freq,
      librationPeriodMinutes: periodMin,
      isStable: stable,
    };
  }
}
