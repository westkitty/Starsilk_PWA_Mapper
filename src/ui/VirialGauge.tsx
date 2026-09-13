import React from 'react';
import { CelestialBody } from '../simulation/types';

interface VirialGaugeProps {
  bodies: CelestialBody[];
}

const G_KM = 6.67430e-20;

export const VirialGauge: React.FC<VirialGaugeProps> = ({ bodies }) => {
  let kinetic = 0;
  let potential = 0;

  for (let i = 0; i < bodies.length; i++) {
    const bi = bodies[i];
    const v2 = bi.velocity.x ** 2 + bi.velocity.y ** 2 + bi.velocity.z ** 2;
    kinetic += 0.5 * bi.massKg * v2;

    for (let j = i + 1; j < bodies.length; j++) {
      const bj = bodies[j];
      const dx = bj.position.x - bi.position.x;
      const dy = bj.position.y - bi.position.y;
      const dz = bj.position.z - bi.position.z;
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (r > 0) {
        potential -= (G_KM * bi.massKg * bj.massKg) / r;
      }
    }
  }

  // Virial ratio: 2K / |U| (In virial equilibrium, 2K / |U| = 1.0)
  const absU = Math.abs(potential);
  const virialRatio = absU > 0 ? (2 * kinetic) / absU : 1.0;
  const isBound = kinetic + potential < 0;

  return (
    <div
      title="System Virial Equilibrium (2K / |U| = 1.0 in bound equilibrium)"
      className="flex items-center space-x-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs backdrop-blur"
    >
      <span className="text-slate-400">Virial:</span>
      <span className={`font-mono font-bold ${isBound ? 'text-emerald-400' : 'text-red-400'}`}>
        {virialRatio.toFixed(2)}
      </span>
      <span className={`text-[10px] uppercase font-semibold ${isBound ? 'text-emerald-500' : 'text-red-500'}`}>
        {isBound ? 'Bound' : 'Escaping'}
      </span>
    </div>
  );
};
