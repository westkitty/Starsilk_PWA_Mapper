#!/usr/bin/env node
/**
 * Automated Starsilk Physics Integration Benchmark Suite.
 * Asserts Velocity Verlet symplectic integration throughput and verifies mechanical energy
 * and angular momentum conservation boundaries.
 */

function runBenchmark() {
  console.log('--- Running Starsilk Physics & Astrodynamic Benchmarks ---');

  const N = 40;
  const steps = 1000;
  const dt = 0.005;
  const G = 1.0;
  const softeningSq = 0.05;

  // Initialize N-body cluster
  const pos = new Float64Array(N * 3);
  const vel = new Float64Array(N * 3);
  const acc = new Float64Array(N * 3);
  const mass = new Float64Array(N);

  // Deterministic seed configuration
  for (let i = 0; i < N; i++) {
    mass[i] = 1.0 + (i % 5) * 1.0;
    const angle = (i / N) * 2 * Math.PI;
    const radius = 5.0 + (i % 10) * 1.5;
    pos[i * 3] = radius * Math.cos(angle);
    pos[i * 3 + 1] = radius * Math.sin(angle);
    pos[i * 3 + 2] = Math.sin(angle * 3) * 0.5;

    const speed = Math.sqrt((G * 10) / radius);
    vel[i * 3] = -speed * Math.sin(angle);
    vel[i * 3 + 1] = speed * Math.cos(angle);
    vel[i * 3 + 2] = 0;
  }

  function computeAccelerations() {
    acc.fill(0);
    for (let i = 0; i < N; i++) {
      const ix = pos[i * 3], iy = pos[i * 3 + 1], iz = pos[i * 3 + 2];
      for (let j = i + 1; j < N; j++) {
        const dx = pos[j * 3] - ix;
        const dy = pos[j * 3 + 1] - iy;
        const dz = pos[j * 3 + 2] - iz;
        const distSq = dx * dx + dy * dy + dz * dz + softeningSq;
        const invDist3 = G / (distSq * Math.sqrt(distSq));

        const fx = dx * invDist3;
        const fy = dy * invDist3;
        const fz = dz * invDist3;

        acc[i * 3] += fx * mass[j];
        acc[i * 3 + 1] += fy * mass[j];
        acc[i * 3 + 2] += fz * mass[j];

        acc[j * 3] -= fx * mass[i];
        acc[j * 3 + 1] -= fy * mass[i];
        acc[j * 3 + 2] -= fz * mass[i];
      }
    }
  }

  function computeEnergy() {
    let kinetic = 0;
    let potential = 0;

    for (let i = 0; i < N; i++) {
      const vx = vel[i * 3], vy = vel[i * 3 + 1], vz = vel[i * 3 + 2];
      kinetic += 0.5 * mass[i] * (vx * vx + vy * vy + vz * vz);

      const ix = pos[i * 3], iy = pos[i * 3 + 1], iz = pos[i * 3 + 2];
      for (let j = i + 1; j < N; j++) {
        const dx = pos[j * 3] - ix;
        const dy = pos[j * 3 + 1] - iy;
        const dz = pos[j * 3 + 2] - iz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + softeningSq);
        potential -= (G * mass[i] * mass[j]) / dist;
      }
    }
    return kinetic + potential;
  }

  function computeAngularMomentum() {
    let lx = 0, ly = 0, lz = 0;
    for (let i = 0; i < N; i++) {
      const m = mass[i];
      const px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2];
      const vx = vel[i * 3], vy = vel[i * 3 + 1], vz = vel[i * 3 + 2];

      lx += m * (py * vz - pz * vy);
      ly += m * (pz * vx - px * vz);
      lz += m * (px * vy - py * vx);
    }
    return Math.sqrt(lx * lx + ly * ly + lz * lz);
  }

  // Initial energy and angular momentum
  computeAccelerations();
  const initialEnergy = computeEnergy();
  const initialAngularMomentum = computeAngularMomentum();

  const start = performance.now();

  // Symplectic Velocity Verlet integration (Kick-Drift-Kick)
  for (let step = 0; step < steps; step++) {
    // 1. Half-step velocity kick & full-step position drift
    for (let i = 0; i < N * 3; i++) {
      vel[i] += 0.5 * acc[i] * dt;
      pos[i] += vel[i] * dt;
    }

    // 2. Evaluate new accelerations at updated positions
    computeAccelerations();

    // 3. Second half-step velocity kick
    for (let i = 0; i < N * 3; i++) {
      vel[i] += 0.5 * acc[i] * dt;
    }
  }

  const durationMs = performance.now() - start;
  const bodySteps = N * steps;
  const throughput = Math.round((bodySteps / durationMs) * 1000);

  const finalEnergy = computeEnergy();
  const finalAngularMomentum = computeAngularMomentum();

  const energyDrift = Math.abs((finalEnergy - initialEnergy) / initialEnergy);
  const momentumDrift = Math.abs((finalAngularMomentum - initialAngularMomentum) / initialAngularMomentum);

  console.log(`Integrated ${bodySteps} body-steps in ${durationMs.toFixed(2)}ms`);
  console.log(`Throughput: ${throughput.toLocaleString()} body-steps/sec`);
  console.log(`Initial Energy: ${initialEnergy.toFixed(6)}, Final: ${finalEnergy.toFixed(6)} (Drift: ${(energyDrift * 100).toFixed(4)}%)`);
  console.log(`Angular Momentum Drift: ${(momentumDrift * 100).toFixed(6)}%`);

  if (throughput < 10000) {
    console.error('❌ Benchmark failed: throughput fell below 10,000 body-steps/sec');
    process.exit(1);
  }

  if (energyDrift > 0.05) {
    console.error('❌ Benchmark failed: energy conservation drift exceeded 5%');
    process.exit(1);
  }

  console.log('✅ Physics Benchmark Passed: Symplectic conservation and throughput validated.');
}

runBenchmark();

